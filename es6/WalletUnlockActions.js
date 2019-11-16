class WalletUnlockActions {

    /** If you get resolved then the wallet is or was just unlocked.  If you get
        rejected then the wallet is still locked.

        @return nothing .. Just test for resolve() or reject()
    */
    
    static getInstance() {
     if (!WalletUnlockActions.instance) {
        WalletUnlockActions.instance = new WalletUnlockActions();
     }
     return WalletUnlockActions.instance;
   } 
    unlock() {
            return new Promise( (resolve, reject) => {
                resolve();
            }).then( was_unlocked => {
                //DEBUG console.log('... WalletUnlockStore\tmodal unlock')
                if(was_unlocked) 
                    WalletUnlockActionsIns.change();
            });

    }

    lock() {
            return new Promise( resolve => {
                resolve();
            }).then( was_unlocked => {
                if(was_unlocked) WalletUnlockActionsIns.change();
            });
    }

    cancel() {
        return true;
    }

    change() {
        return true;
    }

    checkLock() {
        return true;
    }

}

var WalletUnlockActionsIns = WalletUnlockActions.getInstance();
export default WalletUnlockActionsIns;