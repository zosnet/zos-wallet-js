import {Apis, Manager, ChainConfig} from "zosjs-ws";
import {ChainStore, FetchChain} from "zosjs/es";

// Stores
import iDB from "./idb-instance.js";
import AccountRefsStore from "./AccountRefsStore.js";
import WalletManagerStore from "./WalletManagerStore.js";
import WalletDb from "./WalletDb.js";
import SettingsStore from "./SettingsStore.js";
import AccountStore from "./AccountStore.js";
import PrivateKeyStore from "./PrivateKeyStore.js";

import ls from "./lib/common/localStorage.js";
const STORAGE_KEY = "__graphene__";
const ss = new ls(STORAGE_KEY);
let latencyChecks;
// import counterpart from "counterpart";

ChainStore.setDispatchFrequency(60);

let connect = true;
let connectionManager;
let oldChain = "";

const filterAndSortURLs = (count, latencies, settingsStore) => {
    //SettingsStore.getState().defaults.apiServer  等于 ss.get("apiLatencies", {})
    let urls = settingsStore.defaults.apiServer.filter(a => {
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
            if (
                window.location.protocol === "https:" &&
                a.url.indexOf("ws://") !== -1
            ) {
                return false;
            }
            /* Use all the remaining urls if count = 0 */
            if (!count) return true;

            /* Only keep the nodes we were able to connect to */
            return !!latencies[a.url];
        })
        .sort((a, b) => {
            return latencies[a.url] - latencies[b.url];
        })
        .map(a => a.url);
    return urls;
};

let _connectInProgress = false;
let _connectionCheckPromise = null;
const willTransitionTo = (
    nextState,
    replaceState,
    callback,
    appInit = true,
    errCallback = null
) => {
    // console.log(new Date().getTime(), nextState.location.pathname, "appInit", appInit);
    //appInit is true when called via router onEnter, and false when node is manually selected in access settings

    // Bypass the app init chain for the migration path which is only used at bitshares.org/wallet

    // if (nextState.location.pathname === "/init-error") {
    //     return callback();
    // }
    let g_SettingsStore = SettingsStore.getInstance()

    const apiLatencies = g_SettingsStore.apiLatencies; //ss.get("apiLatencies", {}); (apiLatencies是当前活动节点列表)
    latencyChecks = ss.get("latencyChecks", 1);
    let apiLatenciesCount = Object.keys(apiLatencies).length;
    let connectionStart;

    if (connect) ss.set("latencyChecks", latencyChecks + 1); // Every 15 connect attempts we refresh the api latency list
    if (latencyChecks >= 5) {
        apiLatenciesCount = 0;
        ss.set("latencyChecks", 0);
    }

    let urls = filterAndSortURLs(apiLatenciesCount, apiLatencies, g_SettingsStore);

    /*
    * We use a fake connection url to force a fallback to the best of
    * the pre-defined URLs, ranked by latency
    */
    //ss.settings_v3主要包含:apiServer(当前节点),faucet_address(水龙头地址)
    let connectionString = g_SettingsStore.getSetting("apiServer");  //从ss.settings_v3 中读取apiServer
    if (!connectionString) connectionString = urls[0];
    /* Don't use an insecure websocket url when using secure protocol */
    if (
        window.location.protocol === "https:" &&
        connectionString.indexOf("ws://") !== -1
    ) {
        connectionString = urls[0];
    }
    const autoSelection =
        connectionString.indexOf("fake.automatic-selection") !== -1;   //如果ss.settings_v3.apiServer 包含"fake.automatic-selection",则读取当前可用连接的第一个
    if (autoSelection) {
        connectionString = urls[0];
    }

    var onConnect = () => {
        // console.log(new Date().getTime(), "routerTransition onConnect", caller, "_connectInProgress", _connectInProgress);
        if (_connectInProgress) return callback();
        _connectInProgress = true;
        if (Apis.instance()) {
            let currentUrl = Apis.instance().url;
            g_SettingsStore.onChangeSetting({         //设置 activeNode 为当前url
                setting: "activeNode",
                value: currentUrl
            });
            if (!autoSelection)
                g_SettingsStore.onChangeSetting({     //设置 apiServer 为当前url
                    setting: "apiServer",
                    value: currentUrl
                });
            if (!(currentUrl in apiLatencies)) {   //如果apiLatencies不包含当前url,则增加
                apiLatencies[currentUrl] =
                    new Date().getTime() - connectionStart;
            }
        }
        const currentChain = Apis.instance().chain_id;
        const chainChanged = oldChain !== currentChain;
        oldChain = currentChain;
        var dbPromise = Promise.resolve();
        try {
            if (chainChanged) {         //如果有改变,则重连一次
                iDB.close();
                dbPromise = iDB.init_instance(
                    indexedDB
                ).init_promise;
            }
        } catch (err) {
            console.error("db init error:", err);
            // replaceState("/init-error");            // error-page
            _connectInProgress = false;
            if (errCallback) {
                return errCallback()
            }
            return 
        }

        return Promise.all([dbPromise, g_SettingsStore.init()])       //考虑:将 SettingsStore.settingsAPIs 从包外传入
            .then(() => {
                let chainStoreResetPromise = chainChanged
                    ? ChainStore.resetCache(false)
                    : Promise.resolve();
                return chainStoreResetPromise.then(() => {
                    return Promise.all([
                        PrivateKeyStore.onLoadDbData().then(() => {
                            return AccountRefsStore.loadDbData();
                        }),
                        WalletDb.loadDbData()
                            .then(() => {
                                if (chainChanged) {
                                    // ChainStore.clearCache();
                                    // ChainStore.subscribed = false;
                                    // return ChainStore.resetCache().then(() => {
                                    AccountStore.reset();
                                    return AccountStore.loadDbData(
                                        currentChain
                                    ).catch(err => {
                                        console.error(err);
                                    });
                                    // });
                                }
                            })
                            .catch(error => {
                                console.error(
                                    "----- WalletDb.willTransitionTo error ----->",
                                    error
                                );
                                replaceState("/init-error");
                            }),
                        WalletManagerStore.init()
                    ]).then(() => {
                        _connectInProgress = false;
                        g_SettingsStore.onChangeSetting({         //修改 activeNode
                            setting: "activeNode",
                            value: connectionManager.url
                        });
                        let key = "__graphene__"+AccountStore._getCurrentAccountKey("passwordAccount");
                        let cur_account =  JSON.parse(localStorage.getItem(key));
                        if(cur_account){
                            //向节点订阅 目前登录账户 的信息
                            ChainStore.getAccount(cur_account, true)
                        }
                        //向节点订阅 1.3.0 的资产信息
                        return FetchChain("getObject", '1.3.0').then(coreObject =>{
                            ChainStore.getObject('2.1.0')
                            callback();
                        })
                    });
                });
            })
            .catch(err => {
                console.error(err);
                //replaceState("/init-error");        // error-page
                _connectInProgress = false;
                if (errCallback) {
                    errCallback()
                }
            });
    };

    var onResetError = err => {
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
            errCallback()
        }
        return Apis.close().then(() => {
            return willTransitionTo(nextState, replaceState, callback, true, errCallback);
        });
    };

    connectionManager = new Manager({url: connectionString, urls});
    let connectionCheckPromise = !apiLatenciesCount
        ? _connectionCheckPromise
            ? _connectionCheckPromise
            : connectionManager.checkConnections()
        : null;
    _connectionCheckPromise = connectionCheckPromise;

    //如果apiLatenciesCount大于0,则connectionCheckPromise = null
    Promise.all([connectionCheckPromise])       //开始初始化
        .then(res => {
            _connectionCheckPromise = null;
            if (connectionCheckPromise && res[0]) {
                let [latencies] = res;  //获取返回的可用连接
                urls = filterAndSortURLs(
                    Object.keys(latencies).length,
                    latencies,
                    g_SettingsStore
                );
                connectionManager.url = urls[0];
                connectionManager.urls = urls;
                /* Update the latencies object */
                g_SettingsStore.onUpdateLatencies(latencies);     //ss.set("apiLatencies", latencies); 将可用连接放到localStorage
            }
            // let latencies = ss.get("apiLatencies", {});
            // let connectionStart = new Date().getTime();
            connectionStart = new Date().getTime();

            if (appInit) {
                connectionManager
                    .connectWithFallback(connect)       //开始连接
                    .then(() => {
                        if (!autoSelection)
                            g_SettingsStore.onChangeSetting({     //更新localStorage的settings_v3
                                setting: "apiServer",
                                value: connectionManager.url
                            });

                        onConnect();
                    })
                    .catch(error => {
                        console.error(
                            "----- App.willTransitionTo error ----->",
                            error
                        );
                        if (error.name === "InvalidStateError") {
                            alert(
                                    "Can't access local storage.\nPlease make sure your browser is not in private/incognito mode."
                                );
                        } else {
                            // replaceState("/init-error");    // error-page
                            if (errCallback) {
                                errCallback()
                            }
                        }
                    });
            } else {
                oldChain = "old";
                Apis.reset(connectionManager.url, true).then(instance => {      //重连
                    instance.init_promise.then(onConnect).catch(onResetError);
                });
            }

            /* Only try initialize the API with connect = true on the first onEnter */
            connect = false;
        })
        .catch(err => {
            console.error(err);
            // replaceState("/init-error");  // error-page
            if (errCallback) {
                errCallback()
            }
        });

    // Every 15 connections we check the latencies of the full list of nodes
    if (connect && !apiLatenciesCount && !connectionCheckPromise)   //连接5次后重新刷新所有节点,并返回延迟毫秒数
        connectionManager.checkConnections().then(res => {
            console.log("Connection latencies:", res);
            g_SettingsStore.onUpdateLatencies(res);
        });
};

export default willTransitionTo;
