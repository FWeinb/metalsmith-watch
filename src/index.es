import {
  relative as relativePath,
  resolve as resolvePath,
  isAbsolute as isAbsolutePath,
  dirname,
  normalize as normalizePath,
} from "path"

import chokidar from "chokidar"
import color from "chalk"
import multimatch from "multimatch"
import unyield from "unyield"
import metalsmithFilenames from "metalsmith-filenames"

import livereloadServer from "./livereload"

const jsFileRE = /\.(jsx?|es\d{0,1})$/
const addFilenames = metalsmithFilenames()

const ok = color.green("✔︎")
const nok = color.red("✗")

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
  if(livereload) {
    const keys = Object.keys(files)
    const nbOfFiles = Object.keys(files).length
    options.log(`${ok} ${nbOfFiles} file${nbOfFiles > 1 ? "s" : ""} reloaded`)
    livereload.changed({body: {files: keys}})
  }
}

// metalsmith-collections fix: collections are mutable
// fuck mutability
function backupCollections(collections) {
  const collectionsBackup = {}
  if (typeof collections === "object") {
    Object.keys(collections).forEach(key => {
      collectionsBackup[key] = [...collections[key]]
    })
  }
  return collectionsBackup
}

// metalsmith-collections fix: collections are in metadata as is + under metadata.collections
function updateCollections(metalsmith, collections) {
  const metadata = {
    ...metalsmith.metadata(),
    collections,
  }
  // copy ref to metadata root since metalsmith-collections use this references
  // as primary location (*facepalm*)
  Object.keys(collections).forEach(key => {
    metadata[key] = collections[key]
  })
  metalsmith.metadata(metadata)
}

// metalsmith-collections fix: helps to update fix collections
function saveFilenameInFilesData(files) {
  addFilenames(files)
}

// metalsmith-collections fix: remove items from collections that will be readded by the partial build
function removeFilesFromCollection(files, collections) {
  const filenames = Object.keys(files)
  Object.keys(collections).forEach(key => {

    for (let i = 0; i < collections[key].length; i++) {
      if (filenames.indexOf(collections[key][i].filename) > -1) {
        collections[key] = [
          ...collections[key].slice(0, i),
          ...collections[key].slice(i + 1),
        ]
        i--
      }
    }
  })
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
  saveFilenameInFilesData(files)
  const collections = metalsmith.metadata().collections
  const collectionsBackup = backupCollections(collections)
  if (collections) {
    // mutability ftl :(
    removeFilesFromCollection(files, collections)

    // metalsmith-collections fix: prepare collections with partials items
    // run() below will add the new files to the collections
    updateCollections(metalsmith, collections)
  }

  metalsmith.run(files, function(err, freshFiles) {
    if (err) {
      if (collections) {
        // metalsmith-collections fix: rollback collections
        updateCollections(metalsmith, collectionsBackup)
      }

      options.log(color.red(`${nok} ${err.toString()}`))
      // babel use that to share information :)
      if (err.codeFrame) {
        err.codeFrame.split("\n").forEach(line => options.log(line))
      }
      return
    }


    // metalsmith-collections fix:  update ref for future tests
    Object.keys(freshFiles).forEach(path => {
      previousFilesMap[path] = freshFiles[path]
    })

    metalsmith.write(freshFiles, function(writeErr) {
      if(writeErr) {throw writeErr}

      livereloadFiles(livereload, freshFiles, options)
    })
  })
}

function rebuild(metalsmith, patterns, livereload, options, previousFilesMap) {
  unyield(metalsmith.read())((err, files) => {
    if (err) {
      options.log(color.red(`${nok} ${err}`))
      return
    }

    const filesToUpdate = {}
    multimatch(Object.keys(files), patterns).forEach(path => filesToUpdate[path] = files[path])

    patterns.forEach(p => {
      if (files[p]) {
        filesToUpdate[p] = files[p]
      }
    })

    const nbOfFiles = Object.keys(filesToUpdate).length
    options.log(color.gray(`- Updating ${nbOfFiles} file${nbOfFiles > 1 ? "s" : ""}...`))
    runAndUpdate(metalsmith, filesToUpdate, livereload, options, previousFilesMap)
  })
}

function getRebuildList(metalsmith, patterns, changed) {
  const patternsToUpdate = Object.keys(patterns).filter(pattern => patterns[pattern].has("${self}"))
  const filesToUpdate = multimatch(changed, patternsToUpdate).map(file => {
    const filepath = resolvePath(metalsmith.path(), file)
    return relativePath(metalsmith.source(), filepath)
  })

  const patternsToUpdatePattern = []

  for (const pattern of Object.keys(patterns)) {
    for (const updatePattern of patterns[pattern]) {
      if (updatePattern.includes("${dirname}")) {
        patternsToUpdatePattern.push(...changed
          .filter(pathToUpdate => multimatch(pathToUpdate, pattern).length > 0)
          .map(pathToUpdate => {
            const
              absolutePath = dirname(resolvePath(metalsmith.directory(), pathToUpdate)),
              relativeToSrc = relativePath(metalsmith.source(), absolutePath)

            return normalizePath(updatePattern.replace("${dirname}", relativeToSrc))
          })
        )
      } else if (updatePattern !== "${self}" && multimatch(changed, pattern).length > 0) {
        patternsToUpdatePattern.push(updatePattern)
      }
    }
  }

  return filesToUpdate.concat(patternsToUpdatePattern)
}

module.exports = function(options) {
  options = {
    ...{
      paths: "${source}/**/*",
      livereload: false,
      log: (...args) => {
        console.log(color.gray("[metalsmith-watch]"), ...args)
      },
      invalidateCache: true,
    },
    ...(options || {}),
  }

  if (typeof options.paths === "string") {
    options.paths = {[options.paths]: true}
  }

  let livereload
  if(options.livereload) {
    livereload = livereloadServer(options.livereload, options.log)
  }

  let watched = false
  const plugin = function metalsmithWatch(files, metalsmith, cb) {

    // only run this plugin once
    if (watched) {
      cb()
      return
    }
    watched = true

    // metalsmith-collections fix: keep filename as metadata
    saveFilenameInFilesData(files)

    const patterns = {}
    Object.keys(options.paths).map(pattern => {
      let watchPattern = pattern.replace("${source}", metalsmith.source())
      if (!isAbsolutePath(watchPattern)){
        watchPattern = resolvePath(metalsmith.directory(), pattern)
      }

      const watchPatternRelative = relativePath(metalsmith.directory(), watchPattern)
      const replacement = new Set(Array.isArray(options.paths[pattern]) ?
        options.paths[pattern] :
        [options.paths[pattern]]
      )

      // backward compatibility: replace true with "${self}"
      if (replacement.has(true)) {
        replacement.delete(true)
        replacement.add("${self}")
      }

      patterns[watchPatternRelative] = replacement
    })

    const watcher = chokidar.watch(Object.keys(patterns), Object.assign(
      {
        // do not watch metalsmith's build dir
        ignored: `${metalsmith._destination}/**/*`,
        ignoreInitials: true,
        cwd: metalsmith._directory,
        persistent: false,
      },
      options.chokidar
    ))
    watcher.on("error", err => {
      throw err
    })

    watcher.on("ready", () => {
      Object.keys(patterns).forEach(pattern => {
        options.log(`${ok} Watching ${color.cyan(pattern)}`)
      })

      const previousFilesMap = {...files}

      // Delay watch update to be able to bundle multiples update in the same build
      // Saving multiples files at the same time create multiples build otherwise
      let updateDelay = 50
      let updatePlanned = false
      let pathsToUpdate = []
      const update = () => {
        // since I can't find a way to do a smart cache cleaning
        // (see commented invalidateCache() method)
        // here is a more brutal way (that works)
        if (
          options.invalidateCache &&
          // only if there is a js file
          pathsToUpdate.some(file => file.match(jsFileRE))
        ) {
          const filesToInvalidate = Object.keys(patterns)
            .reduce((acc, pattern) => {
              return [
                ...acc,
                ...multimatch(
                  Object.keys(require.cache),
                  `${resolvePath(metalsmith._directory)}/${pattern}`
                ),
              ]
            }, [])
          if (filesToInvalidate.length) {
            options.log(color.gray(`- Deleting cache for ${filesToInvalidate.length} entries...`))
            filesToInvalidate.forEach(file => delete require.cache[file])
            options.log(`${ok} Cache deleted`)
          }
        }

        const toRebuild = getRebuildList(metalsmith, patterns, pathsToUpdate)

        if (toRebuild.length) {
          rebuild(metalsmith, toRebuild, livereload, options, previousFilesMap)
        }

        // cleanup
        pathsToUpdate = []
      }

      watcher.on("all", (event, path) => {
        if (
          event === "add" ||
          event === "addDir" ||
          event === "change" ||
          event === "unlink" ||
          event === "unlinkDir"
        ) {
          options.log(`${ok} ${color.cyan(path)} ${event}`)
        }

        if (
          event === "add" ||
          event === "change"
        ) {
          pathsToUpdate.push(path)
          if (updatePlanned) {
            clearTimeout(updatePlanned)
          }

          updatePlanned = setTimeout(update, updateDelay)
        }
      })

      plugin.close = () => {
        if (typeof watcher === "object") {
          watcher.close()
        }
      }
    })

    cb()
  }

  // convenience for testing
  plugin.options = options

  return plugin
}
