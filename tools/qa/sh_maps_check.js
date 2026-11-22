// tools/qa/sh_maps_check.js — 3D.276 on (Strongholds chat, 22 Nov): every stronghold's map, at every size.
// 1. For every stronghold and town level 3, 5, 8, 10, 12, 15, 18, 20: the plan is sound (rooms don't overlap, every room can be reached,
//    the start and the way out are on the floor, every thing stands in a room), and bigger towns never get a smaller map.
// 2. For the maps named on the command line (default: all redone ones): a practice run with an unkillable squad left to itself finishes
//    the main goals (the squad clears the route and kills the boss; maps with carry or switch goals get the orders a player would give).
// 3. A picture of each map at level 5 and 15 in runs/strongholds/ for the owner to look at.
// No server needed (sh_lib serves the repo from disk). Exit 0 ok, 1 a check failed.
const Q = require('./sh_lib'); const fs = require('fs'), path = require('path');
const OUT = path.join(__dirname, '..', '..', 'runs', 'strongholds'); fs.mkdirSync(OUT, { recursive: true });
const only = process.argv.slice(2);
(async () => { const b = await Q.launch(); const p = await Q.open(b); await Q.newGame(p); const bad = [];
  const plans = await p.evaluate(() => { const out = {}; for (const d of Object.keys(ZH.SH_DEFS)) { if (ZH.SH_DEFS[d].raid) continue; out[d] = {}; for (const lv of [3, 5, 8, 10, 12, 15, 18, 20]) { try { const P = ZH.shMakePlan(d, lv); out[d][lv] = { bad: ZH.shPlanCheck(P), area: Object.values(P.rooms).reduce((a, r) => a + r[2] * r[3], 0), rooms: Object.keys(P.rooms).length, redone: !!ZH.SH_PLANS[d] }; } catch (e) { out[d][lv] = { bad: ['plan failed: ' + e.message] }; } } } return out; });
  for (const [d, lvs] of Object.entries(plans)) { let last = 0; for (const [lv, r] of Object.entries(lvs)) { for (const m of r.bad) bad.push(`${d} lv ${lv}: ${m}`); if (r.area < last) bad.push(`${d}: smaller at level ${lv} than below it`); last = r.area || last; }
    const a = lvs[3], z = lvs[20]; console.log(`${d}${a.redone ? '' : ' (old layout)'}: ${a.rooms} rooms / ${a.area} tiles at level 3, ${z.rooms} rooms / ${z.area} tiles at level 20`); }
  const maps = only.length ? only : Object.entries(plans).filter(([, v]) => v[3].redone).map(([d]) => d);
  for (const d of maps) { const r = await Q.practice(p, d, 10, 6, true); if (!r.ok) { bad.push(`${d}: could not start (${r.why})`); continue; }
    const res = await p.evaluate(async (d) => { const H = ZH.S.sh; const orders = H.plan.botOrders || []; let won = false; ZH.S.sh.view = true;
      for (let i = 0; i < 60 * 60 * 9 && ZH.S.sh; i += 60) { ZH.step(60);
        const h = ZH.S.sh; if (!h) { won = true; break; }
        for (const s of h.units) if (s.hp > 0 && s.use == null && s.carry == null && !s.moveTo) { const ti = h.things.findIndex((t) => (t.use || t.carry) && !t.done && t.carried == null && !t.delivered && orders.includes(t.task) && !h.units.some((u) => u.use === h.things.indexOf(t)) && (!t.need || h.things.filter((q) => q.task === t.need).every((q) => q.done))); if (ti >= 0 && (i / 60) % 7 === 0) { s.use = ti; break; } }
        if (h.phase === 'done') { won = true; break; } }
      const h = ZH.S.sh; const st = h ? h.tasks.map((T) => T.label + ': ' + (T.done ? 'done' : 'not done')) : ['ended']; const pop = document.querySelector('#eventModal'); const txt = pop ? pop.textContent.slice(0, 120) : '';
      return { won, st, txt, secs: h ? Math.round(h.t / 60) : null }; }, d);
    console.log(`${d} at level 10: ${res.won ? 'finished' : 'NOT finished'} ${res.txt} ${res.st.join('; ')}`); if (!res.won || !/CLEARED/.test(res.txt)) bad.push(`${d}: the unkillable squad did not finish the map (${res.st.join('; ')})`);
    await p.evaluate(() => { for (const b of document.querySelectorAll('#eventModal button')) if (/done/i.test(b.textContent)) b.click(); });
    for (const lv of [5, 15]) { await Q.practice(p, d, lv, 6, true); await p.evaluate(() => { const H = ZH.S.sh; H.rev = Object.fromEntries(Object.keys(H.plan.rooms).map((k) => [k, 1])); const W = H.plan.W, Hh = H.plan.H; H.cx = ZH.SH_AX + W / 2; H.cy = ZH.SH_AY + Hh / 2 + 1; H.cz = Math.max(.55, Math.min(1.6, 26 / Math.max(W, Hh * 1.8))); H.free = true; }); await p.waitForTimeout(3500);
      await Q.shot(p, path.join(OUT, `${d}_lv${lv}.png`)); await p.evaluate(() => { ZH.S.sh = null; }); await p.waitForTimeout(500); } }
  if (p.errs.length) { console.log('page errors:', p.errs.slice(0, 5)); bad.push('page errors'); }
  console.log(bad.length ? 'FAIL:\n  ' + bad.join('\n  ') : 'ok: every stronghold map is sound at every level, and the redone ones can be finished'); await b.close(); process.exit(bad.length ? 1 : 0);
})();
