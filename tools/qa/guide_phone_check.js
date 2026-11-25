// tools/qa/guide_phone_check.js [tag] — UI chat, 3D.365 (W249, W270). In the phone look the Guide is grouped rows: Goals and Event log (each opens
// with "‹ Guide" back), Field Notes with the Tips switch (it flips S.introOff) and one row per note found, How to play with one row per topic;
// every row one line, 44 px+, on the screen; a topic row opens a page with the topic's words and Back returns to the Guide; a note row opens the
// note. With the look off, the old Guide.
const Q = require('./lib'); const path = require('path'); const out = path.join(__dirname, '../../runs/ui_samples'); const TAG = process.argv[2] || ''; let bad = 0; const ok = (c, m) => { if (!c) { bad++; console.log('  FAIL ' + m); } };
(async () => { const b = await Q.launch();
  for (const [n, w, h] of [['phone', 390, 844], ['phoneN', 320, 568], ['phoneL', 430, 932]]) { console.log(n);
    const p = await Q.page(b, { w, h, look: '', expose: 'showGuide' }); await Q.newGame(p);
    for (let i = 0; i < 6; i++) { await p.evaluate(() => { const x = [...document.querySelectorAll('#eventModal button')].find((b) => /no more tips/i.test(b.textContent)); if (x) x.click(); }); await Q.clearCards(p); await p.waitForTimeout(500); }
    if (TAG) ok(await p.evaluate(() => ZH.BUILD_TAG) === TAG, 'build tag is ' + TAG);
    await p.evaluate(() => { ZH.S.intro = Object.assign(ZH.S.intro || {}, { 'b:farm': 1, 'b:barrel': 1 }); ZH.S.introOff = false; ZH.showGuide(); }); await p.waitForTimeout(500);
    const m = await p.evaluate(() => { const ib = document.getElementById('ib'), r = (e) => e.getBoundingClientRect(); return { g: !!ib.querySelector('.phGuide'), secs: [...ib.querySelectorAll('.phSec')].map((e) => e.textContent),
      topics: ib.querySelectorAll('[data-topic]').length, notes: ib.querySelectorAll('[data-note]').length, rows: [...ib.querySelectorAll('.phR')].map((e) => { const q = r(e); return { h: q.height, l: q.left, r: q.right, two: !!e.querySelector('small') }; }), W: innerWidth, sentences: ib.querySelectorAll('.phPad, .card').length }; });
    console.log('   sections', JSON.stringify(m.secs));
    ok(m.g && m.secs.length === 2 && /Field Notes/.test(m.secs[0]) && /How to play/.test(m.secs[1]), 'Goals and Event log, Field Notes, How to play'); ok(m.topics === 15 && m.notes >= 2, 'one row per topic (15) and per note');
    ok(m.rows.every((x) => x.h >= 44 && x.l >= 0 && x.r <= m.W + .5 && !x.two), 'every row one line, 44 px+, on the screen'); ok(m.sentences === 0, 'no words on the list page');
    await p.screenshot({ path: path.join(out, `guide_phone_${n}.png`) });
    await p.evaluate(() => document.getElementById('gTips').click()); await p.waitForTimeout(200); ok(await p.evaluate(() => ZH.S.introOff === true && !document.getElementById('gTips').classList.contains('on')), 'the Tips switch turns tips off');
    await p.evaluate(() => document.getElementById('gTips').click()); await p.waitForTimeout(200);
    await p.evaluate(() => document.querySelector('[data-topic="4"]').click()); await p.waitForTimeout(300);
    const t = await p.evaluate(() => ({ title: document.getElementById('it').textContent, words: (document.querySelector('#ib .phPad') || {}).textContent || '', back: document.getElementById('pBack').style.display }));
    ok(t.title === 'Walls' && /SEAL/.test(t.words) && t.back === 'block', 'a topic opens its page with its words and a back link');
    await p.screenshot({ path: path.join(out, `guide_topic_${n}.png`) });
    await p.evaluate(() => document.getElementById('pBack').click()); await p.waitForTimeout(300); ok(await p.evaluate(() => !!document.querySelector('#ib .phGuide [data-topic]')), 'Back returns to the Guide');
    await p.evaluate(() => document.querySelector('[data-note]').click()); await p.waitForTimeout(300); ok(await p.evaluate(() => !!document.querySelector('#ib .gHero') && document.getElementById('pBack').style.display === 'block'), 'a note opens its page');
    await p.evaluate(() => document.getElementById('pBack').click()); await p.waitForTimeout(300);
    await p.evaluate(() => document.getElementById('gGoals').click()); await p.waitForTimeout(400); ok(await p.evaluate(() => document.getElementById('pBack').dataset.t === 'Guide'), 'Goals opens with ‹ Guide back');
    if (n === 'phone') { await p.evaluate(() => { ZH.OPTS.look = 'glass'; document.documentElement.classList.remove('phone'); ZH.showGuide(); }); await p.waitForTimeout(400); ok(await p.evaluate(() => !document.querySelector('#ib .phGuide') && !!document.querySelector('#ib details.card')), 'look off: the old Guide'); }
    ok(!(p.errs || []).length, 'no page errors ' + JSON.stringify(p.errs || [])); await p.close(); }
  await b.close(); console.log(bad ? `FAILED (${bad})` : 'PASS'); process.exit(bad ? 1 : 0); })();
