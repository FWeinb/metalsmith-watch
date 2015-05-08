import color from "chalk"
import tinylr from "tiny-lr"

export default function livereloadServer(options, log) {
  if(options === true) {
    options = {port: 35729}
  }
  else if(typeof options === "number") {
    options = {port: options}
  }

  const server = tinylr(options)

  server.on("error", function(err) {
    if(err.code === "EADDRINUSE") {
      log(color.red("Port " + options.port + " is already in use by another process."))
    }
    else {
      log(color.red(err))
    }

    throw err
  })

  server.listen(options.port, function(err) {
    if(err) {
      return log(color.red(err))
    }

    log(`${color.green("✓")} Live reload server started on port: ${color.cyan(options.port)}`)
  })

  return server
}
