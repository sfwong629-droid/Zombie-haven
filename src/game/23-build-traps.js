/* ---------------- build / move / demolish ---------------- */
let moving = null;   // building being moved (removed from world while placing)
function closeP() { $('infoPanel').classList.remove('show'); expOpen = false; panelBack = null; if (selected && selected.kind === 'post') selected = null; }
function endBuildMode(restore) {
  if (restore && moving) { world.buildings.push(moving); Wd.bump(world); }
  moving = null; sel = null; preview = null; $('confirmBar').style.display = 'none'; renderAlerts(); setTimeout(nextEventPopup, 0);   /* V2.34: pop-ups wait while you are placing something */
}
function startTool(tool) {
  endBuildMode(true); closeP(); sel = tool; preview = null; renderAlerts();
  if (tool.kind === 'wall') { const wd = Wd.WALL_DEFS[tool.wtype]; $('confirmName').textContent = `${wd.name.toUpperCase()} · ${costShort(bCost(wd))} per tile · tap to place, tap again to remove` + (tool.wtype === 'metal' ? ' · tap a wood wall to upgrade' : ''); $('yesBuild').style.display = 'none'; $('nudge').style.display = 'none'; $('rotBuild').style.display = 'none'; $('noBuild').textContent = 'DONE'; $('confirmBar').style.display = 'block'; }
  else if (tool.kind === 'trap') { const td = TRAP_DEFS[tool.ttype]; $('confirmName').textContent = `${td.name.toUpperCase()} · ${costShort(bCost(td))} · tap any open ground to set · tap a spent one to re-arm · ${trapMap().size}/${trapMax()} traps`; $('yesBuild').style.display = 'none'; $('nudge').style.display = 'none'; $('rotBuild').style.display = 'none'; $('noBuild').textContent = 'DONE'; $('confirmBar').style.display = 'block'; }
  else if (tool.kind === 'post') { $('yesBuild').style.display = 'none'; $('nudge').style.display = 'none'; $('rotBuild').style.display = 'none'; $('noBuild').textContent = 'DONE'; $('confirmBar').style.display = 'block'; updatePostBar(); }
  else if (tool.kind === 'demolish') { $('confirmName').textContent = 'DEMOLISH · tap a building, road or wall to remove it · buildings and walls give back half their scrap'; $('yesBuild').style.display = 'none'; $('nudge').style.display = 'none'; $('rotBuild').style.display = 'none'; $('noBuild').textContent = 'DONE'; $('confirmBar').style.display = 'block'; demoPick = null; }
  else if (tool.kind === 'road') { $('confirmName').textContent = `ROAD · ${Wd.ROAD_COST} scrap per tile · tap a tile to add, tap a road to remove`; $('yesBuild').style.display = 'none'; $('nudge').style.display = 'none'; $('rotBuild').style.display = 'none'; $('noBuild').textContent = 'DONE'; $('confirmBar').style.display = 'block'; }
  else { $('yesBuild').style.display = ''; $('nudge').style.display = ''; $('rotBuild').style.display = ''; $('noBuild').textContent = 'CANCEL'; say('Tap the tile where the building’s SOUTH corner should sit.'); }
}
function updatePreview(x, y) {
  const d = Wd.rotDef(DEFS[sel.type], sel.rot), chk = Wd.placementCheck(world, x, y, d, sel.upgFrom || null); if (chk.ok && sel.upgFrom && !Iso.rectsOverlap(sel.upgFrom, { x, y, w: d.w, h: d.h })) { chk.ok = false; chk.why = 'Must cover the old building'; } if (chk.ok && (S.posts || []).some((p) => p.x >= x && p.x < x + d.w && p.y >= y && p.y < y + d.h)) { chk.ok = false; chk.why = 'A guard post is in the way'; }
  preview = { type: sel.type, x, y, w: d.w, h: d.h, rot: (sel.rot | 0) & 3, q: d.q, a: d.a, ok: chk.ok, why: chk.why };
  const afford = true;   /* V3D.23: a site can start before you have everything; builders bring materials as they come */
  $('confirmName').textContent = `${d.name.toUpperCase()} · ${d.w}×${d.h}` + (moving ? ' · MOVE (free)' : sel.upgFrom ? ` · UPGRADE · ${costShort(bCost(d))}` : ` · ${costShort(bCost(d))}`) + (!chk.ok ? ' · ' + chk.why.toUpperCase() : !moving && !canPay(bCost(d)) ? ' · STILL NEED ' + missText(bCost(d)).toUpperCase() : '') + (chk.ok ? (() => { const pv = { type: sel.type, x, y, w: d.w, h: d.h }, c = combos(pv); comboCache.map.delete(pv); return c.names.length ? ' · ★ ' + c.names.map((n) => n.split(' (')[0]).join(', ') : ''; })() : '');
  const go = chk.ok && afford; $('yesBuild').disabled = !go; $('yesBuild').style.opacity = go ? 1 : .45; $('confirmBar').style.display = 'block';
}
function pushUnitsOut(b) {
  const dp = Wd.approachPoint(b);
  for (const u of [...S.sv, ...S.z]) if (Iso.footprintContains(b, u.w.x, u.w.y)) { u.w = { x: dp.x + (rnd() - .5) * .3, y: dp.y }; u.path = null; }
}
function confirmPreview() {
  if (!preview || !sel || sel.kind !== 'building') return; const d = Wd.rotDef(DEFS[sel.type], sel.rot);
  if (sel.upgFrom) { if (!preview.ok) { say(preview.why); return; } const b = sel.upgFrom, place = { x: preview.x, y: preview.y, rot: (sel.rot | 0) & 3, w: d.w, h: d.h }; sel = null; preview = null; $('confirmBar').style.display = 'none'; upgradeBuilding(b, place); ui(); return; }   /* 3D.41 */
  const chk = Wd.placementCheck(world, preview.x, preview.y, d, null); if (!chk.ok) { say(chk.why); return; } if (!preview.ok) { say(preview.why); return; }
  if (!moving && buildLock(sel.type)) { say(buildLock(sel.type)); return; }
  const nb = { type: sel.type, x: preview.x, y: preview.y, rot: (sel.rot | 0) & 3, w: d.w, h: d.h, q: moving ? moving.q : d.q, a: moving ? moving.a : d.a, staff: moving ? moving.staff : null };
  if ((!moving)) {   /* V3D.12 (DV2 style): a construction site first; the building joins the town when it is done */
    SFX('build'); (S.sites ||= []).push(newJob({ ...nb }, bCost(d))); world.sites = S.sites; Wd.bump(world); pushUnitsOut(nb);
    say(d.name + (canPay(bCost(d)) ? ': construction started. Builders are bringing the materials.' : `: site marked. Still missing ${missText(bCost(d))}: survivors will gather it.`), true); sel = null; preview = null; $('confirmBar').style.display = 'none'; selected = null; saveGame(); ui(); return;
  }
  if (!moving) { SFX('build'); payCost(bCost(d)); S.builtCount++; renownGain(1, 'Construction'); banner('🔨 ' + d.name.toUpperCase() + ' BUILT'); if (DEFS[sel.type].fam === 'water' && S.stage === 0) { S.stage = 1; renownGain(5, 'Water secured'); questFlash(); } }
  world.buildings.push(nb); Wd.bump(world); pushUnitsOut(nb); if (nb.staff) nb.staff.post = nb; autoStaff(); say(moving ? d.name + ' moved.' : d.name + ' constructed!', true); moving = null; sel = null; preview = null; $('confirmBar').style.display = 'none'; selected = null; saveGame(); ui();
}
function sitesTick() {   /* V3D.12/23: work counts down once every material is in; finished sites become buildings, finished upgrades swap the type */
  world.sites = S.sites ||= [];
  if (tick % 60 === 0) for (const { j } of jobList()) {   /* recount what is on its way (self-healing after loads and interruptions) */
    const inb = {}; for (const q of S.sv) { if (q.haul && q.haul.id === j.id) inb[q.haul.r] = (inb[q.haul.r] || 0) + q.haul.n; if (q.gjob === j.id && q.carriedLoot) inb[q.carriedLoot] = (inb[q.carriedLoot] || 0) + (q.carryAmt || 0); }
    j.inb = inb; j.got ||= {}; j.hammer = S.sv.filter((q) => q.hammerJob === j.id).length; }
  if (tick % 90 === 45) for (const x of jobList().sort((a, b) => a.j.id - b.j.id)) {   /* 3D.58 owner: materials are carried to the site by people. A job with nothing on its way pulls in a helper (builders first, then whoever is nearest and not busy with something urgent) */
    const j = x.j, wants = Object.keys(j.need).some((k) => (j.need[k] || 0) - (j.got[k] || 0) - (j.inb[k] || 0) > 0 && (S[k] || 0) >= 1); if (!wants || zombieNear(jobPt(x), 5)) continue;
    const haulers = S.sv.filter((q) => q.haul && q.haul.id === j.id).length; if (haulers >= 2) continue;
    const OKM = ['free', 'wait', 'work', 'gather', 'chat', 'campfire', 'walk']; const c = S.sv.filter((q) => q.hp > q.max * .4 && !q.haul && !q.carrying && !q.carriedLoot && !q.rescuing && !q.sleeping && OKM.includes(q.mode) && !(q.mode === 'walk' && q.purpose) && !urgentNeed(q) && !(isNight() && q.job === 'Guard') && !insideBuilding(q))
      .sort((p, q) => (q.job === 'Builder' || q.job === 'Engineer' ? 1 : 0) - (p.job === 'Builder' || p.job === 'Engineer' ? 1 : 0) || dist(p.w, jobPt(x)) - dist(q.w, jobPt(x)))[0];
    if (!c) continue; if (c.gatherAt) { c.gatherAt = null; } c.activity = null; c.target = null; enterFree(c, 0); if (tryHaul(c)) { j.lastHaul = tick; break; } }
  if (tick % 200 === 0) for (const { j } of jobList().sort((a, b) => a.j.id - b.j.id)) {   /* last resort only: nobody has been able to carry for a long time (everyone away or hurt) */
    if (tick - (j.lastHaul || j.made || 0) < 3600 || S.sv.some((q) => q.haul && q.haul.id === j.id)) continue;
    const r = Object.keys(j.need).find((k) => (j.need[k] || 0) - (j.got[k] || 0) - (j.inb[k] || 0) > 0 && (S[k] || 0) >= 1); if (!r) continue;
    S[r] -= 1; j.got[r] = (j.got[r] || 0) + 1; if (jobReady(j) && !j.readyMsg) { j.readyMsg = true; const x = jobById(j.id); if (x) say(`${jobName(x)}: all materials are in, building now.`, true); } break; }
  for (const st of [...S.sites]) {
    if (!jobReady(st)) continue; if (--st.cons > 0) continue;
    S.sites.splice(S.sites.indexOf(st), 1); const { cons, dur, need, got, inb, id, hammer, readyMsg, ...nb } = st; nb.staff = null; const d = DEFS[nb.type];
    world.buildings.push(nb); Wd.bump(world); pushUnitsOut(nb); autoStaff(); S.builtCount++; renownGain(1, 'Construction');
    if (d.fam === 'water' && S.stage === 0) { S.stage = 1; renownGain(5, 'Water secured'); questFlash(); firstGift('water'); }   /* 3D.295 */
    celebrate(nb, d); rpStarter(); ui(); saveGame();
  }
  for (const b of world.buildings) {
    const u = b.upg; if (!u || !jobReady(u) || b.burnt) continue; if (--u.cons > 0) continue;
    const d0 = DEFS[b.type], n = DEFS[u.to]; b.upg = null;
    if (u.place) { const pd = Wd.rotDef(n, u.place.rot); if (Wd.placementCheck(world, u.place.x, u.place.y, pd, b).ok) { Object.assign(b, { x: u.place.x, y: u.place.y, rot: u.place.rot, w: pd.w, h: pd.h }); pushUnitsOut(b); } else say(`Something was built where the ${n.name} was meant to grow: it kept its old spot.`, true); }   /* 3D.41 */
    b.type = u.to; b.q = n.q; b.a = n.a; if (b.max) { b.max = bMax(b); b.hp = b.max; } Wd.bump(world);
    renownGain(2 + n.tier, n.name); autoStaff(); celebrate(b, n, d0);
    if (n.role === 'hq') { say(`The camp is now a ${n.name}! Tier ${n.tier} buildings unlocked${Wd.TERRITORY[n.tier] ? ', and you can claim more land' : ''}.`, true); showEventPopup({ stage: { scene: 'party', head: n.name + '!', icon: n.tier >= 3 ? '🏰' : '🏡', badge: 'Tier ' + n.tier, here: true }, title: '🏗 ' + n.name.toUpperCase() + ' COMPLETE', text: `Your base grew into a ${n.name}. ${n.tier === 2 ? 'Timber buildings are open: Cabins, Rain Collectors, Fenced Farms, Storehouses, the Workshop, the Lumber Camp and the Quarry.' : 'The stone tier is open: Stone Houses, the Stone Well, Irrigated Farms, the Mess Hall, the Hospital, Barracks and Stone Walls.'}` }); }
    ui(); saveGame();
  }
}
function celebrate(b, d, from) {
  if (b && (b.type === 'radio' || b.type === 'tradepost')) setTimeout(() => earnBanner('civic', b.type === 'radio' ? 'The Radio Tower is finished: the Haven can be heard for miles.' : 'The Trading Post is open: traders come to the Haven now.'), 600);   /* 3D.104 civic projects raise a Banner */   /* the "it's done!" moment: confetti, a banner, a line on what it does */
  SFX('reward'); banner((from ? '⬆ ' : '🏠 ') + d.name.toUpperCase() + ' COMPLETE'); doneFx.push({ b, f: 0, label: from ? d.name.toUpperCase() + '!' : 'DONE!' });
  (window.ZH_BURSTS ||= []).push({ x: b.x + b.w / 2, y: b.y + b.h / 2, t: performance.now() });
  const what = BDESC[d.key] || BDESC[d.like] || ''; if (what) screenToast(d.name + ': ' + what.split('.')[0]);
  logEvent(from ? `${from.name} upgraded to ${d.name}.` : `${d.name} built.`, 'important');
  barkSomeone(from ? 'upgraded' : 'built', { b: d.name }, { pri: 2 }, { x: b.x + b.w / 2, y: b.y + b.h / 2 });
}
const doneFx = [];
function drawSites() {   /* progress pill + time left over each site, a bouncing hammer, and a burst when one finishes */
  const u = hudU(), tw = TWs();
  for (const { j: st, b: bb } of jobList()) {   /* V3D.23: sites and upgrades; "need" text until every material is in */
    const c = project(bb.x + bb.w / 2, bb.y + bb.h / 2), top = c.y - (1.1 + .25 * Math.max(bb.w, bb.h)) * tw * .55, ready = jobReady(st), mi = jobMiss(st);
    const tot = Object.values(st.need).reduce((a, v) => a + v, 0) || 1, gotN = Object.entries(st.need).reduce((a, [k, v]) => a + Math.min(v, st.got[k] || 0), 0);
    const k = ready ? 1 - st.cons / st.dur : gotN / tot;
    const o = { hp: k, max: 1 }; o._ghost = k; hpPill(o, c.x + 4 * u, top, { col: ready ? '#f2b84a' : '#c9a36a', w: 46 });
    const secs = Math.ceil(st.cons / 60 / simSpeedNow()), txt = !ready ? 'need ' + costShort(mi) : secs >= 60 ? Math.floor(secs / 60) + 'm ' + String(secs % 60).padStart(2, '0') + 's' : secs + 's';
    hudText((st.to ? '⬆ ' : '') + txt, c.x + 4 * u, top - 4 * u, `600 ${Math.round(12 * u)}px Fredoka, Nunito, sans-serif`, ready ? '#fff8ec' : '#ffe0b0', '#5a3f31', 3.2 * u);
    if (ready) { const hb = Math.abs(Math.sin(tick / 9)) * 5 * u; ctx.save(); ctx.font = `${Math.round(17 * u)}px sans-serif`; ctx.textAlign = 'center'; ctx.translate(c.x - 24 * u, top + 6 * u - hb); ctx.rotate(-.6 + Math.abs(Math.sin(tick / 9)) * .9); ctx.fillText('🔨', 0, 0); ctx.restore(); }
  }
  for (let i = doneFx.length - 1; i >= 0; i--) {
    const e = doneFx[i], t = e.f++ / 60; if (t > 1.6) { doneFx.splice(i, 1); continue; }
    const c = project(e.b.x + e.b.w / 2, e.b.y + e.b.h / 2); ctx.save();
    for (let j = 0; j < 16; j++) { const a = j / 16 * 6.283, r = (10 + 60 * Math.min(1, t * 1.8)) * u; ctx.globalAlpha = Math.max(0, 1 - t / 1.5); ctx.fillStyle = ['#ffd45c', '#fff6c2', '#9be2ff', '#ffb0d0'][j % 4]; hudStar(c.x + Math.cos(a) * r, c.y - 30 * u + Math.sin(a) * r * .55 - t * 20 * u, 5 * u, t * 4); ctx.fill(); }
    ctx.globalAlpha = Math.min(1, (1.6 - t) * 2); hudText(e.label || 'DONE!', c.x, c.y - 60 * u - t * 10 * u, `${Math.round(24 * u * (t < .15 ? .6 + t * 2.7 : 1))}px 'Lilita One', Fredoka, sans-serif`, '#ffd45c', '#5a3f31', 6 * u); ctx.restore();
  }
}
function entranceArrow(pv) {   /* V3D.12: a bouncing arrow on the ground at the door, pointing out of the entrance */
  const dp = Wd.doorPoint(pv), ap = Wd.approachPoint(pv); let dx = ap.x - dp.x, dy = ap.y - dp.y; const L = Math.hypot(dx, dy) || 1; dx /= L; dy /= L;
  const bob = .12 + .12 * Math.sin(tick / 7), x0 = dp.x + dx * (.15 + bob), y0 = dp.y + dy * (.15 + bob), x1 = x0 + dx * 1.05, y1 = y0 + dy * 1.05;
  const P = (x, y) => project(x, y), a = P(x0, y0), b = P(x1, y1), ang = Math.atan2(b.y - a.y, b.x - a.x), len = Math.hypot(b.x - a.x, b.y - a.y), u = hudU(), w = 7 * u, hw = 15 * u, hl = Math.min(len * .55, 20 * u);
  ctx.save(); ctx.translate(a.x, a.y); ctx.rotate(ang); ctx.scale(1, .82);
  ctx.beginPath(); ctx.moveTo(0, -w); ctx.lineTo(len - hl, -w); ctx.lineTo(len - hl, -hw); ctx.lineTo(len, 0); ctx.lineTo(len - hl, hw); ctx.lineTo(len - hl, w); ctx.lineTo(0, w); ctx.closePath();
  ctx.lineJoin = 'round'; ctx.lineWidth = 4 * u; ctx.strokeStyle = '#5a3f31'; ctx.stroke(); ctx.fillStyle = pv.ok ? '#ffe07a' : '#ff9b8a'; ctx.fill(); ctx.restore();
}
const simSpeedNow = () => Math.max(1, simSpeed || 1);
let demoPick = null;
let tileConfirm = null;   /* V2.38: removing a wall or road takes a second tap on the same tile (it was instant: easy to do by accident) */
function confirmTile(kind, x, y, msg) { const k = kind + x + ',' + y, now = performance.now(); if (tileConfirm && tileConfirm.k === k && now - tileConfirm.t < 4000) { tileConfirm = null; return true; } tileConfirm = { k, x, y, t: now }; say(msg); return false; }
function drawTileConfirm() { if (!tileConfirm || performance.now() - tileConfirm.t > 4000) return; diamond(tileConfirm.x, tileConfirm.y, 'rgba(226,91,85,.55)', '#ffb0a8'); }
function tryDemolish(px, py, x, y) {   /* V2.33: one Demolish tool for buildings, roads and walls (buildings need a second tap to confirm) */
  { const st = (S.sites || []).find((q) => x >= q.x && x < q.x + q.w && y >= q.y && y < q.y + q.h); if (st) { if (!confirmTile('s', x, y, `Tap the ${DEFS[st.type].name} site again to cancel it (delivered materials come back).`)) return; for (const [k, v] of Object.entries(st.got || {})) S[k] = (S[k] || 0) + v; S.sites.splice(S.sites.indexOf(st), 1); world.sites = S.sites; Wd.bump(world); say('Site cancelled.'); saveGame(); ui(); return; } }   /* V3D.23 */
  const b = hitBuilding(px, py) || Wd.buildingAt(world, x, y);
  if (b) { if (demoPick === b) { demoPick = null; selected = null; demolish(b); startTool({ kind: 'demolish' }); return; } demoPick = b; selected = { kind: 'building', ref: b }; say(`Tap ${DEFS[b.type].name} again to demolish it (+${Math.floor(DEFS[b.type].mat * .5)} scrap).`); return; }
  demoPick = null; selected = null;
  { const gp = postAt(x, y); if (gp) { if (!confirmTile('p', x, y, 'Tap the guard post again to remove it (+1 part).')) return; removePost(gp); say('Guard post removed.'); ui(); return; } }
  { const tp = trapAt(x, y); if (tp) { if (!confirmTile('t', x, y, `Tap the ${TRAP_DEFS[tp.type].name} again to remove it (half the cost back).`)) return; trapMap().delete(x + ',' + y); refundCost(bCost(TRAP_DEFS[tp.type]), .5); Wd.bump(world); say(TRAP_DEFS[tp.type].name + ' removed.'); saveGame(); ui(); return; } }
  const wl = Wd.wallAt(world, x, y); if (wl) { if (!confirmTile('w', x, y, `Tap the ${Wd.WALL_DEFS[wl.type].name} again to remove it (half the cost back).`)) return; world.walls.delete(Wd.key(x, y)); Wd.bump(world); refundCost(bCost(Wd.WALL_DEFS[wl.type]), .5); say(Wd.WALL_DEFS[wl.type].name + ' removed.'); checkPerimeter(); saveGame(); ui(); return; }
  if (Wd.isRoad(world, x, y)) { if (!confirmTile('r', x, y, 'Tap the road again to remove it.')) return; world.roads.delete(Wd.key(x, y)); Wd.bump(world); say('Road removed.'); saveGame(); ui(); return; }
  say('Nothing to demolish there.');
}
function tryRoad(x, y) {
  if (!Wd.inTown(x, y)) { say('Roads only inside the build zone.'); return; }
  if (Wd.buildingAt(world, x, y)) { say('A building is in the way.'); return; }
  if (Wd.isRoad(world, x, y)) { if (!confirmTile('r', x, y, 'Tap the road again to remove it.')) return; world.roads.delete(Wd.key(x, y)); Wd.bump(world); say('Road removed.'); ui(); return; }
  if (S.mat < Wd.ROAD_COST) { say('Not enough scrap.'); return; }
  S.mat -= Wd.ROAD_COST; world.roads.add(Wd.key(x, y)); Wd.bump(world); ui();
}
function tryWall(x, y, type) {
  const wd = Wd.WALL_DEFS[type];
  if (!Wd.inWallZone(x, y)) { say('Walls go around the town, inside the glowing area.'); return; }
  if (Wd.buildingAt(world, x, y)) { say('A building is in the way.'); return; }
  if (postAt(x, y)) { say('A guard post is in the way.'); return; }
  { const bl = world.buildings.find((b) => { const t = Wd.approachTile(b); return t.x === x && t.y === y; }); if (bl && type !== 'gate') { if (!Wd.wallAt(world, x, y) && canPay(bCost(Wd.WALL_DEFS.gate))) { say(`The ${DEFS[bl.type].name}'s doorway: a Gate goes there instead.`); tryWall(x, y, 'gate'); return; } say(`That's the ${DEFS[bl.type].name}'s doorway: keep it clear (a gate is fine).`); return; } }   /* 3D.169: a wall on a doorway left a gap nobody saw */   /* 3D.115 entrances matter */
  const ex = Wd.wallAt(world, x, y), k = Wd.key(x, y);
  if (ex && ex.type === type) { if (!confirmTile('w', x, y, `Tap the ${wd.name} again to remove it.`)) return; world.walls.delete(k); Wd.bump(world); refundCost(bCost(wd), .5); say(wd.name + ' removed.'); saveGame(); ui(); return; }
  if (ex && wd.lvl && (Wd.WALL_DEFS[ex.type].lvl || 0) && wd.lvl > Wd.WALL_DEFS[ex.type].lvl) {   /* 3D.103 wall tiers: building a stronger wall on a weaker one upgrades it in place (half of the old one's cost back) */
    if ((wd.tier || 1) > hqTier()) { say(wd.name + ' needs the ' + hqName(wd.tier) + '.'); return; } if (!canPay(bCost(wd))) { say('Not enough: need ' + missText(bCost(wd)) + '.'); return; }
    payCost(bCost(wd)); refundCost(bCost(Wd.WALL_DEFS[ex.type]), .5); const old = Wd.WALL_DEFS[ex.type].name; ex.type = type; ex.broken = false; ex.max = Math.round(wd.hp * (researched('walls') ? 1.3 : 1)); ex.hp = ex.max; Wd.bump(world); checkPerimeter(); say(old + ' upgraded to ' + wd.name + '.'); saveGame(); ui(); return; }
  if (ex && type === 'gate' && ex.type !== 'gate') {   /* 3D.169 round 2 (Rusher: 12 died behind a sealed fence with no gate): a Gate swaps into any wall section */
    if (!canPay(bCost(wd))) { say('Not enough: need ' + missText(bCost(wd)) + '.'); return; } payCost(bCost(wd)); refundCost(bCost(Wd.WALL_DEFS[ex.type]), .5); const old = Wd.WALL_DEFS[ex.type].name; ex.type = 'gate'; ex.broken = false; ex.max = Math.round(wd.hp * (researched('walls') ? 1.3 : 1)); ex.hp = ex.max; Wd.bump(world); checkPerimeter(); say(old + ' swapped for a Gate.'); saveGame(); ui(); return; }
  if (ex) { say('Remove the ' + Wd.WALL_DEFS[ex.type].name + ' first.'); return; }
  if (wd.rank > S.rank) { say(wd.name + ' needs Haven level ' + lvlOfRank(wd.rank) + '.'); return; } if ((wd.tier || 1) > hqTier()) { say(wd.name + ' needs the ' + hqName(wd.tier) + '.'); return; }
  if (Wd.isRoad(world, x, y) && type !== 'gate') { say('Use a Gate to close a road.'); return; }
  if ([...S.sv, ...S.z].some((u) => u.hp > 0 && Math.floor(u.w.x) === x && Math.floor(u.w.y) === y)) { say('Someone is standing there.'); return; }
  if (!canPay(bCost(wd))) { say('Not enough: need ' + missText(bCost(wd)) + '.'); return; }
  payCost(bCost(wd)); const whp = Math.round(wd.hp * (researched('walls') ? 1.3 : 1)); world.walls.set(k, { x, y, type, hp: whp, max: whp }); Wd.bump(world); checkPerimeter(); saveGame(); ui();
}
function checkPerimeter() {
  const p = Wd.perimeter(world); if (p.sealed && !S.sealed) { note('important', '🛡 PERIMETER SEALED', { log: 'The perimeter is sealed. Zombies must break through.' }); }
  if (!p.sealed && S.sealed) { note('important', '⚠ PERIMETER OPEN', { log: p.ring ? `The wall closes, but only ${p.inside} of ${p.total} buildings are inside it.` : 'The perimeter is open: zombies can walk in through a gap.' }); }
  S.sealed = p.sealed; return p;
}
/* ---------------- 3D.76 traps (3D.100: anywhere open, not only outside the wall ring), they wear out and are re-armed with scrap (a choice made before the night) ---------------- */
const TRAP_DEFS = {
  spikes: { name: 'Spike Strip', rank: 2, mat: 2, wood: 2, rearm: { mat: 2 }, ch: 5, dmg: 15, icon: '🔺', desc: '15 damage and a stumble; blunt after 5 hits (re-arm: 2 scrap). Pointy end up.' },
  wire:   { name: 'Barbed Wire', rank: 2, mat: 3, wood: 1, rearm: { mat: 2 }, ch: 12, icon: '〰', desc: 'Zombies cross at half speed; torn after 12 crossings (re-arm: 2 scrap). Nobody likes a hug from this.' },
  trench: { name: 'Fire Trench', rank: 3, mat: 3, wood: 2, fuel: 1, rearm: { fuel: 1 }, ch: 6, dmg: 22, icon: '🔥', desc: 'Sets a crossing zombie alight for 22 damage; burns out after 6 (re-arm: 1 fuel). A barbecue nobody asked for.' },   /* 3D.104 */
  mine:   { name: 'Land Mine', rank: 3, mat: 6, fuel: 1, rearm: { mat: 6, fuel: 1 }, ch: 1, dmg: 70, icon: '💥', desc: '70 damage to every zombie within 1.5 tiles, once (re-arm: 6 scrap, 1 fuel). Do not step here. Ever.' },   /* 3D.104 explosives */
  lure:   { name: 'Noise Lure',  rank: 3, mat: 4, wood: 1, rearm: { mat: 3 }, ch: 1, pull: 3, reach: 12, hold: 1500, icon: '🔔', desc: 'When a boss attacks it rattles and pulls up to 3 of the horde aside; the boss ignores it. One use (re-arm: 3 scrap). Cans, a bell and terrible manners.' },
};
const trapMap = () => world.traps || (world.traps = new Map());
const trapAt = (x, y) => trapMap().get(x + ',' + y) || null;
const trapMax = () => 4 + 2 * (S.rank || 1);
const trapsSpent = () => [...trapMap().values()].filter((t) => t.ch <= 0);
const trapOkTile = (x, y) => Wd.inMap(x, y) && x > 0 && y > 0 && x < Wd.COLS - 1 && y < Wd.ROWS - 1 && !Wd.buildingAt(world, x, y) && !Wd.wallAt(world, x, y) && !isTreeSpot(x, y);   /* 3D.100 owner: traps go anywhere open, inside the walls too */
function tryTrap(x, y, type) {
  const td = TRAP_DEFS[type]; if (!td) return { ok: false, why: 'type' };
  const ex = trapAt(x, y), k = x + ',' + y;
  if (ex && ex.type === type && ex.ch <= 0) { if (!canPay(td.rearm)) { say('Not enough: need ' + missText(td.rearm) + ' to re-arm.'); return { ok: false, why: 'cost' }; } payCost(td.rearm); ex.ch = td.ch; say(td.name + ' re-armed.'); Wd.bump(world); saveGame(); ui(); return { ok: true, why: 'rearm' }; }
  if (ex && ex.type === type) { if (!confirmTile('t', x, y, `Tap the ${td.name} again to remove it.`)) return { ok: false, why: 'confirm' }; trapMap().delete(k); refundCost(bCost(td), .5); Wd.bump(world); say(td.name + ' removed.'); saveGame(); ui(); return { ok: true, why: 'removed' }; }
  if (ex) { say('A ' + TRAP_DEFS[ex.type].name + ' is already there.'); return { ok: false, why: 'taken' }; }
  if (!trapOkTile(x, y)) { say('Something is in the way.'); return { ok: false, why: 'tile' }; }
  if (S.rank < td.rank) { say(td.name + ' needs Haven level ' + lvlOfRank(td.rank) + '.'); return { ok: false, why: 'rank' }; }
  if (trapMap().size >= trapMax()) { say(`Room for ${trapMax()} traps at this rank.`); return { ok: false, why: 'max' }; }
  if (!canPay(bCost(td))) { say('Not enough: need ' + missText(bCost(td)) + '.'); return { ok: false, why: 'cost' }; }
  payCost(bCost(td)); trapMap().set(k, { x, y, type, ch: td.ch }); Wd.bump(world); saveGame(); ui(); return { ok: true, why: 'placed' };
}
function rearmAll() {   /* re-arm every spent trap the scrap pays for */
  let n = 0; for (const t of trapsSpent()) { const c = TRAP_DEFS[t.type].rearm; if (!canPay(c)) break; payCost(c); t.ch = TRAP_DEFS[t.type].ch; n++; }
  if (n) { Wd.bump(world); saveGame(); } return n;
}
const rearmCost = () => trapsSpent().reduce((a, t) => a + (TRAP_DEFS[t.type].rearm.mat || 0), 0);
/* 3D.104 EXPLOSIVES (approved: limited stock). Pipe bombs and molotovs are made at the Ammo Bench and Fuel Still (a Mechanic, one a day each
   while there is room), grenades come from traders and military loot. Fighters throw one on their own at a tight crowd (4+) or a boss,
   never where a survivor would be caught in the blast. Stock is capped low. */
const EX_DEFS = { pipebomb: { name: 'Pipe Bomb', icon: '💣', dmg: 60, r: 1.6, price: 9, desc: '60 damage in a 1.6-tile blast' }, molotov: { name: 'Molotov', icon: '🍾', dmg: 26, r: 1.4, burn: true, price: 6, desc: '26 damage and sets the crowd alight' }, grenade: { name: 'Grenade', icon: '🧨', dmg: 75, r: 1.9, price: 14, desc: '75 damage in a 1.9-tile blast' } };
const exCap = () => 3 + storeTiers();
function exAdd(id, n) { S.ex = S.ex || {}; const room = Math.max(0, exCap() - (S.ex[id] || 0)), g = Math.min(n, room); S.ex[id] = (S.ex[id] || 0) + g; return g; }
function boom(at, dmg, r, burn) {   /* an explosion: hurts every zombie and raider in reach */
  let n = 0; for (const z of S.z) { if (z.hp <= 0 || z.zoo) continue; const d = dist(z.w, at); if (d > r) continue; const big = z.type === 'boss' || z.type === 'alpha', k = Math.round(dmg * (d < r * .5 ? 1 : .6) * (big ? .5 : 1)); if (big) z.stunT = tick + 120; z.hp -= k; z.hitT = 12;   /* 3D.110 as approved: bosses take half and are stunned 2 s */ if (burn) z.burnT = 180; n++; floats.push({ w: { ...z.w }, t: '-' + k, col: '#ffb060', a: 50 }); if (z.hp <= 0) { S.kills++; if (z.human) raiderDown(z); } }
  floats.push({ w: { ...at }, t: burn ? '🔥' : '💥', col: '#ffd070', a: 60, big: true }); (window.ZH_BOOMS ||= []).push({ x: at.x, y: at.y, r, burn: !!burn, t: performance.now() }); SFX('hit'); return n;
}
function exTick() {   /* every half second: should a fighter throw something? */
  if (S.exAuto === false || !S.ex) return; if ((S.exCD || 0) > tick) return; const have = ['grenade', 'pipebomb', 'molotov'].filter((k) => (S.ex[k] || 0) > 0); if (!have.length) return;
  for (const q of S.sv) { if (q.hp <= 0 || !isFighter(q) || !q.target || q.target.hp <= 0 || ['away', 'down', 'hospital'].includes(q.mode)) continue; const t = q.target; if (dist(q.w, t.w) > 6) continue;
    const crowd = S.z.filter((z) => z.hp > 0 && !z.zoo && dist(z.w, t.w) < 1.6), boss = t.type === 'boss'; if (crowd.length < 4 && !boss) continue;
    const at = { x: crowd.reduce((a, z) => a + z.w.x, 0) / crowd.length, y: crowd.reduce((a, z) => a + z.w.y, 0) / crowd.length }, id = boss ? (have.includes('grenade') ? 'grenade' : have.includes('pipebomb') ? 'pipebomb' : have[0]) : have[have.length - 1], E = EX_DEFS[id];
    if (S.sv.some((o) => o.hp > 0 && o.mode !== 'away' && !insideBuilding(o) && dist(o.w, at) < E.r + .3)) continue;   /* never on our own people */
    S.ex[id]--; S.exCD = tick + 240; const n = boom(at, E.dmg, E.r, E.burn); bark(q, 'kill', {}, { pri: 2, line: id === 'molotov' ? 'Light them up!' : 'Fire in the hole!', style: 'shout' }); note('routine', `${E.icon} ${q.name} threw a ${E.name}: ${n} hit.`); return; }
}
function exDaily() {   /* the workshops make a little each day */
  if (bOf('ammobench').some((b) => isWorking(b)) && S.mat >= 20 && S.fuel >= 1 && exAdd('pipebomb', 1)) { S.mat -= 4; S.fuel -= 1; }
  if (bOf('fuelstill').some((b) => isWorking(b)) && (S.cloth || 0) >= 1 && S.fuel >= 2 && exAdd('molotov', 1)) { S.cloth -= 1; S.fuel -= 1; }
}
/* 3D.104 KENNEL and DOGS (approved). A Kennel keeps two dogs; while there is room a stray turns up every few days. A dog that follows someone works
   by its owner's job: a guard dog (Guard, Police) bites zombies next to its owner, a digger (Scavenger, Farmer) finds scrap or food more often,
   a companion (everyone else) keeps its owner happy, and a dog that goes on an expedition scouts ahead (a safer trip). */
const dogRole = (s) => (['Guard', 'Police Officer'].includes(s.job) ? 'guard' : ['Scavenger', 'Farmer'].includes(s.job) ? 'digger' : 'companion');
const dogsOwned = () => (S.pets || []).filter((p) => p.kind === 'dog').length + S.sv.filter((q) => q.pet && q.pet.kind === 'dog').length;
function kennelDaily() {
  const room = 2 * bOf('kennel').length; if (!room || dogsOwned() >= room || (S.strayNext || 0) > S.day) return; S.strayNext = S.day + 3;
  const p = newPet('dog'); (S.pets = S.pets || []).push(p); SFX('woof'); note('important', `🐕 A stray dog, ${p.name}, found the Kennel. Tap a survivor → Pet to give it an owner.`);
}
function dogBite() {   /* every 30 ticks: guard dogs bite zombies next to their owner */
  for (const s of S.sv) { if (!s.pet || s.pet.kind !== 'dog' || s.hp <= 0 || ['away', 'down'].includes(s.mode) || insideBuilding(s) || dogRole(s) !== 'guard') continue;
    const z = S.z.find((q) => q.hp > 0 && !q.zoo && q.mode !== 'appear' && dist(q.w, s.w) < 1.3); if (!z) continue; z.hp -= 4; z.hitT = 8; if (!z.slowT || z.slowT < tick) z.slowT = tick + 40; floats.push({ w: { ...z.w }, t: '🐕-4', col: '#ffe38a', a: 40 }); if (z.hp <= 0) S.kills++; }
}
function trapStep(z, px, py) {   /* after a zombie moves: wire slows it, spikes hurt it (once per strip) */
  if (z.stun > 0) { z.stun--; z.w.x = px; z.w.y = py; z.moving = false; return; }
  const tx = Math.floor(z.w.x), ty = Math.floor(z.w.y), t = trapMap().size ? trapAt(tx, ty) : null; if (!t || t.ch <= 0) { z.onTrap = null; return; }
  const k = tx + ',' + ty, fresh = z.onTrap !== k; z.onTrap = k;
  if (t.type === 'wire') { z.w.x = px + (z.w.x - px) * .5; z.w.y = py + (z.w.y - py) * .5; if (fresh) { t.ch--; if (t.ch <= 0) Wd.bump(world); } return; }
  if (t.type === 'trench' && fresh) { const dmg = TRAP_DEFS.trench.dmg; z.hp -= dmg; z.hitT = 9; t.ch--; S.trapHits = (S.trapHits || 0) + 1; if (z.hp <= 0) S.trapKills = (S.trapKills || 0) + 1; floats.push({ w: { ...z.w }, t: '🔥-' + dmg, col: '#ffa040', a: 45 }); if (t.ch <= 0) Wd.bump(world); return; }
  if (t.type === 'mine' && fresh && !z.human) { const at = { x: tx + .5, y: ty + .5 }; boom(at, TRAP_DEFS.mine.dmg, 1.5); t.ch = 0; Wd.bump(world); return; }
  if (t.type === 'spikes' && fresh) {
    const dmg = Math.round(TRAP_DEFS.spikes.dmg * (townHyb('sapper') ? 1.3 : 1)); z.hp -= dmg; z.hitT = 9; z.stun = z.type === 'boss' ? 10 : 40; t.ch--; S.trapHits = (S.trapHits || 0) + 1; if (z.hp <= 0) S.trapKills = (S.trapKills || 0) + 1;
    floats.push({ w: { ...z.w }, t: '-' + dmg, col: '#ffcf6a', a: 45 }); if (t.ch <= 0) { Wd.bump(world); floats.push({ w: { x: tx + .5, y: ty + .5 }, t: 'spikes blunt', col: '#c9c4b8', a: 70 }); }
  }
}
/* 3D.147 car alarm lure: tap a wreck while zombies are near it and set its alarm off; the nearest few (never a boss) go to it and mill there until someone comes close */
const ALARM = { reach: 12, pull: 6, hold: 1500 };
function alarmCands(x, y) { const n = (S.nodes || {})[nodeKey(x, y)]; if (n && n.alarm === S.day) return []; const at = { x: x + .5, y: y + .5 };
  return S.z.filter((z) => z.hp > 0 && !z.human && z.type !== 'boss' && !z.zoo && !z.lure && z.mode !== 'appear' && dist(z.w, at) < ALARM.reach).sort((a, b) => dist(a.w, at) - dist(b.w, at)).slice(0, ALARM.pull); }
function carAlarm(x, y) { const at = { x: x + .5, y: y + .5 }, c = alarmCands(x, y); if (!c.length) { say('Nothing near it to hear the alarm.', true); return 0; }
  const n = treeNode(x, y); n.alarm = S.day; for (const z of c) { z.lure = at; z.lureUntil = tick + ALARM.hold; z.target = null; z.path = null; if (['zchase', 'zattack'].includes(z.mode)) z.mode = 'idle'; }
  SFX('caralarm'); floats.push({ w: at, t: '🚨 WEE-OO WEE-OO', col: '#ff6a5a', a: 110 }); S.alarmPulled = (S.alarmPulled || 0) + c.length;
  note('important', `🚨 The car alarm screams: ${c.length} zombie${c.length > 1 ? 's' : ''} turn${c.length > 1 ? '' : 's'} toward the wreck.`); saveGame(); return c.length; }
function lureFire() {   /* a boss attacks: each armed lure rattles once and pulls a few of the horde near it aside */
  let pulled = 0;
  for (const t of trapMap().values()) {
    if (t.type !== 'lure' || t.ch <= 0) continue; const td = TRAP_DEFS.lure, at = { x: t.x + .5, y: t.y + .5 };
    const cand = S.z.filter((z) => z.hp > 0 && z.mob && z.type !== 'boss' && !z.human && !z.lure && dist(z.w, at) < td.reach).sort((a, b) => dist(a.w, at) - dist(b.w, at)).slice(0, td.pull);
    for (const z of cand) { z.lure = at; z.lureUntil = tick + td.hold; } t.ch = 0; pulled += cand.length; floats.push({ w: at, t: '🔔 clang clang', col: '#ffe08a', a: 90 });
  }
  if (pulled) { S.lurePulled = (S.lurePulled || 0) + pulled; Wd.bump(world); note('important', `🔔 The Noise Lure rattles: ${pulled} zombie${pulled > 1 ? 's' : ''} of the horde turn${pulled > 1 ? '' : 's'} toward it.`); }
  return pulled;
}
function lureStep(z) {   /* a lured zombie shuffles to the noise and mills there, unless someone comes close */
  if (!z.lure) return false; if (tick > z.lureUntil || z.mode === 'appear') { if (tick > z.lureUntil) z.lure = null; return false; }
  const d = zDef(z); for (const s of S.sv) if (s.hp > 0 && !['down', 'hospital'].includes(s.mode) && !insideBuilding(s) && dist(s.w, z.w) < d.aggro) { z.lure = null; return false; }
  if (dist(z.w, z.lure) > .9) moveSlide(z, z.lure, d.chase * .7); else z.moving = false; return true;
}
function demolish(b) { const d = DEFS[b.type], c = bCost(d); releasePost(b); world.buildings = world.buildings.filter((q) => q !== b); Wd.bump(world); refundCost(c, .5); selected = null; closeP(); say(`${d.name} demolished · half the wood and scrap back`, true); saveGame(); ui(); }
function moveBuilding(b) { world.buildings = world.buildings.filter((q) => q !== b); Wd.bump(world); moving = b; selected = null; closeP(); sel = { kind: 'building', type: b.type, rot: (b.rot | 0) & 3 }; preview = null; $('yesBuild').style.display = ''; $('nudge').style.display = ''; $('rotBuild').style.display = ''; $('noBuild').textContent = 'CANCEL'; updatePreview(b.x, b.y); say('Tap a new spot for the south corner.'); }

