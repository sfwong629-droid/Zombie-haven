// tools/qa/lock_check.js — UI chat, 3D.397 (W249, idea 5, the lock screen; owner: "Do b"). Three phone sizes, phone look:
//  - coming back after 3 real hours (awayCredit) opens the lock screen over everything: "Day N · season", the hour large, four round widgets
//    (Food, Water, People, Walls) with the town's numbers, what happened as notifications ("Back after 3 h", "18 h of shifts kept", the trays),
//    Moth FM in the corner, "Swipe up to play" 44 px+; all inside the screen;
//  - a swipe up collects every tray and opens the town; the Moth FM button opens Moth FM; the old look keeps its card.
// Pictures: runs/ui_samples/lock_built_<size>.png.
const Q = require('./lib'); const path = require('path'); const out = path.join(__dirname, '../../runs/ui_samples');
let bad = 0; const ok = (c, m) => { if (!c) { bad++; console.log('  FAIL ' + m); require('fs').appendFileSync('/tmp/lock_fail.txt', m + '\n'); } };
const clear = async (p) => { for (let k = 0; k < 8; k++) { await p.evaluate(() => { try { ZH.S.introOff = true; } catch (e) {} const x = document.querySelector('#eventModal button:not(.tipMb)'); if (x) x.click(); }); await Q.clearCards(p); await p.waitForTimeout(150); } };
const rd = (p) => p.evaluate(() => { const l = document.getElementById('lkBox'); if (!l) return null; const all = [...l.querySelectorAll('.lkD,.lkT,.lkWg,.lkN1,.lkC,.lkSw')];
  return { d: l.querySelector('.lkD').innerText, t: l.querySelector('.lkT').innerText, wg: [...l.querySelectorAll('.lkWg')].map((x) => x.innerText.replace(/\n/g, ' ')), ns: [...l.querySelectorAll('.lkN1 b')].map((x) => x.innerText), nb: [...l.querySelectorAll('.lkN1')].map((x) => x.innerText.replace(/\n/g, ' | ')),
    in: all.every((e) => { const r = e.getBoundingClientRect(); return r.left >= 0 && r.right <= innerWidth + .5 && r.top >= 0 && r.bottom <= innerHeight + .5; }), sw: document.getElementById('lkSw').getBoundingClientRect().height, z: +getComputedStyle(l).zIndex,
    overlap: (() => { const a = l.querySelector('.lkWgs').getBoundingClientRect(), b = l.querySelector('.lkNs').getBoundingClientRect(); return a.bottom > b.top; })() }; });
(async () => { const b = await Q.launch();
  for (const [n, w, h] of [['phone', 390, 844], ['phoneN', 320, 568], ['phoneXL', 430, 932]]) {
    const p = await Q.page(b, { w, h, look: '', expose: 'BUILD_TAG, DEFS, awayCredit, world, trayAdd, OPTS, saveOpts, applyLook' });
    await Q.newGame(p); await clear(p);
    if (n === 'phone') ok(+String(await p.evaluate(() => ZH.BUILD_TAG)).split('.')[1] >= 397, 'build before 3D.397');
    const f0 = await p.evaluate(() => { const bb = ZH.world.buildings.find((q) => ZH.DEFS[q.type] && !ZH.DEFS[q.type].out) || ZH.world.buildings[0]; bb.bonus = 0; ZH.trayAdd(bb, 'food', 6); ZH.awayCredit(3 * 36e5); return ZH.S.food; });
    await p.waitForTimeout(500); const r = await rd(p); await p.screenshot({ path: path.join(out, `lock_built_${n}.png`) });
    ok(r && /^Day \d+ · \w+/.test(r.d) && /^\d\d:00$/.test(r.t) && r.wg.length === 4 && /Food/.test(r.wg[0]) && /Water/.test(r.wg[1]) && /People/.test(r.wg[2]) && /Walls/.test(r.wg[3]), `${n}: the clock and widgets: ${JSON.stringify(r)}`);
    ok(r && r.ns[0] === 'Back after 3 h' && r.nb.some((x) => /shifts kept/.test(x)) && r.in && r.sw >= 44 && r.z >= 400 && (n === 'phoneN' || !r.overlap), `${n}: the notifications: ${JSON.stringify(r && { ns: r.ns, in: r.in, sw: r.sw, overlap: r.overlap })}`);
    const sw = await p.evaluate(() => { const r = document.getElementById('lkBox').getBoundingClientRect(); return { x: r.width / 2, y: r.height * .6 }; });
    await p.mouse.move(sw.x, sw.y); await p.mouse.down(); await p.mouse.move(sw.x, sw.y - 160, { steps: 6 }); await p.mouse.up();
    ok(await p.waitForFunction(() => !document.getElementById('lkBox'), null, { timeout: 4000 }).then(() => true).catch(() => false), `${n}: a swipe up did not open the town`);
    ok(await p.evaluate((f0) => ZH.S.food > f0, f0), `${n}: the trays were not collected`);
    if (n === 'phone') {
      await p.evaluate(() => ZH.awayCredit(2 * 36e5)); await p.waitForTimeout(400); await p.click('#lkFm');
      ok(await p.waitForFunction(() => !document.getElementById('lkBox') && /moth fm|dusk radio|now playing/i.test(document.getElementById('ib').innerText + ' ' + (document.getElementById('it') || {}).textContent), null, { timeout: 4000 }).then(() => true).catch(() => false), 'phone: Moth FM did not open');
      await p.evaluate(() => { ZH.OPTS.look = 'glass'; ZH.saveOpts(); ZH.applyLook(); ZH.awayCredit(3 * 36e5); }); await p.waitForTimeout(400);
      ok(await p.evaluate(() => !document.getElementById('lkBox')), 'phone: the old look opened the lock screen');
    }
    await p.close();
  }
  await b.close(); console.log(bad ? `lock_check: ${bad} FAIL` : 'lock_check: all passed'); process.exit(bad ? 1 : 0);
})();
