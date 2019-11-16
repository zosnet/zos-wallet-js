"use strict";

Object.defineProperty(exports, "__esModule", {
    value: true
});
exports.shouldPayFeeWithAssetAsync = exports.checkBalance = exports.checkFeeStatusAsync = exports.checkFeePoolAsync = exports.estimateFeeAsync = exports.estimateFee = undefined;

var _slicedToArray = function () { function sliceIterator(arr, i) { var _arr = []; var _n = true; var _d = false; var _e = undefined; try { for (var _i = arr[Symbol.iterator](), _s; !(_n = (_s = _i.next()).done); _n = true) { _arr.push(_s.value); if (i && _arr.length === i) break; } } catch (err) { _d = true; _e = err; } finally { try { if (!_n && _i["return"]) _i["return"](); } finally { if (_d) throw _e; } } return _arr; } return function (arr, i) { if (Array.isArray(arr)) { return arr; } else if (Symbol.iterator in Object(arr)) { return sliceIterator(arr, i); } else { throw new TypeError("Invalid attempt to destructure non-iterable instance"); } }; }();

var _es = require("zosjs/es");

var _MarketClasses = require("./MarketClasses.js");

var operations = _es.ChainTypes.operations;


function estimateFeeAsync(type) {
    var options = arguments.length > 1 && arguments[1] !== undefined ? arguments[1] : null;
    var data = arguments.length > 2 && arguments[2] !== undefined ? arguments[2] : {};

    return new Promise(function (res, rej) {
        (0, _es.FetchChain)("getObject", "2.0.0").then(function (obj) {
            res(estimateFee(type, options, obj, data));
        }).catch(rej);
    });
}

function checkFeePoolAsync() {
    var _ref = arguments.length > 0 && arguments[0] !== undefined ? arguments[0] : {},
        assetID = _ref.assetID,
        _ref$type = _ref.type,
        type = _ref$type === undefined ? "transfer" : _ref$type,
        _ref$options = _ref.options,
        options = _ref$options === undefined ? null : _ref$options,
        data = _ref.data;

    return new Promise(function (res) {
        if (assetID === "1.3.0") {
            res(true);
        } else {
            Promise.all([estimateFeeAsync(type, options, data), (0, _es.FetchChain)("getAsset", assetID)]).then(function (result) {
                var _result = _slicedToArray(result, 2),
                    fee = _result[0],
                    feeAsset = _result[1];

                (0, _es.FetchChain)("getObject", feeAsset.get("dynamic_asset_data_id")).then(function (dynamicObject) {
                    res(parseInt(dynamicObject.get("fee_pool"), 10) >= fee);
                });
            });
        }
    });
}

function checkFeeStatusAsync() {
    var _ref2 = arguments.length > 0 && arguments[0] !== undefined ? arguments[0] : {},
        accountID = _ref2.accountID,
        _ref2$feeID = _ref2.feeID,
        feeID = _ref2$feeID === undefined ? "1.3.0" : _ref2$feeID,
        _ref2$type = _ref2.type,
        type = _ref2$type === undefined ? "transfer" : _ref2$type,
        _ref2$options = _ref2.options,
        options = _ref2$options === undefined ? null : _ref2$options,
        data = _ref2.data;

    return new Promise(function (res, rej) {
        Promise.all([estimateFeeAsync(type, options, data), checkFeePoolAsync({ assetID: feeID, type: type, options: options, data: data }), (0, _es.FetchChain)("getAccount", accountID), (0, _es.FetchChain)("getAsset", "1.3.0"), feeID !== "1.3.0" ? (0, _es.FetchChain)("getAsset", feeID) : null]).then(function (result) {
            var _result2 = _slicedToArray(result, 5),
                coreFee = _result2[0],
                hasPoolBalance = _result2[1],
                account = _result2[2],
                coreAsset = _result2[3],
                feeAsset = _result2[4];

            var hasBalance = false;
            if (feeID === "1.3.0") feeAsset = coreAsset;
            var coreBalanceID = account.getIn(["balances", "1.3.0"]),
                feeBalanceID = account.getIn(["balances", feeID]);

            if (feeID === "1.3.0" && !coreBalanceID) return res({
                fee: new _MarketClasses.Asset({ amount: coreFee }),
                hasBalance: hasBalance,
                hasPoolBalance: hasPoolBalance
            });

            Promise.all([coreBalanceID ? (0, _es.FetchChain)("getObject", coreBalanceID) : null, feeBalanceID ? (0, _es.FetchChain)("getObject", feeBalanceID) : null]).then(function (balances) {
                var _balances = _slicedToArray(balances, 2),
                    coreBalance = _balances[0],
                    feeBalance = _balances[1];

                var fee = new _MarketClasses.Asset({ amount: coreFee });
                var hasValidCER = true;

                /*
                ** If the fee is to be paid in a non-core asset, check the fee
                ** pool and convert the amount using the CER
                */
                if (feeID !== "1.3.0") {
                    // Convert the amount using the CER
                    var cer = feeAsset.getIn(["options", "core_exchange_rate"]);
                    var b = cer.get("base").toJS();
                    b.precision = b.asset_id === feeID ? feeAsset.get("precision") : coreAsset.get("precision");
                    var base = new _MarketClasses.Asset(b);

                    var q = cer.get("quote").toJS();
                    q.precision = q.asset_id === feeID ? feeAsset.get("precision") : coreAsset.get("precision");
                    var quote = new _MarketClasses.Asset(q);

                    /*
                    ** If the CER is incorrectly configured, the multiplication
                    ** will fail, so catch the error and default to core
                    */
                    try {
                        var price = new _MarketClasses.Price({ base: base, quote: quote });
                        fee = fee.times(price, true);
                    } catch (err) {
                        feeBalance = coreBalance;
                        hasValidCER = false;
                        hasPoolBalance = false;
                    }
                }

                if (feeBalance && feeBalance.get("balance") >= fee.getAmount()) hasBalance = true;

                res({ fee: fee, hasBalance: hasBalance, hasPoolBalance: hasPoolBalance, hasValidCER: hasValidCER });
            });
        }).catch(rej);
    });
}

var privKey = "5KikQ23YhcM7jdfHbFBQg1G7Do5y6SgD9sdBZq7BqQWXmNH7gqo";
var nonce = _es.TransactionHelper.unique_nonce_uint64();
var _privKey = void 0;
var _cachedMessage = void 0,
    _prevContent = void 0;

var _feeCache = {};
function estimateFee(op_type, options, globalObject) {
    var data = arguments.length > 3 && arguments[3] !== undefined ? arguments[3] : {};

    // console.time("estimateFee");
    /*
    * The actual content doesn't matter, only the length of it, so we use a
    * string of equal length to improve caching
    */
    if (!!data.content) data.content = new Array(data.content.length + 1).join("a");
    if (!globalObject) return 0;
    var cacheKey = op_type + JSON.stringify(options) + JSON.stringify(data);
    if (_feeCache[cacheKey]) {
        // console.timeEnd("estimateFee");
        return _feeCache[cacheKey];
    }
    var op_code = operations[op_type];
    var currentFees = globalObject.getIn(["parameters", "current_fees", "parameters", op_code, 1]).toJS();

    var fee = 0;
    if (currentFees.fee) {
        fee += currentFees.fee;
    }

    if (options) {
        var _iteratorNormalCompletion = true;
        var _didIteratorError = false;
        var _iteratorError = undefined;

        try {
            for (var _iterator = options[Symbol.iterator](), _step; !(_iteratorNormalCompletion = (_step = _iterator.next()).done); _iteratorNormalCompletion = true) {
                var option = _step.value;

                var optionFee = currentFees[option];

                if (option === "price_per_kbyte") {
                    if (data.type === "memo" && !!data.content) {
                        /* Dummy priv key */
                        var pKey = _privKey || _es.PrivateKey.fromWif(privKey);
                        if (_privKey) _privKey = pKey;
                        var memoFromKey = "ZOS6B1taKXkDojuC1qECjvC7g186d8AdeGtz8wnqWAsoRGC6RY8Rp";

                        // Memos are optional, but if you have one you need to encrypt it
                        var memoToKey = "ZOS8eLeqSZZtB1YHdw7KjQxRSRmaKAseCxhUSqaLxUdqvdGpp6nck";

                        /* Encryption is very expensive so we cache the result for reuse */
                        var message = void 0;
                        if (data.content === _prevContent && _cachedMessage) {
                            message = _cachedMessage;
                        } else {
                            message = _cachedMessage = _es.Aes.encrypt_with_checksum(pKey, memoToKey, nonce, data.content);
                        }

                        var memo_object = {
                            from: memoFromKey,
                            to: memoToKey,
                            nonce: nonce,
                            message: message
                        };

                        var serialized = _es.ops.memo_data.fromObject(memo_object);
                        var stringified = JSON.stringify(_es.ops.memo_data.toHex(serialized));
                        var byteLength = Buffer.byteLength(stringified, "hex");
                        fee += optionFee * byteLength / 1024;

                        _prevContent = data.content;
                    }
                } else if (optionFee) {
                    fee += optionFee;
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
    // console.timeEnd("estimateFee");
    fee = fee * globalObject.getIn(["parameters", "current_fees", "scale"]) / 10000;
    _feeCache[cacheKey] = fee;
    setTimeout(function () {
        delete _feeCache[cacheKey];
    }, 1000 * 60 * 5); // Five minute cache clear timeout
    return fee;
}

function checkBalance(amount, sendAsset, feeAmount, balance) {
    if (!amount) return null;
    if (typeof amount === "string") amount = parseFloat(String.prototype.replace.call(amount, /,/g, ""));

    if (!balance || balance.get("balance") === 0) return false;

    var sendAmount = new _MarketClasses.Asset({
        asset_id: sendAsset.get("id"),
        precision: sendAsset.get("precision"),
        real: amount
    });
    var balanceAmount = sendAmount.clone(balance.get("balance"));

    /* Insufficient balance */
    if (balanceAmount.lt(sendAmount)) {
        return false;
    }

    /* Check if enough remains to pay the fee */
    if (sendAmount.asset_id === feeAmount.asset_id) {
        sendAmount.plus(feeAmount);
        if (balanceAmount.lt(sendAmount)) {
            return false;
        }
    }

    return true;
}

function shouldPayFeeWithAssetAsync(fromAccount, feeAmount) {
    if (fromAccount && feeAmount && feeAmount.asset_id === "1.3.0") {
        var balanceID = fromAccount.getIn(["balances", feeAmount.asset_id]);
        if (!balanceID) {
            return new Promise(function (resolve) {
                return resolve(false);
            });
        }
        return (0, _es.FetchChain)("getObject", balanceID).then(function (balanceObject) {
            var balance = balanceObject.get("balance");
            if (balance <= feeAmount.amount) return true;
        });
    }
    return new Promise(function (resolve) {
        return resolve(false);
    });
}

exports.estimateFee = estimateFee;
exports.estimateFeeAsync = estimateFeeAsync;
exports.checkFeePoolAsync = checkFeePoolAsync;
exports.checkFeeStatusAsync = checkFeeStatusAsync;
exports.checkBalance = checkBalance;
exports.shouldPayFeeWithAssetAsync = shouldPayFeeWithAssetAsync;