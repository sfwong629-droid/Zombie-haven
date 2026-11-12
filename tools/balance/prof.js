// node prof.js SEED DAYS [OPT]  : plays like run.py and prints, for every slow game day, where the time went (top functions by own time)
const { chromium } = require('playwright'); const fs = require('fs'); const [, , SEED, DAYS, OPT = ''] = process.argv;
(async () => { const b = await chromium.launch(), pg = await (await b.newContext({ viewport: { width: 390, height: 844 } })).newPage();
  await pg.goto(`http://localhost:8765/index.html?s=${SEED}&nocut=1${OPT}`); await pg.waitForTimeout(2500);
  await pg.evaluate((seed) => { window.requestAnimationFrame = () => 0; let x = seed; Math.random = () => { x = (x * 1103515245 + 12345) % 2147483648; return x / 2147483648; }; ZH.showEventPopup = () => {}; const b0 = Date.now(); Date.now = () => b0 + ZH.tick * 1000 / 60; }, +SEED);
  await pg.evaluate(fs.readFileSync(__dirname + '/ap.js', 'utf8')); await pg.evaluate(() => { AP.exp = true; AP.nowalls = false; const h0 = AP.hour; AP.hour = () => { if (ZH.S.lvUp) ZH.S.lvUp.left = 0; h0(); }; });
  const cdp = await pg.context().newCDPSession(pg); await cdp.send('Profiler.enable'); await cdp.send('Profiler.setSamplingInterval', { interval: 2000 }); let base = null;
  for (let d = 0; d < +DAYS; d++) { await cdp.send('Profiler.start'); const t0 = Date.now();
    const r = await pg.evaluate(() => { for (let h = 0; h < 24; h++) { for (let k = 0; k < 1000; k += 60) { ZH.step(60); ZH.tripUpdate(); AP.tick(); } AP.hour(); } return { d: ZH.S.day, z: ZH.S.z.length, sv: ZH.S.sv.length, crisis: ZH.S.crisis ? ZH.S.crisis.k : '', walls: [...(ZH.world ? ZH.world.walls.values() : [])].length }; });
    const dt = (Date.now() - t0) / 1000, { profile } = await cdp.send('Profiler.stop'); if (base == null || dt < base) base = dt;
    const self = {}; const dts = profile.timeDeltas || [], idx = {}; profile.nodes.forEach((n) => { idx[n.id] = n; }); (profile.samples || []).forEach((id, i) => { const n = idx[id], k = n.callFrame.functionName || '(anon ' + n.callFrame.lineNumber + ')'; self[k] = (self[k] || 0) + (dts[i] || 0); });
    const top = Object.entries(self).sort((a, c) => c[1] - a[1]).slice(0, 7).map(([k, v]) => k + ' ' + Math.round(v / 1e4) / 100 + 's');
    console.log(`day ${r.d} ${dt.toFixed(1)}s z${r.z} sv${r.sv} ${r.crisis} | ${dt > base * 2.5 ? top.join(', ') : ''}`); }
  await b.close(); })();
