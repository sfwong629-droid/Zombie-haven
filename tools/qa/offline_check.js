// tools/qa/offline_check.js SITE_DIR — W275 (owner, 25 Nov): the offline copy for the iPhone's Home Screen.
// Serves the site built by tools/build/offline.py under /Zombie-haven/ (as GitHub Pages does), opens it once with the
// network on and waits until every file is saved ("ready"), then cuts the network and opens it again: the title screen
// must come up, the 3D world must load (the models come from the saved copy) and no request may fail. Then the Zombie
// test page offline (it loads the zombie models). Exit 0 ok, 1 a check failed.
const { chromium } = require('playwright');
const http = require('http'), fs = require('fs'), path = require('path');
const DIR = path.resolve(process.argv[2] || '/tmp/zh-offline'), PORT = 8799, BASE = `http://localhost:${PORT}/Zombie-haven/`;
const MIME = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.json': 'application/json', '.webmanifest': 'application/manifest+json', '.png': 'image/png', '.webp': 'image/webp', '.mp3': 'audio/mpeg', '.glb': 'model/gltf-binary', '.woff2': 'font/woff2', '.ttf': 'font/ttf', '.txt': 'text/plain' };
const srv = http.createServer((q, r) => {
  let u = decodeURIComponent(new URL(q.url, 'http://x').pathname);
  if (!u.startsWith('/Zombie-haven/')) { r.writeHead(404); return r.end(); }
  u = u.slice('/Zombie-haven/'.length) || 'index.html';
  const f = path.join(DIR, u);
  if (!f.startsWith(DIR) || !fs.existsSync(f) || fs.statSync(f).isDirectory()) { r.writeHead(404); return r.end(); }
  r.writeHead(200, { 'Content-Type': MIME[path.extname(f)] || 'application/octet-stream' }); fs.createReadStream(f).pipe(r);
}).listen(PORT);
(async () => {
  const bad = [];
  const b = await chromium.launch({ args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader'] });
  const ctx = await b.newContext({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 1 });
  let p = await ctx.newPage();
  const t0 = Date.now();
  await p.goto(BASE);
  await p.waitForFunction(() => window.ZH_OFFLINE && (ZH_OFFLINE.state === 'ready' || ZH_OFFLINE.state === 'failed'), null, { timeout: 600000, polling: 1000 });
  const st = await p.evaluate(() => window.ZH_OFFLINE);
  console.log('online, first visit:', JSON.stringify(st), `${((Date.now() - t0) / 1000).toFixed(0)} s`);
  if (st.state !== 'ready') { bad.push('the files were not all saved: ' + st.why); }
  await p.close();

  await ctx.setOffline(true);
  const failed = [], errs = [];
  p = await ctx.newPage();
  p.on('requestfailed', (r) => failed.push(r.url().replace(BASE, '')));
  p.on('pageerror', (e) => errs.push(String(e)));
  await p.goto(BASE);
  try { await p.waitForFunction(() => window.ZH3D && ZH3D.ready, null, { timeout: 240000 }); } catch (e) { bad.push('offline: the 3D world did not load'); }
  await p.waitForTimeout(2000);
  const a = await p.evaluate(() => ({ title: getComputedStyle(document.getElementById('title')).display !== 'none', loading: getComputedStyle(document.getElementById('loading')).display !== 'none', lp: window.ZH3D && ZH3D.loadProgress(), sw: !!navigator.serviceWorker.controller }));
  console.log('offline, reopened:', JSON.stringify(a));
  if (!a.sw) bad.push('offline: the page is not served by the saver');
  if (!a.title) bad.push('offline: no title screen');
  await p.screenshot({ path: '/tmp/offline_title.png' });

  await p.goto(BASE + 'index.html?zoo=1');
  await p.waitForTimeout(15000);
  const z = await p.evaluate(() => window.ZH3D && ZH3D.loadProgress());
  console.log('offline, Zombie test:', JSON.stringify(z));
  await p.screenshot({ path: '/tmp/offline_zoo.png' });
  if (failed.length) bad.push('offline: ' + failed.length + ' requests failed, e.g. ' + failed.slice(0, 4).join(', '));
  if (errs.length) bad.push('offline: page errors: ' + errs.slice(0, 3).join(' | '));
  console.log(bad.length ? 'FAIL: ' + bad.join('; ') : 'ok: the game saves itself, then opens and loads its models with no network');
  await b.close(); srv.close(); process.exit(bad.length ? 1 : 0);
})().catch((e) => { console.error(e); srv.close(); process.exit(1); });
