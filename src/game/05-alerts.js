/* ---------------- V2.34 notifications: three levels ----------------
 * critical  : persistent alert row (top of the map), one per unresolved issue (deduplicated by key), tap = centre the camera on it,
 *             optional action buttons, pulsing marker in the world + an arrow at the screen edge when it is off screen,
 *             optional "drop to 1x speed" on the first emergency (Event log → settings).
 * important : one banner at a time (queued, never overlapping), and the event log.
 * routine   : event log only (plus floating text in the world when it has a place). */
const alerts = new Map(); let bannerQ = [], bannerOn = null, lastSlow = -1e9; const lastBanner = new Map();
const OPT_KEY = 'zombieHavenOpts', OPTS = { autoSlow: false, nightLights: true, advisor: true }; try { Object.assign(OPTS, JSON.parse(localStorage.getItem(OPT_KEY) || '{}')); if (!OPTS.v313) { OPTS.autoSlow = false; OPTS.v313 = 1; localStorage.setItem(OPT_KEY, JSON.stringify(OPTS)); } } catch (e) { /* private mode */ }   /* V3D.13: emergencies no longer drop the speed to 1x (owner's request); the Log panel still has the switch */
/* 3D.317 (owner, 23 Nov, W249): the phone look, built screen by screen behind Settings -> Phone look; off is the Glass look as it was.
   Its sheet (css/phone.css) is added by the game, so the published page itself does not change. */
/* 3D.333 (owner, 23 Nov: "We are going with the phone look"; "how come the phone type UI wasn't published?"): the phone look is ON unless the player switched it off (OPTS.look === 'glass'). */
function applyLook() { const on = OPTS.look !== 'glass'; if (on && !document.getElementById('phoneCss')) { const l = document.createElement('link'); l.id = 'phoneCss'; l.rel = 'stylesheet'; l.href = 'css/phone.css?v=' + BUILD_TAG.toLowerCase(); document.head.appendChild(l); } document.documentElement.classList.toggle('phone', on); }
applyLook();
const phoneOn = () => OPTS.look !== 'glass';   /* 3D.335: menus ask this to draw their phone-look inside */
function saveOpts() { try { localStorage.setItem(OPT_KEY, JSON.stringify(OPTS)); } catch (e) { /* ignore */ } }
const atOf = (a) => { const v = typeof a.at === 'function' ? a.at() : a.at; return v && isFinite(v.x) ? v : null; };
function note(level, text, o = {}) {
  logEvent(o.log || text, level);
  if (level === 'routine') { const at = o.at && (typeof o.at === 'function' ? o.at() : o.at); if (at && o.float) floats.push({ w: { x: at.x, y: at.y }, t: o.float, col: o.col || '#e8e0c8', a: 70 }); return; }
  if (level === 'important') { banner(o.banner || text, o.who); return; }
  const key = o.key || text, a = alerts.get(key);
  if (a) { a.text = text; if (o.at) a.at = o.at; renderAlerts(); return; }
  const first = ![...alerts.values()].some((q) => !q.dismissed); critStrip(text, o.icon || '⚠');
  alerts.set(key, { key, text, icon: o.icon || '⚠', at: o.at || null, live: o.live || null, dyn: o.dyn || null, acts: o.acts || [], threats: !!o.threats, t0: tick, ttl: o.ttl || 0, seen: performance.now() });
  { const a2 = alerts.get(key); if (a2.dyn) try { a2.text = a2.dyn(); } catch (e) { /* keep the first text */ } }
  if (first && OPTS.autoSlow && simSpeed > 1 && performance.now() - lastSlow > 60000) { lastSlow = performance.now(); simSpeed = 1; $('btnSpeed').textContent = '1×'; banner('⏸ Back to 1× speed: emergency'); }
  renderAlerts();
}
/* 3D.159 owner + the UX study: every message has a priority and a home.
   critical  -> a red strip under the top bar for 3 s, then it folds into the ⚠ button's count (one strip; more fold in as "+N more")
   news      -> ONE pill under the Mission / Day row; repeats of the same news merge into "×N" instead of queueing up
   DJ / tips -> the radio card on the tab bar (2 lines, tap for the full words); ordinary chatter waits while walkers are in town
   tap feedback (say) -> a short line just above the radio card.  Anything that misses its turn is still in the event log. */
function critStrip(text, icon) {
  if (typeof document === 'undefined' || S.cut || titleOn) return; const top = nStack('nTop'); if (!top) return;
  let el = $('critStrip'); if (!el) { el = document.createElement('div'); el.id = 'critStrip'; el.className = 'critStrip'; top.prepend(el); }
  if (el.classList.contains('in')) { el.dataset.more = (+el.dataset.more || 0) + 1; el.querySelector('.csM').textContent = `+${el.dataset.more} more`; }
  else { el.dataset.more = 0; el.innerHTML = `<span class="csI">${esc(icon)}</span><span class="csT">${esc(String(text).replace(/^[^\w]+/u, ''))}</span><span class="csM"></span>`; el.classList.add('in'); }
  clearTimeout(critStrip.t); critStrip.t = setTimeout(() => el.classList.remove('in'), 3000);
}
const newsKey = (t) => (typeof t === 'object' ? t.t : t).replace(/[\d,.]+/g, '#').toLowerCase();
function banner(t, who) {
  if (SVT) return;   /* 3D.200 the Survivor test page shows the survivor and nothing else */
  if ((who)) t = { t, who };
  const k = newsKey(t);
  if (bannerOn && bannerOn.k === k) { bannerOn.n++; bannerOn.show(t); return; }   /* the same news again while it is showing: count it */
  const q = bannerQ.find((x) => x.k === k); if (q) { q.t = t; q.n++; return; }
  bannerQ.push({ t, k, n: 1 }); if (bannerQ.length > 4) bannerQ.shift(); nextBanner();
}
function nextBanner() {
  const fx = nStack('nTop'); if (bannerOn || !bannerQ.length || !fx) return; if (cardOpen()) { clearTimeout(nextBanner.wt); nextBanner.wt = setTimeout(nextBanner, 600); return; }   /* news waits while a card is open */
  const q = bannerQ.shift(), d = document.createElement('div'); d.className = 'toast pop';
  const show = (t) => {   /* V3D.12 portrait pop: a round picture (the person, or the message's icon) and a few words */
    const who = typeof t === 'object' ? t.who : null, txt = typeof t === 'object' ? t.t : t, m = txt.match(/^\s*(\p{Extended_Pictographic}\uFE0F?|[☠★⚠⚙⏸🕯])\s*/u), icon = m ? m[1] : '📣';
    let body = m ? txt.slice(m[0].length) : txt; if (body === body.toUpperCase() && /[A-Z]{3}/.test(body)) body = body.charAt(0) + body.slice(1).toLowerCase();
    const pic = who && window.ZH3D && ZH3D.portrait ? ZH3D.portrait(who) : null;
    d.innerHTML = `<div class="pp">${pic ? `<img src="${pic}" alt="">` : icon}</div><div class="pt">${esc(body)}</div>${on.n > 1 ? `<b class="pn">×${on.n}</b>` : ''}`;
    clearTimeout(on.t); on.t = setTimeout(() => { d.classList.add('out'); setTimeout(() => { d.remove(); bannerOn = null; nextBanner(); }, 300); }, bannerQ.length ? 1900 : 2600); };
  const on = bannerOn = { k: q.k, n: q.n, show }; fx.appendChild(d); show(q.t);
}
function alertsTick() {   // every half second of game time: drop resolved alerts, refresh live text
  let ch = false;
  for (const [k, a] of alerts) { if ((a.live && !a.live()) || (a.ttl && tick - a.t0 > a.ttl)) { alerts.delete(k); ch = true; continue; } if (a.dyn) { const t = a.dyn(); if (t !== a.text) { a.text = t; ch = true; } } }
  if (ch || alerts.size) renderAlerts();
}
/* V2.35: rows are updated in place (text, buttons) instead of rebuilding the box, so nothing flashes or re-animates; only a NEW alert slides in once */
function alertRow(a) {
  const el = document.createElement('div'); el.className = 'alert new'; el.dataset.k = a.key;
  el.innerHTML = `<div class="arow"><span class="ai">${a.icon}</span><span class="at"></span><span class="ago">›</span><button class="ax" title="Hide">✕</button></div>${a.acts.length ? `<div class="aacts">${a.acts.map((c, i) => `<button class="aa" data-i="${i}"></button>`).join('')}</div>` : ''}`;
  el.onclick = (e) => { e.stopPropagation(); const p = atOf(a); if (p) { centerOn(p.x, p.y); a.seen = performance.now(); } };
  el.querySelector('.ax').onclick = (e) => { e.stopPropagation(); a.dismissed = true; renderAlerts(); };
  el.querySelectorAll('.aa').forEach((bt) => { bt.onclick = (e) => { e.stopPropagation(); const c = a.acts[+bt.dataset.i]; if (c && (!c.ok || c.ok())) c.fn(); alertsTick(); }; });
  el.addEventListener('animationend', () => el.classList.remove('new'), { once: true });
  return el;
}
/* ---------------- 3D.30 Alert hub (glass): every open problem (someone down, low food, a building without a worker ...) behind ONE
   button on the left that flashes while something needs you. Tap it for the list; anything that is solved or expires drops off by itself. */
const hubSeen = new Set(); let hubOpen = false;
function hubItems() {
  const L = [...alerts.values()].filter((a) => !a.dismissed).map((a) => ({ key: 'a:' + a.key, icon: a.icon, text: a.text, urgent: true, at: () => atOf(a), acts: a.acts.map((c) => ({ label: typeof c.label === 'function' ? c.label() : c.label, ok: !c.ok || c.ok(), fn: c.fn })) }));
  let tips = []; try { tips = OPTS.advisor ? advisorTips() : []; } catch (e) { /* never block the HUD */ }
  for (const t of tips) L.push({ key: 't:' + t.key, icon: t.icon, text: t.text, urgent: t.pri >= 80, acts: t.act ? [{ label: 'Go', ok: true, fn: t.act }] : [], mute: t.key });
  return phoneOn() ? hubShort(L) : L;
}
/* 3D.350 (owner, 24 Nov, W270: "lots of reading all over the place will not be helping to keep the attention of the players"; rules 3 and 4: the same
   warning once, with a count; titles of two to four words). Phone look only. Workplaces without a worker become one row that opens Workplaces;
   rows that read the same after shortening are one row with "×n"; long titles lose their explanation (after " · ", " (" or ": "). */
const HUB_SHORT = [[/^The Haven can reach the next level$/, 'Ready to level up'], [/^(.+?) has no (?:worker|[A-Za-z ]+?): .*$/, '$1: no worker'],
  [/^Your wall ring has (\d+) gaps?$/, (m, n) => `${n} gap${n > 1 ? 's' : ''} in the wall`], [/^No backup this week.*$/, 'No backup this week'],
  [/^(\w+) runs out in about (\d+) (h|days?).*$/, '$1 gone in $2 $3'], [/^(\w+) runs out in about ([\d.]+) days$/, '$1 gone in $2 days'],
  [/^(.+?) slipped out of the (.+?) before it fell\.?$/, '$1 fled the $2'], [/^A horde of (\d+) zombies is at the walls.*$/, 'Horde of $1 at the walls'],
  [/^Out of (\w+)\b.*$/, 'Out of $1'], [/^(.+?) is down · (\d+ s left) · .*$/, '$1 down · $2'], [/^(.+?) breached · (\d+ zombies?|no zombies) near.*$/, '$1 breached · $2'], [/^Saving failed.*$/, 'Saving failed']];
function hubShortText(t) { t = String(t || ''); for (const [re, to] of HUB_SHORT) if (re.test(t)) return t.replace(re, to); if (t.split(' ').length > 5) { const c = t.search(/ · | \(|: /); if (c > 0) t = t.slice(0, c); } return t.replace(/[.!]$/, ''); }
function hubShort(L) {
  const out = [], staff = L.filter((q) => /^t:staff/.test(q.key));
  for (const q of L) {
    if (staff.length > 1 && staff.includes(q)) { if (q !== staff[0]) continue; out.push({ ...q, key: 't:staffAll', text: `${staff.length} jobs need a worker`, acts: [{ label: 'Go', ok: true, fn: () => showJobs(null, 'work') }], mute: null, muteAll: staff.map((x) => x.mute) }); continue; }
    const t = hubShortText(q.text), same = out.find((o) => o.text0 === t && !o.muteAll);
    if (same) { same.n++; same.text = `${t} ×${same.n}`; continue; }
    out.push({ ...q, text: t, text0: t, n: 1 });
  }
  return out;
}
/* 3D.195 (owner, 16 Nov, U13): the alert button goes under an open menu. Where the menu reaches the button it is hidden whole, never cut in half,
   and it comes back when the menu closes or gets shorter. A menu that stays clear of it leaves it showing. */
function menuCover() {
  const b = $('alertBtn'), p = $('infoPanel'); if (!b || !p) return; let cov = false;
  if (p.classList.contains('show') && b.style.display !== 'none') { const br = b.getBoundingClientRect(), pr = p.getBoundingClientRect(); cov = br.bottom > pr.top + 1 && br.top < pr.bottom && br.right > pr.left && br.left < pr.right; }
  b.classList.toggle('under', cov);
}
function alertHub() {
  const w = $('world'); if (!w) return; let b = $('alertBtn');
  if (!b) { b = document.createElement('button'); b.id = 'alertBtn'; b.className = 'alertBtn'; b.innerHTML = `<span class="abI">${window.ZHIcons ? ZHIcons.svg('warn', 34) : '⚠'}</span><b class="abN"></b>`; w.appendChild(b); b.onclick = (e) => { e.stopPropagation(); hubOpen = !hubOpen; alertHub(); };
    { const ip = $('infoPanel'); if (ip) { if (window.ResizeObserver) new ResizeObserver(menuCover).observe(ip); if (window.MutationObserver) new MutationObserver(menuCover).observe(ip, { attributes: true, attributeFilter: ['class'] }); addEventListener('resize', menuCover); } } }
  const L = hubItems(), n = L.length, fresh = L.some((q) => !hubSeen.has(q.key)), urgent = L.some((q) => q.urgent);
  b.style.display = n ? 'flex' : 'none'; b.querySelector('.abN').textContent = n; b.classList.toggle('flash', fresh && !hubOpen); b.classList.toggle('urgent', urgent);
  { const q = $('quest'), wr = w.getBoundingClientRect(); if (q) b.style.top = Math.round((q.getBoundingClientRect().bottom - wr.top + 10) / UI_U) + 'px'; const rb = $('radioBtn'); if (rb) rb.style.top = ((parseInt(b.style.top) || 120) + (n ? 64 : 0)) + 'px'; } menuCover();
  let pop = $('alertPop'); if (!hubOpen || !n) { if (pop) pop.remove(); if (!n) hubOpen = false; return; }
  for (const q of L) hubSeen.add(q.key);
  if (!pop) { pop = document.createElement('div'); pop.id = 'alertPop'; pop.className = 'alertPop'; w.appendChild(pop); pop.onclick = (e) => e.stopPropagation(); }
  pop.style.top = (parseInt(b.style.top) || 120) + 'px';
  const sig = L.map((q) => q.key + q.text + q.acts.map((c) => c.label + c.ok).join()).join('|'); if (pop.dataset.sig === sig) return; pop.dataset.sig = sig;
  /* 3D.354 (owner, 24 Nov, W270: "the warning menu should match the style we are going for with the iphone menu"): in the phone look Needs you is
     a frosted glass sheet like the phone's notifications: a large title, a small grey close, small grey group titles (Now, Tips), and each row a
     notification card with a coloured square sign, the short title, a lime Go and a small grey ✕. Same classes and handlers as before. */
  const cx = window.ZHIcons ? ZHIcons.svg('cross', 12) : '✕', rowH = (q, i) => `<div class="apRow${q.urgent ? ' urg' : ''}" data-i="${i}"><span class="apI">${q.icon}</span><span class="apT">${esc(q.text)}</span>${q.acts.map((c, j) => `<button class="apA" data-j="${j}"${c.ok ? '' : ' disabled'}>${esc(c.label)}</button>`).join('')}${q.mute || q.muteAll ? `<button class="apM" title="Hide until tomorrow" aria-label="Hide until tomorrow"><span>${cx}</span></button>` : ''}</div>`;
  if (phoneOn()) { const now = L.map((q, i) => [q, i]).filter(([q]) => q.urgent), tips = L.map((q, i) => [q, i]).filter(([q]) => !q.urgent);
    pop.classList.add('phNote'); pop.innerHTML = `<div class="apH"><b>Needs you</b><button class="apX" aria-label="Close">${cx}</button></div>` + (now.length ? `<div class="apS">Now</div>` + now.map(([q, i]) => rowH(q, i)).join('') : '') + (tips.length ? `<div class="apS">Tips</div>` + tips.map(([q, i]) => rowH(q, i)).join('') : '');
  } else { pop.classList.remove('phNote');
  pop.innerHTML = `<div class="apH"><b>Needs you</b><button class="apX">${window.ZHIcons ? ZHIcons.svg('cross', 16) : '✕'}</button></div>` + L.map((q, i) => `<div class="apRow${q.urgent ? ' urg' : ''}" data-i="${i}"><span class="apI">${q.icon}</span><span class="apT">${esc(q.text)}</span>${q.acts.map((c, j) => `<button class="apA" data-j="${j}"${c.ok ? '' : ' disabled'}>${esc(c.label)}</button>`).join('')}${q.mute || q.muteAll ? `<button class="apM" title="Hide until tomorrow" aria-label="Hide until tomorrow"><span>${window.ZHIcons ? ZHIcons.svg('cross', 12) : '✕'}</span></button>` : ''}</div>`).join(''); }
  if (window.ZHIcons && ZHIcons.swap) try { ZHIcons.swap(pop); } catch (e) { /* emoji stay */ }
  pop.querySelector('.apX').onclick = () => { hubOpen = false; alertHub(); };
  pop.querySelectorAll('.apRow').forEach((r) => { const q = L[+r.dataset.i];
    r.onclick = () => { const p = q.at && q.at(); if (p) { centerOn(p.x, p.y); hubOpen = false; alertHub(); } };
    { const m = r.querySelector('.apM'); if (m) m.onclick = (e) => { e.stopPropagation(); S.advMute = { ...(S.advMute || {}), ...Object.fromEntries((q.muteAll || [q.mute]).map((k) => [k, S.day])) }; say('Hidden until tomorrow.'); alertHub(); }; }   /* 3D.186 (W40): a tip can be hidden for the day again; the old tip line had a ✕ for this. Emergencies have no ✕. */
    r.querySelectorAll('.apA').forEach((bt) => { bt.onclick = (e) => { e.stopPropagation(); const c = q.acts[+bt.dataset.j]; if (c && c.ok) { hubOpen = false; alertHub(); c.fn(); } alertsTick(); }; }); });
}
document.addEventListener('pointerdown', (e) => { if (hubOpen && !e.target.closest('#alertPop, #alertBtn')) { hubOpen = false; alertHub(); } });
function setTxt(el, t) { if (el && el.textContent !== t) el.textContent = t; }
function renderAlerts() {
  if (GLASS) { alertHub(); return; }   /* 3D.30: one flashing alert button instead of rows */
  const box = $('alerts'); if (!box) return; const L = [...alerts.values()].filter((a) => !a.dismissed), max = sel ? 1 : 3, show = L.slice(0, max);   /* while placing, only one compact row */
  const keep = new Set(show.map((a) => a.key));
  for (const el of [...box.children]) if (!el.dataset.k || !keep.has(el.dataset.k)) el.remove();
  show.forEach((a, i) => {
    let el = box.querySelector(`.alert[data-k="${CSS.escape(a.key)}"]`); if (!el) el = alertRow(a);
    if (box.children[i] !== el) box.insertBefore(el, box.children[i] || null);
    setTxt(el.querySelector('.at'), a.text); const go = el.querySelector('.ago'); if (go) go.style.visibility = atOf(a) ? 'visible' : 'hidden';
    el.querySelectorAll('.aa').forEach((bt) => { const c = a.acts[+bt.dataset.i], ok = !c.ok || c.ok(); setTxt(bt, typeof c.label === 'function' ? c.label() : c.label); if (bt.disabled === ok) bt.disabled = !ok; });
  });
  if (L.length > max) { const m = document.createElement('div'); m.className = 'alert more'; m.textContent = `+${L.length - max} more · tap to show`;
    m.onclick = (e) => { e.stopPropagation(); const first = [...alerts.values()].find((q) => !q.dismissed); if (first) { alerts.delete(first.key); alerts.set(first.key, first); renderAlerts(); } }; box.appendChild(m); }
}
/* V2.35 shortage warnings from the forecast: a critical alert under ~1 day left (until it recovers), a banner under 2 days (once a day),
 * tomorrow's upkeep that can't be paid, and storage that is full and wasting production */
const SHORT_ICON = { food: '🍖', water: '💧', mat: '⚙', wood: '🪵', stone: '🪨', cloth: '🧵', meds: '💊', fuel: '⛽', ammo: '🔸' };
function shortageCheck() {
  const E = econ(), day = S.day;
  for (const k of ['food', 'water']) {
    const e = E[k], nm = RES_TITLE[k];
    if (e.days < 1.2 && e.stock >= 1) note('critical', `${nm} runs out in about ${Math.max(1, Math.round(e.days * 24))} h`, { key: 'low' + k, icon: SHORT_ICON[k], live: () => econ()[k].days < 1.6 && S[k] >= 1,
      dyn: () => { const q = econ()[k]; return `${nm} runs out in about ${Math.max(1, Math.round(q.days * 24))} h · ${sgn(q.net)} / day`; }, acts: [{ label: 'Why?', fn: () => showResource(k) }, { label: 'Build', fn: () => { bCat = 'live'; showBuild(); } }] });
    else if (e.days < 2 && (S.warnDay || {})[k] !== day) { S.warnDay = { ...(S.warnDay || {}), [k]: day }; note('important', `⚠ ${nm.toUpperCase()}: ABOUT ${e.days.toFixed(1)} DAYS LEFT`, { log: `${nm} is going down by ${f1(-e.net)} a day: about ${e.days.toFixed(1)} days left. Tap ${nm.toLowerCase()} at the top to see why.` }); }
    if (e.full && e.net > .2 && (S.warnDay || {})[k + 'Full'] !== day) { S.warnDay = { ...(S.warnDay || {}), [k + 'Full']: day }; note('important', `${SHORT_ICON[k]} ${nm.toUpperCase()} STORAGE FULL`, { log: `${nm} storage is full (${e.cap}): extra production is wasted. Build Storage, or use it (feasts, trades).` }); }
  }
  const up = upkeepTotal(); if (S.hour === 18 && S.mat + (S.wood || 0) < up && (S.warnDay || {}).up !== day) { S.warnDay = { ...(S.warnDay || {}), up: day }; note('important', `⚙ UPKEEP TONIGHT: ${f1(up)} WOOD + SCRAP, YOU HAVE ${Math.floor(S.mat + (S.wood || 0))}`, { log: `Upkeep at midnight is ${f1(up)} scrap and you have ${Math.floor(S.mat)}: some buildings will run at half output tomorrow (water, food and medical are paid first).` }); }
}
function rationNeed() { let f = 0; for (const q of S.sv) f += ration(q) / 2; for (const k of S.kids || []) f += .25; return { f, w: f }; }   // a day of rations: half food, half water
/* 3D.167 play-test round 1 (New player, Defender, Raider): when someone lies down with nobody coming, say why in one line and what would fix it.
   It mirrors the checks in assignRescue */
/* 3D.168 play-test round 1 (Caretaker): mood (♥, 0-100) had no number and no reason anywhere. moodAdd keeps what moved it, per day, so the
   person panel, the People list and the morning card can say "♥22 · grieving for Rosa, saw Ben die" */
function moodAdd(q, v, why) {
  if (!q || !v || !why) return; const L = (q.mLog = q.mLog || []), e = L.find((x) => x.why === why && x.d === S.day);
  if (e) e.v += v; else { L.push({ d: S.day, why, v }); if (L.length > 14) L.shift(); }
}
const moodWord = (v) => v >= 60 ? 'happy' : v >= 35 ? 'settled' : v >= 15 ? 'unsettled' : 'unhappy';   /* 35 = wants to move in for good; under 25 The Hollow can lure them away */
function moodWhy(q, n = 2) {   /* the biggest reasons from the last 3 days, plus what is missing */
  const L = (q.mLog || []).filter((x) => S.day - x.d <= 2), by = {}; for (const x of L) by[x.why] = (by[x.why] || 0) + x.v;
  const top = Object.entries(by).filter(([, v]) => Math.abs(v) >= 1).sort((a, b) => Math.abs(b[1]) - Math.abs(a[1])).slice(0, n).map(([w, v]) => `${w} (${v > 0 ? '+' : ''}${Math.round(v)})`);
  const tips = [];
  if (!world.buildings.some((b) => isT(b, 'house') && b.owner === q.id)) tips.push('no House of their own');
  if (!Object.entries(q.rel || {}).some(([id, v]) => v >= BOND.friend && S.sv.some((x) => x.id === +id))) tips.push('no friends yet');
  return { top, tips };
}
function moodLine(q) { const v = Math.round(q.sat || 0), w = moodWhy(q); return `♥${v} ${moodWord(v)}` + (w.top.length ? ' · ' + w.top.join(', ') : '') + (w.tips.length && v < 35 ? ' · ' + w.tips.join(', ') : ''); }
function noRescueWhy(q) {
  if (lastStand()) return 'the last few are hiding until the zombies move on · call radio help';
  const near = S.z.filter((z) => z.hp > 0 && dist(z.w, q.w) < 2.5), crowd = near.length, foe = near.some((z) => z.human) ? (crowd > 1 ? 'raiders' : 'raider') : (crowd > 1 ? 'zombies' : 'zombie');
  const able = S.sv.filter((r) => r !== q && r.mode !== 'down' && r.mode !== 'hospital' && r.hp > r.max * .3);
  if (!able.length) return 'nobody is fit to go (down, hurt or in care) · call radio help or bandage them';
  if (crowd && !q.ordered) return `${crowd} ${foe} next to them: nobody walks in on their own · tap Send rescue, or clear them`;
  if (crowd && !able.some((r) => isFighter(r))) return `${crowd} ${foe} next to them and no fighter free · call radio help or the militia`;
  const stuck = able.filter((r) => (r.noRescueT || 0) > tick);
  if (stuck.length && stuck.length >= able.length - 1) return `${stuck[0].name} couldn't get to them (path blocked) · put a Gate in the wall (Build → Defend → Gate, tap a wall section) or clear the way`;
  if (able.every((r) => r.rescuing || r.carrying)) return 'everyone fit is already carrying someone';
  const fighting = able.filter((r) => ['chase', 'attack', 'recover'].includes(r.mode) && S.z.some((z) => z.hp > 0 && dist(z.w, r.w) < Math.max(2.2, rangeOf(r) + 1))).length;
  if (fighting && fighting >= able.length - 1) return `the fit ones are fighting · they come when it's clear, or call radio help`;
  const hid = able.filter((r) => r.mode === 'hiding').length;
  if (hid && hid >= able.length - 1) return 'the others are hiding: they come out once the zombies leave';
  return 'the nearest free survivor will come';
}
function downWhyTick() {   /* down for a game hour with nobody coming: one news line saying why */
  for (const q of S.sv) if (q.mode === 'down' && !q.rescuer && !q.whyLogged && tick - (q.downAt ?? (q.downAt = tick)) > 1000) { q.whyLogged = true; logEvent(`🩸 Nobody is reaching ${q.name}: ${noRescueWhy(q)}`, 'important'); }
}
function downAlert(s) {
  s.downAt = tick; s.whyLogged = false;
  note('critical', s.name + ' is down', { key: 'down' + (s.id || s.name), icon: '🩸', log: s.name + ' collapsed! Rescue within ' + Math.round(s.bleed / 60) + ' s.', at: () => s.w, live: () => s.mode === 'down' && S.sv.includes(s),
    dyn: () => `${s.name} is down · ${Math.max(0, Math.ceil((s.bleed || 0) / 60))} s left · ` + (s.rescuer ? (s.rescuer.carrying === s ? `${s.rescuer.name} is bringing them in` : `${s.rescuer.name} is on the way`) : 'no rescuer: ' + noRescueWhy(s)),
    acts: [{ label: () => (s.ordered ? 'Rescue sent 🛡' : 'Send rescue 🛡'), ok: () => !s.ordered, fn: () => orderRescue(s) }, { label: () => (S.cloth || 0) >= 1 ? 'Bandage 🧵1' : 'Bandage ⚙' + BANDAGE_COST * 2, ok: () => (S.cloth || 0) >= 1 || S.mat >= BANDAGE_COST * 2, fn: () => useBandage(s) }] });
}
function raidAlert(n) {
  const alive = () => S.z.filter((z) => z.human && z.hp > 0 && !z.escaped);
  note('critical', `${n} raiders sneaking in`, { key: 'raid', icon: '🏴', log: `${n} raiders are sneaking toward the Haven. They'll steal supplies and fight anyone in the way.`, at: () => { const r = alive()[0]; return r ? r.w : null; }, live: () => alive().length > 0, dyn: () => { const k = alive().length; return `${k} raider${k > 1 ? 's' : ''} in the area · they steal supplies`; } });
}
/* wall breach: one alert per broken piece until it is repaired; "Repair first" queues it ahead of other damage (still needs scrap and no zombie
 * within reach, the normal repair rules); "Send defender" sends the best free fighter at the closest zombie */
let repairFirst = null;
const wallHot = (wl) => S.z.some((z) => z.hp > 0 && dist(z.w, wc(wl)) < 2.6);
function bestDefender(c) {
  let best = null, bs = -1e9; for (const q of S.sv) { if (q.hp <= q.max * .4 || q.carrying || ['down', 'away', 'errand', 'hospital', 'rescueTo', 'rescueCarry', 'chase', 'attack'].includes(q.mode)) continue;
    const sc = (professions[q.job]?.combat || 0) * 4 + (weaponOf(q).atk || 0) * .3 - dist(q.w, c); if (sc > bs) { bs = sc; best = q; } }
  return best;
}
function sendDefender(c) { const q = bestDefender(c); let z = null, d = 6; for (const o of S.z) if (o.hp > 0 && dist(o.w, c) < d) { d = dist(o.w, c); z = o; } if (!q || !z) return false; engage(q, z); q.why = 'Defending the breach'; say(`${q.name} is heading to the breach.`); return true; }
function breachAlert(wl) {
  const gate = wl.type === 'gate', nm = gate ? 'Gate' : 'Wall', c = wc(wl), near = () => S.z.filter((z) => z.hp > 0 && !z.human && dist(z.w, c) < 6).length;
  note('critical', `${nm} breached`, { key: 'breach' + wallId(wl), icon: '🧱', at: c, threats: true, log: `${gate ? 'The gate' : 'A wall section'} broke! Zombies can walk through until it is repaired (automatic, costs scrap).`,
    live: () => wl.broken && wallLive(wl),
    dyn: () => { const n = near(); return `${nm} breached · ${n ? n + ' zombie' + (n > 1 ? 's' : '') + ' near' : 'no zombies near'} · ` + (S.mat < 1 ? 'no scrap to repair' : wallHot(wl) ? 'repair waiting' : 'repairing'); },
    acts: [{ label: 'Repair first', ok: () => S.mat >= 1 && repairFirst !== wl, fn: () => { repairFirst = wl; say('The repair crew will fix this breach first (once no zombie is close).'); } },
      { label: 'Send defender', ok: () => near() > 0 && !!bestDefender(c), fn: () => sendDefender(c) }] });
}
function restoreAlerts() {   // alerts are not saved: re-raise the ones whose emergency is still going on after a load
  const was = OPTS.autoSlow; OPTS.autoSlow = false; for (const q of S.sv) if (q.mode === 'down') downAlert(q); for (const wl of allWalls()) if (wl.broken) breachAlert(wl);
  for (const b of world.buildings) if (b.fire) note('critical', `Fire at the ${DEFS[b.type].name}`, { key: 'fire' + b.x + ',' + b.y, icon: '🔥', at: { x: b.x + b.w / 2, y: b.y + b.h / 2 }, live: () => !!b.fire && world.buildings.includes(b) }); OPTS.autoSlow = was;
}
function drawAlertMarks() {   // pulsing ring on the spot, red rings on nearby threats, an arrow at the screen edge when the spot is off screen
  const t = performance.now() / 1000;
  for (const a of alerts.values()) {
    if (a.dismissed || performance.now() - (a.seen || 0) > 12000) continue;   /* 3D.63 owner: 25 alerts left 25 orange rings on the map that said nothing; a ring now shows for 12 s when the alert is new or when you tap it */ const w = atOf(a); if (!w) continue; const p = project(w.x, w.y), tw = TWs(), pulse = .5 + .5 * Math.sin(t * 2.5);   /* V2.35: slow, soft pulse */
    if (a.threats) for (const z of S.z) if (z.hp > 0 && dist(z.w, w) < 5) { const q = project(z.w.x, z.w.y); spinArrow(q.x, q.y - CHAR_H * tw - 4, '#ff5a4a', hudU() * .8); }
    const on = p.x > 20 && p.x < VW - 20 && p.y > 20 && p.y < VH - 20;
    if (on) { spinArrow(p.x, p.y - .55 * tw, '#ff8a46', hudU()); continue; }   /* 3D.122 owner: no rings; an arrow marks the spot */
    const cx = VW / 2, cy = VH / 2, dx = p.x - cx, dy = p.y - cy, k = Math.min((VW / 2 - 30) / Math.abs(dx || 1e-6), (VH / 2 - 70) / Math.abs(dy || 1e-6)), ex = cx + dx * k, ey = cy + dy * k, ang = Math.atan2(dy, dx);
    ctx.save(); ctx.translate(ex, ey); ctx.globalAlpha = .9; ctx.fillStyle = '#d8352b'; ctx.strokeStyle = '#fff3d6'; ctx.lineWidth = 2;
    ctx.beginPath(); ctx.arc(0, 0, 17, 0, 7); ctx.fill(); ctx.stroke(); ctx.rotate(ang); ctx.beginPath(); ctx.moveTo(25, 0); ctx.lineTo(15, -7); ctx.lineTo(15, 7); ctx.closePath(); ctx.fillStyle = '#fff3d6'; ctx.fill(); ctx.restore();
    stampText(a.icon, ex, ey + 7, '17px sans-serif', '#fff');
  }
}
function bOf(type) { return world.buildings.filter((b) => b.type === type || (DEFS[b.type] && DEFS[b.type].like === type)); }
/* V3D.23: newer tier types act like an older type (DEFS.like) wherever the game asks for that type */
function isT(b, t) { return !!b && (b.type === t || (DEFS[b.type] && DEFS[b.type].like === t)); }
function aliasT(tab) { for (const [k, d] of Object.entries(DEFS)) if (d.like && tab[d.like] !== undefined && tab[k] === undefined) tab[k] = tab[d.like]; return tab; }

