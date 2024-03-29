import Immutable from "immutable"
import idb_helper from "./idb-helper.js"
import WalletDb from "./WalletDb.js"

import {PrivateKeyTcomb} from "./tcomb_structs"
//import PrivateKeyActions from "./PrivateKeyActions.js";
//import CachedPropertyActions from "./CachedPropertyActions.js";
import AddressIndex from "./AddressIndex.js"
import {PublicKey, PrivateKey, ChainStore, Aes} from "zosjs/es"
import {clone} from "lodash"

/** No need to wait on the promises returned by this store as long as
    this.state.privateKeyStorage_error == false and
    this.state.pending_operation_count == 0 before performing any important
    operations.
*/

let memo_fixe_private = PrivateKey.fromWif("5K3DH7oDxHe6kKjuNFUHm2qQYuYYLm9ECsmUVm2Bf4cq6Ykr8fz")
let memo_fixe_public = memo_fixe_private.toPublicKey().toString()

class PrivateKeyStore {

  constructor() {
    this.state = this._getInitialState()
    this.pending_operation_count = 0
    /* cyj delete 20171023
        this.bindListeners({
            onLoadDbData: PrivateKeyActions.loadDbData,
            onAddKey: PrivateKeyActions.addKey
        });
        */
        
  }
    
  static getInstance() {
    	if (!PrivateKeyStore.instance) {
    	  	PrivateKeyStore.instance = new PrivateKeyStore()
    	}
    	return PrivateKeyStore.instance
  	}	

  _getInitialState() {
    return {
      keys: Immutable.Map(),
      privateKeyStorage_error: false,
      pending_operation_count: 0,
      privateKeyStorage_error_add_key: null,
      privateKeyStorage_error_loading: null
    }
  }
    
  getState(){
    return clone( this.state,false )
  }

  setPasswordLoginKey(key) {
    let keys = this.state.keys.set(key.pubkey, key)
        
    this.state.keys = keys
  }

  //将表private_keys的value列的数据中的pubkey存到AddressIndex中.
  /** This method may be called again should the main database change */
  onLoadDbData() {//resolve is deprecated
    this.pendingOperation()
    this.state = this._getInitialState()
    let keys = Immutable.Map().asMutable()
    let p = idb_helper.cursor("private_keys", cursor => {
      if( ! cursor) {
        this.state.keys = keys.asImmutable()
        return;
      }
      let private_key_tcomb = PrivateKeyTcomb(cursor.value)
      keys.set(private_key_tcomb.pubkey, private_key_tcomb)
      AddressIndex.add(private_key_tcomb.pubkey)
      cursor.continue()
    }).then(()=>{
      this.pendingOperationDone()
    }).catch( error => {
      this.state = this._getInitialState()
      this.privateKeyStorageError("loading", error)
      throw error
    })
    return p 
  }

  hasKey(pubkey) {
    return this.state.keys.has(pubkey)
  }

  getPubkeys() {
    return this.state.keys.keySeq().toArray()
  }

  getPubkeys_having_PrivateKey(pubkeys, addys = null) {
    let return_pubkeys = []
    if(pubkeys) {
      for(let pubkey of pubkeys) {
        if(this.hasKey(pubkey)) {
          return_pubkeys.push(pubkey)
        }
      }
    }
    if(addys) {
      let addresses = AddressIndex.getState().addresses
      for (let addy of addys) {
        let pubkey = addresses.get(addy)
        return_pubkeys.push(pubkey)
      }
    }
    return return_pubkeys
  }

  getTcomb_byPubkey(public_key) {
    if(! public_key) return null
    if(public_key.Q)
      public_key = public_key.toPublicKeyString()     
    if(public_key === memo_fixe_public) return memo_fixe_private
    return this.state.keys.get(public_key)
  }

  onAddKey({private_key_object, transaction}) {// resolve is deprecated
    if (this.state.keys.has(private_key_object.pubkey)) {
      return ({result:"duplicate",id:null})
    }

    this.pendingOperation()
    // console.log("... onAddKey private_key_object.pubkey", private_key_object.pubkey)

    this.state.keys = this.state.keys.set(
      private_key_object.pubkey,
      PrivateKeyTcomb(private_key_object)
    )
    // this.setState({keys: this.state.keys});
    this.state.keys = this.state.keys
    AddressIndex.add(private_key_object.pubkey)
    let p = new Promise((resolve, reject) => {
      PrivateKeyTcomb(private_key_object)
      let duplicate = false
      let p = idb_helper.add(
        transaction.objectStore("private_keys"),
        private_key_object
      )

      p.catch( event => {
        // ignore_duplicates
        let error = event.target.error
        console.log("... error", error, event)
        if( error.name != "ConstraintError" ||
                    error.message.indexOf("by_encrypted_key") == -1
        ) {
          this.privateKeyStorageError("add_key", error)
          throw event
        }
        duplicate = true
        event.preventDefault()
      }).then( ()=> {
        this.pendingOperationDone()
        if(duplicate) return {result:"duplicate",id:null}
        if( private_key_object.brainkey_sequence == null)
          this.binaryBackupRecommended() // non-deterministic
        idb_helper.on_transaction_end(transaction).then(
          () => { this.state.keys = this.state.keys } )
        return {
          result: "added",
          id: private_key_object.id
        }
      })
      resolve(p)
    })
    return p
  }


  /** WARN: does not update AddressIndex.  This is designed for bulk importing.
        @return duplicate_count
    */
  addPrivateKeys_noindex(private_key_objects, transaction) {
    let store = transaction.objectStore("private_keys")
    let duplicate_count = 0
    let keys = this.state.keys.withMutations( keys => {
      for(let private_key_object of private_key_objects) {
        if(this.state.keys.has(private_key_object.pubkey)) {
          duplicate_count++
          continue;
        }
        let private_tcomb = PrivateKeyTcomb(private_key_object)
        store.add( private_key_object )
        keys.set( private_key_object.pubkey, private_tcomb )
        ChainStore.getAccountRefsOfKey(private_key_object.pubkey)
      }
    })
        
    this.state.keys = keys
    this.binaryBackupRecommended()
    return duplicate_count
  }

  //脑钥备份 cyj delete 暂时用不到
  /*
    binaryBackupRecommended() {
        CachedPropertyActions.set("backup_recommended", true);
    }
*/
  pendingOperation() {
    this.pending_operation_count++
    this.state.pending_operation_count = this.pending_operation_count
  }

  pendingOperationDone() {
    if(this.pending_operation_count == 0)
      throw new Error("Pending operation done called too many times")
    this.pending_operation_count--
    this.state.pending_operation_count = this.pending_operation_count
  }

  privateKeyStorageError(property, error) {
    this.pendingOperationDone()
    let state = { privateKeyStorage_error: true }
    state["privateKeyStorage_error_" + property] = error
    console.error("privateKeyStorage_error_" + property, error)
    this.state = state
  }
  stringToByte (strsend) {
    if(strsend.length <=0) return "";
    let str = new String(strsend)
    var bytes = new Array()
    var len, c
    len = str.length
    for (var i = 0; i < len; i++) {
      c = str.charCodeAt(i)
      if (c >= 0x010000 && c <= 0x10FFFF) {
        bytes.push(((c >> 18) & 0x07) | 0xF0)
        bytes.push(((c >> 12) & 0x3F) | 0x80)
        bytes.push(((c >> 6) & 0x3F) | 0x80)
        bytes.push((c & 0x3F) | 0x80)
      } else if (c >= 0x000800 && c <= 0x00FFFF) {
        bytes.push(((c >> 12) & 0x0F) | 0xE0)
        bytes.push(((c >> 6) & 0x3F) | 0x80)
        bytes.push((c & 0x3F) | 0x80)
      } else if (c >= 0x000080 && c <= 0x0007FF) {
        bytes.push(((c >> 6) & 0x1F) | 0xC0)
        bytes.push((c & 0x3F) | 0x80)
      } else {
        bytes.push(c & 0xFF)
      }
    }
    var ret = ''
    for (var ii = 0; ii < bytes.length; ii++) {
      ret += Number(bytes[ii]).toString(16)
    }
    // console.log(ret)
    return ret
  }
  byteToString (arr) {
    if (arr.length <= 0) return "";
    var _arr = new Array();;
    for (var l = 0; l < arr.length; l += 2) {
      let hex = arr[l] + arr[l + 1]
      let val = parseInt(hex, 16)
      _arr.push(val)
    }

    var str = ''
    for (var i = 0; i < _arr.length; i++) {
      var one = _arr[i].toString(2)
      var v = one.match(/^1+?(?=0)/)
      if (v && one.length === 8) {
        var bytesLength = v[0].length
        var store = _arr[i].toString(2).slice(7 - bytesLength)
        for (var st = 1; st < bytesLength; st++) {
          store += _arr[st + i].toString(2).slice(2)
        }
        str += String.fromCharCode(parseInt(store, 2))
        i += bytesLength - 1
      } else {
        str += String.fromCharCode(_arr[i])
      }
    }
    return str
  }
  decodeMemo_noenc (memo) {
    let memo_text = ''
    let isMine = false
    try {
      memo_text = this.byteToString(memo.message)
    } catch (e) {
      console.log('account memo exception ...', e)
      memo_text = '**'
      isMine = true
    }
    return {
      text: memo_text,
      isMine
    }
  }
  decodeMemo (memo) {
    if (memo.nonce === '34359738367') {
      return this.decodeMemo_noenc(memo.message)
    }
    let lockedWallet = false
    let memo_text = ''
    let isMine = false
    let from_private_key = this.state.keys.get(memo.from)
    let to_private_key = this.state.keys.get(memo.to)
    let private_key = from_private_key ? from_private_key : to_private_key
    let public_key = from_private_key ? memo.to : memo.from
    public_key = PublicKey.fromPublicKeyString(public_key)

    try {
      private_key = WalletDb.decryptTcomb_PrivateKey(private_key)
    } catch (e) {
      // Failed because wallet is locked
      lockedWallet = true
      private_key = null
      isMine = true
    }

    if (private_key) {
      let tryLegacy = false
      try {
        memo_text = private_key ? Aes.decrypt_with_checksum(
          private_key,
          public_key,
          memo.nonce,
          memo.message
        ).toString('utf-8') : null

        if (private_key && !memo_text) {
          // debugger
        }
      } catch (e) {
        console.log('account memo exception ...', e)
        memo_text = '*'
        tryLegacy = true
      }

      // Apply legacy method if new, correct method fails to decode
      if (private_key && tryLegacy) {
        // debugger;
        try {
          memo_text = Aes.decrypt_with_checksum(
            private_key,
            public_key,
            memo.nonce,
            memo.message,
            true
          ).toString('utf-8')
        } catch (e) {
          console.log('account memo exception ...', e)
          memo_text = '**'
        }
      }
    }
    return {
      text: memo_text,
      isMine
    }
  }

}

var PrivateKeyStoreIns = PrivateKeyStore.getInstance()
export default PrivateKeyStoreIns
