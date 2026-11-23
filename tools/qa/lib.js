// tools/qa/lib.js — shared start-up for the browser checks (Playwright).
// Serve the repo first:  python3 -m http.server 8765   (from the repo root), or set ZH_NOSERVER=1
// Env: ZH_BASE (default http://localhost:8765)  ZH_GPU=1 to use the real graphics card (much faster on a PC; the cloud has none)
const { chromium } = require('playwright'); const fs = require('fs'), path = require('path');
const BASE = process.env.ZH_BASE || 'http://localhost:8765';
// ZH_NOSERVER=1: no web server needed; the pages are read straight from the repo folder (for machines where a local server may not be started)
const NOSERVER = !!process.env.ZH_NOSERVER, ROOT = path.resolve(__dirname, '..', '..');
const MIME = { '.html': 'text/html', '.js': 'application/javascript', '.mjs': 'application/javascript', '.css': 'text/css', '.json': 'application/json', '.webmanifest': 'application/manifest+json', '.png': 'image/png', '.jpg': 'image/jpeg', '.jpeg': 'image/jpeg', '.webp': 'image/webp', '.svg': 'image/svg+xml', '.glb': 'model/gltf-binary', '.gltf': 'model/gltf+json', '.bin': 'application/octet-stream', '.mp3': 'audio/mpeg', '.ogg': 'audio/ogg', '.wav': 'audio/wav', '.mp4': 'video/mp4', '.woff2': 'font/woff2', '.ttf': 'font/ttf' };
async function launch() {
  return chromium.launch(process.env.ZH_GPU ? { headless: !process.env.ZH_SHOW } : { args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader'] });
}
// expose: extra names from inside game.js to put on window.ZH for the test (e.g. 'radio, say, banner')
// look: 'glass' (the default here) keeps the older checks on the Glass look they were written for, although the game itself starts in the phone look from 3D.333;
//       pass look: 'phone', or look: '' to leave the game's own default
async function page(b, { w = 390, h = 844, expose = '', look = 'glass' } = {}) {
  const p = await b.newPage({ viewport: { width: w, height: h } });
  if (look) await p.addInitScript((lk) => { try { if (!sessionStorage.getItem('zhLookSet')) { sessionStorage.setItem('zhLookSet', '1'); const o = JSON.parse(localStorage.getItem('zombieHavenOpts') || '{}'); o.look = lk; localStorage.setItem('zombieHavenOpts', JSON.stringify(o)); } } catch (e) {} }, look); p.errs = []; p.on('pageerror', (e) => p.errs.push(e.message));
  p.on('console', (m) => { if (m.text().startsWith('[[')) console.log(m.text().slice(2)); });
  if (NOSERVER) await p.route(BASE + '/**', (r) => { const f = path.join(ROOT, decodeURIComponent(new URL(r.request().url()).pathname)); if (!f.startsWith(ROOT) || !fs.existsSync(f) || fs.statSync(f).isDirectory()) return r.fulfill({ status: 404, body: 'not found' }); r.fulfill({ body: fs.readFileSync(f), contentType: MIME[path.extname(f).toLowerCase()] || 'application/octet-stream' }); });
  if (expose) await p.route(/js\/game\.js/, async (r) => { const t = (NOSERVER ? fs.readFileSync(path.join(ROOT, 'js/game.js'), 'utf8') : await (await r.fetch()).text()).replace('window.ZH = { BUILD_TAG,', 'window.ZH = { BUILD_TAG, ' + expose + ','); r.fulfill({ body: t, contentType: 'application/javascript' }); });
  const local = path.join(__dirname, 'node_modules/three');   // optional: npm i three@0.160.0 here to work offline
  if (fs.existsSync(local)) await p.route('https://cdn.jsdelivr.net/npm/three@0.160.0/**', (r) => { const f = path.join(local, r.request().url().split('three@0.160.0/')[1].split('?')[0]); r.fulfill({ body: fs.readFileSync(f), contentType: 'application/javascript' }); });
  await p.route('https://fonts.googleapis.com/**', (r) => r.fulfill({ body: '', contentType: 'text/css' }));
  return p;
}
// a fresh new game, intro skipped
async function newGame(p) {
  await p.goto(BASE + '/index.html?3d=1'); await p.waitForTimeout(12000); await p.getByText('New game').click(); await p.waitForTimeout(1500);
  await p.getByText('Tap to start a new game').first().click(); await p.waitForTimeout(1500);
  await p.getByRole('button', { name: 'Start', exact: true }).click({ noWaitAfter: true, timeout: 90000 });
  await p.waitForFunction(() => window.ZH3D && window.ZH && ZH.S.sv.length && ZH3D.people().size, null, { timeout: 150000 }); await p.waitForTimeout(3000);
  await p.evaluate(() => { const k = document.getElementById('cutSkip'); if (k) k.click(); }); await p.waitForTimeout(2000);
}
// close ordinary cards (tips, events); leaves the live newcomer card alone
const clearCards = (p) => p.evaluate(() => { for (let i = 0; i < 6; i++) { const bs = [...document.querySelectorAll('#eventModal .evBox:not(.liveCard) button')]; if (!bs.length) break; (bs.find((b) => /got it|ok|good|later|no more|close/i.test(b.textContent)) || bs[bs.length - 1]).click(); } });
const shot = (p, file) => p.screenshot({ path: file, timeout: 200000 });
module.exports = { BASE, launch, page, newGame, clearCards, shot };
