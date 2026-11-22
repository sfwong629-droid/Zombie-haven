// tools/qa/crisis_boss_check.js — 3D.273 (owner, 21 Nov, W172): the weekly crisis never fights on a boss night or the night before one.
// A crisis fights on the night after it starts (The Tide, the Toll Kings' siege). The check makes a crisis due on each of the seven days
// round a boss night (boss on day 20, level 15) and runs the day's crisis roll: none may start when its night is day 19 or day 20, and a
// held crisis must start on the first day after that whose night is free. Serve the repo first (python3 -m http.server 8765). Exit 0 ok, 1 failed.
const Q = require('./lib');
(async () => { const b = await Q.launch(); const p = await Q.page(b, { w: 390, h: 844 }); await Q.newGame(p); await Q.clearCards(p);
  const r = await p.evaluate(() => { const S = ZH.S, out = { started: {}, firstFrom: {} };
    const reset = (d) => { S.crisis = null; S.crisisLast = null; S.lvl = 15; S.finale = null; S.nextBoss = 20; S.day = d; S.crisisNext = d; };
    for (let d = 16; d <= 22; d++) { reset(d); ZH.crisisDaily(); out.started[d] = S.crisis ? (S.crisis.night || S.day + 1) : 0; document.querySelectorAll('#eventModal button').forEach(() => 0); }
    for (const d of [18, 19]) { reset(d); let k = d; while (!S.crisis && k < d + 5) { S.day = k; ZH.crisisDaily(); if (!S.crisis) k++; } out.firstFrom[d] = S.crisis ? k : 0; }
    return out; });
  console.log(JSON.stringify(r)); const bad = [];
  for (let d = 16; d <= 22; d++) { const night = d + 1, blocked = night === 19 || night === 20; if (blocked && r.started[d]) bad.push('a crisis started on day ' + d + ' with its night on day ' + night + ' (boss on day 20)'); if (!blocked && !r.started[d]) bad.push('no crisis started on day ' + d + ' although its night (day ' + night + ') is free'); }
  if (r.firstFrom[18] !== 20) bad.push('a crisis held on day 18 started on day ' + r.firstFrom[18] + ', wanted day 20 (night on day 21)');
  if (r.firstFrom[19] !== 20) bad.push('a crisis held on day 19 started on day ' + r.firstFrom[19] + ', wanted day 20');
  console.log(bad.length ? 'FAIL: ' + bad.join('; ') : 'ok: the weekly crisis keeps its fight off a boss night and the night before, and starts the next free day'); if (p.errs.length) console.log('page errors:', p.errs.slice(0, 3)); await b.close(); process.exit(bad.length ? 1 : 0);
})();
