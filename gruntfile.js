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
    pkg: grunt.file.readJSON('package.json')
  });

  grunt.loadNpmTasks('grunt-karma');

  // tasks
  grunt.registerTask('test', ['karma:stache']);
};
