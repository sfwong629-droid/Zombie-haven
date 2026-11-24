// tools/qa/phone_placed_check.js — UI chat, 3D.345 (W249). A placed building's page in the phone look: the picture and what it is doing, the tabs as a
// segmented control, grouped lists (Condition with Health as a bar and a count, never a percentage; Worker; Manage), Repair when hurt, Move starts
// moving, Details switches and switches back; the old page with the look off. Usage: node tools/qa/phone_placed_check.js [sizes] [tag]
const Q = require('./lib'); const path = require('path'); const out = path.join(__dirname, '../../runs/ui_samples');
const sizes = (process.argv[2] || 'phone:390x844,phoneN:320x568,phoneL:430x932').split(',').map((s) => { const [n, d] = s.split(':'), [w, h] = d.split('x').map(Number); return { n, w, h }; });
const TAG = process.argv[3] || ''; let bad = 0; const ok = (c, m) => { if (!c) { bad++; console.log('  FAIL ' + m); } };
(async () => {
  const b = await Q.launch();
  for (const z of sizes) {
    console.log(z.n, z.w + 'x' + z.h);
    const p = await Q.page(b, { w: z.w, h: z.h, look: '', expose: 'showBuildingInfo,world,BUILD_TAG,OPTS,DEFS,S,Wd,pushUnitsOut,autoStaff' }); await Q.newGame(p); await Q.clearCards(p); await p.waitForTimeout(2000); await Q.clearCards(p);
    if (TAG) ok(await p.evaluate(() => ZH.BUILD_TAG) === TAG, 'build tag is ' + TAG);
    await p.evaluate(() => { const t = 'farm', W = ZH.world, D = ZH.Wd.DEFS[t], B = ZH.Wd.BUILD; for (let y = B.y0; y <= B.y1; y++) for (let x = B.x0; x <= B.x1; x++) if (ZH.Wd.placementCheck(W, x, y, D, null).ok) { const b = { type: t, x, y, w: D.w, h: D.h, q: D.q, a: D.a, staff: null }; W.buildings.push(b); ZH.Wd.bump(W); ZH.pushUnitsOut(b); ZH.autoStaff(); return true; } return false; }); await p.waitForTimeout(600);
    const types = await p.evaluate(() => ZH.world.buildings.map((x) => x.type + (ZH.DEFS[x.type].slot ? ':slot' : '') + (x.staff ? ':staff' : '')));
    const open = (pick, hurt) => p.evaluate(([pick, hurt]) => { const bs = ZH.world.buildings, x = pick === 'slot' ? (bs.find((q) => ZH.DEFS[q.type].slot && q.staff) || bs.find((q) => ZH.DEFS[q.type].slot)) : bs.find((q) => ZH.DEFS[q.type].role === 'hq'); if (!x) return null; if (hurt) x.hp = Math.max(1, Math.round(x.max * .4)); ZH.showBuildingInfo(x, 'overview'); return x.type; }, [pick, hurt]);
    const read = () => p.evaluate(() => { const r = (e) => { const q = e.getBoundingClientRect(); return { x: q.left, r: q.right, w: q.width, h: q.height }; }, ip = r(document.getElementById('infoPanel')), ib = document.getElementById('ib'), hb = ib.querySelector('.phBar');
      return { hero: !!ib.querySelector('.phHero img'), stat: (ib.querySelector('.phStat') || {}).textContent || '', seg: [...ib.querySelectorAll('.phSeg button')].map((e) => ({ ...r(e), t: e.textContent, on: e.classList.contains('on') })), secs: [...ib.querySelectorAll('.phSec')].map((e) => e.textContent), rows: [...ib.querySelectorAll('.phR')].map((e) => ({ ...r(e), t: e.textContent, id: e.id })),
        hp: hb ? hb.textContent : '', ip, btns: [...ib.querySelectorAll('button')].filter((e) => e.offsetParent).map((e) => ({ ...r(e), t: e.textContent, id: e.id })), sw: ib.scrollWidth - ib.clientWidth, old: !!ib.querySelector('.tabs') }; });
    const t0 = await open('hq'); await p.waitForTimeout(500); await Q.clearCards(p); let m = await read();
    ok(m.hero && m.stat.length > 2 && !m.old, t0 + ': the picture and what it is doing, no old tab bar'); ok(m.seg.length >= 2 && m.seg[0].on && m.seg.every((x) => x.h >= 44), 'tabs as a segmented control, 44 px');
    ok(m.secs.includes('Condition') && m.secs.includes('Manage'), 'sections Condition and Manage (' + m.secs + ')'); ok(/Health\s*\d+ of \d+/.test(m.hp) && !/%/.test(m.hp), 'Health is a bar with a count, no percentage (' + m.hp + ')');
    ok(m.rows.every((x) => x.h >= 44 && x.x >= m.ip.x && x.r <= m.ip.r + 1) && m.btns.every((x) => x.h >= 44 && x.r <= m.ip.r + 1) && m.sw <= 1, 'rows and buttons 44 px+ and inside the sheet ' + JSON.stringify(m.btns.filter((x) => x.h < 44).map((x) => x.t + ' ' + Math.round(x.h))));
    await p.screenshot({ path: path.join(out, `phone_placed_${z.n}_hq.png`) });
    await p.evaluate(() => document.querySelector('#ib .phSeg [data-tab="details"]').click()); await p.waitForTimeout(300); ok(await p.evaluate(() => document.querySelector('#ib .phSeg .on').dataset.tab === 'details' && /Running cost/.test(document.getElementById('ib').textContent)), 'Details opens');
    await p.evaluate(() => document.querySelector('#ib .phSeg [data-tab="overview"]').click()); await p.waitForTimeout(300); ok(await p.evaluate(() => !!document.querySelector('#ib #bMove')), 'and Info comes back');
    const t1 = await open('slot', true); await p.waitForTimeout(500); await Q.clearCards(p); m = await read();
    if (t1) { ok(m.secs.includes('Worker') && m.rows.some((x) => x.id === 'bAssign') && m.rows.some((x) => x.id === 'bWp'), t1 + ': a Worker section with Assign and All workplaces'); ok(m.btns.some((x) => x.id === 'bFix' && x.w > m.ip.w * .7), 'hurt: a wide Repair now button');
      ok(m.rows.every((x) => x.h >= 44 && x.r <= m.ip.r + 1) && m.btns.every((x) => x.h >= 44 && x.r <= m.ip.r + 1) && m.sw <= 1, 'rows and buttons 44 px+ and inside the sheet ' + JSON.stringify(m.btns.filter((x) => x.h < 44).map((x) => x.t + ' ' + Math.round(x.h)))); await p.screenshot({ path: path.join(out, `phone_placed_${z.n}_work.png`) });
      await p.evaluate(() => document.getElementById('ib').scrollTo(0, 9999)); await p.waitForTimeout(200); await p.screenshot({ path: path.join(out, `phone_placed_${z.n}_work2.png`) });
      ok(m.secs.includes('Crop') && m.rows.some((x) => x.id === 'bHerbs'), 'a Garden Plot has a Crop section with the herbs switch'); await p.evaluate(() => document.getElementById('bHerbs').click()); await p.waitForTimeout(400); ok(await p.evaluate(() => /Herbs/.test(document.querySelector('#ib #bHerbs').parentNode.textContent)), 'the switch changes the crop to herbs'); await p.evaluate(() => document.getElementById('bHerbs').click()); await p.waitForTimeout(300);
      await p.evaluate(() => document.getElementById('bAssign').click()); await p.waitForTimeout(400); ok(await p.evaluate(() => document.getElementById('infoPanel').classList.contains('show') && !document.querySelector('#ib #bAssign')), 'Assign opens the worker list'); } else console.log('  (no workplace in a new town: ' + types.join(',') + ')');
    await open('hq'); await p.waitForTimeout(300); await Q.clearCards(p); await p.evaluate(() => document.getElementById('bMove').click()); await p.waitForTimeout(500); ok(await p.evaluate(() => !document.getElementById('infoPanel').classList.contains('show')), 'Move closes the sheet to move the building');
    await p.evaluate(() => { ZH.OPTS.look = 'glass'; document.documentElement.classList.remove('phone'); ZH.showBuildingInfo(ZH.world.buildings[0], 'overview'); }); await p.waitForTimeout(400); m = await read(); ok(m.old && !m.hero, 'look off: the old page');
    ok(!(p.errs || []).length, 'no page errors ' + JSON.stringify(p.errs || [])); await p.close();
  }
  await b.close(); console.log(bad ? `FAILED (${bad})` : 'PASS'); process.exit(bad ? 1 : 0);
})();
