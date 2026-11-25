// tools/qa/edge_walls_check.js — 3D.351 (W269 step 1): town walls on the lines between tiles: the world, paths, movement and saves.
// An old town with a ring of wall tiles and a gate is switched to walls on the lines. Checks: the ring is converted to pieces on the lines
// and its tiles become free land; the town is still sealed with the same buildings inside; people find a way out through the gate; zombies
// find no way in, and when they may count a wall as a way through their route crosses exactly one piece; nobody walks across a line, and
// nobody cuts diagonally past a wall's end; nothing can be built over a line with a wall on it; a save and reload keeps every piece; and a
// town that is not switched on keeps its wall tiles. (24 Nov, owner: the INNER edge: the ring moves half a tile in; its 4 corners are not needed and are refunded.) Draws runs/features/edge_walls_step1.png (before and after).
// Serve the repo first (python3 -m http.server 8765) or set ZH_NOSERVER=1. Exit 0 ok, 1 a check failed.
const Q = require('./lib'), fs = require('fs'), path = require('path');
(async () => { const b = await Q.launch(); const p = await Q.page(b, { expose: 'edgeGuard, wallsToEdges, putEdge, edgeOn, serialize, applySave, moveSlide, followPath, townCentre, insideBuilding' }); await Q.newGame(p); await Q.clearCards(p);
  const r = await p.evaluate(() => { const S = ZH.S, W = window.ZHWorld, world = ZH.world, Z = W.WALLZONE, out = {};
    ZH.ARRIVE.low = ZH.ARRIVE.high = 1e9; S.z.length = 0;
    /* an old town: a ring of wood fence tiles round the wall zone's edge, a gate in the middle of the south side */
    world.walls = new Map(); const gx = Math.floor((Z.x0 + Z.x1) / 2);
    for (let x = Z.x0; x <= Z.x1; x++) for (let y = Z.y0; y <= Z.y1; y++) if (x === Z.x0 || x === Z.x1 || y === Z.y0 || y === Z.y1) { if (W.buildingAt(world, x, y)) continue; const t = x === gx && y === Z.y1 ? 'gate' : 'wood', mx = W.WALL_DEFS[t].hp; world.walls.set(x + ',' + y, { x, y, type: t, hp: x === Z.x0 + 2 && y === Z.y0 ? 30 : mx, max: mx, broken: false }); }
    W.bump(world); const before = W.perimeter(world); out.before = { sealed: before.sealed, inside: before.inside, total: before.total, tiles: world.walls.size };
    const oldTiles = [...world.walls.values()].map((t) => ({ x: t.x, y: t.y, type: t.type }));
    /* the town without the switch keeps its tiles through a save */
    { const d = ZH.serialize(); ZH.applySave(d); out.offKeeps = { on: ZH.edgeOn(), tiles: world.walls.size, edges: world.edges.size }; }
    /* switch it on */
    S.edgeWalls = true; const wood0 = S.wood; const conv = ZH.wallsToEdges(); out.refund = +(S.wood - wood0).toFixed(1); out.conv = conv; out.tilesLeft = world.walls.size;
    out.freed = oldTiles.filter((t) => !W.walkable(world, t.x, t.y, false)).length;   /* old wall tiles that are not free land now */
    const after = W.perimeter(world); out.after = { sealed: after.sealed, inside: after.inside, total: after.total, walls: after.walls, gates: after.gates };
    out.gates = [...world.edges.values()].filter((e) => e.type === 'gate').length; out.damaged = [...world.edges.values()].filter((e) => e.hp < e.max).map((e) => e.hp);
    /* paths */
    const c = ZH.townCentre(), ins = { x: Math.floor(c.x), y: Math.floor(c.y) }, far = { x: gx, y: Math.min(W.ROWS - 1, Z.y1 + 4) };
    const crossings = (pth, from) => { let prev = from, n = 0, list = []; for (const t of pth || []) { const e = W.edgeBetween(world, prev.x, prev.y, t.x, t.y); if (e) { n++; list.push(e.type); } prev = t; } return { n, list }; };
    const sp = W.findPath(world, ins, far, false); out.survivorOut = !!sp; out.survivorCross = sp && crossings(sp, W.nearestWalkable(world, ins.x, ins.y, false));
    const zfar = { x: Math.max(0, Z.x0 - 3), y: Math.floor(c.y) + 1 }, zp = W.findPath(world, zfar, ins, true); out.zombieIn = !!zp || !!W.findPath(world, far, ins, true);
    const zb = W.findPath(world, zfar, ins, true, 160); out.zombieBreak = zb && crossings(zb, zfar);
    /* placement over a line */
    const def = W.DEFS.tent || W.DEFS[Object.keys(W.DEFS).find((k) => W.DEFS[k].w === 1 && W.DEFS[k].h === 1)];
    const def2 = Object.values(W.DEFS).find((d) => d.w >= 2 && d.h >= 1 && d.cost !== undefined) || Object.values(W.DEFS).find((d) => d.w >= 2);
    { const B = W.BUILD; let spot = null; for (let y = B.y0; y <= B.y1 - def2.h + 1 && !spot; y++) for (let x = B.x0; x <= B.x1 - def2.w + 1 && !spot; x++) if (W.footprintCheck(world, x, y, def2).ok) spot = { x, y };
      if (!spot) out.overLine = 'no free spot'; else { ZH.putEdge('v', spot.x + 1, spot.y, 'wood'); W.bump(world); out.overLine = W.footprintCheck(world, spot.x, spot.y, def2).why; out.besideLine = W.footprintCheck(world, spot.x + 1, spot.y, { ...def2, w: 1, h: 1 }).ok; world.edges.delete(W.ekey('v', spot.x + 1, spot.y)); W.bump(world); } }
    /* diagonal past a wall's end: one piece alone, both diagonals round its end are shut, the straight steps beside it are open */
    { const sx = Z.x0 + 3, sy = Z.y0 + 3; ZH.putEdge('v', sx, sy, 'wood'); out.diag = { cut1: W.stepOk(world, sx - 1, sy, sx, sy + 1, true), cut2: W.stepOk(world, sx, sy, sx - 1, sy - 1, true), across: W.stepOk(world, sx - 1, sy, sx, sy, true), beside: W.stepOk(world, sx - 1, sy + 1, sx, sy + 1, true) }; world.edges.delete(W.ekey('v', sx, sy)); W.bump(world); }
    /* movement: a zombie outside pushing straight at the wall, and a survivor inside walking straight out at a fence: neither crosses */
    const wx = Math.floor((Z.x0 + gx) / 2); S.z.length = 0;
    const zmb = { id: 9e6, type: 'walker', hp: 50, max: 50, w: { x: wx + .5, y: Z.y1 + 2.5 }, mode: 'idle', human: false }; const zIn = [];
    const sv = S.sv.find((q) => q.hp > 0); const svT = { x: wx + .5, y: Z.y0 - 3 }; sv.w = { x: wx + .5, y: Z.y0 + 1.5 }; sv.path = null; let svOut = 0;
    for (let k = 0; k < 400; k++) { zmb.pv = { ...zmb.w }; sv.pv = { ...sv.w }; S.z = [zmb]; ZH.moveSlide(zmb, { x: wx + .5, y: c.y }, .05); sv.w.y -= .05; sv.mode = 'wait'; sv.stateTicks = 99;
      ZH.edgeGuard();
      if (Math.floor(zmb.w.y) < Z.y1) zIn.push(+zmb.w.y.toFixed(2)); if (Math.floor(sv.w.y) < Z.y0 + 1) svOut++; }
    out.move = { zombieY: +zmb.w.y.toFixed(2), zombieInside: zIn.length, survivorY: +sv.w.y.toFixed(2), survivorOutside: svOut, line: Z.y1, northLine: Z.y0 + 1 };
    S.z = [];
    /* a survivor walks out through the gate on a path */
    sv.w = { x: ins.x + .5, y: ins.y + .5 }; sv.path = null; let arrived = 'moving'; for (let k = 0; k < 3000 && arrived === 'moving'; k++) { sv.pv = { ...sv.w }; arrived = ZH.followPath(sv, { x: far.x + .5, y: far.y + .5 }, .06); }
    out.gateWalk = arrived;
    /* save and reload */
    const n0 = world.edges.size, g0 = out.gates, d = ZH.serialize(); ZH.applySave(d);
    out.reload = { on: ZH.edgeOn(), edges: world.edges.size, n0, gates: [...world.edges.values()].filter((e) => e.type === 'gate').length, g0, tiles: world.walls.size, damaged: [...world.edges.values()].filter((e) => e.hp < e.max).map((e) => e.hp), sealed: W.perimeter(world).sealed };
    /* the picture: before (wall tiles) and after (walls on the lines), with the paths */
    const T = 22, x0 = Z.x0 - 2, y0 = Z.y0 - 2, cw = (Z.x1 - Z.x0 + 5) * T, ch = (Z.y1 - Z.y0 + 6) * T, cv = document.createElement('canvas'); cv.width = Math.max(cw * 2 + 30, 900); cv.height = ch + 74; const g = cv.getContext('2d');
    g.fillStyle = '#f4f1ea'; g.fillRect(0, 0, cv.width, cv.height); g.font = 'bold 18px sans-serif'; g.fillStyle = '#222';
    const panel = (ox, title, edges) => { g.fillStyle = '#222'; g.fillText(title, ox + 6, 26); const X = (x) => ox + (x - x0) * T, Y = (y) => 40 + (y - y0) * T;
      for (let x = x0; x < x0 + cw / T; x++) for (let y = y0; y < y0 + ch / T - 0; y++) { g.fillStyle = W.inTown(x, y) ? '#dfe8cf' : '#cfdcb8'; if (world.roads.has(x + ',' + y)) g.fillStyle = '#c9c2b0'; g.fillRect(X(x), Y(y), T, T); g.strokeStyle = 'rgba(0,0,0,.08)'; g.strokeRect(X(x), Y(y), T, T); }
      for (const bd of world.buildings) { g.fillStyle = '#8a8f9c'; g.fillRect(X(bd.x) + 2, Y(bd.y) + 2, bd.w * T - 4, bd.h * T - 4); }
      if (!edges) for (const t of oldTiles) { g.fillStyle = t.type === 'gate' ? '#3a9a4a' : '#8b5a2b'; g.fillRect(X(t.x) + 1, Y(t.y) + 1, T - 2, T - 2); }
      else for (const e of world.edges.values()) { g.strokeStyle = e.type === 'gate' ? '#3a9a4a' : '#6b3e17'; g.lineWidth = e.type === 'gate' ? 6 : 5; g.beginPath(); if (e.s === 'v') { g.moveTo(X(e.x), Y(e.y) + 1); g.lineTo(X(e.x), Y(e.y + 1) - 1); } else { g.moveTo(X(e.x) + 1, Y(e.y)); g.lineTo(X(e.x + 1) - 1, Y(e.y)); } g.stroke(); }
      if (edges) { const line = (pth, from, col) => { if (!pth) return; g.strokeStyle = col; g.lineWidth = 3; g.setLineDash([6, 4]); g.beginPath(); g.moveTo(X(from.x + .5), Y(from.y + .5)); for (const t of pth) g.lineTo(X(t.x + .5), Y(t.y + .5)); g.stroke(); g.setLineDash([]); };
        line(sp, W.nearestWalkable(world, ins.x, ins.y, false), '#2a6bd6'); line(zb, zfar, '#d0342c');
        let prev = zfar; for (const t of zb || []) { const e = W.edgeBetween(world, prev.x, prev.y, t.x, t.y); if (e && e.type !== 'gate' || (e && e.type === 'gate')) { const m = W.edgeMid(e); g.strokeStyle = '#d0342c'; g.lineWidth = 3; g.beginPath(); g.moveTo(X(m.x) - 7, Y(m.y) - 7); g.lineTo(X(m.x) + 7, Y(m.y) + 7); g.moveTo(X(m.x) + 7, Y(m.y) - 7); g.lineTo(X(m.x) - 7, Y(m.y) + 7); g.stroke(); } prev = t; } } };
    panel(0, `Before: walls on ${oldTiles.length} tiles`, false); panel(cw + 30, `After: ${world.edges.size} pieces on the inner lines`, true);
    g.font = '14px sans-serif'; g.fillStyle = '#2a6bd6'; g.fillText('Blue: a survivor walks out through the gate (green).', 8, ch + 50); g.fillStyle = '#d0342c'; g.fillText('Red: a zombie\'s way in; the X is the one piece it must break.', 8, ch + 68);
    out.png = cv.toDataURL('image/png');
    return out; });
  const png = r.png; delete r.png; fs.mkdirSync(path.join(__dirname, '../../runs/features'), { recursive: true }); fs.writeFileSync(path.join(__dirname, '../../runs/features/edge_walls_step1.png'), Buffer.from(png.split(',')[1], 'base64'));
  console.log(JSON.stringify(r)); const bad = [];
  if (r.offKeeps.on || r.offKeeps.edges || r.offKeeps.tiles !== r.before.tiles) bad.push('a town not switched on lost its wall tiles: ' + JSON.stringify(r.offKeeps));
  if (!r.before.sealed) bad.push('the test ring was not sealed before');
  if (r.tilesLeft) bad.push(r.tilesLeft + ' wall tiles left after converting');
  if (r.conv.pieces + r.conv.dropped !== r.conv.tiles || r.conv.dropped !== 4) bad.push(`the ring's tiles did not become one piece each with its 4 corners dropped: ${JSON.stringify(r.conv)}`);
  if (r.refund < r.conv.dropped * 1 - .01) bad.push(`the dropped corners' cost did not come back: ${r.refund} wood`);
  if (r.freed) bad.push(r.freed + ' old wall tiles are not free land');
  if (!r.after.sealed || r.after.inside !== r.before.inside) bad.push('the town is not sealed the same after converting: ' + JSON.stringify([r.before, r.after]));
  if (r.gates !== 1) bad.push('gate pieces: ' + r.gates);
  if (!r.damaged.includes(30)) bad.push('the damaged tile did not keep its health on its piece');
  if (!r.survivorOut || !r.survivorCross || r.survivorCross.n !== 1 || r.survivorCross.list[0] !== 'gate') bad.push('people do not get out through the gate: ' + JSON.stringify(r.survivorCross));
  if (r.zombieIn) bad.push('zombies found a way in through a closed wall');
  if (!r.zombieBreak || r.zombieBreak.n !== 1) bad.push('a zombie route counting walls as passable does not cross exactly one piece: ' + JSON.stringify(r.zombieBreak));
  if (!/wall|fence/i.test(r.overLine)) bad.push('a building could be placed over a wall line: ' + r.overLine);
  if (r.besideLine === false) bad.push('a building was refused right beside a wall line');
  if (r.diag.cut1 || r.diag.cut2 || r.diag.across || !r.diag.beside) bad.push('diagonal / straight steps round a wall end are wrong: ' + JSON.stringify(r.diag));
  if (r.move.zombieY < r.move.line - .01 || r.move.zombieInside) bad.push('the zombie walked across the wall line: ' + JSON.stringify(r.move));
  if (r.move.survivorOutside || r.move.survivorY < r.move.northLine) bad.push('the survivor walked out across a fence: ' + JSON.stringify(r.move));
  if (r.gateWalk !== 'arrived') bad.push('a survivor on a path did not get out through the gate: ' + r.gateWalk);
  if (!r.reload.on || r.reload.edges !== r.reload.n0 || r.reload.gates !== r.reload.g0 || r.reload.tiles || !r.reload.damaged.includes(30) || !r.reload.sealed) bad.push('save and reload lost something: ' + JSON.stringify(r.reload));
  console.log(bad.length ? 'FAIL: ' + bad.join('; ') : `ok: ${r.conv.tiles} wall tiles became ${r.conv.pieces} pieces on their inner lines (${r.conv.dropped} corners not needed, ${r.refund} wood back), the old tiles are free land, the town is still sealed, people leave by the gate, zombies must break one piece, nobody crosses a line or cuts past a wall's end, and a save keeps it all`);
  if (p.errs.length) console.log('page errors:', p.errs.slice(0, 3)); await b.close(); process.exit(bad.length ? 1 : 0); })();
