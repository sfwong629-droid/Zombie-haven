// tools/qa/away_check.js — UI chat, 3D.385 (W249, fun idea 9: While you were away). At three phone sizes, in the phone look:
//  - coming back after 3 real hours (awayCredit) opens the report card in the middle of the screen, inside it, "While you were away",
//    "Back after 3 h", "18 h of shifts kept";
//  - what waits in the trays shows as signs and numbers; a building job finished and the squad out show as rows;
//  - the joke is last; two buttons side by side, Collect all lime, Later plain, both 44 px or more;
//  - Collect all empties every tray and the stock goes up; Later leaves the trays;
//  - the old look shows the old one-line card. Pictures: runs/ui_samples/away_<size>.png.
const Q = require('./lib'); const path = require('path'); const out = path.join(__dirname, '../../runs/ui_samples');
let bad = 0; const ok = (c, m) => { if (!c) { bad++; console.log('  FAIL ' + m); } };
const clear = async (p) => { for (let k = 0; k < 8; k++) { await p.evaluate(() => { try { ZH.S.introOff = true; } catch (e) {} const x = document.querySelector('#eventModal button:not(.tipMb)'); if (x) x.click(); }); await Q.clearCards(p); await p.waitForTimeout(150); } };
const card = (p) => p.evaluate(() => { const b = document.querySelector('#eventModal .rpBox'); if (!b) return null; const r = b.getBoundingClientRect(); const bt = [...b.querySelectorAll('.rpBtns button')].map((x) => { const q = x.getBoundingClientRect(); return { t: x.textContent.trim(), rec: x.classList.contains('go'), w: q.width, h: q.height, y: q.y }; });
  return { x: r.x, y: r.y, r: r.right, b: r.bottom, vw: innerWidth, vh: innerHeight, text: b.innerText, last: (b.querySelector('.rpQ') || {}).textContent || '', trays: b.querySelectorAll('.rpSt > span').length, bt }; });
(async () => { const b = await Q.launch();
  for (const [n, w, h] of [['phone', 390, 844], ['phoneN', 320, 568], ['phoneXL', 430, 932]]) {
    const p = await Q.page(b, { w, h, look: '', expose: 'BUILD_TAG, DEFS, awayCredit, awayReport, world, trayAdd, OPTS, saveOpts, applyLook' });
    await Q.newGame(p); await clear(p); await p.waitForTimeout(400);
    if (n === 'phone') ok(+String(await p.evaluate(() => ZH.BUILD_TAG)).split('.')[1] >= 385, 'build before 3D.385');
    /* a staffed-looking tray: put food and water straight into two buildings' trays, as the away hours would */
    const setup = () => p.evaluate(() => { const bs = ZH.world.buildings.filter((q) => !(ZH.DEFS[q.type] || {}).out).slice(0, 2);   /* buildings that make nothing, so the game's own ticks leave their trays alone */ bs.forEach((q, i) => { q.bonus = 0; ZH.trayAdd(q, i ? 'mat' : 'food', 6); }); return { food: ZH.S.food, water: ZH.S.mat, trays: bs.map((q) => q.bonus || 0) }; });
    const s0 = await setup(); ok(s0.trays.every((v) => v >= 1), `${n}: could not fill the test trays (${s0.trays})`);
    await p.evaluate(() => { const hadTrip = ZH.S.trip; ZH.S.trip = { fake: 1 }; ZH.awayReport(3 * 36e5, 18, { food: 6, mat: 6 }, 1, 0); delete ZH.S.trip; }); await p.waitForTimeout(500);
    const c = await card(p); ok(!!c, `${n}: no report card`); if (!c) { await p.close(); continue; }
    await p.screenshot({ path: path.join(out, `away_${n}.png`) });
    ok(c.x >= 0 && c.r <= c.vw + .5 && c.y >= 0 && c.b <= c.vh + .5, `${n}: the card leaves the screen`);
    ok(Math.abs((c.x + c.r) / 2 - c.vw / 2) < 2, `${n}: the card is not centred`);
    ok(/While you were away/i.test(c.text) && /Back after 3 h/.test(c.text) && /18 h\s*of shifts kept/.test(c.text), `${n}: the words: ${c.text.slice(0, 80)}`);
    ok(c.trays === 2 && /\+6/.test(c.text), `${n}: the trays row shows ${c.trays} signs`);
    ok(/Built/.test(c.text) && /Squad still out/.test(c.text), `${n}: the built and squad rows are missing`);
    ok(c.last.length > 5 && c.text.trim().split('\n').slice(-3).join(' ').includes(c.last.trim()), `${n}: the joke is not last`);
    ok(c.bt.length === 2 && c.bt[0].t === 'Collect all' && c.bt[0].rec && !c.bt[1].rec && c.bt[1].t === 'Later', `${n}: buttons ${JSON.stringify(c.bt.map((x) => x.t + (x.rec ? '*' : '')))}`);
    ok(c.bt.every((x) => x.h >= 43.5 && x.w >= 43.5) && Math.abs(c.bt[0].y - c.bt[1].y) < 1, `${n}: the buttons are not side by side and 44 px`);
    await p.click('#eventModal .rpBtns button.go'); await p.waitForTimeout(400);
    const s1 = await p.evaluate(() => ({ food: ZH.S.food, water: ZH.S.mat, trays: ZH.world.buildings.filter((q) => !(ZH.DEFS[q.type] || {}).out).slice(0, 2).map((q) => q.bonus || 0), open: !!document.querySelector('#eventModal .rpBox') }));
    ok(!s1.open && s1.trays.every((v) => v < 1) && s1.food > s0.food, `${n}: Collect all: trays ${s1.trays}, food ${s0.food}→${s1.food}, scrap ${s0.water}→${s1.water}`);
    if (n === 'phone') {
      await setup(); await p.evaluate(() => ZH.awayReport(20 * 6e4, 2, { food: 6 }, 0, 0)); await p.waitForTimeout(400);
      ok(/Back after 20 min/.test((await card(p)).text), 'phone: minutes are not shown under an hour');
      await p.click('#eventModal .rpBtns button:not(.go)'); await p.waitForTimeout(300);
      ok((await p.evaluate(() => ZH.world.buildings.filter((q) => !(ZH.DEFS[q.type] || {}).out)[0].bonus || 0)) >= 1, 'phone: Later emptied the trays');
      /* the real path: three hours away */
      await p.evaluate(() => ZH.awayCredit(3 * 36e5)); await p.waitForTimeout(500); const r = await card(p);
      ok(!!r && /Back after 3 h/.test(r.text), 'phone: awayCredit did not open the report');
      await clear(p);
      await p.evaluate(() => { ZH.OPTS.look = 'glass'; ZH.saveOpts(); ZH.applyLook(); ZH.world.buildings[0].bonus = 0; ZH.trayAdd(ZH.world.buildings[0], 'food', 6); ZH.awayCredit(3 * 36e5); }); await p.waitForTimeout(500);
      ok(!(await card(p)), 'look off: the phone report showed');
    }
    console.log(`${n} ${w}x${h}: card ${Math.round(c.r - c.x)}x${Math.round(c.b - c.y)}`);
    await p.close(); }
  await b.close(); console.log(bad ? `FAILED: ${bad}` : 'OK: While you were away at 3 sizes'); process.exit(bad ? 1 : 0); })();
