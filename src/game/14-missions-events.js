/* ---------------- V2.23 missions (10 kinds, scaled by rank) and story events with choices ---------------- */
const MISSION_DEFS = [
  { id: 'clear', name: 'Clear the Perimeter', desc: (g) => `Defeat ${g} zombies`, goal: 6, parts: 5, ren: 6, count: () => S.kills },
  { id: 'produce', name: 'Keep the Town Supplied', desc: (g) => `Produce ${g} food and water`, goal: 18, parts: 4, ren: 5, count: () => Math.floor(S.produced) },
  { id: 'build', name: 'Expand the Haven', desc: (g) => `Construct ${g} new building${g > 1 ? 's' : ''}`, goal: 1, parts: 4, ren: 5, count: () => S.builtCount, step: .5 },
  { id: 'research', name: 'Push the Science', desc: () => 'Complete a research project', goal: 1, parts: 6, ren: 6, count: () => Object.keys(S.res || {}).length, step: 0, cond: () => bOf('workshop').length && Object.keys(RESEARCH).some((k) => !researched(k)) },
  { id: 'train', name: 'Training Regime', desc: (g) => `Gain ${g} stat point${g > 1 ? 's' : ''} by training`, goal: 2, parts: 5, ren: 6, count: () => S.trainPts || 0, cond: () => ['gym', 'library', 'lounge', 'range', 'track', 'sparring'].some((t) => bOf(t).length) },
  { id: 'raiders', name: 'Bandit Hunt', desc: (g) => `Defeat ${g} raider${g > 1 ? 's' : ''}`, goal: 2, parts: 7, ren: 7, count: () => S.raiderKills || 0, step: .4, cond: () => S.day >= 3 },
  { id: 'expedition', name: 'Into the Wasteland', desc: () => 'Complete an expedition', goal: 1, parts: 5, ren: 6, count: () => S.expCount || 0, step: 0, cond: () => S.sv.length >= 5 },
  { id: 'friends', name: 'Community Spirit', desc: () => 'Two survivors become friends', goal: 1, parts: 4, ren: 6, count: () => S.friendsMade || 0, step: 0, cond: () => S.sv.length >= 4 },
  { id: 'stockpile', name: 'Full Pantry', desc: (g) => `Hold ${g} food and ${g} water at once`, goal: 40, parts: 5, ren: 5, state: () => Math.min(S.food, S.water), step: .15, cond: () => supplyCap() >= 50 },
  { id: 'seal', name: 'Close the Gaps', desc: () => 'Seal the perimeter with walls', goal: 1, parts: 6, ren: 7, state: () => (Wd.perimeter(world).sealed ? 1 : 0), step: 0, cond: () => world.walls.size >= 8 && !Wd.perimeter(world).sealed },
];
function beginMission(id = null) {
  const pool = MISSION_DEFS.filter((m) => (!m.cond || m.cond()) && (!S.lastMission || m.id !== S.lastMission)), d = (id && MISSION_DEFS.find((m) => m.id === id)) || pool[Math.floor(rnd() * pool.length)] || MISSION_DEFS[0];
  const sc = 1 + (d.step ?? .5) * Math.max(0, S.rank - 1), goal = Math.max(1, Math.round(d.goal * sc)), rs = 1 + .35 * Math.max(0, S.rank - 1);
  S.mission = { id: d.id, name: d.name, desc: d.desc(goal), goal, rewardParts: Math.round(d.parts * rs), rewardRen: Math.round(d.ren * rs), progress: 0, start: d.count ? d.count() : 0 };
  S.lastMission = d.id; say('Mission: ' + d.name + ' — ' + S.mission.desc, true); ui();
}
function missionProgress() {
  stageCheck(); if (S.stage < 2) return;
  if (guideActive()) { guideProgress(); return; }
  if (!S.mission || !MISSION_DEFS.some((d) => d.id === S.mission.id)) { beginMission(); return; }
  const m = S.mission, d = MISSION_DEFS.find((q) => q.id === m.id); if (m.start === undefined) m.start = d.count ? d.count() : 0;   /* old saves */
  m.progress = Math.max(0, Math.min(m.goal, d.state ? d.state() : d.count() - m.start));
  if (m.progress >= m.goal) { S.mat += m.rewardParts; S.wood = Math.min(matCap(), (S.wood || 0) + m.rewardParts); flow('mat', 'Mission rewards', m.rewardParts); flow('wood', 'Mission rewards', m.rewardParts); screenToast('+' + m.rewardParts + ' SCRAP · mission reward'); renownGain(m.rewardRen, m.name); screenToast('MISSION COMPLETE · ' + m.name); questFlash(); SFX('reward'); S.mission = null; setTimeout(() => beginMission(), 1200); }
}
/* 3D.104 factions */
const FACTIONS = { toll: { name: 'The Toll Kings', icon: '👑', desc: 'A warlord gang that taxes the highway. Mostly melee.' }, green: { name: 'Greenwater Commune', icon: '🌿', desc: 'Farmers by the river. Friendly; they trade and ask for help.' },
  foundry: { name: 'The Foundry', icon: '🏭', desc: 'A rival town that makes its own heavy gear. Good customers; they remember a bad deal.' }, quar: { name: 'Quarantine Command', icon: '🪖', desc: 'What is left of the army. They watch how sick your town is.' }, helix: { name: 'Helix Biotech', icon: '🧬', desc: 'The company that says it had nothing to do with it. They want one of your people.' }, hollow: { name: 'The Hollow', icon: '🕯', desc: 'A cult that walks inside the hordes and whispers to the unhappy. No deals.' } };
function fac(k) { S.fac = S.fac || {}; return (S.fac[k] ||= { att: k === 'green' ? 10 : k === 'toll' ? -20 : 0, met: false }); }
const facOk = (k) => !(fac(k).goneUntil > S.day);
function facAttText(a) { return a >= 60 ? 'Friendly' : a >= 25 ? 'Warm' : a > -25 ? 'Wary' : a > -60 ? 'Hostile' : 'At war'; }
function factionsHtml() { return crisisCard() + `<div class="card"><b>🎯 Stronghold practice</b><div class="sm">Try the squad controls on any stronghold or faction camp. Nothing is lost.</div><button class="act" id="shPrac">Practice</button></div>` + `<div class="card"><b>Raids</b><div class="sm">Hit a faction camp with up to ${shCap(true)} people: steal their stockpile, free their prisoners or take out their leader. They will remember.</div><div class="row" style="gap:6px;flex-wrap:wrap">${['raid_toll', 'raid_green', 'raid_foundry', 'raid_quar', 'raid_helix', 'raid_hollow'].filter((k) => k === 'raid_toll' || k === 'raid_green' || ((S.fac || {})[EXP_DEFS[k] && SH_DEFS[k].raid] || {}).met).map((k) => `<button class="act" data-raid="${k}" ${expLocked(k) ? 'disabled' : ''} title="${esc(expLocked(k))}">${EXP_DEFS[k].icon} ${EXP_DEFS[k].name.replace('Raid: ', '')}${expLocked(k) ? ` <small>(${esc(expLocked(k))})</small>` : ''}</button>`).join('')}</div></div>` + `<div class="card"><b>Factions</b>${Object.entries(FACTIONS).map(([k, F]) => { const f = (S.fac || {})[k]; return `<div class="row" style="gap:6px;margin-top:3px"><span>${F.icon}</span><span class="sp"><b>${F.name}</b><br><small>${f && f.met ? `${facAttText(f.att)} (${Math.round(f.att)})${f.ally ? ' · ally' : ''}${f.goneUntil > S.day ? ` · beaten, regroup day ${f.goneUntil}` : ''}${k === 'foundry' && !f.ally ? ` · renown: them ${Math.round(f.ren || 0)}, you ${Math.round(S.ren)}` : ''}${k === 'quar' ? ` · infection ${Math.round(f.inf || 0)}%${S.cordon > S.day ? ` · cordon until day ${S.cordon}` : ''}` : ''}${k === 'helix' && f.immune ? ` · they want ${esc(f.immune)}${f.taken ? ' (taken)' : ''}` : ''}${k === 'hollow' ? ` · their interest ${Math.round(f.int || 0)}%` : ''}` : 'Not met yet'} · ${F.desc}</small></span>${k === 'quar' && f && f.met && (f.inf || 0) >= 20 ? `<button class="act" id="quarClean" style="flex:0 0 auto;margin:0" ${(S.meds || 0) < 3 ? 'disabled' : ''}>Clean up · 💊 3</button>` : ''}</div>`; }).join('')}</div>`; }
function allyDaily() { for (const k of ['toll', 'green', 'foundry', 'quar', 'helix', 'hollow']) { const F = (S.fac || {})[k]; if (F && F.revenge && S.day >= F.revenge && !bossNear()) {   /* 3D.252: not on a boss day or the day before; it waits */ F.revenge = 0; if (!(F.goneUntil > S.day)) { radio(k, rLine(k + 'Rev'), { level: 'important' }); banner(`${FACTIONS[k].icon} ${FACTIONS[k].name.replace(/^The /, '').toUpperCase()} AT THE GATE`); spawnRaid(k); } } }
  foundryDaily(); quarDaily(); helixDaily(); hollowDaily();   /* 3D.114 raids have consequences */
  const g = (S.fac || {}).green; if (g && g.ally && S.day % 4 === 0) { S.food = keepCap(supplyCap(), S.food, 6); S.water = keepCap(supplyCap(), S.water, 6); radio('green', rLine('greenGift'), { key: 'gift', more: '🍖 +6 &nbsp; 💧 +6' }); } const t = (S.fac || {}).toll; if (t && t.goneUntil && t.goneUntil === S.day) { t.goneUntil = 0; t.att = -40; t.defied = 0; t.str = .6; radio('toll', rLine('tollBack'), { level: 'important', more: 'The Toll Kings have regrouped on the highway, weaker than before.' }); } }
/* ======================= 3D.137 THE FOUNDRY (the rival town; first of the four missing factions) =======================
   A town like yours that makes heavy gear. It starts as a customer: it buys wood and stone and pays in steel, and at attitude 50 offers to be
   sister towns (an Alliance Banner and a crate every 5 days). But it keeps score: it has a renown of its own that grows every day, and when
   the Haven pulls ahead it turns jealous. Jealous means saboteurs at night (water spoiled, scrap stolen, a wall section cut), which a manned
   guard post or a dog can catch. At -60 it is war: armoured raids every 4 days, the Forgemaster himself in every third. Beat him (at your
   gate or in their yard) for a Victory Banner; or buy a truce; or stay behind them on purpose. */
const FOUNDRY_GEAR = ['kevlar', 'riot', 'military', 'plate', 'riothelm', 'hardhat', 'shotgun', 'rifle', 'sledge', 'katana'];
const foundryGear = () => facGear('foundry');   /* 3D.147 tiered */
const facAdd = (k, n) => { const F = fac(k); F.att = Math.max(-100, Math.min(100, (F.att || 0) + n)); return F; };
function foundryDaily() {
  const F = (S.fac || {}).foundry; if (!F || !F.met) return; if (F.goneUntil && F.goneUntil === S.day) { F.goneUntil = 0; F.att = -30; F.war = false; F.ren = Math.round(S.ren * .7); radio('foundry', rLine('foundryBack'), { level: 'important' }); } if (F.goneUntil > S.day) return;
  if (F.ally) { if (S.day % 5 === 0) { const id = foundryGear(); stashAdd(id); S.mat += 6; radio('foundry', rLine('foundryGift'), { key: 'fgift', more: `⚙ +6 and a ${ITEMS[id].name} for the stash.` }); } return; }
  F.ren = (F.ren || 0) + 5 + (S.lvl || 1) * .6;   /* their town grows too */
  /* 3D.138 owner: it felt wrong that more renown made them hate you. A famous Haven earns respect (+1 a day up to 40 while you lead);
     they turn hostile over how you treat them: orders refused or overcharged, their people poached, their yard raided. */
  if (S.ren > F.ren && F.att < 40 && F.att > -25) { facAdd('foundry', 1); if (!F.jealSaid || S.day - F.jealSaid >= 8) { F.jealSaid = S.day; radio('foundry', rLine('foundryJeal'), { key: 'fjeal', more: `The Foundry keeps score. Their renown is ${Math.round(F.ren)}, yours is ${Math.round(S.ren)}. While you lead, they respect you a little more each day.` }); } }
  if (F.att <= -60 && !F.war) { F.war = true; F.warNext = S.day + 1; F.warN = 0; radio('foundry', rLine('foundryWar'), { level: 'important', more: 'The Foundry has declared war. Expect armoured raids every few days until their Forgemaster falls or you buy a truce.' }); }
  if (F.war && S.day >= (F.warNext || 0)) { F.warNext = S.day + 4; F.warN = (F.warN || 0) + 1; F.raidAt = S.day; }
  else if (!F.war && F.att <= -25 && S.day >= (F.sabNext || 0)) { F.sabNext = S.day + 3; F.sabAt = S.day; }
}
function foundryHour() {
  const F = (S.fac || {}).foundry; if (!F || !F.met || F.goneUntil > S.day) return;
  if (F.raidAt === S.day && bossNear()) F.raidAt = S.day + 1;   /* 3D.252 (W172): no raid on a boss day or the day before, it moves a day */
  if (F.raidAt === S.day && S.hour === 20) { F.raidAt = 0; banner('🏭 THE FOUNDRY MARCHES IN'); spawnRaid('foundry', F.warN % 3 === 0); }
  if (F.sabAt === S.day && S.hour === 2) { F.sabAt = 0; foundrySabotage(); }
}
function foundrySabotage() {
  const F = fac('foundry'), watch = (S.posts || []).some((p) => p.cur) || S.sv.some((q) => q.purpose === 'patrol' && q.hp > 0), dog = S.sv.some((q) => q.pet && q.pet.kind === 'dog'), light = anyPowered('floodlight');
  const caught = rnd() < (watch ? .55 : .1) + (dog ? .25 : 0) + (light ? .15 : 0);
  if (caught) { facAdd('foundry', -2); return showEventPopup({ title: '🏭 CAUGHT AT THE FENCE', text: `${dog ? 'The dogs' : 'The night watch'} caught someone in Foundry overalls with a saw and a very poor excuse.`, buttons: [
    { label: 'Send them home with a warning', fn: () => { facAdd('foundry', 12); renownGain(3, 'Mercy'); result('🏭 SENT HOME', 'They leave quickly. Word gets back that the Haven plays fair.', 'The Foundry cools down a little'); } },
    { label: popNow() >= popCap() ? `Offer them a job · no room (${popNow()}/${popCap()})` : 'Offer them a job', disabled: popNow() >= popCap(), fn: () => { const v = newcomer('Engineer', 3); facAdd('foundry', -12); result('🏭 A NEW ENGINEER', v ? `${v.name} thinks about it for one second and stays. The Foundry is furious.` : 'There was no room after all.'); } },
    { label: 'Ransom them back', fn: () => { S.mat += 15; facAdd('foundry', -5); ui(); result('🏭 PAID IN STEEL', 'The Foundry pays up, through gritted teeth.', '⚙ +15'); } }] }); }
  facAdd('foundry', -4); const r = rnd(); let what;
  if (r < .34 && S.water > 6) { const n = Math.round(S.water * .35); S.water -= n; what = `Somebody tipped lamp oil into the water. 💧 −${n}`; }
  else if (r < .67 && S.mat > 8) { const n = Math.min(20, Math.round(S.mat * .25)); S.mat -= n; what = `The scrap pile is lighter this morning. ⚙ −${n}`; }
  else { const ws = allWalls().filter((w) => !w.broken && w.type !== 'gate'); if (ws.length) { const w = ws[Math.floor(rnd() * ws.length)]; w.hp = 0; w.broken = true; Wd.bump(world); what = 'A section of the wall was cut through in the night.'; } else { const n = Math.min(10, Math.round(S.mat * .2)); S.mat -= n; what = `Tools went missing. ⚙ −${n}`; } }
  ui(); radio('foundry', rLine('foundrySab'), { level: 'important', title: 'Sabotage', more: `${what}<br><br>Nobody was on watch. A manned guard post, a dog or a Floodlight makes a saboteur much easier to catch.` });
}
/* ======================= 3D.138 QUARANTINE COMMAND, HELIX BIOTECH, THE HOLLOW (the other three missing factions) =======================
   Same depth as the Foundry: each tests a different part of the town, has a radio voice, story cards, a hostile and (except the Hollow)
   a friendly ending, raids on the Haven and a camp of its own to raid.
   - Quarantine Command watches an INFECTION number (wounded and hurt people and deaths push it up; medical buildings and Medics pull it down).
     Clean town: a supply drop every 5 days, and at attitude 50 Safe Zone status (Alliance Banner, weekly crate, a soldier joins).
     Sick town: a warning at 40, a cordon (no trips) at 60, and at 80 one day to fix it before they burn a building.
   - Helix Biotech wants one survivor who shrugged off a bite. Give blood for research and gear (friendly), or refuse: retrieval teams come
     for that survivor, and if they carry them off the only way back is a raid on the field lab. Refuse long enough and the Stalker hunts
     for three nights; killing it gives the vaccine (field wounds half as often).
   - The Hollow cannot be dealt with. Their interest rises with unhappy survivors and deaths. They whisper to the unhappy (who may walk out
     and leave a gate cut open), walk a Shepherd in with the night horde (extra waves until he is killed), and finally bring the Alpha. */
const FAC_RAID = { foundry: { hp: 1.35, lead: 'The Forgemaster' }, quar: { hp: 1.25, pw: 1.25, lead: 'Captain Vance' }, helix: { hp: 1.5, pw: 1.2, lead: 'The Handler' }, hollow: { hp: .9, pw: 1.1, lead: 'The Shepherd' } };
const FAC_GEAR = { foundry: FOUNDRY_GEAR, quar: ['military', 'army', 'assault', 'rifle', 'tactical', 'swatarmor', 'kneepads', 'walkie'], helix: ['hazmat', 'gasmask', 'swatarmor', 'smg', 'assault', 'headlamp', 'medpouch', 'goggles'], hollow: ['ghillie', 'machete', 'cleaver', 'bandana', 'charm', 'spiked', 'hatchet'] };
/* 3D.147 faction gear tiers: beat a faction's leader (or become allies) and their better kit starts turning up, in their camps, their gifts and their trades */
const FAC_TIER = {
  toll: [['roadsign', 'spiked', 'biker', 'bikehelm'], ['riot', 'revolver', 'football', 'kevlar'], ['magnum', 'riothelm', 'plate', 'shotgun']],
  green: [['bow', 'raincoat', 'hoodie', 'strawhat', 'shovel'], ['crossbow', 'leather', 'hikerpack', 'medpouch'], ['crossbow', 'ghillie', 'toolbelt', 'dogtags']],
  foundry: [['hardhat', 'hatchet', 'kneepads', 'leather', 'toolbelt'], ['sledge', 'riot', 'shotgun', 'riothelm', 'kevlar'], ['plate', 'military', 'katana', 'rifle']],
  quar: [['army', 'kneepads', 'walkie', 'rifle'], ['kevlar', 'tactical', 'military', 'revolver'], ['assault', 'swatarmor', 'swathelm']],
  helix: [['headlamp', 'medpouch', 'gasmask', 'goggles'], ['hazmat', 'smg', 'tactcap'], ['swatarmor', 'assault', 'swathelm']],
  hollow: [['bandana', 'cleaver', 'hatchet', 'charm'], ['machete', 'ghillie', 'spiked'], ['axe', 'katana', 'dogtags']],
};
const facTier = (k) => { const F = (S.fac || {})[k] || {}; return Math.min(2, (F.beaten || 0) + (F.ally ? 1 : 0)); };
const facPool = (k) => { const T = FAC_TIER[k]; if (!T) return (FAC_GEAR[k] || FOUNDRY_GEAR).filter((id) => ITEMS[id]); const t = facTier(k), top = T[t].filter((id) => ITEMS[id]); return rnd() < .6 && top.length ? top : T.slice(0, t + 1).flat().filter((id) => ITEMS[id]); };
const facGear = (k) => { const L = facPool(k); return L[Math.floor(rnd() * L.length)]; };
function facTierUp(k, t0) { const t = facTier(k); if (t > t0 && FACTIONS[k]) radio('dj', [`Word is ${FACTIONS[k].name} are scraping the bottom of the armoury now.`, t === 2 ? 'Their best kit is turning up in their camps and their trades.' : 'Better pieces of their kit will turn up in what you take from them.'], { key: 'tier' + k, level: 'important' }); }
const facLive = (k) => { const F = (S.fac || {})[k]; return F && F.met && !(F.goneUntil > S.day) ? F : null; };
function facBack(k, att) { const F = (S.fac || {})[k]; if (F && F.goneUntil && F.goneUntil === S.day) { F.goneUntil = 0; F.att = att; F.war = false; radio(k, rLine(k + 'Back'), { level: 'important' }); } }

/* ---- Quarantine Command ---- */
function infectionNow() {
  const hurt = S.sv.filter((q) => q.wounded).length, low = S.sv.filter((q) => !q.wounded && q.hp < q.max * .5).length, F = fac('quar'), dead = Math.max(0, (S.fallen || []).length - (F.dead0 || 0));
  const med = world.buildings.reduce((a, b) => a + ({ medic: 6, clinic: 10, hospital: 16 }[b.type] || 0), 0) + 3 * S.sv.filter((q) => q.job === 'Medic').length;
  return { hurt, low, dead, med, target: Math.max(0, Math.min(100, 8 + 12 * hurt + 6 * low + 18 * dead - med)) };
}
function quarDaily() {
  facBack('quar', -20); const F = facLive('quar'); if (!F) return; const I = infectionNow(); F.inf = Math.round((F.inf || 0) + (I.target - (F.inf || 0)) * .45); F.dead0 = (S.fallen || []).length;
  const inf = F.inf, why = `Infection ${inf}%. Up: ${I.hurt} wounded, ${I.low} badly hurt, ${I.dead} lost since yesterday. Down: medical buildings and Medics (−${I.med}).`;
  if (S.cordon > S.day && inf < 50) { S.cordon = 0; radio('quar', rLine('quarOk'), { key: 'qok', more: why }); }
  if (F.fireDay && S.day >= F.fireDay) { F.fireDay = 0; if (inf >= 60) { const L = world.buildings.filter((b) => b.type !== 'hq' && !b.fire && !b.burnt), b = L[Math.floor(rnd() * L.length)]; if (b) startFire(b, 60, 'Quarantine Command'); facAdd('quar', -10); radio('quar', rLine('quarBurn'), { level: 'important', more: `${b ? DEFS[b.type].name : 'A building'} was firebombed. ${why}` }); } else { facAdd('quar', 6); radio('quar', rLine('quarOk'), { key: 'qok', more: why }); } }
  else if (inf >= 80 && !F.fireDay) { F.fireDay = S.day + 1; radio('quar', rLine('quarFire'), { level: 'important', title: 'Final notice', more: `${why}<br><br>Get it under 60% by tomorrow: treat the wounded at a medical building, or spend 💊 3 on a clean-up (Town › Factions).` }); }
  else if (inf >= 60 && !(S.cordon > S.day)) { S.cordon = S.day + 2; facAdd('quar', -4); radio('quar', rLine('quarCordon'), { level: 'important', title: 'Cordon', more: `No trips or raids until day ${S.cordon}, or until infection is under 50%.<br><br>${why}` }); }
  else if (inf >= 40 && (F.warnDay || 0) + 3 <= S.day) { F.warnDay = S.day; radio('quar', rLine('quarWarn'), { key: 'qwarn', title: 'Infection warning', more: why }); }
  if (inf < 25) { facAdd('quar', 1); if (S.day >= (F.dropDay || 0)) { F.dropDay = S.day + (F.ally ? 4 : 5); const n = F.ally ? 2 : 1; addLoot({ meds: 2 * n, ammo: 8 * n, food: 6 * n }, 'Quarantine Command'); facAdd('quar', 4); radio('quar', rLine(F.ally ? 'quarGift' : 'quarDrop'), { key: 'qdrop', more: `💊 +${2 * n}  🔸 +${8 * n}  🍖 +${6 * n}<br><br>${why}` }); } }
  if (F.att <= -50 && !F.ally && S.day >= (F.warNext || 0)) { F.warNext = S.day + 5; F.warN = (F.warN || 0) + 1; F.raidAt = S.day; }
}
function quarClean() { const F = fac('quar'); if ((S.meds || 0) < 3) return say('A clean-up needs 💊 3.'); S.meds -= 3; F.inf = Math.max(0, (F.inf || 0) - 25); SFX('build'); say('The town is scrubbed down. Infection −25%.', true); ui(); }

/* ---- Helix Biotech ---- */
const helixWho = () => { const F = (S.fac || {}).helix; return F && F.immune ? S.sv.find((q) => q.immune) : null; };
function helixDaily() {
  facBack('helix', -30); const F = facLive('helix'); if (!F) return; const who = helixWho();
  if (F.ally) { if (S.day % 6 === 0) { const id = facGear('helix'); stashAdd(id); addLoot({ meds: 2 }, 'Helix Biotech'); S.rp = (S.rp || 0) + 6; radio('helix', rLine('helixGift'), { key: 'hgift', more: `💊 +2, 🔬 +6 and a ${ITEMS[id].name} for the stash.` }); } return; }
  if (F.stalk && S.day >= F.stalk.next && F.stalk.n < 3) { F.stalk.n++; F.stalk.next = S.day + 1; F.stalkAt = S.day; }
  else if (!F.taken && who && F.att <= -20 && S.day >= (F.teamNext || 0)) { F.teamNext = S.day + 5; F.teams = (F.teams || 0) + 1; F.raidAt = S.day; radio('helix', rLine('helixTeam'), { level: 'important', more: `Tonight at 21:00 a Helix team comes for ${who.name}. If ${who.name} goes down while they are in town, they carry ${who.name} off.` }); if (F.teams === 3 && !F.stalk) F.stalk = { n: 0, next: S.day + 2 }; }
}
function helixTake(q) {   /* carried off: kept (as plain data) until a raid on the field lab brings them home */
  const F = fac('helix'), o = {}; for (const k in q) if (!SKIP.has(k) && typeof q[k] !== 'function') o[k] = q[k]; let c; try { c = JSON.parse(JSON.stringify(o)); } catch (e) { c = { name: q.name, job: q.job, l: q.l, immune: true }; }
  F.taken = c; S.sv = S.sv.filter((x) => x !== q); for (const z of S.z) { if (z.target === q) z.target = null; if (z.human && z.fac === 'helix' && z.hp > 0) z.mode = 'rflee'; }
  logEvent(`Helix carried ${q.name} off to their field lab.`, 'important'); radio('helix', rLine('helixTaken'), { level: 'important', more: `${q.name} was taken. Raid the Helix field lab and open the cages to bring ${q.name} home (Town › Factions › Raids).` }); ui();
}
function helixFree(entry) { const F = fac('helix'), o = F.taken; if (!o) return null; F.taken = null; const q = mk(o.name, o.job, o.l || 1, entry.x, entry.y + .6, S.sv.length); Object.assign(q, o, { w: { x: entry.x, y: entry.y + .6 }, pv: { x: entry.x, y: entry.y + .6 }, mode: 'free', target: null, path: null, moving: false, immune: true, stateTicks: 60 }); q.hp = Math.max(1, Math.round(q.max * .4)); S.sv.push(q); return q; }
function helixStalkerDown() { const F = fac('helix'); F.stalk = null; S.vaccine = true; facAdd('helix', -5); renownGain(12, 'The Stalker'); setTimeout(() => showEventPopup({ title: '🧬 THE STALKER IS DEAD', text: 'Inside the thing your Medic finds a Helix implant and a vial marked SERUM 9. It works on people too.', gains: 'Vaccine: field wounds happen half as often, for everyone, for good' }), 1200); }

/* ---- The Hollow ---- */
function hollowDaily() {
  facBack('hollow', -60); const F = facLive('hollow'); if (!F) return; const sad = S.sv.filter((q) => (q.sat || 0) < 25), dead = Math.max(0, (S.fallen || []).length - (F.dead0 || 0)); F.dead0 = (S.fallen || []).length;
  F.int = Math.max(0, Math.min(100, (F.int || 0) + 3 * sad.length + 10 * dead + (sad.length ? 0 : -4) + 1)); F.att = -60;
  if (sad.length && S.day >= (F.whisperNext || 0)) { F.whisperNext = S.day + 3; const q = sad[Math.floor(rnd() * sad.length)]; q.hollow = (q.hollow || 0) + 1; if (q.hollow >= 2) { F.walk = q.id; } else radio('hollow', rLine('hollowWhisper'), { key: 'hwh', title: 'Whispers', more: `${q.name} is unhappy, and has been seen at the fence at night talking to someone. Cheer ${q.name} up (a Lounge, a good meal, a bed of their own) before the Hollow talk ${q.name} round.` }); }
  if (F.int >= 100 && (S.lvl || 1) >= 12 && !F.alphaDay) { F.alphaDay = S.day; F.int = 40; }
  else if (F.int >= 45 && S.day >= (F.nightNext || 0)) { F.nightNext = S.day + 4; F.nightAt = S.day; }
}
function hollowWalkOut(q) {   /* talked round: walks out at night and leaves a gate section cut open behind them */
  const ws = allWalls().filter((w) => !w.broken); if (ws.length) { const g = ws.find((w) => w.type === 'gate') || ws[Math.floor(rnd() * ws.length)]; g.hp = 0; g.broken = true; Wd.bump(world); }
  S.sv = S.sv.filter((x) => x !== q); for (const z of S.z) if (z.target === q) z.target = null; fac('hollow').int = Math.min(100, (fac('hollow').int || 0) + 15); logEvent(`${q.name} walked out to join the Hollow.`, 'important');
  showEventPopup({ title: '🕯 ' + q.name.toUpperCase() + ' IS GONE', text: `${q.name}'s bed is empty, and a section of the wall has been cut open from the inside. The Hollow have one more voice in the choir.`, gains: 'Keep everyone above "unhappy" and the Hollow have nobody to talk to' }); ui();
}

/* ---- hourly: raids, teams, the Stalker, the Shepherd's nights ---- */
function facHour() {
  const Q = facLive('quar'), X = facLive('helix'), H = facLive('hollow');
  if (Q && Q.raidAt === S.day && bossNear()) Q.raidAt = S.day + 1;
  if (Q && Q.raidAt === S.day && S.hour === 20) { Q.raidAt = 0; banner('🪖 QUARANTINE COMMAND AT THE GATE'); spawnRaid('quar', Q.warN % 3 === 0); }
  if (X) { if (X.raidAt === S.day && bossNear()) X.raidAt = S.day + 1;
    if (X.raidAt === S.day && S.hour === 21) { X.raidAt = 0; banner('🧬 HELIX RETRIEVAL TEAM'); spawnRaid('helix', X.teams % 3 === 0); }
    if (X.stalkAt === S.day && S.hour === 22) { X.stalkAt = 0; if (X.stalk && X.stalk.n === 1) radio('helix', rLine('helixStalk'), { level: 'important' }); spawnBoss('stalker', true); const b = S.z[S.z.findIndex((z) => z.type === 'boss' && z.hp > 0 && !z.helix)]; if (b) { b.helix = true; b.hp = b.max = Math.round(b.max * (.8 + .2 * X.stalk.n)); } } }
  if (H) { if (H.walk && S.hour === 3) { const q = S.sv.find((x) => x.id === H.walk); H.walk = 0; if (q && (q.sat || 0) < 25) hollowWalkOut(q); else if (q) q.hollow = 0; }
    if (H.nightAt === S.day && S.hour === 21) { radio('hollow', rLine('hollowNight'), { level: 'important', title: 'A shepherded horde', more: 'A Hollow shepherd walks in with tonight\'s horde. While he lives, more zombies arrive every hour until 02:00. Kill him and they stop coming.' }); spawnRaid('hollow', true); const L = S.z[S.z.length - 1]; L.shep = true; L.leaderDone = true; for (const z of S.z) if (z.fac === 'hollow' && z !== L) z.hp = 0; S.z = S.z.filter((z) => !(z.fac === 'hollow' && z !== L)); H.shepOn = true; }
    if (H.shepOn && (S.hour >= 22 || S.hour <= 2)) { if (S.z.some((z) => z.shep && z.hp > 0)) { const n = Math.min(3 + Math.floor((S.lvl || 1) / 3), mobCap() - activeZ()); for (let i = 0; i < n; i++) spawn(); }   /* 3D.290: only into the room left under the limit of 60 (W176) */ else { H.shepOn = false; H.int = Math.max(0, (H.int || 0) - 25); renownGain(4, 'The Shepherd'); say('The shepherd is down. The flock loses its way.', true); } }
    if (H.shepOn && S.hour === 6) { H.shepOn = false; for (const z of S.z) if (z.shep) z.mode = 'rflee'; }
    if (H.alphaDay === S.day && S.hour === 21) { radio('hollow', rLine('hollowAlpha'), { level: 'important' }); spawnBoss('butcher', true); const b = S.z.find((z) => z.type === 'boss' && z.hp > 0 && !z.helix && !z.alpha); if (b) { b.alpha = true; b.hp = b.max = Math.round(b.max * 1.5); } for (let i = 0, n = Math.min(8 + (S.lvl || 1), mobCap() - activeZ()); i < n; i++) spawn(); } }   /* 3D.290: the alpha's pack too */
  const X2 = (S.fac || {}).helix; if (X2 && X2.immune && !X2.taken) { const q = S.sv.find((x) => x.immune); if (q && q.mode === 'down' && S.z.some((z) => z.human && z.fac === 'helix' && z.hp > 0 && dist(z.w, q.w) < 6)) helixTake(q); }
}
/* story events: one a day at most; some are chains that continue a few days later */
const pickSv = (f = () => true) => { const c = S.sv.filter((q) => q.hp > 0 && !['down', 'hospital', 'away', 'errand'].includes(q.mode) && f(q)); return c.length ? c[Math.floor(rnd() * c.length)] : null; };
const storyLater = (id, days) => { S.storyQ = S.storyQ || []; S.storyQ.push({ id, day: S.day + days }); };
const pay = (c) => { if (!Object.entries(c).every(([k, v]) => S[k] >= v)) return false; for (const [k, v] of Object.entries(c)) S[k] -= v; ui(); return true; };
const result = (title, text, gains = '') => showEventPopup({ title, text, gains });
function clearSpot(v) { if (!Wd.buildingAt(world, Math.floor(v.w.x), Math.floor(v.w.y))) return; const t = Wd.nearestWalkable(world, Math.floor(v.w.x), Math.floor(v.w.y), true); if (t) v.w = tc(t.x, t.y); }   /* 3D.58: a newcomer never appears inside a building (tests: geometry) */
function newcomer(job, lvl) { if (popNow() >= popCap()) return null; const name = freeFirst(), v = mk(name, job, lvl, 7 + OFF, 9 + OFF, S.sv.length); clearSpot(v); v.sat = 20; v.src = 'event'; S.sv.push(v); return v; }
/* V3D.17 errands: event jobs done by real people. They walk out of the map (or to a crate), and walk back in. */
const ERRANDS = {
  scout: { out: 'edge', hours: 44, why: 'Scouting the radio signal', done(e, ms) { const sc = ms[0]; if (!sc) return; if (e.trap) { sc.hp = Math.max(1, Math.round(sc.max * .35)); showEventPopup({ stage: { scene: 'sad', head: 'An ambush', icon: '📻', hero: sc }, short: `It was a trap. ${sc.name} made it back, badly hurt.` }); return; } STORY.radio2.run(sc); } },
  kid: { out: 'edge', hours: 5, why: 'Searching for a lost child', done(e, ms) { if (ms.length && rnd() < .8 && popNow() < popCap()) { S.kids = S.kids || []; const name = KID_NAMES.find((n) => !S.sv.some((q) => q.name.split(' ')[0] === n) && !S.kids.some((k) => k.name === n)) || 'Kid'; S.kids.push({ name, age: 2, parents: [], st: Object.fromEntries(STATS.map((k) => [k, 4 + Math.floor(rnd() * 3)])) }); renownGain(8, 'A child saved'); showEventPopup({ stage: { scene: 'party', head: 'Safe!', icon: '🧒', badge: name, hero: ms[0], crowd: ms.slice(1) }, short: `${name} is safe and will grow up in the Haven.`, chips: ['+8 Renown'] }); } else { const s = ms.find(isFighter) || ms[0]; if (s) s.hp = Math.max(1, Math.round(s.max * .5)); showEventPopup({ stage: { scene: 'sad', head: 'Too late', icon: '🧒', hero: s || S.sv[0] }, short: 'They searched until dark and found nothing.' }); } } },
  drop: { out: 'crate', grab: 300, why: 'Fetching the supply crate', done(e, ms) { const c = (S.crates || []).find((x) => x.id === e.data.crate); S.crates = (S.crates || []).filter((x) => x !== c); if (!ms.length || !c) { banner('📦 The crate was lost'); return; } const k = c.k, n = c.n; if (c.loot) { addLoot(c.loot, 'Supply drop'); (c.items || []).forEach((id) => stashAdd(id)); } else S[k] += n; ui(); SFX('reward'); if ((c.loot) && !window.ZH_NO_REVEAL) { lootReveal({ title: 'SUPPLY CRATE', sub: `${ms.map((q) => q.name).join(' and ')} brought it home · ${RARITY[c.rar].n} crate`, entries: lootEntries(c.loot, c.items) }); return; } showEventPopup({ stage: { scene: 'party', head: 'Got it!', icon: k === 'mat' ? '⚙️' : k === 'food' ? '🍖' : '💧', badge: '+' + n, hero: ms[0], crowd: ms.slice(1) }, short: `${ms.map((q) => q.name).join(' and ')} brought the crate home.` }); } },
};
const errandOk = (q) => q.hp > q.max * .6 && !['down', 'hospital', 'away', 'errand', 'rescueTo', 'rescueCarry', 'chase', 'attack', 'recover'].includes(q.mode) && !q.carrying && !q.errand;
function errandTeam(kind, n) {   /* who goes: scouts and fighters first, healthiest first; never the last people at home */
  const pref = (q) => (kind === 'scout' ? (q.job === 'Scavenger' ? 30 : 0) : 0) + (isFighter(q) ? 20 : 0) + q.hp / q.max * 10 + (q.l || 1);
  const c = S.sv.filter(errandOk).sort((a, b) => pref(b) - pref(a)); return S.sv.length - n < 2 ? [] : c.slice(0, n);
}
function dropCrate() {   /* the crate lands outside the walls, inside the map */
  const a = spawnPoint(), cx = (Wd.BUILD.x0 + Wd.BUILD.x1) / 2, cy = (Wd.BUILD.y0 + Wd.BUILD.y1) / 2; let x = a[0], y = a[1];
  for (let i = 0; i < 6; i++) { const nx = Math.round(x + Math.sign(cx - x)), ny = Math.round(y + Math.sign(cy - y)); if (Wd.inWallZone && Wd.inWallZone(nx, ny)) break; if (!Wd.walkable(world, nx, ny)) break; x = nx; y = ny; }
  const k = ['food', 'water', 'mat'][Math.floor(rnd() * 3)], r = rnd(), rar = r < .55 ? 'common' : r < .83 ? 'uncommon' : r < .96 ? 'rare' : 'epic';   /* V3D.25: crates come in rarities */
  const loot = { [k]: 8 + Math.floor(rnd() * 5) }; if (rar !== 'common') { loot.wood = 6 + Math.floor(rnd() * 5); loot.cloth = 1 + Math.floor(rnd() * 2); } if (rar === 'rare' || rar === 'epic') { loot.meds = 1 + Math.floor(rnd() * 2); loot.fuel = 1 + Math.floor(rnd() * 2); }
  const items = rar === 'epic' ? [['kevlar', 'rifle', 'crossbow', 'katana', 'riot'][Math.floor(rnd() * 5)]] : [];
  const c = { id: 'c' + tick, w: tc(x, y), t0: tick, k, n: loot[k], loot, items, rar, until: tick + 9000 }; (S.crates ||= []).push(c); SFX('event'); return c;
}
function homeSpot() { const cx = Math.round((Wd.BUILD.x0 + Wd.BUILD.x1) / 2), cy = Math.round((Wd.BUILD.y0 + Wd.BUILD.y1) / 2), g = Wd.nearestWalkable(world, cx, cy) || { x: cx, y: cy }; return tc(g.x, g.y); }
function startErrand(kind, ms, data = {}) {
  const E = ERRANDS[kind], e = { id: 'e' + tick + kind, kind, ids: ms.map((q) => q.id), phase: 'out', data, trap: kind === 'scout' && rnd() < .25 };
  if (E.out === 'crate') { const c = (S.crates || []).find((x) => x.id === data.crate); e.target = c ? { x: c.w.x + .6, y: c.w.y } : homeSpot(); } else { const a = spawnPoint(); e.target = tc(a[0], a[1]); }
  for (const q of ms) { if (q.post) releasePost(q.post); q.facility = null; q.activity = null; q.target = null; q.dest = null; q.path = null; if (q.chatWith) endChat(q); q.mode = 'errand'; q.errand = e.id; q.arrived = false; q.atHome = false; q.why = E.why;
    const n = Math.max(1, Math.ceil((E.hours || 2) / 10)), pf = Math.min(n, Math.floor(S.food)), pw = Math.min(n, Math.floor(S.water)); S.food -= pf; S.water -= pw; q.pack = { f: pf, w: pw }; }   /* 3D.64 owner: errands pack rations (1 food + 1 water per 10 hours away), eaten on the road; leftovers come back */
  (S.errands ||= []).push(e); return e;
}
function errandAi(s) {
  const e = (S.errands || []).find((x) => x.id === s.errand); if (!e) { s.errand = null; enterFree(s, 30); return; }
  if (s.pack && tick % 120 === (s.i * 13) % 120) { if (s.hunger > 55 && s.pack.f > 0) { s.pack.f--; s.hunger = Math.max(0, s.hunger - 45); } if (s.thirst > 55 && s.pack.w > 0) { s.pack.w--; s.thirst = Math.max(0, s.thirst - 45); } }
  if (s.mode === 'away') { s.moving = false; return; }
  if (e.phase === 'out') { const r = followPath(s, e.target, WALK * 1.25); s.moving = r === 'moving'; if (r !== 'moving' || dist(s.w, e.target) < .6) { s.moving = false; s.arrived = true; if (ERRANDS[e.kind].out === 'edge') s.mode = 'away'; } return; }
  if (e.phase === 'grab') { s.moving = false; s.activity = 'Working'; s.faceW = e.target; return; }
  if (e.phase === 'back') { s.activity = null; s.faceW = null; if (s.atHome) { s.moving = false; return; } const r = followPath(s, e.home, WALK * (e.kind === 'drop' ? 1.05 : 1.15)); s.moving = r === 'moving'; if (r !== 'moving' || dist(s.w, e.home) < 1.2) { s.moving = false; s.atHome = true; } }
}
function errandsTick() {
  for (const c of S.crates || []) if (!c.taken && tick > c.until && !(S.errands || []).some((e) => e.data.crate === c.id)) c.gone = true;
  if (S.crates) S.crates = S.crates.filter((c) => !c.gone);
  for (const e of (S.errands || []).slice()) {
    const ms = S.sv.filter((q) => q.errand === e.id), live = ms.filter((q) => q.mode === 'errand' || q.mode === 'away');
    if (!live.length) { finishErrand(e, ms, []); continue; }
    if (e.phase === 'out' && live.every((q) => q.arrived)) {
      if (ERRANDS[e.kind].out === 'edge') { e.phase = 'away'; e.until = tick + ERRANDS[e.kind].hours * 1000; }
      else { e.phase = 'grab'; e.t = ERRANDS.drop.grab; const c = (S.crates || []).find((x) => x.id === e.data.crate); if (c) { c.grabT = e.t; for (let i = 0; i < 3 + Math.floor(S.day / 6); i++) { const a = spawnPoint(); spawn(a[0], a[1]); const z = S.z[S.z.length - 1]; z.target = live[i % live.length]; z.mode = 'zchase'; } } S.alert = Math.max(S.alert, 600); }
    }
    if (e.phase === 'grab') { const c = (S.crates || []).find((x) => x.id === e.data.crate); if (c) c.grab = 1 - e.t / ERRANDS.drop.grab; if (--e.t <= 0) { e.phase = 'back'; e.home = homeSpot(); if (c) { c.taken = true; c.by = live[0].id; } } }
    if (e.phase === 'away' && tick >= e.until) { e.phase = 'back'; e.home = homeSpot(); for (const q of live) { q.mode = 'errand'; q.w = { ...e.target }; q.path = null; q.atHome = false; } }
    if (e.phase === 'back') { const c = (S.crates || []).find((x) => x.id === e.data.crate); if (c && c.taken) { const by = S.sv.find((q) => q.id === c.by && q.mode === 'errand') || live[0]; c.by = by.id; c.w = { x: by.w.x, y: by.w.y }; } if (live.every((q) => q.atHome)) finishErrand(e, ms, live); }
  }
}
function finishErrand(e, ms, live) {
  S.errands = (S.errands || []).filter((x) => x !== e);
  for (const q of ms) { if (q.pack) { S.food += q.pack.f; S.water += q.pack.w; q.pack = null; } q.errand = null; q.arrived = false; q.atHome = false; q.activity = null; q.faceW = null; if (q.mode === 'errand' || q.mode === 'away') enterFree(q, 30); }
  ERRANDS[e.kind].done(e, live);
}
const STORY = {
  radio1: { cond: () => S.day >= 4 && !!errandTeam('scout', 1).length, w: 2, run: () => { const sc = errandTeam('scout', 1)[0]; if (!sc) return; showEventPopup({ title: '📻 A RADIO SIGNAL', text: 'The radio crackles: a voice repeating coordinates, then static.', stage: { scene: 'radio', head: 'Radio signal', team: [sc], who: sc.name + ' can go' }, short: 'Someone is out there… or it\'s a trap.', chips: ['Trip: about 2 days', '🍖3 💧3'], buttons: [
    { label: `Send ${sc.name}`, fn: () => { if (!pay({ food: 3, water: 3 })) return banner('📻 Not enough supplies for the trip'); startErrand('scout', [sc]); banner({ t: `📻 ${sc.name} set off. Back in about 2 days`, who: sc }); } },
    { label: 'Ignore it', fn: () => {} }] }); } },
  radio2: { chain: true, run: (sc) => showEventPopup({ title: '📻 THE BUNKER', text: 'The scout found a sealed bunker with a small group of survivors who have been hiding for months.', stage: sc ? { scene: 'arrive', head: sc.name + ' is back!', icon: '📻', badge: 'A bunker', hero: sc, crowd: others(sc) } : null, short: 'Found a sealed bunker full of survivors.', buttons: [
    { label: popNow() >= popCap() ? `Invite them in · no room (${popNow()}/${popCap()})` : 'Invite them in', disabled: popNow() >= popCap(), fn: () => { const a = newcomer(rnd() < .5 ? 'Engineer' : 'Medic', 2 + Math.floor(rnd() * 2)), b = rnd() < .5 ? newcomer('Guard', 2) : null; storyLater('radio3', 3); result('📻 NEW ARRIVALS', a ? `${[a, b].filter(Boolean).map((q) => q.name + ' (' + q.job + ' Lv.' + q.l + traitTag(q) + ')').join(' and ')} joined the Haven.` : 'There was no room in the Haven, so they stayed in the bunker — but they\'ll remember you.', a ? '' : '+8 scrap as thanks'); if (!a) S.mat += 8; } },
    { label: 'Trade with them (+10 scrap)', fn: () => { S.mat += 10; storyLater('radio3', 3); ui(); } }] }) },
  radio3: { chain: true, run: () => { const id = ['rifle', 'riot', 'goggles', 'charm', 'axe'][Math.floor(rnd() * 5)]; stashAdd(id); renownGain(15, 'The bunker'); result('📻 A GIFT FROM THE BUNKER', 'The bunker people send a runner with a map of a hidden cache. Your scouts recover it.', `${ITEMS[id].name} added to the stash · +15 Renown`); } },
  /* 3D.104 FACTIONS, first pass (approved order: the Toll Kings and Greenwater Commune first). Each faction has an attitude (-100..100) and
     comes to the Haven through visits. The Toll Kings demand tolls on the highway; defy them twice and the Toll Collector rides in himself:
     beat him for a Victory Banner (they regroup after ~60 days). Greenwater trades and asks for help; at attitude 50 they offer an alliance
     (an Alliance Banner, and gifts every few days). */
  toll1: { cond: () => S.day >= 5 && !bossNear() && facOk('toll') && (S.fac.toll.next || 0) <= S.day, w: 1.6, run: () => { const F = fac('toll'), toll = 6 + 2 * (S.lvl || 1); F.met = true; F.next = S.day + 5; showEventPopup({ title: '👑 THE TOLL KINGS', text: `Riders in road-sign armour block the highway ramp. "This road belongs to the Toll Kings. ${toll} scrap, and your people come and go in peace. Or don't pay, and see what happens."`, stage: { scene: 'danger', head: 'The Toll Kings', icon: '👑', badge: 'Toll', hero: S.sv[0], crowd: S.sv.slice(1, 3) }, short: `The Toll Kings want ${toll} scrap.`, buttons: [
    { label: `Pay ${toll} scrap`, fn: () => { if (!pay({ mat: toll })) { F.att -= 10; F.defied = (F.defied || 0) + 1; spawnRaid('toll'); return result('👑 THEY ATTACK', 'You couldn\'t pay. The Toll Kings ride in!'); } F.att = Math.min(100, F.att + 6); S.nextRaid = Math.max(S.nextRaid, S.day + S.hour / 24 + 4); result('👑 TOLL PAID', 'They take the scrap and leave. No raids for 4 days.'); } },
    { label: 'Refuse', fn: () => { F.att = Math.max(-100, F.att - 15); F.defied = (F.defied || 0) + 1; spawnRaid('toll'); if (F.defied >= 2 && !F.leaderDue) { F.leaderDue = true; storyLater('toll3', 2); } result('👑 THEY ATTACK', F.defied >= 2 ? 'The riders charge. One of them shouts back: "The Collector will hear of this!"' : 'The riders charge the Haven!'); } }] }); } },
  toll3: { chain: true, run: () => { const F = fac('toll'); spawnRaid('toll', true); showEventPopup({ title: '👑 THE TOLL COLLECTOR', text: 'The leader of the Toll Kings rides in himself, a road sign for a shield, with his best riders. Beat him and the Toll Kings are finished on this road.', stage: { scene: 'danger', head: 'The Toll Collector', icon: '👑', badge: 'Leader', hero: S.sv[0], crowd: S.sv.slice(1, 3) }, short: 'The Toll Collector attacks!' }); F.leaderDue = false; } },
  green1: { cond: () => S.day >= 3 && facOk('green') && fac('green').att < 50, w: 1.4, run: () => { const F = fac('green'); F.met = true; showEventPopup({ title: '🌿 GREENWATER COMMUNE', text: 'Farmers from Greenwater, a commune by the river, stop at the Haven with a handcart. "We trade, we don\'t take. Got anything to share?"', stage: { scene: 'arrive', head: 'Greenwater Commune', icon: '🌿', badge: 'Visitors', hero: S.sv[0], crowd: S.sv.slice(1, 3) }, short: 'Greenwater farmers want to trade.', buttons: [
    { label: 'Trade 6 food for 10 water', fn: () => { if (!pay({ food: 6 })) return result('🌿 NOTHING TO TRADE', 'You have no food to spare. They wave and move on.'); S.water = keepCap(supplyCap(), S.water, 10); F.att = Math.min(100, F.att + 8); ui(); result('🌿 A FAIR TRADE', 'They swap water barrels for your food and promise to come back.', '+10 water · Greenwater likes you more'); } },
    { label: 'Share a meal (-5 food)', fn: () => { if (!pay({ food: 5 })) return result('🌿 NOTHING TO SHARE', 'There is nothing to share. They understand.'); F.att = Math.min(100, F.att + 15); for (const q of S.sv) q.sat = Math.min(100, (q.sat || 0) + 4); renownGain(3, 'Greenwater'); result('🌿 A GOOD EVENING', 'Stories and laughter around the fire. Greenwater will remember this.', 'Greenwater likes you a lot more · +mood'); } },
    { label: 'Send them on their way', fn: () => { F.att = Math.max(-100, F.att - 3); } }] }); } },
  green2: { cond: () => S.day >= 6 && facOk('green') && fac('green').met && !fac('green').ally, w: 1.1, run: () => { const F = fac('green'); showEventPopup({ title: '🌿 A CHILD IS SICK', text: 'A Greenwater runner arrives out of breath: a child in the commune has a fever and they have no medicine left.', buttons: [
    { label: 'Send 2 medicine', fn: () => { if (!pay({ meds: 2 })) return result('🌿 NO MEDICINE', 'You have none to give. The runner leaves in tears.'); F.att = Math.min(100, F.att + 22); storyLater('green4', 2); renownGain(5, 'Greenwater'); result('🌿 MEDICINE SENT', 'The runner hurries home with the medicine.', 'Greenwater will not forget'); } },
    { label: 'We can\'t spare any', fn: () => { F.att = Math.max(-100, F.att - 6); } }] }); } },
  green4: { chain: true, run: () => { S.food = keepCap(supplyCap(), S.food, 12); S.cloth = (S.cloth || 0) + 2; ui(); result('🌿 THE CHILD IS WELL', 'Greenwater sends a cart of vegetables and blankets to say thank you.', '+12 food · +2 cloth'); } },
  green3: { cond: () => facOk('green') && fac('green').att >= 50 && !fac('green').ally, w: 3, run: () => { const F = fac('green'); showEventPopup({ title: '🌿 AN ALLIANCE?', text: 'Greenwater\'s elders come in person: "We\'ve watched the Haven. You share, you help. Stand with us, and we\'ll stand with you."', stage: { scene: 'party', head: 'Greenwater Commune', icon: '🤝', badge: 'Alliance', hero: S.sv[0], crowd: S.sv.slice(1, 3) }, short: 'Greenwater offers an alliance.', buttons: [
    { label: 'Join hands', fn: () => { F.ally = true; F.att = Math.max(F.att, 70); setTimeout(() => earnBanner('ally', 'The Haven and Greenwater Commune are allies.'), 300); } },
    { label: 'Not yet', fn: () => { F.att -= 10; } }] }); } },
  /* 3D.138 QUARANTINE COMMAND */
  quar1: { cond: () => (S.lvl || 1) >= 7 && S.day >= 16 && !fac('quar').met, w: 3, run: () => { const F = fac('quar'); F.met = true; F.att = 0; F.inf = infectionNow().target; F.dead0 = (S.fallen || []).length; F.next = S.day + 4; F.dropDay = S.day + 2; radio('quar', rLine('quarMeet'), { level: 'important' }); showEventPopup({ title: '🪖 QUARANTINE COMMAND', text: 'An army truck stops well short of the gate. A soldier in a gas mask reads from a clipboard. "By order of Quarantine Command this settlement is under observation. Keep your sick treated and your dead buried and we get along. Let it rot and we come back with fire."', stage: { scene: 'arrive', head: 'Quarantine Command', icon: '🪖', badge: 'Observers', hero: S.sv[0], crowd: S.sv.slice(1, 3) }, short: 'The army is watching how sick the Haven is.', gains: 'Infection is now tracked (Town › Factions). Low: supply drops. High: cordon, then fire.' }); } },
  quar2: { cond: () => { const F = facLive('quar'); return !!(F && !F.ally && F.att > -50 && (F.next || 0) <= S.day); }, w: 1.4, run: () => { const F = fac('quar'), inf = Math.round(F.inf || 0); F.next = S.day + 6; showEventPopup({ title: '🪖 INSPECTION', text: `A Quarantine Command team is at the gate with swabs, clipboards and no sense of humour. Infection stands at ${inf}%.`, buttons: [
    { label: 'Let them inspect', rec: inf < 40, fn: () => { if (inf < 40) { facAdd('quar', 12); addLoot({ meds: 2, ammo: 6 }, 'Quarantine Command'); result('🪖 PASSED', 'The officer almost smiles. Almost.', '💊 +2 🔸 +6 · Command trusts you more'); } else { facAdd('quar', -8); const q = S.sv.filter((x) => x.wounded || x.hp < x.max * .5)[0]; if (q) { q.hp = q.max; q.wounded = false; } S.meds = Math.max(0, (S.meds || 0) - 2); ui(); result('🪖 FAILED', `They treat ${q ? q.name : 'the worst case'} themselves, bill you for the medicine and write a long report.`, '💊 −2 · Command trusts you less'); } } },
    { label: 'Hand over medicine (💊 3)', fn: () => { if (!pay({ meds: 3 })) return result('🪖 NOTHING TO GIVE', 'You have no medicine to spare. They note that down too.'); facAdd('quar', 6); F.inf = Math.max(0, (F.inf || 0) - 10); result('🪖 A DONATION', 'The clipboard is put away.', 'Command trusts you a little more · infection −10%'); } },
    { label: 'Keep the gate shut', fn: () => { facAdd('quar', -15); result('🪖 REFUSED', '"Noted," says the officer, and writes for a long time.', 'Command trusts you much less'); } }] }); } },
  quar3: { cond: () => { const F = facLive('quar'); return !!(F && !F.ally && F.att >= 50); }, w: 3, run: () => { const F = fac('quar'); showEventPopup({ title: '🪖 SAFE ZONE STATUS', text: 'Major Okafor comes in person. "Cleanest town in the district. Command wants to put you on the map as a Safe Zone. You get supplies and one of my people. We get somewhere to point survivors."', stage: { scene: 'party', head: 'Safe Zone', icon: '🤝', badge: 'Alliance', hero: S.sv[0], crowd: S.sv.slice(1, 3) }, short: 'Quarantine Command offers Safe Zone status.', buttons: [
    { label: 'Accept', rec: true, fn: () => { F.ally = true; F.att = Math.max(F.att, 75); const v = newcomer('Guard', 5); if (v) say(v.name + ', a soldier, joined the Haven.', true); setTimeout(() => earnBanner('ally', 'The Haven is a Quarantine Command Safe Zone.'), 300); } },
    { label: 'We stay independent', fn: () => { facAdd('quar', -10); } }] }); } },
  /* 3D.138 HELIX BIOTECH */
  helix1: { cond: () => (S.lvl || 1) >= 9 && S.day >= 24 && !fac('helix').met && S.sv.length >= 5, w: 3, run: () => { const F = fac('helix'), q = S.sv.filter((x) => x.hp > 0).sort((a, b) => (a.l || 1) - (b.l || 1))[Math.floor(S.sv.length / 2)] || S.sv[0]; F.met = true; F.att = 0; F.immune = q.name; q.immune = true; F.next = S.day + 3; showEventPopup({ title: '🧬 ' + q.name.toUpperCase() + ' WAS BITTEN', text: `${q.name} hid it for two days. The bite is deep and it is definitely a bite. And it is healing. No fever, no grey skin, nothing. ${q.name} asks everyone to stop staring.`, gains: `${q.name} is immune. Somebody is going to want to know why.`, buttons: [{ label: 'OK', fn: () => radio('helix', rLine('helixMeet'), { level: 'important' }) }] }); } },
  helix2: { cond: () => { const F = facLive('helix'); return !!(F && !F.ally && !F.taken && helixWho() && (F.next || 0) <= S.day); }, w: 1.6, run: () => { const F = fac('helix'), q = helixWho(); F.next = S.day + 4; showEventPopup({ title: '🧬 A VISIT FROM HELIX', text: `A spotless white van. Dr. Voss does not get out; a speaker on the roof does the talking. "We'd like a little of ${q.name}'s blood. Or, ideally, all of ${q.name}. We pay very well."`, buttons: [
    { label: `Give a blood sample`, rec: true, fn: () => { q.hp = Math.max(1, Math.round(q.hp - q.max * .3)); S.rp = (S.rp || 0) + 10; addLoot({ meds: 2 }, 'Helix Biotech'); facAdd('helix', 14); result('🧬 A SMALL SCRATCH', `${q.name} is pale and furious. Helix sends a thank-you crate.`, '🔬 +10 💊 +2 · Helix is pleased'); } },
    { label: `Sell ${q.name} to them`, fn: () => { S.sv = S.sv.filter((x) => x !== q); S.mat += 60; const id = facGear('helix'); stashAdd(id); F.immune = null; F.sold = true; F.att = 60; for (const x of S.sv) x.sat = Math.max(0, (x.sat || 0) - 25); logEvent(`${q.name} was sold to Helix Biotech.`, 'important'); ui(); result('🧬 SOLD', `${q.name} is walked to the van without a word. Nobody in town will look at you.`, `⚙ +60, ${ITEMS[id].name} · everyone is much less happy`); } },
    { label: 'Tell them to leave', fn: () => { facAdd('helix', -22); result('🧬 THE VAN LEAVES', '"We\'ll be in touch," says the speaker, pleasantly.', 'Helix will come and take what it wants'); } }] }); } },
  helix3: { cond: () => { const F = facLive('helix'); return !!(F && !F.ally && F.att >= 50 && !F.taken); }, w: 3, run: () => { const F = fac('helix'); showEventPopup({ title: '🧬 RESEARCH PARTNERS', text: '"You\'ve been so helpful," says the speaker on the van, "that Legal has approved a partnership. You keep your friend. We send supplies, lab results and the serum. Everyone signs nothing."', stage: { scene: 'party', head: 'Helix Biotech', icon: '🤝', badge: 'Alliance', hero: S.sv[0], crowd: S.sv.slice(1, 3) }, short: 'Helix offers a research partnership.', buttons: [
    { label: 'Agree', rec: true, fn: () => { F.ally = true; F.stalk = null; S.vaccine = true; F.att = Math.max(F.att, 75); setTimeout(() => earnBanner('ally', 'The Haven and Helix Biotech are research partners. The vaccine is yours.'), 300); } },
    { label: 'No deal', fn: () => { facAdd('helix', -10); } }] }); } },
  /* 3D.138 THE HOLLOW */
  hollow1: { cond: () => (S.lvl || 1) >= 11 && S.day >= 32 && !fac('hollow').met, w: 3, run: () => { const F = fac('hollow'); F.met = true; F.att = -60; F.int = 20; F.dead0 = (S.fallen || []).length; F.whisperNext = S.day + 2; F.nightNext = S.day + 3; showEventPopup({ title: '🕯 THE HOLLOW', text: 'The night watch swears one of the zombies at the fence was humming. In the morning there is a candle burning outside the gate, and a note in careful handwriting: "They are not monsters. They are the congregation. Come and walk with us."', gains: 'The Hollow feed on unhappy people and on your dead. Keep spirits up; kill their shepherds.', buttons: [{ label: 'OK', fn: () => radio('hollow', rLine('hollowMeet'), { level: 'important' }) }] }); } },
  /* 3D.137 THE FOUNDRY */
  foundry1: { cond: () => (S.lvl || 1) >= 5 && S.day >= 10 && !fac('foundry').met, w: 3, run: () => { const F = fac('foundry'); F.met = true; F.ren = Math.round(S.ren + 20); F.next = S.day + 3; showEventPopup({ title: '🏭 THE FOUNDRY', text: 'Six people in home-made plate armour clank up to the gate. Their leader lifts a welding mask. "Forgemaster Hale, from the Foundry, two valleys over. We make things. You look like people who break things. Let\'s do business."', stage: { scene: 'arrive', head: 'The Foundry', icon: '🏭', badge: 'Visitors', hero: S.sv[0], crowd: S.sv.slice(1, 3) }, short: 'The Foundry wants to do business.', buttons: [
    { label: 'Buy steel (⚙ 12)', fn: () => { if (!pay({ mat: 12 })) return result('🏭 NO SCRAP, NO STEEL', 'Hale shrugs. "Come back when you\'re solvent."'); const id = foundryGear(); stashAdd(id); facAdd('foundry', 8); result('🏭 A FAIR PRICE', 'It is heavy, ugly and extremely well made.', `${ITEMS[id].name} added to the stash`); } },
    { label: 'Show them around', fn: () => { facAdd('foundry', 10); F.ren += 15; result('🏭 THE GRAND TOUR', 'They nod at everything and take a worrying number of notes.', 'The Foundry likes you more, and learned a thing or two'); } },
    { label: 'Not today', fn: () => { facAdd('foundry', -6); } }] }); } },
  foundry2: { cond: () => { const F = (S.fac || {}).foundry; return !!(F && F.met && !F.ally && !F.war && facOk('foundry') && F.att > -40 && (F.next || 0) <= S.day); }, w: 1.4, run: () => { const F = fac('foundry'), w = 8 + 2 * Math.floor((S.lvl || 1) / 3), st = 6 + 2 * Math.floor((S.lvl || 1) / 3); F.next = S.day + 3; showEventPopup({ title: '🏭 AN ORDER FROM THE FOUNDRY', text: `A Foundry carter pulls up with an empty wagon. "New furnace. We need ${w} wood and ${st} stone, and we pay in steel."`, buttons: [
    { label: `Fill the order (🪵 ${w} 🪨 ${st})`, rec: true, fn: () => { if (!pay({ wood: w, stone: st })) return result('🏭 SHORT', 'You don\'t have it. The carter sighs and turns the wagon round.'); const id = foundryGear(); stashAdd(id); facAdd('foundry', 14); renownGain(2, 'The Foundry'); result('🏭 PAID IN STEEL', 'The wagon leaves full. A crate stays behind.', `${ITEMS[id].name} added to the stash · the Foundry likes you more`); } },
    { label: 'Charge them double', fn: () => { if (!pay({ wood: w, stone: st })) return result('🏭 SHORT', 'You don\'t have it anyway.'); S.mat += 14; facAdd('foundry', -8); ui(); result('🏭 DAYLIGHT ROBBERY', 'They pay. They also remember.', '⚙ +14 · the Foundry likes you less'); } },
    { label: 'We need it ourselves', fn: () => { facAdd('foundry', -9); } }] }); } },
  foundry3: { cond: () => { const F = (S.fac || {}).foundry; return !!(F && F.met && !F.ally && facOk('foundry') && F.att >= 50); }, w: 3, run: () => { const F = fac('foundry'); showEventPopup({ title: '🏭 SISTER TOWNS?', text: 'Forgemaster Hale comes in person, without the armour for once. "Two towns are harder to kill than one. We make the steel, you make the noise. Sister towns?"', stage: { scene: 'party', head: 'The Foundry', icon: '🤝', badge: 'Alliance', hero: S.sv[0], crowd: S.sv.slice(1, 3) }, short: 'The Foundry offers to be sister towns.', buttons: [
    { label: 'Shake on it', rec: true, fn: () => { F.ally = true; F.war = false; F.att = Math.max(F.att, 75); setTimeout(() => earnBanner('ally', 'The Haven and the Foundry are sister towns.'), 300); } },
    { label: 'Not yet', fn: () => { facAdd('foundry', -8); } }] }); } },
  foundry4: { cond: () => { const F = (S.fac || {}).foundry; return !!(F && F.met && !F.ally && facOk('foundry') && F.att <= -40 && (F.truceAsk || 0) + 6 <= S.day); }, w: 2, run: () => { const F = fac('foundry'), c = 20 + 4 * (S.lvl || 1); F.truceAsk = S.day; showEventPopup({ title: '🏭 A FOUNDRY ENVOY', text: `An envoy under a white rag. "This is costing both towns. ${c} scrap for our trouble, and the trouble stops."`, buttons: [
    { label: `Pay for a truce (⚙ ${c})`, fn: () => { if (!pay({ mat: c })) return result('🏭 NO DEAL', 'You can\'t cover it. The envoy leaves.'); F.att = 0; F.war = false; F.raidAt = 0; F.sabAt = 0; F.ren = Math.round(S.ren + 40); result('🏭 A TRUCE', 'Hands are shaken, stiffly. The Foundry tells everyone it won.', 'Sabotage and raids stop · attitude back to Wary'); } },
    { label: 'Tell them to get used to losing', fn: () => { facAdd('foundry', -10); result('🏭 THE ENVOY LEAVES', 'The rag goes back in a pocket.'); } }] }); } },
  rival1: { cond: () => false, w: 1.5,   /* 3D.104 replaced by the Toll Kings (toll1) */ run: () => showEventPopup({ title: '🏴 IRONFIELD RIDERS', text: 'Riders from Ironfield, a town to the east, demand tribute: "Pay, or we take it."', buttons: [
    { label: 'Pay 8 scrap', fn: () => { if (!pay({ mat: 8 })) { spawnRaid(); return result('🏴 THEY ATTACK', 'You couldn\'t pay. The riders attack!'); } S.nextRaid = Math.max(S.nextRaid, S.day + S.hour / 24 + 4); storyLater('rival2', 4); result('🏴 TRIBUTE PAID', 'They leave. No raiders for 4 days.'); } },
    { label: 'Refuse', fn: () => { spawnRaid(); spawnRaid(); S.rivalFight = true; storyLater('rival3', 1); result('🏴 THEY ATTACK', 'Two raiding parties ride in at once!'); } }] }) },
  rival2: { chain: true, run: () => { S.food += 10; S.water += 6; ui(); result('🏴 IRONFIELD TRADERS', 'Ironfield sends a cart of supplies as a sign of peace.', '+10 food · +6 water'); } },
  rival3: { chain: true, run: () => { renownGain(15, 'Ironfield backs down'); result('🏴 IRONFIELD BACKS DOWN', 'Word spreads that the Haven stood its ground.', '+15 Renown'); } },
  sick: { cond: () => S.sv.length >= 4, w: 1.2, run: () => { const s = pickSv(); if (!s) return; showEventPopup({ title: '🤒 ' + s.name.toUpperCase() + ' IS SICK', text: `${s.name} has a fever and can barely stand.`, buttons: [
    { label: 'Treat (2 scrap, 3 water)', fn: () => { if (!pay({ mat: 2, water: 3 })) return result('NOT ENOUGH SUPPLIES', `${s.name} will have to ride it out.`); s.sat = Math.min(100, (s.sat || 0) + 5); result('🤒 RECOVERING', `${s.name} will be fine.`); } },
    { label: 'Let them rest', fn: () => { s.hp = Math.max(1, Math.round(s.max * .45)); s.fatigue = 90; result('🤒 A ROUGH FEW DAYS', `${s.name} is weak for a while.`); } }] }); } },
  lostkid: { cond: () => S.day >= 5 && errandTeam('kid', 2).length === 2, w: .8, run: () => { const t = errandTeam('kid', 2); showEventPopup({ title: '🧒 A LOST CHILD', text: 'A child is crying somewhere beyond the walls.', stage: { scene: 'radio', head: 'A lost child', team: t, who: t.map((q) => q.name).join(' & ') + ' can go', quiet: true }, short: 'A child is crying beyond the walls.', chips: ['Search: about 5 hours'], buttons: [
    { label: `Send ${t.map((q) => q.name).join(' & ')}`, fn: () => { startErrand('kid', t); banner({ t: `🧒 ${t[0].name} and ${t[1].name} went searching`, who: t[0] }); } },
    { label: 'Too dangerous', fn: () => { for (const q of S.sv) { q.sat = Math.max(0, (q.sat || 0) - 4); moodAdd(q, -4, 'turned someone away'); } } }] }); } },
  drop: { cond: () => S.day >= 3 && !S.crates?.length && errandTeam('drop', 2).length >= 1, w: 1, run: () => { const c = dropCrate(), t = errandTeam('drop', 2); showEventPopup({ title: '📦 SUPPLY DROP', text: 'A parachute crate is coming down outside the walls.', stage: { scene: 'drop', head: 'Supply drop!', team: t, who: t.map((q) => q.name).join(' & ') + ' can fetch it' }, short: 'The noise will wake the dead.', chips: ['Lands outside the walls'], buttons: [
    { label: `Send ${t.map((q) => q.name).join(' & ')}`, fn: () => { startErrand('drop', t, { crate: c.id }); centerOn(c.w.x, c.w.y); } },
    { label: 'Leave it', fn: () => { c.left = true; } }] }); } },
  dog: { cond: () => !S.sv.some((q) => q.pet) || rnd() < .3, w: .7, run: () => showEventPopup({ title: '🐕 A STRAY DOG', text: 'A skinny dog has been following the patrols for days.', buttons: [
    { label: 'Adopt (2 food)', fn: () => { if (!pay({ food: 2 })) return; const p = newPet('dog'); (S.pets = S.pets || []).push(p); result('🐕 ' + p.name.toUpperCase(), `${p.name} has a home. Give the dog to a survivor from their Gear tab.`); } },
    { label: 'Shoo it away', fn: () => {} }] }) },
  medic: { cond: () => S.day >= 4, w: .8, run: () => showEventPopup({ title: '🩺 A WANDERING MEDIC', text: 'A travelling medic asks for shelter for the night.', buttons: [
    { label: popNow() >= popCap() ? `Ask them to stay · no room (${popNow()}/${popCap()})` : 'Ask them to stay', disabled: popNow() >= popCap(), fn: () => { const v = newcomer('Medic', 2); result('🩺 ' + (v ? v.name.toUpperCase() + ' STAYS' : 'NO ROOM'), v ? `${v.name} (Medic Lv.2) joins the Haven.` : 'There\'s no room — they treat everyone before leaving.'); if (!v) for (const q of S.sv) q.hp = Math.min(q.max, q.hp + q.max * .3); } },
    { label: 'Ask for treatment', fn: () => { for (const q of S.sv) q.hp = Math.min(q.max, q.hp + q.max * .4); result('🩺 PATCHED UP', 'Everyone is treated before the medic moves on.'); } }] }) },
  storm: { cond: () => S.day >= 3 && !seasonOf().snow, w: .5, run: () => { S.water = keepCap(supplyCap(), S.water, 8); let t = 'Heavy rain fills every barrel.'; if (rnd() < .35) { const c = world.buildings.filter((b) => !OPEN_AIR.has(b.type) && !b.burnt); if (c.length && startFire(c[Math.floor(rnd() * c.length)], 25, 'Lightning')) t += ' Lightning struck a building!'; } ui(); result('⛈ STORM', t, '+8 water'); } },
  feast: { cond: () => S.sv.length >= 5 && S.food >= 12 && S.water >= 12, w: .9, run: () => showEventPopup({ title: '🎉 A FEAST?', text: 'Spirits are low. Someone suggests a feast to bring everyone together.', buttons: [
    { label: 'Hold a feast (6 food, 6 water)', fn: () => { if (!pay({ food: 6, water: 6 })) return; for (const a of S.sv) { a.sat = Math.min(100, (a.sat || 0) + 15); moodAdd(a, 15, 'the feast'); for (const b of S.sv) if (a.id < b.id) addBond(a, b, 6); } SFX('reward'); result('🎉 WHAT A NIGHT', 'Everyone feels closer.', '+15 ♥ for everyone · bonds grow'); } },
    { label: 'Not now', fn: () => {} }] }) },
  gift: { cond: () => true, w: 1.5, run: () => { const e = TOWN_EVENT_DEFS[Math.floor(rnd() * TOWN_EVENT_DEFS.length)]; if (e.food) S.food += e.food; if (e.water) S.water += e.water; if (e.mat) S.mat += e.mat; if (e.ren) renownGain(e.ren, e.name); const g = []; if (e.food) g.push('+' + e.food + ' food'); if (e.water) g.push('+' + e.water + ' water'); if (e.mat) g.push('+' + e.mat + ' scrap'); if (e.ren) g.push('+' + e.ren + ' renown'); result(e.name.toUpperCase(), e.text, g.join(' · ')); ui(); } },
};
function triggerTownEvent() {   /* once a day: a due chain step first, else a random eligible event */
  S.storyQ = S.storyQ || []; const due = S.storyQ.find((q) => q.day <= S.day && !(q.id === 'toll3' && bossNear()));   /* 3D.252: the Toll Collector waits out a boss day */
  if (due) { S.storyQ = S.storyQ.filter((q) => q !== due); STORY[due.id] && STORY[due.id].run(); return; }
  const pool = Object.entries(STORY).filter(([k, e]) => !e.chain && e.cond() && k !== S.lastStory && !(k === 'radio1' && S.radioDone) && !(k === 'rival1' && S.rivalDone));
  let tot = pool.reduce((a, [, e]) => a + e.w, 0), r = rnd() * tot; for (const [k, e] of pool) { r -= e.w; if (r <= 0) { S.lastStory = k; if (k === 'radio1') S.radioDone = true; if (k === 'rival1') S.rivalDone = true; e.run(); return; } }
}
const eventQueue = []; let modalOpen = false, guest = null;
/* stage: { scene: 'arrive' | 'party' | 'danger' | 'sad', head, icon, badge, hero (survivor), crowd: [survivors] } */
function stageHtml(st) {
  const fig = (s, pose) => (window.ZH3D && ZH3D.figure && s ? ZH3D.figure(s, pose) : null), img = (u, cls) => (u ? `<div class="sa ${cls}"><img src="${u}" alt=""></div>` : '');
  if (st.scene === 'radio' || st.scene === 'drop') {   /* V3D.17: the radio crackling (or a crate coming down), and the people who would go */
    const team = (st.team || []).slice(0, 2).map((q, i) => img(fig(q, 'ready'), 'team t' + i)).join('');
    const prop = st.scene === 'drop' ? '<div class="chute"><div class="canopy"></div><div class="lines"></div><div class="crate"></div></div><div class="dust"></div>' : st.quiet ? '' : '<div class="radioSet"><i class="ant"></i><span class="sig"></span><span class="sig s2"></span><span class="sig s3"></span></div>';
    return `<div class="evStage ${st.scene === 'drop' ? 'arrive' : 'radio'}"><div class="cloud" style="left:10%"></div><div class="cloud" style="left:62%;animation-delay:-7s;top:30px"></div><div class="hills"></div><div class="fence"></div><div class="ground"></div>${prop}${team}${st.who ? `<div class="who">${esc(st.who)}</div>` : ''}</div>`;
  }
  if (st.scene === 'boss') {   /* V3D.17: the boss itself lumbers in from the right, under a red sky */
    const K = BOSS_KINDS[st.boss] || BOSS_KINDS.mutant, z = window.ZH3D && ZH3D.zombieFigure, f1 = z && z(K.look, 0, K.run), f2 = z && z(K.look, 1, K.run);
    return `<div class="evStage danger boss"><div class="hills"></div><div class="fence"></div><div class="ground"></div>
      <div class="sa mid walkR${K.run ? ' fast' : ''}" style="--bs:${(K.sc / 1.6).toFixed(2)}">${f1 ? `<img class="w1" src="${f1}" alt="">` : ''}${f2 ? `<img class="w2" src="${f2}" alt="">` : ''}</div><div class="bossName">${K.name}</div></div>`;
  }
  if (st.scene === 'newcomer') {   /* one person walks in from the left to the middle and waves (two frames swap) */
    const f1 = fig(st.hero, 'wave1'), f2 = fig(st.hero, 'wave2');
    return `<div class="evStage arrive"><div class="cloud" style="left:10%"></div><div class="cloud" style="left:62%;animation-delay:-7s;top:30px"></div><div class="hills"></div><div class="fence"></div><div class="ground"></div>
      <div class="sa mid walkL">${f1 ? `<img class="w1" src="${f1}" alt="">` : ''}${f2 ? `<img class="w2" src="${f2}" alt="">` : ''}</div></div>`;
  }
  const crowd = (st.crowd || []).slice(0, 2), sc = st.scene || 'arrive';
  const heroPose = sc === 'arrive' ? 'wave' : sc === 'danger' ? 'ready' : sc === 'sad' ? 'down' : 'cheer', crowdPose = sc === 'danger' ? 'ready' : sc === 'sad' ? 'down' : 'cheer';
  const conf = sc === 'arrive' || sc === 'party' ? Array.from({ length: 14 }, (_, i) => `<i class="conf" style="left:${(i * 7.3 + 3) % 100}%;background:${['#ffd45c', '#ff9ab0', '#9be2ff', '#a8e08a'][i % 4]};animation-delay:${(i * .37) % 2.2}s"></i>`).join('') : '';
  return `<div class="evStage ${sc}"><div class="cloud" style="left:10%"></div><div class="cloud" style="left:62%;animation-delay:-7s;top:30px"></div><div class="hills"></div><div class="fence"></div><div class="ground"></div>
    <div class="glow"><div class="ic">${st.icon || '★'}</div>${st.badge ? `<div class="bd">${st.badge}</div>` : ''}</div>
    ${crowd.map((s, i) => img(fig(s, crowdPose), `l${i} ${sc === 'danger' ? 'shake' : sc === 'sad' ? '' : 'hop d' + (i + 1)}`)).join('')}
    ${img(fig(st.hero, heroPose), 'r0 ' + (sc === 'arrive' ? 'walkin' : sc === 'danger' ? 'shake' : sc === 'party' ? 'hop' : ''))}${conf}</div>`;
}
const others = (s, n = 2) => S.sv.filter((q) => q !== s && q.hp > 0).slice(0, n);
let curEv = null;
function showEventPopup(o) { if (o.encRef) eventQueue.unshift(o); else eventQueue.push(o); nextEventPopup(); }   /* 3D.172 round 3: a trip card goes to the front, so it is not decided while it waits behind a move-in request */
function nextEventPopup() {
  const m = $('eventModal'); if (!m || m.innerHTML || !eventQueue.length || sel) return; const e = eventQueue.shift(); if (e.valid && !e.valid()) return nextEventPopup(); curEv = e; modalOpen = true;   /* 3D.169 round 2: a trip card that waited behind another card could already be decided */
  const bt = e.buttons && e.buttons.length ? e.buttons : [{ label: 'OK' }];
  if (e.live) {   /* 3D.134 a small card under the real scene: the newcomer is standing there on the map, waving */
    const fg = window.ZH3D && ZH3D.figure ? ZH3D.figure(e.live, 'ready') : null; m.classList.add('live');
    m.innerHTML = `<div class="evBox frame liveCard">${fg ? `<img class="lcFace" src="${fg}" alt="">` : ''}<div class="lcTxt"><div class="evLine">${e.short}</div><div class="evChips">${(e.chips || []).map((c) => `<span>${c}</span>`).join('')}</div></div><div class="lcBtns">${bt.map((b, i) => `<button class="act${b.rec ? ' go' : ''} out" data-i="${i}"${i === 0 ? ' id="eventOk"' : ''}>${b.label}</button>`).join('')}</div></div>`;
    m.querySelectorAll('button[data-i]').forEach((el) => { el.onclick = () => { const b = bt[+el.dataset.i]; m.innerHTML = ''; m.classList.remove('live'); modalOpen = false; if (b && b.fn) b.fn(); nextEventPopup(); }; });
    SFX('event'); return;
  }
  if (e.alert && phoneOn()) {   /* 3D.380 (W249, fun idea 2): the big warnings as the phone's emergency alert: a red wash over the town, the alarm,
       a dark card at the top with EMERGENCY ALERT, the title, one line, a second small line, and two plain buttons side by side. Only for the big nights. */
    const A = e.alert; m.classList.add('emA');
    m.innerHTML = `<div class="emWash"></div><div class="emBox" role="alertdialog"><div class="emHd"><span class="emIc"><svg viewBox="0 0 24 24" width="18" height="18"><path d="M12 3 2 21h20z" fill="#fff"/><path d="M12 9v6" stroke="#d92d2d" stroke-width="2.4" stroke-linecap="round"/><circle cx="12" cy="18" r="1.4" fill="#d92d2d"/></svg></span><b>EMERGENCY ALERT</b><span class="emNow">now</span></div>`
      + `<div class="emT">${A.title}</div><div class="emL">${A.line}</div>${A.sub ? `<div class="emS">${A.sub}</div>` : ''}<div class="emBtns">${bt.map((b, i) => `<button data-i="${i}" class="emB${i === 0 && bt.length > 1 ? ' main' : ''}">${b.label}</button>`).join('')}</div></div>`;
    m.querySelectorAll('button[data-i]').forEach((el) => { el.onclick = () => { const b = bt[+el.dataset.i]; m.innerHTML = ''; m.classList.remove('emA'); modalOpen = false; if (b && b.fn) b.fn(); nextEventPopup(); }; });
    SFX('alarm'); return;
  }
  if ((e.stage)) {   /* V3D.12: DV2-style stage card */
    m.innerHTML = `<div class="evBox frame stageCard"><div class="evTitle">${e.stage.head || 'News'}</div>${stageHtml(e.stage)}<div class="evLine">${e.short || e.title}</div>${e.chips ? `<div class="evChips">${e.chips.map((c) => `<span>${c}</span>`).join('')}</div>` : ''}${bt.map((b, i) => `<button class="act${bt.length === 1 || b.rec ? ' go' : ''} out" data-i="${i}"${i === 0 ? ' id="eventOk"' : ''}${b.disabled ? ' disabled' : ''}>${b.label}</button>`).join('')}</div>`;
    m.querySelectorAll('button[data-i]').forEach((el) => { el.onclick = () => { const b = bt[+el.dataset.i]; m.innerHTML = ''; modalOpen = false; if (b && b.fn) b.fn(); nextEventPopup(); }; });
    SFX(e.stage.scene === 'sad' || e.stage.scene === 'danger' ? 'alarm' : 'event'); return;
  }
  m.innerHTML = `<div class="evBox frame${e.x ? ' hasX' : ''}">${e.x ? '<button class="evX" aria-label="Close">×</button>' : ''}<div class="evTitle out">${e.title}</div><div class="evText">${e.text}</div>${e.gains ? `<div class="evGain">${e.gains}</div>` : ''}${bt.map((b, i) => `<button class="act${bt.length === 1 || b.rec ? ' go' : ''} out" data-i="${i}"${i === 0 ? ' id="eventOk"' : ''}${b.disabled ? ' disabled' : ''}>${b.label}</button>`).join('')}</div>`;
  m.querySelectorAll('button:not(.tipMb)').forEach((el) => { el.onclick = () => { const b = el.classList.contains('evX') ? null : bt[+el.dataset.i]; m.innerHTML = ''; modalOpen = false; if (b && b.fn) b.fn(); else if (!b && e.onX) e.onX(); nextEventPopup(); }; });   /* 3D.240: x: true adds a ✕ that closes the card doing nothing (onX runs if given) */
}
const residents = () => S.sv.filter((s) => s.resident).length;
/* V2.33 DV2-style "Upgrade Town": each star has rating conditions; when all are met the player upgrades the town */
const RANK_REQ = [null, { ren: 60, flow: 2, events: 1, build: 'canteen', people: 7, bld: 10 }, { ren: 200, flow: 4, events: 2, build: 'storage', people: 11, bld: 18 }, { ren: 450, flow: 7, events: 4, build: 'barracks', people: 15, bld: 26 }, { ren: 900, flow: 10, events: 6, build: 'hospital', people: 19, bld: 34 }];   /* 3D.74: a rank-up needs people and buildings (ren/flow/events/build kept for the auto-player and older screens) */
/* 3D.104 HAVEN LEVELS (owner, Round 5): levels 1-15 in three eras replace the 5 stars. People and buildings drive each level, the player
   presses Upgrade, the upgrade takes real time (0.5 h + 0.8 h per level, never over 12 h; 3x faster while playing), each level has 3 small
   celebrated steps, territory and storage grow with the level, and the Banner gates level 5 -> 6 and 10 -> 11. The old star rank is kept
   underneath (every 3 levels = one old rank) so the buildings, threat ceiling and room for people it drives keep their balance. */
const lvlOfRank = (r) => 1 + 3 * Math.max(0, (r || 1) - 1);   /* the level where an old star rank begins */
const LV_MAX = 20, LV_REQ = [null, { people: 6, bld: 6 }, { people: 7, bld: 8 }, { people: 8, bld: 10 }, { people: 9, bld: 13 }, { people: 11, bld: 16 }, { people: 12, bld: 18 }, { people: 13, bld: 21 },
  { people: 15, bld: 24 }, { people: 16, bld: 26 }, { people: 17, bld: 29 }, { people: 19, bld: 32 }, { people: 20, bld: 34 }, { people: 21, bld: 37 }, { people: 23, bld: 40 },
  { people: 25, bld: 43 }, { people: 27, bld: 46 }, { people: 29, bld: 49 }, { people: 31, bld: 52 }, { people: 33, bld: 55 }];   /* 3D.113 Endgame A: levels 16-20, Era IV The City */
const ERAS = [{ n: 'I', name: 'The Camp', from: 1, to: 5 }, { n: 'II', name: 'The Settlement', from: 6, to: 10 }, { n: 'III', name: 'The Town', from: 11, to: 15 }, { n: 'IV', name: 'The City', from: 16, to: 20 }];
const eraOf = (l = S.lvl || 1) => ERAS.find((e) => l >= e.from && l <= e.to) || ERAS[ERAS.length - 1];
const rankOfLvl = (l) => Math.min(5, 1 + Math.floor((l - 1) / 3));
const terrOfLvl = (l) => (l >= 16 ? 4 : l >= 11 ? 3 : l >= 7 ? 2 : l >= 4 ? 1 : 0);   /* 12x12 (L1-3), 16x18 (L4-6), 20x23 (L7-10), 24x26 (L11-15) */
/* 3D.128 pacing (owner: the start should feel quick, later levels take effort and a check-in a day). Real hours per level; 3x faster while playing:
   level 2 in 3 minutes of play, 3 in 6, 4 in 35, 5 in 50, 6 in 60; from 7 on it is a wait you come back to (3.5 h, 4 h, 6 h, 8 h, then 12 h, then 16 h in the City). */
const LV_HOURS = [0, 0, 6, 12, 48, 60, 72, 84, 96, 108, 120, 144, 144, 144, 144, 144, 168, 168, 168, 168, 168];   /* 3D.166 owner (play-test round 1): the level timer counts GAME hours (1 game hour = 1000 ticks), the middle levels are shorter (L4 was ~126 game h, L5 ~180, L10 ~576), and renown can speed it up (LV_RUSH). Away time still counts: every AWAY_MIN_PER_H real minutes away = 1 game hour, with no cap */
const LV_RUSH = 25;   /* renown for 12 game hours off the timer */   /* 3D.129 owner: levels 4 and 5 slowed (35 and 50 minutes of play, were 10 and 20) so rank 2 and its bigger hordes arrive around day 10-12, not day 6 */
const lvHours = (to) => LV_HOURS[to] ?? 144;
/* 3D.303 (Balance chat; owner, 22 Nov, Q1 of 16-OVERNIGHT: "Yes to your number about time"; rule 1 of 13-LONG-GAME, one pace for everyone): the level
   timer counts REAL minutes, the same with the game open or closed (before: game hours, 36 times faster with the game open). Open, one tick is
   1/60 s of real time (the clock trips already use, S.expClock); away, the real time away. Level 2 after 3 minutes, 3 after 10, 4 after an hour,
   5 after 6 hours, then a real day a level to 10, a day and a half to 15, two and a half days to 20. Levels still wait on people and buildings. */
const LV_MIN = [0, 0, 3, 10, 60, 360, 1440, 1440, 1440, 1440, 1440, 2160, 2160, 2160, 2160, 2160, 3600, 3600, 3600, 3600, 3600];
const lvMs = (to) => (LV_MIN[to] ?? 2160) * 60000, LV_RUSH_MS = 2 * 3600000;   /* renown: LV_RUSH for 2 real hours off (12 game hours away before) */
const needsBanner = (l = S.lvl || 1) => l === 5 || l === 10 || l === 15;   /* 3D.113 a Banner also opens the City era */
const bannersFree = () => (S.banners || []).filter((b) => !b.used).length;
const BANNER_ROUTES = { stronghold: { icon: '🏚', name: 'Stronghold Banner', how: 'Clear a stronghold (the Overrun Clinic on the Explore map)' }, faction: { icon: '⚔', name: 'Victory Banner', how: 'Beat a faction leader in a raid' },
  ally: { icon: '🤝', name: 'Alliance Banner', how: 'Make an ally of a faction (Greenwater, the Foundry, Quarantine Command or Helix)' }, civic: { icon: '🏛', name: 'Civic Banner', how: 'Finish a civic project: a Trading Post, or the Radio Tower' },
  community: { icon: '🎪', name: 'Community Banner', how: "Hold the Founders' Festival (Town events: Haven level 8, 12 people, mood ♥60)" } };   /* 3D.173: 'coming' was out of date; the festival is the second non-combat route */
function earnBanner(route, why) {   /* a Banner raised over the Haven; one is spent on each era gate */
  S.banners = S.banners || []; if (S.banners.some((b) => b.route === route && !b.used && route !== 'stronghold')) return false; const R = BANNER_ROUTES[route];
  S.banners.push({ route, day: S.day, used: false }); SFX('rankup'); renownGain(8, R.name);
  showEventPopup({ stage: { scene: 'party', head: 'A Banner for the Haven!', icon: R.icon, badge: 'Banner', hero: S.sv[0], crowd: S.sv.slice(1, 3) }, short: `${R.name} raised: ${why}`, title: R.icon + ' ' + R.name.toUpperCase(), text: why + '<br>A Banner opens the next era of the Haven (level 5 → 6 and 10 → 11).' });
  checkRank(); return true;
}
function lvStepCheck(c) {   /* 3 small celebrated steps inside each level: a third, two thirds, then ready to upgrade */
  if (!c || S.lvUp) return; const p = c.reduce((a, r) => a + (r.ok ? 1 : Math.min(1, (+r.have || 0) / Math.max(1, +r.need || 1))), 0) / c.length, st = p >= 1 ? 3 : p >= .66 ? 2 : p >= .33 ? 1 : 0;
  if (st > (S.lvStep || 0)) { S.lvStep = st; if (st < 3) { banner(`🏁 LEVEL ${S.lvl + 1} · STEP ${st} OF 3`); renownGain(1 + st, 'Level step'); SFX('chime'); } }
}
function levelUpDone() {   /* the timer ran out: the Haven reaches the next level */
  const u = S.lvUp; if (!u) return; S.lvUp = null; const from = S.lvl || 1; S.lvl = Math.min(LV_MAX, u.to); S.lvStep = 0; const oldRank = S.rank || 1; S.rank = Math.max(oldRank, rankOfLvl(S.lvl));
  if (u.banner) { const b = (S.banners || []).find((q) => !q.used); if (b) b.used = true; }
  const t = Math.max(S.terr || 0, terrOfLvl(S.lvl)); if (t !== (S.terr || 0)) { S.terr = t; Wd.setTerritory(t); Wd.bump(world); landGrewNote(); }
  const lines = [`Room to store more: food/water ${supplyCap()}, wood/stone ${matCap()}, scrap ${scrapCap()}`]; if (terrOfLvl(S.lvl) > terrOfLvl(from)) lines.unshift('🗺 The Haven claims more land (more zombies, from more directions)');
  if (eraOf(S.lvl) !== eraOf(from)) lines.unshift(`A new era begins: Era ${eraOf(S.lvl).n} · ${eraOf(S.lvl).name}`);
  if (S.rank > oldRank) { S.threat = threatNow(); rankReward(); S.mat += 4 + S.rank; for (const x of rankUnlocks(S.rank).filter((x) => !x.startsWith('+'))) lines.push(x); }
  else { S.food = keepCap(supplyCap(), S.food, 2); S.water = keepCap(supplyCap(), S.water, 2); S.mat += 2; }
  SFX('rankup'); renownGain(4 + S.lvl, 'Haven Level ' + S.lvl);
  showEventPopup({ stage: { scene: 'party', head: 'The Haven grows!', icon: '🏡', badge: 'Level ' + S.lvl, hero: S.sv[0], crowd: S.sv.slice(1, 3) }, short: `The Haven is now Level ${S.lvl}!`, chips: S.rank > oldRank ? rankUnlocks(S.rank).filter((x) => x.startsWith('Buildings')).map((x) => '🔓 ' + x.replace('Buildings: ', '')) : [], title: '🏡 HAVEN LEVEL ' + S.lvl, text: lines.map((x) => '• ' + esc(x)).join('<br>'), gains: S.rank > oldRank ? '+' + (4 + S.rank) + ' scrap' : '+2 scrap' });
  say('HAVEN LEVEL ' + S.lvl + '!', true); radio('dj', rLine('level', { n: S.lvl }), { key: 'lvl' });
  if (needsBanner() && !bannersFree()) { const how = 'The next level needs a Banner over the Haven. Two ways to raise one: clear the Overrun Clinic on the Explore map, or finish a Trading Post or a Radio Tower.'; radio('dj', how, { key: 'banner', level: 'important' }); logEvent('🚩 ' + how, 'important'); }   /* 3D.162 play-test: two testers sat at level 5 for 13 days without learning what a Banner is (it was only in the Upgrade screen) */ saveGame(); ui();
}
function lvFix() { const u = S.lvUp; if (u && !u.rt) { const f = u.total > 0 ? Math.max(0, u.left) / u.total : 0; u.total = lvMs(u.to); u.left = u.total * f; u.rt = true; delete u.gh; } }   /* 3D.303: a save from before keeps the share of the wait that was left, now in real time */
function lvTick(ms) {   /* 3D.303: ms of real time */
  if (!S.lvUp) return; lvFix(); S.lvUp.left -= ms; if (S.lvUp.left <= 0) levelUpDone();
}
const ghText = (h) => { h = Math.max(0, Math.ceil(h)); const d = Math.floor(h / 24), r = h % 24; return d ? `${d} day${d > 1 ? 's' : ''}${r ? ' ' + r + ' h' : ''}` : `${r} h`; };
const rtText = (ms) => { const m = Math.max(0, Math.ceil(ms / 60000)); if (m < 60) return `${m} min`; const h = Math.floor(m / 60), d = Math.floor(h / 24); return d ? `${d} day${d > 1 ? 's' : ''}${h % 24 ? ' ' + (h % 24) + ' h' : ''}` : `${h} h${m % 60 ? ' ' + (m % 60) + ' min' : ''}`; };
const lvLeftText = () => { if (!S.lvUp) return ''; lvFix(); return rtText(S.lvUp.left); };
const lvRushCost = (ms) => Math.ceil(Math.max(0, ms) / LV_RUSH_MS - 1e-9) * LV_RUSH;
function lvRush(all) {   /* spend renown: 12 game hours off, or finish now */
  const u = S.lvUp; if (!u) return false; lvFix(); const h = all ? u.left : Math.min(LV_RUSH_MS, u.left), c = lvRushCost(h); if ((S.ren || 0) < c) { say(`Not enough renown: ${c} needed.`, true); return false; }
  S.ren -= c; u.left -= h; say(`🏗 ${c} renown spent: the builders work through the night (${rtText(h)} sooner).`, true); if (u.left <= .01) levelUpDone(); saveGame(); ui(); return true;
}
const scrapCap = () => 100 + 25 * (S.lvl || 1) + 40 * storeTiers();   /* 3D.104 owner: stockpiles are limited by level */
function rankUnlocks(r) {   /* V2.39: what reaching star r opens up (buildings, walls, events) and what it costs (threat) */
  const b = Object.entries(DEFS).filter(([, d]) => (d.rank || 1) === r).map(([k, d]) => d.name + (d.res && !researched(d.res) ? ` (after ${RESEARCH[d.res].name})` : ''));
  const w = Object.values(Wd.WALL_DEFS).filter((d) => (d.rank || 1) === r).map((d) => d.name), e = Object.values(TOWN_EVENTS).filter((x) => (x.rank || 1) === r).map((x) => x.icon + ' ' + x.name);
  const tr = Object.values(TRAP_DEFS).filter((d) => d.rank === r).map((d) => d.name);
  const out = []; if (b.length) out.push('Buildings: ' + b.join(', ')); if (w.length) out.push('Walls: ' + w.join(', ')); if (tr.length) out.push('Traps: ' + tr.join(', ')); if (e.length) out.push('Events: ' + e.join(', '));
  out.push(`Room for ${rankRoom() + 4} people (was ${rankRoom()}), and a newcomer hears of the Haven (needs a free bed)`); out.push('☠ Zombies grow with the town\'s level, not with the days: each level brings slightly bigger nights'); out.push(`+2 food, +2 water, everyone heals 25%`); out.push(`+${4 + r} scrap on upgrade`); return out;
}

function rankConds() {
  if ((S.lvl || 1) >= LV_MAX) return null; const q = LV_REQ[S.lvl || 1]; if (!q) return null;
  const pe = popNow(), nb = world.buildings.filter((b) => !b.burnt).length;   /* 3D.74 owner: the town grows by people and buildings; the player still presses Upgrade */
  const c = [
    { ic: 'rating', name: 'People living here', need: q.people, have: pe, ok: pe >= q.people, sub: `room for ${popCap()} now: build beds, keep everyone fed and newcomers will come` },
    { ic: 'living', name: 'Buildings standing', need: q.bld, have: nb, ok: nb >= q.bld, sub: 'any building counts; burnt ones don\'t until repaired' },
  ];
  if (needsBanner()) c.push({ ic: 'rating', name: 'A Banner over the Haven', need: 1, have: bannersFree(), ok: bannersFree() > 0, sub: 'opens the next era: ' + Object.values(BANNER_ROUTES).map((r) => r.icon + ' ' + r.how).join(' · ') });
  return c;
}
function checkRank() {
  const c = rankConds(); if (!c) return; lvStepCheck(c); const ok = c.every((r) => r.ok);
  if (ok && !S.rankReady && !S.lvUp) { S.rankReady = true; banner('🏡 THE HAVEN CAN REACH LEVEL ' + ((S.lvl || 1) + 1)); say('Ready for the next level: open Upgrade (tap the Renown wheel or Town) to start it.', true); }
  if (!ok) S.rankReady = false; ui();
}
function upgradeTown() {   /* 3D.104 starts the level-up timer; the level arrives when it runs out */
  const c = rankConds(); if (!c || !c.every((r) => r.ok) || S.lvUp) return false; const to = (S.lvl || 1) + 1;
  S.lvUp = { to, left: lvMs(to), total: lvMs(to), rt: true, banner: needsBanner() }; S.rankReady = false; S.lvStep = 3;
  SFX('build'); banner('🏗 UPGRADING TO LEVEL ' + to); say(`The Haven is working toward level ${to}: ${lvLeftText()} in real time (it keeps going while the app is closed, and renown can speed it up).`, true); saveGame(); ui(); return true;
}
/* V2.33 town events (like DV2's): cost supplies, run for a few hours, give Renown and mood, and count toward the next star */
const TOWN_EVENTS = {
  bonfire: { name: 'Bonfire Night', icon: '🔥', cost: { food: 4, water: 2 }, ren: 6, sat: 8, hours: 3, desc: 'Everyone feels better. Bad singing, good stories.' },
  market: { name: 'Swap Market', icon: '🧺', cost: { mat: 6 }, ren: 8, sat: 4, hours: 4, desc: 'A little food and water comes in. One person\'s junk is another person\'s dinner.', gain: { food: 3, water: 3 } },
  sports: { name: 'Sports Day', icon: '🏃', cost: { food: 3, water: 4 }, ren: 7, sat: 5, hours: 3, desc: 'Everyone gets some training in. The three-legged race is now a two-legged race.', train: 30 },
  feast: { name: 'Harvest Feast', icon: '🍲', cost: { food: 8, water: 4 }, ren: 12, sat: 12, hours: 4, rank: 2, desc: 'Hunger and mood restored. Seconds for everyone.' },
  festival: { name: "Founders' Festival", icon: '🎪', cost: { food: 20, water: 15, mat: 10 }, ren: 15, sat: 10, hours: 6, lvl: 8, people: 12, mood: 60, banner: true, desc: 'Raises a Community Banner (opens the next era). Needs Haven level 8, 12 people and average mood ♥60. Bunting made of old maps.' },   /* 3D.173 owner: a second Banner route that is not a fight */
  caravan: { name: 'Trade Caravan', icon: '🐫', cost: { food: 12, water: 10 }, ren: 6, sat: 3, hours: 4, rank: 3, desc: 'Takes surplus food and water and pays in scrap. Camels. Don\'t ask.', gain: { mat: 10 } },   /* V2.38: a use for a full pantry */
};
function holdEvent(k) {
  const e = TOWN_EVENTS[k]; if (!e || (e.rank || 1) > S.rank) return false; { const why = evLock(e); if (why) { say(why); return false; } }
  if ((S.lastEventDay ?? -1) >= S.day) { say('Only one event a day.'); return false; }
  if (!Object.entries(e.cost).every(([r, v]) => S[r] >= v)) { say('Not enough supplies for ' + e.name + '.'); return false; }
  for (const [r, v] of Object.entries(e.cost)) S[r] -= v;
  S.lastEventDay = S.day; S.eventsHeld = (S.eventsHeld || 0) + 1; S.eventOn = { k, until: nowH() + e.hours };
  for (const q of S.sv) { if (q.hp <= 0) continue; q.sat += e.sat; moodAdd(q, e.sat, e.name); if (k === 'feast') q.hunger = Math.max(0, q.hunger - 40); if (e.train) { q.tp = q.tp || {}; const st = (JOB_STATS[q.job] || ['str'])[0]; q.tp[st] = (q.tp[st] || 0) + e.train; } }
  if (e.gain) for (const [r, v] of Object.entries(e.gain)) S[r] += v;
  renownGain(e.ren, e.name); SFX('event'); banner(e.icon + ' ' + e.name.toUpperCase()); say(e.name + ' is on! ' + e.desc, true); if (e.banner) setTimeout(() => earnBanner('community', `${S.sv.length} people turned out for the ${e.name}. The Haven is a town now.`), 900); checkRank(); return true;
}
const evMood = () => (S.sv.length ? S.sv.reduce((a, q) => a + (q.sat || 0), 0) / S.sv.length : 0);
function evLock(e) { if (e.lvl && (S.lvl || 1) < e.lvl) return `Opens at Haven level ${e.lvl}`; if (e.people && S.sv.length < e.people) return `Needs ${e.people} people (you have ${S.sv.length})`; if (e.mood && evMood() < e.mood) return `Needs average mood ♥${e.mood} (now ♥${Math.round(evMood())})`; if (e.banner && (S.banners || []).some((b) => b.route === 'community' && !b.used)) return 'A Community Banner is already flying'; return ''; }
function showUpgrade(tab) {   /* the DV2-style Upgrade Town screen */
  closeP(); endBuildMode(true); upTab = tab || upTab; const c = rankConds();
  let h = tabBar([['rank', 'Upgrade', 'rating'], ['events', 'Events', 'events']], upTab);
  if (upTab === 'rank') {
    h += `<div class="ribbon"><div class="rname">${esc(S.townName || 'Zombie Haven')}</div><div class="rstars" style="font-size:22px;letter-spacing:0">Level ${S.lvl || 1} <span style="font-size:15px;opacity:.85">· Era ${eraOf().n}: ${eraOf().name}</span></div></div>`
      + `<div class="card"><div class="row" style="gap:3px">${Array.from({ length: LV_MAX }, (_, i) => `<span style="flex:1;height:9px;border-radius:3px;background:${i < (S.lvl || 1) ? 'var(--gold)' : 'rgba(255,255,255,.15)'};${[4, 9].includes(i) ? 'margin-right:5px' : ''}"></span>`).join('')}</div><div class="sm">Banners: ${(S.banners || []).length ? S.banners.map((b) => BANNER_ROUTES[b.route].icon + (b.used ? ' (raised)' : ' (ready)')).join(' ') : 'none yet'}</div></div>`;
    if (S.lvUp) { const f = 1 - S.lvUp.left / S.lvUp.total; h += `<div class="card"><b>🏗 Upgrading to level ${S.lvUp.to}</b>${progRow('Done', Math.round(f * 100), 100)}<div class="sm">${lvLeftText()} left, in real time (it keeps going while the app is closed, at the same pace).</div><div style="display:flex;gap:6px;margin-top:6px">${S.lvUp.left > LV_RUSH_MS ? `<button class="act" id="uRush" ${(S.ren || 0) >= lvRushCost(LV_RUSH_MS) ? '' : 'disabled'}>⏩ 2 h sooner · ${lvRushCost(LV_RUSH_MS)} renown</button>` : ''}<button class="act go" id="uRushAll" ${(S.ren || 0) >= lvRushCost(S.lvUp.left) ? '' : 'disabled'}>Finish now · ${lvRushCost(S.lvUp.left)} renown</button></div></div>`; }
    if (!c) h += '<div class="card" style="text-align:center">The Haven is at the highest level.</div>';
    else {
      if (!S.lvUp) h += `<div class="conds"><div class="ctitle">Level ${(S.lvl || 1) + 1} · step ${Math.min(3, S.lvStep || 0)} of 3</div>` + c.map((r) => `<div class="crow"><span class="cic">${uiIcon(r.ic)}</span><span class="cname">${r.name}${r.sub ? `<small>${r.sub}</small>` : ''}</span>${r.wide ? '' : `<span class="cneed">${r.need}</span>`}<span class="chave${r.wide ? ' wide' : ''}">${r.have}</span><span class="cok ${r.ok ? 'y' : 'n'}">${r.ok ? '✔' : '✘'}</span></div>`).join('') + '</div>';
      { const nl = (S.lvl || 1) + 1, nr = rankOfLvl(nl), un = nr > (S.rank || 1) ? rankUnlocks(nr) : [`+2 scrap, +2 food, +2 water`]; if (terrOfLvl(nl) > terrOfLvl(S.lvl || 1)) un.unshift('More land for the Haven'); un.push(`Upgrade time ${rtText(lvMs(nl))}, in real time (renown can speed it up)`); h += `<div class="card"><b>Level ${nl} brings</b>${un.map((x) => `<div class="sm">• ${esc(x)}</div>`).join('')}</div>`; }
      if (!S.lvUp) h += `<div style="text-align:center"><button class="act go" id="uDo" ${c.every((r) => r.ok) ? '' : 'disabled'}>Start upgrading to level ${(S.lvl || 1) + 1}</button></div>`;
    }
  } else {
    const done = (S.lastEventDay ?? -1) >= S.day;
    h += `<div class="sm" style="margin-bottom:6px">Hold one event a day. Events give Renown and cheer everyone up${S.eventOn && nowH() < S.eventOn.until ? ` · <b>${TOWN_EVENTS[S.eventOn.k].name}</b> is on now` : ''}. Held so far: <b>${S.eventsHeld || 0}</b>.</div>`;
    h += Object.entries(TOWN_EVENTS).map(([k, e]) => { const lk = (e.rank || 1) > S.rank, why = lk ? '' : evLock(e), can = !lk && !why && !done && Object.entries(e.cost).every(([r, v]) => S[r] >= v);
      return `<div class="card"><div class="row"><span style="font-size:30px">${e.icon}</span><span class="sp"><b>${e.name}</b> <span class="sm">+${e.ren}★ · ${e.hours} h</span><br><small>${e.desc}</small>${e.gain ? `<br><small style="color:var(--good)">You get: ${costText(e.gain)}</small>` : ''}${why ? `<br><small style="color:var(--bad)">${why}</small>` : ''}</span><button class="act${can ? ' go' : ''}" data-ev="${k}" ${can ? '' : 'disabled'}>${lk ? '🔒 Rank ' + e.rank : costText(e.cost)}</button></div></div>`; }).join('');
  }
  /* 3D.346 (owner, 24 Nov, W249: "Next"): the Upgrade screen in the phone look: the town's name and level over a row of level steps, then grouped lists
     (Upgrading with a bar; To reach level N with a tick or a cross per row; What it brings) and one wide lime button; Events as one list. Same ids. */
  if (phoneOn()) { const sec = (t) => `<div class="phSec">${t}</div>`, grp = (x) => `<div class="phCard">${x}</div>`, L = S.lvl || 1, er = eraOf();
    const tick = (ok) => `<span class="phOk ${ok ? 'y' : 'n'}">${ok ? '✓' : '✕'}</span>`;
    h = `<div class="phSeg">${[['rank', 'Upgrade'], ['events', 'Events']].map(([k, l]) => `<button data-tab="${k}" class="${k === upTab ? 'on' : ''}">${l}</button>`).join('')}</div>`;
    if (upTab === 'rank') {
      h += `<div class="phLvHead"><small>${esc(S.townName || 'Zombie Haven')}</small><b>Level ${L}</b><span>Era ${er.n}: ${esc(er.name)}</span><div class="phLvSteps">${Array.from({ length: LV_MAX }, (_, i) => `<i class="${i < L ? 'on' : ''}${[4, 9, 14].includes(i) ? ' gap' : ''}"></i>`).join('')}</div></div>`
        + grp(`<div class="phR"><span class="k">Banners</span><span class="v">${(S.banners || []).length ? S.banners.map((b) => BANNER_ROUTES[b.route].icon + (b.used ? ' raised' : ' ready')).join('  ') : 'None yet'}</span></div>`);
      if (S.lvUp) { const f = 1 - S.lvUp.left / S.lvUp.total;
        h += sec('Upgrading to level ' + S.lvUp.to) + grp(`<div class="phR phBar"><b class="w">Done</b><span class="phBarT"><i style="width:${Math.round(f * 100)}%;background:#c6ff4d"></i></span><em>${lvLeftText()} left</em></div>`)
          + `<div class="phFootN">In real time: it keeps going while the game is closed.</div>`
          + (S.lvUp.left > LV_RUSH_MS ? `<button class="act phWide" id="uRush" ${(S.ren || 0) >= lvRushCost(LV_RUSH_MS) ? '' : 'disabled'}>2 h sooner · ${lvRushCost(LV_RUSH_MS)} renown</button>` : '')
          + `<button class="act go phWide" id="uRushAll" ${(S.ren || 0) >= lvRushCost(S.lvUp.left) ? '' : 'disabled'}>Finish now · ${lvRushCost(S.lvUp.left)} renown</button>`; }
      if (!c) h += grp('<div class="phR"><span class="k">The Haven is at the highest level.</span></div>');
      else { const nl = L + 1;
        if (!S.lvUp) { const n = c.filter((r) => r.ok).length;
          h += sec(`To reach level ${nl} · step ${Math.min(3, S.lvStep || 0)} of 3`) + grp(c.map((r) => `<div class="phR tall"><span class="phCi">${uiIcon(r.ic)}</span><span class="tx"><b>${r.name}</b>${r.sub ? `<small>${r.sub}</small>` : ''}</span><span class="v${r.ok ? '' : ' short'}">${r.wide ? r.have : `${r.have} of ${r.need}`}</span>${tick(r.ok)}</div>`).join(''))
            + `<div class="phFootN">${n} of ${c.length} done.</div>`; }
        { const nr = rankOfLvl(nl), un = nr > (S.rank || 1) ? rankUnlocks(nr) : ['+2 scrap, +2 food, +2 water']; if (terrOfLvl(nl) > terrOfLvl(L)) un.unshift('More land for the Haven');
          h += sec(`Level ${nl} brings`) + grp(un.map((x) => `<div class="phR"><span class="k">${esc(x)}</span></div>`).join('') + `<div class="phR"><span class="k">Upgrade time</span><span class="v">${rtText(lvMs(nl))}</span></div>`); }
        if (!S.lvUp) h += `<button class="act go phWide phPin" id="uDo" ${c.every((r) => r.ok) ? '' : 'disabled'}>Start upgrading to level ${nl}</button>`; }
    } else { const done = (S.lastEventDay ?? -1) >= S.day, on = S.eventOn && nowH() < S.eventOn.until;
      h += `<div class="phFootN" style="margin:10px 4px 0">One event a day. Events give Renown and cheer everyone up.${on ? ` <b>${TOWN_EVENTS[S.eventOn.k].name}</b> is on now.` : done ? ' Today\'s is done.' : ''} Held so far: ${S.eventsHeld || 0}.</div>`
        + sec('Events') + grp(Object.entries(TOWN_EVENTS).map(([k, e]) => { const lk = (e.rank || 1) > S.rank, why = lk ? 'Opens at rank ' + e.rank : evLock(e), can = !lk && !why && !done && Object.entries(e.cost).every(([r, v]) => S[r] >= v);
          return `<div class="phR tall phEv${can ? '' : ' off'}"><span class="phEvI">${e.icon}</span><span class="tx"><b>${e.name}</b><small>${e.desc}</small><small class="m">+${e.ren} renown · ${e.hours} h${e.gain ? ' · you get ' + costText(e.gain) : ''}</small>${why ? `<small class="bad">${why}</small>` : ''}</span><button class="act${can ? ' go' : ''}" data-ev="${k}" ${can ? '' : 'disabled'}>${lk ? 'Locked' : costText(e.cost)}</button></div>`; }).join('')); }
    h = `<div class="phUp">${h}</div>`; }
  $('ib').innerHTML = h; showPanel('Upgrade Town');
  $('ib').querySelectorAll('[data-tab]').forEach((b) => { b.onclick = () => showUpgrade(b.dataset.tab); });
  const u = $('uDo'); if (u) u.onclick = () => { if (upgradeTown()) showUpgrade('rank'); }; for (const [id, all] of [['uRush', false], ['uRushAll', true]]) { const b = $(id); if (b) b.onclick = () => { lvRush(all); showUpgrade('rank'); }; }
  $('ib').querySelectorAll('[data-ev]').forEach((b) => { b.onclick = () => { if (holdEvent(b.dataset.ev)) showUpgrade('events'); }; });
}
let upTab = 'rank';
function ui() {
  if (performance.now() - (ui.adv || 0) > 1500) { ui.adv = performance.now(); try { advisorUpdate(); } catch (e) { /* never block the HUD */ } }
  { const n = rankRules[S.rank], pv = rankRules[S.rank - 1] || { ren: 0 }, bar = $('renBar'); if (bar) { const rc = rankConds(); bar.style.width = (rc && rc.length ? Math.round(100 * rc.reduce((a, r) => a + (r.ok ? 1 : Math.min(1, (+r.have || 0) / Math.max(1, +r.need || 1))), 0) / rc.length) : 100) + '%'; }   /* audit: the bar fills toward the next rank's conditions (people + buildings), not old Renown thresholds */ if (bar) $('gauge').style.setProperty('--p', parseFloat(bar.style.width) || 0); } $('food').textContent = Math.floor(S.food); $('water').textContent = Math.floor(S.water); $('mat').textContent = Math.floor(S.mat); { const rr = $('rare'); if (rr) supplyChip(rr); } { const w = $('wood'); if (w) w.textContent = Math.floor(S.wood || 0); const sn = $('stone'); if (sn) { sn.textContent = Math.floor(S.stone || 0); sn.parentNode.style.display = (S.stone || 0) > 0 || hqTier() >= 2 ? '' : 'none'; } } $('ren').textContent = S.ren; $('rank').textContent = 'Lv ' + (S.lvl || 1); $('gauge').classList.toggle('ready', !!S.rankReady); $('threat').textContent = S.threat;
  { const mb = $('mExp'); if (mb) { leadsTidy(); const n = (S.leads || []).length; mb.classList.toggle('dim', !n && !S.trip); mb.dataset.badge = !S.trip && n ? n : ''; } }
  $('clock').textContent = (`${S.weather ? WX_ICON[S.weather.kind] || "🌧" : seasonOf().icon} DAY ${S.day} · ${String(S.hour).padStart(2, '0')}:00`);
  {   /* 3D.159 the UX study: a visible countdown to night. From 17:00 "Night in 3h", amber at dusk (19:00), blue through the night */
    const ck = $('clock'), h = S.hour, sub = h >= 17 && h < 20 ? `🌙 Night in ${20 - h}h` : isNight() ? `☀ Dawn in ${(30 - h) % 24}h` : '', ph = h === 19 ? 'dusk' : isNight() ? 'night' : '';
    if (ck.dataset.sub !== sub || ck.dataset.ph !== ph) { const re = !ck.dataset.sub !== !sub; ck.dataset.sub = sub; ck.dataset.ph = ph; if (re) requestAnimationFrame(layoutTop); } }
  $('qt').textContent = S.stage === 0 ? 'Build a Rain Barrel' : S.stage === 1 ? `Defeat 3 Walkers (${Math.min(S.kills, 3)}/3)` : guideActive() ? `▶ ${GUIDE[S.guide].desc}` : (S.mission ? `${S.mission.name}: ${Math.floor(S.mission.progress)}/${S.mission.goal}` : 'Grow the Haven!');
}

