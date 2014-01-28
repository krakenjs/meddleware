'use strict';


exports.middlewareA = function () {
    return function fallbackA(req, res, next) {
        setTimeout(next.bind(null, new Error('fail A')), 500);
    };
};


exports.middlewareB = function () {
    return function fallbackB(req, res, next) {
        setTimeout(next.bind(null, new Error('fail B')), 250);
    };
};


exports.middlewareC = function () {
    return function fallbackC(req, res, next) {
        res.locals.fallback = 'c';
        setTimeout(next, 100);
    };
};