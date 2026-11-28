// tools/qa/pill_check.js — UI chat, 3D.395 (W249, idea 3, the live pill; owner: "Do it like you suggested"). Three phone sizes, phone look:
//  - nothing running: no island; the level-up running: a black island in the status strip with the Town sign and the time (1:05), inside the
//    strip, clear of the day and the signal, 44 px to tap; tonight's horde as well: the horde first, the level-up as a small circle beside it;
//  - a tap grows it into a card under the strip: the sign, "Boss night", the time, a bar, Close and a lime Show me (Town · Defense);
//  - the squad out: "Squad out", where, faces, a bar from there to the Haven; in its last hour the card grows by itself;
//  - the old look shows none. Pictures: runs/ui_samples/pill_built_<size>.png, pill_card.png, pill_squad.png.
const Q = require('./lib'); const path = require('path'); const out = path.join(__dirname, '../../runs/ui_samples');
let bad = 0; const ok = (c, m) => { if (!c) { bad++; console.log('  FAIL ' + m); require('fs').appendFileSync('/tmp/pill_fail.txt', m + '\n'); } };
const clear = async (p) => { for (let k = 0; k < 8; k++) { await p.evaluate(() => { try { ZH.S.introOff = true; } catch (e) {} const x = document.querySelector('#eventModal button:not(.tipMb)'); if (x) x.click(); }); await Q.clearCards(p); await p.waitForTimeout(150); } };
const isl = (p) => p.evaluate(() => { const e = document.getElementById('lpIsl'); if (!e || !e.classList.contains('on')) return null; const m = e.querySelector('.lpM').getBoundingClientRect(), st = document.getElementById('stStrip').getBoundingClientRect(), day = document.querySelector('#stStrip .stDay, #stStrip span') ? document.querySelector('#stStrip').firstElementChild.getBoundingClientRect() : null, hit = e.getBoundingClientRect();
  return { t: e.innerText.trim(), two: e.classList.contains('two'), inStrip: m.top >= st.top - .5 && m.bottom <= st.bottom + .5, clearDay: !day || m.left >= day.right, right: e.getBoundingClientRect().right, w: innerWidth, signs: e.querySelectorAll('.lpI').length }; });
const card = (p) => p.evaluate(() => { const c = document.getElementById('lpCard'); if (!c) return null; const r = c.getBoundingClientRect(); return { t: c.querySelector('.t b').innerText, sub: c.querySelector('.t small').innerText, tm: c.querySelector('.tm').innerText, faces: c.querySelectorAll('.fc .phFace').length, bar: !!c.querySelector('.bar i'), in: r.left >= 0 && r.right <= innerWidth + .5, btn: [...c.querySelectorAll('.lpBt button')].map((b) => [b.innerText, b.getBoundingClientRect().height, b.classList.contains('go')]) }; });
(async () => { const b = await Q.launch();
  for (const [n, w, h] of [['phone', 390, 844], ['phoneN', 320, 568], ['phoneXL', 430, 932]]) {
    const p = await Q.page(b, { w, h, look: '', expose: 'BUILD_TAG, ui, liveUpdate, expNow, EXP_HMS, EXP_DEFS, OPTS, saveOpts, applyLook, closeP' });
    await Q.newGame(p); await clear(p);
    if (n === 'phone') ok(+String(await p.evaluate(() => ZH.BUILD_TAG)).split('.')[1] >= 395, 'build before 3D.395');
    await p.evaluate(() => { ZH.S.lvUp = null; ZH.S.trip = null; ZH.S.nextBoss = ZH.S.day + 5; ZH.liveUpdate(); });
    ok(!(await isl(p)), `${n}: an island with nothing running`);
    await p.evaluate(() => { ZH.S.lvUp = { to: 2, left: 65 * 60000 + 30000, total: 2 * 3600000, rt: true }; ZH.liveUpdate(); }); await p.waitForTimeout(200);
    let I = await isl(p); ok(I && /^1:0[56]$/.test(I.t) && I.inStrip && I.clearDay && I.right <= I.w && I.signs === 1, `${n}: the level-up island: ${JSON.stringify(I)}`);
    await p.evaluate(() => { ZH.S.nextBoss = ZH.S.day; ZH.S.hour = 15; ZH.liveUpdate(); }); await p.waitForTimeout(200);
    I = await isl(p); ok(I && I.two && /^6:00$|^6h$|^6:0\d$/.test(I.t) && I.signs === 2, `${n}: the horde first, the level-up beside: ${JSON.stringify(I)}`);
    await p.screenshot({ path: path.join(out, `pill_built_${n}.png`) });
    await p.click('#lpIsl'); await p.waitForTimeout(400); let C = await card(p);
    ok(C && C.t === 'Boss night' && /21:00/.test(C.sub) && C.bar && C.in && C.btn.length === 2 && C.btn.every((x) => x[1] >= 44) && C.btn[1][0] === 'Show me' && C.btn[1][2], `${n}: the card: ${JSON.stringify(C)}`);
    if (n === 'phone') { await p.screenshot({ path: path.join(out, 'pill_card.png') });
      await p.click('#lpCard .lpGo'); await p.waitForTimeout(500); ok(await p.evaluate(() => !document.getElementById('lpCard') && /Town/.test(document.getElementById('it').textContent)), 'phone: Show me did not open Town');
      await p.evaluate(() => ZH.closeP()); }
    else { await p.click('#lpCard .lpX'); await p.waitForTimeout(200); ok(await p.evaluate(() => !document.getElementById('lpCard')), `${n}: Close did not shrink it`); }
    /* the squad */
    await p.evaluate(() => { ZH.S.nextBoss = ZH.S.day + 5; ZH.S.lvUp = null; const k = Object.keys(ZH.EXP_DEFS)[0]; ZH.S.trip = { dest: k, risk: 'low', t0: ZH.expNow(), dur: 2 * ZH.EXP_HMS, stage: 0, phase: 'out', backAt: 0, members: ZH.S.sv.slice(0, 3).map((q) => ({ id: q.id, name: q.name })), loot: {}, log: [] }; ZH.liveUpdate(); });
    await p.waitForTimeout(150); I = await isl(p); ok(I && !I.two && /^2:3\d$/.test(I.t), `${n}: the squad's island: ${JSON.stringify(I)}`);
    await p.click('#lpIsl'); await p.waitForTimeout(300); C = await card(p);
    ok(C && C.t === 'Squad out' && /3 people/.test(C.sub) && C.faces === 3, `${n}: the squad's card: ${JSON.stringify(C)}`);
    if (n === 'phone') await p.screenshot({ path: path.join(out, 'pill_squad.png') });
    await p.click('#lpCard .lpX'); await p.waitForTimeout(200);
    await p.evaluate(() => { ZH.S.trip.t0 = ZH.expNow() - 1.8 * ZH.EXP_HMS; ZH.liveUpdate(); }); await p.waitForTimeout(200);
    C = await card(p); ok(C && C.t === 'Squad out', `${n}: the last hour did not grow it by itself`);
    await p.evaluate(() => { ZH.S.trip = null; ZH.liveUpdate(); });
    if (n === 'phone') { await p.evaluate(() => { ZH.OPTS.look = 'glass'; ZH.saveOpts && ZH.saveOpts(); ZH.applyLook && ZH.applyLook(); ZH.S.lvUp = { to: 2, left: 600000, total: 900000, rt: true }; ZH.ui(); }); await p.waitForTimeout(200);
      ok(await p.evaluate(() => { const e = document.getElementById('lpIsl'); return !e || !e.offsetParent; }), 'phone: the old look shows the island'); await p.evaluate(() => { ZH.S.lvUp = null; }); }
    await p.close();
  }
  await b.close(); console.log(bad ? `pill_check: ${bad} FAIL` : 'pill_check: all passed'); process.exit(bad ? 1 : 0);
})();
