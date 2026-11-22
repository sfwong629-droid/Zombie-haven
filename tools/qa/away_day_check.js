// tools/qa/away_day_check.js — 3D.293 (overnight branch; owner, 21 Nov, W175): time away pays up to about a day's production.
// One Rain Barrel, its tray emptied: 1 real hour away pays 6 game hours, 4 hours pays 24, a whole day away pays the same 24 (a day's worth,
// not more), and the tray holds all of it. Serve the repo first (python3 -m http.server 8765). Exit 0 ok, 1 a check failed.
const Q = require('./lib');
(async () => { const b = await Q.launch(); const p = await Q.page(b, { w: 390, h: 844 }); await Q.newGame(p); await Q.clearCards(p);
  const r = await p.evaluate(() => { const S = ZH.S, out = {}; let w = ZH.world.buildings.find((x) => x.type === 'water');
    if (!w) { const W = ZH.world, D = ZH.Wd.DEFS.water, B = ZH.Wd.BUILD; outer: for (let y = B.y0; y <= B.y1; y++) for (let x = B.x0; x <= B.x1; x++) if (ZH.Wd.placementCheck(W, x, y, D, null).ok) { w = { type: 'water', x, y, w: D.w, h: D.h, q: D.q, a: D.a, staff: null }; W.buildings.push(w); ZH.Wd.bump(W); break outer; } }
    if (!w) return { err: 'no Rain Barrel' };
    const away = (h) => { w.bonus = 0; const res = ZH.awayCredit(h * 3600e3); document.querySelectorAll('#eventModal').forEach((m) => { m.style.display = 'none'; }); return { hours: res && res.hours, tray: Math.round((w.bonus || 0) * 100) / 100 }; };
    out.h1 = away(1); out.h4 = away(4); out.h24 = away(24); return out; });
  console.log(JSON.stringify(r)); const bad = []; if (r.err) bad.push(r.err); else {
    if (r.h1.hours !== 6) bad.push('1 hour away paid ' + r.h1.hours + ' game hours (wanted 6)');
    if (r.h4.hours !== 24) bad.push('4 hours away paid ' + r.h4.hours + ' game hours (wanted 24, a day)');
    if (r.h24.hours !== 24) bad.push('a day away paid ' + r.h24.hours + ' game hours (wanted 24, the cap)');
    if (!(Math.abs(r.h4.tray - 4 * r.h1.tray) < .05)) bad.push('the tray did not hold a day (' + r.h4.tray + ' after 4 hours, ' + r.h1.tray + ' after 1)');
    if (r.h24.tray !== r.h4.tray) bad.push('a day away gave ' + r.h24.tray + ', 4 hours ' + r.h4.tray + ': it should stop at a day'); }
  console.log(bad.length ? 'FAIL: ' + bad.join('; ') : 'ok: time away pays up to a day\'s production, and the trays hold it'); if (p.errs.length) console.log('page errors:', p.errs.slice(0, 3)); await b.close(); process.exit(bad.length ? 1 : 0);
})();
