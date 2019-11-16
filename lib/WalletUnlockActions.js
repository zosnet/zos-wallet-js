"use strict";

Object.defineProperty(exports, "__esModule", {
    value: true
});

var _createClass = function () { function defineProperties(target, props) { for (var i = 0; i < props.length; i++) { var descriptor = props[i]; descriptor.enumerable = descriptor.enumerable || false; descriptor.configurable = true; if ("value" in descriptor) descriptor.writable = true; Object.defineProperty(target, descriptor.key, descriptor); } } return function (Constructor, protoProps, staticProps) { if (protoProps) defineProperties(Constructor.prototype, protoProps); if (staticProps) defineProperties(Constructor, staticProps); return Constructor; }; }();

function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } }

var WalletUnlockActions = function () {
    function WalletUnlockActions() {
        _classCallCheck(this, WalletUnlockActions);
    }

    _createClass(WalletUnlockActions, [{
        key: "unlock",
        value: function unlock() {
            return new Promise(function (resolve, reject) {
                resolve();
            }).then(function (was_unlocked) {
                //DEBUG console.log('... WalletUnlockStore\tmodal unlock')
                if (was_unlocked) WalletUnlockActionsIns.change();
            });
        }
    }, {
        key: "lock",
        value: function lock() {
            return new Promise(function (resolve) {
                resolve();
            }).then(function (was_unlocked) {
                if (was_unlocked) WalletUnlockActionsIns.change();
            });
        }
    }, {
        key: "cancel",
        value: function cancel() {
            return true;
        }
    }, {
        key: "change",
        value: function change() {
            return true;
        }
    }, {
        key: "checkLock",
        value: function checkLock() {
            return true;
        }
    }], [{
        key: "getInstance",


        /** If you get resolved then the wallet is or was just unlocked.  If you get
            rejected then the wallet is still locked.
             @return nothing .. Just test for resolve() or reject()
        */

        value: function getInstance() {
            if (!WalletUnlockActions.instance) {
                WalletUnlockActions.instance = new WalletUnlockActions();
            }
            return WalletUnlockActions.instance;
        }
    }]);

    return WalletUnlockActions;
}();

var WalletUnlockActionsIns = WalletUnlockActions.getInstance();
exports.default = WalletUnlockActionsIns;