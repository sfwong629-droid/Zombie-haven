/* ---- 3D.113 Endgame A: the City stage. Levels 16-20 (Era IV), a Banner to enter it, City Limits territory at 16, +3 people a level,
   and three City buildings: Town Hall (renown every day, +1 Specialist and Hybrid slot), Market Square (a trader every day) and
   the Water Tower (big powered water). Level 20 grants the City Charter. ---- */
function cityDaily() {
  const th = bOf('townhall').filter((b) => !b.unpaid).length; if (th) renownGain(3 * th, 'Town Hall');
  if ((S.lvl || 1) >= 20 && !S.charter) { S.charter = S.day; SFX('reward'); showEventPopup({ title: '🏙 THE CITY CHARTER', text: `${esc(S.townName || 'The Haven')} is a city now: level 20, the top of Era IV. People on the radio call it the last real city in the region.<br><br>Everything keeps running: crises, seasonal strongholds and your legacy for the next Haven.`, buttons: [{ label: 'WONDERFUL' }] }); renownGain(100, 'City Charter'); }
}
/* ---- 3D.112 Endgame D: legacy start (owner 11 Nov). From Haven level 15 (or after the convoy), you can lay down a legacy:
   two veterans, one heirloom from the stash and perks earned by the old town (one, plus one per 3 Crisis Medals or seasonal
   trophies, up to three). The next new game started with "Legacy start" on gets them. Called "Founders' legacy" in the game
   so it isn't mixed up with the Legacy goals. ---- */
const LEG_PERKS = {
  seeds:   { icon: '🌱', name: 'Seed bank',        desc: 'Gardens grow 20% more for the first 20 days.' },
  friends: { icon: '🌿', name: 'Old friends',      desc: 'Greenwater starts friendly (attitude 40).' },
  hoard:   { icon: '📦', name: 'Scrap hoard',      desc: 'Start with 40 more scrap and 20 more wood.' },
  drilled: { icon: '💪', name: 'Drilled',          desc: 'Everyone in the starting crew has +1 Strength and +1 Endurance.' },
  wheels:  { icon: '🛒', name: "Mechanic's notes", desc: 'Start with a Hand Cart.' },
  medic:   { icon: '💊', name: 'Field kits',       desc: 'Start with 8 medicine and 6 cloth.' },
};
const legacyReady = () => (S.lvl || 1) >= 15 || !!S.won;
const legacyPerkN = () => Math.min(3, 1 + Math.floor(((S.medals || 0) + (S.trophies || []).length) / 3));
const legacySaved = () => { try { return JSON.parse(localStorage.getItem('zhLegacy') || 'null'); } catch (e) { return null; } };
const legSel = { vets: null, heir: null, perks: [] };
/* 3D.145 the trophy shelf: what this town has beaten, and the best towns on this device */
function trophyList() {
  const out = [], F = S.fac || {};
  for (const k of ['toll', 'green', 'foundry', 'quar', 'helix', 'hollow']) { const D = SH_DEFS['raid_' + k], b = D && D.areas[2] && D.areas[2].boss, n = (F[k] || {}).beaten || 0; out.push({ k, icon: '👑', name: b ? b.name : FACTIONS[k].name, sub: FACTIONS[k].name, n, how: (F[k] || {}).met ? 'Beat the leader of ' + FACTIONS[k].name : 'A faction you have not met yet' }); }
  for (const k of ['sh_spring', 'sh_summer', 'sh_autumn', 'sh_winter']) { const n = (S.trophies || []).filter((t) => t.k === k).length; out.push({ k, icon: EXP_DEFS[k].icon, name: EXP_DEFS[k].name, sub: 'Seasonal stronghold', n, how: 'Clear it in its season' }); }
  out.push({ k: 'boss', icon: '☠️', name: 'Mutant Bosses', sub: 'Put down', n: S.bossKills || 0, how: 'Kill a Mutant Boss' });
  out.push({ k: 'crisis', icon: '🏅', name: 'Crises', sub: 'Weathered', n: S.medals || 0, how: 'Come through a town crisis' });
  out.push({ k: 'banner', icon: '🏴', name: 'Banners', sub: 'Earned', n: (S.banners || []).length, how: 'Earn a Banner' });
  out.push({ k: 'convoy', icon: '🚚', name: 'The Convoy', sub: S.won ? 'Day ' + S.won.day + ' · score ' + S.won.score : 'The ending', n: S.won ? 1 : 0, how: 'Call the convoy and hold out' });
  return out;
}
/* 3D.399 (W249, phone idea 11; owner, 28 Nov: "then do the wallet" … "Do it like you suggested"): More → Wallet, the trophies as cards in a stack
   like the phone's Wallet (earned first, the rest dark with a lock); a tap opens a card: its front, the story (facts first, joke last) and when it was won. */
const WAL_COL = { toll: '#b8862b', green: '#4f9c5e', foundry: '#8a5a3b', quar: '#5a6a7a', helix: '#6b5aa6', hollow: '#4a4a58', sh_spring: '#7aa35a', sh_summer: '#d0a038', sh_autumn: '#c46a2e', sh_winter: '#5f86b8', boss: '#b0303a', crisis: '#d9922b', banner: '#4a82c8', convoy: '#3fa39a' };
const WAL_JOKE = { toll: 'Nobody has paid a toll since.', green: 'The compost heap is under new management.', foundry: 'The furnace is cold. So is he.', quar: 'Quarantine lifted. Permanently.', helix: 'His lab coat is a dish towel now.', hollow: 'The Hollow is a little hollower.',
  sh_spring: 'The flowers were not impressed.', sh_summer: 'Hot work. Nobody asked for sunscreen.', sh_autumn: 'They fell like leaves.', sh_winter: 'Cold out there. Colder for them.',
  boss: 'They were big. Not big enough.', crisis: 'The town is still standing. Mostly.', banner: 'Flags are cheap. These were not.', convoy: 'The convoy came. Somebody has to drive it.' };
const WAL_LOCK = '<svg class="wlLk" viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" aria-label="Locked"><rect x="5" y="11" width="14" height="10" rx="2.2"/><path d="M8 11V7.5a4 4 0 0 1 8 0V11"/></svg>';
function walStory(t) {
  const F = (S.fac || {})[t.k]; if (!t.n) return t.how + '.';
  if (FACTIONS[t.k]) return `${t.name} led ${FACTIONS[t.k].name}. Beaten ${t.n === 1 ? 'once' : t.n + ' times'}. ${WAL_JOKE[t.k]}`;
  if (EXP_DEFS[t.k]) return `${t.name}, cleared in its season ${t.n === 1 ? 'once' : t.n + ' times'}. ${WAL_JOKE[t.k]}`;
  if (t.k === 'boss') return `${t.n} Mutant Boss${t.n > 1 ? 'es' : ''} put down. ${WAL_JOKE.boss}`;
  if (t.k === 'crisis') return `${t.n} town crisis${t.n > 1 ? 'es' : ''} weathered. ${WAL_JOKE.crisis}`;
  if (t.k === 'banner') return `${t.n} Banner${t.n > 1 ? 's' : ''} raised over the Haven. ${WAL_JOKE.banner}`;
  if (t.k === 'convoy') return `The convoy was called and the Haven held out. ${WAL_JOKE.convoy}`;
  return t.how + '.';
}
function walWon(t) {   /* the days we know; otherwise the count */
  if (!t.n) return '';
  if (EXP_DEFS[t.k]) return (S.trophies || []).filter((x) => x.k === t.k).map((x) => 'Day ' + x.day).join(' · ');
  if (t.k === 'banner') return (S.banners || []).map((b) => 'Day ' + b.day + ' · ' + ((BANNER_ROUTES[b.route] || {}).name || 'Banner')).join('<br>');
  if (t.k === 'convoy' && S.won) return 'Day ' + S.won.day + ' · score ' + S.won.score;
  return '×' + t.n;
}
function walOrder() { const L = trophyList(); return L.filter((t) => t.n).concat(L.filter((t) => !t.n)); }
function walPass(t, i, cls) { const c = WAL_COL[t.k] || '#555'; if (FACTIONS[t.k] && !((S.fac || {})[t.k] || {}).met) t = { ...t, name: '???', sub: '???' };   /* owner, 28 Nov: "Yes show ???" for factions not met */
  return `<div class="wlPass${t.n ? '' : ' lock'}${cls ? ' ' + cls : ''}" role="button" data-i="${i}" style="--wc:${c}"><div class="wlTop"><span class="wlIc">${t.icon}</span><span class="wlNm"><b>${esc(t.name)}</b><small>${esc(t.sub)}</small></span><span class="wlN">${t.n ? '×' + t.n : WAL_LOCK}</span></div><div class="wlHow">${esc(t.how)}</div></div>`; }
function showWallet(back) {
  endBuildMode(true); closeP(); const L = walOrder(), got = L.filter((t) => t.n).length;
  $('ib').innerHTML = `<div class="wlSheet"><div class="wlCnt">${got} of ${L.length} earned</div><div class="wlStack">${L.map((t, i) => walPass(t, i, i === L.length - 1 ? 'open' : '')).join('')}</div></div>`;
  $('ib').querySelectorAll('.wlPass').forEach((c) => { c.onclick = () => showWalletCard(+c.dataset.i, back); });
  showPanel('Wallet', back || null); if (back) $('pBack').dataset.t = 'More';
}
function showWalletCard(i, back) {
  endBuildMode(true); closeP(); const t = walOrder()[i]; if (!t) return showWallet(back); const w = walWon(t);
  $('ib').innerHTML = `<div class="wlSheet wlOne">${walPass(t, i, 'big')}<div class="wlBack"><b>The story</b>${esc(walStory(t))}</div>${w ? `<div class="wlBack"><b>Won</b>${w}</div>` : ''}</div>`;
  showPanel('Wallet', () => showWallet(back)); $('pBack').dataset.t = 'Wallet';
}
const trophyCount = () => trophyList().filter((t) => t.n > 0).length;
function trophyCard() { const L = trophyList(); return `<div class="card" style="margin-top:8px"><b>🏆 Trophy shelf</b> <span class="sm">${L.filter((t) => t.n > 0).length}/${L.length}</span><div style="display:flex;gap:3px;flex-wrap:wrap;margin:5px 0">${L.map((t) => `<span style="font-size:20px;opacity:${t.n ? 1 : .25};filter:${t.n ? 'none' : 'grayscale(1)'}">${t.icon}</span>`).join('')}</div><button class="act" id="trOpen" style="width:100%">Open the shelf</button></div>`; }
function showTrophies() {
  closeP(); $('it').textContent = 'TROPHY SHELF'; const L = trophyList(), R = records(), recs = Object.entries(R).sort((a, b) => b[1].score - a[1].score).slice(0, 6);
  const tile = (t) => `<div style="flex:1 1 44%;box-sizing:border-box;border-radius:10px;padding:7px 6px;text-align:center;background:${t.n ? 'rgba(255,214,107,.16)' : 'rgba(255,255,255,.05)'};border:1px solid ${t.n ? 'rgba(255,214,107,.6)' : 'rgba(255,255,255,.12)'}"><div style="font-size:30px;line-height:1.1;opacity:${t.n ? 1 : .3};filter:${t.n ? 'none' : 'grayscale(1)'}">${t.icon}</div><b style="font-size:15px">${t.n ? esc(t.name) : '???'}</b>${t.n > 1 ? ` <span class="sm">×${t.n}</span>` : ''}<div class="sm" style="opacity:.8">${t.n ? esc(t.sub) : esc(t.how)}</div></div>`;
  const recName = (k) => { const [a, m] = k.split('+').length > 1 ? [k.split('+')[0], k.split('+').slice(1)] : [k, []], df = DIFFS[a.split('/')[1]] || DIFFS.normal; return df.icon + ' ' + df.name + modTag(m); };
  $('ib').innerHTML = `<div class="sm" style="margin-bottom:6px">${L.filter((t) => t.n > 0).length} of ${L.length} on the shelf in ${esc(S.townName || 'the Haven')}.</div><div style="display:flex;gap:6px;flex-wrap:wrap">${L.map(tile).join('')}</div>`
    + `<div class="card" style="margin-top:8px"><b>🏆 Best towns on this device</b>${recs.length ? recs.map(([k, r]) => `<div><b>${r.score}</b> · ${esc(r.name)} <span class="sm">day ${r.day} · ${recName(k)}</span></div>`).join('') : '<div class="sm">No town has met the convoy yet.</div>'}</div><button class="act" id="trBack">Back to goals</button>`;
  showPanel(); $('trBack').onclick = showGoals;
}
function legacyCard() {
  const sv = legacySaved(); if (!legacyReady()) return `<div class="card"><b>🌳 Founders' legacy</b><div class="sm">At Haven level 15 you can lay down a legacy for your next Haven: two veterans, an heirloom and perks.${sv ? ` Saved now: from ${esc(sv.from)}.` : ''}</div></div>`;
  return `<div class="card"><b>🌳 Founders' legacy</b><div class="sm">Pass two veterans, an heirloom and ${legacyPerkN()} perk${legacyPerkN() > 1 ? 's' : ''} on to your next Haven.${sv ? ` The saved legacy from ${esc(sv.from)} would be replaced.` : ''}</div><button class="act" id="legOpen">Lay down a legacy</button></div>`;
}
function showLegacy() {
  endBuildMode(true); closeP(); $('it').textContent = "Founders' legacy";
  const best = S.sv.filter((q) => q.hp > 0).sort((a, b) => b.l - a.l); if (!legSel.vets) legSel.vets = best.slice(0, 2).map((q) => q.id);
  const stash = Object.entries(S.inv || {}).filter(([id, n]) => n > 0 && ITEMS[id]).map(([id]) => id).sort((a, b) => (ITEMS[b].cost || 0) - (ITEMS[a].cost || 0)); const worn = S.sv.flatMap((q) => Object.values(q.eq || {}).filter((id) => id && ITEMS[id]));
  const items = [...new Set([...stash, ...worn])].slice(0, 12); if (!legSel.heir) legSel.heir = items[0] || null;
  const N = legacyPerkN(); legSel.perks = legSel.perks.filter((k) => LEG_PERKS[k]).slice(0, N);
  $('ib').innerHTML = `<div class="sm">Veterans (pick 2) · they start your next Haven at level ${'≤'}5</div><div class="lst">${best.slice(0, 8).map((q) => `<div class="card" data-lv="${q.id}" style="${legSel.vets.includes(q.id) ? 'border-color:var(--good)' : ''}">${portrait(q)}<div class="sp">${esc(q.name)} <span class="sm">${q.job} Lv.${q.l}</span></div></div>`).join('')}</div>
    <div class="sm">Heirloom (one item)</div><div class="row" style="flex-wrap:wrap;gap:6px">${items.map((id) => `<button class="vehB ${legSel.heir === id ? 'on' : ''}" data-lh="${id}">${esc(ITEMS[id].name)}</button>`).join('') || '<span class="sm">No gear in the stash.</span>'}</div>
    <div class="sm">Perks (${N}: one, plus one for every 3 Crisis Medals or seasonal trophies)</div><div class="row" style="flex-wrap:wrap;gap:6px">${Object.entries(LEG_PERKS).map(([k, p]) => `<button class="vehB ${legSel.perks.includes(k) ? 'on' : ''}" data-lp="${k}">${p.icon} ${p.name}<small>${p.desc}</small></button>`).join('')}</div>
    <button class="act go" id="legSave" style="margin-top:10px">Save the legacy</button><div class="sm">It waits for your next new game: turn on "Legacy start" when you start it. This town carries on as it is.</div>`;
  $('ib').querySelectorAll('[data-lv]').forEach((b) => { b.onclick = () => { const id = +b.dataset.lv; legSel.vets = legSel.vets.includes(id) ? legSel.vets.filter((x) => x !== id) : [...legSel.vets, id].slice(-2); showLegacy(); }; });
  $('ib').querySelectorAll('[data-lh]').forEach((b) => { b.onclick = () => { legSel.heir = b.dataset.lh; showLegacy(); }; });
  $('ib').querySelectorAll('[data-lp]').forEach((b) => { b.onclick = () => { const k = b.dataset.lp; legSel.perks = legSel.perks.includes(k) ? legSel.perks.filter((x) => x !== k) : [...legSel.perks, k].slice(-N); showLegacy(); }; });
  $('legSave').onclick = () => { legacySave(); };
  showPanel("Founders' legacy");
}
function legacySave() {
  if (testTown()) { say('A test town leaves no legacy.'); return false; }   /* 3D.379 W274 */
  const vets = legSel.vets.map((id) => S.sv.find((q) => q.id === id)).filter(Boolean).map((q) => ({ name: q.name, job: q.job, l: q.l, st: q.st, trait: q.trait, age: q.age, south: q.south, skills: q.skills }));
  if (!vets.length) { say('Pick at least one veteran.'); return false; }
  const L = { from: S.townName || 'The Haven', day: S.day, lvl: S.lvl, vets, heir: legSel.heir, perks: legSel.perks.slice(0, legacyPerkN()) };
  try { localStorage.setItem('zhLegacy', JSON.stringify(L)); } catch (e) { say('Could not save the legacy (storage is blocked).'); return false; }
  SFX('reward'); banner('🌳 LEGACY SAVED'); note('important', `🌳 Legacy saved: ${vets.map((v) => v.name).join(' and ')}, ${legSel.heir ? ITEMS[legSel.heir].name : 'no heirloom'}, ${L.perks.map((k) => LEG_PERKS[k].name).join(', ') || 'no perks'}. Start a new game with "Legacy start" on.`); closeP(); return true;
}
function applyLegacy() {
  const L = legacySaved(); if (!L) return; try { localStorage.removeItem('zhLegacy'); } catch (e) { /* ignore */ }
  const e = tc(7 + OFF, 10 + OFF);
  for (const v of L.vets || []) { for (const q0 of S.sv) if (q0.name === v.name) q0.name = freeFirst();   /* the veteran keeps the name */ const l = Math.min(5, v.l || 1), q = mk(v.name, v.job, l, e.x + rnd() * .6, e.y + rnd() * .6, S.sv.length); if (v.st) q.st = { ...v.st }; if (v.trait) q.trait = v.trait; if (v.age) q.age = v.age; q.south = !!v.south; if (Array.isArray(v.skills)) q.skills = v.skills.slice(0, 3); q.veteran = L.from; q.src = 'legacy'; setMaxHp(q); q.hp = q.max; S.sv.push(q); }
  if (L.heir && ITEMS[L.heir]) stashAdd(L.heir);
  for (const k of L.perks || []) {
    if (k === 'seeds') S.seedUntil = 20; if (k === 'friends') { const g = fac('green'); g.att = 40; } if (k === 'hoard') { S.mat += 40; S.wood = (S.wood || 0) + 20; }
    if (k === 'drilled') for (const q of S.sv) { q.st = q.st || {}; q.st.str = (q.st.str || 5) + 1; q.st.end = (q.st.end || 5) + 1; setMaxHp(q); q.hp = q.max; }
    if (k === 'wheels') S.veh = { ...(S.veh || {}), cart: { wear: 0 } }; if (k === 'medic') { S.meds = (S.meds || 0) + 8; S.cloth = (S.cloth || 0) + 6; } }
  S.legacyFrom = { from: L.from, perks: L.perks || [] };
  setTimeout(() => note('important', `🌳 A legacy from ${L.from}: ${(L.vets || []).map((v) => v.name).join(' and ')} came with you${L.heir && ITEMS[L.heir] ? `, carrying the ${ITEMS[L.heir].name}` : ''}.`), 2500);
}
/* ---- 3D.111 Endgame B: weekly faction crises (owner 11 Nov, endgame order B C D A). From Haven level 15, one crisis a week:
   a 2-3 day event led by a faction (or the dead themselves), with a big reward for seeing it through and a cost for failing.
   Each crisis rolls from those that fit the town right now. ---- */
const CRISIS_LVL = 15, CRISIS_EVERY = 7;
const CRISES = {
  siege: { icon: '👑', name: 'The Toll Kings ride in force', fits: () => facOk('toll'), desc: 'Three raid waves tomorrow night, the Toll Collector in the last one. Hold until dawn.',
    start: (c) => { c.night = S.day + 1; }, hour: (c) => { if (S.day === c.night && [21, 22, 23].includes(S.hour)) { spawnRaid('toll', S.hour === 23); c.waves = (c.waves || 0) + 1; } if (S.day === c.night + 1 && S.hour === 6) crisisEnd(S.z.filter((z) => z.human && z.hp > 0 && !z.escaped).length === 0 && (c.lost || 0) === 0 ? 'won' : 'held'); } },
  blight: { icon: '🌿', name: 'Blight at Greenwater', fits: () => { const g = (S.fac || {}).green; return !!(g && g.met && g.att > -20); }, desc: "Greenwater's fields have rotted. They ask for 25 food and 6 medicine within 3 days.",
    start: (c) => { c.until = S.day + 3; c.need = { food: 25, meds: 6 }; }, act: () => { const c = S.crisis; if (S.food < c.need.food || (S.meds || 0) < c.need.meds) { say(`Greenwater needs ${c.need.food} food and ${c.need.meds} medicine.`); return false; } S.food -= c.need.food; S.meds -= c.need.meds; fac('green').att = Math.min(100, fac('green').att + 20); S.seedUntil = S.day + 7; crisisEnd('won'); return true; },
    actLabel: 'Send the aid', day: (c) => { if (S.day >= c.until) { fac('green').att -= 15; crisisEnd('lost'); } } },
  tide: { icon: '🌊', name: 'The Tide', fits: () => true, desc: 'The radio warns of the biggest horde in months. It reaches the walls tomorrow at 21:00, in three waves.',
    start: (c) => { c.night = S.day + 1; }, hour: (c) => { if (S.day === c.night && [21, 22, 23].includes(S.hour)) { c.q = (c.q || 0) + Math.round((14 + 4 * (S.hour - 20) + Math.floor(hDay() / 6)) * DF().count); if (S.hour === 23) spawnBoss(null, true); }
      if (S.day === c.night + 1 && S.hour === 7) crisisEnd((c.lost || 0) === 0 ? 'won' : 'held'); } },
  refugees: { icon: '🚌', name: 'A refugee column', fits: () => true, desc: 'Six people from a fallen town are on the highway. Take them in within 2 days: you need the beds and 3 food each.',
    start: (c) => { c.until = S.day + 2; }, act: () => { const room = popCap() - S.sv.length - (S.kids || []).length, n = Math.min(6, room); if (n < 3) { say('Not enough beds: build more housing first (room for at least 3).'); return false; } if (S.food < n * 3) { say(`Taking in ${n} people needs ${n * 3} food.`); return false; } S.food -= n * 3; const e = tc(7 + OFF, 10 + OFF); for (let i = 0; i < n; i++) { const q = mk(freeFirst(), ['Farmer', 'Engineer', 'Guard', 'Medic', 'Cook', 'Scavenger'][i % 6], 2 + (i % 3), e.x + (i % 3) * .3, e.y + (i >> 1) * .3, S.sv.length); q.src = 'event'; q.sat = 2; S.sv.push(q); } crisisEnd('won', `${n} refugees joined the Haven.`); return true; },
    actLabel: 'Take them in', day: (c) => { if (S.day >= c.until) crisisEnd('lost'); } },
};
function crisisDaily() {
  const c = S.crisis; if (c) { const C = CRISES[c.k]; if (C.day) C.day(c); return; }
  if ((S.lvl || 1) < CRISIS_LVL && !QS.get('crisis')) return; if (S.finale) return;
  if (S.crisisNext == null) S.crisisNext = S.day + 2; if (S.day < S.crisisNext) return;
  /* 3D.273 (owner, 21 Nov, W172: never an attack on a boss day or the day before): a crisis fights on the night after it starts, so it waits
     while that night would be a boss night or the night before one. It starts a day or two later instead; nothing is lost. */
  if (S.day + 1 === S.nextBoss || S.day + 1 === S.nextBoss - 1) return;
  if (graceOn()) return;   /* 3D.292: not during a breather or a vigil either */
  const pool = Object.keys(CRISES).filter((k) => CRISES[k].fits() && k !== S.crisisLast); const k = QS.get('crisis') && CRISES[QS.get('crisis')] ? QS.get('crisis') : pool[Math.floor(rnd() * pool.length)]; if (!k) return;
  S.crisis = { k, day0: S.day, lost: 0 }; CRISES[k].start(S.crisis); S.crisisLast = k; S.crisisNext = S.day + CRISIS_EVERY;
  const C = CRISES[k];
  if (phoneOn()) { showEventPopup({ title: 'Weekly crisis', alert: { title: `${C.icon} ${C.name}`, line: C.desc, sub: 'See it through: a Crisis Medal, 30 renown and an epic crate.' }, buttons: C.act ? [{ label: C.actLabel, fn: () => C.act() }, { label: 'Later' }] : [{ label: 'Get ready' }] }); return; }   /* 3D.380 (W249): the crisis as an emergency alert */
  SFX('alarm'); showEventPopup({ title: `${C.icon} WEEKLY CRISIS`, text: `<b>${C.name}</b><br>${C.desc}<br><small>See it through for a Crisis Medal, 30 renown and an epic crate.</small>`, buttons: C.act ? [{ label: C.actLabel.toUpperCase(), fn: () => C.act() }, { label: 'LATER' }] : [{ label: 'GET READY' }] });
}
/* 3D.274 (owner, 21 Nov, W176: the limit of 60 standing holds for every kind of attack; zombies grow with the level, not the days):
   The Tide's three waves no longer appear all at once. Each wave joins a queue, and its zombies walk in one by one while fewer than
   TIDE_CAP stand in town; its size follows the level (hDay), not the game day. Before, at level 15 on day 109 about 120 zombies stood up
   in three bursts, 158 to 161 stood at once, and the town lost a third of its people over that night and the next (08-BALANCE, section 12). */
const TIDE_CAP = 60;
function crisisTick() { const c = S.crisis; if (!c || !(c.q > 0) || tick % 20) return; if (activeZ() >= TIDE_CAP) return;
  c.qi = (c.qi || 0) + 1; spawn(null, null, c.qi % 9 === 0 ? 'brute' : c.qi % 4 === 0 ? 'runner' : null); const z = S.z[S.z.length - 1]; if (z && !z.human) { z.siege = true; z.mob = true; } c.q--; S.nightSpawned = (S.nightSpawned || 0) + 1; }
function crisisHour() { const c = S.crisis; if (!c) return; const C = CRISES[c.k]; c.lost = (S.fallen || []).length - (c.f0 ?? (c.f0 = (S.fallen || []).length)); if (C.hour) C.hour(c); }
function crisisEnd(how, extra = '') {
  const c = S.crisis; if (!c) return; const C = CRISES[c.k]; S.crisis = null; S.crisisLog = [...(S.crisisLog || []).slice(-9), { k: c.k, day: S.day, how }];
  if (how === 'won') { S.medals = (S.medals || 0) + 1; renownGain(30, C.name); const pool = ['katana', 'kevlar', 'shotgun', 'rifle', 'military', 'swathelm', 'tactvest', 'hikerpack'].filter((id) => ITEMS[id]); const it = pool[Math.floor(rnd() * pool.length)]; const h = hqB(); if ((h)) dropBag(tc(h.x + 1, h.y + h.h + .5), 20, null, { meds: 3, fuel: 3, cloth: 3, item: it }, 'epic'); else { S.mat += 20; if (it) stashAdd(it); }
    banner(`🏅 CRISIS OVERCOME · ${C.name.toUpperCase()}`); note('important', `🏅 ${C.name}: overcome. A Crisis Medal, 30 renown and an epic crate by the HQ. ${extra}`); }
  else if (how === 'held') { renownGain(12, C.name); note('important', `${C.icon} ${C.name}: the Haven held, but people were lost. 12 renown, no medal.`); }
  else note('important', `${C.icon} ${C.name}: the chance passed.`);
  ui();
}
function crisisCard() { const c = S.crisis, C = c && CRISES[c.k];
  if ((S.lvl || 1) < CRISIS_LVL && !c) return `<div class="card"><b>Weekly crises</b><div class="sm">From Haven level ${CRISIS_LVL}, a faction crisis each week: sieges, plagues, refugees. Overcome one for a Crisis Medal.</div></div>`;
  return `<div class="card"><b>${c ? `${C.icon} Crisis: ${C.name}` : 'Weekly crises'}</b><div class="sm">${c ? C.desc : `Next crisis on day ${S.crisisNext ?? '?'}.`} Medals: ${S.medals || 0}.</div>${c && C.act ? `<button class="act" id="crisisAct">${C.actLabel}</button>` : ''}</div>`; }
