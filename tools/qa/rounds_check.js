// tools/qa/rounds_check.js — 3D.286 healing, part 3 (owner, 20 Nov, W130): "rounds fill the gaps".
// A Medic's round patches to 75% (was 60%), costs 1 cloth (or a little medicine), and is only for people who cannot go to a medical building.
//   1 no medical building: the Medic patches everyone under 75% to 75%, 1 cloth each; a field wound is patched to 60% only;
//   2 a Medical Tent with room, free time: the Medic patches nobody (they walk to the Tent);
//   3 the Tent is there but the patient is on shift: the Medic patches them at work, and they stay on the job;
//   4 no cloth and no medicine: no patching.
// Serve the repo first (python3 -m http.server 8765) or set ZH_NOSERVER=1. Exit 0 ok, 1 a check failed.
const Q = require('./lib');
(async () => { const b = await Q.launch(); const p = await Q.page(b, { w: 390, h: 844, expose: 'spawn, zInTown, PATCH_CAP' }); await Q.newGame(p); await Q.clearCards(p);
  const r = await p.evaluate(() => { const S = ZH.S, W = ZH.world, Wd = ZH.Wd, out = { cap: ZH.PATCH_CAP };
    const place = (t) => { const D = Wd.DEFS[t], B = Wd.BUILD; for (let y = B.y0; y <= B.y1; y++) for (let x = B.x0; x <= B.x1; x++) if (Wd.placementCheck(W, x, y, D, null).ok) { const bb = { type: t, x, y, w: D.w, h: D.h, q: D.q, a: D.a, staff: null }; W.buildings.push(bb); Wd.bump(W); ZH.pushUnitsOut(bb); return bb; } return null; };
    for (const q of S.sv) { if (q.post) { q.post.staff = null; q.post = null; } q.chop = false; } for (const bb of W.buildings) bb.noStaff = true;
    const crew = S.sv.slice(0, 4), med = crew[0], rest = crew.slice(1); med.job = 'Medic'; for (const q of rest) if (q.job === 'Medic') q.job = 'Civilian';
    let aid = 0; const run = (t, hr, each) => { for (let i = 0; i < t; i += 10) { S.hour = hr; S.food = S.water = 40; S.z.length = 0; for (const q of S.sv) q.hunger = q.thirst = q.fatigue = 0; med.hp = med.max; if (med.mode === 'fieldAid' && med.aidKind === 'patch') aid++; if (each) each(); ZH.step(10); document.querySelectorAll('#eventModal button').forEach((x) => x.click()); } };
    const hurt = (f) => { for (const q of rest) { q.wounded = false; q.patchT = 0; q.hp = Math.round(q.max * f); q.lastFacility = null; q.avoid = null; q.visits = []; if (['goFacility', 'useFacility'].includes(q.mode)) { q.mode = 'free'; q.facility = null; q.stateTicks = 0; q.activity = null; } } };
    const c75 = (q) => Math.round(q.max * .75), c60 = (q) => Math.round(q.max * .6);
    /* 4 first (nothing to patch with) */
    hurt(.5); S.cloth = 0; S.meds = 0; aid = 0; run(1500, 12); out.none = { aid, hp: rest.map((q) => q.hp >= c75(q)) };
    /* 1: no medical building */
    hurt(.5); rest[0].wounded = true; S.cloth = 5; S.meds = 0; aid = 0; let low = rest.map(() => 1e9); run(4500, 12, () => rest.forEach((q, i) => { low[i] = Math.min(low[i], q.hp); }));
    out.noTent = rest.map((q) => ({ hp: q.hp, c75: c75(q), c60: c60(q), max: q.max, wounded: q.wounded })); out.clothUsed = 5 - S.cloth; out.aid1 = aid;
    /* 2: a Tent with room, free time */
    const tent = place('medic'); out.tent = !!tent; if (!tent) return out; tent.noStaff = true;
    hurt(.5); rest[2].hp = rest[2].max; S.cloth = 5; aid = 0; let went = new Set();   /* two hurt: the Tent has room for two (a third would find it full, and a full Tent is a reason for a round) */ run(2500, 12, () => { for (const q of rest) if (q.facility === tent && ['goFacility', 'useFacility'].includes(q.mode)) went.add(q.id); });
    out.withTent = { aid, cloth: S.cloth, went: went.size };
    /* 3: the patient works a shift at the Tent (hurt to 70%: above the bar for leaving work) */
    hurt(1); const wk = rest[1]; tent.staff = wk; wk.post = tent; tent.manual = true; tent.noStaff = false; run(1500, 9); out.onShift = ZH.onShift(wk) && wk.mode === 'work';
    hurt(1); wk.hp = Math.round(wk.max * .7); S.cloth = 5; aid = 0; let left = 0; run(3000, 9, () => { if (['goFacility', 'useFacility'].includes(wk.mode)) left++; });
    out.shift = { hp: wk.hp, c75: c75(wk), left, cloth: S.cloth, aid }; return out; });
  console.log(JSON.stringify(r)); const bad = [];
  if (r.cap !== .75) bad.push('a round should patch to 75%, is ' + r.cap);
  if (r.none.aid || r.none.hp.some(Boolean)) bad.push('patching happened with no cloth and no medicine');
  r.noTent.forEach((c, i) => { if (i === 0) { if (c.hp > c.c60) bad.push(`no Tent: the field wound was patched past 60% (${c.hp}/${c.max})`); if (c.hp < c.c60) bad.push(`no Tent: the wounded person was not patched to 60% (${c.hp}/${c.max})`); } else { if (c.hp < c.c75) bad.push(`no Tent: someone was not patched to 75% (${c.hp}/${c.max})`); if (c.hp >= c.max) bad.push('no Tent: someone was healed fully by a round'); } });
  if (r.clothUsed !== 3) bad.push('three rounds should use 3 cloth, used ' + r.clothUsed);
  if (!r.tent) bad.push('could not place a Medical Tent');
  else { if (r.withTent.aid || r.withTent.cloth !== 5) bad.push('the Medic patched people who could walk to the Tent');
    if (r.withTent.went < 2) bad.push('nobody walked to the Tent');
    if (!r.onShift) bad.push('the test worker was not working a shift');
    if (r.shift.hp < r.shift.c75) bad.push(`the worker on shift was not patched to 75% (${r.shift.hp})`);
    if (r.shift.left) bad.push('the worker on shift left the job');
    if (r.shift.cloth !== 4) bad.push('patching the worker should use 1 cloth, used ' + (5 - r.shift.cloth)); }
  console.log(bad.length ? 'FAIL: ' + bad.join('; ') : 'ok: rounds patch to 75% for 1 cloth; a field wound stops at 60%; nobody who can walk to the Tent is patched; a worker on shift is patched at work'); if (p.errs.length) console.log('page errors:', p.errs.slice(0, 3)); await b.close(); process.exit(bad.length ? 1 : 0);
})();
