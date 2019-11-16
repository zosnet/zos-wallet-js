"use strict";

var _zosjsWs = require("zosjs-ws");

var _idbInstance = require("./idb-instance.js");

var _idbInstance2 = _interopRequireDefault(_idbInstance);

var _es = require("zosjs/es");

var _WalletManagerStore = require("./WalletManagerStore.js");

var _WalletManagerStore2 = _interopRequireDefault(_WalletManagerStore);

var _WalletActions = require("./WalletActions.js");

var _WalletActions2 = _interopRequireDefault(_WalletActions);

var _AccountStore = require("./AccountStore.js");

var _AccountStore2 = _interopRequireDefault(_AccountStore);

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

var connectionString = "wss://bitshares-api.wancloud.io/ws";
var urls = ["wss://bitshares-api.wancloud.io/ws"];

var connectionManager = new _zosjsWs.Manager({ url: connectionString, urls: urls });

connectionManager.connectWithFallback(true).then(function () {

    _idbInstance2.default.close();

    _idbInstance2.default.init_instance(indexedDB).init_promise.then(function () {
        //cached_properties, linked_accounts, private_keys, wallet
        _WalletManagerStore2.default.init().then(function () {
            _WalletManagerStore2.default.onSetWallet("default2", "cuiyujie123").then(function () {

                console.log("Congratulations, your wallet was successfully created.");

                var accountName = "tmp10084";
                _WalletActions2.default.createAccount(accountName, null, null, 0, null).then(_AccountStore2.default.onCreateAccount(accountName)).then(function () {
                    (0, _es.FetchChain)("getAccount", name).then(function () {
                        console.log("your account was successfully created.");
                    });
                }).catch(function (error) {
                    console.log("ERROR AccountActions.createAccount", error);
                    var error_msg = error.base && error.base.length && error.base.length > 0 ? error.base[0] : "unknown error";
                    if (error.remote_ip) error_msg = error.remote_ip[0];
                });
            }).catch(function (err) {
                console.log("CreateWallet failed:", err);
            });
        });
    });
});