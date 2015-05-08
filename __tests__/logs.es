import fs from "fs"
import tape from "tape"
import chalk from "chalk"

import {
  noopExceptErr,
  prepareTests,
} from "./utils"

tape("metalsmith-watch/logs", t => {
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
        // console.log("## " + log)
        logs.push(chalk.stripColor(log))
      },
    }
  )
})
