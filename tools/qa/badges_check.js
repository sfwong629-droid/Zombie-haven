// tools/qa/badges_check.js — UI chat, 3D.393 (owner, 28 Nov: badges "C ... should be the exact same size and look as the iphone"). Three phone sizes:
//  - no badge on a quiet town; People shows the badly hurt in amber, and anyone down in red with the count of both; Explore the leads (amber);
//    Town 1 when the level-up is ready (amber); Build burnt (red) or badly damaged (amber); More the workplaces with no worker (amber);
//  - the badge is the phone's: 20 px high for the 50 px icon (scaled with the dock), round, no border or shadow, white 14 px type, red #ff3b30
//    or amber #ff9500, over the icon's top right corner by about 7 px; the More grid's Jobs badge the same at the grid's size;
//  - the old look shows none. Pictures: runs/ui_samples/badges_<size>.png, badges_more.png.
const Q = require('./lib'); const path = require('path'); const out = path.join(__dirname, '../../runs/ui_samples');
let bad = 0; const ok = (c, m) => { if (!c) { bad++; console.log('  FAIL ' + m); } };
const clear = async (p) => { for (let k = 0; k < 8; k++) { await p.evaluate(() => { try { ZH.S.introOff = true; } catch (e) {} const x = document.querySelector('#eventModal button:not(.tipMb)'); if (x) x.click(); }); await Q.clearCards(p); await p.waitForTimeout(150); } };
const read = (p) => p.evaluate(() => Object.fromEntries(['mExp', 'mSurv', 'mTown', 'mGuide', 'mBuild'].map((id) => { const e = document.querySelector('#' + id + ' .dkB'); if (!e) return [id, null]; const r = e.getBoundingClientRect(), i = document.querySelector('#' + id + ' .dkI').getBoundingClientRect(), cs = getComputedStyle(e), k = i.width / 50;
  return [id, { t: e.textContent, bg: cs.backgroundColor, col: cs.color, h: r.height / k, fs: parseFloat(cs.fontSize), bw: cs.borderTopWidth, sh: cs.boxShadow, rad: parseFloat(cs.borderTopLeftRadius), up: (i.top - r.top) / k, out: (r.right - i.right) / k }]; })));
(async () => { const b = await Q.launch();
  for (const [n, w, h] of [['phone', 390, 844], ['phoneN', 320, 568], ['phoneXL', 430, 932]]) {
    const p = await Q.page(b, { w, h, look: '', expose: 'BUILD_TAG, OPTS, saveOpts, applyLook, ui, world, showMore, closeP' });
    await Q.newGame(p); await clear(p);
    if (n === 'phone') ok(+String(await p.evaluate(() => ZH.BUILD_TAG)).split('.')[1] >= 393, 'build before 3D.393');
    await p.evaluate(() => { ZH.S.leads = []; ZH.S.rankReady = false; for (const q of ZH.S.sv) { q.hp = q.max; q.bleed = null; } for (const bb of ZH.world.buildings) { bb.burnt = false; if (bb.max) bb.hp = bb.max; } ZH.ui(); });
    ok(await p.evaluate(() => ['mExp', 'mSurv', 'mTown', 'mGuide', 'mBuild'].every((id) => { const r = document.getElementById(id).getBoundingClientRect(); return r.left >= 0 && r.right <= innerWidth + .5; })), `${n}: a dock button left the screen`);
    ok(await p.evaluate(() => !document.querySelector('#mExp[data-badge]:not([data-badge=""])') || getComputedStyle(document.getElementById('mExp'), '::after').content === 'none'), `${n}: the old red leads count still shows`);
    let r = await read(p); ok(!r.mSurv && !r.mTown && !r.mBuild && !r.mExp, `${n}: badges on a quiet town: ${JSON.stringify(Object.fromEntries(Object.entries(r).map(([k, v]) => [k, v && v.t])))}`);
    await p.evaluate(() => { const s = ZH.S.sv; s[0].hp = Math.floor(s[0].max * .3); s[1].hp = Math.floor(s[1].max * .3); ZH.S.leads = [{ id: 'x', dest: 'gas', risk: 1, text: '', untilH: 1e9 }]; ZH.S.rankReady = true; ZH.S.lvUp = null; const bb = ZH.world.buildings.find((q) => q.max); if (bb) bb.hp = Math.floor(bb.max * .3); ZH.ui(); });
    await p.waitForTimeout(200); r = await read(p); await p.screenshot({ path: path.join(out, `badges_${n}.png`) });
    const AM = 'rgb(255, 149, 0)', RED = 'rgb(255, 59, 48)';
    ok(r.mSurv && r.mSurv.t === '2' && r.mSurv.bg === AM, `${n}: People, two badly hurt in amber: ${JSON.stringify(r.mSurv)}`);
    ok(r.mExp && r.mExp.t === '1' && r.mExp.bg === AM, `${n}: Explore, a lead: ${JSON.stringify(r.mExp)}`);
    ok(r.mTown && r.mTown.t === '1' && r.mTown.bg === AM, `${n}: Town, the level-up: ${JSON.stringify(r.mTown)}`);
    ok(r.mBuild && r.mBuild.t === '1' && r.mBuild.bg === AM, `${n}: Build, a damaged building: ${JSON.stringify(r.mBuild)}`);
    for (const [id, v] of Object.entries(r)) if (v) ok(Math.abs(v.h - 20) < .6 && v.col === 'rgb(255, 255, 255)' && v.bw === '0px' && v.sh === 'none' && v.rad >= 9.5 && v.up > 5 && v.up < 9 && v.out > 4 && v.out < 9, `${n}: ${id} is not the phone's badge: ${JSON.stringify(v)}`);
    await p.evaluate(() => { ZH.S.sv[0].hp = 0; ZH.ui(); }); r = await read(p); ok(r.mSurv && r.mSurv.t === '2' && r.mSurv.bg === RED, `${n}: someone down turns People red: ${JSON.stringify(r.mSurv)}`);
    if (n === 'phone') {
      await p.evaluate(() => { ZH.S.sv[0].hp = ZH.S.sv[0].max; ZH.closeP(); ZH.showMore(); }); await p.waitForTimeout(400); await p.screenshot({ path: path.join(out, 'badges_more.png') });
      await p.evaluate(() => { ZH.closeP(); ZH.OPTS.look = 'glass'; ZH.saveOpts && ZH.saveOpts(); ZH.applyLook && ZH.applyLook(); ZH.ui(); }); await p.waitForTimeout(300);
      ok(await p.evaluate(() => [...document.querySelectorAll('.dkB')].every((e) => !e.offsetParent)), 'phone: the old look shows the badges');
    }
    await p.close();
  }
  await b.close(); console.log(bad ? `badges_check: ${bad} FAIL` : 'badges_check: all passed'); process.exit(bad ? 1 : 0);
})();
