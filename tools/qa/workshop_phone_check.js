// tools/qa/workshop_phone_check.js [tag] — UI chat, 3D.377 (W249, W270). A placed building's Details, Research and Craft tabs in the phone look:
// Details as grouped rows (Running cost, In use "n of m", Quality, Appeal), the description behind How it works; Research: points, each day and scrap,
// Ready to research (one row each, the price on a button: lime when it can be paid, grey with "Need ..." when not; a tap on the row shows what it
// does; the button researches), Locked (greyed, "Needs ..."), Done · N with ticks; Craft: a section per researched set, one row per item with its
// picture and the price on a button (the button crafts it into the stash; a tap on the row shows its numbers); rows and buttons 44 px+ on the screen.
// With the look off, the old tabs.
const Q = require('./lib'); const path = require('path'); const out = path.join(__dirname, '../../runs/ui_samples'); const TAG = process.argv[2] || ''; let bad = 0; const ok = (c, m) => { if (!c) { bad++; console.log('  FAIL ' + m); } };
(async () => { const b = await Q.launch();
  for (const [n, w, h] of [['phone', 390, 844], ['phoneN', 320, 568], ['phoneL', 430, 932]]) { console.log(n);
    const p = await Q.page(b, { w, h, look: '', expose: 'showBuildingInfo,world,DEFS,S,Wd,pushUnitsOut,OPTS' }); await Q.newGame(p); await Q.clearCards(p); await p.waitForTimeout(1500); await Q.clearCards(p);
    if (TAG) ok(await p.evaluate(() => ZH.BUILD_TAG) === TAG, 'build tag is ' + TAG);
    const placed = await p.evaluate(() => { const t = 'workshop', W = ZH.world, D = ZH.Wd.DEFS[t], B = ZH.Wd.BUILD; for (let y = B.y0; y <= B.y1; y++) for (let x = B.x0; x <= B.x1; x++) if (ZH.Wd.placementCheck(W, x, y, D, null).ok) { const b = { type: t, x, y, w: D.w, h: D.h, q: D.q, a: D.a, staff: null }; W.buildings.push(b); ZH.Wd.bump(W); ZH.pushUnitsOut(b); window.__ws = b; return true; } return false; });
    ok(placed, 'a Workshop placed'); if (!placed) { await p.close(); continue; }
    await p.evaluate(() => { const S = ZH.S; S.introOff = true; S.res = { blades: true }; S.rp = 30; S.mat = 7; }); await p.waitForTimeout(200);
    for (let i = 0; i < 6; i++) { await p.evaluate(() => { const x = [...document.querySelectorAll('#eventModal button')].find((b) => /no more tips/i.test(b.textContent)); if (x) x.click(); }); await Q.clearCards(p); await p.waitForTimeout(400); }
    const meas = () => p.evaluate(() => { const ib = document.getElementById('ib'), r = (e) => e.getBoundingClientRect(), ip = r(document.getElementById('infoPanel'));
      return { ws: !!ib.querySelector('.phWs'), on: (ib.querySelector('.phSeg .on') || {}).textContent, secs: [...ib.querySelectorAll('.phWs .phSec')].map((e) => e.textContent), txt: ib.textContent,
        rows: [...ib.querySelectorAll('.phWs .phR')].filter((e) => e.offsetHeight).map((e) => { const q = r(e); return { h: q.height, l: q.left, r: q.right }; }),
        btns: [...ib.querySelectorAll('.phWs .phMini')].map((e) => { const q = r(e); return { h: q.height, r: q.right, go: e.classList.contains('go'), res: e.dataset.res || '', cr: e.dataset.craft || '' }; }),
        dtHidden: [...ib.querySelectorAll('.phWs small.dt')].every((e) => e.offsetHeight === 0), W: innerWidth, ip: { l: ip.left, r: ip.right } }; });
    const fits = (m) => m.rows.every((x) => x.h >= 44 && x.l >= m.ip.l - 1 && x.r <= m.ip.r + 1) && m.btns.every((x) => x.h >= 44 && x.r <= m.ip.r + 1);
    // Details
    await p.evaluate(() => ZH.showBuildingInfo(window.__ws, 'details')); await p.waitForTimeout(300); let m = await meas();
    ok(m.ws && m.on === 'Details' && /Running cost/.test(m.txt) && /In use\s*\d+ of \d+/.test(m.txt) && /Quality/.test(m.txt) && /Appeal/.test(m.txt), 'Details: Running cost, In use n of m, Quality, Appeal');
    ok(fits(m), 'Details rows 44 px+ inside the sheet'); ok(!/Tip:/.test(m.txt), 'no tip sentence on the list');
    await p.evaluate(() => document.querySelector('#ib .bHow').click()); await p.waitForTimeout(150); ok(await p.evaluate(() => document.querySelector('#ib .phWs .phHow').offsetHeight > 0 && /bonuses/.test(document.querySelector('#ib .phWs .phHow').textContent)), 'How it works opens');
    await p.screenshot({ path: path.join(out, `ws_details_${n}.png`) });
    // Research
    await p.evaluate(() => ZH.showBuildingInfo(window.__ws, 'research')); await p.waitForTimeout(300); m = await meas();
    console.log('   research sections', m.secs.join(' | '), 'buttons', m.btns.length);
    ok(m.on === 'Research' && /Research points\D*30/.test(m.txt) && m.secs.includes('Ready to research') && m.secs.includes('Locked') === false && m.secs.includes('Done · 1'), 'Research: points, Ready, Done · 1');
    ok(m.btns.some((x) => x.go && x.res) && m.btns.some((x) => !x.go && !x.res), 'a price you can pay is lime, the rest grey'); ok(await p.evaluate(() => [...document.querySelectorAll('#ib .phMini.off')].every((b) => /Need/.test(b.closest('.trO').textContent))), 'a grey price has Need under the name');
    ok(m.dtHidden && fits(m), 'one line per row, 44 px+, inside the sheet');
    await p.screenshot({ path: path.join(out, `ws_research_${n}.png`) });
    await p.evaluate(() => { ZH.S.res = {}; ZH.showBuildingInfo(window.__ws, 'research'); }); await p.waitForTimeout(200); m = await meas();
    ok(m.secs.includes('Locked') && /Needs Bladesmithing/.test(m.txt), 'Locked: Firearms needs Bladesmithing');
    await p.evaluate(() => { ZH.S.res = { blades: true }; ZH.showBuildingInfo(window.__ws, 'research'); }); await p.waitForTimeout(200);
    await p.evaluate(() => document.querySelector('#ib .phWs .trO .tx').click()); await p.waitForTimeout(150); ok(await p.evaluate(() => document.querySelector('#ib .phWs .trO small.dt').offsetHeight > 0), 'a tap on a row shows what it does');
    if (n === 'phone') await p.screenshot({ path: path.join(out, `ws_research_open_${n}.png`) });
    const k = await p.evaluate(() => { const x = document.querySelector('#ib .phMini.go[data-res]'); const k = x.dataset.res; x.click(); return k; }); await p.waitForTimeout(300);
    ok(await p.evaluate((k) => ZH.S.res[k] === true && document.querySelector('#ib .phSeg .on').textContent === 'Research', k), 'the price button researches it');
    // Craft
    await p.evaluate(() => { ZH.S.mat = 9; ZH.showBuildingInfo(window.__ws, 'craft'); }); await p.waitForTimeout(400); m = await meas();
    console.log('   craft sections', m.secs.join(' | '), 'buttons', m.btns.length);
    ok(m.on === 'Craft' && m.secs.includes('Blades') && m.btns.length >= 9 && /Scrap\D*9/.test(m.txt), 'Craft: a Blades section, one row per item, Scrap');
    ok(await p.evaluate(() => [...document.querySelectorAll('#ib .phWs .trO')].every((r) => r.querySelector('.th svg, .th img'))), 'every item has its picture');
    ok(m.btns.some((x) => x.go && x.cr) && m.btns.some((x) => !x.go) && m.dtHidden && fits(m), 'lime when it can be paid, grey when not; one line; 44 px+');
    await p.screenshot({ path: path.join(out, `ws_craft_${n}.png`) });
    const id = await p.evaluate(() => { const x = document.querySelector('#ib .phMini.go[data-craft]'); x.click(); return x.dataset.craft; }); await p.waitForTimeout(300);
    ok(await p.evaluate((id) => (ZH.S.inv || {})[id] >= 1 && ZH.S.mat === 0, id), 'the price button crafts it into the stash');
    await p.evaluate(() => { ZH.S.res = {}; ZH.showBuildingInfo(window.__ws, 'craft'); }); await p.waitForTimeout(200);
    ok(await p.evaluate(() => /Research a set first/.test(document.getElementById('ib').textContent) && !!document.querySelector('#ib .phWs [data-tab="research"]')), 'nothing researched: one row that goes to Research');
    if (n === 'phone') { await p.evaluate(() => { ZH.OPTS.look = 'glass'; document.documentElement.classList.remove('phone'); ZH.S.res = { blades: true }; ZH.showBuildingInfo(window.__ws, 'research'); }); await p.waitForTimeout(300);
      ok(await p.evaluate(() => !document.querySelector('#ib .phWs') && !!document.querySelector('#ib .card')), 'look off: the old tabs'); }
    ok(!(p.errs || []).length, 'no page errors ' + JSON.stringify(p.errs || [])); await p.close(); }
  await b.close(); console.log(bad ? `FAILED (${bad})` : 'PASS'); process.exit(bad ? 1 : 0); })();
