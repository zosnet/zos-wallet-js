import {Apis, Manager} from 'zosjs-ws'
import {ChainStore, FetchChain, ops, TransactionBuilder, Aes} from 'zosjs/es'
import iDB from './idb-instance.js'
import WalletDb from './WalletDb.js'
import WalletManagerStore from './WalletManagerStore.js'
import WalletActions from './WalletActions.js'
import AccountStore from './AccountStore.js'
import ApplicationApi from './ApplicationApi.js'
import LendInstance from './LendInstance.js'

import PrivateKeyStore from './PrivateKeyStore.js'
// import Transfer from './Transfer.js'
import QueryChainStore from './QueryChainStore.js'
import Utils from './lib/common/utils.js'
// import Immutable from 'immutable'
import AccountRefsStore from './AccountRefsStore.js'
import {
  checkFeeStatusAsync,
  // checkBalance,
  shouldPayFeeWithAssetAsync
} from './lib/common/trxHelper.js'
// import assetConstants from './lib/chain/asset_constants.js'
import async from 'async'
import SettingsStore from './SettingsStore.js'
import willTransitionTo from './routerTransition.js'
import WalletUnlockStore from './WalletUnlockStore.js'

let newpay_password = 'newpaypassword987654321'
const autoSelectAPI = 'wss://fake.automatic-selection.com'
let replaceUrl = ''

class ZosInstance {
  // static getInstance() {
  //        if (!NewpayInstance.instance) {
  //            NewpayInstance.instance = new NewpayInstance();
  //        }
  //        return NewpayInstance.instance;
  //    }

  // 初始化
  // 参数：settingsAPIs: commonAll.js 中的 settingsAPIs
  static init (settingsAPIs, callback, errCallback = null) {
    let settingsStore = SettingsStore.getInstance(settingsAPIs)
    willTransitionTo(null, null, callback, true, errCallback)
  }

  // 初始化
  static init_old (connection_url) {
    let urls = [connection_url]
    let connectionManager = new Manager({url: connection_url, urls})
    return connectionManager.connectWithFallback(true).then(() => {
      iDB.close()
      let db = iDB.init_instance(indexedDB).init_promise
      return Promise.all([db]).then(() => {
        return Promise.all([
          PrivateKeyStore.onLoadDbData().then(() => {
            AccountRefsStore.loadDbData()
          }),
          WalletDb.loadDbData(),
          WalletManagerStore.init()
        ]).then(() => {
          return ChainStore.init().then(() => {
            return Promise.all([
              AccountStore.loadDbData(Apis.instance().chainId)
            ]).then(() => {
              AccountStore.tryToSetCurrentAccount()
              let key = '__graphene__' + AccountStore._getCurrentAccountKey('passwordAccount')
              let cur_account = JSON.parse(localStorage.getItem(key))
              if (cur_account) {
                // 向节点订阅 目前登录账户 的信息
                ChainStore.getAccount(cur_account, true)
              }
              // 向节点订阅 1.3.0 的资产信息
              return FetchChain('getObject', '1.3.0').then(coreObject => {
                ChainStore.getObject('2.1.0')
                return true
              })
            }).catch(error => {
              console.log('[ZosInstance.js] ----- ERROR ----->', error)
              return Promise.reject(error)
            })
          }).catch(error => {
            console.log('[ZosInstance.js] ----- ChainStore.init error ----->', error)
            return Promise.reject(error)
          })
        })
      })
    })
  }

  // 创建账户和密码
  static createAccountWithPassword (name, password, faucet_url, referrer, captcha, captchaid, proposal_registrar) {
    return WalletActions.createAccountWithPassword(
      name,
      password,
      null,
      referrer,
      0,
      null,
      faucet_url,
      captcha,
      captchaid,
      proposal_registrar
    ).then((res) => {
      if (res.account.proposal) {
        let result = {}
        result['name'] = name
        result['proposal'] = res.account.proposal
        return Promise.resolve(result)
      }
      // let accountInfo = ''
      AccountStore.onSetPasswordAccount(name)
      let result = {}
      result['name'] = name
      return Promise.resolve(result)

      // const reader = res.body.getReader();
      // const stream = new ReadableStream({
      //     start(controller) {
      //       // 下面的函数处理每个数据块
      //       function push() {
      //         // "done"是一个布尔型，"value"是一个Unit8Array
      //         reader.read().then(({ done, value }) => {
      //           // 判断是否还有可读的数据？
      //           if (done) {
      //             // 告诉浏览器已经结束数据发送。
      //             let accountJs = JSON.parse(accountInfo);
      //             return Promise.resolve(accountJs.account.id);
      //           }

      //           // 取得数据并将它通过controller发送给浏览器。
      //           // controller.enqueue(value);
      //           accountInfo = new TextDecoder("utf-8").decode(value)
      //         push();
      //       });
      //       };
      //       push();
      //     }
      // });
      // return new Response(stream, { headers: { "Content-Type": "application/json" } });

      // 获取ID有问题
      // return FetchChain("getAccount", name, undefined, {
      //         [name]: true
      //     }).then((res) => {
      //         WalletDb.validatePassword(password, true, name);
      //         return Promise.resolve(res.get('id'));
      //     });
    }).catch(error => {
      console.log('ERROR AccountActions.createAccount', error)
      // let error_msg =
      //     error.base && error.base.length && error.base.length > 0
      //         ? error.base[0]
      //         : "unknown error";
      // if (error.remote_ip) error_msg = error.remote_ip[0];
      return Promise.reject(error)
    })
  }

  // 创建账户和密码
  static createAccountWithPassword_geetest (name, password, faucet_url, referrer, proposal_registrar, geetest_challenge, geetest_validate, geetest_seccode, user_token) {
    return WalletActions.createAccountWithPassword_geetest(
      name,
      password,
      null,
      referrer,
      0,
      null,
      faucet_url,
      proposal_registrar,
      geetest_challenge,
      geetest_validate,
      geetest_seccode,
      user_token
    ).then((res) => {
      if (res.account.proposal) {
        let result = {}
        result['name'] = name
        result['proposal'] = res.account.proposal
        return Promise.resolve(result)
      }
      // let accountInfo = ''
      AccountStore.onSetPasswordAccount(name)
      let result = {}
      result['name'] = name
      return Promise.resolve(result)
    }).catch(error => {
      console.log('ERROR AccountActions.createAccount', error)
      // let error_msg =
      //     error.base && error.base.length && error.base.length > 0
      //         ? error.base[0]
      //         : "unknown error";
      // if (error.remote_ip) error_msg = error.remote_ip[0];
      return Promise.reject(error)
    })
  }

  // 创建钱包和账户
  static createWalletAndAccount (walletName, accountName, faucet_url, password = '') {
    if (password === '') {
      password = newpay_password
    }
    let key = '__graphene__' + AccountStore._getCurrentAccountKey('passwordAccount')
    let databaseName = QueryChainStore.getDatabaseName()
    iDB.impl.deleteDatabase(databaseName)
    localStorage.removeItem(key)
    iDB.close()
    return iDB.init_instance().init_promise.then(() => {
      let setRoot1 = iDB.root.setProperty('wallet_names', [])
      let setRoot2 = iDB.root.setProperty('current_wallet', '')
      let setRoot3 = iDB.root.setProperty('AddressIndex', null)
      return Promise.all([ setRoot1, setRoot2, setRoot3 ]).then(() => {
        return WalletManagerStore.init().then(() => {
          return WalletManagerStore.onSetWallet(walletName, password).then(() => { // 钱包的名字 ，钱包的密码六位密码
            console.log('Congratulations, your wallet was successfully created.')

            return WalletActions.createAccount(accountName, null, null, 0, null, faucet_url).then(
              AccountStore.onCreateAccount(accountName)
            ).then(() => {
              return FetchChain('getAccount', name)
            }).catch(error => {
              console.log('ERROR AccountActions.createAccount', error)
              let error_msg = error.base && error.base.length && error.base.length > 0 ? error.base[0] : 'unknown error'
              if (error.remote_ip) error_msg = error.remote_ip[0]
              return Promise.reject(error_msg)
            })
          })
        })
      })
    })
  }
  static is_enc_memo (fromAccount, toAccount) {
    let application_api = new ApplicationApi()
    return application_api.is_enc_memo(
      fromAccount,
      toAccount
    ).then((result) => {
      // console.log(result)
      return Promise.resolve(result)
    }).catch(error => {
      console.log(error)
      return Promise.reject(error)
    })
  }
  // 转账
  static transfer (fromAccount, toAccount, amount, asset_id, memo) {
    let application_api = new ApplicationApi()
    return application_api.transfer(
      fromAccount,
      toAccount,
      amount, // 为用户输入的数字乘以此资产类型的精度
      asset_id,
      memo
    ).then((result) => {
      // console.log(result)
      return Promise.resolve(result)
    }).catch(error => {
      console.log(error)
      return Promise.reject(error)
    })
  }

  // 获取估计手续费
  // Ella 同步有问题，如果费用不是 1.3.0 没有订阅就出问题了
  static getAboutFee (accountName, fee_asset_id = '1.3.0', type = 'transfer', memo = '') {
    return FetchChain('getAccount', accountName).then((from_account) => {
      let fee_balance = ChainStore.getAccountBalance(from_account, fee_asset_id)
      return checkFeeStatusAsync({
        accountID: from_account.get('id'),
        feeID: fee_asset_id,
        type: type,
        options: ['price_per_kbyte'],
        data: {
          type: 'memo',
          content: memo
        }
      }).then(({fee, hasBalance, hasPoolBalance}) => {
        let asset = ChainStore.getObject(fee_asset_id)
        return shouldPayFeeWithAssetAsync(from_account, fee).then(
          should => {
            let result = {}
            result['feeAmount'] = fee
            result['hasBalance'] = hasBalance && hasPoolBalance
            result['precision'] = asset.get('precision')
            result['symbol'] = asset.get('symbol')
            result['fee_balance'] = fee_balance
            result['zos_balance'] = fee_balance
            return Promise.resolve(result)
          }
        )
      }).catch(error => {
        return Promise.reject(error)
      })
    })
  }

  // 转账不广播，返回Transaction
  static transferNoBroadcast (fromAccount, toAccount, amount, asset_id, memo, fee_asset_id = '1.3.0') {
    let application_api = new ApplicationApi()
    return application_api.transfer(
      fromAccount,
      toAccount,
      amount, // 为用户输入的数字乘以此资产类型的精度
      asset_id,
      memo,
      true,
      true,
      null,
      null,
      fee_asset_id,
      true

    ).then((tr) => {
      let asset = ChainStore.getObject(fee_asset_id)
      let tran_ser = tr.serialize()
      let fee_obj = {}
      fee_obj['fee_amount'] = tran_ser.operations[0][1].fee.amount
      fee_obj['fee_asset_id'] = tran_ser.operations[0][1].fee.asset_id
      fee_obj['fee_precision'] = asset.get('precision')
      let result = {}
      result['tr'] = tr
      result['fee'] = fee_obj
      return Promise.resolve(result)
    }).catch(error => {
      console.log(error)
      return Promise.reject(error)
    })
  }

  // 提交交易,主要用于多笔交易一起提交
  static process_transaction (tr) {
    return WalletDb.process_transaction(tr, null, true, [], true)
  }

  // 处理广播
  static broadcastTransaction (tr, errcallback) {
    let broadcast_timeout = setTimeout(() => {
      if (errcallback) {
        errcallback('Your transaction has expired without being confirmed, please try again later.')
      }
    }, 15 * 2000)
    return tr.broadcast(() => {
      // 广播成功
      console.log('broadcast success')
    }).then((res) => {
      console.log('tr end Info', res)
      clearTimeout(broadcast_timeout)
      let tr_res = {}
      tr_res['block_num'] = res[0].block_num
      tr_res['trx_num'] = res[0].trx_num
      tr_res['txid'] = tr.id()
      tr_res['fee'] = tr.serialize().operations[0][1].fee
      return Promise.resolve(tr_res)
    }).catch(error => {
      clearTimeout(broadcast_timeout)
      console.log(error)
      // messages of length 1 are local exceptions (use the 1st line)
      // longer messages are remote API exceptions (use the 1st line)
      let splitError = error.message.split('\n')
      let message = splitError[0] // 报错信息
      return Promise.reject(message)
    })
  }

  // 订阅
  static subscribe () {
    let key = '__graphene__' + AccountStore._getCurrentAccountKey('passwordAccount')
    let cur_account = JSON.parse(localStorage.getItem(key))
    if (cur_account) {
      // 向节点订阅 目前登录账户 的信息
      ChainStore.getAccount(cur_account, true)
    }
    // 向节点订阅 1.3.0 的资产信息
    ChainStore.getAsset('1.3.0')
  }

  // 账号密码模式登录
  static accountLogin (name, password) {
    return QueryChainStore.accountLogin(name, password)
  }

  // 账号密码模式登出
  static accountLoginout () {
    return WalletDb.onLock()
  }

  // 账号密码模式-是否登出
  // 返回true,表示登出
  static accountIsLoginout () {
    return WalletDb.isLocked()
  }

  // 导出脑钥
  static exportBrainKey (password = '') {
    if (password === '') {
      password = newpay_password
    }
    if (WalletDb.validatePassword(password, true)) {
      return WalletDb.getBrainKey()
    } else {
      return false
    }
  }

  // 导入脑钥
  static importBrainKey (walletName, brainkey_plaintext, callbackFun, password = '') {
    if (password === '') {
      password = newpay_password
    }
    return QueryChainStore.importBrainkey(walletName, password, brainkey_plaintext, callbackFun)
  }

  // 查询余额
  static getAccountBalances (name) {
    return Apis.instance().db_api().exec('get_named_account_balances', [name, []])
  }

  // 查找用户是否存在
  static checkAccountExists (name) {
    return Apis.instance().db_api().exec('lookup_accounts', [name, 20])
  }
  static getAccountExists (name) {
    return Apis.instance().db_api().exec('get_account_by_name', [name])
  }

  // 查找当前用户local_storage
  static getCurAccountLocalKey () {
    let key = '__graphene__' + AccountStore._getCurrentAccountKey('passwordAccount')
    return JSON.parse(localStorage.getItem(key))
  }

  // 获取转账记录
  static getTransferList (name, start) {
    return QueryChainStore.getTransferList(name, start)
  }

  // 获取转账明细(返回时间和解析后的备注)
  static getTransferInfo (block_num, trx_in_block, password = '') {
    let res_obj = {}
    if (password === '') {
      password = newpay_password
    }
    if (WalletDb.validatePassword(password, true)) {
      return Apis.instance().db_api().exec('get_transaction', [block_num, trx_in_block]).then((res) => {
        res_obj['expiration'] = res.expiration
        if (res.operations[0][1].memo) {
          // 解析备注
          res_obj['memo'] = PrivateKeyStore.decodeMemo(res.operations[0][1].memo).text
        }
        return res_obj
      })
    } else {
      return res_obj
    }
  }

  // 修改本地密码
  static changePassword (old_password, new_password) {
    if (old_password === '') {
      old_password = newpay_password
    }
    if (new_password === '') {
      new_password = newpay_password
    }
    return WalletDb.changePassword(old_password, new_password, true)
  }

  // 验证密码
  static validatePassword (password) {
    return WalletDb.validatePassword(password, true)
  }

  // 检测用户名是否合法
  static validateAccountName (accountName) {
    let info = accountName === ''
      ? '请输入一个合法账户名称'
      : QueryChainStore.is_account_name_error(accountName)
    if (!info && !QueryChainStore.is_cheap_name(accountName)) {
      info = '这是高级账户名。高级账户名的注册需要花费更多，因为无法通过免费水龙头服务进行注册。请选择其他名字，包含至少一个横杠、数字或者不含元音字母'
    }
    return info
  }

  // 获取资产列表，返回可借贷列表，可抵押货币列表
  static getAssetList () {
    let result = {}
    return Apis.instance().bitlender_api().exec('get_asset_by_property', [8 | 0x20]).then(res_loan => { // 可借贷货币
      result['cash_list'] = res_loan
      return Apis.instance().bitlender_api().exec('get_asset_by_property', [2]).then(res_lender => { // 可抵押货币
        result['lender_list'] = res_lender
        return Promise.resolve(result)
      })
    })
  }
  static getAccountPrivate (uid) {
    let result = {}
    return Apis.instance().db_api().exec('get_committee_member_by_account', [uid]).then(com => {
      result['committee_member'] = com
      return Apis.instance().db_api().exec('get_witness_by_account', [uid]).then(wit => {
        result['witness'] = wit
        return Promise.resolve(result)
      }).catch(error => {
        console.log(error)
        return Promise.reject(result)
      })
    }).catch(error => {
      console.log(error)
      return Promise.reject(result)
    })
  }
  // 获取资产列表，返回可借贷列表，可抵押货币列表
  static getAssetListByType (type = 0x00000080) {
    return Apis.instance().bitlender_api().exec('get_asset_by_property', [type]).then(res_loan => { // 可借贷货币
      return res_loan
    })
  }

  // // 获取资产列表，返回法币列表，数字货币列表
  // static getAllAssetList_old () {
  //   let result = {}
  //   return Apis.instance().bitlender_api().exec('get_asset_by_property', [8]).then(res_loan => { // 可借贷货币
  //     result['cash_list'] = res_loan
  //     return Apis.instance().bitlender_api().exec('get_asset_by_property', [2]).then(res_lender => { // 可抵押货币
  //       result['lender_list'] = res_lender
  //       return Promise.resolve(result)
  //     })
  //   })
  // }


  // // 获取喂价信息
  // // 参数：当期用户ID，抵押货币的ID、bitasset_data_id, 抵押物的精度 和法币的id，法币的精度
  // static getCollateralFeed (user_id, asset_id, bitasset_data_id, precision, borrow_id, borrow_precision) {
  //   let result = {}
  //   return Apis.instance().db_api().exec('get_asset_exchange_feed', [borrow_id, asset_id, 1]).then(res_obj => {
  //     result['balance'] = 0
  //     result['maintenance_collateral_ratio'] = 0
  //     result['maximum_short_squeeze_ratio'] = 0
  //     result['feed_price'] = null
  //     if (res_obj) {
  //       if (res_obj.current_feed) {
  //         if (res_obj.current_feed.settlement_price) {
  //           result['feed'] = res_obj.current_feed.settlement_price

  //           // let zos_asset = ChainStore.getObject('1.3.0')
  //           // let zos_precision = zos_asset.get("precision")
  //           // let col_feed =
  //           //     (parseInt(res_obj[0].current_feed.settlement_price.quote.amount) / Math.pow(10, zos_precision))
  //           //     /
  //           //     (parseInt(res_obj[0].current_feed.settlement_price.base.amount) / Math.pow(10, precision))
  //           // let bor_feed = (parseInt(borrow_feed.quote.amount) / Math.pow(10, zos_precision)) / (parseInt(borrow_feed.base.amount) / Math.pow(10, borrow_precision))

  //           // let feed_price = col_feed / bor_feed
  //           result['feed_price'] = QueryChainStore.calcFeedPrice(res_obj.current_feed.settlement_price, precision, borrow_precision)
  //         }
  //         result['maintenance_collateral_ratio'] = res_obj.current_feed.maintenance_collateral_ratio / 1000
  //         result['maximum_short_squeeze_ratio'] = res_obj.current_feed.maximum_short_squeeze_ratio / 1000
  //       }
  //     }
  //     return Promise.resolve(result)
  //   }).catch(err => {
  //     return Promise.reject(err, 'get Collateral Asset Error')
  //   })
  // }

  // // 根据拖动条（抵押率）计算需要的抵押物
  // //* 参数:借款金额，拖动条的值，抵押物喂价信息，抵押物小数位数，要借款的法币的喂价信息，要借款的法币的小数位数
  // static calcCollateralAmount_old (borrow_amount, radio_value, collateral_feed, collateral_precision, borrow_feed, borrow_precision) {
  //   let feed_price = QueryChainStore.calcFeedPrice(collateral_feed, collateral_precision, borrow_feed, borrow_precision)
  //   if (feed_price === 0) {
  //     return 0
  //   }
  //   let res = (parseInt(borrow_amount) / feed_price * radio_value).toFixed(collateral_precision)
  //   return res
  // }

  // 发起借款；不广播，返回Transaction
  static bitlender_lend_order (
    user_id,
    carrier_id, // 运营商账号
    loan_asset_id, // 借款资产ID
    loan_amount, // 借款数量
    loan_asset_precision, // 借款资产精度
    loan_period, // 借款期限
    interest_rate, // 借款利息（新增）
    repayment_type, // 还款方式
    bid_period, // 投标期限
    collateralize_ammount, // 抵押数量
    collateralize_asset_id, // 抵押资产ID
    collateralize_asset_precision, // 抵押资产精度
    collateral_rate, // 保证金倍数（滚动条选的几就是几，这边会再乘以1000）
    fee_asset_id = '1.3.0' // 手续费资产ID
  ) {
    let application_api = new ApplicationApi()
    return application_api.bitlender_lend_order(
      user_id, // 借款人ID
      carrier_id, // 运营商ID
      loan_asset_id, // 借款资产ID
      loan_amount, // 借款数量
      loan_asset_precision, // 借款资产精度
      loan_period, // 借款期限  (要不要乘以 3600*30)
      interest_rate, // 借款利息
      repayment_type, // 还款方式
      bid_period * 3600 * 24, // 投标期限
      collateralize_ammount, // 抵押数量
      collateralize_asset_id, // 抵押资产ID
      collateralize_asset_precision, // 抵押资产精度
      collateral_rate * 1000, // 保证金倍数（滚动条选的几就是几，这边会再乘以1000）
      fee_asset_id, // 手续费资产ID
      true
    ).then((tr) => {
      let asset = ChainStore.getObject(fee_asset_id)
      let tran_ser = tr.serialize()
      let fee_obj = {}
      fee_obj['fee_amount'] = parseInt(tran_ser.operations[0][1].fee.amount)
      fee_obj['fee_asset_id'] = tran_ser.operations[0][1].fee.asset_id
      fee_obj['fee_precision'] = asset.get('precision')
      let result = {}
      result['tr'] = tr
      result['fee'] = fee_obj
      return Promise.resolve(result)
    }).catch(error => {
      console.log(error)
      return Promise.reject(error)
    })
  }

  // 增加抵押
  static bitlender_add_collateral (
    user_id, // 用户ID
    order_id, //
    collateralize_ammount, // 抵押数量
    collateralize_asset_id, // 抵押资产ID
    collateralize_asset_precision, // 抵押资产精度
    collateral_rate, // 保证金倍数（滚动条选的几就是几，这边会再乘以1000）
    fee_asset_id = '1.3.0' // 手续费资产ID
  ) {
    let application_api = new ApplicationApi()
    return application_api.bitlender_add_collateral(
      user_id, // 借款人ID
      order_id, // '1.19.x'
      collateralize_ammount, // 抵押数量
      collateralize_asset_id, // 抵押资产ID
      collateralize_asset_precision, // 抵押资产精度
      (collateral_rate * 1000).toFixed(0), // 保证金倍数（滚动条选的几就是几，这边会再乘以1000）
      fee_asset_id, // 手续费资产ID
      true

    ).then((tr) => {
      let asset = ChainStore.getObject(fee_asset_id)
      let tran_ser = tr.serialize()
      let fee_obj = {}
      fee_obj['fee_amount'] = tran_ser.operations[0][1].fee.amount
      fee_obj['fee_asset_id'] = tran_ser.operations[0][1].fee.asset_id
      fee_obj['fee_precision'] = asset.get('precision')
      let result = {}
      result['tr'] = tr
      result['fee'] = fee_obj
      return Promise.resolve(result)
    }).catch(error => {
      console.log(error)
      return Promise.reject(error)
    })
  }

  // // 获取增加抵押相关(暂时没用)
  // static get_add_collateral_info (
  //   user_id, // 用户ID
  //   borrow_bitasset_asset_id, // 借款资产的bitasset_asset_id  ‘2.4.x’
  //   collateralize_bitasset_asset_id, // 抵押物资产的bitasset_asset_id    ‘2.4.x’
  //   loan_id, // 借款人ID
  //   collateralize_asset_precision, // 抵押物资产的精度，数字
  //   borrow_asset_precision, // 借款资产的精度，数字
  //   borrow_asset_id // 借款资产ID
  // ) {
  //   let result = {}
  //   // let key = "__graphene__"+AccountStore._getCurrentAccountKey("passwordAccount");
  //   // let cur_account =  JSON.parse(localStorage.getItem(key));
  //   // let account = null
  //   // if(cur_account){
  //   //     account =ChainStore.getAccount(cur_account, true)
  //   // }
  //   // if(!account){
  //   //     return Promise.reject("account is no Exists")
  //   // }
  //   return FetchChain('getAccount', user_id, 5000).then((account) => {
  //     let zos_asset = ChainStore.getObject('1.3.0')
  //     let zos_precision = zos_asset.get('precision')
  //     return Apis.instance().db_api().exec('get_objects', [[borrow_bitasset_asset_id, collateralize_bitasset_asset_id]]).then(res_obj => {
  //       result['borrow_feed'] = ''
  //       if (res_obj[0]) {
  //         if (res_obj[0].current_feed) {
  //           if (res_obj[0].current_feed.settlement_price) {
  //             result['borrow_feed'] = res_obj[0].current_feed.settlement_price
  //           }
  //         }
  //       }
  //       result['collateralize_feed'] = ''
  //       if (res_obj[1]) {
  //         if (res_obj[1].current_feed) {
  //           if (res_obj[1].current_feed.settlement_price) {
  //             result['collateralize_feed'] = res_obj[1].current_feed.settlement_price
  //           }
  //         }
  //       }
  //       // quote是zos，base是此货币
  //       let feed_price = QueryChainStore.calcFeedPrice(result['collateralize_feed'], collateralize_asset_precision, result['borrow_feed'], borrow_asset_precision)
  //       result['feed_price'] = feed_price

  //       let account_borrow_balance = ChainStore.getAccountBalance(account, borrow_asset_id)
  //       result['account_borrow_balance'] = account_borrow_balance / Math.pow(10, borrow_asset_precision) // 用户的此借款资产的余额（处理精度）

  //       let account_zos_balance = ChainStore.getAccountBalance(account, '1.3.0')
  //       result['account_zos_balance'] = account_zos_balance / Math.pow(10, zos_precision) // 用户的zos的余额（处理精度）
  //       return Promise.resolve(result)
  //     })
  //   })
  // }

  // // 获取借款订单信息（投资时使用）
  // // 不再返回借款订单的进度
  // static get_borrow_order_info (
  //   user_id,
  //   order_id, // 借款订单ID
  //   borrow_bitasset_asset_id, // 借款资产的bitasset_asset_id
  //   borrow_asset_precision, // 借款资产的精度
  //   collateralize_bitasset_asset_id, // 抵押资产的bitasset_asset_id
  //   collateralize_asset_precision, // 抵押资产的精度
  //   issuer_id, // 借款人ID
  //   borrow_asset_id, // 借款资产的ID
  //   collateralize_asset_id // 抵押资产的ID
  // ) {
  //   // 投资人姓名，可用余额，最小投资额（投资时是否要限制？）
  //   let result = {}
  //   // let key = "__graphene__"+AccountStore._getCurrentAccountKey("passwordAccount");
  //   // let cur_account =  JSON.parse(localStorage.getItem(key));
  //   // let account = null
  //   // if(cur_account){
  //   //     account =ChainStore.getAccount(cur_account, true)
  //   // }
  //   // if(!account){
  //   //     return Promise.reject("account is no Exists")
  //   // }

  //   return FetchChain('getAccount', user_id, 5000).then((account) => {
  //     let zos_asset = ChainStore.getObject('1.3.0')
  //     let zos_precision = zos_asset.get('precision')
  //     return Apis.instance().db_api().exec('get_full_accounts', [[issuer_id], false]).then(res_acc => {
  //       let account_name = res_acc[0][1].account.name
  //       result['account_name'] = account_name // 姓名
  //       let account_borrow_balance = ChainStore.getAccountBalance(account, borrow_asset_id)
  //       result['account_borrow_balance'] = account_borrow_balance / Math.pow(10, borrow_asset_precision) // 用户的此借款资产的余额（处理精度）

  //       let account_zos_balance = ChainStore.getAccountBalance(account, '1.3.0')
  //       result['account_zos_balance'] = account_zos_balance / Math.pow(10, zos_precision) // 用户的zos的余额（处理精度）

  //       if (!collateralize_bitasset_asset_id) {
  //         collateralize_bitasset_asset_id = '1.3.0'
  //       }
  //       result['feed_price'] = null
  //       return Apis.instance().db_api().exec('get_asset_exchange_feed', [borrow_asset_id, collateralize_asset_id, 1]).then(res_obj => {
  //         // result["borrow_feed"] = ""
  //         // if(res_obj[0]){
  //         //     if(res_obj[0].current_feed){
  //         //         if(res_obj[0].current_feed.settlement_price){
  //         //             result["borrow_feed"] = res_obj[0].current_feed.settlement_price
  //         //         }
  //         //     }
  //         // }
  //         // result["collateralize_feed"] = ""
  //         // if (collateralize_asset_id === '1.3.0') {
  //         //     let col_info = QueryChainStore.get_core_asset_info()
  //         //     result["collateralize_feed"] = col_info.feed
  //         // } else {
  //         //     if(res_obj[1]){
  //         //         if(res_obj[1].current_feed){
  //         //             if(res_obj[1].current_feed.settlement_price){
  //         //                 result["collateralize_feed"] = res_obj[1].current_feed.settlement_price
  //         //             }
  //         //         }
  //         //     }
  //         // }
  //         let feed = null
  //         if (res_obj) {
  //           if (res_obj.current_feed) {
  //             if (res_obj.current_feed.settlement_price) {
  //               feed = res_obj.current_feed.settlement_price
  //             }
  //           }
  //         }
  //         // quote是zos，base是此货币
  //         let feed_price = QueryChainStore.calcFeedPrice(feed, collateralize_asset_precision, borrow_asset_precision)
  //         result['feed_price'] = feed_price
  //         return result
  //       })
  //     })
  //   }).catch(error => {
  //     console.log(error)
  //     return Promise.reject(error)
  //   })
  // }

  // 提交投资订单
  static bitlender_invest (
    user_id, // 投资人ID
    loan_id, // 借款人ID
    carrier_id, // 运营商账号
    order_id, //
    invest_ammount, // 投资数量
    invest_asset_id, // 投资资产ID
    invest_asset_precision, // 投资资产精度
    fee_asset_id = '1.3.0' // 手续费资产ID
  ) {
    let application_api = new ApplicationApi()
    return application_api.bitlender_invest(
      user_id, // 投资人ID
      loan_id, // 借款人ID
      carrier_id, // 运营商ID
      order_id, // '1.19.x'
      invest_ammount, // 投资数量
      invest_asset_id, // 投资资产ID
      invest_asset_precision, // 投资资产精度
      fee_asset_id, // 手续费资产ID
      true

    ).then((tr) => {
      let asset = ChainStore.getObject(fee_asset_id)
      let tran_ser = tr.serialize()
      let fee_obj = {}
      fee_obj['fee_amount'] = tran_ser.operations[0][1].fee.amount
      fee_obj['fee_asset_id'] = tran_ser.operations[0][1].fee.asset_id
      fee_obj['fee_precision'] = asset.get('precision')
      let result = {}
      result['tr'] = tr
      result['fee'] = fee_obj
      return Promise.resolve(result)
    }).catch(error => {
      console.log(error)
      return Promise.reject(error)
    })
  }

  // 还息
  static bitlender_repay_interest (
    user_id,
    order_id, //
    repay_period, // 第几期,整数
    fee_asset_id = '1.3.0' // 手续费资产ID
  ) {
    // let key = "__graphene__"+AccountStore._getCurrentAccountKey("passwordAccount");
    // let cur_account =  JSON.parse(localStorage.getItem(key));
    // let account = null
    // if(cur_account){
    //     account =ChainStore.getAccount(cur_account, true)
    // }
    // if(!account){
    //     return Promise.reject("account is no Exists")
    // }
    let application_api = new ApplicationApi()
    return application_api.bitlender_repay_interest(
      user_id, // 借款人ID
      order_id, //
      repay_period, // 第几期,整数
      fee_asset_id, // 手续费资产ID
      true
    ).then((tr) => {
      let asset = ChainStore.getObject(fee_asset_id)
      let tran_ser = tr.serialize()
      let fee_obj = {}
      fee_obj['fee_amount'] = tran_ser.operations[0][1].fee.amount
      fee_obj['fee_asset_id'] = tran_ser.operations[0][1].fee.asset_id
      fee_obj['fee_precision'] = asset.get('precision')
      let result = {}
      result['tr'] = tr
      result['fee'] = fee_obj
      return Promise.resolve(result)
    }).catch(error => {
      console.log(error)
      return Promise.reject(error)
    })
  }

  // 逾期还息
  static bitlender_overdue_interest (
    user_id,
    order_id, //
    repay_period, // 第几期,整数
    fee_asset_id = '1.3.0' // 手续费资产ID
  ) {
    // let key = "__graphene__"+AccountStore._getCurrentAccountKey("passwordAccount");
    // let cur_account =  JSON.parse(localStorage.getItem(key));
    // let account = null
    // if(cur_account){
    //     account =ChainStore.getAccount(cur_account, true)
    // }
    // if(!account){
    //     return Promise.reject("account is no Exists")
    // }
    let application_api = new ApplicationApi()
    return application_api.bitlender_overdue_interest(
      user_id, // 借款人ID
      order_id, //
      repay_period, // 第几期,整数
      fee_asset_id, // 手续费资产ID
      true
    ).then((tr) => {
      let asset = ChainStore.getObject(fee_asset_id)
      let tran_ser = tr.serialize()
      let fee_obj = {}
      fee_obj['fee_amount'] = tran_ser.operations[0][1].fee.amount
      fee_obj['fee_asset_id'] = tran_ser.operations[0][1].fee.asset_id
      fee_obj['fee_precision'] = asset.get('precision')
      let result = {}
      result['tr'] = tr
      result['fee'] = fee_obj
      return Promise.resolve(result)
    }).catch(error => {
      console.log(error)
      return Promise.reject(error)
    })
  }

  // 还本
  static bitlender_repay_principal (
    user_id,
    order_id, //
    fee_asset_id = '1.3.0' // 手续费资产ID
  ) {
    // let key = "__graphene__"+AccountStore._getCurrentAccountKey("passwordAccount");
    // let cur_account =  JSON.parse(localStorage.getItem(key));
    // let account = null
    // if(cur_account){
    //     account =ChainStore.getAccount(cur_account, true)
    // }
    // if(!account){
    //     return Promise.reject("account is no Exists")
    // }
    let application_api = new ApplicationApi()
    return application_api.bitlender_repay_principal(
      user_id, // 借款人ID
      order_id, //
      fee_asset_id, // 手续费资产ID
      true
    ).then((tr) => {
      let asset = ChainStore.getObject(fee_asset_id)
      let tran_ser = tr.serialize()
      let fee_obj = {}
      fee_obj['fee_amount'] = tran_ser.operations[0][1].fee.amount
      fee_obj['fee_asset_id'] = tran_ser.operations[0][1].fee.asset_id
      fee_obj['fee_precision'] = asset.get('precision')
      let result = {}
      result['tr'] = tr
      result['fee'] = fee_obj
      return Promise.resolve(result)
    }).catch(error => {
      console.log(error)
      return Promise.reject(error)
    })
  }

  // 逾期还本（会一起还逾期的本金和利息（如果有逾期的利息））
  static bitlender_overdue_repay (
    user_id,
    order_id, //
    fee_asset_id = '1.3.0' // 手续费资产ID
  ) {
    // let key = "__graphene__"+AccountStore._getCurrentAccountKey("passwordAccount");
    // let cur_account =  JSON.parse(localStorage.getItem(key));
    // let account = null
    // if(cur_account){
    //     account =ChainStore.getAccount(cur_account, true)
    // }
    // if(!account){
    //     return Promise.reject("account is no Exists")
    // }
    let application_api = new ApplicationApi()
    return application_api.bitlender_overdue_repay(
      user_id, // 借款人ID
      order_id, //
      fee_asset_id, // 手续费资产ID
      true
    ).then((tr) => {
      let asset = ChainStore.getObject(fee_asset_id)
      let tran_ser = tr.serialize()
      let fee_obj = {}
      fee_obj['fee_amount'] = tran_ser.operations[0][1].fee.amount
      fee_obj['fee_asset_id'] = tran_ser.operations[0][1].fee.asset_id
      fee_obj['fee_precision'] = asset.get('precision')
      let result = {}
      result['tr'] = tr
      result['fee'] = fee_obj
      return Promise.resolve(result)
    }).catch(error => {
      console.log(error)
      return Promise.reject(error)
    })
  }

  // 提前还本
  static bitlender_prepayment (
    user_id,
    order_id, //
    fee_asset_id = '1.3.0' // 手续费资产ID
  ) {
    // let key = "__graphene__"+AccountStore._getCurrentAccountKey("passwordAccount");
    // let cur_account =  JSON.parse(localStorage.getItem(key));
    // let account = null
    // if(cur_account){
    //     account =ChainStore.getAccount(cur_account, true)
    // }
    // if(!account){
    //     return Promise.reject("account is no Exists")
    // }
    let application_api = new ApplicationApi()
    return application_api.bitlender_prepayment(
      user_id, // 借款人ID
      order_id, //
      fee_asset_id, // 手续费资产ID
      true
    ).then((tr) => {
      let asset = ChainStore.getObject(fee_asset_id)
      let tran_ser = tr.serialize()
      let fee_obj = {}
      fee_obj['fee_amount'] = tran_ser.operations[0][1].fee.amount
      fee_obj['fee_asset_id'] = tran_ser.operations[0][1].fee.asset_id
      fee_obj['fee_precision'] = asset.get('precision')
      let result = {}
      result['tr'] = tr
      result['fee'] = fee_obj
      return Promise.resolve(result)
    }).catch(error => {
      console.log(error)
      return Promise.reject(error)
    })
  }

  // 取消借款订单
  static bitlender_remove_operation (
    user_id,
    order_id, //
    fee_asset_id = '1.3.0' // 手续费资产ID
  ) {
    // let key = "__graphene__"+AccountStore._getCurrentAccountKey("passwordAccount");
    // let cur_account =  JSON.parse(localStorage.getItem(key));
    // let account = null
    // if(cur_account){
    //     account =ChainStore.getAccount(cur_account, true)
    // }
    // if(!account){
    //     return Promise.reject("account is no Exists")
    // }
    let application_api = new ApplicationApi()
    return application_api.bitlender_remove_operation(
      user_id, // 借款人ID
      order_id, //
      fee_asset_id, // 手续费资产ID
      true
    ).then((tr) => {
      let asset = ChainStore.getObject(fee_asset_id)
      let tran_ser = tr.serialize()
      let fee_obj = {}
      fee_obj['fee_amount'] = tran_ser.operations[0][1].fee.amount
      fee_obj['fee_asset_id'] = tran_ser.operations[0][1].fee.asset_id
      fee_obj['fee_precision'] = asset.get('precision')
      let result = {}
      result['tr'] = tr
      result['fee'] = fee_obj
      return Promise.resolve(result)
    }).catch(error => {
      console.log(error)
      return Promise.reject(error)
    })
  }

  // 自动还款账户
  static bitlender_setautorepayer (
    user_id,
    order_id,
    bset, // true:自动还款；false:取消自动还款
    fee_asset_id = '1.3.0' // 手续费资产ID
  ) {
    // let key = "__graphene__"+AccountStore._getCurrentAccountKey("passwordAccount");
    // let cur_account =  JSON.parse(localStorage.getItem(key));
    // let account = null
    // if(cur_account){
    //     account =ChainStore.getAccount(cur_account, true)
    // }
    // if(!account){
    //     return Promise.reject("account is no Exists")
    // }
    let application_api = new ApplicationApi()
    return application_api.bitlender_setautorepayer(
      user_id, // 借款人ID
      order_id,
      bset, //
      fee_asset_id, // 手续费资产ID
      true
    ).then((tr) => {
      let asset = ChainStore.getObject(fee_asset_id)
      let tran_ser = tr.serialize()
      let fee_obj = {}
      fee_obj['fee_amount'] = tran_ser.operations[0][1].fee.amount
      fee_obj['fee_asset_id'] = tran_ser.operations[0][1].fee.asset_id
      fee_obj['fee_precision'] = asset.get('precision')
      let result = {}
      result['tr'] = tr
      result['fee'] = fee_obj
      return Promise.resolve(result)
    }).catch(error => {
      console.log(error)
      return Promise.reject(error)
    })
  }

  //
  static locktoken_create (
    user_id,
    user_to,
    asset_id,
    amount,
    period,
    type,
    mode,
    fee_asset_id = '1.3.0'
  ) {
    let application_api = new ApplicationApi()
    return application_api.locktoken_create(
      user_id,
      user_to,
      asset_id,
      amount,
      period,
      type,
      mode,
      fee_asset_id,
      true
    ).then((tr) => {
      let asset = ChainStore.getObject(fee_asset_id)
      let tran_ser = tr.serialize()
      let fee_obj = {}
      fee_obj['fee_amount'] = tran_ser.operations[0][1].fee.amount
      fee_obj['fee_asset_id'] = tran_ser.operations[0][1].fee.asset_id
      fee_obj['fee_precision'] = asset.get('precision')
      let result = {}
      result['tr'] = tr
      result['fee'] = fee_obj
      return Promise.resolve(result)
    }).catch(error => {
      console.log(error)
      return Promise.reject(error)
    })
  }
  static locktoken_update (
    user_id,
    object_id,
    op_type,
    asset_id,
    amount,
    period,
    type,
    mode,
    fee_asset_id = '1.3.0'
  ) {
    let application_api = new ApplicationApi()
    return application_api.locktoken_update(
      user_id,
      object_id,
      op_type,
      asset_id,
      amount,
      period,
      type,
      mode,
      fee_asset_id,
      true
    ).then((tr) => {
      let asset = ChainStore.getObject(fee_asset_id)
      let tran_ser = tr.serialize()
      let fee_obj = {}
      fee_obj['fee_amount'] = tran_ser.operations[0][1].fee.amount
      fee_obj['fee_asset_id'] = tran_ser.operations[0][1].fee.asset_id
      fee_obj['fee_precision'] = asset.get('precision')
      let result = {}
      result['tr'] = tr
      result['fee'] = fee_obj
      return Promise.resolve(result)
    }).catch(error => {
      console.log(error)
      return Promise.reject(error)
    })
  }
  static locktoken_remove (
    user_id,
    object_id,
    fee_asset_id = '1.3.0'
  ) {
    let application_api = new ApplicationApi()
    return application_api.locktoken_remove(
      user_id,
      object_id,
      fee_asset_id,
      true
    ).then((tr) => {
      let asset = ChainStore.getObject(fee_asset_id)
      let tran_ser = tr.serialize()
      let fee_obj = {}
      fee_obj['fee_amount'] = tran_ser.operations[0][1].fee.amount
      fee_obj['fee_asset_id'] = tran_ser.operations[0][1].fee.asset_id
      fee_obj['fee_precision'] = asset.get('precision')
      let result = {}
      result['tr'] = tr
      result['fee'] = fee_obj
      return Promise.resolve(result)
    }).catch(error => {
      console.log(error)
      return Promise.reject(error)
    })
  }
  static asset_locktoken_assign (
    user_id,
    asset_id,
    sparam,
    fee_asset_id = '1.3.0'
  ) {
    let application_api = new ApplicationApi()
    let obj = ChainStore.getObject('2.1.0')
    let chain_time = obj.get('time')
    return application_api.asset_locktoken_operation(
      user_id,
      asset_id,
      user_id,
      2,
      sparam,
      chain_time,
      fee_asset_id,
      true
    ).then((tr) => {
      let asset = ChainStore.getObject(fee_asset_id)
      let tran_ser = tr.serialize()
      let fee_obj = {}
      fee_obj['fee_amount'] = tran_ser.operations[0][1].fee.amount
      fee_obj['fee_asset_id'] = tran_ser.operations[0][1].fee.asset_id
      fee_obj['fee_precision'] = asset.get('precision')
      let result = {}
      result['tr'] = tr
      result['fee'] = fee_obj
      return Promise.resolve(result)
    }).catch(error => {
      console.log(error)
      return Promise.reject(error)
    })
  }

  static asset_locktoken_operation (
    user_id,
    asset_id,
    asset_owner,
    isNew,
    sparam,
    fee_asset_id = '1.3.0'
  ) {
    let application_api = new ApplicationApi()
    let obj = ChainStore.getObject('2.1.0')
    let chain_time = obj.get('time')
    return application_api.asset_locktoken_operation(
      user_id,
      asset_id,
      asset_owner,
      isNew ? 1 : 0,
      sparam,
      chain_time,
      fee_asset_id,
      true
    ).then((tr) => {
      let asset = ChainStore.getObject(fee_asset_id)
      let tran_ser = tr.serialize()
      let fee_obj = {}
      fee_obj['fee_amount'] = tran_ser.operations[0][1].fee.amount
      fee_obj['fee_asset_id'] = tran_ser.operations[0][1].fee.asset_id
      fee_obj['fee_precision'] = asset.get('precision')
      let result = {}
      result['tr'] = tr
      result['fee'] = fee_obj
      return Promise.resolve(result)
    }).catch(error => {
      console.log(error)
      return Promise.reject(error)
    })
  }

  static limit_order_create (
    seller,
    amount_to_sell,
    min_to_receive,
    fill_mode,
    expiration,
    fill_or_kill = false,
    fee_asset_id = '1.3.0'
  ) {
    let application_api = new ApplicationApi()
    return application_api.limit_order_create(
      seller,
      '1.2.0',
      amount_to_sell,
      min_to_receive,
      '',
      fill_mode,
      expiration,
      fill_or_kill,
      fee_asset_id,
      true
    ).then((tr) => {
      let asset = ChainStore.getObject(fee_asset_id)
      let tran_ser = tr.serialize()
      let fee_obj = {}
      fee_obj['fee_amount'] = tran_ser.operations[0][1].fee.amount
      fee_obj['fee_asset_id'] = tran_ser.operations[0][1].fee.asset_id
      fee_obj['fee_precision'] = asset.get('precision')
      let result = {}
      result['tr'] = tr
      result['fee'] = fee_obj
      return Promise.resolve(result)
    }).catch(error => {
      console.log(error)
      return Promise.reject(error)
    })
  }

  static limit_order_cancel (
    seller,
    order,
    fee_asset_id = '1.3.0'
  ) {
    let application_api = new ApplicationApi()
    return application_api.limit_order_cancel(
      seller,
      order,
      fee_asset_id,
      true
    ).then((tr) => {
      let asset = ChainStore.getObject(fee_asset_id)
      let tran_ser = tr.serialize()
      let fee_obj = {}
      fee_obj['fee_amount'] = tran_ser.operations[0][1].fee.amount
      fee_obj['fee_asset_id'] = tran_ser.operations[0][1].fee.asset_id
      fee_obj['fee_precision'] = asset.get('precision')
      let result = {}
      result['tr'] = tr
      result['fee'] = fee_obj
      return Promise.resolve(result)
    }).catch(error => {
      console.log(error)
      return Promise.reject(error)
    })
  }

  static vesting_balance_withdraw (
    user_id,
    object_id,
    asset_id,
    amount,
    fee_asset_id = '1.3.0'
  ) {
    let application_api = new ApplicationApi()
    return application_api.vesting_balance_withdraw(
      user_id,
      object_id,
      asset_id,
      amount,
      fee_asset_id,
      true
    ).then((tr) => {
      let asset = ChainStore.getObject(fee_asset_id)
      let tran_ser = tr.serialize()
      let fee_obj = {}
      fee_obj['fee_amount'] = tran_ser.operations[0][1].fee.amount
      fee_obj['fee_asset_id'] = tran_ser.operations[0][1].fee.asset_id
      fee_obj['fee_precision'] = asset.get('precision')
      let result = {}
      result['tr'] = tr
      result['fee'] = fee_obj
      return Promise.resolve(result)
    }).catch(error => {
      console.log(error)
      return Promise.reject(error)
    })
  }
  // // 获取订单投资进度
  // // 返回数字
  // static get_invest_process (order_id) {
  //   return Apis.instance().bitlender_api().exec('get_invest_process', [order_id]).then(res_pro => {
  //     let all_amount = parseInt(res_pro[0].amount)
  //     let amount = parseInt(res_pro[1].amount)
  //     let process = (amount / all_amount * 100).toFixed(4)
  //     return process
  //   })
  // }

  // // 获取订单投资的资产
  // // 返回资产数组（借款总金额，目前投资总额）
  // static get_invest_process_asset (order_id) {
  //   return Apis.instance().bitlender_api().exec('get_invest_process', [order_id]).then(res_pro => {
  //     return res_pro
  //   })
  // }

  // 获取预借款信息
  // 必填：借款资产，借款数量，借款期限，抵押物资产
  static get_loan_info (
    loan_amount, // 借款数量 (要乘以精度)
    loan_asset_id, // 借款资产ID
    loan_period, // 借款周期，月
    interest_rate, // 借款利率，传的几就写几
    bid_period, // 投标截止时间，到秒
    collateralRatio, // 最小抵押倍数
    repaymet_type, // 借款模式
    collateralize_asset_id // 抵押资产ID
  ) {
    let result = {}
    // let key = "__graphene__"+AccountStore._getCurrentAccountKey("passwordAccount");
    // let cur_account =  JSON.parse(localStorage.getItem(key));
    // let account = null
    // if(cur_account){
    //     account =ChainStore.getAccount(cur_account, true)
    // }
    // if(!account){
    //     return Promise.reject("account is no Exists")
    // }
    let loan_asset = {amount: loan_amount, asset_id: loan_asset_id}
    let key = ZosInstance.getOptionKey(repaymet_type)
    let collateral_asset = {amount: 0, asset_id: collateralize_asset_id}
    return Apis.instance().bitlender_api().exec('get_loan_info', [loan_asset, loan_period, interest_rate, bid_period, collateralRatio, collateral_asset, key]).then(res_obj => {
      // return Apis.instance().db_api().exec("get_objects", [[res_obj.amount_to_collateralize.asset_id, res_obj.amount_to_loan.asset_id]]).then(asset_obj =>{
      // result["collateralize_asset"] = asset_obj[0]        //抵押物资产信息
      // result["loan_asset"] = asset_obj[1]                 //借款资产信息
      result['amount_to_collateralize'] = res_obj.amount_to_collateralize // 抵押物数量
      result['amount_to_loan'] = res_obj.amount_to_loan // 借款数量
      result['bid_period'] = res_obj.bid_period // 投资截止时间
      result['collateral_rate'] = res_obj.collateral_rate // 保证金倍数
      // result["collateral_settlement_price"] = res_obj.collateral_settlement.settlement_price   //抵押物喂价信息
      // result["maintenance_collateral_cash_ratio"] = res_obj.collateral_settlement.maintenance_collateral_cash_ratio   //最小抵押倍数  除以1000
      // result["maximum_short_squeeze_cash_ratio"] = res_obj.collateral_settlement.maximum_short_squeeze_cash_ratio   //强制平仓率  除以1000
      result['collateralize_fee'] = res_obj.collateralize_fee // 抵押费用
      result['collateralize_risk'] = res_obj.collateralize_risk // 风险保证金
      result['carrier_fee'] = res_obj.carrier_fee // 运营商收取的法币数量
      result['distribution_fees'] = res_obj.distribution_fees
      result['expiration_time'] = res_obj.expiration_time // 截止时间
      result['feed_id'] = res_obj.feed_id
      result['id'] = res_obj.id // 订单ID
      result['interest_book'] = res_obj.interest_book // 投资列表
      result['interest_rate'] = res_obj.interest_rate.interest_rate // 借款利率
      result['invest_finish_time'] = res_obj.invest_finish_time // 满标时间
      result['issuer'] = res_obj.issuer // 借款订单创建人
      result['loan_period'] = res_obj.loan_period // 借款期限，月
      // result["loan_settlement_price"] = res_obj.loan_settlement.settlement_price      //借款喂价信息
      result['loan_time'] = res_obj.loan_time // 借款时间
      result['lock_collateralize'] = res_obj.lock_collateralize // 锁定的抵押物资产
      result['memo'] = res_obj.memo // 备注
      result['order'] = res_obj.order // 订单号
      result['feed'] = res_obj.price_settlement.settlement_price
      result['feed_price'] = QueryChainStore.calcFeedPrice(res_obj.price_settlement.settlement_price, res_obj.asset_to_loan.id, res_obj.asset_to_loan.precision, res_obj.asset_to_collateralize.id, res_obj.asset_to_collateralize.precision)
      result['feed_price_view'] = QueryChainStore.calcFeedPriceView(res_obj.price_settlement.settlement_price, res_obj.asset_to_loan.id, res_obj.asset_to_loan.precision, res_obj.asset_to_collateralize.id, res_obj.asset_to_collateralize.precision)

      // result["overdue_interest_time"] = res_obj.overdue_interest_time  //利息逾期时间
      // result["overdue_principal_fee"] = res_obj.overdue_principal_fee      //逾期还款费用
      // result["overdue_principal_time"] = res_obj.overdue_principal_time    //逾期还款时间
      result['overdue_expiration_time'] = res_obj.overdue_expiration_time // 逾期时间（秒）// 获取不良资产的逾期时间为 expect_principal_time + overdue_expiration_time
      // result["recycle_time"] = res_obj.recycle_time            //不良资产处理时间
      result['repay_interest'] = res_obj.repay_interest // 还息列表
      result['repay_principal_fee'] = res_obj.repay_principal_fee // 提前还款的费用
      result['repay_principal_time'] = res_obj.repay_principal_time // 还本时间
      result['repayment_date'] = res_obj.repayment_date // 还款日期
      result['repayment_type'] = res_obj.repayment_type // 还款方式
      result['ustate'] = res_obj.order_state // 订单状态
      return Promise.resolve(result)
      // 抵押物余额
      // return Apis.instance().db_api().exec("get_account_balances", [user_id,[collateralize_asset_id]]).then(res_bal =>{
      //     res_bal.forEach(bala => {
      //         if(bala.asset_id == collateralize_asset_id){
      //             result["collateralize_balance"] = bala
      //         }
      //     })
      //     return Promise.resolve(result)
      // })
      // })
    }).catch(error => {
      console.log(error)
      return Promise.reject(error)
    })
  }

  // // 获取一个借款订单（继续投资功能使用）
  // // order_id:借款订单ID
  // static get_loan_single_order (
  //   order_id
  // ) {
  //   return Apis.instance().db_api().exec('get_objects', [[order_id]]).then(res => {
  //     return Apis.instance().db_api().exec('get_objects', [[res[0].amount_to_collateralize.asset_id, res[0].amount_to_loan.asset_id]]).then(asset_obj => {
  //       res[0]['collateralize_asset'] = asset_obj[0] // 抵押资产的具体信息
  //       res[0]['loan_asset'] = asset_obj[1] // 借款资产的具体信息

  //       // 处理时区
  //       // tzo: TimeZoneOffset; 格林威治时间和本地时间之间的时差
  //       res[0]['expiration_time'] = QueryChainStore.getTimezoneDate(res[0]['expiration_time'])

  //       res[0]['invest_finish_time'] = QueryChainStore.getTimezoneDate(res[0]['invest_finish_time'])

  //       res[0]['loan_time'] = QueryChainStore.getTimezoneDate(res[0]['loan_time'])

  //       res[0]['repay_principal_time'] = QueryChainStore.getTimezoneDate(res[0]['repay_principal_time'])

  //       res[0]['expect_principal_time'] = QueryChainStore.getTimezoneDate(res[0]['expect_principal_time'])

  //       res[0]['overdue_recycle_time'] = QueryChainStore.getTimezoneDate(res[0]['overdue_recycle_time'])

  //       res[0].repay_interest.forEach(interest => {
  //         interest[1].expect_time = QueryChainStore.getTimezoneDate(interest[1].expect_time)
  //       })

  //       return QueryChainStore.get_invest_process(res[0].id).then(res_pro => {
  //         res[0]['invest_process'] = res_pro.process // 借款订单的进度
  //         res[0]['invest_process_amount'] = parseInt(res_pro.amount) // 借款订单的目前投资额 (没有处理精度)
  //         return Promise.resolve(res[0])
  //       })
  //     })
  //   })
  // }

  // // 获取我的借款列表
  // // arry_account_id:用户ID数组，如果有值就过滤，如果为空数组，就返回所有
  // // arry_status:状态数组，如果有值就过滤，如果为空数组，就返回所有
  // // 判断抵押物是否充足：抵押物数量 / 当前喂价 * maintenance_collateral_cash_ratio > 借款法币的数量
  // static get_my_loan_orders (
  //   arry_account_id,
  //   arry_status,
  //   start,
  //   limit
  // ) {
  //   let result = []
  //   return Apis.instance().db_api().exec('get_loan_orders', [arry_account_id, [], arry_status, start, limit]).then(res_list => {
  //     return new Promise((resolve, reject) => {
  //       async.each(res_list, function (res, allcallback) {
  //         // 处理时区
  //         // tzo: TimeZoneOffset; 格林威治时间和本地时间之间的时差
  //         // 挂单截止时间
  //         res['expiration_time'] = QueryChainStore.getTimezoneDate(res['expiration_time'])

  //         // 满标时间
  //         res['invest_finish_time'] = QueryChainStore.getTimezoneDate(res['invest_finish_time'])

  //         // 借款时间
  //         res['loan_time'] = QueryChainStore.getTimezoneDate(res['loan_time'])

  //         // 实际还本时间
  //         res['repay_principal_time'] = QueryChainStore.getTimezoneDate(res['repay_principal_time'])

  //         // 预计还本时间
  //         res['expect_principal_time'] = QueryChainStore.getTimezoneDate(res['expect_principal_time'])

  //         // 不良资产逾期时间
  //         res['overdue_recycle_time'] = QueryChainStore.getTimezoneDate(res['overdue_recycle_time'])

  //         // 处理还息的时间
  //         res.repay_interest.forEach(interest => {
  //           interest[1].expect_time = QueryChainStore.getTimezoneDate(interest[1].expect_time)
  //         })
  //         result.push(res)
  //       })
  //       return resolve(result)
  //     })
  //   }).catch(error => {
  //     console.log(error)
  //     return Promise.reject(error)
  //   })
  // }

  // // 获取借款订单的投资人信息
  // static get_interest_book_info (
  //   interest_book, // 投资信息数组
  //   borrow_asset_precision // 借款资产精度
  // ) {
  //   let result = []
  //   return new Promise((resolve, reject) => {
  //     async.each(interest_book, function (book, allcallback) {
  //       let result_item = {}
  //       // book[0]:投资订单ID;book[1]:投资人ID；
  //       Apis.instance().db_api().exec('get_objects', [[book[0], book[1].account]]).then(res_obj => {
  //         result_item['interest_issue_id'] = book[1].account
  //         result_item['interest_issue_name'] = res_obj[1].name
  //         result_item['id'] = res_obj[0].id
  //         result_item['amount'] = parseInt(res_obj[0].amount_to_invest.amount) / Math.pow(10, borrow_asset_precision)
  //         result_item['invest_time'] = QueryChainStore.getTimezoneDate(res_obj[0].invest_time)

  //         result.push(result_item)
  //         allcallback(null)
  //       })
  //     }, function (allerr) {
  //       if (allerr) {
  //         console.log('err', allerr)
  //       }
  //       return resolve(result)
  //     })
  //   }).catch(error => {
  //     console.log(error)
  //     return Promise.reject(error)
  //   })
  // }

  // 获取对象信息
  static get_object (
    id
  ) {
    return FetchChain('getObject', id, 5000).then(res_obj => {
      return res_obj
    })
  }

  // 获取账号信息
  static get_account (
    id
  ) {
    return FetchChain('getAccount', id, 5000).then(res_obj => {
      return res_obj
    })
  }

  // 计算公式
  // 参数：订单ID，类型（整数）
  static calc_string (order_id, type) {
    return Apis.instance().bitlender_api().exec('calc_string', [order_id, type]).then(res => {
      return res
    })
  }

  // 通过借款数量、id和抵押物id,获取当前喂价下的抵押物（数量，id）
  // 获取到返回的数量，然后乘以滑动的倍数，就是实际要抵押的数量
  static get_loan_collateralize (loan_asset_id, loan_asset_amount, collateralize_id) {
    return QueryChainStore.get_loan_collateralize(loan_asset_id, loan_asset_amount, collateralize_id)
  }
  // 对身份进行签名
  static signAuthInfo (account_id) {
    let key = '__graphene__' + AccountStore._getCurrentAccountKey('passwordAccount')
    let cur_account = JSON.parse(localStorage.getItem(key))
    let account = null
    if (cur_account) {
      account = ChainStore.getAccount(cur_account, true)
    }
    if (!account) {
      return Promise.reject('account is no Exists')
    }
    // let pubkey = ''
    // let key_auths = account.getIn([
    //                 "owner",
    //                 "key_auths"
    //             ])
    // let keys = key_auths.map(a => a.get(0));
    // let private_key = WalletDb.getPrivateKey(keys.get(0))
    return QueryChainStore.signAuthInfo(account_id).then(trx => {
      return trx.finalize().then(() => {
        trx.sign()
        return trx.toObject()
      })
    })
  }

  // 对tr进行签名
  static signTrx (account_id, trx_param) {
    let key = '__graphene__' + AccountStore._getCurrentAccountKey('passwordAccount')
    let cur_account = JSON.parse(localStorage.getItem(key))
    let account = null
    if (cur_account) {
      account = ChainStore.getAccount(cur_account, true)
    }
    if (!account) {
      return Promise.reject('account is no Exists')
    }
    // let pubkey = ''
    // let key_auths = account.getIn([
    //                 "owner",
    //                 "key_auths"
    //             ])
    // let keys = key_auths.map(a => a.get(0));
    // let private_key = WalletDb.getPrivateKey(keys.get(0))
    let buf_bin = Buffer.from(JSON.stringify(trx_param))
    let buf = buf_bin.toString('hex')
    return QueryChainStore.signTrx(account_id, buf).then(trx => {
      return trx.finalize().then(() => {
        trx.sign()
        return trx.toObject()
      })
    })
  }

  // 根据带精度的数据，返回实际的数据
  // getRealNum(145000, 8) => 0.00145
  static getRealNum (amount, precision) {
    return QueryChainStore.getRealNum(amount, precision)
  }

  // 获取历史数据
  static getHistoryList (account_id, start, limit = 10) {
    return QueryChainStore.getHistoryList(account_id, start, limit)
  }

  // // 获取我的投资历史
  // // account_id: 用户ID
  // // start: 开始时间: "2018-05-01T00:00:00"
  // // end: 开始时间: "2018-06-02T00:00:00"
  // static get_account_invest_history (account_id, start, end) {
  //   let result = []
  //   return Apis.instance().history_api().exec('get_account_invest_history', [account_id, start, end, 0, 1000]).then(res_list => {
  //     return new Promise((resolve, reject) => {
  //       async.each(res_list, function (res, allcallback) {
  //         // 应标时间
  //         res['invest_time'] = QueryChainStore.getTimezoneDate(res['invest_time'])

  //         // 实际还本时间
  //         res['repay_principal_time'] = QueryChainStore.getTimezoneDate(res['repay_principal_time'])

  //         res['invest_asset'] = res['asset_to_invest'] // 投资资产的具体信息
  //         res['collateralize_asset'] = res['asset_to_collateralize'] // 抵押资产的具体信息
  //         res['invest_amount'] = parseInt(res.amount_to_invest.amount) / Math.pow(10, asset_obj[0].precision) // 投资资产的数量（处理了精度）
  //         // 收益
  //         let interest_sum = 0
  //         res.repay_interest.forEach(interest => {
  //           interest_sum = interest_sum + parseInt(interest[1].amount_repay_interest.amount)
  //           interest_sum = interest_sum + parseInt(interest[1].fines_repay_interest.amount)
  //           // 处理还息时间
  //           interest[1]['finish_time'] = QueryChainStore.getTimezoneDate(interest[1].finish_time)
  //         })

  //         res['repay_interest_sum'] = (interest_sum + parseInt(res.repay_principal_fee.amount)) / Math.pow(10, asset_obj[0].precision) // 实际收益（处理了精度）
  //         res['repay_interest_rate'] = res['repay_interest_sum'] / res['invest_amount'] // 实际收益率

  //         result.push(res)
  //         allcallback(null)
  //       }, function (allerr) {
  //         if (allerr) {
  //           console.log('err', allerr)
  //         }
  //         return resolve(result)
  //       })
  //     })
  //   })
  // }

  // 获取借款订单的操作记录
  // account_id: 用户ID
  // order_id: 借款订单ID
  static get_account_bitlender_history (account_id, order_id) {
    return Apis.instance().history_api().exec('get_account_bitlender_history', [account_id, order_id]).then(res_list => {
      return res_list
    })
  }
  // // 获取我的历史借款订单中的投资列表信息
  // // 参数：interest_book:投资列表数组
  // static get_loan_obj_history_intbook (interest_book) {
  //   let result = []
  //   return new Promise((resolve, reject) => {
  //     async.each(interest_book, function (res, allcallback) {
  //       let obj = {}
  //       Apis.instance().history_api().exec('get_object_history', [res[0]]).then(int_obj => {
  //         let interest_asset_id = int_obj.amount_to_invest.asset_id
  //         let interest_asset_amount = parseInt(int_obj.amount_to_invest.amount)
  //         Apis.instance().db_api().exec('get_objects', [[interest_asset_id, int_obj.issuer]]).then(res_asset_acc => {
  //           let r_asset_obj = res_asset_acc[0]
  //           let r_acc_obj = res_asset_acc[1]
  //           obj['interest_issue_id'] = r_acc_obj.id // 投资人姓名
  //           obj['account_name'] = r_acc_obj.name // 投资人姓名
  //           obj['symbol'] = r_asset_obj.symbol // 投资资产名称
  //           // 投资时间
  //           obj['time'] = QueryChainStore.getTimezoneDate(int_obj.invest_time) // 投资时间

  //           obj['real_amount'] = interest_asset_amount / Math.pow(10, r_asset_obj.precision) // 投资金额（已处理精度）
  //           result.push(obj)
  //           allcallback(null)
  //         })
  //       })
  //     }, function (allerr) {
  //       if (allerr) {
  //         console.log('err', allerr)
  //       }
  //       return resolve(result)
  //     })
  //   })
  // }
  // 用户信息上传到节点时使用
  // （动作）更新用户信息
  static account_update (
    account_id, // 用户ID
    memo, // 用户信息，json串
    fee_asset_id = '1.3.0', // 手续费资产ID
    confirm = false
  ) {
    let application_api = new ApplicationApi()
    return application_api.account_update(
      account_id,
      memo,
      fee_asset_id, // 手续费资产ID
      true
    ).then((tr) => {
      let asset = ChainStore.getObject(fee_asset_id)
      let tran_ser = tr.serialize()
      let fee_obj = {}
      fee_obj['fee_amount'] = tran_ser.operations[0][1].fee.amount
      fee_obj['fee_asset_id'] = tran_ser.operations[0][1].fee.asset_id
      fee_obj['fee_precision'] = asset.get('precision')
      let result = {}
      result['tr'] = tr
      result['fee'] = fee_obj
      return Promise.resolve(result)
    }).catch(error => {
      console.log(error)
      return Promise.reject(error)
    })
  }

  // 用户信息存储到本地时使用
  // （动作）更新用户信息
  static get_encode_memo (
    account_id, // 用户ID
    fix_account_name, // 固定用户
    memo, // 用户信息，json串，没有加密
    type
  ) {
    return QueryChainStore.get_encode_memo(account_id, fix_account_name, memo, type)
  }

  // 用户信息上传到节点时使用
  // 解析用户信息
  // 如果返回false,则提示用户输入密码
  static get_account_memo (
    account_id
  ) {
    return FetchChain('getAccount', account_id, 5000).then(res_acc => {
      if (WalletDb.isLocked()) {
        return false
      }
      if (res_acc) {
        if (res_acc.memo) {
          let memo_obj = res_acc.memo
          return Promise.resolve(PrivateKeyStore.decodeMemo(memo_obj).text)
        } else {
          let nResult = '{}'
          return Promise.resolve(nResult)
        }
      }
      return false
    }).catch((err) => {
      return Promise.reject(err)
    })
  }

  // 用户信息存储到本地时使用
  // 解析用户信息
  // 如果返回false,则提示用户输入密码
  static get_decode_memo (
    account_id,
    memo_obj // 加密后的用户信息串
  ) {
    return FetchChain('getAccount', account_id, 5000).then(res_acc => {
      if (WalletDb.isLocked()) {
        return false
      }
      if (res_acc) {
        return Promise.resolve(PrivateKeyStore.decodeMemo(memo_obj).text)
      }
      return false
    }).catch((err) => {
      return Promise.reject(err)
    })
  }
  static get_noenc_memo (
    memo_obj // 加密后的用户信息串
  ) {
    return Promise.resolve(PrivateKeyStore.decodeMemo_noenc(memo_obj).text)
  }
  // 获取提前/逾期还本所需的违约金和本金
  static get_repay_fee (order_id) {
    return Apis.instance().bitlender_api().exec('get_repay_fee', [order_id]).then(res => {
      let result = {}
      if (res) {
        result['penalty'] = res[0] // 违约金(没有处理精度)
        result['capital'] = res[1] // 本金(没有处理精度)
        result['interest'] = res[2] // 此订单的所需要还的利息总和，包含应还利息和罚息(没有处理精度)
      }
      return Promise.resolve(result)
    })
  }

  // 获取还息所需的罚息和利息
  // 参数：订单ID，第几期
  static get_invest_fee (order_id, repay_period) {
    return Apis.instance().bitlender_api().exec('get_invest_fee', [order_id, repay_period]).then(res => {
      let result = {}
      if (res) {
        result['penalties'] = res[0] // 罚息(没有处理精度)
        result['invest'] = res[1] // 利息(没有处理精度)
      }
      return Promise.resolve(result)
    })
  }

  // //初始化SettingsStore
  // //使用这个函数的目的主要是：将ui配置的初始化节点列表传进来
  // //参数：settingsAPIs: commonAll.js 中的 settingsAPIs
  // static createSettingsStore(settingsAPIs){
  //     let settingsStore = SettingsStore.getInstance(settingsAPIs)
  //     return true
  // }

  /*
    渲染列表：读取Setting QueryChainStores,调用 AccessSettings.renderNode
        排序方式：
            nodes = nodes
            .slice(0, currentNodeIndex)
            .concat(nodes.slice(currentNodeIndex + 1))
            .sort(function(a, b) {
                let isTestnet = false;//  a.url === testnetAPI.url || a.url === testnetAPI2.url;
                if (a.url == autoSelectAPI) {
                    return -1;
                } else if (a.up && b.up) {
                    return a.ping - b.ping;
                } else if (!a.up && !b.up) {
                    if (isTestnet) return -1;
                    return 1;
                } else if (a.up && !b.up) {
                    return -1;
                } else if (b.up && !a.up) {
                    return 1;
                }

                return 0;
            });
    节点是否允许删除：读取默认的节点列表（settingsAPIs.WS_NODE_LIST），如果此节点不再默认列表中就可以删除
    隐藏节点：SettingStore.onHideWS
    显示节点：SettingStore.onShowWS
    删除节点：WebsocketAddModal.onRemoveSubmit
    */
  static CheckNode () {
    gatewayurl.forEach(item => {
    })
  }
  static setLockTime (uT = 600) {
    let settingsStore = SettingsStore.getInstance()
    settingsStore.onChangeSetting({
      setting: 'walletLockTimeout',
      value: uT
    })
  }
  // 激活某个节点
  static activateNode (url, callback, errCallback = null) {
    let settingsStore = SettingsStore.getInstance()
    settingsStore.onChangeSetting({
      setting: 'apiServer',
      value: url
    })
    setTimeout(
      function () {
        willTransitionTo(
          null,
          null,
          callback,
          false,
          errCallback
        )
      },
      50
    )
  }
  static setStoreKey (key) {
    SettingsStore.setKey(key)
  }

  // 添加节点
  //* 调用后要重新加载显示列表 *WebsocketAddModal.onAddSubmit
  // 参数：ws: {location: 'name', url: 'wss://..'}
  static addNode (ws) {
    let settingsStore = SettingsStore.getInstance()
    settingsStore.onAddWS(ws)
    return true
  }

  // 删除节点
  static deleteNode (url) {
    let settingsStore = SettingsStore.getInstance()
    let removeIndex = -1
    settingsStore.defaults['apiServer'].forEach((api, index) => {
      if (api.url === url) {
        removeIndex = index
      }
    })
    if (removeIndex < 0) {
      return
    }
    settingsStore.onRemoveWS(removeIndex)
  }
  static setReplaceAddress (x) {
    console.log(x)
    replaceUrl = x
  }
  static ReplaceAddress (x) {
    if (replaceUrl !== '') {
      x = x.toString().replace('zos.io', replaceUrl)
    }
    return x
  }
  // 设置水龙头地址
  static setFaucetAddress (faucet_url) {
    let settingsStore = SettingsStore.getInstance()
    settingsStore.onChangeSetting({setting: 'faucet_address', value: faucet_url})
    return true
  }
  // 获取水龙头
  static getFaucetAddress () {
    let settingsStore = SettingsStore.getInstance()
    let retStr = settingsStore.settings.get('faucet_address')
    if (retStr) retStr = ZosInstance.ReplaceAddress(retStr)
    // .toString().replace('https://faucet.zos.io', 'https://faucet.zostu.com')
    return retStr
  }

  // 获取节点列表
  static getNodelist () {
    let settingsStore = SettingsStore.getInstance()
    let apiServer = settingsStore.defaults.apiServer
    let nodes = apiServer
      .map(node => {
        return QueryChainStore.getNode(node)
      })
      .filter(node => {
        return node.hidden !== true
      })
    let currentNodeIndex = QueryChainStore.getCurrentNodeIndex()
    nodes = nodes
      .slice(0, currentNodeIndex)
      .concat(nodes.slice(currentNodeIndex + 1))
      .sort(function (a, b) {
        let isTestnet = false//  a.url === testnetAPI.url || a.url === testnetAPI2.url;
        if (a.url == autoSelectAPI) {
          return -1
        } else if (a.up && b.up) {
          return a.ping - b.ping
        } else if (!a.up && !b.up) {
          if (isTestnet) return -1
          return 1
        } else if (a.up && !b.up) {
          return -1
        } else if (b.up && !a.up) {
          return 1
        }

        return 0
      })

    nodes = nodes.filter(node => {
      return node.hidden !== true
    })
    return nodes
  }

  // 获取当前节点
  static getActiveNode () {
    let settingsStore = SettingsStore.getInstance()
    let currentNodeIndex = QueryChainStore.getCurrentNodeIndex()
    let activeNode = QueryChainStore.getNode(
      settingsStore.defaults.apiServer[currentNodeIndex] || settingsStore.defaults.apiServer[0]
    )
    return activeNode
  }

  // 获取当前延迟毫秒数
  static getCurrentNodePing () {
    let settingsStore = SettingsStore.getInstance()
    let currentNode = settingsStore.settings.get('activeNode')
    let currentNodePing = settingsStore.apiLatencies[currentNode]
    return currentNodePing
  }

  // 获取公钥
  static getAccountPublicKey (account_id) {
    return FetchChain('getAccount', account_id, 5000).then(res_acc => {
      if (res_acc) {
        let active = res_acc.get('active')
        let owner = res_acc.get('owner')

        let active_key_auths = active.get('key_auths')
        let owner_key_auths = owner.get('key_auths')

        let active_keys = active_key_auths.map(a => a.get(0))
        let owner_keys = owner_key_auths.map(a => a.get(0))
        let memo_key = res_acc.get('options').get('memo_key')
        let auth_key = res_acc.get('options').get('auth_key')

        let ary_active_keys = []
        active_keys.map(k => {
          ary_active_keys.push(k)
        })

        let ary_owner_keys = []
        owner_keys.map(k => {
          ary_owner_keys.push(k)
        })

        let result = {}
        result['active'] = ary_active_keys // 数组
        result['owner'] = ary_owner_keys // 数组
        result['memo'] = memo_key // 字符串
        result['auth'] = auth_key // 字符串

        return result
      }
      return false
    })
  }

  // 获取私钥
  // 必须先登录
  static getAccountPrivateKey (pubkey) {
    var private_key = WalletDb.getPrivateKey(pubkey)
    return private_key.toWif()
  }

  // 动作
  // 提币(不广播)
  static gateway_withdraw (
    fromAccount, // 提币人用户名
    toAccount, // 网关用户名
    amount, // 提币数量，用户输入的数量
    asset_id, // 提币的资产ID
    fee_asset_id = '1.3.0' // 燃料费ID
  ) {
    let application_api = new ApplicationApi()
    return application_api.gateway_withdraw(
      fromAccount,
      toAccount,
      amount, // 为用户输入的数字乘以此资产类型的精度
      asset_id,
      fee_asset_id,
      true

    ).then((tr) => {
      let asset = ChainStore.getObject(fee_asset_id)
      let tran_ser = tr.serialize()
      let fee_obj = {}
      fee_obj['fee_amount'] = tran_ser.operations[0][1].fee.amount
      fee_obj['fee_asset_id'] = tran_ser.operations[0][1].fee.asset_id
      fee_obj['fee_precision'] = asset.get('precision')
      let result = {}
      result['tr'] = tr
      result['fee'] = fee_obj
      return Promise.resolve(result)
    }).catch(error => {
      console.log(error)
      return Promise.reject(error)
    })
  }

  // 获取用户的基础信息
  static get_user_phoneinfo (account_id) {
    return ZosInstance.get_user_baseinfo(account_id).then((res) => {
      if (res) {
        var userinfo = res.user_info
        if (userinfo !== undefined) {
          let baseInfo = {
            'from': userinfo.get('from'),
            'to': userinfo.get('to'),
            'nonce': userinfo.get('nonce'),
            'message': userinfo.get('message')
          }
          return ZosInstance.get_decode_memo(account_id, baseInfo).then(info => {
            if (!info) {
              return undefined
            } else {
              return JSON.parse(info)
            }
          }).catch((err) => {
            console.log(err)
            return undefined
          })
        } else {
          return undefined
        }
      } else {
        return undefined
      }
    }).catch((err) => {
      console.log(err)
      return undefined
    })
  }
  // 获取用户的基础信息
  static get_user_baseinfo (account_id) {
    let result = {}
    return FetchChain('getAccount', account_id, 5000).then((account) => {
      if (account) {
        let account_name = account.get('name')
        let registrar = account.get('registrar')
        let referrer = account.get('referrer')
        return Promise.all([
          FetchChain('getAccount', registrar),
          FetchChain('getAccount', referrer)
        ]).then((res) => {
          let [chain_registrar, chain_referrer] = res
          let registrar_name = chain_registrar.get('name')
          let referrer_name = chain_referrer.get('name')
          result['account_name'] = account_name // 账号名
          result['registrar_name'] = registrar_name // 注册人名字
          result['referrer_name'] = referrer_name // 推荐人名字
          result['user_info'] = account.get('user_info') // 用户信息
          return result
        })
      } else {
        return result
      }
    })
  }

  // 加密Pin码(不是promise)
  // 返回加密后的字符串，并将返回值存到浏览器缓存中
  static encodePin (
    pin_password, // pin码
    account_password // 用户密码
  ) {
    return QueryChainStore.encodePin(pin_password, account_password)
  }

  // 解密Pin码(不是promise)
  // 返回真正的用户密码
  static decodePin (
    pin_password, // pin码
    enc_pw // 加密字符串
  ) {
    return QueryChainStore.decodePin(pin_password, enc_pw)
  }

  // 返回随机密码(不是promise)
  static get_random_password () {
    return QueryChainStore.get_random_password()
  }

  // 获取节点时间
  static getChainTime () {
    let obj = ChainStore.getObject('2.1.0')
    return obj.get('time')
  }

  // // 根据数字货币获取法币数量
  // // source_bitasset_data_id ： 数字货币的bitasset_data_id，（如果是zos，则此参数传空字符串）
  // // source_amount ： 数字货币的数量，实际数量，不用乘以精度
  // // source_precision ： 数字货币或者zos的精度
  // // dest_bitasset_data_id ： 法币的bitasset_data_id，（如果是zos，则此参数传空字符串）
  // // dest_precision ： 法币的精度
  // // source_is_zos : 数字货币是否是zos
  // // 返回价值多少法币
  // static getCashAmountFromCoin_old (source_bitasset_data_id, source_amount, source_precision, dest_bitasset_data_id, dest_precision, source_is_zos = false) {
  //   if (source_is_zos) {
  //     return Apis.instance().db_api().exec('get_objects', [[dest_bitasset_data_id]]).then(res_obj => {
  //       let dest_feed = res_obj[0].current_feed.settlement_price
  //       let feed = parseInt(dest_feed.base.amount) / Math.pow(10, dest_precision) / parseInt(dest_feed.quote.amount) * Math.pow(10, source_precision)
  //       return source_amount * feed
  //     })
  //   } else {
  //     return Apis.instance().db_api().exec('get_objects', [[source_bitasset_data_id, dest_bitasset_data_id]]).then(res_obj => {
  //       let source_feed = res_obj[0].current_feed.settlement_price
  //       let dest_feed = res_obj[1].current_feed.settlement_price
  //       let feed = QueryChainStore.calcFeedPrice(source_feed, source_precision, dest_feed, dest_precision)
  //       return source_amount * feed
  //     })
  //   }
  // }

  // // 根据数字货币获取法币喂价
  // // source_asset_id ： 可抵押货币的id
  // // source_precision ： 可抵押货币精度
  // // dest_asset_id ： 可借贷货币的id
  // // dest_precision ： 可借贷货币的精度
  // // 返回喂价信息
  static getAssetExchangeFeed (source_asset_id, source_precision, dest_asset_id, dest_precision) {
    let feed = 0.0
    if (source_asset_id === dest_asset_id) return Promise.resolve(1.0)
    return Apis.instance().db_api().exec('get_asset_exchange_feed', [dest_asset_id, source_asset_id, 1]).then(res_obj => {
      if (res_obj && res_obj.current_feed && res_obj.current_feed.settlement_price) {
        feed = QueryChainStore.calcFeedPrice(res_obj.current_feed.settlement_price, dest_asset_id, dest_precision, source_asset_id, source_precision)
        return Promise.resolve(feed)
      } else {
        return Apis.instance().db_api().exec('get_asset_exchange_feed', [dest_asset_id, source_asset_id, 0]).then(res_obj => {
          if (res_obj && res_obj.current_feed && res_obj.current_feed.settlement_price) {
            feed = QueryChainStore.calcFeedPrice(res_obj.current_feed.settlement_price, dest_asset_id, dest_precision, source_asset_id, source_precision)
            return Promise.resolve(feed)
          } else {
            return Promise.resolve(feed)
          }
        }).catch(error => {
          console.log(error)
          return Promise.resolve(feed)
        })
      }
    }).catch(error => {
      console.log(error)
      return Promise.resolve(feed)
    })
  }
  static getAssetCoreFeed (source_asset_id, source_precision, dest_asset_id, dest_precision) {
    let feed = 0.0
    if (source_asset_id === dest_asset_id) return Promise.resolve(1.0)     
    return Apis.instance().db_api().exec('get_asset_exchange_feed', [dest_asset_id, source_asset_id, 0]).then(res_obj => {
      if (res_obj && res_obj.current_feed && res_obj.current_feed.settlement_price) {
        feed = QueryChainStore.calcFeedPrice(res_obj.current_feed.settlement_price, dest_asset_id, dest_precision, source_asset_id, source_precision)
        return Promise.resolve(feed)
      } else {
        return Promise.resolve(feed)
      }
    }).catch(error => {
      console.log(error)
      return Promise.resolve(feed)
    })
  }
  // 操作：用户增加优惠券
  static account_coupon (
    account_id,
    fee_asset_id = '1.3.0' // 手续费资产ID
  ) {
    let application_api = new ApplicationApi()
    return application_api.account_coupon(
      account_id, // 借款人ID
      fee_asset_id, // 手续费资产ID
      true
    ).then((tr) => {
      let asset = ChainStore.getObject(fee_asset_id)
      let tran_ser = tr.serialize()
      let fee_obj = {}
      fee_obj['fee_amount'] = tran_ser.operations[0][1].fee.amount
      fee_obj['fee_asset_id'] = tran_ser.operations[0][1].fee.asset_id
      fee_obj['fee_precision'] = asset.get('precision')
      let result = {}
      result['tr'] = tr
      result['fee'] = fee_obj
      return Promise.resolve(result)
    }).catch(error => {
      console.log(error)
      return Promise.reject(error)
    })
  }

  static add_custom (
    account_id,
    required_auths,
    id,
    data,
    fee_asset_id = '1.3.0' // 手续费资产ID
  ) {
    let application_api = new ApplicationApi()
    return application_api.add_custom(
      account_id, // 借款人ID
      required_auths,
      id,
      data,
      fee_asset_id, // 手续费资产ID
      true
    ).then((tr) => {
      let asset = ChainStore.getObject(fee_asset_id)
      let tran_ser = tr.serialize()
      let fee_obj = {}
      fee_obj['fee_amount'] = tran_ser.operations[0][1].fee.amount
      fee_obj['fee_asset_id'] = tran_ser.operations[0][1].fee.asset_id
      fee_obj['fee_precision'] = asset.get('precision')
      let result = {}
      result['tr'] = tr
      result['fee'] = fee_obj
      return Promise.resolve(result)
    }).catch(error => {
      console.log(error)
      return Promise.reject(error)
    })
  }

  // 查询：用户优惠券数量
  static get_account_coupon (account_id) {
    let result = {}
    return Apis.instance().db_api().exec('get_accounts_statistics', [[account_id]]).then((res_acc) => {
      let statistics = res_acc[0]
      let coupon_month = statistics.coupon_month
      let obj0 = ChainStore.FetchChain('getObject', '1.3.0', 5000)
      let obj1 = ChainStore.FetchChain('getObject', '2.1.0', 5000)
      let obj2 = ChainStore.FetchChain('getObject', '2.0.0', 5000)
      return Promise.all([obj0, obj1, obj2]).then((resObj) => {
        let amount = parseInt(statistics.amount_coupon) / Math.pow(10, resObj[0].get('precision'))
        let oDate = new Date(resObj[1].get('time'))
        let oIDate = new Date(resObj[2].get('initial_time'))
        let oMonth = oDate.getMonth()
        let oYear = oDate.getFullYear()
        let calDate = parseInt(oYear) * 100 + parseInt(oMonth) + 1
        let canReceiveCoupon = true
        let canReceiveCouponTime = true
        let coupon_per_month = resObj[2].get('parameters').get('coupon_per_month')
        let coupon_expire_time = resObj[2].get('parameters').get('coupon_expire_time')
        if (coupon_month === calDate || statistics.amount_coupon >= coupon_per_month || coupon_expire_time < (oDate.getTime() - oIDate.getTime()) / 1000) {
          canReceiveCoupon = false
        }
        if (coupon_month === calDate || coupon_expire_time < (oDate.getTime() - oIDate.getTime()) / 1000) {
          canReceiveCouponTime = false
        }
        result['amount'] = amount
        result['amountstr'] = amount.toFixed(resObj[0].get('precision'))
        result['canReceiveCoupon'] = canReceiveCoupon
        result['canReceiveCouponTime'] = canReceiveCouponTime
        result['coupon_per_month'] = coupon_per_month
        return result
      })
    })
  }

  // 修改链上的密码
  //name:用户名；
  //old_password:旧密码；
  //new_password:旧密码；
  static get_account_info (account, fee_asset_id, auth_pub, auth_priv) {
    let auth_data_info = QueryChainStore.memfromImmutableObj(account.getIn(['auth_data', 'info']))
    let auth_data_key = QueryChainStore.memfromImmutableObj(account.getIn(['auth_data', 'key']))
    let user_info = QueryChainStore.memfromImmutableObj(account.get('user_info'))
    let auth_key = account.getIn(['options', 'auth_key'])
    let issuer = account.get('id')

    console.log(auth_data_info, auth_data_key, user_info)

    let trxex = new TransactionBuilder()
    if ((auth_data_info && auth_data_info.from === auth_key) || (auth_data_key && auth_data_key.from === auth_key)) {
      let info = ''
      let key = ''
      if (auth_data_info && auth_data_info.from === auth_key) {
        try {
          info = PrivateKeyStore.decodeMemo(auth_data_info).text
        } catch (err) {
          info = ''
          console.log("auth_data_info decode error")
        }
      }
      if (auth_data_key && auth_data_key.from === auth_key) {
        try {
          key = PrivateKeyStore.decodeMemo(auth_data_key).text
        } catch (err) {
          key = ''
          console.log("auth_data_key decode error")
        }
      }
      if ((info && info !== '') || (key && key !== '')) {
        //console.log(info, key)
        let auth_param = {
          info: auth_data_info,
          key: auth_data_key
        }
        if (info && info !== '') {
          auth_param.info = auth_data_info
          auth_param.info.from = auth_pub
          auth_param.info.to = auth_pub
          auth_param.info.message = Aes.encrypt_with_checksum(
                        auth_priv,
                        auth_param.info.to,
                        auth_param.info.nonce,
                        info
                    )
        }  
        if (key && key !== '') {
          auth_param.key = auth_data_key
          auth_param.key.from = auth_pub
          auth_param.key.message = Aes.encrypt_with_checksum(
                        auth_priv,
                        auth_param.key.to,
                        auth_param.key.nonce,
                        key
                    )
        }  
        trxex.add_type_operation('account_authenticate', {
          fee: {
            amount: 0,
            asset_id: fee_asset_id
          },
          issuer: issuer,
          op_type: 5,
          auth_data: auth_param
        })
      }
    }
    if (user_info && user_info.from === auth_key) {
      let info = ''
      try {
        info = PrivateKeyStore.decodeMemo(user_info).text
      } catch (err) {
        info = ''
        console.log("user_info decode error")
      }
      if (info && info !== '') {
        //console.log(info)
        let auth_param = {
          info: user_info,
          key: user_info
        }
        auth_param.info = user_info
        auth_param.info.from = auth_pub
        auth_param.info.message = Aes.encrypt_with_checksum(
                        auth_priv,
                        auth_param.info.to,
                        auth_param.info.nonce,
                        info
                    )   
        trxex.add_type_operation('account_authenticate', {
          fee: {
            amount: 0,
            asset_id: fee_asset_id
          },
          issuer: issuer,
          op_type: 9,
          auth_data: auth_param
        })
      }
    }
    return trxex.operations.length > 0 ? trxex : null
  }
  static set_chain_password (
    name,
    old_password,
    new_password,
    fee_asset_id = '1.3.0' // 手续费资产ID
  ) {
    let vid = QueryChainStore.accountLogin(name, old_password)
    if (!vid) {
      return Promise.reject('Your old password is incorrect')
    }
    return FetchChain('getAccount', name, 5000).then(account => {
      let active = QueryChainStore.permissionsFromImmutableObj(account.get('active'))
      let owner = QueryChainStore.permissionsFromImmutableObj(account.get('owner'))
      let memo_key = account.get('options').get('memo_key')
      let auth_key = account.get('options').get('auth_key')

      let old_active_pub = WalletDb.generateKeyFromPassword(name, 'active', old_password).pubKey
      let old_owner_pub = WalletDb.generateKeyFromPassword(name, 'owner', old_password).pubKey

      const new_active = WalletDb.generateKeyFromPassword(name, 'active', new_password).pubKey
      const new_owner = WalletDb.generateKeyFromPassword(name, 'owner', new_password).pubKey
      const new_memo = WalletDb.generateKeyFromPassword(name, 'active', new_password).pubKey
      const auth_memo = WalletDb.generateKeyFromPassword(name, 'author', new_password).pubKey
      const auth_priv = WalletDb.generateKeyFromPassword(name, 'author', new_password).privKey

      let state = {
        active_accounts: active.accounts,
        active_keys: active.keys,
        active_addresses: active.addresses,
        owner_accounts: owner.accounts,
        owner_keys: owner.keys,
        owner_addresses: owner.addresses,
        active_weights: active.weights,
        owner_weights: owner.weights,
        active_threshold: active.threshold,
        owner_threshold: owner.threshold,
        memo_key: memo_key,
        auth_key: auth_key,
        prev_active_accounts: active.accounts,
        prev_active_keys: active.keys,
        prev_active_addresses: active.addresses,
        prev_owner_accounts: owner.accounts,
        prev_owner_keys: owner.keys,
        prev_owner_addresses: owner.addresses,
        prev_active_weights: active.weights,
        prev_owner_weights: owner.weights,
        prev_active_threshold: active.threshold,
        prev_owner_threshold: owner.threshold,
        prev_memo_key: memo_key,
        prev_auth_key: auth_key
      }
      const weights = {
        active: account.getIn([
          'active',
          'weight_threshold'
        ]),
        owner: account.getIn(['owner', 'weight_threshold'])
      }
      let index = -1
      // let s_active = QueryChainStore.onAddItem('active', new_active, active, state)
      index = state['active_keys'].indexOf(old_active_pub)
      let s_active = state['active_keys'].set(index, new_active)
      state['active_keys'] = s_active
      state['active_weights'][new_active] = weights.active
      // let s_owner = QueryChainStore.onAddItem('owner', new_owner, owner, state)
      index = state['owner_keys'].indexOf(old_owner_pub)
      let s_owner = state['owner_keys'].set(index, new_owner)
      state['owner_keys'] = s_owner
      state['owner_weights'][new_owner] = weights.owner
      state['memo_key'] = new_memo
      state['auth_key'] = auth_memo
      let updated_account = account.toJS()
      updated_account.fee = {
        amount: 0,
        asset_id: fee_asset_id
      }
      let updateObject = {
        account: updated_account.id
      }
      if (QueryChainStore.didChange('active', state)) {
        updateObject.active = QueryChainStore.permissionsToJson(
          state.active_threshold,
          state.active_accounts,
          state.active_keys,
          state.active_addresses,
          state.active_weights
        )
        // updateObject.limitactive = QueryChainStore.permissionsToJson(
        //     state.active_threshold,
        //     state.active_accounts,
        //     state.active_keys,
        //     state.active_addresses,
        //     state.active_weights
        // );
      }
      if (QueryChainStore.didChange('owner', state)) {
        updateObject.owner = QueryChainStore.permissionsToJson(
          state.owner_threshold,
          state.owner_accounts,
          state.owner_keys,
          state.owner_addresses,
          state.owner_weights
        )
      }
      if (
        QueryChainStore.didChange('owner', state) &&
            state.owner_keys.size === 0 &&
            state.owner_addresses.size === 0 &&
            state.owner_accounts.size === 1 &&
            state.owner_accounts.first() === updated_account.id
      ) {
        return Promise.reject("Setting your owner permissions like this will render your account permanently unusable. Please make sure you know what you're doing before modifying account authorities!")
      }
      if ((state.memo_key && QueryChainStore.didChange('memo', state) && QueryChainStore.isValidPubKey(state.memo_key)) || (state.auth_key && QueryChainStore.didChange('auth', state) && QueryChainStore.isValidPubKey(state.auth_key))) {
        updateObject.new_options = account.get('options').toJS()
        updateObject.new_options.memo_key = state.memo_key
        updateObject.new_options.auth_key = state.auth_key
        // console.log(state.memo_key.toString(), state.auth_key.toString())
      }
      let trxex = ZosInstance.get_account_info(account, fee_asset_id, auth_memo, auth_priv)
      let application_api = new ApplicationApi()
      return application_api.update_account(
        updateObject,
        trxex
      ).then((tr) => {
        let asset = ChainStore.getObject(fee_asset_id)
        let tran_ser = tr.serialize()
        let fee_obj = {}
        fee_obj['fee_amount'] = tran_ser.operations[0][1].fee.amount
        fee_obj['fee_asset_id'] = tran_ser.operations[0][1].fee.asset_id
        fee_obj['fee_precision'] = asset.get('precision')
        let result = {}
        result['tr'] = tr
        result['fee'] = fee_obj
        return Promise.resolve(result)
      }).catch(error => {
        console.log(error)
        return Promise.reject(error)
      })
    })
  }

  // 获取见证人/董事会
  // 获取见证人列表： type: witnesses
  // 获取董事会列表： type: committee
  static get_vote_objects (type) {
    return QueryChainStore.get_vote_objects(type)
  }

  // 获取可借贷资产列表
  static getLoanAssetList () {
    return Apis.instance().bitlender_api().exec('get_asset_by_property', [8]).then(res_loan => { // 可借贷货币
      return Promise.resolve(res_loan)
    })
  }

  // 返回账号的Active信息
  // 参数：账号id
  // 返回: ["账号1","账号2",...]
  static getAuthsFromAccount (account_id) {
    let result = []
    return Apis.instance().db_api().exec('get_accounts', [[account_id]]).then(account_list => {
      if (!account_list[0]) {
        return Promise.reject("Can't find the account " + account_id)
      }
      let acc_id_ary = []
      account_list[0].active.account_auths.forEach((item, index) => {
        acc_id_ary.push(item[0])
      })
      return Apis.instance().db_api().exec('get_accounts', [acc_id_ary]).then(account_list => {
        account_list.forEach((item, index) => {
          result.push(item.name)
        })
        return Promise.resolve(result)
      })
    })
  }

  // 是否可以修改借贷参数
  // bitlender_option_id: 借贷产品ID
  // account_id: 用户ID
  // 返回：true(能)/false(不能)
  static can_edit_bitlender_option (bitlender_option_id, account_id, type) {
    let key = ZosInstance.getOptionKey(type)
    return Apis.instance().bitlender_api().exec('can_edit_bitlender_option', [bitlender_option_id, account_id, key]).then(can_edit => {
      return can_edit
    })
  }

  // 查找提案列表
  static get_proposals (account_id) {
    let result = []
    return Apis.instance().db_api().exec('get_proposed_transactions', [account_id]).then(propos => {
      return new Promise((resolve, reject) => {
        async.each(propos, function (res, allcallback) {
          let obj = {}
          let operations = res.proposed_transaction.operations // 此operations是个数组，展示的时候要注意
          let type = res.required_active_approvals.length ? 'active' : 'owner'
          let str_available = 'available_' + type + '_approvals'
          let available = res[str_available] // 同意的列表
          let availableKeys = res['available_key_approvals']
          let str_required = 'required_' + type + '_approvals'
          let required = res[str_required] // 必要的账号的列表
          obj['id'] = res.id // 提案ID
          obj['expiration_time'] = QueryChainStore.getTimezoneDate(res.expiration_time) // 截止时间
          obj['create_time'] = QueryChainStore.getTimezoneDate(res.create_time) // 截止时间
          obj['operations'] = operations // 展示具体信息
          obj['type'] = type // 类型
          obj['available_keys'] = availableKeys // 已同意的账号公钥
          if (operations[0][0] !== 53 && operations[0][0] !== 87 && operations[0][0] !== 51 && operations[0][0] !== 111) {
            allcallback(null)
            return
          }
          return FetchChain('getAccount', required).then(requ_accountlist => {
            let approval_list = []
            requ_accountlist.forEach((requ_accounts, index) => {
              let typelist = requ_accounts.getIn([type, 'account_auths']).toJS()
              let approval = typelist.map(a => a[0]).filter(id_item => {
                let id = id_item
                if (available.indexOf(id) >= 0) {
                  return true
                } else {
                  return false
                }
              })
              approval_list = approval_list.concat(approval)
            })

            return Promise.all([
              FetchChain('getAccount', approval_list),
              FetchChain('getAccount', res.proposer)
            ]).then(res_accounts => {
              let acc_objs = []
              let [ava_accounts, proposer_acc] = res_accounts
              obj['proposer'] = proposer_acc.get('name') // 发起人名字
              obj['proposer_id'] = res.proposer // 发起人ID
              ava_accounts.forEach((item, index) => {
                if (item) {
                  let acc_obj = {}
                  acc_obj['available_id'] = item.get('id') // 已同意的用户ID
                  acc_obj['available_name'] = item.get('name') // 已同意的用户账号
                  acc_objs.push(acc_obj)
                }
              })
              obj['available_list'] = acc_objs // 已同意用户列表
              obj['can_approve'] = false
              if (available.indexOf(account_id) === -1) {
                obj['can_approve'] = true // 显示批准按钮
              }
              obj['can_reject'] = false
              if (available.indexOf(account_id) !== -1) {
                obj['can_reject'] = true // 显示否决按钮
              }

              result.push(obj)
              allcallback(null)
            })
          })
          // allcallback(null)
        }, function (allerr) {
          if (allerr) {
            console.log('err', allerr)
          }
          return resolve(result)
        })
      })
    })
  }

  // 查找需要同意或拒绝的账号和Key列表
  // 参数：
  // propos_id: 提案ID
  // op_type: 0-批准提案；1-否决提案
  static get_propos_required_list (propos_id, op_type = 0) {
    return QueryChainStore.get_propos_required_list(propos_id, op_type)
  }

  // 提交提案操作
  /*
    参数：
        propos_id: 提案ID
        accountMap: 函数get_propos_required_list返回的 accounts_map
        keyMap: 函数get_propos_required_list返回的 keys_map
        op_type: 0-批准提案；1-否决提案
        type: 函数get_proposals 返回的 type
        pay_account_id: 付费账号ID（本账号ID）
        sel_account_name: 选择的批准提案的账号名字或公钥
    */
  static proposal_update (propos_id, accountMap, keyMap, op_type, type, pay_account_id, sel_account_name, fee_asset_id = '1.3.0') {
    return Apis.instance().db_api().exec('get_objects', [[propos_id]]).then(proposList => {
      let propos = proposList[0]
      let proposal = {
        fee_paying_account: pay_account_id,
        proposal: propos_id,
        active_approvals_to_add: [],
        active_approvals_to_remove: [],
        owner_approvals_to_add: [],
        owner_approvals_to_remove: [],
        key_approvals_to_add: [],
        key_approvals_to_remove: []
      }
      let isAdd = op_type === 0
      let neededKeys = []
      let state = {}
      if (keyMap[sel_account_name]) {
        state['key'] = sel_account_name
        state[type] = null
      } else if (sel_account_name) {
        state[type] = accountMap[sel_account_name]
        state['key'] = null
      } else {
        state[type] = null
        state['key'] = null
      }
      ['active', 'owner', 'key'].forEach(auth_type => {
        let value = state[auth_type]
        if (value) {
          let str_type = 'available_' + auth_type + '_approvals'
          let hasValue = propos[str_type].indexOf(value) !== -1
          if ((isAdd && !hasValue) || (!isAdd && hasValue)) {
            if (isAdd) {
              proposal[auth_type + '_approvals_to_add'] = [value]
              if (auth_type === 'key') neededKeys.push(value)
            } else {
              proposal[auth_type + '_approvals_to_remove'] = [value]
              if (auth_type === 'key') neededKeys.push(value)
            }
          }
        }
      })
      let application_api = new ApplicationApi()
      return application_api.proposal_update(
        proposal,
        neededKeys,
        true
      ).then((tr) => {
        let asset = ChainStore.getObject(fee_asset_id)
        let tran_ser = tr.serialize()
        let fee_obj = {}
        fee_obj['fee_amount'] = tran_ser.operations[0][1].fee.amount
        fee_obj['fee_asset_id'] = tran_ser.operations[0][1].fee.asset_id
        fee_obj['fee_precision'] = asset.get('precision')
        let result = {}
        result['tr'] = tr
        result['fee'] = fee_obj
        return Promise.resolve(result)
      }).catch(error => {
        console.log(error)
        return Promise.reject(error)
      })
    })
  }

  // 提交新增借贷参数
  /*
     参数：
     issuer: 修改人
     asset_id: 资产ID
     sproduct: 产品名称
     options: 修改的参数对象
     */
  static bitlender_option_carriers_update (issuer, author, option_id, options, loanCarrier, investCarriers, fee_asset_id = '1.3.0') {
    let application_api = new ApplicationApi()
    let obj = ChainStore.getObject('2.1.0')
    let chain_time = obj.get('time')

    options.carriers = []
    options.allowed_collateralize = []
    for (var index = 0; index < investCarriers.length; index++) {
      let id = investCarriers[index].id
      let aid = '1.3.' + id.substr(4)
      options.allowed_collateralize.push(aid)
    }
    for (var index = 0; index < loanCarrier.length; index++) {
      options.carriers.push(loanCarrier[index].id)
    }

    options.repayment_period_uint = 10000
    return application_api.bitlender_option_update(
      issuer,
      author,
      option_id,
      options,
      fee_asset_id, // 手续费资产ID
      chain_time,
      true
    ).then((tr) => {
      let asset = ChainStore.getObject(fee_asset_id)
      let tran_ser = tr.serialize()
      let fee_obj = {}
      fee_obj['fee_amount'] = tran_ser.operations[0][1].fee.amount
      fee_obj['fee_asset_id'] = tran_ser.operations[0][1].fee.asset_id
      fee_obj['fee_precision'] = asset.get('precision')
      let result = {}
      result['tr'] = tr
      result['fee'] = fee_obj
      return Promise.resolve(result)
    }).catch(error => {
      console.log(error)
      return Promise.reject(error)
    })
  }
  static bitlender_option_create (issuer, asset_id, sproduct, options, fee_asset_id = '1.3.0') {
    let application_api = new ApplicationApi()
    let obj = ChainStore.getObject('2.1.0')
    let chain_time = obj.get('time')
    return application_api.bitlender_option_create(
      issuer,
      asset_id,
      sproduct,
      options,
      fee_asset_id, // 手续费资产ID
      chain_time,
      true
    ).then((tr) => {
      let asset = ChainStore.getObject(fee_asset_id)
      let tran_ser = tr.serialize()
      let fee_obj = {}
      fee_obj['fee_amount'] = tran_ser.operations[0][1].fee.amount
      fee_obj['fee_asset_id'] = tran_ser.operations[0][1].fee.asset_id
      fee_obj['fee_precision'] = asset.get('precision')
      let result = {}
      result['tr'] = tr
      result['fee'] = fee_obj
      return Promise.resolve(result)
    }).catch(error => {
      console.log(error)
      return Promise.reject(error)
    })
  }

  // 提交修改借贷参数
  /*
    参数：
        issuer: 修改人
        author: 董事会
        option_id: 产品ID
        options: 修改的参数对象
    */
  static bitlender_option_update (issuer, author, option_id, options, fee_asset_id = '1.3.0') {
    let application_api = new ApplicationApi()
    let obj = ChainStore.getObject('2.1.0')
    let chain_time = obj.get('time')
    options.repayment_period_uint = 10001
    return application_api.bitlender_option_update(
      issuer,
      author,
      option_id,
      options,
      fee_asset_id, // 手续费资产ID
      chain_time,
      true
    ).then((tr) => {
      let asset = ChainStore.getObject(fee_asset_id)
      let tran_ser = tr.serialize()
      let fee_obj = {}
      fee_obj['fee_amount'] = tran_ser.operations[0][1].fee.amount
      fee_obj['fee_asset_id'] = tran_ser.operations[0][1].fee.asset_id
      fee_obj['fee_precision'] = asset.get('precision')
      let result = {}
      result['tr'] = tr
      result['fee'] = fee_obj
      return Promise.resolve(result)
    }).catch(error => {
      console.log(error)
      return Promise.reject(error)
    })
  }

  // (动作)提交修改利率
  /*
    参数：
        option_id: 产品ID
        issuer: 修改人
        interest_rate_add: 添加的利率
        interest_rate_remove: 删除的利率
    */
  static bitlender_rate_update (option_id, issuer, interest_rate_add, interest_rate_remove, type, fee_asset_id = '1.3.0') {
    let application_api = new ApplicationApi()
    return application_api.bitlender_rate_update(
      option_id,
      issuer,
      interest_rate_add,
      interest_rate_remove,
      fee_asset_id, // 手续费资产ID
      true
    ).then((tr) => {
      let asset = ChainStore.getObject(fee_asset_id)
      let tran_ser = tr.serialize()
      let fee_obj = {}
      fee_obj['fee_amount'] = tran_ser.operations[0][1].fee.amount
      fee_obj['fee_asset_id'] = tran_ser.operations[0][1].fee.asset_id
      fee_obj['fee_precision'] = asset.get('precision')
      let result = {}
      result['tr'] = tr
      result['fee'] = fee_obj
      return Promise.resolve(result)
    }).catch(error => {
      console.log(error)
      return Promise.reject(error)
    })
  }

  // 获取不良资产列表
  /*
    参数：
        order_id_list: 要查询的订单ID数组
    */
  // static get_NPL_orders (
  //   order_id_list
  // ) {
  //   let result = []
  //   return Apis.instance().db_api().exec('get_objects', [order_id_list]).then(res_list => {
  //     return new Promise((resolve, reject) => {
  //       async.each(res_list, function (res, allcallback) {
  //         if (!res) {
  //           allcallback(null)
  //           return
  //         }
  //         Apis.instance().db_api().exec('get_objects', [[res.amount_to_collateralize.asset_id, res.amount_to_loan.asset_id]]).then(asset_obj => {
  //           // 处理时区
  //           // tzo: TimeZoneOffset; 格林威治时间和本地时间之间的时差
  //           // 挂单截止时间
  //           res['expiration_time'] = QueryChainStore.getTimezoneDate(res['expiration_time'])

  //           // 满标时间
  //           res['invest_finish_time'] = QueryChainStore.getTimezoneDate(res['invest_finish_time'])

  //           // 借款时间
  //           res['loan_time'] = QueryChainStore.getTimezoneDate(res['loan_time'])

  //           // 实际还本时间
  //           res['repay_principal_time'] = QueryChainStore.getTimezoneDate(res['repay_principal_time'])

  //           // 预计还本时间
  //           res['expect_principal_time'] = QueryChainStore.getTimezoneDate(res['expect_principal_time'])

  //           // 不良资产逾期时间(预计还本时间+overdue_expiration_time)
  //           let date_expect_principal = new Date(res['expect_principal_time'])
  //           var time_overdue = date_expect_principal.getTime() + parseInt(res.overdue_expiration_time) * 1000
  //           res['overdue_recycle_time'] = QueryChainStore.formatDate(new Date(time_overdue))

  //           res.repay_interest.forEach(interest => {
  //             interest[1].expect_time = QueryChainStore.getTimezoneDate(interest[1].expect_time)
  //           })

  //           res['collateralize_asset'] = asset_obj[0] // 抵押资产的具体信息
  //           res['loan_asset'] = asset_obj[1] // 借款资产的具体信息
  //           var unpaidAmount = 0
  //           res.repay_interest.forEach(interest => {
  //             // let tzo_expect_time = new Date(interest[1].expect_time)
  //             // let tzo_t_expect_time = tzo_expect_time.getTime() - tzo_expect_time.getTimezoneOffset()*60000
  //             // interest[1].expect_time = QueryChainStore.formatDate(new Date(tzo_t_expect_time))
  //             if (interest[1].interest_state == 1 || interest[1].interest_state == 3) {
  //               unpaidAmount = unpaidAmount + parseInt(interest[1].expect_repay_interest.amount) // 应还金额(已处理精度)
  //             }
  //           })
  //           res['unpaid_amount'] = (unpaidAmount + parseInt(res.amount_to_loan.amount)) / Math.pow(10, res['loan_asset'].precision) // 未还金额(未还利息加本金)
  //           var borrow_user_id = res.issuer
  //           FetchChain('getAccount', borrow_user_id, 5000).then((res_user) => {
  //             res['borrow_user_name'] = res_user.get('name') // 借款人姓名
  //             QueryChainStore.get_invest_process(res.id).then(res_pro => {
  //               res['invest_process'] = res_pro.process // 借款订单的进度
  //               res['invest_process_amount'] = parseInt(res_pro.amount) // 借款订单的目前投资额 (没有处理精度)
  //               result.push(res)
  //               allcallback(null)
  //             })
  //           })
  //         })
  //       }, function (allerr) {
  //         if (allerr) {
  //           console.log('err', allerr)
  //         }
  //         return resolve(result)
  //       })
  //     })
  //   })
  // }

  // (动作)处理不良资产
  /*
    参数：
        issuer: 修改人
        order_id: 借款订单ID
        asset_pay: 金额(数字)
        memo: 备注(必填)
    */
  static bitlender_recycle (issuer, order_id, asset_pay, memo, fee_asset_id = '1.3.0') {
    let application_api = new ApplicationApi()
    return application_api.bitlender_recycle(
      issuer,
      order_id,
      asset_pay,
      memo,
      fee_asset_id, // 手续费资产ID
      true
    ).then((tr) => {
      let asset = ChainStore.getObject(fee_asset_id)
      let tran_ser = tr.serialize()
      let fee_obj = {}
      fee_obj['fee_amount'] = tran_ser.operations[0][1].fee.amount
      fee_obj['fee_asset_id'] = tran_ser.operations[0][1].fee.asset_id
      fee_obj['fee_precision'] = asset.get('precision')
      let result = {}
      result['tr'] = tr
      result['fee'] = fee_obj
      return Promise.resolve(result)
    }).catch(error => {
      console.log(error)
      return Promise.reject(error)
    })
  }

  // 获取两个资产的喂价信息
  /*
    参数：
        collateral_asset_id: 抵押资产ID
        collateral_bitasset_data_id: 抵押资产的 bitasset_data_id
        collateral_precision: 抵押资产的精度
        borrow_asset_id: 借款资产ID
        borrow_bitasset_data_id: 借款资产 bitasset_data_id
        borrow_precision: 借款资产精度
    */
  static get_NPL_feed (collateral_asset_id, collateral_bitasset_data_id, collateral_precision, borrow_asset_id, borrow_bitasset_data_id, borrow_precision) {
    let result = {}
    // if(collateral_asset_id === '1.3.0') {
    //     return Apis.instance().db_api().exec("get_objects", [[borrow_bitasset_data_id]]).then(res_obj =>{
    //         if(res_obj[0]){
    //             if(res_obj[0].current_feed){
    //                 if(res_obj[0].current_feed.settlement_price){
    //                     let borrow_feed = res_obj[0].current_feed.settlement_price
    //                     let base = {amount : 100, asset_id : "1.3.0"}
    //                     let quote = {amount : 100, asset_id : "1.3.0"}
    //                     let zos_asset = ChainStore.getObject('1.3.0')
    //                     let zos_precision = zos_asset.get("precision")
    //                     let collateral_feed = {base, quote}
    //                     result["feed_price"] =  QueryChainStore.calcFeedPrice(collateral_feed, zos_precision, borrow_feed, borrow_precision)
    //                     return Promise.resolve(result)
    //                 }
    //             }
    //         }
    //     })
    //     return Promise.reject('no feed')
    // }
    return Apis.instance().db_api().exec('get_asset_exchange_feed', [borrow_asset_id, collateral_asset_id, 1]).then(res_obj => {
      let feed = null
      if (res_obj) {
        if (res_obj.current_feed) {
          if (res_obj.current_feed.settlement_price) {
            feed = res_obj.current_feed.settlement_price
          }
        }
      }
      result['feed_price'] = QueryChainStore.calcFeedPrice(feed, collateral_precision, borrow_precision)
      result['feed_price_view'] = QueryChainStore.calcFeedPriceView(feed, collateral_precision, borrow_precision)
      return Promise.resolve(result)
    })
  }

  // 获取运营商列表
  /*
     参数：
     lower_bound_name: 起始名字
     limit: 查找数量
     */
  static lookup_carrier_accounts (lower_bound_name = 'A', limit = 100) {
    let result = []
    return Apis.instance().db_api().exec('lookup_carrier_accounts', [lower_bound_name, limit]).then(res_list => {
      return new Promise((resolve, reject) => {
        async.each(res_list, function (res, allcallback) {
          let obj_ary = []
          Apis.instance().db_api().exec('get_account_by_name', [res[0]]).then(account_obj => {
            obj_ary.push(account_obj.name)
            obj_ary.push(account_obj.id)
            result.push(obj_ary)
            allcallback(null)
          })
        }, function (allerr) {
          if (allerr) {
            console.log('err', allerr)
            return reject('lookup_carrier_accounts Error')
          }
          return resolve(result)
        })
      })
    })
  }

  // 获取币种对应的网关的url
  /*
     参数：
     asset_id: 资产ID
     返回：
     [{name:'gateway1', url:'www.gateway.com/v1'},...]
     */
  static get_gateway_url (asset_id) {
    let result = []
    return Apis.instance().db_api().exec('get_objects', [[asset_id]]).then(res_list => {
      return new Promise((resolve, reject) => {
        async.each(res_list[0].whitelist_gateways, function (res, allcallback) {
          if (!res || res === '') {
            allcallback(null)
            return
          }
          Apis.instance().db_api().exec('get_gateway_by_account', [res]).then(gateway_obj => {
            if (gateway_obj.url) {
              result.push(gateway_obj.url + '/zos-gateway')
            } else {
              result.push('')
            }
            allcallback(null)
          })
        }, function (allerr) {
          if (allerr) {
            console.log('err', allerr)
            return reject('get_gateway_info : ' + allerr)
          }
          return resolve(result)
        })
      })
    })
  }

  // 获取安全运行时间
  // 返回时间差（毫秒）
  // *不是promise
  static get_safe_runtime () {
    let obj = ChainStore.getObject('2.1.0')
    let head_init_time = obj.get('initial_time')
    let head_time = new Date(head_init_time + '+00:00').getTime()
    return head_time
  }

  // // 跳借款订单详情时需要的返回值
  // // order_id: 借款订单ID
  // static get_orderinfo_by_id (
  //   order_id
  // ) {
  //   return Apis.instance().db_api().exec('get_objects', [[order_id]]).then(res_list => {
  //     let res = res_list[0]
  //     return Apis.instance().db_api().exec('get_objects', [[res.amount_to_collateralize.asset_id, res.amount_to_loan.asset_id]]).then(asset_obj => {
  //       res['collateralize_asset'] = asset_obj[0] // 抵押资产的具体信息
  //       res['loan_asset'] = asset_obj[1] // 借款资产的具体信息
  //       // 还款总金额
  //       let repay_amount_sum = parseInt(res.amount_to_loan.amount)
  //       res.repay_interest.forEach(interest => {
  //         repay_amount_sum = repay_amount_sum + parseInt(interest[1].amount_repay_interest.amount) + parseInt(interest[1].fines_repay_interest.amount)
  //       })
  //       repay_amount_sum = repay_amount_sum / Math.pow(10, res['loan_asset'].precision)
  //       res['repay_amount_sum'] = repay_amount_sum // 还款总金额 （已处理精度）

  //       // 处理时区
  //       // tzo: TimeZoneOffset; 格林威治时间和本地时间之间的时差
  //       // 挂单截止时间
  //       res['expiration_time'] = QueryChainStore.getTimezoneDate(res['expiration_time'])

  //       // 满标时间
  //       res['invest_finish_time'] = QueryChainStore.getTimezoneDate(res['invest_finish_time'])

  //       // 借款时间
  //       res['loan_time'] = QueryChainStore.getTimezoneDate(res['loan_time'])

  //       // 实际还本时间
  //       res['repay_principal_time'] = QueryChainStore.getTimezoneDate(res['repay_principal_time'])

  //       // 预计还本时间
  //       res['expect_principal_time'] = QueryChainStore.getTimezoneDate(res['expect_principal_time'])

  //       // 不良资产逾期时间
  //       res['overdue_recycle_time'] = QueryChainStore.getTimezoneDate(res['overdue_recycle_time'])

  //       // 处理还息的时间
  //       res.repay_interest.forEach(interest => {
  //         interest[1].expect_time = QueryChainStore.getTimezoneDate(interest[1].expect_time)
  //       })

  //       // 处理还息数据
  //       let interest_list = []
  //       res.repay_interest.forEach(interest => {
  //         let int_obj = {}
  //         int_obj['id'] = interest[0] // 序号
  //         int_obj['asset_id'] = interest[1].amount_repay_interest.asset_id // 资产ID
  //         int_obj['amount'] = parseInt(interest[1].expect_repay_interest.amount) / Math.pow(10, res['loan_asset'].precision) // 应还金额(已处理精度)
  //         int_obj['finish_amount'] = 0
  //         int_obj['finish_time'] = '' // 实际还款时间
  //         if (interest[1].interest_state == 2 || interest[1].interest_state == 4) {
  //           int_obj['finish_amount'] = (parseInt(interest[1].amount_repay_interest.amount) + parseInt(interest[1].fines_repay_interest.amount)) / Math.pow(10, res['loan_asset'].precision) // 实还金额(已处理精度)
  //           int_obj['finish_time'] = QueryChainStore.getTimezoneDate(interest[1].finish_time) // 实际还款时间
  //         }
  //         int_obj['amount_repay_interest'] = parseInt(interest[1].amount_repay_interest.amount) / Math.pow(10, res['loan_asset'].precision) // 实际还的利息
  //         int_obj['fines_repay_interest'] = parseInt(interest[1].fines_repay_interest.amount) / Math.pow(10, res['loan_asset'].precision) // 罚息资产
  //         int_obj['expect_time'] = interest[1].expect_time // 预计还款时间
  //         int_obj['interest_rate'] = interest[1].interest_rate.interest_rate // 利率
  //         int_obj['interest_state'] = interest[1].interest_state // 状态
  //         interest_list.push(int_obj)
  //       })
  //       // 将最后一期的数量置为：利息加上借款的本金
  //       // if(interest_list.length > 0){
  //       //     interest_list[interest_list.length - 1].amount = interest_list[interest_list.length - 1].amount + (res.amount_to_loan.amount / Math.pow(10, res["loan_asset"].precision))
  //       //     if(interest_list[interest_list.length - 1].interest_state == 2){
  //       //         interest_list[interest_list.length - 1].finish_amount = interest_list[interest_list.length - 1].finish_amount + (res.amount_to_loan.amount / Math.pow(10, res["loan_asset"].precision))
  //       //     }
  //       // }
  //       res['interest_list'] = interest_list // 还息数据

  //       let col_bitasset_data_id = asset_obj[0].bitasset_data_id
  //       if (!col_bitasset_data_id) {
  //         col_bitasset_data_id = '1.3.0'
  //       }
  //       return Apis.instance().db_api().exec('get_asset_exchange_feed', [res.amount_to_loan.asset_id, res.amount_to_collateralize.asset_id, 1]).then(asset_obj2 => {
  //         let col_maintenance_collateral_ratio = 0 // 当前喂价下最小抵押倍数
  //         res['feed'] = null
  //         if (asset_obj2) {
  //           if (asset_obj2.current_feed) {
  //             col_maintenance_collateral_ratio = asset_obj2.current_feed.maintenance_collateral_ratio / 1000
  //             if (asset_obj2.current_feed.settlement_price) {
  //               res['feed'] = asset_obj2.current_feed.settlement_price // 抵押资产的喂价
  //             }
  //           }
  //         }
  //         res['maintenance_collateral_cash_ratio'] = col_maintenance_collateral_ratio

  //         // res["collateralize_feed"] = ""
  //         // let col_maintenance_collateral_cash_ratio = 0  //当前喂价下最小抵押倍数
  //         // if(res.amount_to_collateralize.asset_id === '1.3.0'){
  //         //     let col_info = QueryChainStore.get_core_asset_info()
  //         //     res["collateralize_feed"] = col_info.feed
  //         //     col_maintenance_collateral_cash_ratio = col_info.maintenance_collateral_cash_ratio
  //         // }else{
  //         //     if(asset_obj2[0]){
  //         //         if(asset_obj2[0].current_feed){
  //         //             col_maintenance_collateral_cash_ratio = asset_obj2[0].current_feed.maintenance_collateral_cash_ratio / 1000
  //         //             if(asset_obj2[0].current_feed.settlement_price){
  //         //                 res["collateralize_feed"] = asset_obj2[0].current_feed.settlement_price     //抵押资产的喂价
  //         //             }
  //         //         }
  //         //     }
  //         // }
  //         // res["maintenance_collateral_cash_ratio"] = col_maintenance_collateral_cash_ratio

  //         // res["borrow_feed"] = ""
  //         // if(asset_obj2[1]){
  //         //     if(asset_obj2[1].current_feed){
  //         //         if(asset_obj2[1].current_feed.settlement_price){
  //         //             res["borrow_feed"] = asset_obj2[1].current_feed.settlement_price        //借款资产的喂价
  //         //         }
  //         //     }
  //         // }
  //         // quote是zos，base是此货币
  //         let feed_price = QueryChainStore.calcFeedPrice(res['feed'], asset_obj[0].precision, asset_obj[1].precision)
  //         res['feed_price'] = feed_price // 当前喂价
  //         return Promise.resolve(res)
  //       })
  //     })
  //   })
  // }

  // // 跳历史借款订单详情时需要的返回值
  // // order_id: 借款订单ID
  // static get_orderinfo_history_by_id (order_id) {
  //   return Apis.instance().history_api().exec('get_object_history', [order_id]).then(res => {
  //     // 处理时区
  //     // tzo: TimeZoneOffset; 格林威治时间和本地时间之间的时差
  //     // 挂单截止时间
  //     res['expiration_time'] = QueryChainStore.getTimezoneDate(res['expiration_time'])

  //     // 满标时间
  //     res['invest_finish_time'] = QueryChainStore.getTimezoneDate(res['invest_finish_time'])

  //     // 借款时间
  //     res['loan_time'] = QueryChainStore.getTimezoneDate(res['loan_time'])

  //     // 实际还本时间
  //     res['repay_principal_time'] = QueryChainStore.getTimezoneDate(res['repay_principal_time'])

  //     // 预计还本时间
  //     res['expect_principal_time'] = QueryChainStore.getTimezoneDate(res['expect_principal_time'])

  //     // 不良资产逾期时间
  //     res['overdue_recycle_time'] = QueryChainStore.getTimezoneDate(res['overdue_recycle_time'])

  //     // 处理还息的时间
  //     res.repay_interest.forEach(interest => {
  //       interest[1].expect_time = QueryChainStore.getTimezoneDate(interest[1].expect_time)
  //     })
  //     return Apis.instance().db_api().exec('get_objects', [[res.amount_to_collateralize.asset_id, res.amount_to_loan.asset_id]]).then(asset_obj => {
  //       res['collateralize_asset'] = asset_obj[0] // 抵押资产的具体信息
  //       res['loan_asset'] = asset_obj[1] // 借款资产的具体信息
  //       // 还款总金额
  //       let repay_amount_sum = parseInt(res.amount_to_loan.amount)
  //       repay_amount_sum = repay_amount_sum + parseInt(res.repay_principal_fee.amount)
  //       res.repay_interest.forEach(interest => {
  //         repay_amount_sum = repay_amount_sum + parseInt(interest[1].amount_repay_interest.amount) + parseInt(interest[1].fines_repay_interest.amount)
  //       })
  //       repay_amount_sum = repay_amount_sum / Math.pow(10, res['loan_asset'].precision)
  //       res['repay_amount_sum'] = repay_amount_sum // 还款总金额 （已处理精度）

  //       // 处理还息数据
  //       let interest_list = []
  //       res.repay_interest.forEach(interest => {
  //         let int_obj = {}
  //         int_obj['id'] = interest[0] // 序号
  //         int_obj['asset_id'] = interest[1].amount_repay_interest.asset_id // 资产ID
  //         int_obj['amount'] = parseInt(interest[1].expect_repay_interest.amount) / Math.pow(10, res['loan_asset'].precision) // 应还金额(已处理精度)
  //         int_obj['finish_amount'] = 0
  //         int_obj['finish_time'] = '' // 实际还款时间
  //         if (interest[1].interest_state === 2 || interest[1].interest_state === 4) {
  //           int_obj['finish_amount'] = (parseInt(interest[1].amount_repay_interest.amount) + parseInt(interest[1].fines_repay_interest.amount)) / Math.pow(10, res['loan_asset'].precision) // 实还金额(已处理精度)
  //           int_obj['finish_time'] = QueryChainStore.getTimezoneDate(interest[1].finish_time) // 实际还款时间
  //         }
  //         int_obj['amount_repay_interest'] = parseInt(interest[1].amount_repay_interest.amount) / Math.pow(10, res['loan_asset'].precision) // 实际还的利息
  //         int_obj['fines_repay_interest'] = parseInt(interest[1].fines_repay_interest.amount) / Math.pow(10, res['loan_asset'].precision) // 罚息资产
  //         int_obj['expect_time'] = interest[1].expect_time // 预计还款时间
  //         int_obj['interest_rate'] = interest[1].interest_rate.interest_rate // 利率
  //         int_obj['interest_state'] = interest[1].interest_state // 状态
  //         interest_list.push(int_obj)
  //       })
  //       // 将最后一期的数量置为：利息加上借款的本金
  //       // if(interest_list.length > 0){
  //       //     interest_list[interest_list.length - 1].amount = interest_list[interest_list.length - 1].amount + (res.amount_to_loan.amount / Math.pow(10, res["loan_asset"].precision))
  //       //     if(interest_list[interest_list.length - 1].interest_state == 2){
  //       //         interest_list[interest_list.length - 1].finish_amount = interest_list[interest_list.length - 1].finish_amount + (res.amount_to_loan.amount / Math.pow(10, res["loan_asset"].precision))
  //       //     }
  //       // }
  //       res['interest_list'] = interest_list // 还息数据
  //       return Promise.resolve(res)
  //     })
  //   })
  // }

  // // 跳投资订单详情时需要的返回值
  // // invest_id: 投资订单ID
  // static get_invest_orderinfo_by_id (
  //   invest_id
  // ) {
  //   return Apis.instance().db_api().exec('get_objects', [[invest_id]]).then(res_list => {
  //     let res = res_list[0]
  //     // 处理时区
  //     // tzo: TimeZoneOffset; 格林威治时间和本地时间之间的时差
  //     // 应标时间
  //     res['invest_time'] = QueryChainStore.getTimezoneDate(res['invest_time'])

  //     // 实际还本时间
  //     res['repay_principal_time'] = QueryChainStore.getTimezoneDate(res['repay_principal_time'])

  //     return Apis.instance().db_api().exec('get_objects', [[res.amount_to_invest.asset_id]]).then(asset_obj => {
  //       res['invest_asset'] = asset_obj[0] // 投资资产的具体信息
  //       res['invest_amount'] = parseInt(res.amount_to_invest.amount) / Math.pow(10, asset_obj[0].precision) // 投资资产的数量（处理了精度）
  //       // 收益
  //       let interest_sum = 0
  //       res.repay_interest.forEach(interest => {
  //         interest_sum = interest_sum + parseInt(interest[1].amount_repay_interest.amount)
  //         interest_sum = interest_sum + parseInt(interest[1].fines_repay_interest.amount)

  //         // 处理还息时间
  //         interest[1]['finish_time'] = QueryChainStore.getTimezoneDate(interest[1].finish_time)
  //       })
  //       res['repay_interest_sum'] = interest_sum / Math.pow(10, asset_obj[0].precision) // 实际收益（处理了精度）
  //       res['repay_interest_rate'] = res['repay_interest_sum'] / res['invest_amount'] // 实际收益率
  //       return Promise.resolve(res)
  //     })
  //   })
  // }

  // // 跳历史投资订单详情时需要的返回值
  // // invest_id: 投资订单ID
  // static get_invest_history_orderinfo_by_id (invest_id) {
  //   return Apis.instance().history_api().exec('get_object_history', [invest_id]).then(res => {
  //     // 处理时区
  //     // tzo: TimeZoneOffset; 格林威治时间和本地时间之间的时差
  //     // 应标时间
  //     res['invest_time'] = QueryChainStore.getTimezoneDate(res['invest_time'])

  //     // 实际还本时间
  //     res['repay_principal_time'] = QueryChainStore.getTimezoneDate(res['repay_principal_time'])

  //     return Apis.instance().db_api().exec('get_objects', [[res.amount_to_invest.asset_id]]).then(asset_obj => {
  //       res['invest_asset'] = asset_obj[0] // 投资资产的具体信息
  //       res['invest_amount'] = parseInt(res.amount_to_invest.amount) / Math.pow(10, asset_obj[0].precision) // 投资资产的数量（处理了精度）
  //       // 收益
  //       let interest_sum = 0
  //       res.repay_interest.forEach(interest => {
  //         interest_sum = interest_sum + parseInt(interest[1].amount_repay_interest.amount)
  //         interest_sum = interest_sum + parseInt(interest[1].fines_repay_interest.amount)

  //         // 处理还息时间
  //         interest[1]['finish_time'] = QueryChainStore.getTimezoneDate(interest[1].finish_time)
  //       })
  //       res['repay_interest_sum'] = interest_sum / Math.pow(10, asset_obj[0].precision) // 实际收益（处理了精度）
  //       res['repay_interest_rate'] = res['repay_interest_sum'] / res['invest_amount'] // 实际收益率
  //       return Promise.resolve(res)
  //     })
  //   })
  // }

  // 获取系统参数
  static get_bitlender_paramers (type) {
    let key = ZosInstance.getOptionKey(type)
    return Apis.instance().db_api().exec('get_bitlender_paramers_key', [key]).then(res_paramers => {
      return Promise.resolve(res_paramers)
    })
  }

  // 获取资产列表，返回法币列表，数字列表
  static getCashBitAssetList () {
    let result = {}
    return Apis.instance().bitlender_api().exec('get_asset_by_property', [0x00000001]).then(res_loan => { // 可借贷货币
      result['cash_list'] = res_loan
      return Apis.instance().bitlender_api().exec('get_asset_by_property', [0x00000040]).then(res_lender => { // 可抵押货币
        result['bit_list'] = res_lender
        result['cash_list'].forEach(item => {
          item['isCashAsset'] = (item.uasset_property & 0x0000001) === 1
          item['can_deposit'] = item.whitelist_gateways.length > 0 && item.id !== '1.3.0' && !item['isCashAsset']
          item['can_withdraw'] = item.whitelist_gateways.length > 0 && item.id !== '1.3.0' && !item['isCashAsset']
          item['can_transfer'] = !item['isCashAsset']
        })
        result['bit_list'].forEach(item => {
          item['isCashAsset'] = (item.uasset_property & 0x0000001) === 1
          item['can_deposit'] = item.whitelist_gateways.length > 0 && item.id !== '1.3.0' && !item['isCashAsset']
          item['can_withdraw'] = item.whitelist_gateways.length > 0 && item.id !== '1.3.0' && !item['isCashAsset']
          item['can_transfer'] = !item['isCashAsset']
        })
        return Promise.resolve(result)
      })
    })
  }

  // 获取喂价人列表
  /*
     参数：
     asset_id: 可借贷货币ID
     */
  static lookup_feeders (asset_id) {
    let result = []
    return Apis.instance().bitlender_api().exec('get_feeders', [asset_id]).then(res_list => {
      return new Promise((resolve, reject) => {
        async.each(res_list, function (res, allcallback) {
          FetchChain('getAccount', res, 5000).then(account_obj => {
            if (!account_obj) {
              allcallback(null)
            } else {
              let params = {}
              params.userName = account_obj.get('name')
              params.userId = account_obj.get('id')
              result.push(params)
              allcallback(null)
            }
          })
        }, function (allerr) {
          if (allerr) {
            console.log('err', allerr)
            return reject('lookup_feeders Error')
          }
          return resolve(result)
        })
      })
    })
  }
  static getBlockHeightTime (height) {
    if (ChainStore.getObject('2.0.0') && ChainStore.getObject('2.1.0')) {
      let blockInterval = ChainStore.getObject('2.0.0').get('parameters').get('block_interval')// 几秒一个区块
      let headBlockNumber = ChainStore.getObject('2.1.0').get('head_block_number')// 最新的区块头
      let headBlockTime = new Date(ChainStore.getObject('2.1.0').get('time') + '+00:00').getTime()// 最新区块时间
      const secondsBelow = (headBlockNumber - height) * blockInterval
      return new Date(headBlockTime - secondsBelow * 1000)
    } else {
      return 'N/A'
    }
  }
  // 获取靓号手续费
  static getPrettyNameFee (account_name) {
    return QueryChainStore.getPrettyNameFee(account_name)
  }

  // 提交修改喂价人
  /*
    参数：
        issuer: 修改人
        author:董事会
        asset_to_update:币种ID
        new_feed_option: 新的属性
    */
  static bitlender_update_feed_producers_operation (issuer, option_id, author, new_feed_option, fee_asset_id = '1.3.0') {
    let application_api = new ApplicationApi()

    return application_api.bitlender_update_feed_producers_operation(
      issuer,
      option_id,
      author,
      new_feed_option,
      fee_asset_id, // 手续费
      true
    ).then((tr) => {
      let asset = ChainStore.getObject(fee_asset_id)
      let tran_ser = tr.serialize()
      let fee_obj = {}
      fee_obj['fee_amount'] = tran_ser.operations[0][1].fee.amount
      fee_obj['fee_asset_id'] = tran_ser.operations[0][1].fee.asset_id
      fee_obj['fee_precision'] = asset.get('precision')
      let result = {}
      result['tr'] = tr
      result['fee'] = fee_obj
      return Promise.resolve(result)
    }).catch(error => {
      console.log(error)
      return Promise.reject(error)
    })
  }

  // 获取喂价列表
  static get_asset_exchange_feed (borrow_asset_id, collateral_asset_id) {
    return Apis.instance().db_api().exec('get_asset_exchange_feed', [borrow_asset_id, collateral_asset_id, 1]).then(res_obj => {
      return Promise.resolve(res_obj)
    })
  }

  // 创建筹资参数
  /*
    参数：
        issuer;              //创建人
        issue_asset_id;      //发行币
        issue_asset_owner;   //发行币的创建者
        buy_asset_id;        //购买币
        fundraise_owner;     //筹集收款人
        options;             //筹款参数
        url;                 //描述
    */
  static finance_option_create (issuer, issue_asset_id, issue_asset_owner, buy_asset_id, fundraise_owner, options, url, fee_asset_id = '1.3.0') {
    let application_api = new ApplicationApi()

    return application_api.finance_option_create(
      issuer,
      issue_asset_id,
      issue_asset_owner,
      buy_asset_id,
      fundraise_owner,
      options,
      url,
      fee_asset_id, // 手续费
      true
    ).then((tr) => {
      let asset = ChainStore.getObject(fee_asset_id)
      let tran_ser = tr.serialize()
      let fee_obj = {}
      fee_obj['fee_amount'] = tran_ser.operations[0][1].fee.amount
      fee_obj['fee_asset_id'] = tran_ser.operations[0][1].fee.asset_id
      fee_obj['fee_precision'] = asset.get('precision')
      let result = {}
      result['tr'] = tr
      result['fee'] = fee_obj
      return Promise.resolve(result)
    }).catch(error => {
      console.log(error)
      return Promise.reject(error)
    })
  }

  // 修改筹资参数
  /*
    参数：
        issuer;            //修改人
        fundraise_id;      //筹款单号
        issue_asset_owner; //发行币的创建者
        period;            //期数
        options;           //筹款参数
        url;               //描述
        op_type = 0;       //0 增加或者修改 1 删除 2 停运 3 启运
    */
  static finance_option_update (issuer, fundraise_id, issue_asset_owner, period, options, url, op_type, fee_asset_id = '1.3.0') {
    let application_api = new ApplicationApi()

    return application_api.finance_option_update(
      issuer,
      fundraise_id,
      issue_asset_owner,
      period,
      options,
      url,
      op_type,
      fee_asset_id, // 手续费
      true
    ).then((tr) => {
      let asset = ChainStore.getObject(fee_asset_id)
      let tran_ser = tr.serialize()
      let fee_obj = {}
      fee_obj['fee_amount'] = tran_ser.operations[0][1].fee.amount
      fee_obj['fee_asset_id'] = tran_ser.operations[0][1].fee.asset_id
      fee_obj['fee_precision'] = asset.get('precision')
      let result = {}
      result['tr'] = tr
      result['fee'] = fee_obj
      return Promise.resolve(result)
    }).catch(error => {
      console.log(error)
      return Promise.reject(error)
    })
  }

  // 筹资
  /*
    参数：
        issuer;           //购买人
        fundraise_id;     //众筹单号
        buy_amount;           //筹资数量
        buy_asset_id;           //筹资资产ID
        bimmediately = 1; //立刻生效
    */
  static buy_finance_create (issuer, fundraise_id, buy_amount, buy_asset_id, bimmediately, fee_asset_id = '1.3.0') {
    let application_api = new ApplicationApi()

    let amount = {'amount': buy_amount, 'asset_id': buy_asset_id}
    return application_api.buy_finance_create(
      issuer,
      fundraise_id,
      issue_asset_owner,
      amount,
      bimmediately,
      fee_asset_id, // 手续费
      true
    ).then((tr) => {
      let asset = ChainStore.getObject(fee_asset_id)
      let tran_ser = tr.serialize()
      let fee_obj = {}
      fee_obj['fee_amount'] = tran_ser.operations[0][1].fee.amount
      fee_obj['fee_asset_id'] = tran_ser.operations[0][1].fee.asset_id
      fee_obj['fee_precision'] = asset.get('precision')
      let result = {}
      result['tr'] = tr
      result['fee'] = fee_obj
      return Promise.resolve(result)
    }).catch(error => {
      console.log(error)
      return Promise.reject(error)
    })
  }

  // 筹资有效
  /*
    参数：
        issuer;           //购买人
        buy_fundraise_id;     //众筹单号
        benable;           //是否生效  uint32
    */
  static buy_finance_enable (issuer, buy_fundraise_id, benable, fee_asset_id = '1.3.0') {
    let application_api = new ApplicationApi()
    return application_api.buy_finance_enable(
      issuer,
      buy_fundraise_id,
      benable,
      fee_asset_id, // 手续费
      true
    ).then((tr) => {
      let asset = ChainStore.getObject(fee_asset_id)
      let tran_ser = tr.serialize()
      let fee_obj = {}
      fee_obj['fee_amount'] = tran_ser.operations[0][1].fee.amount
      fee_obj['fee_asset_id'] = tran_ser.operations[0][1].fee.asset_id
      fee_obj['fee_precision'] = asset.get('precision')
      let result = {}
      result['tr'] = tr
      result['fee'] = fee_obj
      return Promise.resolve(result)
    }).catch(error => {
      console.log(error)
      return Promise.reject(error)
    })
  }

  // 删除众筹
  /*
    参数：
        issuer;           //购买人
        fundraise_id;     //众筹单号
        issue_asset_owner;           //发行币的创建者
    */
  static issue_fundraise_remove (issuer, fundraise_id, issue_asset_owner, fee_asset_id = '1.3.0') {
    let application_api = new ApplicationApi()
    return application_api.issue_fundraise_remove(
      issuer,
      fundraise_id,
      issue_asset_owner,
      fee_asset_id, // 手续费
      true
    ).then((tr) => {
      let asset = ChainStore.getObject(fee_asset_id)
      let tran_ser = tr.serialize()
      let fee_obj = {}
      fee_obj['fee_amount'] = tran_ser.operations[0][1].fee.amount
      fee_obj['fee_asset_id'] = tran_ser.operations[0][1].fee.asset_id
      fee_obj['fee_precision'] = asset.get('precision')
      let result = {}
      result['tr'] = tr
      result['fee'] = fee_obj
      return Promise.resolve(result)
    }).catch(error => {
      console.log(error)
      return Promise.reject(error)
    })
  }

  // 众筹喂价
  /*
    参数：
        issuer;           //发起人
        fundraise_id;     //众筹单号
        period;               //期数
        feed_publiser;        //价格修改人
        fundraise_price;  //筹款价格
    */
  static issue_fundraise_publish_feed (issuer, fundraise_id, period, feed_publiser, fundraise_price, fee_asset_id = '1.3.0') {
    let application_api = new ApplicationApi()
    return application_api.issue_fundraise_publish_feed(
      issuer,
      fundraise_id,
      period,
      feed_publiser,
      fundraise_price,
      fee_asset_id, // 手续费
      true
    ).then((tr) => {
      let asset = ChainStore.getObject(fee_asset_id)
      let tran_ser = tr.serialize()
      let fee_obj = {}
      fee_obj['fee_amount'] = tran_ser.operations[0][1].fee.amount
      fee_obj['fee_asset_id'] = tran_ser.operations[0][1].fee.asset_id
      fee_obj['fee_precision'] = asset.get('precision')
      let result = {}
      result['tr'] = tr
      result['fee'] = fee_obj
      return Promise.resolve(result)
    }).catch(error => {
      console.log(error)
      return Promise.reject(error)
    })
  }

  // 添加一个订阅事件，登录自动锁定时触发
  static addEventForAfterAutoLock (callback) {
    WalletUnlockStore.subscribe(callback)
  }

  // 删除一个登录自动锁定订阅事件
  static removeEventForAfterAutoLock (callback) {
    WalletUnlockStore.unsubscribe(callback)
  }

  // 修改运营商
  /*
    参数：
        carrier           //运营商ID
        carrier_account     //运营商的账号ID：1.2.x
        new_config          //配置(没有就传 undefined)
        new_memo        //备注(没有就传 undefined)
        new_url         //url(没有就传 undefined， 如果这个有值，则以提案发出)
        need_auth       //权限(没有就传 undefined)
        fee_asset_id    //手续费ID(默认不传)
    */
  static carrier_update (carrier, carrier_account, new_config = undefined, new_memo = undefined, new_url = undefined, need_auth = undefined, fee_asset_id = '1.3.0') {
    let application_api = new ApplicationApi()
    return application_api.carrier_update(
      carrier,
      carrier_account,
      new_config,
      new_memo,
      new_url,
      need_auth,
      fee_asset_id, // 手续费
      true
    ).then((tr) => {
      let asset = ChainStore.getObject(fee_asset_id)
      let tran_ser = tr.serialize()
      let fee_obj = {}
      fee_obj['fee_amount'] = tran_ser.operations[0][1].fee.amount
      fee_obj['fee_asset_id'] = tran_ser.operations[0][1].fee.asset_id
      fee_obj['fee_precision'] = asset.get('precision')
      let result = {}
      result['tr'] = tr
      result['fee'] = fee_obj
      return Promise.resolve(result)
    }).catch(error => {
      console.log(error)
      return Promise.reject(error)
    })
  }

  // 获取所有众筹订单ID列表（可以过滤和排序）
  /*
    参数：
        sell_asset_id: 需要过滤的借款币种ID，如果选全部，为空字符；有效数字为：1
        buy_asset_id: 需要过滤的抵押币种ID，如果选全部，为空字符；有效数字为：2
        // period: 借款期限（数字），如果选全部，为 0；有效数字为：4
        ufiletermask: 以上三个过滤条件的有效的或值。比如 loan_asset_id 和 period 有效，值为: 0|1|4
        usort: 排序方式，发标时间，借款金额，投标进度分别对应：1，2，3
        start:
        limit:
        返回：查询到的所有订单ID数组。需要自己分页
        *查询后需要自己分页
    */
  static list_issue_fundraise (sell_asset_id, buy_asset_id, ufiletermask, usort, start, limit) {
    return Apis.instance().finance_api().exec('list_issue_fundraise', [sell_asset_id, buy_asset_id, ufiletermask, usort, start, limit]).then((res) => {
      return res
    })
  }

  // 获取众筹订单的详情
  static get_list_issue_fundraise_objs (
    arry_ids
  ) {
    let result = []
    return Apis.instance().db_api().exec('get_objects', [arry_ids]).then(res_list => {
      res_list.forEach(res => {
        res.options.forEach(res_options => {
          let options = res_options[1]
          if (options.enable) { // 此期有效
            let s_dt = options.option.start_time + 'Z'
            let s_time = (new Date(s_dt)).getTime()
            let e_dt = options.option.end_time + 'Z'
            let e_time = (new Date(e_dt)).getTime()
            let now_time = (new Date()).getTime()
            if (s_time <= now_time && e_time > now_time) { // 当前在时间范围内
              let obj = {}
              obj['id'] = res.id // ID
              obj['buy_id'] = res.buy_id // 购买币
              obj['issue_id'] = res.issue_id // 发行币
              obj['fundraise_owner'] = res.fundraise_owner // 筹集收款人
              obj['issuer'] = res.issuer // 发起人
              obj['need_auth'] = res.need_auth // 权限
              obj['url'] = res.url // url
              obj['trust_auth'] = res.trust_auth // 信任权限
              obj['enable'] = options.enable // 是否有效
              obj['supply'] = options.supply // 目前筹资数量
              options.option.start_time = options.option.start_time + 'Z'
              options.option.end_time = options.option.end_time + 'Z'
              obj['option'] = options.option // 当前期的具体信息
              result.push(obj)
            }
          }
        })
      })
      return Promise.resolve(result)
    })
  }

  // // 根据订单状态，获取我的借款列表
  // // arry_account_id:用户ID数组，如果有值就过滤，如果为空数组，就返回所有
  // // arry_status:状态数组，如果有值就过滤，如果为空数组，就返回所有
  // // 判断抵押物是否充足：抵押物数量 / 当前喂价 * maintenance_collateral_cash_ratio > 借款法币的数量
  // static get_account_notify_orders (
  //   account_id,
  //   status,
  //   start,
  //   limit,
  //   inc_collateral_ratio = 0.5
  // ) {
  //   let result = []
  //   return Apis.instance().db_api().exec('get_account_notify_orders', [account_id, status, start, limit]).then(res_list => {
  //     return new Promise((resolve, reject) => {
  //       async.each(res_list, function (res, allcallback) {
  //         Apis.instance().db_api().exec('get_objects', [[res.amount_to_collateralize.asset_id, res.amount_to_loan.asset_id]]).then(asset_obj => {
  //           res['collateralize_asset'] = asset_obj[0] // 抵押资产的具体信息
  //           res['loan_asset'] = asset_obj[1] // 借款资产的具体信息
  //           // 还款总金额
  //           let repay_amount_sum = parseInt(res.amount_to_loan.amount)
  //           res.repay_interest.forEach(interest => {
  //             repay_amount_sum = repay_amount_sum + parseInt(interest[1].amount_repay_interest.amount) + parseInt(interest[1].fines_repay_interest.amount)
  //           })
  //           repay_amount_sum = repay_amount_sum / Math.pow(10, res['loan_asset'].precision)
  //           res['repay_amount_sum'] = repay_amount_sum // 还款总金额 （已处理精度）

  //           // 处理时区
  //           // tzo: TimeZoneOffset; 格林威治时间和本地时间之间的时差
  //           // 挂单截止时间
  //           res['expiration_time'] = QueryChainStore.getTimezoneDate(res['expiration_time'])

  //           // 满标时间
  //           res['invest_finish_time'] = QueryChainStore.getTimezoneDate(res['invest_finish_time'])

  //           // 借款时间
  //           res['loan_time'] = QueryChainStore.getTimezoneDate(res['loan_time'])

  //           // 实际还本时间
  //           res['repay_principal_time'] = QueryChainStore.getTimezoneDate(res['repay_principal_time'])

  //           // 预计还本时间
  //           res['expect_principal_time'] = QueryChainStore.getTimezoneDate(res['expect_principal_time'])

  //           // 不良资产逾期时间
  //           res['overdue_recycle_time'] = QueryChainStore.getTimezoneDate(res['overdue_recycle_time'])

  //           // 处理还息的时间
  //           res.repay_interest.forEach(interest => {
  //             interest[1].expect_time = QueryChainStore.getTimezoneDate(interest[1].expect_time)
  //           })

  //           // 处理还息数据
  //           let interest_list = []
  //           res.repay_interest.forEach(interest => {
  //             let int_obj = {}
  //             int_obj['id'] = interest[0] // 序号
  //             int_obj['asset_id'] = interest[1].amount_repay_interest.asset_id // 资产ID
  //             int_obj['amount'] = parseInt(interest[1].expect_repay_interest.amount) / Math.pow(10, res['loan_asset'].precision) // 应还金额(已处理精度)
  //             int_obj['finish_amount'] = 0
  //             int_obj['finish_time'] = '' // 实际还款时间
  //             if (interest[1].interest_state == 2 || interest[1].interest_state == 4) {
  //               int_obj['finish_amount'] = (parseInt(interest[1].amount_repay_interest.amount) + parseInt(interest[1].fines_repay_interest.amount)) / Math.pow(10, res['loan_asset'].precision) // 实还金额(已处理精度)
  //               int_obj['finish_time'] = QueryChainStore.getTimezoneDate(interest[1].finish_time) // 实际还款时间
  //             }
  //             int_obj['amount_repay_interest'] = parseInt(interest[1].amount_repay_interest.amount) / Math.pow(10, res['loan_asset'].precision) // 实际还的利息
  //             int_obj['fines_repay_interest'] = parseInt(interest[1].fines_repay_interest.amount) / Math.pow(10, res['loan_asset'].precision) // 罚息资产
  //             int_obj['expect_time'] = interest[1].expect_time // 预计还款时间
  //             int_obj['interest_rate'] = interest[1].interest_rate.interest_rate // 利率
  //             int_obj['interest_state'] = interest[1].interest_state // 状态
  //             interest_list.push(int_obj)
  //           })
  //           // 将最后一期的数量置为：利息加上借款的本金
  //           // if(interest_list.length > 0){
  //           //     interest_list[interest_list.length - 1].amount = interest_list[interest_list.length - 1].amount + (res.amount_to_loan.amount / Math.pow(10, res["loan_asset"].precision))
  //           //     if(interest_list[interest_list.length - 1].interest_state == 2){
  //           //         interest_list[interest_list.length - 1].finish_amount = interest_list[interest_list.length - 1].finish_amount + (res.amount_to_loan.amount / Math.pow(10, res["loan_asset"].precision))
  //           //     }
  //           // }
  //           res['interest_list'] = interest_list // 还息数据

  //           let col_bitasset_data_id = asset_obj[0].bitasset_data_id
  //           if (!col_bitasset_data_id) {
  //             col_bitasset_data_id = '1.3.0'
  //           }
  //           Apis.instance().db_api().exec('get_asset_exchange_feed', [res.amount_to_loan.asset_id, res.amount_to_collateralize.asset_id, 1]).then(asset_obj2 => {
  //             let col_maintenance_collateral_ratio = 0 // 当前喂价下最小抵押倍数
  //             res['feed'] = null
  //             if (asset_obj2) {
  //               if (asset_obj2.current_feed) {
  //                 col_maintenance_collateral_ratio = asset_obj2.current_feed.maintenance_collateral_ratio / 1000
  //                 if (asset_obj2.current_feed.settlement_price) {
  //                   res['feed'] = asset_obj2.current_feed.settlement_price // 抵押资产的喂价
  //                 }
  //               }
  //             }
  //             res['maintenance_collateral_cash_ratio'] = col_maintenance_collateral_ratio

  //             // res["collateralize_feed"] = ""
  //             // let col_maintenance_collateral_cash_ratio = 0  //当前喂价下最小抵押倍数
  //             // if(res.amount_to_collateralize.asset_id === '1.3.0'){
  //             //     let col_info = QueryChainStore.get_core_asset_info()
  //             //     res["collateralize_feed"] = col_info.feed
  //             //     col_maintenance_collateral_cash_ratio = col_info.maintenance_collateral_cash_ratio
  //             // }else{
  //             //     if(asset_obj2[0]){
  //             //         if(asset_obj2[0].current_feed){
  //             //             col_maintenance_collateral_cash_ratio = asset_obj2[0].current_feed.maintenance_collateral_cash_ratio / 1000
  //             //             if(asset_obj2[0].current_feed.settlement_price){
  //             //                 res["collateralize_feed"] = asset_obj2[0].current_feed.settlement_price     //抵押资产的喂价
  //             //             }
  //             //         }
  //             //     }
  //             // }
  //             // res["maintenance_collateral_cash_ratio"] = col_maintenance_collateral_cash_ratio

  //             // res["borrow_feed"] = ""
  //             // if(asset_obj2[1]){
  //             //     if(asset_obj2[1].current_feed){
  //             //         if(asset_obj2[1].current_feed.settlement_price){
  //             //             res["borrow_feed"] = asset_obj2[1].current_feed.settlement_price        //借款资产的喂价
  //             //         }
  //             //     }
  //             // }

  //             // quote是zos，base是此货币
  //             let feed_price = QueryChainStore.calcFeedPrice(res['feed'], asset_obj[0].precision, asset_obj[1].precision)
  //             res['feed_price'] = feed_price // 当前喂价
  //             if (feed_price === 0) { // 如果喂价为0，增加
  //               res['collateralize_isfull'] = true // 抵押物数量是否充足
  //               QueryChainStore.get_invest_process(res.id).then(res_pro => {
  //                 res['invest_process'] = res_pro.process // 借款订单的进度
  //                 res['invest_process_amount'] = parseInt(res_pro.amount) // 借款订单的目前投资额 （没有处理精度）
  //                 result.push(res)
  //                 allcallback(null)
  //               })
  //             } else {
  //               // 计算抵押物是否充足
  //               QueryChainStore.get_loan_collateralize(res.amount_to_loan.asset_id, res.amount_to_loan.amount, res.amount_to_collateralize.asset_id).then(res_coll_asset => {
  //                 let res_coll_amount = parseInt(res_coll_asset.amount)
  //                 let is_full = true
  //                 if (res_coll_amount * (col_maintenance_collateral_ratio + inc_collateral_ratio) > parseInt(res.amount_to_collateralize.amount)) {
  //                   is_full = false
  //                 }
  //                 res['collateralize_isfull'] = is_full // 抵押物数量是否充足
  //                 QueryChainStore.get_invest_process(res.id).then(res_pro => {
  //                   res['invest_process'] = res_pro.process // 借款订单的进度
  //                   res['invest_process_amount'] = parseInt(res_pro.amount) // 借款订单的目前投资额 （没有处理精度）
  //                   result.push(res)
  //                   allcallback(null)
  //                 })
  //               })
  //             }
  //           })
  //         }).catch(error => {
  //           console.log(error)
  //           allcallback(null)
  //         })
  //       }, function (allerr) {
  //         if (allerr) {
  //           console.log('err', allerr)
  //         }
  //         return resolve(result)
  //       })
  //     })
  //   }).catch(error => {
  //     console.log(error)
  //     return Promise.reject(error)
  //   })
  // }

  static account_config_operation (issuer, config, op_type, fee_asset_id = '1.3.0') {
    let application_api = new ApplicationApi()
    return application_api.account_config_operation(
      issuer,
      config,
      op_type,
      fee_asset_id, // 手续费资产ID
      true
    ).then((tr) => {
      let asset = ChainStore.getObject(fee_asset_id)
      let tran_ser = tr.serialize()
      let fee_obj = {}
      fee_obj['fee_amount'] = tran_ser.operations[0][1].fee.amount
      fee_obj['fee_asset_id'] = tran_ser.operations[0][1].fee.asset_id
      fee_obj['fee_precision'] = asset.get('precision')
      let result = {}
      result['tr'] = tr
      result['fee'] = fee_obj
      return Promise.resolve(result)
    }).catch(error => {
      console.log(error)
      return Promise.reject(error)
    })
  }

  static account_authenticate (issuer, op_type, auth_data, fee_asset_id = '1.3.0') {
    let application_api = new ApplicationApi()
    return application_api.account_authenticate(
      issuer,
      op_type,
      auth_data,
      fee_asset_id, // 手续费资产ID
      true
    ).then((tr) => {
      let asset = ChainStore.getObject(fee_asset_id)
      let tran_ser = tr.serialize()
      let fee_obj = {}
      fee_obj['fee_amount'] = tran_ser.operations[0][1].fee.amount
      fee_obj['fee_asset_id'] = tran_ser.operations[0][1].fee.asset_id
      fee_obj['fee_precision'] = asset.get('precision')
      let result = {}
      result['tr'] = tr
      result['fee'] = fee_obj
      return Promise.resolve(result)
    }).catch(error => {
      console.log(error)
      return Promise.reject(error)
    })
  }
  // 以下函数为 Eric 维护。

  // 获取个人资产
  static get_account_allbalances (user_id, type = 0) {
    let result = []
    let ret = {}
    ret['coupon'] = 0
    ret['locktoken'] = 0
    ret['lockasset'] = 0
    ret['lockvesting'] = 0
    ret['zos'] = 0
    return Apis.instance().db_api().exec('get_account_balances_summary', [user_id, type | 0x00040 | 0x00080]).then(res_bal => {
      res_bal.forEach(bala => {
        let tmp_obj = bala
        if (bala.asset_id === '1.3.0') {
          ret['zos'] = parseInt(bala.amount) / Math.pow(10, bala.precision)
          ret['locktoken'] = (parseInt(bala.fixed_lock) + parseInt(bala.dy_lock) + parseInt(bala.node_lock)) / Math.pow(10, bala.precision)
          ret['coupon'] = parseInt(bala.coupon) / Math.pow(10, bala.precision)
          ret['lockasset'] = parseInt(bala.identify_lock) / Math.pow(10, bala.precision)
          ret['lockvesting'] = parseInt(bala.vesting_lock) / Math.pow(10, bala.precision)
        }
        tmp_obj['amount'] = parseInt(bala.amount) / Math.pow(10, bala.precision)
        tmp_obj['asset_id'] = bala.asset_id
        tmp_obj['lock_amount'] = (parseInt(bala.invest_lock) + parseInt(bala.lending_lock) + parseInt(bala.vesting_lock) + parseInt(bala.identify_lock) + parseInt(bala.fixed_lock) + parseInt(bala.dy_lock) + parseInt(bala.node_lock)) / Math.pow(10, bala.precision)
        tmp_obj['invest_lock'] = parseInt(bala.invest_lock) / Math.pow(10, bala.precision)
        tmp_obj['lending_lock'] = parseInt(bala.lending_lock) / Math.pow(10, bala.precision)
        tmp_obj['vesting_lock'] = parseInt(bala.vesting_lock) / Math.pow(10, bala.precision)
        tmp_obj['identify_lock'] = parseInt(bala.identify_lock) / Math.pow(10, bala.precision)
        tmp_obj['fixed_lock'] = parseInt(bala.fixed_lock) / Math.pow(10, bala.precision)
        tmp_obj['dy_lock'] = parseInt(bala.dy_lock) / Math.pow(10, bala.precision)
        tmp_obj['node_lock'] = parseInt(bala.node_lock) / Math.pow(10, bala.precision)
        tmp_obj['all_amount'] = parseInt(bala.all_amount) / Math.pow(10, bala.precision)        
        tmp_obj['symbol'] = bala.symbol
        tmp_obj['precision'] = bala.precision
        tmp_obj['uasset_property'] = bala.uasset_property
        result.push(tmp_obj)
      })
      ret['balances'] = result
      return Promise.resolve(ret)
    }).catch(error => {
      console.log(error)
      return Promise.reject(error)
    })
  }
  // 获取用户锁定资产
  // 返回：
  static get_account_lock_balances (user_id) {
    let result = []
    return Apis.instance().db_api().exec('get_account_lock_balances', [user_id, 65535]).then(res_bal => {
      res_bal.forEach(bala => {
        let result_bal = {}
        result_bal['amount'] = parseInt(bala.amount)
        result_bal['symbol'] = bala.symbol
        result_bal['precision'] = bala.precision
        result_bal['asset_id'] = bala.asset_id
        result.push(result_bal)
      })
      return Promise.resolve(result)
    }).catch(error => {
      console.log(error)
      return Promise.reject(error)
    })
  }

  // 获取抵押货币的信息,返回喂价信息和余额
  // 参数：当期用户ID，抵押货币的ID、bitasset_data_id, 抵押物的精度 和法币的id，法币的精度
  static getCollateralFeed (loanAssetID, base, quote) {
    let result = {}
    let _loanID = base.id
    let _collID = quote.id
    if (loanAssetID === quote.id) {
      _loanID = quote.id
      _collID = base.id
    }
    return Apis.instance().db_api().exec('get_asset_exchange_feed', [_loanID, _collID, 1]).then(res_obj => {
      result['balance'] = 0
      result['maintenance_collateral_ratio'] = 0
      result['maximum_short_squeeze_ratio'] = 0
      result['feed_price'] = null
      if (res_obj) {
        if (res_obj.current_feed) {
          if (res_obj.current_feed.settlement_price) {
            result['feed'] = res_obj.current_feed.settlement_price
            result['feed_price'] = QueryChainStore.calcFeedPrice(res_obj.current_feed.settlement_price, base.id, base.precision, quote.id, quote.precision)
            result['feed_price_view'] = QueryChainStore.calcFeedPriceView(res_obj.current_feed.settlement_price, base.id, base.precision, quote.id, quote.precision)
          }
          result['maintenance_collateral_ratio'] = res_obj.current_feed.maintenance_collateral_ratio / 1000
          result['maximum_short_squeeze_ratio'] = res_obj.current_feed.maximum_short_squeeze_ratio / 1000
        }
      }
      return Promise.resolve(result)
    }).catch(err => {
      return Promise.reject(err, 'get Collateral Feed Error')
    })
  }
  // 获取不良资产ID列表
  /*
    参数：
        carrier: 运营商名字
        order_type: 订单状态
        返回：查询到的所有订单ID数组。需要自己分页
        *查询后需要自己分页
    */
  static get_carrier_orders (carrier, order_type) {
    return Apis.instance().bitlender_api().exec('list_carrier_orders', [carrier, order_type]).then(list => {
      return list
    })
  }
  static get_gateway (admin_id, asset_id) {
    return Apis.instance().admin_api().exec('get_gateway', [admin_id, asset_id]).then(res => {
      if (res) {
        res.forEach(key => {
          if (key.gateway_url) key.gateway_url = ZosInstance.ReplaceAddress(key.gateway_url)
          // .toString().replace('https://gateway.zos.io', 'https://gateway.zostu.com')
          if (key.author_url) key.author_url = ZosInstance.ReplaceAddress(key.author_url)
          // .toString().replace('https://uc.zos.io', 'https://uc.zostu.com')
          if (key.symbol === 'ZOS') {
            key.real_symbol = 'EOS'
            key.real_asset_sub = 'ZOS'
          }
        })
      }
      return res
    }).catch(function (error) {
      console.log(error)
    })
  }
  static get_carrier (admin_id, asset_id, type) {
    let key = ZosInstance.getOptionKey(type)
    return Apis.instance().admin_api().exec('get_carrier', [admin_id, asset_id, key]).then((account) => {
      if (account) {
        if (account.lendauthor_url) account.lendauthor_url = ZosInstance.ReplaceAddress(account.lendauthor_url)
        // .toString().replace('https://uc.zos.io', 'https://uc.zostu.com')
        if (account.investauthor_url) account.investauthor_url = ZosInstance.ReplaceAddress(account.investauthor_url)
        // .toString().replace('https://uc.zos.io', 'https://uc.zostu.com')
      }
      return account
    }).catch(function (error) {
      console.log(error)
    })
  }
  static get_authors (ids) {
    return Apis.instance().db_api().exec('get_authors', [ids]).then((account) => {
      if (account && account.length > 0) {
        account.forEach(key => {
          if (key && key.url) key.url = ZosInstance.ReplaceAddress(key.url)
          // .toString().replace('https://uc.zos.io', 'https://uc.zostu.com')
        })
      }
      return account
    }).catch(function (error) {
      console.log(error)
    })
  }
  static get_locktoken_object_data (x) {
    x.create_time = QueryChainStore.getTimezoneDate(x['create_time']).toString().replace('T', ' ')
    x.remove_time = QueryChainStore.getTimezoneDate(x['remove_time']).toString().replace('T', ' ')
    x.except_time = QueryChainStore.getTimezoneDate(x['except_time']).toString().replace('T', ' ')
    x.lastCoinDayTime = QueryChainStore.getTimezoneDate(x['lastCoinDayTime']).toString().replace('T', ' ')
    x.interest_list.forEach(item => {
      item[0] = QueryChainStore.getTimezoneDate(item[0]).toString().replace('T', ' ')
    })
    x['symbol'] = x.locked.symbol
    x['precision'] = x.locked.precision
    x['interestsymbol'] = x.interest.symbol
    x['interestprecision'] = x.interest.precision
    if (x.interest.asset_id === x.locked.asset_id) {     
      x['price'] = 1.0
    } else {  
      x['price'] = QueryChainStore.calcFeedPrice(x.pay_price, x.pay_price.quote.asset_id, x.interestprecision, x.pay_price.base.asset_id, x.precision)
    }
    if (x.type === 0) x.period = 1
    x['except_interst'] = (Number(x.locked.amount) * Number(x.period) * Number(x.rate) * Number(x.price) / (12.0 * 10000)).toFixed(0)
    return x
  }
  static get_locktoken_history (acc, ass, type, ustart, ulimit) {
    let result = []
    if (ass === '') ass = '1.3.100000000'
    return Apis.instance().history_api().exec('get_locktoken_history', [acc, ass, type, ustart, ulimit]).then((account) => {
      return new Promise((resolve, reject) => {
        async.each(account, function (res, allcallback) {
          let int_obj = ZosInstance.get_locktoken_object_data(res)
          result.push(int_obj)
        }, function (allerr) {
          if (allerr) {
            console.log('err', allerr)
          }
          return resolve(result)
        })
        return resolve(result)
      })
    }).catch(function (error) {
      console.log(error)
      return Promise.reject(result)
    })
  }
  static get_locktoken_history_count (acc, ass, type) {
    if (ass === '') ass = '1.3.100000000'
    return Apis.instance().history_api().exec('get_locktoken_history_count', [acc, ass, type]).then((account) => {
      return account
    }).catch(function (error) {
      console.log(error)
      return 0
    })
  }
  static get_locktoken_ids (acc, ass, type) {
    let result = []
    if (ass === '') ass = '1.3.100000000'
    return Apis.instance().db_api().exec('get_locktokens', [acc, ass, type]).then((account) => {
      return account
    }).catch(function (error) {
      console.log(error)
      return result
    })
  }
  static get_locktoken_history_objects (id) {
    return Apis.instance().history_api().exec('get_object_history', [id]).then(res => {
      return ZosInstance.get_locktoken_object_data(res)
    })
  }
  static get_locktoken_objects (ids) {
    let result = []
    return Apis.instance().db_api().exec('get_objects', [ids]).then((account) => {
      return new Promise((resolve, reject) => {
        async.each(account, function (res, allcallback) {
          let int_obj = ZosInstance.get_locktoken_object_data(res)
          result.push(int_obj)
        }, function (allerr) {
          if (allerr) {
            console.log('err', allerr)
          }
          return resolve(result)
        })
        return resolve(result)
      })
    }).catch(function (error) {
      console.log(error)
      return Promise.reject(result)
    })
  }

  static getOptionSupport (mode) {
    if (mode === undefined || mode === null) mode = 3
    let Type = []
    if (mode & 0x01) {
      let add = {label: 'm.invest.periodmode1', id: '33', des: 'm.invest.repayment1', disable: false}
      Type.push(add)
    }
    if (mode & 0x02) {
      let add = {label: 'm.invest.periodmode3', id: '67', des: 'm.invest.repayment2', disable: false}
      Type.push(add)
    }
    return Type
  }
  static getOptionKey (type) {
    var value = Number(type)
    var perioduint = parseInt(value % 32)
    var valuemode = parseInt((value - perioduint) / 32)
    var repaymenttype = parseInt(valuemode % 64)
    valuemode = parseInt((valuemode - repaymenttype) / 64)
    var loanmode = parseInt(valuemode % 16)
    var optype = parseInt((valuemode - loanmode) / 16)

    if (Number(type) === 1) {
      perioduint = 1
      repaymenttype = 1
    }

    let key = {repayment_period_uint: 1, repayment_type: 1, loan_mode: 0, op_type: 0}
    key.repayment_period_uint = perioduint
    key.repayment_type = repaymenttype
    key.loan_mode = loanmode
    key.op_type = optype
    // console.log(key, type)
    return key
  }
  static getOptionKeyToValue (type) {
    return Number(type.repayment_type) * 32 + Number(type.repayment_period_uint)
  }

  static getOptionIndex (type) {
    var value = ZosInstance.getOptionKey(type)
    if (value.repayment_period_uint === 1 && value.repayment_type === 1) return ''
    else return '-' + value.repayment_period_uint + '-' + value.repayment_type
  }
  // 获取法币对应的借款产品信息
  // *参数：法币的id
  static getBitlenderOption (asset_id, type = '33') {
    let result = {}
    let key = ZosInstance.getOptionKey(type)
    return Apis.instance().db_api().exec('get_bitlender_option_key', [asset_id, key]).then(assets => {
      if (!assets) {
        result['isExiste'] = false // 是否存在借贷参数
        // 如果没有，则找1.3.0的参数作为默认参数
        return Apis.instance().db_api().exec('get_bitlender_option_key', ['1.3.0', null]).then(cny_assets => {
          if (!cny_assets) {
            return Promise.resolve(null)
          }
          result['interest_rate'] = cny_assets.interest_rate // 利率
          result['options'] = cny_assets.options // 参数
          result['asset_id'] = asset_id
          result['author'] = cny_assets.author // 小董事会（此账号是个多重签名账号）
          result['id'] = '' // 借贷产品ID
          result['issuer'] = cny_assets.issuer // 创建人
          result['gateways'] = cny_assets.gateways // 网关（数组）
          result['sproduct'] = cny_assets.sproduct // 产品名称
          result['feed_option'] = cny_assets.feed_option // feed_option
          result['fee_mode'] = cny_assets.fee_mode // fee_mode
          return Apis.instance().db_api().exec('get_objects', [[asset_id]]).then(assets => {
            if (assets && assets.length > 0) {
              let p = Math.pow(10, assets[0].precision)
              result.options.min_invest_amount = result.options.min_invest_amount * p / 100
              result.options.min_loan_amount = result.options.min_loan_amount * p / 100
              result.options.min_invest_increase_range = result.options.min_invest_increase_range * p / 100
              result.options.min_loan_increase_range = result.options.min_loan_increase_range * p / 100
              result.options.max_risk_margin = result.options.max_risk_margin * p / 100
              result.options.max_carrier_service_charge = result.options.max_carrier_service_charge * p / 100
              result.options.max_platform_service_charge_rate = result.options.max_platform_service_charge_rate * p / 100
            }
            return Promise.resolve(result)
          }).catch(function (error) {
            console.log(error)
            return Promise.reject(error)
          })
        }).catch(function (error) {
          console.log(error)
          return Promise.reject(error)
        })
      }
      result['interest_rate'] = assets.interest_rate // 利率
      result['options'] = assets.options // 参数
      result['asset_id'] = assets.asset_id
      result['author'] = assets.author // 小董事会（此账号是个多重签名账号）
      result['id'] = assets.id // 借贷产品ID
      result['issuer'] = assets.issuer // 创建人
      result['gateways'] = assets.gateways // 网关（数组）
      result['isExiste'] = true // 是否存在借贷参数
      result['feed_option'] = assets.feed_option // feed_option
      result['fee_mode'] = assets.fee_mode // fee_mode
      return Promise.resolve(result)
    }).catch(function (error) {
      console.log(error)
      return Promise.reject(error)
    })
  }
  static getRequiredFees (tr, assetid = '1.3.0') {
    var options = []
    for (var i = 0, op; i < tr.operations.length; i++) {
      op = tr.operations[i]
      options.push(ops.operation.toObject(op))
    }
    return Apis.instance().db_api().exec('get_required_fees', [options, assetid]).then(res => {
      let res_asset = ChainStore.getObject(assetid)
      let res_precision = res_asset.get('precision')
      let res_symbol = res_asset.get('symbol')
      res[0]['precision'] = res_precision
      res[0]['symbol'] = res_symbol
      return Promise.resolve(res)
    })
  }

  // 获取所有借款订单ID列表（可以过滤和排序）
  /*
    参数：
        loan_asset_id: 需要过滤的借款币种ID，如果选全部，为空字符；有效数字为：1
        issuer: 需要过滤的抵押币种ID，如果选全部，为空字符；有效数字为：2
        period: 借款期限（数字），如果选全部，为 0；有效数字为：4
        ufiletermask: 以上三个过滤条件的有效的或值。比如 loan_asset_id 和 period 有效，值为: 0|1|4
        usort: 排序方式，发标时间，借款金额，投标进度分别对应：1，2，3
        返回：查询到的所有订单ID数组。需要自己分页
        *查询后需要自己分页
    */
  static list_bitlender_order (acc, loan_type, loan_asset_id, lender_asset_id, period, ufiletermask, usort) {
    if (!acc || acc === '') acc = '1.2.0'
    return Apis.instance().bitlender_api().exec('list_bitlender_order', [acc, loan_type, loan_asset_id, lender_asset_id, period, ufiletermask, usort]).then((res) => {
      return res
    })
  }
  static get_account_balance (
    user_id,
    asset_id
  ) {
    return FetchChain('getAccount', user_id, 5000).then((account) => {
      return ChainStore.getAccountBalance(account, asset_id)
    }).catch(error => {
      console.log(error)
      return Promise.reject(error)
    })
  }

  // 获取排序后的借款列表
  static get_loan_orders_by_order (arry_orderids) {
    let result = []
    return Apis.instance().bitlender_api().exec('get_loan_orders_by_id', [arry_orderids]).then(res_list => {
      return new Promise((resolve, reject) => {
        async.each(res_list, function (res, allcallback) {
          if (!res) {
            allcallback(null)
            return
          }
          let int_obj = ZosInstance.get_loan_object_info(res)
          result.push(int_obj)
        }, function (allerr) {
          if (allerr) {
            console.log('err', allerr)
          }
          return resolve(result)
        })
        return resolve(result)
      })
    })
  }
  // 获取投资列表总数量
  // arry_account_id:用户ID数组，如果有值就过滤，如果为空数组，就返回所有
  // arry_status:状态数组，如果有值就过滤，如果为空数组，就返回所有
  static get_invest_counts (
    arry_account_id,
    arry_asset_id,
    arry_status
  ) {
    return Apis.instance().db_api().exec('get_invest_counts', [arry_account_id, arry_asset_id, arry_status]).then(res => {
      return res
    })
  }
  // 此函数为功能函数，不能进行任何时间和精度装换
  static get_invest_repay_interest (res, order_info) {
    order_info.repay_interest.forEach(function (interest) {
      var object = {
        pay_id: interest[1].pay_id,
        interest_state: interest[1].interest_state,
        expect_time: interest[1].expect_time,
        finish_time: interest[1].finish_time,
        expect_repay_interest: interest[1].expect_repay_interest,
        amount_repay_interest: interest[1].amount_repay_interest,
        fines_repay_interest: interest[1].fines_repay_interest,
        interest_rate: interest[1].interest_rate,
        ustate: interest[1].ustate
      }
      object.expect_repay_interest.amount = interest[1].expect_repay_interest.amount * res.amount_to_invest.amount / res.order_info.amount_to_loan.amount
      object.amount_repay_interest.amount = 0
      object.fines_repay_interest.amount = 0
      object.finish_amount = 0
      if (res.repay_interest[interest[0]] !== undefined) {
        object.amount_repay_interest = res.repay_interest[interest[0]][1].amount_repay_interest
        object.fines_repay_interest = res.repay_interest[interest[0]][1].fines_repay_interest
        object.finish_time = res.repay_interest[interest[0]][1].finish_time
        object.finish_amount = object.amount_repay_interest.amount + object.fines_repay_interest.amount
      }
      res.repay_interest[interest[0]] = [interest[0], object]
    })
  }

  static get_invest_object_data (res) {
    ZosInstance.get_invest_repay_interest(res, res.order_info)
    // 应标时间
    res['invest_time'] = QueryChainStore.getTimezoneDate(res['invest_time'])

    // 实际还本时间
    res['repay_principal_time'] = QueryChainStore.getTimezoneDate(res['repay_principal_time'])
    res['order_state'] = res.order_info.order_state
    res['loan_asset'] = res['asset_to_loan'] // 投资资产的具体信息
    res['invest_asset'] = res['asset_to_loan'] // 投资资产的具体信息
    res['collateralize_asset'] = res['asset_to_collateralize'] // 抵押资产的具体信息
    res['invest_amount'] = res.amount_to_invest.amount // 投资资产的数量（处理了精度）
    // 收益
    var interest_sum = 0
    var expect_sum = 0
    res.repay_interest.forEach(function (interest) {
      if (interest[1].interest_state === 2 || interest[1].interest_state === 4 || interest[1].interest_state === 6) {
        interest_sum = interest_sum + interest[1].finish_amount
      }
      expect_sum = expect_sum + parseInt(interest[1].expect_repay_interest.amount)
      let int_obj = interest[1]
      int_obj['id'] = interest[0] // 序号
      int_obj['asset_id'] = interest[1].amount_repay_interest.asset_id // 资产ID
      int_obj['amount'] = parseInt(interest[1].expect_repay_interest.amount) / Math.pow(10, res['loan_asset'].precision) // 应还金额(已处理精度)
      if (interest[1].interest_state === 2 || interest[1].interest_state === 4 || interest[1].interest_state === 6) {
        int_obj['finish_amount'] = (parseInt(interest[1].amount_repay_interest.amount) + parseInt(interest[1].fines_repay_interest.amount)) / Math.pow(10, res['loan_asset'].precision) // 实还金额(已处理精度)
        int_obj['finish_time'] = QueryChainStore.getTimezoneDate(interest[1].finish_time) // 实际还款时间
      } else {
        int_obj['finish_amount'] = 0
        int_obj['finish_time'] = '' // 实际还款时间
      }
      int_obj['amount_repay_interest'] = parseInt(interest[1].amount_repay_interest.amount) / Math.pow(10, res['loan_asset'].precision) // 实际还的利息
      int_obj['fines_repay_interest'] = parseInt(interest[1].fines_repay_interest.amount) / Math.pow(10, res['loan_asset'].precision) // 罚息资产
      int_obj['expect_time'] = QueryChainStore.getTimezoneDate(interest[1].expect_time) // 预计还款时间
      int_obj['interest_rate'] = interest[1].interest_rate.interest_rate // 利率
      int_obj['interest_state'] = interest[1].interest_state // 状态
      interest[1] = int_obj
    })
    if (res.order_info.order_state === 13) interest_sum = 0
    res['repay_interest_sum'] = interest_sum + res.order_info.repay_principal_fee.amount * res.amount_to_invest.amount / res.order_info.amount_to_loan.amount // 实际收益（处理了精度）
    res['expect_sum'] = expect_sum
    res['repay_interest_rate'] = res['repay_interest_sum'] / res['invest_amount'] // 实际收益率
    let order_info = ZosInstance.get_loan_object_data(res['order_info'])
    res['order_info'] = order_info
    res['tableListData'] = order_info.tableListData
    res['tableListData']['interestData'] = res.repay_interest
    let finish = res.order_info.order_state === 7 || res.order_info.order_state === 8 || res.order_info.order_state === 9 || res.order_info.order_state === 13
    var tablePrincipal = [
      {
        principalTime: res['repay_principal_time'],
        principalFee: res.order_info.repay_principal_fee.amount * res.amount_to_invest.amount / res.order_info.amount_to_loan.amount,
        amountLoan: res.amount_to_invest.amount,
        principalFinish: finish ? (Number(res.amount_to_invest.amount) + Number(res.order_info.repay_principal_fee.amount * res.amount_to_invest.amount / res.order_info.amount_to_loan.amount)) : 0,
        expectTime: order_info.expect_principal_time,
        expect_principal_time: order_info.expect_principal_time,
        offsetTime: res.order_info.offset_time,
        orderState: res.order_info.order_state,
        finish: finish
      }
    ]
    res['tableListData']['principalData'] = tablePrincipal

    return res
  }
  static get_invest_object_info (res) {
    // 应标时间
    res['invest_time'] = QueryChainStore.getTimezoneDate(res['invest_time'])

    // 实际还本时间
    res['repay_principal_time'] = QueryChainStore.getTimezoneDate(res['repay_principal_time'])

    res['invest_asset'] = res['asset_to_invest'] // 投资资产的具体信息
    res['collateralize_asset'] = res['asset_to_collateralize'] // 抵押资产的具体信息
    res['invest_amount'] = res.amount_to_invest.amount // 投资资产的数量（处理了精度）
    res['order_state'] = res.order_info.order_state
    // 收益
    var interest_sum = 0
    var expect_sum = 0
    res.order_info.repay_interest.forEach(function (interest) {
      if (interest[1].interest_state === 2 || interest[1].interest_state === 4) {
        let rate = res['invest_amount'] * interest[1].amount_repay_interest.amount / res.amount_to_loan.amount
        interest_sum += rate
      }
      expect_sum = expect_sum + parseInt(interest[1].expect_repay_interest.amount)
    })
    if (res.order_info.order_state === 13) interest_sum = 0
    res['repay_interest_sum'] = interest_sum + res.order_info.repay_principal_fee.amount * res.amount_to_invest.amount / res.order_info.amount_to_loan.amount// 实际收益
    res['expect_sum'] = expect_sum
    res['repay_interest_rate'] = res['repay_interest_sum'] / res['invest_amount'] // 实际收益率
    let order_info = ZosInstance.get_loan_object_info(res['order_info'])
    res['order_info'] = order_info
    return res
  }
  // 获取排序后的借款列表
  static get_invest_orders_by_order (arry_orderids) {
    let result = []
    return Apis.instance().bitlender_api().exec('get_invest_orders_by_id', [arry_orderids]).then(res_list => {
      return new Promise((resolve, reject) => {
        async.each(res_list, function (res, allcallback) {
          if (!res) {
            allcallback(null)
            return
          }
          let int_obj = ZosInstance.get_invest_object_info(res)
          result.push(int_obj)
        }, function (allerr) {
          if (allerr) {
            console.log('err', allerr)
          }
          return resolve(result)
        })
        return resolve(result)
      })
    })
  }
  // 获取投资列表
  // arry_account_id:用户ID数组，如果有值就过滤，如果为空数组，就返回所有
  // arry_status:状态数组，如果有值就过滤，如果为空数组，就返回所有
  static get_invest_orders (arry_account_id, arry_asset_id, arry_status, start, limit) {
    let result = []
    return Apis.instance().db_api().exec('get_invest_orders', [arry_account_id, arry_asset_id, arry_status, start, limit]).then(res_list => {
      return new Promise(function (resolve, reject) {
        async.each(res_list, function (res, allcallback) {
          if (!res) {
            allcallback(null)
            return
          }
          let int_obj = ZosInstance.get_invest_object_info(res)
          result.push(int_obj)
        }, function (allerr) {
          if (allerr) {
            console.log('err', allerr)
          }
          return resolve(result)
        })
        return resolve(result)
      })
    }).catch(error => {
      console.log(error)
      return Promise.reject(error)
    })
  }
  // 获取借款列表总数量
  // arry_account_id:用户ID数组，如果有值就过滤，如果为空数组，就返回所有
  // arry_status:状态数组，如果有值就过滤，如果为空数组，就返回所有
  static get_loan_counts (
    arry_account_id,
    arry_asset_id,
    arry_status
  ) {
    return Apis.instance().db_api().exec('get_loan_counts', [arry_account_id, arry_asset_id, arry_status]).then(res => {
      return res
    })
  }
  // 获取借款列表
  // arry_account_id:用户ID数组，如果有值就过滤，如果为空数组，就返回所有
  // arry_status:状态数组，如果有值就过滤，如果为空数组，就返回所有
  static get_loan_orders (
    arry_acount_id,
    arry_asset_id,
    arry_status,
    start,
    limit
  ) {
    let result = []
    return Apis.instance().db_api().exec('get_loan_orders', [arry_acount_id, arry_asset_id, arry_status, start, limit]).then(res_list => {
      return new Promise((resolve, reject) => {
        async.each(res_list, function (res, allcallback) {
          if (!res) {
            allcallback(null)
            return
          }
          let int_obj = ZosInstance.get_loan_object_info(res)
          result.push(int_obj)
        })
        return resolve(result)
      })
    }).catch(error => {
      console.log(error)
      return Promise.reject(error)
    })
  }

  // 获取汇总数据
  /*
     参数：
     返回：
     各种汇总数据
     */
  static get_bitlender_loan_history_summary (type) {
    let result = []
    result['all_total_loan_count'] = 0 // 借款订单数量
    result['all_total_invest_count'] = 0 // 投资订单数量
    result['all_today_loan_count'] = 0 // 今日借款订单数量
    result['all_today_invest_count'] = 0 // 今日投资订单数量
    result['array_total'] = [] // 交易对的所有数据(数组)
    result['array_today'] = [] // 交易对的今日数据(数组)
    return Apis.instance().history_api().exec('get_bitlender_loan_history', ['1.3.0', '1.3.0', type]).then(res_list => {
      return new Promise((resolve, reject) => {
        async.each(res_list, function (res, allcallback) {
          if (!res) {
            allcallback(null)
            return
          }
          let total_obj = {}
          let today_obj = {}
          // 所有数据
          total_obj['base_precision'] = res.base_precision
          total_obj['quote_precision'] = res.quote_precision
          total_obj['key'] = res.key
          total_obj['market'] = res.base_symbol + '/' + res.quote_symbol // 交易对
          total_obj['carrier_fee'] = parseInt(res.total_carrier_fee) / Math.pow(10, res.base_precision) // 总运营商服务费
          total_obj['collateralize_amount'] = parseInt(res.total_collateralize_amount) / Math.pow(10, res.quote_precision) // 总抵押数量(满标
          total_obj['collateralize_fee'] = parseInt(res.total_collateralize_fee) / Math.pow(10, res.quote_precision) // 总平台服务费
          total_obj['collateralize_risk'] = parseInt(res.total_collateralize_risk) / Math.pow(10, res.quote_precision) // 总风险保证金费
          total_obj['earnings_amount'] = parseInt(res.total_earnings_amount) / Math.pow(10, res.base_precision) // 投资人已获总收益(已完成的标的的实际收益（包括各种罚息和不良资产的
          total_obj['invest_count'] = parseInt(res.total_invest_count) // 总投资笔数 （满标）
          total_obj['laon_amount'] = parseInt(res.total_laon_amount) / Math.pow(10, res.base_precision) // 总借款金额(满标
          total_obj['laon_count'] = parseInt(res.total_laon_count) // 总借款笔数（满标）
          total_obj['max_ratio'] = parseInt(res.total_max_ratio) / 1000 // 最大借款利率（实际利率）
          total_obj['min_ratio'] = parseInt(res.total_min_ratio) / 1000 // 最小借款利率（实际利率）
          total_obj['base_symbol'] = res.base_symbol // 借款资产Symbol
          total_obj['quote_symbol'] = res.quote_symbol // 抵押物资产Symbol
          total_obj['total_recycle_count'] = parseInt(res.total_recycle_count) // 回收
          total_obj['feed_model'] = parseInt(res.feed_model) // 费用模式
          total_obj['day_detail'] = res.day_detail // 统计数据
          // 今日数据
          today_obj['market'] = res.base_symbol + '/' + res.quote_symbol // 交易对
          today_obj['carrier_fee'] = parseInt(res.today_carrier_fee) / Math.pow(10, res.base_precision) // 总运营商服务费
          today_obj['collateralize_amount'] = parseInt(res.today_collateralize_amount) / Math.pow(10, res.quote_precision) // 总抵押数量(满标
          today_obj['collateralize_fee'] = parseInt(res.today_collateralize_fee) / Math.pow(10, res.quote_precision) // 总平台服务费
          today_obj['collateralize_risk'] = parseInt(res.today_collateralize_risk) / Math.pow(10, res.quote_precision) // 总风险保证金费
          today_obj['earnings_amount'] = parseInt(res.today_earnings_amount) / Math.pow(10, res.base_precision) // 投资人已获总收益(已完成的标的的实际收益（包括各种罚息和不良资产的）
          today_obj['invest_count'] = parseInt(res.today_invest_count) // 总投资笔数 （满标）
          today_obj['laon_amount'] = parseInt(res.today_laon_amount) / Math.pow(10, res.base_precision) // 总借款金额(满标
          today_obj['laon_count'] = parseInt(res.today_laon_count) // 总借款笔数（满标）
          today_obj['max_ratio'] = parseInt(res.today_max_ratio) / 1000 // 最大借款利率（实际利率）
          today_obj['min_ratio'] = parseInt(res.today_min_ratio) / 1000 // 最小借款利率（实际利率）
          today_obj['base_symbol'] = res.symbol // 借款资产Symbol
          today_obj['quote_symbol'] = res.symbol // 抵押物资产Symbol
          // 汇总数据
          result['all_total_loan_count'] = result['all_total_loan_count'] + parseInt(res.total_laon_count)
          result['all_total_invest_count'] = result['all_total_invest_count'] + parseInt(res.total_invest_count)
          result['all_today_loan_count'] = result['all_today_loan_count'] + parseInt(res.today_laon_count)
          result['all_today_invest_count'] = result['all_today_invest_count'] + parseInt(res.today_invest_count)
          result['array_total'].push(total_obj)
          result['array_today'].push(today_obj)
          allcallback(null)
        }, function (allerr) {
          if (allerr) {
            console.log('err', allerr)
            return reject(allerr)
          }
          return resolve(result)
        })
      })
    })
  }
  static get_account_invest_history_count (
    account_id,
    start,
    end
  ) {
    return Apis.instance().history_api().exec('get_account_invest_history_count', [account_id, start, end]).then(res => {
      return res
    })
  }
  static get_account_invest_history (account_id, start, end, startIndex, pagesize) {
    let result = []
    return Apis.instance().history_api().exec('get_account_invest_history', [account_id, start, end, startIndex, pagesize]).then(res_list => {
      return new Promise((resolve, reject) => {
        async.each(res_list, function (res, allcallback) {
          if (!res) {
            allcallback(null)
            return
          }
          let int_obj = ZosInstance.get_invest_object_info(res)
          result.push(int_obj)
        })
        return resolve(result)
      })
    }).catch(error => {
      console.log(error)
      return Promise.reject(error)
    })
  }
  // 获取我的借款历史
  // arry_account_id:用户ID数组，如果有值就过滤，如果为空数组，就返回所有
  // arry_status:状态数组，如果有值就过滤，如果为空数组，就返回所有
  static get_account_loan_history_count (
    account_id,
    start,
    end
  ) {
    return Apis.instance().history_api().exec('get_account_loan_history_count', [account_id, start, end]).then(res => {
      return res
    })
  }
  // Eirc
  static get_loan_object_info (res) {
    // 处理时区
    // tzo: TimeZoneOffset; 格林威治时间和本地时间之间的时差
    // 挂单截止时间
    res['expiration_time'] = QueryChainStore.getTimezoneDate(res['expiration_time'])
    // 满标时间
    res['invest_finish_time'] = QueryChainStore.getTimezoneDate(res['invest_finish_time'])
    // 借款时间
    res['loan_time'] = QueryChainStore.getTimezoneDate(res['loan_time'])
    // 实际还本时间
    res['repay_principal_time'] = QueryChainStore.getTimezoneDate(res['repay_principal_time'])
    // 预计还本时间
    res['expect_principal_time'] = QueryChainStore.getTimezoneDate(res['expect_principal_time'])
    // 不良资产逾期时间
    res['overdue_recycle_time'] = QueryChainStore.getTimezoneDate(res['overdue_recycle_time'])

    res['collateralize_asset'] = res.asset_to_collateralize // 抵押资产的具体信息
    res['loan_asset'] = res.asset_to_loan // 借款资产的具体信息
    // 还款总金额
    let repay_amount_sum = parseInt(res.amount_to_loan.amount)
    let expect_sum = 0
    repay_amount_sum = repay_amount_sum + parseInt(res.repay_principal_fee.amount)
    res.repay_interest.forEach(interest => {
      repay_amount_sum = repay_amount_sum + parseInt(interest[1].amount_repay_interest.amount) + parseInt(interest[1].fines_repay_interest.amount)
      expect_sum = expect_sum + parseInt(interest[1].expect_repay_interest.amount)
    })

    repay_amount_sum = repay_amount_sum / Math.pow(10, res['loan_asset'].precision)
    res['repay_amount_sum'] = repay_amount_sum // 还款总金额 （已处理精度）
    res['expect_sum'] = expect_sum

    // 处理还息数据
    res.repay_interest.forEach(interest => {
      let int_obj = interest[1]
      int_obj['index'] = interest[0] // 序号
      int_obj['asset_id'] = interest[1].amount_repay_interest.asset_id // 资产ID
      int_obj['amount'] = parseInt(interest[1].expect_repay_interest.amount) / Math.pow(10, res['loan_asset'].precision) // 应还金额(已处理精度)
      if (interest[1].interest_state === 2 || interest[1].interest_state === 4) {
        int_obj['finish_amount'] = (parseInt(interest[1].amount_repay_interest.amount) + parseInt(interest[1].fines_repay_interest.amount)) / Math.pow(10, res['loan_asset'].precision) // 实还金额(已处理精度)
        int_obj['finish_time'] = QueryChainStore.getTimezoneDate(interest[1].finish_time) // 实际还款时间
      } else {
        int_obj['finish_amount'] = 0
        int_obj['finish_time'] = '' // 实际还款时间
      }
      int_obj['amount_repay_interest'] = parseInt(interest[1].amount_repay_interest.amount) / Math.pow(10, res['loan_asset'].precision) // 实际还的利息
      int_obj['fines_repay_interest'] = parseInt(interest[1].fines_repay_interest.amount) / Math.pow(10, res['loan_asset'].precision) // 罚息资产
      int_obj['expect_time'] = QueryChainStore.getTimezoneDate(interest[1].expect_time) // 预计还款时间
      int_obj['interest_rate'] = interest[1].interest_rate.interest_rate // 利率
      int_obj['interest_state'] = interest[1].interest_state // 状态
      interest[1] = int_obj
    })

    res['cur_feed'] = QueryChainStore.calcFeedPrice(res.current_feed.settlement_price, res.asset_to_collateralize.id, res.asset_to_collateralize.precision, res.asset_to_loan.id, res.asset_to_loan.precision)
    res['cur_feed_view'] = QueryChainStore.calcFeedPriceView(res.current_feed.settlement_price, res.asset_to_loan.id, res.asset_to_loan.precision, res.asset_to_collateralize.id, res.asset_to_collateralize.precision)

    res['invest_process'] = (res.current_invest.amount / res.amount_to_loan.amount).toFixed(2) // 借款订单的进度
    res['invest_process_amount'] = parseInt(res.current_invest.amount) // 借款订单的目前投资额 (没有处理精度)

    res['invest_list'] = []

    return res
  }

  
  // arry_account_id:用户ID数组，如果有值就过滤，如果为空数组，就返回所有
  // arry_status:状态数组，如果有值就过滤，如果为空数组，就返回所有
  // 判断抵押物是否充足：抵押物数量 / 当前喂价 * maintenance_collateral_cash_ratio > 借款法币的数量
  static get_account_notify_orders (
    account_id,
    status,
    start,
    limit
  ) {
    let result = []
    return Apis.instance().db_api().exec('get_account_notify_orders', [account_id, status, start, limit]).then(res_list => {
      return new Promise((resolve, reject) => {
        async.each(res_list, function (res, allcallback) {
          if (!res) {
            allcallback(null)
            return
          }
          let int_obj = ZosInstance.get_loan_object_info(res)
          result.push(int_obj)
        })
        return resolve(result)
      })
    }).catch(error => {
      console.log(error)
      return Promise.reject(error)
    })
  }

  // 获取借款历史列表
  // 这个接口需要两个时间选择器，或者选择当月下一月
  // account_id: 用户ID
  // start: 开始时间: "2018-05-01T00:00:00"
  // end: 开始时间: "2018-06-01T00:00:00"
  static get_account_loan_history (account_id, start, end, startIndex, pagesize) {
    let result = []
    return Apis.instance().history_api().exec('get_account_loan_history', [account_id, start, end, startIndex, pagesize]).then(res_list => {
      return new Promise((resolve, reject) => {
        async.each(res_list, function (res, allcallback) {
          if (!res) {
            allcallback(null)
            return
          }
          let int_obj = ZosInstance.get_loan_object_info(res)
          result.push(int_obj)
        })
        return resolve(result)
      })
    }).catch(error => {
      console.log(error)
      return Promise.reject(error)
    })
  }
  // Eric
  static get_loan_object_data (res_obj) {
    let result = res_obj
    var collateralize_asset_precision = res_obj.asset_to_collateralize.precision
    var borrow_asset_precision = res_obj.asset_to_loan.precision

    result['id'] = res_obj.id
    result['asset_to_collateralize'] = res_obj.asset_to_collateralize
    result['asset_to_loan'] = res_obj.asset_to_loan
    result['collateralize_fee'] = res_obj.collateralize_fee // 抵押费用
    result['collateralize_risk'] = res_obj.collateralize_risk // 风险保证金
    result['amount_to_loan'] = res_obj.amount_to_loan // 借款数量
    result['loan_period'] = res_obj.loan_period // 借款期限，月
    result['interest_rate'] = res_obj.interest_rate.interest_rate // 借款利率
    result['loan_time'] = res_obj.loan_time // 借款时间
    result['expiration_time'] = res_obj.expiration_time // 挂单截止时间
    result['amount_to_collateralize'] = res_obj.amount_to_collateralize // 抵押物数量
    result['order_state'] = res_obj.order_state // 抵押物数量
    result['repay_principal_fee'] = res_obj.repay_principal_fee // 逾期还本的费用
    result['expect_principal_time'] = res_obj.expect_principal_time // 预计还本时间
    result['interest_book'] = res_obj.interest_book // 投资列表
    // 获取还息信息
    result['repay_interest'] = res_obj.repay_interest // 还息列表
    result['collateral_rate'] = res_obj.collateral_rate
    result['fee_mode'] = res_obj.fee_mode

    result['expiration_time'] = QueryChainStore.getTimezoneDate(res_obj['expiration_time'])

    // 满标时间
    result['invest_finish_time'] = QueryChainStore.getTimezoneDate(res_obj['invest_finish_time'])
    result['notify_time'] = QueryChainStore.getTimezoneDate(res_obj.notify_time)

    // 借款时间
    result['loan_time'] = QueryChainStore.getTimezoneDate(res_obj['loan_time'])
    result['carrier_fee'] = res_obj.carrier_fee //

    if (res_obj.collateralize_risk.asset_id === res_obj.asset_to_loan.asset_id) {
      result['asset_to_fee'] = res_obj.asset_to_loan
    } else {
      result['asset_to_fee'] = res_obj.asset_to_collateralize
    }
    // 实际还本时间
    if (res_obj.order_state === 7 || res_obj.order_state === 8 || res_obj.order_state === 9) {
      result['repay_principal_time'] = QueryChainStore.getTimezoneDate(res_obj['repay_principal_time'])
    } else if (res_obj.order_state === 13) {
      result['repay_principal_time'] = result['notify_time']
    } else {
      result['repay_principal_time'] = ''
    }
    // 预计还本时间
    result['expect_principal_time'] = QueryChainStore.getTimezoneDate(res_obj['expect_principal_time'])

    // 不良资产逾期时间
    result['overdue_recycle_time'] = QueryChainStore.getTimezoneDate(res_obj['overdue_recycle_time'])
    // 下单时喂价
    var price_settlement_feed = null
    if (res_obj.price_settlement) {
      if (res_obj.price_settlement.settlement_price) {
        price_settlement_feed = res_obj.price_settlement.settlement_price
      }
    }
    result['cur_feed'] = QueryChainStore.calcFeedPrice(res_obj.current_feed.settlement_price, res_obj.asset_to_collateralize.id, res_obj.asset_to_collateralize.precision, res_obj.asset_to_loan.id, res_obj.asset_to_loan.precision)
    result['cur_feed_view'] = QueryChainStore.calcFeedPriceView(res_obj.current_feed.settlement_price, res_obj.asset_to_loan.id, res_obj.asset_to_loan.precision, res_obj.asset_to_collateralize.id, res_obj.asset_to_collateralize.precision)
    result['deal_feed'] = QueryChainStore.calcFeedPrice(price_settlement_feed, res_obj.asset_to_collateralize.id, res_obj.asset_to_collateralize.precision, res_obj.asset_to_loan.id, res_obj.asset_to_loan.precision)

    result['current_feed'] = res_obj.current_feed
    result['price_settlement'] = res_obj.price_settlement

    // 处理还息数据
    let expect_sum = 0
    let interest_list = []
    res_obj.repay_interest.forEach(function (interest) {
      var int_obj = interest[1]
      int_obj['id'] = interest[0]
      int_obj['index'] = interest[0] // 序号
      int_obj['asset_id'] = interest[1].amount_repay_interest.asset_id // 资产ID
      int_obj['amount'] = parseInt(interest[1].expect_repay_interest.amount) / Math.pow(10, borrow_asset_precision) // 应还金额(已处理精度)
      if (interest[1].interest_state === 2 || interest[1].interest_state === 4) {
        int_obj['finish_amount'] = (parseInt(interest[1].amount_repay_interest.amount) + parseInt(interest[1].fines_repay_interest.amount)) / Math.pow(10, borrow_asset_precision) // 实还金额(已处理精度)
        int_obj['finish_time'] = QueryChainStore.getTimezoneDate(interest[1].finish_time) // 实际还款时间
      } else {
        int_obj['finish_amount'] = 0
        int_obj['finish_time'] = '' // 实际还款时间
      }
      int_obj['amount_repay_interest'] = parseInt(interest[1].amount_repay_interest.amount) / Math.pow(10, borrow_asset_precision) // 实际还的利息
      int_obj['fines_repay_interest'] = parseInt(interest[1].fines_repay_interest.amount) / Math.pow(10, borrow_asset_precision) // 罚息资产
      int_obj['expect_time'] = QueryChainStore.getTimezoneDate(interest[1].expect_time) // 预计还款时间
      int_obj['interest_rate'] = interest[1].interest_rate.interest_rate // 利率
      int_obj['interest_state'] = interest[1].interest_state // 状态
      interest[1] = int_obj
      expect_sum = expect_sum + parseInt(interest[1].expect_repay_interest.amount)
      interest_list.push(int_obj)
    })
    result['interest_list'] = interest_list

    res_obj.interest_book.forEach(function (interest) {
      interest[1]['id'] = interest[0]
      interest[1]['interest_issue_id'] = interest[1].account // 投资人姓名
      interest[1]['symbol'] = res_obj.asset_to_loan.symbol // 投资资产名称          // 投资时间
      interest[1]['time'] = QueryChainStore.getTimezoneDate(interest[1].invest_time) // 投资时间
      interest[1]['real_amount'] = interest[1].invest / Math.pow(10, borrow_asset_precision) // 投资金额（已处理精度）
      interest[1]['name'] = interest[1].name
    })

    // result['repay_interest'] = interest_list // 还息数据

    result['expect_sum'] = expect_sum
    result['invest_process'] = (res_obj.current_invest.amount / res_obj.amount_to_loan.amount).toFixed(2) // 借款订单的进度
    result['invest_process_amount'] = parseInt(res_obj.current_invest.amount) // 借款订单的目前投资额 (没有处理精度)
    // 费用
    let fee = [res_obj.collateralize_fee, res_obj.collateralize_risk, res_obj.carrier_fee]
    let asset = [res_obj.asset_to_fee, res_obj.asset_to_fee, res_obj.asset_to_loan]
    var feeData = {
      collateralizeFee: fee[0].amount / Math.pow(10, asset[0].precision),
      collateralizeFeeSymbol: asset[0].symbol,
      collateralizeFeePrecision: asset[0].precision,
      riskFee: fee[1].amount / Math.pow(10, asset[1].precision),
      riskSymbol: asset[1].symbol,
      riskPrecision: asset[1].precision,
      carrierFee: fee[2].amount / Math.pow(10, asset[2].precision),
      carrierFeeSymbol: asset[2].symbol,
      carrierFeePrecision: asset[2].precision
    }
    result['feeData'] = feeData
    // 费用分配
    var feeDis = {
      platform_service_loan_carrier: res_obj.distribution_fees[0], // 借方运营商(数字，精度：抵押物的精度)
      platform_service_invest_carrier: res_obj.distribution_fees[1], // 投资方运营商(数字，精度：抵押物的精度)
      platform_service_loan_refer: res_obj.distribution_fees[2], // 借方推荐人(数字，精度：抵押物的精度)
      platform_service_invest_refer: res_obj.distribution_fees[3], // 投资方推荐人数字，精度：抵押物的精度)
      platform_service_gateway: res_obj.distribution_fees[4], // 网关(数字，精度：抵押物的精度)
      platform_service_platform: res_obj.distribution_fees[5], // 平台(数字，精度：抵押物的精度)
      carrier_service_loan_carrier: res_obj.distribution_fees[6], // 借方运营商(数字，精度：借款币种的精度)
      carrier_service_invest_carrier: res_obj.distribution_fees[7], // 投资方运营商(数字，精度：借款币种的精度)
      loan_precision: res_obj.asset_to_loan.precision,
      loan_symbol: res_obj.asset_to_loan.symbol,
      fee_precision: res_obj.asset_to_fee.precision,
      fee_symbol: res_obj.asset_to_fee.symbol
    }
    result['feeDis'] = feeDis
    let finish = res_obj.order_state === 7 || res_obj.order_state === 8 || res_obj.order_state === 9 || res_obj.order_state === 13
    var tablePrincipal = [
      {
        principalTime: res_obj.repay_principal_time,
        principalFee: res_obj.repay_principal_fee.amount,
        amountLoan: res_obj.amount_to_loan.amount,
        principalFinish: finish ? Number(res_obj.repay_principal_fee.amount) + Number(res_obj.amount_to_loan.amount) : 0,
        expectTime: res_obj.expect_principal_time,
        expect_principal_time: res_obj.expect_principal_time,
        orderState: res_obj.order_state,
        finish: finish
      }
    ]
    result['tablePrincipal'] = tablePrincipal

    var investorsList = {
      id: res_obj.id,
      order_state: res_obj.order_state,
      collateralize_precision: res_obj.asset_to_collateralize.precision,
      collateralize_symbol: res_obj.asset_to_collateralize.symbol,
      loan_precision: res_obj.asset_to_loan.precision,
      loan_symbol: res_obj.asset_to_loan.symbol,
      principal_fee: res_obj.repay_principal_fee,
      interest_book: res_obj.interest_book,
      collateral_rate: res_obj.collateral_rate,
      asset_to_loan: res_obj.asset_to_loan
    }

    result['investorsList'] = investorsList

    var tableListData = {
      repaymentType: result.repayment_type,
      interestData: result.repay_interest,
      principalData: result.tablePrincipal,
      orderState: res_obj.order_state,
      offsetTime: res_obj.offset_time,
      symbol: res_obj.asset_to_loan.symbol,
      precision: res_obj.asset_to_loan.precision,
      id: res_obj.id
    }

    result['tableListData'] = tableListData

    return result
  }

  // 获取投资详情
  // 计算抵押物价值：抵押物数量 / （抵押物喂价信息/借款法币喂价信息）
  static get_invest_object (investid // 借款订单ID
  ) {
    return Apis.instance().bitlender_api().exec('get_invest_order', [investid, true]).then(res_obj => {
      return ZosInstance.get_invest_object_data(res_obj)
    })
  }
  // 获取我的历史投资详情
  static get_invest_object_history (investid // 投资订单ID
  ) {
    return Apis.instance().history_api().exec('get_object_history', [investid]).then(res_borrow => {
      return ZosInstance.get_invest_object_data(res_borrow)
    })
  }
  static get_loan_object_ex (order_id, his) {
    if (his) {
      return ZosInstance.get_loan_object_history(order_id)
    } else {
      return ZosInstance.get_loan_object(order_id)
    }
  }
  static get_invest_object_ex (order_id, his) {
    if (his) {
      return ZosInstance.get_invest_object_history(order_id)
    } else {
      return ZosInstance.get_invest_object(order_id)
    }
  }
  // Eric
  static get_loan_object_history (order_id) {
    return Apis.instance().history_api().exec('get_object_history', [order_id]).then(res_obj => {
      return ZosInstance.get_loan_object_data(res_obj)
    })
  }
  // 获取借款详情
  // 喂价信息，还息信息
  // Eric
  static get_loan_object (order_id // 订单ID
  ) {
    return Apis.instance().bitlender_api().exec('get_loan_order', [order_id]).then(function (res_obj) {
      return ZosInstance.get_loan_object_data(res_obj)
    })
  }

  static formatProposalTime (str) {
    function add (m) { return m < 10 ? '0' + m : m }
    let time = new Date(str)
    let y = time.getFullYear()
    let m = time.getMonth() + 1
    let d = time.getDate()
    let h = time.getHours()
    let mm = time.getMinutes()
    let s = time.getSeconds()
    return y + '-' + add(m) + '-' + add(d) + ' ' + add(h) + ':' + add(mm) + ':' + add(s)
  }
  static getTimezoneDateByGmt (x, offset = 0) {
    let get = new Date(x)
    if (offset > 0) get = new Date(get.getTime() + offset * 60 * 60 * 1000)
    return QueryChainStore.formatDate(get)
  }
  static getTimezoneDateByUnix (x, offset = 8) {
    var get = new Date(x + offset * 60 * 60 * 1000)
    return QueryChainStore.formatDate(get)
  }
  static getTimezoneDate (x) {
    return QueryChainStore.getTimezoneDate(x)
  }
}

// var NewpayInstanceWrapped = NewpayInstance.getInstance();
// export default NewpayInstanceWrapped
export default ZosInstance
