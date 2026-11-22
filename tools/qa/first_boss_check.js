// tools/qa/first_boss_check.js — 3D.299 (overnight branch, W183 first-30-minute fix 5): the first small boss night at about minute 20 to 25.
// A new game: runs the game's hourly schedule from day 1 08:00 and notes when the first horde starts, how big it is, and the boss's softening.
// Minutes of open play = game hours x 17 s. Wanted: minute 20 to 26, a horde of at most 24, the gentle era-1 boss.
// Serve the repo first (python3 -m http.server 8765). Exit 0 ok, 1 failed.
const Q = require('./lib');
(async () => { const b = await Q.launch(); const p = await Q.page(b, { w: 390, h: 844 }); await Q.newGame(p); await Q.clearCards(p);
  const r = await p.evaluate(() => { const S = ZH.S, out = { nextBoss: S.nextBoss, day0: S.day, hour0: S.hour };
    let hrs = 0; for (let d = S.day; d <= 8 && !out.at; d++) for (let h = d === out.day0 ? out.hour0 : 0; h < 24; h++) { S.day = d; S.hour = h; ZH.eventSchedule();
      if (S.vanguard && !out.at) { out.at = d + ':' + h; out.hours = hrs; out.min = Math.round(hrs * 17 / 60); out.mob = S.vanguard.mob; break; } hrs++; }
    return out; });
  console.log(JSON.stringify(r)); const bad = [];
  if (r.nextBoss !== 4) bad.push('a new game has its first boss on day ' + r.nextBoss + ' (wanted 4)');
  if (!r.at) bad.push('no boss night by day 8'); else { if (r.min < 20 || r.min > 26) bad.push('first boss night at minute ' + r.min + ' (wanted 20 to 26)'); if (r.mob > 24) bad.push('first horde ' + r.mob + ' (wanted at most 24)'); }
  console.log(bad.length ? 'FAIL: ' + bad.join('; ') : 'ok: the first boss night starts at minute ' + r.min + ' of open play with a horde of ' + r.mob); if (p.errs.length) console.log('page errors:', p.errs.slice(0, 3)); await b.close(); process.exit(bad.length ? 1 : 0);
})();
