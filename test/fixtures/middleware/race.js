'use strict';

exports.middlewareA = function () {
    return function raceA(req, res, next) {
        if (!res.locals.winner) {
            res.locals.winner = 'a';
        }
        setTimeout(next, 100);
    };
};

exports.middlewareB = function () {
    return function raceB(req, res, next) {
        if (!res.locals.winner) {
            res.locals.winner = 'b';
        }
        setTimeout(next, 50);
    };
};

exports.middlewareC = function () {
    return function raceC(req, res, next) {
        if (!res.locals.winner) {
            res.locals.winner = 'c';
        }
        setImmediate(next);
    };
};