/* ---------------- save / load / migration ---------------- */
const SKIP = new Set(['fixW', 'fixWAt', 'skipZ', 'noReach', 'fixB', 'order', 'moveTo', 'para', 'aidTo', 'aidBy', 'aidT', 'comboZ', 'comboQ', 'comboStep', 'reloadT', 'avoid', 'visits', 'stays', 'emo', 'chatWith', 'chatLines', 'chatStep', 'chatT', 'faceW', 'fire', 'helpAt', 'helpT', '_lastKills', 'lootId', '_lvT', '_ghost', '_ghostHold', 'post', 'target', 'facility', 'rescuer', 'rescuing', 'carrying', 'path', 'pathGoal', 'pathVer', 'lastFacility', 'moving', 'stuck', 'lastD', 'hideAt', 'fireAt', 'careAt', 'fixB', 'careTo', 'arrG', 'prog', 'nearT', 'talk', 'talkBy']);   /* 3D.58: fixB (a building) broke saves while someone was repairing */   /* V2.36: hideAt / fireAt are building links too: saving while someone hid in a staffed building failed silently */
function serialize() {
  S.mapOff = OFF;   /* 3D.101: this save uses the 40x42 map */
  const sv = S.sv.map((s) => { const o = {}; for (const k in s) if (!SKIP.has(k)) o[k] = s[k]; return o; });
  if (S.sh) shMemSave(S.sh);   /* 3D.302 a game saved with a squad inside keeps what they have done there */
  const { requests, sv: _sv, z: _z, sh: _sh, ...rest } = S; if (rest.truck && rest.truck.medics) rest.truck = { ...rest.truck, medics: rest.truck.medics.map(({ carrying, target, path, pathGoal, pathVer, arrG, ...m }) => m) };   /* 3D.306: a medic is saved without its links to people (it finds its patient again by carryId) */ if (_sh && !_sh.practice) { rest.shHome = _sh.units.filter((s) => !s.ally).map((s) => { const o = {}; for (const k in s) if (!SKIP.has(k) && k !== 'target' && k !== 'shHome') o[k] = s[k]; return o; }); rest.shLeft = { dest: _sh.dest, raid: _sh.raid || null }; }   /* 3D.125: a practice squad is never saved into the town */   /* 3D.108 a squad inside a stronghold is saved as having fallen back */
  return JSON.stringify({ sid: SID, version: VERSION, S: rest, sv, roads: [...world.roads], walls: [...world.walls.values()].map((w) => [w.x, w.y, w.type, Math.round(w.hp), w.broken ? 1 : 0]), edges: edgesSave(), traps: [...trapMap().values()].map((t) => [t.x, t.y, t.type, t.ch]), buildings: world.buildings.map((b) => ({ type: b.type, x: b.x, y: b.y, rot: (b.rot | 0) & 3, w: b.w, h: b.h, q: b.q, a: b.a, unpaid: !!b.unpaid, fire: b.fire || 0, burnt: !!b.burnt, rushT: b.rushT || 0, rushes: b.rushes || 0, staffId: b.staff ? b.staff.id : null })), cam: { x: cam.x, y: cam.y, z: cam.z }, time: Date.now() });
}
function writeKey(key, data) { try { localStorage.setItem(key, data); return true; } catch (e) { return e || new Error('blocked'); } }
function readKey(key) { try { return localStorage.getItem(key); } catch (e) { return null; } }
/* V2.40: the title screen's background town is never saved over a slot. V2.42: failures are reported, storage-full drops this slot's day backup and retries,
   a save that could not be loaded (or was changed by another tab) is never overwritten. */
let savedAtMs = 0;
/* 3D.39 HUD layout B (owner pick): the side column is gone. Speed + find sit in one slim dock on the right; the 5th tab is "More",
   which holds the Guide and a Settings sheet (save, music, sound effects, event log, advisor tips, slow down on emergencies, how to play, main menu). */
const HUD_B = typeof document !== 'undefined' && document.documentElement.classList.contains('glass');
/* 3D.343 (owner, 24 Nov, W249: "ok next"): More and Settings in the phone look: grouped lists, a small coloured square with a plain white sign on each row,
   switches on the right, chevrons on rows that open something. Same ids as the old lists, so the same wiring serves both looks. */
const PH_SG = { radio: '<rect x="3" y="9" width="18" height="11" rx="2"/><path d="M7 9 17 4"/><circle cx="15" cy="14.500" r="2.500"/><path d="M6 13h4M6 16h4"/>', music: '<path d="M9 18V6l10-2v12"/><circle cx="6.500" cy="18" r="2.500"/><circle cx="16.500" cy="16" r="2.500"/>', tune: '<path d="M4 7h10M18 7h2M4 17h4M12 17h8"/><circle cx="16" cy="7" r="2"/><circle cx="10" cy="17" r="2"/>', sfx: '<path d="M4 10v4h3l5 4V6l-5 4z"/><path d="M16 9a4 4 0 0 1 0 6M18.500 6.500a7.500 7.500 0 0 1 0 11"/>', chat: '<path d="M5 6h14v10H10l-4 3v-3H5z"/>', tips: '<path d="M9 18h6M10 21h4M12 3a6 6 0 0 0-3.500 10.900V15h7v-1.100A6 6 0 0 0 12 3z"/>', slow: '<path d="M5 6l6 6-6 6zM13 6l6 6-6 6z"/>', face: '<circle cx="12" cy="9" r="3.500"/><path d="M5 20a7 7 0 0 1 14 0"/>', phone: '<rect x="7" y="3" width="10" height="18" rx="2.500"/><path d="M11 18h2"/>', ink: '<path d="M4 20l4-1 10-10-3-3L5 16z"/>', moon: '<path d="M19 14.500A7.500 7.500 0 0 1 9.500 5a7.500 7.500 0 1 0 9.500 9.500z"/>', track: '<path d="M3 12h4l2-6 4 12 2-6h6"/>', save: '<path d="M5 4h11l3 3v13H5z"/><path d="M8 4v5h7V4M8 20v-6h8v6"/>', log: '<path d="M7 3h10v18H7zM10 8h4M10 12h4M10 16h2"/>', help: '<circle cx="12" cy="12" r="8.500"/><path d="M9.700 9.500a2.400 2.400 0 1 1 3.400 2.200c-.800.400-1.100.900-1.100 1.800M12 16.800v.1"/>', home: '<path d="M4 11l8-7 8 7M6 10v10h12V10"/>', guide: '<path d="M5 5h6a2 2 0 0 1 2 2v12a2 2 0 0 0-2-2H5zM19 5h-4a2 2 0 0 0-2 2"/><path d="M19 5v12h-4a2 2 0 0 0-2 2"/>', jobs: '<rect x="3.500" y="7.500" width="17" height="12" rx="2.500"/><path d="M9 7.500V5.500a1.500 1.500 0 0 1 1.500-1.500h3A1.500 1.500 0 0 1 15 5.500v2"/>', gear: '<circle cx="12" cy="12" r="3"/><path d="M12 3v3M12 18v3M3 12h3M18 12h3M5.600 5.600l2.100 2.100M16.300 16.300l2.100 2.100M5.600 18.400l2.100-2.100M16.300 7.700l2.100-2.100"/>' };
const phSI = (k, col) => `<span class="phIc" style="background:${col}"><svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="#fff" stroke-width="1.900" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${PH_SG[k]}</svg></span>`;
function showMorePhone() {
  endBuildMode(true); closeP(); const ch = `<i class="phChv">${phG('ch', 14)}</i>`, e = slotBs().filter((b) => !b.staff).length;
  const row = (id, ic, col, t, sub) => `<div class="phR tall" id="${id}" role="button">${phSI(ic, col)}<span class="tx"><b>${t}</b><small>${sub}</small></span>${ch}</div>`;
  $('ib').innerHTML = `<div class="phSet"><div class="phCard">${row('moGuide', 'guide', '#3d8fe0', 'Guide', 'Goals, how things work, the story so far')}${row('moJobs', 'jobs', '#e08a2e', 'Jobs', e ? e + ' empty workplace' + (e > 1 ? 's' : '') + ' · promotions' : 'Who works where, promotions')}${row('moFm', 'radio', '#e0a43d', 'Moth FM', 'The radio, and every broadcast so far')}${row('moLog', 'log', '#6b7686', 'Event log', 'Every message, news line and radio call')}${row('moSet', 'gear', '#8d6fe0', 'Settings', 'Save, sound, look, main menu')}</div></div>`;
  $('moGuide').onclick = () => { showGuide(); panelBack = showMore; $('pBack').style.display = 'block'; }; $('moFm').onclick = () => showFM(null, showMore); $('moSet').onclick = () => showSettings(showMore); $('moJobs').onclick = () => showJobs(showMore); $('moLog').onclick = () => { showLog(); panelBack = showMore; $('pBack').style.display = 'block'; };
  showPanel('More');
}
function showMore() {
  if (phoneOn()) return showMorePhone();
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
  if (phoneOn()) {
    const ch = `<i class="phChv">${phG('ch', 14)}</i>`, sec = (t) => `<div class="phSec">${t}</div>`, grp = (x) => `<div class="phCard">${x}</div>`;
    const sw = (id, on, ic, col, label, sub) => `<div class="phR${sub ? ' tall' : ''}">${phSI(ic, col)}<span class="tx"><b>${label}</b>${sub ? `<small>${sub}</small>` : ''}</span><button class="tgl${on ? ' on' : ''}" id="${id}" role="switch" aria-checked="${on}" aria-label="${label}"></button></div>`;
    const go = (id, ic, col, label, val) => `<div class="phR" id="${id}" role="button">${phSI(ic, col)}<span class="k">${label}</span><span class="v">${val || ''}</span>${ch}</div>`;
    $('ib').innerHTML = `<div class="phSet">`
      + grp(`<div class="phR tall">${phSI('save', '#3fae7c')}<span class="tx"><b>Save game</b><small>${ago < 0 ? 'Saves on its own as you play' : ago === 0 ? 'Saved just now' : `Saved ${ago} min ago`}</small></span><button class="act go phMini" id="stSave">Save</button></div>`)
      + sec('Sound') + grp(sw('stMusic', m === 'all', 'music', '#e0457b', 'Music') + (window.SND && SND.setDayMusic ? `<div class="phR tall" id="stDayMus" role="button">${phSI('tune', '#b0508f')}<span class="tx"><b>Day music</b><small>${DAYMUS[SND.dayMusic] ? DAYMUS[SND.dayMusic][1] : ''}</small></span><span class="v">${DAYMUS[SND.dayMusic] ? DAYMUS[SND.dayMusic][0] : 'Mix'}</span>${ch}</div>` : '') + sw('stSfx', m !== 'off', 'sfx', '#e0683a', 'Sound effects'))
      + sec('Game') + grp(sw('stSwear', OPTS.swear !== false, 'chat', '#8d6fe0', 'Swearing in chat', 'Off shows it as f**k') + sw('stAdv', OPTS.advisor, 'tips', '#e0a52e', 'Advisor tips') + sw('stSlow', OPTS.autoSlow, 'slow', '#3d8fe0', 'Slow down on emergencies', 'Drops to 1× speed when something bad happens'))
      + sec('Look') + grp(sw('stPics', OPTS.pics !== false, 'face', '#2fa5a0', 'Survivor pictures', 'Off shows the first letter of their name') + sw('stLook', true, 'phone', '#6b7686', 'Phone look', 'Off shows the old look')
        + sw('stLights', OPTS.nightLights, 'moon', '#4a5bb0', 'Night lights', 'Off runs faster on older phones')
        + ($('btnInk') ? sw('stInk', $('btnInk').style.opacity !== '.45', 'ink', '#5a6a3a', 'Ink outlines', 'Dark outlines around people and zombies') : '') + (window.ZH3D && ZH3D.trackPanel ? sw('stTrack', !!(ZH3D.track && ZH3D.track.on), 'track', '#a0564a', 'Animation tracker', 'Shows what each survivor is doing and flags sliding') : ''))
      + sec('Help') + grp(go('stLog', 'log', '#6b7686', 'Event log') + go('stHow', 'help', '#3d8fe0', 'How to play') + go('stMenu', 'home', '#6b7686', 'Main menu'))
      + `<div class="phFootN">Music: instrument samples from the FluidR3 GM sound font by Frank Wen (CC BY 3.0); percussion from the Versilian Community Sample Library (CC0). A woman's hurt voice: "Female Gruntwork - 1" by PlumpDev (CC BY-SA 4.0). Other recorded sounds: CC0.</div><button class="act go phWide" id="stResume">Resume</button></div>`;
  } else
  $('ib').innerHTML = `<div class="setRow"><span class="moT"><b>Save game</b><small>${ago < 0 ? 'Saves on its own as you play' : ago === 0 ? 'Saved just now' : `Saved ${ago} min ago`}</small></span><button class="act go" id="stSave">Save</button></div>`
    + tg('stMusic', m === 'all', 'Music') + (window.SND && SND.setDayMusic ? `<div class="setRow"><span class="moT"><b>Day music</b><small>${DAYMUS[SND.dayMusic] ? DAYMUS[SND.dayMusic][1] : ''}</small></span><button class="act" id="stDayMus">${DAYMUS[SND.dayMusic] ? DAYMUS[SND.dayMusic][0] : 'Mix'}</button></div>` : '') + tg('stSfx', m !== 'off', 'Sound effects')
    + `<button class="setRow link" id="stLog"><span class="moT"><b>Event log</b></span><span class="moA">›</span></button>`
    + tg('stSwear', OPTS.swear !== false, 'Swearing in chat', 'Off shows it as f**k') + tg('stAdv', OPTS.advisor, 'Advisor tips') + tg('stSlow', OPTS.autoSlow, 'Slow down on emergencies', 'Drops to 1× speed when something bad happens')
    + (OPTS.look !== 'glass' ? tg('stPics', OPTS.pics !== false, 'Survivor pictures', 'Show each person\'s picture in lists. Off shows the first letter of their name') : '')
    + tg('stLook', OPTS.look !== 'glass', 'Phone look', 'The new look, built screen by screen. So far: the town screen. Off shows the old look')
    + ($('btnInk') ? tg('stInk', $('btnInk').style.opacity !== '.45', 'Ink outlines', 'Dark outlines around people and zombies') : '')
    + (window.ZH3D && ZH3D.trackPanel ? tg('stTrack', !!(ZH3D.track && ZH3D.track.on), 'Animation tracker', 'Shows what each survivor is doing and flags sliding. Tap Copy log and paste it to me') : '')
    + `<button class="setRow link" id="stHow"><span class="moT"><b>How to play</b></span><span class="moA">›</span></button>`
    + `<div class="sm" style="margin-top:10px;opacity:.7">Music: instrument samples from the FluidR3 GM sound font by Frank Wen (CC BY 3.0); percussion from the Versilian Community Sample Library (CC0). A woman's hurt voice: "Female Gruntwork - 1" by PlumpDev (CC BY-SA 4.0). Other recorded sounds: CC0.</div>`
    + `<div class="setFoot"><button class="act" id="stMenu">Main menu</button><button class="act go" id="stResume">Resume</button></div>`;
  const re = () => showSettings(back), snd = (mode) => { if (!window.SND) return; SND.unlock(); SND.setMode(mode); re(); };
  $('stSave').onclick = () => { if (saveGame()) { banner('💾 SAVED'); re(); } else say(saveBlocked ? 'This tab is not saving (see the alert).' : 'Saving failed: see the alert.'); };
  if ($('stDayMus')) $('stDayMus').onclick = () => { const k = Object.keys(DAYMUS), n = k[(k.indexOf(SND.dayMusic) + 1) % k.length]; SND.setDayMusic(n); SND.unlock(); re(); };
  $('ib').querySelectorAll('.setRow, .phSet .phR').forEach((r) => { const t = r.querySelector('.tgl'); if (t) { r.style.cursor = 'pointer'; r.onclick = (e) => { if (!e.target.closest('.tgl')) t.click(); }; } });   /* 3D.268 (W202, U48): tapping a setting's words flips its switch */
  $('stMusic').onclick = () => snd(m === 'all' ? 'sfx' : 'all'); $('stSfx').onclick = () => snd(m === 'off' ? 'sfx' : 'off');
  $('stLog').onclick = () => { showLog(); panelBack = re; $('pBack').style.display = 'block'; };
  $('stSwear').onclick = () => { OPTS.swear = OPTS.swear === false; saveOpts(); re(); };
  $('stAdv').onclick = () => { OPTS.advisor = !OPTS.advisor; saveOpts(); advisorUpdate(); re(); }; $('stSlow').onclick = () => { OPTS.autoSlow = !OPTS.autoSlow; saveOpts(); re(); };
  if ($('stPics')) $('stPics').onclick = () => { OPTS.pics = OPTS.pics === false; saveOpts(); re(); };   /* 3D.335 */
  $('stLook').onclick = () => { OPTS.look = OPTS.look !== 'glass' ? 'glass' : 'phone'; saveOpts(); applyLook(); re(); };   /* 3D.317; on by default from 3D.333 */
  if ($('stLights')) $('stLights').onclick = () => { OPTS.nightLights = !OPTS.nightLights; saveOpts(); re(); };   /* 3D.368: moved here from the Event log */
  if ($('stInk')) $('stInk').onclick = () => { $('btnInk').click(); re(); };
  if ($('stTrack')) $('stTrack').onclick = () => { ZH3D.trackPanel(!ZH3D.track.on); re(); };   /* 3D.58 */
  $('stHow').onclick = () => { showGuide(); panelBack = re; $('pBack').style.display = 'block'; };
  $('stMenu').onclick = () => { closeP(); if (!titleOn) backToTitle(); }; $('stResume').onclick = closeP;
  showPanel(phoneOn() ? 'Settings' : 'SETTINGS', back);
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
function resetState() { for (const k of Object.keys(S)) delete S[k]; Object.assign(S, JSON.parse(S_INIT)); world.roads = new Set(ROADS_INIT); world.buildings = []; world.walls = new Map(); world.edges = new Map(); world.traps = new Map(); Wd.setTerritory(0); if (EDGE_Q) S.edgeWalls = true; Wd.bump(world); }
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
  d.walls = (d.walls || []).map((w) => [w[0] + OFF, w[1] + OFF, ...w.slice(2)]); d.edges = (d.edges || []).map((e) => [e[0] + OFF, e[1] + OFF, ...e.slice(2)]); d.traps = (d.traps || []).map((t) => [t[0] + OFF, t[1] + OFF, ...t.slice(2)]);
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
    edgesLoad(d.edges);   /* 3D.351 walls on the lines between tiles */
    if ((S.trip) && S.trip.t0 > 1e11) { const t = S.trip; t.t0 = expNow() - Math.min(t.stage, 2) / 3 * EXP_HOURS[t.risk] * EXP_HMS; t.dur = EXP_HOURS[t.risk] * EXP_HMS; if (t.phase === 'back') { t.backFrom = expNow(); t.backPos = .5; t.backAt = expNow() + .5 * EXP_HMS; } }   /* V3D.18: old real-time trip → game time */
    if (!isFinite(S.ren)) S.ren = 20 * (S.lvl || 1);   /* 3D.110 repair saves hit by the NaN renown bug */
    clearDoorways();   /* 3D.120 saves where a fence blocks a doorway */
    if (S.shHome) { for (const m of S.shHome) { m.w = tc(7 + OFF, 10 + OFF); m.mode = 'free'; m.hp = Math.max(1, Math.round((m.hp || 1) * .5)); m.target = null; S.sv.push(m); }   /* 3D.125 review bug 3: leaving mid-fight is a rout, not a free escape: they come home hurt, with nothing, and the place is on guard */
      const L = S.shLeft; if (L && L.raid) { const F = fac(L.raid); F.att = Math.max(-100, (F.att || 0) - 15); F.raidUntil = S.day + 4; } else if (L) S.shTryDay = { ...(S.shTryDay || {}), [L.dest]: S.day };
      setTimeout(() => say('Left without orders, the squad broke and ran home hurt. Whatever they carried was lost.'), 1500); delete S.shHome; delete S.shLeft; }   /* 3D.108 */
    S.z = []; S.requests = []; setMap(S.map); S.sv.forEach(relinkSurvivor); if (S.ammo === undefined) S.ammo = 24; S.terr = S.terr || 0; if (!S.lvl) S.lvl = 1 + 3 * Math.max(0, (S.rank || 1) - 1); S.banners = S.banners || []; S.terr = Math.max(S.terr, terrOfLvl(S.lvl)); Wd.setTerritory(S.terr); edgesSwitch();   /* 3D.351 */   /* 3D.104 old saves: each old star = 3 levels */ S.inv = S.inv || {}; for (const w of (S.spare || [])) { const id = Object.keys(ITEMS).find((k) => ITEMS[k].name === (w && w[0])); if (id && id !== 'pipe') stashAdd(id); } S.spare = []; if (S.nextRaid === undefined) S.nextRaid = S.day + 1.6; if (S.nextBoss === undefined) S.nextBoss = Math.max(3, Math.ceil(S.day / 3) * 3); S.pets = S.pets || []; S.posts = (S.posts || []).filter((p) => p && Number.isFinite(p.x) && Number.isFinite(p.y)); S.log = S.log || []; S.kids = S.kids || []; if (S.nextTrader === undefined) S.nextTrader = S.day + 1; if (S.trader) { S.trader.path = null; S.trader.ex = S.trader.ex || [0, 0, 0, 0]; } if (S.trip) S.trip.members.forEach((m) => { if (!TRAITS[m.trait]) m.trait = rollTrait(m); });
    for (const b of world.buildings) { if (b._staffId) { const q = S.sv.find((x) => x.id === b._staffId); if (q) { b.staff = q; q.post = b; } } delete b._staffId; }
    genRun = S.power ? gens() : []; powerGrid();   /* audit: power after staff are relinked */
    for (const q of S.sv) if (q.ammo == null && usesAmmo(itemOf(q, 'weapon'))) { q.ammo = 0; reloadGun(q); }   /* audit: guns from older saves load from the stock, not a free magazine */
    Wd.bump(world); guideSkipDone(); alerts.clear(); setTimeout(restoreAlerts, 0); { const away = S.savedAt ? Date.now() - S.savedAt : 0; if (away > 0) setTimeout(() => awayCredit(away), 1200); } return d;
  } catch (e) { console.warn('load failed', e); return false; }
}

