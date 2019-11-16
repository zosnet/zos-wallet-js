// import WalletUnlockActions from "./WalletUnlockActions.js";
// import SettingsActions from "./SettingsActions.js";
import SettingsStore from "./SettingsStore.js";
import WalletDb from "./WalletDb.js";
import ls from "./lib/common/localStorage.js";

const STORAGE_KEY = "__graphene__";
let ss = new ls(STORAGE_KEY);

class WalletUnlockStore {
    static getInstance() {
        if (!WalletUnlockStore.instance) {
            WalletUnlockStore.instance = new WalletUnlockStore();
        }
        return WalletUnlockStore.instance;
    }

    constructor() {
        // this.bindActions(WalletUnlockActions);
        const storedSettings = ss.get("settings_v3");
        let passwordLogin =
            "passwordLogin" in storedSettings
                ? storedSettings.passwordLogin
                : true;
        this.state = {
            locked: true,  //刷新WalletUnlockModal.jsx界面使用
            passwordLogin: passwordLogin,
        };

        this.walletLockTimeout = this._getTimeout(); // seconds (10 minutes)
        this.timeout = null;
        this.subscribers = new Set();
        this.dispatched = false;
        this.timeout_callback = null

        // this.bindListeners({
        //     onChangeSetting: SettingsActions.changeSetting
        // });
    }

    onUnlock() {
        //DEBUG console.log('... onUnlock setState', WalletDb.isLocked())
        //
        return new Promise((resolve, reject) => {
            this._setLockTimeout();
            if (!WalletDb.isLocked()) {
                this.state.locked = false
                // this.setState({locked: false});
                resolve();
                return;
            }

            // this.setState({resolve, reject, locked: WalletDb.isLocked()});
            // 如果被锁，说明之前没有验证密码
            reject("Please verify the password first.")
        })
        
    }

    onLock() {
        //DEBUG console.log('... WalletUnlockStore\tprogramatic lock', WalletDb.isLocked())
        return new Promise((resolve, reject) => {
            if (WalletDb.isLocked()) {
                resolve();
                return;
            }
            WalletDb.onLock();
            // this.setState({
            //     resolve: null,
            //     reject: null,
            //     locked: WalletDb.isLocked()
            // });
            resolve();
        })
        
    }

    // onCancel() {
    //     this.state.reject({isCanceled: true});
    //     this.setState({resolve: null, reject: null});
    // }

    onChange() {
        this.state.locked = WalletDb.isLocked()
        // this.setState({locked: WalletDb.isLocked()});
    }

    onChangeSetting(payload) {
        if (payload.setting === "walletLockTimeout") {
            this.walletLockTimeout = payload.value;
            this._clearLockTimeout();
            this._setLockTimeout();
        } else if (payload.setting === "passwordLogin") {
            this.state.passwordLogin = payload.value
            // this.setState({
            //     passwordLogin: payload.value
            // });
        }
    }

    _setLockTimeout() {
        this._clearLockTimeout();
        /* If the timeout is different from zero, auto unlock the wallet using a timeout */
        if (!!this.walletLockTimeout) {
            this.timeout = setInterval(() => {
                if (!WalletDb.isLocked()) {
                    console.log(
                        "auto locking after",
                        this.walletLockTimeout,
                        "s"
                    );
                    WalletDb.onLock();
                    this.notifyLockSubscribers();
                    // this.setState({locked: true});
                    this.state.locked =  true
                }
            }, this.walletLockTimeout * 1000);
        }
    }

    _clearLockTimeout() {
        if (this.timeout) {
            clearTimeout(this.timeout);
            this.timeout = null;
        }
    }

    _getTimeout() {
        // return parseInt(ss.get("lockTimeout", 600), 10);
        return 600
    }

    onCheckLock() {
        this.state.locked = WalletDb.isLocked()
        // this.setState({locked: WalletDb.isLocked()});
    }

    //自动锁定时出发
    notifyLockSubscribers() {
        var _this2 = this;

        // Dispatch at most only once every x milliseconds
        if (!this.dispatched) {
            this.dispatched = true;
            this.timeout_callback = setTimeout(function() {
                _this2.dispatched = false;
                _this2.subscribers.forEach(function(callback) {
                    callback();
                });
            }, 100);
        }
    }

    /**
     *  添加事件，在自动锁定时会出发
     */

    subscribe(callback) {
        if (this.subscribers.has(callback))
            return console.error("Subscribe callback already exists", callback);
        this.subscribers.add(callback);
    }

    /**
     *  删除自动锁定时出发的事件
     */

    unsubscribe(callback) {
        if (!this.subscribers.has(callback))
            return console.error(
                "Unsubscribe callback does not exists",
                callback
            );
        this.subscribers.delete(callback);
    }
}

var WalletUnlockStoreIns = WalletUnlockStore.getInstance();
export default WalletUnlockStoreIns;
