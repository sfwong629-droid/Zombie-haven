// tools/qa/phone_look_check.js [sizes] [tag] — 3D.317, 3D.333 (owner, 23 Nov, W249): the phone look, step 1: the town screen, on by default.
// At six phone sizes:
//  - a fresh game starts in the phone look (3D.333): the five app icons sit in one dock, Build last (3D.382), nothing
//    overlaps, nothing is off the screen, every one takes taps of 44 px or more, and the resource bar is clear glass;
//  - the bag is its own round button beside the resource bar (3D.334) and a tap on it opens the supplies list;
//  - Build, People and Town still open their menus;
//  - More → Settings → "Phone look" switches it off: the old bar is back with Build in the middle; "off" survives a reload; it switches on again.
// Pictures (first size): runs/ui_samples/phone_look_{on,off}.png. Usage: node tools/qa/phone_look_check.js  (game served on :8765)
const Q = require('./lib'); const path = require('path');
const SIZES = (process.argv[2] || 'phone:390x844,phoneS:360x640,phoneM:375x667,phoneXL:430x932,phoneN:320x568,phoneT:412x915').split(',').map((s) => { const [n, d] = s.split(':'); const [w, h] = d.split('x').map(Number); return { n, w, h }; });
const TAG = process.argv[3] || '3D.334';
const box = (p) => p.evaluate(() => { const o = {}; for (const id of ['mExp', 'mSurv', 'mTown', 'mGuide', 'mBuild', 'lmenu']) { const r = document.getElementById(id).getBoundingClientRect(); o[id] = { x: r.x, y: r.y, w: r.width, h: r.height, r: r.right, b: r.bottom }; }
  { const r = document.querySelector('#plaque .res').getBoundingClientRect(), g = document.querySelector('#plaque .bagChip').getBoundingClientRect(); o.res = { r: r.right }; o.bag = { x: g.x, y: g.y, w: g.width, h: g.height, r: g.right }; }
  o.phone = document.documentElement.classList.contains('phone'); o.sheet = !!document.getElementById('phoneCss'); o.resBg = getComputedStyle(document.querySelector('#plaque .res')).backgroundImage; o.vw = innerWidth; o.vh = innerHeight; return o; });
const setLook = async (p) => { await p.click('#mGuide'); await p.waitForTimeout(300); await p.evaluate(() => { (document.getElementById('moSet') || [...document.querySelectorAll('#ib .setRow, #ib button, #ib .card')].find((e) => /^Settings/.test(e.innerText.trim()))).click(); }); await p.waitForTimeout(300); await p.click('#stLook'); await p.waitForTimeout(500); await p.evaluate(() => ZH.closeP()); await p.waitForTimeout(300); };
(async () => {
  let bad = 0; const fail = (m) => { bad++; console.log('  FAIL ' + m); };
  const b = await Q.launch();
  for (const [i, S] of SIZES.entries()) {
    const p = await Q.page(b, { w: S.w, h: S.h, look: '', expose: 'BUILD_TAG, closeP, endBuildMode, OPTS, saveOpts, applyLook' });
    await Q.newGame(p); await Q.clearCards(p); await p.waitForTimeout(1500); await Q.clearCards(p);
    const tag = await p.evaluate(() => ZH.BUILD_TAG); if (tag !== TAG) fail(`build ${tag}, wanted ${TAG}`);
    const on = await box(p); if (i === 0) await p.screenshot({ path: path.join(__dirname, '../../runs/ui_samples/phone_look_on.png') });
    if (!on.phone || !on.sheet) fail(`${S.n}: the phone look is not on by default`);
    if (!/gradient/.test(on.resBg)) fail(`${S.n}: the resource bar is not clear glass (${on.resBg})`);
    const order = ['mExp', 'mSurv', 'mTown', 'mGuide', 'mBuild'];
    for (let k = 0; k < order.length; k++) { const a = on[order[k]];
      if (a.w < 43.5 || a.h < 43.5) fail(`${S.n}: ${order[k]} takes taps of only ${a.w.toFixed(0)}x${a.h.toFixed(0)}`);
      if (a.x < 0 || a.r > on.vw + .5 || a.b > on.vh + .5) fail(`${S.n}: ${order[k]} is off the screen`);
      if (k && a.x < on[order[k - 1]].r - .5) fail(`${S.n}: ${order[k]} overlaps ${order[k - 1]}`); }
    /* 3D.334: the bag is its own button beside the bar, big enough to tap, and a tap opens the supplies list */
    if (on.bag.x < on.res.r) fail(`${S.n}: the bag is still inside the resource bar`);
    if (on.bag.w < 43.5 || on.bag.h < 43.5) fail(`${S.n}: the bag takes taps of only ${on.bag.w.toFixed(0)}x${on.bag.h.toFixed(0)}`);
    if (on.bag.x < 0 || on.bag.r > on.vw + .5 || on.bag.y < 0) fail(`${S.n}: the bag is off the screen`);
    await Q.clearCards(p); await p.click('#plaque .bagChip'); await p.waitForTimeout(300); { const sp = await p.evaluate(() => { const e = document.getElementById('supPop'); if (!e) return null; const r = e.getBoundingClientRect(); return { x: r.x, r: r.right, w: innerWidth }; }); if (!sp) fail(`${S.n}: a tap on the bag did not open the supplies list`); else if (sp.x < 0 || sp.r > sp.w + .5) fail(`${S.n}: the supplies list is off the screen`); if (i === 0) await p.screenshot({ path: path.join(__dirname, '../../runs/ui_samples/phone_look_bag.png') }); await p.click('#plaque .bagChip'); await p.waitForTimeout(200); }
    /* 3D.382: the dock holds all five icons, Build last (it was a round button beside the capsule) */
    for (const k of order) if (on[k].x < on.lmenu.x - .5 || on[k].r > on.lmenu.r + .5) fail(`${S.n}: ${k} sticks out of the dock`);
    for (const [id, t] of [['mBuild', 'Build'], ['mSurv', 'People'], ['mTown', 'Town']]) { await Q.clearCards(p); await p.click('#' + id); await p.waitForTimeout(350); const open = await p.evaluate(() => { const e = document.getElementById('infoPanel'); return !!e && getComputedStyle(e).display !== 'none' && e.getBoundingClientRect().height > 100; }); if (!open) fail(`${S.n}: ${t} did not open its menu in the phone look`); await p.evaluate(() => { ZH.closeP(); ZH.endBuildMode(true); }); await p.waitForTimeout(200); }
    await Q.clearCards(p); await setLook(p); await Q.clearCards(p); await p.waitForTimeout(300); const off = await box(p); if (i === 0) await p.screenshot({ path: path.join(__dirname, '../../runs/ui_samples/phone_look_off.png') });
    if (off.phone) fail(`${S.n}: the Settings switch did not turn the phone look off`);
    if (!(off.mBuild.x > off.mSurv.x && off.mBuild.x < off.mTown.x)) fail(`${S.n}: look off: Build is not back in the middle of the bar`);
    await p.reload(); await p.waitForTimeout(1500); if (await p.evaluate(() => document.documentElement.classList.contains('phone'))) fail(`${S.n}: "off" was lost on reload`);
    await p.evaluate(() => { ZH.OPTS.look = 'phone'; ZH.saveOpts(); ZH.applyLook(); }); await p.waitForTimeout(200); if (!(await p.evaluate(() => document.documentElement.classList.contains('phone')))) fail(`${S.n}: switching back on did not work`);
    console.log(`${S.n} ${S.w}x${S.h}: tabs ${order.map((k) => on[k].w.toFixed(0) + 'x' + on[k].h.toFixed(0)).join(' ')}`);
    await p.close();
  }
  await b.close(); console.log(bad ? `FAILED: ${bad}` : 'OK: the phone look switches on and off; the town screen fits at ' + SIZES.length + ' sizes'); process.exit(bad ? 1 : 0);
})();
