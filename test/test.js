/* globals describe, beforeEach, it, afterEach */
'use strict';

var fs         = require('fs');
var assert     = require('assert');
var rm         = require('rimraf').sync;
var mkdirp     = require('mkdirp').sync;

var Metalsmith = require('metalsmith');
var watch      = require('..');

function createMetalsmith(done, pattern){
  var m = new Metalsmith('./tmp');

  m.use(watch(pattern))
   .build(function(){
     done(m);
   });

  return m;
}

describe('metalsmith-watch', function(){

  beforeEach(function(){
    rm('./tmp');
    mkdirp('./tmp/src');
    fs.writeFileSync('./tmp/src/dummy', '');
  });

  it('should rebuild on file creation', function(done){

    var assertion = function ( files ){
      assert( files.test !== undefined);
      done();
    };

    createMetalsmith(function(metalsmith){
      metalsmith.use( assertion );
      fs.writeFile('./tmp/src/test', 'Test');
    });
  });

  it('should keep track of renamed files', function(done){
    var assertion = function ( files ){
      assert( files.renamed !== undefined);
      done();
    };

    createMetalsmith(function(metalsmith){
      metalsmith.use( assertion );
      fs.rename('./tmp/src/dummy', './tmp/src/renamed', function(){});
    });
  });

  it('should take a pattern string', function(done){
    var assertion = function ( files ){
      assert( files['markdown.md'] !== undefined);
      done();
    };

    createMetalsmith(function(metalsmith){
      metalsmith.use( assertion );
      fs.writeFile('./tmp/src/markdown.md', '');
    }, '*');
  });

  it('should take a pattern array', function(done){
    var assertion = function ( files ){
      assert( files['markdown.md'] !== undefined);
      done();
    };

    createMetalsmith(function(metalsmith){
      metalsmith.use( assertion );
      fs.writeFile('./tmp/src/markdown.md', '');
    }, ['*', '**/*']);
  });

  // Clean up
  afterEach(function(){
    // remove the tmp
    rm('./tmp');
    // Reset the watching
    watch.reset();
  });

});

