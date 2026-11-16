/* ---------------- V3D.25 loot rarity, the crate-style loot reveal, and the Stash ---------------- */
const RARITY = { common: { n: 'Common', c: '#c9b8a4', o: 0 }, uncommon: { n: 'Uncommon', c: '#7cc95a', o: 1 }, rare: { n: 'Rare', c: '#5aa8f0', o: 2 }, epic: { n: 'Epic', c: '#b072f0', o: 3 } };
const RES_RAR = { food: 'common', water: 'common', wood: 'common', stone: 'common', mat: 'common', cloth: 'uncommon', meds: 'rare', fuel: 'rare', ammo: 'uncommon' };
const itemRar = (id) => { const c = (ITEMS[id] && ITEMS[id].cost) || 1; return c >= 13 ? 'epic' : c >= 9 ? 'rare' : c >= 5 ? 'uncommon' : 'common'; };
function lootEntries(loot, items) {   // resources + items, rarest last so the reveal builds up
  const e = Object.entries(loot || {}).filter(([, v]) => v > 0).map(([k, v]) => ({ icon: RES_ICON[k] || '•', name: RES_TITLE[k] || k, n: Math.round(v), rar: RES_RAR[k] || 'common' }));
  for (const id of items || []) if (ITEMS[id]) e.push({ item: id, name: ITEMS[id].name, n: 1, rar: itemRar(id) });
  return e.sort((a, b) => RARITY[a.rar].o - RARITY[b.rar].o);
}
function addLoot(loot, why) {   // into the stockpile, within caps
  for (const [k, v] of Object.entries(loot || {})) { if (!v) continue; const cap = k === 'food' || k === 'water' ? supplyCap() : resCap(k); const got = Math.max(0, Math.min(v, cap - (S[k] || 0))); S[k] = (S[k] || 0) + got; if (ECO.cur && ECO.cur[k]) flow(k, why, got); }
}
let revealCss = false;
function lootReveal(o) {   // { title, sub, entries, note, best }: cards flip in one at a time; rare ones shine
  if (!revealCss) { revealCss = true; const st = document.createElement('style'); st.textContent = `
#lootRev{position:fixed;inset:0;z-index:60;display:flex;align-items:center;justify-content:center;background:rgba(30,20,12,.55);animation:lrFade .25s}
#lootRev .lrBox{width:min(92vw,420px);max-height:86vh;overflow:auto;background:#fff8ec;border:3px solid #5a3f31;border-radius:22px;padding:14px 14px 12px;box-shadow:0 8px 0 rgba(0,0,0,.25);text-align:center;font-family:Fredoka,Nunito,sans-serif;color:#5a3f31}
#lootRev h3{margin:2px 0 0;font-family:'Lilita One',Fredoka,sans-serif;font-size:24px;letter-spacing:.5px}
#lootRev .lrSub{font-size:13px;opacity:.75;margin-bottom:8px}
#lootRev .lrGrid{display:grid;grid-template-columns:repeat(3,1fr);gap:8px;perspective:600px}
#lootRev .lrCard{position:relative;border:3px solid var(--rc);border-radius:14px;background:#fff;padding:8px 4px 6px;opacity:0;transform:rotateY(90deg) scale(.6);animation:lrFlip .45s cubic-bezier(.2,1.5,.4,1) forwards;overflow:hidden;box-shadow:0 0 0 0 var(--rc)}
#lootRev .lrCard .ic{font-size:30px;line-height:38px;height:40px;display:flex;align-items:center;justify-content:center}
#lootRev .lrCard .nm{font-size:12px;font-weight:600;line-height:1.1;min-height:26px}
#lootRev .lrCard .n{font-size:18px;font-weight:700}
#lootRev .lrCard .rr{font-size:10px;font-weight:700;color:var(--rc);text-transform:uppercase;letter-spacing:.6px}
#lootRev .lrCard.r2,#lootRev .lrCard.r3{animation:lrFlip .5s cubic-bezier(.2,1.5,.4,1) forwards,lrGlow 1.6s ease-in-out infinite alternate}
#lootRev .lrCard.r2::after,#lootRev .lrCard.r3::after{content:'';position:absolute;top:-30%;left:-60%;width:40%;height:160%;background:linear-gradient(90deg,transparent,rgba(255,255,255,.85),transparent);transform:rotate(18deg);animation:lrShine 2.2s ease-in-out infinite;animation-delay:inherit}
#lootRev .lrNote{text-align:left;font-size:12.5px;margin:10px 2px 6px;max-height:120px;overflow:auto;opacity:.85}
#lootRev button{margin-top:8px;font:inherit;font-size:18px;font-weight:700;padding:8px 28px;border-radius:99px;border:3px solid #5a3f31;background:#8fc46a;color:#fff;box-shadow:0 4px 0 #5a3f31}
@keyframes lrFlip{to{opacity:1;transform:none}}
@keyframes lrGlow{from{box-shadow:0 0 0 0 var(--rc)}to{box-shadow:0 0 14px 3px var(--rc)}}
@keyframes lrShine{0%{left:-60%}60%,100%{left:130%}}
@keyframes lrFade{from{opacity:0}}`; document.head.appendChild(st); }
  const old = document.getElementById('lootRev'); if (old) old.remove();
  const el = document.createElement('div'); el.id = 'lootRev'; const E = o.entries || [], step = Math.max(.12, Math.min(.32, 2.4 / Math.max(1, E.length)));
  const best = E.reduce((a, e) => Math.max(a, RARITY[e.rar].o), 0);
  el.innerHTML = `<div class="lrBox"><h3>${esc(o.title || 'LOOT')}</h3><div class="lrSub">${o.sub || ''}${E.length ? ` · best find: <b style="color:${Object.values(RARITY)[best].c}">${Object.values(RARITY)[best].n}</b>` : ''}</div>`
    + (E.length ? `<div class="lrGrid">${E.map((e, i) => `<div class="lrCard r${RARITY[e.rar].o}" style="--rc:${RARITY[e.rar].c};animation-delay:${(i * step).toFixed(2)}s${RARITY[e.rar].o >= 2 ? `,${(i * step).toFixed(2)}s` : ''}"><div class="ic">${e.item ? itemIcon(e.item) : e.icon}</div><div class="n">${e.item ? '' : '+' + e.n}</div><div class="nm">${esc(e.name)}</div><div class="rr">${RARITY[e.rar].n}</div></div>`).join('')}</div>` : '<div class="lrSub">Nothing found this time.</div>')
    + (o.note ? `<div class="lrNote">${o.note}</div>` : '') + `<button id="lrOk">Collect</button></div>`;
  document.body.appendChild(el); if (window.ZHIcons) ZHIcons.swap(el);
  E.forEach((e, i) => setTimeout(() => SFX(RARITY[e.rar].o >= 2 ? 'chime' : 'coin'), (i * step + .2) * 1000));
  el.querySelector('#lrOk').onclick = () => { el.remove(); SFX('reward'); if (o.onClose) o.onClose(); };
}
function showStash() {   /* every resource, how much room there is, and where more comes from */
  endBuildMode(true); closeP(); $('it').textContent = 'STASH';
  const WHERE = { food: 'Garden Plots, farms; Abandoned Houses trips', water: 'Rain Barrels and Collectors, wells', wood: 'chopping trees, a Lumber Camp; Lumber Yard trips', stone: 'breaking rocks, a Quarry; Old Quarry trips',
    mat: 'salvaging wrecks, the Scrapyard, zombie bags; Warehouse trips', cloth: 'clothes bins past the walls; Abandoned Houses trips; some zombies', meds: 'Pharmacy trips, bloated and spitter zombies, supply drops', fuel: 'Gas Station trips, siphoning wrecks, raiders, supply drops' };
  const row = (k) => { const cap = k === 'food' || k === 'water' ? supplyCap() : k === 'mat' ? 0 : resCap(k), v = Math.floor(S[k] || 0); return `<div class="card" style="padding:7px 10px"><div class="row" style="gap:8px"><span style="font-size:22px">${RES_ICON[k]}</span><span class="sp"><b>${RES_TITLE[k]}</b> <small style="color:${RARITY[RES_RAR[k]].c};font-weight:700">${RARITY[RES_RAR[k]].n}</small><br><small>${WHERE[k]}</small></span><b>${v}${cap ? ' / ' + cap : ''}</b></div></div>`; };
  const inv = Object.entries(S.inv || {}).filter(([id, n]) => n > 0 && ITEMS[id]);
  $('ib').innerHTML = `<div class="sm" style="margin-bottom:6px">Storage buildings (Supply Crates → Storehouse → Warehouse) hold more of everything.</div>` + ['food', 'water', 'wood', 'stone', 'mat', 'cloth', 'meds', 'fuel'].map(row).join('')
    + `<div class="card"><b>Gear in the stash</b>${inv.length ? inv.map(([id, n]) => `<div class="row" style="gap:6px"><span class="sp">${esc(ITEMS[id].name)}${n > 1 ? ' ×' + n : ''}</span><small style="color:${RARITY[itemRar(id)].c};font-weight:700">${RARITY[itemRar(id)].n}</small></div>`).join('') : '<div class="sm">Nothing spare.</div>'}</div>`;
  showPanel('Stash');
}
/* ---------------- expeditions (V2.8): a squad leaves the map for a timed trip in real time ---------------- */
// Trips run on the real clock (Date.now), so they keep going while the game is closed; the town itself pauses while closed.
const EXP_DEFS = {
  houses:    { name: 'Abandoned Houses',   icon: '🏚️', desc: 'Food, water and cloth. Somebody\'s pantry, somebody\'s sock drawer.',          risks: ['low'],             lock: () => '', loot: { food: [1, 2], water: [1, 2], cloth: [1, 2] }, lines: ['The squad searches a row of empty houses.', 'They check cellars and cupboards.', 'A quiet street, a few useful cans.'] },
  pharmacy:  { name: 'Pharmacy and Clinic', icon: '🏥', desc: 'Medicine, a little scrap, sometimes survivors. The pills are out of date, and so is the pharmacist.', risks: ['low', 'medium'], lock: () => (world.walls.size ? '' : 'Build a wall first'), loot: { meds: [1, 2], mat: [1, 2] }, recruit: { low: .3, medium: .55 }, lines: ['The squad forces the pharmacy shutters.', 'Shelves are mostly bare, but the back room is intact.', 'They hear someone calling from the clinic.'] },
  lumberyard: { name: 'Lumber Yard', icon: '🪵', desc: 'Wood, and lots of it. That\'s the whole place.', risks: ['low', 'medium'], lock: () => '', loot: { wood: [3, 5] }, lines: ['The squad pries open the yard gate.', 'They load cut planks and logs onto a cart.', 'A sawmill shed still holds dry timber.'] },   /* V3D.23 */
  gasstation: { name: 'Gas Station', icon: '⛽', desc: 'Fuel, and scrap from the garage. Hot dogs from before the end, fuel in the tanks.', risks: ['medium', 'high'], lock: () => (hqTier() >= 2 ? '' : 'Needs the Lodge'), loot: { fuel: [2, 4], mat: [1, 2] }   /* 3D.131 owner: more fuel (was 1-3): towns owned a Pickup and a Van and could rarely afford a trip */, lines: ['The squad rigs a hand pump over the tank hatch.', 'Jerrycans fill slowly; the noise carries.', 'The garage still has tools on the wall.'] },   /* V3D.25 */
  military: { name: 'Military Checkpoint', icon: '🪖', desc: 'Dangerous, but a bit of everything and good gear. Left in a hurry, with all the good stuff.', risks: ['high'], lock: () => (S.rank >= 3 ? '' : 'Needs Haven level 7'), loot: { mat: [2, 4], meds: [1, 2], fuel: [1, 2], cloth: [1, 2], ammo: [6, 10] }, gear: 2.5, lines: ['Sandbags and an overturned truck block the road.', 'The squad works through the supply tents one by one.', 'A radio crackles in an empty guard hut.'] },
  quarrysite: { name: 'Old Quarry', icon: '🪨', desc: 'Stone for the stone tier. Rocks, pre-cut.', risks: ['medium', 'high'], lock: () => (hqTier() >= 2 ? '' : 'Needs the Lodge'), loot: { stone: [3, 5] }, lines: ['The squad climbs down into the old quarry.', 'They lever cut blocks onto a sled.', 'Something moves in the flooded pit below.'] },
  clinic:   { name: 'The Overrun Clinic', icon: '🏚', desc: 'A stronghold packed with the dead: clear it and raise a Banner over the Haven. Visiting hours are over.', risks: ['high'], lock: () => ((S.lvl || 1) >= 3 ? '' : 'Needs Haven level 3'),   /* 3D.128 was 4: the first stronghold comes early */ loot: { meds: [2, 3], mat: [2, 3], cloth: [1, 2] }, gear: 2, stronghold: true, lines: ['The squad breaks into the clinic lobby. Dozens of shapes turn.', 'Ward by ward, they clear the ground floor.', 'In the operating theatre, something huge is waiting.'] },   /* 3D.104 first pass of the strongholds: a hard expedition that earns the Stronghold Banner */
  mall:     { name: 'Shopping Mall', icon: '🛒', desc: 'Cloth, food, scrap and the odd piece of gear. Noisy. Everything must go, including you.', risks: ['medium', 'high'], lock: () => ((S.lvl || 1) >= 6 ? '' : 'Needs Haven level 6'), loot: { cloth: [2, 4], food: [2, 4], mat: [2, 3] }, gear: 1.5, lines: ['The squad slips in through the loading bay.', 'Shop after shop: some picked clean, some untouched.', 'The food court is full of the dead.'] },   /* 3D.104 */
  prison:   { name: 'Blackgate Prison', icon: '⛓', desc: 'A stronghold: clear the yard and raise a Banner. Life sentences, and then some.', risks: ['high'], lock: () => ((S.lvl || 1) >= 9 ? '' : 'Needs Haven level 9'), loot: { mat: [3, 5], ammo: [8, 14], cloth: [1, 2] }, gear: 3, stronghold: true, lines: ['The squad cuts through the outer fence.', 'Cell block by cell block, the doors grind open.', 'In the yard, the warden waits, still in uniform.'] },   /* 3D.104 a second stronghold */
  /* 3D.111 Endgame C: seasonal strongholds, from Haven level 15. One per season (7 days), cleared once per season. */
  sh_spring: { name: 'The Drowned Greenhouse', icon: '🌱', desc: 'A seasonal stronghold, spring only. The plants are thriving. Nobody else is.', risks: ['high'], lock: () => seasonLock('spring'), loot: { food: [3, 5], meds: [2, 3], cloth: [2, 3] }, gear: 3, stronghold: true, lines: ['The squad wades in.'] },
  sh_summer: { name: 'The Burning Refinery', icon: '☀️', desc: 'A seasonal stronghold, summer only. On fire for years and still not bored of it.', risks: ['high'], lock: () => seasonLock('summer'), loot: { fuel: [3, 5], mat: [3, 5], ammo: [8, 12] }, gear: 3, stronghold: true, lines: ['Heat shimmers over the tanks.'] },
  sh_autumn: { name: 'The Harvest Fair', icon: '🍂', desc: 'A seasonal stronghold, autumn only. The rides are closed. The visitors are not.', risks: ['high'], lock: () => seasonLock('autumn'), loot: { food: [4, 6], cloth: [2, 4], wood: [4, 6] }, gear: 3, stronghold: true, lines: ['Rides creak in the wind.'] },
  sh_winter: { name: 'The Frozen Depot', icon: '❄️', desc: 'A seasonal stronghold, winter only. Army surplus, frozen fresh.', risks: ['high'], lock: () => seasonLock('winter'), loot: { mat: [4, 6], stone: [3, 5], ammo: [10, 14] }, gear: 3.5, stronghold: true, lines: ['Snow drifts against the hangar doors.'] },
  raid_toll: { name: "Raid: the Toll Kings' fort", icon: '👑', desc: 'A truck-yard fort on the highway: break what you like, carry what you can, out through the gate. Pay the toll? No.', risks: ['high'], lock: () => { const f = (S.fac || {}).toll; return !f || !f.met ? 'Meet the Toll Kings first' : f.goneUntil > S.day ? `They are scattered until day ${f.goneUntil}` : f.raidUntil > S.day ? `On high alert after the last raid: wait until day ${f.raidUntil}` : ''; }, loot: { mat: [4, 6], fuel: [1, 3], ammo: [6, 10] }, gear: 2, stronghold: true, raid: true, lines: ['The squad creeps up on the fort.'] },
  raid_foundry: { name: 'Raid: the Foundry yard', icon: '🏭', desc: 'Steel, fuel, and the hardest camp on the map. They forged their own armour and their own rules.', risks: ['high'], lock: () => { const f = (S.fac || {}).foundry; return !f || !f.met ? 'Meet the Foundry first' : f.ally ? 'They are your sister town' : f.goneUntil > S.day ? `They are scattered until day ${f.goneUntil}` : f.raidUntil > S.day ? `On high alert after the last raid: wait until day ${f.raidUntil}` : ''; }, loot: { mat: [6, 9], fuel: [2, 4], stone: [3, 5] }, gear: 2, stronghold: true, raid: true, lines: ['The squad follows the smoke to the Foundry.'] },
  raid_quar: { name: 'Raid: Checkpoint Bravo', icon: '🪖', desc: 'Sandbags, rifles and the best armoury for miles. They shoot first and do the paperwork later.', risks: ['high'], lock: () => { const f = (S.fac || {}).quar; return !f || !f.met ? 'Meet Quarantine Command first' : f.ally ? 'They are your allies' : f.goneUntil > S.day ? `They are scattered until day ${f.goneUntil}` : f.raidUntil > S.day ? `On high alert after the last raid: wait until day ${f.raidUntil}` : ''; }, loot: { ammo: [10, 16], meds: [2, 4], fuel: [2, 3] }, gear: 2, stronghold: true, raid: true, lines: ['The squad crawls up on the checkpoint.'] },
  raid_helix: { name: 'Raid: the Helix field lab', icon: '🧬', desc: 'White tents, cages, and anyone Helix has taken. Science, minus the ethics.', risks: ['high'], lock: () => { const f = (S.fac || {}).helix; return !f || !f.met ? 'Meet Helix Biotech first' : f.ally ? 'They are your allies' : f.goneUntil > S.day ? `They are scattered until day ${f.goneUntil}` : f.raidUntil > S.day ? `On high alert after the last raid: wait until day ${f.raidUntil}` : ''; }, loot: { meds: [4, 7], fuel: [2, 4], mat: [4, 6] }, gear: 2, stronghold: true, raid: true, lines: ['The squad follows the white vans to the lab.'] },
  raid_hollow: { name: "Raid: the Hollow's chapel", icon: '🕯', desc: 'Lots of them, lightly armed, and they do not run. Candles, skin-coats and group singing.', risks: ['high'], lock: () => { const f = (S.fac || {}).hollow; return !f || !f.met ? 'Meet the Hollow first' : f.ally ? 'They are your allies' : f.goneUntil > S.day ? `They are scattered until day ${f.goneUntil}` : f.raidUntil > S.day ? `On high alert after the last raid: wait until day ${f.raidUntil}` : ''; }, loot: { food: [4, 7], cloth: [3, 5], mat: [3, 5] }, gear: 1, stronghold: true, raid: true, lines: ['The squad follows the candles.'] },
  raid_green: { name: 'Raid: Greenwater Commune', icon: '🌿', desc: 'Raiding them ends the friendship for good. They share everything. You are about to take it.', risks: ['high'], lock: () => { const f = (S.fac || {}).green; return !f || !f.met ? 'Meet Greenwater first' : f.goneUntil > S.day ? `They are scattered until day ${f.goneUntil}` : f.raidUntil > S.day ? `On high alert after the last raid: wait until day ${f.raidUntil}` : ''; }, loot: { food: [5, 8], water: [3, 5], cloth: [2, 3] }, gear: 1, stronghold: true, raid: true, lines: ['The squad slips past the orchard.'] },
  warehouse: { name: 'Warehouse District', icon: '🏭', desc: 'Scrap, and plenty of it. Shelves, rust and silence.',                  risks: ['medium', 'high'],  lock: () => (S.rank >= 3 ? '' : 'Needs Haven level 7'), loot: { mat: [3, 5] }, lines: ['The squad slips between loading docks.', 'Crates of hardware, half of it salvageable.', 'A forklift pins a stack of steel; they cut it free.'] },
};
const seasonIdx = () => Math.floor((S.day - 1) / SEASON_DAYS);
function seasonLock(id) { if ((S.lvl || 1) < 15 && !QS.get('season')) return 'Needs Haven level 15'; if (seasonOf().id !== id) return `Only in ${SEASONS.find((x) => x.id === id).name}`; if ((S.shSeason || {})['sh_' + id] === seasonIdx()) return 'Cleared this season'; return ''; }
const EXP_RISK = { low: { label: 'Low', min: 5, mult: 1, death: 0, hurt: .10 }, medium: { label: 'Medium', min: 15, mult: 2.5, death: .01, hurt: .22 }, high: { label: 'High', min: 30, mult: 5, death: .025, hurt: .38 } };   /* 3D.169 owner: losses lowered once the trip check showed whole-trip odds (medium .017 → .01, high .04 → .025); 3D.171 owner: low risk never kills */
/* V3D.18 DV2-style exploration: trips run on game time (pause and speed apply) and are short: 2 / 3 / 5 game hours.
   They are only possible when a lead comes in (mornings and afternoons, each lasts ~10 hours); the squad walks a bar at the bottom of the screen. */
const EXP_HMS = 1000 * 1000 / 60, expNow = () => S.expClock || 0, EXP_HOURS = { low: 2, medium: 3, high: 5 };
const EXP_STAGES = 3, EXP_MAX_SQUAD = 4, EXP_HOME_MIN = 2, EXP_COST = { low: 1, medium: 2, high: 4 }, EXP_BACK_DEATH = .003;
const expKind = (s) => (['Guard', 'Police Officer'].includes(s.job) ? 'guard' : s.job === 'Medic' ? 'medic' : s.job === 'Scavenger' ? 'scav' : 'other');
function expBlock(s) {   // why a survivor can't go on an expedition (null = free to go)
  if (s.hp <= 0 || ['down', 'hospital'].includes(s.mode)) return 'hurt'; if (s.hp < s.max * .6) return 'hurt';
  if (s.rescuing || s.carrying || ['rescueTo', 'rescueCarry'].includes(s.mode)) return 'rescuing';
  if (['chase', 'attack', 'recover'].includes(s.mode)) return 'fighting';
  if (['hide', 'hiding'].includes(s.mode)) return 'hiding';
  if (s.hunger >= 75) return 'hungry'; if (s.thirst >= 75) return 'thirsty';
  if (!['free', 'wait', 'postCombat', 'work', 'goWork', 'walk', 'goFacility', 'useFacility'].includes(s.mode)) return 'busy';
  return null;
}
const expEligible = (s) => s.hp > 0 && s.hp >= s.max * .6 && s.hunger < 75 && s.thirst < 75 && !s.rescuing && !s.carrying && ['free', 'wait', 'postCombat', 'work', 'goWork', 'walk', 'goFacility', 'useFacility'].includes(s.mode);
const expFit = (s) => (s.hp / s.max) * (1 - Math.max(s.hunger, s.thirst) / 200) * (1 + .1 * (s.l || 1));
function expAutoSquad(size = 3) {   // a balanced squad of healthy, fed, idle people: one guard, one medic, one scavenger, then the fittest
  const pool = S.sv.filter(expEligible).sort((a, b) => expFit(b) - expFit(a)), out = [], limit = Math.max(0, Math.min(EXP_MAX_SQUAD, size, S.sv.length - EXP_HOME_MIN));
  for (const k of ['guard', 'medic', 'scav']) { const c = pool.find((q) => expKind(q) === k && !out.includes(q)); if (c && out.length < limit) out.push(c); }
  for (const q of pool) if (out.length < limit && !out.includes(q)) out.push(q);
  return out;
}
const expPlain = (s) => { const o = {}; for (const k in s) if (!SKIP.has(k)) o[k] = s[k]; return o; };
function expSafety(ms) { return ms.reduce((a, s) => a + 1 + .08 * (s.l || 1) + .05 * (professions[s.job]?.combat || 0) + .03 * weaponOf(s).atk / 10 + .02 * (((itemOf(s, 'armor') || {}).def) || 0) + (s.pet && s.pet.kind === 'dog' ? .06 : 0) + (hasSpec(s, 'ranger') ? .1 : 0), 0) / (ms.length || 1) + (townHyb('pathfinder') ? .08 : 0) + (townHyb('tracker') ? .08 : 0); }   /* 3D.104 a dog scouts ahead */
const expTraitLoot = (ms) => (1 + .15 * ms.filter((m) => hasT(m, 'scrounger')).length) * (ms.length <= 2 ? 1 + .25 * ms.filter((m) => hasT(m, 'loner')).length : 1);   /* V2.43 */
const expRiskMult = (t) => Math.min(1.6, Math.max(.5, 1.3 / expSafety(t.members))) * (t.short ? 1.5 : 1) * vehSafe(t);   /* 3D.109 the Armored Van */
/* 3D.169 play-test (Explorer: "show trip cost and real odds before sending"). The same numbers the trip rolls, for the whole trip */
function tripCheck(dest, risk, members, pv) {
  if (!members.length) return '';
  const v = expSel.veh && VEH[expSel.veh] && vehReady(expSel.veh) ? VEH[expSel.veh] : null, vs = v ? v.safe : 1, rolls = members.length * EXP_STAGES;
  const pD = pv.deathPerStage * vs, pH = Math.min(1, pD + pv.hurtPerStage * vs * 1.35), all = (p) => 1 - Math.pow(1 - p, rolls);
  const lost = all(pD), hurt = all(pH), pc = (x) => (x < .01 ? '<1' : Math.round(x * 100)) + '%';
  const t = { members, risk }, rkI = ['low', 'medium', 'high'].indexOf(risk), pool = encPool(dest, risk), best = {};
  for (const k of pool) for (const o of EXP_ENC[k].opts) { if (o.safe) continue; const od = encOdds(t, o), key = o.chk === 'fight' ? 'Fights' : STAT_ABBR[o.chk] || o.chk; if (!best[key] || od.chance > best[key].chance) best[key] = od; }
  const odds = Object.entries(best).sort((x, y) => (x[0] === 'Fights' ? -1 : y[0] === 'Fights' ? 1 : y[1].chance - x[1].chance)).slice(0, 3).map(([k, o]) => `${k} ${o.who && o.who !== 'the squad' ? esc(o.who) + ' ' : ''}${Math.round(o.chance * 100)}%`).join(' · ');
  const tips = []; if (!members.some(isFighter) && rkI > 0) tips.push('add a fighter'); if (pv.short) tips.push('pack more food and water');
  if (!v) { const vk = Object.keys(VEH).filter((k) => vehReady(k) && VEH[k].safe < 1).sort((a, b) => VEH[a].safe - VEH[b].safe)[0]; if (vk) tips.push('take the ' + VEH[vk].name); }
  const lvl = lost < .04 ? ['Safe', 'var(--good)'] : lost < .15 ? ['Risky', '#c98a1e'] : ['Dangerous', 'var(--bad)'];
  return `<div class="card tripChk" style="margin-top:6px;padding:8px 10px"><div class="row"><b class="sp">Trip check</b><b style="color:${lvl[1]}">${lvl[0]}</b></div>`
    + `<div class="sm">Whole trip, ${members.length} ${members.length > 1 ? 'people' : 'person'}: someone hurt ${pc(hurt)} · someone lost for good <b style="color:${lvl[1]}">${pc(lost)}</b>${v ? ` (with the ${v.name})` : ''}</div>`
    + `<div class="sm">Home after packing: 🍖 ${Math.max(0, Math.floor(S.food - pv.need))} · 💧 ${Math.max(0, Math.floor(S.water - pv.need))}</div>`
    + (odds ? `<div class="sm">If something turns up: ${odds}</div>` : '') + (tips.length ? `<div class="sm">Safer: ${tips.join(', ')}</div>` : '') + '</div>';
}
function expPreview(destId, riskId, members) {
  const d = EXP_DEFS[destId], rk = EXP_RISK[riskId], n = members.length, need = EXP_COST[riskId] * n, short = S.food < need || S.water < need;
  const kinds = new Set(members.map(expKind).filter((k) => k !== 'other')).size, avgL = n ? members.reduce((a, s) => a + (s.l || 1), 0) / n : 1;
  const mult = rk.mult * (1 + .12 * Math.max(0, kinds - 1)) * (1 + .04 * (avgL - 1)) * expTraitLoot(members);
  const rm = n ? Math.min(1.6, Math.max(.5, 1.3 / expSafety(members))) * (short ? 1.5 : 1) : 1;
  return { need, short, mult, deathPerStage: rk.death * rm, hurtPerStage: rk.hurt * rm, minutes: rk.min };
}
const LEAD_TEXT = { mall: ['Someone saw lights in the old mall: the shops were never emptied'], prison: ['Blackgate Prison: the guards locked themselves in with the dead. Whoever clears it takes the armoury'], clinic: ['Smoke over the old clinic: the dead are packed inside, and so is the medicine', 'A radio voice: "the clinic is overrun, whoever clears it is a hero"'], houses: ['A scout saw a quiet street of empty houses', 'Someone spotted canned food in a row of houses', 'The radio mentions an untouched cul-de-sac'], pharmacy: ['Smoke stopped rising over the old pharmacy', 'A light blinked in the clinic window', 'The pharmacy shutters were seen half open'], warehouse: ['A loading door at the warehouses was left open', 'Trucks were abandoned at the depot', 'The radio talks of a sealed scrap store'] };
function leadsTidy() { const h = nowH(); S.leads = (S.leads || []).filter((l) => l.untilH > h); }
function leadsHour() {   /* hourly: new leads at 7:00 and 15:00 (not every time), at most two waiting; the first one comes on day 1 */
  leadsTidy(); const first = !S.leadSeen && S.day === 1 && S.hour === 9; if (!first && ![7, 15].includes(S.hour)) return; if ((S.leads || []).length >= 2 || (!first && rnd() > .7)) return;
  const opts = Object.keys(EXP_DEFS).filter((k) => !expLocked(k) && !EXP_DEFS[k].raid), wantB = needsBanner() && !bannersFree() && opts.includes('clinic') && !(S.leads || []).some((l) => l.dest === 'clinic'), seas = opts.find((k) => k.startsWith('sh_') && !(S.leads || []).some((l) => l.dest === k)), dest = first ? 'houses' : wantB && rnd() < .6 ? 'clinic' : seas && rnd() < .5 ? seas : opts[Math.floor(rnd() * opts.length)], d = EXP_DEFS[dest], risk = d.risks[Math.floor(rnd() * d.risks.length)];
  const T = LEAD_TEXT[dest] || ['A new place to search']; S.leadSeen = true;
  (S.leads ||= []).push({ id: 'l' + S.day + '_' + S.hour, dest, risk, text: T[Math.floor(rnd() * T.length)], untilH: nowH() + 10 });
  banner(`🧭 New lead: ${d.name}`); logEvent(`New lead: ${d.name} (${EXP_RISK[risk].label} risk, ${EXP_HOURS[risk]} h trip). Open Explore to send a squad. It's gone in about 10 hours.`, 'important'); ui();
}
function expLocked(destId) { return EXP_DEFS[destId].lock(); }
function startExpedition(destId, riskId, ids) {
  const d = EXP_DEFS[destId], rk = EXP_RISK[riskId]; if (!d || !rk) return { ok: false, why: 'Unknown trip' };
  if (S.cordon > S.day) return { ok: false, why: `Quarantine cordon: nobody leaves until day ${S.cordon}` };
  if (S.trip) return { ok: false, why: 'A squad is already out' }; if (S.sh) return { ok: false, why: 'A squad is inside a stronghold' }; const r0 = startExpedition0(destId, riskId, ids); if (r0 && r0.ok) statAdd('exp'); return r0; }
function startExpedition0(destId, riskId, ids) {
  const d = EXP_DEFS[destId], rk = EXP_RISK[riskId];
  const lock = expLocked(destId); if (lock) return { ok: false, why: lock };
  if (!d.risks.includes(riskId)) return { ok: false, why: d.name + ' only offers ' + d.risks.map((r) => EXP_RISK[r].label).join(' / ') + ' trips' };
  const ms = (ids || []).map((id) => S.sv.find((q) => q.id === id)).filter(Boolean);
  if (!ms.length) return { ok: false, why: 'Pick at least one survivor' }; if (ms.length > expMax()) return { ok: false, why: 'A squad is at most ' + expMax() };
  if (S.sv.length - ms.length < EXP_HOME_MIN) return { ok: false, why: `Keep at least ${EXP_HOME_MIN} survivors at home` };
  if (ms.some((q) => q.hp <= 0 || ['down', 'hospital', 'rescueTo', 'rescueCarry'].includes(q.mode))) return { ok: false, why: (ms.find((q) => q.hp <= 0 || ['down', 'hospital', 'rescueTo', 'rescueCarry'].includes(q.mode)) || {}).name + ' is hurt or busy' };
  const pv = expPreview(destId, riskId, ms), take = (k, n) => { const g = Math.min(S[k], n); S[k] -= g; (S.tripUse = (S.tripUse || []).filter((q) => q.d > S.day - 3)).push({ d: S.day, k, v: g }); return g; };   /* 3D.162 remembered for the forecast */
  if ((d.stronghold) && SH_DEFS[destId]) { if (S.sh) return { ok: false, why: 'A squad is already inside a stronghold' }; take('food', pv.need); take('water', pv.need); return startStronghold(destId, ids, { goal: expSel.goal }); }   /* 3D.108 */
  take('food', pv.need); take('water', pv.need);
  for (const q of ms) { releasePost(q); for (const z of S.z) if (z.target === q) { z.target = null; z.mode = 'idle'; } if (selected && selected.ref === q) { selected = null; closeP(); } }
  S.sv = S.sv.filter((q) => !ms.includes(q));
  S.trip = { dest: destId, risk: riskId, t0: expNow(), dur: ((EXP_HOURS[riskId] * EXP_HMS)), stage: 0, phase: 'out', backAt: 0, short: pv.short, members: ms.map(expPlain), loot: { food: 0, water: 0, mat: 0, wood: 0, stone: 0, cloth: 0, meds: 0, fuel: 0 }, log: [`Departed for ${d.name} (${rk.label} risk).` + (pv.short ? ' Short on supplies: the trip is riskier.' : '')], lost: [], hurt: [], troubleSeen: 0 };
  ms.forEach((q) => { const m = S.trip.members.find((x) => x.id === q.id); m.mode = 'away'; }); vehDepart(S.trip, expSel.veh);   /* 3D.109 */
  autoStaff(); barkSomeone('farewell', { dest: d.name }, { pri: 1 }); say(`${ms.map((q) => q.name).join(', ')} left for ${d.name}.`, true); saveGame(); ui(); expTick(); return { ok: true, why: '' };
}
const expStageAt = (t, k) => t.t0 + k * t.dur / EXP_STAGES;
function expResolveStage(t, quiet) {
  t.stage++; const d = EXP_DEFS[t.dest], rk = EXP_RISK[t.risk], ms = t.members; vehStage(t); if (t.stage >= EXP_STAGES) vehFind(t);
  const kinds = new Set(ms.map(expKind).filter((k) => k !== 'other')).size, avgL = ms.reduce((a, s) => a + (s.l || 1), 0) / (ms.length || 1), f = rk.mult * (1 + .12 * Math.max(0, kinds - 1)) * (1 + .04 * (avgL - 1)) * (1 + .15 * ms.filter((m) => hasSkill(m, 'lootSense')).length) * (1 + .2 * ms.filter((m) => hasSkill(m, 'treasureHunter')).length) * expTraitLoot(ms) * vehLoot(t);
  const got = [], r = (a) => a[0] + Math.floor(Math.random() * (a[1] - a[0] + 1));
  for (const k in d.loot) { const n = Math.max(1, Math.round(r(d.loot[k]) * f)); t.loot[k] = (t.loot[k] || 0) + n; got.push(`${RES_ICON[k] || k} ${n}`); }
  if (Math.random() < .2 * Math.sqrt(rk.mult) * (d.gear || 1) * (ms.some((m) => hasSkill(m, 'treasureHunter')) ? 2 : 1)) { const pool = ['gloves', 'belt', 'shoes', 'goggles', 'glasses', 'charm', 'backpack', 'hikerpack', 'watch', 'walkie', 'medpouch', 'raincoat', 'firecoat', 'hazmat', 'ghillie', 'tactcap', 'gasmask', 'shovel', 'roadsign', 'leather', 'hockey', 'biker', 'crowbar', 'nailbat', 'machete', 'spear', 'axe', 'bow', 'revolver', 'riot', 'kevlar', 'rifle', 'shotgun', 'plate', 'dogtags', 'katana', 'smg', 'military', 'assault'], id = pool[Math.floor(Math.random() * Math.min(pool.length, 7 + Math.round(rk.mult * 1.3)))]; t.items = (t.items || []).concat(id); got.push(ITEMS[id].name); }   /* V2.14: gear finds */
  const rm = expRiskMult(t); let trouble = [];
  for (const m of [...ms]) {
    const x = Math.random(), tm = hasT(m, 'cautious') ? .7 : 1, dead = rk.death * rm * tm, collapse = rk.hurt * rm * .35 * tm, hurt = rk.hurt * rm * tm;
    if (x < dead) { ms.splice(ms.indexOf(m), 1); t.lost.push(m.name); (t.lostSv = t.lostSv || []).push(m); t.log.push(`Stage ${t.stage}: ${m.name} did not make it.`); trouble.push(`${m.name} was lost`); }
    else if (x < dead + collapse) { m.hp = 0; m.collapsed = true; t.log.push(`Stage ${t.stage}: ${m.name} collapsed and is being carried.`); trouble.push(`${m.name} collapsed`); }
    else if (x < dead + collapse + hurt && !m.collapsed) { m.hp = Math.max(1, Math.round(m.hp * (.3 + Math.random() * .3))); t.log.push(`Stage ${t.stage}: ${m.name} was hurt.`); trouble.push(`${m.name} was hurt`); if (!t.hurt.includes(m.name)) t.hurt.push(m.name); }
  }
  t.log.splice(Math.max(1, t.log.length - trouble.length), 0, `Stage ${t.stage}: ${d.lines[Math.floor(Math.random() * d.lines.length)]} Found ${got.join(' and ')}.`); t.lastGot = got.slice(0, 2);
  if (!ms.length) { t.log.push('Nobody came back.'); return 'wiped'; }
  if (t.enc) encResolve(t, null);   /* V2.44: no order came during the last stage */
  if (t.stage < EXP_STAGES && encLive(t).length && Math.random() < EXP_ENC_CHANCE && expEncounter(t)) { if (quiet) encResolve(t, null); else encPopup(t); }
  if ((trouble.length && !quiet && t.stage < EXP_STAGES)) banner(`⚠ ${trouble.join(', ')} · tap the trip bar to recall`);
  else if (trouble.length && !quiet && t.stage < EXP_STAGES) showEventPopup({ title: 'SQUAD IN TROUBLE', text: `${trouble.join(', ')} on stage ${t.stage} of ${EXP_STAGES}. Recall the squad now, or keep going?`, buttons: [{ label: 'RECALL', fn: () => expRecall() }, { label: 'KEEP GOING' }] });
  return trouble.length ? 'trouble' : 'ok';
}
/* ---- V2.44 expedition choices: at the end of stage 1 or 2 the squad may meet a situation with 2–3 options. Each option shows who would do it and the
   chance, worked out from stats, gear, profession and personality. If no order comes before the next stage (or the game is closed) the squad decides itself. ---- */
const STAT_ABBR = { str: 'STR', end: 'END', agi: 'AGI', per: 'PER', int: 'INT', cha: 'CHA' };
const EXP_ENC = {
  door: { at: ['mall'], title: '🚪 A BARRICADED STORE', text: 'Chained shutters on a corner shop. Whatever is inside has not been looted.', opts: [
    { id: 'force', label: 'Force the shutters', chk: 'str', job: { Engineer: .1, Guard: .05 }, win: { mat: [2, 3] }, fail: 'hurt', winT: '{who} wrenched the shutters open: {got}.', failT: 'The chain snapped back and caught {who}.' },
    { id: 'sneak', label: 'Find a way in at the back', chk: 'agi', job: { Scavenger: .12 }, tr: { scrounger: .1 }, win: { food: [1, 2], water: [1, 2] }, fail: 'none', winT: '{who} squeezed in through a vent: {got}.', failT: '{who} found no way in. Nothing lost.' },
    { id: 'leave', label: 'Leave it', safe: true, winT: 'The squad left the store alone.' }] },
  cry: { at: ['houses', 'mall'], title: '📢 A CRY FOR HELP', text: 'Someone is shouting from a rooftop, with the dead crowding the stairwell below.', opts: [
    { id: 'help', label: 'Clear the stairwell', chk: 'fight', tr: { caring: .15, brave: .08 }, win: { recruit: 1 }, fail: 'hurt2', winT: 'The squad cleared the stairs. {got}', failT: 'Too many of them: {who} got hurt pulling back.' },
    { id: 'talk', label: 'Shout directions to them', chk: 'cha', tr: { caring: .1 }, job: { Civilian: .1, Medic: .05 }, win: { gift: 1 }, fail: 'none', winT: '{who} talked them down a fire escape. {got}', failT: 'They could not make it down. The squad moved on.' },
    { id: 'leave', label: 'Keep moving', safe: true, winT: 'The squad kept moving. The shouting faded behind them.' }] },
  horde: { shared: true, title: '🧟 A HORDE ON THE ROAD', text: 'A slow river of the dead fills the street the squad needs.', opts: [
    { id: 'fight', label: 'Fight through', chk: 'fight', tr: { brave: .1 }, win: { mat: [1, 2], xp: 6 }, fail: 'hurt2', winT: 'The squad cut a path through: {got}.', failT: 'The horde pushed back hard: {who} got hurt.' },
    { id: 'sneak', label: 'Sneak around', chk: 'agi', tr: { cautious: .1, owl: .05 }, job: { Scavenger: .1 }, win: {}, fail: 'hurt', winT: '{who} led them round by the back alleys.', failT: 'A crawler gave them away: {who} got hurt getting clear.' },
    { id: 'back', label: 'Turn back now', safe: true, recall: true, winT: 'The squad turned for home with what they had.' }] },
  cache: { at: ['military'], title: '🚗 A WRECKED ARMORED VAN', text: 'A security van on its side, the back door jammed half open.', opts: [
    { id: 'climb', label: 'Climb inside', chk: 'agi', tr: { scrounger: .15 }, job: { Scavenger: .1 }, win: { item: 1 }, fail: 'hurt', winT: '{who} wriggled in and came out with {got}.', failT: 'The wreck shifted and pinned {who} for a moment.' },
    { id: 'pry', label: 'Pry the door off', chk: 'str', job: { Engineer: .12 }, win: { mat: [2, 4] }, fail: 'none', winT: '{who} pried it open and stripped the van: {got}.', failT: 'The door would not move. Nothing lost.' },
    { id: 'leave', label: 'Leave it', safe: true, winT: 'The squad left the van alone.' }] },
  stranger: { at: ['pharmacy'], title: '🤒 A SICK STRANGER', text: 'A feverish man sits by a burnt-out car, clutching a backpack.', opts: [
    { id: 'treat', label: 'Treat him', chk: 'int', job: { Medic: .2 }, tr: { caring: .1 }, win: { item: 1, ren: 3 }, fail: 'none', winT: '{who} brought the fever down. He gave them {got}.', failT: 'There was nothing {who} could do. Nothing lost.' },
    { id: 'leave', label: 'Move on', safe: true, winT: 'The squad moved on.' }] },
  raiders: { shared: true, minRisk: 'medium', title: '🔫 RAIDERS DEMAND A TOLL', text: 'Armed raiders block the bridge and want a share of the haul.', opts: [
    { id: 'pay', label: 'Pay half the haul', safe: true, toll: .5, winT: 'The squad paid the toll and crossed.' },
    { id: 'talk', label: 'Talk them down', chk: 'cha', job: { Civilian: .1, 'Police Officer': .08 }, win: { mat: [1, 2] }, fail: 'toll', winT: '{who} talked them into a trade: {got}.', failT: '{who} could not sway them: they took the whole haul.' },
    { id: 'fight', label: 'Fight them', chk: 'fight', hard: 1.5, tr: { brave: .08 }, win: { mat: [3, 5], item: 1, xp: 8 }, fail: 'hurt2', winT: 'The raiders scattered and left their stash: {got}.', failT: 'The raiders fought back: {who} got hurt.' }] },
  /* 3D.169 (owner approved): three cards of its own for each ordinary destination. Facts first, joke last. */
  cellar: { at: ['houses'], title: '🔒 A LOCKED CELLAR', text: 'A padlocked cellar door behind a house. Canned food inside, probably. Possibly a raccoon.', opts: [
    { id: 'force', label: 'Break the lock', chk: 'str', job: { Guard: .05, Engineer: .08 }, win: { food: [2, 3] }, fail: 'hurt', winT: '{who} snapped the lock: {got}.', failT: 'The hasp gave way all at once and {who} went down the steps the fast way.' },
    { id: 'pick', label: 'Pick the lock', chk: 'agi', job: { Scavenger: .12 }, tr: { scrounger: .1 }, win: { food: [1, 2], water: [1, 2] }, fail: 'none', winT: '{who} picked it in a minute: {got}.', failT: '{who} could not get it open. Nothing lost but pride.' },
    { id: 'leave', label: 'Leave it', safe: true, winT: 'The squad left the cellar to the raccoon.' }] },
  treehouse: { at: ['houses'], title: '🌳 A TREEHOUSE LOOKOUT', text: 'A kid\'s treehouse with a view over half the town. The ladder has three rungs left.', opts: [
    { id: 'climb', label: 'Climb up and look around', chk: 'agi', tr: { owl: .1 }, win: { lead: 1 }, fail: 'hurt', winT: '{who} spotted somewhere new from up there. {got}', failT: 'The fourth rung was imaginary. {who} found out.' },
    { id: 'leave', label: 'Keep moving', safe: true, winT: 'The squad left the treehouse to the birds.' }] },
  album: { at: ['houses'], title: '📷 A FAMILY PHOTO ALBUM', text: 'A photo album on a kitchen table: birthdays, beaches, a dog in a hat. No supplies.', opts: [
    { id: 'look', label: 'Stop and look through it', chk: 'cha', tr: { caring: .15 }, win: { mood: 6 }, fail: 'none', winT: '{who} told stories about every picture. The squad came away lighter. {got}', failT: 'It hit {who} harder than expected. They moved on quietly.' },
    { id: 'leave', label: 'Move on', safe: true, winT: 'The squad closed the album and moved on.' }] },
  cabinet: { at: ['pharmacy'], title: '💊 A LOCKED DRUG CABINET', text: 'A steel cabinet behind the counter, still locked. The label says controlled. The lock says cheap.', opts: [
    { id: 'open', label: 'Work the lock', chk: 'int', job: { Medic: .15, Engineer: .08 }, win: { meds: [1, 2] }, fail: 'hurt', winT: '{who} had it open in a minute: {got}.', failT: 'The cabinet door slammed on {who}\'s hand.' },
    { id: 'pry', label: 'Pry it off the wall', chk: 'str', win: { meds: [1, 1], mat: [1, 2] }, fail: 'none', winT: '{who} tore it off the wall: {got}.', failT: 'It was bolted to something stronger than {who}.' },
    { id: 'leave', label: 'Leave it', safe: true, winT: 'The squad left the cabinet locked.' }] },
  waiting: { at: ['pharmacy'], title: '🪑 A FULL WAITING ROOM', text: 'The waiting room is full of the dead, still waiting. The supply cupboard is behind them.', opts: [
    { id: 'fight', label: 'Clear the room', chk: 'fight', tr: { brave: .08 }, win: { meds: [1, 2], cloth: [1, 2], xp: 5 }, fail: 'hurt2', winT: 'The squad cleared the room: {got}.', failT: 'More of them than chairs: {who} got hurt.' },
    { id: 'sneak', label: 'Slip past to the cupboard', chk: 'agi', job: { Scavenger: .1 }, tr: { cautious: .08 }, win: { cloth: [1, 2] }, fail: 'hurt', winT: '{who} reached the cupboard unseen: {got}.', failT: 'Someone\'s number was called. {who} got hurt getting out.' },
    { id: 'leave', label: 'Not today', safe: true, winT: 'The squad left them waiting.' }] },
  sawmill: { at: ['lumberyard'], title: '⚙ THE SAWMILL STILL RUNS', text: 'A diesel saw in the yard still turns over. Cut planks are faster than chopped ones. Louder too.', opts: [
    { id: 'run', label: 'Fire it up', chk: 'int', job: { Mechanic: .18, Engineer: .1 }, win: { wood: [3, 4] }, fail: 'hurt', winT: '{who} got it running and cut a stack: {got}.', failT: 'It kicked back. {who} kept all their fingers, barely.' },
    { id: 'leave', label: 'Too loud, leave it', safe: true, winT: 'The squad left the saw alone.' }] },
  logs: { at: ['lumberyard'], title: '🪵 STACKED LOGS SHIFT', text: 'A log stack groans as the squad passes. The good timber is on the far side of it.', opts: [
    { id: 'dash', label: 'Run round it for the timber', chk: 'agi', tr: { brave: .05 }, win: { wood: [2, 3] }, fail: 'hurt', winT: '{who} got round before it rolled: {got}.', failT: 'The stack won. {who} got hurt.' },
    { id: 'brace', label: 'Wedge it first', chk: 'str', job: { Engineer: .1 }, win: { wood: [1, 2] }, fail: 'none', winT: '{who} wedged it and took what was loose: {got}.', failT: '{who} could not hold it. The squad backed off.' },
    { id: 'leave', label: 'Go round the long way', safe: true, winT: 'The squad went round the long way.' }] },
  nest: { at: ['lumberyard'], title: '🧟 A NEST IN THE WOODPILE', text: 'Something is moving inside the woodpile. Several somethings.', opts: [
    { id: 'fight', label: 'Clear them out', chk: 'fight', tr: { brave: .1 }, win: { wood: [2, 3], xp: 6 }, fail: 'hurt2', winT: 'The squad cleared the pile: {got}.', failT: 'They came out all at once: {who} got hurt.' },
    { id: 'leave', label: 'Leave them', safe: true, winT: 'The squad let the woodpile be.' }] },
  tankpump: { at: ['gasstation'], title: '⛽ THE TANK PUMP JAMS', text: 'The hand pump on the underground tank is stuck half way. There is fuel down there.', opts: [
    { id: 'fix', label: 'Fix the pump', chk: 'int', job: { Mechanic: .2 }, tr: { diligent: .08 }, win: { fuel: [1, 2] }, fail: 'hurt', winT: '{who} freed the valve: {got}.', failT: 'The pump freed itself all at once, onto {who}.' },
    { id: 'leave', label: 'Leave it', safe: true, winT: 'The squad left the tank alone.' }] },
  carwash: { at: ['gasstation'], title: '🚿 A CAR WASH FULL OF THE DEAD', text: 'The car wash tunnel is packed with the dead. A tool locker sits at the far end.', opts: [
    { id: 'fight', label: 'Fight through to the locker', chk: 'fight', hard: 1.2, tr: { brave: .08 }, win: { mat: [2, 3], item: 1, xp: 6 }, fail: 'hurt2', winT: 'The squad cleared the tunnel: {got}.', failT: 'Wet floor, many teeth: {who} got hurt.' },
    { id: 'leave', label: 'Leave it', safe: true, winT: 'The squad skipped the wash.' }] },
  hotdog: { at: ['gasstation'], title: '🌭 A HOT-DOG ROLLER, STILL WARM', text: 'The roller grill is on a battery and still turning. Nobody knows how long those hot dogs have been there.', opts: [
    { id: 'eat', label: 'Somebody eats one', chk: 'end', tr: { eater: .15 }, win: { food: [1, 2], mood: 3 }, fail: 'sick', winT: '{who} ate one and lived. They bagged the rest: {got}.', failT: '{who} ate one. {who} regrets it.' },
    { id: 'leave', label: 'Absolutely not', safe: true, winT: 'The squad left the hot dogs rolling.' }] },
  minefield: { at: ['military'], title: '⚠ A MINEFIELD SIGN', text: 'A hand-painted sign: MINES. The short way to the supply tents runs right past it.', opts: [
    { id: 'path', label: 'Find the safe path', chk: 'per', job: { 'Police Officer': .08 }, tr: { cautious: .1 }, win: { ammo: [4, 8], mat: [1, 2] }, fail: 'hurt2', winT: '{who} read the ground and led them through: {got}.', failT: 'The sign was not a joke. {who} got hurt.' },
    { id: 'leave', label: 'Take the long way', safe: true, winT: 'The squad took the long way round.' }] },
  ammocrate: { at: ['military'], title: '📦 A CRATE UNDER A TARP', text: 'A heavy crate under a tarp, half buried in mud. Stencilled letters, mostly numbers.', opts: [
    { id: 'lift', label: 'Haul it out', chk: 'str', job: { Guard: .08 }, win: { ammo: [6, 10] }, fail: 'hurt', winT: '{who} dragged it free: {got}.', failT: 'The mud kept the crate and {who}\'s back.' },
    { id: 'leave', label: 'Leave it', safe: true, winT: 'The squad left it in the mud.' }] },
  pit: { at: ['quarrysite'], title: '🌊 THE FLOODED PIT', text: 'Cut blocks sit on a ledge just above the water line. The water is very still.', opts: [
    { id: 'wade', label: 'Wade out for the blocks', chk: 'str', tr: { brave: .05 }, win: { stone: [3, 4] }, fail: 'hurt', winT: '{who} hauled the blocks up: {got}.', failT: 'The water was not empty. {who} got out soaked and hurt.' },
    { id: 'rope', label: 'Rig a rope and sled', chk: 'int', job: { Engineer: .12 }, win: { stone: [2, 3] }, fail: 'none', winT: '{who} rigged a sled: {got}.', failT: 'The knot was more of a suggestion. Nothing lost.' },
    { id: 'leave', label: 'Leave the pit alone', safe: true, winT: 'The squad left the pit alone.' }] },
  crane: { at: ['quarrysite'], title: '🏗 A CRANE CAB', text: 'An old crane over the cut face. If it still swings, it can lift a whole pallet of stone.', opts: [
    { id: 'run', label: 'Get it working', chk: 'int', job: { Engineer: .18, Mechanic: .12 }, win: { stone: [4, 5] }, fail: 'hurt', winT: '{who} swung a pallet of stone across: {got}.', failT: 'The crane swung {who} instead.' },
    { id: 'leave', label: 'Leave it', safe: true, winT: 'The squad left the crane where it was.' }] },
  tunnel: { at: ['quarrysite'], title: '🕳 AN ECHOING TUNNEL', text: 'A blasting tunnel goes into the rock. Footsteps echo back that are not the squad\'s.', opts: [
    { id: 'fight', label: 'Go in and clear it', chk: 'fight', tr: { brave: .1 }, win: { stone: [2, 3], mat: [1, 2], xp: 6 }, fail: 'hurt2', winT: 'The squad cleared the tunnel: {got}.', failT: 'Dark, narrow and busy: {who} got hurt.' },
    { id: 'leave', label: 'Not in there', safe: true, winT: 'The squad left the tunnel to whoever was in it.' }] },
  freezer: { at: ['mall'], title: '🧊 THE FOOD COURT FREEZER', text: 'A walk-in freezer at the food court, door shut. It hums. It should not be humming.', opts: [
    { id: 'open', label: 'Open it carefully', chk: 'per', tr: { cautious: .08 }, win: { food: [2, 4] }, fail: 'hurt2', winT: '{who} checked the seal first: {got}.', failT: 'It was full, but not of food. {who} got hurt.' },
    { id: 'leave', label: 'Leave it humming', safe: true, winT: 'The squad let it hum.' }] },
  sports: { at: ['mall'], title: '🏈 A SPORTS SHOP', text: 'A sports shop with the shutter jammed a foot off the floor.', opts: [
    { id: 'crawl', label: 'Crawl under the shutter', chk: 'agi', job: { Scavenger: .1 }, tr: { scrounger: .1 }, win: { item: 1 }, fail: 'hurt', winT: '{who} came back out with {got}.', failT: 'The shutter dropped an inch with {who} under it.' },
    { id: 'leave', label: 'Leave it', safe: true, winT: 'The squad left the shop alone.' }] },
  forklift: { at: ['warehouse'], title: '🚜 A FORKLIFT PINS A STACK', text: 'A forklift has tipped onto a stack of steel shelving. Good scrap underneath.', opts: [
    { id: 'lift', label: 'Lever it off', chk: 'str', job: { Engineer: .12 }, win: { mat: [3, 4] }, fail: 'hurt', winT: '{who} levered it clear: {got}.', failT: 'The forklift settled back down, partly on {who}.' },
    { id: 'drive', label: 'Hot-wire it and back it off', chk: 'int', job: { Mechanic: .2 }, win: { mat: [2, 3], fuel: [1, 1] }, fail: 'none', winT: '{who} backed it off and drained the tank: {got}.', failT: '{who} could not start it. Nothing lost.' },
    { id: 'leave', label: 'Leave it', safe: true, winT: 'The squad left the stack pinned.' }] },
  watchman: { at: ['warehouse'], title: '🔦 THE NIGHT WATCHMAN\'S OFFICE', text: 'A locked office with a key board and a logbook. The watchman never clocked out.', opts: [
    { id: 'read', label: 'Search the office', chk: 'int', tr: { diligent: .08 }, win: { lead: 1, mat: [1, 2] }, fail: 'hurt', winT: '{who} found the logbook and a list of addresses: {got}', failT: 'The watchman was still on shift. {who} got hurt.' },
    { id: 'leave', label: 'Leave it locked', safe: true, winT: 'The squad let the watchman rest.' }] },
  rats: { at: ['warehouse'], title: '🐀 RATS IN THE SHELVING', text: 'Rats, and the dead that follow the rats, in the back aisles. The back aisles are where the good stuff is.', opts: [
    { id: 'fight', label: 'Clear the aisles', chk: 'fight', tr: { brave: .08 }, win: { mat: [2, 3], cloth: [1, 2], xp: 5 }, fail: 'hurt2', winT: 'The squad cleared the aisles: {got}.', failT: 'The rats were the easy part: {who} got hurt.' },
    { id: 'leave', label: 'Leave the back aisles', safe: true, winT: 'The squad left the rats to it.' }] },
};
/* 3D.173 owner: every trip card offers turn back (ends the trip safely, with what they have so far; on medium/high the walk home keeps its small risk) */
for (const E of Object.values(EXP_ENC)) if (!E.opts.some((o) => o.recall)) E.opts.push({ id: 'back', label: 'Turn back now', safe: true, recall: true, winT: 'The squad turned for home with what they had.' });
const EXP_ENC_CHANCE = .55, EXP_DANGER = { low: 5, medium: 8, high: 12 }, EXP_CHK_PEN = { low: 0, medium: .06, high: .12 };
const encLive = (t) => t.members.filter((m) => m.hp > 0 && !m.collapsed);
function encOdds(t, o) {   /* → { chance, who } */
  const ms = encLive(t), trB = (m) => Object.entries(o.tr || {}).reduce((a, [k, v]) => a + (hasT(m, k) ? v : 0), 0);
  if (!ms.length || o.safe) return { chance: 1, who: null };
  if (o.chk === 'fight') {
    const pow = ms.reduce((a, m) => a + weaponOf(m).atk / 6 + .5 * (m.l || 1) + (isFighter(m) ? 1.5 : 0) + ((itemOf(m, 'armor') || {}).def || 0) * .1, 0), dg = EXP_DANGER[t.risk] * (o.hard || 1);
    const bonus = Math.max(0, ...ms.map(trB)); return { chance: Math.max(.1, Math.min(.95, pow / (pow + dg) + bonus)), who: 'the squad' };
  }
  let best = null, bv = -1e9; for (const m of ms) { const v = (stat(m, o.chk) - 4) * .06 + ((o.job || {})[m.job] || 0) + trB(m); if (v > bv) { bv = v; best = m; } }
  return { chance: Math.max(.1, Math.min(.95, .35 + bv - EXP_CHK_PEN[t.risk])), who: best.name, whoId: best.id };
}
function encPool(dest, risk, which) { const rkI = ['low', 'medium', 'high'].indexOf(risk), ok = (k) => !EXP_ENC[k].minRisk || rkI >= ['low', 'medium', 'high'].indexOf(EXP_ENC[k].minRisk);
  const own = Object.keys(EXP_ENC).filter((k) => ok(k) && (EXP_ENC[k].at || []).includes(dest)), shared = Object.keys(EXP_ENC).filter((k) => ok(k) && EXP_ENC[k].shared);
  if (!own.length) return Object.keys(EXP_ENC).filter((k) => ok(k) && (EXP_ENC[k].shared || ['door', 'cry', 'cache', 'stranger'].includes(k)));   /* places without cards of their own: the old six */
  return which === 'own' ? own : which === 'shared' ? shared : own.concat(shared); }
function encPick(t) {   /* 3D.169: 70% the place's own cards, 30% the shared ones; an own card does not come back until the others have */
  const own = encPool(t.dest, t.risk, 'own'), shared = encPool(t.dest, t.risk, 'shared').filter((k) => k !== t.lastEnc);
  if (!shared.length || (own.length && rnd() < .7)) { S.encSeen = S.encSeen || {}; let seen = (S.encSeen[t.dest] || []).filter((k) => own.includes(k)); let c = own.filter((k) => !seen.includes(k) && k !== t.lastEnc); if (!c.length) { seen = []; c = own.filter((k) => k !== t.lastEnc); } if (!c.length) c = own;
    const k = c[Math.floor(rnd() * c.length)]; S.encSeen[t.dest] = seen.concat(k); return k; }
  return shared[Math.floor(rnd() * shared.length)]; }
function expEncounter(t, key) {   /* pick (or force) a situation; stores the odds so the player sees exactly what is rolled */
  if (t.enc) encResolve(t, null);
  const k = key || encPick(t), E = EXP_ENC[k]; if (!E || !encLive(t).length) return null;
  t.lastEnc = k; t.enc = { k, stage: t.stage, opts: E.opts.map((o) => ({ id: o.id, ...encOdds(t, o) })) };
  return t.enc;
}
function encDefault(t) {   /* the squad's own call: a Brave member takes a good fight, a Cautious one plays safe, otherwise the best odds if they are good */
  const E = EXP_ENC[t.enc.k], ms = encLive(t), opts = t.enc.opts.map((x, i) => ({ ...x, i, o: E.opts[i] })), safe = opts.find((x) => x.o.safe) || opts[0];
  const brave = ms.find((m) => hasT(m, 'brave')), caut = ms.find((m) => hasT(m, 'cautious'));
  const fight = opts.find((x) => x.o.chk === 'fight' && x.chance >= .55); if (brave && fight) return { i: fight.i, lead: brave };
  if (caut) return { i: safe.i, lead: caut };
  const good = opts.filter((x) => !x.o.safe && x.chance >= .6).sort((a, b) => b.chance - a.chance)[0]; return { i: good ? good.i : safe.i, lead: ms[0] };
}
function encResolve(t, i, roll = Math.random()) {   /* i = player's choice (null = no order came) */
  const en = t.enc; if (!en) return null; const E = EXP_ENC[en.k], rk = EXP_RISK[t.risk]; let lead = null;
  if (i == null) { const d = encDefault(t); i = d.i; lead = d.lead; if (curEv && curEv.encRef === en) { const m = $('eventModal'); if (m && m.innerHTML) { m.innerHTML = ''; m.className = m.className.replace(/\blive\b/, ''); modalOpen = false; curEv = null; say('No order came in time: the squad decided for itself.'); setTimeout(nextEventPopup, 0); } } }
  const o = E.opts[i], od = en.opts[i]; t.enc = null; if (!o) return null;
  const actor = (od.whoId && t.members.find((m) => m.id === od.whoId)) || encLive(t)[0], got = [], r = (a) => Math.max(1, Math.round((a[0] + Math.floor(Math.random() * (a[1] - a[0] + 1))) * Math.sqrt(rk.mult)));
  const ok = o.safe || roll < od.chance, hurtOne = (m) => { if (!m) return; const loss = m.max * (.3 + Math.random() * .2) * (1 - dmgReduce(m)); m.hp = Math.max(0, Math.round(m.hp - loss)); if (m.hp <= 0) { m.collapsed = true; t.log.push(`${m.name} collapsed and is being carried.`); } else if (!t.hurt.includes(m.name)) t.hurt.push(m.name); return m.name; };
  let who = actor ? actor.name : 'The squad';
  if (o.toll) { for (const k in t.loot) t.loot[k] = Math.floor(t.loot[k] * (1 - o.toll)); }
  if (ok && o.win) {
    for (const k of ['food', 'water', 'mat', 'wood', 'stone', 'fuel', 'meds', 'cloth', 'ammo']) if (o.win[k]) { const n = r(o.win[k]); t.loot[k] = (t.loot[k] || 0) + n; got.push(`${RES_ICON[k] || k} ${n}`); }
    if (o.win.mood) { encLive(t).forEach((m) => { m.sat = Math.min(100, (m.sat || 50) + o.win.mood); }); got.push(`(♥ +${o.win.mood} for the squad)`); }
    if (o.win.lead) { const opts = Object.keys(EXP_DEFS).filter((k) => k !== t.dest && !expLocked(k) && !EXP_DEFS[k].raid && !EXP_DEFS[k].stronghold && !(S.leads || []).some((l) => l.dest === k)); if (opts.length && (S.leads || []).length < 3) { const dk = opts[Math.floor(rnd() * opts.length)], D = EXP_DEFS[dk]; (S.leads ||= []).push({ id: 'l' + S.day + '_' + S.hour + '_e', dest: dk, risk: D.risks[0], text: 'Spotted on the last trip', untilH: nowH() + 16 }); got.push(`New lead: ${D.name}.`); } else got.push('Nothing new to see.'); }
    if (o.win.item) { const pool = ['crowbar', 'machete', 'leather', 'hockey', 'goggles', 'charm', 'spear', 'axe', 'riot', 'revolver', 'kevlar', 'shotgun', 'strawhat', 'army', 'football', 'lifejacket', 'hawaii', 'beekeeper', 'footpads', 'cookware', 'bubblewrap', 'cardboard', 'mattress', 'phonebook', 'tyre', 'pillow', 'skisuit', 'ducttape', 'barrel', 'goalie', 'chef', 'medic', 'mechanic', 'garden', 'hivis'], id = pool[Math.floor(Math.random() * Math.min(pool.length, 4 + Math.round(rk.mult * 1.6)))]; t.items = (t.items || []).concat(id); got.push(ITEMS[id].name); }
    if (o.win.recruit) { if (popNow() < popCap()) { t.recruitNow = true; got.push('The survivor will follow the squad home.'); } else { const n = r([1, 2]); t.loot.food += n; t.ren = (t.ren || 0) + 3; got.push(`The Haven has no room, so the survivor gave them ${n} food (+3 Renown)`); } }
    if (o.win.gift) { const n = r([1, 2]); t.loot.food += n; t.loot.water += n; got.push(`They threw down ${n} food and ${n} water in thanks.`); }
    if (o.win.ren) { t.ren = (t.ren || 0) + o.win.ren; got.push(`(+${o.win.ren} Renown)`); }
    if (o.win.xp) encLive(t).forEach((m) => { m.xpB = (m.xpB || 0) + o.win.xp; });
    if (actor && !o.safe) actor.xpB = (actor.xpB || 0) + 3;
  }
  if (!ok) {
    if (o.fail === 'hurt') who = hurtOne(actor) || who;
    if (o.fail === 'hurt2') { const L = encLive(t).sort(() => Math.random() - .5).slice(0, 2); who = L.map(hurtOne).filter(Boolean).join(' and ') || who; }
    if (o.fail === 'toll') for (const k in t.loot) t.loot[k] = 0;
    if (o.fail === 'sick' && actor) { actor.hp = Math.max(1, Math.round(actor.hp - actor.max * .15)); if (!t.hurt.includes(actor.name)) t.hurt.push(actor.name); }
  }
  const txt = (ok ? o.winT : o.failT || '').replace('{who}', who).replace('{got}', got.join(', ') || 'nothing much');
  t.log.push(`${E.title.replace(/^\S+\s/, '')}: ${lead ? `no orders came, so ${lead.name}${TRAITS[lead.trait] ? ' (' + TRAITS[lead.trait].name + ')' : ''} chose “${o.label}”. ` : `“${o.label}”: `}${txt}`);
  t.choices = (t.choices || 0) + 1; if (o.recall && t.phase === 'out') expRecall(); return { ok, text: txt, opt: o.id };
}
function encButtons(t) {
  const en = t.enc, E = EXP_ENC[en.k];
  return E.opts.map((o, i) => { const od = en.opts[i]; return { label: `${o.label}<small class="encOdds">${o.safe ? (o.toll ? 'lose half the haul' : o.recall ? 'safe · ends the trip' : 'safe') : `${o.chk === 'fight' ? 'FIGHT' : STAT_ABBR[o.chk]} · ${esc(od.who)} · ${Math.round(od.chance * 100)}%`}</small>`, fn: () => encChoose(en, i) }; });
}
function encChoose(en, i) {   /* a stale pop-up (the squad already decided) does nothing */
  const t = S.trip; if (!t || t.enc !== en) { say('The squad already decided.'); return; }
  const r = encResolve(t, i); if (r) { say(r.text.length > 90 ? r.text.slice(0, 88) + '…' : r.text, true); saveGame(); if (expOpen) showExpedition(); }
}
function encPopup(t) {
  const en = t.enc, E = EXP_ENC[en.k];
  showEventPopup({ encRef: en, valid: () => !!S.trip && S.trip.enc === en, title: E.title, text: `${E.text}<br><small>Squad: ${t.members.map((m) => esc(m.name) + ' ' + traitIcon(m) + ' ' + (m.collapsed || m.hp <= 0 ? 'collapsed, being carried' : Math.ceil(m.hp) + '/' + m.max)).concat((t.lost || []).map((n) => esc(n) + ' 💀 lost')).join(' · ')}</small><br><small>No order before the next stage and the squad decides for itself.</small>`, buttons: encButtons(t) });
}
function tripUpdate(now = (expNow())) {
  const t = S.trip; if (!t) return;
  if (t.phase === 'out') {
    let guard = 0; while (t.phase === 'out' && t.stage < EXP_STAGES && now >= expStageAt(t, t.stage + 1) && guard++ < 5) { const res = expResolveStage(t, now - expStageAt(t, t.stage + 1) > ((3 * EXP_HMS))); if ((res !== 'wiped')) t.fx = { stage: t.stage, at: now, bad: res === 'trouble', got: t.lastGot }; if (res === 'wiped') { expFinish(false); return; } }
    if (t.phase === 'out' && t.stage >= EXP_STAGES) { t.phase = 'back'; t.home = true; t.backFrom = now; t.backPos = 1; t.backAt = now + t.dur * .3; t.log.push('Heading home with the loot.'); }
  } else if (t.phase === 'back' && now >= t.backAt) expFinish(!t.home);
}
function expRecall() {
  const t = S.trip; if (!t || t.phase !== 'out') return false; const now = (expNow()), back = (Math.max(.4 * EXP_HMS, (now - t.t0) * .5));
  t.phase = 'back'; t.backAt = now + back; t.backFrom = now; t.backPos = Math.min(1, (now - t.t0) / t.dur); if (t.enc) { t.enc = null; t.log.push('The squad left the situation behind.'); } t.log.push(`Recalled during stage ${t.stage + 1}. Loot from finished stages is kept; walking home.`); say('The squad is on its way home.', true); saveGame(); ui(); return true;
}
function expFinish(recalled) {
  const t = S.trip; if (!t) return; if (t.enc) { if (recalled) { t.enc = null; t.log.push('The squad left the situation behind on the way home.'); } else encResolve(t, null); } S.expCount = (S.expCount || 0) + 1; const d = EXP_DEFS[t.dest], rk = EXP_RISK[t.risk], lines = [];
  if (recalled && t.risk !== 'low') for (const m of [...t.members]) if (Math.random() < EXP_BACK_DEATH * expRiskMult(t))   /* 3D.171 owner: low risk never kills (stage death 0 too) */ { t.members.splice(t.members.indexOf(m), 1); t.lost.push(m.name); (t.lostSv = t.lostSv || []).push(m); t.log.push(`${m.name} fell on the way home.`); }
  /* 3D.165 play-test (Rosa, Lena, June): someone lost on a trip only showed up inside the trip report. Now the town mourns them like any other death,
     they count on the morning card, and the news keeps a line that says so */
  for (const m of t.lostSv || []) { bondsOnDeath(m); for (const sl of SLOTS) { const id = m.eq && m.eq[sl]; if (id && id !== 'pipe' && rnd() < .5) stashAdd(id); } S.fallen = S.fallen || []; S.fallen.push({ name: m.name, job: m.job, l: m.l, day: S.day, cause: 'lost on a trip to ' + d.name, trait: m.trait }); note('important', `💀 ${m.name} did not come back from ${d.name}`); }
  for (const n of t.lost) if (!(t.lostSv || []).some((m) => m.name === n)) note('important', `💀 ${n} did not come back from ${d.name}`);
  (t.items || []).forEach((id) => stashAdd(id)); const cap = supplyCap(); S.food = keepCap(cap, S.food, t.loot.food); S.water = keepCap(cap, S.water, t.loot.water); S.mat += t.loot.mat; addLoot({ wood: t.loot.wood, stone: t.loot.stone, cloth: t.loot.cloth, meds: t.loot.meds, fuel: t.loot.fuel, ammo: t.loot.ammo }, 'Expedition'); S.produced += t.loot.food + t.loot.water;
  const entry = (() => { for (const w of world.walls.values()) if (w.type === 'gate' && w.y < Wd.BUILD.y0) return tc(w.x, w.y + 1); return tc(7 + OFF, 7 + OFF); })();
  barkSquad = { ids: t.members.map((m) => m.id), lost: (t.lost || []).length, at: tick + 90 };
  if (t.ren) renownGain(t.ren, 'Expedition'); t.members.forEach((m, i) => { if (m.hp > 0) gainXp(m, 3 * Math.max(1, t.stage) + (m.xpB || 0)); delete m.xpB; m.w = { x: entry.x + (i - 1) * .3, y: entry.y + (i % 2) * .3 }; delete m.collapsed; if (m.hp <= 0 && t.risk === 'low') m.hp = Math.max(1, Math.round(m.max * .1));   /* 3D.171 low risk never kills: the carried come home weak, not bleeding */
    if (m.hp > 0) m.mode = 'free'; else { m.mode = 'down'; } m.cool = 20; m.stateTicks = 60; const o = { ...m }; relinkSurvivor(o); o.why = m.hp <= 0 ? 'Collapsed — needs rescue' : 'Back from the expedition'; S.sv.push(o); });
  let recruit = null; const tot = Object.entries(t.loot).filter(([, v]) => v).map(([k, v]) => `${RES_ICON[k] || k} ${v}`).concat((t.items || []).map((id) => ITEMS[id].name));
  if (t.members.length && S.sv.length + (S.kids || []).length < popCap() && (t.recruitNow || (d.recruit && t.stage >= EXP_STAGES && S.sv.length < 10 && Math.random() < d.recruit[t.risk]))) {
    const names = ['Noah', 'Maya', 'Eli', 'June', 'Rosa', 'Theo', 'Iris', 'Omar'], nm = freeFirst(names), jobs = ['Civilian', 'Scavenger', 'Guard', 'Medic', 'Farmer', 'Engineer', 'Cook', ...(hqTier() >= 2 ? ['Mechanic'] : [])], jb = jobs[Math.floor(Math.random() * jobs.length)];
    recruit = mk(nm, jb, 1, entry.x, entry.y + .6, S.sv.length); recruit.sat = 3; recruit.stateTicks = 80; recruit.src = 'trip'; S.sv.push(recruit); t.log.push(`${nm}, a ${jb} (${TRAITS[recruit.trait].icon} ${TRAITS[recruit.trait].name}), was found and followed the squad home.`);
  }
  if (t.dest === 'military' && !recalled && t.stage >= EXP_STAGES && exAdd('grenade', 1)) t.log.push('They found a grenade in an ammo crate.');
  if (d.stronghold && !recalled && t.stage >= EXP_STAGES && t.members.some((m) => m.hp > 0)) { t.log.push(`${d.name} is cleared. The squad brings home a Banner.`); setTimeout(() => earnBanner('stronghold', `The squad cleared ${d.name}.`), 400); }
  const body = t.log.map((l) => esc(l)).join('<br>') + `<br><b>Returned:</b> ${t.members.map((m) => esc(m.name)).join(', ') || 'nobody'}.` + (t.lost.length ? `<br><b style="color:#ff8a7a">Lost:</b> ${t.lost.map(esc).join(', ')}.` : '');
  note('routine', `Squad back from ${d.name}: ${tot.length ? tot.join(', ') : 'nothing found'}` + (t.lost.length ? ` · lost ${t.lost.join(', ')}` : '') + (t.members.some((m) => m.hp <= 0) ? ` · ${t.members.filter((m) => m.hp <= 0).map((m) => m.name).join(', ')} carried home` : '') + '.');
  S.lastTrip = { dest: t.dest, risk: t.risk, loot: t.loot, lost: t.lost.slice(), recalled: !!recalled, recruit: recruit && recruit.name };
  vehReturn(t); S.trip = null; autoStaff(); if ((!window.ZH_NO_REVEAL)) lootReveal({ title: 'EXPEDITION BACK', sub: `${d.icon} ${d.name} · ${rk.label} risk`, entries: lootEntries(t.loot, t.items), note: body }); else showEventPopup({ title: 'EXPEDITION REPORT', text: `<b>${d.name}</b> · ${rk.label} risk<br>${body}`, gains: tot.length ? '+' + tot.join(' · +') : 'Nothing found' }); saveGame(); ui(); expTick();
}
