# 1.0.1 - 2015-05-09

- Fixed: the plugin works correctly without any options provided ([#21](https://github.com/FWeinb/metalsmith-watch/pull/21))

# 1.0.0 - 2015-05-08

- Fixed: metalsmith-collections are now correctly adjusted to avoid duplicates entries after rebuilds)
- Removed: `pattern` option has been remove. Please use the new `paths` option
- Added: `paths` option allows you to specify a map to trigger rebuilds
(closes [#4](https://github.com/FWeinb/metalsmith-watch/issues/4) and [#13](https://github.com/FWeinb/metalsmith-watch/issues/13))
- Added: `log` option to be able to control watcher logs
- Added: when a JavaScript file is changed, the corresponding cache in node/iojs cache is refreshed.
This is particularly handy when working with plain JavaScript template
(eg: react template made with [metalsmith-react](https://github.com/MoOx/metalsmith-react))

# 0.2.1

- Fixed: Use metalsmith `.build()` method instead of `.run()`.

# 0.2.0

- Changed: Update to work with metalsmith `1.0`

# 0.1.1

- Added: ability to use an array to define multiple glob parameters.  

# 0.1.0

- Changed: To conform to other plugins watch must be used like `watch()` now.
- Fixed: keep track of renamed files correctly ([#5](https://github.com/FWeinb/metalsmith-watch/issues/5))

# 0.0.4

- Added: support for `livereload` ([#3](https://github.com/FWeinb/metalsmith-watch/issues/3)).

# 0.0.3

- Fixed: bug introduced in [segmentio/metalsmith@`15d43a7`](https://github.com/segmentio/metalsmith/commit/15d43a77734067f2f958ad198884d06dde5ac15f) ()[#1](https://github.com/FWeinb/metalsmith-watch/pull/1))

# 0.0.2

- Fixed: repositiory url in `package.json`

# 0.0.1

✨ Initial release
