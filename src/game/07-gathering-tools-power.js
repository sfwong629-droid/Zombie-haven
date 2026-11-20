/* ---------------- V3D.22/23 gathering: trees (wood), rock outcrops (stone) and wrecks (scrap) are resource nodes ----------------
   Each node has a few charges; an empty one is a stump / rubble / stripped wreck that comes back after NODE[k].regrow game hours.
   Idle survivors gather on their own in quiet daytime hours near the town, going for what the building work needs most;
   nodes the player marks (tap) go first, wherever they are. Loads go straight to a construction job that needs them,
   otherwise to the HQ or the nearest storage. */
const NODE = {
  tree:  { res: 'wood',  charges: 3, regrow: 72,  ticks: 700, amt: 3, act: 'Chopping',   verb: 'chop', icon: '🪓' },
  rock:  { res: 'stone', charges: 4, regrow: 96,  ticks: 900, amt: 2, act: 'Mining',     verb: 'mine', icon: '⛏' },
  wreck: { res: 'mat',   charges: 2, regrow: 120, ticks: 800, amt: 2, act: 'Salvaging',  verb: 'salvage', icon: '🔧' },
  bin:   { res: 'cloth', charges: 2, regrow: 96,  ticks: 500, amt: 1, act: 'Searching',  verb: 'search', icon: '🧵' },   /* V3D.25 clothes bins, out past the walls */
};
const BIN_SPOTS = [[1, 1], [14, 1], [0, 19], [15, 19], [18, 9], [26, 3], [24, 18], [16, 27], [6, 28], [27, 28]].map(SH);
const ROCK_SPOTS = [[3, 1], [8, 1], [12, 1], [0, 9], [0, 13], [15, 9], [15, 14], [2, 20], [9, 21], [14, 20], [18, 4], [23, 8], [19, 15], [25, 13], [22, 20], [17, 25], [11, 27], [5, 25], [25, 24], [21, 11]].map(SH);
/* 3D.101 the new outer ring (the OFF-wide frame added round the old map) gets its own trees, rocks and clothes bins; the highway
   gets abandoned cars to salvage (they also block one lane here and there: it's broken down) */
{ const frame = (x, y) => x < OFF || y < OFF || x >= COLS - OFF || y >= ROWS - OFF, h2 = (x, y) => { let n = (x * 73856093) ^ (y * 19349663); n = (n ^ (n >>> 13)) * 1274126177; return ((n ^ (n >>> 16)) >>> 0) / 4294967296; };
  const near = (x, y) => [-1, 0, 1, 2].some((d) => Wd.hwyAt(x, y + d) || Wd.hwyAt(x + d, y));
  for (let y = 0; y < ROWS; y++) for (let x = 0; x < COLS; x++) { if (!frame(x, y) || near(x, y)) continue; const r = h2(x, y);
    if (r < .075) TREE_SPOTS.push([x, y]); else if (r < .1) ROCK_SPOTS.push([x, y]); else if (r < .11) BIN_SPOTS.push([x, y]); }
  for (const [x, y] of [[2, Wd.HWY_Y], [7, Wd.HWY_Y + 1], [13, Wd.HWY_Y], [26, Wd.HWY_Y + 1], [31, Wd.HWY_Y], [37, Wd.HWY_Y + 1]]) CAR_SPOTS.push([x, y]);
  for (const L of [TREE_SPOTS, ROCK_SPOTS, BIN_SPOTS, CRATE_SPOTS, DEBRIS_SPOTS]) for (let i = L.length - 1; i >= 0; i--) if (near(L[i][0], L[i][1])) L.splice(i, 1); }   // nothing old sits on the road

/* 3D.132 review step 9: four lands to settle. A map decides where the trees, rock, wrecks and clothes bins are, so each one changes what
   comes easily and what has to be fetched or traded for. 'road' is the land every town used until now. The lists are rebuilt in place
   (the 3D view and the node code hold on to the same arrays). Thinning and adding use fixed hashes, so a map is the same every time. */
const MAPS = {
  road:     { name: 'Roadside',     icon: '🛣️', desc: 'The usual land: a bit of everything.' },
  pines:    { name: 'Pine Hollow',  icon: '🌲', desc: 'Thick woods. Wood is easy; scrap and stone are scarce.', tree: .1, rockKeep: .5, wreck: .05 },
  ridge:    { name: 'Quarry Ridge', icon: '⛰️', desc: 'Bare rock. Stone is easy; wood is scarce.', rock: .08, treeKeep: .45, wreck: .09 },
  junction: { name: 'The Junction', icon: '🚗', desc: 'A choked crossroads. Wrecks and clothes bins everywhere; few trees.', car: .035, bin: .03, treeKeep: .55, wreck: .2 },
};
const MAP_BASE = { tree: TREE_SPOTS.map((p) => [...p]), rock: ROCK_SPOTS.map((p) => [...p]), car: CAR_SPOTS.map((p) => [...p]), bin: BIN_SPOTS.map((p) => [...p]) };
let curMap = 'road';
function setMap(k) { k = MAPS[k] ? k : 'road'; const M = MAPS[k]; S.map = k; curMap = k;
  const L = { tree: TREE_SPOTS, rock: ROCK_SPOTS, car: CAR_SPOTS, bin: BIN_SPOTS }; for (const q in L) { L[q].length = 0; L[q].push(...MAP_BASE[q].map((p) => [...p])); }
  if (k !== 'road') { const keep = (list, f, a, b) => { if (f == null) return; for (let i = list.length - 1; i >= 0; i--) if (hash2(list[i][0] * a + 3, list[i][1] * b + 5) >= f) list.splice(i, 1); };
    keep(TREE_SPOTS, M.treeKeep, 11, 17); keep(ROCK_SPOTS, M.rockKeep, 13, 7);
    const used = new Set([...TREE_SPOTS, ...ROCK_SPOTS, ...CAR_SPOTS, ...BIN_SPOTS, ...CRATE_SPOTS, ...DEBRIS_SPOTS].map(([x, y]) => x + ',' + y)), core = (x, y) => x >= OFF + 2 && x <= OFF + 13 && y >= OFF + 5 && y <= OFF + 16,   /* the camp and its first buildings stay clear */
      road = (x, y) => [-1, 0, 1, 2].some((d) => Wd.hwyAt(x, y + d) || Wd.hwyAt(x + d, y)), t = M.tree || 0, r = t + (M.rock || 0), c = r + (M.car || 0), b = c + (M.bin || 0);
    for (let y = 0; y < ROWS; y++) for (let x = 0; x < COLS; x++) { if (core(x, y) || road(x, y) || used.has(x + ',' + y)) continue; const h = hash2(x * 31 + 7, y * 19 + 11);
      if (h < t) TREE_SPOTS.push([x, y]); else if (h < r) ROCK_SPOTS.push([x, y]); else if (h < c) CAR_SPOTS.push([x, y]); else if (h < b) BIN_SPOTS.push([x, y]); } }
  wreckKey = ''; S.nodeVer = (S.nodeVer || 0) + 1; }

const nodeKey = (x, y) => x + ',' + y;
function nodeList() {
  return [...TREE_SPOTS.map(([x, y]) => ({ k: 'tree', x, y })), ...ROCK_SPOTS.map(([x, y]) => ({ k: 'rock', x, y })), ...[...CAR_SPOTS, ...wreckSpots()].map(([x, y]) => ({ k: 'wreck', x, y })), ...BIN_SPOTS.map(([x, y]) => ({ k: 'bin', x, y }))];
}
function nodeKindAt(x, y) { if (TREE_SPOTS.some(([a, b]) => a === x && b === y)) return 'tree'; if (ROCK_SPOTS.some(([a, b]) => a === x && b === y)) return 'rock'; if ([...CAR_SPOTS, ...wreckSpots()].some(([a, b]) => a === x && b === y)) return 'wreck'; if (BIN_SPOTS.some(([a, b]) => a === x && b === y)) return 'bin'; return null; }
function treeNode(x, y) { S.nodes ||= {}; const k = nodeKey(x, y); return S.nodes[k] || (S.nodes[k] = { left: NODE[nodeKindAt(x, y) || 'tree'].charges, regrow: 0, mark: false }); }
function treeBlocked(x, y) { return !!(Wd.buildingAt(world, x, y) || Wd.wallAt(world, x, y) || Wd.isRoad(world, x, y) || (S.sites || []).some((q) => x >= q.x && x < q.x + q.w && y >= q.y && y < q.y + q.h)); }
function nodeState(x, y) { if (treeBlocked(x, y)) return null; const n = (S.nodes || {})[nodeKey(x, y)]; return !n || n.left > 0 ? (n && n.mark ? 'marked' : 'full') : 'empty'; }
function treeState(x, y) { const st = nodeState(x, y); return st === 'full' ? 'tree' : st === 'empty' ? 'stump' : st; }   /* (renderer: trees) */
const isTreeSpot = (x, y) => !!nodeKindAt(x, y);
function nodesTick() {   // once a game hour: emptied nodes come back
  let ch = false; for (const n of Object.values(S.nodes || {})) if (n.left <= 0 && nowH() >= n.regrow) { n.left = 99; ch = true; }
  for (const [k, n] of Object.entries(S.nodes || {})) if (n.left === 99) { const [x, y] = k.split(',').map(Number); n.left = NODE[nodeKindAt(x, y) || 'tree'].charges; }
  if (ch) S.nodeVer = (S.nodeVer || 0) + 1;
}
const RARE = ['cloth', 'meds', 'fuel'], rareCap = () => 20 + 10 * storeTiers();   /* V3D.25 rare resources */
const resCap = (r) => r === 'mat' ? scrapCap() : r === 'ammo' ? ammoCap() : RARE.includes(r) ? rareCap() : matCap();
function resWant(r) {   // how badly the town wants more of r right now (0 = not at all)
  if (S.gatherPause && S.gatherPause[r]) return 0;   /* 3D.41 Wood / Stone panel: pause all chopping or mining */
  const need = jobList().reduce((a, { j }) => a + Math.max(0, (j.need[r] || 0) - (j.got[r] || 0) - (j.inb[r] || 0)), 0), have = S[r] || 0;
  if (have >= resCap(r) - 1) return 0;
  if (need > have) return 3 + Math.min(3, (need - have) / 4);
  if (r === 'wood') return have < 25 ? 1.4 : .8;
  if (r === 'stone') return hqTier() >= 2 ? (have < 20 ? 1 : .5) : need ? 1 : .08;
  if (r === 'cloth') return have < 6 ? .5 : .15;
  return have < 8 ? 1.8 : have < 15 ? 1 : .5;
}
function tryGather(s) {
  if (isNight() || s.job === 'Guard') return false;   /* 3D.64 owner: Guards don't chop wood; they patrol */
  const busy = new Set(S.sv.filter((q) => q !== s && q.gatherAt).map((q) => q.gatherAt)), town = { x: (Wd.BUILD.x0 + Wd.BUILD.x1 + 1) / 2, y: (Wd.BUILD.y0 + Wd.BUILD.y1 + 1) / 2 };
  const live = nodeList().filter((n) => { const st = nodeState(n.x, n.y); return (st === 'full' || st === 'marked') && !busy.has(nodeKey(n.x, n.y)) && resWant(NODE[n.k].res) > 0 && !zombieNear(tc(n.x, n.y), 6); });
  const near = (l) => l.sort((a, b) => dist(s.w, tc(a.x, a.y)) - dist(s.w, tc(b.x, b.y)))[0];
  let t = null; const marked = live.filter((n) => nodeState(n.x, n.y) === 'marked');
  if (marked.length && rnd() < .9) t = near(marked);
  else {
    const W = { wood: resWant('wood'), stone: resWant('stone'), mat: resWant('mat'), cloth: resWant('cloth') }, tot = W.wood + W.stone + W.mat + W.cloth; if (tot <= 0) return false;
    if (rnd() > Math.min(.85, .35 + tot * .12)) return false;
    let r = rnd() * tot, res = 'wood'; for (const k of ['wood', 'stone', 'mat', 'cloth']) { if ((r -= W[k]) <= 0) { res = k; break; } }
    t = near(live.filter((n) => NODE[n.k].res === res && dist(tc(n.x, n.y), town) < (res === 'cloth' ? 15 : 12)));
  }
  if (!t) return false;
  const c = tc(t.x, t.y), dx = s.w.x - c.x, dy = s.w.y - c.y, d = Math.hypot(dx, dy) || 1;
  s.gatherAt = nodeKey(t.x, t.y); s.gatherK = t.k; s.dest = { x: c.x + dx / d * .5, y: c.y + dy / d * .5 }; s.mode = 'walk'; s.purpose = 'gath-out'; s.path = null; s.stateTicks = 2400;
  s.why = nodeState(t.x, t.y) === 'marked' ? `Off to ${NODE[t.k].verb} the marked ${t.k}` : { tree: 'Chopping wood', rock: 'Breaking rocks for stone', wreck: 'Salvaging scrap from a wreck', bin: 'Searching a clothes bin for cloth' }[t.k]; return true;
}
function gatherTick(s) {
  s.moving = false; const [x, y] = (s.gatherAt || '').split(',').map(Number), st = s.gatherAt ? nodeState(x, y) : null, K = NODE[s.gatherK || 'tree'];
  if (!st || st === 'empty') { s.gatherAt = null; s.activity = null; enterFree(s, 20); return; }
  s.faceW = tc(x, y);
  if (s.stateTicks > 0) return;
  const n = treeNode(x, y); n.left--; if (n.left <= 0) { n.regrow = nowH() + K.regrow; n.mark = false; } S.nodeVer = (S.nodeVer || 0) + 1;
  const bonus = (K.res === 'wood' ? (s.job === 'Scavenger' || s.job === 'Farmer' ? 1 : 0) : K.res === 'stone' ? (s.job === 'Engineer' ? 1 : 0) : (s.job === 'Scavenger' ? 1 : 0)) + (stat(s, 'str') >= 7 ? 1 : 0);
  if (s.gatherK === 'wreck' && rnd() < .4) {   /* 3D.131 was .22 */ S.fuel = Math.min(rareCap(), (S.fuel || 0) + 1); flow('fuel', 'Siphoned from wrecks', 1); floats.push({ w: { ...s.w }, t: '+1 ⛽', col: '#ffb36b', a: 80, big: true }); bark(s, 'fuel', {}, { pri: 1 }); }   /* V3D.25: a wreck sometimes still has fuel in the tank */
  if (rnd() < .2) bark(s, { tree: 'chop', rock: 'mine', wreck: 'wreck', bin: 'bin' }[s.gatherK || 'tree']);
  s.carriedLoot = K.res; s.carryAmt = (K.res === 'cloth' ? K.amt + (rnd() < .4 ? 1 : 0) : K.amt + bonus + TOOL_AMT[toolLvl(s.gatherK || 'tree', true)]) + carryBonus(s);   /* 3D.28 backpacks */ s.gatherAt = null; s.faceW = null; s.activity = null; gainXp(s, 1);
  const jb = jobFor(K.res); s.gjob = null;
  if (jb) { jb.j.inb[K.res] = (jb.j.inb[K.res] || 0) + s.carryAmt; s.gjob = jb.j.id; s.dest = jobPt(jb); s.why = `Bringing ${RES_ICON[K.res]} to the ${jobName(jb)}`; }
  else { s.dest = depotPt(s); s.why = { wood: 'Carrying logs home', stone: 'Carrying stone home', mat: 'Carrying scrap home', cloth: 'Bringing cloth home' }[K.res]; }
  s.mode = 'walk'; s.purpose = 'gath-back'; s.path = null; s.stateTicks = 2400;
}
/* 3D.115 owner: people were dropping supplies through the fence. A load now only counts once the carrier reaches the door;
   if the way is blocked they try another storage door they can walk to, and otherwise keep hold of it and say why. */
const depots = () => [...bOf('storage'), ...world.buildings.filter((b) => DEFS[b.type].role === 'hq')].filter((b) => !b.burnt);
function reachDepot(s, not) { for (const b of depots().sort((a, c) => dist(s.w, Wd.approachPoint(a)) - dist(s.w, Wd.approachPoint(c)))) { const pt = Wd.approachPoint(b); if (not && dist(pt, not) < .6) continue; const t0 = tileOf(s.w), st = Wd.walkable(world, t0.x, t0.y) ? t0 : (Wd.nearestWalkable(world, t0.x, t0.y) || t0); if (Wd.findPath(world, st, tileOf(pt), false, 0)) return pt; } return null; }   /* 3D.169 round 2: someone standing on a workplace footprint (open-air) had no path at all, so every load 'could not get in' */
function canDeliver(s) { if (s.dest && dist(s.w, s.dest) < 1.4) return true;
  const alt = reachDepot(s, s.dest);
  if (s.haul) { const h = s.haul, x = jobById(h.id); if (x) x.j.inb[h.r] = Math.max(0, (x.j.inb[h.r] || 0) - h.n); s.carriedLoot = h.r; s.carryAmt = h.n; s.haul = null; }   /* the site can't be reached: it goes back to storage instead */
  if (s.gjob != null) { const jb = jobById(s.gjob); if (jb) jb.j.inb[s.carriedLoot] = Math.max(0, (jb.j.inb[s.carriedLoot] || 0) - (s.carryAmt || 0)); s.gjob = null; }
  if (alt) { s.dest = alt; s.path = null; s.stateTicks = 2400; s.mode = 'walk'; s.purpose = 'gath-back'; s.why = 'That door is blocked: taking the load round to another'; return false; }
  s.purpose = null; s.path = null; s.mode = 'free'; s.stateTicks = 600; s.dest = null; s.why = "Can't reach a storage door with this load: is the entrance walled in?";
  if (S.noDropDay !== S.day) { S.noDropDay = S.day; note('important', '📦 A LOAD CAN\'T GET IN', { log: `${s.name} can't reach a storage door with their load. Check that storage and HQ entrances aren't walled off and that the fence has a gate.`, at: s.w }); }
  return false; }
function depotPt(s) {   // the HQ or the nearest storage
  const l = depots().sort((a, b) => dist(s.w, Wd.approachPoint(a)) - dist(s.w, Wd.approachPoint(b)));
  return (l.length && (reachDepot(s) || Wd.approachPoint(l[0]))) || tc(7 + OFF, 9 + OFF);
}
function dropWood(s) {   // (name kept) drop whatever the survivor carries: into a job that wants it, else into the stockpile
  const n = s.carryAmt || 0, r = s.carriedLoot; s.carriedLoot = null; s.carryAmt = 0; if (!n || !RES_ICON[r]) { s.gjob = null; return; }
  let left = n; const jb = s.gjob != null ? jobById(s.gjob) : null; s.gjob = null;
  if (jb) { const j = jb.j; j.inb[r] = Math.max(0, (j.inb[r] || 0) - n); const add = Math.max(0, Math.min(left, (j.need[r] || 0) - (j.got[r] || 0))); j.got[r] = (j.got[r] || 0) + add; left -= add; if (add) jobDelivered(jb, r, add, s); }
  if (left > 0) { const got = Math.max(0, Math.min(left, resCap(r) - (S[r] || 0))); S[r] = (S[r] || 0) + got; flow(r, { wood: 'Chopped trees', stone: 'Mined rocks', mat: 'Salvaged wrecks', cloth: 'Clothes bins' }[r] || 'Gathered', got);
    floats.push({ w: { ...s.w }, t: got ? '+' + got + ' ' + RES_ICON[r] : RES_TITLE[r] + ' full', col: '#e8b878', a: 80, big: true }); if (got) SFX('reward'); else bark(s, 'full', { r: RES_NAME[r] }, { pri: 1 }); }
  ui();
}
function tapTree(x, y) {   // tap a node: mark / unmark it
  const k = nodeKindAt(x, y), st = nodeState(x, y); if (!k || !st) return false; const K = NODE[k], nm = { tree: 'Tree', rock: 'Rock', wreck: 'Wreck', bin: 'Clothes bin' }[k];
  if (st === 'empty') { const n = treeNode(x, y); say(`${k === 'tree' ? 'Stump' : k === 'rock' ? 'Broken rock' : k === 'bin' ? 'Empty bin' : 'Stripped wreck'}: back in about ${Math.max(1, Math.ceil(n.regrow - nowH()))} h.`, true); return true; }
  if (k === 'wreck' && !tapTree.alarmAsked && alarmCands(x, y).length) { tapTree.alarmAsked = true; showEventPopup({ x: true, onX: () => { tapTree.alarmAsked = false; }, title: '🚨 CAR ALARM', text: `The dead are close to this wreck. Its alarm still works: set it off and up to ${ALARM.pull} nearby zombies (not bosses) shamble over to it for a while. Once per wreck per day.`, buttons: [{ label: '🚨 Set it off', fn: () => { tapTree.alarmAsked = false; carAlarm(x, y); } }, { label: 'Mark for salvage', fn: () => { tapTree.alarmAsked = false; tapTree(x, y); } }] }); setTimeout(() => { tapTree.alarmAsked = false; }, 400); return true; }   /* 3D.147; 3D.240 (owner, 19 Nov): a ✕ to close it doing nothing */
  const n = treeNode(x, y); n.mark = !n.mark; S.nodeVer = (S.nodeVer || 0) + 1;
  if (n.mark) barkSomeone('mark', {}, { pri: 1 }, tc(x, y));
  say(n.mark ? `${nm} marked: a free survivor will ${K.verb} it next (${n.left} left, ${K.amt} ${RES_NAME[K.res]} each).` : 'Mark removed.', true); saveGame(); return true;
}
/* ---------------- V3D.26 tools: town-wide axe / pickaxe / wrecking bar tiers, crafted at the Workbench or Workshop ----------------
   Better tools gather faster and bring more per load. Power tools (tier 3) burn a little fuel each use and fall back to
   steel speed when the fuel runs out. */
const TOOLS = {
  axe:  { node: 'tree',  icon: '🪓', tiers: [{ n: 'Rusty Axe' }, { n: 'Steel Axe', cost: { wood: 6, mat: 4 }, need: 1 }, { n: 'Chainsaw', cost: { mat: 12, fuel: 3 }, need: 2 }] },
  pick: { node: 'rock',  icon: '⛏', tiers: [{ n: 'Rusty Pick' }, { n: 'Steel Pickaxe', cost: { wood: 5, mat: 5 }, need: 1 }, { n: 'Jackhammer', cost: { mat: 14, stone: 6, fuel: 3 }, need: 2 }] },
  bar:  { node: 'wreck', icon: '🔧', tiers: [{ n: 'Pry Bar' }, { n: 'Wrecking Bar', cost: { wood: 5, mat: 4 }, need: 1 }, { n: 'Power Cutter', cost: { mat: 12, fuel: 3 }, need: 2 }] },
};
const TOOL_SPEED = [1, 1.5, 2.2], TOOL_AMT = [0, 1, 2];
const toolOf = (node) => Object.keys(TOOLS).find((k) => TOOLS[k].node === node);
function toolLvl(node, use) {   // effective tier for a gather; use = spend the power tool's fuel
  const k = toolOf(node); if (!k) return 0; const t = (S.tools || {})[k] || 0;
  if (t >= 2) { if ((S.fuel || 0) >= .15 + 3 * gens().length) {   /* audit: a day of generator fuel stays in the tank */ if (use) { S.fuel -= .15; flow('fuel', 'Power tools', -.15); } return 2; } return 1; } return t;
}
const benchTier = () => Math.max(0, ...world.buildings.filter((b) => DEFS[b.type].fam === 'research' && !b.burnt).map((b) => DEFS[b.type].tier || 1));
function craftTool(k) {
  const T = TOOLS[k], cur = (S.tools ||= {})[k] || 0, nx = T.tiers[cur + 1]; if (!nx) return false;
  if (benchTier() < nx.need) { say(`${nx.n} needs a ${nx.need >= 2 ? 'Workshop' : 'Workbench'}.`); return false; }
  if (!canPay(nx.cost)) { say(`${nx.n}: still need ${missText(nx.cost)}.`); return false; }
  payCost(nx.cost); S.tools[k] = cur + 1; SFX('reward'); banner(`${T.icon} ${nx.n.toUpperCase()} READY`); barkSomeone('tool', {}, { pri: 1 });
  say(`${nx.n}: everyone ${T.node === 'tree' ? 'chops' : T.node === 'rock' ? 'mines' : 'salvages'} ${Math.round((TOOL_SPEED[cur + 1] - 1) * 100)}% faster and brings ${TOOL_AMT[cur + 1]} more per load${cur + 1 >= 2 ? ' (uses a little fuel)' : ''}.`, true); saveGame(); ui(); return true;
}
function toolsCard() {
  return `<div class="card"><b>🧰 Tools</b><div class="sm">Shared by the whole camp. Better tools gather faster and carry more.</div>` + Object.entries(TOOLS).map(([k, T]) => { const cur = (S.tools || {})[k] || 0, nx = T.tiers[cur + 1];
    return `<div class="row" style="gap:6px;margin-top:6px"><span style="font-size:20px">${T.icon}</span><span class="sp"><b>${T.tiers[cur].n}</b>${nx ? `<br><small>Next: ${nx.n} · ${costShort(nx.cost)}${benchTier() < nx.need ? ' · needs a ' + (nx.need >= 2 ? 'Workshop' : 'Workbench') : ''}</small>` : '<br><small>Best there is</small>'}</span>${nx ? `<button class="act${benchTier() >= nx.need && canPay(nx.cost) ? ' go' : ''}" data-ctool="${k}" ${benchTier() >= nx.need ? '' : 'disabled'}>Craft</button>` : ''}</div>`; }).join('') + '</div>';
}
/* ---------------- V3D.26 power: Generators burn fuel (1 per 8 h each); while running they light the camp at night and
   give buildings within 5 tiles +20% output. The Radio Tower needs power to send the rescue signal. */
const gens = () => world.buildings.filter((b) => b.type === 'generator' && !b.burnt);
const POWER_PER_GEN = 4;
const renewPower = () => world.buildings.reduce((a, b) => a + (b.burnt || b.fire ? 0 : b.type === 'turbine' ? 2 : b.type === 'solar' && S.hour >= 6 && S.hour < 19 ? 3 : 0), 0);   /* 3D.104 Wind Turbine and Solar Array: power without fuel */
const POWER_ORDER = ['pump', 'hospital', 'coldstore', 'greenhouse', 'floodlight', 'radio', 'ammofactory'];   /* audit: water first; a blackout must never starve the town */
const PUMP_HAND = .3;   /* without power the pump is worked by hand at 30% */
const genFuel = (b) => .125 * (b.staff && b.staff.job === 'Mechanic' ? (hasSkill(b.staff, 'fuelSaver') ? .5 : .75) : 1);   /* 3D.77: a Mechanic saves fuel */
let genRun = [];   /* the Generators running this hour (not saved: rebuilt by powerTick) */
function powerGrid() {   /* 3D.77: which powered buildings get power (hourly, on load, and when buildings change) */
  const sup = (S.power ? genRun.filter((g) => world.buildings.includes(g) && !g.burnt).reduce((a, g) => a + POWER_PER_GEN + (g.staff && hasSkill(g.staff, 'gearhead') ? 2 : 0) + (g.staff && hasSpec(g.staff, 'electrician') ? 2 : 0), 0) : 0) + renewPower();
  const users = world.buildings.filter((b) => DEFS[b.type] && DEFS[b.type].power && !b.burnt).sort((a, b) => POWER_ORDER.indexOf(a.type) - POWER_ORDER.indexOf(b.type));
  let left = sup, need = 0; const off = [];
  for (const b of users) { const n = DEFS[b.type].power; need += n; b.pw = left >= n; if (b.pw) left -= n; else off.push(DEFS[b.type].name); }
  S.pSup = sup; S.pNeed = need; S.pUse = sup - left; return off;
}
const powered = (b) => !!(b && b.pw && !b.burnt);
const anyPowered = (t) => world.buildings.some((b) => b.type === t && powered(b));
function powerTick() {   // hourly: run as many Generators as the fuel allows (Mechanic-run ones first: they burn less)
  const all = [...gens()].sort((a, b) => genFuel(a) - genFuel(b)); let fuel = S.fuel || 0; const run = [];
  for (const g of all) { const f = genFuel(g); if (fuel < f) break; fuel -= f; run.push(g); }
  const burn = (S.fuel || 0) - fuel; if (burn > 0) { S.fuel = fuel; flow('fuel', 'Generator', -burn); }
  const was = S.power; S.power = run.length > 0 || renewPower() > 0; genRun = run;
  if (S.power && !was) { say('⚡ The generator is running.', true); barkSomeone('power', {}, { pri: 1 }); }
  if (!S.power && was) { barkSomeone('noPower', {}, { pri: 1 }); note('important', '⚡ The generator ran out of fuel: send a squad to the Gas Station, salvage wrecks, or run a Fuel Still', { key: 'nofuel', icon: '⛽' }); }
  const off = powerGrid();
  if (off.length && S.power) note('important', `⚡ Not enough power: ${[...new Set(off)].join(', ')} ${off.length > 1 ? 'are' : 'is'} off. Build or fuel another Generator.`, { key: 'lowpower', icon: '⚡' });
  if (off.length && !S.power && all.length) note('important', `⚡ No power: ${[...new Set(off)].join(', ')} ${off.length > 1 ? 'are' : 'is'} off until a Generator has fuel.`, { key: 'lowpower', icon: '⚡' });
}
const nearR = (a, b, r) => Math.hypot(a.x + a.w / 2 - (b.x + b.w / 2), a.y + a.h / 2 - (b.y + b.h / 2)) <= r;
const powerBoost = (b) => S.power && genRun.length && b.type !== 'generator' && (gens().some((g) => nearR(g, b, 5)) || bOf('pole').some((p) => nearR(p, b, 5) && (gens().some((g) => nearR(g, p, 6)) || bOf('pole').some((q) => q !== p && nearR(q, p, 6) && gens().some((g) => nearR(g, q, 6)))))) ? 1.2 : 1;   /* 3D.104 Power Poles carry the boost further */
const radioOk = () => world.buildings.some((b) => b.type === 'radio' && !b.burnt && (b.pw === undefined ? S.power : b.pw)) && !!S.power;
