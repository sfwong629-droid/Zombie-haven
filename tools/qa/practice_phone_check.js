// tools/qa/practice_phone_check.js [tag] — UI chat, 3D.370 (W249, W270). In the phone look Stronghold practice is a settings form: Place and Town
// level rows (each opens a list with a tick, "‹ Practice" back, a tap picks and comes back), Squad 4 to 8 and, for a faction camp, Day / Night as
// segmented controls, a wide Start practice, How it works with the controls. Opened from Town · Defense it has "‹ Town" back. Start opens the place.
// With the look off, the old page.
const Q = require('./lib'); const path = require('path'); const out = path.join(__dirname, '../../runs/ui_samples'); const TAG = process.argv[2] || ''; let bad = 0; const ok = (c, m) => { if (!c) { bad++; console.log('  FAIL ' + m); } };
(async () => { const b = await Q.launch();
  for (const [n, w, h] of [['phone', 390, 844], ['phoneN', 320, 568], ['phoneL', 430, 932]]) { console.log(n);
    const p = await Q.page(b, { w, h, look: '', expose: 'showShPractice,showTown' }); await Q.newGame(p);
    await p.evaluate(() => { ZH.S.introOff = true; }); for (let i = 0; i < 6; i++) { await p.evaluate(() => { const x = [...document.querySelectorAll('#eventModal button')].find((b) => /no more tips/i.test(b.textContent)); if (x) x.click(); }); await Q.clearCards(p); await p.waitForTimeout(400); }
    if (TAG) ok(await p.evaluate(() => ZH.BUILD_TAG) === TAG, 'build tag is ' + TAG);
    await p.evaluate(() => { ZH.showTown('defense'); }); await p.waitForTimeout(400);
    ok(await p.evaluate(() => !!document.getElementById('shPrac')), 'Town · Defense has the practice row');
    await p.evaluate(() => document.getElementById('shPrac').click()); await p.waitForTimeout(400);
    const m = await p.evaluate(() => { const ib = document.getElementById('ib'), r = (e) => e.getBoundingClientRect(); return { pr: !!ib.querySelector('.phPrac'), title: document.getElementById('it').textContent, back: document.getElementById('pBack').dataset.t, bs: document.getElementById('pBack').style.display,
      place: (ib.querySelector('[data-pk="map"] .v') || {}).textContent, lv: (ib.querySelector('[data-pk="lv"] .v') || {}).textContent, seg: [...ib.querySelectorAll('[data-pn]')].map((e) => e.textContent).join(), night: !!ib.querySelector('[data-pt]'),
      go: !!document.getElementById('prGo'), how: !!document.getElementById('prHow'), smalls: ib.querySelectorAll('.sm').length,
      rows: [...ib.querySelectorAll('.phR, .phSeg button, #prGo')].map((e) => { const q = r(e); return { h: q.height, l: q.left, r: q.right }; }), W: innerWidth }; });
    console.log('   place', m.place, 'level', m.lv);
    ok(m.pr && m.title === 'Practice' && m.back === 'Town' && m.bs === 'block', 'Practice with ‹ Town back'); ok(m.place && m.lv === '6' && m.seg === '4,5,6,7,8' && !m.night, 'Place, Town level, Squad 4 to 8, no Day / Night for a stronghold');
    ok(m.go && m.how && m.smalls === 0, 'Start and How it works, no sentences on the page'); ok(m.rows.every((x) => x.h >= 44 && x.l >= 0 && x.r <= m.W + .5), 'rows and buttons 44 px+, on the screen');
    await p.screenshot({ path: path.join(out, `practice_phone_${n}.png`) });
    await p.evaluate(() => document.querySelector('[data-pk="map"]').click()); await p.waitForTimeout(300);
    const l = await p.evaluate(() => ({ title: document.getElementById('it').textContent, back: document.getElementById('pBack').dataset.t, secs: [...document.querySelectorAll('#ib .phSec')].map((e) => e.textContent), n: document.querySelectorAll('#ib [data-pm]').length, ticks: document.querySelectorAll('#ib [data-pm] .tk svg').length }));
    ok(l.title === 'Place' && l.back === 'Practice' && l.secs.join() === 'Strongholds,Faction camps' && l.n > 8 && l.ticks === 1, 'the Place list: two groups, one tick, ‹ Practice back');
    if (n === 'phone') await p.screenshot({ path: path.join(out, `practice_place_${n}.png`) });
    await p.evaluate(() => document.querySelector('#ib [data-pm="raid_toll"]').click()); await p.waitForTimeout(300);
    const c = await p.evaluate(() => ({ title: document.getElementById('it').textContent, place: document.querySelector('[data-pk="map"] .v').textContent, night: [...document.querySelectorAll('#ib [data-pt]')].map((e) => e.textContent).join(), back: document.getElementById('pBack').dataset.t }));
    ok(c.title === 'Practice' && /Toll/.test(c.place) && c.night === 'Day,Night' && c.back === 'Town', 'picking a camp comes back with Day / Night and ‹ Town');
    await p.evaluate(() => document.querySelector('[data-pt="1"]').click()); await p.waitForTimeout(200); await p.evaluate(() => document.querySelector('[data-pn="4"]').click()); await p.waitForTimeout(200);
    await p.evaluate(() => document.querySelector('[data-pk="lv"]').click()); await p.waitForTimeout(250); await p.evaluate(() => document.querySelector('#ib [data-pl="12"]').click()); await p.waitForTimeout(250);
    const s = await p.evaluate(() => ({ lv: document.querySelector('[data-pk="lv"] .v').textContent, on: [...document.querySelectorAll('#ib .phSeg .on')].map((e) => e.textContent).join() }));
    ok(s.lv === '12' && s.on === '4,Night', 'level 12, squad 4, night are kept');
    if (n === 'phone') await p.screenshot({ path: path.join(out, `practice_camp_${n}.png`) });
    await p.evaluate(() => document.getElementById('prHow').click()); await p.waitForTimeout(150); ok(await p.evaluate(() => /Get out/.test(document.querySelector('#ib .phHow').textContent) && document.querySelector('#ib .phHow').offsetHeight > 0), 'How it works holds the controls');
    await p.evaluate(() => document.getElementById('pBack').click()); await p.waitForTimeout(300); ok(await p.evaluate(() => !!document.getElementById('shPrac')), '‹ Town goes back to Town · Defense');
    await p.evaluate(() => document.getElementById('shPrac').click()); await p.waitForTimeout(300);
    await p.evaluate(() => document.getElementById('prGo').click()); await p.waitForTimeout(1500);
    ok(await p.evaluate(() => !!(ZH.S.sh && ZH.S.sh.practice && ZH.S.sh.night)), 'Start opens the practice, at night');
    if (n === 'phone') { await p.evaluate(() => { ZH.S.sh = null; ZH.OPTS.look = 'glass'; document.documentElement.classList.remove('phone'); ZH.showShPractice(); }); await p.waitForTimeout(400); ok(await p.evaluate(() => !document.querySelector('#ib .phPrac') && /Stronghold practice/.test(document.getElementById('it').textContent) && !!document.querySelector('#ib [data-pm]')), 'look off: the old page'); }
    ok(!(p.errs || []).length, 'no page errors ' + JSON.stringify(p.errs || [])); await p.close(); }
  await b.close(); console.log(bad ? `FAILED (${bad})` : 'PASS'); process.exit(bad ? 1 : 0); })();
