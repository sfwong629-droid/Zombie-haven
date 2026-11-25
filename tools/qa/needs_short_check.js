// tools/qa/needs_short_check.js [tag] — UI chat, 3D.350 (W270, rules 3 and 4: the same warning once, with a count; titles of two to four words).
// In the phone look: the shortening rules on known titles; three workplaces with no worker become one row "3 jobs need a worker" whose Go opens
// Workplaces and whose ✕ hides all three for the day; no row in the list has more than 6 words; with the look off the list is as before.
const Q = require('./lib'); const path = require('path'); const out = path.join(__dirname, '../../runs/ui_samples'); const TAG = process.argv[2] || ''; let bad = 0; const ok = (c, m) => { if (!c) { bad++; console.log('  FAIL ' + m); } };
const T = [['The Haven can reach the next level', 'Ready to level up'], ["Garden Plot has no Farmer: change someone's profession", 'Garden Plot: no worker'], ['Rain Barrel has no worker: Rosa could take it', 'Rain Barrel: no worker'],
  ['Your wall ring has 4 gaps', '4 gaps in the wall'], ['Your wall ring has 1 gap', '1 gap in the wall'], ['No backup this week: export one (Safari can clear old site data)', 'No backup this week'], ['Water runs out in about 5 h · −6.5 / day', 'Water gone in 5 h'],
  ['Food runs out in about 2.4 days', 'Food gone in 2.4 days'], ['Marcus slipped out of the Camp before it fell.', 'Marcus fled the Camp'], ['A horde of 40 zombies is at the walls. Something big walks behind it.', 'Horde of 40 at the walls'],
  ['Out of water · 1.8 of 8.3 needed per day', 'Out of water'], ['Fire at the Lodge', 'Fire at the Lodge'], ['Marcus is down · 42 s left · no rescuer: nobody fit', 'Marcus down · 42 s left'], ['Wall breached · 3 zombies near · repairing', 'Wall breached · 3 zombies'], ['Wall breached · no zombies near · repair waiting', 'Wall breached · no zombies'], ['🆘 SOS from the Clinic', '🆘 SOS from the Clinic']];
(async () => { const b = await Q.launch();
  for (const [n, w, h] of [['phone', 390, 844], ['phoneN', 320, 568]]) { console.log(n);
    const p = await Q.page(b, { w, h, look: '', expose: 'hubShortText,alertHub,OPTS,Wd,pushUnitsOut' }); await Q.newGame(p);
    for (let i = 0; i < 6; i++) { await p.evaluate(() => { const x = [...document.querySelectorAll('#eventModal button')].find((b) => /no more tips/i.test(b.textContent)); if (x) x.click(); }); await Q.clearCards(p); await p.waitForTimeout(500); }
    if (TAG) ok(await p.evaluate(() => ZH.BUILD_TAG) === TAG, 'build tag is ' + TAG);
    const got = await p.evaluate((T) => T.map(([a]) => ZH.hubShortText(a)), T); T.forEach(([a, want], i) => ok(got[i] === want, `"${a}" -> "${want}" (got "${got[i]}")`));
    await p.evaluate(() => { const W = ZH.world, S = ZH.S; S.stage = 3; ZH.OPTS.advisor = true; S.advMute = {}; let put = 0;
      for (const t of ['farm', 'barrel', 'farm']) { const D = ZH.Wd.DEFS[t], B = ZH.Wd.BUILD; outer: for (let y = B.y0; y <= B.y1; y++) for (let x = B.x0; x <= B.x1; x++) if (ZH.Wd.placementCheck(W, x, y, D, null).ok) { const b = { type: t, x, y, w: D.w, h: D.h, q: D.q, a: D.a, staff: null }; W.buildings.push(b); ZH.Wd.bump(W); ZH.pushUnitsOut(b); put++; break outer; } }
      for (const b of W.buildings) if (ZH.Wd.DEFS[b.type].slot) b.staff = null; for (const q of S.sv) { q.post = null; q.job = 'Guard'; } });
    await p.waitForTimeout(1500); await Q.clearCards(p); await p.evaluate(() => { const a = document.getElementById('alertBtn'); if (a) a.click(); }); await p.waitForTimeout(600);
    const rows = () => p.evaluate(() => [...document.querySelectorAll('#alertPop .apRow')].map((r) => { const q = r.getBoundingClientRect(); return { t: r.querySelector('.apT').textContent, h: q.height, r: q.right, W: innerWidth }; }));
    let R = await rows(); console.log('  ', JSON.stringify(R.map((r) => r.t)));
    const st = R.filter((r) => /jobs need a worker$/.test(r.t)); ok(st.length === 1 && !R.some((r) => /: no worker$/.test(r.t)), 'workplaces with no worker are one row with a count');
    ok(R.every((r) => r.t.trim().split(/\s+/).length <= 6), 'no row has more than 6 words'); ok(R.every((r) => r.r <= r.W), 'every row on the screen');
    await p.screenshot({ path: path.join(out, `needs_short_${n}.png`) });
    await p.evaluate(() => { const r = [...document.querySelectorAll('#alertPop .apRow')].find((x) => /jobs need a worker/.test(x.textContent)); r.querySelector('.apA').click(); }); await p.waitForTimeout(500);
    ok(await p.evaluate(() => document.getElementById('it').textContent === 'Jobs' && /Workplaces/.test(document.querySelector('#ib .on, #ib .tabs button.on, #ib [data-tab].on') ? document.querySelector('#ib [data-tab].on, #ib .tabs button.on').textContent : document.getElementById('ib').textContent)), 'Go opens Workplaces');
    await p.evaluate(() => { try { ZH.closeP(); } catch (e) { /* none */ } }); await p.waitForTimeout(400); await Q.clearCards(p); await p.evaluate(() => { const a = document.getElementById('alertBtn'); if (a && !document.getElementById('alertPop')) a.click(); }); await p.waitForTimeout(500);
    await p.evaluate(() => { const r = [...document.querySelectorAll('#alertPop .apRow')].find((x) => /jobs need a worker/.test(x.textContent)); if (r) r.querySelector('.apM').click(); }); await p.waitForTimeout(500);
    R = await rows(); ok(!R.some((r) => /worker/.test(r.t)), 'its ✕ hides all of them for the day');
    if (n === 'phone') { await p.evaluate(() => { ZH.S.advMute = {}; ZH.OPTS.look = 'glass'; document.documentElement.classList.remove('phone'); ZH.alertHub(); }); await p.waitForTimeout(600); await Q.clearCards(p); await p.evaluate(() => { if (!document.getElementById('alertPop')) document.getElementById('alertBtn').click(); }); await p.waitForTimeout(500);
      R = await rows(); ok(R.filter((r) => /has no/.test(r.t)).length >= 2, 'look off: the list as before'); }
    ok(!(p.errs || []).length, 'no page errors ' + JSON.stringify(p.errs || [])); await p.close(); }
  await b.close(); console.log(bad ? `FAILED (${bad})` : 'PASS'); process.exit(bad ? 1 : 0); })();
