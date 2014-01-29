'use strict';


exports.middlewareA = function () {
    return function parallelA(req, res, next) {
        res.locals.parallelA = true;
        setTimeout(next, 1500);
    };
};


exports.middlewareB = function () {
    return function parallelB(req, res, next) {
        res.locals.parallelB = true;
        setTimeout(next, 500);
    };
};


exports.middlewareC = function () {
    return function parallelC(req, res, next) {
        res.locals.parallelC = true;
        setTimeout(next, 100);
    };
};