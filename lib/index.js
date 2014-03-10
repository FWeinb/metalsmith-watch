'use strict';

var relative = require('path').relative;
var fs       = require('fs');

var utf8     = require('is-utf8');
var front    = require('front-matter');

var Gaze  = require('gaze').Gaze;
var chalk = require('chalk');

var watching = {};


/**
 * Metalsmith isn't expsing its file reading method,
 * so we need to reimplement it here. I hope in the
 * future metalsmith will provide an interface for this.
 *
 * @param {Object} metalsmith a metalsmith instance.
 * @return {Function}
 */
var rebuilder = function ( metalsmith ) {
  return function(filepath, name){
    // metalsmith isn't exposing the `read()` function
    // reimplement it on our own.
    fs.readFile(filepath, function(err, buffer){
      var files = {};
      files[name] = { contents : buffer };

      if ( utf8(buffer) ){
        var parsed = front(buffer.toString());
        files[name] = parsed.attributes;
        files[name].contents = new Buffer(parsed.body);
      }

      // Rerun the plugin-chain only for this one file.
      metalsmith.ware.run(files, metalsmith, function(err){
        if ( err ) { throw err; }
        metalsmith.write(files, function(err){
          if ( err ) { throw err; }
          console.log ( chalk.green( '...rebuild' ) );
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
 * @param {String} patterns The relative globing parameter
 * @param {Function} rebuild metasmith rebuild function
 * @param {Function} done metalsmith done callback.
 */
var startWatching = function ( source, patterns, rebuild, done) {
  console.log ( chalk.green('Started watching ') + chalk.cyan(patterns));

  var gaze = new Gaze(patterns);

  gaze.on('ready', function(){
    done();
  });

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
};


/**
 * Metalsmith watch plugin.
 * This function is bind to an option object to allow
 * it do have different options.
 */
var watch = function ( files, metalsmith, done ) {
  /*jshint validthis:true */
  var source = metalsmith.source();
  var globbingSrc = source + '/' + this.pattern;

  if ( watching[globbingSrc] === undefined ) {
    watching[globbingSrc] = true;
    startWatching (source,  relative(metalsmith.dir, globbingSrc), rebuilder(metalsmith), done);
  } else {
    done();
  }
};



// Default pattern
var defaults = {
  pattern : '**/*'
};

// Expose
module.exports = function ( pattern ) {
  if ( arguments.length === 3){

    // direct usage like `.use(watch)`
    watch.apply(defaults, [].slice.call(arguments));

  } else {
    // usage with pattern like `.use(watch('**'))`
    var options = {};

    if ( !!pattern ) {
      options.pattern = pattern;
    } else {
      options.pattern = defaults.pattern;
    }

    return watch.bind(options);
  }
};
