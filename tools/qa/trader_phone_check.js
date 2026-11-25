// tools/qa/trader_phone_check.js [tag] — UI chat, 3D.369 (W249, W270). In the phone look the trader is like a shop app: Buy / Swap as a segmented
// control; Leaves 19:00 (and Your price −N% with a discount); For sale: one row per offer, its picture, name and the price on a button (lime when
// you can pay, grey with "Need ..." under the name when you can't); a tap on the row shows the details, a tap on the price buys it (the row says
// Sold); Swap: one row per swap with "N left" and a Swap button, done 3 times then "Done"; How it works opens the rules. With the look off, the old one.
const Q = require('./lib'); const path = require('path'); const out = path.join(__dirname, '../../runs/ui_samples'); const TAG = process.argv[2] || ''; let bad = 0; const ok = (c, m) => { if (!c) { bad++; console.log('  FAIL ' + m); } };
(async () => { const b = await Q.launch();
  for (const [n, w, h] of [['phone', 390, 844], ['phoneN', 320, 568], ['phoneL', 430, 932]]) { console.log(n);
    const p = await Q.page(b, { w, h, look: '', expose: 'showTrader,traderArrive' }); await Q.newGame(p);
    for (let i = 0; i < 6; i++) { await p.evaluate(() => { const x = [...document.querySelectorAll('#eventModal button')].find((b) => /no more tips/i.test(b.textContent)); if (x) x.click(); }); await Q.clearCards(p); await p.waitForTimeout(500); }
    if (TAG) ok(await p.evaluate(() => ZH.BUILD_TAG) === TAG, 'build tag is ' + TAG);
    await p.evaluate(() => { const S = ZH.S; S.day = 6; S.introOff = true; ZH.traderArrive(); S.mat = 60; S.food = 40; S.water = 40; S.wood = 20;
      S.trader.stock[0].cost = { mat: 999 }; ZH.showTrader(); }); await p.waitForTimeout(500);
    const m = await p.evaluate(() => { const ib = document.getElementById('ib'), r = (e) => e.getBoundingClientRect(); return { t: !!ib.querySelector('.phTrade'), title: document.getElementById('it').textContent,
      seg: [...ib.querySelectorAll('.phSeg button')].map((e) => e.textContent), leaves: /Leaves\s*19:00/.test(ib.textContent), n: ib.querySelectorAll('.trO').length, stock: ZH.S.trader.stock.length,
      rows: [...ib.querySelectorAll('.phR')].map((e) => { const q = r(e); return { h: q.height, l: q.left, r: q.right }; }), btns: [...ib.querySelectorAll('[data-buy]')].map((e) => { const q = r(e); return { h: q.height, r: q.right, go: e.classList.contains('go') }; }),
      need: !!ib.querySelector('.trO[data-tr="0"] small.bad'), first: ib.querySelector('[data-buy="0"]').classList.contains('off'), dtHidden: [...ib.querySelectorAll('small.dt')].every((e) => e.offsetHeight === 0), W: innerWidth }; });
    console.log('   offers', m.n, 'buttons', m.btns.length);
    ok(m.t && m.title === 'Trader' && m.seg.join() === 'Buy,Swap' && m.leaves, 'Trader, Buy / Swap, Leaves 19:00'); ok(m.n === m.stock, 'one row per offer');
    ok(m.rows.every((x) => x.h >= 44 && x.l >= 0 && x.r <= m.W + .5) && m.btns.every((x) => x.h >= 44 && x.r <= m.W + .5), 'rows and buttons 44 px+, on the screen');
    ok(m.first && m.need && m.btns.slice(1).some((x) => x.go), 'a price you cannot pay is grey with Need under it; the rest lime'); ok(m.dtHidden, 'no details on the list');
    await p.screenshot({ path: path.join(out, `trader_phone_${n}.png`) });
    await p.evaluate(() => document.querySelector('#ib .trO[data-tr="1"] .tx').click()); await p.waitForTimeout(150); ok(await p.evaluate(() => document.querySelector('#ib .trO[data-tr="1"] small.dt').offsetHeight > 0), 'a tap on the row shows its details');
    if (n === 'phone') await p.screenshot({ path: path.join(out, `trader_phone_open_${n}.png`) });
    const before = await p.evaluate(() => ZH.S.mat + ZH.S.food + ZH.S.water);
    await p.evaluate(() => document.querySelector('#ib [data-buy="1"]').click()); await p.waitForTimeout(300);
    ok(await p.evaluate((b) => ZH.S.trader.stock[1].sold && ZH.S.mat + ZH.S.food + ZH.S.water < b && /Sold/.test(document.querySelector('#ib .trO[data-tr="1"]').textContent) && !document.querySelector('#ib [data-buy="1"]'), before), 'the price button buys it; the row says Sold');
    await p.evaluate(() => document.querySelector('#ib [data-tt="swap"]').click()); await p.waitForTimeout(300);
    const s = await p.evaluate(() => ({ rows: document.querySelectorAll('#ib .trS').length, left: (document.querySelector('#ib .trS .v') || {}).textContent, on: (document.querySelector('#ib .phSeg .on') || {}).textContent }));
    ok(s.on === 'Swap' && s.rows === 5 && s.left === '3 left', 'Swap: one row per swap, 3 left');
    if (n === 'phone') await p.screenshot({ path: path.join(out, `trader_swap_${n}.png`) });
    for (let i = 0; i < 3; i++) { await p.evaluate(() => document.querySelector('#ib [data-trade="2"]').click()); await p.waitForTimeout(200); }
    ok(await p.evaluate(() => { const r = document.querySelectorAll('#ib .trS')[2]; return /Done/.test(r.textContent) && !r.querySelector('[data-trade]') && ZH.S.trader.ex[2] === 3; }), 'a swap done 3 times says Done');
    await p.evaluate(() => document.getElementById('trHow').click()); await p.waitForTimeout(150); ok(await p.evaluate(() => /Charisma/.test(document.querySelector('#ib .phHow').textContent) && document.querySelector('#ib .phHow').offsetHeight > 0), 'How it works opens the rules');
    await p.evaluate(() => document.querySelector('#ib [data-tt="buy"]').click()); await p.waitForTimeout(200);
    if (n === 'phone') { await p.evaluate(() => { ZH.OPTS.look = 'glass'; document.documentElement.classList.remove('phone'); ZH.showTrader(); }); await p.waitForTimeout(400); ok(await p.evaluate(() => !document.querySelector('#ib .phTrade') && /WANDERING TRADER/.test(document.getElementById('it').textContent)), 'look off: the old trader'); }
    ok(!(p.errs || []).length, 'no page errors ' + JSON.stringify(p.errs || [])); await p.close(); }
  await b.close(); console.log(bad ? `FAILED (${bad})` : 'PASS'); process.exit(bad ? 1 : 0); })();
