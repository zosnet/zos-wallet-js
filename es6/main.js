import {Apis, Manager} from "zosjs-ws";
import iDB from './idb-instance.js';
import {ChainStore, FetchChain} from "zosjs/es";
import WalletManagerStore from './WalletManagerStore.js'
import WalletActions from './WalletActions.js'
import AccountStore from './AccountStore.js'

let connectionString = "wss://bitshares-api.wancloud.io/ws";
let urls = ["wss://bitshares-api.wancloud.io/ws"]

let connectionManager = new Manager({url: connectionString, urls});

connectionManager.connectWithFallback(true).then(() => {
	
	iDB.close();

    iDB.init_instance(indexedDB).init_promise.then(()=>{   //cached_properties, linked_accounts, private_keys, wallet
        WalletManagerStore.init().then(()=>{
            WalletManagerStore.onSetWallet("default2", "cuiyujie123").then(()=> {

                console.log("Congratulations, your wallet was successfully created.");
            
                let accountName = "tmp10084"
                WalletActions.createAccount(
                accountName, null, null, 0, null
                ).then(
                        AccountStore.onCreateAccount(accountName)
                    ).then(() =>{
                           FetchChain("getAccount", name).then(() => {
                                console.log("your account was successfully created."); 
                            });
                       }).catch(error =>{
                          console.log("ERROR AccountActions.createAccount", error);
                            let error_msg = error.base && error.base.length && error.base.length > 0 ? error.base[0] : "unknown error";
                            if (error.remote_ip) error_msg = error.remote_ip[0];
                        })
                    
            }).catch(err => {console.log("CreateWallet failed:", err);})
       })
    })
})
