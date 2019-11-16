"use strict";

Object.defineProperty(exports, "__esModule", {
    value: true
});

var _createClass = function () { function defineProperties(target, props) { for (var i = 0; i < props.length; i++) { var descriptor = props[i]; descriptor.enumerable = descriptor.enumerable || false; descriptor.configurable = true; if ("value" in descriptor) descriptor.writable = true; Object.defineProperty(target, descriptor.key, descriptor); } } return function (Constructor, protoProps, staticProps) { if (protoProps) defineProperties(Constructor.prototype, protoProps); if (staticProps) defineProperties(Constructor, staticProps); return Constructor; }; }(); // import WalletUnlockActions from "./WalletUnlockActions.js";
// import SettingsActions from "./SettingsActions.js";


var _SettingsStore = require("./SettingsStore.js");

var _SettingsStore2 = _interopRequireDefault(_SettingsStore);

var _WalletDb = require("./WalletDb.js");

var _WalletDb2 = _interopRequireDefault(_WalletDb);

var _localStorage = require("./lib/common/localStorage.js");

var _localStorage2 = _interopRequireDefault(_localStorage);

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } }

var STORAGE_KEY = "__graphene__";
var ss = new _localStorage2.default(STORAGE_KEY);

var WalletUnlockStore = function () {
    _createClass(WalletUnlockStore, null, [{
        key: "getInstance",
        value: function getInstance() {
            if (!WalletUnlockStore.instance) {
                WalletUnlockStore.instance = new WalletUnlockStore();
            }
            return WalletUnlockStore.instance;
        }
    }]);

    function WalletUnlockStore() {
        _classCallCheck(this, WalletUnlockStore);

        // this.bindActions(WalletUnlockActions);
        var storedSettings = ss.get("settings_v3");
        var passwordLogin = "passwordLogin" in storedSettings ? storedSettings.passwordLogin : true;
        this.state = {
            locked: true, //刷新WalletUnlockModal.jsx界面使用
            passwordLogin: passwordLogin
        };

        this.walletLockTimeout = this._getTimeout(); // seconds (10 minutes)
        this.timeout = null;
        this.subscribers = new Set();
        this.dispatched = false;
        this.timeout_callback = null;

        // this.bindListeners({
        //     onChangeSetting: SettingsActions.changeSetting
        // });
    }

    _createClass(WalletUnlockStore, [{
        key: "onUnlock",
        value: function onUnlock() {
            var _this = this;

            //DEBUG console.log('... onUnlock setState', WalletDb.isLocked())
            //
            return new Promise(function (resolve, reject) {
                _this._setLockTimeout();
                if (!_WalletDb2.default.isLocked()) {
                    _this.state.locked = false;
                    // this.setState({locked: false});
                    resolve();
                    return;
                }

                // this.setState({resolve, reject, locked: WalletDb.isLocked()});
                // 如果被锁，说明之前没有验证密码
                reject("Please verify the password first.");
            });
        }
    }, {
        key: "onLock",
        value: function onLock() {
            //DEBUG console.log('... WalletUnlockStore\tprogramatic lock', WalletDb.isLocked())
            return new Promise(function (resolve, reject) {
                if (_WalletDb2.default.isLocked()) {
                    resolve();
                    return;
                }
                _WalletDb2.default.onLock();
                // this.setState({
                //     resolve: null,
                //     reject: null,
                //     locked: WalletDb.isLocked()
                // });
                resolve();
            });
        }

        // onCancel() {
        //     this.state.reject({isCanceled: true});
        //     this.setState({resolve: null, reject: null});
        // }

    }, {
        key: "onChange",
        value: function onChange() {
            this.state.locked = _WalletDb2.default.isLocked();
            // this.setState({locked: WalletDb.isLocked()});
        }
    }, {
        key: "onChangeSetting",
        value: function onChangeSetting(payload) {
            if (payload.setting === "walletLockTimeout") {
                this.walletLockTimeout = payload.value;
                this._clearLockTimeout();
                this._setLockTimeout();
            } else if (payload.setting === "passwordLogin") {
                this.state.passwordLogin = payload.value;
                // this.setState({
                //     passwordLogin: payload.value
                // });
            }
        }
    }, {
        key: "_setLockTimeout",
        value: function _setLockTimeout() {
            var _this3 = this;

            this._clearLockTimeout();
            /* If the timeout is different from zero, auto unlock the wallet using a timeout */
            if (!!this.walletLockTimeout) {
                this.timeout = setInterval(function () {
                    if (!_WalletDb2.default.isLocked()) {
                        console.log("auto locking after", _this3.walletLockTimeout, "s");
                        _WalletDb2.default.onLock();
                        _this3.notifyLockSubscribers();
                        // this.setState({locked: true});
                        _this3.state.locked = true;
                    }
                }, this.walletLockTimeout * 1000);
            }
        }
    }, {
        key: "_clearLockTimeout",
        value: function _clearLockTimeout() {
            if (this.timeout) {
                clearTimeout(this.timeout);
                this.timeout = null;
            }
        }
    }, {
        key: "_getTimeout",
        value: function _getTimeout() {
            // return parseInt(ss.get("lockTimeout", 600), 10);
            return 600;
        }
    }, {
        key: "onCheckLock",
        value: function onCheckLock() {
            this.state.locked = _WalletDb2.default.isLocked();
            // this.setState({locked: WalletDb.isLocked()});
        }

        //自动锁定时出发

    }, {
        key: "notifyLockSubscribers",
        value: function notifyLockSubscribers() {
            var _this2 = this;

            // Dispatch at most only once every x milliseconds
            if (!this.dispatched) {
                this.dispatched = true;
                this.timeout_callback = setTimeout(function () {
                    _this2.dispatched = false;
                    _this2.subscribers.forEach(function (callback) {
                        callback();
                    });
                }, 100);
            }
        }

        /**
         *  添加事件，在自动锁定时会出发
         */

    }, {
        key: "subscribe",
        value: function subscribe(callback) {
            if (this.subscribers.has(callback)) return console.error("Subscribe callback already exists", callback);
            this.subscribers.add(callback);
        }

        /**
         *  删除自动锁定时出发的事件
         */

    }, {
        key: "unsubscribe",
        value: function unsubscribe(callback) {
            if (!this.subscribers.has(callback)) return console.error("Unsubscribe callback does not exists", callback);
            this.subscribers.delete(callback);
        }
    }]);

    return WalletUnlockStore;
}();

var WalletUnlockStoreIns = WalletUnlockStore.getInstance();
exports.default = WalletUnlockStoreIns;