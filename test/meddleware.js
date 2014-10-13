'use strict';


var test = require('tape'),
    express = require('express'),
    request = require('supertest'),
    shortstop = require('shortstop'),
    handlers = require('shortstop-handlers'),
    ssRegex = require('shortstop-regex'),
    meddle = require('../');

function Resolver() {
    var _resolver = shortstop.create();
    _resolver.use('path', handlers.path(__dirname));
    _resolver.use('regex', ssRegex());
    return function (config, cb) {
        _resolver.resolve(config, cb);
    };
}

var resolve = Resolver();


test('meddleware', function (t) {

    t.test('empty config', function (t) {
        var app;

        app = express();
        app.use(meddle(require('./fixtures/empty')));

        t.equal(app._router.stack.length, 2, 'app middleware stack length is default length');
        t.equal(app._router.stack[0].handle.name, 'query', 'middleware stack contains default "query" middleware');
        t.equal(app._router.stack[1].handle.name, 'expressInit', 'middleware stack contains default "expressInit" middleware');
        t.end();
    });


    t.test('built-in middleware config', function (t) {
        var config, names, app;

        config = require('./fixtures/defaults');
        names = Object.keys(config);

        resolve(config, function (err, config) {
            app = express();
            app.use(meddle(config));

            t.equal(app._router.stack.length, names.length + 2, 'middleware stack is appropriate length');
            names.forEach(function (name, i) {
                var handle = app._router.stack[i + 2].handle;
                t.equal(typeof handle, 'function', 'middleware is correctly defined');
                t.ok(handle.name.match(new RegExp(name, 'i')), 'middleware name is correct');
            });
            t.end();
        });
    });


    t.test('not defined property', function (t) {
        var config, app;

        config = require('./fixtures/undefined');

        resolve(config, function (err, config) {
            app = express();
            app.use(meddle(config));

            t.equal(app._router.stack.length, 6, 'middleware stack is appropriate length');
            t.end();
        });

    });

});


test('priority', function (t) {

    t.test('no priority', function (t) {
        var config, app, entry;

        config = require('./fixtures/no-priority');
        resolve(config, function (err, config) {
            app = express();
            app.use(meddle(config));

            entry = app._router.stack[2];
            t.ok(entry, 'position 2 middleware exists');
            t.equal(typeof entry.handle, 'function', 'position 2 middleware is a function');
            t.ok(entry.handle.name.match(/favicon/i), 'position 2 middleware has the expected name');

            entry = app._router.stack[3];
            t.ok(entry, 'position 3 middleware exists');
            t.equal(typeof entry.handle, 'function', 'position 3 middleware is a function');
            t.ok(entry.handle.name.match(/static/i), 'position 3 middleware has the expected name');

            entry = app._router.stack[4];
            t.ok(entry, 'position 4 middleware exists');
            t.equal(typeof entry.handle, 'function', 'position 4 middleware is a function');
            t.ok(entry.handle.name.match(/logger/i), 'position 4 middleware has the expected name');

            t.end();
        });
    });

});


test('module', function (t) {

    t.test('module not defined', function (t) {
        var config = {
            "missing": {
                "enabled": true,
                "module": null
            }
        };

        t.throws(function() {
            var app;
            try {
                app = express();
                app.use(meddle(config));
            } catch (e) {
                t.ok(e instanceof TypeError, 'error is TypeError');
                t.equal(e.message, 'Module not defined.', 'error message specifies module is not defined');
                throw e;
            }
        });

        t.end();
    });


    t.test('missing module', function (t) {
        var app;
        t.throws(function() {
            try {
                app = express();
                app.use(meddle(require('./fixtures/missing')));
            } catch (e) {
                t.ok(e instanceof Error);
                t.equal(e.code, 'MODULE_NOT_FOUND');
                throw e;
            }
        });

        t.end();
    });

});


test('factories', function (t) {

    t.test('custom middleware factories', function (t) {
        var config, names, app;

        config = require('./fixtures/factories');
        names = Object.keys(config);
        app = express();
        app.use(meddle(config));

        t.equal(app._router.stack.length, names.length + 2, 'middleware stack is correct length');
        names.forEach(function (name, i) {
            var handle = app._router.stack[i + 2].handle;
            t.equal(typeof handle, 'function', 'position ' + i + ' middleware is a function');
            t.ok(handle.name, 'position ' + i + ' middleware has a name');
            t.ok(handle.name.match(new RegExp(name, 'g')), 'position ' + i + ' middleware name matches ' + name);
        });
        t.end();
    });

});


test('enabled', function (t) {

    t.test('default to enabled', function (t) {
        var config, names, app;

        config = require('./fixtures/disabled');
        names = Object.keys(config).filter(function (prop) {
            return config[prop].enabled !== false;
        });

        resolve(config, function (err, config) {
            app = express();
            app.use(meddle(config));

            t.equal(app._router.stack.length, 3, 'middleware stack is appropriate length');

            names.forEach(function (name, i) {
                var handle = app._router.stack[i + 2].handle;
                t.equal(typeof handle, 'function', 'position ' + i + ' middleware is a function');
                t.ok(handle.name, 'position ' + i + ' middleware has a name');
                t.ok(handle.name.match(new RegExp(name, 'g')), 'position ' + i + ' middleware name matches ' + name);
            });
            t.end();
        });

    });

    t.test('only use enabled middleware', function (t) {
        var config, names, app;

        config = require('./fixtures/enabled');
        names = Object.keys(config).filter(function (prop) {
            return config[prop].enabled !== false;
        });

        resolve(config, function (err, config) {
            app = express();
            app.use(meddle(config));

            t.equal(app._router.stack.length, 3, 'middleware stack is appropriate length');

            names.forEach(function (name, i) {
                var handle = app._router.stack[i + 2].handle;
                t.equal(typeof handle, 'function', 'position ' + i + ' middleware is a function');
                t.ok(handle.name, 'position ' + i + ' middleware has a name');
                t.ok(handle.name.match(new RegExp(name, 'g')), 'position ' + i + ' middleware name matches ' + name);
            });
            t.end();
        });
    });

});


test('events', function (t) {

    t.test('before and after registration events', function (t) {
        var config, app, events = 0;

        config = require('./fixtures/defaults');

        resolve(config, function (err, config) {
            app = express();

            app.on('middleware:before', function () {
                events += 1;
            });

            app.on('middleware:after', function () {
                events += 1;
            });

            app.use(meddle(config));
            t.equal(events, 12, 'registration events were triggered');
            t.end();
        });
    });


    t.test('before and after named registration events', function (t) {
        var config, events, app;

        config = require('./fixtures/defaults');
        resolve(config, function (err, config) {
            events = 0;
            app = express();

            app.on('middleware:before:favicon', function (eventargs) {
                t.equal(eventargs.app, app);
                events += 1;
            });

            app.on('middleware:after:favicon', function (eventargs) {
                t.equal(eventargs.app, app);
                events += 1;
            });

            app.use(meddle(config));
            t.equal(events, 2, 'registration events were triggered');
            t.end();
        });
    });

});


test('error middleware', function (t) {

    t.test('arity of 4', function (t) {
        var config, app;

        function req(route, cb) {
            var server;
            server = request(app)
                .get(route)
                .end(function (err, res) {
                    t.error(err, 'no response error');
                    t.equal(res.statusCode, 500, 'response statusCode is 500');
                    t.equal(res.text, 'Oh noes!', 'response status is defined');
                    cb(res.text);
                });
        }

        config = require('./fixtures/error');

        app = express();

        // Putting the route before meddle() to ensure the router is seen first
        app.get('/', function (req, res) {
            throw new Error('Oh noes!');
        });

        app.use(meddle(config));

        req('/', function () {
            t.end();
        });
    });

});


test('routes', function (t) {

    t.test('route-specific middleware', function (t) {
        var config, app;

        function req(route, cb) {
            var server;
            server = request(app)
                .get(route)
                .end(function (err, res) {
                    t.error(err, 'no response error');
                    t.equal(typeof res, 'object', 'response is defined');
                    t.equal(typeof res.body, 'object', 'response body is defined');
                    cb(res.body);
                });
        }

        config = require('./fixtures/routes');
        resolve(config, function (err, config) {
            app = express();
            app.use(meddle(config));

            app.get('/', function (req, res) {
                t.notOk(res.locals.routeA);
                t.ok(res.locals.routeB);
                t.notOk(res.locals.routeC);
                t.notOk(res.locals.routeD);
                res.status(200).end();
            });

            app.get('/foo', function (req, res) {
                t.ok(res.locals.routeA);
                t.ok(res.locals.routeB);
                t.notOk(res.locals.routeC);
                t.notOk(res.locals.routeD);
                res.status(200).end();
            });

            app.get('/bar', function (req, res) {
                t.notOk(res.locals.routeA);
                t.ok(res.locals.routeB);
                t.ok(res.locals.routeC);
                t.notOk(res.locals.routeD);
                res.status(200).end();
            });

            app.get('/baz', function (req, res) {
                t.notOk(res.locals.routeC);
                t.notOk(res.locals.routeA);
                t.ok(res.locals.routeB);
                t.ok(res.locals.routeD);
                res.status(200).end();
            });

            // trololol
            req('/', function () {
                req('/foo', function () {
                    req('/bar', function () {
                        req('/baz', function () {
                            t.end();
                        });
                    });
                });
            });
        });

    });


    t.test('baseroute route-specific middleware', function (t) {
        var config, app;

        function req(route, cb) {
            var server;
            server = request(app)
                .get(route)
                .end(function (err, res) {
                    t.error(err, 'no response error');
                    t.equal(typeof res, 'object', 'response is defined');
                    t.equal(typeof res.body, 'object', 'response body is defined');
                    cb(res.body);
                });
        }

        config = require('./fixtures/routes');

        app = express();
        app.use('/bam', meddle(config));

        app.get('/', function (req, res) {
            console.log(res.locals);
            t.notOk(res.locals.routeA);
            t.ok(res.locals.routeB);
            t.notOk(res.locals.routeC);
            res.status(200).end();
        });

        app.get('/foo', function (req, res) {
            console.log(res.locals);
            t.ok(res.locals.routeA);
            t.ok(res.locals.routeB);
            t.notOk(res.locals.routeC);
            res.status(200).end();
        });

        app.get('/bar', function (req, res) {
            t.notOk(res.locals.routeA);
            t.ok(res.locals.routeB);
            t.ok(res.locals.routeC);
            res.status(200).end();
        });

        // trololol
        req('/bam', function () {
            req('/bam/foo', function () {
                req('/bam/bar', function () {
                    t.end();
                });
            });
        });

    });

});


test('composition', function (t) {

    t.test('parallel', function (t) {
        var config, app, time;

        function req(route, cb) {
            var server;
            server = request(app)
                .get(route)
                .end(function (err, res) {
                    t.error(err, 'no response error');
                    t.equal(typeof res, 'object', 'response is defined');
                    t.equal(typeof res.body, 'object', 'response body is defined');
                    cb(res.body);
                });
        }

        config = require('./fixtures/parallel');

        app = express();
        app.use(meddle(config));

        app.get('/', function (req, res) {
            t.ok(res.locals.parallelA);
            t.ok(res.locals.parallelB);
            t.ok(res.locals.parallelC);
            res.status(200).end();
        });

        time = Date.now();
        req('/', function () {
            time = Date.now() - time;
            t.ok(time > 1450);
            t.end();
        });
    });


    t.test('race', function (t) {
        var config, app, time;

        function req(route, cb) {
            var server;
            server = request(app)
                .get(route)
                .end(function (err, res) {
                    t.error(err, 'no response error');
                    t.equal(typeof res, 'object', 'response is defined');
                    t.equal(typeof res.body, 'object', 'response body is defined');
                    cb(res.body);
                });
        }

        config = require('./fixtures/race');

        app = express();
        app.use(meddle(config));

        app.get('/', function (req, res) {
            t.equal(res.locals.winner, 'a');
            res.status(200).end();
        });

        time = Date.now();
        req('/', function () {
            time = Date.now() - time;
            t.ok(time < 50);
            t.end();
        });
    });


    t.test('fallback', function (t) {
        var config, app, time;

        function req(route, cb) {
            var server;
            server = request(app)
                .get(route)
                .end(function (err, res) {
                    t.error(err, 'no response error');
                    t.equal(typeof res, 'object', 'response is defined');
                    t.equal(typeof res.body, 'object', 'response body is defined');
                    cb(res.body);
                });
        }

        config = require('./fixtures/fallback');

        app = express();
        app.use(meddle(config));

        app.get('/', function (req, res) {
            t.equal(res.locals.fallback, 'c');
            res.status(200).end();
        });

        req('/', function () {
            t.end();
        });
    });

});
