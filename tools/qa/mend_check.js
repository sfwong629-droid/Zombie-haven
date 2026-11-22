// tools/qa/mend_check.js — 3D.284 healing, part 1 (owner, 20 Nov, W130): "a slow mend with no zombie about".
// Everyone on their feet in town gets 2% of their health back each game hour while no zombie is inside the town.
// The check hurts the town to 70% (above every other kind of healing a new town has), runs three game hours and counts:
//   1 calm town: each person gains 3 x 2%;  2 a zombie stands in town: nobody gains;  3 starving: no gain;
//   4 a field wound still stops at its limit;  5 someone lying down does not mend.
// Serve the repo first (python3 -m http.server 8765) or set ZH_NOSERVER=1. Exit 0 ok, 1 a check failed.
const Q = require('./lib');
(async () => { const b = await Q.launch(); const p = await Q.page(b, { w: 390, h: 844, expose: 'spawn, zInTown, MEND_PCT' }); await Q.newGame(p); await Q.clearCards(p);
  const r = await p.evaluate(() => { const S = ZH.S, out = { pct: ZH.MEND_PCT };
    const rest = () => { for (const q of S.sv) { q.hunger = q.thirst = q.fatigue = 0; } };
    const run = (t, each) => { for (let i = 0; i < t; i += 20) { S.hour = 10; rest(); if (each) each(); ZH.step(20); document.querySelectorAll('#eventModal button').forEach((x) => x.click()); } };
    const hurt = (f) => S.sv.map((q) => { q.wounded = false; q.hp = Math.round(q.max * f); return q.hp; });
    const step1 = (q) => Math.max(1, Math.round(q.max * ZH.MEND_PCT));
    /* 1: a calm town */
    S.z.length = 0; let h0 = hurt(.7); run(3000, () => { S.z.length = 0; });
    out.calm = S.sv.map((q, i) => ({ gain: q.hp - h0[i], want: 3 * step1(q) }));
    /* 2: a zombie stands inside the town the whole time (kept rising out of the ground, so it hits nobody) */
    h0 = hurt(.7); ZH.spawn(); const z = S.z[S.z.length - 1], camp = ZH.world.buildings[0]; z.hp = z.max = 1e9;
    run(3000, () => { z.w = { x: camp.x + 3.5, y: camp.y + 3.5 }; z.mode = 'appear'; z.stateTicks = 9999; z.hp = 1e9; });
    out.inTown = ZH.zInTown(); out.danger = S.sv.map((q, i) => q.hp - h0[i]);
    /* 3: starving */
    S.z.length = 0; h0 = hurt(.7); const run3 = () => { for (let i = 0; i < 3000; i += 20) { S.hour = 10; for (const q of S.sv) { q.hunger = 100; q.thirst = 0; q.fatigue = 0; } S.food = 0; S.z.length = 0; ZH.step(20); document.querySelectorAll('#eventModal button').forEach((x) => x.click()); } }; run3();
    out.starve = S.sv.map((q, i) => q.hp - h0[i]); S.food = 40;
    /* 4: a field wound stops at its limit (60%)   5: someone lying down does not mend */
    hurt(.7); const w = S.sv[0], d = S.sv[1]; w.wounded = true; w.hp = Math.round(w.max * .58); d.hp = 0; d.mode = 'down'; d.stable = true; d.bleed = 1e9;
    run(3000, () => { S.z.length = 0; d.mode = 'down'; d.stable = true; d.rescuer = null; for (const q of S.sv) if (q !== d && ['rescueTo', 'rescueCarry', 'fieldAid'].includes(q.mode)) { q.mode = 'free'; q.rescuing = null; q.carrying = null; q.aidTo = null; } });
    out.wound = { hp: w.hp, cap: Math.round(w.max * .6) }; out.down = d.hp; return out; });
  console.log(JSON.stringify(r)); const bad = [];
  if (r.pct !== .02) bad.push('the mend should be 2% an hour, is ' + r.pct);
  for (const c of r.calm) if (c.gain !== c.want) bad.push(`calm town: someone gained ${c.gain} in three hours, expected ${c.want}`);
  if (!r.inTown) bad.push('the test zombie was not inside the town');
  if (r.danger.some((g) => g > 0)) bad.push('people mended with a zombie in town: ' + r.danger.join(','));
  if (r.starve.some((g) => g > 0)) bad.push('starving people mended: ' + r.starve.join(','));
  if (r.wound.hp > r.wound.cap) bad.push(`a field wound mended past its limit: ${r.wound.hp} > ${r.wound.cap}`);
  if (r.wound.hp < r.wound.cap) bad.push(`a field wound did not mend up to its limit: ${r.wound.hp} < ${r.wound.cap}`);
  if (r.down > 0) bad.push('someone lying down mended by themselves');
  console.log(bad.length ? 'FAIL: ' + bad.join('; ') : 'ok: 2% an hour with no zombie in town; none with a zombie in town, when starving or lying down; a field wound stops at its limit'); if (p.errs.length) console.log('page errors:', p.errs.slice(0, 3)); await b.close(); process.exit(bad.length ? 1 : 0);
})();
