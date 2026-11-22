// tools/qa/breather_check.js — 3D.287 (overnight branch; owner, 21 Nov, W176): a breather after a lost night.
// Case 1: someone dies in the night (between 20:00 and 06:00): at 06:00 the breather starts; a boss night due that evening and the next is
// pushed back, and comes on the third evening; the night's crowd is smaller. Case 2: everyone went down and the neighbours came: same.
// Case 3: a night with no loss: no breather, the boss comes on time. Serve the repo first (python3 -m http.server 8765). Exit 0 ok, 1 failed.
const Q = require('./lib');
(async () => { const b = await Q.launch(); const p = await Q.page(b, { w: 390, h: 844 }); await Q.newGame(p); await Q.clearCards(p);
  const r = await p.evaluate(() => { const S = ZH.S, out = {};
    const night = (lose) => { S.graceUntil = 0; S.day = 30; S.hour = 20; S.lvl = 8; S.nextRaid = 1e9; S.help = S.help || {}; ZH.breatherWatch();
      if (lose === 'death') S.fallen = [...(S.fallen || []), { name: 'Test', day: 30 }]; if (lose === 'overrun') S.help = { ...S.help, auto: 33 };
      S.day = 31; S.hour = 6; ZH.breatherWatch(); const on = ZH.graceOn(); S.nextBoss = 31; const bossDays = [];
      for (let d = 31; d <= 34; d++) { S.day = d; S.hour = 17; const nb = S.nextBoss; if (S.day === S.nextBoss) { ZH.eventSchedule(); if (S.nextBoss === nb) bossDays.push(d); } }
      return { on, firstBoss: bossDays[0] || 0 }; };
    out.death = night('death'); out.overrun = night('overrun'); out.none = night(null); return out; });
  console.log(JSON.stringify(r)); const bad = [];
  for (const k of ['death', 'overrun']) { if (!r[k].on) bad.push('no breather after a ' + k + ' night'); if (r[k].firstBoss !== 33) bad.push('after a ' + k + ' night the boss came on day ' + r[k].firstBoss + ' (wanted day 33, after two quiet nights)'); }
  if (r.none.on) bad.push('a breather after a night with no loss'); if (r.none.firstBoss !== 31) bad.push('with no loss the boss came on day ' + r.none.firstBoss + ' (wanted 31)');
  console.log(bad.length ? 'FAIL: ' + bad.join('; ') : 'ok: a lost night gives two quiet nights (boss night pushed back), a good night gives none'); if (p.errs.length) console.log('page errors:', p.errs.slice(0, 3)); await b.close(); process.exit(bad.length ? 1 : 0);
})();
