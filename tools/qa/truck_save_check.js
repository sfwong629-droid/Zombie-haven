// tools/qa/truck_save_check.js — 3D.303: save and reload while a Greenwater medic is carrying someone (the medic and the person point at
// each other, which once made the save fail). The save must work, the medic must pick the same person up again, and everyone must end in care.
// Serve the repo first (python3 -m http.server 8765) or set ZH_NOSERVER=1. Exit 0 ok, 1 a check failed.
const Q = require('./lib');
(async () => { const b = await Q.launch(); const p = await Q.page(b, { expose: 'serialize, applySave, truckAt' }); await Q.newGame(p); await Q.clearCards(p);
  const r = await p.evaluate(() => { let S = ZH.S; const camp = ZH.world.buildings[0]; ZH.ARRIVE.low = ZH.ARRIVE.high = 1e9; S.z.length = 0;
    S.sv.forEach((q, i) => { q.hp = 0; q.mode = 'down'; q.w = { x: camp.x + 5 + i, y: camp.y + 5 }; }); S.help = { coming: ZH.tick + 1 };
    for (let k = 0; k < 400; k++) { S.hour = 12; ZH.step(10); document.querySelectorAll('#eventModal button').forEach((x) => x.click()); const T = S.truck; if (T && T.medics && T.medics.some((m) => m.mode === 'rescueCarry')) break; }
    const data = ZH.serialize(); let err = null; try { ZH.applySave(data); } catch (e) { err = String(e); }
    S = ZH.S; const out = { err, truck: !!S.truck, leg: S.truck && S.truck.leg, medics: S.truck && S.truck.medics && S.truck.medics.map((m) => m.mode + ':' + m.carryId) };
    for (let k = 0; k < 800 && S.truck && S.truck.leg === 'stop'; k++) { S.hour = 12; ZH.step(10); document.querySelectorAll('#eventModal button').forEach((x) => x.click()); }
    out.after = S.truck ? S.truck.leg : 'gone'; out.modes = S.sv.map((q) => q.mode); return out; });
  console.log(JSON.stringify(r)); const bad = [];
  if (r.err) bad.push('loading failed: ' + r.err); if (!r.truck || r.leg !== 'stop') bad.push('the truck was not parked after loading');
  if (!(r.medics || []).some((m) => /^rescueCarry:\d/.test(m))) bad.push('no medic was still carrying someone after loading: ' + JSON.stringify(r.medics));
  if (r.after === 'stop') bad.push('the truck never left after loading'); if (r.modes.includes('down')) bad.push('someone was left lying down: ' + r.modes.join(','));
  console.log(bad.length ? 'FAIL: ' + bad.join('; ') : 'ok: a save made mid-carry loads, the medic carries on, and everyone ends in care'); if (p.errs.length) console.log('page errors:', p.errs.slice(0, 3)); await b.close(); process.exit(bad.length ? 1 : 0); })();
