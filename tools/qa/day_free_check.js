// tools/qa/day_free_check.js — 3D.291 (overnight branch; owner, 21 Nov, W176): no danger number follows the game day any more.
// For levels 1, 3, 6 and 15 the check reads, on game day 2 and on game day 300: the boss's health and hit (the Mutant, the same survivors),
// the raider kinds (500 rolls), and the spawn speed's threat. Each must be the same on both days; and the gentle start must still apply at
// level 1 and be gone at level 6. Serve the repo first (python3 -m http.server 8765). Exit 0 ok, 1 a check failed.
const Q = require('./lib');
(async () => { const b = await Q.launch(); const p = await Q.page(b, { w: 390, h: 844 }); await Q.newGame(p); await Q.clearCards(p);
  const r = await p.evaluate(() => { const S = ZH.S, out = {};
    const read = (lvl, day) => { S.lvl = lvl; S.day = day; S.z.length = 0; S.bossOn = null; ZH.spawnBoss('mutant', true); const bz = S.z.find((z) => z.boss); const kinds = {};
      for (let i = 0; i < 500; i++) { const z = { max: 100 }; ZH.rollRaider(z, i % 4); kinds[z.kind] = 1; } S.z.length = 0; S.bossOn = null; S.mobLeft = 0;
      return { hp: bz.max, pw: Math.round(bz.pw * 1000), kinds: Object.keys(kinds).sort().join(','), threat: ZH.threatNow() }; };
    for (const l of [1, 3, 6, 15]) out[l] = { d2: read(l, 2), d300: read(l, 300) }; return out; });
  const bad = []; for (const l of Object.keys(r)) { const a = r[l].d2, z = r[l].d300; console.log('level ' + l + ': day 2 ' + JSON.stringify(a) + ' | day 300 ' + JSON.stringify(z));
    for (const k of ['hp', 'pw', 'kinds', 'threat']) if (a[k] !== z[k]) bad.push('level ' + l + ': ' + k + ' differs between day 2 (' + a[k] + ') and day 300 (' + z[k] + ')'); }
  if (!(r[1].d2.hp < r[6].d2.hp * .8)) bad.push('the boss at level 1 is not gentler than at level 6');
  if (/brute/.test(r[1].d2.kinds) || /firebug/.test(r[1].d2.kinds)) bad.push('level 1 meets Brutes or Firebugs: ' + r[1].d2.kinds);
  if (!/brute/.test(r[3].d2.kinds) || !/firebug/.test(r[3].d2.kinds)) bad.push('level 3 does not meet Brutes and Firebugs: ' + r[3].d2.kinds);
  console.log(bad.length ? 'FAIL: ' + bad.join('; ') : 'ok: the boss, the raider kinds and the spawn speed follow the level, not the game day'); if (p.errs.length) console.log('page errors:', p.errs.slice(0, 3)); await b.close(); process.exit(bad.length ? 1 : 0);
})();
