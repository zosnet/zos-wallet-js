"use strict";

Object.defineProperty(exports, "__esModule", {
    value: true
});

var _createClass = function () { function defineProperties(target, props) { for (var i = 0; i < props.length; i++) { var descriptor = props[i]; descriptor.enumerable = descriptor.enumerable || false; descriptor.configurable = true; if ("value" in descriptor) descriptor.writable = true; Object.defineProperty(target, descriptor.key, descriptor); } } return function (Constructor, protoProps, staticProps) { if (protoProps) defineProperties(Constructor.prototype, protoProps); if (staticProps) defineProperties(Constructor, staticProps); return Constructor; }; }();

var _es = require("zosjs/es");

var _utils = require("./utils.js");

var _utils2 = _interopRequireDefault(_utils);

var _counterpart = require("counterpart");

var _counterpart2 = _interopRequireDefault(_counterpart);

var _trxHelper = require("./trxHelper.js");

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } }

var AccountUtils = function () {
    function AccountUtils() {
        _classCallCheck(this, AccountUtils);
    }

    _createClass(AccountUtils, null, [{
        key: "checkFeePool",


        /**
        *  takes asset as immutable object or id, fee as integer amount
        *  @return undefined if asset is undefined
        *  @return false if fee pool has insufficient balance
        *  @return true if the fee pool has sufficient balance
        */
        value: function checkFeePool(asset, fee) {
            asset = asset.toJS ? asset : _es.ChainStore.getAsset(asset);
            if (!asset) {
                return undefined;
            }

            var feePool = parseInt(asset.getIn(["dynamic", "fee_pool"]), 10);

            return feePool >= fee;
        }
    }, {
        key: "getPossibleFees",
        value: function getPossibleFees(account, operation) {
            var _this = this;

            var core = _es.ChainStore.getAsset("1.3.0");
            account = !account || account.toJS ? account : _es.ChainStore.getAccount(account);

            if (!account || !core) {
                return { assets: ["1.3.0"], fees: { "1.3.0": 0 } };
            }

            var assets = [],
                fees = {};

            var globalObject = _es.ChainStore.getObject("2.0.0");

            var fee = (0, _trxHelper.estimateFee)(operation, null, globalObject);

            var accountBalances = account.get("balances");
            if (!accountBalances) {
                return { assets: ["1.3.0"], fees: { "1.3.0": 0 } };
            }

            accountBalances.forEach(function (balanceID, assetID) {
                var balanceObject = _es.ChainStore.getObject(balanceID);
                var balance = balanceObject ? parseInt(balanceObject.get("balance"), 10) : 0;
                var hasBalance = false,
                    eqFee = void 0;

                if (assetID === "1.3.0" && balance >= fee) {
                    hasBalance = true;
                } else if (balance && _es.ChainStore.getAsset(assetID)) {
                    var asset = _es.ChainStore.getAsset(assetID);
                    var price = _utils2.default.convertPrice(core, asset.getIn(["options", "core_exchange_rate"]).toJS(), null, asset.get("id"));

                    eqFee = parseInt(_utils2.default.convertValue(price, fee, core, asset), 10);
                    if (parseInt(eqFee, 10) !== eqFee) {
                        eqFee += 1; // Add 1 to round up;
                    }
                    if (balance >= eqFee && _this.checkFeePool(asset, eqFee)) {
                        hasBalance = true;
                    }
                }
                if (hasBalance) {
                    assets.push(assetID);
                    fees[assetID] = eqFee ? eqFee : fee;
                }
            });

            return { assets: assets, fees: fees };
        }
    }, {
        key: "getFinalFeeAsset",
        value: function getFinalFeeAsset(account, operation) {
            var fee_asset_id = arguments.length > 2 && arguments[2] !== undefined ? arguments[2] : "1.3.0";

            var _getPossibleFees = this.getPossibleFees(account, operation),
                feeAssets = _getPossibleFees.assets;

            if (feeAssets.length === 1) {
                fee_asset_id = feeAssets[0];
            } else if (feeAssets.length > 0 && feeAssets.indexOf(fee_asset_id) === -1) {
                fee_asset_id = feeAssets[0];
            }

            return fee_asset_id;
        }
    }, {
        key: "isKnownScammer",
        value: function isKnownScammer(account) {
            var scamAccountsPolo = ["polonie-wallet", "polonie-xwallet", "poloniewallet", "poloniex-deposit", "poloniex-wallet", "poloniexwall-et", "poloniexwallett", "poloniexwall-t", "poloniexwalle", "poloniex", "poloneix"];

            var scamAccountsBittrex = ["bittrex-deopsit", "bittrex-deposi", "bittrex-depositt", "bittrex-dposit", "bittrex", "bittrex-deposits"];

            var scamAccountsOther = ["coinbase", "blocktrade", "locktrades", "yun.bts", "transwiser-walle", "transwiser-wallets", "ranswiser-wallet", "yun.btc", "pay.coinbase.com", "pay.bts.com", "btc38.com", "yunbi.com", "coinbase.com", "ripple.com", "livecoi-net", "livecoin.net", "livecoinnet"];

            var scamMessage = null;
            if (scamAccountsPolo.indexOf(account) !== -1) {
                scamMessage = _counterpart2.default.translate("account.polo_scam");
            } else if (scamAccountsBittrex.indexOf(account) !== -1) {
                scamMessage = _counterpart2.default.translate("account.bittrex_scam");
            } else if (scamAccountsOther.indexOf(account) !== -1) {
                scamMessage = _counterpart2.default.translate("account.other_scam");
            }
            return scamMessage;
        }
    }]);

    return AccountUtils;
}();

exports.default = AccountUtils;