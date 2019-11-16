/* eslint-disable no-mixed-spaces-and-tabs */
import WalletDb from './WalletDb.js'
import 'isomorphic-fetch'
import WalletUnlockActions from './WalletUnlockActions.js'
// import CachedPropertyActions from "actions/CachedPropertyActions";
// import ApplicationApi from "api/ApplicationApi.js";
// import {TransactionBuilder, FetchChain} from 'zosjs/es'
// import {Apis} from 'zosjs-ws'
// import SettingsStore from "stores/SettingsStore";
import axios from 'axios'
axios.defaults.timeout = 20000
axios.defaults.headers.post['Content-Type'] = 'application/x-www=form-urlencoded'
axios.interceptors.request.use(function (config) {
  // Do something before request is sent
  return config
}, function (error) {
  // Do something with request error
  return Promise.reject(error)
})

// Add a response interceptor
axios.interceptors.response.use(function (response) {
  // Do something with response data
  return response
}, function (error) {
  // Do something with response error
  return Promise.reject(error)
})

class WalletActions {
  /** Restore and make active a new wallet_object. */
  restore (wallet_name = 'default', wallet_object) {
    wallet_name = wallet_name.toLowerCase()
    return {wallet_name, wallet_object}
  }
  static getInstance () {
    if (!WalletActions.instance) {
     	WalletActions.instance = new WalletActions()
    }
    return WalletActions.instance
  }

  /** Make an existing wallet active or create a wallet (and make it active).
        If <b>wallet_name</b> does not exist, provide a <b>create_wallet_password</b>.
    */
  setWallet (wallet_name, create_wallet_password, brnkey) {
    WalletUnlockActions.lock()
    if (!wallet_name) wallet_name = 'default'
    return (dispatch) => {
      return new Promise(resolve => {
        dispatch({wallet_name, create_wallet_password, brnkey, resolve})
      })
    }
  }
  fetchPost (url, params = {}) {
    if (url.indexOf('http') !== 0 && url.indexOf('..') !== 0) {
      url = 'http://' + url
    }
    return new Promise((resolve, reject) => {
      axios.post(url, params).then(res => {
        resolve(res.data)
      }).catch(error => {
        reject(error)
      })
    })
  }

  fetchGet (url, params = {}) {
    if (url.indexOf('http') !== 0 && url.indexOf('..') !== 0) {
      url = 'http://' + url
    }
    console.log(url)
    return new Promise((resolve, reject) => {
      axios.get(url, params).then(res => {
        resolve(res.data)
      }).catch(error => {
        reject(error)
      })
    })
  }

  setBackupDate () {
    CachedPropertyActions.set('backup_recommended', false)
    return true
  }

  setBrainkeyBackupDate () {
    return true
  }

  createAccountWithPassword (account_name, password, registrar, referrer, referrer_percent, refcode, faucetAddress, captcha, captchaid, proposal_registrar) {
    let {privKey: owner_private} = WalletDb.generateKeyFromPassword(account_name, 'owner', password)
    let {privKey: active_private} = WalletDb.generateKeyFromPassword(account_name, 'active', password)
    let {privKey: memo_private} = WalletDb.generateKeyFromPassword(account_name, 'memo', password)
    let {privKey: author_private} = WalletDb.generateKeyFromPassword(account_name, 'author', password)

    return new Promise((resolve, reject) => {
      let create_account = () => {
        return application_api.create_account(
          owner_private.toPublicKey().toPublicKeyString(),
          active_private.toPublicKey().toPublicKeyString(),
          memo_private.toPublicKey().toPublicKeyString(),
          author_private.toPublicKey().toPublicKeyString(),
          account_name,
          registrar, // registrar_id,
          referrer, // referrer_id,
          referrer_percent, // referrer_percent,
          true // broadcast
        ).then(resolve).catch(reject)
      }

      if (registrar) {
        // using another user's account as registrar
        return create_account()
      } else {
        // using faucet

        // let faucetAddress = SettingsStore.getSetting("faucet_address");
        if (window && window.location && window.location.protocol === 'https:') {
          faucetAddress = faucetAddress.replace(/http:\/\//, 'https://')
        }

        let create_account_promise = fetch(faucetAddress + '/api/v1/accounts', {
          method: 'post',
          credentials: 'include',
          mode: 'cors',
          headers: {
            'Accept': 'application/json',
            'Content-type': 'application/json'
          },
          body: JSON.stringify({
            'account': {
              'name': account_name,
              'owner_key': owner_private.toPublicKey().toPublicKeyString(),
              'active_key': active_private.toPublicKey().toPublicKeyString(),
              'memo_key': memo_private.toPublicKey().toPublicKeyString(),
              'auth_key': author_private.toPublicKey().toPublicKeyString(),
              'refcode': refcode,
              'referrer': referrer,
              'referrer_percent': referrer_percent,
              'captcha': captcha,
              'captchaid': captchaid,
              'registrar': proposal_registrar
            }
          })
        }).then(result => {
          result = result.json()
          if (result.error) {
            throw result.error
          }
          return result
        }).catch(error => {
          /*
                    * Since the account creation failed, we need to decrement the
                    * sequence used to generate private keys from the brainkey. Two
                    * keys were generated, so we decrement twice.
                    */
          throw error
        })
        // then(r => r.json().then(res => {
        //     console.log('ssss', res)
        //     if (!res || (res && res.error)) {
        //         reject(res.error);
        //     } else {
        //         resolve(res);
        //     }
        // })).catch(reject =>{
        //     console.log('reject', reject)
        // });
        return create_account_promise.then(result => {
          if (result && result.error) {
            reject(result.error)
          } else {
            resolve(result)
          }
        }).catch(error => {
          reject(error)
        })
      }
    })
  }

  createAccountWithPassword_geetest (account_name, password, registrar, referrer, referrer_percent, refcode, faucetAddress, proposal_registrar, geetest_challenge, geetest_validate, geetest_seccode, user_token) {
    let {privKey: owner_private} = WalletDb.generateKeyFromPassword(account_name, 'owner', password)
    let {privKey: active_private} = WalletDb.generateKeyFromPassword(account_name, 'active', password)
    let {privKey: memo_private} = WalletDb.generateKeyFromPassword(account_name, 'memo', password)
    let {privKey: author_private} = WalletDb.generateKeyFromPassword(account_name, 'author', password)

    return new Promise((resolve, reject) => {
      let create_account = () => {
        return application_api.create_account(
          owner_private.toPublicKey().toPublicKeyString(),
          active_private.toPublicKey().toPublicKeyString(),
          memo_private.toPublicKey().toPublicKeyString(),
          author_private.toPublicKey().toPublicKeyString(),
          account_name,
          registrar, // registrar_id,
          referrer, // referrer_id,
          referrer_percent, // referrer_percent,
          true // broadcast
        ).then(resolve).catch(reject)
      }

      if (registrar) {
        // using another user's account as registrar
        return create_account()
      } else {
        // using faucet

        // let faucetAddress = SettingsStore.getSetting("faucet_address");
        if (window && window.location && window.location.protocol === 'https:') {
          faucetAddress = faucetAddress.replace(/http:\/\//, 'https://')
        }

        let create_account_promise = fetch(faucetAddress + '/api/v1/auth/mobile-geetest/accounts/' + user_token, {
          method: 'post',
          credentials: 'include',
          mode: 'cors',
          headers: {
            'Accept': 'application/json',
            'Content-type': 'application/json'
          },
          body: JSON.stringify({
            'account': {
              'name': account_name,
              'owner_key': owner_private.toPublicKey().toPublicKeyString(),
              'active_key': active_private.toPublicKey().toPublicKeyString(),
              'memo_key': active_private.toPublicKey().toPublicKeyString(),
              'auth_key': author_private.toPublicKey().toPublicKeyString(),
              'refcode': refcode,
              'referrer': referrer,
              'referrer_percent': referrer_percent,
              'registrar': proposal_registrar,
              'geetest_challenge': geetest_challenge,
              'geetest_validate': geetest_validate,
              'geetest_seccode': geetest_seccode
            }
          })
        }).then(result => {
          result = result.json()
          if (result.error) {
            throw result.error
          }
          return result
        }).catch(error => {
          /*
                    * Since the account creation failed, we need to decrement the
                    * sequence used to generate private keys from the brainkey. Two
                    * keys were generated, so we decrement twice.
                    */
          throw error
        })
        // then(r => r.json().then(res => {
        //     console.log('ssss', res)
        //     if (!res || (res && res.error)) {
        //         reject(res.error);
        //     } else {
        //         resolve(res);
        //     }
        // })).catch(reject =>{
        //     console.log('reject', reject)
        // });
        return create_account_promise.then(result => {
          if (result && result.error) {
            reject(result.error)
          } else {
            resolve(result)
          }
        }).catch(error => {
          reject(error)
        })
      }
    })
  }
  createAccount (account_name, registrar, referrer, referrer_percent, refcode, faucet_url) {
    if (WalletDb.isLocked()) {
      let error = 'wallet locked'
      // this.actions.brainKeyAccountCreateError( error )
      return Promise.reject(error)
    }
    let owner_private = WalletDb.generateNextKey()
    let active_private = WalletDb.generateNextKey()
    // let memo_private = WalletDb.generateNextKey()
    let updateWallet = () => {
      let transaction = WalletDb.transaction_update_keys()
      let p = WalletDb.saveKeys(
        [owner_private, active_private],
        // [ owner_private, active_private, memo_private ],
        transaction
      )

      return p.catch(error => transaction.abort())
    }

    {
      // using faucet

      // faucetAddress cyj
      /* cyj delete 20171024
            let faucetAddress = SettingsStore.getSetting("faucet_address");
            if (window && window.location && window.location.protocol === "https:") {
                faucetAddress = faucetAddress.replace(/http:\/\//, "https://");
            }
            */
      let faucetAddress = faucet_url

      let create_account_promise = fetch(faucetAddress + '/api/v1/accounts', {
        method: 'post',
        mode: 'cors',
        headers: {
          'Accept': 'application/json',
          'Content-type': 'application/json'
        },
        body: JSON.stringify({
          'account': {
            'name': account_name,
            'owner_key': owner_private.private_key.toPublicKey().toPublicKeyString(),
            'active_key': active_private.private_key.toPublicKey().toPublicKeyString(),
            'memo_key': active_private.private_key.toPublicKey().toPublicKeyString(),
            // "memo_key": memo_private.private_key.toPublicKey().toPublicKeyString(),
            'refcode': refcode,
            'referrer': referrer
          }
        })
      })

      return create_account_promise.then(result => {
        if (result.error) {
          throw result.error
        }
        return updateWallet()
      }).catch(error => {
        /*
                * Since the account creation failed, we need to decrement the
                * sequence used to generate private keys from the brainkey. Two
                * keys were generated, so we decrement twice.
                */
        WalletDb.decrementBrainKeySequence()
        WalletDb.decrementBrainKeySequence()
        throw error
      })
    }
  }

/* cyj delete 20171024 
    claimVestingBalance(account, cvb, forceAll = false) {
        let tr = new TransactionBuilder();

        let balance = cvb.balance.amount,
            earned = cvb.policy[1].coin_seconds_earned,
            vestingPeriod = cvb.policy[1].vesting_seconds,
            availablePercent = forceAll ? 1 : earned / (vestingPeriod * balance);

        tr.add_type_operation("vesting_balance_withdraw", {
            fee: { amount: "0", asset_id: "1.3.0"},
            owner: account,
            vesting_balance: cvb.id,
            amount: {
                amount: Math.floor(balance * availablePercent),
                asset_id: cvb.balance.asset_id
            }
        });

        return WalletDb.process_transaction(tr, null, true)
        .then(result => {

        })
        .catch(err => {
            console.log("vesting_balance_withdraw err:", err);
        });
    }
*/

  /* @parm balances is an array of balance objects with two
        additional values: {vested_balance, public_key_string}
    */
/* cyj delete 20171024 
    importBalance( account_name_or_id, balances, broadcast) {
        return (dispatch) => {

            return new Promise((resolve, reject) => {

                let db = Apis.instance().db_api();
                let address_publickey_map = {};

                let account_lookup = FetchChain("getAccount", account_name_or_id);
                let unlock = WalletUnlockActions.unlock();

                let p = Promise.all([ unlock, account_lookup ]).then( (results)=> {
                    let account = results[1];
                    //DEBUG console.log('... account',account)
                    if(account == void 0)
                        return Promise.reject("Unknown account " + account_name_or_id);

                    let balance_claims = [];
                    let signer_pubkeys = {};
                    for(let balance of balances) {
                        let {vested_balance, public_key_string} = balance;

                        //DEBUG console.log('... balance',b)
                        let total_claimed;
                        if( vested_balance ) {
                            if(vested_balance.amount == 0)
                                // recently claimed
                                continue;

                            total_claimed = vested_balance.amount;
                        } else
                            total_claimed = balance.balance.amount;

                        //assert
                        if(vested_balance && vested_balance.asset_id != balance.balance.asset_id)
                            throw new Error("Vested balance record and balance record asset_id missmatch",
                                vested_balance.asset_id,
                                balance.balance.asset_id
                            );

                        signer_pubkeys[public_key_string] = true;
                        balance_claims.push({
                            fee: { amount: "0", asset_id: "1.3.0"},
                            deposit_to_account: account.get("id"),
                            balance_to_claim: balance.id,
                            balance_owner_key: public_key_string,
                            total_claimed: {
                                amount: total_claimed,
                                asset_id: balance.balance.asset_id
                            }
                        });
                    }
                   //  if( ! balance_claims.length) {
                   //      throw new Error("No balances to claim");
                   //  }

                    //DEBUG console.log('... balance_claims',balance_claims)
                    let tr = new TransactionBuilder();

                    for(let balance_claim of balance_claims) {
                        tr.add_type_operation("balance_claim", balance_claim);
                    }
                    // With a lot of balance claims the signing can take so Long
                    // the transaction will expire.  This will increase the timeout...
                    tr.set_expire_seconds( (15 * 60) + balance_claims.length);
                    return WalletDb.process_transaction(tr, Object.keys(signer_pubkeys), broadcast )
                    .then(result => {
                        dispatch(true);
                        return result;
                    });
                });
                resolve(p);
            });
        };
    }
*/
}

var WalletActionsIns = WalletActions.getInstance()
export default WalletActionsIns
