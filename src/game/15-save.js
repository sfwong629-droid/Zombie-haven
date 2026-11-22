/* ---------------- save / load / migration ---------------- */
const SKIP = new Set(['fixW', 'fixWAt', 'skipZ', 'noReach', 'fixB', 'order', 'moveTo', 'para', 'aidTo', 'aidBy', 'aidT', 'comboZ', 'comboQ', 'comboStep', 'reloadT', 'avoid', 'visits', 'stays', 'emo', 'chatWith', 'chatLines', 'chatStep', 'chatT', 'faceW', 'fire', 'helpAt', 'helpT', '_lastKills', 'lootId', '_lvT', '_ghost', '_ghostHold', 'post', 'target', 'facility', 'rescuer', 'rescuing', 'carrying', 'path', 'pathGoal', 'pathVer', 'lastFacility', 'moving', 'stuck', 'lastD', 'hideAt', 'fireAt', 'careAt', 'fixB', 'careTo', 'arrG', 'prog', 'nearT', 'talk', 'talkBy']);   /* 3D.58: fixB (a building) broke saves while someone was repairing */   /* V2.36: hideAt / fireAt are building links too: saving while someone hid in a staffed building failed silently */
function serialize() {
  S.mapOff = OFF;   /* 3D.101: this save uses the 40x42 map */
  const sv = S.sv.map((s) => { const o = {}; for (const k in s) if (!SKIP.has(k)) o[k] = s[k]; return o; });
  const { requests, sv: _sv, z: _z, sh: _sh, ...rest } = S; if (_sh && !_sh.practice) { rest.shHome = _sh.units.map((s) => { const o = {}; for (const k in s) if (!SKIP.has(k) && k !== 'target' && k !== 'shHome') o[k] = s[k]; return o; }); rest.shLeft = { dest: _sh.dest, raid: _sh.raid || null }; }   /* 3D.125: a practice squad is never saved into the town */   /* 3D.108 a squad inside a stronghold is saved as having fallen back */
  return JSON.stringify({ sid: SID, version: VERSION, S: rest, sv, roads: [...world.roads], walls: [...world.walls.values()].map((w) => [w.x, w.y, w.type, Math.round(w.hp), w.broken ? 1 : 0]), traps: [...trapMap().values()].map((t) => [t.x, t.y, t.type, t.ch]), buildings: world.buildings.map((b) => ({ type: b.type, x: b.x, y: b.y, rot: (b.rot | 0) & 3, w: b.w, h: b.h, q: b.q, a: b.a, unpaid: !!b.unpaid, fire: b.fire || 0, burnt: !!b.burnt, rushT: b.rushT || 0, rushes: b.rushes || 0, staffId: b.staff ? b.staff.id : null })), cam: { x: cam.x, y: cam.y, z: cam.z }, time: Date.now() });
}
function writeKey(key, data) { try { localStorage.setItem(key, data); return true; } catch (e) { return e || new Error('blocked'); } }
function readKey(key) { try { return localStorage.getItem(key); } catch (e) { return null; } }
/* V2.40: the title screen's background town is never saved over a slot. V2.42: failures are reported, storage-full drops this slot's day backup and retries,
   a save that could not be loaded (or was changed by another tab) is never overwritten. */
let savedAtMs = 0;
/* 3D.39 HUD layout B (owner pick): the side column is gone. Speed + find sit in one slim dock on the right; the 5th tab is "More",
   which holds the Guide and a Settings sheet (save, music, sound effects, event log, advisor tips, slow down on emergencies, how to play, main menu). */
const HUD_B = typeof document !== 'undefined' && document.documentElement.classList.contains('glass');
function showMore() {
  endBuildMode(true); closeP(); const I = (n) => (window.ZHIcons ? ZHIcons.svg(n, 30) : '');
  $('ib').innerHTML = `<button class="moreRow" id="moGuide"><span class="moI">${I('guide')}</span><span class="moT"><b>Guide</b><small>Goals, how things work, the story so far</small></span><span class="moA">›</span></button>`
    + `<button class="moreRow" id="moJobs"><span class="moI">${I('worker')}</span><span class="moT"><b>Jobs</b><small>${(() => { const e = slotBs().filter((b) => !b.staff).length; return e ? e + ' empty workplace' + (e > 1 ? 's' : '') + ' · promotions' : 'Who works where, promotions'; })()}</small></span><span class="moA">›</span></button>`
    + `<button class="moreRow" id="moLog"><span class="moI">📜</span><span class="moT"><b>Event log</b><small>Every message, news line and radio call, including the ones you missed</small></span><span class="moA">›</span></button>`
    + `<button class="moreRow" id="moSet"><span class="moI">${I('parts')}</span><span class="moT"><b>Settings</b><small>Save, sound, event log, tips, main menu</small></span><span class="moA">›</span></button>`;
  $('moGuide').onclick = () => { showGuide(); panelBack = showMore; $('pBack').style.display = 'block'; }; $('moSet').onclick = () => showSettings(showMore); $('moJobs').onclick = () => showJobs(showMore); $('moLog').onclick = () => { showLog(); panelBack = showMore; $('pBack').style.display = 'block'; };
  showPanel('MORE');
}
const DAYMUS = { meadow: ['Meadow', 'A storybook waltz: flute over harp and strings'], morning: ['Morning Road', 'A walking tune: guitar and flute'], fair: ['Village Fair', 'Accordion over plucked strings'], rain: ['Rain on the Roof', 'Slow piano, then cello'], harvest: ['Harvest Song', 'Oboe and harp, rolling'], mix: ['Mix', 'A different tune each day'], slow: ['Slow mix', 'Only Meadow and Rain on the Roof'] };   /* Music chat: the Ghibli day tunes (owner-approved, 18 Nov) */
function showSettings(back) {
  endBuildMode(true); closeP(); const m = window.SND ? SND.mode : 'off', ago = savedAtMs ? Math.round((Date.now() - savedAtMs) / 60000) : -1;
  const tg = (id, on, label, sub) => `<div class="setRow"><span class="moT"><b>${label}</b>${sub ? `<small>${sub}</small>` : ''}</span><button class="tgl${on ? ' on' : ''}" id="${id}" role="switch" aria-checked="${on}" aria-label="${label}"></button></div>`;
  $('ib').innerHTML = `<div class="setRow"><span class="moT"><b>Save game</b><small>${ago < 0 ? 'Saves on its own as you play' : ago === 0 ? 'Saved just now' : `Saved ${ago} min ago`}</small></span><button class="act go" id="stSave">Save</button></div>`
    + tg('stMusic', m === 'all', 'Music') + (window.SND && SND.setDayMusic ? `<div class="setRow"><span class="moT"><b>Day music</b><small>${DAYMUS[SND.dayMusic] ? DAYMUS[SND.dayMusic][1] : ''}</small></span><button class="act" id="stDayMus">${DAYMUS[SND.dayMusic] ? DAYMUS[SND.dayMusic][0] : 'Mix'}</button></div>` : '') + tg('stSfx', m !== 'off', 'Sound effects')
    + `<button class="setRow link" id="stLog"><span class="moT"><b>Event log</b></span><span class="moA">›</span></button>`
    + tg('stSwear', OPTS.swear !== false, 'Swearing in chat', 'Off shows it as f**k') + tg('stAdv', OPTS.advisor, 'Advisor tips') + tg('stSlow', OPTS.autoSlow, 'Slow down on emergencies', 'Drops to 1× speed when something bad happens')
    + ($('btnInk') ? tg('stInk', $('btnInk').style.opacity !== '.45', 'Ink outlines', 'Dark outlines around people and zombies') : '')
    + (window.ZH3D && ZH3D.trackPanel ? tg('stTrack', !!(ZH3D.track && ZH3D.track.on), 'Animation tracker', 'Shows what each survivor is doing and flags sliding. Tap Copy log and paste it to me') : '')
    + `<button class="setRow link" id="stHow"><span class="moT"><b>How to play</b></span><span class="moA">›</span></button>`
    + `<div class="sm" style="margin-top:10px;opacity:.7">Music: instrument samples from the FluidR3 GM sound font by Frank Wen (CC BY 3.0); percussion from the Versilian Community Sample Library (CC0).</div>`
    + `<div class="setFoot"><button class="act" id="stMenu">Main menu</button><button class="act go" id="stResume">Resume</button></div>`;
  const re = () => showSettings(back), snd = (mode) => { if (!window.SND) return; SND.unlock(); SND.setMode(mode); re(); };
  $('stSave').onclick = () => { if (saveGame()) { banner('💾 SAVED'); re(); } else say(saveBlocked ? 'This tab is not saving (see the alert).' : 'Saving failed: see the alert.'); };
  if ($('stDayMus')) $('stDayMus').onclick = () => { const k = Object.keys(DAYMUS), n = k[(k.indexOf(SND.dayMusic) + 1) % k.length]; SND.setDayMusic(n); SND.unlock(); re(); };
  $('ib').querySelectorAll('.setRow').forEach((r) => { const t = r.querySelector('.tgl'); if (t) { r.style.cursor = 'pointer'; r.onclick = (e) => { if (!e.target.closest('.tgl')) t.click(); }; } });   /* 3D.268 (W202, U48): tapping a setting's words flips its switch */
  $('stMusic').onclick = () => snd(m === 'all' ? 'sfx' : 'all'); $('stSfx').onclick = () => snd(m === 'off' ? 'sfx' : 'off');
  $('stLog').onclick = () => { showLog(); panelBack = re; $('pBack').style.display = 'block'; };
  $('stSwear').onclick = () => { OPTS.swear = OPTS.swear === false; saveOpts(); re(); };
  $('stAdv').onclick = () => { OPTS.advisor = !OPTS.advisor; saveOpts(); advisorUpdate(); re(); }; $('stSlow').onclick = () => { OPTS.autoSlow = !OPTS.autoSlow; saveOpts(); re(); };
  if ($('stInk')) $('stInk').onclick = () => { $('btnInk').click(); re(); };
  if ($('stTrack')) $('stTrack').onclick = () => { ZH3D.trackPanel(!ZH3D.track.on); re(); };   /* 3D.58 */
  $('stHow').onclick = () => { showGuide(); panelBack = re; $('pBack').style.display = 'block'; };
  $('stMenu').onclick = () => { closeP(); if (!titleOn) backToTitle(); }; $('stResume').onclick = closeP;
  showPanel('SETTINGS', back);
}
function saveGame() {
  if (ZOO) return;   /* 3D.32 the test page never touches your saves */
  if (titleOn || saveBlocked) return false;
  if (S.cut) return false;   /* 3D.102 never save half-way through the opening cutscene (the camp is not up yet) */
  S.savedAt = Date.now(); let data; try { data = serialize(); } catch (e) { saveFail('the town could not be packed (' + e.message + ')'); return false; }
  let r = writeKey(SAVE_KEY, data);
  if (r !== true) { try { localStorage.removeItem(BAK(SAVE_KEY)); localStorage.removeItem(BAD(SAVE_KEY)); } catch (e) { /* ignore */ } r = writeKey(SAVE_KEY, data); }
  if (r !== true) { saveFail(/quota/i.test(r.name + r.message) ? 'the browser storage is full' : 'the browser blocked storage (private browsing?)'); return false; }
  if (saveErr) { saveErr = ''; renderAlerts(); }
  S.lastSave = tick; savedAtMs = Date.now(); S.savedAt = savedAtMs; if (S.bakDay !== S.day && writeKey(BAK(SAVE_KEY), data) === true) S.bakDay = S.day;   /* first save of each day becomes the backup */
  return true;
}
function saveFail(why) { const first = !saveErr; saveErr = why; if (first) note('critical', `Saving failed: ${why}`, { key: 'savefail', icon: '💾', live: () => !!saveErr, dyn: () => `Saving failed: ${saveErr}. Export a backup now.`, acts: [{ label: 'Backup', fn: () => showBackup() }] }); }
function blockSaves(kind) {
  if (saveBlocked) return; saveBlocked = kind;
  if (kind === 'tab') note('critical', 'This town was opened in another tab: this tab stopped saving', { key: 'savetab', icon: '💾', live: () => saveBlocked === 'tab', acts: [{ label: 'Reload', fn: () => location.reload() }] });
}
window.addEventListener('storage', (e) => {   /* another tab wrote (or deleted) this slot: stop saving here so the two never overwrite each other */
  if (titleOn || saveBlocked || e.key !== SAVE_KEY) return; const m = e.newValue && /^\{"sid":"(\w+)"/.exec(e.newValue); if (m && m[1] === SID) return; blockSaves('tab');
});
const OLD_JOB = { Paramedic: 'Medic', SWAT: 'Police Officer' };   /* 3D.77: the Mechanic is back */   /* 3D.67: retired professions in old saves */
function relinkSurvivor(s) {
  if (OLD_JOB[s.job]) { s.job = OLD_JOB[s.job]; }
  if (!s.last) s.last = pickLast();   /* V3D.17 */
  if ((s.eq) && s.eq.weapon === 'pipe') s.eq.weapon = null;   /* V3D.15: the old default pipe goes; equipment is shown only when given */
  if (!s.st) s.st = rollStats(s.job, s.l); if (!s.tp) s.tp = {}; if (!s.eq) { const nm = s.weapon && s.weapon[0], id = Object.keys(ITEMS).find((k) => ITEMS[k].name === nm) || 'pipe'; s.eq = { weapon: id, armor: null, acc: null }; } delete s.weapon;   /* V2.14 save upgrade: stats + gear slots */
  if (!s.cls) { s.cls = { [s.job]: { l: s.l || 1, xp: s.mastery || 0 } }; } if (!s.skills) s.skills = []; learnSkills(s, true); syncClass(s); { const m = baseMax(s); if (m > s.max) { if (s.hp > 0) s.hp += m - s.max; s.max = m; } }   /* 3D.259 bug B19: someone down (0 health) stays down when the town is loaded */   /* V2.12 save upgrade: class levels + earned skills */
  if (!TRAITS[s.trait]) { s.trait = rollTrait(s); const m = baseMax(s); if (m > s.max) { s.hp += m - s.max; s.max = m; } }   /* V2.43 save upgrade: everyone gets a personality */
  s.post = null; s.target = s.facility = s.rescuer = s.rescuing = s.carrying = null; s.path = null; s.moving = false; s.why = s.why || 'Back from a break'; s.purpose = null; s.idleBubble = '';
  if (s.hp <= 0) s.mode = 'down'; else if (!['free', 'wait', 'down', 'hospital', 'postCombat'].includes(s.mode)) { s.mode = 'free'; s.stateTicks = 80; s.activity = null; s.dest = null; }
  if (s.haul) { S[s.haul.r] = (S[s.haul.r] || 0) + s.haul.n; s.haul = null; } s.carriedLoot = null; s.carryAmt = 0; s.gjob = null; s.hammerJob = null; s.gatherAt = null;   /* V3D.23 */
  if (s.mode === 'postCombat') { s.mode = 'free'; s.stateTicks = 40; } if (!s.id) s.id = ++S.seq;
}
/* V2.42: try the slot, then its day backup; only a slot with no save at all falls back to the pre-V2.6 keys. A save that fails to load is copied aside and the slot is
   locked against autosave, so a bug or a damaged file can never be replaced by a fresh town. */
const S_INIT = JSON.stringify(S), ROADS_INIT = [...world.roads];
function resetState() { for (const k of Object.keys(S)) delete S[k]; Object.assign(S, JSON.parse(S_INIT)); world.roads = new Set(ROADS_INIT); world.buildings = []; world.walls = new Map(); world.traps = new Map(); Wd.setTerritory(0); Wd.bump(world); }
function loadGame() {
  const tries = [[SAVE_KEY, 'main'], [BAK(SAVE_KEY), 'bak']]; /* V3D.22: no carry-over from the scrap-only saves */
  let had = false, failedMain = null;
  for (const [key, kind] of tries) {
    const raw = readKey(key); if (!raw) continue; if ((kind === 'prev' || kind === 'legacy') && had) break; had = true;
    const d = applySave(raw, kind === 'legacy', kind === 'prev'); if (d) { loadedFrom = kind; if (kind === 'bak' && failedMain) writeKey(BAD(SAVE_KEY), failedMain); return d; }
    if (kind === 'main') failedMain = raw; resetState();
  }
  if (had) { if (failedMain) writeKey(BAD(SAVE_KEY), failedMain); blockSaves('load'); }
  return false;
}
function validSave(d, legacy) { return !!(d && typeof d.S === 'object' && d.S && (legacy || (Array.isArray(d.sv) && Array.isArray(d.buildings || [])))); }
/* 3D.101: a save from before the map grew: move everything OFF tiles east and south (every {x, y} point, "x,y" keys, road, wall and
   trap rows); the camera recentres. */
function shiftSave(d) {
  const sk = (k) => (/^-?\d+,-?\d+$/.test(k) ? k.split(',').map((v) => +v + OFF).join(',') : k);
  const walk = (o) => { if (!o || typeof o !== 'object') return; if (Array.isArray(o)) { o.forEach(walk); return; } if (typeof o.x === 'number' && typeof o.y === 'number') { o.x += OFF; o.y += OFF; } for (const [k, v] of Object.entries(o)) if (k !== 'cam') walk(v); };
  walk(d.S); walk(d.sv); walk(d.buildings);
  if (d.S.nodes) d.S.nodes = Object.fromEntries(Object.entries(d.S.nodes).map(([k, v]) => [sk(k), v]));
  d.roads = (d.roads || []).map((r) => (Array.isArray(r) ? [r[0] + OFF, r[1] + OFF] : sk(r)));
  d.walls = (d.walls || []).map((w) => [w[0] + OFF, w[1] + OFF, ...w.slice(2)]); d.traps = (d.traps || []).map((t) => [t[0] + OFF, t[1] + OFF, ...t.slice(2)]);
  delete d.cam; delete d.S.cam; d.S.mapOff = OFF;
}
function applySave(raw, legacy, prev) {
  try {
    const d = JSON.parse(raw); if (!validSave(d, legacy)) return false;
    if (!legacy && d.S && !d.S.mapOff) shiftSave(d);
    if (legacy) {   // V2.4 saves stored positions in screen-ish pixels (TW≈42, TH≈0.4TW); convert to tile units and clamp. Buildings were already tile based.
      Object.assign(S, d.S); S.sv = (d.S.sv || []).map((s) => { const a = (s.w?.x || 0) / 21, b = (s.w?.y || 0) / 8.4; const x = Math.max(0.5, Math.min(COLS - .5, (a + b) / 2)), y = Math.max(0.5, Math.min(ROWS - .5, (b - a) / 2)); return { ...s, w: { x, y }, weapon: s.weapon || weapons[0], path: null }; });
      d.buildings = (d.S.b || []).map((b) => ({ ...b })); d.roads = null; delete S.b;
    } else { Object.assign(S, d.S); S.sv = d.sv || []; }
    if (legacy || prev) {   // V2.5 / V2.4 -> V2.6: money no longer exists. Leftover money becomes scrap (capped), income becomes supplies produced, missions reset.
      const m = Number(d.S.money) || 0; S.mat = (Number(S.mat) || 0) + Math.min(40, Math.floor(m / 60)); S.produced = Math.floor((Number(d.S.earned) || 0) / 10);
      delete S.med; S.food = Number(S.food) || 0; S.water = Number(S.water) || 0; S.mission = null; S.missionStart = { kills: S.kills || 0, produced: S.produced, built: S.builtCount || 0 };
      delete S.money; delete S.earned; S.sv.forEach((q) => { delete q.money; });
    }
    if (S.produced === undefined) S.produced = 0; delete S.med;
    if (d.roads) world.roads = new Set(d.roads.map((r) => (Array.isArray(r) ? r.join(',') : r))); world.buildings = (d.buildings || []).filter((b) => DEFS[b.type]).map((b) => ({ type: b.type, x: b.x, y: b.y, rot: (b.rot | 0) & 3, w: b.rot ? DEFS[b.type].h : DEFS[b.type].w, h: b.rot ? DEFS[b.type].w : DEFS[b.type].h, q: b.q ?? DEFS[b.type].q, a: b.a ?? DEFS[b.type].a, unpaid: !!b.unpaid, fire: b.fire || 0, burnt: !!b.burnt, rushT: b.rushT || 0, rushes: b.rushes || 0, staff: null, _staffId: b.staffId || null }));
    world.traps = new Map(); for (const [x, y, type, ch] of (d.traps || [])) if (TRAP_DEFS[type]) world.traps.set(x + ',' + y, { x, y, type, ch: Math.max(0, Math.min(TRAP_DEFS[type].ch, ch | 0)) });
    world.walls = new Map(); for (const [x, y, type, hp, br] of (d.walls || [])) { const def = Wd.WALL_DEFS[type]; if (def) { const mx = Math.round(def.hp * (researched('walls') ? 1.3 : 1)); world.walls.set(x + ',' + y, { x, y, type, hp: Math.max(0, Math.min(mx, hp)), max: mx, broken: !!br || hp <= 0 }); } }
    if ((S.trip) && S.trip.t0 > 1e11) { const t = S.trip; t.t0 = expNow() - Math.min(t.stage, 2) / 3 * EXP_HOURS[t.risk] * EXP_HMS; t.dur = EXP_HOURS[t.risk] * EXP_HMS; if (t.phase === 'back') { t.backFrom = expNow(); t.backPos = .5; t.backAt = expNow() + .5 * EXP_HMS; } }   /* V3D.18: old real-time trip → game time */
    if (!isFinite(S.ren)) S.ren = 20 * (S.lvl || 1);   /* 3D.110 repair saves hit by the NaN renown bug */
    clearDoorways();   /* 3D.120 saves where a fence blocks a doorway */
    if (S.shHome) { for (const m of S.shHome) { m.w = tc(7 + OFF, 10 + OFF); m.mode = 'free'; m.hp = Math.max(1, Math.round((m.hp || 1) * .5)); m.target = null; S.sv.push(m); }   /* 3D.125 review bug 3: leaving mid-fight is a rout, not a free escape: they come home hurt, with nothing, and the place is on guard */
      const L = S.shLeft; if (L && L.raid) { const F = fac(L.raid); F.att = Math.max(-100, (F.att || 0) - 15); F.raidUntil = S.day + 4; } else if (L) S.shTryDay = { ...(S.shTryDay || {}), [L.dest]: S.day };
      setTimeout(() => say('Left without orders, the squad broke and ran home hurt. Whatever they carried was lost.'), 1500); delete S.shHome; delete S.shLeft; }   /* 3D.108 */
    S.z = []; S.requests = []; setMap(S.map); S.sv.forEach(relinkSurvivor); if (S.ammo === undefined) S.ammo = 24; S.terr = S.terr || 0; if (!S.lvl) S.lvl = 1 + 3 * Math.max(0, (S.rank || 1) - 1); S.banners = S.banners || []; S.terr = Math.max(S.terr, terrOfLvl(S.lvl)); Wd.setTerritory(S.terr);   /* 3D.104 old saves: each old star = 3 levels */ S.inv = S.inv || {}; for (const w of (S.spare || [])) { const id = Object.keys(ITEMS).find((k) => ITEMS[k].name === (w && w[0])); if (id && id !== 'pipe') stashAdd(id); } S.spare = []; if (S.nextRaid === undefined) S.nextRaid = S.day + 1.6; if (S.nextBoss === undefined) S.nextBoss = Math.max(3, Math.ceil(S.day / 3) * 3); S.pets = S.pets || []; S.posts = (S.posts || []).filter((p) => p && Number.isFinite(p.x) && Number.isFinite(p.y)); S.log = S.log || []; S.kids = S.kids || []; if (S.nextTrader === undefined) S.nextTrader = S.day + 1; if (S.trader) { S.trader.path = null; S.trader.ex = S.trader.ex || [0, 0, 0, 0]; } if (S.trip) S.trip.members.forEach((m) => { if (!TRAITS[m.trait]) m.trait = rollTrait(m); });
    for (const b of world.buildings) { if (b._staffId) { const q = S.sv.find((x) => x.id === b._staffId); if (q) { b.staff = q; q.post = b; } } delete b._staffId; }
    genRun = S.power ? gens() : []; powerGrid();   /* audit: power after staff are relinked */
    for (const q of S.sv) if (q.ammo == null && usesAmmo(itemOf(q, 'weapon'))) { q.ammo = 0; reloadGun(q); }   /* audit: guns from older saves load from the stock, not a free magazine */
    Wd.bump(world); guideSkipDone(); alerts.clear(); setTimeout(restoreAlerts, 0); { const away = S.savedAt ? Date.now() - S.savedAt : 0; if (away > 0) setTimeout(() => awayCredit(away), 1200); } return d;
  } catch (e) { console.warn('load failed', e); return false; }
}

