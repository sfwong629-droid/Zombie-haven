/* ---------------- V3D.23 construction jobs: new sites (S.sites) and upgrades (b.upg) need their materials delivered ----------------
   Haulers take materials from the stockpile (deducted when they pick them up) and carry them to the job; gatherers bring
   fresh loads straight to it. Once everything is in, the work counts down (faster while someone hammers). */
function jobList() { return [...(S.sites || []).map((st) => ({ j: st, b: st, site: true })), ...world.buildings.filter((b) => b.upg).map((b) => ({ j: b.upg, b, site: false }))]; }
const jobById = (id) => jobList().find((x) => x.j.id === id) || null;
const jobName = (x) => DEFS[x.site ? x.j.type : x.j.to].name;
const jobPt = (x) => Wd.approachPoint(x.b);
const jobReady = (j) => Object.entries(j.need || {}).every(([k, v]) => (j.got[k] || 0) >= v);
const jobMiss = (j) => Object.fromEntries(Object.entries(j.need || {}).map(([k, v]) => [k, v - (j.got[k] || 0)]).filter(([, v]) => v > 0));
function newJob(o, cost) { const sum = Object.values(cost).reduce((a, v) => a + v, 0), dur = Math.round(Math.min(4800, 900 + sum * 45)); return Object.assign(o, { id: (S.jobSeq = (S.jobSeq || 0) + 1), need: { ...cost }, got: {}, inb: {}, cons: dur, dur, made: tick }); }
/* 3D.172 round 3 (New player: a Garden Plot unbuilt for 6 days; Builder: a Medical Tent waited 5 days for cloth, no word): a site that has had
   nothing delivered for 6 game hours says why, once a day: a material you have none of, or nobody is carrying to it */
/* 3D.172: a storage building whose door is walled off from the rest of the town. 3D.174 (round 4: "the Lodge's door is walled in" every night,
   with no way to find the tile): the game opens it itself, turning the fewest wall sections between the door and the town into Gates */
/* 3D.174 round 4 (Builder, Defender: "the outer wall line kept growing"): when the land grows, say what that means for the wall */
function landGrewNote() { const Zn = Wd.WALLZONE, n = 2 * (Zn.x1 - Zn.x0 + 1) + 2 * (Zn.y1 - Zn.y0 - 1), p = Wd.perimeter(world);
  note('important', `🗺 The land grew. The new outer wall line is ${n} tiles long; your old wall still protects the ${p.inside} building${p.inside === 1 ? '' : 's'} inside it.`, { log: `The land grew: new outer wall line ${n} tiles. Buildings inside a closed wall: ${p.inside} of ${p.total}. Sealed needs the HQ and 3 in 4.` }); }
function storeReach(st, others) { const t0 = Wd.approachTile(st), seen = new Set([t0.x + ',' + t0.y]), q = [t0];
  while (q.length && seen.size < 4000) { const c = q.pop(); for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) { const nx = c.x + dx, ny = c.y + dy, k = nx + ',' + ny; if (!seen.has(k) && Wd.walkable(world, nx, ny, false)) { seen.add(k); q.push({ x: nx, y: ny }); } } }
  return { seen, reach: others.filter((t) => seen.has(t.x + ',' + t.y)).length }; }
function gateOut(st, others, seen) {   /* 0-1 search from the door: open ground costs 0, a wall section 1; stop at the first doorstep the door cannot reach */
  const t0 = Wd.approachTile(st), want = new Set(others.filter((t) => !seen.has(t.x + ',' + t.y)).map((t) => t.x + ',' + t.y)); if (!want.size) return [];
  const dist = new Map([[t0.x + ',' + t0.y, 0]]), prev = new Map(), dq = [t0];
  while (dq.length) { const c = dq.shift(), ck = c.x + ',' + c.y, cd = dist.get(ck); if (want.has(ck)) { const walls = []; let k = ck; while (k) { const [x, y] = k.split(',').map(Number), w = Wd.wallAt(world, x, y); if (w && w.type !== 'gate' && !w.broken) walls.push(w); k = prev.get(k); } return walls; }
    for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) { const nx = c.x + dx, ny = c.y + dy, nk = nx + ',' + ny, w = Wd.wallAt(world, nx, ny), walk = Wd.walkable(world, nx, ny, false);
      const step = walk ? 0 : (w && w.type !== 'gate' ? 1 : -1); if (step < 0) continue; const nd = cd + step; if (nd > 3 || (dist.has(nk) && dist.get(nk) <= nd)) continue; dist.set(nk, nd); prev.set(nk, ck); if (step) dq.push({ x: nx, y: ny }); else dq.unshift({ x: nx, y: ny }); } }
  return []; }
function storeBoxCheck() {
  const stores = world.buildings.filter((b) => DEFS[b.type] && (DEFS[b.type].fam === 'hq' || DEFS[b.type].fam === 'storage')); if (!stores.length) return;
  const others = world.buildings.filter((b) => !stores.includes(b)).map((b) => Wd.approachTile(b)).filter((t) => Wd.walkable(world, t.x, t.y, false)); if (others.length < 3) return;   /* a doorstep nobody can stand on does not count */
  for (const st of stores) { let r = storeReach(st, others); if (r.reach >= others.length / 2) continue;
    const made = []; for (let n = 0; n < 3 && r.reach < others.length / 2; n++) { const ws = gateOut(st, others, r.seen); if (!ws.length) break; for (const w of ws) { const old = Wd.WALL_DEFS[w.type].name; w.type = 'gate'; w.max = Math.max(w.max || 0, Wd.WALL_DEFS.gate.hp); w.hp = w.max; made.push(old); } Wd.bump(world); r = storeReach(st, others); }
    if (made.length) { checkPerimeter(); saveGame(); note('important', `🚪 The ${DEFS[st.type].name}'s door was walled in: ${made.length} wall section${made.length > 1 ? 's' : ''} turned into ${made.length > 1 ? 'Gates' : 'a Gate'} so people can reach it.`, { at: () => Wd.approachPoint(st) }); }
    else if (S.boxTold !== S.day) { S.boxTold = S.day; note('important', `🚪 The ${DEFS[st.type].name}'s door is walled in: only ${r.reach} of ${others.length} buildings can reach it. Something other than a wall blocks the way: move a building or clear the path.`, { at: () => Wd.approachPoint(st) }); }
    return; } }
function siteWaitCheck() {
  for (const x of jobList()) { const j = x.j, got = Object.values(j.got || {}).reduce((a, v) => a + v, 0) + Object.values(j.inb || {}).reduce((a, v) => a + v, 0);
    if (j.lastGot !== got) { j.lastGot = got; j.waitH = 0; continue; } j.waitH = (j.waitH || 0) + 1; if (j.waitH < 6 || j.toldDay === S.day) continue;
    const miss = Object.keys(j.need).filter((k) => (j.need[k] || 0) - (j.got[k] || 0) - (j.inb[k] || 0) > 0);
    if (!miss.length) continue; j.toldDay = S.day; const none = miss.filter((k) => (S[k] || 0) < 1);
    note('important', `⏳ ${jobName(x)}: ${none.length ? `waiting for ${none.map((k) => (RES_ICON[k] || '') + ' ' + k).join(', ')} (you have none)` : `nothing delivered for ${j.waitH} h: everyone is busy, or the way to it is blocked`}`, { at: () => jobPt(x) }); } }
function jobFor(r) { return jobList().filter(({ j }) => (j.need[r] || 0) - (j.got[r] || 0) - (j.inb[r] || 0) > 0).sort((a, b) => a.j.id - b.j.id)[0] || null; }
function jobDelivered(x, r, n, s) {
  floats.push({ w: { ...(s ? s.w : jobPt(x)) }, t: '+' + n + ' ' + RES_ICON[r], col: '#ffe07a', a: 80, big: true });
  if (jobReady(x.j) && !x.j.readyMsg) { x.j.readyMsg = true; say(`${jobName(x)}: all materials are in, building now.`, true); SFX('chime'); }
}
function tryHaul(s) {
  for (const x of jobList().sort((a, b) => a.j.id - b.j.id)) {
    if (zombieNear(jobPt(x), 5)) continue;
    for (const [r, v] of Object.entries(x.j.need)) {
      const m = v - (x.j.got[r] || 0) - (x.j.inb[r] || 0), have = Math.floor(S[r] || 0); if (m <= 0 || have < 1) continue;
      const n = Math.min(m, have, (5 + carryBonus(s) * 2) * (s.job === 'Civilian' ? 2 : 1));   /* 3D.67: Civilians carry twice as much */ S[r] -= n; x.j.inb[r] = (x.j.inb[r] || 0) + n; x.j.lastHaul = tick; s.haul = { r, n, id: x.j.id }; if (rnd() < .12) bark(s, 'haul', { b: jobName(x) });
      s.dest = depotPt(s); s.mode = 'walk'; s.purpose = 'haul-get'; s.path = null; s.stateTicks = 2400; s.why = `Fetching ${n} ${RES_NAME[r]} for the ${jobName(x)}`; return true;
    }
  }
  return false;
}
function cancelHaul(s) { const h = s.haul; s.haul = null; if (!h) return; S[h.r] = (S[h.r] || 0) + h.n; const x = jobById(h.id); if (x) x.j.inb[h.r] = Math.max(0, (x.j.inb[h.r] || 0) - h.n); if (s.carriedLoot === h.r) { s.carriedLoot = null; s.carryAmt = 0; } }
function tryHammer(s) {   // help a job whose materials are all in
  const x = jobList().find(({ j, b }) => jobReady(j) && (j.hammer || 0) < 2 && !zombieNear(Wd.approachPoint(b), 5)); if (!x) return false;
  x.j.hammer = (x.j.hammer || 0) + 1; s.hammerJob = x.j.id; if (rnd() < .3) bark(s, 'hammer', { b: jobName(x) }); s.dest = jobPt(x); s.mode = 'walk'; s.purpose = 'build-go'; s.path = null; s.stateTicks = 2400; s.why = `Building the ${jobName(x)}`; return true;
}
function endHammer(s) { const x = s.hammerJob != null ? jobById(s.hammerJob) : null; if (x) x.j.hammer = Math.max(0, (x.j.hammer || 0) - 1); s.hammerJob = null; }
function hammerTick(s) {
  s.moving = false; const x = s.hammerJob != null ? jobById(s.hammerJob) : null; if (!x) { endHammer(s); s.activity = null; enterFree(s, 20); return; }
  s.faceW = { x: x.b.x + x.b.w / 2, y: x.b.y + x.b.h / 2 }; s.activity = 'Building';
  if (x.j.cons > 0) x.j.cons -= 1.2 * TUNE.work * (s.job === 'Engineer' ? 1.4 : s.job === 'Civilian' ? 1.2 : 1) * (gearFx(s, 'build') ? 1.3 : 1) * (gearFx(s, 'hivis') ? 1.25 : 1);   /* 3D.28 Tool Belt */
  if (s.stateTicks <= 0 || x.j.cons <= 0) { gainXp(s, 1); endHammer(s); s.activity = null; s.faceW = null; enterFree(s, 20); }
}
const hqB = () => world.buildings.find((b) => DEFS[b.type] && DEFS[b.type].role === 'hq') || null;
const hqTier = () => { const b = hqB(); return b ? DEFS[b.type].tier : 1; };
function settlePause(s, min = 150, max = 330) { if (s.purpose && s.purpose.startsWith('gath')) { s.gatherAt = null; } s.purpose = null; s.mode = 'wait'; s.dest = null; s.path = null; s.moving = false; s.stateTicks = min + rnd() * (max - min); s.idleBubble = ['💭', '👀', '🙂', '💬'][Math.floor(rnd() * 4)]; if (!s.why.startsWith('Idle')) s.why = 'Idle · taking a breather'; }
const wakeOff = (s) => ((s.id * 263) % 1500) - 500 + (hasT(s, 'owl') ? 900 : 0);   /* 3D.63 study: the whole town woke at exactly 6:00; now 5:30–7:00 per person (owls later) */
function enterFree(s, d = 110) { s.sleeping = false; s.mode = 'free'; s.target = null; s.activity = null; s.stateTicks = d; s.dest = null; s.path = null; s.moving = false; s.purpose = null; }
function enterPost(s) { { const w = weaponOf(s); if (w.mag && (s.ammo == null ? w.mag : s.ammo) <= w.mag / 2 && !(s.reloadT > 0)) s.reloadT = Math.round(w.reload * 60);   /* lull: reload a half-empty gun (keeps the rounds left until it's done) */ } s.mode = 'postCombat'; s.target = null; s.stateTicks = 135 + (s.i % 8) * 24; s.moving = false; s.path = null; s.why = 'Catching breath after a fight'; }
function needScore(s, b) {
  const r = facilityRules[b.type]; if (!r || b.fire || b.burnt) return -999; if (isT(b, 'house') && b.owner && b.owner !== s.id) return -999; let sc = 0;
  if ((r.need === 'hunger' && S.food < .5) || (r.need === 'thirst' && S.water < .5)) return -999;   /* V3D.15: no trips to an empty canteen or water point */
  if (s.avoid && (s.avoid[b.type] || 0) > tick) return -999;   /* V3D.15: recently looped here: give it a rest */
  if (zombieNear(Wd.doorPoint(b), (s.wary || 0) > tick ? 7 : 4.5) && !isFighter(s) && !((r.need === 'thirst' && s.thirst >= 95) || (r.need === 'hunger' && s.hunger >= 95))) return -999;   /* 3D.63: desperate enough, they risk it (they went to eat while dying of thirst because zombies were near the only barrel) */   /* V3D.17: don't walk to a door with zombies at it (this was the house ↔ rain collector loop) */
  if (r.need === 'injury' && (s.hunger >= 100 || s.thirst >= 100) && s.hp > s.max * .35) return -999;   /* starving: care can't fix that, food can */
  if (r.need === 'injury' && s.hp >= s.max * .6 && zInTown()) return -999;   /* 3D.285: with a zombie in town only the badly hurt (under 60%, the old bar) set out for care; the rest wait until it is quiet */
  if (r.need === 'hunger') sc += s.hunger * 1.4; if (r.need === 'thirst') sc += s.thirst * 1.5; if (r.need === 'fatigue') sc += s.fatigue * (isNight() || s.fatigue >= 70 ? 1.2 : .6) + (isNight() && s.fatigue > 15 ? 45 : 0);   /* 3D.63: by day a nap only wins once they're really tired (a third of the town napped through lunch) */   /* V2.36: nights are for sleeping */
  if (r.need === 'injury') sc += (1 - s.hp / s.max) * 140 * (policy() === 'recover' ? 1.5 : 1) + (s.wounded ? 45 : 0);   /* 3D.67: a field wound needs a medical building */
  if (r.need === 'gear') sc += gearUpgrade(s) ? 75 : 0;
  if (r.need === 'train') {   /* V2.14: free time goes into self-improvement, favouring the stats their job uses */
    const base = (s.st && s.st[r.stat]) || 5; if (base >= STAT_CAP) return -999;
    sc += 22 + (STAT_CAP - base) * .9 + ((JOB_STATS[s.job] || []).includes(r.stat) ? 12 : 0) - Math.max(s.hunger, s.thirst, s.fatigue) * .35 - (isNight() ? 20 : 0) - (s.trainDay === S.day ? (s.trainN || 0) * 16 : 0);   /* 3D.63: a couple of sessions a day, not all free time */
  }
  if ((r.need === 'hunger' && S.food < 1) || (r.need === 'thirst' && S.water < 1)) sc -= 90;
  sc += b.a * .35 + b.q * .45; if (s.lastFacility === b) sc -= 30;
  sc -= dist(s.w, Wd.doorPoint(b)) * 1.2;       // nearer is better
  return sc;
}
const useCap = (b) => { const n = facilityRules[b.type] && facilityRules[b.type].need; return n === 'hunger' || n === 'thirst' ? Math.max(3, cap(b)) : cap(b); };   /* 3D.63 study: a Rain Barrel or Garden Plot let one person at a time eat or drink, so with 8+ people half the town queued thirsty all day */
const URGENT_FOR = { Hungry: 'hunger', Thirsty: 'thirst', Exhausted: 'fatigue', Hurt: 'injury' };   /* 3D.63 study: a thirsty worker's 'quick break' picked whichever facility scored best (often a Tent to nap in), so the thirst was never fixed */
function chooseFacility(s, urgentOnly = false, need = null) {
  let bed; const nr = s.noReach && s.noReach.t > tick ? s.noReach.b : null; const c = world.buildings.filter((b) => b !== nr && facilityRules[b.type] && facilityUsers(b) < useCap(b) && (!urgentOnly || URGENT_NEEDS.includes(facilityRules[b.type].need)) && (!need || facilityRules[b.type].need === need) && (facilityRules[b.type].need !== 'fatigue' || b === (bed === undefined ? (bed = bedFor(s)) : bed))); if (!c.length) return null;   /* 3D.30: rest only in your own housing (or the Camp) */
  c.sort((a, b) => needScore(s, b) - needScore(s, a)); return need || needScore(s, c[0]) > 24 ? c[0] : null;
}
/* V2.36 task commitment: staffed survivors keep a shift (7-12, 13-18) and only leave it for something urgent; free time is lunch, evening and night */
/* V2.37 town policies: a settlement-wide priority that shifts the AI's weights (it never gives orders to individuals) */
const POLICIES = {
  balanced: { name: 'Balanced', icon: '⚖', desc: 'Shifts 7–12 and 13–18; fighters defend what comes close and fall back at your retreat setting. The sensible one.' },
  defend: { name: 'Defend the Town', icon: '🛡', desc: 'Fighters engage 40% farther and hold on longer, guards patrol more, workers leave their posts to fight. Production dips. Everyone\'s a hero.' },
  produce: { name: 'Prioritise Production', icon: '⚙', desc: 'Second shift to 19:00, more hunger and fatigue before a break; fighters only engage nearby threats. Hustle culture survived.' },
  recover: { name: 'Recover & Heal', icon: '✚', desc: 'Fighters fall back 15% sooner, the hurt get treated earlier, work ends at 16:00. Spa week.' },
};
const policy = () => POLICIES[S.policy] ? S.policy : 'balanced';
const canFight = (q) => q.hp > q.max * Math.max(.5, (retreatPct() + traitRetreat(q)) / 100 + .05) && !(q.fleeT > 0);   /* 3D.63 study: every call to arms uses the same bar as falling back (SOS at 50% vs a 60-90% retreat pulled hurt fighters back and forth) */
const retreatPct = () => (S.retreat ?? 35) + (policy() === 'recover' ? 15 : policy() === 'defend' ? -5 : 0);
function setPolicy(k) { if (!POLICIES[k]) return; S.policy = k; note('important', `${POLICIES[k].icon} POLICY: ${POLICIES[k].name.toUpperCase()}`, { log: `Town policy set to ${POLICIES[k].name}: ${POLICIES[k].desc}` }); saveGame(); }
const URGENT_NEEDS = ['hunger', 'thirst', 'fatigue', 'injury'];
const SHIFT = [[7, 12], [13, 18]];
const shifts = () => policy() === 'produce' ? [[7, 12], [13, 19]] : policy() === 'recover' ? [[7, 12], [13, 16]] : SHIFT;
const chopOn = (s) => s.chop ?? !s.post;   /* 3D.30 Gather toggle: on = also chops wood / gathers (workers split their shift), off = sticks to the job */
const onShift = (s) => !!(s.post && s.post.staff === s && world.buildings.includes(s.post) && !s.post.burnt && shifts().some(([a, b]) => S.hour >= a && S.hour < b));
function urgentNeed(s, leave = false) {   // what is bad enough to stop working for (a higher bar to walk off the job than to delay going back)
  const k = (leave ? 1.2 : 1) * (policy() === 'produce' ? 1.15 : policy() === 'recover' ? .85 : 1) * (hasT(s, 'diligent') ? 1.1 : 1); if (s.hunger >= 62 * k && S.food >= 1) return 'Hungry'; if (s.thirst >= 62 * k && S.water >= 1) return 'Thirsty'; if (s.fatigue >= 80 * k) return 'Exhausted'; if (s.hp < s.max * (leave ? .5 : .6) && medSite()) return 'Hurt'; return null;
}
function shiftLeft() { const sh = shifts().find(([a, b]) => S.hour >= a && S.hour < b); return sh ? Math.max(200, (sh[1] - S.hour) * 1000 - (tick % 1000)) : 0; }
const NEEDTXT = { hunger: 'Hungry', thirst: 'Thirsty', fatigue: 'Tired', injury: 'Hurt', gear: 'Wants better gear', train: 'Training' };
function chooseTownAction(s) { const b = chooseFacility(s); if (b && b !== s.lastFacility) { s.facility = b; s.mode = 'goFacility'; s.stateTicks = 9999; s.dest = null; s.path = null; s.why = `${NEEDTXT[facilityRules[b.type].need]} → ${DEFS[b.type].name}`; return true; } return false; }
// A zombie that is attacking this survivor (or about to) interrupts whatever they were doing — eating, drinking, working, strolling.
function threatOf(s) {
  let best = null, bd = 1e9; for (const z of S.z) { if (z.hp <= 0 || z.mode === 'appear' || z.zoo || z.mode === 'zleave') continue;   /* 3D.258 bug B18 (bug sweep): a zombie walking away is not a threat (acquireEnemy and the chase already let it go); at dawn a Guard flipped between two leaving zombies ten times a second, standing still with the angry face flashing */ if (s.skipZ && s.skipZ.z === z && s.skipZ.t > tick && !(z.target === s && ['zattack', 'zrecover'].includes(z.mode))) continue;   /* 3D.220 bug A10: one they just found no way to (across a wall) is not a threat unless it is actually hitting them; the angry face flashed every few frames */ const d = dist(s.w, z.w), atkMe = z.target === s && ['zchase', 'zattack', 'zrecover'].includes(z.mode); if (s.fleeT > 0 ? (atkMe && d < 1.3) : ((atkMe && d < 3.2) || d < 1.7)) { if (d < bd) { bd = d; best = z; } } }
  return best;
}
/* 3D.48 owner: the last ones standing never fight. With only 1-2 people up and someone collapsed, they hide instead (the
   Camp first) and go for the fallen once the zombies have moved on. Hidden people are quiet: zombies bashing a building
   with only hiders inside lose interest after a while; if the building is about to fall, the hiders slip out to another one. */
const standing = () => S.sv.filter((q) => q.hp > 0 && !['down', 'away', 'hospital', 'errand'].includes(q.mode));
const zInTown = () => S.z.some((z) => z.hp > 0 && !z.zoo && !z.human && Wd.inTown(Math.floor(z.w.x), Math.floor(z.w.y)));
function lastStand() { return S.sv.some((q) => q.mode === 'down') && standing().length <= 2 && zInTown(); }
let hideGuard = false;
function engage(s, z) {
  if (z && !z.zoo && !hideGuard && lastStand()) { hideGuard = true; startHide(s, z); hideGuard = false; if (s.mode === 'hide') { s.why = 'Last ones standing: hiding until the zombies move on'; lastStandNote(); return; } }
  if (z && z.zoo) return;   /* 3D.32 test page: the line-up is only for looking */ s.facility = null; s.activity = null; s.dest = null; s.path = null; s.purpose = null; s.target = z; s.mode = 'chase'; s.stateTicks = 9999; s.moving = false; s.why = `Fighting a ${zombieTypes[z.type].name}`; }
function nearestZombie(s) { let best = null, bd = 1e9; for (const z of S.z) if (z.hp > 0 && !z.zoo) { const d = dist(s.w, z.w); if (d < bd) { bd = d; best = z; } } return best; }
const nearTown = (w, m = 0) => { const B = Wd.BUILD; return w.x >= B.x0 - 2.5 - m && w.x <= B.x1 + 3.5 + m && w.y >= B.y0 - 2.5 - m && w.y <= B.y1 + 3.5 + m; };
/* 3D.299 (A12 tuning, the dawn sweep): zombies never walk away now, and fighters only took on what came close, so leftovers stood at the
   walls and in corners for days. In daylight (06:00 to 20:00), while zombies are slow and weak, a fit fighter (70% health or more) goes after
   any zombie in town or up to 6 tiles past its edge, however far. They still don't follow zombies out across the map. */
const SWEEP_EDGE = 6, SWEEP_HP = .7;
const sweepOn = (s) => !isNight() && s.hp >= s.max * SWEEP_HP && !lastStand();   /* 3D.65: the town plus a 2.5-tile margin: they clear zombies lurking at the edge, but don't follow them out across the map */
function acquireEnemy(s) {   // V2.12: only fighters go looking for a fight; they defend others first and gang up on the same zombie
  if (s.fleeT > 0 || !isFighter(s) || (s.carriedLoot && s.carryAmt) || s.hp < s.max * (retreatPct() + traitRetreat(s)) / 100) return false;
  if (s.focusUntil > tick && s.hp < s.max * .55) s.focusUntil = 0;   /* 3D.75: a hurt fighter peels off the boss */
  if (s.focusUntil > tick) { const b = S.z.find((z) => z.type === 'boss' && z.hp > 0 && z.mode !== 'zleave'); if (b) { if (s.target !== b) engage(s, b); return true; } s.focusUntil = 0; }   /* 3D.71: the player said all together on the boss */   /* 3D.63: below their retreat bar they don't step in (they'd turn and flee the next tick); carriers deliver first */
  const cfg = jobAI[s.job] || jobAI.Civilian, rng = (S.alert > 0 && (s.job === 'Guard' || s.job === 'Police Officer') ? 9 : cfg.aggro) * (policy() === 'defend' ? 1.4 : policy() === 'produce' ? .8 : 1) * traitRange(s) * (atPost(s) ? 1.25 : 1);
  const sweep = sweepOn(s);   /* 3D.299 A12 tuning: the dawn sweep */
  let best = null, bs = 1e9;
  for (const z of S.z) {
    if (z.hp <= 0 || z.mode === 'appear' || z.zoo || z.mode === 'zleave') continue; if (s.skipZ && s.skipZ.z === z && s.skipZ.t > tick && !(z.target === s && dist(s.w, z.w) < 1.5)) continue; const d = dist(s.w, z.w); if (!z.human && !(sweep ? nearTown(z.w, SWEEP_EDGE) : nearTown(z.w)) && !(z.target && S.sv.includes(z.target) && d < 3)) continue;   /* 3D.64: they hold the town; zombies out past the edge or walking away are left alone */
    const onPerson = z.target && z.target !== s && z.target.job !== undefined && ['zchase', 'zattack', 'zrecover'].includes(z.mode);
    const sneaking = z.human && z.mode === 'rsneak' && !z.carried && !(S.alert > 0);
    if (sneaking && d > (2.5 + (stat(s, 'per') - 5) * .15 + traitSpot(s) + (atPost(s) ? 1.5 : 0)) * (s.job === 'Police Officer' ? 2 : 1)) continue;   /* 3D.67: Police spot sneaking raiders twice as far */   /* raiders sneaking in are hard to spot */
    if (d > rng && !(onPerson && d <= rng + 3) && !(sweep && !z.human)) continue;
    if (s.hp < s.max * (hasT(s, 'brave') ? .5 : hasT(s, 'cautious') ? .75 : .6) && !onPerson) continue;   /* hurt fighters only step in to defend someone (V2.43: Brave sooner, Cautious later) */
    const allies = S.sv.filter((q) => q !== s && q.target === z && ['chase', 'attack', 'recover'].includes(q.mode)).length;
    const sc = d - (onPerson ? 3 : 0) - (allies === 1 ? 1.2 : 0) + (allies >= 2 ? 2.5 * (allies - 1) : 0) + z.hp / 60 - (z.hp < z.max * .3 ? 1.2 : 0);   /* V3D.14: finish off the nearly dead; 3D.66 study: pairing up helps, but a third and fourth on the same zombie count against it (pile-ons while another zombie went free) */
    if (sc < bs) { bs = sc; best = z; }
  }
  if (!best) return false; s.target = best; s.mode = 'chase'; s.stateTicks = 9999; s.path = null; s.facility = null; s.activity = null;
  s.why = best.target && best.target !== s && best.target.name ? `Defending ${best.target.name} from a ${zombieTypes[best.type].name}` : `Fighting a ${zombieTypes[best.type].name}`; return true;
}
const ENCLOSED = (b) => !OPEN_AIR.has(b.type) && DEFS[b.type];
function startHide(s, z) {   // non-fighters run for the nearest enclosed building (inside = safe); cornered = fight back
  let best = null, bs = 1e9;
  for (const b of world.buildings) { if (!ENCLOSED(b)) continue; const dp = Wd.doorPoint(b), sc = dist(s.w, dp) - .6 * dist(z.w, dp); if (sc < bs) { bs = sc; best = b; } }
  const d = dist(s.w, z.w), cornered = d < .7 && z.target === s && ['zattack', 'zrecover'].includes(z.mode) && (!best || dist(s.w, Wd.doorPoint(best)) > 2.5);
  if (!best || cornered) { engage(s, z); s.why = `Cornered by a ${zombieTypes[z.type].name}`; return; }
  s.facility = null; s.activity = null; s.dest = null; s.path = null; s.purpose = null; s.target = null;
  s.mode = 'hide'; s.hideAt = best; s.stateTicks = 9999; s.why = `Hiding from a ${zombieTypes[z.type].name} → ${DEFS[best.type].name}`;
}
/* 3D.266 bug B25 (bug sweep): nobody stays inside a wall. A wall can be built, repaired or upgraded on a tile someone is standing on;
   a zombie left inside one stood there for hours. Twice a second, anyone (person or zombie) on a standing wall tile (not a gate) is put on the nearest open tile. */
function wallUnstick() {
  if (!world.walls.size) return; const solidAt = (x, y) => { const wl = Wd.wallAt(world, x, y); return !!wl && !wl.broken && wl.type !== 'gate'; };
  for (const o of [...S.sv, ...S.z]) { if (!o.w || o.hp <= 0 || o.zoo || (o.job !== undefined && (['away', 'errand', 'hospital'].includes(o.mode) || insideBuilding(o) || beingCarried(o)))) continue;
    const tx = Math.floor(o.w.x), ty = Math.floor(o.w.y); if (!solidAt(tx, ty)) continue;
    let best = null, bd = 1e9; for (let r = 1; r <= 3 && !best; r++) for (let dy = -r; dy <= r; dy++) for (let dx = -r; dx <= r; dx++) { const x = tx + dx, y = ty + dy; if (!Wd.walkable(world, x, y, true)) continue; const d = Math.hypot(x + .5 - o.w.x, y + .5 - o.w.y); if (d < bd) { bd = d; best = { x: x + .5, y: y + .5 }; } }
    if (best) { o.w = best; o.path = null; o.pathGoal = null; if (o.pv) o.pv = { ...best }; } }
}
function spreadOut() {   /* V3D.17: two people never stand in the same spot; a soft push apart (walls and buildings respected) */
  const L = S.sv.filter((s) => s.w && s.hp > 0 && s.mode !== 'away' && s.mode !== 'down' && !insideBuilding(s) && !beingCarried(s)); if (S.trader && S.trader.w) L.push(S.trader);
  for (let i = 0; i < L.length; i++) for (let j = i + 1; j < L.length; j++) { const a = L[i], b = L[j], dx = b.w.x - a.w.x, dy = b.w.y - a.w.y, d = Math.hypot(dx, dy), R = (a.chatWith === b || b.chatWith === a) ? .5 : .42;
    if (d >= R) continue; const ux = d > 1e-4 ? dx / d : Math.cos(i + j), uy = d > 1e-4 ? dy / d : Math.sin(i + j), k = (R - d) * .12;
    const am = !!a.moving, bm = !!b.moving, only = am !== bm ? (am ? a : b) : null;   /* V3D.21: someone walking past steps around a person standing still (who used to get shoved along) */
    if (!am && !bm && d >= .3) continue;   /* 3D.100 owner's log (Maya sliding at the wreck): two people standing on top of each other were snapped apart in a few frames (a fast
       glide); now the push is capped at half walking pace, so the one moved takes a little side-step (the renderer walks it) */   /* 3D.64 owner's log (Amy, Rosa): two people standing a little close were pushed apart slowly, a visible glide; now only a real overlap, fixed in a few frames */
    for (const [o, sg] of [[a, -1], [b, 1]]) { if (o === S.trader && o.mode === 'stay' && o !== a) continue; if (only && o !== only) continue; const kk = only ? k * 2 : (!am && !bm ? Math.min((R - d) * .5, .005) : k), nx = o.w.x + ux * kk * sg, ny = o.w.y + uy * kk * sg; if (Wd.walkable(world, Math.floor(nx), Math.floor(ny))) { o.w.x = nx; o.w.y = ny; } } }
}
const zombieNear = (p, r) => S.z.some((z) => z.hp > 0 && z.mode !== 'appear' && dist(z.w, p) < r);
function repelRaid() {   /* V3D.13: raiders in town → everyone healthy helps: fighters chase them; others go in pairs on the nearest one */
  const raiders = S.z.filter((z) => z.human && z.hp > 0 && !z.escaped && z.mode !== 'appear' && Wd.inTown(Math.floor(z.w.x), Math.floor(z.w.y))); if (!raiders.length) return false;
  const able = S.sv.filter((q) => q.hp >= q.max * (hasT(q, 'brave') ? .35 : .5) && !(q.fleeT > 0) && !(isFighter(q) && !canFight(q)) && !q.rescuing && !q.carrying && !(q.carriedLoot && q.carryAmt) && !(q.haul && q.purpose === 'haul-put') && !['down', 'away', 'errand', 'hospital', 'rescueTo', 'rescueCarry', 'chase', 'attack', 'recover', 'goFire', 'fightFire'].includes(q.mode));
  let n = 0;
  for (const q of able) {
    const t = raiders.slice().sort((a, b) => (a.mode === 'rsmash' ? -9 : 0) - (b.mode === 'rsmash' ? -9 : 0) || dist(a.w, q.w) - dist(b.w, q.w))[0];   /* arsonists first */
    const helpers = S.sv.filter((x) => x.target === t && ['chase', 'attack', 'recover'].includes(x.mode)).length;
    if (!isFighter(q) && helpers >= 3) continue;   /* enough hands on that one */
    q.fleeT = 0; q.hideAt = null; engage(q, t); q.why = `${isFighter(q) ? 'Defending' : 'Helping drive off'} a ${RK(t).name.toLowerCase()} raider`; n++;
  }
  if (n && !S.repelSaid) { S.repelSaid = tick; note('important', '✊ Everyone turns out against the raiders'); }
  if (!raiders.length) S.repelSaid = 0; return n > 0;
}
function militia() {   /* V2.37: no able fighter left and zombies inside the town → healthy civilians band together (3+) on the weakest zombie */
  if (S.sv.some((q) => isFighter(q) && q.hp >= q.max * .5 && !['down', 'away', 'errand', 'hospital'].includes(q.mode))) return false;
  /* 3D.171 owner: "civilians form a militia when every fighter is down". It needed 3 civilians at 60% and anyone already fighting blocked it,
     so it almost never came (two towns lost every fighter and then everyone). Now 40% health is enough (Brave 30%), and it holds back only once 3 fight */
  if (S.sv.filter((q) => ['chase', 'attack'].includes(q.mode)).length >= 3) return false;
  const inside = S.z.filter((z) => z.hp > 0 && z.type !== 'boss' && Wd.inTown(Math.floor(z.w.x), Math.floor(z.w.y))); if (!inside.length) return false;
  const able = S.sv.filter((q) => !['chase', 'attack'].includes(q.mode) && q.hp >= q.max * (hasT(q, 'brave') ? .3 : .4) && !q.rescuing && !q.carrying && !(q.carriedLoot && q.carryAmt) && !(q.haul && q.purpose === 'haul-put') && !['down', 'away', 'errand', 'hospital', 'rescueTo', 'rescueCarry'].includes(q.mode)); if (able.length < 3) return false;   /* 3 or more: with only 1-2 up, the last-stand rule (3D.48) has them hide */
  const t = inside.sort((a, b) => a.hp - b.hp)[0];
  able.slice(0, Math.min(able.length, 3 + inside.length)).forEach((q) => { q.fleeT = 0; q.hideAt = null; engage(q, t); q.why = `Militia: banding together against a ${zombieTypes[t.type].name}`; });
  if (!S.milSaid || tick - S.milSaid > 6000) note('important', '✊ MILITIA: SURVIVORS BAND TOGETHER'); S.milSaid = tick; return true;   /* 3D.169 round 2: it said so every 5 minutes (15 times in 3 hours); once per stretch now */
}
function rally() {   /* V2.37: someone is down and nobody is fighting → fighters with at least half their health come out together and clear the zombies around the downed */
  const downs = S.sv.filter((q) => q.mode === 'down'); if (!downs.length || S.sv.some((q) => ['chase', 'attack', 'recover'].includes(q.mode))) return false;
  const near = S.z.filter((z) => z.hp > 0 && downs.some((q) => dist(z.w, q.w) < 3)); if (!near.length) return false;
  const able = S.sv.filter((q) => isFighter(q) && canFight(q) && !q.rescuing && !q.carrying && !(q.carriedLoot && q.carryAmt) && !(q.haul && q.purpose === 'haul-put') && !['down', 'away', 'errand', 'hospital', 'rescueTo', 'rescueCarry'].includes(q.mode));
  if (able.length < Math.min(2, near.length)) return false;
  able.sort((a, b) => b.hp - a.hp).slice(0, Math.max(2, near.length)).forEach((q, i) => { q.fleeT = 0; q.hideAt = null; engage(q, near[i % near.length]); q.why = `Rallying to cover ${downs[0].name}`; });
  note('important', `⚔ RALLY: FIGHTERS MOVE TO COVER ${downs[0].name.toUpperCase()}`); return true;
}
/* 3D.163 someone standing on a tile they cannot walk out of (inside a building whose door faces a fence, or wedged against a wall) is moved
   to the nearest open tile */
function unwedge(s) {
  const tx = Math.floor(s.w.x), ty = Math.floor(s.w.y); let best = null;
  for (let r = 1; r <= 4 && !best; r++) for (let dy = -r; dy <= r; dy++) for (let dx = -r; dx <= r; dx++) { const x = tx + dx, y = ty + dy; if (Math.max(Math.abs(dx), Math.abs(dy)) !== r || !Wd.walkable(world, x, y)) continue; if (!best || Math.hypot(dx, dy) < best.d) best = { x, y, d: Math.hypot(dx, dy) }; }
  if (best) { s.w = { x: best.x + .5, y: best.y + .5 }; s.path = null; }
}
function assignRescue() {   /* V2.37: anyone not already in an emergency can be called (eating, resting, sleeping, walking, working); a fighter only if no zombie is within reach of them;
   nobody but a fighter walks into a crowd of zombies around the downed survivor */
  const downs = downedUnassigned(); if (!downs.length) return false;
  const OK = ['free', 'postCombat', 'wait', 'work', 'goWork', 'goFacility', 'useFacility', 'walk'];
  const BAL = window.ZH_BAL || {}, quiet = (q) => !S.z.some((z) => z.hp > 0 && !z.human && dist(z.w, q.w) < (BAL.hideR || 3.5));
  const free = S.sv.filter((r) => r.hp > r.max * .3 && !r.rescuing && !r.carrying && !((r.noRescueT || 0) > tick) && (((BAL.hiders ?? 1) && r.mode === 'hiding' && r.hideAt && downs.some(quiet) && !zombieNear(Wd.doorPoint(r.hideAt), BAL.hideR || 3.5)) || OK.includes(r.mode) && !(r.mode === 'useFacility' && r.facility && facilityRules[r.facility.type] && facilityRules[r.facility.type].need === 'injury')
    || (['chase', 'attack', 'recover'].includes(r.mode) && !S.z.some((z) => z.hp > 0 && dist(z.w, r.w) < Math.max(2.2, rangeOf(r) + 1))))); if (!free.length) return false;   /* 3D.63: a shooter mid-fight isn't 'free' just because no zombie is at arm's length */
  let best = null, bs = -1e9;
  for (const q of downs) { const crowd = S.z.filter((z) => z.hp > 0 && dist(z.w, q.w) < 2.5).length, urgency = 3000 / Math.max(300, q.bleed || 1);
    for (const r of free) { if (!q.ordered && crowd >= (isFighter(r) ? 2 : 1) + (hasT(r, 'caring') ? 1 : 0)) continue; if (q.ordered ? false : crowd >= (hasT(r, 'caring') ? 3 : 2) && !isFighter(r)) continue;   /* 3D.71: left alone, nobody walks into zombies (a fighter into one at most); the player's Send rescue goes anyway */ if (crowd && lastStand()) continue;   /* 3D.48 */   /* non-fighters don't walk into a crowd (Caring: up to two zombies) */ if (r.job === 'Medic' && onShift(r) && dist(r.w, q.w) > 10) continue;   /* 3D.67: a Medic on shift only leaves for someone down close by */ const sc = (jobAI[r.job] || jobAI.Civilian).rescue * 3 + (r.job === 'Medic' ? 6 : 0) + (hasT(r, 'caring') ? 8 : 0) - dist(r.w, q.w) + urgency + (q.ordered ? 40 : 0) - (r.mode === 'useFacility' ? 4 : 0) - (['chase', 'attack', 'recover'].includes(r.mode) ? 3 : 0); if (sc > bs) { bs = sc; best = { r, q }; } } }
  if (!best) return false;
  if (best.r.mode === 'useFacility') { best.r.sleeping = false; best.r.activity = null; } if (best.r.mode === 'hiding') best.r.hideAt = null;
  best.q.rescuer = best.r; best.r.rescuing = best.q; best.r.target = null; best.r.facility = null; best.r.dest = null; best.r.path = null; best.r.mode = 'rescueTo'; best.r.why = `Rescuing ${best.q.name}${hasT(best.r, 'caring') ? ' (Caring)' : ''}`; note('routine', `${best.r.name} is rescuing ${best.q.name}.`); return true;
}
