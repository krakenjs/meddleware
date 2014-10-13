'use strict';



exports.routeA = function () {
    return function routeA(req, res, next) {
        res.locals.routeA = true;
        next();
    };
};


exports.routeB = function () {
    return function routeB(req, res, next) {
        res.locals.routeB = true;
        next();
    };
};


exports.routeC = function () {
    return function routeC(req, res, next) {
        res.locals.routeC = true;
        next();
    };
};

exports.routeD = function () {
    return function routeC(req, res, next) {
        res.locals.routeD = true;
        next();
    };
};
