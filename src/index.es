import {
  relative as relativePath,
} from "path"

import async from "async"
import chokidar from "chokidar"
import color from "chalk"
import multimatch from "multimatch"
import unyield from "unyield"
import metalsmithFilenames from "metalsmith-filenames"

import livereloadServer from "./livereload"

const addFilenames = metalsmithFilenames()

const ok = color.green("✔︎")
const nok = color.red("✗")

function invalidateCache(path, absolutePath, options) {
  console.log(path, absolutePath)
  if (require.cache[absolutePath]) {
    options.log(`${path} cache deleted`)
    delete require.cache[absolutePath]
  }
}

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

function buildFiles(metalsmith, paths, livereload, options, previousFilesMap) {
  const files = {}
  async.each(
    paths,
    (path, cb) => {
      metalsmith.readFile(path, function(err, file) {
        if (err) {
          options.log(color.red(`${nok} ${err}`))
          return
        }

        files[path] = file
        cb()
      })
    },
    (err) => {
      if (err) {
        options.log(color.red(`${nok} ${err}`))
        return
      }

      const nbOfFiles = Object.keys(files).length
      options.log(color.gray(`- Updating ${nbOfFiles} file${nbOfFiles > 1 ? "s" : ""}...`))
      runAndUpdate(metalsmith, files, livereload, options, previousFilesMap)
    }
  )
}


function buildPattern(metalsmith, pattern, livereload, options, previousFilesMap) {
  unyield(metalsmith.read())((err, files) => {
    if (err) {
      options.log(color.red(`${nok} ${err}`))
      return
    }

    const filesToUpdate = {}
    multimatch(Object.keys(files), pattern).forEach(path => filesToUpdate[path] = files[path])
    const nbOfFiles = Object.keys(filesToUpdate).length
    options.log(color.gray(`- Updating ${nbOfFiles} file${nbOfFiles > 1 ? "s" : ""}...`))
    runAndUpdate(metalsmith, filesToUpdate, livereload, options, previousFilesMap)
  })
}

export default function(options) {
  // just to mutate and pass watcher for testing
  const originalOptions = options

  options = {
    ...{
      paths: "${source}/**/*",
      livereload: false,
      log: (...args) => {
        console.log(color.gray("[metalsmith-server]"), ...args)
      },
      chokidar: {
        ...options.chokidar,
        ignoreInitial: true,
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

  let watcher = false

  return (files, metalsmith, cb) => {
    cb()

    if (watcher) {
      return
    }

    // metalsmith-collections fix: keep filename as metadata
    saveFilenameInFilesData(files)

    const patterns = {}
    Object.keys(options.paths).map(pattern => {
      const watchPattern = pattern.replace("${source}", metalsmith._source)
      patterns[watchPattern] = {
        absolutePath: metalsmith.path(watchPattern),
        patternToRebuild: options.paths[pattern],
      }
    })

    watcher = chokidar.watch(
      Object.keys(patterns).map(pattern => {
        return patterns[pattern].absolutePath
      }),
      options.chokidar
    )
    watcher.once("ready", () => {
      Object.keys(patterns).forEach(pattern => {
        options.log(`${ok} Watching ${color.cyan(pattern)}`)
      })
    })

    const previousFilesMap = {...files}

    // Delay watch update to be able to bundle multiples update in the same build
    // Saving multiples files at the same time create multiples build otherwise
    let updateDelay = 50
    let updatePlanned = false
    let pathsToUpdate = []
    const update = () => {
      const patternsToUpdate = Object.keys(patterns).filter(pattern => patterns[pattern].patternToRebuild === true)
      const filesToUpdate = multimatch(pathsToUpdate, patternsToUpdate).map(file => relativePath(metalsmith._source, file))
      if (filesToUpdate.length) {
        buildFiles(metalsmith, filesToUpdate, livereload, options, previousFilesMap)
      }

      const patternsToUpdatePattern = Object.keys(patterns)
        .filter(pattern => patterns[pattern].patternToRebuild !== true)
        .filter(pattern => multimatch(pathsToUpdate, pattern).length > 0)
      if (patternsToUpdatePattern.length) {
        buildPattern(metalsmith, patternsToUpdatePattern, livereload, options, previousFilesMap)
      }
      console.log("update", pathsToUpdate, patternsToUpdate, filesToUpdate, patternsToUpdatePattern)

      // cleanup
      pathsToUpdate = []
    }

    watcher.on("all", (event, path) => {
      const filename = relativePath(metalsmith._directory, path)
      console.log(event, path, filename)
      if (event === "add") {
        options.log(`${ok} ${color.cyan(filename)} added`)
      }
      else if (event === "change") {
        options.log(`${ok} ${color.cyan(filename)} changed`)
      }
      else if (event === "unlink") {
        options.log(`${ok} ${color.cyan(filename)} removed`)
      }

      // delay
      if (event === "add" || event === "change") {
        if (options.invalidateCache) {
          invalidateCache(relativePath(metalsmith.source(), path), path, options)
        }

        pathsToUpdate.push(relativePath(metalsmith.path(), path))
        if (updatePlanned) {
          clearTimeout(updatePlanned)
        }
        updatePlanned = setTimeout(update, updateDelay)
      }
    })

    originalOptions.close = () => {
      watcher.close()
      watcher = undefined
    }
  }
}
