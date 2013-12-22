'use strict';


module.exports = function () {
    return function demo(req, res, next) {
        next();
    };
};