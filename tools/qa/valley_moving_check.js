// tools/qa/valley_moving_check.js [tag] — UI chat, 3D.364 (W247 step 3). On the valley map: a squad out on a trip is a dot on the line from the
// Haven to its place, with how many went; a tap on it (or the "Squad out" chip) opens the trip with "‹ Map" back; Explore opens on the map even
// with a squad out. The next boss night's horde shows on Route 9 within two days, nearer each day: "Horde · 2 days", "Horde · tomorrow",
// "Horde tonight"; none further off.
const Q = require('./lib'); const path = require('path'); const out = path.join(__dirname, '../../runs/ui_samples'); const TAG = process.argv[2] || ''; let bad = 0; const ok = (c, m) => { if (!c) { bad++; console.log('  FAIL ' + m); } };
(async () => { const b = await Q.launch();
  for (const [n, w, h] of [['phone', 390, 844], ['phoneN', 320, 568]]) { console.log(n);
    const p = await Q.page(b, { w, h, look: '', expose: 'showExplore,nowH,startExpedition' }); await Q.newGame(p);
    for (let i = 0; i < 6; i++) { await p.evaluate(() => { const x = [...document.querySelectorAll('#eventModal button')].find((b) => /no more tips/i.test(b.textContent)); if (x) x.click(); }); await Q.clearCards(p); await p.waitForTimeout(500); }
    if (TAG) ok(await p.evaluate(() => ZH.BUILD_TAG) === TAG, 'build tag is ' + TAG);
    const r = await p.evaluate(() => { const S = ZH.S; S.known = { houses: 1, pharmacy: 1, lumberyard: 1 }; S.nextBoss = S.day + 5; S.leads = [{ id: 'tl1', dest: 'lumberyard', risk: 'low', text: 'x', untilH: ZH.nowH() + 8 }];
      const ids = S.sv.filter((q) => q.hp > 0).slice(0, 2).map((q) => q.id); const r = ZH.startExpedition('lumberyard', 'low', ids); return { ok: r.ok, why: r.why, n: S.trip ? S.trip.members.length : 0 }; });
    ok(r.ok, 'a trip starts (' + JSON.stringify(r) + ')');
    await p.evaluate(() => { const t = ZH.S.trip; ZH.S.expClock = t.t0 + t.dur * .5; ZH.showExplore(); }); await p.waitForTimeout(500);
    const m = await p.evaluate(() => { const ib = document.getElementById('ib'), r = (e) => e.getBoundingClientRect(), sq = ib.querySelector('#vmSquad'), M = r(ib.querySelector('.vmMap')), hv = r(ib.querySelector('.vmPin.home .vmDot')), ld = r(ib.querySelector('[data-vm=lumberyard] .vmDot'));
      const c = (q) => [(q.left + q.right) / 2, (q.top + q.bottom) / 2], s = sq && r(sq.querySelector('.vmDot'));
      return { map: !!ib.querySelector('.vmMap'), sq: !!sq, n: sq && sq.querySelector('.vmN').textContent, s: s && c(s), hv: c(hv), ld: c(ld), herd: !!ib.querySelector('.vmHerd'), chip: !!ib.querySelector('#vmTrip') }; });
    ok(m.map && m.sq, 'Explore opens on the map with the squad on it'); ok(m.n === String(r.n), 'the squad shows how many went (' + m.n + ')');
    const between = m.s && Math.min(m.hv[1], m.ld[1]) - 4 <= m.s[1] && m.s[1] <= Math.max(m.hv[1], m.ld[1]) + 4 && Math.min(m.hv[0], m.ld[0]) - 4 <= m.s[0] && m.s[0] <= Math.max(m.hv[0], m.ld[0]) + 4;
    ok(between, 'the squad is between the Haven and its place'); ok(!m.herd, 'no horde when the boss night is five days off'); ok(m.chip, 'a "Squad out" chip');
    await p.evaluate(() => document.getElementById('vmSquad').click()); await p.waitForTimeout(400);
    ok(await p.evaluate(() => !document.querySelector('#ib .vmMap') && document.getElementById('pBack').dataset.t === 'Map' && /Lumber/.test(document.getElementById('ib').textContent)), 'a tap on the squad opens the trip with ‹ Map back');
    await p.evaluate(() => document.getElementById('pBack').click()); await p.waitForTimeout(300); ok(await p.evaluate(() => !!document.querySelector('#ib .vmMap')), 'back to the map');
    const words = [];
    for (const d of [2, 1, 0]) { await p.evaluate((d) => { ZH.S.nextBoss = ZH.S.day + d; ZH.showExplore(); }, d); await p.waitForTimeout(250);
      words.push(await p.evaluate(() => { const h = document.querySelector('#ib .vmHerd'); return h ? h.querySelector('.vmTag').textContent + '@' + Math.round(h.getBoundingClientRect().top) : ''; })); }
    console.log('   horde', words.join(' | '));
    ok(/^Horde · 2 days/.test(words[0]) && /^Horde · tomorrow/.test(words[1]) && /^Horde tonight/.test(words[2]), 'the horde\'s word for each day');
    ok(words.map((x) => +x.split('@')[1]).every((y, i, a) => !i || y > a[i - 1]), 'the horde comes nearer each day');
    await p.evaluate(() => { ZH.S.nextBoss = ZH.S.day + 1; ZH.showExplore(); }); await p.waitForTimeout(300);
    await p.screenshot({ path: path.join(out, `valley_moving_${n}.png`) });
    ok(!(p.errs || []).length, 'no page errors ' + JSON.stringify(p.errs || [])); await p.close(); }
  await b.close(); console.log(bad ? `FAILED (${bad})` : 'PASS'); process.exit(bad ? 1 : 0); })();
