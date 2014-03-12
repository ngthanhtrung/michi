'use strict';

var path = require('path'),
    blanket = require('blanket');

module.exports = function (grunt) {
    /* jshint scripturl: true */

    require('load-grunt-tasks')(grunt);

    grunt.initConfig({
        jshint: {
            options: {
                jshintrc: '.jshintrc'
            },
            all: [
                '{lib,test}/**/*.js',
                'Gruntfile.js',
            ]
        },
        mochaTest: {
            all: {
                options: {
                    require: function instrumentFiles() {
                        blanket({
                            pattern: path.join(__dirname, 'lib')
                        });
                    }
                },
                src: [ 'test/**/*.js' ]
            },
            'htmlCov': {
                options: {
                    reporter: 'html-cov',
                    quiet: true,
                    captureFile: 'coverage.html'
                },
                src: [ 'test/**/*.js' ]
            },
            'travisCov': {
                options: {
                    reporter: 'travis-cov'
                },
                src: [ 'test/**/*.js' ]
            }
        }
    });

    var exitProcess;

    grunt.registerTask('coverage:before', function () {
        exitProcess = process.exit;
        process.exit = function (code) {
            code && grunt.warn('Coverage does not be satisfied!');
        };
    });

    grunt.registerTask('coverage:after', function () {
        process.exit = exitProcess;
    });

    grunt.registerTask('test', 'Run JSHint and tests', [
        'jshint:all',

        'mochaTest:all',
        'mochaTest:htmlCov',

        'coverage:before',
        'mochaTest:travisCov',
        'coverage:after'
    ]);

    grunt.registerTask('default', [ 'test' ]);

};
