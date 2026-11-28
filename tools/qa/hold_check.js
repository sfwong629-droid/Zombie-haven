// tools/qa/hold_check.js — UI chat, 3D.398 (W249, idea 8; owner: "Let's do A"). Three phone sizes, phone look:
//  - holding People 0.6 s opens the phone's menu above the icon (dimmed town, the icon lifted, rows of 44 px+ with a word and a sign), inside the
//    screen, and does not open People; with two badly hurt: "Find the hurt · 2 hurt" first, in red; "Everyone" opens People;
//  - a short tap still opens People; holding Build lists the last buildings and Repair damaged; holding Town: Upgrade opens the Upgrade screen;
//  - a tap outside closes it; the old look has none. Pictures: runs/ui_samples/hold_built_<size>.png, hold_built_build.png.
const Q = require('./lib'); const path = require('path'); const out = path.join(__dirname, '../../runs/ui_samples');
let bad = 0; const ok = (c, m) => { if (!c) { bad++; console.log('  FAIL ' + m); require('fs').appendFileSync('/tmp/hold_fail.txt', m + '\n'); } };
const clear = async (p) => { for (let k = 0; k < 8; k++) { await p.evaluate(() => { try { ZH.S.introOff = true; } catch (e) {} const x = document.querySelector('#eventModal button:not(.tipMb)'); if (x) x.click(); }); await Q.clearCards(p); await p.waitForTimeout(150); } };
const hold = async (p, id, ms = 1500) => { const r = await p.evaluate((id) => { const e = document.querySelector('#' + id + ' .dkI').getBoundingClientRect(); return { x: e.left + e.width / 2, y: e.top + e.height / 2 }; }, id); await p.mouse.move(r.x, r.y); await p.mouse.down(); await p.waitForTimeout(ms); const had = await p.evaluate(() => !!document.getElementById('holdBox')); await p.mouse.up(); await p.waitForTimeout(250); const has = await p.evaluate(() => !!document.getElementById('holdBox')); if (!has) console.log('DBG hold ' + id + ' had=' + had); return r; };
const menu = (p) => p.evaluate(() => { const b = document.getElementById('holdBox'); if (!b) return null; const m = b.querySelector('.hM').getBoundingClientRect(), ic = b.querySelector('.hIc').getBoundingClientRect();
  return { rows: [...b.querySelectorAll('.hR')].map((x) => ({ t: x.querySelector('b').innerText, s: (x.querySelector('small') || {}).innerText || '', h: x.getBoundingClientRect().height, red: x.classList.contains('red'), sg: !!x.querySelector('svg path, svg circle, svg rect') })),
    in: m.left >= 0 && m.right <= innerWidth + .5 && m.top >= 0, above: m.bottom <= ic.top + 1, panel: document.getElementById('infoPanel').classList.contains('show') }; });
(async () => { const b = await Q.launch();
  for (const [n, w, h] of [['phone', 390, 844], ['phoneN', 320, 568], ['phoneXL', 430, 932]]) {
    const p = await Q.page(b, { w, h, look: '', expose: 'BUILD_TAG, ui, world, closeP, OPTS, saveOpts, applyLook' });
    await Q.newGame(p); await clear(p); await p.evaluate(() => { const s = ZH.S.sv; s[0].hp = Math.floor(s[0].max * .3); s[1].hp = Math.floor(s[1].max * .3); ZH.ui(); });
    if (n === 'phone') ok(+String(await p.evaluate(() => ZH.BUILD_TAG)).split('.')[1] >= 398, 'build before 3D.398');
    await hold(p, 'mSurv'); let m = await menu(p); await p.screenshot({ path: path.join(out, `hold_built_${n}.png`) });
    ok(m && !m.panel && m.in && m.above && m.rows.length >= 2 && m.rows.every((r) => r.h >= 44 && r.sg) && m.rows[0].t === 'Find the hurt' && m.rows[0].s === '2 hurt' && m.rows[0].red && m.rows[m.rows.length - 1].t === 'Everyone', `${n}: People's menu: ${JSON.stringify(m)}`);
    if (!m) { await p.close(); continue; }
    await p.click('#holdBox .hR:last-child'); await p.waitForTimeout(400);
    ok(await p.evaluate(() => !document.getElementById('holdBox') && document.getElementById('infoPanel').classList.contains('show') && /People/.test(document.getElementById('it').textContent)), `${n}: Everyone did not open People`);
    await p.evaluate(() => ZH.closeP()); await p.waitForTimeout(300);
    if (n === 'phone') {
      await p.click('#mSurv'); await p.waitForTimeout(400); ok(await p.evaluate(() => !document.getElementById('holdBox') && /People/.test(document.getElementById('it').textContent)), 'phone: a short tap did not open People'); await p.evaluate(() => ZH.closeP()); await p.waitForTimeout(1200);
      await p.evaluate(() => { const bb = ZH.world.buildings.find((q) => q.max); if (bb) bb.hp = Math.floor(bb.max * .3); });
      await hold(p, 'mBuild'); m = await menu(p); await p.screenshot({ path: path.join(out, 'hold_built_build.png') });
      ok(m && m.rows.some((r) => r.t === 'Repair damaged') && m.rows.length >= 2, `phone: Build's menu: ${JSON.stringify(m && m.rows.map((r) => r.t))}`);
      await p.mouse.click(w / 2, 200); await p.waitForTimeout(900); ok(await p.evaluate(() => !document.getElementById('holdBox')), 'phone: a tap outside did not close it');
      await hold(p, 'mTown'); m = await menu(p); ok(m && m.rows[0].t === 'Upgrade', `phone: Town's menu: ${JSON.stringify(m && m.rows.map((r) => r.t))}`);
      await p.click('#holdBox .hR:first-child'); await p.waitForTimeout(400); ok(await p.evaluate(() => /Upgrade|Level/.test(document.getElementById('it').textContent + document.getElementById('ib').innerText)), 'phone: Upgrade did not open');
      await p.evaluate(() => { ZH.closeP(); ZH.OPTS.look = 'glass'; ZH.saveOpts(); ZH.applyLook(); }); await p.waitForTimeout(300); await hold(p, 'mSurv').catch(() => {});
      ok(await p.evaluate(() => !document.getElementById('holdBox')), 'phone: the old look opened the shortcuts');
    }
    await p.close();
  }
  await b.close(); console.log(bad ? `hold_check: ${bad} FAIL` : 'hold_check: all passed'); process.exit(bad ? 1 : 0);
})();
