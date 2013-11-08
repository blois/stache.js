module.exports = function(karma) {

  karma.set({
    // base path, that will be used to resolve files and exclude
    basePath: '../',
    //browsers: ['Chrome', 'Firefox'],
    browsers: ['Chrome'],

    frameworks: ['mocha'],

    // use dots reporter, as travis terminal does not support escaping sequences
    // possible values: 'dots', 'progress', 'junit', 'teamcity'
    // CLI --reporters progress
    reporters: ['progress'],

    // web server port
    // CLI --port 9876
    port: 9876,

    // cli runner port
    // CLI --runner-port 9100
    runnerPort: 9100,

    // enable / disable colors in the output (reporters and logs)
    // CLI --colors --no-colors
    colors: true,

    // level of logging
    // possible values: LOG_DISABLE || LOG_ERROR || LOG_WARN || LOG_INFO || LOG_DEBUG
    // CLI --log-level debug
    logLevel: karma.LOG_INFO,

    // enable / disable watching file and executing tests whenever any file changes
    // CLI --auto-watch --no-auto-watch
    autoWatch: true,

    // If browser does not capture in given timeout [ms], kill it
    // CLI --capture-timeout 5000
    captureTimeout: 50000,

    // Auto run tests on start (when browsers are captured) and exit
    // CLI --single-run --no-single-run
    singleRun: false,

    // report which specs are slower than 500ms
    // CLI --report-slower-than 500
    reportSlowerThan: 500,

    plugins: [
      'karma-mocha',
      'karma-browserstack-launcher',
      'karma-chrome-launcher',
      'karma-firefox-launcher',
                        'karma-ie-launcher',
      'karma-ios-launcher',
      'karma-safari-launcher',
      'karma-script-launcher',
      'karma-crbot-reporter'
    ],

    // list of files / patterns to load in the browser
    files: [
      'tools/test/mocha-htmltest.js',
      'conf/mocha.conf.js',
      'node_modules/chai/chai.js',
      'stache.js',
      'test/js/*.js',
      {pattern: 'src/*', included: false},
      {pattern: 'test/html/*.html', included: false}
    ]
  });
};
