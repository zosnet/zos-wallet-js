"use strict";

Object.defineProperty(exports, "__esModule", {
    value: true
});

function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } }

var db = void 0;
var idb_helper = void 0;

//db: IDBDatabase类型,包含name,objectStoreNames,version 等属性
//db.transaction: IDBTransaction类型, 包含db(指向所属db), mode(只读,读写等) 等熟悉
//db.transaction.objectStore(store_name):IDBObjectStore类型,包含:indexNames,keyPath,name,transaction(指向所属transaction)

exports.default = idb_helper = {

    get_db: function get_db(database) {},

    set_graphene_db: function set_graphene_db(database) {
        db = database;
    },

    trx_readwrite: function trx_readwrite(object_stores) {
        return db.transaction([object_stores], "readwrite");
    },

    on_request_end: function on_request_end(request) {
        //return request => {
        return new Promise(function (resolve, reject) {
            request.onsuccess = new ChainEvent(request.onsuccess, resolve, request).event;
            request.onerror = new ChainEvent(request.onerror, reject, request).event;
        });
        //}(request)
    },

    on_transaction_end: function on_transaction_end(transaction) {
        return new Promise(function (resolve, reject) {
            transaction.oncomplete = new ChainEvent(transaction.oncomplete, resolve).event;
            transaction.onabort = new ChainEvent(transaction.onabort, reject).event;
        });
    },

    /** Chain an add event.  Provide the @param store and @param object and
        this method gives you convenient hooks into the database events.
         @param event_callback (within active transaction)
        @return Promise (resolves or rejects outside of the transaction)
    */
    add: function add(store, object, event_callback) {
        return function (object, event_callback) {
            var request = store.add(object);
            var event_promise = null;
            if (event_callback) request.onsuccess = new ChainEvent(request.onsuccess, function (event) {
                event_promise = event_callback(event);
            }).event;

            var request_promise = idb_helper.on_request_end(request).then(function (event) {
                //DEBUG console.log('... object',object,'result',event.target.result,'event',event)
                if (event.target.result != void 0) {
                    //todo does event provide the keyPath name? (instead of id)
                    object.id = event.target.result;
                }
                return [object, event];
            });

            if (event_promise) return Promise.all([event_promise, request_promise]);
            return request_promise;
        }(object, event_callback); //copy let references for callbacks
    },

    /** callback may return <b>false</b> to indicate that iteration should stop */
    cursor: function cursor(store_name, callback, transaction) {
        return new Promise(function (resolve, reject) {
            if (!transaction) {
                transaction = db.transaction([store_name], "readonly");
                transaction.onerror = function (error) {
                    console.error("ERROR idb_helper.cursor transaction", error);
                    reject(error);
                };
            }

            var store = transaction.objectStore(store_name);
            var request = store.openCursor();
            request.onsuccess = function (e) {
                var cursor = e.target.result;
                var ret = callback(cursor, e);
                if (ret === false) resolve();
                if (!cursor) resolve(ret);
            };
            request.onerror = function (e) {
                var error = {
                    error: e.target.error.message,
                    data: e
                };
                console.log("ERROR idb_helper.cursor request", error);
                reject(error);
            };
        }).then();
    },

    autoIncrement_unique: function autoIncrement_unique(db, table_name, unique_index) {
        return db.createObjectStore(table_name, { keyPath: "id", autoIncrement: true }).createIndex("by_" + unique_index, unique_index, { unique: true });
    }
};

var ChainEvent = function ChainEvent(existing_on_event, callback, request) {
    _classCallCheck(this, ChainEvent);

    this.event = function (event) {
        if (event.target.error) console.error("---- transaction error ---->", event.target.error);
        //event.request = request
        callback(event);
        if (existing_on_event) existing_on_event(event);
    };
};