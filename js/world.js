/* Zombie Haven — world model (no DOM). Tile-unit coordinates, grid-first buildings with south-corner anchors. */
(function (root, factory) {
  if (typeof module === 'object' && module.exports) module.exports = factory(require('./iso.js'));
  else root.ZHWorld = factory(root.ZHIso);
})(typeof self !== 'undefined' ? self : this, function (Iso) {
  const COLS = 16, ROWS = 20;
  const BUILD = { x0: 2, y0: 6, x1: 13, y1: 17 };

  // sprite: 'grid' = grid-first asset whose anchor/scale come from its own JSON; otherwise legacy silhouette-anchored art.
  // V2.6 economy: no money. mat = PARTS to build (cumulative for upgraded tiers); up = parts to upgrade from the previous tier.
  // fam/tier/next = building family ladder (footprint fixed per family, so upgrades happen in place). slot = one staff slot (auto-staffed).
  const D = (o) => Object.assign({ w: 2, h: 2, q: 10, a: 8, rank: 1, cap: 1, door: [1, 2.35] }, o);
  const DEFS = {
    water:    D({ name: 'Rain Collector', mat: 4,  a: 4,  role: 'water',   fam: 'water',   tier: 1, next: 'well',     sprite: 'grid', slot: true, out: 4 }),
    well:     D({ name: 'Well',           mat: 14, a: 6,  q: 12, role: 'water', fam: 'water', tier: 2, rank: 2, slot: true, out: 8, hidden: true }),
    farm:     D({ name: 'Garden Plot',    mat: 5,  a: 5,  role: 'food',    fam: 'farm',    tier: 1, next: 'field',    sprite: 'grid', slot: true, out: 4, waterUse: 2 }),
    field:    D({ name: 'Farm',           mat: 17, a: 7,  q: 12, role: 'food', fam: 'farm', tier: 2, rank: 2, slot: true, out: 8, waterUse: 3, hidden: true }),
    medic:    D({ name: 'Medical Tent',   mat: 6,  a: 10, role: 'medical', fam: 'medical', tier: 1, next: 'clinic',   sprite: 'grid', slot: true, cap: 2 }),
    clinic:   D({ name: 'Clinic',         mat: 20, a: 13, q: 13, role: 'medical', fam: 'medical', tier: 2, rank: 2, next: 'hospital', slot: true, cap: 3, hidden: true }),
    hospital: D({ name: 'Hospital',       mat: 44, a: 16, q: 16, role: 'medical', fam: 'medical', tier: 3, rank: 3, door: [0.83, 2.35], sprite: 'grid', slot: true, cap: 3, hidden: true }),
    canteen:  D({ name: 'Canteen',        mat: 8,  a: 10, role: 'food',    cap: 2 }),
    armory:   D({ name: 'Armory',         mat: 12, a: 12, role: 'gear' }),
    house:    D({ name: 'House',          mat: 6,  a: 8,  role: 'home' }),
    workshop: D({ name: 'Workshop',       mat: 14, q: 12, role: 'engineering', rank: 2 }),
    storage:  D({ name: 'Storage',        mat: 10, a: 4,  q: 8, role: 'storage', rank: 2 }),
    barracks: D({ name: 'Barracks',       mat: 16, q: 12, role: 'security', rank: 3, w: 3, h: 2, door: [1.5, 2.35] }),
  };
  for (const d of Object.values(DEFS)) { d.cost = 0; if (d.next) d.up = DEFS[d.next] ? DEFS[d.next].mat - d.mat : 0; }
  // matching professions per family (one staff slot each): matching gives the boost, anyone else adds nothing
  const STAFF_JOBS = { water: ['Engineer', 'Mechanic'], farm: ['Farmer'], medical: ['Medic', 'Paramedic'] };
  const ROAD_COST = 1;  // parts per road tile
  const ROAD_COORDS = [
    [2,10],[3,10],[4,10],[5,10],[6,10],[7,10],[8,10],[9,10],[10,10],[11,10],[12,10],[13,10],
    [7,6],[7,7],[7,8],[7,9],[7,11],[7,12],[7,13],[7,14],[7,15],[7,16],[7,17],
    [3,14],[4,14],[5,14],[6,14],[8,14],[9,14],[10,14],[11,14],[12,14],
    [4,8],[5,8],[6,8],[8,8],[9,8],[10,8],[11,8],
    [4,11],[4,12],[4,13],[10,11],[10,12],[10,13],
  ];

  const key = (x, y) => x + ',' + y;
  function createWorld() { return { roads: new Set(ROAD_COORDS.map(([x, y]) => key(x, y))), buildings: [], ver: 0 }; }
  const bump = (w) => { w.ver++; };
  const isRoad = (w, x, y) => w.roads.has(key(x, y));
  const inMap = (x, y) => x >= 0 && y >= 0 && x < COLS && y < ROWS;
  const inTown = (x, y) => x >= BUILD.x0 && x <= BUILD.x1 && y >= BUILD.y0 && y <= BUILD.y1;
  function buildingAt(w, x, y) { for (const b of w.buildings) if (x >= b.x && x < b.x + b.w && y >= b.y && y < b.y + b.h) return b; return null; }
  const walkable = (w, x, y) => inMap(x, y) && !buildingAt(w, x, y);

  // door: world point just outside the entrance; the routing goal is its tile.
  function doorPoint(b) { const d = DEFS[b.type] || { door: [b.w / 2, b.h + .35] }; return { x: b.x + d.door[0], y: b.y + d.door[1] }; }
  function doorTile(b) { const p = doorPoint(b); return { x: Math.floor(p.x), y: Math.floor(p.y) }; }

  function footprintCheck(w, x, y, def, ignore = null) {
    if (x < BUILD.x0 || y < BUILD.y0 || x + def.w - 1 > BUILD.x1 || y + def.h - 1 > BUILD.y1) return { ok: false, why: 'Outside the build zone' };
    for (let yy = 0; yy < def.h; yy++) for (let xx = 0; xx < def.w; xx++) if (isRoad(w, x + xx, y + yy)) return { ok: false, why: 'Blocked by road' };
    const cand = { x, y, w: def.w, h: def.h };
    if (w.buildings.some(b => b !== ignore && Iso.rectsOverlap(b, cand))) return { ok: false, why: 'Tile occupied' };
    const dp = { x: x + def.door[0], y: y + def.door[1] }, dt = { x: Math.floor(dp.x), y: Math.floor(dp.y) };
    if (!inMap(dt.x, dt.y) || (buildingAt(w, dt.x, dt.y) && buildingAt(w, dt.x, dt.y) !== ignore)) return { ok: false, why: 'Entrance is blocked' };
    return { ok: true, why: '' };
  }
  function entranceReachable(w, x, y, def) {
    const dt = { x: Math.floor(x + def.door[0]), y: Math.floor(y + def.door[1]) };
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
  function nearestWalkable(w, gx, gy) {
    if (walkable(w, gx, gy)) return { x: gx, y: gy };
    for (let r = 1; r < 5; r++) for (let dy = -r; dy <= r; dy++) for (let dx = -r; dx <= r; dx++) if (Math.max(Math.abs(dx), Math.abs(dy)) === r && walkable(w, gx + dx, gy + dy)) return { x: gx + dx, y: gy + dy };
    return null;
  }
  // tiles AFTER start up to the goal (inclusive); [] if already there; null if unreachable
  function findPath(w, from, to) {
    const g = nearestWalkable(w, to.x, to.y), s = nearestWalkable(w, from.x, from.y); if (!g || !s) return null;
    if (s.x === g.x && s.y === g.y) return [];
    const best = new Map([[key(s.x, s.y), 0]]), prev = new Map(), heap = new Heap();
    heap.push({ x: s.x, y: s.y, g: 0, f: Math.abs(s.x - g.x) + Math.abs(s.y - g.y) });
    let guard = 0;
    while (heap.size && guard++ < 6000) {
      const c = heap.pop(); if (c.g > (best.get(key(c.x, c.y)) ?? 1e9)) continue;
      if (c.x === g.x && c.y === g.y) { const out = []; let k = key(c.x, c.y); while (prev.has(k)) { const [px, py] = k.split(',').map(Number); out.push({ x: px, y: py }); k = prev.get(k); } return out.reverse(); }
      for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
        const nx = c.x + dx, ny = c.y + dy; if (!walkable(w, nx, ny)) continue;
        const ng = c.g + stepCost(w, nx, ny), k = key(nx, ny);
        if (ng < (best.get(k) ?? 1e9)) { best.set(k, ng); prev.set(k, key(c.x, c.y)); heap.push({ x: nx, y: ny, g: ng, f: ng + Math.abs(nx - g.x) + Math.abs(ny - g.y) }); }
      }
    }
    return null;
  }

  return { COLS, ROWS, BUILD, DEFS, STAFF_JOBS, ROAD_COST, ROAD_COORDS, key, createWorld, bump, isRoad, inMap, inTown, buildingAt, walkable, doorPoint, doorTile, footprintCheck, placementCheck, entranceReachable, findPath, nearestWalkable };
});
