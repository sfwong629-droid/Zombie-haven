/* ---------------- input ---------------- */
const pointers = new Map(); let gesture = null, tapStart = null;
const local = (e) => { const r = cv.getBoundingClientRect(); return { x: e.clientX - r.left, y: e.clientY - r.top }; };
const ZOOM_MIN = .35, ZOOM_MAX = 4.2;   /* V2.49: wider zoom (was 0.5–1.9); 3D.153 owner: a bit more zoom in (was 3) */
function zoomAt(px, py, nz) { nz = Math.max(ZOOM_MIN, Math.min(ZOOM_MAX, nz)); const w = unproject(px, py); cam.z = nz; const p = project(w.x, w.y); cam.x += px - p.x; cam.y += py - p.y; clampCam(); updateZoomLabel(); }
cv.addEventListener('pointerdown', (e) => { cv.setPointerCapture(e.pointerId); const p = local(e); pointers.set(e.pointerId, p); if (pointers.size === 1) { tapStart = { ...p, id: e.pointerId, cx: cam.x, cy: cam.y, moved: false, t: performance.now() }; if (edgeTool()) { const t = unproject(p.x, p.y); tapStart.edge = { x: Math.round(t.x), y: Math.round(t.y) }; edgeDraft = null; } } else if (pointers.size === 2) { if (tapStart) tapStart.moved = true;   /* V2.39: a second finger means a gesture, never a tap */ const a = [...pointers.values()]; gesture = { dist: Math.max(20, Math.hypot(a[1].x - a[0].x, a[1].y - a[0].y)), z: cam.z, mx: (a[0].x + a[1].x) / 2, my: (a[0].y + a[1].y) / 2 }; tapStart = null; edgeDraft = null; } });
cv.addEventListener('pointermove', (e) => {
  if (!pointers.has(e.pointerId)) return; const p = local(e); pointers.set(e.pointerId, p);
  if (pointers.size === 1 && tapStart) { const dx = p.x - tapStart.x, dy = p.y - tapStart.y; if (Math.hypot(dx, dy) > 8) tapStart.moved = true; if (tapStart.moved && tapStart.edge && edgeTool()) { const t = unproject(p.x, p.y); edgeDraftAt(tapStart.edge, { x: Math.round(t.x), y: Math.round(t.y) }); } else if (tapStart.moved) { cam.x = tapStart.cx + dx; cam.y = tapStart.cy + dy; clampCam(); } }   /* 3D.359 with the wall tool on lines, one finger draws a run */
  else if (pointers.size >= 2 && gesture) { const a = [...pointers.values()].slice(0, 2), d = Math.max(20, Math.hypot(a[1].x - a[0].x, a[1].y - a[0].y)), mx = (a[0].x + a[1].x) / 2, my = (a[0].y + a[1].y) / 2; zoomAt(mx, my, gesture.z * d / gesture.dist); if (edgeTool() && gesture.mx != null) { cam.x += mx - gesture.mx; cam.y += my - gesture.my; clampCam(); } gesture.mx = mx; gesture.my = my; }   /* two fingers also move the view while drawing walls */
});
function pointerEnd(e) { const p = local(e), wasTap = tapStart && tapStart.id === e.pointerId && !tapStart.moved && pointers.size === 1; if (tapStart && tapStart.edge && tapStart.moved && tapStart.id === e.pointerId && edgeDraft && edgeTool()) edgeDraftToPlan(); else if (tapStart && tapStart.id === e.pointerId) edgeDraft = null; pointers.delete(e.pointerId); if (pointers.size < 2) gesture = null;
  if (pointers.size === 1) { const [id, q] = [...pointers.entries()][0]; tapStart = { ...q, id, cx: cam.x, cy: cam.y, moved: true, t: performance.now() }; }   /* V2.39: pinch → one finger keeps panning from where it is (no jump) */
  if (wasTap) tapAt(p.x, p.y); if (!pointers.size) tapStart = null; }
cv.addEventListener('pointerup', pointerEnd); cv.addEventListener('pointercancel', (e) => { pointers.delete(e.pointerId); gesture = null; tapStart = null; edgeDraft = null; });
cv.addEventListener('wheel', (e) => { e.preventDefault(); const p = local(e); zoomAt(p.x, p.y, cam.z * (e.deltaY < 0 ? 1.1 : .91)); }, { passive: false });
function hitBuilding(px, py) {   /* 3D.129 the building under the finger in the 3D view (was the outline of the old 2D picture); falls back to the tile */
  const b = window.ZH3D && ZH3D.pickBuilding && ZH3D.pickBuilding(px, py); if (b) return b;
  const t = unproject(px, py); return Wd.buildingAt(world, Math.floor(t.x), Math.floor(t.y));
}
function closePick() { const e = $('pick'); if (e) e.remove(); }
function showPick(px, py, c) {
  const w = $('world'), d = document.createElement('div'); d.id = 'pick'; d.className = 'pick';
  d.innerHTML = c.map((o, i) => { if (o.kind === 'unit') { const pic = window.ZH3D && ZH3D.portrait ? ZH3D.portrait(o.ref) : null; return `<button data-k="${i}"><span class="pi">${pic ? `<img src="${pic}" alt="">` : '🙂'}</span><span><b>${esc(fullName(o.ref))}</b><small>${o.ref.job} · ${esc((o.ref.why || '').slice(0, 26))}</small></span></button>`; }
    if (o.kind === 'trader') return `<button data-k="${i}"><span class="pi">${window.ZHIcons ? ZHIcons.svg('box', 26) : '🛒'}</span><span><b>Trader</b><small>Buy and sell</small></span></button>`;
    const b = o.ref, dd = DEFS[b.type]; return `<button data-k="${i}"><span class="pi">${window.ZHIcons ? ZHIcons.svg(FAC_ICON[dd.fam] || TYPE_ICON[b.type] || 'home', 26) : '🏠'}</span><span><b>${dd.name}</b><small>${b.burnt ? 'Needs repair' : bHp(b) < b.max ? `Health ${Math.ceil(b.hp)}/${b.max}` : 'Building'}</small></span></button>`; }).join('');
  w.appendChild(d); const r = w.getBoundingClientRect(), bw = d.offsetWidth, bh = d.offsetHeight;
  d.style.left = Math.max(8, Math.min(r.width - bw - 8, px - bw / 2)) + 'px'; d.style.top = Math.max(60, Math.min(r.height - bh - 90, py + 18)) + 'px';
  d.querySelectorAll('button').forEach((el) => { el.onclick = (e) => { e.stopPropagation(); const o = c[+el.dataset.k]; closePick(); if (o.kind === 'unit') unitPanel(o.ref); else if (o.kind === 'trader') showTrader(); else showBuildingInfo(o.ref); }; });
}
function hitUnit(px, py) {
  let best = null, bd = 1e9; for (const s of S.sv) { if (insideBuilding(s)) continue; const p = project(s.w.x, s.w.y), cy = p.y - CHAR_H * TWs() * .5, d = Math.hypot(px - p.x, py - cy); if (d < Math.max(22, .4 * TWs()) && d < bd) { bd = d; best = s; } } return best;
}
function tapAt(px, py) {
  if (sel) {
    const t = unproject(px, py), tx = Math.floor(t.x), ty = Math.floor(t.y);
    if (sel.kind === 'road') { tryRoad(tx, ty); return; }
    if (sel.kind === 'demolish') { tryDemolish(px, py, tx, ty); return; }
    if (sel.kind === 'wall') { if (edgeOn()) { const e = edgeNear(t.x, t.y); edgePlanTap(e, sel.wtype); } else tryWall(tx, ty, sel.wtype); return; }
    if (sel.kind === 'trap' || sel.kind === 'post') { defPlanTap(tx, ty); return; }   /* 3D.366 plan, then Confirm */
    const d = Wd.rotDef(DEFS[sel.type], sel.rot), o = Iso.originFromSouthTile(tx, ty, d.w, d.h); updatePreview(o.x, o.y); return;
  }
  closePick();
  { const cb = hitBonus(px, py); if (cb && collectBonus(cb)) return; }   /* 3D.28 tap a bonus bubble to collect */
  {   /* V3D.17: people and a building under the same tap → a small chooser instead of guessing */
    const us = S.sv.filter((s) => !insideBuilding(s) && s.mode !== 'away' && s.w).map((s) => { const p = project(s.w.x, s.w.y); return [s, Math.hypot(px - p.x, py - (p.y - CHAR_H * TWs() * .5))]; }).filter(([, d]) => d < Math.max(26, .45 * TWs())).sort((a, b) => a[1] - b[1]).map(([s]) => s);
    const c = []; if (hitTrader(px, py)) c.push({ kind: 'trader' }); for (const s of us.slice(0, 4)) c.push({ kind: 'unit', ref: s });
    const bb = hitBuilding(px, py); if (bb) c.push({ kind: 'building', ref: bb });
    if (c.length > 1) { showPick(px, py, c); return; }
  }
  if (hitTrader(px, py)) { showTrader(); return; }
  const u = hitUnit(px, py); if (u) { unitPanel(u); return; }
  { const t0 = unproject(px, py), st = (S.sites || []).find((q) => t0.x >= q.x && t0.x < q.x + q.w && t0.y >= q.y && t0.y < q.y + q.h); if (st) { const mi = jobMiss(st), secs = Math.ceil(st.cons / 60 / simSpeedNow()); say(`${DEFS[st.type].name}: ` + (Object.keys(mi).length ? `waiting for ${costShort(mi)}. Builders bring it from the stockpile; idle survivors gather what is missing. (Demolish tool cancels it.)` : `building, ${secs >= 60 ? Math.ceil(secs / 60) + ' min' : secs + ' s'} left.`), true); return; } }
  const b = hitBuilding(px, py); if (b) { showBuildingInfo(b); return; }
  { const t = unproject(px, py), gp = postAt(Math.floor(t.x), Math.floor(t.y)); if (gp) { showPost(gp); return; } }
  { const t = unproject(px, py), en = world.edges && world.edges.size ? edgeNear(t.x, t.y) : null, wl = Wd.wallAt(world, Math.floor(t.x), Math.floor(t.y)) || (en && en.d < .3 ? Wd.edgeAt(world, en.s, en.x, en.y) : null); if (wl) { const n = S.z.filter((z) => z.hp > 0 && z.mode === 'zbreak' && z.wallT === wl).length, hot = S.z.some((z) => z.hp > 0 && dist(z.w, wc(wl)) < 2.6); say(`${Wd.WALL_DEFS[wl.type].name} · ${Math.ceil(wl.hp)}/${wl.max} HP` + (n ? ` · ${n} zombie${n > 1 ? 's' : ''} hitting it` : '') + (wl.hp < wl.max ? (S.mat < 1 ? ' · no scrap to repair' : hot ? ' · repairs wait until zombies leave' : ' · being repaired') : '') + (wl.broken ? ' · BROKEN: zombies can walk through' : '')); return; } }
  { const t = unproject(px, py); if (isTreeSpot(Math.floor(t.x), Math.floor(t.y)) && tapTree(Math.floor(t.x), Math.floor(t.y))) return; }   /* V3D.22 */
  selected = null; closeP();
}
$('rotBuild').onclick = () => { if (!sel || sel.kind !== 'building') return; sel.rot = (((sel.rot | 0) + 1) & 3); if (preview && sel.upgFrom) { const b = sel.upgFrom, d = Wd.rotDef(DEFS[sel.type], sel.rot), c = [[b.x, b.y], [b.x + b.w - d.w, b.y + b.h - d.h], [b.x, b.y + b.h - d.h], [b.x + b.w - d.w, b.y]].find(([x, y]) => Wd.placementCheck(world, x, y, d, b).ok) || [b.x, b.y]; updatePreview(c[0], c[1]); return; }   /* 3D.41: turning an upgrade keeps it over the old building */ if (preview) { const d = Wd.rotDef(DEFS[sel.type], sel.rot), sx = preview.x + preview.w - 1, sy = preview.y + preview.h - 1, o = Iso.originFromSouthTile(sx, sy, d.w, d.h); updatePreview(o.x, o.y); } say(['Entrance faces front-left.', 'Entrance faces front-right.', 'Entrance faces back-right.', 'Entrance faces back-left.'][(sel.rot | 0) & 3]); };   /* V2.47: turn the entrance */
$('nudge').addEventListener('click', (e) => { const bt = e.target.closest('button'); if (!bt || !preview) return; const [dx, dy] = bt.dataset.d.split(',').map(Number); updatePreview(preview.x + dx, preview.y + dy); });
$('yesBuild').onclick = confirmPreview; $('noBuild').onclick = () => { if (edgeTool() && edgePlan.size) { edgePlan.clear(); edgePlanBar(); say('Plan cleared.'); return; } if (defTool() && defPlan.size) { defPlan.clear(); defPlanBar(); say('Plan cleared.'); return; } endBuildMode(true); say(sel ? '' : 'Done.'); };   /* 3D.361 Cancel throws a wall plan away first */
$('mBuild').onclick = showBuild; $('gauge').onclick = () => showUpgrade('rank'); $('btnHome').onclick = () => { if (titleOn) return; backToTitle(); }; $('mSurv').onclick = showSurvivors; $('mTown').onclick = showTown; $('mGuide').onclick = () => (HUD_B ? showMore() : showGuide()); $('mExp').onclick = showExplore; $('tripChip').onclick = showExplore;   /* 3D.362: the valley map first */
$('closeInfo').onclick = closeP;
/* 3D.335: in the phone look a menu is a sheet with a handle: drag its top (the handle and title row) down to close it */
{ const pn = $('infoPanel'); let y0 = null, dy = 0;
  pn.addEventListener('pointerdown', (e) => { if (!phoneOn() || !pn.classList.contains('show') || e.target.closest('button, input, #ib')) return; const r = pn.getBoundingClientRect(); if (e.clientY - r.top > 64) return; y0 = e.clientY; dy = 0; pn.style.transition = 'none'; try { pn.setPointerCapture(e.pointerId); } catch (x) {} });
  pn.addEventListener('pointermove', (e) => { if (y0 === null) return; dy = Math.max(0, e.clientY - y0); pn.style.translate = '0 ' + dy + 'px'; });
  const end = () => { if (y0 === null) return; y0 = null; pn.style.transition = ''; pn.style.translate = ''; if (dy > 90) { endBuildMode(true); closeP(); } dy = 0; };
  pn.addEventListener('pointerup', end); pn.addEventListener('pointercancel', end); }
 $('pBack').onclick = () => { const f = panelBack; if (f) f(); };
$('btnCenter').onclick = () => centerOn(7.5 + OFF, 10 + OFF, .9 * ((1.25)));   /* V3D.3: 3D tiles are bigger, zoom in a bit so people stay readable */
$('btnSpeed').onclick = () => { simSpeed = simSpeed === 1 ? 2 : simSpeed === 2 ? 3 : 1; $('btnSpeed').textContent = simSpeed + '×'; try { localStorage.setItem('zhSpeed', simSpeed); } catch (e) { /* private mode */ } };
try { const sp = +localStorage.getItem('zhSpeed'); if (sp >= 1 && sp <= 3) { simSpeed = sp; $('btnSpeed').textContent = sp + '×'; } } catch (e) { /* private mode */ }   /* V3D.13: the chosen speed sticks */
$('btnLog').onclick = showLog; { const sv = $('btnSave'); if (sv) sv.onclick = () => { if (saveGame()) { say('Saved.'); banner('💾 SAVED'); } else say(saveBlocked ? 'This tab is not saving (see the alert).' : 'Saving failed: see the alert.'); }; }
/* V3D.14 Clay icons (style A) on the top bar, left menu, Home and bottom bar */
if ((window.ZHIcons)) {
  const I = ZHIcons.svg, set = (sel, n, px) => { const e = document.querySelector(sel); if (e) e.innerHTML = I(n, px); };
  const res = document.querySelectorAll('#plaque .res > span > i'); ['food', 'water', 'wood', 'stone', 'parts', 'stash'].forEach((n, k) => { if (res[k]) res[k].innerHTML = I(n, 26); });
  [['mBuild', 'build'], ['mExp', 'explore'], ['mSurv', 'people'], ['mTown', 'town'], ['mGuide', HUD_B ? 'menu' : 'guide']].forEach(([id, n]) => set('#' + id + ' i', n, 30));
  if (HUD_B) { const g = $('mGuide'); if (g) { g.lastChild.textContent = 'More'; g.title = 'Guide and settings'; } }
  set('#btnHome', 'home', 30); set('#btnLog', 'log', 30); set('#btnCenter', 'locate', 30); if (document.documentElement.classList.contains('glass')) { set('#btnSave', 'save', 30); const sv = $('btnSave'); if (sv) sv.setAttribute('aria-label', 'Save'); }   /* 3D.28 Glass: round icon buttons */
  ZHIcons.watchAll();   /* 3D.134 every panel, bar, card and toast: emoji -> the sticker icons */
}
/* 3D.382 (W249, owner, 25 Nov: dock A, "A is ok"; 26 Nov: icons 1,2,3,1,1 drawn simpler, Town A without a window, "Let's go with 4"): the phone look's tab bar
   is a dock of five app icons with a label under each (assets/ui/dock/*.webp, drawn by tools/art/dock/icons_v21.html, the cool scheme); css/phone.css shows them and hides the stickers */
[['mExp', 'explore'], ['mSurv', 'people'], ['mTown', 'town'], ['mGuide', 'more'], ['mBuild', 'build']].forEach(([id, f]) => { const b = $(id); if (b && !b.querySelector('.dkI')) { const s = document.createElement('b'); s.className = 'dkI'; s.innerHTML = appTile(f, 34);   /* 3D.390: line-sign app icons, as in More (the painted .webp icons are no longer used) */ b.insertBefore(s, b.firstChild); } });
{ const sb = $('btnSound'), lab = () => { if (sb && window.SND) { if ((window.ZHIcons)) sb.innerHTML = ZHIcons.svg(SND.mode === 'all' ? 'sound' : SND.mode === 'sfx' ? 'soundLow' : 'soundOff', 26); else sb.textContent = SND.mode === 'all' ? '🔊' : SND.mode === 'sfx' ? '🔉' : '🔇'; } }; lab(); if (sb) sb.onclick = () => { if (window.SND) { SND.unlock(); const m = SND.cycle(); lab(); say(m === 'all' ? 'Sound: effects and music.' : m === 'sfx' ? 'Sound: effects only.' : 'Sound off.'); } }; }
document.addEventListener('pointerdown', () => { if (window.SND) { SND.unlock(); SND.music(isNight(), S.day); } }, { capture: true });
document.addEventListener('click', (e) => { if (e.target.closest('button')) SFX('click'); }, { capture: true }); $('plaque').onclick = (e) => { if (e.target.closest('#tripChip')) return; if (e.target.closest('#advX')) { if (advShown) { S.advMute = { ...(S.advMute || {}), [advShown.key]: S.day }; advisorUpdate(); } return; } if (e.target.closest('#adv')) { if (advShown) advShown.act(); return; } const r = e.target.closest('.res > span'); if (r) { if ((r.querySelector('b') || {}).id === 'rare') { supPop(); return; } const k = { food: 'food', water: 'water', mat: 'mat', wood: 'wood', stone: 'stone' }[(r.querySelector('b') || {}).id]; if (k) { showResource(k); return; } } showObjective(); };
{ const g = $('gauge'); if (g && !g.querySelector('.rIco')) { const s = document.createElement('span'); s.className = 'rIco'; s.setAttribute('aria-hidden', 'true'); s.innerHTML = window.ZHIcons ? ZHIcons.svg('star', 22) : '⭐'; g.insertBefore(s, g.querySelector('.glabel')); } }   /* 3D.275: a star beside Renown (owner, 22 Nov, W209: "Do star for renown") */
$('btnDebug').onclick = () => { debug = !debug; $('btnDebug').classList.toggle('on', debug); };

/* ---------------- loop ---------------- */
function simTick() { Wd.touch();
  if (S.cut) { for (const o of movers()) o.pv = { x: o.w.x, y: o.w.y }; tick++; cutTick(); return; }   /* 3D.102 the opening cutscene runs instead of the town */
  if (S.sh) { S.shAcc = (S.shAcc || 0) + (S.sh.sel.length || S.sh.ring ? SH_SLOW : SH_PACE) / simSpeed; while (S.sh && S.shAcc >= 1) { S.shAcc--; shTick(); } if (S.sh && S.sh.practice) return; S.shSlow = (S.shSlow || 0) + 1; if (S.shSlow % 4) return; }   /* 3D.115 the squad's own pace, not the town speed */   /* practice: the town waits */   /* 3D.108 the town keeps running, slowed right down, while the squad is inside */
  for (const o of movers()) o.pv = { x: o.w.x, y: o.w.y };   /* V2.33: previous position, for smooth drawing between ticks */
  tick++; if (S.alert > 0) S.alert--; driveTick(); truckTick(); traderTick(); guestTick(); bagsTick(); errandsTick(); sitesTick(); if (tick % 30 === 0) { downWhyTick(); incidentTick(); petTick(); exTick(); dogBite(); } S.expClock = (S.expClock || 0) + 1000 / 60; lvTick(1000 / 60); S.sv.forEach(ai); spreadOut(); if (tick % 30 === 0) wallUnstick(); if (world.walls.size && tick % 6 === 0) for (const q of S.sv) if (q.hp > 0 && q.w && !insideBuilding(q) && !['away', 'down'].includes(q.mode)) unwall(q); dryTick(); introTick(); if (tick % 30 === 7) { answerSOS(); engineerRepairs(); } S.z.forEach(zai); for (const z of S.z) if (z.hp <= 0 && z.type === 'rotbomb' && !z.escaped && !z.zoo && !z.burst) { if (!(z.fuseT >= 0)) { z.fuseT = ROT_FUSE; z.mode = 'zfuse'; z.moving = false; } else if (--z.fuseT <= 0) rotBurst(z); }   /* 3D.85 it swells for a second, then bursts */ for (const z of S.z) if (z.hp <= 0 && z.type !== 'raider' && !z.escaped && !(z.fuseT > 0) && !z.burst) corpses.push({ type: z.type, w: { ...z.w }, phase: z.phase, mode: 'dead', dead: 0, target: z.target && z.target.w ? { w: { ...z.target.w } } : null }); S.z = S.z.filter((z) => z.hp > 0 || z.fuseT > 0); for (let i = corpses.length - 1; i >= 0; i--) if (++corpses[i].dead > 120) corpses.splice(i, 1); monsterGeneration(); visitorArrival();
  if (tick % 30 === 0) { alertsTick(); refreshNow(); for (let k = 0; k < 4 && assignRescue(); k++); } if (tick % 60 === 20) repelRaid(); if (tick % 300 === 150) rally() || militia(); if (tick % 120 === 0) { missionProgress(); bondTick(); } if (tick % 240 === 0) checkRank(); if (tick % 24000 === 0 && tick > 0) triggerTownEvent(); if (tick % 450 === 0) saveGame();
  if (tick % 300 === 0) { autoStaff(); postsAssign(); powerGrid(); } if (tick % 60 === 0) { tripUpdate(); expTick(); } if (tick % 60 === 0 && (world.walls.size || (world.edges && world.edges.size))) autoRepair(); if (tick % 240 === 0 && wallCount()) checkPerimeter();
  edgeGuard();   /* 3D.351 walls on the lines: nobody steps across one */
  if (tick % 100 === 0) for (const b of world.buildings) if (b.staff) { b.wsN = (b.wsN || 0) + 1; b.wsW = (b.wsW || 0) + (isWorking(b) ? 1 : 0); }
  if (tick % 60 === 30 && window.SND) { if (S.z.some((z) => z.hp > 0 && !z.zoo && ['zchase', 'zattack', 'zbash', 'zmarch'].includes(z.mode) && Wd.inTown(Math.floor(z.w.x), Math.floor(z.w.y)))) S.musDanger = tick + 1500; SND.music(isNight(), S.day); SND.danger((S.musDanger || 0) > tick, S.z.some((z) => z.boss && z.hp > 0 && !z.zoo) || S.z.filter((z) => z.hp > 0 && !z.zoo && !z.human).length >= 25); }   /* 3D.255: a boss or a big crowd plays The Tide */   /* 3D.50 music follows the clock and the fighting */
  barkWatch(); if (tick % 30 === 15 && lastStand()) for (const q of standing()) if (['chase', 'attack', 'recover'].includes(q.mode) && q.target) { const z = q.target; q.target = null; engage(q, z); }   /* 3D.48 */
  if (tick % 60 === 40) helpTick();
  if (tick % 1000 === 0) { S.hour++; if (S.hour === 20) SFX('night'); else if (S.hour === 6) SFX('dawn');   /* 3D.355: night falls, the rooster at dawn */ if (S.mat > scrapCap()) { S.mat = scrapCap(); if (!S.capNote || S.day > S.capNote) { S.capNote = S.day; say('Scrap storage is full: build storage or level up the Haven to keep more.'); } } if (S.hour % 24 === 6) for (const q of S.sv) q.daysHere = (q.daysHere || 0) + 1; assignHomes(); housingTidy(); rpStarter(); weatherHour(); barkHour(); nodesTick(); powerTick(); hourlyProduction(); ecoHour(); shortageCheck(); siteWaitCheck(); storeBoxCheck(); advisorUpdate(); eventSchedule(); radioHour(); foundryHour(); facHour(); if (S.hour === 20 || S.hour === 6) { SFX(S.hour === 20 ? 'night' : 'dawn'); if (window.SND) SND.music(isNight()); } if (S.hour === 19) note('important', '🌙 NIGHT IN 1 HOUR — MORE ZOMBIES', { log: 'Night falls at 20:00: more zombies, and they come for the town.' }); if (S.hour === 20) note('important', '🌙 NIGHT FALLS — THE DEAD ARE RESTLESS', { log: 'Night falls: more zombies, and they come for the town.' }); if (S.hour === 6) note('routine', 'Dawn: fewer zombies until nightfall.'); if (S.nightLog && S.hour !== 20) (S.nightLog.h || (S.nightLog.h = [])).push(S.kills || 0);   /* 3D.381: the night's kills hour by hour */ if (S.hour === 20) nightStart(); if (S.hour === 6) morningCard(); if (S.hour >= 24) { S.hour = 0; S.day++; endOfDay(); } ui(); }
}
let last = 0, acc = 0; const STEP = 1000 / 60;
/* what the 3D renderer (js/render3d.js) reads each frame */
window.ZHG = { edgeDraft: () => edgeGhost(), defGhost: () => defGhost(), fpsCap: () => FPS_CAP, get guest() { return guest; }, shots, CAR_SPOTS, BIN_SPOTS, treeState, nodeState, nodeList: () => nodeList(), ROCK_SPOTS, nodeVer: () => S.nodeVer || 0, jobList: () => jobList(), jobReady, season: () => seasonOf().id, tick: () => tick, preview: () => (sel && sel.kind === 'building' ? preview : null), world, S, cam, BASE_TW, COLS, ROWS, Wd, DEFS, ITEMS, corpses, TREE_SPOTS, CRATE_SPOTS, VW: () => VW, VH: () => VH, unproject, humanAnim, facing, insideBuilding, beingCarried, wreckSpots, simSpeed: () => (S.sh && S.sh.view ? (S.sh.sel.length || S.sh.ring ? SH_SLOW : SH_PACE) : simSpeed), paused: () => modalOpen || titleOn };
const movers = () => { const l = S.sv.concat(S.z); if (S.trader) l.push(S.trader); return l; };
function drawSmooth(alpha) {   /* V2.33: draw everyone between their last two simulation positions, so movement is smooth at any frame rate and at 1x / 2x */
  const moved = [];
  for (const o of movers()) { const p = o.pv; if (!p || !o.w) continue; const dx = o.w.x - p.x, dy = o.w.y - p.y; if (Math.abs(dx) + Math.abs(dy) > 1.2 || (!dx && !dy)) continue; moved.push([o, o.w]); o.w = { x: p.x + dx * alpha, y: p.y + dy * alpha }; }
  try { draw(); } finally { for (const [o, w] of moved) o.w = w; }
}
/* 3D.159 owner: People, Build, Town and a survivor's details pause the game (a "Paused" chip shows); map pop-ups, news and the radio do not */
let menuEl = null; const menuPaused = () => { if (ccPaused()) return true; if (!menuEl) menuEl = typeof document !== 'undefined' && document.getElementById('infoPanel'); return !!(menuEl && menuEl.classList.contains('show')); };   /* 3D.396: Control Center's Pause too */
/* 3D.160 the UX study: nights never become waiting. Once every walker is down, a "Skip to dawn" button fast-forwards to 06:00;
   it stops at once if anything turns up (walkers, a raid, an emergency). Before the last of the night's three waves it is
   "Fast-forward to the next wave" and stops when that wave arrives. */
let skipping = null;
const nightClear = () => isNight() && !S.finale && !S.trip && !S.z.some((z) => z.hp > 0 && !z.human) && ![...alerts.values()].some((a) => !a.dismissed);
function skipDawnTick() {
  if (typeof document === 'undefined') return; const w = nStack('nBot'); if (!w) return; let b = $('skipDawn');
  if (skipping && (!isNight() || S.z.some((z) => z.hp > 0 && !z.human) || modalOpen)) { simSpeed = skipping.sp; $('btnSpeed').textContent = simSpeed + '×'; skipping = null; }
  const show = !skipping && nightClear() && S.hour !== 5, last = nightWave() === 2 && (S.nightSpawned || 0) >= Math.round((S.nightCap || 0) * NIGHT_WAVES.reduce((a, b) => a + b, 0));   /* nights come in three waves (20:00, 23:00, 02:00) */
  if (!b && show) { b = document.createElement('button'); b.id = 'skipDawn'; b.className = 'skipDawn'; w.appendChild(b);
    b.onclick = (e) => { e.stopPropagation(); if (!nightClear()) return; skipping = { sp: simSpeed }; simSpeed = 30; b.style.display = 'none'; }; }
  if (b) { b.style.display = show ? '' : 'none'; const t = last ? '⏩ Skip to dawn' : '⏩ Fast-forward to the next wave'; if (b.textContent !== t) b.textContent = t; }
}
/* 3D.250 bug A13 (owner, 21 Nov): the game does not start until the graphics have loaded. Until the 3D world (survivors, gear, buildings, the
   first zombie kinds and the kinds already on the map) is ready, the clock stands still and a loading screen shows how far it has got. */
let worldOK = false;
function worldReady() {
  if (worldOK || window.ZH_NO_LOAD_WAIT) return true; const R = window.ZH3D;   /* ZH_NO_LOAD_WAIT: set by the test suite, which drives the sim itself */
  const ok = !!(R && R.ready && !(R.zWaitingAny && R.zWaitingAny(S.z)));
  if (ok || (R && R.failed) || worldReady.skip) { worldOK = true; loadScreen(false); try { if (ok && R.loadProgress) localStorage.setItem('zhLoadN', String(R.loadProgress().started)); } catch (e) { /* ignore */ } if (!ok && R && R.failed) say('The 3D world could not load: close and reopen the game', true); return true; }
  if (!titleOn) loadScreen(true); return false;
}
function loadScreen(on) {
  let el = $('worldLoad');
  if (!on) { if (el) el.remove(); return; }
  if (!el) { el = document.createElement('div'); el.id = 'worldLoad'; el.innerHTML = '<div class="wlCard frame"><div class="wlName out">ZOMBIE HAVEN</div><div class="wlWhat">Loading the world…</div><div class="wlBar"><i></i></div><div class="wlFig"></div><div class="wlHelp"></div></div>'; document.body.appendChild(el); loadScreen.t0 = performance.now(); loadScreen.k = 0; }
  const R = window.ZH3D, p = R && R.loadProgress ? R.loadProgress() : { started: 0, done: 0 }; let n = 40; try { n = +localStorage.getItem('zhLoadN') || 40; } catch (e) { /* ignore */ }   /* about 40 files in 3D.250 */
  const tot = Math.max(p.started, n, 1), k = loadScreen.k = Math.max(loadScreen.k, Math.min(R && R.ready ? .99 : .95, p.done / tot)), sec = Math.round((performance.now() - loadScreen.t0) / 1000);   /* the bar never goes back; the count of files from the last full load (else about 40) is the best guess of the total */
  el.querySelector('.wlBar i').style.width = Math.round(k * 100) + '%';
  const fig = R && R.ready ? 'Waking the zombies…' : `${Math.round(k * 100)}% · ${sec} s`; const f = el.querySelector('.wlFig'); if (f.textContent !== fig) f.textContent = fig;
  const h = el.querySelector('.wlHelp'); if (sec >= 40 && !h.dataset.on) { h.dataset.on = 1; h.innerHTML = '<div>Still loading: check your connection, or close and reopen the game.</div><button class="act out wlGo">Play anyway</button>'; h.querySelector('button').onclick = () => { worldReady.skip = true; }; }
}
/* 3D.347 bug A14 (owner: the phone gets hot): draw at most 30 frames a second. The phone's screen asks 60 times a second (120 on some),
   and every frame was drawn, three passes each with the ink outlines. The game itself still runs every screen tick; only the drawing is
   skipped in between. ?fps=60 lifts the cap (for a before/after).
   3D.348: while a menu or a card is open the game is paused and the town only shows behind the glass: 5 frames a second. */
const FPS_CAP = Math.max(10, Math.min(120, +QS.get('fps') || 30)); let lastDraw = -1e9;
function frame(t) { if (titleOn) { const k = t / 1000; centerOn(7.5 + OFF + Math.sin(k * .07) * 3, 10 + OFF + Math.cos(k * .05) * 2.5, Math.max(.8, Math.min(1.2, VW / 400))); } if (!last) last = t; acc += modalOpen || titleOn || menuPaused() || !worldReady() ? 0 : Math.min(100, t - last) * simSpeed; last = t; let n = 0; const cap = skipping ? 30 : 12; while (acc >= STEP && n < cap) { simTick(); acc -= STEP; n++; } if (n === cap) acc = 0; if (!(tick % 30)) skipDawnTick(); const still = !titleOn && (modalOpen || menuPaused()); if (t - lastDraw >= (still ? 200 : 1000 / FPS_CAP) - 2) { lastDraw = t; drawSmooth(modalOpen ? 1 : Math.min(1, acc / STEP)); } requestAnimationFrame(frame); }
document.addEventListener('visibilitychange', () => { if (window.SND) SND.pause(document.hidden); if (document.hidden) { hiddenAt = Date.now(); saveGame(); } else { last = 0; tripUpdate(); expTick(); if (hiddenAt) { awayCredit(Date.now() - hiddenAt); hiddenAt = 0; } } }); window.addEventListener('pagehide', saveGame);

/* ---------------- init ---------------- */
async function init() {
  await loadAll(); resize();
  if (!SKIP_TITLE) { titleOn = true; document.getElementById('app').classList.add('titleMode'); }
  const restored = titleOn || ZOO ? null : loadGame();
  if (!restored) {
    let o = {}; if (!titleOn) { try { o = JSON.parse(localStorage.getItem('zhNewOpts') || '{}') || {}; localStorage.removeItem('zhNewOpts'); } catch (e) { o = {}; } } const tq = (k) => QS.get(k);   /* V2.46: chosen on the new-game screen (?start=&diff= for testing) */
    S.diff = DIFFS[tq('diff') || o.diff] ? (tq('diff') || o.diff) : 'normal'; S.mods = modList(tq('mods') ? tq('mods').split(',') : o.mods); setMap(tq('map') || o.map || 'road'); applyStart(tq('start') || o.start || 'camp'); if (o.legacy) applyLegacy();   /* 3D.112 */
    cutFence(); if ((!titleOn && !ZOO) && !QS.get('nocut')) S.cutPending = true; else { spawn(5 + OFF, 3 + OFF, 'walker'); spawn(9 + OFF, 3 + OFF, 'crawler'); spawn(12 + OFF, 4 + OFF, 'walker'); }   /* 3D.102 the broken farm fence; the opening cutscene (the zombies come after it) */
  } else { for (let i = 0; i < 3; i++) spawn(); if (restored.cam && restored.cam.z) { cam.z = restored.cam.z; cam.x = restored.cam.x; cam.y = restored.cam.y; clampCam(); } }
  if (!restored || !restored.cam) centerOn(7.5 + OFF, 10 + OFF, Math.max(.7, Math.min(1.1, VW / 430)) * ((1.25)));
  if (titleOn) { $('loading').style.display = 'none'; showTitle(); requestAnimationFrame(frame); return; }
  if (!restored) { let nm = null; try { nm = localStorage.getItem('zhNewName'); localStorage.removeItem('zhNewName'); } catch (e) { /* ignore */ } if (nm) S.townName = nm.slice(0, 22); }
  if (QS.get('shtest')) setTimeout(() => showShPractice(), 1200);   /* 3D.114 the practice page */
  if (S.cutPending) { delete S.cutPending; cutStart(); } autoStaff(); tripUpdate(); expTick(); if (S.trip && S.trip.enc) encPopup(S.trip); if (!S.mission && !S.cut) beginMission(); updateZoomLabel(); ui(); $('loading').style.display = 'none'; requestAnimationFrame(frame);
  if (GEAR) gearStart(); else if (SVT) svtStart(); else if (ZOO) zooStart();
  try { if (navigator.storage && navigator.storage.persist) navigator.storage.persisted().then((p) => p || navigator.storage.persist()).catch(() => {}); } catch (e) { /* not supported */ }   /* V2.42: ask the browser not to evict saves */
  if (loadedFrom === 'bak') note('important', '💾 LOADED THE DAY BACKUP', { log: `The latest save of this slot was damaged, so the backup from Day ${S.day} was loaded. The damaged copy was kept.` });
  if (saveBlocked === 'load') showEventPopup({ title: '💾 SAVE COULD NOT BE OPENED', text: `The town in slot ${SLOT} could not be loaded. <b>Nothing was overwritten</b>: this town will not save while you look around.<br><br>On the main screen, <b>Start → Backups</b> can export the file or import an older backup.`, buttons: [{ label: 'MAIN SCREEN', fn: () => { location.href = location.pathname; } }, { label: 'LOOK AROUND' }] });
}
