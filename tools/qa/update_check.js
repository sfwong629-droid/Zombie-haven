// tools/qa/update_check.js — UI chat, 3D.391 (W249, fun idea 10: Update ready). At three phone sizes, phone look:
//  - when the Haven can reach the next level, a card like the phone's software update opens by itself: the Town app icon, "Update ready",
//    "Haven 2" large, how long it takes, What's new one line each, the joke last; Later and a lime Update now side by side, 44 px+, inside the screen;
//  - Update now starts the level-up (S.lvUp); Later leaves it ready (the Needs you row stays);
//  - when the level-up is done, "Update complete · Haven 2" with what came, one lime OK, in place of the party card;
//  - the old look keeps the banner and the party card.
// Pictures: runs/ui_samples/update_ready_<size>.png, update_done.png.
const Q = require('./lib'); const path = require('path'); const out = path.join(__dirname, '../../runs/ui_samples');
let bad = 0; const ok = (c, m) => { if (!c) { bad++; console.log('  FAIL ' + m); } };
const clear = async (p) => { for (let k = 0; k < 8; k++) { await p.evaluate(() => { try { ZH.S.introOff = true; } catch (e) {} const x = document.querySelector('#eventModal button:not(.tipMb)'); if (x) x.click(); }); await Q.clearCards(p); await p.waitForTimeout(150); } };
const card = (p) => p.evaluate(() => { const b = document.querySelector('#eventModal .rpBox'); if (!b || !b.querySelector('.upHd')) return null; const r = b.getBoundingClientRect();
  return { in: r.left >= 0 && r.top >= 0 && r.right <= innerWidth + .5 && r.bottom <= innerHeight + .5, hd: b.querySelector('.upT').innerText, icon: !!b.querySelector('.upIc .apT svg'), what: [...b.querySelectorAll('.upR')].map((x) => x.innerText.trim()), joke: (b.querySelector('.rpQ') || {}).innerText || '',
    btn: [...b.querySelectorAll('.rpBtns button')].map((x) => { const q = x.getBoundingClientRect(); return { t: x.innerText, h: q.height, go: x.classList.contains('go'), in: q.left >= r.left && q.right <= r.right + .5 }; }) }; });
(async () => { const b = await Q.launch();
  for (const [n, w, h] of [['phone', 390, 844], ['phoneN', 320, 568], ['phoneXL', 430, 932]]) {
    const p = await Q.page(b, { w, h, look: '', expose: 'BUILD_TAG, LV_REQ, checkRank, levelUpDone, OPTS, saveOpts, applyLook' });
    await Q.newGame(p); await clear(p); await p.waitForTimeout(300);
    if (n === 'phone') ok(+String(await p.evaluate(() => ZH.BUILD_TAG)).split('.')[1] >= 391, 'build before 3D.391');
    await p.evaluate(() => { ZH.LV_REQ[1] = { people: 0, bld: 0 }; ZH.S.rankReady = false; ZH.S.lvUp = null; ZH.checkRank(); }); await p.waitForTimeout(500);
    const c = await card(p); await p.screenshot({ path: path.join(out, `update_ready_${n}.png`) });
    ok(!!c, `${n}: no update card when the level is ready`); if (!c) { await p.close(); continue; }
    ok(c.in && c.icon && /Update ready/i.test(c.hd) && /Haven 2/.test(c.hd) && /takes \d/.test(c.hd), `${n}: the head: ${c.hd.replace(/\n/g, ' | ')}`);
    ok(c.what.length >= 2 && c.what.every((x) => x.split(/\s+/).length <= 12), `${n}: What's new, one short line each: ${JSON.stringify(c.what)}`);
    ok(c.joke.length > 5, `${n}: no joke last`);
    ok(c.btn.length === 2 && c.btn[0].t === 'Later' && !c.btn[0].go && c.btn[1].t === 'Update now' && c.btn[1].go && c.btn.every((x) => x.h >= 44 && x.in), `${n}: buttons: ${JSON.stringify(c.btn)}`);
    if (n === 'phone') {
      await p.click('.rpBtns button:nth-child(1)'); await p.waitForTimeout(300);
      ok(await p.evaluate(() => !ZH.S.lvUp && ZH.S.rankReady && !document.querySelector('#eventModal .upHd')), 'phone: Later did not leave it ready');
      await p.evaluate(() => { ZH.S.rankReady = false; ZH.checkRank(); }); await p.waitForTimeout(400); await p.click('.rpBtns button.go'); await p.waitForTimeout(300);
      ok(await p.evaluate(() => ZH.S.lvUp && ZH.S.lvUp.to === 2), 'phone: Update now did not start the level-up');
      await clear(p); await p.evaluate(() => ZH.levelUpDone()); await p.waitForTimeout(500);
      const d = await card(p); await p.screenshot({ path: path.join(out, 'update_done.png') });
      ok(d && /Update complete/i.test(d.hd) && /Haven 2/.test(d.hd) && /Installed/.test(d.hd) && d.btn.length === 1 && d.btn[0].t === 'OK' && d.btn[0].go && !(await p.evaluate(() => !!document.querySelector('.stageCard'))), `phone: the done card: ${d && JSON.stringify(d)}`);
      ok(await p.evaluate(() => (ZH.S.lvl || 1) === 2), 'phone: the level did not go up');
      await clear(p);
      await p.evaluate(() => { ZH.OPTS.look = 'glass'; ZH.saveOpts && ZH.saveOpts(); ZH.applyLook && ZH.applyLook(); ZH.LV_REQ[2] = { people: 0, bld: 0 }; ZH.S.rankReady = false; ZH.checkRank(); }); await p.waitForTimeout(400);
      ok(await p.evaluate(() => !document.querySelector('#eventModal .upHd')), 'phone: the old look shows the update card');
      await p.evaluate(() => { ZH.upgradeTown && 0; ZH.S.lvUp = { to: 3, left: 0, total: 1, rt: true }; ZH.levelUpDone(); }); await p.waitForTimeout(400);
      ok(await p.evaluate(() => !!document.querySelector('.stageCard')), 'phone: the old look lost its party card');
    }
    await p.close();
  }
  await b.close(); console.log(bad ? `update_check: ${bad} FAIL` : 'update_check: all passed'); process.exit(bad ? 1 : 0);
})();
