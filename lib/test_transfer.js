"use strict";

var _es = require("zosjs/es");

var _newpayWalletJs = require("newpay-wallet-js");

//初始化

//

//

var application_api = new _newpayWalletJs.ApplicationApi();
application_api.transfer(_es.ChainStore.getAccount("from_account"), _es.ChainStore.getAccount("to_account"), 1 * 100000, "1.3.0", new Buffer("备注信息", "utf-8"), null, "1.3.0").then(function () {
	console.log("Transfer success!");
}).catch(function (error) {
	console.log("[AccountActions.js:90] ----- transfer error ----->", error);
	return Promise.reject(error);
});