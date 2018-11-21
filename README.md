# metalsmith-watch [![Build Status](https://travis-ci.org/FWeinb/metalsmith-watch.svg?branch=master)](https://travis-ci.org/FWeinb/metalsmith-watch) [![NPM version](http://img.shields.io/npm/v/metalsmith-watch.svg?style=flat)](https://www.npmjs.org/package/metalsmith-watch)

> Metalsmith plugin to watch for changes and trigger partial and full rebuilds.

## Installation

```console
$ npm install metalsmith-watch
```

## Usage

```js
var metalsmith = require('metalsmith');
var watch = require('metalsmith-watch');

metalsmith(__dirname)
  .use(
    watch({
      paths: {
        "${source}/**/*": true,
        "templates/**/*": "**/*.md",
      },
      livereload: true,
    })
  )
  .build();
```

## Options

### paths (default: `{"${source}/**/*": true}`)

Map of paths to watch, and what each of these paths should rebuild. Both keys and values accept a [glob pattern](https://github.com/isaacs/node-glob):

```js
{
  "file(s) to watch": "file(s) to rebuild"
}
```

The map values can be either a string or the boolean `true` value:
* if the value is set to true, then only the changed file is rebuilt
* if set to a string, all files matching the glob pattern are rebuilt; the keyword `${dirname}` can be used, pointing to the directory holding the changed file

```js
{
  // only the modified markdown files are rebuilt on change
  "${source}/**/*.md": true,
  
  // template changes trigger a rebuild of all files 
  "templates/**/*": "**/*", 

  // changes to code examples rebuild all files in their respective parent directories
  "${source}/**/code_examples/*": "${dirname}/../*", 
}
```

**Please note that**:
- `${source}` can be used in the watched path configuration, and is replaced by `metalsmith.source()` 
- _values of the map are relative to `metalsmith.source()`_ (because it's the only place where to build files)


### livereload (default: `false`)

Allows you to enable a livereload server.
Using a boolean will enable a livereload server on port the default port is `35729`.
Accept a port number to start on the port you need.

To get live reload working properly, you should add the following `<script>` in your templates files to enable livereloading of each pages:

```html
<script src="http://localhost:35729/livereload.js"></script>
```

Make sure to update the port number in the script above accordingly to the port specified.

### log (default: `function(...args) { console.log(prefix, ...args)}`)

Function used to display the logs.

### invalidateCache (default: `true`)

Allows you to enable cache invalidation for js files.
Convenient if you use some js files for templates
(eg: React templates) to get updated components.
If disabled you won't get update for changed js files as node/iojs use a cache.

## [Changelog](CHANGELOG.md)

## [License](LICENSE.md)
