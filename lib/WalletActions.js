'use strict';

Object.defineProperty(exports, "__esModule", {
  value: true
});

var _createClass = function () { function defineProperties(target, props) { for (var i = 0; i < props.length; i++) { var descriptor = props[i]; descriptor.enumerable = descriptor.enumerable || false; descriptor.configurable = true; if ("value" in descriptor) descriptor.writable = true; Object.defineProperty(target, descriptor.key, descriptor); } } return function (Constructor, protoProps, staticProps) { if (protoProps) defineProperties(Constructor.prototype, protoProps); if (staticProps) defineProperties(Constructor, staticProps); return Constructor; }; }(); /* eslint-disable no-mixed-spaces-and-tabs */

// import CachedPropertyActions from "actions/CachedPropertyActions";
// import ApplicationApi from "api/ApplicationApi.js";
// import {TransactionBuilder, FetchChain} from 'zosjs/es'
// import {Apis} from 'zosjs-ws'
// import SettingsStore from "stores/SettingsStore";


var _WalletDb = require('./WalletDb.js');

var _WalletDb2 = _interopRequireDefault(_WalletDb);

require('isomorphic-fetch');

var _WalletUnlockActions = require('./WalletUnlockActions.js');

var _WalletUnlockActions2 = _interopRequireDefault(_WalletUnlockActions);

var _axios = require('axios');

var _axios2 = _interopRequireDefault(_axios);

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } }

_axios2.default.defaults.timeout = 20000;
_axios2.default.defaults.headers.post['Content-Type'] = 'application/x-www=form-urlencoded';
_axios2.default.interceptors.request.use(function (config) {
  // Do something before request is sent
  return config;
}, function (error) {
  // Do something with request error
  return Promise.reject(error);
});

// Add a response interceptor
_axios2.default.interceptors.response.use(function (response) {
  // Do something with response data
  return response;
}, function (error) {
  // Do something with response error
  return Promise.reject(error);
});

var WalletActions = function () {
  function WalletActions() {
    _classCallCheck(this, WalletActions);
  }

  _createClass(WalletActions, [{
    key: 'restore',

    /** Restore and make active a new wallet_object. */
    value: function restore() {
      var wallet_name = arguments.length > 0 && arguments[0] !== undefined ? arguments[0] : 'default';
      var wallet_object = arguments[1];

      wallet_name = wallet_name.toLowerCase();
      return { wallet_name: wallet_name, wallet_object: wallet_object };
    }
  }, {
    key: 'setWallet',


    /** Make an existing wallet active or create a wallet (and make it active).
          If <b>wallet_name</b> does not exist, provide a <b>create_wallet_password</b>.
      */
    value: function setWallet(wallet_name, create_wallet_password, brnkey) {
      _WalletUnlockActions2.default.lock();
      if (!wallet_name) wallet_name = 'default';
      return function (dispatch) {
        return new Promise(function (resolve) {
          dispatch({ wallet_name: wallet_name, create_wallet_password: create_wallet_password, brnkey: brnkey, resolve: resolve });
        });
      };
    }
  }, {
    key: 'fetchPost',
    value: function fetchPost(url) {
      var params = arguments.length > 1 && arguments[1] !== undefined ? arguments[1] : {};

      if (url.indexOf('http') !== 0 && url.indexOf('..') !== 0) {
        url = 'http://' + url;
      }
      return new Promise(function (resolve, reject) {
        _axios2.default.post(url, params).then(function (res) {
          resolve(res.data);
        }).catch(function (error) {
          reject(error);
        });
      });
    }
  }, {
    key: 'fetchGet',
    value: function fetchGet(url) {
      var params = arguments.length > 1 && arguments[1] !== undefined ? arguments[1] : {};

      if (url.indexOf('http') !== 0 && url.indexOf('..') !== 0) {
        url = 'http://' + url;
      }
      console.log(url);
      return new Promise(function (resolve, reject) {
        _axios2.default.get(url, params).then(function (res) {
          resolve(res.data);
        }).catch(function (error) {
          reject(error);
        });
      });
    }
  }, {
    key: 'setBackupDate',
    value: function setBackupDate() {
      CachedPropertyActions.set('backup_recommended', false);
      return true;
    }
  }, {
    key: 'setBrainkeyBackupDate',
    value: function setBrainkeyBackupDate() {
      return true;
    }
  }, {
    key: 'createAccountWithPassword',
    value: function createAccountWithPassword(account_name, password, registrar, referrer, referrer_percent, refcode, faucetAddress, captcha, captchaid, proposal_registrar) {
      var _WalletDb$generateKey = _WalletDb2.default.generateKeyFromPassword(account_name, 'owner', password),
          owner_private = _WalletDb$generateKey.privKey;

      var _WalletDb$generateKey2 = _WalletDb2.default.generateKeyFromPassword(account_name, 'active', password),
          active_private = _WalletDb$generateKey2.privKey;

      var _WalletDb$generateKey3 = _WalletDb2.default.generateKeyFromPassword(account_name, 'memo', password),
          memo_private = _WalletDb$generateKey3.privKey;

      var _WalletDb$generateKey4 = _WalletDb2.default.generateKeyFromPassword(account_name, 'author', password),
          author_private = _WalletDb$generateKey4.privKey;

      return new Promise(function (resolve, reject) {
        var create_account = function create_account() {
          return application_api.create_account(owner_private.toPublicKey().toPublicKeyString(), active_private.toPublicKey().toPublicKeyString(), memo_private.toPublicKey().toPublicKeyString(), author_private.toPublicKey().toPublicKeyString(), account_name, registrar, // registrar_id,
          referrer, // referrer_id,
          referrer_percent, // referrer_percent,
          true // broadcast
          ).then(resolve).catch(reject);
        };

        if (registrar) {
          // using another user's account as registrar
          return create_account();
        } else {
          // using faucet

          // let faucetAddress = SettingsStore.getSetting("faucet_address");
          if (window && window.location && window.location.protocol === 'https:') {
            faucetAddress = faucetAddress.replace(/http:\/\//, 'https://');
          }

          var create_account_promise = fetch(faucetAddress + '/api/v1/accounts', {
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
          }).then(function (result) {
            result = result.json();
            if (result.error) {
              throw result.error;
            }
            return result;
          }).catch(function (error) {
            /*
                      * Since the account creation failed, we need to decrement the
                      * sequence used to generate private keys from the brainkey. Two
                      * keys were generated, so we decrement twice.
                      */
            throw error;
          });
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
          return create_account_promise.then(function (result) {
            if (result && result.error) {
              reject(result.error);
            } else {
              resolve(result);
            }
          }).catch(function (error) {
            reject(error);
          });
        }
      });
    }
  }, {
    key: 'createAccountWithPassword_geetest',
    value: function createAccountWithPassword_geetest(account_name, password, registrar, referrer, referrer_percent, refcode, faucetAddress, proposal_registrar, geetest_challenge, geetest_validate, geetest_seccode, user_token) {
      var _WalletDb$generateKey5 = _WalletDb2.default.generateKeyFromPassword(account_name, 'owner', password),
          owner_private = _WalletDb$generateKey5.privKey;

      var _WalletDb$generateKey6 = _WalletDb2.default.generateKeyFromPassword(account_name, 'active', password),
          active_private = _WalletDb$generateKey6.privKey;

      var _WalletDb$generateKey7 = _WalletDb2.default.generateKeyFromPassword(account_name, 'memo', password),
          memo_private = _WalletDb$generateKey7.privKey;

      var _WalletDb$generateKey8 = _WalletDb2.default.generateKeyFromPassword(account_name, 'author', password),
          author_private = _WalletDb$generateKey8.privKey;

      return new Promise(function (resolve, reject) {
        var create_account = function create_account() {
          return application_api.create_account(owner_private.toPublicKey().toPublicKeyString(), active_private.toPublicKey().toPublicKeyString(), memo_private.toPublicKey().toPublicKeyString(), author_private.toPublicKey().toPublicKeyString(), account_name, registrar, // registrar_id,
          referrer, // referrer_id,
          referrer_percent, // referrer_percent,
          true // broadcast
          ).then(resolve).catch(reject);
        };

        if (registrar) {
          // using another user's account as registrar
          return create_account();
        } else {
          // using faucet

          // let faucetAddress = SettingsStore.getSetting("faucet_address");
          if (window && window.location && window.location.protocol === 'https:') {
            faucetAddress = faucetAddress.replace(/http:\/\//, 'https://');
          }

          var create_account_promise = fetch(faucetAddress + '/api/v1/auth/mobile-geetest/accounts/' + user_token, {
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
          }).then(function (result) {
            result = result.json();
            if (result.error) {
              throw result.error;
            }
            return result;
          }).catch(function (error) {
            /*
                      * Since the account creation failed, we need to decrement the
                      * sequence used to generate private keys from the brainkey. Two
                      * keys were generated, so we decrement twice.
                      */
            throw error;
          });
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
          return create_account_promise.then(function (result) {
            if (result && result.error) {
              reject(result.error);
            } else {
              resolve(result);
            }
          }).catch(function (error) {
            reject(error);
          });
        }
      });
    }
  }, {
    key: 'createAccount',
    value: function createAccount(account_name, registrar, referrer, referrer_percent, refcode, faucet_url) {
      if (_WalletDb2.default.isLocked()) {
        var error = 'wallet locked';
        // this.actions.brainKeyAccountCreateError( error )
        return Promise.reject(error);
      }
      var owner_private = _WalletDb2.default.generateNextKey();
      var active_private = _WalletDb2.default.generateNextKey();
      // let memo_private = WalletDb.generateNextKey()
      var updateWallet = function updateWallet() {
        var transaction = _WalletDb2.default.transaction_update_keys();
        var p = _WalletDb2.default.saveKeys([owner_private, active_private],
        // [ owner_private, active_private, memo_private ],
        transaction);

        return p.catch(function (error) {
          return transaction.abort();
        });
      };

      {
        // using faucet

        // faucetAddress cyj
        /* cyj delete 20171024
              let faucetAddress = SettingsStore.getSetting("faucet_address");
              if (window && window.location && window.location.protocol === "https:") {
                  faucetAddress = faucetAddress.replace(/http:\/\//, "https://");
              }
              */
        var faucetAddress = faucet_url;

        var create_account_promise = fetch(faucetAddress + '/api/v1/accounts', {
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
        });

        return create_account_promise.then(function (result) {
          if (result.error) {
            throw result.error;
          }
          return updateWallet();
        }).catch(function (error) {
          /*
                  * Since the account creation failed, we need to decrement the
                  * sequence used to generate private keys from the brainkey. Two
                  * keys were generated, so we decrement twice.
                  */
          _WalletDb2.default.decrementBrainKeySequence();
          _WalletDb2.default.decrementBrainKeySequence();
          throw error;
        });
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

  }], [{
    key: 'getInstance',
    value: function getInstance() {
      if (!WalletActions.instance) {
        WalletActions.instance = new WalletActions();
      }
      return WalletActions.instance;
    }
  }]);

  return WalletActions;
}();

var WalletActionsIns = WalletActions.getInstance();
exports.default = WalletActionsIns;