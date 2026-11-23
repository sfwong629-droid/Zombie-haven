// tools/qa/dawn_sweep_check.js — 3D.299 (A12 tuning): the dawn sweep. In daylight a fit fighter goes after a zombie far across town
// (beyond the usual range); at night, or below 70% health, they leave it. A zombie 20 tiles out past the town's edge is never hunted.
// Serve the repo first (python3 -m http.server 8765). Exit 0 ok, 1 failed.
const Q = require('./lib');
(async () => { const b = await Q.launch(); const p = await Q.page(b, { w: 390, h: 844 }); await Q.newGame(p); await Q.clearCards(p);
  const r = await p.evaluate(() => { const S = ZH.S, B = ZH.Wd.BUILD, out = {};
    const f = S.sv[0]; f.job = 'Guard'; f.fleeT = 0; f.mode = 'free'; f.w = { x: B.x0 + .5, y: B.y0 + .5 }; f.hp = f.max;
    const put = (x, y) => { S.z = [{ type: 'walker', hp: 10, max: 10, w: { x, y }, mode: 'idle' }]; f.target = null; f.mode = 'free'; return ZH.acquireEnemy(f) && f.target === S.z[0]; };
    const far = [B.x1 + 1.5, B.y1 + 1.5]; out.dist = Math.round(Math.hypot(far[0] - f.w.x, far[1] - f.w.y));
    S.hour = 14; out.dayFar = put(...far); S.hour = 23; out.nightFar = put(...far);
    S.hour = 14; f.hp = f.max * .5; out.hurtFar = put(...far); f.hp = f.max; out.edge = put(B.x1 + 8, B.y0 + 1); out.wayOut = put(B.x1 + 25, B.y0 + 1); return out; });
  console.log(JSON.stringify(r)); const bad = [];
  if (!r.dayFar) bad.push('by day a fit fighter did not go after a zombie ' + r.dist + ' tiles across town'); if (r.nightFar) bad.push('at night they went across town');
  if (r.hurtFar) bad.push('a fighter at half health went'); if (!r.edge) bad.push('a zombie just outside the edge was left'); if (r.wayOut) bad.push('a zombie far out on the map was hunted');
  console.log(bad.length ? 'FAIL: ' + bad.join('; ') : 'ok: by day fit fighters sweep the whole town and its edge; not at night, not when hurt, not out across the map'); if (p.errs.length) console.log('page errors:', p.errs.slice(0, 3)); await b.close(); process.exit(bad.length ? 1 : 0);
})();
