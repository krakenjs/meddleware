/*───────────────────────────────────────────────────────────────────────────*\
 │  Copyright (C) 2014 eBay Software Foundation                               │
 │                                                                            │
 │  Licensed under the Apache License, Version 2.0 (the "License");           │
 │  you may not use this file except in compliance with the License.          │
 │  You may obtain a copy of the License at                                   │
 │                                                                            │
 │    http://www.apache.org/licenses/LICENSE-2.0                              │
 │                                                                            │
 │  Unless required by applicable law or agreed to in writing, software       │
 │  distributed under the License is distributed on an "AS IS" BASIS,         │
 │  WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.  │
 │  See the License for the specific language governing permissions and       │
 │  limitations under the License.                                            │
 \*───────────────────────────────────────────────────────────────────────────*/
'use strict';

var path = require('path');
var caller = require('caller');
var express = require('express');
var thing = require('core-util-is');
var debug = require('debuglog')('meddleware');
var RQ = require('./lib/rq');
var util = require('./lib/util');


/**
 * Creates a middleware resolver based on the provided basedir.
 * @param basedir the directory against which to resolve relative paths.
 * @returns {Function} a the implementation that converts a given spec to a middleware function.
 */
function resolvery(basedir) {
    return function resolve(spec, name) {
        var fns, fn;

        spec.name = spec.name || name;

        if (spec.parallel) {
            fns = util.mapValues(spec.parallel, resolve);
            fn = middleware(RQ.parallel, fns);

        } else if (spec.race) {
            fns = util.mapValues(spec.race, resolve);
            fn = middleware(RQ.race, fns);

        } else if (spec.fallback) {
            fns = util.mapValues(spec.fallback, util.nameObject);
            fns = fns.filter(thing.isObject).sort(compare);
            fns = util.mapValues(fns, resolve);
            fn = middleware(RQ.fallback, fns);

        } else {
            fn = resolveImpl(basedir, spec.module);
            fn = createToggleWrapper(fn, spec);
        }

        return fn;
    };
}


/**
 * Attempts to locate a node module and get the specified middleware implementation.
 * @param root The root directory to resolve to if file is a relative path.
 * @param config The configuration object or string describing the module and option factory method.
 * @returns {Function} The middleware implementation, if located.
 */
function resolveImpl(root, config) {
    var modulePath, module, factory, args;

    if (typeof config === 'string') {
        return resolveImpl(root, { name: config });
    }

    if (!config || !config.name) {
        throw new TypeError('Module not defined.');
    }

    debug('loading module', config.name);

    // Check the initial module, then try to resolve it to an absolute path and check again.
    modulePath = util.tryResolve(config.name) || util.tryResolve(path.resolve(root, config.name));

    // If modulePath was not resolved lookup with config.name for meaningful error message.
    module = require(modulePath || config.name);

    // First, look for a factory method
    factory = module[config.method];
    if (!thing.isFunction(factory)) {
        // Then, check if the module itself is a factory
        factory = module;
        if (!thing.isFunction(factory)) {
            throw new Error('Unable to locate middleware in ' + config.name);
        }
    }

    args = thing.isArray(config['arguments']) ? config['arguments'] : [];
    return factory.apply(null, args);
}


/**
 * Creates a middleware wrapper for toggling whether the middleware is enabled or disabled at runtime.
 * @param fn the original middleware implementation.
 * @param settings The settings object containing info related to creating an appropriate wrapper.
 * @returns {Function}
 */
function createToggleWrapper(fn, settings) {
    /*jshint evil:true, multistr:true*/
    var name, impl;

    // Do not wrap express objects
    if (util.isExpress(fn)) {
        return fn;
    }

    // If the function arity is 4 then account for error handler
    if (fn.length === 4) {
        impl = 'function $name(err, req, res, next) { \
            settings.enabled ? fn(err, req, res, next) : next(err); \
        }';
    } else {
        impl = 'function $name(req, res, next) { \
            settings.enabled ? fn(req, res, next) : next(); \
        }';
    }

    name = fn.name || settings.name;
    if (!/^[$_A-Za-z\xa0-\uffff][$_A-Za-z0-9\xa0-\uffff]*$/.test(name)) {
        throw new SyntaxError('Invalid identifier.');
    }

    return eval('(' + impl.replace('$name', name) + ')');
}


/**
 * Middleware Factory
 * @param requestory
 * @param fns
 * @returns {Function}
 */
function middleware(requestory, fns) {
    var rq = requestory(fns.map(taskery));
    return function composite(req, res, next) {
        function complete(success, failure) {
            next(failure);
        }
        rq(complete, { req: req, res: res });
    };
}


/**
 * Task Factory
 * @param fn
 * @returns {Function}
 */
function taskery(fn) {
    return function requestor(requestion, value) {
        fn(value.req, value.res, function (err) {
            requestion(null, err);
        });
    };
}


/**
 * Comparator for sorting middleware by priority
 * @param a
 * @param b
 * @returns {number}
 */
function compare(a, b) {
    var ap, bp;
    ap = typeof a.priority === 'number' ? a.priority : Number.MIN_VALUE;
    bp = typeof b.priority === 'number' ? b.priority : Number.MIN_VALUE;
    return ap - bp;
}


module.exports = function meddleware(settings) {
    var basedir, app;

    // The `require`-ing module (caller) is considered the `basedir`
    // against which relative file paths will be resolved.
    // Don't like it? Then pass absolute module paths. :D
    basedir = path.dirname(caller());

    function onmount(parent) {
        var resolve, mountpath;

        // Remove the sacrificial express app.
        parent._router.stack.pop();

        resolve = resolvery(basedir);
        mountpath = app.mountpath;

        util
            .mapValues(settings, util.nameObject)
            .filter(thing.isObject)
            .sort(compare)
            .forEach(function register(spec) {
                var fn, eventargs, route;

                fn = resolve(spec, spec.name);
                eventargs = { app: parent, config: spec };

                route = mountpath;
                if (typeof spec.route === 'string') {
                    route += route[route.length - 1] !== '/' ? '/' : '';
                    route += spec.route[0] === '/' ? spec.route.slice(1) : spec.route;
                }

                debug('registering', spec.name, 'middleware');

                parent.emit('middleware:before', eventargs);
                parent.emit('middleware:before:' + spec.name, eventargs);
                parent.use(route, fn);
                parent.emit('middleware:after:' + spec.name, eventargs);
                parent.emit('middleware:after', eventargs);
            });
    }

    app = express();
    app.once('mount', onmount);
    return app;
};
