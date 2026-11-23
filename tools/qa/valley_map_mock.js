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
    toll:    { x: 268, y: 170, n: 'Toll Kings', ic: 'crown', k: 'fac' },
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
  const MID = {   /* level 10, day 38, autumn. fav: how a faction feels, -1 (hostile) to 1 (friendly), 0 neutral */
    haven: { st: 'home' },
    green: { st: 'friend', fav: .7 }, gh: { st: 'off', tag: 'Spring' },
    clinic: { st: 'outpost', tag: 'Outpost' }, prison: { st: 'sealed' },
    toll: { st: 'wary', fav: -.35 }, foundry: { st: 'rival', fav: -.65 }, refin: { st: 'off', tag: 'Summer' },
    bravo: { st: 'neutral', fav: 0 }, depot: { st: 'off', tag: 'Winter' }, helix: { st: 'neutral', fav: .15 },
    hollow: { st: 'locked', tag: 'Level 11' }, fair: { st: 'open', tag: 'Open now' }, mast: { st: 'locked', tag: 'Level 19' },
    sunny: { st: 'locked', tag: 'Level 16' }, weir: { st: 'faint' },
    lumber: { st: 'lead', tag: 'Lead' }, gas: { st: 'search' }, ware: { st: 'lead', tag: 'Lead' },
    quarry: { st: 'search' }, army: { st: 'search' }, houses: { st: 'call', tag: 'Help!' },
  };
  const EARLY = {   /* level 3, day 2 */
    haven: { st: 'home' }, green: { st: 'neutral', tag: 'Heard of' }, clinic: { st: 'sealed' },
    lumber: { st: 'lead', tag: 'Lead' }, gas: { st: 'lead', tag: 'Lead' }, houses: { st: 'search' },
    toll: { st: 'rumour', tag: 'Rumour' }, ware: { st: 'locked', tag: 'Level 4' },
  };
  const S = scene === 'early' ? EARLY : MID;
  const paper = look === 'paper', gm = look === 'gmap';
  const C = gm ? { bg: '#f1efe9', ink: '#70757a', faint: 'rgba(95,99,104,.55)', river: '#9fd0f5', riverHi: '#c4e3fa', road: '#ffffff', roadEdge: '#d4d0c8', hill: 'rgba(0,0,0,.05)', wood: '#b9dca8', wood2: '#a6d095', field: 'rgba(0,0,0,0)', label: '#3c4043', halo: '#ffffff', cordon: '#d93025', fog: '#e8e6e1' } : paper
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
    { pts: [[180, 318], [204, 290], [226, 262], [244, 222], [268, 170], [290, 110], [314, 42]], w: 7, hw: true },   /* the north-east highway */
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

  /* ---------- look C (owner, 23 Nov: "A is good", "put some background on the map... similar to Google map"): a street-map background ---------- */
  const GMAP = () => {
    let r = 1; const rnd = () => (r = (r * 16807) % 2147483647) / 2147483647;
    const blob = (cx, cy, rx, ry, n = 9, j = .22) => { let d = ''; for (let i = 0; i <= n; i++) { const a = i / n * Math.PI * 2, k = 1 + (rnd() - .5) * j * 2; d += (i ? 'L' : 'M') + (cx + Math.cos(a) * rx * k).toFixed(1) + ' ' + (cy + Math.sin(a) * ry * k).toFixed(1); } return d + 'Z'; };
    let o = `<svg viewBox="0 0 ${W} ${H}" width="100%" height="100%" preserveAspectRatio="xMidYMid slice" style="display:block">
      <defs><filter id="gmBlur" x="-30%" y="-30%" width="160%" height="160%"><feGaussianBlur stdDeviation="9"/></filter>
      <pattern id="gmHatch" width="7" height="7" patternUnits="userSpaceOnUse" patternTransform="rotate(45)"><rect width="7" height="7" fill="#f7e3df"/><path d="M0 0 V7" stroke="#efc9c2" stroke-width="2.4"/></pattern></defs>
      <rect width="${W}" height="${H}" fill="#f1efe9"/>`;
    /* terrain: soft hill shading top left and along the east, like the terrain layer */
    for (const [x, y, rx, ry, a] of [[86, 44, 80, 46, .16], [150, 64, 50, 28, .12], [42, 100, 40, 26, .12], [300, 150, 40, 70, .07], [250, 120, 30, 22, .06]]) o += `<ellipse cx="${x + 8}" cy="${y + 10}" rx="${rx}" ry="${ry}" fill="rgba(60,70,40,${a})" filter="url(#gmBlur)"/><ellipse cx="${x - 6}" cy="${y - 8}" rx="${rx * .7}" ry="${ry * .6}" fill="rgba(255,255,255,${a * 1.6})" filter="url(#gmBlur)"/>`;
    /* parks and forests */
    o += `<path d="${blob(96, 52, 86, 44, 12, .12)}" fill="#cfe5c0"/>`;   /* Pine Hills forest */
    for (const [x, y, rx, ry] of [[146, 216, 30, 22], [216, 206, 22, 16], [100, 376, 22, 15], [232, 146, 20, 13], [292, 380, 18, 12], [160, 140, 16, 11], [120, 470, 26, 14], [300, 90, 18, 26]]) o += `<path d="${blob(x, y, rx, ry)}" fill="#bfe0ad"/>`;
    o += `<path d="${blob(80, 106, 32, 20, 8, .1)}" fill="#e3eecb"/>`;   /* orchards */
    for (let rr = 0; rr < 4; rr++) for (let c = 0; c < 6; c++) o += `<circle cx="${60 + c * 6}" cy="${96 + rr * 6}" r="1.6" fill="#a6cf8f"/>`;
    /* the restricted zone past the cordon */
    o += `<rect x="344" y="0" width="16" height="${H}" fill="url(#gmHatch)"/>`;
    /* water: the river, a pond at Greenwater, the reservoir at the weir */
    o += `<path d="${curve(river)}" fill="none" stroke="#9fd0f5" stroke-width="11" stroke-linecap="round"/>`;
    o += `<ellipse cx="34" cy="490" rx="26" ry="12" fill="#9fd0f5"/><ellipse cx="84" cy="240" rx="9" ry="6" fill="#9fd0f5"/>`;
    /* built-up areas with streets and building outlines */
    const towns = [[180, 318, 52, 44, 'home'], [60, 250, 30, 24], [74, 428, 34, 22, 'ind'], [268, 170, 28, 22], [318, 276, 24, 30, 'ind'], [186, 104, 30, 18, 'ind'], [116, 166, 30, 22], [314, 42, 58, 34], [226, 262, 14, 10], [280, 330, 34, 22, 'ind'], [128, 372, 30, 20], [236, 362, 22, 16], [184, 452, 30, 22, 'ind'], [250, 408, 18, 12]];
    for (const [x, y, w, h, kind] of towns) {
      o += `<path d="${blob(x, y, w / 2 + 6, h / 2 + 6, 8, .12)}" fill="${kind === 'ind' ? '#e6e3ee' : '#ebe7e0'}"/>`;
      const n = Math.round(w * h / (kind === 'ind' ? 110 : 60));
      for (let i = 0; i < n; i++) { const bx = x + (rnd() - .5) * w, by = y + (rnd() - .5) * h, bw = kind === 'ind' ? 6 + rnd() * 8 : 3 + rnd() * 4, bh = kind === 'ind' ? 4 + rnd() * 6 : 3 + rnd() * 3; o += `<rect x="${(bx - bw / 2).toFixed(1)}" y="${(by - bh / 2).toFixed(1)}" width="${bw.toFixed(1)}" height="${bh.toFixed(1)}" fill="${kind === 'ind' ? '#dcd8e6' : '#e0dbd2'}" stroke="#d2ccc1" stroke-width=".4"/>`; }
      for (let i = -1; i <= 1; i++) o += `<path d="M${x - w / 2} ${y + i * h / 3} H${x + w / 2} M${x + i * w / 3} ${y - h / 2} V${y + h / 2}" stroke="#fff" stroke-width="1.6"/>`;
    }
    /* roads: grey casing, white fill; Route 9 yellow with an orange casing */
    for (const rd of roads) { const d = sm(rd.pts); if (rd.dash) { o += `<path d="${d}" fill="none" stroke="#a7a29a" stroke-width="1.4" stroke-dasharray="2 3"/>`; continue; }
      o += `<path d="${d}" fill="none" stroke="${rd.hw ? '#f0b44c' : '#d4d0c8'}" stroke-width="${rd.w + 2}" stroke-linecap="round" stroke-linejoin="round"/><path d="${d}" fill="none" stroke="${rd.hw ? '#fde293' : '#ffffff'}" stroke-width="${rd.w}" stroke-linecap="round" stroke-linejoin="round"/>`; }
    o += `<g transform="translate(296 216)"><rect x="-7" y="-6" width="14" height="12" rx="3" fill="#fff" stroke="#9aa0a6" stroke-width="1"/><text y="3.5" font-size="8.5" font-weight="800" text-anchor="middle" fill="#3c4043" font-family="Nunito">9</text></g>`;
    o += `<path d="M344 0 V${H}" stroke="#d93025" stroke-width="1.6" stroke-dasharray="6 4"/>`;
    /* area names, grey and quiet, as on a street map */
    const lab = (x, y, t, c = '#80868b', rot = 0, sz = 8) => `<text x="${x}" y="${y}" transform="rotate(${rot} ${x} ${y})" font-size="${sz}" letter-spacing="1.6" fill="${c}" font-family="Nunito" font-weight="800" text-anchor="middle" style="paint-order:stroke" stroke="#f1efe9" stroke-width="2.5">${t}</text>`;
    if (scene !== 'early') o += lab(146, 22, 'PINE HILLS') + lab(22, 340, 'MILL RIVER', '#5d9bd0', -86) + lab(352, 330, 'CORDON ZONE', '#c5221f', 90, 7) + lab(84, 82, 'ORCHARDS', '#7a9a5e', 0, 6.5) + lab(130, 494, 'SOUTH VALLEY') + lab(250, 132, 'NORTH WOODS', '#7a9a5e', 0, 6.5);
    /* compass */
    o += `<g transform="translate(18 18)"><circle r="10" fill="#fff" stroke="#dadce0"/><path d="M0 -7 L3 1 L0 -1 L-3 1 Z" fill="#d93025"/><text y="8" font-size="6" text-anchor="middle" fill="#5f6368" font-family="Nunito" font-weight="800">N</text></g>`;
    if (scene === 'early') {
      o += `<defs><radialGradient id="gmFog" cx="${(180 + 20) / W * 100}%" cy="${(318 - 20) / H * 100}%" r="46%"><stop offset="55%" stop-color="#e8e6e1" stop-opacity="0"/><stop offset="82%" stop-color="#e8e6e1" stop-opacity=".95"/><stop offset="100%" stop-color="#e8e6e1" stop-opacity="1"/></radialGradient>
        <pattern id="gmFogDots" width="8" height="8" patternUnits="userSpaceOnUse"><circle cx="2" cy="2" r=".8" fill="rgba(0,0,0,.07)"/></pattern><mask id="gmFogMask"><rect width="${W}" height="${H}" fill="url(#gmFog)"/></mask></defs>
        <rect width="${W}" height="${H}" fill="url(#gmFog)"/><rect width="${W}" height="${H}" fill="url(#gmFogDots)" mask="url(#gmFogMask)"/>`;
      o += lab(90, 70, 'NOT SCOUTED YET', '#9aa0a6', -4, 8) + lab(270, 72, 'NOT SCOUTED YET', '#9aa0a6', 4, 8) + lab(290, 470, 'NOT SCOUTED YET', '#9aa0a6', 0, 8);
    }
    return o;
  };
  if (gm) g = GMAP(); else g += `<rect width="${W}" height="${H}" fill="url(#vmVig)"/>`;
  /* the herd on the highway, the squad on the ring road */
  if (scene !== 'early') {
    g += `<path d="M250 236 Q244 248 236 258" fill="none" stroke="#ff7a59" stroke-width="2.2" stroke-dasharray="4 3" marker-end="url(#vmArr)"/>`;
    g += `<defs><marker id="vmArr" viewBox="0 0 10 10" refX="6" refY="5" markerWidth="5" markerHeight="5" orient="auto"><path d="M0 0 L10 5 L0 10 z" fill="#ff7a59"/></marker></defs>`;
  }
  g += `</svg>`;

  /* ---------- pins (HTML over the SVG, so they use the game's sticker icons) ---------- */
  const pct = (p) => `left:${(p.x / W * 100).toFixed(2)}%;top:${(p.y / H * 100).toFixed(2)}%`;
  const BADGE = { sealed: 'skull', outpost: 'shield', friend: 'heart', locked: 'lock', off: 'clock', rumour: 'question', open: 'star', call: 'alarm', lead: 'search' };
  const favBar = (v, cls) => `<span class="${cls}"><i style="${v >= 0 ? 'left:50%;background:#4a90e2' : 'right:50%;background:#ff7a59'};width:${Math.abs(v) * 50}%"></i></span>`;   /* centre = neutral; grows right when they like you, left when they don't */
  let pins = '';
  for (const [id, p] of Object.entries(P)) {
    const s = S[id]; if (!s) continue;
    const big = p.k !== 'search' && s.st !== 'faint', sz = id === 'haven' ? 40 : big ? 32 : 26, dim = ['off', 'locked', 'rumour', 'faint'].includes(s.st), sel = card === id;
    const icon = s.st === 'rumour' ? 'question' : p.ic, badge = BADGE[s.st];
    pins += `<div class="vmPin${dim ? ' dim' : ''}${s.st === 'call' ? ' call' : ''}${sel ? ' sel' : ''}${id === 'haven' ? ' home' : ''}" style="${pct(p)};--r:${RING[s.st] || '#fff'};--s:${sz}px">
      <span class="vmDot">${ic(icon, Math.round(sz * .72))}${badge ? `<em class="vmBadge">${ic(badge, 14)}</em>` : ''}</span>
      ${s.st === 'faint' ? '' : `<span class="vmName">${p.n}</span>`}${s.tag ? `<span class="vmTag t_${s.st}">${s.tag}</span>` : ''}${s.fav !== undefined ? favBar(s.fav, 'vmFav') : ''}</div>`;
  }
  if (scene !== 'early') {
    pins += `<div class="vmHerd" style="left:${246 / W * 100}%;top:${228 / H * 100}%">${ic('zombie', 20)}${ic('zombie', 17)}${ic('zombie', 20)}<span class="vmTag t_rival">Herd · 2 days</span></div>`;
    pins += `<div class="vmSquad" style="left:${150 / W * 100}%;top:${272 / H * 100}%"><span class="vmDot sq">${ic('boot', 16)}</span></div>`;
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
      <div class="vmLine">${ic('door', 18)}<span><b>Partly cleared.</b> Rooms you cleared stay clear.</span></div>
      <div class="vmLine">${ic('lock', 18)}<span><b>Control Room shut.</b> Quarantine Command's keys open it (get on good terms with them), or bring the army's contract from Checkpoint Bravo.</span></div>
      <div class="vmLine">${ic('truck', 18)}<span><b>Brings home</b> the prison van. Once secured: a safe stop on the south road.</span></div>
      <div class="vmLine">${ic('warn', 18)}<span><b>Dangerous.</b> Bring your best fighters, and a bomb for the Warden's gate.</span></div>
      <div class="vmBtns"><button class="act">Close</button><button class="act go">Plan a trip ›</button></div></div>`;
  if (card === 'toll') cardHtml = `<div class="vmCard"><div class="vmCH"><span class="vmDot" style="--r:#f0a24a;--s:40px">${ic('crown', 28)}</span><div><b>The Toll Kings' fort</b><div class="sm">Faction town on Route 9</div></div></div>
      <div class="vmFavRow"><div class="vmFavEnds"><span>Hostile</span><b>Wary of you</b><span>Friendly</span></div>${favBar(-.35, 'vmFavBig')}<div class="sm vmFavHint">Trading and helping them moves it right. Raids move it left.</div></div>
      <div class="vmLine">${ic('shop', 18)}<span><b>Trade</b> at the gate: tins, salt, bike parts.</span></div>
      <div class="vmLine">${ic('fight', 18)}<span><b>Raid</b> the fort. The Larder inside opens later in the story.</span></div>
      <div class="vmLine">${ic('zombie', 18)}<span><b>A herd</b> is coming down Route 9 past their gate in 2 days.</span></div>
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
  .vmFav { position: relative; display: block; width: 36px; height: 5px; margin-top: 3px; border-radius: 3px; background: rgba(60,64,67,.25); box-shadow: 0 0 0 1.5px #fff; }
  .vmFav i, .vmFavBig i { position: absolute; top: 0; bottom: 0; border-radius: 3px; }
  .vmFav::after, .vmFavBig::after { content: ''; position: absolute; left: 50%; top: -2px; bottom: -2px; width: 2px; margin-left: -1px; background: #3c4043; border-radius: 1px; }
  .vmFavRow { margin: 2px 0 8px; } .vmFavEnds { display: flex; justify-content: space-between; align-items: baseline; font-size: 11.5px; color: #9aa4ad; margin-bottom: 4px; } .vmFavEnds b { color: #fff; font-size: 13px; }
  .vmFavBig { position: relative; display: block; height: 8px; border-radius: 5px; background: rgba(255,255,255,.14); } .vmFavBig::after { background: #fff; top: -3px; bottom: -3px; }
  .vmFavHint { margin-top: 5px; font-size: 11.5px !important; }
  .vm_gmap { box-shadow: inset 0 0 0 1px rgba(0,0,0,.12), 0 6px 18px rgba(0,0,0,.35); }
  .vmBtns { display: flex; gap: 8px; margin-top: 10px; } .vmBtns .act { flex: 1; min-height: 44px; margin: 0; }
  `;
};

(async () => {
  const fs = require('fs'); const out = require('path').join(__dirname, '../../runs/ui_samples'); fs.mkdirSync(out, { recursive: true });
  const b = await Q.launch(); const p = await Q.page(b, { w: 390, h: 844 }); await Q.newGame(p); await Q.clearCards(p); await p.waitForTimeout(1500); await Q.clearCards(p); await p.waitForTimeout(400); await Q.clearCards(p);
  await p.click('#mExp'); await p.waitForTimeout(500); await Q.clearCards(p);
  for (const [name, look, scene, card] of (process.env.VM_ALL ? [['A_paper_mid', 'paper', 'mid', ''], ['B_dark_mid', 'dark', 'mid', ''], ['A_paper_prison_card', 'paper', 'mid', 'prison'], ['A_paper_toll_card', 'paper', 'mid', 'toll'], ['A_paper_early', 'paper', 'early', '']] : []).concat([['C_street_mid', 'gmap', 'mid', ''], ['C_street_prison_card', 'gmap', 'mid', 'prison'], ['C_street_toll_card', 'gmap', 'mid', 'toll'], ['C_street_early', 'gmap', 'early', '']])) {
    await p.evaluate(MOCK, { look, scene, card }); await p.waitForTimeout(400);
    const f = `${out}/valley_map_${name}.png`; await p.screenshot({ path: f }); console.log('shot', f);
  }
  await b.close();
})();
