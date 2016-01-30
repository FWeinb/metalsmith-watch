import fs from "fs"
import tape from "tape"

import {sync as rm} from "rimraf"
import {sync as mkdirp} from "mkdirp"

import {
  noopExceptErr,
  prepareTests,
} from "./utils"

tape("metalsmith-watch/paths", t => {
  const key = "sibling"
  const siblingFolder = `${__dirname}/tmp-${key}/templates`
  prepareTests(
    key,
    () => {
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
