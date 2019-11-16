"use strict";

Object.defineProperty(exports, "__esModule", {
    value: true
});

var _createClass = function () { function defineProperties(target, props) { for (var i = 0; i < props.length; i++) { var descriptor = props[i]; descriptor.enumerable = descriptor.enumerable || false; descriptor.configurable = true; if ("value" in descriptor) descriptor.writable = true; Object.defineProperty(target, descriptor.key, descriptor); } } return function (Constructor, protoProps, staticProps) { if (protoProps) defineProperties(Constructor.prototype, protoProps); if (staticProps) defineProperties(Constructor, staticProps); return Constructor; }; }();

var _idbInstance = require("./idb-instance.js");

var _idbInstance2 = _interopRequireDefault(_idbInstance);

var _es = require("zosjs/es");

var _zosjsWs = require("zosjs-ws");

var _immutable = require("immutable");

var _immutable2 = _interopRequireDefault(_immutable);

var _lodash = require("lodash");

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } }

/* cyj delete 20171024 
let AddressIndexWorker;
if (__ELECTRON__) {
    AddressIndexWorker = require("worker-loader?inline!workers/AddressIndexWorker");
}
*/
var AddressIndex = function () {
    function AddressIndex() {
        _classCallCheck(this, AddressIndex);

        this.state = {
            addresses: _immutable2.default.Map(),
            saving: false
        };
        this.pubkeys = new Set();
        // loadAddyMap is for debugging, this.add will load this on startup
        //this._export("add", "addAll", "loadAddyMap");
    }

    _createClass(AddressIndex, [{
        key: "getState",
        value: function getState() {
            return (0, _lodash.clone)(this.state, false);
        }
    }, {
        key: "saving",
        value: function saving() {
            if (this.state.saving) return;
            this.state.saving = true;
        }

        /** Add public key string (if not already added).  Reasonably efficient
            for less than 10K keys.
        */

    }, {
        key: "add",
        value: function add(pubkey) {
            var _this = this;

            this.loadAddyMap().then(function () {
                var dirty = false;
                if (_this.pubkeys.has(pubkey)) return;
                _this.pubkeys.add(pubkey);
                _this.saving();
                // Gather all 5 legacy address formats (see key.addresses)
                var address_strings = _es.key.addresses(pubkey);
                var _iteratorNormalCompletion = true;
                var _didIteratorError = false;
                var _iteratorError = undefined;

                try {
                    for (var _iterator = address_strings[Symbol.iterator](), _step; !(_iteratorNormalCompletion = (_step = _iterator.next()).done); _iteratorNormalCompletion = true) {
                        var address = _step.value;

                        _this.state.addresses = _this.state.addresses.set(address, pubkey);
                        dirty = true;
                    }
                } catch (err) {
                    _didIteratorError = true;
                    _iteratorError = err;
                } finally {
                    try {
                        if (!_iteratorNormalCompletion && _iterator.return) {
                            _iterator.return();
                        }
                    } finally {
                        if (_didIteratorError) {
                            throw _iteratorError;
                        }
                    }
                }

                if (dirty) {

                    _this.saveAddyMap();
                } else {
                    _this.state.saving = false;
                }
            }).catch(function (e) {
                throw e;
            });
        }

        /** Worker thread implementation (for more than 10K keys) */
        /*  cyj delete 20171024 
            addAll(pubkeys) {
                return new Promise( (resolve, reject) => {
                    this.saving();
                    this.loadAddyMap().then( () => {
                        if (!__ELECTRON__) {
                            AddressIndexWorker = require("worker-loader!workers/AddressIndexWorker");
                        }
                        let worker = new AddressIndexWorker;
                        worker.postMessage({ pubkeys, address_prefix: ChainConfig.address_prefix });
                        // let _this = this
                        worker.onmessage = event => {
                            try {
                                let key_addresses = event.data;
                                let dirty = false;
                                let addresses = this.state.addresses.withMutations( addresses => {
                                    for(let i = 0; i < pubkeys.length; i++) {
                                        let pubkey = pubkeys[i];
                                        if(this.pubkeys.has(pubkey)) continue;
                                        this.pubkeys.add(pubkey);
                                        // Gather all 5 legacy address formats (see key.addresses)
                                        let address_strings = key_addresses[i];
                                        for(let address of address_strings) {
                                            addresses.set(address, pubkey);
                                            dirty = true;
                                        }
                                    }
                                });
                                if( dirty ) {
                                    this.setState({ addresses });
                                    this.saveAddyMap();
                                } else {
                                    this.setState({ saving: false });
                                }
                                resolve();
                            } catch( e ) {
                                console.error("AddressIndex.addAll", e); reject(e);
                            }
                        };
                    }).catch ( e => {
                        throw e;
                    });
                });
            }
        */

    }, {
        key: "loadAddyMap",
        value: function loadAddyMap() {
            var _this2 = this;

            if (this.loadAddyMapPromise) return this.loadAddyMapPromise;
            this.loadAddyMapPromise = _idbInstance2.default.root.getProperty("AddressIndex").then(function (map) {
                _this2.state.addresses = map ? _immutable2.default.Map(map) : _immutable2.default.Map();
                console.log("AddressIndex load", _this2.state.addresses.size);
                _this2.state.addresses.valueSeq().forEach(function (pubkey) {
                    return _this2.pubkeys.add(pubkey);
                });
            });
            return this.loadAddyMapPromise;
        }
    }, {
        key: "saveAddyMap",
        value: function saveAddyMap() {
            var _this3 = this;

            clearTimeout(this.saveAddyMapTimeout);
            this.saveAddyMapTimeout = setTimeout(function () {
                console.log("AddressIndex save", _this3.state.addresses.size);

                _this3.state.saving = false;
                // If indexedDB fails to save, it will re-try via PrivateKeyStore calling this.add
                return _idbInstance2.default.root.setProperty("AddressIndex", _this3.state.addresses.toObject());
            }, 100);
        }
    }], [{
        key: "getInstance",
        value: function getInstance() {
            if (!AddressIndex.instance) {
                AddressIndex.instance = new AddressIndex();
            }
            return AddressIndex.instance;
        }
    }]);

    return AddressIndex;
}();
// console.log("post msg a");
// worker.postMessage("a")


var AddressIndexIns = AddressIndex.getInstance();
exports.default = AddressIndexIns;