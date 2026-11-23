// tools/qa/phone_look_check.js [sizes] [tag] — 3D.316 (owner, 23 Nov, W249): the phone look, step 1: the setting and the town screen.
// At six phone sizes:
//  - with the setting off (the default) the page has no phone sheet and the Build button sits in the middle of the tab bar, as before;
//  - More → Settings → "Phone look" switches it on: the four tabs sit in one capsule, Build is a round button to its right, nothing
//    overlaps, nothing is off the screen, every one takes taps of 44 px or more, and the resource bar is clear glass;
//  - Build, People and Town still open their menus; the setting survives a reload; switching it off puts the old bar back.
// Pictures (first size): runs/ui_samples/phone_look_316_{off,on}.png. Usage: node tools/qa/phone_look_check.js  (game served on :8765)
const Q = require('./lib'); const path = require('path');
const SIZES = (process.argv[2] || 'phone:390x844,phoneS:360x640,phoneM:375x667,phoneXL:430x932,phoneN:320x568,phoneT:412x915').split(',').map((s) => { const [n, d] = s.split(':'); const [w, h] = d.split('x').map(Number); return { n, w, h }; });
const TAG = process.argv[3] || '3D.316';
const box = (p) => p.evaluate(() => { const o = {}; for (const id of ['mExp', 'mSurv', 'mTown', 'mGuide', 'mBuild', 'lmenu']) { const r = document.getElementById(id).getBoundingClientRect(); o[id] = { x: r.x, y: r.y, w: r.width, h: r.height, r: r.right, b: r.bottom }; }
  o.phone = document.documentElement.classList.contains('phone'); o.sheet = !!document.getElementById('phoneCss'); o.resBg = getComputedStyle(document.querySelector('#plaque .res')).backgroundImage; o.vw = innerWidth; o.vh = innerHeight; return o; });
const setLook = async (p) => { await p.click('#mGuide'); await p.waitForTimeout(300); await p.evaluate(() => { [...document.querySelectorAll('#ib .setRow, #ib button, #ib .card')].find((e) => /^Settings/.test(e.innerText.trim())).click(); }); await p.waitForTimeout(300); await p.click('#stLook'); await p.waitForTimeout(500); await p.evaluate(() => ZH.closeP()); await p.waitForTimeout(300); };
(async () => {
  let bad = 0; const fail = (m) => { bad++; console.log('  FAIL ' + m); };
  const b = await Q.launch();
  for (const [i, S] of SIZES.entries()) {
    const p = await Q.page(b, { w: S.w, h: S.h, expose: 'BUILD_TAG, closeP, endBuildMode, OPTS, saveOpts, applyLook' }); await p.evaluate(() => { try { const o = JSON.parse(localStorage.getItem('zombieHavenOpts') || '{}'); delete o.look; localStorage.setItem('zombieHavenOpts', JSON.stringify(o)); } catch (e) {} });
    await Q.newGame(p); await Q.clearCards(p); await p.waitForTimeout(1500); await Q.clearCards(p);
    const tag = await p.evaluate(() => ZH.BUILD_TAG); if (tag !== TAG) fail(`build ${tag}, wanted ${TAG}`);
    const off = await box(p); if (i === 0) await p.screenshot({ path: path.join(__dirname, '../../runs/ui_samples/phone_look_316_off.png') });
    if (off.phone || off.sheet) fail(`${S.n}: the phone look is on by default`);
    if (!(off.mBuild.x > off.mSurv.x && off.mBuild.x < off.mTown.x)) fail(`${S.n}: look off: Build is not in the middle of the bar`);
    await setLook(p); await Q.clearCards(p); await p.waitForTimeout(300); await Q.clearCards(p); const on = await box(p); if (i === 0) await p.screenshot({ path: path.join(__dirname, '../../runs/ui_samples/phone_look_316_on.png') });
    if (!on.phone || !on.sheet) fail(`${S.n}: the setting did not switch the phone look on`);
    if (!/gradient/.test(on.resBg)) fail(`${S.n}: the resource bar is not clear glass (${on.resBg})`);
    const order = ['mExp', 'mSurv', 'mTown', 'mGuide', 'mBuild'];
    for (let k = 0; k < order.length; k++) { const a = on[order[k]];
      if (a.w < 43.5 || a.h < 43.5) fail(`${S.n}: ${order[k]} takes taps of only ${a.w.toFixed(0)}x${a.h.toFixed(0)}`);
      if (a.x < 0 || a.r > on.vw + .5 || a.b > on.vh + .5) fail(`${S.n}: ${order[k]} is off the screen`);
      if (k && a.x < on[order[k - 1]].r - .5) fail(`${S.n}: ${order[k]} overlaps ${order[k - 1]}`); }
    if (on.mBuild.x < on.lmenu.r) fail(`${S.n}: Build is not beside the tab capsule`);
    if (on.mGuide.r > on.lmenu.r + .5) fail(`${S.n}: More sticks out of the capsule`);
    for (const [id, t] of [['mBuild', 'Build'], ['mSurv', 'People'], ['mTown', 'Town']]) { await Q.clearCards(p); await p.click('#' + id); await p.waitForTimeout(350); const open = await p.evaluate(() => { const e = document.getElementById('infoPanel'); return !!e && getComputedStyle(e).display !== 'none' && e.getBoundingClientRect().height > 100; }); if (!open) fail(`${S.n}: ${t} did not open its menu in the phone look`); await p.evaluate(() => { ZH.closeP(); ZH.endBuildMode(true); }); await p.waitForTimeout(200); }
    await p.reload(); await p.waitForTimeout(1500); const kept = await p.evaluate(() => document.documentElement.classList.contains('phone') && !!document.getElementById('phoneCss')); if (!kept) fail(`${S.n}: the setting was lost on reload`);
    await p.evaluate(() => { ZH.OPTS.look = 'glass'; ZH.saveOpts(); ZH.applyLook(); }); await p.waitForTimeout(200); if (await p.evaluate(() => document.documentElement.classList.contains('phone'))) fail(`${S.n}: switching off left the phone look on`);
    console.log(`${S.n} ${S.w}x${S.h}: tabs ${order.map((k) => on[k].w.toFixed(0) + 'x' + on[k].h.toFixed(0)).join(' ')}`);
    await p.close();
  }
  await b.close(); console.log(bad ? `FAILED: ${bad}` : 'OK: the phone look switches on and off; the town screen fits at ' + SIZES.length + ' sizes'); process.exit(bad ? 1 : 0);
})();
