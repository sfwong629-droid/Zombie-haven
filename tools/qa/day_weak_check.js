// tools/qa/day_weak_check.js — 3D.297 (A12 tuning): zombies are slow and weak in daylight.
// A walker walks the same open stretch at 14:00 and at 23:00 for the same number of ticks; by day it must cover about half the ground.
// Its hit on a person is about half by day; a raider's is the same day and night. Serve the repo first (python3 -m http.server 8765).
const Q = require('./lib');
(async () => { const b = await Q.launch(); const p = await Q.page(b, { w: 390, h: 844 }); await Q.newGame(p); await Q.clearCards(p);
  const r = await p.evaluate(() => { const S = ZH.S, out = {};
    const walk = (hour) => { S.hour = hour; const z = { type: 'walker', w: { x: 2.5, y: 2.5 }, hp: 10, max: 10, mode: 'zmarch' }; const g = { x: 2.5, y: 40.5 }; for (let i = 0; i < 120; i++) ZH.followPath(z, g, 0.05); return Math.hypot(z.w.x - 2.5, z.w.y - 2.5); };
    out.dayMove = walk(14); out.nightMove = walk(23);
    const z = { type: 'walker', pw: 1 }, rd = { type: 'raider', human: true, pw: 1 };
    S.hour = 14; out.dayHit = ZH.zPw(z); out.dayRaider = ZH.zPw(rd); S.hour = 23; out.nightHit = ZH.zPw(z); out.nightRaider = ZH.zPw(rd); return out; });
  console.log(JSON.stringify(r)); const bad = []; const ratio = r.dayMove / r.nightMove;
  if (!(ratio > .4 && ratio < .6)) bad.push('by day a walker covers ' + ratio.toFixed(2) + ' of its night distance (wanted about 0.5)');
  if (r.dayHit !== .5 * r.nightHit) bad.push('day hit ' + r.dayHit + ' against night ' + r.nightHit); if (r.dayRaider !== r.nightRaider) bad.push('raiders change by day');
  console.log(bad.length ? 'FAIL: ' + bad.join('; ') : 'ok: by day zombies move at ' + ratio.toFixed(2) + ' of their night speed and hit half as hard; raiders are unchanged'); if (p.errs.length) console.log('page errors:', p.errs.slice(0, 3)); await b.close(); process.exit(bad.length ? 1 : 0);
})();
