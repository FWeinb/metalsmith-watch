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
      () => {
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

  test.test("absolute paths", t => {
    const key = "absolute"
    const siblingFolder = `${__dirname}/tmp-${key}/templates`
    prepareTests(
      key,
      () => {
        fs.writeFile(`${siblingFolder}/test`, "test", noopExceptErr)
      },
      () => {
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
