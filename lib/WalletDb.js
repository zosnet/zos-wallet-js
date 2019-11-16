"use strict";

Object.defineProperty(exports, "__esModule", {
    value: true
});

var _createClass = function () { function defineProperties(target, props) { for (var i = 0; i < props.length; i++) { var descriptor = props[i]; descriptor.enumerable = descriptor.enumerable || false; descriptor.configurable = true; if ("value" in descriptor) descriptor.writable = true; Object.defineProperty(target, descriptor.key, descriptor); } } return function (Constructor, protoProps, staticProps) { if (protoProps) defineProperties(Constructor.prototype, protoProps); if (staticProps) defineProperties(Constructor, staticProps); return Constructor; }; }();
//import TransactionConfirmActions from "actions/TransactionConfirmActions";

//import PrivateKeyActions from "./PrivateKeyActions.js";
//import AccountActions from "./AccountActions.js";

//import AddressIndex from "./AddressIndex.js";


var _idbInstance = require("./idb-instance.js");

var _idbInstance2 = _interopRequireDefault(_idbInstance);

var _idbHelper = require("./idb-helper.js");

var _idbHelper2 = _interopRequireDefault(_idbHelper);

var _lodash = require("lodash");

var _PrivateKeyStore = require("./PrivateKeyStore.js");

var _PrivateKeyStore2 = _interopRequireDefault(_PrivateKeyStore);

var _tcomb_structs = require("./tcomb_structs");

var _WalletUnlockStore = require("./WalletUnlockStore.js");

var _WalletUnlockStore2 = _interopRequireDefault(_WalletUnlockStore);

var _es = require("zosjs/es");

var _zosjsWs = require("zosjs-ws");

var _AccountRefsStore = require("./AccountRefsStore.js");

var _AccountRefsStore2 = _interopRequireDefault(_AccountRefsStore);

var _AccountStore = require("./AccountStore.js");

var _AccountStore2 = _interopRequireDefault(_AccountStore);

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } }

var aes_private = null;
var _passwordKey = null;
// let transaction;
var memo_fixe_private = _es.PrivateKey.fromWif("5K3DH7oDxHe6kKjuNFUHm2qQYuYYLm9ECsmUVm2Bf4cq6Ykr8fz");
var memo_fixe_public = memo_fixe_private.toPublicKey().toString();

var TRACE = false;

var dictJson = void 0,
    AesWorker = void 0;

if (false) {
    AesWorker = require("worker-loader?inline!workers/AesWorker");
    dictJson = require("json-loader!common/dictionary_en.json");
}

/** Represents a single wallet and related indexedDb database operations. */

var WalletDb = function () {
    function WalletDb() {
        _classCallCheck(this, WalletDb);

        console.log("Walletdb constructor");
        this.state = { wallet: null, saving_keys: false
            // Confirm only works when there is a UI (this is for mocha unit tests)
        };this.confirm_transactions = true;
        _es.ChainStore.subscribe(this.checkNextGeneratedKey.bind(this));
        this.generateNextKey_pubcache = [];
        // WalletDb use to be a plan old javascript class (not an Alt store) so
        // for now many methods need to be exported...

        this.generatingKey = false;
    }

    _createClass(WalletDb, [{
        key: "checkNextGeneratedKey",


        /** Discover derived keys that are not in this wallet */
        value: function checkNextGeneratedKey() {
            if (!this.state.wallet) return;
            if (!aes_private) return; // locked
            if (!this.state.wallet.encrypted_brainkey) return; // no brainkey
            if (this.chainstore_account_ids_by_key === _es.ChainStore.account_ids_by_key) return; // no change
            this.chainstore_account_ids_by_key = _es.ChainStore.account_ids_by_key;
            // Helps to ensure we are looking at an un-used key
            try {
                this.generateNextKey(false /*save*/);
            } catch (e) {
                console.error(e);
            }
        }
    }, {
        key: "getWallet",
        value: function getWallet() {
            return this.state.wallet;
        }
    }, {
        key: "onLock",
        value: function onLock() {
            _passwordKey = null;
            aes_private = null;
        }
    }, {
        key: "isLocked",
        value: function isLocked() {
            //两个都空，则为被锁
            return !(!!aes_private || !!_passwordKey);
            //return false;
        }
    }, {
        key: "decryptTcomb_PrivateKey",
        value: function decryptTcomb_PrivateKey(private_key_tcomb) {
            if (!private_key_tcomb) return null;
            if (this.isLocked()) {
                throw new Error("wallet locked");
            }
            if (private_key_tcomb.pubkey === memo_fixe_public) return memo_fixe_private;
            if (_passwordKey && _passwordKey[private_key_tcomb.pubkey]) {
                return _passwordKey[private_key_tcomb.pubkey];
            }
            var private_key_hex = aes_private.decryptHex(private_key_tcomb.encrypted_key);
            return _es.PrivateKey.fromBuffer(new Buffer(private_key_hex, 'hex'));
        }

        /** @return ecc/PrivateKey or null */

    }, {
        key: "getPrivateKey",
        value: function getPrivateKey(public_key) {
            if (_passwordKey) return _passwordKey[public_key];
            if (!public_key) return null;
            if (public_key.Q) public_key = public_key.toPublicKeyString();
            if (public_key === memo_fixe_public) return memo_fixe_private;
            var private_key_tcomb = _PrivateKeyStore2.default.getTcomb_byPubkey(public_key);
            if (!private_key_tcomb) return null;
            return this.decryptTcomb_PrivateKey(private_key_tcomb);
        }
    }, {
        key: "process_transaction",
        value: function process_transaction(tr, signer_pubkeys, broadcast) {
            var _this = this;

            var extra_keys = arguments.length > 3 && arguments[3] !== undefined ? arguments[3] : [];
            var confirm = arguments.length > 4 && arguments[4] !== undefined ? arguments[4] : false;

            return _WalletUnlockStore2.default.onUnlock().then(function () {
                _AccountStore2.default.tryToSetCurrentAccount();
                return Promise.all([tr.set_required_fees(), tr.update_head_block()]).then(function () {

                    var signer_pubkeys_added = {};
                    if (signer_pubkeys) {
                        // Balance claims are by address, only the private
                        // key holder can know about these additional
                        // potential keys.
                        var pubkeys = _PrivateKeyStore2.default.getPubkeys_having_PrivateKey(signer_pubkeys);
                        if (!pubkeys.length) throw new Error("Missing signing key");

                        var _iteratorNormalCompletion = true;
                        var _didIteratorError = false;
                        var _iteratorError = undefined;

                        try {
                            for (var _iterator = pubkeys[Symbol.iterator](), _step; !(_iteratorNormalCompletion = (_step = _iterator.next()).done); _iteratorNormalCompletion = true) {
                                var pubkey_string = _step.value;

                                var private_key = _this.getPrivateKey(pubkey_string);
                                tr.add_signer(private_key, pubkey_string);
                                signer_pubkeys_added[pubkey_string] = true;
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
                    }
                    return tr.get_potential_signatures().then(function (_ref) {
                        var pubkeys = _ref.pubkeys,
                            addys = _ref.addys;

                        var my_pubkeys = _PrivateKeyStore2.default.getPubkeys_having_PrivateKey(pubkeys.concat(extra_keys), addys);

                        //{//Testing only, don't send All public keys!
                        //    let pubkeys_all = PrivateKeyStore.getPubkeys() // All public keys
                        //    tr.get_required_signatures(pubkeys_all).then( required_pubkey_strings =>
                        //        console.log('get_required_signatures all\t',required_pubkey_strings.sort(), pubkeys_all))
                        //    tr.get_required_signatures(my_pubkeys).then( required_pubkey_strings =>
                        //        console.log('get_required_signatures normal\t',required_pubkey_strings.sort(), pubkeys))
                        //}
                        return tr.get_required_signatures(my_pubkeys).then(function (required_pubkeys) {
                            var _iteratorNormalCompletion2 = true;
                            var _didIteratorError2 = false;
                            var _iteratorError2 = undefined;

                            try {
                                for (var _iterator2 = required_pubkeys[Symbol.iterator](), _step2; !(_iteratorNormalCompletion2 = (_step2 = _iterator2.next()).done); _iteratorNormalCompletion2 = true) {
                                    var _pubkey_string = _step2.value;

                                    if (signer_pubkeys_added[_pubkey_string]) continue;
                                    var _private_key = _this.getPrivateKey(_pubkey_string);
                                    if (!_private_key)
                                        // This should not happen, get_required_signatures will only
                                        // returned keys from my_pubkeys
                                        throw new Error("Missing signing key for " + _pubkey_string);
                                    tr.add_signer(_private_key, _pubkey_string);
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
                        });
                    }).then(function () {
                        if (broadcast) {
                            /*    cyj delete 20171101 去掉web的界面刷新
                            if(this.confirm_transactions) {
                                let p = new Promise((resolve, reject) => {
                                    TransactionConfirmActions.confirm(tr, resolve, reject)
                                })
                                return p;
                            }
                            else
                            */
                            if (confirm) {
                                return Promise.resolve(tr);
                            } else {
                                var broadcast_timeout = setTimeout(function () {
                                    Promise.reject("Your transaction has expired without being confirmed, please try again later.");
                                }, 15 * 2000);
                                return tr.broadcast(function () {
                                    //广播成功
                                    console.log("broadcast success");
                                }).then(function (res) {
                                    console.log("tr end Info", res);
                                    clearTimeout(broadcast_timeout);
                                    var tr_res = {};
                                    tr_res['block_num'] = res[0].block_num;
                                    tr_res['trx_num'] = res[0].trx_num;
                                    tr_res['txid'] = tr.id();
                                    tr_res['fee'] = tr.serialize().operations[0][1].fee;
                                    return Promise.resolve(tr_res);
                                }).catch(function (error) {
                                    clearTimeout(broadcast_timeout);
                                    // messages of length 1 are local exceptions (use the 1st line)
                                    // longer messages are remote API exceptions (use the 1st line)
                                    var splitError = error.message.split("\n");
                                    var message = splitError[0]; //报错信息
                                    return Promise.reject(message);
                                });
                            }
                        } else return tr.serialize();
                    });
                });
            }).catch(function (error) {
                console.log(error);
                return Promise.reject(error);
            });
        }
    }, {
        key: "transaction_update",
        value: function transaction_update() {
            var transaction = _idbInstance2.default.instance().db().transaction(["wallet"], "readwrite");
            return transaction;
        }
    }, {
        key: "transaction_update_keys",
        value: function transaction_update_keys() {
            var transaction = _idbInstance2.default.instance().db().transaction(["wallet", "private_keys"], "readwrite");
            return transaction;
        }
    }, {
        key: "getBrainKey",
        value: function getBrainKey() {
            var wallet = this.state.wallet;
            if (!wallet.encrypted_brainkey) throw new Error("missing brainkey");
            if (!aes_private) {
                throw new Error("wallet locked");
            }
            var brainkey_plaintext = aes_private.decryptHexToText(wallet.encrypted_brainkey);
            return brainkey_plaintext;
        }
    }, {
        key: "getBrainKeyPrivate",
        value: function getBrainKeyPrivate() {
            var brainkey_plaintext = arguments.length > 0 && arguments[0] !== undefined ? arguments[0] : this.getBrainKey();

            if (!brainkey_plaintext) throw new Error("missing brainkey");
            return _es.PrivateKey.fromSeed(_es.key.normalize_brainKey(brainkey_plaintext));
        }
    }, {
        key: "onCreateWallet",
        value: function onCreateWallet(password_plaintext, brainkey_plaintext) {
            var _this2 = this;

            var unlock = arguments.length > 2 && arguments[2] !== undefined ? arguments[2] : false;
            var public_name = arguments.length > 3 && arguments[3] !== undefined ? arguments[3] : "default";

            var walletCreateFct = function walletCreateFct(dictionary) {
                //dictionary就是a-z的单词字典
                return new Promise(function (resolve, reject) {
                    if (typeof password_plaintext !== 'string') throw new Error("password string is required");

                    var brainkey_backup_date = void 0;
                    if (brainkey_plaintext) {
                        if (typeof brainkey_plaintext !== "string") throw new Error("Brainkey must be a string");

                        if (brainkey_plaintext.trim() === "") throw new Error("Brainkey can not be an empty string");

                        if (brainkey_plaintext.length < 50) throw new Error("Brainkey must be at least 50 characters long");

                        // The user just provided the Brainkey so this avoids
                        // bugging them to back it up again.
                        brainkey_backup_date = new Date();
                    }
                    var password_aes = _es.Aes.fromSeed(password_plaintext);

                    var encryption_buffer = _es.key.get_random_key().toBuffer();
                    // encryption_key is the global encryption key (does not change even if the passsword changes)
                    var encryption_key = password_aes.encryptToHex(encryption_buffer);
                    // If unlocking, local_aes_private will become the global aes_private object
                    var local_aes_private = _es.Aes.fromSeed(encryption_buffer);

                    if (!brainkey_plaintext) brainkey_plaintext = _es.key.suggest_brain_key(dictionary.en);else brainkey_plaintext = _es.key.normalize_brainKey(brainkey_plaintext);
                    var brainkey_private = _this2.getBrainKeyPrivate(brainkey_plaintext);
                    var brainkey_pubkey = brainkey_private.toPublicKey().toPublicKeyString();
                    var encrypted_brainkey = local_aes_private.encryptToHex(brainkey_plaintext);

                    var password_private = _es.PrivateKey.fromSeed(password_plaintext);
                    var password_pubkey = password_private.toPublicKey().toPublicKeyString();

                    var wallet = {
                        public_name: public_name,
                        password_pubkey: password_pubkey,
                        encryption_key: encryption_key,
                        encrypted_brainkey: encrypted_brainkey,
                        brainkey_pubkey: brainkey_pubkey,
                        brainkey_sequence: 0,
                        brainkey_backup_date: brainkey_backup_date,
                        created: new Date(),
                        last_modified: new Date(),
                        chain_id: _zosjsWs.Apis.instance().chain_id
                    };
                    (0, _tcomb_structs.WalletTcomb)(wallet); // validation
                    var transaction = _this2.transaction_update();
                    var add = _idbHelper2.default.add(transaction.objectStore("wallet"), wallet);
                    var end = _idbHelper2.default.on_transaction_end(transaction).then(function () {
                        _this2.state.wallet = wallet;

                        if (unlock) {
                            aes_private = local_aes_private;
                            _WalletUnlockStore2.default.onUnlock();
                        }
                    });
                    Promise.all([add, end]).then(function () {
                        resolve();
                    }).catch(function (err) {
                        reject(err);
                    });
                });
            };

            if (false) {
                //false
                return walletCreateFct(dictJson);
            } else {
                //let dictionaryPromise = brainkey_plaintext ? null : fetch(`${__BASE_URL__}dictionary.json`);
                var dictionaryPromise = brainkey_plaintext ? null : require("./lib/common/dictionary_en.json");
                return Promise.all([dictionaryPromise]).then(function (res) {
                    return brainkey_plaintext ? walletCreateFct(null) : walletCreateFct(res[0]);
                }).catch(function (err) {
                    console.log("unable to fetch dictionary.json", err);
                    return Promise.reject(err);
                });
            }
        }
    }, {
        key: "generateKeyFromPassword",
        value: function generateKeyFromPassword(accountName, role, password) {
            var seed = accountName + role + password;
            var privKey = _es.PrivateKey.fromSeed(seed);
            var pubKey = privKey.toPublicKey().toString();

            return { privKey: privKey, pubKey: pubKey };
        }

        /** This also serves as 'unlock' */

    }, {
        key: "validatePassword",
        value: function validatePassword(password) {
            var unlock = arguments.length > 1 && arguments[1] !== undefined ? arguments[1] : false;

            var _this3 = this;

            var account = arguments.length > 2 && arguments[2] !== undefined ? arguments[2] : null;
            var roles = arguments.length > 3 && arguments[3] !== undefined ? arguments[3] : ["active", "owner", "memo", "author"];

            if (account) {
                var setKey = function setKey(role, priv, pub) {
                    if (!_passwordKey) _passwordKey = {};
                    _passwordKey[pub] = priv;

                    id++;
                    _PrivateKeyStore2.default.setPasswordLoginKey({
                        pubkey: pub,
                        import_account_names: [account],
                        encrypted_key: null,
                        id: id,
                        brainkey_sequence: null
                    });
                };

                //特殊私钥不能登陆  


                var id = 0;
                if (password === "5K3DH7oDxHe6kKjuNFUHm2qQYuYYLm9ECsmUVm2Bf4cq6Ykr8fz") return false;

                /* Check if the user tried to login with a private key */
                var fromWif = void 0;
                try {
                    fromWif = _es.PrivateKey.fromWif(password);
                } catch (err) {}
                var acc = _es.ChainStore.getAccount(account, false);
                var _key = void 0;
                if (fromWif) {
                    _key = { privKey: fromWif, pubKey: fromWif.toPublicKey().toString() };
                }

                /* Test the pubkey for each role against either the wif key, or the password generated keys */
                roles.forEach(function (role) {
                    if (!fromWif) {
                        _key = _this3.generateKeyFromPassword(account, role, password);
                    }

                    if (acc) {
                        // console.log(role);
                        if (role === "author") {
                            if (acc.getIn(["options", "auth_key"]) === _key.pubKey) {
                                setKey(role, _key.privKey, _key.pubKey);
                            }
                        } else if (role === "memo") {
                            if (acc.getIn(["options", "memo_key"]) === _key.pubKey) {
                                setKey(role, _key.privKey, _key.pubKey);
                            }
                            if (acc.getIn(["options", "auth_key"]) === _key.pubKey) {
                                setKey("author", _key.privKey, _key.pubKey);
                            }
                        } else {
                            var foundRole = false;

                            if (role === "active") {
                                if (acc.getIn(["options", "memo_key"]) === _key.pubKey) {
                                    setKey("memo", _key.privKey, _key.pubKey);
                                }
                                if (acc.getIn(["options", "auth_key"]) === _key.pubKey) {
                                    setKey("author", _key.privKey, _key.pubKey);
                                }
                            }

                            acc.getIn([role, "key_auths"]).forEach(function (auth) {
                                if (auth.get(0) === _key.pubKey) {
                                    setKey(role, _key.privKey, _key.pubKey);
                                    foundRole = true;
                                    return false;
                                }
                            });

                            if (!foundRole) {
                                var alsoCheckRole = role === "active" ? "owner" : "active";
                                acc.getIn([alsoCheckRole, "key_auths"]).forEach(function (auth) {
                                    if (auth.get(0) === _key.pubKey) {
                                        setKey(alsoCheckRole, _key.privKey, _key.pubKey);
                                        foundRole = true;
                                        return false;
                                    }
                                });
                            }
                        }
                    }
                });
                if (!this.isLocked()) {
                    _WalletUnlockStore2.default.onUnlock();
                }
                // console.log('setket', setket)
                // if (setket >0)
                // {
                //     let memo_fixe_private = PrivateKey.fromWif("5K3DH7oDxHe6kKjuNFUHm2qQYuYYLm9ECsmUVm2Bf4cq6Ykr8fz");
                //     let memo_fixe_public = memo_fixe_private.toPublicKey().toString();      
                //     setKey("memo", memo_fixe_private, memo_fixe_public);       
                // }

                return { success: !!_passwordKey, cloudMode: true };
            } else {
                var wallet = this.state.wallet;
                try {
                    var password_private = _es.PrivateKey.fromSeed(password);
                    var password_pubkey = password_private.toPublicKey().toPublicKeyString();
                    if (wallet.password_pubkey !== password_pubkey) return false;
                    if (unlock) {
                        var password_aes = _es.Aes.fromSeed(password);
                        var encryption_plainbuffer = password_aes.decryptHexToBuffer(wallet.encryption_key);
                        aes_private = _es.Aes.fromSeed(encryption_plainbuffer);
                    }
                    return true;
                } catch (e) {
                    console.error(e);
                    return false;
                }
            }
        }

        /** This may lock the wallet unless <b>unlock</b> is used. */

    }, {
        key: "changePassword",
        value: function changePassword(old_password, new_password) {
            var _this4 = this;

            var unlock = arguments.length > 2 && arguments[2] !== undefined ? arguments[2] : false;

            return new Promise(function (resolve) {
                var wallet = _this4.state.wallet;
                if (!_this4.validatePassword(old_password)) throw new Error("wrong password");

                var old_password_aes = _es.Aes.fromSeed(old_password);
                var new_password_aes = _es.Aes.fromSeed(new_password);

                if (!wallet.encryption_key)
                    // This change pre-dates the live chain..
                    throw new Error("This wallet does not support the change password feature.");
                var encryption_plainbuffer = old_password_aes.decryptHexToBuffer(wallet.encryption_key);
                wallet.encryption_key = new_password_aes.encryptToHex(encryption_plainbuffer);

                var new_password_private = _es.PrivateKey.fromSeed(new_password);
                wallet.password_pubkey = new_password_private.toPublicKey().toPublicKeyString();

                if (unlock) {
                    aes_private = _es.Aes.fromSeed(encryption_plainbuffer);
                } else {
                    // new password, make sure the wallet gets locked
                    aes_private = null;
                }
                resolve(_this4.setWalletModified());
            });
        }

        /** @throws "missing brainkey", "wallet locked"
            @return { private_key, sequence }
        */

    }, {
        key: "generateNextKey",
        value: function generateNextKey() {
            var save = arguments.length > 0 && arguments[0] !== undefined ? arguments[0] : true;

            if (this.generatingKey) return;
            this.generatingKey = true;
            var brainkey = this.getBrainKey();
            var wallet = this.state.wallet;
            var sequence = Math.max(wallet.brainkey_sequence, 0);
            var used_sequence = null;
            // Skip ahead in the sequence if any keys are found in use
            // Slowly look ahead (1 new key per block) to keep the wallet fast after unlocking
            this.brainkey_look_ahead = Math.min(10, (this.brainkey_look_ahead || 0) + 1);
            /* If sequence is 0 this is the first lookup, so check at least the first 10 positions */
            var loopMax = !sequence ? Math.max(sequence + this.brainkey_look_ahead, 10) : sequence + this.brainkey_look_ahead;
            // console.log("generateNextKey, save:", save, "sequence:", sequence, "loopMax", loopMax, "brainkey_look_ahead:", this.brainkey_look_ahead);

            for (var i = sequence; i < loopMax; i++) {
                var _private_key2 = _es.key.get_brainPrivateKey(brainkey, i);
                var pubkey = this.generateNextKey_pubcache[i] ? this.generateNextKey_pubcache[i] : this.generateNextKey_pubcache[i] = _private_key2.toPublicKey().toPublicKeyString();
                var next_key = _es.ChainStore.getAccountRefsOfKey(pubkey);
                // TODO if ( next_key === undefined ) return undefined

                /* If next_key exists, it means the generated private key controls an account, so we need to save it */
                if (next_key && next_key.size) {
                    used_sequence = i;
                    console.log("WARN: Private key sequence " + used_sequence + " in-use. " + "I am saving the private key and will go onto the next one.");
                    this.saveKey(_private_key2, used_sequence);
                    // this.brainkey_look_ahead++;
                }
            }
            if (used_sequence !== null) {
                wallet.brainkey_sequence = used_sequence + 1;
                this._updateWallet();
            }
            sequence = Math.max(wallet.brainkey_sequence, 0);
            var private_key = _es.key.get_brainPrivateKey(brainkey, sequence);
            if (save && private_key) {
                // save deterministic private keys ( the user can delete the brainkey )
                // console.log("** saving a key and incrementing brainkey sequence **")
                this.saveKey(private_key, sequence);
                //TODO  .error( error => ErrorStore.onAdd( "wallet", "saveKey", error ))
                this.incrementBrainKeySequence();
            }
            this.generatingKey = false;
            return { private_key: private_key, sequence: sequence };
        }
    }, {
        key: "incrementBrainKeySequence",
        value: function incrementBrainKeySequence(transaction) {
            var wallet = this.state.wallet;
            // increment in RAM so this can't be out-of-sync
            wallet.brainkey_sequence++;
            // update last modified
            return this._updateWallet(transaction);
            //TODO .error( error => ErrorStore.onAdd( "wallet", "incrementBrainKeySequence", error ))
        }
    }, {
        key: "decrementBrainKeySequence",
        value: function decrementBrainKeySequence() {
            var wallet = this.state.wallet;
            // increment in RAM so this can't be out-of-sync
            wallet.brainkey_sequence = Math.max(0, wallet.brainkey_sequence - 1);
            return this._updateWallet();
        }
    }, {
        key: "resetBrainKeySequence",
        value: function resetBrainKeySequence() {
            var wallet = this.state.wallet;
            // increment in RAM so this can't be out-of-sync
            wallet.brainkey_sequence = 0;
            console.log("reset sequence", wallet.brainkey_sequence);
            // update last modified
            return this._updateWallet();
        }

        /* cyj delete 20171024
                //导入秘钥
            importKeysWorker(private_key_objs) {
                return new Promise( (resolve, reject) => {
                    let pubkeys = []
                    for(let private_key_obj of private_key_objs)
                        pubkeys.push( private_key_obj.public_key_string )
                    let addyIndexPromise = AddressIndex.addAll(pubkeys)
        
                    let private_plainhex_array = []
                    for(let private_key_obj of private_key_objs) {
                        private_plainhex_array.push( private_key_obj.private_plainhex );
                    }
                    if (!__ELECTRON__) {
                        AesWorker = require("worker-loader!workers/AesWorker");
                    }
                    let worker = new AesWorker
                    worker.postMessage({
                        private_plainhex_array,
                        key: aes_private.key, iv: aes_private.iv
                    })
                    let _this = this
                    this.setState({ saving_keys: true })
                    worker.onmessage = event => { try {
                        console.log("Preparing for private keys save");
                        let private_cipherhex_array = event.data
                        let enc_private_key_objs = []
                        for(let i = 0; i < private_key_objs.length; i++) {
                            let private_key_obj = private_key_objs[i]
                            let {import_account_names, public_key_string, private_plainhex} = private_key_obj
                            let private_cipherhex = private_cipherhex_array[i]
                            if( ! public_key_string) {
                                // console.log('WARN: public key was not provided, this will incur slow performance')
                                let private_key = PrivateKey.fromHex(private_plainhex)
                                let public_key = private_key.toPublicKey() // S L O W
                                public_key_string = public_key.toPublicKeyString()
                            } else
                                if(public_key_string.indexOf(ChainConfig.address_prefix) != 0)
                                    throw new Error("Public Key should start with " + ChainConfig.address_prefix)
        
                            let private_key_object = {
                                import_account_names,
                                encrypted_key: private_cipherhex,
                                pubkey: public_key_string
                                // null brainkey_sequence
                            }
                            enc_private_key_objs.push(private_key_object)
                        }
                        console.log("Saving private keys", new Date().toString());
                        let transaction = _this.transaction_update_keys()
                        let insertKeysPromise = idb_helper.on_transaction_end(transaction)
                        try {
                            let duplicate_count = PrivateKeyStore
                                .addPrivateKeys_noindex(enc_private_key_objs, transaction )
                            if( private_key_objs.length != duplicate_count )
                                _this.setWalletModified(transaction)
                            _this.setState({saving_keys: false})
                            resolve(Promise.all([ insertKeysPromise, addyIndexPromise ]).then( ()=> {
                                console.log("Done saving keys", new Date().toString())
                                // return { duplicate_count }
                            }))
                        } catch(e) {
                            transaction.abort()
                            console.error(e)
                            reject(e)
                        }
                    } catch( e ) { console.error('AesWorker.encrypt', e) }}
                })
            }
            
        */

    }, {
        key: "saveKeys",
        value: function saveKeys(private_keys, transaction, public_key_string) {
            var promises = [];
            var _iteratorNormalCompletion3 = true;
            var _didIteratorError3 = false;
            var _iteratorError3 = undefined;

            try {
                for (var _iterator3 = private_keys[Symbol.iterator](), _step3; !(_iteratorNormalCompletion3 = (_step3 = _iterator3.next()).done); _iteratorNormalCompletion3 = true) {
                    var private_key_record = _step3.value;

                    promises.push(this.saveKey(private_key_record.private_key, private_key_record.sequence, null, //import_account_names
                    public_key_string, transaction));
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

            return Promise.all(promises);
        }
    }, {
        key: "saveKey",
        value: function saveKey(private_key, brainkey_sequence, import_account_names, public_key_string) {
            var transaction = arguments.length > 4 && arguments[4] !== undefined ? arguments[4] : this.transaction_update_keys();

            var private_cipherhex = aes_private.encryptToHex(private_key.toBuffer());
            var wallet = this.state.wallet;
            if (!public_key_string) {
                //S L O W
                // console.log('WARN: public key was not provided, this may incur slow performance')
                var public_key = private_key.toPublicKey();
                public_key_string = public_key.toPublicKeyString();
            } else if (public_key_string.indexOf(_zosjsWs.ChainConfig.address_prefix) != 0) throw new Error("Public Key should start with " + _zosjsWs.ChainConfig.address_prefix);

            var private_key_object = {
                import_account_names: import_account_names,
                encrypted_key: private_cipherhex,
                pubkey: public_key_string,
                brainkey_sequence: brainkey_sequence
                /* cyj delete 20171024
                let p1 = PrivateKeyActions.addKey(
                    private_key_object, transaction
                ).then((ret)=> {
                    if(TRACE) console.log('... WalletDb.saveKey result',ret.result)
                    return ret
                })
                */

            };var p1 = Promise.all([_PrivateKeyStore2.default.onAddKey({ private_key_object: private_key_object, transaction: transaction }), _AccountRefsStore2.default.onAddPrivateKey({ private_key_object: private_key_object })]).then(function (ret) {
                if (TRACE) console.log('... WalletDb.saveKey result', ret[0].result);
                return ret[0];
            });

            // let p1 = PrivateKeyStore.onAddKey({private_key_object, transaction}).then((ret)=>{
            //         AccountRefsStore.onAddPrivateKey({private_key_object});
            //         return ret[0];
            //     })
            return p1;
        }
    }, {
        key: "setWalletModified",
        value: function setWalletModified(transaction) {
            return this._updateWallet(transaction);
        }
    }, {
        key: "setBackupDate",
        value: function setBackupDate() {
            var wallet = this.state.wallet;
            wallet.backup_date = new Date();
            return this._updateWallet();
        }
    }, {
        key: "setBrainkeyBackupDate",
        value: function setBrainkeyBackupDate() {
            var wallet = this.state.wallet;
            wallet.brainkey_backup_date = new Date();
            return this._updateWallet();
        }

        /** Saves wallet object to disk.  Always updates the last_modified date. */

    }, {
        key: "_updateWallet",
        value: function _updateWallet() {
            var _this5 = this;

            var transaction = arguments.length > 0 && arguments[0] !== undefined ? arguments[0] : this.transaction_update();

            var wallet = this.state.wallet;
            if (!wallet) {
                reject("missing wallet");
                return;
            }
            //DEBUG console.log('... wallet',wallet)
            var wallet_clone = (0, _lodash.cloneDeep)(wallet);
            wallet_clone.last_modified = new Date();

            (0, _tcomb_structs.WalletTcomb)(wallet_clone); // validate

            var wallet_store = transaction.objectStore("wallet");
            var p = _idbHelper2.default.on_request_end(wallet_store.put(wallet_clone));
            var p2 = _idbHelper2.default.on_transaction_end(transaction).then(function () {
                _this5.state.wallet = wallet_clone;
            });
            return Promise.all([p, p2]);
        }

        /** This method may be called again should the main database change */

    }, {
        key: "loadDbData",
        value: function loadDbData() {
            var _this6 = this;

            return _idbHelper2.default.cursor("wallet", function (cursor) {
                if (!cursor) return false;
                var wallet = cursor.value;
                // Convert anything other than a string or number back into its proper type
                wallet.created = new Date(wallet.created);
                wallet.last_modified = new Date(wallet.last_modified);
                wallet.backup_date = wallet.backup_date ? new Date(wallet.backup_date) : null;
                wallet.brainkey_backup_date = wallet.brainkey_backup_date ? new Date(wallet.brainkey_backup_date) : null;
                try {
                    (0, _tcomb_structs.WalletTcomb)(wallet);
                } catch (e) {
                    console.log("WalletDb format error", e);return Promise.reject(new Error("WalletDb format error " + e));
                }
                _this6.state.wallet = wallet;

                return false; //stop iterating
            });
        }
    }], [{
        key: "getInstance",
        value: function getInstance() {
            if (!WalletDb.instance) {
                WalletDb.instance = new WalletDb();
            }
            return WalletDb.instance;
        }
    }]);

    return WalletDb;
}();

var WalletDbIns = WalletDb.getInstance();
exports.default = WalletDbIns;


function reject(error) {
    console.error("----- WalletDb reject error -----", error);
    throw new Error(error);
}