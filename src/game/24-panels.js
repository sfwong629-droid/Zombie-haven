/* ---------------- panels (V2.27: DV2-style, big text, less clutter) ---------------- */
let panelBack = null;
function showPanel(title, back) {
  $('say').style.opacity = 0; if (title) $('it').textContent = title; panelBack = back || null; $('pBack').style.display = panelBack ? 'block' : 'none';
  $('infoPanel').classList.add('show'); $('ib').scrollTop = 0; tabTop();
}
/* 3D.222 (owner, 19 Nov; W118): a tab row at the top of a menu sits outside the scrolling list, on the menu's own glass, so nothing
   scrolls under it and it needs no dark backing of its own. It stays in #ib (every [data-tab] wiring still finds it); the menu gets
   the class tabTop, the row is placed under the title and the list starts below it (glass.css). */
function tabTop() {
  const P = $('infoPanel'), ib = $('ib'); if (!P || !ib) return;
  if (!tabTop.mo && window.MutationObserver) { tabTop.mo = new MutationObserver(() => tabTop()); tabTop.mo.observe(ib, { childList: true }); window.addEventListener('resize', () => tabTop()); ib.addEventListener('scroll', tabStuck, { passive: true }); }
  const t = ib.firstElementChild, on = !!(t && t.classList.contains('tabs')); P.classList.toggle('tabTop', on); tabStuck(); if (!on) return;
  const ph = P.querySelector('.ph'); P.style.setProperty('--tabTop', (ph.offsetTop + ph.offsetHeight) + 'px'); P.style.setProperty('--tabH', t.offsetHeight + 'px');
}
/* a tab row further down (survivor details) sticks to the top while the list scrolls: only then does it get a backing, so the list
   does not show through it; otherwise it sits on the menu's glass like the rest */
function tabStuck() {
  const ib = $('ib'); if (!ib) return; const top = ib.getBoundingClientRect().top;
  for (const r of ib.querySelectorAll('.tabs')) r.classList.toggle('stuck', ib.scrollTop > 0 && getComputedStyle(r).position === 'sticky' && r.getBoundingClientRect().top <= top + 1);
}
const BDESC = {   /* 3D.134 owner: funny first, facts second, and short. The first sentence is also the toast when it is built. Numbers live in the Makes / Uses table. */
  townhall: 'Meetings, but with a roof. +3 renown a day and one more Specialist and Hybrid slot.', market: 'Capitalism survived the apocalypse. A trader comes every day.', watertower: 'A very tall drink. Pumps 30 water a day with power, a quarter without.',
  garage: 'Smells of oil and bad decisions. Holds one vehicle and fixes up the wrecks your squads find.',
  hq: 'Home, sort of. Upgrade it to unlock better buildings and more land.', hq2: 'Now with actual walls. Unlocks Timber buildings.', hq3: 'Good luck knocking on this door. Unlocks the Stone tier.',
  tent: 'Two beds and one zipper that sticks. Upgrade to a Cabin, then a Stone House.', cabin: 'Three beds and a door that shuts. Luxury.', stonehouse: 'Four beds, zero draughts. People wake up nearly cheerful.',
  house: 'One long-time resident, one front door, no roommates.', inn: 'Four beds and a guest book nobody signs.',
  bonfire: 'Light, warmth and ghost stories. Lights the camp about 4 tiles around at night.',
  barrel: 'It rains, you drink. Upgrade to a Rain Collector, then a Stone Well.', water: 'A bigger bucket with ambitions. A Farmer makes it collect more.', well: 'A hole, but the useful kind. The most water.',
  farm: 'Vegetables that never asked to be here. A Farmer grows more.', field: 'Nearly twice the food, and twice the weeding.', irrig: 'Thirsty rows, huge harvest.',
  medic: 'Bandages, tape and optimism. Slower without a Medic on staff.', clinic: 'Real beds and fewer rusty tools. Faster healing.', hospital: 'Almost like the old days. The best care; with power it can operate.',
  canteen: 'Today\'s special: whatever we found. A Cook makes every meal more filling.', mess: 'Seats 4. Seconds are allowed.',
  crates: 'Boxes. Glorious boxes. Holds more food, water, wood and stone.', storage: 'A shed full of things you might need one day.', warehouse: 'So big you could lose a zombie in it. Holds the most.',
  bench: 'Where good ideas and thumbs get hammered. Research and craft gear.', workshop: 'More tools, fewer bruises. Engineers work fastest.',
  armory: 'Pointy things, priced to move. Survivors buy basic gear with spare scrap.',
  scrapyard: 'One person\'s junk is still junk, but useful. A Scavenger gets more out of it.', lumber: 'Trees go in, planks come out. A Scavenger chops faster.', pallet: 'Old crates, pallets and someone\'s dining table: now planks. A Scavenger turns 6 scrap into 4 wood a day; it waits when scrap runs low.', quarry: 'Hitting rocks, professionally. An Engineer digs faster.',
  gym: 'Lift the heavy thing. Put it down. Repeat. Trains Strength.', library: 'Quiet, please. Trains Intelligence; every visit adds research.', lounge: 'A couch that survived everything. Trains Charisma and lifts the mood.',
  range: 'Tin cans never shoot back. Trains Perception.', track: 'Run now, so you can run later. Trains Agility.', sparring: 'Friendly punches only. Trains Endurance.',
  barracks: 'Bunks, boots and snoring. Next to an Armory, gear gets cheaper.',
  generator: 'Loud, smelly, wonderful. Gives 4 power and +20% output to buildings within 5 tiles.',
  radio: 'Mostly static, sometimes hope. With power: newcomers come 30% sooner, and it can send the rescue signal.',
  pump: 'Water, without the bucket. Needs power; a Mechanic runs it at full speed.',
  greenhouse: 'Summer in a box. Grows food all year; 40% more with power.',
  coldstore: 'The world\'s last cold drink. With power it stores 40 more food and water.',
  fuelstill: 'Do not drink it. A Mechanic turns 2 wood into 1 fuel.',
  ammobench: 'Bullets, made with love. A Mechanic loads 16 rounds a day.',
  tradepost: 'Open for business, closed for zombies. Traders come twice as often and pay 20% more.', kennel: 'Good dogs wanted. Keeps two dogs; strays turn up while there is room.', school: 'Homework survived too. Trains Intelligence; children grow up in 3 days, not 5.',
  floodlight: 'Zombies hate paparazzi. With power, zombies within 5 tiles are slowed at night.', turbine: 'Free power, slightly squeaky. +2 power, day and night.', solar: 'Sunshine, finally useful. +3 power in daylight.', pole: 'A stick with a job. Carries the Generator\'s boost 5 tiles further.',
  ammofactory: 'For when one bench is not enough. With power, a Mechanic makes 64 rounds a day.',
};
const BCAT = [['live', 'Living', ['tent', 'bonfire', 'barrel', 'farm', 'canteen', 'crates', 'bench', 'scrapyard', 'tradepost', 'kennel', 'garage', 'townhall', 'market', 'watertower', 'lumber', 'pallet', 'quarry', 'generator', 'turbine', 'solar', 'pole', 'fuelstill', 'radio', 'pump', 'greenhouse', 'coldstore']], ['care', 'Care', ['medic']],
  ['train', 'Train', ['gym', 'library', 'school', 'lounge', 'range', 'track', 'sparring']], ['defend', 'Defend', ['road', 'wall:wood', 'wall:palisade', 'wall:metal', 'wall:efence', 'wall:gate', 'post', 'floodlight', 'trap:spikes', 'trap:wire', 'trap:lure', 'trap:trench', 'trap:mine', 'armory', 'ammobench', 'ammofactory', 'barracks']]];
let bCat = 'live';
function bImg(k, bw, bh) {   /* a picture of the 3D building, fitted to a box (empty until the 3D view is ready) */
  const u = window.ZH3D && ZH3D.ready && ZH3D.bthumb && ZH3D.bthumb(k, Math.round(bw * 2), Math.round(bh * 2));
  return u ? `<img src="${u}" style="width:${bw}px;height:${bh}px;object-fit:contain" alt="">` : `<span style="display:inline-block;width:${bw}px;height:${bh}px"></span>`;
}
function buildLock(k) { const d = DEFS[k]; if (d.lvl && (S.lvl || 1) < d.lvl) return `Level ${d.lvl} (the City)`; if ((d.tier || 1) > hqTier()) return 'Needs ' + hqName(d.tier); if (S.rank < d.rank) return `Level ${lvlOfRank(d.rank)}`; if (!researched(d.res)) return 'Research: ' + (RESEARCH[d.res] ? RESEARCH[d.res].name : d.res); return ''; }
function propPic(k, fb) {   /* 3D.103 Build menu: the real 3D look of walls, gates, roads, posts and traps (falls back to the flat icon) */
  const u = (window.ZH3D) && ZH3D.ready && ZH3D.pthumb && ZH3D.pthumb(k, 208, 156); return u ? `<img src="${u}" style="width:104px;height:78px;object-fit:contain" alt="">` : fb; }
function wallIcon(t) { if (GLASS && window.ZHIcons) return ZHIcons.svg(t === 'gate' ? 'door' : t === 'metal' ? 'wall' : 'wood', 64); return t === 'gate' ? '🚪' : t === 'metal' ? '🧱' : '🪵'; }
function showBuild() {
  endBuildMode(true); closeP(); const cat = BCAT.find((c) => c[0] === bCat) || BCAT[0];
  const cards = cat[2].map((k) => {
    if (k === 'road') return `<button class="bcard" data-tool="road"><div class="im" style="font-size:46px">${propPic('road', GLASS && window.ZHIcons ? ZHIcons.svg('road', 64) : '🛣️')}</div><div class="nm">Road</div><div class="co">⚙ ${Wd.ROAD_COST}</div></button>`;
    if (k === 'post') return `<button class="bcard" data-tool="post"><div class="im">${propPic('post', GLASS && window.ZHIcons ? ZHIcons.svg('post', 64) : `<img class="pix" src="${postIcon()}" style="width:84px" alt="">`)}</div><div class="nm">Guard Post</div><div class="co">⚙ ${POST_COST} · ${(S.posts || []).length}/${postMax()}</div></button>`;
    if (k.startsWith('trap:')) { const t = k.slice(5), td = TRAP_DEFS[t], lk = S.rank < td.rank; return `<button class="bcard${lk ? ' lock' : ''}" data-trap="${t}"><div class="im" style="font-size:46px">${propPic('trap:' + t, td.icon)}</div><div class="nm">${td.name}</div><div class="co">${lk ? '🔒 Level ' + lvlOfRank(td.rank) : costShort(bCost(td))}</div></button>`; }
    if (k.startsWith('wall:')) { const t = k.slice(5), wd = Wd.WALL_DEFS[t], lk = S.rank < wd.rank || (wd.tier || 1) > hqTier(); return `<button class="bcard${lk ? ' lock' : ''}" data-wall="${t}"><div class="im" style="font-size:46px">${propPic('wall:' + t, wallIcon(t))}</div><div class="nm">${wd.name}</div><div class="co">${lk ? '🔒 ' + ((wd.tier || 1) > hqTier() ? hqName(wd.tier) : 'Level ' + lvlOfRank(wd.rank)) : costShort(bCost(wd))}</div></button>`; }
    const d = DEFS[k]; if (!d || d.hidden) return ''; const lk = buildLock(k);
    return `<button class="bcard${lk ? ' lock' : ''}" data-b="${k}"><div class="im">${bImg(k, 104, 78)}</div><div class="nm">${d.name}</div><div class="co">${lk ? '🔒 ' + lk.replace('Research: ', '') : costShort(bCost(d))}</div></button>`;
  }).join('');
  const hb = hqB(), hn = hb && DEFS[DEFS[hb.type].next], hqCard = hb ? `<div class="card row" id="bHQ" style="cursor:pointer;gap:8px;margin-bottom:6px"><span class="sp"><b>${hqTier() >= 3 ? '🏰' : hqTier() >= 2 ? '🏡' : '🏕'} ${DEFS[hb.type].name}</b> <span class="sm">base tier ${hqTier()}</span><br><small>${hb.upg ? 'Upgrading to ' + DEFS[hb.upg.to].name : hn ? `Next: ${hn.name} (${costShort(bCost(hn))}) unlocks tier ${hn.tier} buildings` : 'Top tier'}. Higher tiers come from upgrading a building: tap it.</small></span><span style="color:var(--gold)">›</span></div>` : '';   /* V3D.23 */
  $('ib').innerHTML = tabBar(BCAT.map((c) => [c[0], c[1], { live: 'living', care: 'care', train: 'train', defend: 'defend' }[c[0]]]), bCat) + hqCard + `<button class="act" id="bDemo" style="width:100%;margin:2px 0 8px;display:flex;align-items:center;justify-content:center;gap:6px">${uiIcon('demolish')} Demolish: buildings, roads, walls, posts</button>${bCat === 'defend' && trapsSpent().length ? `<button class="act" id="bRearm" style="width:100%;margin:0 0 8px">Re-arm ${trapsSpent().length} spent trap${trapsSpent().length > 1 ? 's' : ''} · ⚙ ${rearmCost()}</button>` : ''}<div class="bgrid">${cards}</div>`;   /* V2.41: Demolish lives in the Build menu */
  showPanel('Build');
  $('ib').querySelectorAll('[data-tab]').forEach((b) => { b.onclick = () => { bCat = b.dataset.tab; showBuild(); }; });
  $('ib').querySelectorAll('[data-b]').forEach((b) => { b.onclick = () => buildDetail(b.dataset.b); }); { const h = $('bHQ'); if (h && hb) h.onclick = () => showBuildingInfo(hb); }
  $('ib').querySelectorAll('[data-wall]').forEach((b) => { b.onclick = () => { const t = b.dataset.wall; if (S.rank < Wd.WALL_DEFS[t].rank) { say(`${Wd.WALL_DEFS[t].name} needs Haven level ${lvlOfRank(Wd.WALL_DEFS[t].rank)}.`); return; } if ((Wd.WALL_DEFS[t].tier || 1) > hqTier()) { say(`${Wd.WALL_DEFS[t].name} needs the ${hqName(Wd.WALL_DEFS[t].tier)}.`); return; } startTool({ kind: 'wall', wtype: t }); }; });
  $('ib').querySelectorAll('[data-trap]').forEach((b) => { b.onclick = () => { const t = b.dataset.trap; if (S.rank < TRAP_DEFS[t].rank) { say(`${TRAP_DEFS[t].name} needs Haven level ${lvlOfRank(TRAP_DEFS[t].rank)}.`); return; } startTool({ kind: 'trap', ttype: t }); }; });
  { const rb = $('bRearm'); if (rb) rb.onclick = () => { const n = rearmAll(); say(n ? `Re-armed ${n} trap${n > 1 ? 's' : ''}.` : 'Not enough scrap to re-arm.'); showBuild(); }; }
  $('ib').querySelectorAll('[data-tool]').forEach((b) => { b.onclick = () => startTool({ kind: b.dataset.tool === 'post' ? 'post' : 'road' }); });
  $('bDemo').onclick = () => startTool({ kind: 'demolish' });
}
function buildDetail(k) {
  const d = DEFS[k], lk = buildLock(k), have = bOf(k).length, afford = canPay(bCost(d)), size = d.w === 1 && d.h === 1 ? 'Small 1×1' : d.w * d.h === 4 ? 'Large 2×2' : 'Medium 2×1';
  const fx = [];
  /* 3D.133 owner: "+4 food / day · -2" read as one muddle, and nobody knew what upkeep was. One small table: what it makes a day, what it uses a day
     (running cost = the scrap every building needs each midnight; unpaid buildings work at half speed). Icons, not words. */
  const mk = [], us = []; if (d.out && d.fam === 'water') mk.push(`💧 +${d.out}`); if (d.out && d.fam === 'farm') { mk.push(`🍖 +${d.out}`); if (d.waterUse) us.push(`💧 −${d.waterUse}`); }
  if (d.fam === 'scrap') mk.push(`⚙ +${d.out}`); if (d.fam === 'lumber') mk.push(`🪵 +${d.out}`); if (d.fam === 'pallet') { mk.push(`🪵 +${d.out}`); us.push(`⚙ −${d.out * PALLET_RATE}`); } if (d.fam === 'quarry') mk.push(`🪨 +${d.out}`); { const u = UPKEEP[k] ?? .3; if (u > 0) us.push(`⚙ −${u.toFixed(1)}`); }
  const perDay = `<div class="perDay"><div><small>Each day</small></div>${mk.length ? `<div><span>Makes</span><b class="good">${mk.join('  ')}</b></div>` : ''}${us.length ? `<div><span>Uses</span><b class="bad">${us.join('  ')}</b></div>` : ''}</div>`;
  if (d.cap > 1 && d.role === 'inn') fx.push(`🛏 beds for ${d.cap}`); if (d.tier) fx.push(['', '⛺ Camp tier', '🪵 Timber tier', '🪨 Stone tier'][d.tier]); if (d.fam === 'research') fx.push('🔬 research + crafting'); if (d.train) fx.push(`📈 trains ${STAT_NAME[d.train]}`);
  if (d.role === 'home') fx.push('🛏 +2 people'); if (d.role === 'medical') fx.push(`💊 treats ${d.cap}`); if (d.slot) { const js = STAFF_JOBS[d.fam] || [], fr = freeFor(js).length; fx.push('👷 1 worker: ' + js.join(' / ') + (fr ? ` (${fr} free)` : ' (none free)')); }
  $('ib').innerHTML = `<div class="bdetail"><div class="big">${bImg(k, 300, 140)}</div>
    <div class="row" style="justify-content:center;gap:14px;font-size:21px"><span><b>${costShort(bCost(d))}</b></span><span>${size}</span></div>
    <p class="desc">${BDESC[k] || ''}</p>${perDay}<div class="desc">${fx.map((x) => `<div>${x}</div>`).join('')}</div>
    ${have ? `<div class="desc sm" style="margin-top:6px">You have ${have}</div>` : ''}
    ${lk ? `<p style="color:var(--bad)">🔒 Needs ${lk}</p>` : `<button class="act go" id="bdGo" style="width:70%;margin-top:10px">${afford ? 'Build' : 'Place site · still need ' + missText(bCost(d))}</button>`}</div>`;
  showPanel(d.name, showBuild);
  const g = $('bdGo'); if (g) g.onclick = () => startTool({ kind: 'building', type: k });
}
const esc = (t) => String(t).replace(/[&<>]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;' }[c]));
const meter = (v, cls = '') => `<div class="bar ${cls}"><i style="width:${Math.max(0, Math.min(100, v))}%"></i></div>`;
const SLOT_EMOJI = { weapon: '🗡️', armor: '🦺', head: '🧢', acc: '💍' };
function itemIcon(id, slot) { if ((window.ZHItemIcons) && ZHItemIcons.has(id)) return `<div class="icon clayItem">${ZHItemIcons.svg(id, 38)}</div>`; if ((!id) && window.ZHItemIcons) return `<div class="icon clayItem empty">${ZHItemIcons.svg({ weapon: 'bat', armor: 'jacket', head: 'cap', acc: 'dogtags' }[slot] || 'bat', 38)}</div>`; const it = ITEMS[id]; const src = it && window.ZHItems && ZHItems.icon(id); return `<div class="icon">${src ? `<img class="pix" src="${src}" alt="">` : `<span style="font-size:24px">${SLOT_EMOJI[slot || (it && it.slot)] || '❔'}</span>`}</div>`; }
function portrait(s) {   /* V3D.12: in 3D mode a chest-up shot of the survivor's own 3D model (outfit, hat, weapon, armour) */
  const u3 = (window.ZH3D) && ZH3D.portrait && ZH3D.portrait(s); if (u3) return `<div class="portrait p3d"><img src="${u3}" alt=""></div>`;
  return `<div class="portrait"><span style="font-size:30px">🧑</span></div>`; }   /* shown only until the 3D view is ready */
/* V2.36 what a survivor is doing, where, and why it comes first (used by the survivor panel) */
const PRIO = { emergency: ['Emergency', '#ff8a7a'], fight: ['Defending', '#ff8a7a'], shift: ['Shift work', '#7fd35a'], urgent: ['Urgent need', '#ffb36b'], sleep: ['Sleep', '#9fb8ff'], care: ['Recovering', '#9fb8ff'], free: ['Free time', '#e6d3a8'], away: ['Expedition', '#e6d3a8'] };
function unitNow(u) {
  const bn = (b) => (b && DEFS[b.type] ? 'the ' + DEFS[b.type].name : 'somewhere'), m = u.mode; let prio = 'free', dest = null, destB = null;
  if (m === 'down') prio = 'emergency';
  else if (m === 'away') prio = 'away';
  else if (m === 'hospital') { prio = 'care'; destB = medSite(); dest = medSite() ? bn(medSite()) : 'a safe spot'; }
  else if (['rescueTo', 'rescueCarry'].includes(m)) { prio = 'emergency'; if (m === 'rescueTo' && u.rescuing) dest = u.rescuing.name; else { destB = medSite(); dest = destB ? bn(destB) : 'a safe spot'; } }
  else if (['goFire', 'fightFire'].includes(m)) { prio = 'emergency'; destB = u.fireAt; dest = bn(u.fireAt); }
  else if (['chase', 'attack', 'recover', 'postCombat'].includes(m)) { prio = 'fight'; if (u.target && u.target.hp > 0) dest = 'a ' + (zombieTypes[u.target.type] || {}).name; }
  else if (['hide', 'hiding'].includes(m)) { prio = 'emergency'; destB = u.hideAt; dest = bn(u.hideAt); }
  else if (['goWork', 'work'].includes(m)) { prio = 'shift'; destB = u.post; dest = bn(u.post); }
  else if (['goFacility', 'useFacility'].includes(m)) { const r = u.facility && facilityRules[u.facility.type]; prio = u.sleeping || (r && r.need === 'fatigue' && isNight()) ? 'sleep' : u.returnToWork ? 'urgent' : 'free'; destB = u.facility; dest = bn(u.facility); }
  else if (m === 'wait' && u.sleeping === 'rough') prio = 'sleep';
  else if (m === 'walk' && u.dest) dest = u.purpose === 'patrol' ? 'the north road' : u.purpose && u.purpose.startsWith('scav') ? 'outside the walls' : 'the road';
  return { prio, dest, destB };
}
function activityText(u) { return u.mode === 'down' ? 'Bleeding out!' : u.mode === 'hospital' ? 'In care' : u.mode === 'away' ? 'On expedition' : u.why || u.mode; }
const bar = (f, col) => `<div style="height:7px;background:#1d242b;border-radius:4px;margin:3px 0;position:relative"><i style="position:absolute;left:0;top:0;bottom:0;width:${Math.round(100 * Math.max(0, Math.min(1, f)))}%;background:${col};border-radius:4px"></i></div>`;
function careLine(u) {   /* V2.36: rescue and treatment progress, from the real timers */
  if (u.wounded && !['down', 'hospital'].includes(u.mode)) return `<div style="color:var(--warn,#f0b44c)">🩹 Wounded: patched up in the field. Heals no further than ${Math.round(FIELD_CAP * 100)}% until treated at a medical building.</div>`;
  if (u.mode === 'down') { const left = Math.max(0, Math.ceil((u.bleed || 0) / 60)), r = u.rescuer; return `<div style="color:var(--bad)">Bleeding out: ${left} s left</div>${bar((u.bleed || 0) / bleedMax(), '#d84d48')}<div class="sm">${r ? (r.carrying === u ? `${esc(r.name)} is wheeling them to ${medSite() ? 'the ' + DEFS[medSite().type].name : 'safety'}` : `${esc(r.name)} is on the way`) : 'No rescuer: ' + esc(noRescueWhy(u))}</div>`; }
  if (u.mode === 'hospital') { const tot = u.careTotal || careTicks(), f = 1 - (u.stateTicks || 0) / tot, m = u.careAt || medSite(); return `<div>Recovering${m ? ' at the ' + DEFS[m.type].name : ''}: ${Math.round(f * 100)}% · about ${Math.ceil((u.stateTicks || 0) / 1000 * 10) / 10} h left</div>${bar(f, '#7fd35a')}<div class="sm">${m && isWorking(m) ? `${esc(m.staff.name)} is treating patients (faster)` : m && DEFS[m.type].slot ? 'No medic on duty: slower recovery' : ''}</div>`; }
  if (u.mode === 'useFacility' && u.facility && facilityRules[u.facility.type] && facilityRules[u.facility.type].need === 'injury') return `<div class="sm">Being patched up at the ${DEFS[u.facility.type].name}</div>`;
  return '';
}
function patientsHtml(b) {   // medical building: who is in care here and how far along
  const P = S.sv.filter((q) => (q.mode === 'hospital' && (q.careAt === b || (!q.careAt && medSite() === b))) || (q.facility === b && q.mode === 'useFacility')); if (!P.length) return '';
  return `<div class="card"><b>Patients (${P.length})</b>${P.map((q) => { const tot = q.mode === 'hospital' ? (q.careTotal || careTicks()) : 0, f = tot ? 1 - (q.stateTicks || 0) / tot : null;
    return `<div data-u="${S.sv.indexOf(q)}" style="cursor:pointer"><div class="row"><span class="sp">${esc(q.name)} <span class="sm">${q.mode === 'hospital' ? 'recovering after a collapse' : 'patching up'}</span></span><span class="sm">${f != null ? Math.round(f * 100) + '%' : ''} ›</span></div>${f != null ? bar(f, '#7fd35a') : ''}</div>`; }).join('')}</div>`;
}
function nowCard(u) {   /* V2.36: the "Now" card: priority, destination, reason, workplace + shift, needs, gear */
  const n = unitNow(u), [pl, pc] = PRIO[n.prio], need = (k, v) => `<span class="need" style="flex:1">${SI(k)}<b style="color:${v >= 75 ? 'var(--bad)' : v >= 50 ? '#ffb36b' : 'var(--good)'}">${Math.round(v)}</b><span class="nbar"><i style="width:${Math.max(0, Math.min(100, v))}%;background:${v >= 75 ? 'var(--bad)' : v >= 50 ? '#ffb36b' : 'var(--good)'}"></i></span></span>`, why = u.why || activityText(u);
  const sh = SHIFT.map(([a, b]) => `${a}–${b}`).join(', '), post = u.post && world.buildings.includes(u.post) ? u.post : null, w = weaponOf(u), ar = itemOf(u, 'armor');
  const jobs = Object.entries(STAFF_JOBS).filter(([, l]) => l.includes(u.job)).map(([f]) => f), canWork = jobs.length > 0;
  return `<div class="card" id="uNow"><div class="row" style="gap:6px"><span style="background:${pc};color:#241a10;border-radius:4px;padding:0 6px;font-size:16px">${pl}</span>${n.dest ? `<span class="sp"${n.destB ? ' id="uDest" style="cursor:pointer"' : ''}>→ ${esc(n.dest)}${n.destB ? ' <span style="color:var(--gold)">›</span>' : ''}</span>` : '<span class="sp"></span>'}</div>`
    + (why && why !== activityText(u) ? `<div class="sm" style="margin:3px 0">${esc(why)}</div>` : '') + careLine(u)
    + `<div class="row" style="gap:8px;margin:4px 0">${need('hunger', u.hunger)}${need('thirst', u.thirst)}${need('fatigue', u.fatigue)}</div>`
    + `<div class="sm" style="color:${(u.sat || 0) < 25 ? 'var(--bad)' : '#ff9fbd'}">${esc(moodLine(u))}</div>`   /* 3D.168 mood and why */
    + `<div class="sm" style="margin-top:3px">${post ? `👷 <b id="uPost" style="cursor:pointer;color:var(--gold)">${DEFS[post.type].name} ›</b> · ${sh}${onShift(u) ? ' · <span style="color:var(--good)">on shift</span>' : ''}` : canWork ? `No workplace yet: a ${u.job} can staff ${jobs.map((f) => ({ water: 'water', farm: 'farms', medical: 'medical', kitchen: 'the canteen', scrap: 'the scrapyard', research: 'the workshop' })[f] || f).join(', ')} buildings` : `${u.job}s have no workplace: they ${isFighter(u) ? 'patrol and defend' : 'train and help out'} in their free time`}</div>`
    + `<div class="sm">⚔ ${esc(w.name)}${ar ? ' · 🛡 ' + esc(ar.name) : ''}</div></div>`;
}
function refreshNow() {   // keep the open survivor's "Now" card live
  const el = $('uNow'); if (!el || !selected || selected.kind !== 'unit') return; const u = selected.ref, h = nowCard(u); if (el.outerHTML === h) return;
  el.outerHTML = h; wireSI($('uNow')); const nd = unitNow(u), dd = $('uDest'), pp = $('uPost'); if (dd && nd.destB) dd.onclick = () => showBuildingInfo(nd.destB); if (pp) pp.onclick = () => showBuildingInfo(u.post);
}
function traitCard(u) { const t = TRAITS[u.trait], vn = voiceName(u); return (`<div class="card traitCard"><b>Age ${ageOf(u)}</b>${vn ? ` · ${vn} voice` : ''}</div>`) + (t ? `<div class="card traitCard"><b>${t.icon} ${t.name}</b><div class="sm">✔ ${traitGood(u)}</div><div class="sm">✖ ${t.bad}</div></div>` : ''); }
function unitPanel(u) {   /* 3D.134 owner: the panel was a wall of cards. Now: who they are and what they are doing, then the tabs right under it
     (Status, Gear, Job, About). The class path moved into Job (short) and the full list of everybody's job is under More > Jobs. */
  selected = { kind: 'unit', ref: u }; closeP();
  $('ib').innerHTML = `<div class="card row">${portrait(u)}<div class="sp"><div style="font-size:24px;line-height:22px">${esc(fullName(u))} ${u.immune ? '🧬' : ''}${u.resident ? '🏠' : ''}${u.partner ? '💑' : ''}</div><div class="sm">${u.job} · Lv.${u.l}${u.spec && SPECS[u.spec] ? ' · ' + SPECS[u.spec].name : ''}</div>
    <div class="row"><span class="sm">HP</span><div class="sp">${meter(u.hp / u.max * 100, 'hp')}</div><span class="sm">${Math.ceil(u.hp)}/${u.max}</span></div></div></div>
    <div style="margin:-2px 0 6px">${esc(activityText(u))}</div>`
    + (u.mode === 'down' ? `<div class="card"><b style="color:var(--bad)">Bleeding out: ${Math.ceil((u.bleed ?? 0) / 60)} s left</b><br><button class="act go" id="bandage">Bandage +60 s (${(S.cloth || 0) >= 1 ? '🧵 1' : '⚙ ' + BANDAGE_COST * 2})</button></div>` : '');
  showPanel(u.name.toUpperCase()); const bd = $('bandage'); if (bd) bd.onclick = () => { if (useBandage(u)) unitPanel(u); }; unitExtra(u);
}
/* 3D.104 CLASS TIERS (Professions and Class Tiers Study, approved): Specialists from Haven level 4 (level 5 in the profession, scrap + cloth,
   limited slots: 2 + 1 per 2 Haven levels) and Hybrids from Haven level 9 (mastery, level 10, in two professions; 1 per 3 Haven levels, at most
   2 of the same combo). A Specialist works 25% better at the job, or fights 20% better; a Hybrid gives the whole town a perk. */
const SPECS = { Guard: { k: 'swat', name: 'SWAT', icon: '🛡', desc: 'Front-line tank: fights 20% better and takes 20% less damage' }, 'Police Officer': { k: 'marksman', name: 'Marksman', icon: '🎯', desc: 'Fights 20% better; a third of shots use no ammo' },
  Scavenger: { k: 'ranger', name: 'Ranger', icon: '🧭', desc: 'Works 25% better; expeditions with a Ranger are safer' }, Medic: { k: 'surgeon', name: 'Surgeon', icon: '🩺', desc: 'Works 25% better; patients heal faster' },
  Engineer: { k: 'architect', name: 'Architect', icon: '📐', desc: 'Works 25% better; builds and upgrades faster' }, Mechanic: { k: 'electrician', name: 'Electrician', icon: '⚡', desc: 'Works 25% better; a staffed Generator gives 2 more power' },
  Farmer: { k: 'agronomist', name: 'Agronomist', icon: '🌱', desc: 'Works 25% better at farms, greenhouses and pumps' }, Cook: { k: 'quartermaster', name: 'Quartermaster', icon: '📦', desc: 'Works 25% better; the stores hold 20 more food and water' },
  Civilian: { k: 'leader', name: 'Leader', icon: '📣', desc: 'Everyone is a little happier every day; newcomers come more often' } };
const HYBRIDS = [{ k: 'combatmedic', a: 'Guard', b: 'Medic', name: 'Combat Medic', icon: '⛑', desc: 'Downed friends bleed out half as fast' }, { k: 'fortifier', a: 'Guard', b: 'Engineer', name: 'Fortifier', icon: '🧱', desc: 'Walls and gates take 20% less damage' },
  { k: 'sapper', a: 'Guard', b: 'Mechanic', name: 'Sapper', icon: '💣', desc: 'Traps hit 30% harder; one free explosive a week' }, { k: 'gunsmith', a: 'Police Officer', b: 'Mechanic', name: 'Gunsmith', icon: '🔧', desc: '+16 rounds of ammo a day' },
  { k: 'pathfinder', a: 'Scavenger', b: 'Guard', name: 'Pathfinder', icon: '🥾', desc: 'Every expedition is safer' }, { k: 'tracker', a: 'Police Officer', b: 'Scavenger', name: 'Tracker', icon: '👣', desc: 'Every expedition is safer; more leads come in' },
  { k: 'salvager', a: 'Scavenger', b: 'Mechanic', name: 'Salvager', icon: '♻', desc: '+3 scrap and a chance of fuel every day' }, { k: 'homesteader', a: 'Farmer', b: 'Cook', name: 'Homesteader', icon: '🏡', desc: '+4 food a day' },
  { k: 'herbalist', a: 'Farmer', b: 'Medic', name: 'Herbalist', icon: '🌿', desc: '+1 medicine a day' }, { k: 'caretaker', a: 'Medic', b: 'Cook', name: 'Caretaker', icon: '💗', desc: 'Everyone happier; the wounded heal a little every day' }];
const SPEC_COST = { mat: 12, cloth: 3 }, HYB_COST = { mat: 20, cloth: 4, meds: 2 };
const specSlots = () => (S.lvl || 1) >= 4 ? 2 + Math.floor((S.lvl || 1) / 2) + bOf('townhall').length : 0, hybSlots = () => (S.lvl || 1) >= 9 ? Math.floor((S.lvl || 1) / 3) + bOf('townhall').length : 0;   /* 3D.113 the Town Hall: +1 of each */
const specsUsed = () => S.sv.filter((q) => q.spec).length, hybsUsed = () => S.sv.filter((q) => q.hyb).length;
const hasSpec = (q, k) => !!(q && q.spec && SPECS[q.spec] && SPECS[q.spec].k === k);
const townHyb = (k) => S.sv.some((q) => q.hp > 0 && q.hyb === k);
const clsL = (q, j) => ((q.cls && q.cls[j]) || (q.job === j ? { l: q.l } : { l: 0 })).l || 0;
function specWhy(q) { const sp = SPECS[q.job]; if (!sp) return 'No specialist for this profession'; if (q.spec) return ''; if ((S.lvl || 1) < 4) return 'Needs Haven level 4'; if (clsL(q, q.job) < 5) return `Needs ${q.job} level 5 (now ${clsL(q, q.job)})`; if (specsUsed() >= specSlots()) return `All ${specSlots()} specialist slots are taken`; if (!canPay(SPEC_COST)) return 'Needs ' + missText(SPEC_COST); return ''; }
function promoteSpec(q) { if (specWhy(q)) return false; payCost(SPEC_COST); q.spec = q.job; SFX('rankup'); renownGain(4, 'Specialist'); banner(`${SPECS[q.job].icon} ${q.name.toUpperCase()} IS NOW A ${SPECS[q.job].name.toUpperCase()}`); saveGame(); return true; }
function hybOptions(q) { return HYBRIDS.filter((h) => [h.a, h.b].includes(q.job) || (clsL(q, h.a) >= 1 && clsL(q, h.b) >= 1)); }
function hybWhy(q, h) { if (q.hyb) return 'Already a hybrid'; if ((S.lvl || 1) < 9) return 'Needs Haven level 9'; if (clsL(q, h.a) < 10 || clsL(q, h.b) < 10) return `Needs level 10 as ${h.a} (${clsL(q, h.a)}) and ${h.b} (${clsL(q, h.b)})`; if (hybsUsed() >= hybSlots()) return `All ${hybSlots()} hybrid slots are taken`; if (S.sv.filter((o) => o.hyb === h.k).length >= 2) return 'Two of these already'; if (!canPay(HYB_COST)) return 'Needs ' + missText(HYB_COST); return ''; }
function promoteHyb(q, k) { const h = HYBRIDS.find((x) => x.k === k); if (!h || hybWhy(q, h)) return false; payCost(HYB_COST); q.hyb = k; SFX('rankup'); renownGain(8, 'Hybrid'); banner(`${h.icon} ${q.name.toUpperCase()} BECOMES A ${h.name.toUpperCase()}`); saveGame(); return true; }
function classHtml(u) {   /* profession level → Specialist → Hybrid, as three chips; a button only when a promotion is open */
  const sp = SPECS[u.job], c = clsL(u, u.job), sw = specWhy(u), hy = hybOptions(u).filter((h) => !hybWhy(u, h)).slice(0, 3), hb = u.hyb && HYBRIDS.find((h) => h.k === u.hyb);
  const step = (on, t) => `<span style="padding:2px 7px;border-radius:9px;background:${on ? 'var(--gold)' : 'rgba(255,255,255,.12)'};color:${on ? '#1b1206' : 'inherit'}">${t}</span>`;
  return `<div class="card"><div class="row" style="gap:4px;flex-wrap:wrap">${step(true, `${u.job} ${c}`)} › ${step(!!u.spec, sp ? `${sp.icon} ${sp.name}` : '—')} › ${step(!!u.hyb, hb ? hb.icon + ' ' + hb.name : 'Hybrid')}</div>`
    + (sp && !u.spec ? (sw ? `<div class="sm" style="margin-top:4px">🔒 ${esc(sw)}</div>` : `<button class="act go" id="uSpec" style="margin-top:6px">${sp.icon} ${sp.name} · ${costShort(SPEC_COST)}</button>`) : '')
    + hy.map((h) => `<button class="act go" data-hyb="${h.k}" style="margin-top:6px">${h.icon} ${h.name} · ${costShort(HYB_COST)}</button>`).join('')
    + `<button class="act" id="uJobs" style="margin-top:6px">All jobs ›</button></div>`;
}
function hybDaily() {   /* the town perks of Hybrids */
  if (townHyb('gunsmith')) S.ammo = Math.min(ammoCap(), (S.ammo || 0) + 16); if (townHyb('salvager')) { S.mat += 3; if (rnd() < .3) S.fuel = (S.fuel || 0) + 1; }
  if (townHyb('homesteader')) S.food = keepCap(supplyCap(), S.food, 4); if (townHyb('herbalist')) S.meds = Math.min(rareCap(), (S.meds || 0) + 1);
  if (townHyb('caretaker') || S.sv.some((q) => q.hp > 0 && hasSpec(q, 'leader'))) for (const q of S.sv) { q.sat = Math.min(100, (q.sat || 0) + 3); moodAdd(q, 3, 'a good leader'); if (townHyb('caretaker') && q.hp > 0 && q.mode !== 'down') q.hp = Math.min(q.max, q.hp + Math.round(q.max * .05)); }
  if (townHyb('sapper') && S.day % 7 === 0) exAdd('pipebomb', 1);
}
function nextSkillText(s, job) {   // e.g. "next: Tough at Lv.5"
  const c = (s.cls && s.cls[job]) || { l: 1 }; const nx = Object.values(SKILLS).filter((k) => k.from === job && k.at > c.l).sort((a, b) => a.at - b.at)[0];
  return nx ? `Next skill: ${nx.name} at Lv.${nx.at}` : 'All skills learned';
}
const itemText = (it) => !it ? '—' : [it.atk ? `ATK ${it.atk}${it.ranged ? ' (range)' : ''}` : '', it.slot === 'weapon' && it.rate ? (it.rate < .85 ? 'Fast' : it.rate > 1.2 ? 'Slow' : '') : '', it.mag ? `${it.mag} ${it.mag > 1 ? 'rounds' : 'bolt'} · ${it.reload}s reload` : '', it.def ? `DEF ${it.def}` : '', ...Object.entries(it.st || {}).map(([k, v]) => `${v > 0 ? '+' : ''}${v} ${k.toUpperCase()}`), FX_TEXT[it.fx] || ''].filter(Boolean).join(' · ');
const FX_TEXT = { cook: 'Cooking at a kitchen: meals fill 25% more', medic: 'Treating patients: care 20% faster', fix: 'Repairs walls 50% more per visit', farm: 'Working a garden or field: 25% more food', hivis: 'Builds 25% faster', blunt: 'Brute punches do 30% less', rubble: 'Thrown rubble does half damage', wall: 'At a post: shoves every attacker back', pop: 'The first hit in 30 s does nothing (pop!)', hide: 'Standing still: zombies walk past', rest: 'Sleeps rough at full rest', bite: 'Bites do 20% less', bounce: 'Shoves attackers back', float: 'Downed: bleeds out 50% slower', charge: 'Melee: 1 in 4 hits knocks a zombie off balance', aloha: 'Friendships grow 25% faster', clang: 'Stuns the zombie that hits it (0.5 s)', carry1: 'Carries +1', carry2: 'Carries +2', build: 'Builds 30% faster', fire: 'Puts out fires faster', gas: 'Spit & gas hurt 60% less', night: '+2 PER at night', rain: 'Happy in rain', regen: 'Slowly heals', radio: 'Calls help from twice as far' };   /* 3D.28 */

function statsHtml(u) {
  const rows = ['str', 'agi', 'int', 'end', 'per', 'cha'].map((k) => { const base = (u.st && u.st[k]) || 5, tot = stat(u, k), main = (JOB_STATS[u.job] || []).includes(k);
    return `<div class="statC${main ? ' main' : ''}">${SI(k)}<b>${tot}</b>${tot !== base ? `<small>${tot > base ? '+' : ''}${tot - base}</small>` : ''}</div>`; }).join('');
  const w = weaponOf(u), dmg = Math.round(4 + w.atk * .55 + (w.ranged ? stat(u, 'per') : stat(u, 'str')) * .6 + (professions[u.job]?.combat || 0) + skillDmg(u));
  return `<div class="statG">${rows}</div><div class="row" style="gap:16px;margin-top:6px"><span>⚔ <b>${dmg}</b></span><span>🛡 <b>${Math.round(dmgReduce(u) * 100)}%</b></span><span class="sm" style="margin-left:auto">gold = ${u.job} stats</span></div>`;
}
function gearHtml(u, picking) {
  if (picking) {
    const ids = Object.keys(S.inv || {}).filter((id) => ITEMS[id] && ITEMS[id].slot === picking);
    return `<div class="lst">${ids.length ? ids.map((id) => `<div class="card" data-equip="${id}">${itemIcon(id)}<div class="sp">${ITEMS[id].name} <span class="sm">×${S.inv[id]}</span><div class="sm">${itemText(ITEMS[id])}${iQuip(id)}</div></div></div>`).join('') : '<p class="sm">Nothing for this slot in the stash. The Armory sells basics; expeditions and crafting find more.</p>'}</div>`
      + `${itemOf(u, picking) && u.eq[picking] !== 'pipe' ? '<button class="act" data-unequip="1">Take off</button>' : ''}<button class="act" data-gearcancel="1">Back</button>`;
  }
  return '<div class="lst">' + SLOTS.map((sl) => { const it = itemOf(u, sl), id = u.eq && u.eq[sl]; return `<div class="card" data-slot="${sl}">${it ? itemIcon(id, sl) : itemIcon(null, sl)}<div class="sp"><span class="sm">${SLOT_NAME[sl]}</span><div>${it ? it.name : 'Empty'}</div><div class="sm">${it ? itemText(it) : 'Tap to equip'}</div></div><span class="sm">›</span></div>`; }).join('') + '</div>';
}
let uTab = 'stats';
function unitExtra(u, picking = false, gearPick = null, tab = null) {
  syncClass(u); const box = document.createElement('div'); box.id = 'unitExtra';
  if (tab) uTab = tab; if (picking) uTab = 'skills'; if (gearPick) uTab = 'gear';
  const busy = ['down', 'hospital'].includes(u.mode) || u.hp <= 0, xpNeedU = xpNeed(u);
  let body = '';
  if (uTab === 'bonds') uTab = 'about';
  if (uTab === 'stats') body = statsHtml(u) + nowCard(u) + `<div class="card row gTog"><span class="sp"><b>${window.ZHIcons ? ZHIcons.svg('wood', 20) : '🪵'} Gather</b><div class="sm">${chopOn(u) ? 'Chops and gathers when free' : 'Never gathers'}</div></span><button class="tgl${chopOn(u) ? ' on' : ''}" id="uChop" aria-pressed="${chopOn(u)}"><i></i></button></div>`;
  else if (uTab === 'about') body = traitCard(u) + bondsHtml(u);
  else if (uTab === 'gear') {
    body = gearHtml(u, gearPick);
    if (!gearPick) body += `<div class="card"><span class="sm">Pet</span><br>` + (u.pet ? `${esc(u.pet.name)} the ${PETS[u.pet.kind].name} <span class="sm">${PETS[u.pet.kind].desc}</span><br><button class="act" data-petoff="1">Leave in town</button>` : ((S.pets || []).length ? (S.pets || []).map((p, i) => `<button class="act" data-pet="${i}">Adopt ${esc(p.name)} (${PETS[p.kind].name})</button>`).join('') : '<span class="sm">None. The trader sometimes brings dogs and cats.</span>')) + '</div>';
  } else if (!picking) {
    const sk = (u.skills || []).map((k) => `<div class="card"><b>${SKILLS[k].name}</b><div class="sm">${esc(SKILLS[k].desc)}</div></div>`).join('') || '<p class="sm">No skills yet: reach Lv.3 in any job.</p>';
    body = classHtml(u) + `<div style="margin-top:6px">${u.job} Lv.${u.l}${u.l >= LEVEL_CAP ? ' (max)' : ''}</div>${meter(u.l >= LEVEL_CAP ? 100 : u.mastery / xpNeedU * 100, 'xp')}<div class="sm">${nextSkillText(u, u.job)}</div>
      <div style="margin-top:6px">${sk}</div><button class="act" id="chgJob" ${busy ? 'disabled' : ''}>Change job${busy ? ' (not while hurt)' : ''}</button>
      <div class="sm" style="margin-top:6px">Other jobs: ${CLASS_LIST.filter((j) => u.cls[j] && j !== u.job).map((j) => `${j} Lv.${u.cls[j].l}`).join(' · ') || 'none yet'}</div>`;
  } else body = '<div class="sm">Levels and skills are kept when switching.</div><div class="lst">' + CLASS_LIST.map((j) => { const c = u.cls[j]; return `<div class="card" data-job="${j}" style="${j === u.job ? 'opacity:.45' : ''}"><div class="sp">${j} <span class="sm">Lv.${c ? c.l : 1}</span><div class="sm">${isFighter({ job: j }) ? '⚔ fights zombies' : '🏃 hides from zombies'}</div></div></div>`; }).join('') + '</div><button class="act" id="chgCancel">Back</button>';
  box.innerHTML = tabBar([['stats', 'Status'], ['gear', 'Gear'], ['skills', 'Job'], ['about', 'About']], uTab) + body;
  const old = $('unitExtra'); if (old) old.remove(); $('ib').appendChild(box); wireSI(box); wireSI($('ib'));
  { const us = $('uSpec'); if (us) us.onclick = () => { if (promoteSpec(u)) unitPanel(u); }; box.querySelectorAll('[data-hyb]').forEach((b) => { b.onclick = () => { if (promoteHyb(u, b.dataset.hyb)) unitPanel(u); }; }); const uj = $('uJobs'); if (uj) uj.onclick = () => showJobs(() => unitPanel(u));
    const cb = $('uChop'); if (cb) cb.onclick = () => { u.chop = !chopOn(u); if (!u.chop && (u.purpose === 'gath-out' || u.mode === 'gather')) { u.gatherAt = null; enterFree(u, 10); } saveGame(); unitPanel(u); }; const nd = unitNow(u), dd = $('uDest'), pp = $('uPost'); if (dd && nd.destB) dd.onclick = () => showBuildingInfo(nd.destB); if (pp) pp.onclick = () => showBuildingInfo(u.post); }
  box.querySelectorAll('[data-tab]').forEach((b) => { b.onclick = () => unitExtra(u, false, null, b.dataset.tab); });
  const cj = $('chgJob'); if (cj && !busy) cj.onclick = () => unitExtra(u, true);
  box.querySelectorAll('[data-slot]').forEach((b) => { b.onclick = () => unitExtra(u, false, b.dataset.slot); });
  box.querySelectorAll('[data-equip]').forEach((b) => { b.onclick = () => { if (equip(u, b.dataset.equip)) { saveGame(); unitPanel(u); } }; });
  box.querySelectorAll('[data-unequip]').forEach((b) => { b.onclick = () => { if (unequip(u, gearPick)) { saveGame(); unitPanel(u); } }; });
  box.querySelectorAll('[data-pet]').forEach((b) => { b.onclick = () => { if (givePet(u, +b.dataset.pet)) { saveGame(); unitPanel(u); } }; });
  box.querySelectorAll('[data-petoff]').forEach((b) => { b.onclick = () => { if (takePet(u)) { saveGame(); unitPanel(u); } }; });
  box.querySelectorAll('[data-gearcancel]').forEach((b) => { b.onclick = () => unitExtra(u, false); });
  const cc = $('chgCancel'); if (cc) cc.onclick = () => unitExtra(u, false);
  box.querySelectorAll('[data-job]').forEach((b) => { b.onclick = () => { if (b.dataset.job !== u.job && changeProfession(u, b.dataset.job)) { ui(); saveGame(); unitPanel(u); } }; });
}
/* 3D.134 owner: every list of people can be filtered and sorted (People, the expedition squad, Jobs). One small bar, remembered while you play. */
const PF = { f: 'all', s: 'lvl' };
const PF_F = [['all', 'All'], ['fight', '⚔'], ['work', '👷'], ['hurt', '❤']], PF_S = [['lvl', 'Level'], ['job', 'Job'], ['hp', 'Health'], ['name', 'A–Z']];
function pfBar() { return `<div class="pfBar"><div class="pfSeg">${PF_F.map(([k, l]) => `<button data-pff="${k}" class="${PF.f === k ? 'on' : ''}">${l}</button>`).join('')}</div><button class="pfSort" data-pfs="1">↕ ${PF_S.find(([k]) => k === PF.s)[1]}</button></div>`; }
function pfList(L) {
  const f = PF.f, o = L.filter((q) => f === 'all' || (f === 'fight' ? isFighter(q) : f === 'work' ? !isFighter(q) : q.hp < q.max * .7 || q.wounded));
  const by = { lvl: (a, b) => (b.l || 1) - (a.l || 1) || a.name.localeCompare(b.name), job: (a, b) => a.job.localeCompare(b.job) || (b.l || 1) - (a.l || 1), hp: (a, b) => a.hp / a.max - b.hp / b.max, name: (a, b) => a.name.localeCompare(b.name) }[PF.s];
  return o.sort(by);
}
function pfWire(root, again) { root.querySelectorAll('[data-pff]').forEach((b) => { b.onclick = () => { PF.f = b.dataset.pff; again(); }; }); const sb = root.querySelector('[data-pfs]'); if (sb) sb.onclick = () => { PF.s = PF_S[(PF_S.findIndex(([k]) => k === PF.s) + 1) % PF_S.length][0]; again(); }; }
function showSurvivors() {
  endBuildMode(true); closeP(); const L = pfList(S.sv.slice());
  $('ib').innerHTML = `<div class="sm" style="margin-bottom:6px">👥 ${S.sv.length}/${popCap()} · 🛏 ${bedCount()}</div>` + pfBar() + '<div class="lst">' + (L.map((s) => `<div class="card" data-sv="${s.id}">${portrait(s)}<div class="sp" style="min-width:0"><div>${esc(fullName(s))} <span title="${TRAITS[s.trait] ? TRAITS[s.trait].name : ''}">${traitIcon(s)}</span> <span class="sm">${s.job} Lv.${s.l}</span></div>${meter(s.hp / s.max * 100, 'hp')}<div class="sm" style="white-space:nowrap;overflow:hidden;text-overflow:ellipsis"><span style="color:${(s.sat || 0) < 25 ? 'var(--bad)' : '#ff9fbd'}">♥${Math.round(s.sat || 0)}</span> · ${esc(activityText(s))}</div></div><span class="sm">›</span></div>`).join('') || '<p class="sm">Nobody fits this filter.</p>') + '</div>';
  showPanel('People'); pfWire($('ib'), showSurvivors);
  $('ib').querySelectorAll('[data-sv]').forEach((el) => { el.onclick = () => { const s = S.sv.find((q) => q.id === +el.dataset.sv); if (s) { centerOn(s.w.x, s.w.y); unitPanel(s); panelBack = showSurvivors; $('pBack').style.display = 'block'; } }; });
}
/* 3D.169 (play-test round 1, Builder): a staffing view. Which job works each building, who is there, and one button to fill the empty slots */
const slotBs = () => world.buildings.filter((b) => DEFS[b.type] && DEFS[b.type].slot && !b.burnt);
const freeFor = (jobs) => S.sv.filter((q) => jobs.includes(q.job) && !q.post && q.hp > 0 && !['down', 'hospital', 'away', 'errand'].includes(q.mode));
function fillSlots() {   /* clears "nobody works here" too: the player asked for every slot. Matching job first, then a Civilian (autoStaff's own order) */
  const empty = slotBs().filter((b) => !b.staff); if (!empty.length) { say('Every workplace is staffed.'); return; }
  for (const b of empty) b.noStaff = false; autoStaff();
  const filled = empty.filter((b) => b.staff).length, left = empty.filter((b) => !b.staff), need = [...new Set(left.flatMap((b) => STAFF_JOBS[DEFS[b.type].fam] || []))];
  say(filled ? `Filled ${filled} workplace${filled > 1 ? 's' : ''}` + (left.length ? ` · ${left.length} still empty: no free ${need.join(' or ')}` : '.') : `Nobody free to fill them: needs a ${need.join(' or ')}`, true);
  saveGame();
}
function workplacesHtml() {
  const L = slotBs().sort((x, y) => (!!x.staff - !!y.staff) || DEFS[x.type].name.localeCompare(DEFS[y.type].name)), empty = L.filter((b) => !b.staff).length;
  const fitTxt = (b) => { const f = fitOf(b, b.staff); return f === 'match' ? `<span style="color:var(--good)">+${Math.round(workBoost(b.staff) * 100)}%</span>` : f === 'civ' ? '<span class="sm">Civilian helping +25%</span>' : '<span style="color:var(--bad)">wrong job −25%</span>'; };
  const row = (b) => { const d = DEFS[b.type], jobs = STAFF_JOBS[d.fam] || [], fr = freeFor(jobs).length;
    return `<div class="card row" data-wp="${world.buildings.indexOf(b)}" style="cursor:pointer;gap:8px"><div style="width:46px;height:40px;display:flex;align-items:flex-end;justify-content:center">${bImg(b.type, 46, 40)}</div><div class="sp" style="min-width:0"><div><b>${esc(d.name)}</b> <span class="sm">· ${jobs.join(' / ')}</span></div><div class="sm">${b.staff ? `👷 ${esc(b.staff.name)} (${b.staff.job} Lv.${b.staff.l}) · ${fitTxt(b)}` : `<span style="color:var(--bad)">Empty</span> · ${b.noStaff ? 'set to nobody' : fr ? fr + ' ' + jobs.join('/') + ' free' : 'no free ' + jobs.join(' or ')}`}</div></div><span style="color:var(--gold)">›</span></div>`; };
  const need = {}; for (const b of L) if (!b.staff) for (const j of STAFF_JOBS[DEFS[b.type].fam] || []) need[j] = (need[j] || 0) + 1;
  const short = Object.entries(need).filter(([j, n]) => freeFor([j]).length < n).map(([j, n]) => `${n - freeFor([j]).length} ${j}${n - freeFor([j]).length > 1 ? 's' : ''}`);
  return `<div class="card"><div class="row"><b class="sp">Workplaces ${L.length - empty}/${L.length} staffed</b>${empty ? (L.some((b) => !b.staff && (freeFor(STAFF_JOBS[DEFS[b.type].fam] || []).length || (FAMRES(DEFS[b.type].fam) && freeFor(['Civilian']).length))) ? `<button class="act go" id="wpFill">Fill empty slots (${empty})</button>` : '<button class="act" disabled>Nobody free</button>') : ''}</div><div class="sm">Each building takes one worker. The right job adds +50% (more with level); a Civilian adds +25%; anyone else makes it slower than empty.${short.length ? ` <b>Short of:</b> ${short.join(', ')} (change someone's profession in their Job tab).` : ''}</div></div>`
    + (L.length ? `<div class="lst">${L.map(row).join('')}</div>` : '<div class="sm">No workplaces yet: a Rain Barrel, Garden Plot or Scrapyard each take a worker.</div>')
    + `<details class="card"><summary><b>Which job works where</b></summary>${Object.entries(Object.entries(STAFF_JOBS).reduce((a, [f, js]) => { for (const j of js) (a[j] = a[j] || new Set()).add(f); return a; }, {})).map(([j, fs]) => `<div class="sm" style="margin-top:4px"><b>${j}</b>: ${[...new Set([...fs].flatMap((f) => Object.values(DEFS).filter((d) => d.fam === f && d.slot).map((d) => d.name)))].join(', ')}</div>`).join('')}</details>`;
}
let jTab = 'people';
function showJobs(back, tab) {   /* More > Jobs: who does what, who can be promoted, and what each Specialist and Hybrid gives */
  if (tab) jTab = tab;
  endBuildMode(true); closeP(); const L = pfList(S.sv.slice()), bk = back || showMore;
  if (jTab === 'work') {
    const emp = slotBs().filter((b) => !b.staff).length;
    $('ib').innerHTML = tabBar([['people', 'People'], ['work', 'Workplaces' + (emp ? ' (' + emp + ' empty)' : '')]], 'work') + workplacesHtml(); showPanel('Jobs', bk);
    $('ib').querySelectorAll('[data-tab]').forEach((x) => { x.onclick = () => showJobs(back, x.dataset.tab); });
    { const f = $('wpFill'); if (f) f.onclick = () => { fillSlots(); showJobs(back, 'work'); }; }
    $('ib').querySelectorAll('[data-wp]').forEach((el) => { el.onclick = () => { const b = world.buildings[+el.dataset.wp]; if (b) { showBuildingInfo(b); panelBack = () => showJobs(back, 'work'); $('pBack').style.display = 'block'; } }; });
    return;
  }
  const row = (q) => { const sp = SPECS[q.job], hb = q.hyb && HYBRIDS.find((h) => h.k === q.hyb), ready = sp && !q.spec && !specWhy(q), hr = !q.hyb && hybOptions(q).some((h) => !hybWhy(q, h));
    return `<div class="card" data-sv="${q.id}">${portrait(q)}<div class="sp" style="min-width:0"><div>${esc(q.name)} <span class="sm">${q.job} Lv.${q.l}</span></div><div class="sm">${hb ? hb.icon + ' ' + hb.name : q.spec && SPECS[q.spec] ? SPECS[q.spec].icon + ' ' + SPECS[q.spec].name : sp ? `next: ${sp.icon} ${sp.name}` : ''}</div></div>${ready || hr ? '<span class="jbUp">⬆</span>' : '<span class="sm">›</span>'}</div>`; };
  { const emp = slotBs().filter((b) => !b.staff).length; $('ib').innerHTML = tabBar([['people', 'People'], ['work', 'Workplaces' + (emp ? ' (' + emp + ' empty)' : '')]], 'people') + `<div class="sm" style="margin-bottom:6px">Specialists ${specsUsed()}/${specSlots()} · Hybrids ${hybsUsed()}/${hybSlots()}</div>` + pfBar() + `<div class="lst">${L.map(row).join('')}</div>`
    + `<details class="card"><summary><b>Specialists</b> <span class="sm">Haven level 4 · job level 5 · ${costShort(SPEC_COST)}</span></summary>${Object.entries(SPECS).map(([j, sp]) => `<div class="sm" style="margin-top:4px">${sp.icon} <b>${sp.name}</b> (${j}): ${sp.desc}</div>`).join('')}</details>`
    + `<details class="card"><summary><b>Hybrids</b> <span class="sm">Haven level 9 · level 10 in two jobs · ${costShort(HYB_COST)}</span></summary>${HYBRIDS.map((h) => `<div class="sm" style="margin-top:4px">${h.icon} <b>${h.name}</b> (${h.a} + ${h.b}): ${h.desc}</div>`).join('')}</details>`;
  } showPanel('Jobs', bk); pfWire($('ib'), () => showJobs(back)); $('ib').querySelectorAll('[data-tab]').forEach((x) => { x.onclick = () => showJobs(back, x.dataset.tab); });
  $('ib').querySelectorAll('[data-sv]').forEach((el) => { el.onclick = () => { const q = S.sv.find((x) => x.id === +el.dataset.sv); if (q) { uTab = 'skills'; unitPanel(q); panelBack = () => showJobs(back); $('pBack').style.display = 'block'; } }; });
}
function perimText() {
  const p = Wd.perimeter(world); if (!p.walls) return 'No walls yet: zombies walk straight in.';
  return `${p.walls} wall tiles, ${p.gates} gate${p.gates === 1 ? '' : 's'}: ` + (p.sealed ? '<b style="color:var(--good)">SEALED</b>' : '<b style="color:var(--bad)">OPEN</b>' + (p.ring ? `<div class="sm">Only ${p.inside} of ${p.total} buildings are inside a closed wall${p.inside >= Math.ceil(p.total * .75) ? ' and the HQ is not' : ''}. Sealed means the HQ and at least 3 in 4 buildings: wall the outer line.</div>` : '') + ((() => { const g = findGaps(6); return g.length ? `<div class="sm">${g.length}${g.length >= 6 ? '+' : ''} gap${g.length > 1 ? 's' : ''}: ${[...new Set(g.map((q) => q.why))].slice(0, 3).join(' · ')}</div><button class="act" id="perGaps">Show the gaps</button>` : '<span class="sm">(close every gap)</span>'; })())) + (p.weakest ? `<div class="sm">Weakest: ${Math.ceil(p.weakest.hp)}/${p.weakest.max} HP</div>` : '');
}
function expandInfo() { const t = (S.terr || 0) + 1, n = Wd.TERRITORY[t]; return n ? { n, hqOk: t <= hqTier(), ok: t <= hqTier() && S.ren >= n.ren && canPay(bCost(n)) } : null; }
function expandTerritory() {   /* V2.13: more land to build on, more zombies to hold off */
  const e = expandInfo(); if (!e || !e.ok) return false; payCost(bCost(e.n)); S.terr = (S.terr || 0) + 1; Wd.setTerritory(S.terr); Wd.bump(world); landGrewNote();   /* 3D.100: traps inside the new walls stay (they go anywhere now) */
  banner('🗺 TERRITORY EXPANDED'); say(`The Haven claimed more land (tier ${S.terr}). More zombies will come, from more directions.`, true); renownGain(3, 'Territory expanded'); saveGame(); ui(); return true;
}
let tTab = 'overview';
const progRow = (label, have, need) => `<div class="row"><span style="width:96px">${label}</span><div class="sp">${meter(have / Math.max(1, need) * 100, have >= need ? '' : 'xp')}</div><span class="sm" style="width:74px;text-align:right">${Math.floor(have)}/${need}</span></div>`;
function showTown(tab) {
  endBuildMode(true); closeP(); if (tab) tTab = tab; const nx = rankRules[S.rank], st = supplyStats();
  const net = (n) => (n >= 0 ? '+' : '−') + Math.abs(n).toFixed(1), days = (d) => (d === Infinity ? 'stable' : `${d.toFixed(1)} days`);
  let h = tabBar([['overview', 'Haven', 'haven'], ['defense', 'Defense', 'defense'], ['people', 'People', 'people'], ['more', 'More', 'more']], tTab);
  if (tTab === 'overview') {
    h += `<div class="card"><b>Town policy</b><div class="row" style="gap:4px;flex-wrap:wrap;margin:4px 0">${Object.entries(POLICIES).map(([k, q]) => `<button class="act${policy() === k ? ' go' : ''}" data-pol="${k}" style="flex:1 1 45%;margin:0;padding:6px 4px;font-size:17px">${q.icon} ${q.name}</button>`).join('')}</div><div class="sm">${POLICIES[policy()].desc}</div></div>`;
    h += `<div class="card"><div style="font-size:23px">Level ${S.lvl || 1} <span class="sm">· Era ${eraOf().n}: ${eraOf().name} · threat ☠${threatNow()}</span></div>`
      + (S.lvUp ? `<div class="sm">🏗 Upgrading to level ${S.lvUp.to}: ${lvLeftText()} left</div><button class="act" id="tUpg">Upgrade progress</button>` : rankConds() ? `<div class="sm">Next level: ${rankConds().filter((r) => r.ok).length}/${rankConds().length} goals met</div><button class="act${S.rankReady ? ' go' : ''}" id="tUpg">🏡 Upgrade the Haven</button>` : '<div>Highest level reached.</div>') + '</div>'
      + `<div class="card"><div class="kv"><div><span>🍖 Food</span><span style="color:${st.fNet < 0 ? 'var(--bad)' : 'var(--good)'}">${net(st.fNet)}/day</span></div><div><span class="sm">lasts</span><span>${days(st.fDays)}</span></div>
         <div><span>💧 Water</span><span style="color:${st.wNet < 0 ? 'var(--bad)' : 'var(--good)'}">${net(st.wNet)}/day</span></div><div><span class="sm">lasts</span><span>${days(st.wDays)}</span></div>
         <div><span>⚙ Upkeep</span><span>−${upkeepTotal().toFixed(1)}/day</span></div><div><span class="sm">storage cap</span><span>${supplyCap()}</span></div></div>
         ${world.buildings.some((b) => b.unpaid) ? `<div style="color:var(--bad)">${world.buildings.filter((b) => b.unpaid).length} building(s) unpaid: half output</div>` : ''}</div>`
      + (S.mission ? `<div class="card"><b>${S.mission.name}</b><div class="sm">${S.mission.desc}</div>${progRow('Progress', S.mission.progress, S.mission.goal)}</div>` : '');
  } else if (tTab === 'defense') {
    const e = expandInfo();
    h += `<div class="card"><b>Walls</b><div>${perimText()}</div></div>
      <div class="card"><b>Explosives</b> <span class="sm">limited stock, ${exCap()} of each at most</span><div>${Object.entries(EX_DEFS).map(([k, e]) => `${e.icon} ${e.name} ×${(S.ex || {})[k] || 0}`).join(' · ')}</div><div class="sm">Pipe bombs come from a staffed Ammo Bench, molotovs from a staffed Fuel Still (one a day each), grenades from traders and the Military Checkpoint. Fighters throw them at a crowd of 4+ or a boss, never near our own people.</div><button class="act${S.exAuto === false ? '' : ' go'}" id="tExAuto">${S.exAuto === false ? 'Auto-throw: off' : 'Auto-throw: on'}</button></div>${factionsHtml()}
      <div class="card"><b>Retreat</b><div class="row"><span class="sm">Fighters fall back at</span><input class="sp" type="range" id="retreatR" min="15" max="60" step="5" value="${S.retreat}"><span id="retreatV">${S.retreat}%</span></div></div>
      <div class="card"><b>Territory</b> <span class="sm">tier ${S.terr || 0}/${Wd.TERRITORY.length - 1}</span><div class="sm">The Haven claims more land as it levels up: levels 4, 7, 11 and 16 (the City).</div></div>
      <div class="card"><span class="sm">Next raid ≈ day ${Math.ceil(S.nextRaid || 0)}${('')}</span></div>`;
  } else if (tTab === 'people') {
    h += `<div class="card"><div class="kv"><div><span>People</span><span>${popNow()}/${popCap()}</span></div><div><span>Residents</span><span>${residents()}</span></div>
      <div><span>Couples</span><span>${S.sv.filter((q) => q.partner).length / 2 | 0}</span></div><div><span>Children</span><span>${(S.kids || []).length}</span></div></div>
      <div class="sm">More Houses = more room.</div></div>`
      + `<div class="card"><b>Pets</b><div>${S.sv.filter((q) => q.pet).map((q) => esc(q.pet.name) + ' <span class="sm">(' + esc(q.name) + ')</span>').join(', ') || '<span class="sm">none</span>'}${(S.pets || []).length ? ` · ${S.pets.length} waiting` : ''}</div></div>`
      + `<div class="card"><b>Memorial</b><div>${S.fallen.length ? S.fallen.map((f) => `${esc(f.name)} <span class="sm">${f.job}, day ${f.day}</span>`).join('<br>') : '<span class="sm">No one lost yet.</span>'}</div></div>`;
  } else {
    h += `<div class="card"><b>Research</b><div>${Math.floor(S.rp || 0)} RP · ${Object.keys(S.res || {}).length}/${Object.keys(RESEARCH).length} done</div><div class="sm">${bOf('workshop').length ? 'Tap a Workshop to research.' : 'Build a Workshop to research.'}</div></div>
      <div class="card"><b>Weekly Review</b><div>${S.lastReview ? `Week ${S.lastReview.week}: grade <b>${S.lastReview.grade}</b>` : 'First review on day 8'}</div>${(S.titles || []).length ? `<div class="sm">Titles: ${S.titles.join(', ')}</div>` : ''}</div>
      <div class="card"><b>Trader</b><div>${S.trader ? 'In town until 19:00 <button class="act go" id="tTrade">Trade</button>' : `Next visit ≈ day ${S.nextTrader || 2}`}</div></div>
      <button class="act" id="tSave">Save now</button><button class="act" id="tLog">📜 Event log</button><button class="act" id="tTitle">🏠 Title screen (saves first)</button>`;
  }
  $('ib').innerHTML = h; showPanel('Town');
  $('ib').querySelectorAll('[data-tab]').forEach((b) => { b.onclick = () => showTown(b.dataset.tab); });
  $('ib').querySelectorAll('[data-pol]').forEach((b) => { b.onclick = () => { setPolicy(b.dataset.pol); showTown('overview'); }; });
  const rr = $('retreatR'); if (rr) rr.oninput = (e) => { S.retreat = +e.target.value; $('retreatV').textContent = S.retreat + '%'; };
  const ts = $('tSave'); if (ts) ts.onclick = () => { say(saveGame() ? 'Saved.' : 'Not saved: see the alert.'); };
  const tl = $('tLog'); if (tl) tl.onclick = showLog; { const pg = $('perGaps'); if (pg) pg.onclick = () => { closeP(); startTool({ kind: 'wall', wtype: 'wood' }); showObjMarks(findGaps()); }; }
  const tt = $('tTrade'); if (tt) tt.onclick = showTrader;
  const tx = $('tExpand'); if (tx) tx.onclick = () => { if (expandTerritory()) showTown(); };
  { const ea = $('tExAuto'); if (ea) ea.onclick = () => { S.exAuto = S.exAuto === false; showTown('defense'); }; }
  { const pr = $('shPrac'); if (pr) pr.onclick = () => showShPractice(); const qc = $('quarClean'); if (qc) qc.onclick = () => { quarClean(); showTown('factions'); }; $('ib').querySelectorAll('[data-raid]').forEach((b) => { b.onclick = () => { expSel.force = b.dataset.raid; expSel.ids = null; showExpedition(); }; }); }
  { const ca = $('crisisAct'); if (ca) ca.onclick = () => { const c = S.crisis; if (c && CRISES[c.k].act && CRISES[c.k].act()) showTown('defense'); }; }
  const tu = $('tUpg'); if (tu) tu.onclick = () => showUpgrade('rank');
  const tTi = $('tTitle'); if (tTi) tTi.onclick = backToTitle;
}
