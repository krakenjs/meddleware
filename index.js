'use strict';

var path = require('path'),
    RQ = require('./lib/rq'),
    caller = require('caller'),
    express = require('express'),
    util = require('./lib/util'),
    thing = require('core-util-is'),
    debug = require('debuglog')('meddleware');


/**
 * Creates a middleware resolver based on the provided basedir.
 * @param basedir the directory against which to resolve relative paths.
 * @returns {resolve} a the implementation that converts a given spec to a middleware function.
 */
function resolvery(basedir) {
    return function resolve(spec, name) {
        var fns, fn, args;

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
            args = spec['arguments'];
            args = Array.isArray(args) ? args.slice() : [];

            fn = resolveModule(spec.module, basedir);
            fn = resolveFactory(fn, spec);
            fn = createToggleWrapper(fn.apply(null, args), spec);
        }

        return fn;
    };
}


/**
 * Attempts to locate a node module based on file and root directory.
 * @param file The file path (absolute or relative) for which to look up the module.
 * @param root The root directory to resolve to if file is a relative path.
 * @returns {*} The desired module, if located.
 */
function resolveModule(file, root) {
    var module;

    debug('resolving module', file);

    if (!file) {
        throw new TypeError('Module not defined.');
    }

    module = util.tryResolve(file);
    if (!module && !util.isAbsolutePath(file)) {
        file = path.resolve(root, file);
        module = util.tryResolve(file);
    }

    debug('loading module', module);

    if (!module) {
        throw new TypeError('Module not found: ' + file);
    }

    return require(module);
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

    // Do not wrap express objects
    if (util.isExpress(fn)) {
        return fn;
    }

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
 * @returns {requestor}
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

    function onmount(app) {
        var resolve;

        // Remove the sacrificial express app.
        app.stack.pop();

        resolve = resolvery(basedir);

        util
            .mapValues(settings, util.nameObject)
            .filter(thing.isObject)
            .sort(compare)
            .forEach(function register(spec) {
                var fn, eventargs;

                fn = resolve(spec, spec.name);
                eventargs = { app: app, config: spec };

                debug('registering', spec.name, 'middleware');

                app.emit('middleware:before', eventargs);
                app.emit('middleware:before:' + spec.name, eventargs);
                typeof spec.route === 'string' ? app.use(spec.route, fn) : app.use(fn);
                app.emit('middleware:after:' + spec.name, eventargs);
                app.emit('middleware:after', eventargs);
            });
    }

    app = express();
    app.once('mount', onmount);
    return app;
};