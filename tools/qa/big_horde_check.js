// tools/qa/big_horde_check.js — 3D.199 (owner, W54): a boss night is a big horde, about three times an ordinary night.
// The boss's mob is 4 times what it was, as a much weaker crowd (a third of the health, half the hit; owner, 18 Nov), 40% arriving with the
// boss and the rest streaming in while it lives, never more than 30 mob zombies standing at once in era 1.
// The check calls a boss at level 3, 8, 13 and 18 and counts: the mob follows the level (3D.261), whatever the game day; the first group is
// about 40% and never more than may stand at once (30 / 45 / 60 by era); the rest all arrive as the clock runs, within 5 game hours; mob
// zombies have less health and hit softer than the night's ordinary ones; and when the boss falls no more come.
// Serve the repo first (python3 -m http.server 8765). Exit 0 ok, 1 a check failed.
const Q = require('./lib');
(async () => { const b = await Q.launch(); const p = await Q.page(b, { w: 390, h: 844, expose: 'spawnBoss, bossMob, avgLevel, hDay, spawn' }); await Q.newGame(p); await Q.clearCards(p);
  const r = await p.evaluate(() => { const S = ZH.S, out = { rows: [] }; for (const q of S.sv) { q.max = q.hp = 99999; }   /* nobody falls during the count */
    const mobs = () => S.z.filter((z) => z.mob).length;
    for (const [lvl, day] of [[3, 4], [3, 300], [8, 20], [13, 40], [18, 60]]) { S.lvl = lvl; S.day = day; S.hour = 22; S.z.length = 0; S.bossOn = null; const row = { lvl, day, mob: ZH.bossMob() };
      ZH.spawnBoss('mutant'); row.first = mobs(); row.left = S.mobLeft; row.cap = [30, 45, 60, 60][Math.min(3, Math.floor((lvl - 1) / 5))];
      if (lvl === 3 && day === 4) { out.pw = S.z.find((z) => z.mob).pw; { ZH.spawn(); const q = S.z.pop(); out.plainPw = q.pw || 1; } { const m = S.z.find((z) => z.mob); out.mobHp = m.max; ZH.spawn(null, null, m.type); out.plainHp = S.z[S.z.length - 1].max; S.z.length -= 1; } }   /* the same kind of zombie, mob against ordinary */
      for (const z of S.z) if (z.boss) { z.max = z.hp = 9e9; }
      row.peak = mobs(); row.came = row.first; row.ticks = 0; let seen = new Set(S.z.filter((z) => z.mob));
      for (let i = 0; i < 500 && S.mobLeft > 0; i++) { ZH.step(20); row.ticks += 20; S.hour = 22; row.peak = Math.max(row.peak, mobs()); for (const z of S.z) if (z.mob && !seen.has(z)) { seen.add(z); row.came++; }
        const ms = S.z.filter((z) => z.mob); for (let k = 0; k < ms.length - (row.cap - 6); k++) ms[k].hp = 0; S.z = S.z.filter((z) => z.hp > 0); }   /* the town keeps killing: a few always fall, so the rest can come */
      row.leftAfter = S.mobLeft; out.rows.push(row); }
    return out; });
  const r3 = await p.evaluate(() => { const S = ZH.S; S.z.length = 0; S.bossOn = null; S.lvl = 18; S.day = 60; S.hour = 22; ZH.spawnBoss('mutant', true); return { first: S.z.filter((z) => z.mob).length, left: S.mobLeft }; });   /* a crisis or faction boss: a third of the level's horde */
  const r2 = await p.evaluate(() => { const S = ZH.S; S.z.length = 0; S.bossOn = null; S.lvl = 3; S.day = 12; S.hour = 22; ZH.spawnBoss('mutant'); const left = S.mobLeft; for (const z of S.z) if (z.boss) z.hp = 0; ZH.step(400); return { left, after: S.mobLeft }; });
  console.log(r.rows.map((w) => JSON.stringify(w)).join('\n'), JSON.stringify(r2)); const bad = [];
  const want = { 3: 32, 8: 88, 13: 190, 18: 240 };
  for (const w of r.rows) { const t = 'level ' + w.lvl + ' day ' + w.day + ': ';
    if (w.mob !== want[w.lvl]) bad.push(t + 'the mob is ' + w.mob + ', wanted ' + want[w.lvl]);
    if (w.first > w.cap) bad.push(t + w.first + ' arrive with the boss; only ' + w.cap + ' may stand at once');
    if (w.first !== Math.min(w.cap - 1, Math.round(w.mob * .4))) bad.push(t + w.first + ' arrive with the boss, expected ' + Math.min(w.cap - 1, Math.round(w.mob * .4)));   /* 3D.274: the boss counts toward the limit */
    if (w.first + w.left !== w.mob) bad.push(t + 'the first group and the rest do not add up to the mob');
    if (w.leftAfter !== 0 || w.came !== w.mob) bad.push(t + 'the rest of the horde did not all arrive (' + w.came + ' of ' + w.mob + ')');
    if (w.ticks > 5000) bad.push(t + 'the horde took ' + w.ticks + ' ticks to arrive (more than 5 game hours)');
    if (w.peak > w.cap) bad.push(t + w.peak + ' mob zombies stood at once; the cap is ' + w.cap); }
  if (!(r.pw <= r.plainPw * .55)) bad.push('mob zombies hit as hard as ordinary ones (' + r.pw + ' against ' + r.plainPw + ')');
  if (!(r.mobHp <= r.plainHp * .4)) bad.push('mob zombies are not weaker than ordinary ones (' + r.mobHp + ' against ' + r.plainHp + ')');
  if (!(r2.left > 0 && r2.after === 0)) bad.push('the horde keeps coming after the boss falls');
  if (r3.first + r3.left !== 80) bad.push('a crisis boss at level 18 brings ' + (r3.first + r3.left) + ', wanted 80 (a third of the level\'s horde)');
  console.log(bad.length ? 'FAIL: ' + bad.join('; ') : 'ok: a boss night brings a big, much weaker horde sized by the town\'s level, capped on screen, that stops when the boss falls'); if (p.errs.length) console.log('page errors:', p.errs.slice(0, 3)); await b.close(); process.exit(bad.length ? 1 : 0);
})();
