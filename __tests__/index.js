import fs from "fs"
import {relative as relativePath} from "path"

import tape from "tape"
import {sync as rm} from "rimraf"
import {sync as mkdirp} from "mkdirp"
import chalk from "chalk"

import Metalsmith from "metalsmith"
import watch from "../src"

const noop = () => {}
const noopExceptErr = (err) => {
  if (err) {throw err}
  console.log("yep")
}

const closers = {}

function cleanTests(key) {
  closers[key]()
  rm(`${__dirname}/tmp-${key}`)
}

function prepareTests(key, testCb, assertionCb, options) {
  const folder = `${__dirname}/tmp-${key}`
  const metalsmith = new Metalsmith(folder)

  rm(folder)
  mkdirp(`${folder}/src`)
  fs.writeFileSync(`${folder}/src/dummy`, "")

  const watcherOpts = {
    // log: noop,
    ...options,
  }

  let done = false
  // chokidar might still detect dummy file created above
  // so we delay just a bit the tests...
  setTimeout(
    () => {
      metalsmith
        .use(watch(watcherOpts))
        .build(err => {
          if (err) {throw err}

          metalsmith
            .use((files) => {
              if (done) {
                throw new Error("This assertion block should not be called twice")
              }
              closers[key] = watcherOpts.close
              if (assertionCb !== noop) {
                done = true
                assertionCb(files)
                // metalsmith write the builded files after this plugin
                setTimeout(() => cleanTests(key), 1000)
              }
            })
          setTimeout(() => testCb(), 1000)
        })
    },
    1000
  )

  return folder
}

tape("metalsmith-server/watcher", (test) => {

  test.test("logs", (t) => {
    const logs = []
    const key = "logs"
    const folder = prepareTests(
      key,
      () => fs.writeFile(`${folder}/src/test`, "Test", noopExceptErr),
      () => {
        t.deepEqual(
          logs,
          [
            "✔︎ Watching src/**/*",
            "✔︎ src/test added",
            "- Updating 1 file...",
          ],
          "should logs things")
        t.end()
      },
      {
        log: (log) => {
          console.log("## " + log)
          logs.push(chalk.stripColor(log))
        },
      }
    )
  })

  test.test("track create", (t) => {
    const key = "create"
    const folder = prepareTests(
      key,
      () => fs.writeFile(`${folder}/src/test`, "Test", noopExceptErr),
      (files) => {
        t.ok(files.test, "should rebuild on file creation")
        t.end()
      }
    )
  })

  test.test("track rename", (t) => {
    const key = "rename"
    const folder = prepareTests(
      key,
      () => fs.rename(`${folder}/src/dummy`, `${folder}/src/renamed`, noopExceptErr),
      (files) => {
        t.ok(files.renamed, "should keep track of renamed files")
        t.end()
      }
    )
  })

  test.test("rebuild sibling mapping", (t) => {
    const key = "sibling"
    const siblingFolder = `${__dirname}/tmp-${key}/sibling`
    prepareTests(
      key,
      () => {
        rm(siblingFolder)
        mkdirp(siblingFolder)
        console.log("going to write", `${siblingFolder}/test`)
        fs.writeFile(`${siblingFolder}/test`, "test", noopExceptErr)
      },
      () => {
        t.pass("should rebuild if a mapped item get updated")
        t.end()
        setTimeout(() => rm(siblingFolder), 1000)
      },
      {
        paths: {
          "${source}/**/*": true,
          "sibling/**/*": "**/*",
        },
      }
    )
  })

  test.test("invalidate js cache", (t) => {
    const key = "cache"
    const folder = prepareTests(
      key,
      () => {
        const jsfile = `${folder}/src/thing.js`
        console.log(jsfile, `./${relativePath(__dirname, folder)}/src/thing.js`)
        fs.writeFile(jsfile, "module.exports = 1;", (err) => {
          if (err) {throw err}

          t.equal(require(`./${relativePath(__dirname, folder)}/src/thing.js`), 1, "should get the exported value")
          fs.writeFile(jsfile, "module.exports = 2;", (err2) => {
            if (err2) {throw err2}

            setTimeout(() => {
              t.equal(require(jsfile), 2, "should get the fresh exported value")
              t.end()
              cleanTests(key)
            }, 1000) // let watcher clean the cache
          })
        })
      },
      noop
    )
  })

  test.test("keep js cache", (t) => {
    const key = "keepcache"
    const folder = prepareTests(
      key,
      () => {
        const jsfile = `${folder}/src/thing.js`
        fs.writeFile(jsfile, "module.exports = 1;", (err) => {
          if (err) {throw err}

          t.equal(require(`./${relativePath(__dirname, folder)}/src/thing.js`), 1, "should get the exported value")
          fs.writeFile(jsfile, "module.exports = 2;", (err2) => {
            if (err2) {throw err2}

            setTimeout(() => {
              t.equal(require(jsfile), 1, "should not update the cache")
              t.end()
              cleanTests(key)
            }, 1000) // let watcher clean the cache
          })
        })
      },
      noop,
      {
        invalidateCache: false,
      }
    )
  })

  test.end()
})
