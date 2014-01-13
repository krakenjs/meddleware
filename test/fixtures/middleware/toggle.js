'use strict';

var express = require('express');

exports.middlewareA = function () {
    return function middlewareA(req, res, next) {
        res.locals.a = 'a';
        next();
    };
};

exports.middlewareB = function () {
    return function middlewareB(req, res, next) {
        res.locals.b = 'b';
        next();
    };
};

exports.middlewareC = function () {
    return function middlewareC(req, res) {
        res.json({ a: res.locals.a, b:  res.locals.b });
    };
};

exports.middlewareD = function () {
    return express();
};