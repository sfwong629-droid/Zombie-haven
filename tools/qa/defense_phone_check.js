// tools/qa/defense_phone_check.js [tag] — UI chat, 3D.371 (W249, W270). In the phone look Town · Defense ends with grouped rows instead of the old
// cards: Crisis (with the medals), Practice, Raids (one row per raid, a locked one greyed with why), Factions (one row each: sign, name, their mood
// face and word, or Not met; a tap shows the details); the explosives, land, raid and crisis paragraphs are behind one "How it works ›" row.
// A crisis shows its name, its words and its button. A raid row opens the planner. With the look off, the old cards.
const Q = require('./lib'); const path = require('path'); const out = path.join(__dirname, '../../runs/ui_samples'); const TAG = process.argv[2] || ''; let bad = 0; const ok = (c, m) => { if (!c) { bad++; console.log('  FAIL ' + m); } };
(async () => { const b = await Q.launch();
  for (const [n, w, h] of [['phone', 390, 844], ['phoneN', 320, 568], ['phoneL', 430, 932]]) { console.log(n);
    const p = await Q.page(b, { w, h, look: '', expose: 'showTown' }); await Q.newGame(p);
    await p.evaluate(() => { ZH.S.introOff = true; }); for (let i = 0; i < 6; i++) { await p.evaluate(() => { const x = [...document.querySelectorAll('#eventModal button')].find((b) => /no more tips/i.test(b.textContent)); if (x) x.click(); }); await Q.clearCards(p); await p.waitForTimeout(400); }
    if (TAG) ok(await p.evaluate(() => ZH.BUILD_TAG) === TAG, 'build tag is ' + TAG);
    await p.evaluate(() => { const S = ZH.S; S.fac = S.fac || {}; S.fac.toll = Object.assign(S.fac.toll || {}, { met: true, att: -40 }); S.fac.green = Object.assign(S.fac.green || {}, { met: true, att: 70, ally: true }); S.medals = 2; ZH.showTown('defense'); }); await p.waitForTimeout(500);
    const m = await p.evaluate(() => { const ib = document.getElementById('ib'), r = (e) => e.getBoundingClientRect(); return { secs: [...ib.querySelectorAll('.phSec')].map((e) => e.textContent), old: ib.querySelectorAll('.phOld .card, .card').length,
      raids: ib.querySelectorAll('[data-raid]').length, facs: [...ib.querySelectorAll('.phR.fac')].map((e) => e.querySelector('.v').textContent), faces: ib.querySelectorAll('.phR.fac .vmFace').length, prac: !!document.getElementById('shPrac'), how: !!document.getElementById('tDefHow'),
      notes: [...ib.querySelectorAll('.phFootN')].map((e) => e.textContent).join('|'), dt: [...ib.querySelectorAll('.phR.fac small.dt')].every((e) => e.offsetHeight === 0),
      rows: [...ib.querySelectorAll('.phR')].filter((e) => e.offsetParent).map((e) => { const q = r(e); return { h: q.height, l: q.left, r: q.right }; }), W: innerWidth }; });
    console.log('   sections', JSON.stringify(m.secs)); console.log('   factions', JSON.stringify(m.facs));
    ok(['Crisis · medals 2', 'Practice', 'Raids', 'Factions'].every((t) => m.secs.includes(t)), 'Crisis, Practice, Raids, Factions'); ok(m.old === 0, 'no old cards left');
    ok(m.raids >= 2 && m.prac && m.how, 'raid rows, the practice row and How it works'); ok(m.facs.includes('Not met') && m.facs.some((t) => /Wary/.test(t)) && m.facs.some((t) => /Allies/.test(t)) && m.faces === 2, 'a face and a word for factions met, Not met for the rest');
    ok(!/Pipe bombs|claims more land/.test(m.notes), 'the explosives and land paragraphs are off the page'); ok(m.dt, 'no faction details on the list');
    ok(m.rows.every((x) => x.h >= 44 && x.l >= 0 && x.r <= m.W + .5), 'rows 44 px+, on the screen');
    await p.evaluate(() => { const ib = document.getElementById('ib'); ib.scrollTop = ib.scrollHeight; }); await p.waitForTimeout(200);
    await p.screenshot({ path: path.join(out, `defense_phone_${n}.png`) });
    await p.evaluate(() => document.querySelector('#ib .phR.fac').click()); await p.waitForTimeout(150); ok(await p.evaluate(() => document.querySelector('#ib .phR.fac small.dt').offsetHeight > 0), 'a tap on a faction shows its details');
    await p.evaluate(() => document.getElementById('tDefHow').click()); await p.waitForTimeout(150); ok(await p.evaluate(() => /Pipe bombs/.test(document.querySelector('#ib .phHow').textContent) && document.querySelector('#ib .phHow').offsetHeight > 0), 'How it works holds the explosives and land rules');
    if (n === 'phone') { await p.evaluate(() => { const ib = document.getElementById('ib'); ib.scrollTop = ib.scrollHeight; }); await p.waitForTimeout(200); await p.screenshot({ path: path.join(out, `defense_phone_open_${n}.png`) }); }
    await p.evaluate(() => { const S = ZH.S; S.lvl = 15; S.food = 99; S.meds = 9; S.crisis = { k: 'blight', until: S.day + 3, need: { food: 25, meds: 6 } }; ZH.showTown('defense'); }); await p.waitForTimeout(400);
    const c = await p.evaluate(() => ({ name: (document.querySelector('#ib .phR.crisis .k') || {}).textContent, btn: (document.getElementById('crisisAct') || {}).textContent }));
    ok(/Blight/.test(c.name || '') && c.btn === 'Send the aid', 'a crisis shows its name and its button');
    if (n === 'phone') { await p.evaluate(() => document.querySelector('#ib .phR.crisis').scrollIntoView({ block: 'center' })); await p.waitForTimeout(200); await p.screenshot({ path: path.join(out, `defense_crisis_${n}.png`) }); }
    await p.evaluate(() => { ZH.S.crisis = null; ZH.showTown('defense'); }); await p.waitForTimeout(300);
    await p.evaluate(() => document.querySelector('#ib [data-raid]').click()); await p.waitForTimeout(600); ok(await p.evaluate(() => !document.querySelector('#ib .phTown')), 'a raid row opens the planner');
    if (n === 'phone') { await p.evaluate(() => { ZH.OPTS.look = 'glass'; document.documentElement.classList.remove('phone'); ZH.showTown('defense'); }); await p.waitForTimeout(400); ok(await p.evaluate(() => !document.querySelector('#ib .phTown') && !!document.getElementById('shPrac')), 'look off: the old panel'); }
    ok(!(p.errs || []).length, 'no page errors ' + JSON.stringify(p.errs || [])); await p.close(); }
  await b.close(); console.log(bad ? `FAILED (${bad})` : 'PASS'); process.exit(bad ? 1 : 0); })();
