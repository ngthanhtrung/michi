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
                src: '<%= mochaTest.all.src %>'
            },
            'travisCov': {
                options: {
                    reporter: 'travis-cov'
                },
                src: '<%= mochaTest.all.src %>'
            }
        },
        clean: {
            dist: 'dist'
        },
        mkdir: {
            dist: '<%= clean.dist %>'
        },
        umd: {
            qs: {
                src: 'node_modules/qs/index.js',
                dest: '<%= clean.dist %>/qs.js',
                template: 'templates/umd.hbs',
                amdModuleId: 'qs',
                indent: '  '
            },
            michi: {
                src: 'lib/michi.js',
                dest: '<%= clean.dist %>/michi.js',
                template: '<%= umd.qs.template %>',
                amdModuleId: 'michi',
                indent: '    '
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

    grunt.registerTask('release', 'Build release version', [
        'clean:dist',
        'mkdir:dist',
        'umd:qs',
        'umd:michi'
    ]);

    grunt.registerTask('default', 'Run tests and build release version', [
        'test',
        'release'
    ]);

};
