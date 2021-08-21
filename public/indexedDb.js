function checkForIndexedDb() {
    if (!window.indexedDB) {
        console.log("Your browser doesn't support a stable version of IndexedDB.");
        return false;
    }
    return true;
}

function useIndexedDb(databaseName, storeName, method, object) {
    return new Promise((resolve, reject) => {
        const request = window.indexedDB.open(databaseName, 1);
        let db;
        let tx;
        let store;

        request.onupgradeneeded = function (e) {
            const db = request.result;
            db.createObjectStore(storeName, { keyPath: "_id", autoIncrement: true });
        };

        request.onerror = function (e) {
            console.log("There was an error");
        };

        request.onsuccess = function (e) {
            db = request.result;
            tx = db.transaction(storeName, "readwrite");
            store = tx.objectStore(storeName);

            db.onerror = function (e) {
                console.log("error");
            };
            if (method === "put") {
                store.put(object);
                resolve("IndexedDb updated");
            } else if (method === "get") {
                const all = store.getAll();
                all.onsuccess = function () {
                    resolve(all.result);
                };
            } else if (method === "clear") {
                store.clear();
                resolve("IndexedDb Cleared")
            }
            tx.oncomplete = function () {
                db.close();
            };
        };
    });
}

export { checkForIndexedDb, useIndexedDb }