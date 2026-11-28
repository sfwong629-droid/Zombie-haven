// tools/qa/cc_check.js — UI chat, 3D.396 (W249, idea 4, Control Center; owner: "A is ok but I like the icon in D better and D show what each
// of the items are"). Three phone sizes, phone look:
//  - a tap on the right of the status strip opens it (a pull down too); a dark blur; round switches each with its word under it: Pause, Speed,
//    Music, Sound, Night lights, Tips, Pictures, Save; the day music with back and next; all 44 px+ and inside the screen;
//  - Pause holds the game after it closes until switched off; Speed cycles the game speed; Music and Sound switch; next changes the day tune;
//    Night lights and Tips switch their settings; Save saves and says Saved;
//  - a tap outside closes it; the old look has none. Pictures: runs/ui_samples/cc_built_<size>.png.
const Q = require('./lib'); const path = require('path'); const out = path.join(__dirname, '../../runs/ui_samples');
let bad = 0; const ok = (c, m) => { if (!c) { bad++; console.log('  FAIL ' + m); require('fs').appendFileSync('/tmp/cc_fail.txt', m + '\n'); } };
const clear = async (p) => { for (let k = 0; k < 8; k++) { await p.evaluate(() => { try { ZH.S.introOff = true; } catch (e) {} const x = document.querySelector('#eventModal button:not(.tipMb)'); if (x) x.click(); }); await Q.clearCards(p); await p.waitForTimeout(150); } };
const rd = (p) => p.evaluate(() => { const b = document.getElementById('ccBox'); if (!b) return null; const B = [...b.querySelectorAll('.ccB')];
  return { labels: B.map((x) => x.querySelector('.l').innerText), on: B.filter((x) => x.classList.contains('on')).map((x) => x.id), sz: B.every((x) => { const r = x.getBoundingClientRect(), c = x.querySelector('.c').getBoundingClientRect(); return r.height >= 44 && c.width >= 44 && r.left >= 0 && r.right <= innerWidth + .5 && r.bottom <= innerHeight; }),
    tune: (b.querySelector('.npT b') || {}).innerText, nav: !!document.getElementById('ccPrev') && !!document.getElementById('ccNext'), blur: /blur/.test(getComputedStyle(b.querySelector('.ccDim')).backdropFilter || getComputedStyle(b.querySelector('.ccDim')).webkitBackdropFilter || '') }; });
(async () => { const b = await Q.launch();
  for (const [n, w, h] of [['phone', 390, 844], ['phoneN', 320, 568], ['phoneXL', 430, 932]]) {
    const p = await Q.page(b, { w, h, look: '', expose: 'BUILD_TAG, ccPaused, menuPaused, OPTS, saveOpts, applyLook, ui' });
    await Q.newGame(p); await clear(p); await p.waitForTimeout(300); await p.evaluate(() => ZH.ui());
    if (n === 'phone') ok(+String(await p.evaluate(() => ZH.BUILD_TAG)).split('.')[1] >= 396, 'build before 3D.396');
    const st = await p.evaluate(() => { const r = document.getElementById('stStrip').getBoundingClientRect(); return { x: r.right - 30, y: r.top + r.height / 2 }; });
    await p.mouse.click(st.x, st.y); await p.waitForTimeout(400);
    let r = await rd(p); await p.screenshot({ path: path.join(out, `cc_built_${n}.png`) });
    ok(r && r.labels.join() === 'Pause,Speed 1×,Music,Sound,Night lights,Tips,Pictures,Save' && r.sz && r.nav && r.blur, `${n}: Control Center: ${JSON.stringify(r)}`);
    if (!r) { await p.close(); continue; }
    ok(await p.evaluate(() => ZH.menuPaused()), `${n}: the game runs while it is open`);
    if (n === 'phone') {
      await p.click('#ccPause'); r = await rd(p); ok(r.labels[0] === 'Paused' && r.on.includes('ccPause'), `phone: Pause: ${JSON.stringify(r.on)}`);
      await p.click('#ccSpeed'); r = await rd(p); ok(r.labels[1] === 'Speed 2×', `phone: Speed: ${r.labels[1]}`);
      const m0 = await p.evaluate(() => window.SND && SND.mode); await p.click('#ccMusic'); const m1 = await p.evaluate(() => window.SND && SND.mode); ok(m0 !== m1, `phone: Music did not switch (${m0} → ${m1})`);
      const t0 = r.tune; await p.click('#ccNext'); r = await rd(p); ok(r.tune !== t0, `phone: next tune: ${t0} → ${r.tune}`);
      const L0 = await p.evaluate(() => !!ZH.OPTS.nightLights); await p.click('#ccLights'); ok(await p.evaluate((L0) => !!ZH.OPTS.nightLights !== L0, L0), 'phone: Night lights did not switch');
      await p.click('#ccSave'); ok(await p.evaluate(() => document.querySelector('#ccSave .l').innerText === 'Saved'), 'phone: Save did not say Saved');
      await p.mouse.click(w / 2, h - 60);
      ok(await p.waitForFunction(() => !document.getElementById('ccBox'), null, { timeout: 4000 }).then(() => true).catch(() => false), 'phone: a tap outside did not close it');
      ok(await p.evaluate(() => ZH.ccPaused() && ZH.menuPaused()), 'phone: Pause did not hold the game after closing');
      await p.mouse.click(st.x, st.y); await p.waitForTimeout(300); await p.click('#ccPause'); await p.mouse.click(w / 2, h - 60); await p.waitForTimeout(900);
      ok(await p.evaluate(() => !ZH.ccPaused()), 'phone: Pause did not switch off');
      await p.evaluate(() => { ZH.OPTS.look = 'glass'; ZH.saveOpts && ZH.saveOpts(); ZH.applyLook && ZH.applyLook(); }); await p.mouse.click(st.x, 6); await p.waitForTimeout(300);
      ok(await p.evaluate(() => { const b = document.getElementById('ccBox'); return !b || !b.offsetParent; }), 'phone: the old look opened Control Center');
    } else { await p.mouse.click(w / 2, h - 40); ok(await p.waitForFunction(() => !document.getElementById('ccBox'), null, { timeout: 4000 }).then(() => true).catch(() => false), `${n}: a tap outside did not close it`); }
    await p.close();
  }
  await b.close(); console.log(bad ? `cc_check: ${bad} FAIL` : 'cc_check: all passed'); process.exit(bad ? 1 : 0);
})();
