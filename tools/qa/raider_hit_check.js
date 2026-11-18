// tools/qa/raider_hit_check.js — 3D.197 (owner, W57: "follow the weapon type"): a town raider hits as hard as the weapon it carries.
// A hit is 5 + 0.3 x the weapon's own attack, in place of the flat 7 x the kind's factor (Thief 1, Brute 1.5, Firebug 0.9).
// For a town level in each era it sends raids and checks, for every ordinary raider (no leader, no escort): its hit, with the danger level
// taken out, matches the weapon in its hand; a better weapon never hits softer; and a Brute still hits harder than a Thief.
// Serve the repo first (python3 -m http.server 8765). Exit 0 ok, 1 a check failed, 2 the raids could not be made.
const Q = require('./lib');
(async () => { const b = await Q.launch(); const p = await Q.page(b, { w: 390, h: 844, expose: 'spawnRaid, ITEMS, zombieTypes, danger' }); await Q.newGame(p); await Q.clearCards(p);
  const bad = [], by = {}; let made = 0;
  for (const [era, lvl] of [[0, 3], [1, 8], [2, 13], [3, 18]]) {
    const r = await p.evaluate(({ lvl }) => { const S = ZH.S; S.lvl = lvl; S.day = Math.max(S.day, 8); const out = [], dg = 1 + (ZH.danger() - 1) * .5;
      for (let i = 0; i < 40; i++) { const n0 = S.z.length; ZH.spawnRaid('', false); for (const z of S.z.slice(n0)) if (!z.leader && !z.esc) out.push([z.kind, z.wpn, +(z.pw / dg * ZH.zombieTypes.raider.atk).toFixed(2), ZH.ITEMS[z.wpn].atk]); S.z.length = n0; }
      return out; }, { lvl });
    made += r.length;
    for (const [k, w, hit, atk] of r) { const want = +(5 + .3 * atk).toFixed(2); (by[k] = by[k] || [])[era] = hit; if (Math.abs(hit - want) > .06) { bad.push('era ' + (era + 1) + ' ' + k + ' with ' + w + ': hit ' + hit + ', the weapon gives ' + want); break; } }
  }
  if (!made) { console.log('no raiders were made'); await b.close(); process.exit(2); }
  for (const [k, l] of Object.entries(by)) { console.log(k + ' hit by era: ' + l.join(', ')); if (l.some((v, i) => i && v < l[i - 1])) bad.push(k + ': a later era hits softer'); }
  if (by.thief && by.brute && by.brute.some((v, i) => v <= by.thief[i])) bad.push('a Brute does not hit harder than a Thief');
  console.log(bad.length ? 'FAIL: ' + bad.join('; ') : 'ok: a town raider hits as hard as its weapon'); if (p.errs.length) console.log('page errors:', p.errs.slice(0, 3)); await b.close(); process.exit(bad.length ? 1 : 0);
})();
