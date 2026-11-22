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
  if (H.plan.tick) H.plan.tick(H, live); if (H.lure && H.t > H.lure.until) { H.lure = null; for (const z of H.zs) z.lured = false; }
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
function shPlanLab7(lv) { const k = shLvSize(lv, 2, 4, 6), L = k * 6 - 1, ex = 12 + L + 1, W = ex + 3 + 1 + 9 + 1, P = shNewPlan(W, 24, { theme: 'lab', wall: '#e4e8ea', ground: '#9aa0a2' });
  shRoom(P, 'lobby', 0, 9, 7, 7, 'Reception', '#c5cacc'); shRoom(P, 'gen', 0, 1, 7, 6, 'The Generator Room', '#9aa0a2');
  shRoom(P, 'west', 8, 2, 3, 20, 'The Security Ring', '#b8bdbf'); shRoom(P, 'north', 12, 2, L, 3, 'The Security Ring', '#b8bdbf'); shRoom(P, 'south', 12, 19, L, 3, 'The Security Ring', '#b8bdbf'); shRoom(P, 'east', ex, 2, 3, 20, 'The Security Ring', '#b8bdbf');
  shRoom(P, 'contain', ex + 4, 6, 9, 12, 'Containment', '#aeb4b6'); shRoom(P, 'base', ex + 4, 19, 9, 4, 'The Basement', '#9aa0a2');
  shLink(P, 'lobby', 'west'); shLink(P, 'gen', 'west'); shLink(P, 'west', 'north'); shLink(P, 'west', 'south'); shLink(P, 'north', 'east'); shLink(P, 'south', 'east'); const cd = shLink(P, 'east', 'contain', true); P.doors[cd][7] = 'heavy'; P.doors[cd][8] = 'sec'; shLink(P, 'contain', 'base');
  for (let j = 0; j < k; j++) for (const up of [1, 0]) { const id = `lab${up ? 'n' : 's'}${j}`, x = 12 + j * 6; shRoom(P, id, x, up ? 6 : 13, 5, 5, `Lab ${7}${String.fromCharCode(65 + j * 2 + (1 - up))}`, '#c5cacc'); const di = shLink(P, id, up ? 'north' : 'south', true, x + 1); P.doors[di][7] = 'heavy'; P.doors[di][8] = 'sec';
    shThing(P, 'cage', x + 1, up ? 8 : 15); shThing(P, 'desk', x + 3, up ? 7 : 14); P.spawn[id] = [[(j + up) % 2 ? 'lasher' : 'walker', 1], ['walker', 1 + (lv > 14 ? 1 : 0)]];
    shThing(P, 'crate', x + 3, up ? 9 : 16, { use: 3, label: 'Search the lab benches', icon: '🧪', loot: { meds: 2, mat: 2 }, task: 'benches' }); }
  for (const r of Object.keys(P.rooms)) if (r !== 'lobby') P.dark[r] = 1;
  shThing(P, 'generator', 3, 3, { use: 6, fast: ['Mechanic', 'Engineer'], label: 'Start the generator', icon: '⚡', sub: 'Lights on, and every security door opens: the cages too', fx: 'power', task: 'power' });
  shThing(P, 'safe', ex + 6, 20); shThing(P, 'files', ex + 9, 21, { carry: true, use: 4, label: 'build-up tables', task: 'tables', icon: '📁' });
  P.spawn.lobby = [['walker', 2]]; P.spawn.west = [['walker', 2 + Math.floor(lv / 8)]]; P.spawn.north = [['walker', 1 + k]]; P.spawn.south = [['walker', 1 + k]]; P.spawn.east = [['runner', 1 + Math.floor(lv / 10)], ['walker', 2]]; P.spawn.contain = [['lasher', 1 + Math.floor(lv / 12)]]; P.spawn.base = [['walker', 2]];
  P.boss = { room: 'contain', type: 'boss', name: 'The Mutant (Subject 2)', hp: 1500, atk: 20, big: 1.5, spd: .011, pat: 'slam' };
  P.route = ['lobby', 'west', 'north', 'east']; P.startRoom = 'lobby'; P.bossRoom = 'contain'; P.start = { x: 1, y: 11 }; P.exit = { x: .6, y: 12 }; P.mystT = ['walker', 'lasher'];
  P.tasks = [{ k: 'carry', id: 'tables', label: 'Carry out the build-up tables' }, { k: 'boss', opt: true, label: 'Side: put down the Mutant' }]; P.botOrders = ['power', 'tables']; P.keyOnWin = ['proof2'];
  P.tip = 'No power: the lab is dark and the security doors are shut. The generator turns the lights on and opens every security door, and the cages with them. The tables are in the basement, behind Containment.';
  P.setup = (H) => { const amy = H.units.find((u) => /^Amy\b/.test(u.name)); if (amy) { H.doors.forEach((d, i) => { if (SH_DOORS[i][8] === 'sec' && !/^lab/.test(SH_DOORS[i][0])) { d.locked = false; SH_DOORS[i][7] = null; } }); setTimeout(() => say(`${amy.name}: "I parked in that spot for six years. The codes haven't changed." Containment's door will open for her.`, true), 2600); } };
  return P; }
SH_PLANS.lab7 = shPlanLab7;
SH_FX.power = (H) => { H.lit = true; H.doors.forEach((d, i) => { if (SH_DOORS[i][8] === 'sec') { d.open = true; d.locked = false; shReveal(SH_DOORS[i][0]); shReveal(SH_DOORS[i][1]); } }); for (const z of H.zs) if (z.hp > 0 && /^lab/.test(z.room || '')) { z.mode = 'idle'; z.hid = false; } banner('⚡ THE LIGHTS COME ON'); say('The lights flicker on. Every security door slides open, and the cages with them.'); SFX('alarm'); };

/* the Records Office: a tower of floors, shown side by side, ground floor on the left; stairs go up through each floor's middle office.
   House rule: Penhallow has the files shredded, from the top floor down: a clock for each floor. Carry out three crates of files. No boss. */
function shPlanRecords(lv) { const F = shLvSize(lv, 3, 5, 6), W = F * 14, P = shNewPlan(W, 20, { theme: 'office', wall: '#d9d4c4', ground: '#8a8f94' });
  for (let f = 0; f < F; f++) { const x0 = f * 14, fl = f === 0 ? 'Reception' : `Floor ${f + 1}`; shRoom(P, `land${f}`, x0, 6, 5, 10, f === 0 ? 'Reception' : `${fl}: the landing`, '#c9c0a8');
    shRoom(P, `a${f}`, x0 + 6, 1, 7, 6, `${fl}: ${['Taste Reports', 'Complaints', 'Legal', 'Marketing', 'The Board Room'][f]}`, '#d9d4c4'); shRoom(P, `b${f}`, x0 + 6, 8, 7, 5, `${fl}: the stair hall`, '#cfc7b0'); shRoom(P, `c${f}`, x0 + 6, 14, 7, 5, `${fl}: ${['Filing', 'Archive', 'Memos', 'Payroll', 'The Vault'][f]}`, '#d9d4c4');
    shLink(P, `land${f}`, `a${f}`, false, null, 1); shLink(P, `land${f}`, `b${f}`); shLink(P, `land${f}`, `c${f}`); if (f) shLink(P, `b${f - 1}`, `land${f}`);
    for (const r of ['a', 'c']) { const [rx, ry] = P.rooms[`${r}${f}`]; shThing(P, 'shelf', rx + 1, ry + 1); shThing(P, 'desk', rx + 4, ry + 3); shThing(P, 'files', rx + 5, ry + 1, { carry: true, use: 3, label: `crate of ${f === 0 ? 'taste reports' : 'files'}`, task: 'files', floor: f, icon: '🗂' }); }
    P.spawn[`land${f}`] = f ? [['riot', 1], ['walker', 1 + Math.floor(lv / 10)]] : [['walker', 2]]; P.spawn[`a${f}`] = [['walker', 1 + (f % 2)]]; P.spawn[`c${f}`] = [[f >= 2 ? 'riot' : 'walker', 1]]; P.spawn[`b${f}`] = [['walker', 1]]; }
  P.route = ['land0']; P.startRoom = 'land0'; P.bossRoom = null; P.start = { x: 1, y: 9 }; P.exit = { x: .6, y: 10 }; P.mystT = ['walker', 'riot']; P.floors = F;
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
