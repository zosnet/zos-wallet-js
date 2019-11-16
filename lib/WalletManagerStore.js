"use strict";

Object.defineProperty(exports, "__esModule", {
    value: true
});

var _createClass = function () { function defineProperties(target, props) { for (var i = 0; i < props.length; i++) { var descriptor = props[i]; descriptor.enumerable = descriptor.enumerable || false; descriptor.configurable = true; if ("value" in descriptor) descriptor.writable = true; Object.defineProperty(target, descriptor.key, descriptor); } } return function (Constructor, protoProps, staticProps) { if (protoProps) defineProperties(Constructor.prototype, protoProps); if (staticProps) defineProperties(Constructor, staticProps); return Constructor; }; }();

var _WalletDb = require("./WalletDb.js");

var _WalletDb2 = _interopRequireDefault(_WalletDb);

var _AccountRefsStore = require("./AccountRefsStore.js");

var _AccountRefsStore2 = _interopRequireDefault(_AccountRefsStore);

var _AccountStore = require("./AccountStore.js");

var _AccountStore2 = _interopRequireDefault(_AccountStore);

var _WalletActions = require("./WalletActions.js");

var _WalletActions2 = _interopRequireDefault(_WalletActions);

var _es = require("zosjs/es");

var _idbInstance = require("./idb-instance.js");

var _idbInstance2 = _interopRequireDefault(_idbInstance);

var _immutable = require("immutable");

var _immutable2 = _interopRequireDefault(_immutable);

var _PrivateKeyStore = require("./PrivateKeyStore.js");

var _PrivateKeyStore2 = _interopRequireDefault(_PrivateKeyStore);

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } }

/**  High-level container for managing multiple wallets.
*/
var WalletManagerStore = function () {
    function WalletManagerStore() {
        _classCallCheck(this, WalletManagerStore);

        this.state = this._getInitialState();
        /*
        this.bindListeners({
            onRestore: WalletActions.restore,
            onSetWallet: WalletActions.setWallet,
            onSetBackupDate: WalletActions.setBackupDate,
            onSetBrainkeyBackupDate: WalletActions.setBrainkeyBackupDate
        })
        */
    }

    _createClass(WalletManagerStore, [{
        key: "_getInitialState",
        value: function _getInitialState() {
            return {
                new_wallet: undefined, // pending restore
                current_wallet: undefined,
                wallet_names: _immutable2.default.Set()
            };
        }

        /** This will change the current wallet the newly restored wallet. */

    }, {
        key: "onRestore",
        value: function onRestore(_ref) {
            var _this = this;

            var wallet_name = _ref.wallet_name,
                wallet_object = _ref.wallet_object;

            _idbInstance2.default.restore(wallet_name, wallet_object).then(function () {
                return _this.onSetWallet({ wallet_name: wallet_name });
            }).catch(function (error) {
                console.error(error);
                return Promise.reject(error);
            });
        }

        /** This may result in a new wallet name being added, only in this case
            should a <b>create_wallet_password</b> be provided.
        */

    }, {
        key: "onSetWallet",
        value: function onSetWallet() {
            var wallet_name = arguments.length > 0 && arguments[0] !== undefined ? arguments[0] : "default";

            var _this2 = this;

            var create_wallet_password = arguments[1];
            var brnkey = arguments[2];


            var p = new Promise(function (res) {
                if (/[^a-z0-9_-]/.test(wallet_name) || wallet_name === "") throw new Error("Invalid wallet name");

                if (_this2.state.current_wallet === wallet_name) {
                    res();
                    return;
                }

                var add;
                if (!_this2.state.wallet_names.has(wallet_name)) {
                    var wallet_names = _this2.state.wallet_names.add(wallet_name);
                    add = _idbInstance2.default.root.setProperty("wallet_names", wallet_names);
                    _this2.state.wallet_names = _this2.state.wallet_names;
                }

                var current = _idbInstance2.default.root.setProperty("current_wallet", wallet_name);

                res(Promise.all([add, current]).then(function () {
                    // The database must be closed and re-opened first before the current
                    // application code can initialize its new state.
                    _idbInstance2.default.close();
                    _es.ChainStore.clearCache();
                    // Stores may reset when loadDbData is called

                    return _idbInstance2.default.init_instance().init_promise.then(function () {
                        // Make sure the database is ready when calling CachedPropertyStore.reset()

                        return Promise.all([_WalletDb2.default.loadDbData().then(function () {
                            return _AccountStore2.default.loadDbData();
                        }), _PrivateKeyStore2.default.onLoadDbData().then(function () {
                            return _AccountRefsStore2.default.loadDbData();
                        })]).then(function () {
                            // Update state here again to make sure listeners re-render

                            if (!create_wallet_password) {
                                _this2.state.current_wallet = wallet_name;
                                return;
                            }

                            return _WalletDb2.default.onCreateWallet(create_wallet_password, brnkey, //brainkey,
                            true, //unlock
                            wallet_name).then(function () {
                                return _this2.state.current_wallet = wallet_name;
                            });
                        });
                    });
                }));
            }).catch(function (error) {
                console.log(error);
                return Promise.reject(error);
            });
            return p;
        }

        /** Used by the components during a pending wallet create. */

    }, {
        key: "setNewWallet",
        value: function setNewWallet(new_wallet) {
            this.state.new_wallet = new_wallet;
        }
    }, {
        key: "init",
        value: function init() {
            var _this3 = this;

            return _idbInstance2.default.root.getProperty("current_wallet").then(function (current_wallet) {
                return _idbInstance2.default.root.getProperty("wallet_names", []).then(function (wallet_names) {
                    _this3.state.wallet_names = _immutable2.default.Set(wallet_names);
                    _this3.state.current_wallet = current_wallet;
                });
            });
        }
    }, {
        key: "onDeleteAllWallets",
        value: function onDeleteAllWallets() {
            var _this4 = this;

            var deletes = [];
            this.state.wallet_names.forEach(function (wallet_name) {
                return deletes.push(_this4.onDeleteWallet(wallet_name));
            });
            return Promise.all(deletes);
        }
    }, {
        key: "onDeleteWallet",
        value: function onDeleteWallet(delete_wallet_name) {
            var _this5 = this;

            return new Promise(function (resolve) {
                var _state = _this5.state,
                    current_wallet = _state.current_wallet,
                    wallet_names = _state.wallet_names;

                if (!wallet_names.has(delete_wallet_name)) {
                    throw new Error("Can't delete wallet, does not exist in index");
                }
                wallet_names = wallet_names.delete(delete_wallet_name);
                _idbInstance2.default.root.setProperty("wallet_names", wallet_names);
                if (current_wallet === delete_wallet_name) {
                    current_wallet = wallet_names.size ? wallet_names.first() : undefined;
                    _idbInstance2.default.root.setProperty("current_wallet", current_wallet);
                }
                _this5.state.current_wallet = wallet_names;
                var database_name = _idbInstance2.default.getDatabaseName(delete_wallet_name);
                var req = _idbInstance2.default.impl.deleteDatabase(database_name);
                resolve(database_name);
            });
        }
    }, {
        key: "onSetBackupDate",
        value: function onSetBackupDate() {
            _WalletDb2.default.setBackupDate();
        }
    }, {
        key: "onSetBrainkeyBackupDate",
        value: function onSetBrainkeyBackupDate() {
            _WalletDb2.default.setBrainkeyBackupDate();
        }
    }], [{
        key: "getInstance",
        value: function getInstance() {
            if (!WalletManagerStore.instance) {
                WalletManagerStore.instance = new WalletManagerStore();
            }
            return WalletManagerStore.instance;
        }
    }]);

    return WalletManagerStore;
}();

var WalletManagerStoreWrapped = WalletManagerStore.getInstance();
exports.default = WalletManagerStoreWrapped;