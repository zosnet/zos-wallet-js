"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.browser = exports.isIncognito = undefined;

var _incognito = require("./incognito");

var _incognito2 = _interopRequireDefault(_incognito);

var _browser = require("./browser");

var _browser2 = _interopRequireDefault(_browser);

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

exports.isIncognito = _incognito2.default;
exports.browser = _browser2.default;