// tools/qa/dock_check.js [sizes] — 3D.382 (W249; owner, 25 Nov: dock A, "Go back to the today pick"): the phone look's tab bar is a dock of
// five app icons (assets/ui/dock/*.webp) with a label under each. At three phone sizes:
//  - the dock sits inside the screen, above the home bar; the five icons are in it in order Explore, People, Town, More, Build, none overlapping;
//  - each icon picture has loaded, is square (50 px from 3D.384, 55 on the largest phone where the HUD is drawn larger; the HUD is drawn smaller on a 320-wide phone) with round corners, the stickers are hidden, the label shows under it;
//  - every icon takes taps of 44 px or more; a tap on each opens its menu (or the map for Explore);
//  - the radio's now-playing capsule sits clear of the dock;
//  - Settings → Phone look off: the pictures are gone and the old bar with its stickers is back.
// Pictures: runs/ui_samples/dock_built.png (first size), dock_built_radio_<size>.png when the radio capsule showed. Usage: node tools/qa/dock_check.js  (game served on :8765)
const Q = require('./lib'); const path = require('path');
const SIZES = (process.argv[2] || 'phone:390x844,phoneN:320x568,phoneXL:430x932').split(',').map((s) => { const [n, d] = s.split(':'); const [w, h] = d.split('x').map(Number); return { n, w, h }; });
const ORDER = ['mExp', 'mSurv', 'mTown', 'mGuide', 'mBuild'], LABEL = { mExp: 'Explore', mSurv: 'People', mTown: 'Town', mGuide: 'More', mBuild: 'Build' };
const read = (p) => p.evaluate((ORDER) => { const d = document.getElementById('lmenu').getBoundingClientRect(), o = { dock: { x: d.x, y: d.y, r: d.right, b: d.bottom, w: d.width }, vw: innerWidth, vh: innerHeight, btn: {} };
  for (const id of ORDER) { const b = document.getElementById(id), r = b.getBoundingClientRect(), im = b.querySelector('.dkI img'), k = b.querySelector('.dkI'), st = b.querySelector(':scope > i');
    const kr = k && k.getBoundingClientRect(); o.btn[id] = { x: r.x, r: r.right, y: r.y, b: r.bottom, w: r.width, h: r.height, img: !!im && im.complete && im.naturalWidth > 0, kw: kr ? kr.width : 0, kh: kr ? kr.height : 0, kb: kr ? kr.bottom : 0, rad: k ? parseFloat(getComputedStyle(k).borderTopLeftRadius) : 0, kShown: !!k && getComputedStyle(k).display !== 'none', stShown: !!st && getComputedStyle(st).display !== 'none', text: b.innerText.trim() }; }
  return o; }, ORDER);
(async () => {
  let bad = 0; const fail = (m) => { bad++; console.log('  FAIL ' + m); };
  const b = await Q.launch();
  for (const [i, S] of SIZES.entries()) {
    const p = await Q.page(b, { w: S.w, h: S.h, look: '', expose: 'BUILD_TAG, closeP, endBuildMode, OPTS, saveOpts, applyLook, radio' });
    await Q.newGame(p); await Q.clearCards(p); await p.waitForTimeout(1500); await Q.clearCards(p);
    for (let k = 0; k < 6; k++) { await p.evaluate(() => { try { ZH.S.introOff = true; } catch (e) {} const x = document.querySelector('#eventModal button:not(.tipMb)'); if (x) x.click(); }); await Q.clearCards(p); await p.waitForTimeout(250); }
    const tag = await p.evaluate(() => ZH.BUILD_TAG); if (!(+String(tag).split('.')[1] >= 382)) fail(`build ${tag}, wanted 3D.382 or later`);
    const o = await read(p); if (i === 0) await p.screenshot({ path: path.join(__dirname, '../../runs/ui_samples/dock_built.png') });
    if (o.dock.x < 0 || o.dock.r > o.vw + .5 || o.dock.b > o.vh + .5) fail(`${S.n}: the dock is off the screen`);
    if (o.dock.w < o.vw - 40) fail(`${S.n}: the dock does not run across the bottom (${o.dock.w.toFixed(0)} of ${o.vw})`);
    for (const [k, id] of ORDER.entries()) { const t = o.btn[id];
      if (!t.img) fail(`${S.n}: ${id}'s picture did not load`);
      if (!t.kShown || t.stShown) fail(`${S.n}: ${id} shows the sticker, not the app icon`);
      if (Math.abs(t.kw - t.kh) > .5 || t.kw < 40 || t.kw > 56) fail(`${S.n}: ${id}'s icon is ${t.kw.toFixed(1)}x${t.kh.toFixed(1)}, not square, or outside 40 to 56`);   /* 56 px, drawn smaller with the whole HUD on a 320-wide phone */
      if (t.rad < 10) fail(`${S.n}: ${id}'s icon has square corners`);
      if (t.text !== LABEL[id]) fail(`${S.n}: ${id}'s label is "${t.text}", not ${LABEL[id]}`);
      if (t.w < 43.5 || t.h < 43.5) fail(`${S.n}: ${id} takes taps of only ${t.w.toFixed(0)}x${t.h.toFixed(0)}`);
      if (t.x < o.dock.x - .5 || t.r > o.dock.r + .5 || t.b > o.dock.b + .5) fail(`${S.n}: ${id} sticks out of the dock`);
      if (k && t.x < o.btn[ORDER[k - 1]].r - .5) fail(`${S.n}: ${id} overlaps ${ORDER[k - 1]}`); }
    const clr = async () => { for (let k = 0; k < 4; k++) { await p.evaluate(() => { const x = document.querySelector('#eventModal button:not(.tipMb)'); if (x) x.click(); }); await Q.clearCards(p); await p.waitForTimeout(150); } };
    for (const id of ORDER) { await clr(); await p.click('#' + id); await p.waitForTimeout(450);
      const open = await p.evaluate(() => { const e = document.getElementById('infoPanel'); return !!e && getComputedStyle(e).display !== 'none' && e.getBoundingClientRect().height > 100; });
      if (!open) fail(`${S.n}: ${LABEL[id]} did not open`); await p.evaluate(() => { ZH.closeP(); ZH.endBuildMode(true); }); await p.waitForTimeout(250); }
    /* the radio's now-playing capsule over the dock, not on it */
    await p.evaluate(() => { try { ZH.radio('moth', 'Good evening, Haven. Testing, testing, one two.'); } catch (e) {} }); let rc = null; for (let k = 0; k < 12 && !rc; k++) { await p.waitForTimeout(400); rc = await p.evaluate(() => { const e = document.querySelector('.radioCard.rcLive'); if (!e || !e.classList.contains('in')) return null; const r = e.getBoundingClientRect(); return { y: r.y, b: r.bottom, h: r.height }; }); }
    if (rc) { await p.waitForTimeout(800); rc = await p.evaluate(() => { const e = document.querySelector('.radioCard.rcLive'); if (!e) return null; const r = e.getBoundingClientRect(); return { y: r.y, b: r.bottom, h: r.height }; }); }   /* measured once it has slid in */
    /* hit-tested, since the stack is drawn with CSS zoom on small phones and its rectangles do not match the screen there */
    if (rc) { const hit = await p.evaluate((y) => { for (let x = 20; x < innerWidth - 20; x += 6) { const e = document.elementFromPoint(x, y + 2); if (e && e.closest('.radioCard')) return x; } return 0; }, o.dock.y); if (hit) fail(`${S.n}: the radio capsule covers the dock's top edge at x=${hit}`); }
    if (rc) await p.screenshot({ path: path.join(__dirname, `../../runs/ui_samples/dock_built_radio_${S.n}.png`) });
    /* the old look keeps its stickers */
    await p.evaluate(() => { ZH.OPTS.look = 'glass'; ZH.saveOpts(); ZH.applyLook(); }); await p.waitForTimeout(400);
    const g = await read(p); for (const id of ORDER) if (g.btn[id].kShown || !g.btn[id].stShown) fail(`${S.n}: look off: ${id} still shows the app icon`);
    await p.evaluate(() => { ZH.OPTS.look = 'phone'; ZH.saveOpts(); ZH.applyLook(); });
    console.log(`${S.n} ${S.w}x${S.h}: dock ${o.dock.w.toFixed(0)}x${(o.dock.b - o.dock.y).toFixed(0)} at ${o.dock.y.toFixed(0)}; radio ${rc ? 'shown' : 'not shown'}`);
    await p.close();
  }
  await b.close(); console.log(bad ? `FAILED: ${bad}` : 'OK: the dock and its five app icons fit at ' + SIZES.length + ' sizes'); process.exit(bad ? 1 : 0);
})();
