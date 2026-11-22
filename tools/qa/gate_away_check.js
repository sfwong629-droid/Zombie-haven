// tools/qa/gate_away_check.js — 3D.294 (overnight branch; owner, 21 Nov, W175): newcomers keep coming while the player is away and wait at
// the gate, a few at most. The check: a town with free beds, the gate clock at 0; a day away puts people at the gate (at most 3, never more
// than the free beds); back in the game the first walks up at once; with no free bed nobody waits. Serve the repo first. Exit 0 ok, 1 failed.
const Q = require('./lib');
(async () => { const b = await Q.launch(); const p = await Q.page(b, { w: 390, h: 844 }); await Q.newGame(p); await Q.clearCards(p);
  const r = await p.evaluate(() => { const S = ZH.S, out = {}; const hide = () => document.querySelectorAll('#eventModal').forEach((m) => { m.style.display = 'none'; });
    S.food = S.water = 50; S.z = S.z.filter((z) => z.human); S.arrivalClock = 0; S.gateWait = 0; out.gap = Math.round(ZH.arriveGap());
    out.room = ZH.popCap() - ZH.popNow(); ZH.awayCredit(1 * 3600e3); hide(); out.after1h = S.gateWait || 0;
    S.gateWait = 0; S.arrivalClock = 0; ZH.awayCredit(24 * 3600e3); hide(); out.after24h = S.gateWait || 0;
    const before = S.gateWait; ZH.visitorArrival(); out.walkedUp = before - (S.gateWait || 0);
    const cap0 = S.sv.length; S.gateWait = 0; S.arrivalClock = 0; const pc = ZH.popCap; out.full = (() => { const extra = []; while (ZH.popNow() < ZH.popCap()) { const q = { ...S.sv[0], name: 'X' + extra.length }; S.sv.push(q); extra.push(q); } ZH.awayCredit(24 * 3600e3); hide(); const w = S.gateWait || 0; S.sv = S.sv.filter((q) => !extra.includes(q)); return w; })();
    return out; });
  console.log(JSON.stringify(r)); const bad = [];
  const want = Math.min(3, r.room, Math.floor(24000 / r.gap));
  if (r.after24h !== want) bad.push('a day away left ' + r.after24h + ' at the gate (wanted ' + want + ': gap ' + r.gap + ' ticks, ' + r.room + ' free beds, at most 3)');
  if (r.after1h > r.after24h) bad.push('an hour away left more at the gate than a day');
  if (r.walkedUp !== 1) bad.push('back in the game, the first one at the gate did not walk up at once');
  if (r.full !== 0) bad.push(r.full + ' waited at the gate of a full town');
  console.log(bad.length ? 'FAIL: ' + bad.join('; ') : 'ok: people wait at the gate while you are away (a few at most, only with free beds), and walk up when you are back'); if (p.errs.length) console.log('page errors:', p.errs.slice(0, 3)); await b.close(); process.exit(bad.length ? 1 : 0);
})();
