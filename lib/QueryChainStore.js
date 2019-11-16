'use strict';

Object.defineProperty(exports, "__esModule", {
  value: true
});

var _createClass = function () { function defineProperties(target, props) { for (var i = 0; i < props.length; i++) { var descriptor = props[i]; descriptor.enumerable = descriptor.enumerable || false; descriptor.configurable = true; if ("value" in descriptor) descriptor.writable = true; Object.defineProperty(target, descriptor.key, descriptor); } } return function (Constructor, protoProps, staticProps) { if (protoProps) defineProperties(Constructor.prototype, protoProps); if (staticProps) defineProperties(Constructor, staticProps); return Constructor; }; }();

var _zosjsWs = require('zosjs-ws');

var _es = require('zosjs/es');

var _utils = require('./lib/common/utils.js');

var _utils2 = _interopRequireDefault(_utils);

var _permission_utils = require('./lib/common/permission_utils.js');

var _permission_utils2 = _interopRequireDefault(_permission_utils);

var _immutable = require('immutable');

var _immutable2 = _interopRequireDefault(_immutable);

var _idbInstance = require('./idb-instance.js');

var _idbInstance2 = _interopRequireDefault(_idbInstance);

var _WalletManagerStore = require('./WalletManagerStore.js');

var _WalletManagerStore2 = _interopRequireDefault(_WalletManagerStore);

var _AccountStore = require('./AccountStore.js');

var _AccountStore2 = _interopRequireDefault(_AccountStore);

var _WalletDb = require('./WalletDb.js');

var _WalletDb2 = _interopRequireDefault(_WalletDb);

var _bs = require('bs58');

var _SettingsStore = require('./SettingsStore.js');

var _SettingsStore2 = _interopRequireDefault(_SettingsStore);

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } }

// var CryptUtil = require('./cryptUtil.js')
var crypto = require('crypto');

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

var QueryChainStore = function () {
  function QueryChainStore() {
    _classCallCheck(this, QueryChainStore);

    this.state = this._getInitialState();
  }

  _createClass(QueryChainStore, [{
    key: '_getInitialState',
    value: function _getInitialState() {
      return {
        new_wallet: undefined, // pending restore
        current_wallet: undefined,
        wallet_names: _immutable2.default.Set()
      };
    }
  }, {
    key: 'listAccountBalances_old',
    value: function listAccountBalances_old(name) {
      var bal = [];
      // name = "dylan-1234567";
      return _zosjsWs.Apis.instance().db_api().exec('get_named_account_balances', [name, []]).then(function (balance_objects) {
        var balanceJson = balance_objects;
        return balanceJson;
      }).then(function (balance_objects) {
        // console.log("balanceJson2:",balance_object);
        balance_objects.map(function (balance_object) {
          // console.log("balance_object:",balance_object)
          bal.push(_zosjsWs.Apis.instance().db_api().exec('get_objects', [[balance_object.asset_id]]).then(function (asset) {
            var amount = Number(balance_object.amount);
            amount = _utils2.default.get_asset_amount(amount, asset[0]);
            var result = Object.assign({}, balance_object, { 'amount': amount, 'precision': asset[0].precision, 'symbol': asset[0].symbol });
            return result;
          }));

          // var asset =  ChainStore.getAsset(balance_object.asset_id);
          // let amount = Number(balance_object.amount);
          // amount = Utils.get_asset_amount(amount,asset);
          // return Object.assign({},balance_object,{"amount":amount,"precision":asset.toJS().precision,"symbol":asset.toJS().symbol})
        });
        return Promise.all(bal);
      });
    }
  }, {
    key: 'listAccountBalances',
    value: function listAccountBalances(name) {
      var bal = [];
      // name = "dylan-1234567";
      return _zosjsWs.Apis.instance().db_api().exec('get_named_account_balances', [name, []]).then(function (balance_objects) {
        var balanceJson = balance_objects;
        return balanceJson;
      }).then(function (balance_objects) {
        // console.log("balanceJson2:",balance_object);
        balance_objects.map(function (balance_object) {
          // console.log("balance_object:",balance_object)
          bal.push(_zosjsWs.Apis.instance().db_api().exec('get_objects', [[balance_object.asset_id]]).then(function (asset) {
            var str_symbol = asset[0].symbol;
            if (asset[0].bitasset_data_id) {
              var excludeList = ['BTWTY', 'BANCOR', 'BTCSHA', 'CROWDFUN', 'DRAGON', 'TESTME'];
              if (excludeList.indexOf(asset[0].symbol) === -1) {
                str_symbol = 'NONE';
              }
            }
            var amount = Number(balance_object.amount);
            amount = _utils2.default.get_asset_amount(amount, asset[0]);
            var result = Object.assign({}, balance_object, { 'amount': amount, 'precision': asset[0].precision, 'symbol': str_symbol });
            return result;
          }));

          // var asset =  ChainStore.getAsset(balance_object.asset_id);
          // let amount = Number(balance_object.amount);
          // amount = Utils.get_asset_amount(amount,asset);
          // return Object.assign({},balance_object,{"amount":amount,"precision":asset.toJS().precision,"symbol":asset.toJS().symbol})
        });
        return Promise.all(bal);
      });
    }

    /**
       * 获取所有历史记录
       * 0 代表转账记录，4：订单撮合，1：限价单，5：创建账户
       */

  }, {
    key: 'listAccountHistory',
    value: function listAccountHistory(name) {
      // name = "dylan-1234567";
      // name = "1.2.446822"
      var trans_type = 0;
      var accountInfo = _es.ChainStore.getAccount(name);
      // console.log("accountInfo:"+ JSON.stringify(accountInfo))
      if (accountInfo) {
        _es.ChainStore.fetchRecentHistory(accountInfo).then(function (history_objects) {
          // console.log("history_objects:",JSON.stringify(history_objects));
          return JSON.stringify(history_objects);
        });
      } else {
        console.log('accountInfo null');
      }
    }

    // 默认为0  , 0 代表转账记录，4：订单撮合，1：限价单，5：创建账户

  }, {
    key: 'listAccountHistory2',
    value: function listAccountHistory2(name) {
      var trans_type = arguments.length > 1 && arguments[1] !== undefined ? arguments[1] : 0;

      // name = "dylan-1234567";
      var accountInfo = _es.ChainStore.getAccount(name);
      // console.log("accountInfo:"+ JSON.stringify(accountInfo))
      if (accountInfo) {
        var accountInfoJson = accountInfo.toJS();
        var historys = accountInfoJson.history;
        // console.log("history:",historys);
        if (historys) {
          var historyJson;
          if (trans_type === 100) {
            historyJson = JSON.stringify(historys);
          } else if (trans_type === '0') {
            var historyArr = [];
            historys.map(function (history) {
              if (history.op[0] === trans_type) {
                historyArr.push(history.op);
              }
            });
            historyJson = JSON.stringify(historyArr);
          }
          console.log('historyJson:', historyJson);
          return historyJson;
        }
      }
    }
  }, {
    key: 'lookupAccounts',
    value: function lookupAccounts(name, limit) {
      return _zosjsWs.Apis.instance().db_api().exec('lookup_accounts', [name, limit]);
    }
  }, {
    key: 'getDatabaseName',
    value: function getDatabaseName() {
      var current_wallet = arguments.length > 0 && arguments[0] !== undefined ? arguments[0] : 'default';

      var chain_id = _zosjsWs.Apis.instance().chain_id;
      return ['graphene_v2', chain_id ? chain_id.substring(0, 6) : '', current_wallet].join('_');
    }
  }, {
    key: 'getRootDatabaseName',
    value: function getRootDatabaseName() {
      var chain_id = _zosjsWs.Apis.instance().chain_id;
      var chain_substring = chain_id ? chain_id.substring(0, 6) : '';
      return 'graphene_db' + '_' + chain_substring;
    }
  }, {
    key: 'deleteDatabase',
    value: function deleteDatabase(databaseName) {
      var req = _idbInstance2.default.impl.deleteDatabase(databaseName);
      return req;
    }
  }, {
    key: 'importBrainkey22',
    value: function importBrainkey22(wallet_name, waleet_pw, brainkey_plaintext) {}
  }, {
    key: 'importBrainkey',
    value: function importBrainkey(wallet_name, waleet_pw, brainkey_plaintext, callbackFun) {
      var _this = this;

      var private_key = _es.key.get_brainPrivateKey(brainkey_plaintext);
      var pubkey = private_key.toPublicKey().toPublicKeyString();
      return _zosjsWs.Apis.instance().db_api().exec('get_key_references', [[pubkey]]).then(function (res) {
        if (!res || !res.length) {
          return Promise.reject('账号不存在！');
        }
        var new_curAccountID = res[0][0];
        return _zosjsWs.Apis.instance().db_api().exec('get_accounts', [[new_curAccountID]]).then(function (acc_result) {
          var new_curAccountName = acc_result[0].name;

          var key = 'account';
          var curAccount = localStorage.getItem(key);

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
            return callbackFun(new_curAccountName).then(function (res) {
              if (res.flag === 0) {
                console.log('callbackFun success');
                return _this._doImportBrainkey(wallet_name, waleet_pw, brainkey_plaintext, new_curAccountName);
              } else {
                console.log('callbackFun fail');
                return Promise.reject(res.value);
              }
            }).catch(function (call_err) {
              return Promise.reject(call_err);
            });
          } else {
            console.log('NO callbackFun success');
            return _this._doImportBrainkey(wallet_name, waleet_pw, brainkey_plaintext, new_curAccountName);
          }
        });
      }).catch(function (err) {
        return Promise.reject(err);
      });
    }
  }, {
    key: '_doImportBrainkey',
    value: function _doImportBrainkey(wallet_name, waleet_pw, brainkey_plaintext, new_curAccountName) {
      var _this2 = this;

      return new Promise(function (resolve, reject) {
        var databaseName = _this2.getDatabaseName();
        _idbInstance2.default.impl.deleteDatabase(databaseName);
        var key = '__graphene__' + _AccountStore2.default._getCurrentAccountKey();
        localStorage.removeItem(key);
        _idbInstance2.default.close();
        return _idbInstance2.default.init_instance().init_promise.then(function () {
          var setRoot1 = _idbInstance2.default.root.setProperty('wallet_names', []);
          var setRoot2 = _idbInstance2.default.root.setProperty('current_wallet', '');
          var setRoot3 = _idbInstance2.default.root.setProperty('AddressIndex', null);
          return Promise.all([setRoot1, setRoot2, setRoot3]).then(function () {
            return _WalletManagerStore2.default.init().then(function () {
              return _WalletManagerStore2.default.onSetWallet(wallet_name, waleet_pw, brainkey_plaintext).then(function () {
                var owner_private = _WalletDb2.default.generateNextKey();
                var active_private = _WalletDb2.default.generateNextKey();
                var transaction = _WalletDb2.default.transaction_update_keys();
                var p = _WalletDb2.default.saveKeys([owner_private, active_private],
                // [ owner_private, active_private, memo_private ],
                transaction);
                return p.catch(function (error) {
                  _WalletDb2.default.decrementBrainKeySequence();
                  _WalletDb2.default.decrementBrainKeySequence();
                  transaction.abort();
                  reject();
                }).then(function () {
                  _AccountStore2.default.onCreateAccount(new_curAccountName);
                  resolve();
                });
              });
            });
          });
        });
      });
    }

    // 查询交易列表

  }, {
    key: 'getTransferList',
    value: function getTransferList(name, start) {
      var _this3 = this;

      var limit = arguments.length > 2 && arguments[2] !== undefined ? arguments[2] : 5;

      if (start == '' || start == null) {
        start = '1.11.0';
      } else {
        var start_index = start.lastIndexOf('.') + 1;
        var start_num = parseInt(start.slice(start_index)) - 1;
        start = '1.11.' + start_num;
      }
      return _zosjsWs.Apis.instance().db_api().exec('get_account_by_name', [name]).then(function (res_account) {
        return _zosjsWs.Apis.instance().history_api().exec('get_account_history', [res_account.id, '1.11.0', 5, start]).then(function (res) {
          return Promise.all(res.map(_this3.getTransferListResult)).then(function (res_obj) {
            return res_obj.filter(function (item) {
              return item !== null;
            });
          });
        });
      });
    }
  }, {
    key: 'getTransferListResult',
    value: function getTransferListResult(res) {
      if (res.op[0] !== 0) {
        return null;
      }
      var result = {};
      var history_id = res.id;
      var form_id = res.op[1].from;
      var to_id = res.op[1].to;
      var amount_asset_id = res.op[1].amount.asset_id;
      var amount = res.op[1].amount.amount;
      var block_num = res.block_num;
      var trx_in_block = res.trx_in_block;
      return new Promise(function (resolve, reject) {
        _zosjsWs.Apis.instance().db_api().exec('get_objects', [[form_id, to_id, amount_asset_id], true]).then(function (r) {
          result['history_id'] = history_id;
          result['from_name'] = r[0].name;
          result['from_id'] = form_id;
          result['to_name'] = r[1].name;
          result['to_id'] = to_id;
          result['amount_id'] = amount_asset_id;
          result['amount_name'] = r[2].symbol;
          result['amount_precision'] = r[2].precision;
          result['amount'] = amount;
          result['real_amount'] = amount / Math.pow(10, r[2].precision);
          result['block_num'] = block_num;
          result['trx_in_block'] = trx_in_block;
          resolve(result);
        });
      });
    }
  }, {
    key: 'is_account_name_error',
    value: function is_account_name_error(value) {
      var allow_too_short = arguments.length > 1 && arguments[1] !== undefined ? arguments[1] : null;

      var i, label, len, length, ref, suffix;
      if (allow_too_short == null) {
        allow_too_short = false;
      }
      suffix = '账户名称';
      if (this.is_empty(value)) {
        return suffix + '不能为空.';
      }
      length = value.length;
      if (!allow_too_short && length < 3) {
        return suffix + '长度要大于3.';
      }
      if (length > 63) {
        return suffix + '长度要小于63.';
      }
      if (/\./.test(value)) {
        suffix = '账户名称应该';
      }
      ref = value.split('.');
      for (i = 0, len = ref.length; i < len; i++) {
        label = ref[i];
        if (!/^[~a-z]/.test(label)) {
          return suffix + '以字母开头.';
        }
        if (!/^[~a-z0-9-]*$/.test(label)) {
          return suffix + '只有字母、数字或破折号.';
        }
        if (/--/.test(label)) {
          return suffix + '只有一个破折号.';
        }
        if (!/[a-z0-9]$/.test(label)) {
          return suffix + '以字母或数字结尾.';
        }
        if (!(label.length >= 3)) {
          return suffix + '长度大于3';
        }
      }
      return null;
    }
  }, {
    key: 'is_empty',
    value: function is_empty(value) {
      return value == null || value.length === 0;
    }
  }, {
    key: 'is_cheap_name',
    value: function is_cheap_name(account_name) {
      return (/[0-9-]/.test(account_name) || !/[aeiouy]/.test(account_name)
      );
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

  }, {
    key: 'calcFeedPrice',
    value: function calcFeedPrice(feed, base_id, base_precision, quote_id, quote_precision) {
      if (!feed) {
        return 0;
      }
      if (feed.quote.amount === 0 || feed.base.amount === 0) {
        return 0;
      }
      var base_amount = feed.base.amount;
      var quote_amount = feed.quote.amount;
      if (feed.base.asset_id === quote_id) {
        base_amount = feed.quote.amount;
        quote_amount = feed.base.amount;
      }
      // quote是抵押货币，base是可借贷货币 千万注意 base * quote 避免两次除法造成的精度问题 Eric
      var feed_price = parseInt(base_amount) * Math.pow(10, quote_precision) / (parseInt(quote_amount) * Math.pow(10, base_precision));
      if (base_precision - quote_precision >= 0) {
        return feed_price.toFixed(base_precision);
      } else {
        return feed_price.toFixed(quote_precision);
      }
    }
  }, {
    key: 'calcFeedPriceView',
    value: function calcFeedPriceView(feed, base_id, base_precision, quote_id, quote_precision) {
      if (!feed) {
        return 0;
      }
      if (feed.quote.amount === 0 || feed.base.amount === 0) {
        return 0;
      }
      var base_amount = feed.base.amount;
      var quote_amount = feed.quote.amount;
      if (feed.base.asset_id === quote_id) {
        base_amount = feed.quote.amount;
        quote_amount = feed.base.amount;
      }
      // quote是抵押货币，base是可借贷货币 千万注意 base * quote 避免两次除法造成的精度问题 Eric
      var feed_price = parseInt(quote_amount) * Math.pow(10, base_precision) / (parseInt(base_amount) * Math.pow(10, quote_precision));
      if (base_precision - quote_precision >= 0) {
        return feed_price.toFixed(base_precision);
      } else {
        return feed_price.toFixed(quote_precision);
      }
    }
    // 获取订单投资进度
    // 返回百分比（数字）和目前投资额（数字）

  }, {
    key: 'get_invest_process',
    value: function get_invest_process(order_id) {
      return _zosjsWs.Apis.instance().bitlender_api().exec('get_invest_process', [order_id]).then(function (res_pro) {
        var result = {};
        var all_amount = res_pro[0].amount;
        var amount = res_pro[1].amount;
        var process = (parseInt(amount) / parseInt(all_amount) * 100).toFixed(4);
        result['process'] = process;
        result['amount'] = amount;
        return result;
      });
    }

    // 通过借款数量、id和抵押物id,获取当前喂价下的抵押物（数量，id）

  }, {
    key: 'get_loan_collateralize',
    value: function get_loan_collateralize(loan_asset_id, loan_asset_amount, collateralize_id) {
      var loan_asset = {};
      loan_asset['amount'] = loan_asset_amount;
      loan_asset['asset_id'] = loan_asset_id;
      return _zosjsWs.Apis.instance().bitlender_api().exec('get_loan_collateralize', [loan_asset, collateralize_id]).then(function (res) {
        return Promise.resolve(res);
      }).catch(function (error) {
        console.log(error);
        return Promise.reject(error);
      });
    }

    // 对身份进行签名

  }, {
    key: 'signAuthInfo',
    value: function signAuthInfo(account_id) {
      var tr = new _es.TransactionBuilder();
      tr.add_type_operation('custom', {
        fee: {
          amount: 0,
          asset_id: '1.3.0'
        },
        payer: account_id,
        required_auths: new Set(account_id),
        id: 9999,
        data: []
      });
      return _WalletDb2.default.process_transaction(tr, null, true, [], confirm);
    }

    // 对trx进行签名

  }, {
    key: 'signTrx',
    value: function signTrx(account_id, trx_param) {
      var tr = new _es.TransactionBuilder();
      tr.add_type_operation('custom', {
        fee: {
          amount: 0,
          asset_id: '1.3.0'
        },
        payer: account_id,
        required_auths: new Set(account_id),
        id: 9999,
        data: trx_param
      });
      return _WalletDb2.default.process_transaction(tr, null, true, [], confirm);
    }
  }, {
    key: 'limitByPrecision',
    value: function limitByPrecision(value) {
      var p = arguments.length > 1 && arguments[1] !== undefined ? arguments[1] : 8;

      if (typeof p !== 'number') throw new Error('Input must be a number');
      var valueString = value.toString();
      var splitString = valueString.split('.');
      if (splitString.length === 1 || splitString.length === 2 && splitString[1].length <= p) {
        return parseFloat(valueString);
      } else {
        return parseFloat(splitString[0] + '.' + splitString[1].substr(0, p));
      }
    }

    // 获取实际的数据

  }, {
    key: 'getRealNum',
    value: function getRealNum(amount, precision) {
      var satoshi = Math.pow(10, precision);
      var toSats = Math.round(1 * satoshi);
      return this.limitByPrecision((amount / toSats).toFixed(precision), precision);
    }

    // 查询历史列表

  }, {
    key: 'getHistoryList',
    value: function getHistoryList(account_id, start) {
      var limit = arguments.length > 2 && arguments[2] !== undefined ? arguments[2] : 10;

      if (start == '' || start == null) {
        start = '1.11.0';
      } else {
        var start_index = start.lastIndexOf('.') + 1;
        var start_num = parseInt(start.slice(start_index)) - 1;
        start = '1.11.' + start_num;
      }
      return _zosjsWs.Apis.instance().history_api().exec('get_account_history', [account_id, '1.11.0', limit, start]).then(function (res) {
        return res;
      });
    }

    // 选择节点使用功能

  }, {
    key: 'getNode',
    value: function getNode(node) {
      var settingsStore = _SettingsStore2.default.getInstance();
      return {
        name: node.location || 'Unknown location',
        url: node.url,
        up: node.url in settingsStore.apiLatencies,
        ping: settingsStore.apiLatencies[node.url],
        hidden: !!node.hidden
      };
    }

    // 选择节点使用功能

  }, {
    key: 'getNodeIndexByURL',
    value: function getNodeIndexByURL(url) {
      var settingsStore = _SettingsStore2.default.getInstance();
      var apiServer = settingsStore.defaults.apiServer;
      var index = apiServer.findIndex(function (node) {
        return node.url === url;
      });
      if (index === -1) {
        return null;
      }
      return index;
    }

    // 选择节点使用功能

  }, {
    key: 'getCurrentNodeIndex',
    value: function getCurrentNodeIndex() {
      var settingsStore = _SettingsStore2.default.getInstance();
      var currentNode = this.getNodeIndexByURL(settingsStore.settings.get('apiServer'));

      return currentNode;
    }

    // 用户信息存储到本地时使用
    // （动作）更新用户信息

  }, {
    key: 'get_encode_memo',
    value: function get_encode_memo(account_id, // 用户ID
    fix_account_name, // 固定用户
    memo, // 用户信息，json串
    type) {
      memo = memo ? new Buffer(memo, 'utf-8') : memo;
      return Promise.all([(0, _es.FetchChain)('getAccount', account_id, 5000), (0, _es.FetchChain)('getAccount', fix_account_name)]).then(function (res) {
        var chain_memo_sender = res[0];
        var chain_to_memo_sender = res[1];
        var memo_from_privkey = void 0;
        var memo_from_public = void 0,
            memo_to_public = void 0;
        if (memo) {
          if (type === 0) {
            memo_from_public = chain_memo_sender.getIn(['options', 'memo_key']);
            memo_to_public = chain_to_memo_sender.getIn(['options', 'memo_key']);
          } else if (type === 1) {
            memo_from_public = chain_memo_sender.getIn(['options', 'auth_key']);
            memo_to_public = chain_to_memo_sender.getIn(['options', 'auth_key']);
          }
          if (/111111111111111111111/.test(memo_from_public) || /6FUsQ2hYRj1JSvabewWfUWTXyoDq6btmfLFjmXwby5GJgzEvT5/.test(memo_from_public)) {
            memo_from_public = null;
          }

          if (/111111111111111111111/.test(memo_to_public) || /6FUsQ2hYRj1JSvabewWfUWTXyoDq6btmfLFjmXwby5GJgzEvT5/.test(memo_to_public)) {
            memo_to_public = null;
          }

          memo_from_privkey = _WalletDb2.default.getPrivateKey(memo_from_public);

          if (!memo_from_privkey) {
            throw new Error('Missing private memo key for sender: ' + account_id);
          }
        }
        var memo_object = void 0;
        if (memo && memo_to_public && memo_from_public) {
          var nonce = _es.TransactionHelper.unique_nonce_uint64();
          memo_object = {
            from: memo_from_public,
            to: memo_to_public,
            nonce: nonce,
            message: _es.Aes.encrypt_with_checksum(memo_from_privkey, memo_to_public, nonce, memo)
          };
        }
        return Promise.resolve(memo_object);
      });
    }

    // 加密Pin码

  }, {
    key: 'encodePin_old',
    value: function encodePin_old(pin_password, account_password) {
      var crypt = new CryptUtil();
      crypt.init(pin_password);
      var enc_pw = crypt.encrypt(account_password, 0); // 加密
      return enc_pw;
    }

    // 加密Pin码

  }, {
    key: 'encodePin',
    value: function encodePin(key, data) {
      var len = key.length;
      if (len < 16) {
        var str = String.fromCharCode(127);
        var pos = 16 - len;
        for (var i = 0; i < pos; i++) {
          key = key + str;
        }
      }
      var keys = key;
      keys = keys.substr(0, 16);
      var cipher = crypto.createCipheriv('aes-128-cbc', keys, keys);
      var crypted = cipher.update(data, 'utf8', 'binary');
      crypted += cipher.final('binary');
      crypted = new Buffer(crypted, 'binary').toString('base64');
      return crypted;
    }
  }, {
    key: 'decodePin_old',


    // 解密Pin码
    value: function decodePin_old(pin_password, enc_pw) {
      var crypt = new CryptUtil();
      crypt.init(pin_password);
      var account_password = crypt.decrypt(enc_pw, 0); // 解密
      return account_password;
    }

    // 解密Pin码

  }, {
    key: 'decodePin',
    value: function decodePin(key, crypted) {
      try {
        var len = key.length;
        if (len < 16) {
          var str = String.fromCharCode(127);
          var pos = 16 - len;
          for (var i = 0; i < pos; i++) {
            key = key + str;
          }
        }
        var keys = key;
        keys = keys.substr(0, 16);
        crypted = new Buffer(crypted, 'base64').toString('binary');
        var decipher = crypto.createDecipheriv('aes-128-cbc', keys, keys);
        var decoded = decipher.update(crypted, 'binary', 'utf8');
        decoded += decipher.final('utf8');
        return decoded;
      } catch (err) {
        return false;
      }
    }
  }, {
    key: 'get_random_password',


    // 返回随机密码
    value: function get_random_password() {
      var ps = ('P' + _es.key.get_random_key().toWif()).substr(0, 45);
      return ps;
    }

    // 获取处理时区后的时间

  }, {
    key: 'getTimezoneDate',
    value: function getTimezoneDate(date_string) {
      if (date_string === undefined || date_string === null || date_string.length <= 0) return 'N/A';
      if (date_string[date_string.length - 1] !== 'Z') date_string = date_string + 'Z';
      var date_obj = new Date(date_string);
      if (date_obj.getTime() <= 0) {
        return 'N/A';
      }
      return this.formatDate(date_obj);
    }

    // 日期格式化
    // date: Date对象

  }, {
    key: 'formatDate',
    value: function formatDate(date) {
      var fmt = arguments.length > 1 && arguments[1] !== undefined ? arguments[1] : 'yyyy-MM-ddThh:mm:ss';
      // author: meizz
      var o = {
        'M+': date.getMonth() + 1, // 月份
        'd+': date.getDate(), // 日
        'h+': date.getHours(), // 小时
        'm+': date.getMinutes(), // 分
        's+': date.getSeconds(), // 秒
        'q+': Math.floor((date.getMonth() + 3) / 3), // 季度
        'S': date.getMilliseconds() // 毫秒
      };
      if (/(y+)/.test(fmt)) {
        fmt = fmt.replace(RegExp.$1, (date.getFullYear() + '').substr(4 - RegExp.$1.length));
      }
      for (var k in o) {
        if (new RegExp('(' + k + ')').test(fmt)) {
          fmt = fmt.replace(RegExp.$1, RegExp.$1.length === 1 ? o[k] : ('00' + o[k]).substr(('' + o[k]).length));
        }
      }
      return fmt;
    }
  }, {
    key: 'memfromImmutableObj',
    value: function memfromImmutableObj(memo) {
      if (!memo) return undefined;

      var from1 = memo.get('from');
      var to1 = memo.get('to');
      var nonce1 = memo.get('nonce');
      var message1 = memo.get('message');

      return { from: from1, to: to1, nonce: nonce1, message: message1 };
    }
    // 修改链上密码所需要的函数

  }, {
    key: 'permissionsFromImmutableObj',
    value: function permissionsFromImmutableObj(auths) {
      var threshold = auths.get('weight_threshold');
      var account_auths = auths.get('account_auths');
      var key_auths = auths.get('key_auths');
      var address_auths = auths.get('address_auths');

      var accounts = account_auths.map(function (a) {
        return a.get(0);
      });
      var keys = key_auths.map(function (a) {
        return a.get(0);
      });
      var addresses = address_auths.map(function (a) {
        return a.get(0);
      });

      var weights = account_auths.reduce(function (res, a) {
        res[a.get(0)] = a.get(1);
        return res;
      }, {});
      weights = key_auths.reduce(function (res, a) {
        res[a.get(0)] = a.get(1);
        return res;
      }, weights);
      weights = address_auths.reduce(function (res, a) {
        res[a.get(0)] = a.get(1);
        return res;
      }, weights);

      return { threshold: threshold, accounts: accounts, keys: keys, addresses: addresses, weights: weights };
    }

    // 用户登录

  }, {
    key: 'accountLogin',
    value: function accountLogin(name, password) {
      _WalletDb2.default.onLock();

      var _WalletDb$validatePas = _WalletDb2.default.validatePassword(password, true, name),
          success = _WalletDb$validatePas.success;

      if (!success) return false;
      if (!_WalletDb2.default.isLocked()) {
        _AccountStore2.default.onSetPasswordAccount(name);
        var acc = _es.ChainStore.getAccount(name, false);
        if (acc) {
          return acc.get('id');
        } else {
          return false;
        }
      } else {
        return false;
      }
    }

    // 修改链上密码所需要的函数

  }, {
    key: 'permissionsToJson',
    value: function permissionsToJson(threshold, accounts, keys, addresses, weights) {
      var res = { weight_threshold: threshold };
      res['account_auths'] = accounts.sort(_utils2.default.sortID).map(function (a) {
        return [a, weights[a]];
      }).toJS();
      res['key_auths'] = keys.sort(_utils2.default.sortID).map(function (a) {
        return [a, weights[a]];
      }).toJS();
      res['address_auths'] = addresses.sort(_utils2.default.sortID).map(function (a) {
        return [a, weights[a]];
      }).toJS();
      return res;
    }

    //

  }, {
    key: 'didChange',
    value: function didChange(type, s) {
      if (type === 'memo') {
        return s.memo_key !== s.prev_memo_key;
      }
      if (type === 'auth') {
        return s.auth_key !== s.prev_auth_key;
      }
      var didChange = false;
      ['_keys', '_active_addresses', '_accounts', '_threshold'].forEach(function (key) {
        var current = type + key;
        // if(s[current] && s["prev_" + current]) {
        //     if (Immutable.is(s[current].asImmutable, s["prev_" + current].asImmutable)) {
        //         didChange = true;
        //     }

        // }
        if (s[current] !== s['prev_' + current]) {
          //console.log('didChange-true')
          didChange = true;
        }
      });
      return didChange;
    }

    //

  }, {
    key: 'isValidPubKey',
    value: function isValidPubKey(value) {
      return !!_es.PublicKey.fromPublicKeyString(value);
    }
  }, {
    key: 'get_core_asset_info',


    // 获取核心资产的信息
    value: function get_core_asset_info() {
      var base = { amount: 100, asset_id: '1.3.0' };
      var quote = { amount: 100, asset_id: '1.3.0' };
      var zos_asset = _es.ChainStore.getObject('1.3.0');
      var zos_precision = zos_asset.get('precision');
      var collateral_feed = { base: base, quote: quote };
      var result = {};
      result['maintenance_collateral_ratio'] = 1;
      result['maximum_short_squeeze_ratio'] = 1;
      result['maintenance_collateral_cash_ratio'] = 1;
      result['maximum_short_squeeze_cash_ratio'] = 1;
      result['precision'] = zos_precision;
      result['feed'] = collateral_feed;
      return result;
    }

    // 查找需要同意或拒绝的账号和Key列表
    // 参数：
    // propos_id: 提案ID
    // type: 0-批准提案；1-否决提案

  }, {
    key: 'get_propos_required_list',
    value: function get_propos_required_list(propos_id) {
      var op_type = arguments.length > 1 && arguments[1] !== undefined ? arguments[1] : 0;

      // FetchChain 会导致提案同意，再否决，再同意的时候，找不到当前操作人，应该为Apis直接查找
      return (0, _es.FetchChain)('getObject', propos_id).then(function (propos) {
        var type = propos.get('required_active_approvals').size ? 'active' : 'owner';
        var str_required = 'required_' + type + '_approvals';
        var str_available = 'available_' + type + '_approvals';
        var str_key = 'available_key_approvals';
        var required = _permission_utils2.default.listToIDs(propos.get(str_required));
        var available = _permission_utils2.default.listToIDs(propos.get(str_available));
        var availableKeys = _permission_utils2.default.listToIDs(propos.get(str_key));
        var requiredPermissions = _permission_utils2.default.unnest(required, type);

        var finalRequired = [];
        requiredPermissions.forEach(function (account) {
          finalRequired = finalRequired.concat(account.getMissingSigs(available));
        });

        var finalRequiredKeys = [];
        requiredPermissions.forEach(function (account) {
          finalRequiredKeys = finalRequiredKeys.concat(account.getMissingKeys(availableKeys));
        });
        var accounts = [];
        var keys = [];
        var isAdd = op_type === 0;
        if (isAdd) {
          accounts = finalRequired;
          keys = finalRequiredKeys;
        } else {
          accounts = available;
          keys = availableKeys;
        }
        var accountMap = {};
        var accountNames = [];
        if (accounts.length) {
          accounts.forEach(function (accountID) {
            var account = _es.ChainStore.getAccount(accountID);
            var accountCheck = isAdd ? account && !propos.get(str_available).includes(account.get('id')) : account && propos.get(str_available).includes(account.get('id'));
            if (accountCheck) {
              accountMap[account.get('name')] = account.get('id');
              accountNames.push(account.get('name'));
            }
          });
        }
        var keyNames = [];
        var keyMap = {};
        if (keys.length) {
          keys.forEach(function (key) {
            var isMine = _AccountStore2.default.isMyKey(key);
            if (isMine && !propos.get('available_key_approvals').includes(key)) {
              keyMap[key] = true;
              keyNames.push(key);
            }
          });
        }
        var result = {};
        result['accounts_map'] = accountMap; // 用户账号列表对象；{'账号':'ID','账号':'ID',...}
        result['accounts_ary'] = accountNames; // 用户账号名字列表数组
        result['keys_ary'] = keyNames; // 用户公钥列表数组 ['key', 'key',...]
        result['keys_map'] = keyMap; // 用户公钥列表对象
        return result;
      });
    }
  }, {
    key: 'getPrettyNameFee',
    value: function getPrettyNameFee(account_name) {
      var tr = new _es.TransactionBuilder();
      var transfer_op = tr.get_type_operation('account_create', {
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
      });
      var operations = [];
      operations.push(_es.ops.operation.toObject(transfer_op));
      return _zosjsWs.Apis.instance().db_api().exec('get_required_fees', [operations, '1.3.0']).then(function (res) {
        var res_asset = _es.ChainStore.getObject('1.3.0');
        var res_precision = res_asset.get('precision');
        var res_symbol = res_asset.get('symbol');
        res[0]['precision'] = res_precision;
        res[0]['symbol'] = res_symbol;
        return Promise.resolve(res);
      });
    }
  }], [{
    key: 'getInstance',
    value: function getInstance() {
      if (!QueryChainStore.instance) {
        QueryChainStore.instance = new QueryChainStore();
      }
      return QueryChainStore.instance;
    }
  }, {
    key: 'get_vote_objects',
    value: function get_vote_objects() {
      var type = arguments.length > 0 && arguments[0] !== undefined ? arguments[0] : 'witnesses';

      var _this4 = this;

      var vote_ids = arguments[1];
      var res_data = arguments[2];

      var current = res_data;
      return (0, _es.FetchChain)('getObject', '2.0.0').then(function (globalObject) {
        var isWitness = type === 'witnesses';
        var lastIdx = void 0;
        if (!vote_ids) {
          vote_ids = [];
          var active = globalObject.get(isWitness ? 'active_witnesses' : 'active_committee_members');
          var lastActive = active.last() || '1.' + (isWitness ? '6' : '5') + '.1';
          lastIdx = parseInt(lastActive.split('.')[2], 10);
          for (var i = 1; i <= lastIdx + 10; i++) {
            vote_ids.push('1.' + (isWitness ? '6' : '5') + '.' + i);
          }
        } else {
          lastIdx = parseInt(vote_ids[vote_ids.length - 1].split('.')[2], 10);
        }
        return FetchChainObjects(_es.ChainStore.getObject, vote_ids, 5000, {}).then(function (vote_objs) {
          res_data = current.concat(_immutable2.default.List(vote_objs.filter(function (a) {
            return !!a;
          }).map(function (a) {
            return a.get(isWitness ? 'witness_account' : 'committee_member_account');
          })));
          if (vote_objs[vote_objs.length - 1]) {
            // there are more valid vote objs, fetch more
            vote_ids = [];
            for (var i = lastIdx + 11; i <= lastIdx + 20; i++) {
              vote_ids.push('1.' + (isWitness ? '6' : '5') + '.' + i);
            }
            return _this4.get_vote_objects(type, vote_ids, res_data);
          } else {
            return res_data;
          }
        });
      });
    }
  }]);

  return QueryChainStore;
}();

var QueryChainStoreWrapped = QueryChainStore.getInstance();
exports.default = QueryChainStoreWrapped;