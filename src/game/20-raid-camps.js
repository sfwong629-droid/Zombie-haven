/* ---- 3D.116 owner: a raid is a camp map like the town. Their buildings, their guards and workers. Send the squad at a building,
   bring it down, then decide whether to stop and loot it (a water building gives water, and so on). The good stuff (gear, guns,
   ammo, the leader) sits in the middle, the hardest part to reach. Survivors fight on their own; you tell them where to go. ---- */
const CAMP_W = 28, CAMP_H = 28, CAMP_GATE = [13, 14];
/* 3D.130 balance run (tools/balance/sh_probe.js): before these settings a squad at the recommended power killed every guard and stripped a whole camp
   (about 145 resources and 3 pieces of gear) in two and a half minutes with at most one person down.
   tough = guard and leader health and damage; reinFirst / reinEvery = seconds from the alarm to the first patrol and between patrols; reinN0 = size of the
   first patrol (each one after is one bigger); reinMax = how many patrols; hear = how far (tiles) a guard hears a building being smashed (workers half, night 60%). */
/* 3D.140 owner: "make it more tidy ... add more building, less scattered barrel, box ... make it look like a community".
   Every camp is now laid out like a small town: a boulevard from the gate to the hall, a square across the middle, a road round the inside
   of the fence, and buildings in straight rows facing the same way with a lane between rows (valuables in the rows nearest the hall,
   homes in the outer rows). Lots that are left over hold the faction's own things, set down in order (CAMP_KIT), not scattered.
   Props stand on a tile: they block the way and give cover. */
const CAMP_KIT = {
  toll: { homes: ['cabin', 'cabin', 'cabin', 'cabin', 'tent', 'tent', 'tent', 'tent'], kit: ['tyres', 'spikes', 'sign', 'drums', 'stack'], street: 'lamp' },
  foundry: { homes: ['cabin', 'cabin', 'cabin', 'cabin', 'cabin', 'cabin', 'cabin', 'cabin'], kit: ['chimney', 'furnace', 'anvil', 'beams', 'coal', 'slag', 'cart', 'drums'], street: 'lamp' },
  quar: { homes: ['tent', 'tent', 'tent', 'tent', 'tent', 'tent', 'tent', 'tent'], kit: ['sandbags', 'ocrate', 'mast', 'wire', 'flagpole', 'drums'], street: 'mast' },
  helix: { homes: ['tent', 'tent', 'tent', 'tent', 'tent', 'tent', 'cabin', 'cabin'], kit: ['container', 'hazard', 'cage', 'dish', 'container'], street: 'lamp' },
  hollow: { homes: ['tent', 'tent', 'tent', 'tent', 'tent', 'tent', 'tent', 'tent'], kit: ['candles', 'ragpole', 'stakes', 'bones'], street: 'ragpole', tower: 'ragpole' },
  green: { homes: ['cabin', 'cabin', 'cabin', 'cabin', 'cabin', 'cabin', 'house', 'house'], kit: ['beds', 'hay', 'fruit', 'scarecrow', 'line', 'beds'], street: 'fruit' },
};
const CAMP_PLAN = {
  toll: { dirt: ['#9a8566', '#93805f', '#9e896a', '#8d7a5c'], path: '#b59c74', flag: '#b83a2e', inner: ['hq3', 'armory', 'ammobench'], mid: ['warehouse', 'storage', 'workshop', 'medic', 'kennel', 'generator', 'crates'], outer: ['barrel', 'barrel', 'well', 'farm', 'farm', 'tent', 'tent', 'tent', 'scrapyard', 'bonfire', 'bonfire'],
    guards: [['raider', 5], ['raiderG', 3]], workers: 5, tough: .95, reinFirst: 70, reinEvery: 30, reinN0: 3, reinMax: 8, hear: 5, ground: '#8a7d68', yard: '#9a8a70', fence: '#6b4a2e' },
  foundry: { dirt: ['#8b857b', '#837d73', '#8f897e', '#7d776d'], path: '#a39a8a', flag: '#c9772e',
    inner: ['hq3', 'workshop', 'armory'], mid: ['warehouse', 'generator', 'ammobench', 'scrapyard', 'storage', 'quarry', 'crates'], outer: ['scrapyard', 'lumber', 'barrel', 'well', 'cabin', 'cabin', 'cabin', 'generator', 'bonfire', 'crates', 'tent'],
    guards: [['raiderG', 4], ['raider', 5]], workers: 6, tough: 1.4, reinFirst: 35, reinEvery: 28, reinN0: 3, reinMax: 9, hear: 6, ground: '#77736d', yard: '#857f76', fence: '#4f4a46' },
  quar: { dirt: ['#8c8e74', '#85876d', '#909278', '#7f8168'], path: '#a8a88c', flag: '#4d6b45', inner: ['hq3', 'armory', 'ammofactory'], mid: ['barracks', 'clinic', 'generator', 'storage', 'warehouse', 'radio', 'crates'], outer: ['tent', 'tent', 'tent', 'tent', 'floodlight', 'floodlight', 'barrel', 'well', 'bonfire', 'crates', 'kennel'],
    guards: [['raiderG', 5], ['raider', 3]], workers: 4, tough: 1.1, reinFirst: 30, reinEvery: 28, reinN0: 3, reinMax: 9, hear: 6, ground: '#7d8068', yard: '#888a72', fence: '#55583f' },
  helix: { dirt: ['#a9afb1', '#a2a8aa', '#aeb4b6', '#9ba1a3'], path: '#c6cbcc', flag: '#3f8fb5', inner: ['hq3', 'hospital', 'workshop'], mid: ['generator', 'generator', 'coldstore', 'clinic', 'storage', 'pump', 'kennel'], outer: ['tent', 'tent', 'tent', 'floodlight', 'floodlight', 'solar', 'solar', 'barrel', 'crates', 'kennel', 'medic'],
    guards: [['raiderG', 5], ['raider', 4]], workers: 5, tough: 1.2, reinFirst: 30, reinEvery: 26, reinN0: 3, reinMax: 10, hear: 6, ground: '#9aa0a2', yard: '#aeb4b6', fence: '#7d8588' },
  hollow: { dirt: ['#6f6672', '#69606c', '#746b77', '#635b66'], path: '#877e8a', flag: '#7a5aa8', inner: ['hq2', 'canteen', 'storage'], mid: ['medic', 'crates', 'crates', 'bonfire', 'bonfire', 'bonfire', 'kennel'], outer: ['tent', 'tent', 'tent', 'tent', 'tent', 'tent', 'farm', 'barrel', 'bonfire', 'bonfire', 'kennel'],
    guards: [['raider', 9], ['raiderB', 2]], workers: 8, tough: 1, reinFirst: 50, reinEvery: 24, reinN0: 4, reinMax: 12, hear: 4, ground: '#6d6470', yard: '#776d79', fence: '#463f49' },
  green: { dirt: ['#93a45a', '#8c9d54', '#98a95f', '#869750'], path: '#b89a66', flag: '#5f9a3c', inner: ['hq2', 'armory', 'clinic'], mid: ['storage', 'greenhouse', 'canteen', 'well', 'crates', 'medic'], outer: ['field', 'field', 'field', 'farm', 'farm', 'barrel', 'barrel', 'water', 'cabin', 'cabin', 'cabin', 'bonfire'],
    guards: [['raiderB', 3], ['raider', 3]], workers: 7, tough: 1.1, reinFirst: 55, reinEvery: 30, reinN0: 2, reinMax: 6, hear: 5, ground: '#7f8f5e', yard: '#93a06a', fence: '#8a6038' },
};
const rint = (a, b) => a + Math.floor(rnd() * (b - a + 1));
function campLoot(type, H) {   /* what each building holds */
  const role = (DEFS[type] || {}).role, pool = FAC_TIER[H.raid] ? facPool(H.raid) : ['bow', 'crossbow', 'raincoat', 'hoodie', 'machete', 'leather'], pick = () => pool.filter((k) => ITEMS[k])[Math.floor(rnd() * pool.filter((k) => ITEMS[k]).length)];
  if (type === 'kennel') return { icon: '🔓', name: 'Cages', loot: {}, items: [], pris: rint(1, 3) };
  if (role === 'hq') return { icon: '👑', loot: { mat: rint(6, 10), meds: 1, fuel: 1 }, items: [pick()] };
  if (role === 'gear') return { icon: '🛡', loot: { ammo: rint(6, 10) }, items: [pick(), pick()] };
  if (role === 'ammo') return { icon: '🎯', loot: { ammo: rint(12, 18) }, items: [] };
  if (role === 'water') return { icon: '💧', loot: { water: rint(6, 10) }, items: [] };
  if (role === 'food') return { icon: '🌾', loot: { food: rint(6, 10) }, items: [] };
  if (role === 'storage') return { icon: '📦', loot: { wood: rint(4, 6), stone: rint(3, 5), mat: rint(3, 5) }, items: [] };
  if (role === 'medical') return { icon: '✚', loot: { meds: rint(2, 3), cloth: 2 }, items: [] };
  if (role === 'engineering' || role === 'parts') return { icon: '⚙', loot: { mat: rint(5, 8), fuel: rnd() < .5 ? 1 : 0 }, items: [] };
  if (role === 'power') return { icon: '⛽', loot: { fuel: rint(2, 3) }, items: [] };
  if (role === 'inn') return { icon: '🛏', loot: { cloth: 2, food: 2 }, items: [] };
  return { icon: '', loot: {}, items: [] }; }
/* 3D.279 Strongholds chat (owner, 22 Nov: "when you raid a town at level 5 it will be small but when you raid a town at level 15, the town will be much bigger").
   A camp's size comes from the town's level: 16 tiles across inside the fence at level 5, about 25 at level 15 and 30 at level 20, with more rows of
   buildings, more guards, more workers and more patrols. Each faction has its own shape and one house rule (15-STRONGHOLDS.md, 5.4):
   the Toll Kings a long highway camp with a second gate where their bikes come in (break the gate winch to jam it);
   Checkpoint Bravo lookouts on the towers whose sight sweeps the ground (break the floodlight generator to blind them);
   Helix cages of the dead (break one and they go for whoever is nearest, guards included); the Hollow's supermarket aisles,
   with the dead walking among them (and a chapel bell that calls more when the alarm goes up: break it first);
   the Foundry's furnace heat and front-armoured guards (break the steam valve to cool it: loud);
   Greenwater an open village with gaps in the hedge, who give up if you reach their meeting house once the alarm is up. */
function campSize(raid, lv) { const n = Math.max(16, Math.min(30, Math.round(12.5 + .85 * (lv || 5))));
  const sh = { toll: [1.45, .65], quar: [1.12, .85], helix: [1, 1], hollow: [1.05, .95], foundry: [1, 1], green: [1.2, 1] }[raid] || [1, 1];
  return { iw: Math.max(16, Math.round(n * sh[0])), ih: Math.max(12, Math.round(n * sh[1])), n }; }
function campGeom(raid, lv) { const { iw, ih, n } = campSize(raid, lv), x0 = 5, y0 = 7, x1 = x0 + iw + 1, y1 = y0 + ih + 1, gx = Math.floor(x0 + (iw + 1) / 2 - .5), sq = Math.floor(y0 + (ih + 1) / 2 - .5);
  return { W: x1 + 6, H: y1 + 4, x0, y0, x1, y1, gx, sq, n, iw, ih, gate: [gx, gx + 1], east: raid === 'toll' ? [x1, sq] : null }; }
const CAMP_KEYS = { toll: { warehouse: ['salt', 'ledger'] }, quar: { hq3: ['proof1', 'order9'] }, helix: { hospital: ['glass', 'memo7'] }, hollow: { hq2: ['shepherd_tin'] }, foundry: { workshop: ['vat', 'shift5'] }, green: { storage: ['old_brine'] } };
const CAMP_SPECIAL = { toll: { type: 'generator', name: 'The gate winch', icon: '⛓', fx: 'winch' }, quar: { type: 'generator', name: 'The floodlight generator', icon: '💡', fx: 'lights' }, hollow: { type: 'radio', name: 'The chapel bell', icon: '🔔', fx: 'bell' }, foundry: { type: 'pump', name: 'The steam valve', icon: '♨', fx: 'steam' } };
function campBuild() {   /* lay out the camp: a fenced compound, the gate south, rows of buildings with the valuables in the middle */
  const H = S.sh, P = CAMP_PLAN[H.raid] || CAMP_PLAN.toll, lv = H.lvl || S.lvl || 5, G = H.cg = campGeom(H.raid, lv), W = G.W, Ht = G.H, g = [], gs = 1 + Math.max(0, lv - 5) * .06;
  for (let y = 0; y < Ht; y++) { g.push(new Array(W).fill('o')); } const FX0 = G.x0, FX1 = G.x1, FY0 = G.y0, F1 = G.y1;
  H.box = [FX0, FY0, FX1, F1];
  for (let y = FY0; y <= F1; y++) for (let x = FX0; x <= FX1; x++) g[y][x] = x === FX0 || x === FX1 || y === FY0 || y === F1 ? 'W' : 'y';
  for (const x of G.gate) g[F1][x] = 'G'; if (G.east) { g[G.east[1]][FX1] = 'G'; g[G.east[1] + 1][FX1] = 'G'; for (let x = FX1 + 1; x < W; x++) for (const y of [G.east[1], G.east[1] + 1]) g[y][x] = 'o'; }
  H.grid = g; H.gw = W; H.gh = Ht; H.blds = []; H.exit = shWorld(G.gx + .5, F1 + 2.6);
  /* 3D.121 owner: the fence has health like the town's walls; break a section to make a way in (loud: guards close by hear it) */
  const fType = H.raid === 'green' || H.raid === 'hollow' ? 'wood' : 'palisade', fHp = (Wd.WALL_DEFS[fType] || { hp: 80 }).hp; H.fence = {};
  for (let y = FY0; y <= F1; y++) for (let x = FX0; x <= FX1; x++) if (g[y][x] === 'W') { if (H.raid === 'green' && (x + y) % 4 === 0 && y !== F1 && x !== FX0 && x !== FX1 && y !== FY0) { g[y][x] = 'y'; continue; }   /* Greenwater: hedges with gaps, no wall */
    if (H.raid === 'green' && (x + y * 3) % 5 === 0 && !(y === F1 && G.gate.includes(x))) { g[y][x] = 'y'; continue; }
    H.fence[x + ',' + y] = { bld: true, fence: true, type: fType, name: H.raid === 'green' ? 'hedge' : 'fence', x, y, bw: 1, bh: 1, hp: fHp, max: fHp, dead: false, looted: true, loot: {}, items: [], w: shWorld(x, y) }; }
  const c = G.gx + .5, ring = (x, y, w, h) => Math.max(Math.abs(x + w / 2 - c), Math.abs(y + h / 2 - (G.sq + .5))) * 1.25 * 16 / Math.max(16, G.n), K = CAMP_KIT[H.raid] || CAMP_KIT.toll; H.props = [];
  const putB = (type, x, y, ex) => { const d = DEFS[type], w = d.w, h = d.h, i = H.blds.length, L = campLoot(type, H), rr = ring(x, y, w, h), inner = rr <= 4.5, hp = Math.round((w * h >= 4 ? 240 : w * h >= 2 ? 150 : 90) * (inner ? 1.4 : 1) * (type === 'bonfire' ? .4 : 1));
    const keys = ((CAMP_KEYS[H.raid] || {})[type] && !H.blds.some((q) => q.keys && q.type === type)) ? CAMP_KEYS[H.raid][type].slice() : null;
    H.blds.push({ i, bld: true, type, name: L.name || d.name, x, y, bw: w, bh: h, rot: 0, hp, max: hp, icon: L.icon, loot: L.loot, items: L.items.filter(Boolean), pris: L.pris || 0, dead: false, looted: false, inner, w: shWorld(x + w / 2 - .5, y + h / 2 - .5), ...(keys ? { keys, name: { warehouse: 'The Larder', hq3: 'The command tent', hospital: 'The lab', hq2: "The Shepherd's hall", workshop: 'The works office', storage: 'The granary' }[type] || d.name } : {}), ...(ex || {}) });
    for (let yy = y; yy < y + h; yy++) for (let xx = x; xx < x + w; xx++) g[yy][xx] = 'K' + i; return H.blds[i]; };
  const putP = (k, x, y, r) => { if (!g[y] || g[y][x] !== 'y') return; g[y][x] = 'P'; H.props.push({ k, x, y, r: r || 0, v: rnd() }); };
  /* rows of lots, nearest the hall first: above the square every two tiles, below it from three tiles; the west rows fill from the boulevard outward, the east rows the same */
  const rys = []; for (let k = 0; k < 12; k++) { const up = G.sq - 2 - 2 * k, dn = G.sq + 3 + 2 * k; if (dn <= F1 - 2) rys.push(dn); if (up >= FY0 + 2) rys.push(up); } rys.sort((a, q) => Math.abs(a - G.sq) - Math.abs(q - G.sq));
  const rows = []; for (const y of rys) for (const side of ['W', 'E']) rows.push({ y, side, cur: side === 'W' ? G.gx - 2 : G.gx + 3, last: null });
  /* a row is 5 tiles; buildings of the same kind stand shoulder to shoulder (a terrace), different kinds leave one tile between */
  const lot = (row, w, t) => { const gap = row.last === null || (t && row.last === t) ? 0 : 1; if (row.side === 'W') { const x0 = row.cur - gap - w + 1; if (x0 < FX0 + 2) return -1; row.cur = x0 - 1; row.last = t; return x0; } const x0 = row.cur + gap; if (x0 + w - 1 > FX1 - 2) return -1; row.cur = x0 + w; row.last = t; return x0; };
  const more = Math.max(0, Math.round((G.iw * G.ih) / 256 - 1) * 2);   /* a bigger camp: more of their work buildings and homes */
  const extra = []; for (let k = 0; k < more; k++) extra.push(P.mid[k % P.mid.length], P.outer[k % P.outer.length], K.homes[k % K.homes.length], K.homes[(k + 3) % K.homes.length]);
  const all = [...P.inner, ...P.mid, ...P.outer.slice().sort(), '*kit', ...K.homes, ...extra].filter((t) => t === '*kit' || DEFS[t]); let back = false, kn = 0;
  const kitNext = () => K.kit[Math.floor(kn / 2) % K.kit.length];
  for (const t of all) { if (t === '*kit') { for (let i = 0; i < 8; i++) { const k = kitNext(); for (const row of rows) { const x = lot(row, 1, k); if (x >= 0) { putP(k, x, row.y, 0); kn++; break; } } } continue; }   /* the faction's own things sit among the work buildings, before the homes fill the outer rows */
    const d = DEFS[t];
    if (d.role === 'hq' && !H.blds.some((b) => DEFS[b.type].role === 'hq')) { putB(t, G.gx, G.sq); continue; }
    if (d.h > 1) { if (!back) { back = true; putB(t, G.gx, FY0 + 3); } continue; }
    for (const row of rows) { const x = lot(row, d.w, t); if (x >= 0) { if (g[row.y].slice(x, x + d.w).every((v) => v === 'y')) putB(t, x, row.y); break; } } }
  /* 3D.339 (Strongholds chat, owner 23 Nov: "next: the six raid camps", dressed like the strongholds, at real sizes from references):
     each camp gets the set pieces of the real place it is (a toll plaza, an army checkpoint, a field lab, a supermarket and its car park,
     an iron works, a farm). H.deco are stronghold set pieces (drawn by the strongholds' own kit), H.gnd hard ground by tile.
     A piece that fills tiles makes them solid ('P'); it is only put down if every building can still be reached. */
  H.deco = []; H.gnd = [];
  const BVs = (x) => x >= G.gx - 1 && x <= G.gx + 2, strt = (x, y) => BVs(x) || y === G.sq || y === G.sq + 1 || x <= FX0 + 1 || x >= FX1 - 1 || y <= FY0 + 1 || y >= F1 - 1;
  const fits = (x, y, tw, th, out) => { for (let yy = y; yy < y + th; yy++) for (let xx = x; xx < x + tw; xx++) { const v = g[yy] && g[yy][xx]; if (out) { if (v !== 'o' || (BVs(xx) && yy > F1) || (G.east && xx > FX1 && (yy === G.east[1] || yy === G.east[1] + 1)) || (xx >= FX0 - 1 && xx <= FX1 + 1 && yy >= FY0 - 1 && yy <= F1 + 1)) return false; } else if (v !== 'y' || strt(xx, yy)) return false; } return true; };
  const putD = (k, x, y, tw, th, o, out) => { if (!fits(x, y, tw, th, out)) return null; const cells = []; for (let yy = y; yy < y + th; yy++) for (let xx = x; xx < x + tw; xx++) { cells.push([xx, yy, g[yy][xx]]); g[yy][xx] = 'P'; }
    if (campCheck().length) { for (const [xx, yy, v] of cells) g[yy][xx] = v; return null; } const d = { k, x: x + tw / 2 - .5, y: y + th / 2 - .5, ...(o || {}), cells, out: out ? 1 : 0 }; H.deco.push(d); return d; };
  const nearD = (k, ax, ay, tw, th, o, out, R = 6) => { ax = Math.round(ax); ay = Math.round(ay); for (let r = 0; r <= R; r++) for (let dy = -r; dy <= r; dy++) for (let dx = -r; dx <= r; dx++) { if (Math.max(Math.abs(dx), Math.abs(dy)) !== r) continue; const d = putD(k, ax + dx, ay + dy, tw, th, o, out); if (d) return d; } return null; };
  const flat = (k, x, y, o) => { H.deco.push({ k, x, y, ...(o || {}) }); }, gnd = (x, y, w, h, k) => { H.gnd.push({ x, y, w, h, k }); };
  campDress(H, G, { nearD, putD, flat, gnd, W, Ht });
  if (H.raid === 'hollow') { /* the old supermarket: long aisles of shelves on the rows between the buildings, with a gap every few shelves */ for (let y = FY0 + 2; y <= F1 - 2; y++) { if (rys.includes(y) || y === G.sq || y === G.sq + 1) continue; for (let x = FX0 + 2; x <= FX1 - 2; x++) { if (x >= G.gx - 1 && x <= G.gx + 2) continue; if ((x - FX0) % 6 === 0) continue; if ([g[y - 1][x], g[y + 1][x], g[y - 1][x - 1], g[y + 1][x + 1], g[y - 1][x + 1], g[y + 1][x - 1]].some((v) => v && v[0] === 'K')) continue; putP('shelf', x, y, 0); } } }   /* never against a building: every door stays reachable */
  /* what is left of the rows: the faction's own things, two of a kind side by side */
  if (H.raid !== 'hollow') for (const row of rows) for (let k = kitNext(), x = lot(row, 1, k); x >= 0; k = kitNext(), x = lot(row, 1, k)) { putP(k, x, row.y, 0); kn++; }
  /* the house rule's own building (a winch, a generator, a bell, a valve), near where it matters */
  const SP = CAMP_SPECIAL[H.raid]; if (SP) { const want = SP.fx === 'winch' ? [FX1 - 2, G.sq - 2] : SP.fx === 'steam' ? [G.gx - 4, FY0 + 3] : SP.fx === 'bell' ? [G.gx + 3, FY0 + 2] : [FX0 + 3, F1 - 3]; let put = false;
    for (let r = 0; r < 6 && !put; r++) for (let dy = -r; dy <= r && !put; dy++) for (let dx = -r; dx <= r && !put; dx++) { const x = want[0] + dx, y = want[1] + dy; if (g[y] && g[y][x] === 'y' && !(x >= G.gx - 1 && x <= G.gx + 2)) { const b = putB(SP.type, x, y, { special: SP.fx, icon: SP.icon }); b.name = SP.name; b.loot = SP.fx === 'lights' ? { fuel: 2 } : {}; b.items = []; b.hp = b.max = 120; put = true; } } }
  /* the boulevard stays four tiles wide (a two-wide one was a death trap at the gate): towers and banners stand back from it, lamps mark the corners of the square */
  H.towers = []; for (const [x, y] of [[FX0 + 1, FY0 + 1], [FX1 - 1, FY0 + 1], [FX0 + 1, F1 - 1], [FX1 - 1, F1 - 1], [G.gx - 3, F1 - 1], [G.gx + 4, F1 - 1]]) { putP(K.tower || 'tower', x, y, 0); if (g[y][x] === 'P') H.towers.push({ x, y }); }
  for (const [x, y] of [[G.gx - 1, G.sq + 2], [G.gx + 2, G.sq + 2], [G.gx - 1, G.sq - 1], [G.gx + 2, G.sq - 1]]) putP(K.street, x, y, x < G.gx ? 0 : 2);
  putP('banner', G.gx - 2, F1 - 1, 0); putP('banner', G.gx + 3, F1 - 1, 2);
  while (campCheck().length && H.deco.some((d) => d.cells)) { const i = H.deco.map((d) => !!d.cells).lastIndexOf(true), d = H.deco[i]; for (const [xx, yy, v] of d.cells) g[yy][xx] = v; H.deco.splice(i, 1); }   /* 3D.339 */
  for (const d of H.deco) delete d.cells;
  if (!H.practice) for (const r of ((S.fac || {})[H.raid] || {}).ruins || []) { if (S.day - r.d >= 10) continue; const b = H.blds.find((q) => q.type === r.t && !q.dead); if (b) { b.dead = true; b.looted = true; b.hp = 0; b.wasRuin = true; } }   /* still in ruins from the last raid */
  /* the people: guards on posts and patrols, workers going about their jobs, the leader by the hall */
  const yard = () => { for (let k = 0; k < 200; k++) { const x = rint(FX0 + 1, FX1 - 1), y = rint(FY0 + 1, F1 - 4); if (g[y][x] === 'y') return shWorld(x, y); } return shWorld(G.gx, G.sq + 2); };
  const mk0 = (t, w, ex) => { const zd = zombieTypes.raider || zombieTypes.walker, wpn = t === 'raiderG' ? 'rifle' : t === 'raiderB' ? 'bow' : t === 'worker' ? 'pipe' : ['bat', 'crowbar', 'machete'][H.zs.length % 3], TKc = (CAMP_PLAN[H.raid] || {}).tough || 1, hp = Math.round(zd.hp * (t === 'worker' ? .55 : 1.3 * TKc));
    H.zs.push({ type: 'raider', human: true, wpn, ranged: wpn === 'rifle' || wpn === 'bow', room: 'y', w, hp, max: hp, atk: zd.atk * (t === 'worker' ? .4 : 1.2 * TKc), spd: (zd.chase || .012) * 1.25, mode: 'patrol', stateTicks: 0, target: null, moving: false, phase: rnd() * 100, fk: H.raid, worker: t === 'worker', home: { ...w }, ...ex }); };
  mk0('raider', shWorld(G.gx - .3, F1 - 2.7), { post: true }); mk0(P.guards[1][0], shWorld(G.gx + 1.3, F1 - 2.7), { post: true });
  if (G.east) { mk0('raider', shWorld(FX1 - 2, G.east[1]), { post: true }); }
  const hq = H.blds.find((b) => DEFS[b.type].role === 'hq'), arm = H.blds.find((b) => DEFS[b.type].role === 'gear');
  const hasBoss = !!(SH_DEFS[H.dest].areas[2].boss && hq);
  for (const b of [arm, hq].filter(Boolean)) { mk0(P.guards[0][0], shWorld(b.x + b.bw, b.y + b.bh), { post: true, keep: true }); if (b === hq && hasBoss) H.zs[H.zs.length - 1].esc = true; }
  let n = 0; for (const [t, k] of P.guards) for (let i = 0; i < Math.round(k * gs); i++) if (n++ >= (hasBoss ? 5 : 3)) mk0(t, yard(), {});   /* 3D.145 the bodyguards come out of the camp's own guards: two fewer on patrol, and the hall keeper is one of them */
  for (let i = 0; i < Math.round(P.workers * gs); i++) mk0('worker', yard(), H.night ? { asleep: true } : {});
  const D = SH_DEFS[H.dest], boss = D.areas[2].boss; if (boss && hq) H.zs.push({ type: 'raider', human: true, wpn: boss.wpn || null, ranged: boss.wpn === 'bow' || boss.wpn === 'rifle', leader: true, boss: true, name: boss.name, room: 'y', big: boss.big, w: shWorld(hq.x - 1, hq.y + hq.bh / 2), hp: Math.round(boss.hp * (P.tough || 1)), max: Math.round(boss.hp * (P.tough || 1)), atk: boss.atk * (P.tough || 1), spd: boss.spd, mode: 'patrol', post: true, keep: true, target: null, moving: false, fk: H.raid, home: shWorld(hq.x - 1, hq.y + hq.bh / 2) });
  if (boss && hq) for (const [i, [dx, dy]] of [[-2, 0], [-2, 1], [-2, 2]].entries()) { const x = hq.x + dx, y = hq.y + dy; if (g[y] && g[y][x] === 'y') { mk0(P.guards[i % 2][0], shWorld(x, y), { post: true, keep: true }); { const q = H.zs[H.zs.length - 1]; q.esc = true; q.hp = q.max = Math.round(q.max * .8); } } }   /* 3D.144 the leader's bodyguards */
  /* the house rules' own set-up */
  H.zones = []; H.reinScale = 1;
  if (H.raid === 'toll') { H.reinScale = .8; H.bikes = true; }
  if (H.raid === 'quar') { H.lights = H.towers.slice(0, 4).map((t, i) => ({ x: t.x + .5, y: t.y + .5, a: i * 1.6, sp: .012 + i * .002, on: true })); }
  if (H.raid === 'helix') { const ks = H.blds.filter((b) => b.type === 'kennel'); ks.forEach((b, i) => { if (i === 0 && ks.length > 1 && !(S.fac && S.fac.helix && S.fac.helix.taken)) { b.pris = 0; } if (i > 0 || ks.length === 1) { b.zcage = 2 + Math.floor(lv / 8); b.pris = i === 0 ? b.pris : 0; b.name = 'A cage of the dead'; b.icon = '☣'; } });
    for (let i = ks.length; i < 2; i++) { for (const row of rows) { const x = lot(row, 1, 'kennel'); if (x >= 0 && g[row.y][x] === 'y') { const b = putB('kennel', x, row.y); b.pris = 0; b.zcage = 2 + Math.floor(lv / 8); b.name = 'A cage of the dead'; b.icon = '☣'; break; } } } }
  if (H.raid === 'hollow') { const nz = 3 + Math.floor(lv / 3); for (let i = 0; i < nz; i++) { const w = yard(), zd = zombieTypes.walker; H.zs.push({ type: i % 4 === 3 ? 'runner' : 'walker', human: false, tame: true, room: 'y', w, hp: zd.hp, max: zd.hp, atk: zd.atk, spd: (zd.chase || .012) * 1.1, mode: 'patrol', stateTicks: 0, target: null, moving: false, phase: rnd() * 100, home: { ...w } }); } }
  if (H.raid === 'foundry') { const fur = H.props.filter((p) => p.k === 'furnace' || p.k === 'chimney'); for (const p of fur.slice(0, 6)) H.zones.push({ k: 'heat', x: p.x - 1, y: p.y - 1, w: 3, h: 3, on: true });
    const ws = H.blds.find((b) => b.type === 'workshop'); if (ws) H.zones.push({ k: 'heat', x: ws.x - 1, y: ws.y - 1, w: ws.bw + 2, h: ws.bh + 2, on: true }); }
  for (const z of H.zs) { const c = shCell(z.w); if ((g[c.y] || [])[c.x] !== 'P') continue; let done = false; for (let r = 1; r <= 3 && !done; r++) for (let dy = -r; dy <= r && !done; dy++) for (let dx = -r; dx <= r && !done; dx++) if ((g[c.y + dy] || [])[c.x + dx] === 'y') { z.w = shWorld(c.x + dx, c.y + dy); if (z.home) z.home = { ...z.w }; done = true; } }   /* 3D.339 nobody is posted inside a set piece */
  /* where the squad starts: on the road outside the gate */
  H.units.forEach((s, i) => { s.w = shWorld(G.gx - .6 + (i % 4) * .75, F1 + 2.2 + Math.floor(i / 4) * .8); });
  S.sh.cx = SH_AX + G.gx + 2; S.sh.cy = SH_AY + F1; S.sh.cz = G.n > 20 ? 1.3 : 1.5;
}
/* 3D.339 each camp's set pieces. Sizes: a tile is about 3.5 m, so a road lane is one tile, a car 1.4 x 0.7, a 20-foot container 1.7 x 0.7,
   a toll island half a tile wide, an army tent 1.4 x 2.3, a barn 3 x 2. Anchors are given from the gate, the square and the fence, so the
   same camp is dressed the same way at every level. */
function campDress(H, G, K) { const { nearD, flat, gnd, W, Ht } = K, x0 = G.x0, x1 = G.x1, y0 = G.y0, y1 = G.y1, gx = G.gx, sq = G.sq, r = H.raid, bOf = (t) => H.blds.find((b) => b.type === t), near = (b, dx, dy) => b ? [b.x + (dx || 0), b.y + (dy || 0)] : null;
  const CAR = ['#7a8fa3', '#a34a3a', '#d8d4c6', '#4a6a52', '#3d4a5c', '#c9a23a'];
  gnd(gx - 1, y1 + 1, 4, 44, 'asphalt');   /* the road to the gate */
  if (r === 'toll') {   /* a fort built across the highway: the toll plaza is their east gate */
    gnd(0, sq, W, 2, 'asphalt'); gnd(gx - 1, sq + 2, 4, y1 - sq - 1, 'asphalt'); flat('road', W / 2 - .5, sq + .5, { len: W + 16, w: 2, nokerb: 1 });
    if (G.east) { nearD('tollbooth', x1 + 2, sq - 1, 2, 1, { arm: 1 }, 1, 0); nearD('tollbooth', x1 + 2, sq + 2, 2, 1, { arm: -1 }, 1, 0); flat('tollroof', x1 + 2.5, sq + .5, { lanes: 4 }); flat('gantry', x1 + 4.6, sq + .5, { lanes: 4 }); }
    for (const [i, [dx, dy, k]] of [[1, 0, 'car'], [1, 1, 'bus'], [3, 0, 'car']].entries()) nearD(k, dx, sq + dy, 2, 1, k === 'car' ? { wreck: 1, col: CAR[i] } : {}, 1, 1);   /* the pile-up on the far side of the west wall */
    nearD('mbike', x1 - 3, sq - 1, 1, 1, { n: 3 }); nearD('mbike', x1 - 3, sq + 2, 1, 1, { n: 2 }); nearD('mbike', gx + 4, sq + 2, 1, 1, { n: 3 });
    for (const [i, [ax, ay]] of [[x0 + 3, y0 + 2], [x1 - 4, y0 + 2], [x0 + 3, y1 - 2], [x1 - 5, y1 - 2]].entries()) nearD('isocont', ax, ay, 2, 1, { col: ['#a34a3a', '#3d5a78', '#c9772e', '#4a6a52'][i], stack: i % 2 }, 0, 4);
    const wh = bOf('warehouse'); if (wh) nearD('lorry', wh.x + 2, wh.y, 2, 1, { col: '#b83a2e' }, 0, 4);
    nearD('car', gx - 5, sq + 2, 2, 1, { wreck: 1, col: CAR[1] }, 0, 3); nearD('fueltank', gx + 5, sq - 1, 1, 1, { col: '#8a4a2c' }, 0, 3);
    nearD('barrier', gx - 3, y1 + 2, 1, 1, {}, 1, 1); nearD('barrier', gx + 4, y1 + 2, 1, 1, {}, 1, 1); nearD('sign', gx + 4, y1 + 3, 1, 1, { col: '#b83a2e', dot: '#e0b23a' }, 1, 1);
  } else if (r === 'quar') {   /* an army checkpoint: an entry lane between blast walls, wire round the fence, a tent line, a motor pool, a helipad */
    gnd(gx - 1, sq + 2, 4, y1 - sq - 1, 'gravel'); gnd(x0 + 1, sq, x1 - x0 - 1, 2, 'gravel');
    for (const x of [gx - 2, gx + 3]) nearD('hesco', x, y1 + 2, 1, 2, { n: 2, r: 1 }, 1, 0);
    nearD('guardbooth', gx - 3, y1 + 2, 1, 1, { up: 1, r: 3 }, 1, 1); nearD('sign', gx + 4, y1 + 2, 1, 1, { col: '#5f6b45', dot: '#c9412e' }, 1, 1);
    for (let x = x0; x < x1; x += 3) { if (x + 3 < gx - 1 || x > gx + 2) flat('razor', x + 1, y1 + .62, { n: 3 }); flat('razor', x + 1, y0 - .62, { n: 3 }); } for (let y = y0; y < y1; y += 3) { flat('razor', x0 - .62, y + 1, { n: 3, r: 1 }); flat('razor', x1 + .62, y + 1, { n: 3, r: 1 }); }
    gnd(x1 + 2, sq - 2, 4, 5, 'concrete'); flat('helipad', x1 + 3.5, sq, {}); nearD('heli', x1 + 3, sq, 2, 1, {}, 1, 1);
    for (const [ax, ay] of [[x0 + 2, y0 + 2], [x0 + 5, y0 + 2], [x1 - 3, y0 + 2], [x1 - 6, y0 + 2]]) nearD('gptent', ax, ay, 2, 3, {}, 0, 4) || nearD('gptent', ax, ay, 2, 2, { short: 1 }, 0, 5);
    if (!H.deco.some((d) => d.k === 'gptent')) { nearD('gptent', x0 + 2, 2, 2, 3, {}, 1, 3); nearD('gptent', x0 + 5, 2, 2, 3, {}, 1, 3); }   /* a small camp: the tent line stands outside the north wire */
    nearD('atruck', x0 + 3, y1 - 2, 2, 1, {}, 0, 4); nearD('jeep', x0 + 6, y1 - 2, 2, 1, {}, 0, 4); nearD('jeep', x1 - 4, y1 - 2, 2, 1, {}, 0, 4);
    nearD('sandbags', gx - 2, y1 - 3, 1, 1, { n: 1 }, 0, 2); nearD('sandbags', gx + 3, y1 - 3, 1, 1, { n: 1 }, 0, 2);
    const rd = bOf('radio'); nearD('radar', rd ? rd.x + 1 : gx + 5, rd ? rd.y : sq - 2, 1, 1, {}, 0, 4); nearD('fueltank', x1 - 3, sq + 2, 1, 1, {}, 0, 4); nearD('acrates', gx - 5, sq - 1, 1, 1, {}, 0, 3); nearD('genset', x0 + 4, y1 - 4, 1, 1, { col: '#5f6b45' }, 0, 3);
  } else if (r === 'helix') {   /* a field laboratory: white lab tents and lab containers on hard standing, a wash line at the gate, warning signs on the wire */
    gnd(gx - 1, sq + 2, 4, y1 - sq - 1, 'concrete'); gnd(x0 + 1, sq, x1 - x0 - 1, 2, 'concrete'); gnd(gx - 1, y0 + 1, 4, sq - y0 - 1, 'concrete');
    for (const [i, [ax, ay]] of [[gx - 4, sq + 3], [gx - 7, sq + 3], [gx + 4, sq + 3]].entries()) nearD('labtent', ax, ay, 2, 1, { col: '#eef2f2', band: '#3f8fb5' }, 0, 4);
    for (const [i, [ax, ay]] of [[gx + 4, sq - 2], [gx + 7, sq - 2], [gx - 5, sq - 2], [x0 + 3, y0 + 2]].entries()) nearD('isocont', ax, ay, 2, 1, { col: '#e4e8ea', band: '#3f8fb5', lab: 1 }, 0, 4);
    nearD('shower', gx - 2, y1 - 3, 1, 1, { r: 1 }, 0, 2); nearD('shower', gx + 3, y1 - 3, 1, 1, { r: 3 }, 0, 2);
    nearD('genset', x1 - 3, y1 - 3, 1, 1, { col: '#e4e8ea' }, 0, 4); nearD('fueltank', x1 - 5, y1 - 3, 1, 1, { col: '#e4e8ea' }, 0, 4); nearD('gascyl', x0 + 3, y1 - 3, 1, 1, { n: 4 }, 0, 4); nearD('tube', gx + 5, sq + 5, 1, 1, {}, 0, 4); nearD('spot', x0 + 2, sq - 1, 1, 1, {}, 0, 3); nearD('spot', x1 - 2, sq + 2, 1, 1, { r: 2 }, 0, 3);
    for (let x = x0 + 2; x < x1; x += 4) if (x < gx - 2 || x > gx + 3) flat('hazsign', x, y1 + .7, {}); for (let y = y0 + 2; y < y1; y += 4) { flat('hazsign', x0 - .7, y, { r: 1 }); flat('hazsign', x1 + .7, y, { r: 1 }); }
    nearD('ambulance', gx + 4, y1 + 2, 2, 1, {}, 1, 1); nearD('barrier', gx - 3, y1 + 2, 1, 1, {}, 1, 1); nearD('biosign', gx - 3, y1 + 3, 1, 1, {}, 1, 1);
  } else if (r === 'hollow') {   /* the old supermarket: its car park outside, the tills by the doors, trolleys everywhere, a lorry still at the loading bay */
    gnd(x0 - 4, y1 + 1, x1 - x0 + 9, 6, 'asphalt'); gnd(gx - 1, sq + 2, 4, y1 - sq - 1, 'paving'); gnd(x0 + 1, sq, x1 - x0 - 1, 2, 'paving');
    let ci = 0; for (let x = x0 + 1; x <= x1 - 1; x++) { if (x >= gx - 2 && x <= gx + 3) continue; flat('bayline', x - .5, y1 + 2.5, {}); if ((x * 7 + 3) % 5 < 2) nearD('car', x, y1 + 2, 1, 2, { r: 1, col: CAR[ci++ % 6], wreck: ci % 3 === 0 ? 1 : 0 }, 1, 0); else if ((x * 7 + 3) % 5 === 3) nearD('trolleys', x, y1 + 2, 1, 1, { n: 3, r: 1 }, 1, 0); }
    nearD('trolleybay', gx - 4, y1 + 2, 1, 2, { r: 1 }, 1, 1); nearD('sign', gx + 4, y1 + 2, 1, 1, { col: '#3f7a4a', dot: '#c9412e', w: 2.2 }, 1, 1);
    for (const dx of [-3, -5, -7]) nearD('checkout', gx + dx, y1 - 2, 1, 1, { r: 1 }, 0, 1); for (const dx of [4, 6, 8]) nearD('checkout', gx + dx, y1 - 2, 1, 1, { r: 1 }, 0, 1);
    nearD('trolleys', gx - 2, y1 - 3, 1, 1, { n: 4 }, 0, 2); nearD('trolleys', gx + 3, sq + 2, 1, 1, { n: 2, r: 1 }, 0, 2);
    const st = bOf('storage'); if (st) { nearD('canstack', st.x + 1, st.y, 1, 1, { h: 3 }, 0, 3); nearD('pallet', st.x - 1, st.y, 1, 1, { tarp: 1 }, 0, 3); }
    gnd(gx + 2, y0 - 4, 6, 3, 'asphalt'); nearD('lorry', gx + 3, y0 - 3, 2, 1, { col: '#3f7a4a' }, 1, 2); nearD('pallet', gx + 6, y0 - 3, 1, 1, {}, 1, 2); nearD('canstack', gx + 7, y0 - 3, 1, 1, { h: 2 }, 1, 2);
  } else if (r === 'foundry') {   /* an iron works: the cupola furnace and its charging stage, a gantry crane over the casting floor, scrap heaps, ingots, a rail spur */
    gnd(x0 + 1, sq, x1 - x0 - 1, 2, 'ash'); gnd(gx - 1, sq + 2, 4, y1 - sq - 1, 'ash'); gnd(gx - 1, y0 + 1, 4, sq - y0 - 1, 'ash');
    const ws = bOf('workshop'); nearD('cupola', ws ? ws.x - 2 : gx - 5, ws ? ws.y - 2 : sq - 3, 2, 2, {}, 0, 5); if (!H.deco.some((d) => d.k === 'cupola')) nearD('cupola', gx + 4, y0 - 6, 2, 2, {}, 1, 3);   /* a small works: the furnace stands by the rail spur */ nearD('gcrane', gx + 4, sq + 3, 3, 2, {}, 0, 5) || nearD('gcrane', gx - 6, sq + 3, 3, 2, {}, 0, 5);
    const sy = bOf('scrapyard'); nearD('scrapheap', sy ? sy.x + 1 : x1 - 4, sy ? sy.y : y1 - 3, 2, 1, {}, 0, 4); nearD('scrapheap', x0 + 3, y1 - 3, 2, 1, { v: 1 }, 0, 4);
    for (const [ax, ay] of [[gx + 4, sq - 1], [gx - 4, sq + 2]]) nearD('ladle', ax, ay, 1, 1, {}, 0, 3); for (const [ax, ay] of [[gx + 6, sq + 2], [gx - 6, sq - 1], [x1 - 3, sq - 1]]) nearD('ingots', ax, ay, 1, 1, {}, 0, 3);
    nearD('forklift', gx + 3, y1 - 3, 1, 1, { r: 1 }, 0, 3); nearD('scaffold', x1 - 3, y0 + 3, 1, 1, { h: 2 }, 0, 3); nearD('isocont', x0 + 3, y0 + 2, 2, 1, { col: '#8a4a2c' }, 0, 4);
    gnd(x0 - 1, y0 - 4, x1 - x0 + 3, 2, 'gravel'); flat('track', (x0 + x1) / 2, y0 - 3, { n: x1 - x0 + 4 }); nearD('orecar', x0 + 3, y0 - 3, 1, 1, {}, 1, 0); nearD('orecar', x0 + 4, y0 - 3, 1, 1, { v: 1 }, 1, 0); nearD('orecar', x1 - 3, y0 - 3, 1, 1, {}, 1, 0);
    nearD('lorry', gx + 4, y1 + 2, 2, 1, { col: '#6f7780' }, 1, 1); nearD('scrapheap', gx - 4, y1 + 2, 2, 1, {}, 1, 1);
  } else if (r === 'green') {   /* a farm: a barn with its silo, a wind pump, hens, hives, a tractor, and fields all round the hedge */
    const st = bOf('storage'); nearD('barn', st ? st.x + 2 : gx + 4, st ? st.y - 1 : sq - 3, 3, 2, {}, 0, 6); const bn = H.deco.find((d) => d.k === 'barn'); nearD('silo', bn ? bn.x + 2.5 : gx + 7, bn ? bn.y - .5 : sq - 3, 1, 1, {}, 0, 3);
    const wl = bOf('well'); nearD('windpump', wl ? wl.x + 1 : gx - 4, wl ? wl.y : sq + 2, 1, 1, {}, 0, 4); nearD('coop', x0 + 3, y1 - 3, 2, 1, {}, 0, 5); nearD('hives', x1 - 3, y0 + 3, 1, 1, { n: 3 }, 0, 4); nearD('hives', x1 - 3, y0 + 5, 1, 1, { n: 2 }, 0, 4);
    nearD('tractor', gx + 4, y1 - 3, 2, 1, {}, 0, 4); nearD('pen', x0 + 3, y0 + 2, 2, 2, { w: 2, h: 2 }, 0, 4); nearD('watertank', gx - 4, y0 + 3, 1, 1, {}, 0, 4);
    for (const [fx, fy, fw, fh, c] of [[0, y0 + 1, 4, y1 - y0 - 1, 0], [x1 + 2, y0 + 1, 4, sq - y0 - 2, 1], [x1 + 2, sq + 2, 4, y1 - sq - 2, 2], [x0 + 1, 1, gx - x0 - 3, 4, 1], [gx + 4, 1, x1 - gx - 5, 4, 0]]) { if (fw < 2 || fh < 2) continue; gnd(fx, fy, fw, fh, 'soil'); flat('field', fx + fw / 2 - .5, fy + fh / 2 - .5, { w: fw, h: fh, crop: c }); }
    nearD('haybale', gx - 3, y1 + 2, 1, 1, { n: 3 }, 1, 1); nearD('applecrate', gx + 4, y1 + 2, 1, 1, {}, 1, 1); nearD('barrow', gx + 5, y1 + 3, 1, 1, {}, 1, 1);
  } }
/* a camp is sound if every building and the gate can be reached from the road outside, and nothing stands on the boulevard */
function campCheck() { const H = S.sh, G = H.cg, g = H.grid, seen = new Set(), q = [[G.gx, G.y1 + 2]], bad = [];
  while (q.length) { const [x, y] = q.pop(), k = x + ',' + y; if (seen.has(k) || !g[y] || !g[y][x]) continue; const v = g[y][x]; if (v === 'W' || v === 'P' || v[0] === 'K') { seen.add(k); continue; } seen.add(k); q.push([x + 1, y], [x - 1, y], [x, y + 1], [x, y - 1]); }
  for (const b of H.blds) { let ok = false; for (let y = b.y - 1; y <= b.y + b.bh && !ok; y++) for (let x = b.x - 1; x <= b.x + b.bw && !ok; x++) { const v = g[y] && g[y][x]; if ((v === 'y' || v === 'G' || v === 'o') && seen.has(x + ',' + y)) ok = true; } if (!ok) bad.push(`the ${b.name} cannot be reached`); }
  for (let y = G.y0 + 1; y < G.y1; y++) for (let x = G.gx; x <= G.gx + 1; x++) if (g[y][x] === 'P') bad.push(`a prop stands on the boulevard at ${x},${y}`);
  return bad; }
/* 3D.279 the house rules at work */
function campBrawl(a, b) { const H = S.sh; a.target = b; const reach = a.ranged ? 4 : .8; if (dist(a.w, b.w) > reach) { a.mode = a.human ? 'chase' : 'zchase'; shGo(a, b.w, a.spd, 'z'); return; }
  a.moving = false; a.faceW = { ...b.w }; if ((a.brawlT || 0) > H.t) return; a.brawlT = H.t + (a.ranged ? 70 : 45); a.mode = 'zattack'; a.stateTicks = 26; const dm = Math.max(1, Math.round(a.atk)); b.hp -= dm; b.hitT = 9; shFx(b.w, '-' + dm, '#ffb060');
  if (a.ranged) shots.push({ a: { ...a.w }, b: { ...b.w }, t: 6, bow: a.wpn === 'bow' }); if (b.hp <= 0) { b.hp = 0; shFx(b.w, b.human ? 'Down' : '✖', '#b4a296'); } }
function campZedAI(z, live) { const H = S.sh;
  if (z.wild) { let best = null, bd = 1e9; for (const s of live) { const d = dist(s.w, z.w); if (d < bd) { bd = d; best = s; } } for (const q of H.zs) if (q.hp > 0 && q.human && !q.passive) { const d = dist(q.w, z.w) * .9; if (d < bd) { bd = d; best = q; } }
    if (!best) { z.moving = false; return; } if (live.includes(best)) { if (z.mode === 'patrol') z.mode = 'idle'; shZombieAI(z, [best]); } else campBrawl(z, best); return; }
  if (z.tame && !z.angry) { if (live.some((s) => dist(s.w, z.w) < 3.6)) { z.angry = true; shFx(z.w, '💢', '#ff6e62'); } else {   /* the Hollow's dead wander among them and leave them alone */
      if (!z.dest || (z.waitT = (z.waitT || 0) - 1) === 0) { const B = H.box; for (let k = 0; k < 30; k++) { const x = rint(B[0] + 1, B[2] - 1), y = rint(B[1] + 1, B[3] - 1); if (H.grid[y][x] === 'y') { z.dest = shWorld(x, y); break; } } }
      if (z.waitT > 0) { z.moving = false; z.mode = 'patrol'; return; } z.mode = 'patrol'; if (!z.dest || shGo(z, z.dest, z.spd * .5, 'z') || !z.path) z.waitT = rint(200, 420); return; } }
  if (z.mode === 'patrol') z.mode = 'idle'; shZombieAI(z, live); }
function campCageOpen(b) { const H = S.sh, lv = H.lvl || 5, n = b.zcage || 2; b.zcage = 0; for (let i = 0; i < n; i++) { const ty = i === 0 && lv >= 12 ? 'brute' : i % 2 ? 'runner' : 'walker', zd = zombieTypes[ty], w = { x: b.w.x + (i % 2 ? .6 : -.6), y: b.w.y + .7 + Math.floor(i / 2) * .5 };
    H.zs.push({ type: ty, human: false, wild: true, room: 'y', w, hp: zd.hp, max: zd.hp, atk: zd.atk, spd: (zd.chase || .012) * 1.25, mode: 'idle', stateTicks: 0, target: null, moving: false, phase: rnd() * 100 }); }
  shFx(b.w, `☣ ${n} of the dead are loose`, '#ff6e62'); say(`The cage breaks open: ${n} of the dead are loose, and they go for whoever is nearest. Guards included.`); }
function campSpecial(b) { const H = S.sh, G = H.cg;
  if (b.special === 'winch') { H.winchDown = true; if (G && G.east) for (const y of [G.east[1], G.east[1] + 1]) H.grid[y][G.x1] = 'W'; shFx(b.w, '⛓ The east gate crashes down', '#ffe9b8'); say('The east gate crashes down. Their bikes will have to go round to the south gate: patrols come slower.'); }
  else if (b.special === 'lights') { for (const l of H.lights || []) l.on = false; shFx(b.w, '💡 The floodlights go dark', '#ffe9b8'); say('The floodlights go dark: the towers are blind.'); }
  else if (b.special === 'bell') { shFx(b.w, '🔔 The bell falls silent', '#ffe9b8'); say('The chapel bell is down: nobody can ring the dead in now.'); }
  else if (b.special === 'steam') { for (const z of H.zones || []) if (z.k === 'heat') z.on = false; campAlarm(b.w, 'The steam valve burst with a scream'); say('The furnaces die down and the floor cools. Everyone heard it.'); } }
function campLit(H, live) { for (const l of H.lights || []) { if (!l.on) continue; const o = { x: SH_AX + l.x, y: SH_AY + l.y }; for (const s of live) { const dx = s.w.x - o.x, dy = s.w.y - o.y, d = Math.hypot(dx, dy); if (d > 7 || d < .5) continue; let da = Math.atan2(dy, dx) - l.a; da = Math.atan2(Math.sin(da), Math.cos(da)); if (Math.abs(da) < .3) return s; } } return null; }
function campRules(H, live) { for (const l of H.lights || []) if (l.on) l.a += l.sp;
  if (H.zones && H.zones.length && H.t % 30 === 0) shZoneHurt(H, live);
  if (H.raid === 'green' && H.alarm && !H.yielded) { const hq = H.blds.find((b) => DEFS[b.type].role === 'hq'); if (hq && live.some((s) => campDist(s, hq) < 1.6)) { H.yieldT = (H.yieldT || 0) + 1; if (H.yieldT % 60 === 1) shFx(hq.w, `🌿 They waver… ${Math.ceil((180 - H.yieldT) / 60)}`, '#ffe9b8'); } else H.yieldT = Math.max(0, (H.yieldT || 0) - 1);
    if (H.yieldT >= 180) { H.yielded = true; H.reinAt = 0; for (const z of H.zs) if (z.human && z.hp > 0) { z.passive = true; z.target = null; z.mode = 'patrol'; } banner('🌿 GREENWATER GIVES UP'); say('Elder Maren lowers her bow: "Take what you came for, and go." Nobody else will fight.'); shPanel(); } } }
function campDist(s, t) { if (!t.bld) return dist(s.w, t.w); const x0 = SH_AX + t.x, y0 = SH_AY + t.y, dx = Math.max(x0 - s.w.x, 0, s.w.x - (x0 + t.bw)), dy = Math.max(y0 - s.w.y, 0, s.w.y - (y0 + t.bh)); return Math.hypot(dx, dy); }
function campSpot(b, s) {   /* a free tile beside the building, spread out by who is going */
  const g = S.sh.grid, c = []; for (let y = b.y - 1; y <= b.y + b.bh; y++) for (let x = b.x - 1; x <= b.x + b.bw; x++) { if (x >= b.x && x < b.x + b.bw && y >= b.y && y < b.y + b.bh) continue; const v = g[y] && g[y][x]; if (v === 'y' || v === 'o' || v === 'G') c.push(shWorld(x, y)); }
  c.sort((a, q) => dist(a, s.w) - dist(q, s.w)); return c[S.sh.units.indexOf(s) % Math.max(1, Math.min(3, c.length))] || c[0] || b.w; }
function campAlarm(at, why) { const H = S.sh; if (!H || H.alarm) return; H.alarm = true; H.reinAt = H.t + 60 * ((CAMP_PLAN[H.raid] || {}).reinFirst || 50); H.reinN = 0; for (const z of H.zs) { z.asleep = false; z.joinAt = H.t + Math.round(60 * Math.max(0, dist(z.w, at) - 5) * 3.5); }   /* 3D.140 the camp is smaller: guards far from the shout take a while to arrive (3.5 s a tile past 5) instead of all landing at once */ SFX('alarm'); shFx(at, '❗ ' + (why || 'Spotted!'), '#ff6e62'); say(`${why || 'The squad was spotted'}: the whole camp is on alert!`);
  const hq = H.blds.find((b) => DEFS[b.type].role === 'hq' && !b.dead); for (const z of H.zs) if (z.hp > 0) { z.mode = 'idle'; if (z.worker) z.hide = hq ? campSpot(hq, H.units[0]) : z.home; } shPanel(); }
function campFall(b) { const H = S.sh; b.dead = true; b.hp = 0; SFX('hit'); if (b.special) campSpecial(b); if (b.zcage) campCageOpen(b); if (b.fence) { shFx(b.w, '💥 A way through the fence', '#ffb060'); for (const q of H.units) if (q.order === b) q.order = null; shPanel(); return; } shFx(b.w, `💥 ${b.name} is down`, '#ffb060');
  if (b.pris) { H.found = (H.found || 0) + b.pris; shFx({ x: b.w.x, y: b.w.y + .6 }, `🔓 ${b.pris} prisoner${b.pris > 1 ? 's' : ''} freed`, '#7be08a'); b.looted = true; }
  else if (!Object.values(b.loot).some((n) => n > 0) && !b.items.length && !(b.keys && b.keys.length)) b.looted = true; shPanel(); }
/* 3D.131 owner: a raid must not be overpowering. The squad carries home 10 resources a head (gear does not count): 40 for four, 80 for eight.
   A level-9 squad of eight used to walk out with about 150. What does not fit stays in the building. */
const CAMP_CARRY = 10, campBag = (H) => CAMP_CARRY * H.units.length, campBagLoad = (H) => Object.values(H.loot).reduce((a, n) => a + n, 0);
function campTake(b, s) { const H = S.sh; let room = campBag(H) - campBagLoad(H); const got = [];
  for (const [k, n] of Object.entries(b.loot)) { const t = Math.min(n, room); if (t > 0) { H.loot[k] = (H.loot[k] || 0) + t; b.loot[k] = n - t; room -= t; got.push((RES_ICON[k] || k) + ' +' + t); } }
  (H.items ||= []).push(...b.items); got.push(...b.items.map((k) => '🎁 ' + ITEMS[k].name)); b.items = []; if (b.keys && b.keys.length) { (H.keys ||= []).push(...b.keys); got.push(...b.keys.map((k) => '🔑 ' + (SH_KEYS[k] || { name: k }).name)); b.keys = []; } const left = Object.values(b.loot).some((n) => n > 0) || !!(b.keys && b.keys.length); b.looted = !left;
  shFx(s.w, got.join('  ') || (left ? '🎒 Bags are full' : 'Nothing left'), '#ffe9b8'); if (left) say(`The squad can't carry any more (${campBagLoad(H)}/${campBag(H)}). Time to get out.`); SFX('reward'); shPanel(); }
function campUnitAI(s, zs, live) {
  const H = S.sh; if (s.hp <= 0) { s.mode = 'down'; s.moving = false; s.loot = null; return; }
  if (s.reloadT > 0) { s.moving = false; if (--s.reloadT <= 0) reloadGun(s); return; }
  const w = weaponOf(s), reach = (w.ranged ? Math.min(4.5, rangeOf(s)) : .8) + (s.aimNext ? 1.5 : 0);
  if (s.mode === 'attack') { s.moving = false; if (--s.stateTicks > 0) return; const z = s.target;
    if (z && z.hp > 0 && campDist(s, z) <= reach + .3) { const cr = !!s.critNext || !!s.aimNext; let dm = shUnitDmg(s, z.bld ? { type: 'bld' } : z) * (cr ? 3 : 1); if (cr) { s.critNext = false; s.aimNext = false; shFx({ x: z.w.x, y: z.w.y - .4 }, 'CRIT!', '#ffd56b'); } else s.crit = Math.min(100, (s.crit || 0) + 14);
      if (z.bld) dm = Math.max(1, Math.round(dm * .35 * (['Mechanic', 'Engineer'].includes(s.job) ? 2 : 1)));
      z.hp -= dm; z.hitT = 9; SFX(hitSfx(w)); shFx(z.w, '-' + dm, z.boss ? '#ffd56b' : z.bld ? '#ffe9b8' : '#ffffff'); if (w.ranged) shots.push({ a: { ...s.w }, b: { ...z.w }, t: 6, bow: w.kind === 'bow' });
      if (w.ranged && usesAmmo(w)) { s.ammo = (s.ammo == null ? w.mag : s.ammo) - 1; if (s.ammo <= 0) s.reloadT = Math.round((w.reload || 2) * 60); }
      if (!H.alarm && (z.fence ? H.zs.some((q) => q.hp > 0 && !q.worker && !q.asleep && dist(q.w, z.w) < 7 * (H.night ? .6 : 1)) : z.bld ? H.zs.some((q) => q.hp > 0 && !q.asleep && dist(q.w, z.w) < ((CAMP_PLAN[H.raid] || {}).hear || 99) * (H.night ? .6 : 1) * (q.worker ? .5 : 1)) : (!z.worker || rnd() < .5))) campAlarm(z.w, z.fence ? 'A guard heard the fence going down' : z.bld ? `They heard the ${z.name} being smashed` : 'A guard shouts');
      if (z.hp <= 0) { if (z.bld) campFall(z); else { H.kills++; if (!H.practice) { S.kills++; S.raiderKills = (S.raiderKills || 0) + 1; gainXp(s, z.boss ? 12 : 2); } } for (const q of H.units) if (q.order === z) q.order = null; } }
    s.mode = 'recover'; s.stateTicks = s.recDur = Math.round(48 * Math.max(.6, 1 - (stat(s, 'agi') - 5) * .02) * (w.rate || 1)); return; }
  if (s.mode === 'recover') { s.moving = false; if (--s.stateTicks > 0) return; s.mode = 'free'; }
  if (s.loot != null) { const b = H.blds[s.loot]; if (!b || b.looted) { s.loot = null; s.lootT = 0; } else { const near = zs.find((z) => !z.worker && dist(z.w, s.w) < 2); if (near) { s.target = near; s.mode = 'attack'; s.stateTicks = 14; return; }
      if (campDist(s, b) > .95) { s.mode = 'walk'; s.target = null; if (!shGo(s, s.lootAt || (s.lootAt = campSpot(b, s)), .024, 'u') && !s.path && campDist(s, b) > .95) { s.loot = null; say(`${s.name} can't get to the ${b.name}.`); } return; }
      s.mode = 'fix'; s.moving = false; s.faceW = b.w; s.lootT = (s.lootT || 0) + 1; b.prog = s.lootT / 150; if (s.lootT >= 150) { campTake(b, s); b.prog = 0; s.loot = null; s.lootT = 0; s.mode = 'free'; } return; } }
  if (s.moveTo) { s.mode = 'walk'; s.target = null; if (shGo(s, s.moveTo, .024, 'u')) { s.moveTo = null; s.mode = 'free'; } return; }
  if (s.order && s.order.hp <= 0) s.order = null;
  const st = s.stance || 'attack', hurt = s.hp < s.max * .3;
  if (st === 'back' && hurt && zs.some((z) => dist(z.w, s.w) < 3)) { s.mode = 'walk'; shGo(s, H.exit, .026, 'u'); return; }
  let t = s.order && !s.order.bld ? s.order : null;
  if (!t) { let bd = st === 'hold' ? reach + .2 : w.ranged ? Math.max(reach, 3) : 3.2; for (const z of zs) { if ((z.worker && !H.alarm) || z.passive || (z.tame && !z.angry)) continue; const d0 = dist(s.w, z.w); if (!H.alarm && d0 > 1.6) continue;   /* 3D.130 while the camp has not seen them the squad holds its fire (the riflemen used to open up on the gate guards at once, so no raid was ever quiet); it still defends itself at arm's length and attacks whoever you point at */ if (d0 < bd) { bd = d0; t = z; } } }
  if (!t && s.order && s.order.bld) t = s.order;
  s.target = t;
  if (t) { const d0 = campDist(s, t); if (d0 > reach) { if (st === 'hold' && !s.order) { s.mode = 'free'; s.moving = false; return; } s.mode = 'chase'; if (t.bld) { if (!s.spotFor || s.spotFor !== t) { s.spotFor = t; s.spotAt = campSpot(t, s); } if (!w.ranged || d0 > reach) shGo(s, s.spotAt, .022, 'u'); } else shGo(s, t.w, .02, 'u'); } else { s.mode = 'attack'; s.stateTicks = 14; s.moving = false; s.faceW = { ...t.w }; } return; }
  s.mode = 'free'; s.moving = false; }
function campEnemyAI(z, live) {
  const H = S.sh; if (z.stuckT > H.t) { z.moving = false; return; } if (!z.human) return campZedAI(z, live); if (z.passive) { z.moving = false; z.mode = 'patrol'; return; }
  if (!z.worker) { const wz = H.zs.find((q) => q.hp > 0 && q.wild && dist(q.w, z.w) < (z.ranged ? 4 : 2.5)); if (wz && !live.some((s) => dist(s.w, z.w) < 1.5)) { campBrawl(z, wz); return; } }   /* 3D.279 guards fight the dead let out of the cages */
  if (!H.alarm && z.asleep) { z.moving = false; z.mode = 'patrol'; if (live.some((s) => dist(s.w, z.w) < 1.2)) campAlarm(z.w, 'A sleeper woke and shouted'); return; }   /* 3D.128 night: the workers sleep; only stepping on one wakes it */
  if (!H.alarm && H.lights && H.t % 10 === 0) { const sl = campLit(H, live); if (sl) { campAlarm(sl.w, 'A searchlight found the squad'); return; } }
  if (!H.alarm) { const sp = live.find((s) => dist(s.w, z.w) < (z.worker ? 3 : z.post ? 4.2 : 4.5) * (H.night ? .6 : 1)); if (sp) { campAlarm(z.w, z.worker ? 'A worker raised the alarm' : `${z.leader ? z.name : 'A guard'} spotted the squad`); return; }
    if (z.post) { z.moving = false; z.mode = 'patrol'; return; }
    if (!z.dest || (z.waitT = (z.waitT || 0) - 1) === 0) { const bs = H.blds.filter((b) => !b.dead); const b = bs[Math.floor(rnd() * bs.length)]; z.dest = z.worker && b ? campSpot(b, z) : (() => { for (let k = 0; k < 30; k++) { const B = H.box, x = rint(B[0] + 1, B[2] - 1), y = rint(B[1] + 1, B[3] - 1); if (H.grid[y][x] === 'y') return shWorld(x, y); } return z.home; })(); }
    if (z.waitT > 0) { z.moving = false; z.mode = 'patrol'; return; }
    z.mode = 'patrol'; if (shGo(z, z.dest, z.spd * .6, 'z') || !z.path) { z.waitT = rint(150, 360); } return; }
  if (!z.worker && !z.keep && z.joinAt > H.t && z.hp >= (z.hpJ ?? z.hp) && !live.some((s) => dist(s.w, z.w) < 4.5)) { z.hpJ = z.hp; z.moving = false; z.mode = 'patrol'; return; }
  if (z.worker) { const t = live.find((s) => dist(s.w, z.w) < 1.1); if (t) { shZombieAI(z, [t]); return; } z.mode = 'rflee'; if (z.hide) shGo(z, z.hide, z.spd * 1.1, 'z'); else z.moving = false; return; }
  if (z.keep) {   /* 3D.128 the armoury guard, the hall guard and the leader stay with what they guard: they fight whoever comes close (or shoots them), and walk back when the squad pulls away */
    if (z.hp < (z.hpSeen ?? z.hp)) z.keepOff = H.t + 600; z.hpSeen = z.hp; if (z.esc || z.boss) { for (const q of H.zs) if (q !== z && q.hp > 0 && (q.esc || q.boss) && q.keepOff > H.t) z.keepOff = Math.max(z.keepOff || 0, q.keepOff); }   /* the leader and his bodyguards fight as one */ const near = z.keepOff > H.t ? live : live.filter((s) => dist(s.w, z.home) < (z.esc || z.boss ? 4.2 : 6.5));   /* 3D.145 the leader's knot holds the hall: it only comes out for people right at it, or once one of them is hit */
    if (!near.length) { z.target = null; z.mode = 'patrol'; if (dist(z.w, z.home) > .5) shGo(z, z.home, z.spd, 'z'); else z.moving = false; return; }
    if (z.mode === 'patrol') z.mode = 'idle'; shZombieAI(z, near); return; }
  if (z.mode === 'patrol') z.mode = 'idle'; shZombieAI(z, live); }
function campReinforce() {   /* 3D.128 once the alarm is up, patrols come back to the gate: don't linger. 3D.130: how soon, how often, how many and how tough come from the camp's plan */
  const H = S.sh; if (H && H.bossDown && H.reinAt) { H.reinAt = 0; H.reinStop = 'boss'; say('With their leader down, no more patrols will come. Grab what you can and walk out.', true); }   /* 3D.169 play-test: "the waves never ended", even after the boss fell */
  if (!H || !H.alarm || !H.reinAt || H.t < H.reinAt || H.back) return; const P = CAMP_PLAN[H.raid] || {}, TK = P.tough || 1, n = (P.reinN0 || 2) + H.reinN, zd = zombieTypes.raider || zombieTypes.walker; const G = H.cg, lvx = Math.floor(Math.max(0, (H.lvl || 5) - 5) / 5); H.reinN++; H.reinAt = H.reinN < (P.reinMax || 3) + lvx ? H.t + 60 * (P.reinEvery || 60) * (H.reinScale || 1) * (H.winchDown ? 1.5 : 1) : 0;   /* 3D.279 bigger camps send more patrols; the Toll Kings' bikes come quicker, unless the gate winch is broken */
  const east = G && G.east && !H.winchDown, bell = H.raid === 'hollow' && H.blds.some((b) => b.special === 'bell' && !b.dead);
  for (let i = 0; i < n; i++) { const wpn = i % 3 === 2 ? 'rifle' : ['bat', 'crowbar', 'machete'][i % 3], hp = Math.round(zd.hp * 1.3 * TK), w = east ? shWorld(G.x1 + 2 + Math.floor(i / 2) * .7, G.east[1] + (i % 2)) : shWorld((G ? G.gx - 1 : 12) + (i % 4), (G ? G.y1 + 2.4 : 26.4) + Math.floor(i / 4) * .6);
    H.zs.push({ type: 'raider', human: true, wpn, ranged: wpn === 'rifle', room: 'y', w, hp, max: hp, atk: zd.atk * 1.2 * TK, spd: (zd.chase || .012) * 1.25 * (H.bikes && east ? 1.5 : 1), mode: 'idle', stateTicks: 0, target: null, moving: false, phase: rnd() * 100, fk: H.raid, home: { ...w }, rein: true }); }
  if (bell) for (let i = 0; i < 2 + Math.floor(H.reinN / 2); i++) { const zw = zombieTypes.walker, w = shWorld((G ? G.gx : 13) + (i % 3), (G ? G.y1 + 3 : 27) + Math.floor(i / 3) * .6); H.zs.push({ type: 'walker', human: false, room: 'y', w, hp: zw.hp, max: zw.hp, atk: zw.atk, spd: (zw.chase || .012) * 1.25, mode: 'idle', stateTicks: 0, target: null, moving: false, phase: rnd() * 100, rein: true, called: true }); }
  SFX('alarm'); shFx(east ? shWorld(G.x1 + 1, G.east[1]) : shWorld((G ? G.gx : 13) + .5, (G ? G.y1 + 1.5 : 25.5)), `❗ ${n} more at the ${east ? 'east gate, on bikes' : 'gate'}${bell ? ', and the bell calls the dead' : ''}`, '#ff6e62'); say(`A patrol is back: ${n} more ${H.raid === 'toll' ? 'Toll Kings' : 'of them'} at the gate` + (H.reinAt ? ` (patrol ${H.reinN} of ${P.reinMax || 3}).` : '. That was the last patrol.')); shPanel(); }
/* the practice page (owner: "a test page in the game for that function"): try any stronghold or camp with a ready-made squad;
   nothing is lost or gained, and the town waits. Open it from Town > Defense, or with ?shtest=1. */
let prBack = null, prPick = '';
function practicePhone(back) {   /* 3D.370 (W249, W270): Stronghold practice like a settings form: Place and Town level as rows that open a list with a tick,
     squad size and day / night as segmented controls, one wide Start; what it is and the controls behind "How it works ›" */
  const P = expSel.pr, D = (k) => EXP_DEFS[k] || {}, nm = (k) => esc((D(k).name || k).replace('Raid: ', '')), ic = (k) => D(k).icon || (SH_DEFS[k].raid ? '⚔' : '🏚'), ch = `<i class="phChv">${phG('ch', 14)}</i>`;
  const grp = (x) => `<div class="phCard">${x}</div>`, sec = (t) => `<div class="phSec">${t}</div>`, tick = '<svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="#9fe07a" stroke-width="2.6" stroke-linecap="round" stroke-linejoin="round"><path d="M5 12.5l4.5 4.5L19 7.5"/></svg>';
  const seg = (attr, opts, cur) => `<div class="phSeg">${opts.map(([v, t]) => `<button data-${attr}="${v}" class="${String(v) === String(cur) ? 'on' : ''}">${t}</button>`).join('')}</div>`;
  const maps = Object.keys(SH_DEFS), pick = (k, v) => `<div class="phR" data-pk="${k}" role="button"><span class="k">${v}</span><span class="v"></span>${ch}</div>`;
  let h = '<div class="phSet phPrac">';
  if (prPick === 'map') {
    const row = (k) => `<div class="phR" data-pm="${k}" role="button"><span class="em">${ic(k)}</span><span class="k">${nm(k)}</span><span class="v"></span><span class="tk">${P.map === k ? tick : ''}</span></div>`;
    h += sec('Strongholds') + grp(maps.filter((k) => !SH_DEFS[k].raid).map(row).join('')) + sec('Faction camps') + grp(maps.filter((k) => SH_DEFS[k].raid).map(row).join(''));
  } else if (prPick === 'lv') {
    h += sec('Sets the map\'s size and the squad\'s level') + grp([3, 5, 8, 10, 12, 15, 18, 20].map((n) => `<div class="phR" data-pl="${n}" role="button"><span class="k">Level ${n}</span><span class="v"></span><span class="tk">${P.lv === n ? tick : ''}</span></div>`).join(''));
  } else {
    h += grp(`<div class="phR" data-pk="map" role="button"><span class="em">${ic(P.map)}</span><span class="k">Place</span><span class="v">${nm(P.map)}</span>${ch}</div><div class="phR" data-pk="lv" role="button"><span class="k">Town level</span><span class="v">${P.lv}</span>${ch}</div>`)
      + sec('Squad') + seg('pn', [4, 5, 6, 7, 8].map((n) => [n, n]), P.n)
      + (SH_DEFS[P.map].raid ? sec('Time') + seg('pt', [[0, 'Day'], [1, 'Night']], P.night ? 1 : 0) : '')
      + `<button class="act go phWide" id="prGo">Start practice</button>`
      + sec('') + grp(`<div class="phR" id="prHow" role="button"><span class="k">How it works</span><span class="v"></span>${ch}</div>`)
      + `<div class="phHow" style="display:none">${grp(`<div class="phPad">A ready-made squad, nothing lost or gained; the town waits while you play.<br><br>Drag to look, pinch to zoom. Tap a survivor (or 👥 All), then the floor to move, an enemy to attack, a door to open or shut it. A 🔒 door: tap it to force the lock, or 💣 it. Rooms stay dark until their door opens.<br><br><b>Faction camps:</b> tap a building to attack it, tap it again once it's down to loot it. Stay unseen: once the alarm goes up, patrols keep coming to the gate. At night guards see less and workers sleep. 🏃 Get out leaves with what you took.</div>`)}</div>`;
  }
  $('ib').innerHTML = h + '</div>';
  showPanel(prPick === 'map' ? 'Place' : prPick === 'lv' ? 'Town level' : 'Practice', prPick ? () => { prPick = ''; showShPractice(); } : back); if (prPick) $('pBack').dataset.t = 'Practice'; else if (back) $('pBack').dataset.t = 'Town';
  const re = () => showShPractice();
  $('ib').querySelectorAll('[data-pk]').forEach((b) => { b.onclick = () => { prPick = b.dataset.pk; re(); }; });
  $('ib').querySelectorAll('[data-pm]').forEach((b) => { b.onclick = () => { P.map = b.dataset.pm; prPick = ''; re(); }; });
  $('ib').querySelectorAll('[data-pl]').forEach((b) => { b.onclick = () => { P.lv = +b.dataset.pl; prPick = ''; re(); }; });
  $('ib').querySelectorAll('[data-pn]').forEach((b) => { b.onclick = () => { P.n = +b.dataset.pn; re(); }; });
  $('ib').querySelectorAll('[data-pt]').forEach((b) => { b.onclick = () => { P.night = b.dataset.pt === '1'; re(); }; });
  { const w = $('prHow'), hw = $('ib').querySelector('.phHow'); if (w && hw) w.onclick = () => { const o = hw.style.display === 'none'; hw.style.display = o ? '' : 'none'; if (o) hw.scrollIntoView({ block: 'nearest' }); }; }
  return !!$('prGo');
}
function showShPractice(back) {
  endBuildMode(true); const maps = Object.keys(SH_DEFS); expSel.pr = expSel.pr || { map: 'clinic', n: 6, goal: 'loot', lv: 6, night: false }; const P = expSel.pr;
  if (back !== undefined) { prBack = typeof back === 'function' ? back : null; prPick = ''; }
  if (phoneOn() && !practicePhone(prBack)) return;
  if (!phoneOn()) {
  $('ib').innerHTML = `<div class="card"><b>🎯 Stronghold practice</b><div class="sm">Try every control with a ready-made squad. Nothing is lost or gained, and the town waits while you play.</div></div>
    <div class="sm">Map</div><div class="row" style="flex-wrap:wrap;gap:6px">${maps.map((k) => `<button class="vehB ${P.map === k ? 'on' : ''}" data-pm="${k}">${(EXP_DEFS[k] || {}).icon || (SH_DEFS[k].raid ? '⚔' : '🏚')} ${esc((EXP_DEFS[k] || {}).name || k)}<small>${SH_DEFS[k].raid ? 'faction camp' : 'rec. ' + SH_DEFS[k].rec}</small></button>`).join('')}</div>
    ${('')}
    <div class="sm">Squad size</div><div class="row" style="gap:6px">${[4, 5, 6, 7, 8].map((n) => `<button class="vehB ${P.n === n ? 'on' : ''}" data-pn="${n}">${n}</button>`).join('')}</div>
    <div class="sm">Town level (the map's size and the squad's level)</div><div class="row" style="gap:6px;flex-wrap:wrap">${[3, 5, 8, 10, 12, 15, 18, 20].map((n) => `<button class="vehB ${P.lv === n ? 'on' : ''}" data-pl="${n}">Lv ${n}</button>`).join('')}</div>
    ${SH_DEFS[P.map].raid ? `<div class="sm">Time (faction camps)</div><div class="row" style="gap:6px"><button class="vehB ${P.night ? '' : 'on'}" data-pt="0">☀️ Day</button><button class="vehB ${P.night ? 'on' : ''}" data-pt="1">🌙 Night<small>guards see less, workers sleep</small></button></div>` : ''}
    <button class="act go" id="prGo" style="margin-top:10px">Start practice</button>
    <div class="sm" style="margin-top:8px"><b>Controls:</b> drag to look around, pinch or scroll to zoom. Tap a survivor (or 👥 All) to take control. Then tap the floor to move, an enemy to attack, a door to open or shut it. A 🔒 locked door: tap it and someone forces the lock (Mechanics, Scavengers and Engineers are quicker), or blow it open with a 💣. You can't see into a room until its door opens: it may hold supplies, nothing, or a nest. <b>Faction camps:</b> tap a building to send the squad at it; once it's down, tap it again to loot it. Stay unseen as long as you can: once the alarm goes up, the patrols come for you (the armoury and hall guards stay at their posts), and a bigger patrol arrives at the gate every half minute, so take what you came for and get out. Until they see you the squad holds its fire. At night the guards see and hear less far and the workers sleep. 🏃 Get out leaves through the gate with what you took. The fence can be broken (tap a section, or bomb it) to make your own way in, but guards close by will hear it. The selected survivor's stance, ability and ✦ critical show above the bottom bar.</div>`;
  $('ib').querySelectorAll('[data-pm]').forEach((b) => { b.onclick = () => { P.map = b.dataset.pm; showShPractice(); }; }); $('ib').querySelectorAll('[data-pg]').forEach((b) => { b.onclick = () => { P.goal = b.dataset.pg; showShPractice(); }; });
  $('ib').querySelectorAll('[data-pt]').forEach((b) => { b.onclick = () => { P.night = b.dataset.pt === '1'; showShPractice(); }; }); $('ib').querySelectorAll('[data-pn]').forEach((b) => { b.onclick = () => { P.n = +b.dataset.pn; showShPractice(); }; }); $('ib').querySelectorAll('[data-pl]').forEach((b) => { b.onclick = () => { P.lv = +b.dataset.pl; showShPractice(); }; });
  }
  $('prGo').onclick = () => { if (S.sh) { say('A squad is already inside.'); return; } const jobs = ['Guard', 'Police Officer', 'Medic', 'Scavenger', 'Mechanic', 'Engineer', 'Guard', 'Police Officer'], wp = ['machete', 'rifle', 'pistol', 'crossbow', 'sledge', 'shotgun', 'katana', 'rifle'], ar = P.lv >= 9 ? 'kevlar' : P.lv >= 6 ? 'leather' : null;
    const sq = []; for (let i = 0; i < P.n; i++) { const q = mk(FIRST_NAMES[(i * 7 + 3) % FIRST_NAMES.length], jobs[i], P.lv, 0, 0, i); q.eq = { weapon: ITEMS[wp[i]] ? wp[i] : 'bat', armor: ar && ITEMS[ar] ? ar : null, head: null, acc: null }; setMaxHp(q); q.hp = q.max; q.ammo = 99; q.id = 80000 + i; sq.push(q); }
    S.sv.push(...sq); const r = startStronghold(P.map, sq.map((q) => q.id), { practice: true, goal: P.goal, night: !!P.night, lv: P.lv }); S.sv = S.sv.filter((q) => !sq.includes(q)); if (!r.ok) { say(r.why); return; } closeP(); };
  if (!phoneOn()) showPanel('Stronghold practice');
}
