"use strict";

module.exports = {
    thisMustBeingFoundByMeddleware: function () {
        return function (req, res, next) {
            res.locals.selfWasCalled = true;
            next(null);
        };
    },
    run: function () {
        return this.thisMustBeingFoundByMeddleware();
    }
};
