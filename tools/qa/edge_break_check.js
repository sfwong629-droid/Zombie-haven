// tools/qa/edge_break_check.js — 3D.374 (W269 step 3): zombies break pieces on the lines, workers repair them, from either side.
// A town with a ring of pieces on its lines (converted from wall tiles, as step 1 does), zombies marching on it from the south. Checks:
// a zombie stops at the line and hits the piece in its way (mode zbreak on a piece on a line); the piece loses health and breaks; the
// breach alert names it; zombies then walk through the gap into the town and nowhere else; with the zombies gone a worker walks to the
// broken piece, stands on the town's side beside the line and repairs it whole, paying scrap; a zombie inside the ring breaks out the same
// way (either side); and a tile-wall town never touches pieces on lines. Pictures runs/features/edge_break_hit.png and edge_break_fix.png.
// Serve the repo first (python3 -m http.server 8765) or set ZH_NOSERVER=1. Exit 0 ok, 1 a check failed.
const Q = require('./lib');
(async () => { const b = await Q.launch(); const p = await Q.page(b, { expose: 'wallsToEdges, autoRepair, centerOn, cam, alerts' }); await Q.newGame(p); await Q.clearCards(p);
  const ring = (edges) => p.evaluate((edges) => { const S = ZH.S, W = window.ZHWorld, world = ZH.world, Z = W.WALLZONE;
    ZH.ARRIVE.low = ZH.ARRIVE.high = 1e9; S.z.length = 0; world.walls = new Map(); world.edges = new Map(); const gx = Math.floor((Z.x0 + Z.x1) / 2);
    for (let x = Z.x0; x <= Z.x1; x++) for (let y = Z.y0; y <= Z.y1; y++) if (x === Z.x0 || x === Z.x1 || y === Z.y0 || y === Z.y1) { if (W.buildingAt(world, x, y)) continue; const t = x === gx && y === Z.y0 ? 'gate' : 'wood', mx = W.WALL_DEFS[t].hp; world.walls.set(x + ',' + y, { x, y, type: t, hp: mx, max: mx, broken: false }); }
    S.edgeWalls = !!edges; if (edges) ZH.wallsToEdges(); W.bump(world); S.mat = 60; S.hour = 13;
    return { Z, gx, sealed: W.perimeter(world).sealed, pieces: world.edges.size, tiles: world.walls.size }; }, edges);
  const siege = (n, side) => p.evaluate(([n, side]) => { const S = ZH.S, W = window.ZHWorld, Z = W.WALLZONE, x0 = Math.floor((Z.x0 + Z.x1) / 2) - 3;
    S.z.length = 0; for (let i = 0; i < n; i++) { ZH.spawn(x0 + i + .5, side === 'in' ? Z.y1 - 1.5 : Z.y1 + 3.5, 'brute'); }
    for (const z of S.z) { z.siege = true; z.mode = 'zmarch'; z.goal = side === 'in' ? { x: x0 + 3, y: Z.y1 + 6 } : null; z.goalT = side === 'in' ? 1e9 : 0; } return S.z.length; }, [n, side]);
  const watch = (ticks, side) => p.evaluate(([ticks, side]) => { const S = ZH.S, W = window.ZHWorld, world = ZH.world, Z = W.WALLZONE, out = { brk: 0, edgeBrk: 0, hit: false, broke: null, through: 0, wrong: 0 };
    const allW = () => [...world.walls.values(), ...(world.edges ? world.edges.values() : [])], hp0 = new Map(allW().map((w) => [w, w.hp]));
    const inRing = (z) => z.w.x > Z.x0 + 1 && z.w.x < Z.x1 && z.w.y > Z.y0 + 1 && z.w.y < Z.y1;   /* the same inside for tiles and for pieces on their inner lines */
    for (let t = 0; t < ticks; t++) { ZH.step(1); for (const z of S.z) if (z.hp > 0 && z.mode === 'zbreak' && z.wallT) { out.brk++; if (z.wallT.edge) out.edgeBrk++; }
      const br = allW().find((w) => w.broken); if (br && !out.broke) out.broke = { edge: !!br.edge, s: br.s || null, x: br.x, y: br.y, t };
      if (out.broke) { for (const z of S.z) if (z.hp > 0 && (side === 'in' ? !inRing(z) : inRing(z))) out.through++; if (out.through) break; } }
    out.hit = allW().some((w) => w.hp < hp0.get(w)); out.alive = S.z.filter((z) => z.hp > 0).map((z) => z.mode + '@' + z.w.x.toFixed(1) + ',' + z.w.y.toFixed(1)); out.alert = ZH.alerts ? JSON.stringify(ZH.alerts).includes('breach') : null; return out; }, [ticks, side]);
  const res = {}, bad = [];
  /* outside in, pieces on the lines */
  res.ring = await ring(true); await siege(5, 'out'); await p.evaluate(() => { window._sv = ZH.S.sv.splice(0); });   /* nobody home, so the town's fighters don't sweep out and kill the brutes first (A12's daytime sweep) */
  res.out = await watch(9000, 'out'); await p.evaluate(() => { ZH.S.sv.push(...window._sv); });
  await p.evaluate(() => { const Z = window.ZHWorld.WALLZONE; ZH.cam.z = .9; ZH.centerOn((Z.x0 + Z.x1 + 1) / 2, Z.y1 + 1); }); await p.waitForTimeout(400);
  res.alertKeys = await p.evaluate(() => [...document.querySelectorAll('*')].some((e) => e.children.length === 0 && /breached/i.test(e.textContent || '')));
  /* the picture of the hit: a fresh ring, brutes at the line */
  await ring(true); await siege(4, 'out'); await p.evaluate(() => { for (let i = 0; i < 2600; i++) { ZH.step(1); if (ZH.S.z.some((z) => z.mode === 'zbreak')) { ZH.step(60); break; } } const z = ZH.S.z.find((q) => q.mode === 'zbreak') || ZH.S.z[0]; ZH.cam.z = 1.1; ZH.centerOn(z.w.x, z.w.y - .5); }); await Q.clearCards(p); await p.evaluate(() => document.querySelectorAll('#eventModal button, .tipCard button').forEach((x) => /got it/i.test(x.textContent) && x.click())); await p.waitForTimeout(700); await Q.shot(p, 'runs/features/edge_break_hit.png');
  /* repair: break one piece by hand, clear the zombies, let the town work */
  res.fix = await p.evaluate(() => { const S = ZH.S, W = window.ZHWorld, world = ZH.world; S.z.length = 0; for (const q of world.edges.values()) q.hp = q.max, q.broken = false; const e = [...world.edges.values()].find((q) => q.type === 'wood' && q.s === 'h' && q.y === W.WALLZONE.y1); e.hp = 0; e.broken = true; W.bump(world);
    for (const q of S.sv) if (q.hp > 0) { q.mode = 'free'; q.sleeping = false; q.purpose = null; } const mat0 = S.mat; let who = null, spot = null, t = 0, shot = false;
    for (; t < 20000 && (e.broken || e.hp < e.max); t++) { if (t % 60 === 0) ZH.autoRepair(); const lastHp = e.hp; ZH.step(1); const f = S.sv.find((q) => q.mode === 'fix' && q.fixW && q.fixW.s === e.s && q.fixW.x === e.x && q.fixW.y === e.y); if (f && !who) who = f.name; if (f && e.hp > lastHp && !spot) spot = { x: +f.w.x.toFixed(2), y: +f.w.y.toFixed(2), inTown: W.inTown(Math.floor(f.w.x), Math.floor(f.w.y)), d: +Math.hypot(f.w.x - e.cx, f.w.y - e.cy).toFixed(2) }; }
    return { who, spot, t, whole: e.hp >= e.max && !e.broken, paid: mat0 - S.mat, needsMat: W.WALL_DEFS[e.type].mat, line: { s: e.s, y: e.y, y1: W.WALLZONE.y1 } }; });
  /* the repair picture */
  await p.evaluate(() => { const S = ZH.S, W = window.ZHWorld, world = ZH.world; S.z.length = 0; const e = [...world.edges.values()].find((q) => q.type === 'wood' && q.s === 'h' && q.y === W.WALLZONE.y1 && q.x > W.WALLZONE.x0 + 4); e.hp = 1; e.broken = true; W.bump(world); for (let t = 0; t < 6000; t++) { if (t % 60 === 0) ZH.autoRepair(); S.z.length = 0; ZH.step(1); const f = S.sv.find((q) => q.mode === 'fix' && q.activity === 'Building'); if (f) { for (let i = 0; i < 30; i++) { S.z.length = 0; ZH.step(1); } ZH.cam.z = 1.1; ZH.centerOn(f.w.x, f.w.y); break; } } }); await Q.clearCards(p); await p.waitForTimeout(700); await Q.shot(p, 'runs/features/edge_break_fix.png');
  /* inside out */
  await ring(true); await siege(4, 'in'); await p.evaluate(() => { for (const q of ZH.world.edges.values()) if (q.s === 'h' && q.y === window.ZHWorld.WALLZONE.y1) q.hp = 12; window._sv = ZH.S.sv.splice(0); }); res.in = await watch(9000, 'in'); await p.evaluate(() => { ZH.S.sv.push(...window._sv); });   /* nobody home: the brutes go for the fence, not the people */   /* a weak south fence, so the town's fighters don't kill the brutes first */
  /* a tile-wall town as before */
  res.tileRing = await ring(false); await siege(5, 'out'); res.tile = await watch(9000, 'out');
  console.log(JSON.stringify(res));
  if (!res.ring.sealed || !res.ring.pieces || res.ring.tiles) bad.push('the ring on the lines was not set up sealed: ' + JSON.stringify(res.ring));
  if (!res.out.edgeBrk) bad.push('no zombie went for a piece on a line: ' + JSON.stringify(res.out));
  if (!res.out.hit || !res.out.broke || !res.out.broke.edge) bad.push('no piece on a line was damaged and broken: ' + JSON.stringify(res.out));
  if (!res.out.through) bad.push('no zombie came through the broken piece into the town');
  if (!res.alertKeys) bad.push('no "breached" alert showed for the broken piece');
  if (!res.fix.who || !res.fix.whole || (res.fix.needsMat > 0 && res.fix.paid < 1) || !res.fix.spot || !res.fix.spot.inTown || res.fix.spot.d > .75) bad.push('a worker did not repair the piece from the town side, beside the line, paying scrap: ' + JSON.stringify(res.fix));
  if (!res.in.edgeBrk || !res.in.broke || !res.in.broke.edge || !res.in.through) bad.push('a zombie inside did not break out through a piece on a line: ' + JSON.stringify(res.in));
  if (res.tile.edgeBrk || (res.tile.broke && res.tile.broke.edge)) bad.push('a tile-wall town involved pieces on lines: ' + JSON.stringify(res.tile));   /* tile towns behave as before (in this layout the brutes walk round the ring, as on the build before this one) */
  console.log(bad.length ? 'FAIL: ' + bad.join('; ') : `ok: zombies stop at the line and break the piece in their way (from outside and from inside), the breach is alerted and they come through the gap; a worker repairs it whole from the town's side, ${res.fix.spot.d} from the line, for ${res.fix.paid} scrap (a Wood Fence's repair costs no scrap, as with tile fences); a tile-wall town never touches pieces on lines`);
  if (p.errs.length) console.log('page errors:', p.errs.slice(0, 3)); await b.close(); process.exit(bad.length ? 1 : 0); })();
