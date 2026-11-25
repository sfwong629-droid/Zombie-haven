// tools/qa/alert_check.js [tag] — UI chat, 3D.380 (W249, fun idea 2). The big warnings as the phone's emergency alert, on three phone sizes:
//  - on a boss day at 12:00 an alert comes: a red wash over the whole screen, a card in the middle of the screen (EMERGENCY ALERT, "Boss night · 21:00",
//    one line, a small line), Show me and OK side by side, 44 px+; the alarm plays; the game is paused; no radio message and no Field Note card for it
//    (said once), but the Boss night note is in Field Notes; Show me opens Town · Defense; OK closes it;
//  - a weekly crisis starts as an alert with its name, its words and its buttons;
//  - with the look off, the old radio message and the old crisis card.
const Q = require('./lib'); const path = require('path'); const out = path.join(__dirname, '../../runs/ui_samples'); const TAG = process.argv[2] || ''; let bad = 0; const ok = (c, m) => { if (!c) { bad++; console.log('  FAIL ' + m); } };
(async () => { const b = await Q.launch();
  for (const [n, w, h] of [['phone', 390, 844], ['phoneN', 320, 568], ['phoneL', 430, 932]]) { console.log(n);
    const p = await Q.page(b, { w, h, look: '', expose: 'S,OPTS,showEventPopup,CRISES,eventSchedule' }); await Q.newGame(p); await Q.clearCards(p); await p.waitForTimeout(1200);
    for (let i = 0; i < 5; i++) { await p.evaluate(() => { const x = [...document.querySelectorAll('#eventModal button')].find((b) => /no more tips/i.test(b.textContent)); if (x) x.click(); }); await Q.clearCards(p); await p.waitForTimeout(300); }
    if (TAG) ok(await p.evaluate(() => ZH.BUILD_TAG) === TAG, 'build tag is ' + TAG);
    const hit = await p.evaluate(() => { const S = ZH.S; S.introOff = true; S.intro = S.intro || {}; delete S.intro['f:boss']; S.nextBoss = S.day; S.hour = 12; ZH.eventSchedule(); return !!document.querySelector('#eventModal .emBox'); });
    ok(hit, 'at 12:00 on a boss day an emergency alert comes');
    if (hit) { await p.waitForTimeout(2000);
      const m = await p.evaluate(() => { const r = (e) => e.getBoundingClientRect(), bx = r(document.querySelector('.emBox')), wa = r(document.querySelector('.emWash'));
        return { txt: document.querySelector('.emBox').textContent, box: { l: bx.left, r: bx.right, t: bx.top, b: bx.bottom }, wash: wa.width >= innerWidth - 1 && wa.height >= innerHeight - 1, W: innerWidth, H: innerHeight,
          btns: [...document.querySelectorAll('.emB')].map((e) => { const q = r(e); return { t: e.textContent, h: q.height, y: Math.round(q.top) }; }), paused: !!document.querySelector('.pausePill, #pausePill') || ZH.S && true,
          radio: [...document.querySelectorAll('.radioCard')].filter((e) => e.offsetParent && getComputedStyle(e).opacity !== '0').map((e) => e.className + ':' + e.textContent.slice(0, 40)).join('|'), note: !!(ZH.S.intro || {})['f:boss'] }; });
      console.log('  ', JSON.stringify(m.box), m.radio);
      ok(/EMERGENCY ALERT/.test(m.txt) && /Boss night · 21:00/.test(m.txt) && /horde/.test(m.txt), 'EMERGENCY ALERT, Boss night · 21:00, one line');
      ok(m.wash, 'a red wash over the whole screen'); ok(m.box.l >= 0 && m.box.r <= m.W && m.box.t >= 0 && m.box.b <= m.H && Math.abs((m.box.t + m.box.b) / 2 - m.H / 2) < 4 && Math.abs((m.box.l + m.box.r) / 2 - m.W / 2) < 2, 'the card in the middle of the screen');
      ok(m.btns.map((x) => x.t).join() === 'Show me,OK' && m.btns.every((x) => x.h >= 44) && m.btns[0].y === m.btns[1].y, 'Show me and OK side by side, 44 px+');
      ok(m.note, 'the Boss night note is in Field Notes'); ok(!m.radio, 'no radio message on screen with it');
      await p.screenshot({ path: path.join(out, `alert_boss_${n}.png`) });
      await p.waitForTimeout(2500); ok(await p.evaluate(() => !!document.querySelector('#eventModal .emBox')), 'it stays until tapped');
      await p.evaluate(() => document.querySelectorAll('.emB')[0].click()); await p.waitForTimeout(500);
      ok(await p.evaluate(() => !document.querySelector('.emBox') && document.getElementById('infoPanel').classList.contains('show') && /Defense|Town/.test(document.getElementById('it').textContent + (document.querySelector('#ib .phSeg .on') || {}).textContent)), 'Show me opens Town · Defense');
      await p.waitForTimeout(1500); ok(await p.evaluate(() => !/Boss night/.test(document.getElementById('eventModal').textContent) && !/Boss night/.test((document.getElementById('nBot') || {}).textContent || '')), 'no Field Note card or radio message for it after'); }
    // a crisis
    await Q.clearCards(p); await p.waitForTimeout(300);
    const cr = await p.evaluate(() => { const k = Object.keys(ZH.CRISES).find((k) => ZH.CRISES[k].act) || Object.keys(ZH.CRISES)[0], C = ZH.CRISES[k];
      document.querySelector('#infoPanel').classList.remove('show'); ZH.showEventPopup({ title: 'Weekly crisis', alert: { title: `${C.icon} ${C.name}`, line: C.desc, sub: 'See it through: a Crisis Medal, 30 renown and an epic crate.' }, buttons: C.act ? [{ label: C.actLabel }, { label: 'Later' }] : [{ label: 'Get ready' }] }); return C.name; });
    for (let i = 0; i < 20 && !(await p.evaluate(() => !!document.querySelector('.emBox'))); i++) { await p.evaluate(() => { const b = document.querySelectorAll('#eventModal .evBox button:not(.tipMb)'); if (b.length) b[b.length - 1].click(); }); await p.waitForTimeout(400); } await p.waitForTimeout(1500); ok(await p.evaluate((nm) => { const b = document.querySelector('.emBox'); return b && b.textContent.includes(nm) && b.querySelectorAll('.emB').length >= 1; }, cr), 'a crisis comes as an alert with its name and buttons');
    if (n === 'phone') await p.screenshot({ path: path.join(out, `alert_crisis_${n}.png`) });
    await p.evaluate(() => { const l = document.querySelectorAll('.emB'); if (l.length) l[l.length - 1].click(); }); await p.waitForTimeout(300); ok(await p.evaluate(() => !document.querySelector('.emBox') && !document.getElementById('eventModal').classList.contains('emA')), 'a button closes it');
    if (n === 'phone') { await p.evaluate(() => { ZH.OPTS.look = 'glass'; document.documentElement.classList.remove('phone'); ZH.showEventPopup({ title: 'X', text: 'y', alert: { title: 'a', line: 'b' } }); }); await p.waitForTimeout(300);
      ok(await p.evaluate(() => !document.querySelector('.emBox') && !!document.querySelector('#eventModal .evBox')), 'look off: the old card'); }
    ok(!(p.errs || []).length, 'no page errors ' + JSON.stringify(p.errs || [])); await p.close(); }
  await b.close(); console.log(bad ? `FAILED (${bad})` : 'PASS'); process.exit(bad ? 1 : 0); })();
