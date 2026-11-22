// tools/qa/no_raid_boss_check.js — 3D.245 (owner, 21 Nov, W172): never a raid on a boss day or the day before.
// The check sets a raid due at every hour of four days round a boss night (the day before, the boss day, the day after, the day after that)
// and runs the game's hourly schedule: no raider may appear on the day before or on the boss day (before, during or after the boss),
// and raiders must still come on a free day. Serve the repo first (python3 -m http.server 8765). Exit 0 ok, 1 a check failed.
const Q = require('./lib');
(async () => { const b = await Q.launch(); const p = await Q.page(b, { w: 390, h: 844 }); await Q.newGame(p); await Q.clearCards(p);
  const r = await p.evaluate(() => { const S = ZH.S, out = { raidsByDay: {}, boss: 0 }; for (const q of S.sv) { q.max = q.hp = 99999; }
    S.day = 10; S.nextBoss = 11; S.grace = 0; S.graceUntil = 0; S.lvl = 3;   /* 3D.298: raiders wait for level 3 */
    for (let d = 10; d <= 13; d++) for (let h = 0; h < 24; h++) { S.day = d; S.hour = h; S.nextRaid = 0;   /* a raid is always due */
      const before = S.z.filter((z) => z.human).length; ZH.eventSchedule(); const n = S.z.filter((z) => z.human).length - before; if (n > 0) out.raidsByDay[d] = (out.raidsByDay[d] || 0) + 1;
      if (S.vanguard || S.z.some((z) => z.boss)) out.boss = d; if (d === 12 && h === 3) { for (const z of S.z) if (z.boss || z.mob) z.hp = 0; S.z = S.z.filter((z) => z.hp > 0); S.bossOn = null; S.vanguard = null; S.mobLeft = 0; }   /* the boss falls in the small hours of the next day */
      S.z = S.z.filter((z) => !z.human); }
    out.nextBoss = S.nextBoss; out.near = ZH.bossNear(); return out; });
  console.log(JSON.stringify(r)); const bad = [];
  if (r.boss !== 11 && r.boss !== 12) bad.push('the boss did not come on day 11');
  if (r.raidsByDay[10]) bad.push('raiders came the day before the boss night');
  if (r.raidsByDay[11]) bad.push('raiders came on the boss day');
  if (!r.raidsByDay[12]) bad.push('no raiders on the free day after the boss night (they must still come)');
  if (r.raidsByDay[13]) bad.push('raiders came on day 13, the day before the next boss (day ' + r.nextBoss + ')');
  console.log(bad.length ? 'FAIL: ' + bad.join('; ') : 'ok: raiders keep off the boss day and the day before, and still come on a free day'); if (p.errs.length) console.log('page errors:', p.errs.slice(0, 3)); await b.close(); process.exit(bad.length ? 1 : 0);
})();
