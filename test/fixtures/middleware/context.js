"use strict";

module.exports = {
    thisMustBeingFoundByMeddleware: function () {
        return function (req, res, next) {
            res.locals.selfWasCalled = true;
            next(null);
        };
    },
    run: function () {
        for (var p in this) {
            console.log(p);
        }
        return this.thisMustBeingFoundByMeddleware();
    }
};