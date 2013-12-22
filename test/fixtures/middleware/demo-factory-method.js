'use strict';

module.exports = {

    demo2: function () {
        return function demo2(req, res, next) {
            next();
        };
    }

};