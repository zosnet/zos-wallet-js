import WalletDb from "./WalletDb.js";
import AccountRefsStore from "./AccountRefsStore.js";
import AccountStore from "./AccountStore.js";
import WalletActions from "./WalletActions.js";
import {ChainStore} from "zosjs/es";
import iDB from "./idb-instance.js";
import Immutable from "immutable";
import PrivateKeyStore from "./PrivateKeyStore.js";

/**  High-level container for managing multiple wallets.
*/
class WalletManagerStore{

    constructor() {
        
        this.state = this._getInitialState()
        /*
        this.bindListeners({
            onRestore: WalletActions.restore,
            onSetWallet: WalletActions.setWallet,
            onSetBackupDate: WalletActions.setBackupDate,
            onSetBrainkeyBackupDate: WalletActions.setBrainkeyBackupDate
        })
        */
    }
    
    static getInstance() {
    	if (!WalletManagerStore.instance) {
    	  	WalletManagerStore.instance = new WalletManagerStore();
    	}
    	return WalletManagerStore.instance;
  	}	

    _getInitialState() {
        return {
            new_wallet: undefined,// pending restore
            current_wallet: undefined,
            wallet_names: Immutable.Set()
        }
    }

    /** This will change the current wallet the newly restored wallet. */
    onRestore({wallet_name, wallet_object}) {
        iDB.restore(wallet_name, wallet_object).then( () => {
            return this.onSetWallet({wallet_name})
        }).catch( error => {
            console.error(error)
            return Promise.reject(error)
        })
    }

    /** This may result in a new wallet name being added, only in this case
        should a <b>create_wallet_password</b> be provided.
    */
    onSetWallet(wallet_name = "default", create_wallet_password, brnkey) {

        var p = new Promise( res => {
            if( /[^a-z0-9_-]/.test(wallet_name) || wallet_name === "" )
                throw new Error("Invalid wallet name")

            if(this.state.current_wallet === wallet_name) {
                res()
                return
            }

            var add
            if( ! this.state.wallet_names.has(wallet_name) ) {
                var wallet_names = this.state.wallet_names.add(wallet_name)
                add = iDB.root.setProperty("wallet_names", wallet_names)
                this.state.wallet_names = this.state.wallet_names;
            }

            var current = iDB.root.setProperty("current_wallet", wallet_name)

            res( Promise.all([ add, current ]).then(()=>{
                // The database must be closed and re-opened first before the current
                // application code can initialize its new state.
                iDB.close()
                ChainStore.clearCache()
                // Stores may reset when loadDbData is called

                return iDB.init_instance().init_promise.then(()=>{
                    // Make sure the database is ready when calling CachedPropertyStore.reset()
                    
                    return Promise.all([
                        WalletDb.loadDbData().then(()=>AccountStore.loadDbData()),
                        PrivateKeyStore.onLoadDbData().then(()=>AccountRefsStore.loadDbData())
                    ]).then(()=>{
                        // Update state here again to make sure listeners re-render

                        if( ! create_wallet_password) {
                            this.state.current_wallet=wallet_name
                            return
                        }

                        return WalletDb.onCreateWallet(
                            create_wallet_password,
                            brnkey, //brainkey,
                            true, //unlock
                            wallet_name
                        ).then(()=>
                            this.state.current_wallet=wallet_name)
                    })
                })
            }))
        }).catch( error => {
            console.log(error)
            return Promise.reject(error)
        })
        return p;
    }

    /** Used by the components during a pending wallet create. */
    setNewWallet(new_wallet) {
        this.state.new_wallet=new_wallet
    }

    init() {
        return iDB.root.getProperty("current_wallet").then(
            current_wallet => {
            return iDB.root.getProperty("wallet_names", []).then( wallet_names => {
                this.state.wallet_names = Immutable.Set(wallet_names);
                this.state.current_wallet = current_wallet;
            })
        })
    }

    onDeleteAllWallets() {
        var deletes = []
        this.state.wallet_names.forEach( wallet_name =>
            deletes.push(this.onDeleteWallet(wallet_name)))
        return Promise.all(deletes)
    }

    onDeleteWallet(delete_wallet_name) {
        return new Promise( resolve => {
            var {current_wallet, wallet_names} = this.state
            if( ! wallet_names.has(delete_wallet_name) ) {
                throw new Error("Can't delete wallet, does not exist in index")
            }
            wallet_names = wallet_names.delete(delete_wallet_name)
            iDB.root.setProperty("wallet_names", wallet_names)
            if(current_wallet === delete_wallet_name) {
                current_wallet = wallet_names.size ? wallet_names.first() : undefined
                iDB.root.setProperty("current_wallet", current_wallet)
            }
            this.state.current_wallet=wallet_names
            var database_name = iDB.getDatabaseName(delete_wallet_name)
            var req = iDB.impl.deleteDatabase(database_name)
            resolve( database_name )
        })
    }

    onSetBackupDate() {
        WalletDb.setBackupDate()
    }

    onSetBrainkeyBackupDate() {
        WalletDb.setBrainkeyBackupDate()
    }

}

var WalletManagerStoreWrapped = WalletManagerStore.getInstance();
export default WalletManagerStoreWrapped
