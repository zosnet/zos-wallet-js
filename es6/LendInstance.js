
class LendInstance {
  // 利率
  static getInterestRate (row) {
    return row.interest_rate.interest_rate
  }
  // 抵押价值
  static collateralizeFeed (row) {
    let settlementPrice = row.current_feed.settlement_price
    let feedPrice = 0
    if (row.asset_to_loan.id === settlementPrice.base.asset_id) {
      feedPrice = settlementPrice.base.amount / settlementPrice.quote.amount
    } else {
      feedPrice = settlementPrice.quote.amount / settlementPrice.base.amount
    }
    return (row.amount_to_collateralize.amount * feedPrice).toFixed(0) / Math.pow(10, row.asset_to_loan.precision)
  }
  // 预计总收益
  static expectedTotal (row) {
    let sum = 0
    for (let val of row.order_info.repay_interest) {
      sum += (val[1].expect_repay_interest.amount) / Math.pow(10, row.asset_to_loan.precision)
    }
    return sum
  }
  // 预计收益率
  static expectedInterest (row) {
    let interests = row.amount_to_invest.amount * (row.interest_rate / 100)
    return interests
  }

  static calcFeedPrice (feed, baseid, baseprecision, quoteid, quoteprecision) {
    let feedC = 0
    if (!feed) {
      return feedC
    }
    if (feed.quote.amount === 0 || feed.base.amount === 0) {
      return feedC
    }
    let baseAmount = feed.base.amount
    let quoteAmount = feed.quote.amount
    if (feed.base.asset_id === quoteid) {
      baseAmount = feed.quote.amount
      quoteAmount = feed.base.amount
    }
    // quote是抵押货币，base是可借贷货币 千万注意 base * quote 避免两次除法造成的精度问题 Eric
    var feedPrice = (parseInt(baseAmount) * Math.pow(10, quoteprecision)) / (parseInt(quoteAmount) * Math.pow(10, baseprecision))
    if (baseprecision - quoteprecision >= 0) {
      return feedPrice.toFixed(baseprecision)
    } else {
      return feedPrice.toFixed(quoteprecision)
    }
  }
  static calcFeedPriceView (feed, baseid, baseprecision, quoteid, quoteprecision) {
    let feedC = 0
    if (!feed) {
      return feedC
    }
    if (feed.quote.amount === 0 || feed.base.amount === 0) {
      return feedC
    }
    let baseAmount = feed.base.amount
    let quoteAmount = feed.quote.amount
    if (feed.base.asset_id === quoteid) {
      baseAmount = feed.quote.amount
      quoteAmount = feed.base.amount
    }
    // quote是抵押货币，base是可借贷货币 千万注意 base * quote 避免两次除法造成的精度问题 Eric
    var feedPrice = (parseInt(quoteAmount) * Math.pow(10, baseprecision)) / (parseInt(baseAmount) * Math.pow(10, quoteprecision))
    if (baseprecision - quoteprecision >= 0) {
      return feedPrice.toFixed(baseprecision)
    } else {
      return feedPrice.toFixed(quoteprecision)
    }
  }
} 

// var NewpayInstanceWrapped = NewpayInstance.getInstance();
// export default NewpayInstanceWrapped
export default LendInstance
