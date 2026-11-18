// tools/qa/big_horde_check.js — 3D.199 (owner, W54): a boss night is a big horde, about three times an ordinary night.
// The boss's mob is 4 times what it was, as a much weaker crowd (a third of the health, half the hit; owner, 18 Nov), 40% arriving with the
// boss and the rest streaming in while it lives, never more than 30 mob zombies standing at once in era 1.
// The check calls a boss on a day-12 night and counts: the mob the game announces is 4 x the old formula; about 40% stand there at once;
// the rest arrive as the clock runs; mob zombies have less health than the night's ordinary ones; and when the boss falls no more come.
// Serve the repo first (python3 -m http.server 8765). Exit 0 ok, 1 a check failed.
const Q = require('./lib');
(async () => { const b = await Q.launch(); const p = await Q.page(b, { w: 390, h: 844, expose: 'spawnBoss, bossMob, avgLevel, hDay, spawn' }); await Q.newGame(p); await Q.clearCards(p);
  const r = await p.evaluate(() => { const S = ZH.S, out = {}; S.day = 12; S.hour = 22; for (const q of S.sv) { q.max = q.hp = 99999; }   /* nobody falls during the count */
    S.z.length = 0;
    out.old = Math.round((3 + Math.round(ZH.avgLevel() * .8) + 3 * (S.terr || 0) + Math.floor(ZH.hDay() / 5)) * (S.day <= 14 ? .7 : 1)); out.mob = ZH.bossMob();
    ZH.spawnBoss('mutant'); const mobs = () => S.z.filter((z) => z.mob).length; out.first = mobs(); out.left = S.mobLeft; out.pw = S.z.find((z) => z.mob).pw; { ZH.spawn(); const q = S.z.pop(); out.plainPw = q.pw || 1; } { const m = S.z.find((z) => z.mob); out.mobHp = m.max; ZH.spawn(null, null, m.type); out.plainHp = S.z[S.z.length - 1].max; S.z.length -= 1; }   /* the same kind of zombie, mob against ordinary */
    for (const z of S.z) if (z.boss) { z.max = z.hp = 9e9; }
    out.peak = 0; for (let i = 0; i < 40 && S.mobLeft > 0; i++) { ZH.step(300); S.hour = 22; out.peak = Math.max(out.peak, mobs()); }   /* hold the clock at night */
    out.total = S.z.filter((z) => z.mob).length + 0; out.leftAfter = S.mobLeft; out.spawnedAll = out.first + (out.left - out.leftAfter);
    return out; });
  const r2 = await p.evaluate(() => { const S = ZH.S; S.z.length = 0; S.bossOn = null; S.day = 12; S.hour = 22; ZH.spawnBoss('mutant'); const left = S.mobLeft; for (const z of S.z) if (z.boss) z.hp = 0; ZH.step(400); return { left, after: S.mobLeft }; });
  console.log(JSON.stringify(r), JSON.stringify(r2)); const bad = [];
  if (r.mob !== r.old * 4) bad.push('the mob is ' + r.mob + ', 4 x the old one would be ' + r.old * 4);
  if (Math.abs(r.first - Math.round(r.mob * .4)) > 1) bad.push(r.first + ' arrive with the boss, expected about ' + Math.round(r.mob * .4));
  if (r.first + r.left !== r.mob) bad.push('the first group and the rest do not add up to the mob');
  if (r.leftAfter !== 0 || r.spawnedAll !== r.mob) bad.push('the rest of the horde did not all arrive (' + r.spawnedAll + ' of ' + r.mob + ')');
  if (!(r.pw <= r.plainPw * .55)) bad.push('mob zombies hit as hard as ordinary ones (' + r.pw + ' against ' + r.plainPw + ')');
  if (r.peak > 30) bad.push(r.peak + ' mob zombies stood at once in era 1; the cap is 30');
  if (!(r.mobHp <= r.plainHp * .4)) bad.push('mob zombies are not weaker than ordinary ones (' + r.mobHp + ' against ' + r.plainHp + ')');
  if (!(r2.left > 0 && r2.after === 0)) bad.push('the horde keeps coming after the boss falls');
  console.log(bad.length ? 'FAIL: ' + bad.join('; ') : 'ok: a boss night brings a big, much weaker horde, capped on screen, that stops when the boss falls'); if (p.errs.length) console.log('page errors:', p.errs.slice(0, 3)); await b.close(); process.exit(bad.length ? 1 : 0);
})();
