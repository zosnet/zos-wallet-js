"use strict";

var _es = require("zosjs/es");

onmessage = function onmessage(event) {
    try {
        console.log("AddressIndexWorker start");
        var _event$data = event.data,
            pubkeys = _event$data.pubkeys,
            address_prefix = _event$data.address_prefix;

        var results = [];
        var _iteratorNormalCompletion = true;
        var _didIteratorError = false;
        var _iteratorError = undefined;

        try {
            for (var _iterator = pubkeys[Symbol.iterator](), _step; !(_iteratorNormalCompletion = (_step = _iterator.next()).done); _iteratorNormalCompletion = true) {
                var pubkey = _step.value;

                results.push(_es.key.addresses(pubkey, address_prefix));
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

        postMessage(results);
        console.log("AddressIndexWorker done");
    } catch (e) {
        console.error("AddressIndexWorker", e);
    }
};