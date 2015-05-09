import fs from "fs"

import tape from "tape"
import {sync as rm} from "rimraf"
import {sync as mkdirp} from "mkdirp"

import Metalsmith from "metalsmith"
import watch from "../src"

tape("metalsmith-watch default", t => {
  const key = "default"
  const folder = `${__dirname}/tmp-${key}`
  const metalsmith = new Metalsmith(folder)

  rm(folder)
  mkdirp(`${folder}/src`)
  fs.writeFileSync(`${folder}/src/dummy`, "")

  const plugin = watch()
  plugin.options.log = () => {}
  metalsmith
    .source("./src")
    .use(plugin)
    .build(err => {
      if (err) {throw err}

      t.pass("don't break with no options")
      t.end()
      setTimeout(() => plugin.close(), 1000)
    })
})
