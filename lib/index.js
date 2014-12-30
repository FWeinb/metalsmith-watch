'use strict';

var relative = require('path').relative;
var resolve = require('path').resolve;
var fs       = require('fs');
var path     = require('path');

var Gaze  = require('gaze').Gaze;
var chalk = require('chalk');

var _      = require('lodash');
var tinylr = require('tiny-lr-fork');

var watching = {};

/**
 * Metalsmith isn't expsing its file reading method,
 * so we need to reimplement it here. I hope in the
 * future metalsmith will provide an interface for this.
 *
 * @param {Object} metalsmith a metalsmith instance.
 * @return {Function}
 */
var rebuilder = function ( metalsmith, livereload ) {
  return function(filepath, name){
    metalsmith.readFile(filepath, function(err, file) {
      if (err) { throw err; }

      var files = {};
      files[name] = file;

      // Rerun the plugin-chain only for this one file.
      metalsmith.run(files, function(err, files){
        if ( err ) { throw err; }

        // Write the changed files
        metalsmith.write(files, function(err){
          if ( livereload !== null) {
            livereload.changed({body:{files:Object.keys(files)}});
          }
        });
      });
    });
  };
};

/**
 *
 *
 *
 * @param {String} source The source directory
 * @param {String} pattern The relative globing parameter
 * @param {Function} rebuild metasmith rebuild function
 * @param {Function} done metalsmith done callback.
 */
var startWatching = function ( source, pattern, rebuild, done) {
  console.log ( chalk.green('Started watching ') + chalk.cyan(pattern));

  var gaze = new Gaze(pattern, { cwd : source });

  gaze.on('ready', _.once(function(){
    done();
  }));

  gaze.on('all', function ( event, filepath ) {
    var name = relative(source, filepath);

    fs.lstat(filepath, function(err, stats){
      // Ignore errors and directorys
      if ( err || stats.isDirectory() === true ) { return; }

      console.log ( chalk.cyan( name ) + ' was ' + chalk.green( event ) );

      // rebuild the current file `filepath`
      // using the metalsmith rebuilder.
      rebuild(filepath, name);

    });
  });

  return gaze;
};

var startLivereloadServer = function ( options ) {
  if ( options === true){
    options = { port : 35729 };
  } else if ( typeof options === 'number'){
    options = { port : options };
  }

  var server = tinylr(options);

  server.on('error', function(err) {
    if (err.code === 'EADDRINUSE') {
      console.log(chalk.red('Port ' + options.port + ' is already in use by another process.'));
    } else {
      console.log(chalk.red(err));
    }
    process.exit(1);
  });

  server.listen(options.port, function(err) {
    if (err) { return console.log(chalk.red(err)); }
    console.log(chalk.green('Live reload server started on port: ' + options.port));
  });

  return server;
};


/**
 * Metalsmith watch plugin.
 * This function is bind to an option object to allow
 * it do have different options.
 */
var watch = function ( files, metalsmith, done ) {
  /*jshint validthis:true */
  var source = metalsmith.source();

  if ( watching[source] === undefined ) {
    var livereload = null;
    if ( this.livereload !== false ) {
      livereload = startLivereloadServer(this.livereload);
    }

    watching[source] = startWatching (source,  this.pattern, rebuilder(metalsmith, livereload), done);

  } else {
    done();
  }
};



// Default pattern
var defaults = {
  pattern : '**/*',
  livereload : false
};

// Expose
var exports = function ( options ) {
  if ( _.isString(options) || _.isArray(options) ){
    options = _.defaults({ pattern : options }, defaults);
  } else {
    options = _.defaults(options || {}, defaults);
  }

  return watch.bind(options);
};

/**
 * Expose reset method for test-suite.
 * This will stop all current watchers
 */
exports.reset = function(){
  _.each(watching, function(gaze){
    gaze.close();
  });
  watching = {};
};

module.exports = exports;
