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
        "${source}/**/*": "${self}",
        "templates/**/*": "**/*.md",
      },
      livereload: true,
    })
  )
  .build();
```

## Options

### paths (default: `{"${source}/**/*": "${self}"}`)

Map of paths to watch, and what each of these paths should rebuild. Both keys and values accept a [glob pattern](https://github.com/isaacs/node-glob):

```js
{
  "file(s) to watch": "file(s) to rebuild"
}
```

A map value can be either a single string, or an array of strings. If an array is provided, all items matching the array values are rebuilt.

Additional to glob patterns, the following keywords can be used in map values:
* `${self}`: the changed file itself
* `${dirname}`: points to the directory holding the changed file

```js
{
  // only the modified markdown files are rebuilt on change
  "${source}/**/*.md": "${self}",
  
  // template changes trigger a rebuild of all files 
  "templates/**/*": "**/*", 

  // changes to code examples rebuild:
  //   * all files in the "assets" directory and its subdirectories
  //   * all files in their respective parent directories
  "${source}/**/code_examples/*": ["assets/**/*", "${dirname}/../*"], 
}
```

**Please note that**:
- `${source}` can be used in the watched path configuration, and is replaced by `metalsmith.source()` 
- values of the map are **always** relative to `metalsmith.source()` (because only source files can be built)
- to ensure backward compatibility with older versions of `metalsmith-watch`, map values can be set with the boolean `true` value; this has the same effect than the `${self}` keyword


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
