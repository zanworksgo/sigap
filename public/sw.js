'use strict';

// Bump this version to force clients to refresh cached static assets.
const CACHE = 'sigap-static-v1';
const ASSETS = [
  '/css/style.css',
  '/css/print.css',
  '/js/main.js',
  '/img/logo.png',
  '/img/icon-192.png',
  '/img/icon-512.png',
  '/manifest.webmanifest'
];

self.addEventListener('install', (event) => {
  event.waitUntil(caches.open(CACHE).then((c) => c.addAll(ASSETS)).then(() => self.skipWaiting()));
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys()
      .then((keys) => Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', (event) => {
  const req = event.request;
  if (req.method !== 'GET') return;

  const url = new URL(req.url);
  if (url.origin !== self.location.origin) return;

  // Never cache page navigations, uploaded files, or API/detail JSON — always
  // go to the network so auth, sessions, and data stay correct & fresh.
  if (req.mode === 'navigate' || url.pathname.startsWith('/file/') || url.pathname.endsWith('/detail')) {
    return;
  }

  // Static assets: serve from cache first, fall back to network and cache it.
  if (/^\/(css|js|img)\//.test(url.pathname) || url.pathname === '/manifest.webmanifest') {
    event.respondWith(
      caches.match(req).then((hit) =>
        hit ||
        fetch(req).then((res) => {
          const copy = res.clone();
          caches.open(CACHE).then((c) => c.put(req, copy));
          return res;
        }).catch(() => hit)
      )
    );
  }
});
