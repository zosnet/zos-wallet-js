"use strict";

Object.defineProperty(exports, "__esModule", {
    value: true
});

var _createClass = function () { function defineProperties(target, props) { for (var i = 0; i < props.length; i++) { var descriptor = props[i]; descriptor.enumerable = descriptor.enumerable || false; descriptor.configurable = true; if ("value" in descriptor) descriptor.writable = true; Object.defineProperty(target, descriptor.key, descriptor); } } return function (Constructor, protoProps, staticProps) { if (protoProps) defineProperties(Constructor.prototype, protoProps); if (staticProps) defineProperties(Constructor, staticProps); return Constructor; }; }();

var _asset_constants = require("../chain/asset_constants.js");

var _asset_constants2 = _interopRequireDefault(_asset_constants);

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } }

var AssetUtils = function () {
    function AssetUtils() {
        _classCallCheck(this, AssetUtils);
    }

    _createClass(AssetUtils, null, [{
        key: "getFlagBooleans",
        value: function getFlagBooleans(mask) {
            var isBitAsset = arguments.length > 1 && arguments[1] !== undefined ? arguments[1] : false;

            var booleans = {
                charge_market_fee: false,
                white_list: false,
                override_authority: false,
                transfer_restricted: false,
                disable_force_settle: false,
                global_settle: false,
                disable_confidential: false,
                witness_fed_asset: false,
                committee_fed_asset: false
            };

            if (mask === "all") {
                for (var flag in booleans) {
                    if (!isBitAsset && _asset_constants2.default.uia_permission_mask.indexOf(flag) === -1) {
                        delete booleans[flag];
                    } else {
                        booleans[flag] = true;
                    }
                }
                return booleans;
            }

            for (var _flag in booleans) {
                if (!isBitAsset && _asset_constants2.default.uia_permission_mask.indexOf(_flag) === -1) {
                    delete booleans[_flag];
                } else {
                    if (mask & _asset_constants2.default.permission_flags[_flag]) {
                        booleans[_flag] = true;
                    }
                }
            }

            return booleans;
        }
    }, {
        key: "getFlags",
        value: function getFlags(flagBooleans) {
            var keys = Object.keys(_asset_constants2.default.permission_flags);

            var flags = 0;

            keys.forEach(function (key) {
                if (flagBooleans[key] && key !== "global_settle") {
                    flags += _asset_constants2.default.permission_flags[key];
                }
            });

            return flags;
        }
    }, {
        key: "getPermissions",
        value: function getPermissions(flagBooleans) {
            var isBitAsset = arguments.length > 1 && arguments[1] !== undefined ? arguments[1] : false;

            var permissions = isBitAsset ? Object.keys(_asset_constants2.default.permission_flags) : _asset_constants2.default.uia_permission_mask;
            var flags = 0;
            permissions.forEach(function (permission) {
                if (flagBooleans[permission] && permission !== "global_settle") {
                    flags += _asset_constants2.default.permission_flags[permission];
                }
            });

            if (isBitAsset) {
                flags += _asset_constants2.default.permission_flags["global_settle"];
            }

            return flags;
        }
    }, {
        key: "parseDescription",
        value: function parseDescription(description) {
            var parsed = void 0;
            try {
                parsed = JSON.parse(description);
            } catch (error) {}

            return parsed ? parsed : { main: description };
        }
    }]);

    return AssetUtils;
}();

exports.default = AssetUtils;