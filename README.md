# metalsmith-watch [![Build Status](https://travis-ci.org/FWeinb/metalsmith-watch.svg?branch=master)](https://travis-ci.org/FWeinb/metalsmith-watch) [![NPM version](https://badge.fury.io/js/metalsmith-watch.svg)](http://badge.fury.io/js/metalsmith-watch)

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
        "**/*": true,
        "templates/**/*": "**/*.md",
      },
      livereload: true,
    })
  )
  .build();
```

## Options

### paths (default: `{"**/*": true}`)

Map of paths to trigger rebuild. Both keys and value accept a [glob pattern](https://github.com/isaacs/node-glob).

```js
{
  "file(s) to watch": "file(s) to rebuild"
}
```

Value accept a boolean. When a boolean is used, only watched files changed will be rebuilded.

```js
{
  "**/*": true, // every changed files will trigger a rebuild of themselves
  "templates/**/*": "**/*", // every templates changed will trigger a rebuild of all files
}
```

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

## [Changelog](CHANGELOG.md)

## [License](LICENSE.md)
