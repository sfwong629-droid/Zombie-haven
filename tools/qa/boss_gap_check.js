// tools/qa/boss_gap_check.js — 3D.247 (owner, 21 Nov, W173): a boss night every 3 game days up to level 10, every 5 from level 11.
// The check runs the game's hourly schedule through 21:00 of a boss day at level 5, 10, 11 and 20 and reads when the next boss is due.
// Serve the repo first (python3 -m http.server 8765). Exit 0 ok, 1 a check failed.
const Q = require('./lib');
(async () => { const b = await Q.launch(); const p = await Q.page(b, { w: 390, h: 844 }); await Q.newGame(p); await Q.clearCards(p);
  const r = await p.evaluate(() => { const S = ZH.S, out = {}; for (const q of S.sv) { q.max = q.hp = 99999; }
    for (const lvl of [5, 10, 11, 20]) { S.lvl = lvl; S.z.length = 0; S.bossOn = null; S.vanguard = null; S.mobLeft = 0; S.day = 30; S.nextBoss = 30; S.hour = 21; S.nextRaid = 1e9; ZH.eventSchedule(); out[lvl] = { gap: S.nextBoss - 30, boss: !!S.vanguard || S.z.some((z) => z.boss) }; }
    S.lvl = 1; return out; });
  console.log(JSON.stringify(r)); const bad = [];
  for (const [lvl, want] of [[5, 3], [10, 3], [11, 5], [20, 5]]) { if (!r[lvl].boss) bad.push('no boss came at level ' + lvl); if (r[lvl].gap !== want) bad.push('level ' + lvl + ': the next boss is ' + r[lvl].gap + ' days on, expected ' + want); }
  console.log(bad.length ? 'FAIL: ' + bad.join('; ') : 'ok: a boss every 3 game days up to level 10, every 5 from level 11'); if (p.errs.length) console.log('page errors:', p.errs.slice(0, 3)); await b.close(); process.exit(bad.length ? 1 : 0);
})();
