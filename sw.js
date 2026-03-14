/**
 * sw.js — Groundwork service worker
 *
 * Add to every page <head> (before </head>):
 *   <script>
 *     if ('serviceWorker' in navigator) {
 *       navigator.serviceWorker.register('sw.js');
 *     }
 *   </script>
 *
 * nav.js (v2) already does this registration automatically —
 * so if you're using the new nav.js you don't need the snippet above.
 *
 * ── DEPLOYING A NEW VERSION ──────────────────────────────────────
 * Whenever you change ANY file in the SHELL array below, increment
 * the CACHE string (e.g. gw-shell-v3 → gw-shell-v4).
 * This forces existing users to receive a fresh install on next load.
 * Without a cache bump, users may run stale JS/CSS indefinitely.
 * ────────────────────────────────────────────────────────────────
 */

const CACHE  = 'gw-shell-v19';
const SHELL  = [
  './',
  './index.html',
  './tracker.html',
  './interventions.html',
  './context.html',
  './offline.html',
  './base.css',
  './nav.js',
  './daily-state-widget.js',
  './manifest.json',
];

self.addEventListener('install', e => {
  e.waitUntil(
    caches.open(CACHE)
      .then(c => c.addAll(SHELL))
      .then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', e => {
  e.waitUntil(
    caches.keys()
      .then(keys => Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', e => {
  const url = new URL(e.request.url);
  // Firebase + Google APIs — always network
  if (
    url.hostname.includes('firestore.googleapis.com') ||
    url.hostname.includes('firebase') ||
    url.hostname.includes('googleapis.com') ||
    url.hostname.includes('gstatic.com') && url.hostname.includes('firebase')
  ) return;

  // Google Fonts CDN — cache-first
  if (url.hostname.includes('fonts.gstatic.com') || url.hostname.includes('fonts.googleapis.com')) {
    e.respondWith(cacheFirst(e.request));
    return;
  }

  // Our shell — stale-while-revalidate
  e.respondWith(staleWhileRevalidate(e.request));
});

async function cacheFirst(req) {
  const cached = await caches.match(req);
  if (cached) return cached;
  const res = await fetch(req);
  if (res.ok) (await caches.open(CACHE)).put(req, res.clone());
  return res;
}

async function staleWhileRevalidate(req) {
  const cache  = await caches.open(CACHE);
  const cached = await cache.match(req);
  const fresh  = fetch(req).then(res => {
    if (res.ok) cache.put(req, res.clone());
    return res;
  }).catch(() => cached || caches.match('./offline.html'));
  return cached || fresh;
}
