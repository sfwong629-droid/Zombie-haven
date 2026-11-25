/* ---------------- zombies ---------------- */
const Z_ARRIVE = { walker: 1, crawler: 1, runner: 3, dog: 4, bloated: 5, spitter: 6, sporehead: 7, riot: 8, lasher: 8, rotbomb: 9, brute: 10, thrower: 12 };   /* 3D.80 dog, riot, lasher, rotbomb */
function weightedZombie() {
  /* 3D.64 balance study: the strong ones came on day 2-3 (bloated and spitters as soon as the Camp became a Lodge, a boss on night 3)
     and early nights topped out at 15 zombies, so the auto-played town lost 8.5 people in 12 days. Each type now has an arrival day
     (by day, not town rank) and fades in over three days. */
  const hd = hDay(), pool = Object.entries(zombieTypes).filter(([k, v]) => v.weight > 0 && hd >= (Z_ARRIVE[k] || 1)), w = (k, v) => v.weight * Math.min(1, (hd - (Z_ARRIVE[k] || 1) + 1) / 3);
  let tot = pool.reduce((a, [k, v]) => a + w(k, v), 0), r = rnd() * tot; for (const [k, v] of pool) { r -= w(k, v); if (r <= 0) return k; } return 'walker';
}
function spawnPoint() {   /* a walkable tile on the map edge outside the territory; more sides open up as the territory grows */
  const B = Wd.BUILD, sides = [['n', .5], ['w', .15], ['e', .15 + .12 * (S.terr || 0)], ['s', .15 + .12 * (S.terr || 0)]];
  for (let tries = 0; tries < 40; tries++) {
    let tot = sides.reduce((a, q) => a + q[1], 0), r = rnd() * tot, side = 'n'; for (const [k, w] of sides) { r -= w; if (r <= 0) { side = k; break; } }
    const x = side === 'w' ? 0 : side === 'e' ? Math.min(COLS - 1, B.x1 + 2 + Math.floor(rnd() * Math.max(1, COLS - B.x1 - 2))) : Math.floor(rnd() * COLS);
    const y = side === 'n' ? Math.floor(rnd() * Math.max(1, B.y0 - 1)) : side === 's' ? Math.min(ROWS - 1, B.y1 + 2 + Math.floor(rnd() * Math.max(1, ROWS - B.y1 - 2))) : Math.floor(rnd() * ROWS);
    if (!Wd.inWallZone(x, y) && Wd.walkable(world, x, y, true)) return [x, y];
  }
  return [1, 2];
}
/* ---------------- V2.46 replayability: difficulty, starting conditions, legacy goals and an ending ---------------- */
const DIFFS = {
  easy:   { name: 'Sheltered', icon: '🌱', desc: 'Weaker zombies, smaller hordes, fewer raids, cheaper upkeep and more time to rescue the downed.', z: .75, count: .8, raid: 1.5, upkeep: .75, bleed: 1.5, score: .6 },
  normal: { name: 'Survivor', icon: '⚔️', desc: 'The game as designed.', z: 1, count: 1, raid: 1, upkeep: 1, bleed: 1, score: 1 },
  hard:   { name: 'Hardened', icon: '💀', desc: 'Tougher, more numerous zombies, raids more often, upkeep costs more and the downed bleed out sooner. Scores ×1.6.', z: 1.25, count: 1.2, raid: .75, upkeep: 1.25, bleed: .8, score: 1.6 },
};
/* 3D.145 run modifiers ("twists"): picked on the new-town screen, any mix; each one bends one difficulty number and the final score */
const MODS = {
  nights:  { name: 'Long Nights',     icon: '🌙', desc: 'Hordes are 30% bigger.', count: 1.3, score: 1.2 },
  strong:  { name: 'Strong Dead',     icon: '💪', desc: 'Zombies are 25% tougher.', z: 1.25, score: 1.2 },
  bandit:  { name: 'Bandit Country',  icon: '☠️', desc: 'Raiders come twice as often.', raid: .5, score: 1.2 },
  lean:    { name: 'Lean Times',      icon: '🥫', desc: 'Buildings cost 40% more to keep running.', upkeep: 1.4, score: 1.15 },
  blood:   { name: 'Thin Blood',      icon: '🩸', desc: 'The downed bleed out a third sooner.', bleed: .65, score: 1.15 },
  quiet:   { name: 'Quiet Roads',     icon: '🤝', desc: 'Raiders come half as often. Lower score.', raid: 1.8, score: .8 },
  plenty:  { name: 'Good Soil',       icon: '🌱', desc: 'Buildings cost 30% less to keep running. Lower score.', upkeep: .7, score: .85 },
};
const modList = (m = S.mods) => (m || []).filter((k) => MODS[k]);
const modTag = (m = S.mods) => { const l = modList(m); return l.length ? ' · ' + l.map((k) => MODS[k].icon).join('') : ''; };
const modScore = (m) => modList(m).reduce((a, k) => a * MODS[k].score, 1);
let dfC = null, dfK = '';
const DF = () => { const b = DIFFS[S.diff] || DIFFS.normal, l = modList(); if (!l.length) return b; const k = S.diff + '|' + l.join(); if (k !== dfK) { dfC = { ...b }; for (const id of l) for (const f of ['z', 'count', 'raid', 'upkeep', 'bleed', 'score']) if (MODS[id][f]) dfC[f] *= MODS[id][f]; dfK = k; } return dfC; };
const recKey = (st = S.start, df = S.diff, m = S.mods) => st + '/' + df + (modList(m).length ? '+' + modList(m).slice().sort().join('+') : '');
const STARTS = {
  camp:  { name: 'Roadside Camp', icon: '⛺', desc: 'Four survivors and the camp tent. Everything else you build yourself. The usual start.', food: 14, water: 14, mat: 16, wood: 20,   /* 3D.296: was 12 */
    b: [['hq', 8, 11]],   /* 3D.31: just the camp tent */ sv: [['Marcus', 'Guard', 3, 'brave', 7, 12], ['Amy', 'Medic', 2, 'caring', 5, 10], ['Lena', 'Scavenger', 2, 'scrounger', 9, 14], ['Ben', 'Farmer', 1, 'diligent', 6, 11]] },
  farm:  { name: 'Old Farmstead', icon: '🌾', desc: 'Two garden plots and a full pantry, but only three people and few scrap. Strong food, weak defence.', food: 30, water: 22, mat: 10, wood: 16,
    b: [['hq', 8, 11], ['farm', 8, 7], ['farm', 10, 7], ['canteen', 4, 7], ['tent', 11, 11]], sv: [['Ben', 'Farmer', 2, 'diligent'], ['Rosa', 'Farmer', 1, 'eater'], ['Marcus', 'Guard', 2, 'cautious']] },
  scrap: { name: 'Scrapyard Outpost', icon: '⚙️', desc: 'Plenty of scrap and a scrapyard, but almost no food or water: get a Rain Barrel up fast.', food: 6, water: 5, mat: 40, wood: 8,
    b: [['hq', 8, 11], ['scrapyard', 8, 6], ['medic', 2, 7], ['tent', 11, 11], ['tent', 12, 12]], sv: [['Theo', 'Engineer', 2, 'diligent'], ['Lena', 'Scavenger', 2, 'scrounger'], ['Marcus', 'Guard', 2, 'brave'], ['June', 'Civilian', 1, 'caring']] },
  lone:  { name: 'Last Two Standing', icon: '🔥', desc: 'Just a guard, a medic and a tent. Newcomers arrive twice as often in the first week. A hard start.', food: 12, water: 12, mat: 25, arrive: 2,
    b: [['hq', 8, 11], ['medic', 2, 7], ['tent', 11, 11]], sv: [['Marcus', 'Guard', 3, 'brave'], ['Amy', 'Medic', 2, 'caring']] },
};
const ST = () => STARTS[S.start] || STARTS.camp;   /* 3D.41: every new game is the camp start; the others stay only so old saves still load */
function applyStart(key) {   /* builds the opening town for a starting condition */
  const st = STARTS[key] || STARTS.camp; S.start = STARTS[key] ? key : 'camp'; S.food = st.food; S.water = st.water; S.mat = st.mat; S.wood = st.wood ?? 12; S.stone = 0; S.cloth = st.cloth ?? 3; S.meds = st.meds ?? 1; S.fuel = 0; S.ammo = 30; S.tools = { axe: 0, pick: 0, bar: 0 }; S.power = false; S.nodes = {}; S.nodeVer = 0; S.jobSeq = 0; world.buildings = [];
  for (const [type, x0, y0] of st.b) { const x = x0 + OFF, y = y0 + OFF, d = DEFS[type]; if (!d) continue; const chk = Wd.placementCheck(world, x, y, d, null); if (chk.ok) world.buildings.push({ type, x, y, w: d.w, h: d.h, q: d.q, a: d.a }); }
  Wd.bump(world); S.sv = st.sv.map(([n, job, l, tr, x, y], i) => { const q = mk(n, job, l, (x ?? 5 + 2 * (i % 3)) + OFF, (y ?? 10 + (i % 2) * 2) + OFF, i); q.trait = tr; q.max = baseMax(q); q.hp = q.max; return q; });
}
const LEGACY = [
  { id: 'month', icon: '📅', name: 'A Month of Dawns', desc: 'Survive 30 days', prog: () => [S.day - 1, 30] },
  { id: 'town', icon: '👥', name: 'A Real Town', desc: '12 people living in the Haven', prog: () => [S.sv.length + (S.trip ? S.trip.members.length : 0), 12] },
  { id: 'land', icon: '🗺️', name: 'Room to Breathe', desc: 'Expand the territory 3 times', prog: () => [S.terr || 0, 3] },
  { id: 'giants', icon: '☠️', name: 'Giant Slayers', desc: 'Defeat 4 Mutant Bosses', prog: () => [S.bossKills || 0, 4] },
  { id: 'know', icon: '🔬', name: 'Know-How', desc: 'Finish 6 research projects', prog: () => [Object.keys(S.res || {}).filter((k) => S.res[k]).length, 6] },
  { id: 'trips', icon: '🧭', name: 'Far Horizons', desc: 'Send out 12 expeditions', prog: () => [S.expCount || 0, 12] },
  { id: 'family', icon: '👶', name: 'Next Generation', desc: 'A child grows up in the Haven', prog: () => [S.grown || 0, 1] },
  { id: 'masters', icon: '🎖️', name: 'Old Hands', desc: '3 survivors master a profession', prog: () => [S.sv.filter((q) => q.mastered).length, 3] },
];
const LEGACY_NEED = 4, FINALE_NIGHTS = 3;
const legacyDone = () => LEGACY.filter((g) => (S.legacy || {})[g.id]).length;
function legacyCheck() {   /* daily, and when the goals panel opens */
  S.legacy = S.legacy || {}; for (const g of LEGACY) { if (S.legacy[g.id]) continue; const [a, b] = g.prog(); if (a >= b) { S.legacy[g.id] = S.day; S.mat += 10; renownGain(15, 'Legacy goal'); showEventPopup({ title: '🏅 LEGACY: ' + g.name.toUpperCase(), text: `${g.desc}: done on day ${S.day}.<br><br>${legacyDone()} of ${LEGACY.length} legacy goals. ${legacyDone() >= LEGACY_NEED ? 'The radio tower can call for the convoy (Goals).' : `Complete ${LEGACY_NEED} and reach ★5 to call for the convoy.`}`, gains: '+15 Renown · +10 scrap' }); } }
}
const signalReady = () => !S.finale && !S.won && S.rank >= 5 && legacyDone() >= LEGACY_NEED && radioOk() && S.day >= (S.signalAgain || 0);
function startFinale() {   /* the ending: hold out for three nights of escalating hordes until the convoy arrives */
  if (!signalReady()) return false; S.finale = { day: S.day, night: 0, lost0: (S.fallen || []).length, pop0: S.sv.length + (S.trip ? S.trip.members.length : 0) }; S.nextBoss = Math.max(S.nextBoss, S.day + FINALE_NIGHTS + 3); saveGame();
  showEventPopup({ title: '📻 THE SIGNAL IS OUT', text: `A convoy answered: it will reach the Haven at dawn in ${FINALE_NIGHTS} days.<br><br>Every horde for miles heard the signal too. Hold out for <b>${FINALE_NIGHTS} nights</b>: each one brings a bigger horde, and the last a Mutant Boss.<br><br>The convoy only stops for a living town: keep at least <b>${Math.ceil(S.finale.pop0 / 2)}</b> of your ${S.finale.pop0} people alive.`, gains: 'Walls, guard posts, gear and medics: now is the time' }); return true;
}
/* 3D.289 (owner, 21 Nov, W176: the limit of 60 standing holds for every kind of attack; zombies grow with the level, not the days; overnight
   branch, renumber on merge): the last stand's nights no longer appear in one burst. Each night's horde joins a queue and walks in one by one
   while fewer than mobCap() stand; what has not come by 06:00 is dropped. Before, at level 16 a last-stand night stood up to 105 to 186 at once
   (08-BALANCE, section 12), and its size grew with the game day (S.day / 3: 40 extra zombies a night on day 120). */
function finaleTick() { const f = S.finale; if (!f || !f.q || !f.q.length || tick % 20) return; if (activeZ() >= mobCap()) return;
  const type = f.q.shift(); spawn(null, null, type); const z = S.z[S.z.length - 1]; if (!z || z.human) return; z.siege = true; z.mob = true; const b = f.boost || 1; z.hp = z.max = Math.round(z.hp * b); z.pw = (z.pw || 1) * b; S.nightSpawned = (S.nightSpawned || 0) + 1; }
function finaleHour() {
  const f = S.finale; if (!f || S.won) return;
  if (S.hour === 20) note('important', `📻 FINAL STAND · NIGHT ${f.night + 1} OF ${FINALE_NIGHTS}: THE HORDE COMES AT 21:00`);
  if (S.hour === 21) { f.night++; const n = Math.round((12 + 6 * f.night + Math.floor(hDay() / 3)) * DF().count); f.boost = 1 + .15 * f.night; f.q = [...(f.q || []), ...Array(n).fill(null), ...Array(2 * f.night).fill('brute'), ...Array(f.night).fill('spitter')];   /* 3D.289: the night's horde joins a queue (finaleTick) and grows with the level, not the day */ if (f.night >= 2) spawnBoss(null, true); if (f.night >= FINALE_NIGHTS) spawnBoss();
    note('critical', `Final stand: night ${f.night} of ${FINALE_NIGHTS}`, { key: 'finale', icon: '📻', threats: true, live: () => !!S.finale && !S.won && isNight(), dyn: () => `Final stand · night ${S.finale ? S.finale.night : FINALE_NIGHTS} of ${FINALE_NIGHTS} · ${S.z.filter((z) => z.hp > 0 && !z.human).length} zombies` }); }
  const alive = S.sv.length + (S.trip ? S.trip.members.length : 0), need = Math.ceil((f.pop0 || 2) / 2);
  if (f.night && alive < need) { S.finale = null; S.signalAgain = S.day + 5; S.z.forEach((z) => { if (z.mob) z.siege = false; }); saveGame(); showEventPopup({ title: '📻 THE CONVOY TURNED BACK', text: `Too few people were left (${alive} of the ${need} needed) and the convoy would not risk the stop.<br><br>Rebuild: the radio can call again from day ${S.signalAgain}.`, gains: 'The legacy goals you finished still count' }); return; }
  if (S.hour === 6) f.q = [];   /* 3D.289: the night is over */
  if (S.hour === 6 && f.night >= FINALE_NIGHTS) winGame();
}
function scoreOf() {
  const lost = (S.fallen || []).length, alive = S.sv.length + (S.trip ? S.trip.members.length : 0);
  return Math.max(100, Math.round((500 + 120 * alive + 150 * (S.rank || 1) + 120 * (S.terr || 0) + 10 * Math.min(60, world.buildings.length) + 120 * legacyDone() + 10 * Math.min(S.day, 35) - 80 * lost - 40 * (S.left || 0) - 8 * Math.max(0, S.day - 35)) * DF().score));   /* 3D.72: the score is about growing the town: people, rank, territory and buildings; losing people costs */
}
const REC_KEY = 'zhRecords';
function records() { try { return JSON.parse(localStorage.getItem(REC_KEY) || '{}'); } catch (e) { return {}; } }
function winGame() {
  if (S.won || !S.sv.length) return; const sc = scoreOf(), lost = (S.fallen || []).length; S.won = { day: S.day, score: sc, alive: S.sv.length, lost }; S.finale = null; S.z.forEach((z) => { if (z.type === 'boss' || z.mob) { z.hp = 0; z.escaped = true; } });
  const k = recKey(), R = records(), prev = R[k], best = !testTown() && (!prev || sc > prev.score); if (best) {   /* 3D.379 a test town sets no record */ R[k] = { score: sc, day: S.day, name: S.townName || 'Zombie Haven', t: Date.now() }; try { localStorage.setItem(REC_KEY, JSON.stringify(R)); } catch (e) { /* ignore */ } }
  renownGain(50, 'The convoy arrived'); SFX('reward'); saveGame();
  showEventPopup({ title: '🚚 THE CONVOY ARRIVES', text: `${esc(S.townName || 'The Haven')} held out. The convoy rolls in at dawn on day ${S.day}.<br><br>${ST().icon} ${ST().name} · ${DF().icon} ${DF().name}${modTag()}<br>${S.sv.length} survivors · ${lost} lost · ${legacyDone()}/${LEGACY.length} legacy goals<br><br><b style="font-size:26px">Score ${sc}</b>${testTown() ? '<br>Test town: no record kept.' : best ? '<br>🏆 New best for this set-up!' : `<br>Best so far: ${prev.score}`}`, gains: 'You can keep playing this town, or start a new one with another start or difficulty.' });
}
/* V2.29 difficulty: zombies grow tougher every day and with the survivors' levels, so the Haven never gets comfortable */
let dangerT = -1, dangerV = 1;
/* 3D.253 (owner, 21 Nov, W176; rule 3 of docs/project/13-LONG-GAME.md): zombies grow with the town's LEVEL, never with the count of game days.
   Before, the night's size, the kinds that come, the raiders' numbers and the boss all followed the game day (slower after day 10, up to a ceiling
   set by the rank, which kept creeping up after day 60 for ever), so a town played for more minutes met stronger zombies at the same level.
   LVL_THREAT[level] is the "day strength" a town of that level meets: about the game day a once-a-day player reaches that level on today. */
const LVL_THREAT = [0, 1, 3, 5, 7, 9, 12, 14, 16, 18, 20, 23, 26, 29, 32, 35, 36, 37, 38, 39, 40];
const hDay = () => LVL_THREAT[Math.max(1, Math.min(LVL_THREAT.length - 1, S.lvl || 1))];
function danger() {   /* adaptive: tracks how strong the Haven's people are right now (levels and weapons), plus a slow daily creep; a town that just lost its fighters gets weaker waves, a strong one never gets comfortable */
  if (tick - dangerT < 300 && dangerT >= 0) return dangerV; dangerT = tick;
  let st = 0; for (const q of S.sv) if (q.hp > 0 && q.mode !== 'away') st += isFighter(q) ? 8 * (q.l || 1) + weaponOf(q).atk : 1.2 * (q.l || 1);
  return (dangerV = Math.max(.8, Math.min(2.4, .7 + .004 * st + .02 * hDay())));
}
function spawn(x = null, y = null, type = null) {
  const a = spawnPoint(), kind = type || weightedZombie(), d = zombieTypes[kind], dm = danger(), hp = Math.round(d.hp * dm * DF().z);
  S.z.push({ type: kind, pw: (1 + (dm - 1) * .6) * DF().z, w: tc(x ?? a[0], y ?? a[1]), hp, max: hp, cool: 35 + rnd() * 40, phase: rnd() * 100, dest: null, mode: 'appear', stateTicks: 45 + rnd() * 30, target: null, path: null, siege: rnd() < Math.min(.85, .08 + .12 * (S.rank - 1) + (world.walls.size ? .15 : 0) + (isNight() ? .25 : 0) + .05 * (S.terr || 0)), blocked: 0, goal: null, goalT: 0, wallT: null });
}
const nowD = () => S.day + S.hour / 24;
const graceOn = () => (S.graceUntil || 0) > nowD();   /* V2.24 mourning: the horde pulls back after heavy losses */
const avgLevel = () => (S.sv.length ? S.sv.reduce((a, q) => a + (q.l || 1), 0) / S.sv.length : 1);
const isNight = () => S.hour >= 20 || S.hour < 6;   /* V2.12: dangerous nights, quieter days */
/* 3D.297 (A12 tuning, owner 22 Nov: "Daylight + clear streets"): zombies never walk away now, so in daylight (06:00 to 20:00) they are
   slow and weak: half speed (06-movement-survivors.js followPath) and half the hit on people, walls and buildings, so the town's fighters
   can clear the streets and people can mend. Raiders (people) are not affected. */
const DAY_SLOW = .5, DAY_WEAK = .5;
const zPw = (z) => (z.pw || 1) * (!z.human && !isNight() ? DAY_WEAK : 1);
/* 3D.68 boss-night balance. The boss probe showed the boss rarely downs anyone itself: what broke towns was that every zombie killed on a
   boss night was replaced within a second, so the fighters wore down until everyone was hiding or down and nobody could reach the downed
   for hours. Now nothing new joins while the boss lives, killing the boss breaks the horde (its followers flee and the rest of the night is
   quiet), and at dawn the followers leave with the boss. */
function mobScatter() { for (const z of S.z) if (z.hp > 0 && !z.human && z.mob && z.type !== 'boss') z.mob = false; }   /* 3D.296 bug A12 (owner, 19 Nov: zombies never walk away): the boss's mob no longer flees; it stops being the boss's mob and fights on until killed */
function bossWatch() {
  if (S.bossOn == null || S.z.some((z) => z.type === 'boss' && z.hp > 0 && z.mode !== 'zleave')) return;
  const killed = (S.bossKills || 0) > S.bossOn; S.bossOn = null;
  if (killed) { mobScatter(); S.calmUntil = S.day + (S.hour >= 6 ? 1 : 0) + 6 / 24; note('important', '☠ THE HORDE BREAKS', { log: 'With its leader dead, no more come out of the dark tonight. The ones already here still have to be put down.' }); }
}
const NIGHT_WAVES = [1, .25, .25];   /* 3D.70: share of the night's horde in each wave (1.5x the night cap in all) */
const nightWave = () => (S.hour >= 23 || (S.hour >= 2 && S.hour < 6) ? (S.hour >= 23 ? 1 : 2) : S.hour >= 20 ? 0 : 1);   /* dusk 20:00, 23:00, 02:00 */
function monsterGeneration() {
  bossWatch(); crisisTick(); finaleTick();
  const night = isNight(); if (night !== S.wasNight) { S.wasNight = night; S.nightSpawned = 0; S.waveN = 0; S.nightCap = 0; }
  if (S.vanguard) {   /* 3D.269 (owner, 21 Nov, W201): the horde comes first and its boss last */
    const v = S.vanguard;
    if (v.left > 0 && tick % mobGap() === 0 && activeZ() < mobCap()) { mobZombie(S.mobAt || spawnPoint()); v.left--; S.nightSpawned = (S.nightSpawned || 0) + 1; }
    if (v.mob - v.left >= Math.ceil(v.mob * BOSS_LAST.share) || nowD() >= v.until) { S.vanguard = null; spawnBoss(null, false, v); } }
  if ((S.mobLeft || 0) > 0) {   /* 3D.199: the rest of the big horde streams in behind the boss */
    if (!night || S.bossOn == null || !S.z.some((z) => z.boss && z.hp > 0)) S.mobLeft = 0;
    else if (tick % mobGap() === 0 && activeZ() < mobCap()) { mobZombie(S.mobAt || spawnPoint()); S.mobLeft--;   /* 3D.274: the limit counts everyone standing, not only the horde */ S.nightSpawned = (S.nightSpawned || 0) + 1; } }
  if (night && (S.bossOn != null || nowD() < (S.calmUntil || 0))) return;   /* 3D.68: no fresh zombies while the boss lives, nor after it falls */
  const SP = window.ZH_SPAWN || {};   /* study knobs (tools/balance/respawn_study.py); the game itself never sets these */
  if (night && !SP.old && S.nightCap) {   /* 3D.70: a fixed horde per night, in three waves: the full horde at dusk, then two smaller pushes. Kill them all and the night goes quiet. Days are unchanged. */
    const w = nightWave(), allow = Math.round(S.nightCap * NIGHT_WAVES.slice(0, w + 1).reduce((a, b) => a + b, 0));
    if (w !== S.waveN) { S.waveN = w; if (w > 0 && S.nightSpawned >= Math.round(S.nightCap * NIGHT_WAVES[0])) { note('important', `🧟 WAVE ${w + 1} OF ${NIGHT_WAVES.length}`, { log: 'More of them are coming out of the dark.' }); SFX('alarm'); } }
    if ((S.nightSpawned || 0) >= allow) { S.spawnClock++; return; } }
  if (night && SP.budget && (S.nightSpawned || 0) >= SP.budget * Math.max(1, S.nightCap || 1)) return;   /* study: a fixed pool per night */
  if (night && SP.wave && S.hour % SP.wave !== 0 && activeZ() > 0) { S.spawnClock++; return; }   /* study: refill only at the top of every Nth hour */
  S.spawnClock++; const tr = S.terr || 0, hd = hDay(), base = 6 + tr + Math.floor(hd / 2.2);   /* horde ceiling: the threat grows with the days, up to a ceiling set by the town's rank */   /* 3D.71 skill study: the horde grows with the days, not with town upgrades (upgrading used to make staying small the safest play) */
  const desired = Math.round((night ? Math.min(Math.round(base * 1.35), 14 + 2 * tr, 6 + hd) : Math.max(3, Math.min(Math.round(base * .65 * ((window.ZH_BAL || {}).day || 1)), 9 + 2 * tr, 2 + hd))) * (graceOn() ? .75 : 1) * DF().count), gap = (110 - Math.min(50, threatNow() * 6)) * (night ? .5 * (SP.gap || 1) : 1.6); if (night) S.nightCap = desired;
  if (!leftBoss() && activeZ() < desired - (S.bossOn != null || S.vanguard || (S.day === S.nextBoss && S.hour >= 18) || (S.crisis && S.crisis.k === 'tide' && S.day === S.crisis.night && S.hour >= 18) || (S.finale && S.finale.night && (S.hour >= 20 || S.hour < 6)) ? mobCap() : 0) && S.spawnClock > gap) { if (!night && roamOn()) S.spawnTot = (S.spawnTot || 0) + roamGroup(desired - activeZ()) - 1; else spawn(); S.spawnClock = 0; S.spawnTot = (S.spawnTot || 0) + 1; if (night) S.nightSpawned = (S.nightSpawned || 0) + 1; }   /* 3D.199: the night's usual crowd makes room for the boss's horde, as 3D.68 had it: with the horde capped, the cap is the whole crowd */
  /* 3D.296 bug A12 (owner, 19 Nov: zombies stay until killed): by day the surplus no longer quietly disappears (V2.18 removed one now and then when nobody was within 4 tiles) */
}
/* ---------------- 3D.310 the daytime threat, part 1: roaming groups (vision, 16 Nov: "by day, small groups roam outside the walls and
   threaten anyone working or travelling there"). From day 2 and the first goal on, the daytime zombies come as groups of 2 to 4 that wander
   from wood to wreck outside the walls for a few game hours, then move on. They chase people only outside the town, give up at its edge,
   never bash a building or a wall, and any still out at dusk join the night as ordinary zombies. The first time a group comes near
   someone outside, the player is warned. (Part 2, the warned daytime horde, is its own build.) */
const ROAM = { day: 2, min: 2, max: 4, hours: [3, 5], near: [4, 9], band: 7, warn: 9 };
const roamOn = () => S.day >= ROAM.day && (S.stage || 0) >= 2 && !S.won;
const inTownW = (w) => Wd.inWallZone(Math.floor(w.x), Math.floor(w.y));
const roamGap = (x, y) => { const Z = Wd.WALLZONE; return Math.max(Z.x0 - x, x - Z.x1, Z.y0 - y, y - Z.y1, 0); };
let roamTownKey = '', roamTown = null;
function roamAvoid() { const Z = Wd.WALLZONE, k = [Z.x0, Z.y0, Z.x1, Z.y1].join(); if (k !== roamTownKey) { roamTownKey = k; roamTown = new Set(); for (let x = Z.x0; x <= Z.x1; x++) for (let y = Z.y0; y <= Z.y1; y++) roamTown.add(x + ',' + y); } return roamTown; }
function roamSpot(from) {   /* a walkable spot outside the walls, near a tree, rock or wreck when one is close, ROAM.near tiles from where the group is */
  const ok = (x, y) => Wd.inMap(x, y) && !Wd.inWallZone(x, y) && roamGap(x, y) <= ROAM.band && Wd.walkable(world, x, y, true) && !Wd.buildingAt(world, x, y);
  const f = from ? tileOf(from) : null, inR = (x, y) => !f || (Math.hypot(x - f.x, y - f.y) >= ROAM.near[0] && Math.hypot(x - f.x, y - f.y) <= ROAM.near[1]);
  const nodes = nodeList().filter((n) => !Wd.inWallZone(n.x, n.y) && roamGap(n.x, n.y) <= ROAM.band && inR(n.x, n.y));
  for (let k = 0; k < 40; k++) { let x, y;
    if (nodes.length && rnd() < .6) { const n = nodes[Math.floor(rnd() * nodes.length)]; x = n.x + Math.round((rnd() - .5) * 2); y = n.y + Math.round((rnd() - .5) * 2); }
    else if (f) { const a = rnd() * 6.283, r = ROAM.near[0] + rnd() * (ROAM.near[1] - ROAM.near[0]); x = Math.round(f.x + Math.cos(a) * r); y = Math.round(f.y + Math.sin(a) * r); }
    else { const Z = Wd.WALLZONE; x = Z.x0 - ROAM.band + Math.floor(rnd() * (Z.x1 - Z.x0 + 1 + 2 * ROAM.band)); y = Z.y0 - ROAM.band + Math.floor(rnd() * (Z.y1 - Z.y0 + 1 + 2 * ROAM.band)); }
    if (ok(x, y)) return tc(x, y); }
  return null;
}
function roamGroup(room) {   /* one group at one point on the map's edge; returns how many came (none until there is room for a group) */
  if (room < ROAM.min) return 0;
  const n = Math.max(1, Math.min(room, ROAM.min + Math.floor(rnd() * (ROAM.max - ROAM.min + 1)))), a = spawnPoint(), pk = (S.roamN = (S.roamN || 0) + 1);
  const until = nowD() + (ROAM.hours[0] + rnd() * (ROAM.hours[1] - ROAM.hours[0])) / 24, to = roamSpot(tc(a[0], a[1])) || roamSpot(null);
  for (let i = 0; i < n; i++) { spawn(Math.max(0, Math.min(COLS - 1, a[0] + (rnd() - .5) * 2)), Math.max(0, Math.min(ROWS - 1, a[1] + (rnd() - .5) * 2))); const z = S.z[S.z.length - 1]; z.siege = false; z.roam = { pk, until, to: to && { x: to.x + (rnd() - .5) * 1.2, y: to.y + (rnd() - .5) * 1.2 } }; }
  return n;
}
const roamPack = (pk) => S.z.filter((q) => q.hp > 0 && q.roam && q.roam.pk === pk);
function roamNext(pk, from) { const to = roamSpot(from); for (const q of roamPack(pk)) { q.roam.to = to && { x: to.x + (rnd() - .5) * 1.2, y: to.y + (rnd() - .5) * 1.2 }; q.roam.idle = 0; q.path = null; } }
function roamWarn(z) {   /* once a group: the player is told where it is */
  const P = roamPack(z.roam.pk); if (P.some((q) => q.roam.warned)) return; for (const q of P) q.roam.warned = true;
  const c = townCentre(), dx = z.w.x - c.x, dy = z.w.y - c.y, side = Math.abs(dx) > Math.abs(dy) ? (dx > 0 ? 'east' : 'west') : (dy > 0 ? 'south' : 'north');
  note('important', `🧟 ${P.length} roamers outside the walls, to the ${side}`, { log: `${P.length} zombies are roaming outside the walls to the ${side}. Anyone working out there can get chased; fighters can see them off. They don't try the walls by day.` });
}
function roamStep(z, d) {   /* true = handled this tick */
  const R = z.roam;
  if (nowD() >= R.until && !['zattack', 'zrecover'].includes(z.mode)) { const p = spawnPoint(); z.roam = null; z.mode = 'zleave'; z.retreat = false; z.target = null; z.path = null; z.leaveTo = p ? tc(p[0], p[1]) : { ...z.w }; return true; }
  if (z.mode === 'zchase') {   /* chase only outside the town: someone who reaches it, or gets indoors, is let go */
    const t = z.target; if (!t || t.hp <= 0 || !t.w || insideBuilding(t) || ['down', 'hospital', 'away'].includes(t.mode) || inTownW(t.w) || inTownW(z.w)) { z.target = null; z.mode = 'idle'; z.path = null; z.stateTicks = 40; return true; }
    return false; }
  if (z.mode === 'zattack' || z.mode === 'zrecover' || z.mode === 'zleave' || z.mode === 'appear') return false;
  if (z.mode !== 'idle') { z.mode = 'idle'; z.path = null; z.bldT = null; z.wallT = null; }   /* never marches, bashes or breaks walls by day */
  let best = null, bd = d.aggro, seen = false;
  for (const s of S.sv) { if (s.hp <= 0 || !s.w || ['down', 'hospital', 'away'].includes(s.mode) || insideBuilding(s) || boxHid(s) || inTownW(s.w)) continue; const dd = dist(s.w, z.w); if (dd < ROAM.warn) seen = true; if (dd < bd) { bd = dd; best = s; } }
  if (seen && !R.warned) roamWarn(z);
  if (best && !inTownW(z.w)) { z.target = best; z.mode = 'zchase'; z.path = null; alertPack(z, best); SFX('groan'); return true; }
  if (inTownW(z.w) && (!R.to || inTownW(R.to))) R.to = roamSpot(null);   /* somehow inside (a chase ended there): walk back out */
  if (!R.to) { roamNext(R.pk, z.w); if (!R.to) { z.moving = false; return true; } }
  if (dist(z.w, R.to) > 1) {
    const gt = tileOf(R.to), gk = gt.x + ',' + gt.y;
    if (z.pathGoal !== gk || z.pathVer !== world.ver || !z.path) { const p = Wd.findPath(world, tileOf(z.w), gt, true, 0, roamAvoid()); if (!p) { roamNext(R.pk, z.w); return true; } z.path = p.map((q) => tc(q.x, q.y)); z.pathGoal = gk; z.pathVer = world.ver; z.stuck = 0; z.lastD = 1e9; z.nearT = 0; z.arrG = null; }
    if (followPath(z, R.to, d.chase * .35) === 'fail') roamNext(R.pk, z.w);
  } else { z.moving = false; R.idle = (R.idle || 0) + 1; if (R.idle > 500 + ((z.phase | 0) % 7) * 60) roamNext(R.pk, z.w); }   /* lingers a while, then the group moves on together */
  return true;
}
/* ---------------- V2.13 raiders: humans who dodge zombies, slip in through the gate, steal, fight, and run ---------------- */
const RAID_TARGETS = ['storage', 'canteen', 'farm', 'field', 'water', 'well', 'armory', 'workshop', 'house'];
function spawnRaid(fk = 'toll', leader = false) {
  setTimeout(() => barkSomeone('raiders', {}, { pri: 2 }), 600); if (!facOk('toll') && fk === 'toll' && !leader) fk = 'drifters';
  const n = Math.min(7, 3 + (S.terr || 0) + Math.floor(hDay() / 5) + (leader ? 2 : 0)) + (leader ? 3 : 0),   /* 3D.144 owner: a leader is not bigger than his people; he always has a knot of them round him */ a = rnd() < .6 ? hwyEnd() : spawnPoint();   /* 3D.101: raiders mostly ride in on the highway */   /* 3D.71: raids grow with the days, not town upgrades */
  for (let i = 0; i < n; i++) { const d = zombieTypes.raider; S.z.push({ type: 'raider', human: true, fk, w: tc(a[0] + (i % 2) * .4, a[1] + (i >> 1) * .4), home: tc(a[0], a[1]), pw: 1 + (danger() - 1) * .5, hp: Math.round(d.hp * danger()), max: Math.round(d.hp * danger()), cool: 30, phase: rnd() * 100, mode: 'appear', stateTicks: 30 + i * 20, target: null, path: null, loot: { food: 0, water: 0, mat: 0 }, carried: 0, goalB: null, evadeT: 0 }); rollRaider(S.z[S.z.length - 1], i); S.z[S.z.length - 1].fac = fk; }
  { const R = FAC_RAID[fk]; if (R) for (const z of S.z.slice(-n)) { z.hp = z.max = Math.round(z.max * R.hp); z.pw = (z.pw || 1) * (R.pw || 1); z.plate = true; } }   /* 3D.137/138 each faction's people fight differently */
  if (leader) { const L = S.z[S.z.length - 1]; L.kind = 'brute'; L.leader = true; L.name = (FAC_RAID[fk] || {}).lead || 'The Toll Collector'; L.hp = L.max = Math.round(L.max * 3.2); L.pw = (L.pw || 1) * 1.4; for (const q of S.z.slice(-4, -1)) { q.esc = true; q.kind = 'brute'; q.w = { x: L.w.x + (rnd() - .5) * .8, y: L.w.y + (rnd() - .5) * .8 }; q.stateTicks = L.stateTicks; } }   /* 3D.104 */
  for (const z of S.z.slice(-n)) { z.wpn = raiderWeapon(z.kind); z.pw = (z.pw || 1) * raiderHit(z.wpn); }   /* 3D.187 (W33, W55): set last, once the leader and his escort have their kind */
  SFX('alarm'); raidAlert(n); S.alert = 1200;
}
/* V3D.13 raider personalities (Walking Dead style): most raiders are Thieves; some are Brutes who come to hurt people
   and never run, and Firebugs who smash a building and set it alight. See docs/AI_BEHAVIOUR.md. */
const RAIDER_KINDS = {
  thief:   { name: 'Thief',   icon: '🦝', hp: 1,    atk: 1,   flee: .5, steal: true },
  brute:   { name: 'Brute',   icon: '💀', hp: 1.6,  atk: 1.5, flee: 0,  hunt: true },
  firebug: { name: 'Firebug', icon: '🔥', hp: .9,   atk: .9,  flee: .35, burn: true },
};
/* 3D.187 (owner, 16-17 Nov, W33 and W55): in the town each kind of raider carries its own weapon, one step better per era (I to IV).
   It used to be a random one of five, picked when the raider first came on screen. Looks only in this build: how much harder a better
   weapon hits is a balance number (Balance chat). Raids and strongholds away from the town keep their own weapons. */
const RAIDER_WPN = { thief: ['knife', 'cleaver', 'machete', 'katana'], brute: ['nailbat', 'axe', 'spiked', 'sledge'], firebug: ['pipe', 'hatchet', 'crowbar', 'spear'] };   /* 3D.196 (owner, W72): Brute and Firebug reordered so each step is at least as strong as the one before, by the weapons' own attack */
const raiderWeapon = (kind, lvl = S.lvl || 1) => (RAIDER_WPN[kind] || RAIDER_WPN.thief)[Math.max(0, ERAS.indexOf(eraOf(lvl)))];
/* 3D.197 (owner, 17-18 Nov, W57: "follow the weapon type"): a town raider hits as hard as the weapon in its hand. A hit is RAIDER_HIT.base +
   RAIDER_HIT.per x the weapon's own attack (ITEMS[id].atk, the number a survivor gets from it), in place of the flat 7 x the kind's factor.
   Era I: Thief 5.3, Brute 11, Firebug 6.5 (were 7, 10.5, 6.3). Era IV: 14.6, 15.8, 13.1. The danger level, a faction's factor and a leader's factor still multiply it. */
const RAIDER_HIT = { base: 5, per: .2 };   /* 3D.204 (owner, 18 Nov, W57): softened from .3; two of six bot towns lost 9 and 12 people to one raid at .3. Era I: Thief 5.2, Brute 9, Firebug 6. Era IV: 11.4, 12.2, 10.4 */ const raiderHit = (id) => (RAIDER_HIT.base + RAIDER_HIT.per * ((ITEMS[id] || {}).atk || 0)) / zombieTypes.raider.atk;
function rollRaider(z, i) {
  const r = rnd(), k = i === 0 && (S.lvl || 1) >= 3 && r < .45 ? 'brute' : r < ((S.lvl || 1) >= 2 ? .22 : 0) ? 'firebug' : r < ((S.lvl || 1) >= 3 ? .34 : 0) ? 'brute' : 'thief'   /* 3D.291: kinds by level (were game day 3, 4 and 6) */, K = RAIDER_KINDS[k];
  z.kind = k; z.hp = z.max = Math.round(z.max * K.hp);   /* 3D.197: the hit no longer comes from the kind (K.atk) but from the weapon: see raiderHit */
}
const RK = (z) => RAIDER_KINDS[z.kind] || RAIDER_KINDS.thief;
function raidTarget(z) { let best = null, bd = 1e9; for (const b of world.buildings) { if (!RAID_TARGETS.includes(b.type)) continue; const d = dist(z.w, Wd.doorPoint(b)); if (d < bd) { bd = d; best = b; } } return best; }
function rai(z) {
  const d = zombieTypes.raider; if (z.mode === 'idle' || z.mode === 'zmarch') { z.mode = z.carried > 0 ? 'rflee' : 'rsneak'; z.path = null; }
  if (z.hp < z.max * RK(z).flee && z.mode !== 'rflee') { z.mode = 'rflee'; z.path = null; z.target = null; }
  if (z.esc && z.mode !== 'rflee') { const L = S.z.find((q) => q.leader && q.hp > 0 && q.fac === z.fac && q !== z); if (!L) z.esc = false; else if (dist(z.w, L.w) > 2.4 && !S.sv.some((q) => q.hp > 0 && q.mode !== 'down' && dist(q.w, z.w) < 1.4)) { const r = followPath(z, L.w, d.chase * 1.2); z.moving = r === 'moving'; z.mode = 'rsneak'; return; } }   /* 3D.144 a bodyguard never strays from the leader */
  if (RK(z).hunt && z.mode !== 'rflee') {   /* Brute: goes straight for the nearest person and fights to the end */
    let t = null, td = 1e9; for (const s of S.sv) if (s.hp > 0 && !['down', 'hospital', 'away', 'errand'].includes(s.mode) && !insideBuilding(s)) { const dd = dist(s.w, z.w); if (dd < td) { td = dd; t = s; } }
    if (t && td > 4.4) { const r = followPath(z, t.w, d.chase); z.moving = r === 'moving'; z.mode = 'rsneak'; if (r !== 'fail') return; }   /* 3D.144 fix: a chase gives up past 4.8 tiles, so a far-off Brute stood still; now he walks in first */
    else if (t) { z.target = t; z.mode = 'zchase'; z.path = null; return; }
  }
  // dodge zombies: step away from any zombie that gets close
  if (z.evadeT > 0) { z.evadeT--; moveSlide(z, z.evadeTo, d.chase * 1.1); return; }
  const zz = S.z.find((o) => !o.human && o.hp > 0 && o.mode !== 'appear' && dist(o.w, z.w) < 2.2)
    || (z.mode === 'rsneak' && RK(z).steal && S.sv.find((q) => q.hp > 0 && isFighter(q) && !insideBuilding(q) && !['down', 'hospital'].includes(q.mode) && dist(q.w, z.w) < 2.4));   /* sneaking: steer clear of zombies and fighters */
  if (zz) { const dx = z.w.x - zz.w.x, dy = z.w.y - zz.w.y, l = Math.hypot(dx, dy) || 1; z.evadeTo = { x: z.w.x + dx / l * 1.8, y: z.w.y + dy / l * 1.8 }; z.evadeT = 40; z.path = null; return; }
  // fight survivors who come close (or defend the haul)
  let foe = null, fd = z.mode === 'rsneak' && RK(z).steal ? 1.1 : 2.2; for (const s of S.sv) if (s.hp > 0 && !['down', 'hospital'].includes(s.mode) && !insideBuilding(s)) { const dd = dist(s.w, z.w); if (dd < fd) { fd = dd; foe = s; } }
  if (foe && z.mode !== 'rflee') { z.target = foe; z.mode = 'zchase'; z.path = null; return; }
  if (z.mode === 'rsneak') {
    z.sneakT = (z.sneakT || 0) + 1; if (z.sneakT > 4000) { z.mode = 'rflee'; z.path = null; return; }   /* gives up after ~4 game hours */
    if (!z.goalB || !world.buildings.includes(z.goalB)) z.goalB = raidTarget(z); if (!z.goalB) { z.mode = 'rflee'; return; }
    const r = followPath(z, Wd.doorPoint(z.goalB), d.chase); if (r === 'arrived') { z.mode = RK(z).burn ? 'rsmash' : 'rsteal'; z.stateTicks = RK(z).burn ? 260 : 0; z.path = null; if (RK(z).burn) { floats.push({ w: { ...z.w }, t: '🔥 ARSON!', col: '#ff9a5a', a: 80 }); note('critical', `A Firebug is smashing the ${DEFS[z.goalB.type].name}!`, { key: 'arson' + z.goalB.x + ',' + z.goalB.y, icon: '🔥', at: { ...z.w }, live: () => z.hp > 0 && z.mode === 'rsmash', threats: true }); } } else if (r === 'fail') { z.goalB = null; z.mode = 'rflee'; } return;
  }
  if (z.mode === 'rsmash') {   /* Firebug: bangs on the building for a few seconds (stop them!), then sets it on fire and runs */
    z.moving = false; const b = z.goalB; if (!b || !world.buildings.includes(b)) { z.mode = 'rflee'; return; }
    if (z.stateTicks % 40 === 0) { b.hit = 10; hitBuilding3(b, 4 + (z.pw || 1) * 2, 'a raider'); if (b.burnt) { z.mode = 'rflee'; z.path = null; return; } }
    if (z.stateTicks <= 0) { startFire(b, 40, 'A raider set it alight'); z.mode = 'rflee'; z.path = null; } return;
  }
  if (z.mode === 'rsteal') {
    z.moving = false; if (z.stateTicks > 0) return; z.stateTicks = 70;
    const k = ['food', 'water', 'mat'].filter((q) => S[q] >= 1).sort(() => rnd() - .5)[0];
    if (k && z.carried < 4) { S[k] -= 1; z.loot[k]++; z.carried++; floats.push({ w: { ...z.w }, t: '−1 ' + SHORT_ICON[k] + ' stolen', col: '#ff8a7a', a: 70 }); }
    if (!k || z.carried >= 4) { z.mode = 'rflee'; z.path = null; } return;
  }
  if (z.mode === 'rflee') {
    const r = followPath(z, z.home, d.chase * 1.1);
    if (r === 'arrived' || r === 'fail' || dist(z.w, z.home) < .6) { if (z.carried) note('important', `A raider escaped with ${['food', 'water', 'mat'].filter((q) => z.loot[q]).map((q) => z.loot[q] + ' ' + (q === 'mat' ? 'parts' : q)).join(', ')}.`); z.hp = 0; z.escaped = true; }
  }
}
function raiderDown(z) {   /* a beaten raider drops what they carried */
  if (!z.human || z.escaped) return; if (z.leader && !z.leaderDone) { z.leaderDone = true; const fk0 = FACTIONS[z.fac] ? z.fac : 'toll', F = fac(fk0); F.goneUntil = S.day + 60; { const fk = Object.keys(S.fac || {}).find((q) => S.fac[q] === F) || 'toll', t0 = facTier(fk); F.beaten = (F.beaten || 0) + 1; facTierUp(fk, t0); }   /* 3D.147 gear tier */ F.war = false; for (const q of S.z) if (q.human && q.hp > 0 && q.fac === fk0) { q.mode = 'rflee'; } setTimeout(() => earnBanner('faction', `${z.name || 'Their leader'} fell at your gate. ${FACTIONS[fk0].name} scatter${fk0 === 'toll' ? '' : 's'}.`), 500); } S.raiderKills = (S.raiderKills || 0) + 1; for (const k of ['food', 'water', 'mat']) if (z.loot && z.loot[k]) { S[k] += z.loot[k]; floats.push({ w: { ...z.w }, t: '+' + z.loot[k] + ' ' + SHORT_ICON[k], col: '#9fe58a', a: 80 }); }
}
/* ---------------- V2.13 boss: every 3rd night a boss leads a mob against the town ---------------- */
/* 3D.199 (owner, 17-18 Nov, W54): the big horde. A boss night used to bring no more zombies than any other night (the boss's mob was 4 to 13,
   and the night's usual crowd made room for it). Now the mob is BIG_HORDE.mult times that, so a boss night is about three times an ordinary
   night (target: about 60 zombies in era 1, 120 in era 2, 240 in era 3; 08-BALANCE.md). It is a big WEAK crowd (owner, 18 Nov: same number,
   much weaker): mob zombies have BIG_HORDE.hp of the usual health and hit with BIG_HORDE.hit of the usual force. BIG_HORDE.first of them
   arrive with the boss; the rest follow one every BIG_HORDE.gap ticks while the boss lives, but only while fewer than BIG_HORDE.cap[era]
   mob zombies are standing, so the crowd is replaced as it falls instead of piling up. They stop coming when the boss falls or the sun rises.
   (The first cut, 60% health, full hit, no cap, killed 6 to 12 people in one night in the bot's towns: tools/balance/shelved/.) */
const BIG_HORDE = { mult: 4, hp: .33, hit: .5, first: .4, gap: 150, cap: [30, 45, 60, 60] };
const mobCap = () => BIG_HORDE.cap[Math.min(3, Math.floor(((S.lvl || 1) - 1) / 5))];
/* 3D.261 (rule 3 of 13-LONG-GAME; targets in 08-BALANCE, section 3): the big horde's size follows the town's level, toward about 60 / 120 / 240
   zombies on a boss night by era (the night's own crowd adds a few). Before, it came from the survivors' levels, the territory and the day
   strength, and the usual boss night was half the size wanted in eras 1 and 2 and a third in era 3. The first group is never more than may
   stand at once, and the rest come faster when there are many, so that a big horde has arrived within about 4.5 game hours. */
const MOB_LVL = [0, 16, 24, 32, 40, 48, 64, 76, 88, 100, 112, 150, 170, 190, 210, 230, 240, 240, 240, 240, 240];
const bossMob = () => MOB_LVL[Math.max(1, Math.min(MOB_LVL.length - 1, S.lvl || 1))];
const mobGap = () => Math.max(20, Math.min(BIG_HORDE.gap, Math.floor(4500 / Math.max(1, S.mobLeft0 || 1))));
function mobZombie(a) { spawn(Math.max(0, Math.min(COLS - 1, a[0] + (rnd() - .5) * 3)), Math.max(0, Math.min(ROWS - 1, a[1] + (rnd() - .5) * 3))); const z = S.z[S.z.length - 1]; z.siege = true; z.mob = true; z.horde = true; z.hp = z.max = Math.max(1, Math.round(z.max * BIG_HORDE.hp)); z.pw = (z.pw || 1) * BIG_HORDE.hit; return z; }
/* 3D.269 (owner, 21 Nov, W201 "a"): on the level's boss night the horde arrives first and the boss walks in behind it, when BOSS_LAST.share of
   the horde has come or BOSS_LAST.hours game hours have passed, whichever is first. Before, the boss led: the fighters killed him while most
   of his horde still waited outside, the horde then broke, and a boss night brought half the zombies wanted or fewer (08-BALANCE, section 12).
   A boss that is not the level's boss night (a crisis, a faction's boss, the last stand) still arrives with its group, as before. */
const BOSS_LAST = { share: 2 / 3, hours: 2 };
function hordeStart() {
  const a = spawnPoint(), mob = bossMob(), first = Math.max(1, Math.min(mobCap(), Math.round(mob * BIG_HORDE.first))); S.mobAt = [a[0], a[1]]; for (let i = 0; i < first; i++) mobZombie(a);
  S.vanguard = { mob, left: mob - first, until: nowD() + BOSS_LAST.hours / 24 }; S.mobLeft0 = mob - first; S.mobLeft = 0; lureFire(); SFX('boss'); banner('☠ THE HORDE IS HERE');
  note('critical', `A horde of ${mob} zombies is at the walls. Something big walks behind it.`, { key: 'boss', icon: '☠', log: `A horde of ${mob} zombies reaches the Haven. Its leader walks behind it.`, threats: true, live: () => !!S.vanguard }); S.alert = 2400;
}
/* 3D.291 (overnight branch; owner, 21 Nov, W176: zombies grow with the level, never with the count of game days): the last danger numbers
   that followed the game day now follow the level. The boss's gentler start (a 40% weaker boss with a 25% softer hit) was for game days
   1 to 14, now levels 1 to 5 (era 1); the first boss is always the Mutant up to level 2 (was day 4); raider kinds come by level (the Firebug
   from level 2, the Brute from level 3; were days 3, 4 and 6); the spawn speed's "threat" (set to day / 4 at each rank-up, so it kept the day
   count of that moment) is now a quarter of the level's day strength (hDay). Story timing (when factions are met, raids from day 4) is unchanged. */
const ERA1_EARLY = (upTo) => (S.lvl || 1) <= upTo;
const threatNow = () => Math.floor(hDay() / 4);
function spawnBoss(force, escort, lead) {   /* lead (3D.269): the horde is already here (hordeStart); the boss walks in where it came in and brings no first group */   /* 3D.261: escort = a boss that is not the level's boss night (a crisis, a faction's boss, the last stand): it brings a third of the level's horde, about what it brought before */
  const a = lead && S.mobAt ? S.mobAt : spawnPoint(), d = zombieTypes.boss, tr = S.terr || 0, ks = Object.keys(BOSS_KINDS).filter((k) => k !== S.lastBoss), bk = force || (ERA1_EARLY(2) ? 'mutant' : ks[Math.floor(rnd() * ks.length)]), K = BOSS_KINDS[bk]; if (!force) S.lastBoss = bk;
  const L = avgLevel(), early = ERA1_EARLY(5) ? .6 : 1, bhp = Math.round((300 + 50 * L + 80 * tr) * (1 + .04 * hDay()) * DF().z * early);   /* V3D.13: gentler in the first two weeks */   /* V2.24: scales with the survivors' levels, not the Haven rank */
  S.z.push({ type: 'boss', bk, boss: true, pw: (1.25 + .03 * hDay()) * (ERA1_EARLY(5) ? .75 : 1), w: tc(a[0], a[1]), hp: bhp, max: bhp, cool: 40, phase: 0, dest: null, mode: 'appear', stateTicks: 60, target: null, path: null, siege: true, blocked: 0, goal: null, goalT: 0, wallT: null });
  { const bz = S.z[S.z.length - 1]; bz.hp = bz.max = Math.round(bz.hp * K.hp); }
  const mob = lead ? lead.mob : escort ? Math.round(bossMob() / 3) : bossMob(), first = lead ? 0 : Math.max(0, Math.min(mobCap() - activeZ(), Math.round(mob * BIG_HORDE.first)));   /* 3D.274: the first group only fills the room left under the limit; the rest stream in */ for (let i = 0; i < first; i++) mobZombie(a); if (lead) S.mobLeft = lead.left; else S.mobLeft = S.mobLeft0 = mob - first; S.mobAt = [a[0], a[1]];   /* 3D.199: the rest follow in monsterGeneration */
  lureFire();   /* 3D.76 */
  S.bossOn = S.bossKills || 0;   /* 3D.68: the boss night is on (no fresh zombies join while it lives) */
  SFX('boss'); showEventPopup({ stage: { scene: 'boss', boss: bk, head: 'Boss!' }, short: K.line, chips: [lead ? `☠ the leader of the horde of ${mob}` : `☠ ${mob} zombies follow`], title: K.name.toUpperCase() });
  note('critical', lead ? `${K.line} The horde's leader is here: kill it and the horde breaks.` : `${K.line} ${mob} zombies follow it.`, { key: 'boss', icon: '☠', log: lead ? `${K.line} It walks in behind its horde of ${mob}.` : `${K.line} It leads ${mob} zombies against the Haven.`, threats: true, at: () => { const b = S.z.find((z) => z.type === 'boss' && z.hp > 0); return b ? b.w : null; }, live: () => S.z.some((z) => z.type === 'boss' && z.hp > 0), acts: [{ label: () => (S.focusT > tick ? 'Focusing ⚔' : 'Focus the boss ⚔'), ok: () => !(S.focusT > tick), fn: () => focusBoss() }] }); S.alert = 2400;
}
function dawnRetreat() {   /* balance study (Nov 8): the night horde used to stay inside the walls for good. At sunrise it shambles back out of town;
  the ones already locked onto someone finish that fight, then leave (z.dawn). Days are for repairs and recovery. */
  const frac = (window.ZH_BAL || {}).dawn ?? 0;   /* 3D.296 bug A12 (owner, 19 Nov): zombies never walk away, so nobody leaves at dawn; balance studies can still set ZH_BAL.dawn */   /* 3D.219 bug B1: all of the night horde leaves at dawn (3D.80 sent half; the rest stayed in town all day, rounds 2-4). Studies can still set ZH_BAL.dawn */ if (!frac) return 0; let n = 0;
  for (const z of S.z) { if (z.hp <= 0 || z.human || z.boss || z.zoo) continue; if (['zattack', 'zrecover'].includes(z.mode)) { if (frac >= 1) z.dawn = true; continue; } if (rnd() > frac) continue;
    const p = spawnPoint(); if (!p) continue; z.mode = 'zleave'; z.retreat = true; z.siege = false; z.mob = false; z.target = null; z.path = null; z.wallT = null; z.bldT = null; z.leaveTo = tc(p[0], p[1]); n++; }
  if (n >= 3) note('important', `🌅 Dawn: ${n} zombies shamble back out of town.`); return n;
}
/* 3D.245 (owner, 21 Nov, W172): 2 of 10 bot towns lost everyone to raiders by day and a boss night the same evening (docs/project/12-LONG-RUN.md).
   The roaming raiders now keep off a boss day (the whole day: before the boss, while it lives, and the hours after) and the day before it.
   Raids the player provoked (a refused toll, a faction at war) are not held back. */
/* 3D.247 (owner, 21 Nov, W173): a boss night every 3 game days in eras 1 and 2, every 5 from level 11 (a long town saw about 80 boss
   nights and lost 24 to 39 people from level 11 on: docs/project/12-LONG-RUN.md). */
const bossGap = () => ((S.lvl || 1) >= 11 ? 5 : 3);
/* 3D.298 (A12 tuning, owner 22 Nov: "Daylight + clear streets"): zombies never walk away now, so a boss night does not start on top of a town
   still full of zombies. At noon of a boss day, if more than half the limit stands (15, 22 or 30 by era), the boss night waits a day, at most
   twice in a row, then it comes anyway. The ordinary night crowd already counts the zombies still standing (the spawner fills only up to the
   night's number). */
const leftBoss = () => S.bossOn == null && S.z.some((z) => z.type === 'boss' && !z.human && z.hp > 0);   /* A12 tuning 3 */
const BOSS_WAIT_MAX = 2, streetsFull = () => activeZ() > mobCap() / 2 || townHurt();
/* 3D.300 (A12 tuning): the boss night also waits while the town is badly hurt: the people standing average under 60% health (the level 14
   bot town went into a boss night at 37% after a day of leftovers and lost 11 people). Same wait, at most twice in a row. */
const HURT_LINE = .6, townHurt = () => { const up = S.sv.filter((q) => q.hp > 0 && q.mode !== 'away'); return up.length > 0 && up.reduce((a, q) => a + q.hp / q.max, 0) / up.length < HURT_LINE; };
const bossNear = () => S.day === S.nextBoss || S.day === S.nextBoss - 1 || S.bossDay === S.day || S.bossOn != null || !!S.vanguard;
/* 3D.292 (overnight branch; owner, 21 Nov, W176, rule 3 of 13-LONG-GAME: "a breather after a bad night"): when a night costs a life, or
   everyone went down and the neighbours had to come, the next two nights are a breather: the night's crowd is a quarter smaller, the boss
   night and raiders wait (the same quiet as the mourning of V2.24, graceOn), and the weekly crisis waits too. The night is watched from
   20:00 to 06:00. */
function breatherWatch() {
  if (S.hour === 20) S.nightWatch = { f: (S.fallen || []).length, auto: (S.help || {}).auto || 0 };
  else if (S.hour === 6 && S.nightWatch) { const w = S.nightWatch; S.nightWatch = null; const died = (S.fallen || []).length - w.f, overrun = ((S.help || {}).auto || 0) !== w.auto;
    if (died > 0 || overrun) { S.graceUntil = Math.max(S.graceUntil || 0, S.day + 2 + 6 / 24); S.breathers = (S.breathers || 0) + 1;
      note('important', '🌄 A BREATHER', { log: `After last night (${died ? died + (died > 1 ? ' people lost' : ' person lost') : 'everyone went down'}), the dead hang back: the next two nights are quieter, with no boss night and no raiders. Rebuild while you can.` }); } }
}
/* 3D.298 (overnight, W183 first-30-minute fix 4): the first sitting (levels 1 and 2) has no roaming raiders. Raids also still wait for game day 4. */
const FIRST_RAID_LVL = 3, raidsOpen = () => (S.lvl || 1) >= FIRST_RAID_LVL;
function eventSchedule() {   /* called every game hour */
  const now = S.day + S.hour / 24; breatherWatch(); finaleHour(); crisisHour(); comebackConvoy();
  if (!fac('toll').met && facOk('toll') && S.hour === 10 && !guest && !S.finale && (S.day >= 7 || (S.day >= 5 && rnd() < .5))) { S.lastStory = 'toll1'; STORY.toll1.run(); }   /* 3D.173 owner: the Toll Kings find the town by day 5-7 (round 3: first met on day 12-18, nothing to raid) */
  if (S.day >= 4 && now >= S.nextRaid) {   /* 3D.64 balance: raiders from day 4 (was 2) */
  if (!raidsOpen()) S.nextRaid = now + 1 + rnd() * .5;   /* 3D.298 (overnight, W183 fix 4): no raiders before level 3, the first sitting; the first comes within 1.5 days of it */
  else if (graceOn()) S.nextRaid = now + 1; else if (bossNear()) S.nextRaid = Math.floor(now) + 1 + rnd() * .4;   /* 3D.245 (owner, 21 Nov, W172): never a raid on a boss day or the day before; the raiders wait for the first free day */
  else { spawnRaid(); S.nextRaid = now + (2 + rnd() * 1.5) * DF().raid; } }
  if (S.day === S.nextBoss && S.hour === 17 && graceOn()) { S.nextBoss++;  }
     /* V3D.17: no warning in 3D; the boss card shows when it appears */
  if (S.day === S.nextBoss && S.hour === 12 && !graceOn() && streetsFull() && (S.bossWaits || 0) < BOSS_WAIT_MAX) { S.nextBoss++; S.bossWaits = (S.bossWaits || 0) + 1; note('important', '🧟 THE BIG NIGHT WAITS', { log: townHurt() && activeZ() <= mobCap() / 2 ? 'The town is badly hurt. The boss\'s horde holds back a day: patch people up while you can.' : `${activeZ()} zombies from before still walk the streets. The boss's horde holds back a day: clear the streets while the sun weakens them.` }); }   /* 3D.298 A12 tuning */
  else if (S.day === S.nextBoss && S.hour === 12) S.bossWaits = 0;
  /* 3D.380 (W249): in the phone look the noon warning of a boss night is an emergency alert, said once (W270 rule 3): no radio message and no Field Note card with it */
  if ((S.day === S.nextBoss) && S.hour === 12 && !graceOn() && phoneOn()) { S.intro = S.intro || {}; if (!S.intro['f:boss']) S.intro['f:boss'] = S.day;
    showEventPopup({ title: 'Boss night', alert: { title: 'Boss night · 21:00', line: 'A boss leads tonight\'s horde to the Haven.', sub: 'Re-arm the traps, set a Noise Lure, heal the hurt.' }, buttons: [{ label: 'Show me', fn: () => showTown('defense') }, { label: 'OK' }] }); } else
  if ((S.day === S.nextBoss) && S.hour === 12 && !graceOn()) radio('dj', rLine('boss'), { key: 'boss', level: 'important', more: 'Scouts saw a huge mutant gathering a horde. It will hit the Haven at 21:00.<br><br>Re-arm traps, set a Noise Lure, heal up.' });   /* 3D.76: time to prepare */
  if (S.day === S.nextBoss && S.hour === 21) { hordeStart(); S.bossDay = S.day; S.nextBoss += bossGap(); }   /* 3D.269: the horde first, its boss behind it */
  incidentRoll();
  if (!S.trader && S.day >= (S.nextTrader || 2) && S.hour === 9) traderArrive();
  if (S.trader && S.hour === 19) traderLeave();
  if (S.hour === 6) dawnRetreat();
  if (S.hour === 6) { const n = activeZ(); if (n >= 8) note('important', `☀ DAWN SWEEP: ${n} ZOMBIES LEFT IN TOWN`, { log: `${n} zombies are still about from the night. In daylight they are slow and weak: the fighters go out after them.` }); }   /* 3D.299 A12 tuning */
  /* A12 tuning 3 (owner, 23 Nov: "Keep tuning"; then "Boss should not lose HP"): while a boss from last night still stands, no new ordinary
     night crowd comes: his leftovers are the night. (A first version also wore him down in daylight; taken out on the owner's word.) */
  if (S.hour === 6) { S.bossOn = null; let n = 0; for (const z of S.z) if (z.hp > 0 && !z.human && (z.type === 'boss' || z.mob || z.horde)) { const p = spawnPoint(); if (!p) continue; z.mode = 'zleave'; z.retreat = true; z.siege = false; z.mob = false; z.target = null; z.path = null; z.wallT = null; z.bldT = null; z.leaveTo = tc(p[0], p[1]); n++; }
    if (n) note('important', '🌅 THE BOSS FALLS BACK', { log: 'At first light what is left of the boss\'s horde turns back into the dark, and the boss with it if he still stands. Every other zombie stays until it is killed.' }); }   /* A12 (owner, 23 Nov: "Boss leaves at dawn"; "Boss should not lose HP"): a boss still alive at 06:00 walks off with his own horde, at full health, and what is left of a boss's horde walks off even when he fell (z.horde); every other zombie stays until killed */
}
function alertPack(z, target) {   /* V2.12: zombies near one that spots a survivor join the chase */
  for (const o of S.z) if (o !== z && o.hp > 0 && o.mode === 'idle' && dist(o.w, z.w) < 2.5 && dist(o.w, target.w) < 6) { o.target = target; o.mode = 'zchase'; o.path = null; o.blocked = 0; }
}
function zSpecial(z) {   /* 3D.32 new-zombie extras */
  if (z.scream > 0) z.scream--;
  if (z.smashCd > 0) z.smashCd--;   /* 3D.87 */
  if (z.type === 'lasher') { if (z.lashCd > 0) z.lashCd--;   /* 3D.80 the drag: the hooked survivor slides toward the Lasher for about half a second */
    const q = z.pulling; if (q) { if (z.hp <= 0 || q.hp <= 0 || !q.w || insideBuilding(q) || ['down', 'hospital', 'away'].includes(q.mode) || --z.pullT <= 0) z.pulling = null;
      else { const dx = z.w.x - q.w.x, dy = z.w.y - q.w.y, l = Math.hypot(dx, dy), st = Math.min(Math.max(0, l - ZREACH * .9), .12); if (st > 0) { q.w.x += dx / l * st; q.w.y += dy / l * st; } } }
    /* 3D.107 owner (8 Nov): the Lasher hooks enemy faction fighters too: pulled in, stuck 4 s, a hard hit */
    if (!z.pulling && !(z.lashCd > 0) && z.hp > 0 && tick % 20 === 0) { let r = null, bd = LASH_R + .6; for (const q of S.z) if (q.human && q.hp > 0 && !q.escaped && !(q.para > 0) && q.mode !== 'appear') { const d = dist(q.w, z.w); if (d > ZREACH && d < bd) { bd = d; r = q; } }
      if (r) { z.pulling = r; z.pullT = 30; z.lashCd = 300; r.para = 240; r.hp -= 14; r.hitT = 9; hitFx.push({ k: 'lash', w: { ...r.w }, zr: z, qr: r, to: { ...r.w }, t0: tick }); floats.push({ w: { ...r.w }, t: '-14', col: '#ff6e62', a: 55 }); if (r.hp <= 0) { S.kills++; raiderDown(r); } else if (rnd() < .5) say('🪝 A Lasher hooked one of the ' + (r.fk === 'toll' ? 'Toll Kings' : 'raiders') + '!'); } } }
  if (z.type === 'alpha' && tick % 30 === 0) for (const q of S.z) if (q !== z && !q.human && q.hp > 0) q.alphaNear = dist(q.w, z.w) < 6;
}
const LASH_PARA = 480;   /* 3D.83 a hooked survivor is paralysed for 8 s */
const isRangedS = (q) => { const w = weaponOf(q); return !!(w && w.ranged); };
function lashPick(z) {   /* the nearest survivor holding a gun, bow or crossbow, in reach, out in the open and not already paralysed */
  let best = null, bd = LASH_R;
  for (const q of S.sv) { if (q.hp <= 0 || !q.w || q.para > 0 || insideBuilding(q) || ['down', 'hospital', 'away'].includes(q.mode) || !isRangedS(q)) continue;
    const d = dist(q.w, z.w); if (d > ZREACH + .4 && d < bd) { bd = d; best = q; } }
  return best; }
function rotBurst(z) {   /* 3D.80 Rotbomb: bursts when it dies. Hurts survivors out in the open, walls, and other zombies within ROT_R */
  z.burst = true; z.fuseT = 0; SFX('alarm'); hitFx.push({ k: 'burst', w: { ...z.w }, t0: tick, bits: Array.from({ length: 14 }, () => ({ a: rnd() * 6.28, v: .4 + rnd() * .8, s: rnd() })) });   /* 3D.85 owner: the Rotbomb explodes (the Lasher still draws no effect) */
  let hurt = 0;
  for (const q of S.sv) if (q.hp > 0 && q.w && !insideBuilding(q) && q.mode !== 'away' && dist(q.w, z.w) < ROT_R) { const dmg = Math.max(1, fairRound(16 * zPw(z) * (1 - dist(q.w, z.w) / ROT_R * .4) * (gearFx(q, 'gas') ? .5 : 1) * (1 - dmgReduce(q)))); q.hp -= dmg; q.hitT = 9; hurt++; floats.push({ w: { ...q.w }, t: '-' + dmg, col: '#b8d65a', a: 55 }); if (rnd() < .5) emote(q, '🤢', 70); }
  for (const wl of allWalls()) if (!wl.broken && dist(wc(wl), z.w) < ROT_R) { wl.hp -= 30; wl.hit = 14; if (wl.hp <= 0) wallBroken(wl); }
  for (const o of S.z) if (o !== z && o.hp > 0 && !o.human && dist(o.w, z.w) < ROT_R) { o.hp -= 25; o.hitT = 9; }
  if (hurt) note('important', `💥 A Rotbomb burst and hurt ${hurt} ${hurt === 1 ? 'survivor' : 'survivors'}.`);
}
function zai(z) { if (z.burnT > 0) { z.burnT--; if (z.burnT % 60 === 0) { z.hp -= 3; z.hitT = 6; if (z.hp <= 0) { S.kills++; return; } } }   /* 3D.104 molotov fire */ if (z.slowT > tick && tick % 3 === 0) return; if (z.stunT > tick) { z.moving = false; return; }   /* a dog has it by the leg */ if (z.fuseT > 0) { z.moving = false; return; }   /* 3D.85 a dying Rotbomb stands and swells */ if (!z.zoo) zSpecial(z); const px = z.w.x, py = z.w.y; if (z.zoo || !lureStep(z)) zai0(z); if (!z.human && z.hp > 0) zPushOut(z); if (z.human && z.hp > 0 && z.mode !== 'appear') for (const o of S.z) if (o !== z && o.human && o.hp > 0) { const dx = z.w.x - o.w.x, dy = z.w.y - o.w.y, l = Math.hypot(dx, dy); if (l < .55) { const ux = l > .01 ? dx / l : Math.cos(z.phase), uy = l > .01 ? dy / l : Math.sin(z.phase); moveSlide(z, { x: z.w.x + ux, y: z.w.y + uy }, .012); break; } }   /* 3D.144 raiders walking together keep a shoulder apart */ if (z.hp > 0 && !z.zoo && (z.stun > 0 || trapMap().size)) trapStep(z, px, py); }
function zai0(z) {
  if (z.zoo) { z.moving = false; z.mode = 'zoo'; return; }   /* 3D.32 test page: stand still on display */
  if (z.human && z.para > 0) { z.para--; z.moving = false; return; }   /* 3D.107 hooked by a Lasher */
  if (z.human && z.hp < z.max * RK(z).flee && ['zchase', 'zattack', 'zrecover'].includes(z.mode)) { z.mode = 'rflee'; z.target = null; z.path = null; }
  if (z.human && z.mode === 'idle' && RK(z).hunt) { z.mode = 'rsneak'; }   /* brutes skip the idle wander */
  if (z.esc && z.mode === 'zchase') { const L = S.z.find((q) => q.leader && q.hp > 0 && q.fac === z.fac && q !== z); if (L && dist(z.w, L.w) > 4) { z.mode = 'rsneak'; z.target = null; z.path = null; } }   /* 3D.144 a bodyguard breaks off a chase that pulls him away from the leader */
  if (z.human && !['zchase', 'zattack', 'zrecover', 'appear'].includes(z.mode)) return rai(z);
  const d = zDef(z); if (z.cool > 0) z.cool--; if (z.stateTicks > 0) z.stateTicks--;
  if (z.mode === 'appear') { z.moving = false; if (z.stateTicks <= 0) { z.mode = 'idle'; z.stateTicks = 35 + rnd() * 70; } return; }
  if (z.dawn && !isNight() && !['zattack', 'zrecover', 'zleave'].includes(z.mode)) { const p = spawnPoint(); if (p) { z.dawn = false; z.mode = 'zleave'; z.retreat = true; z.siege = false; z.mob = false; z.target = null; z.path = null; z.wallT = null; z.bldT = null; z.leaveTo = tc(p[0], p[1]); } }   /* 3D.219 bug B1: caught mid-fight at dawn, it finishes that blow and then leaves */
  if (z.mode === 'zleave') {   /* V2.37: bored zombies wander back out of the map in daylight */
    if (!z.retreat) for (const s of S.sv) if (s.hp > 0 && !['down', 'hospital'].includes(s.mode) && !insideBuilding(s) && dist(s.w, z.w) < d.aggro * .7) { z.target = s; z.mode = 'zchase'; z.path = null; z.bored = 0; return; }
    const r = followPath(z, z.leaveTo, d.chase * (z.retreat ? 1 : .6)); if (r !== 'moving' || dist(z.w, z.leaveTo) < .8) { z.hp = 0; z.escaped = true; } return;
  }
  if (z.roam) { if (isNight() || z.boss) z.roam = null; else if (roamStep(z, d)) return; }   /* 3D.310 the daytime threat: a roaming group outside the walls */
  if ((z.mode === 'zmarch' || z.mode === 'idle') && z.type !== 'boss' && tick % 30 === 0) {   // nothing to chase for a long while in daylight → leave
    const seen = S.sv.some((s) => s.hp > 0 && !['down', 'hospital'].includes(s.mode) && !insideBuilding(s) && dist(s.w, z.w) < d.aggro * 1.6);
    z.bored = seen ? 0 : (z.bored || 0) + 30;
    /* 3D.296 bug A12 (owner, 19 Nov: zombies never walk away): a zombie that sees nobody for a long while in daylight no longer walks off the map (V2.37); it keeps wandering towards the town */
  }
  if (z.mode === 'idle' && z.siege) { z.mode = 'zmarch'; z.goalT = 0; }
  if (z.mode === 'zmarch') {            // mobs head for the nearest survivor or building; elites aim for the weakest wall segment or the gate
    { const lu = (S.posts || []).length ? postLure(z) : null; if (lu) { z.target = lu; z.mode = 'zchase'; z.path = null; z.blocked = 0; alertPack(z, lu); return; } }   /* V2.45 */
    let best = null, bd = 1e9; for (const s of S.sv) if (s.hp > 0 && !['down', 'hospital'].includes(s.mode) && !insideBuilding(s) && !boxHid(s)) { const dd = dist(s.w, z.w); if (dd < bd) { bd = dd; best = s; } }
    if (best && bd < d.aggro) { z.target = best; z.mode = 'zchase'; z.path = null; z.blocked = 0; alertPack(z, best); SFX('groan'); return; }
    if (tick % 20 === (z.phase | 0) % 20) { const b = bashTarget(z, d, true); if (b && startBash(z, b)) return; }   /* V3D.17 */
    if (--z.goalT <= 0) { z.goal = siegeGoal(z); z.goalT = 90; }
    zMarchStep(z, z.goal, d.chase * .8); return;
  }
  if (z.mode === 'zbash') {   /* V3D.17: pounding on a building */
    const b = z.bldT; if (!b || !world.buildings.includes(b) || b.burnt || !occupied(b)) { z.bldT = null; z.mode = z.siege ? 'zmarch' : 'idle'; z.stateTicks = 30; return; }
    let best = null, bd = d.aggro * .8; for (const s of S.sv) if (s.hp > 0 && !['down', 'hospital', 'away', 'errand'].includes(s.mode) && !insideBuilding(s) && !boxHid(s)) { const dd = dist(s.w, z.w); if (dd < bd) { bd = dd; best = s; } }
    if (best) { z.target = best; z.mode = 'zchase'; z.bldT = null; z.path = null; alertPack(z, best); return; }
    if (dist(z.w, z.bpt) > .35) { const r = followPath(z, z.bpt, d.chase); if (r === 'fail') { z.bldT = null; z.mode = 'idle'; z.stateTicks = 60; } return; }
    z.moving = false; z.faceB = { x: b.x + b.w / 2, y: b.y + b.h / 2 };
    if (S.sv.every((q) => insideBuilding(q) !== b || q.mode === 'hiding' || q.mode === 'hospital' || q.sleeping)) { if (!z.bashQuiet) z.bashQuiet = tick; if (tick - z.bashQuiet > 1500 + (z.phase | 0) % 600) { z.bashQuiet = 0; z.bldT = null; z.bored = tick + 6000; z.mode = z.siege ? 'zmarch' : 'idle'; z.stateTicks = 60; return; } } else z.bashQuiet = 0;   /* 3D.48: hiders, patients and sleepers keep quiet; after ~25-35 s it gives up */
    if (z.stateTicks <= 0) { hitBuilding3(b, d.atk * .8 * zPw(z) * (z.type === 'brute' ? 2.2 : z.type === 'boss' ? 3.5 : z.type === 'bloated' ? 1.4 : 1), 'a ' + d.name.toLowerCase()); if (['brute', 'alpha', 'boss'].includes(z.type)) impactFx(z, { x: z.w.x + (b.x + b.w / 2 - z.w.x) * .4, y: z.w.y + (b.y + b.h / 2 - z.w.y) * .4 }); if (z.type === 'burnt' && rnd() < .35) startFire(b, 30, 'a burnt zombie'); z.stateTicks = z.type === 'brute' ? 64 : z.type === 'runner' ? 36 : 50; z.punchT = tick; }
    return;
  }
  if (z.mode === 'zbreak') {
    const wl = z.wallT; z.moving = false;
    if (!wl || wl.broken || !wallLive(wl)) { z.wallT = null; z.mode = z.siege ? 'zmarch' : 'idle'; z.blocked = 0; z.stateTicks = 20; return; }
    if (z.stateTicks <= 0) { const dmg = d.atk * zPw(z) * (z.type === 'brute' ? 2.5 : z.type === 'boss' ? 4 : 1); if (wl.type === 'efence' && S.power) { z.hp -= 6; z.hitT = 9; floats.push({ w: { ...z.w }, t: '⚡6', col: '#9fd8ff', a: 40 }); }   /* 3D.104 Electric Fence */ const dmg2 = townHyb('fortifier') ? dmg * .8 : dmg; wl.hp -= dmg2 - dmg; wl.hp -= dmg; wl.hit = 14; floats.push({ w: wc(wl), t: '-' + Math.round(dmg), col: '#ffb27a', a: 45 }); z.stateTicks = z.type === 'brute' ? 60 : z.type === 'runner' ? 34 : 46;
      if (wl.hp <= 0) wallBroken(wl); }
    let best = null, bd = 1.1; for (const s of S.sv) if (s.hp > 0 && !['down', 'hospital'].includes(s.mode) && !insideBuilding(s) && !boxHid(s)) { const dd = dist(s.w, z.w); if (dd < bd) { bd = dd; best = s; } }
    if (best) { z.target = best; z.mode = 'zchase'; z.wallT = null; z.path = null; } return;
  }
  if (z.mode === 'idle') {
    if (!z.dest || z.stateTicks <= 0) {   /* V2.33: wandering, but slowly drifting toward the town */
      const c = townCentre(), dx = c.x - z.w.x, dy = c.y - z.w.y, l = Math.hypot(dx, dy) || 1, pull = Wd.inTown(Math.floor(z.w.x), Math.floor(z.w.y)) ? 0 : ZDRIFT;
      z.dest = { x: z.w.x + (rnd() - .5) * 3 + dx / l * pull, y: z.w.y + (rnd() - .5) * 3 + dy / l * pull }; z.stateTicks = 60 + rnd() * 100; }
    if (z.dest) { if (moveSlide(z, z.dest, d.chase * .35)) z.stateTicks = Math.min(z.stateTicks, 20); }
    { const lu = (S.posts || []).length ? postLure(z) : null; if (lu) { z.target = lu; z.mode = 'zchase'; z.path = null; alertPack(z, lu); return; } }   /* V2.45 */
    let best = null, bd = 1e9; for (const s of S.sv) if (s.hp > 0 && !['down', 'hospital'].includes(s.mode) && !insideBuilding(s) && !boxHid(s)) { const dd = dist(s.w, z.w); if (dd < bd) { bd = dd; best = s; } }
    if (best && bd < d.aggro) { z.target = best; z.mode = 'zchase'; z.path = null; alertPack(z, best); return; }
    if (tick % 30 === (z.phase | 0) % 30 && (!best || bd > d.aggro * 1.6)) { const b = bashTarget(z, d, isNight() && Wd.inTown(Math.floor(z.w.x), Math.floor(z.w.y))); if (b) startBash(z, b); }   /* V3D.17: nobody about → go for the building with people in it */
    return;
  }
  if (z.mode === 'zchase') {
    if (!z.target || z.target.hp <= 0 || ['down', 'hospital'].includes(z.target.mode) || insideBuilding(z.target)) { z.target = null; z.mode = z.siege ? 'zmarch' : 'idle'; z.stateTicks = 40; return; }
    const dd = dist(z.target.w, z.w); if (dd > (z.type === 'boss' ? 11 : 4.8)) { z.target = null; z.mode = z.type === 'boss' && z.siege ? 'zmarch' : 'idle'; z.stateTicks = 60; return; }   /* 3D.100: the boss keeps after a shooter (gave up at 4.8 tiles, then wandered) */
    const lq = z.type === 'lasher' && !(z.lashCd > 0) ? lashPick(z) : null;
    if (lq) { z.target = lq; z.mode = 'zattack'; z.lash = true; z.stateTicks = 84; }   /* 3D.80; 3D.83 owner: it only hooks ranged fighters */
    else if (z.bk === 'stalker' && !(z.smashCd > 0) && dd < SMASH_R * .8) { z.mode = 'zattack'; z.smash = true; z.stateTicks = 135; }   /* 3D.87 owner: Stalker hulk smash, an area attack */
    else if (z.bk === 'stalker' && dd <= ZREACH) { z.mode = 'zattack'; z.combo = true; z.stateTicks = 195; }   /* 3D.89 owner: haymaker then a front kick (clip 'haymaker_kick') */
    else if (z.type === 'thrower' && dd < 4.4) { z.mode = 'zattack'; z.stateTicks = 56; } else if (z.type === 'spitter' && dd < 2.8) { z.mode = 'zattack'; z.stateTicks = 34; } else if (z.type === 'screamer' && dd < SCREAM_R * .8) { z.mode = 'zattack'; z.stateTicks = 96; } else if (dd > ZREACH) { if (followPath(z, z.target.w, d.chase) === 'fail') zWalk(z, z.target.w, d.chase, true); } else { z.mode = 'zattack'; z.stateTicks = z.type === 'screamer' ? 96 : z.type === 'sporehead' ? 114 : z.type === 'brute' || z.type === 'alpha' ? 38 : 26; if (z.bk === 'gatling') SFX('gatling'); } return;   /* 3D.36: the hammer fist lands later */
  }
  if (z.mode === 'zattack' && z.type === 'screamer') { z.moving = false;   /* 3D.38 AOE shriek: hurts everyone outside within SCREAM_R, calls a walker; in time with the 'scream' clip */
    if (z.stateTicks === 65) { SFX('scream'); impactFx(z, z.w); for (const q of S.sv) if (q.hp > 0 && q.w && !insideBuilding(q) && q.mode !== 'away' && dist(q.w, z.w) < SCREAM_R) { const dmg = zHitDmg(z, d, q); q.hp -= dmg; q.hitT = 9; if (rnd() < .5) emote(q, '😖', 60); floats.push({ w: { ...q.w }, t: '-' + dmg, col: '#ff6e62', a: 55 }); callHelp(q, z); }
      if (S.z.filter((q) => q.hp > 0).length < 60) spawn(z.w.x + (rnd() - .5) * 2, z.w.y + (rnd() - .5) * 2, 'walker'); }
    if (z.stateTicks <= 0) { z.mode = 'zrecover'; z.stateTicks = z.recDur = 150 + rnd() * 60; } return; }
  if (z.mode === 'zattack' && z.combo) { z.moving = false;   /* 3D.89 Stalker combo: 3D.93 slower (3.25 s): the haymaker lands at clip t ~.41 (tick 80 of 195), the kick at t = .80 (tick 156) and shoves the survivor back */
    const q = z.target, ok = q && q.hp > 0 && q.w && !insideBuilding(q) && q.mode !== 'away' && !['down', 'hospital'].includes(q.mode) && dist(q.w, z.w) < ZREACH + .6;
    if ((z.stateTicks === 115 || z.stateTicks === 39) && ok) { const kick = z.stateTicks === 39, dmg = Math.max(1, Math.round(zHitDmg(z, d, q) * (kick ? .8 : 1))); q.hp -= dmg; q.hitT = 9; SFX('hurt'); callHelp(q, z); floats.push({ w: { ...q.w }, t: '-' + dmg, col: '#ff6e62', a: 55 });
      if (kick) { const dx = q.w.x - z.w.x, dy = q.w.y - z.w.y, L = Math.hypot(dx, dy) || 1, nx = q.w.x + dx / L * .6, ny = q.w.y + dy / L * .6; if (Wd.inMap(Math.floor(nx), Math.floor(ny)) && Wd.walkable(world, Math.floor(nx), Math.floor(ny)) && !Wd.buildingAt(world, Math.floor(nx), Math.floor(ny))) { q.w.x = nx; q.w.y = ny; } if (rnd() < .5) emote(q, '😵', 60); } }
    if (z.stateTicks <= 0) { z.combo = false; z.mode = 'zrecover'; z.stateTicks = z.recDur = 40 + rnd() * 20; } return; }
  if (z.mode === 'zattack' && z.smash) { z.moving = false;   /* 3D.87 Stalker hulk smash: arms spread wide, then the hands slam together in front (clip 'smash', hit at t = .55): hurts everyone outside within SMASH_R */
    if (z.stateTicks === 61) { SFX('hurt'); hitFx.push({ k: 'smash', w: { ...z.w }, t0: tick, r: SMASH_R });   /* 3D.89 owner: an effect like the Screamer's */ for (const q of S.sv) if (q.hp > 0 && q.w && !insideBuilding(q) && q.mode !== 'away' && !['down', 'hospital'].includes(q.mode) && dist(q.w, z.w) < SMASH_R) { const dmg = Math.max(1, Math.round(zHitDmg(z, d, q) * 1.2)); q.hp -= dmg; q.hitT = 9; callHelp(q, z); if (rnd() < .5) emote(q, '😵', 60); floats.push({ w: { ...q.w }, t: '-' + dmg, col: '#ff6e62', a: 55 }); } }
    if (z.stateTicks <= 0) { z.smash = false; z.smashCd = 480 + rnd() * 180; z.mode = 'zrecover'; z.stateTicks = z.recDur = 50; } return; }
  if (z.mode === 'zattack' && z.lash) { z.moving = false;   /* 3D.80 Lasher: whips the long arm out and drags one survivor in (in time with the 'lash' clip: the grab lands at t = .38) */
    const q = z.target;
    if (z.stateTicks === 52 && q && q.hp > 0 && q.w && !insideBuilding(q) && q.mode !== 'away' && !['down', 'hospital'].includes(q.mode) && dist(q.w, z.w) < LASH_R + .25) {
      if (['Guard', 'Police Officer', 'SWAT'].includes(q.job) && rnd() < .5) floats.push({ w: { ...q.w }, t: 'BRACED!', col: '#C6FF4D', a: 60, big: true });
      else { z.pulling = q; z.pullT = 34; q.para = LASH_PARA; const dmg = Math.max(1, Math.round(zHitDmg(z, d, q) * .5)); q.hp -= dmg; q.hitT = 9; SFX('hurt'); callHelp(q, z); emote(q, '😵', 90, true); floats.push({ w: { ...q.w }, t: '-' + dmg + ' PARALYSED', col: '#ff6e62', a: 70 }); }
    }
    if (z.stateTicks <= 0) { z.lash = false; z.lashCd = 420 + rnd() * 120; z.mode = z.target && z.target.hp > 0 ? 'zchase' : 'idle'; } return; }
  if (z.mode === 'zattack' && z.type === 'sporehead') { z.moving = false; if ([91, 63, 30].includes(z.stateTicks) && z.target && z.target.hp > 0 && !insideBuilding(z.target) && dist(z.w, z.target.w) < ZREACH + .5) { const dmg = zHitDmg(z, d, z.target); z.target.hp -= dmg; z.target.hitT = 9; SFX('hurt'); callHelp(z.target, z); impactFx(z, z.target.w); floats.push({ w: { ...z.target.w }, t: '-' + dmg, col: '#ff6e62', a: 55 }); }
    if (z.stateTicks <= 0) { z.mode = 'zrecover'; z.stateTicks = z.recDur = 70 + rnd() * 20; } return; }   /* 3D.37 three-hit combo, in time with spore_combo */
  if (z.mode === 'zattack') { z.moving = false; if (z.type === 'spitter' && z.stateTicks === 14 && z.target && z.target.w) spits.push({ a: { ...z.w }, b: { ...z.target.w }, t0: tick, dur: 14, seed: rnd() }); if (z.type === 'thrower' && z.stateTicks === 22 && z.target && z.target.w) spits.push({ a: { ...z.w }, b: { ...z.target.w }, t0: tick, dur: 22, seed: rnd(), rock: true });   /* 3D.35: the glob leaves the mouth, lands when the hit does */
    if (z.stateTicks <= 0) { if (z.target && z.target.hp > 0 && !insideBuilding(z.target) && !(z.type === 'thrower' && dist(z.w, z.target.w) > 5.6)) { const popd = gearFx(z.target, 'pop') && tick - (z.target.popAt || -1e9) > 1800 && (z.target.popAt = tick), dmg = popd ? 0 : Math.max(1, fairRound((d.atk + (z.type === 'brute' ? 2 : 0)) * zPw(z) * (hasSkill(z.target, 'armored') ? .8 : 1) * (hasSkill(z.target, 'bulwark') ? .85 : 1) * (atPost(z.target) ? .8 : 1) * ((z.type === 'spitter' || z.type === 'bloated') && gearFx(z.target, 'gas') ? .4 : 1) * (gearFx(z.target, 'bite') ? .8 : 1) * (z.type === 'brute' && gearFx(z.target, 'blunt') ? .7 : 1) * (z.type === 'thrower' && gearFx(z.target, 'rubble') ? .5 : 1) * (1 - dmgReduce(z.target))));   /* 3D.28 gas mask / hazmat; 3D.149 Phone Book: bites 20% less; Bubble Wrap: the first hit in 30 s pops a bubble instead */ if (popd) floats.push({ w: { ...z.target.w }, t: 'pop!', col: '#bfe3ff', a: 55 }); const hq0 = Math.floor(4 * z.target.hp / z.target.max); z.target.hp -= dmg; z.target.hitT = 9; SFX('hurt'); impactFx(z, z.target.w); callHelp(z.target, z); if (Math.floor(4 * z.target.hp / z.target.max) < hq0) emote(z.target, '😣', 60);   /* 3D.265 emoji rule: the hurt face when a hit takes them past a quarter of their health */ floats.push({ w: { ...z.target.w }, t: '-' + dmg, col: '#ff6e62', a: 55 }); } z.mode = 'zrecover'; z.stateTicks = z.recDur = (z.type === 'runner' ? 38 : z.type === 'brute' ? 82 : z.type === 'thrower' ? 96 : 58) + rnd() * 22 + (z.target && gearFx(z.target, 'clang') && z.type !== 'boss' ? 30 : 0) + (z.target && gearFx(z.target, 'bounce') && z.type !== 'boss' ? 24 : 0) + (z.target && gearFx(z.target, 'wall') && atPost(z.target) && z.type !== 'boss' ? 40 : 0); if (z.target && gearFx(z.target, 'clang')) SFX('hit'); } return; }   /* 3D.148 Cookware Cuirass: a clang stuns the zombie half a second */
  if (z.mode === 'zrecover') { if (z.stateTicks <= 0) z.mode = z.target && z.target.hp > 0 ? 'zchase' : (z.siege ? 'zmarch' : 'idle'); }
}
/* ---------------- walls: zombies march, break segments, repairs, breach alert ---------------- */
const wallAtTile = (x, y) => world.walls.get(x + ',' + y) || null;
function siegeGoal(z) {
  const d = zDef(z), elite = z.type === 'spitter' || z.type === 'brute' || z.type === 'boss';
  const aw = allWalls(), open = aw.some((wl) => wl.broken);   /* 3D.374 pieces on the lines too */
  if (elite && aw.length && !open) {   // elites are smarter: they go for the gate; with no gate they pick the weakest segment
    let best = null, bs = 1e9; for (const wl of aw) if (wl.type === 'gate') { const sc = dist(z.w, wc(wl)); if (sc < bs) { bs = sc; best = wl; } }
    if (!best) for (const wl of aw) { const sc = wl.hp + dist(z.w, wc(wl)) * 6; if (sc < bs) { bs = sc; best = wl; } }
    return wc(best); }
  let g = null, gd = 1e9; for (const s of S.sv) if (s.hp > 0 && !insideBuilding(s)) { const dd = dist(s.w, z.w); if (dd < gd) { gd = dd; g = s.w; } }
  for (const b of world.buildings) { const c = { x: b.x + b.w / 2, y: b.y + b.h / 2 }, dd = dist(c, z.w); if (dd < gd) { gd = dd; g = c; } }
  return g ? { x: g.x, y: g.y } : tc(7 + OFF, 11 + OFF);
}
const ZDRIFT = .25;   /* tiles of pull per wander step (~2 tiles per game hour): a slow creep toward the town */
const townCentre = () => ({ x: (Wd.BUILD.x0 + Wd.BUILD.x1 + 1) / 2, y: (Wd.BUILD.y0 + Wd.BUILD.y1 + 1) / 2 });
function zMarchStep(z, goal, sp) {   /* V2.33: walk around walls to any opening; only a sealed town makes them break a wall (the first one on the cheapest route) */
  if (!goal) return;
  if (z.path && z.path.length) { const n = z.path[0], wl = wallAtTile(Math.floor(n.x), Math.floor(n.y)); if (wl && !wl.broken && dist(z.w, n) < 1.08) { z.wallT = wl; z.mode = 'zbreak'; z.stateTicks = 20; z.path = null; z.blocked = 0; return; }
    const e = edgeInWay(z, n); if (e) { z.wallT = e; z.mode = 'zbreak'; z.stateTicks = 20; z.path = null; z.blocked = 0; return; } }   /* 3D.374 a piece on the line in the way */
  z.wallCost = 160; const r = followPath(z, goal, sp); z.wallCost = 0;
  if (r === 'fail') zWalk(z, goal, sp);
}
function zPushOut(z) {   /* V2.33: zombies keep clear of building footprints so they never look like part of a building */
  const R = .3, x = z.w.x, y = z.w.y;
  for (let ty = Math.floor(y - R); ty <= Math.floor(y + R); ty++) for (let tx = Math.floor(x - R); tx <= Math.floor(x + R); tx++) {
    if (!Wd.buildingAt(world, tx, ty)) continue;
    const cx = Math.max(tx, Math.min(tx + 1, z.w.x)), cy = Math.max(ty, Math.min(ty + 1, z.w.y)); let dx = z.w.x - cx, dy = z.w.y - cy, d = Math.hypot(dx, dy);
    if (d >= R) continue;
    if (d < 1e-4) { const opts = [[tx - R, z.w.y, z.w.x - tx], [tx + 1 + R, z.w.y, tx + 1 - z.w.x], [z.w.x, ty - R, z.w.y - ty], [z.w.x, ty + 1 + R, ty + 1 - z.w.y]].sort((a, b) => a[2] - b[2]); z.w.x = opts[0][0]; z.w.y = opts[0][1]; }
    else { z.w.x = cx + dx / d * R; z.w.y = cy + dy / d * R; }
  }
}
function zWalk(z, goal, sp, viaPath = false) {   // slide toward the goal; when walls hold it still for a moment, start breaking the nearest one
  const bx = z.w.x, by = z.w.y; if (!goal) return; if (z.alphaNear) sp *= 1.2; moveSlide(z, goal, sp);   /* 3D.32 the Alpha's pack */
  if (Math.hypot(z.w.x - bx, z.w.y - by) < sp * .3) z.blocked++; else z.blocked = 0;
  if (z.blocked > 8) { const tx = Math.floor(z.w.x), ty = Math.floor(z.w.y); let best = null, bd = 1e9;
    for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) { const wl = wallAtTile(tx + dx, ty + dy); if (!wl || wl.broken) continue; const dd = dist({ x: tx + dx + .5, y: ty + dy + .5 }, goal); if (dd < bd) { bd = dd; best = wl; } }
    if (!best) best = edgeBeside(z, goal);   /* 3D.374 */
    if (best) { z.wallT = best; z.mode = 'zbreak'; z.stateTicks = 20; z.blocked = 0; z.path = null; } else if (z.blocked > 120) { z.goalT = 0; z.blocked = 0; z.dest = null; }
  }
}
function wallBroken(wl) {
  wl.hp = 0; wl.broken = true; Wd.bump(world); S.alert = 1800; SFX('breach'); const gate = wl.type === 'gate';
  for (const z of S.z) if (z.hp > 0 && !z.human && ['idle', 'zmarch', 'zbreak'].includes(z.mode) && dist(z.w, wc(wl)) < 16) { z.siege = true; z.mode = 'zmarch'; z.wallT = null; z.path = null; z.goal = null; z.goalT = 0; z.blocked = 0; }   /* V2.33: the whole horde rushes the breach */   /* V2.18: it stays as rubble and the repair crew rebuilds it */
  breachAlert(wl); ui();
}
let repairFrac = 0;
/* 3D.133 owner: 'why does the fence repair itself? doesn't someone need to work on it?' It did: every second the worst segment was patched from
   nowhere. Now a free survivor walks to it and hammers (Engineers, Mechanics and the handy first, and twice as fast). Same scrap cost as before
   (a full repair is 60% of a new segment). Nobody goes while a zombie is at that segment, or while they have something more urgent to do. */
function autoRepair() {   // every second: send someone to the most damaged segment that can be worked on (3D.374: pieces on the lines too)
  const near = (wl) => S.z.some((z) => z.hp > 0 && dist(z.w, wc(wl)) < 2.6), inGap = (wl) => !wl.edge && (S.z.some((z) => z.hp > 0 && Math.floor(z.w.x) === wl.x && Math.floor(z.w.y) === wl.y) || S.sv.some((q) => Math.floor(q.w.x) === wl.x && Math.floor(q.w.y) === wl.y));
  const cand = allWalls().filter((wl) => wl.hp < wl.max).sort((a, b) => a.hp / a.max - b.hp / b.max);
  if (repairFirst && (repairFirst.hp >= repairFirst.max || !wallLive(repairFirst))) repairFirst = null;
  const busy = S.sv.filter((q) => q.mode === 'fix' && q.fixW), taken = (wl) => busy.some((q) => (q.fixW.s || '') === (wl.edge ? wl.s : '') && q.fixW.x === wl.x && q.fixW.y === wl.y);
  const ok = (wl) => !near(wl) && !(wl.broken && inGap(wl)) && !taken(wl), best = repairFirst && ok(repairFirst) ? repairFirst : cand.find(ok); if (!best || busy.length >= 2 || S.mat < 1) return;
  const handy = (q) => q.job === 'Engineer' || q.job === 'Mechanic' || hasSkill(q, 'handy'), free = S.sv.filter((q) => q.hp > 0 && ['free', 'wait', 'walk'].includes(q.mode) && !q.sleeping && !q.purpose && !q.carriedLoot && !q.carrying && !insideBuilding(q) && !threatOf(q));
  const who = free.sort((a, b) => (handy(b) - handy(a)) || dist(a.w, wc(best)) - dist(b.w, wc(best)))[0]; if (!who) return;
  who.mode = 'fix'; who.fixB = null; who.fixW = best.edge ? { s: best.s, x: best.x, y: best.y } : { x: best.x, y: best.y }; who.fixWAt = null; who.path = null; who.why = 'Repairing the ' + Wd.WALL_DEFS[best.type].name.toLowerCase();
}
function fixWallTick(s) {
  const wl = s.fixW.s ? Wd.edgeAt(world, s.fixW.s, s.fixW.x, s.fixW.y) : Wd.wallAt(world, s.fixW.x, s.fixW.y), done = (t) => { s.fixW = null; s.fixWAt = null; s.activity = null; enterFree(s, t); };
  if (!wl || wl.hp >= wl.max || threatOf(s)) { done(30); return; }
  if (!s.fixWAt) { if (wl.edge) { const p = edgeFixSpot(wl, s); if (!p) { done(120); return; } s.fixWAt = p; }   /* 3D.374 beside the line, the town's side first */
    else { const opts = [[1, 0], [-1, 0], [0, 1], [0, -1]].map(([dx, dy]) => ({ x: wl.x + dx, y: wl.y + dy })).filter((t) => Wd.walkable(world, t.x, t.y)).sort((a, b) => (Wd.inTown(b.x, b.y) - Wd.inTown(a.x, a.y)) || dist(s.w, a) - dist(s.w, b)); if (!opts.length) { done(120); return; } s.fixWAt = { x: opts[0].x + .5, y: opts[0].y + .5 }; } }
  const r = followPath(s, s.fixWAt, WALK); if (r === 'moving') return; if (r === 'fail') { done(120); return; }
  s.moving = false; s.activity = 'Building'; s.faceW = wc(wl); if (tick % Math.round(40 / TUNE.work) !== 0) return;
  const fast = s.job === 'Engineer' || s.job === 'Mechanic' || hasSkill(s, 'handy'), amt = Math.min(wl.max - wl.hp, (fast ? 6 : 3) * (gearFx(s, 'fix') ? 1.5 : 1)), cost = amt / wl.max * Wd.WALL_DEFS[wl.type].mat * .6;
  repairFrac += cost; if (repairFrac >= 1) { if (S.mat < 1) { repairFrac = 1; floats.push({ w: { ...s.w }, t: 'Needs ' + RES_ICON.mat, col: '#ff8a7a', a: 80 }); done(200); return; } S.mat -= 1; repairFrac -= 1; flow('mat', 'Wall repairs', -1); }
  wl.hp += amt; SFX('hit'); if (wl.broken && wl.hp >= wl.max * .3) { wl.broken = false; Wd.bump(world); } if (wl.hp >= wl.max) { wl.hp = wl.max; floats.push({ w: wc(wl), t: 'REPAIRED', col: '#9fe58a', a: 50 }); done(30); }
}

