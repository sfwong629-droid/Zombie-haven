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
