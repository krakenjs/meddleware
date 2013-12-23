'use strict';

exports.create = function (src, dest) {

    return Object.create(src, {
        super_: {
            get: function () {
                return Object.getPrototypeOf(this);
            }
        },

        dest_: {
            value: dest
        },

        emit: {
            value: function () {
                var dest, supr;

                dest = this.dest_;
                supr = this.super_;

                dest.emit.apply(dest, arguments);
                supr.emit.apply(supr, arguments);
            }
        }
    });

};