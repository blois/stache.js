/*
 * Copyright 2013 The Polymer Authors. All rights reserved.
 * Use of this source code is governed by a BSD-style
 * license that can be found in the LICENSE file.
 */
module.exports = function(grunt) {
  grunt.initConfig({
    karma: {
      options: {
        configFile: 'conf/karma.conf.js',
        keepalive: true
      },
      buildbot: {
        logLevel: 'OFF'
      },
      stache: {
      }
    },
    closureCompiler: {
      options: {
        compilerFile: 'third_party/closure_compiler/compiler.jar',
        compilerOpts: {
          compilation_level: 'SIMPLE_OPTIMIZATIONS',
          //externs: ['path/to/file.js', '/source/**/*.js'],
          warning_level: 'verbose',
          //jscomp_off: ['checkTypes', 'fileoverviewTags'],
          summary_detail_level: 3,
          output_wrapper: '%output%'
        }
      },
      stache: {
        src: 'stache.js',
        dest: 'stach_min.js'
      }
    },
    pkg: grunt.file.readJSON('package.json')
  });

  // plugins
  grunt.loadNpmTasks('grunt-karma');
  grunt.loadNpmTasks('grunt-closure-tools');

  // tasks
  grunt.registerTask('test', ['karma:stache']);
  grunt.registerTask('compile', ['closureCompiler:stache']);
};
