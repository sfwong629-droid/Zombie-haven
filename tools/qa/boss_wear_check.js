// tools/qa/boss_wear_check.js — A12 tuning 3 (branch a12-v2): a boss still standing after his night wears down in daylight (a tenth an hour,
// never below 15%) and no new ordinary night crowd comes while he stands. Serve the repo first (python3 -m http.server 8765).
const Q = require('./lib');
(async () => { const b = await Q.launch(); const p = await Q.page(b, { w: 390, h: 844 }); await Q.newGame(p); await Q.clearCards(p);
  const r = await p.evaluate(() => { const S = ZH.S, out = {}; S.lvl = 9; S.nextBoss = 99; S.nextRaid = 99; S.bossOn = null; S.vanguard = null;
    const boss = { type: 'boss', hp: 1000, max: 1000, w: { x: 1, y: 1 }, mode: 'idle' }; S.z = [boss]; S.day = 50;
    for (let h = 6; h <= 12; h++) { S.hour = h; ZH.eventSchedule(); } out.noon = boss.hp; for (let h = 13; h <= 19; h++) { S.hour = h; ZH.eventSchedule(); } out.dusk = boss.hp;
    S.hour = 22; const n0 = S.z.length; for (let i = 0; i < 3000; i++) ZH.spawnTick && ZH.spawnTick(); out.spawned = S.z.length - n0; return out; });
  console.log(JSON.stringify(r)); const bad = [];
  if (!(r.noon < 500 && r.noon >= 350)) bad.push('by noon the boss had ' + r.noon + ' of 1000 (wanted 400)'); if (r.dusk !== 150) bad.push('at dusk ' + r.dusk + ' (wanted 150)');
  console.log(bad.length ? 'FAIL: ' + bad.join('; ') : 'ok: a leftover boss wears down by day to 15% and waits to be finished'); if (p.errs.length) console.log('page errors:', p.errs.slice(0, 3)); await b.close(); process.exit(bad.length ? 1 : 0);
})();
