/* ---------------- 3D.351 W269: town walls on the lines between tiles ---------------- */
/* The rule (owner, 24 Nov, W269: "do B"; 02-DECISIONS.md, Town, walls, building): a town wall stands on the line between two tiles and takes
   no land. A piece is one tile long, with today's cost and health; a gate is a piece people walk through and zombies must break. The world
   side (which lines are shut, paths, the sealed check, building rules) is in js/world.js (Wd.edges, Wd.stepOk).
   Built in four steps, one per build: (1) 3D.351 the world, paths, movement and saves; (2) placing walls and gates on the lines; (3) zombies
   breaking and workers repairing them; (4) the look. Until step 4 a town only stands its walls on the lines when that is switched on for
   it (S.edgeWalls: ?edgewalls=1 on a new game or a load, and the checks), so the published game keeps today's walls in between. */
const EDGE_Q = typeof location !== 'undefined' && /[?&]edgewalls=1/.test(location.search);
const edgeOn = () => !!S.edgeWalls;
function edgeMax(type) { const def = Wd.WALL_DEFS[type]; return def ? Math.round(def.hp * (researched('walls') ? 1.3 : 1)) : 0; }
function putEdge(s, x, y, type, hp, broken) {
  const mx = edgeMax(type); if (!mx) return null; if (!world.edges) world.edges = new Map();
  const h = hp == null ? mx : Math.max(0, Math.min(mx, hp)), e = { s, x, y, type, hp: h, max: mx, broken: !!broken || h <= 0, edge: true }, m = Wd.edgeMid(e); e.cx = m.x; e.cy = m.y;
  world.edges.set(Wd.ekey(s, x, y), e); return e;
}
/* An old town on tiles is converted when it is switched on. Each wall tile becomes a wall on that tile's INNER edge, the line on the town's
   side (owner, 24 Nov, W269: "inner edge", replacing "outer edge" so no strip of land is left between a converted wall and the town): the
   wall moves half a tile in and sits on the edge of the land it guarded, and its old tile is outside, free. Where a wall encloses land, its
   inner sides are the ones facing that land (a building there counts as land). A ring's corner tile then has no inner side (the two
   straight runs already meet at the corner), and a second layer of a thick wall has none either: those pieces are not needed and their
   whole cost comes back. A loose piece that encloses nothing goes on the side facing the town's centre. Returns what was converted. */
function wallsToEdges() {
  if (!world.edges) world.edges = new Map();
  const tiles = [...world.walls.values()]; if (!tiles.length) return { tiles: 0, pieces: 0, dropped: 0 };
  const isW = (x, y) => world.walls.has(x + ',' + y), out = new Set(), q = [];
  const push = (x, y) => { const k = x + ',' + y; if (!out.has(k) && Wd.walkable(world, x, y, true)) { out.add(k); q.push([x, y]); } };
  for (let x = 0; x < COLS; x++) { push(x, 0); push(x, ROWS - 1); } for (let y = 0; y < ROWS; y++) { push(0, y); push(COLS - 1, y); }
  while (q.length) { const [x, y] = q.pop(); push(x + 1, y); push(x - 1, y); push(x, y + 1); push(x, y - 1); }
  const bOut = new Map(); for (const bd of world.buildings) { let o = false; for (let x = bd.x - 1; !o && x <= bd.x + bd.w; x++) for (let y = bd.y - 1; !o && y <= bd.y + bd.h; y++) if (out.has(x + ',' + y)) o = true; bOut.set(bd, o); }
  const inside = (x, y) => { if (!Wd.inMap(x, y) || isW(x, y)) return false; const bd = Wd.buildingAt(world, x, y); return bd ? !bOut.get(bd) : Wd.walkable(world, x, y, true) && !out.has(x + ',' + y); };
  const c = townCentre(), D = [[1, 0], [-1, 0], [0, 1], [0, -1]]; let n = 0, dropped = 0;
  for (const t of tiles) {
    const nb = D.map(([dx, dy]) => ({ x: t.x + dx, y: t.y + dy, dot: dx * (t.x + .5 - c.x) + dy * (t.y + .5 - c.y) })).filter((p) => !isW(p.x, p.y) && Wd.inMap(p.x, p.y));
    const encl = nb.filter((p) => inside(p.x, p.y)), corner = nb.length === 2 && nb[0].x !== nb[1].x && nb[0].y !== nb[1].y, ringPart = encl.length || corner;   /* next to guarded land, or a corner (walls on two sides at right angles) */
    let sides = encl.length ? encl : ringPart ? [] : nb.filter((p) => p.dot < -.01);
    if (!sides.length && !ringPart && nb.length) sides = [nb.reduce((a, b) => (b.dot < a.dot ? b : a))];
    let put = 0; for (const p of sides) { const e = Wd.edgeOf(t.x, t.y, p.x, p.y); if (!e || Wd.edgeAt(world, e.s, e.x, e.y)) continue; if (putEdge(e.s, e.x, e.y, t.type, t.hp, t.broken)) { n++; put++; } }
    if (!put) { dropped++; refundCost(bCost(Wd.WALL_DEFS[t.type] || Wd.WALL_DEFS.wood), 1); }
  }
  world.walls = new Map(); Wd.bump(world); return { tiles: tiles.length, pieces: n, dropped };
}
const edgesSave = () => [...(world.edges ? world.edges.values() : [])].map((e) => [e.x, e.y, e.s, e.type, Math.round(e.hp), e.broken ? 1 : 0]);
function edgesLoad(list) { world.edges = new Map(); for (const [x, y, s, type, hp, br] of list || []) if (s === 'v' || s === 'h') putEdge(s, x, y, type, hp, br); }
function edgesSwitch() {   /* after a new game or a load: switch the town on when asked, and convert any wall tiles it still has */
  if (EDGE_Q) S.edgeWalls = true;
  if (edgeOn() && world.walls.size) { const r = wallsToEdges(); if (r.tiles) logEvent(`🧱 The walls now stand on the lines between tiles, on the edge of the land they guard: ${r.tiles} wall tiles became ${r.pieces} pieces${r.dropped ? `; ${r.dropped} corner or spare pieces were not needed and their cost came back` : ''}. The old wall tiles are free land.`); }
}
/* Movement: people and zombies move freely between paths, chases, pushes and slides, in dozens of places. Rather than teach each of them,
   once a tick everyone's move since the tick began (o.pv) is checked: a step onto the next tile across a standing wall (a gate is open to
   our people only) is taken back on that axis, so they slide along the wall; a diagonal step past a wall's end is taken back too. A jump of
   more than a tile (carried, loaded, placed) is not a step. */
const EDGE_GAP = .06;
function edgeGuard() {
  if (!world.edges || !world.edges.size) return;
  const keep = (o, z) => {
    const p = o.pv; if (!p || !o.w) return; const ax = Math.floor(p.x), ay = Math.floor(p.y), bx = Math.floor(o.w.x), by = Math.floor(o.w.y);
    if ((ax === bx && ay === by) || Math.abs(bx - ax) > 1 || Math.abs(by - ay) > 1) return;
    if (Wd.stepOk(world, ax, ay, bx, by, z)) return;
    if (bx !== ax && !Wd.stepOk(world, ax, ay, bx, ay, z)) o.w.x = bx > ax ? ax + 1 - EDGE_GAP : ax + EDGE_GAP;
    const cx = Math.floor(o.w.x); if (by !== ay && !Wd.stepOk(world, cx, ay, cx, by, z)) o.w.y = by > ay ? ay + 1 - EDGE_GAP : ay + EDGE_GAP;
    const fx = Math.floor(o.w.x), fy = Math.floor(o.w.y); if (!Wd.stepOk(world, ax, ay, fx, fy, z)) o.w.y = by > ay ? ay + 1 - EDGE_GAP : ay + EDGE_GAP;   /* past a wall's end: back off one axis */
  };
  for (const q of S.sv) if (q.hp > 0 && !insideBuilding(q)) keep(q, false);
  for (const z of S.z) if (z.hp > 0) keep(z, true);
}
/* ---------------- 3D.359 W269 step 2: placing walls and gates on the lines ----------------
   With the wall tool in a town on lines: a tap puts a piece on the line nearest the finger (tap it again to take it away, half the cost
   back; a stronger wall on a weaker one upgrades it, a Gate swaps into any piece, as before). A one-finger drag draws a straight run from
   the corner where it started along the lines (sideways or up and down, whichever the finger went more), shown as a ghost with its cost;
   lifting the finger builds it, as far as the stock goes. With the tool open, two fingers move and zoom the view. A line can take a wall
   when at least one of its tiles is in the build zone; never inside a building, on a building's doorway (a gate is fine) or across a
   road (a gate only). */
const wallCount = () => world.walls.size + (world.edges ? world.edges.size : 0);
const edgeTool = () => !!(sel && sel.kind === 'wall' && edgeOn());
function edgeNear(wx, wy) {   /* the line nearest a point on the ground */
  const fx = Math.floor(wx), fy = Math.floor(wy), ax = wx - fx, ay = wy - fy;
  return [{ s: 'v', x: fx, y: fy, d: ax }, { s: 'v', x: fx + 1, y: fy, d: 1 - ax }, { s: 'h', x: fx, y: fy, d: ay }, { s: 'h', x: fx, y: fy + 1, d: 1 - ay }].reduce((a, b) => (b.d < a.d ? b : a));
}
function edgeDoorOf(b) { const t = Wd.approachTile(b); return Wd.edgeOf(Math.max(b.x, Math.min(b.x + b.w - 1, t.x)), Math.max(b.y, Math.min(b.y + b.h - 1, t.y)), t.x, t.y); }
function edgeWhy(e, type) {   /* why a wall of this type can't stand on this line, or null */
  const [a, b] = Wd.edgeTiles(e);
  if (!Wd.inMap(a.x, a.y) || !Wd.inMap(b.x, b.y)) return 'That is the edge of the map.';
  if (!Wd.inTown(a.x, a.y) && !Wd.inTown(b.x, b.y)) return 'Walls go in the build zone or on its edge.';
  const ba = Wd.buildingAt(world, a.x, a.y), bb = Wd.buildingAt(world, b.x, b.y);
  if (ba && ba === bb) return 'A building is in the way.';
  if (type !== 'gate') for (const bd of [ba, bb]) { if (!bd) continue; const d = edgeDoorOf(bd); if (d && d.s === e.s && d.x === e.x && d.y === e.y) return `That's the ${DEFS[bd.type].name}'s doorway: keep it clear (a gate is fine).`; }
  if (type !== 'gate' && Wd.isRoad(world, a.x, a.y) && Wd.isRoad(world, b.x, b.y)) return 'Use a Gate to close a road.';
  return null;
}
function edgeLocked(type) { const wd = Wd.WALL_DEFS[type]; if (wd.rank > S.rank) return wd.name + ' needs Haven level ' + lvlOfRank(wd.rank) + '.'; if ((wd.tier || 1) > hqTier()) return wd.name + ' needs the ' + hqName(wd.tier) + '.'; return null; }
function setEdgeType(ex, type) { ex.type = type; ex.broken = false; ex.max = edgeMax(type); ex.hp = ex.max; }
const edgeUpgrades = (ex, type) => { const wd = Wd.WALL_DEFS[type], od = Wd.WALL_DEFS[ex.type]; return (type === 'gate' && ex.type !== 'gate') || (!!wd.lvl && !!od.lvl && wd.lvl > od.lvl); };
function tryEdgeWall(e, type) {   /* one tap on a line */
  const wd = Wd.WALL_DEFS[type], k = Wd.ekey(e.s, e.x, e.y), ex = world.edges.get(k);
  if (ex && ex.type === type) { if (!confirmTile('e' + e.s, e.x, e.y, `Tap the ${wd.name} again to remove it (half the cost back).`)) return; world.edges.delete(k); Wd.bump(world); refundCost(bCost(wd), .5); say(wd.name + ' removed.'); checkPerimeter(); saveGame(); ui(); return; }
  const why = edgeWhy(e, type) || edgeLocked(type); if (why) { say(why); return; }
  if (ex && !edgeUpgrades(ex, type)) { say('Remove the ' + Wd.WALL_DEFS[ex.type].name + ' first.'); return; }
  if (!canPay(bCost(wd))) { say('Not enough: need ' + missText(bCost(wd)) + '.'); return; }
  payCost(bCost(wd));
  if (ex) { refundCost(bCost(Wd.WALL_DEFS[ex.type]), .5); const old = Wd.WALL_DEFS[ex.type].name; setEdgeType(ex, type); say(type === 'gate' ? old + ' swapped for a Gate.' : old + ' upgraded to ' + wd.name + '.'); }
  else putEdge(e.s, e.x, e.y, type);
  Wd.bump(world); checkPerimeter(); saveGame(); ui();
}
/* the drag: a straight run of lines between two corners */
let edgeDraft = null;
function edgeRun(a, b) {
  const out = [];
  if (Math.abs(b.x - a.x) >= Math.abs(b.y - a.y)) for (let x = Math.min(a.x, b.x); x < Math.max(a.x, b.x); x++) out.push({ s: 'h', x, y: a.y });
  else for (let y = Math.min(a.y, b.y); y < Math.max(a.y, b.y); y++) out.push({ s: 'v', x: a.x, y });
  return out;
}
function draftMark(list, type) {   /* what each piece of the run would be: have (already there), new or up (paid), bad (can't), short (no money left) */
  const wd = Wd.WALL_DEFS[type], lock = edgeLocked(type), left = {}; for (const r of ['wood', 'stone', 'mat']) left[r] = S[r] || 0; let cost = {};
  const take = (c) => { for (const [r, v] of Object.entries(c)) if ((left[r] || 0) < v) return false; for (const [r, v] of Object.entries(c)) { left[r] -= v; cost[r] = (cost[r] || 0) + v; } return true; };
  for (const p of list) {
    const ex = world.edges.get(Wd.ekey(p.s, p.x, p.y));
    if (ex && ex.type === type) { p.st = 'have'; continue; }
    const why = lock || edgeWhy(p, type); if (why) { p.st = 'bad'; p.why = why; continue; }
    if (ex && !edgeUpgrades(ex, type)) { p.st = 'bad'; p.why = 'Remove the ' + Wd.WALL_DEFS[ex.type].name + ' first.'; continue; }
    p.st = take(bCost(wd)) ? (ex ? 'up' : 'new') : 'short';
  }
  return { list, cost, type };
}
function edgeDraftAt(a, b) { edgeDraft = a && b && (a.x !== b.x || a.y !== b.y) ? draftMark(edgeRun(a, b), sel.wtype) : null; if (edgeDraft) { const n = edgeDraft.list.filter((p) => p.st === 'new' || p.st === 'up').length, sh = edgeDraft.list.filter((p) => p.st === 'short').length; const c = costShort(edgeDraft.cost); say(n ? `${n} × ${Wd.WALL_DEFS[sel.wtype].name}: ${c || 'free'}${sh ? ` · ${sh} more need more stock` : ''}` : sh ? 'Not enough stock for this run.' : (edgeDraft.list.find((p) => p.why) || {}).why || 'Already built.'); } }
function edgeDraftPlace() {
  const d = edgeDraft; edgeDraft = null; if (!d) return;
  const wd = Wd.WALL_DEFS[d.type]; let n = 0;
  for (const p of d.list) { if (p.st !== 'new' && p.st !== 'up') continue; if (!canPay(bCost(wd))) break; payCost(bCost(wd)); const ex = world.edges.get(Wd.ekey(p.s, p.x, p.y)); if (ex) { refundCost(bCost(Wd.WALL_DEFS[ex.type]), .5); setEdgeType(ex, d.type); } else putEdge(p.s, p.x, p.y, d.type); n++; }
  const sh = d.list.filter((p) => p.st === 'short').length, bad = d.list.filter((p) => p.st === 'bad');
  if (n) { Wd.bump(world); checkPerimeter(); saveGame(); ui(); }
  say(n ? `${n} × ${wd.name} built.${sh ? ` ${sh} more need more stock.` : ''}${bad.length ? ` ${bad.length} skipped: ${bad[0].why}` : ''}` : bad.length ? bad[0].why : sh ? 'Not enough: need ' + missText(bCost(wd)) + '.' : 'Already built.');
}
/* where the zombies' way in is, for the "gaps in your wall" helpers: walk from the town out to the map's edge across open lines; the line
   where that walk leaves the build zone is a gap; pretend it is walled and walk again. Each gap is marked on the tile just inside it. */
function findGapsEdge(max = 8) {
  const B = Wd.BUILD, inB = (x, y) => x >= B.x0 && x <= B.x1 && y >= B.y0 && y <= B.y1, plug = new Set(), out = [];
  let seed = Wd.nearestWalkable(world, Math.floor((B.x0 + B.x1) / 2), Math.floor((B.y0 + B.y1) / 2), true); if (!seed) return [];
  const ok = (a, b) => Wd.inMap(b.x, b.y) && Wd.walkable(world, b.x, b.y, true) && Wd.stepOk(world, a.x, a.y, b.x, b.y, true) && !plug.has(Wd.ekey(...(() => { const e = Wd.edgeOf(a.x, a.y, b.x, b.y); return [e.s, e.x, e.y]; })()));
  for (let it = 0; it < max; it++) {
    const prev = new Map([[seed.x + ',' + seed.y, null]]), q = [seed]; let end = null;
    for (let i = 0; i < q.length && !end; i++) { const c = q[i]; if (c.x === 0 || c.y === 0 || c.x === COLS - 1 || c.y === ROWS - 1) { end = c; break; }
      for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) { const n = { x: c.x + dx, y: c.y + dy }, k = n.x + ',' + n.y; if (!prev.has(k) && ok(c, n)) { prev.set(k, c); q.push(n); } } }
    if (!end) break;
    let c = end, gap = null; while (c) { const p = prev.get(c.x + ',' + c.y); if (p && inB(p.x, p.y) && !inB(c.x, c.y)) gap = { a: p, b: c }; c = p; }
    if (!gap) break; const e = Wd.edgeOf(gap.a.x, gap.a.y, gap.b.x, gap.b.y); plug.add(Wd.ekey(e.s, e.x, e.y)); out.push({ x: gap.a.x, y: gap.a.y, label: 'wall', edge: e });
  }
  return out;
}
