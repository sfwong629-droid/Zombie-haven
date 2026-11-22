// tools/qa/boss_last_check.js — 3D.269 (owner, 21 Nov, W201 "a"): on the level's boss night the horde comes first and its boss last.
// Case 1, a town that keeps killing (level 8, horde 88): at 21:00 a first group arrives and no boss; the horde streams in; the boss walks in
// once two thirds of it have come, and the rest keep coming behind him. Case 2, a town that kills nothing: the boss still comes, by 23:00.
// Case 3: when the boss falls the horde breaks and no more come. Serve the repo first (python3 -m http.server 8765). Exit 0 ok, 1 failed.
const Q = require('./lib');
(async () => { const b = await Q.launch(); const p = await Q.page(b, { w: 390, h: 844, expose: 'bossMob, hordeStart' }); await Q.newGame(p); await Q.clearCards(p);
  const r = await p.evaluate(() => { const S = ZH.S, out = {}; for (const q of S.sv) { q.max = q.hp = 99999; }
    const mobs = () => S.z.filter((z) => z.mob && z.hp > 0).length, boss = () => S.z.find((z) => z.type === 'boss' && z.hp > 0);
    const start = () => { S.z.length = 0; S.bossOn = null; S.vanguard = null; S.mobLeft = 0; S.calmUntil = 0; S.lvl = 8; S.day = 30; S.nextBoss = 30; S.hour = 21; S.nextRaid = 1e9; S.grace = 0; S.graceUntil = 0; ZH.eventSchedule(); };
    /* 1. a town that keeps killing */
    start(); out.mob = ZH.bossMob(); out.first = mobs(); out.bossAtStart = !!boss(); out.van = !!S.vanguard; out.left0 = S.vanguard ? S.vanguard.left : -1; out.peak = out.first;
    let came = out.first; const seen = new Set(S.z.filter((z) => z.mob));
    for (let i = 0; i < 400 && !boss(); i++) { ZH.step(20); S.hour = 21; for (const z of S.z) if (z.mob && !seen.has(z)) { seen.add(z); came++; } out.peak = Math.max(out.peak, mobs());
      const ms = S.z.filter((z) => z.mob && z.hp > 0); for (let k = 0; k < ms.length - 39; k++) ms[k].hp = 0; S.z = S.z.filter((z) => z.hp > 0); }
    out.cameAtBoss = came; out.bossCame = !!boss(); out.leftAtBoss = S.mobLeft; out.vanAfter = !!S.vanguard; out.bossOn = S.bossOn != null;
    for (const z of S.z) if (z.boss) z.max = z.hp = 9e9;
    for (let i = 0; i < 400 && S.mobLeft > 0; i++) { ZH.step(20); S.hour = 22; for (const z of S.z) if (z.mob && !seen.has(z)) { seen.add(z); came++; } out.peak = Math.max(out.peak, mobs());
      const ms = S.z.filter((z) => z.mob && z.hp > 0); for (let k = 0; k < ms.length - 39; k++) ms[k].hp = 0; S.z = S.z.filter((z) => z.hp > 0); }
    out.cameAll = came;
    /* 3. the boss falls: the horde breaks */
    S.mobLeft = 5; S.bossKills = (S.bossKills || 0) + 1; for (const z of S.z) if (z.boss) z.hp = 0; S.z = S.z.filter((z) => z.hp > 0 || z.boss); ZH.step(40); out.leftAfterKill = S.mobLeft; out.mobAfterKill = S.z.filter((z) => z.mob && z.hp > 0).length; out.bossOnAfter = S.bossOn != null;
    /* 2. a town that kills nothing: the boss comes by 23:00 */
    start(); let h = 21; for (let i = 0; i < 150 && !boss(); i++) { ZH.step(20); if (i === 50) h = 22; if (i === 100) h = 23; S.hour = h; S.day = 30; } out.lateBoss = !!boss(); out.lateHour = h; out.lateCame = S.vanguard ? -1 : (ZH.bossMob() - S.mobLeft);
    return out; });
  console.log(JSON.stringify(r)); const bad = [];
  if (r.bossAtStart || !r.van) bad.push('the boss came at 21:00 with the horde');
  if (r.first !== Math.min(45, Math.round(r.mob * .4)) || r.first + r.left0 !== r.mob) bad.push('the first group is ' + r.first + ' of ' + r.mob);
  if (!r.bossCame) bad.push('the boss never came');
  if (r.cameAtBoss < Math.ceil(r.mob * 2 / 3) || r.cameAtBoss > Math.ceil(r.mob * 2 / 3) + 2) bad.push('the boss came when ' + r.cameAtBoss + ' of ' + r.mob + ' had arrived (wanted two thirds)');
  if (r.cameAtBoss + r.leftAtBoss !== r.mob) bad.push('the rest behind the boss does not add up (' + r.cameAtBoss + ' + ' + r.leftAtBoss + ' of ' + r.mob + ')');
  if (r.vanAfter || !r.bossOn) bad.push('the boss night is not on after the boss arrived');
  if (r.cameAll !== r.mob) bad.push('the whole horde did not arrive (' + r.cameAll + ' of ' + r.mob + ')');
  if (r.peak > 45) bad.push(r.peak + ' of the horde stood at once; the limit in era 2 is 45');
  if (r.leftAfterKill !== 0 || r.mobAfterKill !== 0 || r.bossOnAfter) bad.push('the horde did not break when the boss fell');
  if (!r.lateBoss || r.lateHour > 23) bad.push('a town that kills nothing never met the boss by 23:00');
  console.log(bad.length ? 'FAIL: ' + bad.join('; ') : 'ok: the horde comes first, the boss walks in when two thirds are there (or by 23:00), the rest follow, and the horde breaks when he falls'); if (p.errs.length) console.log('page errors:', p.errs.slice(0, 3)); await b.close(); process.exit(bad.length ? 1 : 0);
})();
