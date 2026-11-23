/* ---- 3D.276 Strongholds chat (owner, 22 Nov: "you will run and make all the maps and rooms and props"; plan in docs/project/15-STRONGHOLDS.md).
   Every stronghold gets a plan of its own, made for the town's level (a level 5 town meets a small place, a level 15 town a big one):
   its own rooms and doors, the names, what sleeps where, the things in it you can use (B3), the floor hazards (B4), dark rooms (B5),
   waves (B6), the boss's pattern (B7), and its goals (B2). A plan is plain data kept in S.sh.plan; the code reads the plan, not fixed rooms.
   Rooms are a tile apart; a door fills the gap. Grid units are tiles. ---- */
function shNewPlan(W, Hh, o = {}) { return { deco: [], W, H: Hh, rooms: {}, doors: [], names: {}, floor: {}, route: [], locked: [], lockName: {}, spawn: {}, things: [], zones: [], dark: {}, tasks: [], waves: [], spots: {}, start: null, exit: null, startRoom: null, mystT: ['walker', 'walker'], ...o }; }
function shRoom(P, id, x, y, w, h, name, col) { if (x < 0 || y < 0 || x + w > P.W || y + h > P.H) throw new Error(`room ${id} is off the map`); P.rooms[id] = [x, y, w, h]; if (name) P.names[id] = name; if (col) P.floor[id] = col; return id; }
/* a door between two rooms one tile apart, centred on the side they share (or at 'at' along it); n tiles wide */
function shLink(P, a, b, locked, at, n0) { const [ax, ay, aw, ah] = P.rooms[a], [bx, by, bw, bh] = P.rooms[b]; let d = null;
  if (ax + aw + 1 === bx || bx + bw + 1 === ax) { const x = ax + aw + 1 === bx ? ax + aw : bx + bw, y0 = Math.max(ay, by), y1 = Math.min(ay + ah, by + bh); if (y1 - y0 < 1) throw new Error(`rooms ${a} and ${b} share no side`); const n = Math.min(n0 || 2, y1 - y0), y = at != null ? Math.max(y0, Math.min(y1 - n, at)) : Math.floor((y0 + y1 - n) / 2); d = [a, b, x, y, 1, n]; }
  else if (ay + ah + 1 === by || by + bh + 1 === ay) { const y = ay + ah + 1 === by ? ay + ah : by + bh, x0 = Math.max(ax, bx), x1 = Math.min(ax + aw, bx + bw); if (x1 - x0 < 1) throw new Error(`rooms ${a} and ${b} share no side`); const n = Math.min(n0 || 2, x1 - x0), x = at != null ? Math.max(x0, Math.min(x1 - n, at)) : Math.floor((x0 + x1 - n) / 2); d = [a, b, x, y, n, 1]; }
  else throw new Error(`rooms ${a} and ${b} are not one tile apart`);
  if (locked) d.push(1); P.doors.push(d); return P.doors.length - 1; }
const shMid = (P, r) => { const [x, y, w, h] = P.rooms[r]; return { x: x + w / 2 - .5, y: y + h / 2 - .5 }; };
/* a thing in a room: k = what it is (drawn by the 3D view), use = a job a survivor does there (seconds), carry = it is picked up and taken out */
function shThing(P, k, x, y, o = {}) { const t = { k, x, y, ...o }; t.room = t.room || Object.keys(P.rooms).find((r) => { const [rx, ry, rw, rh] = P.rooms[r]; return x >= rx && x < rx + rw && y >= ry && y < ry + rh; }) || null; P.things.push(t); return t; }
const shDeco = (P, k, x, y, o = {}) => { P.deco.push({ k, x, y, ...o }); };   /* 3D.311 set dressing: drawn, never in the way, nothing to do with the fight */
const shLvSize = (lv, a, b, every) => Math.max(a, Math.min(b, a + Math.floor(Math.max(0, lv - 1) / every)));   /* how big a place is at this level */

/* the plans of the first maps (the Clinic, the Prison) have their own builders below; maps not redone yet use their old layout, made into a plan */
function shLegacyPlan(dest) { const k = SH_LAYOF[dest] || 'hall', L = SH_LAY[k], D = SH_DEFS[dest], A = D.areas, P = shNewPlan(SH_GW, SH_GH);
  P.rooms = JSON.parse(JSON.stringify(L.rooms)); P.doors = JSON.parse(JSON.stringify(L.doors));
  P.names = { R0: A[0].name, R1: A[1].name, B: A[2].name, S: D.side, A: (D.wings || [])[0], C: (D.wings || [])[1] }; P.lockName = { ...SH_LROOM }; P.locked = Object.keys(SH_LROOM);
  P.floor = { R0: D.floor[0], S: D.floor[0], R1: D.floor[1], A: D.floor[1], C: D.floor[1], B: D.floor[2], L1: D.floor[1], L2: D.floor[0], L3: D.floor[1], L4: D.floor[2] };
  P.route = ['R0', 'R1', 'wing', 'B']; P.startRoom = 'R0'; P.bossRoom = 'B'; P.mystT = [A[0].spawn[0][0], (A[1].spawn[1] || A[1].spawn[0])[0]];
  const half = (list, k2) => list.map(([t, c]) => [t, Math.max(k2 ? 0 : 1, k2 ? Math.floor(c / 2) : Math.ceil(c / 2))]).filter(([, c]) => c > 0);
  P.spawn = { R0: A[0].spawn, R1: half(A[1].spawn, 0), A: half(A[1].spawn, 1).concat([[A[1].spawn[0][0], 2]]), C: half(A[1].spawn, 1), B: A[2].spawn };
  P.boss = A[2].boss ? { room: 'B', ...A[2].boss } : null; P.start = { x: 1, y: 8.5 }; P.exit = { x: .6, y: 10.5 };
  P.tasks = [{ k: 'boss', label: `Kill ${(A[2].boss || {}).name || 'the boss'}` }]; return P; }

/* ---- the Overrun Clinic (the first stronghold, the teaching map). One long corridor with wards off both sides, the operating theatre at the end.
   House rule: patients asleep in their beds get up when someone walks past them, or when a gun goes off near them. Quiet weapons are safer.
   Side goal: the pharmacy locker. Size: 2 wards a side at level 3, one more every 4 levels (6 a side at level 20). ---- */
function shPlanClinic(lv) { const n = shLvSize(lv, 2, 6, 4), L = n * 7 - 1, W = 9 + L + 1 + 11, P = shNewPlan(W, 22, { theme: 'clinic' });
  shRoom(P, 'lobby', 0, 6, 8, 7, 'The Lobby', '#cfd6d2'); shRoom(P, 'pharm', 1, 0, 6, 5, 'The Pharmacy', '#d9d4c4'); shRoom(P, 'hall', 9, 8, L, 3, 'The Corridor', '#d9d4c4');
  shRoom(P, 'theatre', 9 + L + 1, 4, 10, 11, 'The Operating Theatre', '#c9d3d6');
  shLink(P, 'lobby', 'hall'); shLink(P, 'lobby', 'pharm', true); shLink(P, 'hall', 'theatre');
  /* 3D.309 (owner, 22 Nov: "too linear, too few zombies"): a second way round, behind the south wards: the waiting room (a crowd), the service corridor, the scrub room, the theatre's back door */
  shRoom(P, 'wait', 0, 14, 8, 7, 'The Waiting Room', '#d6d0c6'); shRoom(P, 'service', 9, 19, L, 2, 'The Service Corridor', '#c4c8c4'); shRoom(P, 'scrub', 9 + L + 1, 16, 10, 5, 'The Scrub Room', '#cdd6d8');
  shLink(P, 'lobby', 'wait'); shLink(P, 'wait', 'service'); shLink(P, 'service', 'scrub'); shLink(P, 'scrub', 'theatre');
  P.spawn.wait = [['walker', 10 + (lv > 8 ? 4 : 0)], ['runner', 2]]; P.spawn.service = [['walker', 2], ['runner', 1]]; P.spawn.scrub = [['walker', 2 + (lv > 10 ? 1 : 0)]];
  P.weak = [.55, .7];   /* about twice the dead of 3D.277, each with 55% of the health and 70% of the hit (the owner's trade for hordes, W54); the Butcher keeps his */
  P.hear = 7;           /* a gunshot wakes the dead within 7 tiles, through walls: they come to the squad */
  P.spawn.lobby = [['walker', 5 + (lv > 6 ? 1 : 0)], ['runner', lv > 8 ? 1 : 0]].filter((q) => q[1]); P.spawn.hall = [['walker', 4 + n], ['runner', 2 + (lv > 10 ? 1 : 0)]];
  for (let i = 0; i < n; i++) for (const up of [1, 0]) { const id = `w${up ? 'n' : 's'}${i}`, x = 9 + i * 7, y = up ? 1 : 12, locked = (i + up) % 3 === 2;
    shRoom(P, id, x, y, 6, 6, `Ward ${i * 2 + (up ? 1 : 2)}`, i % 2 ? '#d4dcd8' : '#dfe4e0'); shLink(P, id, 'hall', locked, x + 2); if (!up && !locked && i % 2 === 0) shLink(P, id, 'service', false, x + 2);   /* 3D.309 some south wards open onto the service corridor */
    if (locked) { P.locked.push(id); P.lockName[id] = `a locked ward (Ward ${i * 2 + (up ? 1 : 2)})`; }
    /* two rows of beds; about half the beds hold a patient who will get up */
    for (const by of up ? [y + 1, y + 4] : [y + 1, y + 4]) for (const bx of [x + 1, x + 4]) { const t = shThing(P, 'bed', bx, by, { r: 0 }); if (!locked && ((bx + by + i + lv) % 5 < 3 + (lv > 9 ? 1 : 0))) t.sleeper = lv > 12 && (bx + by) % 3 === 0 ? 'runner' : 'walker'; }
    shDeco(P, 'curtain', x + 2.5, y + 1.1); shDeco(P, 'curtain', x + 2.5, y + 4.1, { col: i % 2 ? '#a9c9e0' : '#9fd0bd' }); for (const [ix, iy] of [[x + .45, y + .55], [x + 3.45, y + 3.55]]) shDeco(P, 'iv', ix, iy); shDeco(P, up ? 'cabinet' : 'trolley', x + 5.2, up ? y + .1 : y + 5.4); if ((i + up) % 2) shDeco(P, 'blood', x + 2.6, y + 2.8, { s: .8 });
    if (!locked) P.spawn[id] = [['walker', 2 + (i % 2)], ...(lv > 7 && i % 3 === 1 ? [['spitter', 1]] : []), ...(lv > 5 && i % 4 === 3 ? [['bloated', 1]] : [])]; }
  shThing(P, 'locker', 2, 1, { use: 6, label: 'Empty the pharmacy locker', icon: '💊', loot: { meds: 3 + Math.floor(lv / 5), cloth: 2 }, task: 'locker' });
  P.spawn.pharm = [['walker', 1]];
  P.spawn.theatre = [['walker', 4 + Math.floor(lv / 6)]]; P.boss = { room: 'theatre', type: 'brute', name: 'The Butcher of Ward 3', hp: 680, atk: 12, big: 1.6, spd: .011, pat: 'slam' };
  P.route = ['lobby', 'hall', 'theatre']; P.startRoom = 'lobby'; P.bossRoom = 'theatre'; P.start = { x: 1, y: 8.2 }; P.exit = { x: .6, y: 9.5 }; P.mystT = ['walker', 'runner'];
  P.who = { room: P.locked[P.locked.length - 1], by: 'hall', flag: 'doctor', name: 'Dr. Ines', job: 'Medic' };   /* 3D.304 she bolted the theatre herself */
  P.tasks = [{ k: 'boss', label: 'Kill the Butcher of Ward 3' }, { k: 'use', id: 'locker', opt: true, label: 'Side: empty the pharmacy locker' }];
  /* 3D.311 it should look like a hospital: tiled floors with the coloured lines to follow, a green band round the walls, a reception, rows of waiting chairs, curtains and drips by the beds, trolleys left in the corridor, an operating table under its lamp, and the ambulance that never left */
  const tx = 9 + L + 1; P.noEdgeProps = true; /* 3D.313 (owner: "take reference from internet on hospitals, the hospital floor is a bit off, the outside ground is just green"). Real hospital floors are sheet vinyl: one soft colour for the corridors,
     a darker border strip inside the walls, a bright line to follow, another colour where you enter a different area, a darker plain floor in theatre; waiting areas often wood-look. No chequerboard. */
  Object.assign(P.floor, { lobby: '#dde4e6', hall: '#dde4e6', pharm: '#dde4e6', wait: '#cfae80', theatre: '#86adb0', scrub: '#a3c3c4', service: '#bdbfba' }); for (const k of Object.keys(P.rooms)) if (/^w[ns]\d/.test(k)) P.floor[k] = '#d6e5e0';
  P.look = { noYard: 1, plain: 1, cap: '#c9d6d0', dado: '#7fb7a3', dadoH: .3, door: '#9cc7b6', lockDoor: '#b0564a', border: { lobby: { col: '#8fb5ad' }, hall: { col: '#8fb5ad' }, pharm: { col: '#8fb5ad' }, theatre: { col: '#4f7f86', w: .3 }, scrub: { col: '#4f7f86' }, wait: { col: '#8a6a44' } }, planks: { wait: '#b8935f' },
    lines: [{ room: 'hall', col: '#c9412e', at: .3 }, { room: 'hall', col: '#3c78c9', at: .7 }, { room: 'service', col: '#e0b23a', at: .5 }], pads: [{ x: 9 + L - .5, y: 8, w: .5, h: 3, col: '#c9412e' }] };
  P.look.ground = [{ x: -3, y: -3, w: W + 6, h: 28, k: 'paving' }, { x: -9, y: 5, w: 8, h: 10, k: 'asphalt' }, { x: -14, y: -22, w: 5, h: 64, k: 'asphalt' }, { x: W + 2, y: 6, w: 8, h: 8, k: 'paving' }]; P.look.clear = [{ x: -16, y: -22, w: 9, h: 64 }];
  for (let i = 0; i < n; i++) { const dx = 9 + i * 7 + 2, wc = ['#5aa39a', '#d08a4a', '#7a78b8'][i % 3]; P.look.pads.push({ x: dx, y: 8, w: 2, h: .45, col: wc }, { x: dx, y: 10.55, w: 2, h: .45, col: wc }); }
  shDeco(P, 'road', -12, 10, { r: 1, len: 44 }); shDeco(P, 'pad', -9.2, 9.5, { w: 1.6, h: 3, col: '#5a5d61' }); shDeco(P, 'canopy', -2.4, 9.3); shDeco(P, 'bollard', -8.6, 6.2, { n: 4 }); shDeco(P, 'car', -6.6, 6.3, { col: '#b0564a', r: 1 }); shDeco(P, 'car', -5.4, 13.2, { col: '#7a8fa3', r: 1 }); shDeco(P, 'car', -11.6, 16, { col: '#d9c36a', r: 1.3, wreck: 1 }); shDeco(P, 'car', -12.6, 3, { col: '#8a9499', r: 1 });
  for (const ly of [2, 17]) { shDeco(P, 'lamp', -9.4, ly); } shDeco(P, 'lamp', -2.2, 14.6, { r: 2 }); for (let hx = 2; hx < W - 2; hx += 8) shDeco(P, 'hedge', hx + 1.5, -2.6, { n: 4 }); shDeco(P, 'hedge', -2.6, 1.5, { n: 4, r: 1 }); shDeco(P, 'hedge', -2.6, 18.5, { n: 5, r: 1 });
  shDeco(P, 'helipad', W + 5.5, 9.5); shDeco(P, 'lamp', W + 2.4, 5.4, { r: 2 });

  shDeco(P, 'pad', -5, 9.5, { w: 7, h: 9, bays: 3, col: '#5f6266' }); shDeco(P, 'ambulance', -4.6, 9.2, { r: 0 }); shDeco(P, 'cross', -1.4, 5.2); shDeco(P, 'gurney', -2.2, 11.6, { blood: 1 }); shDeco(P, 'blood', -2.4, 10.4); shDeco(P, 'wheelchair', -1.6, 7.4);
  shDeco(P, 'reception', 4.6, 6.6); shDeco(P, 'chairs', 2.2, 12.3, { n: 4, r: 2 }); shDeco(P, 'chairs', 5.6, 12.3, { n: 4, r: 2 }); shDeco(P, 'plant', 7.2, 6.2); shDeco(P, 'plant', .1, 6.2); shDeco(P, 'vending', 7.2, 11.2, { r: 3 }); shDeco(P, 'papers', 3.5, 9.5); shDeco(P, 'wheelchair', 6.2, 9.8, { r: 1 }); shDeco(P, 'smear', 5, 10.4, { len: 5 });
  for (const wy of [15.4, 17.2, 19]) { shDeco(P, 'chairs', 2, wy, { n: 4, col: '#b07a4a' }); shDeco(P, 'chairs', 5.4, wy, { n: 4, col: '#b07a4a' }); } shDeco(P, 'tv', 3.7, 14.05); shDeco(P, 'table', 3.7, 20.2); shDeco(P, 'plant', .1, 14.2); shDeco(P, 'bin', 7.3, 14.3); shDeco(P, 'papers', 4, 16.3); shDeco(P, 'blood', 6, 18.2, { s: .9 });
  shDeco(P, 'pills', 3.6, .05); shDeco(P, 'pills', 5.6, .05); shDeco(P, 'counter', 3.5, 3.4, { n: 2 }); shDeco(P, 'papers', 5, 2);
  for (let gx = 12; gx < 9 + L - 2; gx += 6) { shDeco(P, 'gurney', gx, gx % 12 ? 8.1 : 9.9, { blood: gx % 4 === 0 }); shDeco(P, 'chairs', gx + 3, 8.02, { n: 3 }); } shDeco(P, 'wheelchair', 9 + L - 3, 9.6, { r: 2 }); shDeco(P, 'smear', 9 + L - 5, 9, { len: 6 }); shDeco(P, 'bin', 10, 10.2); shDeco(P, 'papers', 14, 9.2);
  shDeco(P, 'optable', tx + 3.6, 9); shDeco(P, 'trolley', tx + 2.2, 7.6); shDeco(P, 'iv', tx + 5, 8); shDeco(P, 'lightbox', tx + 3, 4.0); shDeco(P, 'lightbox', tx + 6, 4.0); shDeco(P, 'cabinet', tx + 9, 4.2); shDeco(P, 'screen', tx + 1.2, 12.8); shDeco(P, 'blood', tx + 4.4, 10.6, { s: 1.5 }); shDeco(P, 'smear', tx + 6, 11.5, { len: 4, r: 1 }); shDeco(P, 'bin', tx + .3, 4.3, { col: '#c9412e' });
  for (const sx of [1.6, 4.6, 7.6]) shDeco(P, 'sink', tx + sx, 16.0); shDeco(P, 'cabinet', tx + 9.2, 18, { r: 3 }); shDeco(P, 'trolley', tx + 2, 19.6, { linen: 1 }); shDeco(P, 'bin', tx + 5, 20.2, { col: '#c9412e' });
  for (let gx = 11; gx < 9 + L - 1; gx += 5) shDeco(P, gx % 2 ? 'trolley' : 'bin', gx, 20.2, { linen: 1, col: '#8a9499' }); shDeco(P, 'gurney', 9 + L - 4, 19.1);
  P.tip = 'Patients sleep in some of the beds. They get up when someone walks past. A gunshot wakes every one of the dead near it, through the walls, and they come: quiet weapons are safer. There are two ways to the theatre: the corridor past the wards, or round the back through the waiting room.';
  return P; }

/* which plan a place uses */
const SH_PLANS = { clinic: shPlanClinic };
function shMakePlan(dest, lv) { const f = SH_PLANS[dest]; const P = f ? f(lv) : shLegacyPlan(dest); P.dest = dest; P.lv = lv; return P; }
/* the rooms a squad can open and where it starts and leaves */
const shPlanOf = () => (S.sh && S.sh.plan) || null;
function shSetPlan(P) { SH_LKEY = P; SH_ROOMS = P.rooms; SH_DOORS = P.doors; SHG = null; }
/* a plan is sound if every room can be reached from the start (doors open), the start and exit are on the floor, and the boss room exists */
function shPlanCheck(P) { const bad = [], g = []; for (let y = 0; y < P.H; y++) g.push(new Array(P.W).fill(null));
  for (const [k, [x0, y0, w, h]] of Object.entries(P.rooms)) for (let y = y0; y < y0 + h; y++) for (let x = x0; x < x0 + w; x++) { if (g[y][x]) bad.push(`rooms ${g[y][x]} and ${k} overlap`); g[y][x] = k; }
  for (const [a, b, x0, y0, w, h] of P.doors) for (let y = y0; y < y0 + h; y++) for (let x = x0; x < x0 + w; x++) { if (g[y] && g[y][x] && g[y][x][0] !== 'D') bad.push(`door ${a}-${b} sits on room ${g[y][x]}`); if (g[y]) g[y][x] = 'D'; }
  const s = P.start, seen = new Set(), q = [[Math.floor(s.x), Math.floor(s.y)]]; if (!g[q[0][1]] || !g[q[0][1]][q[0][0]]) bad.push('the start is not on the floor');
  while (q.length) { const [x, y] = q.pop(), key = x + ',' + y; if (seen.has(key) || !g[y] || !g[y][x]) continue; seen.add(key); q.push([x + 1, y], [x - 1, y], [x, y + 1], [x, y - 1]); }
  for (const [k, [x0, y0]] of Object.entries(P.rooms)) if (!seen.has(x0 + ',' + y0)) bad.push(`room ${k} cannot be reached`);
  if (P.bossRoom && !P.rooms[P.bossRoom]) bad.push('no boss room'); for (const t of P.things) if (!t.room) bad.push(`a ${t.k} stands outside every room`);
  for (const r of P.route) if (r !== 'wing' && !P.rooms[r]) bad.push(`the route names a room that is not there: ${r}`);
  return bad; }

/* ---- B2 goals and B3 things. A task: boss (kill it), use (a thing with that task done), all (every thing with that task done),
   carry (that many things with that task carried into the room the squad came in by), hold (see B6). Tasks with opt are side goals. ---- */
function shTaskState(H, T) { const ts = (H.things || []).filter((t) => t.task === T.id);
  if (T.k === 'boss') return { done: !!H.bossDown, n: H.bossDown ? 1 : 0, need: 1 };
  if (T.k === 'use' || T.k === 'all') { const n = ts.filter((t) => t.done).length, need = T.need || ts.length || 1; return { done: n >= need, n, need }; }
  if (T.k === 'carry') { const n = ts.filter((t) => t.delivered).length, need = T.need || ts.length || 1; return { done: n >= need, n, need }; }
  if (T.k === 'hold') { const h = H.hold || {}, need = T.secs || 60; return { done: (h.p || 0) >= need, n: Math.floor(h.p || 0), need }; }
  if (T.k === 'flag') { const n = ts.filter((t) => t[T.flag]).length, need = T.need || ts.length || 1; return { done: n >= need, n, need }; }
  if (T.k === 'clock') return { done: false, n: 0, need: 1 };
  return { done: false, n: 0, need: 1 }; }
function shTaskTick(H, live) {
  for (const s of H.units) { if (s.carry == null) continue; const t = H.things[s.carry]; if (!t) { s.carry = null; continue; }
    if (s.hp <= 0) { const c = shCell(s.w); t.x = c.x; t.y = c.y; t.carried = null; s.carry = null; shFx(s.w, `📦 ${t.label || 'It'} is dropped`, '#ff8a7a'); continue; }
    if (t.toSpot && dist(s.w, shWorld(t.toSpot.x, t.toSpot.y)) < 1.1) { t.delivered = true; t.done = true; t.carried = null; s.carry = null; if (t.fx) shThingFx(t, s); shPanel(); continue; }   /* 3D.283 something pushed to a place (the ram to the gate) */
    if (!t.toSpot && shRoomAt(s.w) === H.plan.startRoom) { t.delivered = true; t.carried = null; s.carry = null; const c = shCell(s.w); t.x = c.x; t.y = c.y; shFx(s.w, `✅ ${t.label || 'It'} is out`, '#7be08a'); SFX('reward'); shPanel(); } }
  if (H.plan.tick) H.plan.tick(H, live); if (H.lure && H.t > H.lure.until) { H.lure = null; for (const z of H.zs) z.lured = false; }
  if (H.hold) shHoldTick(H, live); if (H.zones && H.zones.length) shBelts(H, live); if (H.plan.waves && H.plan.waves.length) shWaveTick(H); if (H.zones && H.zones.length && H.t % 30 === 0) shZoneHurt(H, live);
  if (H.goalDone || H.phase === 'done') return; const main = (H.tasks || []).filter((T) => !T.opt);
  for (const T of H.tasks || []) { const st = shTaskState(H, T); if (st.done && !T.done) { T.done = true; if (T.opt) { banner(`✓ ${T.label.replace(/^Side: /, '')}`); SFX('reward'); } shPanel(); } }
  if (main.length && main.every((T) => T.done)) shGoalDone(); }
function shThingSpot(t) { return shWorld(t.x, t.y); }
function shUseAI(s) { const H = S.sh; if (s.use == null) return false; const t = H.things[s.use]; if (!t || t.done || t.carried != null || t.delivered || !shThingReady(t)) { s.use = null; return false; }
  const at = shThingSpot(t); if (dist(s.w, at) > .95) { s.mode = 'walk'; s.target = null; if (!shGo(s, at, .024, 'u') && !s.path && dist(s.w, at) > .95) { s.use = null; say(`${s.name} can't get to the ${t.label || t.k}.`); } return true; }
  const foe = H.zs.find((z) => z.hp > 0 && !z.hid && !z.friend && z.mode !== 'sleep' && dist(z.w, s.w) < 1.4); if (foe) { s.target = foe; s.mode = 'attack'; s.stateTicks = 14; s.moving = false; s.faceW = { ...foe.w }; return true; }
  s.mode = 'fix'; s.moving = false; s.faceW = at; const fast = t.fast && t.fast.includes(s.job) ? 2 : 1; t.prog = (t.prog || 0) + fast / (60 * (t.use || 3));
  if (t.prog >= 1) { t.prog = 0; s.use = null; s.mode = 'free'; shThingDone(t, s); } return true; }
function shThingReady(t) { const H = S.sh; if (t.oneAtATime && H.hold && H.hold.on) return false; return !t.need || (H.things || []).filter((q) => q.task === t.need).every((q) => q.done); }
function shThingDone(t, s) { const H = S.sh; SFX('reward');
  if (t.carry) { s.carry = H.things.indexOf(t); t.carried = s.id; shFx(s.w, `📦 ${s.name} carries the ${t.label}`, '#ffe9b8'); say(`${s.name} has the ${t.label}. Get it back to ${H.plan.names[H.plan.startRoom] || 'the way in'}: they walk slowly and can't fight while they carry it.`); shPanel(); return; }
  t.done = true; for (const [k, n] of Object.entries(t.loot || {})) H.loot[k] = (H.loot[k] || 0) + n; if (t.items) (H.items ||= []).push(...t.items);
  const got = Object.entries(t.loot || {}).map(([k, n]) => (RES_ICON[k] || k) + ' +' + n); shFx(s.w, (t.doneText || `✓ ${t.label || t.k}`) + (got.length ? '  ' + got.join(' ') : ''), '#7be08a');
  if (t.fx) shThingFx(t, s); shPanel(); }
/* what a switch does when it is worked (each map names its own effects) */
const SH_FX = {};
function shThingFx(t, s) { const f = SH_FX[t.fx]; if (f) f(S.sh, t, s); }
/* the boss's pattern (B7): a tell, then the big move. slam: hits everyone round it. gun: a long burst at range. summon: calls its kind. charge: runs through */
function shBossPat(z, t, d0) { const H = S.sh; if (z.tellT) { z.moving = false; z.faceW = { ...t.w }; if (H.t < z.tellT) return true; z.tellT = 0; z.patT = H.t + (z.patGap || 420);
    if (z.pat === 'slam') { for (const s of H.units) if (s.hp > 0 && dist(s.w, z.w) < 1.9) { const dm = Math.max(1, Math.round(z.atk * 1.8 * (1 - dmgReduce(s)))); s.hp -= dm; s.hitT = 9; shFx(s.w, '-' + dm, '#ff6e62'); if (s.hp <= 0) { s.hp = 0; s.mode = 'down'; say(`${s.name} is down!`); } } shFx(z.w, '💥', '#ffb060'); SFX('hit'); (window.ZH_BOOMS ||= []).push({ x: z.w.x, y: z.w.y, r: 1.9, burn: false, t: performance.now() }); }
    else if (z.pat === 'gun') { z.burst = 6; z.burstT = H.t; }
    else if (z.pat === 'summon') { const zd = zombieTypes[z.kin || 'bloated'] || zombieTypes.walker; for (let i = 0; i < (z.kinN || 2); i++) { const w = { x: z.w.x + (i ? .8 : -.8), y: z.w.y + .5 }, c = shCell(w); if (shOpen(c.x, c.y, 'u') !== true) continue; H.zs.push({ type: z.kin || 'bloated', room: z.room, w, hp: zd.hp, max: zd.hp, atk: zd.atk, spd: (zd.chase || .012) * 1.25, mode: 'idle', stateTicks: 0, target: null, moving: false, phase: rnd() * 100 }); } shFx(z.w, '📣 It calls its own', '#ff6e62'); }
    else if (z.pat === 'charge') { z.chargeTo = { x: t.w.x + (t.w.x - z.w.x) * .4, y: t.w.y + (t.w.y - z.w.y) * .4 }; z.chargeT = H.t + 90; }
    return true; }
  if (z.burst > 0) { if ((H.t - z.burstT) % 12 === 0) { z.burst--; const dm = Math.max(1, Math.round(z.atk * .45 * (1 - dmgReduce(t)))); if (dist(z.w, t.w) < 7) { t.hp -= dm; t.hitT = 9; shFx(t.w, '-' + dm, '#ff6e62'); shots.push({ a: { ...z.w }, b: { ...t.w }, t: 6 }); SFX('shot'); if (t.hp <= 0) { t.hp = 0; t.mode = 'down'; say(`${t.name} is down!`); } } } z.moving = false; z.faceW = { ...t.w }; return true; }
  if (z.chargeT > H.t) { const done = shGo(z, z.chargeTo, z.spd * 3.2, 'z'); for (const s of H.units) if (s.hp > 0 && dist(s.w, z.w) < .7 && !s.chargedBy) { s.chargedBy = H.t; const dm = Math.round(z.atk * 1.4); s.hp -= dm; shFx(s.w, '-' + dm + ' knocked flat', '#ff6e62'); if (s.hp <= 0) { s.hp = 0; s.mode = 'down'; } } if (done) z.chargeT = 0; return true; } else for (const s of H.units) if (s.chargedBy && H.t - s.chargedBy > 60) s.chargedBy = 0;
  if (H.t >= (z.patT || 300) && d0 < (z.pat === 'gun' ? 6.5 : z.pat === 'charge' ? 6 : z.pat === 'summon' ? 8 : 2.6) && z.mode !== 'zattack') { z.tellT = H.t + (z.pat === 'gun' ? 70 : 55); shFx({ x: z.w.x, y: z.w.y - .5 }, { slam: '❗ It rears up', gun: '❗ The barrels spin up', summon: '❗ It bellows', charge: '❗ It lowers its head' }[z.pat] || '❗', '#ff6e62'); return true; }
  return false; }
/* B4 floor hazards and B6 holds and waves: filled in as the maps that use them arrive (their maps set them up) */
function shZoneAt(H, w) { const c = shCell(w); return (H.zones || []).find((q) => q.on !== false && c.x >= q.x && c.x < q.x + q.w && c.y >= q.y && c.y < q.y + q.h) || null; }
function shZoneSlow(o, who) { const H = S.sh; if (!H || !H.zones || !H.zones.length) return 1; const z = shZoneAt(H, o.w); if (!z) return 1; if (z.k === 'water') return who === 'z' && o.type === 'bloated' ? 1 : .55; if (z.k === 'ice') return .8; return 1; }
function shZoneHurt(H, live) { const warm = (H.things || []).filter((t) => t.warm && !t.out);
  for (const o of [...live, ...H.zs.filter((z) => z.hp > 0 && !z.human)]) { const z = shZoneAt(H, o.w); if (!z) continue; const isU = live.includes(o);
    let dm = 0; if (z.k === 'fire' && !(o.type === 'burnt')) dm = isU ? 3 : 4; else if (z.k === 'gas' && isU) dm = 2; else if (z.k === 'heat' && isU) dm = 2; else if (z.k === 'cold' && isU && !warm.some((t) => dist(shThingSpot(t), o.w) < (t.warm || 2.5))) dm = 1;
    if (!dm) continue; o.hp -= dm; o.hitT = 6; if (H.t % 120 === 0) shFx(o.w, { fire: '🔥', gas: '☁', heat: '♨', cold: '❄' }[z.k] + ' -' + dm, '#ffb060'); if (isU && o.hp <= 0) { o.hp = 0; o.mode = 'down'; say(`${o.name} is down!`); } } }
function shHoldTick(H, live) { const h = H.hold; if (!h.on) return; const t = H.things[h.thing]; const inside = live.filter((s) => dist(s.w, shThingSpot(t)) < (t.r || 2)); if (inside.length) { h.p = (h.p || 0) + 1 / 60; if (H.t % 60 === 0) shFx(shThingSpot(t), `⏳ ${Math.floor(h.p)} / ${t.secs || 60} s`, '#ffe9b8'); }
  if (h.seal != null && h.p >= (t.secs || 20)) { t.sealed = true; for (const z of H.zones) if (z.id === 'gas' + h.seal) z.on = false; shFx(shThingSpot(t), `✅ Tank ${h.seal + 1} sealed`, '#7be08a'); SFX('reward'); H.hold = null; shPanel(); } }   /* 3D.283 one tank's hold done */
function shWaveTick(H) { for (const wv of H.plan.waves) { if (wv.sent) continue; const due = wv.at != null ? H.t >= wv.at * 60 : wv.onHold ? H.hold && H.hold.on && (H.hold.p || 0) >= wv.onHold : false; if (!due) continue; wv.sent = true;
    const sp = H.plan.spots[wv.from] || H.plan.exit, TK = (SH_DEFS[H.dest].tough || 1) * (H.plan.tough || 1); for (const [ty, n] of wv.list) for (let i = 0; i < n; i++) { const zd = zombieTypes[ty] || zombieTypes.walker, w = shWorld(sp.x + (i % 3) * .5 - .5, sp.y + Math.floor(i / 3) * .5); H.zs.push({ type: ty, room: shRoomAt(w) || wv.from, w, hp: Math.round(zd.hp * TK), max: Math.round(zd.hp * TK), atk: zd.atk * TK, spd: (zd.chase || .012) * 1.25, mode: 'idle', stateTicks: 0, target: null, moving: false, phase: rnd() * 100, wave: true }); }
    shFx(shWorld(sp.x, sp.y), wv.say || `❗ ${wv.list.reduce((a, q) => a + q[1], 0)} more coming`, '#ff6e62'); if (wv.say) say(wv.say); SFX('alarm'); } }
/* things the squad brings home for the story and the cure (kept in S.keyItems until the Story tab and the Brewery are built, Features chat) */
const SH_KEYS = { feed_spring: { name: 'Wild cucumber seed (the cure: spring feed)' }, feed_summer: { name: 'The first Freshlock recipe (the cure: summer feed)' }, feed_autumn: { name: 'Old apple stock (the cure: autumn feed)' }, feed_winter: { name: 'Ice from the Frozen Depot (the cure: winter feed)' },
  proof1: { name: 'The army contract (proof 1)' }, proof2: { name: 'The Helix memo (proof 2)' }, proof3: { name: "Sunnyside's files (proof 3)" }, mixtape: { name: "Moth's Mixtape" }, salt: { name: 'Salt from the Larder (the cure, step 3)' }, glass: { name: 'Helix lab glass (the cure, step 4)' }, vat: { name: 'A Foundry steel brewing vat (the cure, step 7)' }, shepherd_tin: { name: "The Shepherd's tin (the cure, step 10)" }, old_brine: { name: 'The Old Brine' }, last_tank: { name: "The plant's last Freshlock tank (the cure, step 12)" }, ledger: { name: 'The Larder ledger (Recall Notice 11)' }, order9: { name: 'The standing order (Recall Notice 9)' }, memo7: { name: 'The Probably Fine Memo (Recall Notice 7)' }, shift5: { name: 'The cannery shift sheet (Recall Notice 5)' }, pell10: { name: "Gideon Pell's contract (Recall Notice 10)" } };

/* ---- 3D.278 Blackgate Prison. The outer yard, a cell block (a corridor with cells both sides), the control room up a stair, the motor pool,
   and the Warden's yard behind a heavy gate. House rule: the control room's lever opens every cell AND the gate at once: quick, but
   everything in the cells comes out together. Or leave the cells shut and blow the gate with a bomb. Riot zombies carry their shield
   to whoever they are fighting: hit them while they are busy with someone else. Size: 3 cells a side at level 3, one more every 3 levels (7 a side). ---- */
function shPlanPrison(lv) { const n = shLvSize(lv, 3, 7, 3), L = n * 4 - 1, W = 11 + L + 1 + 13, P = shNewPlan(W, 21, { theme: 'prison', wall: '#7d7f84' });
  shRoom(P, 'yard', 0, 5, 10, 11, 'The Outer Yard', '#a9a395'); shRoom(P, 'control', 1, 0, 8, 4, 'The Control Room', '#9a9a96'); shRoom(P, 'motor', 0, 17, 10, 4, 'The Motor Pool', '#8f8a7e');
  shRoom(P, 'block', 11, 9, L, 3, 'Cell Block C', '#9a9a96'); shRoom(P, 'warden', 11 + L + 1, 3, 12, 15, "The Warden's Yard", '#a9a395');
  shLink(P, 'yard', 'control'); shLink(P, 'yard', 'motor', true); shLink(P, 'yard', 'block'); const gate = shLink(P, 'block', 'warden', true); P.doors[gate][7] = 'heavy';
  for (let i = 0; i < n; i++) for (const up of [1, 0]) { const id = `cell${up ? 'n' : 's'}${i}`, x = 11 + i * 4; shRoom(P, id, x, up ? 5 : 13, 3, 3, null, '#8f8a7e'); shLink(P, id, 'block', true, x + 1, 1); P.locked.push(id); P.lockName[id] = `cell ${i * 2 + (up ? 1 : 2)}`;
    P.spawn[id] = [[(i + up + lv) % 3 === 0 ? 'riot' : 'walker', 1 + ((i + up) % 2)]]; }
  P.spawn.yard = [['walker', 3 + Math.floor(lv / 5)], ['runner', lv > 6 ? 1 : 0]].filter((q) => q[1]); P.spawn.control = [['riot', 1]]; P.spawn.block = [['walker', 2 + Math.floor(n / 3)], ['riot', 1]]; P.spawn.motor = [['walker', 2]];
  P.spawn.warden = [['riot', 1 + Math.floor(lv / 8)], ['walker', 3], ['brute', lv > 11 ? 1 : 0]].filter((q) => q[1]);
  P.boss = { room: 'warden', type: 'riot', name: 'The Warden', hp: 860, atk: 14, big: 1.55, spd: .012, pat: 'charge', patGap: 480 };
  shThing(P, 'desk', 3, 1); shThing(P, 'lever', 6, 1, { use: 4, fast: ['Mechanic', 'Engineer'], label: 'Open every cell', icon: '🔓', sub: "Every cell door and the Warden's gate open at once", fx: 'cells', task: 'cells' });
  shThing(P, 'van', 6, 18, { use: 6, fast: ['Mechanic'], label: 'Hot-wire the prison van', icon: '🚐', sub: 'Mechanics are quicker', loot: { fuel: 2, ammo: 6 }, task: 'van' });
  shThing(P, 'sign', 8, 6, { look: '#d9b233' });
  /* 3D.312 (owner, 23 Nov: "Prison doesn't look like prison at all"): bars on every cell, bunks and a toilet inside, the painted lines of the block, a wired fence with watchtowers, the exercise yard, the prison bus at the gate */
  const wx = 11 + L + 1; P.noEdgeProps = true; P.look = { noYard: 1, dado: '#4f5a66', dadoH: .34, door: '#4a5560', lockDoor: '#39424c', lines: [{ room: 'block', col: '#e0b23a', at: .14, w: .14 }, { room: 'block', col: '#e0b23a', at: .86, w: .14 }, { room: 'motor', col: '#e0b23a', at: .5 }] };
  for (let i = 0; i < n; i++) for (const up of [1, 0]) { const x = 11 + i * 4, fy = up ? 8 : 12; shDeco(P, 'bars', x, fy, { base: 0, h: 1.62 }); shDeco(P, 'bars', x + 2, fy, { base: 0, h: 1.62 }); (P.look.noWall = P.look.noWall || []).push([x, fy], [x + 2, fy]); shDeco(P, 'bunk', x + .9, up ? 5.05 : 15.0, { col: (i + up) % 3 ? '#d9772e' : '#8a8f96' }); shDeco(P, 'toilet', x + 2.2, up ? 7.1 : 13.0, { r: up ? 0 : 2 }); if ((i + up) % 2) shDeco(P, 'jumpsuit', x + .6, up ? 6.6 : 13.6, { a: i }); if ((i * 2 + up) % 5 === 0) shDeco(P, 'blood', x + 1.4, up ? 6.4 : 14, { s: .7 }); }
  for (let gx = 13; gx < 11 + L - 3; gx += 7) { shDeco(P, 'mtable', gx, 10, { tray: 1 }); shDeco(P, 'jumpsuit', gx + 2.5, 10.4, { a: gx }); } shDeco(P, 'barrier', 11 + L - 1.4, 10, { r: 1, n: 1 }); shDeco(P, 'smear', 11 + L - 4, 9.6, { len: 5 }); shDeco(P, 'shields', 11.4, 9.05, { n: 3 }); shDeco(P, 'blood', 16, 10.8);
  shDeco(P, 'court', 6.2, 8.2, { w: 5, h: 5.2 }); shDeco(P, 'hoop', 3.5, 8.2); shDeco(P, 'weights', 1.5, 13.6); shDeco(P, 'weights', 3.4, 14.4, { r: 1 }); shDeco(P, 'mtable', 6.5, 13.6); shDeco(P, 'mtable', 8.2, 5.6, { tray: 1 }); shDeco(P, 'spot', .1, 5.1); shDeco(P, 'spot', 9, 15.2); shDeco(P, 'jumpsuit', 4.6, 11.4, { a: 2 }); shDeco(P, 'blood', 5.5, 12.3); shDeco(P, 'cone', 2, 6);
  shDeco(P, 'console', 4.5, .05, { n: 2 }); shDeco(P, 'rack', 7.6, .0); shDeco(P, 'shields', 1.3, 2.9, { n: 3, r: 1 }); shDeco(P, 'papers', 4, 2.4);
  shDeco(P, 'bus', 2.4, 19.6, { col: '#8f979f' }); shDeco(P, 'tyres', 8.6, 17.3); shDeco(P, 'drums', 9, 20); shDeco(P, 'drums', .3, 17.2); shDeco(P, 'cone', 5.4, 17.4); shDeco(P, 'cone', 4.2, 20.2);
  shDeco(P, 'barrier', wx + 3, 9, { r: 1, n: 2 }); shDeco(P, 'barrier', wx + 3, 12.6, { r: 1, n: 1 }); shDeco(P, 'shields', wx + 10.6, 4, { n: 4, r: 3 }); shDeco(P, 'rack', wx + 6, 3.0); shDeco(P, 'mtable', wx + 9, 15.5, { col: '#4a5560' }); shDeco(P, 'drums', wx + 1, 16.6); shDeco(P, 'blood', wx + 6, 11, { s: 1.6 }); shDeco(P, 'smear', wx + 7, 8, { len: 5, r: 1 }); shDeco(P, 'jumpsuit', wx + 5, 13.5, { a: 1 }); shDeco(P, 'court', wx + 7.5, 10, { w: 4, h: 4, col: '#8d877a' });
  /* outside: the wire, the towers, the gate and the bus that brought the last of them */
  for (let fx = -3; fx < W + 3; fx += 6) shDeco(P, 'fence', fx + 2.5, -3.5, { n: 6 }); for (let fy = -3; fy < 21 + 2; fy += 6) { if (fy > 4 && fy < 13) continue; shDeco(P, 'fence', -4.5, fy + 2.5, { n: 6, r: 1 }); } shDeco(P, 'fence', -4.5, 4.5, { n: 2, r: 1 }); shDeco(P, 'fence', -4.5, 14, { n: 2, r: 1 });
  shDeco(P, 'wtower', -4.5, -3.5); shDeco(P, 'wtower', W + 2.5, -3.5); shDeco(P, 'wtower', -4.5, 23.5); shDeco(P, 'gatearch', -4.5, 9.3); P.look.ground = [{ x: -5, y: -4, w: W + 9, h: 28, k: 'gravel' }, { x: -24, y: 7, w: 20, h: 5, k: 'asphalt' }, { x: -12, y: 7, w: 9, h: 5, k: 'asphalt' }]; P.look.clear = [{ x: -24, y: 5, w: 20, h: 9 }]; shDeco(P, 'road', -17, 9.3, { len: 25 }); shDeco(P, 'pad', -7.5, 9.3, { w: 9, h: 4.4, col: '#5a5d61' }); shDeco(P, 'lamp', -6, 6.6); shDeco(P, 'lamp', -6, 12, { r: 0 }); shDeco(P, 'car', -14, 10.2, { col: '#33373c', wreck: 1, r: .2 }); shDeco(P, 'bus', -8.5, 9.6); shDeco(P, 'cone', -5.6, 7.6); shDeco(P, 'barrier', -6.4, 11.4, { n: 2 }); shDeco(P, 'blood', -2.6, 9.8); shDeco(P, 'jumpsuit', -2, 8.6, { a: 3 });
  P.route = ['yard', 'block', 'warden']; P.startRoom = 'yard'; P.bossRoom = 'warden'; P.start = { x: 1, y: 9 }; P.exit = { x: .6, y: 10 }; P.mystT = ['walker', 'riot'];
  P.tasks = [{ k: 'boss', label: 'Kill the Warden' }, { k: 'use', id: 'van', opt: true, label: 'Side: hot-wire the prison van' }]; P.botOrders = ['cells'];
  P.tip = "The Warden's gate is too heavy to force. The control room opens it, and every cell with it, or a bomb blows it. Riot zombies hold their shield to whoever they fight: hit them from the side.";
  return P; }
SH_PLANS.prison = shPlanPrison;
SH_FX.cells = (H) => { H.doors.forEach((d, i) => { const D = SH_DOORS[i]; if (D[7] === 'heavy' || /^cell/.test(D[0]) || /^cell/.test(D[1])) { d.open = true; d.locked = false; shReveal(D[0]); shReveal(D[1]); } });
  for (const z of H.zs) if (z.hp > 0 && /^cell/.test(z.room || '')) { z.mode = 'idle'; z.hid = false; } banner('🔓 EVERY CELL IS OPEN'); say('The cell doors grind open all at once, and the gate with them. Everything inside is coming out.'); SFX('alarm'); };

/* ---- 3D.281 the four seasonal strongholds (B4 floor hazards, B5 dark), each the home of one of the cure's season feeds (13-LONG-GAME.md, 7.4) ---- */
/* the Drowned Greenhouse (spring): the great glasshouse, flooded side houses either side, the pump house, the Palm House at the far end.
   House rule: deep water slows everyone but the Bloated; each pump in the pump house drains one house. Carry the wild cucumber seed out. */
function shPlanSpring(lv) { const n = shLvSize(lv, 2, 5, 4), L = n * 7 - 1, W = 8 + L + 1 + 12 + 1, P = shNewPlan(W, 23, { theme: 'glass', wall: '#cfe0d6', ground: '#7d9479' });
  shRoom(P, 'porch', 0, 8, 7, 7, 'The Potting Sheds', '#8fa38a'); shRoom(P, 'pumps', 0, 1, 7, 6, 'The Pump House', '#9a9a96'); shRoom(P, 'great', 8, 7, L, 9, 'The Great Glasshouse', '#9cb39a'); shRoom(P, 'palm', 8 + L + 1, 3, 12, 17, 'The Palm House', '#7d9479');
  shLink(P, 'porch', 'pumps'); shLink(P, 'porch', 'great'); shLink(P, 'great', 'palm');
  P.zones.push({ id: 'palm', k: 'water', x: 8 + L + 1, y: 6, w: 12, h: 12 }); P.zones.push({ id: 'great', k: 'water', x: 8, y: 10, w: L, h: 3 });
  shThing(P, 'pump', 1, 2, { use: 4, fast: ['Mechanic', 'Engineer'], label: 'Pump out the Palm House', icon: '💧', fx: 'drain', drains: 'palm', task: 'pump' });
  for (let i = 0; i < n; i++) for (const up of [1, 0]) { const id = `h${up ? 'n' : 's'}${i}`, x = 8 + i * 7, y = up ? 0 : 17; shRoom(P, id, x, y, 6, 6, `The ${['Palm', 'Orchid', 'Fern', 'Cactus', 'Vine', 'Lily', 'Citrus', 'Herb', 'Melon', 'Rose'][i * 2 + up]} House`, '#8fa38a'); shLink(P, id, 'great', i % 3 === 2 && up, x + 2);
    if (i % 3 === 2 && up) { P.locked.push(id); P.lockName[id] = 'a locked house'; } else { P.zones.push({ id, k: 'water', x, y, w: 6, h: 6 }); shThing(P, 'pump', 1 + ((i * 2 + up) % 6), 3 + Math.floor((i * 2 + up) / 6) * 2, { use: 3, fast: ['Mechanic', 'Engineer'], label: `Pump out ${P.names[id]}`, icon: '💧', fx: 'drain', drains: id, task: 'pump' });
      shThing(P, 'crate', x + 3, up ? y + 1 : y + 4, { use: 3, label: 'Search the planters', icon: '🌱', loot: { food: 2 + Math.floor(lv / 6), meds: i % 2 }, task: 'planters' }); P.spawn[id] = [[i % 2 ? 'spitter' : 'bloated', 1], ['walker', 1 + (lv > 8 ? 1 : 0)]]; } }
  P.spawn.porch = [['walker', 3 + Math.floor(lv / 6)]]; P.spawn.great = [['walker', 3 + n], ['bloated', 1 + Math.floor(lv / 8)], ['sporehead', lv > 7 ? 1 : 0]].filter((q) => q[1]); P.spawn.palm = [['bloated', 2], ['walker', 2 + Math.floor(lv / 5)]];
  P.boss = { room: 'palm', type: 'bloated', name: 'The Mire Mother', hp: 1100, atk: 16, big: 1.9, spd: .009, pat: 'summon', kin: 'bloated', kinN: 1, patGap: 720 };
  shThing(P, 'seed', 8 + L + 9, 10, { carry: true, use: 3, label: 'wild cucumber seed', task: 'seed', icon: '🌱' });
  /* 3D.316 it should look like a glasshouse gone wild: glass-green walls on a brick footing with white frames, soil and gravel underfoot, planters run to seed, potting benches, palms, lilies and reeds in the flood, broken panes; outside, cold frames, vegetable plots, a picket fence */
  const px = 8 + L + 1; P.wall = '#a9d6cc'; P.noEdgeProps = true; Object.assign(P.floor, { porch: '#aaa596', pumps: '#9a9a96', great: '#b5ad96', palm: '#857a5c' }); for (const k of Object.keys(P.rooms)) if (/^h[ns]\d/.test(k)) P.floor[k] = '#8a7a5c';
  P.look = { season: 'spring', noYard: 1, plain: 1, cap: '#f4f4ee', dado: '#b0795a', dadoH: .36, door: '#7fa08a', lockDoor: '#8a6a44', border: { great: { col: '#8a8470', w: .3 }, porch: { col: '#8a8470' } }, ground: [{ x: -5, y: 6, w: 4, h: 11, k: 'gravel' }, { x: -24, y: 9, w: 19, h: 3, k: 'dirt' }, { x: -2, y: -2, w: W + 4, h: 27, k: 'gravel' }], clear: [{ x: -24, y: 8, w: 19, h: 5 }] };
  for (let gx = 9; gx < 8 + L - 2; gx += 3.5) { shDeco(P, 'planter', gx + .5, 8.1, { n: 1 }); shDeco(P, 'planter', gx + .5, 14.9, { n: 1 }); if ((gx * 2) % 7 < 3.5) shDeco(P, 'lily', gx + 1, 11); else shDeco(P, 'reeds', gx + 1, 10.3); if ((gx * 2) % 3 < 1) shDeco(P, 'glassbits', gx + 1.6, 13.3); } shDeco(P, 'trellis', 8.4, 9.4, { n: 1, r: 1 }); shDeco(P, 'trellis', 8 + L - 1.4, 13.6, { n: 1, r: 1 }); shDeco(P, 'barrow', 12, 13.4, { r: .4 }); shDeco(P, 'pots', 20, 9.3);
  for (let i = 0; i < n; i++) for (const up of [1, 0]) { const x = 8 + i * 7, y = up ? 0 : 17; shDeco(P, 'planter', x + .9, y + 2.6, { n: 2, r: 1 }); shDeco(P, 'planter', x + 4.9, y + 2.6, { n: 2, r: 1 }); shDeco(P, 'potbench', x + 2.6, up ? y + .15 : y + 5.3); shDeco(P, 'pots', x + (up ? 4.6 : .4), up ? y + 5 : y + .4); if ((i + up) % 2) shDeco(P, 'glassbits', x + 2.6, y + 3); if ((i * 2 + up) % 3 === 0) shDeco(P, 'sacks', x + 2.4, up ? y + 4.6 : y + 1); else shDeco(P, 'lily', x + 2.8, y + 3.4, { n: 4 }); }
  for (const [ax, ay] of [[2, 4.6], [9.4, 4.6], [2, 18.4], [9.4, 18.4], [5.6, 8], [5.6, 15.6]]) shDeco(P, 'palm', px + ax, ay, { h: 2.2 + ((ax + ay) % 2) * .6 }); for (const [ax, ay] of [[1.5, 9], [10, 13], [4, 16], [8, 7.4], [1.2, 13.5], [10.4, 9.5]]) shDeco(P, (ax + ay) % 2 < 1 ? 'reeds' : 'lily', px + ax, ay); shDeco(P, 'planter', px + 5.6, 3.3, { n: 3 }); shDeco(P, 'planter', px + 5.6, 19.4, { n: 3 }); shDeco(P, 'glassbits', px + 3, 11); shDeco(P, 'glassbits', px + 9, 15.5); shDeco(P, 'potbench', px + 10.6, 5.6, { r: 1 });
  shDeco(P, 'potbench', 2, 8.15); shDeco(P, 'potbench', 5, 14.3); shDeco(P, 'sacks', .5, 13.6); shDeco(P, 'barrow', 5.4, 9.2, { r: 1.2 }); shDeco(P, 'pots', 3.4, 12.6); shDeco(P, 'pots', 6, 8.3); shDeco(P, 'pipe', 3, 1.2, { n: 6, col: '#6f8f9c', wheel: 1 }); shDeco(P, 'pipe', 3, 6.2, { n: 6, col: '#6f8f9c' }); shDeco(P, 'drums', 5.8, 4.8);
  shDeco(P, 'coldframe', -4.6, 1.2, { n: 2 }); shDeco(P, 'coldframe', -4.6, 2.9, { n: 2 }); shDeco(P, 'coldframe', -4.6, 4.6, { n: 2 }); shDeco(P, 'plot', -5, 18.5, { w: 4, h: 4 }); shDeco(P, 'plot', -10, 18.5, { w: 4, h: 4 }); shDeco(P, 'compost', -3, 23); shDeco(P, 'barrow', -3.2, 15.4, { r: 2 }); shDeco(P, 'sacks', -2.6, 7.2);
  for (let fy = -3; fy < 25; fy += 4) { if (fy > 5 && fy < 13) continue; shDeco(P, 'picket', -13.5, fy + 1.5, { n: 4, r: 1 }); } for (let fx = -13; fx < -2; fx += 4) shDeco(P, 'picket', fx + 1.5, -3.5, { n: 4 }); shDeco(P, 'trellis', -8, 14.4, { n: 2 }); shDeco(P, 'glassbits', -2.4, 10.6);
  P.route = ['porch', 'great', 'palm']; P.startRoom = 'porch'; P.bossRoom = 'palm'; P.start = { x: 1, y: 10 }; P.exit = { x: .6, y: 11 }; P.mystT = ['bloated', 'spitter'];
  P.tasks = [{ k: 'carry', id: 'seed', label: 'Carry out the wild cucumber seed' }, { k: 'boss', opt: true, label: 'Side: kill the Mire Mother' }]; P.botOrders = ['seed', 'pump']; P.keyOnWin = ['feed_spring'];
  P.tip = 'Deep water slows everyone but the Bloated. The pump house drains the flooded houses one at a time. The seed is in the Palm House: whoever carries it walks slowly.'; return P; }
SH_PLANS.sh_spring = shPlanSpring;
SH_FX.drain = (H, t) => { const z = (H.zones || []).find((q) => q.id === t.drains); if (z) { z.on = false; say(`The pumps thump into life: ${H.plan.names[t.drains] || 'the house'} drains.`); } };

/* the Burning Refinery (summer): the gate yard, the pipe racks, the control room, the tank farm, the cracking tower.
   House rule: fire creeps along the fuel lines a section at a time until the line's valve is shut; a clock: the tank farm goes up.
   Get the first Freshlock recipe from the control room and get out before the clock runs out. */
function shPlanSummer(lv) { const n = shLvSize(lv, 3, 6, 4), L = n * 5, W = 9 + L + 1 + 11 + 1, P = shNewPlan(W, 21, { theme: 'prison', wall: '#6b5d52', ground: '#8a6f58' });
  shRoom(P, 'gate', 0, 6, 8, 9, 'The Gate Yard', '#a68f74'); shRoom(P, 'racks', 9, 7, L, 7, 'The Pipe Racks', '#9a8166'); shRoom(P, 'control', 9, 0, 9, 6, 'The Control Room', '#9a9a96');
  shRoom(P, 'tanks', 9, 15, L, 6, 'The Tank Farm', '#8a6f58'); shRoom(P, 'tower', 9 + L + 1, 3, 11, 15, 'The Cracking Tower', '#8a6f58');
  shLink(P, 'gate', 'racks'); shLink(P, 'racks', 'control', false, 12); shLink(P, 'racks', 'tanks', false, 10); shLink(P, 'racks', 'tower'); shLink(P, 'tanks', 'tower');
  for (let i = 0; i < n; i++) shThing(P, 'tank', 10 + i * 5 + 2, 17, { look: i % 2 ? '#c9c9c9' : '#d9b233' });
  shThing(P, 'desk', 12, 2); shThing(P, 'files', 15, 2, { carry: true, use: 3, label: 'first Freshlock recipe', task: 'recipe', icon: '📜' });
  /* two fuel lines run down the racks; each burns forward a section every few seconds until its valve is shut */
  P.lines = [{ y: 8, valve: 'v1' }, { y: 12, valve: 'v2' }]; P.lines.forEach((l, k) => shThing(P, 'valve', 10 + k * 3, 1 + k * 2, { use: 3, fast: ['Mechanic', 'Engineer'], label: `Shut fuel line ${k + 1}`, icon: '🔧', fx: 'valve', line: k, task: 'valves' }));
  P.clock = 300 - Math.min(90, lv * 4);   /* seconds until the tank farm goes up */
  P.spawn.gate = [['burnt', 3 + Math.floor(lv / 5)], ['runner', 1]]; P.spawn.racks = [['burnt', 3 + n], ['runner', 1 + Math.floor(lv / 6)]]; P.spawn.control = [['burnt', 2]]; P.spawn.tanks = [['burnt', 2 + n], ['rotbomb', 1 + Math.floor(lv / 7)]]; P.spawn.tower = [['burnt', 3], ['runner', 2]];
  P.boss = { room: 'tower', type: 'brute', name: 'Cinder', hp: 1100, atk: 17, big: 1.7, spd: .012, pat: 'slam' };
  /* 3D.316 it should look like a refinery on fire: pipes everywhere on their racks, columns with platforms and ladders, a flare stack, sphere tanks, bunds round the tank farm, a tanker and a forklift at the gate, scorched ground under everything */
  const tx = 9 + L + 1; P.noEdgeProps = true; Object.assign(P.floor, { gate: '#8f8b84', racks: '#817b71', control: '#9a9a96', tanks: '#77706a', tower: '#77706a' });
  P.look = { season: 'summer', noYard: 1, plain: 1, cap: '#4a423c', dado: '#d9b233', dadoH: .2, door: '#5d6066', lockDoor: '#7a3b2a', border: { racks: { col: '#d9b233', w: .16 }, gate: { col: '#d9b233', w: .16 } }, pads: [{ x: 11.5, y: 6.2, w: 2.5, h: .6, col: '#d9b233' }],
    ground: [{ x: -6, y: -5, w: W + 12, h: 31, k: 'ash' }, { x: -24, y: 8, w: 19, h: 5, k: 'asphalt' }, { x: -7, y: 6, w: 6, h: 9, k: 'asphalt' }], clear: [{ x: -24, y: 7, w: 19, h: 7 }] };
  shDeco(P, 'pipe', 9 + L / 2 - .5, 8.6, { n: L, col: '#d9b233', wheel: 1 }); shDeco(P, 'pipe', 9 + L / 2 - .5, 12.6, { n: L, col: '#b0564a', wheel: 1 }); shDeco(P, 'pipe', 9 + L / 2 - .5, 7.15, { n: L, col: '#8a8f96', y0: .5 }); shDeco(P, 'pipe', 9 + L / 2 - .5, 13.8, { n: L, col: '#6f8f9c', y0: .5 });
  for (let gx = 11; gx < 9 + L - 1; gx += 5) { shDeco(P, 'piperack', gx, 7.4); shDeco(P, 'piperack', gx, 13.5); shDeco(P, 'scorch', gx + 1.5, 10.4, { s: .8 + (gx % 3) * .2 }); if (gx % 2) shDeco(P, 'drums', gx + 2.6, 10.8); else shDeco(P, 'cone', gx + 3, 9.8); } shDeco(P, 'barrier', 9 + L - 2, 10.5, { r: 1, n: 1 }); shDeco(P, 'firebox', 9.3, 9.6, { r: 1 }); shDeco(P, 'hazsign', 9.5, 11.6);
  shDeco(P, 'console', 13.5, .05, { n: 3 }); shDeco(P, 'firebox', 17.4, 4.4, { r: 3 }); shDeco(P, 'hazsign', 9.4, 4.8); shDeco(P, 'papers', 14, 3.6); shDeco(P, 'papers', 11, 4.4); shDeco(P, 'scorch', 16, 4.2, { s: .6 });
  for (let i = 0; i < n; i++) { shDeco(P, 'bund', 12 + i * 5, 17.6, { w: 4.2, h: 4.2 }); if (i % 2) shDeco(P, 'scorch', 13.5 + i * 5, 19.6, { s: .7 }); } shDeco(P, 'pipe', 9 + L / 2 - .5, 15.25, { n: L, col: '#8a8f96', wheel: 1 }); shDeco(P, 'firebox', 9.3, 20, { r: 1 });
  shDeco(P, 'column', tx + 2.6, 5.4, { h: 5.4 }); shDeco(P, 'column', tx + 7.6, 5.2, { h: 4.4, col: '#a59f8e' }); shDeco(P, 'pipe', tx + 5, 7.6, { n: 7, col: '#d9b233', y0: .5, wheel: 1 }); shDeco(P, 'pipe', tx + 1, 12, { n: 8, col: '#b0564a', r: 1 }); shDeco(P, 'scorch', tx + 5.5, 11, { s: 1.6 }); shDeco(P, 'scorch', tx + 8, 15, { s: 1 }); shDeco(P, 'drums', tx + 9.4, 16.6); shDeco(P, 'forklift', tx + 8.6, 9, { r: 1.4 }); shDeco(P, 'barrier', tx + 4, 16.4, { n: 2 }); shDeco(P, 'hazsign', tx + .5, 3.6);
  shDeco(P, 'forklift', 2, 7.4, { r: .5 }); shDeco(P, 'barrier', 6.6, 12.6, { r: 1, n: 1 }); shDeco(P, 'drums', .4, 13.6); shDeco(P, 'cone', 3, 13); shDeco(P, 'cone', 5.2, 7); shDeco(P, 'hazsign', 7.2, 6.4); shDeco(P, 'scorch', 4.5, 11, { s: .9 });
  shDeco(P, 'spheretank', 21.5, 2.6); shDeco(P, 'spheretank', 26.5, 2.6, { col: '#c9c4b6' }); if (L > 22) shDeco(P, 'spheretank', 31.5, 2.6); shDeco(P, 'pipe', 26, 5.4, { n: 12, col: '#8a8f96', y0: .5 });
  shDeco(P, 'flare', W + 3, 2, { h: 6.5 }); shDeco(P, 'flare', -3.5, -2.5, { h: 5 }); shDeco(P, 'tanker', -9, 10.2, { r: .12 }); shDeco(P, 'car', -15, 11.4, { col: '#2e2a28', wreck: 1, r: 2.6 }); shDeco(P, 'scorch', -8, 12, { s: 1.6 }); shDeco(P, 'scorch', -3, 4, { s: 1.2 }); shDeco(P, 'hazsign', -1.6, 6.2); shDeco(P, 'barrier', -5, 7.4, { n: 2 }); shDeco(P, 'drums', -2.4, 15.6);
  for (let fx = -5; fx < W + 4; fx += 6) shDeco(P, 'fence', fx + 2.5, -5.5, { n: 6 }); for (let fy = -5; fy < 24; fy += 6) { if (fy > 3 && fy < 14) continue; shDeco(P, 'fence', -7.5, fy + 2.5, { n: 6, r: 1 }); }
  P.route = ['gate', 'racks', 'control']; P.startRoom = 'gate'; P.bossRoom = 'tower'; P.start = { x: 1, y: 8.5 }; P.exit = { x: .6, y: 10 }; P.mystT = ['burnt', 'runner'];
  P.tasks = [{ k: 'carry', id: 'recipe', label: 'Carry out the first Freshlock recipe' }, { k: 'boss', opt: true, label: 'Side: kill Cinder' }]; P.botOrders = ['recipe', 'valves']; P.keyOnWin = ['feed_summer'];
  P.tip = 'Fire creeps along both fuel lines until their valves in the control room are shut. The clock up top is the tank farm: be out before it goes up.';
  P.setup = (H) => { H.clock = P.clock * 60; H.fireAt = H.t + 600; H.lineN = [0, 0]; };
  P.tick = (H, live) => { if (H.clock > 0) { H.clock--; if (H.clock % 1800 === 0 && H.clock) say(`The tank farm: ${H.clock / 60} seconds.`); if (!H.clock) { banner('💥 THE TANK FARM GOES UP'); const [x0, y0, w, h] = H.plan.rooms.tanks; H.zones.push({ k: 'fire', x: x0, y: y0, w, h }, { k: 'fire', x: 9, y: 7, w: H.plan.rooms.racks[2], h: 7 }); for (const s of live) if (shRoomAt(s.w) !== H.plan.startRoom) { const dm = Math.round(s.max * .4); s.hp -= dm; shFx(s.w, '-' + dm, '#ff6e62'); if (s.hp <= 0) { s.hp = 0; s.mode = 'down'; } } (window.ZH_BOOMS ||= []).push({ x: SH_AX + x0 + w / 2, y: SH_AY + y0 + h / 2, r: 6, burn: true, t: performance.now() }); SFX('hit'); } }
    if (H.t >= H.fireAt) { H.fireAt = H.t + 480; H.plan.lines.forEach((l, k) => { if (l.shut || (H.shut || {})[k]) return; const i = H.lineN[k]++; if (i * 3 >= H.plan.rooms.racks[2]) return; H.zones.push({ k: 'fire', x: 9 + i * 3, y: l.y, w: 3, h: 2, line: k }); }); } };
  return P; }
SH_PLANS.sh_summer = shPlanSummer;
SH_FX.valve = (H, t) => { (H.shut ||= {})[t.line] = true; for (const z of H.zones) if (z.line === t.line) z.on = false; say(`Fuel line ${t.line + 1} is shut: its fire dies down.`); };

/* the Harvest Fair (autumn): the midway (a loop of stalls), the livestock barns, the orchard store, the Haunted Ride (a dark maze), Farmer Fresh's stage.
   House rule: the stage loudspeaker still plays the old show: switch it on and the dead crowd the stage for half a minute. The Haunted Ride is dark. */
function shPlanAutumn(lv) { const n = shLvSize(lv, 2, 4, 5), W = 12 + n * 8 + 14, P = shNewPlan(W, 24, { theme: 'camp', wall: '#8a5a32', ground: '#9a7a52', noEdgeProps: true });
  shRoom(P, 'gate', 0, 9, 7, 7, 'The Fair Gate', '#b39064'); shRoom(P, 'midway', 8, 6, n * 8 + 3, 12, 'The Midway', '#a68458');
  shRoom(P, 'stage', 8, 0, 12, 5, "Farmer Fresh's Stage", '#b39064'); shRoom(P, 'barns', 8, 19, 12, 5, 'The Livestock Barns', '#9a7a52'); shRoom(P, 'orchard', 21, 19, Math.min(10, n * 8 - 10), 5, 'The Orchard Store', '#8a7a52');
  shLink(P, 'gate', 'midway', false, null, 3); shLink(P, 'midway', 'stage', false, 12, 3); shLink(P, 'midway', 'barns', false, 12, 3); shLink(P, 'midway', 'orchard', false, 23, 2);
  const rx = 8 + n * 8 + 4; shRoom(P, 'ride0', rx, 6, 4, 5, 'The Haunted Ride', '#4a3a3a'); shRoom(P, 'ride1', rx, 12, 4, 6, 'The Haunted Ride', '#4a3a3a'); shRoom(P, 'ride2', rx + 5, 6, 4, 12, 'The Haunted Ride', '#4a3a3a'); shRoom(P, 'ride3', rx, 0, 9, 5, 'The Ghost Train Shed', '#4a3a3a');
  shLink(P, 'midway', 'ride0', false, 8, 1); shLink(P, 'ride0', 'ride1', false, rx + 1, 1); shLink(P, 'ride1', 'ride2', false, 14, 1); shLink(P, 'ride2', 'ride3', false, rx + 6, 1); shLink(P, 'ride0', 'ride3', true, rx + 1, 1);
  for (const r of ['ride0', 'ride1', 'ride2', 'ride3']) P.dark[r] = 1; P.lockName.ride3 = 'the ghost train shed';
  for (let i = 0; i < n; i++) { shThing(P, 'stall', 10 + i * 8, 7, { look: ['#c94a3a', '#3a6ac9', '#3aa04a', '#d9a03a'][i % 4] }); shThing(P, 'stall', 14 + i * 8, 16, { look: ['#d9a03a', '#c94a3a', '#3a6ac9', '#3aa04a'][i % 4] }); }
  shThing(P, 'ride', 10 + n * 4, 11); shThing(P, 'stage', 11, 1); shThing(P, 'speaker', 17, 3, { use: 2, label: 'Switch on the old show', icon: '📢', sub: 'The dead crowd the stage for half a minute', fx: 'lure', again: true, task: 'lure' });
  shThing(P, 'hay', 10, 21); shThing(P, 'sign', 7 + 4, 17, { look: '#e8c45a' }); for (let i = 0; i < 2; i++) shThing(P, 'jar', 23 + i * 3, 21, { carry: true, use: 2, label: 'crate of old apple stock', task: 'apples', icon: '🍎' });
  shThing(P, 'crate', 18, 22, { use: 4, label: 'Search the prize booth', icon: '🎁', loot: { cloth: 3, food: 3 }, items: ['raincoat'], task: 'booth' });
  P.spawn.gate = [['walker', 3]]; P.spawn.midway = [['walker', 5 + n * 2], ['runner', 2 + Math.floor(lv / 5)], ['rotbomb', lv > 8 ? 1 : 0]].filter((q) => q[1]); P.spawn.barns = [['dog', 2 + Math.floor(lv / 6)], ['walker', 2]]; P.spawn.orchard = [['walker', 2]];
  P.spawn.ride0 = [['walker', 2]]; P.spawn.ride1 = [['lasher', 1], ['walker', 1]]; P.spawn.ride2 = [['walker', 3], ['lasher', lv > 10 ? 1 : 0]].filter((q) => q[1]); P.spawn.stage = [['walker', 2]];
  P.boss = { room: 'ride3', type: 'lasher', name: 'The Scarecrow', hp: 1050, atk: 16, big: 1.7, spd: .013, pat: 'charge', patGap: 540 };
  /* 3D.318 it should look like a fair left standing: striped tents and bunting, a big wheel, booths, pumpkins and hay, the stage's striped backdrop, pens in the barns, the ghost train's track and cars, apple trees behind the store, the entrance arch */
  const MW = n * 8 + 3; P.noEdgeProps = true; Object.assign(P.floor, { gate: '#b89a68', midway: '#b0925e', stage: '#b08a58', barns: '#b59a5a', orchard: '#9a8458' });
  P.look = { season: 'autumn', noYard: 1, plain: 1, wallH: 1.3, cap: '#6a4424', door: '#7a5a34', lockDoor: '#5a2f2f', planks: { stage: '#8a6a40', ride0: '#3a2c2c', ride1: '#3a2c2c', ride2: '#3a2c2c', ride3: '#3a2c2c' },
    ground: [{ x: -16, y: 5, w: 14, h: 15, k: 'dirt' }, { x: -24, y: 10, w: 9, h: 4, k: 'dirt' }, { x: -2, y: -2, w: W + 4, h: 28, k: 'dirt' }], clear: [{ x: -24, y: 9, w: 9, h: 6 }, { x: -16, y: 5, w: 14, h: 15 }] };
  shDeco(P, 'bunting', 8 + MW / 2 - .5, 6.5, { n: MW }); shDeco(P, 'bunting', 8 + MW / 2 - .5, 17.4, { n: MW }); for (let i = 0; i < n; i++) { shDeco(P, 'tent', 13.5 + i * 8, 13.4, { col: ['#3a6ac9', '#c94a3a', '#3aa04a', '#d9a03a'][i % 4] }); shDeco(P, 'pumpkins', 11.4 + i * 8, 9.4); shDeco(P, 'haybale', 16.5 + i * 8, 9.6, { n: 2 + (i % 2) * 2, r: i }); shDeco(P, 'balloons', 9.6 + i * 8, 15.6); }
  shDeco(P, 'ferris', 8 + MW - 5, 11.4); shDeco(P, 'booth', 8 + MW - 8.4, 14.6, { col: '#c94a3a' }); shDeco(P, 'booth', 9, 12.4); shDeco(P, 'pumpkins', 20, 15.2, { n: 8 }); shDeco(P, 'haybale', 26, 7.2, { n: 4 });
  shDeco(P, 'booth', 2, 9.3, { col: '#3aa04a' }); shDeco(P, 'booth', 5, 9.3, { col: '#d9a03a' }); shDeco(P, 'pumpkins', 1, 14.6); shDeco(P, 'haybale', 5.4, 14.8, { n: 3 }); shDeco(P, 'balloons', 6.3, 10.4); shDeco(P, 'bunting', 3, 15.6, { n: 6 });
  shDeco(P, 'backdrop', 13.5, .1, { n: 4 }); shDeco(P, 'pa', 9, 1.4); shDeco(P, 'pa', 19, 1.4); shDeco(P, 'balloons', 15, 4.2); shDeco(P, 'haybale', 9.4, 4.2, { n: 2 });
  shDeco(P, 'pen', 13.2, 20.3, { w: 2.2, h: 2 }); shDeco(P, 'pen', 16, 20.3, { w: 2.2, h: 2 }); shDeco(P, 'haybale', 18.6, 19.5, { n: 4 }); shDeco(P, 'haybale', 12, 23, { n: 2 });
  shDeco(P, 'applecrate', 21.6, 19.5); shDeco(P, 'applecrate', 27.5, 19.6, { r: .3 }); shDeco(P, 'applecrate', 24.6, 22.9, { r: 2 }); shDeco(P, 'pumpkins', 29.4, 22.6);
  shDeco(P, 'track', rx + 1.5, 11.5, { n: 11, r: 1 }); shDeco(P, 'track', rx + 6.5, 11.5, { n: 11, r: 1 }); shDeco(P, 'track', rx + 4, 2.4, { n: 8 }); shDeco(P, 'ridecar', rx + 1.5, 8, { r: 1 }); shDeco(P, 'ridecar', rx + 6.5, 14, { r: 3, col: '#2f5a4a' }); shDeco(P, 'ridecar', rx + 3, 2.4); shDeco(P, 'coffin', rx + 2.8, 7); shDeco(P, 'coffin', rx + 7.8, 9.5, { r: 1 }); shDeco(P, 'coffin', rx + 7, 1); shDeco(P, 'coffin', rx + .4, 15.6, { r: .4 });
  shDeco(P, 'fairarch', -1.6, 12.2); shDeco(P, 'booth', -3.6, 9.2, { col: '#3a6ac9' }); shDeco(P, 'haybale', -3, 15.4, { n: 4 }); shDeco(P, 'pumpkins', -2.6, 13.6); shDeco(P, 'car', -8, 7.5, { col: '#b0564a', r: 1 }); shDeco(P, 'car', -11, 8, { col: '#7a8fa3', r: 1.1 }); shDeco(P, 'car', -8.5, 16.5, { col: '#d9c36a', r: .9, wreck: 1 }); shDeco(P, 'tractor', -11.5, 17.5, { r: .3 });
  for (let ax = 21; ax < Math.min(W - 2, 21 + 12); ax += 3) { shDeco(P, 'appletree', ax, 26.6); shDeco(P, 'appletree', ax + 1.5, 29.4); } for (let fy = 2; fy < 24; fy += 4) { if (fy > 8 && fy < 15) continue; shDeco(P, 'picket', -17.5, fy + 1.5, { n: 4, r: 1 }); }
  P.route = ['gate', 'midway', 'ride0', 'ride1', 'ride2', 'ride3']; P.startRoom = 'gate'; P.bossRoom = 'ride3'; P.start = { x: 1, y: 11 }; P.exit = { x: .6, y: 12 }; P.mystT = ['walker', 'dog'];
  P.tasks = [{ k: 'boss', label: 'Kill the Scarecrow' }, { k: 'carry', id: 'apples', need: 1, label: 'Carry out the old apple stock' }]; P.botOrders = ['apples']; P.keyOnWin = ['feed_autumn', 'pell10'];
  P.tip = "Farmer Fresh's loudspeaker still works: switch on the old show and the dead crowd the stage for half a minute. The Haunted Ride is dark: you see them late.";
  return P; }
SH_PLANS.sh_autumn = shPlanAutumn;
SH_FX.lure = (H, t) => { t.done = false; H.lure = { w: shThingSpot(t), until: H.t + 1800 }; for (const z of H.zs) if (z.hp > 0 && !z.boss && dist(z.w, H.lure.w) < 16) { if (z.mode === 'sleep') z.mode = 'idle'; z.lured = true; } say('🎵 "Fresh for ever, fresh for you…" The old show crackles out of the speaker and the dead turn toward the stage.'); };

/* the Frozen Depot (winter): the snowed yard, the barracks, the motor pool, the cold store, the hangar.
   House rule: away from the burning barrels the cold slowly hurts; some of the dead are frozen in the ice and thaw when a blast or fire comes near.
   Boss: the Gatling Boss (W212). Carry out the ice from the cold store. */
function shPlanWinter(lv) { const n = shLvSize(lv, 2, 5, 4), L = n * 6 - 1, W = 10 + L + 1 + 12 + 1, P = shNewPlan(W, 22, { theme: 'prison', wall: '#9aa6b0', ground: '#dfe6ec' });
  shRoom(P, 'yard', 0, 4, 9, 14, 'The Snowed Yard', '#e8eef2'); shRoom(P, 'road', 10, 9, L, 4, 'The Depot Road', '#dfe6ec'); shRoom(P, 'cold', 0, 19, 9, 3, 'The Cold Store', '#cfe0ea'); shRoom(P, 'hangar', 10 + L + 1, 2, 12, 18, 'The Hangar', '#cfd8de');
  shLink(P, 'yard', 'road'); shLink(P, 'yard', 'cold'); shLink(P, 'road', 'hangar');
  for (let i = 0; i < n; i++) for (const up of [1, 0]) { const id = `bk${up ? 'n' : 's'}${i}`, x = 10 + i * 6; shRoom(P, id, x, up ? 2 : 14, 5, 6, up ? `Barracks ${i + 1}` : `Motor bay ${i + 1}`, up ? '#cfd8de' : '#d0d4d6'); shLink(P, id, 'road', (i + up) % 3 === 2, x + 1);
    if ((i + up) % 3 === 2) { P.locked.push(id); P.lockName[id] = up ? 'a locked barracks' : 'a locked motor bay'; } else { P.spawn[id] = [[up ? 'riot' : 'walker', 1 + (i % 2)], ['walker', 1]]; shThing(P, up ? 'bed' : 'crate', x + 1, up ? 4 : 17, up ? {} : { use: 3, label: 'Search the bay', icon: '🔧', loot: { mat: 3, fuel: 1 }, task: 'bays' }); } }
  P.zones.push({ k: 'cold', x: 0, y: 4, w: 9, h: 14 }, { k: 'cold', x: 10, y: 9, w: L, h: 4 }, { k: 'cold', x: 0, y: 19, w: 9, h: 3 });
  shThing(P, 'warm', 6, 6, { warm: 2.6 }); shThing(P, 'warm', 2, 15, { warm: 2.6 }); for (let i = 0; i < n; i += 2) shThing(P, 'warm', 12 + i * 6, 11, { warm: 2.4 });
  for (let i = 0; i < 2 + Math.floor(lv / 6); i++) shThing(P, 'ice', 3 + (i * 5) % 6, 8 + (i * 3) % 7, { frozen: i % 3 === 2 ? 'riot' : 'walker' });
  shThing(P, 'ice', 6, 20, { carry: true, use: 4, label: 'block of depot ice', task: 'ice', icon: '🧊' });
  P.spawn.yard = [['walker', 3 + Math.floor(lv / 5)]]; P.spawn.road = [['walker', 2 + n], ['riot', 1 + Math.floor(lv / 7)]]; P.spawn.cold = [['walker', 2]]; P.spawn.hangar = [['riot', 2], ['walker', 3 + Math.floor(lv / 6)], ['brute', lv > 12 ? 1 : 0]].filter((q) => q[1]);
  P.boss = { room: 'hangar', type: 'gatling', name: 'The Gatling Boss', hp: 1200, atk: 18, big: 1.4, spd: .009, pat: 'gun', patGap: 360 };
  /* 3D.318 it should look like an army depot under snow: snow on the wall tops and in drifts, olive trucks and jeeps, bunks and lockers in the barracks, vehicles in the motor bays, ice stacked in the cold store, a helicopter in the hangar, towers and wire outside */
  const hx = 10 + L + 1; P.noEdgeProps = true; Object.assign(P.floor, { hangar: '#b4bcc0', cold: '#cfe4ee' }); for (const k of Object.keys(P.rooms)) if (/^bkn\d/.test(k)) P.floor[k] = '#c2bdae'; else if (/^bks\d/.test(k)) P.floor[k] = '#a9aaa6';
  P.look = { season: 'winter', noYard: 1, plain: 1, cap: '#f4f8fa', dado: '#5f6b45', dadoH: .3, door: '#5f6b45', lockDoor: '#4a5538', border: { hangar: { col: '#d9b233', w: .16 } }, ground: [{ x: -30, y: -30, w: W + 60, h: 90, k: 'snow' }, { x: -24, y: 8, w: 21, h: 4, k: 'asphalt' }, { x: W + 1, y: 9, w: 9, h: 9, k: 'concrete' }], clear: [{ x: -24, y: 7, w: 21, h: 6 }] };
  shDeco(P, 'snowdrift', .7, 4.7); shDeco(P, 'snowdrift', 7.8, 16.9, { s: 1.2 }); shDeco(P, 'snowdrift', 4, 17.3, { s: .8 }); shDeco(P, 'snowdrift', .5, 12.5); shDeco(P, 'atruck', 5.6, 13.2, { r: .3 }); shDeco(P, 'jeep', 3, 6, { r: 1.2 }); shDeco(P, 'sandbags', 5, 9.2, { n: 1 }); shDeco(P, 'acrates', 7.4, 4.7); shDeco(P, 'flagp', 1, 5.4); shDeco(P, 'ruts', 4.5, 10.6, { len: 9 });
  shDeco(P, 'ruts', 10 + L / 2, 10.6, { len: L * 2 }); shDeco(P, 'atruck', 10 + L - 6, 11, { r: .45 }); shDeco(P, 'acrates', 16, 9.3); shDeco(P, 'barrier', 10 + L - 2, 10.5, { r: 1, n: 1 }); for (let i = 0; i < n; i++) shDeco(P, 'snowdrift', 14.5 + i * 6, i % 2 ? 9.2 : 12.7, { s: .7 });
  for (let i = 0; i < n; i++) { const x = 10 + i * 6; shDeco(P, 'bunk', x + 3, 2.05, { col: '#5f6b45' }); shDeco(P, 'bunk', x + 3, 6.9, { col: '#6f7a55' }); shDeco(P, 'locker', x + .2, 6.9, { n: 2 }); shDeco(P, 'acrates', x + 4.2, 4.5, { r: 1 }); shDeco(P, i % 2 ? 'jeep' : 'atruck', x + 2.3, 16.6, { r: 1, snow: 0 }); shDeco(P, 'tyres', x + 4.3, 14.3); shDeco(P, 'drums', x + .2, 19); shDeco(P, 'potbench', x + 3.4, 19.4); }
  shDeco(P, 'iceblocks', 1, 19.3); shDeco(P, 'iceblocks', 3.6, 19.3); shDeco(P, 'iceblocks', 7.6, 20.9, { r: 2 }); shDeco(P, 'acrates', 2, 21.2);
  shDeco(P, 'heli', hx + 6, 7.5, { r: .3 }); shDeco(P, 'atruck', hx + 8.6, 16.4, { r: 1.2, snow: 0 }); shDeco(P, 'acrates', hx + 1, 3); shDeco(P, 'acrates', hx + 9.6, 3.2, { r: 2 }); shDeco(P, 'acrates', hx + 2, 17.6); shDeco(P, 'sandbags', hx + 2.6, 12.4, { n: 1, r: 1 }); shDeco(P, 'sandbags', hx + 2.6, 9, { n: 1, r: 1 }); shDeco(P, 'drums', hx + 10.6, 11); shDeco(P, 'locker', hx + 5.5, 2.1, { n: 4 }); shDeco(P, 'ruts', hx + 5, 12.5, { len: 8 });
  shDeco(P, 'wtower', -3.5, 2.5); shDeco(P, 'wtower', -3.5, 20.5); shDeco(P, 'atruck', -9, 9.6, { r: .05 }); shDeco(P, 'barrier', -3.6, 12.6, { n: 2 }); shDeco(P, 'snowdrift', -2, 6, { s: 1.4 }); shDeco(P, 'snowdrift', -2.4, 15, { s: 1.2 }); shDeco(P, 'snowdrift', 20, -1.6, { s: 1.5 }); shDeco(P, 'snowdrift', 30, 22.6, { s: 1.5 }); shDeco(P, 'radar', W + 3, 4); shDeco(P, 'helipad', W + 5, 13); shDeco(P, 'flagp', -2, 8);
  for (let fx = -5; fx < W + 4; fx += 6) shDeco(P, 'fence', fx + 2.5, -3.5, { n: 6 }); for (let fy = -3; fy < 24; fy += 6) { if (fy > 2 && fy < 14) continue; shDeco(P, 'fence', -5.5, fy + 2.5, { n: 6, r: 1 }); } shDeco(P, 'fence', -5.5, 4, { n: 3, r: 1 }); shDeco(P, 'fence', -5.5, 15, { n: 3, r: 1 });
  P.route = ['yard', 'road', 'hangar']; P.startRoom = 'yard'; P.bossRoom = 'hangar'; P.start = { x: 1, y: 9 }; P.exit = { x: .6, y: 10 }; P.mystT = ['walker', 'riot'];
  P.tasks = [{ k: 'boss', label: 'Kill the Gatling Boss' }, { k: 'carry', id: 'ice', label: 'Carry out the depot ice' }]; P.botOrders = ['ice']; P.keyOnWin = ['feed_winter'];
  P.tip = 'Away from the burning barrels the cold slowly hurts. Some of the dead are frozen in the ice: a blast near them thaws them out. The Gatling Boss spins up before he fires: get behind cover or out of his line.';
  return P; }
SH_PLANS.sh_winter = shPlanWinter;

/* the frozen dead (Frozen Depot): they stand in the ice, can't be hurt, and thaw when a blast comes near */
function shThaw(H, at, r) { for (const z of H.zs) if (z.frozen && dist(z.w, at) < r + .8) { z.frozen = false; z.mode = 'idle'; z.hid = false; const t = H.things.find((q) => q.frozen && !q.out && Math.abs(q.x - shCell(z.w).x) < 1.5 && Math.abs(q.y - shCell(z.w).y) < 1.5); if (t) t.out = true; shFx(z.w, '💢 Thawed out', '#ff6e62'); } }
/* the lure (Harvest Fair): the dead walk to the stage while the old show plays, unless someone is right next to them */
function shLured(z, live) { const H = S.sh; if (!z.lured || !H.lure) return false; if (live.some((s) => dist(s.w, z.w) < 1.3)) return false; if (dist(z.w, H.lure.w) > 1.6) { z.mode = 'zchase'; shGo(z, H.lure.w, z.spd, 'z'); } else { z.moving = false; z.mode = 'idle'; } return true; }

/* ---- 3D.282 the story's strongholds (09-STORY.md, sections 9 and 10.0): Helix Lab 7 (proof 2), the Records Office (proof 3), the Dusk Radio Mast ---- */
/* Helix Lab 7: a security ring corridor round sealed labs, the generator room, the containment lab and the basement below it.
   House rule: no power. The lab is dark until the generator runs, and the generator opens the security doors, and the cages with them.
   If Amy is in the squad she still knows the door codes. Boss: the Mutant (Subject 2, W212). Carry out the tables (proof 2). */
function shPlanLab7(lv) { /* 3D.320 real sizes: a tile is about 3.5 m, so a lab is 3 x 3, a corridor 2 wide, Containment 6 x 6 */
  const k = shLvSize(lv, 2, 4, 6), L = k * 4 - 1, ex = 9 + L + 1, W = ex + 10, P = shNewPlan(W, 15, { theme: 'lab', wall: '#e4e8ea', ground: '#9aa0a2' });
  shRoom(P, 'lobby', 0, 6, 5, 4, 'Reception', '#c5cacc'); shRoom(P, 'gen', 0, 1, 5, 4, 'The Generator Room', '#9aa0a2');
  shRoom(P, 'west', 6, 1, 2, 13, 'The Security Ring', '#b8bdbf'); shRoom(P, 'north', 9, 1, L, 2, 'The Security Ring', '#b8bdbf'); shRoom(P, 'south', 9, 12, L, 2, 'The Security Ring', '#b8bdbf'); shRoom(P, 'east', ex, 1, 2, 13, 'The Security Ring', '#b8bdbf');
  shRoom(P, 'contain', ex + 3, 3, 6, 6, 'Containment', '#aeb4b6'); shRoom(P, 'base', ex + 3, 10, 6, 3, 'The Basement', '#9aa0a2');
  shLink(P, 'lobby', 'west'); shLink(P, 'gen', 'west'); shLink(P, 'west', 'north'); shLink(P, 'west', 'south'); shLink(P, 'north', 'east'); shLink(P, 'south', 'east'); const cd = shLink(P, 'east', 'contain', true); P.doors[cd][7] = 'heavy'; P.doors[cd][8] = 'sec'; shLink(P, 'contain', 'base');
  for (let j = 0; j < k; j++) for (const up of [1, 0]) { const id = `lab${up ? 'n' : 's'}${j}`, x = 9 + j * 4, y0 = up ? 4 : 8; shRoom(P, id, x, y0, 3, 3, `Lab ${7}${String.fromCharCode(65 + j * 2 + (1 - up))}`, '#c5cacc'); const di = shLink(P, id, up ? 'north' : 'south', true, x + 1, 1); P.doors[di][7] = 'heavy'; P.doors[di][8] = 'sec';
    shThing(P, 'cage', x, up ? y0 + 2 : y0); shThing(P, 'desk', x + 2, up ? y0 : y0 + 2); P.spawn[id] = [[(j + up) % 2 ? 'lasher' : 'walker', 1], ['walker', 1 + (lv > 14 ? 1 : 0)]];
    shThing(P, 'crate', x + 2, up ? y0 + 2 : y0, { use: 3, label: 'Search the lab benches', icon: '🧪', loot: { meds: 2, mat: 2 }, task: 'benches' }); }
  for (const r of Object.keys(P.rooms)) if (r !== 'lobby') P.dark[r] = 1;
  shThing(P, 'generator', 2, 2, { use: 6, fast: ['Mechanic', 'Engineer'], label: 'Start the generator', icon: '⚡', sub: 'Lights on, and every security door opens: the cages too', fx: 'power', task: 'power' });
  shThing(P, 'safe', ex + 4, 11); shThing(P, 'files', ex + 7, 12, { carry: true, use: 4, label: 'build-up tables', task: 'tables', icon: '📁' });
  P.spawn.lobby = [['walker', 2]]; P.spawn.west = [['walker', 2 + Math.floor(lv / 8)]]; P.spawn.north = [['walker', 1 + k]]; P.spawn.south = [['walker', 1 + k]]; P.spawn.east = [['runner', 1 + Math.floor(lv / 10)], ['walker', 2]]; P.spawn.contain = [['lasher', 1 + Math.floor(lv / 12)]]; P.spawn.base = [['walker', 2]];
  P.boss = { room: 'contain', type: 'boss', name: 'The Mutant (Subject 2)', hp: 1500, atk: 20, big: 1.5, spd: .011, pat: 'slam' };
  /* 3D.319, 3D.320 it should look like a research lab: pale sheet floors with hazard lines round the ring, a bench, a fume hood and a specimen tank in every lab, decon showers, servers in the basement, the big tank in Containment broken open, a car park, a guard booth and the Helix sign outside */
  P.noEdgeProps = true; Object.assign(P.floor, { lobby: '#d3d9dc', gen: '#8f9698', west: '#c3c9cc', north: '#c3c9cc', south: '#c3c9cc', east: '#c3c9cc', contain: '#b4bcc0', base: '#878e92' }); for (const r of Object.keys(P.rooms)) if (/^lab/.test(r)) P.floor[r] = '#d9dfe1';
  const cx0 = ex + 3; P.look = { noYard: 1, plain: 1, cap: '#c2ccd1', dado: '#6fa3b5', dadoH: .26, door: '#b4c2c8', lockDoor: '#c9a23a', border: { contain: { col: '#d9b233', w: .2 }, lobby: { col: '#6fa3b5', w: .14 }, gen: { col: '#d9b233', w: .12 } },
    lines: [{ room: 'north', col: '#d9b233', at: .5, w: .08 }, { room: 'south', col: '#d9b233', at: .5, w: .08 }, { room: 'west', col: '#d9b233', at: .5, w: .08 }, { room: 'east', col: '#c9412e', at: .5, w: .08 }],
    pads: [{ x: cx0 + 1.9, y: 4.9, w: 2.2, h: 2.2, col: '#d9b233' }, { x: cx0 + 2.05, y: 5.05, w: 1.9, h: 1.9, col: '#9aa3a8' }],
    ground: [{ x: -13, y: 1, w: 11, h: 13, k: 'asphalt' }, { x: -22, y: 6, w: 10, h: 3, k: 'asphalt' }, { x: -2, y: -2, w: W + 4, h: 19, k: 'concrete' }], clear: [{ x: -22, y: 5, w: 10, h: 5 }, { x: -13, y: 1, w: 11, h: 13 }] };
  shDeco(P, 'frontdesk', 2.6, 5.75, { col: '#2f8fa8' }); shDeco(P, 'sofa', 1.2, 9.2, { r: 2 }); shDeco(P, 'sofa', 3, 9.2, { r: 2, col: '#4f7f86' }); shDeco(P, 'plant', -.2, 5.8); shDeco(P, 'plant', 4.2, 9.2); shDeco(P, 'turnstile', 4.1, 7.5, { r: 1, n: 2 }); shDeco(P, 'tv', .6, 5.62); shDeco(P, 'watercooler', 4.2, 5.8); shDeco(P, 'biosign', 4.42, 6.4, { r: 3 }); shDeco(P, 'chairs', -.28, 8.6, { n: 2, r: 1 });
  shDeco(P, 'drums', -.2, 4.1); shDeco(P, 'drums', 4.1, .9); shDeco(P, 'pipe', 2, .72, { n: 4 }); shDeco(P, 'locker', .3, .78, { n: 2 }); shDeco(P, 'firebox', 4.42, 1.4, { r: 3 }); shDeco(P, 'hazsign', 3.4, .7); shDeco(P, 'acrates', 3.6, 4); shDeco(P, 'pipe', -.28, 2.5, { n: 3, r: 1 }); shDeco(P, 'tyres', .9, 3.9); shDeco(P, 'console', 1.6, 4.25, { n: 1, r: 2 });
  shDeco(P, 'shower', 6.5, .9); shDeco(P, 'locker', 7.3, 13.25, { n: 2, r: 2 }); shDeco(P, 'trolley', 5.8, 4.6); shDeco(P, 'gurney', 7.2, 10.4, { r: 1, blood: 1 }); shDeco(P, 'biosign', 5.62, 5.2, { r: 1 }); shDeco(P, 'cone', 6.2, 9.6); shDeco(P, 'barrier', 6.4, 11.6, { n: 1 }); shDeco(P, 'locker', 5.8, 10.6, { n: 2, r: 1 });
  shDeco(P, 'trolley', 9 + L / 2, .85); shDeco(P, 'biosign', 9.6, .62); shDeco(P, 'acrates', 9 + L - 1, .9); shDeco(P, 'gurney', 10.5, 13.2, { blood: 1 }); shDeco(P, 'trolley', 9 + L - 2, 13.2, { r: 1 }); shDeco(P, 'cone', 9 + L / 2, 12.2); shDeco(P, 'screen', 9 + L / 2 + 1.5, 13.25); shDeco(P, 'locker', 9 + L / 2 - 2, .78, { n: 3 }); shDeco(P, 'bin', 9 + L - 3, 2.2, { col: '#d9b233' });
  for (let j = 0; j < k; j++) for (const up of [1, 0]) { const x = 9 + j * 4, y0 = up ? 4 : 8, door = up ? y0 - .3 : y0 + 2.3, far = up ? y0 + 2.3 : y0 - .3, br = (j + up) % 2;
    shDeco(P, 'fumehood', x - .05, door, { r: up ? 0 : 2 }); shDeco(P, 'labbench', x + 1, far, { n: 1, r: up ? 2 : 0 }); shDeco(P, 'tube', x - .1, y0 + 1, { broken: br, col: (j + up) % 3 ? '#7fd6a4' : '#d6c87f' }); shDeco(P, 'whiteboard', x + 2.42, y0 + 1, { r: 3 }); shDeco(P, 'biosign', x + 1.9, up ? y0 - .38 : y0 + 2.38, { r: up ? 0 : 2 }); shDeco(P, 'bin', x + 1.6, y0 + 1.4 - up * .6, { col: '#d9b233' }); if (br) shDeco(P, 'glassbits', x + .7, y0 + 1.2); }
  shDeco(P, 'shower', ex + .5, .9); shDeco(P, 'barrier', ex + .5, 3.4, { n: 1 }); shDeco(P, 'sandbags', ex + .3, 8.4, { n: 1, r: 1 }); shDeco(P, 'gurney', ex - .2, 11, { r: 1, blood: 1 }); shDeco(P, 'biosign', ex + 1.42, 4.4, { r: 3 }); shDeco(P, 'cone', ex + 1.2, 7.4); shDeco(P, 'locker', ex + .7, 13.25, { n: 2, r: 2 }); shDeco(P, 'trolley', ex + 1.2, 10);
  shDeco(P, 'tube', cx0 + 2.5, 5.5, { broken: 1 }); shDeco(P, 'glassbits', cx0 + 3.3, 6.3); shDeco(P, 'glassbits', cx0 + 1.8, 4.8); shDeco(P, 'scorch', cx0 + 2.6, 6.9); for (let i = 0; i < 3; i++) { shDeco(P, 'tube', cx0 + .4 + i * 2.1, 2.95, { broken: i === 1, col: i % 2 ? '#d6c87f' : '#7fd6a4' }); shDeco(P, 'tube', cx0 + .4 + i * 2.1, 8.05, { broken: i === 2 }); }
  shDeco(P, 'console', cx0 + 5.3, 6.4, { r: 3, n: 1 }); shDeco(P, 'serverrack', cx0 + 5.25, 4.3, { n: 2, r: 3 }); shDeco(P, 'labbench', cx0 - .3, 3.4, { n: 1, r: 1 }); shDeco(P, 'fumehood', cx0 - .25, 7.6, { r: 1 }); shDeco(P, 'biosign', cx0 + 5.42, 7.8, { r: 3 }); shDeco(P, 'bars', cx0 + 4.4, 8.2, { n: 1 });
  shDeco(P, 'serverrack', cx0 + .5, 9.8, { n: 3 }); shDeco(P, 'filecab', cx0 + 4.6, 9.75, { n: 3 }); shDeco(P, 'shelves', cx0 + .7, 12.3, { n: 2, r: 2 }); shDeco(P, 'acrates', cx0 + 2.8, 12.1); shDeco(P, 'pipe', cx0 + 4, 12.3, { n: 2 }); shDeco(P, 'filecab', cx0 - .26, 11, { n: 2, r: 1 });
  shDeco(P, 'sign', -2.2, 4.8, { col: '#2f8fa8', r: 1 }); shDeco(P, 'guardbooth', -12.4, 5, { r: 3 }); shDeco(P, 'canopy', -1.4, 7.5); shDeco(P, 'bollard', -2.4, 6, { n: 2, r: 1 }); shDeco(P, 'bollard', -2.4, 9.2, { n: 2, r: 1 });
  shDeco(P, 'car', -5, 2.4, { col: '#c9c9c4', r: 1 }); shDeco(P, 'car', -7.2, 2.4, { col: '#3a5a7a', r: 1 }); shDeco(P, 'car', -10.4, 2.6, { col: '#7a2f2a', r: 1.1, wreck: 1 }); shDeco(P, 'car', -5, 12.4, { col: '#2f8fa8', r: 3 }); shDeco(P, 'car', -9.4, 12.2, { col: '#8a8f94', r: 2.8 }); shDeco(P, 'ambulance', -6.6, 7.6, { r: .1 });
  shDeco(P, 'lamp', -3.4, 1.4); shDeco(P, 'lamp', -3.4, 13.4); shDeco(P, 'lamp', -12, 13.4); shDeco(P, 'hedge', -1.7, 2.6, { n: 3, r: 1 }); shDeco(P, 'hedge', -1.7, 12.4, { n: 3, r: 1 }); shDeco(P, 'spheretank', W + 3, 3.4); shDeco(P, 'piperack', W + 2.6, 8.6, { r: 1 }); shDeco(P, 'drums', W + 1.6, 12); shDeco(P, 'hazsign', W + 1.2, 6);
  for (let fx = -15; fx < W + 5; fx += 6) { shDeco(P, 'fence', fx + 2.5, -3.5, { n: 6 }); shDeco(P, 'fence', fx + 2.5, 17.5, { n: 6 }); } for (const fy of [-3.5, 12.5]) shDeco(P, 'fence', -15.5, fy + 2.5, { n: 6, r: 1 }); shDeco(P, 'fence', -15.5, 4, { n: 2, r: 1 }); shDeco(P, 'fence', -15.5, 10.5, { n: 2, r: 1 });
  P.route = ['lobby', 'west', 'north', 'east']; P.startRoom = 'lobby'; P.bossRoom = 'contain'; P.start = { x: 1, y: 7 }; P.exit = { x: .6, y: 8 }; P.mystT = ['walker', 'lasher'];
  P.tasks = [{ k: 'carry', id: 'tables', label: 'Carry out the build-up tables' }, { k: 'boss', opt: true, label: 'Side: put down the Mutant' }]; P.botOrders = ['power', 'tables']; P.keyOnWin = ['proof2'];
  P.tip = 'No power: the lab is dark and the security doors are shut. The generator turns the lights on and opens every security door, and the cages with them. The tables are in the basement, behind Containment.';
  P.setup = (H) => { const amy = H.units.find((u) => /^Amy\b/.test(u.name)); if (amy) { H.doors.forEach((d, i) => { if (SH_DOORS[i][8] === 'sec' && !/^lab/.test(SH_DOORS[i][0])) { d.locked = false; SH_DOORS[i][7] = null; } }); setTimeout(() => say(`${amy.name}: "I parked in that spot for six years. The codes haven't changed." Containment's door will open for her.`, true), 2600); } };
  return P; }
SH_PLANS.lab7 = shPlanLab7;
SH_FX.power = (H) => { H.lit = true; H.doors.forEach((d, i) => { if (SH_DOORS[i][8] === 'sec') { d.open = true; d.locked = false; shReveal(SH_DOORS[i][0]); shReveal(SH_DOORS[i][1]); } }); for (const z of H.zs) if (z.hp > 0 && /^lab/.test(z.room || '')) { z.mode = 'idle'; z.hid = false; } banner('⚡ THE LIGHTS COME ON'); say('The lights flicker on. Every security door slides open, and the cages with them.'); SFX('alarm'); };

/* the Records Office: a tower of floors, shown side by side, ground floor on the left; stairs go up through each floor's middle office.
   House rule: Penhallow has the files shredded, from the top floor down: a clock for each floor. Carry out three crates of files. No boss. */
function shPlanRecords(lv) { /* 3D.320 real sizes: an office of 4 x 3 tiles (about 14 x 10 m) holds six desks; the landing is 3 wide */
  const F = shLvSize(lv, 3, 5, 6), W = F * 9, P = shNewPlan(W, 13, { theme: 'office', wall: '#d9d4c4', ground: '#8a8f94' });
  for (let f = 0; f < F; f++) { const x0 = f * 9, fl = f === 0 ? 'Reception' : `Floor ${f + 1}`; shRoom(P, `land${f}`, x0, 2, 3, 9, f === 0 ? 'Reception' : `${fl}: the landing`, '#c9c0a8');
    shRoom(P, `a${f}`, x0 + 4, 1, 4, 3, `${fl}: ${['Taste Reports', 'Complaints', 'Legal', 'Marketing', 'The Board Room'][f]}`, '#d9d4c4'); shRoom(P, `b${f}`, x0 + 4, 5, 4, 3, `${fl}: the stair hall`, '#cfc7b0'); shRoom(P, `c${f}`, x0 + 4, 9, 4, 3, `${fl}: ${['Filing', 'Archive', 'Memos', 'Payroll', 'The Vault'][f]}`, '#d9d4c4');
    shLink(P, `land${f}`, `a${f}`, false, null, 1); shLink(P, `land${f}`, `b${f}`); shLink(P, `land${f}`, `c${f}`, false, 9, 1); if (f) shLink(P, `b${f - 1}`, `land${f}`);
    for (const r of ['a', 'c']) { const [rx, ry] = P.rooms[`${r}${f}`]; shThing(P, 'shelf', rx + 1, ry); shThing(P, 'desk', rx + 3, ry + 2); shThing(P, 'files', rx + 3, ry, { carry: true, use: 3, label: `crate of ${f === 0 ? 'taste reports' : 'files'}`, task: 'files', floor: f, icon: '🗂' }); }
    P.spawn[`land${f}`] = f ? [['riot', 1], ['walker', 1 + Math.floor(lv / 10)]] : [['walker', 2]]; P.spawn[`a${f}`] = [['walker', 1 + (f % 2)]]; P.spawn[`c${f}`] = [[f >= 2 ? 'riot' : 'walker', 1]]; P.spawn[`b${f}`] = [['walker', 1]]; }
  /* 3D.319, 3D.320 it should look like an office tower: carpet in a different colour on each floor, rows of cubicles, filing cabinets and archive shelves, a board room, the vault, stairs in every stair hall, and shredders with heaps of shredded paper; a street, a plaza and the company sign outside */
  P.noEdgeProps = true; const CARP = ['#7f8fa3', '#7f9a86', '#a08a72', '#9a7f8c', '#8a2f2f'], cubCol = ['#8a97a8', '#8aa08f', '#a89a8a', '#a08a9a', '#8a97a8'];
  for (let f = 0; f < F; f++) { P.floor[`land${f}`] = f ? '#c2bca8' : '#cfc9b6'; P.floor[`a${f}`] = CARP[f % 5]; P.floor[`c${f}`] = f === 4 ? '#8f968f' : CARP[f % 5]; P.floor[`b${f}`] = '#b8b2a0'; }
  P.look = { noYard: 1, plain: 1, cap: '#b8b09a', dado: '#7a5a3c', dadoH: .3, door: '#8a6a44', lockDoor: '#5a3f2a', border: { land0: { col: '#8a6a44', w: .16 } }, planks: {}, ground: [{ x: -12, y: -4, w: 5, h: 22, k: 'asphalt' }, { x: -7, y: -4, w: W + 11, h: 22, k: 'paving' }], clear: [{ x: -12, y: -4, w: 5, h: 22 }, { x: -7, y: 2, w: 6, h: 9 }] };
  if (F > 4) P.look.planks.a4 = '#6a4a2e';
  for (let f = 0; f < F; f++) { const x0 = f * 9, ax = x0 + 4, ay = 1, cy = 9, cc = cubCol[f % 5];
    if (f === 0) { shDeco(P, 'frontdesk', 1.2, 1.75, { col: '#b0564a' }); shDeco(P, 'sofa', -.2, 8.6, { r: 1 }); shDeco(P, 'sofa', 1.3, 10.2, { r: 2, col: '#8a6a5a' }); shDeco(P, 'plant', -.2, 3); shDeco(P, 'plant', 2.2, 10.2); shDeco(P, 'turnstile', 1, 3.6, { n: 2 }); shDeco(P, 'tv', 2.42, 4.2, { r: 3 }); shDeco(P, 'table', .4, 9.6); }
    else { shDeco(P, 'cubicle', x0 - .1, 7.4, { col: cc, r: 1 }); shDeco(P, 'cubicle', x0 - .1, 8.2, { col: cc, r: 1, v: 1 }); shDeco(P, 'cubicle', x0 - .1, 9, { col: cc, r: 1 }); shDeco(P, 'watercooler', x0 - .2, 1.8); shDeco(P, 'copier', x0 + .9, 1.75); shDeco(P, 'vending', x0 + 2, 1.8); shDeco(P, 'plant', x0 + 2.2, 10.2); shDeco(P, 'chairs', x0 + .8, 10.25, { n: 3, r: 2, col: '#8a6a5a' }); shDeco(P, 'bin', x0 - .2, 3.4); }
    shDeco(P, 'stairs', ax + 2.1, 6.6, {}); shDeco(P, 'plant', ax - .2, 4.8); shDeco(P, 'whiteboard', ax + 1.6, 4.62); shDeco(P, 'bin', ax + 3.2, 4.8); shDeco(P, 'chairs', ax + 3.28, 5.6, { n: 2, r: 3 });
    if (f % 5 === 4) { shDeco(P, 'boardtable', ax + 1.4, ay + 1.2, { n: 2 }); shDeco(P, 'bookcase', ax + 2, ay - .38, { n: 1 }); shDeco(P, 'tv', ax - .42, ay + 2, { r: 1 }); shDeco(P, 'plant', ax - .2, ay + 2.3); }
    else if (f % 5 === 2) { shDeco(P, 'bookcase', ax + 2, ay - .38, { n: 1 }); shDeco(P, 'bookcase', ax + .9, ay + 2.38, { n: 2, r: 2 }); shDeco(P, 'cubicle', ax + 1.8, ay + 1.1, { col: cc, r: 2 }); shDeco(P, 'sofa', ax - .2, ay + 2, { r: 1, col: '#5a3f2a' }); }
    else { for (let i = 0; i < 3; i++) shDeco(P, 'cubicle', ax + .1 + i * .7, ay + 2.2, { col: cc, r: 2, v: i % 2 }); for (let i = 0; i < 2; i++) shDeco(P, 'cubicle', ax + 1.9 + i * .0, ay + .2 + i * 0, { col: cc }); shDeco(P, f % 5 === 3 ? 'whiteboard' : 'filecab', ax + (f % 5 === 3 ? 2 : -.26), ay + (f % 5 === 3 ? -.38 : .2), { n: 2, r: f % 5 === 3 ? 0 : 1 }); }
    shDeco(P, 'shredder', ax + 3.3, ay + 1, { r: 3 }); shDeco(P, 'paperpile', ax + 2.5, ay + 1.3, { s: .55 }); shDeco(P, 'bin', ax + .9, ay + 1.3);
    if (f % 5 === 4) { shDeco(P, 'vaultdoor', ax + 2, cy - .4); shDeco(P, 'shelves', ax + .9, cy + 2.3, { n: 2, r: 2 }); shDeco(P, 'acrates', ax + 2, cy + 1.2); }
    else if (f % 2) { shDeco(P, 'shelves', ax + 2, cy - .3, { n: 1 }); shDeco(P, 'shelves', ax + .9, cy + 2.3, { n: 2, r: 2 }); shDeco(P, 'shelves', ax + 1.7, cy + 1.1, { n: 1 }); }
    else { shDeco(P, 'filecab', ax + 2, cy - .28, { n: 2 }); shDeco(P, 'filecab', ax + .9, cy + 2.28, { n: 4, r: 2 }); shDeco(P, 'copier', ax + 1.6, cy + 1); }
    shDeco(P, 'shredder', ax + 3.3, cy + 1, { r: 3 }); shDeco(P, 'paperpile', ax + 2.5, cy + 1.4, { s: .55 }); }
  shDeco(P, 'sign', -2.4, 3.4, { col: '#b0564a', r: 1, dot: '#e0b23a' }); shDeco(P, 'canopy', -1.4, 6); shDeco(P, 'bollard', -3, 4.6, { n: 2, r: 1 }); shDeco(P, 'bollard', -3, 7.8, { n: 2, r: 1 }); shDeco(P, 'planter', -2, .6); shDeco(P, 'planter', -2, 11.6); shDeco(P, 'lamp', -6.4, 0); shDeco(P, 'lamp', -6.4, 12.6);
  shDeco(P, 'car', -9.6, 1, { col: '#3a5a7a', r: 0 }); shDeco(P, 'car', -9.4, 5.6, { col: '#c9c9c4', r: .15, wreck: 1 }); shDeco(P, 'bus', -9.6, 11.6, { r: 0 }); shDeco(P, 'paperpile', -4, 8.6, { s: 1.1 }); shDeco(P, 'paperpile', -5, 3.6, { s: .8 }); shDeco(P, 'bin', -3.6, 2.4);
  for (let hx = 3; hx < W - 2; hx += 6) { shDeco(P, 'hedge', hx, -1.6, { n: 3 }); shDeco(P, 'lamp', hx + 3, 14.4); shDeco(P, 'planter', hx + 1, 14.6); }
  P.route = ['land0']; P.startRoom = 'land0'; P.bossRoom = null; P.start = { x: 1, y: 5 }; P.exit = { x: .6, y: 6 }; P.mystT = ['walker', 'riot']; P.floors = F;
  P.tasks = [{ k: 'carry', id: 'files', need: 3, label: 'Carry out 3 crates of files' }]; P.botOrders = ['files']; P.keyOnWin = ['proof3'];
  P.tip = 'Penhallow is having the files shredded, from the top floor down: the clock shows the next floor. Three crates out the front door is enough.';
  P.setup = (H) => { H.shredF = F - 1; H.clock = (75 + 15 * F) * 60; H.shredAt = H.t + H.clock; setTimeout(() => say('📢 Penhallow, on every speaker: "This building is for staff only. Staff only! Shred everything, top floor first."', true), 2200); };
  P.tick = (H) => { if (H.shredF < 0) return; H.clock = Math.max(0, H.shredAt - H.t); if (H.clock > 0) return; const f = H.shredF--; for (const t of H.things) if (t.floor === f && t.carried == null && !t.delivered) { t.out = true; t.done = true; t.lost = true; } for (const r of ['a', 'c']) { const [x, y, w, h] = H.plan.rooms[`${r}${f}`]; H.zones.push({ k: 'shred', x, y, w, h }); }
    banner(`🗑 FLOOR ${f + 1} IS SHREDDED`); say(f ? `Floor ${f + 1} is gone to the shredders. Floor ${f} is next.` : 'The last of the files are in the shredders.'); if (H.shredF >= 0) { H.shredAt = H.t + 3600; H.clock = 3600; }
    const left = H.things.filter((t) => t.task === 'files' && !t.lost).length; if (left < 3) say('Not enough files left for three crates. Get out with what you have.'); };
  return P; }
SH_PLANS.records = shPlanRecords;

/* the Dusk Radio Mast: a path that winds up the hill through the ring of the dead, the fenced yard at the top, the shed studio.
   House rule: the ring is blind and listens: they wake for a gunshot nearby or someone brushing past. Then a hold: someone works the line
   at the shed for a minute while the ring comes up the path. No boss. */
function shPlanMast(lv) { const m = shLvSize(lv, 3, 5, 6), Hh = 7 + m * 4, P = shNewPlan(30, Hh, { theme: 'camp', wall: '#6a5a44', ground: '#6f7f4a', noEdgeProps: true });
  shRoom(P, 'yard', 6, 0, 16, 6, 'The Mast Yard', '#8a8a6a'); shRoom(P, 'shed', 23, 1, 5, 4, "Moth's Shed", '#9a8a6a'); shLink(P, 'yard', 'shed');
  for (let k = 0; k < m; k++) { const y = 7 + (m - 1 - k) * 4, id = `path${k}`; shRoom(P, id, 1, y, 26, 3, k === 0 ? 'The Foot of the Hill' : k === m - 1 ? 'The Last Bend' : 'The Hill Path', '#7a8a52');
    if (k) shLink(P, `path${k - 1}`, id, false, k % 2 ? 24 : 2); P.spawn[id] = k ? [['walker', 2 + Math.floor(lv / 6)]] : [['walker', 1]];
    for (let i = 0; i < 2 + Math.floor(lv / 7); i++) shThing(P, 'listener', 4 + ((i * 7 + k * 5) % 21), y + 1, { sleeper: 'walker', deaf: true }); }
  shLink(P, `path${m - 1}`, 'yard', false, m % 2 ? 7 : 18);
  shThing(P, 'mast', 12, 2); shThing(P, 'speaker', 8, 1); shThing(P, 'hold', 25, 3, { use: 2, fast: ['Engineer', 'Mechanic'], label: 'Fix the line to the valley', icon: '📡', sub: 'Someone stays in the ring for a minute while it works', fx: 'hold', r: 2.4, secs: 60, task: 'line' });
  P.spots = { path: { x: 13, y: 8 }, yardw: { x: 7, y: 3 } }; P.waves = [{ onHold: 1, from: 'path', list: [['walker', 3 + Math.floor(lv / 4)]], say: 'The ring heard the mast: they are coming up the path.' }, { onHold: 18, from: 'yardw', list: [['walker', 3], ['runner', 1 + Math.floor(lv / 8)]] }, { onHold: 36, from: 'path', list: [['walker', 4 + Math.floor(lv / 4)], ['runner', 2]] }, { onHold: 50, from: 'yardw', list: [['brute', lv > 15 ? 1 : 0], ['walker', 3]].filter((q) => q[1]) }];
  for (let k = 0; k < m; k++) P.dark[`path${k}`] = 0;
  P.route = [...Array.from({ length: m }, (_, k) => `path${k}`), 'yard', 'shed']; P.startRoom = 'path0'; P.bossRoom = null; P.start = { x: 1.5, y: 7 + (m - 1) * 4 }; P.exit = { x: 1, y: 8 + (m - 1) * 4 }; P.mystT = ['walker', 'walker'];
  P.tasks = [{ k: 'hold', secs: 60, label: 'Fix the line: hold the shed for a minute' }]; P.botOrders = ['line']; P.keyOnWin = ['mixtape'];
  P.tip = "The dead on the hill are blind and listen for you: a gunshot wakes everything near it, and so does brushing past one. Melee and bows are quiet. At the top, someone fixes the line at Moth's shed while the rest hold the yard.";
  return P; }
SH_PLANS.mast = shPlanMast;
SH_FX.hold = (H, t) => { H.hold = { on: true, thing: H.things.indexOf(t), p: 0 }; t.done = true; banner('📡 HOLD THE SHED'); say('The line is open. Keep someone in the ring by the shed for a minute.'); };
/* where the story strongholds sit in the trip list (until the story's scenes are built they open by level; the Mast waits for the three proofs) */
Object.assign(SH_DEFS, {
  lab7: { tough: 1.6, rec: 900, areas: [{ name: 'Reception', spawn: [] }, { name: 'The Security Ring', spawn: [] }, { name: 'Containment', spawn: [] }], floor: ['#c5cacc', '#b8bdbf', '#aeb4b6'], wall: '#e4e8ea', props: 'clinic', side: 'The Generator Room', wings: ['Lab 7A', 'Lab 7B'] },
  records: { tough: 1.6, rec: 950, areas: [{ name: 'Reception', spawn: [] }, { name: 'The Stairs', spawn: [] }, { name: 'The Board Room', spawn: [] }], floor: ['#c9c0a8', '#cfc7b0', '#d9d4c4'], wall: '#d9d4c4', props: 'clinic', side: 'Filing', wings: ['Legal', 'Payroll'] },
  mast: { tough: 1.6, rec: 1000, areas: [{ name: 'The Foot of the Hill', spawn: [] }, { name: 'The Hill Path', spawn: [] }, { name: "Moth's Shed", spawn: [] }], floor: ['#7a8a52', '#7a8a52', '#8a8a6a'], wall: '#6a5a44', props: 'camp', side: 'The Yard', wings: ['The Path', 'The Path'] } });
const shProofs = () => ['proof1', 'proof2', 'proof3'].filter((k) => (S.keyItems || {})[k]).length;
Object.assign(EXP_DEFS, {
  lab7: { name: 'Helix Lab 7', icon: '🧪', desc: "Amy's old lab, sealed. The night shift is still inside. The build-up tables are in the basement safe. Probably fine.", risks: ['high'], lock: () => ((S.lvl || 1) >= 17 ? '' : 'Needs Haven level 17'), loot: { meds: [3, 5], mat: [3, 5], fuel: [1, 2] }, gear: 3.5, stronghold: true, lines: ['The squad forces the lab doors.'] },
  records: { name: 'The Records Office', icon: '🗄', desc: "Sunnyside's tower of files, next to the plant. Every memo, every complaint, every taste report. Staff only.", risks: ['high'], lock: () => ((S.lvl || 1) >= 18 ? '' : 'Needs Haven level 18'), loot: { mat: [4, 6], cloth: [2, 4], ammo: [8, 12] }, gear: 3.5, stronghold: true, lines: ['The squad slips in past reception.'] },
  mast: { name: 'The Dusk Radio Mast', icon: '📡', desc: "Moth's hilltop mast, ringed by the dead his broadcasts drew. Bring the proof up the hill.", risks: ['high'], lock: () => ((S.lvl || 1) < 19 ? 'Needs Haven level 19' : shProofs() < 3 ? `Bring all three proofs first (${shProofs()} of 3)` : ''), loot: { food: [3, 5], meds: [2, 3], fuel: [1, 2] }, gear: 3.5, stronghold: true, lines: ['The squad starts up the hill.'] } });

/* ---- 3D.283 Shut the Line: the Sunnyside plant as three campaign strongholds (13-LONG-GAME.md 7.3; 09-STORY.md S1 to S3), the hardest in the game.
   Each opens after the one before. B8: friends in the fight: a friendly faction sends people who fight beside the squad. ---- */
const shAllyOf = (k) => { const f = (S.fac || {})[k]; return !!(f && (f.ally || (f.att || 0) >= 60)); };
function shAllies(H, list) { for (const [job, wpn, nm, fk] of list) { const q = mk(nm, job, Math.min(14, (H.lvl || 15) - 2), 0, 0, H.units.length); q.eq = { weapon: ITEMS[wpn] ? wpn : 'bat', armor: null, head: null, acc: null }; setMaxHp(q); q.hp = q.max; q.ammo = 99; q.id = 70000 + H.units.length; q.ally = fk; q.stance = 'attack'; q.mode = 'free'; q.target = null; q.moving = false; q.abT = 0; q.crit = 0;
    const i = H.units.length; q.w = shWorld(H.plan.start.x + 2 + (i % 3) * .9, H.plan.start.y + Math.floor(i / 3) * 1.1); H.units.push(q); } }
/* the Gate: the open road up to the plant wall, guard towers either side of the gate, the courtyard behind it */
function shPlanGate(lv) { const P = shNewPlan(40, 22, { theme: 'plant', wall: '#6f7780', ground: '#7d776c', noEdgeProps: true });
  shRoom(P, 'road', 0, 6, 22, 11, 'The Road to the Plant', '#8a8378'); shRoom(P, 'twrN', 23, 2, 4, 5, 'The North Tower', '#6f7780'); shRoom(P, 'twrS', 23, 16, 4, 5, 'The South Tower', '#6f7780');
  shRoom(P, 'court', 23, 8, 16, 7, 'The Courtyard', '#7d776c'); shRoom(P, 'post', 28, 0, 10, 7, "Captain Vance's Post", '#73765f');
  const gd = shLink(P, 'road', 'court', true, null, 3); P.doors[gd][7] = 'heavy'; P.gateDoor = gd; shLink(P, 'court', 'twrN', true, 24, 1); shLink(P, 'court', 'twrS', true, 24, 1); shLink(P, 'court', 'post', false, 31);
  shThing(P, 'ram', 3, 11, { carry: true, use: 3, label: 'battering ram', task: 'ram', icon: '🪵', toSpot: { x: 21, y: 11 }, fx: 'ram', sub: 'Push it to the gate: slow, and no fighting while you push' });
  for (const [x, y] of [[8, 8], [14, 13], [18, 9]]) shThing(P, 'sandbags', x, y);
  P.spawn.road = [['walker', 3]]; P.spawn.court = [['raiderG', 2 + Math.floor(lv / 8)], ['raider', 3]]; P.spawn.post = [['raiderG', 2]];
  P.posts = { twrN: [['raiderG', 2]], twrS: [['raiderG', 2]] };   /* riflemen on the towers: they stay up there and shoot whoever comes in range */
  P.boss = { room: 'post', type: 'raider', name: 'Captain Vance', hp: 900, atk: 18, big: 1.2, spd: .016, wpn: 'rifle', pat: 'gun', patGap: 420 };
  P.route = ['road', 'court', 'post']; P.startRoom = 'road'; P.bossRoom = 'post'; P.start = { x: 1, y: 9 }; P.exit = { x: .6, y: 10 }; P.mystT = ['raider', 'raiderG'];
  P.tasks = [{ k: 'carry', id: 'ram', label: 'Ram the gate' }, { k: 'boss', label: 'Beat Captain Vance' }]; P.botOrders = ['ram']; P.campaign = 'gate';
  P.tip = 'The gate is too heavy to force: push the ram up the road to it while the rest cover. Riflemen on the towers shoot whoever comes in range.';
  P.setup = (H) => { shReveal('twrN'); shReveal('twrS'); if (shAllyOf('quar')) { const d = H.doors[P.gateDoor]; d.open = true; d.broken = true; d.locked = false; const t = H.things.find((q) => q.task === 'ram'); t.delivered = true; t.done = true; shReveal('court'); shAllies(H, [['Guard', 'rifle', 'Major Okafor', 'quar'], ['Guard', 'rifle', 'Pvt. Dale', 'quar']]);
      setTimeout(() => say('Major Okafor: "My orders say protect this plant. They were written by the man who signed that contract." She opens the gate and comes in with you.', true), 2200); } };
  return P; }
/* the Line: the factory floor, conveyor belts, the vats that keep feeding the dead in until their valve is shut, the foreman's office */
function shPlanLine(lv) { const P = shNewPlan(44, 24, { theme: 'plant', wall: '#5f666e', ground: '#5f5a56', noEdgeProps: true });
  shRoom(P, 'dock', 0, 8, 7, 8, 'The Loading Dock', '#77736d'); shRoom(P, 'floor', 8, 3, 26, 18, 'The Factory Floor', '#827a70'); shRoom(P, 'office', 35, 7, 9, 10, "The Foreman's Office", '#6c6862'); shRoom(P, 'catwalk', 8, 0, 26, 2, 'The Catwalk', '#5f666e');
  shLink(P, 'dock', 'floor'); shLink(P, 'floor', 'office'); shLink(P, 'floor', 'catwalk', false, 9, 2);
  P.belts = []; for (const [y, dx] of [[7, 1], [12, -1], [17, 1]]) { P.zones.push({ k: 'belt', x: 9, y, w: 24, h: 1, dx, id: 'belt' + y }); shThing(P, 'belt', 9, y, { w: 24 }); }
  const vats = [[12, 4], [20, 4], [28, 4]]; vats.forEach(([x, y], i) => { shThing(P, 'vat', x, y, { look: '#c9a644' }); shThing(P, 'valve', x + 2, y + 15, { use: 4, fast: ['Mechanic', 'Engineer'], label: `Shut valve ${i + 1}`, icon: '🔧', task: 'valves', vat: i, need: i ? 'v' + (i - 1) : null, needText: `Shut valve ${i} first`, fx: 'vat' }); });
  P.things.filter((t) => t.k === 'valve').forEach((t, i) => { t.task = 'v' + i; });
  for (const [x, y] of [[36, 9], [40, 13]]) shThing(P, 'desk', x, y);
  shThing(P, 'lever', 33, 10, { use: 2, label: 'Stop the belts', icon: '⏹', sub: 'Every belt stops', fx: 'belts', task: 'belts' });
  P.spawn.dock = [['walker', 2]]; P.spawn.floor = [['bloated', 3 + Math.floor(lv / 8)], ['walker', 6], ['runner', 2]]; P.spawn.catwalk = [['walker', 2]]; P.spawn.office = [['bloated', 1], ['walker', 2]];
  P.boss = { room: 'office', type: 'butcher', name: 'The Butcher', hp: 1600, atk: 21, big: 1.4, spd: .011, pat: 'slam' };
  P.route = ['dock', 'floor', 'office']; P.startRoom = 'dock'; P.bossRoom = 'office'; P.start = { x: 1, y: 10 }; P.exit = { x: .6, y: 11 }; P.mystT = ['walker', 'bloated'];
  P.tasks = [{ k: 'use', id: 'v0', label: 'Valve 1' }, { k: 'use', id: 'v1', label: 'Valve 2' }, { k: 'use', id: 'v2', label: 'Valve 3' }, { k: 'boss', label: 'Beat the Butcher' }]; P.botOrders = ['v0', 'v1', 'v2', 'belts']; P.campaign = 'line';
  P.tip = 'The belts carry anyone standing on them; the lever by the office stops them all. Each vat keeps feeding the dead in until its valve is shut: valve 1, then 2, then 3.';
  P.setup = (H) => { H.vatAt = H.t + 1200; const fr = []; if (shAllyOf('foundry')) fr.push(['Mechanic', 'sledge', 'The Forgemaster', 'foundry'], ['Guard', 'sledge', 'Foundry hand', 'foundry']); if (shAllyOf('toll')) fr.push(['Guard', 'roadsign', 'Rook', 'toll'], ['Guard', 'spikedclub', 'Toll King', 'toll']);
    if (fr.length) { shAllies(H, fr); setTimeout(() => say(fr.some((q) => q[2] === 'Rook') ? 'Bikes burst in through the dock. Rook: "Can\'t let my sister have all the fun."' : 'The Forgemaster: "We built half this line. We know where it\'s weak."', true), 2400); } };
  P.tick = (H) => { if (H.t >= H.vatAt) { H.vatAt = H.t + 1500; H.plan.things.forEach(() => 0); H.things.filter((t) => t.k === 'vat').forEach((t, i) => { if ((H.shutVat || {})[i]) return; const zd = zombieTypes.bloated, w = shWorld(t.x, t.y + 1.6); H.zs.push({ type: i === 1 ? 'walker' : 'bloated', room: 'floor', w, hp: zd.hp, max: zd.hp, atk: zd.atk, spd: (zd.chase || .012) * 1.25, mode: 'idle', stateTicks: 0, target: null, moving: false, phase: rnd() * 100 }); shFx(w, '🫙 Out of the vat', '#ff6e62'); }); } };
  return P; }
/* the Tanks: the tank hall, pipe bridges, the pump bays; gas leaks from each tank until its pump is sealed (a hold while it runs) */
function shPlanTanks(lv) { const P = shNewPlan(42, 24, { theme: 'plant', wall: '#7c858e', ground: '#5f5a56', noEdgeProps: true });
  shRoom(P, 'pipes', 0, 8, 8, 8, 'The Pipe Bridge', '#6f7780'); shRoom(P, 'hall', 9, 2, 22, 20, 'The Tank Hall', '#7d776c'); shRoom(P, 'last', 32, 6, 10, 12, 'The Last Tank', '#6c6862');
  shLink(P, 'pipes', 'hall'); const ld = shLink(P, 'hall', 'last', true, null, 2); P.doors[ld][7] = 'heavy'; P.lastDoor = ld;
  const tanks = [[13, 6], [24, 6], [13, 16], [24, 16]].slice(0, 3 + (lv >= 18 ? 1 : 0)); tanks.forEach(([x, y], i) => { shThing(P, 'tank', x, y, { look: '#d9b233' }); P.zones.push({ k: 'gas', x: x - 2, y: y - 2, w: 5, h: 5, id: 'gas' + i }); shThing(P, 'pump', x + 3, y, { use: 2, label: `Seal tank ${i + 1}`, icon: '🛢', sub: 'Then hold by it for 20 s while the pump runs', fx: 'seal', tank: i, task: 'seal', r: 2.2, secs: 20, oneAtATime: true, needText: 'One pump at a time: finish the tank that is running' }); });
  shThing(P, 'tank', 37, 12, { look: '#c9412e' }); shThing(P, 'jar', 34, 9, { carry: true, use: 3, label: 'sample from the last Freshlock tank', task: 'last', icon: '🧪' });
  P.spawn.pipes = [['walker', 3]]; P.spawn.hall = [['bloated', 3 + Math.floor(lv / 7)], ['walker', 6], ['riot', 2]]; P.spawn.last = [['bloated', 2], ['walker', 2]];
  P.boss = { room: 'hall', type: 'bloater', name: 'The Head of Taste', hp: 1800, atk: 20, big: 1.55, spd: .009, pat: 'summon', kin: 'bloated', kinN: 2, patGap: 660 };
  P.route = ['pipes', 'hall']; P.startRoom = 'pipes'; P.bossRoom = 'hall'; P.start = { x: 1, y: 10 }; P.exit = { x: .6, y: 11 }; P.mystT = ['walker', 'bloated'];
  P.tasks = [{ k: 'flag', id: 'seal', flag: 'sealed', label: 'Seal the tanks' }, { k: 'boss', label: 'Beat the Head of Taste' }, { k: 'carry', id: 'last', opt: true, label: 'Side: a sample from the last tank' }]; P.botOrders = ['seal', 'last']; P.campaign = 'tanks'; P.keyOnWin = ['last_tank'];
  P.tip = 'Gas leaks round every tank until it is sealed: start its pump, then keep someone by it for 20 seconds. The last tank opens when every tank is sealed.';
  P.tick = (H) => { if (H.lastOpen) return; const ts = H.things.filter((t) => t.task === 'seal'); if (ts.length && ts.every((t) => t.sealed)) { H.lastOpen = true; const d = H.doors[P.lastDoor]; d.open = true; d.locked = false; shReveal('last'); banner('🛢 EVERY TANK IS SEALED'); say('The last tank\'s door unlocks with a hiss.'); } };
  return P; }
Object.assign(SH_PLANS, { plant_gate: shPlanGate, plant_line: shPlanLine, plant_tanks: shPlanTanks });
SH_FX.ram = (H) => { const d = H.doors[H.plan.gateDoor]; d.open = true; d.broken = true; d.locked = false; shReveal('court'); banner('🪵 THE GATE GIVES WAY'); SFX('hit'); (window.ZH_BOOMS ||= []).push({ ...shDoorW(H.plan.gateDoor), r: 1.5, burn: false, t: performance.now() }); for (const z of H.zs) if (z.room === 'court' && z.hp > 0) z.mode = 'idle'; };
SH_FX.vat = (H, t) => { (H.shutVat ||= {})[t.vat] = true; say(`Valve ${t.vat + 1} is shut: that vat is empty.`); if (Object.keys(H.shutVat).length >= 3) say('The line shudders and slows. Nothing more comes out of the vats.'); };
SH_FX.belts = (H) => { for (const z of H.zones) if (z.k === 'belt') z.on = false; say('The belts grind to a stop.'); };
SH_FX.seal = (H, t) => { H.hold = { on: true, thing: H.things.indexOf(t), p: 0, seal: t.tank }; say(`Tank ${t.tank + 1}'s pump is running: stay by it.`); };
Object.assign(SH_DEFS, {
  plant_gate: { tough: 1.7, rec: 1100, areas: [{ name: 'The Road', spawn: [] }, { name: 'The Courtyard', spawn: [] }, { name: "Vance's Post", spawn: [] }], floor: ['#8a8378', '#7d776c', '#73765f'], wall: '#6f7780', props: 'camp', side: 'A tower', wings: ['North tower', 'South tower'] },
  plant_line: { tough: 1.8, rec: 1200, areas: [{ name: 'The Dock', spawn: [] }, { name: 'The Factory Floor', spawn: [] }, { name: "The Foreman's Office", spawn: [] }], floor: ['#77736d', '#827a70', '#6c6862'], wall: '#5f666e', props: 'camp', side: 'The Catwalk', wings: ['', ''] },
  plant_tanks: { tough: 1.9, rec: 1300, areas: [{ name: 'The Pipe Bridge', spawn: [] }, { name: 'The Tank Hall', spawn: [] }, { name: 'The Last Tank', spawn: [] }], floor: ['#6f7780', '#7d776c', '#6c6862'], wall: '#7c858e', props: 'camp', side: '', wings: ['', ''] } });
const shPlantLock = (need) => () => ((S.lvl || 1) < 20 ? 'Needs Haven level 20' : !(S.shCleared || {}).mast ? 'After the broadcast (the Dusk Radio Mast)' : need && !(S.plant || {})[need] ? `Take the ${need === 'gate' ? 'Gate' : 'Line'} first` : (S.plant || {})[{ '': 'gate', gate: 'line', line: 'tanks' }[need || '']] ? 'Taken' : '');
Object.assign(EXP_DEFS, {
  plant_gate: { name: 'The Plant: the Gate', icon: '🏭', desc: 'Shut the Line, part one. The plant wall, the gate, and Quarantine Command on the towers. Orders are orders.', risks: ['high'], lock: shPlantLock(''), loot: { ammo: [12, 18], mat: [4, 6] }, gear: 4, stronghold: true, lines: ['The squad goes up the road to the plant.'] },
  plant_line: { name: 'The Plant: the Line', icon: '⚙', desc: 'Shut the Line, part two. The factory floor still runs. So does the Beef Stew line.', risks: ['high'], lock: shPlantLock('gate'), loot: { mat: [6, 9], fuel: [2, 4] }, gear: 4, stronghold: true, lines: ['The squad steps onto the factory floor.'] },
  plant_tanks: { name: 'The Plant: the Tanks', icon: '🛢', desc: 'Shut the Line, part three. The last of the Freshlock, and the Head of Taste.', risks: ['high'], lock: shPlantLock('line'), loot: { mat: [6, 9], meds: [3, 5] }, gear: 4.5, stronghold: true, lines: ['The squad climbs onto the pipe bridge.'] } });

/* 3D.283 conveyor belts (the Line): whoever stands on a running belt is carried along it */
function shBelts(H, live) { for (const o of [...live, ...H.zs.filter((z) => z.hp > 0 && !z.boss)]) { const z = shZoneAt(H, o.w); if (!z || z.k !== 'belt') continue; const nw = { x: o.w.x + z.dx * .02, y: o.w.y }, c = shCell(nw); if (shOpen(c.x, c.y, 'u') === true) o.w = nw; } }

/* ---- 3D.302 Strongholds chat, the rework (owner, 22 Nov, W232: "the dead are where they died... killed is killed"; W235: sealed places keep one size;
   15-STRONGHOLDS.md section 10). A sealed place REMEMBERS between visits: who was killed stays dead, opened and broken doors stay open, what was
   worked or carried out stays done, the locked rooms keep what they held. A lost or abandoned run is not wasted: the next visit carries on.
   When its main goals are done the place is SECURED and is not a fight any more. Kept in S.shMem[dest]. Seasonal places and faction camps do
   not remember (the seasons bring the dead back; the living rebuild). Practice runs never touch it. ---- */
const SH_SIZE = { clinic: 6, prison: 9, lab7: 17, records: 18, mast: 19 };   /* the level each sealed place is built for: its own size, whatever the town's level */
const shRemembers = (dest) => !!SH_DEFS[dest] && !SH_DEFS[dest].raid && !dest.startsWith('sh_');
const shMemOf = (dest) => (S.shMem || {})[dest] || null;
const shSecured = (dest) => !!(shMemOf(dest) || {}).secured;
const shMemLvl = (dest) => (shRemembers(dest) ? (shMemOf(dest) || {}).lvl || SH_SIZE[dest] || 0 : 0);
function shMemSave(H, won) { if (!H || H.practice || H.camp || !shRemembers(H.dest)) return; const M = (S.shMem ||= {})[H.dest] ||= { dead: [], visits: 0 };
  M.lvl = H.lvl; M.doors = H.doors.map((d) => d.was || [d.open ? 1 : 0, d.locked ? 1 : 0, d.broken ? 1 : 0]); M.rev = { ...H.rev }; M.myst = JSON.parse(JSON.stringify(H.myst || {})); M.spawnQ = JSON.parse(JSON.stringify(H.spawnQ || []));
  M.things = H.things.map((t) => { const o = { ...t, prog: 0 }; delete o.carried; if ((o.fx === 'hold' || o.fx === 'seal') && !o.sealed) o.done = false; return o; }); M.zones = JSON.parse(JSON.stringify(H.zones || []));
  M.dead = [...new Set([...(M.dead || []), ...H.zs.filter((z) => z.key && z.hp <= 0).map((z) => z.key)])]; M.left = H.zs.filter((z) => z.key && z.hp > 0).length + (H.shutZs || []).length; if (H.unsealed) M.unsealed = { ...(M.unsealed || {}), ...H.unsealed }; if (H.whoNew) M[H.plan.who.flag] = S.day;
  for (const k of ['lit', 'shut', 'shutVat', 'lastOpen', 'bossDown']) if (H[k] != null) M[k] = JSON.parse(JSON.stringify(H[k])); if (H.shredF != null) M.shredF = H.shredF;
  M.tasks = (H.tasks || []).map((T) => !!T.done); M.day = S.day; if (won) M.secured = S.day; }
function shMemLoad(H, stage) { const M = !H.practice && shRemembers(H.dest) ? shMemOf(H.dest) : null;
  if (stage === 0) { if (!M || !M.doors) return; H.again = true;   /* before anyone is put in the rooms: the place as it was left */
    M.doors.forEach((q, i) => { const d = H.doors[i]; if (d) { d.open = !!q[0]; d.locked = !!q[1]; d.broken = !!q[2]; } }); H.rev = { ...M.rev, [H.plan.startRoom]: 1 }; H.myst = JSON.parse(JSON.stringify(M.myst)); H.spawnQ = JSON.parse(JSON.stringify(M.spawnQ));
    H.things = JSON.parse(JSON.stringify(M.things)); H.zones = JSON.parse(JSON.stringify(M.zones)); for (const k of ['lit', 'shut', 'shutVat', 'lastOpen', 'bossDown']) if (M[k] != null) H[k] = JSON.parse(JSON.stringify(M[k]));
    H.tasks.forEach((T, i) => { if (M.tasks && M.tasks[i] && T.k !== 'hold') T.done = true; }); return; }
  H.zs.forEach((z, i) => { z.key = 'z' + i; });   /* the same plan puts the same dead in the same order, so the order is each one's name */
  if (!M || !M.doors) return; const gone = new Set(M.dead || []); H.zs = H.zs.filter((z) => !gone.has(z.key)); for (const z of H.zs) z.hid = !H.rev[z.room];
  if (M.shredF != null && H.shredF != null) { H.shredF = M.shredF; if (H.shredF >= 0) { H.shredAt = H.t + 3600; H.clock = 3600; } else H.clock = 0; }
  const n = (M.dead || []).length; setTimeout(() => say(`The squad goes back in. What they killed last time is still dead (${n}), and the doors they opened are still open.`, true), 900); }

/* ---- 3D.304 story locks on rooms (the rework, step 2; 15-STRONGHOLDS.md 10.3 and 10.12). A sealed place has inner rooms the story has not opened yet.
   A shut room cannot be forced or blown open; what is in it is left alone this visit; the squad does what it can, leaves, and comes back when the
   reason is met. Once a room has been open on a visit it stays open. Practice runs have no story locks. ---- */
const SH_STORY = {
  clinic: [{ room: 'theatre', who: 1, why: () => ((shMemOf('clinic') || {}).doctor ? '' : 'The theatre is bolted from the inside. Somebody who worked here would know the staff way in: she may still be in the wards') }],
  prison: [{ room: 'control', why: () => { const f = (S.fac || {}).quar; return (S.keyItems || {}).proof1 || (f && f.met && (f.ally || (f.att || 0) >= 20)) ? '' : "The control room has an army seal: Quarantine Command shut the prison in the first week. Get on Command's good side, or take their keys from Checkpoint Bravo"; } }],
  lab7: [{ room: 'base', why: () => ((S.fac || {}).helix && S.fac.helix.met ? '' : "The basement stair is behind a wall panel: only Voss's plans show which one. Meet Helix first") }],
};
const shStoryLocks = (dest) => (SH_STORY[dest] || []).filter((L) => !((shMemOf(dest) || {}).unsealed || {})[L.room]).map((L) => ({ room: L.room, text: L.why() })).filter((L) => L.text);
function shStoryApply(H) { H.sealed = {}; H.shutZs = []; H.unsealed = {}; if (H.practice || H.camp || !H.plan) return; const shut = shStoryLocks(H.dest);
  for (const L of SH_STORY[H.dest] || []) if (!shut.some((q) => q.room === L.room)) H.unsealed[L.room] = 1;   /* open on this visit: it stays open */
  for (const L of shut) { if (!SH_ROOMS[L.room]) continue; H.sealed[L.room] = L.text;
    SH_DOORS.forEach((D, i) => { if (D[0] !== L.room && D[1] !== L.room) return; const d = H.doors[i]; d.was = [d.open ? 1 : 0, d.locked ? 1 : 0, d.broken ? 1 : 0]; d.open = false; d.broken = false; d.locked = true; d.sealed = L.text; });
    delete H.rev[L.room]; delete H.woke[L.room]; }
  if (!Object.keys(H.sealed).length) return;
  H.shutZs = H.zs.filter((z) => H.sealed[z.room] && z.hp > 0); H.zs = H.zs.filter((z) => !H.sealed[z.room]);   /* whatever is in there stays in there */
  for (const T of H.tasks) { const r = T.k === 'boss' ? H.plan.boss && H.plan.boss.room : (H.things.find((t) => t.task === T.id && H.sealed[t.room]) || {}).room; if (r && H.sealed[r] && !T.done) { T.shut = r; if (!T.opt) H.stuck = r; } }
  const nm = Object.keys(H.sealed).map((r) => H.plan.names[r] || r).join(', '); setTimeout(() => say(`🔐 Shut for now: ${nm}. ${Object.values(H.sealed)[0]}.`, true), 2200); }
/* the room that holds the place's own survivor is never a nest or a cache: rolled over before anyone is put in the rooms */
function shStoryMyst(H) { const W = H.plan && H.plan.who; if (!W || H.practice || !H.myst || !H.myst[W.room]) return; H.myst[W.room] = { kind: 'survivor', who: 1, loot: { meds: 1 }, items: [] }; H.spawnQ = (H.spawnQ || []).filter((q) => q[0] !== W.room); }
function shStoryWho(H, at) { const W = H.plan && H.plan.who; if (!W || H.who || H.practice) return; H.who = true; if ((shMemOf(H.dest) || {})[W.flag]) return; H.whoNew = true;
  shFx(at, `🙋 ${W.name}`, '#7be08a'); SFX('reward'); banner(`🙋 ${W.name.toUpperCase()} IS ALIVE`); say(`A ward door opens from the inside. ${W.name}: "Living people. I bolted the theatre myself, with him in it. Here: the staff way in. Then take me home."`, true);
  for (const L of SH_STORY[H.dest] || []) if (L.who && H.sealed[L.room]) shStoryOpen(H, L.room); }   /* 3D.307 (owner, W240: one visit): finding her opens the theatre there and then */
function shStoryOpen(H, room) { if (!H.sealed || !H.sealed[room]) return; delete H.sealed[room]; H.unsealed[room] = 1;
  SH_DOORS.forEach((D, i) => { if (D[0] !== room && D[1] !== room) return; const d = H.doors[i]; if (d.was) { d.open = !!d.was[0]; d.locked = !!d.was[1]; d.broken = !!d.was[2]; } delete d.was; delete d.sealed; });
  H.zs.push(...H.shutZs.filter((z) => z.room === room)); H.shutZs = H.shutZs.filter((z) => z.room !== room);
  for (const T of H.tasks) if (T.shut === room) delete T.shut; if (H.stuck === room) { H.stuck = null; H.stuckT = 0; }
  say(`🔓 ${H.plan.names[room] || 'The room'} can be opened now.`); shPanel(); }
/* twice a second: the Clinic's doctor comes out when the corridor outside her ward is quiet; and the squad is told when nothing more can be done today */
function shStoryTick(H, live) { const P = H.plan, W = P.who;
  if (W && !H.practice && !H.who && !(shMemOf(H.dest) || {})[W.flag] && SH_ROOMS[W.room] && H.woke[W.by] && !H.zs.some((z) => z.hp > 0 && z.mode !== 'sleep' && !z.frozen)) { const di = SH_DOORS.findIndex((D) => D[0] === W.room || D[1] === W.room), at = di >= 0 ? shDoorW(di) : null;
    if (at && live.length && !H.zs.some((z) => z.hp > 0 && z.room === W.by && !z.bed)) { const d = H.doors[di], m = (H.myst || {})[W.room]; if (m) { m.took = true; m.told = true; } if (!d.open) shDoorOpen(d, 'pick'); shStoryWho(H, at); } }
  if (!H.stuck || H.back || H.goalDone) return; const route = P.route.filter((r) => !H.sealed[r]);
  const busy = H.zs.some((z) => z.hp > 0 && !z.frozen && !z.post && (z.mode !== 'sleep' || (!z.bed && route.includes(z.room)))) || route.some((r) => !H.woke[r]);
  if (busy) { H.stuckT = 0; return; } if (!H.stuckT) { H.stuckT = H.t; banner('🔐 NOTHING MORE HERE TODAY'); say(`${H.plan.names[H.stuck] || 'The last room'} stays shut. ${H.sealed[H.stuck]}. What the squad did here stays done: search what is left, then ↩ Fall back.`, true); shPanel(); }
  else if (!H.coachAct && H.t - H.stuckT > 360) { H.back = true; H.backT = H.t; say('Nothing more to do here today: the squad heads for the way out.'); shPanel(); } }   /* a squad nobody is leading goes home by itself */
function shStoryEnd(H, won, fled, lines, entry) { if (!H || H.practice || H.camp || !H.plan) return; const W = H.plan.who;
  if (W && H.whoNew) { if (S.sv.length + (S.kids || []).length < popCap()) { const q = mk(freeFirst([W.name]), W.job, 4, entry.x, entry.y + .6, S.sv.length); q.sat = 3; q.stateTicks = 80; q.src = 'trip'; S.sv.push(q); lines.push(`🙋 ${esc(q.name)}, the Clinic's last doctor, came home with the squad.`); }
    else lines.push(`🙋 ${esc(W.name)} got out with the squad. There was no bed for her at the Haven, so she went on to the river; the theatre stays open.`); }
  if (!won && H.sealed && Object.keys(H.sealed).length) lines.push(`🔐 Still shut: ${Object.keys(H.sealed).map((r) => esc(H.plan.names[r] || r)).join(', ')}. ${esc(Object.values(H.sealed)[0])}.`); }
/* the trip card's line for a sealed place: how much is done, and what is still shut */
function shCardLine(dest) { if (!shRemembers(dest)) return ''; const M = shMemOf(dest), L = shStoryLocks(dest), a = [];
  if (M && M.doors) a.push(`${(M.dead || []).length} put down, ${M.left || 0} still inside`); if (L.length) a.push(`🔐 ${L.map((q) => esc(q.text)).join('. ')}`);
  return a.length ? `<div class="etLine"><span class="etK">Inside</span> ${a.join(' · ')}</div>` : ''; }
