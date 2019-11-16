"use strict";

Object.defineProperty(exports, "__esModule", {
    value: true
});

var _createClass = function () { function defineProperties(target, props) { for (var i = 0; i < props.length; i++) { var descriptor = props[i]; descriptor.enumerable = descriptor.enumerable || false; descriptor.configurable = true; if ("value" in descriptor) descriptor.writable = true; Object.defineProperty(target, descriptor.key, descriptor); } } return function (Constructor, protoProps, staticProps) { if (protoProps) defineProperties(Constructor.prototype, protoProps); if (staticProps) defineProperties(Constructor, staticProps); return Constructor; }; }();
//import AccountActions from "./AccountActions.js";
//import SettingsActions from "actions/SettingsActions";

//import SettingsStore from "stores/SettingsStore";


var _immutable = require("immutable");

var _immutable2 = _interopRequireDefault(_immutable);

var _idbInstance = require("./idb-instance.js");

var _idbInstance2 = _interopRequireDefault(_idbInstance);

var _PrivateKeyStore = require("./PrivateKeyStore.js");

var _PrivateKeyStore2 = _interopRequireDefault(_PrivateKeyStore);

var _es = require("zosjs/es");

var _zosjsWs = require("zosjs-ws");

var _AccountRefsStore = require("./AccountRefsStore.js");

var _AccountRefsStore2 = _interopRequireDefault(_AccountRefsStore);

var _AddressIndex = require("./AddressIndex.js");

var _AddressIndex2 = _interopRequireDefault(_AddressIndex);

var _localStorage = require("./lib/common/localStorage.js");

var _localStorage2 = _interopRequireDefault(_localStorage);

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } }

var accountStorage = (0, _localStorage2.default)("__graphene__");

/**
 *  This Store holds information about accounts in this wallet
 *
 */

var AccountStore = function () {
    function AccountStore() {
        _classCallCheck(this, AccountStore);

        this.state = this._getInitialState();

        /*
                this.bindListeners({
                    onSetCurrentAccount: AccountActions.setCurrentAccount,
                    onCreateAccount: AccountActions.createAccount,
                    onLinkAccount: AccountActions.linkAccount,
                    onUnlinkAccount: AccountActions.unlinkAccount,
                    onAccountSearch: AccountActions.accountSearch,
                    tryToSetCurrentAccount: AccountActions.tryToSetCurrentAccount,
                    onSetPasswordAccount: AccountActions.setPasswordAccount,
                    onChangeSetting: SettingsActions.changeSetting
                });
        */

        this.getMyAccounts = this.getMyAccounts.bind(this);
    }

    _createClass(AccountStore, [{
        key: "_getInitialState",
        value: function _getInitialState() {
            this.account_refs = null;
            this.initial_account_refs_load = true; // true until all undefined accounts are found
            var referralAccount = "";
            /*
            if (window) {
                function getQueryParam(param) {
                    console.log("cyj _getInitialState");
                    console.log(window.location);
                    var result =  window.location.search.match(
                        new RegExp("(\\?|&)" + param + "(\\[\\])?=([^&]*)")
                    );
                     return result ? result[3] : false;
                }
                let validQueries = ["r", "ref", "referrer", "referral"];
                for (let i = 0; i < validQueries.length; i++) {
                    referralAccount = getQueryParam(validQueries[i]);
                    if (referralAccount) break;
                }
            }
            if (referralAccount) {
                accountStorage.set("referralAccount", referralAccount); // Reset to empty string when the user returns with no ref code
            } else {
                accountStorage.remove("referralAccount");
            }
            */

            accountStorage.remove("referralAccount");

            return {
                update: false,
                subbed: false,
                accountsLoaded: false,
                refsLoaded: false,
                currentAccount: null,
                referralAccount: accountStorage.get("referralAccount", ""),
                passwordAccount: accountStorage.get(this._getCurrentAccountKey("passwordAccount"), ""),
                linkedAccounts: _immutable2.default.Set(),
                myIgnoredAccounts: _immutable2.default.Set(),
                unFollowedAccounts: _immutable2.default.Set(accountStorage.get("unfollowed_accounts", [])),
                searchAccounts: _immutable2.default.Map(),
                searchTerm: ""
            };
        }
    }, {
        key: "onSetPasswordAccount",
        value: function onSetPasswordAccount(account) {
            var key = this._getCurrentAccountKey("passwordAccount");
            if (!account) {
                accountStorage.remove(key);
            } else {
                accountStorage.set(key, account);
            }
            this.state.passwordAccount = account;
        }
    }, {
        key: "_addIgnoredAccount",
        value: function _addIgnoredAccount(name) {
            if (this.state.unFollowedAccounts.includes(name) && !this.state.myIgnoredAccounts.has(name)) {
                this.state.myIgnoredAccounts = this.state.myIgnoredAccounts.add(name);
            }
        }
    }, {
        key: "loadDbData",
        value: function loadDbData() {
            var _this = this;

            var linkedAccounts = _immutable2.default.Set().asMutable();
            var chainId = _zosjsWs.Apis.instance().chain_id;

            return new Promise(function (resolve, reject) {
                _idbInstance2.default.load_data("linked_accounts").then(function (data) {
                    var accountPromises = data.filter(function (a) {
                        if (a.chainId) {
                            return a.chainId === chainId;
                        } else {
                            return true;
                        }
                    }).map(function (a) {
                        linkedAccounts.add(a.name);
                        _this._addIgnoredAccount(a.name);
                        return (0, _es.FetchChain)("getAccount", a.name);
                    });

                    /*
                                    this.setState({
                                        linkedAccounts: linkedAccounts.asImmutable(),
                                        accountsLoaded: true
                                    });
                    */
                    _this.state.linkedAccounts = linkedAccounts.asImmutable();
                    _this.state.accountsLoaded = true;
                    Promise.all(accountPromises).then(function () {
                        _es.ChainStore.subscribe(_this.chainStoreUpdate.bind(_this));
                        _this.chainStoreUpdate();

                        _this.state.subbed = true;
                        resolve();
                    }).catch(function (err) {
                        _es.ChainStore.subscribe(_this.chainStoreUpdate.bind(_this));
                        _this.chainStoreUpdate();

                        _this.state.subbed = true;
                        reject(err);
                    });
                }).catch(function (err) {
                    reject(err);
                });
            });
        }
    }, {
        key: "chainStoreUpdate",
        value: function chainStoreUpdate() {
            this.addAccountRefs();
        }

        //将AccountRefsStore.getState().account_refs的账户,导入到this.state.linkedAccounts,并设置当前账号
        //但创建钱包时,AccountRefsStore.account_refs是空集合

    }, {
        key: "addAccountRefs",
        value: function addAccountRefs() {
            var _this2 = this;

            //  Simply add them to the linkedAccounts list (no need to persist them)
            var account_refs = _AccountRefsStore2.default.getState().account_refs;
            if (!this.initial_account_refs_load && this.account_refs === account_refs) {
                return this.state.refsLoaded = true;
            }
            this.account_refs = account_refs;
            var pending = false;
            this.state.linkedAccounts = this.state.linkedAccounts.withMutations(function (linkedAccounts) {
                account_refs.forEach(function (id) {
                    var account = _es.ChainStore.getAccount(id);
                    if (account === undefined) {
                        pending = true;
                        return;
                    }
                    if (account && !_this2.state.unFollowedAccounts.includes(account.get("name"))) {
                        linkedAccounts.add(account.get("name"));
                    } else {
                        _this2._addIgnoredAccount(account.get("name"));
                    }
                });
            });
            // console.log("AccountStore addAccountRefs linkedAccounts",this.state.linkedAccounts.size);
            //this.setState({ linkedAccounts: this.state.linkedAccounts });
            this.state.linkedAccounts = this.state.linkedAccounts;
            this.initial_account_refs_load = pending;
            this.tryToSetCurrentAccount();
        }
    }, {
        key: "getMyAccounts",
        value: function getMyAccounts() {
            if (!this.state.subbed) {
                return [];
            }

            var accounts = [];
            var _iteratorNormalCompletion = true;
            var _didIteratorError = false;
            var _iteratorError = undefined;

            try {
                for (var _iterator = this.state.linkedAccounts[Symbol.iterator](), _step; !(_iteratorNormalCompletion = (_step = _iterator.next()).done); _iteratorNormalCompletion = true) {
                    var account_name = _step.value;

                    var account = _es.ChainStore.getAccount(account_name);
                    if (account === undefined) {
                        // console.log(account_name, "account undefined");
                        continue;
                    }
                    if (account == null) {
                        console.log("WARN: non-chain account name in linkedAccounts", account_name);
                        continue;
                    }
                    var auth = this.getMyAuthorityForAccount(account);

                    if (auth === undefined) {
                        // console.log(account_name, "auth undefined");
                        continue;
                    }

                    if (auth === "full" || auth === "partial") {
                        accounts.push(account_name);
                    }

                    // console.log("account:", account_name, "auth:", auth);
                }
            } catch (err) {
                _didIteratorError = true;
                _iteratorError = err;
            } finally {
                try {
                    if (!_iteratorNormalCompletion && _iterator.return) {
                        _iterator.return();
                    }
                } finally {
                    if (_didIteratorError) {
                        throw _iteratorError;
                    }
                }
            }

            if (this.state.passwordAccount && accounts.indexOf(this.state.passwordAccount) === -1) accounts.push(this.state.passwordAccount);
            // console.log("accounts:", accounts, "linkedAccounts:", this.state.linkedAccounts && this.state.linkedAccounts.toJS());
            return accounts.sort();
        }

        /**
            @todo "partial"
            @return string "none", "full", "partial" or undefined (pending a chain store lookup)
        */

    }, {
        key: "getMyAuthorityForAccount",
        value: function getMyAuthorityForAccount(account) {
            var recursion_count = arguments.length > 1 && arguments[1] !== undefined ? arguments[1] : 1;

            if (!account) return undefined;

            var owner_authority = account.get("owner");
            var active_authority = account.get("active");

            var owner_pubkey_threshold = pubkeyThreshold(owner_authority);
            if (owner_pubkey_threshold == "full") return "full";
            var active_pubkey_threshold = pubkeyThreshold(active_authority);
            if (active_pubkey_threshold == "full") return "full";

            var owner_address_threshold = addressThreshold(owner_authority);
            if (owner_address_threshold == "full") return "full";
            var active_address_threshold = addressThreshold(active_authority);
            if (active_address_threshold == "full") return "full";

            var owner_account_threshold = void 0,
                active_account_threshold = void 0;

            // if (account.get("name") === "secured-x") {
            //     debugger;
            // }
            if (recursion_count < 3) {
                owner_account_threshold = this._accountThreshold(owner_authority, recursion_count);
                if (owner_account_threshold === undefined) return undefined;
                if (owner_account_threshold == "full") return "full";

                active_account_threshold = this._accountThreshold(active_authority, recursion_count);
                if (active_account_threshold === undefined) return undefined;
                if (active_account_threshold == "full") return "full";
            }

            if (owner_pubkey_threshold === "partial" || active_pubkey_threshold === "partial" || owner_address_threshold === "partial" || active_address_threshold === "partial" || owner_account_threshold === "partial" || active_account_threshold === "partial") return "partial";
            return "none";
        }
    }, {
        key: "_accountThreshold",
        value: function _accountThreshold(authority, recursion_count) {
            var _this3 = this;

            var account_auths = authority.get("account_auths");
            if (!account_auths.size) return "none";

            var auths = account_auths.map(function (auth) {
                var account = _es.ChainStore.getAccount(auth.get(0));
                if (account === undefined) return undefined;
                return _this3.getMyAuthorityForAccount(account, ++recursion_count);
            });

            var final = auths.reduce(function (map, auth) {
                return map.set(auth, true);
            }, _immutable2.default.Map());

            return final.get("full") && final.size === 1 ? "full" : final.get("partial") && final.size === 1 ? "partial" : final.get("none") && final.size === 1 ? "none" : final.get("full") || final.get("partial") ? "partial" : undefined;
        }
    }, {
        key: "isMyAccount",
        value: function isMyAccount(account) {
            var authority = this.getMyAuthorityForAccount(account);
            if (authority === undefined) return undefined;
            return authority === "partial" || authority === "full";
        }
    }, {
        key: "onAccountSearch",
        value: function onAccountSearch(payload) {
            var _this4 = this;

            this.state.searchTerm = payload.searchTerm;
            this.state.searchAccounts = this.state.searchAccounts.clear();
            payload.accounts.forEach(function (account) {
                _this4.state.searchAccounts = _this4.state.searchAccounts.withMutations(function (map) {
                    map.set(account[1], account[0]);
                });
            });
        }
    }, {
        key: "_getCurrentAccountKey",
        value: function _getCurrentAccountKey() {
            var key = arguments.length > 0 && arguments[0] !== undefined ? arguments[0] : "currentAccount";

            var chainId = _zosjsWs.Apis.instance().chain_id;
            return key + (chainId ? "_" + chainId.substr(0, 8) : "");
        }
    }, {
        key: "tryToSetCurrentAccount",
        value: function tryToSetCurrentAccount() {
            var passwordAccountKey = this._getCurrentAccountKey("passwordAccount");
            var key = this._getCurrentAccountKey();
            if (accountStorage.has(passwordAccountKey)) {
                var acc = accountStorage.get(passwordAccountKey, null);
                //this.setState({passwordAccount: acc});
                this.state.passwordAccount = acc;
                return this.setCurrentAccount(acc);
            } else if (accountStorage.has(key)) {
                return this.setCurrentAccount(accountStorage.get(key, null));
            }

            //starredAccounts 暂时不用 SettingsStore -- cyj delete 20171024
            /*
                let {starredAccounts} = SettingsStore.getState();
                if (starredAccounts.size) {
                    return this.setCurrentAccount(starredAccounts.first().name);
                }
                */
            if (this.state.linkedAccounts.size) {
                return this.setCurrentAccount(this.state.linkedAccounts.first());
            }
        }
    }, {
        key: "setCurrentAccount",
        value: function setCurrentAccount(name) {
            if (this.state.passwordAccount) name = this.state.passwordAccount;
            var key = this._getCurrentAccountKey();
            if (!name) {
                this.state.currentAccount = null;
            } else {
                this.state.currentAccount = name;
            }

            accountStorage.set(key, this.state.currentAccount);
        }
    }, {
        key: "onSetCurrentAccount",
        value: function onSetCurrentAccount(name) {
            this.setCurrentAccount(name);
        }
    }, {
        key: "onCreateAccount",
        value: function onCreateAccount(name_or_account) {
            var _this5 = this;

            var account = name_or_account;
            if (typeof account === "string") {
                account = {
                    name: account
                };
            }

            if (account["toJS"]) account = account.toJS();

            if (account.name == "" || this.state.linkedAccounts.get(account.name)) return Promise.resolve();

            if (!_es.ChainValidation.is_account_name(account.name)) throw new Error("Invalid account name: " + account.name);

            return _idbInstance2.default.add_to_store("linked_accounts", {
                name: account.name,
                chainId: _zosjsWs.Apis.instance().chain_id
            }).then(function () {
                console.log("[AccountStore.js] ----- Added account to store: ----->", account.name);
                _this5.state.linkedAccounts = _this5.state.linkedAccounts.add(account.name);
                if (_this5.state.linkedAccounts.size === 1) {
                    _this5.setCurrentAccount(account.name);
                }
            });
        }

        /*  cyj delete 20171024 关注其他账号，目前用不到
            onLinkAccount(name) {
                if( ! ChainValidation.is_account_name(name, true))
                    throw new Error("Invalid account name: " + name);
        
                // Link
                iDB.add_to_store("linked_accounts", {
                    name,
                    chainId: Apis.instance().chain_id
                });
                this.state.linkedAccounts = this.state.linkedAccounts.add(name);
        
                // remove from unFollow
                this.state.unFollowedAccounts = this.state.unFollowedAccounts.delete(name);
                this.state.myIgnoredAccounts = this.state.myIgnoredAccounts.delete(name);
                accountStorage.set("unfollowed_accounts", this.state.unFollowedAccounts);
        
                // Update current account if only one account is linked
                if (this.state.linkedAccounts.size === 1) {
                    this.setCurrentAccount(name);
                }
            }
        */

        /*  cyj delete 20171024 取消关注其他账号，目前用不到
            onUnlinkAccount(name) {
                if( ! ChainValidation.is_account_name(name, true))
                    throw new Error("Invalid account name: " + name);
        
                // Unlink
                iDB.remove_from_store("linked_accounts", name);
                this.state.linkedAccounts = this.state.linkedAccounts.delete(name);
        
                // Add to unFollow
                this.state.unFollowedAccounts = this.state.unFollowedAccounts.add(name);
                this._addIgnoredAccount(name);
                // Limit to maxEntries accounts
                let maxEntries = 50;
                if (this.state.unFollowedAccounts.size > maxEntries) {
                    this.state.unFollowedAccounts = this.state.unFollowedAccounts.takeLast(maxEntries);
                }
        
                accountStorage.set("unfollowed_accounts", this.state.unFollowedAccounts);
        
                // Update current account if no accounts are linked
                if (this.state.linkedAccounts.size === 0) {
                    this.setCurrentAccount(null);
                } else {
                    this.setCurrentAccount(this.state.linkedAccounts.first());
                }
            }
        */

    }, {
        key: "checkAccountRefs",
        value: function checkAccountRefs() {
            var _this6 = this;

            //  Simply add them to the linkedAccounts list (no need to persist them)
            var account_refs = _AccountRefsStore2.default.getState().account_refs;

            account_refs.forEach(function (id) {
                var account = _es.ChainStore.getAccount(id);
                if (account === undefined) {
                    return;
                }
                if (account) {
                    _this6._addIgnoredAccount(account.get("name"));
                }
            });
        }
    }, {
        key: "isMyKey",
        value: function isMyKey(key) {
            return _PrivateKeyStore2.default.hasKey(key);
        }
    }, {
        key: "onChangeSetting",
        value: function onChangeSetting(payload) {
            if (payload.setting === "passwordLogin" && payload.value === false) {
                this.onSetPasswordAccount(null);
                accountStorage.remove(this._getCurrentAccountKey());
            }
        }
    }, {
        key: "reset",
        value: function reset() {
            this._getInitialState();
        }
    }], [{
        key: "getInstance",
        value: function getInstance() {
            if (!AccountStore.instance) {
                AccountStore.instance = new AccountStore();
            }
            return AccountStore.instance;
        }
    }]);

    return AccountStore;
}();

var AccountStoreIns = AccountStore.getInstance();
exports.default = AccountStoreIns;

// @return 3 full, 2 partial, 0 none

function pubkeyThreshold(authority) {
    var available = 0;
    var required = authority.get("weight_threshold");
    var key_auths = authority.get("key_auths");
    var _iteratorNormalCompletion2 = true;
    var _didIteratorError2 = false;
    var _iteratorError2 = undefined;

    try {
        for (var _iterator2 = key_auths[Symbol.iterator](), _step2; !(_iteratorNormalCompletion2 = (_step2 = _iterator2.next()).done); _iteratorNormalCompletion2 = true) {
            var k = _step2.value;

            if (_PrivateKeyStore2.default.hasKey(k.get(0))) {
                available += k.get(1);
            }
            if (available >= required) break;
        }
    } catch (err) {
        _didIteratorError2 = true;
        _iteratorError2 = err;
    } finally {
        try {
            if (!_iteratorNormalCompletion2 && _iterator2.return) {
                _iterator2.return();
            }
        } finally {
            if (_didIteratorError2) {
                throw _iteratorError2;
            }
        }
    }

    return available >= required ? "full" : available > 0 ? "partial" : "none";
}

// @return 3 full, 2 partial, 0 none
function addressThreshold(authority) {
    var available = 0;
    var required = authority.get("weight_threshold");
    var address_auths = authority.get("address_auths");
    if (!address_auths.size) return "none";
    var addresses = _AddressIndex2.default.getState().addresses;
    var _iteratorNormalCompletion3 = true;
    var _didIteratorError3 = false;
    var _iteratorError3 = undefined;

    try {
        for (var _iterator3 = address_auths[Symbol.iterator](), _step3; !(_iteratorNormalCompletion3 = (_step3 = _iterator3.next()).done); _iteratorNormalCompletion3 = true) {
            var k = _step3.value;

            var address = k.get(0);
            var pubkey = addresses.get(address);
            if (_PrivateKeyStore2.default.hasKey(pubkey)) {
                available += k.get(1);
            }
            if (available >= required) break;
        }
    } catch (err) {
        _didIteratorError3 = true;
        _iteratorError3 = err;
    } finally {
        try {
            if (!_iteratorNormalCompletion3 && _iterator3.return) {
                _iterator3.return();
            }
        } finally {
            if (_didIteratorError3) {
                throw _iteratorError3;
            }
        }
    }

    return available >= required ? "full" : available > 0 ? "partial" : "none";
}