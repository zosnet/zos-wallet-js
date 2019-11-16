"use strict";

Object.defineProperty(exports, "__esModule", {
    value: true
});

var _createClass = function () { function defineProperties(target, props) { for (var i = 0; i < props.length; i++) { var descriptor = props[i]; descriptor.enumerable = descriptor.enumerable || false; descriptor.configurable = true; if ("value" in descriptor) descriptor.writable = true; Object.defineProperty(target, descriptor.key, descriptor); } } return function (Constructor, protoProps, staticProps) { if (protoProps) defineProperties(Constructor.prototype, protoProps); if (staticProps) defineProperties(Constructor, staticProps); return Constructor; }; }();

var _idbHelper = require("./idb-helper.js");

var _idbHelper2 = _interopRequireDefault(_idbHelper);

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } }

var DB_VERSION_MAIN = 1;
var DB_PREFIX = "graphene_db";

/** Usage: openIndexDB.then( db => ... */

var iDBRoot = function () {
    function iDBRoot(impl) {
        _classCallCheck(this, iDBRoot);

        this.impl = impl;
    }

    _createClass(iDBRoot, [{
        key: "setDbSuffix",
        value: function setDbSuffix(db_suffix) {
            // "graphene_db_06f667"
            this.database_name = DB_PREFIX + db_suffix;
        }

        /** @return promise */

    }, {
        key: "openIndexedDB",
        value: function openIndexedDB() {
            var _this = this;

            if (this.db) return Promise.resolve(this.db);
            return new Promise(function (resolve, reject) {
                var openRequest = _this.impl.open(_this.database_name, DB_VERSION_MAIN);
                openRequest.onupgradeneeded = function (e) {
                    _this.db = e.target.result;
                    _this.db.createObjectStore("properties", { keyPath: "name" });
                };
                openRequest.onsuccess = function (e) {
                    _this.db = e.target.result;
                    resolve(_this.db);
                };
                openRequest.onerror = function (e) {
                    reject(e.target.error);
                };
            });
        }

        /** @return promise */

    }, {
        key: "getProperty",
        value: function getProperty(name, default_value) {
            return this.openIndexedDB().then(function (db) {
                var transaction = db.transaction(["properties"], "readonly");
                var store = transaction.objectStore("properties");
                return _idbHelper2.default.on_request_end(store.get(name)).then(function (event) {
                    var result = event.target.result;
                    return result ? result.value : default_value;
                });
            }).catch(function (error) {
                console.error(error);throw error;
            });
        }

        /** @return promise */

    }, {
        key: "setProperty",
        value: function setProperty(name, value) {
            return this.openIndexedDB().then(function (db) {
                var transaction = db.transaction(["properties"], "readwrite");
                var store = transaction.objectStore("properties");
                if (value && value["toJS"]) value = value.toJS(); //Immutable-js
                return _idbHelper2.default.on_request_end(store.put({ name: name, value: value }));
            }).catch(function (error) {
                console.error(error);throw error;
            });
        }
    }, {
        key: "deleteDatabase",
        value: function deleteDatabase() {
            var are_you_sure = arguments.length > 0 && arguments[0] !== undefined ? arguments[0] : false;

            if (!are_you_sure) return "Are you sure?";
            console.log("deleting", this.database_name);
            var req = iDB.impl.deleteDatabase(this.database_name);
            return req.result;
        }
    }, {
        key: "close",
        value: function close() {
            this.db.close();
            this.db = null;
        }
    }]);

    return iDBRoot;
}();

exports.default = iDBRoot;