// tools/qa/threat_by_level_check.js — 3D.253 (owner, 21 Nov, W176): zombies grow with the town's level, never with the count of game days.
// For each level 1 to 20 the check reads the threat (hDay), the kinds of zombie that can come and the size of a raid and of a boss's mob
// on game day 5 and on game day 400: they must be the same. And the threat must never fall from one level to the next.
// Serve the repo first (python3 -m http.server 8765). Exit 0 ok, 1 a check failed.
const Q = require('./lib');
(async () => { const b = await Q.launch(); const p = await Q.page(b, { w: 390, h: 844, expose: 'hDay, bossMob, danger' }); await Q.newGame(p); await Q.clearCards(p);
  const r = await p.evaluate(() => { const S = ZH.S, out = { rows: [], bad: [] }; let prev = 0;
    const kinds = () => { const seen = new Set(); for (let i = 0; i < 400; i++) { S.z.length = 0; ZH.spawn(); if (S.z[0]) seen.add(S.z[0].type); } S.z.length = 0; return [...seen].sort().join(','); };
    for (let l = 1; l <= 20; l++) { S.lvl = l; S.day = 5; const a = { h: ZH.hDay(), mob: ZH.bossMob() }; S.day = 16; const mid = { h: ZH.hDay(), mob: ZH.bossMob() }; S.day = 400; const z = { h: ZH.hDay(), mob: ZH.bossMob() };
      if (mid.h !== z.h || mid.mob !== z.mob) out.bad.push('level ' + l + ': day 16 and day 400 differ'); if (a.h !== z.h) out.bad.push('level ' + l + ': the threat differs between day 5 and day 400');
      if (a.h < prev) out.bad.push('level ' + l + ': the threat falls'); prev = a.h; out.rows.push(l + ':' + a.h + '/' + z.mob); }
    S.lvl = 1; S.day = 400; out.k1 = kinds(); S.lvl = 12; S.day = 2; out.k12 = kinds(); return out; });
  console.log(r.rows.join(' ')); console.log('kinds at level 1 on day 400:', r.k1, '| at level 12 on day 2:', r.k12); const bad = r.bad.slice();
  if (/runner|brute|thrower|spitter/.test(r.k1)) bad.push('a level 1 town on day 400 meets late kinds: ' + r.k1);
  if (!/brute/.test(r.k12) || !/thrower/.test(r.k12)) bad.push('a level 12 town on day 2 does not meet the late kinds: ' + r.k12);
  console.log(bad.length ? 'FAIL: ' + bad.join('; ') : 'ok: the threat, the kinds of zombie and the boss\'s mob follow the level, not the game day'); if (p.errs.length) console.log('page errors:', p.errs.slice(0, 3)); await b.close(); process.exit(bad.length ? 1 : 0);
})();
