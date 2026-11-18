const CACHE = 'timeup-v1';
const ASSETS = ['./', './index.html', './manifest.json', './icon-192.png', './icon-512.png', './icon-180.png'];

self.addEventListener('install', function (e) {
  self.skipWaiting();
  e.waitUntil(
    caches.open(CACHE).then(function (c) {
      return c.addAll(ASSETS).catch(function () {});
    })
  );
});

self.addEventListener('activate', function (e) {
  e.waitUntil(
    caches.keys().then(function (keys) {
      return Promise.all(keys.filter(function (k) { return k !== CACHE; }).map(function (k) { return caches.delete(k); }));
    }).then(function () { return self.clients.claim(); })
  );
});

self.addEventListener('fetch', function (e) {
  const req = e.request;
  if (req.method !== 'GET') return;

  // 页面导航：先联网取最新，断网时回退到缓存
  if (req.mode === 'navigate') {
    e.respondWith(
      fetch(req).then(function (res) {
        const copy = res.clone();
        caches.open(CACHE).then(function (c) { c.put('./index.html', copy); }).catch(function () {});
        return res;
      }).catch(function () {
        return caches.match('./index.html');
      })
    );
    return;
  }

  // 静态资源：缓存优先
  e.respondWith(
    caches.match(req).then(function (hit) {
      if (hit) return hit;
      return fetch(req).then(function (res) {
        const copy = res.clone();
        caches.open(CACHE).then(function (c) { c.put(req, copy); }).catch(function () {});
        return res;
      });
    })
  );
});
