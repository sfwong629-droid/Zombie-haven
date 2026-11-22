// tools/qa/first_six_check.js — 3D.297 (overnight branch; owner, 21 Nov, W183): the sixth person arrives in time for level 2.
// The check: with 4 or 5 people the gate brings someone 4 times as often as with 6; and in a new game, welcoming whoever walks up, the town
// has 6 people within the first game day. Serve the repo first (python3 -m http.server 8765). Exit 0 ok, 1 a check failed.
const Q = require('./lib');
(async () => { const b = await Q.launch(); const p = await Q.page(b, { w: 390, h: 844 }); await Q.newGame(p); await Q.clearCards(p);
  const r = await p.evaluate(() => { const S = ZH.S, out = {}; out.gap4 = Math.round(ZH.arriveGap());
    const extra = []; while (ZH.popNow() < 6) { const q = { ...S.sv[0], name: 'Y' + extra.length }; S.sv.push(q); extra.push(q); } out.gap6 = Math.round(ZH.arriveGap()); S.sv = S.sv.filter((q) => !extra.includes(q));
    S.food = S.water = 50; let t = 0; for (; t < 24000 && S.sv.length < 6; t += 20) { ZH.step(20); S.z = S.z.filter((z) => z.human); const btn = [...document.querySelectorAll('#eventModal button')].find((x) => /Welcome/.test(x.textContent)); if (btn) btn.click(); }
    out.people = S.sv.length; out.hours = Math.round(t / 1000); return out; });
  console.log(JSON.stringify(r)); const bad = [];
  if (!(r.gap4 * 3.5 < r.gap6)) bad.push('with 4 people the gate is not about 4 times quicker (' + r.gap4 + ' against ' + r.gap6 + ' ticks)');
  if (r.people < 6) bad.push('only ' + r.people + ' people after ' + r.hours + ' game hours');
  console.log(bad.length ? 'FAIL: ' + bad.join('; ') : 'ok: the fifth and sixth come quickly; 6 people after ' + r.hours + ' game hours'); if (p.errs.length) console.log('page errors:', p.errs.slice(0, 3)); await b.close(); process.exit(bad.length ? 1 : 0);
})();
