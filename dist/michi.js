define(function (require, exports, module) {
    'use strict';
    
    var qs = require('qs'),
    
        METHODS = [ 'GET', 'HEAD', 'POST', 'PUT', 'DELETE', 'OPTIONS' ],
    
        IDENT_PATTERN = '(\\/)?(\\.)?([:\\*])(\\w+)(\\?)?',
        IDENT_LOCAL_REGEX = new RegExp(IDENT_PATTERN),
        IDENT_REGEX = new RegExp(IDENT_PATTERN, 'g'),
    
        KEY_PATTERN = '[\\w\\-\\s]+',
        KEY_REGEX = new RegExp('^' + KEY_PATTERN + '$'),
    
        GLOB_PATTERN = '[\\w\\-\\s\\/]+',
        GLOB_REGEX = new RegExp('^' + GLOB_PATTERN + '$');
    
    exports.methods = METHODS;
    
    var Route = exports.Route = function (router, uri, method) {
        this.router = router;
        this.match(uri, method);
    };
    
    Route.prototype = new function () {
    
        this.match = function (uri, method) {
            var self = this;
    
            if (method && METHODS.indexOf(method) < 0) {
                throw new Error('Method must be one of `' + METHODS.join('`, `')  + '`');
            }
    
            this.uri = uri;
            this.method = method;
    
            this.idents = []; // identifiers
            this.identsByName = {};
    
            uri.replace(IDENT_REGEX, function searchIdentifiers() {
                var type = arguments[3],
                    name = arguments[4],
                    ident = {
                        name: name,
                        pattern: (type === ':' ? KEY_PATTERN : GLOB_PATTERN),
                        regex: (type === ':' ? KEY_REGEX : GLOB_REGEX)
                    };
    
                self.idents.push(ident);
                self.identsByName[name] = ident;
            });
    
            return this;
        };
    
        this.where = function (conditions) {
            this.conds = conditions || {};
    
            for (var name in conditions) {
                if (conditions.hasOwnProperty(name)) {
                    var ident = this.identsByName[name],
                        cond = conditions[name],
                        pattern;
    
                    if (typeof cond === 'string') {
                        pattern = cond;
    
                    } else if (Array.isArray(cond)) {
                        pattern = cond.join('|');
    
                    } else {
                        pattern = cond.toString()
                            .replace(/^\/\^?/, '')
                            .replace(/\$?\/[gis]?$/, '');
                    }
    
                    ident.pattern = pattern;
                    ident.regex = new RegExp('^' + pattern + '$');
                }
            }
    
            return this;
        };
    
        this.to = function (terminal) {
            if (typeof terminal !== 'string') {
                throw new Error('Terminal must be a string!');
            }
    
            var parts = terminal.split('.');
    
            if (parts.length !== 2) {
                throw new Error('Terminal must be in the format of `controller.action`!');
            }
    
            this.terminal = terminal;
            this.controller = parts[0];
            this.action = parts[1];
    
            return this;
        };
    
        this.options = function (opts) {
            this.opts = opts || {};
            return this;
        };
    
        this.as = function (name) {
            this.name = name;
            return (this.router.routesByName[name] = this);
        };
    
        function regex() {
            /* jshint validthis: true */
    
            if (this.regex) {
                return this.regex;
            }
    
            var self = this,
    
                argsByName = {},
                nameRegex = /\$(\w+)\$/g,
    
                pattern = this.uri.replace(IDENT_REGEX, function () {
                    var name = arguments[4];
                    argsByName[name] = arguments;
                    return '$' + name + '$';
                });
    
            pattern = pattern.replace(/([\/.])/g, '\\$1')
                .replace(nameRegex, function replaceIdentitiers(all, name) {
                    var pattern = self.identsByName[name].pattern,
    
                        args = argsByName[name],
                        slash = args[1],
                        format = args[2],
                        optional = args[5];
    
                    slash = (slash ? '\\' + slash : '');
                    format = (format ? '\\' + format : '');
    
                    return (optional ? '' : slash) +
                            '(?:' +
                            (optional ? slash : '') +
                            (format || '') +
                            '(' + pattern + ')' +
                            ')' +
                            (optional || '');
                });
    
            return (this.regex = new RegExp('^' + pattern + '$'));
        }
    
        this.pattern = function () {
            return regex.call(this);
        };
    
        this.test = function (uri) {
            return regex.call(this).test(uri);
        };
    
        this.parse = function (uri, method) {
            var head = false;
    
            if (method === 'HEAD') {
                method = 'GET';
                head = true;
            }
    
            if (method && this.method && method !== this.method) {
                return false;
            }
    
            if (head) {
                method = 'HEAD';
            } else if (!method && this.method) {
                method = this.method;
            }
    
            var matched = regex.call(this).exec(uri),
                params = {};
    
            if (!matched) {
                return false;
            }
    
            this.idents.forEach(function iterateIdentifiers(ident, i) {
                var val = matched[i + 1];
    
                if (typeof val === 'string') {
                    val = decodeURIComponent(val);
                }
    
                if (val) {
                    params[ident.name] = val;
                }
            });
    
            return {
                controller: this.controller,
                action: this.action,
                method: method,
                params: params
            };
        };
    
        this.stringify = function (params) {
            var self = this,
    
                p = {},
                matched = true,
    
                uri = this.uri,
                found;
    
            for (var prop in params) {
                if (params.hasOwnProperty(prop)) {
                    p[prop] = params[prop];
                }
            }
    
            function replaceIdentifiers(all, slash, format, type, name, optional) { // jshint ignore: line
                found = true;
    
                if (typeof p[name] === 'undefined') {
                    return (optional ? '' : (matched = false));
                }
    
                var val = p[name];
                delete p[name];
    
                if (!self.identsByName[name].regex.test(val)) {
                    return (matched = false);
                }
    
                return (slash || '') + (format || '') + val;
            }
    
            do {
                found = false;
                uri = uri.replace(IDENT_LOCAL_REGEX, replaceIdentifiers);
            } while (found && matched);
    
            if (!matched) {
                return false;
            }
    
            return [ uri, p ];
        };
    
    };
    
    var Router = exports.Router = function () {
        this.routes = [];
        this.routesByName = {};
    };
    
    Router.prototype = new function () {
    
        this.match = function (uri, method) {
            var route = new Route(this, uri, method);
            this.routes.push(route);
            return route;
        };
    
        METHODS.forEach(function (method) {
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
    
});
