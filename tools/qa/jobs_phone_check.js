// tools/qa/jobs_phone_check.js [tag] — UI chat, 3D.358 (W249 "do next screen", W270 less reading). In the phone look Jobs is grouped lists:
// People: a Specialists / Hybrids pair of rows, then everyone under their job, one line a row (no second line), 44 px+, on the screen; a tap opens
// the person with a back link to Jobs. Workplaces: a red count on its segment equal to the empty workplaces, a Staffed bar, a Fill button that
// fills, Empty and Staffed lists, a tap opens the building. "How it works" opens the rules. With the look off, the old screen.
const Q = require('./lib'); const path = require('path'); const out = path.join(__dirname, '../../runs/ui_samples'); const TAG = process.argv[2] || ''; let bad = 0; const ok = (c, m) => { if (!c) { bad++; console.log('  FAIL ' + m); } };
(async () => { const b = await Q.launch();
  for (const [n, w, h] of [['phone', 390, 844], ['phoneN', 320, 568], ['phoneL', 430, 932]]) { console.log(n);
    const p = await Q.page(b, { w, h, look: '', expose: 'showJobs,Wd,pushUnitsOut' }); await Q.newGame(p);
    for (let i = 0; i < 6; i++) { await p.evaluate(() => { const x = [...document.querySelectorAll('#eventModal button')].find((b) => /no more tips/i.test(b.textContent)); if (x) x.click(); }); await Q.clearCards(p); await p.waitForTimeout(500); }
    if (TAG) ok(await p.evaluate(() => ZH.BUILD_TAG) === TAG, 'build tag is ' + TAG);
    await p.evaluate(() => { const W = ZH.world;
      for (const t of ['farm', 'barrel', 'farm']) { const D = ZH.Wd.DEFS[t], B = ZH.Wd.BUILD; outer: for (let y = B.y0; y <= B.y1; y++) for (let x = B.x0; x <= B.x1; x++) if (ZH.Wd.placementCheck(W, x, y, D, null).ok) { const b = { type: t, x, y, w: D.w, h: D.h, q: D.q, a: D.a, staff: null }; W.buildings.push(b); ZH.Wd.bump(W); ZH.pushUnitsOut(b); break outer; } }
      ZH.showJobs(null, 'people'); });
    await p.waitForTimeout(600);
    const m = await p.evaluate(() => { const ib = document.getElementById('ib'), r = (e) => e.getBoundingClientRect(); return { jobs: !!ib.querySelector('.phJobs'), seg: ib.querySelectorAll('.phSeg button').length, secs: [...ib.querySelectorAll('.phSec')].map((e) => e.textContent).filter(Boolean),
      rows: [...ib.querySelectorAll('[data-sv]')].map((e) => { const q = r(e); return { h: q.height, l: q.left, r: q.right, two: !!e.querySelector('small') }; }), n: ZH.S.sv.length, W: innerWidth }; });
    console.log('   people sections', JSON.stringify(m.secs));
    ok(m.jobs && m.seg === 2, 'People: the phone screen with two segments'); ok(m.secs.length >= 1, 'grouped under job titles');
    ok(m.rows.length === m.n, 'everyone listed once (' + m.rows.length + ' of ' + m.n + ')'); ok(m.rows.every((x) => x.h >= 44 && x.l >= 0 && x.r <= m.W + 0.5), 'rows 44 px+, on the screen'); ok(m.rows.every((x) => !x.two), 'one line a row');
    await p.screenshot({ path: path.join(out, `jobs_phone_people_${n}.png`) });
    await p.evaluate(() => document.getElementById('jHow').click()); await p.waitForTimeout(300); ok(await p.evaluate(() => getComputedStyle(document.querySelector('#ib .phHow')).display !== 'none' && /Specialist/.test(document.querySelector('#ib .phHow').textContent)), 'How it works opens the rules');
    await p.evaluate(() => document.querySelector('#ib [data-sv]').click()); await p.waitForTimeout(500); ok(await p.evaluate(() => document.getElementById('pBack').style.display === 'block' && document.getElementById('pBack').dataset.t === 'Jobs'), 'a person opens with a back link to Jobs');
    await p.evaluate(() => { const S = ZH.S, W = ZH.world; for (const b of W.buildings) if (ZH.Wd.DEFS[b.type].slot) { if (b.staff) b.staff.post = null; b.staff = null; } for (const q of S.sv) q.post = null; ZH.showJobs(null, 'work'); }); await p.waitForTimeout(500);
    const k = await p.evaluate(() => { const ib = document.getElementById('ib'), r = (e) => e.getBoundingClientRect(), slots = ZH.world.buildings.filter((b) => ZH.Wd.DEFS[b.type].slot && !b.burnt); return { badge: +((ib.querySelector('.phBadge') || {}).textContent || 0), empty: slots.filter((b) => !b.staff).length, bar: /of/.test((ib.querySelector('.phBar em') || {}).textContent || ''), fill: !!ib.querySelector('#wpFill'),
      secs: [...ib.querySelectorAll('.phSec')].map((e) => e.textContent).filter(Boolean), rows: [...ib.querySelectorAll('[data-wp]')].map((e) => { const q = r(e); return { h: q.height, l: q.left, r: q.right }; }), W: innerWidth }; });
    console.log('   work', JSON.stringify({ badge: k.badge, empty: k.empty, secs: k.secs }));
    ok(k.empty > 0 && k.badge === k.empty, 'the red count equals the empty workplaces'); ok(k.bar, 'a Staffed bar'); ok(k.secs[0] === 'Empty', 'an Empty list'); ok(k.rows.length >= k.empty && k.rows.every((x) => x.h >= 44 && x.l >= 0 && x.r <= k.W + 0.5), 'workplace rows 44 px+, on the screen');
    await p.screenshot({ path: path.join(out, `jobs_phone_work_${n}.png`) });
    if (k.fill) { await p.evaluate(() => document.getElementById('wpFill').click()); await p.waitForTimeout(500); ok(await p.evaluate(() => ZH.world.buildings.filter((b) => ZH.Wd.DEFS[b.type].slot && !b.burnt && !b.staff).length) < k.empty, 'Fill fills'); await p.screenshot({ path: path.join(out, `jobs_phone_filled_${n}.png`) }); } else console.log('   (nobody free to fill)');
    await p.evaluate(() => document.querySelector('#ib [data-wp]').click()); await p.waitForTimeout(500); ok(await p.evaluate(() => document.getElementById('pBack').style.display === 'block'), 'a workplace opens its building');
    if (n === 'phone') { await p.evaluate(() => { ZH.OPTS.look = 'glass'; document.documentElement.classList.remove('phone'); ZH.showJobs(null, 'people'); }); await p.waitForTimeout(400); ok(await p.evaluate(() => !document.querySelector('#ib .phJobs') && !!document.querySelector('#ib [data-sv]')), 'look off: the old screen'); }
    ok(!(p.errs || []).length, 'no page errors ' + JSON.stringify(p.errs || [])); await p.close(); }
  await b.close(); console.log(bad ? `FAILED (${bad})` : 'PASS'); process.exit(bad ? 1 : 0); })();
