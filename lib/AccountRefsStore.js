"use strict";

Object.defineProperty(exports, "__esModule", {
    value: true
});

var _createClass = function () { function defineProperties(target, props) { for (var i = 0; i < props.length; i++) { var descriptor = props[i]; descriptor.enumerable = descriptor.enumerable || false; descriptor.configurable = true; if ("value" in descriptor) descriptor.writable = true; Object.defineProperty(target, descriptor.key, descriptor); } } return function (Constructor, protoProps, staticProps) { if (protoProps) defineProperties(Constructor.prototype, protoProps); if (staticProps) defineProperties(Constructor, staticProps); return Constructor; }; }();

var _idbInstance = require("./idb-instance.js");

var _idbInstance2 = _interopRequireDefault(_idbInstance);

var _immutable = require("immutable");

var _immutable2 = _interopRequireDefault(_immutable);

var _es = require("zosjs/es");

var _zosjsWs = require("zosjs-ws");

var _PrivateKeyStore = require("./PrivateKeyStore.js");

var _PrivateKeyStore2 = _interopRequireDefault(_PrivateKeyStore);

var _lodash = require("lodash");

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } }

//import PrivateKeyActions from "actions/PrivateKeyActions";

var AccountRefsStore = function () {
    function AccountRefsStore() {
        _classCallCheck(this, AccountRefsStore);

        this.state = this._getInitialState();
        /* cyj delete 20171023
        this.bindListeners({ onAddPrivateKey: PrivateKeyActions.addKey })
        */
        this.no_account_refs = _immutable2.default.Set(); // Set of account ids
        _es.ChainStore.subscribe(this.chainStoreUpdate.bind(this));
    }

    _createClass(AccountRefsStore, [{
        key: "getState",
        value: function getState() {
            return (0, _lodash.clone)(this.state, false);
        }
    }, {
        key: "_getInitialState",
        value: function _getInitialState() {
            this.chainstore_account_ids_by_key = null;
            return {
                account_refs: _immutable2.default.Set()
                // loading_account_refs: false
            };
        }
    }, {
        key: "onAddPrivateKey",
        value: function onAddPrivateKey(_ref) {
            var private_key_object = _ref.private_key_object;

            if (_es.ChainStore.getAccountRefsOfKey(private_key_object.pubkey) !== undefined) {
                this.chainStoreUpdate();
            }
        }

        //从idb.root里加载key等于no_account_refs_4018d784的值,并将值赋给this.no_account_refs
        //循环PrivateKeyStore.key, 将获取的account_refs赋值给this.account_refs, no_account_refs 赋值给this.no_account_refs,并保存no_account_refs到表里

    }, {
        key: "loadDbData",
        value: function loadDbData() {
            var _this = this;

            // this.setState(this._getInitialState())
            this.chainstore_account_ids_by_key = null;
            this.state = { account_refs: _immutable2.default.Set() };
            return loadNoAccountRefs().then(function (no_account_refs) {
                return _this.no_account_refs = no_account_refs;
            }).then(function () {
                return _this.chainStoreUpdate();
            });
        }
    }, {
        key: "chainStoreUpdate",
        value: function chainStoreUpdate() {
            if (this.chainstore_account_ids_by_key === _es.ChainStore.account_ids_by_key) return;
            this.chainstore_account_ids_by_key = _es.ChainStore.account_ids_by_key;
            this.checkPrivateKeyStore();
        }
    }, {
        key: "checkPrivateKeyStore",
        value: function checkPrivateKeyStore() {
            var no_account_refs = this.no_account_refs;
            var account_refs = _immutable2.default.Set();
            _PrivateKeyStore2.default.getState().keys.keySeq().forEach(function (pubkey) {
                if (no_account_refs.has(pubkey)) return;
                var refs = _es.ChainStore.getAccountRefsOfKey(pubkey);
                if (refs === undefined) return;
                if (!refs.size) {
                    // Performance optimization...
                    // There are no references for this public key, this is going
                    // to block it.  There many be many TITAN keys that do not have
                    // accounts for example.
                    {
                        // Do Not block brainkey generated keys.. Those are new and
                        // account references may be pending.
                        var private_key_object = _PrivateKeyStore2.default.getState().keys.get(pubkey);
                        if (typeof private_key_object.brainkey_sequence === 'number') {
                            return;
                        }
                    }
                    no_account_refs = no_account_refs.add(pubkey);
                    return;
                }
                account_refs = account_refs.add(refs.valueSeq());
            });
            account_refs = account_refs.flatten();
            if (!this.state.account_refs.equals(account_refs)) {
                // console.log("AccountRefsStore account_refs",account_refs.size);
                this.state.account_refs = account_refs;
            }
            if (!this.no_account_refs.equals(no_account_refs)) {
                this.no_account_refs = no_account_refs;
                saveNoAccountRefs(no_account_refs);
            }
        }
    }], [{
        key: "getInstance",
        value: function getInstance() {
            if (!AccountRefsStore.instance) {
                AccountRefsStore.instance = new AccountRefsStore();
            }
            return AccountRefsStore.instance;
        }
    }]);

    return AccountRefsStore;
}();

var AccountRefsStoreIns = AccountRefsStore.getInstance();
exports.default = AccountRefsStoreIns;

/*
*  Performance optimization for large wallets, no_account_refs tracks pubkeys
*  that do not have a corresponding account and excludes them from future api calls
*  to get_account_refs. The arrays are stored in the indexed db, one per chain id
*/

function loadNoAccountRefs() {
    var chain_id = _zosjsWs.Apis.instance().chain_id;
    var refKey = "no_account_refs" + (!!chain_id ? "_" + chain_id.substr(0, 8) : "");
    return _idbInstance2.default.root.getProperty(refKey, []).then(function (array) {
        return _immutable2.default.Set(array);
    });
}

function saveNoAccountRefs(no_account_refs) {
    var array = [];
    var chain_id = _zosjsWs.Apis.instance().chain_id;
    var refKey = "no_account_refs" + (!!chain_id ? "_" + chain_id.substr(0, 8) : "");
    var _iteratorNormalCompletion = true;
    var _didIteratorError = false;
    var _iteratorError = undefined;

    try {
        for (var _iterator = no_account_refs[Symbol.iterator](), _step; !(_iteratorNormalCompletion = (_step = _iterator.next()).done); _iteratorNormalCompletion = true) {
            var pubkey = _step.value;
            array.push(pubkey);
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

    _idbInstance2.default.root.setProperty(refKey, array);
}