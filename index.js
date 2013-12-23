'use strict';

var path = require('path'),
    caller = require('caller'),
    express = require('express'),
    proxy = require('./lib/event-proxy');



function tryResolve(module) {
    try {
        return require.resolve(module);
    } catch (e) {
        return undefined;
    }
}


function isAbsolutePath(filename) {
    return path.resolve(filename) === filename;
}


function resolveModule(filename, root) {
    var module;

    if (!filename) {
        throw new TypeError('Module not defined.');
    }

    module = tryResolve(filename);
    if (!module && !isAbsolutePath(filename)) {
        filename = path.resolve(root, filename);
        module = tryResolve(filename);
    }

    if (!module) {
        throw new TypeError('Module not found: ' + filename);
    }

    return require(module);
}


function namer(settings) {
    return function name(key) {
        var spec;
        spec = settings[key];
        spec.name = key;
        return spec;
    };
}


function sort(a, b) {
    var ap, bp;
    ap = typeof a.priority === 'number' ? a.priority : Number.MIN_VALUE;
    bp = typeof b.priority === 'number' ? b.priority : Number.MIN_VALUE;
    return ap - bp;
}


function findFactory(module, spec) {
    var factory;

    factory = spec.factoryMethod;
    if (typeof module[factory] === 'function') {
        return module[factory];
    }

    factory = spec.name;
    if (typeof module[factory] === 'function') {
        return module[factory];
    }

    return module;
}


function createToggler(fn, settings) {
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


function registerer(app, root) {
    return function register(spec) {
        var args, fn, eventargs;

        args = spec['arguments'];
        args = Array.isArray(args) ? args.slice() : [];

        fn = resolveModule(spec.module, root);
        fn = findFactory(fn, spec);
        fn = createToggler(fn.apply(null, args), spec);

        eventargs = {
            app: app,
            middleware: spec
        };

        app.emit('middleware:before', eventargs);
        app.emit('middleware:before:' + spec.name, app);
        app.use(fn);
        app.emit('middleware:after:' + spec.name, app);
        app.emit('middleware:after', eventargs);
    };
}


module.exports = function (settings) {
    var root, app;

    root = path.dirname(caller());
    app = express();
    app.once('mount', function (parent) {
        // Reset all mounted app settings to inherit from parent.
        // This way, all changes to parent will be picked up by
        // mounted apps, but config of mounted apps will be localized
        // to that app.
        app.settings = Object.create(parent.settings);
        app = proxy.create(app, parent);

        Object.keys(settings)
            .map(namer(settings))
            .sort(sort)
            .forEach(registerer(app, root));
    });

    return app;
};
