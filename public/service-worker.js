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