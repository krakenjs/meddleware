'use strict';


var test = require('tape'),
    express = require('express'),
    meddle = require('../');


test('mottleware', function (t) {

    t.test('empty config', function (t) {
        var app;

        app = meddle(require('./fixtures/empty'));

        t.equal(app.stack.length, 2);
        t.equal(app.stack[0].handle.name, 'query');
        t.equal(app.stack[1].handle.name, 'expressInit');
        t.end();
    });


    t.test('built-in middleware config', function (t) {
        var config, names, app;

        config = require('./fixtures/defaults');
        names = Object.keys(config);

        app = meddle(config);

        t.equal(app.stack.length, names.length + 2);
        names.forEach(function (name, i) {
            var handle = app.stack[i + 2].handle;
            t.equal(typeof handle, 'function');
            t.ok(handle.name.match(new RegExp(name, 'g')));
        });
        t.end();
    });

});

test('priority', function (t) {

    t.test('no priority', function (t) {
        var config, app, entry;

        config = require('./fixtures/no-priority');
        app = meddle(config);

        entry = app.stack[2];
        t.ok(entry);
        t.ok(entry.handle);
        t.equal(typeof entry.handle, 'function');
        t.equal(entry.handle.name, 'favicon');

        entry = app.stack[3];
        t.ok(entry);
        t.ok(entry.handle);
        t.equal(typeof entry.handle, 'function');
        t.equal(entry.handle.name, 'staticMiddleware');

        entry = app.stack[4];
        t.ok(entry);
        t.ok(entry.handle);
        t.equal(typeof entry.handle, 'function');
        t.equal(entry.handle.name, 'logger');

        t.end();
    });

});


test('factories', function (t) {

    t.test('custom middleware factories', function (t) {
        var config, names, app;

        config = require('./fixtures/factories');
        names = Object.keys(config);
        app = meddle(config);

        t.equal(app.stack.length, names.length + 2);
        names.forEach(function (name, i) {
            var handle = app.stack[i + 2].handle;
            t.equal(typeof handle, 'function');
            t.ok(handle.name);
            t.ok(handle.name.match(new RegExp(name, 'g')));
        });
        t.end();
    });

});


test('enabled', function (t) {

    t.test('custom middleware factories', function (t) {
        var config, names, app;

        config = require('./fixtures/enabled');
        names = Object.keys(config).filter(function (prop) {
            return config[prop].enabled;
        });

        app = meddle(config);

        t.equal(app.stack.length, 9);
        names.forEach(function (name, i) {
            var handle = app.stack[i + 2].handle;
            t.equal(typeof handle, 'function');
            t.ok(handle.name);
            t.ok(handle.name.match(new RegExp(name, 'g')));
        });
        t.end();
    });

});
