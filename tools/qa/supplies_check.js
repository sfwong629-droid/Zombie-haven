// tools/qa/supplies_check.js — 3D.279 (owner, 22 Nov, W210: "do C for resource"). On two phone sizes: the bag on the resource bar shows
// one total (cloth + medicine + fuel), never "9·1·0"; ammo has no chip of its own on the bar; a dot shows on the bag only when something is
// low (here: a gunner with 3 rounds). A tap on the bag opens the supplies list under it: Cloth, Medicine, Fuel, Ammo with their counts and
// caps, Ammo in orange, on the screen; "Open inventory" takes taps 44 px tall and opens the Inventory; a tap elsewhere or on the bag again
// closes the list. (The bar itself refreshes with the HUD, once a game hour or on events; the check calls ui().) On 3D.278 it fails. Exit 0 ok, 1 failed.
const Q = require('./lib');
(async () => { const b = await Q.launch(); const bad = [];
  for (const [w, h] of [[320, 568], [390, 844]]) { const p = await Q.page(b, { w, h, expose: 'ui' }); await Q.newGame(p); await Q.clearCards(p); await p.waitForTimeout(1500); await Q.clearCards(p); const tag = `${w}x${h}`;
    const set = (v) => p.evaluate((v) => { const S = ZH.S; Object.assign(S, v.res); for (const q of S.sv) { q.eq = q.eq || {}; q.eq.weapon = null; } if (v.gun) { S.sv[0].eq.weapon = 'pistol'; S.sv[0].dry = false; } ZH.ui(); }, v);
    const bar = () => p.evaluate(() => { const r = document.getElementById('rare'), sp = r && r.parentElement, d = sp && sp.querySelector('.supDot'), a = document.getElementById('ammoChip');
      return { txt: r ? r.textContent : null, dot: !!(d && getComputedStyle(d).display !== 'none' && d.offsetWidth), ammoChip: !!(a && a.offsetWidth) }; });
    await set({ res: { cloth: 9, meds: 1, fuel: 0, ammo: 30 }, gun: false }); await p.waitForTimeout(1200); let r = await bar(); console.log(tag, 'calm', JSON.stringify(r));
    if (r.txt !== '10') bad.push(`${tag}: the bag shows "${r.txt}", not the total 10`); if (/·/.test(r.txt || '')) bad.push(tag + ': the bag still shows a 9·1·0 style number'); if (r.dot) bad.push(tag + ': a dot shows with nothing low');
    await set({ res: { cloth: 9, meds: 1, fuel: 0, ammo: 3 }, gun: true }); await p.waitForTimeout(1200); r = await bar(); console.log(tag, 'low ammo', JSON.stringify(r));
    if (!r.dot) bad.push(tag + ': no dot on the bag with a gunner and 3 rounds'); if (r.ammoChip) bad.push(tag + ': ammo still has its own chip on the bar');
    const bag = await p.evaluate(() => { const q = document.getElementById('rare').parentElement.getBoundingClientRect(); return { x: q.left + q.width / 2, y: q.top + q.height / 2 }; });
    await p.mouse.click(bag.x, bag.y); await p.waitForTimeout(400);
    const pop = await p.evaluate(() => { const e = document.getElementById('supPop'); if (!e) return null; const q = e.getBoundingClientRect(), bg = document.getElementById('rare').parentElement.getBoundingClientRect(), btn = e.querySelector('.supInv').getBoundingClientRect();
      const rows = [...e.querySelectorAll('.supRow')].map((x) => ({ k: x.dataset.k, name: x.querySelector('.supN').firstChild.textContent, v: x.querySelector('b').textContent.replace(/\s+/g, ' '), low: x.classList.contains('low') }));
      const top = document.elementFromPoint(q.left + q.width / 2, q.top + 12); return { l: q.left, r: q.right, t: q.top, b: q.bottom, under: q.top >= bg.bottom - 1, rows, btnH: btn.height, onTop: !!(top && e.contains(top)), vw: innerWidth, vh: innerHeight, infoOpen: document.getElementById('infoPanel').classList.contains('show') }; });
    console.log(tag, 'list', JSON.stringify(pop));
    if (!pop) { bad.push(tag + ': a tap on the bag opened no supplies list'); await p.close(); continue; }
    if (pop.infoOpen) bad.push(tag + ': the bag opened a menu as well');
    const want = [['cloth', 'Cloth', '9'], ['meds', 'Medicine', '1'], ['fuel', 'Fuel', '0'], ['ammo', 'Ammo', '3']];
    if (pop.rows.length !== 4) bad.push(`${tag}: ${pop.rows.length} rows in the list`); else want.forEach(([k, n, v], i) => { const x = pop.rows[i]; if (x.k !== k || x.name !== n || !x.v.startsWith(v + ' / ')) bad.push(`${tag}: row ${i + 1} reads ${x.name} ${x.v}`); });
    if (pop.rows[3] && !pop.rows[3].low) bad.push(tag + ': Ammo is not marked low'); if (pop.rows.slice(0, 3).some((x) => x.low)) bad.push(tag + ': a supply that is not low is marked low');
    if (pop.l < 0 || pop.r > pop.vw || pop.b > pop.vh) bad.push(tag + ': the list runs off the screen'); if (!pop.under) bad.push(tag + ': the list is not under the bag'); if (!pop.onTop) bad.push(tag + ': something covers the list');
    if (pop.btnH < 43.5) bad.push(`${tag}: Open inventory takes taps only ${pop.btnH.toFixed(1)} px tall`);
    await p.mouse.click(bag.x, bag.y); await p.waitForTimeout(300); if (await p.evaluate(() => !!document.getElementById('supPop'))) bad.push(tag + ': a second tap on the bag does not close the list');
    await p.mouse.click(bag.x, bag.y); await p.waitForTimeout(300); await p.mouse.click(Math.round(w * .3), Math.round(h * .55)); await p.waitForTimeout(300);
    if (await p.evaluate(() => !!document.getElementById('supPop'))) bad.push(tag + ': a tap elsewhere does not close the list');
    await p.evaluate(() => { const x = document.getElementById('closeInfo'); if (document.getElementById('infoPanel').classList.contains('show')) x.click(); for (const bn of document.querySelectorAll('#eventModal .evBox:not(.liveCard) button')) bn.click(); });
    await p.waitForTimeout(300); await p.mouse.click(bag.x, bag.y); await p.waitForTimeout(300);
    const ib = await p.evaluate(() => { const e = document.querySelector('#supPop .supInv'); if (!e) return 'no list'; const q = e.getBoundingClientRect(); const t = document.elementFromPoint(q.left + q.width / 2, q.top + q.height / 2); return t === e || e.contains(t) ? { x: q.left + q.width / 2, y: q.top + q.height / 2 } : 'covered'; });
    if (typeof ib === 'string') bad.push(tag + ': Open inventory ' + ib); else { await p.mouse.click(ib.x, ib.y); await p.waitForTimeout(500);
      const o = await p.evaluate(() => ({ open: document.getElementById('infoPanel').classList.contains('show') && document.getElementById('it').textContent, pop: !!document.getElementById('supPop') }));
      if (o.open !== 'Inventory') bad.push(`${tag}: Open inventory opened "${o.open}"`); if (o.pop) bad.push(tag + ': the list stays open over the Inventory'); }
    await p.close(); }
  console.log(bad.length ? 'FAIL: ' + bad.join('; ') : 'ok: the bag shows a total and a dot when low; its list names each supply with its cap, low ones orange, and opens the Inventory'); await b.close(); process.exit(bad.length ? 1 : 0); })();
