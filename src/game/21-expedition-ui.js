/* ---- UI ---- */
let expOpen = false; const expSel = { dest: 'houses', risk: 'low', ids: null };
const mmss = (ms) => { { const gm = Math.max(0, Math.ceil(ms / EXP_HMS * 60)); return Math.floor(gm / 60) + 'h ' + String(gm % 60).padStart(2, '0') + 'm'; }  };
function expTripLeft(t, now = (expNow())) { return t.phase === 'back' ? t.backAt - now : t.t0 + t.dur - now; }
/* V3D.18 the exploration bar (DV2 style): the squad walks a little path along the bottom of the screen, stopping at three
   points where they search (loot pops) or run into trouble (a zombie shakes), then walks home */
let expBarT = null;
function expBar() {
  const t = S.trip; let el = $('expBar');
  if ((!t)) { if (el) el.remove(); if (expBarT) { clearInterval(expBarT); expBarT = null; } return; }
  if (!el) { el = document.createElement('div'); el.id = 'expBar'; el.className = 'expBar'; document.body.appendChild(el); el.onclick = () => showExpedition(); }
  const d = EXP_DEFS[t.dest], key = t.dest + '|' + t.members.map((m) => m.id).join(',');
  if (el.dataset.k !== key) {
    el.dataset.k = key; el.classList.toggle('mini', !!S.expMini);
    const figs = t.members.slice(0, 4).map((m, i) => { const a = window.ZH3D && ZH3D.figure ? ZH3D.figure(m, 'walkA') : null, b = window.ZH3D && ZH3D.figure ? ZH3D.figure(m, 'walkB') : null; return `<div class="ebF" style="--i:${i}">${a ? `<img class="fa" src="${a}" alt=""><img class="fb" src="${b}" alt="">` : '🙂'}</div>`; }).join('');
    el.innerHTML = `<button class="ebHide" aria-label="Hide">${window.ZHIcons ? ZHIcons.svg('cross', 16) : '✕'}</button><div class="ebMini">${window.ZHIcons ? ZHIcons.svg('explore', 26) : '🧭'}<span class="ebMT"></span></div><div class="ebPath"></div><div class="ebEnd home">${window.ZHIcons ? ZHIcons.svg('home', 24) : '🏠'}</div>${[1, 2].map((k) => `<div class="ebStop" style="left:${8 + 82 * k / 3}%" data-k="${k}"></div>`).join('')}<div class="ebEnd dest">${d.icon}</div><div class="ebSquad">${figs}</div><div class="ebFx"></div><div class="ebTime"></div>`;
  }
  const now = expNow(), out = t.phase === 'out', pos = out ? Math.min(1, (now - t.t0) / t.dur) : (t.backPos ?? 1) * Math.max(0, (t.backAt - now) / Math.max(1, t.backAt - (t.backFrom ?? t.backAt - 1)));
  const sq = el.querySelector('.ebSquad'); sq.style.left = (8 + 82 * pos) + '%'; sq.classList.toggle('back', !out); sq.classList.toggle('stop', !!t.enc || modalOpen || (window.ZHG && ZHG.paused && ZHG.paused()));
  el.querySelectorAll('.ebStop').forEach((st) => st.classList.toggle('done', t.stage >= +st.dataset.k));
  el.querySelector('.ebTime').textContent = (out ? '' : '↩ ') + mmss(expTripLeft(t)); { const mt = el.querySelector('.ebMT'); if (mt) mt.textContent = (out ? '' : '↩ ') + mmss(expTripLeft(t)); }
  { const hb = el.querySelector('.ebHide'); if (hb && !hb.onclick) hb.onclick = (e) => { e.stopPropagation(); S.expMini = true; el.classList.add('mini'); }; }   /* 3D.30: tuck the trip bar away into a small chip */
  el.onclick = () => { if (el.classList.contains('mini')) { S.expMini = false; el.classList.remove('mini'); } else showExpedition(); };
  if (t.fx && t.fx.shown !== t.fx.at) { t.fx.shown = t.fx.at; const fx = el.querySelector('.ebFx'), x = 8 + 82 * Math.min(1, t.fx.stage / 3);
    fx.innerHTML = `<div class="ebPop ${t.fx.bad ? 'bad' : 'good'}" style="left:${x}%">${t.fx.bad ? (window.ZHIcons ? ZHIcons.svg('zombie', 26) : '🧟') : (window.ZHIcons ? ZHIcons.svg('box', 26) : '📦')}<span>${t.fx.bad ? 'Trouble!' : esc((t.fx.got || []).map((g) => '+' + g).join(' '))}</span></div>`; }
  if (!expBarT) expBarT = setInterval(expBar, 120);
}
function expTick() {   // called every second: chip on the HUD and the live numbers in the panel
  expBar();
  const t = S.trip, chip = $('tripChip'); if (chip) { chip.style.display = ('none'); if (t) $('tripTime').textContent = (t.phase === 'back' ? '↩ ' : '') + mmss(expTripLeft(t)); }
  if (expOpen && t && $('expTime')) { $('expTime').textContent = mmss(expTripLeft(t)); const st = $('expStage'); if (st) st.textContent = t.phase === 'back' ? 'Walking home' : `Stage ${Math.min(EXP_STAGES, t.stage + 1)} of ${EXP_STAGES}`; }
}
function expPreWhy(ids) {   /* 3D.30: say up front why the squad can't leave, instead of a button that silently does nothing */
  if (expMsg.t && performance.now() - expMsg.at < 5000) return expMsg.t;
  if (S.trip) return 'A squad is already out';
  if (!S.sv.some(expEligible)) return 'Nobody is ready: everyone is hurt, hungry, thirsty or busy';
  if (!ids.length) return 'Tap a survivor to add them to the squad';
  if (S.sv.length - ids.length < EXP_HOME_MIN) return `Keep at least ${EXP_HOME_MIN} survivors at home`;
  return '';
}
function expMsg(t) { expMsg.t = t; expMsg.at = performance.now(); const e = $('expWhy'); if (!e) { say(t); return; } e.textContent = t; e.classList.remove('shake'); void e.offsetWidth; e.classList.add('shake'); }
/* 3D.362 (owner, 24 Nov, W249 "go next"; the valley map settled in W245 and W247: look C street map, no counts of the dead, few numbers, a
   faction's mood as faces on its card; W270 less reading). Step 1 of 4: Explore opens on a map of the valley in place of the trip list. Every
   place the game knows is a pin where 15-STRONGHOLDS.md 10.10 puts it, coloured by its state (a lead, locked, a stronghold, secured, a season's
   place out of season, a faction town); a tap opens its card (one line of state, what it brings as signs, one button). "Plan a trip ›" opens
   the old planner for that place, which comes back to the map. Not in this step: hiding unscouted places, herds and squads drawn on the map. */
const VM_W = 360, VM_H = 500;
const VM_P = { houses: [122, 360, 'door'], pharmacy: [132, 430, 'medic'], lumberyard: [146, 236, 'tree'], gasstation: [226, 262, 'fuel'], military: [250, 408, 'ammo'], quarrysite: [140, 66, 'pick'],
  clinic: [236, 362, 'medic'], mall: [322, 380, 'shop'], prison: [184, 452, 'fort'], warehouse: [280, 330, 'box'], sh_spring: [96, 292, 'sprout'], sh_summer: [294, 460, 'fire'], sh_autumn: [64, 122, 'party'], sh_winter: [318, 124, 'snow'],
  raid_toll: [268, 170, 'crown', 'toll'], raid_foundry: [74, 428, 'factory', 'foundry'], raid_quar: [318, 276, 'flag', 'quar'], raid_helix: [186, 104, 'research', 'helix'], raid_hollow: [116, 166, 'candle', 'hollow'], raid_green: [60, 250, 'leaf', 'green'] };
const VM_SHORT = { houses: 'Elm Row', pharmacy: 'Pharmacy', lumberyard: 'Lumber Yard', gasstation: 'Gas Station', military: 'Army post', quarrysite: 'Quarry', clinic: 'Clinic', mall: 'Mall', prison: 'Prison', warehouse: 'Warehouses',
  sh_spring: 'Greenhouse', sh_summer: 'Refinery', sh_autumn: 'Harvest Fair', sh_winter: 'Depot', raid_toll: 'Toll Kings', raid_foundry: 'Foundry', raid_quar: 'Bravo', raid_helix: 'Helix lab', raid_hollow: 'The Hollow', raid_green: 'Greenwater' };
const VM_MOODS = [['angry', 'Hostile'], ['sad', 'Wary'], ['', 'Neutral'], ['happy', 'Friendly'], ['allies', 'Allies']];
const vmMood = (F) => (F.ally ? 4 : F.att >= 25 ? 3 : F.att > -10 ? 2 : F.att > -50 ? 1 : 0);
let vmCard = null;
function vmState(id) {   /* what the pin shows: st (colour), tag (a word or two under it) */
  const d = EXP_DEFS[id], fk = VM_P[id][3], lead = (S.leads || []).find((l) => l.dest === id);
  if (fk) { const F = (S.fac || {})[fk]; if (!F || !F.met) return null; const m = vmMood(F); return { st: ['rival', 'wary', 'neutral', 'friend', 'friend'][m], tag: VM_MOODS[m][1], mood: m, fk }; }
  if (shSecured(id)) return { st: 'outpost', tag: 'Secured' };
  const lk = d.lock(); if (lk) { const lv = /level (\d+)/i.exec(lk); return id.startsWith('sh_') ? { st: 'off', tag: id.slice(3, 4).toUpperCase() + id.slice(4) } : { st: 'locked', tag: lv ? 'Level ' + lv[1] : (lk.replace(/^Needs (the )?/i, '').length <= 12 ? lk.replace(/^Needs (the )?/i, '') : 'Locked'), why: lk }; }
  if (lead) return { st: 'lead', tag: 'Lead', lead };
  if (d.stronghold) return { st: 'sealed' };
  return { st: 'search' };
}
function vmMapSvg() {
  const W = VM_W, H = VM_H, sm = (pts) => pts.map((p, i) => (i ? 'L' : 'M') + p[0] + ' ' + p[1]).join(' ');
  const curve = (pts) => { let d = `M${pts[0][0]} ${pts[0][1]}`; for (let i = 1; i < pts.length; i++) { const a = pts[i - 1], b = pts[i]; d += ` Q${a[0]} ${a[1]} ${(a[0] + b[0]) / 2} ${(a[1] + b[1]) / 2}`; } const l = pts[pts.length - 1]; return d + ` T${l[0]} ${l[1]}`; };
  const river = [[26, -5], [40, 70], [44, 130], [34, 200], [40, 262], [50, 330], [36, 400], [32, 450], [40, 505]];
  const roads = [{ p: [[180, 318], [204, 290], [226, 262], [244, 222], [268, 170], [290, 110], [314, 42]], w: 7, hw: 1 }, { p: [[180, 318], [210, 340], [236, 362], [250, 408], [276, 428], [302, 440]], w: 4 }, { p: [[180, 318], [182, 390], [184, 452]], w: 4 },
    { p: [[180, 318], [146, 236], [116, 166], [84, 140], [64, 122]], w: 4 }, { p: [[146, 236], [168, 170], [186, 104]], w: 3 }, { p: [[186, 104], [140, 66], [100, 50], [76, 40]], w: 2.5, dash: 1 }, { p: [[180, 318], [120, 284], [60, 250]], w: 4 },
    { p: [[60, 250], [62, 340], [74, 428]], w: 3 }, { p: [[180, 318], [230, 322], [280, 330], [318, 276]], w: 4 }, { p: [[318, 276], [322, 200], [318, 124]], w: 3 }, { p: [[182, 390], [150, 376], [122, 360]], w: 2.5 }, { p: [[280, 330], [322, 380]], w: 2.5 }];
  let r = 1; const rnd = () => (r = (r * 16807) % 2147483647) / 2147483647;
  const blob = (cx, cy, rx, ry, n = 9, j = .22) => { let d = ''; for (let i = 0; i <= n; i++) { const a = i / n * Math.PI * 2, k = 1 + (rnd() - .5) * j * 2; d += (i ? 'L' : 'M') + (cx + Math.cos(a) * rx * k).toFixed(1) + ' ' + (cy + Math.sin(a) * ry * k).toFixed(1); } return d + 'Z'; };
  let o = `<svg viewBox="0 0 ${W} ${H}" width="100%" height="100%" style="display:block"><defs><filter id="vmBlur" x="-30%" y="-30%" width="160%" height="160%"><feGaussianBlur stdDeviation="9"/></filter>
    <pattern id="vmHatch" width="7" height="7" patternUnits="userSpaceOnUse" patternTransform="rotate(45)"><rect width="7" height="7" fill="#f7e3df"/><path d="M0 0 V7" stroke="#efc9c2" stroke-width="2.4"/></pattern></defs><rect width="${W}" height="${H}" fill="#f1efe9"/>`;
  for (const [x, y, rx, ry, a] of [[86, 44, 80, 46, .16], [150, 64, 50, 28, .12], [42, 100, 40, 26, .12], [300, 150, 40, 70, .07], [250, 120, 30, 22, .06]]) o += `<ellipse cx="${x + 8}" cy="${y + 10}" rx="${rx}" ry="${ry}" fill="rgba(60,70,40,${a})" filter="url(#vmBlur)"/><ellipse cx="${x - 6}" cy="${y - 8}" rx="${rx * .7}" ry="${ry * .6}" fill="rgba(255,255,255,${a * 1.6})" filter="url(#vmBlur)"/>`;
  o += `<path d="${blob(96, 52, 86, 44, 12, .12)}" fill="#cfe5c0"/>`;
  for (const [x, y, rx, ry] of [[146, 216, 30, 22], [216, 206, 22, 16], [100, 376, 22, 15], [232, 146, 20, 13], [292, 380, 18, 12], [160, 140, 16, 11], [120, 470, 26, 14], [300, 90, 18, 26]]) o += `<path d="${blob(x, y, rx, ry)}" fill="#bfe0ad"/>`;
  o += `<path d="${blob(80, 106, 32, 20, 8, .1)}" fill="#e3eecb"/>`; for (let a = 0; a < 4; a++) for (let c = 0; c < 6; c++) o += `<circle cx="${60 + c * 6}" cy="${96 + a * 6}" r="1.6" fill="#a6cf8f"/>`;
  o += `<rect x="344" y="0" width="16" height="${H}" fill="url(#vmHatch)"/><path d="${curve(river)}" fill="none" stroke="#9fd0f5" stroke-width="11" stroke-linecap="round"/><ellipse cx="34" cy="490" rx="26" ry="12" fill="#9fd0f5"/><ellipse cx="84" cy="240" rx="9" ry="6" fill="#9fd0f5"/>`;
  for (const [x, y, w, h, kind] of [[180, 318, 52, 44], [60, 250, 30, 24], [74, 428, 34, 22, 'ind'], [268, 170, 28, 22], [318, 276, 24, 30, 'ind'], [186, 104, 30, 18, 'ind'], [116, 166, 30, 22], [314, 42, 58, 34], [226, 262, 14, 10], [280, 330, 34, 22, 'ind'], [128, 372, 30, 20], [236, 362, 22, 16], [184, 452, 30, 22, 'ind'], [250, 408, 18, 12], [322, 380, 20, 14, 'ind']]) {
    const ind = kind === 'ind'; o += `<path d="${blob(x, y, w / 2 + 6, h / 2 + 6, 8, .12)}" fill="${ind ? '#e6e3ee' : '#ebe7e0'}"/>`;
    for (let i = 0, n = Math.round(w * h / (ind ? 110 : 60)); i < n; i++) { const bx = x + (rnd() - .5) * w, by = y + (rnd() - .5) * h, bw = ind ? 6 + rnd() * 8 : 3 + rnd() * 4, bh = ind ? 4 + rnd() * 6 : 3 + rnd() * 3; o += `<rect x="${(bx - bw / 2).toFixed(1)}" y="${(by - bh / 2).toFixed(1)}" width="${bw.toFixed(1)}" height="${bh.toFixed(1)}" fill="${ind ? '#dcd8e6' : '#e0dbd2'}" stroke="#d2ccc1" stroke-width=".4"/>`; }
    for (let i = -1; i <= 1; i++) o += `<path d="M${x - w / 2} ${y + i * h / 3} H${x + w / 2} M${x + i * w / 3} ${y - h / 2} V${y + h / 2}" stroke="#fff" stroke-width="1.6"/>`;
  }
  for (const rd of roads) { const d = sm(rd.p); if (rd.dash) { o += `<path d="${d}" fill="none" stroke="#a7a29a" stroke-width="1.4" stroke-dasharray="2 3"/>`; continue; } o += `<path d="${d}" fill="none" stroke="${rd.hw ? '#f0b44c' : '#d4d0c8'}" stroke-width="${rd.w + 2}" stroke-linecap="round" stroke-linejoin="round"/><path d="${d}" fill="none" stroke="${rd.hw ? '#fde293' : '#fff'}" stroke-width="${rd.w}" stroke-linecap="round" stroke-linejoin="round"/>`; }
  o += `<g transform="translate(296 216)"><rect x="-7" y="-6" width="14" height="12" rx="3" fill="#fff" stroke="#9aa0a6"/><text y="3.5" font-size="8.5" font-weight="800" text-anchor="middle" fill="#3c4043" font-family="Manrope,sans-serif">9</text></g><path d="M344 0 V${H}" stroke="#d93025" stroke-width="1.6" stroke-dasharray="6 4"/>`;
  const lab = (x, y, t, c = '#80868b', rot = 0, sz = 8) => `<text x="${x}" y="${y}" transform="rotate(${rot} ${x} ${y})" font-size="${sz}" letter-spacing="1.6" fill="${c}" font-family="Manrope,sans-serif" font-weight="800" text-anchor="middle" style="paint-order:stroke" stroke="#f1efe9" stroke-width="2.5">${t}</text>`;
  o += lab(146, 22, 'PINE HILLS') + lab(22, 340, 'MILL RIVER', '#5d9bd0', -86) + lab(352, 330, 'CORDON ZONE', '#c5221f', 90, 7) + lab(130, 494, 'SOUTH VALLEY') + lab(250, 132, 'NORTH WOODS', '#7a9a5e', 0, 6.5);
  o += `<g transform="translate(18 18)"><circle r="10" fill="#fff" stroke="#dadce0"/><path d="M0 -7 L3 1 L0 -1 L-3 1 Z" fill="#d93025"/><text y="8" font-size="6" text-anchor="middle" fill="#5f6368" font-family="Manrope,sans-serif" font-weight="800">N</text></g>`;
  return o + '</svg>';
}
/* the five mood faces exactly as the owner approved them (W247: set A, Allies = sample 4, two faces together; tools/qa/mood_icons_mock.html, phone_b_mock.js) */
const VM_FACES = (() => { const I = '#2a1d16', st = (f) => `fill="${f}" stroke="#fff" stroke-width="3.5" stroke-linejoin="round" paint-order="stroke"`, f = (c, x) => `<circle cx="24" cy="24" r="19" ${st(c)}/>${x}`;
  return [f('#ff6b4a', `<path d="M12 15 L21 19 M36 15 L27 19" stroke="${I}" stroke-width="3.2" stroke-linecap="round"/><circle cx="18" cy="24" r="2.6" fill="${I}"/><circle cx="30" cy="24" r="2.6" fill="${I}"/><path d="M15 35 Q24 27 33 35" fill="none" stroke="${I}" stroke-width="3.2" stroke-linecap="round"/>`),
    f('#f0a24a', `<path d="M27 15 L35 13" stroke="${I}" stroke-width="2.8" stroke-linecap="round"/><path d="M13 22 H21 M27 22 H35" stroke="${I}" stroke-width="2.8" stroke-linecap="round"/><circle cx="20" cy="24.5" r="2.2" fill="${I}"/><circle cx="34" cy="24.5" r="2.2" fill="${I}"/><path d="M16 33 q4 -3 8 0 t8 0" fill="none" stroke="${I}" stroke-width="2.8" stroke-linecap="round"/>`),
    f('#e8d27a', `<circle cx="18" cy="22" r="2.6" fill="${I}"/><circle cx="30" cy="22" r="2.6" fill="${I}"/><path d="M17 32 H31" stroke="${I}" stroke-width="3" stroke-linecap="round"/>`),
    f('#6fb7ff', `<path d="M13 23 q4 -5 8 0 M27 23 q4 -5 8 0" fill="none" stroke="${I}" stroke-width="2.8" stroke-linecap="round"/><path d="M15 29 Q24 38 33 29" fill="none" stroke="${I}" stroke-width="3" stroke-linecap="round"/>`),
    `<circle cx="17" cy="27" r="13" ${st('#6fb7ff')}/><circle cx="32" cy="23" r="13" ${st('#3cc6b0')}/><circle cx="13" cy="26" r="1.9" fill="${I}"/><circle cx="20" cy="26" r="1.9" fill="${I}"/><path d="M12 31 Q16.5 35 21 31" fill="none" stroke="${I}" stroke-width="2.2" stroke-linecap="round"/><circle cx="28" cy="21" r="1.9" fill="${I}"/><circle cx="35" cy="21" r="1.9" fill="${I}"/><path d="M27 26 Q31.5 30 36 26" fill="none" stroke="${I}" stroke-width="2.2" stroke-linecap="round"/>`]; })();
const vmFace = (k, z) => `<svg class="vmFace" viewBox="0 0 48 48" width="${z}" height="${z}" aria-hidden="true">${VM_FACES[k]}</svg>`;
const vmIc = (n, z) => (window.ZHIcons ? ZHIcons.svg(n, z) : '');
function showValley() {
  expOpen = true; const RING = { friend: '#6fb7ff', neutral: '#e8d27a', wary: '#f0a24a', rival: '#ff7a59', sealed: '#c0392b', outpost: '#4fd1c5', off: '#8a8f94', locked: '#8a8f94', lead: '#f2c94c', search: '#ffffff' };
  const BADGE = { sealed: 'skull', outpost: 'shield', locked: 'lock', off: 'clock', lead: 'search' }, pct = (x, y) => `left:${(x / VM_W * 100).toFixed(2)}%;top:${(y / VM_H * 100).toFixed(2)}%`;
  let pins = `<div class="vmPin home" style="${pct(180, 318)};--r:#fff;--s:calc(40 * 100cqw / 360)"><span class="vmDot">${vmIc('home', 28)}</span><span class="vmName">The Haven</span></div>`;
  const shown = {};
  for (const [id, p] of Object.entries(VM_P)) { if (!EXP_DEFS[id]) continue; const s = vmState(id); if (!s) continue; shown[id] = s;
    const big = s.st !== 'search', sz = big ? 32 : 28, dim = ['off', 'locked'].includes(s.st), badge = s.mood !== undefined ? '' : BADGE[s.st], face = s.mood !== undefined && s.mood !== 2 ? `<em class="vmBadge face">${vmFace(s.mood, 20)}</em>` : '';
    pins += `<button class="vmPin${dim ? ' dim' : ''}${vmCard === id ? ' sel' : ''}" data-vm="${id}" style="${pct(p[0], p[1])};--r:${RING[s.st]};--s:calc(${sz} * 100cqw / 360)" aria-label="${esc(VM_SHORT[id])}"><span class="vmDot">${vmIc(p[2], Math.round(sz * .72))}${badge ? `<em class="vmBadge">${vmIc(badge, 14)}</em>` : face}</span><span class="vmName">${VM_SHORT[id]}</span>${s.tag ? `<span class="vmTag t_${s.st}">${s.tag}</span>` : ''}</button>`; }
  let card = '';
  if (vmCard && shown[vmCard]) { const id = vmCard, s = shown[id], d = EXP_DEFS[id], P = VM_P[id];
    const name = P[3] ? FACTIONS[P[3]].name : d.name, loot = Object.keys(d.loot || {}).map((k) => `<span class="vmRes">${RES_ICON[k] || ''}</span>`).join('');
    const line = P[3] ? (fac(P[3]).ally ? 'Allies' : 'Faction town') : s.st === 'lead' ? `Lead · ${EXP_RISK[s.lead.risk].label.toLowerCase()} risk` : s.st === 'locked' ? esc(s.why) : s.st === 'off' ? `${s.tag} only` : s.st === 'outpost' ? 'Secured' : d.stronghold ? 'Stronghold · no lead yet' : 'No lead yet';
    const go = P[3] ? (expLocked(id) ? '' : `<button class="act go" id="vmGo">Plan a raid ›</button>`) : s.st === 'lead' ? `<button class="act go" id="vmGo">Plan a trip ›</button>` : '';
    card = `<div class="vmCard"><div class="vmCH"><span class="vmDot" style="--r:${RING[s.st]};--s:40px">${vmIc(P[2], 28)}</span><div class="vmCT"><b>${esc(name)}</b><small>${line}</small></div><button class="vmX" id="vmX" aria-label="Close"><svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round"><path d="M6 6l12 12M18 6L6 18"/></svg></button></div>`
      + (s.mood !== undefined ? `<div class="vmMood">${VM_MOODS.map(([i, w], k) => `<span class="${k === s.mood ? 'on' : ''}"><em>${vmFace(k, k === s.mood ? 36 : 28)}</em><small>${w}</small></span>`).join('')}</div>` : '')
      + (loot && !P[3] ? `<div class="vmBrings"><span>Brings</span>${loot}</div>` : '') + (go ? `<div class="vmBtns">${go}</div>` : '') + '</div>'; }
  const nL = (S.leads || []).length;
  $('ib').innerHTML = `<div class="vmWrap"><div class="vmMap">${vmMapSvg()}<div class="vmPins">${pins}</div>${card}</div>`
    + `<div class="vmChips"><button class="vmChip" id="vmLeads"${nL ? '' : ' disabled'}>${vmIc('search', 18)}${nL ? `${nL} lead${nL > 1 ? 's' : ''}` : 'No leads'}</button>${S.lastTrip ? `<button class="vmChip" id="vmLast">${vmIc('boot', 18)}Last trip</button>` : ''}</div></div>`;
  showPanel('Explore');
  $('ib').querySelectorAll('[data-vm]').forEach((b) => { b.onclick = () => { vmCard = vmCard === b.dataset.vm ? null : b.dataset.vm; showValley(); }; });
  { const x = $('vmX'); if (x) x.onclick = () => { vmCard = null; showValley(); }; }
  { const l = $('vmLeads'); if (l && nL) l.onclick = () => { const ids = (S.leads || []).map((q) => q.dest).filter((q) => VM_P[q]), i = ids.indexOf(vmCard); vmCard = ids[(i + 1) % ids.length] || null; showValley(); }; }
  { const l = $('vmLast'); if (l) l.onclick = () => say(`Last trip: ${EXP_DEFS[S.lastTrip.dest].name}${S.lastTrip.lost.length ? ' · lost ' + S.lastTrip.lost.join(', ') : ''}`, true); }
  { const g = $('vmGo'); if (g) g.onclick = () => { const id = vmCard, P = VM_P[id]; if (P[3]) expSel.force = id; else { const ld = (S.leads || []).find((l) => l.dest === id); if (ld) expSel.lead = ld.id; } expSel.plan = true; expSel.ids = null; showExpedition(); }; }
}
function showExplore() { expSel.plan = false; expSel.force = null; showExpedition(); }   /* the Explore button and the trip chip: the map first */
function showExpedition() {
  endBuildMode(true); closeP(); expOpen = true; $('it').textContent = 'Explore'; const t = S.trip;
  if (phoneOn() && !t && !expSel.plan && !expSel.force) return showValley();
  if (t) {
    const d = EXP_DEFS[t.dest];
    $('ib').innerHTML = `<b>${d.icon} ${d.name}</b> · ${EXP_RISK[t.risk].label} risk<br><span id="expStage">${t.phase === 'back' ? 'Walking home' : `Stage ${Math.min(EXP_STAGES, t.stage + 1)} of ${EXP_STAGES}`}</span> · <b id="expTime">${mmss(expTripLeft(t))}</b> left<br>
      Squad: ${t.members.map((m) => `${esc(m.name)} (${m.job}, HP ${Math.ceil(m.hp)}/${m.max})`).join(', ')}<br>
      Loot so far: ${['food', 'water', 'wood', 'stone', 'mat'].filter((k) => k !== 'wood' && k !== 'stone' || t.loot[k]).map((k) => `${RES_ICON[k]} ${t.loot[k] || 0}`).join('  ')}<br>${t.enc ? `<div class="card encCard"><b>${EXP_ENC[t.enc.k].title}</b><div class="sm">${EXP_ENC[t.enc.k].text} Decide before the next stage, or the squad decides.</div>${encButtons(t).map((b, i) => `<button class="act${i === 0 ? ' go' : ''}" data-enc="${i}" style="width:100%;margin:4px 0 0">${b.label}</button>`).join('')}</div>` : ''}<small>${t.log.map(esc).join('<br>')}</small><br>
      ${t.phase === 'out' ? '<button class="act danger" id="expRecall">RECALL SQUAD</button><br><small>Recall keeps the loot from finished stages and skips the risk of the rest. Leaving mid-stage forfeits that stage’s loot. The trip keeps running while the game is closed.</small>' : '<small>The squad is heading back.</small>'}`;
    const rb = $('expRecall'); if (rb) rb.onclick = () => { if (expRecall()) showExpedition(); };
    $('ib').querySelectorAll('[data-enc]').forEach((b) => { const en = t.enc; b.onclick = () => encChoose(en, +b.dataset.enc); });
  } else {
    if (expSel.force && EXP_DEFS[expSel.force] && !expLocked(expSel.force)) { expSel.dest = expSel.force; expSel.risk = 'high'; }   /* 3D.114 a raid picked from the Factions card */
    else {   /* V3D.18: you can only go where a lead points */
      leadsTidy(); const L = S.leads || [];
      if (!L.length) { $('ib').innerHTML = `<div class="card leadNone"><div class="lnIc">${window.ZHIcons ? ZHIcons.svg('radio', 44) : '📻'}</div><div><b>No leads right now</b><div class="sm">Scouts and the radio bring new places to search in the morning and the afternoon. Each lead lasts about 10 hours.</div></div></div>${S.lastTrip ? `<div class="sm">Last trip: ${EXP_DEFS[S.lastTrip.dest].name}${S.lastTrip.lost.length ? ' · lost ' + S.lastTrip.lost.join(', ') : ''}</div>` : ''}`; showPanel(); return; }
      if (!L.some((l) => l.id === expSel.lead)) expSel.lead = L[0].id; const ld = L.find((l) => l.id === expSel.lead); expSel.dest = ld.dest; expSel.risk = ld.risk;
    }
    if (!EXP_DEFS[expSel.dest] || expLocked(expSel.dest)) expSel.dest = 'houses';
    const d = EXP_DEFS[expSel.dest]; if (!d.risks.includes(expSel.risk)) expSel.risk = d.risks[0];
    let ids = (expSel.ids || []).filter((id) => S.sv.some((q) => q.id === id && expEligible(q))); if (!ids.length) ids = expAutoSquad().map((q) => q.id); expSel.ids = ids;
    const members = ids.map((id) => S.sv.find((q) => q.id === id)).filter(Boolean), pv = expPreview(expSel.dest, expSel.risk, members), rk = EXP_RISK[expSel.risk];
    const ready = S.sv.filter(expEligible);
    const where = (`<div class="sm">Leads</div><div class="lst">${(S.leads || []).map((l) => { const v = EXP_DEFS[l.dest], on = l.id === expSel.lead; return `<div class="card" data-lead="${l.id}" style="${on ? 'border-color:var(--gold)' : ''}"><span style="font-size:28px">${v.icon}</span><div class="sp"><b>${v.name}</b> <span class="sm">${EXP_RISK[l.risk].label} risk · ${EXP_HOURS[l.risk]} h trip</span><div class="sm">${esc(l.text)} · gone in ${Math.max(1, Math.round(l.untilH - nowH()))} h</div></div>${on ? '<b>✔</b>' : ''}</div>`; }).join('')}</div>`);
    const lootTxt = Object.entries(d.loot || {}).map(([r, [a0, a1]]) => `${(RES_ICON[r] || RES_NAME[r] || r)} ${Math.round(a0 * EXP_STAGES * pv.mult)}–${Math.round(a1 * EXP_STAGES * pv.mult)}`).join('  ');   /* 3D.41: a rough total for the whole trip */
    $('ib').innerHTML = (`<div class="card expTop"><div class="etRow"><span class="etN"><b>${ids.length}/${expMax()}</b><small>squad</small></span><button class="act go" id="expGo">${(SH_DEFS[expSel.dest]) ? 'Enter the stronghold' : `Send squad · ${EXP_HOURS[expSel.risk]} h`}</button></div>${vehCard()}${EXP_DEFS[expSel.dest].raid ? `<div class="etLine sm">Their camp: pick which buildings to bring down and what to loot. Gear, ammo and the leader are in the middle. Get out through the gate with what you took.</div>` : ''}${(SH_DEFS[expSel.dest]) ? (() => { const pw = shPower(members), rc = SH_DEFS[expSel.dest].rec; return `<div class="etLine"><span class="etK">Power</span> <b style="color:${pw >= rc ? 'var(--good)' : pw >= rc * .85 ? '#c98a1e' : 'var(--bad)'}">${pw}</b> / ${rc} recommended · you watch the fight and give the calls</div>` + shCardLine(expSel.dest); })() : ''}<div class="etLine"><span class="etK">Cost</span> 🍖${pv.need} 💧${pv.need}${pv.short ? ' <span style="color:var(--bad)">(short: riskier)</span>' : ''}</div><div class="etLine"><span class="etK">Loot</span> ${lootTxt || '×' + pv.mult.toFixed(1)}</div>${(SH_DEFS[expSel.dest]) ? '' : tripCheck(expSel.dest, expSel.risk, members, pv)}${ready.length ? '' : '<div class="sm">Nobody is healthy and free right now.</div>'}<div id="expWhy" class="expWhy">${expPreWhy(ids)}</div></div>`
      + where + `<div class="sm">Squad (1–${expMax()}, ${EXP_HOME_MIN} stay home)</div>${pfBar()}<div class="lst">${pfList(S.sv.slice()).map((q) => { const on = ids.includes(q.id), ok = expEligible(q); return `<div class="card" data-s="${q.id}" style="${on ? 'border-color:var(--good)' : ''}${ok || on ? '' : ';opacity:.45'}">${portrait(q)}<div class="sp">${esc(q.name)} ${traitIcon(q)} <span class="sm">${q.job} Lv.${q.l}</span><div class="sm">${ok ? 'Ready' : expBlock(q) || 'Busy'}</div></div>${on ? '<b style="color:var(--good)">✔</b>' : ''}</div>`; }).join('')}</div>`);
    $('ib').querySelectorAll('[data-lead]').forEach((b) => { b.onclick = () => { expSel.lead = b.dataset.lead; showExpedition(); }; }); pfWire($('ib'), showExpedition);
    $('ib').querySelectorAll('[data-d]').forEach((b) => { b.onclick = () => { if (expLocked(b.dataset.d)) { say(expLocked(b.dataset.d)); return; } expSel.dest = b.dataset.d; showExpedition(); }; });
    $('ib').querySelectorAll('[data-r]').forEach((b) => { b.onclick = () => { expSel.risk = b.dataset.r; showExpedition(); }; });
    $('ib').querySelectorAll('[data-s]').forEach((b) => { b.onclick = () => { const id = +b.dataset.s, q = S.sv.find((x) => x.id === id); if (ids.includes(id)) expSel.ids = ids.filter((x) => x !== id); else if (q && expEligible(q) && ids.length < expMax()) expSel.ids = [...ids, id]; else expMsg(q && !expEligible(q) ? `${q.name} can’t go: ${expBlock(q) || 'busy right now'}` : ids.length >= EXP_MAX_SQUAD ? `A squad is at most ${EXP_MAX_SQUAD}` : 'That survivor can’t go right now'); showExpedition(); }; });
    $('ib').querySelectorAll('[data-goal]').forEach((b) => { b.onclick = () => { expSel.goal = b.dataset.goal; showExpedition(); }; }); $('ib').querySelectorAll('[data-veh]').forEach((b) => { b.onclick = () => { expSel.veh = b.dataset.veh || null; showExpedition(); }; }); $('ib').querySelectorAll('[data-vbuild]').forEach((b) => { b.onclick = () => { vehBuildCart(); showExpedition(); }; }); $('ib').querySelectorAll('[data-vfix]').forEach((b) => { b.onclick = () => { vehRepair(b.dataset.vfix); showExpedition(); }; });   /* 3D.109 */
    $('expGo').onclick = () => { const r = startExpedition(expSel.dest, expSel.risk, expSel.ids); if (!r.ok) { expMsg(r.why); return; } if (!expSel.force) S.leads = (S.leads || []).filter((l) => l.id !== expSel.lead); closeP(); expSel.ids = null; expSel.force = null; expSel.plan = false; };
  }
  showPanel();
  if (phoneOn() && !t) { panelBack = () => { expSel.plan = false; expSel.force = null; showValley(); }; $('pBack').style.display = 'block'; $('pBack').dataset.t = 'Map'; }   /* 3D.362: the planner goes back to the map */
}
/* V2.9 death and recovery model */
const BLEED_TICKS = { none: 7200, medic: 10800, clinic: 12600, hospital: 14400 };
const CARE_TICKS = { medic: 3600, clinic: 2700, hospital: 1800 };   // the Camp: 1.5 x medic (careTicks)
let BANDAGE_COST = 2, BANDAGE_TICKS = 3600;   /* Field Medicine research: 1 part, longer */
function medTier() { const m = medSite(); return m ? m.type : 'none'; }
function bleedMax() { return Math.round(BLEED_TICKS[medTier()] * DF().bleed * ((window.ZH_BAL || {}).bleed || 1.5)   /* balance study (Nov 8): every long-run death was a bleed-out; the downed hold on 50% longer */ * (medTier() === 'hospital' && anyPowered('hospital') ? 1.4 : 1)); }   /* 3D.77: surgery: a powered Hospital gives the dying 40% longer */
function careTicks(b) { if (b !== undefined && (!b || isCamp(b))) return Math.round(CARE_TICKS.medic * 1.5);   /* 3D.46 camp care: half again as long as a Medical Tent */
  const t = b ? b.type : medTier(), m = b || medSite(), st = m && isWorking(m) ? Math.max(.6, 1 - (stat(m.staff, 'int') - 5) * .03) : 1; return Math.round((CARE_TICKS[t] || CARE_TICKS.medic) * st * (m ? 1 - combos(m).care : 1) * (m && m.unpaid ? 1.4 : 1) * (m && !(isWorking(m) && m.staff && m.staff.job === 'Medic') ? 1.3 : 1) * (m && isWorking(m) && gearFx(m.staff, 'medic') ? .8 : 1)); }   /* 3D.69: care without a Medic on staff is 1.3x slower (was 1.6x in 3D.67: made the Medic too essential) */
