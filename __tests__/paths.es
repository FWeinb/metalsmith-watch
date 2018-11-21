import fs from "fs"
import tape from "tape"

import {sync as rm} from "rimraf"
import {sync as mkdirp} from "mkdirp"

import {
  noopExceptErr,
  prepareTests,
} from "./utils"

tape("metalsmith-watch/paths", test => {
  test.test("relative source root", t => {
    const key = "relative"
    const siblingFolder = `${__dirname}/tmp-${key}/templates`
    prepareTests(
      key,
      () => {
        fs.writeFile(`${siblingFolder}/test`, "test", noopExceptErr)
      },
      files => {
        t.deepEqual(Object.keys(files), ["dummy"], "should rebuild the expected files list")
        t.pass("should rebuild if a mapped item get updated")
        t.end()
      },
      {
        paths: {
          "${source}/**/*": true,
          "templates/**/*": "**/*",
        },
      },
      () => {
        rm(siblingFolder)
        mkdirp(siblingFolder)
        // watcher don't really like empty folder...
        fs.writeFileSync(`${siblingFolder}/dummy`, "")
      }
    )
  })

  test.test("relative from changed file", t => {
    const key = "relativedir"
    const siblingFolder = `${__dirname}/tmp-${key}/src/foo/bar`
    prepareTests(
      key,
      () => {
        fs.writeFileSync(`${siblingFolder}/test`, "")
      },
      files => {
        t.deepEqual(Object.keys(files).sort(), ["foo/bar/dummy", "foo/bar/test"], "should rebuild the expected files list")
        t.pass("should rebuild if a mapped item get updated")
        t.end()
      },
      {
        paths: {
          "${source}/**/*": true,
          "${source}/**/*": "${dirname}/*",
        },
      },
      () => {
        rm(siblingFolder)
        mkdirp(siblingFolder)
        // watcher don't really like empty folder...
        fs.writeFileSync(`${siblingFolder}/dummy`, "")
      }
    )
  })

  test.test("absolute paths", t => {
    const key = "absolute"
    const siblingFolder = `${__dirname}/tmp-${key}/templates`
    prepareTests(
      key,
      () => {
        fs.writeFile(`${siblingFolder}/test`, "test", noopExceptErr)
      },
      files => {
        t.deepEqual(Object.keys(files), ["templates/test"], "should rebuild the expected files list")
        t.pass("should rebuild if a mapped item get updated")
        t.end()
      },
      {
        paths: {
          "${source}/**/*": true,
        },
      },
      () => {
        rm(siblingFolder)
        mkdirp(siblingFolder)
        // watcher don't really like empty folder...
        fs.writeFileSync(`${siblingFolder}/dummy`, "")
      },
      //use absolute source path
      `${__dirname}/tmp-${key}`
    )
  })
})
