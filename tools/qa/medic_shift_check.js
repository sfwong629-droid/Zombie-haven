// tools/qa/medic_shift_check.js — 3D.287 healing, part 4 (owner, 20 Nov, W130): the Medic on shift at a medical building.
// They stay while someone is in it or on the way to it, and do rounds when it is empty; with two or more Medics one always stays.
//   1 the Tent is empty, a worker on shift elsewhere is at 62%: the Medic on shift walks out, patches them to 75% and goes back to the Tent;
//   2 a patient is on the way to the Tent or in it: the Medic stays in, the worker is not patched;
//   2b the Medic is walking to a round when a patient sets out: the Medic turns back;
//   3 a second Medic with no shift: that one does the round, the Medic at the Tent stays in.
// Serve the repo first (python3 -m http.server 8765) or set ZH_NOSERVER=1. Exit 0 ok, 1 a check failed.
const Q = require('./lib');
(async () => { const b = await Q.launch(); const p = await Q.page(b, { w: 390, h: 844, expose: 'spawn, zInTown' }); await Q.newGame(p); await Q.clearCards(p);
  const r = await p.evaluate(() => { const S = ZH.S, W = ZH.world, Wd = ZH.Wd, out = {};
    const place = (t) => { const D = Wd.DEFS[t], B = Wd.BUILD; for (let y = B.y0; y <= B.y1; y++) for (let x = B.x0; x <= B.x1; x++) if (Wd.placementCheck(W, x, y, D, null).ok) { const bb = { type: t, x, y, w: D.w, h: D.h, q: D.q, a: D.a, staff: null }; W.buildings.push(bb); Wd.bump(W); ZH.pushUnitsOut(bb); return bb; } return null; };
    const tent = place('medic'), yard = place('water'); out.built = !!(tent && yard); if (!out.built) return out;
    for (const q of S.sv) { if (q.post) { q.post.staff = null; q.post = null; } q.chop = false; } for (const bb of W.buildings) { bb.noStaff = true; bb.manual = true; }
    const crew = S.sv.slice(0, 4), [med, wk, pat, med2] = crew; for (const q of crew) q.job = 'Civilian'; med.job = 'Medic';
    const staff = (bb, q) => { bb.staff = q; q.post = bb; bb.noStaff = false; }; staff(tent, med); staff(yard, wk);
    const busy = () => S.sv.some((q) => q.facility === tent && ['goFacility', 'useFacility'].includes(q.mode));
    const run = (t, each) => { for (let i = 0; i < t; i += 10) { S.hour = 9; S.food = S.water = 40; S.z.length = 0; for (const q of S.sv) { q.hunger = q.thirst = q.fatigue = 0; if (q !== wk && q !== pat) q.hp = q.max; } if (each) each(); ZH.step(10); document.querySelectorAll('#eventModal button').forEach((x) => x.click()); } };
    const c75 = (q) => Math.round(q.max * .75), aiding = (m) => m.mode === 'fieldAid' && m.aidKind === 'patch';
    wk.hp = wk.max; pat.hp = pat.max; run(1500); out.atWork = [med.mode, wk.mode];
    /* 1: the Tent is empty */
    wk.hp = Math.round(wk.max * .62); wk.patchT = 0; S.cloth = 5; S.meds = 0; let out1 = 0; run(3000, () => { pat.hp = pat.max; if (aiding(med)) out1++; });
    out.one = { hp: wk.hp, c75: c75(wk), cloth: S.cloth, aid: out1, back: med.mode };
    /* 2: a patient is on the way or inside (kept hurt, so the Tent stays in use) */
    wk.hp = wk.max; S.cloth = 5; let aidBusy = 0, seen = 0;
    pat.hp = Math.round(pat.max * .4); run(400, () => { pat.hp = Math.round(pat.max * .4); });   /* the patient sets out first */
    let streak = 0; wk.hp = Math.round(wk.max * .62); wk.patchT = 0; run(2500, () => { pat.hp = Math.round(pat.max * .4); if (busy()) { seen++; if (aiding(med) && med.aidT === 0) { if (++streak > 2) aidBusy++; } else streak = 0; } else streak = 0; });   /* the patient is kept hurt and now and then steps out and sets off again: a dressing the Medic had begun in that gap may be finished, but the Medic may not be walking to a round */
    out.two = { seen, aidBusy, cloth: S.cloth, hp: wk.hp, c75: c75(wk) };
    /* 2b: the Medic is walking to a round when a patient sets out for the Tent: the Medic turns back */
    pat.hp = pat.max; if (['goFacility', 'useFacility'].includes(pat.mode)) { pat.mode = 'free'; pat.facility = null; pat.stateTicks = 0; pat.activity = null; } wk.hp = wk.max; run(600, () => { pat.hp = pat.max; });
    wk.hp = Math.round(wk.max * .62); wk.patchT = 0; med.w = { ...Wd.doorPoint(tent) }; let walking = false, late = 0, since = -1;
    run(2500, () => { if (!walking) { pat.hp = pat.max; if (aiding(med) && med.aidT === 0) { walking = true; pat.hp = Math.round(pat.max * .4); pat.mode = 'free'; pat.stateTicks = 0; } return; }
      pat.hp = Math.round(pat.max * .4); if (busy()) { since++; if (since > 3 && aiding(med) && med.aidT === 0) late++; } });
    out.back = { walking, late, since };
    /* 3: a second Medic with no shift */
    pat.hp = pat.max; if (['goFacility', 'useFacility'].includes(pat.mode)) { pat.mode = 'free'; pat.facility = null; pat.stateTicks = 0; pat.activity = null; } run(600, () => { pat.hp = pat.max; });
    med2.job = 'Medic'; wk.hp = Math.round(wk.max * .62); wk.patchT = 0; S.cloth = 5; let a1 = 0, a2 = 0; run(3000, () => { pat.hp = pat.max; if (aiding(med)) a1++; if (aiding(med2)) a2++; });
    out.three = { hp: wk.hp, c75: c75(wk), stayed: a1, second: a2, cloth: S.cloth }; return out; });
  console.log(JSON.stringify(r)); const bad = [];
  if (!r.built) bad.push('could not place the test buildings');
  else { if (r.atWork[0] !== 'work' || r.atWork[1] !== 'work') bad.push('the Medic and the worker were not at work: ' + r.atWork.join(','));
    if (r.one.hp < r.one.c75 || !r.one.aid) bad.push(`empty Tent: the Medic on shift did not patch the worker (${r.one.hp}, wanted ${r.one.c75})`);
    if (r.one.cloth !== 4) bad.push('empty Tent: the round should use 1 cloth, used ' + (5 - r.one.cloth));
    if (!['work', 'goWork'].includes(r.one.back)) bad.push('the Medic did not go back to the Tent after the round: ' + r.one.back);
    if (r.two.seen < 100) bad.push('the patient was not at the Tent for the test (' + r.two.seen + ' samples)');
    if (r.two.aidBusy) bad.push('the Medic was walking to a round while someone was in the Tent or on the way');
    if (!r.back.walking || r.back.since < 50) bad.push('turn back: the test did not catch the Medic walking out (' + JSON.stringify(r.back) + ')'); else if (r.back.late) bad.push('the Medic kept walking to a round after a patient set out for the Tent');
    if (r.three.stayed) bad.push('with a second Medic free, the Medic at the Tent still left on a round');
    if (!r.three.second || r.three.hp < r.three.c75) bad.push('the second Medic did not do the round'); }
  console.log(bad.length ? 'FAIL: ' + bad.join('; ') : 'ok: the Medic on shift does rounds when the Tent is empty, stays in while it is used, and stays in when another Medic can do the rounds'); if (p.errs.length) console.log('page errors:', p.errs.slice(0, 3)); await b.close(); process.exit(bad.length ? 1 : 0);
})();
