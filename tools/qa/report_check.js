// tools/qa/report_check.js [tag] — UI chat, 3D.381 (W249, fun idea 9, "Yesterday at the Haven"). The morning card as a short report in the
// phone look, on three phone sizes: "Haven report · Day N", "Last night", the night's kills large with one bar per hour (20:00 to 06:00), a row
// only for what happened (Hurt, Lost, Joined, Damaged, Unhappy) with the names on a tap, or one "Everyone safe" row; the stock
// overnight as signs and numbers; who put down the most (picture, name, count); the joke last; one Good morning button; the card fits the
// screen (scrolls inside on a small phone); taps 44 px+. With the look off, the old morning card.
const Q = require('./lib'); const path = require('path'); const out = path.join(__dirname, '../../runs/ui_samples'); const TAG = process.argv[2] || ''; let bad = 0; const ok = (c, m) => { if (!c) { bad++; console.log('  FAIL ' + m); } };
(async () => { const b = await Q.launch();
  for (const [n, w, h] of [['phone', 390, 844], ['phoneN', 320, 568], ['phoneL', 430, 932]]) { console.log(n);
    const p = await Q.page(b, { w, h, look: '', expose: 'S,OPTS,nightStart,morningCard' }); await Q.newGame(p); await Q.clearCards(p); await p.waitForTimeout(1200);
    for (let i = 0; i < 5; i++) { await p.evaluate(() => { const x = [...document.querySelectorAll('#eventModal button')].find((b) => /no more tips/i.test(b.textContent)); if (x) x.click(); }); await Q.clearCards(p); await p.waitForTimeout(300); }
    if (TAG) ok(await p.evaluate(() => ZH.BUILD_TAG) === TAG, 'build tag is ' + TAG);
    const night = (opt) => p.evaluate((opt) => { const S = ZH.S; S.introOff = true; ZH.nightStart(); const L = S.nightLog, per = [0, 3, 8, 12, 5, 2, 0, 1, 0, 3];
      for (const v of per) { S.kills = (S.kills || 0) + v; L.h.push(S.kills); }
      if (opt.events) { L.by = { [S.sv[0].id]: 14, [S.sv[1].id]: 6 }; S.sv[2].hp = Math.round(S.sv[2].max * .3); S.food -= 4; S.wood += 2; S.mat -= 3; }
      else { L.by = {}; for (const q of S.sv) { q.hp = q.max; q.sat = 50; } for (const bb of ZH.S && window.ZHG.world.buildings) if (bb.max) bb.hp = bb.max; L.st = { food: S.food, water: S.water, wood: S.wood, mat: S.mat }; }
      ZH.morningCard(); return S.sv[0].name; }, opt);
    const nm = await night({ events: true }); await p.waitForTimeout(900);
    const m = await p.evaluate(() => { const bx = document.querySelector('#eventModal .rpBox'); if (!bx) return null; const r = bx.getBoundingClientRect(), btn = bx.querySelector('.rpBtns .act').getBoundingClientRect();
      return { txt: bx.textContent, bars: bx.querySelectorAll('.rpBars i').length, big: (bx.querySelector('.rpBig b') || {}).textContent, rows: [...bx.querySelectorAll('.rpR')].map((e) => e.textContent.trim()), dtHidden: [...bx.querySelectorAll('.rpR .dt')].every((e) => e.offsetHeight === 0),
        best: (bx.querySelector('.rpBest') || {}).textContent || '', face: !!bx.querySelector('.rpBest .phFace'), st: (bx.querySelector('.rpSt') || {}).textContent || '', q: (bx.querySelector('.rpQ') || {}).textContent || '', lastIsQ: bx.querySelector('.rpQ').nextElementSibling.classList.contains('rpBtns'),
        box: { l: r.left, r: r.right, t: r.top, b: r.bottom }, W: innerWidth, H: innerHeight, btn: btn.height, scrolls: bx.scrollHeight > bx.clientHeight + 1 }; });
    ok(!!m, 'the morning report opens'); if (!m) { await p.close(); continue; }
    console.log('   rows', m.rows.join(' | '), '| stock', m.st, '| best', m.best);
    ok(/Haven report · Day \d+/.test(m.txt) && /Last night/.test(m.txt) && m.big === '34', 'Haven report · Day N, Last night, 34 put down');
    ok(m.bars === 10, 'one bar per hour of the night (10)'); ok(m.rows.some((r) => /Hurt/.test(r)) && m.dtHidden, 'Hurt row, names hidden until a tap');
    ok(/−4\D+\+2\D+−3/.test(m.st), 'the stock overnight as signs and numbers'); ok(m.best.includes(nm) && /14/.test(m.best) && m.face, 'who put down the most, with picture and count');
    ok(m.q.length > 5 && m.lastIsQ, 'the joke last, before the button'); ok(m.box.l >= 0 && m.box.r <= m.W && m.box.t >= 0 && m.box.b <= m.H && m.btn >= 44, 'fits the screen, button 44 px+' + (m.scrolls ? ' (scrolls inside)' : ''));
    await p.screenshot({ path: path.join(out, `report_${n}.png`) });
    await p.evaluate(() => document.querySelector('#eventModal .rpR.rpT').click()); await p.waitForTimeout(200); ok(await p.evaluate(() => document.querySelector('#eventModal .rpR.rpT .dt').offsetHeight > 0), 'a tap on a row shows the names');
    await p.evaluate(() => document.querySelector('#eventModal .rpBtns .act').click()); await p.waitForTimeout(300); ok(await p.evaluate(() => !document.querySelector('#eventModal .rpBox')), 'Good morning closes it');
    await night({ events: false }); await p.waitForTimeout(700);
    const q = await p.evaluate(() => { const bx = document.querySelector('#eventModal .rpBox'); return bx ? { rows: [...bx.querySelectorAll('.rpR')].map((e) => e.textContent.trim()), st: !!bx.querySelector('.rpSt'), best: !!bx.querySelector('.rpBest') } : null; });
    ok(q && q.rows.length === 1 && /Everyone safe/.test(q.rows[0]) && !q.st && !q.best, 'a quiet night: one row, no stock or best rows ' + JSON.stringify(q));
    if (n === 'phone') await p.screenshot({ path: path.join(out, `report_quiet_${n}.png`) });
    await p.evaluate(() => { const x = document.querySelector('#eventModal .rpBtns .act'); if (x) x.click(); }); await p.waitForTimeout(300);
    if (n === 'phone') { await p.evaluate(() => { ZH.OPTS.look = 'glass'; document.documentElement.classList.remove('phone'); }); await night({ events: true }); await p.waitForTimeout(500);
      ok(await p.evaluate(() => !document.querySelector('#eventModal .rpBox') && /MORNING · DAY/.test(document.getElementById('eventModal').textContent)), 'look off: the old morning card'); }
    ok(!(p.errs || []).length, 'no page errors ' + JSON.stringify(p.errs || [])); await p.close(); }
  await b.close(); console.log(bad ? `FAILED (${bad})` : 'PASS'); process.exit(bad ? 1 : 0); })();
