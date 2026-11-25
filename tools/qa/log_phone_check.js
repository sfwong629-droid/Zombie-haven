// tools/qa/log_phone_check.js [tag] — UI chat, 3D.368 (W249, W270). In the phone look the Event log is like the phone's notification history:
// All / Important as a segmented control (Important keeps only critical and important rows), the rows grouped under Today, Yesterday, Day N, newest
// first; each row one line (time, a coloured dot, the words), 44 px+, on the screen; a tap on a row opens its full words and a second tap closes them;
// Backup this town at the bottom opens the backup; the three switches the old log held are gone from it, and Night lights is now in Settings.
// With the look off, the old log.
const Q = require('./lib'); const path = require('path'); const out = path.join(__dirname, '../../runs/ui_samples'); const TAG = process.argv[2] || ''; let bad = 0; const ok = (c, m) => { if (!c) { bad++; console.log('  FAIL ' + m); } };
(async () => { const b = await Q.launch();
  for (const [n, w, h] of [['phone', 390, 844], ['phoneN', 320, 568], ['phoneL', 430, 932]]) { console.log(n);
    const p = await Q.page(b, { w, h, look: '', expose: 'showLog,showSettings' }); await Q.newGame(p);
    for (let i = 0; i < 6; i++) { await p.evaluate(() => { const x = [...document.querySelectorAll('#eventModal button')].find((b) => /no more tips/i.test(b.textContent)); if (x) x.click(); }); await Q.clearCards(p); await p.waitForTimeout(500); }
    if (TAG) ok(await p.evaluate(() => ZH.BUILD_TAG) === TAG, 'build tag is ' + TAG);
    await p.evaluate(() => { const S = ZH.S; S.day = 4; S.log = [
      { d: 2, h: 7, t: 'Marcus found 3 wood at the old barn.', l: 'routine' }, { d: 2, h: 22, t: 'Horde of 40 broke through the east wall and two people went down before the fighters held the gap', l: 'critical' },
      { d: 3, h: 9, t: 'Rosa built a Garden Plot.', l: 'routine' }, { d: 3, h: 18, t: 'A newcomer is at the gate.', l: 'important' },
      { d: 4, h: 6, t: 'Dawn. The streets are quiet.', l: 'routine' }, { d: 4, h: 8, t: 'Water gone in 5 h.', l: 'important' }]; ZH.showLog(); }); await p.waitForTimeout(400);
    const m = await p.evaluate(() => { const ib = document.getElementById('ib'), r = (e) => e.getBoundingClientRect(); return { log: !!ib.querySelector('.phLog'), title: document.getElementById('it').textContent,
      seg: [...ib.querySelectorAll('.phSeg button')].map((e) => e.textContent), secs: [...ib.querySelectorAll('.phSec')].map((e) => e.textContent), first: (ib.querySelector('.phR.lg .k') || {}).textContent,
      rows: [...ib.querySelectorAll('.phR.lg')].map((e) => { const q = r(e), k = e.querySelector('.k'); return { h: q.height, l: q.left, r: q.right, one: k.scrollHeight <= k.clientHeight + 2 }; }),
      crit: ib.querySelectorAll('.phR.lg.crit').length, imp: ib.querySelectorAll('.phR.lg.imp').length, old: ['logSlow', 'logLights', 'logAdv', 'logFilt'].filter((id) => document.getElementById(id)).length, bak: !!document.getElementById('logBak'), W: innerWidth }; });
    console.log('   sections', JSON.stringify(m.secs), 'rows', m.rows.length);
    ok(m.log && m.title === 'Event log', 'the phone log with its title'); ok(m.seg.join() === 'All,Important', 'All / Important');
    ok(m.secs.join() === 'Today,Yesterday,Day 2,Town', 'grouped Today, Yesterday, Day 2, then Town'); ok(m.first === 'Water gone in 5 h.', 'newest first');
    ok(m.rows.length === 6 && m.crit === 1 && m.imp === 2, 'a row per entry, with the critical and important ones marked');
    ok(m.rows.every((x) => x.h >= 44 && x.l >= 0 && x.r <= m.W + .5 && x.one), 'every row one line, 44 px+, on the screen'); ok(m.old === 0 && m.bak, 'no switches in the log; Backup is there');
    await p.screenshot({ path: path.join(out, `log_phone_${n}.png`) });
    await p.evaluate(() => [...document.querySelectorAll('#ib .phR.lg')].find((e) => /Horde of 40/.test(e.textContent)).click()); await p.waitForTimeout(200);
    const o = await p.evaluate(() => { const e = document.querySelector('#ib .phR.lg.open .k'); return e ? { h: e.getBoundingClientRect().height, full: /held the gap/.test(e.textContent) } : null; });
    ok(o && o.h > 24 && o.full, 'a tap opens the full words'); if (n === 'phone') await p.screenshot({ path: path.join(out, `log_phone_open_${n}.png`) });
    await p.evaluate(() => document.querySelector('#ib .phR.lg.open').click()); await p.waitForTimeout(150); ok(await p.evaluate(() => !document.querySelector('#ib .phR.lg.open')), 'a second tap closes them');
    await p.evaluate(() => document.querySelector('#ib [data-lf="1"]').click()); await p.waitForTimeout(300);
    const f = await p.evaluate(() => ({ n: document.querySelectorAll('#ib .phR.lg').length, routine: document.querySelectorAll('#ib .phR.lg:not(.crit):not(.imp)').length, on: (document.querySelector('#ib .phSeg .on') || {}).textContent }));
    ok(f.n === 3 && f.routine === 0 && f.on === 'Important', 'Important keeps only the important rows');
    await p.evaluate(() => document.querySelector('#ib [data-lf="0"]').click()); await p.waitForTimeout(300); ok(await p.evaluate(() => document.querySelectorAll('#ib .phR.lg').length === 6), 'All shows everything again');
    await p.evaluate(() => document.getElementById('logBak').click()); await p.waitForTimeout(400); ok(await p.evaluate(() => /backup/i.test(document.getElementById('it').textContent + document.getElementById('ib').textContent)), 'Backup opens the backup');
    await p.evaluate(() => { ZH.S.log = []; ZH.showLog(); }); await p.waitForTimeout(300); ok(await p.evaluate(() => /Nothing yet/.test(document.getElementById('ib').textContent)), 'an empty log says Nothing yet');
    await p.evaluate(() => ZH.showSettings()); await p.waitForTimeout(400);
    const before = await p.evaluate(() => ZH.OPTS.nightLights); ok(await p.evaluate(() => !!document.getElementById('stLights')), 'Night lights is in Settings');
    await p.evaluate(() => document.getElementById('stLights').click()); await p.waitForTimeout(300); ok(await p.evaluate((b) => ZH.OPTS.nightLights === !b && document.getElementById('stLights').classList.contains('on') === !b, before), 'the Night lights switch switches');
    await p.evaluate(() => document.getElementById('stLights').click()); await p.waitForTimeout(300);
    if (n === 'phone') { await p.evaluate(() => { ZH.OPTS.look = 'glass'; document.documentElement.classList.remove('phone'); ZH.showLog(); }); await p.waitForTimeout(400); ok(await p.evaluate(() => !document.querySelector('#ib .phLog') && !!document.getElementById('logLights')), 'look off: the old log'); }
    ok(!(p.errs || []).length, 'no page errors ' + JSON.stringify(p.errs || [])); await p.close(); }
  await b.close(); console.log(bad ? `FAILED (${bad})` : 'PASS'); process.exit(bad ? 1 : 0); })();
