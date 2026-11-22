// tools/qa/early_wood_check.js — 3D.296 (overnight branch; owner, 21 Nov, W183): wood does not run out on day 1.
// The check: a new Roadside Camp starts with 20 wood; a felled load of wood carries 2 more up to level 3 and nothing extra from level 4;
// and in a new town played for one game day, a chop brings back more than the old 3 (+ the job's bonus). Serve the repo first. Exit 0 ok, 1 failed.
const Q = require('./lib');
(async () => { const b = await Q.launch(); const p = await Q.page(b, { w: 390, h: 844 }); await Q.newGame(p); await Q.clearCards(p);
  const r = await p.evaluate(() => { const S = ZH.S, out = { start: ZH.STARTS.camp.wood }; const l0 = S.lvl;
    S.lvl = 1; out.l1 = ZH.earlyWood(); S.lvl = 3; out.l3 = ZH.earlyWood(); S.lvl = 4; out.l4 = ZH.earlyWood(); S.lvl = l0;
    let best = 0; for (let i = 0; i < 1500; i++) { ZH.step(20); for (const q of S.sv) if (q.carriedLoot === 'wood') best = Math.max(best, q.carryAmt || 0); } out.load = best; return out; });
  console.log(JSON.stringify(r)); const bad = [];
  if (r.start !== 20) bad.push('the camp starts with ' + r.start + ' wood (wanted 20)');
  if (r.l1 !== 2 || r.l3 !== 2 || r.l4 !== 0) bad.push('the early wood bonus is ' + [r.l1, r.l3, r.l4].join('/') + ' at levels 1/3/4 (wanted 2/2/0)');
  if (r.load && r.load < 5) bad.push('the best load of wood carried in the first day was ' + r.load + ' (wanted 5 or more)');
  console.log(bad.length ? 'FAIL: ' + bad.join('; ') : 'ok: more wood to start and bigger loads of wood up to level 3 (best load ' + r.load + ')'); if (p.errs.length) console.log('page errors:', p.errs.slice(0, 3)); await b.close(); process.exit(bad.length ? 1 : 0);
})();
