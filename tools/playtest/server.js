// tools/playtest/server.js — the play-test "controls" (step 1 of claude/zombie-haven-playtest-agents-plan.md).
// Runs the real game with no screen and takes orders over HTTP, so a tester (a Claude agent playing a profile) can
// read the town, decide, and give the orders a player could give. Routine work is done by the auto-player's "hands"
// (tools/balance/ap.js: collect trays, bandage the downed, repair burnt buildings, answer breaches and rescues).
//
//   node tools/playtest/server.js --port 8801 --seed 7 --log runs/newplayer.jsonl [--base http://localhost:8765]
//   then:  node tools/playtest/zh.js 8801 state | help | play 6 | build barrel | answer 0 | away 8 | ...
//
// Every order and every result is written to the run log (one JSON line each, with day and hour), so every claim on an
// evaluation sheet can be checked against it.
const { chromium } = require('playwright'); const http = require('http'); const fs = require('fs'); const path = require('path');
const A = Object.fromEntries(process.argv.slice(2).join(' ').split('--').filter(Boolean).map((s) => { const [k, ...v] = s.trim().split(' '); return [k, v.join(' ')]; }));
const PORT = +(A.port || 8801), SEED = +(A.seed || 7), BASE = A.base || process.env.ZH_BASE || 'http://localhost:8765', LOG = A.log || `playtest_${PORT}.jsonl`;
const AP_SRC = fs.readFileSync(path.join(__dirname, '../balance/ap.js'), 'utf8')
  // the tester answers story cards and move-in requests itself: the hands must not click them at random
  .replace("for (let i = 0; i < 8; i++) { const bs = [...document.querySelectorAll('#eventModal button')]; if (!bs.length) break; bs[Math.floor(Math.random() * bs.length)].click(); }", 'if (on(\'popups\')) for (let i = 0; i < 8; i++) { const bs = [...document.querySelectorAll(\'#eventModal button\')]; if (!bs.length) break; bs[Math.floor(Math.random() * bs.length)].click(); }')
  .replace("let g = 0; while (S.requests.length && document.getElementById('acceptReq') && g++ < 10) document.getElementById('acceptReq').click();", "let g = 0; while (on('requests') && S.requests.length && document.getElementById('acceptReq') && g++ < 10) document.getElementById('acceptReq').click();")
  .replace(/\}\)\(\);\s*$/, 'AP.place = place; AP.walls = walls;\n})();');
if (!AP_SRC.includes("on('popups')") || !AP_SRC.includes("on('requests')") || !AP_SRC.includes('AP.place = place')) { console.error('ap.js changed: update the patches in server.js'); process.exit(1); }
// what the head decides (switched off in the hands); the rest stays with the hands
const HEAD = ['popups', 'requests', 'plan', 'supply', 'rank', 'exp', 'stronghold', 'research', 'events', 'territory', 'trader', 'jobs', 'class', 'veh', 'tools', 'posts', 'walls', 'finale', 'ammo', 'radio', 'traps'];
const EXPOSE = 'findGaps, givePet, takePet, PETS, fillSlots, autoStaff, slotBs, freeFor, fitOf, releasePost, STAFF_JOBS, upgradeBuilding: (b, pl) => upgradeBuilding(b, pl), endBuildModeX: () => endBuildMode(false), selX: () => sel, awayCredit, rankConds, logEvent, expandInfo, professions: () => Object.keys(professions), orderRescueX: (q) => (typeof orderRescue === "function" ? orderRescue(q) : false), unequipX: (q, sl) => (typeof unequip === "function" ? unequip(q, sl) : false), craftCostX: (id) => (typeof craftCost === "function" ? craftCost(id) : null), RECIPESX: (typeof RECIPES === "object" ? RECIPES : {}), nextPopupX: () => nextEventPopup(), lvRushX: (all) => lvRush(all), noRescueWhyX: (q) => noRescueWhy(q), moodLineX: (q) => moodLine(q)';
let log = fs.createWriteStream(LOG, { flags: 'a' });
const W = (o) => log.write(JSON.stringify(o) + '\n');

(async () => {
  const b = await chromium.launch(); const p = await (await b.newContext({ viewport: { width: 390, height: 844 } })).newPage(); const errs = [];
  p.on('pageerror', (e) => errs.push(String(e).slice(0, 300)));
  await p.route(/js\/game\.js/, async (r) => { const res = await r.fetch(); const t = (await res.text()).replace('window.ZH = { BUILD_TAG,', 'window.ZH = { BUILD_TAG, ' + EXPOSE + ','); r.fulfill({ body: t, contentType: 'application/javascript' }); });
  await p.goto(`${BASE}/index.html?s=${SEED}&nocut=1`); await p.waitForTimeout(2500);
  await p.evaluate((seed) => { window.requestAnimationFrame = () => 0; let x = seed; Math.random = () => { x = (x * 1103515245 + 12345) % 2147483648; return x / 2147483648; };
    const b0 = Date.now(); window.__away = 0; Date.now = () => b0 + ZH.tick * 1000 / 60 + window.__away; }, SEED);
  await p.evaluate(AP_SRC); await p.evaluate((head) => { AP.exp = true; head.forEach((k) => AP.off.add(k)); AP.expert = true; AP.xoff = new Set(['policy']);   /* the hands answer breaches and rescues; the town policy is the tester's call */ }, HEAD);
  await p.evaluate(fs.readFileSync(path.join(__dirname, 'town.js'), 'utf8')); if (process.env.PT_DEBUG) await p.evaluate(() => { window.PT_DEBUG = true; });   /* PT_DEBUG=1 adds _give / _eval, for checking the controls only, never for a tester */
  const build = await p.evaluate(() => ZH.BUILD_TAG);
  W({ t: 'start', seed: SEED, build, at: new Date().toISOString() });
  console.log(`play-test server: build ${build}, seed ${SEED}, port ${PORT}, log ${LOG}`);
  let busy = Promise.resolve();
  http.createServer((req, res) => { let body = ''; req.on('data', (c) => body += c); req.on('end', () => { busy = busy.then(async () => {
    let out; try { const { cmd, args = [] } = JSON.parse(body || '{}');
      if (cmd === 'quit') { res.end(JSON.stringify({ ok: true })); W({ t: 'quit' }); log.end(); await b.close(); process.exit(0); }
      out = await p.evaluate(([cmd, args]) => window.PT.run(cmd, args), [cmd, args]);
      if (errs.length) { out.pageErrors = errs.splice(0); }
      W({ t: 'cmd', cmd, args, day: out.day, hour: out.hour, out: JSON.stringify(out).slice(0, 4000) });
    } catch (e) { out = { error: String(e).slice(0, 500) }; W({ t: 'err', body, error: out.error }); }
    res.setHeader('content-type', 'application/json'); res.end(JSON.stringify(out)); }); }); }).listen(PORT);
})();
