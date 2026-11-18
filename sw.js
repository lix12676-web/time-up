// 小记 · 离线缓存
// 注意：改了图标或应用名之后，必须把 CACHE 改成新名字，
// 否则浏览器会一直用旧缓存里的 manifest 和图标。
const CACHE = 'xiaojii-v4';
const ASSETS = ['./', './index.html', './manifest.json', './icon-192.png', './icon-512.png', './icon-180.png'];

self.addEventListener('install', function (e) {
  self.skipWaiting();
  e.waitUntil(
    caches.open(CACHE).then(function (c) {
      return c.addAll(ASSETS).catch(function () {});
    })
  );
});

self.addEventListener('message', function(e){
  if(e.data && e.data.type === 'SKIP_WAITING'){ self.skipWaiting(); }
});

self.addEventListener('activate', function (e) {
  e.waitUntil(
    caches.keys().then(function (keys) {
      return Promise.all(
        keys.filter(function (k) { return k !== CACHE; })
            .map(function (k) { return caches.delete(k); })
      );
    }).then(function () { return self.clients.claim(); })
  );
});

self.addEventListener('fetch', function (e) {
  const req = e.request;
  if (req.method !== 'GET') return;

  const url = req.url;
  const isMeta = /manifest\.json$/.test(url) || /icon-\d+\.png$/.test(url);

  // 应用名 / 图标：永远先问网络，避免改名换图后被旧缓存挡住
  if (isMeta) {
    e.respondWith(
      fetch(req).then(function (res) {
        const copy = res.clone();
        caches.open(CACHE).then(function (c) { c.put(req, copy); }).catch(function () {});
        return res;
      }).catch(function () { return caches.match(req); })
    );
    return;
  }

  // 页面导航：先联网取最新，断网时回退到缓存
  if (req.mode === 'navigate') {
    e.respondWith(
      fetch(req).then(function (res) {
        const copy = res.clone();
        caches.open(CACHE).then(function (c) { c.put('./index.html', copy); }).catch(function () {});
        return res;
      }).catch(function () { return caches.match('./index.html'); })
    );
    return;
  }

  // 其他静态资源：缓存优先
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
