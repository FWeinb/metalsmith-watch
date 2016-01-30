"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});

var _extends = Object.assign || function (target) { for (var i = 1; i < arguments.length; i++) { var source = arguments[i]; for (var key in source) { if (Object.prototype.hasOwnProperty.call(source, key)) { target[key] = source[key]; } } } return target; };

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { "default": obj }; }

function _toConsumableArray(arr) { if (Array.isArray(arr)) { for (var i = 0, arr2 = Array(arr.length); i < arr.length; i++) arr2[i] = arr[i]; return arr2; } else { return Array.from(arr); } }

function _defineProperty(obj, key, value) { if (key in obj) { Object.defineProperty(obj, key, { value: value, enumerable: true, configurable: true, writable: true }); } else { obj[key] = value; } return obj; }

var _path = require("path");

var _async = require("async");

var _async2 = _interopRequireDefault(_async);

var _gaze = require("gaze");

var _gaze2 = _interopRequireDefault(_gaze);

var _chalk = require("chalk");

var _chalk2 = _interopRequireDefault(_chalk);

var _multimatch = require("multimatch");

var _multimatch2 = _interopRequireDefault(_multimatch);

var _unyield = require("unyield");

var _unyield2 = _interopRequireDefault(_unyield);

var _metalsmithFilenames = require("metalsmith-filenames");

var _metalsmithFilenames2 = _interopRequireDefault(_metalsmithFilenames);

var _livereload = require("./livereload");

var _livereload2 = _interopRequireDefault(_livereload);

var jsFileRE = /\.(jsx?|es\d{0,1})$/;
var addFilenames = (0, _metalsmithFilenames2["default"])();

var ok = _chalk2["default"].green("✔︎");
var nok = _chalk2["default"].red("✗");

// only first file that require something has it in its children
// so relying on children to invalidate sibling is not doable
// function invalidateCache(from, path, options) {
//   // we invalidate cache only for files in metalsmith root
//   if (require.cache[path] && path.indexOf(from) === 0) {
//     Object.keys(require.cache)
//       .filter(file => file.indexOf(from) === 0)
//       .filter(file => require.cache[file].children.indexOf(require.cache[path]) > -1)
//       .forEach(file => {
//         console.log(file, "is in children")
//         invalidateCache(from, file, options)
//       })
//
//     delete require.cache[path]
//     options.log(`${relativePath(from, path)} cache deleted`)
//     return true
//   }
//   return false
// }

function livereloadFiles(livereload, files, options) {
  if (livereload) {
    var keys = Object.keys(files);
    // adding filterReload option for multimatch to remove unwanted files like *.css.map
    // turns out map files being passed to livereload client script make a full reload of a page even if only css was updated
    var passKeys = keys;
    if (options.filterReload && options.filterReload.length > 0) {
      passKeys = (0, _multimatch2["default"])(keys, options.filterReload);
    }
    // warn if all changes were filtered out
    var nbOfFiles = Object.keys(files).length;
    options.log(ok + " " + nbOfFiles + " file" + (nbOfFiles > 1 ? "s" : "") + " reloaded");
    var nbOfPassedFiles = passKeys.length;
    if (nbOfPassedFiles > 0) {
      options.log(ok + " " + nbOfPassedFiles + " file" + (nbOfPassedFiles > 1 ? "s" : "") + " sent to livereload client");
    } else {
      options.log(nok + " " + nbOfPassedFiles + " files sent to livereload client");
    }
    livereload.changed({ body: { files: passKeys } });
  }
}

// metalsmith-collections fix: collections are mutable
// fuck mutability
function backupCollections(collections) {
  var collectionsBackup = {};
  if (typeof collections === "object") {
    Object.keys(collections).forEach(function (key) {
      collectionsBackup[key] = [].concat(_toConsumableArray(collections[key]));
    });
  }
  return collectionsBackup;
}

// metalsmith-collections fix: collections are in metadata as is + under metadata.collections
function updateCollections(metalsmith, collections) {
  var metadata = _extends({}, metalsmith.metadata(), {
    collections: collections
  });
  // copy ref to metadata root since metalsmith-collections use this references
  // as primary location (*facepalm*)
  Object.keys(collections).forEach(function (key) {
    metadata[key] = collections[key];
  });
  metalsmith.metadata(metadata);
}

// metalsmith-collections fix: helps to update fix collections
function saveFilenameInFilesData(files) {
  addFilenames(files);
}

// metalsmith-collections fix: remove items from collections that will be readded by the partial build
function removeFilesFromCollection(files, collections) {
  var filenames = Object.keys(files);
  Object.keys(collections).forEach(function (key) {

    for (var i = 0; i < collections[key].length; i++) {
      if (filenames.indexOf(collections[key][i].filename) > -1) {
        collections[key] = [].concat(_toConsumableArray(collections[key].slice(0, i)), _toConsumableArray(collections[key].slice(i + 1)));
        i--;
      }
    }
  });
}

function runAndUpdate(metalsmith, files, livereload, options, previousFilesMap) {
  // metalsmith-collections fix: metalsmith-collections plugin add files to
  // collection when run() is called which create problem since we use run()
  // with only new files.
  // In order to prevent prevent duplicate issue (some contents will be available
  // in collections with the new and the previous version),
  // we remove from existing collections files that will be updated
  // (file already in the collections)
  // we iterate on collections with reference to previous files data
  // and skip old files that match the paths that will be updated
  saveFilenameInFilesData(files);
  var collections = metalsmith.metadata().collections;
  var collectionsBackup = backupCollections(collections);
  if (collections) {
    // mutability ftl :(
    removeFilesFromCollection(files, collections);

    // metalsmith-collections fix: prepare collections with partials items
    // run() below will add the new files to the collections
    updateCollections(metalsmith, collections);
  }

  metalsmith.run(files, function (err, freshFiles) {
    if (err) {
      if (collections) {
        // metalsmith-collections fix: rollback collections
        updateCollections(metalsmith, collectionsBackup);
      }

      options.log(_chalk2["default"].red(nok + " " + err.toString()));
      // babel use that to share information :)
      if (err.codeFrame) {
        err.codeFrame.split("\n").forEach(function (line) {
          return options.log(line);
        });
      }
      return;
    }

    // metalsmith-collections fix:  update ref for future tests
    Object.keys(freshFiles).forEach(function (path) {
      previousFilesMap[path] = freshFiles[path];
    });

    metalsmith.write(freshFiles, function (writeErr) {
      if (writeErr) {
        throw writeErr;
      }

      livereloadFiles(livereload, freshFiles, options);
    });
  });
}

function buildFiles(metalsmith, paths, livereload, options, previousFilesMap) {
  var files = {};
  _async2["default"].each(paths, function (path, cb) {
    metalsmith.readFile(path, function (err, file) {
      if (err) {
        options.log(_chalk2["default"].red(nok + " " + err));
        return;
      }

      files[path] = file;
      cb();
    });
  }, function (err) {
    if (err) {
      options.log(_chalk2["default"].red(nok + " " + err));
      return;
    }

    var nbOfFiles = Object.keys(files).length;
    options.log(_chalk2["default"].gray("- Updating " + nbOfFiles + " file" + (nbOfFiles > 1 ? "s" : "") + "..."));
    runAndUpdate(metalsmith, files, livereload, options, previousFilesMap);
  });
}

function buildPattern(metalsmith, patterns, livereload, options, previousFilesMap) {
  (0, _unyield2["default"])(metalsmith.read())(function (err, files) {
    if (err) {
      options.log(_chalk2["default"].red(nok + " " + err));
      return;
    }

    var filesToUpdate = {};
    (0, _multimatch2["default"])(Object.keys(files), patterns).forEach(function (path) {
      return filesToUpdate[path] = files[path];
    });
    var nbOfFiles = Object.keys(filesToUpdate).length;
    options.log(_chalk2["default"].gray("- Updating " + nbOfFiles + " file" + (nbOfFiles > 1 ? "s" : "") + "..."));
    runAndUpdate(metalsmith, filesToUpdate, livereload, options, previousFilesMap);
  });
}

exports["default"] = function (options) {
  options = _extends({
    paths: "${source}/**/*",
    livereload: false,
    log: function log() {
      for (var _len = arguments.length, args = Array(_len), _key = 0; _key < _len; _key++) {
        args[_key] = arguments[_key];
      }

      console.log.apply(console, [_chalk2["default"].gray("[metalsmith-watch]")].concat(args));
    },
    invalidateCache: true
  }, options || {});

  if (typeof options.paths === "string") {
    options.paths = _defineProperty({}, options.paths, true);
  }

  var livereload = undefined;
  if (options.livereload) {
    livereload = (0, _livereload2["default"])(options.livereload, options.log);
  }

  var watched = false;
  var plugin = function metalsmithWatch(files, metalsmith, cb) {

    // only run this plugin once
    if (watched) {
      cb();
      return;
    }
    watched = true;

    // metalsmith-collections fix: keep filename as metadata
    saveFilenameInFilesData(files);

    var patterns = {};
    Object.keys(options.paths).map(function (pattern) {
      var watchPattern = pattern.replace("${source}", (0, _path.normalize)(metalsmith._source));
      patterns[watchPattern] = options.paths[pattern];
    });

    (0, _gaze2["default"])(Object.keys(patterns), _extends({}, options.gaze, {
      cwd: metalsmith._directory
    }), function watcherReady(err, watcher) {
      if (err) {
        throw err;
      }

      Object.keys(patterns).forEach(function (pattern) {
        options.log(ok + " Watching " + _chalk2["default"].cyan(pattern));
      });

      var previousFilesMap = _extends({}, files);

      // Delay watch update to be able to bundle multiples update in the same build
      // Saving multiples files at the same time create multiples build otherwise
      var updateDelay = 50;
      var updatePlanned = false;
      var pathsToUpdate = [];
      var update = function update() {
        // since I can't find a way to do a smart cache cleaning
        // (see commented invalidateCache() method)
        // here is a more brutal way (that works)
        if (options.invalidateCache &&
        // only if there is a js file
        pathsToUpdate.some(function (file) {
          return file.match(jsFileRE);
        })) {
          var filesToInvalidate = Object.keys(patterns).reduce(function (acc, pattern) {
            return [].concat(_toConsumableArray(acc), _toConsumableArray((0, _multimatch2["default"])(Object.keys(require.cache), (0, _path.resolve)(metalsmith._directory) + "/" + pattern)));
          }, []);
          if (filesToInvalidate.length) {
            options.log(_chalk2["default"].gray("- Deleting cache for " + filesToInvalidate.length + " entries..."));
            filesToInvalidate.forEach(function (file) {
              return delete require.cache[file];
            });
            options.log(ok + " Cache deleted");
          }
        }

        var patternsToUpdate = Object.keys(patterns).filter(function (pattern) {
          return patterns[pattern] === true;
        });
        var filesToUpdate = (0, _multimatch2["default"])(pathsToUpdate, patternsToUpdate).map(function (file) {
          return (0, _path.relative)(metalsmith._source, file);
        });
        if (filesToUpdate.length) {
          buildFiles(metalsmith, filesToUpdate, livereload, options, previousFilesMap);
        }

        var patternsToUpdatePattern = Object.keys(patterns).filter(function (pattern) {
          return patterns[pattern] !== true;
        }).filter(function (pattern) {
          return (0, _multimatch2["default"])(pathsToUpdate, pattern).length > 0;
        }).map(function (pattern) {
          return patterns[pattern];
        });

        if (patternsToUpdatePattern.length) {
          buildPattern(metalsmith, patternsToUpdatePattern, livereload, options, previousFilesMap);
        }
        // console.log(pathsToUpdate, filesToUpdate, patternsToUpdatePattern)

        // cleanup
        pathsToUpdate = [];
      };

      watcher.on("all", function (event, path) {
        var filename = (0, _path.relative)(metalsmith._directory, path);

        if (event === "added" || event === "changed" || event === "renamed" || event === "deleted") {
          options.log(ok + " " + _chalk2["default"].cyan(filename) + " " + event);
        }

        // if (event === "changed") {
        //   if (options.invalidateCache) {
        //     invalidateCache(
        //       resolvePath(metalsmith._directory),
        //       resolvePath(path),
        //       options
        //     )
        //   }
        // }

        if (event === "added" || event === "changed" || event === "renamed") {
          pathsToUpdate.push((0, _path.relative)(metalsmith.path(), path));
          if (updatePlanned) {
            clearTimeout(updatePlanned);
          }
          updatePlanned = setTimeout(update, updateDelay);
        }
      });

      plugin.close = function () {
        if (typeof watcher === "object") {
          watcher.close();
          watcher = undefined;
        }
      };
    });

    cb();
  };

  // convenience for testing
  plugin.options = options;

  return plugin;
};

module.exports = exports["default"];