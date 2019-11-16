'use strict';

Object.defineProperty(exports, "__esModule", {
  value: true
});

var _slicedToArray = function () { function sliceIterator(arr, i) { var _arr = []; var _n = true; var _d = false; var _e = undefined; try { for (var _i = arr[Symbol.iterator](), _s; !(_n = (_s = _i.next()).done); _n = true) { _arr.push(_s.value); if (i && _arr.length === i) break; } } catch (err) { _d = true; _e = err; } finally { try { if (!_n && _i["return"]) _i["return"](); } finally { if (_d) throw _e; } } return _arr; } return function (arr, i) { if (Array.isArray(arr)) { return arr; } else if (Symbol.iterator in Object(arr)) { return sliceIterator(arr, i); } else { throw new TypeError("Invalid attempt to destructure non-iterable instance"); } }; }();

var _createClass = function () { function defineProperties(target, props) { for (var i = 0; i < props.length; i++) { var descriptor = props[i]; descriptor.enumerable = descriptor.enumerable || false; descriptor.configurable = true; if ("value" in descriptor) descriptor.writable = true; Object.defineProperty(target, descriptor.key, descriptor); } } return function (Constructor, protoProps, staticProps) { if (protoProps) defineProperties(Constructor.prototype, protoProps); if (staticProps) defineProperties(Constructor, staticProps); return Constructor; }; }();

var _WalletDb = require('./WalletDb.js');

var _WalletDb2 = _interopRequireDefault(_WalletDb);

var _es = require('zosjs/es');

var _zosjsWs = require('zosjs-ws');

var _PrivateKeyStore = require('./PrivateKeyStore.js');

var _PrivateKeyStore2 = _interopRequireDefault(_PrivateKeyStore);

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } }

var ApplicationApi = function () {
  function ApplicationApi() {
    _classCallCheck(this, ApplicationApi);
  }

  _createClass(ApplicationApi, [{
    key: 'create_account',
    value: function create_account(owner_pubkey, active_pubkey, memmo_pubkey, author_pubkey, new_account_name, registrar, referrer, referrer_percent) {
      var broadcast = arguments.length > 8 && arguments[8] !== undefined ? arguments[8] : false;

      _es.ChainValidation.required(registrar, 'registrar_id');
      _es.ChainValidation.required(referrer, 'referrer_id');

      return new Promise(function (resolve, reject) {
        return Promise.all([(0, _es.FetchChain)('getAccount', registrar), (0, _es.FetchChain)('getAccount', referrer)]).then(function (res) {
          var _res = _slicedToArray(res, 2),
              chain_registrar = _res[0],
              chain_referrer = _res[1];

          var tr = new _es.TransactionBuilder();
          tr.add_type_operation('account_create', {
            fee: {
              amount: 0,
              asset_id: 0
            },
            registrar: chain_registrar.get('id'),
            referrer: chain_referrer.get('id'),
            referrer_percent: referrer_percent,
            name: new_account_name,
            // captcha: captcha,
            // captchaid: captchaid,
            owner: {
              weight_threshold: 1,
              account_auths: [],
              key_auths: [[owner_pubkey, 1]],
              address_auths: []
            },
            active: {
              weight_threshold: 1,
              account_auths: [],
              key_auths: [[active_pubkey, 1]],
              address_auths: []
            },
            limitactive: {
              weight_threshold: 1,
              account_auths: [],
              key_auths: [[active_pubkey, 1]],
              address_auths: []
            },
            options: {
              memo_key: memmo_pubkey,
              auth_key: author_pubkey,
              voting_account: '1.2.5',
              num_witness: 0,
              num_committee: 0,
              num_budget: 0,
              votes: []
            }
          });

          console.log('ApplicationApi.create_account: ', tr, broadcast);
          return _WalletDb2.default.process_transaction(tr, null, // signer_private_keys,
          broadcast).then(function (res) {
            console.log('process_transaction then', res);
            resolve();
          }).catch(function (err) {
            console.log('process_transaction catch', err);
            reject(err);
          });
        });
      });
    }
    /**
          @param propose_account (or null) pays the fee to create the proposal, also used as memo from
          application_api.transfer(
          "tmp10099",
          "cui-yujie",
          1*10000,
          "1.3.0",
          '备注')
      */

  }, {
    key: 'is_enc_memo',
    value: function is_enc_memo(from_account, to_account) {
      return Promise.all([_zosjsWs.Apis.instance().db_api().exec('get_full_accounts', [[from_account], false]), _zosjsWs.Apis.instance().db_api().exec('get_full_accounts', [[to_account], false])]).then(function (res) {
        var _res2 = _slicedToArray(res, 2),
            chain_from = _res2[0],
            chain_to = _res2[1];

        var enc_message = true;
        try {
          if (!chain_from || !chain_to) return true;

          if (!chain_from[0] || !chain_to[0]) return true;

          var chain_from_account = chain_from[0][1].account;
          var chain_to_account = chain_to[0][1].account;

          var memo_from_public = null;
          var memo_to_public = null;

          memo_from_public = chain_from_account.options.memo_key; // chain_memo_sender.getIn(["options","memo_key"]);
          // The 1s are base58 for all zeros (null)
          // 明文标志
          if (/111111111111111111111/.test(memo_from_public) || /6FUsQ2hYRj1JSvabewWfUWTXyoDq6btmfLFjmXwby5GJgzEvT5/.test(memo_from_public)) {
            enc_message = false;
          }
          memo_to_public = chain_to_account.options.memo_key; // chain_to.getIn(["options","memo_key"])
          // 明文标志
          if (/111111111111111111111/.test(memo_to_public) || /6FUsQ2hYRj1JSvabewWfUWTXyoDq6btmfLFjmXwby5GJgzEvT5/.test(memo_to_public)) {
            enc_message = false;
          }
        } catch (err) {
          console.log(err);
        }
        return enc_message;
      });
    }
  }, {
    key: 'transfer',
    value: function transfer( // OBJECT: { ... }
    from_account, to_account, amount, // 用户输入的钱*小数的精度，从查询余额里面拿到
    asset, // 资源ID，比如"1.3.0"，从查询余额里面拿到
    memo) {
      var broadcast = arguments.length > 5 && arguments[5] !== undefined ? arguments[5] : true;
      var encrypt_memo = arguments.length > 6 && arguments[6] !== undefined ? arguments[6] : true;
      var optional_nonce = arguments.length > 7 && arguments[7] !== undefined ? arguments[7] : null;
      var propose_account = arguments.length > 8 && arguments[8] !== undefined ? arguments[8] : null;
      var fee_asset_id = arguments.length > 9 && arguments[9] !== undefined ? arguments[9] : '1.3.0';
      var confirm = arguments.length > 10 && arguments[10] !== undefined ? arguments[10] : false;

      var memo_sender = propose_account || from_account;

      memo = memo ? new Buffer(memo, 'utf-8') : memo;

      return Promise.all([_zosjsWs.Apis.instance().db_api().exec('get_full_accounts', [[from_account], false]), _zosjsWs.Apis.instance().db_api().exec('get_full_accounts', [[to_account], false]), _zosjsWs.Apis.instance().db_api().exec('get_full_accounts', [[memo_sender], false]), _zosjsWs.Apis.instance().db_api().exec('get_objects', [[asset]]), _zosjsWs.Apis.instance().db_api().exec('get_objects', [[fee_asset_id]])]).then(function (res) {
        var _res3 = _slicedToArray(res, 5),
            chain_from = _res3[0],
            chain_to = _res3[1],
            chain_memo_sender = _res3[2],
            chain_asset = _res3[3],
            chain_fee_asset = _res3[4];

        var chain_from_account = chain_from[0][1].account;
        var chain_to_account = chain_to[0][1].account;
        var chain_memo_sender_account = chain_memo_sender[0][1].account;
        var enc_message = true;

        var memo_from_public = null;
        var memo_to_public = null;

        if (memo && encrypt_memo) {
          memo_from_public = chain_memo_sender_account.options.memo_key; // chain_memo_sender.getIn(["options","memo_key"]);
          // The 1s are base58 for all zeros (null)
          // 明文标志
          if (/111111111111111111111/.test(memo_from_public) || /6FUsQ2hYRj1JSvabewWfUWTXyoDq6btmfLFjmXwby5GJgzEvT5/.test(memo_from_public)) {
            enc_message = false;
          }
          memo_to_public = chain_to_account.options.memo_key; // chain_to.getIn(["options","memo_key"])
          // 明文标志
          if (/111111111111111111111/.test(memo_to_public) || /6FUsQ2hYRj1JSvabewWfUWTXyoDq6btmfLFjmXwby5GJgzEvT5/.test(memo_to_public)) {
            enc_message = false;
          }
        } else {
          enc_message = false;
        }

        var propose_acount_id = null;
        var memo_from_privkey = null;

        if (enc_message && memo && encrypt_memo) {
          memo_from_privkey = _WalletDb2.default.getPrivateKey(memo_from_public);
          if (!memo_from_privkey) {
            throw new Error('Missing private memo key for sender: ' + memo_sender);
          }
          if (optional_nonce !== null && optional_nonce === '34359738367') {
            throw new Error('err nonce: ' + optional_nonce);
          }
        }

        var memo_object = void 0;
        if (memo && encrypt_memo) {
          if (enc_message) {
            var nonce = optional_nonce == null ? _es.TransactionHelper.unique_nonce_uint64() : optional_nonce;

            memo_object = {
              from: memo_from_public,
              to: memo_to_public,
              nonce: nonce,
              message: encrypt_memo ? _es.Aes.encrypt_with_checksum(memo_from_privkey, memo_to_public, nonce, memo) : Buffer.isBuffer(memo) ? memo.toString('utf-8') : memo
            };
          } else {
            // 明文标志
            var _nonce = '34359738367';
            var sendtext = _PrivateKeyStore2.default.stringToByte(memo);
            memo_object = {
              from: memo_from_public,
              to: memo_to_public,
              nonce: _nonce,
              message: sendtext
            };
          }
        }
        console.log(memo_object);
        // Allow user to choose asset with which to pay fees #356
        var fee_asset = chain_fee_asset[0]; // chain_fee_asset.toJS();

        // Default to CORE in case of faulty core_exchange_rate
        if (fee_asset.options.core_exchange_rate.base.asset_id === '1.3.0' && fee_asset.options.core_exchange_rate.quote.asset_id === '1.3.0') {
          fee_asset_id = '1.3.0';
        }

        var tr = new _es.TransactionBuilder();
        var transfer_op = tr.get_type_operation('transfer', {
          fee: {
            amount: 0,
            asset_id: fee_asset_id
          },
          from: chain_from_account.id, // chain_from.get("id"),
          to: chain_to_account.id, // chain_to.get("id"),
          // amount: { amount, asset_id: chain_asset.get("id") },
          amount: { amount: amount, asset_id: chain_asset[0].id },
          memo: memo_object
        });
        return tr.update_head_block().then(function () {
          if (propose_account) {
            tr.add_type_operation('proposal_create', {
              proposed_ops: [{ op: transfer_op }],
              fee_paying_account: propose_acount_id
            });
          } else {
            tr.add_operation(transfer_op);
          }
          return _WalletDb2.default.process_transaction(tr, null, // signer_private_keys,
          broadcast, [], confirm);
        });
      });
    }
  }, {
    key: 'bitlender_lend_order',
    value: function bitlender_lend_order( // OBJECT: { ... }
    loaner_id, // 借款人ID
    carrier_id, // 运营商ID
    loan_asset_id, // 借款资产ID
    loan_amount, // 借款数量
    loan_asset_precision, // 借款资产精度
    loan_period, // 借款期限
    interest_rate, // 借款利息
    repayment_type, // 还款方式
    bid_period, // 投标期限
    collateralize_ammount, // 抵押数量
    collateralize_asset_id, // 抵押资产ID
    collateralize_asset_precision, // 抵押资产精度
    collateral_rate) {
      var fee_asset_id = arguments.length > 13 && arguments[13] !== undefined ? arguments[13] : '1.3.0';
      var confirm = arguments.length > 14 && arguments[14] !== undefined ? arguments[14] : false;

      var tr = new _es.TransactionBuilder();

      tr.add_type_operation('bitlender_lend_order', {
        fee: {
          amount: 0,
          asset_id: fee_asset_id
        },
        issuer: loaner_id, //  借款人ID
        carrier: carrier_id,
        order: '', // 订单号
        amount_to_loan: {
          amount: (loan_amount * Math.pow(10, loan_asset_precision)).toFixed(0), // 借款数量
          asset_id: loan_asset_id // 借款资产ID
        },
        loan_period: loan_period, // 借款期限
        interest_rate: interest_rate, // 借款利息
        repayment_type: repayment_type, // 还款方式
        amount_to_collateralize: {
          amount: (collateralize_ammount * Math.pow(10, collateralize_asset_precision)).toFixed(0), // 抵押数量
          asset_id: collateralize_asset_id // 抵押资产ID
        },
        collateral_rate: collateral_rate, // 保证金倍数
        bid_period: bid_period // 投标期限
      });
      return _WalletDb2.default.process_transaction(tr, null, true, [], confirm);
    }
  }, {
    key: 'bitlender_add_collateral',
    value: function bitlender_add_collateral(loaner_id, // 借款人ID
    order_id, //
    collateralize_ammount, // 抵押数量
    collateralize_asset_id, // 抵押资产ID
    collateralize_asset_precision, // 抵押资产精度
    collateral_rate) {
      var fee_asset_id = arguments.length > 6 && arguments[6] !== undefined ? arguments[6] : '1.3.0';
      var confirm = arguments.length > 7 && arguments[7] !== undefined ? arguments[7] : false;

      var tr = new _es.TransactionBuilder();

      tr.add_type_operation('bitlender_add_collateral', {
        fee: {
          amount: 0,
          asset_id: fee_asset_id
        },
        issuer: loaner_id, //  借款人ID
        order_id: order_id, // 订单ID
        collateral: {
          amount: (collateralize_ammount * Math.pow(10, collateralize_asset_precision)).toFixed(0), // 借款数量
          asset_id: collateralize_asset_id // 借款资产ID
        },
        collateral_rate: Number(collateral_rate)
      });
      return _WalletDb2.default.process_transaction(tr, null, true, [], confirm);
    }

    // 投资

  }, {
    key: 'bitlender_invest',
    value: function bitlender_invest(bidder_id, // 投资人ID
    loan_id, // 借款人ID
    carrier_id, // 运营商ID
    order_id, //
    invest_ammount, // 投资数量
    invest_asset_id, // 投资资产ID
    invest_asset_precision) {
      var fee_asset_id = arguments.length > 7 && arguments[7] !== undefined ? arguments[7] : '1.3.0';
      var confirm = arguments.length > 8 && arguments[8] !== undefined ? arguments[8] : false;

      var tr = new _es.TransactionBuilder();

      tr.add_type_operation('bitlender_invest', {
        fee: {
          amount: 0,
          asset_id: fee_asset_id
        },
        issuer: bidder_id, //  借款人ID
        loan_id: loan_id,
        carrier: carrier_id,
        order_id: order_id, // 订单ID
        amount_to_invest: {
          amount: (invest_ammount * Math.pow(10, invest_asset_precision)).toFixed(0), // 借款数量
          asset_id: invest_asset_id // 借款资产ID
        }
      });
      return _WalletDb2.default.process_transaction(tr, null, true, [], confirm);
    }

    // 还息

  }, {
    key: 'bitlender_repay_interest',
    value: function bitlender_repay_interest(issuer_id, // 发起人ID
    order_id, //
    repay_period) {
      var fee_asset_id = arguments.length > 3 && arguments[3] !== undefined ? arguments[3] : '1.3.0';
      var confirm = arguments.length > 4 && arguments[4] !== undefined ? arguments[4] : false;

      var tr = new _es.TransactionBuilder();

      tr.add_type_operation('bitlender_repay_interest', {
        fee: {
          amount: 0,
          asset_id: fee_asset_id
        },
        issuer: issuer_id,
        order_id: order_id, // 订单ID
        repay_period: repay_period // 第几期,整数
      });
      return _WalletDb2.default.process_transaction(tr, null, true, [], confirm);
    }

    // 逾期还息

  }, {
    key: 'bitlender_overdue_interest',
    value: function bitlender_overdue_interest(issuer_id, // 发起人ID
    order_id, //
    repay_period) {
      var fee_asset_id = arguments.length > 3 && arguments[3] !== undefined ? arguments[3] : '1.3.0';
      var confirm = arguments.length > 4 && arguments[4] !== undefined ? arguments[4] : false;

      var tr = new _es.TransactionBuilder();

      tr.add_type_operation('bitlender_overdue_interest', {
        fee: {
          amount: 0,
          asset_id: fee_asset_id
        },
        issuer: issuer_id,
        order_id: order_id, // 订单ID
        repay_period: repay_period // 第几期,整数
      });
      return _WalletDb2.default.process_transaction(tr, null, true, [], confirm);
    }

    // 还本

  }, {
    key: 'bitlender_repay_principal',
    value: function bitlender_repay_principal(issuer_id, // 发起人ID
    order_id) {
      var fee_asset_id = arguments.length > 2 && arguments[2] !== undefined ? arguments[2] : '1.3.0';
      var confirm = arguments.length > 3 && arguments[3] !== undefined ? arguments[3] : false;

      var tr = new _es.TransactionBuilder();

      tr.add_type_operation('bitlender_repay_principal', {
        fee: {
          amount: 0,
          asset_id: fee_asset_id
        },
        issuer: issuer_id,
        order_id: order_id // 订单ID
      });
      return _WalletDb2.default.process_transaction(tr, null, true, [], confirm);
    }

    // 逾期还本

  }, {
    key: 'bitlender_overdue_repay',
    value: function bitlender_overdue_repay(issuer_id, // 发起人ID
    order_id) {
      var fee_asset_id = arguments.length > 2 && arguments[2] !== undefined ? arguments[2] : '1.3.0';
      var confirm = arguments.length > 3 && arguments[3] !== undefined ? arguments[3] : false;

      var tr = new _es.TransactionBuilder();

      tr.add_type_operation('bitlender_overdue_repay', {
        fee: {
          amount: 0,
          asset_id: fee_asset_id
        },
        issuer: issuer_id,
        order_id: order_id // 订单ID
      });
      return _WalletDb2.default.process_transaction(tr, null, true, [], confirm);
    }

    // 提前还本

  }, {
    key: 'bitlender_prepayment',
    value: function bitlender_prepayment(issuer_id, // 发起人ID
    order_id) {
      var fee_asset_id = arguments.length > 2 && arguments[2] !== undefined ? arguments[2] : '1.3.0';
      var confirm = arguments.length > 3 && arguments[3] !== undefined ? arguments[3] : false;

      var tr = new _es.TransactionBuilder();

      tr.add_type_operation('bitlender_prepayment', {
        fee: {
          amount: 0,
          asset_id: fee_asset_id
        },
        issuer: issuer_id,
        order_id: order_id // 订单ID
      });
      return _WalletDb2.default.process_transaction(tr, null, true, [], confirm);
    }

    // 取消借款订单

  }, {
    key: 'bitlender_remove_operation',
    value: function bitlender_remove_operation(issuer_id, // 发起人ID
    order_id) {
      var fee_asset_id = arguments.length > 2 && arguments[2] !== undefined ? arguments[2] : '1.3.0';
      var confirm = arguments.length > 3 && arguments[3] !== undefined ? arguments[3] : false;

      var tr = new _es.TransactionBuilder();

      tr.add_type_operation('bitlender_remove_operation', {
        fee: {
          amount: 0,
          asset_id: fee_asset_id
        },
        issuer: issuer_id,
        order_id: order_id // 订单ID
      });
      return _WalletDb2.default.process_transaction(tr, null, true, [], confirm);
    }

    // 自动还款账户

  }, {
    key: 'bitlender_setautorepayer',
    value: function bitlender_setautorepayer(issuer_id, // 发起人ID
    order_id, bset) {
      var fee_asset_id = arguments.length > 3 && arguments[3] !== undefined ? arguments[3] : '1.3.0';
      var confirm = arguments.length > 4 && arguments[4] !== undefined ? arguments[4] : false;

      var tr = new _es.TransactionBuilder();

      tr.add_type_operation('bitlender_setautorepayer', {
        fee: {
          amount: 0,
          asset_id: fee_asset_id
        },
        issuer: issuer_id,
        order_id: order_id, // 订单ID
        bset: bset
      });
      return _WalletDb2.default.process_transaction(tr, null, true, [], confirm);
    }
  }, {
    key: 'locktoken_create',
    value: function locktoken_create(user_id, user_to, asset_id, amount, period, type, mode) {
      var fee_asset_id = arguments.length > 7 && arguments[7] !== undefined ? arguments[7] : '1.3.0';
      var confirm = arguments.length > 8 && arguments[8] !== undefined ? arguments[8] : false;

      var tr = new _es.TransactionBuilder();
      tr.add_type_operation('locktoken_create', {
        fee: {
          amount: 0,
          asset_id: fee_asset_id
        },
        issuer: user_id, //  借款人ID
        locked: {
          amount: amount,
          asset_id: asset_id
        },
        to: user_to, // 订单ID
        period: period,
        type: type,
        autolock: mode
      });
      return _WalletDb2.default.process_transaction(tr, null, true, [], confirm);
    }
  }, {
    key: 'locktoken_update',
    value: function locktoken_update(user_id, object_id, op_type, asset_id, amount, period, type, mode) {
      var fee_asset_id = arguments.length > 8 && arguments[8] !== undefined ? arguments[8] : '1.3.0';
      var confirm = arguments.length > 9 && arguments[9] !== undefined ? arguments[9] : false;

      var tr = new _es.TransactionBuilder();
      tr.add_type_operation('locktoken_update', {
        fee: {
          amount: 0,
          asset_id: fee_asset_id
        },
        issuer: user_id, //  借款人ID
        locktoken_id: object_id,
        op_type: op_type,
        locked: {
          amount: amount,
          asset_id: asset_id
        },
        to: '1.2.0', // 订单ID
        period: period,
        type: type,
        autolock: mode
      });
      return _WalletDb2.default.process_transaction(tr, null, true, [], confirm);
    }
  }, {
    key: 'locktoken_remove',
    value: function locktoken_remove(user_id, object_id) {
      var fee_asset_id = arguments.length > 2 && arguments[2] !== undefined ? arguments[2] : '1.3.0';
      var confirm = arguments.length > 3 && arguments[3] !== undefined ? arguments[3] : false;

      var tr = new _es.TransactionBuilder();
      tr.add_type_operation('locktoken_remove', {
        fee: {
          amount: 0,
          asset_id: fee_asset_id
        },
        issuer: user_id, //  借款人ID
        locktoken_id: object_id
      });
      return _WalletDb2.default.process_transaction(tr, null, true, [], confirm);
    }
    //  

  }, {
    key: 'asset_locktoken_operation',
    value: function asset_locktoken_operation(user_id, asset_id, asset_owner, op_type, sparam, chain_time) {
      var fee_asset_id = arguments.length > 6 && arguments[6] !== undefined ? arguments[6] : '1.3.0';
      var confirm = arguments.length > 7 && arguments[7] !== undefined ? arguments[7] : false;

      var date_obj = new Date(chain_time);
      var i_time = date_obj.getTime();
      var i_expiration_sec = 60 * 60 * 24 * 14 * 1000;
      var expiration_time = parseInt((i_time + i_expiration_sec) / 1000) - 1000;

      var tr = new _es.TransactionBuilder();

      if (user_id === asset_owner || op_type === 2) {
        tr.add_type_operation('asset_locktoken', {
          fee: {
            amount: 0,
            asset_id: fee_asset_id
          },
          issuer: user_id,
          asset_lock: asset_id,
          op_type: op_type,
          sParam: sparam
        });
        return _WalletDb2.default.process_transaction(tr, null, true, [], confirm);
      } else {
        var transfer_op = tr.get_type_operation('asset_locktoken', {
          fee: {
            amount: 0,
            asset_id: fee_asset_id
          },
          issuer: asset_owner,
          asset_lock: asset_id,
          op_type: op_type,
          sParam: sparam
        });
        return tr.update_head_block().then(function () {
          transfer_op.issuer = asset_owner;
          tr.add_type_operation('proposal_create', {
            proposed_ops: [{ op: transfer_op }],
            fee_paying_account: user_id
          });
          return _WalletDb2.default.process_transaction(tr, null, true, [], confirm);
        });
      }
    }
  }, {
    key: 'limit_order_create',
    value: function limit_order_create(seller, admin, amount_to_sell, min_to_receive, memo, fill_mode, expiration) {
      var fill_or_kill = arguments.length > 7 && arguments[7] !== undefined ? arguments[7] : false;
      var fee_asset_id = arguments.length > 8 && arguments[8] !== undefined ? arguments[8] : '1.3.0';
      var confirm = arguments.length > 9 && arguments[9] !== undefined ? arguments[9] : false;

      var tr = new _es.TransactionBuilder();

      tr.add_type_operation('limit_order_create', {
        fee: {
          amount: 0,
          asset_id: fee_asset_id
        },
        seller: seller,
        admin: admin,
        amount_to_sell: amount_to_sell,
        min_to_receive: min_to_receive,
        memo: memo, // 借款期限
        fill_mode: fill_mode, // 借款利息
        expiration: expiration, // 还款方式
        fill_or_kill: fill_or_kill
      });
      return _WalletDb2.default.process_transaction(tr, null, true, [], confirm);
    }
  }, {
    key: 'limit_order_cancel',
    value: function limit_order_cancel(seller, order) {
      var fee_asset_id = arguments.length > 2 && arguments[2] !== undefined ? arguments[2] : '1.3.0';
      var confirm = arguments.length > 3 && arguments[3] !== undefined ? arguments[3] : false;

      var tr = new _es.TransactionBuilder();
      tr.add_type_operation('limit_order_cancel', {
        fee: {
          amount: 0,
          asset_id: fee_asset_id
        },
        order: order,
        fee_paying_account: seller
      });
      return _WalletDb2.default.process_transaction(tr, null, true, [], confirm);
    }
  }, {
    key: 'vesting_balance_withdraw',
    value: function vesting_balance_withdraw(user_id, object_id, asset_id, amount) {
      var fee_asset_id = arguments.length > 4 && arguments[4] !== undefined ? arguments[4] : '1.3.0';
      var confirm = arguments.length > 5 && arguments[5] !== undefined ? arguments[5] : false;

      var tr = new _es.TransactionBuilder();
      tr.add_type_operation('vesting_balance_withdraw', {
        fee: {
          amount: 0,
          asset_id: fee_asset_id
        },
        vesting_balance: object_id,
        owner: user_id,
        amount: {
          amount: amount,
          asset_id: asset_id
        }
      });
      return _WalletDb2.default.process_transaction(tr, null, true, [], confirm);
    }

    // 更新用户信息

  }, {
    key: 'account_update',
    value: function account_update(account_id, memo) {
      var fee_asset_id = arguments.length > 2 && arguments[2] !== undefined ? arguments[2] : '1.3.0';
      var confirm = arguments.length > 3 && arguments[3] !== undefined ? arguments[3] : false;

      memo = memo ? new Buffer(memo, 'utf-8') : memo;
      return (0, _es.FetchChain)('getAccount', account_id, 5000).then(function (res) {
        var chain_memo_sender = res;
        var memo_from_privkey = void 0;
        var memo_from_public = void 0,
            memo_to_public = void 0;
        if (memo) {
          memo_from_public = chain_memo_sender.getIn(['options', 'memo_key']);
          if (/111111111111111111111/.test(memo_from_public) || /6FUsQ2hYRj1JSvabewWfUWTXyoDq6btmfLFjmXwby5GJgzEvT5/.test(memo_from_public)) {
            memo_from_public = null;
          }
          memo_to_public = memo_from_public;

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

        var active = chain_memo_sender.get('active');
        var owner = chain_memo_sender.get('owner');

        var active_key_auths = active.get('key_auths');
        var owner_key_auths = owner.get('key_auths');

        var active_keys = active_key_auths.map(function (a) {
          return a.get(0);
        });
        var owner_keys = owner_key_auths.map(function (a) {
          return a.get(0);
        });

        var acitve_pub_key = active_keys.get(0);
        var owner_pub_key = owner_keys.get(0);

        var tr = new _es.TransactionBuilder();
        tr.add_type_operation('account_update', {
          fee: {
            amount: 0,
            asset_id: fee_asset_id
          },
          account: account_id,
          // owner: {
          //     weight_threshold: 1,
          //     account_auths: [],
          //     key_auths: [[owner_pub_key, 1]],
          //     address_auths: []
          // },
          // active: {
          //     weight_threshold: 1,
          //     account_auths: [],
          //     key_auths: [[acitve_pub_key, 1]],
          //     address_auths: []
          // },
          // new_options: {
          //     memo_key: memo_from_public,
          //     voting_account: "1.2.5",
          //     num_witness: 0,
          //     num_committee: 0,
          //     votes: []
          // },
          memo: memo_object // 订单ID
        });
        return _WalletDb2.default.process_transaction(tr, null, true, [], confirm);
      });
    }

    // 提币

  }, {
    key: 'gateway_withdraw',
    value: function gateway_withdraw( // OBJECT: { ... }
    from_account, to_account, amount, // 用户输入的钱
    asset) {
      var fee_asset_id = arguments.length > 4 && arguments[4] !== undefined ? arguments[4] : '1.3.0';
      var confirm = arguments.length > 5 && arguments[5] !== undefined ? arguments[5] : false;

      return Promise.all([
      // FetchChain("getAccount", from_account),
      // FetchChain("getAccount", to_account),
      // FetchChain("getAccount", memo_sender),
      // FetchChain("getAccount", propose_account),
      // FetchChain("getAsset", asset),
      // FetchChain("getAsset", fee_asset_id),
      _zosjsWs.Apis.instance().db_api().exec('get_full_accounts', [[from_account], false]), _zosjsWs.Apis.instance().db_api().exec('get_full_accounts', [[to_account], false]), _zosjsWs.Apis.instance().db_api().exec('get_objects', [[asset]]), _zosjsWs.Apis.instance().db_api().exec('get_objects', [[fee_asset_id]])]).then(function (res) {
        var _res4 = _slicedToArray(res, 4),
            chain_from = _res4[0],
            chain_to = _res4[1],
            chain_asset = _res4[2],
            chain_fee_asset = _res4[3];

        if (chain_from.length === 0 || chain_to.length === 0) {
          return Promise.reject('from_account or to_account is no exists');
        }

        var chain_from_account = chain_from[0][1].account;
        var chain_to_account = chain_to[0][1].account;

        // Allow user to choose asset with which to pay fees #356
        var fee_asset = chain_fee_asset[0]; // chain_fee_asset.toJS();

        // Default to CORE in case of faulty core_exchange_rate
        if (fee_asset.options.core_exchange_rate.base.asset_id === '1.3.0' && fee_asset.options.core_exchange_rate.quote.asset_id === '1.3.0') {
          fee_asset_id = '1.3.0';
        }

        amount = amount * Math.pow(10, chain_asset[0].precision);
        amount = amount.toFixed(0);

        var tr = new _es.TransactionBuilder();
        var transfer_op = tr.get_type_operation('gateway_withdraw', {
          fee: {
            amount: 0,
            asset_id: fee_asset_id
          },
          from: chain_from_account.id, // chain_from.get("id"),
          to: chain_to_account.id, // chain_to.get("id"),
          // amount: { amount, asset_id: chain_asset.get("id") },
          withdraw: { amount: amount, asset_id: chain_asset[0].id }
        });
        return tr.update_head_block().then(function () {
          tr.add_operation(transfer_op);
          return _WalletDb2.default.process_transaction(tr, null, // signer_private_keys,
          true, [], confirm);
        });
      });
    }

    // 用户增加优惠券

  }, {
    key: 'account_coupon',
    value: function account_coupon(issuer_id) {
      var fee_asset_id = arguments.length > 1 && arguments[1] !== undefined ? arguments[1] : '1.3.0';
      var confirm = arguments.length > 2 && arguments[2] !== undefined ? arguments[2] : false;

      var tr = new _es.TransactionBuilder();

      tr.add_type_operation('account_coupon', {
        fee: {
          amount: 0,
          asset_id: fee_asset_id
        },
        issuer: issuer_id
      });
      return _WalletDb2.default.process_transaction(tr, null, true, [], confirm);
    }

    // 用户增加优惠券

  }, {
    key: 'add_custom',
    value: function add_custom(account_id, required_auths, id, data) {
      var fee_asset_id = arguments.length > 4 && arguments[4] !== undefined ? arguments[4] : '1.3.0';
      var confirm = arguments.length > 5 && arguments[5] !== undefined ? arguments[5] : false;

      var tr = new _es.TransactionBuilder();

      tr.add_type_operation('custom', {
        fee: {
          amount: 0,
          asset_id: fee_asset_id
        },
        payer: account_id,
        required_auths: required_auths,
        id: id,
        data: data
      });
      return _WalletDb2.default.process_transaction(tr, null, true, [], confirm);
    }

    // 更新用户信息

  }, {
    key: 'update_account',
    value: function update_account(updateObject, trex) {
      var tr = new _es.TransactionBuilder();
      tr.add_type_operation('account_update', updateObject);
      if (trex && trex.operations.length > 0) {
        tr.operations = tr.operations.concat(trex.operations);
      }
      return _WalletDb2.default.process_transaction(tr, null, true, [], confirm);
    }

    // 提交提案

  }, {
    key: 'proposal_update',
    value: function proposal_update(proposal, neededKeys) {
      var confirm = arguments.length > 2 && arguments[2] !== undefined ? arguments[2] : false;

      var tr = new _es.TransactionBuilder();

      tr.add_type_operation('proposal_update', proposal);
      return _WalletDb2.default.process_transaction(tr, null, true, neededKeys, confirm);
    }

    // 提交新增借贷参数

  }, {
    key: 'bitlender_option_create',
    value: function bitlender_option_create(issuer, asset_id, sproduct, options, fee_asset_id, chain_time) {
      var confirm = arguments.length > 6 && arguments[6] !== undefined ? arguments[6] : false;

      var date_obj = new Date(chain_time);
      var i_time = date_obj.getTime();
      var i_expiration_sec = 60 * 60 * 24 * 14 * 1000;
      var expiration_time = parseInt((i_time + i_expiration_sec) / 1000) - 1000;

      var tr = new _es.TransactionBuilder();

      var transfer_op = tr.get_type_operation('bitlender_option_create', {
        fee: {
          amount: 0,
          asset_id: fee_asset_id
        },
        issuer: issuer,
        asset_id: asset_id,
        sproduct: sproduct,
        options: options,
        fee_mode: 0
      });
      return tr.update_head_block().then(function () {
        tr.add_type_operation('proposal_create', {
          proposed_ops: [{ op: transfer_op }],
          fee_paying_account: issuer,
          expiration_time: expiration_time
        });
        return _WalletDb2.default.process_transaction(tr, null, true, [], confirm);
      });
    }

    // 提交修改借贷参数

  }, {
    key: 'bitlender_option_update',
    value: function bitlender_option_update(issuer, author, option_id, options, fee_asset_id, chain_time) {
      var confirm = arguments.length > 6 && arguments[6] !== undefined ? arguments[6] : false;

      var date_obj = new Date(chain_time);
      var i_time = date_obj.getTime();
      var i_expiration_sec = 60 * 60 * 24 * 14 * 1000;
      var expiration_time = parseInt((i_time + i_expiration_sec) / 1000) - 1000;

      var tr = new _es.TransactionBuilder();

      var transfer_op = tr.get_type_operation('bitlender_option_update', {
        fee: {
          amount: 0,
          asset_id: fee_asset_id
        },
        issuer: issuer,
        author: author,
        option_id: option_id,
        options: options
      });
      return tr.update_head_block().then(function () {
        tr.add_type_operation('proposal_create', {
          proposed_ops: [{ op: transfer_op }],
          fee_paying_account: issuer
        });
        return _WalletDb2.default.process_transaction(tr, null, true, [], confirm);
      });
    }

    // 提交修改利率

  }, {
    key: 'bitlender_rate_update',
    value: function bitlender_rate_update(option_id, issuer, interest_rate_add, interest_rate_remove, fee_asset_id) {
      var confirm = arguments.length > 5 && arguments[5] !== undefined ? arguments[5] : false;

      var tr = new _es.TransactionBuilder();

      tr.add_type_operation('bitlender_rate_update', {
        fee: {
          amount: 0,
          asset_id: fee_asset_id
        },
        option_id: option_id,
        issuer: issuer,
        interest_rate_add: interest_rate_add,
        interest_rate_remove: interest_rate_remove
      });
      return _WalletDb2.default.process_transaction(tr, null, true, [], confirm);
    }

    // 处理不良资产

  }, {
    key: 'bitlender_recycle',
    value: function bitlender_recycle(issuer, order_id, asset_pay, memo, fee_asset_id) {
      var confirm = arguments.length > 5 && arguments[5] !== undefined ? arguments[5] : true;

      var tr = new _es.TransactionBuilder();

      tr.add_type_operation('bitlender_recycle', {
        fee: {
          amount: 0,
          asset_id: fee_asset_id
        },
        issuer: issuer,
        order_id: order_id,
        asset_pay: asset_pay,
        memo: memo
      });
      return _WalletDb2.default.process_transaction(tr, null, true, [], confirm);
    }

    // 提交修改喂价人

  }, {
    key: 'bitlender_update_feed_producers_operation',
    value: function bitlender_update_feed_producers_operation(issuer, option_id, author, new_feed_option, fee_asset_id) {
      var confirm = arguments.length > 5 && arguments[5] !== undefined ? arguments[5] : false;

      var tr = new _es.TransactionBuilder();

      var transfer_op = tr.get_type_operation('bitlender_update_feed_producers_operation', {
        fee: {
          amount: 0,
          asset_id: fee_asset_id
        },
        issuer: issuer,
        option_id: option_id,
        author: author,
        new_feed_option: new_feed_option
      });
      return tr.update_head_block().then(function () {
        tr.add_type_operation('proposal_create', {
          proposed_ops: [{ op: transfer_op }],
          fee_paying_account: issuer
        });
        return _WalletDb2.default.process_transaction(tr, null, true, [], confirm);
      });
    }

    // 创建筹资参数

  }, {
    key: 'finance_option_create',
    value: function finance_option_create(issuer, issue_asset_id, issue_asset_owner, buy_asset_id, fundraise_owner, options, url, fee_asset_id) {
      var confirm = arguments.length > 8 && arguments[8] !== undefined ? arguments[8] : false;

      var tr = new _es.TransactionBuilder();

      var transfer_op = tr.get_type_operation('finance_option_create', {
        fee: {
          amount: 0,
          asset_id: fee_asset_id
        },
        issuer: issuer,
        issue_asset_id: issue_asset_id,
        issue_asset_owner: issue_asset_owner,
        buy_asset_id: buy_asset_id,
        fundraise_owner: fundraise_owner,
        options: options,
        url: url
      });
      return tr.update_head_block().then(function () {
        if (issuer !== issue_asset_owner) {
          tr.add_type_operation('proposal_create', {
            proposed_ops: [{ op: transfer_op }],
            fee_paying_account: issuer
          });
        } else {
          tr.add_operation(transfer_op);
        }

        return _WalletDb2.default.process_transaction(tr, null, true, [], confirm);
      });
    }

    // 修改筹资参数

  }, {
    key: 'finance_option_update',
    value: function finance_option_update(issuer, fundraise_id, issue_asset_owner, period, options, url, op_type, fee_asset_id) {
      var confirm = arguments.length > 8 && arguments[8] !== undefined ? arguments[8] : false;

      var tr = new _es.TransactionBuilder();

      var transfer_op = tr.get_type_operation('finance_option_update', {
        fee: {
          amount: 0,
          asset_id: fee_asset_id
        },
        issuer: issuer,
        fundraise_id: fundraise_id,
        issue_asset_owner: issue_asset_owner,
        period: period,
        options: options,
        url: url,
        op_type: op_type
      });
      return tr.update_head_block().then(function () {
        if (issuer !== issue_asset_owner) {
          tr.add_type_operation('proposal_create', {
            proposed_ops: [{ op: transfer_op }],
            fee_paying_account: issuer
          });
        } else {
          tr.add_operation(transfer_op);
        }
        return _WalletDb2.default.process_transaction(tr, null, true, [], confirm);
      });
    }

    // 筹资

  }, {
    key: 'buy_finance_create',
    value: function buy_finance_create(issuer, fundraise_id, amount, bimmediately, fee_asset_id) {
      var confirm = arguments.length > 5 && arguments[5] !== undefined ? arguments[5] : false;

      var tr = new _es.TransactionBuilder();

      tr.add_type_operation('buy_finance_create', {
        fee: {
          amount: 0,
          asset_id: fee_asset_id
        },
        issuer: issuer,
        fundraise_id: fundraise_id,
        issue_asset_owner: issue_asset_owner,
        amount: amount,
        bimmediately: bimmediately
      });
      return _WalletDb2.default.process_transaction(tr, null, true, [], confirm);
    }

    // 筹资有效

  }, {
    key: 'buy_finance_enable',
    value: function buy_finance_enable(issuer, fundraise_id, benable, fee_asset_id) {
      var confirm = arguments.length > 4 && arguments[4] !== undefined ? arguments[4] : false;

      var tr = new _es.TransactionBuilder();

      tr.add_type_operation('buy_finance_enable', {
        fee: {
          amount: 0,
          asset_id: fee_asset_id
        },
        issuer: issuer,
        fundraise_id: fundraise_id,
        benable: benable
      });
      return _WalletDb2.default.process_transaction(tr, null, true, [], confirm);
    }

    // 删除众筹

  }, {
    key: 'issue_fundraise_remove',
    value: function issue_fundraise_remove(issuer, fundraise_id, issue_asset_owner, fee_asset_id) {
      var confirm = arguments.length > 4 && arguments[4] !== undefined ? arguments[4] : false;

      var tr = new _es.TransactionBuilder();

      var transfer_op = tr.get_type_operation('issue_fundraise_remove', {
        fee: {
          amount: 0,
          asset_id: fee_asset_id
        },
        issuer: issuer,
        fundraise_id: fundraise_id,
        issue_asset_owner: issue_asset_owner
      });
      return tr.update_head_block().then(function () {
        if (issuer !== issue_asset_owner) {
          tr.add_type_operation('proposal_create', {
            proposed_ops: [{ op: transfer_op }],
            fee_paying_account: issuer
          });
        } else {
          tr.add_operation(transfer_op);
        }
        return _WalletDb2.default.process_transaction(tr, null, true, [], confirm);
      });
    }

    // 众筹喂价

  }, {
    key: 'issue_fundraise_publish_feed',
    value: function issue_fundraise_publish_feed(issuer, fundraise_id, period, feed_publiser, fundraise_price, fee_asset_id) {
      var confirm = arguments.length > 6 && arguments[6] !== undefined ? arguments[6] : false;

      var tr = new _es.TransactionBuilder();

      tr.add_type_operation('issue_fundraise_publish_feed', {
        fee: {
          amount: 0,
          asset_id: fee_asset_id
        },
        issuer: issuer,
        fundraise_id: fundraise_id,
        period: period,
        feed_publiser: feed_publiser,
        fundraise_price: fundraise_price
      });
      return _WalletDb2.default.process_transaction(tr, null, true, [], confirm);
    }

    // 众筹喂价

  }, {
    key: 'carrier_update',
    value: function carrier_update(carrier, carrier_account, new_config, new_memo, new_url, need_auth, fee_asset_id) {
      var confirm = arguments.length > 7 && arguments[7] !== undefined ? arguments[7] : false;

      var tr = new _es.TransactionBuilder();

      var transfer_op = tr.get_type_operation('carrier_update', {
        fee: {
          amount: 0,
          asset_id: fee_asset_id
        },
        carrier: carrier,
        carrier_account: carrier_account,
        need_auth: need_auth,
        new_url: new_url,
        new_memo: new_memo,
        new_config: new_config
      });
      return tr.update_head_block().then(function () {
        if (new_url) {
          tr.add_type_operation('proposal_create', {
            proposed_ops: [{ op: transfer_op }],
            fee_paying_account: carrier_account
          });
        } else {
          tr.add_operation(transfer_op);
        }
        return _WalletDb2.default.process_transaction(tr, null, true, [], confirm);
      });
    }

    // 提config

  }, {
    key: 'account_config_operation',
    value: function account_config_operation(issuer, config, op_type, fee_asset_id) {
      var confirm = arguments.length > 4 && arguments[4] !== undefined ? arguments[4] : false;

      var tr = new _es.TransactionBuilder();

      tr.add_type_operation('account_config_operation', {
        fee: {
          amount: 0,
          asset_id: fee_asset_id
        },
        issuer: issuer,
        config: config,
        op_type: op_type
      });
      return _WalletDb2.default.process_transaction(tr, null, true, [], confirm);
    }
  }, {
    key: 'account_authenticate',
    value: function account_authenticate(issuer, op_type, auth_data, fee_asset_id) {
      var confirm = arguments.length > 4 && arguments[4] !== undefined ? arguments[4] : false;

      var tr = new _es.TransactionBuilder();

      tr.add_type_operation('account_authenticate', {
        fee: {
          amount: 0,
          asset_id: fee_asset_id
        },
        issuer: issuer,
        op_type: op_type,
        auth_data: auth_data
      });
      return _WalletDb2.default.process_transaction(tr, null, true, [], confirm);
    }
  }]);

  return ApplicationApi;
}();

exports.default = ApplicationApi;