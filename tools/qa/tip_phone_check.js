// tools/qa/tip_phone_check.js [tag] — UI chat, 3D.372 (W249, W270 rule 6). In the phone look a new zombie's tip card says one line: its picture,
// "New zombie", the name large, the first sentence of what to do; "More ›" opens what it is and the rest; a lime Got it and a plain No more tips.
// No old "What it is" paragraph and no footer sentence on the card at first. No more tips turns tips off. With the look off, the old card.
const Q = require('./lib'); const path = require('path'); const out = path.join(__dirname, '../../runs/ui_samples'); const TAG = process.argv[2] || ''; let bad = 0; const ok = (c, m) => { if (!c) { bad++; console.log('  FAIL ' + m); } };
(async () => { const b = await Q.launch();
  for (const [n, w, h] of [['phone', 390, 844], ['phoneN', 320, 568], ['phoneL', 430, 932]]) { console.log(n);
    const p = await Q.page(b, { w, h, look: '', expose: 'intro' }); await Q.newGame(p);
    await p.evaluate(() => { window.ZH_INTRO = 1; ZH.S.introOff = false; }); await Q.clearCards(p);
    for (let i = 0; i < 8; i++) { await p.evaluate(() => { const x = document.querySelector('#eventModal #eventOk'); if (x) x.click(); }); await p.waitForTimeout(300); }
    if (TAG) ok(await p.evaluate(() => ZH.BUILD_TAG) === TAG, 'build tag is ' + TAG);
    await p.evaluate(() => { delete (ZH.S.intro || {})['z:runner']; ZH.intro('z:runner'); }); await p.waitForTimeout(900);
    const m = await p.evaluate(() => { const e = document.querySelector('#eventModal .evBox'), r = (x) => x.getBoundingClientRect(); if (!e) return null; const f = e.querySelector('.tipF');
      return { tip: !!e.querySelector('.tipP'), kind: (e.querySelector('.tipK') || {}).textContent, name: (e.querySelector('.tipN') || {}).textContent, line: (e.querySelector('.tipL') || {}).textContent, img: !!e.querySelector('.tipP img'),
        fHidden: f && f.offsetHeight === 0, words: e.innerText.split(/\s+/).filter(Boolean).length, btns: [...e.querySelectorAll('button.act')].map((x) => ({ t: x.textContent, go: x.classList.contains('go'), h: r(x).height })),
        box: (() => { const q = r(e); return { t: q.top, b: q.bottom, l: q.left, r: q.right }; })(), W: innerWidth, H: innerHeight }; });
    console.log('   card', m && JSON.stringify({ kind: m.kind, name: m.name, line: m.line, words: m.words }));
    ok(m && m.tip && m.kind === 'New zombie' && m.name && m.line && m.line.split(/\s+/).length <= 14, 'kind, name and one line'); ok(m && m.fHidden, 'what it is waits behind More');
    ok(m && m.words <= 30, 'at most 30 words on the card at first'); ok(m && m.btns.length === 2 && m.btns[0].t === 'Got it' && m.btns[0].go && !m.btns[1].go && m.btns.every((x) => x.h >= 44), 'a lime Got it and a plain No more tips, 44 px+');
    ok(m && m.box.t >= 0 && m.box.b <= m.H + .5 && m.box.l >= 0 && m.box.r <= m.W + .5, 'the card fits the screen');
    await p.screenshot({ path: path.join(out, `tip_phone_${n}.png`) });
    await p.evaluate(() => document.querySelector('#eventModal .tipMb').click()); await p.waitForTimeout(200);
    ok(await p.evaluate(() => { const f = document.querySelector('#eventModal .tipF'); return f.offsetHeight > 0 && /What it is/.test(f.textContent); }), 'More shows what it is and what to do');
    if (n === 'phone') await p.screenshot({ path: path.join(out, `tip_phone_more_${n}.png`) });
    await p.evaluate(() => [...document.querySelectorAll('#eventModal button.act')].find((x) => /No more tips/.test(x.textContent)).click()); await p.waitForTimeout(300);
    ok(await p.evaluate(() => ZH.S.introOff === true && !document.querySelector('#eventModal .evBox')), 'No more tips turns tips off and closes the card');
    if (n === 'phone') { await p.evaluate(() => { ZH.S.introOff = false; ZH.OPTS.look = 'glass'; document.documentElement.classList.remove('phone'); delete ZH.S.intro['z:runner']; ZH.intro('z:runner'); }); await p.waitForTimeout(800);
      ok(await p.evaluate(() => { const e = document.querySelector('#eventModal .evBox'); return e && !e.querySelector('.tipP') && /What it is/.test(e.textContent); }), 'look off: the old card'); }
    ok(!(p.errs || []).length, 'no page errors ' + JSON.stringify(p.errs || [])); await p.close(); }
  await b.close(); console.log(bad ? `FAILED (${bad})` : 'PASS'); process.exit(bad ? 1 : 0); })();
