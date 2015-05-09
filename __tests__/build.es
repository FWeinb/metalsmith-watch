import fs from "fs"
import tape from "tape"

import {
  noopExceptErr,
  prepareTests,
} from "./utils"

tape("metalsmith-watch rebuild", (test) => {

  test.test("track create", (t) => {
    const key = "create"
    const folder = prepareTests(
      key,
      () => fs.writeFile(`${folder}/src/test`, "Test", noopExceptErr),
      (files) => {
        t.ok(files.test, "should pipe a rebuild on file creation")

        setTimeout(() => {
          fs.readFile(`${folder}/build/test`, {encoding: "utf8"}, function(err, data) {
            if (err) {throw err}

            t.equal(
              data,
              "Test",
              "should update build correctly"
            )

            t.end()
          })
        }, 500)
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

  test.end()
})
