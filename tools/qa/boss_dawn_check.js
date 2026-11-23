// tools/qa/boss_dawn_check.js — A12 (owner, 23 Nov: "Boss leaves at dawn", "Boss should not lose HP"): at 06:00 a boss still alive walks off
// with his own horde at full health; an ordinary zombie from the night stays. Serve the repo first (python3 -m http.server 8765).
const Q = require('./lib');
(async () => { const b = await Q.launch(); const p = await Q.page(b, { w: 390, h: 844 }); await Q.newGame(p); await Q.clearCards(p);
  const r = await p.evaluate(() => { const S = ZH.S; S.nextBoss = 99; S.nextRaid = 99; S.day = 30; S.lvl = 9;
    const boss = { type: 'boss', hp: 900, max: 1000, w: { x: 1, y: 1 }, mode: 'zmarch' }, mob = { type: 'walker', hp: 10, max: 10, mob: true, w: { x: 2, y: 1 }, mode: 'zmarch' }, plain = { type: 'walker', hp: 10, max: 10, w: { x: 3, y: 1 }, mode: 'zmarch' };
    S.z = [boss, mob, plain]; S.bossOn = 30; for (let h = 3; h <= 12; h++) { S.hour = h; ZH.eventSchedule(); }
    return { boss: boss.mode, bossHp: boss.hp, mob: mob.mode, plain: plain.mode }; });
  console.log(JSON.stringify(r)); const bad = [];
  if (r.boss !== 'zleave' || r.bossHp !== 900) bad.push('boss ' + r.boss + ' at ' + r.bossHp); if (r.mob !== 'zleave') bad.push('his horde ' + r.mob); if (r.plain === 'zleave') bad.push('an ordinary zombie left');
  console.log(bad.length ? 'FAIL: ' + bad.join('; ') : 'ok: at dawn the boss and his horde walk off at full health; other zombies stay'); if (p.errs.length) console.log('page errors:', p.errs.slice(0, 3)); await b.close(); process.exit(bad.length ? 1 : 0);
})();
