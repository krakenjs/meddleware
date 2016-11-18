var test = require('tape');

test('test local resolve edge case', function (t) {
    var meddleware = require('../index');
    var express = require('express');

    var app = express();

    var config = {
        example: {
            module: './rq.js'
        }
    };

    try {
        app.use(meddleware(config));
    } catch (e) {
        t.fail(e.message, 'error', e.message);
    }

    t.end();
});