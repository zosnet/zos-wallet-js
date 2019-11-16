import {Apis} from 'zosjs-ws'
import {ChainStore, key, Signature, TransactionBuilder, FetchChain, TransactionHelper, Aes, PublicKey, ops} from 'zosjs/es'
import Utils from './lib/common/utils.js'
import pu from './lib/common/permission_utils.js'
import Immutable from 'immutable'
import iDB from './idb-instance.js'
import WalletManagerStore from './WalletManagerStore.js'
import AccountStore from './AccountStore.js'
import WalletDb from './WalletDb.js'
import { encode, decode } from 'bs58'
import SettingsStore from './SettingsStore.js'
// var CryptUtil = require('./cryptUtil.js')
var crypto = require('crypto')

// -------for test-------
// Apis.instance("wss://bitshares.openledger.info/ws", true).init_promise.then((res) => {
/* Apis.instance("wss://bit.btsabc.org/ws", true).init_promise.then((res) => {
    console.log("connected to:", res[0].network);
    ChainStore.init().then(() => {
        //ChainStore.subscribe(updateState);
        //ChainStore.subscribe(getObject);
       // ChainStore.subscribe(getBitcrabAccount);
       // ChainStore.subscribe(listAccountBalances);
        ChainStore.subscribe(listAccountHistory);
    })
}); */
// -----------------for test---------

class QueryChainStore {
  constructor () {
    this.state = this._getInitialState()
  }

  _getInitialState () {
    return {
      new_wallet: undefined, // pending restore
      current_wallet: undefined,
      wallet_names: Immutable.Set()
    }
  }

  static getInstance () {
    if (!QueryChainStore.instance) {
      QueryChainStore.instance = new QueryChainStore()
    }
    return QueryChainStore.instance
  }

  listAccountBalances_old (name) {
    var bal = []
    // name = "dylan-1234567";
    return Apis.instance().db_api().exec('get_named_account_balances', [name, []]).then((balance_objects) => {
      var balanceJson = balance_objects
      return balanceJson
    }).then(balance_objects => {
      // console.log("balanceJson2:",balance_object);
      balance_objects.map((balance_object) => {
        // console.log("balance_object:",balance_object)
        bal.push(
          Apis.instance().db_api().exec('get_objects', [[balance_object.asset_id]]).then((asset) => {
            let amount = Number(balance_object.amount)
            amount = Utils.get_asset_amount(amount, asset[0])
            let result = Object.assign({}, balance_object, {'amount': amount, 'precision': asset[0].precision, 'symbol': asset[0].symbol})
            return result
          })
        )

        // var asset =  ChainStore.getAsset(balance_object.asset_id);
        // let amount = Number(balance_object.amount);
        // amount = Utils.get_asset_amount(amount,asset);
        // return Object.assign({},balance_object,{"amount":amount,"precision":asset.toJS().precision,"symbol":asset.toJS().symbol})
      })
      return Promise.all(bal)
    })
  }

  listAccountBalances (name) {
    var bal = []
    // name = "dylan-1234567";
    return Apis.instance().db_api().exec('get_named_account_balances', [name, []]).then((balance_objects) => {
      var balanceJson = balance_objects
      return balanceJson
    }).then(balance_objects => {
      // console.log("balanceJson2:",balance_object);
      balance_objects.map((balance_object) => {
        // console.log("balance_object:",balance_object)
        bal.push(
          Apis.instance().db_api().exec('get_objects', [[balance_object.asset_id]]).then((asset) => {
            let str_symbol = asset[0].symbol
            if (asset[0].bitasset_data_id) {
              let excludeList = ['BTWTY', 'BANCOR', 'BTCSHA', 'CROWDFUN', 'DRAGON', 'TESTME']
              if (excludeList.indexOf(asset[0].symbol) === -1) {
                str_symbol = 'NONE'
              }
            }
            let amount = Number(balance_object.amount)
            amount = Utils.get_asset_amount(amount, asset[0])
            let result = Object.assign({}, balance_object, {'amount': amount, 'precision': asset[0].precision, 'symbol': str_symbol})
            return result
          })
        )

        // var asset =  ChainStore.getAsset(balance_object.asset_id);
        // let amount = Number(balance_object.amount);
        // amount = Utils.get_asset_amount(amount,asset);
        // return Object.assign({},balance_object,{"amount":amount,"precision":asset.toJS().precision,"symbol":asset.toJS().symbol})
      })
      return Promise.all(bal)
    })
  }

  /**
     * 获取所有历史记录
     * 0 代表转账记录，4：订单撮合，1：限价单，5：创建账户
     */
  listAccountHistory (name) {
    // name = "dylan-1234567";
    // name = "1.2.446822"
    let trans_type = 0
    var accountInfo = ChainStore.getAccount(name)
    // console.log("accountInfo:"+ JSON.stringify(accountInfo))
    if (accountInfo) {
      ChainStore.fetchRecentHistory(accountInfo).then((history_objects) => {
        // console.log("history_objects:",JSON.stringify(history_objects));
        return JSON.stringify(history_objects)
      })
    } else {
      console.log('accountInfo null')
    }
  }

  // 默认为0  , 0 代表转账记录，4：订单撮合，1：限价单，5：创建账户
  listAccountHistory2 (name, trans_type = 0) {
    // name = "dylan-1234567";
    var accountInfo = ChainStore.getAccount(name)
    // console.log("accountInfo:"+ JSON.stringify(accountInfo))
    if (accountInfo) {
      let accountInfoJson = accountInfo.toJS()
      var historys = accountInfoJson.history
      // console.log("history:",historys);
      if (historys) {
        var historyJson
        if (trans_type === 100) {
          historyJson = JSON.stringify(historys)
        } else if (trans_type === '0') {
          var historyArr = []
          historys.map((history) => {
            if (history.op[0] === trans_type) {
              historyArr.push(history.op)
            }
          })
          historyJson = JSON.stringify(historyArr)
        }
        console.log('historyJson:', historyJson)
        return historyJson
      }
    }
  }

  lookupAccounts (name, limit) {
    return Apis.instance().db_api().exec('lookup_accounts', [
      name, limit
    ])
  }

  getDatabaseName (current_wallet = 'default') {
    let chain_id = Apis.instance().chain_id
    return [
      'graphene_v2',
      chain_id ? chain_id.substring(0, 6) : '',
      current_wallet
    ].join('_')
  }

  getRootDatabaseName () {
    let chain_id = Apis.instance().chain_id
    let chain_substring = chain_id ? chain_id.substring(0, 6) : ''
    return 'graphene_db' + '_' + chain_substring
  }

  deleteDatabase (databaseName) {
    var req = iDB.impl.deleteDatabase(databaseName)
    return req
  }

  importBrainkey22 (wallet_name, waleet_pw, brainkey_plaintext) {

  }

  importBrainkey (wallet_name, waleet_pw, brainkey_plaintext, callbackFun) {
    let private_key = key.get_brainPrivateKey(brainkey_plaintext)
    let pubkey = private_key.toPublicKey().toPublicKeyString()
    return Apis.instance().db_api().exec('get_key_references', [[pubkey]]).then((res) => {
      if (!res || !res.length) {
        return Promise.reject('账号不存在！')
      }
      let new_curAccountID = res[0][0]
      return Apis.instance().db_api().exec('get_accounts', [[new_curAccountID]]).then((acc_result) => {
        let new_curAccountName = acc_result[0].name

        let key = 'account'
        let curAccount = localStorage.getItem(key)

        // let pro = new Promise((resolve, reject) =>{
        //     let databaseName = this.getDatabaseName();
        //     iDB.impl.deleteDatabase(databaseName);

        //     localStorage.removeItem(key);
        //     iDB.close();
        //     return iDB.init_instance().init_promise.then(()=>{
        //         let setRoot1 = iDB.root.setProperty("wallet_names", []);
        //         let setRoot2 = iDB.root.setProperty("current_wallet", "");
        //         let setRoot3 = iDB.root.setProperty("AddressIndex", null);
        //         return Promise.all([ setRoot1, setRoot2, setRoot3 ]).then(()=>{
        //             return WalletManagerStore.init().then(()=>{
        //                 return WalletManagerStore.onSetWallet(wallet_name, waleet_pw, brainkey_plaintext).then(()=>{
        //                     let owner_private = WalletDb.generateNextKey();
        //                     let active_private = WalletDb.generateNextKey();
        //                     let transaction = WalletDb.transaction_update_keys();
        //                     let p = WalletDb.saveKeys(
        //                         [ owner_private, active_private],
        //                         //[ owner_private, active_private, memo_private ],
        //                         transaction
        //                     );
        //                     return p.catch( (error) => {
        //                         WalletDb.decrementBrainKeySequence();
        //                         WalletDb.decrementBrainKeySequence();
        //                         transaction.abort();
        //                         reject();
        //                     }).then(()=>{
        //                         AccountStore.onCreateAccount(new_curAccountName);
        //                         resolve();
        //                     });
        //                 })

        //             })
        //         })
        //     })
        // })

        if (callbackFun) {
          return callbackFun(new_curAccountName).then((res) => {
            if (res.flag === 0) {
              console.log('callbackFun success')
              return this._doImportBrainkey(wallet_name, waleet_pw, brainkey_plaintext, new_curAccountName)
            } else {
              console.log('callbackFun fail')
              return Promise.reject(res.value)
            }
          }).catch((call_err) => {
            return Promise.reject(call_err)
          })
        } else {
          console.log('NO callbackFun success')
          return this._doImportBrainkey(wallet_name, waleet_pw, brainkey_plaintext, new_curAccountName)
        }
      })
    }).catch((err) => {
      return Promise.reject(err)
    })
  }

  _doImportBrainkey (wallet_name, waleet_pw, brainkey_plaintext, new_curAccountName) {
    return new Promise((resolve, reject) => {
      let databaseName = this.getDatabaseName()
      iDB.impl.deleteDatabase(databaseName)
      let key = '__graphene__' + AccountStore._getCurrentAccountKey()
      localStorage.removeItem(key)
      iDB.close()
      return iDB.init_instance().init_promise.then(() => {
        let setRoot1 = iDB.root.setProperty('wallet_names', [])
        let setRoot2 = iDB.root.setProperty('current_wallet', '')
        let setRoot3 = iDB.root.setProperty('AddressIndex', null)
        return Promise.all([ setRoot1, setRoot2, setRoot3 ]).then(() => {
          return WalletManagerStore.init().then(() => {
            return WalletManagerStore.onSetWallet(wallet_name, waleet_pw, brainkey_plaintext).then(() => {
              let owner_private = WalletDb.generateNextKey()
              let active_private = WalletDb.generateNextKey()
              let transaction = WalletDb.transaction_update_keys()
              let p = WalletDb.saveKeys(
                [ owner_private, active_private],
                // [ owner_private, active_private, memo_private ],
                transaction
              )
              return p.catch((error) => {
                WalletDb.decrementBrainKeySequence()
                WalletDb.decrementBrainKeySequence()
                transaction.abort()
                reject()
              }).then(() => {
                AccountStore.onCreateAccount(new_curAccountName)
                resolve()
              })
            })
          })
        })
      })
    })
  }

  // 查询交易列表
  getTransferList (name, start, limit = 5) {
    if (start == '' || start == null) {
      start = '1.11.0'
    } else {
      let start_index = start.lastIndexOf('.') + 1
      var start_num = parseInt(start.slice(start_index)) - 1
      start = '1.11.' + start_num
    }
    return Apis.instance().db_api().exec('get_account_by_name', [name]).then((res_account) => {
      return Apis.instance().history_api().exec('get_account_history', [res_account.id, '1.11.0', 5, start]).then((res) => {
        return Promise.all(res.map(this.getTransferListResult)).then((res_obj) => {
          return res_obj.filter(function (item) {
            return item !== null
          })
        })
      })
    })
  }

  getTransferListResult (res) {
    if (res.op[0] !== 0) {
      return null
    }
    let result = {}
    let history_id = res.id
    let form_id = res.op[1].from
    let to_id = res.op[1].to
    let amount_asset_id = res.op[1].amount.asset_id
    let amount = res.op[1].amount.amount
    let block_num = res.block_num
    let trx_in_block = res.trx_in_block
    return new Promise((resolve, reject) => {
      Apis.instance().db_api().exec('get_objects', [[form_id, to_id, amount_asset_id], true]).then((r) => {
        result['history_id'] = history_id
        result['from_name'] = r[0].name
        result['from_id'] = form_id
        result['to_name'] = r[1].name
        result['to_id'] = to_id
        result['amount_id'] = amount_asset_id
        result['amount_name'] = r[2].symbol
        result['amount_precision'] = r[2].precision
        result['amount'] = amount
        result['real_amount'] = amount / Math.pow(10, r[2].precision)
        result['block_num'] = block_num
        result['trx_in_block'] = trx_in_block
        resolve(result)
      })
    })
  }

  is_account_name_error (value, allow_too_short = null) {
    var i, label, len, length, ref, suffix
    if (allow_too_short == null) {
      allow_too_short = false
    }
    suffix = '账户名称'
    if (this.is_empty(value)) {
      return suffix + '不能为空.'
    }
    length = value.length
    if (!allow_too_short && length < 3) {
      return suffix + '长度要大于3.'
    }
    if (length > 63) {
      return suffix + '长度要小于63.'
    }
    if (/\./.test(value)) {
      suffix = '账户名称应该'
    }
    ref = value.split('.')
    for (i = 0, len = ref.length; i < len; i++) {
      label = ref[i]
      if (!/^[~a-z]/.test(label)) {
        return suffix + '以字母开头.'
      }
      if (!/^[~a-z0-9-]*$/.test(label)) {
        return suffix + '只有字母、数字或破折号.'
      }
      if (/--/.test(label)) {
        return suffix + '只有一个破折号.'
      }
      if (!/[a-z0-9]$/.test(label)) {
        return suffix + '以字母或数字结尾.'
      }
      if (!(label.length >= 3)) {
        return suffix + '长度大于3'
      }
    }
    return null
  }

  is_empty (value) {
    return value == null || value.length === 0
  }

  is_cheap_name (account_name) {
    return (/[0-9-]/.test(account_name) || !/[aeiouy]/.test(account_name)
    )
  }

  // // 根据资产喂价进行计算(抵押物喂价 / 法币的喂价)
  // // 抵押物喂价信息，抵押物小数位数，要借款的法币的喂价信息，要借款的法币的小数位数
  // // 喂价信息的计算：quote/base
  // // collateral_feed.quote.amount / collateral_feed.base.amount / (borrow_feed.base.amount  / borrow_feed.quote.amount)
  // calcFeedPrice_asset (collateral_feed, collateral_precision, borrow_feed, borrow_precision) {
  //   // let zos_asset = ChainStore.getObject('1.3.0')
  //   // let zos_precision = zos_asset.get("precision")
  //   if (collateral_feed.quote.amount === 0 || collateral_feed.base.amount === 0 || borrow_feed.quote.amount === 0 || borrow_feed.base.amount === 0) {
  //     return 0
  //   }
  //   // quote是zos，base是此货币
  //   let feed_price = parseInt(collateral_feed.quote.amount) * Math.pow(10, collateral_precision) * parseInt(borrow_feed.base.amount) / parseInt(collateral_feed.base.amount) / Math.pow(10, borrow_precision) / parseInt(borrow_feed.quote.amount)
  //   if(collateral_precision > )
  //   return feed_price.toFixed(collateral_precision)
  // }
  // 根据抵押喂价进行计算
  // 喂价信息，抵押物小数位数，要借款的法币的小数位数
  // Eric
  calcFeedPrice (feed, base_id, base_precision, quote_id, quote_precision) {
    if (!feed) {
      return 0
    }
    if (feed.quote.amount === 0 || feed.base.amount === 0) {
      return 0
    }
    let base_amount = feed.base.amount
    let quote_amount = feed.quote.amount
    if (feed.base.asset_id === quote_id) {
      base_amount = feed.quote.amount
      quote_amount = feed.base.amount
    }
    // quote是抵押货币，base是可借贷货币 千万注意 base * quote 避免两次除法造成的精度问题 Eric
    var feed_price = (parseInt(base_amount) * Math.pow(10, quote_precision)) / (parseInt(quote_amount) * Math.pow(10, base_precision))
    if (base_precision - quote_precision >= 0) {
      return feed_price.toFixed(base_precision)
    } else {
      return feed_price.toFixed(quote_precision)
    }
  }
  calcFeedPriceView (feed, base_id, base_precision, quote_id, quote_precision) {
    if (!feed) {
      return 0
    }
    if (feed.quote.amount === 0 || feed.base.amount === 0) {
      return 0
    }
    let base_amount = feed.base.amount
    let quote_amount = feed.quote.amount
    if (feed.base.asset_id === quote_id) {
      base_amount = feed.quote.amount
      quote_amount = feed.base.amount
    }
    // quote是抵押货币，base是可借贷货币 千万注意 base * quote 避免两次除法造成的精度问题 Eric
    var feed_price = (parseInt(quote_amount) * Math.pow(10, base_precision)) / (parseInt(base_amount) * Math.pow(10, quote_precision))
    if (base_precision - quote_precision >= 0) {
      return feed_price.toFixed(base_precision)
    } else {
      return feed_price.toFixed(quote_precision)
    }
  }
  // 获取订单投资进度
  // 返回百分比（数字）和目前投资额（数字）
  get_invest_process (order_id) {
    return Apis.instance().bitlender_api().exec('get_invest_process', [order_id]).then(res_pro => {
      let result = {}
      let all_amount = res_pro[0].amount
      let amount = res_pro[1].amount
      let process = (parseInt(amount) / parseInt(all_amount) * 100).toFixed(4)
      result['process'] = process
      result['amount'] = amount
      return result
    })
  }

  // 通过借款数量、id和抵押物id,获取当前喂价下的抵押物（数量，id）
  get_loan_collateralize (loan_asset_id, loan_asset_amount, collateralize_id) {
    let loan_asset = {}
    loan_asset['amount'] = loan_asset_amount
    loan_asset['asset_id'] = loan_asset_id
    return Apis.instance().bitlender_api().exec('get_loan_collateralize', [loan_asset, collateralize_id]).then(res => {
      return Promise.resolve(res)
    }).catch(error => {
      console.log(error)
      return Promise.reject(error)
    })
  }

  // 对身份进行签名
  signAuthInfo (account_id) {
    let tr = new TransactionBuilder()
    tr.add_type_operation('custom', {
      fee: {
        amount: 0,
        asset_id: '1.3.0'
      },
      payer: account_id,
      required_auths: new Set(account_id),
      id: 9999,
      data: []
    })
    return WalletDb.process_transaction(tr, null, true, [], confirm)
  }

  // 对trx进行签名
  signTrx (account_id, trx_param) {
    let tr = new TransactionBuilder()
    tr.add_type_operation('custom', {
      fee: {
        amount: 0,
        asset_id: '1.3.0'
      },
      payer: account_id,
      required_auths: new Set(account_id),
      id: 9999,
      data: trx_param
    })
    return WalletDb.process_transaction(tr, null, true, [], confirm)
  }

  limitByPrecision (value, p = 8) {
    if (typeof p !== 'number') throw new Error('Input must be a number')
    let valueString = value.toString()
    let splitString = valueString.split('.')
    if (
      splitString.length === 1 ||
            (splitString.length === 2 && splitString[1].length <= p)
    ) {
      return parseFloat(valueString)
    } else {
      return parseFloat(splitString[0] + '.' + splitString[1].substr(0, p))
    }
  }

  // 获取实际的数据
  getRealNum (amount, precision) {
    let satoshi = Math.pow(10, precision)
    let toSats = Math.round(1 * satoshi)
    return this.limitByPrecision(
      (amount / toSats).toFixed(precision),
      precision
    )
  }

  // 查询历史列表
  getHistoryList (account_id, start, limit = 10) {
    if (start == '' || start == null) {
      start = '1.11.0'
    } else {
      let start_index = start.lastIndexOf('.') + 1
      var start_num = parseInt(start.slice(start_index)) - 1
      start = '1.11.' + start_num
    }
    return Apis.instance().history_api().exec('get_account_history', [account_id, '1.11.0', limit, start]).then((res) => {
      return res
    })
  }

  // 选择节点使用功能
  getNode (node) {
    let settingsStore = SettingsStore.getInstance()
    return {
      name: node.location || 'Unknown location',
      url: node.url,
      up: node.url in settingsStore.apiLatencies,
      ping: settingsStore.apiLatencies[node.url],
      hidden: !!node.hidden
    }
  }

  // 选择节点使用功能
  getNodeIndexByURL (url) {
    let settingsStore = SettingsStore.getInstance()
    let apiServer = settingsStore.defaults.apiServer
    let index = apiServer.findIndex(node => node.url === url)
    if (index === -1) {
      return null
    }
    return index
  }

  // 选择节点使用功能
  getCurrentNodeIndex () {
    let settingsStore = SettingsStore.getInstance()
    let currentNode = this.getNodeIndexByURL(settingsStore.settings.get('apiServer'))

    return currentNode
  }

  // 用户信息存储到本地时使用
  // （动作）更新用户信息
  get_encode_memo (
    account_id, // 用户ID
    fix_account_name, // 固定用户
    memo, // 用户信息，json串
    type
  ) {
    memo = memo ? new Buffer(memo, 'utf-8') : memo
    return Promise.all([
      FetchChain('getAccount', account_id, 5000),
      FetchChain('getAccount', fix_account_name)
    ]).then(res => {
      let chain_memo_sender = res[0]
      let chain_to_memo_sender = res[1]
      let memo_from_privkey
      let memo_from_public, memo_to_public
      if (memo) {
        if (type === 0) {
          memo_from_public = chain_memo_sender.getIn(['options', 'memo_key'])
          memo_to_public = chain_to_memo_sender.getIn(['options', 'memo_key'])
        } else if (type === 1) {
          memo_from_public = chain_memo_sender.getIn(['options', 'auth_key'])
          memo_to_public = chain_to_memo_sender.getIn(['options', 'auth_key'])
        }
        if (/111111111111111111111/.test(memo_from_public) || /6FUsQ2hYRj1JSvabewWfUWTXyoDq6btmfLFjmXwby5GJgzEvT5/.test(memo_from_public)) {
          memo_from_public = null
        }         

        if (/111111111111111111111/.test(memo_to_public) || /6FUsQ2hYRj1JSvabewWfUWTXyoDq6btmfLFjmXwby5GJgzEvT5/.test(memo_to_public)) {
          memo_to_public = null
        }

        memo_from_privkey = WalletDb.getPrivateKey(
          memo_from_public
        )

        if (!memo_from_privkey) {
          throw new Error(
            'Missing private memo key for sender: ' +
                            account_id
          )
        }
      }
      let memo_object
      if (memo && memo_to_public && memo_from_public) {
        let nonce = TransactionHelper.unique_nonce_uint64()
        memo_object = {
          from: memo_from_public,
          to: memo_to_public,
          nonce,
          message: Aes.encrypt_with_checksum(
            memo_from_privkey,
            memo_to_public,
            nonce,
            memo
          )
        }
      }
      return Promise.resolve(memo_object)
    })
  }

  // 加密Pin码
  encodePin_old (
    pin_password,
    account_password
  ) {
    var crypt = new CryptUtil()
    crypt.init(pin_password)
    var enc_pw = crypt.encrypt(account_password, 0) // 加密
    return enc_pw
  }

  // 加密Pin码
  encodePin (key, data) {
    let len = key.length
    if (len < 16) {
      let str = String.fromCharCode(127)
      let pos = 16 - len
      for (var i = 0; i < pos; i++) {
        key = key + str
      }
    }
    let keys = key
    keys = keys.substr(0, 16)
    var cipher = crypto.createCipheriv('aes-128-cbc', keys, keys)
    var crypted = cipher.update(data, 'utf8', 'binary')
    crypted += cipher.final('binary')
    crypted = new Buffer(crypted, 'binary').toString('base64')
    return crypted
  };

  // 解密Pin码
  decodePin_old (
    pin_password,
    enc_pw
  ) {
    var crypt = new CryptUtil()
    crypt.init(pin_password)
    var account_password = crypt.decrypt(enc_pw, 0) // 解密
    return account_password
  }

  // 解密Pin码
  decodePin (key, crypted) {
    try {
      let len = key.length
      if (len < 16) {
        let str = String.fromCharCode(127)
        let pos = 16 - len
        for (var i = 0; i < pos; i++) {
          key = key + str
        }
      }
      let keys = key
      keys = keys.substr(0, 16)
      crypted = new Buffer(crypted, 'base64').toString('binary')
      var decipher = crypto.createDecipheriv('aes-128-cbc', keys, keys)
      var decoded = decipher.update(crypted, 'binary', 'utf8')
      decoded += decipher.final('utf8')
      return decoded
    } catch (err) {
      return false
    }
  };

  // 返回随机密码
  get_random_password () {
    let ps = ('P' + key.get_random_key().toWif()).substr(0, 45)
    return ps
  }

  // 获取处理时区后的时间
  getTimezoneDate (date_string) {
    if (date_string === undefined || date_string === null || date_string.length <= 0) return 'N/A'
    if (date_string[date_string.length - 1] !== 'Z') date_string = date_string + 'Z'
    let date_obj = new Date(date_string)
    if (date_obj.getTime() <= 0) {
      return 'N/A'
    }
    return this.formatDate(date_obj)
  }

  // 日期格式化
  // date: Date对象
  formatDate (date, fmt = 'yyyy-MM-ddThh:mm:ss') { // author: meizz
    var o = {
      'M+': date.getMonth() + 1, // 月份
      'd+': date.getDate(), // 日
      'h+': date.getHours(), // 小时
      'm+': date.getMinutes(), // 分
      's+': date.getSeconds(), // 秒
      'q+': Math.floor((date.getMonth() + 3) / 3), // 季度
      'S': date.getMilliseconds() // 毫秒
    }
    if (/(y+)/.test(fmt)) { fmt = fmt.replace(RegExp.$1, (date.getFullYear() + '').substr(4 - RegExp.$1.length)) }
    for (var k in o) { 
      if (new RegExp('(' + k + ')').test(fmt)) { fmt = fmt.replace(RegExp.$1, (RegExp.$1.length === 1) ? (o[k]) : (('00' + o[k]).substr(('' + o[k]).length))) }
    }
    return fmt
  }
  memfromImmutableObj (memo) {
    if (!memo) return undefined

    let from1 = memo.get('from')
    let to1 = memo.get('to')
    let nonce1 = memo.get('nonce')
    let message1 = memo.get('message')

    return {from: from1, to: to1, nonce: nonce1, message: message1}
  }
  // 修改链上密码所需要的函数
  permissionsFromImmutableObj (auths) {
    let threshold = auths.get('weight_threshold')
    let account_auths = auths.get('account_auths')
    let key_auths = auths.get('key_auths')
    let address_auths = auths.get('address_auths')

    let accounts = account_auths.map(a => a.get(0))
    let keys = key_auths.map(a => a.get(0))
    let addresses = address_auths.map(a => a.get(0))

    let weights = account_auths.reduce((res, a) => {
      res[a.get(0)] = a.get(1)
      return res
    }, {})
    weights = key_auths.reduce((res, a) => {
      res[a.get(0)] = a.get(1)
      return res
    }, weights)
    weights = address_auths.reduce((res, a) => {
      res[a.get(0)] = a.get(1)
      return res
    }, weights)

    return {threshold, accounts, keys, addresses, weights}
  }

  // 用户登录
  accountLogin (name, password) {
    WalletDb.onLock()
    let {success} = WalletDb.validatePassword(password, true, name)
    if (!success) return false
    if (!WalletDb.isLocked()) {
      AccountStore.onSetPasswordAccount(name)
      let acc = ChainStore.getAccount(name, false)
      if (acc) {
        return acc.get('id')
      } else {
        return false
      }
    } else {
      return false
    }
  }

  // 修改链上密码所需要的函数
  permissionsToJson (threshold, accounts, keys, addresses, weights) {
    let res = {weight_threshold: threshold}
    res['account_auths'] = accounts
      .sort(Utils.sortID)
      .map(a => [a, weights[a]])
      .toJS()
    res['key_auths'] = keys
      .sort(Utils.sortID)
      .map(a => [a, weights[a]])
      .toJS()
    res['address_auths'] = addresses
      .sort(Utils.sortID)
      .map(a => [a, weights[a]])
      .toJS()
    return res
  }

  //
  didChange (type, s) {
    if (type === 'memo') {
      return s.memo_key !== s.prev_memo_key
    }
    if (type === 'auth') {
      return s.auth_key !== s.prev_auth_key
    }
    let didChange = false;
    ['_keys', '_active_addresses', '_accounts', '_threshold'].forEach(
      key => {
        let current = type + key
        // if(s[current] && s["prev_" + current]) {
        //     if (Immutable.is(s[current].asImmutable, s["prev_" + current].asImmutable)) {
        //         didChange = true;
        //     }

        // }
        if (s[current] !== s['prev_' + current]) {
          //console.log('didChange-true')
          didChange = true
        }
      }
    )
    return didChange
  }

  //
  isValidPubKey (value) {
    return !!PublicKey.fromPublicKeyString(value)
  }

  static get_vote_objects (type = 'witnesses', vote_ids, res_data) {
    let current = res_data
    return FetchChain('getObject', '2.0.0').then(globalObject => {
      const isWitness = type === 'witnesses'
      let lastIdx
      if (!vote_ids) {
        vote_ids = []
        let active = globalObject.get(
          isWitness ? 'active_witnesses' : 'active_committee_members'
        )
        const lastActive = active.last() || `1.${isWitness ? '6' : '5'}.1`
        lastIdx = parseInt(lastActive.split('.')[2], 10)
        for (var i = 1; i <= lastIdx + 10; i++) {
          vote_ids.push(`1.${isWitness ? '6' : '5'}.${i}`)
        }
      } else {
        lastIdx = parseInt(vote_ids[vote_ids.length - 1].split('.')[2], 10)
      }
      return FetchChainObjects(ChainStore.getObject, vote_ids, 5000, {}).then(
        vote_objs => {
          res_data = current.concat(
            Immutable.List(
              vote_objs
                .filter(a => !!a)
                .map(a =>
                  a.get(
                    isWitness
                      ? 'witness_account'
                      : 'committee_member_account'
                  )
                )
            )
          )
          if (vote_objs[vote_objs.length - 1]) {
            // there are more valid vote objs, fetch more
            vote_ids = []
            for (var i = lastIdx + 11; i <= lastIdx + 20; i++) {
              vote_ids.push(`1.${isWitness ? '6' : '5'}.${i}`)
            }
            return this.get_vote_objects(type, vote_ids, res_data)
          } else {
            return res_data
          }
        }
      )
    })
  }

  // 获取核心资产的信息
  get_core_asset_info () {
    let base = {amount: 100, asset_id: '1.3.0'}
    let quote = {amount: 100, asset_id: '1.3.0'}
    let zos_asset = ChainStore.getObject('1.3.0')
    let zos_precision = zos_asset.get('precision')
    let collateral_feed = {base, quote}
    let result = {}
    result['maintenance_collateral_ratio'] = 1
    result['maximum_short_squeeze_ratio'] = 1
    result['maintenance_collateral_cash_ratio'] = 1
    result['maximum_short_squeeze_cash_ratio'] = 1
    result['precision'] = zos_precision
    result['feed'] = collateral_feed
    return result
  }

  // 查找需要同意或拒绝的账号和Key列表
  // 参数：
  // propos_id: 提案ID
  // type: 0-批准提案；1-否决提案
  get_propos_required_list (propos_id, op_type = 0) {
    // FetchChain 会导致提案同意，再否决，再同意的时候，找不到当前操作人，应该为Apis直接查找
    return FetchChain('getObject', propos_id).then(propos => {
      let type = propos.get('required_active_approvals').size ? 'active' : 'owner'
      let str_required = 'required_' + type + '_approvals'
      let str_available = 'available_' + type + '_approvals'
      let str_key = 'available_key_approvals'
      let required = pu.listToIDs(propos.get(str_required))
      let available = pu.listToIDs(propos.get(str_available))
      let availableKeys = pu.listToIDs(propos.get(str_key))
      let requiredPermissions = pu.unnest(required, type)

      let finalRequired = []
      requiredPermissions.forEach(account => {
        finalRequired = finalRequired.concat(
          account.getMissingSigs(available)
        )
      })

      let finalRequiredKeys = []
      requiredPermissions.forEach(account => {
        finalRequiredKeys = finalRequiredKeys.concat(
          account.getMissingKeys(availableKeys)
        )
      })
      let accounts = []
      let keys = []
      let isAdd = op_type === 0
      if (isAdd) {
        accounts = finalRequired
        keys = finalRequiredKeys
      } else {
        accounts = available
        keys = availableKeys
      }
      let accountMap = {}
      let accountNames = []
      if (accounts.length) {
        accounts.forEach(accountID => {
          let account = ChainStore.getAccount(accountID)
          let accountCheck = isAdd
            ? account &&
                      !propos
                        .get(str_available)
                        .includes(account.get('id'))
            : account &&
                      propos
                        .get(str_available)
                        .includes(account.get('id'))
          if (accountCheck) {
            accountMap[account.get('name')] = account.get('id')
            accountNames.push(account.get('name'))
          }
        })
      }
      let keyNames = []
      let keyMap = {}
      if (keys.length) {
        keys.forEach(key => {
          let isMine = AccountStore.isMyKey(key)
          if (
            isMine &&
                        !propos.get('available_key_approvals').includes(key)
          ) {
            keyMap[key] = true
            keyNames.push(key)
          }
        })
      }
      let result = {}
      result['accounts_map'] = accountMap // 用户账号列表对象；{'账号':'ID','账号':'ID',...}
      result['accounts_ary'] = accountNames // 用户账号名字列表数组
      result['keys_ary'] = keyNames // 用户公钥列表数组 ['key', 'key',...]
      result['keys_map'] = keyMap // 用户公钥列表对象
      return result
    })
  }

  getPrettyNameFee (account_name) {
    let tr = new TransactionBuilder()
    let transfer_op = tr.get_type_operation('account_create', {
      fee: {
        amount: 0,
        asset_id: 0
      },
      registrar: '1.2.1',
      referrer: '1.2.1',
      referrer_percent: 0,
      name: account_name,
      // captcha: captcha,
      // captchaid: captchaid,
      owner: {
        weight_threshold: 1,
        account_auths: [],
        key_auths: [['ZOS6B1taKXkDojuC1qECjvC7g186d8AdeGtz8wnqWAsoRGC6RY8Rp', 1]],
        address_auths: []
      },
      active: {
        weight_threshold: 1,
        account_auths: [],
        key_auths: [['ZOS6B1taKXkDojuC1qECjvC7g186d8AdeGtz8wnqWAsoRGC6RY8Rp', 1]],
        address_auths: []
      },
      limitactive: {
        weight_threshold: 1,
        account_auths: [],
        key_auths: [['ZOS6B1taKXkDojuC1qECjvC7g186d8AdeGtz8wnqWAsoRGC6RY8Rp', 1]],
        address_auths: []
      },
      options: {
        memo_key: 'ZOS6B1taKXkDojuC1qECjvC7g186d8AdeGtz8wnqWAsoRGC6RY8Rp',
        auth_key: 'ZOS6B1taKXkDojuC1qECjvC7g186d8AdeGtz8wnqWAsoRGC6RY8Rp',
        voting_account: '1.2.5',
        num_witness: 0,
        num_committee: 0,
        num_budget: 0,
        votes: []
      }
    })
    var operations = []
    operations.push(ops.operation.toObject(transfer_op))
    return Apis.instance().db_api().exec('get_required_fees', [operations, '1.3.0']).then(res => {
      let res_asset = ChainStore.getObject('1.3.0')
      let res_precision = res_asset.get('precision')
      let res_symbol = res_asset.get('symbol')
      res[0]['precision'] = res_precision
      res[0]['symbol'] = res_symbol
      return Promise.resolve(res)
    })
  }
}
var QueryChainStoreWrapped = QueryChainStore.getInstance()
export default QueryChainStoreWrapped
