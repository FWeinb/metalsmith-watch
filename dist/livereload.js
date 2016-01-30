"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports["default"] = livereloadServer;

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { "default": obj }; }

var _chalk = require("chalk");

var _chalk2 = _interopRequireDefault(_chalk);

var _tinyLr = require("tiny-lr");

var _tinyLr2 = _interopRequireDefault(_tinyLr);

function livereloadServer(options, log) {
  if (options === true) {
    options = { port: 35729 };
  } else if (typeof options === "number") {
    options = { port: options };
  }

  var server = (0, _tinyLr2["default"])(options);

  server.on("error", function (err) {
    if (err.code === "EADDRINUSE") {
      log(_chalk2["default"].red("Port " + options.port + " is already in use by another process."));
    } else {
      log(_chalk2["default"].red(err));
    }

    throw err;
  });

  server.listen(options.port, function (err) {
    if (err) {
      return log(_chalk2["default"].red(err));
    }

    log(_chalk2["default"].green("✓") + " Live reload server started on port: " + _chalk2["default"].cyan(options.port));
  });

  return server;
}

module.exports = exports["default"];