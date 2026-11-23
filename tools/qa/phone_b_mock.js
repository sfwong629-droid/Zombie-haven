// tools/qa/phone_b_mock.js — UI chat, 23 Nov (W249; owner: "if i want to go with B, how would we implement that for all the function and
// interface? Maybe SOS will be like an incoming call from the ally? Warning is like amber alert? etc? Give me mock up of all interface with B
// style. Show me what inventory looks like, exploration looks like etc"). MOCKUP ONLY: fifteen screens in look B (glass like today's
// phones), drawn over the real game scene; the item pictures are the game's own (invPic) and the map is the valley map mockup (look C).
// Nothing in the game changes. Pictures: runs/ui_samples/phoneB_NN_name.png and three contact sheets phoneB_sheet_N.png.
// No Apple names, fonts, icons or artwork: the patterns only (call screen, emergency alert, notifications, maps, contact card...).
// Usage: node tools/qa/phone_b_mock.js   (needs the game served on :8765)
const Q = require('./lib');
const { MOCK: VALLEY } = require('./valley_map_mock');

const SCREEN = function ({ name, mapHtml, mapCss, pics, opt }) {
  opt = opt || {}; const faces = opt.faces || {};   /* opt.tabs: '' line icons (first mockup) | 'sticker' | 'tint' | 'badge'; opt.faces: { name: { bust, half } } the game's own pictures of the survivors */
  const ic = (n, s) => ZHIcons.svg(n, s);
  const L = {
    explore: '<circle cx="12" cy="12" r="9"/><path d="M15.5 8.5 L13 13 L8.5 15.5 L11 11 Z" fill="currentColor"/>',
    people: '<circle cx="9" cy="8" r="3.2"/><path d="M3.5 19c0-3 2.5-5 5.5-5s5.5 2 5.5 5"/><circle cx="16.5" cy="9" r="2.6"/><path d="M16 14.2c2.8 0 4.8 1.9 4.8 4.8"/>',
    build: '<path d="M13.5 4.5l6 6-2.2 2.2-6-6z"/><path d="M12.4 8.6L4.8 16.2a1.8 1.8 0 0 0 2.6 2.6l7.6-7.6"/>',
    town: '<path d="M3.5 11L12 4l8.5 7"/><path d="M6 9.5V20h12V9.5"/><path d="M10 20v-5h4v5"/>',
    more: '<circle cx="6" cy="12" r="1.7" fill="currentColor"/><circle cx="12" cy="12" r="1.7" fill="currentColor"/><circle cx="18" cy="12" r="1.7" fill="currentColor"/>',
    target: '<circle cx="12" cy="12" r="7"/><circle cx="12" cy="12" r="1.6" fill="currentColor"/><path d="M12 2.5v3M12 18.5v3M2.5 12h3M18.5 12h3"/>',
    chev: '<path d="M9 5l7 7-7 7"/>', search: '<circle cx="11" cy="11" r="6"/><path d="M16 16l4 4"/>', x: '<path d="M6 6l12 12M18 6L6 18"/>',
    phone: '<path d="M5 4h4l2 5-2.5 1.5a11 11 0 0 0 5 5L15 13l5 2v4a2 2 0 0 1-2 2A16 16 0 0 1 3 6a2 2 0 0 1 2-2z" fill="currentColor" stroke="none"/>',
    play: '<path d="M7 5l12 7-12 7z" fill="currentColor" stroke="none"/>', pause: '<path d="M7 5h3.5v14H7zM13.5 5H17v14h-3.5z" fill="currentColor" stroke="none"/>',
    back15: '<path d="M4 12a8 8 0 1 0 3-6.2"/><path d="M4 4v4h4"/>', fwd: '<path d="M5 5l7 7-7 7M12 5l7 7-7 7" fill="currentColor"/>',
    send: '<path d="M12 19V5M6 11l6-6 6 6"/>', plus: '<path d="M12 5v14M5 12h14"/>', bell: '<path d="M6 16V11a6 6 0 0 1 12 0v5l2 2H4z"/><path d="M10 20a2 2 0 0 0 4 0"/>',
    msg: '<path d="M4 5h16v11H9l-5 4z"/>', gear: '<circle cx="12" cy="12" r="3"/><path d="M12 3v3M12 18v3M3 12h3M18 12h3M5.6 5.6l2.1 2.1M16.3 16.3l2.1 2.1M5.6 18.4l2.1-2.1M16.3 7.7l2.1-2.1"/>',
    eye: '<path d="M2 12s4-7 10-7 10 7 10 7-4 7-10 7S2 12 2 12z"/><circle cx="12" cy="12" r="3"/>', walk: '<circle cx="13" cy="4.5" r="2"/><path d="M10 21l2-6 3 3v3M9 10l3-3 3 4 3 1M12 7l-1 5"/>',
    cart: '<path d="M3 5h3l2 10h10l2-7H7"/><circle cx="9" cy="19" r="1.6"/><circle cx="17" cy="19" r="1.6"/>', truck: '<path d="M2 7h11v9H2zM13 10h4l3 3v3h-7"/><circle cx="6" cy="17" r="1.8"/><circle cx="16" cy="17" r="1.8"/>',
  };
  const li = (n, s = 24, w = 1.9) => `<svg viewBox="0 0 24 24" width="${s}" height="${s}" fill="none" stroke="currentColor" stroke-width="${w}" stroke-linecap="round" stroke-linejoin="round">${L[n]}</svg>`;
  const RES = [['food', 14], ['water', 14], ['wood', 20], ['parts', 16], ['stash', 4]];
  const AV = { Marcus: '#e8734a', Amy: '#d95f8f', Ben: '#7fae4e', Rosa: '#d9a441', Lena: '#4f8fd9', Theo: '#8a6fd1', Ada: '#3cb0a0' };
  const av = (n, s = 40) => faces[n] ? `<span class="av pic" style="width:${s}px;height:${s}px;--c:${AV[n]}"><img src="${faces[n].bust}"></span>` : `<span class="av" style="width:${s}px;height:${s}px;font-size:${s * .42}px;background:${AV[n]}">${n[0]}</span>`;
  const TABC = { explore: '#5db4ff', people: '#ff8fb8', town: '#ffc24a', more: '#b79bff' }, TABI = { explore: 'explore', people: 'people', town: 'town', more: 'menu' };
  const tabIcon = (k) => opt.tabs === 'sticker' ? ic(TABI[k], 30) : opt.tabs === 'tint' ? `<span style="color:${TABC[k]};display:flex;filter:drop-shadow(0 1px 1px rgba(0,0,0,.45))">${li(k, 26, 2.3)}</span>` : opt.tabs === 'badge' ? `<span class="tbadge" style="background:${TABC[k]}">${li(k, 20, 2.4)}</span>` : li(k, 24);
  /* the mood faces chosen in W247 (set A; Allies = two faces together) */
  const INK = '#2a1d16', W = '#fff', stk = (f) => `fill="${f}" stroke="${W}" stroke-width="3.5" stroke-linejoin="round" paint-order="stroke"`;
  const face = (c, inner) => `<svg viewBox="0 0 48 48"><circle cx="24" cy="24" r="19" ${stk(c)}/>${inner}</svg>`;
  const MOODS = [
    ['Hostile', face('#ff6b4a', `<path d="M12 15 L21 19 M36 15 L27 19" stroke="${INK}" stroke-width="3.2" stroke-linecap="round"/><circle cx="18" cy="24" r="2.6" fill="${INK}"/><circle cx="30" cy="24" r="2.6" fill="${INK}"/><path d="M15 35 Q24 27 33 35" fill="none" stroke="${INK}" stroke-width="3.2" stroke-linecap="round"/>`)],
    ['Wary', face('#f0a24a', `<path d="M27 15 L35 13" stroke="${INK}" stroke-width="2.8" stroke-linecap="round"/><path d="M13 22 H21 M27 22 H35" stroke="${INK}" stroke-width="2.8" stroke-linecap="round"/><circle cx="20" cy="24.5" r="2.2" fill="${INK}"/><circle cx="34" cy="24.5" r="2.2" fill="${INK}"/><path d="M16 33 q4 -3 8 0 t8 0" fill="none" stroke="${INK}" stroke-width="2.8" stroke-linecap="round"/>`)],
    ['Neutral', face('#e8d27a', `<circle cx="18" cy="22" r="2.6" fill="${INK}"/><circle cx="30" cy="22" r="2.6" fill="${INK}"/><path d="M17 32 H31" stroke="${INK}" stroke-width="3" stroke-linecap="round"/>`)],
    ['Friendly', face('#6fb7ff', `<path d="M13 23 q4 -5 8 0 M27 23 q4 -5 8 0" fill="none" stroke="${INK}" stroke-width="2.8" stroke-linecap="round"/><path d="M15 29 Q24 38 33 29" fill="none" stroke="${INK}" stroke-width="3" stroke-linecap="round"/>`)],
    ['Allies', `<svg viewBox="0 0 48 48"><circle cx="17" cy="27" r="13" ${stk('#6fb7ff')}/><circle cx="32" cy="23" r="13" ${stk('#3cc6b0')}/><circle cx="13" cy="26" r="1.9" fill="${INK}"/><circle cx="20" cy="26" r="1.9" fill="${INK}"/><path d="M12 31 Q16.5 35 21 31" fill="none" stroke="${INK}" stroke-width="2.2" stroke-linecap="round"/><circle cx="28" cy="21" r="1.9" fill="${INK}"/><circle cx="35" cy="21" r="1.9" fill="${INK}"/><path d="M27 26 Q31.5 30 36 26" fill="none" stroke="${INK}" stroke-width="2.2" stroke-linecap="round"/></svg>`],
  ];
  const moodRow = (on) => `<div class="mood">${MOODS.map(([w, s], k) => `<span class="${k === on ? 'on' : ''}">${s}<small>${w}</small></span>`).join('')}</div>`;

  /* hide the game's own HUD; keep the 3D scene */
  let hs = document.getElementById('pbHide'); if (!hs) { hs = document.createElement('style'); hs.id = 'pbHide'; document.head.appendChild(hs); }
  hs.textContent = '#world > *:not(canvas), #bottom, .nStack, #infoPanel { visibility: hidden !important; }';
  document.querySelectorAll('.pb').forEach((e) => e.remove());
  const root = document.createElement('div'); root.className = 'pb'; document.body.appendChild(root);

  const hud = (o = {}) => `<div class="g cap topRes">${RES.map(([n, v]) => `<span>${ic(n, 20)}<b>${v}</b></span>`).join('')}</div>
    ${o.live === false ? '' : `<div class="g cap live"><span class="lz">${ic('zombie', 18)}</span><b>Herd on Route 9</b><em>2 days</em></div>`}
    <div class="g mission"><small>MISSION</small><b>Build a Rain Barrel</b><i>${li('chev', 16, 2.4)}</i></div>
    <div class="g cap clock">${ic('sun', 18)}<b>Day 38 · 14:20</b></div><div class="g cap renown">${ic('star', 18)}<b>Renown</b><span>40</span></div>`;
  const tabs = (sel) => `<div class="g tabcap">${[['explore', 'Explore'], ['people', 'People'], ['town', 'Town'], ['more', 'More']].map(([k, t]) => `<div class="tab${k === sel ? ' on' : ''}"><span>${tabIcon(k)}</span><small>${t}</small></div>`).join('')}</div><div class="buildBtn${sel === 'build' ? ' on' : ''}">${li('build', 28, 2.2)}</div>`;
  const sheet = (top, inner, cls = '') => `<div class="gd sheet ${cls}" style="top:${top}px"><i class="grab"></i>${inner}</div>`;
  const head = (t, right = li('x', 18, 2.4)) => `<div class="sh"><h1>${t}</h1><button class="g round">${right}</button></div>`;
  const people = [['On duty', [['Marcus', 'Guard', 'North wall post', 1], ['Amy', 'Medic', 'At the Medical Tent', .82], ['Ben', 'Farmer', 'Garden Plot', .95], ['Rosa', 'Builder', 'Building a Rain Barrel', .6]]], ['Out on a trip', [['Lena', 'Scavenger', 'Lumber Yard · back soon', .74]]], ['Resting', [['Theo', 'Fighter', 'Asleep in the Tent', .35], ['Ada', 'Mechanic', 'Free time · campfire', 1]]]];
  const hpc = (h) => h < .5 ? '#ff6b4a' : h < .8 ? '#f0b33a' : '#c6ff4d';
  let h = '';
  const S = {
    /* 1. the town */
    town: () => hud() + `<div class="g side"><b>1×</b></div><div class="g side s2">${li('target', 22)}</div>
      <div class="g cap tip">Day 38. A herd is two days out. Shore up the north wall.</div>` + tabs(''),
    /* 2. an ally's call for help: an incoming call */
    call: () => `<div class="callbg"></div><div class="call"><small class="ct">Radio call · Greenwater</small><div class="cav">${ic('leaf', 64)}</div><h2>Elder Maud</h2><p>"A herd is at our gate. Can you send people?"</p>
      <div class="cmini"><div><span class="g round big">${ic('box', 26)}</span><small>Send supplies</small></div><div><span class="g round big">${li('bell', 24)}</span><small>Remind me<br>in an hour</small></div></div>
      <div class="cbtns"><div><span class="cb no">${li('phone', 30)}</span><small>Can't help</small></div><div><span class="cb yes">${li('phone', 30)}</span><small>Send a squad</small></div></div></div>`,
    /* 3. the big warning: an emergency alert */
    alert: () => hud({ live: false }) + tabs('') + `<div class="redwash"></div><div class="g ealert"><div class="eh">${ic('warn', 22)}<b>Emergency alert</b><em>now</em></div><h3>Horde tonight</h3>
      <p>The radio says a big horde is coming down Route 9. It reaches the Haven at about 21:00.</p><p>Get everyone inside the walls and put your fighters on the posts.</p><div class="ebtn"><button class="g">Show me</button><button class="g">OK</button></div></div>`,
    /* 4. Needs you: the notification centre */
    needs: () => `<div class="nbg"></div><div class="ntime">14:20</div><div class="nday">Day 38 · Autumn</div><div class="nhead"><b>Needs you</b><button class="g cap">Clear tips ${li('x', 14, 2.6)}</button></div>
      <div class="g notif em"><div class="nh"><span class="nic" style="background:#ff6b4a">${ic('wall', 20)}</span><small>EMERGENCY</small><em>now</em></div><b>Wall breached · north side</b><p>Two zombies are through. Nobody is guarding that side.</p><div class="nact"><button>Send fighters</button><button>Show me</button></div></div>
      <div class="g notif"><div class="nh"><span class="nic" style="background:#d95f8f">${ic('medic', 20)}</span><small>PEOPLE</small><em>5 m ago</em></div><b>Theo is hurt</b><p>He is walking to the Medical Tent.</p></div>
      <div class="stack"><div class="g notif"><div class="nh"><span class="nic" style="background:#f0b33a">${ic('guide', 20)}</span><small>TIPS · 3</small><em>12 m ago</em></div><b>The Rain Barrel is waiting on wood</b><p>Lena is bringing 12 from the Lumber Yard.</p></div><i class="g s1"></i><i class="g s2"></i></div>
      <div class="swipe">Swipe a tip left to hide it until tomorrow</div><i class="homebar"></i>`,
    /* 5. the radio: now playing, with the words as they are said */
    radio: () => hud() + tabs('') + sheet(250, `<div class="np"><div class="art">${ic('radio', 70)}</div><div class="npt"><b>Moth FM</b><small>DJ Moth · live from the hill</small></div></div>
      <div class="prog"><i style="width:46%"></i></div><div class="ctl"><span>${li('back15', 26)}</span><span class="big">${li('pause', 34)}</span><span>${li('fwd', 26, 1)}</span></div>
      <div class="lyr"><p class="d">Whoever is out there, I hope you are safe.</p><p class="on">A herd is walking down Route 9, two days out, maybe less.</p><p>If you have walls, check the north side.</p><p class="d">If you don't, the old mill has a sturdy door.</p></div>`),
    /* 6. Explore: the valley map */
    map: () => `<div class="mapfull vmMap vm_gmap">${mapHtml}</div><div class="g cap mtop">${ic('sun', 18)}<b>Day 38 · Autumn</b></div><div class="g round mkey">${li('eye', 20)}</div>`
      + sheet(470, `<div class="g cap msearch">${li('search', 18, 2.2)}<span>Search the valley</span></div>
      <div class="pc"><div class="pch"><span class="pin" style="--r:#f0a24a">${ic('crown', 30)}</span><div><b>The Toll Kings' fort</b><small>Faction town · Route 9 · 1 h on foot</small></div></div>${moodRow(1)}
      <div class="pbtn"><button class="go">${li('walk', 20)} Plan a trip</button><button class="g">${ic('shop', 20)} Trade</button><button class="g">${ic('fight', 20)} Raid</button></div>
      <div class="row2">${ic('zombie', 18)}<span>A herd is coming down Route 9 past their gate in 2 days.</span></div></div>`, 'msheet'),
    /* 7. planning a trip: directions */
    trip: () => `<div class="mapfull vmMap vm_gmap">${mapHtml}<svg class="route" viewBox="0 0 360 500" preserveAspectRatio="xMidYMid slice"><path d="M180 318 L163 277 L146 236" fill="none" stroke="#1f6fe0" stroke-width="9" stroke-linecap="round" stroke-linejoin="round"/><path d="M180 318 L163 277 L146 236" fill="none" stroke="#4c9bff" stroke-width="5.5" stroke-linecap="round" stroke-linejoin="round"/></svg></div>`
      + sheet(440, `<div class="sh"><div><h1 style="font-size:24px">To Lumber Yard</h1><small class="mut">From the Haven · a lead, 7 hours left</small></div><button class="g round">${li('x', 18, 2.4)}</button></div>
      <div class="modes"><span class="on">${li('walk', 20)}<b>1 h</b><small>On foot</small></span><span>${li('cart', 20)}<b>45 m</b><small>Hand cart</small></span><span class="lock">${li('truck', 20)}<b>${ic('lock', 14)}</b><small>Truck</small></span></div>
      <div class="sq"><small class="mut">SQUAD</small><div class="avs">${['Lena', 'Marcus', 'Ben'].map((n) => `<span>${av(n, 44)}<small>${n}</small></span>`).join('')}<span><span class="g add">${li('plus', 20, 2.4)}</span><small>Add</small></span></div></div>
      <div class="row2"><span class="risk">Low risk</span><span>Nobody dies on a low-risk trip. Brings wood, rope, a little scrap.</span></div><button class="gobig">Go</button>`, 'msheet'),
    /* 8. People */
    people: () => hud({ live: false }) + sheet(64, head('People') + `<div class="g cap searchf">${li('search', 17, 2.2)}<span>Search</span></div><div class="g cap seg"><span class="on">All 7</span><span>Fighters 2</span><span>Workers 5</span></div>`
      + people.map(([t, rows]) => `<div class="sec">${t.toUpperCase()}</div><div class="grp">${rows.map(([n, j, w, hp], k) => `<div class="prow${t === 'On duty' && k === 3 ? ' swiped' : ''}">${av(n)}<div class="nm"><b>${n}</b><small>${j} · ${w}</small></div><span class="hp"><i style="width:${hp * 100}%;background:${hpc(hp)}"></i></span><i class="ch">${li('chev', 15, 2.4)}</i>${t === 'On duty' && k === 3 ? `<div class="swact"><span style="background:#4f8fd9">${li('gear', 18)}<small>Job</small></span><span style="background:#d95f8f">${ic('medic', 18)}<small>Heal</small></span></div>` : ''}</div>`).join('')}</div>`).join('')),
    /* 9. a survivor: the contact card, with rings */
    card: () => sheet(30, `<div class="sh" style="justify-content:flex-end"><button class="g round">${li('x', 18, 2.4)}</button></div><div class="cc">${faces.Amy ? `<span class="half" style="--c:${AV.Amy}"><img src="${faces.Amy.half}"></span>` : av('Amy', 96)}<h2>Amy</h2><small class="mut">Medic · Level 4 · founder</small></div>
      <div class="acts">${[['msg', 'Talk'], ['gear', 'Job'], ['target', 'Follow']].map(([i, t]) => `<span><span class="g round big">${li(i, 22)}</span><small>${t}</small></span>`).join('')}<span><span class="g round big">${ic('crowbar', 26)}</span><small>Gear</small></span></div>
      <div class="grp rings"><svg viewBox="0 0 120 120" width="112" height="112">${[[50, '#ff5b6b', .82], [38, '#f0a24a', .55], [26, '#4cc3ff', .7]].map(([r, c, v]) => `<circle cx="60" cy="60" r="${r}" fill="none" stroke="${c}" stroke-opacity=".22" stroke-width="10"/><circle cx="60" cy="60" r="${r}" fill="none" stroke="${c}" stroke-width="10" stroke-linecap="round" stroke-dasharray="${2 * Math.PI * r * v} 999" transform="rotate(-90 60 60)"/>`).join('')}</svg>
      <div class="rl"><p><i style="background:#ff5b6b"></i><b>Health</b><span>Fine</span></p><p><i style="background:#f0a24a"></i><b>Food</b><span>Getting hungry</span></p><p><i style="background:#4cc3ff"></i><b>Rest</b><span>Rested</span></p><p>${ic('happy', 16)}<b>Mood</b><span>Content</span></p></div></div>
      <div class="grp">${[['Now', 'At the Medical Tent'], ['Lives in', 'Tent 2, with Ben'], ['Good at', 'Medicine ★★★ · Calm'], ['Trait', 'Steady hands']].map(([a, b]) => `<div class="kv"><span class="mut">${a}</span><b>${b}</b></div>`).join('')}</div>`),
    /* 10. the Inventory */
    inv: () => hud({ live: false }) + sheet(64, head('Inventory') + `<div class="g cap seg five"><span class="on">Gear</span><span>Supplies</span><span>Combat</span><span>Tools</span><span>Story</span></div>`
      + `<div class="sec">WEAPONS</div><div class="ig">${pics.weapon.map(([id, u, c, n]) => `<span class="g it" style="--rc:${c}"><img src="${u}">${n > 1 ? `<em>${n}</em>` : ''}</span>`).join('')}${'<span class="it empty"></span>'.repeat(6 - pics.weapon.length % 6)}</div>`
      + `<div class="sec">ARMOUR AND HEAD</div><div class="ig">${pics.armor.map(([id, u, c, n]) => `<span class="g it" style="--rc:${c}"><img src="${u}">${n > 1 ? `<em>${n}</em>` : ''}</span>`).join('')}${'<span class="it empty"></span>'.repeat(6 + 6 - pics.armor.length % 6)}</div>
      <div class="hint mut">Tap an item to look at it and give it to someone.</div>`),
    /* 11. an item, and giving it like sharing to people nearby */
    item: () => sheet(64, head('Crowbar') + `<div class="ipic" style="--rc:#7cc95a"><img src="${pics.crowbar}"></div><div class="chips"><span class="chip" style="--rc:#7cc95a">Uncommon</span><span class="chip">Weapon · one hand</span></div>
      <div class="grp">${[['Attack', '12'], ['Speed', 'Quick'], ['Also', 'Opens locked doors']].map(([a, b]) => `<div class="kv"><span class="mut">${a}</span><b>${b}</b></div>`).join('')}</div>
      <p class="joke">Bends doors, crates and the rules. Nobody asks where you got it.</p>
      <div class="sec">GIVE TO</div><div class="share">${[['Marcus', '▲ better', 'up'], ['Ben', '▲ better', 'up'], ['Rosa', 'same', ''], ['Theo', '▼ worse', 'dn']].map(([n, t, c]) => `<span>${av(n, 54)}<b>${n}</b><small class="${c}">${t}</small></span>`).join('')}</div>`),
    /* 12. Build: folders of buildings */
    build: () => hud({ live: false }) + tabs('build') + sheet(250, head('Build') + `<div class="g cap searchf">${li('search', 17, 2.2)}<span>Build something</span></div>
      <div class="sec">FOR YOUR MISSION</div><div class="sug"><span><span class="app ring">${ic('water', 34)}</span><small>Rain Barrel</small></span><span><span class="app">${ic('bed', 34)}</span><small>Tent</small></span><span><span class="app">${ic('wall', 34)}</span><small>Wood Wall</small></span><span><span class="app">${ic('sprout', 34)}</span><small>Garden Plot</small></span></div>
      <div class="folders">${[['Shelter', ['tent', 'lodge', 'bed', 'home']], ['Food & water', ['sprout', 'water', 'meal', 'tree']], ['Defence', ['wall', 'post', 'shield', 'target']], ['Work', ['hammer', 'toolbox', 'pick', 'axe']], ['Power', ['power', 'fuel', 'sun', 'lock']], ['Fun', ['party', 'music', 'pet', 'gift']]].map(([t, is]) => `<span><span class="g fold">${is.map((i) => ic(i, 26)).join('')}</span><small>${t}</small></span>`).join('')}</div>`),
    /* 13. a faction: a message thread */
    msgs: () => sheet(40, `<div class="sh" style="flex-direction:column;align-items:center;gap:4px"><span class="pin" style="--r:#f0a24a">${ic('crown', 30)}</span><b>The Toll Kings</b><div class="mini">${MOODS[1][1]}<small>Wary of you</small></div></div>
      <div class="bub them">Nice walls. Be a shame if something happened to them.</div><div class="bub them">Toll's due. 8 scrap by sundown.</div><div class="bub us">We paid you last week.</div><div class="bub them">And you'll pay this week. That's how weeks work.</div>
      <div class="typing"><i></i><i></i><i></i></div><div class="replies"><button class="g cap">Pay 8 scrap</button><button class="g cap">Ask for more time</button><button class="g cap danger">Tell them to get lost</button></div>
      <div class="g cap compose"><span>Reply…</span>${li('send', 18, 2.4)}</div>`),
    /* 14. yesterday at the Haven: a daily report */
    report: () => sheet(40, head('Yesterday') + `<small class="mut">Day 37 at the Haven</small>
      <div class="grp pad"><small class="mut">ZOMBIES PUT DOWN, BY HOUR</small><div class="bars">${[0, 0, 0, 1, 0, 0, 0, 0, 0, 0, 1, 0, 0, 2, 1, 0, 0, 0, 0, 3, 6, 5, 3, 1].map((v, i) => `<i class="${i >= 20 || i < 6 ? 'n' : ''}" style="height:${6 + v * 13}px"></i>`).join('')}</div><div class="bl mut"><span>0:00</span><span>6:00</span><span>12:00</span><span>18:00</span></div></div>
      <div class="tiles">${[['zombie', '23', 'put down'], ['wood', '+40', 'wood'], ['food', '−6', 'food'], ['heart', '0', 'lost']].map(([i, v, t]) => `<span class="grp">${ic(i, 26)}<b>${v}</b><small class="mut">${t}</small></span>`).join('')}</div>
      <div class="grp">${[['Most kills', 'Marcus · 9'], ['Hardest worker', 'Ben · 11 h in the fields'], ['Closest call', 'Theo, down at 23:40']].map(([a, b]) => `<div class="kv"><span class="mut">${a}</span><b>${b}</b></div>`).join('')}</div>`),
    /* 15. Settings */
    settings: () => sheet(40, head('Settings') + [['GAME', [['music', 'Music', 1, '#d95f8f'], ['sound', 'Sound effects', 1, '#e8734a'], ['chat', 'Swearing', 0, '#8a6fd1'], ['guide', 'Advisor tips', 1, '#f0b33a'], ['speed', 'Slow down in emergencies', 0, '#4f8fd9']]], ['LOOK', [['star', 'Glass highlights', 1, '#3cb0a0'], ['eye', 'Ink outlines', 0, '#7fae4e']]], ['TOWN', [['save', 'Backup this town', -1, '#6b7480'], ['log', 'Event log', -1, '#6b7480']]]]
      .map(([t, rows]) => `<div class="sec">${t}</div><div class="grp">${rows.map(([i, n, on, c]) => `<div class="prow set"><span class="sqi" style="background:${c}">${ic(i, 20)}</span><b>${n}</b>${on < 0 ? `<i class="ch">${li('chev', 15, 2.4)}</i>` : `<span class="tg${on ? ' on' : ''}"><i></i></span>`}</div>`).join('')}</div>`).join('')),
    /* 16. idea 7: the town's own rings, on the Town tab */
    townrings: () => hud({ live: false }) + tabs('town') + sheet(200, head('Town') + `<div class="g cap seg"><span class="on">Haven</span><span>Defense</span><span>People</span><span>More</span></div>
      <div class="grp rings" style="margin-top:12px"><svg viewBox="0 0 120 120" width="128" height="128">${[[50, '#f0a24a', .6], [38, '#4cc3ff', .86], [26, '#b79bff', .45]].map(([r, c, v]) => `<circle cx="60" cy="60" r="${r}" fill="none" stroke="${c}" stroke-opacity=".22" stroke-width="10"/><circle cx="60" cy="60" r="${r}" fill="none" stroke="${c}" stroke-width="10" stroke-linecap="round" stroke-dasharray="${2 * Math.PI * r * v} 999" transform="rotate(-90 60 60)"/>`).join('')}</svg>
      <div class="rl wide"><p><i style="background:#f0a24a"></i><b>Fed</b><span>Food for 3 days</span></p><p><i style="background:#4cc3ff"></i><b>Beds</b><span>6 of 7 people have one</span></p><p><i style="background:#b79bff"></i><b>Walls</b><span>North side is damaged</span></p></div></div>
      <div class="sec">WHAT WOULD CLOSE THE RINGS</div><div class="grp">${[['sprout', 'Plant a second Garden Plot', '#f0a24a'], ['bed', 'Build one more Tent', '#4cc3ff'], ['wall', 'Repair the north wall', '#b79bff']].map(([i, t, c]) => `<div class="prow set"><span class="sqi" style="background:${c}">${ic(i, 20)}</span><b>${t}</b><i class="ch">${li('chev', 15, 2.4)}</i></div>`).join('')}</div>`),
  };
  h = S[name]();
  if (!['call', 'needs'].includes(name)) h += '<i class="homebar"></i>';
  root.innerHTML = h;
  let st = document.getElementById('pbStyle'); if (!st) { st = document.createElement('style'); st.id = 'pbStyle'; document.head.appendChild(st); }
  st.textContent = (mapCss || '') + `
  .pb { position: fixed; inset: 0; z-index: 9000; pointer-events: none; font-family: Manrope, Nunito, sans-serif; color: #fff; -webkit-font-smoothing: antialiased; overflow: hidden; }
  .pb .g { background: linear-gradient(180deg, rgba(255,255,255,.22), rgba(255,255,255,.08)); -webkit-backdrop-filter: blur(12px) saturate(170%); backdrop-filter: blur(12px) saturate(170%);
    box-shadow: inset 0 1px 0 rgba(255,255,255,.65), inset 0 -1px 1px rgba(255,255,255,.18), inset 1px 0 0 rgba(255,255,255,.2), inset -1px 0 0 rgba(255,255,255,.2), 0 8px 24px rgba(0,0,0,.28); text-shadow: 0 1px 2px rgba(0,0,0,.4); color: #fff; border: 0; font: inherit; }
  .pb .gd { background: linear-gradient(180deg, rgba(40,48,54,.66), rgba(20,26,30,.78)); -webkit-backdrop-filter: blur(22px) saturate(160%); backdrop-filter: blur(22px) saturate(160%); box-shadow: inset 0 1px 0 rgba(255,255,255,.45), inset 0 0 0 1px rgba(255,255,255,.12), 0 20px 50px rgba(0,0,0,.5); }
  .pb .cap { border-radius: 999px; } .pb .round { width: 36px; height: 36px; border-radius: 50%; display: grid; place-items: center; } .pb .round.big { width: 54px; height: 54px; }
  .pb .mut { color: rgba(255,255,255,.6); } .pb small { font-size: 12px; }
  .pb .homebar { position: absolute; left: 50%; bottom: 8px; width: 134px; height: 5px; margin-left: -67px; border-radius: 3px; background: rgba(255,255,255,.9); z-index: 20; }
  .pb .topRes { position: absolute; top: 12px; left: 50%; transform: translateX(-50%); display: flex; gap: 12px; padding: 7px 14px; } .pb .topRes span { display: flex; align-items: center; gap: 4px; } .pb .topRes b { font-size: 15px; font-weight: 800; }
  .pb .live { position: absolute; top: 56px; left: 50%; transform: translateX(-50%); display: flex; align-items: center; gap: 8px; padding: 5px 14px 5px 6px; background: rgba(0,0,0,.72) !important; white-space: nowrap; }
  .pb .live .lz { display: grid; place-items: center; width: 26px; height: 26px; border-radius: 50%; background: rgba(255,122,89,.3); } .pb .live b { font-size: 13.5px; } .pb .live em { font-style: normal; font-weight: 800; color: #ff9a6a; font-size: 13.5px; }
  .pb .mission { position: absolute; top: 100px; left: 12px; padding: 8px 32px 8px 14px; border-radius: 18px; } .pb .mission small { display: block; font-size: 10.5px; font-weight: 800; letter-spacing: .06em; opacity: .7; } .pb .mission b { font-size: 15px; } .pb .mission i { position: absolute; right: 10px; top: 50%; transform: translateY(-50%); opacity: .6; display: flex; }
  .pb .clock, .pb .renown { position: absolute; right: 12px; display: flex; align-items: center; gap: 6px; padding: 7px 12px; } .pb .clock { top: 100px; } .pb .renown { top: 144px; } .pb .clock b, .pb .renown b { font-size: 13.5px; } .pb .renown span { font-weight: 800; margin-left: 4px; }
  .pb .side { position: absolute; right: 14px; top: 420px; width: 50px; height: 50px; border-radius: 50%; display: grid; place-items: center; font-size: 15px; } .pb .side.s2 { top: 480px; }
  .pb .tip { position: absolute; left: 50%; transform: translateX(-50%); bottom: 104px; padding: 9px 16px; font-size: 13.5px; font-weight: 700; white-space: nowrap; }
  .pb .tabcap { position: absolute; left: 14px; bottom: 26px; right: 88px; height: 62px; border-radius: 999px; display: flex; justify-content: space-around; align-items: center; padding: 0 6px; z-index: 8; }
  .pb .tab { display: flex; flex-direction: column; align-items: center; gap: 2px; width: 25%; padding: 6px 0; border-radius: 999px; } .pb .tab small { font-size: 10.5px; font-weight: 800; } .pb .tab.on { background: rgba(255,255,255,.2); box-shadow: inset 0 1px 0 rgba(255,255,255,.5); }
  .pb .buildBtn { position: absolute; right: 14px; bottom: 26px; width: 62px; height: 62px; border-radius: 50%; display: grid; place-items: center; color: #1a2208; background: linear-gradient(180deg, rgba(214,255,120,.95), rgba(176,232,52,.85)); box-shadow: inset 0 1px 0 rgba(255,255,255,.9), inset 0 -2px 4px rgba(80,110,0,.35), 0 8px 24px rgba(0,0,0,.3); z-index: 8; }
  .pb .sheet { position: absolute; left: 8px; right: 8px; bottom: 8px; border-radius: 38px; padding: 8px 16px 0; z-index: 6; overflow: hidden; }
  .pb .grab { display: block; width: 36px; height: 5px; border-radius: 3px; margin: 0 auto 8px; background: rgba(255,255,255,.35); }
  .pb .sh { display: flex; align-items: center; justify-content: space-between; margin-bottom: 8px; } .pb h1 { margin: 2px 0; font-size: 28px; font-weight: 800; } .pb h2 { margin: 8px 0 2px; font-size: 26px; font-weight: 800; }
  .pb .searchf { display: flex; align-items: center; gap: 6px; height: 38px; padding: 0 12px; color: rgba(255,255,255,.7); font-size: 15px; }
  .pb .seg { display: flex; margin: 10px 0 2px; padding: 3px; } .pb .seg span { flex: 1; text-align: center; padding: 6px 0; font-size: 13px; font-weight: 700; border-radius: 999px; color: rgba(255,255,255,.8); } .pb .seg span.on { background: rgba(255,255,255,.24); color: #fff; box-shadow: inset 0 1px 0 rgba(255,255,255,.5); } .pb .seg.five span { font-size: 12px; }
  .pb .sec { margin: 14px 14px 6px; font-size: 12.5px; font-weight: 800; letter-spacing: .04em; color: rgba(255,255,255,.55); }
  .pb .grp { background: rgba(255,255,255,.07); border-radius: 24px; box-shadow: inset 0 1px 0 rgba(255,255,255,.12); overflow: hidden; } .pb .grp.pad { padding: 12px 14px; margin-top: 10px; }
  .pb .av { display: grid; place-items: center; border-radius: 50%; color: #fff; font-weight: 800; flex: none; box-shadow: inset 0 1px 0 rgba(255,255,255,.35); }
  .pb .prow { position: relative; display: flex; align-items: center; gap: 12px; min-height: 58px; padding: 0 14px; } .pb .prow + .prow::before { content: ''; position: absolute; left: 66px; right: 0; top: 0; border-top: .5px solid rgba(255,255,255,.12); }
  .pb .nm { flex: 1; min-width: 0; } .pb .nm b { display: block; font-size: 16px; } .pb .nm small { display: block; color: rgba(255,255,255,.6); font-size: 13px; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
  .pb .hp { width: 38px; height: 6px; border-radius: 3px; background: rgba(255,255,255,.14); flex: none; } .pb .hp i { display: block; height: 6px; border-radius: 3px; } .pb .ch { display: flex; opacity: .35; }
  .pb .prow.swiped { transform: translateX(-128px); } .pb .swact { position: absolute; right: -128px; top: 0; bottom: 0; display: flex; } .pb .swact span { width: 64px; display: flex; flex-direction: column; align-items: center; justify-content: center; gap: 2px; font-size: 11px; font-weight: 800; }
  .pb .av.pic { background: radial-gradient(circle at 50% 35%, color-mix(in srgb, var(--c) 85%, #fff), color-mix(in srgb, var(--c) 70%, #000)); overflow: hidden; box-shadow: inset 0 0 0 1.5px rgba(255,255,255,.55), 0 2px 6px rgba(0,0,0,.3); } .pb .av.pic img { width: 128%; height: 128%; margin-top: 16%; object-fit: cover; }
  .pb .half { width: 132px; height: 150px; border-radius: 30px; display: flex; align-items: flex-end; justify-content: center; overflow: hidden; background: radial-gradient(circle at 50% 30%, color-mix(in srgb, var(--c) 80%, #fff), color-mix(in srgb, var(--c) 60%, #000)); box-shadow: inset 0 0 0 2px rgba(255,255,255,.5), inset 0 1px 0 rgba(255,255,255,.7), 0 10px 24px rgba(0,0,0,.35); } .pb .half img { height: 100%; }
  .pb .tbadge { width: 34px; height: 34px; border-radius: 50%; display: grid; place-items: center; color: #fff; box-shadow: inset 0 1px 0 rgba(255,255,255,.6), inset 0 -2px 3px rgba(0,0,0,.18), 0 2px 5px rgba(0,0,0,.3); }
  .pb .rl.wide b { width: 46px; } .pb .rl.wide p { margin: 8px 0; }
  /* call */
  .pb .callbg { position: absolute; inset: 0; background: rgba(10,16,14,.55); -webkit-backdrop-filter: blur(28px) saturate(140%); backdrop-filter: blur(28px) saturate(140%); }
  .pb .call { position: absolute; inset: 0; display: flex; flex-direction: column; align-items: center; padding-top: 90px; text-align: center; } .pb .ct { opacity: .75; font-size: 15px; font-weight: 700; }
  .pb .cav { margin-top: 26px; width: 120px; height: 120px; border-radius: 50%; display: grid; place-items: center; background: radial-gradient(circle at 35% 30%, #7fd08a, #2f7a48); box-shadow: inset 0 2px 0 rgba(255,255,255,.4), 0 0 0 10px rgba(255,255,255,.08), 0 0 0 22px rgba(255,255,255,.04); }
  .pb .call h2 { font-size: 34px; margin-top: 18px; } .pb .call p { margin: 6px 40px; font-size: 16px; line-height: 1.4; opacity: .85; }
  .pb .cmini { position: absolute; bottom: 220px; left: 0; right: 0; display: flex; justify-content: space-around; } .pb .cmini div, .pb .cbtns div { display: flex; flex-direction: column; align-items: center; gap: 6px; } .pb .cmini small { font-weight: 700; line-height: 1.25; }
  .pb .cbtns { position: absolute; bottom: 90px; left: 0; right: 0; display: flex; justify-content: space-around; } .pb .cbtns small { font-size: 13.5px; font-weight: 800; }
  .pb .cb { width: 76px; height: 76px; border-radius: 50%; display: grid; place-items: center; box-shadow: inset 0 2px 0 rgba(255,255,255,.5), 0 10px 26px rgba(0,0,0,.35); } .pb .cb.no { background: #ff5b4a; } .pb .cb.no svg { transform: rotate(135deg); } .pb .cb.yes { background: #b6f03c; color: #1a2208; }
  /* emergency alert */
  .pb .redwash { position: absolute; inset: 0; background: radial-gradient(ellipse at center, rgba(120,0,0,.15), rgba(140,10,0,.55)); }
  .pb .ealert { position: absolute; left: 22px; right: 22px; top: 230px; border-radius: 30px; padding: 16px 18px 14px; background: linear-gradient(180deg, rgba(60,20,16,.72), rgba(30,14,12,.8)) !important; }
  .pb .eh { display: flex; align-items: center; gap: 8px; } .pb .eh b { flex: 1; font-size: 15px; letter-spacing: .02em; } .pb .eh em { font-style: normal; opacity: .6; font-size: 13px; }
  .pb .ealert h3 { margin: 10px 0 6px; font-size: 26px; font-weight: 800; color: #ffb199; letter-spacing: .01em; text-transform: uppercase; } .pb .ealert p { margin: 6px 0; font-size: 15px; line-height: 1.4; }
  .pb .ebtn { display: flex; gap: 10px; margin-top: 14px; } .pb .ebtn button { flex: 1; height: 46px; border-radius: 999px; font-weight: 800; font-size: 16px; }
  /* needs you */
  .pb .nbg { position: absolute; inset: 0; background: rgba(8,12,14,.35); -webkit-backdrop-filter: blur(18px); backdrop-filter: blur(18px); }
  .pb .ntime { position: absolute; top: 40px; width: 100%; text-align: center; font-size: 78px; font-weight: 800; letter-spacing: -.02em; } .pb .nday { position: absolute; top: 132px; width: 100%; text-align: center; font-weight: 700; opacity: .85; }
  .pb .nhead { position: absolute; top: 186px; left: 16px; right: 16px; display: flex; justify-content: space-between; align-items: center; } .pb .nhead b { font-size: 22px; } .pb .nhead button { display: flex; align-items: center; gap: 4px; padding: 6px 12px; font-size: 13px; font-weight: 800; }
  .pb .notif { position: relative; margin: 0 12px 10px; border-radius: 26px; padding: 12px 14px; } .pb .notif b { display: block; font-size: 15px; } .pb .notif p { margin: 2px 0 0; font-size: 14px; opacity: .88; line-height: 1.35; }
  .pb .nbg + .ntime ~ .notif.em { margin-top: 232px; } .pb .notif.em { background: linear-gradient(180deg, rgba(255,107,74,.38), rgba(255,107,74,.16)) !important; }
  .pb .nh { display: flex; align-items: center; gap: 8px; margin-bottom: 4px; } .pb .nh small { flex: 1; font-weight: 800; letter-spacing: .04em; opacity: .75; } .pb .nh em { font-style: normal; font-size: 12.5px; opacity: .6; } .pb .nic { width: 26px; height: 26px; border-radius: 7px; display: grid; place-items: center; }
  .pb .nact { display: flex; gap: 8px; margin-top: 10px; } .pb .nact button { flex: 1; height: 36px; border-radius: 999px; border: 0; color: #fff; font: 800 13.5px Manrope, sans-serif; background: rgba(255,255,255,.18); }
  .pb .stack { position: relative; } .pb .stack > i { position: absolute; left: 22px; right: 22px; height: 16px; border-radius: 0 0 22px 22px; } .pb .stack > i.s1 { bottom: -8px; opacity: .8; z-index: -1; } .pb .stack > i.s2 { left: 32px; right: 32px; bottom: -15px; opacity: .55; z-index: -2; }
  .pb .swipe { margin: 30px 0 0; text-align: center; font-size: 13px; opacity: .6; }
  /* radio */
  .pb .np { display: flex; gap: 14px; align-items: center; margin-top: 4px; } .pb .art { width: 92px; height: 92px; border-radius: 18px; display: grid; place-items: center; background: linear-gradient(150deg, #ff9a6a, #8a4fd1); box-shadow: inset 0 1px 0 rgba(255,255,255,.4), 0 8px 20px rgba(0,0,0,.3); } .pb .npt b { display: block; font-size: 21px; } .pb .npt small { opacity: .7; font-size: 14px; }
  .pb .prog { height: 5px; border-radius: 3px; background: rgba(255,255,255,.2); margin: 18px 4px 10px; } .pb .prog i { display: block; height: 5px; border-radius: 3px; background: #fff; }
  .pb .ctl { display: flex; justify-content: center; align-items: center; gap: 46px; } .pb .lyr { margin-top: 18px; } .pb .lyr p { margin: 0 0 10px; font-size: 21px; font-weight: 800; line-height: 1.3; color: rgba(255,255,255,.4); } .pb .lyr p.on { color: #fff; } .pb .lyr p.d { color: rgba(255,255,255,.25); }
  /* map */
  .pb .mapfull { position: absolute; left: 0; top: 0; width: 390px; height: 545px; border-radius: 0 !important; }
  .pb .route { position: absolute; inset: 0; width: 100%; height: 100%; }
  .pb .mtop { position: absolute; top: 12px; left: 12px; display: flex; gap: 6px; align-items: center; padding: 7px 12px; z-index: 5; } .pb .mtop b { font-size: 13.5px; } .pb .mkey { position: absolute; top: 12px; right: 12px; z-index: 5; }
  .pb .msheet { border-radius: 34px; } .pb .msearch { display: flex; align-items: center; gap: 8px; height: 42px; padding: 0 14px; color: rgba(255,255,255,.75); font-size: 16px; }
  .pb .pc { margin-top: 12px; } .pb .pch { display: flex; gap: 12px; align-items: center; } .pb .pch b { display: block; font-size: 19px; } .pb .pch small { opacity: .7; font-size: 13px; }
  .pb .pin { display: grid; place-items: center; width: 46px; height: 46px; border-radius: 50%; background: rgba(16,22,28,.86); box-shadow: 0 0 0 3px var(--r), 0 3px 8px rgba(0,0,0,.45); flex: none; }
  .pb .mood { display: flex; justify-content: space-between; margin: 14px 4px 4px; } .pb .mood span { width: 20%; display: flex; flex-direction: column; align-items: center; gap: 3px; opacity: .4; } .pb .mood span.on { opacity: 1; } .pb .mood svg { width: 34px; height: 34px; } .pb .mood span.on svg { width: 44px; height: 44px; filter: drop-shadow(0 0 6px rgba(240,162,74,.6)); } .pb .mood small { font-size: 11px; } .pb .mood span.on small { font-weight: 800; font-size: 12.5px; }
  .pb .pbtn { display: flex; gap: 8px; margin-top: 12px; } .pb .pbtn button { flex: 1; height: 46px; border-radius: 999px; display: flex; align-items: center; justify-content: center; gap: 6px; font-size: 14px; font-weight: 800; color: #fff; }
  .pb button.go, .pb .gobig { background: linear-gradient(180deg, #d6ff78, #b0e834) !important; color: #1a2208 !important; text-shadow: none !important; border: 0; box-shadow: inset 0 1px 0 rgba(255,255,255,.9), 0 6px 16px rgba(0,0,0,.25); } .pb .pbtn button.go { flex: 1.4; }
  .pb .row2 { display: flex; gap: 8px; align-items: center; margin-top: 12px; font-size: 13.5px; opacity: .9; line-height: 1.35; }
  .pb .modes { display: flex; gap: 8px; } .pb .modes span { flex: 1; display: flex; flex-direction: column; align-items: center; padding: 8px 0; border-radius: 18px; background: rgba(255,255,255,.07); } .pb .modes span.on { background: rgba(76,155,255,.3); box-shadow: inset 0 0 0 1.5px #4c9bff; } .pb .modes span.lock { opacity: .45; } .pb .modes b { font-size: 15px; margin-top: 2px; }
  .pb .sq { margin-top: 12px; } .pb .avs { display: flex; gap: 14px; margin-top: 6px; } .pb .avs > span { display: flex; flex-direction: column; align-items: center; gap: 3px; font-weight: 700; } .pb .add { width: 44px; height: 44px; border-radius: 50%; display: grid; place-items: center; }
  .pb .risk { flex: none; padding: 4px 10px; border-radius: 999px; background: rgba(124,201,90,.3); color: #c9f2b0; font-weight: 800; font-size: 12.5px; }
  .pb .gobig { display: block; width: 100%; height: 52px; margin-top: 14px; border-radius: 999px; font: 800 18px Manrope, sans-serif; }
  /* contact card */
  .pb .cc { display: flex; flex-direction: column; align-items: center; margin-top: -10px; } .pb .acts { display: flex; justify-content: center; gap: 20px; margin: 14px 0; } .pb .acts > span { display: flex; flex-direction: column; align-items: center; gap: 4px; font-weight: 700; }
  .pb .rings { display: flex; align-items: center; gap: 14px; padding: 12px 14px; margin-bottom: 12px; } .pb .rl p { margin: 4px 0; display: flex; align-items: center; gap: 8px; font-size: 14px; } .pb .rl i { width: 10px; height: 10px; border-radius: 50%; } .pb .rl b { width: 54px; } .pb .rl span { opacity: .75; }
  .pb .kv { position: relative; display: flex; justify-content: space-between; gap: 12px; padding: 13px 14px; font-size: 14.5px; } .pb .kv + .kv::before { content: ''; position: absolute; left: 14px; right: 0; top: 0; border-top: .5px solid rgba(255,255,255,.12); }
  /* inventory */
  .pb .ig { display: grid; grid-template-columns: repeat(6, 1fr); gap: 7px; } .pb .it { position: relative; aspect-ratio: 1; border-radius: 14px; display: grid; place-items: center; box-shadow: inset 0 0 0 2px var(--rc), inset 0 1px 0 rgba(255,255,255,.5), 0 4px 10px rgba(0,0,0,.2) !important; } .pb .it img { width: 88%; height: 88%; object-fit: contain; }
  .pb .it.empty { background: rgba(255,255,255,.04); box-shadow: inset 0 0 0 1px rgba(255,255,255,.08); } .pb .it em { position: absolute; right: -3px; top: -3px; min-width: 18px; height: 18px; padding: 0 4px; border-radius: 9px; background: #ff5b4a; font: 800 11px/18px Manrope, sans-serif; font-style: normal; text-align: center; }
  .pb .hint { margin: 12px 4px; font-size: 13px; }
  .pb .ipic { height: 200px; border-radius: 28px; display: grid; place-items: center; background: radial-gradient(circle at 50% 40%, rgba(124,201,90,.35), rgba(255,255,255,.04)); box-shadow: inset 0 0 0 2px var(--rc), inset 0 1px 0 rgba(255,255,255,.4); } .pb .ipic img { height: 92%; }
  .pb .chips { display: flex; gap: 6px; margin: 10px 0; } .pb .chip { padding: 4px 10px; border-radius: 999px; font-size: 12.5px; font-weight: 800; background: rgba(255,255,255,.12); } .pb .chip[style] { background: color-mix(in srgb, var(--rc) 35%, transparent); }
  .pb .joke { font-style: italic; opacity: .8; margin: 10px 4px; font-size: 14px; }
  .pb .share { display: flex; justify-content: space-around; } .pb .share > span { display: flex; flex-direction: column; align-items: center; gap: 3px; } .pb .share b { font-size: 13.5px; } .pb .share .up { color: #c6ff4d; font-weight: 800; } .pb .share .dn { color: #ff8a6a; font-weight: 800; }
  /* build */
  .pb .sug { display: flex; justify-content: space-between; padding: 0 4px; } .pb .sug > span, .pb .folders > span { display: flex; flex-direction: column; align-items: center; gap: 5px; } .pb .sug small, .pb .folders small { font-weight: 700; }
  .pb .app { width: 62px; height: 62px; border-radius: 16px; display: grid; place-items: center; background: rgba(255,255,255,.12); box-shadow: inset 0 1px 0 rgba(255,255,255,.4); } .pb .app.ring { box-shadow: 0 0 0 2.5px #c6ff4d, inset 0 1px 0 rgba(255,255,255,.4); }
  .pb .folders { display: grid; grid-template-columns: repeat(3, 1fr); gap: 14px 10px; margin-top: 16px; } .pb .fold { width: 96px; height: 96px; border-radius: 24px; display: grid; grid-template-columns: 1fr 1fr; place-items: center; padding: 10px; }
  /* messages */
  .pb .mini { display: flex; align-items: center; gap: 6px; } .pb .mini svg { width: 22px; height: 22px; } .pb .mini small { opacity: .8; font-weight: 700; }
  .pb .bub { max-width: 74%; margin: 6px 0; padding: 10px 14px; border-radius: 22px; font-size: 15.5px; line-height: 1.35; } .pb .bub.them { background: rgba(255,255,255,.14); border-bottom-left-radius: 6px; } .pb .bub.us { margin-left: auto; background: #2f7fe0; border-bottom-right-radius: 6px; }
  .pb .typing { display: inline-flex; gap: 4px; padding: 12px 14px; border-radius: 22px; background: rgba(255,255,255,.14); margin: 4px 0; } .pb .typing i { width: 7px; height: 7px; border-radius: 50%; background: rgba(255,255,255,.6); }
  .pb .replies { display: flex; flex-direction: column; align-items: flex-end; gap: 8px; margin-top: 14px; } .pb .replies button { padding: 10px 16px; font-size: 14.5px; font-weight: 800; } .pb .replies button.danger { background: linear-gradient(180deg, rgba(255,107,74,.45), rgba(255,107,74,.25)) !important; }
  .pb .compose { display: flex; justify-content: space-between; align-items: center; height: 42px; padding: 0 6px 0 16px; margin-top: 18px; opacity: .8; } .pb .compose svg { background: #2f7fe0; border-radius: 50%; padding: 6px; box-sizing: content-box; }
  /* report */
  .pb .bars { display: flex; align-items: flex-end; gap: 4px; height: 100px; margin-top: 10px; } .pb .bars i { flex: 1; border-radius: 3px; background: #c6ff4d; } .pb .bars i.n { background: #8a6fd1; } .pb .bl { display: flex; justify-content: space-between; font-size: 11px; margin-top: 4px; }
  .pb .tiles { display: grid; grid-template-columns: repeat(4, 1fr); gap: 8px; margin: 10px 0; } .pb .tiles > span { display: flex; flex-direction: column; align-items: center; padding: 10px 0; border-radius: 20px; } .pb .tiles b { font-size: 20px; margin-top: 4px; }
  /* settings */
  .pb .prow.set { min-height: 50px; } .pb .prow.set b { flex: 1; font-size: 15.5px; } .pb .sqi { width: 30px; height: 30px; border-radius: 8px; display: grid; place-items: center; flex: none; }
  .pb .tg { width: 52px; height: 31px; border-radius: 999px; background: rgba(255,255,255,.18); position: relative; flex: none; } .pb .tg i { position: absolute; left: 2px; top: 2px; width: 27px; height: 27px; border-radius: 50%; background: #fff; box-shadow: 0 2px 4px rgba(0,0,0,.3); } .pb .tg.on { background: #8fd12a; } .pb .tg.on i { left: 23px; }
  `;
};

module.exports = { SCREEN };
if (require.main === module) (async () => {
  const fs = require('fs'); const path = require('path'); const out = path.join(__dirname, '../../runs/ui_samples'); fs.mkdirSync(out, { recursive: true });
  const b = await Q.launch(); const p = await Q.page(b, { w: 390, h: 844, expose: 'ITEMS, invPic, itemRar, RARITY' }); await Q.newGame(p); await Q.clearCards(p); await p.waitForTimeout(2500); await Q.clearCards(p); await p.waitForTimeout(500); await Q.clearCards(p);
  /* the game's own item pictures (before anything else: invPic needs the town's 3D view idle) */
  console.log('game ready');
  const pics = await p.evaluate(async () => {
    const pic = async (id) => { for (let i = 0; i < 8; i++) { const u = ZH.invPic(id, 160); if (u) return u; await new Promise((r) => setTimeout(r, 200)); } return ''; };
    const mk = async (ids) => { const o = []; for (const [id, n] of ids) { o.push([id, await pic(id), ZH.RARITY[ZH.itemRar(id)].c, n]); console.log('pic ' + id); } return o; };
    return { weapon: await mk([['katana', 1], ['shotgun', 1], ['axe', 1], ['pistol', 2], ['crowbar', 1], ['machete', 1], ['bat', 3], ['bow', 1], ['knife', 2]]),
      armor: await mk([['kevlar', 1], ['riot', 1], ['plate', 1], ['military', 1], ['army', 1], ['hardhat', 2], ['gasmask', 1], ['swathelm', 1]]), crowbar: await pic('crowbar') };
  });
  /* the valley map (look C, moods as words) for the map screens */
  await p.click('#mExp'); await p.waitForTimeout(500);
  await p.evaluate(VALLEY, { look: 'gmap', scene: 'mid', card: '', mood: 'word' }); await p.waitForTimeout(300);
  const { mapHtml, mapCss } = await p.evaluate(() => ({ mapHtml: document.querySelector('.vmMap').innerHTML, mapCss: document.getElementById('vmStyle').textContent }));
  console.log('map captured', mapHtml.length); await p.evaluate(() => { document.getElementById('closeInfo') && document.getElementById('closeInfo').click(); });
  console.log('pics', pics.weapon.filter((x) => x[1]).length, pics.armor.filter((x) => x[1]).length);
  const names = ['town', 'call', 'alert', 'needs', 'radio', 'map', 'trip', 'people', 'card', 'inv', 'item', 'build', 'msgs', 'report', 'settings'];
  const files = [];
  for (let i = 0; i < names.length; i++) {
    await p.evaluate(SCREEN, { name: names[i], mapHtml, mapCss, pics }); await p.waitForTimeout(350);
    const f = path.join(out, `phoneB_${String(i + 1).padStart(2, '0')}_${names[i]}.png`); await p.screenshot({ path: f }); files.push(f); console.log('shot', f);
  }
  await b.close();
})();
