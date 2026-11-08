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
    { x0: 2, y0: 4, x1: 17, y1: 21, ren: 60, mat: 8, wood: 20 },
    { x0: 2, y0: 3, x1: 21, y1: 25, ren: 160, mat: 15, wood: 35 },
    { x0: 2, y0: 2, x1: 25, y1: 27, ren: 320, mat: 25, wood: 50 },
  ];
  const BUILD = { x0: 2, y0: 6, x1: 13, y1: 17 };

  // sprite: 'grid' = grid-first asset whose anchor/scale come from its own JSON; otherwise legacy silhouette-anchored art.
  // V2.6 economy: no money. mat = PARTS to build (cumulative for upgraded tiers); up = parts to upgrade from the previous tier.
  // fam/tier/next = building family ladder (footprint fixed per family, so upgrades happen in place). slot = one staff slot (auto-staffed).
  const D = (o) => Object.assign({ w: 1, h: 1, q: 10, a: 8, rank: 1, cap: 1, door: null, wood: 0, mat: 0, stone: 0, cloth: 0, meds: 0, fuel: 0 }, o);   // V2.25: DV2-style small footprints; door defaults to the middle of the south side
  /* V3D.23 building tiers: Camp (tents, scrap) -> Timber (logs, planks) -> Stone. tier = material tier, unlocked by the HQ tier.
     A family (fam) upgrades in place along next; its footprint is fixed. wood / mat (= scrap) / stone = the price of THIS step
     (building it new for a tier-1 type, upgrading into it otherwise). up = only reachable by upgrading.
     like = behaves like that older type everywhere the game asks for a type (beds, meals, storage, research...). hidden = not in the Build menu. */
  /* 3D.41 owner: tier-1 buildings are 1x1 (only the Camp is bigger). A family can grow when it upgrades: the player places the bigger
     footprint (and turns it) before the upgrade starts. */
  const DEFS = {
    hq:       D({ name: 'Camp',  role: 'hq', fam: 'hq', tier: 1, next: 'hq2', w: 2, h: 2, a: 10, hidden: true, icon: 'inn' }),
    hq2:      D({ name: 'Lodge', role: 'hq', fam: 'hq', tier: 2, next: 'hq3', w: 2, h: 2, a: 12, q: 12, wood: 20, mat: 8, rank: 2, up: true, icon: 'inn' }),
    hq3:      D({ name: 'Fort',  role: 'hq', fam: 'hq', tier: 3, w: 2, h: 2, a: 16, q: 16, stone: 30, wood: 20, mat: 12, fuel: 2, rank: 3, up: true, icon: 'barracks' }),
    tent:     D({ name: 'Tent',        like: 'inn', role: 'inn', fam: 'housing', tier: 1, next: 'cabin', cap: 2, a: 6, wood: 3, mat: 3, icon: 'inn' }),
    cabin:    D({ name: 'Cabin',       like: 'inn', role: 'inn', fam: 'housing', tier: 2, next: 'stonehouse', cap: 3, a: 9, wood: 10, mat: 3, up: true, icon: 'house' }),
    stonehouse: D({ name: 'Stone House', like: 'inn', role: 'inn', fam: 'housing', tier: 3, cap: 4, a: 12, q: 12, stone: 12, wood: 6, mat: 4, cloth: 2, up: true, icon: 'house' }),
    barrel:   D({ name: 'Rain Barrel',    like: 'water', role: 'water', fam: 'water', tier: 1, next: 'water', slot: true, out: 3, a: 3, wood: 3, mat: 2, icon: 'water' }),
    water:    D({ name: 'Rain Collector', role: 'water', fam: 'water', tier: 2, next: 'well', sprite: 'grid', slot: true, out: 6, a: 4, wood: 8, mat: 2, up: true }),
    well:     D({ name: 'Stone Well',     role: 'water', fam: 'water', tier: 3, slot: true, out: 10, a: 6, q: 12, stone: 10, wood: 4, mat: 4, up: true }),
    farm:     D({ name: 'Garden Plot',    role: 'food', fam: 'farm', tier: 1, next: 'field', w: 1, sprite: 'grid', slot: true, out: 4, waterUse: 2, a: 5, wood: 4 }),
    field:    D({ name: 'Fenced Farm',    role: 'food', fam: 'farm', tier: 2, next: 'irrig', w: 1, slot: true, out: 7, waterUse: 3, a: 7, q: 12, wood: 10, mat: 3, up: true }),
    irrig:    D({ name: 'Irrigated Farm', like: 'field', role: 'food', fam: 'farm', tier: 3, w: 1, slot: true, out: 11, waterUse: 4, a: 9, q: 13, stone: 8, wood: 6, mat: 6, up: true, icon: 'field' }),
    canteen:  D({ name: 'Canteen',   role: 'food', fam: 'kitchen', tier: 1, next: 'mess', cap: 2, slot: true, a: 10, wood: 6, mat: 2 }),   // V2.12: a Cook on shift makes meals 50% more filling
    mess:     D({ name: 'Mess Hall', like: 'canteen', role: 'food', fam: 'kitchen', tier: 3, w: 2, cap: 4, slot: true, a: 14, q: 13, stone: 14, wood: 8, mat: 4, up: true, icon: 'canteen' }),
    medic:    D({ name: 'Medical Tent', role: 'medical', fam: 'medical', tier: 1, next: 'clinic', sprite: 'grid', slot: true, cap: 2, a: 10, wood: 3, mat: 3, cloth: 2 }),
    clinic:   D({ name: 'Clinic',       role: 'medical', fam: 'medical', tier: 2, next: 'hospital', w: 2, slot: true, cap: 3, a: 13, q: 13, wood: 12, mat: 4, cloth: 3, meds: 2, up: true }),
    hospital: D({ name: 'Hospital',     role: 'medical', fam: 'medical', tier: 3, w: 2, sprite: 'grid', slot: true, cap: 4, a: 16, q: 16, stone: 16, wood: 10, mat: 8, meds: 6, fuel: 2, up: true, power: 1, powerOpt: true }),   // 3D.77: surgery with power
    crates:   D({ name: 'Supply Crates', like: 'storage', role: 'storage', fam: 'storage', tier: 1, next: 'storage', a: 3, q: 8, wood: 4, icon: 'storage' }),
    storage:  D({ name: 'Storehouse',    role: 'storage', fam: 'storage', tier: 2, next: 'warehouse', a: 4, q: 8, wood: 12, mat: 4, up: true }),
    warehouse: D({ name: 'Warehouse',    like: 'storage', role: 'storage', fam: 'storage', tier: 3, a: 5, q: 9, stone: 16, wood: 8, mat: 6, up: true, icon: 'storage' }),
    bench:    D({ name: 'Workbench', like: 'workshop', role: 'engineering', fam: 'research', tier: 1, next: 'workshop', slot: true, out: 7, wood: 4, mat: 4, icon: 'workshop' }),
    workshop: D({ name: 'Workshop',  role: 'engineering', fam: 'research', tier: 2, w: 2, slot: true, out: 12, q: 12, wood: 12, mat: 8, up: true }),   // V2.16: staffed → research points; crafting
    scrapyard: D({ name: 'Scrapyard',   role: 'parts', fam: 'scrap', tier: 1, slot: true, out: 3, a: 4, q: 8, wood: 6, mat: 4 }),   // V2.15: staffed salvage → scrap
    lumber:   D({ name: 'Lumber Camp', role: 'parts', fam: 'lumber', tier: 2, w: 2, slot: true, out: 8, a: 4, q: 8, wood: 10, mat: 4, icon: 'scrapyard' }),   // V3D.23: staffed → wood
    quarry:   D({ name: 'Quarry',      role: 'parts', fam: 'quarry', tier: 2, w: 2, slot: true, out: 5, a: 3, q: 8, wood: 12, mat: 6, icon: 'scrapyard' }),   // V3D.23: staffed → stone
    bonfire:  D({ name: 'Campfire',  role: 'light', tier: 1, a: 9, wood: 2 }),   // V3D.13: lights the camp at night (big radius)
    armory:   D({ name: 'Armory',    role: 'gear', tier: 2, w: 2, a: 12, wood: 10, mat: 6 }),
    barracks: D({ name: 'Barracks',  role: 'security', tier: 3, w: 2, h: 2, q: 12, stone: 18, wood: 12, mat: 8, cloth: 3 }),
    generator: D({ name: 'Generator',   role: 'power', fam: 'power', tier: 3, slot: true, a: 4, q: 10, stone: 10, mat: 10, fuel: 4 }),   // 3D.77: a Mechanic on shift saves fuel   // V3D.26: burns fuel; lights the camp and boosts nearby buildings
    radio:    D({ name: 'Radio Tower', role: 'radio', tier: 3, a: 6, q: 12, stone: 20, mat: 16, wood: 10, fuel: 6, power: 1 }),   // V3D.26: needs power; sends the rescue signal (the ending)
    // 3D.77 power for growth (each draws power units from the Generators) and the ammo / fuel chain (run by Mechanics)
    pump:      D({ name: 'Electric Pump', role: 'water', fam: 'pump', tier: 3, slot: true, out: 16, a: 4, q: 10, stone: 6, mat: 10, fuel: 1, power: 1 }),
    greenhouse: D({ name: 'Greenhouse',   role: 'food', fam: 'greenhouse', tier: 3, w: 2, slot: true, out: 12, waterUse: 3, a: 8, q: 12, stone: 6, wood: 10, mat: 8, cloth: 2, power: 1, powerOpt: true }),
    coldstore: D({ name: 'Cold Store',    role: 'storage', fam: 'coldstore', tier: 3, a: 3, q: 9, stone: 10, mat: 10, power: 1 }),
    fuelstill: D({ name: 'Fuel Still',    role: 'fuel', fam: 'fuel', tier: 2, slot: true, out: 3, a: 4, q: 9, wood: 10, mat: 6 }),
    ammobench: D({ name: 'Ammo Bench',    role: 'ammo', fam: 'ammo', tier: 2, slot: true, out: 16, a: 4, q: 9, wood: 8, mat: 8 }),
    ammofactory: D({ name: 'Ammo Factory', role: 'ammo', fam: 'ammo2', tier: 3, w: 2, slot: true, out: 64, a: 6, q: 12, stone: 12, mat: 16, fuel: 2, power: 2 }),
    // V2.14 training buildings: each raises one survivor stat when visited
    gym:      D({ name: 'Gym',             role: 'train', tier: 1, cap: 2, train: 'str', a: 9, wood: 6, mat: 2 }),
    library:  D({ name: 'Library',         role: 'train', tier: 2, cap: 2, train: 'int', a: 9, wood: 9, mat: 3 }),
    lounge:   D({ name: 'Lounge',          role: 'train', tier: 2, cap: 3, train: 'cha', a: 10, wood: 8, mat: 2 }),
    range:    D({ name: 'Archery Range',   role: 'train', tier: 2, w: 2, cap: 2, train: 'per', a: 8, wood: 9, mat: 3, cloth: 2 }),
    track:    D({ name: 'Obstacle Course', role: 'train', tier: 2, w: 2, cap: 2, train: 'agi', a: 8, wood: 8, mat: 3 }),
    sparring: D({ name: 'Sparring Ring',   role: 'train', tier: 2, w: 2, cap: 2, train: 'end', a: 8, wood: 8, mat: 3 }),
    // older types the code still knows; not built any more (Housing replaced them)
    house:    D({ name: 'House',   role: 'home', tier: 2, a: 8, wood: 5, mat: 2, hidden: true }),
    inn:      D({ name: 'Shelter', role: 'inn', tier: 2, w: 2, cap: 4, a: 10, wood: 8, mat: 4, hidden: true }),
  };
  /* V3D.26 rebalance: scrap was the choke point, so Camp and Timber buildings lean on wood (scrap -40%); the Stone tier keeps its scrap */
  for (const d of Object.values(DEFS)) if ((d.tier || 1) < 3 && d.mat > 1) d.mat = Math.max(1, Math.round(d.mat * .6));
  for (const [k, d] of Object.entries(DEFS)) { d.key = k; d.cost = 0; }
  const famOf = (t) => (DEFS[t] && DEFS[t].fam) || t;
  // matching professions per family (one staff slot each): matching gives the boost, anyone else adds nothing
  const STAFF_JOBS = { water: ['Farmer'], farm: ['Farmer'], medical: ['Medic'], kitchen: ['Cook'], scrap: ['Scavenger'], research: ['Engineer'], lumber: ['Scavenger'], quarry: ['Engineer'], power: ['Mechanic'], fuel: ['Mechanic'], ammo: ['Mechanic'], ammo2: ['Mechanic'], pump: ['Mechanic'], greenhouse: ['Farmer'] };   /* 3D.77: the Mechanic runs power, fuel and ammo */   /* 3D.67 profession balance: one profession per kind of building (Farmer: food and water; Scavenger: scrap and wood; Engineer: research and stone) */
  const ROAD_COST = 1;  // scrap per road tile
  // V2.7 walls: single-tile segments on the grid with hit points; the gate is the one wall tile survivors can walk through (zombies must break it).
  const WALL_DEFS = {
    wood:  { name: 'Wood Barricade', mat: 0, wood: 1, hp: 80,  rank: 1, tier: 1 },
    metal: { name: 'Stone Wall',     mat: 0, wood: 1, stone: 4, hp: 240, rank: 1, tier: 3 },   // V3D.23: the old Metal Wall, now stone (key kept)
    gate:  { name: 'Gate',           mat: 2, wood: 3, hp: 140, rank: 1, tier: 1 },
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
  function createWorld() { return { roads: new Set(), buildings: [], walls: new Map(), ver: 0 }; }   /* 3D.39 owner: a new game starts with just the camp, no roads (ROAD_COORDS kept for reference) */
  const bump = (w) => { w.ver++; };
  const isRoad = (w, x, y) => w.roads.has(key(x, y));
  const inMap = (x, y) => x >= 0 && y >= 0 && x < COLS && y < ROWS;
  const inTown = (x, y) => x >= BUILD.x0 && x <= BUILD.x1 && y >= BUILD.y0 && y <= BUILD.y1;
  function buildingAt(w, x, y) { for (const b of w.buildings) if (x >= b.x && x < b.x + b.w && y >= b.y && y < b.y + b.h) return b; for (const b of w.sites || []) if (x >= b.x && x < b.x + b.w && y >= b.y && y < b.y + b.h) return b; return null; }   // V3D.12: construction sites block too
  const inWallZone = (x, y) => x >= WALLZONE.x0 && x <= WALLZONE.x1 && y >= WALLZONE.y0 && y <= WALLZONE.y1;
  const wallAt = (w, x, y) => (w.walls && w.walls.get(key(x, y))) || null;
  // z = true for zombies: every wall (the gate too) is solid. Survivors can pass the gate.
  const walkable = (w, x, y, z = false) => { if (!inMap(x, y) || buildingAt(w, x, y)) return false; const wl = wallAt(w, x, y); return !wl || wl.broken || (!z && wl.type === 'gate'); };   // V2.18: a broken segment is rubble anyone can cross until it is repaired

  // door: world point just INSIDE the entrance (front-left wall), so the door tile is part of the footprint.
  // approach: the tile just outside that wall, which survivors walk to before stepping in.
  // V2.47 rotation: rot = 1 mirrors a building on screen, which swaps its world x/y. The footprint is transposed (w and h swap) and the
  // entrance moves from the front-left wall (y + h side) to the front-right wall (x + w side).
  // V3D.15: four entrance directions. rot 0 = door on the +y side (front-left), 1 = +x (front-right), 2 = -y (back-right), 3 = -x (back-left).
  // Odd rot transposes the footprint (w and h swap). w, h here are the footprint as placed.
  const doorD = (d, w, h, rot) => { const r = (rot | 0) & 3; if (r === 1) return d ? [d[1], d[0]] : [w - .35, h / 2]; if (r === 2) return d ? [w - d[0], h - d[1]] : [w / 2, .35]; if (r === 3) return d ? [w - d[1], h - d[0]] : [.35, h / 2]; return d || [w / 2, h - .35]; };
  const doorOf = (type, w, h, rot) => doorD(DEFS[type] && DEFS[type].door, w, h, rot);
  const apTile = (x, y, w, h, r, d) => (r === 1 ? { x: x + w, y: Math.floor(y + d[1]) } : r === 2 ? { x: Math.floor(x + d[0]), y: y - 1 } : r === 3 ? { x: x - 1, y: Math.floor(y + d[1]) } : { x: Math.floor(x + d[0]), y: y + h });
  function doorPoint(b) { const d = doorOf(b.type, b.w, b.h, b.rot); return { x: b.x + d[0], y: b.y + d[1] }; }
  function doorTile(b) { const p = doorPoint(b); return { x: Math.floor(p.x), y: Math.floor(p.y) }; }
  function approachTile(b) { const r = (b.rot | 0) & 3; return apTile(b.x, b.y, b.w, b.h, r, doorOf(b.type, b.w, b.h, r)); }
  function approachPoint(b) { const r = (b.rot | 0) & 3, d = doorOf(b.type, b.w, b.h, r); return r === 1 ? { x: b.x + b.w + .35, y: b.y + d[1] } : r === 2 ? { x: b.x + d[0], y: b.y - .35 } : r === 3 ? { x: b.x - .35, y: b.y + d[1] } : { x: b.x + d[0], y: b.y + b.h + .35 }; }
  const rotDef = (def, rot) => { const r = (rot | 0) & 3; return r ? Object.assign({}, def, { w: r & 1 ? def.h : def.w, h: r & 1 ? def.w : def.h, rot: r, door0: def.door }) : def; };   // def as placed (transposed for odd rot)
  const defApproach = (x, y, def) => { const r = (def.rot | 0) & 3; return apTile(x, y, def.w, def.h, r, doorD(r ? def.door0 : def.door, def.w, def.h, r)); };

  function footprintCheck(w, x, y, def, ignore = null) {
    if (x < BUILD.x0 || y < BUILD.y0 || x + def.w - 1 > BUILD.x1 || y + def.h - 1 > BUILD.y1) return { ok: false, why: 'Outside the build zone' };
    for (let yy = 0; yy < def.h; yy++) for (let xx = 0; xx < def.w; xx++) if (isRoad(w, x + xx, y + yy)) return { ok: false, why: 'Blocked by road' };
    const cand = { x, y, w: def.w, h: def.h };
    if (w.buildings.some(b => b !== ignore && Iso.rectsOverlap(b, cand))) return { ok: false, why: 'Tile occupied' };
    if ((w.sites || []).some(b => Iso.rectsOverlap(b, cand))) return { ok: false, why: 'Under construction' };
    const dt = defApproach(x, y, def);   // the approach tile in front of the door must stay free
    if (!inMap(dt.x, dt.y) || (buildingAt(w, dt.x, dt.y) && buildingAt(w, dt.x, dt.y) !== ignore)) return { ok: false, why: 'Entrance is blocked' };
    // V2.34: nor may it sit on ANOTHER building's entrance tile (people then walked through that building)
    for (const b of w.buildings) { if (b === ignore) continue; const at = approachTile(b); if (at.x >= x && at.x < x + def.w && at.y >= y && at.y < y + def.h) return { ok: false, why: `Blocks the ${(DEFS[b.type] && DEFS[b.type].name) || b.type} entrance` }; }
    return { ok: true, why: '' };
  }
  function entranceReachable(w, x, y, def) {
    const dt = defApproach(x, y, def);
    const tmp = { type: '_probe', x, y, w: def.w, h: def.h };
    w.buildings.push(tmp);
    let ok = !!findPath(w, { x: 7, y: 10 }, dt);
    // V2.34: every other entrance must stay reachable too (a new building must not wall another one in)
    if (ok) for (const b of w.buildings) { if (b === tmp) continue; const at = approachTile(b); if (inMap(at.x, at.y) && !buildingAt(w, at.x, at.y) && !findPath(w, { x: 7, y: 10 }, at)) { ok = false; break; } }
    w.buildings.pop();
    return ok;
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
  // wallCost (zombies only): unbroken wall tiles count as passable at that extra cost, so a sealed town still yields a
  // route whose first wall tile is the one to break; any real opening is always preferred when it exists.
  function findPath(w, from, to, z = false, wallCost = 0) {
    const tb = buildingAt(w, to.x, to.y), gt = tb && !z ? approachTile(tb) : to;   // a goal inside a building = its approach tile
    const fb = buildingAt(w, from.x, from.y), ft = fb && !z ? approachTile(fb) : from;   // leaving a building = start from its approach tile
    const g = nearestWalkable(w, gt.x, gt.y, z), s = nearestWalkable(w, ft.x, ft.y, z); if (!g || !s) return null;
    if (s.x === g.x && s.y === g.y) return [];
    const best = new Map([[key(s.x, s.y), 0]]), prev = new Map(), heap = new Heap();
    heap.push({ x: s.x, y: s.y, g: 0, f: Math.abs(s.x - g.x) + Math.abs(s.y - g.y) });
    let guard = 0;
    while (heap.size && guard++ < 9000) {
      const c = heap.pop(); if (c.g > (best.get(key(c.x, c.y)) ?? 1e9)) continue;
      if (c.x === g.x && c.y === g.y) { const out = []; let k = key(c.x, c.y); while (prev.has(k)) { const [px, py] = k.split(',').map(Number); out.push({ x: px, y: py }); k = prev.get(k); } return out.reverse(); }
      for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
        const nx = c.x + dx, ny = c.y + dy; let extra = 0;
        if (!walkable(w, nx, ny, z)) { const wl = wallCost && inMap(nx, ny) && !buildingAt(w, nx, ny) ? wallAt(w, nx, ny) : null; if (!wl) continue; extra = wallCost; }
        const ng = c.g + stepCost(w, nx, ny) + extra, k = key(nx, ny);
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
  return { famOf, TERRITORY, setTerritory, WALL_DEFS, WALLZONE, inWallZone, wallAt, perimeter, COLS, ROWS, BUILD, DEFS, STAFF_JOBS, ROAD_COST, ROAD_COORDS, key, createWorld, bump, isRoad, inMap, inTown, buildingAt, walkable, doorPoint, doorTile, approachTile, approachPoint, rotDef, footprintCheck, placementCheck, entranceReachable, findPath, nearestWalkable };
});
