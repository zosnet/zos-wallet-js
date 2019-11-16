import {ChainStore} from "zosjs/es";
import {ApplicationApi} from 'newpay-wallet-js';


//初始化

//

//

let application_api = new ApplicationApi();
application_api.transfer(
	ChainStore.getAccount("from_account"), 
	ChainStore.getAccount("to_account"), 
	1*100000, 
	"1.3.0", 
	new Buffer("备注信息", "utf-8"),
	null,
	"1.3.0"
	).then(()=>{
		console.log("Transfer success!");
	}).catch(error => {
		console.log("[AccountActions.js:90] ----- transfer error ----->", error);
		return Promise.reject(error)
	})