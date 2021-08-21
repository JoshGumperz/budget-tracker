const FILES_TO_CACHE = [
    "/",
    "/index.html",
    "/styles.css",
    "/dist/app.bundle.js",
    "/dist/icon_192x192.png",
    "/dist/icon_512x512.png",
    '/dist/manifest.json'
];

const CACHE_NAME = "static-cache-v1";
const DATA_CACHE_NAME = "data-cache-v1";

self.addEventListener("install", function (evt) {
    evt.waitUntil(
        caches.open(CACHE_NAME).then(cache => {
            console.log("Files cached");
            return cache.addAll(FILES_TO_CACHE);
        })
    );

    self.skipWaiting();
});

// activate
self.addEventListener("activate", function (evt) {
    evt.waitUntil(
        caches.keys().then(keyList => {
            return Promise.all(
                keyList.map(key => {
                    if (key !== CACHE_NAME && key !== DATA_CACHE_NAME) {
                        console.log("Old cash data removed", key);
                        return caches.delete(key);
                    }
                })
            );
        })
    );

    self.clients.claim();
});

// fetch
self.addEventListener("fetch", function (evt) {
    if (evt.request.url.includes("/api/") && evt.request.method === "GET") {
        evt.respondWith(
            caches.open(DATA_CACHE_NAME).then(cache => {
                return fetch(evt.request)
                    .then(response => {
                        // If the response was good, clone it and store it in the cache.
                        if (response.status === 200) {
                            cache.put(evt.request.url, response.clone());
                        }

                        return response;
                    })
                    .catch(err => {
                        // Network request failed, try to get it from the cache.
                        return cache.match(evt.request);
                    });
            }).catch(err => console.log(err))
        );

        return;
    }

    evt.respondWith(
        caches.open(CACHE_NAME).then(cache => {
            return cache.match(evt.request).then(response => {
                return response || fetch(evt.request);
            });
        })
    );
});

// clear cache
self.addEventListener("fetch", function (evt) {
    if (evt.request.url.includes("/api/transaction") && evt.request.method === "DELETE") {
        evt.respondWith(
            caches.open(DATA_CACHE_NAME).then(cache => {
                return fetch(evt.request)
                    .then(response => {
                        if (response.status === 200) {
                            cache = {};
                        }

                        return response;
                    })
            }).catch(err => console.log(err))
        );
        return;
    }
});

const checkOfflineTransactions = () => {
    return new Promise((resolve, reject) => {
        const request = indexedDB.open("offlineDb", 1);

        request.onupgradeneeded = function (e) {
            const db = request.result;
            db.createObjectStore("offlineTransactions", { keyPath: "_id", autoIncrement: true });
        };

        request.onsuccess = function (e) {
            let db = request.result;
            let tx = db.transaction("offlineTransactions", "readwrite");
            let store = tx.objectStore("offlineTransactions");
            let count = store.count();
            count.onsuccess = function (e) {
                if (count.result > 0) {
                    console.log("Db contains offline transactions");
                    resolve(db);
                } else {
                    reject("offlineTransactions is empty");
                }
            }
        }
    });
}

self.addEventListener('sync', function (evt) {
    if (evt.tag === "post-offline-transactions") {
        evt.waitUntil(
            checkOfflineTransactions()
                .then((result) => {
                    updateOfflineTransactions(result)
                        .then((transactions) => {
                            console.log(transactions);
                            fetch("/api/transaction/bulk", {
                                method: "POST",
                                body: JSON.stringify(transactions),
                                headers: {
                                    Accept: "application/json, text/plain, */*",
                                    "Content-Type": "application/json"
                                }
                            })
                                .then((response) => {
                                    console.log(response);
                                })
                                .catch((err) => {
                                    console.error(`Problem with posting to MongoDB ${err}`);
                                })
                        })
                        .catch((err) => {
                            console.error(`Problem with getting offlineTransactions from indexedDb ${err}`);
                        })
                })
                .catch((err) => {
                    console.error(`Problem with checking offlineTransactions ${err}`);
                })
        );
    }
});

const updateOfflineTransactions = (db) => {
    return new Promise((resolve, reject) => {
        const tx = db.transaction("offlineTransactions", "readwrite");
        const store = tx.objectStore("offlineTransactions");
        const transactions = [];

        // Opens a Cursor request and iterates over the documents.
        const storeCurserRequest = store.openCursor();
        storeCurserRequest.onsuccess = function (e) {
            const cursor = e.target.result;
            let transaction;
            if (cursor) {
                transaction = {
                    name: cursor.value.name,
                    value: cursor.value.value,
                    date: cursor.value.date
                };
                transactions.push(transaction);
                cursor.delete();
                cursor.continue();
            } else {
                resolve(transactions);
            }
        };

        storeCurserRequest.onerror = function (e) {
            reject("Unable to get offlineTransactions");
        };

        tx.oncomplete = function () {
            db.close();
        };
    });
}
