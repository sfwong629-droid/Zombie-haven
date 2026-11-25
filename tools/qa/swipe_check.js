// tools/qa/swipe_check.js [tag] — UI chat, 3D.378 (W249). People rows slide left for quick actions in the phone look, on three phone sizes:
//  - the first time People opens, the first row slides a little and back (a hint), once;
//  - the buttons are off the row until it is dragged; a short drag springs back; a drag left opens Find and Job (76 px wide, 44 px+ tall, inside the sheet);
//  - one row open at a time; a tap elsewhere in the list closes it and does not open the person;
//  - Find closes the menu and picks the person; Job opens their page on Job with "‹ People" back;
//  - someone down also gets Rescue and Bandage; Bandage uses a cloth;
//  - the rows still scroll the list up and down (touch-action pan-y), search still hides rows, a plain tap still opens the person.
const Q = require('./lib'); const path = require('path'); const out = path.join(__dirname, '../../runs/ui_samples'); const TAG = process.argv[2] || ''; let bad = 0; const ok = (c, m) => { if (!c) { bad++; console.log('  FAIL ' + m); } };
(async () => { const b = await Q.launch();
  for (const [n, w, h] of [['phone', 390, 844], ['phoneN', 320, 568], ['phoneL', 430, 932]]) { console.log(n);
    const p = await Q.page(b, { w, h, look: '', expose: 'showSurvivors,S,OPTS' }); await Q.newGame(p); await Q.clearCards(p); await p.waitForTimeout(1500);
    for (let i = 0; i < 5; i++) { await p.evaluate(() => { const x = [...document.querySelectorAll('#eventModal button')].find((b) => /no more tips/i.test(b.textContent)); if (x) x.click(); }); await Q.clearCards(p); await p.waitForTimeout(300); }
    if (TAG) ok(await p.evaluate(() => ZH.BUILD_TAG) === TAG, 'build tag is ' + TAG);
    const hint = await p.evaluate(() => new Promise((res) => { ZH.S.introOff = true; ZH.S.cloth = 3; ZH.showSurvivors(); const t = document.querySelector('#ib .phSwT'); let seen = false;
      new MutationObserver(() => { if (/translateX\(-\d/.test(t.style.transform)) seen = true; else if (seen) res({ seen, back: true, opt: ZH.OPTS.swHint }); }).observe(t, { attributes: true }); setTimeout(() => res({ seen, back: false, opt: ZH.OPTS.swHint }), 6000); }));
    ok(hint.seen && hint.opt, 'the first time: the first row slides a little as a hint'); ok(hint.back, 'and slides back');
    await p.evaluate(() => ZH.showSurvivors()); await p.waitForTimeout(1500); ok(await p.evaluate(() => !document.querySelector('#ib .phSwT').style.transform), 'only once');
    const rowBox = (i) => p.evaluate((i) => { const r = document.querySelectorAll('#ib .phSw')[i].getBoundingClientRect(); return { x: r.left, y: r.top, w: r.width, h: r.height }; }, i);
    const drag = async (i, dx) => { const r = await rowBox(i); const y = r.y + r.h / 2, x = r.x + r.w * .7; await p.mouse.move(x, y); await p.mouse.down(); for (let k = 1; k <= 3; k++) await p.mouse.move(x + dx * k / 3, y + 1); await p.mouse.up(); await p.waitForTimeout(400); };
    const state = () => p.evaluate(() => { const ip = document.getElementById('infoPanel').getBoundingClientRect(); return [...document.querySelectorAll('#ib .phSw')].map((w) => ({ open: w.classList.contains('open'),
      btns: [...w.querySelectorAll('.phSwB')].map((b) => { const r = b.getBoundingClientRect(); return { t: b.textContent, w: r.width, h: r.height, l: r.left, r: r.right, in: r.left >= ip.left - 1 && r.right <= ip.right + 1 }; }) })); });
    ok(await p.evaluate(() => [...document.querySelectorAll('#ib .phSw')].every((w) => Math.abs(w.querySelector('.phRow').getBoundingClientRect().right - w.getBoundingClientRect().right) < 1)), 'every row fits its place (the chevron shows)');
    let s = await state(); ok(s.length >= 2 && s.every((x) => !x.open && x.btns.every((b) => !b.in)), 'buttons hidden until a drag');
    ok(await p.evaluate(() => getComputedStyle(document.querySelector('#ib .phSwT')).touchAction === 'pan-y'), 'rows still scroll the list up and down');
    await drag(0, -30); s = await state(); ok(!s[0].open && s[0].btns.every((b) => !b.in), 'a short drag springs back');
    await drag(0, -170); s = await state(); ok(s[0].open && s[0].btns.map((b) => b.t).join() === 'Find,Job' && s[0].btns.every((b) => b.in && b.h >= 44 && b.w >= 60), 'a drag left opens Find and Job, inside the sheet, 44 px+');
    if (n === 'phone') await p.screenshot({ path: path.join(out, `swipe_open_${n}.png`) });
    await drag(1, -170); s = await state(); ok(!s[0].open && s[1].open, 'one row open at a time');
    const title = () => p.evaluate(() => document.getElementById('it').textContent);
    const r2 = await rowBox(0); await p.mouse.click(r2.x + 60, r2.y + r2.h / 2); await p.waitForTimeout(400); s = await state();
    ok(!s.some((x) => x.open) && await title() === 'People', 'a tap elsewhere closes it and does not open the person');
    await drag(0, -170); const who = await p.evaluate(() => +document.querySelector('#ib .phSw').dataset.swid);
    await p.evaluate(() => document.querySelector('#ib .phSw [data-swa="find"]').click()); await p.waitForTimeout(400);
    ok(await p.evaluate((id) => !document.getElementById('infoPanel').classList.contains('show') && ZH.S.sv.find((q) => q.id === id) && document.body, who), 'Find closes the menu');
    await p.evaluate(() => ZH.showSurvivors()); await p.waitForTimeout(400); await drag(0, -170);
    await p.evaluate(() => document.querySelector('#ib .phSw [data-swa="job"]').click()); await p.waitForTimeout(500);
    ok(await p.evaluate(() => { const on = document.querySelector('#ib .phActs .on'); return on && /Job/.test(on.textContent) && document.getElementById('pBack').dataset.t === 'People'; }), 'Job opens their page on Job with ‹ People back');
    await p.evaluate(() => { const q = ZH.S.sv[0]; q.mode = 'down'; q.bleed = 3600; q.hp = 0; ZH.showSurvivors(); }); await p.waitForTimeout(400);
    const dn = await p.evaluate(() => { const w = document.querySelector(`#ib .phSw[data-swid="${ZH.S.sv[0].id}"]`); return w ? [...w.querySelectorAll('.phSwB')].map((b) => b.textContent).join() : ''; });
    ok(dn === 'Rescue,Bandage,Find,Job', 'someone down: Rescue, Bandage, Find, Job (' + dn + ')');
    { const w = await p.evaluate(() => { const x = document.querySelector(`#ib .phSw[data-swid="${ZH.S.sv[0].id}"]`); x.querySelector('.phSwT').style.transition = 'none'; x.querySelector('.phSwT').style.transform = `translateX(${-x.querySelector('.phSwA').offsetWidth}px)`; const r = x.getBoundingClientRect(); return [...x.querySelectorAll('.phSwB')].map((b) => { const q = b.getBoundingClientRect(); return q.left >= r.left - .5 && q.right <= r.right + .5 && q.width >= 60; }); });
      ok(w.every(Boolean), 'all four buttons fit the row when open, 60 px+ wide ' + JSON.stringify(w)); await p.evaluate(() => ZH.showSurvivors()); await p.waitForTimeout(300); }
    await p.evaluate(() => document.querySelector(`#ib .phSw[data-swid="${ZH.S.sv[0].id}"] [data-swa="bandage"]`).click()); await p.waitForTimeout(400);
    ok(await p.evaluate(() => ZH.S.cloth === 2 && document.getElementById('it').textContent === 'People'), 'Bandage uses a cloth and stays on People');
    await p.evaluate(() => { const q = ZH.S.sv[0]; q.mode = 'idle'; q.hp = q.max; ZH.showSurvivors(); }); await p.waitForTimeout(400);
    await p.fill('#pplQ', ZH_NAME = await p.evaluate(() => ZH.S.sv[1].name.toLowerCase())); await p.waitForTimeout(200);
    ok(await p.evaluate(() => [...document.querySelectorAll('#ib .phSw')].filter((w) => w.offsetParent).length >= 1 && [...document.querySelectorAll('#ib .phSw')].filter((w) => w.offsetParent).every((w) => w.querySelector('.phRow').dataset.n.includes(ZH.S.sv[1].name.toLowerCase()))), 'search hides the other rows');
    await p.fill('#pplQ', ''); await p.waitForTimeout(200); const r3 = await rowBox(0); await p.mouse.click(r3.x + 60, r3.y + r3.h / 2); await p.waitForTimeout(500);
    ok(await p.evaluate(() => document.getElementById('pBack').dataset.t === 'People' && !!document.querySelector('#ib .phActs')), 'a plain tap still opens the person');
    ok(!(p.errs || []).length, 'no page errors ' + JSON.stringify(p.errs || [])); await p.close(); }
  await b.close(); console.log(bad ? `FAILED (${bad})` : 'PASS'); process.exit(bad ? 1 : 0); })();
let ZH_NAME;
