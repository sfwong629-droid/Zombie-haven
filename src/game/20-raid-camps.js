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
function campBuild() {   /* lay out the camp: a fenced square, the gate south, rings of buildings with the valuables in the middle */
  const H = S.sh, P = CAMP_PLAN[H.raid] || CAMP_PLAN.toll, W = CAMP_W, Ht = CAMP_H, g = [];
  for (let y = 0; y < Ht; y++) { g.push(new Array(W).fill('o')); } const FX0 = 5, FX1 = 22, FY0 = 7, F1 = 24;   /* 3D.140 a smaller compound (16 x 16 inside, was 20 x 20): the same people and more buildings in less space */
  H.box = [FX0, FY0, FX1, F1];
  for (let y = FY0; y <= F1; y++) for (let x = FX0; x <= FX1; x++) g[y][x] = x === FX0 || x === FX1 || y === FY0 || y === F1 ? 'W' : 'y';
  for (const x of CAMP_GATE) g[F1][x] = 'G';
  H.grid = g; H.gw = W; H.gh = Ht; H.blds = []; H.exit = shWorld(13.5, 26.6);
  /* 3D.121 owner: the fence has health like the town's walls; break a section to make a way in (loud: guards close by hear it) */
  const fType = H.raid === 'green' || H.raid === 'hollow' ? 'wood' : 'palisade', fHp = (Wd.WALL_DEFS[fType] || { hp: 80 }).hp; H.fence = {};
  for (let y = FY0; y <= F1; y++) for (let x = FX0; x <= FX1; x++) if (g[y][x] === 'W') H.fence[x + ',' + y] = { bld: true, fence: true, type: fType, name: 'fence', x, y, bw: 1, bh: 1, hp: fHp, max: fHp, dead: false, looted: true, loot: {}, items: [], w: shWorld(x, y) };
  const c = 13.5, ring = (x, y, w, h) => Math.max(Math.abs(x + w / 2 - c), Math.abs(y + h / 2 - 15.5)) * 1.25, K = CAMP_KIT[H.raid] || CAMP_KIT.toll; H.props = [];
  const putB = (type, x, y) => { const d = DEFS[type], w = d.w, h = d.h, i = H.blds.length, L = campLoot(type, H), rr = ring(x, y, w, h), inner = rr <= 4.5, hp = Math.round((w * h >= 4 ? 240 : w * h >= 2 ? 150 : 90) * (inner ? 1.4 : 1) * (type === 'bonfire' ? .4 : 1));
    H.blds.push({ i, bld: true, type, name: L.name || d.name, x, y, bw: w, bh: h, rot: 0, hp, max: hp, icon: L.icon, loot: L.loot, items: L.items.filter(Boolean), pris: L.pris || 0, dead: false, looted: false, inner, w: shWorld(x + w / 2 - .5, y + h / 2 - .5) });
    for (let yy = y; yy < y + h; yy++) for (let xx = x; xx < x + w; xx++) g[yy][xx] = 'K' + i; };
  const putP = (k, x, y, r) => { if (g[y][x] !== 'y') return; g[y][x] = 'P'; H.props.push({ k, x, y, r: r || 0, v: rnd() }); };
  /* rows of lots, nearest the hall first; the west rows fill from the boulevard outward, the east rows the same */
  const rows = []; for (const y of [13, 18, 11, 20, 22, 9]) for (const side of ['W', 'E']) rows.push({ y, side, cur: side === 'W' ? 11 : 16, last: null });
  /* a row is 5 tiles; buildings of the same kind stand shoulder to shoulder (a terrace), different kinds leave one tile between */
  const lot = (row, w, t) => { const gap = row.last === null || (t && row.last === t) ? 0 : 1; if (row.side === 'W') { const x0 = row.cur - gap - w + 1; if (x0 < 7) return -1; row.cur = x0 - 1; row.last = t; return x0; } const x0 = row.cur + gap; if (x0 + w - 1 > 20) return -1; row.cur = x0 + w; row.last = t; return x0; };
  const all = [...P.inner, ...P.mid, ...P.outer.slice().sort(), '*kit', ...K.homes].filter((t) => t === '*kit' || DEFS[t]); let back = false, kn = 0;
  const kitNext = () => K.kit[Math.floor(kn / 2) % K.kit.length];
  for (const t of all) { if (t === '*kit') { for (let i = 0; i < 8; i++) { const k = kitNext(); for (const row of rows) { const x = lot(row, 1, k); if (x >= 0) { putP(k, x, row.y, 0); kn++; break; } } } continue; }   /* the faction's own things sit among the work buildings, before the homes fill the outer rows */
    const d = DEFS[t];
    if (d.role === 'hq' && !H.blds.some((b) => DEFS[b.type].role === 'hq')) { putB(t, 13, 15); continue; }
    if (d.h > 1) { if (!back) { back = true; putB(t, 13, 10); } continue; }
    for (const row of rows) { const x = lot(row, d.w, t); if (x >= 0) { putB(t, x, row.y); break; } } }
  /* what is left of the rows: the faction's own things, two of a kind side by side */
  for (const row of rows) for (let k = kitNext(), x = lot(row, 1, k); x >= 0; k = kitNext(), x = lot(row, 1, k)) { putP(k, x, row.y, 0); kn++; }
  /* the boulevard stays four tiles wide (a two-wide one was a death trap at the gate): towers and banners stand back from it, lamps mark the corners of the square */
  for (const [x, y] of [[6, 8], [21, 8], [6, 23], [21, 23], [10, 23], [17, 23]]) putP(K.tower || 'tower', x, y, 0);
  for (const [x, y] of [[12, 17], [15, 17], [12, 14], [15, 14]]) putP(K.street, x, y, x < 13 ? 0 : 2);
  putP('banner', 11, 23, 0); putP('banner', 16, 23, 2);
  if (!H.practice) for (const r of ((S.fac || {})[H.raid] || {}).ruins || []) { if (S.day - r.d >= 10) continue; const b = H.blds.find((q) => q.type === r.t && !q.dead); if (b) { b.dead = true; b.looted = true; b.hp = 0; b.wasRuin = true; } }   /* still in ruins from the last raid */
  /* the people: guards on posts and patrols, workers going about their jobs, the leader by the hall */
  const yard = () => { for (let k = 0; k < 200; k++) { const x = rint(FX0 + 1, FX1 - 1), y = rint(FY0 + 1, F1 - 4); if (g[y][x] === 'y') return shWorld(x, y); } return shWorld(13, 17); };
  const mk0 = (t, w, ex) => { const zd = zombieTypes.raider || zombieTypes.walker, wpn = t === 'raiderG' ? 'rifle' : t === 'raiderB' ? 'bow' : t === 'worker' ? 'pipe' : ['bat', 'crowbar', 'machete'][H.zs.length % 3], TKc = (CAMP_PLAN[H.raid] || {}).tough || 1, hp = Math.round(zd.hp * (t === 'worker' ? .55 : 1.3 * TKc));
    H.zs.push({ type: 'raider', human: true, wpn, ranged: wpn === 'rifle' || wpn === 'bow', room: 'y', w, hp, max: hp, atk: zd.atk * (t === 'worker' ? .4 : 1.2 * TKc), spd: (zd.chase || .012) * 1.25, mode: 'patrol', stateTicks: 0, target: null, moving: false, phase: rnd() * 100, fk: H.raid, worker: t === 'worker', home: { ...w }, ...ex }); };
  mk0('raider', shWorld(12.7, 21.3), { post: true }); mk0(P.guards[1][0], shWorld(14.3, 21.3), { post: true });
  const hq = H.blds.find((b) => DEFS[b.type].role === 'hq'), arm = H.blds.find((b) => DEFS[b.type].role === 'gear');
  const hasBoss = !!(SH_DEFS[H.dest].areas[2].boss && hq);
  for (const b of [arm, hq].filter(Boolean)) { mk0(P.guards[0][0], shWorld(b.x + b.bw, b.y + b.bh), { post: true, keep: true }); if (b === hq && hasBoss) H.zs[H.zs.length - 1].esc = true; }
  let n = 0; for (const [t, k] of P.guards) for (let i = 0; i < k; i++) if (n++ >= (hasBoss ? 5 : 3)) mk0(t, yard(), {});   /* 3D.145 the bodyguards come out of the camp's own guards: two fewer on patrol, and the hall keeper is one of them */
  for (let i = 0; i < P.workers; i++) mk0('worker', yard(), H.night ? { asleep: true } : {});
  const D = SH_DEFS[H.dest], boss = D.areas[2].boss; if (boss && hq) H.zs.push({ type: 'raider', human: true, wpn: boss.wpn || null, ranged: boss.wpn === 'bow' || boss.wpn === 'rifle', leader: true, boss: true, name: boss.name, room: 'y', big: boss.big, w: shWorld(hq.x - 1, hq.y + hq.bh / 2), hp: Math.round(boss.hp * (P.tough || 1)), max: Math.round(boss.hp * (P.tough || 1)), atk: boss.atk * (P.tough || 1), spd: boss.spd, mode: 'patrol', post: true, keep: true, target: null, moving: false, fk: H.raid, home: shWorld(hq.x - 1, hq.y + hq.bh / 2) });
  if (boss && hq) for (const [i, [dx, dy]] of [[-2, 0], [-2, 1], [-2, 2]].entries()) { const x = hq.x + dx, y = hq.y + dy; if (g[y] && g[y][x] === 'y') { mk0(P.guards[i % 2][0], shWorld(x, y), { post: true, keep: true }); { const q = H.zs[H.zs.length - 1]; q.esc = true; q.hp = q.max = Math.round(q.max * .8); } } }   /* 3D.144 the leader's bodyguards */
}
function campDist(s, t) { if (!t.bld) return dist(s.w, t.w); const x0 = SH_AX + t.x, y0 = SH_AY + t.y, dx = Math.max(x0 - s.w.x, 0, s.w.x - (x0 + t.bw)), dy = Math.max(y0 - s.w.y, 0, s.w.y - (y0 + t.bh)); return Math.hypot(dx, dy); }
function campSpot(b, s) {   /* a free tile beside the building, spread out by who is going */
  const g = S.sh.grid, c = []; for (let y = b.y - 1; y <= b.y + b.bh; y++) for (let x = b.x - 1; x <= b.x + b.bw; x++) { if (x >= b.x && x < b.x + b.bw && y >= b.y && y < b.y + b.bh) continue; const v = g[y] && g[y][x]; if (v === 'y' || v === 'o' || v === 'G') c.push(shWorld(x, y)); }
  c.sort((a, q) => dist(a, s.w) - dist(q, s.w)); return c[S.sh.units.indexOf(s) % Math.max(1, Math.min(3, c.length))] || c[0] || b.w; }
function campAlarm(at, why) { const H = S.sh; if (!H || H.alarm) return; H.alarm = true; H.reinAt = H.t + 60 * ((CAMP_PLAN[H.raid] || {}).reinFirst || 50); H.reinN = 0; for (const z of H.zs) { z.asleep = false; z.joinAt = H.t + Math.round(60 * Math.max(0, dist(z.w, at) - 5) * 3.5); }   /* 3D.140 the camp is smaller: guards far from the shout take a while to arrive (3.5 s a tile past 5) instead of all landing at once */ SFX('alarm'); shFx(at, '❗ ' + (why || 'Spotted!'), '#ff6e62'); say(`${why || 'The squad was spotted'}: the whole camp is on alert!`);
  const hq = H.blds.find((b) => DEFS[b.type].role === 'hq' && !b.dead); for (const z of H.zs) if (z.hp > 0) { z.mode = 'idle'; if (z.worker) z.hide = hq ? campSpot(hq, H.units[0]) : z.home; } shPanel(); }
function campFall(b) { const H = S.sh; b.dead = true; b.hp = 0; SFX('hit'); if (b.fence) { shFx(b.w, '💥 A way through the fence', '#ffb060'); for (const q of H.units) if (q.order === b) q.order = null; shPanel(); return; } shFx(b.w, `💥 ${b.name} is down`, '#ffb060');
  if (b.pris) { H.found = (H.found || 0) + b.pris; shFx({ x: b.w.x, y: b.w.y + .6 }, `🔓 ${b.pris} prisoner${b.pris > 1 ? 's' : ''} freed`, '#7be08a'); b.looted = true; }
  else if (!Object.values(b.loot).some((n) => n > 0) && !b.items.length) b.looted = true; shPanel(); }
/* 3D.131 owner: a raid must not be overpowering. The squad carries home 10 resources a head (gear does not count): 40 for four, 80 for eight.
   A level-9 squad of eight used to walk out with about 150. What does not fit stays in the building. */
const CAMP_CARRY = 10, campBag = (H) => CAMP_CARRY * H.units.length, campBagLoad = (H) => Object.values(H.loot).reduce((a, n) => a + n, 0);
function campTake(b, s) { const H = S.sh; let room = campBag(H) - campBagLoad(H); const got = [];
  for (const [k, n] of Object.entries(b.loot)) { const t = Math.min(n, room); if (t > 0) { H.loot[k] = (H.loot[k] || 0) + t; b.loot[k] = n - t; room -= t; got.push((RES_ICON[k] || k) + ' +' + t); } }
  (H.items ||= []).push(...b.items); got.push(...b.items.map((k) => '🎁 ' + ITEMS[k].name)); b.items = []; const left = Object.values(b.loot).some((n) => n > 0); b.looted = !left;
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
  if (!t) { let bd = st === 'hold' ? reach + .2 : w.ranged ? Math.max(reach, 3) : 3.2; for (const z of zs) { if (z.worker && !H.alarm) continue; const d0 = dist(s.w, z.w); if (!H.alarm && d0 > 1.6) continue;   /* 3D.130 while the camp has not seen them the squad holds its fire (the riflemen used to open up on the gate guards at once, so no raid was ever quiet); it still defends itself at arm's length and attacks whoever you point at */ if (d0 < bd) { bd = d0; t = z; } } }
  if (!t && s.order && s.order.bld) t = s.order;
  s.target = t;
  if (t) { const d0 = campDist(s, t); if (d0 > reach) { if (st === 'hold' && !s.order) { s.mode = 'free'; s.moving = false; return; } s.mode = 'chase'; if (t.bld) { if (!s.spotFor || s.spotFor !== t) { s.spotFor = t; s.spotAt = campSpot(t, s); } if (!w.ranged || d0 > reach) shGo(s, s.spotAt, .022, 'u'); } else shGo(s, t.w, .02, 'u'); } else { s.mode = 'attack'; s.stateTicks = 14; s.moving = false; s.faceW = { ...t.w }; } return; }
  s.mode = 'free'; s.moving = false; }
function campEnemyAI(z, live) {
  const H = S.sh; if (z.stuckT > H.t) { z.moving = false; return; }
  if (!H.alarm && z.asleep) { z.moving = false; z.mode = 'patrol'; if (live.some((s) => dist(s.w, z.w) < 1.2)) campAlarm(z.w, 'A sleeper woke and shouted'); return; }   /* 3D.128 night: the workers sleep; only stepping on one wakes it */
  if (!H.alarm) { const sp = live.find((s) => dist(s.w, z.w) < (z.worker ? 3 : z.post ? 4.2 : 4.5) * (H.night ? .6 : 1)); if (sp) { campAlarm(z.w, z.worker ? 'A worker raised the alarm' : `${z.leader ? z.name : 'A guard'} spotted the squad`); return; }
    if (z.post) { z.moving = false; z.mode = 'patrol'; return; }
    if (!z.dest || (z.waitT = (z.waitT || 0) - 1) === 0) { const bs = H.blds.filter((b) => !b.dead); const b = bs[Math.floor(rnd() * bs.length)]; z.dest = z.worker && b ? campSpot(b, z) : (() => { for (let k = 0; k < 30; k++) { const x = rint(6, 21), y = rint(8, 23); if (H.grid[y][x] === 'y') return shWorld(x, y); } return z.home; })(); }
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
  if (!H || !H.alarm || !H.reinAt || H.t < H.reinAt || H.back) return; const P = CAMP_PLAN[H.raid] || {}, TK = P.tough || 1, n = (P.reinN0 || 2) + H.reinN, zd = zombieTypes.raider || zombieTypes.walker; H.reinN++; H.reinAt = H.reinN < (P.reinMax || 3) ? H.t + 60 * (P.reinEvery || 60) : 0;
  for (let i = 0; i < n; i++) { const wpn = i % 3 === 2 ? 'rifle' : ['bat', 'crowbar', 'machete'][i % 3], hp = Math.round(zd.hp * 1.3 * TK), w = shWorld(12 + (i % 4), 26.4 + Math.floor(i / 4) * .6);
    H.zs.push({ type: 'raider', human: true, wpn, ranged: wpn === 'rifle', room: 'y', w, hp, max: hp, atk: zd.atk * 1.2 * TK, spd: (zd.chase || .012) * 1.25, mode: 'idle', stateTicks: 0, target: null, moving: false, phase: rnd() * 100, fk: H.raid, home: { ...w }, rein: true }); }
  SFX('alarm'); shFx(shWorld(13.5, 25.5), `❗ ${n} more at the gate`, '#ff6e62'); say(`A patrol is back: ${n} more ${H.raid === 'toll' ? 'Toll Kings' : 'of them'} at the gate` + (H.reinAt ? ` (patrol ${H.reinN} of ${P.reinMax || 3}).` : '. That was the last patrol.')); shPanel(); }
/* the practice page (owner: "a test page in the game for that function"): try any stronghold or camp with a ready-made squad;
   nothing is lost or gained, and the town waits. Open it from Town > Defense, or with ?shtest=1. */
function showShPractice() {
  endBuildMode(true); const maps = Object.keys(SH_DEFS); expSel.pr = expSel.pr || { map: 'clinic', n: 6, goal: 'loot', lv: 6, night: false }; const P = expSel.pr;
  $('ib').innerHTML = `<div class="card"><b>🎯 Stronghold practice</b><div class="sm">Try every control with a ready-made squad. Nothing is lost or gained, and the town waits while you play.</div></div>
    <div class="sm">Map</div><div class="row" style="flex-wrap:wrap;gap:6px">${maps.map((k) => `<button class="vehB ${P.map === k ? 'on' : ''}" data-pm="${k}">${(EXP_DEFS[k] || {}).icon || (SH_DEFS[k].raid ? '⚔' : '🏚')} ${esc((EXP_DEFS[k] || {}).name || k)}<small>${SH_DEFS[k].raid ? 'faction camp' : 'rec. ' + SH_DEFS[k].rec}</small></button>`).join('')}</div>
    ${('')}
    <div class="sm">Squad size</div><div class="row" style="gap:6px">${[4, 5, 6, 7, 8].map((n) => `<button class="vehB ${P.n === n ? 'on' : ''}" data-pn="${n}">${n}</button>`).join('')}</div>
    <div class="sm">Squad level</div><div class="row" style="gap:6px">${[3, 6, 9, 12].map((n) => `<button class="vehB ${P.lv === n ? 'on' : ''}" data-pl="${n}">Lv ${n}</button>`).join('')}</div>
    ${SH_DEFS[P.map].raid ? `<div class="sm">Time (faction camps)</div><div class="row" style="gap:6px"><button class="vehB ${P.night ? '' : 'on'}" data-pt="0">☀️ Day</button><button class="vehB ${P.night ? 'on' : ''}" data-pt="1">🌙 Night<small>guards see less, workers sleep</small></button></div>` : ''}
    <button class="act go" id="prGo" style="margin-top:10px">Start practice</button>
    <div class="sm" style="margin-top:8px"><b>Controls:</b> drag to look around, pinch or scroll to zoom. Tap a survivor (or 👥 All) to take control. Then tap the floor to move, an enemy to attack, a door to open or shut it. A 🔒 locked door: tap it and someone forces the lock (Mechanics, Scavengers and Engineers are quicker), or blow it open with a 💣. You can't see into a room until its door opens: it may hold supplies, nothing, or a nest. <b>Faction camps:</b> tap a building to send the squad at it; once it's down, tap it again to loot it. Stay unseen as long as you can: once the alarm goes up, the patrols come for you (the armoury and hall guards stay at their posts), and a bigger patrol arrives at the gate every half minute, so take what you came for and get out. Until they see you the squad holds its fire. At night the guards see and hear less far and the workers sleep. 🏃 Get out leaves through the gate with what you took. The fence can be broken (tap a section, or bomb it) to make your own way in, but guards close by will hear it. The selected survivor's stance, ability and ✦ critical show above the bottom bar.</div>`;
  $('ib').querySelectorAll('[data-pm]').forEach((b) => { b.onclick = () => { P.map = b.dataset.pm; showShPractice(); }; }); $('ib').querySelectorAll('[data-pg]').forEach((b) => { b.onclick = () => { P.goal = b.dataset.pg; showShPractice(); }; });
  $('ib').querySelectorAll('[data-pt]').forEach((b) => { b.onclick = () => { P.night = b.dataset.pt === '1'; showShPractice(); }; }); $('ib').querySelectorAll('[data-pn]').forEach((b) => { b.onclick = () => { P.n = +b.dataset.pn; showShPractice(); }; }); $('ib').querySelectorAll('[data-pl]').forEach((b) => { b.onclick = () => { P.lv = +b.dataset.pl; showShPractice(); }; });
  $('prGo').onclick = () => { if (S.sh) { say('A squad is already inside.'); return; } const jobs = ['Guard', 'Police Officer', 'Medic', 'Scavenger', 'Mechanic', 'Engineer', 'Guard', 'Police Officer'], wp = ['machete', 'rifle', 'pistol', 'crossbow', 'sledge', 'shotgun', 'katana', 'rifle'], ar = P.lv >= 9 ? 'kevlar' : P.lv >= 6 ? 'leather' : null;
    const sq = []; for (let i = 0; i < P.n; i++) { const q = mk(FIRST_NAMES[(i * 7 + 3) % FIRST_NAMES.length], jobs[i], P.lv, 0, 0, i); q.eq = { weapon: ITEMS[wp[i]] ? wp[i] : 'bat', armor: ar && ITEMS[ar] ? ar : null, head: null, acc: null }; setMaxHp(q); q.hp = q.max; q.ammo = 99; q.id = 80000 + i; sq.push(q); }
    S.sv.push(...sq); const r = startStronghold(P.map, sq.map((q) => q.id), { practice: true, goal: P.goal, night: !!P.night }); S.sv = S.sv.filter((q) => !sq.includes(q)); if (!r.ok) { say(r.why); return; } closeP(); };
  showPanel('Stronghold practice');
}
