"use strict";

Object.defineProperty(exports, "__esModule", {
    value: true
});
exports.didOrdersChange = exports.SettleOrder = exports.CallOrder = exports.LimitOrder = exports.precisionToRatio = exports.limitByPrecision = exports.LimitOrderCreate = exports.FeedPrice = exports.Price = exports.Asset = undefined;

var _typeof = typeof Symbol === "function" && typeof Symbol.iterator === "symbol" ? function (obj) { return typeof obj; } : function (obj) { return obj && typeof Symbol === "function" && obj.constructor === Symbol && obj !== Symbol.prototype ? "symbol" : typeof obj; };

var _createClass = function () { function defineProperties(target, props) { for (var i = 0; i < props.length; i++) { var descriptor = props[i]; descriptor.enumerable = descriptor.enumerable || false; descriptor.configurable = true; if ("value" in descriptor) descriptor.writable = true; Object.defineProperty(target, descriptor.key, descriptor); } } return function (Constructor, protoProps, staticProps) { if (protoProps) defineProperties(Constructor.prototype, protoProps); if (staticProps) defineProperties(Constructor, staticProps); return Constructor; }; }();

var _fractional = require("fractional");

function _possibleConstructorReturn(self, call) { if (!self) { throw new ReferenceError("this hasn't been initialised - super() hasn't been called"); } return call && (typeof call === "object" || typeof call === "function") ? call : self; }

function _inherits(subClass, superClass) { if (typeof superClass !== "function" && superClass !== null) { throw new TypeError("Super expression must either be null or a function, not " + typeof superClass); } subClass.prototype = Object.create(superClass && superClass.prototype, { constructor: { value: subClass, enumerable: false, writable: true, configurable: true } }); if (superClass) Object.setPrototypeOf ? Object.setPrototypeOf(subClass, superClass) : subClass.__proto__ = superClass; }

function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } }

var GRAPHENE_100_PERCENT = 10000;

function limitByPrecision(value) {
    var p = arguments.length > 1 && arguments[1] !== undefined ? arguments[1] : 8;

    if (typeof p !== "number") throw new Error("Input must be a number");
    var valueString = value.toString();
    var splitString = valueString.split(".");
    if (splitString.length === 1 || splitString.length === 2 && splitString[1].length <= p) {
        return parseFloat(valueString);
    } else {
        return parseFloat(splitString[0] + "." + splitString[1].substr(0, p));
    }
}

function precisionToRatio(p) {
    if (typeof p !== "number") throw new Error("Input must be a number");
    return Math.pow(10, p);
}

function didOrdersChange(newOrders, oldOrders) {
    var changed = oldOrders && oldOrders.size !== newOrders.size;
    if (changed) return changed;

    newOrders.forEach(function (a, key) {
        var oldOrder = oldOrders.get(key);
        if (!oldOrder) {
            changed = true;
        } else {
            if (a.market_base === oldOrder.market_base) {
                changed = changed || a.ne(oldOrder);
            }
        }
    });
    return changed;
}

var Asset = function () {
    function Asset() {
        var _ref = arguments.length > 0 && arguments[0] !== undefined ? arguments[0] : {},
            _ref$asset_id = _ref.asset_id,
            asset_id = _ref$asset_id === undefined ? "1.3.0" : _ref$asset_id,
            _ref$amount = _ref.amount,
            amount = _ref$amount === undefined ? 0 : _ref$amount,
            _ref$precision = _ref.precision,
            precision = _ref$precision === undefined ? 5 : _ref$precision,
            _ref$real = _ref.real,
            real = _ref$real === undefined ? null : _ref$real;

        _classCallCheck(this, Asset);

        this.satoshi = precisionToRatio(precision);
        this.asset_id = asset_id;
        this.setAmount({ sats: amount, real: real });
        this.precision = precision;
    }

    _createClass(Asset, [{
        key: "hasAmount",
        value: function hasAmount() {
            return this.amount > 0;
        }
    }, {
        key: "toSats",
        value: function toSats() {
            var amount = arguments.length > 0 && arguments[0] !== undefined ? arguments[0] : 1;
            // Return the full integer amount in 'satoshis'
            return Math.floor(amount * this.satoshi);
        }
    }, {
        key: "setAmount",
        value: function setAmount(_ref2) {
            var sats = _ref2.sats,
                real = _ref2.real;

            if (typeof sats === "string") sats = parseInt(sats, 10);
            if (typeof real === "string") real = parseFloat(real);

            if (typeof sats !== "number" && typeof real !== "number") {
                throw new Error("Invalid arguments for setAmount");
            }
            if (real && typeof real !== "undefined") {
                if (typeof real !== "number" || isNaN(real)) throw new Error("Invalid argument 'real' for setAmount");
                this.amount = this.toSats(real);
                this._clearCache();
            } else if (typeof sats === "number") {
                this.amount = Math.floor(sats);
                this._clearCache();
            } else {
                throw new Error("Invalid setAmount input");
            }
        }
    }, {
        key: "_clearCache",
        value: function _clearCache() {
            this._real_amount = null;
        }
    }, {
        key: "getAmount",
        value: function getAmount() {
            var _ref3 = arguments.length > 0 && arguments[0] !== undefined ? arguments[0] : {},
                _ref3$real = _ref3.real,
                real = _ref3$real === undefined ? false : _ref3$real;

            if (real) {
                if (this._real_amount) return this._real_amount;
                return this._real_amount = limitByPrecision(this.amount / this.toSats(), this.precision);
            } else {
                return Math.floor(this.amount);
            }
        }
    }, {
        key: "plus",
        value: function plus(asset) {
            if (asset.asset_id !== this.asset_id) throw new Error("Assets are not the same type");
            this.amount += asset.amount;
            this._clearCache();
        }
    }, {
        key: "minus",
        value: function minus(asset) {
            if (asset.asset_id !== this.asset_id) throw new Error("Assets are not the same type");
            this.amount -= asset.amount;
            this.amount = Math.max(0, this.amount);
            this._clearCache();
        }
    }, {
        key: "equals",
        value: function equals(asset) {
            return this.asset_id === asset.asset_id && this.getAmount() === asset.getAmount();
        }
    }, {
        key: "ne",
        value: function ne(asset) {
            return !this.equals(asset);
        }
    }, {
        key: "gt",
        value: function gt(asset) {
            return this.getAmount() > asset.getAmount();
        }
    }, {
        key: "lt",
        value: function lt(asset) {
            return this.getAmount() < asset.getAmount();
        }
    }, {
        key: "times",
        value: function times(p) {
            var isBid = arguments.length > 1 && arguments[1] !== undefined ? arguments[1] : false;
            // asset amount times a price p
            var temp = void 0,
                amount = void 0;
            if (this.asset_id === p.base.asset_id) {
                temp = this.amount * p.quote.amount / p.base.amount;
                amount = Math.floor(temp);
                /*
                * Sometimes prices are inexact for the relevant amounts, in the case
                * of bids this means we need to round up in order to pay 1 sat more
                * than the floored price, if we don't do this the orders don't match
                */
                if (isBid && temp !== amount) {
                    amount += 1;
                }
                if (amount === 0) amount = 1;
                return new Asset({ asset_id: p.quote.asset_id, amount: amount, precision: p.quote.precision });
            } else if (this.asset_id === p.quote.asset_id) {
                temp = this.amount * p.base.amount / p.quote.amount;
                amount = Math.floor(temp);
                /*
                * Sometimes prices are inexact for the relevant amounts, in the case
                * of bids this means we need to round up in order to pay 1 sat more
                * than the floored price, if we don't do this the orders don't match
                */
                if (isBid && temp !== amount) {
                    amount += 1;
                }
                if (amount === 0) amount = 1;
                return new Asset({ asset_id: p.base.asset_id, amount: amount, precision: p.base.precision });
            }
            throw new Error("Invalid asset types for price multiplication");
        }
    }, {
        key: "divide",
        value: function divide(quote) {
            var base = arguments.length > 1 && arguments[1] !== undefined ? arguments[1] : this;

            return new Price({ base: base, quote: quote });
        }
    }, {
        key: "toObject",
        value: function toObject() {
            return {
                asset_id: this.asset_id,
                amount: this.amount
            };
        }
    }, {
        key: "clone",
        value: function clone() {
            var amount = arguments.length > 0 && arguments[0] !== undefined ? arguments[0] : this.amount;

            return new Asset({
                amount: amount,
                asset_id: this.asset_id,
                precision: this.precision
            });
        }
    }]);

    return Asset;
}();

/**
    * @brief The price struct stores asset prices in the Graphene system.
    *
    * A price is defined as a ratio between two assets, and represents a possible exchange rate between those two
    * assets. prices are generally not stored in any simplified form, i.e. a price of (1000 CORE)/(20 USD) is perfectly
    * normal.
    *
    * The assets within a price are labeled base and quote. Throughout the Graphene code base, the convention used is
    * that the base asset is the asset being sold, and the quote asset is the asset being purchased, where the price is
    * represented as base/quote, so in the example price above the seller is looking to sell CORE asset and get USD in
    * return.
*/

var Price = function () {
    function Price() {
        var _ref4 = arguments.length > 0 && arguments[0] !== undefined ? arguments[0] : {},
            base = _ref4.base,
            quote = _ref4.quote,
            _ref4$real = _ref4.real,
            real = _ref4$real === undefined ? false : _ref4$real;

        _classCallCheck(this, Price);

        if (!base || !quote) {
            throw new Error("Base and Quote assets must be defined");
        }
        if (base.asset_id === quote.asset_id) {
            throw new Error("Base and Quote assets must be different");
        }

        base = base.clone();
        quote = quote.clone();
        if (real && typeof real === "number") {
            /*
            * In order to make large numbers work properly, we assume numbers
            * larger than 100k do not need more than 5 decimals. Without this we
            * quickly encounter JavaScript floating point errors for large numbers.
            */
            if (real > 100000) {
                real = limitByPrecision(real, 5);
            }
            var frac = new _fractional.Fraction(real);
            var baseSats = base.toSats(),
                quoteSats = quote.toSats();
            var numRatio = baseSats / quoteSats,
                denRatio = quoteSats / baseSats;

            if (baseSats >= quoteSats) {
                denRatio = 1;
            } else {
                numRatio = 1;
            }

            base.amount = frac.numerator * numRatio;
            quote.amount = frac.denominator * denRatio;
        } else if (real === 0) {
            base.amount = 0;
            quote.amount = 0;
        }

        if (!base.asset_id || !("amount" in base) || !quote.asset_id || !("amount" in quote)) throw new Error("Invalid Price inputs");
        this.base = base;
        this.quote = quote;
    }

    _createClass(Price, [{
        key: "getUnits",
        value: function getUnits() {
            return this.base.asset_id + "_" + this.quote.asset_id;
        }
    }, {
        key: "isValid",
        value: function isValid() {
            return this.base.amount !== 0 && this.quote.amount !== 0 && !isNaN(this.toReal()) && isFinite(this.toReal());
        }
    }, {
        key: "toReal",
        value: function toReal() {
            var sameBase = arguments.length > 0 && arguments[0] !== undefined ? arguments[0] : false;

            var key = sameBase ? "_samebase_real" : "_not_samebase_real";
            if (this[key]) {
                return this[key];
            }
            var real = sameBase ? this.quote.amount * this.base.toSats() / (this.base.amount * this.quote.toSats()) : this.base.amount * this.quote.toSats() / (this.quote.amount * this.base.toSats());
            return this[key] = parseFloat(real.toFixed(8)); // toFixed and parseFloat helps avoid floating point errors for really big or small numbers
        }
    }, {
        key: "invert",
        value: function invert() {
            return new Price({
                base: this.quote,
                quote: this.base
            });
        }
    }, {
        key: "clone",
        value: function clone() {
            var real = arguments.length > 0 && arguments[0] !== undefined ? arguments[0] : null;

            return new Price({
                base: this.base,
                quote: this.quote,
                real: real
            });
        }
    }, {
        key: "equals",
        value: function equals(b) {
            if (this.base.asset_id !== b.base.asset_id || this.quote.asset_id !== b.quote.asset_id) {
                console.error("Cannot compare prices for different assets");
                return false;
            }
            var amult = b.quote.amount * this.base.amount;
            var bmult = this.quote.amount * b.base.amount;

            return amult === bmult;
        }
    }, {
        key: "lt",
        value: function lt(b) {
            if (this.base.asset_id !== b.base.asset_id || this.quote.asset_id !== b.quote.asset_id) {
                throw new Error("Cannot compare prices for different assets");
            }
            var amult = b.quote.amount * this.base.amount;
            var bmult = this.quote.amount * b.base.amount;

            return amult < bmult;
        }
    }, {
        key: "lte",
        value: function lte(b) {
            return this.equals(b) || this.lt(b);
        }
    }, {
        key: "ne",
        value: function ne(b) {
            return !this.equals(b);
        }
    }, {
        key: "gt",
        value: function gt(b) {
            return !this.lte(b);
        }
    }, {
        key: "gte",
        value: function gte(b) {
            return !this.lt(b);
        }
    }, {
        key: "toObject",
        value: function toObject() {
            return {
                base: this.base.toObject(),
                quote: this.quote.toObject()
            };
        }
    }]);

    return Price;
}();

var FeedPrice = function (_Price) {
    _inherits(FeedPrice, _Price);

    function FeedPrice(_ref5) {
        var priceObject = _ref5.priceObject,
            assets = _ref5.assets,
            market_base = _ref5.market_base,
            sqr = _ref5.sqr,
            _ref5$real = _ref5.real,
            real = _ref5$real === undefined ? false : _ref5$real;

        _classCallCheck(this, FeedPrice);

        if (!priceObject || (typeof priceObject === "undefined" ? "undefined" : _typeof(priceObject)) !== "object" || !market_base || !assets || !sqr) {
            throw new Error("Invalid FeedPrice inputs");
        }

        if (priceObject.toJS) {
            priceObject = priceObject.toJS();
        }

        var inverted = market_base === priceObject.base.asset_id;

        var base = new Asset({
            asset_id: priceObject.base.asset_id,
            amount: priceObject.base.amount,
            precision: assets[priceObject.base.asset_id].precision
        });

        var quote = new Asset({
            asset_id: priceObject.quote.asset_id,
            amount: priceObject.quote.amount,
            precision: assets[priceObject.quote.asset_id].precision
        });

        var _this = _possibleConstructorReturn(this, (FeedPrice.__proto__ || Object.getPrototypeOf(FeedPrice)).call(this, {
            base: inverted ? quote : base,
            quote: inverted ? base : quote,
            real: real
        }));

        _this.sqr = parseInt(sqr, 10) / 1000;
        _this.inverted = inverted;
        return _this;
    }

    _createClass(FeedPrice, [{
        key: "getSqueezePrice",
        value: function getSqueezePrice() {
            var _ref6 = arguments.length > 0 && arguments[0] !== undefined ? arguments[0] : {},
                _ref6$real = _ref6.real,
                real = _ref6$real === undefined ? false : _ref6$real;

            if (!this._squeeze_price) {
                this._squeeze_price = this.clone();
                if (this.inverted) this._squeeze_price.base.amount = Math.floor(this._squeeze_price.base.amount * this.sqr);
                if (!this.inverted) this._squeeze_price.quote.amount = Math.floor(this._squeeze_price.quote.amount * this.sqr);
            }

            if (real) {
                return this._squeeze_price.toReal();
            }
            return this._squeeze_price;
        }
    }]);

    return FeedPrice;
}(Price);

var LimitOrderCreate = function () {
    function LimitOrderCreate() {
        var _ref7 = arguments.length > 0 && arguments[0] !== undefined ? arguments[0] : {},
            for_sale = _ref7.for_sale,
            to_receive = _ref7.to_receive,
            _ref7$seller = _ref7.seller,
            seller = _ref7$seller === undefined ? "" : _ref7$seller,
            _ref7$expiration = _ref7.expiration,
            expiration = _ref7$expiration === undefined ? new Date() : _ref7$expiration,
            _ref7$fill_or_kill = _ref7.fill_or_kill,
            fill_or_kill = _ref7$fill_or_kill === undefined ? false : _ref7$fill_or_kill,
            _ref7$fee = _ref7.fee,
            fee = _ref7$fee === undefined ? { amount: 0, asset_id: "1.3.0" } : _ref7$fee;

        _classCallCheck(this, LimitOrderCreate);

        if (!for_sale || !to_receive) {
            throw new Error("Missing order amounts");
        }

        if (for_sale.asset_id === to_receive.asset_id) {
            throw new Error("Order assets cannot be the same");
        }

        this.amount_for_sale = for_sale;
        this.min_to_receive = to_receive;
        this.setExpiration(expiration);
        this.fill_or_kill = fill_or_kill;
        this.seller = seller;
        this.fee = fee;
    }

    _createClass(LimitOrderCreate, [{
        key: "setExpiration",
        value: function setExpiration() {
            var expiration = arguments.length > 0 && arguments[0] !== undefined ? arguments[0] : null;

            if (!expiration) {
                expiration = new Date();
                expiration.setYear(expiration.getFullYear() + 5);
            }
            this.expiration = expiration;
        }
    }, {
        key: "getExpiration",
        value: function getExpiration() {
            return this.expiration;
        }
    }, {
        key: "toObject",
        value: function toObject() {
            return {
                seller: this.seller,
                min_to_receive: this.min_to_receive.toObject(),
                amount_to_sell: this.amount_for_sale.toObject(),
                expiration: this.expiration,
                fill_or_kill: this.fill_or_kill,
                fee: this.fee
            };
        }
    }]);

    return LimitOrderCreate;
}();

var LimitOrder = function () {
    function LimitOrder(order, assets, market_base) {
        _classCallCheck(this, LimitOrder);

        if (!market_base) {
            throw new Error("LimitOrder requires a market_base id");
        }
        this.order = order;
        this.assets = assets;
        this.market_base = market_base;
        this.id = order.id;
        this.expiration = order.expiration && new Date(order.expiration);
        this.seller = order.seller;
        this.for_sale = parseInt(order.for_sale, 10); // asset id is sell_price.base.asset_id

        var base = new Asset({
            asset_id: order.sell_price.base.asset_id,
            amount: parseInt(order.sell_price.base.amount, 10),
            precision: assets[order.sell_price.base.asset_id].precision
        });
        var quote = new Asset({
            asset_id: order.sell_price.quote.asset_id,
            amount: parseInt(order.sell_price.quote.amount, 10),
            precision: assets[order.sell_price.quote.asset_id].precision
        });

        this.sell_price = new Price({
            base: base, quote: quote
        });

        this.fee = order.deferred_fee;
    }

    _createClass(LimitOrder, [{
        key: "getPrice",
        value: function getPrice() {
            var p = arguments.length > 0 && arguments[0] !== undefined ? arguments[0] : this.sell_price;

            if (this._real_price) {
                return this._real_price;
            }
            return this._real_price = p.toReal(p.base.asset_id === this.market_base);
        }
    }, {
        key: "isBid",
        value: function isBid() {
            return !(this.sell_price.base.asset_id === this.market_base);
        }
    }, {
        key: "isCall",
        value: function isCall() {
            return false;
        }
    }, {
        key: "sellPrice",
        value: function sellPrice() {
            return this.sell_price;
        }
    }, {
        key: "amountForSale",
        value: function amountForSale() {
            if (this._for_sale) return this._for_sale;
            return this._for_sale = new Asset({
                asset_id: this.sell_price.base.asset_id,
                amount: this.for_sale,
                precision: this.assets[this.sell_price.base.asset_id].precision
            });
        }
    }, {
        key: "amountToReceive",
        value: function amountToReceive() {
            var isBid = arguments.length > 0 && arguments[0] !== undefined ? arguments[0] : this.isBid();

            if (this._to_receive) return this._to_receive;
            this._to_receive = this.amountForSale().times(this.sell_price, isBid);
            return this._to_receive;
        }
    }, {
        key: "sum",
        value: function sum(order) {
            var newOrder = this.clone();
            newOrder.for_sale += order.for_sale;

            return newOrder;
        }
    }, {
        key: "clone",
        value: function clone() {
            return new LimitOrder(this.order, this.assets, this.market_base);
        }
    }, {
        key: "ne",
        value: function ne(order) {
            return this.sell_price.ne(order.sell_price) || this.for_sale !== order.for_sale;
        }
    }, {
        key: "equals",
        value: function equals(order) {
            return !this.ne(order);
        }
    }, {
        key: "setTotalToReceive",
        value: function setTotalToReceive(total) {
            this.total_to_receive = total;
        }
    }, {
        key: "setTotalForSale",
        value: function setTotalForSale(total) {
            this.total_for_sale = total;
            this._total_to_receive = null;
        }
    }, {
        key: "totalToReceive",
        value: function totalToReceive() {
            var _ref8 = arguments.length > 0 && arguments[0] !== undefined ? arguments[0] : {},
                _ref8$noCache = _ref8.noCache,
                noCache = _ref8$noCache === undefined ? false : _ref8$noCache;

            if (!noCache && this._total_to_receive) return this._total_to_receive;
            this._total_to_receive = (this.total_to_receive || this.amountToReceive()).clone();
            return this._total_to_receive;
        }
    }, {
        key: "totalForSale",
        value: function totalForSale() {
            var _ref9 = arguments.length > 0 && arguments[0] !== undefined ? arguments[0] : {},
                _ref9$noCache = _ref9.noCache,
                noCache = _ref9$noCache === undefined ? false : _ref9$noCache;

            if (!noCache && this._total_for_sale) return this._total_for_sale;
            return this._total_for_sale = (this.total_for_sale || this.amountForSale()).clone();
        }
    }]);

    return LimitOrder;
}();

var CallOrder = function () {
    function CallOrder(order, assets, market_base, feed) {
        var is_prediction_market = arguments.length > 4 && arguments[4] !== undefined ? arguments[4] : false;

        _classCallCheck(this, CallOrder);

        if (!order || !assets || !market_base || !feed) {
            throw new Error("CallOrder missing inputs");
        }

        this.order = order;
        this.assets = assets;
        this.market_base = market_base;
        this.is_prediction_market = is_prediction_market;
        this.inverted = market_base === order.call_price.base.asset_id;
        this.id = order.id;
        this.borrower = order.borrower;
        /* Collateral asset type is call_price.base.asset_id */
        this.for_sale = parseInt(order.collateral, 10);
        this.for_sale_id = order.call_price.base.asset_id;
        /* Debt asset type is call_price.quote.asset_id */
        this.to_receive = parseInt(order.debt, 10);
        this.to_receive_id = order.call_price.quote.asset_id;

        var base = new Asset({
            asset_id: order.call_price.base.asset_id,
            amount: parseInt(order.call_price.base.amount, 10),
            precision: assets[order.call_price.base.asset_id].precision
        });
        var quote = new Asset({
            asset_id: order.call_price.quote.asset_id,
            amount: parseInt(order.call_price.quote.amount, 10),
            precision: assets[order.call_price.quote.asset_id].precision
        });

        /*
        * The call price is DEBT * MCR / COLLATERAL. This calculation is already
        * done by the witness_node before returning the orders so it is not necessary
        * to deal with the MCR (maintenance collateral ratio) here.
        */
        this.call_price = new Price({
            base: this.inverted ? quote : base, quote: this.inverted ? base : quote
        });

        if (feed.base.asset_id !== this.call_price.base.asset_id) {
            throw new Error("Feed price assets and call price assets must be the same");
        }

        this.feed_price = feed;
    }

    _createClass(CallOrder, [{
        key: "clone",
        value: function clone() {
            var f = arguments.length > 0 && arguments[0] !== undefined ? arguments[0] : this.feed_price;

            return new CallOrder(this.order, this.assets, this.market_base, f);
        }
    }, {
        key: "setFeed",
        value: function setFeed(f) {
            this.feed_price = f;
            this._clearCache();
        }
    }, {
        key: "getPrice",
        value: function getPrice() {
            var squeeze = arguments.length > 0 && arguments[0] !== undefined ? arguments[0] : true;
            var p = arguments.length > 1 && arguments[1] !== undefined ? arguments[1] : this.call_price;

            if (squeeze) {
                return this.getSqueezePrice();
            }
            if (this._real_price) {
                return this._real_price;
            }
            return this._real_price = p.toReal(p.base.asset_id === this.market_base);
        }
    }, {
        key: "getFeedPrice",
        value: function getFeedPrice() {
            var f = arguments.length > 0 && arguments[0] !== undefined ? arguments[0] : this.feed_price;

            if (this._feed_price) {
                return this._feed_price;
            }
            return this._feed_price = f.toReal(f.base.asset_id === this.market_base);
        }
    }, {
        key: "getSqueezePrice",
        value: function getSqueezePrice() {
            var f = arguments.length > 0 && arguments[0] !== undefined ? arguments[0] : this.feed_price;

            if (this._squeeze_price) {
                return this._squeeze_price;
            }
            return this._squeeze_price = f.getSqueezePrice().toReal();
        }
    }, {
        key: "isMarginCalled",
        value: function isMarginCalled() {
            if (this.is_prediction_market) return false;
            return this.isBid() ? this.call_price.lt(this.feed_price) : this.call_price.gt(this.feed_price);
        }
    }, {
        key: "isBid",
        value: function isBid() {
            return !this.inverted;
        }
    }, {
        key: "isCall",
        value: function isCall() {
            return true;
        }
    }, {
        key: "sellPrice",
        value: function sellPrice() {
            var squeeze = arguments.length > 0 && arguments[0] !== undefined ? arguments[0] : true;

            if (squeeze) {
                return this.isBid() ? this.feed_price.getSqueezePrice() : this.feed_price.getSqueezePrice().invert();
            }
            return this.call_price;
        }

        /*
        * Assume a USD:BTS market
        * The call order will always be selling BTS in order to buy USD
        * The asset being sold is always the collateral, which is call_price.base.asset_id.
        * The amount being sold depends on how big the debt is, only enough
        * collateral will be sold to cover the debt
        */

    }, {
        key: "amountForSale",
        value: function amountForSale() {
            var isBid = arguments.length > 0 && arguments[0] !== undefined ? arguments[0] : this.isBid();

            if (this._for_sale) return this._for_sale;
            // return this._for_sale = new Asset({
            //     asset_id: this.for_sale_id,
            //     amount: this.for_sale,
            //     precision: this.assets[this.for_sale_id].precision
            // });
            return this._for_sale = this.amountToReceive().times(this.feed_price.getSqueezePrice(), isBid);
        }
    }, {
        key: "amountToReceive",
        value: function amountToReceive() {
            if (this._to_receive) return this._to_receive;
            // return this._to_receive = this.amountForSale().times(this.feed_price.getSqueezePrice(), isBid);
            return this._to_receive = new Asset({
                asset_id: this.to_receive_id,
                amount: this.to_receive,
                precision: this.assets[this.to_receive_id].precision
            });
        }
    }, {
        key: "sum",
        value: function sum(order) {
            var newOrder = this.clone();
            newOrder.to_receive += order.to_receive;
            newOrder.for_sale += order.for_sale;
            newOrder._clearCache();
            return newOrder;
        }
    }, {
        key: "_clearCache",
        value: function _clearCache() {
            this._for_sale = null;
            this._to_receive = null;
            this._feed_price = null;
            this._squeeze_price = null;
            this._total_to_receive = null;
            this._total_for_sale = null;
        }
    }, {
        key: "ne",
        value: function ne(order) {
            return this.call_price.ne(order.call_price) || this.feed_price.ne(order.feed_price) || this.to_receive !== order.to_receive || this.for_sale !== order.for_sale;
        }
    }, {
        key: "equals",
        value: function equals(order) {
            return !this.ne(order);
        }
    }, {
        key: "setTotalToReceive",
        value: function setTotalToReceive(total) {
            this.total_to_receive = total;
        }
    }, {
        key: "setTotalForSale",
        value: function setTotalForSale(total) {
            this.total_for_sale = total;
        }
    }, {
        key: "totalToReceive",
        value: function totalToReceive() {
            var _ref10 = arguments.length > 0 && arguments[0] !== undefined ? arguments[0] : {},
                _ref10$noCache = _ref10.noCache,
                noCache = _ref10$noCache === undefined ? false : _ref10$noCache;

            if (!noCache && this._total_to_receive) return this._total_to_receive;
            this._total_to_receive = (this.total_to_receive || this.amountToReceive()).clone();
            return this._total_to_receive;
        }
    }, {
        key: "totalForSale",
        value: function totalForSale() {
            var _ref11 = arguments.length > 0 && arguments[0] !== undefined ? arguments[0] : {},
                _ref11$noCache = _ref11.noCache,
                noCache = _ref11$noCache === undefined ? false : _ref11$noCache;

            if (!noCache && this._total_for_sale) return this._total_for_sale;
            return this._total_for_sale = (this.total_for_sale || this.amountForSale()).clone();
        }
    }]);

    return CallOrder;
}();

var SettleOrder = function (_LimitOrder) {
    _inherits(SettleOrder, _LimitOrder);

    function SettleOrder(order, assets, market_base, feed_price, bitasset_options) {
        _classCallCheck(this, SettleOrder);

        if (!feed_price || !bitasset_options) {
            throw new Error("SettleOrder needs feed_price and bitasset_options inputs");
        }

        order.sell_price = feed_price.toObject();
        order.seller = order.owner;

        var _this2 = _possibleConstructorReturn(this, (SettleOrder.__proto__ || Object.getPrototypeOf(SettleOrder)).call(this, order, assets, market_base));

        _this2.offset_percent = bitasset_options.force_settlement_offset_percent;
        _this2.settlement_date = new Date(order.settlement_date);

        _this2.for_sale = new Asset({
            amount: order.balance.amount,
            asset_id: order.balance.asset_id,
            precision: assets[order.balance.asset_id].precision
        });

        _this2.inverted = _this2.for_sale.asset_id === market_base;
        _this2.feed_price = feed_price[_this2.inverted ? "invert" : "clone"]();
        return _this2;
    }

    _createClass(SettleOrder, [{
        key: "isBefore",
        value: function isBefore(order) {
            return this.settlement_date < order.settlement_date;
        }
    }, {
        key: "amountForSale",
        value: function amountForSale() {
            return this.for_sale;
        }
    }, {
        key: "amountToReceive",
        value: function amountToReceive() {
            var to_receive = this.for_sale.times(this.feed_price, this.isBid());
            to_receive.setAmount({ sats: to_receive.getAmount() * ((GRAPHENE_100_PERCENT - this.offset_percent) / GRAPHENE_100_PERCENT) });
            return this._to_receive = to_receive;
        }
    }, {
        key: "isBid",
        value: function isBid() {
            return !this.inverted;
        }
    }]);

    return SettleOrder;
}(LimitOrder);

exports.Asset = Asset;
exports.Price = Price;
exports.FeedPrice = FeedPrice;
exports.LimitOrderCreate = LimitOrderCreate;
exports.limitByPrecision = limitByPrecision;
exports.precisionToRatio = precisionToRatio;
exports.LimitOrder = LimitOrder;
exports.CallOrder = CallOrder;
exports.SettleOrder = SettleOrder;
exports.didOrdersChange = didOrdersChange;