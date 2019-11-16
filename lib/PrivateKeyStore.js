"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});

var _createClass = function () { function defineProperties(target, props) { for (var i = 0; i < props.length; i++) { var descriptor = props[i]; descriptor.enumerable = descriptor.enumerable || false; descriptor.configurable = true; if ("value" in descriptor) descriptor.writable = true; Object.defineProperty(target, descriptor.key, descriptor); } } return function (Constructor, protoProps, staticProps) { if (protoProps) defineProperties(Constructor.prototype, protoProps); if (staticProps) defineProperties(Constructor, staticProps); return Constructor; }; }();
//import PrivateKeyActions from "./PrivateKeyActions.js";
//import CachedPropertyActions from "./CachedPropertyActions.js";


var _immutable = require("immutable");

var _immutable2 = _interopRequireDefault(_immutable);

var _idbHelper = require("./idb-helper.js");

var _idbHelper2 = _interopRequireDefault(_idbHelper);

var _WalletDb = require("./WalletDb.js");

var _WalletDb2 = _interopRequireDefault(_WalletDb);

var _tcomb_structs = require("./tcomb_structs");

var _AddressIndex = require("./AddressIndex.js");

var _AddressIndex2 = _interopRequireDefault(_AddressIndex);

var _es = require("zosjs/es");

var _lodash = require("lodash");

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } }

/** No need to wait on the promises returned by this store as long as
    this.state.privateKeyStorage_error == false and
    this.state.pending_operation_count == 0 before performing any important
    operations.
*/

var memo_fixe_private = _es.PrivateKey.fromWif("5K3DH7oDxHe6kKjuNFUHm2qQYuYYLm9ECsmUVm2Bf4cq6Ykr8fz");
var memo_fixe_public = memo_fixe_private.toPublicKey().toString();

var PrivateKeyStore = function () {
  function PrivateKeyStore() {
    _classCallCheck(this, PrivateKeyStore);

    this.state = this._getInitialState();
    this.pending_operation_count = 0;
    /* cyj delete 20171023
        this.bindListeners({
            onLoadDbData: PrivateKeyActions.loadDbData,
            onAddKey: PrivateKeyActions.addKey
        });
        */
  }

  _createClass(PrivateKeyStore, [{
    key: "_getInitialState",
    value: function _getInitialState() {
      return {
        keys: _immutable2.default.Map(),
        privateKeyStorage_error: false,
        pending_operation_count: 0,
        privateKeyStorage_error_add_key: null,
        privateKeyStorage_error_loading: null
      };
    }
  }, {
    key: "getState",
    value: function getState() {
      return (0, _lodash.clone)(this.state, false);
    }
  }, {
    key: "setPasswordLoginKey",
    value: function setPasswordLoginKey(key) {
      var keys = this.state.keys.set(key.pubkey, key);

      this.state.keys = keys;
    }

    //将表private_keys的value列的数据中的pubkey存到AddressIndex中.
    /** This method may be called again should the main database change */

  }, {
    key: "onLoadDbData",
    value: function onLoadDbData() {
      var _this = this;

      //resolve is deprecated
      this.pendingOperation();
      this.state = this._getInitialState();
      var keys = _immutable2.default.Map().asMutable();
      var p = _idbHelper2.default.cursor("private_keys", function (cursor) {
        if (!cursor) {
          _this.state.keys = keys.asImmutable();
          return;
        }
        var private_key_tcomb = (0, _tcomb_structs.PrivateKeyTcomb)(cursor.value);
        keys.set(private_key_tcomb.pubkey, private_key_tcomb);
        _AddressIndex2.default.add(private_key_tcomb.pubkey);
        cursor.continue();
      }).then(function () {
        _this.pendingOperationDone();
      }).catch(function (error) {
        _this.state = _this._getInitialState();
        _this.privateKeyStorageError("loading", error);
        throw error;
      });
      return p;
    }
  }, {
    key: "hasKey",
    value: function hasKey(pubkey) {
      return this.state.keys.has(pubkey);
    }
  }, {
    key: "getPubkeys",
    value: function getPubkeys() {
      return this.state.keys.keySeq().toArray();
    }
  }, {
    key: "getPubkeys_having_PrivateKey",
    value: function getPubkeys_having_PrivateKey(pubkeys) {
      var addys = arguments.length > 1 && arguments[1] !== undefined ? arguments[1] : null;

      var return_pubkeys = [];
      if (pubkeys) {
        var _iteratorNormalCompletion = true;
        var _didIteratorError = false;
        var _iteratorError = undefined;

        try {
          for (var _iterator = pubkeys[Symbol.iterator](), _step; !(_iteratorNormalCompletion = (_step = _iterator.next()).done); _iteratorNormalCompletion = true) {
            var pubkey = _step.value;

            if (this.hasKey(pubkey)) {
              return_pubkeys.push(pubkey);
            }
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
      if (addys) {
        var addresses = _AddressIndex2.default.getState().addresses;
        var _iteratorNormalCompletion2 = true;
        var _didIteratorError2 = false;
        var _iteratorError2 = undefined;

        try {
          for (var _iterator2 = addys[Symbol.iterator](), _step2; !(_iteratorNormalCompletion2 = (_step2 = _iterator2.next()).done); _iteratorNormalCompletion2 = true) {
            var addy = _step2.value;

            var _pubkey = addresses.get(addy);
            return_pubkeys.push(_pubkey);
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
      }
      return return_pubkeys;
    }
  }, {
    key: "getTcomb_byPubkey",
    value: function getTcomb_byPubkey(public_key) {
      if (!public_key) return null;
      if (public_key.Q) public_key = public_key.toPublicKeyString();
      if (public_key === memo_fixe_public) return memo_fixe_private;
      return this.state.keys.get(public_key);
    }
  }, {
    key: "onAddKey",
    value: function onAddKey(_ref) {
      var _this2 = this;

      var private_key_object = _ref.private_key_object,
          transaction = _ref.transaction;
      // resolve is deprecated
      if (this.state.keys.has(private_key_object.pubkey)) {
        return { result: "duplicate", id: null };
      }

      this.pendingOperation();
      // console.log("... onAddKey private_key_object.pubkey", private_key_object.pubkey)

      this.state.keys = this.state.keys.set(private_key_object.pubkey, (0, _tcomb_structs.PrivateKeyTcomb)(private_key_object));
      // this.setState({keys: this.state.keys});
      this.state.keys = this.state.keys;
      _AddressIndex2.default.add(private_key_object.pubkey);
      var p = new Promise(function (resolve, reject) {
        (0, _tcomb_structs.PrivateKeyTcomb)(private_key_object);
        var duplicate = false;
        var p = _idbHelper2.default.add(transaction.objectStore("private_keys"), private_key_object);

        p.catch(function (event) {
          // ignore_duplicates
          var error = event.target.error;
          console.log("... error", error, event);
          if (error.name != "ConstraintError" || error.message.indexOf("by_encrypted_key") == -1) {
            _this2.privateKeyStorageError("add_key", error);
            throw event;
          }
          duplicate = true;
          event.preventDefault();
        }).then(function () {
          _this2.pendingOperationDone();
          if (duplicate) return { result: "duplicate", id: null };
          if (private_key_object.brainkey_sequence == null) _this2.binaryBackupRecommended(); // non-deterministic
          _idbHelper2.default.on_transaction_end(transaction).then(function () {
            _this2.state.keys = _this2.state.keys;
          });
          return {
            result: "added",
            id: private_key_object.id
          };
        });
        resolve(p);
      });
      return p;
    }

    /** WARN: does not update AddressIndex.  This is designed for bulk importing.
          @return duplicate_count
      */

  }, {
    key: "addPrivateKeys_noindex",
    value: function addPrivateKeys_noindex(private_key_objects, transaction) {
      var _this3 = this;

      var store = transaction.objectStore("private_keys");
      var duplicate_count = 0;
      var keys = this.state.keys.withMutations(function (keys) {
        var _iteratorNormalCompletion3 = true;
        var _didIteratorError3 = false;
        var _iteratorError3 = undefined;

        try {
          for (var _iterator3 = private_key_objects[Symbol.iterator](), _step3; !(_iteratorNormalCompletion3 = (_step3 = _iterator3.next()).done); _iteratorNormalCompletion3 = true) {
            var private_key_object = _step3.value;

            if (_this3.state.keys.has(private_key_object.pubkey)) {
              duplicate_count++;
              continue;
            }
            var private_tcomb = (0, _tcomb_structs.PrivateKeyTcomb)(private_key_object);
            store.add(private_key_object);
            keys.set(private_key_object.pubkey, private_tcomb);
            _es.ChainStore.getAccountRefsOfKey(private_key_object.pubkey);
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
      });

      this.state.keys = keys;
      this.binaryBackupRecommended();
      return duplicate_count;
    }

    //脑钥备份 cyj delete 暂时用不到
    /*
      binaryBackupRecommended() {
          CachedPropertyActions.set("backup_recommended", true);
      }
    */

  }, {
    key: "pendingOperation",
    value: function pendingOperation() {
      this.pending_operation_count++;
      this.state.pending_operation_count = this.pending_operation_count;
    }
  }, {
    key: "pendingOperationDone",
    value: function pendingOperationDone() {
      if (this.pending_operation_count == 0) throw new Error("Pending operation done called too many times");
      this.pending_operation_count--;
      this.state.pending_operation_count = this.pending_operation_count;
    }
  }, {
    key: "privateKeyStorageError",
    value: function privateKeyStorageError(property, error) {
      this.pendingOperationDone();
      var state = { privateKeyStorage_error: true };
      state["privateKeyStorage_error_" + property] = error;
      console.error("privateKeyStorage_error_" + property, error);
      this.state = state;
    }
  }, {
    key: "stringToByte",
    value: function stringToByte(strsend) {
      if (strsend.length <= 0) return "";
      var str = new String(strsend);
      var bytes = new Array();
      var len, c;
      len = str.length;
      for (var i = 0; i < len; i++) {
        c = str.charCodeAt(i);
        if (c >= 0x010000 && c <= 0x10FFFF) {
          bytes.push(c >> 18 & 0x07 | 0xF0);
          bytes.push(c >> 12 & 0x3F | 0x80);
          bytes.push(c >> 6 & 0x3F | 0x80);
          bytes.push(c & 0x3F | 0x80);
        } else if (c >= 0x000800 && c <= 0x00FFFF) {
          bytes.push(c >> 12 & 0x0F | 0xE0);
          bytes.push(c >> 6 & 0x3F | 0x80);
          bytes.push(c & 0x3F | 0x80);
        } else if (c >= 0x000080 && c <= 0x0007FF) {
          bytes.push(c >> 6 & 0x1F | 0xC0);
          bytes.push(c & 0x3F | 0x80);
        } else {
          bytes.push(c & 0xFF);
        }
      }
      var ret = '';
      for (var ii = 0; ii < bytes.length; ii++) {
        ret += Number(bytes[ii]).toString(16);
      }
      // console.log(ret)
      return ret;
    }
  }, {
    key: "byteToString",
    value: function byteToString(arr) {
      if (arr.length <= 0) return "";
      var _arr = new Array();;
      for (var l = 0; l < arr.length; l += 2) {
        var hex = arr[l] + arr[l + 1];
        var val = parseInt(hex, 16);
        _arr.push(val);
      }

      var str = '';
      for (var i = 0; i < _arr.length; i++) {
        var one = _arr[i].toString(2);
        var v = one.match(/^1+?(?=0)/);
        if (v && one.length === 8) {
          var bytesLength = v[0].length;
          var store = _arr[i].toString(2).slice(7 - bytesLength);
          for (var st = 1; st < bytesLength; st++) {
            store += _arr[st + i].toString(2).slice(2);
          }
          str += String.fromCharCode(parseInt(store, 2));
          i += bytesLength - 1;
        } else {
          str += String.fromCharCode(_arr[i]);
        }
      }
      return str;
    }
  }, {
    key: "decodeMemo_noenc",
    value: function decodeMemo_noenc(memo) {
      var memo_text = '';
      var isMine = false;
      try {
        memo_text = this.byteToString(memo.message);
      } catch (e) {
        console.log('account memo exception ...', e);
        memo_text = '**';
        isMine = true;
      }
      return {
        text: memo_text,
        isMine: isMine
      };
    }
  }, {
    key: "decodeMemo",
    value: function decodeMemo(memo) {
      if (memo.nonce === '34359738367') {
        return this.decodeMemo_noenc(memo.message);
      }
      var lockedWallet = false;
      var memo_text = '';
      var isMine = false;
      var from_private_key = this.state.keys.get(memo.from);
      var to_private_key = this.state.keys.get(memo.to);
      var private_key = from_private_key ? from_private_key : to_private_key;
      var public_key = from_private_key ? memo.to : memo.from;
      public_key = _es.PublicKey.fromPublicKeyString(public_key);

      try {
        private_key = _WalletDb2.default.decryptTcomb_PrivateKey(private_key);
      } catch (e) {
        // Failed because wallet is locked
        lockedWallet = true;
        private_key = null;
        isMine = true;
      }

      if (private_key) {
        var tryLegacy = false;
        try {
          memo_text = private_key ? _es.Aes.decrypt_with_checksum(private_key, public_key, memo.nonce, memo.message).toString('utf-8') : null;

          if (private_key && !memo_text) {
            // debugger
          }
        } catch (e) {
          console.log('account memo exception ...', e);
          memo_text = '*';
          tryLegacy = true;
        }

        // Apply legacy method if new, correct method fails to decode
        if (private_key && tryLegacy) {
          // debugger;
          try {
            memo_text = _es.Aes.decrypt_with_checksum(private_key, public_key, memo.nonce, memo.message, true).toString('utf-8');
          } catch (e) {
            console.log('account memo exception ...', e);
            memo_text = '**';
          }
        }
      }
      return {
        text: memo_text,
        isMine: isMine
      };
    }
  }], [{
    key: "getInstance",
    value: function getInstance() {
      if (!PrivateKeyStore.instance) {
        PrivateKeyStore.instance = new PrivateKeyStore();
      }
      return PrivateKeyStore.instance;
    }
  }]);

  return PrivateKeyStore;
}();

var PrivateKeyStoreIns = PrivateKeyStore.getInstance();
exports.default = PrivateKeyStoreIns;