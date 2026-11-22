// tools/qa/tent_first_check.js — 3D.285 healing, part 2 (owner, 20 Nov, W130): "the tent first".
// With no zombie in town, anyone under 80% health (or with a field wound) walks to a medical building with room, in free time,
// and stays until fully healed; the wound is treated there. People on a shift do not go; with a zombie in town nobody sets out.
// The check builds a Medical Tent, hurts the town (to 50%, then 70%) and watches:
//   1 lunch hour, calm: everyone ends at full health, the wound is treated, never more than two in the Tent at once;
//   2 a zombie stands in town: nobody sets out for the Tent;  3 shift hours, calm: the worker on shift stays, the others go.
// Serve the repo first (python3 -m http.server 8765) or set ZH_NOSERVER=1. Exit 0 ok, 1 a check failed.
const Q = require('./lib');
(async () => { const b = await Q.launch(); const p = await Q.page(b, { w: 390, h: 844, expose: 'spawn, zInTown, TENT_PCT' }); await Q.newGame(p); await Q.clearCards(p);
  const r = await p.evaluate(() => { const S = ZH.S, W = ZH.world, Wd = ZH.Wd, out = { pct: ZH.TENT_PCT };
    const place = (t) => { const D = Wd.DEFS[t], B = Wd.BUILD; for (let y = B.y0; y <= B.y1; y++) for (let x = B.x0; x <= B.x1; x++) if (Wd.placementCheck(W, x, y, D, null).ok) { const bb = { type: t, x, y, w: D.w, h: D.h, q: D.q, a: D.a, staff: null }; W.buildings.push(bb); Wd.bump(W); ZH.pushUnitsOut(bb); return bb; } return null; };
    const tent = place('medic'); out.tent = !!tent; if (!tent) return out;
    for (const q of S.sv) { if (q.post) { q.post.staff = null; q.post = null; } q.chop = false; } for (const bb of W.buildings) bb.noStaff = true;   /* nobody has a job yet: free time all day */
    const atTent = (q) => q.facility === tent && ['goFacility', 'useFacility'].includes(q.mode), inTent = () => S.sv.filter((q) => q.facility === tent && q.mode === 'useFacility').length;
    const run = (t, hr, each) => { for (let i = 0; i < t; i += 10) { S.hour = hr; S.food = S.water = 40; for (const q of S.sv) q.hunger = q.thirst = q.fatigue = 0; if (each) each(); ZH.step(10); document.querySelectorAll('#eventModal button').forEach((x) => x.click()); } };
    const hurt = (f) => { for (const q of S.sv) { q.wounded = false; q.hp = Math.round(q.max * f); q.lastFacility = null; q.avoid = null; q.visits = []; if (['goFacility', 'useFacility'].includes(q.mode)) { q.mode = 'free'; q.facility = null; q.stateTicks = 0; q.activity = null; } } };
    /* 1: calm, free time */
    S.z.length = 0; hurt(.5); const first = new Set(S.sv.map((q) => q.id)), w = S.sv[0]; w.wounded = true; let most = 0, went = new Set();
    run(14000, 12, () => { S.z.length = 0; most = Math.max(most, inTent()); for (const q of S.sv) if (atTent(q)) went.add(q.id); });
    out.calm = S.sv.filter((q) => first.has(q.id)).map((q) => ({ hp: q.hp, max: q.max, went: went.has(q.id) }));   /* a newcomer who walked in during the run was never hurt */ out.wound = w.wounded; out.most = most;
    /* 2: a zombie stands in town (kept rising out of the ground, so it hits nobody) */
    hurt(.7); ZH.spawn(); const z = S.z[S.z.length - 1], camp = W.buildings[0]; let set = 0;
    run(1500, 12, () => { z.w = { x: camp.x + 3.5, y: camp.y + 3.5 }; z.mode = 'appear'; z.stateTicks = 9999; z.hp = z.max = 1e9; for (const q of S.sv) if (atTent(q)) set++; });
    out.inTown = ZH.zInTown(); out.setOut = set;
    /* 3: shift hours: one person works at the Tent; hurt to 70% they stay on the job, the others go */
    S.z.length = 0; hurt(1); const med = S.sv[1]; tent.staff = med; med.post = tent; tent.manual = true; tent.noStaff = false;
    run(1500, 9, () => { S.z.length = 0; }); out.onShift = ZH.onShift(med); out.working = med.mode;
    hurt(.7); med.mode = 'work'; med.stateTicks = 5000; went = new Set(); let left = 0;
    run(1500, 9, () => { S.z.length = 0; for (const q of S.sv) if (atTent(q)) went.add(q.id); if (!['work', 'goWork', 'fieldAid'].includes(med.mode)) left++; });
    out.shiftWent = went.has(med.id); out.shiftLeft = left; out.othersWent = S.sv.filter((q) => q !== med && went.has(q.id)).length; out.n = S.sv.length; return out; });
  console.log(JSON.stringify(r)); const bad = [];
  if (!r.tent) bad.push('could not place a Medical Tent');
  else { if (r.pct !== .8) bad.push('the bar should be 80%, is ' + r.pct);
    for (const c of r.calm) { if (c.hp !== c.max) bad.push(`calm town: someone ended at ${c.hp}/${c.max}, not fully healed`); if (!c.went) bad.push('calm town: someone under 80% never went to the Tent'); }
    if (r.wound) bad.push('the field wound was not treated at the Tent');
    if (r.most > 2) bad.push('more people in the Tent than it has room for: ' + r.most); if (r.most < 1) bad.push('nobody was ever seen inside the Tent');
    if (!r.inTown) bad.push('the test zombie was not inside the town');
    if (r.setOut) bad.push('people set out for the Tent with a zombie in town');
    if (!r.onShift) bad.push('the test worker was not on shift (was ' + r.working + ')');
    if (r.shiftWent || r.shiftLeft) bad.push('the worker on shift left the job for the Tent at 70% health');
    if (r.othersWent < 1) bad.push('during shift hours nobody without a job went to the Tent'); }
  console.log(bad.length ? 'FAIL: ' + bad.join('; ') : 'ok: under 80% and the town quiet → the Tent, full healing, wound treated, room kept; nobody sets out with a zombie in town; a worker on shift stays'); if (p.errs.length) console.log('page errors:', p.errs.slice(0, 3)); await b.close(); process.exit(bad.length ? 1 : 0);
})();
