'use strict';


var RQ = require('./lib/rq');



function taskery(fn) {
    return function requestor(requestion, value) {
        fn(value.req, value.res, function (err) {
            requestion(null, err);
        });
    };
}

function middleware(requestory, fns) {
    var rq = requestory(fns.map(taskery));

    return function (req, res, next) {
        function complete(success, failure) {
            next(failure);
        }

        rq(complete, { req: req, res: next });
    };
}

function suba(req, res, next) {
    function done() {
        console.log(suba.name);
        next();
    }
    setTimeout(done, 2000);
}

function subb(req, res, next) {
    function done() {
        console.log(subb.name);
        next();
    }
    setTimeout(done, 1000);
}

function subc(req, res, next) {
    function done() {
        console.log(subc.name);
        next();
    }
    setTimeout(done, 1000);
}


var req = {}, res = {};
var composed = middleware(RQ.parallel, [suba, subb, subc]);
composed(req, res, function (err) {
    console.log(err);
});