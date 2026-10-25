/* Zombie Haven V2.6 — game (single IIFE; built from tools/parts/p1..p3 by tools/build_game.sh). */
(function () {
'use strict';
const Iso = window.ZHIso, Wd = window.ZHWorld;
const SFX = (n) => { if (window.SND) SND.play(n); };   /* V2.21 sound (js/sound.js) */
const VERSION = '2.56.0', PREV_KEY = 'zombieHavenV25', OLD_KEY = 'zombieHavenV2';
/* V2.40 save slots: slot 1 keeps the old key, so existing towns carry over */
const SLOT_KEYS = ['zombieHavenV26', 'zombieHavenV26_s2', 'zombieHavenV26_s3'], QS = new URLSearchParams(location.search);
let SLOT = 1; try { SLOT = Math.min(3, Math.max(1, +localStorage.getItem('zhSlot') || 1)); } catch (e) { /* storage blocked */ }
let titleOn = false; const SAVE_KEY = SLOT_KEYS[SLOT - 1], SKIP_TITLE = ['test', 's', 'play', 'tune'].some((k) => QS.has(k));
/* V2.42 save safety: a day backup per slot (<key>_bak), a copy of a save that would not load (<key>_bad), a session id so a second tab on the same slot is noticed */
const BAK = (k) => k + '_bak', BAD = (k) => k + '_bad', SID = Math.random().toString(36).slice(2, 10);
let saveBlocked = '', saveErr = '', loadedFrom = '';
/* V2.50 HD art preview (V8: 2 art px per V7 px, characters from PixelLab). Off by default until a full set exists; ?hd=1 turns it on (remembered), ?hd=0 off. */
const HD0 = (() => { try { const q = QS.get('hd'); if (q === '1' || q === '0') localStorage.setItem('zhHD', q); return localStorage.getItem('zhHD') === '1'; } catch (e) { return QS.get('hd') === '1'; } })();
/* V2.52 C64 character preview: people redrawn on PixelLab's 64 canvas (about 58 px tall, the town mock-up's size) at the normal
   pixel size, so faces and expressions read. ?c64=1 turns it on (remembered), ?c64=0 off; it replaces the HD preview. */
/* V2.56 T56 preview: the 56-px-tile buildings (assets/buildings/t56, drawn with ChatGPT on colour-block guides, read onto their pixel grid,
   never straightened) with front + back views, animation strips and four clockwise turns. People, zombies and map art stay on the 96 grid
   for now (smaller pixels than the buildings). ?t56=1 turns it on (remembered), ?t56=0 off; it replaces the HD and C64 previews. */
const T56 = (() => { try { const q = QS.get('t56'); if (q === '1' || q === '0') localStorage.setItem('zhT56', q); return localStorage.getItem('zhT56') === '1'; } catch (e) { return QS.get('t56') === '1'; } })();
window.ZH_T56 = T56;
const C64 = !T56 && (() => { try { const q = QS.get('c64'); if (q === '1' || q === '0') localStorage.setItem('zhC64', q); return localStorage.getItem('zhC64') === '1'; } catch (e) { return QS.get('c64') === '1'; } })();
window.ZH_HD = HD0 && !C64 && !T56; window.ZH_C64 = C64; const HD = window.ZH_HD;
const HD_BUILD = { medic: { ax: 96, ay: 170, res: 2 } };
const C64_BUILD = { medic: { ax: 58, ay: 105, dir: 't106' } };   /* V2.54: buildings drawn for the 106 grid (ChatGPT + footprint guides; read onto the game pixel grid, never straightened). ax, ay = south corner */   /* tools/art/sources/medic_tent_hd_src.png via fix_iso.py; ax, ay in HD px */
const BASE_TW = 80, BASE_TH = BASE_TW * Iso.RATIO;          // ONE projection for terrain, roads, buildings, units
const COLS = Wd.COLS, ROWS = Wd.ROWS, DEFS = Wd.DEFS, STAFF_JOBS = Wd.STAFF_JOBS;
/* V2.53: the C64 standard also has a 10% bigger map grid: tiles 106 x 53 art px (V7: 96 x 48), every pixel the same size.
   Buildings and walls are drawn for it (assets/buildings|map/t106, tools/art/templates); older 96-px building art stands smaller on its plot until redrawn. */
const TILE_PX = C64 ? 106 : 96;
const CHAR_H = (C64 ? 58 : 42) / TILE_PX;   /* T56 keeps the current people (drawn on the 96 grid) until they are redrawn for 56 */   /* V2.52: taller people in the C64 preview (labels, bars and tap areas follow) */   // = 30 art px on the 42-px tile grid: characters and map share one pixel size                                         // character content height in tile-widths (chibi, tunable)
const $ = (id) => document.getElementById(id);
const cv = $('game'), ctx = cv.getContext('2d'), worldEl = $('world');
let VW = 390, VH = 600, DPR = 1, tick = 0, simSpeed = 1, debug = false;

window.addEventListener('error', (e) => { const b = $('crash'); b.style.display = 'block'; b.textContent = 'GAME ERROR: ' + e.message + ' @ ' + (e.filename || '').split('/').pop() + ':' + e.lineno; });
window.addEventListener('unhandledrejection', (e) => { const b = $('crash'); b.style.display = 'block'; b.textContent = 'GAME ERROR: ' + (e.reason && e.reason.message || e.reason); });

/* ---------------- assets ---------------- */
const IMG = {}, SPR = {};   // SPR[type] = {img,w,h,ax,ay,grid,tileW}
const CHAR4 = { fw: 32, fh: 36, foot: 34, content: 30, file: 'assets/characters/v4/Base.png', back: 'assets/characters/v4/Base_back.png' };   // back sheet: 0 idle, 1-4 walk (facing up-left)   // v4 chunky pixel art: native 1 art px = 1 image px, 30 px tall body (see docs/ART_STANDARD.md)
const CHAR_FILES = { Civilian: 'civilian', Guard: 'guard', Medic: 'medic', Scavenger: 'scavenger', 'Police Officer': 'police_officer', Engineer: 'engineer', Cook: 'cook', Farmer: 'farmer' };
const ZOMBIE_FILES = ['walker', 'crawler', 'runner', 'bloated', 'spitter', 'brute'];
// v4 pixel zombies (docs/ART_STANDARD.md): front sheet 0 idle, 1-4 walk, 5 attack (faces down-left); back sheet 0 idle, 1-4 walk (faces up-left).
// fw/fh = frame box, foot = feet row, h = body height in art px. Types without v4 art fall back to the old sheets.
const ZOMB4 = {};   // filled from Z4_DEFS when the PNGs load
const B4_DEFS = {   // V2.31: V7 pixel-art buildings (assets/buildings/v7/<type>.png, tools/art/build_buildings.py): ax, ay = south ground corner in art px; 96 art px = 1 tile width
  house: { ax: 48, ay: 85 }, water: { ax: 47, ay: 101 }, well: { ax: 48, ay: 101 }, farm: { ax: 47, ay: 69 }, medic: { ax: 47, ay: 89 }, storage: { ax: 47, ay: 71 }, gym: { ax: 48, ay: 87 }, library: { ax: 47, ay: 91 }, lounge: { ax: 47, ay: 87 },
  workshop: { ax: 95, ay: 109 }, canteen: { ax: 95, ay: 102 }, armory: { ax: 95, ay: 102 }, clinic: { ax: 95, ay: 99 }, scrapyard: { ax: 95, ay: 97 }, range: { ax: 95, ay: 93 }, track: { ax: 95, ay: 94 }, sparring: { ax: 95, ay: 96 },
  hospital: { ax: 95, ay: 140 }, field: { ax: 95, ay: 121 }, barracks: { ax: 95, ay: 124 },
};
/* V2.56: T56 buildings. Per type: ms per frame, views [file, frames, frame w, frame h, ax, ay] — view 0 front, view 1 back (180 degrees).
   ax, ay = the south ground corner inside a frame; 56 art px = 1 tile width. tools/art/showcase/building_test_template.html shows the same set. */
const T56_BUILD = {
  medic: { ms: 140, v: [['medic_anim', 6, 64, 64, 32, 64], ['medic_back_anim', 6, 66, 64, 33, 64]] },
  house: { ms: 130, v: [['house_anim', 12, 77, 81, 34, 81], ['house_back_anim', 12, 77, 83, 34, 83]] },
  water: { ms: 110, v: [['water_anim', 20, 62, 54, 31, 54], ['water_back_anim', 20, 63, 54, 31, 54]] },
  farm: { ms: 150, v: [['farm_anim', 12, 68, 63, 34, 63], ['farm_back_anim', 12, 69, 53, 34, 53]] },
  well: { ms: 150, v: [['well_anim', 21, 64, 57, 32, 57], ['well_back_anim', 21, 66, 57, 33, 57]] },
  storage: { ms: 140, v: [['storage_anim', 8, 70, 54, 35, 54], ['storage_back_anim', 8, 67, 54, 33, 54]] },
  gym: { ms: 160, v: [['gym_anim', 8, 60, 55, 30, 55], ['gym_back_anim', 8, 60, 55, 30, 55]] },
  library: { ms: 150, v: [['library_anim', 8, 59, 61, 29, 61], ['library_back_anim', 8, 60, 61, 30, 61]] },
  lounge: { ms: 220, v: [['lounge_anim', 6, 69, 60, 34, 60], ['lounge_back_anim', 6, 69, 60, 34, 60]] },
  clinic: { ms: 130, v: [['clinic_anim', 12, 98, 99, 30, 99], ['clinic_back_anim', 12, 99, 100, 30, 100]] },
  canteen: { ms: 140, v: [['canteen_anim', 8, 85, 63, 27, 63], ['canteen_back_anim', 8, 87, 64, 30, 64]] },
  armory: { ms: 160, v: [['armory_anim', 8, 91, 78, 30, 78], ['armory_back_anim', 8, 89, 73, 30, 73]] },
  workshop: { ms: 110, v: [['workshop_anim', 10, 89, 75, 29, 75], ['workshop_back', 1, 88, 72, 28, 72]] },
  scrapyard: { ms: 160, v: [['scrapyard_anim', 8, 86, 70, 32, 70], ['scrapyard_back', 1, 86, 70, 32, 70]] },
  range: { ms: 110, v: [['range_anim', 14, 92, 65, 31, 65], ['range_back', 1, 85, 55, 28, 55]] },
  track: { ms: 140, v: [['track_anim', 6, 92, 75, 30, 75], ['track_back_anim', 6, 92, 63, 32, 63]] },
  sparring: { ms: 120, v: [['sparring', 1, 87, 61, 31, 61], ['sparring', 1, 87, 61, 31, 61]] },
  hospital: { ms: 150, v: [['hospital_anim', 12, 114, 105, 57, 105], ['hospital_back_anim', 12, 117, 103, 57, 103]] },
  field: { ms: 150, v: [['field_anim', 12, 124, 82, 61, 82], ['field_back_anim', 12, 119, 73, 55, 73]] },
  barracks: { ms: 150, v: [['barracks_anim', 12, 121, 111, 61, 111], ['barracks_back_anim', 12, 120, 98, 63, 98]] },
};
/* The T56 2x1 art has its LONG side going up-right from the south corner and the entrance on the short front-left wall, so in T56 the
   2x1 footprints are 1 x 2 (x by y). Saves keep the V7 convention: a 2x1 stored at turn r loads as turn 3 - r (same tiles covered). */
const T56_LONG = T56 ? Object.keys(DEFS).filter((k) => DEFS[k].w === 2 && DEFS[k].h === 1) : [];
for (const k of T56_LONG) { DEFS[k].w = 1; DEFS[k].h = 2; }
const r4Conv = (type, r4) => (T56_LONG.includes(type) ? 3 - r4 : r4);   // V7 <-> T56 turn for the same tiles (its own inverse)
const VIEW4 = (r4) => (r4 === 1 || r4 === 2 ? 1 : 0), FLIP4 = (r4) => r4 & 1;   // turn -> drawn view (front/back) and mirrored
const ART_TILE = TILE_PX; let MAPM = null;   /* V2.30 map art (tools/chars/mapart.py) */
const Z4_DEFS = {   // h = body height for the health bar (the brute's raised-arm attack frame is taller than its body)
  walker: { fw: 35, fh: 35, foot: 33, h: 32 }, crawler: { fw: 32, fh: 25, foot: 23, h: 22 }, runner: { fw: 40, fh: 34, foot: 32, h: 31 },
  spitter: { fw: 42, fh: 33, foot: 31, h: 30 }, bloated: { fw: 38, fh: 43, foot: 41, h: 40 }, brute: { fw: 42, fh: 55, foot: 53, h: 42 },
};
function loadImg(key, src) { return new Promise((res) => { const im = new Image(); im.onload = () => res(); im.onerror = () => { console.warn('missing asset', src); res(); }; im.src = src + '?v=' + VERSION; IMG[key] = im; }); }
const okImg = (im) => im && im.complete && im.naturalWidth > 0;
const scaledCache = new Map();
const pixelCache = new Map(); const PIXSTAT = { miss: 0, px: 0 }; let pixelBytes = 0; const PIX_BUDGET = 120e6;   /* bytes of pre-scaled bitmaps kept */
/* V2.49: the pre-scale factor is capped at 4×, so zooming far in no longer builds huge cached bitmaps (Safari limits canvas memory to about 384 MB);
   past the cap the art is drawn with nearest-neighbour scaling, which keeps pixels sharp. */
const PXM_CAP = 4, pxm = (want) => Math.min(PXM_CAP, Math.max(1, Math.ceil(want - .02)));
function pixelUp(key, img, m) {   // whole-number nearest-neighbour enlargement of a pixel-art sheet, cached per factor
  const k = key + '#' + m; let c = pixelCache.get(k); if (c) { pixelCache.delete(k); pixelCache.set(k, c); return c; }
  PIXSTAT.miss++; PIXSTAT.px += img.width * m * img.height * m;
  c = document.createElement('canvas'); c.width = img.width * m; c.height = img.height * m; const g = c.getContext('2d'); g.imageSmoothingEnabled = false; g.drawImage(img, 0, 0, c.width, c.height);
  pixelBytes += c.width * c.height * 4; while (pixelCache.size > 48 || (pixelBytes > PIX_BUDGET && pixelCache.size > 8)) { const k0 = pixelCache.keys().next().value, o = pixelCache.get(k0); pixelBytes -= o.width * o.height * 4; pixelCache.delete(k0); }   /* V2.49: also a memory budget */   /* V2.18: drop the oldest instead of wiping everything (a late-game town needs more than 24 sheets, so it rebuilt them every frame) */
  pixelCache.set(k, c); return c;
}
function scaled(key, img, tw, th) {           // high-quality downscale by repeated halving, cached
  tw = Math.max(1, Math.round(tw)); th = Math.max(1, Math.round(th));
  if (tw >= img.width * 0.75) return img;
  const k = key + '@' + tw + 'x' + th; let c = scaledCache.get(k); if (c) return c;
  let cur = img, cw = img.width, ch = img.height;
  while (cw / 2 >= tw) { const n = document.createElement('canvas'); n.width = Math.ceil(cw / 2); n.height = Math.ceil(ch / 2); const g = n.getContext('2d'); g.imageSmoothingQuality = 'high'; g.drawImage(cur, 0, 0, n.width, n.height); cur = n; cw = n.width; ch = n.height; }
  const f = document.createElement('canvas'); f.width = tw; f.height = th; const g = f.getContext('2d'); g.imageSmoothingQuality = 'high'; g.drawImage(cur, 0, 0, tw, th);
  if (scaledCache.size > 160) scaledCache.clear(); scaledCache.set(k, f); return f;
}
const alphaMasks = {};
function alphaMask(type, r4 = 0) {            // per-sprite alpha for pixel-accurate tapping (T56: per view, from its first frame)
  const key = type + (B4_DEFS[type] && B4_DEFS[type].t56 ? ':' + VIEW4(r4) : ''); if (key in alphaMasks) return alphaMasks[key];
  let m = null; try { const pa = b4({ type, r4 }), im = pa ? pa.im : SPR[type].img, fw = pa && pa.d.t56 ? pa.v[2] : im.naturalWidth, c = document.createElement('canvas'); c.width = fw; c.height = im.naturalHeight; const g = c.getContext('2d'); g.drawImage(im, 0, 0); m = { w: c.width, h: c.height, d: g.getImageData(0, 0, c.width, c.height).data }; } catch (e) { m = null; }
  return (alphaMasks[key] = m);
}
async function loadAll() {
  const jobs = []; window.ZH_VERSION = VERSION; document.title = 'Zombie Haven V' + VERSION; if (window.ZHChars) jobs.push(ZHChars.load());
  ['tree', 'crate', 'debris'].forEach((p) => jobs.push(loadImg('prop:' + p, `assets/props/${p}.png`)));
  jobs.push(loadImg('grass_a', 'assets/terrain/grass_a.png'), loadImg('grass_b', 'assets/terrain/grass_b.png'));
  [['uiBuildIcon', 'build'], ['uiSurvivorsIcon', 'survivors'], ['uiItemsIcon', 'items']].forEach(([id, f]) => { if ($(id)) $(id).src = `assets/ui/${f}.png?v=${VERSION}`; });
  let legacy = {};
  try { legacy = await (await fetch('assets/buildings/legacy_meta.json?v=' + VERSION)).json(); } catch (e) { console.warn('legacy meta unavailable', e); }
  for (const type of Object.keys(DEFS)) {
    if (DEFS[type].sprite === 'grid') {
      let m = null; try { m = await (await fetch(`assets/buildings/${type}.json?v=${VERSION}`)).json(); } catch (e) { console.warn('grid meta unavailable for', type, e); }
      m = m || { canvas_px: [448, 560], anchor_px: [224, 536], tile_px: [192, 128] };
      SPR[type] = { img: new Image(), w: m.canvas_px[0], h: m.canvas_px[1], ax: m.anchor_px[0], ay: m.anchor_px[1], grid: true, tileW: m.tile_px[0] };
      jobs.push(new Promise((r) => { SPR[type].img.onload = r; SPR[type].img.onerror = r; SPR[type].img.src = `assets/buildings/${type}.png?v=${VERSION}`; }));
    } else {
      const m = legacy[type] || null; SPR[type] = { img: new Image(), w: m ? m.w : 0, h: m ? m.h : 0, ax: m ? m.anchor[0] : 0, ay: m ? m.anchor[1] : 0, grid: false, fit: 1.04 };
      jobs.push(new Promise((r) => { const s = SPR[type]; s.img.onload = () => { if (!s.w) { s.w = s.img.naturalWidth; s.h = s.img.naturalHeight; s.ax = s.w / 2; s.ay = s.h - 1; } r(); }; s.img.onerror = r; s.img.src = `assets/buildings/${type}.png?v=${VERSION}`; }));
    }
  }
  if (HD) Object.assign(B4_DEFS, HD_BUILD); if (C64) Object.assign(B4_DEFS, C64_BUILD);
  if (T56) for (const t of Object.keys(T56_BUILD)) B4_DEFS[t] = Object.assign({ t56: true, tile: 56, dir: 't56' }, T56_BUILD[t]);
  Object.keys(B4_DEFS).forEach((t) => { const d = B4_DEFS[t];
    if (d.t56) d.v.forEach((v, i) => jobs.push(loadImg(`b56:${t}:${i}`, `assets/buildings/t56/${v[0]}.png`)));
    else jobs.push(loadImg('b4:' + t, `assets/buildings/${d.dir || (d.res === 2 ? 'hd' : 'v7')}/${t}.png`)); });
  jobs.push(loadImg('mapWalls', `assets/map/${C64 ? 't106' : 'v7'}/walls.png`), loadImg('mapProps', 'assets/map/v7/props.png'), loadImg('mapWreck', 'assets/map/v7/wreck.png'), loadImg('uiIcons', 'assets/ui/icons.png'), loadImg('statIcons', 'assets/ui/stats.png'), (async () => { try { UIM = await (await fetch('assets/ui/icons.json?v=' + VERSION)).json(); } catch (e) { UIM = null; } })(), (async () => { try { MAPM = await (await fetch(`assets/map/${C64 ? 't106' : 'v7'}/map.json?v=` + VERSION)).json(); } catch (e) { MAPM = null; } })());
  await Promise.all(jobs);
}

/* ---------------- state ---------------- */
const world = Wd.createWorld();
const S = { diff: 'normal', start: 'camp', legacy: {}, finale: null, won: null, posts: [], kids: [], guide: 0, log: [], expCount: 0, pets: [], nextTrader: 2, incidents: 0, inv: {}, rp: 0, res: {}, terr: 0, nextRaid: 2.6, nextBoss: 3, produced: 0, food: 14, water: 14, mat: 30, alert: 0, sealed: false, retreat: 35, fallen: [], spare: [], ren: 0, rank: 1, threat: 1, day: 1, hour: 8, kills: 0, stage: 0, sv: [], z: [], spawnClock: 0, eventClock: 0, arrivalClock: 0, requests: [], builtCount: 0, mission: null, missionStart: { kills: 0, produced: 0, built: 0 }, lastSave: 0, seq: 0 };
const floats = [];
let sel = null;            // active build tool: {kind:'building',type} | {kind:'road'}
let preview = null;        // {x,y,w,h,type,ok,why}
let selected = null;       // {kind:'building'|'unit', ref}

/* ---------------- camera / projection (single transform) ---------------- */
const cam = { x: 0, y: 0, z: 0.85 };
const ORIGIN_Y = 14;
function project(wx, wy) { return { x: VW / 2 + cam.x + (wx - wy) * BASE_TW / 2 * cam.z, y: ORIGIN_Y + cam.y + (wx + wy) * BASE_TH / 2 * cam.z }; }
function unproject(px, py) { const a = (px - VW / 2 - cam.x) / (BASE_TW / 2 * cam.z), b = (py - ORIGIN_Y - cam.y) / (BASE_TH / 2 * cam.z); return { x: (a + b) / 2, y: (b - a) / 2 }; }
const TWs = () => BASE_TW * cam.z, THs = () => BASE_TH * cam.z;
function clampCam() {
  const z = cam.z, left = (0 - ROWS) * BASE_TW / 2 * z, right = COLS * BASE_TW / 2 * z, bottom = (COLS + ROWS) * BASE_TH / 2 * z;
  const minX = VW * 0.28 - right, maxX = VW * 0.72 - left; cam.x = Math.max(minX, Math.min(maxX, cam.x));
  const minY = VH * 0.35 - bottom, maxY = VH * 0.55; cam.y = Math.max(minY, Math.min(maxY, cam.y));
}
function centerOn(wx, wy, z) { if (z) cam.z = z; const p = { x: (wx - wy) * BASE_TW / 2 * cam.z, y: (wx + wy) * BASE_TH / 2 * cam.z }; cam.x = -p.x; cam.y = VH * 0.46 - ORIGIN_Y - p.y; clampCam(); updateZoomLabel(); }
function updateZoomLabel() { $('zv').textContent = Math.round(cam.z * 100) + '%'; }
function resize() {
  const r = worldEl.getBoundingClientRect(); DPR = Math.min(window.devicePixelRatio || 1, 2); VW = Math.max(50, r.width); VH = Math.max(50, r.height);
  cv.width = Math.round(VW * DPR); cv.height = Math.round(VH * DPR); ctx.setTransform(DPR, 0, 0, DPR, 0, 0); clampCam();
}
window.addEventListener('resize', () => { resize(); layoutTop(); });

/* ---------------- ground layer: true pixel art, one art pixel = one character pixel (docs/ART_STANDARD.md) ----------------
   Tile = APX x APY art px (42 x 28, the 2:3 projection). Grass and roads are generated pixel by pixel into one native-size
   canvas, rebuilt whenever the world changes, then drawn with the same sharp-bilinear scaling as the sprites. */
const APX = TILE_PX, APY = TILE_PX / 2, GOXA = ROWS * APX / 2;   // tile size in art px; x of tile (0,0)'s north corner
let groundCv = null, groundKey = '';
const hash2 = (x, y) => { let h = (x * 374761393 + y * 668265263) | 0; h = (h ^ (h >>> 13)) * 1274126177 | 0; return ((h ^ (h >>> 16)) >>> 0) / 4294967296; };
function vnoise(x, y) { const xi = Math.floor(x), yi = Math.floor(y), xf = x - xi, yf = y - yi, s = (t) => t * t * (3 - 2 * t);
  const a = hash2(xi, yi), b = hash2(xi + 1, yi), c = hash2(xi, yi + 1), d = hash2(xi + 1, yi + 1); return a + (b - a) * s(xf) + (c - a) * s(yf) + (a - b - c + d) * s(xf) * s(yf); }
const hex = (h) => [parseInt(h.slice(1, 3), 16), parseInt(h.slice(3, 5), 16), parseInt(h.slice(5, 7), 16)];
const GRASS = ['#3a4d2c', '#425832', '#4b6437', '#546f3c', '#607b44'].map(hex), DIRT = ['#4a3f30', '#55483a', '#605140', '#3e352a'].map(hex), GRASS_OUT = ['#262e22', '#2b3526', '#313c2a', '#37432e', '#3e4b33'].map(hex);   /* V2.25: darker, muted */
const PEBBLE = hex('#8a8476'), FLOWER_Y = hex('#e7d77a'), FLOWER_P = hex('#d8a8d0');
const ROADC = { base: hex('#6a5a45'), dark: hex('#5d4f3c'), light: hex('#76654e'), curb: hex('#4a3f31'), lip: hex('#7c6b53'), dash: hex('#6a5a45') };   /* V2.25: packed-dirt roads */
/* V2.50 HD ground (?hd=1): the same generator at 2 art px per V7 px (GR = 2), split into 4 x 4 chunks so no canvas passes
   iPhone Safari's 16.7-Mpx limit, and a road change only regenerates the chunks around it. V7 keeps one chunk. */
const GR = HD ? 2 : 1, GN = HD ? 4 : 1, GW = (COLS + ROWS) * APX / 2 * GR, GH = (COLS + ROWS) * APY / 2 * GR;
let groundChunks = null, groundRoads = null, groundBuildKey = '';
function groundChunkRect(i, j) { const x0 = Math.floor(GW * i / GN), x1 = Math.floor(GW * (i + 1) / GN), y0 = Math.floor(GH * j / GN), y1 = Math.floor(GH * (j + 1) / GN); return { x0, y0, x1, y1 }; }
function renderGroundChunk(i, j) {
  const R = groundChunkRect(i, j), W = R.x1 - R.x0, H = R.y1 - R.y0, PX = APX * GR, PY = APY * GR, OXA = GOXA * GR;
  let cv0 = groundChunks[j * GN + i]; if (!cv0) { cv0 = document.createElement('canvas'); cv0.width = W; cv0.height = H; groundChunks[j * GN + i] = cv0; }
  const g = cv0.getContext('2d'), id = g.createImageData(W, H), d = id.data;
  const RD = new Uint8Array((COLS + 2) * (ROWS + 2)), TN = new Uint8Array(COLS * ROWS);   // per-tile lookups (hot loop)
  for (let y = -1; y <= ROWS; y++) for (let x = -1; x <= COLS; x++) RD[(y + 1) * (COLS + 2) + x + 1] = Wd.isRoad(world, x, y) ? 1 : 0;
  for (let y = 0; y < ROWS; y++) for (let x = 0; x < COLS; x++) TN[y * COLS + x] = Wd.inTown(x, y) ? 1 : 0;
  const road = (x, y) => RD[(y + 1) * (COLS + 2) + x + 1] === 1;
  for (let qy = 0; qy < H; qy++) for (let qx = 0; qx < W; qx++) {
    const px = qx + R.x0, py = qy + R.y0;
    const A = (px + .5 - OXA) / (PX / 2), B = (py + .5) / (PY / 2), wx = (A + B) / 2, wy = (B - A) / 2;
    if (wx < 0 || wy < 0 || wx >= COLS || wy >= ROWS) continue;
    const tx = Math.floor(wx), ty = Math.floor(wy), u = wx - tx, v = wy - ty; let c;
    if (road(tx, ty)) {
      const e = 0.075, n = road(tx, ty - 1), ea = road(tx + 1, ty), so = road(tx, ty + 1), we = road(tx - 1, ty);
      const edge = (!n && v < e) || (!so && v > 1 - e) || (!we && u < e) || (!ea && u > 1 - e);
      const lip = !edge && ((!n && v < 2 * e) || (!so && v > 1 - 2 * e) || (!we && u < 2 * e) || (!ea && u > 1 - 2 * e));
      const onX = Math.abs(v - .5) < .045 && ((ea && u >= .5) || (we && u <= .5)), onY = Math.abs(u - .5) < .045 && ((so && v >= .5) || (n && v <= .5));
      const dash = (onX && Math.floor(wx * 6) % 2 === 0) || (onY && Math.floor(wy * 6) % 2 === 0);
      const r = hash2(px, py);
      c = edge ? ROADC.curb : lip ? ROADC.lip : dash ? ROADC.dash : r < .08 ? ROADC.dark : r > .95 ? ROADC.light : r > .992 ? PEBBLE : ROADC.base;
    } else {
      const town = TN[ty * COLS + tx] === 1, pal = town ? GRASS : GRASS_OUT;
      let k = vnoise(wx * 2.2, wy * 2.2) * 0.65 + vnoise(px / 3.1, py / 2.3) * 0.35;   // clumps + fine texture (HD: the texture is per HD pixel, so finer)
      let ii = k < .34 ? 0 : k < .46 ? 1 : k < .58 ? 2 : k < .7 ? 3 : 4;
      const r = hash2(px * 3 + 1, py * 5 + 2);
      if (r < .035 && ii > 0) ii -= 1; else if (r > .975 && ii < 4) ii += 1;            // single-pixel tufts
      const dz = vnoise(wx * .55 + 7, wy * .55 + 3) + (town ? -.12 : 0);   /* V2.30: worn dirt patches, more outside the walls */
      if (dz > .7) { const q = hash2(px * 5, py * 3); c = q < .1 ? DIRT[3] : q > .93 ? DIRT[2] : DIRT[dz > .74 ? 1 : 0]; if (hash2(px, py * 11) > .985) c = PEBBLE; }   // pebbles
      else if (dz > .66 && hash2(px * 2, py) > .5) c = DIRT[0];
      else if (hash2(px, py * 7) > .985 && hash2(py, px) > .5 && ii >= 2) c = hash2(px * 3, py) > .5 ? FLOWER_Y : FLOWER_P; else c = pal[ii];   // rare flowers
    }
    const jj = (qy * W + qx) * 4; d[jj] = c[0]; d[jj + 1] = c[1]; d[jj + 2] = c[2]; d[jj + 3] = 255;
  }
  g.putImageData(id, 0, 0);
  { const A = (x, y) => [OXA + (x - y) * PX / 2 - R.x0, (x + y) * PY / 2 - R.y0], B = Wd.BUILD, c = [A(B.x0, B.y0), A(B.x1 + 1, B.y0), A(B.x1 + 1, B.y1 + 1), A(B.x0, B.y1 + 1)];   /* build-zone outline */
    g.beginPath(); g.moveTo(...c[0]); c.slice(1).forEach((q) => g.lineTo(...q)); g.closePath(); g.strokeStyle = 'rgba(214,235,178,.35)'; g.lineWidth = GR; g.stroke(); }
  pixelCache.forEach((v, k) => { if (k.startsWith('ground' + (j * GN + i) + '#')) { pixelBytes -= v.width * v.height * 4; pixelCache.delete(k); } });
}
function buildGround() {   /* regenerate what changed: everything after a territory change, else only the chunks around changed road tiles */
  const bk = Wd.BUILD.x1 + ',' + Wd.BUILD.y1 + ',' + Wd.BUILD.y0 + ',' + Wd.BUILD.x0, roads = new Set(world.roads);
  const all = !groundChunks || bk !== groundBuildKey || !groundRoads; const dirty = new Set();
  if (all) { groundChunks = groundChunks || new Array(GN * GN).fill(null); for (let k = 0; k < GN * GN; k++) dirty.add(k); }
  else {
    const changed = [...roads].filter((k) => !groundRoads.has(k)).concat([...groundRoads].filter((k) => !roads.has(k)));
    const PX = APX * GR, PY = APY * GR, OXA = GOXA * GR;
    for (const key of changed) { const m = String(key).match(/-?\d+/g); if (!m) { for (let k = 0; k < GN * GN; k++) dirty.add(k); break; } const x = +m[0], y = +m[1];
      const xs = [OXA + (x - 1 - (y + 2)) * PX / 2, OXA + (x + 2 - (y - 1)) * PX / 2], ys = [(x - 1 + y - 1) * PY / 2, (x + 2 + y + 2) * PY / 2];   // the tile and its neighbours
      for (let j = 0; j < GN; j++) for (let i = 0; i < GN; i++) { const R = groundChunkRect(i, j); if (xs[1] >= R.x0 && xs[0] <= R.x1 && ys[1] >= R.y0 && ys[0] <= R.y1) dirty.add(j * GN + i); } }
  }
  dirty.forEach((k) => renderGroundChunk(k % GN, Math.floor(k / GN)));
  groundRoads = roads; groundBuildKey = bk; groundCv = groundChunks[0]; return dirty.size;
}
function drawGround() {
  const key = [...world.roads].join('|') + '#' + Wd.BUILD.x1 + ',' + Wd.BUILD.y1 + ',' + Wd.BUILD.y0;   // ground depends on roads and the territory
  if (!groundChunks || key !== groundKey) { groundKey = key; buildGround(); }
  const s = TWs() / (APX * GR), o = project(0, 0), want = s * DPR, ox = o.x - GOXA * GR * s, snap = (v) => Math.round(v * DPR) / DPR;
  for (let j = 0; j < GN; j++) for (let i = 0; i < GN; i++) {
    const c = groundChunks[j * GN + i], R = groundChunkRect(i, j); if (!c) continue;
    const x0 = snap(ox + R.x0 * s), x1 = snap(ox + R.x1 * s), y0 = snap(o.y + R.y0 * s), y1 = snap(o.y + R.y1 * s);
    if (x1 < 0 || y1 < 0 || x0 > VW || y0 > VH) continue;   // off screen
    const m0 = Math.min(3, pxm(want)), m = GN > 1 || c.width * c.height * m0 * m0 > 8e6 ? 1 : m0, big = m > 1 ? pixelUp('ground' + (j * GN + i), c, m) : c;   /* ≤3×: the 4× ground image was ~63 MB, close to iPhone Safari's canvas limit; HD chunks are never pre-scaled */
    ctx.imageSmoothingEnabled = m > 1 && want < m - .02; ctx.imageSmoothingQuality = 'high';
    ctx.drawImage(big, x0, y0, x1 - x0, y1 - y0);
  }
  ctx.imageSmoothingEnabled = true;
}
function tilePath(x, y, grow = 0) { const n = project(x, y), e = project(x + 1, y), s = project(x + 1, y + 1), w = project(x, y + 1); ctx.beginPath(); ctx.moveTo(n.x, n.y - grow); ctx.lineTo(e.x + grow, e.y); ctx.lineTo(s.x, s.y + grow); ctx.lineTo(w.x - grow, w.y); ctx.closePath(); }
function diamond(x, y, fill, edge) { tilePath(x, y); if (fill) { ctx.fillStyle = fill; ctx.fill(); } if (edge) { ctx.strokeStyle = edge; ctx.lineWidth = Math.max(1, cam.z); ctx.stroke(); } }

/* ---------------- roads (procedural, exact tile diamonds; arms follow neighbours) ---------------- */
const roadMask = (x, y) => (Wd.isRoad(world, x, y - 1) ? 1 : 0) | (Wd.isRoad(world, x + 1, y) ? 2 : 0) | (Wd.isRoad(world, x, y + 1) ? 4 : 0) | (Wd.isRoad(world, x - 1, y) ? 8 : 0);
function drawRoadTile(x, y) {
  const m = roadMask(x, y); tilePath(x, y, .4); ctx.fillStyle = '#7b786d'; ctx.fill();
  ctx.save(); tilePath(x, y, .4); ctx.clip();
  const c = [project(x, y), project(x + 1, y), project(x + 1, y + 1), project(x, y + 1)];
  const edges = [[0, 1, 1], [1, 2, 2], [2, 3, 4], [3, 0, 8]]; ctx.lineWidth = Math.max(1.5, cam.z * 2.4); ctx.strokeStyle = '#4f4c45';
  for (const [a, b, bit] of edges) { if (m & bit) continue; ctx.beginPath(); ctx.moveTo(c[a].x, c[a].y); ctx.lineTo(c[b].x, c[b].y); ctx.stroke(); }
  const mid = project(x + .5, y + .5), arms = [[1, x + .5, y], [2, x + 1, y + .5], [4, x + .5, y + 1], [8, x, y + .5]];
  ctx.strokeStyle = 'rgba(232,224,190,.55)'; ctx.lineWidth = Math.max(1, cam.z * 1.4); ctx.setLineDash([3 * cam.z, 4 * cam.z]);
  for (const [bit, ax, ay] of arms) { if (!(m & bit)) continue; const p = project(ax, ay); ctx.beginPath(); ctx.moveTo(mid.x, mid.y); ctx.lineTo(p.x, p.y); ctx.stroke(); }
  ctx.setLineDash([]); ctx.restore();
}

/* ---------------- sprites ---------------- */
function buildIcon(k) { if (B4_DEFS[k]) return `assets/buildings/${B4_DEFS[k].t56 ? 't56' : 'v7'}/${k}.png?v=${VERSION}`; try { const d = DEFS[k], pa = ZHProc.art(k, d.w, d.h); return pa.im.toDataURL(); } catch (e) { return ''; } }
function b4(b) { const d = B4_DEFS[b.type];
  if (d && d.t56) { const r4 = Wd.R4(b), vi = Math.min(VIEW4(r4), d.v.length - 1), im = IMG[`b56:${b.type}:${vi}`]; if (okImg(im)) return { d, im, v: d.v[vi], vi, flip: FLIP4(r4) }; }
  const im = IMG['b4:' + b.type]; if (d && !d.t56 && okImg(im)) return { d, im, flip: b.rot }; const D0 = DEFS[b.type]; if (!D0 || !window.ZHProc) return null; const pa = ZHProc.art(b.type, D0.w, D0.h); return { d: { ax: pa.ax, ay: pa.ay }, im: pa.im }; }   /* V2.25: procedural pixel art until a drawn sprite exists */
function spriteRect(b) { const p4 = b4(b);
  if (p4 && p4.v) { const a = project(b.x + b.w, b.y + b.h), s = TWs() / p4.d.tile, [, , fw, fh, ax, ay] = p4.v; return { x: a.x - (p4.flip ? fw - ax : ax) * s, y: a.y - ay * s, w: fw * s, h: fh * s, s, anchor: a }; }   /* V2.56: one frame of the view's strip */
  if (p4) { const a = project(b.x + b.w, b.y + b.h), s = TWs() / ART_TILE / (p4.d.res || 1), im = p4.im; return { x: a.x - (b.rot ? im.width - p4.d.ax : p4.d.ax) * s, y: a.y - p4.d.ay * s, w: im.width * s, h: im.height * s, s, anchor: a }; }   /* V2.47: a rotated building is the mirrored sprite */
  const sp = SPR[b.type]; if (!sp) return null; const a = project(b.x + b.w, b.y + b.h), tw = TWs(), s = sp.grid ? tw / sp.tileW : ((b.w + b.h) * tw / 2) * sp.fit / sp.w; return { x: a.x - (b.rot ? sp.w - sp.ax : sp.ax) * s, y: a.y - sp.ay * s, w: sp.w * s, h: sp.h * s, s, anchor: a }; }
function drawBuilding(b, ghost, ok) {
  const p4 = b4(b);
  if (p4 && p4.v) {   // V2.56 T56: the view's animation strip, mirrored for odd turns (a mirrored strip runs its frames right to left)
    const [, n, fw, fh] = p4.v, burnt = b.burnt && !ghost, id = `${b.type}:${p4.vi}`, src0 = burnt ? tinted('burnt56' + id, p4.im, BURNT_TINT) : p4.im,
      src = p4.flip ? mirrored((burnt ? 'b56xm' : 'b56m') + id, src0) : src0, r = spriteRect(b), m = pxm(r.s * DPR), big = pixelUp((burnt ? 'b56x' : 'b56') + (p4.flip ? 'm' : '') + id, src, m),
      f0 = burnt || n < 2 ? 0 : Math.floor(performance.now() / p4.d.ms) % n, f = p4.flip ? n - 1 - f0 : f0;
    ctx.save(); if (ghost) ctx.globalAlpha = ok ? .7 : .45; ctx.imageSmoothingEnabled = r.s * DPR < m - .02; ctx.imageSmoothingQuality = 'high';
    ctx.drawImage(big, f * fw * m, 0, fw * m, fh * m, r.x, r.y, r.w, r.h); ctx.restore(); return;
  }
  if (p4) {   // pixel art: same sharp-bilinear path as characters, one shared art-pixel size
    const burnt = b.burnt && !ghost, src0 = burnt ? tinted('burnt' + b.type, p4.im, BURNT_TINT) : p4.im, src = b.rot ? mirrored((burnt ? 'b4xm' : 'b4m') + b.type, src0) : src0, r = spriteRect(b), m = pxm(r.s * DPR), big = pixelUp((burnt ? 'b4x' : 'b4') + (b.rot ? 'm' : '') + b.type, src, m);
    ctx.save(); if (ghost) ctx.globalAlpha = ok ? .7 : .45; ctx.imageSmoothingEnabled = r.s * DPR < m - .02; ctx.imageSmoothingQuality = 'high';
    ctx.drawImage(big, r.x, r.y, r.w, r.h); ctx.restore(); return;
  }
  const sp = SPR[b.type]; if (!sp || !okImg(sp.img)) return; const r = spriteRect(b), img = scaled('b:' + (b.rot ? 'm' : '') + b.type, b.rot ? mirrored('sprm' + b.type, sp.img) : sp.img, r.w * DPR, r.h * DPR);   // anchor = SOUTH corner; V2.18: scaled to device pixels (was CSS pixels: blurry and slow on 3× screens)
  ctx.save(); ctx.imageSmoothingEnabled = true; ctx.imageSmoothingQuality = 'high'; if (ghost) ctx.globalAlpha = ok ? .7 : .45;
  ctx.drawImage(img, r.x, r.y, r.w, r.h); ctx.restore();
}
const propCache = new Map();
function drawProp(kind, tx, ty) {   /* V2.30: pixel-art props from assets/map/props.png, chosen per spot */
  const h = (tx * 31 + ty * 17) % 7, P = MAPM && MAPM.props, im = IMG.mapProps; if (!P || !okImg(im)) return;
  const pick = (names) => { const l = P.filter((q) => names.includes(q.k)); return l[h % l.length]; };
  const pr = kind === 'tree' ? (h === 3 ? pick(['deadtree']) : pick(['pine'])) : kind === 'crate' ? pick(['crate', 'barrel', 'tyres']) : kind === 'car' ? pick(['car']) : pick(h % 2 ? ['rock', 'rubble'] : ['bush', 'rock']);
  const p = project(tx + .5, ty + .5), sc = TWs() / ART_TILE, m = pxm(sc * DPR), big = pixelUp('mapProps', im, m), snap = (v) => Math.round(v * DPR) / DPR;
  ctx.imageSmoothingEnabled = sc * DPR < m - .02; ctx.drawImage(big, pr.x * m, (pr.y || 0) * m, pr.w * m, pr.h * m, snap(p.x - pr.ax * sc), snap(p.y - pr.ay * sc), pr.w * sc, pr.h * sc); ctx.imageSmoothingEnabled = true;
}
function drawSheet(key, img, frame, fw, fh, p, hScale, footY, content = 118, crisp = false, flip = false) {   // hScale = content height in tile widths; content = figure height in source px
  if (!okImg(img)) return; const tw = TWs(), sc = hScale * tw / content;
  ctx.fillStyle = 'rgba(0,0,0,.28)'; ctx.beginPath(); ctx.ellipse(p.x, p.y, .26 * tw * Math.max(1, hScale / CHAR_H), .09 * tw, 0, 0, 7); ctx.fill();
  if (crisp) {   // pixel art, "sharp bilinear": exact size (tracks zoom smoothly), nearest-neighbour pre-scale keeps pixels square and sharp
    const want = sc * DPR, m = pxm(want), big = pixelUp(key, img, m), snap = (v) => Math.round(v * DPR) / DPR;
    const w = fw * sc, h = fh * sc, y = snap(p.y - (footY + 1) * sc);
    ctx.imageSmoothingEnabled = want < m - .02; ctx.imageSmoothingQuality = 'high';
    if (flip) { ctx.save(); ctx.translate(snap(p.x), 0); ctx.scale(-1, 1); ctx.drawImage(big, frame * fw * m, 0, fw * m, fh * m, -w / 2, y, w, h); ctx.restore(); }   // art faces left; mirrored = facing right
    else ctx.drawImage(big, frame * fw * m, 0, fw * m, fh * m, snap(p.x - w / 2), y, w, h);
    ctx.imageSmoothingEnabled = true; return; }
  ctx.imageSmoothingEnabled = true;
  if (sc >= .75) { ctx.drawImage(img, frame * fw, 0, fw, fh, p.x - fw * sc / 2, p.y - footY * sc, fw * sc, fh * sc); return; }
  const k = Math.max(.05, Math.round(sc * 32) / 32), sheet = scaled(key + 's', img, Math.round(img.width * k), Math.round(img.height * k));
  ctx.drawImage(sheet, Math.round(frame * fw * k), 0, Math.round(fw * k), sheet.height, p.x - fw * k / 2, p.y - footY * k, Math.round(fw * k), sheet.height);
}
const EMOJI = { Eating: '🍖', Drinking: '💧', Resting: '💤', Treatment: '💊', Shopping: '🛒', 'Getting food': '🥫', Working: '🔧', Firefighting: '🧯' };
const textCache = new Map();
function textImg(txt, font, col) {   /* V2.18: text and emoji are rasterised once and stamped (fillText was ~16% of frame time) */
  const key = txt + '|' + font + '|' + col + '|' + DPR; let c = textCache.get(key); if (c) return c;
  const m = document.createElement('canvas').getContext('2d'); m.font = font; const w = Math.ceil(m.measureText(txt).width) + 4, px = parseFloat(font.match(/(\d+(\.\d+)?)px/)[1]), h = Math.ceil(px * 1.4) + 4;
  const cv = document.createElement('canvas'); cv.width = Math.ceil(w * DPR); cv.height = Math.ceil(h * DPR); const g = cv.getContext('2d'); g.scale(DPR, DPR); g.font = font; g.fillStyle = col; g.textAlign = 'center'; g.textBaseline = 'alphabetic'; g.fillText(txt, w / 2, px * 1.1 + 2);
  if (textCache.size > 300) textCache.clear(); c = { cv, w, h, base: px * 1.1 + 2 }; textCache.set(key, c); return c;
}
function stampText(txt, x, y, font, col) { const c = textImg(txt, font, col); ctx.imageSmoothingEnabled = false; ctx.drawImage(c.cv, Math.round((x - c.w / 2) * DPR) / DPR, Math.round((y - c.base) * DPR) / DPR, c.cv.width / DPR, c.cv.height / DPR); ctx.imageSmoothingEnabled = true; }
const TAGTXT = { Eating: 'Eating', Drinking: 'Drinking', Resting: 'Resting', Treatment: 'Treatment', Shopping: 'Shopping', 'Getting food': 'Foraging', Working: 'Working', Firefighting: 'Firefighting' };
const tagCache = new Map();
function statusTag(x, y, txt, col) {   /* V2.25: DV2-style status plate above a character */
  const fs = Math.round(Math.max(13, 13 * cam.z)), key = txt + col + fs + DPR; let c = tagCache.get(key);
  if (!c) { const font = `${fs}px 'Jersey 15', Arial, sans-serif`, m = document.createElement('canvas').getContext('2d'); m.font = font; const w = Math.ceil(m.measureText(txt).width) + 8, h = fs + 5;
    const cv = document.createElement('canvas'); cv.width = Math.ceil(w * DPR); cv.height = Math.ceil(h * DPR); const g = cv.getContext('2d'); g.scale(DPR, DPR);
    g.fillStyle = '#1b2016e6'; g.fillRect(0, 0, w, h); g.strokeStyle = '#6e5638'; g.lineWidth = 1.5; g.strokeRect(.75, .75, w - 1.5, h - 1.5); g.font = font; g.fillStyle = '#000'; g.textAlign = 'center'; g.fillText(txt, w / 2 + 1, fs + 1.5); g.fillStyle = col; g.fillText(txt, w / 2, fs + .5);
    if (tagCache.size > 120) tagCache.clear(); c = { cv, w, h }; tagCache.set(key, c); }
  ctx.imageSmoothingEnabled = false; ctx.drawImage(c.cv, Math.round((x - c.w / 2) * DPR) / DPR, Math.round((y - c.h) * DPR) / DPR, c.cv.width / DPR, c.cv.height / DPR); ctx.imageSmoothingEnabled = true;
}
function bubble(p, txt) { stampText(txt, p.x, p.y, `${Math.round(Math.max(11, 13 * cam.z))}px sans-serif`, '#fff'); }
const FACE = new WeakMap();   // per-unit facing, kept out of save data: { lx, ly, right, up }
function facing(o) {   // screen-space facing from movement (or from the target while fighting)
  let st = FACE.get(o); if (!st) { st = { lx: o.w.x, ly: o.w.y, right: false, up: false }; FACE.set(o, st); }
  const t = (o.mode === 'attack' || o.mode === 'chase') && o.target && o.target.w;
  const sx = t ? (t.x - t.y) - (o.w.x - o.w.y) : (o.w.x - o.w.y) - (st.lx - st.ly);   // screen x grows with (wx - wy)
  const sy = t ? (t.x + t.y) - (o.w.x + o.w.y) : (o.w.x + o.w.y) - (st.lx + st.ly);   // screen y grows with (wx + wy)
  if (Math.abs(sx) > 0.004) st.right = sx > 0;
  if (Math.abs(sy) > 0.004) st.up = sy < 0;
  st.lx = o.w.x; st.ly = o.w.y; return st;
}
const OPEN_AIR = new Set(['water', 'well', 'farm', 'field', 'track', 'range']);   // outdoor structures: survivors stay visible while using them
function insideBuilding(s) {   // working, using a facility or in care, standing at an enclosed building's door point = inside
  if (!['work', 'useFacility', 'hospital', 'hiding'].includes(s.mode)) return null;
  const b = s.mode === 'work' ? s.post : s.mode === 'useFacility' ? s.facility : s.mode === 'hiding' ? s.hideAt : world.buildings.find((q) => Iso.footprintContains(q, s.w.x, s.w.y));
  if (!b || OPEN_AIR.has(b.type) || !world.buildings.includes(b)) return null;
  const d = Wd.doorPoint(b); return Math.hypot(s.w.x - d.x, s.w.y - d.y) < .3 ? b : null;
}
/* V3 characters: per-job DV2-style sheets (js/chars.js), animation by state, the equipped weapon drawn in the hand */
const ANIM_T = { idle: 30, walk: 6, carry: 7, punch: 6, blunt: 6, shoot: 6 };
function humanAnim(o, st) {
  const kind = o.eq && o.eq.weapon && ITEMS[o.eq.weapon] ? ITEMS[o.eq.weapon].kind : null;
  if (o.mode === 'down' || o.mode === 'zdown') { st.downT = (st.downT || 0) + 1; return ['collapse', Math.min(3, Math.floor(st.downT / 9))]; } st.downT = 0;
  const atk = o.mode === 'attack' || o.mode === 'recover' || o.mode === 'zattack';
  if (atk) {   /* V2.33: one swing per hit — ready stance, wind-up, the strike exactly when the damage lands, follow-through, back to ready */
    const a = kind === 'gun' || kind === 'bow' ? 'shoot' : kind ? 'blunt' : 'punch';
    if (o.mode === 'attack' || o.mode === 'zattack') { const t = o.stateTicks || 0; return t > 12 ? ['idle', 0] : t > 3 ? [a, 0] : [a, 1]; }
    const el = (o.recDur || 40) - (o.stateTicks || 0); return el < 10 ? [a, 2] : ['idle', 0];
  }
  if (o.mode === 'work' && o.post && OPEN_AIR.has(o.post.type)) { const t = (tick + (o.phase || 0) * 7) % 96; return t < 14 ? ['blunt', 0] : t < 20 ? ['blunt', 1] : t < 30 ? ['blunt', 2] : ['idle', 0]; }   /* V2.36: hoeing / hauling while on shift at an outdoor post */
  if (o.carrying || o.carriedLoot) return ['carry', o.moving === false ? 0 : Math.floor((tick + (o.phase || 0)) / ANIM_T.carry)];
  if (o.moving || o.mode === 'walk' || o.mode === 'rsneak' || o.mode === 'rflee' || o.mode === 'zchase') return ['walk', Math.floor((tick + (o.phase || 0)) / ANIM_T.walk)];
  return ['idle', Math.floor((tick + (o.phase || 0)) / ANIM_T.idle)];
}
function drawChar(o, sheetCv, p, weaponId) {   /* returns the top y of the head */
  const CM = ZHChars.dims(sheetCv), fc = facing(o), view = fc.up ? 1 : 0, [anim, i] = humanAnim(o, fc), f = ZHChars.frame(anim, i, sheetCv);
  const tw = TWs(), sc = tw / ART_TILE, flip = fc.right, sp = sc / CM.res;   /* sp = screen px per sheet px (V2.50: HD sheets have 2 per V7 px) */
  const pose = ZHChars.wpose(f, sheetCv), wcell = weaponId && pose !== 'none' && anim !== 'carry' && window.ZHItems && ZHItems.cell(weaponId, ITEMS[weaponId] && (ITEMS[weaponId].kind === 'gun' || ITEMS[weaponId].kind === 'bow') && pose !== 'aim' && pose !== 'fire' ? 'rest' : pose);
  const drawW = () => {
    if (!wcell) return; const h = ZHChars.hand(view, f, sheetCv.zhTag), hxp = flip ? CM.fw - 1 - h[0] : h[0];
    const big = pixelUp('held', ZHItems.held, pxm(sc * DPR)), m = big.width / ZHItems.held.width, snap = (v) => Math.round(v * DPR) / DPR;
    const x0 = p.x - CM.fw * sp / 2 + (hxp + .5) * sp, y0 = p.y - (CM.foot + 1) * sp + (h[1] + .5) * sp, half = (wcell.s / 2 + .5) * sc;
    ctx.imageSmoothingEnabled = sc * DPR < m - .02; ctx.save();
    if (flip) { ctx.translate(snap(x0), 0); ctx.scale(-1, 1); ctx.drawImage(big, wcell.x * m, wcell.y * m, wcell.s * m, wcell.s * m, -half, snap(y0 - half), wcell.s * sc, wcell.s * sc); }
    else ctx.drawImage(big, wcell.x * m, wcell.y * m, wcell.s * m, wcell.s * m, snap(x0 - half), snap(y0 - half), wcell.s * sc, wcell.s * sc);
    ctx.restore(); ctx.imageSmoothingEnabled = true;
  };
  if (view === 1) drawW();
  ctx.save(); ctx.translate(0, 0);
  const fr = view * 1;   // row
  { const want = sp * DPR, m = pxm(want), key = 'ch' + (sheetCv.zhTag || o.type), big = pixelUp(key, sheetCv, m), snap = (v) => Math.round(v * DPR) / DPR;
    const w = CM.fw * sp, h = CM.fh * sp, y = snap(p.y - (CM.foot + 1) * sp);
    ctx.fillStyle = 'rgba(0,0,0,.28)'; ctx.beginPath(); ctx.ellipse(p.x, p.y, .24 * tw, .085 * tw, 0, 0, 7); ctx.fill();
    ctx.imageSmoothingEnabled = want < m - .02; ctx.imageSmoothingQuality = 'high';
    if (flip) { ctx.translate(snap(p.x), 0); ctx.scale(-1, 1); ctx.drawImage(big, f * CM.fw * m, fr * CM.fh * m, CM.fw * m, CM.fh * m, -w / 2, y, w, h); }
    else ctx.drawImage(big, f * CM.fw * m, fr * CM.fh * m, CM.fw * m, CM.fh * m, snap(p.x - w / 2), y, w, h);
  }
  ctx.restore(); ctx.imageSmoothingEnabled = true;
  if (view === 0) drawW();
  return p.y - CHAR_H * tw;
}
function drawCart(s, p) {   /* V2.33: the rescuer pushes a hand cart with the injured person lying in it */
  const L = ZHChars.look(s), sheet = ZHChars.sheetFor(s), c = sheet && ZHChars.cart(sheet.zhTag, L.sex), q = s.carrying; if (!c) return false;
  const fc = facing(s), view = fc.up ? 1 : 0, flip = fc.right, f = s.moving ? Math.floor((tick + (s.phase || 0)) / 8) % 4 : 0, M = c.m, tw = TWs(), sc = tw / ART_TILE;
  const m = pxm(sc * DPR), big = pixelUp(c.key, c.im, m), snap = (v) => Math.round(v * DPR) / DPR, w = M.fw * sc, h = M.fh * sc;
  ctx.save(); ctx.imageSmoothingEnabled = sc * DPR < m - .02; ctx.translate(snap(p.x), snap(p.y)); if (flip) ctx.scale(-1, 1);
  ctx.fillStyle = 'rgba(0,0,0,.25)'; ctx.beginPath(); ctx.ellipse(-(M.ax - M.fw * .45) * sc, 0, .5 * tw, .12 * tw, 0, 0, 7); ctx.fill();
  const x0 = -M.ax * sc, y0 = -(M.ay + 1) * sc;
  ctx.drawImage(big, f * M.fw * m, view * M.fh * m, M.fw * m, M.fh * m, x0, y0, w, h);
  if (q && window.ZHChars) { const qs = ZHChars.sheetFor(q); if (qs) { const lb = ZHChars.lying(qs), CMm = ZHChars.dims(qs), qsp = sc / CMm.res, qm = pxm(qsp * DPR), bd = c.beds[view * 4 + f], qbig = pixelUp('ch' + qs.zhTag, qs, qm);
    ctx.save(); ctx.translate(x0 + bd[0] * sc, y0 + (bd[1] + 6) * sc); if (view === 1) ctx.scale(-1, 1);
    ctx.drawImage(qbig, lb.f * CMm.fw * qm, 0, CMm.fw * qm, CMm.fh * qm, -lb.cx * qsp, -lb.cy * qsp, CMm.fw * qsp, CMm.fh * qsp); ctx.restore(); } }
  ctx.drawImage(big, f * M.fw * m, (2 + view) * M.fh * m, M.fw * m, M.fh * m, x0, y0, w, h);   /* the cart's front rim over them: they lie inside */
  ctx.restore(); ctx.imageSmoothingEnabled = true; return true;
}
function bleedRing(s, p, dy = 0, dx = 0) {   /* the bleed-out timer; while carried it rides above the cart bed */
  const tw = TWs(); p = { x: p.x + dx, y: p.y }; const mx = bleedMax() + (s.bleed > bleedMax() ? s.bleed - bleedMax() : 0), fr = Math.max(0, Math.min(1, s.bleed / mx)), r = 13 * cam.z, cy = p.y - CHAR_H * tw * .45 + dy, carried = beingCarried(s); ctx.lineWidth = 3 * cam.z; ctx.strokeStyle = 'rgba(0,0,0,.6)'; ctx.beginPath(); ctx.arc(p.x, cy, r, 0, 7); ctx.stroke(); ctx.strokeStyle = carried ? '#6fc3ff' : fr < .25 ? '#ff3b30' : '#ffb347'; ctx.beginPath(); ctx.arc(p.x, cy, r, -Math.PI / 2, -Math.PI / 2 + fr * Math.PI * 2); ctx.stroke(); stampText(String(Math.ceil(s.bleed / 60)), p.x, cy + 5 * cam.z, `${Math.round(Math.max(13, 13 * cam.z))}px 'Jersey 15', monospace`, '#fff'); }
/* V2.37 combat readability: hit sparks on real hits, contextual HP bars, who-attacks-whom for the selected fighter */
function hitSpark(o, p) {
  if (!(o.hitT > 0)) return; const tw = TWs(), k = o.hitT / 9, cy = p.y - CHAR_H * tw * .55, r = (4 + 6 * (1 - k)) * cam.z;
  ctx.save(); ctx.globalAlpha = Math.min(1, k * 1.4); ctx.strokeStyle = o.job !== undefined ? '#ff6e62' : '#fff3b0'; ctx.lineWidth = 2 * cam.z; ctx.beginPath();
  for (let i = 0; i < 6; i++) { const a = i * Math.PI / 3 + .3; ctx.moveTo(p.x + Math.cos(a) * r * .4, cy + Math.sin(a) * r * .4); ctx.lineTo(p.x + Math.cos(a) * r, cy + Math.sin(a) * r); }
  ctx.stroke(); ctx.restore(); o.hitT--;
}
const engaged = (z) => z.hp < z.max || (z.target && z.target.job !== undefined && ['zchase', 'zattack', 'zrecover'].includes(z.mode) && dist(z.w, z.target.w) < 3);
const underAttack = (s) => S.z.some((z) => z.hp > 0 && z.target === s && ['zattack', 'zrecover'].includes(z.mode) && dist(z.w, s.w) < 1.6);
function drawCombatFocus() {   // selected fighter: line to the target, ring on it, weapon range (green = in range)
  if (!selected || selected.kind !== 'unit') return; const s = selected.ref; if (!S.sv.includes(s) || insideBuilding(s)) return;
  const tw = TWs(), p = project(s.w.x, s.w.y), w = weaponOf(s), rg = weaponRange(w), t = s.target && s.target.hp > 0 && ['chase', 'attack', 'recover'].includes(s.mode) ? s.target : null, inR = t && dist(s.w, t.w) <= rg + .1;
  ctx.save(); if (t || isFighter(s)) { ctx.strokeStyle = t ? (inR ? 'rgba(127,211,90,.55)' : 'rgba(255,200,90,.45)') : 'rgba(255,255,255,.18)'; ctx.lineWidth = 1.5; ctx.setLineDash([4, 4]); ctx.beginPath(); ctx.ellipse(p.x, p.y, rg * tw * .707, rg * tw * .354, 0, 0, 7); ctx.stroke(); }
  if (t) { const q = project(t.w.x, t.w.y); ctx.strokeStyle = inR ? '#7fd35a' : '#ffc85a'; ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(p.x, p.y - CHAR_H * tw * .5); ctx.lineTo(q.x, q.y - CHAR_H * tw * .5); ctx.stroke(); ctx.setLineDash([]); ctx.strokeStyle = '#ff5a4a'; ctx.lineWidth = 2.5; ctx.beginPath(); ctx.ellipse(q.x, q.y, .3 * tw, .13 * tw, 0, 0, 7); ctx.stroke();
    stampText(inR ? 'IN RANGE' : 'CLOSING IN', q.x, q.y + .3 * tw, `${Math.round(Math.max(12, 12 * cam.z))}px 'Jersey 15', Arial`, inR ? '#bff0a0' : '#ffe0a0'); }
  ctx.restore();
}
function drawHuman(s) {
  if (insideBuilding(s)) return;   // hidden while inside
  const p = project(s.w.x, s.w.y);
  if (s.mode === 'down' && beingCarried(s)) { if (s.bleed != null) bleedRing(s, project(s.rescuer.w.x, s.rescuer.w.y), -CHAR_H * TWs() * .62, TWs() * .45 * (facing(s.rescuer).right ? 1 : -1)); return; }   /* V2.33: drawn lying in the rescuer's cart */
  if (window.ZHChars && ZHChars.ready) { const sc = ZHChars.sheetFor(s); if (sc && !(s.mode === 'rescueCarry' && s.carrying && drawCart(s, p))) drawChar(s, sc, p, s.mode === 'work' ? null : s.eq && s.eq.weapon); }
  const tw = TWs(), top = p.y - CHAR_H * tw - 3; hitSpark(s, p);
  if (underAttack(s)) { ctx.strokeStyle = 'rgba(255,80,60,.8)'; ctx.lineWidth = 2; ctx.beginPath(); ctx.ellipse(p.x, p.y, .3 * tw, .13 * tw, 0, 0, 7); ctx.stroke(); }
  if (s.hp < s.max || s.mode === 'attack' || s.mode === 'chase') { ctx.fillStyle = '#1a1715'; ctx.fillRect(p.x - 11 * cam.z, top, 22 * cam.z, 4 * cam.z); ctx.fillStyle = '#67c75a'; ctx.fillRect(p.x - 10 * cam.z, top + cam.z, 20 * cam.z * Math.max(0, s.hp / s.max), 2 * cam.z); }
  if (s.mode === 'down' && s.bleed != null) bleedRing(s, p);
  const ic = s.activity ? EMOJI[s.activity] : (s.mode === 'chase' || s.mode === 'attack' ? '⚔️' : s.mode === 'rescueTo' || s.mode === 'rescueCarry' ? '🚑' : s.mode === 'down' ? '💀' : s.mode === 'hospital' ? '💊' : s.purpose === 'patrol' ? '🛡️' : (s.purpose || '').startsWith('scav') ? '🔍' : s.mode === 'wait' && s.idleBubble && (tick + s.phase) % 600 < 130 ? s.idleBubble : '');
  const tagT = s.mode === 'down' ? '' : s.activity ? (TAGTXT[s.activity] || s.activity) : s.mode === 'chase' || s.mode === 'attack' || s.mode === 'recover' ? 'Fighting' : s.mode === 'rescueTo' || s.mode === 'rescueCarry' ? 'Rescue' : s.mode === 'hospital' ? 'In care' : s.mode === 'goFire' ? 'Fire!' : s.purpose === 'patrol' ? 'Patrol' : (s.purpose || '').startsWith('scav') ? 'Scavenging' : '';
  if (tagT) statusTag(p.x, top - 2, tagT, s.mode === 'chase' || s.mode === 'attack' || s.mode === 'recover' || s.mode === 'goFire' ? '#e8603a' : '#cfe08a');
  else if (ic && s.mode !== 'down') bubble({ x: p.x, y: top - 3 }, ic);
  if (selected && selected.ref === s) { ctx.strokeStyle = '#ffe145'; ctx.lineWidth = 2; ctx.beginPath(); ctx.ellipse(p.x, p.y, .34 * tw, .14 * tw, 0, 0, 7); ctx.stroke(); stampText(s.name, p.x, p.y + .36 * tw, `${Math.round(Math.max(15, 15 * cam.z))}px 'Jersey 15', Arial`, '#fff0b0'); }
}
const ZSCALE = { bloated: 1.2, brute: 1.28, crawler: .9 };
const tintCache = {};
function tinted(key, img, fn) {   /* recolour a pixel-art sheet once (keeps every pixel crisp) */
  if (tintCache[key]) return tintCache[key]; if (!okImg(img)) return null;
  const c = document.createElement('canvas'); c.width = img.naturalWidth; c.height = img.naturalHeight; const g = c.getContext('2d'); g.drawImage(img, 0, 0);
  const id = g.getImageData(0, 0, c.width, c.height), d = id.data; for (let i = 0; i < d.length; i += 4) if (d[i + 3]) { const o = fn(d[i], d[i + 1], d[i + 2]); d[i] = o[0]; d[i + 1] = o[1]; d[i + 2] = o[2]; }
  g.putImageData(id, 0, 0); c.complete = true; c.naturalWidth = c.width; return (tintCache[key] = c);
}
const RAIDER_TINT = (r, g, b) => (r > 190 && g > 165 && b > 120 && r - b < 110 ? [Math.round(r * .62), Math.round(g * .2), Math.round(b * .2)] : r > 60 && r < 200 && g < r && b < g ? [Math.round(r * .55), Math.round(g * .55), Math.round(b * .6)] : [r, g, b]);   // red shirt, darker clothes
const BOSS_TINT = (r, g, b) => [Math.min(255, Math.round(r * .9 + 40)), Math.round(g * .55), Math.min(255, Math.round(b * 1.15 + 30))];   // sickly purple
const corpses = [], shots = [];   /* shots: short tracer lines for guns and bows (V2.33) */   /* short death animations (not saved) */
function zFrame(zm, zmeta) {
  const fr = zmeta.frames, fc = facing(zm), boss = zm.type === 'boss';
  const A = (n, t) => fr[n][0] + (Math.floor((tick + (zm.phase || 0)) / t) % fr[n][1]);
  let f;
  if (zm.dead != null) f = fr.death[0] + Math.min(fr.death[1] - 1, Math.floor(zm.dead / 7));
  else if (zm.mode === 'zattack') { const t = zm.stateTicks || 0, at = fr[boss ? 'slam' : 'attack']; f = t > 12 ? fr.idle[0] : at[0] + (t > 3 ? 0 : Math.min(1, at[1] - 1)); }
  else if (zm.mode === 'zrecover') { const at = fr[boss ? 'slam' : 'attack'], el = (zm.recDur || 40) - (zm.stateTicks || 0); f = el < 10 ? at[0] + Math.min(2, at[1] - 1) : fr.idle[0]; }
  else if (boss && zm.mode === 'appear') f = A('roar', 12);
  else if (['zchase', 'zmarch', 'zbreak', 'appear'].includes(zm.mode) || zm.moving) f = A('walk', zm.type === 'runner' ? 4 : boss ? 9 : 7);
  else f = A('idle', 24);
  return { f, view: fc.up ? 1 : 0, flip: fc.right };
}
function drawZSprite(zm, p) {   /* returns head-top y, or null if no art */
  const t = zm.type === 'raider' ? null : zm.type, zmeta = t && window.ZHChars && ZHChars.zmeta(t), sh = zmeta && ZHChars.zsheet(t); if (!sh) return null;
  const { f, view, flip } = zFrame(zm, zmeta), tw = TWs(), sc = tw / ART_TILE, want = sc * DPR, m = pxm(want), big = pixelUp('z7' + t, sh, m), snap = (v) => Math.round(v * DPR) / DPR;
  const w = zmeta.fw * sc, h = zmeta.fh * sc, y = snap(p.y - (zmeta.foot + 1) * sc);
  if (zm.dead != null) ctx.globalAlpha = Math.max(0, Math.min(1, (120 - zm.dead) / 40));
  ctx.fillStyle = 'rgba(0,0,0,.28)'; ctx.beginPath(); ctx.ellipse(p.x, p.y, Math.max(.24, zmeta.fw / 160) * tw, .085 * tw * Math.max(1, zmeta.fw / 50), 0, 0, 7); ctx.fill();
  ctx.imageSmoothingEnabled = want < m - .02; ctx.imageSmoothingQuality = 'high'; ctx.save();
  if (flip) { ctx.translate(snap(p.x), 0); ctx.scale(-1, 1); ctx.drawImage(big, f * zmeta.fw * m, view * zmeta.fh * m, zmeta.fw * m, zmeta.fh * m, -w / 2, y, w, h); }
  else ctx.drawImage(big, f * zmeta.fw * m, view * zmeta.fh * m, zmeta.fw * m, zmeta.fh * m, snap(p.x - w / 2), y, w, h);
  ctx.restore(); ctx.imageSmoothingEnabled = true; ctx.globalAlpha = 1;
  return p.y - zmeta.h * sc;
}
function drawZombie(zm) {
  const p = project(zm.w.x, zm.w.y), tw = TWs();
  if (zm.type === 'raider') {   /* raiders: the survivor rig in raider gear, with their weapon */
    if (!zm.look) zm.look = { sex: rnd() < .3 ? 'f' : 'm', skin: Math.floor(rnd() * 4), hair: Math.floor(rnd() * 8) };
    if (!zm.wpn) zm.wpn = ['bat', 'knife', 'crowbar', 'pistol', 'machete'][Math.floor(rnd() * 5)];
    const sc = window.ZHChars && ZHChars.ready && ZHChars.sheet('Raider', zm.look.sex);
    if (sc) drawChar(Object.assign(zm, { eq: { weapon: zm.wpn } }), sc, p, zm.wpn);
    const top = p.y - CHAR_H * tw - 3; hitSpark(zm, p); ctx.fillStyle = '#1a1715'; ctx.fillRect(p.x - 11 * cam.z, top, 22 * cam.z, 4 * cam.z); ctx.fillStyle = '#ff9a3a'; ctx.fillRect(p.x - 10 * cam.z, top + cam.z, 20 * cam.z * Math.max(0, zm.hp / zm.max), 2 * cam.z);
    if (zm.carried) stampText('⚙' + zm.carried, p.x, top - 4, `${Math.round(Math.max(14, 14 * cam.z))}px 'Jersey 15', monospace`, '#ffe06b');
    return;
  }
  const top = drawZSprite(zm, p); if (top == null || zm.dead != null) return;
  if (zm.type === 'boss') {
    const bt = top - 10; ctx.fillStyle = '#1a1715'; ctx.fillRect(p.x - 28 * cam.z, bt, 56 * cam.z, 7 * cam.z); ctx.fillStyle = '#c74bff'; ctx.fillRect(p.x - 27 * cam.z, bt + cam.z, 54 * cam.z * Math.max(0, zm.hp / zm.max), 5 * cam.z);
    stampText('BOSS', p.x, bt - 3, `${Math.round(Math.max(16, 16 * cam.z))}px 'Jersey 15', monospace`, '#f2c8ff'); return;
  }
  hitSpark(zm, p); if (!engaged(zm)) return;   /* V2.37: HP bar only once it is hurt or fighting someone */
  const hb = top - 5; ctx.fillStyle = '#1a1715'; ctx.fillRect(p.x - 11 * cam.z, hb, 22 * cam.z, 4 * cam.z); ctx.fillStyle = '#d84d48'; ctx.fillRect(p.x - 10 * cam.z, hb + cam.z, 20 * cam.z * Math.max(0, zm.hp / zm.max), 2 * cam.z);
}

/* ---------------- main draw ---------------- */
const TREE_SPOTS = [[0, 2], [2, 2], [4, 3], [7, 2], [10, 3], [13, 2], [15, 4], [0, 7], [1, 11], [0, 15], [1, 18], [4, 19], [7, 19], [10, 19], [13, 18], [15, 16], [15, 11], [14, 7], [1, 4], [13, 4], [1, 17], [14, 18]];
const CRATE_SPOTS = [[1, 6], [14, 13], [2, 19], [13, 5], [0, 12]];
const CAR_SPOTS = [[0, 4], [10, 0]];
/* V2.32: wreckage scattered over the land that isn't unlocked yet (assets/map/v7/wreck.png); it clears as the territory grows */
let wreckKey = '', wreckList = [];
function wreckSpots() {
  const k = Wd.BUILD.x0 + ',' + Wd.BUILD.y0 + ',' + Wd.BUILD.x1 + ',' + Wd.BUILD.y1 + '#' + world.roads.size; if (k === wreckKey) return wreckList;
  const taken = new Set([...TREE_SPOTS, ...CRATE_SPOTS, ...CAR_SPOTS, ...DEBRIS_SPOTS].map(([x, y]) => x + ',' + y)); wreckKey = k; wreckList = [];
  for (let y = 0; y < ROWS; y++) for (let x = 0; x < COLS; x++) {
    if (Wd.inTown(x, y) || Wd.isRoad(world, x, y) || taken.has(x + ',' + y)) continue;
    if (Wd.inTown(x - 1, y) || Wd.inTown(x + 1, y) || Wd.inTown(x, y - 1) || Wd.inTown(x, y + 1)) continue;   // keep a clear strip along the border
    if (hash2(x * 7 + 1, y * 13 + 5) < .11) wreckList.push([x, y]);
  }
  return wreckList;
}
const mirCache = new Map();
function mirrored(key, img) { let c = mirCache.get(key); if (c && c.src === img) return c.cv; const cv = document.createElement('canvas'); cv.width = img.width; cv.height = img.height; const g = cv.getContext('2d'); g.translate(img.width, 0); g.scale(-1, 1); g.drawImage(img, 0, 0); mirCache.set(key, { cv, src: img }); return cv; }
function drawWreck(tx, ty) {
  const P = MAPM && MAPM.wreck, im = IMG.mapWreck; if (!P || !okImg(im)) return;
  const pr = P[Math.floor(hash2(tx * 3 + 2, ty * 5 + 7) * P.length) % P.length], flip = hash2(ty, tx) > .5;
  const p = project(tx + .5, ty + .5), sc = TWs() / ART_TILE, m = pxm(sc * DPR), big = pixelUp('mapWreck', im, m), snap = (v) => Math.round(v * DPR) / DPR;
  ctx.imageSmoothingEnabled = sc * DPR < m - .02;
  if (flip) { const mir = pixelUp('mapWreckF', mirrored('mapWreck', im), m), W = im.width; ctx.drawImage(mir, (W - pr.x - pr.w) * m, pr.y * m, pr.w * m, pr.h * m, snap(p.x - (pr.w - pr.ax) * sc), snap(p.y - pr.ay * sc), pr.w * sc, pr.h * sc); }   /* V2.38: a pre-mirrored sheet (drawing through a negative transform was the slowest thing in the frame) */
  else ctx.drawImage(big, pr.x * m, pr.y * m, pr.w * m, pr.h * m, snap(p.x - pr.ax * sc), snap(p.y - pr.ay * sc), pr.w * sc, pr.h * sc);
  ctx.imageSmoothingEnabled = true;
}
const DEBRIS_SPOTS = [[3, 3], [6, 3], [9, 2], [12, 3], [1, 8], [14, 9], [0, 17], [5, 18], [11, 18], [15, 6], [15, 18]];
function draw() {
  ctx.setTransform(DPR, 0, 0, DPR, 0, 0); ctx.fillStyle = '#10241f'; ctx.fillRect(0, 0, VW, VH);
  drawGround();   /* V2.18: the build-zone outline is baked into the ground image (stroking it every frame was ~half the frame time) */
  if (sel && (sel.kind === 'wall' || sel.kind === 'post')) {
    for (let y = Wd.WALLZONE.y0; y <= Wd.WALLZONE.y1; y++) for (let x = Wd.WALLZONE.x0; x <= Wd.WALLZONE.x1; x++) {
      const occ = Wd.buildingAt(world, x, y), road = Wd.isRoad(world, x, y), wl = Wd.wallAt(world, x, y);
      diamond(x, y, wl ? 'rgba(224,180,60,.30)' : occ ? 'rgba(183,90,85,.40)' : road ? 'rgba(113,129,138,.45)' : 'rgba(95,174,97,.22)', wl ? '#ffe38a' : road ? '#b4c2c8' : 'rgba(155,220,133,.35)');
    }
  } else if (sel) {
    for (let y = Wd.BUILD.y0; y <= Wd.BUILD.y1; y++) for (let x = Wd.BUILD.x0; x <= Wd.BUILD.x1; x++) {
      const occ = Wd.buildingAt(world, x, y), road = Wd.isRoad(world, x, y);
      if (sel.kind === 'road') diamond(x, y, road ? 'rgba(113,129,138,.55)' : (occ ? 'rgba(183,90,85,.45)' : 'rgba(95,174,97,.30)'), road ? '#b4c2c8' : 'rgba(155,220,133,.5)');
      else diamond(x, y, road ? 'rgba(113,129,138,.35)' : (occ ? 'rgba(183,90,85,.40)' : 'rgba(95,174,97,.22)'), 'rgba(155,220,133,.35)');
    }
    if (preview && sel.kind === 'building') for (let yy = 0; yy < preview.h; yy++) for (let xx = 0; xx < preview.w; xx++) diamond(preview.x + xx, preview.y + yy, preview.ok ? 'rgba(114,217,223,.62)' : 'rgba(226,91,85,.62)', preview.ok ? '#d7ffff' : '#ffb0a8');
  }
  drawTileConfirm();
  for (const p of S.posts || []) if ((sel && sel.kind === 'post') || (selected && selected.kind === 'post' && selected.ref === p)) drawPostRange(p, !!(selected && selected.ref === p));
  const items = [];
  const box = (x, y, r) => ({ x1: x - r, y1: y - r, x2: x + r, y2: y + r });
  /* V2.36: only what is on screen is drawn and depth-sorted (props and wreckage off screen were ~60% of the frame) */
  const mg = TWs() * 2.6, vis = (wx, wy) => { const p = project(wx, wy); return p.x > -mg && p.x < VW + mg && p.y > -mg * .6 && p.y < VH + mg * 1.6; };
  TREE_SPOTS.forEach(([x, y]) => { if (vis(x + .5, y + .5) && !Wd.buildingAt(world, x, y) && !Wd.wallAt(world, x, y)) items.push({ ...box(x + .5, y + .5, .22), fn: () => drawProp('tree', x, y) }); });
  CRATE_SPOTS.forEach(([x, y]) => vis(x + .5, y + .5) && !Wd.wallAt(world, x, y) && items.push({ ...box(x + .5, y + .5, .2), fn: () => drawProp('crate', x, y) }));
  DEBRIS_SPOTS.forEach(([x, y]) => vis(x + .5, y + .5) && !Wd.wallAt(world, x, y) && items.push({ ...box(x + .5, y + .5, .2), fn: () => drawProp('debris', x, y) }));
  CAR_SPOTS.forEach(([x, y]) => vis(x + .5, y + .5) && !Wd.wallAt(world, x, y) && !Wd.buildingAt(world, x, y) && items.push({ ...box(x + .5, y + .5, .3), fn: () => drawProp('car', x, y) }));
  wreckSpots().forEach(([x, y]) => vis(x + .5, y + .5) && !Wd.wallAt(world, x, y) && !Wd.buildingAt(world, x, y) && items.push({ ...box(x + .5, y + .5, .3), fn: () => drawWreck(x, y) }));
  for (const wl of world.walls.values()) if (vis(wl.x + .5, wl.y + .5)) items.push({ x1: wl.x, y1: wl.y, x2: wl.x + 1, y2: wl.y + 1, fn: () => drawWall(wl) });
  for (const gp of S.posts || []) if (vis(gp.x + .5, gp.y + .5)) items.push({ x1: gp.x + .1, y1: gp.y + .1, x2: gp.x + .9, y2: gp.y + .9, fn: () => drawPost(gp) });
  world.buildings.forEach((b) => vis(b.x + b.w / 2, b.y + b.h / 2) && items.push({ x1: b.x, y1: b.y, x2: b.x + b.w, y2: b.y + b.h, fn: () => { drawBuilding(b); if (b.fire || b.burnt) drawFire(b); if (selected && selected.ref === b) selectRing(b); drawStaffBadge(b); } }));
  if (preview && sel && sel.kind === 'building') items.push({ x1: preview.x, y1: preview.y, x2: preview.x + preview.w, y2: preview.y + preview.h, bias: .01, fn: () => drawBuilding(preview, true, preview.ok) });
  S.z.forEach((z) => { if (z.hp > 0 && vis(z.w.x, z.w.y)) items.push({ ...box(z.w.x, z.w.y, .12), fn: () => drawZombie(z) }); });
  corpses.forEach((c) => vis(c.w.x, c.w.y) && items.push({ ...box(c.w.x, c.w.y, .12), fn: () => drawZSprite(c, project(c.w.x, c.w.y)) }));
  S.sv.forEach((s) => vis(s.w.x, s.w.y) && items.push({ ...box(s.w.x, s.w.y, .12), fn: () => drawHuman(s) }));
  S.sv.forEach((s) => { if (!s.pet || s.mode === 'away' || insideBuilding(s)) return; const pp = petPos(s); items.push({ ...box(pp.w.x, pp.w.y, .06), fn: () => drawPet(s, pp) }); });
  if (S.trader) items.push({ ...box(S.trader.w.x, S.trader.w.y, .12), fn: drawTrader });
  Iso.sortDrawables(items).forEach((o) => o.fn());
  drawCombatFocus(); drawDaylight(); drawNightLights(); drawObjMarks(); drawAlertMarks();
  for (let i = shots.length - 1; i >= 0; i--) { const sh = shots[i], a = project(sh.a.x, sh.a.y), b = project(sh.b.x, sh.b.y), hy = CHAR_H * TWs() * .55;
    ctx.save(); ctx.globalAlpha = Math.min(1, sh.t / 4); ctx.strokeStyle = sh.bow ? '#d8c08a' : '#ffe9a0'; ctx.lineWidth = Math.max(1, cam.z * (sh.bow ? 1.4 : 1)); ctx.beginPath(); ctx.moveTo(a.x, a.y - hy); ctx.lineTo(b.x, b.y - hy * .8); ctx.stroke(); ctx.restore(); if (--sh.t <= 0) shots.splice(i, 1); }
  for (const f of floats) { const p = project(f.w.x, f.w.y); ctx.globalAlpha = Math.min(1, f.a / 15); stampText(f.t, p.x, p.y - CHAR_H * TWs() - 8 - (55 - f.a) * .25, `${Math.round(Math.max(15, 16 * cam.z))}px 'Jersey 15', Arial`, f.col); ctx.globalAlpha = 1; }
  if (floats.length > 80) floats.splice(0, floats.length - 80);   /* a burst of numbers can't pile up */
  for (let i = floats.length - 1; i >= 0; i--) if (--floats[i].a <= 0) floats.splice(i, 1);
  if (debug) drawDebug();
}
/* walls: procedural placeholder art (no sprite sheet yet) — single-tile blocks that join their neighbours */
/* V2.33 day / night: a soft tint over the world — warm morning, clear day, orange dusk, deep blue night */
const LIGHT = [[0, [20, 30, 80, .5]], [4.5, [20, 30, 80, .5]], [6, [255, 170, 110, .16]], [8, [255, 255, 255, 0]], [17, [255, 255, 255, 0]], [19, [255, 120, 60, .2]], [20.5, [40, 40, 110, .42]], [24, [20, 30, 80, .5]]];
function daylight(h) {
  for (let i = 0; i < LIGHT.length - 1; i++) { const [h0, a] = LIGHT[i], [h1, b] = LIGHT[i + 1]; if (h >= h0 && h <= h1) { const t = (h - h0) / (h1 - h0 || 1); return a.map((v, k) => v + (b[k] - v) * t); } }
  return LIGHT[0][1];
}
/* V2.38 night lights: warm window light on occupied buildings, a lantern glow around survivors outdoors, red eye-glints on zombies.
   One cached glow sprite drawn additively: cheap on phones. Fades in with the night tint. */
let glowSpr = null;
function glowSprite() {
  if (glowSpr) return glowSpr; const c = document.createElement('canvas'); c.width = c.height = 128; const g = c.getContext('2d'), gr = g.createRadialGradient(64, 64, 4, 64, 64, 64);
  gr.addColorStop(0, 'rgba(255,196,120,.85)'); gr.addColorStop(.45, 'rgba(255,160,80,.32)'); gr.addColorStop(1, 'rgba(255,140,60,0)'); g.fillStyle = gr; g.fillRect(0, 0, 128, 128); return (glowSpr = c);
}
function drawNightLights() {
  if (!OPTS.nightLights) return;
  const c = daylight((S.hour || 0) + (tick % 1000) / 1000), k = Math.max(0, Math.min(1, (c[3] - .14) / .3)); if (k <= 0) return;
  const tw = TWs(), G = glowSprite(), on = (p, m) => p.x > -m && p.x < VW + m && p.y > -m && p.y < VH + m;
  const lit = new Set(); for (const q of S.sv) { const b = insideBuilding(q); if (b) lit.add(b); if (q.sleeping && q.facility) lit.add(q.facility); }
  ctx.save(); ctx.globalCompositeOperation = NL_MODE;
  for (const b of world.buildings) {
    if (!ENCLOSED(b) || b.burnt || !(lit.has(b) || isWorking(b))) continue; const r = spriteRect(b); if (!r || !on(r.anchor, tw * 3)) continue;
    const w = (b.w + b.h) * tw * .3, h = w * .5; ctx.globalAlpha = .75 * k; ctx.drawImage(G, r.anchor.x - w / 2, r.anchor.y - tw * (b.w + b.h) * .26 - h / 2, w, h);
  }
  for (const s of S.sv) { if (s.hp <= 0 || s.mode === 'away' || insideBuilding(s)) continue; const p = project(s.w.x, s.w.y); if (!on(p, tw)) continue;
    ctx.globalAlpha = .38 * k; ctx.drawImage(G, p.x - tw * NL_S, p.y - tw * NL_S * .75, tw * NL_S * 2, tw * NL_S * 1.27); }
  ctx.globalCompositeOperation = 'source-over';
  for (const z of S.z) { if (z.hp <= 0 || z.human || z.mode === 'appear') continue; const p = project(z.w.x, z.w.y); if (!on(p, tw)) continue;
    const hy = p.y - CHAR_H * tw * (z.type === 'crawler' ? .42 : z.type === 'brute' || z.type === 'boss' ? 1.05 : .84), fr = (FACE.get(z) || {}).right ? 1 : -1, e = Math.max(1.2, 1.1 * cam.z);
    ctx.globalAlpha = .55 + .35 * k; ctx.fillStyle = '#ff4a3a'; ctx.fillRect(p.x + fr * 1.5 * cam.z - e, hy, e, e); ctx.fillRect(p.x + fr * 4 * cam.z - e, hy, e, e); }
  ctx.restore();
}
const NL_MODE = 'source-over', NL_S = .32;   /* measured: lit area is the cost, so small lanterns and normal blending */
function drawDaylight() {   /* V2.36: one opaque multiply pass (was a multiply pass plus a second full-screen darkening pass inside save/restore) */
  const c = daylight((S.hour || 0) + (tick % 1000) / 1000); if (c[3] < .01) return;
  const f = c[2] > c[0] && c[3] > .3 ? 1 - (c[3] - .3) * .6 : 1, k = (v) => Math.round(255 * (1 - c[3] + c[3] * v / 255) * f);   // multiply by (1-a+a*c) then darken: the same result in one fill
  ctx.setTransform(1, 0, 0, 1, 0, 0); ctx.globalCompositeOperation = 'multiply'; ctx.fillStyle = `rgb(${k(c[0])},${k(c[1])},${k(c[2])})`; ctx.fillRect(0, 0, cv.width, cv.height);
  ctx.globalCompositeOperation = 'source-over'; ctx.setTransform(DPR, 0, 0, DPR, 0, 0);
}
function drawWall(wl) {   /* V2.30: pixel-art wall pieces (post + arms toward joined neighbours), cracked below 60% HP, rubble when broken */
  const W = MAPM && MAPM.wall, im = IMG.mapWalls; if (!W || !okImg(im)) return;
  const has = (dx, dy) => { const o = Wd.wallAt(world, wl.x + dx, wl.y + dy); return !!o && !o.broken; }, f = wl.hp / wl.max;
  const key = wl.broken ? 'rubble' : wl.type + (+has(-1, 0)) + (+has(1, 0)) + (+has(0, -1)) + (+has(0, 1)) + (f < .6 ? 'c' : ''), i = W.cells[key] ?? W.cells.rubble;
  const hit = wl.hit > 0; if (hit) wl.hit--;
  const src = hit ? tinted('wallsHit', im, (r, g, b) => [Math.min(255, r + 120), Math.min(255, g + 110), Math.min(255, b + 100)]) : im;
  const O = project(wl.x, wl.y), sc = TWs() / ART_TILE, m = pxm(sc * DPR), big = pixelUp(hit ? 'wallsH' : 'walls', src, m), snap = (v) => Math.round(v * DPR) / DPR;
  const cx = (i % W.cols) * W.w, cy = Math.floor(i / W.cols) * W.h;
  ctx.imageSmoothingEnabled = sc * DPR < m - .02; ctx.drawImage(big, cx * m, cy * m, W.w * m, W.h * m, snap(O.x - W.ax * sc), snap(O.y - W.ay * sc), W.w * sc, W.h * sc); ctx.imageSmoothingEnabled = true;
  if (f < 1 && !wl.broken) { const q = project(wl.x + .5, wl.y + .5), py = q.y - ((W.hgt && W.hgt[wl.type === 'metal' ? 'metal' : 'wood']) || 28) * sc - 6 * sc; ctx.fillStyle = '#1a1715'; ctx.fillRect(q.x - 10 * cam.z, py - 2 * cam.z, 20 * cam.z, 4 * cam.z); ctx.fillStyle = f > .5 ? '#67c75a' : f > .25 ? '#e0b43c' : '#d84d48'; ctx.fillRect(q.x - 9 * cam.z, py - cam.z, 18 * cam.z * Math.max(0, f), 2 * cam.z); }
}
/* V2.45 guard post pixel art, drawn in code on the 96-px-per-tile art grid: a sandbag ring around a pole, the flag coloured by the watch (blue night, gold day, red both) */
const POST_ART = new Map(), POST_FLAG = { night: ['#4f7fd0', '#2c4f8f'], day: ['#e8b73a', '#9c7418'], all: ['#d0503c', '#7e2a1d'] }, POST_AX = 32, POST_AY = 54;
function postArt(sched) {
  let c = POST_ART.get(sched); if (c) return c; c = document.createElement('canvas'); c.width = 64; c.height = 70; const g = c.getContext('2d');
  const px = (x, y, w, h, col) => { g.fillStyle = col; g.fillRect(x, y, w, h); }, cx = 32, cy = 54, rx = 25, ry = 12, [fl, fd] = POST_FLAG[sched] || POST_FLAG.night;
  for (let y = -ry - 1; y <= ry + 1; y++) for (let x = -rx - 2; x <= rx + 2; x++) if ((x * x) / ((rx + 2) * (rx + 2)) + (y * y) / ((ry + 1) * (ry + 1)) <= 1) px(cx + x, cy + y + 2, 1, 1, 'rgba(0,0,0,.22)');   /* shadow */
  const bag = (bx, by) => { bx = Math.round(bx - 5); by = Math.round(by - 3); px(bx + 1, by, 8, 1, '#3d2e1a'); px(bx, by + 1, 10, 4, '#3d2e1a'); px(bx + 1, by + 5, 8, 1, '#3d2e1a'); px(bx + 1, by + 1, 8, 4, '#b39a62'); px(bx + 1, by + 4, 8, 1, '#8e7646'); px(bx + 2, by + 1, 5, 1, '#d8c48c'); px(bx + 4, by + 2, 1, 2, '#8e7646'); };
  const ring = [], N = 12; for (let i = 0; i < N; i++) { const a = i / N * Math.PI * 2; ring.push([cx + Math.cos(a) * rx, cy + Math.sin(a) * ry]); }
  for (const [bx, by] of ring.filter(([, y]) => y < cy).sort((a, b) => a[1] - b[1])) { bag(bx, by); bag(bx, by - 4); }
  px(31, 8, 3, 46, '#3d2e1a'); px(32, 9, 1, 44, '#7a5532'); px(31, 6, 3, 3, '#3d2e1a'); px(32, 7, 1, 1, '#c9b48a');   /* pole */
  px(34, 9, 15, 10, fd); px(34, 10, 14, 8, fl); px(35, 11, 12, 2, 'rgba(255,255,255,.28)'); px(46, 10, 2, 8, fd); px(40, 14, 4, 2, fd);   /* flag */
  for (const [bx, by] of ring.filter(([, y]) => y >= cy).sort((a, b) => a[1] - b[1])) { bag(bx, by); bag(bx, by - 4); }
  POST_ART.set(sched, c); return c;
}
let postIconUrl = null; const postIcon = () => postIconUrl || (postIconUrl = (() => { const a = postArt('night'), c = document.createElement('canvas'); c.width = a.width * 2; c.height = a.height * 2; const g = c.getContext('2d'); g.imageSmoothingEnabled = false; g.drawImage(a, 0, 0, c.width, c.height); return c.toDataURL(); })());
function drawPost(p) {
  const im = postArt(p.sched), O = project(p.x + .5, p.y + .5), sc = TWs() / ART_TILE, m = pxm(sc * DPR), big = pixelUp('post_' + p.sched, im, m), snap = (v) => Math.round(v * DPR) / DPR;
  ctx.imageSmoothingEnabled = sc * DPR < m - .02; ctx.drawImage(big, snap(O.x - POST_AX * sc), snap(O.y - POST_AY * sc), im.width * sc, im.height * sc); ctx.imageSmoothingEnabled = true;
}
function drawPostRange(p, strong) {   /* the watch radius: zombies inside it go for the holder */
  ctx.beginPath(); for (let i = 0; i <= 40; i++) { const a = i / 40 * Math.PI * 2, q = project(p.x + .5 + Math.cos(a) * POST_R, p.y + .5 + Math.sin(a) * POST_R); if (i) ctx.lineTo(q.x, q.y); else ctx.moveTo(q.x, q.y); }
  ctx.fillStyle = strong ? 'rgba(120,170,255,.10)' : 'rgba(120,170,255,.05)'; ctx.fill(); ctx.setLineDash([6 * cam.z, 5 * cam.z]); ctx.strokeStyle = strong ? 'rgba(160,200,255,.85)' : 'rgba(160,200,255,.45)'; ctx.lineWidth = Math.max(1, 1.5 * cam.z); ctx.stroke(); ctx.setLineDash([]);
}
const FAM_ICON = { water: ['💧', '#6fb3e0'], farm: ['🍖', '#e0b84a'], scrap: ['⚙', '#8fc6d8'], research: ['🔬', '#a993e8'] };
function drawStaffBadge(b) {   /* V2.36 building status: producers get a ring that fills with real output toward the next unit (bright while worked);
   facilities show how many are inside; problems get a marker. Everything comes from the simulation state. */
  const d = DEFS[b.type], r = spriteRect(b); if (!d || !r || b.burnt) return;
  const z = Math.max(.75, cam.z), cx = r.anchor.x, cy = r.anchor.y - TWs() * (b.w + b.h) * .5 * .62, fi = FAM_ICON[d.fam], R = 9 * z;
  ctx.save();
  if (fi) {
    const on = isWorking(b); ctx.beginPath(); ctx.arc(cx, cy, R, 0, 7); ctx.fillStyle = 'rgba(16,24,18,.82)'; ctx.fill();
    ctx.lineWidth = 3 * z; ctx.strokeStyle = 'rgba(255,255,255,.14)'; ctx.beginPath(); ctx.arc(cx, cy, R - 1.5 * z, 0, 7); ctx.stroke();
    ctx.strokeStyle = on ? fi[1] : 'rgba(200,190,160,.55)'; ctx.beginPath(); ctx.arc(cx, cy, R - 1.5 * z, -Math.PI / 2, -Math.PI / 2 + Math.PI * 2 * Math.min(1, b.acc || 0)); ctx.stroke();
    stampText(fi[0], cx, cy + 4.5 * z, `${Math.round(10 * z)}px sans-serif`, '#fff');
    if (d.slot) { ctx.beginPath(); ctx.arc(cx + R * .78, cy - R * .78, 3.6 * z, 0, 7); ctx.fillStyle = b.staff ? (on ? '#4fd36a' : '#2f8f48') : 'rgba(240,176,48,.95)'; ctx.fill(); ctx.lineWidth = 1.2; ctx.strokeStyle = '#102418'; ctx.stroke(); }
    if ((d.fam === 'farm' && b.dry) || b.unpaid) stampText(b.unpaid ? '½' : '💧✗', cx + R * 1.9, cy + 4 * z, `bold ${Math.round(11 * z)}px sans-serif`, '#ff9a84');
  } else if (d.slot) {   // staffed non-producers (medical, kitchen): the old dot
    if (d.fam === 'medical') { const n = S.sv.filter((q) => q.mode === 'hospital' && (q.careAt === b || (!q.careAt && medSite() === b))).length; if (n) stampText(`✚${n}`, cx + 14 * z, cy + 4 * z, `bold ${Math.round(12 * z)}px 'Jersey 15', Arial`, '#ff9a9a'); }
    ctx.beginPath(); ctx.arc(cx, cy, 5.5 * z, 0, 7); ctx.fillStyle = b.staff ? (isWorking(b) ? '#4fd36a' : '#2f8f48') : 'rgba(240,176,48,.9)'; ctx.fill(); ctx.lineWidth = 1.5; ctx.strokeStyle = '#102418'; ctx.stroke();
  }
  if (facilityRules[b.type]) { const n = S.sv.filter((q) => q.facility === b && q.mode === 'useFacility').length; if (n > 0) { const sl = b.type === 'house' && S.sv.some((q) => q.facility === b && q.sleeping); stampText(`${sl ? '💤' : '👤'}${n}`, cx + (fi || d.slot ? -R * 1.9 : 0), cy + 4 * z, `${Math.round(11 * z)}px 'Jersey 15', Arial`, '#fff3c4'); } }
  ctx.restore();
}
function selectRing(b) {
  const c = [project(b.x, b.y), project(b.x + b.w, b.y), project(b.x + b.w, b.y + b.h), project(b.x, b.y + b.h)];
  ctx.beginPath(); ctx.moveTo(c[0].x, c[0].y); c.slice(1).forEach((p) => ctx.lineTo(p.x, p.y)); ctx.closePath(); ctx.strokeStyle = '#ffe145'; ctx.lineWidth = 2; ctx.setLineDash([6, 4]); ctx.stroke(); ctx.setLineDash([]);
}
function drawDebug() {
  ctx.save(); ctx.lineWidth = 1; ctx.font = '9px monospace'; ctx.textAlign = 'left';
  for (let x = 0; x <= COLS; x++) { const a = project(x, 0), b = project(x, ROWS); ctx.strokeStyle = 'rgba(255,255,255,.10)'; ctx.beginPath(); ctx.moveTo(a.x, a.y); ctx.lineTo(b.x, b.y); ctx.stroke(); }
  for (let y = 0; y <= ROWS; y++) { const a = project(0, y), b = project(COLS, y); ctx.strokeStyle = 'rgba(255,255,255,.10)'; ctx.beginPath(); ctx.moveTo(a.x, a.y); ctx.lineTo(b.x, b.y); ctx.stroke(); }
  for (const b of world.buildings) {
    const c = [project(b.x, b.y), project(b.x + b.w, b.y), project(b.x + b.w, b.y + b.h), project(b.x, b.y + b.h)];
    ctx.beginPath(); ctx.moveTo(c[0].x, c[0].y); c.slice(1).forEach((p) => ctx.lineTo(p.x, p.y)); ctx.closePath(); ctx.strokeStyle = '#14f5eb'; ctx.lineWidth = 2; ctx.stroke();
    ctx.fillStyle = '#ffcc3a'; ctx.beginPath(); ctx.arc(c[2].x, c[2].y, 4, 0, 7); ctx.fill();
    const dp = Wd.doorPoint(b), dpp = project(dp.x, dp.y); ctx.fillStyle = '#ff3df2'; ctx.beginPath(); ctx.arc(dpp.x, dpp.y, 3, 0, 7); ctx.fill();
    const dt = Wd.doorTile(b); ctx.save(); tilePath(dt.x, dt.y); ctx.strokeStyle = '#ff3df2'; ctx.lineWidth = 1; ctx.stroke(); ctx.restore();
    const r = spriteRect(b); if (r) { ctx.strokeStyle = 'rgba(255,255,255,.35)'; ctx.lineWidth = 1; ctx.strokeRect(r.x, r.y, r.w, r.h); }
    ctx.fillStyle = '#fff'; ctx.fillText(`${b.type} (${b.x},${b.y}) ${b.w}x${b.h} S=(${b.x + b.w},${b.y + b.h})`, c[3].x - 6, c[3].y + 11);
  }
  for (const s of S.sv) { const p = project(s.w.x, s.w.y); ctx.fillStyle = '#ff4040'; ctx.fillRect(p.x - 2, p.y - 2, 4, 4); if (s.path && s.path.length) { ctx.strokeStyle = 'rgba(80,255,120,.8)'; ctx.beginPath(); ctx.moveTo(p.x, p.y); for (const q of s.path) { const pp = project(q.x, q.y); ctx.lineTo(pp.x, pp.y); } ctx.stroke(); } }
  for (const z of S.z) { const p = project(z.w.x, z.w.y); ctx.fillStyle = '#ff9040'; ctx.fillRect(p.x - 2, p.y - 2, 4, 4); }
  ctx.fillStyle = 'rgba(0,0,0,.6)'; ctx.fillRect(4, VH - 38, 252, 34); ctx.fillStyle = '#9ff'; ctx.fillText(`DEBUG  TH/TW=${(BASE_TH / BASE_TW).toFixed(4)}  angle=${Iso.ANGLE_DEG.toFixed(3)}°  zoom=${cam.z.toFixed(2)}`, 8, VH - 24);
  ctx.fillStyle = '#ffcc3a'; ctx.fillText('● south anchor', 8, VH - 11); ctx.fillStyle = '#ff3df2'; ctx.fillText('● door', 96, VH - 11); ctx.fillStyle = '#14f5eb'; ctx.fillText('▭ footprint', 140, VH - 11); ctx.fillStyle = '#ff4040'; ctx.fillText('■ feet', 208, VH - 11);
  ctx.restore();
}

/* ---------------- simulation: tuning (tile units; 60 ticks/s fixed step) ---------------- */
const WALK = .0167, CHASE = .026, CARRY = .0158;   /* V2.37: pushing the cart is close to walking pace (was .0133, barely faster than a walker's chase) */
const weapons = [['Pipe', 6, 0], ['Knife', 9, 45], ['Bat', 14, 75], ['Machete', 19, 120], ['Pistol', 24, 180]];
const professions = {
  Civilian: { combat: 0, med: 0, scav: 0, facility: 0, master: 40, next: ['Guard', 'Medic', 'Scavenger'], skill: 'Adaptable' },
  Guard: { combat: 3, med: 0, scav: 0, facility: 0, master: 60, next: ['Police Officer'], skill: 'Threat Response' },
  Medic: { combat: 0, med: 4, scav: 0, facility: 1, master: 60, next: ['Paramedic'], skill: 'Field Aid' },
  Scavenger: { combat: 1, med: 0, scav: 4, facility: 0, master: 60, next: ['Mechanic'], skill: 'Loot Sense' },
  'Police Officer': { combat: 5, med: 0, scav: 1, facility: 0, master: 80, next: ['SWAT'], skill: 'Armed Response' },
  Paramedic: { combat: 1, med: 7, scav: 0, facility: 2, master: 80, next: [], skill: 'Trauma Care' },
  Mechanic: { combat: 1, med: 0, scav: 3, facility: 5, master: 80, next: ['Engineer'], skill: 'Repair' },
  Engineer: { combat: 1, med: 0, scav: 2, facility: 7, master: 100, next: [], skill: 'Facility Expert' },
  Farmer: { combat: 0, med: 0, scav: 1, facility: 2, master: 60, next: [], skill: 'Green Thumb' },
  Cook: { combat: 0, med: 0, scav: 0, facility: 3, master: 60, next: [], skill: 'Hearty Meals' },
  SWAT: { combat: 8, med: 0, scav: 1, facility: 0, master: 100, next: [], skill: 'Suppression' },
};
const facilityRules = {   // V2.6: no prices. Survivors are fed by the daily ration; visits relieve the need meters (food/water/medicine must be in stock to help).
  canteen: { need: 'hunger', use: 145, sat: 2, benefit: 26, label: 'Eating' },
  house: { need: 'fatigue', use: 175, sat: 1, benefit: 34, label: 'Resting' },
  medic: { need: 'injury', use: 190, sat: 2, benefit: 34, label: 'Treatment' },
  clinic: { need: 'injury', use: 205, sat: 2, benefit: 50, label: 'Treatment' },
  hospital: { need: 'injury', use: 220, sat: 3, benefit: 70, label: 'Treatment' },
  armory: { need: 'gear', use: 155, sat: 2, benefit: 25, label: 'Shopping' },
  water: { need: 'thirst', use: 100, sat: 1, benefit: 28, label: 'Drinking' },
  well: { need: 'thirst', use: 100, sat: 1, benefit: 36, label: 'Drinking' },
  farm: { need: 'hunger', use: 100, sat: 1, benefit: 16, label: 'Getting food' },
  field: { need: 'hunger', use: 100, sat: 1, benefit: 22, label: 'Getting food' },
  gym: { need: 'train', stat: 'str', use: 170, sat: 1, benefit: 34, label: 'Lifting weights' },
  library: { need: 'train', stat: 'int', use: 170, sat: 1, benefit: 34, label: 'Studying' },
  lounge: { need: 'train', stat: 'cha', use: 150, sat: 2, benefit: 34, label: 'Socialising' },
  range: { need: 'train', stat: 'per', use: 170, sat: 1, benefit: 34, label: 'Target practice' },
  track: { need: 'train', stat: 'agi', use: 170, sat: 1, benefit: 34, label: 'Running drills' },
  sparring: { need: 'train', stat: 'end', use: 170, sat: 1, benefit: 34, label: 'Sparring' },
};
const weaponCost = (w) => Math.ceil(w[2] / 45);   // weapons are bought with PARTS from the stockpile (no money)
const RATION_BASE = { Civilian: 1, Farmer: 1, Medic: 1, Paramedic: 1, Engineer: 1.25, Mechanic: 1.25, Guard: 1.5, 'Police Officer': 1.5, SWAT: 1.5, Scavenger: 1.5 };
const LEVEL_CAP = 10;   /* V2.16: DV2-style, levels 6-10 need much more XP */
/* V2.12: per-profession levels (like DV2). Each survivor keeps a level + XP for every profession they have worked
   (s.cls[job] = { l, xp }); s.l / s.mastery always mirror the current job. Reaching Lv.3 and Lv.5 in a profession
   teaches a skill that stays with the survivor for good, whatever job they do later. */
const CLASS_LIST = ['Civilian', 'Guard', 'Police Officer', 'Medic', 'Scavenger', 'Engineer', 'Cook', 'Farmer'];
const SKILLS = {
  quickLearner: { name: 'Quick Learner', from: 'Civilian', at: 3, desc: '+25% XP in every profession' },
  hardy: { name: 'Hardy', from: 'Civilian', at: 5, desc: '+10 max HP' },
  brawler: { name: 'Brawler', from: 'Guard', at: 3, desc: '+3 damage per hit' },
  tough: { name: 'Tough', from: 'Guard', at: 5, desc: '+15 max HP' },
  steadyAim: { name: 'Steady Aim', from: 'Police Officer', at: 3, desc: '+4 damage per hit' },
  armored: { name: 'Armored', from: 'Police Officer', at: 5, desc: 'Takes 20% less damage' },
  firstAid: { name: 'First Aid', from: 'Medic', at: 3, desc: 'Slowly heals when not fighting' },
  steadyHands: { name: 'Steady Hands', from: 'Medic', at: 5, desc: 'Carries the wounded 30% faster; patients recover 30% faster' },
  lightFeet: { name: 'Light Feet', from: 'Scavenger', at: 3, desc: '+15% walking speed' },
  lootSense: { name: 'Loot Sense', from: 'Scavenger', at: 5, desc: 'Finds more on scavenging runs and expeditions' },
  handy: { name: 'Handy', from: 'Engineer', at: 3, desc: 'Wall repairs go twice as fast while alive' },
  efficient: { name: 'Efficient', from: 'Engineer', at: 5, desc: '+15% output at any building they staff' },
  ironStomach: { name: 'Iron Stomach', from: 'Cook', at: 3, desc: 'Hunger and thirst rise 20% slower' },
  fieldRations: { name: 'Field Rations', from: 'Cook', at: 5, desc: 'Eating and drinking relieve 25% more' },
  strongBack: { name: 'Strong Back', from: 'Farmer', at: 3, desc: '+10 max HP, carries the wounded 20% faster' },
  greenThumb: { name: 'Green Thumb', from: 'Farmer', at: 5, desc: '+20% output at any building they staff' },
  jackOfAll: { name: 'Jack of All Trades', from: 'Civilian', at: 10, desc: '+1 to every stat' },
  bulwark: { name: 'Bulwark', from: 'Guard', at: 10, desc: 'Takes 15% less damage, +20 max HP' },
  marksman: { name: 'Marksman', from: 'Police Officer', at: 10, desc: 'Ranged weapons hit 25% harder' },
  miracleWorker: { name: 'Miracle Worker', from: 'Medic', at: 10, desc: 'Heals 3× faster outside combat; patients they rescue recover 30% faster' },
  treasureHunter: { name: 'Treasure Hunter', from: 'Scavenger', at: 10, desc: 'Expeditions find 20% more and gear twice as often' },
  masterBuilder: { name: 'Master Builder', from: 'Engineer', at: 10, desc: 'Halves upkeep of the building they staff; +20% research' },
  headChef: { name: 'Head Chef', from: 'Cook', at: 10, desc: 'Meals +30% at any Canteen they staff' },
  harvestMaster: { name: 'Harvest Master', from: 'Farmer', at: 10, desc: '+30% output at any food building they staff' },
};
const hasSkill = (s, k) => !!(s.skills && s.skills.includes(k));
/* ---------------- V2.14: survivor stats (DV2 + Fallout SPECIAL) and equipment ---------------- */
const STATS = ['str', 'end', 'agi', 'per', 'int', 'cha'];
const STAT_NAME = { str: 'Strength', end: 'Endurance', agi: 'Agility', per: 'Perception', int: 'Intelligence', cha: 'Charisma' };
const STAT_CAP = 20;
const JOB_STATS = { Civilian: ['cha', 'int'], Guard: ['str', 'end'], 'Police Officer': ['per', 'end'], Medic: ['int', 'cha'], Scavenger: ['agi', 'per'], Engineer: ['int', 'str'], Cook: ['cha', 'end'], Farmer: ['str', 'end'], Mechanic: ['int', 'str'], Paramedic: ['int', 'agi'], SWAT: ['per', 'str'] };
const ITEMS = {   // slot, attack (weapons), defence (armor), stat bonuses, parts cost (armory/crafting); kind = how it is swung (blunt/blade/gun/bow); ranged = attacks from ~2.4 tiles
  pipe: { name: 'Lead Pipe', slot: 'weapon', kind: 'blunt', atk: 6, cost: 0 }, knife: { name: 'Kitchen Knife', slot: 'weapon', kind: 'blade', atk: 9, cost: 2 }, bat: { name: 'Baseball Bat', slot: 'weapon', kind: 'blunt', atk: 14, cost: 4 },
  crowbar: { name: 'Crowbar', slot: 'weapon', kind: 'blunt', atk: 16, cost: 5 }, nailbat: { name: 'Nail Bat', slot: 'weapon', kind: 'blunt', atk: 18, cost: 6 },
  machete: { name: 'Machete', slot: 'weapon', kind: 'blade', atk: 19, cost: 6 }, spear: { name: 'Scrap Spear', slot: 'weapon', kind: 'blade', atk: 21, cost: 7, st: { per: 1 } },
  axe: { name: 'Fire Axe', slot: 'weapon', kind: 'blade', atk: 25, cost: 9, st: { agi: -1 } }, sledge: { name: 'Sledgehammer', slot: 'weapon', kind: 'blunt', atk: 30, cost: 11, st: { agi: -2 } },
  katana: { name: 'Katana', slot: 'weapon', kind: 'blade', atk: 33, cost: 15, st: { agi: 1 } },
  pistol: { name: 'Pistol', slot: 'weapon', kind: 'gun', atk: 17, cost: 8, ranged: true }, revolver: { name: 'Revolver', slot: 'weapon', kind: 'gun', atk: 22, cost: 10, ranged: true },
  shotgun: { name: 'Shotgun', slot: 'weapon', kind: 'gun', atk: 30, cost: 13, ranged: true, st: { agi: -1 } }, smg: { name: 'SMG', slot: 'weapon', kind: 'gun', atk: 26, cost: 13, ranged: true },
  rifle: { name: 'Hunting Rifle', slot: 'weapon', kind: 'gun', atk: 27, cost: 12, ranged: true }, assault: { name: 'Assault Rifle', slot: 'weapon', kind: 'gun', atk: 36, cost: 18, ranged: true },
  bow: { name: 'Hunting Bow', slot: 'weapon', kind: 'bow', atk: 18, cost: 7, ranged: true, st: { per: 1 } }, crossbow: { name: 'Crossbow', slot: 'weapon', kind: 'bow', atk: 26, cost: 11, ranged: true },
  jacket: { name: 'Work Jacket', slot: 'armor', def: 2, cost: 2 }, leather: { name: 'Leather Jacket', slot: 'armor', def: 4, cost: 4 }, hockey: { name: 'Hockey Pads', slot: 'armor', def: 5, cost: 5 },
  biker: { name: 'Biker Leathers', slot: 'armor', def: 6, cost: 6, st: { cha: 1 } }, riot: { name: 'Riot Vest', slot: 'armor', def: 7, cost: 8, st: { agi: -1 } },
  kevlar: { name: 'Kevlar Vest', slot: 'armor', def: 9, cost: 10 }, military: { name: 'Military Armor', slot: 'armor', def: 11, cost: 13, st: { agi: -1 } }, plate: { name: 'Scrap Plate', slot: 'armor', def: 12, cost: 11, st: { agi: -2 } },
  gloves: { name: 'Lifting Gloves', slot: 'acc', st: { str: 2 }, cost: 3 }, belt: { name: 'Back Brace', slot: 'acc', st: { end: 2 }, cost: 3 }, shoes: { name: 'Running Shoes', slot: 'acc', st: { agi: 2 }, cost: 3 },
  goggles: { name: 'Scope Goggles', slot: 'acc', st: { per: 2 }, cost: 3 }, glasses: { name: 'Reading Glasses', slot: 'acc', st: { int: 2 }, cost: 3 }, charm: { name: 'Lucky Charm', slot: 'acc', st: { cha: 2 }, cost: 3 },
  dogtags: { name: 'Dog Tags', slot: 'acc', st: { str: 1, end: 1, per: 1 }, cost: 6 },
};
const SLOTS = ['weapon', 'armor', 'acc'], SLOT_NAME = { weapon: 'Weapon', armor: 'Armor', acc: 'Accessory' };
const ARMORY_STOCK = { weapon: ['knife', 'bat', 'crowbar', 'machete', 'pistol', 'bow'], armor: ['jacket', 'leather', 'hockey', 'riot'] };   // what survivors can buy at an Armory with parts
const itemOf = (s, slot) => (s.eq && s.eq[slot] && ITEMS[s.eq[slot]]) || null;
const PART_DROP = { walker: [.55, 1], runner: [.55, 1], crawler: [.45, 1], spitter: [.7, 1], bloated: [.75, 2], brute: [1, 2], raider: [0, 0] };   /* V2.33: [chance, parts] per kill (was 25% for 1) */
const weaponOf = (s) => itemOf(s, 'weapon') || ITEMS.pipe;
const RANGE = { pistol: 4, revolver: 4.2, shotgun: 3, smg: 4.2, rifle: 6, assault: 5.2, bow: 5, crossbow: 5.5 };   /* V2.33: ranged weapons fire from a distance (tiles) */
const weaponRange = (w) => (w && w.ranged ? RANGE[Object.keys(ITEMS).find((k) => ITEMS[k] === w)] || 4 : .9);
function stat(s, k) { let v = ((s.st && s.st[k]) || 5) + (hasSkill(s, 'jackOfAll') ? 1 : 0); for (const sl of SLOTS) { const it = itemOf(s, sl); if (it && it.st && it.st[k]) v += it.st[k]; } if (s.pet && PETS[s.pet.kind] && PETS[s.pet.kind].st[k]) v += PETS[s.pet.kind].st[k]; return Math.max(1, v); }
const sMod = (s, k, per) => 1 + (stat(s, k) - 5) * per;   // 5 = average; each point above/below changes the effect by `per`
function itemScore(it) { return it ? (it.atk || 0) * 1 + (it.def || 0) * 2.2 + Object.values(it.st || {}).reduce((a, v) => a + v * 3, 0) : 0; }
function rollStats(job, l) { const st = {}; for (const k of STATS) st[k] = 2 + Math.floor(rnd() * 3); for (const k of (JOB_STATS[job] || [])) st[k] += 2 + Math.max(0, (l || 1) - 1); for (const k of STATS) st[k] = Math.min(STAT_CAP, st[k]); return st; }
const stashAdd = (id, n = 1) => { S.inv = S.inv || {}; S.inv[id] = (S.inv[id] || 0) + n; };
const stashTake = (id) => { if (!S.inv || !S.inv[id]) return false; S.inv[id]--; if (!S.inv[id]) delete S.inv[id]; return true; };
function equip(s, id) {   // move an item from the stash into its slot; the old item goes back to the stash
  const it = ITEMS[id]; if (!it || !stashTake(id)) return false; s.eq = s.eq || {}; const old = s.eq[it.slot]; if (old && old !== 'pipe') stashAdd(old); s.eq[it.slot] = id; setMaxHp(s); return true;
}
function unequip(s, slot) { s.eq = s.eq || {}; const old = s.eq[slot]; if (!old || old === 'pipe') return false; stashAdd(old); s.eq[slot] = slot === 'weapon' ? 'pipe' : null; setMaxHp(s); return true; }
const FIGHTERS = new Set(['Guard', 'Police Officer', 'Scavenger', 'SWAT']);   // everyone else hides from zombies unless cornered
const isFighter = (s) => FIGHTERS.has(s.job);
/* V2.43 personalities: one trait per survivor, fixed for life. Each bends a decision the AI already makes (fight range, falling back, rescues, breaks, sleep, food, friendships,
   expeditions), with an upside and a cost, so who you post where, who you arm and who you send out matters. */
const TRAITS = {
  brave:     { name: 'Brave', icon: '🦁', good: 'Engages zombies from 25% farther and fights on until 10% lower health', bad: 'Ends up hurt and downed more often', nf: 'Joins the militia even when hurt and fights on until 10% lower health' },
  cautious:  { name: 'Cautious', icon: '🛡️', good: 'Falls back 15% sooner, spots sneaking raiders sooner, 30% less likely to get hurt on expeditions', bad: 'Engages from 20% closer', nf: 'Falls back 15% sooner; 30% less likely to get hurt on expeditions' },
  diligent:  { name: 'Hard-working', icon: '⚒️', good: '+15% output at their post; puts up with more before taking a break', bad: 'Tires 20% faster' },
  caring:    { name: 'Caring', icon: '❤️', good: 'First to run to the downed, even past two zombies; friendships grow 50% faster', bad: 'Grieves harder when a friend dies' },
  loner:     { name: 'Loner', icon: '🐺', good: 'Hardly grieves; +25% expedition loot in a squad of 1–2', bad: 'Friendships grow at half speed' },
  eater:     { name: 'Big Eater', icon: '🍖', good: '+12 max HP', bad: 'Eats 30% more' },
  scrounger: { name: 'Scrounger', icon: '🔍', good: 'Finds a spare part about every other day; +15% expedition loot', bad: '−10% output at a post' },
  owl:       { name: 'Night Owl', icon: '🦉', good: 'Stays up later; at night engages from 30% farther and spots raiders sooner', bad: '−15% output on the morning shift', nf: 'Stays up later at night (as a fighter: engages from 30% farther at night and spots raiders sooner)' },
};
const TRAIT_KEYS = Object.keys(TRAITS), hasT = (s, k) => !!s && s.trait === k;
function rollTrait(s) { let h = 7; for (const c of String(s.name) + ':' + (s.id || 0)) h = (h * 31 + c.charCodeAt(0)) >>> 0; return TRAIT_KEYS[h % TRAIT_KEYS.length]; }   /* stable for old saves */
const traitGood = (s) => { const t = TRAITS[s && s.trait]; return t ? (!isFighter(s) && t.nf ? t.nf : t.good) : ''; };
const traitIcon = (s) => (TRAITS[s && s.trait] ? TRAITS[s.trait].icon : '');
const traitTag = (s) => (TRAITS[s && s.trait] ? ` · ${TRAITS[s.trait].icon} ${TRAITS[s.trait].name}` : '');
const traitRange = (s) => (hasT(s, 'brave') ? 1.25 : hasT(s, 'cautious') ? .8 : 1) * (hasT(s, 'owl') && isNight() ? 1.3 : 1);
const traitSpot = (s) => (hasT(s, 'cautious') || (hasT(s, 'owl') && isNight()) ? 1.2 : 0);
const traitWork = (s) => (hasT(s, 'diligent') ? .15 : 0) - (hasT(s, 'scrounger') ? .1 : 0) - (hasT(s, 'owl') && S.hour >= 7 && S.hour < 12 ? .15 : 0);
const traitRetreat = (s) => (hasT(s, 'brave') ? -10 : hasT(s, 'cautious') ? 15 : 0);
const skillMaxHp = (s) => (hasSkill(s, 'bulwark') ? 20 : 0) + (hasSkill(s, 'hardy') ? 10 : 0) + (hasSkill(s, 'tough') ? 15 : 0) + (hasSkill(s, 'strongBack') ? 10 : 0);
const baseMax = (s) => 48 + 8 * (s.l || 1) + 2 * stat(s, 'end') + skillMaxHp(s) + (hasT(s, 'eater') ? 12 : 0);   /* V2.14: Endurance adds HP */
const dmgReduce = (s) => (s && s.job !== undefined ? Math.min(.6, ((itemOf(s, 'armor') || {}).def || 0) * .03 + (stat(s, 'end') - 5) * .012) : 0);   /* armor + Endurance */
const skillDmg = (s) => (hasSkill(s, 'brawler') ? 3 : 0) + (hasSkill(s, 'steadyAim') ? 4 : 0);
const xpMult = (s) => (hasSkill(s, 'quickLearner') ? 1.25 : 1) * Math.max(.7, sMod(s, 'int', .03));
function gainXp(s, n) { if (!s || n <= 0) return; s.mastery = (s.mastery || 0) + n * xpMult(s); masteryCheck(s); }
function learnSkills(s, quiet = false) {   // grant every skill this survivor has earned in any profession
  s.skills = s.skills || []; const got = [];
  for (const [k, sk] of Object.entries(SKILLS)) { const c = s.cls && s.cls[sk.from]; if (c && c.l >= sk.at && !s.skills.includes(k)) { s.skills.push(k); got.push(sk.name); } }
  if (got.length && !quiet) { note('routine', `${s.name} learned ${got.join(', ')} (kept in every profession).`, { at: s.w, float: '★ NEW SKILL', col: '#ffe38a' }); }
  return got;
}
function syncClass(s) { s.cls = s.cls || {}; s.cls[s.job] = { l: s.l || 1, xp: s.mastery || 0 }; }
function setMaxHp(s) { const f = s.max ? s.hp / s.max : 1; s.max = baseMax(s); s.hp = Math.max(s.hp > 0 ? 1 : 0, Math.min(s.max, Math.round(s.max * f))); }
function changeProfession(s, job) {   // keeps every class level and every learned skill
  if (!s || s.job === job || !professions[job]) return false;
  syncClass(s); const c = s.cls[job] || { l: 1, xp: 0 }; s.job = job; s.l = c.l; s.mastery = c.xp; s.mastered = c.l >= LEVEL_CAP;
  if (s.post && s.post.staff === s) { s.post.staff = null; } s.post = null; setMaxHp(s); syncClass(s);
  say(`${s.name} is now a ${job} (Lv.${s.l}).`, true); if (typeof autoStaff === 'function') autoStaff(); return true;
}
const ration = (s) => (RATION_BASE[s.job] || 1) * (1 + .06 * (Math.min(LEVEL_CAP, s.l || 1) - 1)) * (hasT(s, 'eater') ? 1.3 : 1);   // rations per day (half food, half water)
const workBoost = (s) => .5 + .08 * (Math.min(LEVEL_CAP, s.l || 1) - 1);                            // matching-profession output boost (+50%, +10% per level above 1)
const jobAI = { Civilian: { aggro: 3.0, rescue: 5, town: 1.35 }, Guard: { aggro: 6, rescue: 7, town: .65 }, Medic: { aggro: 3.3, rescue: 10, town: 1.1 }, Scavenger: { aggro: 4.3, rescue: 6, town: .8 }, 'Police Officer': { aggro: 6.8, rescue: 8, town: .55 } };
const zombieTypes = {
  walker: { name: 'Walker', hp: 30, atk: 4, aggro: 2.2, chase: .0125, reward: 18, ren: 1, weight: 58 },
  crawler: { name: 'Crawler', hp: 22, atk: 3, aggro: 1.8, chase: .017, reward: 16, ren: 1, weight: 20 },
  runner: { name: 'Runner', hp: 25, atk: 5, aggro: 3.2, chase: .027, reward: 25, ren: 2, weight: 12 },
  bloated: { name: 'Bloated', hp: 60, atk: 8, aggro: 2, chase: .009, reward: 40, ren: 3, weight: 6 },
  spitter: { name: 'Spitter', hp: 28, atk: 6, aggro: 3.7, chase: .0125, reward: 32, ren: 2, weight: 3 },
  brute: { name: 'Brute', hp: 105, atk: 12, aggro: 2.4, chase: .008, reward: 70, ren: 5, weight: 1 },
  raider: { name: 'Raider', hp: 55, atk: 7, aggro: 2.6, chase: .019, reward: 0, ren: 3, weight: 0 },   /* V2.13: human raiders */
  boss: { name: 'Mutant Boss', hp: 260, atk: 14, aggro: 4.2, chase: .0085, reward: 0, ren: 25, weight: 0 },   /* V2.13: boss every 3rd night */
};

const TOWN_EVENT_DEFS = [
  { id: 'caravan', name: 'Trader Caravan', text: 'A caravan leaves food and water.', food: 3, water: 3, ren: 2 },
  { id: 'supplies', name: 'Supply Cache', text: 'Scavengers uncover some useful parts.', mat: 2, ren: 1 },
  { id: 'rumor', name: 'Safe Haven Rumor', text: 'Word of the Haven spreads.', ren: 4 },
];
const rankRules = [{ rank: 1, ren: 0, income: 0, residents: 0, facilities: 0 }, { rank: 2, ren: 60, income: 40, residents: 2, facilities: 6 }, { rank: 3, ren: 200, income: 160, residents: 3, facilities: 10 }, { rank: 4, ren: 450, income: 400, residents: 5, facilities: 15 }, { rank: 5, ren: 900, income: 800, residents: 7, facilities: 20 }];   // income = supplies produced
const MASTER_BONUS = {};

/* ---------------- helpers ---------------- */
const dist = (a, b) => Math.hypot(a.x - b.x, a.y - b.y);
const tileOf = (w) => ({ x: Math.max(0, Math.min(COLS - 1, Math.floor(w.x))), y: Math.max(0, Math.min(ROWS - 1, Math.floor(w.y))) });
const tc = (x, y) => ({ x: x + .5, y: y + .5 });
const rnd = () => Math.random();
function say(t, log = false) { if (log) logEvent(t, 'important'); const e = $('say'); e.textContent = t; e.style.opacity = 1; clearTimeout(say.t); say.t = setTimeout(() => (e.style.opacity = 0), 1700); }
function screenToast(t, log) { note('important', t, log ? { log } : {}); }
function renownGain(n, why = '') { S.ren += n; const el = $('ren'); if (el) { el.parentElement.classList.remove('renFlash'); void el.offsetWidth; el.parentElement.classList.add('renFlash'); } note(n >= 5 ? 'important' : 'routine', `★ RENOWN +${n}${why ? ' · ' + why : ''}`); ui(); }   /* V2.34: small gains only flash the Renown wheel and go to the log */
/* ---------------- V2.34 notifications: three levels ----------------
 * critical  : persistent alert row (top of the map), one per unresolved issue (deduplicated by key), tap = centre the camera on it,
 *             optional action buttons, pulsing marker in the world + an arrow at the screen edge when it is off screen,
 *             optional "drop to 1x speed" on the first emergency (Event log → settings).
 * important : one banner at a time (queued, never overlapping), and the event log.
 * routine   : event log only (plus floating text in the world when it has a place). */
const alerts = new Map(); let bannerQ = [], bannerOn = false, lastSlow = -1e9; const lastBanner = new Map();
const OPT_KEY = 'zombieHavenOpts', OPTS = { autoSlow: true, nightLights: true, advisor: true }; try { Object.assign(OPTS, JSON.parse(localStorage.getItem(OPT_KEY) || '{}')); } catch (e) { /* private mode */ }
function saveOpts() { try { localStorage.setItem(OPT_KEY, JSON.stringify(OPTS)); } catch (e) { /* ignore */ } }
const atOf = (a) => { const v = typeof a.at === 'function' ? a.at() : a.at; return v && isFinite(v.x) ? v : null; };
function note(level, text, o = {}) {
  logEvent(o.log || text, level);
  if (level === 'routine') { const at = o.at && (typeof o.at === 'function' ? o.at() : o.at); if (at && o.float) floats.push({ w: { x: at.x, y: at.y }, t: o.float, col: o.col || '#e8e0c8', a: 70 }); return; }
  if (level === 'important') { banner(o.banner || text); return; }
  const key = o.key || text, a = alerts.get(key);
  if (a) { a.text = text; if (o.at) a.at = o.at; renderAlerts(); return; }
  const first = ![...alerts.values()].some((q) => !q.dismissed);
  alerts.set(key, { key, text, icon: o.icon || '⚠', at: o.at || null, live: o.live || null, dyn: o.dyn || null, acts: o.acts || [], threats: !!o.threats, t0: tick, ttl: o.ttl || 0, seen: performance.now() });
  { const a2 = alerts.get(key); if (a2.dyn) try { a2.text = a2.dyn(); } catch (e) { /* keep the first text */ } }
  if (first && OPTS.autoSlow && simSpeed > 1 && performance.now() - lastSlow > 60000) { lastSlow = performance.now(); simSpeed = 1; $('btnSpeed').textContent = '1×'; banner('⏸ Back to 1× speed: emergency'); }
  renderAlerts();
}
function banner(t) {
  const now = performance.now(); if (now - (lastBanner.get(t) || -1e9) < 8000 || bannerQ.includes(t)) return; lastBanner.set(t, now);
  if (lastBanner.size > 80) lastBanner.clear(); bannerQ.push(t); if (bannerQ.length > 4) bannerQ.shift(); nextBanner();
}
function nextBanner() {
  const fx = $('fx'); if (bannerOn || !bannerQ.length || !fx) return; const t = bannerQ.shift(); bannerOn = true;
  const d = document.createElement('div'); d.className = 'toast'; d.textContent = t; fx.appendChild(d);
  setTimeout(() => { d.remove(); bannerOn = false; nextBanner(); }, 1700);
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
function setTxt(el, t) { if (el && el.textContent !== t) el.textContent = t; }
function renderAlerts() {
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
const SHORT_ICON = { food: '🍖', water: '💧', mat: '⚙' };
function shortageCheck() {
  const E = econ(), day = S.day;
  for (const k of ['food', 'water']) {
    const e = E[k], nm = RES_TITLE[k];
    if (e.days < 1.2 && e.stock >= 1) note('critical', `${nm} runs out in about ${Math.max(1, Math.round(e.days * 24))} h`, { key: 'low' + k, icon: SHORT_ICON[k], live: () => econ()[k].days < 1.6 && S[k] >= 1,
      dyn: () => { const q = econ()[k]; return `${nm} runs out in about ${Math.max(1, Math.round(q.days * 24))} h · ${sgn(q.net)} / day`; }, acts: [{ label: 'Why?', fn: () => showResource(k) }, { label: 'Build', fn: () => { bCat = 'live'; showBuild(); } }] });
    else if (e.days < 2 && (S.warnDay || {})[k] !== day) { S.warnDay = { ...(S.warnDay || {}), [k]: day }; note('important', `⚠ ${nm.toUpperCase()}: ABOUT ${e.days.toFixed(1)} DAYS LEFT`, { log: `${nm} is going down by ${f1(-e.net)} a day: about ${e.days.toFixed(1)} days left. Tap ${nm.toLowerCase()} at the top to see why.` }); }
    if (e.full && e.net > .2 && (S.warnDay || {})[k + 'Full'] !== day) { S.warnDay = { ...(S.warnDay || {}), [k + 'Full']: day }; note('important', `${SHORT_ICON[k]} ${nm.toUpperCase()} STORAGE FULL`, { log: `${nm} storage is full (${e.cap}): extra production is wasted. Build Storage, or use it (feasts, trades).` }); }
  }
  const up = upkeepTotal(); if (S.hour === 18 && S.mat < up && (S.warnDay || {}).up !== day) { S.warnDay = { ...(S.warnDay || {}), up: day }; note('important', `⚙ UPKEEP TONIGHT: ${f1(up)} PARTS, YOU HAVE ${Math.floor(S.mat)}`, { log: `Upkeep at midnight is ${f1(up)} parts and you have ${Math.floor(S.mat)}: some buildings will run at half output tomorrow (water, food and medical are paid first).` }); }
}
function rationNeed() { let f = 0; for (const q of S.sv) f += ration(q) / 2; for (const k of S.kids || []) f += .25; return { f, w: f }; }   // a day of rations: half food, half water
function downAlert(s) {
  note('critical', s.name + ' is down', { key: 'down' + (s.id || s.name), icon: '🩸', log: s.name + ' collapsed! Rescue within ' + Math.round(s.bleed / 60) + ' s.', at: () => s.w, live: () => s.mode === 'down' && S.sv.includes(s),
    dyn: () => `${s.name} is down · ${Math.max(0, Math.ceil((s.bleed || 0) / 60))} s left · ` + (s.rescuer ? (s.rescuer.carrying === s ? `${s.rescuer.name} is bringing them in` : `${s.rescuer.name} is on the way`) : 'no rescuer yet'),
    acts: [{ label: () => 'Bandage ⚙' + BANDAGE_COST, ok: () => S.mat >= BANDAGE_COST, fn: () => useBandage(s) }] });
}
function raidAlert(n) {
  const alive = () => S.z.filter((z) => z.human && z.hp > 0 && !z.escaped);
  note('critical', `${n} raiders sneaking in`, { key: 'raid', icon: '🏴', log: `${n} raiders are sneaking toward the Haven. They'll steal supplies and fight anyone in the way.`, at: () => { const r = alive()[0]; return r ? r.w : null; }, live: () => alive().length > 0, dyn: () => { const k = alive().length; return `${k} raider${k > 1 ? 's' : ''} in the area · they steal supplies`; } });
}
/* wall breach: one alert per broken piece until it is repaired; "Repair first" queues it ahead of other damage (still needs parts and no zombie
 * within reach, the normal repair rules); "Send defender" sends the best free fighter at the closest zombie */
let repairFirst = null;
const wallHot = (wl) => S.z.some((z) => z.hp > 0 && dist(z.w, { x: wl.x + .5, y: wl.y + .5 }) < 2.6);
function bestDefender(c) {
  let best = null, bs = -1e9; for (const q of S.sv) { if (q.hp <= q.max * .4 || q.carrying || ['down', 'away', 'hospital', 'rescueTo', 'rescueCarry', 'chase', 'attack'].includes(q.mode)) continue;
    const sc = (professions[q.job]?.combat || 0) * 4 + (weaponOf(q).atk || 0) * .3 - dist(q.w, c); if (sc > bs) { bs = sc; best = q; } }
  return best;
}
function sendDefender(c) { const q = bestDefender(c); let z = null, d = 6; for (const o of S.z) if (o.hp > 0 && dist(o.w, c) < d) { d = dist(o.w, c); z = o; } if (!q || !z) return false; engage(q, z); q.why = 'Defending the breach'; say(`${q.name} is heading to the breach.`); return true; }
function breachAlert(wl) {
  const gate = wl.type === 'gate', nm = gate ? 'Gate' : 'Wall', c = { x: wl.x + .5, y: wl.y + .5 }, near = () => S.z.filter((z) => z.hp > 0 && !z.human && dist(z.w, c) < 6).length;
  note('critical', `${nm} breached`, { key: 'breach' + wl.x + ',' + wl.y, icon: '🧱', at: c, threats: true, log: `${gate ? 'The gate' : 'A wall section'} broke! Zombies can walk through until it is repaired (automatic, costs parts).`,
    live: () => wl.broken && world.walls.get(Wd.key(wl.x, wl.y)) === wl,
    dyn: () => { const n = near(); return `${nm} breached · ${n ? n + ' zombie' + (n > 1 ? 's' : '') + ' near' : 'no zombies near'} · ` + (S.mat < 1 ? 'no parts to repair' : wallHot(wl) ? 'repair waiting' : 'repairing'); },
    acts: [{ label: 'Repair first', ok: () => S.mat >= 1 && repairFirst !== wl, fn: () => { repairFirst = wl; say('The repair crew will fix this breach first (once no zombie is close).'); } },
      { label: 'Send defender', ok: () => near() > 0 && !!bestDefender(c), fn: () => sendDefender(c) }] });
}
function restoreAlerts() {   // alerts are not saved: re-raise the ones whose emergency is still going on after a load
  const was = OPTS.autoSlow; OPTS.autoSlow = false; for (const q of S.sv) if (q.mode === 'down') downAlert(q); for (const wl of world.walls.values()) if (wl.broken) breachAlert(wl);
  for (const b of world.buildings) if (b.fire) note('critical', `Fire at the ${DEFS[b.type].name}`, { key: 'fire' + b.x + ',' + b.y, icon: '🔥', at: { x: b.x + b.w / 2, y: b.y + b.h / 2 }, live: () => !!b.fire && world.buildings.includes(b) }); OPTS.autoSlow = was;
}
function drawAlertMarks() {   // pulsing ring on the spot, red rings on nearby threats, an arrow at the screen edge when the spot is off screen
  const t = performance.now() / 1000;
  for (const a of alerts.values()) {
    if (a.dismissed) continue; const w = atOf(a); if (!w) continue; const p = project(w.x, w.y), tw = TWs(), pulse = .5 + .5 * Math.sin(t * 2.5);   /* V2.35: slow, soft pulse */
    if (a.threats) for (const z of S.z) if (z.hp > 0 && dist(z.w, w) < 5) { const q = project(z.w.x, z.w.y); ctx.save(); ctx.strokeStyle = 'rgba(255,70,60,.85)'; ctx.lineWidth = 2; ctx.beginPath(); ctx.ellipse(q.x, q.y, .22 * tw, .11 * tw, 0, 0, 7); ctx.stroke(); ctx.restore(); }
    const on = p.x > 20 && p.x < VW - 20 && p.y > 20 && p.y < VH - 20;
    if (on) { ctx.save(); ctx.strokeStyle = `rgba(255,120,70,${.6 + .25 * pulse})`; ctx.lineWidth = 2.5; ctx.beginPath(); ctx.ellipse(p.x, p.y, (.4 + .06 * pulse) * tw, (.2 + .03 * pulse) * tw, 0, 0, 7); ctx.stroke(); ctx.restore(); continue; }
    const cx = VW / 2, cy = VH / 2, dx = p.x - cx, dy = p.y - cy, k = Math.min((VW / 2 - 30) / Math.abs(dx || 1e-6), (VH / 2 - 70) / Math.abs(dy || 1e-6)), ex = cx + dx * k, ey = cy + dy * k, ang = Math.atan2(dy, dx);
    ctx.save(); ctx.translate(ex, ey); ctx.globalAlpha = .9; ctx.fillStyle = '#d8352b'; ctx.strokeStyle = '#fff3d6'; ctx.lineWidth = 2;
    ctx.beginPath(); ctx.arc(0, 0, 17, 0, 7); ctx.fill(); ctx.stroke(); ctx.rotate(ang); ctx.beginPath(); ctx.moveTo(25, 0); ctx.lineTo(15, -7); ctx.lineTo(15, 7); ctx.closePath(); ctx.fillStyle = '#fff3d6'; ctx.fill(); ctx.restore();
    stampText(a.icon, ex, ey + 7, '17px sans-serif', '#fff');
  }
}
function bOf(type) { return world.buildings.filter((b) => b.type === type); }

/* ---------------- movement & path following (A* on the tile grid; recompute only when needed) ---------------- */
function stepToward(o, p, sp) {
  const dx = p.x - o.w.x, dy = p.y - o.w.y, d = Math.hypot(dx, dy); o.moving = d > 0.02;
  if (d <= sp) { o.w.x = p.x; o.w.y = p.y; return true; }
  o.w.x += dx / d * sp; o.w.y += dy / d * sp; return false;
}
// returns 'arrived' | 'moving' | 'fail'.  goal = live world point.
function followPath(o, goal, sp) {
  if (o.job !== undefined) sp *= Math.max(.8, sMod(o, 'agi', .02)) * (hasSkill(o, 'lightFeet') ? 1.15 : 1) * (o.carrying ? (hasSkill(o, 'steadyHands') ? 1.3 : 1) * (hasSkill(o, 'strongBack') ? 1.2 : 1) : 1);   /* survivor skills */
  const gt = tileOf(goal), gk = gt.x + ',' + gt.y;
  if (!o.path || o.pathGoal !== gk + (o.wallCost ? '#w' : '') || o.pathVer !== world.ver) {
    const p = Wd.findPath(world, tileOf(o.w), gt, o.job === undefined && !o.human, o.wallCost || 0); o.pathGoal = gk + (o.wallCost ? '#w' : ''); o.pathVer = world.ver;
    if (!p) { o.path = null; return 'fail'; }
    o.path = p.map((q) => tc(q.x, q.y)); o.stuck = 0; o.lastD = 1e9;
    const fb = o.job !== undefined || o.human ? Wd.buildingAt(world, Math.floor(o.w.x), Math.floor(o.w.y)) : null;   /* V2.34: leaving a building = step out through its entrance tile first (the path starts AFTER that tile, so people cut across the footprint) */
    if (fb) { const at = Wd.approachTile(fb); if (!p.length || p[0].x !== at.x || p[0].y !== at.y) o.path.unshift(tc(at.x, at.y)); }
  }
  if (o.path.length > 0 && o.path.length === 1) { /* last leg handled below */ }
  const target = o.path.length ? o.path[0] : goal;
  const before = { x: o.w.x, y: o.w.y };
  if (stepToward(o, o.path.length > 1 ? o.path[0] : (o.path.length === 1 ? o.path[0] : goal), sp)) {
    if (o.path.length) { o.path.shift(); if (!o.path.length) { /* now on the goal tile centre: finish to exact point */ } }
    else { o.path = null; o.pathGoal = null; return 'arrived'; }
  }
  if (!o.path || !o.path.length) { // final leg: exact goal point (live, so chasing moving targets works)
    if (o.job === undefined && !o.human && !Wd.walkable(world, Math.floor(goal.x), Math.floor(goal.y), true)) { o.path = null; o.pathGoal = null; return 'fail'; }   // zombies never step into a wall tile, even for a survivor standing in the gate
    if (o.path && !o.path.length) { if (stepToward(o, goal, sp)) { o.path = null; o.pathGoal = null; return 'arrived'; } }
  }
  const moved = Math.hypot(o.w.x - before.x, o.w.y - before.y);
  o.stuck = moved < sp * .25 ? (o.stuck || 0) + 1 : 0;
  if (o.stuck > 90) { o.path = null; o.pathGoal = null; o.stuck = 0; return 'fail'; }
  return 'moving';
}
function moveSlide(o, t, sp) {                // free movement that cannot enter buildings or walls (zombie roaming)
  const walk = (x, y) => Wd.walkable(world, x, y, true);
  const dx = t.x - o.w.x, dy = t.y - o.w.y, d = Math.hypot(dx, dy); o.moving = d > .02; if (d <= sp) { if (walk(Math.floor(t.x), Math.floor(t.y))) { o.w.x = t.x; o.w.y = t.y; } return true; }
  const nx = o.w.x + dx / d * sp, ny = o.w.y + dy / d * sp;
  if (walk(Math.floor(nx), Math.floor(ny))) { o.w.x = nx; o.w.y = ny; }
  else if (walk(Math.floor(nx), Math.floor(o.w.y))) o.w.x = nx;
  else if (walk(Math.floor(o.w.x), Math.floor(ny))) o.w.y = ny; else return true;
  return false;
}

/* ---------------- survivors ---------------- */
function mk(name, job, l, x, y, i) {
  const o = mk0(name, job, l, x, y, i); o.st = rollStats(job, l); o.eq = { weapon: 'pipe', armor: null, acc: null }; o.tp = {}; o.cls = { [job]: { l, xp: 0 } }; o.skills = []; learnSkills(o, true); o.trait = TRAIT_KEYS[Math.floor(rnd() * TRAIT_KEYS.length)]; o.max = baseMax(o); o.hp = o.max; return o;
}
function mk0(name, job, l, x, y, i) {
  return { id: ++S.seq, name, job, l, mastery: 0, w: tc(x, y), hp: 58 + l * 8, max: 58 + l * 8, post: null, mode: 'free', target: null, cool: 20 + i * 23, stateTicks: 30 + i * 11, sat: 8 + i * 3, resident: false, i, phase: i * 37, dest: null, moving: false, hunger: 15 + i * 8, thirst: 10 + i * 6, fatigue: 8 + i * 5, activity: null, facility: null, rescuer: null, rescuing: null, carrying: null, lastFacility: null, why: 'Settling in', purpose: null, idleBubble: '' };
}
const medSite = () => bOf('hospital')[0] || bOf('clinic')[0] || bOf('medic')[0] || null;
function sitePoint() { const b = medSite(); return b ? Wd.doorPoint(b) : tc(3, 10); }
const downedUnassigned = () => S.sv.filter((q) => { if (q.mode !== 'down') return false; const r = q.rescuer; if (r && (r.rescuing !== q || r.hp <= 0 || !['rescueTo', 'rescueCarry'].includes(r.mode))) { if (r.rescuing === q) r.rescuing = null; q.rescuer = null; } return !q.rescuer; });   // a rescuer who got distracted releases the casualty
function facilityUsers(b) { return S.sv.filter((s) => s.facility === b && ['goFacility', 'useFacility'].includes(s.mode)).length; }   // reservation: heading there counts
const cap = (b) => (DEFS[b.type] ? DEFS[b.type].cap : 1);
function settlePause(s, min = 150, max = 330) { s.mode = 'wait'; s.dest = null; s.path = null; s.moving = false; s.stateTicks = min + rnd() * (max - min); s.idleBubble = ['💭', '👀', '🙂', '💬'][Math.floor(rnd() * 4)]; if (!s.why.startsWith('Idle')) s.why = 'Idle · taking a breather'; }
function enterFree(s, d = 110) { s.sleeping = false; s.mode = 'free'; s.target = null; s.activity = null; s.stateTicks = d; s.dest = null; s.path = null; s.moving = false; s.purpose = null; }
function enterPost(s) { s.mode = 'postCombat'; s.target = null; s.stateTicks = 135 + s.i * 24; s.moving = false; s.path = null; s.why = 'Catching breath after a fight'; }
function needScore(s, b) {
  const r = facilityRules[b.type]; if (!r || b.fire || b.burnt) return -999; let sc = 0;
  if (r.need === 'hunger') sc += s.hunger * 1.4; if (r.need === 'thirst') sc += s.thirst * 1.5; if (r.need === 'fatigue') sc += s.fatigue * 1.2 + (isNight() && s.fatigue > 15 ? 45 : 0);   /* V2.36: nights are for sleeping */
  if (r.need === 'injury') sc += (1 - s.hp / s.max) * 140 * (policy() === 'recover' ? 1.5 : 1);
  if (r.need === 'gear') sc += gearUpgrade(s) ? 75 : 0;
  if (r.need === 'train') {   /* V2.14: free time goes into self-improvement, favouring the stats their job uses */
    const base = (s.st && s.st[r.stat]) || 5; if (base >= STAT_CAP) return -999;
    sc += 22 + (STAT_CAP - base) * .9 + ((JOB_STATS[s.job] || []).includes(r.stat) ? 12 : 0) - Math.max(s.hunger, s.thirst, s.fatigue) * .35 - (isNight() ? 20 : 0);
  }
  if ((r.need === 'hunger' && S.food < 1) || (r.need === 'thirst' && S.water < 1)) sc -= 90;
  sc += b.a * .35 + b.q * .45; if (s.lastFacility === b) sc -= 30;
  sc -= dist(s.w, Wd.doorPoint(b)) * 1.2;       // nearer is better
  return sc;
}
function chooseFacility(s, urgentOnly = false) {
  const c = world.buildings.filter((b) => facilityRules[b.type] && facilityUsers(b) < cap(b) && (!urgentOnly || URGENT_NEEDS.includes(facilityRules[b.type].need))); if (!c.length) return null;
  c.sort((a, b) => needScore(s, b) - needScore(s, a)); return needScore(s, c[0]) > 24 ? c[0] : null;
}
/* V2.36 task commitment: staffed survivors keep a shift (7-12, 13-18) and only leave it for something urgent; free time is lunch, evening and night */
/* V2.37 town policies: a settlement-wide priority that shifts the AI's weights (it never gives orders to individuals) */
const POLICIES = {
  balanced: { name: 'Balanced', icon: '⚖', desc: 'The default: work shifts 7–12 and 13–18, fighters defend what comes close, fall back at your retreat setting.' },
  defend: { name: 'Defend the Town', icon: '🛡', desc: 'Fighters engage from 40% farther, guards patrol more, fighting workers leave their post to defend; fighters hold on a little longer. Production dips while they fight.' },
  produce: { name: 'Prioritise Production', icon: '⚙', desc: 'Second shift runs to 19:00 and workers put up with more hunger and fatigue before a break; fighters only engage nearby threats.' },
  recover: { name: 'Recover & Heal', icon: '✚', desc: 'Fighters fall back 15% sooner, the hurt go for treatment earlier, the second shift ends at 16:00 so people rest more.' },
};
const policy = () => POLICIES[S.policy] ? S.policy : 'balanced';
const retreatPct = () => (S.retreat ?? 35) + (policy() === 'recover' ? 15 : policy() === 'defend' ? -5 : 0);
function setPolicy(k) { if (!POLICIES[k]) return; S.policy = k; note('important', `${POLICIES[k].icon} POLICY: ${POLICIES[k].name.toUpperCase()}`, { log: `Town policy set to ${POLICIES[k].name}: ${POLICIES[k].desc}` }); saveGame(); }
const URGENT_NEEDS = ['hunger', 'thirst', 'fatigue', 'injury'];
const SHIFT = [[7, 12], [13, 18]];
const shifts = () => policy() === 'produce' ? [[7, 12], [13, 19]] : policy() === 'recover' ? [[7, 12], [13, 16]] : SHIFT;
const onShift = (s) => !!(s.post && s.post.staff === s && world.buildings.includes(s.post) && !s.post.burnt && shifts().some(([a, b]) => S.hour >= a && S.hour < b));
function urgentNeed(s, leave = false) {   // what is bad enough to stop working for (a higher bar to walk off the job than to delay going back)
  const k = (leave ? 1.2 : 1) * (policy() === 'produce' ? 1.15 : policy() === 'recover' ? .85 : 1) * (hasT(s, 'diligent') ? 1.1 : 1); if (s.hunger >= 62 * k && S.food >= 1) return 'Hungry'; if (s.thirst >= 62 * k && S.water >= 1) return 'Thirsty'; if (s.fatigue >= 80 * k) return 'Exhausted'; if (s.hp < s.max * (leave ? .5 : .6) && medSite()) return 'Hurt'; return null;
}
function shiftLeft() { const sh = shifts().find(([a, b]) => S.hour >= a && S.hour < b); return sh ? Math.max(200, (sh[1] - S.hour) * 1000 - (tick % 1000)) : 0; }
const NEEDTXT = { hunger: 'Hungry', thirst: 'Thirsty', fatigue: 'Tired', injury: 'Hurt', gear: 'Wants better gear', train: 'Training' };
function chooseTownAction(s) { const b = chooseFacility(s); if (b && b !== s.lastFacility) { s.facility = b; s.mode = 'goFacility'; s.stateTicks = 9999; s.dest = null; s.path = null; s.why = `${NEEDTXT[facilityRules[b.type].need]} → ${DEFS[b.type].name}`; return true; } return false; }
// A zombie that is attacking this survivor (or about to) interrupts whatever they were doing — eating, drinking, working, strolling.
function threatOf(s) {
  let best = null, bd = 1e9; for (const z of S.z) { if (z.hp <= 0 || z.mode === 'appear') continue; const d = dist(s.w, z.w), atkMe = z.target === s && ['zchase', 'zattack', 'zrecover'].includes(z.mode); if (s.fleeT > 0 ? (atkMe && d < 1.3) : ((atkMe && d < 3.2) || d < 1.7)) { if (d < bd) { bd = d; best = z; } } }
  return best;
}
function engage(s, z) { s.facility = null; s.activity = null; s.dest = null; s.path = null; s.purpose = null; s.target = z; s.mode = 'chase'; s.stateTicks = 9999; s.moving = false; s.why = `Fighting a ${zombieTypes[z.type].name}`; }
function nearestZombie(s) { let best = null, bd = 1e9; for (const z of S.z) if (z.hp > 0) { const d = dist(s.w, z.w); if (d < bd) { bd = d; best = z; } } return best; }
function acquireEnemy(s) {   // V2.12: only fighters go looking for a fight; they defend others first and gang up on the same zombie
  if (s.fleeT > 0 || !isFighter(s)) return false;
  const cfg = jobAI[s.job] || jobAI.Civilian, rng = (S.alert > 0 && (s.job === 'Guard' || s.job === 'Police Officer') ? 9 : cfg.aggro) * (policy() === 'defend' ? 1.4 : policy() === 'produce' ? .8 : 1) * traitRange(s) * (atPost(s) ? 1.25 : 1);
  let best = null, bs = 1e9;
  for (const z of S.z) {
    if (z.hp <= 0 || z.mode === 'appear') continue; const d = dist(s.w, z.w);
    const onPerson = z.target && z.target !== s && z.target.job !== undefined && ['zchase', 'zattack', 'zrecover'].includes(z.mode);
    const sneaking = z.human && z.mode === 'rsneak' && !z.carried && !(S.alert > 0);
    if (sneaking && d > 2.5 + (stat(s, 'per') - 5) * .15 + traitSpot(s) + (atPost(s) ? 1.5 : 0)) continue;   /* raiders sneaking in are hard to spot */
    if (d > rng && !(onPerson && d <= rng + 3)) continue;
    if (s.hp < s.max * (hasT(s, 'brave') ? .5 : hasT(s, 'cautious') ? .75 : .6) && !onPerson) continue;   /* hurt fighters only step in to defend someone (V2.43: Brave sooner, Cautious later) */
    const allies = S.sv.filter((q) => q !== s && q.target === z && ['chase', 'attack', 'recover'].includes(q.mode)).length;
    const sc = d - (onPerson ? 3 : 0) - Math.min(2, allies) * 1.2 + z.hp / 60;
    if (sc < bs) { bs = sc; best = z; }
  }
  if (!best) return false; s.target = best; s.mode = 'chase'; s.stateTicks = 9999; s.path = null; s.facility = null; s.activity = null;
  s.why = best.target && best.target !== s && best.target.name ? `Defending ${best.target.name} from a ${zombieTypes[best.type].name}` : `Fighting a ${zombieTypes[best.type].name}`; return true;
}
const ENCLOSED = (b) => !OPEN_AIR.has(b.type) && DEFS[b.type];
function startHide(s, z) {   // non-fighters run for the nearest enclosed building (inside = safe); cornered = fight back
  let best = null, bs = 1e9;
  for (const b of world.buildings) { if (!ENCLOSED(b)) continue; const dp = Wd.doorPoint(b), sc = dist(s.w, dp) - .6 * dist(z.w, dp); if (sc < bs) { bs = sc; best = b; } }
  const d = dist(s.w, z.w), cornered = d < .7 && z.target === s && ['zattack', 'zrecover'].includes(z.mode) && (!best || dist(s.w, Wd.doorPoint(best)) > 2.5);
  if (!best || cornered) { engage(s, z); s.why = `Cornered by a ${zombieTypes[z.type].name}`; return; }
  s.facility = null; s.activity = null; s.dest = null; s.path = null; s.purpose = null; s.target = null;
  s.mode = 'hide'; s.hideAt = best; s.stateTicks = 9999; s.why = `Hiding from a ${zombieTypes[z.type].name} → ${DEFS[best.type].name}`;
}
const zombieNear = (p, r) => S.z.some((z) => z.hp > 0 && z.mode !== 'appear' && dist(z.w, p) < r);
function militia() {   /* V2.37: no able fighter left and zombies inside the town → healthy civilians band together (3+) on the weakest zombie */
  if (S.sv.some((q) => isFighter(q) && q.hp >= q.max * .5 && !['down', 'away', 'hospital'].includes(q.mode))) return false;
  if (S.sv.some((q) => ['chase', 'attack', 'recover'].includes(q.mode))) return false;
  const inside = S.z.filter((z) => z.hp > 0 && z.type !== 'boss' && Wd.inTown(Math.floor(z.w.x), Math.floor(z.w.y))); if (!inside.length) return false;
  const able = S.sv.filter((q) => q.hp >= q.max * (hasT(q, 'brave') ? .4 : .6) && !q.rescuing && !q.carrying && !['down', 'away', 'hospital', 'rescueTo', 'rescueCarry'].includes(q.mode)); if (able.length < 3) return false;
  const t = inside.sort((a, b) => a.hp - b.hp)[0];
  able.slice(0, Math.min(able.length, 3 + inside.length)).forEach((q) => { q.fleeT = 0; q.hideAt = null; engage(q, t); q.why = `Militia: banding together against a ${zombieTypes[t.type].name}`; });
  note('important', '✊ MILITIA: SURVIVORS BAND TOGETHER'); return true;
}
function rally() {   /* V2.37: someone is down and nobody is fighting → fighters with at least half their health come out together and clear the zombies around the downed */
  const downs = S.sv.filter((q) => q.mode === 'down'); if (!downs.length || S.sv.some((q) => ['chase', 'attack', 'recover'].includes(q.mode))) return false;
  const near = S.z.filter((z) => z.hp > 0 && downs.some((q) => dist(z.w, q.w) < 3)); if (!near.length) return false;
  const able = S.sv.filter((q) => isFighter(q) && q.hp >= q.max * .5 && !q.rescuing && !q.carrying && !['down', 'away', 'hospital', 'rescueTo', 'rescueCarry'].includes(q.mode));
  if (able.length < Math.min(2, near.length)) return false;
  able.sort((a, b) => b.hp - a.hp).slice(0, Math.max(2, near.length)).forEach((q, i) => { q.fleeT = 0; q.hideAt = null; engage(q, near[i % near.length]); q.why = `Rallying to cover ${downs[0].name}`; });
  note('important', `⚔ RALLY: FIGHTERS MOVE TO COVER ${downs[0].name.toUpperCase()}`); return true;
}
function assignRescue() {   /* V2.37: anyone not already in an emergency can be called (eating, resting, sleeping, walking, working); a fighter only if no zombie is within reach of them;
   nobody but a fighter walks into a crowd of zombies around the downed survivor */
  const downs = downedUnassigned(); if (!downs.length) return false;
  const OK = ['free', 'postCombat', 'wait', 'work', 'goWork', 'goFacility', 'useFacility', 'walk'];
  const free = S.sv.filter((r) => r.hp > r.max * .3 && !r.rescuing && !r.carrying && (OK.includes(r.mode) && !(r.mode === 'useFacility' && r.facility && facilityRules[r.facility.type] && facilityRules[r.facility.type].need === 'injury')
    || (['chase', 'attack', 'recover'].includes(r.mode) && !S.z.some((z) => z.hp > 0 && dist(z.w, r.w) < 2.2)))); if (!free.length) return false;
  let best = null, bs = -1e9;
  for (const q of downs) { const crowd = S.z.filter((z) => z.hp > 0 && dist(z.w, q.w) < 2.5).length, urgency = 3000 / Math.max(300, q.bleed || 1);
    for (const r of free) { if (crowd >= (hasT(r, 'caring') ? 3 : 2) && !isFighter(r)) continue;   /* non-fighters don't walk into a crowd (Caring: up to two zombies) */ const sc = (jobAI[r.job] || jobAI.Civilian).rescue * 3 + (hasT(r, 'caring') ? 8 : 0) - dist(r.w, q.w) + urgency - (r.mode === 'useFacility' ? 4 : 0) - (['chase', 'attack', 'recover'].includes(r.mode) ? 3 : 0); if (sc > bs) { bs = sc; best = { r, q }; } } }
  if (!best) return false;
  if (best.r.mode === 'useFacility') { best.r.sleeping = false; best.r.activity = null; }
  best.q.rescuer = best.r; best.r.rescuing = best.q; best.r.target = null; best.r.facility = null; best.r.dest = null; best.r.path = null; best.r.mode = 'rescueTo'; best.r.why = `Rescuing ${best.q.name}${hasT(best.r, 'caring') ? ' (Caring)' : ''}`; note('routine', `${best.r.name} is rescuing ${best.q.name}.`); return true;
}
/* ---------------- V2.45 guard posts: sandbagged spots the player places. The holder stands watch there (engages from 25% farther, spots raiders
   sooner, takes 20% less damage behind the sandbags) and zombies within 4 tiles go for the holder first. Fighters without a post patrol between posts. ---------------- */
const POST_COST = 3, POST_R = 4, POST_SCHED = { night: { name: 'Night watch', icon: '🌙', on: () => isNight() }, day: { name: 'Day watch', icon: '☀️', on: () => !isNight() }, all: { name: 'Day and night', icon: '⏰', on: () => true } };
const postMax = () => 1 + (S.rank || 1);
const postPt = (p) => ({ x: p.x + .5, y: p.y + .5 });
const postAt = (x, y) => (S.posts || []).find((p) => p.x === x && p.y === y) || null;
const postName = (p) => { const c = townCentre(), dx = p.x + .5 - c.x, dy = p.y + .5 - c.y, sx = dx - dy, sy = dx + dy; return (Math.abs(sx) > Math.abs(sy) * 1.5 ? (sx > 0 ? 'east' : 'west') : Math.abs(sy) > Math.abs(sx) * 1.5 ? (sy > 0 ? 'south' : 'north') : (sy > 0 ? 'south' : 'north') + (sx > 0 ? '-east' : '-west')) + ' post'; };   /* screen directions */
const canHold = (q) => q && q.hp > 0 && isFighter(q) && !['down', 'hospital', 'away'].includes(q.mode) && S.sv.includes(q);
function postsAssign() {   /* manual holders first; 'auto' (and a manual post whose holder is away) gets the best free fighter: Guards and Police first, then the healthiest */
  const P = S.posts || [], used = new Set();
  for (const p of P) { const q = typeof p.holder === 'number' ? S.sv.find((x) => x.id === p.holder) : null; p.cur = canHold(q) ? q.id : null; if (p.cur) used.add(p.cur); }
  const pool = S.sv.filter((q) => canHold(q) && !used.has(q.id) && !q.post).sort((a, b) => (['Guard', 'Police Officer', 'SWAT'].includes(b.job) - ['Guard', 'Police Officer', 'SWAT'].includes(a.job)) || (b.l - a.l) || (b.hp - a.hp));
  for (const p of P) if (!p.cur && p.holder !== null && pool.length) { const q = pool.shift(); p.cur = q.id; used.add(q.id); }
}
const myPost = (s) => (S.posts || []).find((p) => p.cur === s.id) || null;
const postActive = (p) => !!p && (POST_SCHED[p.sched] || POST_SCHED.night).on();
const atPost = (s) => { const p = myPost(s); return p && postActive(p) && dist(s.w, postPt(p)) < .8 ? p : null; };
function postLure(z) {   /* a manned post draws zombies within POST_R to its holder */
  let best = null, bd = POST_R; for (const p of S.posts || []) { if (!p.cur) continue; const h = S.sv.find((q) => q.id === p.cur); if (!h || !atPost(h)) continue; const d = dist(z.w, postPt(p)); if (d < bd) { bd = d; best = h; } }
  return best;
}
function tryPost(x, y) {
  S.posts = S.posts || []; const ex = postAt(x, y);
  if (ex) { showPost(ex); return { ok: false, why: 'open' }; }
  if (!Wd.inWallZone(x, y) && !(x >= Wd.BUILD.x0 && x <= Wd.BUILD.x1 && y >= Wd.BUILD.y0 && y <= Wd.BUILD.y1)) { say('Guard posts go in or around the town, inside the glowing area.'); return { ok: false, why: 'zone' }; }
  if (Wd.buildingAt(world, x, y)) { say('A building is in the way.'); return { ok: false, why: 'building' }; }
  if (Wd.wallAt(world, x, y)) { say('A wall is in the way: put the post just inside it.'); return { ok: false, why: 'wall' }; }
  if (S.posts.length >= postMax()) { say(`At most ${postMax()} guard posts at this rank.`); return { ok: false, why: 'max' }; }
  if (S.posts.length && S.posts.some((p) => Math.abs(p.x - x) + Math.abs(p.y - y) < 3)) { say('Too close to another post: spread them out.'); return { ok: false, why: 'close' }; }
  if (S.mat < POST_COST) { say(`A guard post costs ${POST_COST} parts.`); return { ok: false, why: 'parts' }; }
  S.mat -= POST_COST; flow('mat', 'Guard posts', -POST_COST); const p = { x, y, holder: 'auto', sched: 'night', cur: null }; S.posts.push(p); postsAssign(); SFX('build');
  const h = p.cur && S.sv.find((q) => q.id === p.cur); say(`Guard post placed (night watch)${h ? ': ' + h.name + ' will hold it' : ': no free fighter yet'}. Tap it to set who and when.`, true); updatePostBar(); saveGame(); return { ok: true, post: p };
}
function removePost(p) { S.posts = (S.posts || []).filter((q) => q !== p); S.mat += 1; for (const q of S.sv) if (q.purpose === 'post' || q.purpose === 'post-hold') { if (!myPost(q)) { q.purpose = null; if (q.mode === 'wait') q.stateTicks = 0; } } postsAssign(); saveGame(); }
function updatePostBar() { if (sel && sel.kind === 'post') $('confirmName').textContent = `GUARD POST · ⚙${POST_COST} · ${(S.posts || []).length}/${postMax()} placed · tap a tile to place, tap a post to set it up`; }
function showPost(p) {
  endBuildMode(true); closeP(); postsAssign(); const h = p.cur && S.sv.find((q) => q.id === p.cur), manual = typeof p.holder === 'number' ? S.sv.find((q) => q.id === p.holder) : null;
  const fighters = S.sv.filter((q) => isFighter(q)), sc = POST_SCHED[p.sched] || POST_SCHED.night;
  const opt = (v, label, sub, on) => `<div class="card" data-ph="${v}" style="${on ? 'border-color:var(--good)' : ''}"><div class="sp">${label}<div class="sm">${sub}</div></div>${on ? '<b style="color:var(--good)">✔</b>' : ''}</div>`;
  $('ib').innerHTML = `<div class="card"><b>🛡 ${postName(p)[0].toUpperCase() + postName(p).slice(1)}</b> <span class="sm">${sc.icon} ${sc.name} · ${postActive(p) ? 'on watch now' : 'off watch now'}</span>
    <div class="sm">${h ? `Held by <b>${esc(h.name)}</b> ${traitIcon(h)}${atPost(h) ? ' (at the post)' : postActive(p) ? ' (on the way or taking a break)' : ' (off watch: free time)'}` : 'Nobody holds it right now'}${manual && !canHold(manual) ? ` · ${esc(manual.name)} is away or hurt, so auto fills in` : ''}</div>
    <div class="sm">The holder engages from 25% farther, spots raiders sooner and takes 20% less damage behind the sandbags. Zombies within ${POST_R} tiles go for the holder first. Fighters without a post patrol between posts.</div></div>
    <div class="sm">When</div><div class="tabs" style="position:static">${Object.entries(POST_SCHED).map(([k, v]) => `<button data-ps="${k}" class="${p.sched === k ? 'on' : ''}">${v.icon} ${v.name}</button>`).join('')}</div>
    <div class="sm">${p.sched === 'all' ? 'Day and night: the holder only leaves when exhausted, hungry or hurt, so they tire fast.' : p.sched === 'day' ? 'Day watch protects the workers. At night the holder sleeps.' : 'Night watch guards the town while it sleeps. By day the holder is free.'}</div>
    <div class="sm">Who</div><div class="lst">${opt('auto', 'Auto', 'The best free fighter (Guards and Police first)', p.holder === 'auto')}${fighters.map((q) => opt(q.id, `${esc(q.name)} ${traitIcon(q)} <span class="sm">${q.job} Lv.${q.l}</span>`, canHold(q) ? `HP ${Math.ceil(q.hp)}/${q.max}${q.post ? ' · leaves the ' + DEFS[q.post.type].name + ' while on watch' : ''}${myPost(q) && myPost(q) !== p ? ' · now holds the ' + postName(myPost(q)) : ''}` : 'away or hurt', p.holder === q.id)).join('')}${opt('none', 'Nobody', 'Keep it as a patrol point only', p.holder === null)}</div>
    <button class="act danger" id="pRemove" style="width:100%">Remove post (+1 part back)</button>`;
  $('ib').querySelectorAll('[data-ps]').forEach((b) => { b.onclick = () => { p.sched = b.dataset.ps; for (const q of S.sv) if (q.purpose === 'post-hold' && myPost(q) === p) q.stateTicks = 0; saveGame(); showPost(p); }; });
  $('ib').querySelectorAll('[data-ph]').forEach((b) => { b.onclick = () => { const v = b.dataset.ph; if (v === 'auto') p.holder = 'auto'; else if (v === 'none') p.holder = null; else { const id = +v; for (const o of S.posts) if (o !== p && o.holder === id) o.holder = 'auto'; p.holder = id; } postsAssign(); for (const q of S.sv) if (q.purpose === 'post-hold' || q.purpose === 'post') { q.stateTicks = 0; if (q.mode === 'walk') q.mode = 'free'; } saveGame(); showPost(p); }; });
  $('pRemove').onclick = () => { removePost(p); closeP(); say('Guard post removed.'); };
  selected = { kind: 'post', ref: p }; showPanel('Guard Post');
}
function patrolDest() { if ((S.posts || []).length) { const p = S.posts[Math.floor(rnd() * S.posts.length)], a = rnd() * 6.283; return { x: p.x + .5 + Math.cos(a) * .9, y: p.y + .5 + Math.sin(a) * .9 }; } const pts = [...world.roads].map((k) => k.split(',').map(Number)).filter(([x, y]) => y <= 9); const p = pts[Math.floor(rnd() * pts.length)] || [7, 7]; return tc(p[0], p[1]); }
function roamDest() { const here = tileOf(s_dummy), open = [...world.roads].map((k) => k.split(',').map(Number)); const p = open[Math.floor(rnd() * open.length)] || [7, 10]; return tc(p[0], p[1]); }
const s_dummy = { x: 7, y: 10 };
function chooseLifePurpose(s) {
  if (downedUnassigned().length) { assignRescue(); if (s.mode === 'rescueTo') return; }
  const cfg = jobAI[s.job] || jobAI.Civilian;
  if (acquireEnemy(s)) return;   // a zombie in sight comes before any errand
  { const gp = myPost(s); if (gp && postActive(gp)) {   /* V2.45: on watch at a guard post (needs still come first) */
    const u = urgentNeed(s), b = u && chooseFacility(s, true);
    if (b) { s.facility = b; s.mode = 'goFacility'; s.stateTicks = 9999; s.dest = null; s.path = null; s.why = `${u}: a quick break, then back to the ${postName(gp)}`; return; }
    s.dest = postPt(gp); s.mode = 'walk'; s.purpose = 'post'; s.path = null; s.stateTicks = 900; s.why = `Heading to the ${postName(gp)} (${(POST_SCHED[gp.sched] || POST_SCHED.night).name.toLowerCase()})`; return; } }
  if (onShift(s)) {   /* V2.36: on shift → back to work unless something urgent comes first */
    const u = urgentNeed(s), b = u && chooseFacility(s, true);
    if (b) { s.facility = b; s.mode = 'goFacility'; s.stateTicks = 9999; s.dest = null; s.path = null; s.why = `${u}: quick break at the ${DEFS[b.type].name}, then back to work`; s.returnToWork = true; return; }
    s.mode = 'goWork'; s.dest = null; s.path = null; s.stateTicks = 9999; s.why = `Shift at the ${DEFS[s.post.type].name} (until ${shifts().find(([a, z]) => S.hour >= a && S.hour < z)[1]}:00)`; return;
  }
  if (isNight() && s.fatigue > (hasT(s, 'owl') ? 60 : 35)) {   /* V2.43: Night Owls stay up */   /* V2.36: nights are for sleep: a bed if one is free, otherwise sleep rough (half the rest) */
    const bed = world.buildings.find((b) => b.type === 'house' && !b.fire && !b.burnt && facilityUsers(b) < cap(b) && b !== s.lastFacility) || world.buildings.find((b) => b.type === 'house' && !b.fire && !b.burnt && facilityUsers(b) < cap(b));
    if (bed) { s.facility = bed; s.mode = 'goFacility'; s.stateTicks = 9999; s.dest = null; s.path = null; s.why = `Going to bed at the ${DEFS[bed.type].name}`; return; }
    s.mode = 'wait'; s.dest = null; s.path = null; s.moving = false; s.sleeping = 'rough'; s.stateTicks = Math.min(9000, ((S.hour >= 20 ? 30 : 6) - S.hour) * 1000 - (tick % 1000)); s.why = 'Sleeping rough: no free bed (build a House)'; s.idleBubble = '💤'; return;
  }
  if (rnd() < Math.min(.94, .58 * cfg.town) && chooseTownAction(s)) return;
  if (chooseTownAction(s)) return;
  const r = rnd();
  if ((s.job === 'Guard' || s.job === 'Police Officer') && r < (policy() === 'defend' ? .6 : .35)) { s.dest = patrolDest(); s.mode = 'walk'; s.purpose = 'patrol'; s.why = (S.posts || []).length ? 'Patrolling between the guard posts' : 'Patrolling the north road'; s.stateTicks = 700; return; }
  if (s.job === 'Scavenger' && r < .30 && activeZ() <= 3) { s.dest = tc(2 + Math.floor(rnd() * 11), 2 + Math.floor(rnd() * 3)); s.mode = 'walk'; s.purpose = 'scav-out'; s.why = 'Scavenging outside the walls'; s.stateTicks = 900; return; }
  if (r < .66) { settlePause(s); return; }
  s.dest = roamDest(); s.mode = 'walk'; s.purpose = 'roam'; s.why = 'Strolling through town'; s.stateTicks = 600;
}
const activeZ = () => S.z.filter((z) => z.hp > 0 && !z.human).length;
function gearUpgrade(s) {   /* best improvement for any slot: free from the stash first, else buy basic gear at the Armory with parts */
  let best = null, gain = 0;
  for (const slot of SLOTS) {
    const cur = itemScore(itemOf(s, slot)), opts = [];
    for (const id of Object.keys(S.inv || {})) if (ITEMS[id] && ITEMS[id].slot === slot) opts.push({ id, buy: false });
    const reserve = 10 + upkeepTotal() * 2;   /* V2.15: never spend the parts the town needs for upkeep and building */
    for (const id of (ARMORY_STOCK[slot] || [])) if (ITEMS[id].cost + reserve <= S.mat) opts.push({ id, buy: true });
    for (const o of opts) { const sc = itemScore(ITEMS[o.id]) - cur - (o.buy ? ITEMS[o.id].cost * .5 : 0); if (itemScore(ITEMS[o.id]) > cur * 1.12 + 1 && sc > gain) { gain = sc; best = { ...o, slot }; } }
  }
  return best;
}
function finishFacility(s) {
  const b = s.facility; if (!b) { s.activity = null; enterFree(s, 110); return; } const r = facilityRules[b.type]; if (!r) { s.facility = null; enterFree(s, 110); return; }
  s.sat += (r.sat + combos(b).sat) * Math.max(.6, sMod(s, 'cha', .05)); floats.push({ w: { ...s.w }, t: '♥+' + r.sat, col: '#ff9fbd', a: 70 });
  if (r.need === 'hunger') { if (S.food >= .5) s.hunger = Math.max(0, s.hunger - r.benefit * (hasSkill(s, 'fieldRations') ? 1.25 : 1) * (b && isWorking(b) && b.staff.job === 'Cook' ? 1.5 : 1) * (b && isWorking(b) && hasSkill(b.staff, 'headChef') ? 1.3 : 1) * (b && isWorking(b) ? Math.max(.8, sMod(b.staff, 'cha', .03)) : 1) * (1 + combos(b).meal) * (b.unpaid ? .5 : 1)); else floats.push({ w: { ...s.w }, t: 'NO FOOD', col: '#ff8a7a', a: 70 }); }
  if (r.need === 'thirst') { if (S.water >= .5) s.thirst = Math.max(0, s.thirst - r.benefit * (hasSkill(s, 'fieldRations') ? 1.25 : 1)); else floats.push({ w: { ...s.w }, t: 'NO WATER', col: '#ff8a7a', a: 70 }); }
  if (r.need === 'fatigue') s.fatigue = Math.max(0, s.fatigue - r.benefit);
  if (r.need === 'injury') { s.hp = Math.min(s.max, s.hp + r.benefit); }   // no medicine stock: care is limited by the building's tier, beds and the time it takes
  if (b.type === 'armory') { for (let n = 0; n < 2; n++) { const g = gearUpgrade(s); if (!g) break; if (g.buy) { S.mat -= Math.max(1, ITEMS[g.id].cost - (combos(b).arsenal ? 1 : 0)); stashAdd(g.id); } equip(s, g.id); s.sat += 2; note('routine', s.name + (g.buy ? ' bought a ' : ' took a ') + ITEMS[g.id].name + ' at the Armory' + (g.buy ? ' (−' + ITEMS[g.id].cost + ' parts).' : '.'), { at: s.w, float: '🛡 ' + ITEMS[g.id].name.toUpperCase(), col: '#b6f0ff' }); } }
  if (r.need === 'train') {   /* each visit fills a stat's training bar; 100 = +1 permanent point */
    if (b.type === 'library') S.rp = (S.rp || 0) + 1;   /* V2.18: study sessions feed the research effort */
    s.tp = s.tp || {}; s.st = s.st || rollStats(s.job, s.l); const k = r.stat, gainT = r.benefit * (b.q || 10) / 10 * Math.max(.7, sMod(s, 'int', .02)) * (1 + combos(b).train) * (b.unpaid ? .5 : 1);
    s.tp[k] = (s.tp[k] || 0) + gainT; s.fatigue = Math.min(100, s.fatigue + 6);
    while (s.tp[k] >= 100 && s.st[k] < STAT_CAP) { s.tp[k] -= 100; s.st[k]++; S.trainPts = (S.trainPts || 0) + 1; if (k === 'end') setMaxHp(s); note('routine', `${s.name}'s ${STAT_NAME[k]} rose to ${s.st[k]}.`); }
    floats.push({ w: { ...s.w }, t: '+' + STAT_NAME[k].slice(0, 3).toUpperCase(), col: '#b6f0ff', a: 60 });
  }
  gainXp(s, .5);   /* using town buildings teaches a little */
  if (isWorking(b) && b.staff !== s) gainXp(b.staff, r.need === 'injury' ? 3 : 1);   /* the staff member (medic, cook, farmer, engineer) learns from every visitor served */
  if (!s.resident && s.sat >= 35 && !s.requested) { s.requested = true; queueResidentRequest(s); }
  if (s.sleeping) { s.fatigue = 0; s.sleeping = false; }
  s.lastFacility = b; s.facility = null; s.activity = null; s.mode = 'free'; s.stateTicks = onShift(s) ? 8 : 120 + s.i * 28; s.cool = 0; s.why = onShift(s) ? 'Back to work' : 'Feeling better'; ui();
}
function ai(s) {
  if (s.cool > 0) s.cool--; if (s.stateTicks > 0) s.stateTicks--;
  if (tick % 90 === (s.i * 17) % 90 && !['down', 'hospital'].includes(s.mode)) { { const ns = (hasSkill(s, 'ironStomach') ? .8 : 1) * Math.max(.6, 1 - (stat(s, 'end') - 5) * .02); s.hunger = Math.min(100, s.hunger + .3 * ns); s.thirst = Math.min(100, s.thirst + .36 * ns); } /* V2.11.1: ~3.3 hunger / ~4 thirst per game hour (was ~17 / ~20, which pinned everyone at 100) */ s.fatigue = Math.min(100, s.fatigue + (hasT(s, 'diligent') ? 1.2 : 1)); starve(s); }
  if (s.fleeT > 0) s.fleeT--;
  if (hasSkill(s, 'firstAid') && tick % (hasSkill(s, 'miracleWorker') ? 100 : 300) === (s.i * 31) % (hasSkill(s, 'miracleWorker') ? 100 : 300) && s.hp > 0 && s.hp < s.max && !['chase', 'attack', 'recover', 'down'].includes(s.mode)) s.hp = Math.min(s.max, s.hp + 1);
  if (s.hp <= 0 && s.mode !== 'down') { s.hp = 0; s.mode = 'down'; s.target = null; s.dest = null; s.path = null; s.facility = null; s.activity = null; s.moving = false; s.rescuer = null; s.rescuing = null; s.carrying = null; s.why = 'Collapsed — needs rescue'; SFX('down'); s.bleed = bleedMax(); s.warned = false; downAlert(s); return; }
  if (s.mode === 'down') { s.moving = false; bleedTick(s); return; }
  if (['goFacility', 'useFacility', 'goWork', 'work', 'walk', 'wait', 'free', 'goFire', 'fightFire', 'postCombat'].includes(s.mode) && tick % 6 === s.i % 6 && !insideBuilding(s)) { const th = threatOf(s); if (th) { if (isFighter(s)) engage(s, th); else startHide(s, th); return; } }
  if (s.mode === 'hide') {   /* running for cover */
    const b = s.hideAt; if (!b || !world.buildings.includes(b)) { s.hideAt = null; enterFree(s, 30); return; }
    const r = followPath(s, Wd.doorPoint(b), CHASE); if (r === 'arrived') { s.mode = 'hiding'; s.stateTicks = 160; s.path = null; s.why = 'Hiding in ' + DEFS[b.type].name; } else if (r === 'fail') { const th = threatOf(s); s.hideAt = null; if (th) { engage(s, th); s.why = 'Cornered — fighting back'; } else enterFree(s, 40); } return;
  }
  if (s.mode === 'hiding') {   /* inside: hidden and safe; come out once the area is clear */
    s.moving = false; const b = s.hideAt; if (!b || !world.buildings.includes(b)) { s.hideAt = null; enterFree(s, 30); return; }
    if (tick % 90 === (s.i * 13) % 90) {   /* V2.18: sheltering indoors they eat, drink and rest from the town stores, and call for the guards */
      if (S.water >= .05) { S.water -= .005; s.thirst = Math.max(0, s.thirst - .7); } if (S.food >= .05) { S.food -= .005; s.hunger = Math.max(0, s.hunger - .6); } s.fatigue = Math.max(0, s.fatigue - 1.5); if (s.hp < s.max) s.hp = Math.min(s.max, s.hp + 1); S.alert = Math.max(S.alert, 200); }   /* V2.37: sheltering also patches you up slowly */
    if (s.stateTicks <= 0) { if (zombieNear(Wd.doorPoint(b), 3.5)) s.stateTicks = 90; else { s.hideAt = null; enterFree(s, 30); s.why = 'Coming out — area clear'; } } return;
  }   // being attacked beats lunch
  if (s.mode === 'hospital') { s.moving = false; if (s.stateTicks <= 0) { s.hp = Math.round(s.max * (bOf('hospital').length ? 1 : bOf('clinic').length ? .85 : .7)); s.fatigue = Math.max(0, s.fatigue - 35); enterFree(s, 420); s.why = 'Recovered'; note('routine', s.name + ' recovered and returned.'); } return; }
  if (s.mode === 'rescueTo') {
    const q = s.rescuing; if (!q || q.mode !== 'down') { s.rescuing = null; enterPost(s); return; }
    if (tick % 15 === s.i % 15) { const zb = S.z.find((z) => z.hp > 0 && !z.human && dist(z.w, q.w) < 2.2); if (zb && dist(s.w, q.w) < 4 && isFighter(s) && s.hp > s.max * .4) { q.rescuer = null; s.rescuing = null; engage(s, zb); s.why = `Clearing the way to ${q.name}`; return; } }   /* V2.37: clear first, then pick up */
    const r = followPath(s, q.w, .02); if (r === 'arrived') { s.carrying = q; q.w = { x: s.w.x, y: s.w.y }; s.mode = 'rescueCarry'; s.path = null; s.why = `Carrying ${q.name} to ${medSite() ? DEFS[medSite().type].name : 'safety'}`; note('routine', `${s.name} picked up ${q.name}.`); } else if (r === 'fail') { q.rescuer = null; s.rescuing = null; enterPost(s); } return;
  }
  if (s.mode === 'rescueCarry') {
    const q = s.carrying; if (!q) { enterPost(s); return; }
    const r = followPath(s, sitePoint(), CARRY); q.w = { x: s.w.x - .12, y: s.w.y - .05 };
    if (r === 'arrived' || r === 'fail') { q.w = { ...sitePoint() }; addBond(s, q, 8); q.mode = 'hospital'; q.hp = 1; q.bleed = null; q.stateTicks = Math.round(careTicks() * (hasSkill(s, 'steadyHands') || (medSite() && medSite().staff && hasSkill(medSite().staff, 'steadyHands')) ? .7 : 1)); gainXp(s, 4); if (hasSkill(s, 'miracleWorker')) q.stateTicks = Math.round(q.stateTicks * .7); q.rescuer = null; q.why = 'Recovering in care'; SFX('rescued'); q.careTotal = q.stateTicks; q.careAt = medSite(); q.path = null; s.carrying = null; s.rescuing = null; enterPost(s); note('routine', q.name + ' reached ' + (medSite() ? DEFS[medSite().type].name : 'safety') + '.'); } return;
  }
  if (s.mode === 'goFire' || s.mode === 'fightFire') { fireAI(s); return; }
  if (s.mode === 'goWork') {
    if (!s.post || !world.buildings.includes(s.post) || s.post.staff !== s) { s.post = null; enterFree(s, 30); return; }
    if (acquireEnemy(s) && ['Guard', 'Police Officer'].includes(s.job)) return;
    const r = followPath(s, Wd.doorPoint(s.post), WALK * 1.1);
    if (r === 'arrived') { s.mode = 'work'; s.activity = 'Working'; s.stateTicks = shiftLeft() || 600; s.path = null; s.returnToWork = false; s.why = `Working at the ${DEFS[s.post.type].name}` + (shiftLeft() ? ` until ${shifts().find(([a, z]) => S.hour >= a && S.hour < z)[1]}:00` : ''); }
    else if (r === 'fail') { enterFree(s, 120); s.why = "Couldn't reach work — trying later"; } return;
  }
  if (s.mode === 'work') {
    s.moving = false; if (!s.post || !world.buildings.includes(s.post) || s.post.staff !== s) { s.post = null; s.activity = null; enterFree(s, 30); return; }
    if (downedUnassigned().length && tick % 30 === 0) { assignRescue(); if (s.mode === 'rescueTo') { s.activity = null; return; } }
    if (tick % 20 === s.i % 20 && acquireEnemy(s)) { s.activity = null; return; }
    if (tick % 1000 === (s.i * 37) % 1000) gainXp(s, 2);   /* every game hour on shift */
    if (tick % 120 === (s.i * 7) % 120) { const u = urgentNeed(s, true); if (u) { s.activity = null; enterFree(s, 5); s.why = `${u}: taking a break`; return; } }   /* V2.36: only urgent needs end a shift early */
    if (s.stateTicks <= 0 || !onShift(s)) { s.activity = null; gainXp(s, 1); enterFree(s, 20); s.why = 'Shift over'; } return;
  }
  if (s.mode === 'goFacility') {
    if (!s.facility || !world.buildings.includes(s.facility)) { s.facility = null; enterFree(s, 25); return; }
    const r = followPath(s, Wd.doorPoint(s.facility), WALK * 1.15);
    if (r === 'arrived') { const ru = facilityRules[s.facility.type]; s.mode = 'useFacility'; s.activity = ru.label; s.stateTicks = ru.use + (ru.need === 'injury' ? Math.round(900 * (1 - s.hp / s.max)) : 0); s.path = null; s.why = ru.label + ' at ' + DEFS[s.facility.type].name;
      if (ru.need === 'fatigue' && isNight()) { s.sleeping = true; s.activity = 'Sleeping'; s.stateTicks = Math.min(9000, ((S.hour >= 20 ? 30 : 6) - S.hour) * 1000 - (tick % 1000)); s.why = `Sleeping at the ${DEFS[s.facility.type].name} until 6:00`; } }   /* V2.36: a bed for the night = fully rested */
    else if (r === 'fail') { s.facility = null; enterFree(s, 90); s.why = "Couldn't reach it — trying later"; } return;
  }
  if (s.mode === 'useFacility') { s.moving = false; if (!s.facility || !world.buildings.includes(s.facility)) { s.facility = null; s.activity = null; enterFree(s, 40); return; } if (s.stateTicks <= 0) { finishFacility(s); s.stateTicks = 50 + s.i * 9; } return; }
  if (['chase', 'attack', 'recover'].includes(s.mode)) {
    if (!s.target || s.target.hp <= 0) { enterPost(s); return; }
    if (retreatCheck(s)) return;
    if (s.mode === 'chase') { const d = dist(s.w, s.target.w); if (d > weaponRange(weaponOf(s)) - (weaponOf(s).ranged ? .3 : 0)) { const r = followPath(s, s.target.w, CHASE); if (r === 'fail') { s.target = null; enterPost(s); } } else { s.moving = false; s.mode = 'attack'; s.path = null; s.stateTicks = 32 + s.i * 8; } return; }
    if (s.mode === 'attack' && dist(s.w, s.target.w) > weaponRange(weaponOf(s)) + .6) { s.mode = 'chase'; return; }   /* target slipped out of reach: follow, don't swing at air */
    if (s.mode === 'attack') { s.moving = false; if (s.stateTicks <= 0) { const z = s.target, w = weaponOf(s), bonus = (professions[s.job]?.combat || 0) + skillDmg(s), dmg = Math.round((4 + w.atk * .55 + (w.ranged ? stat(s, 'per') : stat(s, 'str')) * .6 + bonus) * (w.ranged && hasSkill(s, 'marksman') ? 1.25 : 1) * friendBoost(s)); z.hp -= dmg; z.hitT = 9; SFX('hit'); floats.push({ w: { ...z.w }, t: '-' + dmg, col: '#ffe06b', a: 55 }); gainXp(s, .5); if (w.ranged) shots.push({ a: { ...s.w }, b: { ...z.w }, t: 6, bow: w.kind === 'bow' });
      if (z.hp <= 0) { S.kills++; SFX('kill'); gainXp(s, 2); raiderDown(z); if (z.type === 'boss') { S.mat += 15; S.bossKills = (S.bossKills || 0) + 1; screenToast('☠ BOSS DEFEATED'); SFX('reward'); } const zd = zombieTypes[z.type] || zombieTypes.walker, pd = PART_DROP[z.type] || PART_DROP.walker; if (rnd() < pd[0]) { S.mat += pd[1]; flow('mat', 'Zombie drops', pd[1]); floats.push({ w: { ...z.w }, t: '+' + pd[1] + ' PARTS', col: '#9fe0ff', a: 70 }); }
        if (z.type === 'boss' || z.human) { renownGain(zd.ren, zd.name + ' defeated'); say(s.name + ' defeated a ' + zd.name + '!'); } else { S.ren += zd.ren; floats.push({ w: { x: z.w.x, y: z.w.y - .3 }, t: '+' + zd.ren + '★', col: '#ffd56b', a: 50 }); ui(); }   /* V2.33: no pop-up or log line for every ordinary zombie */ stageCheck(); enterPost(s); return; }
      s.mode = 'recover'; s.stateTicks = s.recDur = Math.round((48 + s.i * 9) * Math.max(.6, 1 - (stat(s, 'agi') - 5) * .02)); } return; }
    if (s.mode === 'recover') { s.moving = false; if (s.stateTicks <= 0) s.mode = 'chase'; } return;
  }
  if (s.mode === 'postCombat') { s.moving = false; if (downedUnassigned().length) { assignRescue(); if (s.mode === 'rescueTo') return; }
    if (s.hp < s.max * .5 && medSite() && facilityUsers(medSite()) < cap(medSite())) { const m = medSite(); s.facility = m; s.mode = 'goFacility'; s.stateTicks = 9999; s.path = null; s.why = 'Hurt after the fight → ' + DEFS[m.type].name; return; }   /* V2.18: patch up before the next one */ if (s.stateTicks <= 0) enterFree(s, 20); return; }
  if (s.mode === 'wait' && s.purpose === 'post-hold') { s.moving = false; const gp = myPost(s); if (!gp || !postActive(gp)) { s.purpose = null; enterFree(s, 20); return; } if (downedUnassigned().length && tick % 30 === 0) { assignRescue(); if (s.mode === 'rescueTo') return; } if (tick % 15 === s.i % 15 && acquireEnemy(s)) { s.purpose = null; return; } if (s.stateTicks <= 0) { s.purpose = null; s.mode = 'free'; s.stateTicks = 0; } return; }
  if (s.mode === 'wait') { s.moving = false; if (s.stateTicks <= 0) { if (s.sleeping === 'rough') { s.fatigue = Math.max(0, s.fatigue - 50); s.sleeping = false; s.why = 'Woke up stiff (slept rough)'; } s.mode = 'free'; s.stateTicks = 0; scavWait(s); } return; }
  if (s.mode === 'walk') {
    if (acquireEnemy(s) && (s.job === 'Guard' || s.job === 'Police Officer')) return;
    const r = s.dest ? followPath(s, s.dest, WALK) : 'arrived';
    if (r === 'moving' && s.stateTicks > 0) return;
    if (s.purpose === 'post' && (r === 'arrived' || dist(s.w, s.dest || s.w) < .5)) { s.mode = 'wait'; s.purpose = 'post-hold'; s.stateTicks = 360; s.dest = null; s.path = null; s.idleBubble = '🛡️'; const gp = myPost(s); s.why = gp ? `On guard at the ${postName(gp)}` : 'On guard'; return; }
    if (s.purpose === 'scav-out' && r === 'arrived') { s.mode = 'wait'; s.stateTicks = 160; s.purpose = 'scav-search'; s.why = 'Searching for supplies'; s.dest = null; s.path = null; return; }
    if (s.purpose === 'scav-back' && r === 'arrived') { lootFind(s); gainXp(s, 2); ui(); }
    s.dest = null; s.path = null; settlePause(s, 100, 220); return;
  }
  if (s.mode === 'wait' || s.purpose === 'scav-search') return;
  if (s.mode === 'free') { if (s.stateTicks > 0) { s.moving = false; return; } chooseLifePurpose(s); }
}
// scavenger leaves 'wait' after searching → head home
function lootFind(s) {
  const r = rnd(), bonus = (professions[s.job]?.scav > 2 ? 1 : 0) + (hasSkill(s, 'lootSense') ? 1 : 0), f = (t, col) => floats.push({ w: { ...s.w }, t, col, a: 70 });
  if (r < .42) { const n = 1 + bonus; S.mat += n; f('+' + n + ' PARTS', '#9fe0ff'); }
  else if (r < .71) { const n = 1 + bonus; S.food += n; S.produced += n; f('+' + n + ' FOOD', '#ffe06b'); }
  else { const n = 1 + bonus; S.water += n; S.produced += n; f('+' + n + ' WATER', '#8fd8ff'); }
}
function scavWait(s) { if (s.purpose === 'scav-search' && s.mode === 'free') { s.mode = 'walk'; s.purpose = 'scav-back'; s.dest = tc(7, 9); s.why = 'Returning with supplies'; s.stateTicks = 900; } }

/* ---------------- zombies ---------------- */
function weightedZombie() {
  const pool = Object.entries(zombieTypes).filter(([k]) => k === 'walker' || k === 'crawler' || (k === 'runner' && S.day >= 2) || ((k === 'bloated' || k === 'spitter') && (S.rank >= 2 || S.day >= 5)) || (k === 'brute' && (S.rank >= 3 || S.day >= 8)));
  let tot = pool.reduce((a, [, v]) => a + v.weight, 0), r = rnd() * tot; for (const [k, v] of pool) { r -= v.weight; if (r <= 0) return k; } return 'walker';
}
function spawnPoint() {   /* a walkable tile on the map edge outside the territory; more sides open up as the territory grows */
  const B = Wd.BUILD, sides = [['n', .5], ['w', .15], ['e', .15 + .12 * (S.terr || 0)], ['s', .15 + .12 * (S.terr || 0)]];
  for (let tries = 0; tries < 40; tries++) {
    let tot = sides.reduce((a, q) => a + q[1], 0), r = rnd() * tot, side = 'n'; for (const [k, w] of sides) { r -= w; if (r <= 0) { side = k; break; } }
    const x = side === 'w' ? 0 : side === 'e' ? Math.min(COLS - 1, B.x1 + 2 + Math.floor(rnd() * Math.max(1, COLS - B.x1 - 2))) : Math.floor(rnd() * COLS);
    const y = side === 'n' ? Math.floor(rnd() * Math.max(1, B.y0 - 1)) : side === 's' ? Math.min(ROWS - 1, B.y1 + 2 + Math.floor(rnd() * Math.max(1, ROWS - B.y1 - 2))) : Math.floor(rnd() * ROWS);
    if (!Wd.inWallZone(x, y) && Wd.walkable(world, x, y, true)) return [x, y];
  }
  return [1, 2];
}
/* ---------------- V2.46 replayability: difficulty, starting conditions, legacy goals and an ending ---------------- */
const DIFFS = {
  easy:   { name: 'Sheltered', icon: '🌱', desc: 'Weaker zombies, smaller hordes, fewer raids, cheaper upkeep and more time to rescue the downed.', z: .75, count: .8, raid: 1.5, upkeep: .75, bleed: 1.5, score: .6 },
  normal: { name: 'Survivor', icon: '⚔️', desc: 'The game as designed.', z: 1, count: 1, raid: 1, upkeep: 1, bleed: 1, score: 1 },
  hard:   { name: 'Hardened', icon: '💀', desc: 'Tougher, more numerous zombies, raids more often, upkeep costs more and the downed bleed out sooner. Scores ×1.6.', z: 1.25, count: 1.2, raid: .75, upkeep: 1.25, bleed: .8, score: 1.6 },
};
const DF = () => DIFFS[S.diff] || DIFFS.normal;
const STARTS = {
  camp:  { name: 'Roadside Camp', icon: '⛺', desc: 'Four survivors, a medical tent, a canteen and a house. The usual start.', food: 14, water: 14, mat: 30,
    b: [['medic', 2, 7], ['canteen', 8, 6], ['house', 11, 11]], sv: [['Marcus', 'Guard', 3, 'brave', 7, 12], ['Amy', 'Medic', 2, 'caring', 5, 10], ['Lena', 'Scavenger', 2, 'scrounger', 9, 14], ['Ben', 'Farmer', 1, 'diligent', 6, 11]] },
  farm:  { name: 'Old Farmstead', icon: '🌾', desc: 'Two garden plots and a full pantry, but only three people and few parts. Strong food, weak defence.', food: 30, water: 22, mat: 14,
    b: [['farm', 8, 7], ['farm', 10, 7], ['canteen', 4, 7], ['house', 11, 11]], sv: [['Ben', 'Farmer', 2, 'diligent'], ['Rosa', 'Farmer', 1, 'eater'], ['Marcus', 'Guard', 2, 'cautious']] },
  scrap: { name: 'Scrapyard Outpost', icon: '⚙️', desc: 'Plenty of parts and a scrapyard, but almost no food or water: get a Rain Collector up fast.', food: 6, water: 5, mat: 70,
    b: [['scrapyard', 8, 6], ['medic', 2, 7], ['house', 11, 11]], sv: [['Theo', 'Engineer', 2, 'diligent'], ['Lena', 'Scavenger', 2, 'scrounger'], ['Marcus', 'Guard', 2, 'brave'], ['June', 'Civilian', 1, 'caring']] },
  lone:  { name: 'Last Two Standing', icon: '🔥', desc: 'Just a guard, a medic and a tent. Newcomers arrive twice as often in the first week. A hard start.', food: 12, water: 12, mat: 25, arrive: 2,
    b: [['medic', 2, 7]], sv: [['Marcus', 'Guard', 3, 'brave'], ['Amy', 'Medic', 2, 'caring']] },
};
const ST = () => STARTS[S.start] || STARTS.camp;
function applyStart(key) {   /* builds the opening town for a starting condition */
  const st = STARTS[key] || STARTS.camp; S.start = STARTS[key] ? key : 'camp'; S.food = st.food; S.water = st.water; S.mat = st.mat; world.buildings = [];
  for (const [type, x, y] of st.b) { if (!DEFS[type]) continue; const r = r4Conv(type, 0), d = Wd.rotDef(DEFS[type], r), chk = Wd.placementCheck(world, x, y, d, null); if (chk.ok) world.buildings.push({ type, x, y, w: d.w, h: d.h, rot: r & 1, r4: r, q: d.q, a: d.a }); }   /* V2.56: start layouts are V7 footprints */
  Wd.bump(world); S.sv = st.sv.map(([n, job, l, tr, x, y], i) => { const q = mk(n, job, l, x ?? 5 + 2 * (i % 3), y ?? 10 + (i % 2) * 2, i); q.trait = tr; q.max = baseMax(q); q.hp = q.max; return q; });
}
const LEGACY = [
  { id: 'month', icon: '📅', name: 'A Month of Dawns', desc: 'Survive 30 days', prog: () => [S.day - 1, 30] },
  { id: 'town', icon: '👥', name: 'A Real Town', desc: '12 people living in the Haven', prog: () => [S.sv.length + (S.trip ? S.trip.members.length : 0), 12] },
  { id: 'land', icon: '🗺️', name: 'Room to Breathe', desc: 'Expand the territory 3 times', prog: () => [S.terr || 0, 3] },
  { id: 'giants', icon: '☠️', name: 'Giant Slayers', desc: 'Defeat 4 Mutant Bosses', prog: () => [S.bossKills || 0, 4] },
  { id: 'know', icon: '🔬', name: 'Know-How', desc: 'Finish 6 research projects', prog: () => [Object.keys(S.res || {}).filter((k) => S.res[k]).length, 6] },
  { id: 'trips', icon: '🧭', name: 'Far Horizons', desc: 'Send out 12 expeditions', prog: () => [S.expCount || 0, 12] },
  { id: 'family', icon: '👶', name: 'Next Generation', desc: 'A child grows up in the Haven', prog: () => [S.grown || 0, 1] },
  { id: 'masters', icon: '🎖️', name: 'Old Hands', desc: '3 survivors master a profession', prog: () => [S.sv.filter((q) => q.mastered).length, 3] },
];
const LEGACY_NEED = 4, FINALE_NIGHTS = 3;
const legacyDone = () => LEGACY.filter((g) => (S.legacy || {})[g.id]).length;
function legacyCheck() {   /* daily, and when the goals panel opens */
  S.legacy = S.legacy || {}; for (const g of LEGACY) { if (S.legacy[g.id]) continue; const [a, b] = g.prog(); if (a >= b) { S.legacy[g.id] = S.day; S.mat += 10; renownGain(15, 'Legacy goal'); showEventPopup({ title: '🏅 LEGACY: ' + g.name.toUpperCase(), text: `${g.desc}: done on day ${S.day}.<br><br>${legacyDone()} of ${LEGACY.length} legacy goals. ${legacyDone() >= LEGACY_NEED ? 'The radio tower can call for the convoy (Goals).' : `Complete ${LEGACY_NEED} and reach ★5 to call for the convoy.`}`, gains: '+15 Renown · +10 parts' }); } }
}
const signalReady = () => !S.finale && !S.won && S.rank >= 5 && legacyDone() >= LEGACY_NEED && S.day >= (S.signalAgain || 0);
function startFinale() {   /* the ending: hold out for three nights of escalating hordes until the convoy arrives */
  if (!signalReady()) return false; S.finale = { day: S.day, night: 0, lost0: (S.fallen || []).length, pop0: S.sv.length + (S.trip ? S.trip.members.length : 0) }; S.nextBoss = Math.max(S.nextBoss, S.day + FINALE_NIGHTS + 3); saveGame();
  showEventPopup({ title: '📻 THE SIGNAL IS OUT', text: `A convoy answered: it will reach the Haven at dawn in ${FINALE_NIGHTS} days.<br><br>Every horde for miles heard the signal too. Hold out for <b>${FINALE_NIGHTS} nights</b>: each one brings a bigger horde, and the last a Mutant Boss.<br><br>The convoy only stops for a living town: keep at least <b>${Math.ceil(S.finale.pop0 / 2)}</b> of your ${S.finale.pop0} people alive.`, gains: 'Walls, guard posts, gear and medics: now is the time' }); return true;
}
function finaleHour() {
  const f = S.finale; if (!f || S.won) return;
  if (S.hour === 20) note('important', `📻 FINAL STAND · NIGHT ${f.night + 1} OF ${FINALE_NIGHTS}: THE HORDE COMES AT 21:00`);
  if (S.hour === 21) { f.night++; const n = Math.round((12 + 6 * f.night + Math.floor(S.day / 3)) * DF().count), boost = 1 + .15 * f.night, add = (type) => { spawn(null, null, type); const z = S.z[S.z.length - 1]; z.siege = true; z.mob = true; z.hp = z.max = Math.round(z.hp * boost); z.pw *= boost; };
    for (let i = 0; i < n; i++) add(null); for (let i = 0; i < 2 * f.night; i++) add('brute'); for (let i = 0; i < f.night; i++) add('spitter'); if (f.night >= 2) spawnBoss(); if (f.night >= FINALE_NIGHTS) spawnBoss();
    note('critical', `Final stand: night ${f.night} of ${FINALE_NIGHTS}`, { key: 'finale', icon: '📻', threats: true, live: () => !!S.finale && !S.won && isNight(), dyn: () => `Final stand · night ${S.finale ? S.finale.night : FINALE_NIGHTS} of ${FINALE_NIGHTS} · ${S.z.filter((z) => z.hp > 0 && !z.human).length} zombies` }); }
  const alive = S.sv.length + (S.trip ? S.trip.members.length : 0), need = Math.ceil((f.pop0 || 2) / 2);
  if (f.night && alive < need) { S.finale = null; S.signalAgain = S.day + 5; S.z.forEach((z) => { if (z.mob) z.siege = false; }); saveGame(); showEventPopup({ title: '📻 THE CONVOY TURNED BACK', text: `Too few people were left (${alive} of the ${need} needed) and the convoy would not risk the stop.<br><br>Rebuild: the radio can call again from day ${S.signalAgain}.`, gains: 'The legacy goals you finished still count' }); return; }
  if (S.hour === 6 && f.night >= FINALE_NIGHTS) winGame();
}
function scoreOf() {
  const lost = (S.fallen || []).length, alive = S.sv.length + (S.trip ? S.trip.members.length : 0);
  return Math.max(100, Math.round((1000 + 60 * alive + 120 * legacyDone() + 40 * (S.rank || 1) - 35 * lost - 8 * Math.max(0, S.day - 35)) * DF().score));
}
const REC_KEY = 'zhRecords';
function records() { try { return JSON.parse(localStorage.getItem(REC_KEY) || '{}'); } catch (e) { return {}; } }
function winGame() {
  if (S.won || !S.sv.length) return; const sc = scoreOf(), lost = (S.fallen || []).length; S.won = { day: S.day, score: sc, alive: S.sv.length, lost }; S.finale = null; S.z.forEach((z) => { if (z.type === 'boss' || z.mob) { z.hp = 0; z.escaped = true; } });
  const k = S.start + '/' + S.diff, R = records(), prev = R[k], best = !prev || sc > prev.score; if (best) { R[k] = { score: sc, day: S.day, name: S.townName || 'Zombie Haven', t: Date.now() }; try { localStorage.setItem(REC_KEY, JSON.stringify(R)); } catch (e) { /* ignore */ } }
  renownGain(50, 'The convoy arrived'); SFX('reward'); saveGame();
  showEventPopup({ title: '🚚 THE CONVOY ARRIVES', text: `${esc(S.townName || 'The Haven')} held out. The convoy rolls in at dawn on day ${S.day}.<br><br>${ST().icon} ${ST().name} · ${DF().icon} ${DF().name}<br>${S.sv.length} survivors · ${lost} lost · ${legacyDone()}/${LEGACY.length} legacy goals<br><br><b style="font-size:26px">Score ${sc}</b>${best ? '<br>🏆 New best for this start and difficulty!' : `<br>Best so far: ${prev.score}`}`, gains: 'You can keep playing this town, or start a new one with another start or difficulty.' });
}
/* V2.29 difficulty: zombies grow tougher every day and with the survivors' levels, so the Haven never gets comfortable */
let dangerT = -1, dangerV = 1;
function danger() {   /* adaptive: tracks how strong the Haven's people are right now (levels and weapons), plus a slow daily creep; a town that just lost its fighters gets weaker waves, a strong one never gets comfortable */
  if (tick - dangerT < 300 && dangerT >= 0) return dangerV; dangerT = tick;
  let st = 0; for (const q of S.sv) if (q.hp > 0 && q.mode !== 'away') st += isFighter(q) ? 8 * (q.l || 1) + weaponOf(q).atk : 1.2 * (q.l || 1);
  return (dangerV = Math.max(.8, Math.min(2.4, .7 + .004 * st + .02 * S.day)));
}
function spawn(x = null, y = null, type = null) {
  const a = spawnPoint(), kind = type || weightedZombie(), d = zombieTypes[kind], dm = danger(), hp = Math.round(d.hp * dm * DF().z);
  S.z.push({ type: kind, pw: (1 + (dm - 1) * .6) * DF().z, w: tc(x ?? a[0], y ?? a[1]), hp, max: hp, cool: 35 + rnd() * 40, phase: rnd() * 100, dest: null, mode: 'appear', stateTicks: 45 + rnd() * 30, target: null, path: null, siege: rnd() < Math.min(.85, .08 + .12 * (S.rank - 1) + (world.walls.size ? .15 : 0) + (isNight() ? .25 : 0) + .05 * (S.terr || 0)), blocked: 0, goal: null, goalT: 0, wallT: null });
}
const nowD = () => S.day + S.hour / 24;
const graceOn = () => (S.graceUntil || 0) > nowD();   /* V2.24 mourning: the horde pulls back after heavy losses */
const avgLevel = () => (S.sv.length ? S.sv.reduce((a, q) => a + (q.l || 1), 0) / S.sv.length : 1);
const isNight = () => S.hour >= 20 || S.hour < 6;   /* V2.12: dangerous nights, quieter days */
function monsterGeneration() {
  S.spawnClock++; const tr = S.terr || 0, base = 5 + S.rank + Math.floor(S.threat / 2) + 2 * tr + Math.floor(S.day / 3), night = isNight();
  const desired = Math.round((night ? Math.min(Math.round(base * 1.35), 14 + 3 * tr) : Math.max(3, Math.min(Math.round(base * .65), 9 + 2 * tr))) * (graceOn() ? .75 : 1) * DF().count), gap = (110 - Math.min(50, S.threat * 6)) * (night ? .5 : 1.6);
  if (activeZ() < desired && S.spawnClock > gap) { spawn(); S.spawnClock = 0; }
  if (!night && S.spawnClock % 90 === 45 && activeZ() > desired + 2) {   /* V2.18: by day the surplus (night spawns, boss hordes) drifts away instead of piling up forever */
    const far = S.z.filter((z) => z.hp > 0 && !z.human && !z.boss && ['idle', 'zmarch', 'appear'].includes(z.mode) && !S.sv.some((s) => s.hp > 0 && !insideBuilding(s) && dist(s.w, z.w) < 4));   /* survivors sheltering indoors don't hold them */
    if (far.length) { const z = far[Math.floor(rnd() * far.length)]; z.hp = 0; z.escaped = true; }
  }
}
/* ---------------- V2.13 raiders: humans who dodge zombies, slip in through the gate, steal, fight, and run ---------------- */
const RAID_TARGETS = ['storage', 'canteen', 'farm', 'field', 'water', 'well', 'armory', 'workshop', 'house'];
function spawnRaid() {
  const n = Math.min(7, 3 + Math.floor(S.rank / 2) + (S.terr || 0) + Math.floor(S.day / 6)), a = spawnPoint();
  for (let i = 0; i < n; i++) { const d = zombieTypes.raider; S.z.push({ type: 'raider', human: true, w: tc(a[0] + (i % 2) * .4, a[1] + (i >> 1) * .4), home: tc(a[0], a[1]), pw: 1 + (danger() - 1) * .5, hp: Math.round(d.hp * danger()), max: Math.round(d.hp * danger()), cool: 30, phase: rnd() * 100, mode: 'appear', stateTicks: 30 + i * 20, target: null, path: null, loot: { food: 0, water: 0, mat: 0 }, carried: 0, goalB: null, evadeT: 0 }); }
  SFX('alarm'); raidAlert(n); S.alert = 1200;
}
function raidTarget(z) { let best = null, bd = 1e9; for (const b of world.buildings) { if (!RAID_TARGETS.includes(b.type)) continue; const d = dist(z.w, Wd.doorPoint(b)); if (d < bd) { bd = d; best = b; } } return best; }
function rai(z) {
  const d = zombieTypes.raider; if (z.mode === 'idle' || z.mode === 'zmarch') { z.mode = z.carried > 0 ? 'rflee' : 'rsneak'; z.path = null; }
  if (z.hp < z.max * .5 && z.mode !== 'rflee') { z.mode = 'rflee'; z.path = null; z.target = null; }
  // dodge zombies: step away from any zombie that gets close
  if (z.evadeT > 0) { z.evadeT--; moveSlide(z, z.evadeTo, d.chase * 1.1); return; }
  const zz = S.z.find((o) => !o.human && o.hp > 0 && o.mode !== 'appear' && dist(o.w, z.w) < 2.2)
    || (z.mode === 'rsneak' && S.sv.find((q) => q.hp > 0 && isFighter(q) && !insideBuilding(q) && !['down', 'hospital'].includes(q.mode) && dist(q.w, z.w) < 2.4));   /* sneaking: steer clear of zombies and fighters */
  if (zz) { const dx = z.w.x - zz.w.x, dy = z.w.y - zz.w.y, l = Math.hypot(dx, dy) || 1; z.evadeTo = { x: z.w.x + dx / l * 1.8, y: z.w.y + dy / l * 1.8 }; z.evadeT = 40; z.path = null; return; }
  // fight survivors who come close (or defend the haul)
  let foe = null, fd = z.mode === 'rsneak' ? 1.1 : 1.7; for (const s of S.sv) if (s.hp > 0 && !['down', 'hospital'].includes(s.mode) && !insideBuilding(s)) { const dd = dist(s.w, z.w); if (dd < fd) { fd = dd; foe = s; } }
  if (foe && z.mode !== 'rflee') { z.target = foe; z.mode = 'zchase'; z.path = null; return; }
  if (z.mode === 'rsneak') {
    z.sneakT = (z.sneakT || 0) + 1; if (z.sneakT > 4000) { z.mode = 'rflee'; z.path = null; return; }   /* gives up after ~4 game hours */
    if (!z.goalB || !world.buildings.includes(z.goalB)) z.goalB = raidTarget(z); if (!z.goalB) { z.mode = 'rflee'; return; }
    const r = followPath(z, Wd.doorPoint(z.goalB), d.chase); if (r === 'arrived') { z.mode = 'rsteal'; z.stateTicks = 0; z.path = null; } else if (r === 'fail') { z.goalB = null; z.mode = 'rflee'; } return;
  }
  if (z.mode === 'rsteal') {
    z.moving = false; if (z.stateTicks > 0) return; z.stateTicks = 70;
    const k = ['food', 'water', 'mat'].filter((q) => S[q] >= 1).sort(() => rnd() - .5)[0];
    if (k && z.carried < 4) { S[k] -= 1; z.loot[k]++; z.carried++; floats.push({ w: { ...z.w }, t: '−1 ' + (k === 'mat' ? 'PARTS' : k.toUpperCase()) + ' STOLEN', col: '#ff8a7a', a: 70 }); }
    if (!k || z.carried >= 4) { z.mode = 'rflee'; z.path = null; } return;
  }
  if (z.mode === 'rflee') {
    const r = followPath(z, z.home, d.chase * 1.1);
    if (r === 'arrived' || r === 'fail' || dist(z.w, z.home) < .6) { if (z.carried) note('important', `A raider escaped with ${['food', 'water', 'mat'].filter((q) => z.loot[q]).map((q) => z.loot[q] + ' ' + (q === 'mat' ? 'parts' : q)).join(', ')}.`); z.hp = 0; z.escaped = true; }
  }
}
function raiderDown(z) {   /* a beaten raider drops what they carried */
  if (!z.human || z.escaped) return; S.raiderKills = (S.raiderKills || 0) + 1; for (const k of ['food', 'water', 'mat']) if (z.loot && z.loot[k]) { S[k] += z.loot[k]; floats.push({ w: { ...z.w }, t: '+' + z.loot[k] + ' ' + (k === 'mat' ? 'PARTS' : k.toUpperCase()) + ' RECOVERED', col: '#9fe58a', a: 80 }); }
}
/* ---------------- V2.13 boss: every 3rd night a boss leads a mob against the town ---------------- */
function spawnBoss() {
  const a = spawnPoint(), d = zombieTypes.boss, tr = S.terr || 0;
  const L = avgLevel(), bhp = Math.round((300 + 50 * L + 80 * tr) * (1 + .04 * S.day) * DF().z);   /* V2.24: scales with the survivors' levels, not the Haven rank */
  S.z.push({ type: 'boss', boss: true, pw: 1.25 + .03 * S.day, w: tc(a[0], a[1]), hp: bhp, max: bhp, cool: 40, phase: 0, dest: null, mode: 'appear', stateTicks: 60, target: null, path: null, siege: true, blocked: 0, goal: null, goalT: 0, wallT: null });
  S.z[S.z.length - 1].max = S.z[S.z.length - 1].hp;
  const mob = 3 + Math.round(L * .8) + 3 * tr + Math.floor(S.day / 5); for (let i = 0; i < mob; i++) { spawn(Math.max(0, Math.min(COLS - 1, a[0] + (rnd() - .5) * 3)), Math.max(0, Math.min(ROWS - 1, a[1] + (rnd() - .5) * 3))); S.z[S.z.length - 1].siege = true; S.z[S.z.length - 1].mob = true; }
  SFX('boss'); note('critical', `A Mutant Boss and ${mob} zombies attack!`, { key: 'boss', icon: '☠', log: `A Mutant Boss is leading ${mob} zombies against the Haven!`, threats: true, at: () => { const b = S.z.find((z) => z.type === 'boss' && z.hp > 0); return b ? b.w : null; }, live: () => S.z.some((z) => z.type === 'boss' && z.hp > 0) }); S.alert = 2400;
}
function eventSchedule() {   /* called every game hour */
  const now = S.day + S.hour / 24; finaleHour();
  if (S.day >= 2 && now >= S.nextRaid) { if (graceOn()) S.nextRaid = now + 1; else { spawnRaid(); S.nextRaid = now + (2 + rnd() * 1.5) * DF().raid; } }
  if (S.day === S.nextBoss && S.hour === 17 && graceOn()) { S.nextBoss++; note('important', '☠ The horde holds back tonight', { log: 'The horde\'s leader holds back while the Haven mourns. It will come tomorrow night.' }); }
  if (S.day === S.nextBoss && S.hour === 18) { note('important', '☠ A BOSS ATTACKS AT 21:00', { log: 'Scouts report a huge mutant gathering a horde. It will hit the Haven at 21:00.' }); }
  if (S.day === S.nextBoss && S.hour === 21) { spawnBoss(); S.nextBoss += 3; }
  incidentRoll();
  if (!S.trader && S.day >= (S.nextTrader || 2) && S.hour === 9) traderArrive();
  if (S.trader && S.hour === 19) traderLeave();
  if (S.hour === 6) { const bs = S.z.filter((z) => z.type === 'boss' && z.hp > 0), b = bs[0]; for (const q of bs) { q.hp = 0; q.escaped = true; } if (b) {   /* V2.37: every boss leaves at dawn (only the first did) */ note('important', '☀ THE BOSS RETREATS AT DAWN', { log: 'The Mutant Boss slunk back into the wasteland. It will return.' }); } S.z.forEach((z) => { if (z.mob) { z.siege = false; z.mob = false; } }); }
}
function alertPack(z, target) {   /* V2.12: zombies near one that spots a survivor join the chase */
  for (const o of S.z) if (o !== z && o.hp > 0 && o.mode === 'idle' && dist(o.w, z.w) < 2.5 && dist(o.w, target.w) < 6) { o.target = target; o.mode = 'zchase'; o.path = null; o.blocked = 0; }
}
function zai(z) { zai0(z); if (!z.human && z.hp > 0) zPushOut(z); }
function zai0(z) {
  if (z.human && z.hp < z.max * .5 && ['zchase', 'zattack', 'zrecover'].includes(z.mode)) { z.mode = 'rflee'; z.target = null; z.path = null; }
  if (z.human && !['zchase', 'zattack', 'zrecover', 'appear'].includes(z.mode)) return rai(z);
  const d = zombieTypes[z.type] || zombieTypes.walker; if (z.cool > 0) z.cool--; if (z.stateTicks > 0) z.stateTicks--;
  if (z.mode === 'appear') { z.moving = false; if (z.stateTicks <= 0) { z.mode = 'idle'; z.stateTicks = 35 + rnd() * 70; } return; }
  if (z.mode === 'zleave') {   /* V2.37: bored zombies wander back out of the map in daylight */
    for (const s of S.sv) if (s.hp > 0 && !['down', 'hospital'].includes(s.mode) && !insideBuilding(s) && dist(s.w, z.w) < d.aggro * .7) { z.target = s; z.mode = 'zchase'; z.path = null; z.bored = 0; return; }
    const r = followPath(z, z.leaveTo, d.chase * .6); if (r !== 'moving' || dist(z.w, z.leaveTo) < .8) { z.hp = 0; z.escaped = true; } return;
  }
  if ((z.mode === 'zmarch' || z.mode === 'idle') && z.type !== 'boss' && tick % 30 === 0) {   // nothing to chase for a long while in daylight → leave
    const seen = S.sv.some((s) => s.hp > 0 && !['down', 'hospital'].includes(s.mode) && !insideBuilding(s) && dist(s.w, z.w) < d.aggro * 1.6);
    z.bored = seen ? 0 : (z.bored || 0) + 30;
    if (!isNight() && z.bored > 1800) { const p = spawnPoint(); if (p) { z.mode = 'zleave'; z.siege = false; z.mob = false; z.leaveTo = tc(p[0], p[1]); z.path = null; z.target = null; return; } }
  }
  if (z.mode === 'idle' && z.siege) { z.mode = 'zmarch'; z.goalT = 0; }
  if (z.mode === 'zmarch') {            // mobs head for the nearest survivor or building; elites aim for the weakest wall segment or the gate
    { const lu = (S.posts || []).length ? postLure(z) : null; if (lu) { z.target = lu; z.mode = 'zchase'; z.path = null; z.blocked = 0; alertPack(z, lu); return; } }   /* V2.45 */
    let best = null, bd = 1e9; for (const s of S.sv) if (s.hp > 0 && !['down', 'hospital'].includes(s.mode) && !insideBuilding(s)) { const dd = dist(s.w, z.w); if (dd < bd) { bd = dd; best = s; } }
    if (best && bd < d.aggro) { z.target = best; z.mode = 'zchase'; z.path = null; z.blocked = 0; alertPack(z, best); SFX('groan'); return; }
    if (--z.goalT <= 0) { z.goal = siegeGoal(z); z.goalT = 90; }
    zMarchStep(z, z.goal, d.chase * .8); return;
  }
  if (z.mode === 'zbreak') {
    const wl = z.wallT; z.moving = false;
    if (!wl || wl.broken || world.walls.get(wl.x + ',' + wl.y) !== wl) { z.wallT = null; z.mode = z.siege ? 'zmarch' : 'idle'; z.blocked = 0; z.stateTicks = 20; return; }
    if (z.stateTicks <= 0) { const dmg = d.atk * (z.pw || 1) * (z.type === 'brute' ? 2.5 : z.type === 'boss' ? 4 : 1); wl.hp -= dmg; wl.hit = 14; floats.push({ w: { x: wl.x + .5, y: wl.y + .5 }, t: '-' + Math.round(dmg), col: '#ffb27a', a: 45 }); z.stateTicks = z.type === 'brute' ? 60 : z.type === 'runner' ? 34 : 46;
      if (wl.hp <= 0) wallBroken(wl); }
    let best = null, bd = 1.1; for (const s of S.sv) if (s.hp > 0 && !['down', 'hospital'].includes(s.mode) && !insideBuilding(s)) { const dd = dist(s.w, z.w); if (dd < bd) { bd = dd; best = s; } }
    if (best) { z.target = best; z.mode = 'zchase'; z.wallT = null; z.path = null; } return;
  }
  if (z.mode === 'idle') {
    if (!z.dest || z.stateTicks <= 0) {   /* V2.33: wandering, but slowly drifting toward the town */
      const c = townCentre(), dx = c.x - z.w.x, dy = c.y - z.w.y, l = Math.hypot(dx, dy) || 1, pull = Wd.inTown(Math.floor(z.w.x), Math.floor(z.w.y)) ? 0 : ZDRIFT;
      z.dest = { x: z.w.x + (rnd() - .5) * 3 + dx / l * pull, y: z.w.y + (rnd() - .5) * 3 + dy / l * pull }; z.stateTicks = 60 + rnd() * 100; }
    if (z.dest) { if (moveSlide(z, z.dest, d.chase * .35)) z.stateTicks = Math.min(z.stateTicks, 20); }
    { const lu = (S.posts || []).length ? postLure(z) : null; if (lu) { z.target = lu; z.mode = 'zchase'; z.path = null; alertPack(z, lu); return; } }   /* V2.45 */
    let best = null, bd = 1e9; for (const s of S.sv) if (s.hp > 0 && !['down', 'hospital'].includes(s.mode) && !insideBuilding(s)) { const dd = dist(s.w, z.w); if (dd < bd) { bd = dd; best = s; } }
    if (best && bd < d.aggro) { z.target = best; z.mode = 'zchase'; z.path = null; alertPack(z, best); } return;
  }
  if (z.mode === 'zchase') {
    if (!z.target || z.target.hp <= 0 || ['down', 'hospital'].includes(z.target.mode) || insideBuilding(z.target)) { z.target = null; z.mode = z.siege ? 'zmarch' : 'idle'; z.stateTicks = 40; return; }
    const dd = dist(z.target.w, z.w); if (dd > 4.8) { z.target = null; z.mode = 'idle'; z.stateTicks = 60; return; }
    if (z.type === 'spitter' && dd < 2.8) { z.mode = 'zattack'; z.stateTicks = 34; } else if (dd > .8) { if (followPath(z, z.target.w, d.chase) === 'fail') zWalk(z, z.target.w, d.chase, true); } else { z.mode = 'zattack'; z.stateTicks = 26; } return;
  }
  if (z.mode === 'zattack') { z.moving = false; if (z.stateTicks <= 0) { if (z.target && z.target.hp > 0 && !insideBuilding(z.target)) { const dmg = Math.max(1, Math.round((d.atk + (z.type === 'brute' ? 2 : 0)) * (z.pw || 1) * (hasSkill(z.target, 'armored') ? .8 : 1) * (hasSkill(z.target, 'bulwark') ? .85 : 1) * (atPost(z.target) ? .8 : 1) * (1 - dmgReduce(z.target)))); z.target.hp -= dmg; z.target.hitT = 9; SFX('hurt'); floats.push({ w: { ...z.target.w }, t: '-' + dmg, col: '#ff6e62', a: 55 }); } z.mode = 'zrecover'; z.stateTicks = z.recDur = (z.type === 'runner' ? 38 : z.type === 'brute' ? 82 : 58) + rnd() * 22; } return; }
  if (z.mode === 'zrecover') { if (z.stateTicks <= 0) z.mode = z.target && z.target.hp > 0 ? 'zchase' : (z.siege ? 'zmarch' : 'idle'); }
}
/* ---------------- walls: zombies march, break segments, repairs, breach alert ---------------- */
const wallAtTile = (x, y) => world.walls.get(x + ',' + y) || null;
function siegeGoal(z) {
  const d = zombieTypes[z.type] || zombieTypes.walker, elite = z.type === 'spitter' || z.type === 'brute' || z.type === 'boss';
  const open = [...world.walls.values()].some((wl) => wl.broken);
  if (elite && world.walls.size && !open) {   // elites are smarter: they go for the gate; with no gate they pick the weakest segment
    let best = null, bs = 1e9; for (const wl of world.walls.values()) if (wl.type === 'gate') { const sc = dist(z.w, { x: wl.x + .5, y: wl.y + .5 }); if (sc < bs) { bs = sc; best = wl; } }
    if (!best) for (const wl of world.walls.values()) { const sc = wl.hp + dist(z.w, { x: wl.x + .5, y: wl.y + .5 }) * 6; if (sc < bs) { bs = sc; best = wl; } }
    return { x: best.x + .5, y: best.y + .5 }; }
  let g = null, gd = 1e9; for (const s of S.sv) if (s.hp > 0 && !insideBuilding(s)) { const dd = dist(s.w, z.w); if (dd < gd) { gd = dd; g = s.w; } }
  for (const b of world.buildings) { const c = { x: b.x + b.w / 2, y: b.y + b.h / 2 }, dd = dist(c, z.w); if (dd < gd) { gd = dd; g = c; } }
  return g ? { x: g.x, y: g.y } : tc(7, 11);
}
const ZDRIFT = .25;   /* tiles of pull per wander step (~2 tiles per game hour): a slow creep toward the town */
const townCentre = () => ({ x: (Wd.BUILD.x0 + Wd.BUILD.x1 + 1) / 2, y: (Wd.BUILD.y0 + Wd.BUILD.y1 + 1) / 2 });
function zMarchStep(z, goal, sp) {   /* V2.33: walk around walls to any opening; only a sealed town makes them break a wall (the first one on the cheapest route) */
  if (!goal) return;
  if (z.path && z.path.length) { const n = z.path[0], wl = wallAtTile(Math.floor(n.x), Math.floor(n.y)); if (wl && !wl.broken && dist(z.w, n) < 1.08) { z.wallT = wl; z.mode = 'zbreak'; z.stateTicks = 20; z.path = null; z.blocked = 0; return; } }
  z.wallCost = 160; const r = followPath(z, goal, sp); z.wallCost = 0;
  if (r === 'fail') zWalk(z, goal, sp);
}
function zPushOut(z) {   /* V2.33: zombies keep clear of building footprints so they never look like part of a building */
  const R = .3, x = z.w.x, y = z.w.y;
  for (let ty = Math.floor(y - R); ty <= Math.floor(y + R); ty++) for (let tx = Math.floor(x - R); tx <= Math.floor(x + R); tx++) {
    if (!Wd.buildingAt(world, tx, ty)) continue;
    const cx = Math.max(tx, Math.min(tx + 1, z.w.x)), cy = Math.max(ty, Math.min(ty + 1, z.w.y)); let dx = z.w.x - cx, dy = z.w.y - cy, d = Math.hypot(dx, dy);
    if (d >= R) continue;
    if (d < 1e-4) { const opts = [[tx - R, z.w.y, z.w.x - tx], [tx + 1 + R, z.w.y, tx + 1 - z.w.x], [z.w.x, ty - R, z.w.y - ty], [z.w.x, ty + 1 + R, ty + 1 - z.w.y]].sort((a, b) => a[2] - b[2]); z.w.x = opts[0][0]; z.w.y = opts[0][1]; }
    else { z.w.x = cx + dx / d * R; z.w.y = cy + dy / d * R; }
  }
}
function zWalk(z, goal, sp, viaPath = false) {   // slide toward the goal; when walls hold it still for a moment, start breaking the nearest one
  const bx = z.w.x, by = z.w.y; if (!goal) return; moveSlide(z, goal, sp);
  if (Math.hypot(z.w.x - bx, z.w.y - by) < sp * .3) z.blocked++; else z.blocked = 0;
  if (z.blocked > 8) { const tx = Math.floor(z.w.x), ty = Math.floor(z.w.y); let best = null, bd = 1e9;
    for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) { const wl = wallAtTile(tx + dx, ty + dy); if (!wl || wl.broken) continue; const dd = dist({ x: tx + dx + .5, y: ty + dy + .5 }, goal); if (dd < bd) { bd = dd; best = wl; } }
    if (best) { z.wallT = best; z.mode = 'zbreak'; z.stateTicks = 20; z.blocked = 0; z.path = null; } else if (z.blocked > 120) { z.goalT = 0; z.blocked = 0; z.dest = null; }
  }
}
function wallBroken(wl) {
  wl.hp = 0; wl.broken = true; Wd.bump(world); S.alert = 1800; SFX('breach'); const gate = wl.type === 'gate';
  for (const z of S.z) if (z.hp > 0 && !z.human && ['idle', 'zmarch', 'zbreak'].includes(z.mode) && dist(z.w, { x: wl.x + .5, y: wl.y + .5 }) < 16) { z.siege = true; z.mode = 'zmarch'; z.wallT = null; z.path = null; z.goal = null; z.goalT = 0; z.blocked = 0; }   /* V2.33: the whole horde rushes the breach */   /* V2.18: it stays as rubble and the repair crew rebuilds it */
  breachAlert(wl); ui();
}
let repairFrac = 0;
function autoRepair() {   // every second: the most damaged segment that can be worked on is patched up (no zombie close by, nobody standing in a broken gap); engineers and mechanics work twice as fast; a full repair costs 60% of a new segment
  const near = (wl) => S.z.some((z) => z.hp > 0 && dist(z.w, { x: wl.x + .5, y: wl.y + .5 }) < 2.6), inGap = (wl) => S.z.some((z) => z.hp > 0 && Math.floor(z.w.x) === wl.x && Math.floor(z.w.y) === wl.y) || S.sv.some((q) => Math.floor(q.w.x) === wl.x && Math.floor(q.w.y) === wl.y);
  const cand = [...world.walls.values()].filter((wl) => wl.hp < wl.max).sort((a, b) => a.hp / a.max - b.hp / b.max);
  if (repairFirst && (repairFirst.hp >= repairFirst.max || !world.walls.has(Wd.key(repairFirst.x, repairFirst.y)))) repairFirst = null;
  const ok = (wl) => !near(wl) && !(wl.broken && inGap(wl)), best = repairFirst && ok(repairFirst) ? repairFirst : cand.find(ok); if (!best) return;
  const fast = S.sv.some((q) => q.hp > 0 && (q.job === 'Engineer' || q.job === 'Mechanic' || hasSkill(q, 'handy'))), amt = Math.min(best.max - best.hp, fast ? 8 : 4), cost = amt / best.max * Wd.WALL_DEFS[best.type].mat * .6;
  repairFrac += cost; if (repairFrac >= 1) { if (S.mat < 1) { repairFrac = 1; return; } S.mat -= 1; repairFrac -= 1; flow('mat', 'Wall repairs', -1); }
  best.hp += amt; if (best.broken && best.hp >= best.max * .3) { best.broken = false; Wd.bump(world); } if (best.hp >= best.max) { best.hp = best.max; floats.push({ w: { x: best.x + .5, y: best.y + .5 }, t: 'REPAIRED', col: '#9fe58a', a: 50 }); }
}

/* ---------------- town systems ---------------- */
const xpNeed = (s) => { const p = professions[s.job]; const b = (p && p.master) || 60, l = s.l || 1; return Math.round(l < 5 ? b : b * (1 + (l - 4) * .6)); };
function masteryCheck(s) {      // experience: each level raises the work boost and the daily ration; capped at LEVEL_CAP
  const p = professions[s.job]; if (!p || s.mastery < xpNeed(s)) return;
  if ((s.l || 1) < LEVEL_CAP) { s.l = (s.l || 1) + 1; s.mastery = 0; s.mastered = false; s.st = s.st || rollStats(s.job, 1); for (const k of (JOB_STATS[s.job] || [])) s.st[k] = Math.min(STAT_CAP, s.st[k] + 1); syncClass(s); setMaxHp(s); s.hp = Math.min(s.max, s.hp + 8); renownGain(1, `${s.name} reached ${s.job} Lv.${s.l}`); floats.push({ w: { ...s.w }, t: 'LV ' + s.l + '!', col: '#ffe38a', a: 80 }); learnSkills(s); }
  else if (!s.mastered) { syncClass(s); s.mastered = true; renownGain(2, s.name + ' mastered ' + s.job); note('important', s.name + ' MASTERED ' + s.job); }
}

/* ---------------- supplies: production, staffing, rations, upgrades ---------------- */
const SUPPLY_BASE_CAP = 60, SUPPLY_PER_STORAGE = 40;
const supplyCap = () => SUPPLY_BASE_CAP + SUPPLY_PER_STORAGE * bOf('storage').length + (researched('stockpile') ? 30 : 0);
const isWorking = (b) => !!(b.staff && b.staff.mode === 'work' && b.staff.hp > 0);
const BUILDING_STAT = { farm: 'str', field: 'str', water: 'per', well: 'per', medic: 'int', clinic: 'int', hospital: 'int', canteen: 'cha', workshop: 'int', scrapyard: 'str' };
const prodMult = (b, working = isWorking(b)) => (b.fire || b.burnt ? 0 : 1) * (b.unpaid ? .5 : 1) * (1 + combos(b).prod) * (1 + (working && b.staff ? workBoost(b.staff) + traitWork(b.staff) + (BUILDING_STAT[b.type] ? (stat(b.staff, BUILDING_STAT[b.type]) - 5) * .03 : 0) + (hasSkill(b.staff, 'efficient') ? .15 : 0) + (hasSkill(b.staff, 'greenThumb') ? .2 : 0) + (hasSkill(b.staff, 'harvestMaster') && FAM(b.type) === 'food' ? .3 : 0) + (hasSkill(b.staff, 'masterBuilder') && b.type === 'workshop' ? .2 : 0) : 0));
const dayLog = { foodIn: 0, waterIn: 0 };
/* ---------------- V2.15 upkeep: every building costs parts each day; unpaid buildings run at half output ---------------- */
const UPKEEP = { house: .2, water: .3, well: .5, farm: .3, field: .5, medic: .4, clinic: .7, hospital: 1.1, canteen: .4, armory: .4, workshop: .6, storage: .3, barracks: .6, scrapyard: .2, gym: .3, library: .3, lounge: .3, range: .4, track: .3, sparring: .3 };
const upkeepOf = (b) => (UPKEEP[b.type] ?? .3) * (b.staff && hasSkill(b.staff, 'masterBuilder') ? .5 : 1) * DF().upkeep;
const upkeepTotal = () => world.buildings.reduce((a, b) => a + upkeepOf(b), 0);
function payUpkeep() {   /* at day end: pay in order of importance (water, food, medical first); what can't be paid runs at half output tomorrow */
  const order = ['water', 'well', 'farm', 'field', 'medic', 'clinic', 'hospital', 'scrapyard', 'canteen', 'house'];
  const list = [...world.buildings].sort((a, b) => ((order.indexOf(a.type) + 1) || 99) - ((order.indexOf(b.type) + 1) || 99));
  let paid = 0, unpaid = 0; for (const b of list) { const c = upkeepOf(b); if (S.mat >= c) { S.mat -= c; paid += c; b.unpaid = false; } else { b.unpaid = true; unpaid++; } } flow('mat', 'Upkeep', -paid);
  if (unpaid) { note('important', `⚠ ${unpaid} BUILDING${unpaid > 1 ? 'S' : ''} UNPAID — HALF OUTPUT`, { log: `Not enough parts for upkeep: ${unpaid} building${unpaid > 1 ? 's run' : ' runs'} at half output tomorrow. Build a Scrapyard or scavenge for parts.` }); }
  return { paid, unpaid };
}
/* ---------------- V2.15 neighbour bonuses (DV2 combos / Fallout merged rooms) ---------------- */
const near = (a, b) => a !== b && a.x <= b.x + b.w && b.x <= a.x + a.w && a.y <= b.y + b.h && b.y <= a.y + a.h;   /* touching or 1 tile apart */
const FAM = (t) => (['water', 'well'].includes(t) ? 'water' : ['farm', 'field'].includes(t) ? 'food' : ['medic', 'clinic', 'hospital'].includes(t) ? 'medical' : t);
const TRAINING = ['gym', 'library', 'lounge', 'range', 'track', 'sparring'];
let comboCache = { ver: -1, map: new Map() };
function combos(b) {
  if (comboCache.ver !== world.ver) { comboCache = { ver: world.ver, map: new Map() }; }
  if (comboCache.map.has(b)) return comboCache.map.get(b);
  const n = world.buildings.filter((o) => near(b, o)), c = { prod: 0, meal: 0, care: 0, train: 0, sat: 0, scrap: 0, names: [] }, f = FAM(b.type);
  const same = n.filter((o) => FAM(o.type) === f).length;
  if (['water', 'food', 'scrapyard'].includes(f) && same) { c.prod += Math.min(2, same) * .1; c.names.push(`District ×${Math.min(2, same) + 1} (+${Math.min(2, same) * 10}% output)`); }
  if (b.type === 'canteen' && n.some((o) => FAM(o.type) === 'food')) { c.meal += .2; c.names.push('Farm to table (+20% meals)'); }
  if (f === 'food' && n.some((o) => o.type === 'canteen')) { c.prod += .05; c.names.push('Farm to table (+5% food)'); }
  if (f === 'medical' && n.some((o) => o.type === 'house')) { c.care += .15; c.names.push('Recovery ward (patients heal 15% faster)'); }
  if (TRAINING.includes(b.type) && n.some((o) => TRAINING.includes(o.type) && o.type !== b.type)) { c.train += .15; c.names.push('Fitness block (+15% training)'); }
  if (['lounge', 'canteen'].includes(b.type) && n.some((o) => o.type === 'house')) { c.sat += 1; c.names.push('Neighbourhood (+1 ♥ per visit)'); }
  if (b.type === 'scrapyard' && n.some((o) => o.type === 'workshop')) { c.prod += .15; c.names.push('Salvage line (+15% parts)'); }
  if (b.type === 'armory' && n.some((o) => ['barracks', 'range'].includes(o.type))) { c.names.push('Arsenal (gear 1 part cheaper)'); c.arsenal = true; }
  comboCache.map.set(b, c); return c;
}
/* ---------------- V2.16 Workshop research + crafting ---------------- */
const RESEARCH = {
  deepWells: { name: 'Deep Wells', rp: 20, mat: 6, desc: 'Unlocks the Well (9 water/day)' },
  irrigation: { name: 'Irrigation', rp: 20, mat: 6, desc: 'Unlocks the Farm (8 food/day)' },
  fieldSurgery: { name: 'Field Surgery', rp: 25, mat: 8, desc: 'Unlocks the Clinic' },
  traumaCare: { name: 'Trauma Care', rp: 50, mat: 15, need: 'fieldSurgery', desc: 'Unlocks the Hospital (2×2)' },
  fitness: { name: 'Fitness Program', rp: 30, mat: 8, desc: 'Unlocks Shooting Range, Obstacle Course, Sparring Ring' },
  salvage: { name: 'Salvage Methods', rp: 25, mat: 6, desc: 'Scrapyards make 25% more parts' },
  walls: { name: 'Reinforced Walls', rp: 30, mat: 10, desc: 'New and repaired walls get 30% more HP' },
  stockpile: { name: 'Bigger Stockpiles', rp: 40, mat: 12, desc: '+30 supply cap' },
  medicine: { name: 'Field Medicine', rp: 25, mat: 6, desc: 'Bandages cost 1 part and last longer' },
  blades: { name: 'Bladesmithing', rp: 20, mat: 5, desc: 'Craft Machete and Fire Axe' },
  firearms: { name: 'Firearms', rp: 40, mat: 12, need: 'blades', desc: 'Craft Pistol and Hunting Rifle' },
  bodyArmor: { name: 'Body Armor', rp: 35, mat: 10, desc: 'Craft Riot Vest and Scrap Plate' },
  gadgets: { name: 'Gadgets', rp: 30, mat: 8, desc: 'Craft stat accessories' },
};
const RECIPES = { blades: ['machete', 'nailbat', 'spear', 'axe', 'sledge', 'katana'], firearms: ['pistol', 'revolver', 'rifle', 'shotgun', 'crossbow', 'smg'], bodyArmor: ['biker', 'riot', 'kevlar', 'plate', 'military'], gadgets: ['gloves', 'belt', 'shoes', 'goggles', 'glasses', 'charm', 'dogtags'] };
const researched = (k) => !k || !!(S.res && S.res[k]);
const craftCost = (id) => Math.ceil(ITEMS[id].cost * 1.3) + 1;
function doResearch(k) { const r = RESEARCH[k]; if (!r || researched(k) || !researched(r.need) || (S.rp || 0) < r.rp || S.mat < r.mat) return false; S.rp -= r.rp; S.mat -= r.mat; S.res = S.res || {}; S.res[k] = true; S.resWeek = (S.resWeek || 0) + 1; banner('🔬 RESEARCHED: ' + r.name.toUpperCase()); SFX('chime'); say(`Research complete: ${r.name} — ${r.desc}.`, true); saveGame(); ui(); return true; }
function craft(id) { const c = craftCost(id); if (S.mat < c || !Object.entries(RECIPES).some(([k, l]) => researched(k) && l.includes(id)) || !bOf('workshop').length) return false; S.mat -= c; stashAdd(id); SFX('coin'); banner('🛠 CRAFTED ' + ITEMS[id].name.toUpperCase()); say(`Crafted a ${ITEMS[id].name} (−${c} parts). It's in the stash.`, true); saveGame(); ui(); return true; }
function outPop(b, got, icon, col) {   /* V2.36: each whole unit a building really produced pops above it; the fraction fills its badge ring */
  b.acc = (b.acc || 0) + got; if (b.acc >= 1) { const n = Math.floor(b.acc); b.acc -= n; floats.push({ w: { x: b.x + b.w / 2, y: b.y + b.h / 2 - .2 }, t: `+${n} ${icon}`, col, a: 80 }); }
}
function hourlyProduction() {   // runs every game hour
  let fi = 0, wi = 0; const cap = supplyCap();
  for (const b of world.buildings) {
    const d = DEFS[b.type]; if (!d) continue; const nm = d.name;
    if (d.slot) { b.wh = b.wh || []; b.wh.push(b.staff ? (b.wsN ? b.wsW / b.wsN : (isWorking(b) ? 1 : 0)) : 0); if (b.wh.length > 24) b.wh.shift(); b.wsN = b.wsW = 0; }   /* V2.35: measured share of the hour the worker was on the job */
    if (d.fam === 'water') { const a = d.out / 24 * prodMult(b), room = Math.max(0, cap - S.water), got = Math.min(a, room); S.water = Math.min(cap, S.water + a); wi += got; flow('water', nm, got); outPop(b, got, 'WATER', '#8fd8ff'); if (a > got) flow('water', 'Wasted: storage full', -(a - got)); }
    if (d.fam === 'scrap') { const a = d.out / 24 * prodMult(b) * (researched('salvage') ? 1.25 : 1); S.mat += a; flow('mat', nm, a); outPop(b, a, 'PARTS', '#9fe0ff'); }
    if (d.fam === 'research') { const a = (isWorking(b) ? d.out : 4) / 24 * prodMult(b); S.rp = (S.rp || 0) + a; outPop(b, a, 'RESEARCH', '#c7b6ff'); }
    if (d.fam === 'farm') { const need = d.waterUse / 24, frac = need > 0 ? Math.min(1, S.water / need) : 1; S.water -= need * frac; flow('water', 'Irrigation', -need * frac); b.dry = frac < 1; const a = d.out / 24 * frac * prodMult(b), room = Math.max(0, cap - S.food), got = Math.min(a, room); S.food = Math.min(cap, S.food + a); fi += got; flow('food', nm, got); outPop(b, got, 'FOOD', '#ffe06b'); if (a > got) flow('food', 'Wasted: storage full', -(a - got)); }
  }
  S.produced += fi + wi; dayLog.foodIn += fi; dayLog.waterIn += wi;
}
/* ---------------- V2.35 economy: expected daily rates from the same formulas as the simulation + an hourly ledger of what really happened ---------------- */
const RES_TITLE = { food: 'Food', water: 'Water', mat: 'Parts' };
const ECO = { start: null, cur: null, hist: [] };   // hist: last 24 game hours of { res: { category: amount } } (not saved: rebuilt after a load)
function flow(res, cat, amt) { if (!ECO.cur) ecoHour(); const r = ECO.cur[res]; r[cat] = (r[cat] || 0) + amt; }
function ecoHour() {   // close the hour: what is not explained by a recorded flow goes to "Other" (kills, story events, trader, purchases...)
  if (ECO.cur && ECO.start) { for (const k of ['food', 'water', 'mat']) { const rec = Object.values(ECO.cur[k]).reduce((a, v) => a + v, 0), res = (S[k] - ECO.start[k]) - rec; if (Math.abs(res) > .005) ECO.cur[k][res > 0 ? 'Other income' : 'Other spending'] = res; } ECO.hist.push(ECO.cur); if (ECO.hist.length > 24) ECO.hist.shift(); }
  ECO.cur = { food: {}, water: {}, mat: {} }; ECO.start = { food: S.food, water: S.water, mat: S.mat };
}
function ecoLast24(res) { const out = {}; for (const h of ECO.hist) for (const [k, v] of Object.entries(h[res])) out[k] = (out[k] || 0) + v; return { hours: ECO.hist.length, by: out }; }
const workShare = (b) => { if (!b.staff) return 0; const h = b.wh || []; return h.length >= 4 ? h.reduce((a, v) => a + v, 0) / h.length : .5; };   // measured; .5 until there are a few hours of history
function expectedMult(b) { const sh = workShare(b); return prodMult(b, false) * (1 - sh) + prodMult(b, true) * sh; }
function econ() {   // expected per-day flows for food, water and parts, with the buildings behind them
  const R = { food: { prod: [], use: [] }, water: { prod: [], use: [] }, mat: { prod: [], use: [] } }, need = rationNeed(), issues = [];
  let wAvail = 0; for (const b of world.buildings) { const d = DEFS[b.type]; if (d && d.fam === 'water') wAvail += d.out * expectedMult(b); }
  for (const b of world.buildings) {
    const d = DEFS[b.type]; if (!d) continue; const m = expectedMult(b), who = { b, name: d.name };
    if (d.fam === 'water') R.water.prod.push({ ...who, v: d.out * m });
    if (d.fam === 'scrap') R.mat.prod.push({ ...who, v: d.out * m * (researched('salvage') ? 1.25 : 1) });
    if (d.fam === 'farm') { const frac = S.water > 1 || wAvail > d.waterUse ? 1 : Math.min(1, S.water / (d.waterUse || 1)); R.food.prod.push({ ...who, v: d.out * m * frac }); R.water.use.push({ ...who, name: d.name + ' irrigation', v: d.waterUse * frac }); }
    const u = upkeepOf(b); if (u > 0) R.mat.use.push({ ...who, name: d.name + ' upkeep', v: u, group: 'Upkeep' });
    if (d.slot && !b.staff) issues.push({ b, t: `${d.name}: no ${(STAFF_JOBS[d.fam] || ['worker']).join(' or ')} assigned, base output only`, res: FAMRES(d.fam) });
    if (b.unpaid) issues.push({ b, t: `${d.name}: upkeep unpaid, half output`, res: FAMRES(d.fam) || 'mat' });
    if (b.fire || b.burnt) issues.push({ b, t: `${d.name}: ${b.fire ? 'on fire' : 'burnt down'}, no output`, res: FAMRES(d.fam) });
    if (d.fam === 'farm' && b.dry) issues.push({ b, t: `${d.name}: not enough water to irrigate`, res: 'food' });
  }
  R.food.use.push({ name: `Rations (${S.sv.length} survivors${(S.kids || []).length ? ', ' + S.kids.length + ' children' : ''})`, v: need.f });
  R.water.use.push({ name: `Rations (${S.sv.length} survivors${(S.kids || []).length ? ', ' + S.kids.length + ' children' : ''})`, v: need.w });
  const cap = supplyCap(), out = {};
  for (const k of ['food', 'water', 'mat']) {
    const P = R[k].prod.reduce((a, q) => a + q.v, 0), U = R[k].use.reduce((a, q) => a + q.v, 0), net = P - U, stock = S[k], c = k === 'mat' ? null : cap;
    out[k] = { k, stock, prod: P, use: U, net, cap: c, producers: R[k].prod.sort((a, b) => b.v - a.v), consumers: R[k].use.sort((a, b) => b.v - a.v), days: net < -1e-6 ? stock / -net : Infinity, fullIn: c && net > 1e-6 && stock < c ? (c - stock) / net : null, full: c ? stock >= c - .01 : false, issues: issues.filter((i) => i.res === k) };
  }
  return out;
}
const FAMRES = (fam) => fam === 'water' ? 'water' : fam === 'farm' ? 'food' : fam === 'scrap' ? 'mat' : null;
function supplyStats() {         // per-day picture for the Town panel and the rank conditions (V2.35: from econ(), so every screen shows the same numbers)
  const e = econ(), need = rationNeed().f * 2, wUse = e.water.consumers.filter((q) => q.b).reduce((a, q) => a + q.v, 0);
  return { need, fIn: e.food.prod, wIn: e.water.prod, wUse, fNet: e.food.net, wNet: e.water.net, fDays: e.food.days, wDays: e.water.days };
}
/* ---------------- V2.16 weekly Haven Review (DV2 town evaluation) ---------------- */
function weekStart() { S.wk = { kills: S.kills, produced: S.produced, fallen: (S.fallen || []).length, bosses: S.bossKills || 0, sat: S.sv.length ? S.sv.reduce((a, q) => a + (q.sat || 0), 0) / S.sv.length : 0 }; S.resWeek = 0; }
function havenReview() {
  const w = S.wk || { kills: 0, produced: 0, fallen: 0, bosses: 0 }, lost = (S.fallen || []).length - w.fallen;
  const avgSat = S.sv.length ? S.sv.reduce((a, q) => a + (q.sat || 0), 0) / S.sv.length : 0, types = new Set(world.buildings.map((b) => b.type)).size;
  const sc = {
    Population: Math.min(20, S.sv.length * 1.5 + residents()),
    Defense: Math.max(0, Math.min(20, (S.kills - w.kills) / 8 + ((S.bossKills || 0) - w.bosses) * 3 - lost * 5)),
    Supplies: Math.min(20, (S.produced - w.produced) / 10),
    Buildings: Math.min(20, types + world.buildings.length * .3),
    Happiness: Math.max(0, Math.min(20, (avgSat - (w.sat || 0)) / 8)),
    Research: Math.min(20, (S.resWeek || 0) * 4 + Object.keys(S.res || {}).length * .5),
  };
  const total = Math.round(Object.values(sc).reduce((a, v) => a + v, 0)), g = total >= 100 ? 'S' : total >= 80 ? 'A' : total >= 60 ? 'B' : total >= 40 ? 'C' : 'D';
  const R = { S: [30, 20, 'Beacon of Hope'], A: [20, 14, 'Thriving Haven'], B: [12, 8, 'Steady Settlement'], C: [6, 4, 'Struggling Camp'], D: [2, 0, 'Barely Holding On'] }[g];
  let item = null; if (g === 'S' || g === 'A') { const pool = ['gloves', 'belt', 'shoes', 'goggles', 'glasses', 'charm', 'dogtags']; item = pool[Math.floor(rnd() * pool.length)]; stashAdd(item); }
  S.mat += R[1]; renownGain(R[0], 'Weekly Haven Review: ' + g); S.titles = S.titles || []; if (!S.titles.includes(R[2])) S.titles.push(R[2]); S.lastReview = { week: Math.floor((S.day - 1) / 7), grade: g, total, sc };
  showEventPopup({ title: `HAVEN REVIEW · WEEK ${Math.floor((S.day - 1) / 7)} · GRADE ${g}`, text: Object.entries(sc).map(([k, v]) => `${k}: <b>${Math.round(v)}</b>/20`).join('<br>') + `<br><b>Total ${total}/120</b> — title: <b>${R[2]}</b>`, gains: `+${R[0]} Renown · +${R[1]} parts${item ? ' · ' + ITEMS[item].name : ''}` });
  weekStart();
}
/* ---------------- V2.17 Phase D: incidents (fire, break-in), rush production, pets, wandering trader ---------------- */
const RUSH_FAMS = ['water', 'farm', 'scrap', 'research'], RUSH_STAT = { water: 'per', farm: 'str', scrap: 'str', research: 'int' };
const nowH = () => S.day * 24 + S.hour;
const enclosedB = (b) => !OPEN_AIR.has(b.type);
function rushRisk(b) {   /* 30% base; a skilled worker on shift lowers it, rushing again soon raises it */
  const d = DEFS[b.type], s = isWorking(b) ? b.staff : null;
  return Math.max(.05, Math.min(.75, .3 - (s ? .1 + (stat(s, RUSH_STAT[d.fam] || 'end') - 5) * .02 : 0) + (b.rushes || 0) * .1));
}
function rushCheck(b) {
  const d = DEFS[b.type]; if (!RUSH_FAMS.includes(d.fam)) return { ok: false, why: '' };
  if (b.fire || b.burnt) return { ok: false, why: 'Not while it is burning or burnt' };
  if ((b.rushT || 0) > nowH()) return { ok: false, why: `Ready again in ${b.rushT - nowH()} h` };
  return { ok: true, why: '' };
}
function rush(b) {   /* four hours of output right now, or a fire */
  const c = rushCheck(b); if (!c.ok) { say(c.why); return false; }
  const d = DEFS[b.type], risk = rushRisk(b); b.rushT = nowH() + 6; b.rushes = (b.rushes || 0) + 1;
  if (rnd() < risk) { startFire(b, 40, 'The rush went wrong'); saveGame(); ui(); return true; }
  const a = (d.fam === 'research' && !isWorking(b) ? 4 : d.out) / 24 * 4 * prodMult(b); let t = '';
  if (d.fam === 'water') { S.water = Math.min(supplyCap(), S.water + a); S.produced += a; t = 'water'; }
  if (d.fam === 'farm') { S.water = Math.max(0, S.water - d.waterUse / 6); S.food = Math.min(supplyCap(), S.food + a); S.produced += a; t = 'food'; }
  if (d.fam === 'scrap') { S.mat += a * (researched('salvage') ? 1.25 : 1); t = 'parts'; }
  if (d.fam === 'research') { S.rp = (S.rp || 0) + a; t = 'RP'; }
  if (b.staff) gainXp(b.staff, 2);
  SFX('coin'); const p = Wd.doorPoint(b); floats.push({ w: { x: p.x, y: p.y }, t: `RUSH +${a.toFixed(1)} ${t.toUpperCase()}`, col: '#9fe58a', a: 80 });
  say(`Rushed the ${d.name}: +${a.toFixed(1)} ${t} now.`); saveGame(); ui(); return true;
}
function ejectFrom(b) {   /* everyone inside a building steps out of the door */
  const a = Wd.approachPoint(b);
  for (const q of S.sv) if (insideBuilding(q) === b || (q.mode === 'hiding' && q.hideAt === b)) {
    if (q.mode === 'useFacility' || q.mode === 'goFacility') q.facility = null; if (q.mode === 'hiding') q.hideAt = null;
    q.w = { x: a.x, y: a.y }; q.activity = null; enterFree(q, 10);
  }
}
function startFire(b, n = 30, why = '') {
  if (!world.buildings.includes(b) || b.burnt || (b.safeUntil || 0) > nowH()) return false; const was = b.fire; b.fire = Math.max(b.fire || 0, n); if (was) return true;
  ejectFrom(b); S.incidents = (S.incidents || 0) + 1;
  SFX('alarm'); note('critical', `Fire at the ${DEFS[b.type].name}`, { key: 'fire' + b.x + ',' + b.y, icon: '🔥', log: `${why ? why + ': ' : ''}the ${DEFS[b.type].name} is on fire! Nearby survivors will fight it (uses a little water). If it burns down it must be repaired.`, at: { x: b.x + b.w / 2, y: b.y + b.h / 2 }, live: () => !!b.fire && world.buildings.includes(b), dyn: () => `Fire at the ${DEFS[b.type].name} · ${Math.round(b.fire)}% · ${S.sv.filter((q) => q.fireAt === b).length} fighting it` });
  return true;
}
const gapB = (a, b) => Math.max(a.x - (b.x + b.w), b.x - (a.x + a.w), a.y - (b.y + b.h), b.y - (a.y + a.h), 0);
function burnDown(b) {
  b.fire = 0; b.burnt = true; releasePost(b); Wd.bump(world);
  for (const q of S.sv) if (q.fireAt === b && ['goFire', 'fightFire'].includes(q.mode)) { q.fireAt = null; q.activity = null; enterFree(q, 30); }
  note('important', '🏚 ' + DEFS[b.type].name.toUpperCase() + ' BURNED DOWN', { log: `The ${DEFS[b.type].name} burned down. It does nothing until repaired (tap it).` });
  { const nb = world.buildings.filter((o) => o !== b && !o.burnt && !o.fire && gapB(o, b) <= 1); if (nb.length && rnd() < .35) startFire(nb[Math.floor(rnd() * nb.length)], 25, 'The fire spread'); }   /* V2.18: at most one neighbour */
}
function fireOut(b) {
  b.fire = 0; const crew = S.sv.filter((q) => q.fireAt === b && ['goFire', 'fightFire'].includes(q.mode)); crew.forEach((q) => { q.fireAt = null; q.activity = null; gainXp(q, 3); enterFree(q, 40); });
  note('routine', `The fire at the ${DEFS[b.type].name} is out${crew.length ? ' — thanks to ' + crew.map((q) => q.name).join(', ') : ''}.`, { at: { x: b.x + b.w / 2, y: b.y + b.h / 2 }, float: '✔ FIRE OUT', col: '#9fe58a' }); renownGain(2, 'Fire put out');
}
const repairCost = (b) => Math.ceil(DEFS[b.type].mat * .25);
function repairBurnt(b) {
  if (!b.burnt || S.mat < repairCost(b)) return false; S.mat -= repairCost(b); b.burnt = false; b.safeUntil = nowH() + 24; Wd.bump(world); autoStaff();
  screenToast('🔨 ' + DEFS[b.type].name.toUpperCase() + ' REPAIRED'); saveGame(); ui(); return true;
}
const FIRE_FREE = ['free', 'wait', 'walk', 'goFacility', 'useFacility', 'goWork', 'work', 'postCombat'];
function incidentTick() {   /* every 30 ticks: fires grow, firefighters get sent */
  for (const b of [...world.buildings]) {
    if (!b.fire) continue; SFX('crackle'); b.fire += .35; if (b.fire >= 100) { burnDown(b); continue; }
    let crew = S.sv.filter((q) => q.fireAt === b && ['goFire', 'fightFire'].includes(q.mode)).length;
    if (crew >= 3) continue; const a = Wd.approachPoint(b);
    const c = S.sv.filter((q) => q.hp > q.max * .4 && FIRE_FREE.includes(q.mode) && q.purpose !== 'scav-out' && dist(q.w, a) < 10).sort((x, y) => dist(x.w, a) - dist(y.w, a));
    for (const q of c) { if (crew >= 3) break; if (insideBuilding(q)) { const ib = insideBuilding(q), p = Wd.approachPoint(ib); q.w = { x: p.x, y: p.y }; } q.fireAt = b; q.mode = 'goFire'; q.facility = null; q.activity = null; q.path = null; q.dest = null; q.purpose = null; q.target = null; q.why = 'Fighting the fire at the ' + DEFS[b.type].name; crew++; }
  }
}
function fireAI(s) {   /* modes goFire / fightFire */
  const b = s.fireAt; if (!b || !world.buildings.includes(b) || !b.fire) { s.fireAt = null; s.activity = null; enterFree(s, 40); return; }
  if (s.mode === 'goFire') { const r = followPath(s, Wd.approachPoint(b), CHASE); if (r === 'arrived') { s.mode = 'fightFire'; s.activity = 'Firefighting'; s.path = null; s.stateTicks = 30; } else if (r === 'fail') { s.fireAt = null; enterFree(s, 60); } return; }
  s.moving = false; if (s.stateTicks > 0) return; s.stateTicks = 30;
  const wet = S.water >= .1; if (wet) { S.water -= .1; flow('water', 'Firefighting', -.1); }   /* without water they beat it out at half speed */
  b.fire -= (wet ? 2 : 1) * Math.max(.6, sMod(s, 'end', .04)); if (b.fire <= 0) fireOut(b);
}
function breakIn() {   /* a zombie gets into a building; whoever is inside is forced out to face it */
  const occ = world.buildings.filter((b) => enclosedB(b) && !b.burnt && S.sv.some((q) => insideBuilding(q) === b)), pool = occ.length ? occ : world.buildings.filter((b) => enclosedB(b) && !b.burnt);
  if (!pool.length) return false; const b = pool[Math.floor(rnd() * pool.length)], a = Wd.approachPoint(b);
  ejectFrom(b); spawn(0, 0, rnd() < .3 ? 'runner' : 'walker'); const z = S.z[S.z.length - 1]; z.w = { x: a.x, y: a.y }; z.mode = 'idle'; z.stateTicks = 0; z.siege = false;
  S.alert = Math.max(S.alert, 900); S.incidents = (S.incidents || 0) + 1;
  SFX('alarm'); note('critical', `Zombie inside the ${DEFS[b.type].name}`, { key: 'breakin' + b.x + ',' + b.y, icon: '🧟', log: `A zombie broke into the ${DEFS[b.type].name}! Fighters are on their way.`, at: () => z.w, live: () => z.hp > 0 && S.z.includes(z), threats: true }); return b;
}
function incidentRoll() {   /* hourly, from day 2: about one incident every 2 days */
  if (S.day < 2 || world.buildings.some((b) => b.fire || b.burnt) || rnd() > 1 / 72) return;   /* about one every 3 days, never while a burnt building waits for repair */
  if (rnd() < .5) { const c = world.buildings.filter((b) => enclosedB(b) && !b.burnt); if (c.length) startFire(c[Math.floor(rnd() * c.length)], 30, 'An accident'); }
  else breakIn();
}
/* pets */
const PETS = {
  dog: { name: 'Dog', st: { per: 2, end: 1 }, desc: '+2 PER, +1 END · barks when raiders sneak close · sometimes digs up parts or food' },
  cat: { name: 'Cat', st: { cha: 2, int: 1 }, desc: '+2 CHA, +1 INT · comfort (+♥ daily) · catches pests (sometimes +food)' },
};
const PET_NAMES = { dog: ['Rex', 'Biscuit', 'Scout', 'Rusty', 'Bandit', 'Pepper', 'Moose'], cat: ['Miso', 'Tabby', 'Ghost', 'Noodle', 'Socks', 'Ash', 'Pip'] };
const newPet = (kind) => ({ kind, name: PET_NAMES[kind][Math.floor(rnd() * PET_NAMES[kind].length)] });
function givePet(s, i) { const p = (S.pets || [])[i]; if (!p || s.pet) return false; S.pets.splice(i, 1); s.pet = p; say(`${p.name} the ${PETS[p.kind].name} now follows ${s.name}.`); return true; }
function takePet(s) { if (!s.pet) return false; (S.pets = S.pets || []).push(s.pet); say(`${s.pet.name} stays in town for now.`); s.pet = null; return true; }
function petTick() {   /* every 30 ticks: dogs bark at sneaking raiders near their owner */
  for (const s of S.sv) { if (!s.pet || s.pet.kind !== 'dog' || s.hp <= 0 || s.mode === 'away') continue;
    for (const z of S.z) if (z.human && z.hp > 0 && z.mode === 'rsneak' && !z.barked && dist(z.w, s.w) < 4.5) { z.barked = true; SFX('woof'); S.alert = Math.max(S.alert, 900); floats.push({ w: { ...s.w }, t: 'WOOF!', col: '#ffe38a', a: 70 }); if ((S.barkT || 0) < tick) { S.barkT = tick + 600; note('routine', `${s.pet.name} is barking — raiders spotted near ${s.name}!`); } } }
}
function petDaily() {
  for (const s of S.sv) { if (!s.pet || s.hp <= 0) continue;
    if (s.pet.kind === 'dog' && rnd() < .35) { const k = rnd() < .5 ? 'mat' : 'food'; S[k] += 1; floats.push({ w: { ...s.w }, t: `+1 ${k === 'mat' ? 'PARTS' : 'FOOD'} (${s.pet.name})`, col: '#9fe58a', a: 80 }); }
    if (s.pet.kind === 'cat') { s.sat = Math.min(100, (s.sat || 0) + 3); if (rnd() < .3) { S.food += 1; floats.push({ w: { ...s.w }, t: `+1 FOOD (${s.pet.name})`, col: '#9fe58a', a: 80 }); } }
  }
}
const PET_ART = {   /* true pixel art, facing left, one art px = one map px; 2 frames (stand, step) */
  dog: { pal: { k: '#2a1d16', b: '#9a6a3c', l: '#d6aa70', e: '#111111' }, f: [
    ['..kk.........', '.kbbk......k.', 'kebbbk....kbk', 'kbbbbkkkkkkbk', '.kkbbbbbbbbk.', '...kllllllbk.', '...kbk..kbk..', '...kbk..kbk..', '...kk...kk...'],
    ['..kk.........', '.kbbk......k.', 'kebbbk....kbk', 'kbbbbkkkkkkbk', '.kkbbbbbbbbk.', '...kllllllbk.', '..kbk....kbk.', '.kbk......kbk', '.kk........kk']] },
  cat: { pal: { k: '#2a1d16', g: '#7c7c86', h: '#bebec6', y: '#e8d040', n: '#c85a5a' }, f: [
    ['.k.k......k.', 'kgkgk....kgk', 'kygyk....kgk', 'kgngkkkkkgk.', '.kghhhhhggk.', '..khhhhhhgk.', '..kgk..kgk..', '..kgk..kgk..', '..kk...kk...'],
    ['.k.k......k.', 'kgkgk....kgk', 'kygyk....kgk', 'kgngkkkkkgk.', '.kghhhhhggk.', '..khhhhhhgk.', '.kgk....kgk.', 'kgk......kgk', 'kk........kk']] },
};
const petSheets = {};
function petSheet(kind) {
  if (petSheets[kind]) return petSheets[kind]; const a = PET_ART[kind], fw = a.f[0][0].length, fh = a.f[0].length, c = document.createElement('canvas'); c.width = fw * 2; c.height = fh; const g = c.getContext('2d');
  a.f.forEach((fr, i) => fr.forEach((row, y) => [...row].forEach((ch, x) => { if (ch !== '.') { g.fillStyle = a.pal[ch]; g.fillRect(i * fw + x, y, 1, 1); } })));
  c.complete = true; c.naturalWidth = c.width; c.naturalHeight = c.height; return (petSheets[kind] = { c, fw, fh });
}
const PETPOS = new WeakMap();
function petPos(s) {   /* trails a little behind its owner */
  let p = PETPOS.get(s); const tx = s.w.x + .36, ty = s.w.y - .12; if (!p) { p = { w: { x: tx, y: ty } }; PETPOS.set(s, p); }
  const dx = tx - p.w.x, dy = ty - p.w.y, d = Math.hypot(dx, dy); if (d > 3) { p.w.x = tx; p.w.y = ty; } else if (d > .05) { const k = Math.min(1, .06 + d * .05); p.w.x += dx * k; p.w.y += dy * k; }
  p.moving = d > .08; return p;
}
function drawPix(key, img, frame, fw, fh, p, flip, noShadow = false) {   /* same sharp-bilinear path as drawSheet, with a pet-sized shadow */
  const tw = TWs(), sc = tw / APX, want = sc * DPR, m = pxm(want), big = pixelUp(key, img, m), snap = (v) => Math.round(v * DPR) / DPR, w = fw * sc, h = fh * sc, y = snap(p.y - fh * sc);
  if (!noShadow) { ctx.fillStyle = 'rgba(0,0,0,.25)'; ctx.beginPath(); ctx.ellipse(p.x, p.y, w * .45, .05 * tw, 0, 0, 7); ctx.fill(); }
  ctx.imageSmoothingEnabled = want < m - .02; ctx.imageSmoothingQuality = 'high';
  if (flip) { ctx.save(); ctx.translate(snap(p.x), 0); ctx.scale(-1, 1); ctx.drawImage(big, frame * fw * m, 0, fw * m, fh * m, -w / 2, y, w, h); ctx.restore(); }
  else ctx.drawImage(big, frame * fw * m, 0, fw * m, fh * m, snap(p.x - w / 2), y, w, h);
  ctx.imageSmoothingEnabled = true;
}
function drawPet(s, pp) {
  const sh = petSheet(s.pet.kind), fc = facing(pp), f = pp.moving ? Math.floor((tick + s.i * 7) / 8) % 2 : 0;
  drawPix('pet' + s.pet.kind, sh.c, f, sh.fw, sh.fh, project(pp.w.x, pp.w.y), fc.right);
}
/* wandering trader */
const TRADER_TINT = (r, g, b) => (r > 190 && g > 165 && b > 120 && r - b < 110 ? [Math.round(r * .25), Math.round(g * .62), Math.round(b * .58)] : [r, g, b]);   // teal coat
const TRADES = [{ give: { food: 6 }, get: { mat: 4 } }, { give: { water: 6 }, get: { mat: 4 } }, { give: { mat: 5 }, get: { food: 6 } }, { give: { mat: 5 }, get: { water: 6 } }];
const RES_NAME = { food: 'food', water: 'water', mat: 'parts' };
function traderDisc() { const c = Math.max(5, ...S.sv.filter((q) => q.hp > 0 && q.mode !== 'away').map((q) => stat(q, 'cha'))); return Math.min(.3, Math.max(0, (c - 5) * .02)); }
const priced = (cost) => Object.fromEntries(Object.entries(cost).map(([k, v]) => [k, Math.max(1, Math.ceil(v * (1 - traderDisc())))]));
const costText = (c) => Object.entries(c).map(([k, v]) => v + ' ' + RES_NAME[k]).join(' + ');
const canPay = (c) => Object.entries(c).every(([k, v]) => S[k] >= v);
function traderStock() {
  const gear = Object.keys(ITEMS).filter((id) => id !== 'pipe' && ITEMS[id].cost >= 4), st = [];
  while (st.length < 3 && gear.length) { const id = gear.splice(Math.floor(rnd() * gear.length), 1)[0]; st.push({ k: 'item', id, cost: { mat: Math.ceil(ITEMS[id].cost * 1.1), food: 3 } }); }
  st.push({ k: 'pet', id: rnd() < .5 ? 'dog' : 'cat', cost: { food: 6, water: 6 } }); st.push({ k: 'rp', n: 15, cost: { mat: 8 } }); return st;
}
function traderArrive() {
  const a = spawnPoint(), cx = Math.round((Wd.BUILD.x0 + Wd.BUILD.x1) / 2), cy = Math.round((Wd.BUILD.y0 + Wd.BUILD.y1) / 2), g = Wd.nearestWalkable(world, cx, cy) || { x: cx, y: cy };
  S.trader = { human: true, w: tc(a[0], a[1]), home: tc(a[0], a[1]), goal: tc(g.x, g.y), mode: 'arrive', stock: traderStock(), ex: [0, 0, 0, 0], path: null };
  S.nextTrader = S.day + 3 + Math.floor(rnd() * 2);
  screenToast('🛒 A WANDERING TRADER ARRIVES'); say('A wandering trader is coming to the Haven until 19:00. Tap them (or Town → Trade) to buy gear, pets or research.');
}
function traderTick() {
  const T = S.trader; if (!T) return; T.moving = false;
  if (T.mode === 'arrive') { const r = followPath(T, T.goal, WALK * 1.2); T.moving = r === 'moving'; if (r !== 'moving') { T.mode = 'stay'; T.path = null; } }
  else if (T.mode === 'leave') { const r = followPath(T, T.home, WALK * 1.3); T.moving = r === 'moving'; if (r !== 'moving') S.trader = null; }
}
function traderLeave() { if (!S.trader || S.trader.mode === 'leave') return; S.trader.mode = 'leave'; S.trader.path = null; say('The wandering trader is packing up and leaving.'); }
function traderBuy(i) {
  const T = S.trader, o = T && T.stock[i]; if (!o || o.sold) return false; const c = priced(o.cost); if (!canPay(c)) return false;
  for (const [k, v] of Object.entries(c)) S[k] -= v; o.sold = true; SFX('coin');
  if (o.k === 'item') { stashAdd(o.id); say(`Bought a ${ITEMS[o.id].name}. It's in the stash.`); }
  if (o.k === 'pet') { const p = newPet(o.id); (S.pets = S.pets || []).push(p); say(`Adopted ${p.name} the ${PETS[o.id].name}! Tap a survivor → Pet to give it an owner.`); }
  if (o.k === 'rp') { S.rp = (S.rp || 0) + o.n; say(`Bought research notes: +${o.n} RP.`); }
  saveGame(); ui(); return true;
}
function traderTrade(i) {
  const T = S.trader, t = TRADES[i]; if (!T || T.ex[i] >= 3) return false; const c = i < 2 ? t.give : priced(t.give); if (!canPay(c)) return false;
  for (const [k, v] of Object.entries(c)) S[k] -= v; for (const [k, v] of Object.entries(t.get)) S[k] += v; T.ex[i]++; saveGame(); ui(); return true;
}
function showTrader() {
  const T = S.trader; if (!T) return; selected = null; closeP(); $('it').textContent = 'WANDERING TRADER'; const disc = Math.round(traderDisc() * 100);
  const tIcon = (o) => { const src = o.k === 'item' && window.ZHItems && ZHItems.icon(o.id); return src ? `<img class="pix tIco" src="${src}" alt="">` : `<span class="tIco">${o.k === 'pet' ? (o.id === 'dog' ? '🐕' : '🐈') : o.k === 'rp' ? '📜' : '📦'}</span>`; };   /* V2.33: item icons in the trader menu */
  const offer = (o) => tIcon(o) + (o.k === 'item' ? `${ITEMS[o.id].name}<small> · ${itemText(ITEMS[o.id])}</small>` : o.k === 'pet' ? `${PETS[o.id].name}<small> · ${PETS[o.id].desc}</small>` : `Research notes<small> · +${o.n} RP</small>`);
  $('ib').innerHTML = `Leaves at 19:00. Prices ${disc ? `<b>−${disc}%</b> (your best Charisma)` : 'are full price — a survivor with high Charisma gets a discount'}.<br><b>For sale</b><br>`
    + T.stock.map((o, i) => o.sold ? `<div><small>✔ sold: ${o.k === 'item' ? ITEMS[o.id].name : o.k === 'pet' ? PETS[o.id].name : 'Research notes'}</small></div>` : `<button class="act" data-buy="${i}" ${canPay(priced(o.cost)) ? '' : 'style="opacity:.45"'}>${offer(o)} · ${costText(priced(o.cost))}</button>`).join('')
    + '<br><b>Exchange</b> <small>(3 times each per visit)</small><br>' + TRADES.map((t, i) => { const c = i < 2 ? t.give : priced(t.give); return `<button class="act" data-trade="${i}" ${T.ex[i] < 3 && canPay(c) ? '' : 'style="opacity:.45"'}>${costText(c)} → ${costText(t.get)} <small>(${3 - T.ex[i]} left)</small></button>`; }).join('');
  showPanel();
  $('ib').querySelectorAll('[data-buy]').forEach((x) => { x.onclick = () => { if (traderBuy(+x.dataset.buy)) showTrader(); }; });
  $('ib').querySelectorAll('[data-trade]').forEach((x) => { x.onclick = () => { if (traderTrade(+x.dataset.trade)) showTrader(); }; });
}
function drawTrader() {
  const T = S.trader, p = project(T.w.x, T.w.y); if (!T.look) T.look = { sex: 'm', skin: 1, hair: 5 }; T.job = 'Trader';
  const sc = window.ZHChars && ZHChars.ready && ZHChars.sheet('Trader', 'm'); if (sc) drawChar(T, sc, p, null);
  const top = p.y - CHAR_H * TWs() - 3; bubble({ x: p.x, y: top - 3 }, '🛒'); stampText('TRADER', p.x, p.y + .36 * TWs(), `${Math.round(Math.max(15, 15 * cam.z))}px 'Jersey 15', monospace`, '#9fffe0');
}
function hitTrader(px, py) { const T = S.trader; if (!T) return false; const p = project(T.w.x, T.w.y), d = Math.hypot(px - p.x, py - (p.y - CHAR_H * TWs() * .5)); return d < Math.max(24, .45 * TWs()); }
function drawFire(b) {   /* pixel flames on a burning building, smoke over a burnt one */
  const r = spriteRect(b); if (!r) return; const px = TWs() / APX, n = b.burnt ? 0 : 3 + Math.floor(b.fire / 15), cols = ['#ffe36b', '#ff9a2e', '#e2452b'];
  for (let i = 0; i < n; i++) {
    const fx = r.x + r.w * (.18 + ((i * 37) % 64) / 100), fy = r.y + r.h * (.42 + ((i * 23) % 30) / 100), hgt = 8 + ((Math.floor(tick / 5) + i * 3) % 5);
    const sway = ((Math.floor(tick / 7) + i) % 3) - 1;
    for (let k = 0; k < hgt; k++) {   /* k = 0 is the base: wide red-orange outside, yellow core, narrowing to a flickering tip */
      const wd = k < 3 ? 5 : k < 6 ? 3 : 1, sx = fx + (k > 5 ? sway * px : 0), y = Math.round(fy - (k + 1) * px);
      ctx.fillStyle = k > hgt - 3 ? cols[2] : cols[1]; ctx.fillRect(Math.round(sx - wd * px / 2), y, Math.ceil(wd * px), Math.ceil(px));
      if (wd >= 3 && k < hgt - 3) { ctx.fillStyle = cols[0]; ctx.fillRect(Math.round(sx - (wd - 2) * px / 2), y, Math.ceil((wd - 2) * px), Math.ceil(px)); }
    }
  }
  const puffs = b.burnt ? 3 : 2; for (let i = 0; i < puffs; i++) { const t = ((tick + i * 40) % 120) / 120, sx = r.x + r.w * (.35 + i * .15) + Math.sin(t * 6 + i) * 3 * px, sy = r.y + r.h * .3 - t * 14 * px; ctx.fillStyle = `rgba(70,70,70,${(.55 * (1 - t)).toFixed(2)})`; const sz = Math.ceil((3 + t * 3) * px); ctx.fillRect(Math.round(sx), Math.round(sy), sz, sz); }
  if (b.burnt) bubble({ x: r.x + r.w / 2, y: r.y + r.h * .25 }, '🏚');
}
const BURNT_TINT = (r, g, b) => { const l = (r + g + b) / 3; return [Math.round(l * .38 + r * .1), Math.round(l * .34 + g * .06), Math.round(l * .32 + b * .05)]; };
/* ---------------- V2.22 bonds: friendships, couples and children (Fallout Shelter style) ---------------- */
const BOND = { acq: 20, friend: 50, close: 80 }, bondDay = new Map();
const bondOf = (a, b) => (a.rel && a.rel[b.id]) || 0;
const bondName = (v) => (v >= BOND.close ? 'Close friend' : v >= BOND.friend ? 'Friend' : v >= BOND.acq ? 'Acquaintance' : 'Stranger');
function addBond(a, b, n) {
  if (!a || !b || a === b) return; a.rel = a.rel || {}; b.rel = b.rel || {}; const pk = Math.min(a.id, b.id) + '-' + Math.max(a.id, b.id), today = bondDay.get(pk) || 0; if (today >= 20) return; bondDay.set(pk, today + n);   /* at most ~20 a day per pair */
  const before = bondOf(a, b), m = n * (hasT(a, 'caring') || hasT(b, 'caring') ? 1.5 : 1) * (hasT(a, 'loner') || hasT(b, 'loner') ? .5 : 1) * Math.max(.6, (sMod(a, 'cha', .04) + sMod(b, 'cha', .04)) / 2) * Math.max(.25, 1 - before / 150), v = Math.min(100, before + m);   /* each step up is harder */
  a.rel[b.id] = v; b.rel[a.id] = v;
  for (const [k, lvl] of [['friend', BOND.friend], ['close', BOND.close]]) if (before < lvl && v >= lvl) { if (k === 'friend') S.friendsMade = (S.friendsMade || 0) + 1; floats.push({ w: { x: (a.w.x + b.w.x) / 2, y: (a.w.y + b.w.y) / 2 }, t: k === 'close' ? '♥ CLOSE FRIENDS' : '♥ FRIENDS', col: '#ff9ac8', a: 90 }); note('routine', `${a.name} and ${b.name} are now ${k === 'close' ? 'close friends' : 'friends'}.`); }
}
function bondTick() {   /* every 120 ticks: time together builds bonds */
  const L = S.sv.filter((q) => q.hp > 0 && !['down', 'away'].includes(q.mode));
  for (let i = 0; i < L.length; i++) for (let j = i + 1; j < L.length; j++) {
    const a = L[i], b = L[j]; let n = 0;
    if (a.facility && a.facility === b.facility && a.mode === 'useFacility' && b.mode === 'useFacility') n += 1.6;   /* eating, resting or training together */
    else if (dist(a.w, b.w) < 1.6) n += .5;
    if (a.target && a.target === b.target && ['chase', 'attack', 'recover'].includes(a.mode) && ['chase', 'attack', 'recover'].includes(b.mode)) n += 1.2;   /* fighting side by side */
    if (n) addBond(a, b, n);
  }
}
function friendBoost(s) {   /* damage bonus with a friend fighting within 3 tiles */
  let best = 0; for (const q of S.sv) if (q !== s && q.hp > 0 && ['chase', 'attack', 'recover'].includes(q.mode) && dist(q.w, s.w) < 3) best = Math.max(best, bondOf(s, q));
  return best >= BOND.close ? 1.15 : best >= BOND.friend ? 1.1 : 1;
}
const popCap = () => Math.max(8, Math.min(16, 6 + 2 * bOf('house').length));
const waitingCouples = () => S.sv.filter((q) => q.partner && q.id < q.partner && !(S.kids || []).some((k) => k.parents.includes(q.id))).length;
const popNow = () => S.sv.length + (S.trip ? S.trip.members.length : 0) + (S.kids || []).length;
const KID_NAMES = ['Ivy', 'Finn', 'Nora', 'Kai', 'Wren', 'Juno', 'Milo', 'Pip', 'Remy', 'Tess', 'Zane', 'Bea', 'Ash', 'Lux', 'Rio', 'Sage', 'Cole', 'Dot', 'Fern', 'Hugo'];
function bondsDaily() {
  S.kids = S.kids || []; bondDay.clear();
  for (const s of S.sv) if (s.rel) for (const id in s.rel) if (+id !== s.partner && s.rel[id] < 90) s.rel[id] = Math.max(0, s.rel[id] - 1);   /* bonds fade a little unless kept up */
  for (const s of S.sv) if (s.rel) { const f = Object.entries(s.rel).filter(([id, v]) => v >= BOND.friend && S.sv.some((q) => q.id === +id)).length; if (f) s.sat = Math.min(100, (s.sat || 0) + Math.min(3, f * .6)); }   /* friends keep spirits up */
  // couples: two single residents who are close friends
  const single = S.sv.filter((q) => q.resident && !q.partner && q.hp > 0 && q.mode !== 'away');
  for (let i = 0; i < single.length; i++) for (let j = i + 1; j < single.length; j++) { const a = single[i], b = single[j]; if (a.partner || b.partner || bondOf(a, b) < BOND.close || rnd() > .2) continue;
    a.partner = b.id; b.partner = a.id; SFX('chime'); showEventPopup({ title: '💑 A NEW COUPLE', text: `${a.name} and ${b.name} have grown close and are now a couple.`, gains: 'They may start a family when the Haven has room (more Houses = more room).' }); }
  // children grow up
  for (const k of [...S.kids]) { k.age = (k.age || 0) + 1; if (k.age >= 5) growUp(k); }
  // new babies
  for (const a of S.sv) { if (!a.partner || a.id > a.partner) continue; const b = S.sv.find((q) => q.id === a.partner); if (!b) continue;
    if (S.kids.some((k) => k.parents.includes(a.id)) || popNow() >= popCap() || (a.sat || 0) < 40 || (b.sat || 0) < 40 || S.food < 10 || S.water < 10 || rnd() > .45) continue;
    const name = KID_NAMES.find((n) => !S.sv.some((q) => q.name === n) && !S.kids.some((k) => k.name === n)) || 'Kid ' + (S.kids.length + 1);
    S.born = (S.born || 0) + 1; S.kids.push({ name, age: 0, parents: [a.id, b.id], st: Object.fromEntries(STATS.map((k) => [k, Math.round((((a.st && a.st[k]) || 5) + ((b.st && b.st[k]) || 5)) / 2)])) });
    SFX('reward'); renownGain(5, 'A baby is born'); showEventPopup({ title: '👶 A BABY IS BORN', text: `${a.name} and ${b.name} welcome little ${name}. ${name} will grow up in the Houses and join the Haven in 5 days.`, gains: `Inherits the parents' stats · eats half a ration until grown` });
  }
}
function growUp(k) {
  S.grown = (S.grown || 0) + 1;
  S.kids = S.kids.filter((q) => q !== k); const h = bOf('house')[0], p = h ? Wd.approachPoint(h) : tc(7, 10);
  const v = mk(k.name, 'Civilian', 1, Math.floor(p.x), Math.floor(p.y), S.sv.length); v.w = { x: p.x, y: p.y };
  for (const s of STATS) v.st[s] = Math.min(STAT_CAP, Math.max(1, (k.st[s] || 5) + (rnd() < .5 ? 1 : 0))); v.max = baseMax(v); v.hp = v.max; v.resident = true; v.sat = 40; v.parents = [...k.parents];
  v.rel = {}; for (const pid of k.parents) { const par = S.sv.find((q) => q.id === pid); if (par) { v.rel[pid] = 90; par.rel = par.rel || {}; par.rel[v.id] = 90; } }
  S.sv.push(v); SFX('reward'); showEventPopup({ title: '🧑 ' + k.name.toUpperCase() + ' HAS GROWN UP', text: `${k.name} is ready to help the Haven. Give them a profession from the survivor panel (Job tab).`, gains: 'New resident · Civilian Lv.1 · stats from the parents' + traitTag(v) }); ui();
}
function bondsOnDeath(s) {   /* grief, and the bonds are cleared */
  for (const q of S.sv) { const v = bondOf(q, s), gm = hasT(q, 'caring') ? 1.5 : hasT(q, 'loner') ? .3 : 1; if (q.partner === s.id) { q.partner = null; q.sat = Math.max(0, (q.sat || 0) - 30 * gm); q.why = 'Grieving for ' + s.name; } else if (v >= BOND.friend) { q.sat = Math.max(0, (q.sat || 0) - (v >= BOND.close ? 20 : 12) * gm); q.why = 'Grieving for ' + s.name; } if (q.rel) delete q.rel[s.id]; }
  for (const k of S.kids || []) k.parents = k.parents.filter((id) => id !== s.id);
}
function bondsHtml(u) {
  const rows = Object.entries(u.rel || {}).map(([id, v]) => [S.sv.find((q) => q.id === +id), v]).filter(([q, v]) => q && v >= 5).sort((a, b) => b[1] - a[1]).slice(0, 8);
  const partner = u.partner && S.sv.find((q) => q.id === u.partner), kids = (S.kids || []).filter((k) => k.parents.includes(u.id)), grown = S.sv.filter((q) => (q.parents || []).includes(u.id));
  return (partner ? `💑 Partner: <b>${esc(partner.name)}</b><br>` : '') + (grown.length ? `🧑 Grown-up: <b>${grown.map((q) => esc(q.name)).join(', ')}</b><br>` : '') + (kids.length ? `👶 Child: <b>${kids.map((k) => esc(k.name) + ' (grows up in ' + (5 - k.age) + ' day' + (5 - k.age === 1 ? '' : 's') + ')').join(', ')}</b><br>` : '')
    + '<b>Bonds</b> <small>(time together, eating/training together, fighting side by side; friends fight 10% harder together)</small><br>'
    + (rows.length ? rows.map(([q, v]) => `<div style="display:flex;gap:6px;align-items:center"><span style="width:84px">${esc(q.name)}</span><span style="flex:1">${meter(v)}</span><small style="width:92px;text-align:right">${q.id === u.partner ? '💑 Partner' : (q.parents || []).includes(u.id) ? '👶 Child' : (u.parents || []).includes(q.id) ? 'Parent' : bondName(v)}</small></div>`).join('') : '<small>No bonds yet — give them time together.</small>');
}
function endOfDay() {            // rations: every survivor eats half food, half water; a shortfall makes them hungry and thirsty (gentle, no damage yet)
  const up = payUpkeep();
  for (const b of world.buildings) if (b.rushes) b.rushes--; petDaily(); bondsDaily(); try { legacyCheck(); } catch (e) { /* never block the day */ }
  for (const q of S.sv) if (hasT(q, 'scrounger') && q.hp > 0 && q.mode !== 'down' && rnd() < .5) { S.mat += 1; flow('mat', 'Scrounged (trait)', 1); note('routine', `${q.name} scrounged a spare part.`, { at: q.w, float: '🔍 +1 PART', col: '#9fe0ff' }); }   /* V2.43 */
  if (!S.wk) weekStart(); if (S.day > 1 && (S.day - 1) % 7 === 0) havenReview();
  let nf = 0, nw = 0; for (const q of S.sv) { nf += ration(q) / 2; nw += ration(q) / 2; } for (const k of S.kids || []) { nf += .25; nw += .25; }   /* children eat half a ration */
  const ef = Math.min(S.food, nf), ew = Math.min(S.water, nw); S.food -= ef; S.water -= ew; flow('food', 'Rations', -ef); flow('water', 'Rations', -ew);
  const ff = nf ? ef / nf : 1, fw = nw ? ew / nw : 1;
  for (const q of S.sv) { q.hunger = ff < 1 ? Math.min(100, q.hunger + 28 * (1 - ff)) : Math.max(0, q.hunger - 35); q.thirst = fw < 1 ? Math.min(100, q.thirst + 28 * (1 - fw)) : Math.max(0, q.thirst - 35); } /* a full ration relieves the meters; a shortfall raises them */
  const open = world.buildings.filter((b) => DEFS[b.type].slot && !b.staff).map((b) => DEFS[b.type].name);
  const f1 = (n) => (Math.round(n * 10) / 10).toFixed(1);
  note('routine', `Day ${S.day - 1} · Food +${f1(dayLog.foodIn)} −${f1(ef)} · Water +${f1(dayLog.waterIn)} −${f1(ew)} · Upkeep −${f1(up.paid)} parts${up.unpaid ? ` (${up.unpaid} unpaid)` : ''}` + (open.length ? ` · Open staff slot: ${[...new Set(open)].join(', ')}` : ''));
  dayLog.foodIn = dayLog.waterIn = 0;
  if (ff < 1) note('critical', 'Out of food: rations were short today', { key: 'nofood', icon: '🍖', live: () => S.food < rationNeed().f, dyn: () => `Out of food · ${S.food.toFixed(1)} of ${rationNeed().f.toFixed(1)} needed per day`, acts: [{ label: 'Why?', fn: () => showResource('food') }] }); else if (S.food < nf) note('important', '⚠ FOOD: under 1 day left');
  if (fw < 1) note('critical', 'Out of water: rations were short today', { key: 'nowater', icon: '💧', live: () => S.water < rationNeed().w, dyn: () => `Out of water · ${S.water.toFixed(1)} of ${rationNeed().w.toFixed(1)} needed per day`, acts: [{ label: 'Why?', fn: () => showResource('water') }] }); else if (S.water < nw) note('important', '⚠ WATER: under 1 day left');
}
function releasePost(b) { if (b.staff) { if (b.staff.post === b) b.staff.post = null; b.staff = null; } }
function autoStaff() {           // one slot per building; a matching profession is assigned automatically, the best level first
  for (const q of S.sv) if (q.post && (!world.buildings.includes(q.post) || q.post.staff !== q)) q.post = null;
  for (const b of world.buildings) {
    const d = DEFS[b.type]; if (!d || !d.slot) continue; if (b.burnt) { releasePost(b); continue; } const jobs = STAFF_JOBS[d.fam] || [];
    if (b.staff && (!S.sv.includes(b.staff) || !jobs.includes(b.staff.job))) releasePost(b);
    if (b.staff) continue;
    const c = S.sv.filter((q) => !q.post && q.hp > 0 && !['down', 'hospital'].includes(q.mode) && jobs.includes(q.job)).sort((x, y) => (y.l - x.l) || (dist(x.w, Wd.doorPoint(b)) - dist(y.w, Wd.doorPoint(b))));
    if (c.length) { b.staff = c[0]; c[0].post = b; note('routine', `${c[0].name} will staff the ${d.name}.`); }
  }
}
function upgradeCheck(b) {
  const d = DEFS[b.type], n = d.next && DEFS[d.next]; if (!n) return { ok: false, why: 'Already the highest tier available' };
  if (S.rank < n.rank) return { ok: false, why: `Needs Haven rank ${n.rank}` };
  if (S.mat < d.up) return { ok: false, why: `Needs ${d.up} parts` };
  { const nr = Wd.rotDef(n, Wd.R4(b)); if (nr.w !== b.w || nr.h !== b.h) return { ok: false, why: 'Footprint differs' }; }
  const chk = Wd.placementCheck(world, b.x, b.y, Wd.rotDef(n, Wd.R4(b)), b); if (!chk.ok) return { ok: false, why: chk.why };
  return { ok: true, why: '' };
}
function upgradeBuilding(b) {    // in place: same footprint, same anchor; the building keeps working and keeps its staff
  const c = upgradeCheck(b); if (!c.ok) { say(c.why); return false; }
  const d = DEFS[b.type], n = DEFS[d.next]; S.mat -= d.up; b.type = d.next; b.q = n.q; b.a = n.a; Wd.bump(world);
  renownGain(2, n.name); banner('⬆ ' + n.name.toUpperCase()); say(`${d.name} upgraded to ${n.name}.`, true); autoStaff(); saveGame(); ui(); return true;
}
function queueResidentRequest(s) { S.requests.push({ type: 'resident', s }); showNextRequest(); }
function showNextRequest() {
  const box = $('requestBox'); if (!box || box.innerHTML || !S.requests.length) return; const q = S.requests[0], s = q.s;
  box.innerHTML = `<div class="request frame"><b class="out">🏠 Move-in request</b><br>${s.name} wants to make the Haven home. <span style="color:#ff9ab0">♥${Math.floor(s.sat)}</span><br><button class="act go out" id="acceptReq">Accept</button><button class="act danger out" id="declineReq">Not yet</button></div>`;
  $('acceptReq').onclick = () => { s.resident = true; renownGain(4, 'New resident'); say(s.name + ' became a resident!', true); S.requests.shift(); box.innerHTML = ''; showNextRequest(); ui(); };
  $('declineReq').onclick = () => { s.requested = false; s.sat = Math.max(20, s.sat - 5); S.requests.shift(); box.innerHTML = ''; showNextRequest(); ui(); };
}
function visitorArrival() {
  if (S.finale) return;   /* V2.46: nobody travels during the final stand */ S.arrivalClock++; if (S.arrivalClock < (popNow() < popCap() * .6 ? 1100 : 2200) / (ST().arrive && S.day <= 7 ? ST().arrive : 1) || popNow() >= popCap() - waitingCouples()) return;   /* leave room for couples to start a family */ S.arrivalClock = 0;
  const names = ['Noah', 'Maya', 'Eli', 'June', 'Rosa', 'Theo'], jobs = ['Civilian', 'Scavenger', 'Guard', 'Medic', 'Farmer', 'Engineer', 'Cook'];
  const name = names.find((n) => !S.sv.some((s) => s.name === n)) || 'Survivor ' + (S.sv.length + 1), job = jobs[Math.floor(rnd() * jobs.length)], lv = Math.max(1, Math.min(6, S.rank - 1 + Math.floor(rnd() * 2))), v = mk(name, job, lv, 7, 6, S.sv.length);   /* V2.18: newcomers to a bigger Haven are more experienced */
  v.sat = 3; v.stateTicks = 80; giveSpare(v); S.sv.push(v); showEventPopup({ title: 'NEW SURVIVOR', text: name + ', a ' + job + ', has arrived at the Haven and is looking around.' + (TRAITS[v.trait] ? `<br><br>${TRAITS[v.trait].icon} <b>${TRAITS[v.trait].name}</b>: ${traitGood(v)}. <i>${TRAITS[v.trait].bad}.</i>` : ''), gains: job + ' · Lv.' + lv + traitTag(v) }); say(name + ' arrived at the Haven.', true); ui();
}
/* ---------------- V2.19 guided goals (one system at a time, then random missions) + event log ---------------- */
const GUIDE = [
  { name: 'Grow Food', desc: 'Build a Garden Plot', hint: 'Build → Garden Plot. Every survivor eats a daily ration of food and water. A Farmer staffs it automatically (green dot) and makes it produce more.', done: () => bOf('farm').length + bOf('field').length > 0, parts: 3, ren: 4 },
  { name: 'A Place to Rest', desc: 'Build a second House', hint: 'Tired survivors rest in Houses. More homes also make the Haven a place people want to live in.', done: () => bOf('house').length >= 2, parts: 3, ren: 4 },
  { name: 'Make It Home', desc: 'Accept a move-in request', hint: 'Happy survivors (♥ 35 or more) ask to move in. Tap ACCEPT when the request appears. Residents count toward the next Haven rank.', done: () => residents() >= 1, parts: 4, ren: 5 },
  { name: 'Scrap Economy', desc: 'Build a Scrapyard', hint: 'Every building costs a little upkeep in parts each day (a building that can\'t be paid runs at half output). A Scrapyard staffed by a Scavenger or Engineer makes parts. Kills, missions and expeditions also bring parts.', done: () => bOf('scrapyard').length > 0, parts: 4, ren: 5 },
  { name: 'Gear Up', desc: 'Get a survivor some armor', hint: 'Build an Armory: survivors buy basic gear there on their own when you have spare parts. Or tap a survivor → Equipment → Change to pick from the stash.', done: () => S.sv.some((q) => q.eq && q.eq.armor), parts: 4, ren: 5 },
  { name: 'Train Up', desc: 'Build a Gym, Library or Lounge', hint: 'Survivors train in their free time: 100% training = +1 permanent stat. Strength helps fighters and farmers, Intelligence helps medics and research, Charisma helps happiness and trading.', done: () => ['gym', 'library', 'lounge', 'range', 'track', 'sparring'].some((t) => bOf(t).length), parts: 4, ren: 5 },
  { name: 'Research', desc: 'Complete a research project', hint: 'Build a Workshop and tap it. An Engineer, Mechanic or Medic working there makes research points faster. Research unlocks the Well, Farm, Clinic, Hospital, gear recipes and town upgrades.', done: () => Object.keys(S.res || {}).length >= 1, parts: 5, ren: 6 },
  { name: 'Hold the Line', desc: 'Build 10 wall segments', hint: 'Build → Wood Barricade or Gate, then tap tiles in the glowing ring around the town. Most zombies come from the north. A broken segment turns to rubble and is repaired automatically with parts.', done: () => world.walls.size >= 10, parts: 5, ren: 6 },
  { name: 'Go Out There', desc: 'Send an expedition', hint: 'EXPEDITION → pick a place, a risk level and a squad. Trips run in real time, even while the game is closed, and bring back supplies, parts and sometimes gear or new survivors.', done: () => !!S.trip || (S.expCount || 0) > 0, parts: 5, ren: 6 },
  { name: 'More Land', desc: 'Expand the territory', hint: 'Town → Expand territory (needs Renown and parts). More land to build on — and more zombies, from more directions.', done: () => (S.terr || 0) >= 1, parts: 6, ren: 8 },
];
const guideActive = () => S.stage >= 2 && (S.guide || 0) < GUIDE.length;
function guideIntro() { const g = GUIDE[S.guide]; if (g) showEventPopup({ title: 'NEXT GOAL · ' + g.name.toUpperCase(), text: g.hint, gains: g.desc + ` · reward +${g.parts} parts, +${g.ren} Renown` }); }
function guideProgress() {
  const g = GUIDE[S.guide || 0]; if (!g || !g.done()) return;
  S.mat += g.parts; renownGain(g.ren, g.name); SFX('reward'); banner('✔ GOAL COMPLETE · ' + g.name.toUpperCase()); questFlash(); say(`Goal complete: ${g.name} (+${g.parts} parts).`, true);
  S.guide = (S.guide || 0) + 1; if (S.guide < GUIDE.length && !GUIDE[S.guide].done()) guideIntro(); else if (S.guide >= GUIDE.length) { say('All guide goals done — missions from here on.'); beginMission(); }
  ui();
}
function guideSkipDone() { if (S.guide === undefined) S.guide = 0; while (S.stage >= 2 && S.guide < GUIDE.length && GUIDE[S.guide].done()) S.guide++; }   /* old saves: no rewards for goals already met */
/* ---------------- V2.34 actionable objectives: tap the objective line for what to do, what is missing, where on the map, and a shortcut ---------------- */
let objMarks = null;   // { spots: [{x, y, label}], until }
function suggestSpot(type) {   // the free, valid spot nearest the town centre (tapped tile = south tile, like the player would)
  const d = DEFS[type]; if (!d) return null; let best = null, bd = 1e9; const cx = (Wd.BUILD.x0 + Wd.BUILD.x1) / 2, cy = (Wd.BUILD.y0 + Wd.BUILD.y1) / 2;
  for (let y = Wd.BUILD.y0; y <= Wd.BUILD.y1; y++) for (let x = Wd.BUILD.x0; x <= Wd.BUILD.x1; x++) { const dd = Math.hypot(x - cx, y - cy); if (dd >= bd || !Wd.placementCheck(world, x, y, d, null).ok) continue; bd = dd; best = { x, y }; }
  return best && { x: best.x, y: best.y, sx: best.x + d.w - 1, sy: best.y + d.h - 1 };
}
function findGaps(max = 8) {   // where the zombies' way in is: trace the shortest escape from the town to the map edge, pick the gap tile on it, pretend it is walled, repeat
  const seed = Wd.nearestWalkable(world, 7, 10, true); if (!seed) return []; const plug = new Set(), gaps = [];
  const open = (x, y) => Wd.inMap(x, y) && !plug.has(x + ',' + y) && Wd.walkable(world, x, y, true);
  const wallN = (x, y) => { let n = 0; for (let dy = -1; dy <= 1; dy++) for (let dx = -1; dx <= 1; dx++) if ((dx || dy) && ((Wd.wallAt(world, x + dx, y + dy) && !Wd.wallAt(world, x + dx, y + dy).broken) || plug.has((x + dx) + ',' + (y + dy)))) n++; return n; };
  for (let it = 0; it < max; it++) {
    const prev = new Map([[seed.x + ',' + seed.y, null]]), q = [seed]; let end = null;
    for (let i = 0; i < q.length && !end; i++) { const c = q[i]; if (c.x === 0 || c.y === 0 || c.x === COLS - 1 || c.y === ROWS - 1) { end = c; break; }
      for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) { const nx = c.x + dx, ny = c.y + dy, k = nx + ',' + ny; if (!prev.has(k) && open(nx, ny)) { prev.set(k, c); q.push({ x: nx, y: ny }); } } }
    if (!end) break; const path = []; for (let c = end; c; c = prev.get(c.x + ',' + c.y)) path.push(c);
    const cand = path.filter((c) => Wd.inWallZone(c.x, c.y) && !Wd.buildingAt(world, c.x, c.y)); if (!cand.length) break;
    let pick = cand[0], pn = -1; for (const c of cand) { const n = wallN(c.x, c.y); if (n > pn) { pn = n; pick = c; } }
    plug.add(pick.x + ',' + pick.y); gaps.push({ x: pick.x, y: pick.y, label: Wd.isRoad(world, pick.x, pick.y) ? 'gate' : Wd.wallAt(world, pick.x, pick.y) ? 'rebuild' : 'gap' });
  }
  return gaps;
}
const buildObj = (type, extra = {}) => () => { const d = DEFS[type], lock = buildLock(type), sp = lock ? null : suggestSpot(type);
  return { reqs: [{ label: `${d.name}: ⚙ ${d.mat} parts`, ok: S.mat >= d.mat, detail: S.mat >= d.mat ? `you have ${Math.floor(S.mat)}` : `you have ${Math.floor(S.mat)}: scrap, missions and kills bring parts` }, ...(lock ? [{ label: 'Unlocked', ok: false, detail: lock }] : []), ...(lock || sp ? [] : [{ label: 'Free space', ok: false, detail: 'no free spot fits it: demolish or move something' }])],
    spots: sp ? [{ x: sp.sx + .5, y: sp.sy + .5, label: 'free spot' }] : [], act: lock ? null : { label: `Build ${d.name}`, fn: () => { closeP(); startTool({ kind: 'building', type }); if (sp) { updatePreview(sp.x, sp.y); centerOn(sp.sx + .5, sp.sy + .5); } } }, ...extra }; };
const zSpots = (f) => S.z.filter((z) => z.hp > 0 && f(z)).slice(0, 6).map((z) => ({ x: z.w.x, y: z.w.y, label: z.human ? 'raider' : 'zombie', live: z }));
const bSpots = (types) => world.buildings.filter((b) => types.includes(b.type)).map((b) => ({ x: b.x + b.w / 2, y: b.y + b.h / 2, label: DEFS[b.type].name }));
const OBJ_GUIDE = {
  'Grow Food': buildObj('farm'), 'A Place to Rest': buildObj('house'),
  'Make It Home': () => { const happy = S.sv.filter((q) => !q.resident && (q.sat || 0) >= 35); return { reqs: [{ label: 'A happy survivor (♥ 35+)', ok: happy.length > 0, detail: happy.length ? happy.map((q) => q.name).join(', ') : 'meals, rest, friends and fun raise ♥' }, { label: 'A free home', ok: popNow() < popCap(), detail: `${popNow()}/${popCap()} beds` }],
    spots: happy.map((q) => ({ x: q.w.x, y: q.w.y, label: q.name, live: q })), act: S.requests.length ? { label: 'See the request', fn: () => { closeP(); showNextRequest(); } } : null }; },
  'Scrap Economy': buildObj('scrapyard'),
  'Gear Up': () => bOf('armory').length ? { reqs: [{ label: 'Spare parts for gear', ok: S.mat >= 4, detail: `${Math.floor(S.mat)} parts` }], spots: bSpots(['armory']), act: { label: 'Open People', fn: () => { closeP(); showSurvivors(); } } } : buildObj('armory')(),
  'Train Up': buildObj('gym'),
  'Research': () => { const ws = bOf('workshop')[0]; return ws ? { reqs: [{ label: 'Research points', ok: (S.rp || 0) >= Math.min(...Object.values(RESEARCH).map((r) => r.rp)), detail: `${Math.floor(S.rp || 0)} RP: the workshop makes more` }], spots: bSpots(['workshop']), act: { label: 'Open the Workshop', fn: () => showBuildingInfo(ws, 'research') } } : buildObj('workshop')(); },
  'Hold the Line': () => { const wd = Wd.WALL_DEFS.wood; return { reqs: [{ label: `Walls: ${world.walls.size}/10`, ok: world.walls.size >= 10 }, { label: `Wood Barricade: ⚙ ${wd.mat} each`, ok: S.mat >= wd.mat, detail: `you have ${Math.floor(S.mat)}` }], spots: [], act: { label: 'Place walls', fn: () => { closeP(); startTool({ kind: 'wall', wtype: 'wood' }); } } }; },
  'Go Out There': () => ({ reqs: [{ label: 'A free squad member', ok: S.sv.some((q) => q.hp > q.max * .5 && !['down', 'away', 'hospital'].includes(q.mode)) }], spots: [], act: { label: 'Open Explore', fn: () => { closeP(); showExpedition(); } } }),
  'More Land': () => { const e = expandInfo(); return { reqs: e ? [{ label: `Renown ${e.n.ren}`, ok: S.ren >= e.n.ren, detail: `you have ${Math.floor(S.ren)}` }, { label: `⚙ ${e.n.mat} parts`, ok: S.mat >= e.n.mat, detail: `you have ${Math.floor(S.mat)}` }] : [], spots: [], act: { label: 'Open Town', fn: () => { closeP(); showTown(); } } }; },
};
const OBJ_MISSION = {
  clear: () => ({ reqs: [], spots: zSpots((z) => !z.human), act: null, tip: 'Your fighters attack zombies that come near. Walls and a Guard help; you can also tap a survivor to see who they are fighting.' }),
  produce: () => { const p = world.buildings.filter((b) => ['water', 'farm'].includes(DEFS[b.type].fam) || ['water', 'well', 'farm', 'field'].includes(b.type)), idle = p.filter((b) => DEFS[b.type].slot && !b.staff); return { reqs: [{ label: 'Food and water buildings', ok: p.length > 0, detail: p.length + ' built' }, { label: 'All of them staffed', ok: !idle.length, detail: idle.length ? idle.map((b) => DEFS[b.type].name).join(', ') + ' has no worker' : 'staffed buildings make more' }], spots: bSpots(['water', 'well', 'farm', 'field']), act: { label: 'Open Build', fn: () => { closeP(); showBuild(); } } }; },
  build: () => ({ reqs: [], spots: [], act: { label: 'Open Build', fn: () => { closeP(); showBuild(); } } }),
  research: () => OBJ_GUIDE.Research(),
  train: () => ({ reqs: [], spots: bSpots(['gym', 'library', 'lounge', 'range', 'track', 'sparring']), act: null, tip: 'Survivors train on their own in their free time.' }),
  raiders: () => ({ reqs: [], spots: zSpots((z) => z.human), act: null, tip: 'Raiders come every few days; your fighters chase them. Pets bark when they sneak in.' }),
  expedition: () => OBJ_GUIDE['Go Out There'](),
  friends: () => ({ reqs: [], spots: bSpots(['lounge', 'canteen']), act: null, tip: 'Survivors make friends while eating, relaxing and fighting side by side.' }),
  stockpile: () => { const g = S.mission ? S.mission.goal : 40; return { reqs: [{ label: `Food ${g}`, ok: S.food >= g, detail: `${Math.floor(S.food)} now` }, { label: `Water ${g}`, ok: S.water >= g, detail: `${Math.floor(S.water)} now` }, { label: `Storage room for ${g}`, ok: supplyCap() >= g, detail: `cap ${supplyCap()}` }], spots: bSpots(['storage']), act: null }; },
  seal: () => { const gaps = findGaps(), wd = Wd.WALL_DEFS.wood; return { reqs: [{ label: gaps.length ? `${gaps.length} gap${gaps.length > 1 ? 's' : ''} found` : 'No gaps left', ok: !gaps.length, detail: gaps.some((g) => g.label === 'gate') ? 'a road needs a Gate, not a wall' : 'zombies walk in through them' }, { label: `Parts for ${gaps.length} wall${gaps.length === 1 ? '' : 's'}`, ok: S.mat >= gaps.length * wd.mat, detail: `about ⚙ ${gaps.length * wd.mat}, you have ${Math.floor(S.mat)}` }],
    spots: gaps, act: { label: gaps.some((g) => g.label === 'gate') ? 'Place walls / gates' : 'Place walls', fn: () => { closeP(); startTool({ kind: 'wall', wtype: 'wood' }); showObjMarks(gaps); } } }; },
};
function currentObjective() {
  if (S.stage === 0) return { name: 'Water First', desc: 'Build a Rain Collector', how: 'Every survivor drinks a daily ration. A Rain Collector makes water; staffed, it makes more.', prog: [0, 1], reward: '', ...buildObj('water')() };
  if (S.stage === 1) return { name: 'First Blood', desc: 'Defeat 3 Walkers', how: 'Your fighters attack zombies that come close. Watch them work, or tap a survivor to see what they are doing.', prog: [Math.min(S.kills, 3), 3], reward: '+10 Renown', reqs: [], spots: zSpots((z) => !z.human), act: null };
  if (guideActive()) { const g = GUIDE[S.guide], f = OBJ_GUIDE[g.name]; return { name: g.name, desc: g.desc, how: g.hint, prog: [0, 1], reward: `+${g.parts} parts, +${g.ren} Renown`, reqs: [], spots: [], act: null, ...(f ? f() : {}) }; }
  if (S.mission) { const m = S.mission, f = OBJ_MISSION[m.id], o = f ? f() : {}; return { name: m.name, desc: m.desc, how: o.tip || '', prog: [Math.floor(m.progress), m.goal], reward: `+${m.rewardParts} parts, +${m.rewardRen} Renown`, reqs: [], spots: [], act: null, ...o }; }
  return null;
}
function showObjMarks(spots) { objMarks = { spots, until: performance.now() + 12000 }; }
/* ---------------- V2.35 resource panel: tap food / water / parts in the top-left plaque ---------------- */
const f1 = (n) => (Math.abs(n) < .05 ? 0 : Math.round(n * 10) / 10).toFixed(1), sgn = (n) => (n >= 0 ? '+' : '−') + f1(Math.abs(n));
function resForecast(e) {   // one plain-language line about where the stock is heading
  if (e.cap && e.full && e.net > 0) return { t: 'Storage full: extra production is wasted. Build Storage to hold more.', c: 'var(--gold)' };
  if (e.net < -1e-6) { const d = e.days; return { t: d < 1 ? `Runs out in under a day (${Math.max(1, Math.round(d * 24))} h)` : `Runs out in about ${d < 10 ? d.toFixed(1) : Math.round(d)} days`, c: d < 2 ? 'var(--bad)' : '#ffb36b' }; }
  if (e.fullIn) return { t: `Storage full in about ${e.fullIn < 10 ? e.fullIn.toFixed(1) : Math.round(e.fullIn)} days`, c: 'var(--good)' };
  return { t: e.net > 1e-6 ? 'Growing' : 'Steady', c: 'var(--good)' };
}
let rTab = 'food';
function showResource(k) {
  if (k) rTab = k; endBuildMode(true); closeP(); $('it').textContent = RES_TITLE[rTab].toUpperCase();
  const E = econ(), e = E[rTab], fc = resForecast(e), L = ecoLast24(rTab);
  const row = (q, sign) => `<div class="row" style="gap:6px"${q.b ? ` data-b="${world.buildings.indexOf(q.b)}"` : ''}><span class="sp">${esc(q.name)}${q.b && DEFS[q.b.type].slot ? ` <small style="color:${q.b.staff ? 'var(--good)' : 'var(--bad)'}">${q.b.staff ? esc(q.b.staff.name) + ' · ' + Math.round(workShare(q.b) * 100) + '% of the day' : 'no worker'}</small>` : ''}</span><span style="color:${sign > 0 ? 'var(--good)' : '#ffb36b'}">${sign > 0 ? '+' : '−'}${f1(q.v)}</span>${q.b ? '<span style="color:var(--gold)">›</span>' : ''}</div>`;
  const grp = (list) => { const g = new Map(); for (const q of list) { if (q.group) { const o = g.get(q.group) || { name: q.group + ` (${list.filter((x) => x.group === q.group).length} buildings)`, v: 0 }; o.v += q.v; g.set(q.group, o); } else g.set(Symbol(), q); } return [...g.values()]; };
  const last = Object.entries(L.by).filter(([, v]) => Math.abs(v) > .05).sort((a, b) => Math.abs(b[1]) - Math.abs(a[1]));
  $('ib').innerHTML = tabBar([['food', 'Food'], ['water', 'Water'], ['mat', 'Parts']], rTab)
    + `<div class="card"><div class="kv"><div><span>In stock</span><span><b>${Math.floor(e.stock)}</b>${e.cap ? ' / ' + e.cap : ''}</span></div><div><span>Produced / day</span><span style="color:var(--good)">${sgn(e.prod)}</span></div><div><span>Used / day</span><span style="color:#ffb36b">−${f1(e.use)}</span></div><div><span><b>Net / day</b></span><span style="color:${e.net >= 0 ? 'var(--good)' : 'var(--bad)'}"><b>${sgn(e.net)}</b></span></div></div>`
    + (e.cap ? `<div style="height:8px;background:#1d242b;border-radius:4px;margin:5px 0;position:relative"><i style="position:absolute;left:0;top:0;bottom:0;width:${Math.min(100, 100 * e.stock / e.cap)}%;background:${e.full ? 'var(--gold)' : '#6fb3e0'};border-radius:4px"></i></div>` : '')
    + `<div style="color:${fc.c}">${fc.t}</div>` + (rTab === 'mat' ? '<div class="sm">Parts also come from zombie kills, missions and expeditions, and go to repairs, gear and building. Those swing day to day, so they are in "Last 24 h" below, not in the daily rate.</div>' : '') + '</div>'
    + (e.issues.length ? `<div class="card" style="border-color:#c0574a"><b style="color:var(--bad)">Problems</b>${e.issues.map((i) => `<div class="row" data-b="${world.buildings.indexOf(i.b)}" style="gap:6px"><span class="sp">⚠ ${esc(i.t)}</span><span style="color:var(--gold)">›</span></div>`).join('')}</div>` : '')
    + `<div class="card"><b>Producers</b>${e.producers.length ? e.producers.map((q) => row(q, 1)).join('') : `<div class="sm">None yet: ${rTab === 'food' ? 'build a Garden Plot' : rTab === 'water' ? 'build a Rain Collector' : 'build a Scrapyard'}.</div>`}</div>`
    + `<div class="card"><b>Users</b>${e.consumers.length ? grp(e.consumers).map((q) => row(q, -1)).join('') : '<div class="sm">Nothing uses it every day.</div>'}</div>`
    + `<div class="card"><b>Last ${L.hours || 0} h (what really happened)</b>${last.length ? last.map(([n, v]) => `<div class="row"><span class="sp">${esc(n)}</span><span style="color:${v >= 0 ? 'var(--good)' : '#ffb36b'}">${sgn(v)}</span></div>`).join('') : '<div class="sm">Nothing recorded yet: this fills in hour by hour.</div>'}</div>`
    + `<div class="sm">Rates are per game day and use each worker's measured share of the day on the job.</div>`;
  showPanel();
  $('ib').querySelectorAll('[data-tab]').forEach((b) => { b.onclick = () => showResource(b.dataset.tab); });
  $('ib').querySelectorAll('[data-b]').forEach((el) => { const b = world.buildings[+el.dataset.b]; if (b) { el.style.cursor = 'pointer'; el.onclick = () => showBuildingInfo(b); } });
}
/* ---------------- V2.39 Town Advisor: one line under the objective with the most urgent strategic issue (emergencies stay in the red alerts) ---------------- */
let advShown = null;
function advisorTips() {
  const T = [], E = econ(), add = (key, pri, icon, text, act) => T.push({ key, pri, icon, text, act });
  for (const k of ['food', 'water']) { const e = E[k]; if (e.net < -1e-6 && e.days < 3) add('short' + k, 90 - e.days * 10, k === 'food' ? '🍖' : '💧', `${RES_TITLE[k]} runs out in about ${e.days < 1 ? Math.max(1, Math.round(e.days * 24)) + ' h' : e.days.toFixed(1) + ' days'}`, () => showResource(k)); }
  const up = upkeepTotal(); if (S.mat < up) add('upkeep', 70, '⚙', `Not enough parts for tonight's upkeep (${f1(up)})`, () => showResource('mat'));
  for (const b of world.buildings) { const d = DEFS[b.type]; if (!d.slot || b.staff || !FAMRES(d.fam)) continue; const free = S.sv.find((q) => (STAFF_JOBS[d.fam] || []).includes(q.job) && !q.post && q.hp > 0); add('staff' + b.x + ',' + b.y, 60, '👷', free ? `${d.name} has no worker: ${free.name} could take it` : `${d.name} has no ${(STAFF_JOBS[d.fam] || []).join(' or ')}: change someone's profession`, () => showBuildingInfo(b)); }
  if (S.rankReady || (rankConds() && rankConds().every((r) => r.ok))) add('rank', 85, '⭐', 'The Haven can be upgraded to the next star', () => showUpgrade('rank'));
  if (world.walls.size >= 8 && !Wd.perimeter(world).sealed) { const g = findGaps(4).length; if (g) add('gaps', 45, '🧱', `Your wall ring has ${g} gap${g > 1 ? 's' : ''}`, () => { closeP(); startTool({ kind: 'wall', wtype: 'wood' }); showObjMarks(findGaps()); }); }
  const rough = S.sv.filter((q) => q.sleeping === 'rough').length; if (rough >= 2) add('beds', 40, '🛏', `${rough} survivors sleep rough: build a House`, () => { bCat = 'live'; showBuild(); });
  for (const k of ['food', 'water']) if (E[k].full && E[k].net > .2) add('full' + k, 30, '📦', `${RES_TITLE[k]} storage is full: build Storage${S.rank >= 3 ? ' or hold a Trade Caravan' : ''}`, () => showResource(k));
  const q = RANK_REQ[S.rank]; if (q && (S.eventsHeld || 0) < q.events && (S.lastEventDay ?? -1) < S.day && Object.values(TOWN_EVENTS).some((e) => (e.rank || 1) <= S.rank && Object.entries(e.cost).every(([r, v]) => S[r] >= v))) add('event', 35, '🎉', 'Hold a town event: the next star needs it', () => showUpgrade('events'));
  const ws = bOf('workshop')[0]; if (ws) { const r = Object.entries(RESEARCH).find(([k, x]) => !researched(k) && researched(x.need) && (S.rp || 0) >= x.rp && S.mat >= x.mat); if (r) add('res', 25, '🔬', `Research ready: ${r[1].name}`, () => showBuildingInfo(ws, 'research')); }
  if (S.rank >= 2 && !(S.posts || []).length && S.sv.some((q) => isFighter(q)) && S.mat >= POST_COST) add('post', 22, '🛡️', 'Build a guard post: a fighter on watch draws zombies away from your workers', () => { closeP(); startTool({ kind: 'post' }); });   /* V2.45 */
  if (S.day >= 4 && Date.now() - exportedAt(SLOT - 1) > 7 * 864e5) add('backup', 15, '💾', 'No backup this week: export one (Safari can clear old site data)', () => showBackup());   /* V2.42 */
  const day = S.day, mute = S.advMute || {}; return T.filter((t) => mute[t.key] !== day && (S.stage >= 2 || t.pri >= 70)).sort((a, b) => b.pri - a.pri);   /* during the opening goals only serious issues */
}
function layoutTop() {   // the left menu and the alerts sit just under the plaque, whatever its height
  const pl = $('plaque'), w = $('world'); if (!pl || !w) return; const y = Math.round(pl.getBoundingClientRect().bottom - w.getBoundingClientRect().top + 6);
  for (const id of ['lmenu', 'alerts']) { const e = $(id); if (e && e.style.top !== y + 'px') e.style.top = y + 'px'; }
}
function advisorUpdate() {
  const el = $('adv'); if (!el) return; if (!OPTS.advisor) { el.style.display = 'none'; layoutTop(); return; }
  const t = advisorTips()[0]; advShown = t || null; if (!t) { el.style.display = 'none'; layoutTop(); return; }
  el.style.display = 'flex'; const txt = `${t.icon} ${t.text}`; if (el.dataset.k !== t.key || el.firstChild.textContent !== txt) { el.dataset.k = t.key; el.firstChild.textContent = txt; } layoutTop();
}
function showObjective() {
  const o = currentObjective(); if (!o) { showGoals(); return; }
  endBuildMode(true); closeP(); $('it').textContent = 'OBJECTIVE';
  const [c, g] = o.prog, pct = Math.round(100 * Math.min(1, c / (g || 1)));
  $('ib').innerHTML = `<div class="card"><div style="font-size:24px;color:var(--gold)">${esc(o.name)}</div><div style="font-size:20px">${esc(o.desc)}</div>`
    + (g > 1 ? `<div class="gbar" style="position:relative;height:10px;background:#1d242b;border-radius:5px;margin:6px 0"><i style="position:absolute;left:0;top:0;bottom:0;width:${pct}%;background:#7fd35a;border-radius:5px"></i></div><div class="sm">${c}/${g}</div>` : '')
    + (o.how ? `<div class="sm" style="margin-top:4px">${esc(o.how)}</div>` : '') + (o.reward ? `<div class="sm" style="color:var(--good)">Reward: ${o.reward}</div>` : '') + '</div>'
    + (o.reqs.length ? `<div class="card">${o.reqs.map((r) => `<div class="row" style="gap:6px"><span style="width:22px;color:${r.ok ? '#7fd35a' : '#ff8a7a'}">${r.ok ? '✔' : '✘'}</span><span class="sp">${esc(r.label)}${r.detail ? ` <small style="color:var(--muted)">· ${esc(r.detail)}</small>` : ''}</span></div>`).join('')}</div>` : '')
    + `<div class="row" style="gap:6px">${o.spots.length ? '<button class="act" id="oShow" style="flex:1">📍 Show on map</button>' : ''}${o.act ? `<button class="act go" id="oAct" style="flex:1">${esc(o.act.label)}</button>` : ''}</div><button class="act" id="oAll">All goals</button>`;
  showPanel();
  if ($('oShow')) $('oShow').onclick = () => { closeP(); showObjMarks(o.spots); const p = o.spots[0]; centerOn(p.x, p.y); };
  if ($('oAct')) $('oAct').onclick = () => o.act.fn(); $('oAll').onclick = showGoals;
}
function drawObjMarks() {
  if (!objMarks) return; if (performance.now() > objMarks.until) { objMarks = null; return; }
  const t = performance.now() / 1000, pulse = .5 + .5 * Math.sin(t * 5);
  for (const sp of objMarks.spots) { const w = sp.live ? sp.live.w : sp; if (sp.live && (sp.live.hp <= 0)) continue;
    const tx = Math.floor(w.x), ty = Math.floor(w.y); ctx.save(); tilePath(tx, ty); ctx.fillStyle = `rgba(255,225,69,${.18 + .2 * pulse})`; ctx.fill(); ctx.strokeStyle = '#ffe145'; ctx.lineWidth = 2.5; ctx.stroke(); ctx.restore();
    const p = project(tx + .5, ty + .5); statusTag(p.x, p.y - TWs() * .32 - 6 * pulse, sp.label.toUpperCase(), '#ffe38a'); }
}
function questFlash() { const q = $('quest'); if (!q) return; q.classList.remove('qDone'); void q.offsetWidth; q.classList.add('qDone'); objMarks = null; }
function showGoals() {
  endBuildMode(true); closeP(); $('it').textContent = 'GOALS'; const gi = S.guide || 0;
  const first = [['Water', 'Build a Rain Collector', S.stage >= 1], ['First Blood', 'Defeat 3 Walkers', S.stage >= 2]];
  const rows = first.map(([n, d, ok]) => `<div style="opacity:${ok ? .6 : 1}">${ok ? '✔' : '▶'} <b>${n}</b> — ${d}</div>`).join('')
    + GUIDE.map((g, i) => { const done = S.stage >= 2 && i < gi, cur = S.stage >= 2 && i === gi; return `<div style="opacity:${done ? .6 : cur ? 1 : .45};${cur ? 'border:1px solid #ffe38a;border-radius:4px;padding:3px;margin:2px 0' : ''}">${done ? '✔' : cur ? '▶' : '·'} <b>${g.name}</b> — ${g.desc}${cur ? `<br><small>${g.hint}</small><br><small>Reward: +${g.parts} parts, +${g.ren} Renown</small>` : ''}</div>`; }).join('');
  legacyCheck(); const lg = `<div class="card" style="margin-top:8px"><b>🏅 Legacy goals</b> <span class="sm">${legacyDone()}/${LEGACY.length} · ${DF().icon} ${DF().name} · ${ST().icon} ${ST().name}</span>${LEGACY.map((g) => { const d = (S.legacy || {})[g.id], [a, b] = g.prog(); return `<div style="opacity:${d ? .6 : 1}">${d ? '✔' : g.icon} <b>${g.name}</b> — ${g.desc} <span class="sm">${d ? 'day ' + d : Math.min(a, b) + '/' + b}</span></div>`; }).join('')}<div class="sm">Each: +15 Renown, +10 parts.</div></div>
    <div class="card"><b>📻 The Signal</b><div class="sm">${S.won ? `The convoy came on day ${S.won.day}. Score ${S.won.score}. The town is yours to keep building.` : S.finale ? `Final stand under way: night ${S.finale.night} of ${FINALE_NIGHTS}. Hold out until dawn after night ${FINALE_NIGHTS}.` : `Reach ★5 and finish ${LEGACY_NEED} legacy goals, then call for the convoy: ${FINALE_NIGHTS} nights of hordes, then the ending and your score. (★${S.rank}/5 · ${legacyDone()}/${LEGACY_NEED} goals)`}</div>${signalReady() ? '<button class="act go" id="gSignal" style="width:100%">📻 Call for the convoy</button>' : ''}</div>`;
  $('ib').innerHTML = (gi >= GUIDE.length ? lg + rows : rows + lg) + (gi >= GUIDE.length && S.mission ? `<br><b>Mission:</b> ${S.mission.name} — ${S.mission.desc} (${Math.floor(S.mission.progress)}/${S.mission.goal})` : '') + '<br><button class="act" id="gLog">📜 Event log</button>';
  showPanel(); $('gLog').onclick = showLog; const gs = $('gSignal'); if (gs) gs.onclick = () => { closeP(); startFinale(); };
}
function logEvent(t, lvl = 'routine') { if (!t || /^★ RENOWN|^Goal complete:|^\+\d+ PARTS · mission/.test(t)) return;   /* skip echoes of toasts */ S.log = S.log || []; const last = S.log[S.log.length - 1]; if (last && last.t === t) return; S.log.push({ d: S.day, h: S.hour, t: String(t), l: lvl }); if (S.log.length > 60) S.log.splice(0, S.log.length - 60); }
let logOnlyKey = false;
function showLog() {
  endBuildMode(true); closeP(); $('it').textContent = 'EVENT LOG';
  const L = (S.log || []).slice().reverse().filter((e) => !logOnlyKey || e.l === 'critical' || e.l === 'important'), C = { critical: '#ff9a84', important: '#ffe08a' };
  $('ib').innerHTML = `<div class="row" style="gap:6px;margin-bottom:6px"><button class="act" id="logFilt" style="flex:1">${logOnlyKey ? 'Showing: alerts + important' : 'Showing: everything'}</button><button class="act" id="logSlow" style="flex:1">1× on emergencies: ${OPTS.autoSlow ? 'ON' : 'OFF'}</button></div><div class="row" style="gap:6px;margin-bottom:6px"><button class="act" id="logLights" style="flex:1">Night lights: ${OPTS.nightLights ? 'ON' : 'OFF (faster)'}</button><button class="act" id="logAdv" style="flex:1">Town advisor: ${OPTS.advisor ? 'ON' : 'OFF'}</button></div><button class="act" id="logBak" style="width:100%;margin-bottom:6px">💾 Backup this town</button>`
    + (L.length ? L.map((e) => `<div style="padding:2px 0;border-bottom:1px solid #3e4a56${e.l === 'routine' || !e.l ? ';opacity:.8' : ''}"><small style="color:var(--muted)">Day ${e.d} · ${String(e.h).padStart(2, '0')}:00</small> <span style="color:${C[e.l] || 'inherit'}">${e.l === 'critical' ? '⚠ ' : ''}${esc(e.t)}</span></div>`).join('') : '<small>Nothing yet.</small>');
  $('logFilt').onclick = () => { logOnlyKey = !logOnlyKey; showLog(); }; $('logSlow').onclick = () => { OPTS.autoSlow = !OPTS.autoSlow; saveOpts(); showLog(); }; $('logLights').onclick = () => { OPTS.nightLights = !OPTS.nightLights; saveOpts(); showLog(); }; $('logAdv').onclick = () => { OPTS.advisor = !OPTS.advisor; saveOpts(); advisorUpdate(); showLog(); }; $('logBak').onclick = () => showBackup();
  showPanel();
}
function stageCheck() { if (S.stage === 1 && S.kills >= 3) { S.stage = 2; S.guide = 0; questFlash(); renownGain(10, 'Goal complete'); say('Goal complete!'); guideSkipDone(); guideIntro(); } }
/* ---------------- V2.23 missions (10 kinds, scaled by rank) and story events with choices ---------------- */
const MISSION_DEFS = [
  { id: 'clear', name: 'Clear the Perimeter', desc: (g) => `Defeat ${g} zombies`, goal: 6, parts: 5, ren: 6, count: () => S.kills },
  { id: 'produce', name: 'Keep the Town Supplied', desc: (g) => `Produce ${g} food and water`, goal: 18, parts: 4, ren: 5, count: () => Math.floor(S.produced) },
  { id: 'build', name: 'Expand the Haven', desc: (g) => `Construct ${g} new building${g > 1 ? 's' : ''}`, goal: 1, parts: 4, ren: 5, count: () => S.builtCount, step: .5 },
  { id: 'research', name: 'Push the Science', desc: () => 'Complete a research project', goal: 1, parts: 6, ren: 6, count: () => Object.keys(S.res || {}).length, step: 0, cond: () => bOf('workshop').length && Object.keys(RESEARCH).some((k) => !researched(k)) },
  { id: 'train', name: 'Training Regime', desc: (g) => `Gain ${g} stat point${g > 1 ? 's' : ''} by training`, goal: 2, parts: 5, ren: 6, count: () => S.trainPts || 0, cond: () => ['gym', 'library', 'lounge', 'range', 'track', 'sparring'].some((t) => bOf(t).length) },
  { id: 'raiders', name: 'Bandit Hunt', desc: (g) => `Defeat ${g} raider${g > 1 ? 's' : ''}`, goal: 2, parts: 7, ren: 7, count: () => S.raiderKills || 0, step: .4, cond: () => S.day >= 3 },
  { id: 'expedition', name: 'Into the Wasteland', desc: () => 'Complete an expedition', goal: 1, parts: 5, ren: 6, count: () => S.expCount || 0, step: 0, cond: () => S.sv.length >= 5 },
  { id: 'friends', name: 'Community Spirit', desc: () => 'Two survivors become friends', goal: 1, parts: 4, ren: 6, count: () => S.friendsMade || 0, step: 0, cond: () => S.sv.length >= 4 },
  { id: 'stockpile', name: 'Full Pantry', desc: (g) => `Hold ${g} food and ${g} water at once`, goal: 40, parts: 5, ren: 5, state: () => Math.min(S.food, S.water), step: .15, cond: () => supplyCap() >= 50 },
  { id: 'seal', name: 'Close the Gaps', desc: () => 'Seal the perimeter with walls', goal: 1, parts: 6, ren: 7, state: () => (Wd.perimeter(world).sealed ? 1 : 0), step: 0, cond: () => world.walls.size >= 8 && !Wd.perimeter(world).sealed },
];
function beginMission(id = null) {
  const pool = MISSION_DEFS.filter((m) => (!m.cond || m.cond()) && (!S.lastMission || m.id !== S.lastMission)), d = (id && MISSION_DEFS.find((m) => m.id === id)) || pool[Math.floor(rnd() * pool.length)] || MISSION_DEFS[0];
  const sc = 1 + (d.step ?? .5) * Math.max(0, S.rank - 1), goal = Math.max(1, Math.round(d.goal * sc)), rs = 1 + .35 * Math.max(0, S.rank - 1);
  S.mission = { id: d.id, name: d.name, desc: d.desc(goal), goal, rewardParts: Math.round(d.parts * rs), rewardRen: Math.round(d.ren * rs), progress: 0, start: d.count ? d.count() : 0 };
  S.lastMission = d.id; say('Mission: ' + d.name + ' — ' + S.mission.desc, true); ui();
}
function missionProgress() {
  stageCheck(); if (S.stage < 2) return;
  if (guideActive()) { guideProgress(); return; }
  if (!S.mission || !MISSION_DEFS.some((d) => d.id === S.mission.id)) { beginMission(); return; }
  const m = S.mission, d = MISSION_DEFS.find((q) => q.id === m.id); if (m.start === undefined) m.start = d.count ? d.count() : 0;   /* old saves */
  m.progress = Math.max(0, Math.min(m.goal, d.state ? d.state() : d.count() - m.start));
  if (m.progress >= m.goal) { S.mat += m.rewardParts; flow('mat', 'Mission rewards', m.rewardParts); screenToast('+' + m.rewardParts + ' PARTS · mission reward'); renownGain(m.rewardRen, m.name); screenToast('MISSION COMPLETE · ' + m.name); questFlash(); SFX('reward'); S.mission = null; setTimeout(() => beginMission(), 1200); }
}
/* story events: one a day at most; some are chains that continue a few days later */
const pickSv = (f = () => true) => { const c = S.sv.filter((q) => q.hp > 0 && !['down', 'hospital', 'away'].includes(q.mode) && f(q)); return c.length ? c[Math.floor(rnd() * c.length)] : null; };
const storyLater = (id, days) => { S.storyQ = S.storyQ || []; S.storyQ.push({ id, day: S.day + days }); };
const pay = (c) => { if (!Object.entries(c).every(([k, v]) => S[k] >= v)) return false; for (const [k, v] of Object.entries(c)) S[k] -= v; ui(); return true; };
const result = (title, text, gains = '') => showEventPopup({ title, text, gains });
function newcomer(job, lvl) { if (popNow() >= popCap()) return null; const names = ['Cass', 'Dex', 'Mara', 'Ozzy', 'Lark', 'Vince', 'Hana', 'Rook', 'Sol', 'Quinn'], name = names.find((n) => !S.sv.some((q) => q.name === n)) || 'Survivor ' + (S.sv.length + 1), v = mk(name, job, lvl, 7, 9, S.sv.length); v.sat = 20; S.sv.push(v); return v; }
const STORY = {
  radio1: { cond: () => S.day >= 4, w: 2, run: () => showEventPopup({ title: '📻 A RADIO SIGNAL', text: 'The radio crackles: a voice repeating coordinates, then static. Someone out there is alive — or it\'s a trap.', buttons: [
    { label: 'Send a scout (3 food, 3 water)', fn: () => { if (!pay({ food: 3, water: 3 })) return result('NOT ENOUGH SUPPLIES', 'The scout needs food and water for the trip.'); if (rnd() < .75) { storyLater('radio2', 2); result('📻 THE SCOUT SETS OFF', 'They should be back in two days.'); } else { const s = pickSv(); if (s) s.hp = Math.max(1, Math.round(s.max * .35)); result('📻 AN AMBUSH', `It was a trap. ${s ? s.name + ' made it back, badly hurt.' : 'The scout barely escaped.'}`); } } },
    { label: 'Ignore it', fn: () => {} }] }) },
  radio2: { chain: true, run: () => showEventPopup({ title: '📻 THE BUNKER', text: 'The scout found a sealed bunker with a small group of survivors who have been hiding for months.', buttons: [
    { label: 'Invite them in', fn: () => { const a = newcomer(rnd() < .5 ? 'Engineer' : 'Medic', 2 + Math.floor(rnd() * 2)), b = rnd() < .5 ? newcomer('Guard', 2) : null; storyLater('radio3', 3); result('📻 NEW ARRIVALS', a ? `${[a, b].filter(Boolean).map((q) => q.name + ' (' + q.job + ' Lv.' + q.l + traitTag(q) + ')').join(' and ')} joined the Haven.` : 'There was no room in the Haven, so they stayed in the bunker — but they\'ll remember you.', a ? '' : '+8 parts as thanks'); if (!a) S.mat += 8; } },
    { label: 'Trade with them (+10 parts)', fn: () => { S.mat += 10; storyLater('radio3', 3); ui(); } }] }) },
  radio3: { chain: true, run: () => { const id = ['rifle', 'riot', 'goggles', 'charm', 'axe'][Math.floor(rnd() * 5)]; stashAdd(id); renownGain(15, 'The bunker'); result('📻 A GIFT FROM THE BUNKER', 'The bunker people send a runner with a map of a hidden cache. Your scouts recover it.', `${ITEMS[id].name} added to the stash · +15 Renown`); } },
  rival1: { cond: () => S.day >= 8 && S.rank >= 2, w: 1.5, run: () => showEventPopup({ title: '🏴 IRONFIELD RIDERS', text: 'Riders from Ironfield, a town to the east, demand tribute: "Pay, or we take it."', buttons: [
    { label: 'Pay 8 parts', fn: () => { if (!pay({ mat: 8 })) { spawnRaid(); return result('🏴 THEY ATTACK', 'You couldn\'t pay. The riders attack!'); } S.nextRaid = Math.max(S.nextRaid, S.day + S.hour / 24 + 4); storyLater('rival2', 4); result('🏴 TRIBUTE PAID', 'They leave. No raiders for 4 days.'); } },
    { label: 'Refuse', fn: () => { spawnRaid(); spawnRaid(); S.rivalFight = true; storyLater('rival3', 1); result('🏴 THEY ATTACK', 'Two raiding parties ride in at once!'); } }] }) },
  rival2: { chain: true, run: () => { S.food += 10; S.water += 6; ui(); result('🏴 IRONFIELD TRADERS', 'Ironfield sends a cart of supplies as a sign of peace.', '+10 food · +6 water'); } },
  rival3: { chain: true, run: () => { renownGain(15, 'Ironfield backs down'); result('🏴 IRONFIELD BACKS DOWN', 'Word spreads that the Haven stood its ground.', '+15 Renown'); } },
  sick: { cond: () => S.sv.length >= 4, w: 1.2, run: () => { const s = pickSv(); if (!s) return; showEventPopup({ title: '🤒 ' + s.name.toUpperCase() + ' IS SICK', text: `${s.name} has a fever and can barely stand.`, buttons: [
    { label: 'Treat (2 parts, 3 water)', fn: () => { if (!pay({ mat: 2, water: 3 })) return result('NOT ENOUGH SUPPLIES', `${s.name} will have to ride it out.`); s.sat = Math.min(100, (s.sat || 0) + 5); result('🤒 RECOVERING', `${s.name} will be fine.`); } },
    { label: 'Let them rest', fn: () => { s.hp = Math.max(1, Math.round(s.max * .45)); s.fatigue = 90; result('🤒 A ROUGH FEW DAYS', `${s.name} is weak for a while.`); } }] }); } },
  lostkid: { cond: () => S.day >= 5, w: .8, run: () => showEventPopup({ title: '🧒 A LOST CHILD', text: 'A child is crying somewhere beyond the walls.', buttons: [
    { label: 'Send two fighters', fn: () => { if (rnd() < .8 && popNow() < popCap()) { S.kids = S.kids || []; const name = KID_NAMES.find((n) => !S.sv.some((q) => q.name === n) && !S.kids.some((k) => k.name === n)) || 'Kid'; S.kids.push({ name, age: 2, parents: [], st: Object.fromEntries(STATS.map((k) => [k, 4 + Math.floor(rnd() * 3)])) }); renownGain(8, 'A child saved'); result('🧒 SAFE', `${name} is safe and will grow up in the Haven (3 days).`); } else { const s = pickSv(isFighter); if (s) s.hp = Math.max(1, Math.round(s.max * .4)); result('🧒 TOO LATE', `They searched until dark and found nothing.${s ? ' ' + s.name + ' was hurt on the way back.' : ''}`); } } },
    { label: 'Too dangerous', fn: () => { for (const q of S.sv) q.sat = Math.max(0, (q.sat || 0) - 4); } }] }) },
  drop: { cond: () => S.day >= 3, w: 1, run: () => showEventPopup({ title: '📦 SUPPLY DROP', text: 'A parachute crate lands outside the walls. The noise has woken the dead.', buttons: [
    { label: 'Go get it', fn: () => { const k = ['food', 'water', 'mat'][Math.floor(rnd() * 3)], n = 8 + Math.floor(rnd() * 5); S[k] += n; for (let i = 0; i < 4; i++) spawn(); S.alert = Math.max(S.alert, 900); ui(); result('📦 GOT IT', 'The crate made it back — with company.', `+${n} ${k === 'mat' ? 'parts' : k} · 4 zombies followed`); } },
    { label: 'Leave it', fn: () => {} }] }) },
  dog: { cond: () => !S.sv.some((q) => q.pet) || rnd() < .3, w: .7, run: () => showEventPopup({ title: '🐕 A STRAY DOG', text: 'A skinny dog has been following the patrols for days.', buttons: [
    { label: 'Adopt (2 food)', fn: () => { if (!pay({ food: 2 })) return; const p = newPet('dog'); (S.pets = S.pets || []).push(p); result('🐕 ' + p.name.toUpperCase(), `${p.name} has a home. Give the dog to a survivor from their Gear tab.`); } },
    { label: 'Shoo it away', fn: () => {} }] }) },
  medic: { cond: () => S.day >= 4, w: .8, run: () => showEventPopup({ title: '🩺 A WANDERING MEDIC', text: 'A travelling medic asks for shelter for the night.', buttons: [
    { label: 'Ask them to stay', fn: () => { const v = newcomer('Medic', 2); result('🩺 ' + (v ? v.name.toUpperCase() + ' STAYS' : 'NO ROOM'), v ? `${v.name} (Medic Lv.2) joins the Haven.` : 'There\'s no room — they treat everyone before leaving.'); if (!v) for (const q of S.sv) q.hp = Math.min(q.max, q.hp + q.max * .3); } },
    { label: 'Ask for treatment', fn: () => { for (const q of S.sv) q.hp = Math.min(q.max, q.hp + q.max * .4); result('🩺 PATCHED UP', 'Everyone is treated before the medic moves on.'); } }] }) },
  storm: { cond: () => S.day >= 3, w: .8, run: () => { S.water = Math.min(supplyCap(), S.water + 8); let t = 'Heavy rain fills every barrel.'; if (rnd() < .35) { const c = world.buildings.filter((b) => !OPEN_AIR.has(b.type) && !b.burnt); if (c.length && startFire(c[Math.floor(rnd() * c.length)], 25, 'Lightning')) t += ' Lightning struck a building!'; } ui(); result('⛈ STORM', t, '+8 water'); } },
  feast: { cond: () => S.sv.length >= 5 && S.food >= 12 && S.water >= 12, w: .9, run: () => showEventPopup({ title: '🎉 A FEAST?', text: 'Spirits are low. Someone suggests a feast to bring everyone together.', buttons: [
    { label: 'Hold a feast (6 food, 6 water)', fn: () => { if (!pay({ food: 6, water: 6 })) return; for (const a of S.sv) { a.sat = Math.min(100, (a.sat || 0) + 15); for (const b of S.sv) if (a.id < b.id) addBond(a, b, 6); } SFX('reward'); result('🎉 WHAT A NIGHT', 'Everyone feels closer.', '+15 ♥ for everyone · bonds grow'); } },
    { label: 'Not now', fn: () => {} }] }) },
  gift: { cond: () => true, w: 1.5, run: () => { const e = TOWN_EVENT_DEFS[Math.floor(rnd() * TOWN_EVENT_DEFS.length)]; if (e.food) S.food += e.food; if (e.water) S.water += e.water; if (e.mat) S.mat += e.mat; if (e.ren) renownGain(e.ren, e.name); const g = []; if (e.food) g.push('+' + e.food + ' food'); if (e.water) g.push('+' + e.water + ' water'); if (e.mat) g.push('+' + e.mat + ' parts'); if (e.ren) g.push('+' + e.ren + ' renown'); result(e.name.toUpperCase(), e.text, g.join(' · ')); ui(); } },
};
function triggerTownEvent() {   /* once a day: a due chain step first, else a random eligible event */
  S.storyQ = S.storyQ || []; const due = S.storyQ.find((q) => q.day <= S.day);
  if (due) { S.storyQ = S.storyQ.filter((q) => q !== due); STORY[due.id] && STORY[due.id].run(); return; }
  const pool = Object.entries(STORY).filter(([k, e]) => !e.chain && e.cond() && k !== S.lastStory && !(k === 'radio1' && S.radioDone) && !(k === 'rival1' && S.rivalDone));
  let tot = pool.reduce((a, [, e]) => a + e.w, 0), r = rnd() * tot; for (const [k, e] of pool) { r -= e.w; if (r <= 0) { S.lastStory = k; if (k === 'radio1') S.radioDone = true; if (k === 'rival1') S.rivalDone = true; e.run(); return; } }
}
const eventQueue = []; let modalOpen = false;
function showEventPopup(o) { eventQueue.push(o); nextEventPopup(); }
function nextEventPopup() {
  const m = $('eventModal'); if (!m || m.innerHTML || !eventQueue.length || sel) return; const e = eventQueue.shift(); modalOpen = true;
  const bt = e.buttons && e.buttons.length ? e.buttons : [{ label: 'OK' }];
  m.innerHTML = `<div class="evBox frame"><div class="evTitle out">${e.title}</div><div class="evText">${e.text}</div>${e.gains ? `<div class="evGain">${e.gains}</div>` : ''}${bt.map((b, i) => `<button class="act${i === 0 ? ' go' : ''} out" data-i="${i}"${i === 0 ? ' id="eventOk"' : ''}>${b.label}</button>`).join('')}</div>`;
  m.querySelectorAll('button').forEach((el) => { el.onclick = () => { const b = bt[+el.dataset.i]; m.innerHTML = ''; modalOpen = false; if (b && b.fn) b.fn(); nextEventPopup(); }; });
}
const residents = () => S.sv.filter((s) => s.resident).length;
/* V2.33 DV2-style "Upgrade Town": each star has rating conditions; when all are met the player upgrades the town */
const RANK_REQ = [null, { ren: 60, flow: 2, events: 1, build: 'canteen' }, { ren: 200, flow: 4, events: 2, build: 'storage' }, { ren: 450, flow: 7, events: 4, build: 'barracks' }, { ren: 900, flow: 10, events: 6, build: 'hospital' }];
function rankUnlocks(r) {   /* V2.39: what reaching star r opens up (buildings, walls, events) and what it costs (threat) */
  const b = Object.entries(DEFS).filter(([, d]) => (d.rank || 1) === r).map(([k, d]) => d.name + (d.res && !researched(d.res) ? ` (after ${RESEARCH[d.res].name})` : ''));
  const w = Object.values(Wd.WALL_DEFS).filter((d) => (d.rank || 1) === r).map((d) => d.name), e = Object.values(TOWN_EVENTS).filter((x) => (x.rank || 1) === r).map((x) => x.icon + ' ' + x.name);
  const out = []; if (b.length) out.push('Buildings: ' + b.join(', ')); if (w.length) out.push('Walls: ' + w.join(', ')); if (e.length) out.push('Events: ' + e.join(', '));
  out.push(`Threat rises to ☠${S.threat + 1}: bigger hordes, more raids`); out.push(`+${4 + r} parts on upgrade`); return out;
}
function buildPath(k) {   /* V2.38: what stands between the town and a building: rank, research chain, parts */
  const d = DEFS[k], steps = []; if (S.rank < (d.rank || 1)) steps.push(`rank ${d.rank}`);
  if (d.res && !researched(d.res)) { const chain = []; let r = d.res; while (r && !researched(r)) { chain.unshift(RESEARCH[r].name + ` (${RESEARCH[r].rp} RP)`); r = RESEARCH[r].need; } steps.push('research ' + chain.join(' → ') + (bOf('workshop').length ? '' : ' at a Workshop')); }
  steps.push(`⚙ ${d.mat} parts`); return 'Needs ' + steps.join(', ');
}
function rankConds() {
  const q = RANK_REQ[S.rank]; if (!q) return null; const st = supplyStats(), flow = Math.round((st.fNet + st.wNet) * 10) / 10, built = bOf(q.build).length > 0;
  return [
    { ic: 'rating', name: 'Renown', need: q.ren, have: S.ren, ok: S.ren >= q.ren },
    { ic: 'supplies', name: 'Daily supplies', need: '+' + q.flow, have: (flow >= 0 ? '+' : '') + flow, ok: flow >= q.flow, sub: 'food + water made per day, after rations' },
    { ic: 'events', name: 'Events held', need: q.events, have: S.eventsHeld || 0, ok: (S.eventsHeld || 0) >= q.events },
    { ic: 'living', name: 'Build ' + DEFS[q.build].name, need: '', have: built ? 'Done' : 'Pending', ok: built, wide: true, sub: built ? '' : buildPath(q.build) },
  ];
}
function checkRank() {
  const c = rankConds(); if (!c) return; const ok = c.every((r) => r.ok);
  if (ok && !S.rankReady) { S.rankReady = true; banner('★ THE TOWN CAN BE UPGRADED'); say('All rating conditions met — open Upgrade Town (tap the Renown wheel) to raise the Haven\'s rank.', true); }
  if (!ok) S.rankReady = false; ui();
}
function upgradeTown() {
  const c = rankConds(); if (!c || !c.every((r) => r.ok)) return false;
  S.rank++; S.threat++; S.rankReady = false; SFX('rankup'); S.mat += 4 + S.rank; renownGain(5, 'Haven Rank ' + S.rank); showEventPopup({ title: '★ HAVEN RANK ' + S.rank + ' ★', text: 'Word of the Haven spreads.<br>' + rankUnlocks(S.rank).filter((x) => !x.startsWith('+')).map((x) => '• ' + esc(x)).join('<br>'), gains: '+' + (4 + S.rank) + ' parts' }); say('HAVEN RANK ' + S.rank + '! New threats and opportunities.', true); ui(); return true;
}
/* V2.33 town events (like DV2's): cost supplies, run for a few hours, give Renown and mood, and count toward the next star */
const TOWN_EVENTS = {
  bonfire: { name: 'Bonfire Night', icon: '🔥', cost: { food: 4, water: 2 }, ren: 6, sat: 8, hours: 3, desc: 'Stories and songs around the fire. Everyone feels better.' },
  market: { name: 'Swap Market', icon: '🧺', cost: { mat: 6 }, ren: 8, sat: 4, hours: 4, desc: 'Survivors trade odds and ends. Brings in a little food and water.', gain: { food: 3, water: 3 } },
  sports: { name: 'Sports Day', icon: '🏃', cost: { food: 3, water: 4 }, ren: 7, sat: 5, hours: 3, desc: 'Races and games. Everyone gets some training in.', train: 30 },
  feast: { name: 'Harvest Feast', icon: '🍲', cost: { food: 8, water: 4 }, ren: 12, sat: 12, hours: 4, rank: 2, desc: 'A proper meal for everyone. Hunger and mood are restored.' },
  caravan: { name: 'Trade Caravan', icon: '🐫', cost: { food: 12, water: 10 }, ren: 6, sat: 3, hours: 4, rank: 3, desc: 'A passing caravan takes surplus food and water and pays in parts.', gain: { mat: 10 } },   /* V2.38: a use for a full pantry */
};
function holdEvent(k) {
  const e = TOWN_EVENTS[k]; if (!e || (e.rank || 1) > S.rank) return false;
  if ((S.lastEventDay ?? -1) >= S.day) { say('Only one event a day.'); return false; }
  if (!Object.entries(e.cost).every(([r, v]) => S[r] >= v)) { say('Not enough supplies for ' + e.name + '.'); return false; }
  for (const [r, v] of Object.entries(e.cost)) S[r] -= v;
  S.lastEventDay = S.day; S.eventsHeld = (S.eventsHeld || 0) + 1; S.eventOn = { k, until: nowH() + e.hours };
  for (const q of S.sv) { if (q.hp <= 0) continue; q.sat += e.sat; if (k === 'feast') q.hunger = Math.max(0, q.hunger - 40); if (e.train) { q.tp = q.tp || {}; const st = (JOB_STATS[q.job] || ['str'])[0]; q.tp[st] = (q.tp[st] || 0) + e.train; } }
  if (e.gain) for (const [r, v] of Object.entries(e.gain)) S[r] += v;
  renownGain(e.ren, e.name); SFX('event'); banner(e.icon + ' ' + e.name.toUpperCase()); say(e.name + ' is on! ' + e.desc, true); checkRank(); return true;
}
function showUpgrade(tab) {   /* the DV2-style Upgrade Town screen */
  closeP(); endBuildMode(true); upTab = tab || upTab; const c = rankConds();
  let h = tabBar([['rank', 'Upgrade', 'rating'], ['events', 'Events', 'events']], upTab);
  if (upTab === 'rank') {
    h += `<div class="ribbon"><div class="rname">${esc(S.townName || 'Zombie Haven')}</div><div class="rstars">${'★'.repeat(S.rank)}<span>${'★'.repeat(Math.max(0, 5 - S.rank))}</span></div></div>`;
    if (!c) h += '<div class="card" style="text-align:center">The Haven is at the highest rank.</div>';
    else {
      h += `<div class="conds"><div class="ctitle">★${S.rank + 1} Rating Conditions</div>` + c.map((r) => `<div class="crow"><span class="cic">${uiIcon(r.ic)}</span><span class="cname">${r.name}${r.sub ? `<small>${r.sub}</small>` : ''}</span>${r.wide ? '' : `<span class="cneed">${r.need}</span>`}<span class="chave${r.wide ? ' wide' : ''}">${r.have}</span><span class="cok ${r.ok ? 'y' : 'n'}">${r.ok ? '✔' : '✘'}</span></div>`).join('') + '</div>';
      h += `<div class="card"><b>★${S.rank + 1} unlocks</b>${rankUnlocks(S.rank + 1).map((x) => `<div class="sm">• ${esc(x)}</div>`).join('')}</div>`;
      h += `<div style="text-align:center"><button class="act go" id="uDo" ${c.every((r) => r.ok) ? '' : 'disabled'}>Upgrade the Haven</button></div>`;
    }
  } else {
    const done = (S.lastEventDay ?? -1) >= S.day;
    h += `<div class="sm" style="margin-bottom:6px">Hold one event a day. Events give Renown and cheer everyone up${S.eventOn && nowH() < S.eventOn.until ? ` · <b>${TOWN_EVENTS[S.eventOn.k].name}</b> is on now` : ''}. Held so far: <b>${S.eventsHeld || 0}</b>.</div>`;
    h += Object.entries(TOWN_EVENTS).map(([k, e]) => { const lk = (e.rank || 1) > S.rank, can = !lk && !done && Object.entries(e.cost).every(([r, v]) => S[r] >= v);
      return `<div class="card"><div class="row"><span style="font-size:30px">${e.icon}</span><span class="sp"><b>${e.name}</b> <span class="sm">+${e.ren}★ · ${e.hours} h</span><br><small>${e.desc}</small>${e.gain ? `<br><small style="color:var(--good)">You get: ${costText(e.gain)}</small>` : ''}</span><button class="act${can ? ' go' : ''}" data-ev="${k}" ${can ? '' : 'disabled'}>${lk ? '🔒 Rank ' + e.rank : costText(e.cost)}</button></div></div>`; }).join('');
  }
  $('ib').innerHTML = h; showPanel('Upgrade Town');
  $('ib').querySelectorAll('[data-tab]').forEach((b) => { b.onclick = () => showUpgrade(b.dataset.tab); });
  const u = $('uDo'); if (u) u.onclick = () => { if (upgradeTown()) showUpgrade('rank'); };
  $('ib').querySelectorAll('[data-ev]').forEach((b) => { b.onclick = () => { if (holdEvent(b.dataset.ev)) showUpgrade('events'); }; });
}
let upTab = 'rank';
function ui() {
  if (performance.now() - (ui.adv || 0) > 1500) { ui.adv = performance.now(); try { advisorUpdate(); } catch (e) { /* never block the HUD */ } }
  { const n = rankRules[S.rank], pv = rankRules[S.rank - 1] || { ren: 0 }, bar = $('renBar'); if (bar) bar.style.width = (n ? Math.max(0, Math.min(100, (S.ren - (rankRules[S.rank - 1] ? rankRules[S.rank - 1].ren : 0)) / Math.max(1, n.ren - (rankRules[S.rank - 1] ? rankRules[S.rank - 1].ren : 0)) * 100)) : 100) + '%'; } $('food').textContent = Math.floor(S.food); $('water').textContent = Math.floor(S.water); $('mat').textContent = Math.floor(S.mat); $('ren').textContent = S.ren; $('rank').textContent = '★'.repeat(S.rank); $('gauge').classList.toggle('ready', !!S.rankReady); $('threat').textContent = S.threat;
  $('clock').textContent = `DAY ${S.day} · ${String(S.hour).padStart(2, '0')}:00`;
  $('qt').textContent = S.stage === 0 ? 'Build a Rain Collector' : S.stage === 1 ? `Defeat 3 Walkers (${Math.min(S.kills, 3)}/3)` : guideActive() ? `▶ ${GUIDE[S.guide].desc}` : (S.mission ? `${S.mission.name}: ${Math.floor(S.mission.progress)}/${S.mission.goal}` : 'Grow the Haven!');
}

/* ---------------- save / load / migration ---------------- */
const SKIP = new Set(['post', 'target', 'facility', 'rescuer', 'rescuing', 'carrying', 'path', 'pathGoal', 'pathVer', 'lastFacility', 'moving', 'stuck', 'lastD', 'hideAt', 'fireAt', 'careAt']);   /* V2.36: hideAt / fireAt are building links too: saving while someone hid in a staffed building failed silently */
function serialize() {
  const sv = S.sv.map((s) => { const o = {}; for (const k in s) if (!SKIP.has(k)) o[k] = s[k]; return o; });
  const { requests, sv: _sv, z: _z, ...rest } = S;
  return JSON.stringify({ sid: SID, version: VERSION, S: rest, sv, roads: [...world.roads], walls: [...world.walls.values()].map((w) => [w.x, w.y, w.type, Math.round(w.hp), w.broken ? 1 : 0]), buildings: world.buildings.map((b) => ({ type: b.type, x: b.x, y: b.y, rot: r4Conv(b.type, Wd.R4(b)) & 1, r4: r4Conv(b.type, Wd.R4(b)), w: b.w, h: b.h, q: b.q, a: b.a, unpaid: !!b.unpaid, fire: b.fire || 0, burnt: !!b.burnt, rushT: b.rushT || 0, rushes: b.rushes || 0, staffId: b.staff ? b.staff.id : null })), cam: { x: cam.x, y: cam.y, z: cam.z }, time: Date.now() });
}
function writeKey(key, data) { try { localStorage.setItem(key, data); return true; } catch (e) { return e || new Error('blocked'); } }
function readKey(key) { try { return localStorage.getItem(key); } catch (e) { return null; } }
/* V2.40: the title screen's background town is never saved over a slot. V2.42: failures are reported, storage-full drops this slot's day backup and retries,
   a save that could not be loaded (or was changed by another tab) is never overwritten. */
function saveGame() {
  if (titleOn || saveBlocked) return false;
  let data; try { data = serialize(); } catch (e) { saveFail('the town could not be packed (' + e.message + ')'); return false; }
  let r = writeKey(SAVE_KEY, data);
  if (r !== true) { try { localStorage.removeItem(BAK(SAVE_KEY)); localStorage.removeItem(BAD(SAVE_KEY)); } catch (e) { /* ignore */ } r = writeKey(SAVE_KEY, data); }
  if (r !== true) { saveFail(/quota/i.test(r.name + r.message) ? 'the browser storage is full' : 'the browser blocked storage (private browsing?)'); return false; }
  if (saveErr) { saveErr = ''; renderAlerts(); }
  S.lastSave = tick; if (S.bakDay !== S.day && writeKey(BAK(SAVE_KEY), data) === true) S.bakDay = S.day;   /* first save of each day becomes the backup */
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
function relinkSurvivor(s) {
  if (!s.st) s.st = rollStats(s.job, s.l); if (!s.tp) s.tp = {}; if (!s.eq) { const nm = s.weapon && s.weapon[0], id = Object.keys(ITEMS).find((k) => ITEMS[k].name === nm) || 'pipe'; s.eq = { weapon: id, armor: null, acc: null }; } delete s.weapon;   /* V2.14 save upgrade: stats + gear slots */
  if (!s.cls) { s.cls = { [s.job]: { l: s.l || 1, xp: s.mastery || 0 } }; } if (!s.skills) s.skills = []; learnSkills(s, true); syncClass(s); { const m = baseMax(s); if (m > s.max) { s.hp += m - s.max; s.max = m; } }   /* V2.12 save upgrade: class levels + earned skills */
  if (!TRAITS[s.trait]) { s.trait = rollTrait(s); const m = baseMax(s); if (m > s.max) { s.hp += m - s.max; s.max = m; } }   /* V2.43 save upgrade: everyone gets a personality */
  s.post = null; s.target = s.facility = s.rescuer = s.rescuing = s.carrying = null; s.path = null; s.moving = false; s.why = s.why || 'Back from a break'; s.purpose = null; s.idleBubble = '';
  if (s.hp <= 0) s.mode = 'down'; else if (!['free', 'wait', 'down', 'hospital', 'postCombat'].includes(s.mode)) { s.mode = 'free'; s.stateTicks = 80; s.activity = null; s.dest = null; }
  if (s.mode === 'postCombat') { s.mode = 'free'; s.stateTicks = 40; } if (!s.id) s.id = ++S.seq;
}
/* V2.42: try the slot, then its day backup; only a slot with no save at all falls back to the pre-V2.6 keys. A save that fails to load is copied aside and the slot is
   locked against autosave, so a bug or a damaged file can never be replaced by a fresh town. */
const S_INIT = JSON.stringify(S), ROADS_INIT = [...world.roads];
function resetState() { for (const k of Object.keys(S)) delete S[k]; Object.assign(S, JSON.parse(S_INIT)); world.roads = new Set(ROADS_INIT); world.buildings = []; world.walls = new Map(); Wd.setTerritory(0); Wd.bump(world); }
function loadGame() {
  const tries = [[SAVE_KEY, 'main'], [BAK(SAVE_KEY), 'bak']]; if (SLOT === 1) tries.push([PREV_KEY, 'prev'], [OLD_KEY, 'legacy']);
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
function applySave(raw, legacy, prev) {
  try {
    const d = JSON.parse(raw); if (!validSave(d, legacy)) return false;
    if (legacy) {   // V2.4 saves stored positions in screen-ish pixels (TW≈42, TH≈0.4TW); convert to tile units and clamp. Buildings were already tile based.
      Object.assign(S, d.S); S.sv = (d.S.sv || []).map((s) => { const a = (s.w?.x || 0) / 21, b = (s.w?.y || 0) / 8.4; const x = Math.max(0.5, Math.min(COLS - .5, (a + b) / 2)), y = Math.max(0.5, Math.min(ROWS - .5, (b - a) / 2)); return { ...s, w: { x, y }, weapon: s.weapon || weapons[0], path: null }; });
      d.buildings = (d.S.b || []).map((b) => ({ ...b })); d.roads = null; delete S.b;
    } else { Object.assign(S, d.S); S.sv = d.sv || []; }
    if (legacy || prev) {   // V2.5 / V2.4 -> V2.6: money no longer exists. Leftover money becomes parts (capped), income becomes supplies produced, missions reset.
      const m = Number(d.S.money) || 0; S.mat = (Number(S.mat) || 0) + Math.min(40, Math.floor(m / 60)); S.produced = Math.floor((Number(d.S.earned) || 0) / 10);
      delete S.med; S.food = Number(S.food) || 0; S.water = Number(S.water) || 0; S.mission = null; S.missionStart = { kills: S.kills || 0, produced: S.produced, built: S.builtCount || 0 };
      delete S.money; delete S.earned; S.sv.forEach((q) => { delete q.money; });
    }
    if (S.produced === undefined) S.produced = 0; delete S.med;
    if (d.roads) world.roads = new Set(d.roads.map((r) => (Array.isArray(r) ? r.join(',') : r))); world.buildings = (d.buildings || []).filter((b) => DEFS[b.type]).map((b) => { const r = r4Conv(b.type, (b.r4 != null ? b.r4 : b.rot ? 3 : 0) & 3); return { type: b.type, x: b.x, y: b.y, rot: r & 1, r4: r, w: r & 1 ? DEFS[b.type].h : DEFS[b.type].w, h: r & 1 ? DEFS[b.type].w : DEFS[b.type].h, q: b.q ?? DEFS[b.type].q, a: b.a ?? DEFS[b.type].a, unpaid: !!b.unpaid, fire: b.fire || 0, burnt: !!b.burnt, rushT: b.rushT || 0, rushes: b.rushes || 0, staff: null, _staffId: b.staffId || null }; });
    world.walls = new Map(); for (const [x, y, type, hp, br] of (d.walls || [])) { const def = Wd.WALL_DEFS[type]; if (def) { const mx = Math.round(def.hp * (researched('walls') ? 1.3 : 1)); world.walls.set(x + ',' + y, { x, y, type, hp: Math.max(0, Math.min(mx, hp)), max: mx, broken: !!br || hp <= 0 }); } }
    S.z = []; S.requests = []; S.sv.forEach(relinkSurvivor); S.terr = S.terr || 0; Wd.setTerritory(S.terr); S.inv = S.inv || {}; for (const w of (S.spare || [])) { const id = Object.keys(ITEMS).find((k) => ITEMS[k].name === (w && w[0])); if (id && id !== 'pipe') stashAdd(id); } S.spare = []; if (S.nextRaid === undefined) S.nextRaid = S.day + 1.6; if (S.nextBoss === undefined) S.nextBoss = Math.max(3, Math.ceil(S.day / 3) * 3); S.pets = S.pets || []; S.posts = (S.posts || []).filter((p) => p && Number.isFinite(p.x) && Number.isFinite(p.y)); S.log = S.log || []; S.kids = S.kids || []; if (S.nextTrader === undefined) S.nextTrader = S.day + 1; if (S.trader) { S.trader.path = null; S.trader.ex = S.trader.ex || [0, 0, 0, 0]; } if (S.trip) S.trip.members.forEach((m) => { if (!TRAITS[m.trait]) m.trait = rollTrait(m); });
    for (const b of world.buildings) { if (b._staffId) { const q = S.sv.find((x) => x.id === b._staffId); if (q) { b.staff = q; q.post = b; } } delete b._staffId; }
    Wd.bump(world); guideSkipDone(); alerts.clear(); setTimeout(restoreAlerts, 0); return d;
  } catch (e) { console.warn('load failed', e); return false; }
}

/* ---------------- expeditions (V2.8): a squad leaves the map for a timed trip in real time ---------------- */
// Trips run on the real clock (Date.now), so they keep going while the game is closed; the town itself pauses while closed.
const EXP_DEFS = {
  houses:    { name: 'Abandoned Houses',   icon: '🏚️', desc: 'Food and water from empty homes.',          risks: ['low'],             lock: () => '', loot: { food: [1, 2], water: [1, 2] }, lines: ['The squad searches a row of empty houses.', 'They check cellars and cupboards.', 'A quiet street, a few useful cans.'] },
  pharmacy:  { name: 'Pharmacy and Clinic', icon: '🏥', desc: 'A few parts, and a chance to find survivors.', risks: ['low', 'medium'], lock: () => (world.walls.size ? '' : 'Build a wall first'), loot: { mat: [1, 2] }, recruit: { low: .3, medium: .55 }, lines: ['The squad forces the pharmacy shutters.', 'Shelves are mostly bare, but the back room is intact.', 'They hear someone calling from the clinic.'] },
  warehouse: { name: 'Warehouse District', icon: '🏭', desc: 'Parts, and plenty of them.',                  risks: ['medium', 'high'],  lock: () => (S.rank >= 3 ? '' : 'Needs Haven rank 3'), loot: { mat: [3, 5] }, lines: ['The squad slips between loading docks.', 'Crates of hardware, half of it salvageable.', 'A forklift pins a stack of steel; they cut it free.'] },
};
const EXP_RISK = { low: { label: 'Low', min: 5, mult: 1, death: .005, hurt: .10 }, medium: { label: 'Medium', min: 15, mult: 2.5, death: .017, hurt: .22 }, high: { label: 'High', min: 30, mult: 5, death: .04, hurt: .38 } };
const EXP_STAGES = 3, EXP_MAX_SQUAD = 4, EXP_HOME_MIN = 2, EXP_COST = { low: 1, medium: 2, high: 4 }, EXP_BACK_DEATH = .003;
const expKind = (s) => (['Guard', 'Police Officer', 'SWAT'].includes(s.job) ? 'guard' : ['Medic', 'Paramedic'].includes(s.job) ? 'medic' : s.job === 'Scavenger' ? 'scav' : 'other');
function expBlock(s) {   // why a survivor can't go on an expedition (null = free to go)
  if (s.hp <= 0 || ['down', 'hospital'].includes(s.mode)) return 'hurt'; if (s.hp < s.max * .6) return 'hurt';
  if (s.rescuing || s.carrying || ['rescueTo', 'rescueCarry'].includes(s.mode)) return 'rescuing';
  if (['chase', 'attack', 'recover'].includes(s.mode)) return 'fighting';
  if (['hide', 'hiding'].includes(s.mode)) return 'hiding';
  if (s.hunger >= 75) return 'hungry'; if (s.thirst >= 75) return 'thirsty';
  if (!['free', 'wait', 'postCombat', 'work', 'goWork', 'walk', 'goFacility', 'useFacility'].includes(s.mode)) return 'busy';
  return null;
}
const expEligible = (s) => s.hp > 0 && s.hp >= s.max * .6 && s.hunger < 75 && s.thirst < 75 && !s.rescuing && !s.carrying && ['free', 'wait', 'postCombat', 'work', 'goWork', 'walk', 'goFacility', 'useFacility'].includes(s.mode);
const expFit = (s) => (s.hp / s.max) * (1 - Math.max(s.hunger, s.thirst) / 200) * (1 + .1 * (s.l || 1));
function expAutoSquad(size = 3) {   // a balanced squad of healthy, fed, idle people: one guard, one medic, one scavenger, then the fittest
  const pool = S.sv.filter(expEligible).sort((a, b) => expFit(b) - expFit(a)), out = [], limit = Math.max(0, Math.min(EXP_MAX_SQUAD, size, S.sv.length - EXP_HOME_MIN));
  for (const k of ['guard', 'medic', 'scav']) { const c = pool.find((q) => expKind(q) === k && !out.includes(q)); if (c && out.length < limit) out.push(c); }
  for (const q of pool) if (out.length < limit && !out.includes(q)) out.push(q);
  return out;
}
const expPlain = (s) => { const o = {}; for (const k in s) if (!SKIP.has(k)) o[k] = s[k]; return o; };
function expSafety(ms) { return ms.reduce((a, s) => a + 1 + .08 * (s.l || 1) + .05 * (professions[s.job]?.combat || 0) + .03 * weaponOf(s).atk / 10 + .02 * (((itemOf(s, 'armor') || {}).def) || 0), 0) / (ms.length || 1); }
const expTraitLoot = (ms) => (1 + .15 * ms.filter((m) => hasT(m, 'scrounger')).length) * (ms.length <= 2 ? 1 + .25 * ms.filter((m) => hasT(m, 'loner')).length : 1);   /* V2.43 */
const expRiskMult = (t) => Math.min(1.6, Math.max(.5, 1.3 / expSafety(t.members))) * (t.short ? 1.5 : 1);
function expPreview(destId, riskId, members) {
  const d = EXP_DEFS[destId], rk = EXP_RISK[riskId], n = members.length, need = EXP_COST[riskId] * n, short = S.food < need || S.water < need;
  const kinds = new Set(members.map(expKind).filter((k) => k !== 'other')).size, avgL = n ? members.reduce((a, s) => a + (s.l || 1), 0) / n : 1;
  const mult = rk.mult * (1 + .12 * Math.max(0, kinds - 1)) * (1 + .04 * (avgL - 1)) * expTraitLoot(members);
  const rm = n ? Math.min(1.6, Math.max(.5, 1.3 / expSafety(members))) * (short ? 1.5 : 1) : 1;
  return { need, short, mult, deathPerStage: rk.death * rm, hurtPerStage: rk.hurt * rm, minutes: rk.min };
}
function expLocked(destId) { return EXP_DEFS[destId].lock(); }
function startExpedition(destId, riskId, ids) {
  const d = EXP_DEFS[destId], rk = EXP_RISK[riskId]; if (!d || !rk) return { ok: false, why: 'Unknown trip' };
  if (S.trip) return { ok: false, why: 'A squad is already out' };
  const lock = expLocked(destId); if (lock) return { ok: false, why: lock };
  if (!d.risks.includes(riskId)) return { ok: false, why: d.name + ' only offers ' + d.risks.map((r) => EXP_RISK[r].label).join(' / ') + ' trips' };
  const ms = (ids || []).map((id) => S.sv.find((q) => q.id === id)).filter(Boolean);
  if (!ms.length) return { ok: false, why: 'Pick at least one survivor' }; if (ms.length > EXP_MAX_SQUAD) return { ok: false, why: 'A squad is at most ' + EXP_MAX_SQUAD };
  if (S.sv.length - ms.length < EXP_HOME_MIN) return { ok: false, why: `Keep at least ${EXP_HOME_MIN} survivors at home` };
  if (ms.some((q) => q.hp <= 0 || ['down', 'hospital', 'rescueTo', 'rescueCarry'].includes(q.mode))) return { ok: false, why: 'Someone is hurt or busy' };
  const pv = expPreview(destId, riskId, ms), take = (k, n) => { const g = Math.min(S[k], n); S[k] -= g; return g; };
  take('food', pv.need); take('water', pv.need);
  for (const q of ms) { releasePost(q); for (const z of S.z) if (z.target === q) { z.target = null; z.mode = 'idle'; } if (selected && selected.ref === q) { selected = null; closeP(); } }
  S.sv = S.sv.filter((q) => !ms.includes(q));
  S.trip = { dest: destId, risk: riskId, t0: Date.now(), dur: rk.min * 60000, stage: 0, phase: 'out', backAt: 0, short: pv.short, members: ms.map(expPlain), loot: { food: 0, water: 0, mat: 0 }, log: [`Departed for ${d.name} (${rk.label} risk).` + (pv.short ? ' Short on supplies: the trip is riskier.' : '')], lost: [], hurt: [], troubleSeen: 0 };
  ms.forEach((q) => { const m = S.trip.members.find((x) => x.id === q.id); m.mode = 'away'; });
  autoStaff(); say(`${ms.map((q) => q.name).join(', ')} left for ${d.name}.`, true); saveGame(); ui(); expTick(); return { ok: true, why: '' };
}
const expStageAt = (t, k) => t.t0 + k * t.dur / EXP_STAGES;
function expResolveStage(t, quiet) {
  t.stage++; const d = EXP_DEFS[t.dest], rk = EXP_RISK[t.risk], ms = t.members;
  const kinds = new Set(ms.map(expKind).filter((k) => k !== 'other')).size, avgL = ms.reduce((a, s) => a + (s.l || 1), 0) / (ms.length || 1), f = rk.mult * (1 + .12 * Math.max(0, kinds - 1)) * (1 + .04 * (avgL - 1)) * (1 + .15 * ms.filter((m) => hasSkill(m, 'lootSense')).length) * (1 + .2 * ms.filter((m) => hasSkill(m, 'treasureHunter')).length) * expTraitLoot(ms);
  const got = [], r = (a) => a[0] + Math.floor(Math.random() * (a[1] - a[0] + 1));
  for (const k in d.loot) { const n = Math.max(1, Math.round(r(d.loot[k]) * f)); t.loot[k] += n; got.push(`${n} ${k === 'mat' ? 'parts' : k}`); }
  if (Math.random() < .2 * Math.sqrt(rk.mult) * (ms.some((m) => hasSkill(m, 'treasureHunter')) ? 2 : 1)) { const pool = ['gloves', 'belt', 'shoes', 'goggles', 'glasses', 'charm', 'leather', 'hockey', 'biker', 'crowbar', 'nailbat', 'machete', 'spear', 'axe', 'bow', 'revolver', 'riot', 'kevlar', 'rifle', 'shotgun', 'plate', 'dogtags', 'katana', 'smg', 'military', 'assault'], id = pool[Math.floor(Math.random() * Math.min(pool.length, 7 + Math.round(rk.mult * 1.3)))]; t.items = (t.items || []).concat(id); got.push(ITEMS[id].name); }   /* V2.14: gear finds */
  const rm = expRiskMult(t); let trouble = [];
  for (const m of [...ms]) {
    const x = Math.random(), tm = hasT(m, 'cautious') ? .7 : 1, dead = rk.death * rm * tm, collapse = rk.hurt * rm * .35 * tm, hurt = rk.hurt * rm * tm;
    if (x < dead) { ms.splice(ms.indexOf(m), 1); t.lost.push(m.name); t.log.push(`Stage ${t.stage}: ${m.name} did not make it.`); trouble.push(`${m.name} was lost`); }
    else if (x < dead + collapse) { m.hp = 0; m.collapsed = true; t.log.push(`Stage ${t.stage}: ${m.name} collapsed and is being carried.`); trouble.push(`${m.name} collapsed`); }
    else if (x < dead + collapse + hurt && !m.collapsed) { m.hp = Math.max(1, Math.round(m.hp * (.3 + Math.random() * .3))); t.log.push(`Stage ${t.stage}: ${m.name} was hurt.`); trouble.push(`${m.name} was hurt`); if (!t.hurt.includes(m.name)) t.hurt.push(m.name); }
  }
  t.log.splice(Math.max(1, t.log.length - trouble.length), 0, `Stage ${t.stage}: ${d.lines[Math.floor(Math.random() * d.lines.length)]} Found ${got.join(' and ')}.`);
  if (!ms.length) { t.log.push('Nobody came back.'); return 'wiped'; }
  if (t.enc) encResolve(t, null);   /* V2.44: no order came during the last stage */
  if (t.stage < EXP_STAGES && encLive(t).length && Math.random() < EXP_ENC_CHANCE && expEncounter(t)) { if (quiet) encResolve(t, null); else encPopup(t); }
  if (trouble.length && !quiet && t.stage < EXP_STAGES) showEventPopup({ title: 'SQUAD IN TROUBLE', text: `${trouble.join(', ')} on stage ${t.stage} of ${EXP_STAGES}. Recall the squad now, or keep going?`, buttons: [{ label: 'RECALL', fn: () => expRecall() }, { label: 'KEEP GOING' }] });
  return trouble.length ? 'trouble' : 'ok';
}
/* ---- V2.44 expedition choices: at the end of stage 1 or 2 the squad may meet a situation with 2–3 options. Each option shows who would do it and the
   chance, worked out from stats, gear, profession and personality. If no order comes before the next stage (or the game is closed) the squad decides itself. ---- */
const STAT_ABBR = { str: 'STR', end: 'END', agi: 'AGI', per: 'PER', int: 'INT', cha: 'CHA' };
const EXP_ENC = {
  door: { title: '🚪 A BARRICADED STORE', text: 'Chained shutters on a corner shop. Whatever is inside has not been looted.', opts: [
    { id: 'force', label: 'Force the shutters', chk: 'str', job: { Engineer: .1, Mechanic: .1, Guard: .05 }, win: { mat: [2, 3] }, fail: 'hurt', winT: '{who} wrenched the shutters open: {got}.', failT: 'The chain snapped back and caught {who}.' },
    { id: 'sneak', label: 'Find a way in at the back', chk: 'agi', job: { Scavenger: .12 }, tr: { scrounger: .1 }, win: { food: [1, 2], water: [1, 2] }, fail: 'none', winT: '{who} squeezed in through a vent: {got}.', failT: '{who} found no way in. Nothing lost.' },
    { id: 'leave', label: 'Leave it', safe: true, winT: 'The squad left the store alone.' }] },
  cry: { title: '📢 A CRY FOR HELP', text: 'Someone is shouting from a rooftop, with the dead crowding the stairwell below.', opts: [
    { id: 'help', label: 'Clear the stairwell', chk: 'fight', tr: { caring: .15, brave: .08 }, win: { recruit: 1 }, fail: 'hurt2', winT: 'The squad cleared the stairs. {got}', failT: 'Too many of them: {who} got hurt pulling back.' },
    { id: 'talk', label: 'Shout directions to them', chk: 'cha', tr: { caring: .1 }, job: { Civilian: .1, Medic: .05 }, win: { gift: 1 }, fail: 'none', winT: '{who} talked them down a fire escape. {got}', failT: 'They could not make it down. The squad moved on.' },
    { id: 'leave', label: 'Keep moving', safe: true, winT: 'The squad kept moving. The shouting faded behind them.' }] },
  horde: { title: '🧟 A HORDE ON THE ROAD', text: 'A slow river of the dead fills the street the squad needs.', opts: [
    { id: 'fight', label: 'Fight through', chk: 'fight', tr: { brave: .1 }, win: { mat: [1, 2], xp: 6 }, fail: 'hurt2', winT: 'The squad cut a path through: {got}.', failT: 'The horde pushed back hard: {who} got hurt.' },
    { id: 'sneak', label: 'Sneak around', chk: 'agi', tr: { cautious: .1, owl: .05 }, job: { Scavenger: .1 }, win: {}, fail: 'hurt', winT: '{who} led them round by the back alleys.', failT: 'A crawler gave them away: {who} got hurt getting clear.' },
    { id: 'back', label: 'Turn back now', safe: true, recall: true, winT: 'The squad turned for home with what they had.' }] },
  cache: { title: '🚗 A WRECKED ARMORED VAN', text: 'A security van on its side, the back door jammed half open.', opts: [
    { id: 'climb', label: 'Climb inside', chk: 'agi', tr: { scrounger: .15 }, job: { Scavenger: .1 }, win: { item: 1 }, fail: 'hurt', winT: '{who} wriggled in and came out with {got}.', failT: 'The wreck shifted and pinned {who} for a moment.' },
    { id: 'pry', label: 'Pry the door off', chk: 'str', job: { Engineer: .12, Mechanic: .12 }, win: { mat: [2, 4] }, fail: 'none', winT: '{who} pried it open and stripped the van: {got}.', failT: 'The door would not move. Nothing lost.' },
    { id: 'leave', label: 'Leave it', safe: true, winT: 'The squad left the van alone.' }] },
  stranger: { title: '🤒 A SICK STRANGER', text: 'A feverish man sits by a burnt-out car, clutching a backpack.', opts: [
    { id: 'treat', label: 'Treat him', chk: 'int', job: { Medic: .2, Paramedic: .2 }, tr: { caring: .1 }, win: { item: 1, ren: 3 }, fail: 'none', winT: '{who} brought the fever down. He gave them {got}.', failT: 'There was nothing {who} could do. Nothing lost.' },
    { id: 'leave', label: 'Move on', safe: true, winT: 'The squad moved on.' }] },
  raiders: { minRisk: 'medium', title: '🔫 RAIDERS DEMAND A TOLL', text: 'Armed raiders block the bridge and want a share of the haul.', opts: [
    { id: 'pay', label: 'Pay half the haul', safe: true, toll: .5, winT: 'The squad paid the toll and crossed.' },
    { id: 'talk', label: 'Talk them down', chk: 'cha', job: { Civilian: .1, 'Police Officer': .08 }, win: { mat: [1, 2] }, fail: 'toll', winT: '{who} talked them into a trade: {got}.', failT: '{who} could not sway them: they took the whole haul.' },
    { id: 'fight', label: 'Fight them', chk: 'fight', hard: 1.5, tr: { brave: .08 }, win: { mat: [3, 5], item: 1, xp: 8 }, fail: 'hurt2', winT: 'The raiders scattered and left their stash: {got}.', failT: 'The raiders fought back: {who} got hurt.' }] },
};
const EXP_ENC_CHANCE = .55, EXP_DANGER = { low: 5, medium: 8, high: 12 }, EXP_CHK_PEN = { low: 0, medium: .06, high: .12 };
const encLive = (t) => t.members.filter((m) => m.hp > 0 && !m.collapsed);
function encOdds(t, o) {   /* → { chance, who } */
  const ms = encLive(t), trB = (m) => Object.entries(o.tr || {}).reduce((a, [k, v]) => a + (hasT(m, k) ? v : 0), 0);
  if (!ms.length || o.safe) return { chance: 1, who: null };
  if (o.chk === 'fight') {
    const pow = ms.reduce((a, m) => a + weaponOf(m).atk / 6 + .5 * (m.l || 1) + (isFighter(m) ? 1.5 : 0) + ((itemOf(m, 'armor') || {}).def || 0) * .1, 0), dg = EXP_DANGER[t.risk] * (o.hard || 1);
    const bonus = Math.max(0, ...ms.map(trB)); return { chance: Math.max(.1, Math.min(.95, pow / (pow + dg) + bonus)), who: 'the squad' };
  }
  let best = null, bv = -1e9; for (const m of ms) { const v = (stat(m, o.chk) - 4) * .06 + ((o.job || {})[m.job] || 0) + trB(m); if (v > bv) { bv = v; best = m; } }
  return { chance: Math.max(.1, Math.min(.95, .35 + bv - EXP_CHK_PEN[t.risk])), who: best.name, whoId: best.id };
}
function expEncounter(t, key) {   /* pick (or force) a situation; stores the odds so the player sees exactly what is rolled */
  if (t.enc) encResolve(t, null);
  const rkI = ['low', 'medium', 'high'].indexOf(t.risk), pool = Object.keys(EXP_ENC).filter((k) => !EXP_ENC[k].minRisk || rkI >= ['low', 'medium', 'high'].indexOf(EXP_ENC[k].minRisk)).filter((k) => k !== t.lastEnc);
  const k = key || pool[Math.floor(Math.random() * pool.length)], E = EXP_ENC[k]; if (!E || !encLive(t).length) return null;
  t.lastEnc = k; t.enc = { k, stage: t.stage, opts: E.opts.map((o) => ({ id: o.id, ...encOdds(t, o) })) };
  return t.enc;
}
function encDefault(t) {   /* the squad's own call: a Brave member takes a good fight, a Cautious one plays safe, otherwise the best odds if they are good */
  const E = EXP_ENC[t.enc.k], ms = encLive(t), opts = t.enc.opts.map((x, i) => ({ ...x, i, o: E.opts[i] })), safe = opts.find((x) => x.o.safe) || opts[0];
  const brave = ms.find((m) => hasT(m, 'brave')), caut = ms.find((m) => hasT(m, 'cautious'));
  const fight = opts.find((x) => x.o.chk === 'fight' && x.chance >= .55); if (brave && fight) return { i: fight.i, lead: brave };
  if (caut) return { i: safe.i, lead: caut };
  const good = opts.filter((x) => !x.o.safe && x.chance >= .6).sort((a, b) => b.chance - a.chance)[0]; return { i: good ? good.i : safe.i, lead: ms[0] };
}
function encResolve(t, i, roll = Math.random()) {   /* i = player's choice (null = no order came) */
  const en = t.enc; if (!en) return null; const E = EXP_ENC[en.k], rk = EXP_RISK[t.risk]; let lead = null;
  if (i == null) { const d = encDefault(t); i = d.i; lead = d.lead; }
  const o = E.opts[i], od = en.opts[i]; t.enc = null; if (!o) return null;
  const actor = (od.whoId && t.members.find((m) => m.id === od.whoId)) || encLive(t)[0], got = [], r = (a) => Math.max(1, Math.round((a[0] + Math.floor(Math.random() * (a[1] - a[0] + 1))) * Math.sqrt(rk.mult)));
  const ok = o.safe || roll < od.chance, hurtOne = (m) => { if (!m) return; const loss = m.max * (.3 + Math.random() * .2) * (1 - dmgReduce(m)); m.hp = Math.max(0, Math.round(m.hp - loss)); if (m.hp <= 0) { m.collapsed = true; t.log.push(`${m.name} collapsed and is being carried.`); } else if (!t.hurt.includes(m.name)) t.hurt.push(m.name); return m.name; };
  let who = actor ? actor.name : 'The squad';
  if (o.toll) { for (const k in t.loot) t.loot[k] = Math.floor(t.loot[k] * (1 - o.toll)); }
  if (ok && o.win) {
    for (const k of ['food', 'water', 'mat']) if (o.win[k]) { const n = r(o.win[k]); t.loot[k] += n; got.push(`${n} ${k === 'mat' ? 'parts' : k}`); }
    if (o.win.item) { const pool = ['crowbar', 'machete', 'leather', 'hockey', 'goggles', 'charm', 'spear', 'axe', 'riot', 'revolver', 'kevlar', 'shotgun'], id = pool[Math.floor(Math.random() * Math.min(pool.length, 4 + Math.round(rk.mult * 1.6)))]; t.items = (t.items || []).concat(id); got.push(ITEMS[id].name); }
    if (o.win.recruit) { if (popNow() < popCap()) { t.recruitNow = true; got.push('The survivor will follow the squad home.'); } else { const n = r([1, 2]); t.loot.food += n; t.ren = (t.ren || 0) + 3; got.push(`The Haven has no room, so the survivor gave them ${n} food (+3 Renown)`); } }
    if (o.win.gift) { const n = r([1, 2]); t.loot.food += n; t.loot.water += n; got.push(`They threw down ${n} food and ${n} water in thanks.`); }
    if (o.win.ren) { t.ren = (t.ren || 0) + o.win.ren; got.push(`(+${o.win.ren} Renown)`); }
    if (o.win.xp) encLive(t).forEach((m) => { m.xpB = (m.xpB || 0) + o.win.xp; });
    if (actor && !o.safe) actor.xpB = (actor.xpB || 0) + 3;
  }
  if (!ok) {
    if (o.fail === 'hurt') who = hurtOne(actor) || who;
    if (o.fail === 'hurt2') { const L = encLive(t).sort(() => Math.random() - .5).slice(0, 2); who = L.map(hurtOne).filter(Boolean).join(' and ') || who; }
    if (o.fail === 'toll') for (const k in t.loot) t.loot[k] = 0;
  }
  const txt = (ok ? o.winT : o.failT || '').replace('{who}', who).replace('{got}', got.join(', ') || 'nothing much');
  t.log.push(`${E.title.replace(/^\S+\s/, '')}: ${lead ? `no orders came, so ${lead.name}${TRAITS[lead.trait] ? ' (' + TRAITS[lead.trait].name + ')' : ''} chose “${o.label}”. ` : `“${o.label}”: `}${txt}`);
  t.choices = (t.choices || 0) + 1; if (o.recall && t.phase === 'out') expRecall(); return { ok, text: txt, opt: o.id };
}
function encButtons(t) {
  const en = t.enc, E = EXP_ENC[en.k];
  return E.opts.map((o, i) => { const od = en.opts[i]; return { label: `${o.label}<small class="encOdds">${o.safe ? (o.toll ? 'lose half the haul' : o.recall ? 'safe · ends the trip' : 'safe') : `${o.chk === 'fight' ? 'FIGHT' : STAT_ABBR[o.chk]} · ${esc(od.who)} · ${Math.round(od.chance * 100)}%`}</small>`, fn: () => encChoose(en, i) }; });
}
function encChoose(en, i) {   /* a stale pop-up (the squad already decided) does nothing */
  const t = S.trip; if (!t || t.enc !== en) { say('The squad already decided.'); return; }
  const r = encResolve(t, i); if (r) { say(r.text.length > 90 ? r.text.slice(0, 88) + '…' : r.text, true); saveGame(); if (expOpen) showExpedition(); }
}
function encPopup(t) {
  const en = t.enc, E = EXP_ENC[en.k];
  showEventPopup({ title: E.title, text: `${E.text}<br><small>Squad: ${encLive(t).map((m) => esc(m.name) + ' ' + traitIcon(m) + ' ' + Math.ceil(m.hp) + '/' + m.max).join(' · ')}</small><br><small>No order before the next stage and the squad decides for itself.</small>`, buttons: encButtons(t) });
}
function tripUpdate(now = Date.now()) {
  const t = S.trip; if (!t) return;
  if (t.phase === 'out') {
    let guard = 0; while (t.phase === 'out' && t.stage < EXP_STAGES && now >= expStageAt(t, t.stage + 1) && guard++ < 5) { const res = expResolveStage(t, now - expStageAt(t, t.stage + 1) > 5000); if (res === 'wiped') { expFinish(false); return; } }
    if (t.phase === 'out' && t.stage >= EXP_STAGES) expFinish(false);
  } else if (t.phase === 'back' && now >= t.backAt) expFinish(true);
}
function expRecall() {
  const t = S.trip; if (!t || t.phase !== 'out') return false; const now = Date.now(), back = Math.max(10000, (now - t.t0) * .5);
  t.phase = 'back'; t.backAt = now + back; if (t.enc) { t.enc = null; t.log.push('The squad left the situation behind.'); } t.log.push(`Recalled during stage ${t.stage + 1}. Loot from finished stages is kept; walking home.`); say('The squad is on its way home.', true); saveGame(); ui(); return true;
}
function expFinish(recalled) {
  const t = S.trip; if (!t) return; if (t.enc) { if (recalled) { t.enc = null; t.log.push('The squad left the situation behind on the way home.'); } else encResolve(t, null); } S.expCount = (S.expCount || 0) + 1; const d = EXP_DEFS[t.dest], rk = EXP_RISK[t.risk], lines = [];
  if (recalled) for (const m of [...t.members]) if (Math.random() < EXP_BACK_DEATH * expRiskMult(t)) { t.members.splice(t.members.indexOf(m), 1); t.lost.push(m.name); t.log.push(`${m.name} fell on the way home.`); }
  (t.items || []).forEach((id) => stashAdd(id)); const cap = supplyCap(); S.food = Math.min(cap, S.food + t.loot.food); S.water = Math.min(cap, S.water + t.loot.water); S.mat += t.loot.mat; S.produced += t.loot.food + t.loot.water;
  const entry = (() => { for (const w of world.walls.values()) if (w.type === 'gate' && w.y <= 6) return tc(w.x, w.y + 1); return tc(7, 7); })();
  if (t.ren) renownGain(t.ren, 'Expedition'); t.members.forEach((m, i) => { if (m.hp > 0) gainXp(m, 3 * Math.max(1, t.stage) + (m.xpB || 0)); delete m.xpB; m.w = { x: entry.x + (i - 1) * .3, y: entry.y + (i % 2) * .3 }; delete m.collapsed; if (m.hp > 0) m.mode = 'free'; else { m.mode = 'down'; } m.cool = 20; m.stateTicks = 60; const o = { ...m }; relinkSurvivor(o); o.why = m.hp <= 0 ? 'Collapsed — needs rescue' : 'Back from the expedition'; S.sv.push(o); });
  let recruit = null; const tot = Object.entries(t.loot).filter(([, v]) => v).map(([k, v]) => `${v} ${k === 'mat' ? 'parts' : k}`).concat((t.items || []).map((id) => ITEMS[id].name));
  if (t.members.length && S.sv.length + (S.kids || []).length < popCap() && (t.recruitNow || (d.recruit && t.stage >= EXP_STAGES && S.sv.length < 10 && Math.random() < d.recruit[t.risk]))) {
    const names = ['Noah', 'Maya', 'Eli', 'June', 'Rosa', 'Theo', 'Iris', 'Omar'], nm = names.find((n) => !S.sv.some((s) => s.name === n)) || 'Survivor ' + (S.sv.length + 1), jobs = ['Civilian', 'Scavenger', 'Guard', 'Medic', 'Farmer', 'Engineer', 'Cook'], jb = jobs[Math.floor(Math.random() * jobs.length)];
    recruit = mk(nm, jb, 1, entry.x, entry.y + .6, S.sv.length); recruit.sat = 3; recruit.stateTicks = 80; S.sv.push(recruit); t.log.push(`${nm}, a ${jb} (${TRAITS[recruit.trait].icon} ${TRAITS[recruit.trait].name}), was found and followed the squad home.`);
  }
  const body = t.log.map((l) => esc(l)).join('<br>') + `<br><b>Returned:</b> ${t.members.map((m) => esc(m.name)).join(', ') || 'nobody'}.` + (t.lost.length ? `<br><b style="color:#ff8a7a">Lost:</b> ${t.lost.map(esc).join(', ')}.` : '');
  S.lastTrip = { dest: t.dest, risk: t.risk, loot: t.loot, lost: t.lost.slice(), recalled: !!recalled, recruit: recruit && recruit.name };
  S.trip = null; autoStaff(); showEventPopup({ title: 'EXPEDITION REPORT', text: `<b>${d.name}</b> · ${rk.label} risk<br>${body}`, gains: tot.length ? '+' + tot.join(' · +') : 'Nothing found' }); saveGame(); ui(); expTick();
}
/* ---- UI ---- */
let expOpen = false; const expSel = { dest: 'houses', risk: 'low', ids: null };
const mmss = (ms) => { const s = Math.max(0, Math.ceil(ms / 1000)); return Math.floor(s / 60) + ':' + String(s % 60).padStart(2, '0'); };
function expTripLeft(t, now = Date.now()) { return t.phase === 'back' ? t.backAt - now : t.t0 + t.dur - now; }
function expTick() {   // called every second: chip on the HUD and the live numbers in the panel
  const t = S.trip, chip = $('tripChip'); if (chip) { chip.style.display = t ? '' : 'none'; if (t) $('tripTime').textContent = (t.phase === 'back' ? '↩ ' : '') + mmss(expTripLeft(t)); }
  if (expOpen && t && $('expTime')) { $('expTime').textContent = mmss(expTripLeft(t)); const st = $('expStage'); if (st) st.textContent = t.phase === 'back' ? 'Walking home' : `Stage ${Math.min(EXP_STAGES, t.stage + 1)} of ${EXP_STAGES}`; }
}
function showExpedition() {
  endBuildMode(true); closeP(); expOpen = true; $('it').textContent = 'Explore'; const t = S.trip;
  if (t) {
    const d = EXP_DEFS[t.dest];
    $('ib').innerHTML = `<b>${d.icon} ${d.name}</b> · ${EXP_RISK[t.risk].label} risk<br><span id="expStage">${t.phase === 'back' ? 'Walking home' : `Stage ${Math.min(EXP_STAGES, t.stage + 1)} of ${EXP_STAGES}`}</span> · <b id="expTime">${mmss(expTripLeft(t))}</b> left<br>
      Squad: ${t.members.map((m) => `${esc(m.name)} (${m.job}, HP ${Math.ceil(m.hp)}/${m.max})`).join(', ')}<br>
      Loot so far: ${['food', 'water', 'mat'].map((k) => `${t.loot[k]} ${k === 'mat' ? 'parts' : k}`).join(' · ')}<br>${t.enc ? `<div class="card encCard"><b>${EXP_ENC[t.enc.k].title}</b><div class="sm">${EXP_ENC[t.enc.k].text} Decide before the next stage, or the squad decides.</div>${encButtons(t).map((b, i) => `<button class="act${i === 0 ? ' go' : ''}" data-enc="${i}" style="width:100%;margin:4px 0 0">${b.label}</button>`).join('')}</div>` : ''}<small>${t.log.map(esc).join('<br>')}</small><br>
      ${t.phase === 'out' ? '<button class="act danger" id="expRecall">RECALL SQUAD</button><br><small>Recall keeps the loot from finished stages and skips the risk of the rest. Leaving mid-stage forfeits that stage’s loot. The trip keeps running while the game is closed.</small>' : '<small>The squad is heading back.</small>'}`;
    const rb = $('expRecall'); if (rb) rb.onclick = () => { if (expRecall()) showExpedition(); };
    $('ib').querySelectorAll('[data-enc]').forEach((b) => { const en = t.enc; b.onclick = () => encChoose(en, +b.dataset.enc); });
  } else {
    if (!EXP_DEFS[expSel.dest] || expLocked(expSel.dest)) expSel.dest = 'houses';
    const d = EXP_DEFS[expSel.dest]; if (!d.risks.includes(expSel.risk)) expSel.risk = d.risks[0];
    let ids = (expSel.ids || []).filter((id) => S.sv.some((q) => q.id === id && expEligible(q))); if (!ids.length) ids = expAutoSquad().map((q) => q.id); expSel.ids = ids;
    const members = ids.map((id) => S.sv.find((q) => q.id === id)).filter(Boolean), pv = expPreview(expSel.dest, expSel.risk, members), rk = EXP_RISK[expSel.risk];
    const ready = S.sv.filter(expEligible);
    $('ib').innerHTML = `<div class="sm">Where to?</div><div class="lst">${Object.entries(EXP_DEFS).map(([k, v]) => { const lk = expLocked(k); return `<div class="card" data-d="${k}" style="${expSel.dest === k ? 'border-color:var(--gold)' : ''}${lk ? ';opacity:.5' : ''}"><span style="font-size:28px">${v.icon}</span><div class="sp">${v.name}<div class="sm">${lk ? '🔒 ' + lk : expSel.dest === k ? d.desc : ''}</div></div>${expSel.dest === k ? '<b>✔</b>' : ''}</div>`; }).join('')}</div>
      <div class="sm">Risk</div><div class="tabs" style="position:static">${d.risks.map((r) => `<button data-r="${r}" class="${expSel.risk === r ? 'on' : ''}">${EXP_RISK[r].label} · ${EXP_RISK[r].min}m</button>`).join('')}</div>
      <div class="sm">Squad (1–${EXP_MAX_SQUAD}, ${EXP_HOME_MIN} stay home)</div><div class="lst">${S.sv.map((q) => { const on = ids.includes(q.id), ok = expEligible(q); return `<div class="card" data-s="${q.id}" style="${on ? 'border-color:var(--good)' : ''}${ok || on ? '' : ';opacity:.45'}">${portrait(q)}<div class="sp">${esc(q.name)} ${traitIcon(q)} <span class="sm">${q.job} Lv.${q.l}</span><div class="sm">${ok ? 'Ready' : expBlock(q) || 'Busy'}${['cautious', 'scrounger', 'loner'].includes(q.trait) ? ' · ' + TRAITS[q.trait].name + (q.trait === 'cautious' ? ': safer' : q.trait === 'loner' ? ': +loot in 1–2' : ': +loot') : ''}</div></div>${on ? '<b style="color:var(--good)">✔</b>' : ''}</div>`; }).join('')}</div>
      <div class="card"><div>Cost: 🍖${pv.need} 💧${pv.need}${pv.short ? ' <span style="color:var(--bad)">(short: riskier)</span>' : ''} · Loot ×${pv.mult.toFixed(1)}</div><div class="sm">Each stage, per person: ${(pv.hurtPerStage * 100).toFixed(0)}% hurt · ${(pv.deathPerStage * 100).toFixed(1)}% lost forever</div><div class="sm">On the way the squad may face choices: their stats, gear, professions and personalities set the odds.</div>${ready.length ? '' : '<div class="sm">Nobody is healthy and free right now.</div>'}</div>
      <button class="act go" id="expGo" style="width:100%">Send squad · ${rk.min} min</button>`;
    $('ib').querySelectorAll('[data-d]').forEach((b) => { b.onclick = () => { if (expLocked(b.dataset.d)) { say(expLocked(b.dataset.d)); return; } expSel.dest = b.dataset.d; showExpedition(); }; });
    $('ib').querySelectorAll('[data-r]').forEach((b) => { b.onclick = () => { expSel.risk = b.dataset.r; showExpedition(); }; });
    $('ib').querySelectorAll('[data-s]').forEach((b) => { b.onclick = () => { const id = +b.dataset.s, q = S.sv.find((x) => x.id === id); if (ids.includes(id)) expSel.ids = ids.filter((x) => x !== id); else if (q && expEligible(q) && ids.length < EXP_MAX_SQUAD) expSel.ids = [...ids, id]; else say('That survivor can’t go right now.'); showExpedition(); }; });
    $('expGo').onclick = () => { const r = startExpedition(expSel.dest, expSel.risk, expSel.ids); if (!r.ok) { say(r.why); return; } expSel.ids = null; showExpedition(); };
  }
  showPanel();
}
/* V2.9 death and recovery model */
const BLEED_TICKS = { none: 7200, medic: 10800, clinic: 12600, hospital: 14400 };
const CARE_TICKS = { medic: 3600, clinic: 2700, hospital: 1800 };
let BANDAGE_COST = 2, BANDAGE_TICKS = 3600;   /* Field Medicine research: 1 part, longer */
function medTier() { const m = medSite(); return m ? m.type : 'none'; }
function bleedMax() { return Math.round(BLEED_TICKS[medTier()] * DF().bleed); }
function careTicks() { const t = medTier(), m = medSite(), st = m && isWorking(m) ? Math.max(.6, 1 - (stat(m.staff, 'int') - 5) * .03) : 1; return Math.round((CARE_TICKS[t] || CARE_TICKS.medic) * st * (m ? 1 - combos(m).care : 1) * (m && m.unpaid ? 1.4 : 1)); }
function beingCarried(s) { const r = s.rescuer; return !!(r && r.carrying === s && r.mode === 'rescueCarry'); }
function bleedTick(s) {
  if (s.bleed == null) { s.bleed = bleedMax(); s.warned = false; }
  if (beingCarried(s)) return;
  s.bleed--;
  if (!s.warned && s.bleed <= 1800) { s.warned = true; note('routine', s.name + ' is bleeding out!'); }
  if (s.bleed <= 0) killSurvivor(s, 'bled out');
}
function killSurvivor(s, cause) {
  if (!S.sv.includes(s)) return;
  S.sv = S.sv.filter((q) => q !== s); bondsOnDeath(s);
  S.deaths = (S.deaths || []).filter((d) => d > nowD() - 1); S.deaths.push(nowD());
  if (S.deaths.length >= 2 && !graceOn()) { S.graceUntil = nowD() + 1.5; note('important', '🕯 THE HAVEN MOURNS', { log: 'After so many losses the survivors hold a vigil. The horde pulls back for a while — rebuild your defences.' }); }
  for (const q of S.sv) { if (q.rescuing === s) { q.rescuing = null; if (['rescueTo', 'rescueCarry'].includes(q.mode)) { q.carrying = null; enterFree(q, 60); } } if (q.target === s) q.target = null; }
  for (const b of world.buildings) if (b.staff === s) b.staff = null;
  if (selected && selected.ref === s) { selected = null; closeP(); }
  for (const sl of SLOTS) { const id = s.eq && s.eq[sl]; if (id && id !== 'pipe') stashAdd(id); }   /* their gear goes back to the stash */
  if (s.pet) { (S.pets = S.pets || []).push(s.pet); s.pet = null; }   /* their pet stays with the town */
  let near = 0;
  for (const q of S.sv) { const close = dist(q.w, s.w) < 6 || (q.job === s.job); const d = close ? 6 : 2; q.sat = Math.max(0, q.sat - d); if (close) near++; }
  S.fallen = S.fallen || []; S.fallen.push({ name: s.name, job: s.job, l: s.l, day: S.day, cause, trait: s.trait });
  autoStaff();
  showEventPopup({ title: 'LOST: ' + s.name.toUpperCase(), text: `${s.name}, a level ${s.l} ${s.job}, ${cause}. ${near ? near + ' survivors are shaken.' : ''} Their name is added to the memorial in the Town panel.`, gains: S.sv.length + ' survivors remain' });
  ui();
}
function giveSpare(v) {
  for (const sl of SLOTS) { const ids = Object.keys(S.inv || {}).filter((id) => ITEMS[id] && ITEMS[id].slot === sl).sort((a, b) => itemScore(ITEMS[b]) - itemScore(ITEMS[a])); if (ids[0] && itemScore(ITEMS[ids[0]]) > itemScore(itemOf(v, sl))) equip(v, ids[0]); }
}
function starve(s) {
  if (s.hunger >= 100 || s.thirst >= 100) {
    s.starveT = (s.starveT || 0) + 1; if (s.starveT % 5 === 0) { s.hp -= 1; floats.push({ w: { ...s.w }, t: '-1', col: '#ff8a4b', a: 55 }); }   // 1 HP per 7.5 s: about 1.4 game days from full HP to collapse
    s.why = (s.thirst >= 100 ? 'Dying of thirst' : 'Starving');
    if (!s.starveWarn) { s.starveWarn = true; note('critical', s.name + ' is ' + (s.thirst >= 100 ? 'dying of thirst' : 'starving'), { key: 'starve', icon: '🥫', at: () => { const q = S.sv.find((v) => v.hunger >= 100 || v.thirst >= 100); return q ? q.w : null; }, live: () => S.sv.some((v) => v.hunger >= 100 || v.thirst >= 100), dyn: () => { const n = S.sv.filter((v) => v.hunger >= 100 || v.thirst >= 100).length; return `${n} survivor${n > 1 ? 's are' : ' is'} starving or dying of thirst · losing HP`; }, acts: [{ label: 'Food', fn: () => showResource('food') }, { label: 'Water', fn: () => showResource('water') }] }); }
  } else s.starveWarn = false;
}
function useBandage(s) {
  if (s.mode !== 'down') return false;
  BANDAGE_COST = researched('medicine') ? 1 : 2; BANDAGE_TICKS = researched('medicine') ? 5400 : 3600;
  if (S.mat < BANDAGE_COST) { say('Need ' + BANDAGE_COST + ' parts for a bandage.'); return false; }
  S.mat -= BANDAGE_COST; if (s.bleed == null) s.bleed = bleedMax(); s.bleed = Math.min(s.bleed + BANDAGE_TICKS, bleedMax() + BANDAGE_TICKS); s.warned = false; say('Bandaged ' + s.name + ' · +60 s'); ui(); return true;
}
const routing = () => { const d = S.sv.filter((q) => q.mode === 'down').length; return d >= 3 || (d >= 2 && S.z.some((z) => z.type === 'boss' && z.hp > 0)); };   /* V2.37: the fight is being lost */
function retreatCheck(s) {
  if (s.fleeT > 0) return false;
  if (routing() && s.hp < s.max * .7 && !s.rescuing) { const z = nearestZombie(s); if (z) { s.fleeT = 900; s.target = null; s.path = null; startHide(s, z); if (s.mode === 'hide') { s.why = 'The fight is lost: sheltering until it is safe'; return true; } } }
  const on = S.z.filter((z) => z.hp > 0 && z.target === s && ['zchase', 'zattack', 'zrecover'].includes(z.mode) && dist(z.w, s.w) < 2.5).length;
  if ((on >= 3 && s.hp < s.max * .6) || (on >= 2 && s.hp < s.max * .45)) {   /* V2.37: two on you and under 45% is enough to fall back */ const keep = S.retreat; S.retreat = 100; const r = retreatCheck2(s); S.retreat = keep; if (r) s.why = 'Outnumbered — falling back to ' + (medSite() ? DEFS[medSite().type].name : 'cover'); return r; }
  return retreatCheck2(s);
}
function retreatCheck2(s) {
  if (s.hp < s.max * (S.retreat === 100 ? 100 : Math.max(5, Math.min(95, retreatPct() + traitRetreat(s)))) / 100) { s.fleeT = 1500; s.target = null; s.path = null; const m = medSite(); if (m) { s.facility = m; s.mode = 'goFacility'; s.stateTicks = 9999; s.dest = null; s.why = (hasT(s, 'cautious') && S.retreat !== 100 ? 'Hurt (Cautious: falls back early)' : 'Badly hurt') + ' → ' + DEFS[m.type].name; } else { const z = nearestZombie(s); if (z) { startHide(s, z); s.why = 'Badly hurt — ' + s.why; } else { s.mode = 'free'; s.stateTicks = 30; s.why = 'Retreating, badly hurt'; } } return true; }
  return false;
}

/* ---------------- build / move / demolish ---------------- */
let moving = null;   // building being moved (removed from world while placing)
function closeP() { $('infoPanel').classList.remove('show'); expOpen = false; panelBack = null; if (selected && selected.kind === 'post') selected = null; }
function endBuildMode(restore) {
  if (restore && moving) { world.buildings.push(moving); Wd.bump(world); }
  moving = null; sel = null; preview = null; $('confirmBar').style.display = 'none'; renderAlerts(); setTimeout(nextEventPopup, 0);   /* V2.34: pop-ups wait while you are placing something */
}
function startTool(tool) {
  endBuildMode(true); closeP(); sel = tool; preview = null; renderAlerts();
  if (tool.kind === 'wall') { const wd = Wd.WALL_DEFS[tool.wtype]; $('confirmName').textContent = `${wd.name.toUpperCase()} · ${wd.mat} part${wd.mat > 1 ? 's' : ''} per tile · tap to place, tap again to remove` + (tool.wtype === 'metal' ? ' · tap a wood wall to upgrade' : ''); $('yesBuild').style.display = 'none'; $('nudge').style.display = 'none'; $('rotBuild').style.display = 'none'; $('noBuild').textContent = 'DONE'; $('confirmBar').style.display = 'block'; }
  else if (tool.kind === 'post') { $('yesBuild').style.display = 'none'; $('nudge').style.display = 'none'; $('rotBuild').style.display = 'none'; $('noBuild').textContent = 'DONE'; $('confirmBar').style.display = 'block'; updatePostBar(); }
  else if (tool.kind === 'demolish') { $('confirmName').textContent = 'DEMOLISH · tap a building, road or wall to remove it · buildings and walls give back half their parts'; $('yesBuild').style.display = 'none'; $('nudge').style.display = 'none'; $('rotBuild').style.display = 'none'; $('noBuild').textContent = 'DONE'; $('confirmBar').style.display = 'block'; demoPick = null; }
  else if (tool.kind === 'road') { $('confirmName').textContent = `ROAD · ${Wd.ROAD_COST} part per tile · tap a tile to add, tap a road to remove`; $('yesBuild').style.display = 'none'; $('nudge').style.display = 'none'; $('rotBuild').style.display = 'none'; $('noBuild').textContent = 'DONE'; $('confirmBar').style.display = 'block'; }
  else { $('yesBuild').style.display = ''; $('nudge').style.display = ''; $('rotBuild').style.display = ''; $('noBuild').textContent = 'CANCEL'; say('Tap the tile where the building’s SOUTH corner should sit.'); }
}
function updatePreview(x, y) {
  const R = Wd.R4(sel), d = Wd.rotDef(DEFS[sel.type], R), chk = Wd.placementCheck(world, x, y, d, null); if (chk.ok && (S.posts || []).some((p) => p.x >= x && p.x < x + d.w && p.y >= y && p.y < y + d.h)) { chk.ok = false; chk.why = 'A guard post is in the way'; }
  preview = { type: sel.type, x, y, w: d.w, h: d.h, rot: R & 1, r4: R, q: d.q, a: d.a, ok: chk.ok, why: chk.why };
  const mat = moving ? 0 : d.mat, afford = S.mat >= mat;
  $('confirmName').textContent = `${d.name.toUpperCase()} · ${d.w}×${d.h}` + (moving ? ' · MOVE (free)' : ` · PARTS ${d.mat}`) + (!chk.ok ? ' · ' + chk.why.toUpperCase() : !afford ? ' · NOT ENOUGH PARTS' : '') + (chk.ok ? (() => { const pv = { type: sel.type, x, y, w: d.w, h: d.h }, c = combos(pv); comboCache.map.delete(pv); return c.names.length ? ' · ★ ' + c.names.map((n) => n.split(' (')[0]).join(', ') : ''; })() : '');
  const go = chk.ok && afford; $('yesBuild').disabled = !go; $('yesBuild').style.opacity = go ? 1 : .45; $('confirmBar').style.display = 'block';
}
function pushUnitsOut(b) {
  const dp = Wd.approachPoint(b);
  for (const u of [...S.sv, ...S.z]) if (Iso.footprintContains(b, u.w.x, u.w.y)) { u.w = { x: dp.x + (rnd() - .5) * .3, y: dp.y }; u.path = null; }
}
function confirmPreview() {
  if (!preview || !sel || sel.kind !== 'building') return; const R = Wd.R4(sel), d = Wd.rotDef(DEFS[sel.type], R);
  const chk = Wd.placementCheck(world, preview.x, preview.y, d, null); if (!chk.ok) { say(chk.why); return; } if (!preview.ok) { say(preview.why); return; }
  if (!moving && S.mat < d.mat) { say('Not enough parts.'); return; }
  if (!moving) { SFX('build'); S.mat -= d.mat; S.builtCount++; renownGain(1, 'Construction'); banner('🔨 ' + d.name.toUpperCase() + ' BUILT'); if (sel.type === 'water' && S.stage === 0) { S.stage = 1; renownGain(5, 'Water secured'); questFlash(); } }
  const nb = { type: sel.type, x: preview.x, y: preview.y, rot: R & 1, r4: R, w: d.w, h: d.h, q: moving ? moving.q : d.q, a: moving ? moving.a : d.a, staff: moving ? moving.staff : null };
  world.buildings.push(nb); Wd.bump(world); pushUnitsOut(nb); if (nb.staff) nb.staff.post = nb; autoStaff(); say(moving ? d.name + ' moved.' : d.name + ' constructed!', true); moving = null; sel = null; preview = null; $('confirmBar').style.display = 'none'; selected = null; saveGame(); ui();
}
let demoPick = null;
let tileConfirm = null;   /* V2.38: removing a wall or road takes a second tap on the same tile (it was instant: easy to do by accident) */
function confirmTile(kind, x, y, msg) { const k = kind + x + ',' + y, now = performance.now(); if (tileConfirm && tileConfirm.k === k && now - tileConfirm.t < 4000) { tileConfirm = null; return true; } tileConfirm = { k, x, y, t: now }; say(msg); return false; }
function drawTileConfirm() { if (!tileConfirm || performance.now() - tileConfirm.t > 4000) return; diamond(tileConfirm.x, tileConfirm.y, 'rgba(226,91,85,.55)', '#ffb0a8'); }
function tryDemolish(px, py, x, y) {   /* V2.33: one Demolish tool for buildings, roads and walls (buildings need a second tap to confirm) */
  const b = hitBuilding(px, py) || Wd.buildingAt(world, x, y);
  if (b) { if (demoPick === b) { demoPick = null; selected = null; demolish(b); startTool({ kind: 'demolish' }); return; } demoPick = b; selected = { kind: 'building', ref: b }; say(`Tap ${DEFS[b.type].name} again to demolish it (+${Math.floor(DEFS[b.type].mat * .5)} parts).`); return; }
  demoPick = null; selected = null;
  { const gp = postAt(x, y); if (gp) { if (!confirmTile('p', x, y, 'Tap the guard post again to remove it (+1 part).')) return; removePost(gp); say('Guard post removed.'); ui(); return; } }
  const wl = Wd.wallAt(world, x, y); if (wl) { if (!confirmTile('w', x, y, `Tap the ${Wd.WALL_DEFS[wl.type].name} again to remove it (+${Math.floor(Wd.WALL_DEFS[wl.type].mat * .5)} parts).`)) return; world.walls.delete(Wd.key(x, y)); Wd.bump(world); S.mat += Math.floor(Wd.WALL_DEFS[wl.type].mat * .5); say(Wd.WALL_DEFS[wl.type].name + ' removed.'); checkPerimeter(); saveGame(); ui(); return; }
  if (Wd.isRoad(world, x, y)) { if (!confirmTile('r', x, y, 'Tap the road again to remove it.')) return; world.roads.delete(Wd.key(x, y)); Wd.bump(world); say('Road removed.'); saveGame(); ui(); return; }
  say('Nothing to demolish there.');
}
function tryRoad(x, y) {
  if (!Wd.inTown(x, y)) { say('Roads only inside the build zone.'); return; }
  if (Wd.buildingAt(world, x, y)) { say('A building is in the way.'); return; }
  if (Wd.isRoad(world, x, y)) { if (!confirmTile('r', x, y, 'Tap the road again to remove it.')) return; world.roads.delete(Wd.key(x, y)); Wd.bump(world); say('Road removed.'); ui(); return; }
  if (S.mat < Wd.ROAD_COST) { say('Not enough parts.'); return; }
  S.mat -= Wd.ROAD_COST; world.roads.add(Wd.key(x, y)); Wd.bump(world); ui();
}
function tryWall(x, y, type) {
  const wd = Wd.WALL_DEFS[type];
  if (!Wd.inWallZone(x, y)) { say('Walls go around the town, inside the glowing area.'); return; }
  if (Wd.buildingAt(world, x, y)) { say('A building is in the way.'); return; }
  if (postAt(x, y)) { say('A guard post is in the way.'); return; }
  const ex = Wd.wallAt(world, x, y), k = Wd.key(x, y);
  if (ex && ex.type === type) { if (!confirmTile('w', x, y, `Tap the ${wd.name} again to remove it.`)) return; world.walls.delete(k); Wd.bump(world); S.mat += Math.floor(wd.mat * .5); say(wd.name + ' removed.'); saveGame(); ui(); return; }
  if (ex && type === 'metal' && ex.type === 'wood') { const diff = wd.mat - Wd.WALL_DEFS.wood.mat; if (S.mat < diff) { say('Not enough parts.'); return; } S.mat -= diff; ex.type = 'metal'; ex.broken = false; ex.max = Math.round(wd.hp * (researched('walls') ? 1.3 : 1)); ex.hp = ex.max; say('Upgraded to Metal Wall.'); saveGame(); ui(); return; }
  if (ex) { say('Remove the ' + Wd.WALL_DEFS[ex.type].name + ' first.'); return; }
  if (wd.rank > S.rank) { say(wd.name + ' needs Haven rank ' + wd.rank + '.'); return; }
  if (Wd.isRoad(world, x, y) && type !== 'gate') { say('Use a Gate to close a road.'); return; }
  if ([...S.sv, ...S.z].some((u) => u.hp > 0 && Math.floor(u.w.x) === x && Math.floor(u.w.y) === y)) { say('Someone is standing there.'); return; }
  if (S.mat < wd.mat) { say('Not enough parts.'); return; }
  S.mat -= wd.mat; const whp = Math.round(wd.hp * (researched('walls') ? 1.3 : 1)); world.walls.set(k, { x, y, type, hp: whp, max: whp }); Wd.bump(world); checkPerimeter(); saveGame(); ui();
}
function checkPerimeter() {
  const p = Wd.perimeter(world); if (p.sealed && !S.sealed) { note('important', '🛡 PERIMETER SEALED', { log: 'The perimeter is sealed. Zombies must break through.' }); }
  if (!p.sealed && S.sealed) { note('important', '⚠ PERIMETER OPEN', { log: 'The perimeter is open: zombies can walk in through a gap.' }); }
  S.sealed = p.sealed; return p;
}
function demolish(b) { const d = DEFS[b.type], refund = Math.floor(d.mat * .5); releasePost(b); world.buildings = world.buildings.filter((q) => q !== b); Wd.bump(world); S.mat += refund; selected = null; closeP(); say(`${d.name} demolished · refund ${refund} parts`, true); saveGame(); ui(); }
function moveBuilding(b) { world.buildings = world.buildings.filter((q) => q !== b); Wd.bump(world); moving = b; selected = null; closeP(); sel = { kind: 'building', type: b.type, rot: b.rot ? 1 : 0, r4: Wd.R4(b) }; preview = null; $('yesBuild').style.display = ''; $('nudge').style.display = ''; $('rotBuild').style.display = ''; $('noBuild').textContent = 'CANCEL'; updatePreview(b.x, b.y); say('Tap a new spot for the south corner.'); }

/* ---------------- panels (V2.27: DV2-style, big text, less clutter) ---------------- */
let panelBack = null;
function showPanel(title, back) {
  $('say').style.opacity = 0; if (title) $('it').textContent = title; panelBack = back || null; $('pBack').style.display = panelBack ? 'block' : 'none';
  $('infoPanel').classList.add('show'); $('ib').scrollTop = 0;
}
const BDESC = {
  house: 'A place to sleep. Every House makes room for 2 more people.',
  water: 'Catches rainwater. An Engineer or Mechanic makes it collect more.',
  well: 'Draws groundwater: almost twice a Rain Collector.',
  farm: 'A small vegetable patch. Drinks a little water. A Farmer boosts it.',
  field: 'A big crop field: twice the food of a Garden Plot.',
  medic: 'Patches up the wounded with medicine. A Medic boosts it.',
  clinic: 'Faster healing and longer survival for the badly hurt.',
  hospital: 'The best care: fastest healing, the most time to save the dying.',
  canteen: 'Survivors eat here. A Cook makes every meal more filling.',
  armory: 'Survivors buy basic weapons and armor here with spare parts.',
  workshop: 'Research new tech and craft gear. Engineers work fastest.',
  storage: 'Raises how much food, water and parts you can stockpile.',
  scrapyard: 'Turns junk into parts. A Scavenger or Engineer boosts it.',
  gym: 'Free-time training for Strength.', library: 'Study for Intelligence. Every visit adds research.', lounge: 'Relax for Charisma and a happier mood.',
  range: 'Target practice for Perception (better with guns and bows).', track: 'Obstacle runs for Agility (speed and dodging).', sparring: 'Bouts in the ring for Endurance (more HP).',
  barracks: 'Fighters rest and gear up here. Next to an Armory, gear gets cheaper.',
};
const BCAT = [['live', 'Living', ['house', 'water', 'well', 'farm', 'field', 'canteen', 'storage', 'scrapyard', 'workshop']], ['care', 'Care', ['medic', 'clinic', 'hospital']],
  ['train', 'Train', ['gym', 'library', 'lounge', 'range', 'track', 'sparring']], ['defend', 'Defend', ['road', 'wall:wood', 'wall:metal', 'wall:gate', 'post', 'armory', 'barracks']]];
let bCat = 'live';
function bImg(k, bw, bh) {   /* building sprite scaled up with crisp pixels to fit a box */
  const im = IMG['b4:' + k]; let w = im && im.naturalWidth, h = im && im.naturalHeight; if (!w) { try { const d = DEFS[k], pa = ZHProc.art(k, d.w, d.h); w = pa.im.width; h = pa.im.height; } catch (e) { w = 42; h = 42; } }
  const f = Math.min(bw / w, bh / h), sc = f >= 1 ? Math.floor(f * 4) / 4 : f;   /* V2.32: V7 buildings are bigger than the card, so shrink to fit */ return `<img class="pix" src="${buildIcon(k)}" style="width:${Math.round(w * sc)}px;height:${Math.round(h * sc)}px;max-width:none;max-height:none" alt="">`;
}
function buildLock(k) { const d = DEFS[k]; if (S.rank < d.rank) return `Rank ${d.rank}`; if (!researched(d.res)) return 'Research: ' + (RESEARCH[d.res] ? RESEARCH[d.res].name : d.res); return ''; }
function wallIcon(t) { return t === 'gate' ? '🚪' : t === 'metal' ? '🧱' : '🪵'; }
function showBuild() {
  endBuildMode(true); closeP(); const cat = BCAT.find((c) => c[0] === bCat) || BCAT[0];
  const cards = cat[2].map((k) => {
    if (k === 'road') return `<button class="bcard" data-tool="road"><div class="im" style="font-size:46px">🛣️</div><div class="nm">Road</div><div class="co">⚙ ${Wd.ROAD_COST}</div></button>`;
    if (k === 'post') return `<button class="bcard" data-tool="post"><div class="im"><img class="pix" src="${postIcon()}" style="width:84px" alt=""></div><div class="nm">Guard Post</div><div class="co">⚙ ${POST_COST} · ${(S.posts || []).length}/${postMax()}</div></button>`;
    if (k.startsWith('wall:')) { const t = k.slice(5), wd = Wd.WALL_DEFS[t], lk = S.rank < wd.rank; return `<button class="bcard${lk ? ' lock' : ''}" data-wall="${t}"><div class="im" style="font-size:46px">${wallIcon(t)}</div><div class="nm">${wd.name}</div><div class="co">${lk ? '🔒 Rank ' + wd.rank : '⚙ ' + wd.mat}</div></button>`; }
    const d = DEFS[k]; if (!d || d.hidden) return ''; const lk = buildLock(k);
    return `<button class="bcard${lk ? ' lock' : ''}" data-b="${k}"><div class="im">${bImg(k, 104, 78)}</div><div class="nm">${d.name}</div><div class="co">${lk ? '🔒 ' + lk.replace('Research: ', '') : '⚙ ' + d.mat}</div></button>`;
  }).join('');
  $('ib').innerHTML = tabBar(BCAT.map((c) => [c[0], c[1], { live: 'living', care: 'care', train: 'train', defend: 'defend' }[c[0]]]), bCat) + `<button class="act" id="bDemo" style="width:100%;margin:2px 0 8px;display:flex;align-items:center;justify-content:center;gap:6px">${uiIcon('demolish')} Demolish: buildings, roads, walls, posts</button><div class="bgrid">${cards}</div>`;   /* V2.41: Demolish lives in the Build menu */
  showPanel('Build');
  $('ib').querySelectorAll('[data-tab]').forEach((b) => { b.onclick = () => { bCat = b.dataset.tab; showBuild(); }; });
  $('ib').querySelectorAll('[data-b]').forEach((b) => { b.onclick = () => buildDetail(b.dataset.b); });
  $('ib').querySelectorAll('[data-wall]').forEach((b) => { b.onclick = () => { const t = b.dataset.wall; if (S.rank < Wd.WALL_DEFS[t].rank) { say(`${Wd.WALL_DEFS[t].name} needs Haven rank ${Wd.WALL_DEFS[t].rank}.`); return; } startTool({ kind: 'wall', wtype: t }); }; });
  $('ib').querySelectorAll('[data-tool]').forEach((b) => { b.onclick = () => startTool({ kind: b.dataset.tool === 'post' ? 'post' : 'road' }); });
  $('bDemo').onclick = () => startTool({ kind: 'demolish' });
}
function buildDetail(k) {
  const d = DEFS[k], lk = buildLock(k), have = bOf(k).length, afford = S.mat >= d.mat, size = d.w === 1 && d.h === 1 ? 'Small 1×1' : d.w * d.h === 4 ? 'Large 2×2' : 'Medium 2×1';
  const fx = [];
  if (d.out && d.fam === 'water') fx.push(`💧 +${d.out} water / day`); if (d.out && d.fam === 'farm') fx.push(`🍖 +${d.out} food / day · 💧 −${d.waterUse}`);
  if (d.fam === 'scrap') fx.push(`⚙ +${d.out} parts / day`); if (d.fam === 'research') fx.push('🔬 research + crafting'); if (d.train) fx.push(`📈 trains ${STAT_NAME[d.train]}`);
  if (d.role === 'home') fx.push('🛏 +2 people'); if (d.role === 'medical') fx.push(`💊 treats ${d.cap}`); if (d.slot) fx.push('👷 1 worker: ' + (STAFF_JOBS[d.fam] || []).join(' / '));
  $('ib').innerHTML = `<div class="bdetail"><div class="big">${bImg(k, 300, 140)}</div>
    <div class="row" style="justify-content:center;gap:14px;font-size:21px"><span>⚙ <b>${d.mat}</b></span><span>${size}</span><span class="sm">upkeep ${(UPKEEP[k] ?? .3).toFixed(1)}/day</span></div>
    <p class="desc">${BDESC[k] || ''}</p><div class="desc">${fx.map((x) => `<div>${x}</div>`).join('')}</div>
    <div class="desc sm" style="margin-top:6px">Quality ${d.q} · Appeal ${d.a}${have ? ` · you have ${have}` : ''}</div>
    ${lk ? `<p style="color:var(--bad)">🔒 Needs ${lk}</p>` : `<button class="act go" id="bdGo" style="width:70%;margin-top:10px" ${afford ? '' : 'disabled'}>${afford ? 'Build' : 'Not enough parts'}</button>`}</div>`;
  showPanel(d.name, showBuild);
  const g = $('bdGo'); if (g) g.onclick = () => startTool({ kind: 'building', type: k });
}
const esc = (t) => String(t).replace(/[&<>]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;' }[c]));
const meter = (v, cls = '') => `<div class="bar ${cls}"><i style="width:${Math.max(0, Math.min(100, v))}%"></i></div>`;
const SLOT_EMOJI = { weapon: '🗡️', armor: '🦺', acc: '💍' };
function itemIcon(id, slot) { const it = ITEMS[id]; const src = it && window.ZHItems && ZHItems.icon(id); return `<div class="icon">${src ? `<img class="pix" src="${src}" alt="">` : `<span style="font-size:24px">${SLOT_EMOJI[slot || (it && it.slot)] || '❔'}</span>`}</div>`; }
function portrait(s) { const u = window.ZHChars && ZHChars.portrait(s); return `<div class="portrait">${u ? `<img class="pix" src="${u}" alt="">` : '<span style="font-size:30px">🧑</span>'}</div>`; }
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
  if (u.mode === 'down') { const left = Math.max(0, Math.ceil((u.bleed || 0) / 60)), r = u.rescuer; return `<div style="color:var(--bad)">Bleeding out: ${left} s left</div>${bar((u.bleed || 0) / bleedMax(), '#d84d48')}<div class="sm">${r ? (r.carrying === u ? `${esc(r.name)} is wheeling them to ${medSite() ? 'the ' + DEFS[medSite().type].name : 'safety'}` : `${esc(r.name)} is on the way`) : 'No rescuer yet: the nearest free survivor will come'}</div>`; }
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
    + `<div class="sm" style="margin-top:3px">${post ? `👷 <b id="uPost" style="cursor:pointer;color:var(--gold)">${DEFS[post.type].name} ›</b> · ${sh}${onShift(u) ? ' · <span style="color:var(--good)">on shift</span>' : ''}` : canWork ? `No workplace yet: a ${u.job} can staff ${jobs.map((f) => ({ water: 'water', farm: 'farms', medical: 'medical', kitchen: 'the canteen', scrap: 'the scrapyard', research: 'the workshop' })[f] || f).join(', ')} buildings` : `${u.job}s have no workplace: they ${isFighter(u) ? 'patrol and defend' : 'train and help out'} in their free time`}</div>`
    + `<div class="sm">⚔ ${esc(w.name)}${ar ? ' · 🛡 ' + esc(ar.name) : ''}</div></div>`;
}
function refreshNow() {   // keep the open survivor's "Now" card live
  const el = $('uNow'); if (!el || !selected || selected.kind !== 'unit') return; const u = selected.ref, h = nowCard(u); if (el.outerHTML === h) return;
  el.outerHTML = h; wireSI($('uNow')); const nd = unitNow(u), dd = $('uDest'), pp = $('uPost'); if (dd && nd.destB) dd.onclick = () => showBuildingInfo(nd.destB); if (pp) pp.onclick = () => showBuildingInfo(u.post);
}
function traitCard(u) { const t = TRAITS[u.trait]; return t ? `<div class="card traitCard"><b>${t.icon} ${t.name}</b><div class="sm">✔ ${traitGood(u)}</div><div class="sm">✖ ${t.bad}</div></div>` : ''; }
function unitPanel(u) {
  selected = { kind: 'unit', ref: u }; closeP();
  $('ib').innerHTML = `<div class="card row">${portrait(u)}<div class="sp"><div style="font-size:24px;line-height:22px">${esc(u.name)} ${u.resident ? '🏠' : ''}${u.partner ? '💑' : ''}</div><div class="sm">${u.job} · Lv.${u.l}</div>
    <div class="row"><span class="sm">HP</span><div class="sp">${meter(u.hp / u.max * 100, 'hp')}</div><span class="sm">${Math.ceil(u.hp)}/${u.max}</span></div></div></div>
    <div style="margin:-2px 0 6px">${esc(activityText(u))}</div>` + traitCard(u) + nowCard(u)
    + (u.mode === 'down' ? `<div class="card"><b style="color:var(--bad)">Bleeding out: ${Math.ceil((u.bleed ?? 0) / 60)} s left</b><br><button class="act go" id="bandage">Bandage +60 s (⚙ ${BANDAGE_COST})</button></div>` : '');
  showPanel(u.name.toUpperCase()); { const nd = unitNow(u), dd = $('uDest'), pp = $('uPost'); if (dd && nd.destB) dd.onclick = () => showBuildingInfo(nd.destB); if (pp) pp.onclick = () => showBuildingInfo(u.post); } const bd = $('bandage'); if (bd) bd.onclick = () => { if (useBandage(u)) unitPanel(u); }; unitExtra(u);
}
function nextSkillText(s, job) {   // e.g. "next: Tough at Lv.5"
  const c = (s.cls && s.cls[job]) || { l: 1 }; const nx = Object.values(SKILLS).filter((k) => k.from === job && k.at > c.l).sort((a, b) => a.at - b.at)[0];
  return nx ? `Next skill: ${nx.name} at Lv.${nx.at}` : 'All skills learned';
}
const itemText = (it) => !it ? '—' : [it.atk ? `ATK ${it.atk}${it.ranged ? ' (range)' : ''}` : '', it.def ? `DEF ${it.def}` : '', ...Object.entries(it.st || {}).map(([k, v]) => `${v > 0 ? '+' : ''}${v} ${k.toUpperCase()}`)].filter(Boolean).join(' · ');
const STAT_SHORT = { str: 'STR', end: 'END', agi: 'AGI', per: 'PER', int: 'INT', cha: 'CHA' };
function statsHtml(u) {
  const rows = ['str', 'agi', 'int', 'end', 'per', 'cha'].map((k) => { const base = (u.st && u.st[k]) || 5, tot = stat(u, k), main = (JOB_STATS[u.job] || []).includes(k);
    return `<div class="statC${main ? ' main' : ''}">${SI(k)}<b>${tot}</b>${tot !== base ? `<small>${tot > base ? '+' : ''}${tot - base}</small>` : ''}</div>`; }).join('');
  const w = weaponOf(u), dmg = Math.round(4 + w.atk * .55 + (w.ranged ? stat(u, 'per') : stat(u, 'str')) * .6 + (professions[u.job]?.combat || 0) + skillDmg(u));
  return `<div class="statG">${rows}</div><div class="row" style="gap:16px;margin-top:6px"><span>⚔ <b>${dmg}</b></span><span>🛡 <b>${Math.round(dmgReduce(u) * 100)}%</b></span><span class="sm" style="margin-left:auto">gold = ${u.job} stats</span></div>`;
}
function gearHtml(u, picking) {
  if (picking) {
    const ids = Object.keys(S.inv || {}).filter((id) => ITEMS[id] && ITEMS[id].slot === picking);
    return `<div class="lst">${ids.length ? ids.map((id) => `<div class="card" data-equip="${id}">${itemIcon(id)}<div class="sp">${ITEMS[id].name} <span class="sm">×${S.inv[id]}</span><div class="sm">${itemText(ITEMS[id])}</div></div></div>`).join('') : '<p class="sm">Nothing for this slot in the stash. The Armory sells basics; expeditions and crafting find more.</p>'}</div>`
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
  if (uTab === 'stats') body = statsHtml(u);
  else if (uTab === 'bonds') body = bondsHtml(u);
  else if (uTab === 'gear') {
    body = gearHtml(u, gearPick);
    if (!gearPick) body += `<div class="card"><span class="sm">Pet</span><br>` + (u.pet ? `${esc(u.pet.name)} the ${PETS[u.pet.kind].name} <span class="sm">${PETS[u.pet.kind].desc}</span><br><button class="act" data-petoff="1">Leave in town</button>` : ((S.pets || []).length ? (S.pets || []).map((p, i) => `<button class="act" data-pet="${i}">Adopt ${esc(p.name)} (${PETS[p.kind].name})</button>`).join('') : '<span class="sm">None. The trader sometimes brings dogs and cats.</span>')) + '</div>';
  } else if (!picking) {
    const sk = (u.skills || []).map((k) => `<div class="card"><b>${SKILLS[k].name}</b><div class="sm">${esc(SKILLS[k].desc)}</div></div>`).join('') || '<p class="sm">No skills yet: reach Lv.3 in any job.</p>';
    body = `<div>${u.job} Lv.${u.l}${u.l >= LEVEL_CAP ? ' (max)' : ''}</div>${meter(u.l >= LEVEL_CAP ? 100 : u.mastery / xpNeedU * 100, 'xp')}<div class="sm">${nextSkillText(u, u.job)}</div>
      <div style="margin-top:6px">${sk}</div><button class="act" id="chgJob" ${busy ? 'disabled' : ''}>Change job${busy ? ' (not while hurt)' : ''}</button>
      <div class="sm" style="margin-top:6px">Other jobs: ${CLASS_LIST.filter((j) => u.cls[j] && j !== u.job).map((j) => `${j} Lv.${u.cls[j].l}`).join(' · ') || 'none yet'}</div>`;
  } else body = '<div class="sm">Levels and skills are kept when switching.</div><div class="lst">' + CLASS_LIST.map((j) => { const c = u.cls[j]; return `<div class="card" data-job="${j}" style="${j === u.job ? 'opacity:.45' : ''}"><div class="sp">${j} <span class="sm">Lv.${c ? c.l : 1}</span><div class="sm">${isFighter({ job: j }) ? '⚔ fights zombies' : '🏃 hides from zombies'}</div></div></div>`; }).join('') + '</div><button class="act" id="chgCancel">Back</button>';
  box.innerHTML = tabBar([['stats', 'Status'], ['gear', 'Gear'], ['skills', 'Job'], ['bonds', 'Bonds']], uTab) + body;
  const old = $('unitExtra'); if (old) old.remove(); $('ib').appendChild(box); wireSI(box); wireSI($('ib'));
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
function showSurvivors() {
  endBuildMode(true); closeP();
  $('ib').innerHTML = `<div class="sm" style="margin-bottom:6px">${S.sv.length} people · room for ${popCap()}</div><div class="lst">` + S.sv.map((s) => `<div class="card" data-sv="${s.id}">${portrait(s)}<div class="sp" style="min-width:0"><div>${esc(s.name)} <span title="${TRAITS[s.trait] ? TRAITS[s.trait].name : ''}">${traitIcon(s)}</span> <span class="sm">${s.job} Lv.${s.l}</span></div>${meter(s.hp / s.max * 100, 'hp')}<div class="sm" style="white-space:nowrap;overflow:hidden;text-overflow:ellipsis">${esc(activityText(s))}</div></div><span class="sm">›</span></div>`).join('') + '</div>';
  showPanel('People');
  $('ib').querySelectorAll('[data-sv]').forEach((el) => { el.onclick = () => { const s = S.sv.find((q) => q.id === +el.dataset.sv); if (s) { centerOn(s.w.x, s.w.y); unitPanel(s); panelBack = showSurvivors; $('pBack').style.display = 'block'; } }; });
}
function perimText() {
  const p = Wd.perimeter(world); if (!p.walls) return 'No walls yet: zombies walk straight in.';
  return `${p.walls} wall tiles, ${p.gates} gate${p.gates === 1 ? '' : 's'}: ` + (p.sealed ? '<b style="color:var(--good)">SEALED</b>' : '<b style="color:var(--bad)">OPEN</b> <span class="sm">(close every gap)</span>') + (p.weakest ? `<div class="sm">Weakest: ${Math.ceil(p.weakest.hp)}/${p.weakest.max} HP</div>` : '');
}
function expandInfo() { const n = Wd.TERRITORY[(S.terr || 0) + 1]; return n ? { n, ok: S.ren >= n.ren && S.mat >= n.mat } : null; }
function expandTerritory() {   /* V2.13: more land to build on, more zombies to hold off */
  const e = expandInfo(); if (!e || !e.ok) return false; S.mat -= e.n.mat; S.terr = (S.terr || 0) + 1; Wd.setTerritory(S.terr); Wd.bump(world); groundKey = '';
  S.threat++; banner('🗺 TERRITORY EXPANDED'); say(`The Haven claimed more land (tier ${S.terr}). More zombies will come, from more directions.`, true); renownGain(3, 'Territory expanded'); saveGame(); ui(); return true;
}
let tTab = 'overview';
const progRow = (label, have, need) => `<div class="row"><span style="width:96px">${label}</span><div class="sp">${meter(have / Math.max(1, need) * 100, have >= need ? '' : 'xp')}</div><span class="sm" style="width:74px;text-align:right">${Math.floor(have)}/${need}</span></div>`;
function showTown(tab) {
  endBuildMode(true); closeP(); if (tab) tTab = tab; const nx = rankRules[S.rank], st = supplyStats();
  const net = (n) => (n >= 0 ? '+' : '−') + Math.abs(n).toFixed(1), days = (d) => (d === Infinity ? 'stable' : `${d.toFixed(1)} days`);
  let h = tabBar([['overview', 'Haven'], ['defense', 'Defense'], ['people', 'People'], ['more', 'More']], tTab);
  if (tTab === 'overview') {
    h += `<div class="card"><b>Town policy</b><div class="row" style="gap:4px;flex-wrap:wrap;margin:4px 0">${Object.entries(POLICIES).map(([k, q]) => `<button class="act${policy() === k ? ' go' : ''}" data-pol="${k}" style="flex:1 1 45%;margin:0;padding:6px 4px;font-size:17px">${q.icon} ${q.name}</button>`).join('')}</div><div class="sm">${POLICIES[policy()].desc}</div></div>`;
    h += `<div class="card"><div style="font-size:23px">Rank ${'★'.repeat(S.rank)} <span class="sm">· threat ☠${S.threat}</span></div>`
      + (rankConds() ? `<div class="sm">Next star: ${rankConds().filter((r) => r.ok).length}/4 conditions met</div><button class="act${S.rankReady ? ' go' : ''}" id="tUpg">⭐ Upgrade Town</button>` : '<div>Max rank reached.</div>') + '</div>'
      + `<div class="card"><div class="kv"><div><span>🍖 Food</span><span style="color:${st.fNet < 0 ? 'var(--bad)' : 'var(--good)'}">${net(st.fNet)}/day</span></div><div><span class="sm">lasts</span><span>${days(st.fDays)}</span></div>
         <div><span>💧 Water</span><span style="color:${st.wNet < 0 ? 'var(--bad)' : 'var(--good)'}">${net(st.wNet)}/day</span></div><div><span class="sm">lasts</span><span>${days(st.wDays)}</span></div>
         <div><span>⚙ Upkeep</span><span>−${upkeepTotal().toFixed(1)}/day</span></div><div><span class="sm">storage cap</span><span>${supplyCap()}</span></div></div>
         ${world.buildings.some((b) => b.unpaid) ? `<div style="color:var(--bad)">${world.buildings.filter((b) => b.unpaid).length} building(s) unpaid: half output</div>` : ''}</div>`
      + (S.mission ? `<div class="card"><b>${S.mission.name}</b><div class="sm">${S.mission.desc}</div>${progRow('Progress', S.mission.progress, S.mission.goal)}</div>` : '');
  } else if (tTab === 'defense') {
    const e = expandInfo();
    h += `<div class="card"><b>Walls</b><div>${perimText()}</div></div>
      <div class="card"><b>Retreat</b><div class="row"><span class="sm">Fighters fall back at</span><input class="sp" type="range" id="retreatR" min="15" max="60" step="5" value="${S.retreat}"><span id="retreatV">${S.retreat}%</span></div></div>
      <div class="card"><b>Territory</b> <span class="sm">tier ${S.terr || 0}/${Wd.TERRITORY.length - 1}</span>${e ? `${progRow('Renown', S.ren, e.n.ren)}${progRow('Parts', S.mat, e.n.mat)}<button class="act${e.ok ? ' go' : ''}" id="tExpand" ${e.ok ? '' : 'disabled'}>Expand (more land, more zombies)</button>` : '<div class="sm">Fully expanded.</div>'}</div>
      <div class="card"><span class="sm">Next raid ≈ day ${Math.ceil(S.nextRaid || 0)} · next boss ≈ day ${Math.ceil(S.nextBoss || 0)}</span></div>`;
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
  const tl = $('tLog'); if (tl) tl.onclick = showLog;
  const tt = $('tTrade'); if (tt) tt.onclick = showTrader;
  const tx = $('tExpand'); if (tx) tx.onclick = () => { if (expandTerritory()) showTown(); };
  const tu = $('tUpg'); if (tu) tu.onclick = () => showUpgrade('rank');
  const tTi = $('tTitle'); if (tTi) tTi.onclick = backToTitle;
}
const GUIDE_TXT = [
  ['Moving around', 'Drag to look around, pinch to zoom. ⌖ jumps back to the town. 1× / 2× / 3× changes the game speed.'],
  ['Building', 'Build → pick a building → Build. Tap the ground where its front corner goes, nudge it with the arrows, ↻ turns it so the entrance faces the other way, then tap Build. Buildings cost parts ⚙ and a little upkeep each day.'],
  ['Food and water', 'Everyone eats a daily ration: half food, half water. Rain Collectors make water, Garden Plots make food. Watch the Town panel to see how many days you have left.'],
  ['Workers', 'Buildings with a work slot are staffed automatically by the right job (Farmer, Engineer, Medic, Cook…). A green dot means someone is on shift.'],
  ['Walls', 'Build → Defend → Wood Barricade, Metal Wall or Gate, then tap tiles around the town. Close every gap to SEAL the perimeter. Broken walls turn to rubble and are repaired with parts.'],
  ['Fighting', 'Guards, Police and Scavengers fight. Everyone else runs inside when zombies come. A survivor knocked down bleeds out unless someone carries them to a medic in time.'],
  ['Gear', 'Tap a survivor → Gear to equip weapons, armor and accessories from the stash. The Armory, crafting, the trader and expeditions give new gear.'],
  ['Explore', 'Send a squad out from the Explore button. Trips run in real time, even while the game is closed. Losses are permanent.'],
  ['Renown', 'Building, goals and victories earn Renown. Renown, production, residents and buildings raise the Haven rank. Higher ranks unlock buildings, and bring tougher zombies.'],
];
function showGuide() {
  endBuildMode(true); closeP();
  $('ib').innerHTML = GUIDE_TXT.map(([t, x], i) => `<details class="card"${i === 0 ? ' open' : ''}><summary style="font-size:21px;color:var(--gold)">${t}</summary><div style="margin-top:4px">${x}</div></details>`).join('') + `<button class="act" id="gGoals">🎯 Goals</button><button class="act" id="gLog2">📜 Event log</button><div class="sm" style="margin-top:8px">V${VERSION}</div>`;
  showPanel('Guide'); $('gGoals').onclick = showGoals; $('gLog2').onclick = showLog;
}
/* V2.20 tabbed panels */
let UIM = null; const uiIconCache = {};
/* V2.47 stat and need icons (assets/ui/stats.png, tools/art/build_stat_icons.py): 16-px pixel art; until the sheet exists, short text */
const SI_NAMES = ['str', 'agi', 'int', 'end', 'per', 'cha', 'hunger', 'thirst', 'fatigue'], SI_LABEL = { str: 'Strength', agi: 'Agility', int: 'Intelligence', end: 'Endurance', per: 'Perception', cha: 'Charisma', hunger: 'Hunger', thirst: 'Thirst', fatigue: 'Tired' }, SI_TEXT = { str: 'STR', agi: 'AGI', int: 'INT', end: 'END', per: 'PER', cha: 'CHA', hunger: 'Hunger', thirst: 'Thirst', fatigue: 'Tired' }, siCache = {};
function SI(k) {
  if (siCache[k] !== undefined) return siCache[k]; const im = IMG.statIcons, i = SI_NAMES.indexOf(k); if (i < 0 || !okImg(im)) return `<span class="siT" data-si="${k}">${SI_TEXT[k] || k}</span>`;
  const c = document.createElement('canvas'), Z = 2; c.width = c.height = 16 * Z; const g = c.getContext('2d'); g.imageSmoothingEnabled = false; g.drawImage(im, i * 16, 0, 16, 16, 0, 0, 16 * Z, 16 * Z);
  return (siCache[k] = `<img class="pix si" data-si="${k}" src="${c.toDataURL()}" alt="${SI_LABEL[k]}" title="${SI_LABEL[k]}">`);
}
function wireSI(root) { root.querySelectorAll('[data-si]').forEach((e) => { e.onclick = (ev) => { ev.stopPropagation(); say(SI_LABEL[e.dataset.si] || e.dataset.si); }; }); }
function uiIcon(name) {   /* V2.32: DV2-style menu icons (assets/ui/icons.png), 2x crisp */
  if (uiIconCache[name] !== undefined) return uiIconCache[name]; const im = IMG.uiIcons, i = UIM ? UIM.icons.indexOf(name) : -1; if (i < 0 || !okImg(im)) return '';
  const n = UIM.n, Z = 2, c = document.createElement('canvas'); c.width = c.height = n * Z; const g = c.getContext('2d'); g.imageSmoothingEnabled = false; g.drawImage(im, i * n, 0, n, n, 0, 0, n * Z, n * Z);
  return (uiIconCache[name] = `<img class="pix ti" src="${c.toDataURL()}" alt="">`);
}
function tabBar(list, cur) { return `<div class="tabs">${list.map(([k, l, ic]) => `<button data-tab="${k}" class="${k === cur ? 'on' : ''}">${ic ? uiIcon(ic) : ''}${l}</button>`).join('')}</div>`; }
/* V2.35 building status: one place that says what a building is doing and why, used by its panel and the resource panel */
function staffNote(b) {   // explicit staffing wording, from the real rule: only the listed professions can staff it; without one it runs at base output
  const d = DEFS[b.type], jobs = STAFF_JOBS[d.fam] || []; if (!d.slot || b.staff) return '';
  const have = S.sv.filter((q) => jobs.includes(q.job)), free = have.filter((q) => !q.post && q.hp > 0 && !['down', 'hospital', 'away'].includes(q.mode));
  if (!have.length) return `No ${jobs.join(' or ')} in town. It runs at base output; change a survivor's profession (People → survivor → Profession) to staff it.`;
  if (!free.length) return `No ${jobs.join(' or ')} free: ${have.map((q) => esc(q.name) + (q.post ? ' works at the ' + DEFS[q.post.type].name : q.mode === 'away' ? ' is on an expedition' : ' is recovering')).join(', ')}.`;
  return `${esc(free[0].name)} (${free[0].job}) will take it shortly.`;
}
function bOutput(b) {   // expected per-day output and inputs (same formulas as the simulation, with the worker's measured share of the day)
  const d = DEFS[b.type], m = expectedMult(b), o = { out: [], use: [] };
  if (d.fam === 'water') o.out.push(['💧', d.out * m, 'water']); if (d.fam === 'farm') { o.out.push(['🍖', d.out * m, 'food']); o.use.push(['💧', d.waterUse, 'water for irrigation']); }
  if (d.fam === 'scrap') o.out.push(['⚙', d.out * m * (researched('salvage') ? 1.25 : 1), 'parts']); if (d.fam === 'research') o.out.push(['🔬', (d.out * workShare(b) + 4 * (1 - workShare(b))) * prodMult(b, false), 'research points']);
  const u = upkeepOf(b); if (u > 0) o.use.push(['⚙', u, 'parts upkeep']); return o;
}
function bStatus(b) {
  const d = DEFS[b.type];
  if (b.fire) return { c: '#ff9a3a', t: `On fire (${Math.round(b.fire)}%): no output until it is out` };
  if (b.burnt) return { c: 'var(--bad)', t: 'Burnt down: no output until repaired' };
  if (b.unpaid) return { c: 'var(--bad)', t: 'Half output: yesterday\'s upkeep was not paid' };
  if (d.fam === 'farm' && b.dry) return { c: '#ffb36b', t: 'Short of water: the plants are not fully irrigated' };
  if (d.slot && !FAM_ICON[d.fam]) return b.staff ? (isWorking(b) ? { c: 'var(--good)', t: `${esc(b.staff.name)} on duty: ${d.fam === 'medical' ? 'faster, better care' : 'better meals'}` } : { c: 'var(--muted)', t: `Open, no one on duty: ${esc(b.staff.name)} is away (${esc(b.staff.why || b.staff.mode)})` }) : { c: '#ffb36b', t: 'Open, but no one is assigned to work here' };
  if (d.slot && !b.staff) return { c: '#ffb36b', t: 'Base output: no worker assigned' };
  if (d.slot && isWorking(b)) return { c: 'var(--good)', t: `Working: ${esc(b.staff.name)} adds +${Math.round((prodMult(b, true) / prodMult(b, false) - 1) * 100)}% right now` };
  if (d.slot) return { c: 'var(--muted)', t: `Base output right now: ${esc(b.staff.name)} is away (${esc(b.staff.why || b.staff.mode)})` };
  return { c: 'var(--good)', t: 'Open' };
}
function nextTier(b) { const d = DEFS[b.type]; return Object.entries(DEFS).filter(([, n]) => n.fam === d.fam && (n.tier || 1) > (d.tier || 1)).sort((a, z) => (a[1].tier || 1) - (z[1].tier || 1))[0] || null; }
let bTab = 'overview', bTabRef = null;
function showBuildingInfo(b, tab) {
  const d = DEFS[b.type], r = facilityRules[b.type]; selected = { kind: 'building', ref: b }; closeP();
  if (tab) bTab = tab; else if (bTabRef !== b) bTab = 'overview'; bTabRef = b;
  const tabs = [['overview', 'Info'], ['details', 'Details']]; if (b.type === 'workshop') tabs.push(['research', 'Research'], ['craft', 'Craft']);
  if (!tabs.some(([k]) => k === bTab)) bTab = 'overview';
  const jobs = STAFF_JOBS[d.fam] || [], cb = combos(b);
  const out = d.fam === 'scrap' ? `⚙ <b>+${(d.out * prodMult(b) * (researched('salvage') ? 1.25 : 1)).toFixed(1)}</b> parts / day` : d.fam === 'research' ? `🔬 <b>+${((isWorking(b) ? d.out : 4) * prodMult(b)).toFixed(1)}</b> research / day` : d.train ? `📈 Trains <b>${STAT_NAME[d.train]}</b>` : d.fam === 'water' ? `💧 <b>+${(d.out * prodMult(b)).toFixed(1)}</b> water / day` : d.fam === 'farm' ? `🍖 <b>+${(d.out * prodMult(b)).toFixed(1)}</b> food / day <span class="sm">(💧 −${d.waterUse})</span>` : r ? `🛎 ${r.label}` : '';
  const staff = d.slot ? (b.staff ? `👷 ${esc(b.staff.name)} <span class="sm">${b.staff.job} Lv.${b.staff.l} · ${isWorking(b) ? '+' + Math.round(workBoost(b.staff) * 100) + '%' : 'off shift'}</span>` : `👷 <span style="color:var(--bad)">No worker</span> <span class="sm">needs ${jobs.join(' / ')}</span>`) : '';
  let h = tabBar(tabs, bTab);
  if (bTab === 'overview') {
    let status = ''; const st = bStatus(b), io = bOutput(b), sn = staffNote(b);
    if (b.burnt) status += `<button class="act go" id="bRepair" ${S.mat >= repairCost(b) ? '' : 'disabled'}>Repair (⚙ ${repairCost(b)})</button>`;
    { const at = Wd.approachTile(b), blk = Wd.buildingAt(world, at.x, at.y); if (blk && blk !== b) status += `<div style="color:var(--bad)">🚪 Entrance blocked by the ${esc(DEFS[blk.type].name)}: move one of them</div>`; }   /* V2.34: older towns can still have this */
    const worker = d.slot ? (b.staff ? `<div class="row" id="bWorker" style="gap:6px;cursor:pointer"><span>👷</span><span class="sp"><b>${esc(b.staff.name)}</b> <span class="sm">${b.staff.job} Lv.${b.staff.l} · on the job ${Math.round(workShare(b) * 100)}% of the day</span></span><span style="color:var(--gold)">›</span></div>`
      : `<div>👷 <span style="color:var(--bad)">No ${(STAFF_JOBS[d.fam] || []).join(' or ')} assigned</span><div class="sm">${sn}</div></div>`) : '';
    const fmt = (l, sign) => l.map(([ic, v, what]) => `<div>${ic} <b style="color:${sign > 0 ? 'var(--good)' : '#ffb36b'}">${sign > 0 ? '+' : '−'}${f1(v)}</b> <span class="sm">${what} / day</span></div>`).join('');
    const nt = nextTier(b);
    h += `<div class="card row"><div style="width:84px;height:76px;display:flex;align-items:flex-end;justify-content:center">${bImg(b.type, 84, 76)}</div><div class="sp"><div style="color:${st.c}">● ${st.t}</div>${fmt(io.out, 1)}${fmt(io.use, -1)}${!io.out.length && out ? `<div>${out}</div>` : ''}${cb.names.length ? `<div class="sm">★ ${cb.names.length} neighbour bonus${cb.names.length > 1 ? 'es' : ''}</div>` : ''}</div></div>`
      + (worker ? `<div class="card">${worker}</div>` : '') + status + (['medic', 'clinic', 'hospital'].includes(b.type) ? patientsHtml(b) : '')
      + (nt ? `<div class="sm">Better in this family: <b>${nt[1].name}</b>${nt[1].out ? ` (${nt[1].out} / day base vs ${d.out || 0})` : ''}${buildLock(nt[0]) ? ' · needs ' + buildLock(nt[0]) : ' · available in Build'}</div>` : '');
    if (RUSH_FAMS.includes(d.fam) && !b.burnt) { const rc = rushCheck(b); h += `<button class="act" id="bRush" ${rc.ok ? '' : 'disabled'}>⚡ Rush · ${Math.round(rushRisk(b) * 100)}% fire risk</button>${rc.ok ? '' : `<div class="sm">${esc(rc.why)}</div>`}`; }
    h += `<div><button class="act" id="bMove">Move</button></div>`;
  } else if (bTab === 'details') {
    const users = S.sv.filter((q) => q.facility === b && ['goFacility', 'useFacility'].includes(q.mode)).map((q) => esc(q.name));
    h += `<div class="sm">${BDESC[b.type] || ''}</div><div class="kv card"><div><span>Upkeep</span><span>${upkeepOf(b).toFixed(1)}/day</span></div><div><span>Capacity</span><span>${facilityUsers(b)}/${cap(b)}</span></div><div><span>Quality</span><span>${b.q}</span></div><div><span>Appeal</span><span>${b.a}</span></div></div>`
      + (users.length ? `<div class="sm">Using it now: ${users.join(', ')}</div>` : '')
      + (cb.names.length ? `<div class="card"><b>Neighbour bonuses</b><br>★ ${cb.names.join('<br>★ ')}</div>` : '<div class="sm">Tip: related buildings next to each other give bonuses.</div>');
  } else if (bTab === 'research') {
    const rs = Object.entries(RESEARCH).map(([k, rr]) => { const done = researched(k), lock = !researched(rr.need), ok = !done && !lock && (S.rp || 0) >= rr.rp && S.mat >= rr.mat;
      return done ? '' : `<div class="card" ${ok ? `data-res="${k}"` : ''} style="${ok ? 'cursor:pointer' : 'opacity:.5'}"><div class="row"><span class="sp">${rr.name}</span><span class="sm">🔬${rr.rp} ⚙${rr.mat}</span></div><div class="sm">${rr.desc}${lock ? ' · needs ' + RESEARCH[rr.need].name : ''}</div></div>`; }).join('');
    const doneL = Object.entries(RESEARCH).filter(([k]) => researched(k)).map(([, rr]) => rr.name);
    h += `<div>🔬 <b>${Math.floor(S.rp || 0)}</b> research <span class="sm">(+${((isWorking(b) ? d.out : 4) * prodMult(b)).toFixed(1)}/day)</span></div>${rs || '<div class="sm">Everything is researched.</div>'}${doneL.length ? `<div class="sm">✔ ${doneL.join(', ')}</div>` : ''}`;
  } else if (bTab === 'craft') {
    const rc = Object.entries(RECIPES).filter(([k]) => researched(k)).flatMap(([, l]) => l).map((id) => `<div class="card row" data-craft="${id}" style="${S.mat >= craftCost(id) ? 'cursor:pointer' : 'opacity:.5'}">${itemIcon(id)}<div class="sp">${ITEMS[id].name}<div class="sm">${itemText(ITEMS[id])}</div></div><span>⚙${craftCost(id)}</span></div>`).join('');
    h += `<div class="sm">Crafted gear goes to the stash.</div>${rc || '<div class="sm">Research Bladesmithing, Firearms, Body Armor or Gadgets to unlock recipes.</div>'}`;
  }
  $('ib').innerHTML = h; showPanel(d.name);
  $('ib').querySelectorAll('[data-tab]').forEach((x) => { x.onclick = () => showBuildingInfo(b, x.dataset.tab); });
  $('ib').querySelectorAll('[data-res]').forEach((x) => { x.onclick = () => { if (doResearch(x.dataset.res)) showBuildingInfo(b); }; });
  $('ib').querySelectorAll('[data-craft]').forEach((x) => { x.onclick = () => { if (craft(x.dataset.craft)) showBuildingInfo(b); }; });
  const rb = $('bRush'); if (rb) rb.onclick = () => { if (rush(b)) showBuildingInfo(b); };
  const rp = $('bRepair'); if (rp) rp.onclick = () => { if (repairBurnt(b)) showBuildingInfo(b); };
  $('ib').querySelectorAll('[data-u]').forEach((el) => { const q = S.sv[+el.dataset.u]; if (q) el.onclick = () => unitPanel(q); });
  const bw = $('bWorker'); if (bw && b.staff) bw.onclick = () => { const q = b.staff; closeP(); selected = { kind: 'unit', ref: q }; unitPanel(q); };   /* V2.35: tap the worker to open their panel */
  const mv = $('bMove'); if (mv) mv.onclick = () => moveBuilding(b); const dm = $('bDem'); if (dm) dm.onclick = () => demolish(b);
}

/* ---------------- input ---------------- */
const pointers = new Map(); let gesture = null, tapStart = null;
const local = (e) => { const r = cv.getBoundingClientRect(); return { x: e.clientX - r.left, y: e.clientY - r.top }; };
const ZOOM_MIN = .35, ZOOM_MAX = 3;   /* V2.49: wider zoom (was 0.5–1.9) */
function zoomAt(px, py, nz) { nz = Math.max(ZOOM_MIN, Math.min(ZOOM_MAX, nz)); const w = unproject(px, py); cam.z = nz; const p = project(w.x, w.y); cam.x += px - p.x; cam.y += py - p.y; clampCam(); updateZoomLabel(); }
cv.addEventListener('pointerdown', (e) => { cv.setPointerCapture(e.pointerId); const p = local(e); pointers.set(e.pointerId, p); if (pointers.size === 1) tapStart = { ...p, id: e.pointerId, cx: cam.x, cy: cam.y, moved: false, t: performance.now() }; else if (pointers.size === 2) { if (tapStart) tapStart.moved = true;   /* V2.39: a second finger means a gesture, never a tap */ const a = [...pointers.values()]; gesture = { dist: Math.max(20, Math.hypot(a[1].x - a[0].x, a[1].y - a[0].y)), z: cam.z }; tapStart = null; } });
cv.addEventListener('pointermove', (e) => {
  if (!pointers.has(e.pointerId)) return; const p = local(e); pointers.set(e.pointerId, p);
  if (pointers.size === 1 && tapStart) { const dx = p.x - tapStart.x, dy = p.y - tapStart.y; if (Math.hypot(dx, dy) > 8) tapStart.moved = true; if (tapStart.moved) { cam.x = tapStart.cx + dx; cam.y = tapStart.cy + dy; clampCam(); } }
  else if (pointers.size >= 2 && gesture) { const a = [...pointers.values()].slice(0, 2), d = Math.max(20, Math.hypot(a[1].x - a[0].x, a[1].y - a[0].y)); zoomAt((a[0].x + a[1].x) / 2, (a[0].y + a[1].y) / 2, gesture.z * d / gesture.dist); }
});
function pointerEnd(e) { const p = local(e), wasTap = tapStart && tapStart.id === e.pointerId && !tapStart.moved && pointers.size === 1; pointers.delete(e.pointerId); if (pointers.size < 2) gesture = null;
  if (pointers.size === 1) { const [id, q] = [...pointers.entries()][0]; tapStart = { ...q, id, cx: cam.x, cy: cam.y, moved: true, t: performance.now() }; }   /* V2.39: pinch → one finger keeps panning from where it is (no jump) */
  if (wasTap) tapAt(p.x, p.y); if (!pointers.size) tapStart = null; }
cv.addEventListener('pointerup', pointerEnd); cv.addEventListener('pointercancel', (e) => { pointers.delete(e.pointerId); gesture = null; tapStart = null; });
cv.addEventListener('wheel', (e) => { e.preventDefault(); const p = local(e); zoomAt(p.x, p.y, cam.z * (e.deltaY < 0 ? 1.1 : .91)); }, { passive: false });
function hitBuilding(px, py) {   // pixel-accurate against the sprite alpha, topmost first; falls back to the footprint
  const order = [...world.buildings].sort((a, b) => (b.x + b.w + b.y + b.h) - (a.x + a.w + a.y + a.h));
  for (const b of order) { const r = spriteRect(b); if (!r || px < r.x || py < r.y || px >= r.x + r.w || py >= r.y + r.h) continue; const p4 = b4(b), m = alphaMask(b.type, Wd.R4(b)); if (!m) return b; const ix0 = Math.floor((px - r.x) / r.w * m.w), ix = (p4 ? p4.flip : b.rot) ? m.w - 1 - ix0 : ix0, iy = Math.floor((py - r.y) / r.h * m.h); if (m.d[(iy * m.w + ix) * 4 + 3] > 24) return b; }
  const t = unproject(px, py); return Wd.buildingAt(world, Math.floor(t.x), Math.floor(t.y));
}
function hitUnit(px, py) {
  let best = null, bd = 1e9; for (const s of S.sv) { if (insideBuilding(s)) continue; const p = project(s.w.x, s.w.y), cy = p.y - CHAR_H * TWs() * .5, d = Math.hypot(px - p.x, py - cy); if (d < Math.max(22, .4 * TWs()) && d < bd) { bd = d; best = s; } } return best;
}
function tapAt(px, py) {
  if (sel) {
    const t = unproject(px, py), tx = Math.floor(t.x), ty = Math.floor(t.y);
    if (sel.kind === 'road') { tryRoad(tx, ty); return; }
    if (sel.kind === 'demolish') { tryDemolish(px, py, tx, ty); return; }
    if (sel.kind === 'wall') { tryWall(tx, ty, sel.wtype); return; }
    if (sel.kind === 'post') { const r = tryPost(tx, ty); if (r.why !== 'open') updatePostBar(); return; }
    const d = Wd.rotDef(DEFS[sel.type], Wd.R4(sel)), o = Iso.originFromSouthTile(tx, ty, d.w, d.h); updatePreview(o.x, o.y); return;
  }
  if (hitTrader(px, py)) { showTrader(); return; }
  const u = hitUnit(px, py); if (u) { unitPanel(u); return; }
  const b = hitBuilding(px, py); if (b) { showBuildingInfo(b); return; }
  { const t = unproject(px, py), gp = postAt(Math.floor(t.x), Math.floor(t.y)); if (gp) { showPost(gp); return; } }
  { const t = unproject(px, py), wl = Wd.wallAt(world, Math.floor(t.x), Math.floor(t.y)); if (wl) { const n = S.z.filter((z) => z.hp > 0 && z.mode === 'zbreak' && z.wallT === wl).length, hot = S.z.some((z) => z.hp > 0 && dist(z.w, { x: wl.x + .5, y: wl.y + .5 }) < 2.6); say(`${Wd.WALL_DEFS[wl.type].name} · ${Math.ceil(wl.hp)}/${wl.max} HP` + (n ? ` · ${n} zombie${n > 1 ? 's' : ''} hitting it` : '') + (wl.hp < wl.max ? (S.mat < 1 ? ' · no parts to repair' : hot ? ' · repairs wait until zombies leave' : ' · being repaired') : '') + (wl.broken ? ' · BROKEN: zombies can walk through' : '')); return; } }
  selected = null; closeP();
}
$('rotBuild').onclick = () => { if (!sel || sel.kind !== 'building') return;   /* V2.47: turn the entrance; V2.56 T56: four clockwise turns (front, back mirrored, back, front mirrored) */
  const r = Wd.R4(sel); sel.r4 = T56 ? (r + 1) % 4 : (r ? 0 : 3); sel.rot = sel.r4 & 1;
  if (preview) { const d = Wd.rotDef(DEFS[sel.type], sel.r4), sx = preview.x + preview.w - 1, sy = preview.y + preview.h - 1, o = Iso.originFromSouthTile(sx, sy, d.w, d.h); updatePreview(o.x, o.y); }
  say(['Entrance on the left-hand wall.', 'Entrance on the back left wall.', 'Entrance on the back right wall.', 'Entrance on the right-hand wall.'][sel.r4]); };
$('nudge').addEventListener('click', (e) => { const bt = e.target.closest('button'); if (!bt || !preview) return; const [dx, dy] = bt.dataset.d.split(',').map(Number); updatePreview(preview.x + dx, preview.y + dy); });
$('yesBuild').onclick = confirmPreview; $('noBuild').onclick = () => { endBuildMode(true); say(sel ? '' : 'Done.'); };
$('mBuild').onclick = showBuild; $('gauge').onclick = () => showUpgrade('rank'); $('btnHome').onclick = () => { if (titleOn) return; backToTitle(); }; $('mSurv').onclick = showSurvivors; $('mTown').onclick = showTown; $('mGuide').onclick = showGuide; $('mExp').onclick = showExpedition; $('tripChip').onclick = showExpedition;
$('closeInfo').onclick = closeP; $('pBack').onclick = () => { const f = panelBack; if (f) f(); };
$('btnCenter').onclick = () => centerOn(7.5, 10, .9);
$('btnSpeed').onclick = () => { simSpeed = simSpeed === 1 ? 2 : simSpeed === 2 ? 3 : 1; $('btnSpeed').textContent = simSpeed + '×'; };
$('btnLog').onclick = showLog; { const sv = $('btnSave'); if (sv) sv.onclick = () => { if (saveGame()) { say('Saved.'); banner('💾 SAVED'); } else say(saveBlocked ? 'This tab is not saving (see the alert).' : 'Saving failed: see the alert.'); }; }
{ const sb = $('btnSound'), lab = () => { if (sb && window.SND) sb.textContent = SND.mode === 'all' ? '🔊' : SND.mode === 'sfx' ? '🔉' : '🔇'; }; lab(); if (sb) sb.onclick = () => { if (window.SND) { SND.unlock(); const m = SND.cycle(); lab(); say(m === 'all' ? 'Sound: effects and music.' : m === 'sfx' ? 'Sound: effects only.' : 'Sound off.'); } }; }
document.addEventListener('pointerdown', () => { if (window.SND) { SND.unlock(); SND.music(isNight()); } }, { capture: true });
document.addEventListener('click', (e) => { if (e.target.closest('button')) SFX('click'); }, { capture: true }); $('plaque').onclick = (e) => { if (e.target.closest('#tripChip')) return; if (e.target.closest('#advX')) { if (advShown) { S.advMute = { ...(S.advMute || {}), [advShown.key]: S.day }; advisorUpdate(); } return; } if (e.target.closest('#adv')) { if (advShown) advShown.act(); return; } const r = e.target.closest('.res > span'); if (r) { const k = { food: 'food', water: 'water', mat: 'mat' }[(r.querySelector('b') || {}).id]; if (k) { showResource(k); return; } } showObjective(); };
$('btnDebug').onclick = () => { debug = !debug; $('btnDebug').classList.toggle('on', debug); };


/* ---------------- loop ---------------- */
function simTick() {
  for (const o of movers()) o.pv = { x: o.w.x, y: o.w.y };   /* V2.33: previous position, for smooth drawing between ticks */
  tick++; if (S.alert > 0) S.alert--; traderTick(); if (tick % 30 === 0) { incidentTick(); petTick(); } S.sv.forEach(ai); S.z.forEach(zai); for (const z of S.z) if (z.hp <= 0 && z.type !== 'raider' && !z.escaped) corpses.push({ type: z.type, w: { ...z.w }, phase: z.phase, mode: 'dead', dead: 0, target: z.target && z.target.w ? { w: { ...z.target.w } } : null }); S.z = S.z.filter((z) => z.hp > 0); for (let i = corpses.length - 1; i >= 0; i--) if (++corpses[i].dead > 120) corpses.splice(i, 1); monsterGeneration(); visitorArrival();
  if (tick % 30 === 0) { alertsTick(); refreshNow(); for (let k = 0; k < 4 && assignRescue(); k++); } if (tick % 300 === 150) rally() || militia(); if (tick % 120 === 0) { missionProgress(); bondTick(); } if (tick % 240 === 0) checkRank(); if (tick % 24000 === 0 && tick > 0) triggerTownEvent(); if (tick % 450 === 0) saveGame();
  if (tick % 300 === 0) { autoStaff(); postsAssign(); } if (tick % 60 === 0) { tripUpdate(); expTick(); } if (tick % 60 === 0 && world.walls.size) autoRepair(); if (tick % 240 === 0 && world.walls.size) checkPerimeter();
  if (tick % 100 === 0) for (const b of world.buildings) if (b.staff) { b.wsN = (b.wsN || 0) + 1; b.wsW = (b.wsW || 0) + (isWorking(b) ? 1 : 0); }
  if (tick % 1000 === 0) { S.hour++; hourlyProduction(); ecoHour(); shortageCheck(); advisorUpdate(); eventSchedule(); if (S.hour === 20 || S.hour === 6) { SFX(S.hour === 20 ? 'night' : 'dawn'); if (window.SND) SND.music(isNight()); } if (S.hour === 19) note('important', '🌙 NIGHT IN 1 HOUR — MORE ZOMBIES', { log: 'Night falls at 20:00: more zombies, and they come for the town.' }); if (S.hour === 20) note('important', '🌙 NIGHT FALLS — THE DEAD ARE RESTLESS', { log: 'Night falls: more zombies, and they come for the town.' }); if (S.hour === 6) note('routine', 'Dawn: fewer zombies until nightfall.'); if (S.hour >= 24) { S.hour = 0; S.day++; endOfDay(); } ui(); }
}
let last = 0, acc = 0; const STEP = 1000 / 60;
const movers = () => { const l = S.sv.concat(S.z); if (S.trader) l.push(S.trader); return l; };
function drawSmooth(alpha) {   /* V2.33: draw everyone between their last two simulation positions, so movement is smooth at any frame rate and at 1x / 2x */
  const moved = [];
  for (const o of movers()) { const p = o.pv; if (!p || !o.w) continue; const dx = o.w.x - p.x, dy = o.w.y - p.y; if (Math.abs(dx) + Math.abs(dy) > 1.2 || (!dx && !dy)) continue; moved.push([o, o.w]); o.w = { x: p.x + dx * alpha, y: p.y + dy * alpha }; }
  try { draw(); } finally { for (const [o, w] of moved) o.w = w; }
}
function frame(t) { if (titleOn) { const k = t / 1000; centerOn(7.5 + Math.sin(k * .07) * 3, 10 + Math.cos(k * .05) * 2.5, Math.max(.8, Math.min(1.2, VW / 400))); } if (!last) last = t; acc += modalOpen || titleOn ? 0 : Math.min(100, t - last) * simSpeed; last = t; let n = 0; while (acc >= STEP && n < 12) { simTick(); acc -= STEP; n++; } if (n === 12) acc = 0; drawSmooth(modalOpen ? 1 : Math.min(1, acc / STEP)); requestAnimationFrame(frame); }
document.addEventListener('visibilitychange', () => { if (window.SND) SND.pause(document.hidden); if (document.hidden) saveGame(); else { last = 0; tripUpdate(); expTick(); } }); window.addEventListener('pagehide', saveGame);

/* ---------------- init ---------------- */
async function init() {
  await loadAll(); resize();
  if (!SKIP_TITLE) { titleOn = true; document.getElementById('app').classList.add('titleMode'); }
  const restored = titleOn ? null : loadGame();
  if (!restored) {
    let o = {}; if (!titleOn) { try { o = JSON.parse(localStorage.getItem('zhNewOpts') || '{}') || {}; localStorage.removeItem('zhNewOpts'); } catch (e) { o = {}; } } const tq = (k) => QS.get(k);   /* V2.46: chosen on the new-game screen (?start=&diff= for testing) */
    S.diff = DIFFS[tq('diff') || o.diff] ? (tq('diff') || o.diff) : 'normal'; applyStart(tq('start') || o.start || 'camp');
    spawn(5, 3, 'walker'); spawn(9, 3, 'crawler'); spawn(12, 4, 'walker');
  } else { for (let i = 0; i < 3; i++) spawn(); if (restored.cam && restored.cam.z) { cam.z = restored.cam.z; cam.x = restored.cam.x; cam.y = restored.cam.y; clampCam(); } }
  if (!restored || !restored.cam) centerOn(7.5, 10, Math.max(.7, Math.min(1.1, VW / 430)));
  if (titleOn) { $('loading').style.display = 'none'; showTitle(); requestAnimationFrame(frame); return; }
  if (!restored) { let nm = null; try { nm = localStorage.getItem('zhNewName'); localStorage.removeItem('zhNewName'); } catch (e) { /* ignore */ } if (nm) S.townName = nm.slice(0, 22); }
  autoStaff(); tripUpdate(); expTick(); if (S.trip && S.trip.enc) encPopup(S.trip); if (!S.mission) beginMission(); updateZoomLabel(); ui(); $('loading').style.display = 'none'; requestAnimationFrame(frame);
  try { if (navigator.storage && navigator.storage.persist) navigator.storage.persisted().then((p) => p || navigator.storage.persist()).catch(() => {}); } catch (e) { /* not supported */ }   /* V2.42: ask the browser not to evict saves */
  if (loadedFrom === 'bak') note('important', '💾 LOADED THE DAY BACKUP', { log: `The latest save of this slot was damaged, so the backup from Day ${S.day} was loaded. The damaged copy was kept.` });
  if (saveBlocked === 'load') showEventPopup({ title: '💾 SAVE COULD NOT BE OPENED', text: `The town in slot ${SLOT} could not be loaded. <b>Nothing was overwritten</b>: this town will not save while you look around.<br><br>On the main screen, <b>Start → Backups</b> can export the file or import an older backup.`, buttons: [{ label: 'MAIN SCREEN', fn: () => { location.href = location.pathname; } }, { label: 'LOOK AROUND' }] });
}
/* ---------------- V2.40 title screen and save slots (the DV2-style start flow, original look) ---------------- */
function slotRaw(i) { const k = SLOT_KEYS[i]; return readKey(k) || readKey(BAK(k)) || (i === 0 && (readKey(PREV_KEY) || readKey(OLD_KEY))) || null; }
function slotInfo(i) {   /* V2.42: a damaged slot shows its day backup if there is one */
  const k = SLOT_KEYS[i], main = readKey(k), bak = readKey(BAK(k)), raw = main || (i === 0 && (readKey(PREV_KEY) || readKey(OLD_KEY))) || bak; if (!raw) return null;
  const info = (r) => { try { const d = JSON.parse(r); if (!validSave(d, !d.sv)) return null; const st = d.S || {}; return { name: st.townName || 'Zombie Haven', day: st.day || 1, rank: st.rank || 1, pop: (d.sv || st.sv || []).length, mat: Math.floor(st.mat || 0), time: d.time || 0, ver: d.version || '', diff: st.diff || 'normal', start: st.start || 'camp', won: !!st.won, finale: !!st.finale }; } catch (e) { return null; } };
  const x = info(raw); if (x) return main || raw !== bak ? x : { ...x, fromBak: true };
  const y = bak && raw !== bak && info(bak); return y ? { ...y, fromBak: true } : { broken: true };
}
function clearSlot(i) { try { const k = SLOT_KEYS[i]; [k, BAK(k), BAD(k)].forEach((q) => localStorage.removeItem(q)); if (i === 0) { localStorage.removeItem(PREV_KEY); localStorage.removeItem(OLD_KEY); } } catch (e) { /* ignore */ } }
const ago = (t) => { if (!t) return ''; const m = Math.round((Date.now() - t) / 60000); return m < 1 ? 'just now' : m < 60 ? m + ' min ago' : m < 1440 ? Math.round(m / 60) + ' h ago' : Math.round(m / 1440) + ' d ago'; };
function playSlot(i, newName, opts) {
  try { localStorage.setItem('zhSlot', String(i + 1)); if (newName != null) { clearSlot(i); localStorage.setItem('zhNewName', newName || 'Zombie Haven'); localStorage.setItem('zhNewOpts', JSON.stringify(opts || {})); } } catch (e) { /* storage blocked: play without saving */ }
  location.href = location.pathname + '?play=1';
}
function backToTitle() { saveGame(); location.href = location.pathname; }
function showTitle() {
  $('title').style.display = 'flex'; $('slots').style.display = 'none';
  const latest = [0, 1, 2].map((i) => [i, slotInfo(i)]).filter(([, x]) => x && !x.broken).sort((a, b) => b[1].time - a[1].time)[0];
  $('tCont').style.display = latest ? 'block' : 'none'; if (latest) { $('tCont').innerHTML = `Continue<small>${esc(latest[1].name)} · Day ${latest[1].day}</small>`; $('tCont').onclick = () => playSlot(latest[0]); }
  $('tStart').onclick = showSlots; { const R = Object.entries(records()).sort((a, b) => b[1].score - a[1].score)[0]; $('tVer').textContent = 'ver ' + VERSION + (R ? ` · 🏆 ${R[1].score} (${(STARTS[R[0].split('/')[0]] || STARTS.camp).name}, ${(DIFFS[R[0].split('/')[1]] || DIFFS.normal).name})` : ''); }
}
let slotDel = null;
function showSlots() {
  $('title').style.display = 'none'; const box = $('slots'); box.style.display = 'flex'; box.querySelector('.sHead').textContent = 'Save Slots';
  const rows = [0, 1, 2].map((i) => { const x = slotInfo(i);
    if (!x) return `<div class="slot empty" data-i="${i}"><span class="snum">${i + 1}</span><span class="sinfo"><b>Empty</b><small>Tap to start a new game</small></span></div>`;
    if (x.broken) return `<div class="slot" data-i="${i}"><span class="snum">${i + 1}</span><span class="sinfo"><b>Damaged save</b><small>Tap to start over in this slot</small></span></div>`;
    return `<div class="slot" data-i="${i}" data-full="1"><span class="snum">${i + 1}</span><span class="sinfo"><b>${esc(x.name)}</b><small>${x.won ? '🏆 ' : x.finale ? '📻 ' : ''}Day ${x.day} · ${'★'.repeat(x.rank)} · 👥 ${x.pop} · ${(STARTS[x.start] || STARTS.camp).icon}${(DIFFS[x.diff] || DIFFS.normal).icon}</small><small class="sago">${x.fromBak ? '⚠ Damaged: day backup' : 'Saved ' + ago(x.time)}${x.ver ? ' · V' + esc(x.ver) : ''}</small></span><button class="sdel${slotDel === i ? ' arm' : ''}" data-del="${i}" title="Delete">${slotDel === i ? 'Delete?' : '🗑'}</button></div>`; }).join('');
  box.querySelector('.slist').innerHTML = rows;
  box.querySelectorAll('.slot').forEach((el) => { el.onclick = (e) => { if (e.target.closest('.sdel')) return; const i = +el.dataset.i; if (el.dataset.full) playSlot(i); else newSlot(i); }; });
  box.querySelectorAll('.sdel').forEach((b) => { b.onclick = (e) => { e.stopPropagation(); const i = +b.dataset.del; if (slotDel === i) { clearSlot(i); slotDel = null; } else slotDel = i; showSlots(); }; });
  $('sBack').onclick = () => { slotDel = null; showTitle(); }; $('sBak').style.display = ''; $('sBak').onclick = () => { slotDel = null; showBackups(); };
}
let newOpt = { start: 'camp', diff: 'normal' };
function newSlot(i, keepName) {   /* V2.46: name, starting condition and difficulty */
  const box = $('slots'), nm = keepName ?? 'Zombie Haven', R = records(), rec = R[newOpt.start + '/' + newOpt.diff];
  box.querySelector('.slist').innerHTML = `<div class="card newGame" style="color:#2a2a5a;background:#f3f6f9"><b style="font-size:22px">Slot ${i + 1} · New haven</b>
    <div class="sm" style="margin:6px 0 2px;color:#5b6b7a">Name your town</div><input id="sName" maxlength="22" value="${esc(nm)}" style="width:100%;box-sizing:border-box;font:inherit;font-size:22px;padding:6px;border-radius:6px;border:2px solid #7f93a6;background:#f7fafc;color:#1f2a33;text-align:center">
    <div class="sm" style="margin:8px 0 2px;color:#5b6b7a">Start</div>${Object.entries(STARTS).map(([k, v]) => `<div class="ngOpt${newOpt.start === k ? ' on' : ''}" data-st="${k}"><span class="ngI">${v.icon}</span><span><b>${v.name}</b>${newOpt.start === k ? `<small>${v.desc}</small>` : ''}</span></div>`).join('')}
    <div class="sm" style="margin:8px 0 2px;color:#5b6b7a">Difficulty</div><div class="row" style="gap:4px">${Object.entries(DIFFS).map(([k, v]) => `<button class="act${newOpt.diff === k ? ' go' : ''}" data-df="${k}" style="flex:1 1 0;margin:0;padding:6px 2px;font-size:17px">${v.icon} ${v.name}</button>`).join('')}</div>
    <div class="sm" style="margin-top:4px;color:#5b6b7a">${DIFFS[newOpt.diff].desc}</div>
    <div class="sm" style="margin-top:4px;color:#2a5ac8">${rec ? `🏆 Best here: ${rec.score} (${esc(rec.name)}, day ${rec.day})` : 'No win yet with this start and difficulty.'}</div>
    <div class="row" style="gap:8px;margin-top:10px;justify-content:center"><button class="act" id="sCancel">Cancel</button><button class="act go" id="sGo">Start</button></div></div>`;
  const nmNow = () => ($('sName').value || '').trim() || 'Zombie Haven';
  box.querySelectorAll('[data-st]').forEach((e) => { e.onclick = () => { newOpt.start = e.dataset.st; newSlot(i, nmNow()); }; });
  box.querySelectorAll('[data-df]').forEach((e) => { e.onclick = () => { newOpt.diff = e.dataset.df; newSlot(i, nmNow()); }; });
  $('sCancel').onclick = showSlots; $('sGo').onclick = () => playSlot(i, nmNow(), { ...newOpt });
}
/* ---------------- V2.42 backups: export a slot to a file (or the clipboard / share sheet), import one into any slot ---------------- */
const BAK_T = 'zhBackupAt';
function backupText(i) {
  const raw = slotRaw(i); if (!raw) return null; let save = null; try { save = JSON.parse(raw); } catch (e) { /* damaged: keep the text */ }
  const st = (save && save.S) || {}, o = { zhBackup: 1, game: 'Zombie Haven', slot: i + 1, exported: new Date().toISOString(), version: VERSION, name: st.townName || 'Zombie Haven', day: st.day || 1 };
  return JSON.stringify(save ? { ...o, save } : { ...o, rawText: raw });
}
const backupName = (i) => { const x = slotInfo(i) || {}; return `zombie-haven-${String(x.name || 'town').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '') || 'town'}-day${x.day || 1}.json`; };
function markExported(i) { try { const m = JSON.parse(localStorage.getItem(BAK_T) || '{}'); m[i] = Date.now(); localStorage.setItem(BAK_T, JSON.stringify(m)); } catch (e) { /* ignore */ } }
function exportedAt(i) { try { return (JSON.parse(localStorage.getItem(BAK_T) || '{}'))[i] || 0; } catch (e) { return 0; } }
async function exportBackup(i, how) {   /* how: 'share' (iPhone share sheet: Files, AirDrop, Notes…), 'file' (download) or 'copy' (clipboard) */
  const text = backupText(i); if (!text) return 'Nothing saved in this slot yet.'; const name = backupName(i);
  try {
    if (how === 'share') { const f = new File([text], name, { type: 'application/json' }); if (!(navigator.canShare && navigator.canShare({ files: [f] }))) return exportBackup(i, 'file'); await navigator.share({ files: [f], title: name }); markExported(i); return 'Backup shared.'; }
    if (how === 'copy') { if (navigator.clipboard && navigator.clipboard.writeText) await navigator.clipboard.writeText(text); else { const t = document.createElement('textarea'); t.value = text; document.body.appendChild(t); t.select(); document.execCommand('copy'); t.remove(); } markExported(i); return 'Backup copied: paste it into Notes or a message to keep it.'; }
    const u = URL.createObjectURL(new Blob([text], { type: 'application/json' })), a = document.createElement('a'); a.href = u; a.download = name; document.body.appendChild(a); a.click(); a.remove(); setTimeout(() => URL.revokeObjectURL(u), 5000); markExported(i); return 'Backup saved as ' + name;
  } catch (e) { return e && e.name === 'AbortError' ? 'Cancelled.' : 'Could not export (' + ((e && e.message) || e) + '). Try Copy.'; }
}
const verNum = (v) => String(v || '0').split('.').map((n) => +n || 0).reduce((a, n) => a * 1000 + n, 0);
function parseBackup(text) {
  let o; try { o = JSON.parse(String(text || '').trim()); } catch (e) { return { ok: false, why: 'That is not a Zombie Haven backup (it could not be read).' }; }
  const save = o && o.zhBackup ? o.save : o;
  if (!save || !validSave(save, false)) return { ok: false, why: o && o.rawText ? 'That backup holds a damaged save: it cannot be imported.' : 'That file is not a Zombie Haven save.' };
  const newer = verNum(save.version) > verNum(VERSION);
  return { ok: true, save, name: save.S.townName || 'Zombie Haven', day: save.S.day || 1, ver: save.version || '', newer };
}
function importBackup(i, text) {
  const r = parseBackup(text); if (!r.ok) return r; if (r.newer) return { ok: false, why: `That backup is from V${r.ver}, newer than this game (V${VERSION}). Reload the page to update first.` };
  const k = SLOT_KEYS[i], old = readKey(k), data = JSON.stringify({ sid: 'import', ...r.save, sid: 'import', time: Date.now() });   /* sid first: an open tab on this slot sees the change and stops saving */
  if (old) writeKey(BAK(k), old);   /* the town being replaced stays as this slot's day backup until it is played */
  const w = writeKey(k, data); if (w !== true) return { ok: false, why: 'The browser storage is full or blocked.' };
  if (i === 0) { try { localStorage.removeItem(PREV_KEY); localStorage.removeItem(OLD_KEY); } catch (e) { /* ignore */ } }
  return { ok: true, why: `Imported ${r.name} (Day ${r.day}) into slot ${i + 1}.` };
}
const BAK_HINT = 'Safari can clear website data when the game is not opened for 7 days. Add Zombie Haven to your Home Screen, or export a backup now and then.';
function exportRowHtml(i) { return `<button class="act go" data-ex="share" data-i="${i}" style="width:100%;margin:6px 0 0">Export backup</button><div class="row" style="gap:6px;margin-top:6px"><button class="act" data-ex="file" data-i="${i}" style="flex:1 1 0;margin:0;white-space:nowrap">Download</button><button class="act" data-ex="copy" data-i="${i}" style="flex:1 1 0;margin:0;white-space:nowrap">Copy text</button></div>`; }
function wireExport(root, done) { root.querySelectorAll('[data-ex]').forEach((b) => { b.onclick = async () => { const m = await exportBackup(+b.dataset.i, b.dataset.ex); done(m); }; }); }
let bakView = null, bakArm = null;
function showBackups(msg) {   /* title screen → Start → Backups */
  $('sBak').style.display = 'none'; const box = $('slots'), list = box.querySelector('.slist'); box.querySelector('.sHead').textContent = 'Backups';
  if (bakView != null) { importView(bakView, msg); return; }
  list.innerHTML = (msg ? `<div class="card sm" id="bakMsg">${esc(msg)}</div>` : '') + [0, 1, 2].map((i) => { const x = slotInfo(i), t = exportedAt(i);
    return `<div class="card" style="color:#2a2a5a;background:#f3f6f9"><b>Slot ${i + 1} · ${x ? (x.broken ? 'Damaged save' : esc(x.name) + ' · Day ' + x.day) : 'Empty'}</b><div class="sm" style="color:#5b6b7a">${x ? 'Last export: ' + (t ? ago(t) : 'never') : 'Nothing to export'}</div>${x ? exportRowHtml(i) : ''}<button class="act" data-imp="${i}" style="width:100%;margin-top:6px">Import a backup into slot ${i + 1}</button></div>`; }).join('') + `<div class="sm" style="color:#e8e0c8">${BAK_HINT}</div>`;
  wireExport(list, (m) => showBackups(m)); list.querySelectorAll('[data-imp]').forEach((b) => { b.onclick = () => { bakView = +b.dataset.imp; bakArm = null; showBackups(); }; });
  $('sBack').onclick = () => { bakView = null; showSlots(); };
}
function importView(i, msg) {
  const list = $('slots').querySelector('.slist'), x = slotInfo(i);
  list.innerHTML = `<div class="card" style="color:#2a2a5a;background:#f3f6f9"><b>Import into slot ${i + 1}</b>${x && !x.broken ? `<div class="sm" style="color:#b0402a">This replaces ${esc(x.name)} (Day ${x.day}). It is kept as the slot's day backup until you play.</div>` : ''}
    <label class="act" style="display:block;text-align:center;margin:8px 0">Choose a backup file<input type="file" id="impFile" accept=".json,application/json,text/plain" style="display:none"></label>
    <div class="sm" style="color:#5b6b7a">…or paste the backup text:</div><textarea id="impText" rows="4" style="width:100%;box-sizing:border-box;font:14px monospace;border:2px solid #7f93a6;border-radius:6px;background:#f7fafc;color:#1f2a33"></textarea>
    ${msg ? `<div class="sm" id="bakMsg" style="color:#b0402a">${esc(msg)}</div>` : ''}<button class="act go" id="impGo" style="width:100%;margin-top:6px">${bakArm === i ? 'Tap again to replace the town' : 'Import'}</button></div>`;
  const go = (text) => { const r = parseBackup(text); if (!r.ok) { importView(i, r.why); return; } if (x && !x.broken && bakArm !== i) { bakArm = i; $('impText').value = text; importView(i, `Ready: ${r.name}, Day ${r.day}${r.ver ? ' (V' + r.ver + ')' : ''}.`); $('impText').value = text; return; } const w = importBackup(i, text); bakArm = null; if (w.ok) { bakView = null; showBackups(w.why); } else importView(i, w.why); };
  $('impFile').onchange = (e) => { const f = e.target.files && e.target.files[0]; if (!f) return; if (f.size > 4e6) { importView(i, 'That file is too big to be a save.'); return; } const rd = new FileReader(); rd.onload = () => go(String(rd.result)); rd.onerror = () => importView(i, 'Could not read that file.'); rd.readAsText(f); };
  $('impGo').onclick = () => go($('impText').value);
  $('sBack').onclick = () => { bakView = null; bakArm = null; showBackups(); };
}
function showBackup(msg) {   /* in game (event log → Backup): export this town */
  endBuildMode(true); closeP(); saveGame(); $('it').textContent = 'BACKUP'; const i = SLOT - 1, t = exportedAt(i);
  $('ib').innerHTML = `<div class="card"><b>${esc(S.townName || 'Zombie Haven')} · slot ${SLOT}</b><div class="sm">${saveErr ? '⚠ Saving is failing: ' + esc(saveErr) : saveBlocked ? '⚠ This tab is not saving' : 'Saved automatically'} · last export: ${t ? ago(t) : 'never'}</div></div>${exportRowHtml(i)}${msg ? `<div class="card sm">${esc(msg)}</div>` : ''}<div class="sm" style="margin-top:6px">To bring a backup back: main screen (🏠) → Start → Backups → Import.</div><div class="sm" style="margin-top:6px">${BAK_HINT}</div>`;
  wireExport($('ib'), (m) => showBackup(m)); showPanel();
}
// test / debug hook (no effect on gameplay)
window.ZH = { upgradeTown, holdEvent, showUpgrade, rankConds, TOWN_EVENTS, RANK_REQ, weaponRange, ui, showBuildingInfo, showBuild, showTown, showSurvivors, graceOn, avgLevel, STORY, triggerTownEvent, beginMission, MISSION_DEFS, addBond, bondOf, bondTick, bondsDaily, growUp, popCap, popNow, friendBoost, bondsHtml, GUIDE, guideProgress, guideSkipDone, showGoals, showLog, logEvent, missionProgress, pushUnitsOut, rankRules, BANDAGE: () => BANDAGE_COST, rush, rushRisk, rushCheck, startFire, burnDown, repairBurnt, breakIn, incidentTick, traderArrive, traderLeave, traderBuy, traderTrade, showTrader, traderDisc, givePet, takePet, newPet, PETS, petDaily, petSheet, hitTrader, S, world, Wd, Iso, cam, project, unproject, spriteRect, hitBuilding, hitUnit, insideBuilding, tapAt, unitPanel, doResearch, craft, havenReview, RESEARCH, researched, xpNeed, combos, payUpkeep, upkeepTotal, equip, unequip, stat, ITEMS, stashAdd, gearUpgrade, expandTerritory, spawnRaid, spawnBoss, changeProfession, unitExtra, gainXp, SKILLS, expBlock, isNight, startTool, updatePreview, confirmPreview, centerOn, draw, simTick, step(n) { for (let i = 0; i < n; i++) simTick(); }, spawn, mk, SPR, get sel() { return sel; }, get preview() { return preview; }, get selected() { return selected; }, get tick() { return tick; }, serialize, loadGame, saveGame, closeP, expAutoSquad, expEligible, expPreview, startExpedition, expRecall, tripUpdate, expTick, showExpedition, expLocked, EXP_DEFS, EXP_RISK, showEventPopup, autoStaff, tryWall, checkPerimeter, autoRepair, killSurvivor, useBandage, bleedMax, careTicks, BLEED_TICKS, CARE_TICKS, retreatCheck, wallBroken, perimText, upgradeBuilding, upgradeCheck, hourlyProduction, endOfDay, supplyStats, ration, workBoost, isWorking, prodMult, supplyCap, DEFS, setDebug(v) { debug = v; }, slotInfo, SLOT, SLOT_KEYS, finaleTest: () => finaleHour(), DIFFS, STARTS, DF, applyStart, LEGACY, legacyCheck, legacyDone, signalReady, startFinale, winGame, scoreOf, records, showGoals, tryPost, removePost, postsAssign, showPost, myPost, atPost, postLure, postMax, POST_R, patrolDest, eventQueue, encPopup, EXP_ENC, expEncounter, encResolve, encOdds, encDefault, encChoose, TRAITS, rollTrait, traitRange, traitWork, expTraitLoot, backupText, parseBackup, importBackup, exportBackup, showBackup, get saveBlocked() { return saveBlocked; }, get saveErr() { return saveErr; }, get loadedFrom() { return loadedFrom; }, advisorTips, advisorUpdate, get advShown() { return advShown; }, militia, rally, POLICIES, setPolicy, policy, retreatPct, onShift, shifts, assignRescue, underAttack, engaged, wreckSpots, PIXSTAT, pixelCacheSize: () => pixelCache.size, pixelCacheMB: () => Math.round([...pixelCache.values()].reduce((t, c) => t + c.width * c.height * 4, 0) / 1e5) / 10, econ, ecoLast24, showResource, workShare, ECO, findGaps, currentObjective, showObjective, suggestSpot, get objMarks() { return objMarks; }, alerts, note, OPTS, alertsTick, renderAlerts, sendDefender, bestDefender, get simSpeed() { return simSpeed; }, get repairFirst() { return repairFirst; }, endBuildMode, demolish, moveBuilding, TWs, THs, BASE_TW, BASE_TH, TILE_PX, B4_DEFS, buildGround, get groundChunks() { return groundChunks; }, GR, GN };
init();
})();
