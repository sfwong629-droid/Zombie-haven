/* ---------------- 3D.67 Medic field aid. A Medic patches the hurt where they stand and gets the downed back on their feet, but only so far:
   a field dressing heals to 60% at most (3D.286: 75%, see PATCH_CAP; 60% is now only the limit of a field wound), and someone revived in the field gets up at 30% Wounded (no healing past 60% until a medical
   building treats them). Being downed twice in a day is too serious for the field: the Medic stabilises them (the bleed stops) and carries them in.
   Each treatment uses 1 cloth or 0.1 meds. ---------------- */
const FIELD_CAP = .6, PATCH_TICKS = 240, PATCH_CD = 3600;
/* 3D.286 healing, part 3 (owner, 20 Nov, W130): "rounds fill the gaps". A Medic's round patches to PATCH_CAP (75%; it was 60%) and is for the people who
   cannot go to a medical building: on a shift or a guard post, the building full, or no medical building at all (and anyone at all while a zombie is in
   town, when nobody sets out for care). Someone who can walk to the Tent is left to do that. A field wound still stops at 60% (FIELD_CAP). */
const PATCH_CAP = .75;
const patchCap = (q) => Math.round(q.max * (q.wounded ? FIELD_CAP : PATCH_CAP));
const cantGoCare = (q) => zInTown() || onShift(q) || postActive(myPost(q)) || !careRoom(q);
/* 3D.285 healing, part 2 (owner, 20 Nov, W130): "the tent first". With no zombie in town, anyone under TENT_PCT of their health (or with a field wound)
   walks to a medical building that has room, in free time or between jobs, and stays until fully healed. People on a shift or a guard post do not go
   (the Medic's rounds are for them); during danger the old bars for leaving work (60% / 50%) still decide. */
const TENT_PCT = .8, TENT_STAYS = 12;
const wantsCare = (s) => (s.hp < s.max * TENT_PCT || s.wounded) && s.hp > 0 && s.hunger < 100 && s.thirst < 100;
function careRoom(s) { const b = chooseFacility(s, false, 'injury'); return b && needScore(s, b) > -900 ? b : null; }   /* a medical building this person can use now: standing, room left, a way there */
function goCare(s) { if (!wantsCare(s) || zInTown()) return false; const b = careRoom(s); if (!b) return false; s.facility = b; s.mode = 'goFacility'; s.stateTicks = 9999; s.dest = null; s.path = null; s.stays = 0; s.why = `${s.wounded ? 'Wounded' : 'Hurt'} → ${DEFS[b.type].name}`; return true; }
const MEND_PCT = .02;   /* 3D.284: the slow mend: this share of full health each game hour with no zombie in town */
const zNear = (p, r) => S.z.some((z) => z.hp > 0 && !z.human && dist(z.w, p) < r);
function patchSupply(dry) { if ((S.cloth || 0) >= 1) { if (!dry) { S.cloth -= 1; flow('cloth', 'Field aid', -1); } return true; } if ((S.meds || 0) >= .1) { if (!dry) { S.meds -= .1; flow('meds', 'Field aid', -.1); } return true; } return false; }
const injuryTrip = (q) => ['goFacility', 'useFacility'].includes(q.mode) && q.facility && facilityRules[q.facility.type] && facilityRules[q.facility.type].need === 'injury';
/* 3D.287 healing, part 4 (owner, 20 Nov, W130): the Medic on shift at a medical building. They stay while someone is in it, in care there, or on the
   way to it (walking or being carried); when it is empty they do rounds. With two or more Medics one always stays: a Medic with no medical shift does
   the rounds and the one at the building stays in; if every Medic staffs a medical building, the first of them stays and the others go out when theirs is empty. */
const medPost = (s) => !!(s.post && s.post.staff === s && facilityRules[s.post.type] && facilityRules[s.post.type].need === 'injury');
const medBusy = (b) => facilityUsers(b) > 0 || S.sv.some((q) => (q.mode === 'hospital' && (q.careAt === b || (!q.careAt && medSite() === b))) || (q.mode === 'rescueCarry' && q.careTo === b));
function shiftRounds(s) {
  if (!medPost(s) || medBusy(s.post)) return false;
  const others = S.sv.filter((q) => q !== s && q.job === 'Medic' && q.hp > 0 && !['down', 'hospital', 'away', 'errand'].includes(q.mode)); if (!others.length) return true;
  if (others.some((q) => !(medPost(q) && onShift(q)))) return false;   /* someone else does the rounds */
  return others.some((q) => q.id < s.id && q.mode === 'work');   /* all at medical buildings: the first stays in */
}
function medicFindPatient(s) {
  if (s.job !== 'Medic' || s.hp < s.max * .5 || (onShift(s) && !shiftRounds(s)) || s.carriedLoot || !patchSupply(true)) return null;
  let best = null, bd = 14;
  for (const q of S.sv) { if (q === s || q.hp <= 0 || q.hp >= patchCap(q) || (q.aidBy && q.aidBy.mode === 'fieldAid' && q.aidBy.aidTo === q) || (q.patchT && tick - q.patchT < PATCH_CD) || injuryTrip(q)
      || ['down', 'hospital', 'away', 'errand', 'chase', 'attack', 'recover', 'rescueTo', 'rescueCarry', 'fieldAid', 'hide', 'hiding'].includes(q.mode) || (insideBuilding(q) && q.mode !== 'work') || q.sleeping || !cantGoCare(q)) continue;   /* 3D.286: a worker on shift indoors is seen at the door */
    const d = dist(s.w, q.w); if (d < bd && !zNear(q.w, 5)) { bd = d; best = q; } }
  return best;
}
function startAid(s, q, kind) { s.mode = 'fieldAid'; s.aidTo = q; s.aidKind = kind; q.aidBy = s; s.aidT = 0; s.path = null; s.dest = null; s.target = null; s.facility = null; s.activity = null; s.purpose = null;
  if (kind === 'revive') { q.stable = true; }   /* pressure on the wound: the bleed stops while they work */
  s.why = kind === 'patch' ? `Patching up ${q.name}` : `Treating ${q.name} where they fell`; }
function endAid(s) { const q = s.aidTo; if (q && q.aidBy === s) q.aidBy = null; s.aidTo = null; s.aidKind = null; s.aidT = 0; if (s.activity === 'Treating') s.activity = null; }
function fieldAidAI(s) {
  const q = s.aidTo, kind = s.aidKind;
  if (!q || !S.sv.includes(q) || (kind === 'patch' ? q.mode === 'down' || q.hp >= patchCap(q) || ['hospital', 'away', 'errand'].includes(q.mode) || injuryTrip(q) : q.mode !== 'down')) {
    if (q && kind === 'revive' && q.rescuer === s) { q.rescuer = null; q.stable = false; } s.rescuing = null; endAid(s); enterFree(s, 30); return; }
  if (kind === 'patch' && (zNear(q.w, 5) || threatOf(s))) { endAid(s); enterFree(s, 60); return; }
  if (kind === 'patch' && s.aidT === 0 && medPost(s) && onShift(s) && medBusy(s.post)) { endAid(s); enterFree(s, 5); s.why = `A patient at the ${DEFS[s.post.type].name}: heading back`; return; }   /* 3D.287: someone set out for the building while the Medic was walking to a round: back to the building (a dressing already begun is finished first) */
  if (kind === 'revive' && zNear(q.w, 2.5)) { endAid(s); q.stable = false; s.carrying = q; q.w = { x: s.w.x, y: s.w.y }; s.mode = 'rescueCarry'; s.path = null; s.careTo = careDest(); s.why = `No time: carrying ${q.name} to safety`; return; }   /* zombies close in: grab them and go */
  const d = dist(s.w, q.w);
  if (d > .95) { s.aidT = 0; s.activity = null;
    /* 3D.181 bug B17: the Medic used to aim for a spot 0.6 tiles from the patient on the Medic's own side. With a fence between them that spot moved
       as the Medic moved (it was measured from where the Medic stood), so the route kept changing and the Medic drifted about or stood at arm's length
       all day, never within reach (0.95). They now walk the real route to the patient and stop as soon as they are within reach. */
    s.arrG = null; let r = followPath(s, q.w, .02); if (r === 'arrived') r = 'fail';
    if (r === 'fail' && (s.aidFail = (s.aidFail || 0) + 1) > 4) { s.aidFail = 0; if (kind === 'revive') { q.rescuer = null; q.stable = false; s.rescuing = null; } endAid(s); enterFree(s, 60); } return; }
  s.moving = false; s.path = null; s.aidFail = 0; s.activity = 'Treating'; if (s.aidT === 0) { s.facing = q.w.x < s.w.x ? -1 : 1; emote(s, '🩹', PATCH_TICKS, true); }
  if (++s.aidT < PATCH_TICKS) return;
  if (!patchSupply(false)) { floats.push({ w: { ...s.w }, t: 'Needs 🧵 or 💊', col: '#ff8a4b', a: 70 });
    if (kind === 'revive') { endAid(s); q.stable = false; s.carrying = q; s.mode = 'rescueCarry'; s.path = null; s.careTo = careDest(); s.why = `Out of dressings: carrying ${q.name} in`; } else { endAid(s); enterFree(s, 60); } return; }
  gainXp(s, kind === 'revive' ? 4 : 2); addBond(s, q, kind === 'revive' ? 6 : 3);
  if (kind === 'patch') { const to = patchCap(q), h = Math.max(0, to - q.hp); q.hp = Math.max(q.hp, to); q.patchT = tick; floats.push({ w: { ...q.w }, t: '+' + h + ' HP 🩹', col: '#7fd35a', a: 70 }); emote(q, '🙏', 90, true); endAid(s); enterFree(s, 40); return; }
  if ((q.downN || 0) >= 2) {   /* too serious for the field: stabilised, then carried in */
    endAid(s); q.stable = true; s.carrying = q; q.w = { x: s.w.x, y: s.w.y }; s.mode = 'rescueCarry'; s.path = null; s.careTo = careDest(); s.why = `${q.name} is stable but needs care: carrying them in`;
    note('routine', `${s.name} stabilised ${q.name} (down twice today: needs a medical bed).`); return; }
  endAid(s); q.hp = Math.max(1, Math.round(q.max * .3)); q.bleed = null; q.warned = false; q.stable = false; q.rescuer = null; q.wounded = !(q.immune || (S.vaccine && rnd() < .5)); s.rescuing = null; enterFree(q, 150); q.why = 'Back on their feet (Wounded)'; emote(q, '🙏', 120, true);
  floats.push({ w: { ...q.w }, t: '🩹 BACK UP', col: '#7fd35a', a: 80 }); statAdd('saved'); SFX('rescued'); note('routine', `${s.name} got ${q.name} back on their feet. ${q.name} is Wounded until treated at a medical building.`); enterFree(s, 40);
}
function beingCarried(s) { const r = s.rescuer; return !!(r && r.carrying === s && r.mode === 'rescueCarry'); }
function bleedTick(s) {
  if (s.bleed == null) { s.bleed = bleedMax(); s.warned = false; }
  if (beingCarried(s) || s.stable) return;   /* 3D.67: a Medic stabilised them */
  if (!(townHyb('combatmedic') && tick % 2) && !(gearFx(s, 'float') && tick % 3 === 0)) s.bleed--;   /* 3D.148 Life Jacket: two ticks in three */   /* 3D.104 a Combat Medic in town: downed friends bleed out half as fast */
  if (!s.warned && s.bleed <= 1800) { s.warned = true; note('routine', s.name + ' is bleeding out!'); }
  if (s.bleed <= 0) killSurvivor(s, 'bled out');
}
function killSurvivor(s, cause) {
  if (!S.sv.includes(s)) return;
  S.sv = S.sv.filter((q) => q !== s); bondsOnDeath(s); endAid(s); for (const q of S.sv) if (q.aidTo === s) { endAid(q); if (q.mode === 'fieldAid') enterFree(q, 60); }
  S.deaths = (S.deaths || []).filter((d) => d > nowD() - 1); S.deaths.push(nowD());
  if (S.deaths.length >= 2 && !graceOn()) { S.graceUntil = nowD() + 1.5; note('important', '🕯 THE HAVEN MOURNS', { log: 'After so many losses the survivors hold a vigil. The horde pulls back for a while — rebuild your defences.' }); }
  for (const q of S.sv) { if (q.rescuing === s) { q.rescuing = null; if (['rescueTo', 'rescueCarry'].includes(q.mode)) { q.carrying = null; enterFree(q, 60); } } if (q.target === s) q.target = null; }
  for (const b of world.buildings) if (b.staff === s) b.staff = null;
  if (selected && selected.ref === s) { selected = null; closeP(); }
  for (const sl of SLOTS) { const id = s.eq && s.eq[sl]; if (id && id !== 'pipe') stashAdd(id); }   /* their gear goes back to the stash */
  if (s.pet) { (S.pets = S.pets || []).push(s.pet); s.pet = null; }   /* their pet stays with the town */
  let near = 0;
  for (const q of S.sv) { const close = dist(q.w, s.w) < 6 || (q.job === s.job); const d = close ? 6 : 2; q.sat = Math.max(0, q.sat - d); moodAdd(q, -d, s.name + ' died'); if (close) near++; }
  S.griefUntil = nowH() + 18; for (const q of S.sv) emote(q, '😢', 160, true); barkSomeone('grief', { other: s.name }, { pri: 2 }, s.w);   /* V3D.14 mourning */
  S.fallen = S.fallen || []; S.fallen.push({ name: s.name, job: s.job, l: s.l, day: S.day, cause, trait: s.trait });
  if (s.w && !insideBuilding(s)) {   /* V3D.21: the dead rise again: a walker in their clothes gets up where they fell */
    const n0 = S.z.length; spawn(Math.floor(s.w.x), Math.floor(s.w.y), 'walker'); const z = S.z.length > n0 ? S.z[S.z.length - 1] : null;
    if (z) { z.w = { x: s.w.x, y: s.w.y }; z.turned = { name: s.name, fem: (() => { try { return window.ZHChars && ZHChars.look(s).sex === 'f'; } catch (e) { return false; } })() }; z.mode = 'appear'; z.stateTicks = 240;
      note('important', `🧟 ${s.name} rose again as a zombie`, { at: z.w, float: '🧟 TURNED', col: '#a8e07a' }); }
  }
  autoStaff();
  showEventPopup({ stage: { scene: 'sad', head: 'Farewell', icon: '🕯️', badge: s.job + ' Lv.' + s.l, hero: s, crowd: others(s) }, short: `${s.name} has died.`, chips: [S.sv.length + ' survivors remain'], title: 'LOST: ' + s.name.toUpperCase(), text: `${s.name}, a level ${s.l} ${s.job}, ${cause}. ${near ? near + ' survivors are shaken.' : ''} Their name is added to the memorial in the Town panel.`, gains: S.sv.length + ' survivors remain' });
  ui();
}

/* 3D.125 review bug 1: people sat at 100 hunger and lost health beside a stocked pantry when the town had no food or water
   building (the daily rations were paid, but hunger only dropped at a food building). Now anyone very hungry or thirsty eats
   or drinks straight from the stores when there is no such building, and nobody ever starves while there is stock. */
function pantry(s) {
  const has = (need) => world.buildings.some((b) => !b.burnt && facilityRules[b.type] && facilityRules[b.type].need === need);
  if (s.hunger >= (has('hunger') ? 97 : 70) && S.food >= 1) { s.hunger = Math.max(0, s.hunger - 40); floats.push({ w: { ...s.w }, t: '🍖', col: '#ffe9b8', a: 60 }); if (!has('hunger') && S.pantryDay !== S.day) { S.pantryDay = S.day; say('People are eating straight from the stores: a Garden Plot or Canteen feeds them better.'); } }
  if (s.thirst >= (has('thirst') ? 97 : 70) && S.water >= 1) { s.thirst = Math.max(0, s.thirst - 40); floats.push({ w: { ...s.w }, t: '💧', col: '#cfe9ff', a: 60 }); }
}
function starve(s) {
  if (s.hunger >= 100 || s.thirst >= 100) {
    s.starveT = (s.starveT || 0) + 1; if (s.starveT % 5 === 0) { s.hp -= 1; floats.push({ w: { ...s.w }, t: '-1', col: '#ff8a4b', a: 55 }); }   // 1 HP per 7.5 s: about 1.4 game days from full HP to collapse
    s.why = (s.thirst >= 100 ? 'Dying of thirst' : 'Starving');
    if (!s.starveWarn) { s.starveWarn = true; note('critical', s.name + ' is ' + (s.thirst >= 100 ? 'dying of thirst' : 'starving'), { key: 'starve', icon: '🥫', at: () => { const q = S.sv.find((v) => v.hunger >= 100 || v.thirst >= 100); return q ? q.w : null; }, live: () => S.sv.some((v) => v.hunger >= 100 || v.thirst >= 100), dyn: () => { const n = S.sv.filter((v) => v.hunger >= 100 || v.thirst >= 100).length; return `${n} survivor${n > 1 ? 's are' : ' is'} starving or dying of thirst · losing HP`; }, acts: [{ label: 'Food', fn: () => showResource('food') }, { label: 'Water', fn: () => showResource('water') }] }); }
  } else s.starveWarn = false;
}
function useBandage(s) {
  if (s.mode !== 'down') return false;
  BANDAGE_COST = researched('medicine') ? 1 : 2; BANDAGE_TICKS = researched('medicine') ? 5400 : 3600;
  if ((S.cloth || 0) >= 1) S.cloth -= 1; else if ((S.meds || 0) >= 1) S.meds -= 1; else if (S.mat >= BANDAGE_COST * 2) S.mat -= BANDAGE_COST * 2; else { say('A bandage needs 1 cloth, 1 meds or ' + BANDAGE_COST * 2 + ' scrap.'); return false; }   /* 3D.163 play-test: a town died with 20 meds in store and no cloth; meds now patch a wound too */   /* V3D.25: bandages are cloth; scrap rags cost double */ if (s.bleed == null) s.bleed = bleedMax(); s.bleed = Math.min(s.bleed + BANDAGE_TICKS, bleedMax() + BANDAGE_TICKS); s.warned = false; say('Bandaged ' + s.name + ' · +60 s'); ui(); return true;
}
const routing = () => { const d = S.sv.filter((q) => q.mode === 'down').length; return d >= 3 || (d >= 2 && S.z.some((z) => z.type === 'boss' && z.hp > 0)); };   /* V2.37: the fight is being lost */
function retreatCheck(s) {
  if (s.fleeT > 0) return false;
  if (routing() && s.hp < s.max * .7 && !s.rescuing) { const z = nearestZombie(s); if (z) { s.fleeT = 900; s.target = null; s.path = null; startHide(s, z); if (s.mode === 'hide') { s.why = 'The fight is lost: sheltering until it is safe'; return true; } } }
  const on = S.z.filter((z) => z.hp > 0 && z.target === s && ['zchase', 'zattack', 'zrecover'].includes(z.mode) && dist(z.w, s.w) < 2.5).length;
  if ((on >= 3 && s.hp < s.max * .6) || (on >= 2 && s.hp < s.max * .45)) {   /* V2.37: two on you and under 45% is enough to fall back */ const keep = S.retreat; S.retreat = 100; const r = retreatCheck2(s); S.retreat = keep; if (r) s.why = 'Outnumbered — falling back to ' + (medSite() ? DEFS[medSite().type].name : 'cover'); return r; }
  return retreatCheck2(s);
}
function retreatCheck2(s) {
  if (s.hp < s.max * (S.retreat === 100 ? 100 : Math.max(5, Math.min(95, retreatPct() + traitRetreat(s)))) / 100) { s.fleeT = 1500; s.target = null; s.path = null; const m = medSite(); if (m) { s.facility = m; s.mode = 'goFacility'; s.stateTicks = 9999; s.dest = null; s.why = (hasT(s, 'cautious') && S.retreat !== 100 ? 'Hurt (Cautious: falls back early)' : 'Badly hurt') + ' → ' + DEFS[m.type].name; } else { const z = nearestZombie(s); if (z) { startHide(s, z); s.why = 'Badly hurt — ' + s.why; } else { s.mode = 'free'; s.stateTicks = 30; s.why = 'Retreating, badly hurt'; } } return true; }
  return false;
}

