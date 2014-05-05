# metalsmith-watch [![NPM version](https://badge.fury.io/js/metalsmith-watch.svg)](http://badge.fury.io/js/metalsmith-watch) [![Build Status](https://travis-ci.org/FWeinb/metalsmith-watch.svg?branch=master)](https://travis-ci.org/FWeinb/metalsmith-watch)

  A metalsmith plugin to watch for a changes and trigger rebuilds.

## Installation

    $ npm install metalsmith-watch

## Basic example 

```js
var metalsmith = require('metalsmith');
var watch = require('metalsmith-watch');

metalsmith
  .use(watch())
  .build();
```

This will start watching the `metalsmith.source()` directory and all sub directorys (`**/*` glob).

## Advanced example

```js
var metalsmith = require('metalsmith');
var watch = require('metalsmith-watch');

metalsmith
  .use(watch('*.md'))
  .build();
```

This will watch the `metalsmith.source()` directory for changes in markdown files. 

## Options

### pattern 
Type: `String|Array`
Default value: `'**/*'`

A glob pattern that is used for watching.

### livereload
Type: `Boolean|Number|Object`
Default: false

Set to `true` or set `livereload: 1337` to a port number to enable live reloading. Default and recommended port is `35729`.

If enabled a live reload server will be started with the watch task per target. The live reload server will be triggered with the modified files.

Example:
```js
var metalsmith = require('metalsmith');
var watch = require('metalsmith-watch');

metalsmith
  .use(watch({
    pattern : '**/*',
    livereload: true
  })
  .build();
```

## History

  * `0.1.1` Add the ability to use an array to define multiple glob parameters.  
  * `0.1.0` To conform to other plugins watch must be used like `watch()` now. Keep track of renamed files correctly, closing Issue [#5](../../issues/5) 
  * `0.0.4` Added support for `livereload` closing Issue [#3](../../issues/3).
  * `0.0.3` Fix bug introduced in [segmentio/metalsmith@`15d43a7`](https://github.com/segmentio/metalsmith/commit/15d43a77734067f2f958ad198884d06dde5ac15f) via PR [#1](../../pull/1)
  * `0.0.2 Fix repositiory url in `package.json`
  * `0.0.1` Release 

## License

  MIT