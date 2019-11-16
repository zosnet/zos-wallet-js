"use strict";

var _es = require("zosjs/es");

require("babel-polyfill");


onmessage = function onmessage(event) {
    try {
        console.log("AesWorker start");
        var _event$data = event.data,
            private_plainhex_array = _event$data.private_plainhex_array,
            iv = _event$data.iv,
            key = _event$data.key;

        var aes = new _es.Aes(iv, key);
        var private_cipherhex_array = [];
        var _iteratorNormalCompletion = true;
        var _didIteratorError = false;
        var _iteratorError = undefined;

        try {
            for (var _iterator = private_plainhex_array[Symbol.iterator](), _step; !(_iteratorNormalCompletion = (_step = _iterator.next()).done); _iteratorNormalCompletion = true) {
                var private_plainhex = _step.value;

                var private_cipherhex = aes.encryptHex(private_plainhex);
                private_cipherhex_array.push(private_cipherhex);
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

        postMessage(private_cipherhex_array);
        console.log("AesWorker done");
    } catch (e) {
        console.error("AesWorker", e);
    }
};