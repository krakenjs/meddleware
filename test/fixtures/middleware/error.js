'use strict';


module.exports = function () {
	return function serverError(err, req, res, next) {
        res.send(500, err.message);
    };
};