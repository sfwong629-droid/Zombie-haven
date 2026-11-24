// tools/qa/phone_build_check.js — UI chat, 3D.341 (W249, layout B). Build in the phone look: search, a row of chips (For your mission + six categories that
// hold everything the old tabs held), a grid of big pictures (the mission's building ringed, locked ones last), the Manage list, a tile → the building's
// page → back to the same chip, search results, and the old tabbed grid with the look off. Usage: node tools/qa/phone_build_check.js [sizes] [tag]
const Q = require('./lib'); const path = require('path'); const out = path.join(__dirname, '../../runs/ui_samples');
const sizes = (process.argv[2] || 'phone:390x844,phoneN:320x568,phoneL:430x932').split(',').map((s) => { const [n, d] = s.split(':'), [w, h] = d.split('x').map(Number); return { n, w, h }; });
const TAG = process.argv[3] || ''; let bad = 0; const ok = (c, m) => { if (!c) { bad++; console.log('  FAIL ' + m); } };
(async () => {
  const b = await Q.launch();
  for (const z of sizes) {
    console.log(z.n, z.w + 'x' + z.h);
    const p = await Q.page(b, { w: z.w, h: z.h, look: '', expose: 'showBuild,showBuildPhone,BFOLD,BCAT,BUILD_TAG,OPTS,sel' }); await Q.newGame(p); await Q.clearCards(p); await p.waitForTimeout(2000); await Q.clearCards(p);
    if (TAG) ok(await p.evaluate(() => ZH.BUILD_TAG) === TAG, 'build tag is ' + TAG);
    const cov = await p.evaluate(() => { const a = new Set(ZH.BCAT.flatMap((c) => c[2])), f = ZH.BFOLD.flatMap((c) => c[2]); return { missing: [...a].filter((k) => !f.includes(k)), extra: f.filter((k) => !a.has(k)), dup: f.filter((k, i) => f.indexOf(k) !== i) }; });
    ok(!cov.missing.length && !cov.extra.length && !cov.dup.length, 'the categories hold exactly what the old tabs hold ' + JSON.stringify(cov));
    await p.evaluate(() => ZH.showBuild()); await p.waitForTimeout(800); await Q.clearCards(p);
    const read = () => p.evaluate(() => { const r = (e) => { const q = e.getBoundingClientRect(); return { x: q.left, y: q.top, w: q.width, h: q.height, r: q.right }; }, ip = r(document.getElementById('infoPanel'));
      return { ip, title: document.getElementById('it').textContent, qh: document.querySelector('.phSearch') ? r(document.querySelector('.phSearch')).h : 0, chips: [...document.querySelectorAll('.phChips button')].map((e) => ({ ...r(e), on: e.classList.contains('on'), t: e.textContent, k: e.dataset.chip })),
        tiles: [...document.querySelectorAll('#bMain .phTile')].map((e) => ({ ...r(e), rec: e.classList.contains('rec'), lock: e.classList.contains('lock'), t: e.querySelector('b').textContent, sub: e.querySelector('small').textContent, img: !!e.querySelector('img') })),
        demo: document.getElementById('bDemo') ? r(document.getElementById('bDemo')).h : 0, hq: !!document.getElementById('bHQ'), tabs: !!document.querySelector('#ib .tabs'), sw: document.getElementById('ib').scrollWidth - document.getElementById('ib').clientWidth }; });
    const m = await read();
    ok(m.title === 'Build' && m.qh >= 44, 'title and a 44 px search field'); ok(!m.tabs, 'no tab row'); ok(m.sw <= 1, 'the sheet does not scroll sideways (' + m.sw + ')');
    ok(m.chips.every((c) => c.x >= m.ip.x && c.r <= m.ip.r + 1), 'every chip shows inside the sheet: nothing to swipe');
    ok(m.chips.length === 7 && m.chips.every((c) => c.h >= 44 && c.w >= 44) && m.chips[0].on && m.chips[0].t === 'For your mission' && m.chips.filter((c) => c.on).length === 1, 'seven chips, 44 px+, For your mission chosen (' + m.chips.map((c) => c.t) + ')');
    ok(m.tiles.length >= 1 && m.tiles.length <= 6 && m.tiles.every((t) => t.w >= 44 && t.h >= 44 && t.x >= m.ip.x && t.r <= m.ip.r + 1 && !t.lock), 'one to six open suggestions, 44 px+, inside the sheet');
    ok(m.tiles[0] && m.tiles[0].rec && m.tiles[0].t === 'Rain Barrel' && m.tiles.filter((t) => t.rec).length === 1, 'the mission\'s building (Rain Barrel) is first and the only ringed one');
    ok(m.hq && m.demo >= 44, 'Manage: the base and Demolish, 44 px+');
    await p.screenshot({ path: path.join(out, `phone_build_${z.n}_main.png`) });
    await Q.clearCards(p); await p.evaluate(() => document.querySelector('.phChips [data-chip="food"]').click()); await p.waitForTimeout(600); await Q.clearCards(p);
    const f = await read();
    ok(f.chips.find((c) => c.on).k === 'food' && f.title === 'Build', 'a chip switches the grid in place'); ok(f.tiles.length === 7 && f.tiles.every((t) => t.w >= 44 && t.h >= 44 && t.img && t.x >= f.ip.x && t.r <= f.ip.r + 1), 'Food & water: seven tiles with pictures, inside the sheet');
    const li = f.tiles.findIndex((t) => t.lock); ok(li > 0 && f.tiles.slice(li).every((t) => t.lock) && f.tiles.filter((t) => t.lock).every((t) => /Level|Fort|Lodge/.test(t.sub) && !/Needs/.test(t.sub)), 'open ones first, locked ones last with what they need');
    await p.screenshot({ path: path.join(out, `phone_build_${z.n}_food.png`) });
    await p.evaluate(() => document.querySelector('#bMain [data-b="barrel"]').click()); await p.waitForTimeout(500); ok(await p.evaluate(() => !!document.getElementById('bdGo') && document.getElementById('it').textContent === 'Rain Barrel'), 'a tile opens the building\'s page');
    await p.evaluate(() => document.getElementById('pBack').click()); await p.waitForTimeout(500); const bk = await read(); ok(bk.title === 'Build' && bk.chips.find((c) => c.on).k === 'food', 'back returns to Build on the same chip');
    await p.evaluate(() => document.querySelector('.phChips [data-chip="defend"]').click()); await p.waitForTimeout(500); await Q.clearCards(p); await p.screenshot({ path: path.join(out, `phone_build_${z.n}_defence.png`) });
    await p.evaluate(() => { const q = document.getElementById('bQ'); q.value = 'gar'; q.oninput(); }); await p.waitForTimeout(300);
    const s = await p.evaluate(() => ({ main: document.getElementById('bMain').style.display, rows: [...document.querySelectorAll('#bRes .phTile b')].map((e) => e.textContent) })); ok(s.main === 'none' && s.rows.includes('Garden Plot') && s.rows.every((t) => /gar/i.test(t)), 'search shows matches only (' + s.rows + ')');
    await p.screenshot({ path: path.join(out, `phone_build_${z.n}_search.png`) });
    await p.evaluate(() => document.querySelector('#bRes [data-b="farm"]').click()); await p.waitForTimeout(400); await p.evaluate(() => document.getElementById('bdGo').click()); await p.waitForTimeout(500);
    const pl = await p.evaluate(() => ({ shut: !document.getElementById('infoPanel').classList.contains('show'), sel: ZH.sel && (ZH.sel.type || ZH.sel.kind) })); ok(pl.shut && pl.sel, 'Build on the page starts placing ' + JSON.stringify(pl));
    await p.evaluate(() => { ZH.showBuildPhone('defend'); }); await p.waitForTimeout(500); await p.evaluate(() => document.querySelector('#ib [data-wall="wood"]').click()); await p.waitForTimeout(400); ok(await p.evaluate(() => !document.getElementById('infoPanel').classList.contains('show')), 'a wall tile starts the wall tool');
    await p.evaluate(() => { ZH.OPTS.look = 'glass'; document.documentElement.classList.remove('phone'); ZH.showBuild(); }); await p.waitForTimeout(400); ok(await p.evaluate(() => !!document.querySelector('#ib .tabs') && !!document.querySelector('#ib .bgrid')), 'look off: the old tabbed grid');
    ok(!(p.errs || []).length, 'no page errors ' + JSON.stringify(p.errs || [])); await p.close();
  }
  await b.close(); console.log(bad ? `FAILED (${bad})` : 'PASS'); process.exit(bad ? 1 : 0);
})();
