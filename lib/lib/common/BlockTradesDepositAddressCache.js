"use strict";

Object.defineProperty(exports, "__esModule", {
    value: true
});

var _createClass = function () { function defineProperties(target, props) { for (var i = 0; i < props.length; i++) { var descriptor = props[i]; descriptor.enumerable = descriptor.enumerable || false; descriptor.configurable = true; if ("value" in descriptor) descriptor.writable = true; Object.defineProperty(target, descriptor.key, descriptor); } } return function (Constructor, protoProps, staticProps) { if (protoProps) defineProperties(Constructor.prototype, protoProps); if (staticProps) defineProperties(Constructor, staticProps); return Constructor; }; }();

var _WalletDb = require("../WalletDb.js");

var _WalletDb2 = _interopRequireDefault(_WalletDb);

var _localStorage = require("./localStorage.js");

var _localStorage2 = _interopRequireDefault(_localStorage);

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } }

var ss = new _localStorage2.default("__bts__");

var BlockTradesDepositAddressCache = function () {
    function BlockTradesDepositAddressCache() {
        _classCallCheck(this, BlockTradesDepositAddressCache);

        // increment this to force generating new addresses for all mappings
        this.current_blocktrades_address_cache_version_string = "2";

        //let wallet = WalletDb.getWallet();
        //delete wallet.deposit_keys["blocktrades"];
        //delete wallet.deposit_keys["openledger"];
        //WalletDb._updateWallet();
    }

    _createClass(BlockTradesDepositAddressCache, [{
        key: "getIndexForDepositKeyInExchange",
        value: function getIndexForDepositKeyInExchange(account_name, input_coin_type, output_coin_type) {
            var args = [this.current_blocktrades_address_cache_version_string, account_name, input_coin_type, output_coin_type];
            return args.reduce(function (previous, current) {
                return previous.concat("[", current, "]");
            }, "");
        }

        // returns {"address": address, "memo": memo}, with a null memo if not applicable

    }, {
        key: "getCachedInputAddress",
        value: function getCachedInputAddress(exchange_name, account_name, input_coin_type, output_coin_type) {
            var wallet = _WalletDb2.default.getWallet();
            wallet = null;

            var index = this.getIndexForDepositKeyInExchange(account_name, input_coin_type, output_coin_type);
            if (!wallet) {
                var deposit_keys = ss.get("deposit_keys", {});
                deposit_keys[exchange_name] = deposit_keys[exchange_name] || {};
                deposit_keys[exchange_name][index] = deposit_keys[exchange_name][index] || [];
                var number_of_keys = deposit_keys[exchange_name][index].length;
                if (number_of_keys) return deposit_keys[exchange_name][index][number_of_keys - 1];
                return null;
            } else {
                wallet.deposit_keys = wallet.deposit_keys || {};
                wallet.deposit_keys[exchange_name] = wallet.deposit_keys[exchange_name] || {};
                wallet.deposit_keys[exchange_name][index] = wallet.deposit_keys[exchange_name][index] || [];

                var _number_of_keys = wallet.deposit_keys[exchange_name][index].length;
                if (_number_of_keys) return wallet.deposit_keys[exchange_name][index][_number_of_keys - 1];
                return null;
            }
        }
    }, {
        key: "cacheInputAddress",
        value: function cacheInputAddress(exchange_name, account_name, input_coin_type, output_coin_type, address, memo) {
            var wallet = _WalletDb2.default.getWallet();
            wallet = null;

            var index = this.getIndexForDepositKeyInExchange(account_name, input_coin_type, output_coin_type);
            if (!wallet) {
                var deposit_keys = ss.get("deposit_keys", {});
                deposit_keys[exchange_name] = deposit_keys[exchange_name] || {};
                deposit_keys[exchange_name][index] = deposit_keys[exchange_name][index] || [];
                deposit_keys[exchange_name][index].push({ "address": address, "memo": memo });
                ss.set("deposit_keys", deposit_keys);
            } else {
                wallet.deposit_keys = wallet.deposit_keys || {};
                wallet.deposit_keys[exchange_name] = wallet.deposit_keys[exchange_name] || {};
                wallet.deposit_keys[exchange_name][index] = wallet.deposit_keys[exchange_name][index] || [];
                wallet.deposit_keys[exchange_name][index].push({ "address": address, "memo": memo });
                _WalletDb2.default._updateWallet();
            }
        }
    }]);

    return BlockTradesDepositAddressCache;
}();

; // BlockTradesDepositAddressCache

exports.default = BlockTradesDepositAddressCache;