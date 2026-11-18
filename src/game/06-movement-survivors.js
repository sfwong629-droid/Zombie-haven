/* ---------------- movement & path following (A* on the tile grid; recompute only when needed) ---------------- */
const solidWall = (x, y) => { const wl = Wd.wallAt(world, Math.floor(x), Math.floor(y)); return !!wl && !wl.broken; };
function stepToward(o, p, sp) {
  const dx = p.x - o.w.x, dy = p.y - o.w.y, d = Math.hypot(dx, dy); o.moving = d > 0.02;
  const k = d <= sp ? 1 : sp / d, nx = o.w.x + dx * k, ny = o.w.y + dy * k;
  if (o.job !== undefined && solidWall(nx, ny) && !solidWall(o.w.x, o.w.y)) {   /* 3D.103 owner: people walked through fences (chat spots, short hops): a person never steps onto a standing wall; they slide along it */
    if (!solidWall(nx, o.w.y)) o.w.x = nx; else if (!solidWall(o.w.x, ny)) o.w.y = ny; else o.moving = false; return false; }
  if (d <= sp) { o.w.x = p.x; o.w.y = p.y; return true; }
  o.w.x = nx; o.w.y = ny; return false;
}
function unwall(o) {   /* 3D.103 someone left standing on a wall tile (a wall built on top of them, an old save) steps off to the nearest open tile */
  if (!o.w || !solidWall(o.w.x, o.w.y)) return; const t = Wd.nearestWalkable ? Wd.nearestWalkable(world, Math.floor(o.w.x), Math.floor(o.w.y)) : null; if (!t) return;
  const g = { x: t.x + .5, y: t.y + .5 }, dx = g.x - o.w.x, dy = g.y - o.w.y, d = Math.hypot(dx, dy) || 1, sp = Math.min(d, .03); o.w.x += dx / d * sp; o.w.y += dy / d * sp; o.moving = true;
}
// returns 'arrived' | 'moving' | 'fail'.  goal = live world point.
const TUNE = { move: .6, work: 1.4, nfDmg: .5, eat: 1.5 };   /* 3D.49 eat: how much everyone eats and drinks (balance) */   /* 3D.41 nfDmg: damage multiplier for people whose job isn't a fighting one (militia, cornered civilians) */   /* V3D.20 move: everyone walks at 60% of the old pace so the steps match the ground covered; V3D.21 work: on the job they work 40% faster to make up for the longer walks */
/* V3D.21 people walk in soft curves: they turn gradually toward the next point (a turning circle that tightens near the
   point), cut corners by moving on to the next point early, and each trip's waypoints are nudged a little off the tile
   centres, so nobody walks the same ruler-straight grid line. Zombies keep the plain stepping. */
function steer(o, p, sp) {
  const dx = p.x - o.w.x, dy = p.y - o.w.y, d = Math.hypot(dx, dy); o.moving = d > .02;
  if (d <= sp) { o.w.x = p.x; o.w.y = p.y; return true; }
  const a = Math.atan2(dy, dx), wrap = (v) => Math.atan2(Math.sin(v), Math.cos(v)); if (o.hd == null || o.hdT !== tick - 1) o.hd = a; o.hdT = tick;
  const R = Math.max(.12, Math.min(.55, d * .45)), mt = sp / R, df = wrap(a - o.hd); o.hd += Math.max(-mt, Math.min(mt, df)); if (Math.abs(wrap(a - o.hd)) > 1.7) o.hd = a;
  const nx = o.w.x + Math.cos(o.hd) * sp, ny = o.w.y + Math.sin(o.hd) * sp;
  if ((Wd.walkable(world, Math.floor(nx), Math.floor(ny)) || Wd.buildingAt(world, Math.floor(o.w.x), Math.floor(o.w.y))) && !(solidWall(nx, ny) && !solidWall(o.w.x, o.w.y))) { o.w.x = nx; o.w.y = ny; } else { o.hd = a; const fx = o.w.x + dx / d * sp, fy = o.w.y + dy / d * sp; if (!solidWall(fx, fy) || solidWall(o.w.x, o.w.y)) { o.w.x = fx; o.w.y = fy; } else if (!solidWall(fx, o.w.y)) o.w.x = fx; else if (!solidWall(o.w.x, fy)) o.w.y = fy; }
  return false;
}
let litCache = { t: -1, L: [] };
const litAt = (w) => { if (!isNight()) return false; if (litCache.t !== S.hour) litCache = { t: S.hour, L: world.buildings.filter((b) => b.type === 'floodlight' && powered(b)) }; return litCache.L.some((b) => Math.hypot(b.x + .5 - w.x, b.y + .5 - w.y) < 5); };   /* 3D.104 Floodlight */
/* 3D.189 walk or jog (owner, 17 Nov). The survivors' walk and jog are recordings of real people. At the pace people cross the town a real person jogs,
   so: in free time (a stroll, a chat, the campfire, going to eat or to bed) and on short trips (under 4 tiles) they walk, at the real walk's pace
   (STROLL of the old speed); to work, to a job and in any danger they keep today's speed and jog. Carrying is unchanged for now. */
const STROLL = .63, STROLL_MODE = new Set(['chat', 'campfire', 'goFacility']);
let zLiveC = { t: -1, n: 0 };
const zLive = () => { if (zLiveC.t !== tick) zLiveC = { t: tick, n: S.z.some((z) => z.hp > 0 && !z.zoo) ? 1 : 0 }; return zLiveC.n; };
const strolling = (o) => !o.carrying && !zLive() && (STROLL_MODE.has(o.mode) || (o.mode === 'walk' && o.purpose === 'roam') || (o.tripLen || 9) < 4);
function followPath(o, goal, sp) {
  { const dG = Math.hypot(goal.x - o.w.x, goal.y - o.w.y), same = o.arrG && Math.abs(o.arrG.x - goal.x) < .01 && Math.abs(o.arrG.y - goal.y) < .01; o.nearT = dG < .5 ? (o.nearT || 0) + 1 : 0;
    if (dG < .03 || o.nearT > 45 || (same && dG < 1.3)) { o.path = null; o.pathGoal = null; o.moving = false; o.arrG = { x: goal.x, y: goal.y }; return 'arrived'; } }   /* 3D.59 owner's tracker log (Maya): someone already on their goal never re-paths, and someone kept off it by another person standing there (the anti-overlap push) stops at arm's length instead of walking in place forever */   /* 3D.59 owner's tracker log: someone already standing on their goal never re-paths (a goal on a building footprint sent them out to the door and back in, forever: the chat moonwalk) */
  const sp0 = sp; sp *= TUNE.move; if (o.job === undefined && !o.human && litAt(o.w)) sp *= .75;
  const curvy = o.job !== undefined, go = (p) => curvy ? steer(o, p, sp) : stepToward(o, p, sp);
  if (o.job !== undefined) sp *= Math.max(.8, sMod(o, 'agi', .02)) * (hasSkill(o, 'lightFeet') ? 1.15 : 1) * (o.carrying ? (hasSkill(o, 'steadyHands') ? 1.3 : 1) * (hasSkill(o, 'strongBack') ? 1.2 : 1) : 1);   /* survivor skills */
  const gt = tileOf(goal), gk = gt.x + ',' + gt.y;
  if (!o.path || o.pathGoal !== gk + (o.wallCost ? '#w' : '') || o.pathVer !== world.ver) {
    const fresh = o.pathGoal !== gk + (o.wallCost ? '#w' : '');
    const p = Wd.findPath(world, tileOf(o.w), gt, o.job === undefined && !o.human, o.wallCost || 0); o.pathGoal = gk + (o.wallCost ? '#w' : ''); o.pathVer = world.ver;
    if (!p) { o.path = null; return 'fail'; }
    if (fresh) o.tripLen = p.length;   /* 3D.189 how long this trip was when it began: short trips are walked */
    o.path = p.map((q, i) => curvy && i < p.length - 1 ? { x: q.x + .5 + (rnd() - .5) * .44, y: q.y + .5 + (rnd() - .5) * .44 } : tc(q.x, q.y)); o.stuck = 0; o.lastD = 1e9;
    const fb = o.job !== undefined || o.human ? Wd.buildingAt(world, Math.floor(o.w.x), Math.floor(o.w.y)) : null;   /* V2.34: leaving a building = step out through its entrance tile first (the path starts AFTER that tile, so people cut across the footprint) */
    if (fb) { const at = Wd.approachTile(fb); if (!p.length || p[0].x !== at.x || p[0].y !== at.y) o.path.unshift(tc(at.x, at.y)); }
  }
  if (o.job !== undefined && sp0 <= WALK * 1.16 && strolling(o)) sp *= STROLL * WALK / sp0;   /* 3D.189 owner: people walk (a real walk covers less ground) in free time and on short trips, and jog to work */
  if (o.path.length > 0 && o.path.length === 1) { /* last leg handled below */ }
  const target = o.path.length ? o.path[0] : goal;
  const before = { x: o.w.x, y: o.w.y };
  if (curvy && o.path.length > 1 && dist(o.w, o.path[0]) < .5) o.path.shift();   /* cut the corner: head for the next point early */
  if (go(o.path.length > 1 ? o.path[0] : (o.path.length === 1 ? o.path[0] : goal))) {
    if (o.path.length) { o.path.shift(); if (!o.path.length) { /* now on the goal tile centre: finish to exact point */ } }
    else { o.path = null; o.pathGoal = null; o.arrG = { x: goal.x, y: goal.y }; return 'arrived'; }
  }
  if (!o.path || !o.path.length) { // final leg: exact goal point (live, so chasing moving targets works)
    if (o.job === undefined && !o.human && !Wd.walkable(world, Math.floor(goal.x), Math.floor(goal.y), true)) { o.path = null; o.pathGoal = null; return 'fail'; }   // zombies never step into a wall tile, even for a survivor standing in the gate
    if (o.path && !o.path.length) { if (go(goal)) { o.path = null; o.pathGoal = null; o.arrG = { x: goal.x, y: goal.y }; return 'arrived'; } }
  }
  const moved = Math.hypot(o.w.x - before.x, o.w.y - before.y);
  o.stuck = moved < sp * .25 ? (o.stuck || 0) + 1 : 0;
  if (o.stuck > 90) { o.path = null; o.pathGoal = null; o.stuck = 0; return 'fail'; }
  if (!o.prog || tick - o.prog.t > 60) {   /* 3D.59 net progress: stepping forward and being pushed back by someone standing in the way (the anti-overlap push) looked like walking in place forever */
    const net = o.prog ? Math.hypot(o.w.x - o.prog.x, o.w.y - o.prog.y) : 1; o.prog = { x: o.w.x, y: o.w.y, t: tick };
    if (net < .12) { const dG = Math.hypot(goal.x - o.w.x, goal.y - o.w.y); o.path = null; o.pathGoal = null; o.moving = false; o.prog = null; if (dG < 1.3) { o.arrG = { x: goal.x, y: goal.y }; return 'arrived'; } return 'fail'; } }
  return 'moving';
}
function moveSlide(o, t, sp) {                // free movement that cannot enter buildings or walls (zombie roaming)
  sp *= TUNE.move;
  const walk = (x, y) => Wd.walkable(world, x, y, true);
  const dx = t.x - o.w.x, dy = t.y - o.w.y, d = Math.hypot(dx, dy); o.moving = d > .02; if (d <= sp) { if (walk(Math.floor(t.x), Math.floor(t.y))) { o.w.x = t.x; o.w.y = t.y; } return true; }
  const nx = o.w.x + dx / d * sp, ny = o.w.y + dy / d * sp;
  if (walk(Math.floor(nx), Math.floor(ny))) { o.w.x = nx; o.w.y = ny; }
  else if (walk(Math.floor(nx), Math.floor(o.w.y))) o.w.x = nx;
  else if (walk(Math.floor(o.w.x), Math.floor(ny))) o.w.y = ny; else return true;
  return false;
}

/* ---------------- survivors ---------------- */
function mk(name, job, l, x, y, i) {
  const o = mk0(name, job, l, x, y, i); o.st = rollStats(job, l); o.eq = { weapon: (null), armor: null, head: null, acc: null }; o.tp = {}; o.cls = { [job]: { l, xp: 0 } }; o.skills = []; learnSkills(o, true); o.trait = TRAIT_KEYS[Math.floor(rnd() * TRAIT_KEYS.length)]; o.age = 18 + Math.floor(rnd() * 57); o.south = rnd() < .25; o.max = baseMax(o); o.hp = o.max; return o;
}
/* 3D.44 age and voice: every survivor has an age (18-74). 58+ talk like boomers, 27 and under like Gen Z, and about one in four has a
   Southern accent. Lines in js/barks.js tagged B| Z| S| are only said by those voices. Close ages bond faster and chat more. */
function ageOf(s) { if (!s) return 40; if (s.age == null) { let h = 7; for (const c of (s.name || '') + (s.id || 0)) h = (h * 31 + c.charCodeAt(0)) >>> 0; s.age = 18 + (h % 57); s.south = (h >>> 9) % 4 === 0; } return s.age; }
const voiceOk = (s, t) => (t === 'B' ? ageOf(s) >= 58 : t === 'Z' ? ageOf(s) <= 27 : t === 'S' ? (ageOf(s), !!s.south) : true);
const lineTag = (l) => (/^[BZS]\|/.test(l) ? [l[0], l.slice(2)] : [null, l]);
const voiceName = (s) => [ageOf(s) >= 58 ? 'Boomer' : ageOf(s) <= 27 ? 'Gen Z' : '', s.south ? 'Southern' : ''].filter(Boolean).join(', ');
const ageBondMul = (a, b) => { const d = Math.abs(ageOf(a) - ageOf(b)); return d <= 6 ? 1.5 : d <= 12 ? 1.2 : d >= 30 ? .8 : 1; };
/* V3D.17 full names: everyone has a family name (the first name is what the town calls them) */
const FIRST_NAMES = ['Noah', 'Maya', 'Eli', 'June', 'Rosa', 'Theo', 'Iris', 'Omar', 'Cass', 'Dex', 'Mara', 'Ozzy', 'Lark', 'Vince', 'Hana', 'Rook', 'Sol', 'Quinn', 'Ada', 'Bo', 'Cleo', 'Dante', 'Esme', 'Felix', 'Gwen', 'Hal', 'Ines', 'Jonah', 'Kira', 'Leo', 'Mina', 'Nico', 'Opal', 'Pia', 'Rafe', 'Sana', 'Tomas', 'Uma', 'Vera', 'Wes', 'Yara', 'Zed', 'Abel', 'Bryn', 'Cyrus', 'Della', 'Ezra', 'Faye', 'Gus', 'Hattie'];
const LAST_NAMES = ['Reyes', 'Novak', 'Okafor', 'Brennan', 'Sato', 'Lindqvist', 'Moreau', 'Kowalski', 'Haddad', 'Fischer', 'Park', 'Ivanova', 'Alvarez', 'Murphy', 'Nakamura', 'Osei', 'Petrov', 'Quinlan', 'Rossi', 'Schmidt', 'Tanaka', 'Underwood', 'Vasquez', 'Whitfield', 'Yilmaz', 'Zhou', 'Abara', 'Becker', 'Castillo', 'Dubois', 'Engel', 'Fontaine', 'Garza', 'Holm', 'Ibarra', 'Jensen', 'Kaur', 'Larsen', 'Mendes', 'Nyberg', 'Ortiz', 'Pruitt', 'Ramos', 'Sorensen', 'Torres', 'Vance', 'Webb', 'Abbott', 'Bishop', 'Crane'];
const takenFirst = () => new Set(S.sv.concat(S.trip ? S.trip.members : [], S.sh && S.sh.units ? S.sh.units : [], guest ? [guest] : [], S.kids || [], S.fac && S.fac.helix && S.fac.helix.taken ? [S.fac.helix.taken] : []).map((q) => String(q.name).split(' ')[0]));   /* 3D.169: kids and the one Helix took count too */
const freeFirst = (pool = FIRST_NAMES) => { const used = takenFirst(); if (pool !== FIRST_NAMES && !pool.some((n) => !used.has(n))) pool = FIRST_NAMES;   /* 3D.169 (two Junes, play-test round 1): every way in now asks here */   /* 3D.161 play-test: three Noahs in one town. Squads out on a trip and the newcomer at the gate count, and so does a first name with a surname */
  const f = pool.filter((n) => !used.has(n)); return f.length ? f[Math.floor(rnd() * f.length)] : FIRST_NAMES[Math.floor(rnd() * FIRST_NAMES.length)] + ' ' + String.fromCharCode(65 + Math.floor(rnd() * 26)) + '.'; };
const pickLast = () => { const f = LAST_NAMES.filter((n) => !S.sv.some((q) => q.last === n)); const L = f.length ? f : LAST_NAMES; return L[Math.floor(rnd() * L.length)]; };
const fullName = (s) => (s ? s.name + (s.last ? ' ' + s.last : '') : '');
function mk0(name, job, l, x, y, i) {
  return { id: ++S.seq, name, last: pickLast(), job, l, mastery: 0, w: tc(x, y), hp: 58 + l * 8, max: 58 + l * 8, post: null, mode: 'free', target: null, cool: 20 + (i % 8) * 23, stateTicks: 30 + (i % 8) * 11, sat: 8 + (i % 6) * 3, resident: false, i, phase: i * 37, dest: null, moving: false, hunger: 15 + (i % 5) * 8, thirst: 10 + (i % 5) * 6, fatigue: 8 + (i % 5) * 5,   /* 3D.63: the 12th+ recruit arrived already starving (needs grew with the roster index) */ activity: null, facility: null, rescuer: null, rescuing: null, carrying: null, lastFacility: null, why: 'Settling in', purpose: null, idleBubble: '' };
}
const medSite = () => bOf('hospital')[0] || bOf('clinic')[0] || bOf('medic')[0] || null;
/* 3D.46 owner: with no room in a medical building (or none at all), the wounded go to the Camp. The Camp can look after only a
   few (CAMP_CARE by tier), more slowly, and they come back less healed. */
const CAMP_CARE = { hq: 1, hq2: 2, hq3: 2 };
const careLoad = (b) => S.sv.filter((q) => q.mode === 'hospital' && q.careAt === b).length;
const isCamp = (b) => !!b && DEFS[b.type] && DEFS[b.type].role === 'hq';
function careDest() { const m = medSite(), c = campB();
  if (m && careLoad(m) < cap(m)) return m; if (c && careLoad(c) < (CAMP_CARE[c.type] || 1)) return c; return m || c || null; }   // all full: the medical building takes them anyway, crowded
function sitePoint(b) { b = b === undefined ? careDest() : b; return b ? Wd.doorPoint(b) : tc(3 + OFF, 10 + OFF); }
const downedUnassigned = () => S.sv.filter((q) => { if (q.mode !== 'down') return false; const r = q.rescuer; if (r && (r.rescuing !== q || r.hp <= 0 || !['rescueTo', 'rescueCarry'].includes(r.mode))) { if (r.rescuing === q) r.rescuing = null; q.rescuer = null; } return !q.rescuer; });   // a rescuer who got distracted releases the casualty
function facilityUsers(b) { return S.sv.filter((s) => s.facility === b && ['goFacility', 'useFacility'].includes(s.mode)).length; }   // reservation: heading there counts
const cap = (b) => (DEFS[b.type] ? (DEFS[b.type].role === 'hq' ? CAMP_CAP[b.type] || 10 : DEFS[b.type].cap) : 1);
