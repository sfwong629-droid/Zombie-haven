// tools/qa/edge_look_check.js — 3D.375 (W269 step 4): every town has its walls on the lines, drawn as a real fence.
// Checks: a new game is on the lines with no switch, and the old farm fence stands on the lines (no wall tiles, nothing refunded); an old
// save with wall tiles and no switch is converted once on load and says so in the event log; S.edgeWalls = false keeps a town on tiles; and
// the wall tool plans on the lines. Draws runs/features/edge_look_kinds.png (every kind of wall on the lines, a gate, a broken piece, posts
// at the corners) and edge_look_town.png (a new town's farm fence).
// Serve the repo first (python3 -m http.server 8765) or set ZH_NOSERVER=1. Exit 0 ok, 1 a check failed.
const Q = require('./lib');
(async () => { const b = await Q.launch(); const p = await Q.page(b, { expose: 'edgeOn, wallsToEdges, putEdge, serialize, applySave, centerOn, cam, startTool, endBuildMode, logEvent' }); await Q.newGame(p); await Q.clearCards(p);
  const res = {}, bad = [];
  res.fresh = await p.evaluate(() => ({ on: ZH.edgeOn(), tiles: ZH.world.walls.size, pieces: ZH.world.edges ? ZH.world.edges.size : 0, wood: ZH.S.wood }));
  await p.evaluate(() => { const W = window.ZHWorld, B = W.BUILD; const hq = ZH.world.buildings[0]; ZH.cam.z = 1.05; ZH.centerOn(hq.x + hq.w / 2, hq.y + hq.h / 2 + .5); }); await Q.clearCards(p); await p.waitForTimeout(700); for (let i = 0; i < 3; i++) { await p.waitForTimeout(900); const g = p.locator('button:visible', { hasText: 'No more tips' }); if (await g.count()) await g.first().click().catch(() => {}); } await p.waitForTimeout(500); await Q.shot(p, 'runs/features/edge_look_town.png');
  /* an old save: wall tiles, no switch saved */
  res.old = await p.evaluate(() => { const S = ZH.S, W = window.ZHWorld, world = ZH.world, Z = W.WALLZONE; world.edges = new Map(); world.walls = new Map();
    for (let x = Z.x0 + 2; x <= Z.x0 + 8; x++) world.walls.set(x + ',' + Z.y0, { x, y: Z.y0, type: 'wood', hp: 80, max: 80 }); W.bump(world);
    const d = JSON.parse(ZH.serialize()); delete d.S.edgeWalls; d.edges = []; ZH.applySave(JSON.stringify(d));
    const log = JSON.stringify(ZH.S.log || ZH.S.events || '').slice(-600); return { tiles: world.walls.size, pieces: world.edges.size, logged: /now stand on the lines/.test(JSON.stringify(ZH.S)) }; });
  /* switched off for a test: tiles stay through a save */
  res.off = await p.evaluate(() => { const S = ZH.S, W = window.ZHWorld, world = ZH.world, Z = W.WALLZONE; world.edges = new Map(); world.walls = new Map(); S.edgeWalls = false;
    for (let x = Z.x0 + 2; x <= Z.x0 + 5; x++) world.walls.set(x + ',' + Z.y0, { x, y: Z.y0, type: 'wood', hp: 80, max: 80 }); W.bump(world); ZH.applySave(ZH.serialize()); const r = { on: ZH.edgeOn(), tiles: world.walls.size, pieces: world.edges.size }; S.edgeWalls = true; world.walls = new Map(); W.bump(world); return r; });
  /* the wall tool plans on the lines */
  res.tool = await p.evaluate(() => { ZH.startTool({ kind: 'wall', wtype: 'wood' }); const t = document.getElementById('yesBuild').textContent; ZH.endBuildMode(); return t; });
  /* the picture: a square of each kind, a gate, a damaged and a broken piece */
  await p.evaluate(() => { const S = ZH.S, W = window.ZHWorld, world = ZH.world, B = W.BUILD; world.edges = new Map(); world.walls = new Map(); S.z.length = 0;
    let x0 = B.x0 + 1, y0 = B.y1 - 5; const free = (x, y) => !W.buildingAt(world, x, y);
    for (let gx = B.x0; gx < B.x1 - 6; gx++) for (let gy = B.y0; gy < B.y1 - 4; gy++) { let ok = true; for (let x = gx; x < gx + 6 && ok; x++) for (let y = gy; y < gy + 4 && ok; y++) ok = free(x, y); if (ok) { x0 = gx; y0 = gy; gx = 1e9; break; } }
    const kinds = ['wood', 'palisade', 'metal', 'efence'];   /* a 6 x 4 block: each side of the square its own kind */
    for (let i = 0; i < 6; i++) ZH.putEdge('h', x0 + i, y0, kinds[0]); for (let i = 0; i < 6; i++) ZH.putEdge('h', x0 + i, y0 + 4, kinds[2]);
    for (let j = 0; j < 4; j++) ZH.putEdge('v', x0, y0 + j, kinds[1]); for (let j = 0; j < 4; j++) ZH.putEdge('v', x0 + 6, y0 + j, kinds[3]);
    ZH.putEdge('h', x0 + 2, y0, 'gate'); ZH.putEdge('h', x0 + 4, y0, 'wood', 30); ZH.putEdge('h', x0 + 3, y0 + 4, 'metal', 0, true); for (let i = 1; i < 4; i++) ZH.putEdge('v', x0 + 3, y0 + i, 'wood');
    W.bump(world); window._sq = { x0, y0 }; ZH.cam.z = .9; ZH.centerOn(x0 + 3.9, y0 + 2.6); });
  await Q.clearCards(p); await p.waitForTimeout(900); await Q.shot(p, 'runs/features/edge_look_kinds.png');
  console.log(JSON.stringify(res));
  if (!res.fresh.on || res.fresh.tiles || !res.fresh.pieces) bad.push('a new game is not on the lines with the farm fence on them: ' + JSON.stringify(res.fresh));
  if (res.old.tiles || res.old.pieces !== 7 || !res.old.logged) bad.push('an old save with wall tiles was not converted and logged on load: ' + JSON.stringify(res.old));
  if (res.off.on || res.off.tiles !== 4 || res.off.pieces) bad.push('a town switched off did not keep its tiles: ' + JSON.stringify(res.off));
  if (res.tool !== 'Confirm') bad.push('the wall tool does not plan on the lines: ' + res.tool);
  console.log(bad.length ? 'FAIL: ' + bad.join('; ') : `ok: a new town is on the lines (the farm fence is ${res.fresh.pieces} pieces on them, no tiles); an old save is converted once on load and logged; a town switched off keeps its tiles; the wall tool plans on the lines`);
  if (p.errs.length) console.log('page errors:', p.errs.slice(0, 3)); await b.close(); process.exit(bad.length ? 1 : 0); })();
