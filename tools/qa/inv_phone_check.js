// tools/qa/inv_phone_check.js [tag] — UI chat, 3D.360 (W249 "next", W270 less reading). In the phone look the Inventory is: Gear and Supplies as
// a segmented control; Gear: filter chips 44 px+, a grid six to a row with empty slots after the items, every item a picture, no sentence under it;
// Weapons shows only weapons. An item's page: the big picture, one line (rarity · slot), Give to rows 44 px+, one line each, inside the screen,
// the lime Give only on the first row and only for a gain; Give works. Supplies: eight bar rows, How it works opens. With the look off, the old one.
const Q = require('./lib'); const path = require('path'); const out = path.join(__dirname, '../../runs/ui_samples'); const TAG = process.argv[2] || ''; let bad = 0; const ok = (c, m) => { if (!c) { bad++; console.log('  FAIL ' + m); } };
(async () => { const b = await Q.launch();
  for (const [n, w, h] of [['phone', 390, 844], ['phoneN', 320, 568], ['phoneL', 430, 932]]) { console.log(n);
    const p = await Q.page(b, { w, h, look: '', expose: 'showInventory,ITEMS' }); await Q.newGame(p);
    for (let i = 0; i < 6; i++) { await p.evaluate(() => { const x = [...document.querySelectorAll('#eventModal button')].find((b) => /no more tips/i.test(b.textContent)); if (x) x.click(); }); await Q.clearCards(p); await p.waitForTimeout(500); }
    for (let i = 0; i < 40; i++) { if (await p.evaluate(() => !!(window.ZH3D && ZH3D.ready))) break; await p.waitForTimeout(500); }
    if (TAG) ok(await p.evaluate(() => ZH.BUILD_TAG) === TAG, 'build tag is ' + TAG);
    await p.evaluate(() => { const S = ZH.S; S.inv = { crowbar: 2, machete: 1, bat: 1, hoodie: 1, riot: 1, hardhat: 1, goggles: 1 }; for (const k of Object.keys(S.inv)) if (!ZH.ITEMS[k]) delete S.inv[k]; for (const q of S.sv) { q.eq = q.eq || {}; q.eq.weapon = null; } ZH.showInventory('gear'); });
    await p.waitForTimeout(1500);
    const g = await p.evaluate(() => { const ib = document.getElementById('ib'), G = ib.querySelector('.invG'), bx = G ? [...G.children] : [], it = bx.filter((x) => x.dataset.inv);
      return { phone: !!ib.querySelector('.phInv'), seg: [...ib.querySelectorAll('.phSeg button')].map((x) => x.textContent.trim()), chips: [...ib.querySelectorAll('.phChips button')].map((x) => x.offsetHeight), cols: G ? getComputedStyle(G).gridTemplateColumns.split(' ').length : 0,
        n: bx.length, items: it.length, order: bx.findIndex((x) => x.classList.contains('empty')) > bx.map((x) => !!x.dataset.inv).lastIndexOf(true), pics: it.filter((x) => x.querySelector('img,.icon svg,.icon img')).length, sm: ib.querySelectorAll('.sm').length }; });
    ok(g.phone && g.seg.join() === 'Gear,Supplies', 'Gear and Supplies segments (' + g.seg + ')'); ok(g.chips.length === 5 && g.chips.every((x) => x >= 44), 'five filter chips 44 px+');
    ok(g.cols === 6 && g.n >= 24 && g.order, 'six to a row, empty slots after the items'); ok(g.items > 0 && g.pics === g.items, 'every item a picture'); ok(g.sm === 0, 'no sentence under the grid');
    await p.screenshot({ path: path.join(out, `inv_phone_grid_${n}.png`) });
    ok(await p.evaluate(() => { document.querySelector('.phChips [data-if=weapon]').click(); return [...document.querySelectorAll('.invG [data-inv]')].every((x) => ZH.ITEMS[x.dataset.inv].slot === 'weapon'); }), 'Weapons shows only weapons');
    await p.evaluate(() => document.querySelector('.invG [data-inv=crowbar]').click()); await p.waitForTimeout(800);
    const it = await p.evaluate(() => { const ib = document.getElementById('ib'), r = (e) => e.getBoundingClientRect(); return { title: document.getElementById('it').textContent, img: !!ib.querySelector('#reStage img, #reStage .reIcon'), stat: (ib.querySelector('.phStat') || {}).textContent || '',
      rows: [...ib.querySelectorAll('[data-give]')].map((x) => { const row = x.closest('.phR'), q = r(row); return { h: q.height, l: q.left, r: q.right, two: !!row.querySelector('small'), go: x.classList.contains('go') }; }), W: innerWidth }; });
    ok(it.title === 'Crowbar' && it.img, 'the item page with its picture'); ok(/·/.test(it.stat), 'one line: rarity · slot (' + it.stat + ')');
    ok(it.rows.length > 0 && it.rows.every((x) => x.h >= 44 && x.l >= 0 && x.r <= it.W + .5 && !x.two), 'Give to rows 44 px+, one line, on the screen'); ok(it.rows.slice(1).every((x) => !x.go), 'lime Give only on the first row');
    await p.screenshot({ path: path.join(out, `inv_phone_item_${n}.png`) });
    const gv = await p.evaluate(() => { const bt = document.querySelector('[data-give]'), q = ZH.S.sv.find((v) => String(v.id) === bt.dataset.give), before = ZH.S.inv.crowbar; bt.click(); return { got: (q.eq || {}).weapon === 'crowbar', left: ZH.S.inv.crowbar, before }; });
    ok(gv.got && gv.left === gv.before - 1, 'Give: they carry it and the stash has one fewer');
    await p.evaluate(() => ZH.showInventory('sup')); await p.waitForTimeout(400);
    const s = await p.evaluate(() => ({ rows: document.querySelector('#ib .phInv > .phCard').querySelectorAll('.phBar').length, h: [...document.querySelectorAll('#ib .phBar')].every((x) => x.offsetHeight >= 44) }));
    ok(s.rows === 8 && s.h, 'Supplies: eight bar rows 44 px+ (' + s.rows + ')');
    await p.screenshot({ path: path.join(out, `inv_phone_sup_${n}.png`) });
    await p.evaluate(() => document.getElementById('invHow').click()); await p.waitForTimeout(300); ok(await p.evaluate(() => getComputedStyle(document.querySelector('#ib .phHow')).display !== 'none'), 'How it works opens');
    if (n === 'phone') { await p.evaluate(() => { ZH.OPTS.look = 'glass'; document.documentElement.classList.remove('phone'); ZH.showInventory('gear'); }); await p.waitForTimeout(400); ok(await p.evaluate(() => !document.querySelector('#ib .phInv') && !!document.querySelector('#ib .invF')), 'look off: the old screen'); }
    ok(!(p.errs || []).length, 'no page errors ' + JSON.stringify(p.errs || [])); await p.close(); }
  await b.close(); console.log(bad ? `FAILED (${bad})` : 'PASS'); process.exit(bad ? 1 : 0); })();
