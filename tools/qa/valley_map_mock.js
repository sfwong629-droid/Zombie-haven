// tools/qa/valley_map_mock.js — UI chat, 23 Nov (W237: "a map of the valley in place of the trip list"; places and where they
// lie: 15-STRONGHOLDS.md, 10.10). MOCKUP ONLY: draws the valley map inside the real game page (its fonts, icons and glass panel) and
// takes phone-size pictures for the owner to judge. Nothing in the game changes. Pictures go to runs/ui_samples/.
// Usage: node tools/qa/valley_map_mock.js   (needs the game served on :8765, like the other QA tools)
const Q = require('./lib');

const MOCK = function ({ look, scene, card }) {
  /* ---------- the places (15-STRONGHOLDS.md 10.10), in a 360 x 500 map, north up ---------- */
  const P = {
    haven:   { x: 180, y: 318, n: 'The Haven', ic: 'home', k: 'home' },
    green:   { x: 60, y: 250, n: 'Greenwater', ic: 'leaf', k: 'fac' },
    gh:      { x: 104, y: 300, n: 'Greenhouse', ic: 'sprout', k: 'wild', season: 'spring' },
    clinic:  { x: 236, y: 362, n: 'Clinic', ic: 'medic', k: 'sealed' },
    prison:  { x: 184, y: 452, n: 'Prison', ic: 'fort', k: 'sealed' },
    toll:    { x: 262, y: 186, n: 'Toll Kings', ic: 'crown', k: 'fac' },
    foundry: { x: 74, y: 428, n: 'Foundry', ic: 'factory', k: 'fac' },
    refin:   { x: 302, y: 440, n: 'Refinery', ic: 'fire', k: 'wild', season: 'summer' },
    bravo:   { x: 318, y: 276, n: 'Bravo', ic: 'flag', k: 'fac' },
    depot:   { x: 318, y: 124, n: 'Depot', ic: 'snow', k: 'wild', season: 'winter' },
    helix:   { x: 186, y: 104, n: 'Helix lab', ic: 'research', k: 'fac' },
    hollow:  { x: 116, y: 166, n: 'The Hollow', ic: 'candle', k: 'fac' },
    fair:    { x: 64, y: 122, n: 'Harvest Fair', ic: 'party', k: 'wild', season: 'autumn' },
    mast:    { x: 76, y: 40, n: 'Radio Mast', ic: 'radio', k: 'story' },
    sunny:   { x: 314, y: 42, n: 'Sunnyside', ic: 'meal', k: 'fac' },
    weir:    { x: 40, y: 484, n: 'The weir', ic: 'water', k: 'story' },
    lumber:  { x: 146, y: 236, n: 'Lumber Yard', ic: 'tree', k: 'search' },
    gas:     { x: 226, y: 262, n: 'Gas Station', ic: 'fuel', k: 'search' },
    ware:    { x: 280, y: 330, n: 'Warehouses', ic: 'box', k: 'search' },
    quarry:  { x: 140, y: 66, n: 'Quarry', ic: 'pick', k: 'search' },
    army:    { x: 250, y: 408, n: 'Army post', ic: 'ammo', k: 'search' },
    houses:  { x: 128, y: 372, n: 'Elm Row', ic: 'door', k: 'search' },
  };
  /* ---------- the state of each place in each scene ---------- */
  const MID = {   /* level 10, day 38, autumn */
    haven: { st: 'home', tag: 'Level 10' },
    green: { st: 'friend', tag: 'Friends' }, gh: { st: 'off', tag: 'Spring' },
    clinic: { st: 'outpost', tag: 'Outpost' }, prison: { st: 'sealed', tag: '41 / 70' },
    toll: { st: 'wary', tag: 'Wary' }, foundry: { st: 'rival', tag: 'Rivals' }, refin: { st: 'off', tag: 'Summer' },
    bravo: { st: 'neutral', tag: 'Neutral' }, depot: { st: 'off', tag: 'Winter' }, helix: { st: 'neutral', tag: 'Met' },
    hollow: { st: 'locked', tag: 'Level 11' }, fair: { st: 'open', tag: 'Open now' }, mast: { st: 'locked', tag: 'Level 19' },
    sunny: { st: 'locked', tag: 'Level 16' }, weir: { st: 'faint' },
    lumber: { st: 'lead', tag: 'Lead · 7 h' }, gas: { st: 'search' }, ware: { st: 'lead', tag: 'Lead · 4 h' },
    quarry: { st: 'search' }, army: { st: 'search' }, houses: { st: 'call', tag: 'Help!' },
  };
  const EARLY = {   /* level 3, day 2 */
    haven: { st: 'home', tag: 'Level 3' }, green: { st: 'neutral', tag: 'Heard of' }, clinic: { st: 'sealed', tag: '0 / 60' },
    lumber: { st: 'lead', tag: 'Lead · 9 h' }, gas: { st: 'lead', tag: 'Lead · 5 h' }, houses: { st: 'search' },
    toll: { st: 'rumour', tag: 'Rumour' }, ware: { st: 'locked', tag: 'Level 4' },
  };
  const S = scene === 'early' ? EARLY : MID;
  const paper = look === 'paper';
  const C = paper
    ? { bg: '#e9dcbf', bg2: '#dfcfab', ink: '#5a4630', faint: 'rgba(90,70,48,.35)', river: '#5d93b5', riverHi: '#9cc4dc', road: '#c99a5c', roadEdge: '#7a5a36', hill: 'rgba(122,94,58,.38)', wood: '#7f9a5a', wood2: '#6d8a4c', field: 'rgba(160,150,80,.18)', label: '#3d2f1f', halo: 'rgba(240,230,205,.95)', cordon: '#c2473a', fog: '#e9dcbf' }
    : { bg: '#18242c', bg2: '#1d2c35', ink: '#9fb3bf', faint: 'rgba(160,190,205,.22)', river: '#2f7fb0', riverHi: '#6fc3f0', road: '#c7b48c', roadEdge: 'rgba(0,0,0,.55)', hill: 'rgba(150,180,195,.18)', wood: '#2f5236', wood2: '#27452d', field: 'rgba(120,150,90,.10)', label: '#ffffff', halo: 'rgba(10,16,20,.85)', cordon: '#ff7a59', fog: '#18242c' };
  const RING = { home: '#ffffff', friend: '#6fb7ff', neutral: '#e8d27a', wary: '#f0a24a', rival: '#ff7a59', sealed: '#c0392b', outpost: '#4fd1c5', open: '#f2a93b', off: '#8a8f94', locked: '#8a8f94', story: '#b08cff', lead: '#f2c94c', search: '#ffffff', call: '#ff7a59', rumour: '#8a8f94', faint: '#8a8f94' };
  const ic = (n, s) => ZHIcons.svg(n, s);

  /* ---------- the drawn valley (SVG) ---------- */
  const W = 360, H = 500;
  const sm = (pts) => pts.map((p, i) => (i ? 'L' : 'M') + p[0] + ' ' + p[1]).join(' ');
  const curve = (pts) => { let d = `M${pts[0][0]} ${pts[0][1]}`; for (let i = 1; i < pts.length; i++) { const a = pts[i - 1], b = pts[i]; const mx = (a[0] + b[0]) / 2, my = (a[1] + b[1]) / 2; d += ` Q${a[0]} ${a[1]} ${mx} ${my}`; } const l = pts[pts.length - 1]; return d + ` T${l[0]} ${l[1]}`; };
  const river = [[26, -5], [40, 70], [44, 130], [34, 200], [40, 262], [50, 330], [36, 400], [32, 450], [40, 505]];
  const roads = [
    { pts: [[180, 318], [204, 290], [226, 262], [244, 222], [262, 186], [288, 112], [314, 42]], w: 7, hw: true },   /* the north-east highway */
    { pts: [[180, 318], [210, 340], [236, 362], [250, 408], [276, 428], [302, 440]], w: 4 },   /* the valley road south-east */
    { pts: [[180, 318], [182, 390], [184, 452]], w: 4 },   /* south road to the prison */
    { pts: [[180, 318], [146, 236], [116, 166], [84, 140], [64, 122]], w: 4 },   /* the old ring road north-west */
    { pts: [[146, 236], [168, 170], [186, 104]], w: 3 },   /* track to the Helix lab */
    { pts: [[186, 104], [140, 66], [100, 50], [76, 40]], w: 2.5, dash: true },   /* the hill path to the mast */
    { pts: [[180, 318], [120, 284], [60, 250]], w: 4 },   /* west road to Greenwater */
    { pts: [[60, 250], [62, 340], [74, 428]], w: 3 },   /* river road to the Foundry */
    { pts: [[180, 318], [230, 322], [280, 330], [318, 276]], w: 4 },   /* east road to Bravo */
    { pts: [[318, 276], [322, 200], [318, 124]], w: 3 },   /* along the cordon */
    { pts: [[182, 390], [150, 380], [128, 372]], w: 2.5 },   /* Elm Row */
  ];
  const woods = [[140, 214, 26], [214, 212, 18], [98, 368, 18], [232, 150, 16], [292, 380, 14], [160, 140, 14]];
  let g = `<svg viewBox="0 0 ${W} ${H}" width="100%" height="100%" preserveAspectRatio="xMidYMid slice" style="display:block">`;
  g += `<defs><pattern id="vmGrain" width="6" height="6" patternUnits="userSpaceOnUse"><circle cx="1" cy="1" r=".6" fill="${paper ? 'rgba(120,90,50,.10)' : 'rgba(255,255,255,.03)'}"/></pattern>
    <radialGradient id="vmVig" cx="50%" cy="50%" r="70%"><stop offset="60%" stop-color="rgba(0,0,0,0)"/><stop offset="100%" stop-color="${paper ? 'rgba(110,80,40,.35)' : 'rgba(0,0,0,.55)'}"/></radialGradient></defs>`;
  g += `<rect width="${W}" height="${H}" fill="${C.bg}"/><rect width="${W}" height="${H}" fill="url(#vmGrain)"/>`;
  /* fields round the Haven and down the valley */
  for (const [x, y, w, h, r] of [[150, 290, 70, 50, -8], [196, 380, 44, 30, 10], [90, 320, 40, 26, 4], [236, 300, 34, 22, -12]]) g += `<rect x="${x - w / 2}" y="${y - h / 2}" width="${w}" height="${h}" rx="3" fill="${C.field}" transform="rotate(${r} ${x} ${y})"/>`;
  /* hills, top left: contour rings */
  for (const [x, y, rx, ry] of [[80, 46, 64, 40], [150, 60, 46, 26], [40, 90, 34, 22]]) for (let i = 0; i < 4; i++) g += `<ellipse cx="${x}" cy="${y}" rx="${rx - i * 13}" ry="${ry - i * 8}" fill="none" stroke="${C.hill}" stroke-width="1.3"/>`;
  /* woods */
  for (const [x, y, r] of woods) for (let i = 0; i < 9; i++) { const a = i * 2.4, d = (i % 3) * r / 3.2; g += `<circle cx="${x + Math.cos(a) * d}" cy="${y + Math.sin(a) * d * .7}" r="${r / 4.2}" fill="${i % 2 ? C.wood : C.wood2}" opacity="${paper ? .75 : .9}"/>`; }
  /* orchards by the Fair: rows of dots */
  for (let r = 0; r < 4; r++) for (let c = 0; c < 6; c++) g += `<circle cx="${74 + c * 9}" cy="${92 + r * 8}" r="2.4" fill="${C.wood}" opacity=".8"/>`;
  /* the river and the weir */
  g += `<path d="${curve(river)}" fill="none" stroke="${C.river}" stroke-width="9" stroke-linecap="round"/><path d="${curve(river)}" fill="none" stroke="${C.riverHi}" stroke-width="2" stroke-linecap="round" opacity=".6"/>`;
  g += `<path d="M24 478 L56 476" stroke="${C.ink}" stroke-width="3"/><path d="M24 482 L56 480" stroke="${C.ink}" stroke-width="1" stroke-dasharray="2 2"/>`;
  /* roads */
  for (const r of roads) { const d = sm(r.pts); g += `<path d="${d}" fill="none" stroke="${C.roadEdge}" stroke-width="${r.w + 2.2}" stroke-linecap="round" stroke-linejoin="round" ${r.dash ? 'stroke-dasharray="1 5"' : ''} opacity="${r.dash ? .6 : 1}"/>`; if (!r.dash) g += `<path d="${d}" fill="none" stroke="${C.road}" stroke-width="${r.w}" stroke-linecap="round" stroke-linejoin="round"/>`; if (r.hw) g += `<path d="${d}" fill="none" stroke="${paper ? '#f3e7c8' : '#2a3a44'}" stroke-width="1" stroke-dasharray="5 5"/>`; }
  /* the cordon along the east edge */
  g += `<path d="M344 0 L344 500" stroke="${C.cordon}" stroke-width="2.4" stroke-dasharray="8 5"/>`;
  for (let y = 20; y < 500; y += 40) g += `<path d="M340 ${y - 4} l8 8 M348 ${y - 4} l-8 8" stroke="${C.cordon}" stroke-width="1.6"/>`;
  g += `<text x="352" y="250" transform="rotate(90 352 250)" font-size="7.5" letter-spacing="2" fill="${C.cordon}" font-family="Nunito" font-weight="800" text-anchor="middle">THE CORDON</text>`;
  g += `<text x="300" y="${paper ? 214 : 214}" transform="rotate(-62 300 214)" font-size="7" letter-spacing="1.5" fill="${C.ink}" opacity=".75" font-family="Nunito" font-weight="800">ROUTE 9</text>`;
  g += `<text x="20" y="300" transform="rotate(-84 20 300)" font-size="7" letter-spacing="2" fill="${C.river}" font-family="Nunito" font-weight="800">THE RIVER</text>`;
  /* the Haven's walls */
  g += `<rect x="163" y="301" width="34" height="34" rx="4" fill="${paper ? 'rgba(122,94,58,.15)' : 'rgba(255,255,255,.06)'}" stroke="${C.ink}" stroke-width="1.4" stroke-dasharray="3 2"/>`;
  /* paper: fold lines; early: the unmapped part is blank */
  if (paper) g += `<path d="M120 0 V500 M240 0 V500 M0 250 H360" stroke="rgba(255,255,255,.35)" stroke-width="1.2"/><path d="M121 0 V500 M241 0 V500 M0 251 H360" stroke="rgba(110,80,40,.12)" stroke-width="1"/>`;
  if (scene === 'early') {
    g += `<defs><radialGradient id="vmFog" cx="${(180 + 20) / W * 100}%" cy="${(318 - 20) / H * 100}%" r="46%"><stop offset="55%" stop-color="${C.fog}" stop-opacity="0"/><stop offset="85%" stop-color="${C.fog}" stop-opacity=".93"/><stop offset="100%" stop-color="${C.fog}" stop-opacity="1"/></radialGradient></defs><rect width="${W}" height="${H}" fill="url(#vmFog)"/>`;
    g += `<text x="58" y="70" font-size="11" fill="${C.faint}" font-family="Comic Neue" font-weight="700" transform="rotate(-6 58 70)">not scouted yet</text><text x="250" y="70" font-size="11" fill="${C.faint}" font-family="Comic Neue" font-weight="700" transform="rotate(5 250 70)">not scouted yet</text>`;
  }
  g += `<rect width="${W}" height="${H}" fill="url(#vmVig)"/>`;
  /* the herd on the highway, the squad on the ring road */
  if (scene !== 'early') {
    g += `<path d="M250 236 Q244 248 236 258" fill="none" stroke="#ff7a59" stroke-width="2.2" stroke-dasharray="4 3" marker-end="url(#vmArr)"/>`;
    g += `<defs><marker id="vmArr" viewBox="0 0 10 10" refX="6" refY="5" markerWidth="5" markerHeight="5" orient="auto"><path d="M0 0 L10 5 L0 10 z" fill="#ff7a59"/></marker></defs>`;
  }
  g += `</svg>`;

  /* ---------- pins (HTML over the SVG, so they use the game's sticker icons) ---------- */
  const pct = (p) => `left:${(p.x / W * 100).toFixed(2)}%;top:${(p.y / H * 100).toFixed(2)}%`;
  const BADGE = { sealed: 'skull', outpost: 'shield', friend: 'heart', locked: 'lock', off: 'clock', rumour: 'question', open: 'star', call: 'alarm', lead: 'search' };
  let pins = '';
  for (const [id, p] of Object.entries(P)) {
    const s = S[id]; if (!s) continue;
    const big = p.k !== 'search' && s.st !== 'faint', sz = id === 'haven' ? 40 : big ? 32 : 26, dim = ['off', 'locked', 'rumour', 'faint'].includes(s.st), sel = card === id;
    const icon = s.st === 'rumour' ? 'question' : p.ic, badge = BADGE[s.st];
    pins += `<div class="vmPin${dim ? ' dim' : ''}${s.st === 'call' ? ' call' : ''}${sel ? ' sel' : ''}${id === 'haven' ? ' home' : ''}" style="${pct(p)};--r:${RING[s.st] || '#fff'};--s:${sz}px">
      <span class="vmDot">${ic(icon, Math.round(sz * .72))}${badge ? `<em class="vmBadge">${ic(badge, 14)}</em>` : ''}</span>
      ${s.st === 'faint' ? '' : `<span class="vmName">${p.n}</span>`}${s.tag ? `<span class="vmTag t_${s.st}">${s.tag}</span>` : ''}</div>`;
  }
  if (scene !== 'early') {
    pins += `<div class="vmHerd" style="left:${246 / W * 100}%;top:${228 / H * 100}%">${ic('zombie', 20)}${ic('zombie', 17)}${ic('zombie', 20)}<span class="vmTag t_rival">Herd · 2 days</span></div>`;
    pins += `<div class="vmSquad" style="left:${150 / W * 100}%;top:${272 / H * 100}%"><span class="vmDot sq">${ic('boot', 16)}</span><span class="vmTag t_squad">3:12</span></div>`;
  }
  /* ---------- the panel ---------- */
  const ip = document.getElementById('infoPanel');
  document.getElementById('it').textContent = 'The valley';
  ip.style.top = '150px'; ip.style.maxHeight = 'none'; ip.style.bottom = '0px'; ip.style.left = '0px'; ip.style.right = '0px';
  const chips = scene === 'early'
    ? [['search', '2 leads'], ['boot', 'No squad out']]
    : [['search', '2 leads'], ['alarm', '1 call'], ['zombie', '1 herd'], ['boot', '1 squad out']];
  let cardHtml = '';
  if (card === 'prison') cardHtml = `<div class="vmCard"><div class="vmCH"><span class="vmDot" style="--r:#c0392b;--s:40px">${ic('fort', 28)}</span><div><b>Blackgate Prison</b><div class="sm">Sealed · the dead are still inside</div></div></div>
      <div class="vmRow"><span>Inside</span><span class="vmBar"><i style="width:59%"></i></span><b>41 of 70 put down</b></div>
      <div class="vmLine">${ic('lock', 18)}<span><b>Control Room shut.</b> Quarantine Command's keys open it (be on good terms with them), or bring proof 1 from Checkpoint Bravo.</span></div>
      <div class="vmLine">${ic('truck', 18)}<span><b>Brings home</b> the prison van. Once secured: a safe stop on the south road.</span></div>
      <div class="vmLine">${ic('warn', 18)}<span><b>High risk.</b> Suggested squad power 120 (your best four: 96).</span></div>
      <div class="vmBtns"><button class="act">Close</button><button class="act go">Plan a trip ›</button></div></div>`;
  if (card === 'toll') cardHtml = `<div class="vmCard"><div class="vmCH"><span class="vmDot" style="--r:#f0a24a;--s:40px">${ic('crown', 28)}</span><div><b>The Toll Kings' fort</b><div class="sm">Faction town · Wary of you (35) · Route 9</div></div></div>
      <div class="vmLine">${ic('shop', 18)}<span><b>Trade</b> at the gate: tins, salt, bike parts.</span></div>
      <div class="vmLine">${ic('fight', 18)}<span><b>Raid</b> the fort (they will remember). The Larder inside opens later in the story.</span></div>
      <div class="vmLine">${ic('zombie', 18)}<span><b>A herd</b> is coming down Route 9 past their gate: 2 days.</span></div>
      <div class="vmBtns"><button class="act">Trade</button><button class="act go">Plan a raid ›</button></div></div>`;
  document.getElementById('ib').innerHTML = `<div class="vmWrap">
    <div class="vmTop"><span class="sm">${scene === 'early' ? 'Day 2 · Spring' : 'Day 38 · Autumn'}</span><button class="vmKey">${ic('question', 18)} Key</button></div>
    <div class="vmMap vm_${look}">${g}<div class="vmPins">${pins}</div>${cardHtml}</div>
    <div class="vmChips">${chips.map(([i, t]) => `<button class="vmChip">${ic(i, 18)}${t}</button>`).join('')}</div></div>`;
  let st = document.getElementById('vmStyle'); if (!st) { st = document.createElement('style'); st.id = 'vmStyle'; document.head.appendChild(st); }
  st.textContent = `
  #infoPanel #ib { overflow: hidden !important; padding: 0 12px 10px !important; }
  .vmWrap { display: flex; flex-direction: column; height: calc(844px - 150px - 74px); }
  .vmTop { display: flex; align-items: center; justify-content: space-between; margin: 0 2px 6px; }
  .vmKey { display: flex; align-items: center; gap: 6px; min-height: 36px; padding: 0 12px; border-radius: 18px; border: 1px solid rgba(255,255,255,.16); background: rgba(255,255,255,.06); color: #fff; font: inherit; font-weight: 700; font-size: 13px; }
  .vmMap { position: relative; flex: 1; border-radius: 18px; overflow: hidden; box-shadow: inset 0 0 0 1px rgba(255,255,255,.14), 0 6px 18px rgba(0,0,0,.35); }
  .vmMap.vm_paper { box-shadow: inset 0 0 0 1px rgba(90,60,30,.35), 0 6px 18px rgba(0,0,0,.35); }
  .vmMap > svg { position: absolute; inset: 0; }
  .vmPins { position: absolute; inset: 0; }
  .vmPin, .vmHerd, .vmSquad { position: absolute; transform: translate(-50%, -50%); display: flex; flex-direction: column; align-items: center; pointer-events: none; }
  .vmDot { position: relative; display: grid; place-items: center; width: var(--s); height: var(--s); border-radius: 50%; background: rgba(16,22,28,.86); box-shadow: 0 0 0 2.5px var(--r), 0 3px 8px rgba(0,0,0,.45); }
  .vm_paper .vmDot { background: #2a2620; }
  .vmPin.home .vmDot { box-shadow: 0 0 0 3px #fff, 0 0 0 7px rgba(255,255,255,.25), 0 3px 10px rgba(0,0,0,.5); }
  .vmPin.dim .vmDot { filter: grayscale(1) brightness(.75); opacity: .8; }
  .vmPin.dim .vmName { opacity: .7; }
  .vmPin.sel .vmDot { box-shadow: 0 0 0 3px #fff, 0 0 0 8px rgba(255,255,255,.3), 0 3px 10px rgba(0,0,0,.5); }
  .vmPin.call .vmDot::before { content: ''; position: absolute; inset: -9px; border-radius: 50%; border: 2.5px solid #ff7a59; opacity: .8; }
  .vmPin.call .vmDot::after { content: ''; position: absolute; inset: -16px; border-radius: 50%; border: 2px solid #ff7a59; opacity: .35; }
  .vmBadge { position: absolute; right: -6px; top: -6px; display: grid; place-items: center; width: 18px; height: 18px; border-radius: 50%; background: #10161c; box-shadow: 0 0 0 1.5px rgba(255,255,255,.7); }
  .vmName { margin-top: 3px; font: 800 9.5px/1.05 Nunito, sans-serif; color: ${C.label}; white-space: nowrap; text-shadow: 0 0 3px ${C.halo}, 0 0 3px ${C.halo}, 0 0 2px ${C.halo}; letter-spacing: .01em; }
  .vmTag { margin-top: 2px; padding: 1px 6px; border-radius: 8px; font: 800 9px/1.35 Nunito, sans-serif; white-space: nowrap; background: rgba(16,22,28,.85); color: #fff; }
  .vmTag.t_lead { background: #f2c94c; color: #2a2210; } .vmTag.t_call, .vmTag.t_rival { background: #ff7a59; color: #2a120c; } .vmTag.t_sealed { background: #c0392b; }
  .vmTag.t_outpost { background: #4fd1c5; color: #0d2624; } .vmTag.t_friend { background: #6fb7ff; color: #0d1d2c; } .vmTag.t_open { background: #f2a93b; color: #2a1c08; }
  .vmTag.t_wary { background: #f0a24a; color: #2a1c08; } .vmTag.t_neutral { background: #e8d27a; color: #2a2610; } .vmTag.t_home { background: #fff; color: #10161c; }
  .vmTag.t_squad { background: #fff; color: #10161c; }
  .vmHerd { flex-direction: row; gap: 0; flex-wrap: wrap; width: 72px; justify-content: center; }
  .vmHerd svg { filter: drop-shadow(0 1px 2px rgba(0,0,0,.6)); }
  .vmHerd .vmTag { flex-basis: 100%; text-align: center; }
  .vmSquad { flex-direction: row; gap: 4px; } .vmSquad .vmTag { margin: 0; } .vmSquad .vmDot.sq { --s: 24px; --r: #fff; }
  .vmChips { display: flex; gap: 6px; margin-top: 8px; overflow: hidden; }
  .vmChip { flex: 1 1 auto; display: flex; align-items: center; justify-content: center; gap: 5px; min-height: 44px; padding: 0 8px; border-radius: 14px; border: 1px solid rgba(255,255,255,.14); background: rgba(255,255,255,.06); color: #fff; font: inherit; font-size: 12.5px; font-weight: 700; white-space: nowrap; }
  .vmCard { position: absolute; left: 8px; right: 8px; bottom: 8px; padding: 12px 12px 10px; border-radius: 18px; background: rgba(16,22,28,.92); -webkit-backdrop-filter: blur(10px); backdrop-filter: blur(10px); border: 1px solid rgba(255,255,255,.14); box-shadow: 0 10px 30px rgba(0,0,0,.5); color: #fff; }
  .vmCH { display: flex; gap: 12px; align-items: center; margin-bottom: 8px; } .vmCH b { font-size: 17px; }
  .vmCard .sm { color: #c9d1d9; font-size: 12.5px; }
  .vmRow { display: flex; align-items: center; gap: 8px; font-size: 12.5px; margin: 4px 0 8px; color: #c9d1d9; } .vmRow b { color: #fff; font-size: 12.5px; white-space: nowrap; }
  .vmBar { flex: 1; height: 6px; border-radius: 4px; background: rgba(255,255,255,.14); } .vmBar i { display: block; height: 6px; border-radius: 4px; background: #e9e4d8; }
  .vmLine { display: flex; gap: 8px; align-items: flex-start; font-size: 13px; line-height: 1.35; margin: 6px 0; color: #e9e4d8; } .vmLine svg { flex: none; margin-top: 1px; } .vmLine b { color: #fff; }
  .vmBtns { display: flex; gap: 8px; margin-top: 10px; } .vmBtns .act { flex: 1; min-height: 44px; margin: 0; }
  `;
};

(async () => {
  const fs = require('fs'); const out = require('path').join(__dirname, '../../runs/ui_samples'); fs.mkdirSync(out, { recursive: true });
  const b = await Q.launch(); const p = await Q.page(b, { w: 390, h: 844 }); await Q.newGame(p); await Q.clearCards(p); await p.waitForTimeout(1500); await Q.clearCards(p); await p.waitForTimeout(400); await Q.clearCards(p);
  await p.click('#mExp'); await p.waitForTimeout(500); await Q.clearCards(p);
  for (const [name, look, scene, card] of [['A_paper_mid', 'paper', 'mid', ''], ['B_dark_mid', 'dark', 'mid', ''], ['A_paper_prison_card', 'paper', 'mid', 'prison'], ['A_paper_toll_card', 'paper', 'mid', 'toll'], ['A_paper_early', 'paper', 'early', ''], ['B_dark_early', 'dark', 'early', '']]) {
    await p.evaluate(MOCK, { look, scene, card }); await p.waitForTimeout(400);
    const f = `${out}/valley_map_${name}.png`; await p.screenshot({ path: f }); console.log('shot', f);
  }
  await b.close();
})();
