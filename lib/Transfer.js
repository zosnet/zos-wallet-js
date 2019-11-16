// //根据Transfer.jsx改造
// import AccountStore from "./AccountStore.js";
// import { checkFeeStatusAsync, checkBalance } from "./lib/common/trxHelper.js";
// import utils from "./lib/common/utils.js";
// import Immutable from "immutable";
// import {ChainStore} from "bitsharesjs/es";
// import { debounce } from "lodash";
// import { Asset } from "./lib/common/MarketClasses.js";
// import ApplicationApi from "api/ApplicationApi";

// let application_api = new ApplicationApi();

// class Transfer{
// 	//考虑什么时候让前端传参数，如：from用户名，to用户名，备注，金额

// 	constructor() {
//         this.state = this.getInitialState();
//         let currentAccount = AccountStore.getState().currentAccount;
//         if (!this.state.from_name) this.state.from_name = currentAccount;
//         Apis.instance().db_api().exec("get_full_accounts", [[this.state.from_name], true]).then((res)=>{
//             this.state.from_account = res[0][1];
//         });
//         //this._updateFee = debounce(this._updateFee.bind(this), 250);
//         //this._checkFeeStatus = this._checkFeeStatus.bind(this);
//         //this._checkBalance = this._checkBalance.bind(this);
//     }

//     getInitialState() {
//         return {
//             from_name: "",
//             to_name: "",
//             from_account: null,//
//             //to_account: null,  //可以不用
//             amount: "",//
//             asset_id: null,
//             asset: null,//
//             memo: "",//
//             error: null,//
//             propose: false,
//             propose_account: "",
//             feeAsset: null,
//             fee_asset_id: "1.3.0",//
//             feeAmount: new Asset({amount: 0}),//
//             feeStatus: {},
//             asset_types: [],
//             fee_asset_types: [],
//         };

//     }

//     //更新手续费
//     //参数: fee_asset_id:1.3.0
//     _updateFee(fee_asset_id = this.state.fee_asset_id) {
//         if (!this.state.from_account) return null;
//         console.log("fee_asset_id",fee_asset_id);
//         checkFeeStatusAsync({
//             accountID: this.state.from_account.account.id,//this.state.from_account.get("id"),
//             feeID: fee_asset_id,
//             options: ["price_per_kbyte"],
//             data: {
//                 type: "memo",
//                 content: this.state.memo
//             }
//         })
//         .then(({fee, hasBalance, hasPoolBalance}) => {

//             this.state.feeAmount = fee;
//             this.state.fee_asset_id = fee.asset_id;
//             this.state.hasBalance = hasBalance,
//             this.state.error = (!hasBalance || !hasPoolBalance);
//             this._checkFeeStatus;

//         });
//     }

//     _checkFeeStatus(account = this.state.from_account) {
//         if (!account) return;

//         const assets = Object.keys(this.state.from_account.get("balances").toJS()).sort(utils.sortID);
//         let feeStatus = {};
//         let p = [];
//         assets.forEach(a => {
//             p.push(checkFeeStatusAsync({
//                 accountID: account.get("id"),
//                 feeID: a,
//                 options: ["price_per_kbyte"],
//                 data: {
//                     type: "memo",
//                     content: this.state.memo
//                 }
//             }));
//         });
//         Promise.all(p).then(status => {
//             assets.forEach((a, idx) => {
//                 feeStatus[a] = status[idx];
//             });
//             if (!utils.are_equal_shallow(this.state.feeStatus, feeStatus)) {

//                 this.state.feeStatus = feeStatus;
//             }
//             this._checkBalance();
//         }).catch(err => {
//             console.error(err);
//         });
//     }

//     //检测余额
//     //注意asset的获取
//     _checkBalance() {
//         const {feeAmount, amount, from_account, asset_id} = this.state;
//         if (!asset_id) return;
//         const balanceID = from_account.getIn(["balances", asset_id]);
//         const feeBalanceID = from_account.getIn(["balances", feeAmount.asset_id]);
//         if (!asset_id || ! from_account) return;
//         if (!balanceID) return this.state.balanceError = true;
//         let balanceObject = ChainStore.getObject(balanceID);
//         let feeBalanceObject = feeBalanceID ? ChainStore.getObject(feeBalanceID) : null;
//         if (!feeBalanceObject || feeBalanceObject.get("balance") === 0) {
//             this._updateFee("1.3.0");
//         }
//         let asset = ChainStore.getAsset(asset_id)
//         const hasBalance = checkBalance(amount, asset, feeAmount, balanceObject);
//         if (hasBalance === null) return;
//         this.state.balanceError = !hasBalance
//     }

//     //改变发送者名字(暂时不提供这个功能)
//     fromChanged(from_name) {
//         if (!from_name) 
//         	this.state.from_account = null;
//         this.state.from_name = from_name;
//         this.error = null;
//         this.propose = false;
//         this.propose_account = "";
//     }

//     //改变接收者名字
//     toChanged(to_name) {
//         this.state.to_name = null;
//     }

//     //当金额和单位改变时出发，此asset为id,类似：1.3.0
//     onAmountChanged(amount, asset_id) {
//         if (!asset) {
//             return;
//         }

//         this.state.amount = amount;
//         this.state.asset_id = asset_id;
//         //this.state.asset_id = asset.get("id");
//         this.state.error = null;
//         this._checkBalance();
//     }

//     //当手续费单位改变时,检测手续费:_updateFee
//     onFeeChanged(asset_id) {
//     	this.state.fee_asset_id = asset_id;
//     	//this.state.fee_asset_id = ee_asset_id: asset.get("id");
//     	this.state.error = null;
//     	this._updateFee();
//     }

//     //备注改变时,更新手续费
//     onMemoChanged(value) {
//         this.state.memo = value;
//         this._updateFee();
//     }

//     //获取金额单位(数组)和手续费单位(数组),返回类似数组:{["1.3.0", "1.3.1538"],["1.3.0", "1.3.1538"]}
//     _getAvailableAssets(state = this.state) {
//         //feeStatus, from_account, from_error
//         const { feeStatus } = this.state;
//         function hasFeePoolBalance(id) {
//             return feeStatus[id] && feeStatus[id].hasPoolBalance;
//         }

//         function hasBalance(id) {
//             return feeStatus[id] && feeStatus[id].hasBalance;
//         }

//         const { from_account, from_error } = state;
//         let asset_types = [], fee_asset_types = [];
//         if (!(from_account && from_account.get("balances") && !from_error)) {
//             return {asset_types, fee_asset_types};
//         }
//         let account_balances = state.from_account.get("balances").toJS();
//         asset_types = Object.keys(account_balances).sort(utils.sortID);
//         fee_asset_types = Object.keys(account_balances).sort(utils.sortID);
//         for (let key in account_balances) {
//             let balanceObject = ChainStore.getObject(account_balances[key]);
//             if (balanceObject && balanceObject.get("balance") === 0) {
//                 asset_types.splice(asset_types.indexOf(key), 1);
//                 if (fee_asset_types.indexOf(key) !== -1) {
//                     fee_asset_types.splice(fee_asset_types.indexOf(key), 1);
//                 }
//             }
//         }

//         fee_asset_types = fee_asset_types.filter(a => {
//             return hasFeePoolBalance(a) && hasBalance(a);
//         });
//         //return {asset_types, fee_asset_types};
//         this.state.asset_types = asset_types;
//         this.state.fee_asset_types = fee_asset_types;
//     }
// }

// export default Transfer;
"use strict";