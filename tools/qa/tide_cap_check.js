// tools/qa/tide_cap_check.js — 3D.274 (owner, 21 Nov, W176): The Tide keeps the limit of 60 standing and its size follows the level.
// The check starts The Tide at level 15 and runs its night (21:00 to 02:00): (1) with nobody killed, never more than 60 zombies stand
// (the boss counts); (2) with a town that kills, the whole Tide arrives; (3) The Tide is the same size at level 15 on day 60 and on day 400,
// and smaller at level 15 than at level 20. Serve the repo first (python3 -m http.server 8765). Exit 0 ok, 1 a check failed.
const Q = require('./lib');
(async () => { const b = await Q.launch(); const p = await Q.page(b, { w: 390, h: 844 }); await Q.newGame(p); await Q.clearCards(p);
  const r = await p.evaluate(() => { const S = ZH.S, out = {}; for (const q of S.sv) { q.max = q.hp = 99999; }
    const standing = () => S.z.filter((z) => z.hp > 0 && !z.human).length;
    const night = (lvl, day, kill) => { S.z.length = 0; S.bossOn = null; S.vanguard = null; S.mobLeft = 0; S.lvl = lvl; S.day = day; S.nextBoss = day + 9; S.nextRaid = 1e9; S.grace = 0; S.graceUntil = 0;
      S.crisis = { k: 'tide', day0: day - 1, lost: 0 }; ZH.CRISES.tide.start(S.crisis); S.day = S.crisis.night; let peak = 0, queued = 0, came = 0; const seen = new Set();
      S.hour = 20; let q0 = 0;   /* the game's own clock runs the night: 20:00 to about 03:00 */
      for (let i = 0; i < 350; i++) { ZH.step(20); if (S.crisis) { if ((S.crisis.q || 0) > q0) queued += S.crisis.q - q0; q0 = S.crisis.q || 0; } for (const z of S.z) if (z.mob && !seen.has(z)) { seen.add(z); came++; } peak = Math.max(peak, standing());
        if (kill) { const zs = S.z.filter((z) => z.hp > 0 && !z.human && !z.boss); for (let k = 0; k < zs.length - 40; k++) zs[k].hp = 0; S.z = S.z.filter((z) => z.hp > 0 || z.boss); } }
      const left = S.crisis ? (S.crisis.q || 0) : 0; S.crisis = null; return { queued, came, peak, left }; };
    out.idle = night(15, 60, false); out.kill = night(15, 60, true); out.late = night(15, 400, true); out.top = night(20, 60, true); return out; });
  console.log(JSON.stringify(r)); const bad = [];
  if (r.idle.peak > 61) bad.push(r.idle.peak + ' zombies stood at once with nobody killing (limit 60, the boss apart)');
  if (r.kill.left > 0) bad.push('with a town that kills, only ' + r.kill.came + ' of the Tide\'s ' + r.kill.queued + ' arrived (' + r.kill.left + ' left in the queue)');
  if (r.kill.queued !== r.late.queued) bad.push('The Tide at level 15 is ' + r.kill.queued + ' on day 60 and ' + r.late.queued + ' on day 400: it should not grow with the days');
  if (!(r.top.queued > r.kill.queued)) bad.push('The Tide at level 20 (' + r.top.queued + ') is not bigger than at level 15 (' + r.kill.queued + ')');
  console.log(bad.length ? 'FAIL: ' + bad.join('; ') : 'ok: The Tide keeps to 60 standing, all of it arrives when the town fights, and its size follows the level'); if (p.errs.length) console.log('page errors:', p.errs.slice(0, 3)); await b.close(); process.exit(bad.length ? 1 : 0);
})();
