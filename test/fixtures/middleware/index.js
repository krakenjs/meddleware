'use strict';

var context = require('./context');

module.exports = {
    context: context.run.bind(context),
};
