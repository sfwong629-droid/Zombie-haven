// tools/qa/truck_check.js — 3D.288 (owner, 19 Nov, W129 B; look C, W228): the rescue truck.
// Greenwater's truck drives in off the highway with its horn going; the zombies in town turn toward it; it stops at the Camp
// (the fallen go into care); then it drives back out down the highway and the zombies follow it off the map. Nobody kills them out of sight.
// The check knocks the whole town down with zombies at the Camp, lets the neighbours come by themselves, and watches:
//   1 the truck appears at the highway's east end and reaches the Camp; the fallen are stable while it drives in;
//   1b (3D.306) two medics get out and carry each of the fallen into care on a stretcher cart; the truck leaves only when they are all in and the medics are back;
//   2 when it leaves, every zombie that was in town follows it east (a zombie killed in a fair fight by someone back on their feet is allowed;
//     one dying while all of ours are down or in care is not), the truck never more than a few tiles ahead of the nearest; none is killed (they walk off the map), none is left behind;
//   3 a picture of the truck in town for the owner (runs/features/truck_in_game.png).
// Serve the repo first (python3 -m http.server 8765) or set ZH_NOSERVER=1. Exit 0 ok, 1 a check failed.
const Q = require('./lib'), path = require('path'); let out2;
(async () => { const b = await Q.launch(); const p = await Q.page(b, { w: 390, h: 844, expose: 'spawn, truckAt, TRUCK' }); await Q.newGame(p); await Q.clearCards(p);
  const r = await p.evaluate(() => { const S = ZH.S, W = ZH.world, out = { legs: [], died: 0 }; ZH.ARRIVE.low = ZH.ARRIVE.high = 1e9;   /* no newcomer walks in mid-check (one did, and fought a follower) */ S.day = 6; S.hour = 12; S.z.length = 0;
    const camp = W.buildings[0]; for (const q of S.sv) { q.hp = 0; q.mode = 'down'; q.moving = false; q.path = null; q.dest = null; }
    for (let i = 0; i < 5; i++) ZH.spawn(); const zs = S.z.slice(); zs.forEach((z, i) => { z.w = { x: camp.x + 1.5 + (i % 3) * .5, y: camp.y + 2.5 + Math.floor(i / 3) * .5 }; z.mode = 'idle'; z.tag = true; });
    const k0 = S.kills; out.n = zs.length;
    out.unseen = 0; out.seen = 0; const step = (n) => { for (let i = 0; i < n; i += 10) { S.hour = 12; const k1 = S.kills; ZH.step(10); if (S.kills > k1) { if (S.sv.some((q) => !['down', 'hospital', 'away'].includes(q.mode))) out.seen += S.kills - k1; else out.unseen += S.kills - k1; } document.querySelectorAll('#eventModal button').forEach((x) => x.click()); const T = S.truck; if (T && out.legs[out.legs.length - 1] !== T.leg) out.legs.push(T.leg); if (T && !out.first) { const a = ZH.truckAt(); out.first = { x: +a.x.toFixed(1), y: +a.y.toFixed(1), len: T.path.length }; } if (T && T.leg === 'in') { out.inT = (out.inT || 0) + 10; if (S.sv.some((q) => q.mode === 'down' && !q.stable)) out.unstable = true; } } };
    step(400); out.coming = !!S.truck; out.stableWhileIn = S.sv.every((q) => q.mode !== 'down' || q.stable);
    for (let k = 0; k < 400 && S.truck && S.truck.leg === 'in'; k++) step(10);
    out.stopped = !!S.truck && S.truck.leg === 'stop'; const at = ZH.truckAt(); out.stopAt = at && { x: +at.x.toFixed(1), y: +at.y.toFixed(1) }; out.camp = { x: camp.x, y: camp.y };
    const carried = new Set(), medicsSeen = new Set(); let stopT = 0, leftEarly = false;
    for (let k = 0; k < 800 && S.truck && S.truck.leg === 'stop'; k++) { step(10); stopT += 10; const T = S.truck; if (!T) break;
      for (const m of T.medics || []) { medicsSeen.add(m.id); if (m.mode === 'rescueCarry' && m.carrying) { carried.add(m.carrying.id); if (m.carrying.rescuer !== m) out.badLink = true; } }
      if (T.leg !== 'stop' && S.sv.some((q) => q.mode === 'down')) leftEarly = true; }
    out.medics = medicsSeen.size; out.carried = carried.size; out.stopT = stopT; out.leftEarly = leftEarly; out.why = [...new Set(S.sv.map((q) => q.why))];
    out.care = S.sv.map((q) => q.mode); out.zAlive = zs.filter((z) => z.hp > 0).length; out.gone = zs.filter((z) => z.hp <= 0).map((z) => `${z.type} ${z.escaped ? 'escaped' : 'killed'} ${z.mode} ${z.w.x.toFixed(1)},${z.w.y.toFixed(1)}`); out.window = !!document.querySelector('#eventModal');
    out.following = zs.filter((z) => z.hp > 0 && z.mode === 'zleave' && z.truck).length; const toExit = () => { const f = zs.filter((z) => z.hp > 0); return f.reduce((a, z) => a + Math.hypot(ZH.Wd.COLS - z.w.x, ZH.Wd.HWY_Y + 1 - z.w.y), 0) / Math.max(1, f.length); }; out.xs0 = toExit();
    out.gap = []; for (let k = 0; k < 6; k++) { step(250); const a = ZH.truckAt(), f = zs.filter((z) => z.hp > 0); if (a && f.length) out.gap.push(+Math.min(...f.map((z) => Math.hypot(z.w.x - a.x, z.w.y - a.y))).toFixed(1)); out.others = S.z.filter((z) => z.truck && z.hp > 0 && !z.tag).length; }
    out.xs1 = toExit();
    for (let k = 0; k < 400 && (S.truck || zs.some((z) => z.hp > 0)); k++) step(50); out.lastT = out.legs.length;
    out.truckGone = !S.truck; out.escaped = zs.filter((z) => z.escaped).length; out.left = zs.filter((z) => z.hp > 0).length; out.killed = S.kills - k0; out.fallen = (S.fallen || []).length; out.alive = S.sv.length; out.leftTown = S.left || 0;
    return out; });
  /* the picture: a fresh rescue, stopped at the edge of town on the way in */
  await p.evaluate(() => { const S = ZH.S; S.truck = null; S.help = {}; for (const q of S.sv) { q.hp = q.max; q.mode = 'free'; } ZH.spawn(); ZH.spawn(); ZH.spawn(); S.help = { coming: ZH.tick + 1 }; for (let i = 0; i < 6; i++) ZH.step(10); const T = S.truck; if (T) T.i = Math.max(0, T.path.length - 9); for (let i = 0; i < 40; i++) ZH.step(10); const a = ZH.truckAt(); if (a) { ZH.centerOn(a.x, a.y); ZH.cam.z = 1.6; } });
  await p.evaluate(() => { const S = ZH.S; S.guest = null; for (const id of ['eventModal']) { const e = document.getElementById(id); if (e) e.innerHTML = ''; } document.querySelectorAll('.liveCard, #radioCard, .radioCard').forEach((e) => e.remove()); const a = ZH.truckAt(); if (a) { ZH.cam.z = 2.4; ZH.centerOn(a.x, a.y); } });
  await p.waitForTimeout(2500); out2 = await p.evaluate(() => ({ truck: !!ZH.S.truck, at: ZH.truckAt(), shown: !!(window.ZH3D && ZH3D) })); console.log('picture:', JSON.stringify(out2)); await Q.shot(p, path.join(__dirname, '../../runs/features/truck_in_game.png'));
  /* a second picture: a medic wheeling someone in (3D.306) */
  const med = await p.evaluate(() => { const S = ZH.S, camp = ZH.world.buildings[0]; S.truck = null; S.z.length = 0; S.help = {};
    S.sv.forEach((q, i) => { q.hp = 0; q.mode = 'down'; q.rescuer = null; q.w = { x: camp.x + 5 + (i % 3) * 2, y: camp.y + 5 + Math.floor(i / 3) }; });   /* everyone down, so only the medics carry */
    S.help = { coming: ZH.tick + 1 }; for (let k = 0; k < 400; k++) { S.hour = 12; ZH.step(10); document.querySelectorAll('#eventModal button').forEach((x) => x.click()); const T = S.truck, m = T && T.medics && T.medics.find((x) => x.mode === 'rescueCarry'); if (m && m.t === 0 && Math.hypot(m.w.x - m.carrying.w.x, m.w.y - m.carrying.w.y) < .1 && k % 3 === 0) { const e = document.getElementById('eventModal'); if (e) e.innerHTML = ''; ZH.cam.z = 2.6; ZH.centerOn(m.w.x, m.w.y); return { ok: true, who: m.name, carrying: m.carrying.name }; } } return { ok: false }; });
  await p.waitForTimeout(2500); console.log('medic picture:', JSON.stringify(med)); await Q.shot(p, path.join(__dirname, '../../runs/features/truck_medics.png'));
  console.log(JSON.stringify(r)); const bad = [];
  if (!r.coming || !r.first) bad.push('no truck came');
  else { if (r.first.x < 30) bad.push('the truck did not start at the highway\'s east end: ' + JSON.stringify(r.first));
    if (r.unstable) bad.push('someone was bleeding out while the truck drove in');
    if (!r.stopped) bad.push('the truck never stopped in town (legs: ' + r.legs.join(',') + ')');
    if (r.inT > 1500) bad.push('the truck took too long to arrive: ' + r.inT + ' ticks');
    if (r.care.includes('down')) bad.push('the fallen were not all in care when the truck left: ' + r.care.join(','));
    if (r.medics !== 2) bad.push('expected two medics to get out, saw ' + r.medics);
    if (r.carried !== r.care.length) bad.push(`the medics carried ${r.carried} of the ${r.care.length} fallen (the rest were put in care without being carried)`);
    if (r.badLink) bad.push('someone on a stretcher was not linked to the medic carrying them (they would not ride the cart)');
    if (r.leftEarly) bad.push('the truck left while someone was still down');
    if (r.stopT >= 6000) bad.push('the medics ran out of time (' + r.stopT + ' ticks)');
    if (r.zAlive + r.seen < r.n) bad.push('zombies died while the truck was in town with nobody of ours on their feet (' + (r.n - r.zAlive) + ')');
    if (r.following < r.zAlive) bad.push(`only ${r.following} of ${r.zAlive} zombies followed the truck`);
    if (!(r.xs1 < r.xs0 - 3)) bad.push(`the zombies did not move toward the highway exit after the truck (${r.xs0.toFixed(1)} → ${r.xs1.toFixed(1)} tiles away)`);
    if (r.gap.some((g) => g > 6)) bad.push('the truck drove away from its followers: nearest ' + r.gap.join(', '));
    if (!r.truckGone) bad.push('the truck never left');
    if (r.left) bad.push(r.left + ' zombies were left behind');
    if (r.unseen) bad.push(r.unseen + ' zombies were killed with nobody of ours on their feet (out of sight)');
    if (r.escaped + r.seen < r.n) bad.push(`only ${r.escaped} of ${r.n} zombies walked off the map (${r.seen} killed in a fair fight by people back on their feet)`);
    if (r.fallen) bad.push('someone died'); }
  console.log(bad.length ? 'FAIL: ' + bad.join('; ') : 'ok: the truck drives in from the highway, the fallen are safe, two medics carry each of them into care, and every zombie follows it off the map; none killed out of sight'); if (p.errs.length) console.log('page errors:', p.errs.slice(0, 3)); await b.close(); process.exit(bad.length ? 1 : 0);
})();
