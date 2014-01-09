/*───────────────────────────────────────────────────────────────────────────*\
 │  Copyright (C) 2013 eBay Software Foundation                                │
 │                                                                             │
 │hh ,'""`.                                                                    │
 │  / _  _ \  Licensed under the Apache License, Version 2.0 (the "License");  │
 │  |(@)(@)|  you may not use this file except in compliance with the License. │
 │  )  __  (  You may obtain a copy of the License at                          │
 │ /,'))((`.\                                                                  │
 │(( ((  )) ))    http://www.apache.org/licenses/LICENSE-2.0                   │
 │ `\ `)(' /'                                                                  │
 │                                                                             │
 │   Unless required by applicable law or agreed to in writing, software       │
 │   distributed under the License is distributed on an "AS IS" BASIS,         │
 │   WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.  │
 │   See the License for the specific language governing permissions and       │
 │   limitations under the License.                                            │
 \*───────────────────────────────────────────────────────────────────────────*/
'use strict';

var path = require('path'),
    caller = require('caller'),
    express = require('express');


/**
 * Determines if node is able to resolve the provided module file.
 * @param module The file path to the desired module.
 * @returns {*} The absolute path to the module or `undefined` if not found.
 */
function tryResolve(module) {
    try {
        return require.resolve(module);
    } catch (e) {
        return undefined;
    }
}


/**
 * Determines if the provided argument is an absolute file path.
 * @param file The path in question.
 * @returns {boolean} `true` if the file path is absolute, `false` if not.
 */
function isAbsolutePath(file) {
    return path.resolve(file) === file;
}


/**
 * Attempts to locate a node module based on file and root directory.
 * @param file The file path (absolute or relative) for which to look up the module.
 * @param root The root directory to resolve to if file is a relative path.
 * @returns {*} The desired module, if located.
 */
function resolveModule(file, root) {
    var module;

    if (!file) {
        throw new TypeError('Module not defined.');
    }

    module = tryResolve(file);
    if (!module && !isAbsolutePath(file)) {
        file = path.resolve(root, file);
        module = tryResolve(file);
    }

    if (!module) {
        throw new TypeError('Module not found: ' + file);
    }

    return require(module);
}

/**
 * A factory function that creates a handler which will add a property called `name` to the object
 * located at property `name` on a parent object.
 * @param parent The parent object containing the named property in question.
 * @returns {Function} The handler used to do the renaming.
 */
function namer(parent) {
    return function name(key) {
        var spec;
        spec = parent[key];
        spec.name = key;
        return spec;
    };
}


/**
 * Sort implementation for objects with a numeric `proiority` property.
 * @param a
 * @param b
 * @returns {number}
 */
function sort(a, b) {
    var ap, bp;
    ap = typeof a.priority === 'number' ? a.priority : Number.MIN_VALUE;
    bp = typeof b.priority === 'number' ? b.priority : Number.MIN_VALUE;
    return ap - bp;
}


/**
 * Attempt to resolve a method on the provided module.
 * @param module The module in question.
 * @param settings The settings object containing info related to method lookup.
 * @returns {*} The factory method
 */
function resolveFactory(module, settings) {
    var factory;

    factory = settings.factoryMethod;
    if (typeof module[factory] === 'function') {
        return module[factory];
    }

    factory = settings.name;
    if (typeof module[factory] === 'function') {
        return module[factory];
    }

    return module;
}


/**
 * Creates a middleware wrapper for toggling whether the middleware is enabled or disabled at runtime.
 * @param fn the original middleware implementation.
 * @param settings The settings object containing info related to creating an appropriate wrapper.
 * @returns {Object}
 */
function createToggleWrapper(fn, settings) {
    /*jshint evil:true, multistr:true*/
    var name, impl;

    impl = "function $name(req, res, next) { \
        settings.enabled ? fn(req, res, next) : next(); \
    }";

    name = fn.name || settings.name;
    if (!/^[$_A-Za-z\xa0-\uffff][$_A-Za-z0-9\xa0-\uffff]*$/.test(name)) {
        throw new SyntaxError('Invalid identifier.');
    }

    return eval('(' + impl.replace('$name', name) + ')');
}


/**
 * A factory function used to create the middleware registration implementation.
 * @param app The app against which middleware will be registered.
 * @param root The root directory used for resolving modules, etc.
 * @returns {Function}
 */
function register(app, root) {
    var parent = app.parent;

    return function registrar(spec) {
        var args, fn, eventargs;

        args = spec['arguments'];
        args = Array.isArray(args) ? args.slice() : [];

        fn = resolveModule(spec.module, root);
        fn = resolveFactory(fn, spec);
        fn = createToggleWrapper(fn.apply(null, args), spec);

        eventargs = {
            app: app,
            config: spec
        };

        parent.emit('middleware:before', eventargs);
        parent.emit('middleware:before:' + spec.name, eventargs);
        typeof spec.route === 'string' ? app.use(spec.route, fn) : app.use(fn);
        parent.emit('middleware:after:' + spec.name, eventargs);
        parent.emit('middleware:after', eventargs);
    };
}



module.exports = function meddleware(settings) {
    var root, app;

    // The `require`-ing module (caller) is considered the `root`
    // against which relative file paths will be resolved.
    // Don't like it? Then pass absolute module paths. :D
    root = path.dirname(caller());

    function onmount(parent) {
        // Reset all mounted app settings to inherit from parent.
        // This way, all changes to parent will be picked up by
        // mounted apps, but config of mounted apps will be localized
        // to that app.
        app.settings = Object.create(parent.settings);

        // Process teh middlewarez
        Object.keys(settings)
            .map(namer(settings))
            .sort(sort)
            .forEach(register(app, root));
    }

    app = express();
    app.once('mount', onmount);
    return app;
};
