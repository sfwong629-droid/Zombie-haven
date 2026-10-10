/* Zombie Haven — world model (no DOM). Tile-unit coordinates, grid-first buildings with south-corner anchors. */
(function (root, factory) {
  if (typeof module === 'object' && module.exports) module.exports = factory(require('./iso.js'));
  else root.ZHWorld = factory(root.ZHIso);
})(typeof self !== 'undefined' ? self : this, function (Iso) {
  // V2.13: the map grew east and south (16x20 -> 28x30) so old saves keep their coordinates.
  // The town's TERRITORY starts as the old build zone and grows in tiers bought with Renown + parts.
  const COLS = 28, ROWS = 30;
  const TERRITORY = [
    { x0: 2, y0: 6, x1: 13, y1: 17, ren: 0, mat: 0 },
    { x0: 2, y0: 4, x1: 17, y1: 21, ren: 60, mat: 15 },
    { x0: 2, y0: 3, x1: 21, y1: 25, ren: 160, mat: 30 },
    { x0: 2, y0: 2, x1: 25, y1: 27, ren: 320, mat: 50 },
  ];
  const BUILD = { x0: 2, y0: 6, x1: 13, y1: 17 };

  // sprite: 'grid' = grid-first asset whose anchor/scale come from its own JSON; otherwise legacy silhouette-anchored art.
  // V2.6 economy: no money. mat = PARTS to build (cumulative for upgraded tiers); up = parts to upgrade from the previous tier.
  // fam/tier/next = building family ladder (footprint fixed per family, so upgrades happen in place). slot = one staff slot (auto-staffed).
  const D = (o) => Object.assign({ w: 2, h: 2, q: 10, a: 8, rank: 1, cap: 1, door: [1, 1.6] }, o);
  const DEFS = {
    water:    D({ name: 'Rain Collector', mat: 4,  a: 4,  role: 'water',   fam: 'water',   tier: 1, next: 'well',     sprite: 'grid', slot: true, out: 4 }),
    well:     D({ name: 'Well',           mat: 14, a: 6,  q: 12, role: 'water', fam: 'water', tier: 2, rank: 2, slot: true, out: 8, hidden: true }),
    farm:     D({ name: 'Garden Plot',    mat: 5,  a: 5,  role: 'food',    fam: 'farm',    tier: 1, next: 'field',    sprite: 'grid', slot: true, out: 4, waterUse: 2 }),
    field:    D({ name: 'Farm',           mat: 17, a: 7,  q: 12, role: 'food', fam: 'farm', tier: 2, rank: 2, slot: true, out: 8, waterUse: 3, hidden: true }),
    medic:    D({ name: 'Medical Tent',   mat: 6,  a: 10, role: 'medical', fam: 'medical', tier: 1, next: 'clinic',   sprite: 'grid', slot: true, cap: 2 }),
    clinic:   D({ name: 'Clinic',         mat: 20, a: 13, q: 13, role: 'medical', fam: 'medical', tier: 2, rank: 2, next: 'hospital', slot: true, cap: 3, hidden: true }),
    hospital: D({ name: 'Hospital',       mat: 44, a: 16, q: 16, role: 'medical', fam: 'medical', tier: 3, rank: 3, door: [0.83, 1.6], sprite: 'grid', slot: true, cap: 3, hidden: true }),
    canteen:  D({ name: 'Canteen',        mat: 8,  a: 10, role: 'food',    cap: 2, fam: 'kitchen', slot: true }),   // V2.12: a Cook on shift makes meals 50% more filling
    armory:   D({ name: 'Armory',         mat: 12, a: 12, role: 'gear' }),
    house:    D({ name: 'House',          mat: 6,  a: 8,  role: 'home' }),
    workshop: D({ name: 'Workshop',       mat: 14, q: 12, role: 'engineering', rank: 2 }),
    storage:  D({ name: 'Storage',        mat: 10, a: 4,  q: 8, role: 'storage', rank: 2 }),
    // V2.14 training buildings: each raises one survivor stat when visited (placeholder art for now)
    gym:      D({ name: 'Gym',            mat: 9,  a: 9,  role: 'train', cap: 2, train: 'str' }),
    library:  D({ name: 'Library',        mat: 9,  a: 9,  role: 'train', cap: 2, train: 'int' }),
    lounge:   D({ name: 'Lounge',         mat: 8,  a: 10, role: 'train', cap: 3, train: 'cha' }),
    range:    D({ name: 'Shooting Range', mat: 12, a: 8,  role: 'train', cap: 2, train: 'per', rank: 2 }),
    track:    D({ name: 'Obstacle Course', mat: 11, a: 8, role: 'train', cap: 2, train: 'agi', rank: 2 }),
    sparring: D({ name: 'Sparring Ring',  mat: 11, a: 8,  role: 'train', cap: 2, train: 'end', rank: 2 }),
    barracks: D({ name: 'Barracks',       mat: 16, q: 12, role: 'security', rank: 3, w: 3, h: 2, door: [1.5, 1.6] }),
  };
  for (const d of Object.values(DEFS)) { d.cost = 0; if (d.next) d.up = DEFS[d.next] ? DEFS[d.next].mat - d.mat : 0; }
  // matching professions per family (one staff slot each): matching gives the boost, anyone else adds nothing
  const STAFF_JOBS = { water: ['Engineer', 'Mechanic'], farm: ['Farmer'], medical: ['Medic', 'Paramedic'], kitchen: ['Cook'] };
  const ROAD_COST = 1;  // parts per road tile
  // V2.7 walls: single-tile segments on the grid with hit points; the gate is the one wall tile survivors can walk through (zombies must break it).
  const WALL_DEFS = {
    wood:  { name: 'Wood Barricade', mat: 1, hp: 80,  rank: 1 },
    metal: { name: 'Metal Wall',     mat: 3, hp: 220, rank: 2 },
    gate:  { name: 'Gate',           mat: 4, hp: 140, rank: 1 },
  };
  const WALLZONE = { x0: 1, y0: 5, x1: 14, y1: 18 };   // build zone grown by one tile so a ring can enclose it
  function setTerritory(tier) {   // mutates BUILD and WALLZONE in place (everything reads them live)
    const t = TERRITORY[Math.max(0, Math.min(TERRITORY.length - 1, tier | 0))];
    Object.assign(BUILD, { x0: t.x0, y0: t.y0, x1: t.x1, y1: t.y1 });
    Object.assign(WALLZONE, { x0: Math.max(1, t.x0 - 1), y0: Math.max(1, t.y0 - 1), x1: Math.min(COLS - 2, t.x1 + 1), y1: Math.min(ROWS - 2, t.y1 + 1) });
  }
  const ROAD_COORDS = [
    [2,10],[3,10],[4,10],[5,10],[6,10],[7,10],[8,10],[9,10],[10,10],[11,10],[12,10],[13,10],
    [7,6],[7,7],[7,8],[7,9],[7,11],[7,12],[7,13],[7,14],[7,15],[7,16],[7,17],
    [3,14],[4,14],[5,14],[6,14],[8,14],[9,14],[10,14],[11,14],[12,14],
    [4,8],[5,8],[6,8],[8,8],[9,8],[10,8],[11,8],
    [4,11],[4,12],[4,13],[10,11],[10,12],[10,13],
  ];

  const key = (x, y) => x + ',' + y;
  function createWorld() { return { roads: new Set(ROAD_COORDS.map(([x, y]) => key(x, y))), buildings: [], walls: new Map(), ver: 0 }; }
  const bump = (w) => { w.ver++; };
  const isRoad = (w, x, y) => w.roads.has(key(x, y));
  const inMap = (x, y) => x >= 0 && y >= 0 && x < COLS && y < ROWS;
  const inTown = (x, y) => x >= BUILD.x0 && x <= BUILD.x1 && y >= BUILD.y0 && y <= BUILD.y1;
  function buildingAt(w, x, y) { for (const b of w.buildings) if (x >= b.x && x < b.x + b.w && y >= b.y && y < b.y + b.h) return b; return null; }
  const inWallZone = (x, y) => x >= WALLZONE.x0 && x <= WALLZONE.x1 && y >= WALLZONE.y0 && y <= WALLZONE.y1;
  const wallAt = (w, x, y) => (w.walls && w.walls.get(key(x, y))) || null;
  // z = true for zombies: every wall (the gate too) is solid. Survivors can pass the gate.
  const walkable = (w, x, y, z = false) => { if (!inMap(x, y) || buildingAt(w, x, y)) return false; const wl = wallAt(w, x, y); return !wl || (!z && wl.type === 'gate'); };

  // door: world point just INSIDE the entrance (front-left wall), so the door tile is part of the footprint.
  // approach: the tile just outside that wall, which survivors walk to before stepping in.
  const doorOf = (type, w, h) => (DEFS[type] && DEFS[type].door) || [w / 2, h - .4];
  function doorPoint(b) { const d = doorOf(b.type, b.w, b.h); return { x: b.x + d[0], y: b.y + d[1] }; }
  function doorTile(b) { const p = doorPoint(b); return { x: Math.floor(p.x), y: Math.floor(p.y) }; }
  function approachTile(b) { const d = doorOf(b.type, b.w, b.h); return { x: Math.floor(b.x + d[0]), y: b.y + b.h }; }
  function approachPoint(b) { const d = doorOf(b.type, b.w, b.h); return { x: b.x + d[0], y: b.y + b.h + .35 }; }

  function footprintCheck(w, x, y, def, ignore = null) {
    if (x < BUILD.x0 || y < BUILD.y0 || x + def.w - 1 > BUILD.x1 || y + def.h - 1 > BUILD.y1) return { ok: false, why: 'Outside the build zone' };
    for (let yy = 0; yy < def.h; yy++) for (let xx = 0; xx < def.w; xx++) if (isRoad(w, x + xx, y + yy)) return { ok: false, why: 'Blocked by road' };
    const cand = { x, y, w: def.w, h: def.h };
    if (w.buildings.some(b => b !== ignore && Iso.rectsOverlap(b, cand))) return { ok: false, why: 'Tile occupied' };
    const dt = { x: Math.floor(x + def.door[0]), y: y + def.h };   // the approach tile in front of the door must stay free
    if (!inMap(dt.x, dt.y) || (buildingAt(w, dt.x, dt.y) && buildingAt(w, dt.x, dt.y) !== ignore)) return { ok: false, why: 'Entrance is blocked' };
    return { ok: true, why: '' };
  }
  function entranceReachable(w, x, y, def) {
    const dt = { x: Math.floor(x + def.door[0]), y: y + def.h };
    const tmp = { type: '_probe', x, y, w: def.w, h: def.h };
    w.buildings.push(tmp);
    const p = findPath(w, { x: 7, y: 10 }, dt); w.buildings.pop();
    return !!p;
  }
  function placementCheck(w, x, y, def, ignore = null) {
    const f = footprintCheck(w, x, y, def, ignore); if (!f.ok) return f;
    if (!entranceReachable(w, x, y, def)) return { ok: false, why: 'Entrance unreachable' };
    return f;
  }

  class Heap {
    constructor() { this.a = []; }
    push(n) { const a = this.a; a.push(n); let i = a.length - 1; while (i > 0) { const p = (i - 1) >> 1; if (a[p].f <= a[i].f) break; [a[p], a[i]] = [a[i], a[p]]; i = p; } }
    pop() { const a = this.a, t = a[0], l = a.pop(); if (a.length) { a[0] = l; let i = 0; for (;;) { let m = i, L = 2 * i + 1, R = L + 1; if (L < a.length && a[L].f < a[m].f) m = L; if (R < a.length && a[R].f < a[m].f) m = R; if (m === i) break; [a[m], a[i]] = [a[i], a[m]]; i = m; } } return t; }
    get size() { return this.a.length; }
  }
  const stepCost = (w, x, y) => isRoad(w, x, y) ? 1 : (inTown(x, y) ? 2.2 : 2.8);
  function nearestWalkable(w, gx, gy, z = false) {
    if (walkable(w, gx, gy, z)) return { x: gx, y: gy };
    for (let r = 1; r < 5; r++) for (let dy = -r; dy <= r; dy++) for (let dx = -r; dx <= r; dx++) if (Math.max(Math.abs(dx), Math.abs(dy)) === r && walkable(w, gx + dx, gy + dy, z)) return { x: gx + dx, y: gy + dy };
    return null;
  }
  // tiles AFTER start up to the goal (inclusive); [] if already there; null if unreachable
  function findPath(w, from, to, z = false) {
    const tb = buildingAt(w, to.x, to.y), gt = tb && !z ? approachTile(tb) : to;   // a goal inside a building = its approach tile
    const fb = buildingAt(w, from.x, from.y), ft = fb && !z ? approachTile(fb) : from;   // leaving a building = start from its approach tile
    const g = nearestWalkable(w, gt.x, gt.y, z), s = nearestWalkable(w, ft.x, ft.y, z); if (!g || !s) return null;
    if (s.x === g.x && s.y === g.y) return [];
    const best = new Map([[key(s.x, s.y), 0]]), prev = new Map(), heap = new Heap();
    heap.push({ x: s.x, y: s.y, g: 0, f: Math.abs(s.x - g.x) + Math.abs(s.y - g.y) });
    let guard = 0;
    while (heap.size && guard++ < 6000) {
      const c = heap.pop(); if (c.g > (best.get(key(c.x, c.y)) ?? 1e9)) continue;
      if (c.x === g.x && c.y === g.y) { const out = []; let k = key(c.x, c.y); while (prev.has(k)) { const [px, py] = k.split(',').map(Number); out.push({ x: px, y: py }); k = prev.get(k); } return out.reverse(); }
      for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
        const nx = c.x + dx, ny = c.y + dy; if (!walkable(w, nx, ny, z)) continue;
        const ng = c.g + stepCost(w, nx, ny), k = key(nx, ny);
        if (ng < (best.get(k) ?? 1e9)) { best.set(k, ng); prev.set(k, key(c.x, c.y)); heap.push({ x: nx, y: ny, g: ng, f: ng + Math.abs(nx - g.x) + Math.abs(ny - g.y) }); }
      }
    }
    return null;
  }

  // Perimeter check: flood-fill from the town centre treating walls (gate included) and buildings as solid, the way zombies see them.
  function perimeter(w) {
    let weakest = null, n = 0, gates = 0; for (const wl of w.walls.values()) { n++; if (wl.type === 'gate') gates++; if (!weakest || wl.hp / wl.max < weakest.hp / weakest.max) weakest = wl; }
    const seed = nearestWalkable(w, 7, 10, true); if (!seed) return { sealed: false, walls: n, gates, weakest, area: 0 };
    const seen = new Set([key(seed.x, seed.y)]), q = [seed]; let open = false;
    while (q.length) { const c = q.pop(); if (c.x === 0 || c.y === 0 || c.x === COLS - 1 || c.y === ROWS - 1) open = true;
      for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) { const nx = c.x + dx, ny = c.y + dy, k = key(nx, ny); if (!seen.has(k) && walkable(w, nx, ny, true)) { seen.add(k); q.push({ x: nx, y: ny }); } } }
    return { sealed: !open, walls: n, gates, weakest, area: seen.size };
  }
  return { TERRITORY, setTerritory, WALL_DEFS, WALLZONE, inWallZone, wallAt, perimeter, COLS, ROWS, BUILD, DEFS, STAFF_JOBS, ROAD_COST, ROAD_COORDS, key, createWorld, bump, isRoad, inMap, inTown, buildingAt, walkable, doorPoint, doorTile, approachTile, approachPoint, footprintCheck, placementCheck, entranceReachable, findPath, nearestWalkable };
});
