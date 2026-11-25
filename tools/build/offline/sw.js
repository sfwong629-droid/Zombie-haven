/* Zombie Haven, offline copy (W275). Made by tools/build/offline.py: do not edit the copy in the site, edit this one.
   Every file the game uses is saved on the phone the first time the page is opened with signal; after that the game
   starts with no signal at all. Files are kept by their content (path + hash), so a new build only downloads what changed,
   and a download cut short carries on where it stopped the next time the page is opened. */
const BUILD = '__BUILD__';
const FILES = __FILES__;            // [[path, hash, bytes], ...]
const CACHE = 'zh-offline';
const HASH = new Map(FILES.map(([p, h]) => [p, h]));
const BASE = new URL('./', self.location).href;
const key = (p) => BASE + p + '?h=' + HASH.get(p);
const total = FILES.reduce((a, f) => a + f[2], 0);

async function tell(msg) { for (const c of await self.clients.matchAll({ includeUncontrolled: true })) c.postMessage(msg); }

async function fill() {
  const cache = await caches.open(CACHE);
  const have = new Set((await cache.keys()).map((r) => r.url));
  let done = 0, last = 0;
  const todo = FILES.filter(([p, , b]) => { if (have.has(key(p))) { done += b; return false; } return true; });
  let i = 0;
  async function worker() {
    while (i < todo.length) {
      const [p, , b] = todo[i++];
      for (let t = 0; t < 3; t++) {
        try { const r = await fetch(BASE + p, { cache: 'no-store' }); if (!r.ok) throw new Error(r.status); await cache.put(key(p), r); break; }
        catch (e) { if (t === 2) throw new Error('could not save ' + p); }
      }
      done += b;
      if (Date.now() - last > 400) { last = Date.now(); tell({ zhOffline: 'saving', done, total, build: BUILD }); }
    }
  }
  await Promise.all([worker(), worker(), worker(), worker()]);
}

self.addEventListener('install', (e) => {
  e.waitUntil(fill().then(() => self.skipWaiting()).catch((err) => { tell({ zhOffline: 'failed', why: String(err && err.message || err), build: BUILD }); throw err; }));
});

self.addEventListener('activate', (e) => {
  e.waitUntil((async () => {
    const cache = await caches.open(CACHE), keep = new Set(FILES.map(([p]) => key(p)));
    for (const r of await cache.keys()) if (!keep.has(r.url)) await cache.delete(r);
    for (const n of await caches.keys()) if (n !== CACHE) await caches.delete(n);
    await self.clients.claim();
    tell({ zhOffline: 'ready', build: BUILD, total });
  })());
});

self.addEventListener('message', (e) => {
  if (e.data === 'zhOfflineStatus') e.source && e.source.postMessage({ zhOffline: 'ready', build: BUILD, total });
});

self.addEventListener('fetch', (e) => {
  const u = new URL(e.request.url);
  if (e.request.method !== 'GET' || !u.href.startsWith(BASE)) return;
  let p = decodeURIComponent(u.pathname.slice(new URL(BASE).pathname.length));
  if (p === '' || e.request.mode === 'navigate') p = 'index.html';
  if (!HASH.has(p)) return;
  e.respondWith((async () => {
    const hit = await caches.match(key(p));
    if (hit) return hit;
    const r = await fetch(e.request);
    if (r.ok) { const c = await caches.open(CACHE); c.put(key(p), r.clone()); }
    return r;
  })());
});
