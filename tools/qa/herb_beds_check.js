// tools/qa/herb_beds_check.js — 3D.301 (owner, 22 Nov: "Herb beds"): a Garden Plot switched to herbs grows medicine instead of food,
// a quarter as much (about 1 a day for a Garden Plot), into its tray; it rests when the medicine store is full; switching back grows food.
// Serve the repo first (python3 -m http.server 8765). Exit 0 ok, 1 failed.
const Q = require('./lib');
(async () => { const b = await Q.launch(); const p = await Q.page(b, { w: 390, h: 844, expose: 'hourlyProduction, rareCap' }); await Q.newGame(p); await Q.clearCards(p);
  const r = await p.evaluate(() => { const S = ZH.S, W = ZH.world, out = {};
    let f = W.buildings.find((x) => ZH.DEFS[x.type] && ZH.DEFS[x.type].fam === 'farm');
    if (!f) { const D = ZH.DEFS.farm; f = { type: 'farm', x: 0, y: 0, w: D.w, h: D.h, q: D.q, a: D.a, staff: null }; W.buildings.push(f); }
    for (const x of W.buildings) if (x !== f && ZH.DEFS[x.type] && ZH.DEFS[x.type].fam === 'farm') x.burnt = true;
    S.water = 200; S.food = 5; const day = () => { f.bonus = 0; for (let h = 0; h < 24; h++) ZH.hourlyProduction(); return { res: f.bonusRes, n: f.bonus || 0 }; };
    out.food = day(); out.set = ZH.setHerbs(f, true); S.meds = 0; out.herb = day(); out.out = ZH.DEFS[f.type].out;
    S.meds = ZH.rareCap(); out.full = day(); S.meds = 0; ZH.setHerbs(f, false); out.back = day(); return out; });
  console.log(JSON.stringify(r)); const bad = []; const ratio = r.herb.n / r.food.n;
  if (r.herb.res !== 'meds') bad.push('herbs went to ' + r.herb.res); if (!(ratio > .2 && ratio < .3)) bad.push('herbs gave ' + ratio.toFixed(2) + ' of the food (wanted .25)');
  if (r.full.n > .01) bad.push('it kept growing with the medicine store full'); if (r.back.res !== 'food' || r.back.n < r.food.n * .9) bad.push('switching back did not grow food');
  console.log(bad.length ? 'FAIL: ' + bad.join('; ') : `ok: a ${r.out}-food bed grows ${r.herb.n.toFixed(2)} medicine a day as herbs (${r.food.n.toFixed(2)} food as food), rests when full, and switches back`); if (p.errs.length) console.log('page errors:', p.errs.slice(0, 3)); await b.close(); process.exit(bad.length ? 1 : 0);
})();
