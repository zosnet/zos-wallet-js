"use strict";

Object.defineProperty(exports, "__esModule", {
    value: true
});

var _slicedToArray = function () { function sliceIterator(arr, i) { var _arr = []; var _n = true; var _d = false; var _e = undefined; try { for (var _i = arr[Symbol.iterator](), _s; !(_n = (_s = _i.next()).done); _n = true) { _arr.push(_s.value); if (i && _arr.length === i) break; } } catch (err) { _d = true; _e = err; } finally { try { if (!_n && _i["return"]) _i["return"](); } finally { if (_d) throw _e; } } return _arr; } return function (arr, i) { if (Array.isArray(arr)) { return arr; } else if (Symbol.iterator in Object(arr)) { return sliceIterator(arr, i); } else { throw new TypeError("Invalid attempt to destructure non-iterable instance"); } }; }();

// Stores


var _zosjsWs = require("zosjs-ws");

var _es = require("zosjs/es");

var _idbInstance = require("./idb-instance.js");

var _idbInstance2 = _interopRequireDefault(_idbInstance);

var _AccountRefsStore = require("./AccountRefsStore.js");

var _AccountRefsStore2 = _interopRequireDefault(_AccountRefsStore);

var _WalletManagerStore = require("./WalletManagerStore.js");

var _WalletManagerStore2 = _interopRequireDefault(_WalletManagerStore);

var _WalletDb = require("./WalletDb.js");

var _WalletDb2 = _interopRequireDefault(_WalletDb);

var _SettingsStore = require("./SettingsStore.js");

var _SettingsStore2 = _interopRequireDefault(_SettingsStore);

var _AccountStore = require("./AccountStore.js");

var _AccountStore2 = _interopRequireDefault(_AccountStore);

var _PrivateKeyStore = require("./PrivateKeyStore.js");

var _PrivateKeyStore2 = _interopRequireDefault(_PrivateKeyStore);

var _localStorage = require("./lib/common/localStorage.js");

var _localStorage2 = _interopRequireDefault(_localStorage);

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

var STORAGE_KEY = "__graphene__";
var ss = new _localStorage2.default(STORAGE_KEY);
var latencyChecks = void 0;
// import counterpart from "counterpart";

_es.ChainStore.setDispatchFrequency(60);

var connect = true;
var connectionManager = void 0;
var oldChain = "";

var filterAndSortURLs = function filterAndSortURLs(count, latencies, settingsStore) {
    //SettingsStore.getState().defaults.apiServer  等于 ss.get("apiLatencies", {})
    var urls = settingsStore.defaults.apiServer.filter(function (a) {
        // Skip hidden nodes
        if (a.hidden) return false;
        /*
        * Since we don't want users accidentally connecting to the testnet,
        * we filter out the testnet address from the fallback list
        */
        // if (!__TESTNET__ && a.url.indexOf("testnet") !== -1) return false;
        /* Also remove the automatic fallback dummy url */
        if (a.url.indexOf("fake.automatic-selection") !== -1) return false;
        /* Remove insecure websocket urls when using secure protocol */
        if (window.location.protocol === "https:" && a.url.indexOf("ws://") !== -1) {
            return false;
        }
        /* Use all the remaining urls if count = 0 */
        if (!count) return true;

        /* Only keep the nodes we were able to connect to */
        return !!latencies[a.url];
    }).sort(function (a, b) {
        return latencies[a.url] - latencies[b.url];
    }).map(function (a) {
        return a.url;
    });
    return urls;
};

var _connectInProgress = false;
var _connectionCheckPromise = null;
var willTransitionTo = function willTransitionTo(nextState, replaceState, callback) {
    var appInit = arguments.length > 3 && arguments[3] !== undefined ? arguments[3] : true;
    var errCallback = arguments.length > 4 && arguments[4] !== undefined ? arguments[4] : null;

    // console.log(new Date().getTime(), nextState.location.pathname, "appInit", appInit);
    //appInit is true when called via router onEnter, and false when node is manually selected in access settings

    // Bypass the app init chain for the migration path which is only used at bitshares.org/wallet

    // if (nextState.location.pathname === "/init-error") {
    //     return callback();
    // }
    var g_SettingsStore = _SettingsStore2.default.getInstance();

    var apiLatencies = g_SettingsStore.apiLatencies; //ss.get("apiLatencies", {}); (apiLatencies是当前活动节点列表)
    latencyChecks = ss.get("latencyChecks", 1);
    var apiLatenciesCount = Object.keys(apiLatencies).length;
    var connectionStart = void 0;

    if (connect) ss.set("latencyChecks", latencyChecks + 1); // Every 15 connect attempts we refresh the api latency list
    if (latencyChecks >= 5) {
        apiLatenciesCount = 0;
        ss.set("latencyChecks", 0);
    }

    var urls = filterAndSortURLs(apiLatenciesCount, apiLatencies, g_SettingsStore);

    /*
    * We use a fake connection url to force a fallback to the best of
    * the pre-defined URLs, ranked by latency
    */
    //ss.settings_v3主要包含:apiServer(当前节点),faucet_address(水龙头地址)
    var connectionString = g_SettingsStore.getSetting("apiServer"); //从ss.settings_v3 中读取apiServer
    if (!connectionString) connectionString = urls[0];
    /* Don't use an insecure websocket url when using secure protocol */
    if (window.location.protocol === "https:" && connectionString.indexOf("ws://") !== -1) {
        connectionString = urls[0];
    }
    var autoSelection = connectionString.indexOf("fake.automatic-selection") !== -1; //如果ss.settings_v3.apiServer 包含"fake.automatic-selection",则读取当前可用连接的第一个
    if (autoSelection) {
        connectionString = urls[0];
    }

    var onConnect = function onConnect() {
        // console.log(new Date().getTime(), "routerTransition onConnect", caller, "_connectInProgress", _connectInProgress);
        if (_connectInProgress) return callback();
        _connectInProgress = true;
        if (_zosjsWs.Apis.instance()) {
            var currentUrl = _zosjsWs.Apis.instance().url;
            g_SettingsStore.onChangeSetting({ //设置 activeNode 为当前url
                setting: "activeNode",
                value: currentUrl
            });
            if (!autoSelection) g_SettingsStore.onChangeSetting({ //设置 apiServer 为当前url
                setting: "apiServer",
                value: currentUrl
            });
            if (!(currentUrl in apiLatencies)) {
                //如果apiLatencies不包含当前url,则增加
                apiLatencies[currentUrl] = new Date().getTime() - connectionStart;
            }
        }
        var currentChain = _zosjsWs.Apis.instance().chain_id;
        var chainChanged = oldChain !== currentChain;
        oldChain = currentChain;
        var dbPromise = Promise.resolve();
        try {
            if (chainChanged) {
                //如果有改变,则重连一次
                _idbInstance2.default.close();
                dbPromise = _idbInstance2.default.init_instance(indexedDB).init_promise;
            }
        } catch (err) {
            console.error("db init error:", err);
            // replaceState("/init-error");            // error-page
            _connectInProgress = false;
            if (errCallback) {
                return errCallback();
            }
            return;
        }

        return Promise.all([dbPromise, g_SettingsStore.init()]) //考虑:将 SettingsStore.settingsAPIs 从包外传入
        .then(function () {
            var chainStoreResetPromise = chainChanged ? _es.ChainStore.resetCache(false) : Promise.resolve();
            return chainStoreResetPromise.then(function () {
                return Promise.all([_PrivateKeyStore2.default.onLoadDbData().then(function () {
                    return _AccountRefsStore2.default.loadDbData();
                }), _WalletDb2.default.loadDbData().then(function () {
                    if (chainChanged) {
                        // ChainStore.clearCache();
                        // ChainStore.subscribed = false;
                        // return ChainStore.resetCache().then(() => {
                        _AccountStore2.default.reset();
                        return _AccountStore2.default.loadDbData(currentChain).catch(function (err) {
                            console.error(err);
                        });
                        // });
                    }
                }).catch(function (error) {
                    console.error("----- WalletDb.willTransitionTo error ----->", error);
                    replaceState("/init-error");
                }), _WalletManagerStore2.default.init()]).then(function () {
                    _connectInProgress = false;
                    g_SettingsStore.onChangeSetting({ //修改 activeNode
                        setting: "activeNode",
                        value: connectionManager.url
                    });
                    var key = "__graphene__" + _AccountStore2.default._getCurrentAccountKey("passwordAccount");
                    var cur_account = JSON.parse(localStorage.getItem(key));
                    if (cur_account) {
                        //向节点订阅 目前登录账户 的信息
                        _es.ChainStore.getAccount(cur_account, true);
                    }
                    //向节点订阅 1.3.0 的资产信息
                    return (0, _es.FetchChain)("getObject", '1.3.0').then(function (coreObject) {
                        _es.ChainStore.getObject('2.1.0');
                        callback();
                    });
                });
            });
        }).catch(function (err) {
            console.error(err);
            //replaceState("/init-error");        // error-page
            _connectInProgress = false;
            if (errCallback) {
                errCallback();
            }
        });
    };

    var onResetError = function onResetError(err) {
        console.error("onResetError:", err);
        oldChain = "old";
        connect = true;
        // notify.addNotification({        //连接失败提示
        //     message: counterpart.translate("settings.connection_error", {
        //         url: connectionString
        //     }),
        //     level: "error",
        //     autoDismiss: 10
        // });
        if (errCallback) {
            errCallback();
        }
        return _zosjsWs.Apis.close().then(function () {
            return willTransitionTo(nextState, replaceState, callback, true, errCallback);
        });
    };

    connectionManager = new _zosjsWs.Manager({ url: connectionString, urls: urls });
    var connectionCheckPromise = !apiLatenciesCount ? _connectionCheckPromise ? _connectionCheckPromise : connectionManager.checkConnections() : null;
    _connectionCheckPromise = connectionCheckPromise;

    //如果apiLatenciesCount大于0,则connectionCheckPromise = null
    Promise.all([connectionCheckPromise]) //开始初始化
    .then(function (res) {
        _connectionCheckPromise = null;
        if (connectionCheckPromise && res[0]) {
            var _res = _slicedToArray(res, 1),
                latencies = _res[0]; //获取返回的可用连接


            urls = filterAndSortURLs(Object.keys(latencies).length, latencies, g_SettingsStore);
            connectionManager.url = urls[0];
            connectionManager.urls = urls;
            /* Update the latencies object */
            g_SettingsStore.onUpdateLatencies(latencies); //ss.set("apiLatencies", latencies); 将可用连接放到localStorage
        }
        // let latencies = ss.get("apiLatencies", {});
        // let connectionStart = new Date().getTime();
        connectionStart = new Date().getTime();

        if (appInit) {
            connectionManager.connectWithFallback(connect) //开始连接
            .then(function () {
                if (!autoSelection) g_SettingsStore.onChangeSetting({ //更新localStorage的settings_v3
                    setting: "apiServer",
                    value: connectionManager.url
                });

                onConnect();
            }).catch(function (error) {
                console.error("----- App.willTransitionTo error ----->", error);
                if (error.name === "InvalidStateError") {
                    alert("Can't access local storage.\nPlease make sure your browser is not in private/incognito mode.");
                } else {
                    // replaceState("/init-error");    // error-page
                    if (errCallback) {
                        errCallback();
                    }
                }
            });
        } else {
            oldChain = "old";
            _zosjsWs.Apis.reset(connectionManager.url, true).then(function (instance) {
                //重连
                instance.init_promise.then(onConnect).catch(onResetError);
            });
        }

        /* Only try initialize the API with connect = true on the first onEnter */
        connect = false;
    }).catch(function (err) {
        console.error(err);
        // replaceState("/init-error");  // error-page
        if (errCallback) {
            errCallback();
        }
    });

    // Every 15 connections we check the latencies of the full list of nodes
    if (connect && !apiLatenciesCount && !connectionCheckPromise) //连接5次后重新刷新所有节点,并返回延迟毫秒数
        connectionManager.checkConnections().then(function (res) {
            console.log("Connection latencies:", res);
            g_SettingsStore.onUpdateLatencies(res);
        });
};

exports.default = willTransitionTo;