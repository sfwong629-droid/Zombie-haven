// tools/qa/finale_cap_check.js — 3D.289 (overnight branch; owner, 21 Nov, W176): the last stand keeps the limit of 60 standing and its
// size follows the level. The check runs last-stand nights at level 16 on the game's own clock (20:00 to about 05:00):
// (1) night 3 (two bosses and the biggest horde) with nobody killed: never more than 60 stand; (2) night 1 with a town that kills: the whole
// queue has arrived by 05:00; (3) the night's horde is the same size on day 100 and day 400. Serve the repo first. Exit 0 ok, 1 failed.
const Q = require('./lib');
(async () => { const b = await Q.launch(); const p = await Q.page(b, { w: 390, h: 844 }); await Q.newGame(p); await Q.clearCards(p);
  const r = await p.evaluate(() => { const S = ZH.S, out = {}; for (const q of S.sv) { q.max = q.hp = 99999; }
    const standing = () => S.z.filter((z) => z.hp > 0 && !z.human).length;
    const night = (day, nightNo, kill) => { S.z.length = 0; S.bossOn = null; S.vanguard = null; S.mobLeft = 0; S.crisis = null; S.won = null; S.lvl = 16; S.day = day; S.hour = 20; S.nextBoss = day + 9; S.nextRaid = 1e9;
      S.finale = { day: day - nightNo, night: nightNo - 1, lost0: 0, pop0: 2 }; let peak = 0, queued = 0, seenQ = false;
      for (let i = 0; i < 430; i++) { ZH.step(20); const f = S.finale; if (f && f.q && f.q.length && !seenQ && S.hour >= 21) { seenQ = true; queued = f.q.length; } peak = Math.max(peak, standing());
        if (kill) { const zs = S.z.filter((z) => z.hp > 0 && !z.human && !z.boss); for (let k = 0; k < zs.length - 40; k++) zs[k].hp = 0; S.z = S.z.filter((z) => z.hp > 0 || z.boss); }
        if (S.hour === 5) break; }
      const left = S.finale && S.finale.q ? S.finale.q.length : 0; S.finale = null; return { queued, peak, left }; };
    out.idle3 = night(100, 3, false); out.kill1 = night(100, 1, true); out.late1 = night(400, 1, true); return out; });
  console.log(JSON.stringify(r)); const bad = [];
  if (r.idle3.peak > 60) bad.push(r.idle3.peak + ' stood at once on the last night with nobody killing (limit 60)');
  if (!(r.kill1.queued > 20)) bad.push('the first night queued only ' + r.kill1.queued);
  if (r.kill1.left > 0) bad.push('with a town that kills, ' + r.kill1.left + ' of the first night\'s ' + r.kill1.queued + ' never arrived');
  if (r.kill1.queued !== r.late1.queued) bad.push('the first night is ' + r.kill1.queued + ' on day 100 and ' + r.late1.queued + ' on day 400: it should not grow with the days');
  console.log(bad.length ? 'FAIL: ' + bad.join('; ') : 'ok: the last stand keeps to 60 standing, its horde arrives when the town fights, and its size follows the level'); if (p.errs.length) console.log('page errors:', p.errs.slice(0, 3)); await b.close(); process.exit(bad.length ? 1 : 0);
})();
