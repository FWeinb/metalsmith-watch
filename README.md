# metalsmith-watch

  A metalsmith plugin to watch for a changes and trigger rebuilds.

## Installation

    $ npm install metalsmith-watch

## Basic example 

```js
var metalsmith = require('metalsmith');
var watch = require('metalsmith-watch');

metalsmith
  .use(watch)
  .build();
```

This will start watching the `metalsmith.source()` directory and all sub directorys.

## Advanced example

```js
var metalsmith = require('metalsmith');
var watch = require('metalsmith-watch');

metalsmith
  .use(watch('*.md'))
  .build();
```

This will watch the `metalsmith.source()` directory for changes in markdown files. 


## History

  * 0.0.3 Fix bug introdurced in [segmentio/metalsmith@`15d43a7`](https://github.com/segmentio/metalsmith/commit/15d43a77734067f2f958ad198884d06dde5ac15f) via PR [#1](/../../issues/3)
  * 0.0.2 Fix repositiory url in `package.json`
  * 0.0.1 Release 

## License

  MIT