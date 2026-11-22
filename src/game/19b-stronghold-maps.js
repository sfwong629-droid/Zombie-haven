/* ---- 3D.276 Strongholds chat (owner, 22 Nov: "you will run and make all the maps and rooms and props"; plan in docs/project/15-STRONGHOLDS.md).
   Every stronghold gets a plan of its own, made for the town's level (a level 5 town meets a small place, a level 15 town a big one):
   its own rooms and doors, the names, what sleeps where, the things in it you can use (B3), the floor hazards (B4), dark rooms (B5),
   waves (B6), the boss's pattern (B7), and its goals (B2). A plan is plain data kept in S.sh.plan; the code reads the plan, not fixed rooms.
   Rooms are a tile apart; a door fills the gap. Grid units are tiles. ---- */
function shNewPlan(W, Hh, o = {}) { return { W, H: Hh, rooms: {}, doors: [], names: {}, floor: {}, route: [], locked: [], lockName: {}, spawn: {}, things: [], zones: [], dark: {}, tasks: [], waves: [], spots: {}, start: null, exit: null, startRoom: null, mystT: ['walker', 'walker'], ...o }; }
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
function shPlanClinic(lv) { const n = shLvSize(lv, 2, 6, 4), L = n * 7 - 1, W = 9 + L + 1 + 11, P = shNewPlan(W, 19, { theme: 'clinic' });
  shRoom(P, 'lobby', 0, 6, 8, 7, 'The Lobby', '#cfd6d2'); shRoom(P, 'pharm', 1, 0, 6, 5, 'The Pharmacy', '#d9d4c4'); shRoom(P, 'hall', 9, 8, L, 3, 'The Corridor', '#d9d4c4');
  shRoom(P, 'theatre', 9 + L + 1, 4, 10, 11, 'The Operating Theatre', '#c9d3d6');
  shLink(P, 'lobby', 'hall'); shLink(P, 'lobby', 'pharm', true); shLink(P, 'hall', 'theatre');
  P.spawn.lobby = [['walker', 3 + (lv > 6 ? 1 : 0)], ['runner', lv > 8 ? 1 : 0]].filter((q) => q[1]); P.spawn.hall = [['walker', 2 + Math.floor(n / 2)], ['runner', 1 + (lv > 10 ? 1 : 0)]];
  for (let i = 0; i < n; i++) for (const up of [1, 0]) { const id = `w${up ? 'n' : 's'}${i}`, x = 9 + i * 7, y = up ? 1 : 12, locked = (i + up) % 3 === 2;
    shRoom(P, id, x, y, 6, 6, `Ward ${i * 2 + (up ? 1 : 2)}`, i % 2 ? '#d4dcd8' : '#dfe4e0'); shLink(P, id, 'hall', locked, x + 2);
    if (locked) { P.locked.push(id); P.lockName[id] = `a locked ward (Ward ${i * 2 + (up ? 1 : 2)})`; }
    /* two rows of beds; about half the beds hold a patient who will get up */
    for (const by of up ? [y + 1, y + 4] : [y + 1, y + 4]) for (const bx of [x + 1, x + 4]) { const t = shThing(P, 'bed', bx, by, { r: 0 }); if (!locked && ((bx + by + i + lv) % 5 < 2 + (lv > 9 ? 1 : 0))) t.sleeper = lv > 12 && (bx + by) % 3 === 0 ? 'runner' : 'walker'; }
    if (!locked) P.spawn[id] = [['walker', 1 + (i % 2)], ...(lv > 7 && i % 3 === 1 ? [['spitter', 1]] : []), ...(lv > 5 && i % 4 === 3 ? [['bloated', 1]] : [])]; }
  shThing(P, 'locker', 2, 1, { use: 6, label: 'Empty the pharmacy locker', icon: '💊', loot: { meds: 3 + Math.floor(lv / 5), cloth: 2 }, task: 'locker' });
  P.spawn.pharm = [['walker', 1]];
  P.spawn.theatre = [['walker', 2 + Math.floor(lv / 6)]]; P.boss = { room: 'theatre', type: 'brute', name: 'The Butcher of Ward 3', hp: 680, atk: 12, big: 1.6, spd: .011, pat: 'slam' };
  P.route = ['lobby', 'hall', 'theatre']; P.startRoom = 'lobby'; P.bossRoom = 'theatre'; P.start = { x: 1, y: 8.2 }; P.exit = { x: .6, y: 9.5 }; P.mystT = ['walker', 'runner'];
  P.tasks = [{ k: 'boss', label: 'Kill the Butcher of Ward 3' }, { k: 'use', id: 'locker', opt: true, label: 'Side: empty the pharmacy locker' }];
  P.tip = 'Patients sleep in some of the beds. They get up when someone walks past, or when a gun goes off near them: quiet weapons are safer.';
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
  if (T.k === 'clock') return { done: false, n: 0, need: 1 };
  return { done: false, n: 0, need: 1 }; }
function shTaskTick(H, live) {
  for (const s of H.units) { if (s.carry == null) continue; const t = H.things[s.carry]; if (!t) { s.carry = null; continue; }
    if (s.hp <= 0) { const c = shCell(s.w); t.x = c.x; t.y = c.y; t.carried = null; s.carry = null; shFx(s.w, `📦 ${t.label || 'It'} is dropped`, '#ff8a7a'); continue; }
    if (shRoomAt(s.w) === H.plan.startRoom) { t.delivered = true; t.carried = null; s.carry = null; const c = shCell(s.w); t.x = c.x; t.y = c.y; shFx(s.w, `✅ ${t.label || 'It'} is out`, '#7be08a'); SFX('reward'); shPanel(); } }
  if (H.hold) shHoldTick(H, live); if (H.plan.waves && H.plan.waves.length) shWaveTick(H); if (H.zones && H.zones.length && H.t % 30 === 0) shZoneHurt(H, live);
  if (H.goalDone || H.phase === 'done') return; const main = (H.tasks || []).filter((T) => !T.opt);
  for (const T of H.tasks || []) { const st = shTaskState(H, T); if (st.done && !T.done) { T.done = true; if (T.opt) { banner(`✓ ${T.label.replace(/^Side: /, '')}`); SFX('reward'); } shPanel(); } }
  if (main.length && main.every((T) => T.done)) shGoalDone(); }
function shThingSpot(t) { return shWorld(t.x, t.y); }
function shUseAI(s) { const H = S.sh; if (s.use == null) return false; const t = H.things[s.use]; if (!t || t.done || t.carried != null || t.delivered || (t.need && !shThingReady(t))) { s.use = null; return false; }
  const at = shThingSpot(t); if (dist(s.w, at) > .95) { s.mode = 'walk'; s.target = null; if (!shGo(s, at, .024, 'u') && !s.path && dist(s.w, at) > .95) { s.use = null; say(`${s.name} can't get to the ${t.label || t.k}.`); } return true; }
  const foe = H.zs.find((z) => z.hp > 0 && !z.hid && !z.friend && z.mode !== 'sleep' && dist(z.w, s.w) < 1.4); if (foe) { s.target = foe; s.mode = 'attack'; s.stateTicks = 14; s.moving = false; s.faceW = { ...foe.w }; return true; }
  s.mode = 'fix'; s.moving = false; s.faceW = at; const fast = t.fast && t.fast.includes(s.job) ? 2 : 1; t.prog = (t.prog || 0) + fast / (60 * (t.use || 3));
  if (t.prog >= 1) { t.prog = 0; s.use = null; s.mode = 'free'; shThingDone(t, s); } return true; }
function shThingReady(t) { const H = S.sh; return !t.need || (H.things || []).filter((q) => q.task === t.need).every((q) => q.done); }
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
function shHoldTick(H, live) { const h = H.hold; if (!h.on) return; const t = H.things[h.thing]; const inside = live.filter((s) => dist(s.w, shThingSpot(t)) < (t.r || 2)); if (inside.length) { h.p = (h.p || 0) + 1 / 60; if (H.t % 60 === 0) shFx(shThingSpot(t), `⏳ ${Math.floor(h.p)} / ${t.secs || 60} s`, '#ffe9b8'); } }
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
  P.route = ['yard', 'block', 'warden']; P.startRoom = 'yard'; P.bossRoom = 'warden'; P.start = { x: 1, y: 9 }; P.exit = { x: .6, y: 10 }; P.mystT = ['walker', 'riot'];
  P.tasks = [{ k: 'boss', label: 'Kill the Warden' }, { k: 'use', id: 'van', opt: true, label: 'Side: hot-wire the prison van' }]; P.botOrders = ['cells'];
  P.tip = "The Warden's gate is too heavy to force. The control room opens it, and every cell with it, or a bomb blows it. Riot zombies hold their shield to whoever they fight: hit them from the side.";
  return P; }
SH_PLANS.prison = shPlanPrison;
SH_FX.cells = (H) => { H.doors.forEach((d, i) => { const D = SH_DOORS[i]; if (D[7] === 'heavy' || /^cell/.test(D[0]) || /^cell/.test(D[1])) { d.open = true; d.locked = false; shReveal(D[0]); shReveal(D[1]); } });
  for (const z of H.zs) if (z.hp > 0 && /^cell/.test(z.room || '')) { z.mode = 'idle'; z.hid = false; } banner('🔓 EVERY CELL IS OPEN'); say('The cell doors grind open all at once, and the gate with them. Everything inside is coming out.'); SFX('alarm'); };

