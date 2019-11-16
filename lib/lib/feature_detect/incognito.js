"use strict";

Object.defineProperty(exports, "__esModule", {
    value: true
});

exports.default = function (cb) {
    var ua = navigator.userAgent.toLowerCase();
    var name = (0, _browser2.default)();
    if (name === "firefox") {
        var db = indexedDB.open("test");
        db.onerror = function () {
            cb(true);
        };
        db.onsuccess = function () {
            cb(false);
        };
    } else if (name === "safari") {
        var storage = window.sessionStorage;
        try {
            storage.setItem("someKeyHere", "test");
            storage.removeItem("someKeyHere");
            cb(false);
        } catch (e) {
            if (e.code === DOMException.QUOTA_EXCEEDED_ERR && storage.length === 0) {
                //Private here
                cb(true);
            } else {
                cb(false);
            }
        }
    } else if (name === "chrome" || name === "opera") {
        var fs = window.RequestFileSystem || window.webkitRequestFileSystem;
        if (!fs) {
            cb(false);
            return;
        }

        fs(window.TEMPORARY, 100, function (fs) {
            // Not incognito mode
            cb(false);
        }, function (err) {
            // Incognito mode
            cb(true);
        });
    } else if (name === "ie") {
        if (!window.indexedDB && (window.PointerEvent || window.MSPointerEvent)) {
            //Privacy Mode
            cb(true);
        } else {
            cb(false);
        }
    }
};

var _browser = require("./browser");

var _browser2 = _interopRequireDefault(_browser);

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }