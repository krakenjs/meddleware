'use strict';

var express = require('express'),
    assert = require('assert'),
    request = require('supertest'),
    meddle = require('../../../../');

var config = {
  "testMiddlewareContext": {
      "enabled": true,
      "priority": 10,
      "module": {
          "name": "middleware",
          "method": "context"
      }
  }
};

function req(route, cb) {
  var server;
  server = request(app)
      .get(route)
      .end(function (err, res) {
          assert(!err, 'expected no response error');
          assert.strictEqual(typeof res, 'object', 'response is defined');
          assert.strictEqual(typeof res.body, 'object', 'response body is defined');
          cb(res.body);
      });
}

var app = express();
app.use(meddle(config));

app.get('/', function (req, res) {
    assert(res.locals.selfWasCalled,'The method was called with a scope');
    res.status(200).end();
});

req('/', function () {
    console.log('success!!!');
});
