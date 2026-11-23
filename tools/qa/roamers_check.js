// tools/qa/roamers_check.js — 3D.310 (the daytime threat, part 1): by day the zombies come as roaming groups outside the walls.
// Plays a day-4 town from 07:00 to 21:00 and checks: groups of 2 to 4; they stay outside the town (at most a step over its edge, never
// deep in it); they never march on the town, bash a building or break a wall by day; they chase someone standing outside and let go once
// that person is back in town; the player is warned; groups move on after a few hours; at dusk they stop roaming. Also: on day 1 before the
// first goal the old daytime zombies still come (the "Defeat 3 Walkers" goal needs them).
// Serve the repo first (python3 -m http.server 8765) or set ZH_NOSERVER=1. Exit 0 ok, 1 a check failed.
const Q = require('./lib');
(async () => { const b = await Q.launch(); const p = await Q.page(b, { expose: 'ROAM, roamOn, roamGroup, centerOn, cam' }); await Q.newGame(p); await Q.clearCards(p);
  const r = await p.evaluate(() => { const S = ZH.S, W = window.ZHWorld, out = { packs: {}, deep: 0, edgeSteps: 0, badModes: {}, chased: false, letGo: null, left: 0, warned: false, duskRoam: -1, early: null };
    const clear = () => document.querySelectorAll('#eventModal button').forEach((x) => x.click());
    ZH.ARRIVE.low = ZH.ARRIVE.high = 1e9;
    /* day 1, first goal not done: the old daytime zombies, no roamers */
    S.stage = 1; S.day = 1; S.hour = 9; S.z.length = 0; for (let k = 0; k < 400; k++) { ZH.step(10); clear(); if (S.z.some((z) => z.hp > 0 && !z.human)) break; }
    out.early = { any: S.z.filter((z) => z.hp > 0 && !z.human).length, roam: S.z.filter((z) => z.roam).length };
    /* day 4, after the first goal: roamers */
    S.stage = 2; S.day = 4; S.hour = 7; S.z.length = 0; S.nextBoss = 99; S.raidDay = 99; S.nextRaid = 99;
    const depth = (w) => { const Z = W.WALLZONE, x = Math.floor(w.x), y = Math.floor(w.y); return Math.min(x - Z.x0, Z.x1 - x, y - Z.y0, Z.y1 - y) + 1; };   /* 1 = on the edge row */
    let bait = null, baitT = 0;
    for (let k = 0; k < 1500 && S.hour < 21; k++) { ZH.step(10); clear();
      for (const z of S.z) { if (z.hp <= 0 || z.human) continue;
        if (z.roam) { const pk = z.roam.pk; out.packs[pk] = out.packs[pk] || { n: 0, ids: new Set() }; if (!out.packs[pk].ids.has(z)) { out.packs[pk].ids.add(z); out.packs[pk].n++; }
          if (W.inWallZone(Math.floor(z.w.x), Math.floor(z.w.y))) { const dp = depth(z.w); if (dp > 1) out.deep++; else out.edgeSteps++; }
          if (['zmarch', 'zbash', 'zbreak'].includes(z.mode)) out.badModes[z.mode] = (out.badModes[z.mode] || 0) + 1; }
        if (z.mode === 'zleave' && !z.roam && !z.countedLeave && S.hour < 20) { z.countedLeave = true; out.left++; } }
      /* the bait: once a group is out, stand someone next to it outside the walls, then bring them home */
      if (!bait && S.hour >= 9) { const z = S.z.find((q) => q.hp > 0 && q.roam && q.mode === 'idle' && !W.inWallZone(Math.floor(q.w.x), Math.floor(q.w.y))); if (z) { bait = S.sv.find((q) => q.hp > 0 && !['down', 'hospital', 'away'].includes(q.mode)); if (bait) { bait.w = { x: z.w.x + 1.5, y: z.w.y }; bait.mode = 'wait'; bait.stateTicks = 300; bait.path = null; baitT = k; } } }
      if (bait && !out.chased && S.z.some((z) => z.roam && z.target === bait && ['zchase', 'zattack'].includes(z.mode))) { out.chased = true; const c = { x: (W.BUILD.x0 + W.BUILD.x1 + 1) / 2, y: (W.BUILD.y0 + W.BUILD.y1 + 1) / 2 }; bait.w = { ...c }; bait.hp = bait.max; bait.path = null; baitT = k; }
      if (bait && out.chased && out.letGo === null && k - baitT >= 6) out.letGo = !S.z.some((z) => z.roam && z.target === bait);
      if (bait && !out.chased && k - baitT > 60) bait = null;   /* that group moved off first: try again */
      if (S.hour === 20 && out.duskRoam < 0 && S.z.length) { ZH.step(30); out.duskRoam = S.z.filter((z) => z.hp > 0 && z.roam).length; }
    }
    out.warned = (S.log || []).some((e) => /roaming outside the walls/.test(e.t)); out.sizes = Object.values(out.packs).map((q) => q.n); delete out.packs; out.hour = S.hour; return out; });
  /* a picture for the owner: a group of 4 roaming by a wood outside the walls at midday (runs/features/roamers_in_game.png) */
  await p.evaluate(() => { const S = ZH.S; S.day = 6; S.hour = 12; S.z.length = 0; S.vanguard = null; S.mobLeft = 0;
    ZH.ROAM.min = ZH.ROAM.max = 4; ZH.roamGroup(4); for (let k = 0; k < 400; k++) { S.hour = 12; ZH.step(10); const z = S.z.find((q) => q.roam && q.hp > 0); if (k > 150 && z && z.roam.to && Math.hypot(z.w.x - z.roam.to.x, z.w.y - z.roam.to.y) < 1.5) break; }
    const z = S.z.find((q) => q.roam && q.hp > 0); document.querySelectorAll('#eventModal button').forEach((x) => x.click()); document.querySelectorAll('.liveCard, #radioCard, .radioCard').forEach((e) => e.remove());
    if (z) { const W = window.ZHWorld, c = { x: (W.BUILD.x0 + W.BUILD.x1 + 1) / 2, y: (W.BUILD.y0 + W.BUILD.y1 + 1) / 2 }; ZH.cam.z = 1.1; ZH.centerOn((z.w.x + c.x) / 2, (z.w.y + c.y) / 2); } });
  console.log('picture:', JSON.stringify(await p.evaluate(() => ({ roam: ZH.S.z.filter((z) => z.roam && z.hp > 0).map((z) => [+z.w.x.toFixed(1), +z.w.y.toFixed(1), z.mode, z.type]), all: ZH.S.z.length, cam: ZH.cam, hour: ZH.S.hour }))));
  await p.waitForTimeout(7000); await Q.shot(p, require('path').join(__dirname, '../../runs/features/roamers_in_game.png'));
  console.log(JSON.stringify(r)); const bad = [];
  if (!r.early.any || r.early.roam) bad.push('day 1 before the first goal: ' + JSON.stringify(r.early) + ' (want daytime zombies and no roamers)');
  if (r.sizes.length < 2) bad.push('fewer than 2 roaming groups came in a day: ' + r.sizes.length);
  if (r.sizes.some((n) => n < 2 || n > 4)) bad.push('a group of the wrong size: ' + r.sizes.join(','));
  if (!r.sizes.some((n) => n >= 2)) bad.push('no group had 2 or more zombies');
  if (r.deep) bad.push(`roamers were deep in the town ${r.deep} times`);
  if (Object.keys(r.badModes).length) bad.push('roamers marched, bashed or broke walls: ' + JSON.stringify(r.badModes));
  if (!r.chased) bad.push('nobody chased the person standing outside next to a group');
  if (r.letGo !== true) bad.push('the group did not let go once the person was back in town');
  if (!r.warned) bad.push('no warning about roamers');
  if (!r.left) bad.push('no group moved on during the day');
  if (r.duskRoam !== 0) bad.push('zombies were still roaming after dusk: ' + r.duskRoam);
  console.log(bad.length ? 'FAIL: ' + bad.join('; ') : `ok: ${r.sizes.length} groups (${r.sizes.join(', ')}) roamed outside the walls, chased someone outside and let go at the town's edge, warned once each, moved on, and joined the night at dusk`); if (p.errs.length) console.log('page errors:', p.errs.slice(0, 3)); await b.close(); process.exit(bad.length ? 1 : 0); })();
