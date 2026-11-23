// tools/qa/sh_lib.js — 3D.276 (Strongholds chat): start-up for the stronghold map checks.
// Serves the repo from disk inside the browser (no web server needed), starts a new game, and exposes the map code on window.ZH.
const Q = require('./lib'); const fs = require('fs'), path = require('path');
const ROOT = path.join(__dirname, '..', '..'), HOST = 'http://zh.test';
const TYPES = { '.html': 'text/html', '.js': 'application/javascript', '.mjs': 'application/javascript', '.css': 'text/css', '.json': 'application/json', '.png': 'image/png', '.webp': 'image/webp', '.jpg': 'image/jpeg', '.glb': 'model/gltf-binary', '.mp3': 'audio/mpeg', '.ogg': 'audio/ogg', '.wav': 'audio/wav', '.woff2': 'font/woff2', '.ttf': 'font/ttf', '.svg': 'image/svg+xml', '.webmanifest': 'application/manifest+json' };
const EXPOSE = 'shTeams, shTeamPick, shMoveTo, shCall, shSolidPush, SH_SOLID, shOpen, shStoryLocks, shCardLine, shThrow, shDoorW, shAct, shEnd, expLocked, shMemSave, shSecured, shMakePlan, shPlanCheck, SH_PLANS, shTaskState, shThingSpot, shRoomAt, shWorld, shUseAI, campBuild, CAMP_PLAN, campSize, campCheck, campFall, campAlarm';
async function open(b, { w = 390, h = 844, expose = '' } = {}) {
  const p = await Q.page(b, { w, h });
  await p.route(HOST + '/**', (r) => { const u = new URL(r.request().url()); let f = path.join(ROOT, decodeURIComponent(u.pathname)); if (f.endsWith('/')) f += 'index.html';
    if (!fs.existsSync(f)) return r.fulfill({ status: 404, body: '' }); let body = fs.readFileSync(f);
    if (u.pathname.endsWith('/js/game.js')) body = body.toString('utf8').replace('window.ZH = { BUILD_TAG,', 'window.ZH = { BUILD_TAG, ' + EXPOSE + (expose ? ', ' + expose : '') + ',');
    r.fulfill({ body, contentType: TYPES[path.extname(f)] || 'application/octet-stream' }); });
  return p; }
async function newGame(p) {
  await p.goto(HOST + '/index.html?3d=1'); await p.waitForTimeout(12000); await p.getByText('New game').click(); await p.waitForTimeout(1500);
  await p.getByText('Tap to start a new game').first().click(); await p.waitForTimeout(1500);
  await p.getByRole('button', { name: 'Start', exact: true }).click({ noWaitAfter: true, timeout: 90000 });
  await p.waitForFunction(() => window.ZH3D && window.ZH && ZH.S.sv.length && ZH3D.people().size, null, { timeout: 150000 }); await p.waitForTimeout(3000);
  await p.evaluate(() => { const k = document.getElementById('cutSkip'); if (k) k.click(); }); await p.waitForTimeout(2000); await Q.clearCards(p); }
/* a practice run with a ready-made squad; strong: everyone very hard to kill (to check a map can be finished) */
function practice(p, map, lv, n = 6, strong = false, extra = {}) { return p.evaluate(([map, lv, n, strong, extra]) => { const S = ZH.S; if (S.sh) { S.sh = null; }
  const jobs = ['Guard', 'Police Officer', 'Medic', 'Scavenger', 'Mechanic', 'Engineer', 'Guard', 'Police Officer'], wp = ['machete', 'rifle', 'pistol', 'crossbow', 'sledge', 'shotgun', 'katana', 'rifle'];
  const sq = []; for (let i = 0; i < n; i++) { const q = ZH.mk('Test' + i, jobs[i], Math.min(12, lv), 0, 0, i); q.eq = { weapon: wp[i], armor: null, head: null, acc: null }; q.ammo = 99; q.id = 80000 + i; if (strong) { q.max = q.hp = 99999; } sq.push(q); }
  S.sv.push(...sq); const r = ZH.startStronghold(map, sq.map((q) => q.id), { practice: true, lv, quiet: true, ...extra }); S.sv = S.sv.filter((q) => !sq.includes(q)); if (strong && S.sh) for (const u of S.sh.units) { u.max = u.hp = 99999; }
  return r; }, [map, lv, n, strong, extra]); }
module.exports = { ...Q, open, newGame, practice, HOST };
