'use strict';

var path = require('path'),
    blanket = require('blanket');

module.exports = function (grunt) {
    /* jshint scripturl: true */

    // Load all grunt tasks
    require('matchdep')
        .filterDev('grunt-*')
        .forEach(grunt.loadNpmTasks);

    grunt.initConfig({
        jshint: {
            options: {
                jshintrc: '.jshintrc'
            },
            all: [
                '{lib,test}/**/*.js',
                'Gruntfile.js'
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
                src: [
                    'test/**/*.js',
                    '!test/assets/**'
                ]
            },
            'htmlCov': {
                options: {
                    reporter: 'html-cov',
                    quiet: true,
                    captureFile: 'coverage.html'
                },
                src: [
                    'test/**/*.js',
                    '!test/assets/**'
                ]
            },
            'travisCov': {
                options: {
                    reporter: 'travis-cov'
                },
                src: [
                    'test/**/*.js',
                    '!test/assets/**'
                ]
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

    grunt.registerTask('default', 'Run tests and build', [
        'test'
    ]);

};
