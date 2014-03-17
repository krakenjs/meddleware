'use strict';


module.exports = function () {
	return function serverError(err, req, res, next) {
		console.log('run error');
        res.send(500, err.message);
    };
};