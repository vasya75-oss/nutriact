const CACHE_NAME = 'nutriact-v1';
const urlsToCache = [
    '/', '/index.html', '/styles.css', '/app.js', '/auth.js', '/food.js',
    '/activity.js', '/sync.js', '/db.js', '/analytics.js', '/export.js',
    '/deepseek.js', '/utils.js', '/manifest.json'
];
self.addEventListener('install', event => {
    event.waitUntil(caches.open(CACHE_NAME).then(cache => cache.addAll(urlsToCache)));
});
self.addEventListener('fetch', event => {
    event.respondWith(caches.match(event.request).then(response => response || fetch(event.request)));
});
self.addEventListener('activate', event => {
    event.waitUntil(caches.keys().then(keys => Promise.all(keys.filter(key => key !== CACHE_NAME).map(key => caches.delete(key)))));
});