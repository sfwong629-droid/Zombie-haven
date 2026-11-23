// tools/qa/phone_people_check.js [sizes] [tag] — 3D.335 (owner, 23 Nov, W249): People as a contact list in the phone look.
// At three phone sizes, in a fresh game (the phone look is the default):
//  - People opens as a floating sheet of see-through frosted glass (3D.336; a gap all round, inside the screen) titled People, with a search field, All / Fighters / Workers
//    with counts, and one row per survivor in groups; every row, the search field and the three buttons take taps of 44 px or more;
//  - each row shows the person's picture; typing in Search leaves only matching rows; Fighters shows only fighters;
//  - a tap on a row opens that survivor's page with a Back button, and Back returns to the list;
//  - Settings -> Survivor pictures off: rows show the first letter and no picture; on again brings the pictures back;
//  - dragging the sheet's top down closes it;
//  - with the phone look switched off, People is the old list.
// Pictures (first size): runs/ui_samples/phone_people_{list,letters}.png. Usage: node tools/qa/phone_people_check.js  (game served on :8765)
const Q = require('./lib'); const path = require('path');
const SIZES = (process.argv[2] || 'phone:390x844,phoneN:320x568,phoneXL:430x932').split(',').map((s) => { const [n, d] = s.split(':'); const [w, h] = d.split('x').map(Number); return { n, w, h }; });
const TAG = process.argv[3] || '3D.336';
(async () => {
  let bad = 0; const fail = (m) => { bad++; console.log('  FAIL ' + m); };
  const b = await Q.launch();
  for (const [i, S] of SIZES.entries()) {
    const p = await Q.page(b, { w: S.w, h: S.h, look: '', expose: 'BUILD_TAG, closeP, endBuildMode, OPTS, saveOpts, applyLook, showSurvivors, isFighter' });
    await Q.newGame(p); await Q.clearCards(p); await p.waitForTimeout(1500); await Q.clearCards(p);
    const tag = await p.evaluate(() => ZH.BUILD_TAG); if (tag !== TAG) fail(`build ${tag}, wanted ${TAG}`);
    const open = async () => { await Q.clearCards(p); await p.evaluate(() => ZH.showSurvivors()); await p.waitForTimeout(500); };
    const read = () => p.evaluate(() => { const pn = document.getElementById('infoPanel').getBoundingClientRect(), bx = (e) => { const r = e.getBoundingClientRect(); return { w: r.width, h: r.height }; };
      const rows = [...document.querySelectorAll('#ib .phRow')].filter((r) => r.offsetParent && getComputedStyle(r).display !== 'none');
      const cs = getComputedStyle(document.getElementById('infoPanel')); const al = (cs.backgroundImage.match(/rgba\([^)]*\)/g) || []).map((x) => +x.replace(')', '').split(',').pop());
      return { glassA: al.length ? Math.max(...al) : 1, blur: /blur/.test(cs.backdropFilter || cs.webkitBackdropFilter || ''), show: document.getElementById('infoPanel').classList.contains('show'), title: document.getElementById('it').textContent, pn: { x: pn.x, r: pn.right, b: pn.bottom, y: pn.y }, vw: innerWidth, vh: innerHeight,
        rows: rows.length, rowH: Math.min(...rows.map((r) => bx(r).h)), imgs: rows.filter((r) => r.querySelector('.phFace img')).length, letters: rows.filter((r) => r.querySelector('.phFace b')).length,
        search: document.querySelector('#ib .phSearch') ? bx(document.querySelector('#ib .phSearch')) : null, seg: [...document.querySelectorAll('#ib .phSeg button')].map((e) => ({ ...bx(e), t: e.textContent })), groups: document.querySelectorAll('#ib .phGrp').length,
        sv: ZH.S.sv.length, fighters: ZH.S.sv.filter(ZH.isFighter).length, old: document.querySelectorAll('#ib .card[data-sv]').length, back: getComputedStyle(document.getElementById('pBack')).display !== 'none' }; });
    await open(); const a = await read(); if (i === 0) await p.screenshot({ path: path.join(__dirname, '../../runs/ui_samples/phone_people_list.png') });
    if (!a.show || a.title !== 'People') fail(`${S.n}: People did not open (${a.title})`);
    if (a.pn.x < 4 || a.pn.r > a.vw - 4 || a.pn.b > a.vh - 4) fail(`${S.n}: the sheet does not float inside the screen (${a.pn.x.toFixed(0)}, ${a.pn.r.toFixed(0)} of ${a.vw}, ${a.pn.b.toFixed(0)} of ${a.vh})`);
    if (!(a.glassA <= .7) || !a.blur) fail(`${S.n}: the sheet is not see-through glass (tint ${a.glassA}, blur ${a.blur})`);   /* 3D.336: frosted glass, mockup A */
    if (a.rows !== a.sv) fail(`${S.n}: ${a.rows} rows for ${a.sv} people`); if (!a.groups) fail(`${S.n}: no groups`);
    if (a.rowH < 43.5) fail(`${S.n}: a row is only ${a.rowH.toFixed(0)} px tall`);
    if (!a.search || a.search.h < 43.5) fail(`${S.n}: the search field is under 44 px`);
    if (a.seg.length !== 3 || a.seg.some((s) => s.h < 43.5 || s.w < 43.5)) fail(`${S.n}: All / Fighters / Workers are missing or under 44 px`);
    if (a.imgs !== a.sv) fail(`${S.n}: ${a.imgs} of ${a.sv} rows show a picture`);
    await p.fill('#pplQ', (await p.evaluate(() => ZH.S.sv[1].name)).slice(0, 3)); await p.waitForTimeout(250); const s1 = await read(); if (!(s1.rows >= 1 && s1.rows < a.sv)) fail(`${S.n}: searching left ${s1.rows} rows`);
    await p.fill('#pplQ', ''); await p.waitForTimeout(200); await p.click('#ib .phSeg button[data-pff="fight"]'); await p.waitForTimeout(400); const f1 = await read(); if (f1.rows !== a.fighters) fail(`${S.n}: Fighters shows ${f1.rows}, the town has ${a.fighters}`);
    await p.click('#ib .phSeg button[data-pff="all"]'); await p.waitForTimeout(400);
    await p.click('#ib .phRow'); await p.waitForTimeout(600); const u = await read(); if (!u.back || u.title === 'People') fail(`${S.n}: a tap on a row did not open the survivor's page`);
    await p.click('#pBack'); await p.waitForTimeout(500); const bk = await read(); if (bk.title !== 'People' || bk.rows !== a.sv) fail(`${S.n}: Back did not return to the list`);
    await p.evaluate(() => { ZH.OPTS.pics = false; ZH.saveOpts(); }); await open(); const l = await read(); if (i === 0) await p.screenshot({ path: path.join(__dirname, '../../runs/ui_samples/phone_people_letters.png') });
    if (l.imgs !== 0 || l.letters !== a.sv) fail(`${S.n}: pictures off: ${l.imgs} pictures, ${l.letters} letters`);
    await p.evaluate(() => { ZH.OPTS.pics = true; ZH.saveOpts(); }); await open(); if ((await read()).imgs !== a.sv) fail(`${S.n}: pictures did not come back`);
    { const r = await p.evaluate(() => { const q = document.getElementById('infoPanel').getBoundingClientRect(); return { x: q.x + q.width / 2, y: q.y + 12 }; }); await p.mouse.move(r.x, r.y); await p.mouse.down(); await p.mouse.move(r.x, r.y + 60, { steps: 4 }); await p.mouse.move(r.x, r.y + 160, { steps: 4 }); await p.mouse.up(); await p.waitForTimeout(400);
      if ((await read()).show) fail(`${S.n}: dragging the sheet's top down did not close it`); }
    await p.evaluate(() => { ZH.OPTS.look = 'glass'; ZH.saveOpts(); ZH.applyLook(); }); await open(); const g = await read(); if (g.old !== a.sv || g.rows) fail(`${S.n}: with the phone look off People is not the old list (${g.old} cards, ${g.rows} rows)`);
    await p.evaluate(() => { ZH.OPTS.look = 'phone'; ZH.saveOpts(); ZH.applyLook(); ZH.closeP(); });
    console.log(`${S.n} ${S.w}x${S.h}: ${a.rows} rows in ${a.groups} groups, row ${a.rowH.toFixed(0)} px, sheet ${a.pn.x.toFixed(0)}..${a.pn.r.toFixed(0)} of ${a.vw}`);
    if (p.errs.length) fail(`${S.n}: page errors: ${p.errs.slice(0, 2).join(' | ')}`);
    await p.close();
  }
  await b.close(); console.log(bad ? `FAILED: ${bad}` : 'OK: People is a contact list in the phone look at ' + SIZES.length + ' sizes'); process.exit(bad ? 1 : 0);
})();
