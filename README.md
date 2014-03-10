# metalsmith-watch

  A metalsmith plugin to watch the `src`folder for a change and trigger rebuilds.

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


## License

  MIT