/* ---------------- V2.22 bonds: friendships, couples and children (Fallout Shelter style) ---------------- */
const BOND = { acq: 20, friend: 50, close: 80 }, bondDay = new Map();
const bondOf = (a, b) => (a.rel && a.rel[b.id]) || 0;
const bondName = (v) => (v >= BOND.close ? 'Close friend' : v >= BOND.friend ? 'Friend' : v >= BOND.acq ? 'Acquaintance' : 'Stranger');
function addBond(a, b, n) {
  if (!a || !b || a === b) return; a.rel = a.rel || {}; b.rel = b.rel || {}; const pk = Math.min(a.id, b.id) + '-' + Math.max(a.id, b.id), today = bondDay.get(pk) || 0; if (today >= 20) return; bondDay.set(pk, today + n);   /* at most ~20 a day per pair */
  const before = bondOf(a, b), m = n * (hasT(a, 'caring') || hasT(b, 'caring') ? 1.5 : 1) * (gearFx(a, 'aloha') || gearFx(b, 'aloha') ? 1.25 : 1) * (hasT(a, 'loner') || hasT(b, 'loner') ? .5 : 1) * Math.max(.6, (sMod(a, 'cha', .04) + sMod(b, 'cha', .04)) / 2) * ageBondMul(a, b) * Math.max(.25, 1 - before / 150), v = Math.min(100, before + m);   /* each step up is harder */
  a.rel[b.id] = v; b.rel[a.id] = v;
  for (const [k, lvl] of [['friend', BOND.friend], ['close', BOND.close]]) if (before < lvl && v >= lvl) { if (k === 'friend') S.friendsMade = (S.friendsMade || 0) + 1; floats.push({ w: { x: (a.w.x + b.w.x) / 2, y: (a.w.y + b.w.y) / 2 }, t: k === 'close' ? '♥ CLOSE FRIENDS' : '♥ FRIENDS', col: '#ff9ac8', a: 90 }); note('routine', `${a.name} and ${b.name} are now ${k === 'close' ? 'close friends' : 'friends'}.`); }
}
function bondTick() {   /* every 120 ticks: time together builds bonds */
  const L = S.sv.filter((q) => q.hp > 0 && !['down', 'away'].includes(q.mode));
  for (let i = 0; i < L.length; i++) for (let j = i + 1; j < L.length; j++) {
    const a = L[i], b = L[j]; let n = 0;
    if (a.facility && a.facility === b.facility && a.mode === 'useFacility' && b.mode === 'useFacility') n += a.sleeping || b.sleeping ? .3 : 1.6;   /* 3D.63 study: sleeping in the same Camp made everyone best friends overnight; meals, chats and fights matter more now */   /* eating, resting or training together */
    else if (dist(a.w, b.w) < 1.6) n += .5;
    if (a.target && a.target === b.target && ['chase', 'attack', 'recover'].includes(a.mode) && ['chase', 'attack', 'recover'].includes(b.mode)) n += 1.2;   /* fighting side by side */
    if (n) addBond(a, b, n);
  }
}
function friendBoost(s) {   /* damage bonus with a friend fighting within 3 tiles */
  let best = 0; for (const q of S.sv) if (q !== s && q.hp > 0 && ['chase', 'attack', 'recover'].includes(q.mode) && dist(q.w, s.w) < 3) best = Math.max(best, bondOf(s, q));
  return best >= BOND.close ? 1.15 : best >= BOND.friend ? 1.1 : 1;
}
/* V3D.12 Inn and homes: everyone sleeps at the Inn; a House is one long-time resident's own home (they rest faster
   and get happier there). Houses are handed out to the longest-staying residents who have none. */
const okBed = (b) => !b.fire && !b.burnt && facilityUsers(b) < cap(b);
const homeOf = (s) => world.buildings.find((b) => isT(b, 'house') && b.owner === s.id);
/* 3D.30 housing: each Tent / Cabin / Stone House has its own residents (b.res = survivor ids), set by the player. Housing is
   for its residents only. Everyone else sleeps at the Camp, which has room for CAMP_CAP[tier]; past that they sleep rough. */
const CAMP_CAP = { hq: 10, hq2: 14, hq3: 18 };
const isHousing = (b) => !!b && isT(b, 'inn');
const housingOf = (s) => world.buildings.find((b) => isHousing(b) && (b.res || []).includes(s.id));
const campB = () => world.buildings.find((b) => DEFS[b.type] && DEFS[b.type].role === 'hq' && !b.burnt);
const unhoused = () => S.sv.filter((q) => !homeOf(q) && !housingOf(q));
const campCap = () => { const c = campB(); return c ? CAMP_CAP[c.type] || 10 : 0; };
function housingTidy() {   // drop residents who left or died; old saves get their beds filled once
  for (const b of world.buildings) if (isHousing(b)) b.res = (b.res || []).filter((id) => S.sv.some((q) => q.id === id) || (S.trip && S.trip.members.some((m) => m.id === id)) || (S.sh && S.sh.units.some((m) => m.id === id))).slice(0, cap(b));
  S.housingV = 1; fillBeds(null, true);   /* 3D.263 bug B22 (owner, W203): people move into a free bed by themselves, every hour (longest-staying first); the player can still choose who lives where */
}
function fillBeds(only, auto) {   // put unhoused survivors into empty beds (longest-staying first)
  const want = unhoused().filter((q) => q.hp > 0).sort((a, b) => (b.daysHere || 0) - (a.daysHere || 0) || a.id - b.id); let n = 0;
  for (const b of world.buildings) { if (!isHousing(b) || b.burnt || (only && b !== only)) continue; b.res = b.res || []; while (b.res.length < cap(b) && want.length) { const q = want.shift(); b.res.push(q.id); n++; if (auto) logEvent(`${q.name} moved into a free bed in the ${DEFS[b.type].name}.`, 'routine'); } }
  return n;
}
function bedFor(s) {
  const h = homeOf(s); if (h && okBed(h)) return h;
  const hs = housingOf(s); if (hs && !hs.fire && !hs.burnt) return hs;
  const c = campB(); if (c && !c.fire) { const rank = unhoused().filter((q) => q.hp > 0).sort((a, b) => (b.daysHere || 0) - (a.daysHere || 0) || a.id - b.id).indexOf(s); if (rank < campCap() && facilityUsers(c) < campCap()) return c; }
  return null;
}
const RP_STARTER = 20;
function rpStarter() {   /* V3D.13: the first research is a tutorial: the first Workshop comes with starter notes */
  if (S.rpGift || !bOf('workshop').length) return; S.rpGift = true; S.rp = (S.rp || 0) + RP_STARTER; banner('🔬 Starter notes: your first research is ready');   /* 3D.300: 20 (was 15), enough for the cheapest project, and the first costs no scrap */
  const wn = DEFS[bOf('workshop')[0].type].name; radio('dj', `The new ${wn} came with a box of old notes. Your first research project is ready, and the first one costs no scrap.`, { key: 'res1', level: 'important', title: 'First research', more: `Tap the ${wn} → Research and pick a project. Bladesmithing (20 research) unlocks the Machete and Fire Axe to craft; Salvage Methods makes Scrapyards pay more.` });
  logEvent(`The new ${wn} came with a box of old notes: +${RP_STARTER} research points. The first project costs no scrap.`, 'important');
}
function assignHomes() {
  for (const b of world.buildings) if (isT(b, 'house') && b.owner && !S.sv.some((q) => q.id === b.owner)) b.owner = null;
  const free = world.buildings.filter((b) => isT(b, 'house') && !b.owner && !b.burnt); if (!free.length) return;
  const want = S.sv.filter((q) => q.hp > 0 && !homeOf(q) && (q.resident || (q.daysHere || 0) >= 3)).sort((a, b) => (b.resident ? 1 : 0) - (a.resident ? 1 : 0) || (b.daysHere || 0) - (a.daysHere || 0) || a.id - b.id);
  for (const b of free) { const q = want.shift(); if (!q) break; b.owner = q.id; banner(`🏠 ${q.name} has a home now!`, q); logEvent(`${q.name} moved into a House of their own: they rest faster and get happier there.`, 'routine'); }
}
const bedCount = () => 8 + bOf('inn')   /* 3D.238 bug B11: the Camp or Lodge counts as 8 beds (was 4, under the 8 minimum), so every Tent, Cabin and Stone House adds room at once; the first two Tents used to add nothing */.reduce((a, b) => a + (DEFS[b.type].cap || 2), 0) + 2 * bOf('house').length;
const cityL = () => Math.max(0, (S.lvl || 1) - 15);
const rankRoom = () => 8 + 4 * Math.max(0, (S.rank || 1) - 1) + 2 * (S.terr || 0) + 3 * cityL();   /* 3D.113 the City: +3 people a city level */   /* 3D.72: the town's standing limits how many it can take in: 8 at rank 1, +4 a rank, +2 per territory */
const popCap = () => Math.max(8, Math.min(28 + 3 * cityL(), bedCount(), rankRoom()));   /* V3D.23 beds; 3D.72 capped by rank, so growing the town means upgrading it */   /* V3D.23: beds in Tents / Cabins / Stone Houses */   /* V3D.12: an Inn makes room for 4 */
const waitingCouples = () => S.sv.filter((q) => q.partner && q.id < q.partner && !(S.kids || []).some((k) => k.parents.includes(q.id))).length;
const popNow = () => S.sv.length + (S.trip ? S.trip.members.length : 0) + (S.kids || []).length;
const KID_NAMES = ['Ivy', 'Finn', 'Nora', 'Kai', 'Wren', 'Juno', 'Milo', 'Pip', 'Remy', 'Tess', 'Zane', 'Bea', 'Ash', 'Lux', 'Rio', 'Sage', 'Cole', 'Dot', 'Fern', 'Hugo'];
function bondsDaily() {
  S.kids = S.kids || []; bondDay.clear();
  for (const s of S.sv) if (s.rel) for (const id in s.rel) if (+id !== s.partner && s.rel[id] < 90) s.rel[id] = Math.max(0, s.rel[id] - 1);   /* bonds fade a little unless kept up */
  for (const s of S.sv) if (s.rel) { const f = Object.entries(s.rel).filter(([id, v]) => v >= BOND.friend && S.sv.some((q) => q.id === +id)).length; if (f) { s.sat = Math.min(100, (s.sat || 0) + Math.min(3, f * .6)); moodAdd(s, Math.min(3, f * .6), f + ' friend' + (f > 1 ? 's' : '')); } }   /* friends keep spirits up */
  // couples: two single residents who are close friends
  const single = S.sv.filter((q) => q.resident && !q.partner && q.hp > 0 && q.mode !== 'away');
  for (let i = 0; i < single.length; i++) for (let j = i + 1; j < single.length; j++) { const a = single[i], b = single[j]; if (a.partner || b.partner || bondOf(a, b) < BOND.close || rnd() > .2) continue;
    a.partner = b.id; b.partner = a.id; SFX('chime'); showEventPopup({ title: '💑 A NEW COUPLE', text: `${a.name} and ${b.name} have grown close and are now a couple.`, gains: 'They may start a family when the Haven has room (more Houses = more room).' }); }
  // children grow up
  for (const k of [...S.kids]) { k.age = (k.age || 0) + 1; if (k.age >= (bOf('school').length ? 3 : 5)) growUp(k); }   /* 3D.104 a School: children grow up in 3 days */
  // new babies
  for (const a of S.sv) { if (!a.partner || a.id > a.partner) continue; const b = S.sv.find((q) => q.id === a.partner); if (!b) continue;
    if (S.kids.some((k) => k.parents.includes(a.id)) || popNow() >= popCap() || (a.sat || 0) < 40 || (b.sat || 0) < 40 || S.food < 10 || S.water < 10 || rnd() > .45) continue;
    const name = KID_NAMES.find((n) => !S.sv.some((q) => q.name === n) && !S.kids.some((k) => k.name === n)) || 'Kid ' + (S.kids.length + 1);
    barkSomeone('baby', {}, { pri: 2 }); S.born = (S.born || 0) + 1; S.kids.push({ name, age: 0, parents: [a.id, b.id], st: Object.fromEntries(STATS.map((k) => [k, Math.round((((a.st && a.st[k]) || 5) + ((b.st && b.st[k]) || 5)) / 2)])) });
    SFX('reward'); renownGain(5, 'A baby is born'); showEventPopup({ title: '👶 A BABY IS BORN', text: `${a.name} and ${b.name} welcome little ${name}. ${name} will grow up in the Houses and join the Haven in 5 days.`, gains: `Inherits the parents' stats · eats half a ration until grown` });
  }
}
function growUp(k) {
  S.grown = (S.grown || 0) + 1;
  S.kids = S.kids.filter((q) => q !== k); const h = bOf('house')[0], p = h ? Wd.approachPoint(h) : tc(7 + OFF, 10 + OFF);
  const v = mk(k.name, 'Civilian', 1, Math.floor(p.x), Math.floor(p.y), S.sv.length); v.w = { x: p.x, y: p.y };
  for (const s of STATS) v.st[s] = Math.min(STAT_CAP, Math.max(1, (k.st[s] || 5) + (rnd() < .5 ? 1 : 0))); v.max = baseMax(v); v.hp = v.max; v.resident = true; v.sat = 40; v.parents = [...k.parents];
  v.rel = {}; for (const pid of k.parents) { const par = S.sv.find((q) => q.id === pid); if (par) { v.rel[pid] = 90; par.rel = par.rel || {}; par.rel[v.id] = 90; } }
  v.src = 'grown'; v.age = 18; S.sv.push(v); SFX('reward'); showEventPopup({ title: '🧑 ' + k.name.toUpperCase() + ' HAS GROWN UP', text: `${k.name} is ready to help the Haven. Give them a profession from the survivor panel (Job tab).`, gains: 'New resident · Civilian Lv.1 · stats from the parents' + traitTag(v) }); ui();
}
function bondsOnDeath(s) {   /* grief, and the bonds are cleared */
  for (const q of S.sv) { const v = bondOf(q, s), gm = hasT(q, 'caring') ? 1.5 : hasT(q, 'loner') ? .3 : 1; if (q.partner === s.id) { q.partner = null; q.sat = Math.max(0, (q.sat || 0) - 30 * gm); q.why = 'Grieving for ' + s.name; moodAdd(q, -30 * gm, 'grieving for ' + s.name); } else if (v >= BOND.friend) { q.sat = Math.max(0, (q.sat || 0) - (v >= BOND.close ? 20 : 12) * gm); q.why = 'Grieving for ' + s.name; moodAdd(q, -(v >= BOND.close ? 20 : 12) * gm, 'grieving for ' + s.name); } if (q.rel) delete q.rel[s.id]; }
  for (const k of S.kids || []) k.parents = k.parents.filter((id) => id !== s.id);
}
function bondsHtml(u) {
  const rows = Object.entries(u.rel || {}).map(([id, v]) => [S.sv.find((q) => q.id === +id), v]).filter(([q, v]) => q && v >= 5).sort((a, b) => b[1] - a[1]).slice(0, 8);
  const partner = u.partner && S.sv.find((q) => q.id === u.partner), kids = (S.kids || []).filter((k) => k.parents.includes(u.id)), grown = S.sv.filter((q) => (q.parents || []).includes(u.id));
  return (partner ? `💑 Partner: <b>${esc(partner.name)}</b><br>` : '') + (grown.length ? `🧑 Grown-up: <b>${grown.map((q) => esc(q.name)).join(', ')}</b><br>` : '') + (kids.length ? `👶 Child: <b>${kids.map((k) => esc(k.name) + ' (grows up in ' + (5 - k.age) + ' day' + (5 - k.age === 1 ? '' : 's') + ')').join(', ')}</b><br>` : '')
    + '<b>Bonds</b> <small>(time together, eating/training together, fighting side by side; friends fight 10% harder together)</small><br>'
    + (rows.length ? rows.map(([q, v]) => `<div style="display:flex;gap:6px;align-items:center"><span style="width:84px">${esc(q.name)}</span><span style="flex:1">${meter(v)}</span><small style="width:92px;text-align:right">${q.id === u.partner ? '💑 Partner' : (q.parents || []).includes(u.id) ? '👶 Child' : (u.parents || []).includes(q.id) ? 'Parent' : bondName(v)}</small></div>`).join('') : '<small>No bonds yet — give them time together.</small>');
}
/* ---------------- 3D.71 skill study changes ----------------
   1. Progress pays: the horde grows with the day, and a town upgrade brings a newcomer, supplies and healing.
   2. The economy has teeth: hungry or thirsty people work at 70% and hit 20% softer; days with empty stores make people leave.
   3. Newcomers come to well-run towns: spare beds, food and water and a higher rank bring them sooner; a starving town gets none.
   4. Live calls: Send rescue (escorted, into danger) on a down alert, Focus the boss on the boss alert. Left alone, rescues are cautious.
   5. Score counts what skill changes: people kept, people lost, days survived, town rank. */
function rankReward() {
  S.food += 2; S.water += 2; for (const q of S.sv) if (q.hp > 0 && q.mode !== 'down') q.hp = Math.min(q.max, q.hp + Math.round(q.max * .25));
  if (popNow() < popCap()) S.arrivalClock = 1e9;   /* the next visitorArrival() call brings someone */
}
const hungryPen = (s) => (s && (s.hunger > 70 || s.thirst > 70) ? .7 : 1);
function townAppeal() {   /* 0..4: what makes survivors want to come here */
  const days = (k) => S[k] / Math.max(1, S.sv.length);   /* rations in store per person (about one a day) */
  return (days('food') >= 2 ? 1 : 0) + (days('water') >= 2 ? 1 : 0) + Math.min(2, (S.rank - 1) * .5) + (popCap() - popNow() >= 2 ? .5 : 0);
}
function comebackConvoy() {   /* Phase 1 (approved): a town down to its last few people gets one more chance: a small convoy at dawn, at most every 6 days */
  if (S.finale || S.hour !== 8 || !S.sv.length) return; const few = S.sv.length <= 3 || (S.sv.length <= 4 && (S.food < 2 || S.water < 2)) || (S.sv.length <= 6 && S.food < 1 && supplyStats().fNet < 0);   /* 3D.104: no food and few people also brings the convoy */
  if (!few || (S.convoyNext || 0) > S.day) return; S.convoyNext = S.day + 6; S.convoys = (S.convoys || 0) + 1;
  const got = []; for (const j of ['Farmer', rnd() < .5 ? 'Guard' : 'Scavenger']) { const v = newcomer(j, 1); if (v) { v.src = 'convoy'; got.push(`${v.name} (${j})`); } }
  S.food = keepCap(supplyCap(), S.food, 15); S.water = keepCap(supplyCap(), S.water, 15); S.mat += 6;
  showEventPopup({ title: '🚚 A CONVOY FOUND THE HAVEN', text: `A battered truck rolls up at dawn. ${got.length ? got.join(' and ') + ' climb down to stay, and they' : 'They'} unload 15 food, 15 water and some scrap.<br><br>“Heard there were people still holding out here. Don't waste it.”` });
  radio('dj', rLine('convoy'), { key: 'convoy', level: 'important', more: `The convoy brought ${got.length} survivors, 🍖 15, 💧 15 and ⚙ 6.` });
}
function hardshipCheck() {
  if (S.food < 1 || S.water < 1) S.hardship = (S.hardship || 0) + 1; else S.hardship = 0;
  if (S.hardship >= 2 && S.sv.length > 2) { const q = S.sv.filter((v) => !['down', 'hospital', 'away', 'errand'].includes(v.mode)).sort((a, b) => (a.sat || 0) - (b.sat || 0))[0];
    if (q && rnd() < .6) { S.sv = S.sv.filter((v) => v !== q); for (const b of world.buildings) if (b.staff === q) b.staff = null; S.left = (S.left || 0) + 1;
      note('critical', `${q.name} left the Haven`, { icon: '🎒', log: `${q.name} couldn't take another day without ${S.food < 1 ? 'food' : 'water'} and left to find somewhere better.` }); } }
}
function orderEscorts(q) { const zs = S.z.filter((z) => z.hp > 0 && !z.zoo && z.mode !== 'zleave' && dist(z.w, q.w) < 4); if (!zs.length) return [];
  const esc = S.sv.filter((f) => isFighter(f) && canFight(f) && f.hp >= f.max * .6 && !f.rescuing && !f.carrying && !['down', 'hospital', 'away', 'errand', 'chase', 'attack', 'recover'].includes(f.mode)).sort((a, b) => dist(a.w, q.w) - dist(b.w, q.w)).slice(0, 2);
  esc.forEach((f, i) => { engage(f, zs[i % zs.length]); f.why = `Clearing the way to ${q.name}`; }); return esc; }
function orderRescue(q) {   /* the player's call: escorts clear the way and a rescuer goes in even if zombies are close */
  if (!q || q.mode !== 'down') return false;
  const crowd0 = S.z.filter((z) => z.hp > 0 && !z.zoo && z.mode !== 'zleave' && dist(z.w, q.w) < 4).length, esc = orderEscorts(q);
  if (crowd0 && !esc.length) { say(`No fighter is fit to cover a rescue of ${q.name} yet.`); return false; }   /* 3D.75: no cover, no rescue into zombies */ q.ordered = true;
  if (!q.rescuer) assignRescue(); say(q.rescuer ? `${q.rescuer.name} is going for ${q.name}${esc.length ? ', ' + esc.map((f) => f.name).join(' and ') + ' covering' : ''}.` : `Nobody can reach ${q.name} right now.`);
  return !!q.rescuer || esc.length > 0;
}
function focusBoss() { const b = S.z.find((z) => z.type === 'boss' && z.hp > 0); if (!b) return false; let n = 0;
  for (const f of S.sv) if (isFighter(f) && canFight(f) && f.hp >= f.max * .7 && !['down', 'hospital', 'away', 'errand'].includes(f.mode) && !f.rescuing && !f.carrying) { f.focusUntil = tick + 1500; engage(f, b); f.why = 'All together on the boss'; n++; }
  if (n) { S.focusT = tick + 1500; say(`${n} fighter${n > 1 ? 's' : ''} go for the boss together (+30% damage while they focus).`); } return n > 0; }
/* ---------------- 3D.73 played over weeks: the town keeps working while you're away, and daily / weekly goals give a reason to come back ----------------
   Away: every 10 real minutes counts as one game hour of work, up to 8 hours (a full tray). Production goes into the buildings' trays, as if
   the workers kept their shifts; nothing else happens (no hunger, no fights, no days pass). Expeditions already run on real time.
   Goals: three small goals each real day and one bigger goal each real week, with rewards to claim. */
let hiddenAt = 0;
const AWAY_MIN_PER_H = 10, AWAY_MAX_H = 24;   /* 3D.293 (overnight branch; owner, 21 Nov, W175, rule 1 of 13-LONG-GAME: time away pays up to about a day's production; was 8 game hours, a third of a day). 24 game hours fill after 4 real hours away. */
function statAdd(k, n = 1) { S.stat = S.stat || {}; S.stat[k] = (S.stat[k] || 0) + n; }
function awayCredit(ms) {
  if (titleOn || S.finale || !(ms > 0)) return null; lvTick(ms); const built = sitesAway(ms);   /* 3D.305 building carries on while away. 3D.104 a level upgrade keeps going while away; 3D.166 at the away rate, uncapped */ const hours = Math.min(AWAY_MAX_H, Math.floor(ms / 60000 / AWAY_MIN_PER_H)); goalsTick(); const gate = gateAway(hours);
  if (hours < 1) return built ? (note('important', '🌅 WHILE YOU WERE AWAY', { log: `${built === 1 ? 'A building job was' : built + ' building jobs were'} finished while you were away.` }), { hours: 0, got: {}, built }) : null; const got = {};
  for (let h = 0; h < hours; h++) for (const b of world.buildings) {
    const d = DEFS[b.type]; if (!d || b.burnt || b.fire || !d.out) continue; const sh = d.slot ? (b.staff ? Math.max(.5, (b.wh && b.wh.length ? b.wh.reduce((a, v) => a + v, 0) / b.wh.length : .7)) : 0) : 1;
    const pm = prodMult(b, sh >= .5) * (d.slot && !b.staff ? 1 : 1); let res = null, a = 0;
    if (d.fam === 'water') { res = 'water'; a = d.out / 24 * pm * helpMult(b); }
    else if (d.fam === 'scrap') { res = 'mat'; a = d.out / 24 * pm * (researched('salvage') ? 1.25 : 1); }
    else if (d.fam === 'lumber' || d.fam === 'quarry') { res = d.fam === 'lumber' ? 'wood' : 'stone'; a = d.out / 24 * pm; }
    else if (d.fam === 'pallet') { res = 'wood'; a = palletRun(b, d.out / 24 * pm * palletK(b)); }
    else if (d.fam === 'research') { res = 'rp'; a = (b.staff ? d.out : 6) / 24 * pm; }
    else if (d.fam === 'farm') { res = 'food'; a = d.out / 24 * pm * helpMult(b) * seasonFarm(); }
    else if (d.fam === 'greenhouse') { const need = d.waterUse / 24; if ((S.water || 0) >= need) { S.water -= need; res = 'food'; a = d.out / 24 * pm * (b.staff ? 1 : .25) * (powered(b) ? 1.4 : 1); } }
    else if (d.fam === 'pump') { res = 'water'; a = d.out / 24 * pm * (b.staff ? 1 : .25) * (powered(b) ? 1 : PUMP_HAND); }
    if (!res || !(a > 0)) continue; const before = b.bonus || 0; trayAdd(b, res, a); got[res] = (got[res] || 0) + Math.max(0, (b.bonus || 0) - before);
  }
  const ic = { food: '🍖', water: '💧', mat: '⚙', wood: '🪵', stone: '🪨', rp: '🔬' }, parts = Object.entries(got).filter(([, v]) => v >= .5).map(([k, v]) => `${ic[k]} ${Math.round(v)}`);
  const real = ms >= 36e5 ? Math.round(ms / 36e5 * 10) / 10 + ' h' : Math.round(ms / 6e4) + ' min';
  const txt = `You were away ${real}. Your people kept their shifts for ${hours} game hour${hours > 1 ? 's' : ''}` + (parts.length ? `. Waiting in the trays: ${parts.join(' · ')}. Tap the bubbles to collect.` : ', but nothing was staffed to produce.') + (S.trip ? ' The expedition carried on too.' : '') + (gate ? ` ${gate === 1 ? 'Someone is' : gate + ' people are'} waiting at the gate.` : '') + (built ? ` ${built === 1 ? 'A building job was' : built + ' building jobs were'} finished while you were away.` : '');
  note('important', '🌅 WHILE YOU WERE AWAY', { log: txt }); if (parts.length) try { showEventPopup({ title: '🌅 WHILE YOU WERE AWAY', text: txt }); } catch (e) { /* the note is enough */ }
  return { hours, got, built };
}
const dayKey = (t = Date.now()) => { const d = new Date(t); return d.getFullYear() + '-' + (d.getMonth() + 1) + '-' + d.getDate(); };
const weekKey = (t = Date.now()) => { const d = new Date(t); d.setHours(0, 0, 0, 0); d.setDate(d.getDate() - ((d.getDay() + 6) % 7)); return dayKey(d.getTime()); };   /* weeks start on Monday */
const GOALS_DAILY = {
  kills:   { icon: '🧟', name: 'Clear the streets', desc: (n) => `Defeat ${n} zombies`, n: () => 12 + 4 * S.rank, now: () => S.kills || 0, reward: { mat: 6 } },
  trays:   { icon: '🧺', name: 'Bring it in', desc: (n) => `Collect from production bubbles ${n} times`, n: () => 8, now: () => (S.stat || {}).trays || 0, reward: { food: 4, water: 4 } },
  produce: { icon: '🌾', name: 'Stock up', desc: (n) => `Produce ${n} food and water`, n: () => 15 + 5 * S.rank, now: () => S.produced || 0, reward: { mat: 5 } },
  build:   { icon: '🔨', name: 'Raise something', desc: () => 'Finish a building or an upgrade', n: () => 1, now: () => world.buildings.length + world.buildings.reduce((a, b) => a + (DEFS[b.type].tier || 1), 0), reward: { wood: 5, mat: 3 } },
  exped:   { icon: '🧭', name: 'Head out', desc: () => 'Send out an expedition', n: () => 1, now: () => (S.stat || {}).exp || 0, reward: { cloth: 2, meds: .5 } },
  saved:   { icon: '🩹', name: 'Nobody left behind', desc: () => 'Bring someone back from being down', n: () => 1, now: () => (S.stat || {}).saved || 0, reward: { meds: 1 } },
  study:   { icon: '🔬', name: 'Learn something', desc: () => 'Finish a research topic', n: () => 1, now: () => Object.keys(RESEARCH).filter((k) => researched(k)).length, reward: { mat: 6 } },
};
const GOALS_WEEKLY = {
  grow:    { icon: '👥', name: 'A growing Haven', desc: (n) => `Have ${n} people living in the Haven`, n: () => Math.min(28, popNow() + 3), now: () => popNow(), abs: true, reward: { mat: 20, food: 10, water: 10 } },
  rank:    { icon: '🏡', name: 'Moving up', desc: () => 'Raise the Haven one level', n: () => 1, now: () => S.lvl || 1, reward: { mat: 25, wood: 10 } },
  hunter:  { icon: '⚔', name: 'Hold the line', desc: (n) => `Defeat ${n} zombies this week`, n: () => 120 + 20 * S.rank, now: () => S.kills || 0, reward: { mat: 15, meds: 2 } },
  builder: { icon: '🏗', name: 'Town planner', desc: (n) => `Finish ${n} buildings or upgrades`, n: () => 5, now: () => GOALS_DAILY.build.now(), reward: { mat: 15, wood: 15, stone: 8 } },
};
function seededPick(keys, k, seed) { let x = 0; for (const c of seed) x = (x * 31 + c.charCodeAt(0)) >>> 0; const a = keys.slice(), out = []; while (out.length < k && a.length) { x = (x * 1103515245 + 12345) >>> 0; out.push(a.splice(x % a.length, 1)[0]); } return out; }
function makeGoal(set, id) { const g = set[id], n = g.n(); return { id, n, start: g.abs ? 0 : g.now(), done: false, claimed: false }; }
function goalsTick() {
  if (!S.sv || titleOn) return; const dk = dayKey(), wk = weekKey(); S.goals = S.goals || {};
  if (S.goals.day !== dk) { const pool = Object.keys(GOALS_DAILY).filter((k) => !(k === 'exped' && S.sv.length < 4) && !(k === 'study' && !Object.keys(RESEARCH).some((r) => !researched(r)))); S.goals.day = dk; S.goals.daily = seededPick(pool, 3, dk + (S.townName || '')).map((id) => makeGoal(GOALS_DAILY, id)); }
  if (S.goals.week !== wk) { const pool = Object.keys(GOALS_WEEKLY).filter((k) => !(k === 'rank' && !rankConds())); S.goals.week = wk; S.goals.weekly = seededPick(pool, 1, wk + (S.townName || '')).map((id) => makeGoal(GOALS_WEEKLY, id)); }
  for (const [list, set, tag] of [[S.goals.daily, GOALS_DAILY, 'Daily'], [S.goals.weekly, GOALS_WEEKLY, 'Weekly']]) for (const g of list || []) {
    if (g.done) continue; const d = set[g.id]; if (!d) continue; if (d.now() - g.start >= g.n) { g.done = true; SFX('coin');
      note('important', `✔ ${tag} goal: ${d.name}`, { key: 'goal' + tag + g.id, icon: d.icon, log: `${d.desc(g.n)}: done! Claim the reward from the alert or the Goals screen.`, live: () => !g.claimed, acts: [{ label: () => 'Claim ' + rewardText(d.reward), ok: () => !g.claimed, fn: () => claimGoal(g, set) }] }); }
  }
}
const rewardText = (r) => Object.entries(r).map(([k, v]) => ({ mat: '⚙', food: '🍖', water: '💧', wood: '🪵', stone: '🪨', cloth: '🧵', meds: '💊' }[k] || k) + v).join(' ');
function claimGoal(g, set) { if (!g || !g.done || g.claimed) return false; g.claimed = true; const r = set[g.id].reward; for (const [k, v] of Object.entries(r)) { S[k] = (S[k] || 0) + v; if (['food', 'water', 'mat'].includes(k)) flow(k, 'Goal reward', v); } SFX('reward'); say(`Reward: ${rewardText(r)}`); return true; }
function goalProgress(g, set) { const d = set[g.id]; return Math.max(0, Math.min(g.n, d.now() - g.start)); }
function goalsHtml() {
  goalsTick(); const G = S.goals || {}; const row = (g, set) => { const d = set[g.id]; if (!d) return ''; const p = goalProgress(g, set);
    return `<div style="margin:3px 0;opacity:${g.claimed ? .55 : 1}">${g.claimed ? '✔' : d.icon} <b>${d.name}</b> — ${d.desc(g.n)} <span class="sm">${g.done ? '' : Math.floor(p) + '/' + g.n}</span>${g.done && !g.claimed ? ` <button class="act" data-claim="${set === GOALS_DAILY ? 'd' : 'w'}:${g.id}">Claim ${rewardText(d.reward)}</button>` : g.claimed ? ' <span class="sm">claimed</span>' : ` <span class="sm">${rewardText(d.reward)}</span>`}</div>`; };
  const left = () => { const n = new Date(), m = new Date(n); m.setHours(24, 0, 0, 0); const h = Math.floor((m - n) / 36e5), mi = Math.floor((m - n) / 6e4) % 60; return h + 'h ' + mi + 'm'; };
  return `<div class="card"><b>📅 Today</b> <span class="sm">new goals in ${left()}</span>${(G.daily || []).map((g) => row(g, GOALS_DAILY)).join('')}</div><div class="card"><b>🗓 This week</b> <span class="sm">resets Monday</span>${(G.weekly || []).map((g) => row(g, GOALS_WEEKLY)).join('')}</div>`;
}
/* 3D.169 round 2 (four testers): "FOOD: under 1 day left" fired almost every midnight while food was rising. It compared the stock with a day of
   rations right after they were eaten. Now it counts what waits in the trays and what the town makes in a day. */
function shortTomorrow(k, need) { const tray = world.buildings.reduce((a, b) => a + (b.bonusRes === k ? b.bonus || 0 : 0), 0); let prod = 0; try { prod = econ()[k].prod; } catch (e) { prod = 0; } return (S[k] || 0) + tray + prod < need; }
function endOfDay() {            // rations: every survivor eats half food, half water; a shortfall makes them hungry and thirsty (gentle, no damage yet)
  const up = payUpkeep();
  for (const b of world.buildings) if (b.rushes) b.rushes--; petDaily(); exDaily(); kennelDaily(); vehDaily(); crisisDaily(); cityDaily(); allyDaily(); hybDaily(); bondsDaily(); try { legacyCheck(); } catch (e) { /* never block the day */ }
  for (const q of S.sv) if (hasT(q, 'scrounger') && q.hp > 0 && q.mode !== 'down' && rnd() < .5) { S.mat += 1; flow('mat', 'Scrounged (trait)', 1); note('routine', `${q.name} scrounged some scrap.`, { at: q.w, float: '🔍 +1 PART', col: '#9fe0ff' }); }   /* V2.43 */
  if (!S.wk) weekStart(); if (S.day > 1 && (S.day - 1) % 7 === 0) havenReview();
  let nf = 0, nw = 0; for (const q of S.sv) { nf += ration(q) / 2; nw += ration(q) / 2; } for (const k of S.kids || []) { nf += .25; nw += .25; }   /* children eat half a ration */
  const ef = Math.min(S.food, nf), ew = Math.min(S.water, nw); S.food -= ef; S.water -= ew; flow('food', 'Rations', -ef); flow('water', 'Rations', -ew);
  const ff = nf ? ef / nf : 1, fw = nw ? ew / nw : 1; hardshipCheck();
  for (const q of S.sv) { q.hunger = ff < 1 ? Math.min(100, q.hunger + 28 * (1 - ff)) : Math.max(0, q.hunger - 35); q.thirst = fw < 1 ? Math.min(100, q.thirst + 28 * (1 - fw)) : Math.max(0, q.thirst - 35); } /* a full ration relieves the meters; a shortfall raises them */
  const open = world.buildings.filter((b) => DEFS[b.type].slot && !b.staff).map((b) => DEFS[b.type].name);
  const f1 = (n) => (Math.round(n * 10) / 10).toFixed(1);
  note('routine', `Day ${S.day - 1} · Food +${f1(dayLog.foodIn)} −${f1(ef)} · Water +${f1(dayLog.waterIn)} −${f1(ew)} · Upkeep −${f1(up.paid)} scrap${up.unpaid ? ` (${up.unpaid} unpaid)` : ''}` + (open.length ? ` · Open staff slot: ${[...new Set(open)].join(', ')}` : ''));
  dayLog.foodIn = dayLog.waterIn = 0;
  if (ff < 1) note('critical', 'Out of food: rations were short today', { key: 'nofood', icon: '🍖', live: () => S.food < rationNeed().f, dyn: () => `Out of food · ${S.food.toFixed(1)} of ${rationNeed().f.toFixed(1)} needed per day`, acts: [{ label: 'Why?', fn: () => showResource('food') }] }); else if (shortTomorrow('food', nf)) note('important', '⚠ FOOD: under 1 day left');
  if (fw < 1) note('critical', 'Out of water: rations were short today', { key: 'nowater', icon: '💧', live: () => S.water < rationNeed().w, dyn: () => `Out of water · ${S.water.toFixed(1)} of ${rationNeed().w.toFixed(1)} needed per day`, acts: [{ label: 'Why?', fn: () => showResource('water') }] }); else if (shortTomorrow('water', nw)) note('important', '⚠ WATER: under 1 day left');
}
function releasePost(b) { if (b.staff) { if (b.staff.post === b) b.staff.post = null; b.staff = null; } }
function showResidents(b) {   /* 3D.30: choose who lives in this housing */
  const d = DEFS[b.type]; b.res = b.res || []; closeP(); selected = { kind: 'building', ref: b };
  const L = S.sv.slice().sort((x, y) => (b.res.includes(y.id) - b.res.includes(x.id)) || (!!housingOf(x) - !!housingOf(y)) || (y.daysHere || 0) - (x.daysHere || 0));
  $('ib').innerHTML = `<div class="sm" style="margin-bottom:6px">${d.name}: ${b.res.length}/${cap(b)} beds used. Tap to move someone in or out.</div><div class="lst">` + L.map((q) => { const here = b.res.includes(q.id), oh = housingOf(q) || homeOf(q), where = here ? 'Lives here' : oh ? `Lives at the ${DEFS[oh.type].name}` : 'Sleeps at the Camp';
    return `<div class="card row${here ? ' fit' : ''}" data-rs="${q.id}" style="cursor:pointer;gap:8px">${portrait(q)}<div class="sp"><b>${esc(q.name)}</b> <span class="sm">${q.job} Lv.${q.l}</span>${!oh ? '<span class="fitTag" style="background:#FF7A59;color:#fff">No housing</span>' : ''}<div class="sm">${where}</div></div><b>${here ? '✔' : '+'}</b></div>`; }).join('') + `</div><button class="act" id="rsBack" style="width:100%;margin-top:6px">Done</button>`;
  showPanel('WHO LIVES HERE');
  $('ib').querySelectorAll('[data-rs]').forEach((el) => { el.onclick = () => { const id = +el.dataset.rs; if (b.res.includes(id)) b.res = b.res.filter((x) => x !== id); else if (b.res.length < cap(b)) { for (const o of world.buildings) if (isHousing(o) && o.res) o.res = o.res.filter((x) => x !== id); b.res.push(id); } else { say(`${d.name} is full: move someone out first`); return; } saveGame(); showResidents(b); }; });
  $('rsBack').onclick = () => showBuildingInfo(b);
}
function showAssign(b) {   /* V3D.13: pick who works at a building (matching professions first; others work there without the bonus) */
  const d = DEFS[b.type], jobs = STAFF_JOBS[d.fam] || [], can = S.sv.filter((q) => q.hp > 0 && q.mode !== 'away');
  const rank = (q) => (jobs.includes(q.job) ? 2 : q.job === 'Civilian' ? 1 : 0); can.sort((x, y) => (rank(y) - rank(x)) || (y.l - x.l));
  const row = (q) => { const m = jobs.includes(q.job), where = q.post && q.post !== b ? `works at the ${DEFS[q.post.type].name}` : q.post === b ? 'works here now' : 'free';
    return `<div class="card row${m ? ' fit' : ''}" data-as="${q.id}" style="cursor:pointer;gap:8px${m ? '' : ';opacity:.75'}">${portrait(q)}<div class="sp"><b>${esc(q.name)}</b> <span class="sm">${q.job} Lv.${q.l}</span>${m ? '<span class="fitTag">Best fit</span>' : ''}<div class="sm">${m ? '★ +' + Math.round(workBoost(q) * 100) + '% here' : q.job === 'Civilian' ? '+25% here (helping hands)' : '−25% here (wrong job)'} · ${where}</div></div><span style="color:var(--gold)">›</span></div>`; };
  $('ib').innerHTML = `<div class="sm" style="margin-bottom:6px">Who works at the ${d.name}? ${jobs.length ? `${jobs.join(' / ')} get a bonus; a Civilian helps a little; anyone else slows it down.` : ''}</div><div class="lst">${can.map(row).join('')}<div class="card" data-as="none" style="cursor:pointer;text-align:center">Nobody</div></div>`;
  showPanel('Assign worker'); $('pBack').style.display = 'block'; panelBack = () => showBuildingInfo(b);
  $('ib').querySelectorAll('[data-as]').forEach((el) => { el.onclick = () => {
    if (el.dataset.as === 'none') { releasePost(b); b.noStaff = true; b.manual = false; say(`Nobody works at the ${d.name} now.`, true); }
    else { const q = S.sv.find((x) => x.id === +el.dataset.as); if (!q) return; if (q.post && q.post !== b) releasePost(q.post); releasePost(b); b.staff = q; q.post = b; b.manual = true; b.noStaff = false; if (q.mode === 'work') { q.mode = 'free'; q.stateTicks = 0; } say(`${q.name} now works at the ${d.name}.`, true); }
    autoStaff(); saveGame(); showBuildingInfo(b); }; });
}
function autoStaff() {           // one slot per building; a matching profession is assigned automatically, the best level first
  for (const q of S.sv) if (q.post && (!world.buildings.includes(q.post) || q.post.staff !== q)) q.post = null;
  for (const b of world.buildings) {
    const d = DEFS[b.type]; if (!d || !d.slot) continue; if (b.burnt) { releasePost(b); continue; } const jobs = STAFF_JOBS[d.fam] || [];
    if (b.staff && (!S.sv.includes(b.staff) || (!jobs.includes(b.staff.job) && !b.manual && !(b.staff.job === 'Civilian' && !S.sv.some((q) => !q.post && jobs.includes(q.job) && q.hp > 0))))) releasePost(b);   /* a Civilian stands in until a matching worker is free */
    if (b.noStaff) continue;   /* V3D.13: the player chose 'nobody' */
    if (b.staff) continue;
    const c = S.sv.filter((q) => !q.post && q.hp > 0 && !['down', 'hospital'].includes(q.mode) && jobs.includes(q.job)).sort((x, y) => (y.l - x.l) || (dist(x.w, Wd.doorPoint(b)) - dist(y.w, Wd.doorPoint(b))));
    if (c.length) { b.staff = c[0]; c[0].post = b; note('routine', `${c[0].name} will staff the ${d.name}.`); }
    else { const cv = S.sv.filter((q) => !q.post && q.hp > 0 && !['down', 'hospital', 'away'].includes(q.mode) && q.job === 'Civilian').sort((x, y) => dist(x.w, Wd.doorPoint(b)) - dist(y.w, Wd.doorPoint(b)))[0]; if (cv && FAMRES(d.fam)) { b.staff = cv; cv.post = b; note('routine', `${cv.name} lends a hand at the ${d.name}.`); } }   /* 3D.67: Civilians fill gaps (+25%) */
  }
}
function upgradeCheck(b) {   /* V3D.23: an upgrade is a construction job on the building; it keeps working meanwhile */
  const d = DEFS[b.type], n = d.next && DEFS[d.next]; if (!n) return { ok: false, why: 'Already the top tier' };
  if (b.upg) return { ok: false, why: 'Upgrade under way' }; if (b.burnt) return { ok: false, why: 'Repair it first' };
  if (n.role !== 'hq' && n.tier > hqTier()) return { ok: false, why: `Needs the ${hqName(n.tier)} (upgrade your ${DEFS[hqB() ? hqB().type : 'hq'].name})` };
  if (S.rank < (n.rank || 1)) return { ok: false, why: `Needs Haven level ${lvlOfRank(n.rank)}` };
  return { ok: true, why: '' };
}
const hqName = (t) => DEFS[['hq', 'hq', 'hq2', 'hq3'][t] || 'hq3'].name;
const grows = (b, n) => n.w * n.h !== b.w * b.h;   /* 3D.41: the next tier has a bigger (or different) footprint */
function upgradeBuilding(b, place) {
  const c = upgradeCheck(b); if (!c.ok) { say(c.why); return false; }
  const n = DEFS[DEFS[b.type].next];
  if (!place && grows(b, n)) { closeP(); startTool({ kind: 'building', type: n.key, rot: b.rot | 0, upgFrom: b }); updatePreview(b.x, b.y); say(`The ${n.name} is ${n.w}×${n.h}: place it (turn it with ↻), then Build.`, true); return false; }
  b.upg = newJob({ to: n.key, place: place || null }, bCost(n)); SFX('build');
  say(`${DEFS[b.type].name} → ${n.name}: ` + (canPay(bCost(n)) ? 'builders are bringing the materials.' : `still missing ${missText(bCost(n))}; survivors will gather it.`), true); saveGame(); ui(); return true;
}
function cancelUpgrade(b) { const u = b.upg; if (!u) return; for (const [k, v] of Object.entries(u.got || {})) S[k] = (S[k] || 0) + v; b.upg = null; say('Upgrade cancelled: delivered materials went back to the stockpile.'); ui(); saveGame(); }
function queueResidentRequest(s) { S.requests.push({ type: 'resident', s }); showNextRequest(); }
function showNextRequest() {
  const box = $('requestBox'); if (!box || box.innerHTML || !S.requests.length) return; const q = S.requests[0], s = q.s;
  box.innerHTML = `<div class="request frame"><b class="out">🏠 Wants to stay for good</b><br>${esc(s.name)} (${s.job}, here ${Math.max(1, Math.round(s.daysHere || 1))} day${Math.round(s.daysHere || 1) > 1 ? 's' : ''}) wants to become a resident. <span style="color:#ff9ab0">♥${Math.floor(s.sat)}</span><br><button class="act go out" id="acceptReq">Accept</button><button class="act out" id="declineReq">Not yet</button></div>`;
  $('acceptReq').onclick = () => { s.resident = true; renownGain(4, 'New resident'); say(s.name + ' became a resident!', true); S.requests.shift(); box.innerHTML = ''; showNextRequest(); ui(); };
  $('declineReq').onclick = () => { s.requested = false; s.sat = Math.max(20, s.sat - 5); S.requests.shift(); box.innerHTML = ''; showNextRequest(); ui(); };
}
const ARRIVE = { low: 8000, high: 14000 };   /* 3D.72: growth is the goal, and the rank limit keeps the town from filling too fast */    /* V3D.21 ticks between newcomers at the gate (1000 ticks = 1 game hour): every 12 h below 60% of the room, every 24 h above (was 1.1 h / 2.2 h: the town filled in 2 days) */
/* 3D.297 (overnight branch; owner, 21 Nov, W183, first-30-minute fix 3: the sixth person arrives in time for level 2). Level 2 needs 6 people
   and the camp starts with 4; at one newcomer every ~8 game hours the sixth came anywhere from game day 1 to 4. While the town has fewer
   than FIRST_SIX people, newcomers come EARLY_ARRIVE times as often (about every 2 game hours, half a minute of open play). */
const FIRST_SIX = 6, EARLY_ARRIVE = 4;
const arriveGap = () => (popNow() < popCap() * .6 ? ARRIVE.low : ARRIVE.high) / (1 + .25 * townAppeal()) / (anyPowered('radio') ? 1.3 : 1) / (ST().arrive && S.day <= 7 ? ST().arrive : 1) / (popNow() < FIRST_SIX ? EARLY_ARRIVE : 1);   /* ticks between newcomers */
/* 3D.294 (overnight branch; owner, 21 Nov, W175, rule 1 of 13-LONG-GAME: newcomers keep coming while the player is away and wait at the gate,
   a few at most). Before, the gate clock only ran with the game open, so a daily player met almost nobody new. awayCredit now runs the gate
   clock for the time away (up to a day, as production) and puts whoever would have come in a queue at the gate, at most GATE_MAX, as long as
   there are beds; back in the game they walk in one after another, each with the usual card. */
const GATE_MAX = 3;
function gateAway(gameHours) { if (S.finale) return 0; const room = popCap() - popNow() - waitingCouples(); if (room <= 0) return 0;
  const ticks = (S.arrivalClock || 0) + gameHours * 1000, gap = arriveGap(), n = Math.min(GATE_MAX - (S.gateWait || 0), room, Math.floor(ticks / gap)); if (n <= 0) { S.arrivalClock = Math.min(ticks, gap - 1); return 0; }
  S.gateWait = (S.gateWait || 0) + n; S.arrivalClock = ticks - n * gap; return n; }
function visitorArrival() {
  if (S.finale || guest) return;   /* V2.46: nobody travels during the final stand */ S.arrivalClock++; if (S.food < 1 || S.water < 1) return; if (((window.ZH_BAL || {}).gateWait ?? 1) && S.z.some((z) => z.hp > 0 && !z.human && Wd.inTown(Math.floor(z.w.x), Math.floor(z.w.y)))) return;   /* spiral fix: newcomers wait outside while zombies are in the town */   /* 3D.71: nobody moves to a starving town */ if ((S.arrivalClock < arriveGap() && !(S.gateWait > 0)) || popNow() >= popCap() - waitingCouples()) return; if (S.gateWait > 0) S.gateWait--;   /* leave room for couples to start a family */ 
  const names = ['Noah', 'Maya', 'Eli', 'June', 'Rosa', 'Theo'], jobs = ['Civilian', 'Scavenger', 'Guard', 'Medic', 'Farmer', 'Engineer', 'Cook', ...(hqTier() >= 2 ? ['Mechanic'] : [])];
  const name = freeFirst(names), job = jobs[Math.floor(rnd() * jobs.length)], lv = Math.max(1, Math.min(6, S.rank - 1 + Math.floor(rnd() * 2)));   /* V2.18: newcomers to a bigger Haven are more experienced */
  /* 3D.134 owner: you see them come. They walk in off the highway to the edge of town, stop and wave (the real wave clip, on the real map),
     and only then does the card ask. Until the player decides they are a guest: not in the town list, not saved, and zombies ignore them. */
  const a = hwyEnd(), hq = world.buildings.find((b) => b.type === 'hq'), g = traderSpot(hq ? hq.x + 1 : 7 + OFF, hq ? hq.y - 2 : 6 + OFF), v = mk(name, job, lv, a[0], a[1], S.sv.length);
  v.sat = 3; v.src = 'gate'; v.w = tc(a[0], a[1]); v.pv = { ...v.w }; v.home = tc(a[0], a[1]); v.goal = tc(g.x, g.y); v.mode = 'arrive'; v.path = null; v.guest = true; guest = v;
  { const P = Wd.findPath(world, tileOf(v.w), { x: g.x, y: g.y }, false, 0); if (P && P.length > 21) { v.w = tc(P[P.length - 21].x, P[P.length - 21].y); v.pv = { ...v.w }; } }   /* 3D.158 owner (Noah sliding): the newcomer walks at an ordinary pace now, so he starts on the highway about 20 tiles out (about half a minute) instead of jogging in from the map's edge */
  v.quirk = newcomerQuirk(v);
  radio('dj', rLine('guest'), { key: 'guest', act: () => { if (guest && guest.w) centerOn(guest.w.x, guest.w.y); } });
}
/* 3D.160 the UX study: every newcomer has one thing you remember them by (a fact, sometimes a name you know) */
function newcomerQuirk(v) {
  const other = S.sv.length ? S.sv[Math.floor(rnd() * S.sv.length)].name : null;
  const L = ['Afraid of the dark', 'Hums while working', 'Ex mail carrier: knows every road', 'Cannot cook, will not stop trying', 'Talks to the chickens', 'Collects bottle caps', 'Sleeps with boots on', 'Tells terrible jokes', 'Writes everything down', 'Up before dawn, every day'];
  if (other) L.push(`Knows ${other} from before`, `Owes ${other} a sandwich`);
  return L[Math.floor(rnd() * L.length)];
}
const HELP_FOOD = 3;
function guestAsk(v) {
  const name = v.name, job = v.job, lv = v.l; centerOn(v.w.x, v.w.y, Math.max(cam.z, 1.5));
  showEventPopup({ live: v, short: `${fullName(v)} wants in`, chips: [job + ' Lv.' + lv].concat(TRAITS[v.trait] ? [TRAITS[v.trait].icon + ' ' + TRAITS[v.trait].name] : [], v.quirk ? ['💬 ' + v.quirk] : []), title: 'NEWCOMER',
    buttons: [{ label: 'Welcome', fn: () => { guest = null; S.arrivalClock = 0; v.guest = false; v.mode = 'free'; v.stateTicks = 80; v.faceW = null; v.i = S.sv.length; S.sv.push(v); say(name + ' joined the Haven!', true); if (!bark(v, 'newcomer', {}, { pri: 2 })) emote(v, '😊', 120, true); barkSomeone('welcome', { other: name }, { pri: 2 }, v.w, v); logEvent(`${name} (${job} Lv.${lv}) joined the Haven.${v.quirk ? ' ' + v.quirk + '.' : ''}`, 'important'); ui(); } },
      { label: `Give food (${HELP_FOOD} 🍖)`, disabled: S.food < HELP_FOOD, fn: () => { S.arrivalClock = 0; S.food -= HELP_FOOD; v.mode = 'leave'; v.path = null; v.faceW = null; emote(v, '😊', 120, true); renownGain(2, 'helped ' + name); logEvent(`${name} got food for the road and walked on, grateful. +2 Renown.`, 'routine'); say(name + ' waves thanks and walks on.', true); ui(); } },   /* 3D.160 the UX study: saying no does not have to be cruel */
      { label: 'Turn away', fn: () => { S.arrivalClock = 0; v.mode = 'leave'; v.path = null; v.faceW = null; logEvent(`${name} was turned away at the gate.`, 'routine'); say(name + ' walks off.', true); ui(); } }] });
}
function guestTick() {
  const v = guest; if (!v) return; v.pv = { x: v.w.x, y: v.w.y }; v.moving = false; if (v.bark && --v.bark.f <= 0) v.bark = null;
  if (v.mode === 'arrive') { const r = followPath(v, v.goal, WALK);   /* 3D.158 owner's log (Noah sliding): 1.5x walking pace was a jog the legs could not keep up with (85%), so he slid all the way in */
    v.moving = r === 'moving'; if (r !== 'moving') { v.mode = 'greet'; v.path = null; v.faceW = { x: v.w.x + 1, y: v.w.y + 1.4 }; guestAsk(v); } }
  else if (v.mode === 'leave') { const r = followPath(v, v.home, WALK); v.moving = r === 'moving'; if (r !== 'moving') guest = null; }
}
