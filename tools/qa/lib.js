// tools/qa/lib.js — shared start-up for the browser checks (Playwright).
// Serve the repo first:  python3 -m http.server 8765   (from the repo root)
// Env: ZH_BASE (default http://localhost:8765)  ZH_GPU=1 to use the real graphics card (much faster on a PC; the cloud has none)
const { chromium } = require('playwright'); const fs = require('fs'), path = require('path');
const BASE = process.env.ZH_BASE || 'http://localhost:8765';
async function launch() {
  return chromium.launch(process.env.ZH_GPU ? { headless: !process.env.ZH_SHOW } : { args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader'] });
}
// expose: extra names from inside game.js to put on window.ZH for the test (e.g. 'radio, say, banner')
async function page(b, { w = 390, h = 844, expose = '' } = {}) {
  const p = await b.newPage({ viewport: { width: w, height: h } }); p.errs = []; p.on('pageerror', (e) => p.errs.push(e.message));
  p.on('console', (m) => { if (m.text().startsWith('[[')) console.log(m.text().slice(2)); });
  if (expose) await p.route(/js\/game\.js/, async (r) => { const res = await r.fetch(); const t = (await res.text()).replace('window.ZH = { BUILD_TAG,', 'window.ZH = { BUILD_TAG, ' + expose + ','); r.fulfill({ body: t, contentType: 'application/javascript' }); });
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
