'use strict';

var qs = require('qs'),

    route = require('./route'),
    methods = route.methods,
    Route = route.Route;

function Router() {
    this.routes = [];
    this.routesByName = {};
}

Router.prototype = new function () {

    this.match = function (uri, method) {
        var route = new Route(this, uri, method);
        this.routes.push(route);
        return route;
    };

    methods.forEach(function (method) {
        if (method === 'HEAD') {
            return;
        }

        this[method.toLowerCase()] = function (uri) {
            return this.match(uri, method);
        };
    }, this);

    this.next = function (uri, method, index) {
        if (typeof index === 'undefined') {
            index = 0;
        }

        for (var i = index, len = this.routes.length; i < len; i++) {
            var route = this.routes[i],
                ret = route.parse(uri, method);

            if (ret) {
                ret.next = i + 1;
                return ret;
            }
        }

        return false;
    };

    this.first = function (uri, method) {
        return this.next(uri, method);
    };

    this.all = function (uri, method) {
        var all = [];

        this.routes.forEach(function iterateRoutes(route) {
            var ret = route.parse(uri, method);
            if (ret) {
                all.push(ret);
            }
        });

        return all;
    };

    this.url = function (name, params, ignoreQuery) {
        var route = this.routesByName[name];
        if (!route) {
            throw new Error('Invalid route name `' + name + '`!');
        }

        var ret = route.stringify(params);
        if (!ret) {
            return false;
        }

        if (ignoreQuery) {
            return ret[0];
        }

        var query = qs.stringify(ret[1]);
        return (ret[0] + (query.length ? '?' + query : ''));
    };

};

exports.Router = Router;
