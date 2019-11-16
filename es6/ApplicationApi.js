import WalletDb from './WalletDb.js'
import {Aes, ChainValidation, TransactionBuilder, TransactionHelper, ops, FetchChain, ChainStore} from 'zosjs/es'
import {Apis} from 'zosjs-ws'
import PrivateKeyStore from './PrivateKeyStore.js'
class ApplicationApi {
  create_account (
    owner_pubkey,
    active_pubkey,
    memmo_pubkey,
    author_pubkey,
    new_account_name,
    registrar,
    referrer,
    referrer_percent,
    broadcast = false
  ) {
    ChainValidation.required(registrar, 'registrar_id')
    ChainValidation.required(referrer, 'referrer_id')

    return new Promise((resolve, reject) => {
      return Promise.all([
        FetchChain('getAccount', registrar),
        FetchChain('getAccount', referrer)
      ]).then(res => {
        let [chain_registrar, chain_referrer] = res

        let tr = new TransactionBuilder()
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
        })

        console.log('ApplicationApi.create_account: ', tr, broadcast)
        return WalletDb.process_transaction(
          tr,
          null, // signer_private_keys,
          broadcast
        )
          .then(res => {
            console.log('process_transaction then', res)
            resolve()
          })
          .catch(err => {
            console.log('process_transaction catch', err)
            reject(err)
          })
      })
    })
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
  is_enc_memo (
    from_account,
    to_account) {
    return Promise.all([
      Apis.instance().db_api().exec('get_full_accounts', [[from_account], false]),
      Apis.instance().db_api().exec('get_full_accounts', [[to_account], false])
    ]).then((res) => {
      let [
        chain_from, chain_to
      ] = res
      let enc_message = true
      try {
        if (!chain_from || !chain_to) return true

        if (!chain_from[0] || !chain_to[0]) return true

        let chain_from_account = chain_from[0][1].account
        let chain_to_account = chain_to[0][1].account

        let memo_from_public = null
        let memo_to_public = null
 
        memo_from_public = chain_from_account.options.memo_key// chain_memo_sender.getIn(["options","memo_key"]);
        // The 1s are base58 for all zeros (null)
        // 明文标志
        if (/111111111111111111111/.test(memo_from_public) || /6FUsQ2hYRj1JSvabewWfUWTXyoDq6btmfLFjmXwby5GJgzEvT5/.test(memo_from_public)) {
          enc_message = false
        }
        memo_to_public = chain_to_account.options.memo_key// chain_to.getIn(["options","memo_key"])
        // 明文标志
        if (/111111111111111111111/.test(memo_to_public) || /6FUsQ2hYRj1JSvabewWfUWTXyoDq6btmfLFjmXwby5GJgzEvT5/.test(memo_to_public)) {
          enc_message = false
        }
      } catch (err) {
        console.log(err)
      }
      return enc_message
    })
  }
  transfer ( // OBJECT: { ... }
    from_account,
    to_account,
    amount, // 用户输入的钱*小数的精度，从查询余额里面拿到
    asset, // 资源ID，比如"1.3.0"，从查询余额里面拿到
    memo,
    broadcast = true,
    encrypt_memo = true,
    optional_nonce = null,
    propose_account = null,
    fee_asset_id = '1.3.0',
    confirm = false
  ) {
    let memo_sender = propose_account || from_account

    memo = memo ? new Buffer(memo, 'utf-8') : memo

    return Promise.all([
      Apis.instance().db_api().exec('get_full_accounts', [[from_account], false]),
      Apis.instance().db_api().exec('get_full_accounts', [[to_account], false]),
      Apis.instance().db_api().exec('get_full_accounts', [[memo_sender], false]),
      Apis.instance().db_api().exec('get_objects', [[asset]]),
      Apis.instance().db_api().exec('get_objects', [[fee_asset_id]])

    ]).then((res) => {
      let [
        chain_from, chain_to, chain_memo_sender,
        chain_asset, chain_fee_asset
      ] = res

      let chain_from_account = chain_from[0][1].account
      let chain_to_account = chain_to[0][1].account
      let chain_memo_sender_account = chain_memo_sender[0][1].account
      let enc_message = true

      let memo_from_public = null
      let memo_to_public = null

      if (memo && encrypt_memo) {
        memo_from_public = chain_memo_sender_account.options.memo_key// chain_memo_sender.getIn(["options","memo_key"]);
        // The 1s are base58 for all zeros (null)
        // 明文标志
        if (/111111111111111111111/.test(memo_from_public) || /6FUsQ2hYRj1JSvabewWfUWTXyoDq6btmfLFjmXwby5GJgzEvT5/.test(memo_from_public)) {
          enc_message = false
        }
        memo_to_public = chain_to_account.options.memo_key// chain_to.getIn(["options","memo_key"])
        // 明文标志
        if (/111111111111111111111/.test(memo_to_public) || /6FUsQ2hYRj1JSvabewWfUWTXyoDq6btmfLFjmXwby5GJgzEvT5/.test(memo_to_public)) {
          enc_message = false
        }
      } else {
        enc_message = false
      } 

      let propose_acount_id = null
      let memo_from_privkey = null

      if (enc_message && memo && encrypt_memo) {
        memo_from_privkey = WalletDb.getPrivateKey(memo_from_public)
        if (!memo_from_privkey) {
          throw new Error('Missing private memo key for sender: ' + memo_sender)
        }
        if (optional_nonce !== null && optional_nonce === '34359738367') {
          throw new Error('err nonce: ' + optional_nonce)
        }
      }

      let memo_object
      if (memo && encrypt_memo) {
        if (enc_message) {
          let nonce = optional_nonce == null
            ? TransactionHelper.unique_nonce_uint64()
            : optional_nonce

          memo_object = {
            from: memo_from_public,
            to: memo_to_public,
            nonce,
            message: (encrypt_memo)
              ? Aes.encrypt_with_checksum(
                memo_from_privkey,
                memo_to_public,
                nonce,
                memo
              )
              : Buffer.isBuffer(memo) ? memo.toString('utf-8') : memo
          }
        } else {
          // 明文标志
          let nonce = '34359738367'
          let sendtext = PrivateKeyStore.stringToByte(memo)
          memo_object = {
            from: memo_from_public,
            to: memo_to_public,
            nonce,
            message: sendtext
          }
        }
      }
      console.log(memo_object)
      // Allow user to choose asset with which to pay fees #356
      let fee_asset = chain_fee_asset[0]// chain_fee_asset.toJS();

      // Default to CORE in case of faulty core_exchange_rate
      if (fee_asset.options.core_exchange_rate.base.asset_id === '1.3.0' &&
                fee_asset.options.core_exchange_rate.quote.asset_id === '1.3.0') {
        fee_asset_id = '1.3.0'
      }

      let tr = new TransactionBuilder()
      let transfer_op = tr.get_type_operation('transfer', {
        fee: {
          amount: 0,
          asset_id: fee_asset_id
        },
        from: chain_from_account.id, // chain_from.get("id"),
        to: chain_to_account.id, // chain_to.get("id"),
        // amount: { amount, asset_id: chain_asset.get("id") },
        amount: { amount, asset_id: chain_asset[0].id },
        memo: memo_object
      })
      return tr.update_head_block().then(() => {
        if (propose_account) {
          tr.add_type_operation('proposal_create', {
            proposed_ops: [{ op: transfer_op }],
            fee_paying_account: propose_acount_id
          })
        } else {
          tr.add_operation(transfer_op)
        }
        return WalletDb.process_transaction(
          tr,
          null, // signer_private_keys,
          broadcast,
          [],
          confirm
        )
      })
    })
  }

  bitlender_lend_order ( // OBJECT: { ... }
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
    collateral_rate, // 保证金倍数（滚动条选的几就是几，这边会再乘以1000）
    fee_asset_id = '1.3.0', // 手续费资产ID
    confirm = false
  ) {
    let tr = new TransactionBuilder()

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
    })
    return WalletDb.process_transaction(tr, null, true, [], confirm)
  }

  bitlender_add_collateral (
    loaner_id, // 借款人ID
    order_id, //
    collateralize_ammount, // 抵押数量
    collateralize_asset_id, // 抵押资产ID
    collateralize_asset_precision, // 抵押资产精度
    collateral_rate, // 保证金倍数（滚动条选的几就是几，这边会再乘以1000）
    fee_asset_id = '1.3.0', // 手续费资产ID
    confirm = false
  ) {
    let tr = new TransactionBuilder()

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
    })
    return WalletDb.process_transaction(tr, null, true, [], confirm)
  }

  // 投资
  bitlender_invest (
    bidder_id, // 投资人ID
    loan_id, // 借款人ID
    carrier_id, // 运营商ID
    order_id, //
    invest_ammount, // 投资数量
    invest_asset_id, // 投资资产ID
    invest_asset_precision, // 投资资产精度
    fee_asset_id = '1.3.0', // 手续费资产ID
    confirm = false
  ) {
    let tr = new TransactionBuilder()

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
    })
    return WalletDb.process_transaction(tr, null, true, [], confirm)
  }

  // 还息
  bitlender_repay_interest (
    issuer_id, // 发起人ID
    order_id, //
    repay_period, // 第几期,整数
    fee_asset_id = '1.3.0', // 手续费资产ID
    confirm = false
  ) {
    let tr = new TransactionBuilder()

    tr.add_type_operation('bitlender_repay_interest', {
      fee: {
        amount: 0,
        asset_id: fee_asset_id
      },
      issuer: issuer_id,
      order_id: order_id, // 订单ID
      repay_period: repay_period // 第几期,整数
    })
    return WalletDb.process_transaction(tr, null, true, [], confirm)
  }

  // 逾期还息
  bitlender_overdue_interest (
    issuer_id, // 发起人ID
    order_id, //
    repay_period, // 第几期,整数
    fee_asset_id = '1.3.0', // 手续费资产ID
    confirm = false
  ) {
    let tr = new TransactionBuilder()

    tr.add_type_operation('bitlender_overdue_interest', {
      fee: {
        amount: 0,
        asset_id: fee_asset_id
      },
      issuer: issuer_id,
      order_id: order_id, // 订单ID
      repay_period: repay_period // 第几期,整数
    })
    return WalletDb.process_transaction(tr, null, true, [], confirm)
  }

  // 还本
  bitlender_repay_principal (
    issuer_id, // 发起人ID
    order_id, //
    fee_asset_id = '1.3.0', // 手续费资产ID
    confirm = false
  ) {
    let tr = new TransactionBuilder()

    tr.add_type_operation('bitlender_repay_principal', {
      fee: {
        amount: 0,
        asset_id: fee_asset_id
      },
      issuer: issuer_id,
      order_id: order_id // 订单ID
    })
    return WalletDb.process_transaction(tr, null, true, [], confirm)
  }

  // 逾期还本
  bitlender_overdue_repay (
    issuer_id, // 发起人ID
    order_id, //
    fee_asset_id = '1.3.0', // 手续费资产ID
    confirm = false
  ) {
    let tr = new TransactionBuilder()

    tr.add_type_operation('bitlender_overdue_repay', {
      fee: {
        amount: 0,
        asset_id: fee_asset_id
      },
      issuer: issuer_id,
      order_id: order_id // 订单ID
    })
    return WalletDb.process_transaction(tr, null, true, [], confirm)
  }

  // 提前还本
  bitlender_prepayment (
    issuer_id, // 发起人ID
    order_id, //
    fee_asset_id = '1.3.0', // 手续费资产ID
    confirm = false
  ) {
    let tr = new TransactionBuilder()

    tr.add_type_operation('bitlender_prepayment', {
      fee: {
        amount: 0,
        asset_id: fee_asset_id
      },
      issuer: issuer_id,
      order_id: order_id // 订单ID
    })
    return WalletDb.process_transaction(tr, null, true, [], confirm)
  }

  // 取消借款订单
  bitlender_remove_operation (
    issuer_id, // 发起人ID
    order_id, //
    fee_asset_id = '1.3.0', // 手续费资产ID
    confirm = false
  ) {
    let tr = new TransactionBuilder()

    tr.add_type_operation('bitlender_remove_operation', {
      fee: {
        amount: 0,
        asset_id: fee_asset_id
      },
      issuer: issuer_id,
      order_id: order_id // 订单ID
    })
    return WalletDb.process_transaction(tr, null, true, [], confirm)
  }

  // 自动还款账户
  bitlender_setautorepayer (
    issuer_id, // 发起人ID
    order_id,
    bset, //
    fee_asset_id = '1.3.0', // 手续费资产ID
    confirm = false
  ) {
    let tr = new TransactionBuilder()

    tr.add_type_operation('bitlender_setautorepayer', {
      fee: {
        amount: 0,
        asset_id: fee_asset_id
      },
      issuer: issuer_id,
      order_id: order_id, // 订单ID
      bset
    })
    return WalletDb.process_transaction(tr, null, true, [], confirm)
  }

  locktoken_create (
    user_id,
    user_to,
    asset_id,
    amount,
    period,
    type,
    mode,
    fee_asset_id = '1.3.0',
    confirm = false
  ) {
    let tr = new TransactionBuilder()
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
    })
    return WalletDb.process_transaction(tr, null, true, [], confirm)
  }
  locktoken_update (
    user_id,
    object_id,
    op_type,
    asset_id,
    amount,
    period,
    type,
    mode,
    fee_asset_id = '1.3.0',
    confirm = false
  ) {
    let tr = new TransactionBuilder()
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
    })
    return WalletDb.process_transaction(tr, null, true, [], confirm)
  }
  locktoken_remove (
    user_id,
    object_id,
    fee_asset_id = '1.3.0',
    confirm = false
  ) {
    let tr = new TransactionBuilder()
    tr.add_type_operation('locktoken_remove', {
      fee: {
        amount: 0,
        asset_id: fee_asset_id
      },
      issuer: user_id, //  借款人ID
      locktoken_id: object_id
    })
    return WalletDb.process_transaction(tr, null, true, [], confirm)
  }
  //  
  asset_locktoken_operation (user_id, asset_id, asset_owner, op_type, sparam, chain_time, fee_asset_id = '1.3.0', confirm = false) {
    let date_obj = new Date(chain_time)
    let i_time = date_obj.getTime()
    let i_expiration_sec = 60 * 60 * 24 * 14 * 1000
    let expiration_time = parseInt((i_time + i_expiration_sec) / 1000) - 1000

    let tr = new TransactionBuilder()

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
      })
      return WalletDb.process_transaction(tr, null, true, [], confirm)
    } else {
      let transfer_op = tr.get_type_operation('asset_locktoken', {
        fee: {
          amount: 0,
          asset_id: fee_asset_id
        },
        issuer: asset_owner,
        asset_lock: asset_id,
        op_type: op_type,
        sParam: sparam
      })  
      return tr.update_head_block().then(() => {
        transfer_op.issuer = asset_owner
        tr.add_type_operation('proposal_create', {
          proposed_ops: [{op: transfer_op}],
          fee_paying_account: user_id
        })
        return WalletDb.process_transaction(tr, null, true, [], confirm)
      })
    }
  }
  limit_order_create (
    seller,
    admin,
    amount_to_sell,
    min_to_receive,
    memo,
    fill_mode,
    expiration,
    fill_or_kill = false,
    fee_asset_id = '1.3.0', // 手续费资产ID
    confirm = false
  ) {
    let tr = new TransactionBuilder()

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
    })
    return WalletDb.process_transaction(tr, null, true, [], confirm)
  }
  limit_order_cancel (
    seller,
    order,
    fee_asset_id = '1.3.0', // 手续费资产ID
    confirm = false
  ) {
    let tr = new TransactionBuilder()
    tr.add_type_operation('limit_order_cancel', {
      fee: {
        amount: 0,
        asset_id: fee_asset_id
      },
      order: order,
      fee_paying_account: seller
    })
    return WalletDb.process_transaction(tr, null, true, [], confirm)
  }
  
  vesting_balance_withdraw (
    user_id,
    object_id,
    asset_id,
    amount,
    fee_asset_id = '1.3.0',
    confirm = false
  ) {
    let tr = new TransactionBuilder()
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
    })
    return WalletDb.process_transaction(tr, null, true, [], confirm)
  }

  // 更新用户信息
  account_update (
    account_id,
    memo,
    fee_asset_id = '1.3.0', // 手续费资产ID
    confirm = false
  ) {
    memo = memo ? new Buffer(memo, 'utf-8') : memo
    return FetchChain('getAccount', account_id, 5000).then(res => {
      let chain_memo_sender = res
      let memo_from_privkey
      let memo_from_public, memo_to_public
      if (memo) {
        memo_from_public = chain_memo_sender.getIn(['options', 'memo_key'])
        if (/111111111111111111111/.test(memo_from_public) || /6FUsQ2hYRj1JSvabewWfUWTXyoDq6btmfLFjmXwby5GJgzEvT5/.test(memo_from_public)) {
          memo_from_public = null
        }
        memo_to_public = memo_from_public

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

      let active = chain_memo_sender.get('active')
      let owner = chain_memo_sender.get('owner')

      let active_key_auths = active.get('key_auths')
      let owner_key_auths = owner.get('key_auths')

      let active_keys = active_key_auths.map(a => a.get(0))
      let owner_keys = owner_key_auths.map(a => a.get(0))

      let acitve_pub_key = active_keys.get(0)
      let owner_pub_key = owner_keys.get(0)

      let tr = new TransactionBuilder()
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
      })
      return WalletDb.process_transaction(tr, null, true, [], confirm)
    })
  }

  // 提币
  gateway_withdraw ( // OBJECT: { ... }
    from_account,
    to_account,
    amount, // 用户输入的钱
    asset, // 资源ID，比如"1.3.0"，从查询余额里面拿到
    fee_asset_id = '1.3.0',
    confirm = false
  ) {
    return Promise.all([
      // FetchChain("getAccount", from_account),
      // FetchChain("getAccount", to_account),
      // FetchChain("getAccount", memo_sender),
      // FetchChain("getAccount", propose_account),
      // FetchChain("getAsset", asset),
      // FetchChain("getAsset", fee_asset_id),
      Apis.instance().db_api().exec('get_full_accounts', [[from_account], false]),
      Apis.instance().db_api().exec('get_full_accounts', [[to_account], false]),
      Apis.instance().db_api().exec('get_objects', [[asset]]),
      Apis.instance().db_api().exec('get_objects', [[fee_asset_id]])

    ]).then((res) => {
      let [
        chain_from, chain_to,
        chain_asset, chain_fee_asset
      ] = res
      if (chain_from.length === 0 || chain_to.length === 0) {
        return Promise.reject('from_account or to_account is no exists')
      }

      let chain_from_account = chain_from[0][1].account
      let chain_to_account = chain_to[0][1].account

      // Allow user to choose asset with which to pay fees #356
      let fee_asset = chain_fee_asset[0]// chain_fee_asset.toJS();

      // Default to CORE in case of faulty core_exchange_rate
      if (fee_asset.options.core_exchange_rate.base.asset_id === '1.3.0' &&
                fee_asset.options.core_exchange_rate.quote.asset_id === '1.3.0') {
        fee_asset_id = '1.3.0'
      }

      amount = amount * Math.pow(10, chain_asset[0].precision)
      amount = amount.toFixed(0)

      let tr = new TransactionBuilder()
      let transfer_op = tr.get_type_operation('gateway_withdraw', {
        fee: {
          amount: 0,
          asset_id: fee_asset_id
        },
        from: chain_from_account.id, // chain_from.get("id"),
        to: chain_to_account.id, // chain_to.get("id"),
        // amount: { amount, asset_id: chain_asset.get("id") },
        withdraw: { amount, asset_id: chain_asset[0].id }
      })
      return tr.update_head_block().then(() => {
        tr.add_operation(transfer_op)
        return WalletDb.process_transaction(
          tr,
          null, // signer_private_keys,
          true,
          [],
          confirm
        )
      })
    })
  }

  // 用户增加优惠券
  account_coupon (
    issuer_id, // 发起人ID
    fee_asset_id = '1.3.0', // 手续费资产ID
    confirm = false
  ) {
    let tr = new TransactionBuilder()

    tr.add_type_operation('account_coupon', {
      fee: {
        amount: 0,
        asset_id: fee_asset_id
      },
      issuer: issuer_id
    })
    return WalletDb.process_transaction(tr, null, true, [], confirm)
  }

    // 用户增加优惠券
    add_custom (
      account_id,
      required_auths,
      id,      
      data,
      fee_asset_id = '1.3.0', // 手续费资产ID
      confirm = false
    ) {
      let tr = new TransactionBuilder()
  
      tr.add_type_operation('custom', {
        fee: {
          amount: 0,
          asset_id: fee_asset_id
        },
        payer: account_id,
        required_auths: required_auths,
        id: id,
        data: data
      })
      return WalletDb.process_transaction(tr, null, true, [], confirm)
    }

  // 更新用户信息
  update_account (updateObject, trex) {
    let tr = new TransactionBuilder()
    tr.add_type_operation('account_update', updateObject)
    if (trex && trex.operations.length > 0) {
     tr.operations = tr.operations.concat(trex.operations)
    }
    return WalletDb.process_transaction(tr, null, true, [], confirm)
  }

  // 提交提案
  proposal_update (proposal, neededKeys, confirm = false) {
    let tr = new TransactionBuilder()

    tr.add_type_operation('proposal_update', proposal)
    return WalletDb.process_transaction(tr, null, true, neededKeys, confirm)
  }

  // 提交新增借贷参数
  bitlender_option_create (issuer, asset_id, sproduct, options, fee_asset_id, chain_time, confirm = false) {
    let date_obj = new Date(chain_time)
    let i_time = date_obj.getTime()
    let i_expiration_sec = 60 * 60 * 24 * 14 * 1000
    let expiration_time = parseInt((i_time + i_expiration_sec) / 1000) - 1000

    let tr = new TransactionBuilder()

    let transfer_op = tr.get_type_operation('bitlender_option_create', {
      fee: {
        amount: 0,
        asset_id: fee_asset_id
      },
      issuer: issuer,
      asset_id: asset_id,
      sproduct: sproduct,
      options: options,
      fee_mode: 0
    })
    return tr.update_head_block().then(() => {
      tr.add_type_operation('proposal_create', {
        proposed_ops: [{op: transfer_op}],
        fee_paying_account: issuer,
        expiration_time: expiration_time
      })
      return WalletDb.process_transaction(tr, null, true, [], confirm)
    })
  }

  // 提交修改借贷参数
  bitlender_option_update (issuer, author, option_id, options, fee_asset_id, chain_time, confirm = false) {
    let date_obj = new Date(chain_time)
    let i_time = date_obj.getTime()
    let i_expiration_sec = 60 * 60 * 24 * 14 * 1000
    let expiration_time = parseInt((i_time + i_expiration_sec) / 1000) - 1000

    let tr = new TransactionBuilder()

    let transfer_op = tr.get_type_operation('bitlender_option_update', {
      fee: {
        amount: 0,
        asset_id: fee_asset_id
      },
      issuer: issuer,
      author: author,
      option_id: option_id,
      options: options
    })
    return tr.update_head_block().then(() => {
      tr.add_type_operation('proposal_create', {
        proposed_ops: [{op: transfer_op}],
        fee_paying_account: issuer
      })
      return WalletDb.process_transaction(tr, null, true, [], confirm)
    })
  }

  // 提交修改利率
  bitlender_rate_update (option_id, issuer, interest_rate_add, interest_rate_remove, fee_asset_id, confirm = false) {
    let tr = new TransactionBuilder()

    tr.add_type_operation('bitlender_rate_update', {
      fee: {
        amount: 0,
        asset_id: fee_asset_id
      },
      option_id: option_id,
      issuer: issuer,
      interest_rate_add: interest_rate_add,
      interest_rate_remove: interest_rate_remove
    })
    return WalletDb.process_transaction(tr, null, true, [], confirm)
  }

  // 处理不良资产
  bitlender_recycle (issuer, order_id, asset_pay, memo, fee_asset_id, confirm = true) {
    let tr = new TransactionBuilder()

    tr.add_type_operation('bitlender_recycle', {
      fee: {
        amount: 0,
        asset_id: fee_asset_id
      },
      issuer: issuer,
      order_id: order_id,
      asset_pay: asset_pay,
      memo: memo
    })
    return WalletDb.process_transaction(tr, null, true, [], confirm)
  }

  // 提交修改喂价人
  bitlender_update_feed_producers_operation (issuer, option_id, author, new_feed_option, fee_asset_id, confirm = false) {
    let tr = new TransactionBuilder()

    let transfer_op = tr.get_type_operation('bitlender_update_feed_producers_operation', {
      fee: {
        amount: 0,
        asset_id: fee_asset_id
      },
      issuer: issuer,
      option_id: option_id,
      author: author,
      new_feed_option: new_feed_option
    })
    return tr.update_head_block().then(() => {
      tr.add_type_operation('proposal_create', {
        proposed_ops: [{op: transfer_op}],
        fee_paying_account: issuer
      })
      return WalletDb.process_transaction(tr, null, true, [], confirm)
    })
  }

  // 创建筹资参数
  finance_option_create (issuer, issue_asset_id, issue_asset_owner, buy_asset_id, fundraise_owner, options, url, fee_asset_id, confirm = false) {
    let tr = new TransactionBuilder()

    let transfer_op = tr.get_type_operation('finance_option_create', {
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
    })
    return tr.update_head_block().then(() => {
      if (issuer !== issue_asset_owner) {
        tr.add_type_operation('proposal_create', {
          proposed_ops: [{op: transfer_op}],
          fee_paying_account: issuer
        })
      } else {
        tr.add_operation(transfer_op)
      }

      return WalletDb.process_transaction(tr, null, true, [], confirm)
    })
  }

  // 修改筹资参数
  finance_option_update (issuer, fundraise_id, issue_asset_owner, period, options, url, op_type, fee_asset_id, confirm = false) {
    let tr = new TransactionBuilder()

    let transfer_op = tr.get_type_operation('finance_option_update', {
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
    })
    return tr.update_head_block().then(() => {
      if (issuer !== issue_asset_owner) {
        tr.add_type_operation('proposal_create', {
          proposed_ops: [{op: transfer_op}],
          fee_paying_account: issuer
        })
      } else {
        tr.add_operation(transfer_op)
      }
      return WalletDb.process_transaction(tr, null, true, [], confirm)
    })
  }

  // 筹资
  buy_finance_create (issuer, fundraise_id, amount, bimmediately, fee_asset_id, confirm = false) {
    let tr = new TransactionBuilder()

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
    })
    return WalletDb.process_transaction(tr, null, true, [], confirm)
  }

  // 筹资有效
  buy_finance_enable (issuer, fundraise_id, benable, fee_asset_id, confirm = false) {
    let tr = new TransactionBuilder()

    tr.add_type_operation('buy_finance_enable', {
      fee: {
        amount: 0,
        asset_id: fee_asset_id
      },
      issuer: issuer,
      fundraise_id: fundraise_id,
      benable: benable
    })
    return WalletDb.process_transaction(tr, null, true, [], confirm)
  }

  // 删除众筹
  issue_fundraise_remove (issuer, fundraise_id, issue_asset_owner, fee_asset_id, confirm = false) {
    let tr = new TransactionBuilder()

    let transfer_op = tr.get_type_operation('issue_fundraise_remove', {
      fee: {
        amount: 0,
        asset_id: fee_asset_id
      },
      issuer: issuer,
      fundraise_id: fundraise_id,
      issue_asset_owner: issue_asset_owner
    })
    return tr.update_head_block().then(() => {
      if (issuer !== issue_asset_owner) {
        tr.add_type_operation('proposal_create', {
          proposed_ops: [{op: transfer_op}],
          fee_paying_account: issuer
        })
      } else {
        tr.add_operation(transfer_op)
      }
      return WalletDb.process_transaction(tr, null, true, [], confirm)
    })
  }

  // 众筹喂价
  issue_fundraise_publish_feed (issuer, fundraise_id, period, feed_publiser, fundraise_price, fee_asset_id, confirm = false) {
    let tr = new TransactionBuilder()

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
    })
    return WalletDb.process_transaction(tr, null, true, [], confirm)
  }

  // 众筹喂价
  carrier_update (carrier, carrier_account, new_config, new_memo, new_url, need_auth, fee_asset_id, confirm = false) {
    let tr = new TransactionBuilder()

    let transfer_op = tr.get_type_operation('carrier_update', {
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
    })
    return tr.update_head_block().then(() => {
      if (new_url) {
        tr.add_type_operation('proposal_create', {
          proposed_ops: [{op: transfer_op}],
          fee_paying_account: carrier_account
        })
      } else {
        tr.add_operation(transfer_op)
      }
      return WalletDb.process_transaction(tr, null, true, [], confirm)
    })
  }

  // 提config
  account_config_operation (issuer, config, op_type, fee_asset_id, confirm = false) {
    let tr = new TransactionBuilder()

    tr.add_type_operation('account_config_operation', {
      fee: {
        amount: 0,
        asset_id: fee_asset_id
      },
      issuer: issuer,
      config: config,
      op_type: op_type
    })
    return WalletDb.process_transaction(tr, null, true, [], confirm)
  }

  account_authenticate (issuer, op_type, auth_data, fee_asset_id, confirm = false) {
    let tr = new TransactionBuilder()

    tr.add_type_operation('account_authenticate', {
      fee: {
        amount: 0,
        asset_id: fee_asset_id
      },
      issuer: issuer,
      op_type: op_type,
      auth_data: auth_data
    })
    return WalletDb.process_transaction(tr, null, true, [], confirm)
  }
}

export default ApplicationApi
