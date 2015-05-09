import fs from "fs"
import {relative as relativePath} from "path"
import tape from "tape"

import {
  noop,
  cleanTests,
  prepareTests,
} from "./utils"

tape("metalsmith-watch invalidateCache", (test) => {

  test.test("invalidate js cache", (t) => {
    const key = "cache"
    const folder = prepareTests(
      key,
      () => {
        const jsfile = `${folder}/src/thing.js`
        fs.writeFileSync(jsfile, "module.exports = 1;")
        t.equal(require(jsfile), 1, "should get the direct exported value")

        // let watcher detect change
        setTimeout(() => {
          fs.writeFileSync(jsfile, "module.exports = 2;")

          // let watcher detect change
          setTimeout(() => {
            t.notOk(require.cache[jsfile], "should delete cacheof the changed file")
            t.equal(require(jsfile), 2, "should get the direct fresh exported value")

            t.ok(require.cache[__filename], "should not delete cache outside metalsmith folder")

            t.end()
            cleanTests(key)
          }, 1000)

        }, 1000)
      },
      noop
    )
  })

  test.test("invalidate js cache for deps", (t) => {
    const key = "cache-deps"
    const folder = prepareTests(
      key,
      () => {
        const jsfileRequired = `${folder}/src/required.js`
        fs.writeFileSync(jsfileRequired, "module.exports = function() { return 1 };")

        const jsfileThatRequire = `${folder}/src/req.js`
        fs.writeFileSync(jsfileThatRequire, "module.exports = function() { return require('./required')(); }")

        const jsfileThatRequireToo = `${folder}/src/requireSibling.js`
        fs.writeFileSync(jsfileThatRequireToo, "module.exports = function() { return require('./required')(); }")

        t.equal(require(jsfileThatRequire)(), 1, "should get the exported value")

        // cache things
        require(jsfileThatRequireToo)()
        require(jsfileThatRequire)()

        t.ok(require.cache[jsfileThatRequire], "(cache is ok)")
        t.ok(require.cache[jsfileThatRequireToo], "(cache is ok for sibling)")

        // let watcher detect change
        setTimeout(() => {
          fs.writeFileSync(jsfileRequired, "module.exports = function() { return 2 };")

          // let watcher detect change
          setTimeout(() => {
            t.notOk(require.cache[jsfileThatRequire], "should clean cache for parent")
            t.equal(require(jsfileThatRequire)(), 2, "should get the fresh exported value")

            t.ok(require.cache[jsfileThatRequireToo] === undefined, "should clean cache for all parents")

            t.end()
            cleanTests(key)
          }, 1000)

        }, 1000)
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
        fs.writeFileSync(jsfile, "module.exports = 1;")
        t.equal(require(`./${relativePath(__dirname, folder)}/src/thing.js`), 1, "should get the exported value")
        fs.writeFileSync(jsfile, "module.exports = 2;")
        setTimeout(() => {
          t.equal(require(jsfile), 1, "should not update the cache")
          t.end()
          cleanTests(key)
        }, 1000) // let watcher clean the cache
      },
      noop,
      {
        invalidateCache: false,
      }
    )
  })

  test.end()
})
