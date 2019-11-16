"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});

var _createClass = function () { function defineProperties(target, props) { for (var i = 0; i < props.length; i++) { var descriptor = props[i]; descriptor.enumerable = descriptor.enumerable || false; descriptor.configurable = true; if ("value" in descriptor) descriptor.writable = true; Object.defineProperty(target, descriptor.key, descriptor); } } return function (Constructor, protoProps, staticProps) { if (protoProps) defineProperties(Constructor.prototype, protoProps); if (staticProps) defineProperties(Constructor, staticProps); return Constructor; }; }();

function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } }

var LendInstance = function () {
  function LendInstance() {
    _classCallCheck(this, LendInstance);
  }

  _createClass(LendInstance, null, [{
    key: "getInterestRate",

    // 利率
    value: function getInterestRate(row) {
      return row.interest_rate.interest_rate;
    }
    // 抵押价值

  }, {
    key: "collateralizeFeed",
    value: function collateralizeFeed(row) {
      var settlementPrice = row.current_feed.settlement_price;
      var feedPrice = 0;
      if (row.asset_to_loan.id === settlementPrice.base.asset_id) {
        feedPrice = settlementPrice.base.amount / settlementPrice.quote.amount;
      } else {
        feedPrice = settlementPrice.quote.amount / settlementPrice.base.amount;
      }
      return (row.amount_to_collateralize.amount * feedPrice).toFixed(0) / Math.pow(10, row.asset_to_loan.precision);
    }
    // 预计总收益

  }, {
    key: "expectedTotal",
    value: function expectedTotal(row) {
      var sum = 0;
      var _iteratorNormalCompletion = true;
      var _didIteratorError = false;
      var _iteratorError = undefined;

      try {
        for (var _iterator = row.order_info.repay_interest[Symbol.iterator](), _step; !(_iteratorNormalCompletion = (_step = _iterator.next()).done); _iteratorNormalCompletion = true) {
          var val = _step.value;

          sum += val[1].expect_repay_interest.amount / Math.pow(10, row.asset_to_loan.precision);
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

      return sum;
    }
    // 预计收益率

  }, {
    key: "expectedInterest",
    value: function expectedInterest(row) {
      var interests = row.amount_to_invest.amount * (row.interest_rate / 100);
      return interests;
    }
  }, {
    key: "calcFeedPrice",
    value: function calcFeedPrice(feed, baseid, baseprecision, quoteid, quoteprecision) {
      var feedC = 0;
      if (!feed) {
        return feedC;
      }
      if (feed.quote.amount === 0 || feed.base.amount === 0) {
        return feedC;
      }
      var baseAmount = feed.base.amount;
      var quoteAmount = feed.quote.amount;
      if (feed.base.asset_id === quoteid) {
        baseAmount = feed.quote.amount;
        quoteAmount = feed.base.amount;
      }
      // quote是抵押货币，base是可借贷货币 千万注意 base * quote 避免两次除法造成的精度问题 Eric
      var feedPrice = parseInt(baseAmount) * Math.pow(10, quoteprecision) / (parseInt(quoteAmount) * Math.pow(10, baseprecision));
      if (baseprecision - quoteprecision >= 0) {
        return feedPrice.toFixed(baseprecision);
      } else {
        return feedPrice.toFixed(quoteprecision);
      }
    }
  }, {
    key: "calcFeedPriceView",
    value: function calcFeedPriceView(feed, baseid, baseprecision, quoteid, quoteprecision) {
      var feedC = 0;
      if (!feed) {
        return feedC;
      }
      if (feed.quote.amount === 0 || feed.base.amount === 0) {
        return feedC;
      }
      var baseAmount = feed.base.amount;
      var quoteAmount = feed.quote.amount;
      if (feed.base.asset_id === quoteid) {
        baseAmount = feed.quote.amount;
        quoteAmount = feed.base.amount;
      }
      // quote是抵押货币，base是可借贷货币 千万注意 base * quote 避免两次除法造成的精度问题 Eric
      var feedPrice = parseInt(quoteAmount) * Math.pow(10, baseprecision) / (parseInt(baseAmount) * Math.pow(10, quoteprecision));
      if (baseprecision - quoteprecision >= 0) {
        return feedPrice.toFixed(baseprecision);
      } else {
        return feedPrice.toFixed(quoteprecision);
      }
    }
  }]);

  return LendInstance;
}();

// var NewpayInstanceWrapped = NewpayInstance.getInstance();
// export default NewpayInstanceWrapped


exports.default = LendInstance;