// tools/qa/clear_streets_check.js — 3D.298 (A12 tuning): a boss night does not start on top of a town still full of zombies.
// A level 3 town on its boss day: with 20 zombies standing at noon (limit 30, half is 15) the boss night waits a day, at most twice, then
// comes anyway; with 5 standing it comes on time. Serve the repo first (python3 -m http.server 8765). Exit 0 ok, 1 failed.
const Q = require('./lib');
(async () => { const b = await Q.launch(); const p = await Q.page(b, { w: 390, h: 844 }); await Q.newGame(p); await Q.clearCards(p);
  const r = await p.evaluate(() => { const S = ZH.S, out = {};
    const fill = (n) => { S.z = []; for (let i = 0; i < n; i++) S.z.push({ type: 'walker', hp: 10, max: 10, w: { x: 1, y: 1 }, mode: 'idle' }); };
    const day = (d, n) => { fill(n); S.day = d; S.graceUntil = 0; for (let h = 0; h < 24; h++) { S.hour = h; ZH.eventSchedule(); if (S.vanguard) { const v = S.vanguard; S.vanguard = null; S.bossOn = null; return v ? 'boss' : ''; } } return 'quiet'; };
    S.lvl = 3; S.nextRaid = 999; S.bossWaits = 0; S.nextBoss = 10;
    out.full = [day(10, 20), day(11, 20), day(12, 20)]; out.nextAfter = S.nextBoss;
    S.bossWaits = 0; S.nextBoss = 20; out.clear = day(20, 5); return out; });
  console.log(JSON.stringify(r)); const bad = [];
  if (r.full.join() !== 'quiet,quiet,boss') bad.push('with 20 standing the days went ' + r.full.join(', ') + ' (wanted quiet, quiet, boss)');
  if (r.clear !== 'boss') bad.push('with 5 standing the boss did not come on time');
  console.log(bad.length ? 'FAIL: ' + bad.join('; ') : 'ok: a full town gets two quiet days to clear its streets, then the boss comes; a clear town gets it on time'); if (p.errs.length) console.log('page errors:', p.errs.slice(0, 3)); await b.close(); process.exit(bad.length ? 1 : 0);
})();
