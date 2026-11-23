// tools/qa/never_lost_check.js — 3D.246 (owner, 21 Nov, W172): a town is never lost. When every survivor in town is down, the neighbours come
// by themselves: nobody dies, everyone is carried into care, the zombies in town follow their truck off the map (3D.288). At most once every 3 game days.
// The check knocks the whole town down with zombies inside, runs the clock and counts; then does it again the same day (no second rescue),
// and again four days later (a rescue). With one person still standing nobody comes unasked.
// Serve the repo first (python3 -m http.server 8765). Exit 0 ok, 1 a check failed.
const Q = require('./lib');
(async () => { const b = await Q.launch(); const p = await Q.page(b, { w: 390, h: 844, expose: 'spawn' }); await Q.newGame(p); await Q.clearCards(p);
  const r = await p.evaluate(() => { const S = ZH.S, out = {}; S.day = 6; S.hour = 23; const n0 = S.sv.length;
    const allDown = (keep) => { S.sv.forEach((q, i) => { if (i < keep) { q.max = q.hp = 99999; return; } q.hp = 0; q.mode = 'down'; q.moving = false; q.path = null; q.dest = null; }); };
    const run = (t, hr = 23) => { for (let i = 0; i < t; i += 20) { ZH.step(20); S.hour = hr; if (hr !== 23) S.z.length = 0; document.querySelectorAll('#eventModal button').forEach((x) => x.click()); } };
    /* 1: one person stands: nobody comes unasked */
    allDown(1); S.help = {}; run(200); out.oneStanding = !!(S.help && S.help.coming);
    /* 2: everyone down */
    allDown(0); S.z.length = 0; for (let i = 0; i < 3; i++) ZH.spawn(); const camp = ZH.world.buildings[0], tagged = S.z.slice(); for (const z of tagged) { z.w = { x: camp.x + 1.5, y: camp.y + 2.5 }; z.mode = 'idle'; }
    run(60); out.called = !!(S.help && S.help.coming); out.self = !!(S.help && S.help.self); for (let k = 0; k < 60 && !(S.help && S.help.owe); k++) run(100);   /* 3D.288: the truck drives in first */
    for (let k = 0; k < 70 && S.truck && S.truck.leg !== 'out'; k++) run(100);   /* 3D.306: the medics carry everyone in before the truck leaves */
    out.alive = S.sv.length; out.n0 = n0; out.modes = [...new Set(S.sv.map((q) => q.mode))]; out.zLeft = tagged.filter((z) => z.hp > 0 && !(z.mode === 'zleave' && z.truck)).length; out.zKilled = tagged.filter((z) => z.hp <= 0 && !z.escaped).length;   /* they follow the truck out (truck_check.js watches them all the way off the map) */ out.owe = !!(S.help && S.help.owe); out.auto = S.help && S.help.auto;
    /* 3: the same day again: no second rescue */
    S.truck = null; S.z.length = 0; allDown(0); for (const q of S.sv) q.bleed = null; run(100); out.second = !!(S.help && S.help.coming);
    /* 4: four days later: they come again, even with the favour owed */
    S.day = 10; if (S.help) S.help.owe = { day: 99, food: 15, water: 10 }; allDown(0); run(100); out.later = !!(S.help && S.help.coming); run(500);
    /* 5 (3D.251): the Camp is wrecked (a bot town bled out to the last person this way): they still come, and people get back on their feet */
    S.day = 20; for (const bb of ZH.world.buildings) bb.burnt = true; S.z.length = 0; allDown(0); for (const q of S.sv) q.bleed = null; run(100); out.noCamp = !!(S.help && S.help.coming); run(500); for (let k = 0; k < 70 && S.truck && S.truck.leg !== 'out'; k++) run(100); out.noCampModes = [...new Set(S.sv.map((q) => q.mode))];
    for (const q of S.sv) { if (q.mode === 'hospital') q.stateTicks = Math.min(q.stateTicks || 0, 200); } run(2500, 12); out.afterModes = [...new Set(S.sv.map((q) => q.mode))]; out.alive2 = S.sv.length;
    out.fallen = (S.fallen || []).length; return out; });
  console.log(JSON.stringify(r)); const bad = [];
  if (r.oneStanding) bad.push('help came unasked while one person was still standing');
  if (!r.called || !r.self) bad.push('nobody came when every survivor was down');
  if (r.alive < r.n0) bad.push('people were lost: ' + r.alive + ' of ' + r.n0);
  if (r.modes.some((m) => m === 'down')) bad.push('somebody was left lying down after the rescue');
  if (r.zLeft) bad.push(r.zLeft + ' zombies in town are not following the truck out'); if (r.zKilled) bad.push(r.zKilled + ' zombies were killed out of sight (they should follow the truck off the map)');
  if (!r.owe) bad.push('no favour is owed for the rescue');
  if (r.auto !== 9) bad.push('the next rescue by itself should be possible from day 9, got ' + r.auto);
  if (r.second) bad.push('a second rescue came the same day');
  if (!r.later) bad.push('no rescue four days later');
  if (!r.noCamp) bad.push('nobody came when the Camp was wrecked');
  if (r.noCampModes.includes('down')) bad.push('somebody was left lying down with the Camp wrecked');
  if (r.afterModes.includes('down') || r.afterModes.includes('hospital')) bad.push('people did not get back on their feet after a rescue with the Camp wrecked: ' + r.afterModes.join(','));
  if (r.alive2 < r.n0 || r.fallen) bad.push('people were lost in the check');   /* a newcomer may have walked in meanwhile */
  console.log(bad.length ? 'FAIL: ' + bad.join('; ') : 'ok: when everyone is down the neighbours come by themselves, nobody is lost, once every 3 days'); if (p.errs.length) console.log('page errors:', p.errs.slice(0, 3)); await b.close(); process.exit(bad.length ? 1 : 0);
})();
