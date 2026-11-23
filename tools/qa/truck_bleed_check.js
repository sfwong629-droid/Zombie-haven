// tools/qa/truck_bleed_check.js — 3D.326 (owner, 23 Nov): the truck also comes when someone is bleeding out and nobody can reach them.
// One survivor down with little bleed time and no rescuer, the rest standing: the truck is called. With a rescuer on the way, or with
// plenty of bleed time, it is not. The 3-day limit still holds. Serve the repo first (python3 -m http.server 8765).
const Q = require('./lib');
(async () => { const b = await Q.launch(); const p = await Q.page(b, { w: 390, h: 844 }); await Q.newGame(p); await Q.clearCards(p);
  const r = await p.evaluate(() => { const S = ZH.S, out = {}; S.day = 20; const q = S.sv[0], o = S.sv[1];
    const reset = () => { S.help = {}; q.mode = 'down'; q.hp = 0; q.stable = false; q.rescuer = null; };
    reset(); q.bleed = 5000; ZH.helpTick(); out.plenty = !!S.help.coming;
    reset(); q.bleed = 1000; q.rescuer = o; ZH.helpTick(); out.rescuer = !!S.help.coming;
    reset(); q.bleed = 1000; ZH.helpTick(); out.call = !!S.help.coming; out.auto = S.help.auto;
    S.help.coming = 0; q.stable = false; q.bleed = 1000; ZH.helpTick(); out.again = !!S.help.coming;
    q.mode = 'free'; q.hp = q.max; S.help = {}; return out; });
  console.log(JSON.stringify(r)); const bad = [];
  if (r.plenty) bad.push('called with plenty of bleed time'); if (r.rescuer) bad.push('called with a rescuer on the way'); if (!r.call) bad.push('not called for someone bleeding out alone');
  if (r.again) bad.push('called again within 3 days');
  console.log(bad.length ? 'FAIL: ' + bad.join('; ') : 'ok: the truck comes for someone bleeding out with nobody coming; not when help is on the way or there is time; once in 3 days'); if (p.errs.length) console.log('page errors:', p.errs.slice(0, 3)); await b.close(); process.exit(bad.length ? 1 : 0);
})();
