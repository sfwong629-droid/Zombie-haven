/* ---------------- town systems ---------------- */
const xpNeed = (s) => { const p = professions[s.job]; const b = (p && p.master) || 60, l = s.l || 1; return Math.round(l < 5 ? b : b * (1 + (l - 4) * .6)); };
function masteryCheck(s) {      // experience: each level raises the work boost and the daily ration; capped at LEVEL_CAP
  const p = professions[s.job]; if (!p || s.mastery < xpNeed(s)) return;
  if ((s.l || 1) < LEVEL_CAP) { bark(s, 'levelUp', {}, { pri: 1 }); s.l = (s.l || 1) + 1; s.mastery = 0; s.mastered = false; s.st = s.st || rollStats(s.job, 1); for (const k of (JOB_STATS[s.job] || [])) s.st[k] = Math.min(STAT_CAP, s.st[k] + 1); syncClass(s); const newSk = learnSkills(s, true); setMaxHp(s); s.hp = Math.min(s.max, s.hp + 8);   /* 3D.259 bug B19 (bug sweep): the new skill first, so its extra health (Hardy, Tough...) counts now, not at the next level-up */ renownGain(1, `${s.name} reached ${s.job} Lv.${s.l}`); levelUpFx(s); banner(`${s.name} reached Lv.${s.l}!`, s); if (newSk.length) note('routine', `${s.name} learned ${newSk.join(', ')} (kept in every profession).`, { at: s.w, float: '★ NEW SKILL', col: '#ffe38a' }); }
  else if (!s.mastered) { syncClass(s); s.mastered = true; renownGain(2, s.name + ' mastered ' + s.job); note('important', '🎓 ' + s.name + ' mastered ' + s.job + '!', { who: s }); }
}

/* ---------------- supplies: production, staffing, rations, upgrades ---------------- */
const SUPPLY_BASE_CAP = 60;
const storeTiers = () => bOf('storage').reduce((a, b) => a + (DEFS[b.type].tier || 1), 0);   /* V3D.23: crates 1, storehouse 2, warehouse 3 */
const matCap = () => 50 + 10 * (S.lvl || 1) + 40 * storeTiers();   /* 3D.104 storage grows with the Haven level */   /* wood and stone each */

const supplyCap = () => SUPPLY_BASE_CAP - 15 + 5 * (S.lvl || 1) + (S.sv && S.sv.some((q) => q.hp > 0 && q.spec === 'Cook') ? 20 : 0) + 20 * storeTiers() + (researched('stockpile') ? 30 : 0) + 40 * world.buildings.filter((b) => b.type === 'coldstore' && powered(b)).length;   /* 3D.77: a powered Cold Store keeps more food and water */
const isWorking = (b) => !!(b.staff && b.staff.mode === 'work' && b.staff.hp > 0);
const BUILDING_STAT = aliasT({ farm: 'str', field: 'str', water: 'per', well: 'per', medic: 'int', clinic: 'int', hospital: 'int', canteen: 'cha', workshop: 'int', scrapyard: 'str' });
const earlyFood = (b) => (DEFS[b.type] && DEFS[b.type].fam === 'farm' && S.day <= 10 && bOf('farm').length + bOf('field').length <= 2 ? 1.5 : 1);   /* 3D.104 early food help: the first gardens of a new town grow half as much again for the first 10 days */
const prodMult = (b, working = isWorking(b)) => (working && b.staff && b.staff.spec && b.staff.spec === b.staff.job ? 1.25 : 1) * earlyFood(b) * (working && b.staff && DEFS[b.type] && DEFS[b.type].fam === 'farm' && gearFx(b.staff, 'farm') ? 1.25 : 1) * powerBoost(b) * (b.fire || b.burnt ? 0 : 1) * (b.unpaid ? .5 : 1) * (working && b.staff ? hungryPen(b.staff) : 1) * (working && b.staff ? TUNE.work : 1) * (1 + combos(b).prod) * (1 + (working && b.staff ? fitBoost(b, b.staff) + traitWork(b.staff) + (BUILDING_STAT[b.type] ? (stat(b.staff, BUILDING_STAT[b.type]) - 5) * .03 : 0) + (hasSkill(b.staff, 'efficient') ? .15 : 0) + (hasSkill(b.staff, 'greenThumb') ? .2 : 0) + (hasSkill(b.staff, 'harvestMaster') && FAM(b.type) === 'food' ? .3 : 0) + (hasSkill(b.staff, 'masterBuilder') && isT(b, 'workshop') ? .2 : 0) : 0));
const dayLog = { foodIn: 0, waterIn: 0 };
/* ---------------- V2.15 upkeep: every building costs scrap each day; unpaid buildings run at half output ---------------- */
const UPKEEP = aliasT({ pallet: .2, pump: .5, greenhouse: .5, coldstore: .4, fuelstill: .3, ammobench: .3, ammofactory: .8, bonfire: .1, inn: .4, house: .2, water: .3, well: .5, farm: .3, field: .5, medic: .4, clinic: .7, hospital: 1.1, canteen: .4, armory: .4, workshop: .6, storage: .3, barracks: .6, scrapyard: .2, gym: .3, library: .3, lounge: .3, range: .4, track: .3, sparring: .3 });
const upkeepOf = (b) => (UPKEEP[b.type] ?? .3) * (b.staff && hasSkill(b.staff, 'masterBuilder') ? .5 : 1) * DF().upkeep;
const upkeepTotal = () => world.buildings.reduce((a, b) => a + upkeepOf(b), 0);
function payUpkeep() {   /* at day end: pay in order of importance (water, food, medical first); what can't be paid runs at half output tomorrow */
  const order = ['barrel', 'water', 'well', 'pump', 'farm', 'field', 'irrig', 'greenhouse', 'medic', 'clinic', 'hospital', 'scrapyard', 'canteen', 'mess', 'house'];   /* audit: every water and food type, the new ones included */
  const list = [...world.buildings].sort((a, b) => ((order.indexOf(a.type) + 1) || 99) - ((order.indexOf(b.type) + 1) || 99));
  let paid = 0, unpaid = 0, pw = 0; for (const b of list) { const c = upkeepOf(b), w = Math.min(c / 2, S.wood || 0), m = c - w; if (S.mat >= m) { S.mat -= m; S.wood = (S.wood || 0) - w; paid += m; pw += w; b.unpaid = false; } else if ((S.wood || 0) >= c) { S.wood -= c; pw += c; b.unpaid = false; } else { b.unpaid = true; unpaid++; } } flow('mat', 'Upkeep', -paid); flow('wood', 'Upkeep', -pw);   /* V3D.25: upkeep is half wood, half scrap (either covers the other) */
  if (unpaid) { note('important', `⚠ ${unpaid} BUILDING${unpaid > 1 ? 'S' : ''} UNPAID — HALF OUTPUT`, { log: `Not enough scrap for upkeep: ${unpaid} building${unpaid > 1 ? 's run' : ' runs'} at half output tomorrow. Build a Scrapyard or scavenge for scrap.` }); }
  return { paid, unpaid };
}
/* ---------------- V2.15 neighbour bonuses (DV2 combos / Fallout merged rooms) ---------------- */
const near = (a, b) => a !== b && a.x <= b.x + b.w && b.x <= a.x + a.w && a.y <= b.y + b.h && b.y <= a.y + a.h;   /* touching or 1 tile apart */
const FAM = (t0) => { const t = (DEFS[t0] && DEFS[t0].like) || t0; return FAM0(t); }, FAM0 = (t) => (['water', 'well'].includes(t) ? 'water' : ['farm', 'field'].includes(t) ? 'food' : ['medic', 'clinic', 'hospital'].includes(t) ? 'medical' : t);
const TRAINING = ['gym', 'library', 'lounge', 'range', 'track', 'sparring'];
let comboCache = { ver: -1, map: new Map() };
function combos(b) {
  if (comboCache.ver !== world.ver) { comboCache = { ver: world.ver, map: new Map() }; }
  if (comboCache.map.has(b)) return comboCache.map.get(b);
  const n = world.buildings.filter((o) => near(b, o)), c = { prod: 0, meal: 0, care: 0, train: 0, sat: 0, scrap: 0, names: [] }, f = FAM(b.type);
  const same = n.filter((o) => FAM(o.type) === f).length;
  if (['water', 'food', 'scrapyard'].includes(f) && same) { c.prod += Math.min(2, same) * .1; c.names.push(`District ×${Math.min(2, same) + 1} (+${Math.min(2, same) * 10}% output)`); }
  if (isT(b, 'canteen') && n.some((o) => FAM(o.type) === 'food')) { c.meal += .2; c.names.push('Farm to table (+20% meals)'); }
  if (f === 'food' && n.some((o) => isT(o, 'canteen'))) { c.prod += .05; c.names.push('Farm to table (+5% food)'); }
  if (f === 'medical' && n.some((o) => isT(o, 'house'))) { c.care += .15; c.names.push('Recovery ward (patients heal 15% faster)'); }
  if (TRAINING.includes(b.type) && n.some((o) => TRAINING.includes(o.type) && o.type !== b.type)) { c.train += .15; c.names.push('Fitness block (+15% training)'); }
  if (['lounge', 'canteen'].includes(b.type) && n.some((o) => isT(o, 'house'))) { c.sat += 1; c.names.push('Neighbourhood (+1 ♥ per visit)'); }
  if (isT(b, 'scrapyard') && n.some((o) => isT(o, 'workshop'))) { c.prod += .15; c.names.push('Salvage line (+15% scrap)'); }
  if (isT(b, 'armory') && n.some((o) => ['barracks', 'range'].includes(o.type))) { c.names.push('Arsenal (gear 1 scrap cheaper)'); c.arsenal = true; }
  comboCache.map.set(b, c); return c;
}
/* ---------------- V2.16 Workshop research + crafting ---------------- */
const RESEARCH = {
  salvage: { name: 'Salvage Methods', rp: 25, mat: 6, desc: 'Scrapyards make 25% more scrap. Hit it until it is useful.' },
  walls: { name: 'Reinforced Walls', rp: 30, mat: 10, desc: 'New and repaired walls get 30% more HP. Walls, but more so.' },
  stockpile: { name: 'Bigger Stockpiles', rp: 40, mat: 12, desc: '+30 supply cap. More shelves.' },
  medicine: { name: 'Field Medicine', rp: 25, mat: 6, desc: 'Bandages cost less scrap and last longer. Less screaming.' },
  blades: { name: 'Bladesmithing', rp: 20, mat: 5, desc: 'Craft the Machete and Fire Axe. Sharp ideas.' },
  firearms: { name: 'Firearms', rp: 40, mat: 12, need: 'blades', desc: 'Craft the Pistol and Hunting Rifle. Loud ideas.' },
  bodyArmor: { name: 'Body Armor', rp: 35, mat: 10, desc: 'Craft the Riot Vest and Scrap Plate. Wear the scrap.' },
  gadgets: { name: 'Gadgets', rp: 30, mat: 8, desc: 'Craft stat accessories. Gizmos with stats.' },
};
const RECIPES = { blades: ['machete', 'nailbat', 'spear', 'shovel', 'axe', 'roadsign', 'sledge', 'spiked', 'katana'], firearms: ['pistol', 'revolver', 'rifle', 'shotgun', 'crossbow', 'smg', 'magnum'], bodyArmor: ['biker', 'riot', 'firecoat', 'hazmat', 'ghillie', 'kevlar', 'plate', 'tactical', 'military', 'swatarmor', 'footpads', 'cookware', 'football', 'army', 'riothelm', 'gasmask', 'swathelm'], gadgets: ['gloves', 'belt', 'shoes', 'goggles', 'glasses', 'charm', 'dogtags', 'backpack', 'hikerpack', 'toolbelt', 'medpouch', 'watch', 'kneepads', 'walkie'] };
const researched = (k) => !k || !!(S.res && S.res[k]);
/* 3D.300 (overnight, W183 first-30-minute fix 6): a guided first research. The first project costs no scrap (the research points are
   enough), and the first Workshop's starter notes cover the cheapest project (12-people.js rpStarter), so it can start the moment it is built. */
const resMat = (k) => (Object.keys(S.res || {}).length ? RESEARCH[k].mat : 0);
const craftCost = (id) => Math.ceil(ITEMS[id].cost * 1.3) + 1;
function doResearch(k) { const r = RESEARCH[k]; if (!r || researched(k) || !researched(r.need) || (S.rp || 0) < r.rp || S.mat < resMat(k)) return false; S.rp -= r.rp; S.mat -= resMat(k); S.res = S.res || {}; S.res[k] = true; S.resWeek = (S.resWeek || 0) + 1; banner('🔬 RESEARCHED: ' + r.name.toUpperCase()); SFX('chime'); say(`Research complete: ${r.name} — ${r.desc}.`, true); saveGame(); ui(); return true; }
function craft(id) { const c = craftCost(id); if (S.mat < c || !Object.entries(RECIPES).some(([k, l]) => researched(k) && l.includes(id)) || !bOf('workshop').length) return false; S.mat -= c; stashAdd(id); SFX('coin'); banner('🛠 CRAFTED ' + ITEMS[id].name.toUpperCase()); say(`Crafted a ${ITEMS[id].name} (−${c} scrap). It's in the stash.`, true); saveGame(); ui(); return true; }
function outPop(b, got, icon, col) {   /* V2.36: each whole unit a building really produced pops above it; the fraction fills its badge ring */
  b.acc = (b.acc || 0) + got; if (b.acc >= 1) { const n = Math.floor(b.acc); b.acc -= n; floats.push({ w: { x: b.x + b.w / 2, y: b.y + b.h / 2 - .2 }, t: `+${n} ${icon}`, col, a: 80 }); }
}
/* V3D.13 weather: now and then it rains for a few hours; Rain Collectors fill 1.5x faster in light rain, 2x in heavy */
/* V3D.17 seasons and weather: a 28-day year (7 days a season, starting in autumn). Each morning the radio gives the forecast
   for the day; rain and snow come in a few short spells instead of all the time. Snow settles on the ground, roofs and trees. */
const SEASONS = [
  { id: 'spring', name: 'Spring', icon: '🌱', wet: .45, farm: 1.1 }, { id: 'summer', name: 'Summer', icon: '☀️', wet: .25, farm: 1.15 },
  { id: 'autumn', name: 'Autumn', icon: '🍂', wet: .45, farm: 1 }, { id: 'winter', name: 'Winter', icon: '❄️', wet: .55, farm: .7, snow: true }];
const SEASON_DAYS = 7;
const seasonOf = (day = S.day) => SEASONS[Math.floor((day - 1) / SEASON_DAYS + 2) % 4];
function forecastFor(day) {   /* planned once per day: 0–2 short spells of rain (or snow in winter) */
  S.fc = S.fc || {}; if (S.fc[day]) return S.fc[day]; const se = seasonOf(day), out = [];
  let n = rnd() < se.wet ? 1 : 0; if (n && rnd() < .2) n = 2;
  for (let i = 0; i < n; i++) { const h0 = 1 + Math.floor(rnd() * 21), dur = 2 + Math.floor(rnd() * 3), heavy = rnd() < .25; if (out.some((o) => h0 < o.h1 + 2 && o.h0 < h0 + dur + 2)) continue; out.push({ h0, h1: Math.min(24, h0 + dur), kind: (se.snow ? 'snow' : 'rain') + (heavy ? '-heavy' : '') }); }
  for (const k of Object.keys(S.fc)) if (+k < day - 1) delete S.fc[k];
  return (S.fc[day] = out.sort((a, b) => a.h0 - b.h0));
}
const WX_ICON = { rain: '🌧', 'rain-heavy': '⛈', snow: '🌨', 'snow-heavy': '❄️' }, WX_NAME = { rain: 'Light rain', 'rain-heavy': 'Heavy rain', snow: 'Snow', 'snow-heavy': 'Heavy snow' };
function forecastText(day) { const f = forecastFor(day), se = seasonOf(day); if (!f.length) return `${se.icon} ${se.name}: dry all day`; return se.icon + ' ' + f.map((o) => `${WX_NAME[o.kind]} ${String(o.h0).padStart(2, '0')}:00–${String(o.h1 % 24).padStart(2, '0')}:00`).join(', '); }
const rainMult = () => (S.weather && S.weather.kind.startsWith('rain') ? (S.weather.kind === 'rain-heavy' ? 2 : 1.5) : 1);
const seasonFarm = () => seasonOf().farm * ((S.seedUntil || 0) >= S.day ? 1.25 : 1);   /* 3D.111 Greenwater's thanks: seed stock */
function weatherHour() {
  leadsHour();
  const f = forecastFor(S.day), now = f.find((o) => S.hour >= o.h0 && S.hour < o.h1), was = S.weather;
  if (S.hour === 0 && seasonOf(S.day) !== seasonOf(S.day - 1)) { const se = seasonOf(); banner(`${se.icon} ${se.name} has come`); logEvent(`${se.name} has come.${se.snow ? ' Snow instead of rain, gardens grow 30% slower, bonfires matter.' : ''}`, 'important'); }
  if (S.hour === 6) { forecastFor(S.day + 1); banner('📻 ' + forecastText(S.day)); logEvent('Weather report: ' + forecastText(S.day) + '. Tomorrow: ' + forecastText(S.day + 1).replace(/^\S+ /, '') + '.'); }
  S.weather = now ? { kind: now.kind, h: now.h1 - S.hour } : null;
  if (S.weather && (!was || was.kind !== S.weather.kind)) { const k = S.weather.kind; barkSomeone(k.startsWith('snow') ? 'snow' : k === 'rain-heavy' ? 'storm' : 'rain', {}, { pri: 1 }); banner(`${WX_ICON[k]} ${WX_NAME[k]}${k.startsWith('rain') ? ': collectors fill faster' : ''}`); }
  if (!S.weather && was) barkSomeone('rainStop', {}, {});
  if (!S.weather && was) banner(was.kind.startsWith('snow') ? '🌤 The snow stops' : '🌤 The rain stops');
  const snowing = S.weather && S.weather.kind.startsWith('snow');
  S.snowK = Math.max(0, Math.min(1, (S.snowK || 0) + (snowing ? (S.weather.kind === 'snow-heavy' ? .35 : .2) : seasonOf().snow ? -.02 : -.18)));
}
/* 3D.28 tap-to-collect (Fallout Shelter style): producing buildings also fill a small BONUS (35% of what they make, up to
   12 hours' worth). When a whole unit is waiting a bubble pops over the building; tap it to collect. Normal production
   still reaches the stores on its own, so nothing is lost if you never tap. */
const BONUS = .35, BONUS_H = 12, BONUS_RES = { water: '💧', food: '🍖', mat: '⚙', wood: '🪵', stone: '🪨', rp: '🔬', meds: '💊' };
/* 3D.301 (Balance chat; owner, 22 Nov: "Herb beds"; the review's medicine fix): a Garden Plot, Fenced Farm or Irrigated Field can grow herbs
   instead of food: a quarter of its food output as medicine (a Garden Plot about 1 medicine a day), the same worker and water. Switched in the
   building's panel. It rests when the medicine store is full, as a farm rests when the pantry is full. */
const HERB_RATE = .25, herbOn = (b) => !!b.herbs && DEFS[b.type] && DEFS[b.type].fam === 'farm';
function setHerbs(b, on) { if (!DEFS[b.type] || DEFS[b.type].fam !== 'farm') return false; if (!!b.herbs === !!on) return true; if ((b.bonus || 0) >= 1) collectBonus(b); b.bonus = 0; b.trayFull = false; b.herbs = !!on; say(on ? `The ${DEFS[b.type].name} now grows herbs: about ${f1(DEFS[b.type].out * HERB_RATE)} medicine a day.` : `The ${DEFS[b.type].name} grows food again.`); return true; }
function addBonus(b, res, a) { if (!(a > 0)) return; b.bonusRes = res; b.bonus = Math.min(a * BONUS * BONUS_H, (b.bonus || 0) + a * BONUS); if (b.bonus >= 1 && !S.collectHint) { S.collectHint = 1; say('Tap the bubbles over buildings to collect bonus supplies!', true); } }
/* 3D.30 real Fallout Shelter collecting (glass/cozy UI): what a building makes waits in its tray until you tap the bubble.
   The tray holds TRAY_H hours of output; past that the building stops filling (shown as FULL, and listed in the alert hub). */
const TAP_COLLECT = true, TRAY_H = 24;   /* 3D.293: a tray holds a day's output, so a day away fills it (was 8 hours) */
/* 3D.169 Pallet Yard: wood out of scrap at 1.5 scrap per wood. Staffed 4 wood a day, nobody on it 1.5. It waits while scrap is under the floor (default 15) */
const PALLET_RATE = 1.5, palletFloor = () => S.palletFloor ?? 15, palletK = (b) => (b.staff ? 1 : .375);
function palletRun(b, a) { const use = a * PALLET_RATE; if ((S.mat || 0) - use < palletFloor()) { b.palletWait = true; return 0; } b.palletWait = false; S.mat -= use; flow('mat', 'Pallet Yard', -use); return a; }
function trayAdd(b, res, a, nm) { if (!(a > 0)) return; b.bonusRes = res; const cap = Math.max(2, a * TRAY_H), had = b.bonus || 0, put = Math.max(0, Math.min(a, cap - had)); b.bonus = had + put; b.trayCap = cap; b.trayFull = b.bonus >= cap - 1e-6; if (a > put && res !== 'rp') flow(res, 'Wasted: not collected', 0); if (b.bonus >= 1 && !S.collectHint) { S.collectHint = 1; note('important', 'Tap the bubbles over buildings to collect what they made', { banner: '👆 Tap the bubbles to collect!' }); } }
function collectBonus(b) { statAdd('trays');
  const r = b.bonusRes, n = TAP_COLLECT ? Math.round((b.bonus || 0) * 10) / 10 : Math.floor(b.bonus || 0); if (!r || n < 1) return false;
  const room = r === 'rp' ? 1e9 : r === 'water' || r === 'food' ? supplyCap() - (S[r] || 0) : r === 'mat' ? 1e9 : resCap(r) - (S[r] || 0), got = Math.max(0, Math.min(n, TAP_COLLECT ? room : Math.floor(room)));
  if (!got) { say(`${RES_TITLE[r] || 'Storage'} is full: build more storage to collect.`); return true; }
  if (got < .05) { say(`${RES_TITLE[r] || 'Storage'} is full: build more storage to collect.`); return true; }
  S[r] = (S[r] || 0) + got; b.bonus = Math.max(0, b.bonus - got); b.trayFull = false; if (r !== 'rp') flow(r, TAP_COLLECT ? DEFS[b.type].name : 'Collected bonus', got); if (r === 'water' || r === 'food') { S.produced += got; dayLog[r === 'food' ? 'foodIn' : 'waterIn'] += got; }   /* 3D.164 play-test (4 testers): the day summary always read 'Food +0.0': produce collected from the trays was never counted */
  floats.push({ w: { x: b.x + b.w / 2, y: b.y + b.h / 2 - .3 }, t: `+${Math.round(got)} ${BONUS_RES[r]}`, col: '#C6FF4D', a: 90, big: true }); SFX('reward'); S.collected = (S.collected || 0) + 1; ui(); return true;
}
function hitBonus(px, py) { for (const b of world.buildings) { const c = b._cb; if (c && tick - c.t < 8 && Math.hypot(px - c.x, py - c.y) < c.r * 1.5) return b; } return null; }
function drawBonus(b, cx, cy, z) {   /* white glass bubble with the resource icon and the amount, bobbing; tappable */
  const n = Math.floor(b.bonus || 0); if (n < 1 || !window.ZHIcons) return; const full = TAP_COLLECT && b.trayFull; const im = ZHIcons.img({ water: 'water', food: 'food', mat: 'parts', wood: 'wood', stone: 'stone', rp: 'research' }[b.bonusRes]);
  const r = (full ? 22 : 19) * z, x = cx, y = cy - 58 * z + Math.sin(tick / (full ? 5 : 10) + b.x) * (full ? 4 : 2.5) * z;
  ctx.save(); ctx.shadowColor = 'rgba(0,0,0,.35)'; ctx.shadowBlur = 8 * z; ctx.shadowOffsetY = 3 * z;
  ctx.beginPath(); ctx.arc(x, y, r, 0, 7); ctx.fillStyle = 'rgba(255,255,255,.96)'; ctx.fill(); ctx.shadowColor = 'transparent';
  ctx.lineWidth = 2.5 * z; ctx.strokeStyle = full ? '#FF7A59' : '#C6FF4D'; ctx.beginPath(); ctx.arc(x, y, r + 1.5 * z, 0, 7); ctx.stroke();
  ctx.beginPath(); ctx.moveTo(x - 5 * z, y + r - 1); ctx.lineTo(x, y + r + 7 * z); ctx.lineTo(x + 5 * z, y + r - 1); ctx.fillStyle = 'rgba(255,255,255,.96)'; ctx.fill();
  if (im && im.complete) ctx.drawImage(im, x - 14 * z, y - 15 * z, 28 * z, 28 * z);
  const t = full ? 'FULL' : '+' + n; ctx.font = `800 ${Math.round(13 * z)}px Manrope, system-ui, sans-serif`; const tw = ctx.measureText(t).width + 8 * z;
  ctx.beginPath(); ctx.roundRect(x + r * .45, y - r - 5 * z, tw, 18 * z, 9 * z); ctx.fillStyle = full ? '#FF7A59' : '#C6FF4D'; ctx.fill(); ctx.fillStyle = full ? '#fff' : '#14200A'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillText(t, x + r * .45 + tw / 2, y - r + 4 * z);
  ctx.restore(); b._cb = { x, y, r, t: tick };
}
function newProduce(b, d, cap) {   /* 3D.77: the power, fuel and ammo buildings */
    if (b.burnt || b.fire) return d.fam === 'pump' || d.fam === 'greenhouse' || d.fam === 'fuel' || d.fam === 'ammo' || d.fam === 'ammo2';
    const tk = b.staff && hasSkill(b.staff, 'tinkerer') ? 1.25 : 1, base = b.staff ? 1 : .25;   /* no Mechanic on the job: a quarter */
    if (d.fam === 'pump') { const a = d.out / 24 * prodMult(b) * base * (powered(b) ? 1 : PUMP_HAND), got = Math.min(a, Math.max(0, cap - S.water)); S.water += got; dayLog.waterIn += got; flow('water', d.name, got); outPop(b, got, '💧', '#8fd8ff'); return true; }
    if (d.fam === 'greenhouse') { const full = S.food >= supplyCap() - .5, need = full ? 0 : d.waterUse / 24, frac = full ? 0 : Math.min(1, (S.water || 0) / need); S.water -= need * frac; flow('water', 'Irrigation', -need * frac); const a = d.out / 24 * frac * prodMult(b) * base * (powered(b) ? 1.4 : 1), got = Math.min(a, Math.max(0, cap - S.food)); S.food += got; dayLog.foodIn += got; flow('food', d.name, got); outPop(b, got, '🍖', '#9fe58a'); return true; }   /* lamps with power: +40% */
    if (d.fam === 'fuel') { const a = Math.min(d.out / 24 * prodMult(b) * base * tk, rareCap() - (S.fuel || 0)), wood = a * 2; if (a <= 0 || (S.wood || 0) < wood) return true; S.wood -= wood; S.fuel = Math.min(rareCap(), (S.fuel || 0) + a); flow('fuel', d.name, a); outPop(b, a, '⛽', '#ffb36b'); return true; }   /* 2 wood -> 1 fuel */
    if (d.fam === 'ammo' || d.fam === 'ammo2') { if (d.fam === 'ammo2' && !powered(b)) return true; const a = Math.min(d.out / 24 * prodMult(b) * base * tk, ammoCap() - (S.ammo || 0)), scrap = a / 4; if (a <= 0 || S.mat < scrap) return true; S.mat -= scrap; S.ammo = (S.ammo || 0) + a; flow('mat', d.name, -scrap); flow('ammo', d.name, a); outPop(b, a, '🔸', '#ffd27a'); return true; }   /* 1 scrap -> 4 rounds */
    return false;
}
function hourlyProduction() {   // runs every game hour
  goalsTick(); if (S.hour % 3 === 0) ammoAlert(false);
  let fi = 0, wi = 0; const cap = supplyCap();
  for (const b of world.buildings) {
    const d = DEFS[b.type]; if (!d) continue; const nm = d.name;
    if (d.slot) { b.wh = b.wh || []; b.wh.push(b.staff ? (b.wsN ? b.wsW / b.wsN : (isWorking(b) ? 1 : 0)) : 0); if (b.wh.length > 24) b.wh.shift(); b.wsN = b.wsW = 0; }   /* V2.35: measured share of the hour the worker was on the job */
    if (d.fam === 'water' && TAP_COLLECT) { trayAdd(b, 'water', d.out / 24 * prodMult(b) * helpMult(b) * (isT(b, 'water') ? rainMult() : 1)); continue; }
    if (d.fam === 'water') { const a = d.out / 24 * prodMult(b) * helpMult(b) * (isT(b, 'water') ? rainMult() : 1), room = Math.max(0, cap - S.water), got = Math.min(a, room); S.water = keepCap(cap, S.water, a); wi += got; flow('water', nm, got); addBonus(b, 'water', a); outPop(b, got, '💧', '#8fd8ff'); if (a > got) flow('water', 'Wasted: storage full', -(a - got)); }
    if (d.fam === 'scrap' && TAP_COLLECT) { trayAdd(b, 'mat', d.out / 24 * prodMult(b) * (researched('salvage') ? 1.25 : 1)); continue; }
    if (d.fam === 'scrap') { const a = d.out / 24 * prodMult(b) * (researched('salvage') ? 1.25 : 1); S.mat += a; flow('mat', nm, a); addBonus(b, 'mat', a); outPop(b, a, '⚙', '#9fe0ff'); }
    if (d.fam === 'pallet') { const a = palletRun(b, d.out / 24 * prodMult(b) * palletK(b)); if (a > 0) trayAdd(b, 'wood', a); continue; }
    if ((d.fam === 'lumber' || d.fam === 'quarry') && TAP_COLLECT) { trayAdd(b, d.fam === 'lumber' ? 'wood' : 'stone', d.out / 24 * prodMult(b)); continue; }
    if (d.fam === 'lumber' || d.fam === 'quarry') { const r = d.fam === 'lumber' ? 'wood' : 'stone', a = Math.max(0, Math.min(d.out / 24 * prodMult(b), matCap() - (S[r] || 0))); S[r] = (S[r] || 0) + a; flow(r, nm, a); addBonus(b, r, d.out / 24 * prodMult(b)); outPop(b, a, RES_ICON[r], '#e8b878'); }   /* V3D.23 */
    if (d.fam === 'research' && TAP_COLLECT) { trayAdd(b, 'rp', (isWorking(b) ? d.out : 6) / 24 * prodMult(b)); continue; }
    if (d.fam === 'research') { const a = (isWorking(b) ? d.out : 6) / 24 * prodMult(b); S.rp = (S.rp || 0) + a; addBonus(b, 'rp', a); outPop(b, a, '🔬', '#c7b6ff'); }
    if (newProduce(b, d, cap)) continue;
    if (herbOn(b)) { const full = (S.meds || 0) >= rareCap() - .5, need = full ? 0 : d.waterUse / 24, frac = full ? 0 : need > 0 ? Math.min(1, S.water / need) : 1; S.water -= need * frac; flow('water', 'Irrigation', -need * frac); b.dry = !full && frac < 1; b.rest = full; const a = d.out * HERB_RATE / 24 * frac * prodMult(b) * helpMult(b) * seasonFarm(); if (TAP_COLLECT) { trayAdd(b, 'meds', a); continue; } S.meds = Math.min(rareCap(), (S.meds || 0) + a); flow('meds', nm, a); continue; }   /* 3D.301 herb beds */
    if (d.fam === 'farm') { const full = S.food >= supplyCap() - .5, need = full ? 0 : d.waterUse / 24, frac = full ? 0 : need > 0 ? Math.min(1, S.water / need) : 1;   /* 3D.110 balance run: a full pantry means the farm rests and drinks no water */ S.water -= need * frac; flow('water', 'Irrigation', -need * frac); b.dry = !full && frac < 1; b.rest = full; const a = d.out / 24 * frac * prodMult(b) * helpMult(b) * seasonFarm(); if (TAP_COLLECT) { trayAdd(b, 'food', a); continue; } const room = Math.max(0, cap - S.food), got = Math.min(a, room); S.food = keepCap(cap, S.food, a); fi += got; flow('food', nm, got); addBonus(b, 'food', a); outPop(b, got, '🍖', '#ffe06b'); if (a > got) flow('food', 'Wasted: storage full', -(a - got)); }
  }
  S.produced += fi + wi; dayLog.foodIn += fi; dayLog.waterIn += wi;
}
/* ---------------- V2.35 economy: expected daily rates from the same formulas as the simulation + an hourly ledger of what really happened ---------------- */
const RES_TITLE = { food: 'Food', water: 'Water', mat: 'Scrap', wood: 'Wood', stone: 'Stone', cloth: 'Cloth', meds: 'Medicine', fuel: 'Fuel', ammo: 'Ammo' };
const ECO = { start: null, cur: null, hist: [] };   // hist: last 24 game hours of { res: { category: amount } } (not saved: rebuilt after a load)
function flow(res, cat, amt) { if (!ECO.cur) ecoHour(); const r = ECO.cur[res] ||= {}; r[cat] = (r[cat] || 0) + amt; }
function ecoHour() {   // close the hour: what is not explained by a recorded flow goes to "Other" (kills, story events, trader, purchases...)
  if (ECO.cur && ECO.start) { for (const k of ['food', 'water', 'mat']) { const rec = Object.values(ECO.cur[k]).reduce((a, v) => a + v, 0), res = (S[k] - ECO.start[k]) - rec; if (Math.abs(res) > .005) ECO.cur[k][res > 0 ? 'Other income' : 'Other spending'] = res; } ECO.hist.push(ECO.cur); if (ECO.hist.length > 24) ECO.hist.shift(); }
  ECO.cur = { food: {}, water: {}, mat: {}, wood: {}, stone: {} }; ECO.start = { food: S.food, water: S.water, mat: S.mat, wood: S.wood || 0, stone: S.stone || 0 };
}
function ecoLast24(res) { const out = {}; for (const h of ECO.hist) for (const [k, v] of Object.entries(h[res] || {})) out[k] = (out[k] || 0) + v; return { hours: ECO.hist.length, by: out }; }
const workShare = (b) => { if (!b.staff) return 0; const h = b.wh || []; return h.length >= 4 ? h.reduce((a, v) => a + v, 0) / h.length : .5; };   // measured; .5 until there are a few hours of history
function expectedMult(b) { const sh = workShare(b); return prodMult(b, false) * (1 - sh) + prodMult(b, true) * sh; }
function econ() {   // expected per-day flows for food, water and scrap, with the buildings behind them
  const R = { food: { prod: [], use: [] }, water: { prod: [], use: [] }, mat: { prod: [], use: [] }, wood: { prod: [], use: [] }, stone: { prod: [], use: [] } }, need = rationNeed(), issues = [];
  let wAvail = 0; for (const b of world.buildings) { const d = DEFS[b.type]; if (d && (d.fam === 'water' || d.fam === 'pump')) wAvail += d.out * expectedMult(b) * (d.fam === 'pump' ? (powered(b) ? 1 : PUMP_HAND) : 1); }
  for (const b of world.buildings) {
    const d = DEFS[b.type]; if (!d) continue; const m = expectedMult(b), who = { b, name: d.name };
    if (d.fam === 'water') R.water.prod.push({ ...who, v: d.out * m });
    if (d.fam === 'scrap') R.mat.prod.push({ ...who, v: d.out * m * (researched('salvage') ? 1.25 : 1) });
    if (d.fam === 'lumber') R.wood.prod.push({ ...who, v: d.out * m }); if (d.fam === 'pallet') { const v = d.out * m * palletK(b); R.wood.prod.push({ ...who, v }); R.mat.use.push({ ...who, name: d.name + ' (scrap into wood)', v: v * PALLET_RATE }); } if (d.fam === 'quarry') R.stone.prod.push({ ...who, v: d.out * m });
    if (d.fam === 'farm' || d.fam === 'greenhouse') { const frac = S.water > 1 || wAvail > d.waterUse ? 1 : Math.min(1, S.water / (d.waterUse || 1)); if (!herbOn(b)) R.food.prod.push({ ...who, v: d.out * m * frac * (d.fam === 'greenhouse' && powered(b) ? 1.4 : 1) }); R.water.use.push({ ...who, name: d.name + ' irrigation', v: d.waterUse * frac }); }
    if (d.fam === 'pump') R.water.prod.push({ ...who, v: d.out * m * (b.staff ? 1 : .25) * (powered(b) ? 1 : PUMP_HAND) });   /* 3D.77 */
    const u = upkeepOf(b); if (u > 0) R.mat.use.push({ ...who, name: d.name + ' upkeep', v: u, group: 'Upkeep' });
    if (d.slot && !b.staff) issues.push({ b, t: `${d.name}: no ${(STAFF_JOBS[d.fam] || ['worker']).join(' or ')} assigned, base output only`, res: FAMRES(d.fam) });
    if (b.unpaid) issues.push({ b, t: `${d.name}: upkeep unpaid, half output`, res: FAMRES(d.fam) || 'mat' });
    if (b.fire || b.burnt) issues.push({ b, t: `${d.name}: ${b.fire ? 'on fire' : 'burnt down'}, no output`, res: FAMRES(d.fam) });
    if (d.fam === 'farm' && b.dry) issues.push({ b, t: `${d.name}: not enough water to irrigate`, res: 'food' });
  }
  R.food.use.push({ name: `Rations (${S.sv.length} survivors${(S.kids || []).length ? ', ' + S.kids.length + ' children' : ''})`, v: need.f });
  R.water.use.push({ name: `Rations (${S.sv.length} survivors${(S.kids || []).length ? ', ' + S.kids.length + ' children' : ''})`, v: need.w });
  /* 3D.162 play-test (two testers): the forecast showed about -2 a day while the stores really fell by 7 to 9. It left out what squads pack
     for their trips (a ledger over 8 days: 28 food and 28 water). Now it counts the average of the last 3 days as "Squad supplies". */
  for (const k of ['food', 'water']) { const v = (S.tripUse || []).filter((q) => q.k === k && q.d > S.day - 3).reduce((a, q) => a + q.v, 0) / 3; if (v > .05) R[k].use.push({ name: 'Squad supplies (trips, last 3 days)', v }); }
  const cap = supplyCap(), out = {};
  for (const k of ['food', 'water', 'mat', 'wood', 'stone']) {
    const P = R[k].prod.reduce((a, q) => a + q.v, 0), U = R[k].use.reduce((a, q) => a + q.v, 0), net = P - U, stock = S[k] || 0, c = k === 'mat' ? null : k === 'wood' || k === 'stone' ? matCap() : cap;
    out[k] = { k, stock, prod: P, use: U, net, cap: c, producers: R[k].prod.sort((a, b) => b.v - a.v), consumers: R[k].use.sort((a, b) => b.v - a.v), days: net < -1e-6 ? stock / -net : Infinity, fullIn: c && net > 1e-6 && stock < c ? (c - stock) / net : null, full: c ? stock >= c - .01 : false, issues: issues.filter((i) => i.res === k) };
  }
  return out;
}
const keepCap = (cap, cur, add) => Math.max(cur, Math.min(cap, cur + add));   /* audit: a cap that shrinks (Cold Store loses power) never deletes what is stored */
const FAMRES = (fam) => fam === 'pallet' ? 'wood' : fam === 'water' || fam === 'pump' ? 'water' : fam === 'farm' || fam === 'greenhouse' ? 'food' : fam === 'fuel' ? 'fuel' : fam === 'ammo' || fam === 'ammo2' ? 'ammo' : fam === 'scrap' ? 'mat' : fam === 'lumber' ? 'wood' : fam === 'quarry' ? 'stone' : null;
function supplyStats() {         // per-day picture for the Town panel and the rank conditions (V2.35: from econ(), so every screen shows the same numbers)
  const e = econ(), need = rationNeed().f * 2, wUse = e.water.consumers.filter((q) => q.b).reduce((a, q) => a + q.v, 0);
  return { need, fIn: e.food.prod, wIn: e.water.prod, wUse, fNet: e.food.net, wNet: e.water.net, fDays: e.food.days, wDays: e.water.days };
}
/* ---------------- V2.16 weekly Haven Review (DV2 town evaluation) ---------------- */
function weekStart() { S.wk = { kills: S.kills, produced: S.produced, fallen: (S.fallen || []).length, bosses: S.bossKills || 0, sat: S.sv.length ? S.sv.reduce((a, q) => a + (q.sat || 0), 0) / S.sv.length : 0 }; S.resWeek = 0; }
function havenReview() {
  const w = S.wk || { kills: 0, produced: 0, fallen: 0, bosses: 0 }, lost = (S.fallen || []).length - w.fallen;
  const avgSat = S.sv.length ? S.sv.reduce((a, q) => a + (q.sat || 0), 0) / S.sv.length : 0, types = new Set(world.buildings.map((b) => b.type)).size;
  const sc = {
    Population: Math.min(20, S.sv.length * 1.5 + residents()),
    Defense: Math.max(0, Math.min(20, (S.kills - w.kills) / 8 + ((S.bossKills || 0) - w.bosses) * 3 - lost * 5)),
    Supplies: Math.min(20, (S.produced - w.produced) / 10),
    Buildings: Math.min(20, types + world.buildings.length * .3),
    Happiness: Math.max(0, Math.min(20, avgSat / 5)),   /* 3D.169 round 2 (two testers): it scored the week's rise, so a town at full mood all week got 3/20. Now the level: ♥100 = 20 */
    Research: Math.min(20, (S.resWeek || 0) * 4 + Object.keys(S.res || {}).length * .5),
  };
  const total = Math.round(Object.values(sc).reduce((a, v) => a + v, 0)), g = total >= 100 ? 'S' : total >= 80 ? 'A' : total >= 60 ? 'B' : total >= 40 ? 'C' : 'D';
  const R = { S: [30, 20, 'Beacon of Hope'], A: [20, 14, 'Thriving Haven'], B: [12, 8, 'Steady Settlement'], C: [6, 4, 'Struggling Camp'], D: [2, 0, 'Barely Holding On'] }[g];
  let item = null; if (g === 'S' || g === 'A') { const pool = ['gloves', 'belt', 'shoes', 'goggles', 'glasses', 'charm', 'dogtags', 'backpack', 'watch', 'kneepads', 'toolbelt', 'walkie', 'medpouch', 'headlamp', 'gasmask']; item = pool[Math.floor(rnd() * pool.length)]; stashAdd(item); }
  S.mat += R[1]; renownGain(R[0], 'Weekly Haven Review: ' + g); S.titles = S.titles || []; if (!S.titles.includes(R[2])) S.titles.push(R[2]); S.lastReview = { week: Math.floor((S.day - 1) / 7), grade: g, total, sc };
  showEventPopup({ title: `HAVEN REVIEW · WEEK ${Math.floor((S.day - 1) / 7)} · GRADE ${g}`, text: Object.entries(sc).map(([k, v]) => `${k}: <b>${Math.round(v)}</b>/20`).join('<br>') + `<br><b>Total ${total}/120</b> — title: <b>${R[2]}</b>`, gains: `+${R[0]} Renown · +${R[1]} scrap${item ? ' · ' + ITEMS[item].name : ''}` });
  weekStart();
}
/* ---------------- V2.17 Phase D: incidents (fire, break-in), rush production, pets, wandering trader ---------------- */
const RUSH_FAMS = ['water', 'farm', 'scrap', 'research'], RUSH_STAT = { water: 'per', farm: 'str', scrap: 'str', research: 'int' };
const nowH = () => S.day * 24 + S.hour;
const enclosedB = (b) => !OPEN_AIR.has(b.type);
function rushRisk(b) {   /* 30% base; a skilled worker on shift lowers it, rushing again soon raises it */
  const d = DEFS[b.type], s = isWorking(b) ? b.staff : null;
  return Math.max(.05, Math.min(.75, .3 - (s ? .1 + (stat(s, RUSH_STAT[d.fam] || 'end') - 5) * .02 : 0) + (b.rushes || 0) * .1));
}
function rushCheck(b) {
  const d = DEFS[b.type]; if (!RUSH_FAMS.includes(d.fam)) return { ok: false, why: '' };
  if (b.fire || b.burnt) return { ok: false, why: 'Not while it is burning or burnt' };
  if ((b.rushT || 0) > nowH()) return { ok: false, why: `Ready again in ${b.rushT - nowH()} h` };
  return { ok: true, why: '' };
}
function rush(b) {   /* four hours of output right now, or a fire */
  const c = rushCheck(b); if (!c.ok) { say(c.why); return false; }
  const d = DEFS[b.type], risk = rushRisk(b); b.rushT = nowH() + 6; b.rushes = (b.rushes || 0) + 1;
  if (rnd() < risk) { startFire(b, 40, 'The rush went wrong'); saveGame(); ui(); return true; }
  const a = (d.fam === 'research' && !isWorking(b) ? 4 : d.out) / 24 * 4 * prodMult(b); let t = '';
  if (d.fam === 'water') { S.water = keepCap(supplyCap(), S.water, a); S.produced += a; t = 'water'; }
  if (d.fam === 'farm') { S.water = Math.max(0, S.water - d.waterUse / 6); S.food = keepCap(supplyCap(), S.food, a); S.produced += a; t = 'food'; }
  if (d.fam === 'scrap') { S.mat += a * (researched('salvage') ? 1.25 : 1); t = 'parts'; }
  if (d.fam === 'research') { S.rp = (S.rp || 0) + a; t = 'RP'; }
  if (b.staff) gainXp(b.staff, 2);
  SFX('coin'); const p = Wd.doorPoint(b); floats.push({ w: { x: p.x, y: p.y }, t: `RUSH +${a.toFixed(1)} ${t.toUpperCase()}`, col: '#9fe58a', a: 80 });
  say(`Rushed the ${d.name}: +${a.toFixed(1)} ${t} now.`); saveGame(); ui(); return true;
}
function ejectFrom(b) {   /* everyone inside a building steps out of the door */
  const a = Wd.approachPoint(b);
  for (const q of S.sv) if (insideBuilding(q) === b || (q.mode === 'hiding' && q.hideAt === b)) {
    if (q.mode === 'useFacility' || q.mode === 'goFacility') q.facility = null; if (q.mode === 'hiding') q.hideAt = null;
    q.w = { x: a.x, y: a.y }; q.activity = null; enterFree(q, 10);
  }
}
function startFire(b, n = 30, why = '') {
  if (!world.buildings.includes(b) || b.burnt || (b.safeUntil || 0) > nowH()) return false; const was = b.fire; if (!was) barkSomeone('fire', { b: DEFS[b.type].name }, { pri: 2 }, { x: b.x + b.w / 2, y: b.y + b.h / 2 }); b.fire = Math.max(b.fire || 0, n); if (was) return true;
  ejectFrom(b); S.incidents = (S.incidents || 0) + 1;
  SFX('alarm'); note('critical', `Fire at the ${DEFS[b.type].name}`, { key: 'fire' + b.x + ',' + b.y, icon: '🔥', log: `${why ? why + ': ' : ''}the ${DEFS[b.type].name} is on fire! Nearby survivors will fight it (uses a little water). If it burns down it must be repaired.`, at: { x: b.x + b.w / 2, y: b.y + b.h / 2 }, live: () => !!b.fire && world.buildings.includes(b), dyn: () => `Fire at the ${DEFS[b.type].name} · ${Math.round(b.fire)}% · ${S.sv.filter((q) => q.fireAt === b).length} fighting it` });
  return true;
}
const gapB = (a, b) => Math.max(a.x - (b.x + b.w), b.x - (a.x + a.w), a.y - (b.y + b.h), b.y - (a.y + a.h), 0);
function burnDown(b) {
  b.fire = 0; b.burnt = true; releasePost(b); Wd.bump(world);
  for (const q of S.sv) if (q.fireAt === b && ['goFire', 'fightFire'].includes(q.mode)) { q.fireAt = null; q.activity = null; enterFree(q, 30); }
  note('important', '🏚 ' + DEFS[b.type].name.toUpperCase() + ' BURNED DOWN', { log: `The ${DEFS[b.type].name} burned down. It does nothing until repaired (tap it).` });
  { const nb = world.buildings.filter((o) => o !== b && !o.burnt && !o.fire && gapB(o, b) <= 1); if (nb.length && rnd() < .35) startFire(nb[Math.floor(rnd() * nb.length)], 25, 'The fire spread'); }   /* V2.18: at most one neighbour */
}
function fireOut(b) {
  barkSomeone('fireOut', {}, { pri: 1 }, { x: b.x + b.w / 2, y: b.y + b.h / 2 }); b.fire = 0; const crew = S.sv.filter((q) => q.fireAt === b && ['goFire', 'fightFire'].includes(q.mode)); crew.forEach((q) => { q.fireAt = null; q.activity = null; gainXp(q, 3); enterFree(q, 40); });
  note('routine', `The fire at the ${DEFS[b.type].name} is out${crew.length ? ' — thanks to ' + crew.map((q) => q.name).join(', ') : ''}.`, { at: { x: b.x + b.w / 2, y: b.y + b.h / 2 }, float: '✔ FIRE OUT', col: '#9fe58a' }); renownGain(2, 'Fire put out');
}
const repairCost = (b) => repCostFrac(b, .25);   /* 3D.61: a quarter of each of its materials */
function repairBurnt(b) {
  const rc = repairCost(b); if (!b.burnt || !canPay(rc)) return false; payCost(rc); for (const [k, v] of Object.entries(rc)) flow(k, 'Repairs', -v); b.burnt = false; b.wrecked = false; b.hp = bMax(b); b.max = b.hp; b.safeUntil = nowH() + 24; Wd.bump(world); autoStaff();
  screenToast('🔨 ' + DEFS[b.type].name.toUpperCase() + ' REPAIRED'); saveGame(); ui(); return true;
}
const FIRE_FREE = ['free', 'wait', 'walk', 'goFacility', 'useFacility', 'goWork', 'work', 'postCombat'];
function incidentTick() {   /* every 30 ticks: fires grow, firefighters get sent */
  for (const b of [...world.buildings]) {
    if (!b.fire) continue; SFX('crackle'); b.fire += .35; if (b.fire >= 100) { burnDown(b); continue; }
    let crew = S.sv.filter((q) => q.fireAt === b && ['goFire', 'fightFire'].includes(q.mode)).length;
    if (crew >= 3) continue; const a = Wd.approachPoint(b);
    const c = S.sv.filter((q) => q.hp > q.max * .4 && FIRE_FREE.includes(q.mode) && q.purpose !== 'scav-out' && dist(q.w, a) < 10).sort((x, y) => dist(x.w, a) - dist(y.w, a));
    for (const q of c) { if (crew >= 3) break; if (insideBuilding(q)) { const ib = insideBuilding(q), p = Wd.approachPoint(ib); q.w = { x: p.x, y: p.y }; } q.fireAt = b; q.mode = 'goFire'; q.facility = null; q.activity = null; q.path = null; q.dest = null; q.purpose = null; q.target = null; q.why = 'Fighting the fire at the ' + DEFS[b.type].name; crew++; }
  }
}
function fireAI(s) {   /* modes goFire / fightFire */
  const b = s.fireAt; if (!b || !world.buildings.includes(b) || !b.fire) { s.fireAt = null; s.activity = null; enterFree(s, 40); return; }
  if (s.mode === 'goFire') { const r = followPath(s, Wd.approachPoint(b), CHASE); if (r === 'arrived') { s.mode = 'fightFire'; s.activity = 'Firefighting'; s.path = null; s.stateTicks = 30; } else if (r === 'fail') { s.fireAt = null; enterFree(s, 60); } return; }
  s.moving = false; if (s.stateTicks > 0) return; s.stateTicks = 30;
  const wet = S.water >= .1; if (wet) { S.water -= .1; flow('water', 'Firefighting', -.1); }   /* without water they beat it out at half speed */
  b.fire -= (wet ? 2 : 1) * Math.max(.6, sMod(s, 'end', .04)) * (gearFx(s, 'fire') ? 1.6 : 1); if (b.fire <= 0) fireOut(b);   /* 3D.28 Firefighter Coat */
}
function breakIn() {   /* a zombie gets into a building; whoever is inside is forced out to face it */
  const occ = world.buildings.filter((b) => enclosedB(b) && !b.burnt && S.sv.some((q) => insideBuilding(q) === b)), pool = occ.length ? occ : world.buildings.filter((b) => enclosedB(b) && !b.burnt);
  if (!pool.length) return false; const b = pool[Math.floor(rnd() * pool.length)], a = Wd.approachPoint(b);
  ejectFrom(b); spawn(0, 0, rnd() < .3 ? 'runner' : 'walker'); const z = S.z[S.z.length - 1]; z.w = { x: a.x, y: a.y }; z.mode = 'idle'; z.stateTicks = 0; z.siege = false;
  S.alert = Math.max(S.alert, 900); S.incidents = (S.incidents || 0) + 1;
  SFX('alarm'); note('critical', `Zombie inside the ${DEFS[b.type].name}`, { key: 'breakin' + b.x + ',' + b.y, icon: '🧟', log: `A zombie broke into the ${DEFS[b.type].name}! Fighters are on their way.`, at: () => z.w, live: () => z.hp > 0 && S.z.includes(z), threats: true }); return b;
}
function incidentRoll() {   /* hourly, from day 2: about one incident every 2 days */
  if (S.day < 2 || world.buildings.some((b) => b.fire || b.burnt) || rnd() > 1 / 72) return;   /* about one every 3 days, never while a burnt building waits for repair */
  if (rnd() < .5) { const c = world.buildings.filter((b) => enclosedB(b) && !b.burnt); if (c.length) startFire(c[Math.floor(rnd() * c.length)], 30, 'An accident'); }
  else breakIn();
}
/* pets */
const PETS = {
  dog: { name: 'Dog', st: { per: 2, end: 1 }, desc: '+2 PER, +1 END · barks when raiders sneak close · sometimes digs up scrap or food. Loves everyone except raiders.' },
  cat: { name: 'Cat', st: { cha: 2, int: 1 }, desc: '+2 CHA, +1 INT · comfort (+♥ daily) · catches pests (sometimes +food). Tolerates you.' },
};
const PET_NAMES = { dog: ['Rex', 'Biscuit', 'Scout', 'Rusty', 'Bandit', 'Pepper', 'Moose'], cat: ['Miso', 'Tabby', 'Ghost', 'Noodle', 'Socks', 'Ash', 'Pip'] };
const newPet = (kind) => ({ kind, name: PET_NAMES[kind][Math.floor(rnd() * PET_NAMES[kind].length)] });
function givePet(s, i) { const p = (S.pets || [])[i]; if (!p || s.pet) return false; S.pets.splice(i, 1); s.pet = p; setMaxHp(s); /* 3D.262 bug B21 (bug sweep): a pet's Endurance counts toward top health at once, not after a reload */ say(`${p.name} the ${PETS[p.kind].name} now follows ${s.name}.`); return true; }
function takePet(s) { if (!s.pet) return false; (S.pets = S.pets || []).push(s.pet); say(`${s.pet.name} stays in town for now.`); s.pet = null; setMaxHp(s); return true; }
function petTick() {   /* every 30 ticks: dogs bark at sneaking raiders near their owner */
  for (const s of S.sv) { if (!s.pet || s.pet.kind !== 'dog' || s.hp <= 0 || s.mode === 'away') continue;
    for (const z of S.z) if (z.human && z.hp > 0 && z.mode === 'rsneak' && !z.barked && dist(z.w, s.w) < 4.5) { z.barked = true; SFX('woof'); S.alert = Math.max(S.alert, 900); floats.push({ w: { ...s.w }, t: 'WOOF!', col: '#ffe38a', a: 70 }); if ((S.barkT || 0) < tick) { S.barkT = tick + 600; note('routine', `${s.pet.name} is barking — raiders spotted near ${s.name}!`); } } }
}
function petDaily() {
  for (const s of S.sv) { if (!s.pet || s.hp <= 0) continue;
    if (s.pet.kind === 'dog' && dogRole(s) === 'companion') { s.sat = Math.min(100, (s.sat || 0) + 4); moodAdd(s, 4, s.pet.name + ' the dog'); }   /* 3D.104 companion dog */
    if (s.pet.kind === 'dog' && rnd() < (dogRole(s) === 'digger' ? .65 : .35)) { const k = rnd() < .5 ? 'mat' : 'food'; S[k] += 1; floats.push({ w: { ...s.w }, t: `+1 ${SHORT_ICON[k] || '🍖'} (${s.pet.name})`, col: '#9fe58a', a: 80 }); }
    if (s.pet.kind === 'cat') { s.sat = Math.min(100, (s.sat || 0) + 3); moodAdd(s, 3, s.pet.name + ' the cat'); if (rnd() < .3) { S.food += 1; floats.push({ w: { ...s.w }, t: `+1 FOOD (${s.pet.name})`, col: '#9fe58a', a: 80 }); } }
  }
}
const PET_ART = {   /* true pixel art, facing left, one art px = one map px; 2 frames (stand, step) */
  dog: { pal: { k: '#2a1d16', b: '#9a6a3c', l: '#d6aa70', e: '#111111' }, f: [
    ['..kk.........', '.kbbk......k.', 'kebbbk....kbk', 'kbbbbkkkkkkbk', '.kkbbbbbbbbk.', '...kllllllbk.', '...kbk..kbk..', '...kbk..kbk..', '...kk...kk...'],
    ['..kk.........', '.kbbk......k.', 'kebbbk....kbk', 'kbbbbkkkkkkbk', '.kkbbbbbbbbk.', '...kllllllbk.', '..kbk....kbk.', '.kbk......kbk', '.kk........kk']] },
  cat: { pal: { k: '#2a1d16', g: '#7c7c86', h: '#bebec6', y: '#e8d040', n: '#c85a5a' }, f: [
    ['.k.k......k.', 'kgkgk....kgk', 'kygyk....kgk', 'kgngkkkkkgk.', '.kghhhhhggk.', '..khhhhhhgk.', '..kgk..kgk..', '..kgk..kgk..', '..kk...kk...'],
    ['.k.k......k.', 'kgkgk....kgk', 'kygyk....kgk', 'kgngkkkkkgk.', '.kghhhhhggk.', '..khhhhhhgk.', '.kgk....kgk.', 'kgk......kgk', 'kk........kk']] },
};
const petSheets = {};
function petSheet(kind) {
  if (petSheets[kind]) return petSheets[kind]; const a = PET_ART[kind], fw = a.f[0][0].length, fh = a.f[0].length, c = document.createElement('canvas'); c.width = fw * 2; c.height = fh; const g = c.getContext('2d');
  a.f.forEach((fr, i) => fr.forEach((row, y) => [...row].forEach((ch, x) => { if (ch !== '.') { g.fillStyle = a.pal[ch]; g.fillRect(i * fw + x, y, 1, 1); } })));
  c.complete = true; c.naturalWidth = c.width; c.naturalHeight = c.height; return (petSheets[kind] = { c, fw, fh });
}
const PETPOS = new WeakMap();
function petPos(s) {   /* trails a little behind its owner */
  let p = PETPOS.get(s); const tx = s.w.x + .36, ty = s.w.y - .12; if (!p) { p = { w: { x: tx, y: ty } }; PETPOS.set(s, p); }
  const dx = tx - p.w.x, dy = ty - p.w.y, d = Math.hypot(dx, dy); if (d > 3) { p.w.x = tx; p.w.y = ty; } else if (d > .05) { const k = Math.min(1, .06 + d * .05); p.w.x += dx * k; p.w.y += dy * k; }
  p.moving = d > .08; return p;
}
function drawPix(key, img, frame, fw, fh, p, flip, noShadow = false) {   /* same sharp-bilinear path as drawSheet, with a pet-sized shadow */
  const tw = TWs(), sc = tw / APX, want = sc * DPR, m = pxm(want), big = pixelUp(key, img, m), snap = (v) => Math.round(v * DPR) / DPR, w = fw * sc, h = fh * sc, y = snap(p.y - fh * sc);
  if (!noShadow) { ctx.fillStyle = 'rgba(0,0,0,.25)'; ctx.beginPath(); ctx.ellipse(p.x, p.y, w * .45, .05 * tw, 0, 0, 7); ctx.fill(); }
  ctx.imageSmoothingEnabled = want < m - .02; ctx.imageSmoothingQuality = 'high';
  if (flip) { ctx.save(); ctx.translate(snap(p.x), 0); ctx.scale(-1, 1); ctx.drawImage(big, frame * fw * m, 0, fw * m, fh * m, -w / 2, y, w, h); ctx.restore(); }
  else ctx.drawImage(big, frame * fw * m, 0, fw * m, fh * m, snap(p.x - w / 2), y, w, h);
  ctx.imageSmoothingEnabled = true;
}
function drawPet(s, pp) {
  const sh = petSheet(s.pet.kind), fc = facing(pp), f = pp.moving ? Math.floor((tick + s.i * 7) / 8) % 2 : 0;
  drawPix('pet' + s.pet.kind, sh.c, f, sh.fw, sh.fh, project(pp.w.x, pp.w.y), fc.right);
}
/* wandering trader */
const TRADES = [{ give: { food: 6 }, get: { mat: 4 } }, { give: { water: 6 }, get: { mat: 4 } }, { give: { mat: 5 }, get: { food: 6 } }, { give: { mat: 5 }, get: { water: 6 } }, { give: { mat: 8 }, get: { wood: 4 } }];   /* 3D.131 owner: spare scrap buys wood, at a poor rate (scrap piled up to 300-480 with nothing to spend it on) */
const RES_NAME = { food: 'food', water: 'water', mat: 'scrap', wood: 'wood', stone: 'stone', cloth: 'cloth', meds: 'medicine', fuel: 'fuel', ammo: 'ammo' };
function traderDisc() { const c = Math.max(5, ...S.sv.filter((q) => q.hp > 0 && q.mode !== 'away').map((q) => stat(q, 'cha'))); return Math.min(.35, Math.max(0, (c - 5) * .02) + (bOf('tradepost').length ? .15 : 0)); }   /* 3D.104 a Trading Post: better deals */
const priced = (cost) => Object.fromEntries(Object.entries(cost).map(([k, v]) => [k, Math.max(1, Math.ceil(v * (1 - traderDisc())))]));
const costText = (c) => Object.entries(c).map(([k, v]) => (RES_ICON[k] || RES_NAME[k]) + ' ' + v).join('  ');   /* 3D.133 owner: icons, not words */
const canPay = (c) => Object.entries(c).every(([k, v]) => (S[k] || 0) >= v);
/* V3D.22 resources: costs are objects { wood, mat (= scrap), ... } */
const RES_ICON = { food: '🍖', water: '💧', mat: '⚙', wood: '🪵', stone: '🪨', cloth: '🧵', meds: '💊', fuel: '⛽', ammo: '🔸' };
const bCost = (d) => { const c = {}; for (const k of ['wood', 'stone', 'mat', 'cloth', 'meds', 'fuel']) if (d[k]) c[k] = d[k]; return c; };
const payCost = (c) => { for (const [k, v] of Object.entries(c)) S[k] = (S[k] || 0) - v; };
const refundCost = (c, f) => { for (const [k, v] of Object.entries(c)) S[k] = (S[k] || 0) + Math.floor(v * f); };
const costShort = (c) => Object.entries(c).map(([k, v]) => (RES_ICON[k] || '') + ' ' + v).join('  ') || 'free';
const missText = (c) => Object.entries(c).filter(([k, v]) => (S[k] || 0) < v).map(([k, v]) => (RES_ICON[k] || RES_NAME[k]) + ' ' + (v - Math.floor(S[k] || 0))).join('  ');
function traderStock() {
  const gear = Object.keys(ITEMS).filter((id) => id !== 'pipe' && ITEMS[id].cost >= 4), st = [];
  while (st.length < 3 && gear.length) { const id = gear.splice(Math.floor(rnd() * gear.length), 1)[0]; st.push({ k: 'item', id, cost: { mat: Math.ceil(ITEMS[id].cost * 1.1), food: 3 } }); }
  st.push({ k: 'pet', id: rnd() < .5 ? 'dog' : 'cat', cost: { food: 6, water: 6 } }); if (S.day >= 5) { const e = ['molotov', 'pipebomb', 'grenade'][Math.floor(rnd() * (S.lvl >= 7 ? 3 : 2))]; st.push({ k: 'ex', id: e, n: 2, cost: { mat: EX_DEFS[e].price } }); }   /* 3D.104 explosives */ st.push({ k: 'rp', n: 15, cost: { mat: 8 } }); return st;
}
function traderSpot(cx, cy) {   /* V3D.17: an open patch for the stall: walkable, no building, site or approach tile within a tile */
  const clear = (x, y) => { for (let dx = -1; dx <= 1; dx++) for (let dy = -1; dy <= 1; dy++) { if (Wd.buildingAt(world, x + dx, y + dy)) return false; } return Wd.walkable ? Wd.walkable(world, x, y) : true; };
  const taken = new Set(world.buildings.map((b) => { const t = Wd.approachTile(b); return t.x + ',' + t.y; }));
  for (let r = 0; r < 12; r++) for (let dx = -r; dx <= r; dx++) for (let dy = -r; dy <= r; dy++) { if (Math.max(Math.abs(dx), Math.abs(dy)) !== r) continue; const x = cx + dx, y = cy + dy;
    if (Wd.inMap(x, y) && clear(x, y) && !taken.has(x + ',' + y) && !S.sv.some((s) => s.post && s.post.x === x && s.post.y === y)) return { x, y }; }
  return Wd.nearestWalkable(world, cx, cy) || { x: cx, y: cy };
}
const hwyEnd = () => [rnd() < .5 ? 0 : COLS - 1, Wd.HWY_Y + (rnd() < .5 ? 0 : 1)];   /* 3D.101: one end of the north-east highway */
function traderArrive() {
  const a = hwyEnd(), cx = Math.round((Wd.BUILD.x0 + Wd.BUILD.x1) / 2), cy = Math.round((Wd.BUILD.y0 + Wd.BUILD.y1) / 2), g = traderSpot(cx, cy);
  S.trader = { human: true, w: tc(a[0], a[1]), home: tc(a[0], a[1]), goal: tc(g.x, g.y), mode: 'arrive', stock: traderStock(), ex: TRADES.map(() => 0), path: null };
  S.nextTrader = S.day + (bOf('market').length ? 1 : bOf('tradepost').length ? 1 + Math.floor(rnd() * 2) : 3 + Math.floor(rnd() * 2));   /* 3D.113 the Market Square: a trader every day */   /* 3D.104 a Trading Post brings traders twice as often */
  barkSomeone('trader', {}, { pri: 1 }); radio('dj', rLine('trader'), { key: 'trader', level: 'important', act: () => { if (S.trader && S.trader.w) centerOn(S.trader.w.x, S.trader.w.y); } });
}
function traderTick() {
  const T = S.trader; if (!T) return; T.moving = false;
  if (T.mode === 'arrive') { const r = followPath(T, T.goal, WALK * 1.2); T.moving = r === 'moving'; if (r !== 'moving') { T.mode = 'stay'; T.path = null; } }
  else if (T.mode === 'leave') { const r = followPath(T, T.home, WALK * 1.3); T.moving = r === 'moving'; if (r !== 'moving') S.trader = null; }
}
function traderLeave() { if (!S.trader || S.trader.mode === 'leave') return; S.trader.mode = 'leave'; S.trader.path = null; barkSomeone('traderBye', {}, {}); say('The wandering trader is packing up and leaving.'); }
function traderBuy(i) {
  const T = S.trader, o = T && T.stock[i]; if (!o || o.sold) return false; const c = priced(o.cost); if (!canPay(c)) return false;
  for (const [k, v] of Object.entries(c)) S[k] -= v; o.sold = true; SFX('coin');
  if (o.k === 'item') { stashAdd(o.id); say(`Bought a ${ITEMS[o.id].name}. It's in the stash.`); }
  if (o.k === 'pet') { const p = newPet(o.id); (S.pets = S.pets || []).push(p); say(`Adopted ${p.name} the ${PETS[o.id].name}! Tap a survivor → Pet to give it an owner.`); }
  if (o.k === 'rp') { S.rp = (S.rp || 0) + o.n; say(`Bought research notes: +${o.n} RP.`); }
  if (o.k === 'ex') { const got = exAdd(o.id, o.n); say(`Bought ${got} ${EX_DEFS[o.id].name}${got > 1 ? 's' : ''}.`); }
  saveGame(); ui(); return true;
}
function traderTrade(i) {
  const T = S.trader, t = TRADES[i]; if (!T || (T.ex[i] || 0) >= 3) return false; const c = i < 2 ? t.give : priced(t.give); if (!canPay(c)) return false;
  for (const [k, v] of Object.entries(c)) S[k] -= v; for (const [k, v] of Object.entries(t.get)) S[k] += v; T.ex[i] = (T.ex[i] || 0) + 1; saveGame(); ui(); return true;
}
let trTab = 'buy';
function traderPhone() {   /* 3D.369 (W249, W270): the trader like a shop app: Buy / Swap, one line per offer with its price on the button; the details on a tap */
  const T = S.trader, disc = Math.round(traderDisc() * 100), ch = `<i class="phChv">${phG('ch', 14)}</i>`;
  const grp = (x) => `<div class="phCard">${x}</div>`, sec = (t) => `<div class="phSec">${t}</div>`, pr = (c) => Object.entries(c).map(([k, v]) => `<span class="pc">${RES_ICON[k] || ''}${v}</span>`).join(' ');
  const ico = (o) => { if (o.k === 'item' && window.ZHItemIcons && ZHItemIcons.has(o.id)) return ZHItemIcons.svg(o.id, 30); const src = o.k === 'item' && window.ZHItems && ZHItems.icon(o.id); return src ? `<img class="pix" src="${src}" alt="">` : o.k === 'pet' ? (o.id === 'dog' ? '🐕' : '🐈') : o.k === 'rp' ? '📜' : o.k === 'ex' ? EX_DEFS[o.id].icon : '📦'; };
  const name = (o) => o.k === 'item' ? ITEMS[o.id].name : o.k === 'ex' ? `${o.n} ${EX_DEFS[o.id].name}s` : o.k === 'pet' ? PETS[o.id].name : `Research notes`;
  const more = (o) => o.k === 'item' ? itemText(ITEMS[o.id]) + iQuip(o.id) : o.k === 'ex' ? EX_DEFS[o.id].desc : o.k === 'pet' ? PETS[o.id].desc : `+${o.n} research points`;
  const buy = (o, i) => { const c = priced(o.cost), ok = canPay(c);
    return `<div class="phR tall trO${o.sold ? ' sold' : ''}" data-tr="${i}" role="button"><span class="th">${ico(o)}</span><span class="tx"><b>${esc(name(o))}</b>${!o.sold && !ok ? `<small class="bad">Need ${missText(c)}</small>` : ''}<small class="dt">${more(o)}</small></span>`
      + (o.sold ? `<span class="v">Sold</span>` : `<button class="act phMini${ok ? ' go' : ' off'}" data-buy="${i}">${pr(c)}</button>`) + `</div>`; };
  const swap = (t, i) => { const c = i < 2 ? t.give : priced(t.give), left = 3 - (T.ex[i] || 0), ok = left > 0 && canPay(c);
    return `<div class="phR trS"><span class="k">${pr(c)} <i class="ar">→</i> ${pr(t.get)}</span><span class="v">${left ? left + ' left' : 'Done'}</span>${left ? `<button class="act phMini${ok ? ' go' : ' off'}" data-trade="${i}">Swap</button>` : ''}</div>`; };
  let h = `<div class="phSet phTrade"><div class="phSeg">${[['buy', 'Buy'], ['swap', 'Swap']].map(([k, t]) => `<button data-tt="${k}" class="${k === trTab ? 'on' : ''}">${t}</button>`).join('')}</div>`
    + grp(`<div class="phR"><span class="k">Leaves</span><span class="v">19:00</span></div>` + (disc ? `<div class="phR"><span class="k">Your price</span><span class="v good">−${disc}%</span></div>` : ''));
  h += trTab === 'swap' ? sec('Each 3 times a visit') + grp(TRADES.map(swap).join('')) : sec('For sale') + grp(T.stock.map(buy).join(''));
  h += sec('') + grp(`<div class="phR" id="trHow" role="button"><span class="k">How it works</span><span class="v"></span>${ch}</div>`)
    + `<div class="phHow" style="display:none">${grp(`<div class="phPad">The trader stays until 19:00. Your survivor with the best Charisma gets you a discount, and a Trading Post takes 15% more off. Each swap can be done 3 times a visit. What you buy goes to the stash.</div>`)}</div></div>`;
  $('ib').innerHTML = h; showPanel('Trader');
  $('ib').querySelectorAll('[data-tt]').forEach((b) => { b.onclick = () => { trTab = b.dataset.tt; showTrader(); }; });
  $('ib').querySelectorAll('[data-buy]').forEach((x) => { x.onclick = (e) => { e.stopPropagation(); if (traderBuy(+x.dataset.buy)) showTrader(); }; });
  $('ib').querySelectorAll('[data-trade]').forEach((x) => { x.onclick = () => { if (traderTrade(+x.dataset.trade)) showTrader(); }; });
  $('ib').querySelectorAll('.trO').forEach((r) => { r.onclick = () => r.classList.toggle('open'); });
  { const w = $('trHow'), hw = $('ib').querySelector('.phHow'); if (w && hw) w.onclick = () => { const o = hw.style.display === 'none'; hw.style.display = o ? '' : 'none'; if (o) hw.scrollIntoView({ block: 'nearest' }); }; }
}
function showTrader() {
  const T = S.trader; if (!T) return; selected = null; closeP(); if (phoneOn()) return traderPhone(); $('it').textContent = 'WANDERING TRADER'; const disc = Math.round(traderDisc() * 100);
  const tIcon = (o) => { if ((o.k === 'item') && window.ZHItemIcons && ZHItemIcons.has(o.id)) return `<span class="tIco">${ZHItemIcons.svg(o.id, 30)}</span>`; const src = o.k === 'item' && window.ZHItems && ZHItems.icon(o.id); return src ? `<img class="pix tIco" src="${src}" alt="">` : `<span class="tIco">${o.k === 'pet' ? (o.id === 'dog' ? '🐕' : '🐈') : o.k === 'rp' ? '📜' : '📦'}</span>`; };   /* V2.33: item icons in the trader menu */
  const offer = (o) => tIcon(o) + (o.k === 'item' ? `${ITEMS[o.id].name}<small> · ${itemText(ITEMS[o.id])}${iQuip(o.id)}</small>` : o.k === 'ex' ? `${EX_DEFS[o.id].icon} ${o.n} ${EX_DEFS[o.id].name}s<small> · ${EX_DEFS[o.id].desc}</small>` : o.k === 'pet' ? `${PETS[o.id].name}<small> · ${PETS[o.id].desc}</small>` : `Research notes<small> · +${o.n} RP</small>`);
  $('ib').innerHTML = `Leaves at 19:00. Prices ${disc ? `<b>−${disc}%</b> (your best Charisma)` : 'are full price — a survivor with high Charisma gets a discount'}.<br><b>For sale</b><br>`
    + T.stock.map((o, i) => o.sold ? `<div><small>✔ sold: ${o.k === 'item' ? ITEMS[o.id].name : o.k === 'ex' ? EX_DEFS[o.id].name : o.k === 'pet' ? PETS[o.id].name : 'Research notes'}</small></div>` : `<button class="act" data-buy="${i}" ${canPay(priced(o.cost)) ? '' : 'style="opacity:.45"'}>${offer(o)} · ${costText(priced(o.cost))}</button>`).join('')
    + '<br><b>Exchange</b> <small>(3 times each per visit)</small><br>' + TRADES.map((t, i) => { const c = i < 2 ? t.give : priced(t.give); return `<button class="act" data-trade="${i}" ${(T.ex[i] || 0) < 3 && canPay(c) ? '' : 'style="opacity:.45"'}>${costText(c)} → ${costText(t.get)} <small>(${3 - (T.ex[i] || 0)} left)</small></button>`; }).join('');
  showPanel();
  $('ib').querySelectorAll('[data-buy]').forEach((x) => { x.onclick = () => { if (traderBuy(+x.dataset.buy)) showTrader(); }; });
  $('ib').querySelectorAll('[data-trade]').forEach((x) => { x.onclick = () => { if (traderTrade(+x.dataset.trade)) showTrader(); }; });
}
function drawTrader() {
  const T = S.trader, p = project(T.w.x, T.w.y); if (!T.look) T.look = { sex: 'm', skin: 1, hair: 5 }; T.job = 'Trader';
  { const u = hudU(), y = p.y - CHAR_H * TWs() * 1.05; if (T.mode === 'stay') bubble({ x: p.x, y: y - 6 * u }, '🛒'); return; }   /* V3D.17: the 3D renderer draws the trader */
}
function hitTrader(px, py) { const T = S.trader; if (!T) return false; const p = project(T.w.x, T.w.y), d = Math.hypot(px - p.x, py - (p.y - CHAR_H * TWs() * .5)); return d < Math.max(24, .45 * TWs()); }

