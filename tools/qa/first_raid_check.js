// tools/qa/first_raid_check.js — 3D.298 (overnight branch, W183 first-30-minute fix 4): no raiders in the first sitting.
// Runs the raid schedule hour by hour from game day 4 to day 9 at level 1, then at level 3. At levels 1 and 2 no raid may start; once the town
// is level 3 the first raid comes within about 1.5 game days. The Town panel line says when raiders come.
// Serve the repo first (python3 -m http.server 8765). Exit 0 ok, 1 failed.
const Q = require('./lib');
(async () => { const b = await Q.launch(); const p = await Q.page(b, { w: 390, h: 844 }); await Q.newGame(p); await Q.clearCards(p);
  const r = await p.evaluate(() => { const S = ZH.S, out = {};
    const run = (lvl, from, to) => { S.lvl = lvl; S.graceUntil = 0; S.nextBoss = 999; let raids = 0, first = 0; const n0 = S.z.filter((z) => z.human).length;
      for (let d = from; d <= to; d++) for (let h = 0; h < 24; h++) { S.day = d; S.hour = h; const before = S.z.filter((z) => z.human).length; ZH.eventSchedule();
        if (S.z.filter((z) => z.human).length > before) { raids++; if (!first) first = d + h / 24; S.z = S.z.filter((z) => !z.human); } }
      return { raids, first, open: ZH.raidsOpen() }; };
    S.nextRaid = 4; out.l1 = run(1, 4, 9); out.l2 = run(2, 10, 12);
    out.l3 = run(3, 13, 20); out.first3 = out.l3.first - 13; return out; });
  console.log(JSON.stringify(r)); const bad = [];
  if (r.l1.raids) bad.push(r.l1.raids + ' raids at level 1'); if (r.l2.raids) bad.push(r.l2.raids + ' raids at level 2');
  if (!r.l3.raids) bad.push('no raid at level 3 in 8 days'); else if (r.first3 > 1.6) bad.push('first raid ' + r.first3.toFixed(2) + ' days after level 3 (wanted within 1.5)');
  console.log(bad.length ? 'FAIL: ' + bad.join('; ') : 'ok: no raiders at levels 1 and 2; the first comes within a day and a half of level 3'); if (p.errs.length) console.log('page errors:', p.errs.slice(0, 3)); await b.close(); process.exit(bad.length ? 1 : 0);
})();
