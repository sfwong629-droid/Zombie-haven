// tools/qa/needs_phone_check.js [tag] — UI chat, 3D.354 (W270, owner: "the warning menu should match the style we are going for with the iphone
// menu"). In the phone look Needs you is a frosted glass sheet (blur, see-through tint) with a large title, small grey group titles Now and Tips,
// notification rows 44 px+ inside the screen with a coloured square sign; Go, a row's ✕ and the close still work; the old list with the look off.
const Q = require('./lib'); const path = require('path'); const out = path.join(__dirname, '../../runs/ui_samples'); const TAG = process.argv[2] || ''; let bad = 0; const ok = (c, m) => { if (!c) { bad++; console.log('  FAIL ' + m); } };
(async () => { const b = await Q.launch();
  for (const [n, w, h] of [['phone', 390, 844], ['phoneN', 320, 568], ['phoneL', 430, 932]]) { console.log(n);
    const p = await Q.page(b, { w, h, look: '', expose: 'alertHub,note,OPTS,Wd,pushUnitsOut' }); await Q.newGame(p);
    for (let i = 0; i < 6; i++) { await p.evaluate(() => { const x = [...document.querySelectorAll('#eventModal button')].find((b) => /no more tips/i.test(b.textContent)); if (x) x.click(); }); await Q.clearCards(p); await p.waitForTimeout(500); }
    if (TAG) ok(await p.evaluate(() => ZH.BUILD_TAG) === TAG, 'build tag is ' + TAG);
    await p.evaluate(() => { const W = ZH.world, S = ZH.S; S.stage = 3; ZH.OPTS.advisor = true; S.advMute = {};
      for (const t of ['farm', 'barrel']) { const D = ZH.Wd.DEFS[t], B = ZH.Wd.BUILD; outer: for (let y = B.y0; y <= B.y1; y++) for (let x = B.x0; x <= B.x1; x++) if (ZH.Wd.placementCheck(W, x, y, D, null).ok) { const b = { type: t, x, y, w: D.w, h: D.h, q: D.q, a: D.a, staff: null }; W.buildings.push(b); ZH.Wd.bump(W); ZH.pushUnitsOut(b); break outer; } }
      for (const b of W.buildings) if (ZH.Wd.DEFS[b.type].slot) b.staff = null; for (const q of S.sv) { q.post = null; q.job = 'Guard'; }
      ZH.note('critical', 'Fire at the Lodge', { key: 'testfire', icon: '🔥', live: () => true, at: () => S.sv[0].w }); });
    await p.waitForTimeout(1500); await Q.clearCards(p); await p.evaluate(() => { const a = document.getElementById('alertBtn'); if (a && !document.getElementById('alertPop')) a.click(); }); await p.waitForTimeout(700);
    const m = await p.evaluate(() => { const pop = document.getElementById('alertPop'), cs = getComputedStyle(pop), r = (e) => e.getBoundingClientRect(); return { note: pop.classList.contains('phNote'), blur: cs.backdropFilter || cs.webkitBackdropFilter || '', bg: cs.backgroundColor, title: parseFloat(getComputedStyle(pop.querySelector('.apH b')).fontSize), secs: [...pop.querySelectorAll('.apS')].map((e) => e.textContent),
      rows: [...pop.querySelectorAll('.apRow')].map((e) => { const q = r(e), i = r(e.querySelector('.apI')); return { t: e.querySelector('.apT').textContent, h: q.height, l: q.left, r: q.right, sign: getComputedStyle(e.querySelector('.apI')).backgroundColor, iw: i.width }; }), W: innerWidth, H: innerHeight, pr: r(pop) }; });
    console.log('  ', JSON.stringify(m.rows.map((x) => x.t)));
    ok(m.note && /blur/.test(m.blur), 'a frosted glass sheet'); { const a = (m.bg.match(/[\d.]+/g) || []).map(Number); ok(a.length === 4 && a[3] <= .7, 'see-through tint (' + m.bg + ')'); }
    ok(m.title >= 20, 'a large title'); ok(m.secs[0] === 'Now' && m.secs.includes('Tips'), 'group titles Now and Tips (' + m.secs + ')');
    ok(m.rows.length >= 2 && m.rows.every((x) => x.h >= 44 && x.l >= 0 && x.r <= m.W && x.iw >= 30 && !/rgba\(0, 0, 0, 0\)/.test(x.sign)), 'rows 44 px+, on the screen, each with a coloured square sign'); ok(m.pr.bottom <= m.H, 'the sheet is on the screen');
    await p.screenshot({ path: path.join(out, `needs_phone_${n}.png`) });
    await p.evaluate(() => { const r = [...document.querySelectorAll('#alertPop .apRow')].find((x) => /jobs need a worker|: no worker/.test(x.textContent)); if (r && r.querySelector('.apM')) r.querySelector('.apM').click(); }); await p.waitForTimeout(500);
    ok(await p.evaluate(() => !/worker/.test((document.getElementById('alertPop') || {}).textContent || '')), "a row's ✕ hides it");
    await p.evaluate(() => document.querySelector('#alertPop .apX').click()); await p.waitForTimeout(400); ok(await p.evaluate(() => !document.getElementById('alertPop')), 'the close shuts it');
    if (n === 'phone') { await p.evaluate(() => { ZH.OPTS.look = 'glass'; document.documentElement.classList.remove('phone'); document.getElementById('alertBtn').click(); }); await p.waitForTimeout(500); ok(await p.evaluate(() => { const q = document.getElementById('alertPop'); return !!q && !q.classList.contains('phNote') && !q.querySelector('.apS'); }), 'look off: the old list'); }
    ok(!(p.errs || []).length, 'no page errors ' + JSON.stringify(p.errs || [])); await p.close(); }
  await b.close(); console.log(bad ? `FAILED (${bad})` : 'PASS'); process.exit(bad ? 1 : 0); })();
