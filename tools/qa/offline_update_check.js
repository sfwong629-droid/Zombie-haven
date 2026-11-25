// tools/qa/offline_update_check.js SITE_DIR — the offline copy finds a new build by itself (owner, 25 Nov: "Can the offline
// version on my phone auto check for update when i open it?"). Uses a copy of the site built by tools/build/offline.py:
// opens it and waits until it is saved, then puts a newer build on the "server" (a new index.html and sw.js) while the
// page stays open, brings the page back to the front, and expects the chip "Update … ready · Tap to load"; a tap loads
// the new build. Exit 0 ok, 1 a check failed.
const { chromium } = require('playwright');
const http = require('http'), fs = require('fs'), path = require('path'), crypto = require('crypto');
const SRC = path.resolve(process.argv[2] || '/tmp/zh-offline'), DIR = '/tmp/zh-offline-upd', PORT = 8798, BASE = `http://localhost:${PORT}/Zombie-haven/`;
fs.rmSync(DIR, { recursive: true, force: true }); fs.cpSync(SRC, DIR, { recursive: true });
const MIME = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.json': 'application/json', '.webmanifest': 'application/manifest+json', '.png': 'image/png', '.webp': 'image/webp', '.mp3': 'audio/mpeg', '.glb': 'model/gltf-binary', '.woff2': 'font/woff2', '.ttf': 'font/ttf', '.txt': 'text/plain' };
const srv = http.createServer((q, r) => {
  let u = decodeURIComponent(new URL(q.url, 'http://x').pathname);
  if (!u.startsWith('/Zombie-haven/')) { r.writeHead(404); return r.end(); }
  u = u.slice('/Zombie-haven/'.length) || 'index.html';
  const f = path.join(DIR, u);
  if (!f.startsWith(DIR) || !fs.existsSync(f) || fs.statSync(f).isDirectory()) { r.writeHead(404); return r.end(); }
  r.writeHead(200, { 'Content-Type': MIME[path.extname(f)] || 'application/octet-stream', 'Cache-Control': 'max-age=600' }); fs.createReadStream(f).pipe(r);
}).listen(PORT);

function publishNewer() {
  const sw = fs.readFileSync(path.join(DIR, 'sw.js'), 'utf8'), old = sw.match(/const BUILD = '([^']+)'/)[1], neu = old + '-T';
  const html = fs.readFileSync(path.join(DIR, 'index.html'), 'utf8').replace(`ZH_OFFLINE_PAGE = '${old}'`, `ZH_OFFLINE_PAGE = '${neu}'`);
  fs.writeFileSync(path.join(DIR, 'index.html'), html);
  const hash = crypto.createHash('md5').update(html).digest('hex').slice(0, 10), bytes = Buffer.byteLength(html);
  const sw2 = sw.replace(`const BUILD = '${old}'`, `const BUILD = '${neu}'`).replace(/\["index\.html","[0-9a-f]+",\d+\]/, `["index.html","${hash}",${bytes}]`);
  if (sw2 === sw || !/\["index\.html"/.test(sw)) throw new Error('could not make the newer build');
  fs.writeFileSync(path.join(DIR, 'sw.js'), sw2);
  return { old, neu };
}

(async () => {
  const bad = [];
  const b = await chromium.launch({ args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader'] });
  const ctx = await b.newContext({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 1 });
  const p = await ctx.newPage();
  await p.goto(BASE);
  await p.waitForFunction(() => window.ZH_OFFLINE && ZH_OFFLINE.state === 'ready', null, { timeout: 600000, polling: 1000 });
  await p.reload(); // now served by the saver, as on the phone
  await p.waitForFunction(() => navigator.serviceWorker.controller && window.ZH_OFFLINE && ZH_OFFLINE.state === 'ready', null, { timeout: 60000 });
  const { old, neu } = publishNewer();
  // Back to the front a few minutes later (the check runs at most once a minute).
  await p.evaluate(() => { const n = Date.now; Date.now = () => n() + 120000; document.dispatchEvent(new Event('visibilitychange')); });
  try {
    await p.waitForFunction((v) => { const c = document.getElementById('zhOffline'); return c && c.style.display !== 'none' && c.textContent.includes(v) && c.textContent.includes('Tap'); }, neu, { timeout: 120000 });
  } catch (e) { bad.push('no "Update ready" chip after coming back to the front'); }
  const chip = await p.evaluate(() => document.getElementById('zhOffline').textContent);
  console.log('running', old, '· chip:', JSON.stringify(chip));
  await p.screenshot({ path: '/tmp/offline_update_chip.png' });
  if (!bad.length) {
    await Promise.all([p.waitForNavigation(), p.click('#zhOffline')]);
    await p.waitForFunction(() => window.ZH_OFFLINE_PAGE, null, { timeout: 30000 });
    const now = await p.evaluate(() => window.ZH_OFFLINE_PAGE);
    console.log('after the tap:', now);
    if (now !== neu) bad.push('the tap did not load the new build (' + now + ')');
    await p.waitForTimeout(3000);
    const again = await p.evaluate(() => { const c = document.getElementById('zhOffline'); return c && c.style.display !== 'none' ? c.textContent : ''; });
    if (/Tap to load/.test(again)) bad.push('the chip offers the update again after loading it');
  }
  console.log(bad.length ? 'FAIL: ' + bad.join('; ') : 'ok: the open game finds the new build, offers it, and one tap loads it');
  await b.close(); srv.close(); process.exit(bad.length ? 1 : 0);
})().catch((e) => { console.error(e); srv.close(); process.exit(1); });
