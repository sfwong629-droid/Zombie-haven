/* ---------------- V2.19 guided goals (one system at a time, then random missions) + event log ---------------- */
const GUIDE = [
  { name: 'Grow Food', desc: 'Build a Garden Plot', hint: 'Build → Garden Plot. Every survivor eats a daily ration of food and water. A Farmer staffs it automatically (green dot) and makes it produce more.', done: () => bOf('farm').length + bOf('field').length > 0, parts: 3, ren: 4 },
  { name: 'A Second Garden', desc: 'Build a second Garden Plot', hint: 'One garden rarely feeds a growing camp. A second Garden Plot (and a Farmer to work it) keeps food ahead of new mouths. New gardens grow half as much again for the first 10 days.', done: () => bOf('farm').length + bOf('field').length >= 2, parts: 3, ren: 4 },   /* 3D.104 early food help; 3D.110 its renown was missing (turned Renown into NaN) */
  { name: 'A Place to Rest', desc: 'Build a Tent', hint: 'Tired survivors sleep in Tents (2 beds each). Without a free bed they sleep rough and rest badly. Upgrade a Tent to a Cabin (after the Lodge) for more beds.', done: () => bOf('inn').length >= 1, parts: 3, ren: 4 },
  { name: 'Scrap Economy', desc: 'Build a Scrapyard', hint: 'Every building costs a little upkeep in scrap each day (a building that can\'t be paid runs at half output). A Scrapyard staffed by a Scavenger makes scrap. Kills, missions and expeditions also bring scrap.', done: () => bOf('scrapyard').length > 0, parts: 4, ren: 5 },
  { name: 'Grow the Camp', desc: 'Upgrade the Camp to a Lodge', hint: 'Tap your Camp → Upgrade. It needs wood and scrap: idle survivors chop trees and salvage wrecks on their own, and builders carry everything over. The Lodge unlocks Timber buildings and more land.', done: () => hqTier() >= 2, parts: 4, ren: 6 },
  { name: 'Gear Up', desc: 'Get a survivor some armor', hint: 'Build an Armory: survivors buy basic gear there on their own when you have spare scrap. Or tap a survivor → Equipment → Change to pick from the stash.', done: () => S.sv.some((q) => q.eq && q.eq.armor), parts: 4, ren: 5 },
  { name: 'Train Up', desc: 'Build a Gym, Library or Lounge', hint: 'Survivors train in their free time: 100% training = +1 permanent stat. Strength helps fighters and farmers, Intelligence helps medics and research, Charisma helps happiness and trading.', done: () => ['gym', 'library', 'lounge', 'range', 'track', 'sparring'].some((t) => bOf(t).length), parts: 4, ren: 5 },
  { name: 'Research', desc: 'Complete a research project', hint: 'Build a Workbench and tap it. An Engineer working there makes research points faster. Research unlocks gear recipes and town upgrades.', done: () => Object.keys(S.res || {}).length >= 1, parts: 5, ren: 6 },
  { name: 'Hold the Line', desc: 'Build 10 wall segments', hint: 'Build → Wood Fence or Gate, then tap tiles in the glowing ring around the town. Most zombies come from the north. A broken segment turns to rubble and is repaired automatically with scrap.', done: () => world.walls.size >= 10, parts: 5, ren: 6 },
  { name: 'Go Out There', desc: 'Send an expedition', hint: 'EXPEDITION → pick a place, a risk level and a squad. Trips run in real time, even while the game is closed, and bring back supplies, scrap and sometimes gear or new survivors.', done: () => !!S.trip || (S.expCount || 0) > 0, parts: 5, ren: 6 },
  { name: 'More Land', desc: 'Expand the territory', hint: 'Town → Expand territory (needs Renown, wood and scrap; a bigger HQ lets you claim more). More land to build on — and more zombies, from more directions.', done: () => (S.terr || 0) >= 1, parts: 6, ren: 8 },
];
const guideActive = () => { if (!S.guideV41) { S.guideV41 = 1; if ((S.guide || 0) > 2) S.guide--; } return S.stage >= 2 && (S.guide || 0) < GUIDE.length; };   /* 3D.41: 'Make It Home' (move-in) goal removed; old saves past it shift back one */
/* 3D.147 owner: the radio is the tutorial. DJ Moth talks the player through each step in two or three short lines; the full hint is one tap away */
const TUT = {
  start: ['Morning, new folks. This is Dusk Radio, and I will walk you through it.', 'First thing: water. Tap Build, pick a Rain Barrel, and put it down inside the fence.', 'Your people carry the wood and scrap over and build it themselves.'],
  fight: ['Water, sorted. Now the bad news: walkers wander in at the edge of town.', 'Your fighters go for them on their own. Put down three, and keep everyone else near the camp.'],
  'Grow Food': ['Tap Build, then Garden Plot, and drop it on open ground.', 'A Farmer works it on their own and grows more. No Farmer? Anybody will do, just slower.'],
  'A Second Garden': ['One garden will not feed a growing camp.', 'Put down a second Garden Plot before the new mouths arrive.'],
  'A Place to Rest': ['Tired people sleep where they drop, and they wake up grumpy.', 'Build a Tent: two beds each. Later you can upgrade it to a Cabin.'],
  'Scrap Economy': ['Every building eats a little scrap each day to keep running.', 'Build a Scrapyard and let a Scavenger work it. Kills and trips bring in scrap too.'],
  'Grow the Camp': ['Time to move up. Tap your Camp, then Upgrade.', 'It needs wood and scrap. Idle people chop trees and strip wrecks on their own.'],
  'Gear Up': ['A jacket stops more teeth than you would think.', 'Build an Armory and they buy basic gear themselves, or tap a survivor, then Gear, and pick from the stash.'],
  'Train Up': ['Brains and muscles both rust. Build a Gym, a Library or a Lounge.', 'People train there in their free time, and every full bar is a permanent point.'],
  Research: ['Build a Workbench and tap it to pick a project.', 'An Engineer there works fastest. Research unlocks gear recipes and town upgrades.'],
  'Hold the Line': ['Most of the dead come from the north. Give them something to chew on.', 'Build, then Wood Fence or Gate, and tap the tiles in the glowing ring. Ten pieces will do for now.'],
  'Go Out There': ['There is a whole world of loot out there, and it bites.', 'Tap Expedition, pick a place, a risk and a squad. Trips keep going even with the game closed. Leave a fighter at home.'],
  'More Land': ['Feeling cramped? Tap Town, then Expand territory.', 'More room to build. More directions for trouble to come from, too.'],
};
const guideLock = (g) => (g && g.name === 'Grow the Camp' && S.rank < (DEFS.hq2.rank || 1) ? ` It opens at Haven level ${lvlOfRank(DEFS.hq2.rank)}: get there first.` : '');   /* 3D.169 round 2 (four testers): the radio sent them to upgrade before they could */
function guideIntro() { const g = GUIDE[S.guide]; if (g) radio('dj', [`${rLine('goal')} ${g.desc.charAt(0).toLowerCase() + g.desc.slice(1)}.${guideLock(g)} ⚙ ${g.parts}  🪵 ${g.parts * 2}  ★ ${g.ren}`, ...(S.introOff ? [] : TUT[g.name] || [])], { key: 'goal', title: 'Next goal · ' + g.name, more: g.hint }); }   /* 3D.135 was a pop-up in the middle of the screen */
function tutTick() { if (S.cut || S.introOff || S.won) return; S.tut = S.tut || {};   /* the first two steps come before the goal list */
  if ((S.stage || 0) === 0 && !S.tut.start && S.day <= 2) { S.tut.start = 1; radio('dj', TUT.start, { key: 'tut', title: 'Getting started', more: 'Build → Rain Barrel, then tap a spot inside the fence. Builders carry the wood and scrap over and put it up.' }); }
  else if (!S.tut.alarm && S.day >= 3 && isNight() && tick % 960 === 120) { const w = nodeList().find((n) => n.k === 'wreck' && nodeState(n.x, n.y) && alarmCands(n.x, n.y).length >= 3); if (w) { S.tut.alarm = 1; radio('dj', ['Got company at the fence? Here is a trick.', 'Tap a wreck near them. Most of those old cars still have a working alarm.', 'Set it off and the dead go and argue with it instead of your walls.'], { key: 'tut', title: 'Car alarms', more: 'Tap a wreck with zombies near it, then Set it off: up to 6 of them (never a boss) walk to the wreck and stay there a while, unless someone comes close. Each wreck works once a day.' }); } }
  else if (S.stage === 1 && !S.tut.fight) { S.tut.fight = 1; radio('dj', TUT.fight, { key: 'tut', title: 'First blood', more: 'Guards, Police and Scavengers fight walkers on their own. Defeat 3 to finish this goal. Everyone else runs inside when zombies come close.' }); } }   /* 3D.135 was a pop-up in the middle of the screen */
/* 3D.295 (overnight branch; owner, 21 Nov, W183, first-30-minute fix 1 in 13-LONG-GAME 3a: a reward for each of the first goals, so
   something pays out every few minutes, as Fallout Shelter's lunchboxes do). The first goals already paid a little scrap, wood and renown;
   now each of the first six also hands over one thing you can see and use: supplies, a weapon, gear. It goes to the stash and is named on
   the goal banner. */
const FIRST_GIFTS = { water: { food: 6, water: 6, line: '6 food and 6 water from Dusk Radio' }, walkers: { item: 'bat', line: 'a Baseball Bat for your best fighter' },
  'Grow Food': { item: 'strawhat', line: 'a Straw Hat for the farmer' }, 'A Second Garden': { food: 10, line: '10 food from Greenwater, to tide you over' },
  'A Place to Rest': { item: 'jacket', line: 'a Work Jacket' }, 'Scrap Economy': { item: 'gloves', line: 'Lifting Gloves' } };
function firstGift(k) { const g = FIRST_GIFTS[k]; S.gifts = S.gifts || {}; if (!g || S.gifts[k]) return ''; S.gifts[k] = 1;
  if (g.item && ITEMS[g.item]) stashAdd(g.item); if (g.food) S.food = (S.food || 0) + g.food; if (g.water) S.water = (S.water || 0) + g.water;
  note('important', '🎁 ' + g.line.charAt(0).toUpperCase() + g.line.slice(1), { log: 'A gift for the goal: ' + g.line + (g.item ? ' (in the stash).' : '.') }); return g.line; }
function guideProgress() {
  const g = GUIDE[S.guide || 0]; if (!g || !g.done()) return;
  S.mat += g.parts; S.wood = Math.min(matCap(), (S.wood || 0) + g.parts * 2); renownGain(g.ren, g.name); SFX('reward'); const gift = firstGift(g.name); banner('✔ GOAL COMPLETE · ' + g.name.toUpperCase() + (gift ? ' · 🎁' : '')); questFlash(); say(`Goal complete: ${g.name} (+${g.parts} scrap).`, true);
  S.guide = (S.guide || 0) + 1; if (S.guide < GUIDE.length && !GUIDE[S.guide].done()) guideIntro(); else if (S.guide >= GUIDE.length) { say('All guide goals done — missions from here on.'); beginMission(); }
  ui();
}
function guideSkipDone() { if (S.guide === undefined) S.guide = 0; while (S.stage >= 2 && S.guide < GUIDE.length && GUIDE[S.guide].done()) S.guide++; }   /* old saves: no rewards for goals already met */
/* ---------------- V2.34 actionable objectives: tap the objective line for what to do, what is missing, where on the map, and a shortcut ---------------- */
let objMarks = null;   // { spots: [{x, y, label}], until }
function suggestSpot(type) {   // the free, valid spot nearest the town centre (tapped tile = south tile, like the player would)
  const d = DEFS[type]; if (!d) return null; let best = null, bd = 1e9; const cx = (Wd.BUILD.x0 + Wd.BUILD.x1) / 2, cy = (Wd.BUILD.y0 + Wd.BUILD.y1) / 2;
  for (let y = Wd.BUILD.y0; y <= Wd.BUILD.y1; y++) for (let x = Wd.BUILD.x0; x <= Wd.BUILD.x1; x++) { const dd = Math.hypot(x - cx, y - cy); if (dd >= bd || !Wd.placementCheck(world, x, y, d, null).ok) continue; bd = dd; best = { x, y }; }
  return best && { x: best.x, y: best.y, sx: best.x + d.w - 1, sy: best.y + d.h - 1 };
}
/* 3D.169 (play-test round 1: "the wall line is full but not sealed", no hint why). findGaps started from the old town centre (before the
   3D.103 map offset), outside the ring, so it never found a gap. Each gap now says what keeps it open. */
function gapWhy(x, y) {
  const wl = Wd.wallAt(world, x, y); if (wl && wl.broken) return 'a broken section: a worker repairs it, or rebuild it';
  if (Wd.isRoad(world, x, y)) return 'a road: close it with a Gate';
  const bl = world.buildings.find((b) => { const t = Wd.approachTile(b); return t.x === x && t.y === y; }); if (bl) return `the ${DEFS[bl.type].name}'s doorway: a Gate fits there`;
  if (postAt(x, y)) return 'a guard post: move it or wall round it';
  const Zn = Wd.WALLZONE; if (x === Zn.x0 || x === Zn.x1 || y === Zn.y0 || y === Zn.y1) return 'an open tile in the outer wall line';
  return Wd.inWallZone(x, y) ? 'an open tile in an inner fence' : 'outside the wall area';
}
function findGaps(max = 8) {   // where the zombies' way in is: trace the shortest escape from the town to the map edge, pick the gap tile on it, pretend it is walled, repeat
  let seed = Wd.nearestWalkable(world, 7 + Wd.OFF, 10 + Wd.OFF, true); if (!seed) return [];
  { const per = Wd.perimeter(world); if (per.ring && per.outsideB.length) { const b = per.outsideB.find((q) => DEFS[q.type].fam !== 'hq') || per.outsideB[0], t = Wd.approachTile(b); seed = Wd.walkable(world, t.x, t.y, true) ? t : Wd.nearestWalkable(world, t.x, t.y, true) || seed; } }   /* 3D.172: the camp fence is closed but buildings are still outside: look for the gap from one of them */ const plug = new Set(), gaps = [];
  const open = (x, y) => Wd.inMap(x, y) && !plug.has(x + ',' + y) && Wd.walkable(world, x, y, true);
  const wallN = (x, y) => { let n = 0; for (let dy = -1; dy <= 1; dy++) for (let dx = -1; dx <= 1; dx++) if ((dx || dy) && ((Wd.wallAt(world, x + dx, y + dy) && !Wd.wallAt(world, x + dx, y + dy).broken) || plug.has((x + dx) + ',' + (y + dy)))) n++; return n; };
  for (let it = 0; it < max; it++) {
    const prev = new Map([[seed.x + ',' + seed.y, null]]), q = [seed]; let end = null;
    for (let i = 0; i < q.length && !end; i++) { const c = q[i]; if (c.x === 0 || c.y === 0 || c.x === COLS - 1 || c.y === ROWS - 1) { end = c; break; }
      for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) { const nx = c.x + dx, ny = c.y + dy, k = nx + ',' + ny; if (!prev.has(k) && open(nx, ny)) { prev.set(k, c); q.push({ x: nx, y: ny }); } } }
    if (!end) break; const path = []; for (let c = end; c; c = prev.get(c.x + ',' + c.y)) path.push(c);
    const Zr = Wd.WALLZONE, onLine = (c) => c.x === Zr.x0 || c.x === Zr.x1 || c.y === Zr.y0 || c.y === Zr.y1;   /* 3D.172 round 3: only the outer wall line (or a broken section). Hints to close the little camp fence walled the HQ's door in (Collector: supplies never arrived) */
    const cand = path.filter((c) => Wd.inWallZone(c.x, c.y) && onLine(c) && !Wd.buildingAt(world, c.x, c.y) && !(c.x === seed.x && c.y === seed.y)); if (!cand.length) break;   /* 3D.169: never the start tile (it kept picking the town centre) */
    const Zn = Wd.WALLZONE, ring = (c) => (c.x === Zn.x0 || c.x === Zn.x1 || c.y === Zn.y0 || c.y === Zn.y1 ? .5 : 0);   /* ties go to the outer wall line */
    const solid = (x, y) => plug.has(x + ',' + y) || !!Wd.buildingAt(world, x, y) || !!(Wd.wallAt(world, x, y) && !Wd.wallAt(world, x, y).broken);
    const sc = (c) => { const w = Wd.wallAt(world, c.x, c.y); return (w && w.broken ? 4 : 0) + ((solid(c.x - 1, c.y) && solid(c.x + 1, c.y)) || (solid(c.x, c.y - 1) && solid(c.x, c.y + 1)) ? 3 : 0) + wallN(c.x, c.y) * .1 + ring(c); };   /* a hole in a line: a broken section, or a tile with wall on both sides */
    let pick = cand[0], pn = -1; for (const c of cand) { const n = sc(c); if (n > pn) { pn = n; pick = c; } }   /* path runs edge → town: ties go to the outer line */
    plug.add(pick.x + ',' + pick.y); gaps.push({ x: pick.x, y: pick.y, label: Wd.isRoad(world, pick.x, pick.y) || /doorway/.test(gapWhy(pick.x, pick.y)) ? 'gate' : Wd.wallAt(world, pick.x, pick.y) ? 'rebuild' : 'gap', why: gapWhy(pick.x, pick.y) });
  }
  return gaps;
}
const buildObj = (type, extra = {}) => () => { const d = DEFS[type], lock = buildLock(type), sp = lock ? null : suggestSpot(type);
  return { reqs: [{ label: `${d.name}: ${costShort(bCost(d))}`, ok: canPay(bCost(d)), detail: canPay(bCost(d)) ? `you have 🪵 ${Math.floor(S.wood || 0)}  ⚙ ${Math.floor(S.mat)}` : `missing ${missText(bCost(d))}: chop trees for wood; wrecks, missions and kills bring scrap` }, ...(lock ? [{ label: 'Unlocked', ok: false, detail: lock }] : []), ...(lock || sp ? [] : [{ label: 'Free space', ok: false, detail: 'no free spot fits it: demolish or move something' }])],
    spots: sp ? [{ x: sp.sx + .5, y: sp.sy + .5, label: 'free spot' }] : [], act: lock ? null : { label: `Build ${d.name}`, fn: () => { closeP(); startTool({ kind: 'building', type }); if (sp) { updatePreview(sp.x, sp.y); centerOn(sp.sx + .5, sp.sy + .5); } } }, ...extra }; };
const zSpots = (f) => S.z.filter((z) => z.hp > 0 && f(z)).slice(0, 6).map((z) => ({ x: z.w.x, y: z.w.y, label: z.human ? 'raider' : 'zombie', live: z }));
const bSpots = (types) => world.buildings.filter((b) => types.includes(b.type)).map((b) => ({ x: b.x + b.w / 2, y: b.y + b.h / 2, label: DEFS[b.type].name }));
const OBJ_GUIDE = {
  'Grow Food': buildObj('farm'), 'A Place to Rest': buildObj('house'),
  'Make It Home': () => { const happy = S.sv.filter((q) => !q.resident && (q.sat || 0) >= 35); return { reqs: [{ label: 'A happy survivor (♥ 35+)', ok: happy.length > 0, detail: happy.length ? happy.map((q) => q.name).join(', ') : 'meals, rest, friends and fun raise ♥' }, { label: 'A free home', ok: popNow() < popCap(), detail: `${popNow()}/${popCap()} beds` }],
    spots: happy.map((q) => ({ x: q.w.x, y: q.w.y, label: q.name, live: q })), act: S.requests.length ? { label: 'See the request', fn: () => { closeP(); showNextRequest(); } } : null }; },
  'Scrap Economy': buildObj('scrapyard'),
  'Gear Up': () => bOf('armory').length ? { reqs: [{ label: 'Spare scrap for gear', ok: S.mat >= 4, detail: `${Math.floor(S.mat)} scrap` }], spots: bSpots(['armory']), act: { label: 'Open People', fn: () => { closeP(); showSurvivors(); } } } : buildObj('armory')(),
  'Train Up': () => ({ reqs: [{ label: 'Any one of: Gym, Library or Lounge', ok: ['gym', 'library', 'lounge'].some((t) => canPay(bCost(DEFS[t]))), detail: 'You only need one. Each trains a different stat: Gym = Strength, Library = Intelligence, Lounge = Charisma.' }], spots: [], act: { label: 'Pick one to build', fn: () => { bCat = 'train'; showBuild(); } } }),   /* 3D.30: any one counts */
  'Research': () => { const ws = bOf('workshop')[0]; return ws ? { reqs: [{ label: 'Research points', ok: (S.rp || 0) >= Math.min(...Object.values(RESEARCH).map((r) => r.rp)), detail: `${Math.floor(S.rp || 0)} RP: the workshop makes more` }], spots: bSpots(['workshop']), act: { label: 'Open the Workshop', fn: () => showBuildingInfo(ws, 'research') } } : buildObj('workshop')(); },
  'Hold the Line': () => { const wd = Wd.WALL_DEFS.wood; return { reqs: [{ label: `Walls: ${world.walls.size}/10`, ok: world.walls.size >= 10 }, { label: `Wood Fence: ${costShort(bCost(wd))} each`, ok: canPay(bCost(wd)), detail: `you have 🪵 ${Math.floor(S.wood || 0)}` }], spots: [], act: { label: 'Place walls', fn: () => { closeP(); startTool({ kind: 'wall', wtype: 'wood' }); } } }; },
  'Go Out There': () => ({ reqs: [{ label: 'A free squad member', ok: S.sv.some((q) => q.hp > q.max * .5 && !['down', 'away', 'errand', 'hospital'].includes(q.mode)) }], spots: [], act: { label: 'Open Explore', fn: () => { closeP(); showExpedition(); } } }),
  'More Land': () => { const e = expandInfo(); return { reqs: e ? [{ label: `Renown ${e.n.ren}`, ok: S.ren >= e.n.ren, detail: `you have ${Math.floor(S.ren)}` }, { label: costShort(bCost(e.n)), ok: canPay(bCost(e.n)), detail: `you have 🪵 ${Math.floor(S.wood || 0)}  ⚙ ${Math.floor(S.mat)}` }] : [], spots: [], act: { label: 'Open Town', fn: () => { closeP(); showTown(); } } }; },
};
const OBJ_MISSION = {
  clear: () => ({ reqs: [], spots: zSpots((z) => !z.human), act: null, tip: 'Your fighters attack zombies that come near. Walls and a Guard help; you can also tap a survivor to see who they are fighting.' }),
  produce: () => { const p = world.buildings.filter((b) => ['water', 'farm'].includes(DEFS[b.type].fam) || ['water', 'well', 'farm', 'field'].includes(b.type)), idle = p.filter((b) => DEFS[b.type].slot && !b.staff); return { reqs: [{ label: 'Food and water buildings', ok: p.length > 0, detail: p.length + ' built' }, { label: 'All of them staffed', ok: !idle.length, detail: idle.length ? idle.map((b) => DEFS[b.type].name).join(', ') + ' has no worker' : 'staffed buildings make more' }], spots: bSpots(['water', 'well', 'farm', 'field']), act: { label: 'Open Build', fn: () => { closeP(); showBuild(); } } }; },
  build: () => ({ reqs: [], spots: [], act: { label: 'Open Build', fn: () => { closeP(); showBuild(); } } }),
  research: () => OBJ_GUIDE.Research(),
  train: () => ({ reqs: [], spots: bSpots(['gym', 'library', 'lounge', 'range', 'track', 'sparring']), act: null, tip: 'Survivors train on their own in their free time.' }),
  raiders: () => ({ reqs: [], spots: zSpots((z) => z.human), act: null, tip: 'Raiders come every few days; your fighters chase them. Pets bark when they sneak in.' }),
  expedition: () => OBJ_GUIDE['Go Out There'](),
  friends: () => ({ reqs: [], spots: bSpots(['lounge', 'canteen']), act: null, tip: 'Survivors make friends while eating, relaxing and fighting side by side.' }),
  stockpile: () => { const g = S.mission ? S.mission.goal : 40; return { reqs: [{ label: `Food ${g}`, ok: S.food >= g, detail: `${Math.floor(S.food)} now` }, { label: `Water ${g}`, ok: S.water >= g, detail: `${Math.floor(S.water)} now` }, { label: `Storage room for ${g}`, ok: supplyCap() >= g, detail: `cap ${supplyCap()}` }], spots: bSpots(['storage']), act: null }; },
  seal: () => { const gaps = findGaps(), wd = Wd.WALL_DEFS.wood; return { reqs: [{ label: gaps.length ? `${gaps.length} gap${gaps.length > 1 ? 's' : ''} found` : 'No gaps left', ok: !gaps.length, detail: gaps.some((g) => g.label === 'gate') ? 'a road needs a Gate, not a wall' : 'zombies walk in through them' }, { label: `Wood for ${gaps.length} wall${gaps.length === 1 ? '' : 's'}`, ok: (S.wood || 0) >= gaps.length * wd.wood, detail: `about 🪵 ${gaps.length * wd.wood}, you have ${Math.floor(S.wood || 0)}` }],
    spots: gaps, act: { label: gaps.some((g) => g.label === 'gate') ? 'Place walls / gates' : 'Place walls', fn: () => { closeP(); startTool({ kind: 'wall', wtype: 'wood' }); showObjMarks(gaps); } } }; },
};
function currentObjective() {
  if (S.stage === 0) return { name: 'Water First', desc: 'Build a Rain Barrel', how: 'Every survivor drinks a daily ration. A Rain Barrel makes water; staffed, it makes more. Upgrade it later to a Rain Collector and a Stone Well.', prog: [0, 1], reward: '', ...buildObj('barrel')() };
  if (S.stage === 1) return { name: 'First Blood', desc: 'Defeat 3 Walkers', how: 'Your fighters attack zombies that come close. Watch them work, or tap a survivor to see what they are doing.', prog: [Math.min(S.kills, 3), 3], reward: '+10 Renown', reqs: [], spots: zSpots((z) => !z.human), act: null };
  if (guideActive()) { const g = GUIDE[S.guide], f = OBJ_GUIDE[g.name]; return { name: g.name, desc: g.desc, how: g.hint + guideLock(g), prog: [0, 1], reward: `+${g.parts} scrap, +${g.parts * 2} wood, +${g.ren} Renown`, reqs: [], spots: [], act: null, ...(f ? f() : {}) }; }
  if (S.mission) { const m = S.mission, f = OBJ_MISSION[m.id], o = f ? f() : {}; return { name: m.name, desc: m.desc, how: o.tip || '', prog: [Math.floor(m.progress), m.goal], reward: `+${m.rewardParts} scrap, +${m.rewardParts} wood, +${m.rewardRen} Renown`, reqs: [], spots: [], act: null, ...o }; }
  return null;
}
function showObjMarks(spots) { objMarks = { spots, until: performance.now() + 12000 }; }
/* ---------------- V2.35 resource panel: tap food / water / scrap in the top-left plaque ---------------- */
const f1 = (n) => (Math.abs(n) < .05 ? 0 : Math.round(n * 10) / 10).toFixed(1), sgn = (n) => (n >= 0 ? '+' : '−') + f1(Math.abs(n));
function resForecast(e) {   // one plain-language line about where the stock is heading
  if (e.cap && e.full && e.net > 0) return { t: 'Storage full: extra production is wasted. Build Storage to hold more.', c: 'var(--gold)' };
  if (e.net < -1e-6) { const d = e.days; return { t: d < 1 ? `Runs out in under a day (${Math.max(1, Math.round(d * 24))} h)` : `Runs out in about ${d < 10 ? d.toFixed(1) : Math.round(d)} days`, c: d < 2 ? 'var(--bad)' : '#ffb36b' }; }
  if (e.fullIn) return { t: `Storage full in about ${e.fullIn < 10 ? e.fullIn.toFixed(1) : Math.round(e.fullIn)} days`, c: 'var(--good)' };
  return { t: e.net > 1e-6 ? 'Growing' : 'Steady', c: 'var(--good)' };
}
let rTab = 'food';
function showResource(k) {
  if (k) rTab = k; endBuildMode(true); closeP(); $('it').textContent = RES_TITLE[rTab].toUpperCase();
  const E = econ(), e = E[rTab], fc = resForecast(e), L = ecoLast24(rTab);
  const row = (q, sign) => `<div class="row" style="gap:6px"${q.b ? ` data-b="${world.buildings.indexOf(q.b)}"` : ''}><span class="sp">${esc(q.name)}${q.b && DEFS[q.b.type].slot ? ` <small style="color:${q.b.staff ? 'var(--good)' : 'var(--bad)'}">${q.b.staff ? esc(q.b.staff.name) + ' · ' + Math.round(workShare(q.b) * 100) + '% of the day' : 'no worker'}</small>` : ''}</span><span style="color:${sign > 0 ? 'var(--good)' : '#ffb36b'}">${sign > 0 ? '+' : '−'}${f1(q.v)}</span>${q.b ? '<span style="color:var(--gold)">›</span>' : ''}</div>`;
  const grp = (list) => { const g = new Map(); for (const q of list) { if (q.group) { const o = g.get(q.group) || { name: q.group + ` (${list.filter((x) => x.group === q.group).length} buildings)`, v: 0 }; o.v += q.v; g.set(q.group, o); } else g.set(Symbol(), q); } return [...g.values()]; };
  const last = Object.entries(L.by).filter(([, v]) => Math.abs(v) > .05).sort((a, b) => Math.abs(b[1]) - Math.abs(a[1]));
  $('ib').innerHTML = tabBar([['food', 'Food'], ['water', 'Water'], ['wood', 'Wood'], ['stone', 'Stone'], ['mat', 'Scrap']], rTab)
    + `<div class="card"><div class="kv"><div><span>In stock</span><span><b>${Math.floor(e.stock)}</b>${e.cap ? ' / ' + e.cap : ''}</span></div><div><span>Produced / day</span><span style="color:var(--good)">${sgn(e.prod)}</span></div><div><span>Used / day</span><span style="color:#ffb36b">−${f1(e.use)}</span></div><div><span><b>Net / day</b></span><span style="color:${e.net >= 0 ? 'var(--good)' : 'var(--bad)'}"><b>${sgn(e.net)}</b></span></div></div>`
    + (e.cap ? `<div style="height:8px;background:#1d242b;border-radius:4px;margin:5px 0;position:relative"><i style="position:absolute;left:0;top:0;bottom:0;width:${Math.min(100, 100 * e.stock / e.cap)}%;background:${e.full ? 'var(--gold)' : '#6fb3e0'};border-radius:4px"></i></div>` : '')
    + `<div style="color:${fc.c}">${fc.t}</div>` + (rTab === 'wood' || rTab === 'stone' ? `<div class="card row gTog" style="gap:10px;align-items:center"><span class="sp"><b>${rTab === 'wood' ? 'Chop trees' : 'Break rocks'}</b><div class="sm">${S.gatherPause && S.gatherPause[rTab] ? `Paused: nobody ${rTab === 'wood' ? 'chops trees' : 'breaks rocks'} (a Lumber Camp or Quarry keeps working)` : `Idle survivors ${rTab === 'wood' ? 'chop trees' : 'break rocks'} when the town needs ${rTab}`}</div></span><button class="tgl${S.gatherPause && S.gatherPause[rTab] ? '' : ' on'}" id="gPause" role="switch" aria-label="${rTab === 'wood' ? 'Chop trees' : 'Break rocks'}"></button></div>` : '') + (rTab === 'mat' ? '<div class="sm">Scrap also comes from zombie kills, missions and expeditions, and goes to repairs, gear and building. Those swing day to day, so they are in "Last 24 h" below, not in the daily rate.</div>' : rTab === 'stone' ? '<div class="sm">Stone comes from rock outcrops around the town (survivors break them with a pick) and from a staffed Quarry. Rocks you tap get mined first. Broken rocks come back after about 4 days. Stone builds the stone tier (Fort, Stone House, Stone Well…).</div>' : rTab === 'wood' ? '<div class="sm">Wood comes from chopping trees: idle survivors chop on their own in the daytime, and you can tap a tree to mark it (marked trees go first, even far ones). Chopped trees leave a stump that grows back in about 3 days. Storage holds more.</div>' : '') + '</div>'
    + (e.issues.length ? `<div class="card" style="border-color:#c0574a"><b style="color:var(--bad)">Problems</b>${e.issues.map((i) => `<div class="row" data-b="${world.buildings.indexOf(i.b)}" style="gap:6px"><span class="sp">⚠ ${esc(i.t)}</span><span style="color:var(--gold)">›</span></div>`).join('')}</div>` : '')
    + `<div class="card"><b>Producers</b>${e.producers.length ? e.producers.map((q) => row(q, 1)).join('') : `<div class="sm">None yet: ${rTab === 'food' ? 'build a Garden Plot' : rTab === 'water' ? 'build a Rain Barrel' : rTab === 'wood' ? 'idle survivors chop trees; a Lumber Camp chops all day' : rTab === 'stone' ? 'idle survivors break rocks; a Quarry digs all day' : 'build a Scrapyard'}.</div>`}</div>`
    + `<div class="card"><b>Users</b>${e.consumers.length ? grp(e.consumers).map((q) => row(q, -1)).join('') : '<div class="sm">Nothing uses it every day.</div>'}</div>`
    + `<div class="card"><b>Last ${L.hours || 0} h (what really happened)</b>${last.length ? last.map(([n, v]) => `<div class="row"><span class="sp">${esc(n)}</span><span style="color:${v >= 0 ? 'var(--good)' : '#ffb36b'}">${sgn(v)}</span></div>`).join('') : '<div class="sm">Nothing recorded yet: this fills in hour by hour.</div>'}</div>`
    + `<div class="sm">Rates are per game day and use each worker's measured share of the day on the job.</div>`;
  showPanel();
  $('ib').querySelectorAll('[data-tab]').forEach((b) => { b.onclick = () => showResource(b.dataset.tab); });
  { const gp = $('gPause'); if (gp) gp.onclick = () => { const r = rTab; S.gatherPause = S.gatherPause || {}; S.gatherPause[r] = !S.gatherPause[r]; if (S.gatherPause[r]) for (const q of S.sv) if (q.gatherAt && q.gatherK && NODE[q.gatherK] && NODE[q.gatherK].res === r && !q.carriedLoot) { q.gatherAt = null; enterFree(q, 10); } say(S.gatherPause[r] ? (r === 'wood' ? 'Chopping paused.' : 'Mining paused.') : (r === 'wood' ? 'Chopping back on.' : 'Mining back on.')); saveGame(); showResource(r); }; }
  $('ib').querySelectorAll('[data-b]').forEach((el) => { const b = world.buildings[+el.dataset.b]; if (b) { el.style.cursor = 'pointer'; el.onclick = () => showBuildingInfo(b); } });
}
/* ---------------- V2.39 Town Advisor: one line under the objective with the most urgent strategic issue (emergencies stay in the red alerts) ---------------- */
let advShown = null;
function advisorTips() {
  const T = [], E = econ(), add = (key, pri, icon, text, act) => T.push({ key, pri, icon, text, act });
  for (const k of ['food', 'water']) { const e = E[k]; if (e.net < -1e-6 && e.days < 3) add('short' + k, 90 - e.days * 10, k === 'food' ? '🍖' : '💧', `${RES_TITLE[k]} runs out in about ${e.days < 1 ? Math.max(1, Math.round(e.days * 24)) + ' h' : e.days.toFixed(1) + ' days'}`, () => showResource(k)); }
  { const full = world.buildings.filter((b) => TAP_COLLECT && b.trayFull && (b.bonus || 0) >= 1); if (full.length) add('tray', 75, '👆', full.length === 1 ? `${DEFS[full[0].type].name} is full: tap its bubble to collect` : `${full.length} buildings are full: tap their bubbles to collect`, () => { const b = full[0]; closeP(); centerOn(b.x + b.w / 2, b.y + b.h / 2); }); }   /* 3D.30 */
  const up = upkeepTotal(); if (S.mat + (S.wood || 0) < up) add('upkeep', 70, '⚙', `Not enough wood and scrap for tonight's upkeep (${f1(up)})`, () => showResource('mat'));
  for (const b of world.buildings) { const d = DEFS[b.type]; if (!d.slot || b.staff || !FAMRES(d.fam)) continue; const free = S.sv.find((q) => (STAFF_JOBS[d.fam] || []).includes(q.job) && !q.post && q.hp > 0); add('staff' + b.x + ',' + b.y, 60, '👷', free ? `${d.name} has no worker: ${free.name} could take it` : `${d.name} has no ${(STAFF_JOBS[d.fam] || []).join(' or ')}: change someone's profession`, () => showBuildingInfo(b)); }
  if (S.rankReady || (rankConds() && rankConds().every((r) => r.ok))) add('rank', 85, '⭐', 'The Haven can reach the next level', () => showUpgrade('rank'));
  if (world.walls.size >= 8 && !Wd.perimeter(world).sealed) { const g = findGaps(4).length; if (g) add('gaps', 45, '🧱', `Your wall ring has ${g} gap${g > 1 ? 's' : ''}`, () => { closeP(); startTool({ kind: 'wall', wtype: 'wood' }); showObjMarks(findGaps()); }); }
  { const n = unhoused().length, c = campCap(), eb = world.buildings.filter((b) => isHousing(b) && !b.burnt && (b.res || []).length < cap(b));   /* 3D.30 housing */
    if (n && eb.length) add('emptyBeds', 55, '🛏', `${eb.reduce((a, b) => a + cap(b) - (b.res || []).length, 0)} empty bed${eb.length > 1 || cap(eb[0]) - (eb[0].res || []).length > 1 ? 's' : ''}: choose who moves in`, () => showResidents(eb[0]));
    else if (c && n > c) add('campFull', 65, '⛺', `Camp is over capacity: ${n}/${c}. Build housing`, () => { bCat = 'live'; showBuild(); }); }
  const rough = S.sv.filter((q) => q.sleeping === 'rough').length; if (rough >= 2) add('beds', 40, '🛏', `${rough} survivors sleep rough: build a Shelter`, () => { bCat = 'live'; showBuild(); });
  for (const k of ['food', 'water']) if (E[k].full && E[k].net > .2) add('full' + k, 30, '📦', `${RES_TITLE[k]} storage is full: build Storage${S.rank >= 3 ? ' or hold a Trade Caravan' : ''}`, () => showResource(k));
  const q = RANK_REQ[S.rank];
  const ws = bOf('workshop')[0]; if (ws) { const r = Object.entries(RESEARCH).find(([k, x]) => !researched(k) && researched(x.need) && (S.rp || 0) >= x.rp && S.mat >= resMat(k)); if (r) add('res', 25, '🔬', `Research ready: ${r[1].name}`, () => showBuildingInfo(ws, 'research')); }
  if (S.rank >= 2 && !(S.posts || []).length && S.sv.some((q) => isFighter(q)) && S.mat >= POST_COST) add('post', 22, '🛡️', 'Build a guard post: a fighter on watch draws zombies away from your workers', () => { closeP(); startTool({ kind: 'post' }); });   /* V2.45 */
  if (S.day >= 4 && Date.now() - exportedAt(SLOT - 1) > 7 * 864e5) add('backup', 15, '💾', 'No backup this week: export one (Safari can clear old site data)', () => showBackup());   /* V2.42 */
  const day = S.day, mute = S.advMute || {}; return T.filter((t) => mute[t.key] !== day && (S.stage >= 2 || t.pri >= 70)).sort((a, b) => b.pri - a.pri);   /* during the opening goals only serious issues */
}
function layoutTop() {   // the left menu and the alerts sit just under the plaque, whatever its height
  const pl = $('plaque'), w = $('world'); if (!pl || !w) return; const y = Math.round(pl.getBoundingClientRect().bottom - w.getBoundingClientRect().top + 6);
  for (const id of GLASS ? ['alerts'] : ['lmenu', 'alerts']) { const e = $(id); if (e && e.style.top !== y + 'px') e.style.top = y + 'px'; }   /* 3D.28 Glass: the menu is the bottom tab bar */
  if (GLASS) { const ck = $('clock'), y2 = ck ? Math.round(ck.getBoundingClientRect().bottom - w.getBoundingClientRect().top + 6) : y, g = $('gauge'), h = $('btnHome'), bt = $('bottom'); const U = UI_U; if (g) g.style.top = Math.round(y2 / U) + 'px'; if (h) h.style.top = Math.round(y2 / U + 44) + 'px'; if (bt && !HUD_B) bt.style.top = Math.round(y2 / U + 102) + 'px'; { const nt = nStack('nTop'); if (nt && g) nt.style.top = Math.round((g.getBoundingClientRect().bottom - w.getBoundingClientRect().top + 8) / U) + 'px'; }   /* 3D.159 the news hangs just under the Renown chip, however tall the clock is */ if (bt && HUD_B) bt.style.setProperty('top', Math.round(Math.max(y2 / U + 50, w.getBoundingClientRect().height * .44 / U - bt.offsetHeight / 2)) + 'px', 'important'); }   /* 3D.159 the dock stays at mid-height, but never above the bottom of the Renown chip (it covered Renown on a short screen) */   /* 3D.159 these are drawn at --u: their top is in their own pixels */   /* the right column hangs off the clock card, so tips and notifications under the mission card never push it down */
}
function advisorUpdate() {
  if (GLASS) { const e0 = $('adv'); if (e0) e0.style.display = 'none'; alertHub(); return; }
  const el = $('adv'); if (!el) return; if (!OPTS.advisor) { el.style.display = 'none'; layoutTop(); return; }
  const t = advisorTips()[0]; advShown = t || null; if (!t) { el.style.display = 'none'; layoutTop(); return; }
  el.style.display = 'flex'; const txt = `${t.icon} ${t.text}`; if (el.dataset.k !== t.key || el.firstChild.textContent !== txt) { el.dataset.k = t.key; el.firstChild.textContent = txt; } layoutTop();
}
function showObjective() {
  const o = currentObjective(); if (!o) { showGoals(); return; }
  endBuildMode(true); closeP(); $('it').textContent = 'OBJECTIVE';
  const [c, g] = o.prog, pct = Math.round(100 * Math.min(1, c / (g || 1)));
  $('ib').innerHTML = `<div class="card"><div style="font-size:24px;color:var(--gold)">${esc(o.name)}</div><div style="font-size:20px">${esc(o.desc)}</div>`
    + (g > 1 ? `<div class="gbar" style="position:relative;height:10px;background:#1d242b;border-radius:5px;margin:6px 0"><i style="position:absolute;left:0;top:0;bottom:0;width:${pct}%;background:#7fd35a;border-radius:5px"></i></div><div class="sm">${c}/${g}</div>` : '')
    + (o.how ? `<div class="sm" style="margin-top:4px">${esc(o.how)}</div>` : '') + (o.reward ? `<div class="sm" style="color:var(--good)">Reward: ${o.reward}</div>` : '') + '</div>'
    + (o.reqs.length ? `<div class="card">${o.reqs.map((r) => `<div class="row" style="gap:6px"><span style="width:22px;color:${r.ok ? '#7fd35a' : '#ff8a7a'}">${r.ok ? '✔' : '✘'}</span><span class="sp">${esc(r.label)}${r.detail ? ` <small style="color:var(--muted)">· ${esc(r.detail)}</small>` : ''}</span></div>`).join('')}</div>` : '')
    + `<div class="row" style="gap:6px">${o.spots.length ? '<button class="act" id="oShow" style="flex:1">📍 Show on map</button>' : ''}${o.act ? `<button class="act go" id="oAct" style="flex:1">${esc(o.act.label)}</button>` : ''}</div><button class="act" id="oAll">All goals</button>`;
  showPanel();
  if ($('oShow')) $('oShow').onclick = () => { closeP(); showObjMarks(o.spots); const p = o.spots[0]; centerOn(p.x, p.y); };
  if ($('oAct')) $('oAct').onclick = () => o.act.fn(); $('oAll').onclick = showGoals;
}
function drawObjMarks() {
  if (!objMarks) return; if (performance.now() > objMarks.until) { objMarks = null; return; }
  const t = performance.now() / 1000, pulse = .5 + .5 * Math.sin(t * 5);
  for (const sp of objMarks.spots) { const w = sp.live ? sp.live.w : sp; if (sp.live && (sp.live.hp <= 0)) continue;
    const tx = Math.floor(w.x), ty = Math.floor(w.y); ctx.save(); tilePath(tx, ty); ctx.fillStyle = `rgba(255,225,69,${.18 + .2 * pulse})`; ctx.fill(); ctx.strokeStyle = '#ffe145'; ctx.lineWidth = 2.5; ctx.stroke(); ctx.restore();
    const p = project(tx + .5, ty + .5); statusTag(p.x, p.y - TWs() * .32 - 6 * pulse, sp.label.toUpperCase(), '#ffe38a'); }
}
function questFlash() { const q = $('quest'); if (!q) return; q.classList.remove('qDone'); void q.offsetWidth; q.classList.add('qDone'); objMarks = null; }
function showGoals() {
  endBuildMode(true); closeP(); $('it').textContent = 'GOALS'; const gi = S.guide || 0;
  const first = [['Water', 'Build a Rain Barrel', S.stage >= 1], ['First Blood', 'Defeat 3 Walkers', S.stage >= 2]];
  const rows = first.map(([n, d, ok]) => `<div style="opacity:${ok ? .6 : 1}">${ok ? '✔' : '▶'} <b>${n}</b> — ${d}</div>`).join('')
    + GUIDE.map((g, i) => { const done = S.stage >= 2 && i < gi, cur = S.stage >= 2 && i === gi; return `<div style="opacity:${done ? .6 : cur ? 1 : .45};${cur ? 'border:1px solid #ffe38a;border-radius:4px;padding:3px;margin:2px 0' : ''}">${done ? '✔' : cur ? '▶' : '·'} <b>${g.name}</b> — ${g.desc}${cur ? `<br><small>${g.hint}</small><br><small>Reward: +${g.parts} scrap, +${g.parts * 2} wood, +${g.ren} Renown</small>` : ''}</div>`; }).join('');
  legacyCheck(); const lg = `<div class="card" style="margin-top:8px"><b>🏅 Legacy goals</b> <span class="sm">${legacyDone()}/${LEGACY.length} · ${DF().icon} ${DF().name}${modTag()}</span>${LEGACY.map((g) => { const d = (S.legacy || {})[g.id], [a, b] = g.prog(); return `<div style="opacity:${d ? .6 : 1}">${d ? '✔' : g.icon} <b>${g.name}</b> — ${g.desc} <span class="sm">${d ? 'day ' + d : Math.min(a, b) + '/' + b}</span></div>`; }).join('')}<div class="sm">Each: +15 Renown, +10 scrap.</div></div>
    <div class="card"><b>📻 The Signal</b><div class="sm">${S.won ? `The convoy came on day ${S.won.day}. Score ${S.won.score}. The town is yours to keep building.` : S.finale ? `Final stand under way: night ${S.finale.night} of ${FINALE_NIGHTS}. Hold out until dawn after night ${FINALE_NIGHTS}.` : `Reach ★5 and finish ${LEGACY_NEED} legacy goals, build a Radio Tower with a running Generator, then call for the convoy: ${FINALE_NIGHTS} nights of hordes, then the ending and your score. (★${S.rank}/5 · ${legacyDone()}/${LEGACY_NEED} goals · ${radioOk() ? '📻 radio on air' : world.buildings.some((b) => b.type === 'radio') ? '📻 radio needs power' : '📻 no Radio Tower yet'})`}</div>${signalReady() ? '<button class="act go" id="gSignal" style="width:100%">📻 Call for the convoy</button>' : ''}</div>`;
  $('ib').innerHTML = goalsHtml() + (gi >= GUIDE.length ? lg + rows : rows + lg) + trophyCard() + legacyCard() + (gi >= GUIDE.length && S.mission ? `<br><b>Mission:</b> ${S.mission.name} — ${S.mission.desc} (${Math.floor(S.mission.progress)}/${S.mission.goal})` : '') + '<br><button class="act" id="gLog">📜 Event log</button>';
  showPanel(); $('gLog').onclick = showLog; { const tb = $('trOpen'); if (tb) tb.onclick = showTrophies; } { const lo = $('legOpen'); if (lo) lo.onclick = showLegacy; } $('ib').querySelectorAll('[data-claim]').forEach((el) => { el.onclick = () => { const [t, id] = el.dataset.claim.split(':'), G = S.goals || {}, g = (t === 'd' ? G.daily : G.weekly || []).find((q) => q.id === id); claimGoal(g, t === 'd' ? GOALS_DAILY : GOALS_WEEKLY); showGoals(); }; }); const gs = $('gSignal'); if (gs) gs.onclick = () => { closeP(); startFinale(); };
}
function logEvent(t, lvl = 'routine') { if (!t || /^★ RENOWN|^Goal complete:|^\+\d+ SCRAP · mission/.test(t)) return;   /* skip echoes of toasts */ S.log = S.log || []; const last = S.log[S.log.length - 1]; if (last && last.t === t) return; S.log.push({ d: S.day, h: S.hour, t: String(t), l: lvl }); if (S.log.length > 60) S.log.splice(0, S.log.length - 60); }
let logOnlyKey = false;
function showLog() {
  endBuildMode(true); closeP(); $('it').textContent = 'EVENT LOG';
  const L = (S.log || []).slice().reverse().filter((e) => !logOnlyKey || e.l === 'critical' || e.l === 'important'), C = document.documentElement.classList.contains('cozy') ? { critical: '#b85a47', important: '#a8682a' } : { critical: '#ff9a84', important: '#ffe08a' };
  $('ib').innerHTML = `<div class="row" style="gap:6px;margin-bottom:6px"><button class="act" id="logFilt" style="flex:1">${logOnlyKey ? 'Showing: alerts + important' : 'Showing: everything'}</button><button class="act" id="logSlow" style="flex:1">1× on emergencies: ${OPTS.autoSlow ? 'ON' : 'OFF'}</button></div><div class="row" style="gap:6px;margin-bottom:6px"><button class="act" id="logLights" style="flex:1">Night lights: ${OPTS.nightLights ? 'ON' : 'OFF (faster)'}</button><button class="act" id="logAdv" style="flex:1">Town advisor: ${OPTS.advisor ? 'ON' : 'OFF'}</button></div><button class="act" id="logBak" style="width:100%;margin-bottom:6px">💾 Backup this town</button>`
    + (L.length ? L.map((e) => `<div style="padding:2px 0;border-bottom:1px solid ${document.documentElement.classList.contains('cozy') ? '#e2cfb0' : '#3e4a56'}${e.l === 'routine' || !e.l ? ';opacity:.8' : ''}"><small style="color:var(--muted)">Day ${e.d} · ${String(e.h).padStart(2, '0')}:00</small> <span style="color:${C[e.l] || 'inherit'}">${e.l === 'critical' ? '⚠ ' : ''}${esc(e.t)}</span></div>`).join('') : '<small>Nothing yet.</small>');
  $('logFilt').onclick = () => { logOnlyKey = !logOnlyKey; showLog(); }; $('logSlow').onclick = () => { OPTS.autoSlow = !OPTS.autoSlow; saveOpts(); showLog(); }; $('logLights').onclick = () => { OPTS.nightLights = !OPTS.nightLights; saveOpts(); showLog(); }; $('logAdv').onclick = () => { OPTS.advisor = !OPTS.advisor; saveOpts(); advisorUpdate(); showLog(); }; $('logBak').onclick = () => showBackup();
  showPanel();
}
function stageCheck() { if (S.stage === 1 && S.kills >= 3) { S.stage = 2; S.guide = 0; questFlash(); renownGain(10, 'Goal complete'); firstGift('walkers'); say('Goal complete!'); guideSkipDone(); guideIntro(); } }
