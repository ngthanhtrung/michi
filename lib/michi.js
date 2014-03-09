'use strict';

var shien = require('shien'),

    router = require('./router'),
    route = require('./route'),

    michi = {};

shien.assign(michi, router);
shien.assign(michi, route);

module.exports = michi;
