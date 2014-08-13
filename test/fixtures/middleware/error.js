'use strict';


module.exports = function () {
	return function serverError(err, req, res, next) {
        res.status(500).end(err.message);
    };
};