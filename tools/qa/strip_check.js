// tools/qa/strip_check.js — UI chat, 3D.383 (W249; owner, 26 Nov: the time as a phone's status strip, "I like B").
// Three phone sizes, then the owner's iPhone (Home Screen copy: a 59 px notch inset, faked as in insets_check.js):
//  - a black strip runs across the very top, 26 px tall under the notch inset (the inset above it black too);
//  - it says "Day 1 · 08:00" with the sun, the day first; the old clock capsule is hidden;
//  - the resource bar sits below the strip, Renown does not overlap the mission card, nothing of the HUD is under the strip;
//  - at night (22:00) it shows the moon and the daylight bar turns blue; with a radio message waiting the FM bars light up;
//  - a menu (People) opens below the strip; Settings → Phone look off: no strip, the clock is back.
// Pictures: runs/ui_samples/strip_built_<size>.png, strip_built_iphone.png, strip_built_night.png.
const Q = require('./lib'); const path = require('path'); const out = path.join(__dirname, '../../runs/ui_samples');
let bad = 0; const ok = (c, m) => { if (!c) { bad++; console.log('  FAIL ' + m); } };
const fake = (t) => t.replace(/env\(\s*safe-area-inset-top\s*(,[^)]*)?\)/g, '59px').replace(/env\(\s*safe-area-inset-bottom\s*(,[^)]*)?\)/g, '34px').replace(/env\(\s*safe-area-inset-(left|right)\s*(,[^)]*)?\)/g, '0px');
const clear = async (p) => { for (let k = 0; k < 8; k++) { await p.evaluate(() => { try { ZH.S.introOff = true; } catch (e) {} const x = document.querySelector('#eventModal button:not(.tipMb)'); if (x) x.click(); }); await Q.clearCards(p); await p.waitForTimeout(200); } };
const read = (p) => p.evaluate(() => { const r = (id) => { const e = document.getElementById(id); if (!e) return null; const b = e.getBoundingClientRect(); return { x: b.x, y: b.y, r: b.right, b: b.bottom, h: b.height, w: b.width, vis: getComputedStyle(e).display !== 'none' && b.height > 0 }; };
  const st = document.getElementById('stStrip'); return { st: r('stStrip'), bg: st ? getComputedStyle(st).backgroundColor : '', txt: st ? st.querySelector('.stTx').textContent : '', sun: !!(st && st.querySelector('.stIc circle')), moon: !!(st && st.querySelector('.stIc path') && !st.querySelector('.stIc circle')),
    night: !!(st && st.querySelector('.stDl.night')), fm: !!(st && st.querySelector('.stFm.on')), clock: r('clock'), plaque: r('plaque'), quest: r('qt'), gauge: r('gauge'), vw: innerWidth }; });
(async () => { const b = await Q.launch();
  for (const [n, w, h, iphone] of [['phone', 390, 844], ['phoneN', 320, 568], ['phoneXL', 430, 932], ['iphone', 393, 852, true]]) {
    const p = await Q.page(b, { w, h, look: '', expose: 'BUILD_TAG, stripUpdate, OPTS, saveOpts, applyLook, closeP, radio' });
    if (iphone) { await p.route(/\.css(\?|$)/, async (r) => { const res = await r.fetch(); r.fulfill({ response: res, body: fake(await res.text()) }); }); }   /* the stylesheets carry the insets; game.js is left to Q.page, which adds the exposed names */
    await Q.newGame(p); await clear(p); await p.waitForTimeout(600);
    if (n === 'phone') ok(+String(await p.evaluate(() => ZH.BUILD_TAG)).split('.')[1] >= 383, 'build is before 3D.383');
    const o = await read(p); const top = iphone ? 59 : 0;
    await p.screenshot({ path: path.join(out, `strip_built_${n}.png`) });
    ok(o.st && o.st.vis, `${n}: no strip`); if (!o.st) { await p.close(); continue; }
    ok(Math.abs(o.st.y) < .5 && Math.abs(o.st.h - (top + 26)) < .6 && o.st.w >= o.vw - .5, `${n}: the strip is ${o.st.w}x${o.st.h} at ${o.st.y}, wanted ${o.vw}x${top + 26} at 0`);
    ok(o.bg === 'rgb(0, 0, 0)', `${n}: the strip is ${o.bg}, not black`);
    ok(/^Day 1 · 08:00$/.test(o.txt.trim()) && o.sun, `${n}: the strip says "${o.txt}"${o.sun ? '' : ' without the sun'}`);
    ok(!o.clock.vis, `${n}: the old clock capsule still shows`);
    ok(o.plaque.y >= o.st.b - .5, `${n}: the resource bar (${o.plaque.y}) is under the strip (${o.st.b})`);
    ok(o.quest.y >= o.st.b - .5 && o.gauge.y >= o.st.b - .5, `${n}: the mission or Renown is under the strip`);
    ok(o.gauge.x >= o.quest.r - .5 || o.gauge.y >= o.quest.b - .5 || o.gauge.b <= o.quest.y + .5, `${n}: Renown overlaps the mission card`);
    if (n === 'phone' || iphone) {   /* night, the radio, a menu */
      await p.evaluate(() => { ZH.S.hour = 22; ZH.stripUpdate(); }); await p.waitForTimeout(200); const ni = await read(p);
      ok(ni.moon && ni.night && /22:00/.test(ni.txt), `${n}: at 22:00 the strip says "${ni.txt}", moon ${ni.moon}, night bar ${ni.night}`);
      if (n === 'phone') await p.screenshot({ path: path.join(out, 'strip_built_night.png') });
      await p.evaluate(() => { ZH.S.hour = 8; ZH.stripUpdate(); }); const fm0 = (await read(p)).fm;
      await p.evaluate(() => { ZH.radio('moth', 'Testing the signal, Haven.'); }); await p.waitForTimeout(700); await p.evaluate(() => ZH.stripUpdate()); const fm1 = (await read(p)).fm;
      ok(fm1 && !fm0, `${n}: the FM bars do not light for a message (before ${fm0}, during ${fm1})`);
      await clear(p); await p.click('#mSurv'); await p.waitForTimeout(600);
      const ip = await p.evaluate(() => { const e = document.getElementById('infoPanel').getBoundingClientRect(); return { y: e.y, h: e.height }; });
      const sb = (await read(p)).st.b; ok(ip.h > 100 && ip.y >= sb - .5, `${n}: the People sheet (${ip.y}) starts under the strip (${sb})`);
      await p.evaluate(() => ZH.closeP());
    }
    if (n === 'phone') {   /* the old look */
      await p.evaluate(() => { ZH.OPTS.look = 'glass'; ZH.saveOpts(); ZH.applyLook(); }); await p.waitForTimeout(400); const g = await read(p);
      ok(!g.st.vis && g.clock.vis, `look off: strip ${g.st.vis}, clock ${g.clock.vis}`);
      await p.evaluate(() => { ZH.OPTS.look = 'phone'; ZH.saveOpts(); ZH.applyLook(); });
    }
    console.log(`${n} ${w}x${h}${iphone ? ' (59 px notch)' : ''}: strip ${o.st.w}x${o.st.h}, "${o.txt}", resource bar at ${Math.round(o.plaque.y)}`);
    await p.close(); }
  await b.close(); console.log(bad ? `FAILED: ${bad}` : 'OK: the status strip at 3 sizes and on the iPhone'); process.exit(bad ? 1 : 0); })();
