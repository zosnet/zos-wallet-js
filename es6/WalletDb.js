import iDB from "./idb-instance.js";
import idb_helper from "./idb-helper.js";
import {cloneDeep} from "lodash";

import PrivateKeyStore from "./PrivateKeyStore.js";
import {WalletTcomb} from "./tcomb_structs";
//import TransactionConfirmActions from "actions/TransactionConfirmActions";
import WalletUnlockStore from "./WalletUnlockStore.js";
//import PrivateKeyActions from "./PrivateKeyActions.js";
//import AccountActions from "./AccountActions.js";
import {ChainStore, PrivateKey, key, Aes} from "zosjs/es";
import {Apis, ChainConfig} from "zosjs-ws";
//import AddressIndex from "./AddressIndex.js";
import AccountRefsStore from "./AccountRefsStore.js";
import AccountStore from "./AccountStore.js";


let aes_private = null;
let _passwordKey = null;
// let transaction;
let memo_fixe_private = PrivateKey.fromWif("5K3DH7oDxHe6kKjuNFUHm2qQYuYYLm9ECsmUVm2Bf4cq6Ykr8fz")
let memo_fixe_public = memo_fixe_private.toPublicKey().toString()


let TRACE = false;

let dictJson, AesWorker;

if (false) {
    AesWorker = require("worker-loader?inline!workers/AesWorker");
    dictJson = require("json-loader!common/dictionary_en.json");
}

/** Represents a single wallet and related indexedDb database operations. */
class WalletDb{

    constructor() {
        console.log("Walletdb constructor");
        this.state = { wallet: null, saving_keys: false }
        // Confirm only works when there is a UI (this is for mocha unit tests)
        this.confirm_transactions = true
        ChainStore.subscribe(this.checkNextGeneratedKey.bind(this))
        this.generateNextKey_pubcache = []
        // WalletDb use to be a plan old javascript class (not an Alt store) so
        // for now many methods need to be exported...
        
        this.generatingKey = false;
    }


    
    static getInstance() {
            if (!WalletDb.instance) {
                    WalletDb.instance = new WalletDb();
            }
            return WalletDb.instance;

    }

    /** Discover derived keys that are not in this wallet */
    checkNextGeneratedKey() {
        if( ! this.state.wallet) return;
        if( ! aes_private) return; // locked
        if( ! this.state.wallet.encrypted_brainkey) return; // no brainkey
        if(this.chainstore_account_ids_by_key === ChainStore.account_ids_by_key)
            return; // no change
        this.chainstore_account_ids_by_key = ChainStore.account_ids_by_key;
        // Helps to ensure we are looking at an un-used key
        try {
            this.generateNextKey( false /*save*/ );
        } catch(e) {
            console.error(e);
        }
    }

    getWallet() {
        return this.state.wallet
    }

    onLock() {
        _passwordKey = null;
        aes_private = null;
    }

    isLocked() {
        //两个都空，则为被锁
        return !(!!aes_private || !!_passwordKey);
        //return false;
    }

    decryptTcomb_PrivateKey(private_key_tcomb) {
        if( ! private_key_tcomb) return null
        if( this.isLocked() ){
            throw new Error("wallet locked")
        } 
        if(private_key_tcomb.pubkey === memo_fixe_public) return memo_fixe_private;
        if (_passwordKey && _passwordKey[private_key_tcomb.pubkey]) {
            return _passwordKey[private_key_tcomb.pubkey];
        }
        let private_key_hex = aes_private.decryptHex(private_key_tcomb.encrypted_key)
        return PrivateKey.fromBuffer(new Buffer(private_key_hex, 'hex'))
    }

    /** @return ecc/PrivateKey or null */
    getPrivateKey(public_key) {
        if (_passwordKey) return _passwordKey[public_key];
        if(! public_key) return null
        if(public_key.Q) public_key = public_key.toPublicKeyString()
        if(public_key === memo_fixe_public) return memo_fixe_private;
        let private_key_tcomb = PrivateKeyStore.getTcomb_byPubkey(public_key)
        if(! private_key_tcomb) return null
        return this.decryptTcomb_PrivateKey(private_key_tcomb)
    }
    
    

    process_transaction(tr, signer_pubkeys, broadcast, extra_keys = [], confirm = false) {
        return WalletUnlockStore.onUnlock().then( () => {
            AccountStore.tryToSetCurrentAccount();
            return Promise.all([
                tr.set_required_fees(),
                tr.update_head_block()
            ]).then(()=> {

                let signer_pubkeys_added = {}
                if(signer_pubkeys) {
                    // Balance claims are by address, only the private
                    // key holder can know about these additional
                    // potential keys.
                    let pubkeys = PrivateKeyStore.getPubkeys_having_PrivateKey(signer_pubkeys)
                    if( ! pubkeys.length)
                        throw new Error("Missing signing key")

                    for(let pubkey_string of pubkeys) {
                        let private_key = this.getPrivateKey(pubkey_string)
                        tr.add_signer(private_key, pubkey_string)
                        signer_pubkeys_added[pubkey_string] = true
                    }
                }
                return tr.get_potential_signatures().then( ({pubkeys, addys})=> {
                    let my_pubkeys = PrivateKeyStore.getPubkeys_having_PrivateKey(pubkeys.concat(extra_keys), addys);

                    //{//Testing only, don't send All public keys!
                    //    let pubkeys_all = PrivateKeyStore.getPubkeys() // All public keys
                    //    tr.get_required_signatures(pubkeys_all).then( required_pubkey_strings =>
                    //        console.log('get_required_signatures all\t',required_pubkey_strings.sort(), pubkeys_all))
                    //    tr.get_required_signatures(my_pubkeys).then( required_pubkey_strings =>
                    //        console.log('get_required_signatures normal\t',required_pubkey_strings.sort(), pubkeys))
                    //}
                    return tr.get_required_signatures(my_pubkeys).then( required_pubkeys => {
                        for(let pubkey_string of required_pubkeys) {
                            if(signer_pubkeys_added[pubkey_string]) continue
                            let private_key = this.getPrivateKey(pubkey_string)
                            if( ! private_key)
                                // This should not happen, get_required_signatures will only
                                // returned keys from my_pubkeys
                                throw new Error("Missing signing key for " + pubkey_string)
                            tr.add_signer(private_key, pubkey_string)
                        }
                    })
                }).then(()=> {
                    if(broadcast) {
                        /*    cyj delete 20171101 去掉web的界面刷新
                        if(this.confirm_transactions) {
                            let p = new Promise((resolve, reject) => {
                                TransactionConfirmActions.confirm(tr, resolve, reject)
                            })
                            return p;
                        }
                        else
                        */
                        if(confirm){
                            return Promise.resolve(tr)
                        }else{
                            let broadcast_timeout = setTimeout(() => {
                                Promise.reject("Your transaction has expired without being confirmed, please try again later.");
                            }, 15 * 2000);
                            return tr.broadcast(() => {
                                //广播成功
                                console.log("broadcast success");
                                
                            }).then((res)=>{
                                console.log("tr end Info",res);
                               clearTimeout(broadcast_timeout);
                               let tr_res = {};
                               tr_res['block_num'] = res[0].block_num;
                               tr_res['trx_num'] = res[0].trx_num;
                               tr_res['txid'] = tr.id();
                               tr_res['fee'] = tr.serialize().operations[0][1].fee;
                               return Promise.resolve(tr_res)
                            }).catch( error => {
                                clearTimeout(broadcast_timeout);
                                // messages of length 1 are local exceptions (use the 1st line)
                                // longer messages are remote API exceptions (use the 1st line)
                                let splitError = error.message.split( "\n" );
                                let message = splitError[0];   //报错信息
                                return Promise.reject(message);
                            });
                        }
                        

                    } else
                        return tr.serialize()
                })
            })
        }).catch(error => {
            console.log(error);
            return Promise.reject(error)
        })
    }
    
    

    transaction_update() {
        let transaction = iDB.instance().db().transaction(
            ["wallet"], "readwrite"
        )
        return transaction
    }

    transaction_update_keys() {
        let transaction = iDB.instance().db().transaction(
            ["wallet", "private_keys"], "readwrite"
        )
        return transaction
    }

    getBrainKey() {
        let wallet = this.state.wallet
        if ( ! wallet.encrypted_brainkey) throw new Error("missing brainkey")
        if ( ! aes_private){
            throw new Error("wallet locked")
        } 
        let brainkey_plaintext = aes_private.decryptHexToText( wallet.encrypted_brainkey )
        return brainkey_plaintext
    }

    getBrainKeyPrivate(brainkey_plaintext = this.getBrainKey()) {
        if( ! brainkey_plaintext) throw new Error("missing brainkey")
        return PrivateKey.fromSeed( key.normalize_brainKey(brainkey_plaintext) )
    }

    onCreateWallet(
        password_plaintext,
        brainkey_plaintext,
        unlock = false,
        public_name = "default"
    ) {
        let walletCreateFct = (dictionary) => {     //dictionary就是a-z的单词字典
            return new Promise( (resolve, reject) => {
                if( typeof password_plaintext !== 'string')
                    throw new Error("password string is required")

                let brainkey_backup_date
                if(brainkey_plaintext) {
                    if(typeof brainkey_plaintext !== "string")
                        throw new Error("Brainkey must be a string")

                    if(brainkey_plaintext.trim() === "")
                        throw new Error("Brainkey can not be an empty string")

                    if(brainkey_plaintext.length < 50)
                        throw new Error("Brainkey must be at least 50 characters long")

                    // The user just provided the Brainkey so this avoids
                    // bugging them to back it up again.
                    brainkey_backup_date = new Date()
                }
                let password_aes = Aes.fromSeed( password_plaintext )


                let encryption_buffer = key.get_random_key().toBuffer()
                // encryption_key is the global encryption key (does not change even if the passsword changes)
                let encryption_key = password_aes.encryptToHex( encryption_buffer )
                // If unlocking, local_aes_private will become the global aes_private object
                let local_aes_private = Aes.fromSeed( encryption_buffer )

                if( ! brainkey_plaintext)
                    brainkey_plaintext = key.suggest_brain_key(dictionary.en)
                else
                    brainkey_plaintext = key.normalize_brainKey(brainkey_plaintext)
                let brainkey_private = this.getBrainKeyPrivate( brainkey_plaintext )
                let brainkey_pubkey = brainkey_private.toPublicKey().toPublicKeyString()
                let encrypted_brainkey = local_aes_private.encryptToHex( brainkey_plaintext )

                let password_private = PrivateKey.fromSeed( password_plaintext )
                let password_pubkey = password_private.toPublicKey().toPublicKeyString()

                let wallet = {
                    public_name,
                    password_pubkey,
                    encryption_key,
                    encrypted_brainkey,
                    brainkey_pubkey,
                    brainkey_sequence: 0,
                    brainkey_backup_date,
                    created: new Date(),
                    last_modified: new Date(),
                    chain_id: Apis.instance().chain_id
                }
                WalletTcomb(wallet) // validation
                let transaction = this.transaction_update()
                let add = idb_helper.add( transaction.objectStore("wallet"), wallet )
                let end = idb_helper.on_transaction_end(transaction).then( () => {
                    this.state.wallet = wallet
                    
                    if(unlock) {
                        aes_private = local_aes_private;
                        WalletUnlockStore.onUnlock();
                    }
                })
                Promise.all([ add, end ]).then(() => {
                    resolve();

                }).catch(err => {
                    reject(err);
                })
            })
        };


        if (false) { //false
            return walletCreateFct(dictJson);
        } else {
            //let dictionaryPromise = brainkey_plaintext ? null : fetch(`${__BASE_URL__}dictionary.json`);
            let dictionaryPromise = brainkey_plaintext ? null : require("./lib/common/dictionary_en.json");
            return Promise.all([
                dictionaryPromise
            ]).then(res => {
                return brainkey_plaintext ? walletCreateFct(null) :
                    walletCreateFct(res[0]);
            }).catch(err => {
                console.log("unable to fetch dictionary.json", err);
                return Promise.reject(err)
            });
        }
    }

    generateKeyFromPassword(accountName, role, password) {
        let seed = accountName + role + password;
        let privKey = PrivateKey.fromSeed(seed);
        let pubKey = privKey.toPublicKey().toString();

        return {privKey, pubKey};
    }

    /** This also serves as 'unlock' */
    validatePassword( password, unlock = false, account = null, roles = ["active", "owner", "memo", "author"] ) {
        if (account) {
            let id = 0;
            function setKey(role, priv, pub) {
                if (!_passwordKey) _passwordKey = {};
                _passwordKey[pub] = priv;

                id++;
                PrivateKeyStore.setPasswordLoginKey({
                    pubkey: pub,
                    import_account_names: [account],
                    encrypted_key: null,
                    id,
                    brainkey_sequence: null
                });
            }

            //特殊私钥不能登陆  
            if(password === "5K3DH7oDxHe6kKjuNFUHm2qQYuYYLm9ECsmUVm2Bf4cq6Ykr8fz") return false

            /* Check if the user tried to login with a private key */
            let fromWif;
            try {
                fromWif = PrivateKey.fromWif(password);
            } catch(err) {

            }
            let acc = ChainStore.getAccount(account, false);
            let key;
            if (fromWif) {
                key = {privKey: fromWif, pubKey: fromWif.toPublicKey().toString()};
            }


            /* Test the pubkey for each role against either the wif key, or the password generated keys */
            roles.forEach(role => {
                if (!fromWif) {
                    key = this.generateKeyFromPassword(account, role, password);
                }
                
                if (acc) {
                    // console.log(role);
                    if (role === "author") {                       
                        if (acc.getIn(["options", "auth_key"]) === key.pubKey) {
                            setKey(role, key.privKey, key.pubKey);
                        }
                    }  else if (role === "memo") {
                        if (acc.getIn(["options", "memo_key"]) === key.pubKey) {
                            setKey(role, key.privKey, key.pubKey);
                        }
                        if (acc.getIn(["options", "auth_key"]) === key.pubKey) {
                            setKey("author", key.privKey, key.pubKey);
                        }
                    } else {
                        let foundRole = false;
                        
                        if (role === "active") {
                            if (acc.getIn(["options", "memo_key"]) === key.pubKey) {
                                setKey("memo", key.privKey, key.pubKey);       
                            }
                            if (acc.getIn(["options", "auth_key"]) === key.pubKey) {
                                setKey("author", key.privKey, key.pubKey);
                            }
                        } 

                        acc.getIn([role, "key_auths"]).forEach(auth => {
                            if (auth.get(0) === key.pubKey) {
                                setKey(role, key.privKey, key.pubKey);
                                foundRole = true;
                                return false;
                            }
                        });


                        if (!foundRole) {
                            let alsoCheckRole = role === "active" ? "owner" : "active";
                            acc.getIn([alsoCheckRole, "key_auths"]).forEach(auth => {
                                if (auth.get(0) === key.pubKey) {
                                    setKey(alsoCheckRole, key.privKey, key.pubKey);
                                    foundRole = true;
                                    return false;
                                }
                            });
                        }
                    }
                }
            });
            if( !this.isLocked() ) {
                WalletUnlockStore.onUnlock()
            } 
            // console.log('setket', setket)
            // if (setket >0)
            // {
            //     let memo_fixe_private = PrivateKey.fromWif("5K3DH7oDxHe6kKjuNFUHm2qQYuYYLm9ECsmUVm2Bf4cq6Ykr8fz");
            //     let memo_fixe_public = memo_fixe_private.toPublicKey().toString();      
            //     setKey("memo", memo_fixe_private, memo_fixe_public);       
            // }

            return {success: !!_passwordKey, cloudMode: true};

        } else {
            let wallet = this.state.wallet;
            try {
                let password_private = PrivateKey.fromSeed( password );
                let password_pubkey = password_private.toPublicKey().toPublicKeyString();
                if(wallet.password_pubkey !== password_pubkey) return false;
                if( unlock ) {
                    let password_aes = Aes.fromSeed( password );
                    let encryption_plainbuffer = password_aes.decryptHexToBuffer( wallet.encryption_key );
                    aes_private = Aes.fromSeed( encryption_plainbuffer );
                }
                return true;
            } catch(e) {
                console.error(e);
                return false;
            }
        }
    }

    /** This may lock the wallet unless <b>unlock</b> is used. */
    changePassword( old_password, new_password, unlock = false ) {
        return new Promise( resolve => {
            let wallet = this.state.wallet
            if( ! this.validatePassword( old_password ))
                throw new Error("wrong password")

            let old_password_aes = Aes.fromSeed( old_password )
            let new_password_aes = Aes.fromSeed( new_password )

            if( ! wallet.encryption_key)
                // This change pre-dates the live chain..
                throw new Error("This wallet does not support the change password feature.")
            let encryption_plainbuffer = old_password_aes.decryptHexToBuffer( wallet.encryption_key )
            wallet.encryption_key = new_password_aes.encryptToHex( encryption_plainbuffer )

            let new_password_private = PrivateKey.fromSeed( new_password )
            wallet.password_pubkey = new_password_private.toPublicKey().toPublicKeyString()

            if( unlock ) {
                aes_private = Aes.fromSeed( encryption_plainbuffer )
            } else {
                // new password, make sure the wallet gets locked
                aes_private = null
            }
            resolve( this.setWalletModified() )
        })
    }

    /** @throws "missing brainkey", "wallet locked"
        @return { private_key, sequence }
    */
    generateNextKey(save = true) {
        if (this.generatingKey) return;
        this.generatingKey = true;
        let brainkey = this.getBrainKey()
        let wallet = this.state.wallet
        let sequence = Math.max(wallet.brainkey_sequence, 0);
        let used_sequence = null
        // Skip ahead in the sequence if any keys are found in use
        // Slowly look ahead (1 new key per block) to keep the wallet fast after unlocking
        this.brainkey_look_ahead = Math.min(10, (this.brainkey_look_ahead || 0) + 1)
        /* If sequence is 0 this is the first lookup, so check at least the first 10 positions */
        const loopMax = !sequence ? Math.max(sequence + this.brainkey_look_ahead, 10) : sequence + this.brainkey_look_ahead;
        // console.log("generateNextKey, save:", save, "sequence:", sequence, "loopMax", loopMax, "brainkey_look_ahead:", this.brainkey_look_ahead);

        for (let i = sequence; i < loopMax; i++) {
            let private_key = key.get_brainPrivateKey( brainkey, i )
            let pubkey =
                this.generateNextKey_pubcache[i] ?
                this.generateNextKey_pubcache[i] :
                this.generateNextKey_pubcache[i] =
                private_key.toPublicKey().toPublicKeyString()
            let next_key = ChainStore.getAccountRefsOfKey( pubkey );
            // TODO if ( next_key === undefined ) return undefined

            /* If next_key exists, it means the generated private key controls an account, so we need to save it */
            if(next_key && next_key.size) {
                used_sequence = i
                console.log("WARN: Private key sequence " + used_sequence + " in-use. " +
                    "I am saving the private key and will go onto the next one.")
                this.saveKey( private_key, used_sequence );
                // this.brainkey_look_ahead++;
            }
        }
        if(used_sequence !== null) {
            wallet.brainkey_sequence = used_sequence + 1
            this._updateWallet()
        }
        sequence = Math.max(wallet.brainkey_sequence, 0);
        let private_key = key.get_brainPrivateKey( brainkey, sequence )
        if( save && private_key ) {
            // save deterministic private keys ( the user can delete the brainkey )
            // console.log("** saving a key and incrementing brainkey sequence **")
            this.saveKey( private_key, sequence )
            //TODO  .error( error => ErrorStore.onAdd( "wallet", "saveKey", error ))
            this.incrementBrainKeySequence()
        }
        this.generatingKey = false;
        return { private_key, sequence }
    }

    incrementBrainKeySequence( transaction ) {
        let wallet = this.state.wallet;
        // increment in RAM so this can't be out-of-sync
        wallet.brainkey_sequence ++;
        // update last modified
        return this._updateWallet( transaction );
        //TODO .error( error => ErrorStore.onAdd( "wallet", "incrementBrainKeySequence", error ))
    }

    decrementBrainKeySequence() {
        let wallet = this.state.wallet;
        // increment in RAM so this can't be out-of-sync
        wallet.brainkey_sequence = Math.max(0, wallet.brainkey_sequence - 1);
        return this._updateWallet();
    }

    resetBrainKeySequence() {
        let wallet = this.state.wallet
        // increment in RAM so this can't be out-of-sync
        wallet.brainkey_sequence = 0;
        console.log("reset sequence", wallet.brainkey_sequence);
        // update last modified
        return this._updateWallet()
    }

/* cyj delete 20171024
        //导入秘钥
    importKeysWorker(private_key_objs) {
        return new Promise( (resolve, reject) => {
            let pubkeys = []
            for(let private_key_obj of private_key_objs)
                pubkeys.push( private_key_obj.public_key_string )
            let addyIndexPromise = AddressIndex.addAll(pubkeys)

            let private_plainhex_array = []
            for(let private_key_obj of private_key_objs) {
                private_plainhex_array.push( private_key_obj.private_plainhex );
            }
            if (!__ELECTRON__) {
                AesWorker = require("worker-loader!workers/AesWorker");
            }
            let worker = new AesWorker
            worker.postMessage({
                private_plainhex_array,
                key: aes_private.key, iv: aes_private.iv
            })
            let _this = this
            this.setState({ saving_keys: true })
            worker.onmessage = event => { try {
                console.log("Preparing for private keys save");
                let private_cipherhex_array = event.data
                let enc_private_key_objs = []
                for(let i = 0; i < private_key_objs.length; i++) {
                    let private_key_obj = private_key_objs[i]
                    let {import_account_names, public_key_string, private_plainhex} = private_key_obj
                    let private_cipherhex = private_cipherhex_array[i]
                    if( ! public_key_string) {
                        // console.log('WARN: public key was not provided, this will incur slow performance')
                        let private_key = PrivateKey.fromHex(private_plainhex)
                        let public_key = private_key.toPublicKey() // S L O W
                        public_key_string = public_key.toPublicKeyString()
                    } else
                        if(public_key_string.indexOf(ChainConfig.address_prefix) != 0)
                            throw new Error("Public Key should start with " + ChainConfig.address_prefix)

                    let private_key_object = {
                        import_account_names,
                        encrypted_key: private_cipherhex,
                        pubkey: public_key_string
                        // null brainkey_sequence
                    }
                    enc_private_key_objs.push(private_key_object)
                }
                console.log("Saving private keys", new Date().toString());
                let transaction = _this.transaction_update_keys()
                let insertKeysPromise = idb_helper.on_transaction_end(transaction)
                try {
                    let duplicate_count = PrivateKeyStore
                        .addPrivateKeys_noindex(enc_private_key_objs, transaction )
                    if( private_key_objs.length != duplicate_count )
                        _this.setWalletModified(transaction)
                    _this.setState({saving_keys: false})
                    resolve(Promise.all([ insertKeysPromise, addyIndexPromise ]).then( ()=> {
                        console.log("Done saving keys", new Date().toString())
                        // return { duplicate_count }
                    }))
                } catch(e) {
                    transaction.abort()
                    console.error(e)
                    reject(e)
                }
            } catch( e ) { console.error('AesWorker.encrypt', e) }}
        })
    }
    
*/

    saveKeys(private_keys, transaction, public_key_string) {
        let promises = []
        for(let private_key_record of private_keys) {
            promises.push( this.saveKey(
                private_key_record.private_key,
                private_key_record.sequence,
                null, //import_account_names
                public_key_string,
                transaction
            ))
        }
        return Promise.all(promises)
    }

    saveKey(
        private_key,
        brainkey_sequence,
        import_account_names,
        public_key_string,
        transaction = this.transaction_update_keys()
    ) {
        let private_cipherhex = aes_private.encryptToHex( private_key.toBuffer() )
        let wallet = this.state.wallet
        if( ! public_key_string) {
            //S L O W
            // console.log('WARN: public key was not provided, this may incur slow performance')
            let public_key = private_key.toPublicKey()
            public_key_string = public_key.toPublicKeyString()
        } else
            if(public_key_string.indexOf(ChainConfig.address_prefix) != 0)
                throw new Error("Public Key should start with " + ChainConfig.address_prefix)

        let private_key_object = {
            import_account_names,
            encrypted_key: private_cipherhex,
            pubkey: public_key_string,
            brainkey_sequence
        }
        /* cyj delete 20171024
        let p1 = PrivateKeyActions.addKey(
            private_key_object, transaction
        ).then((ret)=> {
            if(TRACE) console.log('... WalletDb.saveKey result',ret.result)
            return ret
        })
        */

        let p1 = Promise.all([PrivateKeyStore.onAddKey({private_key_object, transaction}), AccountRefsStore.onAddPrivateKey({private_key_object})]).then((ret)=> {
            if(TRACE) console.log('... WalletDb.saveKey result',ret[0].result)
            return ret[0];
        })

        // let p1 = PrivateKeyStore.onAddKey({private_key_object, transaction}).then((ret)=>{
        //         AccountRefsStore.onAddPrivateKey({private_key_object});
        //         return ret[0];
        //     })
        return p1
    }

    setWalletModified(transaction) {
        return this._updateWallet( transaction )
    }

    setBackupDate() {
        let wallet = this.state.wallet
        wallet.backup_date = new Date()
        return this._updateWallet()
    }

    setBrainkeyBackupDate() {
        let wallet = this.state.wallet
        wallet.brainkey_backup_date = new Date()
        return this._updateWallet()
    }

    /** Saves wallet object to disk.  Always updates the last_modified date. */
    _updateWallet(transaction = this.transaction_update()) {
        let wallet = this.state.wallet
        if ( ! wallet) {
            reject("missing wallet")
            return
        }
        //DEBUG console.log('... wallet',wallet)
        let wallet_clone = cloneDeep( wallet )
        wallet_clone.last_modified = new Date()

        WalletTcomb(wallet_clone) // validate

        let wallet_store = transaction.objectStore("wallet")
        let p = idb_helper.on_request_end( wallet_store.put(wallet_clone) )
        let p2 = idb_helper.on_transaction_end( transaction  ).then( () => {
            this.state.wallet = wallet_clone
            
        })
        return Promise.all([p,p2])
    }

    /** This method may be called again should the main database change */
    loadDbData() {
        return idb_helper.cursor("wallet", cursor => {
            if( ! cursor) return false
            let wallet = cursor.value
            // Convert anything other than a string or number back into its proper type
            wallet.created = new Date(wallet.created)
            wallet.last_modified = new Date(wallet.last_modified)
            wallet.backup_date = wallet.backup_date ? new Date(wallet.backup_date) : null
            wallet.brainkey_backup_date = wallet.brainkey_backup_date ? new Date(wallet.brainkey_backup_date) : null
            try { WalletTcomb(wallet) } catch(e) {
                console.log("WalletDb format error", e); return Promise.reject(new Error("WalletDb format error " + e));  
}
            this.state.wallet = wallet
            
            return false //stop iterating
        });
    }

}

var WalletDbIns = WalletDb.getInstance();
export default WalletDbIns;

function reject(error) {
    console.error( "----- WalletDb reject error -----", error)
    throw new Error(error)
}
