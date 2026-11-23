// tools/qa/sh_look_check.js [map ...] — 3D.311 (Strongholds chat): a dressed place draws without errors, every piece of set dressing is a kind the 3D view
// knows, stands on or beside the map, and none stands on the squad's start or the way out. Default maps: every plan that has set dressing.
const Q = require('./sh_lib'); const fs = require('fs'); const path = require('path');
(async () => { const src = fs.readFileSync(path.join(__dirname, '..', '..', 'js', 'render3d.js'), 'utf8'); const fn = src.slice(src.indexOf('function shLookGroup'), src.indexOf('function shThingsKey')); const kinds = new Set([...fn.matchAll(/k === '([a-z0-9_]+)'/g)].map((m) => m[1]));
  const b = await Q.launch(); const p = await Q.open(b); await Q.newGame(p); const bad = []; let maps = process.argv.slice(2);
  if (!maps.length) maps = await p.evaluate(() => Object.keys(ZH.SH_DEFS).filter((d) => { try { return (ZH.shMakePlan(d, 10).deco || []).length > 0; } catch (e) { return false; } }));
  for (const d of maps) for (const lv of [3, 9, 20]) { const r = await p.evaluate(([d, lv]) => { const P = ZH.shMakePlan(d, lv); return { deco: P.deco, W: P.W, H: P.H, start: P.start, exit: P.exit, look: Object.keys(P.look || {}), solids: (P.solids || []).length, solidT: Object.keys(P.solidT || {}).length }; }, [d, lv]);
    if (r.deco.length < 20) bad.push(`${d} at level ${lv}: only ${r.deco.length} pieces of set dressing`);
    for (const t of r.deco) { if (!kinds.has(t.k)) bad.push(`${d}: the 3D view has no "${t.k}"`); if (t.x < -20 || t.y < -20 || t.x > r.W + 20 || t.y > r.H + 20) bad.push(`${d} at level ${lv}: ${t.k} is far off the map (${t.x}, ${t.y})`);
      for (const q of [r.start, r.exit]) if (q && Math.hypot(t.x - q.x, t.y - q.y) < .9 && !['pad', 'blood', 'smear', 'papers'].includes(t.k)) bad.push(`${d} at level ${lv}: ${t.k} stands on the start or the way out`); }
    if (lv === 9) console.log(`${d}: ${r.solids} solid pieces fill ${r.solidT} tiles;`), console.log(`${d}: ${r.deco.length} pieces, ${new Set(r.deco.map((t) => t.k)).size} kinds; look: ${r.look.join(', ')}`); }
  for (const d of maps) { await Q.clearCards(p); const r = await Q.practice(p, d, 9, 4, true); if (!r.ok) { bad.push(`${d}: could not start`); continue; } await p.waitForTimeout(2500);
    /* 3D.321 set dressing is solid: someone put in the middle of a solid piece is outside it a moment later, and its filled tiles are shut to walkers */
    const so = await p.evaluate(() => { const H = ZH.S.sh, L = H.plan.solids || []; if (!L.length) return { n: 0 }; const R = L[0], u = H.units[0]; u.w = { x: ZH.SH_AX + (R[0] + R[2]) / 2, y: ZH.SH_AY + (R[1] + R[3]) / 2 }; ZH.shSolidPush(u); const px = u.w.x - ZH.SH_AX, py = u.w.y - ZH.SH_AY; const t = Object.keys(H.plan.solidT || {})[0]; return { n: L.length, out: px <= R[0] || px >= R[2] || py <= R[1] || py >= R[3], shut: t ? ZH.shOpen(+t.split(',')[0], +t.split(',')[1], 's') === false : true }; });
    if (so.n && (!so.out || !so.shut)) bad.push(`${d}: a solid piece can be walked through (${JSON.stringify(so)})`); if (['lab7', 'records'].includes(d) && so.n < 20) bad.push(`${d}: only ${so.n} solid pieces`);
    await p.evaluate(() => { ZH.S.sh = null; }); await p.waitForTimeout(300); }
  if (p.errs.length) { console.log('page errors:', p.errs.slice(0, 5)); bad.push('page errors while drawing'); }
  console.log(bad.length ? 'FAIL:\n  ' + [...new Set(bad)].join('\n  ') : 'ok: every dressed place draws, with only known pieces, none on the start or the way out'); await b.close(); process.exit(bad.length ? 1 : 0); })();
