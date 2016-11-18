'use strict';


module.exports = function () {
    return function rq(req, res, next) {
        next();
    };
};