var fs         = require('fs');

var assert     = require('assert');
var resolve    = require('path').resolve;
var rm         = require('rimraf').sync;
var mkdirp     = require('mkdirp').sync;

var Metalsmith = require('metalsmith');
var markdown   = require('metalsmith-markdown');
var watch      = require('..');


describe('metalsmith-watch', function(){

  beforeEach(function(){
    rm('./tmp');
    mkdirp('./tmp/src');
    fs.writeFileSync('./tmp/src/dummy', '');
  });

  it('should rebuild on file creation', function(done){
    var assertion = function ( files ){
      // Assert that test file exists
      assert( files.test !== undefined);
      done();
    };

    createMetalsmith(function(metalsmith){
      metalsmith.use( assertion );
      fs.writeFile('./tmp/src/test', '');
    });
  });

  // Clean up
  after(function(){
    rm('./tmp');
  });

});

function createMetalsmith(done){
  var m = new Metalsmith(__dirname);
  m.source('./tmp/src')
   .destination('./tmp/dest')
   .use(watch)
   .build(function(){
     done(m);
   });
  return m;
}