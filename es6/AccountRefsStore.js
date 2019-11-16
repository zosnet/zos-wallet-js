import iDB from "./idb-instance.js";
import Immutable from "immutable";
import {ChainStore} from "zosjs/es";
import {Apis} from "zosjs-ws";
import PrivateKeyStore from "./PrivateKeyStore.js";
import {clone} from "lodash";
//import PrivateKeyActions from "actions/PrivateKeyActions";

class AccountRefsStore {

    constructor() {
        this.state = this._getInitialState()
        /* cyj delete 20171023
        this.bindListeners({ onAddPrivateKey: PrivateKeyActions.addKey })
        */
        this.no_account_refs = Immutable.Set() // Set of account ids
        ChainStore.subscribe(this.chainStoreUpdate.bind(this))
    }
    
    static getInstance() {
    	if (!AccountRefsStore.instance) {
    	  	AccountRefsStore.instance = new AccountRefsStore();
    	}
    	return AccountRefsStore.instance;
  	}	

		getState(){
			return clone( this.state,false );
		}
    _getInitialState() {
        this.chainstore_account_ids_by_key = null
        return {
            account_refs: Immutable.Set()
            // loading_account_refs: false
        }
    }

    onAddPrivateKey({private_key_object}) {
        if(ChainStore.getAccountRefsOfKey(private_key_object.pubkey) !== undefined){
            this.chainStoreUpdate()
        }
    }

    //从idb.root里加载key等于no_account_refs_4018d784的值,并将值赋给this.no_account_refs
    //循环PrivateKeyStore.key, 将获取的account_refs赋值给this.account_refs, no_account_refs 赋值给this.no_account_refs,并保存no_account_refs到表里
    loadDbData() {
        // this.setState(this._getInitialState())
        this.chainstore_account_ids_by_key = null;
        this.state = {account_refs: Immutable.Set()};
        return loadNoAccountRefs()
            .then( no_account_refs => this.no_account_refs = no_account_refs )
            .then( ()=> this.chainStoreUpdate() );
    }

    chainStoreUpdate() {
        if(this.chainstore_account_ids_by_key === ChainStore.account_ids_by_key) return
        this.chainstore_account_ids_by_key = ChainStore.account_ids_by_key
        this.checkPrivateKeyStore()
    }

    checkPrivateKeyStore() {
        var no_account_refs = this.no_account_refs
        var account_refs = Immutable.Set()
        PrivateKeyStore.getState().keys.keySeq().forEach( pubkey => {
            if(no_account_refs.has(pubkey)) return
            var refs = ChainStore.getAccountRefsOfKey(pubkey)
            if(refs === undefined) return
            if( ! refs.size) {
                // Performance optimization...
                // There are no references for this public key, this is going
                // to block it.  There many be many TITAN keys that do not have
                // accounts for example.
                {
                    // Do Not block brainkey generated keys.. Those are new and
                    // account references may be pending.
                    var private_key_object = PrivateKeyStore.getState().keys.get(pubkey)
                    if( typeof private_key_object.brainkey_sequence === 'number' ) {
                        return
                    }
                }
                no_account_refs = no_account_refs.add(pubkey)
                return
            }
            account_refs = account_refs.add(refs.valueSeq())
        })
        account_refs = account_refs.flatten()
        if( ! this.state.account_refs.equals(account_refs)) {
            // console.log("AccountRefsStore account_refs",account_refs.size);
            this.state.account_refs = account_refs;
        }
        if(!this.no_account_refs.equals(no_account_refs)) {
            this.no_account_refs = no_account_refs
            saveNoAccountRefs(no_account_refs)
        }
    }

}

var AccountRefsStoreIns = AccountRefsStore.getInstance();
export default AccountRefsStoreIns;

/*
*  Performance optimization for large wallets, no_account_refs tracks pubkeys
*  that do not have a corresponding account and excludes them from future api calls
*  to get_account_refs. The arrays are stored in the indexed db, one per chain id
*/
function loadNoAccountRefs() {
    let chain_id = Apis.instance().chain_id;
    let refKey = `no_account_refs${!!chain_id ? ("_" + chain_id.substr(0, 8)) : ""}`;
    return iDB.root.getProperty(refKey, [])
        .then( array => Immutable.Set(array) );
}

function saveNoAccountRefs(no_account_refs) {
    let array = [];
    let chain_id = Apis.instance().chain_id;
    let refKey = `no_account_refs${!!chain_id ? ("_" + chain_id.substr(0, 8)) : ""}`;
    for(let pubkey of no_account_refs) array.push(pubkey);
    iDB.root.setProperty(refKey, array);
}
