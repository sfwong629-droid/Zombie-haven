/* Zombie Haven V2.6 — game (single IIFE; built from tools/parts/p1..p3 by tools/build_game.sh). */
(function () {
'use strict';
const Iso = window.ZHIso, Wd = window.ZHWorld;
const SFX = (n) => { if (window.SND) SND.play(n); };   /* V2.21 sound (js/sound.js) */
const VERSION = '2.55.0', BUILD_TAG = '3D.132', PREV_KEY = 'zombieHavenV25', OLD_KEY = 'zombieHavenV2';
/* V2.40 save slots: slot 1 keeps the old key, so existing towns carry over */
const SLOT_KEYS = ['zombieHavenR1', 'zombieHavenR1_s2', 'zombieHavenR1_s3']   /* V3D.22 resources: fresh saves (old towns are not converted) */, QS = new URLSearchParams(location.search);
let SLOT = 1; try { SLOT = Math.min(3, Math.max(1, +localStorage.getItem('zhSlot') || 1)); } catch (e) { /* storage blocked */ }
let titleOn = false; const SAVE_KEY = SLOT_KEYS[SLOT - 1], SKIP_TITLE = ['test', 's', 'play', 'tune', 'zoo'].some((k) => QS.has(k)), ZOO = QS.has('zoo');   /* 3D.32 ?zoo = zombie test page (never saves) */
/* V2.42 save safety: a day backup per slot (<key>_bak), a copy of a save that would not load (<key>_bad), a session id so a second tab on the same slot is noticed */
const BAK = (k) => k + '_bak', BAD = (k) => k + '_bad', SID = Math.random().toString(36).slice(2, 10);
let saveBlocked = '', saveErr = '', loadedFrom = '';
const G3D = true; window.ZH_3D = true;   /* 3D.129 the game is 3D only: the 2D renderer and its preview switches (?3d, ?hd, ?c64) are gone */

const BASE_TW = 80, BASE_TH = BASE_TW * Iso.RATIO;          // ONE projection for terrain, roads, buildings, units
const OFF = Wd.OFF, SH = ([x, y]) => [x + OFF, y + OFF];   /* 3D.101: the map grew by OFF tiles west and north; old spot tables are shifted */
const COLS = Wd.COLS, ROWS = Wd.ROWS, DEFS = Wd.DEFS, STAFF_JOBS = Wd.STAFF_JOBS;
/* V2.53: the C64 standard also has a 10% bigger map grid: tiles 106 x 53 art px (V7: 96 x 48), every pixel the same size.
   Buildings and walls are drawn for it (assets/buildings|map/t106, tools/art/templates); older 96-px building art stands smaller on its plot until redrawn. */
const TILE_PX = (96);
const CHAR_H = ((52 * 1.3 / 2.4)) / TILE_PX;   /* V2.52: taller people in the C64 preview (labels, bars and tap areas follow) */   // = 30 art px on the 42-px tile grid: characters and map share one pixel size                                         // character content height in tile-widths (chibi, tunable)
const $ = (id) => document.getElementById(id);
const cv = $('game'), ctx = cv.getContext('2d'), worldEl = $('world');
let VW = 390, VH = 600, DPR = 1, tick = 0, simSpeed = 1, debug = false;

const SOUND_ERR = /audio|AbortError|NotAllowedError|InvalidStateError|play\(\)|AudioContext/i;   /* V3D.13: sound hiccups (iOS refusing the audio device) are never game errors */
function crashBanner(t) { const b = $('crash'); b.style.display = 'block'; b.textContent = t; b.onclick = () => { b.style.display = 'none'; }; clearTimeout(crashBanner.t); crashBanner.t = setTimeout(() => { b.style.display = 'none'; }, 8000); }
window.addEventListener('error', (e) => { if (SOUND_ERR.test(String(e.message || ''))) { e.preventDefault(); return; } crashBanner('GAME ERROR: ' + e.message + ' @ ' + (e.filename || '').split('/').pop() + ':' + e.lineno); });
window.addEventListener('unhandledrejection', (e) => { const m = String(e.reason && e.reason.message || e.reason || ''), n = String(e.reason && e.reason.name || ''); if (SOUND_ERR.test(m) || SOUND_ERR.test(n)) { e.preventDefault(); return; }
  crashBanner('GAME ERROR: ' + m); });

/* ---------------- assets ---------------- */
const IMG = {};   // SPR[type] = {img,w,h,ax,ay,grid,tileW}

    /* V2.30 map art (tools/chars/mapart.py) */

function loadImg(key, src) { return new Promise((res) => { const im = new Image(); im.onload = () => res(); im.onerror = () => { console.warn('missing asset', src); res(); }; im.src = src + '?v=' + VERSION; IMG[key] = im; }); }
const okImg = (im) => im && im.complete && im.naturalWidth > 0;

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

async function loadAll() {   /* 3D.129 only what the 3D game shows on its menus: character looks and item icons (chars.js) and the menu icon sheet */
  const jobs = []; window.ZH_VERSION = VERSION; document.title = 'Zombie Haven V' + VERSION; if (window.ZHChars) jobs.push(ZHChars.load());
  jobs.push(loadImg('uiIcons', 'assets/ui/icons.png'), (async () => { try { UIM = await (await fetch('assets/ui/icons.json?v=' + VERSION)).json(); } catch (e) { UIM = null; } })());
  await Promise.all(jobs);
}

/* ---------------- state ---------------- */
const world = Wd.createWorld();
const S = { lvl: 1, lvStep: 0, lvUp: null, banners: [], diff: 'normal', start: 'camp', legacy: {}, finale: null, won: null, posts: [], kids: [], guide: 0, log: [], expCount: 0, pets: [], nextTrader: 2, incidents: 0, inv: {}, rp: 0, res: {}, terr: 0, nextRaid: 4.5, nextBoss: 6, produced: 0, food: 14, water: 14, mat: 30, alert: 0, sealed: false, retreat: 35, fallen: [], spare: [], ren: 0, rank: 1, threat: 1, day: 1, hour: 8, kills: 0, stage: 0, sv: [], z: [], spawnClock: 0, eventClock: 0, arrivalClock: 0, requests: [], builtCount: 0, mission: null, missionStart: { kills: 0, produced: 0, built: 0 }, lastSave: 0, seq: 0 };
const floats = [];
let sel = null;            // active build tool: {kind:'building',type} | {kind:'road'}
let preview = null;        // {x,y,w,h,type,ok,why}
let selected = null;       // {kind:'building'|'unit', ref}

/* ---------------- camera / projection (single transform) ---------------- */
const cam = { x: 0, y: 0, z: 0.85 };
const ORIGIN_Y = 14;
function project(wx, wy) { return { x: VW / 2 + cam.x + (wx - wy) * BASE_TW / 2 * cam.z, y: ORIGIN_Y + cam.y + (wx + wy) * BASE_TH / 2 * cam.z }; }
function unproject(px, py) { const a = (px - VW / 2 - cam.x) / (BASE_TW / 2 * cam.z), b = (py - ORIGIN_Y - cam.y) / (BASE_TH / 2 * cam.z); return { x: (a + b) / 2, y: (b - a) / 2 }; }
const TWs = () => BASE_TW * cam.z;
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
const APX = TILE_PX;   // tile size in art px; x of tile (0,0)'s north corner
const hash2 = (x, y) => { let h = (x * 374761393 + y * 668265263) | 0; h = (h ^ (h >>> 13)) * 1274126177 | 0; return ((h ^ (h >>> 16)) >>> 0) / 4294967296; };

const hex = (h) => [parseInt(h.slice(1, 3), 16), parseInt(h.slice(3, 5), 16), parseInt(h.slice(5, 7), 16)];
const GRASS = ['#3a4d2c', '#425832', '#4b6437', '#546f3c', '#607b44'].map(hex), DIRT = ['#4a3f30', '#55483a', '#605140', '#3e352a'].map(hex), GRASS_OUT = ['#262e22', '#2b3526', '#313c2a', '#37432e', '#3e4b33'].map(hex);   /* V2.25: darker, muted */
const PEBBLE = hex('#8a8476'), FLOWER_Y = hex('#e7d77a'), FLOWER_P = hex('#d8a8d0');
const ROADC = { base: hex('#6a5a45'), dark: hex('#5d4f3c'), light: hex('#76654e'), curb: hex('#4a3f31'), lip: hex('#7c6b53'), dash: hex('#6a5a45') };   /* V2.25: packed-dirt roads */
/* V2.50 HD ground (?hd=1): the same generator at 2 art px per V7 px (GR = 2), split into 4 x 4 chunks so no canvas passes
   iPhone Safari's 16.7-Mpx limit, and a road change only regenerates the chunks around it. V7 keeps one chunk. */

let groundChunks = null;

function tilePath(x, y, grow = 0) { const n = project(x, y), e = project(x + 1, y), s = project(x + 1, y + 1), w = project(x, y + 1); ctx.beginPath(); ctx.moveTo(n.x, n.y - grow); ctx.lineTo(e.x + grow, e.y); ctx.lineTo(s.x, s.y + grow); ctx.lineTo(w.x - grow, w.y); ctx.closePath(); }
function diamond(x, y, fill, edge) { tilePath(x, y); if (fill) { ctx.fillStyle = fill; ctx.fill(); } if (edge) { ctx.strokeStyle = edge; ctx.lineWidth = Math.max(1, cam.z); ctx.stroke(); } }

/* ---------------- roads (procedural, exact tile diamonds; arms follow neighbours) ---------------- */

/* ---------------- sprites ---------------- */

const EMOJI = { Chopping: '🪓', Mining: '⛏', Salvaging: '🔧', Searching: '🧵', Building: '🔨', Eating: '🍖', Drinking: '💧', Resting: '💤', Treatment: '💊', Shopping: '🛒', 'Getting food': '🥫', Working: '🔧', Firefighting: '🧯' };
const textCache = new Map();
function textImg(txt, font, col) {   /* V2.18: text and emoji are rasterised once and stamped (fillText was ~16% of frame time) */
  const key = txt + '|' + font + '|' + col + '|' + DPR; let c = textCache.get(key); if (c) return c;
  const m = document.createElement('canvas').getContext('2d'); m.font = font; const px = parseFloat(font.match(/(\d+(\.\d+)?)px/)[1]), w = Math.ceil(m.measureText(txt).width) + 4 + Math.ceil(px * .5), h = Math.ceil(px * 1.4) + 4;
  const cv = document.createElement('canvas'); cv.width = Math.ceil(w * DPR); cv.height = Math.ceil(h * DPR); const g = cv.getContext('2d'); g.scale(DPR, DPR); g.font = font; g.fillStyle = col; g.textAlign = 'center'; g.textBaseline = 'alphabetic'; if (/Fredoka/.test(font)) { g.lineJoin = 'round'; g.lineWidth = Math.max(2.5, px * .24); g.strokeStyle = '#3a2a22'; g.strokeText(txt, w / 2, px * 1.1 + 2); }   /* 3D.124 owner: names, timers and counts in the game's rounded font with an ink outline (was the old pixel font) */ g.fillText(txt, w / 2, px * 1.1 + 2);
  if (textCache.size > 300) textCache.clear(); c = { cv, w, h, base: px * 1.1 + 2 }; textCache.set(key, c); return c;
}
function stampText(txt, x, y, font, col) { const c = textImg(txt, font, col); ctx.imageSmoothingEnabled = false; ctx.drawImage(c.cv, Math.round((x - c.w / 2) * DPR) / DPR, Math.round((y - c.base) * DPR) / DPR, c.cv.width / DPR, c.cv.height / DPR); ctx.imageSmoothingEnabled = true; }
const TAGTXT = { Chopping: 'Chopping', Mining: 'Mining', Salvaging: 'Salvaging', Searching: 'Searching', Building: 'Building', Eating: 'Eating', Drinking: 'Drinking', Resting: 'Resting', Treatment: 'Treatment', Shopping: 'Shopping', 'Getting food': 'Foraging', Working: 'Working', Firefighting: 'Firefighting' };
const tagCache = new Map();
function statusTag(x, y, txt, col) {   /* V2.25: DV2-style status plate above a character */
  const fs = Math.round(Math.max(13, 13 * cam.z)), cozy = document.documentElement.classList.contains('cozy'), key = (cozy ? 'z' + hudU() : '') + txt + col + fs + DPR; let c = tagCache.get(key);
  if (!c && cozy) {   /* 3D.61 owner: status tags (Fighting, Working, Sleeping…) use the chat bubble's size and box: white rounded box, soft shadow, the same font; fights are red with white text like fight shouts */
    const u = hudU() * HUD_SMALL, f = Math.round(11 * u), fight = col === '#e8603a', font = `800 ${f}px Manrope, system-ui, sans-serif`, m = document.createElement('canvas').getContext('2d'); m.font = font;
    const padX = 9 * u, padY = 6 * u, dot = fight ? 0 : f * .62, h = Math.round(f * 1.12 + padY * 2), w = Math.ceil(m.measureText(txt).width + padX * 2 + (dot ? dot + 4 * u : 0)), r = h / 2, sh = 8 * u, cv = document.createElement('canvas');
    cv.width = Math.ceil((w + sh * 2) * DPR); cv.height = Math.ceil((h + sh * 2) * DPR);
    const g = cv.getContext('2d'); g.scale(DPR, DPR); g.translate(sh, sh * .6);
    g.shadowColor = 'rgba(0,0,0,.35)'; g.shadowBlur = sh; g.shadowOffsetY = 3 * u; g.beginPath(); g.roundRect(0, 0, w, h, r); g.fillStyle = fight ? '#E5483A' : 'rgba(255,255,255,.97)'; g.fill();
    g.shadowColor = 'transparent'; g.lineWidth = 1.1 * u; g.strokeStyle = fight ? 'rgba(255,255,255,.35)' : 'rgba(30,36,42,.18)'; g.stroke();
    if (dot) { g.beginPath(); g.arc(padX + dot / 2, h / 2, dot / 2, 0, 7); g.fillStyle = col; g.fill(); g.lineWidth = 1; g.strokeStyle = 'rgba(30,36,42,.35)'; g.stroke(); }
    g.font = font; g.fillStyle = fight ? '#FFFFFF' : '#1E2328'; g.textBaseline = 'middle'; g.fillText(txt, padX + (dot ? dot + 4 * u : 0), h / 2 + .5 * u);
    c = { cv, w: w + sh * 2, h: h + sh * 2, smooth: true }; tagCache.set(key, c);
  }
  if (!c) { const font = `600 ${Math.round((fs) * .85)}px Fredoka, Nunito, sans-serif`, m = document.createElement('canvas').getContext('2d'); m.font = font; const w = Math.ceil(m.measureText(txt).width) + 8, h = fs + 5;
    const cv = document.createElement('canvas'); cv.width = Math.ceil(w * DPR); cv.height = Math.ceil(h * DPR); const g = cv.getContext('2d'); g.scale(DPR, DPR);
    g.fillStyle = '#1b2016e6'; g.fillRect(0, 0, w, h); g.strokeStyle = '#6e5638'; g.lineWidth = 1.5; g.strokeRect(.75, .75, w - 1.5, h - 1.5); g.font = font; g.fillStyle = '#000'; g.textAlign = 'center'; g.fillText(txt, w / 2 + 1, fs + 1.5); g.fillStyle = col; g.fillText(txt, w / 2, fs + .5);
    if (tagCache.size > 120) tagCache.clear(); c = { cv, w, h }; tagCache.set(key, c); }
  ctx.imageSmoothingEnabled = !!c.smooth; ctx.drawImage(c.cv, Math.round((x - c.w / 2) * DPR) / DPR, Math.round((y - c.h) * DPR) / DPR, c.cv.width / DPR, c.cv.height / DPR); ctx.imageSmoothingEnabled = true;
}
function bubble(p, txt) { const ic = (window.ZHIcons) && ZHIcons.EMOJI[txt.replace(/\uFE0F/g, '')] , im = ic && ZHIcons.img(ic); if (im && im.complete) { const u = hudU() * HUD_SMALL, r = 10 * u; ctx.save(); ctx.beginPath(); ctx.arc(p.x, p.y - r, r, 0, 7); ctx.fillStyle = '#fff8ec'; ctx.fill(); ctx.lineWidth = 2 * u; ctx.strokeStyle = '#161616'; ctx.stroke(); ctx.drawImage(im, p.x - 7 * u, p.y - r - 7 * u, 14 * u, 14 * u); ctx.restore(); return; } stampText(txt, p.x, p.y, `${Math.round(Math.max(11, 13 * cam.z))}px sans-serif`, '#fff'); }
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
const OPEN_AIR = new Set(['water', 'well', 'farm', 'field', 'track', 'range', 'barrel', 'irrig', 'crates', 'bench', 'scrapyard', 'lumber', 'quarry', 'bonfire', 'sparring', 'radio']);   /* 3D.64 balance study: people 'hid' in a Rain Barrel or a Workbench; open structures are no shelter */   // outdoor structures: survivors stay visible while using them
function insideBuilding(s) {   // working, using a facility or in care, standing at an enclosed building's door point = inside
  if (!['work', 'useFacility', 'hospital', 'hiding'].includes(s.mode)) return null;
  const b = s.mode === 'work' ? s.post : s.mode === 'useFacility' ? s.facility : s.mode === 'hiding' ? s.hideAt : world.buildings.find((q) => Iso.footprintContains(q, s.w.x, s.w.y));
  if (!b || OPEN_AIR.has(b.type) || !world.buildings.includes(b)) return null;
  const d = Wd.doorPoint(b); return Math.hypot(s.w.x - d.x, s.w.y - d.y) < .9 ? b : null;   /* 3D.61 owner: sleepers kept off the door by the crowd were left lying outside the Camp (was .3) */
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

function bleedRing(s, p, dy = 0, dx = 0) {   /* the bleed-out timer; while carried it rides above the cart bed */
  const tw = TWs(); p = { x: p.x + dx, y: p.y }; const mx = bleedMax() + (s.bleed > bleedMax() ? s.bleed - bleedMax() : 0), fr = Math.max(0, Math.min(1, s.bleed / mx)), r = 13 * cam.z, cy = p.y - CHAR_H * tw * .45 + dy, carried = beingCarried(s); ctx.lineWidth = 3 * cam.z; ctx.strokeStyle = 'rgba(0,0,0,.6)'; ctx.beginPath(); ctx.arc(p.x, cy, r, 0, 7); ctx.stroke(); ctx.strokeStyle = carried ? '#6fc3ff' : fr < .25 ? '#ff3b30' : '#ffb347'; ctx.beginPath(); ctx.arc(p.x, cy, r, -Math.PI / 2, -Math.PI / 2 + fr * Math.PI * 2); ctx.stroke(); stampText(String(Math.ceil(s.bleed / 60)), p.x, cy + 5 * cam.z, `600 ${Math.round(13 * .95 * hudU())}px Fredoka, Nunito, sans-serif`, '#fff'); }
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
  if (t) { const q = project(t.w.x, t.w.y); ctx.strokeStyle = inR ? '#7fd35a' : '#ffc85a'; ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(p.x, p.y - CHAR_H * tw * .5); ctx.lineTo(q.x, q.y - CHAR_H * tw * .5); ctx.stroke(); ctx.setLineDash([]); spinArrow(q.x, q.y - CHAR_H * tw - HUD_LIFT * hudU() - 14 * hudU(), '#ff5a4a', hudU());
    stampText(inR ? 'IN RANGE' : 'CLOSING IN', q.x, q.y + .3 * tw, `600 ${Math.round(12 * .95 * hudU())}px Fredoka, Nunito, sans-serif`, inR ? '#bff0a0' : '#ffe0a0'); }
  ctx.restore();
}
/* V3D.11 cozy combat HUD (3D mode): clay-pill HP bars with a white trail of recent damage, "cozy pop" numbers,
   and a Dungeon Village 2 style LEVEL UP burst over the head. The 2D look keeps the old flat bars and pixel font. */

const hudU = () => Math.max(.72, Math.min(1.5, cam.z * .82)), HUD_SMALL = .8;   /* V3D.21: HP bars, damage numbers, LEVEL UP and emoji bubbles 20% smaller */
/* 3D.122 owner: no rings anywhere: a small arrow over the head marks who is selected or targeted, and it spins */
function spinArrow(x, y, col, sz = 1) { const t = performance.now() / 1000, c = Math.cos(t * 3.2), w = 7 * sz * Math.max(.12, Math.abs(c)), yy = y - Math.sin(t * 4) * 2.2 * sz, h = 9 * sz;
  ctx.save(); ctx.beginPath(); ctx.moveTo(x - w, yy - h); ctx.lineTo(x + w, yy - h); ctx.lineTo(x, yy); ctx.closePath(); ctx.fillStyle = col; ctx.fill(); if (c < 0) { ctx.fillStyle = 'rgba(0,0,0,.28)'; ctx.fill(); }
  ctx.lineWidth = 1.8 * sz; ctx.lineJoin = 'round'; ctx.strokeStyle = 'rgba(40,26,18,.9)'; ctx.stroke(); ctx.beginPath(); ctx.moveTo(x - w * .55, yy - h + 2 * sz); ctx.lineTo(x, yy - 2.5 * sz); ctx.strokeStyle = 'rgba(255,255,255,' + (c > 0 ? .55 : .15) + ')'; ctx.lineWidth = 1.2 * sz; ctx.stroke(); ctx.restore(); }
function rrect(x, y, w, h, r) { ctx.beginPath(); ctx.roundRect(x, y, w, h, r); }
function hudText(t, x, y, font, fill, stroke, lw) { ctx.font = font; ctx.textAlign = 'center'; ctx.textBaseline = 'alphabetic'; ctx.lineJoin = 'round'; if (lw) { ctx.lineWidth = lw; ctx.strokeStyle = stroke; ctx.strokeText(t, x, y); } ctx.fillStyle = fill; ctx.fillText(t, x, y); }
function hpPill(o, x, y, opt = {}) {   /* returns the bar's top y. opt: { zed, lv, col, w, u } */
  const u = (opt.u || hudU()) * HUD_SMALL, w = (opt.w || 40) * u, h = 8 * u, x0 = x - w / 2, f = Math.max(0, o.hp / o.max);
  if (o._ghost == null || o._ghost < f) { o._ghost = f; o._ghostHold = 0; } else if (o._ghost > f) { if ((o._ghostHold = (o._ghostHold || 0) + 1) > 18) o._ghost = Math.max(f, o._ghost - .012); }
  ctx.save(); rrect(x0, y, w, h, h / 2); ctx.fillStyle = '#f6ead6'; ctx.fill(); ctx.save(); rrect(x0, y, w, h, h / 2); ctx.clip();
  ctx.fillStyle = '#ffffff'; ctx.fillRect(x0, y, w * o._ghost, h);
  ctx.fillStyle = opt.col || (opt.zed ? '#e8453c' : '#5ccf5a'); ctx.fillRect(x0, y, w * f, h);   /* 3D.30: colour says who it is (survivors green, zombies red, people against you yellow), not how hurt */
  ctx.fillStyle = 'rgba(255,255,255,.45)'; ctx.fillRect(x0, y + h * .14, w * f, h * .22); ctx.restore();
  rrect(x0, y, w, h, h / 2); ctx.lineWidth = Math.max(1.8, 2 * u); ctx.strokeStyle = '#5a3f31'; ctx.stroke();
  if (opt.lv) { const bx = x0 - 6 * u, r = 7.5 * u; ctx.beginPath(); ctx.arc(bx, y + h / 2, r, 0, 7); ctx.fillStyle = '#ffd45c'; ctx.fill(); ctx.stroke(); hudText(String(opt.lv), bx, y + h / 2 + 3.8 * u, `600 ${Math.round(10.5 * u)}px Fredoka, Nunito, sans-serif`, '#5a3f31'); }
  ctx.restore(); return y;
}
const HUD_LIFT = 10;   /* the bars float this many screen px (x zoom) above the head */
function floatCozy(f, p) {   /* a float's life runs from f.a0 down to 0 (frames) */
  const u = hudU() * HUD_SMALL, k = 1 - f.a / f.a0, num = /^[-+]\d+$/.test(f.t), pop = k < .12 ? 1 + 1.1 * (1 - k / .12) * (k / .12) * 4 : 1;
  const sz = (num ? 21 : f.big ? 16 : 14) * u * pop, x = p.x + (f.dx || 0) * u * k * 14, y = p.y - CHAR_H * TWs() - HUD_LIFT * u - 14 * u - 26 * u * Math.min(1, k * 2.4) - 10 * u * k;
  const fill = f.col === '#ff6e62' ? '#ff9b8a' : num && f.t[0] === '+' ? '#c9f2a6' : num ? '#fff3d6' : f.col;   /* hurt red, heal green, hits cream; other notes keep their colour */
  ctx.save(); ctx.globalAlpha = k > .75 ? (1 - k) / .25 : 1;
  const ic = window.ZHIcons && Object.keys(ZHIcons.EMOJI).find((e) => f.t.includes(e)), im = ic && ZHIcons.img(ZHIcons.EMOJI[ic]);
  if (im && im.complete) {   /* V3D.14: '+1 💧' is drawn as '+1' and the Clay icon */
    const txt = f.t.replace(ic, '').replace(/\s+/g, ' ').trim(), font = `600 ${Math.round(sz)}px Fredoka, Nunito, sans-serif`; ctx.font = font; const tw = txt ? ctx.measureText(txt).width : 0, is = sz * 1.15, gap = txt ? sz * .15 : 0, x0 = x - (tw + gap + is) / 2;
    if (txt) hudText(txt, x0 + tw / 2, y, font, fill, '#5a3f31', Math.max(3, sz * .22)); ctx.drawImage(im, x0 + tw + gap, y - is * .82, is, is);
  } else hudText(f.t, x, y, `600 ${Math.round(sz)}px Fredoka, Nunito, sans-serif`, fill, '#5a3f31', Math.max(3, sz * .22));
  ctx.restore();
}
/* V3D.12 loot bags: a zombie's scrap drop as a bag (it falls and bounces in 3D), the fighter walks over once no
   zombie is close, and the bag pops open with a sparkle burst before the scrap are counted. Bags nobody fetches open
   by themselves after ~3 game hours. */
let bagSeq = 1;
function dropBag(w, amt, killer, extra, rar) {   /* tossed a little away from the fight, so the fighter has to walk over */
  let dx = w.x - (killer ? killer.w.x : w.x - 1), dy = w.y - (killer ? killer.w.y : w.y), L = Math.hypot(dx, dy) || 1; const a = (rnd() - .5) * 1.2, c = Math.cos(a), sn = Math.sin(a); [dx, dy] = [(dx * c - dy * sn) / L, (dx * sn + dy * c) / L];
  let x = w.x + dx * .8, y = w.y + dy * .8; if (!Wd.walkable || Wd.walkable(world, Math.floor(x), Math.floor(y))) { /* ok */ } else { x = w.x; y = w.y; }
  (S.bags ||= []).push({ id: bagSeq++ + '_' + tick, w: { x, y }, amt, t0: tick, extra: extra || null, rar: rar || (extra && Object.keys(extra).some((k) => RES_RAR[k] === 'rare') ? 'rare' : extra ? 'uncommon' : 'common') });
}
function fetchBag(s) {
  const bag = (S.bags || []).filter((b) => !b.opened && dist(b.w, s.w) < 4).sort((a, b) => dist(a.w, s.w) - dist(b.w, s.w))[0];
  if (!bag || threatOf(s) || S.z.some((z) => z.hp > 0 && z.mode !== 'zleave' && dist(z.w, s.w) < 8)) return false;   /* 3D.64 owner: no grabbing bags mid-fight */
  s.mode = 'loot'; s.lootId = bag.id; s.path = null; s.target = null; s.why = 'Grabbing the dropped bag'; return true;
}
function openBag(bag, s) {
  if (bag.opened) return; bag.opened = tick; bag.f = 0; S.mat += bag.amt; if (bag.amt) flow('mat', 'Zombie drops', bag.amt); SFX('reward');
  if (bag.amt) floats.push({ w: { ...bag.w }, t: '+' + bag.amt + ' ⚙', col: '#9fe0ff', a: 80, big: true });
  const ex = { ...(bag.extra || {}) }, item = ex.item; delete ex.item; addLoot(ex, 'Zombie drops'); if (item) stashAdd(item);
  Object.entries(ex).forEach(([k, v], i) => floats.push({ w: { x: bag.w.x, y: bag.w.y - .3 * (i + 1) }, t: '+' + v + ' ' + RES_ICON[k], col: RARITY[RES_RAR[k]].c, a: 90, big: true }));
  if ((bag.rar === 'epic') && !window.ZH_NO_REVEAL) lootReveal({ title: 'BOSS LOOT', sub: 'The big one dropped its stash', entries: lootEntries({ mat: bag.amt, ...ex }, item ? [item] : []) }); else if (item) screenToast('🎁 Found: ' + ITEMS[item].name);
  ui();
}
function bagsTick() {
  if (tick % 60 === 0) for (const b of S.bags || []) {   /* V3D.17: a bag nobody went for gets fetched by the nearest idle survivor */
    if (b.opened || tick - b.t0 < 150 || S.sv.some((q) => q.lootId === b.id && q.mode === 'loot') || zombieNear(b.w, 7)) continue;
    const q = S.sv.filter((q) => ['free', 'wait', 'walk', 'postCombat'].includes(q.mode) && !zombieNear(q.w, 7) && !insideBuilding(q) && q.hp > q.max * .3 && dist(q.w, b.w) < 14 && !threatOf(q)).sort((x, y) => dist(x.w, b.w) - dist(y.w, b.w))[0];
    if (q) { q.mode = 'loot'; q.lootId = b.id; q.path = null; q.target = null; q.dest = null; q.why = 'Picking up a dropped bag'; }
  }
  for (const b of S.bags || []) if (!b.opened && tick - b.t0 > 1500) openBag(b); if (S.bags && S.bags.length) S.bags = S.bags.filter((b) => !b.opened || tick - b.opened < 120); }
function drawBagFx() {   /* glints on waiting bags, a burst of stars when one opens */
  for (const b of S.bags || []) {
    const p = project(b.w.x, b.w.y), u = hudU();
    if (!b.opened) { const k = ((tick + b.id.length * 13) % 70) / 70; if (k < .35) { ctx.save(); ctx.globalAlpha = Math.sin(k / .35 * Math.PI); ctx.fillStyle = '#fff6c2'; hudStar(p.x + 5 * u, p.y - 13 * u, 3.6 * u, k * 4); ctx.fill(); ctx.restore(); } continue; }
    const t = (b.f = (b.f || 0) + 1) / 60; if (t > 1.2) continue;
    ctx.save(); for (let i = 0; i < 12; i++) { const a = i / 12 * 6.283 + .3, r = (6 + 34 * Math.min(1, t * 2.2)) * u, al = Math.max(0, 1 - t / 1.1);
      ctx.globalAlpha = al; ctx.fillStyle = ['#ffd45c', '#fff6c2', '#9be2ff', '#ffb0d0'][i % 4]; hudStar(p.x + Math.cos(a) * r, p.y - 10 * u + Math.sin(a) * r * .6 - t * 12 * u, 4.5 * u * (1 - t * .6), t * 5); ctx.fill(); }
    ctx.globalAlpha = Math.max(0, .6 - t); const gl = ctx.createRadialGradient(p.x, p.y - 8 * u, 0, p.x, p.y - 8 * u, 26 * u); gl.addColorStop(0, 'rgba(255,240,170,.9)'); gl.addColorStop(1, 'rgba(255,240,170,0)'); ctx.fillStyle = gl; ctx.fillRect(p.x - 26 * u, p.y - 34 * u, 52 * u, 52 * u); ctx.restore();
  }
}
const lvBursts = [];
function levelUpFx(s) { s._lvT = 156; lvBursts.push({ s, f: 0, lv: s.l || 1, sp: Array.from({ length: 14 }, () => ({ a: Math.random() * 6.28, r: .4 + Math.random() * .6, v: .6 + Math.random() * .8, c: ['#ffd45c', '#fff6c2', '#9be2ff', '#ffb0d0'][(Math.random() * 4) | 0] })) }); }
function hudStar(x, y, r, rot) { ctx.beginPath(); for (let i = 0; i < 10; i++) { const a = rot + i * Math.PI / 5, q = i % 2 ? r * .45 : r; ctx.lineTo(x + Math.cos(a) * q, y + Math.sin(a) * q); } ctx.closePath(); }
function drawLevelUps() {
  for (let i = lvBursts.length - 1; i >= 0; i--) {   /* timed in drawn frames (60 a second), like the floats */
    const b = lvBursts[i], t = b.f++ / 60; if (b.s._lvT > 0) b.s._lvT--; if (t > 2.6 || !S.sv.includes(b.s) || !b.s.w) { b.s._lvT = 0; lvBursts.splice(i, 1); continue; }   /* 3D.30: never leave the level-up timer running (stuck cheering) */
    if (insideBuilding(b.s)) continue;
    const u = hudU() * HUD_SMALL, fp = project(b.s.w.x, b.s.w.y), hy = fp.y - CHAR_H * TWs() - HUD_LIFT * u, k = t / 2.6, ring = Math.min(1, t / .35), fade = k > .7 ? (1 - k) / .3 : 1;
    ctx.save(); ctx.globalAlpha = .55 * fade; ctx.strokeStyle = '#ffe58a'; ctx.lineWidth = 3 * u; ctx.beginPath(); ctx.ellipse(fp.x, fp.y, 26 * u * ring, 11 * u * ring, 0, 0, 7); ctx.stroke();
    const pg = ctx.createLinearGradient(0, hy, 0, fp.y); pg.addColorStop(0, 'rgba(255,240,170,0)'); pg.addColorStop(1, 'rgba(255,230,140,.55)');
    ctx.globalAlpha = .7 * fade * Math.min(1, t / .25); ctx.fillStyle = pg; ctx.fillRect(fp.x - 17 * u * ring, hy, 34 * u * ring, fp.y - hy);
    for (const sp of b.sp) { const tt = Math.max(0, t - .1) * sp.v; if (tt > 1.6) continue; ctx.globalAlpha = Math.max(0, 1 - tt / 1.6); ctx.fillStyle = sp.c; hudStar(fp.x + Math.cos(sp.a) * 22 * u * sp.r, fp.y - tt * 64 * u - 8 * u, 4 * u * (1 - tt / 2.2), tt * 3); ctx.fill(); }
    const word = 'LEVEL UP!', sz = 22 * u, font = `${Math.round(sz)}px 'Lilita One', Fredoka, sans-serif`; ctx.font = font;
    const ws = [...word].map((c) => ctx.measureText(c).width), tot = ws.reduce((a, c) => a + c, 0), yb = hy - 30 * u + Math.sin(t * 7) * 2 * u; let x = fp.x - tot / 2;
    ctx.globalAlpha = fade;
    [...word].forEach((c, j) => { const lt = t - (.08 + j * .05); if (lt >= 0) { const hop = lt < .22 ? -Math.sin(lt / .22 * Math.PI) * 13 * u : 0, sq = lt < .22 ? 1 + .25 * Math.sin(lt / .22 * Math.PI) : 1;
      ctx.save(); ctx.translate(x + ws[j] / 2, yb + hop); ctx.scale(1 / sq, sq); const gr = ctx.createLinearGradient(0, -sz, 0, 0); gr.addColorStop(0, '#fffbe0'); gr.addColorStop(.55, '#ffd45c'); gr.addColorStop(1, '#ff9a2a');
      ctx.font = font; ctx.textAlign = 'center'; ctx.lineJoin = 'round'; ctx.lineWidth = sz * .28; ctx.strokeStyle = '#5a3f31'; ctx.strokeText(c, 0, 0); ctx.fillStyle = gr; ctx.fillText(c, 0, 0); ctx.restore(); } x += ws[j]; });
    if (t > .75) { const lt = Math.min(1, (t - .75) / .25), yy = yb + 16 * u - 4 * u * lt, txt = 'Lv ' + (b.lv - 1) + ' ▸ ' + b.lv; ctx.globalAlpha = fade * lt; ctx.font = `600 ${Math.round(12 * u)}px Fredoka, sans-serif`;
      const tw = ctx.measureText(txt).width + 14 * u; rrect(fp.x - tw / 2, yy - 12 * u, tw, 17 * u, 8.5 * u); ctx.fillStyle = '#fff8ec'; ctx.fill(); ctx.lineWidth = 2 * u; ctx.strokeStyle = '#5a3f31'; ctx.stroke(); hudText(txt, fp.x, yy + .5 * u, ctx.font, '#5a3f31'); }
    ctx.restore();
  }
}
function drawHuman(s) {
  if (insideBuilding(s)) return;   // hidden while inside
  const p = project(s.w.x, s.w.y);
  if (s.mode === 'down' && beingCarried(s)) { if (s.bleed != null) bleedRing(s, project(s.rescuer.w.x, s.rescuer.w.y), -CHAR_H * TWs() * .62, TWs() * .45 * (facing(s.rescuer).right ? 1 : -1)); return; }   /* V2.33: drawn lying in the rescuer's cart */
  const tw = TWs(), top = p.y - CHAR_H * tw - 3; hitSpark(s, p);
  const hit0 = underAttack(s);
  let tagY = top - 2; const selU = selected && selected.ref === s, near = cam.z >= 1.7, fighting = ['attack', 'chase', 'recover'].includes(s.mode);   /* V3D.17: fewer markers on people */
  if ((fighting || s.hp < s.max * .7 || selU || (near && s.hp < s.max))) {
    { const u = hudU(); tagY = hpPill(s, p.x + 3 * u, top - HUD_LIFT * u, { lv: s.l || 1 }) - 3 * u; } }
  if (s.mode === 'down' && s.bleed != null) bleedRing(s, p);
  const ic = s.activity ? EMOJI[s.activity] : (s.mode === 'chase' || s.mode === 'attack' ? '⚔️' : s.mode === 'rescueTo' || s.mode === 'rescueCarry' ? '🚑' : s.mode === 'down' ? '💀' : s.mode === 'hospital' ? '💊' : s.purpose === 'patrol' ? '🛡️' : (s.purpose || '').startsWith('scav') ? '🔍' : s.mode === 'wait' && s.idleBubble && (tick + s.phase) % 600 < 130 ? s.idleBubble : '');
  let tagT = s.mode === 'down' ? '' : s.activity ? (TAGTXT[s.activity] || s.activity) : s.mode === 'chase' || s.mode === 'attack' || s.mode === 'recover' ? 'Fighting' : s.mode === 'rescueTo' || s.mode === 'rescueCarry' ? 'Rescue' : s.mode === 'hospital' ? 'In care' : s.mode === 'goFire' ? 'Fire!' : s.purpose === 'patrol' ? 'Patrol' : (s.purpose || '').startsWith('scav') ? 'Scavenging' : '';
  if ((!(selU || near || s.mode === 'goFire'))) tagT = '';
  if ((s.reloadT > 0)) { const u = hudU(), w = weaponOf(s), k = 1 - s.reloadT / Math.max(1, (w.reload || 1) * 60), cx = p.x - 16 * u, cy = (tagT ? tagY - 16 * u * HUD_SMALL : tagY) - 12 * u;   /* V3D.16 reload timer */
    ctx.save(); ctx.beginPath(); ctx.arc(cx, cy, 11 * u, 0, 7); ctx.fillStyle = '#fff8ec'; ctx.fill(); ctx.lineWidth = 2 * u; ctx.strokeStyle = '#5a3f31'; ctx.stroke();
    ctx.lineWidth = 4 * u; ctx.lineCap = 'round'; ctx.strokeStyle = '#f2a33a'; ctx.beginPath(); ctx.arc(cx, cy, 11 * u, -Math.PI / 2, -Math.PI / 2 + k * Math.PI * 2); ctx.stroke();
    hudText(String(w.mag || ''), cx, cy + 4 * u, `600 ${Math.round(10 * u)}px Fredoka, sans-serif`, '#5a3f31'); ctx.restore(); }
  if ((s.bark) && !s._lvT) drawBark(s, p, tagT ? tagY - 26 * hudU() * HUD_SMALL : tagY);
  else if ((s.emo) && !s._lvT) drawEmote(s, p, tagT ? tagY - 26 * hudU() * HUD_SMALL : tagY);
  if (s._lvT > 0) { /* the LEVEL UP burst takes the space above the head */ }
  else if (tagT && ((selU) || near || s.mode === 'goFire')) statusTag(p.x, tagY, tagT, s.mode === 'chase' || s.mode === 'attack' || s.mode === 'recover' || s.mode === 'goFire' ? '#e8603a' : '#cfe08a');
  else if (ic && s.mode !== 'down' && !((s.emo || s.bark))) bubble({ x: p.x, y: tagY - 1 }, ic);
  if ((selected && selected.ref === s) || hit0) spinArrow(p.x, tagY - 24 * hudU(), selected && selected.ref === s ? '#ffe145' : '#ff5a4a', hudU() * .9);
  if (selected && selected.ref === s) { stampText(s.name, p.x, p.y + .36 * tw, `600 ${Math.round(15 * .95 * hudU())}px Fredoka, Nunito, sans-serif`, '#fff0b0'); }
}
const ZSCALE = { bloated: 1.2, brute: 1.28, crawler: .5, alpha: 1.6, dog: .55, riot: 1.08, boss: 1.6 };

const corpses = [], shots = [], spits = [];   /* 3D.35 spits: flying mucus globs from spitters */   /* shots: short tracer lines for guns and bows (V2.33) */   /* short death animations (not saved) */

/* 3D.36 attack impact effects: brute / Alpha / boss slam = ground shockwave, dust and debris and a little screen shake;
   bloated = a green belly-splash; claws = three quick slash marks on the target; spitter hits use the spit splat. */
const hitFx = [], SCREAM_R = 2.4, SMASH_R = 1.8, LASH_R = 2, ROT_R = 1.9, ROT_FUSE = 66;   /* 3D.80 Lasher reach, Rotbomb burst radius (tiles) */
/* 3D.37 survivor melee combo: hits in a row on the same enemy (within 2.5 s) chain swing A, swing B, then a two-hand finisher for +60% damage */
/* 3D.58 quick combo: any melee swing can burst into a fast three-hit combo. The chance follows Agility (2.5% per point, so 5 agi = 12.5%,
   10 agi = 25%); the follow-up hits come almost at once and the last one hits 1.5x. */
const comboChance = (s) => Math.min(.4, Math.max(.03, stat(s, 'agi') * .025));
function comboMult(s, z, w) {
  if (w.ranged) { s.comboQ = 0; s.comboStep = 0; s.comboFin = false; return 1; }
  s.comboFin = false;
  if (s.comboQ > 0 && s.comboZ === z) { s.comboQ--; s.comboStep++; if (!s.comboQ) { s.comboFin = true; return 1.5; } return 1.1; }
  s.comboZ = z; s.comboQ = 0; s.comboStep = 0; s.swingN = (s.swingN || 0) + 1;
  if (rnd() < comboChance(s)) { s.comboQ = 2; s.comboStep = 1; floats.push({ w: { x: z.w.x, y: z.w.y - .45 }, t: 'COMBO!', col: '#C6FF4D', a: 60, big: true }); }
  return 1;
}
const zHitDmg = (z, d, t) => Math.max(1, fairRound(d.atk * (z.pw || 1) * (t && t.spec === 'Guard' ? .8 : 1) * (hasSkill(t, 'armored') ? .8 : 1) * (hasSkill(t, 'bulwark') ? .85 : 1) * (atPost(t) ? .8 : 1) * (1 - dmgReduce(t))));
function impactFx(z, w) {
  if (!w || z.type !== 'screamer') return; const k = 'scream';   /* 3D.39 owner: only the Screamer has a hit effect for now (board style B); the others looked wrong, so none */
  hitFx.push({ k, w: { x: w.x, y: w.y }, t0: tick, big: z.type === 'alpha' || z.type === 'boss' ? 1.4 : 1, a: rnd() * 6.28, bits: Array.from({ length: 9 }, () => ({ a: rnd() * 6.28, v: .5 + rnd(), s: rnd() })) });
  if (k === 'slam' && (z.type === 'alpha' || z.type === 'boss')) { const p = project(w.x, w.y); if (p.x > -40 && p.x < VW + 40 && p.y > -40 && p.y < VH + 40) { const el = $('world'); if (el) { el.classList.remove('zhShake'); void el.offsetWidth; el.classList.add('zhShake'); } } }
}
/* 3D.38 toned down (owner: "way too much"); the same drawing runs on the Zombie Animation Board (fxDraw is copied there) */
const FX_STRENGTH = 1;
function fxDraw(g, f, q, p, tw, H, k = FX_STRENGTH) {   /* g: 2D context, f: effect, q: 0..1 progress, p: ground point (px), tw: tile width (px), H: survivor height (px) */
  g.save(); const px = tw / 40;
  if (f.k === 'slam') { const R0 = tw * .4 * f.big * k;
    for (const [d, c, w] of [[0, 'rgba(255,248,230,', 2.4], [.15, 'rgba(170,135,90,', 1.6]]) { const u = Math.max(0, q - d) / (1 - d), e = 1 - (1 - u) * (1 - u); g.globalAlpha = (1 - u) * .7; g.strokeStyle = c + '1)'; g.lineWidth = w * px; g.beginPath(); g.ellipse(p.x, p.y, R0 * e, R0 * e * .5, 0, 0, 7); g.stroke(); }
    for (const b of f.bits.slice(0, 6)) { const r = R0 * .85 * Math.min(1, q * 2) * b.v, x = p.x + Math.cos(b.a) * r, y = p.y + Math.sin(b.a) * r * .5; g.globalAlpha = (1 - q) * .5;
      g.fillStyle = b.s < .55 ? 'rgb(196,170,130)' : 'rgb(150,120,85)'; g.beginPath(); g.arc(x, y - H * .08 * Math.min(1, q * 3) * (1 - q), (2 + 4 * q) * px * k * (b.s < .55 ? 1 : .6), 0, 7); g.fill(); } }
  else if (f.k === 'scream') { fxScreamB(g, f, q, p, tw, H); }
  else if (f.k === 'smash') { fxSmashB(g, f, q, p, tw, H); }
  else if (f.k === 'scream_old') {
    const RX = tw * .7 * (f.r || 2.4); g.globalAlpha = (1 - q) * .12 * k; g.fillStyle = '#c9a8ff'; g.beginPath(); g.ellipse(p.x, p.y, RX, RX * .5, 0, 0, 7); g.fill();
    for (let j = 0; j < 3; j++) { const u = Math.min(1, Math.max(0, q * 1.5 - j * .2)); if (u <= 0 || u >= 1) continue; g.globalAlpha = (1 - u) * .8; g.strokeStyle = j % 2 ? '#FFE14D' : '#c9a8ff'; g.lineWidth = (2.6 - j * .5) * px; g.beginPath(); g.ellipse(p.x, p.y, RX * u, RX * u * .5, 0, 0, 7); g.stroke(); }
    const hx = p.x, hy = p.y - H * .92; g.lineCap = 'round';
    for (let j = 0; j < 3; j++) { const u = (q * 2.2 + j / 3) % 1, r = (8 + u * 26) * px; g.globalAlpha = (1 - u) * (1 - q) * .9; g.strokeStyle = '#FFE14D'; g.lineWidth = 2 * px; for (const sd of [-1, 1]) { g.beginPath(); g.arc(hx, hy, r, sd > 0 ? -1.1 : Math.PI - .5, sd > 0 ? -.4 : Math.PI + .2); g.stroke(); } g.beginPath(); g.arc(hx, hy - r * .2, r, -Math.PI / 2 - .35, -Math.PI / 2 + .35); g.stroke(); } }
  else if (f.k === 'burst') { const R0 = tw * .7 * ROT_R * .62, e = 1 - (1 - q) * (1 - q), cy = p.y - H * .35;   /* 3D.85 Rotbomb explosion */
    if (q < .18) { const u = q / .18; g.globalAlpha = 1 - u; g.fillStyle = '#fff6c8'; g.beginPath(); g.ellipse(p.x, cy, R0 * (.3 + .5 * u), R0 * (.3 + .5 * u) * .8, 0, 0, 7); g.fill(); }   /* white-hot flash */
    { const u = Math.min(1, q / .45), r = R0 * (.25 + .6 * u); g.globalAlpha = (1 - u) * .9;   /* fireball of rot gas: orange core, sickly green rim */
      const gr = g.createRadialGradient(p.x, cy, r * .1, p.x, cy, r); gr.addColorStop(0, '#ffd25a'); gr.addColorStop(.45, '#e0782a'); gr.addColorStop(.8, '#8fae36'); gr.addColorStop(1, 'rgba(110,140,40,0)');
      g.fillStyle = gr; g.beginPath(); g.ellipse(p.x, cy, r, r * .8, 0, 0, 7); g.fill(); }
    g.globalAlpha = (1 - q) * .9; g.strokeStyle = '#f2e6b0'; g.lineWidth = 2.6 * px; g.beginPath(); g.ellipse(p.x, p.y, R0 * e, R0 * e * .5, 0, 0, 7); g.stroke();   /* shock ring on the ground, to the edge of the blast */
    g.globalAlpha = (1 - q) * .25; g.fillStyle = '#9cc23e'; g.beginPath(); g.ellipse(p.x, p.y, R0 * e, R0 * e * .5, 0, 0, 7); g.fill();
    for (const b of f.bits) { const r = R0 * e * b.v, h = Math.sin(Math.PI * Math.min(1, q * 1.3)) * H * .7 * b.v; g.globalAlpha = Math.min(1, (1 - q) * 1.6);   /* chunks flying out on arcs */
      g.fillStyle = b.s < .4 ? '#7a8f2e' : b.s < .7 ? '#c9b24a' : '#6b3a2e'; g.beginPath(); g.arc(p.x + Math.cos(b.a) * r, p.y + Math.sin(b.a) * r * .5 - h, (2 + 2 * b.s) * px, 0, 7); g.fill(); }
    for (let j = 0; j < 5; j++) { const a = j * 1.26 + .4, r = R0 * .45 * e, u = Math.max(0, q - .25) / .75; if (!u) continue; g.globalAlpha = (1 - u) * .35; g.fillStyle = '#6f7a4a';   /* green-grey smoke that lingers and rises */
      g.beginPath(); g.arc(p.x + Math.cos(a) * r, cy + Math.sin(a) * r * .4 - H * .4 * u, (6 + 10 * u) * px, 0, 7); g.fill(); } }
  else if (f.k === 'lash') { const a = f.zr && f.zr.hp > 0 ? f.zr.w : f.w, b = f.qr && f.qr.w ? f.qr.w : f.to, pa = project(a.x, a.y), pb = project(b.x, b.y), ya = pa.y - H * .62, yb = pb.y - H * .45;   /* 3D.80 the Lasher's arm: a pale sinew line from it to the hooked survivor */
    const out = q < .3 ? q / .3 : 1, mx = pa.x + (pb.x - pa.x) * out, my = ya + (yb - ya) * out; g.globalAlpha = q < .8 ? .9 : (1 - q) * 4.5; g.lineCap = 'round';
    g.strokeStyle = '#3a2f2a'; g.lineWidth = 1.8 * px; g.beginPath(); g.moveTo(pa.x, ya); g.quadraticCurveTo((pa.x + mx) / 2, (ya + my) / 2 - 2.5 * px, mx, my); g.stroke();
    g.strokeStyle = '#e8ddcf'; g.lineWidth = .9 * px; g.stroke(); }
  else if (f.k === 'belly') { const R0 = tw * .34 * k, e = Math.min(1, q * 1.8); g.globalAlpha = (1 - q) * .75; g.strokeStyle = '#b8d65a'; g.lineWidth = 2 * px; g.beginPath(); g.ellipse(p.x, p.y, R0 * e, R0 * e * .5, 0, 0, 7); g.stroke();
    for (const b of f.bits.slice(0, 6)) { const r = R0 * e * b.v; g.fillStyle = b.s < .5 ? '#9cc23e' : '#d6c24a'; g.beginPath(); g.arc(p.x + Math.cos(b.a) * r, p.y + Math.sin(b.a) * r * .5 - H * .18 * Math.sin(Math.PI * e) * b.v, 1.7 * px * k, 0, 7); g.fill(); } }
  else { const cx = p.x, cy = p.y - H * .55, L = tw * .2 * k, e = Math.min(1, q * 3); g.globalAlpha = (q < .5 ? 1 : 2 - q * 2) * .85; g.lineCap = 'round';
    for (let j = -1; j <= 1; j++) { g.save(); g.translate(cx + j * L * .25, cy); g.rotate(f.a * .2 - .6); g.strokeStyle = '#ffffff'; g.lineWidth = 2.2 * px; g.beginPath(); g.moveTo(-L / 2, -L * .2); g.quadraticCurveTo(0, L * .1, -L / 2 + L * e, -L * .2 + L * .4 * e); g.stroke(); g.strokeStyle = '#e8453c'; g.lineWidth = 1 * px; g.stroke(); g.restore(); } }
  g.restore();
}
const FX_DUR = { claw: 12, belly: 32, slam: 34, scream: 60, smash: 56, burst: 56, lash: 50 };
/* 3D.39 Screamer shriek, style B "detailed, painted" from the Zombie Animation Board: wavering sound rings roll out to the edge of the
   AOE (the real SCREAM_R), kicking up soft dust at the front, and jagged shriek lines burst from the open mouth. No ink lines. */
function fxScreamB(g, f, q, p, tw, H) {
  const px = tw / 40 * .18, RX = tw * .7 * (f.r || SCREAM_R), hx = p.x, hy = p.y - H * .92, out = 1 - q;
  if (!f.wob) { f.wob = [0, 1, 2].map(() => ({ ph: rnd() * 6, fq: 5 + ((rnd() * 4) | 0), amp: .04 + rnd() * .04 })); f.dust = Array.from({ length: 6 }, () => ({ a: rnd() * 6.28, s: .6 + rnd() * .7 })); }
  g.save(); g.lineJoin = 'round'; g.lineCap = 'round';
  for (let j = 0; j < 3; j++) { const u = Math.min(1, Math.max(0, q * 1.45 - j * .2)); if (u <= 0 || u >= 1) continue; const w = f.wob[j];
    g.globalAlpha = (1 - u) * .9; g.beginPath(); for (let i = 0; i <= 48; i++) { const an = i / 48 * Math.PI * 2, rr = RX * u * (1 + w.amp * Math.sin(an * w.fq + w.ph + q * 20)), x = p.x + Math.cos(an) * rr, y = p.y + Math.sin(an) * rr * .5; i ? g.lineTo(x, y) : g.moveTo(x, y); }
    g.lineWidth = (3 - j * .6) * px; g.strokeStyle = j === 1 ? 'rgba(170,140,225,.85)' : 'rgba(236,226,200,.85)'; g.stroke();
    for (const d of f.dust) { const x = p.x + Math.cos(d.a) * RX * u, y = p.y + Math.sin(d.a) * RX * u * .5 - 2 * px, r = (2 + 2 * d.s) * px, gr = g.createRadialGradient(x - r * .3, y - r * .4, r * .1, x, y, r);
      gr.addColorStop(0, '#e6d8bd'); gr.addColorStop(1, '#a8916c'); g.globalAlpha = (1 - u) * .7; g.fillStyle = gr; g.beginPath(); g.arc(x, y, r, 0, 7); g.fill(); } }
  for (let j = 0; j < 7; j++) { const u = (q * 2.4 + j / 7) % 1, an = -Math.PI / 2 + (j - 3) * .32, r0 = 6 * px, r1 = r0 + (8 + 18 * u) * px; g.globalAlpha = (1 - u) * out;
    g.beginPath(); for (let i = 0; i <= 4; i++) { const rr = r0 + (r1 - r0) * i / 4, jit = (i % 2 ? 1 : -1) * 1.6 * px; g.lineTo(hx + Math.cos(an) * rr - Math.sin(an) * jit, hy + Math.sin(an) * rr + Math.cos(an) * jit); }
    g.lineWidth = 1.4 * px; g.strokeStyle = '#fff3c4'; g.stroke(); }
  g.restore();
}
/* 3D.89 Stalker hulk smash, same painted style as fxScreamB: a flash and horizontal shock lines burst from the clap at chest
   height, a pale pressure ring spreads at that height, and wavering ground rings (cream and dusty amber) roll out to the edge of
   the AOE (the real SMASH_R), kicking up dust and a few chips. No ink lines. */
function fxSmashB(g, f, q, p, tw, H) {
  const px = tw / 40 * .18, RX = tw * .7 * (f.r || SMASH_R), cx = p.x, cy = p.y - H * .62, out = 1 - q;
  if (!f.wob) { f.wob = [0, 1, 2].map(() => ({ ph: rnd() * 6, fq: 5 + ((rnd() * 4) | 0), amp: .04 + rnd() * .04 })); f.dust = Array.from({ length: 8 }, () => ({ a: rnd() * 6.28, s: .6 + rnd() * .7 })); f.chips = Array.from({ length: 7 }, () => ({ a: rnd() * 6.28, v: .4 + rnd() * .6, s: rnd() })); }
  g.save(); g.lineJoin = 'round'; g.lineCap = 'round';
  if (q < .22) { const u = q / .22, r = (10 + 30 * u) * px, gr = g.createRadialGradient(cx, cy, r * .05, cx, cy, r);   /* the clap flash */
    gr.addColorStop(0, 'rgba(255,250,228,1)'); gr.addColorStop(.5, 'rgba(255,226,160,.55)'); gr.addColorStop(1, 'rgba(255,210,140,0)'); g.globalAlpha = 1 - u; g.fillStyle = gr; g.beginPath(); g.arc(cx, cy, r, 0, 7); g.fill(); }
  { const u = Math.min(1, q * 1.6); if (u < 1) { g.globalAlpha = (1 - u) * .6; g.strokeStyle = 'rgba(244,236,214,.9)'; g.lineWidth = 2.2 * px; g.beginPath(); g.ellipse(cx, cy, RX * .75 * u, RX * .75 * u * .32, 0, 0, 7); g.stroke(); } }   /* pressure ring at chest height */
  for (let j = 0; j < 8; j++) { const u = (q * 2.2 + j / 8) % 1, sd = j % 2 ? 1 : -1, an = (sd > 0 ? 0 : Math.PI) + ((j >> 1) - 1.5) * .22, r0 = 7 * px, r1 = r0 + (10 + 24 * u) * px; g.globalAlpha = (1 - u) * out;   /* jagged shock lines out of the clap, sideways */
    g.beginPath(); for (let i = 0; i <= 4; i++) { const rr = r0 + (r1 - r0) * i / 4, jit = (i % 2 ? 1 : -1) * 1.6 * px; g.lineTo(cx + Math.cos(an) * rr - Math.sin(an) * jit, cy + Math.sin(an) * rr * .6 + Math.cos(an) * jit); }
    g.lineWidth = 1.5 * px; g.strokeStyle = '#fff3c4'; g.stroke(); }
  for (let j = 0; j < 3; j++) { const u = Math.min(1, Math.max(0, q * 1.5 - j * .18)); if (u <= 0 || u >= 1) continue; const w = f.wob[j];   /* ground rings */
    g.globalAlpha = (1 - u) * .9; g.beginPath(); for (let i = 0; i <= 48; i++) { const an = i / 48 * Math.PI * 2, rr = RX * u * (1 + w.amp * Math.sin(an * w.fq + w.ph + q * 18)), x = p.x + Math.cos(an) * rr, y = p.y + Math.sin(an) * rr * .5; i ? g.lineTo(x, y) : g.moveTo(x, y); }
    g.lineWidth = (3.2 - j * .6) * px; g.strokeStyle = j === 1 ? 'rgba(214,150,92,.85)' : 'rgba(236,226,200,.85)'; g.stroke();
    for (const d of f.dust) { const x = p.x + Math.cos(d.a) * RX * u, y = p.y + Math.sin(d.a) * RX * u * .5 - 2 * px, r = (2.2 + 2.4 * d.s) * px, gr = g.createRadialGradient(x - r * .3, y - r * .4, r * .1, x, y, r);
      gr.addColorStop(0, '#e6d8bd'); gr.addColorStop(1, '#a8916c'); g.globalAlpha = (1 - u) * .7; g.fillStyle = gr; g.beginPath(); g.arc(x, y, r, 0, 7); g.fill(); } }
  for (const c of f.chips) { const e = 1 - (1 - q) * (1 - q), r = RX * .8 * e * c.v, h = Math.sin(Math.PI * Math.min(1, q * 1.4)) * H * .3 * c.v; g.globalAlpha = Math.min(1, out * 1.5) * .9;   /* a few chips of ground flung up */
    g.fillStyle = c.s < .5 ? '#9b8566' : '#6e5d48'; g.beginPath(); g.arc(p.x + Math.cos(c.a) * r, p.y + Math.sin(c.a) * r * .5 - h, (1.4 + 1.2 * c.s) * px, 0, 7); g.fill(); }
  g.restore();
}
function drawHitFx() {
  const tw = TWs(), H = CHAR_H * tw;
  for (let i = hitFx.length - 1; i >= 0; i--) { const f = hitFx[i], q = (tick - f.t0) / FX_DUR[f.k]; if (q > 1) { hitFx.splice(i, 1); continue; } fxDraw(ctx, f, q, project(f.w.x, f.w.y), tw, H); }
}
const SPIT_COL = ['#7cc242', '#8e4fb0', '#6b4a2b', '#a6d94a'], ROCK_COL = ['#8a7f72', '#6e655b', '#a39a8c', '#7a7066'];   /* 3D.126 the Thrower's rubble */   /* green, purple and brown mucus */
function drawSpits() {   /* 3D.35: an arcing glob with a dripping trail; a splat where it lands */
  const tw = TWs() * .55, H = CHAR_H * TWs();
  for (let i = spits.length - 1; i >= 0; i--) {
    const g = spits[i], k = (tick - g.t0) / g.dur, a = project(g.a.x, g.a.y), b = project(g.b.x, g.b.y);
    if (k >= 1) { if (!g.splat) { g.splat = tick; g.drops = Array.from({ length: 7 }, (_, j) => ({ a: rnd() * 6.28, v: .5 + rnd(), c: (g.rock ? ROCK_COL : SPIT_COL)[j % 3] })); } const q = (tick - g.splat) / 40; if (q > 1) { spits.splice(i, 1); continue; }
      ctx.save(); ctx.globalAlpha = 1 - q; ctx.fillStyle = g.rock ? 'rgba(120,105,90,.45)' : 'rgba(110,170,50,.55)'; ctx.beginPath(); ctx.ellipse(b.x, b.y, (8 + 10 * Math.min(1, q * 3)) * tw / 40, (4 + 5 * Math.min(1, q * 3)) * tw / 40, 0, 0, 7); ctx.fill();
      for (const d of g.drops) { const r = Math.min(1, q * 2.5) * 16 * d.v * tw / 40; ctx.fillStyle = d.c; ctx.beginPath(); ctx.arc(b.x + Math.cos(d.a) * r, b.y - H * .35 + Math.sin(d.a) * r * .5 + q * q * H * .4, Math.max(1, 2.6 * tw / 40 * (1 - q * .5)), 0, 7); ctx.fill(); } ctx.restore(); continue; }
    const pt = (u) => ({ x: a.x + (b.x - a.x) * u, y: a.y + (b.y - a.y) * u - H * (.7 - .38 * u) - Math.sin(Math.PI * u) * H * .45 });   /* 3D.36: from the mouth */
    ctx.save();
    for (let j = 6; j >= 1; j--) { const u = Math.max(0, k - j * .045), p = pt(u); ctx.globalAlpha = .75 - j * .1; ctx.fillStyle = (g.rock ? ROCK_COL : SPIT_COL)[(j + ((g.seed * 4) | 0)) % 3]; ctx.beginPath(); ctx.arc(p.x, p.y + j * .6, Math.max(1, (4.2 - j * .45) * tw / 40), 0, 7); ctx.fill(); }
    const p = pt(k), r = 6 * tw / 40; ctx.globalAlpha = 1; ctx.fillStyle = g.rock ? '#8a7f72' : '#6fb53a'; ctx.beginPath(); ctx.ellipse(p.x, p.y, r * 1.15, r, Math.atan2(b.y - a.y, b.x - a.x), 0, 7); ctx.fill();
    ctx.fillStyle = '#8e4fb0'; ctx.beginPath(); ctx.arc(p.x - r * .35, p.y + r * .2, r * .45, 0, 7); ctx.fill(); ctx.fillStyle = '#6b4a2b'; ctx.beginPath(); ctx.arc(p.x + r * .4, p.y - r * .25, r * .32, 0, 7); ctx.fill();
    ctx.fillStyle = 'rgba(255,255,255,.7)'; ctx.beginPath(); ctx.arc(p.x - r * .4, p.y - r * .45, r * .22, 0, 7); ctx.fill(); ctx.restore();
  }
}
function drawZombie(zm) {
  const p = project(zm.w.x, zm.w.y), tw = TWs();
  if (zm.type === 'raider') {   /* raiders: the survivor rig in raider gear, with their weapon */
    if (!zm.look) zm.look = { sex: rnd() < .3 ? 'f' : 'm', skin: Math.floor(rnd() * 4), hair: Math.floor(rnd() * 8) };
    if (!zm.wpn) zm.wpn = ['bat', 'knife', 'crowbar', 'pistol', 'machete'][Math.floor(rnd() * 5)];
    zm.eq = { weapon: zm.wpn };
    const top = p.y - CHAR_H * tw - 3; hitSpark(zm, p); hpPill(zm, p.x, top - HUD_LIFT * hudU(), { col: '#f6c445' });
    if (zm.carried) stampText('⚙' + zm.carried, p.x, top - 4, `600 ${Math.round(14 * .95 * hudU())}px Fredoka, Nunito, sans-serif`, '#ffe06b');
    return;
  }
  if (zm.dead != null) return; const top = p.y - CHAR_H * TWs() * (ZSCALE[zm.type] || 1);
  { const u = hudU();   /* 3D.32 new-zombie effects */
    if (zm.type === 'burnt') { ctx.save(); for (let i = 0; i < 5; i++) { const t = ((tick + i * 23 + (zm.phase || 0) * 9) % 70) / 70, x = p.x + Math.sin(i * 2.3 + tick / 20) * 8 * u, y = p.y - t * CHAR_H * TWs() * 1.1; ctx.globalAlpha = 1 - t; ctx.fillStyle = t < .5 ? '#FFB347' : '#FF6A2A'; ctx.beginPath(); ctx.arc(x, y, (2.6 - t * 1.6) * u, 0, 7); ctx.fill(); } ctx.restore(); }
    if (zm.zoo) { const d = zombieTypes[zm.type] || {}, nm = zm.bk && BOSS_KINDS[zm.bk] ? BOSS_KINDS[zm.bk].name : d.name || zm.type, y = top - (zm.type === 'boss' || zm.type === 'alpha' ? 40 : 28) * u; ctx.save(); ctx.font = `800 ${Math.round(12 * u)}px Manrope, sans-serif`; const tw2 = ctx.measureText(nm).width + 16 * u + (d.isNew ? 34 * u : 0), h = 20 * u;
      ctx.beginPath(); ctx.roundRect(p.x - tw2 / 2, y - h, tw2, h, h / 2); ctx.fillStyle = 'rgba(16,22,28,.78)'; ctx.fill(); ctx.strokeStyle = 'rgba(255,255,255,.25)'; ctx.lineWidth = 1; ctx.stroke(); ctx.fillStyle = '#fff'; ctx.textAlign = 'left'; ctx.textBaseline = 'middle'; ctx.fillText(nm, p.x - tw2 / 2 + 8 * u, y - h / 2);
      if (d.isNew) { const bx = p.x + tw2 / 2 - 32 * u; ctx.beginPath(); ctx.roundRect(bx, y - h + 3 * u, 26 * u, h - 6 * u, 7 * u); ctx.fillStyle = '#C6FF4D'; ctx.fill(); ctx.fillStyle = '#14200A'; ctx.font = `800 ${Math.round(9 * u)}px Manrope, sans-serif`; ctx.fillText('NEW', bx + 3.5 * u, y - h / 2); } ctx.restore(); }
  }
  if (zm.type === 'alpha') { const u = hudU(), bt = hpPill(zm, p.x, top - (HUD_LIFT + 6) * u, { col: '#e8453c', w: 70 }); if (!zm.zoo) hudText('ALPHA', p.x, bt - 4 * u, `800 ${Math.round(14 * u)}px Manrope, sans-serif`, '#ffd0c8', '#3a0d08', 3.5 * u); return; }
  if ((zm.zoo)) { hpPill(zm, p.x, top - 3 - HUD_LIFT * hudU(), { zed: true, w: zm.type === 'boss' ? 70 : 34 }); return; }
  if (zm.type === 'boss') {
    { const u = hudU(), bt = hpPill(zm, p.x, top - (HUD_LIFT + 6) * u, { col: '#e8453c', w: 70 }); hudText('BOSS', p.x, bt - 4 * u, `600 ${Math.round(14 * u)}px Fredoka, sans-serif`, '#f2c8ff', '#5a3f31', 3.5 * u); return; }
  }
  hitSpark(zm, p); if (!engaged(zm)) return;   /* V2.37: HP bar only once it is hurt or fighting someone */
  hpPill(zm, p.x, top - 3 - HUD_LIFT * hudU(), { zed: true, w: 34 }); return;
}

/* ---------------- main draw ---------------- */
const TREE_SPOTS = [[0, 2], [2, 2], [4, 3], [7, 2], [10, 3], [13, 2], [15, 4], [0, 7], [1, 11], [0, 15], [1, 18], [4, 19], [7, 19], [10, 19], [13, 18], [15, 16], [15, 11], [14, 7], [1, 4], [13, 4], [1, 17], [14, 18],
  /* V3D.22: choppable trees in the outer land too */ [17, 3], [19, 6], [21, 2], [24, 5], [26, 9], [18, 12], [22, 14], [26, 17], [17, 21], [20, 23], [24, 22], [26, 26], [3, 23], [7, 26], [12, 24], [15, 27], [19, 27], [23, 28], [17, 8], [20, 18]].map(SH);
const CRATE_SPOTS = [[1, 6], [14, 13], [2, 19], [13, 5], [0, 12]].map(SH);
const CAR_SPOTS = [[0, 4], [10, 0]].map(SH);
/* V2.32: wreckage scattered over the land that isn't unlocked yet (assets/map/v7/wreck.png); it clears as the territory grows */
let wreckKey = '', wreckList = [];
function wreckSpots() {
  const k = curMap + Wd.BUILD.x0 + ',' + Wd.BUILD.y0 + ',' + Wd.BUILD.x1 + ',' + Wd.BUILD.y1 + '#' + world.roads.size; if (k === wreckKey) return wreckList;
  const taken = new Set([...TREE_SPOTS, ...CRATE_SPOTS, ...CAR_SPOTS, ...DEBRIS_SPOTS].map(([x, y]) => x + ',' + y)); wreckKey = k; wreckList = [];
  for (let y = 0; y < ROWS; y++) for (let x = 0; x < COLS; x++) {
    if (Wd.inTown(x, y) || Wd.isRoad(world, x, y) || taken.has(x + ',' + y)) continue;
    if (Wd.inTown(x - 1, y) || Wd.inTown(x + 1, y) || Wd.inTown(x, y - 1) || Wd.inTown(x, y + 1)) continue;   // keep a clear strip along the border
    if (hash2(x * 7 + 1, y * 13 + 5) < (MAPS[curMap].wreck ?? .11)) wreckList.push([x, y]);
  }
  return wreckList;
}

const DEBRIS_SPOTS = [[3, 3], [6, 3], [9, 2], [12, 3], [1, 8], [14, 9], [0, 17], [5, 18], [11, 18], [15, 6], [15, 18]].map(SH);
function draw() {
  ctx.setTransform(DPR, 0, 0, DPR, 0, 0);
  ctx.clearRect(0, 0, VW, VH); if (window.ZH3D) ZH3D.frame(); if (S.sh && S.sh.view) { shDraw(); return; }
  if ((!(window.ZH3D && ZH3D.ready))) {   /* 3D.76: say the world is still loading (big model files on a phone connection) instead of an empty screen */
    const t0 = draw.t0 || (draw.t0 = performance.now()), sec = Math.round((performance.now() - t0) / 1000);
    ctx.fillStyle = '#10241f'; ctx.fillRect(0, 0, VW, VH); ctx.textAlign = 'center'; ctx.fillStyle = '#e8f0e0'; ctx.font = '600 20px Fredoka, sans-serif';
    ctx.fillText('Loading the world…', VW / 2, VH / 2); ctx.font = '500 15px Fredoka, sans-serif'; ctx.fillStyle = '#a9b8a4';
    ctx.fillText(sec < 40 ? `${sec} s` : 'Still loading: check your connection, or close and reopen the game', VW / 2, VH / 2 + 26); ctx.textAlign = 'start';
  }
  /* V2.18: the build-zone outline is baked into the ground image (stroking it every frame was ~half the frame time) */
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
    if ((preview) && sel.kind === 'building') entranceArrow(preview);
  }
  drawTileConfirm();
  for (const p of S.posts || []) if ((sel && sel.kind === 'post') || (selected && selected.kind === 'post' && selected.ref === p)) drawPostRange(p, !!(selected && selected.ref === p));
  const items = [];
  const box = (x, y, r) => ({ x1: x - r, y1: y - r, x2: x + r, y2: y + r });
  /* V2.36: only what is on screen is drawn and depth-sorted (props and wreckage off screen were ~60% of the frame) */
  const mg = TWs() * 2.6, vis = (wx, wy) => { const p = project(wx, wy); return p.x > -mg && p.x < VW + mg && p.y > -mg * .6 && p.y < VH + mg * 1.6; };
  world.buildings.forEach((b) => vis(b.x + b.w / 2, b.y + b.h / 2) && items.push({ x1: b.x, y1: b.y, x2: b.x + b.w, y2: b.y + b.h, fn: () => {   if (selected && selected.ref === b) selectRing(b); drawStaffBadge(b); } }));
  S.z.forEach((z) => { if (z.hp > 0 && vis(z.w.x, z.w.y)) items.push({ ...box(z.w.x, z.w.y, .12), fn: () => drawZombie(z) }); });
  S.sv.forEach((s) => vis(s.w.x, s.w.y) && items.push({ ...box(s.w.x, s.w.y, .12), fn: () => drawHuman(s) }));
  S.sv.forEach((s) => { if (!s.pet || s.mode === 'away' || insideBuilding(s)) return; const pp = petPos(s); items.push({ ...box(pp.w.x, pp.w.y, .06), fn: () => drawPet(s, pp) }); });
  if (S.trader) items.push({ ...box(S.trader.w.x, S.trader.w.y, .12), fn: drawTrader });
  Iso.sortDrawables(items).forEach((o) => o.fn());
  drawCombatFocus();  drawObjMarks(); drawAlertMarks(); drawOverview();
  for (let i = shots.length - 1; i >= 0; i--) if (--shots[i].t <= 0) shots.splice(i, 1);
  drawSpits(); drawHitFx();
  for (const c of S.crates || []) if (c.grab > 0 && !c.taken) { const p = project(c.w.x, c.w.y), u = hudU(), y = p.y - 40 * u;   /* V3D.17: prying the crate loose */
    ctx.save(); ctx.beginPath(); ctx.arc(p.x, y, 12 * u, 0, 7); ctx.fillStyle = '#fff8ec'; ctx.fill(); ctx.lineWidth = 2 * u; ctx.strokeStyle = '#5a3f31'; ctx.stroke(); ctx.lineWidth = 4 * u; ctx.lineCap = 'round'; ctx.strokeStyle = '#7fbf5a'; ctx.beginPath(); ctx.arc(p.x, y, 12 * u, -Math.PI / 2, -Math.PI / 2 + c.grab * Math.PI * 2); ctx.stroke(); ctx.restore();
    const im = window.ZHIcons && ZHIcons.img && ZHIcons.img('box'); if (im && im.complete) ctx.drawImage(im, p.x - 8 * u, y - 8 * u, 16 * u, 16 * u); }
  drawSites(); drawBagFx(); for (const f of floats) { if (!f.a0) { f.a0 = f.a; f.dx = Math.random() < .5 ? -1 : 1; } floatCozy(f, project(f.w.x, f.w.y)); } drawLevelUps();
  if (floats.length > 80) floats.splice(0, floats.length - 80);   /* a burst of numbers can't pile up */
  for (let i = floats.length - 1; i >= 0; i--) if (--floats[i].a <= 0) floats.splice(i, 1);
  if (debug) drawDebug();
}
/* 3D.104 phone overview mode (approved): zoomed out below ~55%, everyone shrinks to a dot, so icons take over: red dots for zombies, a skull
   for a boss, purple for raiders, green dots for people and a pulsing red cross for anyone down; arrows on the screen edge point to threats off screen */
const OV_Z = .55;
function drawOverview() {
  if (cam.z >= OV_Z || titleOn || S.cut) return; const t = performance.now() / 1000, on = (p) => p.x > 8 && p.x < VW - 8 && p.y > 60 && p.y < VH - 90, off = [];
  ctx.save(); ctx.lineWidth = 1.5;
  for (const q of S.sv) { if (q.hp <= 0 && q.mode !== 'down') continue; if (q.mode === 'away' || insideBuilding(q)) continue; const p = project(q.w.x, q.w.y);
    if (q.mode === 'down') { const r = 8 + 2 * Math.sin(t * 6); if (!on(p)) { off.push({ p, c: '#ff5a4a', ic: '✚' }); continue; } ctx.fillStyle = '#ff5a4a'; ctx.beginPath(); ctx.arc(p.x, p.y - 6, r, 0, 7); ctx.fill(); ctx.strokeStyle = '#fff'; ctx.stroke(); ctx.fillStyle = '#fff'; ctx.fillRect(p.x - 1.5, p.y - 11, 3, 10); ctx.fillRect(p.x - 5, p.y - 7.5, 10, 3); continue; }
    if (!on(p)) continue; ctx.fillStyle = q.hp < q.max * .4 ? '#f0a03a' : '#5fd068'; ctx.beginPath(); ctx.arc(p.x, p.y - 4, 3.6, 0, 7); ctx.fill(); ctx.strokeStyle = '#123'; ctx.stroke(); }
  for (const z of S.z) { if (z.hp <= 0 || z.mode === 'appear' || z.zoo) continue; const p = project(z.w.x, z.w.y), boss = z.type === 'boss', threat = boss || z.human || ['zchase', 'zattack', 'zbash', 'zbreak'].includes(z.mode);
    if (!on(p)) { if (threat) off.push({ p, c: boss ? '#ff3030' : z.human ? '#b07cff' : '#e0503c', ic: boss ? '☠' : z.human ? '⚔' : '!' }); continue; }
    if (boss) { ctx.fillStyle = 'rgba(200,30,30,.9)'; ctx.beginPath(); ctx.arc(p.x, p.y - 8, 11, 0, 7); ctx.fill(); ctx.strokeStyle = '#fff'; ctx.stroke(); ctx.fillStyle = '#fff'; ctx.font = '700 13px sans-serif'; ctx.textAlign = 'center'; ctx.fillText('☠', p.x, p.y - 3.5); continue; }
    ctx.fillStyle = z.human ? '#a070f0' : '#e0503c'; ctx.beginPath(); ctx.arc(p.x, p.y - 4, z.type === 'brute' ? 4.6 : 3.4, 0, 7); ctx.fill(); ctx.strokeStyle = '#2a0c08'; ctx.stroke(); }
  /* edge arrows: one per screen side bucket, with a count */
  const cx = VW / 2, cy = VH / 2, groups = new Map();
  for (const o of off) { const a = Math.atan2(o.p.y - cy, o.p.x - cx), k = Math.round(a / (Math.PI / 8)); const g = groups.get(k) || { a, n: 0, c: o.c, ic: o.ic }; g.n++; if (o.ic === '☠' || o.ic === '✚') { g.c = o.c; g.ic = o.ic; } groups.set(k, g); }
  for (const g of groups.values()) { const dx = Math.cos(g.a), dy = Math.sin(g.a), sx = (VW / 2 - 26) / Math.abs(dx || 1e-6), sy = (VH / 2 - 100) / Math.abs(dy || 1e-6), d = Math.min(sx, sy), x = cx + dx * d, y = cy + dy * d;
    ctx.save(); ctx.translate(x, y); ctx.rotate(g.a); ctx.fillStyle = g.c; ctx.beginPath(); ctx.moveTo(16, 0); ctx.lineTo(-6, -11); ctx.lineTo(-6, 11); ctx.closePath(); ctx.fill(); ctx.strokeStyle = '#fff'; ctx.stroke(); ctx.restore();
    ctx.fillStyle = '#fff'; ctx.font = '700 12px sans-serif'; ctx.textAlign = 'center'; ctx.fillText(g.ic + (g.n > 1 ? g.n : ''), x - dx * 2, y + 4); }
  ctx.restore(); ctx.textAlign = 'start';
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

/* V2.45 guard post pixel art, drawn in code on the 96-px-per-tile art grid: a sandbag ring around a pole, the flag coloured by the watch (blue night, gold day, red both) */
const POST_ART = new Map(), POST_FLAG = { night: ['#4f7fd0', '#2c4f8f'], day: ['#e8b73a', '#9c7418'], all: ['#d0503c', '#7e2a1d'] };
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

function drawPostRange(p, strong) {   /* the watch radius: zombies inside it go for the holder */
  ctx.beginPath(); for (let i = 0; i <= 40; i++) { const a = i / 40 * Math.PI * 2, q = project(p.x + .5 + Math.cos(a) * POST_R, p.y + .5 + Math.sin(a) * POST_R); if (i) ctx.lineTo(q.x, q.y); else ctx.moveTo(q.x, q.y); }
  ctx.fillStyle = strong ? 'rgba(120,170,255,.10)' : 'rgba(120,170,255,.05)'; ctx.fill(); ctx.setLineDash([6 * cam.z, 5 * cam.z]); ctx.strokeStyle = strong ? 'rgba(160,200,255,.85)' : 'rgba(160,200,255,.45)'; ctx.lineWidth = Math.max(1, 1.5 * cam.z); ctx.stroke(); ctx.setLineDash([]);
}
const FAM_ICON = { water: ['💧', '#6fb3e0'], farm: ['🍖', '#e0b84a'], scrap: ['⚙', '#8fc6d8'], research: ['🔬', '#a993e8'] };
const FAC_ICON = { medical: 'medic', kitchen: 'meal' }, TYPE_ICON = aliasT({ inn: 'bed', house: 'home', gym: 'train', library: 'guide', lounge: 'couple', range: 'train', track: 'train', sparring: 'train', armory: 'shield', storage: 'box', bonfire: 'fire', barracks: 'shield' });
function clayBadge(cx, cy, z, icon, dot, count) {   /* V3D.14 Clay marker: cream disc, cocoa outline, icon, optional status dot and count chip */
  const R2 = 10.5 * z, im = window.ZHIcons && ZHIcons.img(icon);
  ctx.beginPath(); ctx.arc(cx, cy + 2 * z, R2, 0, 7); ctx.fillStyle = 'rgba(79,61,51,.4)'; ctx.fill();
  ctx.beginPath(); ctx.arc(cx, cy, R2, 0, 7); ctx.fillStyle = '#fff8ec'; ctx.fill(); ctx.lineWidth = 2.4 * z; ctx.strokeStyle = '#5a3f31'; ctx.stroke();
  if (im && im.complete) ctx.drawImage(im, cx - 7.5 * z, cy - 7.5 * z, 15 * z, 15 * z);
  if (dot) { ctx.beginPath(); ctx.arc(cx + R2 * .8, cy - R2 * .8, 4.2 * z, 0, 7); ctx.fillStyle = dot; ctx.fill(); ctx.lineWidth = 2 * z; ctx.stroke(); }
  if (count) { const tx = String(count), w = (7 + 6 * tx.length) * z, x0 = cx - R2 - w + 3 * z, y0 = cy - 7 * z; ctx.beginPath(); ctx.roundRect(x0, y0, w, 14 * z, 7 * z); ctx.fillStyle = '#fff8ec'; ctx.fill(); ctx.lineWidth = 2 * z; ctx.stroke(); hudText(tx, x0 + w / 2, y0 + 11 * z, `600 ${Math.round(11 * z)}px Fredoka, sans-serif`, '#5a3f31'); }
}
function drawStaffBadge(b) {   /* V2.36 building status: producers get a ring that fills with real output toward the next unit (bright while worked);
   facilities show how many are inside; problems get a marker. Everything comes from the simulation state. */
  const d = DEFS[b.type], r = { anchor: project(b.x + b.w, b.y + b.h) }; if (!d) return;
  if (b.burnt) { if ((r.anchor)) { const z = Math.max(.75, cam.z) * .8, pul = 1 + .1 * Math.sin(tick / 6); clayBadge(r.anchor.x, r.anchor.y - TWs() * (b.w + b.h) * .5 * .62 - 20 * z, z * pul, 'wrench', '#e8584a', 0); } return; }   /* 3D.30: wrecked buildings show a pulsing repair marker */
  const z = Math.max(.75, cam.z) * ((.7)), cx = r.anchor.x, cy = r.anchor.y - TWs() * (b.w + b.h) * .5 * .62, fi = FAM_ICON[d.fam], R = 9 * z;   /* V3D.21: cozy markers 30% smaller */
  {   /* V3D.17 fewer markers: a building shows nothing unless it needs you (under attack, damaged, no worker, dry, unpaid), is selected, or you zoom right in */
    const hp = bHp(b), hit = tick - (b.lastHit || -9999) < 240, sel = selected && selected.ref === b, prob = (d.slot && !b.staff) || (d.fam === 'farm' && b.dry) || b.unpaid;
    if (hit || hp < b.max) { const w = 46 * z, h = 7 * z, y = cy + 2 * z; ctx.save(); ctx.beginPath(); ctx.roundRect(cx - w / 2, y, w, h, h / 2); ctx.fillStyle = '#fff8ec'; ctx.fill(); ctx.lineWidth = 2 * z; ctx.strokeStyle = '#5a3f31'; ctx.stroke();
      const k = hp / b.max; ctx.beginPath(); ctx.roundRect(cx - w / 2 + 1.5 * z, y + 1.5 * z, Math.max(0, (w - 3 * z) * k), h - 3 * z, (h - 3 * z) / 2); ctx.fillStyle = k > .5 ? '#7fbf5a' : k > .25 ? '#f2b84a' : '#e8584a'; ctx.fill(); ctx.restore(); }
    { const inside = S.sv.filter((q) => insideBuilding(q) === b).length, dmg = hp < b.max, by = cy - 27 * z;   /* V3D.21: who is inside, and that it needs repair, at a glance */
      if (inside) clayBadge(cx - (dmg ? 13 : 0) * z, by, z, 'people', null, inside);
      if (dmg) clayBadge(cx + (inside ? 13 : 0) * z, by, z, 'wrench', hp < b.max * .5 ? '#e8584a' : '#f2c14e', 0); }
    if (hit && occupied(b)) { const pulse = 1 + .08 * Math.sin(tick / 5), w = 40 * z * pulse, h = 20 * z * pulse, y = cy - 50 * z; ctx.save(); ctx.beginPath(); ctx.roundRect(cx - w / 2, y - h / 2, w, h, h / 2); ctx.fillStyle = '#e8584a'; ctx.fill(); ctx.lineWidth = 2.4 * z; ctx.strokeStyle = '#5a3f31'; ctx.stroke(); hudText('SOS', cx, y + 5 * z * pulse, `800 ${Math.round(13 * z * pulse)}px Nunito, sans-serif`, '#fff8ec'); ctx.restore(); return; }
    if ((!hit) && !b.burnt) drawBonus(b, cx, cy, z);   /* 3D.28 tap-to-collect bubble */
    if (hit || (!sel && !prob && cam.z < 1.7)) return;
  }
  ctx.save();
  if ((fi) && window.ZHIcons) {   /* V3D.14 Clay badge: cream disc, cocoa outline, a progress ring in the resource colour, a status dot */
    const on = isWorking(b), R2 = 11 * z, im = ZHIcons.img({ water: 'water', farm: 'food', scrap: 'parts', research: 'research' }[d.fam]);
    ctx.beginPath(); ctx.arc(cx, cy + 2 * z, R2, 0, 7); ctx.fillStyle = 'rgba(79,61,51,.4)'; ctx.fill();
    ctx.beginPath(); ctx.arc(cx, cy, R2, 0, 7); ctx.fillStyle = '#fff8ec'; ctx.fill(); ctx.lineWidth = 2.4 * z; ctx.strokeStyle = '#5a3f31'; ctx.stroke();
    ctx.lineCap = 'round'; ctx.lineWidth = 3 * z; ctx.strokeStyle = on ? fi[1] : '#d8c4a6'; ctx.beginPath(); ctx.arc(cx, cy, R2 + 3.2 * z, -Math.PI / 2, -Math.PI / 2 + Math.PI * 2 * Math.max(.02, Math.min(1, b.acc || 0))); ctx.stroke(); ctx.lineCap = 'butt';
    if (im && im.complete) ctx.drawImage(im, cx - 8 * z, cy - 8 * z, 16 * z, 16 * z);
    if (d.slot) { ctx.beginPath(); ctx.arc(cx + R2 * .8, cy - R2 * .8, 4.2 * z, 0, 7); ctx.fillStyle = b.staff ? (on ? '#7cc95a' : '#a9c49f') : '#f2c14e'; ctx.fill(); ctx.lineWidth = 2 * z; ctx.strokeStyle = '#5a3f31'; ctx.stroke(); }
    if ((d.fam === 'farm' && b.dry) || b.unpaid) hudText(b.unpaid ? '½' : '!', cx + R2 * 1.9, cy + 5 * z, `600 ${Math.round(14 * z)}px Fredoka, sans-serif`, '#e8574a', '#fff8ec', 3 * z);
  } else if (fi) {
    const on = isWorking(b); ctx.beginPath(); ctx.arc(cx, cy, R, 0, 7); ctx.fillStyle = 'rgba(16,24,18,.82)'; ctx.fill();
    ctx.lineWidth = 3 * z; ctx.strokeStyle = 'rgba(255,255,255,.14)'; ctx.beginPath(); ctx.arc(cx, cy, R - 1.5 * z, 0, 7); ctx.stroke();
    ctx.strokeStyle = on ? fi[1] : 'rgba(200,190,160,.55)'; ctx.beginPath(); ctx.arc(cx, cy, R - 1.5 * z, -Math.PI / 2, -Math.PI / 2 + Math.PI * 2 * Math.min(1, b.acc || 0)); ctx.stroke();
    stampText(fi[0], cx, cy + 4.5 * z, `${Math.round(10 * z)}px sans-serif`, '#fff');
    if (d.slot) { ctx.beginPath(); ctx.arc(cx + R * .78, cy - R * .78, 3.6 * z, 0, 7); ctx.fillStyle = b.staff ? (on ? '#4fd36a' : '#2f8f48') : 'rgba(240,176,48,.95)'; ctx.fill(); ctx.lineWidth = 1.2; ctx.strokeStyle = '#102418'; ctx.stroke(); }
    if ((d.fam === 'farm' && b.dry) || b.unpaid) stampText(b.unpaid ? '½' : '💧✗', cx + R * 1.9, cy + 4 * z, `bold ${Math.round(11 * z)}px sans-serif`, '#ff9a84');
  } else if ((window.ZHIcons) && (d.slot || facilityRules[b.type] || TYPE_ICON[b.type])) {   /* V3D.14: Clay markers for medical, canteen, inn, houses, training */
    const icon = FAC_ICON[d.fam] || TYPE_ICON[b.type] || 'person', n = d.fam === 'medical' ? S.sv.filter((q) => q.mode === 'hospital' && (q.careAt === b || (!q.careAt && medSite() === b))).length : S.sv.filter((q) => q.facility === b && q.mode === 'useFacility').length;
    const sl = (isT(b, 'house') || isT(b, 'inn')) && S.sv.some((q) => q.facility === b && q.sleeping);
    clayBadge(cx, cy, z, sl ? 'sleep' : icon, d.slot ? (b.staff ? (isWorking(b) ? '#7cc95a' : '#a9c49f') : '#f2c14e') : null, n || 0);
    ctx.restore(); return;
  } else if (d.slot) {   // staffed non-producers (medical, kitchen): the old dot
    if (d.fam === 'medical') { const n = S.sv.filter((q) => q.mode === 'hospital' && (q.careAt === b || (!q.careAt && medSite() === b))).length; if (n) stampText(`✚${n}`, cx + 14 * z, cy + 4 * z, `600 ${Math.round((Math.round(12 * z)) * .85)}px Fredoka, Nunito, sans-serif`, '#ff9a9a'); }
    ctx.beginPath(); ctx.arc(cx, cy, 5.5 * z, 0, 7); ctx.fillStyle = b.staff ? (isWorking(b) ? '#4fd36a' : '#2f8f48') : 'rgba(240,176,48,.9)'; ctx.fill(); ctx.lineWidth = 1.5; ctx.strokeStyle = '#102418'; ctx.stroke();
  }
  if (facilityRules[b.type]) { const n = S.sv.filter((q) => q.facility === b && q.mode === 'useFacility').length; if (n > 0) { const sl = isT(b, 'house') && S.sv.some((q) => q.facility === b && q.sleeping); stampText(`${sl ? '💤' : '👤'}${n}`, cx + (fi || d.slot ? -R * 1.9 : 0), cy + 4 * z, `600 ${Math.round((Math.round(11 * z)) * .85)}px Fredoka, Nunito, sans-serif`, '#fff3c4'); } }
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
  Civilian: { combat: 0, med: 0, scav: 0, facility: 0, master: 40, next: ['Guard', 'Medic', 'Scavenger', 'Mechanic'], skill: 'Adaptable' },
  Guard: { combat: 3, med: 0, scav: 0, facility: 0, master: 60, next: ['Police Officer'], skill: 'Threat Response' },
  Medic: { combat: 0, med: 4, scav: 0, facility: 1, master: 60, next: [], skill: 'Field Aid' },
  Scavenger: { combat: 1, med: 0, scav: 4, facility: 0, master: 60, next: [], skill: 'Loot Sense' },
  'Police Officer': { combat: 3, med: 0, scav: 1, facility: 0, master: 80, next: [], skill: 'Armed Response' },   /* 3D.67 profession balance: +5 -> +3; ranged and raid specialist instead (Mechanic, Paramedic and SWAT removed for now) */
  Engineer: { combat: 1, med: 0, scav: 2, facility: 7, master: 100, next: [], skill: 'Facility Expert' },
  Farmer: { combat: 0, med: 0, scav: 1, facility: 2, master: 60, next: [], skill: 'Green Thumb' },
  Cook: { combat: 0, med: 0, scav: 0, facility: 3, master: 60, next: [], skill: 'Hearty Meals' },
  Mechanic: { combat: 1, med: 0, scav: 1, facility: 4, master: 80, next: [], skill: 'Grease Monkey' },   /* 3D.77: back: runs the Generator, Fuel Still, Ammo Bench and Factory, and the Electric Pump */
};
const facilityRules = aliasT({   // V2.6: no prices. Survivors are fed by the daily ration; visits relieve the need meters (food/water/medicine must be in stock to help).
  canteen: { need: 'hunger', use: 145, sat: 2, benefit: 26, label: 'Eating' },
  house: { need: 'fatigue', use: 175, sat: 1, benefit: 34, label: 'Resting' },
  inn: { need: 'fatigue', use: 175, sat: 1, benefit: 34, label: 'Resting' },   /* V3D.12 */
  hq: { need: 'fatigue', use: 175, sat: 0, benefit: 26, label: 'Sleeping at the Camp' }, hq2: { need: 'fatigue', use: 175, sat: 0, benefit: 28, label: 'Sleeping at the Lodge' }, hq3: { need: 'fatigue', use: 175, sat: 0, benefit: 30, label: 'Sleeping at the Fort' },   /* 3D.30 */
  medic: { need: 'injury', use: 190, sat: 2, benefit: 34, label: 'Treatment' },
  cabin: { need: 'fatigue', use: 165, sat: 1, benefit: 38, label: 'Resting' },
  stonehouse: { need: 'fatigue', use: 155, sat: 2, benefit: 44, label: 'Resting' },
  barrel: { need: 'thirst', use: 100, sat: 1, benefit: 24, label: 'Drinking' },
  irrig: { need: 'hunger', use: 100, sat: 1, benefit: 26, label: 'Getting food' },
  mess: { need: 'hunger', use: 135, sat: 3, benefit: 32, label: 'Eating' },
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
});
const RATION_BASE = { Civilian: 1, Farmer: 1, Medic: 1, Engineer: 1.25, Mechanic: 1.25, Guard: 1.5, 'Police Officer': 1.5, Scavenger: 1.5 };
const LEVEL_CAP = 10;   /* V2.16: DV2-style, levels 6-10 need much more XP */
/* V2.12: per-profession levels (like DV2). Each survivor keeps a level + XP for every profession they have worked
   (s.cls[job] = { l, xp }); s.l / s.mastery always mirror the current job. Reaching Lv.3 and Lv.5 in a profession
   teaches a skill that stays with the survivor for good, whatever job they do later. */
const CLASS_LIST = ['Civilian', 'Guard', 'Police Officer', 'Medic', 'Scavenger', 'Engineer', 'Mechanic', 'Cook', 'Farmer'];
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
  tinkerer: { name: 'Tinkerer', from: 'Mechanic', at: 3, desc: '+25% fuel and ammo made at the building they staff' },
  fuelSaver: { name: 'Fuel Saver', from: 'Mechanic', at: 5, desc: 'A Generator they run burns half the fuel (not a quarter less)' },
  jackOfAll: { name: 'Jack of All Trades', from: 'Civilian', at: 10, desc: '+1 to every stat' },
  bulwark: { name: 'Bulwark', from: 'Guard', at: 10, desc: 'Takes 15% less damage, +20 max HP' },
  marksman: { name: 'Marksman', from: 'Police Officer', at: 10, desc: 'Ranged weapons hit 25% harder' },
  miracleWorker: { name: 'Miracle Worker', from: 'Medic', at: 10, desc: 'Heals 3× faster outside combat; patients they rescue recover 30% faster' },
  treasureHunter: { name: 'Treasure Hunter', from: 'Scavenger', at: 10, desc: 'Expeditions find 20% more and gear twice as often' },
  masterBuilder: { name: 'Master Builder', from: 'Engineer', at: 10, desc: 'Halves upkeep of the building they staff; +20% research' },
  headChef: { name: 'Head Chef', from: 'Cook', at: 10, desc: 'Meals +30% at any Canteen they staff' },
  harvestMaster: { name: 'Harvest Master', from: 'Farmer', at: 10, desc: '+30% output at any food building they staff' },
  gearhead: { name: 'Gearhead', from: 'Mechanic', at: 10, desc: 'The Generator they run gives 2 more power' },
};
const hasSkill = (s, k) => !!(s.skills && s.skills.includes(k));
/* ---------------- V2.14: survivor stats (DV2 + Fallout SPECIAL) and equipment ---------------- */
const STATS = ['str', 'end', 'agi', 'per', 'int', 'cha'];
const STAT_NAME = { str: 'Strength', end: 'Endurance', agi: 'Agility', per: 'Perception', int: 'Intelligence', cha: 'Charisma' };
const STAT_CAP = 20;
const JOB_STATS = { Civilian: ['cha', 'int'], Guard: ['str', 'end'], 'Police Officer': ['per', 'end'], Medic: ['int', 'cha'], Scavenger: ['agi', 'per'], Engineer: ['int', 'str'], Cook: ['cha', 'end'], Farmer: ['str', 'end'], Mechanic: ['int', 'str'], Paramedic: ['int', 'agi'], SWAT: ['per', 'str'] };
const ITEMS = {   // V3D.16 balanced set (tools/balance: sim of the game's own combat formulas). atk per hit; rate x attack cycle (lower = faster);
  // guns: range in tiles, mag rounds, reload seconds (real-gun-like); def = damage cut 3% a point (armor + hat, cap 60%). Balance table: docs/EQUIPMENT.md
  pipe: { name: "Lead Pipe", slot: "weapon", kind: "blunt", atk: 5, rate: 0.95, cost: 1 },
  knife: { name: "Kitchen Knife", slot: "weapon", kind: "blade", atk: 1, rate: 0.7, cost: 2 },
  bat: { name: "Baseball Bat", slot: "weapon", kind: "blunt", atk: 16, rate: 1.0, cost: 4 },
  crowbar: { name: "Crowbar", slot: "weapon", kind: "blunt", atk: 20, rate: 0.95, cost: 5 },
  nailbat: { name: "Nail Bat", slot: "weapon", kind: "blunt", atk: 20, rate: 0.92, cost: 6 },
  machete: { name: "Machete", slot: "weapon", kind: "blade", atk: 14, rate: 0.8, cost: 6 },
  spear: { name: "Scrap Spear", slot: "weapon", kind: "blade", atk: 27, rate: 1.05, cost: 7, st: { per: 1 } },
  axe: { name: "Fire Axe", slot: "weapon", kind: "blade", atk: 32, rate: 1.15, cost: 9, st: { agi: -1 } },
  sledge: { name: "Sledgehammer", slot: "weapon", kind: "blunt", atk: 36, rate: 1.45, cost: 11, st: { agi: -2 } },
  katana: { name: "Katana", slot: "weapon", kind: "blade", atk: 32, rate: 0.7, cost: 15 },
  pistol: { name: "Pistol", slot: "weapon", kind: "gun", atk: 7, rate: 1.05, range: 3.4, mag: 12, reload: 1.8, cost: 8, ranged: true },
  revolver: { name: "Revolver", slot: "weapon", kind: "gun", atk: 16, rate: 1.36, range: 3.6, mag: 6, reload: 3.0, cost: 10, ranged: true },
  shotgun: { name: "Shotgun", slot: "weapon", kind: "gun", atk: 34, rate: 1.68, range: 2.4, mag: 6, reload: 4.5, cost: 13, ranged: true, st: { agi: -1 } },
  smg: { name: "SMG", slot: "weapon", kind: "gun", atk: 1, rate: 0.73, range: 3.6, mag: 30, reload: 2.5, cost: 13, ranged: true },
  rifle: { name: "Hunting Rifle", slot: "weapon", kind: "gun", atk: 30, rate: 1.64, range: 4.8, mag: 5, reload: 3.0, cost: 12, ranged: true },
  assault: { name: "Assault Rifle", slot: "weapon", kind: "gun", atk: 8, rate: 0.74, range: 4.4, mag: 30, reload: 2.6, cost: 18, ranged: true },
  bow: { name: "Hunting Bow", slot: "weapon", kind: "bow", atk: 18, rate: 1.6, range: 4.2, cost: 7, ranged: true, st: { per: 1 } },
  crossbow: { name: "Crossbow", slot: "weapon", kind: "bow", atk: 34, rate: 2.5, range: 4.6, mag: 1, reload: 2.4, cost: 11, ranged: true },
  jacket: { name: "Work Jacket", slot: "armor", def: 2, cost: 2 },
  leather: { name: "Leather Jacket", slot: "armor", def: 4, cost: 4 },
  hockey: { name: "Hockey Pads", slot: "armor", def: 5, cost: 5, st: { agi: -1 } },
  biker: { name: "Biker Leathers", slot: "armor", def: 5, cost: 6, st: { cha: 1 } },
  riot: { name: "Riot Vest", slot: "armor", def: 7, cost: 7, st: { agi: -1 } },
  kevlar: { name: "Kevlar Vest", slot: "armor", def: 8, cost: 10 },
  military: { name: "Military Armor", slot: "armor", def: 11, cost: 14, st: { agi: -1 } },
  plate: { name: "Scrap Plate", slot: "armor", def: 10, cost: 11, st: { agi: -2 } },
  gloves: { name: "Lifting Gloves", slot: "acc", cost: 3, st: { str: 2 } },
  belt: { name: "Back Brace", slot: "acc", cost: 3, st: { end: 2 } },
  shoes: { name: "Running Shoes", slot: "acc", cost: 3, st: { agi: 2 } },
  goggles: { name: "Scope Goggles", slot: "acc", cost: 5, st: { per: 2 } },
  glasses: { name: "Reading Glasses", slot: "acc", cost: 3, st: { int: 2 } },
  charm: { name: "Lucky Charm", slot: "acc", cost: 3, st: { cha: 2 } },
  dogtags: { name: "Dog Tags", slot: "acc", cost: 6, st: { str: 1, end: 1, per: 1 } },
  bandana: { name: "Bandana", slot: "head", def: 0, cost: 1, st: { cha: 1 }, shape: "bandana" },
  cap: { name: "Baseball Cap", slot: "head", def: 0, cost: 3, st: { per: 1 }, shape: "cap" },
  beanie: { name: "Beanie", slot: "head", def: 0, cost: 2, st: { end: 1 }, shape: "beanie" },
  strawhat: { name: "Straw Hat", slot: "head", def: 0, cost: 2, st: { cha: 1, end: 1 }, shape: "straw" },
  hardhat: { name: "Hard Hat", slot: "head", def: 2, cost: 2, shape: "hard" },
  bikehelm: { name: "Bike Helmet", slot: "head", def: 3, cost: 3, shape: "bike" },
  football: { name: "Football Helmet", slot: "head", def: 4, cost: 5, st: { per: -1 }, shape: "football" },
  army: { name: "Army Helmet", slot: "head", def: 5, cost: 6, shape: "army" },
  riothelm: { name: "Riot Helmet", slot: "head", def: 6, cost: 7, st: { per: -1 }, shape: "riot" },
  // ---- 3D.28 new gear (Last Day on Earth / State of Decay style), balanced with tools/balance (docs: equipment notes) ----
  golf: { name: "Golf Club", slot: "weapon", kind: "blunt", atk: 7, rate: 0.9, cost: 3 },
  hatchet: { name: "Hatchet", slot: "weapon", kind: "blade", atk: 9, rate: 0.85, cost: 4 },
  cleaver: { name: "Cleaver", slot: "weapon", kind: "blade", atk: 5, rate: 0.7, cost: 4 },
  shovel: { name: "Shovel", slot: "weapon", kind: "blunt", atk: 27, rate: 1.05, cost: 7 },
  roadsign: { name: "Road Sign", slot: "weapon", kind: "blunt", atk: 32, rate: 1.3, cost: 9, st: { agi: -1 } },
  spiked: { name: "Spiked Club", slot: "weapon", kind: "blunt", atk: 36, rate: 1.15, cost: 13 },
  magnum: { name: "Magnum", slot: "weapon", kind: "gun", atk: 27, rate: 1.4, range: 3.8, mag: 6, reload: 3.2, cost: 14, ranged: true },
  hoodie: { name: "Hoodie", slot: "armor", def: 1, cost: 2, st: { end: 1 } },
  raincoat: { name: "Raincoat", slot: "armor", def: 1, cost: 2, fx: "rain" },
  firecoat: { name: "Firefighter Coat", slot: "armor", def: 5, cost: 6, fx: "fire" },
  hazmat: { name: "Hazmat Suit", slot: "armor", def: 3, cost: 6, fx: "gas" },
  ghillie: { name: "Ghillie Suit", slot: "armor", def: 2, cost: 6, st: { agi: 2 } },
  tactical: { name: "Tactical Vest", slot: "armor", def: 9, cost: 12, st: { per: 1 } },
  swatarmor: { name: "SWAT Armor", slot: "armor", def: 12, cost: 16, st: { agi: -1 } },
  headlamp: { name: "Headlamp", slot: "head", def: 0, cost: 3, fx: "night", shape: "headlamp" },
  gasmask: { name: "Gas Mask", slot: "head", def: 1, cost: 4, fx: "gas", shape: "gasmask" },
  tactcap: { name: "Tactical Cap", slot: "head", def: 2, cost: 4, st: { per: 1 }, shape: "tactcap" },
  swathelm: { name: "SWAT Helmet", slot: "head", def: 8, cost: 9, st: { per: -1 }, shape: "swathelm" },
  backpack: { name: "School Backpack", slot: "acc", cost: 4, fx: "carry1" },
  hikerpack: { name: "Hiking Backpack", slot: "acc", cost: 8, st: { end: 1 }, fx: "carry2" },
  toolbelt: { name: "Tool Belt", slot: "acc", cost: 4, fx: "build" },
  medpouch: { name: "Medic Pouch", slot: "acc", cost: 5, st: { int: 1 }, fx: "regen" },
  watch: { name: "Wristwatch", slot: "acc", cost: 4, st: { agi: 1, per: 1 } },
  kneepads: { name: "Knee Pads", slot: "acc", def: 2, cost: 3 },
  walkie: { name: "Walkie-Talkie", slot: "acc", cost: 4, st: { cha: 2 }, fx: "radio" },
};
const SLOTS = ['head', 'acc', 'armor', 'weapon'], SLOT_NAME = { weapon: 'Weapon', armor: 'Clothing', head: 'Hat', acc: 'Accessory' };   /* 3D.28: four gear slots: hat, accessory, clothing (the old armour slot, key kept for saves), weapon; all show on the 3D model */
const ARMORY_STOCK = { weapon: ['knife', 'golf', 'hatchet', 'cleaver', 'bat', 'crowbar', 'machete', 'pistol', 'bow'], armor: ['hoodie', 'raincoat', 'jacket', 'leather', 'hockey', 'riot'], head: ['bandana', 'cap', 'beanie', 'strawhat', 'hardhat', 'headlamp', 'tactcap', 'bikehelm'], acc: ['gloves', 'belt', 'shoes', 'glasses', 'charm', 'backpack', 'watch', 'kneepads', 'toolbelt'] };   // what survivors can buy at an Armory with parts
const itemOf = (s, slot) => (s.eq && s.eq[slot] && ITEMS[s.eq[slot]]) || null;
/* V3D.25 extra drops per zombie type: [chance, resource, amount] */
const ZDROP = { runner: [[.3, 'cloth', 1]], brute: [[.4, 'cloth', 1], [.15, 'meds', 1]], bloated: [[.35, 'meds', 1]], spitter: [[.3, 'meds', 1]], crawler: [[.15, 'cloth', 1]], raider: [[.45, 'fuel', 1], [.3, 'meds', 1], [.3, 'cloth', 1], [.5, 'ammo', 6]], walker: [[.04, 'ammo', 2]] };   /* 3D.77: rounds from raiders and the odd dead cop */
const PART_DROP = { walker: [.55, 1], runner: [.55, 1], crawler: [.45, 1], spitter: [.7, 1], thrower: [.8, 2], bloated: [.75, 2], brute: [1, 2], raider: [0, 0] };   /* V2.33: [chance, parts] per kill (was 25% for 1) */
const fairRound = (x) => Math.floor(x) + (rnd() < x - Math.floor(x) ? 1 : 0);   /* V3D.16: 3.7 is 4 seven times in ten, so every point of armor counts */
const FISTS = { name: 'Bare hands', slot: 'weapon', atk: 1, rate: .9, kind: 'blunt', cost: 0 };   /* V3D.15: everyone starts bare-handed in 3D mode */
const GUN_BUTT = { name: 'Empty gun (swung)', slot: 'weapon', atk: 5, rate: 1.1, kind: 'blunt', cost: 0 };   /* 3D.77: out of ammo, a gunner clubs with the gun */
const usesAmmo = (w) => !!(w && w.mag && w.kind !== 'bow');   /* crossbows and bows never need ammo */
const weaponOf = (s) => { const w = itemOf(s, 'weapon'); if (w && s.dry && usesAmmo(w)) return GUN_BUTT; return w || ((FISTS)); };
function reloadGun(s, w = itemOf(s, 'weapon')) {   /* 3D.77: limited ammo: refill the magazine from the town's stock (bows refill free) */
  if (!w || !w.mag) return; const cur = Math.max(0, s.ammo == null ? 0 : s.ammo);
  if (!usesAmmo(w)) { s.ammo = w.mag; return; }
  const take = Math.min(w.mag - cur, Math.floor(S.ammo || 0)); S.ammo = (S.ammo || 0) - take; s.ammo = cur + take;
  if (take > 0) flow('ammo', 'Reloads', -take);
  if (s.ammo <= 0) { s.dry = true; s.ammo = 0; if (!(s.dryNote > tick - 1800)) { s.dryNote = tick; floats.push({ w: { ...s.w }, t: 'OUT OF AMMO!', col: '#ff8a6a', a: 90, big: true }); bark(s, 'noAmmo', {}, { pri: 2 }); ammoAlert(true); } }
}
function dryTick() {   /* every few seconds: gunners with an empty gun go back to it once there is ammo again */
  if (tick % 120) return; for (const s of S.sv) if (s.dry && (S.ammo || 0) >= 1) { s.dry = false; s.ammo = 0; reloadGun(s); }   /* audit: reload straight away (no free shot) */
}
const gunners = () => S.sv.filter((q) => q.hp > 0 && usesAmmo(itemOf(q, 'weapon')));
const ammoCap = () => 60 + 30 * storeTiers();
function ammoChip(rr) {   /* 3D.77: an ammo count next to the stash, once someone carries a gun */
  const host = rr.parentElement && rr.parentElement.parentElement; if (!host) return; let c = document.getElementById('ammoChip');
  const show = gunners().length > 0 || (S.ammo || 0) > 24;
  if (!c) { if (!show) return; c = document.createElement('span'); c.id = 'ammoChip'; c.title = 'Ammo'; c.innerHTML = '<i>🔸</i><b></b>'; host.appendChild(c); }
  c.style.display = show ? '' : 'none'; host.classList.toggle('tight', show); c.querySelector('b').textContent = Math.floor(S.ammo || 0); c.style.color = (S.ammo || 0) < 8 * Math.max(1, gunners().length) ? '#ff9a7a' : '';
}
function ammoAlert(dry) {
  const g = gunners().length; if (!g) return;
  if (dry) note('critical', '🔸 Out of ammo: gunners are clubbing with empty guns. Make rounds at an Ammo Bench or loot the Military Checkpoint.', { key: 'dryammo', icon: '🔸' });
  else if ((S.ammo || 0) < 8 * g) note('important', `🔸 Low ammo: ${Math.floor(S.ammo || 0)} rounds for ${g} gunner${g > 1 ? 's' : ''}. Tonight could run dry.`, { key: 'lowammo', icon: '🔸' });
}
const RANGE = { pistol: 4, revolver: 4.2, shotgun: 3, smg: 4.2, rifle: 6, assault: 5.2, bow: 5, crossbow: 5.5 };   /* V2.33: ranged weapons fire from a distance (tiles) */
const MELEE_R = (.45), ZREACH = (.45);   /* V3D.12: 3D bodies are bigger than the sprites; at .9 a bat swung at air two body-lengths away */
const rangeOf = (s) => { const w = weaponOf(s); return weaponRange(w) + (w && w.ranged && s.job === 'Police Officer' ? 1.5 : 0); };   /* 3D.67: Police Officers shoot 1.5 tiles further */
const weaponRange = (w) => (w && w.ranged ? w.range || RANGE[Object.keys(ITEMS).find((k) => ITEMS[k] === w)] || 4 : MELEE_R);
const gearFx = (s, fx) => !!s && SLOTS.some((sl) => { const it = itemOf(s, sl); return it && it.fx === fx; });   /* 3D.28 special gear effects */
const carryBonus = (s) => (gearFx(s, 'carry2') ? 2 : gearFx(s, 'carry1') ? 1 : 0);
function stat(s, k) { let v = ((s.st && s.st[k]) || 5) + (hasSkill(s, 'jackOfAll') ? 1 : 0); for (const sl of SLOTS) { const it = itemOf(s, sl); if (it && it.st && it.st[k]) v += it.st[k]; } if (s.pet && PETS[s.pet.kind] && PETS[s.pet.kind].st[k]) v += PETS[s.pet.kind].st[k]; if (k === 'per' && gearFx(s, 'night') && isNight()) v += 2; return Math.max(1, v); }
const sMod = (s, k, per) => 1 + (stat(s, k) - 5) * per;   // 5 = average; each point above/below changes the effect by `per`
function itemScore(it) { if (!it) return 0; const w = it.slot === 'weapon' ? ((10 + .55 * (it.atk || 0)) / (it.rate || 1) - 10) * (it.ranged ? 1.6 : 1) : 0; return w + (it.def || 0) * 2.2 + Object.values(it.st || {}).reduce((a, v) => a + v * 3, 0); }   /* V3D.16: speed and range count */
function rollStats(job, l) { const st = {}; for (const k of STATS) st[k] = 2 + Math.floor(rnd() * 3); for (const k of (JOB_STATS[job] || [])) st[k] += 2 + Math.max(0, (l || 1) - 1); for (const k of STATS) st[k] = Math.min(STAT_CAP, st[k]); return st; }
const stashAdd = (id, n = 1) => { S.inv = S.inv || {}; S.inv[id] = (S.inv[id] || 0) + n; };
const stashTake = (id) => { if (!S.inv || !S.inv[id]) return false; S.inv[id]--; if (!S.inv[id]) delete S.inv[id]; return true; };
function equip(s, id) {   // move an item from the stash into its slot; the old item goes back to the stash
  const it = ITEMS[id]; if (!it || !stashTake(id)) return false; s.eq = s.eq || {}; const old = s.eq[it.slot]; if (old && old !== 'pipe') stashAdd(old); s.eq[it.slot] = id; if (it.mag) { s.ammo = 0; s.dry = false; reloadGun(s, it); s.reloadT = 0; } setMaxHp(s); return true;
}
function unequip(s, slot) { s.eq = s.eq || {}; const old = s.eq[slot]; if (!old || old === 'pipe') return false; stashAdd(old); s.eq[slot] = null; setMaxHp(s); return true; }
const FIGHTERS = new Set(['Guard', 'Police Officer', 'Scavenger']);   // everyone else hides from zombies unless cornered
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
  scrounger: { name: 'Scrounger', icon: '🔍', good: 'Finds a bit of scrap about every other day; +15% expedition loot', bad: '−10% output at a post' },
  owl:       { name: 'Night Owl', icon: '🦉', good: 'Stays up later; at night engages from 30% farther and spots raiders sooner', bad: '−15% output on the morning shift', nf: 'Stays up later at night (as a fighter: engages from 30% farther at night and spots raiders sooner)' },
};
const TRAIT_KEYS = Object.keys(TRAITS), hasT = (s, k) => !!s && s.trait === k;
function rollTrait(s) { let h = 7; for (const c of String(s.name) + ':' + (s.id || 0)) h = (h * 31 + c.charCodeAt(0)) >>> 0; return TRAIT_KEYS[h % TRAIT_KEYS.length]; }   /* stable for old saves */
const traitGood = (s) => { const t = TRAITS[s && s.trait]; return t ? (!isFighter(s) && t.nf ? t.nf : t.good) : ''; };
const traitIcon = (s) => (TRAITS[s && s.trait] ? TRAITS[s.trait].icon : '');
const traitTag = (s) => (s ? ` · ${ageOf(s)} yrs` : '') + (TRAITS[s && s.trait] ? ` · ${TRAITS[s.trait].icon} ${TRAITS[s.trait].name}` : '');   /* 3D.44 age shown */
const traitRange = (s) => (hasT(s, 'brave') ? 1.25 : hasT(s, 'cautious') ? .8 : 1) * (hasT(s, 'owl') && isNight() ? 1.3 : 1);
const traitSpot = (s) => (hasT(s, 'cautious') || (hasT(s, 'owl') && isNight()) ? 1.2 : 0);
const traitWork = (s) => (hasT(s, 'diligent') ? .15 : 0) - (hasT(s, 'scrounger') ? .1 : 0) - (hasT(s, 'owl') && S.hour >= 7 && S.hour < 12 ? .15 : 0);
const traitRetreat = (s) => (hasT(s, 'brave') ? -10 : hasT(s, 'cautious') ? 15 : 0);
const skillMaxHp = (s) => (hasSkill(s, 'bulwark') ? 20 : 0) + (hasSkill(s, 'hardy') ? 10 : 0) + (hasSkill(s, 'tough') ? 15 : 0) + (hasSkill(s, 'strongBack') ? 10 : 0);
const baseMax = (s) => Math.round((48 + 8 * (s.l || 1) + 2 * stat(s, 'end') + skillMaxHp(s) + (hasT(s, 'eater') ? 12 : 0)) * (s.job === 'Guard' ? 1.2 : 1));   /* 3D.67: Guards +20% health */   /* V2.14: Endurance adds HP */
const dmgReduce = (s) => (s && s.job !== undefined ? Math.min(.6, (((itemOf(s, 'armor') || {}).def || 0) + ((itemOf(s, 'head') || {}).def || 0) + ((itemOf(s, 'acc') || {}).def || 0)) * .03 + (stat(s, 'end') - 5) * .012 + (s.job === 'Guard' ? .2 : 0)) : 0);   /* armor + Endurance; 3D.67: Guards take 20% less */
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
let cookT = -1, cookV = 1; const cookSave = () => { if (cookT !== tick) { cookT = tick; cookV = world.buildings.some((b) => DEFS[b.type] && DEFS[b.type].fam === 'kitchen' && !b.burnt && b.staff && b.staff.job === 'Cook') ? .85 : 1; } return cookV; };   /* 3D.67: a Cook running a kitchen makes the town's food go 15% further */
const ration = (s) => cookSave() * TUNE.eat * (RATION_BASE[s.job] || 1) * (1 + .06 * (Math.min(LEVEL_CAP, s.l || 1) - 1)) * (hasT(s, 'eater') ? 1.3 : 1);   // rations per day (half food, half water)
/* 3D.67 profession balance: the worker bonus checks the profession. Matching: +50% (+8% a level); a Civilian: +25% anywhere;
   anyone else is in the wrong job: -25% (owner: a small penalty). It used to give the full bonus to anyone. */
const fitOf = (b, s) => (STAFF_JOBS[DEFS[b.type].fam] || []).includes(s.job) ? 'match' : s.job === 'Civilian' ? 'civ' : 'wrong';
const fitBoost = (b, s) => { const f = fitOf(b, s); return f === 'match' ? workBoost(s) : f === 'civ' ? .25 : .75 / TUNE.work - 1; };   // wrong job: 75% of an empty slot's output
const workBoost = (s) => .5 + .08 * (Math.min(LEVEL_CAP, s.l || 1) - 1);                            // matching-profession output boost (+50%, +10% per level above 1)
const jobAI = { Civilian: { aggro: 3.0, rescue: 5, town: 1.35 }, Guard: { aggro: 6, rescue: 7, town: .65 }, Medic: { aggro: 3.3, rescue: 10, town: 1.1 }, Scavenger: { aggro: 4.3, rescue: 6, town: .8 }, 'Police Officer': { aggro: 6.8, rescue: 8, town: .55 } };
const zombieTypes = {
  walker: { name: 'Walker', hp: 30, atk: 4, aggro: 2.2, chase: .0125, reward: 18, ren: 1, weight: 58, alert: 4.5 },
  crawler: { name: 'Crawler', hp: 22, atk: 3, aggro: 1.8, chase: .0055,   /* 3D.34: drags itself on its arms, the slowest zombie */ reward: 16, ren: 1, weight: 20, alert: 3.5 },
  runner: { name: 'Runner', hp: 25, atk: 5, aggro: 3.2, chase: .027, reward: 25, ren: 2, weight: 12, alert: 6 },
  bloated: { name: 'Bloated', hp: 60, atk: 8, aggro: 2, chase: .009, reward: 40, ren: 3, weight: 6, alert: 4 },
  spitter: { name: 'Spitter', hp: 28, atk: 6, aggro: 3.7, chase: .0125, reward: 32, ren: 2, weight: 3, alert: 5.5 },
  thrower: { name: 'Thrower', hp: 46, atk: 9, aggro: 4.8, chase: .0105, reward: 45, ren: 3, weight: 2, alert: 6, desc: 'Lobs rubble from four tiles away: hits hard, slow to wind up.' },   /* 3D.126 the owner's Thrower model: a slow ranged zombie from day 12 */
  brute: { name: 'Brute', hp: 105, atk: 12, aggro: 2.4, chase: .008, reward: 70, ren: 5, weight: 1, alert: 5 },
  /* 3D.32 new zombies (from the story plan; weight 0 = not in normal waves yet, only the test page and later acts) */
  screamer: { name: 'Screamer', hp: 30, atk: 5, aggro: 3.6, chase: .013, reward: 30, ren: 3, weight: 0, alert: 9, isNew: 1, desc: 'Area attack: throws its head back and shrieks, hurting everyone within about 2 tiles, and every shriek calls a walker. Kill it fast from range.' },
  riot: { name: 'Riot Zombie', hp: 80, atk: 7, aggro: 2.4, chase: .011, reward: 45, ren: 4, weight: 2,   /* 3D.80 in waves from day 8 */ alert: 4.5, isNew: 1, desc: 'Still wearing riot gear: blades and knives do half damage. Use blunt weapons or guns.' },
  burnt: { name: 'Burnt Zombie', hp: 40, atk: 6, aggro: 2.6, chase: .013, reward: 35, ren: 3, weight: 0, alert: 5, isNew: 1, desc: 'Smouldering: sets buildings it hits on fire. Firefighter Coat and rain help.' },
  dog: { name: 'Infected Dog', hp: 18, atk: 5, aggro: 4.2, chase: .034, reward: 22, ren: 2, weight: 4,   /* 3D.80 the user's dog model; in waves from day 4 */ alert: 6, isNew: 1, desc: 'Fast and low to the ground: goes for workers out at the trees and rocks. Fences and Agility help.' },
  alpha: { name: 'The Alpha', hp: 230, atk: 15, aggro: 4, chase: .012, reward: 0, ren: 20, weight: 0, alert: 8, isNew: 1, desc: 'Leads the horde: zombies near it move 20% faster. Kill it and the horde breaks.' },
  sporehead: { name: 'Sporehead', hp: 70, atk: 4, aggro: 2.8, chase: .011, reward: 40, ren: 3, weight: 3, alert: 5, desc: 'Fungus-headed brawler: every attack is a three-hit combo (claw, claw, headbutt). Keep your distance or block it with walls.' },   /* 3D.37 the user's model; in waves from day 4 */
  lasher: { name: 'Lasher', hp: 34, atk: 5, aggro: 3.6, chase: .012, reward: 34, ren: 3, weight: 2, alert: 6, isNew: 1, desc: 'Gaunt, with arms far too long: from up to 2 tiles away it hooks a survivor holding a gun, bow or crossbow, drags them in and leaves them paralysed for about 8 seconds. Kill it first; Guards often brace and hold.' },   /* 3D.80 the user's model; from day 8 */
  rotbomb: { name: 'Rotbomb', hp: 45, atk: 5, aggro: 2.2, chase: .0095, reward: 30, ren: 3, weight: 2, alert: 4, isNew: 1, desc: 'A swollen clown full of rot: it bursts when it dies, hurting everyone and every wall within about 2 tiles (other zombies too). Kill it at range, or outside the walls.' },   /* 3D.80 the user's model; from day 9 */
  raider: { name: 'Raider', hp: 55, atk: 7, aggro: 2.6, chase: .019, reward: 0, ren: 3, weight: 0, alert: 0 },   /* V2.13: human raiders */
  boss: { name: 'Mutant Boss', hp: 260, atk: 14, aggro: 7.5, chase: .0085, reward: 0, ren: 25, weight: 0, alert: 7 },   /* V2.13: boss every 3rd night */
};

/* V3D.17 boss kinds: the name, look and feel change with the kind (look = the zombie skin it is drawn with) */
const BOSS_KINDS = {
  mutant:  { name: 'Mutant Zombie', look: 'boss', sc: 1.6, hp: 1, spd: 1, atk: 1, line: 'A Mutant Zombie has appeared!' },
  bloater: { name: 'Bloater Queen', look: 'bloated', sc: 1.75, hp: 1.25, spd: .8, atk: .9, line: 'A Bloater Queen has appeared!' },
  stalker: { name: 'Stalker', look: 'stalker',   /* 3D.80 own model; 3D.86 owner: at least 1.5x a survivor */ sc: 1.5,   /* 3D.93 owner: slower all round */ hp: .7, spd: 1.6, atk: 1.1, run: true, line: 'A Stalker has appeared!' },
  butcher: { name: 'Butcher', look: 'brute', sc: 1.55, hp: 1.1, spd: 1, atk: 1.25, line: 'The Butcher has appeared!' },
};
const bossDefs = {};
const bossDef = (z) => bossDefs[z.bk] ||= { ...zombieTypes.boss, name: BOSS_KINDS[z.bk].name, chase: zombieTypes.boss.chase * BOSS_KINDS[z.bk].spd, atk: zombieTypes.boss.atk * BOSS_KINDS[z.bk].atk };
/* V3D.17 building health: zombies and raiders bash buildings; at 0 the building is wrecked (works again once repaired).
   Each zombie kind has an alert radius: how far it notices people sheltering in a building (noise, smell). */
const bMax = (b) => Math.round((70 + (DEFS[b.type].mat || 5) * 7) * (1 + .3 * ((b.lvl || 1) - 1)));
const bHp = (b) => { if (b.max == null || b.max !== bMax(b)) { const f = b.max ? (b.hp ?? b.max) / b.max : 1; b.max = bMax(b); b.hp = Math.round(b.max * f); } if (b.hp == null) b.hp = b.max; return b.hp; };
const occupied = (b) => S.sv.some((q) => insideBuilding(q) === b);
/* 3D.61 owner: repairs use what the building is made of: wood for every building, stone for the stone (tier 2+) ones, plus its scrap */
function repMix(b) { const c = bCost(DEFS[b.type]), m = {}; for (const k of ['wood', 'stone', 'mat']) if (c[k]) m[k] = c[k]; if (!m.mat && !m.wood) m.mat = DEFS[b.type].mat || 5; if (!m.wood) m.wood = Math.max(2, Math.round((m.mat || 4) * .6)); return m; }
function repCostFrac(b, f) { const m = repMix(b), c = {}; for (const [k, v] of Object.entries(m)) { const n = Math.ceil(v * f); if (n > 0) c[k] = n; } if (!Object.keys(c).length) c.wood = 1; return c; }
const fixCost = (b) => (b.burnt ? repairCost(b) : repCostFrac(b, (1 - bHp(b) / b.max) * .5));
function repStep(b) {   // the material for the next 12 HP patch: whichever of the building's materials is least used so far
  const m = repMix(b), u = b.repUse || (b.repUse = {}); return Object.keys(m).sort((x, y) => (u[x] || 0) / m[x] - (u[y] || 0) / m[y])[0]; }
function hitBuilding3(b, dmg, by) {
  if (!b || b.burnt) return; bHp(b); dmg = Math.max(1, Math.round(dmg)); b.hp = Math.max(0, b.hp - dmg); b.hitT = 12; b.lastHit = tick; floats.push({ w: { x: b.x + b.w / 2 + (rnd() - .5) * .6, y: b.y + b.h / 2 }, t: '-' + Math.round(dmg), col: '#ffb27a', a: 45 }); if (tick % 3 === 0) SFX('hit');
  if (occupied(b) && tick - (b.sosT || -9999) > 900) { b.sosT = tick; const q = S.sv.find((x) => insideBuilding(x) === b); note('critical', `🆘 SOS from the ${DEFS[b.type].name}`, { key: 'sos' + b.x + ',' + b.y, icon: '🆘', log: `${q ? q.name : 'Someone'} is trapped in the ${DEFS[b.type].name} while ${by} breaks in. Fighters are answering.`, at: () => ({ x: b.x + b.w / 2, y: b.y + b.h / 2 }), live: () => tick - b.lastHit < 300, threats: true }); }
  if (b.hp < b.max * .3) for (const q of S.sv) if (q.mode === 'hiding' && q.hideAt === b) slipOut(q, b);   /* 3D.48; 3D.64 balance study: a big hit that took a building from above 30% straight to 0 threw the people hiding inside out among the zombies (the commonest way to go down); now they slip out first */
  if (b.hp <= 0) wreck(b, by);
}
/* 3D.48 Radio for help: the Camp's radio (a Radio Tower answers faster) calls a neighbouring group. Their team arrives in an
   hour, clears the zombies in town and brings the fallen into care; two days later they ask for a favour. Once every 3 days
   (2 with a Radio Tower); refuse the favour and they won't answer again for a week. */
const HELP_COST = { food: 15, water: 10 };
function helpReady() { const h = S.help || {}; return !h.coming && !(h.owe) && (h.next || 0) <= S.day && !!campB(); }
function lastStandNote() {
  if ((S.help || {}).offered === S.day + ':' + Math.floor(S.hour)) return; (S.help = S.help || {}).offered = S.day + ':' + Math.floor(S.hour);
  const downN = S.sv.filter((q) => q.mode === 'down').length; note('critical', '🫣 The last ones standing are hiding', { key: 'laststand', live: () => lastStand(), log: `${downN} down, too few left to fight. They hide until the zombies move on, then go for the fallen.` });
  if (helpReady() && !modalOpen) showEventPopup({ title: '📻 CALL FOR HELP?', text: `${downN} of your people are down and the rest are hiding. A group on the radio says they can send a team in ${bOf('radio').length ? 'half an hour' : 'an hour'}. In two days they'll ask for a favour (${HELP_COST.food} food and ${HELP_COST.water} water).`,
    buttons: [{ label: '📻 Call them', fn: () => radioHelp() }, { label: 'We can manage', fn: () => {} }] });
}
function radioHelp() {
  if (!helpReady()) { say((S.help || {}).owe ? 'You still owe them a favour.' : 'Nobody answers. Try again in a day or two.'); return false; }
  const fast = bOf('radio').length > 0; S.help = { ...(S.help || {}), coming: tick + (fast ? 500 : 1000), next: S.day + (fast ? 2 : 3) };
  note('critical', '📻 Help is on the way', { key: 'helpcoming', live: () => !!(S.help && S.help.coming), log: `A rescue team is coming (${fast ? 'about half an hour' : 'about an hour'}). Hold on.` }); banner('📻 HELP IS COMING'); saveGame(); return true;
}
function helpTick() {
  const h = S.help; if (!h) return;
  if (h.coming && tick >= h.coming) { h.coming = 0; let killed = 0;
    for (const z of S.z) if (z.hp > 0 && !z.zoo && !z.human && Wd.inTown(Math.floor(z.w.x), Math.floor(z.w.y))) { z.hp = 0; killed++; }
    let saved = 0; for (const q of S.sv) if (q.mode === 'down') { const b = careDest(); q.careAt = b; q.w = { ...sitePoint(b) }; q.mode = 'hospital'; q.hp = 1; q.bleed = null; q.rescuer = null; q.stateTicks = careTicks(b); q.careTotal = q.stateTicks; q.why = 'Brought in by the rescue team'; saved++; }
    h.owe = { day: S.day + 2, ...HELP_COST }; SFX('rescued');
    showEventPopup({ title: '🚙 THE RESCUE TEAM ARRIVED', text: `They cleared ${killed} zombie${killed === 1 ? '' : 's'} from the town and carried ${saved} of your people into care. "Two days from now, we'll come by for that favour."` });
  }
  if (h.owe && S.day >= h.owe.day && !modalOpen) { const o = h.owe; h.owe = null;
    showEventPopup({ title: '📻 THEY CAME FOR THE FAVOUR', text: `The group that saved your people asks for ${o.food} food and ${o.water} water.`, buttons: [
      { label: `Pay (${o.food} 🍖 ${o.water} 💧)`, disabled: !canPay({ food: o.food, water: o.water }), fn: () => { pay({ food: o.food, water: o.water }); renownGain(5, 'Kept your word'); result('🤝 SQUARED AWAY', 'They nod. "Call us if you need us."'); } },
      { label: 'Refuse', fn: () => { h.next = S.day + 7; for (const q of S.sv) q.sat = Math.max(0, (q.sat || 0) - 4); result('📻 NO MORE FAVOURS', "They won't answer the radio for a week. Your people feel bad about it."); } }] }); }
}
function slipOut(q, b) {   /* out the back to the next shelter, away from the zombies; nowhere left = cornered */
  const zs = S.z.filter((z) => z.hp > 0 && !z.zoo); let best = null, bs = -1e9;
  for (const o of world.buildings) { if (o === b || !ENCLOSED(o) || o.burnt || (o.hp != null && o.hp < o.max * .3)) continue; const dp = Wd.doorPoint(o), sc = Math.min(9, ...zs.map((z) => dist(z.w, dp))) - dist(q.w, dp) * .3; if (sc > bs) { bs = sc; best = o; } }
  { const c = { x: b.x + b.w / 2, y: b.y + b.h / 2 }, nz = zs.slice().sort((p, r) => dist(p.w, c) - dist(r.w, c))[0], ap = Wd.approachPoint(b);   /* 3D.64 balance study: out the BACK, away from the zombies (the front door put them in the middle of the mob: 'hiding' was the commonest state just before going down) */
    let w = ap; if (nz) { const dx = c.x - nz.w.x, dy = c.y - nz.w.y, l = Math.hypot(dx, dy) || 1, r = Math.max(b.w, b.h) / 2 + .55, p = { x: c.x + dx / l * r, y: c.y + dy / l * r }; if (Wd.inMap(Math.floor(p.x), Math.floor(p.y)) && Wd.walkable(world, Math.floor(p.x), Math.floor(p.y)) && !Wd.buildingAt(world, Math.floor(p.x), Math.floor(p.y))) w = p; } q.w = { ...w }; }
  if (best) { q.mode = 'hide'; q.hideAt = best; q.stateTicks = 9999; q.path = null; q.why = `Slipped out of the ${DEFS[b.type].name} → ${DEFS[best.type].name}`; note('critical', `${q.name} slipped out of the ${DEFS[b.type].name} before it fell.`, { at: q.w }); }
  else { const z = nearestZombie(q); q.hideAt = null; if (z) { hideGuard = true; engage(q, z); hideGuard = false; q.why = 'Nowhere left to hide: fighting'; } else enterFree(q, 30); }
}
function wreck(b, by) {
  b.hp = 0; b.burnt = true; b.wrecked = true; b.fire = 0; releasePost(b); ejectFrom(b); Wd.bump(world); SFX('breach');
  note('critical', '🏚 ' + DEFS[b.type].name + ' wrecked', { key: 'wreck' + b.x + ',' + b.y, at: { x: b.x + b.w / 2, y: b.y + b.h / 2 }, live: () => b.burnt && world.buildings.includes(b),   /* 3D.41: the note goes away once it's repaired (or removed) */ log: `${by ? by.charAt(0).toUpperCase() + by.slice(1) : 'Zombies'} wrecked the ${DEFS[b.type].name}. It does nothing until repaired (tap it, ${costShort(repairCost(b))}).` });
}
function bashTarget(z, d, any) {   /* the building a zombie goes for: one with people inside within its alert radius, or (marching) whatever it bumps into */
  if ((z.bored || 0) > tick) return null;   /* 3D.48: gave up on a quiet building a moment ago */
  let best = null, bs = 1e9;
  for (const b of world.buildings) { if (b.burnt) continue; const cx = Math.max(b.x, Math.min(b.x + b.w, z.w.x)), cy = Math.max(b.y, Math.min(b.y + b.h, z.w.y)), dd = Math.hypot(z.w.x - cx, z.w.y - cy);
    const occ = enclosedB(b) && occupied(b); if (!occ || !(dd < (d.alert || 4) || (any && dd < 1.6))) continue;   /* V3D.21: only a building with someone inside (an empty one is left alone) */ const sc = dd - (occ ? 3 : 0); if (sc < bs) { bs = sc; best = b; } }
  return best;
}
function bashSpot(z, b) {   /* a walkable tile next to the building, nearest the zombie */
  let best = null, bd = 1e9; for (let x = b.x - 1; x <= b.x + b.w; x++) for (let y = b.y - 1; y <= b.y + b.h; y++) { if (x >= b.x && x < b.x + b.w && y >= b.y && y < b.y + b.h) continue; if (!Wd.walkable(world, x, y, true)) continue; const c = tc(x, y), dd = dist(c, z.w) + (S.z.some((o) => o !== z && o.bldT === b && o.bpt && dist(o.bpt, c) < .3) ? 3 : 0); if (dd < bd) { bd = dd; best = c; } }
  return best;
}
function startBash(z, b) { const p = bashSpot(z, b); if (!p) return false; z.mode = 'zbash'; z.bldT = b; z.bpt = p; z.path = null; z.target = null; z.stateTicks = 30; return true; }
/* fighters answer: any zombie or raider bashing a building pulls in the nearest free fighters (up to two each); at night guards leave bed for it */
function answerSOS() {
  const hits = S.z.filter((z) => z.hp > 0 && (z.mode === 'zbash' || z.mode === 'rsmash')); if (!hits.length) return;
  for (const z of hits) {
    const on = S.sv.filter((q) => q.target === z && ['chase', 'attack', 'recover'].includes(q.mode)).length; if (on >= 3) continue;   /* 3D.41: up to three fighters per attacker */
    const c = S.sv.filter((q) => isFighter(q) && !q.errand && canFight(q) && !q.carrying && !q.rescuing && (['free', 'wait', 'walk', 'postCombat', 'pitch', 'chat', 'campfire', 'goFacility'].includes(q.mode) || ['useFacility', 'hiding'].includes(q.mode) || q.sleeping || (q.mode === 'work' && isNight())) && dist(q.w, z.w) < 20)   /* 3D.41 owner: a building under attack wakes the fighters, however tired */
      .sort((a, b) => dist(a.w, z.w) - dist(b.w, z.w)).slice(0, 3 - on);
    for (const q of c) { if (insideBuilding(q)) { const bb = insideBuilding(q); q.facility = null; q.hideAt = null; q.w = { ...Wd.approachPoint(bb) }; } if (q.mode === 'chat') endChat(q); if (q.mode === 'pitch') endPitch(q); if (q.sleeping) { q.sleeping = false; bark(q, 'wake', {}, { pri: 2 }); } q.fleeT = 0; engage(q, z); q.why = `Answering the SOS at the ${DEFS[(z.bldT || z.goalB || {}).type]?.name || 'building'}`; emote(q, '😤', 60); }
  }
}
function engineerRepairs() {   /* idle Engineers patch damaged buildings: 1 wood, stone or scrap per 12 HP (3D.61: the building's own materials) */
  const dmg = world.buildings.filter((b) => !b.burnt && bHp(b) < b.max && tick - (b.lastHit || -9999) > 600 && (S[repStep(b)] || 0) >= 1); if (!dmg.length) return;
  for (const q of S.sv) { if (q.job !== 'Engineer' || !['free', 'wait', 'walk'].includes(q.mode) || q.sleeping || q.purpose || q.carriedLoot || isNight() || insideBuilding(q) || threatOf(q)) continue;   /* 3D.63: not out of bed, not mid-delivery */ const b = dmg.sort((a, c) => dist(q.w, Wd.approachPoint(a)) - dist(q.w, Wd.approachPoint(c)))[0]; q.mode = 'fix'; q.fixB = b; q.path = null; q.why = 'Repairing the ' + DEFS[b.type].name; return; }
}
function fixTick(s) {
  const b = s.fixB; if (!b || !world.buildings.includes(b) || b.burnt || bHp(b) >= b.max || threatOf(s)) { s.fixB = null; s.activity = null; enterFree(s, 30); return; }
  const r = followPath(s, Wd.approachPoint(b), WALK); if (r === 'moving') return; if (r === 'fail') { s.fixB = null; enterFree(s, 60); return; }
  s.moving = false; s.activity = 'Building'; if (tick % Math.round(40 / TUNE.work) === 0) { const rk = repStep(b); if ((S[rk] || 0) < 1) { floats.push({ w: { ...s.w }, t: 'Needs ' + RES_ICON[rk] + ' ' + RES_NAME[rk], col: '#ff8a7a', a: 80 }); s.fixB = null; s.activity = null; enterFree(s, 60); return; } b.hp = Math.min(b.max, b.hp + 12); S[rk] -= 1; b.repUse[rk] = (b.repUse[rk] || 0) + 1; if (b.hp >= b.max) b.repUse = {}; flow(rk, 'Repairs', -1); ui(); floats.push({ w: { x: b.x + b.w / 2, y: b.y + b.h / 2 }, t: '+12', col: '#9fe08a', a: 40 }); }
}
const zDef = (z) => (z.bk && BOSS_KINDS[z.bk] ? bossDef(z) : zombieTypes[z.type] || zombieTypes.walker);
const TOWN_EVENT_DEFS = [
  { id: 'caravan', name: 'Trader Caravan', text: 'A caravan leaves food and water.', food: 3, water: 3, ren: 2 },
  { id: 'supplies', name: 'Supply Cache', text: 'Scavengers uncover some useful scrap.', mat: 2, ren: 1 },
  { id: 'rumor', name: 'Safe Haven Rumor', text: 'Word of the Haven spreads.', ren: 4 },
];
const rankRules = [{ rank: 1, ren: 0, income: 0, residents: 0, facilities: 0 }, { rank: 2, ren: 60, income: 40, residents: 2, facilities: 6 }, { rank: 3, ren: 200, income: 160, residents: 3, facilities: 10 }, { rank: 4, ren: 450, income: 400, residents: 5, facilities: 15 }, { rank: 5, ren: 900, income: 800, residents: 7, facilities: 20 }];   // income = supplies produced

/* ---------------- helpers ---------------- */
const dist = (a, b) => Math.hypot(a.x - b.x, a.y - b.y);
const tileOf = (w) => ({ x: Math.max(0, Math.min(COLS - 1, Math.floor(w.x))), y: Math.max(0, Math.min(ROWS - 1, Math.floor(w.y))) });
const tc = (x, y) => ({ x: x + .5, y: y + .5 });
const rnd = () => Math.random();
function say(t, log = false) { if (log) logEvent(t, 'important'); const e = $('say'); e.textContent = t; e.style.opacity = 1; clearTimeout(say.t); say.t = setTimeout(() => (e.style.opacity = 0), 1700); }
function screenToast(t, log) { note('important', t, log ? { log } : {}); }
function renownGain(n, why = '') { if (!isFinite(n)) n = 0; if (!isFinite(S.ren)) S.ren = 0; S.ren += n; const el = $('ren'); if (el) { el.parentElement.classList.remove('renFlash'); void el.offsetWidth; el.parentElement.classList.add('renFlash'); } note(n >= 5 ? 'important' : 'routine', `★ RENOWN +${n}${why ? ' · ' + why : ''}`); ui(); }   /* V2.34: small gains only flash the Renown wheel and go to the log */
/* ---------------- V2.34 notifications: three levels ----------------
 * critical  : persistent alert row (top of the map), one per unresolved issue (deduplicated by key), tap = centre the camera on it,
 *             optional action buttons, pulsing marker in the world + an arrow at the screen edge when it is off screen,
 *             optional "drop to 1x speed" on the first emergency (Event log → settings).
 * important : one banner at a time (queued, never overlapping), and the event log.
 * routine   : event log only (plus floating text in the world when it has a place). */
const alerts = new Map(); let bannerQ = [], bannerOn = false, lastSlow = -1e9; const lastBanner = new Map();
const OPT_KEY = 'zombieHavenOpts', OPTS = { autoSlow: false, nightLights: true, advisor: true }; try { Object.assign(OPTS, JSON.parse(localStorage.getItem(OPT_KEY) || '{}')); if (!OPTS.v313) { OPTS.autoSlow = false; OPTS.v313 = 1; localStorage.setItem(OPT_KEY, JSON.stringify(OPTS)); } } catch (e) { /* private mode */ }   /* V3D.13: emergencies no longer drop the speed to 1x (owner's request); the Log panel still has the switch */
function saveOpts() { try { localStorage.setItem(OPT_KEY, JSON.stringify(OPTS)); } catch (e) { /* ignore */ } }
const atOf = (a) => { const v = typeof a.at === 'function' ? a.at() : a.at; return v && isFinite(v.x) ? v : null; };
function note(level, text, o = {}) {
  logEvent(o.log || text, level);
  if (level === 'routine') { const at = o.at && (typeof o.at === 'function' ? o.at() : o.at); if (at && o.float) floats.push({ w: { x: at.x, y: at.y }, t: o.float, col: o.col || '#e8e0c8', a: 70 }); return; }
  if (level === 'important') { banner(o.banner || text, o.who); return; }
  const key = o.key || text, a = alerts.get(key);
  if (a) { a.text = text; if (o.at) a.at = o.at; renderAlerts(); return; }
  const first = ![...alerts.values()].some((q) => !q.dismissed);
  alerts.set(key, { key, text, icon: o.icon || '⚠', at: o.at || null, live: o.live || null, dyn: o.dyn || null, acts: o.acts || [], threats: !!o.threats, t0: tick, ttl: o.ttl || 0, seen: performance.now() });
  { const a2 = alerts.get(key); if (a2.dyn) try { a2.text = a2.dyn(); } catch (e) { /* keep the first text */ } }
  if (first && OPTS.autoSlow && simSpeed > 1 && performance.now() - lastSlow > 60000) { lastSlow = performance.now(); simSpeed = 1; $('btnSpeed').textContent = '1×'; banner('⏸ Back to 1× speed: emergency'); }
  renderAlerts();
}
function banner(t, who) {
  if ((who)) t = { t, who };
  const now = performance.now(); if (typeof t === 'object') { bannerQ.push(t); if (bannerQ.length > 4) bannerQ.shift(); nextBanner(); return; } if (now - (lastBanner.get(t) || -1e9) < 8000 || bannerQ.includes(t)) return; lastBanner.set(t, now);
  if (lastBanner.size > 80) lastBanner.clear(); bannerQ.push(t); if (bannerQ.length > 4) bannerQ.shift(); nextBanner();
}
function nextBanner() {
  const fx = $('fx'); if (bannerOn || !bannerQ.length || !fx) return; const t = bannerQ.shift(); bannerOn = true;
  const d = document.createElement('div'); d.className = 'toast';
  {   /* V3D.12 portrait pop: a round picture (the person, or the message's icon) and a few words */
    const who = typeof t === 'object' ? t.who : null, txt = typeof t === 'object' ? t.t : t, m = txt.match(/^\s*(\p{Extended_Pictographic}\uFE0F?|[☠★⚠⚙⏸🕯])\s*/u), icon = m ? m[1] : '📣';
    let body = m ? txt.slice(m[0].length) : txt; if (body === body.toUpperCase() && /[A-Z]{3}/.test(body)) body = body.charAt(0) + body.slice(1).toLowerCase();
    const pic = who && window.ZH3D && ZH3D.portrait ? ZH3D.portrait(who) : null; d.className = 'toast pop';
    d.innerHTML = `<div class="pp">${pic ? `<img src="${pic}" alt="">` : icon}</div><div class="pt">${esc(body)}</div>`;
  }
  fx.appendChild(d);
  setTimeout(() => { d.remove(); bannerOn = false; nextBanner(); }, d.classList.contains('pop') ? 2400 : 1700);
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
  return L;
}
function alertHub() {
  const w = $('world'); if (!w) return; let b = $('alertBtn');
  if (!b) { b = document.createElement('button'); b.id = 'alertBtn'; b.className = 'alertBtn'; b.innerHTML = `<span class="abI">${window.ZHIcons ? ZHIcons.svg('warn', 34) : '⚠'}</span><b class="abN"></b>`; w.appendChild(b); b.onclick = (e) => { e.stopPropagation(); hubOpen = !hubOpen; alertHub(); }; }
  const L = hubItems(), n = L.length, fresh = L.some((q) => !hubSeen.has(q.key)), urgent = L.some((q) => q.urgent);
  b.style.display = n ? 'flex' : 'none'; b.querySelector('.abN').textContent = n; b.classList.toggle('flash', fresh && !hubOpen); b.classList.toggle('urgent', urgent);
  { const q = $('quest'), wr = w.getBoundingClientRect(); if (q) b.style.top = Math.round(q.getBoundingClientRect().bottom - wr.top + 10) + 'px'; }
  let pop = $('alertPop'); if (!hubOpen || !n) { if (pop) pop.remove(); if (!n) hubOpen = false; return; }
  for (const q of L) hubSeen.add(q.key);
  if (!pop) { pop = document.createElement('div'); pop.id = 'alertPop'; pop.className = 'alertPop'; w.appendChild(pop); pop.onclick = (e) => e.stopPropagation(); }
  pop.style.top = (parseInt(b.style.top) || 120) + 'px';
  const sig = L.map((q) => q.key + q.text + q.acts.map((c) => c.label + c.ok).join()).join('|'); if (pop.dataset.sig === sig) return; pop.dataset.sig = sig;
  pop.innerHTML = `<div class="apH"><b>Needs you</b><button class="apX">${window.ZHIcons ? ZHIcons.svg('cross', 16) : '✕'}</button></div>` + L.map((q, i) => `<div class="apRow${q.urgent ? ' urg' : ''}" data-i="${i}"><span class="apI">${q.icon}</span><span class="apT">${esc(q.text)}</span>${q.acts.map((c, j) => `<button class="apA" data-j="${j}"${c.ok ? '' : ' disabled'}>${esc(c.label)}</button>`).join('')}</div>`).join('');
  if (window.ZHIcons && ZHIcons.swap) try { ZHIcons.swap(pop); } catch (e) { /* emoji stay */ }
  pop.querySelector('.apX').onclick = () => { hubOpen = false; alertHub(); };
  pop.querySelectorAll('.apRow').forEach((r) => { const q = L[+r.dataset.i];
    r.onclick = () => { const p = q.at && q.at(); if (p) { centerOn(p.x, p.y); hubOpen = false; alertHub(); } };
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
function downAlert(s) {
  note('critical', s.name + ' is down', { key: 'down' + (s.id || s.name), icon: '🩸', log: s.name + ' collapsed! Rescue within ' + Math.round(s.bleed / 60) + ' s.', at: () => s.w, live: () => s.mode === 'down' && S.sv.includes(s),
    dyn: () => `${s.name} is down · ${Math.max(0, Math.ceil((s.bleed || 0) / 60))} s left · ` + (s.rescuer ? (s.rescuer.carrying === s ? `${s.rescuer.name} is bringing them in` : `${s.rescuer.name} is on the way`) : 'no rescuer yet'),
    acts: [{ label: () => (s.ordered ? 'Rescue sent 🛡' : 'Send rescue 🛡'), ok: () => !s.ordered, fn: () => orderRescue(s) }, { label: () => (S.cloth || 0) >= 1 ? 'Bandage 🧵1' : 'Bandage ⚙' + BANDAGE_COST * 2, ok: () => (S.cloth || 0) >= 1 || S.mat >= BANDAGE_COST * 2, fn: () => useBandage(s) }] });
}
function raidAlert(n) {
  const alive = () => S.z.filter((z) => z.human && z.hp > 0 && !z.escaped);
  note('critical', `${n} raiders sneaking in`, { key: 'raid', icon: '🏴', log: `${n} raiders are sneaking toward the Haven. They'll steal supplies and fight anyone in the way.`, at: () => { const r = alive()[0]; return r ? r.w : null; }, live: () => alive().length > 0, dyn: () => { const k = alive().length; return `${k} raider${k > 1 ? 's' : ''} in the area · they steal supplies`; } });
}
/* wall breach: one alert per broken piece until it is repaired; "Repair first" queues it ahead of other damage (still needs scrap and no zombie
 * within reach, the normal repair rules); "Send defender" sends the best free fighter at the closest zombie */
let repairFirst = null;
const wallHot = (wl) => S.z.some((z) => z.hp > 0 && dist(z.w, { x: wl.x + .5, y: wl.y + .5 }) < 2.6);
function bestDefender(c) {
  let best = null, bs = -1e9; for (const q of S.sv) { if (q.hp <= q.max * .4 || q.carrying || ['down', 'away', 'errand', 'hospital', 'rescueTo', 'rescueCarry', 'chase', 'attack'].includes(q.mode)) continue;
    const sc = (professions[q.job]?.combat || 0) * 4 + (weaponOf(q).atk || 0) * .3 - dist(q.w, c); if (sc > bs) { bs = sc; best = q; } }
  return best;
}
function sendDefender(c) { const q = bestDefender(c); let z = null, d = 6; for (const o of S.z) if (o.hp > 0 && dist(o.w, c) < d) { d = dist(o.w, c); z = o; } if (!q || !z) return false; engage(q, z); q.why = 'Defending the breach'; say(`${q.name} is heading to the breach.`); return true; }
function breachAlert(wl) {
  const gate = wl.type === 'gate', nm = gate ? 'Gate' : 'Wall', c = { x: wl.x + .5, y: wl.y + .5 }, near = () => S.z.filter((z) => z.hp > 0 && !z.human && dist(z.w, c) < 6).length;
  note('critical', `${nm} breached`, { key: 'breach' + wl.x + ',' + wl.y, icon: '🧱', at: c, threats: true, log: `${gate ? 'The gate' : 'A wall section'} broke! Zombies can walk through until it is repaired (automatic, costs scrap).`,
    live: () => wl.broken && world.walls.get(Wd.key(wl.x, wl.y)) === wl,
    dyn: () => { const n = near(); return `${nm} breached · ${n ? n + ' zombie' + (n > 1 ? 's' : '') + ' near' : 'no zombies near'} · ` + (S.mat < 1 ? 'no scrap to repair' : wallHot(wl) ? 'repair waiting' : 'repairing'); },
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

/* ---------------- movement & path following (A* on the tile grid; recompute only when needed) ---------------- */
const solidWall = (x, y) => { const wl = Wd.wallAt(world, Math.floor(x), Math.floor(y)); return !!wl && !wl.broken; };
function stepToward(o, p, sp) {
  const dx = p.x - o.w.x, dy = p.y - o.w.y, d = Math.hypot(dx, dy); o.moving = d > 0.02;
  const k = d <= sp ? 1 : sp / d, nx = o.w.x + dx * k, ny = o.w.y + dy * k;
  if (o.job !== undefined && solidWall(nx, ny) && !solidWall(o.w.x, o.w.y)) {   /* 3D.103 owner: people walked through fences (chat spots, short hops): a person never steps onto a standing wall; they slide along it */
    if (!solidWall(nx, o.w.y)) o.w.x = nx; else if (!solidWall(o.w.x, ny)) o.w.y = ny; else o.moving = false; return false; }
  if (d <= sp) { o.w.x = p.x; o.w.y = p.y; return true; }
  o.w.x = nx; o.w.y = ny; return false;
}
function unwall(o) {   /* 3D.103 someone left standing on a wall tile (a wall built on top of them, an old save) steps off to the nearest open tile */
  if (!o.w || !solidWall(o.w.x, o.w.y)) return; const t = Wd.nearestWalkable ? Wd.nearestWalkable(world, Math.floor(o.w.x), Math.floor(o.w.y)) : null; if (!t) return;
  const g = { x: t.x + .5, y: t.y + .5 }, dx = g.x - o.w.x, dy = g.y - o.w.y, d = Math.hypot(dx, dy) || 1, sp = Math.min(d, .03); o.w.x += dx / d * sp; o.w.y += dy / d * sp; o.moving = true;
}
// returns 'arrived' | 'moving' | 'fail'.  goal = live world point.
const TUNE = { move: .6, work: 1.4, nfDmg: .5, eat: 1.5 };   /* 3D.49 eat: how much everyone eats and drinks (balance) */   /* 3D.41 nfDmg: damage multiplier for people whose job isn't a fighting one (militia, cornered civilians) */   /* V3D.20 move: everyone walks at 60% of the old pace so the steps match the ground covered; V3D.21 work: on the job they work 40% faster to make up for the longer walks */
/* V3D.21 people walk in soft curves: they turn gradually toward the next point (a turning circle that tightens near the
   point), cut corners by moving on to the next point early, and each trip's waypoints are nudged a little off the tile
   centres, so nobody walks the same ruler-straight grid line. Zombies keep the plain stepping. */
function steer(o, p, sp) {
  const dx = p.x - o.w.x, dy = p.y - o.w.y, d = Math.hypot(dx, dy); o.moving = d > .02;
  if (d <= sp) { o.w.x = p.x; o.w.y = p.y; return true; }
  const a = Math.atan2(dy, dx), wrap = (v) => Math.atan2(Math.sin(v), Math.cos(v)); if (o.hd == null || o.hdT !== tick - 1) o.hd = a; o.hdT = tick;
  const R = Math.max(.12, Math.min(.55, d * .45)), mt = sp / R, df = wrap(a - o.hd); o.hd += Math.max(-mt, Math.min(mt, df)); if (Math.abs(wrap(a - o.hd)) > 1.7) o.hd = a;
  const nx = o.w.x + Math.cos(o.hd) * sp, ny = o.w.y + Math.sin(o.hd) * sp;
  if ((Wd.walkable(world, Math.floor(nx), Math.floor(ny)) || Wd.buildingAt(world, Math.floor(o.w.x), Math.floor(o.w.y))) && !(solidWall(nx, ny) && !solidWall(o.w.x, o.w.y))) { o.w.x = nx; o.w.y = ny; } else { o.hd = a; const fx = o.w.x + dx / d * sp, fy = o.w.y + dy / d * sp; if (!solidWall(fx, fy) || solidWall(o.w.x, o.w.y)) { o.w.x = fx; o.w.y = fy; } else if (!solidWall(fx, o.w.y)) o.w.x = fx; else if (!solidWall(o.w.x, fy)) o.w.y = fy; }
  return false;
}
let litCache = { t: -1, L: [] };
const litAt = (w) => { if (!isNight()) return false; if (litCache.t !== S.hour) litCache = { t: S.hour, L: world.buildings.filter((b) => b.type === 'floodlight' && powered(b)) }; return litCache.L.some((b) => Math.hypot(b.x + .5 - w.x, b.y + .5 - w.y) < 5); };   /* 3D.104 Floodlight */
function followPath(o, goal, sp) {
  { const dG = Math.hypot(goal.x - o.w.x, goal.y - o.w.y), same = o.arrG && Math.abs(o.arrG.x - goal.x) < .01 && Math.abs(o.arrG.y - goal.y) < .01; o.nearT = dG < .5 ? (o.nearT || 0) + 1 : 0;
    if (dG < .03 || o.nearT > 45 || (same && dG < 1.3)) { o.path = null; o.pathGoal = null; o.moving = false; o.arrG = { x: goal.x, y: goal.y }; return 'arrived'; } }   /* 3D.59 owner's tracker log (Maya): someone already on their goal never re-paths, and someone kept off it by another person standing there (the anti-overlap push) stops at arm's length instead of walking in place forever */   /* 3D.59 owner's tracker log: someone already standing on their goal never re-paths (a goal on a building footprint sent them out to the door and back in, forever: the chat moonwalk) */
  sp *= TUNE.move; if (o.job === undefined && !o.human && litAt(o.w)) sp *= .75;
  const curvy = o.job !== undefined, go = (p) => curvy ? steer(o, p, sp) : stepToward(o, p, sp);
  if (o.job !== undefined) sp *= Math.max(.8, sMod(o, 'agi', .02)) * (hasSkill(o, 'lightFeet') ? 1.15 : 1) * (o.carrying ? (hasSkill(o, 'steadyHands') ? 1.3 : 1) * (hasSkill(o, 'strongBack') ? 1.2 : 1) : 1);   /* survivor skills */
  const gt = tileOf(goal), gk = gt.x + ',' + gt.y;
  if (!o.path || o.pathGoal !== gk + (o.wallCost ? '#w' : '') || o.pathVer !== world.ver) {
    const p = Wd.findPath(world, tileOf(o.w), gt, o.job === undefined && !o.human, o.wallCost || 0); o.pathGoal = gk + (o.wallCost ? '#w' : ''); o.pathVer = world.ver;
    if (!p) { o.path = null; return 'fail'; }
    o.path = p.map((q, i) => curvy && i < p.length - 1 ? { x: q.x + .5 + (rnd() - .5) * .44, y: q.y + .5 + (rnd() - .5) * .44 } : tc(q.x, q.y)); o.stuck = 0; o.lastD = 1e9;
    const fb = o.job !== undefined || o.human ? Wd.buildingAt(world, Math.floor(o.w.x), Math.floor(o.w.y)) : null;   /* V2.34: leaving a building = step out through its entrance tile first (the path starts AFTER that tile, so people cut across the footprint) */
    if (fb) { const at = Wd.approachTile(fb); if (!p.length || p[0].x !== at.x || p[0].y !== at.y) o.path.unshift(tc(at.x, at.y)); }
  }
  if (o.path.length > 0 && o.path.length === 1) { /* last leg handled below */ }
  const target = o.path.length ? o.path[0] : goal;
  const before = { x: o.w.x, y: o.w.y };
  if (curvy && o.path.length > 1 && dist(o.w, o.path[0]) < .5) o.path.shift();   /* cut the corner: head for the next point early */
  if (go(o.path.length > 1 ? o.path[0] : (o.path.length === 1 ? o.path[0] : goal))) {
    if (o.path.length) { o.path.shift(); if (!o.path.length) { /* now on the goal tile centre: finish to exact point */ } }
    else { o.path = null; o.pathGoal = null; o.arrG = { x: goal.x, y: goal.y }; return 'arrived'; }
  }
  if (!o.path || !o.path.length) { // final leg: exact goal point (live, so chasing moving targets works)
    if (o.job === undefined && !o.human && !Wd.walkable(world, Math.floor(goal.x), Math.floor(goal.y), true)) { o.path = null; o.pathGoal = null; return 'fail'; }   // zombies never step into a wall tile, even for a survivor standing in the gate
    if (o.path && !o.path.length) { if (go(goal)) { o.path = null; o.pathGoal = null; o.arrG = { x: goal.x, y: goal.y }; return 'arrived'; } }
  }
  const moved = Math.hypot(o.w.x - before.x, o.w.y - before.y);
  o.stuck = moved < sp * .25 ? (o.stuck || 0) + 1 : 0;
  if (o.stuck > 90) { o.path = null; o.pathGoal = null; o.stuck = 0; return 'fail'; }
  if (!o.prog || tick - o.prog.t > 60) {   /* 3D.59 net progress: stepping forward and being pushed back by someone standing in the way (the anti-overlap push) looked like walking in place forever */
    const net = o.prog ? Math.hypot(o.w.x - o.prog.x, o.w.y - o.prog.y) : 1; o.prog = { x: o.w.x, y: o.w.y, t: tick };
    if (net < .12) { const dG = Math.hypot(goal.x - o.w.x, goal.y - o.w.y); o.path = null; o.pathGoal = null; o.moving = false; o.prog = null; if (dG < 1.3) { o.arrG = { x: goal.x, y: goal.y }; return 'arrived'; } return 'fail'; } }
  return 'moving';
}
function moveSlide(o, t, sp) {                // free movement that cannot enter buildings or walls (zombie roaming)
  sp *= TUNE.move;
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
  const o = mk0(name, job, l, x, y, i); o.st = rollStats(job, l); o.eq = { weapon: (null), armor: null, head: null, acc: null }; o.tp = {}; o.cls = { [job]: { l, xp: 0 } }; o.skills = []; learnSkills(o, true); o.trait = TRAIT_KEYS[Math.floor(rnd() * TRAIT_KEYS.length)]; o.age = 18 + Math.floor(rnd() * 57); o.south = rnd() < .25; o.max = baseMax(o); o.hp = o.max; return o;
}
/* 3D.44 age and voice: every survivor has an age (18-74). 58+ talk like boomers, 27 and under like Gen Z, and about one in four has a
   Southern accent. Lines in js/barks.js tagged B| Z| S| are only said by those voices. Close ages bond faster and chat more. */
function ageOf(s) { if (!s) return 40; if (s.age == null) { let h = 7; for (const c of (s.name || '') + (s.id || 0)) h = (h * 31 + c.charCodeAt(0)) >>> 0; s.age = 18 + (h % 57); s.south = (h >>> 9) % 4 === 0; } return s.age; }
const voiceOk = (s, t) => (t === 'B' ? ageOf(s) >= 58 : t === 'Z' ? ageOf(s) <= 27 : t === 'S' ? (ageOf(s), !!s.south) : true);
const lineTag = (l) => (/^[BZS]\|/.test(l) ? [l[0], l.slice(2)] : [null, l]);
const voiceName = (s) => [ageOf(s) >= 58 ? 'Boomer' : ageOf(s) <= 27 ? 'Gen Z' : '', s.south ? 'Southern' : ''].filter(Boolean).join(', ');
const ageBondMul = (a, b) => { const d = Math.abs(ageOf(a) - ageOf(b)); return d <= 6 ? 1.5 : d <= 12 ? 1.2 : d >= 30 ? .8 : 1; };
/* V3D.17 full names: everyone has a family name (the first name is what the town calls them) */
const FIRST_NAMES = ['Noah', 'Maya', 'Eli', 'June', 'Rosa', 'Theo', 'Iris', 'Omar', 'Cass', 'Dex', 'Mara', 'Ozzy', 'Lark', 'Vince', 'Hana', 'Rook', 'Sol', 'Quinn', 'Ada', 'Bo', 'Cleo', 'Dante', 'Esme', 'Felix', 'Gwen', 'Hal', 'Ines', 'Jonah', 'Kira', 'Leo', 'Mina', 'Nico', 'Opal', 'Pia', 'Rafe', 'Sana', 'Tomas', 'Uma', 'Vera', 'Wes', 'Yara', 'Zed', 'Abel', 'Bryn', 'Cyrus', 'Della', 'Ezra', 'Faye', 'Gus', 'Hattie'];
const LAST_NAMES = ['Reyes', 'Novak', 'Okafor', 'Brennan', 'Sato', 'Lindqvist', 'Moreau', 'Kowalski', 'Haddad', 'Fischer', 'Park', 'Ivanova', 'Alvarez', 'Murphy', 'Nakamura', 'Osei', 'Petrov', 'Quinlan', 'Rossi', 'Schmidt', 'Tanaka', 'Underwood', 'Vasquez', 'Whitfield', 'Yilmaz', 'Zhou', 'Abara', 'Becker', 'Castillo', 'Dubois', 'Engel', 'Fontaine', 'Garza', 'Holm', 'Ibarra', 'Jensen', 'Kaur', 'Larsen', 'Mendes', 'Nyberg', 'Ortiz', 'Pruitt', 'Ramos', 'Sorensen', 'Torres', 'Vance', 'Webb', 'Abbott', 'Bishop', 'Crane'];
const freeFirst = (pool = FIRST_NAMES) => { const f = pool.filter((n) => !S.sv.some((q) => q.name === n)); return f.length ? f[Math.floor(rnd() * f.length)] : FIRST_NAMES[Math.floor(rnd() * FIRST_NAMES.length)] + ' ' + String.fromCharCode(65 + Math.floor(rnd() * 26)) + '.'; };
const pickLast = () => { const f = LAST_NAMES.filter((n) => !S.sv.some((q) => q.last === n)); const L = f.length ? f : LAST_NAMES; return L[Math.floor(rnd() * L.length)]; };
const fullName = (s) => (s ? s.name + (s.last ? ' ' + s.last : '') : '');
function mk0(name, job, l, x, y, i) {
  return { id: ++S.seq, name, last: pickLast(), job, l, mastery: 0, w: tc(x, y), hp: 58 + l * 8, max: 58 + l * 8, post: null, mode: 'free', target: null, cool: 20 + (i % 8) * 23, stateTicks: 30 + (i % 8) * 11, sat: 8 + (i % 6) * 3, resident: false, i, phase: i * 37, dest: null, moving: false, hunger: 15 + (i % 5) * 8, thirst: 10 + (i % 5) * 6, fatigue: 8 + (i % 5) * 5,   /* 3D.63: the 12th+ recruit arrived already starving (needs grew with the roster index) */ activity: null, facility: null, rescuer: null, rescuing: null, carrying: null, lastFacility: null, why: 'Settling in', purpose: null, idleBubble: '' };
}
const medSite = () => bOf('hospital')[0] || bOf('clinic')[0] || bOf('medic')[0] || null;
/* 3D.46 owner: with no room in a medical building (or none at all), the wounded go to the Camp. The Camp can look after only a
   few (CAMP_CARE by tier), more slowly, and they come back less healed. */
const CAMP_CARE = { hq: 1, hq2: 2, hq3: 2 };
const careLoad = (b) => S.sv.filter((q) => q.mode === 'hospital' && q.careAt === b).length;
const isCamp = (b) => !!b && DEFS[b.type] && DEFS[b.type].role === 'hq';
function careDest() { const m = medSite(), c = campB();
  if (m && careLoad(m) < cap(m)) return m; if (c && careLoad(c) < (CAMP_CARE[c.type] || 1)) return c; return m || c || null; }   // all full: the medical building takes them anyway, crowded
function sitePoint(b) { b = b === undefined ? careDest() : b; return b ? Wd.doorPoint(b) : tc(3 + OFF, 10 + OFF); }
const downedUnassigned = () => S.sv.filter((q) => { if (q.mode !== 'down') return false; const r = q.rescuer; if (r && (r.rescuing !== q || r.hp <= 0 || !['rescueTo', 'rescueCarry'].includes(r.mode))) { if (r.rescuing === q) r.rescuing = null; q.rescuer = null; } return !q.rescuer; });   // a rescuer who got distracted releases the casualty
function facilityUsers(b) { return S.sv.filter((s) => s.facility === b && ['goFacility', 'useFacility'].includes(s.mode)).length; }   // reservation: heading there counts
const cap = (b) => (DEFS[b.type] ? (DEFS[b.type].role === 'hq' ? CAMP_CAP[b.type] || 10 : DEFS[b.type].cap) : 1);
/* ---------------- V3D.22/23 gathering: trees (wood), rock outcrops (stone) and wrecks (scrap) are resource nodes ----------------
   Each node has a few charges; an empty one is a stump / rubble / stripped wreck that comes back after NODE[k].regrow game hours.
   Idle survivors gather on their own in quiet daytime hours near the town, going for what the building work needs most;
   nodes the player marks (tap) go first, wherever they are. Loads go straight to a construction job that needs them,
   otherwise to the HQ or the nearest storage. */
const NODE = {
  tree:  { res: 'wood',  charges: 3, regrow: 72,  ticks: 700, amt: 3, act: 'Chopping',   verb: 'chop', icon: '🪓' },
  rock:  { res: 'stone', charges: 4, regrow: 96,  ticks: 900, amt: 2, act: 'Mining',     verb: 'mine', icon: '⛏' },
  wreck: { res: 'mat',   charges: 2, regrow: 120, ticks: 800, amt: 2, act: 'Salvaging',  verb: 'salvage', icon: '🔧' },
  bin:   { res: 'cloth', charges: 2, regrow: 96,  ticks: 500, amt: 1, act: 'Searching',  verb: 'search', icon: '🧵' },   /* V3D.25 clothes bins, out past the walls */
};
const BIN_SPOTS = [[1, 1], [14, 1], [0, 19], [15, 19], [18, 9], [26, 3], [24, 18], [16, 27], [6, 28], [27, 28]].map(SH);
const ROCK_SPOTS = [[3, 1], [8, 1], [12, 1], [0, 9], [0, 13], [15, 9], [15, 14], [2, 20], [9, 21], [14, 20], [18, 4], [23, 8], [19, 15], [25, 13], [22, 20], [17, 25], [11, 27], [5, 25], [25, 24], [21, 11]].map(SH);
/* 3D.101 the new outer ring (the OFF-wide frame added round the old map) gets its own trees, rocks and clothes bins; the highway
   gets abandoned cars to salvage (they also block one lane here and there: it's broken down) */
{ const frame = (x, y) => x < OFF || y < OFF || x >= COLS - OFF || y >= ROWS - OFF, h2 = (x, y) => { let n = (x * 73856093) ^ (y * 19349663); n = (n ^ (n >>> 13)) * 1274126177; return ((n ^ (n >>> 16)) >>> 0) / 4294967296; };
  const near = (x, y) => [-1, 0, 1, 2].some((d) => Wd.hwyAt(x, y + d) || Wd.hwyAt(x + d, y));
  for (let y = 0; y < ROWS; y++) for (let x = 0; x < COLS; x++) { if (!frame(x, y) || near(x, y)) continue; const r = h2(x, y);
    if (r < .075) TREE_SPOTS.push([x, y]); else if (r < .1) ROCK_SPOTS.push([x, y]); else if (r < .11) BIN_SPOTS.push([x, y]); }
  for (const [x, y] of [[2, Wd.HWY_Y], [7, Wd.HWY_Y + 1], [13, Wd.HWY_Y], [26, Wd.HWY_Y + 1], [31, Wd.HWY_Y], [37, Wd.HWY_Y + 1]]) CAR_SPOTS.push([x, y]);
  for (const L of [TREE_SPOTS, ROCK_SPOTS, BIN_SPOTS, CRATE_SPOTS, DEBRIS_SPOTS]) for (let i = L.length - 1; i >= 0; i--) if (near(L[i][0], L[i][1])) L.splice(i, 1); }   // nothing old sits on the road

/* 3D.132 review step 9: four lands to settle. A map decides where the trees, rock, wrecks and clothes bins are, so each one changes what
   comes easily and what has to be fetched or traded for. 'road' is the land every town used until now. The lists are rebuilt in place
   (the 3D view and the node code hold on to the same arrays). Thinning and adding use fixed hashes, so a map is the same every time. */
const MAPS = {
  road:     { name: 'Roadside',     icon: '🛣️', desc: 'The usual land: a bit of everything.' },
  pines:    { name: 'Pine Hollow',  icon: '🌲', desc: 'Thick woods. Wood is easy; scrap and stone are scarce.', tree: .1, rockKeep: .5, wreck: .05 },
  ridge:    { name: 'Quarry Ridge', icon: '⛰️', desc: 'Bare rock. Stone is easy; wood is scarce.', rock: .08, treeKeep: .45, wreck: .09 },
  junction: { name: 'The Junction', icon: '🚗', desc: 'A choked crossroads. Wrecks and clothes bins everywhere; few trees.', car: .035, bin: .03, treeKeep: .55, wreck: .2 },
};
const MAP_BASE = { tree: TREE_SPOTS.map((p) => [...p]), rock: ROCK_SPOTS.map((p) => [...p]), car: CAR_SPOTS.map((p) => [...p]), bin: BIN_SPOTS.map((p) => [...p]) };
let curMap = 'road';
function setMap(k) { k = MAPS[k] ? k : 'road'; const M = MAPS[k]; S.map = k; curMap = k;
  const L = { tree: TREE_SPOTS, rock: ROCK_SPOTS, car: CAR_SPOTS, bin: BIN_SPOTS }; for (const q in L) { L[q].length = 0; L[q].push(...MAP_BASE[q].map((p) => [...p])); }
  if (k !== 'road') { const keep = (list, f, a, b) => { if (f == null) return; for (let i = list.length - 1; i >= 0; i--) if (hash2(list[i][0] * a + 3, list[i][1] * b + 5) >= f) list.splice(i, 1); };
    keep(TREE_SPOTS, M.treeKeep, 11, 17); keep(ROCK_SPOTS, M.rockKeep, 13, 7);
    const used = new Set([...TREE_SPOTS, ...ROCK_SPOTS, ...CAR_SPOTS, ...BIN_SPOTS, ...CRATE_SPOTS, ...DEBRIS_SPOTS].map(([x, y]) => x + ',' + y)), core = (x, y) => x >= OFF + 2 && x <= OFF + 13 && y >= OFF + 5 && y <= OFF + 16,   /* the camp and its first buildings stay clear */
      road = (x, y) => [-1, 0, 1, 2].some((d) => Wd.hwyAt(x, y + d) || Wd.hwyAt(x + d, y)), t = M.tree || 0, r = t + (M.rock || 0), c = r + (M.car || 0), b = c + (M.bin || 0);
    for (let y = 0; y < ROWS; y++) for (let x = 0; x < COLS; x++) { if (core(x, y) || road(x, y) || used.has(x + ',' + y)) continue; const h = hash2(x * 31 + 7, y * 19 + 11);
      if (h < t) TREE_SPOTS.push([x, y]); else if (h < r) ROCK_SPOTS.push([x, y]); else if (h < c) CAR_SPOTS.push([x, y]); else if (h < b) BIN_SPOTS.push([x, y]); } }
  wreckKey = ''; S.nodeVer = (S.nodeVer || 0) + 1; }

const nodeKey = (x, y) => x + ',' + y;
function nodeList() {
  return [...TREE_SPOTS.map(([x, y]) => ({ k: 'tree', x, y })), ...ROCK_SPOTS.map(([x, y]) => ({ k: 'rock', x, y })), ...[...CAR_SPOTS, ...wreckSpots()].map(([x, y]) => ({ k: 'wreck', x, y })), ...BIN_SPOTS.map(([x, y]) => ({ k: 'bin', x, y }))];
}
function nodeKindAt(x, y) { if (TREE_SPOTS.some(([a, b]) => a === x && b === y)) return 'tree'; if (ROCK_SPOTS.some(([a, b]) => a === x && b === y)) return 'rock'; if ([...CAR_SPOTS, ...wreckSpots()].some(([a, b]) => a === x && b === y)) return 'wreck'; if (BIN_SPOTS.some(([a, b]) => a === x && b === y)) return 'bin'; return null; }
function treeNode(x, y) { S.nodes ||= {}; const k = nodeKey(x, y); return S.nodes[k] || (S.nodes[k] = { left: NODE[nodeKindAt(x, y) || 'tree'].charges, regrow: 0, mark: false }); }
function treeBlocked(x, y) { return !!(Wd.buildingAt(world, x, y) || Wd.wallAt(world, x, y) || Wd.isRoad(world, x, y) || (S.sites || []).some((q) => x >= q.x && x < q.x + q.w && y >= q.y && y < q.y + q.h)); }
function nodeState(x, y) { if (treeBlocked(x, y)) return null; const n = (S.nodes || {})[nodeKey(x, y)]; return !n || n.left > 0 ? (n && n.mark ? 'marked' : 'full') : 'empty'; }
function treeState(x, y) { const st = nodeState(x, y); return st === 'full' ? 'tree' : st === 'empty' ? 'stump' : st; }   /* (renderer: trees) */
const isTreeSpot = (x, y) => !!nodeKindAt(x, y);
function nodesTick() {   // once a game hour: emptied nodes come back
  let ch = false; for (const n of Object.values(S.nodes || {})) if (n.left <= 0 && nowH() >= n.regrow) { n.left = 99; ch = true; }
  for (const [k, n] of Object.entries(S.nodes || {})) if (n.left === 99) { const [x, y] = k.split(',').map(Number); n.left = NODE[nodeKindAt(x, y) || 'tree'].charges; }
  if (ch) S.nodeVer = (S.nodeVer || 0) + 1;
}
const RARE = ['cloth', 'meds', 'fuel'], rareCap = () => 20 + 10 * storeTiers();   /* V3D.25 rare resources */
const resCap = (r) => r === 'mat' ? scrapCap() : r === 'ammo' ? ammoCap() : RARE.includes(r) ? rareCap() : matCap();
function resWant(r) {   // how badly the town wants more of r right now (0 = not at all)
  if (S.gatherPause && S.gatherPause[r]) return 0;   /* 3D.41 Wood / Stone panel: pause all chopping or mining */
  const need = jobList().reduce((a, { j }) => a + Math.max(0, (j.need[r] || 0) - (j.got[r] || 0) - (j.inb[r] || 0)), 0), have = S[r] || 0;
  if (have >= resCap(r) - 1) return 0;
  if (need > have) return 3 + Math.min(3, (need - have) / 4);
  if (r === 'wood') return have < 25 ? 1.4 : .8;
  if (r === 'stone') return hqTier() >= 2 ? (have < 20 ? 1 : .5) : need ? 1 : .08;
  if (r === 'cloth') return have < 6 ? .5 : .15;
  return have < 8 ? 1.8 : have < 15 ? 1 : .5;
}
function tryGather(s) {
  if (isNight() || s.job === 'Guard') return false;   /* 3D.64 owner: Guards don't chop wood; they patrol */
  const busy = new Set(S.sv.filter((q) => q !== s && q.gatherAt).map((q) => q.gatherAt)), town = { x: (Wd.BUILD.x0 + Wd.BUILD.x1 + 1) / 2, y: (Wd.BUILD.y0 + Wd.BUILD.y1 + 1) / 2 };
  const live = nodeList().filter((n) => { const st = nodeState(n.x, n.y); return (st === 'full' || st === 'marked') && !busy.has(nodeKey(n.x, n.y)) && resWant(NODE[n.k].res) > 0 && !zombieNear(tc(n.x, n.y), 6); });
  const near = (l) => l.sort((a, b) => dist(s.w, tc(a.x, a.y)) - dist(s.w, tc(b.x, b.y)))[0];
  let t = null; const marked = live.filter((n) => nodeState(n.x, n.y) === 'marked');
  if (marked.length && rnd() < .9) t = near(marked);
  else {
    const W = { wood: resWant('wood'), stone: resWant('stone'), mat: resWant('mat'), cloth: resWant('cloth') }, tot = W.wood + W.stone + W.mat + W.cloth; if (tot <= 0) return false;
    if (rnd() > Math.min(.85, .35 + tot * .12)) return false;
    let r = rnd() * tot, res = 'wood'; for (const k of ['wood', 'stone', 'mat', 'cloth']) { if ((r -= W[k]) <= 0) { res = k; break; } }
    t = near(live.filter((n) => NODE[n.k].res === res && dist(tc(n.x, n.y), town) < (res === 'cloth' ? 15 : 12)));
  }
  if (!t) return false;
  const c = tc(t.x, t.y), dx = s.w.x - c.x, dy = s.w.y - c.y, d = Math.hypot(dx, dy) || 1;
  s.gatherAt = nodeKey(t.x, t.y); s.gatherK = t.k; s.dest = { x: c.x + dx / d * .5, y: c.y + dy / d * .5 }; s.mode = 'walk'; s.purpose = 'gath-out'; s.path = null; s.stateTicks = 2400;
  s.why = nodeState(t.x, t.y) === 'marked' ? `Off to ${NODE[t.k].verb} the marked ${t.k}` : { tree: 'Chopping wood', rock: 'Breaking rocks for stone', wreck: 'Salvaging scrap from a wreck', bin: 'Searching a clothes bin for cloth' }[t.k]; return true;
}
function gatherTick(s) {
  s.moving = false; const [x, y] = (s.gatherAt || '').split(',').map(Number), st = s.gatherAt ? nodeState(x, y) : null, K = NODE[s.gatherK || 'tree'];
  if (!st || st === 'empty') { s.gatherAt = null; s.activity = null; enterFree(s, 20); return; }
  s.faceW = tc(x, y);
  if (s.stateTicks > 0) return;
  const n = treeNode(x, y); n.left--; if (n.left <= 0) { n.regrow = nowH() + K.regrow; n.mark = false; } S.nodeVer = (S.nodeVer || 0) + 1;
  const bonus = (K.res === 'wood' ? (s.job === 'Scavenger' || s.job === 'Farmer' ? 1 : 0) : K.res === 'stone' ? (s.job === 'Engineer' ? 1 : 0) : (s.job === 'Scavenger' ? 1 : 0)) + (stat(s, 'str') >= 7 ? 1 : 0);
  if (s.gatherK === 'wreck' && rnd() < .4) {   /* 3D.131 was .22 */ S.fuel = Math.min(rareCap(), (S.fuel || 0) + 1); flow('fuel', 'Siphoned from wrecks', 1); floats.push({ w: { ...s.w }, t: '+1 ⛽', col: '#ffb36b', a: 80, big: true }); bark(s, 'fuel', {}, { pri: 1 }); }   /* V3D.25: a wreck sometimes still has fuel in the tank */
  if (rnd() < .2) bark(s, { tree: 'chop', rock: 'mine', wreck: 'wreck', bin: 'bin' }[s.gatherK || 'tree']);
  s.carriedLoot = K.res; s.carryAmt = (K.res === 'cloth' ? K.amt + (rnd() < .4 ? 1 : 0) : K.amt + bonus + TOOL_AMT[toolLvl(s.gatherK || 'tree', true)]) + carryBonus(s);   /* 3D.28 backpacks */ s.gatherAt = null; s.faceW = null; s.activity = null; gainXp(s, 1);
  const jb = jobFor(K.res); s.gjob = null;
  if (jb) { jb.j.inb[K.res] = (jb.j.inb[K.res] || 0) + s.carryAmt; s.gjob = jb.j.id; s.dest = jobPt(jb); s.why = `Bringing ${RES_ICON[K.res]} to the ${jobName(jb)}`; }
  else { s.dest = depotPt(s); s.why = { wood: 'Carrying logs home', stone: 'Carrying stone home', mat: 'Carrying scrap home', cloth: 'Bringing cloth home' }[K.res]; }
  s.mode = 'walk'; s.purpose = 'gath-back'; s.path = null; s.stateTicks = 2400;
}
/* 3D.115 owner: people were dropping supplies through the fence. A load now only counts once the carrier reaches the door;
   if the way is blocked they try another storage door they can walk to, and otherwise keep hold of it and say why. */
const depots = () => [...bOf('storage'), ...world.buildings.filter((b) => DEFS[b.type].role === 'hq')].filter((b) => !b.burnt);
function reachDepot(s, not) { for (const b of depots().sort((a, c) => dist(s.w, Wd.approachPoint(a)) - dist(s.w, Wd.approachPoint(c)))) { const pt = Wd.approachPoint(b); if (not && dist(pt, not) < .6) continue; if (Wd.findPath(world, tileOf(s.w), tileOf(pt), false, 0)) return pt; } return null; }
function canDeliver(s) { if (s.dest && dist(s.w, s.dest) < 1.4) return true;
  const alt = reachDepot(s, s.dest);
  if (s.haul) { const h = s.haul, x = jobById(h.id); if (x) x.j.inb[h.r] = Math.max(0, (x.j.inb[h.r] || 0) - h.n); s.carriedLoot = h.r; s.carryAmt = h.n; s.haul = null; }   /* the site can't be reached: it goes back to storage instead */
  if (s.gjob != null) { const jb = jobById(s.gjob); if (jb) jb.j.inb[s.carriedLoot] = Math.max(0, (jb.j.inb[s.carriedLoot] || 0) - (s.carryAmt || 0)); s.gjob = null; }
  if (alt) { s.dest = alt; s.path = null; s.stateTicks = 2400; s.mode = 'walk'; s.purpose = 'gath-back'; s.why = 'That door is blocked: taking the load round to another'; return false; }
  s.purpose = null; s.path = null; s.mode = 'free'; s.stateTicks = 600; s.dest = null; s.why = "Can't reach a storage door with this load: is the entrance walled in?";
  if (S.noDropDay !== S.day) { S.noDropDay = S.day; note('important', '📦 A LOAD CAN\'T GET IN', { log: `${s.name} can't reach a storage door with their load. Check that storage and HQ entrances aren't walled off and that the fence has a gate.`, at: s.w }); }
  return false; }
function depotPt(s) {   // the HQ or the nearest storage
  const l = depots().sort((a, b) => dist(s.w, Wd.approachPoint(a)) - dist(s.w, Wd.approachPoint(b)));
  return (l.length && (reachDepot(s) || Wd.approachPoint(l[0]))) || tc(7 + OFF, 9 + OFF);
}
function dropWood(s) {   // (name kept) drop whatever the survivor carries: into a job that wants it, else into the stockpile
  const n = s.carryAmt || 0, r = s.carriedLoot; s.carriedLoot = null; s.carryAmt = 0; if (!n || !RES_ICON[r]) { s.gjob = null; return; }
  let left = n; const jb = s.gjob != null ? jobById(s.gjob) : null; s.gjob = null;
  if (jb) { const j = jb.j; j.inb[r] = Math.max(0, (j.inb[r] || 0) - n); const add = Math.max(0, Math.min(left, (j.need[r] || 0) - (j.got[r] || 0))); j.got[r] = (j.got[r] || 0) + add; left -= add; if (add) jobDelivered(jb, r, add, s); }
  if (left > 0) { const got = Math.max(0, Math.min(left, resCap(r) - (S[r] || 0))); S[r] = (S[r] || 0) + got; flow(r, { wood: 'Chopped trees', stone: 'Mined rocks', mat: 'Salvaged wrecks', cloth: 'Clothes bins' }[r] || 'Gathered', got);
    floats.push({ w: { ...s.w }, t: got ? '+' + got + ' ' + RES_ICON[r] : RES_TITLE[r] + ' full', col: '#e8b878', a: 80, big: true }); if (got) SFX('reward'); else bark(s, 'full', { r: RES_NAME[r] }, { pri: 1 }); }
  ui();
}
function tapTree(x, y) {   // tap a node: mark / unmark it
  const k = nodeKindAt(x, y), st = nodeState(x, y); if (!k || !st) return false; const K = NODE[k], nm = { tree: 'Tree', rock: 'Rock', wreck: 'Wreck', bin: 'Clothes bin' }[k];
  if (st === 'empty') { const n = treeNode(x, y); say(`${k === 'tree' ? 'Stump' : k === 'rock' ? 'Broken rock' : k === 'bin' ? 'Empty bin' : 'Stripped wreck'}: back in about ${Math.max(1, Math.ceil(n.regrow - nowH()))} h.`, true); return true; }
  const n = treeNode(x, y); n.mark = !n.mark; S.nodeVer = (S.nodeVer || 0) + 1;
  if (n.mark) barkSomeone('mark', {}, { pri: 1 }, tc(x, y));
  say(n.mark ? `${nm} marked: a free survivor will ${K.verb} it next (${n.left} left, ${K.amt} ${RES_NAME[K.res]} each).` : 'Mark removed.', true); saveGame(); return true;
}
/* ---------------- V3D.26 tools: town-wide axe / pickaxe / wrecking bar tiers, crafted at the Workbench or Workshop ----------------
   Better tools gather faster and bring more per load. Power tools (tier 3) burn a little fuel each use and fall back to
   steel speed when the fuel runs out. */
const TOOLS = {
  axe:  { node: 'tree',  icon: '🪓', tiers: [{ n: 'Rusty Axe' }, { n: 'Steel Axe', cost: { wood: 6, mat: 4 }, need: 1 }, { n: 'Chainsaw', cost: { mat: 12, fuel: 3 }, need: 2 }] },
  pick: { node: 'rock',  icon: '⛏', tiers: [{ n: 'Rusty Pick' }, { n: 'Steel Pickaxe', cost: { wood: 5, mat: 5 }, need: 1 }, { n: 'Jackhammer', cost: { mat: 14, stone: 6, fuel: 3 }, need: 2 }] },
  bar:  { node: 'wreck', icon: '🔧', tiers: [{ n: 'Pry Bar' }, { n: 'Wrecking Bar', cost: { wood: 5, mat: 4 }, need: 1 }, { n: 'Power Cutter', cost: { mat: 12, fuel: 3 }, need: 2 }] },
};
const TOOL_SPEED = [1, 1.5, 2.2], TOOL_AMT = [0, 1, 2];
const toolOf = (node) => Object.keys(TOOLS).find((k) => TOOLS[k].node === node);
function toolLvl(node, use) {   // effective tier for a gather; use = spend the power tool's fuel
  const k = toolOf(node); if (!k) return 0; const t = (S.tools || {})[k] || 0;
  if (t >= 2) { if ((S.fuel || 0) >= .15 + 3 * gens().length) {   /* audit: a day of generator fuel stays in the tank */ if (use) { S.fuel -= .15; flow('fuel', 'Power tools', -.15); } return 2; } return 1; } return t;
}
const benchTier = () => Math.max(0, ...world.buildings.filter((b) => DEFS[b.type].fam === 'research' && !b.burnt).map((b) => DEFS[b.type].tier || 1));
function craftTool(k) {
  const T = TOOLS[k], cur = (S.tools ||= {})[k] || 0, nx = T.tiers[cur + 1]; if (!nx) return false;
  if (benchTier() < nx.need) { say(`${nx.n} needs a ${nx.need >= 2 ? 'Workshop' : 'Workbench'}.`); return false; }
  if (!canPay(nx.cost)) { say(`${nx.n}: still need ${missText(nx.cost)}.`); return false; }
  payCost(nx.cost); S.tools[k] = cur + 1; SFX('reward'); banner(`${T.icon} ${nx.n.toUpperCase()} READY`); barkSomeone('tool', {}, { pri: 1 });
  say(`${nx.n}: everyone ${T.node === 'tree' ? 'chops' : T.node === 'rock' ? 'mines' : 'salvages'} ${Math.round((TOOL_SPEED[cur + 1] - 1) * 100)}% faster and brings ${TOOL_AMT[cur + 1]} more per load${cur + 1 >= 2 ? ' (uses a little fuel)' : ''}.`, true); saveGame(); ui(); return true;
}
function toolsCard() {
  return `<div class="card"><b>🧰 Tools</b><div class="sm">Shared by the whole camp. Better tools gather faster and carry more.</div>` + Object.entries(TOOLS).map(([k, T]) => { const cur = (S.tools || {})[k] || 0, nx = T.tiers[cur + 1];
    return `<div class="row" style="gap:6px;margin-top:6px"><span style="font-size:20px">${T.icon}</span><span class="sp"><b>${T.tiers[cur].n}</b>${nx ? `<br><small>Next: ${nx.n} · ${costShort(nx.cost)}${benchTier() < nx.need ? ' · needs a ' + (nx.need >= 2 ? 'Workshop' : 'Workbench') : ''}</small>` : '<br><small>Best there is</small>'}</span>${nx ? `<button class="act${benchTier() >= nx.need && canPay(nx.cost) ? ' go' : ''}" data-ctool="${k}" ${benchTier() >= nx.need ? '' : 'disabled'}>Craft</button>` : ''}</div>`; }).join('') + '</div>';
}
/* ---------------- V3D.26 power: Generators burn fuel (1 per 8 h each); while running they light the camp at night and
   give buildings within 5 tiles +20% output. The Radio Tower needs power to send the rescue signal. */
const gens = () => world.buildings.filter((b) => b.type === 'generator' && !b.burnt);
const POWER_PER_GEN = 4;
const renewPower = () => world.buildings.reduce((a, b) => a + (b.burnt || b.fire ? 0 : b.type === 'turbine' ? 2 : b.type === 'solar' && S.hour >= 6 && S.hour < 19 ? 3 : 0), 0);   /* 3D.104 Wind Turbine and Solar Array: power without fuel */
const POWER_ORDER = ['pump', 'hospital', 'coldstore', 'greenhouse', 'floodlight', 'radio', 'ammofactory'];   /* audit: water first; a blackout must never starve the town */
const PUMP_HAND = .3;   /* without power the pump is worked by hand at 30% */
const genFuel = (b) => .125 * (b.staff && b.staff.job === 'Mechanic' ? (hasSkill(b.staff, 'fuelSaver') ? .5 : .75) : 1);   /* 3D.77: a Mechanic saves fuel */
let genRun = [];   /* the Generators running this hour (not saved: rebuilt by powerTick) */
function powerGrid() {   /* 3D.77: which powered buildings get power (hourly, on load, and when buildings change) */
  const sup = (S.power ? genRun.filter((g) => world.buildings.includes(g) && !g.burnt).reduce((a, g) => a + POWER_PER_GEN + (g.staff && hasSkill(g.staff, 'gearhead') ? 2 : 0) + (g.staff && hasSpec(g.staff, 'electrician') ? 2 : 0), 0) : 0) + renewPower();
  const users = world.buildings.filter((b) => DEFS[b.type] && DEFS[b.type].power && !b.burnt).sort((a, b) => POWER_ORDER.indexOf(a.type) - POWER_ORDER.indexOf(b.type));
  let left = sup, need = 0; const off = [];
  for (const b of users) { const n = DEFS[b.type].power; need += n; b.pw = left >= n; if (b.pw) left -= n; else off.push(DEFS[b.type].name); }
  S.pSup = sup; S.pNeed = need; S.pUse = sup - left; return off;
}
const powered = (b) => !!(b && b.pw && !b.burnt);
const anyPowered = (t) => world.buildings.some((b) => b.type === t && powered(b));
function powerTick() {   // hourly: run as many Generators as the fuel allows (Mechanic-run ones first: they burn less)
  const all = [...gens()].sort((a, b) => genFuel(a) - genFuel(b)); let fuel = S.fuel || 0; const run = [];
  for (const g of all) { const f = genFuel(g); if (fuel < f) break; fuel -= f; run.push(g); }
  const burn = (S.fuel || 0) - fuel; if (burn > 0) { S.fuel = fuel; flow('fuel', 'Generator', -burn); }
  const was = S.power; S.power = run.length > 0 || renewPower() > 0; genRun = run;
  if (S.power && !was) { say('⚡ The generator is running.', true); barkSomeone('power', {}, { pri: 1 }); }
  if (!S.power && was) { barkSomeone('noPower', {}, { pri: 1 }); note('important', '⚡ The generator ran out of fuel: send a squad to the Gas Station, salvage wrecks, or run a Fuel Still', { key: 'nofuel', icon: '⛽' }); }
  const off = powerGrid();
  if (off.length && S.power) note('important', `⚡ Not enough power: ${[...new Set(off)].join(', ')} ${off.length > 1 ? 'are' : 'is'} off. Build or fuel another Generator.`, { key: 'lowpower', icon: '⚡' });
  if (off.length && !S.power && all.length) note('important', `⚡ No power: ${[...new Set(off)].join(', ')} ${off.length > 1 ? 'are' : 'is'} off until a Generator has fuel.`, { key: 'lowpower', icon: '⚡' });
}
const nearR = (a, b, r) => Math.hypot(a.x + a.w / 2 - (b.x + b.w / 2), a.y + a.h / 2 - (b.y + b.h / 2)) <= r;
const powerBoost = (b) => S.power && genRun.length && b.type !== 'generator' && (gens().some((g) => nearR(g, b, 5)) || bOf('pole').some((p) => nearR(p, b, 5) && (gens().some((g) => nearR(g, p, 6)) || bOf('pole').some((q) => q !== p && nearR(q, p, 6) && gens().some((g) => nearR(g, q, 6)))))) ? 1.2 : 1;   /* 3D.104 Power Poles carry the boost further */
const radioOk = () => world.buildings.some((b) => b.type === 'radio' && !b.burnt && (b.pw === undefined ? S.power : b.pw)) && !!S.power;
/* ---------------- V3D.23 construction jobs: new sites (S.sites) and upgrades (b.upg) need their materials delivered ----------------
   Haulers take materials from the stockpile (deducted when they pick them up) and carry them to the job; gatherers bring
   fresh loads straight to it. Once everything is in, the work counts down (faster while someone hammers). */
function jobList() { return [...(S.sites || []).map((st) => ({ j: st, b: st, site: true })), ...world.buildings.filter((b) => b.upg).map((b) => ({ j: b.upg, b, site: false }))]; }
const jobById = (id) => jobList().find((x) => x.j.id === id) || null;
const jobName = (x) => DEFS[x.site ? x.j.type : x.j.to].name;
const jobPt = (x) => Wd.approachPoint(x.b);
const jobReady = (j) => Object.entries(j.need || {}).every(([k, v]) => (j.got[k] || 0) >= v);
const jobMiss = (j) => Object.fromEntries(Object.entries(j.need || {}).map(([k, v]) => [k, v - (j.got[k] || 0)]).filter(([, v]) => v > 0));
function newJob(o, cost) { const sum = Object.values(cost).reduce((a, v) => a + v, 0), dur = Math.round(Math.min(4800, 900 + sum * 45)); return Object.assign(o, { id: (S.jobSeq = (S.jobSeq || 0) + 1), need: { ...cost }, got: {}, inb: {}, cons: dur, dur, made: tick }); }
function jobFor(r) { return jobList().filter(({ j }) => (j.need[r] || 0) - (j.got[r] || 0) - (j.inb[r] || 0) > 0).sort((a, b) => a.j.id - b.j.id)[0] || null; }
function jobDelivered(x, r, n, s) {
  floats.push({ w: { ...(s ? s.w : jobPt(x)) }, t: '+' + n + ' ' + RES_ICON[r], col: '#ffe07a', a: 80, big: true });
  if (jobReady(x.j) && !x.j.readyMsg) { x.j.readyMsg = true; say(`${jobName(x)}: all materials are in, building now.`, true); SFX('chime'); }
}
function tryHaul(s) {
  for (const x of jobList().sort((a, b) => a.j.id - b.j.id)) {
    if (zombieNear(jobPt(x), 5)) continue;
    for (const [r, v] of Object.entries(x.j.need)) {
      const m = v - (x.j.got[r] || 0) - (x.j.inb[r] || 0), have = Math.floor(S[r] || 0); if (m <= 0 || have < 1) continue;
      const n = Math.min(m, have, (5 + carryBonus(s) * 2) * (s.job === 'Civilian' ? 2 : 1));   /* 3D.67: Civilians carry twice as much */ S[r] -= n; x.j.inb[r] = (x.j.inb[r] || 0) + n; x.j.lastHaul = tick; s.haul = { r, n, id: x.j.id }; if (rnd() < .12) bark(s, 'haul', { b: jobName(x) });
      s.dest = depotPt(s); s.mode = 'walk'; s.purpose = 'haul-get'; s.path = null; s.stateTicks = 2400; s.why = `Fetching ${n} ${RES_NAME[r]} for the ${jobName(x)}`; return true;
    }
  }
  return false;
}
function cancelHaul(s) { const h = s.haul; s.haul = null; if (!h) return; S[h.r] = (S[h.r] || 0) + h.n; const x = jobById(h.id); if (x) x.j.inb[h.r] = Math.max(0, (x.j.inb[h.r] || 0) - h.n); if (s.carriedLoot === h.r) { s.carriedLoot = null; s.carryAmt = 0; } }
function tryHammer(s) {   // help a job whose materials are all in
  const x = jobList().find(({ j, b }) => jobReady(j) && (j.hammer || 0) < 2 && !zombieNear(Wd.approachPoint(b), 5)); if (!x) return false;
  x.j.hammer = (x.j.hammer || 0) + 1; s.hammerJob = x.j.id; if (rnd() < .3) bark(s, 'hammer', { b: jobName(x) }); s.dest = jobPt(x); s.mode = 'walk'; s.purpose = 'build-go'; s.path = null; s.stateTicks = 2400; s.why = `Building the ${jobName(x)}`; return true;
}
function endHammer(s) { const x = s.hammerJob != null ? jobById(s.hammerJob) : null; if (x) x.j.hammer = Math.max(0, (x.j.hammer || 0) - 1); s.hammerJob = null; }
function hammerTick(s) {
  s.moving = false; const x = s.hammerJob != null ? jobById(s.hammerJob) : null; if (!x) { endHammer(s); s.activity = null; enterFree(s, 20); return; }
  s.faceW = { x: x.b.x + x.b.w / 2, y: x.b.y + x.b.h / 2 }; s.activity = 'Building';
  if (x.j.cons > 0) x.j.cons -= 1.2 * TUNE.work * (s.job === 'Engineer' ? 1.4 : s.job === 'Civilian' ? 1.2 : 1) * (gearFx(s, 'build') ? 1.3 : 1);   /* 3D.28 Tool Belt */
  if (s.stateTicks <= 0 || x.j.cons <= 0) { gainXp(s, 1); endHammer(s); s.activity = null; s.faceW = null; enterFree(s, 20); }
}
const hqB = () => world.buildings.find((b) => DEFS[b.type] && DEFS[b.type].role === 'hq') || null;
const hqTier = () => { const b = hqB(); return b ? DEFS[b.type].tier : 1; };
function settlePause(s, min = 150, max = 330) { if (s.purpose && s.purpose.startsWith('gath')) { s.gatherAt = null; } s.purpose = null; s.mode = 'wait'; s.dest = null; s.path = null; s.moving = false; s.stateTicks = min + rnd() * (max - min); s.idleBubble = ['💭', '👀', '🙂', '💬'][Math.floor(rnd() * 4)]; if (!s.why.startsWith('Idle')) s.why = 'Idle · taking a breather'; }
const wakeOff = (s) => ((s.id * 263) % 1500) - 500 + (hasT(s, 'owl') ? 900 : 0);   /* 3D.63 study: the whole town woke at exactly 6:00; now 5:30–7:00 per person (owls later) */
function enterFree(s, d = 110) { s.sleeping = false; s.mode = 'free'; s.target = null; s.activity = null; s.stateTicks = d; s.dest = null; s.path = null; s.moving = false; s.purpose = null; }
function enterPost(s) { { const w = weaponOf(s); if (w.mag && (s.ammo == null ? w.mag : s.ammo) <= w.mag / 2 && !(s.reloadT > 0)) s.reloadT = Math.round(w.reload * 60);   /* lull: reload a half-empty gun (keeps the rounds left until it's done) */ } s.mode = 'postCombat'; s.target = null; s.stateTicks = 135 + (s.i % 8) * 24; s.moving = false; s.path = null; s.why = 'Catching breath after a fight'; }
function needScore(s, b) {
  const r = facilityRules[b.type]; if (!r || b.fire || b.burnt) return -999; if (isT(b, 'house') && b.owner && b.owner !== s.id) return -999; let sc = 0;
  if ((r.need === 'hunger' && S.food < .5) || (r.need === 'thirst' && S.water < .5)) return -999;   /* V3D.15: no trips to an empty canteen or water point */
  if (s.avoid && (s.avoid[b.type] || 0) > tick) return -999;   /* V3D.15: recently looped here: give it a rest */
  if (zombieNear(Wd.doorPoint(b), (s.wary || 0) > tick ? 7 : 4.5) && !isFighter(s) && !((r.need === 'thirst' && s.thirst >= 95) || (r.need === 'hunger' && s.hunger >= 95))) return -999;   /* 3D.63: desperate enough, they risk it (they went to eat while dying of thirst because zombies were near the only barrel) */   /* V3D.17: don't walk to a door with zombies at it (this was the house ↔ rain collector loop) */
  if (r.need === 'injury' && (s.hunger >= 100 || s.thirst >= 100) && s.hp > s.max * .35) return -999;   /* starving: care can't fix that, food can */
  if (r.need === 'hunger') sc += s.hunger * 1.4; if (r.need === 'thirst') sc += s.thirst * 1.5; if (r.need === 'fatigue') sc += s.fatigue * (isNight() || s.fatigue >= 70 ? 1.2 : .6) + (isNight() && s.fatigue > 15 ? 45 : 0);   /* 3D.63: by day a nap only wins once they're really tired (a third of the town napped through lunch) */   /* V2.36: nights are for sleeping */
  if (r.need === 'injury') sc += (1 - s.hp / s.max) * 140 * (policy() === 'recover' ? 1.5 : 1) + (s.wounded ? 45 : 0);   /* 3D.67: a field wound needs a medical building */
  if (r.need === 'gear') sc += gearUpgrade(s) ? 75 : 0;
  if (r.need === 'train') {   /* V2.14: free time goes into self-improvement, favouring the stats their job uses */
    const base = (s.st && s.st[r.stat]) || 5; if (base >= STAT_CAP) return -999;
    sc += 22 + (STAT_CAP - base) * .9 + ((JOB_STATS[s.job] || []).includes(r.stat) ? 12 : 0) - Math.max(s.hunger, s.thirst, s.fatigue) * .35 - (isNight() ? 20 : 0) - (s.trainDay === S.day ? (s.trainN || 0) * 16 : 0);   /* 3D.63: a couple of sessions a day, not all free time */
  }
  if ((r.need === 'hunger' && S.food < 1) || (r.need === 'thirst' && S.water < 1)) sc -= 90;
  sc += b.a * .35 + b.q * .45; if (s.lastFacility === b) sc -= 30;
  sc -= dist(s.w, Wd.doorPoint(b)) * 1.2;       // nearer is better
  return sc;
}
const useCap = (b) => { const n = facilityRules[b.type] && facilityRules[b.type].need; return n === 'hunger' || n === 'thirst' ? Math.max(3, cap(b)) : cap(b); };   /* 3D.63 study: a Rain Barrel or Garden Plot let one person at a time eat or drink, so with 8+ people half the town queued thirsty all day */
const URGENT_FOR = { Hungry: 'hunger', Thirsty: 'thirst', Exhausted: 'fatigue', Hurt: 'injury' };   /* 3D.63 study: a thirsty worker's 'quick break' picked whichever facility scored best (often a Tent to nap in), so the thirst was never fixed */
function chooseFacility(s, urgentOnly = false, need = null) {
  let bed; const nr = s.noReach && s.noReach.t > tick ? s.noReach.b : null; const c = world.buildings.filter((b) => b !== nr && facilityRules[b.type] && facilityUsers(b) < useCap(b) && (!urgentOnly || URGENT_NEEDS.includes(facilityRules[b.type].need)) && (!need || facilityRules[b.type].need === need) && (facilityRules[b.type].need !== 'fatigue' || b === (bed === undefined ? (bed = bedFor(s)) : bed))); if (!c.length) return null;   /* 3D.30: rest only in your own housing (or the Camp) */
  c.sort((a, b) => needScore(s, b) - needScore(s, a)); return need || needScore(s, c[0]) > 24 ? c[0] : null;
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
const canFight = (q) => q.hp > q.max * Math.max(.5, (retreatPct() + traitRetreat(q)) / 100 + .05) && !(q.fleeT > 0);   /* 3D.63 study: every call to arms uses the same bar as falling back (SOS at 50% vs a 60-90% retreat pulled hurt fighters back and forth) */
const retreatPct = () => (S.retreat ?? 35) + (policy() === 'recover' ? 15 : policy() === 'defend' ? -5 : 0);
function setPolicy(k) { if (!POLICIES[k]) return; S.policy = k; note('important', `${POLICIES[k].icon} POLICY: ${POLICIES[k].name.toUpperCase()}`, { log: `Town policy set to ${POLICIES[k].name}: ${POLICIES[k].desc}` }); saveGame(); }
const URGENT_NEEDS = ['hunger', 'thirst', 'fatigue', 'injury'];
const SHIFT = [[7, 12], [13, 18]];
const shifts = () => policy() === 'produce' ? [[7, 12], [13, 19]] : policy() === 'recover' ? [[7, 12], [13, 16]] : SHIFT;
const chopOn = (s) => s.chop ?? !s.post;   /* 3D.30 Gather toggle: on = also chops wood / gathers (workers split their shift), off = sticks to the job */
const onShift = (s) => !!(s.post && s.post.staff === s && world.buildings.includes(s.post) && !s.post.burnt && shifts().some(([a, b]) => S.hour >= a && S.hour < b));
function urgentNeed(s, leave = false) {   // what is bad enough to stop working for (a higher bar to walk off the job than to delay going back)
  const k = (leave ? 1.2 : 1) * (policy() === 'produce' ? 1.15 : policy() === 'recover' ? .85 : 1) * (hasT(s, 'diligent') ? 1.1 : 1); if (s.hunger >= 62 * k && S.food >= 1) return 'Hungry'; if (s.thirst >= 62 * k && S.water >= 1) return 'Thirsty'; if (s.fatigue >= 80 * k) return 'Exhausted'; if (s.hp < s.max * (leave ? .5 : .6) && medSite()) return 'Hurt'; return null;
}
function shiftLeft() { const sh = shifts().find(([a, b]) => S.hour >= a && S.hour < b); return sh ? Math.max(200, (sh[1] - S.hour) * 1000 - (tick % 1000)) : 0; }
const NEEDTXT = { hunger: 'Hungry', thirst: 'Thirsty', fatigue: 'Tired', injury: 'Hurt', gear: 'Wants better gear', train: 'Training' };
function chooseTownAction(s) { const b = chooseFacility(s); if (b && b !== s.lastFacility) { s.facility = b; s.mode = 'goFacility'; s.stateTicks = 9999; s.dest = null; s.path = null; s.why = `${NEEDTXT[facilityRules[b.type].need]} → ${DEFS[b.type].name}`; return true; } return false; }
// A zombie that is attacking this survivor (or about to) interrupts whatever they were doing — eating, drinking, working, strolling.
function threatOf(s) {
  let best = null, bd = 1e9; for (const z of S.z) { if (z.hp <= 0 || z.mode === 'appear' || z.zoo) continue; const d = dist(s.w, z.w), atkMe = z.target === s && ['zchase', 'zattack', 'zrecover'].includes(z.mode); if (s.fleeT > 0 ? (atkMe && d < 1.3) : ((atkMe && d < 3.2) || d < 1.7)) { if (d < bd) { bd = d; best = z; } } }
  return best;
}
/* 3D.48 owner: the last ones standing never fight. With only 1-2 people up and someone collapsed, they hide instead (the
   Camp first) and go for the fallen once the zombies have moved on. Hidden people are quiet: zombies bashing a building
   with only hiders inside lose interest after a while; if the building is about to fall, the hiders slip out to another one. */
const standing = () => S.sv.filter((q) => q.hp > 0 && !['down', 'away', 'hospital', 'errand'].includes(q.mode));
const zInTown = () => S.z.some((z) => z.hp > 0 && !z.zoo && !z.human && Wd.inTown(Math.floor(z.w.x), Math.floor(z.w.y)));
function lastStand() { return S.sv.some((q) => q.mode === 'down') && standing().length <= 2 && zInTown(); }
let hideGuard = false;
function engage(s, z) {
  if (z && !z.zoo && !hideGuard && lastStand()) { hideGuard = true; startHide(s, z); hideGuard = false; if (s.mode === 'hide') { s.why = 'Last ones standing: hiding until the zombies move on'; lastStandNote(); return; } }
  if (z && z.zoo) return;   /* 3D.32 test page: the line-up is only for looking */ s.facility = null; s.activity = null; s.dest = null; s.path = null; s.purpose = null; s.target = z; s.mode = 'chase'; s.stateTicks = 9999; s.moving = false; s.why = `Fighting a ${zombieTypes[z.type].name}`; }
function nearestZombie(s) { let best = null, bd = 1e9; for (const z of S.z) if (z.hp > 0 && !z.zoo) { const d = dist(s.w, z.w); if (d < bd) { bd = d; best = z; } } return best; }
const nearTown = (w) => { const B = Wd.BUILD; return w.x >= B.x0 - 2.5 && w.x <= B.x1 + 3.5 && w.y >= B.y0 - 2.5 && w.y <= B.y1 + 3.5; };   /* 3D.65: the town plus a 2.5-tile margin: they clear zombies lurking at the edge, but don't follow them out across the map */
function acquireEnemy(s) {   // V2.12: only fighters go looking for a fight; they defend others first and gang up on the same zombie
  if (s.fleeT > 0 || !isFighter(s) || (s.carriedLoot && s.carryAmt) || s.hp < s.max * (retreatPct() + traitRetreat(s)) / 100) return false;
  if (s.focusUntil > tick && s.hp < s.max * .55) s.focusUntil = 0;   /* 3D.75: a hurt fighter peels off the boss */
  if (s.focusUntil > tick) { const b = S.z.find((z) => z.type === 'boss' && z.hp > 0 && z.mode !== 'zleave'); if (b) { if (s.target !== b) engage(s, b); return true; } s.focusUntil = 0; }   /* 3D.71: the player said all together on the boss */   /* 3D.63: below their retreat bar they don't step in (they'd turn and flee the next tick); carriers deliver first */
  const cfg = jobAI[s.job] || jobAI.Civilian, rng = (S.alert > 0 && (s.job === 'Guard' || s.job === 'Police Officer') ? 9 : cfg.aggro) * (policy() === 'defend' ? 1.4 : policy() === 'produce' ? .8 : 1) * traitRange(s) * (atPost(s) ? 1.25 : 1);
  let best = null, bs = 1e9;
  for (const z of S.z) {
    if (z.hp <= 0 || z.mode === 'appear' || z.zoo || z.mode === 'zleave') continue; if (s.skipZ && s.skipZ.z === z && s.skipZ.t > tick && !(z.target === s && dist(s.w, z.w) < 1.5)) continue; const d = dist(s.w, z.w); if (!z.human && !nearTown(z.w) && !(z.target && S.sv.includes(z.target) && d < 3)) continue;   /* 3D.64: they hold the town; zombies out past the edge or walking away are left alone */
    const onPerson = z.target && z.target !== s && z.target.job !== undefined && ['zchase', 'zattack', 'zrecover'].includes(z.mode);
    const sneaking = z.human && z.mode === 'rsneak' && !z.carried && !(S.alert > 0);
    if (sneaking && d > (2.5 + (stat(s, 'per') - 5) * .15 + traitSpot(s) + (atPost(s) ? 1.5 : 0)) * (s.job === 'Police Officer' ? 2 : 1)) continue;   /* 3D.67: Police spot sneaking raiders twice as far */   /* raiders sneaking in are hard to spot */
    if (d > rng && !(onPerson && d <= rng + 3)) continue;
    if (s.hp < s.max * (hasT(s, 'brave') ? .5 : hasT(s, 'cautious') ? .75 : .6) && !onPerson) continue;   /* hurt fighters only step in to defend someone (V2.43: Brave sooner, Cautious later) */
    const allies = S.sv.filter((q) => q !== s && q.target === z && ['chase', 'attack', 'recover'].includes(q.mode)).length;
    const sc = d - (onPerson ? 3 : 0) - (allies === 1 ? 1.2 : 0) + (allies >= 2 ? 2.5 * (allies - 1) : 0) + z.hp / 60 - (z.hp < z.max * .3 ? 1.2 : 0);   /* V3D.14: finish off the nearly dead; 3D.66 study: pairing up helps, but a third and fourth on the same zombie count against it (pile-ons while another zombie went free) */
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
function spreadOut() {   /* V3D.17: two people never stand in the same spot; a soft push apart (walls and buildings respected) */
  const L = S.sv.filter((s) => s.w && s.hp > 0 && s.mode !== 'away' && s.mode !== 'down' && !insideBuilding(s) && !beingCarried(s)); if (S.trader && S.trader.w) L.push(S.trader);
  for (let i = 0; i < L.length; i++) for (let j = i + 1; j < L.length; j++) { const a = L[i], b = L[j], dx = b.w.x - a.w.x, dy = b.w.y - a.w.y, d = Math.hypot(dx, dy), R = (a.chatWith === b || b.chatWith === a) ? .5 : .42;
    if (d >= R) continue; const ux = d > 1e-4 ? dx / d : Math.cos(i + j), uy = d > 1e-4 ? dy / d : Math.sin(i + j), k = (R - d) * .12;
    const am = !!a.moving, bm = !!b.moving, only = am !== bm ? (am ? a : b) : null;   /* V3D.21: someone walking past steps around a person standing still (who used to get shoved along) */
    if (!am && !bm && d >= .3) continue;   /* 3D.100 owner's log (Maya sliding at the wreck): two people standing on top of each other were snapped apart in a few frames (a fast
       glide); now the push is capped at half walking pace, so the one moved takes a little side-step (the renderer walks it) */   /* 3D.64 owner's log (Amy, Rosa): two people standing a little close were pushed apart slowly, a visible glide; now only a real overlap, fixed in a few frames */
    for (const [o, sg] of [[a, -1], [b, 1]]) { if (o === S.trader && o.mode === 'stay' && o !== a) continue; if (only && o !== only) continue; const kk = only ? k * 2 : (!am && !bm ? Math.min((R - d) * .5, .005) : k), nx = o.w.x + ux * kk * sg, ny = o.w.y + uy * kk * sg; if (Wd.walkable(world, Math.floor(nx), Math.floor(ny))) { o.w.x = nx; o.w.y = ny; } } }
}
const zombieNear = (p, r) => S.z.some((z) => z.hp > 0 && z.mode !== 'appear' && dist(z.w, p) < r);
function repelRaid() {   /* V3D.13: raiders in town → everyone healthy helps: fighters chase them; others go in pairs on the nearest one */
  const raiders = S.z.filter((z) => z.human && z.hp > 0 && !z.escaped && z.mode !== 'appear' && Wd.inTown(Math.floor(z.w.x), Math.floor(z.w.y))); if (!raiders.length) return false;
  const able = S.sv.filter((q) => q.hp >= q.max * (hasT(q, 'brave') ? .35 : .5) && !(q.fleeT > 0) && !(isFighter(q) && !canFight(q)) && !q.rescuing && !q.carrying && !(q.carriedLoot && q.carryAmt) && !(q.haul && q.purpose === 'haul-put') && !['down', 'away', 'errand', 'hospital', 'rescueTo', 'rescueCarry', 'chase', 'attack', 'recover', 'goFire', 'fightFire'].includes(q.mode));
  let n = 0;
  for (const q of able) {
    const t = raiders.slice().sort((a, b) => (a.mode === 'rsmash' ? -9 : 0) - (b.mode === 'rsmash' ? -9 : 0) || dist(a.w, q.w) - dist(b.w, q.w))[0];   /* arsonists first */
    const helpers = S.sv.filter((x) => x.target === t && ['chase', 'attack', 'recover'].includes(x.mode)).length;
    if (!isFighter(q) && helpers >= 3) continue;   /* enough hands on that one */
    q.fleeT = 0; q.hideAt = null; engage(q, t); q.why = `${isFighter(q) ? 'Defending' : 'Helping drive off'} a ${RK(t).name.toLowerCase()} raider`; n++;
  }
  if (n && !S.repelSaid) { S.repelSaid = tick; note('important', '✊ Everyone turns out against the raiders'); }
  if (!raiders.length) S.repelSaid = 0; return n > 0;
}
function militia() {   /* V2.37: no able fighter left and zombies inside the town → healthy civilians band together (3+) on the weakest zombie */
  if (S.sv.some((q) => isFighter(q) && q.hp >= q.max * .5 && !['down', 'away', 'errand', 'hospital'].includes(q.mode))) return false;
  if (S.sv.some((q) => ['chase', 'attack', 'recover'].includes(q.mode))) return false;
  const inside = S.z.filter((z) => z.hp > 0 && z.type !== 'boss' && Wd.inTown(Math.floor(z.w.x), Math.floor(z.w.y))); if (!inside.length) return false;
  const able = S.sv.filter((q) => q.hp >= q.max * (hasT(q, 'brave') ? .4 : .6) && !q.rescuing && !q.carrying && !(q.carriedLoot && q.carryAmt) && !(q.haul && q.purpose === 'haul-put') && !['down', 'away', 'errand', 'hospital', 'rescueTo', 'rescueCarry'].includes(q.mode)); if (able.length < 3) return false;
  const t = inside.sort((a, b) => a.hp - b.hp)[0];
  able.slice(0, Math.min(able.length, 3 + inside.length)).forEach((q) => { q.fleeT = 0; q.hideAt = null; engage(q, t); q.why = `Militia: banding together against a ${zombieTypes[t.type].name}`; });
  note('important', '✊ MILITIA: SURVIVORS BAND TOGETHER'); return true;
}
function rally() {   /* V2.37: someone is down and nobody is fighting → fighters with at least half their health come out together and clear the zombies around the downed */
  const downs = S.sv.filter((q) => q.mode === 'down'); if (!downs.length || S.sv.some((q) => ['chase', 'attack', 'recover'].includes(q.mode))) return false;
  const near = S.z.filter((z) => z.hp > 0 && downs.some((q) => dist(z.w, q.w) < 3)); if (!near.length) return false;
  const able = S.sv.filter((q) => isFighter(q) && canFight(q) && !q.rescuing && !q.carrying && !(q.carriedLoot && q.carryAmt) && !(q.haul && q.purpose === 'haul-put') && !['down', 'away', 'errand', 'hospital', 'rescueTo', 'rescueCarry'].includes(q.mode));
  if (able.length < Math.min(2, near.length)) return false;
  able.sort((a, b) => b.hp - a.hp).slice(0, Math.max(2, near.length)).forEach((q, i) => { q.fleeT = 0; q.hideAt = null; engage(q, near[i % near.length]); q.why = `Rallying to cover ${downs[0].name}`; });
  note('important', `⚔ RALLY: FIGHTERS MOVE TO COVER ${downs[0].name.toUpperCase()}`); return true;
}
function assignRescue() {   /* V2.37: anyone not already in an emergency can be called (eating, resting, sleeping, walking, working); a fighter only if no zombie is within reach of them;
   nobody but a fighter walks into a crowd of zombies around the downed survivor */
  const downs = downedUnassigned(); if (!downs.length) return false;
  const OK = ['free', 'postCombat', 'wait', 'work', 'goWork', 'goFacility', 'useFacility', 'walk'];
  const BAL = window.ZH_BAL || {}, quiet = (q) => !S.z.some((z) => z.hp > 0 && !z.human && dist(z.w, q.w) < (BAL.hideR || 3.5));
  const free = S.sv.filter((r) => r.hp > r.max * .3 && !r.rescuing && !r.carrying && (((BAL.hiders ?? 1) && r.mode === 'hiding' && r.hideAt && downs.some(quiet) && !zombieNear(Wd.doorPoint(r.hideAt), BAL.hideR || 3.5)) || OK.includes(r.mode) && !(r.mode === 'useFacility' && r.facility && facilityRules[r.facility.type] && facilityRules[r.facility.type].need === 'injury')
    || (['chase', 'attack', 'recover'].includes(r.mode) && !S.z.some((z) => z.hp > 0 && dist(z.w, r.w) < Math.max(2.2, rangeOf(r) + 1))))); if (!free.length) return false;   /* 3D.63: a shooter mid-fight isn't 'free' just because no zombie is at arm's length */
  let best = null, bs = -1e9;
  for (const q of downs) { const crowd = S.z.filter((z) => z.hp > 0 && dist(z.w, q.w) < 2.5).length, urgency = 3000 / Math.max(300, q.bleed || 1);
    for (const r of free) { if (!q.ordered && crowd >= (isFighter(r) ? 2 : 1) + (hasT(r, 'caring') ? 1 : 0)) continue; if (q.ordered ? false : crowd >= (hasT(r, 'caring') ? 3 : 2) && !isFighter(r)) continue;   /* 3D.71: left alone, nobody walks into zombies (a fighter into one at most); the player's Send rescue goes anyway */ if (crowd && lastStand()) continue;   /* 3D.48 */   /* non-fighters don't walk into a crowd (Caring: up to two zombies) */ if (r.job === 'Medic' && onShift(r) && dist(r.w, q.w) > 10) continue;   /* 3D.67: a Medic on shift only leaves for someone down close by */ const sc = (jobAI[r.job] || jobAI.Civilian).rescue * 3 + (r.job === 'Medic' ? 6 : 0) + (hasT(r, 'caring') ? 8 : 0) - dist(r.w, q.w) + urgency + (q.ordered ? 40 : 0) - (r.mode === 'useFacility' ? 4 : 0) - (['chase', 'attack', 'recover'].includes(r.mode) ? 3 : 0); if (sc > bs) { bs = sc; best = { r, q }; } } }
  if (!best) return false;
  if (best.r.mode === 'useFacility') { best.r.sleeping = false; best.r.activity = null; } if (best.r.mode === 'hiding') best.r.hideAt = null;
  best.q.rescuer = best.r; best.r.rescuing = best.q; best.r.target = null; best.r.facility = null; best.r.dest = null; best.r.path = null; best.r.mode = 'rescueTo'; best.r.why = `Rescuing ${best.q.name}${hasT(best.r, 'caring') ? ' (Caring)' : ''}`; note('routine', `${best.r.name} is rescuing ${best.q.name}.`); return true;
}
/* ---------------- V2.45 guard posts: sandbagged spots the player places. The holder stands watch there (engages from 25% farther, spots raiders
   sooner, takes 20% less damage behind the sandbags) and zombies within 4 tiles go for the holder first. Fighters without a post patrol between posts. ---------------- */
const POST_COST = 3, POST_R = 4, POST_SCHED = { night: { name: 'Night watch', icon: '🌙', on: () => isNight() }, day: { name: 'Day watch', icon: '☀️', on: () => !isNight() }, all: { name: 'Day and night', icon: '⏰', on: () => true } };
const postMax = () => 1 + (S.rank || 1);
const postPt = (p) => ({ x: p.x + .5, y: p.y + .5 });
const postAt = (x, y) => (S.posts || []).find((p) => p.x === x && p.y === y) || null;
const postName = (p) => { const c = townCentre(), dx = p.x + .5 - c.x, dy = p.y + .5 - c.y, sx = dx - dy, sy = dx + dy; return (Math.abs(sx) > Math.abs(sy) * 1.5 ? (sx > 0 ? 'east' : 'west') : Math.abs(sy) > Math.abs(sx) * 1.5 ? (sy > 0 ? 'south' : 'north') : (sy > 0 ? 'south' : 'north') + (sx > 0 ? '-east' : '-west')) + ' post'; };   /* screen directions */
const canHold = (q) => q && q.hp > 0 && isFighter(q) && !['down', 'hospital', 'away', 'errand'].includes(q.mode) && S.sv.includes(q);
function postsAssign() {   /* manual holders first; 'auto' (and a manual post whose holder is away) gets the best free fighter: Guards and Police first, then the healthiest */
  const P = S.posts || [], used = new Set();
  for (const p of P) { const q = typeof p.holder === 'number' ? S.sv.find((x) => x.id === p.holder) : null; p.cur = canHold(q) ? q.id : null; if (p.cur) used.add(p.cur); }
  const pool = S.sv.filter((q) => canHold(q) && !used.has(q.id) && !q.post).sort((a, b) => (['Guard', 'Police Officer'].includes(b.job) - ['Guard', 'Police Officer'].includes(a.job)) || (b.l - a.l) || (b.hp - a.hp));
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
  if (S.mat < POST_COST) { say(`A guard post costs ${POST_COST} scrap.`); return { ok: false, why: 'parts' }; }
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
    <button class="act danger" id="pRemove" style="width:100%">Remove post (+1 scrap back)</button>`;
  $('ib').querySelectorAll('[data-ps]').forEach((b) => { b.onclick = () => { p.sched = b.dataset.ps; for (const q of S.sv) if (q.purpose === 'post-hold' && myPost(q) === p) q.stateTicks = 0; saveGame(); showPost(p); }; });
  $('ib').querySelectorAll('[data-ph]').forEach((b) => { b.onclick = () => { const v = b.dataset.ph; if (v === 'auto') p.holder = 'auto'; else if (v === 'none') p.holder = null; else { const id = +v; for (const o of S.posts) if (o !== p && o.holder === id) o.holder = 'auto'; p.holder = id; } postsAssign(); for (const q of S.sv) if (q.purpose === 'post-hold' || q.purpose === 'post') { q.stateTicks = 0; if (q.mode === 'walk') q.mode = 'free'; } saveGame(); showPost(p); }; });
  $('pRemove').onclick = () => { removePost(p); closeP(); say('Guard post removed.'); };
  selected = { kind: 'post', ref: p }; showPanel('Guard Post');
}
function patrolDest() { if ((S.posts || []).length) { const p = S.posts[Math.floor(rnd() * S.posts.length)], a = rnd() * 6.283; return { x: p.x + .5 + Math.cos(a) * .9, y: p.y + .5 + Math.sin(a) * .9 }; } let x0 = 99, y0 = 99, x1 = 0, y1 = 0; for (const b of world.buildings) { x0 = Math.min(x0, b.x); y0 = Math.min(y0, b.y); x1 = Math.max(x1, b.x + b.w - 1); y1 = Math.max(y1, b.y + b.h - 1); }   /* 3D.64: walk the edge of the settlement (there are no roads to patrol now) */
  x0 = Math.max(Wd.BUILD.x0, x0 - 2); y0 = Math.max(Wd.BUILD.y0, y0 - 2); x1 = Math.min(Wd.BUILD.x1, x1 + 2); y1 = Math.min(Wd.BUILD.y1, y1 + 2);
  for (let k = 0; k < 20; k++) { const side = Math.floor(rnd() * 4), t = rnd(), x = Math.round(side < 2 ? x0 + t * (x1 - x0) : side === 2 ? x0 : x1), y = Math.round(side >= 2 ? y0 + t * (y1 - y0) : side === 0 ? y0 : y1); if (Wd.walkable(world, x, y) && !Wd.buildingAt(world, x, y)) return tc(x, y); } return tc(7, 7); }
function roamDest(s) { const o = s ? tileOf(s.w) : { x: 7 + OFF, y: 10 + OFF }; for (let k = 0; k < 12; k++) { const x = o.x + Math.round((rnd() - .5) * 10), y = o.y + Math.round((rnd() - .5) * 10); if (Wd.inMap(x, y) && Wd.walkable(world, x, y) && !Wd.buildingAt(world, x, y) && Wd.inTown(x, y)) return tc(x, y); } return tc(o.x, o.y); }   /* 3D.63: a short stroll nearby (with no roads everyone walked to the same spot) */

/* ======================= V3D.14 "life": emotions, chatter and smarter choices (all offline, no network) =======================
   emote(s, icon): a little speech bubble with an emoji over a survivor (drawn by drawEmote; the 3D face follows the mood).
   Free time: pairs stop to chat in emoji (Dungeon Village 2 style) and grow closer; evenings around the Bonfire;
   when food or water is short, free hands pitch in at the producer. Before night, the hurt patch up and the hungry eat.
   In combat: the attacked shout for help, ranged fighters step back to keep distance, fighters finish off weak zombies.
   Tracked in docs/AI_BEHAVIOUR.md. */
const EMO_FACE = { '😊': 'happy', '😂': 'happy', '🥳': 'happy', '😋': 'happy', '❤️': 'happy', '🎶': 'happy', '😌': 'happy', '👍': 'happy', '🙏': 'happy', '😎': 'happy',
  '😤': 'angry', '💪': 'angry', '😠': 'angry', '😣': 'hurt', '😱': 'hurt', '😰': 'hurt', '🆘': 'hurt', '😢': 'hurt', '😟': 'hurt', '🥱': 'ko', '😴': 'ko' };
function emote(s, icon, f = 110, force = false) {
  if ((!s) || !s.w) return; if (!force && s.emo && s.emo.f > 30 && s.emo.pri) return;
  s.emo = { t: icon, f, f0: f, face: EMO_FACE[icon] || null, pri: force };
}
function emoTick(s) {
  if (tick % 600 === ((s.id || 0) * 13) % 600 && s.hp > 0 && s.hp < s.max && gearFx(s, 'regen') && !['chase', 'attack', 'recover', 'down'].includes(s.mode)) s.hp = Math.min(s.max, s.hp + Math.max(1, Math.round(s.max * .02)));   /* 3D.28 Medic Pouch */
  if (s.bark && --s.bark.f <= 0) s.bark = null;
  if (s.emo && --s.emo.f <= 0) s.emo = null;
  if (s.emo || s.bark || tick % 40 !== (s.i * 7) % 40 || rnd() > .16) return;   /* now and then, a mood shows by itself */
  const busy = ['chase', 'attack', 'recover', 'down', 'hospital', 'away'].includes(s.mode); if (busy) return;
  const grief = (S.griefUntil || 0) > nowH(), rain = !!S.weather, out = !insideBuilding(s);
  const pick = grief ? '😢' : s.hp < s.max * .4 ? '😣' : s.hunger > 70 ? (S.food < 1 ? '😟' : '🍖') : s.thirst > 70 ? '💧' : s.fatigue > 75 ? '🥱'
    : rain && out && !gearFx(s, 'rain') ? '☔' : isNight() && out && activeZ() > 0 ? '😰' : (s.sat || 0) > 70 ? ['😊', '🎶', '😌'][Math.floor(rnd() * 3)] : (s.sat || 0) < 25 ? '😞' : null;
  const say = { '😢': 'sad', '😣': 'hurt', '😟': 'hungry', '🍖': 'hungry', '💧': 'thirsty', '🥱': 'tired', '☔': 'rain', '😰': 'scared', '😊': 'happy', '🎶': 'happy', '😌': 'happy', '😞': 'sad' }[pick];
  if (pick && say && rnd() < .35 && bark(s, say)) return;   /* 3D.27: sometimes they say it out loud */
  if (!pick && rnd() < .07 && bark(s, isNight() ? 'scared' : 'idle')) return;
  if (pick) emote(s, pick, 100);
}
function drawEmote(s, p, y) {   /* cream speech bubble with a tail; pops in, bobs, fades */
  const e = s.emo; if (!e) return; if (p.x < -10 || p.x > VW + 10 || p.y < 0 || p.y > VH + 40) return; const u = hudU() * HUD_SMALL, k = 1 - e.f / e.f0, pop = k < .1 ? .5 + k * 6 : 1, al = e.f < 15 ? e.f / 15 : 1;
  const parts = window.ZHIcons ? ZHIcons.split(e.t).filter((q) => q.i || q.t.trim()) : [{ t: e.t }], np = Math.max(1, parts.length);
  const r = 13 * u * pop, x = p.x + 14 * u, cy = y - r - 4 * u + Math.sin(tick / 12) * 1.5 * u, rx = r * (np > 1 ? 1.15 + .55 * (np - 1) : 1.15);
  ctx.save(); ctx.globalAlpha = al; ctx.lineWidth = (GLASS ? 1.1 : 2.2) * u; ctx.strokeStyle = GLASS ? 'rgba(0,0,0,.12)' : '#161616'; ctx.lineJoin = 'round';
  const blob = (ox) => { ctx.beginPath(); ctx.ellipse(x + ox, cy + ox, rx, r, 0, 0, 7); ctx.moveTo(x - r * .5 + ox, cy + r * .75 + ox); ctx.lineTo(x - r * .95 + ox, cy + r * 1.45 + ox); ctx.lineTo(x - r * .05 + ox, cy + r * .92 + ox); };
  const bf = GLASS ? 'rgba(255,255,255,.96)' : '#FFFDF4';   /* emoji bubbles stay white so the sticker icons read */ if (!GLASS) { ctx.fillStyle = '#161616'; blob(2 * u); ctx.fill(); } else { ctx.shadowColor = 'rgba(0,0,0,.35)'; ctx.shadowBlur = 7 * u; ctx.shadowOffsetY = 2 * u; }
  ctx.fillStyle = bf; blob(0); ctx.fill(); ctx.shadowColor = 'transparent'; ctx.stroke();
  if (!GLASS) { ctx.beginPath(); ctx.ellipse(x, cy, rx - 1.4 * u, r - 1.4 * u, 0, 0, 7); ctx.fill(); }
  const sz = r * 1.35, gap = sz * 1.02, x1 = x - gap * (np - 1) / 2;
  parts.forEach((q, i) => { const im = q.i && ZHIcons.img(q.i); if (im && im.complete) ctx.drawImage(im, x1 + i * gap - sz / 2, cy - sz / 2, sz, sz);
    else { ctx.fillStyle = '#161616'; ctx.font = `${Math.round(r * 1.15)}px sans-serif`; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillText(q.t || '', x1 + i * gap, cy + 1 * u); } });
  ctx.restore();
}
/* ======================= 3D.27 barks: survivors say things out loud (lines in js/barks.js), in Bunker Comic bubbles =======================
   bark(s, key, vars, {pri}) shows one line over a survivor. pri 0 = chatter (rate limited, max 2 on screen), 1 = event, 2 = urgent.
   barkSomeone() picks a free survivor (nearest to a point when given). barkWatch() spots zombies and hordes; barkHour() covers the clock. */
const BARK_LAST = {}; let barkGlobalT = 0, barkSquad = null;
const GLASS = typeof document !== 'undefined' && document.documentElement.classList.contains('glass');   /* 3D.28 Glass UI: bubbles are dark frosted glass */
const SWEAR_RE = /\b(fuck(?:ing|er|ed)?|shit(?:ty)?|bitch|bastards?|asshole|ass|damn(?:ed)?|hell|bloody|dumbass)\b/gi, unswear = (t) => (OPTS.swear === false ? t.replace(SWEAR_RE, (w) => w[0] + '*'.repeat(Math.max(1, w.length - 2)) + w[w.length - 1]) : t);   /* 3D.41 Settings > Swearing in chat */
const barkFill = (t, v) => unswear(t.replace(/\{(\w+)\}/g, (m, k) => (v && v[k] != null ? v[k] : k === 'n' ? '' : k === 'b' ? 'building' : k === 'r' ? 'supplies' : k === 'dest' ? 'ruins' : 'friend')));
function barkLine(key, v, s) {
  const B = window.ZH_BARKS && ZH_BARKS[key]; const L0 = B && B.lines; if (!L0 || !L0.length) return null;
  const L = L0.filter((l) => { const [t] = lineTag(l); return !t || (s && voiceOk(s, t)); }); if (!L.length) return null;   /* 3D.44 only lines that fit the speaker's voice */
  let i = Math.floor(rnd() * L.length); if (L.length > 1 && i === BARK_LAST[key]) i = (i + 1) % L.length; BARK_LAST[key] = i; return { t: barkFill(lineTag(L[i])[1], v), st: B.style || 'talk' };
}
const barkable = (q) => q && q.hp > 0 && q.w && !['away', 'down', 'hospital'].includes(q.mode) && !q.sleeping && !insideBuilding(q);
function bark(s, key, v = {}, o = {}) {
  if ((!barkable(s))) return false; const pri = o.pri || 0;
  if (s.bark && s.bark.f > 20 && s.bark.pri >= pri) return false;
  if (!pri && ((s.barkNext || 0) > tick || barkGlobalT > tick || S.sv.filter((q) => q.bark).length >= 2)) return false;
  const L = o.line ? { t: barkFill(o.line, v), st: o.style || 'talk' } : barkLine(key, v, s); if (!L) return false;
  const f = o.f || Math.min(330, 150 + L.t.length * 4);
  s.bark = { t: GLASS ? L.t : L.t.toUpperCase(), st: o.style || L.st, f, f0: f, pri }; s.emo = null;
  s.barkNext = tick + 1800 + Math.floor(rnd() * 1200); barkGlobalT = tick + (pri ? 60 : 260); return true;
}
function barkSomeone(key, v, o = {}, near, not) {
  const c = S.sv.filter((q) => barkable(q) && q !== not && !(q.bark && q.bark.pri >= (o.pri || 0) && q.bark.f > 20)); if (!c.length) return null;
  const q = near ? c.sort((a, b) => dist(a.w, near) - dist(b.w, near))[0] : c[Math.floor(rnd() * c.length)];
  return bark(q, key, v, o) ? q : null;
}
function barkWatch() {   /* every half second: zombies spotted, a horde arriving, all clear, the squad back home */
  if ((tick % 30)) return;
  if (barkSquad && tick >= barkSquad.at) { const back = S.sv.filter((q) => barkSquad.ids.includes(q.id)), lead = back.find(barkable);
    if (lead) { bark(lead, barkSquad.lost || lead.hp < lead.max * .5 ? 'returnHurt' : 'return', {}, { pri: 2 }); barkSomeone('greetSquad', {}, { pri: 1 }, lead.w, lead); } barkSquad = null; }
  const az = S.z.filter((z) => z.hp > 0 && !z.human && z.mode !== 'zleave'), n = az.length, was = S.barkZ || 0; S.barkZ = n;
  if (n >= 5 && was < 5) { barkSomeone(az.some((z) => z.type === 'boss') ? 'boss' : 'horde', {}, { pri: 2 }, az[0].w); S.barkFought = S.day; return; }
  if (n === 0 && was >= 2) { barkSomeone('calm', {}, { pri: 1 }); return; }
  if ((S.barkSpotT || 0) > tick) return;
  for (const z of az) { if (z.spotted) continue; const q = S.sv.find((q) => barkable(q) && dist(q.w, z.w) < 7); if (q) { z.spotted = 1; bark(q, z.type === 'boss' ? 'boss' : 'spot', {}, { pri: 2 }); S.barkSpotT = tick + 900; break; } }
}
function barkHour() {   /* once a game hour */
   const h = S.hour % 24;
  if (h === 6) barkSomeone(S.barkFought === S.day - 1 || S.barkFought === S.day ? 'dawn' : 'morning', { n: S.day }, { pri: 1 });
  else if (h === 19) barkSomeone('dusk', {}, { pri: 1 });
  else if (h === 22 && activeZ() === 0) barkSomeone('night', {}, {});
  if (h % 6 === 3 && S.sv.length) { const r = rationNeed(); if (S.food < r.f * 1.2) barkSomeone('lowFood', {}, { pri: 1 }); else if (S.water < r.w * 1.2) barkSomeone('lowWater', {}, { pri: 1 }); }
}
function drawBark(s, p, y) {   /* Bunker Comic speech bubble: cream + hard ink, jagged yellow for shouts, cloud for thoughts, dashed for whispers */
  const e = s.bark; if (!e) return; if (p.x < -10 || p.x > W_() + 10 || p.y < 0 || p.y > VH + 40) return;   /* 3D.30: no bubble pinned to the screen edge for someone off screen */
  const u = hudU() * HUD_SMALL, k = 1 - e.f / e.f0, pop = k < .06 ? .6 + k / .06 * .4 : 1, al = e.f < 15 ? e.f / 15 : 1, st = e.st;
  const fs = (GLASS ? 11 : 11.5) * u, font = GLASS ? `${st === 'think' ? 'italic ' : ''}800 ${Math.round(fs)}px Manrope, system-ui, sans-serif` : `${st === 'think' ? 'italic ' : ''}700 ${Math.round(fs)}px 'Comic Neue', 'Comic Sans MS', sans-serif`; ctx.save(); ctx.font = font;
  const maxW = 128 * u, words = e.t.split(' '), lines = []; let cur = '';
  for (const w of words) { const t = cur ? cur + ' ' + w : w; if (ctx.measureText(t).width > maxW && cur) { lines.push(cur); cur = w; } else cur = t; } if (cur) lines.push(cur);
  const tw = Math.max(...lines.map((l) => ctx.measureText(l).width)), lh = fs * 1.12, padX = (st === 'shout' ? 13 : 9) * u, padY = (st === 'shout' ? 9 : 6) * u;
  const bw = tw + padX * 2, bh = lines.length * lh + padY * 2, cx = Math.max(bw / 2 + 4, Math.min(W_() - bw / 2 - 4, p.x)), by = y - bh - 12 * u + Math.sin(tick / 14) * u;
  ctx.globalAlpha = al; ctx.translate(cx, by + bh / 2); ctx.scale(pop, pop); ctx.translate(-cx, -(by + bh / 2));
  const x0 = cx - bw / 2, ink = GLASS ? (st === 'shout' ? 'rgba(255,255,255,.35)' : 'rgba(30,36,42,.18)') : '#161616', fill = GLASS ? (st === 'shout' ? '#E5483A' : 'rgba(255,255,255,.97)') : st === 'shout' ? '#F2B533' : '#FFFDF4', lw = (GLASS ? 1.1 : 2.4) * u   /* 3D.41 owner: speech boxes are white; 3D.45 fight shouts are red with white text again */, tx = Math.max(x0 + 10 * u, Math.min(x0 + bw - 10 * u, p.x));
  const shape = (ox, oy) => { ctx.beginPath();
    if (st === 'shout' && !GLASS) { const n = Math.max(10, Math.round((bw + bh) / (9 * u))), rx = bw / 2 + 4 * u, ry = bh / 2 + 4 * u, mx = cx + ox, my = by + bh / 2 + oy;
      for (let i = 0; i <= n * 2; i++) { const a = i / (n * 2) * Math.PI * 2, r = i % 2 ? .86 : 1.06; ctx.lineTo(mx + Math.cos(a) * rx * r, my + Math.sin(a) * ry * r); } ctx.closePath(); return; }
    const r = Math.min(st === 'think' || GLASS ? bh / 2 : 9 * u, bh / 2); ctx.roundRect(x0 + ox, by + oy, bw, bh, r);
    if (st !== 'think') { ctx.moveTo(tx - 6 * u + ox, by + bh - 1 + oy); ctx.lineTo(tx - 2 * u + ox, by + bh + 10 * u + oy); ctx.lineTo(tx + 6 * u + ox, by + bh - 1 + oy); } };
  if (GLASS) { ctx.shadowColor = 'rgba(0,0,0,.35)'; ctx.shadowBlur = 8 * u; ctx.shadowOffsetY = 3 * u; } else { ctx.fillStyle = ink; shape(2.6 * u, 2.6 * u); ctx.fill(); }   /* hard drop shadow (comic) / soft shadow (glass) */
  shape(0, 0); ctx.fillStyle = fill; ctx.fill(); ctx.shadowColor = 'transparent'; ctx.lineWidth = lw; ctx.strokeStyle = ink; ctx.lineJoin = 'round'; if (st === 'whisper') ctx.setLineDash([4 * u, 3 * u]); ctx.stroke(); ctx.setLineDash([]);
  if (st !== 'think' && st !== 'shout' && !GLASS) { ctx.fillStyle = fill; ctx.fillRect(tx - 4.6 * u, by + bh - lw * 1.2, 9.4 * u, lw * 1.4); }
  if (st === 'think') for (const [dx, dy, r] of [[-2, 6, 3.4], [-6, 12, 2.2]]) { ctx.beginPath(); ctx.arc(tx + dx * u, by + bh + dy * u, r * u, 0, 7); ctx.fillStyle = fill; ctx.fill(); ctx.lineWidth = 1.8 * u; ctx.stroke(); }
  ctx.fillStyle = GLASS ? (st === 'whisper' ? '#6B7480' : st === 'shout' ? '#FFFFFF' : '#1E2328') : st === 'whisper' ? '#5b5045' : ink; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
  lines.forEach((l, i) => ctx.fillText(l, cx, by + padY + lh * (i + .5) + 1 * u)); ctx.restore();
}
const W_ = () => VW;
/* chatter: a topic is a short emoji exchange; the topic follows what is going on in town */
function chatTopic(a, b) {
  const T = [], bond = bondOf(a, b);
  if ((S.griefUntil || 0) > nowH()) T.push(['😢', '🕯', '🫂']);
  if (S.food < rationNeed().f * 1.5) T.push(['🍖❓', '😟', '🌱💪']); if (S.water < rationNeed().w * 1.5) T.push(['💧❓', '😟', '☔🙏']);
  if (S.weather) T.push(['☔', '😅', '💧👍']);
  if ((S.kills || 0) > (a._lastKills || 0)) T.push(['🧟💥', '😎', '💪']);
  if (isNight()) T.push(['🌙', '😰', '🔥🙂']);
  if (bond > 40) T.push(['😂', '😂', '❤️'], ['🎶', '😊', '🎶']);
  if (bond < 10) T.push(['👋', '🙂', '🤝']);
  T.push(['💬', '😄', '👍'], ['🍲', '😋', '👍'], ['🧟', '😨', '🛡️'], ['🔧', '🤔', '💡']);
  a._lastKills = S.kills || 0; return T[Math.floor(rnd() * T.length)];
}
function chatText(a, b) {   /* 3D.27: a spoken two-line exchange (js/barks.js), picked by what is going on */
  const B = window.ZH_BARKS; if (!B) return null; const bond = bondOf(a, b);
  const key = (S.griefUntil || 0) > nowH() ? 'chatGrief' : S.food < rationNeed().f * 1.5 ? 'chatHungry' : S.water < rationNeed().w * 1.5 ? 'chatThirsty' : S.weather ? 'chatRain'
    : isNight() ? 'chatNight' : (S.barkFought === S.day && rnd() < .5) ? 'chatFight' : bond > 40 && rnd() < .5 ? 'chatFriends' : bond < 10 && rnd() < .5 ? 'chatNew' : 'chat';
  const T = B[key] || B.chat, ok = T.pairs.filter(([x, y]) => { const [t1] = lineTag(x), [t2] = lineTag(y); return (!t1 || voiceOk(a, t1)) && (!t2 || voiceOk(b, t2)); }); if (!ok.length) return null;
  let pr = ok[Math.floor(rnd() * ok.length)].map((l) => (key === 'chatGrief' ? lineTag(l)[1] : lineTag(l)[1].replace('{other}', a.name)));   /* 3D.44 each line fits its speaker */
  if (key === 'chatGrief') { const f = (S.fallen || []).slice(-1)[0]; pr = pr.map((l) => l.replace('{other}', f ? f.name : 'them')); }
  return { pair: pr.map(unswear), st: T.style || 'talk' };
}
const chatBuilding = () => { const l = world.buildings.filter((b) => !b.burnt && DEFS[b.type]); return l.length ? DEFS[l[Math.floor(rnd() * l.length)].type].name : 'wall'; };
function chatSpot(a, p) { const ok = (x, y) => Wd.walkable(world, Math.floor(x), Math.floor(y)) && !Wd.buildingAt(world, Math.floor(x), Math.floor(y)); return ok(p.x, p.y) ? p : { x: a.w.x, y: a.w.y }; }   /* 3D.59 never chat on a building footprint */
function startChat(s) {
  if (urgentNeed(s)) return false;   /* 3D.63: no chatting while starving */
  if (((s.chatNext || 0) > tick) || isNight() && !bOf('bonfire').length && rnd() < .6) return false;   /* V3D.17: a pause between chats */
  const pals = S.sv.filter((q) => q !== s && q.hp > 0 && ['free', 'wait'].includes(q.mode) && !q.purpose && !q.sleeping && !q.chatWith && (q.chatNext || 0) <= tick && !insideBuilding(q) && dist(q.w, s.w) < 5)
    .sort((x, y) => (bondOf(s, y) - bondOf(s, x)) * .05 + dist(x.w, s.w) - dist(y.w, s.w) + (Math.abs(ageOf(s) - ageOf(x)) - Math.abs(ageOf(s) - ageOf(y))) * .05);   /* 3D.44 people their own age first */
  const q = pals[0]; if (!q || hasT(s, 'loner') && rnd() < .6) return false;
  const mid = { x: (s.w.x + q.w.x) / 2, y: (s.w.y + q.w.y) / 2 }, txt = rnd() < .7 ? chatText(s, q) : null, lines = txt ? txt.pair : chatTopic(s, q);
  for (const [a, b, side] of [[s, q, -1], [q, s, 1]]) { a.mode = 'chat'; a.chatWith = b; a.chatLines = lines; a.chatTxt = txt ? txt.st : null; a.chatStep = side < 0 ? 0 : 1; a.chatT = side < 0 ? 30 : 75; a.dest = chatSpot(a, { x: mid.x + side * .32, y: mid.y + side * .12 }); a.path = null; a.stateTicks = 900; a.why = `Chatting with ${b.name}`; a.purpose = null; }
  return true;
}
function chatTick(s) {
  const q = s.chatWith; if (!q || q.chatWith !== s || q.hp <= 0 || threatOf(s)) { endChat(s); return; }
  const r = followPath(s, s.dest, WALK); if (r === 'moving') return; s.moving = false; s.faceW = q.w;
  if (--s.chatT > 0) return; const L = s.chatLines; if (s.chatStep >= L.length) { endChat(s); return; }
  if (s.chatTxt) { bark(s, null, { other: q.name, b: chatBuilding() }, { line: L[s.chatStep], style: s.chatTxt, pri: 1, f: 170 }); s.chatStep += 2; s.chatT = 150; }
  else { emote(s, L[s.chatStep], 80, true); s.chatStep += 2; s.chatT = 90; }
  if (s.chatStep >= L.length && q.chatStep >= L.length) { addBond(s, q, 3); s.sat = Math.min(100, (s.sat || 0) + 1); q.sat = Math.min(100, (q.sat || 0) + 1); }
}
function endChat(s) { const q = s.chatWith; s.chatNext = tick + 1500 + rnd() * 1000; if (q) q.chatNext = s.chatNext; s.chatWith = null; s.faceW = null; enterFree(s, 40 + rnd() * 60); if (q && q.chatWith === s) { q.chatWith = null; q.faceW = null; enterFree(q, 40 + rnd() * 60); } }
/* evenings at the Bonfire: people who aren't tired stand around it, chat and cheer up */
function goCampfire(s) {
  if ((S.hour < 19) || S.hour > 23 || s.fatigue > 60) return false; const f = bOf('bonfire').filter((b) => !b.burnt)[0]; if (!f) return false;
  const n = S.sv.filter((q) => q.mode === 'campfire').length; if (n >= 8) return false;
  const a = (s.id * 2.399) % 6.283, c = { x: f.x + .5, y: f.y + .5 };
  s.mode = 'campfire'; s.fire = f; s.dest = { x: c.x + Math.cos(a) * 1.05, y: c.y + Math.sin(a) * 1.05 }; s.path = null; s.stateTicks = 1400 + rnd() * 900; s.why = 'Warming up at the bonfire';
  return true;
}
/* 3D.63 study: chats only happened between two idle people, so with full days the town barely spoke (about one chat per person every 4 days).
   Now people also talk where they sit: round the bonfire, and over food or water at an outdoor spot. */
const talkOk = (q) => !!q.talkBy && q.talkBy.talk && q.talkBy.talk.q === q;
function sitTalk(s, same) {
  const t = s.talk;
  if (t) { if (!S.sv.includes(t.q) || !same(t.q) || threatOf(s)) { s.talk = null; return; } if (--t.T > 0) return;
    if (t.k >= t.L.length) { s.talk = null; addBond(s, t.q, 3); s.sat = Math.min(100, (s.sat || 0) + 1); t.q.sat = Math.min(100, (t.q.sat || 0) + 1); return; }
    const sp = t.k % 2 === 0 ? s : t.q; bark(sp, null, { other: (sp === s ? t.q : s).name, b: chatBuilding() }, { line: t.L[t.k], style: t.st, pri: 1, f: 170 }); t.k++; t.T = 160; return; }
  if (talkOk(s) || (s.talkNext || 0) > tick || rnd() > 1 / 300 || urgentNeed(s)) return;
  const q = S.sv.find((o) => o !== s && same(o) && !o.talk && !talkOk(o) && dist(o.w, s.w) < 2.8 && (o.talkNext || 0) <= tick); if (!q) return;
  const txt = chatText(s, q); if (!txt) return; s.talk = { q, L: txt.pair, st: txt.st, k: 0, T: 15 }; q.talkBy = s; s.talkNext = q.talkNext = tick + 1500 + rnd() * 1200;
}
function campfireTick(s) {
  const f = s.fire; if (!f || !world.buildings.includes(f) || s.fatigue > 75 || S.hour >= 24 || (S.hour < 19 && S.hour > 5) || threatOf(s)) { s.fire = null; s.faceW = null; enterFree(s, 20); return; }
  const r = followPath(s, s.dest, WALK); if (r === 'moving') return; s.moving = false; s.faceW = { x: f.x + .5, y: f.y + .5 }; sitTalk(s, (o) => o.mode === 'campfire' && o.fire === f && !o.moving);
  if (tick % 900 === (s.i * 97) % 900 && rnd() < .25) { const o = S.sv.find((q) => q !== s && q.mode === 'campfire'); bark(s, 'bonfire', { other: o ? o.name : 'someone' }); }
  if (tick % 120 === (s.i * 17) % 120) { s.sat = Math.min(100, (s.sat || 0) + .6); const nb = S.sv.find((q) => q !== s && q.mode === 'campfire' && dist(q.w, s.w) < 2.2); if (nb) addBond(s, nb, 1); if (rnd() < .5) emote(s, ['🎶', '🔥', '😊', '😂', '☕'][Math.floor(rnd() * 5)], 90); }
  if (--s.stateTicks <= 0) { s.fire = null; s.faceW = null; enterFree(s, 20); }
}
/* pitching in: when food or water will run out within a day and a half, free hands help at the producer (+35% each, two at most) */
function pitchIn(s) {
  if ((isFighter(s) && activeZ() > 0) || urgentNeed(s)) return false; const R = rationNeed(), need = S.food < R.f * 1.5 ? 'food' : S.water < R.w * 1.5 ? 'water' : null; if (!need) return false;
  const fam = need === 'food' ? 'farm' : 'water', b = world.buildings.filter((x) => DEFS[x.type] && DEFS[x.type].fam === fam && !x.burnt && !x.fire && (x.helpers = (x.helpers || []).filter((id) => S.sv.some((q) => q.id === id && q.mode === 'pitch'))).length < 2).sort((x, y) => dist(Wd.doorPoint(x), s.w) - dist(Wd.doorPoint(y), s.w))[0];
  if (!b || zombieNear(Wd.doorPoint(b), 5) || (s.wary || 0) > tick) return false; (b.helpers ||= []).push(s.id); s.mode = 'pitch'; s.helpAt = b; s.dest = Wd.approachPoint(b); s.path = null; s.stateTicks = 1000; s.why = `Pitching in at the ${DEFS[b.type].name} (${need === 'food' ? '🍖' : '💧'} running low)`; emote(s, need === 'food' ? '🌱💪' : '💧💪', 110, true); return true;
}
function pitchTick(s) {
  const b = s.helpAt; if (!b || !world.buildings.includes(b) || b.fire) { endPitch(s); return; }
  if (threatOf(s)) { endPitch(s); return; } const r = followPath(s, s.dest, WALK); if (r === 'moving') return; s.moving = false; s.activity = 'Working';
  if (--s.stateTicks <= 0) { gainXp(s, 1); endPitch(s); }
}
function endPitch(s) { const b = s.helpAt; if (b && b.helpers) b.helpers = b.helpers.filter((id) => id !== s.id); s.helpAt = null; s.activity = null; enterFree(s, 30); }
const helpMult = (b) => 1 + .35 * ((b.helpers || []).filter((id) => S.sv.some((q) => q.id === id && q.mode === 'pitch' && !q.moving)).length);
/* before night: the hurt patch up, the hungry and thirsty eat and drink */
function nightPrep(s) {
  if (S.hour < 18 || S.hour >= 20) return false; let need = null;
  if (isFighter(s) && s.hp < s.max * .75 && medSite() && facilityUsers(medSite()) < cap(medSite())) need = medSite();
  else if (s.hunger > 35 && S.food >= 1) need = chooseFacility(s, false, 'hunger');   /* 3D.63: the nearest safe one, not the first built */
  else if (s.thirst > 35 && S.water >= 1) need = chooseFacility(s, false, 'thirst');
  if (!need || need === s.lastFacility) return false;
  s.facility = need; s.mode = 'goFacility'; s.stateTicks = 9999; s.dest = null; s.path = null; s.why = `Getting ready for the night → ${DEFS[need.type].name}`; return true;
}
/* combat: a survivor under attack shouts for help; the two nearest free fighters come */
let helpEmoT = 0;
function callHelp(s, z) {
  if ((s.helpT || 0) > tick) return; s.helpT = tick + 240; if (!bark(s, isFighter(s) ? 'engage' : 'help', {}, { pri: 2 }) && (s.helpEmoT || 0) < tick && helpEmoT < tick) { s.helpEmoT = tick + 1500; helpEmoT = tick + 240; emote(s, isFighter(s) ? '😤' : '🆘', 90, true); }   /* 3D.100 owner: a spam of angry faces in long fights (every fighter every 4 s); now one face per person per 25 s, one every 4 s town-wide */
  S.sv.filter((q) => q !== s && isFighter(q) && canFight(q) && !(q.carriedLoot && q.carryAmt) && !['chase', 'attack', 'recover', 'down', 'hospital', 'away', 'errand', 'rescueTo', 'rescueCarry'].includes(q.mode) && dist(q.w, s.w) < (gearFx(s, 'radio') || gearFx(q, 'radio') ? 18 : 9))
    .sort((a, b) => dist(a.w, s.w) - dist(b.w, s.w)).slice(0, 2).forEach((q) => { engage(q, z); q.why = `Answering ${s.name}'s call for help`; if (!(rnd() < .6 && bark(q, 'answer', { other: s.name }, { pri: 2 })) && helpEmoT - 200 < tick) emote(q, '💪', 80, true); });
}
function chooseLifePurpose(s) {
  if (downedUnassigned().length) { assignRescue(); if (s.mode === 'rescueTo') return; }
  const cfg = jobAI[s.job] || jobAI.Civilian;
  if (acquireEnemy(s)) return;   // a zombie in sight comes before any errand
  { const gp = myPost(s); if (gp && postActive(gp)) {   /* V2.45: on watch at a guard post (needs still come first) */
    const u = urgentNeed(s), b = u && chooseFacility(s, true, URGENT_FOR[u]);
    if (b) { s.facility = b; s.mode = 'goFacility'; s.stateTicks = 9999; s.dest = null; s.path = null; s.why = `${u}: a quick break, then back to the ${postName(gp)}`; return; }
    s.dest = postPt(gp); s.mode = 'walk'; s.purpose = 'post'; s.path = null; s.stateTicks = 900; s.why = `Heading to the ${postName(gp)} (${(POST_SCHED[gp.sched] || POST_SCHED.night).name.toLowerCase()})`; return; } }
  if (onShift(s)) {   /* V2.36: on shift → back to work unless something urgent comes first */
    const u = urgentNeed(s), b = u && chooseFacility(s, true, URGENT_FOR[u]);
    if (b) { s.facility = b; s.mode = 'goFacility'; s.stateTicks = 9999; s.dest = null; s.path = null; s.why = `${u}: quick break at the ${DEFS[b.type].name}, then back to work`; s.returnToWork = true; return; }
    if (!u && s.chop === true && rnd() < .3 && tryGather(s)) { s.why = 'Gathering for a while, then back to the ' + DEFS[s.post.type].name; return; }   /* 3D.30: Gather on = part of the shift goes to gathering */
    s.mode = 'goWork'; s.dest = null; s.path = null; s.stateTicks = 9999; s.why = `Shift at the ${DEFS[s.post.type].name} (until ${shifts().find(([a, z]) => S.hour >= a && S.hour < z)[1]}:00)`; return;
  }
  if (isNight() && s.fatigue > (hasT(s, 'owl') ? 60 : 35) - (S.hour >= 22 || S.hour < 5 ? 30 : 0) + (s.id * 7) % 12) {   /* V2.43: Night Owls stay up */   /* V2.36: nights are for sleep: a bed if one is free, otherwise sleep rough (half the rest) */
    { const nd = s.thirst >= 85 && S.water >= 1 ? 'thirst' : s.hunger >= 85 && S.food >= 1 ? 'hunger' : null, fb = nd && chooseFacility(s, false, nd); if (fb) { s.facility = fb; s.mode = 'goFacility'; s.stateTicks = 9999; s.dest = null; s.path = null; s.why = `${nd === 'thirst' ? 'A drink' : 'A bite'} before bed → ${DEFS[fb.type].name}`; return; } }   /* 3D.63: woke up parched → drink first, then back to bed */
    const bed = bedFor(s);
    if (bed) { s.facility = bed; s.mode = 'goFacility'; s.stateTicks = 9999; s.dest = null; s.path = null; s.why = `Going to bed at the ${DEFS[bed.type].name}`; return; }
    s.mode = 'wait'; s.dest = null; s.path = null; s.moving = false; s.sleeping = 'rough'; s.stateTicks = Math.min(9500, ((S.hour >= 20 ? 30 : 6) - S.hour) * 1000 - (tick % 1000) + wakeOff(s)); s.why = 'Sleeping rough: no free bed (build a Shelter)'; s.idleBubble = '💤'; return;
  }
  if (nightPrep(s)) return;
  if (pitchIn(s)) return;
  if (goCampfire(s)) return;
  if (!urgentNeed(s) && (tryHaul(s) || tryHammer(s) || (chopOn(s) && tryGather(s)))) return;   /* V3D.22/23: deliver, build, gather */
  if (rnd() < Math.min(.94, .58 * cfg.town) && chooseTownAction(s)) return;
  if (chooseTownAction(s)) return;
  if (rnd() < .38 && startChat(s)) return;
  const r = rnd();
  if (s.job === 'Guard' || (s.job === 'Police Officer' && r < (policy() === 'defend' ? .6 : .35))) { s.dest = patrolDest(); s.mode = 'walk'; s.purpose = 'patrol'; s.why = (S.posts || []).length ? 'Patrolling between the guard posts' : 'Patrolling the edge of town'; s.stateTicks = 700; return; }
  if ((S.food < 1 || S.water < 1) && activeZ() <= 2 && !isNight() && (s.hunger > 50 || s.thirst > 50 || s.job === 'Scavenger') && rnd() < .7) {   /* V3D.15: nothing in stock → go out and look for some */
    s.forage = S.food < 1 ? 'food' : 'water'; s.dest = tc(2 + OFF + Math.floor(rnd() * 11), 2 + OFF + Math.floor(rnd() * 3)); s.mode = 'walk'; s.purpose = 'scav-out'; s.why = `Out looking for ${s.forage === 'food' ? '🍖' : '💧'}`; s.stateTicks = 900; emote(s, s.forage === 'food' ? '🍖❓' : '💧❓', 100, true); return; }
  if (s.job === 'Scavenger' && r < .30 && activeZ() <= 3) { s.dest = tc(2 + OFF + Math.floor(rnd() * 11), 2 + OFF + Math.floor(rnd() * 3)); s.mode = 'walk'; s.purpose = 'scav-out'; s.why = 'Scavenging outside the walls'; s.stateTicks = 900; return; }
  if (r < .66) { settlePause(s); return; }
  s.dest = roamDest(s); s.mode = 'walk'; s.purpose = 'roam'; s.why = 'Strolling through town'; s.stateTicks = 600;
}
const activeZ = () => S.z.filter((z) => z.hp > 0 && !z.human).length;
function gearUpgrade(s) {   /* best improvement for any slot: free from the stash first, else buy basic gear at the Armory with scrap */
  let best = null, gain = 0;
  for (const slot of SLOTS) {
    const cur = itemScore(itemOf(s, slot)), opts = [];
    for (const id of Object.keys(S.inv || {})) if (ITEMS[id] && ITEMS[id].slot === slot) opts.push({ id, buy: false });
    const reserve = 10 + upkeepTotal() * 2 + jobList().reduce((a, { j }) => a + Math.max(0, (j.need.mat || 0) - (j.got.mat || 0)), 0);   /* V2.15: never spend the scrap the town needs for upkeep and building (V3D.26: and for building work under way) */
    for (const id of (ARMORY_STOCK[slot] || [])) if (ITEMS[id].cost + reserve <= S.mat) opts.push({ id, buy: true });
    for (const o of opts) { const sc = itemScore(ITEMS[o.id]) - cur - (o.buy ? ITEMS[o.id].cost * .5 : 0); if (itemScore(ITEMS[o.id]) > cur * 1.12 + 1 && sc > gain) { gain = sc; best = { ...o, slot }; } }
  }
  return best;
}
function finishFacility(s) {
  const b = s.facility; if (!b) { s.activity = null; enterFree(s, 110); return; } const r = facilityRules[b.type]; if (!r) { s.facility = null; enterFree(s, 110); return; }
  s.sat += (r.sat + combos(b).sat) * Math.max(.6, sMod(s, 'cha', .05)); floats.push({ w: { ...s.w }, t: '♥+' + r.sat, col: '#ff9fbd', a: 70 });
  if (r.need === 'hunger') { if (S.food >= .5) s.hunger = Math.max(0, s.hunger - r.benefit * (hasSkill(s, 'fieldRations') ? 1.25 : 1) * (b && isWorking(b) && b.staff.job === 'Cook' ? 1.5 : 1) * (b && isWorking(b) && hasSkill(b.staff, 'headChef') ? 1.3 : 1) * (b && isWorking(b) ? Math.max(.8, sMod(b.staff, 'cha', .03)) : 1) * (1 + combos(b).meal) * (b.unpaid ? .5 : 1)); else floats.push({ w: { ...s.w }, t: 'No 🍖', col: '#ff8a7a', a: 70 }); }
  if (r.need === 'thirst') { if (S.water >= .5) s.thirst = Math.max(0, s.thirst - r.benefit * (hasSkill(s, 'fieldRations') ? 1.25 : 1)); else floats.push({ w: { ...s.w }, t: 'No 💧', col: '#ff8a7a', a: 70 }); }
  if (rnd() < .2 && bark(s, { hunger: 'eat', thirst: 'drink', fatigue: 'sleep' }[r.need] || 'happy')) {} else
  if (r.need === 'hunger' && rnd() < .6) emote(s, '😋', 80); if (r.need === 'thirst' && rnd() < .5) emote(s, '😌', 80); if (r.need === 'fatigue' && rnd() < .4) emote(s, '🥱', 70);
  if (r.need === 'fatigue' && !s.sleeping && s.hp > 0 && s.hp < s.max * .75) { const h = Math.max(1, Math.round(s.max * (.05 + r.benefit / 600))); s.hp = Math.min(Math.round(s.max * .75), s.hp + h); floats.push({ w: { ...s.w }, t: '+' + h + ' HP', col: '#7fd35a', a: 60 }); }   /* 3D.47 owner: sleep heals, up to 75% (beds that rest better heal more; a doctor gets you the rest) */
  if (r.need === 'fatigue') { s.fatigue = Math.max(0, s.fatigue - r.benefit); if (b && isT(b, 'house') && b.owner === s.id) { s.fatigue = Math.max(0, s.fatigue - r.benefit * .5); s.sat = Math.min(100, (s.sat || 0) + 2); } }   /* own home: rests 50% better, +2 ♥ */
  if (r.need === 'injury' && s.wounded) { s.wounded = false; floats.push({ w: { ...s.w }, t: 'Wound treated', col: '#7fd35a', a: 70 }); }   /* 3D.67: only a medical building treats a field wound */
  if (r.need === 'injury') { const med = (S.meds || 0) >= .25; if (med) { S.meds -= .25; flow('meds', 'Treatment', -.25); } s.hp = Math.min(s.max, s.hp + r.benefit * (med ? 1.6 : 1)); if (med && rnd() < .3) floats.push({ w: { ...s.w }, t: '💊', col: '#ff9fbd', a: 60 }); }   /* V3D.25: medicine in stock heals 60% more */   // no medicine stock: care is limited by the building's tier, beds and the time it takes
  if (isT(b, 'armory')) { for (let n = 0; n < 2; n++) { const g = gearUpgrade(s); if (!g) break; if (g.buy) { S.mat -= Math.max(1, ITEMS[g.id].cost - (combos(b).arsenal ? 1 : 0)); stashAdd(g.id); } equip(s, g.id); s.sat += 2; note('routine', s.name + (g.buy ? ' bought a ' : ' took a ') + ITEMS[g.id].name + ' at the Armory' + (g.buy ? ' (−' + ITEMS[g.id].cost + ' scrap).' : '.'), { at: s.w, float: '🛡 ' + ITEMS[g.id].name.toUpperCase(), col: '#b6f0ff' }); } }
  if (r.need === 'train') {   /* each visit fills a stat's training bar; 100 = +1 permanent point */
    if (s.trainDay !== S.day) { s.trainDay = S.day; s.trainN = 0; } s.trainN++;
    if (isT(b, 'library')) S.rp = (S.rp || 0) + 1;   /* V2.18: study sessions feed the research effort */
    s.tp = s.tp || {}; s.st = s.st || rollStats(s.job, s.l); const k = r.stat, gainT = r.benefit * (b.q || 10) / 10 * Math.max(.7, sMod(s, 'int', .02)) * (1 + combos(b).train) * (b.unpaid ? .5 : 1);
    s.tp[k] = (s.tp[k] || 0) + gainT; s.fatigue = Math.min(100, s.fatigue + 6);
    while (s.tp[k] >= 100 && s.st[k] < STAT_CAP) { s.tp[k] -= 100; s.st[k]++; S.trainPts = (S.trainPts || 0) + 1; if (k === 'end') setMaxHp(s); note('routine', `${s.name}'s ${STAT_NAME[k]} rose to ${s.st[k]}.`); }
    floats.push({ w: { ...s.w }, t: '+' + STAT_NAME[k].slice(0, 3).toUpperCase(), col: '#b6f0ff', a: 60 });
  }
  gainXp(s, .5);   /* using town buildings teaches a little */
  if (isWorking(b) && b.staff !== s) gainXp(b.staff, r.need === 'injury' ? 3 : 1);   /* the staff member (medic, cook, farmer, engineer) learns from every visitor served */
  if (!s.resident && s.sat >= 35 && !s.requested) { s.requested = true; queueResidentRequest(s); }
  if (s.sleeping) { s.fatigue = 0; s.sleeping = false; }
  /* V3D.15: one longer stay instead of in-and-out trips: keep resting / being treated while it is still needed (up to 3 extra rounds) */
  if (!onShift(s) && !threatOf(s) && (s.stays || 0) < 3 && ((r.need === 'fatigue' && s.fatigue > 30) || (r.need === 'injury' && s.hp < s.max * .7 && s.hunger < 100 && s.thirst < 100))) { s.stays = (s.stays || 0) + 1; s.stateTicks = r.use; s.mode = 'useFacility'; s.activity = r.label; return; }
  s.stays = 0;
  { s.visits = (s.visits || []).filter((v) => tick - v[1] < 1500); s.visits.push([b.type, tick]); if (s.visits.filter((v) => v[0] === b.type).length >= 3) { (s.avoid ||= {})[b.type] = tick + 2500; s.visits = []; emote(s, '😩', 90); } }
  s.lastFacility = b; s.facility = null; s.activity = null; s.mode = 'free'; s.stateTicks = onShift(s) ? 8 : 120 + s.i * 28; s.cool = 0; s.why = onShift(s) ? 'Back to work' : 'Feeling better'; ui();
}
function ai(s) {
  if (s.para > 0 && s.hp > 0 && !['down', 'hospital', 'away'].includes(s.mode)) { s.para--; s.moving = false; if (s.para % 120 === 0) emote(s, '😵', 60); return; }   /* 3D.83 paralysed by a Lasher: cannot move, shoot or fight */
  if (s.cool > 0) s.cool--; if (s.stateTicks > 0) s.stateTicks--; emoTick(s); if (s.reloadT > 0 && !['attack', 'recover'].includes(s.mode) && --s.reloadT <= 0) reloadGun(s);   /* reloads finish out of combat too */
  if (tick % 90 === (s.i * 17) % 90 && !['down', 'hospital', 'away'].includes(s.mode)) { { const ns = (hasSkill(s, 'ironStomach') ? .8 : 1) * Math.max(.6, 1 - (stat(s, 'end') - 5) * .02); s.hunger = Math.min(100, s.hunger + .3 * ns); s.thirst = Math.min(100, s.thirst + .36 * ns); } /* V2.11.1: ~3.3 hunger / ~4 thirst per game hour (was ~17 / ~20, which pinned everyone at 100) */ if (!s.sleeping) s.fatigue = Math.min(100, s.fatigue + .45 * (hasT(s, 'diligent') ? 1.2 : 1)); pantry(s); starve(s); }   /* 3D.63 study: fatigue rose ~11/hour (3x hunger), so everyone was 'Exhausted' by 13:00, napped through lunch and skipped the bonfire; now ~5/hour, and it doesn't rise while asleep (rough sleepers woke exhausted) */
  if (s.fleeT > 0) s.fleeT--;
  if (s.sleeping && !(s.mode === 'useFacility' || (s.mode === 'wait' && s.sleeping === 'rough'))) s.sleeping = false;   /* 3D.66 overnight soak: someone woken by a fight, an SOS or a rescue kept the 'asleep' flag (shown asleep at midday, tired never rose) */
  if (hasSkill(s, 'firstAid') && tick % (hasSkill(s, 'miracleWorker') ? 100 : 300) === (s.i * 31) % (hasSkill(s, 'miracleWorker') ? 100 : 300) && s.hp > 0 && s.hp < s.max && !['chase', 'attack', 'recover', 'down'].includes(s.mode)) s.hp = Math.min(s.max, s.hp + 1);
  if (s.hp <= 0 && s.mode !== 'down') { s.bark = null; barkSomeone('help', {}, { pri: 2, line: s.name + ' is down! Help!', style: 'shout' }, s.w, s); s.hp = 0; s.mode = 'down'; s.target = null; s.dest = null; s.path = null; s.facility = null; s.activity = null; s.moving = false; s.rescuer = null; s.rescuing = null; s.carrying = null; s.why = 'Collapsed — needs rescue'; s.stable = false; s.ordered = false; if (s.downD !== S.day) { s.downD = S.day; s.downN = 0; } s.downN = (s.downN || 0) + 1; endAid(s); if (s.aidBy) { const m = s.aidBy; if (m.aidTo === s && m.aidKind === 'patch') { endAid(m); enterFree(m, 30); } } SFX('down'); s.bleed = bleedMax(); s.warned = false; downAlert(s); return; }
  if (s.mode === 'down') { s.moving = false; bleedTick(s); return; }
  if (s.wounded && s.mode !== 'hospital' && !(s.mode === 'useFacility' && injuryTrip(s)) && s.hp > Math.round(s.max * FIELD_CAP)) s.hp = Math.round(s.max * FIELD_CAP);   /* 3D.67: a field wound heals no further until treated */
  if (s.aidBy && s.aidBy.mode === 'fieldAid' && s.aidBy.aidTo === s && s.aidBy.aidT > 0 && ['free', 'walk', 'wait'].includes(s.mode) && !s.carrying && !threatOf(s)) { s.moving = false; s.why = 'Being patched up by ' + s.aidBy.name; return; }
  if (s.haul && s.purpose !== 'haul-get' && s.purpose !== 'haul-put') cancelHaul(s);   /* V3D.23: an interrupted delivery goes back to the stockpile */
  if (s.carriedLoot && !s.haul && s.purpose !== 'gath-back') dropWood(s);   /* V3D.22: interrupted on the way home: the load still counts */
  if (s.gatherAt && s.purpose !== 'gath-out' && s.mode !== 'gather') s.gatherAt = null;
  if (s.hammerJob != null && s.purpose !== 'build-go' && s.mode !== 'hammer') endHammer(s);
  if (s.errand && (s.mode === 'errand' || s.mode === 'away')) { errandAi(s); return; }   /* V3D.17 */
  if (s.mode === 'fix') { fixTick(s); return; }
  if (['goFacility', 'useFacility', 'goWork', 'work', 'walk', 'wait', 'free', 'goFire', 'fightFire', 'postCombat', 'loot', 'chat', 'campfire', 'pitch', 'gather', 'hammer'].includes(s.mode) && tick % 6 === s.i % 6 && !insideBuilding(s)) { const th = threatOf(s); const busyCarry = (s.carriedLoot && s.carryAmt && s.purpose === 'gath-back') || (s.haul && s.purpose === 'haul-put'); if (th && busyCarry && !(th.target === s && dist(th.w, s.w) < 1.3)) { /* 3D.28: carriers deliver first, fight only when cornered */ } else if (th) { if (s.mode === 'chat') endChat(s); if (s.mode === 'gather') { s.gatherAt = null; s.activity = null; } if (s.mode === 'pitch') endPitch(s); s.fire = null; s.faceW = null; if (isFighter(s) || (th.human && s.hp >= s.max * .5)) { engage(s, th); emote(s, '😤', 70); } else { startHide(s, th); emote(s, '😱', 90, true); } return; } }
  if (s.mode === 'loot') {   /* V3D.12: walking over to a zombie's dropped bag */
    const bag = (S.bags || []).find((b) => b.id === s.lootId && !b.opened); if (!bag) { s.lootId = null; enterPost(s); return; }
    if (tick - bag.t0 < 45) { s.moving = false; return; }   /* let it land first */
    const r = followPath(s, bag.w, CHASE); if (r === 'arrived') { openBag(bag, s); s.lootId = null; enterPost(s); } else if (r === 'fail') { openBag(bag, s); s.lootId = null; enterPost(s); } return;
  }
  if (s.mode === 'chat') { chatTick(s); return; }
  if (s.mode === 'campfire') { campfireTick(s); return; }
  if (s.mode === 'pitch') { pitchTick(s); return; }
  if (s.mode === 'gather') { gatherTick(s); return; }
  if (s.mode === 'hammer') { hammerTick(s); return; }
  if (s.mode === 'hide') {   /* running for cover */
    const b = s.hideAt; if (!b || !world.buildings.includes(b)) { s.hideAt = null; enterFree(s, 30); return; }
    const r = followPath(s, Wd.doorPoint(b), CHASE); if (r === 'arrived') { s.w = { ...Wd.doorPoint(b) }; s.mode = 'hiding';   /* 3D.64 balance study: 'arrived' near the door (blocked by the crowd) left them 'hiding' outside, where the zombies ate them; in through the door */ s.stateTicks = 160; s.path = null; s.why = 'Hiding in ' + DEFS[b.type].name; } else if (r === 'fail') { const th = threatOf(s); s.hideAt = null; if (th) { engage(s, th); s.why = 'Cornered — fighting back'; } else enterFree(s, 40); } return;
  }
  if (s.mode === 'hiding') {   /* inside: hidden and safe; come out once the area is clear */
    s.moving = false; const b = s.hideAt; if (!b || !world.buildings.includes(b)) { s.hideAt = null; enterFree(s, 30); return; }
    if (tick % 90 === (s.i * 13) % 90) {   /* V2.18: sheltering indoors they eat, drink and rest from the town stores, and call for the guards */
      if (S.water >= .05) { S.water -= .005; s.thirst = Math.max(0, s.thirst - .7); } if (S.food >= .05) { S.food -= .005; s.hunger = Math.max(0, s.hunger - .6); } s.fatigue = Math.max(0, s.fatigue - 1.5); if (s.hp < s.max) s.hp = Math.min(s.max, s.hp + 1); S.alert = Math.max(S.alert, 200); }   /* V2.37: sheltering also patches you up slowly */
    if (s.stateTicks <= 0) { const dn = isFighter(s) && canFight(s) && S.sv.some((q) => q.mode === 'down' && !q.rescuer);   /* 3D.64 balance study: 'hiding' was the commonest state just before going down: non-fighters came out early to help someone who was down and were caught 3 tiles from the door; now only fit fighters come out early */ if (zombieNear(Wd.doorPoint(b), lastStand() ? 8 : dn ? 3.2 : 6.5) ||   /* 3D.66: in a last stand they stay in until nothing is within 8 tiles (they popped out, saw a zombie further off, and ran back in) */ (dn && S.z.some((z) => z.hp > 0 && !z.zoo && ['zchase', 'zattack', 'zrecover'].includes(z.mode) && dist(z.w, Wd.doorPoint(b)) < 7))) s.stateTicks = 120;   /* 3D.48: someone is down: come out as soon as nothing is right outside or hunting */ else { s.hideAt = null; s.wary = tick + 900; enterFree(s, 30); s.why = 'Coming out — area clear'; } } return;
  }   // being attacked beats lunch
  if (s.mode === 'hospital') { s.moving = false; if (s.stateTicks <= 0) { const cb = s.careAt; s.wounded = false; s.stable = false; s.hp = Math.round(s.max * (isCamp(cb) || !cb ? .55 : cb.type === 'hospital' ? 1 : cb.type === 'clinic' ? .85 : .7)); s.fatigue = Math.max(0, s.fatigue - 35); enterFree(s, 420); s.why = 'Recovered'; note('routine', s.name + ' recovered and returned.'); } return; }
  if (s.mode === 'rescueTo') {
    const q = s.rescuing; if (!q || q.mode !== 'down') { s.rescuing = null; enterPost(s); return; }
    if (tick % 15 === s.i % 15) { const zb = S.z.find((z) => z.hp > 0 && !z.human && dist(z.w, q.w) < 2.2); if (zb && dist(s.w, q.w) < 4 && isFighter(s) && s.hp > s.max * .4) { q.rescuer = null; s.rescuing = null; engage(s, zb); s.why = `Clearing the way to ${q.name}`; return; } }   /* V2.37: clear first, then pick up */
    if (q.ordered && !isFighter(s)) { const crowd = S.z.filter((z) => z.hp > 0 && !z.zoo && z.mode !== 'zleave' && dist(z.w, q.w) < 2.5).length;   /* 3D.75 skill study: a sent rescuer waits a few steps back until the escorts have thinned the crowd (it used to walk straight in: the expert lost 8 a town) */
      if (crowd >= 2 && dist(s.w, q.w) < 6) { s.moving = false; s.path = null; s.why = `Waiting for the way to ${q.name} to clear`; if (tick % 120 === 0) orderEscorts(q); return; } }
    const r = followPath(s, q.w, .02); if (r === 'arrived' && s.job === 'Medic' && !s.aidTo && !zNear(q.w, 3) && patchSupply(true)) { startAid(s, q, 'revive'); return; } if (r === 'arrived') { s.carrying = q; q.w = { x: s.w.x, y: s.w.y }; s.mode = 'rescueCarry'; s.path = null; s.careTo = careDest(); s.why = `Carrying ${q.name} to ${s.careTo ? 'the ' + DEFS[s.careTo.type].name : 'safety'}`; note('routine', `${s.name} picked up ${q.name}.`); } else if (r === 'fail') { q.rescuer = null; s.rescuing = null; enterPost(s); } return;
  }
  if (s.mode === 'rescueCarry') {
    const q = s.carrying; if (!q) { enterPost(s); return; }
    if (!s.careTo || !world.buildings.includes(s.careTo)) s.careTo = careDest(); const dB = s.careTo;
    const r = followPath(s, sitePoint(dB), CARRY); q.w = { x: s.w.x - .12, y: s.w.y - .05 };
    if (r === 'fail' && dist(s.w, sitePoint(dB)) > 1.5 && (s.carryFail = (s.carryFail || 0) + 1) < 6) { s.path = null; return; }   /* 3D.63: a blocked path is retried, not teleported through */
    if (r === 'arrived' || r === 'fail') { s.carryFail = 0; q.w = { ...sitePoint(dB) }; s.careTo = null; addBond(s, q, 8); q.mode = 'hospital'; q.hp = 1; q.stable = false; statAdd('saved'); emote(q, '🙏', 120, true); if (!bark(s, 'rescuer', { other: q.name }, { pri: 1 })) emote(s, '❤️', 100, true); q.bleed = null; q.stateTicks = Math.round(careTicks(dB) * (hasSkill(s, 'steadyHands') || (medSite() && medSite().staff && hasSkill(medSite().staff, 'steadyHands')) ? .7 : 1)); gainXp(s, 4); if (hasSkill(s, 'miracleWorker')) q.stateTicks = Math.round(q.stateTicks * .7); q.rescuer = null; q.why = 'Recovering in care'; SFX('rescued'); q.careTotal = q.stateTicks; q.careAt = dB; q.path = null; s.carrying = null; s.rescuing = null; enterPost(s); note('routine', q.name + ' reached ' + (dB ? 'the ' + DEFS[dB.type].name : 'safety') + (isCamp(dB) ? ' (no medical bed free: slower care)' : '') + '.'); } return;
  }
  if (s.mode === 'fieldAid') { fieldAidAI(s); return; }
  if (s.mode === 'goFire' || s.mode === 'fightFire') { fireAI(s); return; }
  if (s.mode === 'goWork') {
    if (!s.post || !world.buildings.includes(s.post) || s.post.staff !== s) { s.post = null; enterFree(s, 30); return; }
    if (acquireEnemy(s)) return;   /* 3D.63: any fighter who picked a fight stops heading to work this tick */
    const r = followPath(s, Wd.doorPoint(s.post), WALK * 1.1);
    if (r === 'arrived') { if (!OPEN_AIR.has(s.post.type)) s.w = { ...Wd.doorPoint(s.post) }; s.mode = 'work'; s.activity = 'Working'; s.stateTicks = shiftLeft() || 600; s.path = null; s.returnToWork = false; s.why = `Working at the ${DEFS[s.post.type].name}` + (shiftLeft() ? ` until ${shifts().find(([a, z]) => S.hour >= a && S.hour < z)[1]}:00` : ''); }
    else if (r === 'fail') { enterFree(s, 120); s.why = "Couldn't reach work — trying later"; } return;
  }
  if (s.mode === 'work') {
    s.moving = false; if (!s.post || !world.buildings.includes(s.post) || s.post.staff !== s) { s.post = null; s.activity = null; enterFree(s, 30); return; }
    if (downedUnassigned().length && tick % 30 === 0) { assignRescue(); if (s.mode === 'rescueTo') { s.activity = null; return; } }
    if (tick % 20 === s.i % 20 && acquireEnemy(s)) { s.activity = null; return; }
    if (tick % 1000 === (s.i * 37) % 1000) gainXp(s, 2);   /* every game hour on shift */
    if (tick % 120 === (s.i * 7) % 120) { const u = urgentNeed(s, true); if (u && chooseFacility(s, true, URGENT_FOR[u])) { s.activity = null; enterFree(s, 5); s.why = `${u}: taking a break`; return; } }   /* 3D.63: only walk off the job when there's somewhere to go (it flickered work ↔ break every 2 s) */   /* V2.36: only urgent needs end a shift early */
    if (s.stateTicks <= 0 || !onShift(s)) { s.activity = null; gainXp(s, 1); enterFree(s, 20); s.why = 'Shift over'; } return;
  }
  if (s.mode === 'goFacility') {
    if (!s.facility || !world.buildings.includes(s.facility)) { s.facility = null; enterFree(s, 25); return; }
    const r = followPath(s, Wd.doorPoint(s.facility), WALK * 1.15);
    if (r === 'arrived') { const ru = facilityRules[s.facility.type]; if (!OPEN_AIR.has(s.facility.type)) s.w = { ...Wd.doorPoint(s.facility) }; s.mode = 'useFacility';   /* 3D.61: in through the door */ s.activity = ru.label; s.stateTicks = ru.use + (ru.need === 'injury' ? Math.round(900 * (1 - s.hp / s.max)) : 0); s.path = null; s.why = ru.label + ' at ' + DEFS[s.facility.type].name;
      if (ru.need === 'fatigue' && isNight()) { s.sleeping = true; s.activity = 'Sleeping'; s.stateTicks = Math.min(9500, ((S.hour >= 20 ? 30 : 6) - S.hour) * 1000 - (tick % 1000) + wakeOff(s)); s.why = `Sleeping at the ${DEFS[s.facility.type].name} until 6:00`; } }   /* V2.36: a bed for the night = fully rested */
    else if (r === 'fail') { s.noReach = { b: s.facility, t: tick + 3000 }; s.facility = null; enterFree(s, 90); s.why = "Couldn't reach it — trying later"; } return;
  }
  if (s.mode === 'useFacility') { s.moving = false; if (!s.facility || !world.buildings.includes(s.facility)) { s.facility = null; s.activity = null; enterFree(s, 40); return; }
    if ((s.talk || talkOk(s)) && s.stateTicks < 25) s.stateTicks = 25;   /* finish the sentence before leaving */
    if (!s.sleeping && OPEN_AIR.has(s.facility.type)) { const fb = s.facility; sitTalk(s, (o) => o.mode === 'useFacility' && o.facility && (o.facility === fb || (OPEN_AIR.has(o.facility.type) && dist(o.w, s.w) < 2.8)) && !o.sleeping); }
    if (s.sleeping && ((s.thirst >= 92 && S.water >= 1) || (s.hunger >= 92 && S.food >= 1))) { const th = s.thirst >= 92; s.sleeping = false; s.facility = null; s.activity = null; enterFree(s, 0); s.why = th ? 'Woke up parched' : 'Woke up starving'; return; }   /* 3D.63 study: people slept on while dying of thirst */
    if (s.sleeping && tick % 250 === (s.i * 17) % 250 && s.hp > 0 && s.hp < s.max * .75) { const fr = facilityRules[s.facility.type], h = Math.max(1, Math.round(s.max * (.015 + (fr ? fr.benefit : 26) / 2600))); s.hp = Math.min(Math.round(s.max * .75), s.hp + h); }   /* 3D.47 a night in bed heals (to 75%): about +2.5% every 15 min of game time, more in better beds */ if (s.stateTicks <= 0) { finishFacility(s); if (s.mode === 'free' && !onShift(s)) s.stateTicks = 50 + (s.i % 8) * 9; } return; }   /* 3D.63: the pause after a facility no longer overwrites 'keep resting' rounds or the quick return to work */
  if (['chase', 'attack', 'recover'].includes(s.mode)) {
    if (!s.target || s.target.hp <= 0) { enterPost(s); return; }
    if (retreatCheck(s)) return;
    { const t = s.target, tt = tileOf(t.w);   /* 3D.64 owner: no chasing a zombie that is leaving, or out past the edge of town */
      if (t.mode === 'zleave' || (s.mode === 'chase' && !t.human && !nearTown(t.w) && dist(s.w, t.w) > 1.5 && !(t.target && S.sv.includes(t.target)))) { s.skipZ = { z: t, t: tick + 600 }; s.target = null; s.why = 'Let it go'; enterPost(s); return; } }
    if (tick % 30 === s.i % 30 && !(s.target.mode === 'zattack' && s.target.target && S.sv.includes(s.target.target))) {   /* 3D.64 owner: break off to save someone being eaten close by */
      const z2 = S.z.filter((z) => z.hp > 0 && !z.human && z !== s.target && z.mode === 'zattack' && z.target && z.target !== s && S.sv.includes(z.target) && dist(z.w, s.w) < 4).sort((a, b) => dist(a.w, s.w) - dist(b.w, s.w))[0];
      if (z2) { s.target = z2; s.mode = 'chase'; s.path = null; s.comboQ = 0; s.why = 'Helping ' + z2.target.name; if (rnd() < .4) emote(s, '❗', 60, true); return; } }
    if (s.mode === 'chase') { const d = dist(s.w, s.target.w), rng = rangeOf(s) - (weaponOf(s).ranged ? .3 : 0); if (d > rng) {
      /* V3D.21: close in on a target others are already fighting through your own spot around it (evenly spaced round the
         target from the first fighter's side), instead of queuing behind the one who is swinging */
      const mates = d < 2.4 ? S.sv.filter((q) => q.target === s.target && q.hp > 0 && (q.mode === 'chase' || q.mode === 'attack')).sort((a, b) => a.id - b.id) : [];
      if (mates.length > 1) { const t = s.target.w, f = mates[0] === s ? mates[1] : mates[0], base = Math.atan2(f.w.y - t.y, f.w.x - t.x), k = mates.indexOf(s), n = mates.length, a = base + (k * 2 * Math.PI) / n, rr = Math.max(.35, Math.min(rng * .8, .6));
        const slot = { x: t.x + Math.cos(a) * rr, y: t.y + Math.sin(a) * rr }, bx = s.w.x, by = s.w.y; moveSlide(s, slot, CHASE); s.moving = true;
        if (Math.hypot(s.w.x - bx, s.w.y - by) > CHASE * TUNE.move * .2) return; }
      const r = followPath(s, s.target.w, CHASE); if (r === 'fail') { s.skipZ = { z: s.target, t: tick + 600 }; s.target = null; s.why = "Can't get to it"; enterPost(s); } }   /* 3D.124 owner's video: a zombie behind the fence was picked, dropped and picked again every second ('Fighting' flashing) */ else { s.moving = false; s.mode = 'attack'; s.path = null; s.stateTicks = Math.round((32 + s.i * 8) * (weaponOf(s).rate || 1)); } return; }
    if (s.mode === 'attack' && dist(s.w, s.target.w) > rangeOf(s) + (weaponOf(s).ranged ? .6 : .2)) { s.mode = 'chase'; return; }   /* 3D.64 owner: melee swings landed from about a tile away (reach + .6); now reach + .2 */   /* target slipped out of reach: follow, don't swing at air */
    if ((s.mode === 'attack' || s.mode === 'recover') && weaponOf(s).ranged) {   /* V3D.14: shooters step back from a zombie that gets in close (3D.64: between shots too) */
      const near = S.z.find((z) => z.hp > 0 && !z.human && z.target === s && dist(z.w, s.w) < .75);
      if (near) { const dx = s.w.x - near.w.x, dy = s.w.y - near.w.y, l = Math.hypot(dx, dy) || 1; moveSlide(s, { x: s.w.x + dx / l, y: s.w.y + dy / l }, CHASE * .9); s.moving = true; if (rnd() < .02) emote(s, '😰', 50); return; }
    }
    if (s.reloadT > 0) { s.moving = false; if (--s.reloadT <= 0) { reloadGun(s); if (!s.dry) emote(s, '👌', 50); } return; }   /* V3D.16: reloading: can't shoot (zombies still can) */
    if (s.mode === 'attack') { s.moving = false; if (s.stateTicks <= 0 && !weaponOf(s).ranged && dist(s.w, s.target.w) > rangeOf(s) + .25) { s.mode = 'chase'; return; } if (s.stateTicks <= 0) { const z = s.target, w = weaponOf(s), bonus = (professions[s.job]?.combat || 0) + skillDmg(s), dmg = Math.round((4 + w.atk * .55 + (w.ranged ? stat(s, 'per') : stat(s, 'str')) * .6 + bonus) * (w.ranged && hasSkill(s, 'marksman') ? 1.25 : 1) * friendBoost(s) * (isFighter(s) ? 1 : TUNE.nfDmg) * (z.type === 'riot' && w.kind === 'blade' ? .5 : 1) * comboMult(s, z, w) * (z.type === 'raider' && s.job === 'Police Officer' ? 1.5 : 1) * (s.spec && (hasSpec(s, 'swat') || hasSpec(s, 'marksman')) ? 1.2 : 1) * (hungryPen(s) < 1 ? .8 : 1) * (z.type === 'boss' && s.focusUntil > tick ? 1.3 : 1)); z.hp -= dmg; if (z.type === 'boss' && z.hp > 0 && ['zmarch', 'zbash', 'zwall', 'zbreak', 'idle'].includes(z.mode) && !insideBuilding(s)) { z.target = s; z.mode = 'zchase'; z.path = null; z.blocked = 0; }   /* 3D.100 owner: the boss walked about while being shot; it now turns on whoever hits it */ if (s.comboFin) { if (!w.ranged) impactFx({ type: w.kind === 'blunt' ? 'brute' : 'walker' }, z.w); } z.hitT = 9; SFX('hit'); if (w.mag) { s.ammo = (s.ammo == null ? w.mag : s.ammo) - (hasSpec(s, 'marksman') && rnd() < .33 ? 0 : 1); if (usesAmmo(w)) { S.stat = S.stat || {}; S.stat.shots = (S.stat.shots || 0) + 1; } if (s.ammo <= 0) { s.reloadT = Math.round(w.reload * 60); s.ammo = 0; emote(s, '🔄', Math.max(60, s.reloadT), true); } } floats.push({ w: { ...z.w }, t: '-' + dmg, col: '#ffe06b', a: 55 }); gainXp(s, .5); if (w.ranged) shots.push({ a: { ...s.w }, b: { ...z.w }, t: 6, bow: w.kind === 'bow' });
      if (z.hp <= 0) { S.kills++; SFX('kill'); gainXp(s, 2); if (z.type === 'boss') bark(s, 'bossKill', {}, { pri: 2 }); else if (rnd() < .3) bark(s, 'kill', {}, { pri: 1 }); else if (rnd() < .5) emote(s, rnd() < .5 ? '💪' : '😎', 80, true); raiderDown(z); if (z.type === 'boss') { { const pool = ['katana', 'kevlar', 'shotgun', 'rifle', 'military', 'riot', 'crossbow', 'dogtags'], it = pool[Math.floor(rnd() * pool.length)]; dropBag(z.w, 15, s, { meds: 2, fuel: 2, cloth: 2, ...(rnd() < .7 ? { item: it } : {}) }, 'epic'); } S.bossKills = (S.bossKills || 0) + 1; screenToast('☠ BOSS DEFEATED'); SFX('reward'); } const zd = zombieTypes[z.type] || zombieTypes.walker, pd = PART_DROP[z.type] || PART_DROP.walker; const zx = {}; for (const [ch, k, n] of ZDROP[z.type] || []) if (rnd() < ch) zx[k] = (zx[k] || 0) + n; if (rnd() < pd[0] || Object.keys(zx).length) { dropBag(z.w, rnd() < pd[0] ? pd[1] : 0, s, Object.keys(zx).length ? zx : null); }
        if (z.type === 'boss' || z.human) { renownGain(zd.ren, zd.name + ' defeated'); say(s.name + ' defeated a ' + zd.name + '!'); } else { S.ren += zd.ren; floats.push({ w: { x: z.w.x, y: z.w.y - .3 }, t: '+' + zd.ren + '★', col: '#ffd56b', a: 50 }); ui(); }   /* V2.33: no pop-up or log line for every ordinary zombie */ stageCheck(); if (!fetchBag(s)) enterPost(s); return; }
      s.mode = 'recover'; s.stateTicks = s.recDur = s.comboQ > 0 ? 14 : Math.round((48 + s.i * 9) * Math.max(.6, 1 - (stat(s, 'agi') - 5) * .02) * (w.rate || 1)); } return; }   /* 3D.58 combo follow-ups come fast */
    if (s.mode === 'recover') { s.moving = false; if (s.stateTicks <= 0) { const z = s.target; if (s.comboQ > 0 && z && z.hp > 0 && dist(s.w, z.w) < rangeOf(s) + .25) { s.mode = 'attack'; s.stateTicks = 0; return; } s.comboQ = 0; s.mode = 'chase'; s.stateTicks = Math.round(32 * (weaponOf(s).rate || 1)); } } return;
  }
  if (s.mode === 'postCombat') { s.moving = false; if (downedUnassigned().length) { assignRescue(); if (s.mode === 'rescueTo') return; }
    if (s.hp < s.max * .5 && medSite() && facilityUsers(medSite()) < cap(medSite())) { const m = medSite(); s.facility = m; s.mode = 'goFacility'; s.stateTicks = 9999; s.path = null; s.why = 'Hurt after the fight → ' + DEFS[m.type].name; return; }   /* V2.18: patch up before the next one */ if (s.stateTicks <= 0) enterFree(s, 20); return; }
  if (s.mode === 'wait' && s.purpose === 'post-hold') { s.moving = false; const gp = myPost(s); if (!gp || !postActive(gp)) { s.purpose = null; enterFree(s, 20); return; } if (downedUnassigned().length && tick % 30 === 0) { assignRescue(); if (s.mode === 'rescueTo') return; } if (tick % 15 === s.i % 15 && acquireEnemy(s)) { s.purpose = null; return; } if (s.stateTicks <= 0) { s.purpose = null; s.mode = 'free'; s.stateTicks = 0; } return; }
  if (s.mode === 'wait') { s.moving = false; if (s.sleeping === 'rough' && ((s.thirst >= 92 && S.water >= 1) || (s.hunger >= 92 && S.food >= 1))) s.stateTicks = 0; if (s.stateTicks <= 0) { if (s.sleeping === 'rough') { s.fatigue = Math.max(0, s.fatigue - 50); s.sleeping = false; s.why = 'Woke up stiff (slept rough)'; } s.mode = 'free'; s.stateTicks = 0; scavWait(s); } return; }
  if (s.mode === 'walk') {
    if (acquireEnemy(s)) return;
    const r = s.dest ? followPath(s, s.dest, WALK) : 'arrived';
    if (r === 'moving' && s.stateTicks > 0) return;
    if (s.purpose === 'post' && (r === 'arrived' || dist(s.w, s.dest || s.w) < .5)) { s.mode = 'wait'; s.purpose = 'post-hold'; s.stateTicks = 360; s.dest = null; s.path = null; s.idleBubble = '🛡️'; const gp = myPost(s); s.why = gp ? `On guard at the ${postName(gp)}` : 'On guard'; return; }
    if (s.purpose === 'scav-out' && r === 'arrived') { s.mode = 'wait'; s.stateTicks = 160; s.purpose = 'scav-search'; s.why = 'Searching for supplies'; s.dest = null; s.path = null; return; }
    if (s.purpose === 'scav-back' && r === 'arrived') { lootFind(s); gainXp(s, 2); ui(); }
    if (s.purpose === 'gath-out') { if (r === 'arrived' || dist(s.w, s.dest || s.w) < .35) { s.mode = 'gather'; s.purpose = null; s.dest = null; s.path = null; const K = NODE[s.gatherK || 'tree']; s.activity = K.act; s.stateTicks = Math.round(K.ticks / TUNE.work / TOOL_SPEED[toolLvl(s.gatherK || 'tree', false)]); s.why = { tree: 'Chopping a tree', rock: 'Breaking a rock', wreck: 'Stripping a wreck for scrap', bin: 'Rummaging through a clothes bin' }[s.gatherK || 'tree']; return; } if (r === 'fail') s.gatherAt = null; }
    if (s.purpose === 'gath-back' && (r === 'arrived' || r === 'fail' || s.stateTicks <= 0)) { if (!canDeliver(s)) return; dropWood(s); s.purpose = null; }
    if (s.purpose === 'haul-get' && (r === 'arrived' || r === 'fail' || s.stateTicks <= 0)) { const x = s.haul && jobById(s.haul.id); if (!x) { cancelHaul(s); s.purpose = null; } else { s.carriedLoot = s.haul.r; s.carryAmt = s.haul.n; s.purpose = 'haul-put'; s.dest = jobPt(x); s.path = null; s.stateTicks = 2400; s.mode = 'walk'; s.why = `Bringing ${RES_ICON[s.haul.r]} to the ${jobName(x)}`; return; } }
    if (s.purpose === 'haul-put' && (r === 'arrived' || r === 'fail' || s.stateTicks <= 0)) { if (!canDeliver(s)) return; const h = s.haul, x = h && jobById(h.id); s.haul = null; s.carriedLoot = null; s.carryAmt = 0; s.purpose = null;
      if (h && x) { x.j.inb[h.r] = Math.max(0, (x.j.inb[h.r] || 0) - h.n); const add = Math.min(h.n, Math.max(0, (x.j.need[h.r] || 0) - (x.j.got[h.r] || 0))); x.j.got[h.r] = (x.j.got[h.r] || 0) + add; if (h.n > add) S[h.r] += h.n - add; if (add) jobDelivered(x, h.r, add, s); gainXp(s, 1); } else if (h) S[h.r] += h.n; }
    if (s.purpose === 'build-go') { if (r === 'arrived' || dist(s.w, s.dest || s.w) < .4) { s.mode = 'hammer'; s.purpose = null; s.dest = null; s.path = null; s.stateTicks = Math.round(600 / TUNE.work); return; } if (r === 'fail' || s.stateTicks <= 0) { endHammer(s); s.purpose = null; } }
    s.dest = null; s.path = null; settlePause(s, 100, 220); return;
  }
  if (s.mode === 'wait' || s.purpose === 'scav-search') return;
  if (s.mode === 'free') { if (s.stateTicks > 0) { s.moving = false; return; } if (s.carriedLoot && s.carryAmt) { s.dest = depotPt(s); s.mode = 'walk'; s.purpose = 'gath-back'; s.path = null; s.stateTicks = 2400; s.why = 'Taking the load home first'; return; } { const q = medicFindPatient(s); if (q) { startAid(s, q, 'patch'); return; } } chooseLifePurpose(s); }   /* 3D.28: a load in hand goes home before anything else */
}
// scavenger leaves 'wait' after searching → head home
function lootFind(s) {
  const r = s.forage ? (s.forage === 'food' ? .45 + rnd() * .26 : .72 + rnd() * .28) : rnd(); s.forage = null; const _r = r;
  const r2 = _r, bonus = (professions[s.job]?.scav > 2 ? 1 : 0) + (hasSkill(s, 'lootSense') ? 1 : 0), f = (t, col) => floats.push({ w: { ...s.w }, t, col, a: 70 });
  if (r2 < .42) { const n = 1 + bonus; S.mat += n; f('+' + n + ' ⚙', '#9fe0ff'); }
  else if (r2 < .71) { const n = 1 + bonus; S.food += n; S.produced += n; f('+' + n + ' 🍖', '#ffe06b'); }
  else { const n = 1 + bonus; S.water += n; S.produced += n; f('+' + n + ' 💧', '#8fd8ff'); }
}
function scavWait(s) { if (s.purpose === 'scav-search' && s.mode === 'free') { s.mode = 'walk'; s.purpose = 'scav-back'; s.dest = tc(7 + OFF, 9 + OFF); s.why = 'Returning with supplies'; s.stateTicks = 900; } }

/* ---------------- zombies ---------------- */
const Z_ARRIVE = { walker: 1, crawler: 1, runner: 3, dog: 4, bloated: 5, spitter: 6, sporehead: 7, riot: 8, lasher: 8, rotbomb: 9, brute: 10, thrower: 12 };   /* 3D.80 dog, riot, lasher, rotbomb */
function weightedZombie() {
  /* 3D.64 balance study: the strong ones came on day 2-3 (bloated and spitters as soon as the Camp became a Lodge, a boss on night 3)
     and early nights topped out at 15 zombies, so the auto-played town lost 8.5 people in 12 days. Each type now has an arrival day
     (by day, not town rank) and fades in over three days. */
  const hd = hDay(), pool = Object.entries(zombieTypes).filter(([k, v]) => v.weight > 0 && hd >= (Z_ARRIVE[k] || 1)), w = (k, v) => v.weight * Math.min(1, (hd - (Z_ARRIVE[k] || 1) + 1) / 3);
  let tot = pool.reduce((a, [k, v]) => a + w(k, v), 0), r = rnd() * tot; for (const [k, v] of pool) { r -= w(k, v); if (r <= 0) return k; } return 'walker';
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
  camp:  { name: 'Roadside Camp', icon: '⛺', desc: 'Four survivors and the camp tent. Everything else you build yourself. The usual start.', food: 14, water: 14, mat: 16, wood: 12,
    b: [['hq', 8, 11]],   /* 3D.31: just the camp tent */ sv: [['Marcus', 'Guard', 3, 'brave', 7, 12], ['Amy', 'Medic', 2, 'caring', 5, 10], ['Lena', 'Scavenger', 2, 'scrounger', 9, 14], ['Ben', 'Farmer', 1, 'diligent', 6, 11]] },
  farm:  { name: 'Old Farmstead', icon: '🌾', desc: 'Two garden plots and a full pantry, but only three people and few scrap. Strong food, weak defence.', food: 30, water: 22, mat: 10, wood: 16,
    b: [['hq', 8, 11], ['farm', 8, 7], ['farm', 10, 7], ['canteen', 4, 7], ['tent', 11, 11]], sv: [['Ben', 'Farmer', 2, 'diligent'], ['Rosa', 'Farmer', 1, 'eater'], ['Marcus', 'Guard', 2, 'cautious']] },
  scrap: { name: 'Scrapyard Outpost', icon: '⚙️', desc: 'Plenty of scrap and a scrapyard, but almost no food or water: get a Rain Barrel up fast.', food: 6, water: 5, mat: 40, wood: 8,
    b: [['hq', 8, 11], ['scrapyard', 8, 6], ['medic', 2, 7], ['tent', 11, 11], ['tent', 12, 12]], sv: [['Theo', 'Engineer', 2, 'diligent'], ['Lena', 'Scavenger', 2, 'scrounger'], ['Marcus', 'Guard', 2, 'brave'], ['June', 'Civilian', 1, 'caring']] },
  lone:  { name: 'Last Two Standing', icon: '🔥', desc: 'Just a guard, a medic and a tent. Newcomers arrive twice as often in the first week. A hard start.', food: 12, water: 12, mat: 25, arrive: 2,
    b: [['hq', 8, 11], ['medic', 2, 7], ['tent', 11, 11]], sv: [['Marcus', 'Guard', 3, 'brave'], ['Amy', 'Medic', 2, 'caring']] },
};
const ST = () => STARTS[S.start] || STARTS.camp;   /* 3D.41: every new game is the camp start; the others stay only so old saves still load */
function applyStart(key) {   /* builds the opening town for a starting condition */
  const st = STARTS[key] || STARTS.camp; S.start = STARTS[key] ? key : 'camp'; S.food = st.food; S.water = st.water; S.mat = st.mat; S.wood = st.wood ?? 12; S.stone = 0; S.cloth = st.cloth ?? 3; S.meds = st.meds ?? 1; S.fuel = 0; S.ammo = 30; S.tools = { axe: 0, pick: 0, bar: 0 }; S.power = false; S.nodes = {}; S.nodeVer = 0; S.jobSeq = 0; world.buildings = [];
  for (const [type, x0, y0] of st.b) { const x = x0 + OFF, y = y0 + OFF, d = DEFS[type]; if (!d) continue; const chk = Wd.placementCheck(world, x, y, d, null); if (chk.ok) world.buildings.push({ type, x, y, w: d.w, h: d.h, q: d.q, a: d.a }); }
  Wd.bump(world); S.sv = st.sv.map(([n, job, l, tr, x, y], i) => { const q = mk(n, job, l, (x ?? 5 + 2 * (i % 3)) + OFF, (y ?? 10 + (i % 2) * 2) + OFF, i); q.trait = tr; q.max = baseMax(q); q.hp = q.max; return q; });
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
  S.legacy = S.legacy || {}; for (const g of LEGACY) { if (S.legacy[g.id]) continue; const [a, b] = g.prog(); if (a >= b) { S.legacy[g.id] = S.day; S.mat += 10; renownGain(15, 'Legacy goal'); showEventPopup({ title: '🏅 LEGACY: ' + g.name.toUpperCase(), text: `${g.desc}: done on day ${S.day}.<br><br>${legacyDone()} of ${LEGACY.length} legacy goals. ${legacyDone() >= LEGACY_NEED ? 'The radio tower can call for the convoy (Goals).' : `Complete ${LEGACY_NEED} and reach ★5 to call for the convoy.`}`, gains: '+15 Renown · +10 scrap' }); } }
}
const signalReady = () => !S.finale && !S.won && S.rank >= 5 && legacyDone() >= LEGACY_NEED && radioOk() && S.day >= (S.signalAgain || 0);
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
  return Math.max(100, Math.round((500 + 120 * alive + 150 * (S.rank || 1) + 120 * (S.terr || 0) + 10 * Math.min(60, world.buildings.length) + 120 * legacyDone() + 10 * Math.min(S.day, 35) - 80 * lost - 40 * (S.left || 0) - 8 * Math.max(0, S.day - 35)) * DF().score));   /* 3D.72: the score is about growing the town: people, rank, territory and buildings; losing people costs */
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
/* Phase 1 horde ceiling (owner, Nov 8): zombies grow tougher with the days, but only up to a ceiling set by the Haven's rank.
   A town that hasn't upgraded stops getting harder; pressing Upgrade Town raises the ceiling. At the top rank it keeps creeping up slowly for veterans. */
const HORDE_DAY_CAP = [0, 9, 14, 20, 28, 38];
const hordeCap = (r = S.rank || 1) => HORDE_DAY_CAP[Math.min(r, HORDE_DAY_CAP.length - 1)] + (r >= HORDE_DAY_CAP.length - 1 ? Math.max(0, S.day - 60) * .25 : 0);
const hDay = () => Math.min(S.day, ((window.ZH_BAL || {}).noCeil ? 1e9 : hordeCap()));
function danger() {   /* adaptive: tracks how strong the Haven's people are right now (levels and weapons), plus a slow daily creep; a town that just lost its fighters gets weaker waves, a strong one never gets comfortable */
  if (tick - dangerT < 300 && dangerT >= 0) return dangerV; dangerT = tick;
  let st = 0; for (const q of S.sv) if (q.hp > 0 && q.mode !== 'away') st += isFighter(q) ? 8 * (q.l || 1) + weaponOf(q).atk : 1.2 * (q.l || 1);
  return (dangerV = Math.max(.8, Math.min(2.4, .7 + .004 * st + .02 * hDay())));
}
function spawn(x = null, y = null, type = null) {
  const a = spawnPoint(), kind = type || weightedZombie(), d = zombieTypes[kind], dm = danger(), hp = Math.round(d.hp * dm * DF().z);
  S.z.push({ type: kind, pw: (1 + (dm - 1) * .6) * DF().z, w: tc(x ?? a[0], y ?? a[1]), hp, max: hp, cool: 35 + rnd() * 40, phase: rnd() * 100, dest: null, mode: 'appear', stateTicks: 45 + rnd() * 30, target: null, path: null, siege: rnd() < Math.min(.85, .08 + .12 * (S.rank - 1) + (world.walls.size ? .15 : 0) + (isNight() ? .25 : 0) + .05 * (S.terr || 0)), blocked: 0, goal: null, goalT: 0, wallT: null });
}
const nowD = () => S.day + S.hour / 24;
const graceOn = () => (S.graceUntil || 0) > nowD();   /* V2.24 mourning: the horde pulls back after heavy losses */
const avgLevel = () => (S.sv.length ? S.sv.reduce((a, q) => a + (q.l || 1), 0) / S.sv.length : 1);
const isNight = () => S.hour >= 20 || S.hour < 6;   /* V2.12: dangerous nights, quieter days */
/* 3D.68 boss-night balance. The boss probe showed the boss rarely downs anyone itself: what broke towns was that every zombie killed on a
   boss night was replaced within a second, so the fighters wore down until everyone was hiding or down and nobody could reach the downed
   for hours. Now nothing new joins while the boss lives, killing the boss breaks the horde (its followers flee and the rest of the night is
   quiet), and at dawn the followers leave with the boss. */
function mobScatter() { for (const z of S.z) if (z.hp > 0 && !z.human && (z.mob || z.siege) && z.type !== 'boss') { const p = spawnPoint(); z.mode = 'zleave'; z.retreat = true; z.siege = false; z.mob = false; z.target = null; z.path = null; z.leaveTo = p ? tc(p[0], p[1]) : { ...z.w }; } }
function bossWatch() {
  if (S.bossOn == null || S.z.some((z) => z.type === 'boss' && z.hp > 0 && z.mode !== 'zleave')) return;
  const killed = (S.bossKills || 0) > S.bossOn; S.bossOn = null;
  if (killed) { mobScatter(); S.calmUntil = S.day + (S.hour >= 6 ? 1 : 0) + 6 / 24; note('important', '☠ THE HORDE BREAKS', { log: 'With its leader dead, the horde scatters into the dark. The rest of the night is quiet.' }); }
}
const NIGHT_WAVES = [1, .25, .25];   /* 3D.70: share of the night's horde in each wave (1.5x the night cap in all) */
const nightWave = () => (S.hour >= 23 || (S.hour >= 2 && S.hour < 6) ? (S.hour >= 23 ? 1 : 2) : S.hour >= 20 ? 0 : 1);   /* dusk 20:00, 23:00, 02:00 */
function monsterGeneration() {
  bossWatch();
  const night = isNight(); if (night !== S.wasNight) { S.wasNight = night; S.nightSpawned = 0; S.waveN = 0; S.nightCap = 0; }
  if (night && (S.bossOn != null || nowD() < (S.calmUntil || 0))) return;   /* 3D.68: no fresh zombies while the boss lives, nor after it falls */
  const SP = window.ZH_SPAWN || {};   /* study knobs (tools/balance/respawn_study.py); the game itself never sets these */
  if (night && !SP.old && S.nightCap) {   /* 3D.70: a fixed horde per night, in three waves: the full horde at dusk, then two smaller pushes. Kill them all and the night goes quiet. Days are unchanged. */
    const w = nightWave(), allow = Math.round(S.nightCap * NIGHT_WAVES.slice(0, w + 1).reduce((a, b) => a + b, 0));
    if (w !== S.waveN) { S.waveN = w; if (w > 0 && S.nightSpawned >= Math.round(S.nightCap * NIGHT_WAVES[0])) { note('important', `🧟 WAVE ${w + 1} OF ${NIGHT_WAVES.length}`, { log: 'More of them are coming out of the dark.' }); SFX('alarm'); } }
    if ((S.nightSpawned || 0) >= allow) { S.spawnClock++; return; } }
  if (night && SP.budget && (S.nightSpawned || 0) >= SP.budget * Math.max(1, S.nightCap || 1)) return;   /* study: a fixed pool per night */
  if (night && SP.wave && S.hour % SP.wave !== 0 && activeZ() > 0) { S.spawnClock++; return; }   /* study: refill only at the top of every Nth hour */
  S.spawnClock++; const tr = S.terr || 0, hd = hDay(), base = 6 + tr + Math.floor(hd / 2.2);   /* horde ceiling: the threat grows with the days, up to a ceiling set by the town's rank */   /* 3D.71 skill study: the horde grows with the days, not with town upgrades (upgrading used to make staying small the safest play) */
  const desired = Math.round((night ? Math.min(Math.round(base * 1.35), 14 + 3 * tr, 6 + hd) : Math.max(3, Math.min(Math.round(base * .65 * ((window.ZH_BAL || {}).day || 1)), 9 + 2 * tr, 2 + hd))) * (graceOn() ? .75 : 1) * DF().count), gap = (110 - Math.min(50, S.threat * 6)) * (night ? .5 * (SP.gap || 1) : 1.6); if (night) S.nightCap = desired;
  if (activeZ() < desired - (S.day === S.nextBoss && S.hour >= 18 ? bossMob() : 0) && S.spawnClock > gap) { spawn(); S.spawnClock = 0; S.spawnTot = (S.spawnTot || 0) + 1; if (night) S.nightSpawned = (S.nightSpawned || 0) + 1; }   /* 3D.68: the boss brings its own horde; the night's usual crowd makes room for it */
  if (!night && S.spawnClock % 90 === 45 && activeZ() > desired + 2) {   /* V2.18: by day the surplus (night spawns, boss hordes) drifts away instead of piling up forever */
    const far = S.z.filter((z) => z.hp > 0 && !z.human && !z.boss && ['idle', 'zmarch', 'appear'].includes(z.mode) && !S.sv.some((s) => s.hp > 0 && !insideBuilding(s) && dist(s.w, z.w) < 4));   /* survivors sheltering indoors don't hold them */
    if (far.length) { const z = far[Math.floor(rnd() * far.length)]; z.hp = 0; z.escaped = true; }
  }
}
/* ---------------- V2.13 raiders: humans who dodge zombies, slip in through the gate, steal, fight, and run ---------------- */
const RAID_TARGETS = ['storage', 'canteen', 'farm', 'field', 'water', 'well', 'armory', 'workshop', 'house'];
function spawnRaid(fk = 'toll', leader = false) {
  setTimeout(() => barkSomeone('raiders', {}, { pri: 2 }), 600); if (!facOk('toll') && fk === 'toll' && !leader) fk = 'drifters';
  const n = Math.min(7, 3 + (S.terr || 0) + Math.floor(hDay() / 5) + (leader ? 2 : 0)), a = rnd() < .6 ? hwyEnd() : spawnPoint();   /* 3D.101: raiders mostly ride in on the highway */   /* 3D.71: raids grow with the days, not town upgrades */
  for (let i = 0; i < n; i++) { const d = zombieTypes.raider; S.z.push({ type: 'raider', human: true, fk, w: tc(a[0] + (i % 2) * .4, a[1] + (i >> 1) * .4), home: tc(a[0], a[1]), pw: 1 + (danger() - 1) * .5, hp: Math.round(d.hp * danger()), max: Math.round(d.hp * danger()), cool: 30, phase: rnd() * 100, mode: 'appear', stateTicks: 30 + i * 20, target: null, path: null, loot: { food: 0, water: 0, mat: 0 }, carried: 0, goalB: null, evadeT: 0 }); rollRaider(S.z[S.z.length - 1], i); S.z[S.z.length - 1].fac = fk; }
  if (leader) { const L = S.z[S.z.length - 1]; L.kind = 'brute'; L.leader = true; L.name = 'The Toll Collector'; L.hp = L.max = Math.round(L.max * 3.2); L.pw = (L.pw || 1) * 1.4; }   /* 3D.104 */
  SFX('alarm'); raidAlert(n); S.alert = 1200;
}
/* V3D.13 raider personalities (Walking Dead style): most raiders are Thieves; some are Brutes who come to hurt people
   and never run, and Firebugs who smash a building and set it alight. See docs/AI_BEHAVIOUR.md. */
const RAIDER_KINDS = {
  thief:   { name: 'Thief',   icon: '🦝', hp: 1,    atk: 1,   flee: .5, steal: true },
  brute:   { name: 'Brute',   icon: '💀', hp: 1.6,  atk: 1.5, flee: 0,  hunt: true },
  firebug: { name: 'Firebug', icon: '🔥', hp: .9,   atk: .9,  flee: .35, burn: true },
};
function rollRaider(z, i) {
  const r = rnd(), k = i === 0 && S.day >= 4 && r < .45 ? 'brute' : r < (S.day >= 3 ? .22 : 0) ? 'firebug' : r < (S.day >= 6 ? .34 : 0) ? 'brute' : 'thief', K = RAIDER_KINDS[k];
  z.kind = k; z.hp = z.max = Math.round(z.max * K.hp); z.pw = (z.pw || 1) * K.atk;
}
const RK = (z) => RAIDER_KINDS[z.kind] || RAIDER_KINDS.thief;
function raidTarget(z) { let best = null, bd = 1e9; for (const b of world.buildings) { if (!RAID_TARGETS.includes(b.type)) continue; const d = dist(z.w, Wd.doorPoint(b)); if (d < bd) { bd = d; best = b; } } return best; }
function rai(z) {
  const d = zombieTypes.raider; if (z.mode === 'idle' || z.mode === 'zmarch') { z.mode = z.carried > 0 ? 'rflee' : 'rsneak'; z.path = null; }
  if (z.hp < z.max * RK(z).flee && z.mode !== 'rflee') { z.mode = 'rflee'; z.path = null; z.target = null; }
  if (RK(z).hunt && z.mode !== 'rflee') {   /* Brute: goes straight for the nearest person and fights to the end */
    let t = null, td = 1e9; for (const s of S.sv) if (s.hp > 0 && !['down', 'hospital', 'away', 'errand'].includes(s.mode) && !insideBuilding(s)) { const dd = dist(s.w, z.w); if (dd < td) { td = dd; t = s; } }
    if (t) { z.target = t; z.mode = 'zchase'; z.path = null; return; }
  }
  // dodge zombies: step away from any zombie that gets close
  if (z.evadeT > 0) { z.evadeT--; moveSlide(z, z.evadeTo, d.chase * 1.1); return; }
  const zz = S.z.find((o) => !o.human && o.hp > 0 && o.mode !== 'appear' && dist(o.w, z.w) < 2.2)
    || (z.mode === 'rsneak' && RK(z).steal && S.sv.find((q) => q.hp > 0 && isFighter(q) && !insideBuilding(q) && !['down', 'hospital'].includes(q.mode) && dist(q.w, z.w) < 2.4));   /* sneaking: steer clear of zombies and fighters */
  if (zz) { const dx = z.w.x - zz.w.x, dy = z.w.y - zz.w.y, l = Math.hypot(dx, dy) || 1; z.evadeTo = { x: z.w.x + dx / l * 1.8, y: z.w.y + dy / l * 1.8 }; z.evadeT = 40; z.path = null; return; }
  // fight survivors who come close (or defend the haul)
  let foe = null, fd = z.mode === 'rsneak' && RK(z).steal ? 1.1 : 2.2; for (const s of S.sv) if (s.hp > 0 && !['down', 'hospital'].includes(s.mode) && !insideBuilding(s)) { const dd = dist(s.w, z.w); if (dd < fd) { fd = dd; foe = s; } }
  if (foe && z.mode !== 'rflee') { z.target = foe; z.mode = 'zchase'; z.path = null; return; }
  if (z.mode === 'rsneak') {
    z.sneakT = (z.sneakT || 0) + 1; if (z.sneakT > 4000) { z.mode = 'rflee'; z.path = null; return; }   /* gives up after ~4 game hours */
    if (!z.goalB || !world.buildings.includes(z.goalB)) z.goalB = raidTarget(z); if (!z.goalB) { z.mode = 'rflee'; return; }
    const r = followPath(z, Wd.doorPoint(z.goalB), d.chase); if (r === 'arrived') { z.mode = RK(z).burn ? 'rsmash' : 'rsteal'; z.stateTicks = RK(z).burn ? 260 : 0; z.path = null; if (RK(z).burn) { floats.push({ w: { ...z.w }, t: '🔥 ARSON!', col: '#ff9a5a', a: 80 }); note('critical', `A Firebug is smashing the ${DEFS[z.goalB.type].name}!`, { key: 'arson' + z.goalB.x + ',' + z.goalB.y, icon: '🔥', at: { ...z.w }, live: () => z.hp > 0 && z.mode === 'rsmash', threats: true }); } } else if (r === 'fail') { z.goalB = null; z.mode = 'rflee'; } return;
  }
  if (z.mode === 'rsmash') {   /* Firebug: bangs on the building for a few seconds (stop them!), then sets it on fire and runs */
    z.moving = false; const b = z.goalB; if (!b || !world.buildings.includes(b)) { z.mode = 'rflee'; return; }
    if (z.stateTicks % 40 === 0) { b.hit = 10; hitBuilding3(b, 4 + (z.pw || 1) * 2, 'a raider'); if (b.burnt) { z.mode = 'rflee'; z.path = null; return; } }
    if (z.stateTicks <= 0) { startFire(b, 40, 'A raider set it alight'); z.mode = 'rflee'; z.path = null; } return;
  }
  if (z.mode === 'rsteal') {
    z.moving = false; if (z.stateTicks > 0) return; z.stateTicks = 70;
    const k = ['food', 'water', 'mat'].filter((q) => S[q] >= 1).sort(() => rnd() - .5)[0];
    if (k && z.carried < 4) { S[k] -= 1; z.loot[k]++; z.carried++; floats.push({ w: { ...z.w }, t: '−1 ' + SHORT_ICON[k] + ' stolen', col: '#ff8a7a', a: 70 }); }
    if (!k || z.carried >= 4) { z.mode = 'rflee'; z.path = null; } return;
  }
  if (z.mode === 'rflee') {
    const r = followPath(z, z.home, d.chase * 1.1);
    if (r === 'arrived' || r === 'fail' || dist(z.w, z.home) < .6) { if (z.carried) note('important', `A raider escaped with ${['food', 'water', 'mat'].filter((q) => z.loot[q]).map((q) => z.loot[q] + ' ' + (q === 'mat' ? 'parts' : q)).join(', ')}.`); z.hp = 0; z.escaped = true; }
  }
}
function raiderDown(z) {   /* a beaten raider drops what they carried */
  if (!z.human || z.escaped) return; if (z.leader && !z.leaderDone) { z.leaderDone = true; const F = fac('toll'); F.goneUntil = S.day + 60; F.beaten = (F.beaten || 0) + 1; for (const q of S.z) if (q.human && q.hp > 0 && q.fac === 'toll') { q.mode = 'rflee'; } setTimeout(() => earnBanner('faction', 'The Toll Collector fell. The Toll Kings are driven off the highway.'), 500); } S.raiderKills = (S.raiderKills || 0) + 1; for (const k of ['food', 'water', 'mat']) if (z.loot && z.loot[k]) { S[k] += z.loot[k]; floats.push({ w: { ...z.w }, t: '+' + z.loot[k] + ' ' + SHORT_ICON[k], col: '#9fe58a', a: 80 }); }
}
/* ---------------- V2.13 boss: every 3rd night a boss leads a mob against the town ---------------- */
const bossMob = () => Math.round((3 + Math.round(avgLevel() * .8) + 3 * (S.terr || 0) + Math.floor(hDay() / 5)) * (S.day <= 14 ? .7 : 1));
function spawnBoss() {
  const a = spawnPoint(), d = zombieTypes.boss, tr = S.terr || 0, ks = Object.keys(BOSS_KINDS).filter((k) => k !== S.lastBoss), bk = S.day <= 4 ? 'mutant' : ks[Math.floor(rnd() * ks.length)], K = BOSS_KINDS[bk]; S.lastBoss = bk;
  const L = avgLevel(), early = S.day <= 14 ? .6 : 1, bhp = Math.round((300 + 50 * L + 80 * tr) * (1 + .04 * hDay()) * DF().z * early);   /* V3D.13: gentler in the first two weeks */   /* V2.24: scales with the survivors' levels, not the Haven rank */
  S.z.push({ type: 'boss', bk, boss: true, pw: (1.25 + .03 * hDay()) * (S.day <= 14 ? .75 : 1), w: tc(a[0], a[1]), hp: bhp, max: bhp, cool: 40, phase: 0, dest: null, mode: 'appear', stateTicks: 60, target: null, path: null, siege: true, blocked: 0, goal: null, goalT: 0, wallT: null });
  { const bz = S.z[S.z.length - 1]; bz.hp = bz.max = Math.round(bz.hp * K.hp); }
  const mob = bossMob(); for (let i = 0; i < mob; i++) { spawn(Math.max(0, Math.min(COLS - 1, a[0] + (rnd() - .5) * 3)), Math.max(0, Math.min(ROWS - 1, a[1] + (rnd() - .5) * 3))); S.z[S.z.length - 1].siege = true; S.z[S.z.length - 1].mob = true; }
  lureFire();   /* 3D.76 */
  S.bossOn = S.bossKills || 0;   /* 3D.68: the boss night is on (no fresh zombies join while it lives) */
  SFX('boss'); showEventPopup({ stage: { scene: 'boss', boss: bk, head: 'Boss!' }, short: K.line, chips: [`☠ ${mob} zombies follow`], title: K.name.toUpperCase() });
  note('critical', `${K.line} ${mob} zombies follow it.`, { key: 'boss', icon: '☠', log: `${K.line} It leads ${mob} zombies against the Haven.`, threats: true, at: () => { const b = S.z.find((z) => z.type === 'boss' && z.hp > 0); return b ? b.w : null; }, live: () => S.z.some((z) => z.type === 'boss' && z.hp > 0), acts: [{ label: () => (S.focusT > tick ? 'Focusing ⚔' : 'Focus the boss ⚔'), ok: () => !(S.focusT > tick), fn: () => focusBoss() }] }); S.alert = 2400;
}
function dawnRetreat() {   /* balance study (Nov 8): the night horde used to stay inside the walls for good. At sunrise most of it shambles back out of town;
  the ones already locked onto someone keep fighting. Days are for repairs and recovery. */
  const frac = (window.ZH_BAL || {}).dawn ?? .5;   /* 3D.80 spiral fix: half the zombies inside shamble out at dawn */ if (!frac) return 0; let n = 0;
  for (const z of S.z) { if (z.hp <= 0 || z.human || z.boss || z.zoo || ['zattack', 'zrecover'].includes(z.mode) || rnd() > frac) continue;
    const p = spawnPoint(); if (!p) continue; z.mode = 'zleave'; z.retreat = true; z.siege = false; z.mob = false; z.target = null; z.path = null; z.wallT = null; z.bldT = null; z.leaveTo = tc(p[0], p[1]); n++; }
  if (n >= 3) note('important', `🌅 Dawn: ${n} zombies shamble back out of town.`); return n;
}
function eventSchedule() {   /* called every game hour */
  const now = S.day + S.hour / 24; finaleHour(); crisisHour(); comebackConvoy();
  if (S.day >= 4 && now >= S.nextRaid) {   /* 3D.64 balance: raiders from day 4 (was 2) */
  if (graceOn()) S.nextRaid = now + 1; else { spawnRaid(); S.nextRaid = now + (2 + rnd() * 1.5) * DF().raid; } }
  if (S.day === S.nextBoss && S.hour === 17 && graceOn()) { S.nextBoss++;  }
     /* V3D.17: no warning in 3D; the boss card shows when it appears */
  if ((S.day === S.nextBoss) && S.hour === 12 && !graceOn()) note('important', '☠ Scouts: a boss leads the horde tonight at 21:00', { log: 'Scouts saw a huge mutant gathering a horde. It will hit the Haven at 21:00. Re-arm traps, set a Noise Lure, heal up.' });   /* 3D.76: time to prepare */
  if (S.day === S.nextBoss && S.hour === 21) { spawnBoss(); S.nextBoss += 3; }
  incidentRoll();
  if (!S.trader && S.day >= (S.nextTrader || 2) && S.hour === 9) traderArrive();
  if (S.trader && S.hour === 19) traderLeave();
  if (S.hour === 6) dawnRetreat();
  if (S.hour === 6) { const bs = S.z.filter((z) => z.type === 'boss' && z.hp > 0), b = bs[0]; for (const q of bs) { const p = spawnPoint(); q.mode = 'zleave'; q.retreat = true; q.siege = false; q.target = null; q.path = null; q.leaveTo = p ? tc(p[0], p[1]) : { ...q.w }; }   /* V3D.13: walks back out instead of vanishing */ if (b) {   /* V2.37: every boss leaves at dawn (only the first did) */ note('important', '☀ THE BOSS RETREATS AT DAWN', { log: 'The Mutant Boss slunk back into the wasteland. It will return.' }); } if (S.bossOn != null || bs.length) { S.bossOn = null; mobScatter(); for (const z of S.z) if (z.hp > 0 && !z.human && z.type !== 'boss' && z.mode !== 'zleave' && !(z.target && S.sv.includes(z.target) && dist(z.w, z.target.w) < 2.5)) { const p = spawnPoint(); z.mode = 'zleave'; z.retreat = true; z.siege = false; z.target = null; z.path = null; z.leaveTo = p ? tc(p[0], p[1]) : { ...z.w }; } } else S.z.forEach((z) => { if (z.mob) { z.siege = false; z.mob = false; } }); }   /* 3D.68: its followers leave with it */
}
function alertPack(z, target) {   /* V2.12: zombies near one that spots a survivor join the chase */
  for (const o of S.z) if (o !== z && o.hp > 0 && o.mode === 'idle' && dist(o.w, z.w) < 2.5 && dist(o.w, target.w) < 6) { o.target = target; o.mode = 'zchase'; o.path = null; o.blocked = 0; }
}
function zSpecial(z) {   /* 3D.32 new-zombie extras */
  if (z.scream > 0) z.scream--;
  if (z.smashCd > 0) z.smashCd--;   /* 3D.87 */
  if (z.type === 'lasher') { if (z.lashCd > 0) z.lashCd--;   /* 3D.80 the drag: the hooked survivor slides toward the Lasher for about half a second */
    const q = z.pulling; if (q) { if (z.hp <= 0 || q.hp <= 0 || !q.w || insideBuilding(q) || ['down', 'hospital', 'away'].includes(q.mode) || --z.pullT <= 0) z.pulling = null;
      else { const dx = z.w.x - q.w.x, dy = z.w.y - q.w.y, l = Math.hypot(dx, dy), st = Math.min(Math.max(0, l - ZREACH * .9), .12); if (st > 0) { q.w.x += dx / l * st; q.w.y += dy / l * st; } } }
    /* 3D.107 owner (8 Nov): the Lasher hooks enemy faction fighters too: pulled in, stuck 4 s, a hard hit */
    if (!z.pulling && !(z.lashCd > 0) && z.hp > 0 && tick % 20 === 0) { let r = null, bd = LASH_R + .6; for (const q of S.z) if (q.human && q.hp > 0 && !q.escaped && !(q.para > 0) && q.mode !== 'appear') { const d = dist(q.w, z.w); if (d > ZREACH && d < bd) { bd = d; r = q; } }
      if (r) { z.pulling = r; z.pullT = 30; z.lashCd = 300; r.para = 240; r.hp -= 14; r.hitT = 9; hitFx.push({ k: 'lash', w: { ...r.w }, zr: z, qr: r, to: { ...r.w }, t0: tick }); floats.push({ w: { ...r.w }, t: '-14', col: '#ff6e62', a: 55 }); if (r.hp <= 0) { S.kills++; raiderDown(r); } else if (rnd() < .5) say('🪝 A Lasher hooked one of the ' + (r.fk === 'toll' ? 'Toll Kings' : 'raiders') + '!'); } } }
  if (z.type === 'alpha' && tick % 30 === 0) for (const q of S.z) if (q !== z && !q.human && q.hp > 0) q.alphaNear = dist(q.w, z.w) < 6;
}
const LASH_PARA = 480;   /* 3D.83 a hooked survivor is paralysed for 8 s */
const isRangedS = (q) => { const w = weaponOf(q); return !!(w && w.ranged); };
function lashPick(z) {   /* the nearest survivor holding a gun, bow or crossbow, in reach, out in the open and not already paralysed */
  let best = null, bd = LASH_R;
  for (const q of S.sv) { if (q.hp <= 0 || !q.w || q.para > 0 || insideBuilding(q) || ['down', 'hospital', 'away'].includes(q.mode) || !isRangedS(q)) continue;
    const d = dist(q.w, z.w); if (d > ZREACH + .4 && d < bd) { bd = d; best = q; } }
  return best; }
function rotBurst(z) {   /* 3D.80 Rotbomb: bursts when it dies. Hurts survivors out in the open, walls, and other zombies within ROT_R */
  z.burst = true; z.fuseT = 0; SFX('alarm'); hitFx.push({ k: 'burst', w: { ...z.w }, t0: tick, bits: Array.from({ length: 14 }, () => ({ a: rnd() * 6.28, v: .4 + rnd() * .8, s: rnd() })) });   /* 3D.85 owner: the Rotbomb explodes (the Lasher still draws no effect) */
  let hurt = 0;
  for (const q of S.sv) if (q.hp > 0 && q.w && !insideBuilding(q) && q.mode !== 'away' && dist(q.w, z.w) < ROT_R) { const dmg = Math.max(1, fairRound(16 * (z.pw || 1) * (1 - dist(q.w, z.w) / ROT_R * .4) * (gearFx(q, 'gas') ? .5 : 1) * (1 - dmgReduce(q)))); q.hp -= dmg; q.hitT = 9; hurt++; floats.push({ w: { ...q.w }, t: '-' + dmg, col: '#b8d65a', a: 55 }); if (rnd() < .5) emote(q, '🤢', 70); }
  for (const wl of world.walls.values()) if (!wl.broken && dist({ x: wl.x + .5, y: wl.y + .5 }, z.w) < ROT_R) { wl.hp -= 30; wl.hit = 14; if (wl.hp <= 0) wallBroken(wl); }
  for (const o of S.z) if (o !== z && o.hp > 0 && !o.human && dist(o.w, z.w) < ROT_R) { o.hp -= 25; o.hitT = 9; }
  if (hurt) note('important', `💥 A Rotbomb burst and hurt ${hurt} ${hurt === 1 ? 'survivor' : 'survivors'}.`);
}
function zai(z) { if (z.burnT > 0) { z.burnT--; if (z.burnT % 60 === 0) { z.hp -= 3; z.hitT = 6; if (z.hp <= 0) { S.kills++; return; } } }   /* 3D.104 molotov fire */ if (z.slowT > tick && tick % 3 === 0) return; if (z.stunT > tick) { z.moving = false; return; }   /* a dog has it by the leg */ if (z.fuseT > 0) { z.moving = false; return; }   /* 3D.85 a dying Rotbomb stands and swells */ if (!z.zoo) zSpecial(z); const px = z.w.x, py = z.w.y; if (z.zoo || !lureStep(z)) zai0(z); if (!z.human && z.hp > 0) zPushOut(z); if (z.hp > 0 && !z.zoo && (z.stun > 0 || trapMap().size)) trapStep(z, px, py); }
function zai0(z) {
  if (z.zoo) { z.moving = false; z.mode = 'zoo'; return; }   /* 3D.32 test page: stand still on display */
  if (z.human && z.para > 0) { z.para--; z.moving = false; return; }   /* 3D.107 hooked by a Lasher */
  if (z.human && z.hp < z.max * RK(z).flee && ['zchase', 'zattack', 'zrecover'].includes(z.mode)) { z.mode = 'rflee'; z.target = null; z.path = null; }
  if (z.human && z.mode === 'idle' && RK(z).hunt) { z.mode = 'rsneak'; }   /* brutes skip the idle wander */
  if (z.human && !['zchase', 'zattack', 'zrecover', 'appear'].includes(z.mode)) return rai(z);
  const d = zDef(z); if (z.cool > 0) z.cool--; if (z.stateTicks > 0) z.stateTicks--;
  if (z.mode === 'appear') { z.moving = false; if (z.stateTicks <= 0) { z.mode = 'idle'; z.stateTicks = 35 + rnd() * 70; } return; }
  if (z.mode === 'zleave') {   /* V2.37: bored zombies wander back out of the map in daylight */
    if (!z.retreat) for (const s of S.sv) if (s.hp > 0 && !['down', 'hospital'].includes(s.mode) && !insideBuilding(s) && dist(s.w, z.w) < d.aggro * .7) { z.target = s; z.mode = 'zchase'; z.path = null; z.bored = 0; return; }
    const r = followPath(z, z.leaveTo, d.chase * (z.retreat ? 1 : .6)); if (r !== 'moving' || dist(z.w, z.leaveTo) < .8) { z.hp = 0; z.escaped = true; } return;
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
    if (tick % 20 === (z.phase | 0) % 20) { const b = bashTarget(z, d, true); if (b && startBash(z, b)) return; }   /* V3D.17 */
    if (--z.goalT <= 0) { z.goal = siegeGoal(z); z.goalT = 90; }
    zMarchStep(z, z.goal, d.chase * .8); return;
  }
  if (z.mode === 'zbash') {   /* V3D.17: pounding on a building */
    const b = z.bldT; if (!b || !world.buildings.includes(b) || b.burnt || !occupied(b)) { z.bldT = null; z.mode = z.siege ? 'zmarch' : 'idle'; z.stateTicks = 30; return; }
    let best = null, bd = d.aggro * .8; for (const s of S.sv) if (s.hp > 0 && !['down', 'hospital', 'away', 'errand'].includes(s.mode) && !insideBuilding(s)) { const dd = dist(s.w, z.w); if (dd < bd) { bd = dd; best = s; } }
    if (best) { z.target = best; z.mode = 'zchase'; z.bldT = null; z.path = null; alertPack(z, best); return; }
    if (dist(z.w, z.bpt) > .35) { const r = followPath(z, z.bpt, d.chase); if (r === 'fail') { z.bldT = null; z.mode = 'idle'; z.stateTicks = 60; } return; }
    z.moving = false; z.faceB = { x: b.x + b.w / 2, y: b.y + b.h / 2 };
    if (S.sv.every((q) => insideBuilding(q) !== b || q.mode === 'hiding' || q.mode === 'hospital' || q.sleeping)) { if (!z.bashQuiet) z.bashQuiet = tick; if (tick - z.bashQuiet > 1500 + (z.phase | 0) % 600) { z.bashQuiet = 0; z.bldT = null; z.bored = tick + 6000; z.mode = z.siege ? 'zmarch' : 'idle'; z.stateTicks = 60; return; } } else z.bashQuiet = 0;   /* 3D.48: hiders, patients and sleepers keep quiet; after ~25-35 s it gives up */
    if (z.stateTicks <= 0) { hitBuilding3(b, d.atk * .8 * (z.pw || 1) * (z.type === 'brute' ? 2.2 : z.type === 'boss' ? 3.5 : z.type === 'bloated' ? 1.4 : 1), 'a ' + d.name.toLowerCase()); if (['brute', 'alpha', 'boss'].includes(z.type)) impactFx(z, { x: z.w.x + (b.x + b.w / 2 - z.w.x) * .4, y: z.w.y + (b.y + b.h / 2 - z.w.y) * .4 }); if (z.type === 'burnt' && rnd() < .35) startFire(b, 30, 'a burnt zombie'); z.stateTicks = z.type === 'brute' ? 64 : z.type === 'runner' ? 36 : 50; z.punchT = tick; }
    return;
  }
  if (z.mode === 'zbreak') {
    const wl = z.wallT; z.moving = false;
    if (!wl || wl.broken || world.walls.get(wl.x + ',' + wl.y) !== wl) { z.wallT = null; z.mode = z.siege ? 'zmarch' : 'idle'; z.blocked = 0; z.stateTicks = 20; return; }
    if (z.stateTicks <= 0) { const dmg = d.atk * (z.pw || 1) * (z.type === 'brute' ? 2.5 : z.type === 'boss' ? 4 : 1); if (wl.type === 'efence' && S.power) { z.hp -= 6; z.hitT = 9; floats.push({ w: { ...z.w }, t: '⚡6', col: '#9fd8ff', a: 40 }); }   /* 3D.104 Electric Fence */ const dmg2 = townHyb('fortifier') ? dmg * .8 : dmg; wl.hp -= dmg2 - dmg; wl.hp -= dmg; wl.hit = 14; floats.push({ w: { x: wl.x + .5, y: wl.y + .5 }, t: '-' + Math.round(dmg), col: '#ffb27a', a: 45 }); z.stateTicks = z.type === 'brute' ? 60 : z.type === 'runner' ? 34 : 46;
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
    if (best && bd < d.aggro) { z.target = best; z.mode = 'zchase'; z.path = null; alertPack(z, best); return; }
    if (tick % 30 === (z.phase | 0) % 30 && (!best || bd > d.aggro * 1.6)) { const b = bashTarget(z, d, isNight() && Wd.inTown(Math.floor(z.w.x), Math.floor(z.w.y))); if (b) startBash(z, b); }   /* V3D.17: nobody about → go for the building with people in it */
    return;
  }
  if (z.mode === 'zchase') {
    if (!z.target || z.target.hp <= 0 || ['down', 'hospital'].includes(z.target.mode) || insideBuilding(z.target)) { z.target = null; z.mode = z.siege ? 'zmarch' : 'idle'; z.stateTicks = 40; return; }
    const dd = dist(z.target.w, z.w); if (dd > (z.type === 'boss' ? 11 : 4.8)) { z.target = null; z.mode = z.type === 'boss' && z.siege ? 'zmarch' : 'idle'; z.stateTicks = 60; return; }   /* 3D.100: the boss keeps after a shooter (gave up at 4.8 tiles, then wandered) */
    const lq = z.type === 'lasher' && !(z.lashCd > 0) ? lashPick(z) : null;
    if (lq) { z.target = lq; z.mode = 'zattack'; z.lash = true; z.stateTicks = 84; }   /* 3D.80; 3D.83 owner: it only hooks ranged fighters */
    else if (z.bk === 'stalker' && !(z.smashCd > 0) && dd < SMASH_R * .8) { z.mode = 'zattack'; z.smash = true; z.stateTicks = 135; }   /* 3D.87 owner: Stalker hulk smash, an area attack */
    else if (z.bk === 'stalker' && dd <= ZREACH) { z.mode = 'zattack'; z.combo = true; z.stateTicks = 195; }   /* 3D.89 owner: haymaker then a front kick (clip 'haymaker_kick') */
    else if (z.type === 'thrower' && dd < 4.4) { z.mode = 'zattack'; z.stateTicks = 56; } else if (z.type === 'spitter' && dd < 2.8) { z.mode = 'zattack'; z.stateTicks = 34; } else if (z.type === 'screamer' && dd < SCREAM_R * .8) { z.mode = 'zattack'; z.stateTicks = 96; } else if (dd > ZREACH) { if (followPath(z, z.target.w, d.chase) === 'fail') zWalk(z, z.target.w, d.chase, true); } else { z.mode = 'zattack'; z.stateTicks = z.type === 'screamer' ? 96 : z.type === 'sporehead' ? 114 : z.type === 'brute' || z.type === 'alpha' ? 38 : 26; } return;   /* 3D.36: the hammer fist lands later */
  }
  if (z.mode === 'zattack' && z.type === 'screamer') { z.moving = false;   /* 3D.38 AOE shriek: hurts everyone outside within SCREAM_R, calls a walker; in time with the 'scream' clip */
    if (z.stateTicks === 65) { SFX('alarm'); impactFx(z, z.w); for (const q of S.sv) if (q.hp > 0 && q.w && !insideBuilding(q) && q.mode !== 'away' && dist(q.w, z.w) < SCREAM_R) { const dmg = zHitDmg(z, d, q); q.hp -= dmg; q.hitT = 9; if (rnd() < .5) emote(q, '😖', 60); floats.push({ w: { ...q.w }, t: '-' + dmg, col: '#ff6e62', a: 55 }); callHelp(q, z); }
      if (S.z.filter((q) => q.hp > 0).length < 60) spawn(z.w.x + (rnd() - .5) * 2, z.w.y + (rnd() - .5) * 2, 'walker'); }
    if (z.stateTicks <= 0) { z.mode = 'zrecover'; z.stateTicks = z.recDur = 150 + rnd() * 60; } return; }
  if (z.mode === 'zattack' && z.combo) { z.moving = false;   /* 3D.89 Stalker combo: 3D.93 slower (3.25 s): the haymaker lands at clip t ~.41 (tick 80 of 195), the kick at t = .80 (tick 156) and shoves the survivor back */
    const q = z.target, ok = q && q.hp > 0 && q.w && !insideBuilding(q) && q.mode !== 'away' && !['down', 'hospital'].includes(q.mode) && dist(q.w, z.w) < ZREACH + .6;
    if ((z.stateTicks === 115 || z.stateTicks === 39) && ok) { const kick = z.stateTicks === 39, dmg = Math.max(1, Math.round(zHitDmg(z, d, q) * (kick ? .8 : 1))); q.hp -= dmg; q.hitT = 9; SFX('hurt'); callHelp(q, z); floats.push({ w: { ...q.w }, t: '-' + dmg, col: '#ff6e62', a: 55 });
      if (kick) { const dx = q.w.x - z.w.x, dy = q.w.y - z.w.y, L = Math.hypot(dx, dy) || 1, nx = q.w.x + dx / L * .6, ny = q.w.y + dy / L * .6; if (Wd.inMap(Math.floor(nx), Math.floor(ny)) && Wd.walkable(world, Math.floor(nx), Math.floor(ny)) && !Wd.buildingAt(world, Math.floor(nx), Math.floor(ny))) { q.w.x = nx; q.w.y = ny; } if (rnd() < .5) emote(q, '😵', 60); } }
    if (z.stateTicks <= 0) { z.combo = false; z.mode = 'zrecover'; z.stateTicks = z.recDur = 40 + rnd() * 20; } return; }
  if (z.mode === 'zattack' && z.smash) { z.moving = false;   /* 3D.87 Stalker hulk smash: arms spread wide, then the hands slam together in front (clip 'smash', hit at t = .55): hurts everyone outside within SMASH_R */
    if (z.stateTicks === 61) { SFX('hurt'); hitFx.push({ k: 'smash', w: { ...z.w }, t0: tick, r: SMASH_R });   /* 3D.89 owner: an effect like the Screamer's */ for (const q of S.sv) if (q.hp > 0 && q.w && !insideBuilding(q) && q.mode !== 'away' && !['down', 'hospital'].includes(q.mode) && dist(q.w, z.w) < SMASH_R) { const dmg = Math.max(1, Math.round(zHitDmg(z, d, q) * 1.2)); q.hp -= dmg; q.hitT = 9; callHelp(q, z); if (rnd() < .5) emote(q, '😵', 60); floats.push({ w: { ...q.w }, t: '-' + dmg, col: '#ff6e62', a: 55 }); } }
    if (z.stateTicks <= 0) { z.smash = false; z.smashCd = 480 + rnd() * 180; z.mode = 'zrecover'; z.stateTicks = z.recDur = 50; } return; }
  if (z.mode === 'zattack' && z.lash) { z.moving = false;   /* 3D.80 Lasher: whips the long arm out and drags one survivor in (in time with the 'lash' clip: the grab lands at t = .38) */
    const q = z.target;
    if (z.stateTicks === 52 && q && q.hp > 0 && q.w && !insideBuilding(q) && q.mode !== 'away' && !['down', 'hospital'].includes(q.mode) && dist(q.w, z.w) < LASH_R + .25) {
      if (['Guard', 'Police Officer', 'SWAT'].includes(q.job) && rnd() < .5) floats.push({ w: { ...q.w }, t: 'BRACED!', col: '#C6FF4D', a: 60, big: true });
      else { z.pulling = q; z.pullT = 34; q.para = LASH_PARA; const dmg = Math.max(1, Math.round(zHitDmg(z, d, q) * .5)); q.hp -= dmg; q.hitT = 9; SFX('hurt'); callHelp(q, z); emote(q, '😵', 90, true); floats.push({ w: { ...q.w }, t: '-' + dmg + ' PARALYSED', col: '#ff6e62', a: 70 }); }
    }
    if (z.stateTicks <= 0) { z.lash = false; z.lashCd = 420 + rnd() * 120; z.mode = z.target && z.target.hp > 0 ? 'zchase' : 'idle'; } return; }
  if (z.mode === 'zattack' && z.type === 'sporehead') { z.moving = false; if ([91, 63, 30].includes(z.stateTicks) && z.target && z.target.hp > 0 && !insideBuilding(z.target) && dist(z.w, z.target.w) < ZREACH + .5) { const dmg = zHitDmg(z, d, z.target); z.target.hp -= dmg; z.target.hitT = 9; SFX('hurt'); callHelp(z.target, z); impactFx(z, z.target.w); floats.push({ w: { ...z.target.w }, t: '-' + dmg, col: '#ff6e62', a: 55 }); }
    if (z.stateTicks <= 0) { z.mode = 'zrecover'; z.stateTicks = z.recDur = 70 + rnd() * 20; } return; }   /* 3D.37 three-hit combo, in time with spore_combo */
  if (z.mode === 'zattack') { z.moving = false; if (z.type === 'spitter' && z.stateTicks === 14 && z.target && z.target.w) spits.push({ a: { ...z.w }, b: { ...z.target.w }, t0: tick, dur: 14, seed: rnd() }); if (z.type === 'thrower' && z.stateTicks === 22 && z.target && z.target.w) spits.push({ a: { ...z.w }, b: { ...z.target.w }, t0: tick, dur: 22, seed: rnd(), rock: true });   /* 3D.35: the glob leaves the mouth, lands when the hit does */
    if (z.stateTicks <= 0) { if (z.target && z.target.hp > 0 && !insideBuilding(z.target) && !(z.type === 'thrower' && dist(z.w, z.target.w) > 5.6)) { const dmg = Math.max(1, fairRound((d.atk + (z.type === 'brute' ? 2 : 0)) * (z.pw || 1) * (hasSkill(z.target, 'armored') ? .8 : 1) * (hasSkill(z.target, 'bulwark') ? .85 : 1) * (atPost(z.target) ? .8 : 1) * ((z.type === 'spitter' || z.type === 'bloated') && gearFx(z.target, 'gas') ? .4 : 1) * (1 - dmgReduce(z.target))));   /* 3D.28 gas mask / hazmat */ z.target.hp -= dmg; z.target.hitT = 9; SFX('hurt'); impactFx(z, z.target.w); callHelp(z.target, z); if (rnd() < .4) emote(z.target, '😣', 60); floats.push({ w: { ...z.target.w }, t: '-' + dmg, col: '#ff6e62', a: 55 }); } z.mode = 'zrecover'; z.stateTicks = z.recDur = (z.type === 'runner' ? 38 : z.type === 'brute' ? 82 : z.type === 'thrower' ? 96 : 58) + rnd() * 22; } return; }
  if (z.mode === 'zrecover') { if (z.stateTicks <= 0) z.mode = z.target && z.target.hp > 0 ? 'zchase' : (z.siege ? 'zmarch' : 'idle'); }
}
/* ---------------- walls: zombies march, break segments, repairs, breach alert ---------------- */
const wallAtTile = (x, y) => world.walls.get(x + ',' + y) || null;
function siegeGoal(z) {
  const d = zDef(z), elite = z.type === 'spitter' || z.type === 'brute' || z.type === 'boss';
  const open = [...world.walls.values()].some((wl) => wl.broken);
  if (elite && world.walls.size && !open) {   // elites are smarter: they go for the gate; with no gate they pick the weakest segment
    let best = null, bs = 1e9; for (const wl of world.walls.values()) if (wl.type === 'gate') { const sc = dist(z.w, { x: wl.x + .5, y: wl.y + .5 }); if (sc < bs) { bs = sc; best = wl; } }
    if (!best) for (const wl of world.walls.values()) { const sc = wl.hp + dist(z.w, { x: wl.x + .5, y: wl.y + .5 }) * 6; if (sc < bs) { bs = sc; best = wl; } }
    return { x: best.x + .5, y: best.y + .5 }; }
  let g = null, gd = 1e9; for (const s of S.sv) if (s.hp > 0 && !insideBuilding(s)) { const dd = dist(s.w, z.w); if (dd < gd) { gd = dd; g = s.w; } }
  for (const b of world.buildings) { const c = { x: b.x + b.w / 2, y: b.y + b.h / 2 }, dd = dist(c, z.w); if (dd < gd) { gd = dd; g = c; } }
  return g ? { x: g.x, y: g.y } : tc(7 + OFF, 11 + OFF);
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
  const bx = z.w.x, by = z.w.y; if (!goal) return; if (z.alphaNear) sp *= 1.2; moveSlide(z, goal, sp);   /* 3D.32 the Alpha's pack */
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
  const fast = S.sv.some((q) => q.hp > 0 && ((q.job === 'Engineer' && !['away', 'errand', 'down', 'hospital'].includes(q.mode)) || hasSkill(q, 'handy')))   /* 3D.67: an Engineer in town, not away or hurt */, amt = Math.min(best.max - best.hp, fast ? 8 : 4), cost = amt / best.max * Wd.WALL_DEFS[best.type].mat * .6;
  repairFrac += cost; if (repairFrac >= 1) { if (S.mat < 1) { repairFrac = 1; return; } S.mat -= 1; repairFrac -= 1; flow('mat', 'Wall repairs', -1); }
  best.hp += amt; if (best.broken && best.hp >= best.max * .3) { best.broken = false; Wd.bump(world); } if (best.hp >= best.max) { best.hp = best.max; floats.push({ w: { x: best.x + .5, y: best.y + .5 }, t: 'REPAIRED', col: '#9fe58a', a: 50 }); }
}

/* ---------------- town systems ---------------- */
const xpNeed = (s) => { const p = professions[s.job]; const b = (p && p.master) || 60, l = s.l || 1; return Math.round(l < 5 ? b : b * (1 + (l - 4) * .6)); };
function masteryCheck(s) {      // experience: each level raises the work boost and the daily ration; capped at LEVEL_CAP
  const p = professions[s.job]; if (!p || s.mastery < xpNeed(s)) return;
  if ((s.l || 1) < LEVEL_CAP) { bark(s, 'levelUp', {}, { pri: 1 }); s.l = (s.l || 1) + 1; s.mastery = 0; s.mastered = false; s.st = s.st || rollStats(s.job, 1); for (const k of (JOB_STATS[s.job] || [])) s.st[k] = Math.min(STAT_CAP, s.st[k] + 1); syncClass(s); setMaxHp(s); s.hp = Math.min(s.max, s.hp + 8); renownGain(1, `${s.name} reached ${s.job} Lv.${s.l}`); levelUpFx(s); banner(`${s.name} reached Lv.${s.l}!`, s); learnSkills(s); }
  else if (!s.mastered) { syncClass(s); s.mastered = true; renownGain(2, s.name + ' mastered ' + s.job); note('important', '🎓 ' + s.name + ' mastered ' + s.job + '!', { who: s }); }
}

/* ---------------- supplies: production, staffing, rations, upgrades ---------------- */
const SUPPLY_BASE_CAP = 60;
const storeTiers = () => bOf('storage').reduce((a, b) => a + (DEFS[b.type].tier || 1), 0);   /* V3D.23: crates 1, storehouse 2, warehouse 3 */
const matCap = () => 50 + 10 * (S.lvl || 1) + 40 * storeTiers();   /* 3D.104 storage grows with the Haven level */   /* wood and stone each */

const supplyCap = () => SUPPLY_BASE_CAP - 15 + 5 * (S.lvl || 1) + (S.sv && S.sv.some((q) => q.hp > 0 && q.spec === 'Cook') ? 20 : 0) + 20 * storeTiers() + (researched('stockpile') ? 30 : 0) + 40 * world.buildings.filter((b) => b.type === 'coldstore' && powered(b)).length;   /* 3D.77: a powered Cold Store keeps more food and water */
const isWorking = (b) => !!(b.staff && b.staff.mode === 'work' && b.staff.hp > 0);
const BUILDING_STAT = aliasT({ farm: 'str', field: 'str', water: 'per', well: 'per', medic: 'int', clinic: 'int', hospital: 'int', canteen: 'cha', workshop: 'int', scrapyard: 'str' });
const earlyFood = (b) => (DEFS[b.type] && DEFS[b.type].fam === 'farm' && S.day <= 10 && bOf('farm').length + bOf('field').length <= 2 ? 1.5 : 1);   /* 3D.104 early food help: the first gardens of a new town grow half as much again for the first 10 days */
const prodMult = (b, working = isWorking(b)) => (working && b.staff && b.staff.spec && b.staff.spec === b.staff.job ? 1.25 : 1) * earlyFood(b) * powerBoost(b) * (b.fire || b.burnt ? 0 : 1) * (b.unpaid ? .5 : 1) * (working && b.staff ? hungryPen(b.staff) : 1) * (working && b.staff ? TUNE.work : 1) * (1 + combos(b).prod) * (1 + (working && b.staff ? fitBoost(b, b.staff) + traitWork(b.staff) + (BUILDING_STAT[b.type] ? (stat(b.staff, BUILDING_STAT[b.type]) - 5) * .03 : 0) + (hasSkill(b.staff, 'efficient') ? .15 : 0) + (hasSkill(b.staff, 'greenThumb') ? .2 : 0) + (hasSkill(b.staff, 'harvestMaster') && FAM(b.type) === 'food' ? .3 : 0) + (hasSkill(b.staff, 'masterBuilder') && isT(b, 'workshop') ? .2 : 0) : 0));
const dayLog = { foodIn: 0, waterIn: 0 };
/* ---------------- V2.15 upkeep: every building costs scrap each day; unpaid buildings run at half output ---------------- */
const UPKEEP = aliasT({ pump: .5, greenhouse: .5, coldstore: .4, fuelstill: .3, ammobench: .3, ammofactory: .8, bonfire: .1, inn: .4, house: .2, water: .3, well: .5, farm: .3, field: .5, medic: .4, clinic: .7, hospital: 1.1, canteen: .4, armory: .4, workshop: .6, storage: .3, barracks: .6, scrapyard: .2, gym: .3, library: .3, lounge: .3, range: .4, track: .3, sparring: .3 });
const upkeepOf = (b) => (UPKEEP[b.type] ?? .3) * (b.staff && hasSkill(b.staff, 'masterBuilder') ? .5 : 1) * DF().upkeep;
const upkeepTotal = () => world.buildings.reduce((a, b) => a + upkeepOf(b), 0);
function payUpkeep() {   /* at day end: pay in order of importance (water, food, medical first); what can't be paid runs at half output tomorrow */
  const order = ['barrel', 'water', 'well', 'pump', 'farm', 'field', 'irrig', 'greenhouse', 'medic', 'clinic', 'hospital', 'scrapyard', 'canteen', 'mess', 'house'];   /* audit: every water and food type, the new ones included */
  const list = [...world.buildings].sort((a, b) => ((order.indexOf(a.type) + 1) || 99) - ((order.indexOf(b.type) + 1) || 99));
  let paid = 0, unpaid = 0, pw = 0; for (const b of list) { const c = upkeepOf(b), w = Math.min(c / 2, S.wood || 0), m = c - w; if (S.mat >= m) { S.mat -= m; S.wood = (S.wood || 0) - w; paid += m; pw += w; b.unpaid = false; } else if ((S.wood || 0) >= c) { S.wood -= c; pw += c; b.unpaid = false; } else { b.unpaid = true; unpaid++; } } flow('mat', 'Upkeep', -paid); flow('wood', 'Upkeep', -pw);   /* V3D.25: upkeep is half wood, half scrap (either covers the other) */
  if (unpaid) { note('important', `⚠ ${unpaid} BUILDING${unpaid > 1 ? 'S' : ''} UNPAID — HALF OUTPUT`, { log: `Not enough scrap for upkeep: ${unpaid} building${unpaid > 1 ? 's run' : ' runs'} at half output tomorrow. Build a Scrapyard or scavenge for scrap.` }); }
  return { paid, unpaid };
}
/* ---------------- V2.15 neighbour bonuses (DV2 combos / Fallout merged rooms) ---------------- */
const near = (a, b) => a !== b && a.x <= b.x + b.w && b.x <= a.x + a.w && a.y <= b.y + b.h && b.y <= a.y + a.h;   /* touching or 1 tile apart */
const FAM = (t0) => { const t = (DEFS[t0] && DEFS[t0].like) || t0; return FAM0(t); }, FAM0 = (t) => (['water', 'well'].includes(t) ? 'water' : ['farm', 'field'].includes(t) ? 'food' : ['medic', 'clinic', 'hospital'].includes(t) ? 'medical' : t);
const TRAINING = ['gym', 'library', 'lounge', 'range', 'track', 'sparring'];
let comboCache = { ver: -1, map: new Map() };
function combos(b) {
  if (comboCache.ver !== world.ver) { comboCache = { ver: world.ver, map: new Map() }; }
  if (comboCache.map.has(b)) return comboCache.map.get(b);
  const n = world.buildings.filter((o) => near(b, o)), c = { prod: 0, meal: 0, care: 0, train: 0, sat: 0, scrap: 0, names: [] }, f = FAM(b.type);
  const same = n.filter((o) => FAM(o.type) === f).length;
  if (['water', 'food', 'scrapyard'].includes(f) && same) { c.prod += Math.min(2, same) * .1; c.names.push(`District ×${Math.min(2, same) + 1} (+${Math.min(2, same) * 10}% output)`); }
  if (isT(b, 'canteen') && n.some((o) => FAM(o.type) === 'food')) { c.meal += .2; c.names.push('Farm to table (+20% meals)'); }
  if (f === 'food' && n.some((o) => isT(o, 'canteen'))) { c.prod += .05; c.names.push('Farm to table (+5% food)'); }
  if (f === 'medical' && n.some((o) => isT(o, 'house'))) { c.care += .15; c.names.push('Recovery ward (patients heal 15% faster)'); }
  if (TRAINING.includes(b.type) && n.some((o) => TRAINING.includes(o.type) && o.type !== b.type)) { c.train += .15; c.names.push('Fitness block (+15% training)'); }
  if (['lounge', 'canteen'].includes(b.type) && n.some((o) => isT(o, 'house'))) { c.sat += 1; c.names.push('Neighbourhood (+1 ♥ per visit)'); }
  if (isT(b, 'scrapyard') && n.some((o) => isT(o, 'workshop'))) { c.prod += .15; c.names.push('Salvage line (+15% scrap)'); }
  if (isT(b, 'armory') && n.some((o) => ['barracks', 'range'].includes(o.type))) { c.names.push('Arsenal (gear 1 scrap cheaper)'); c.arsenal = true; }
  comboCache.map.set(b, c); return c;
}
/* ---------------- V2.16 Workshop research + crafting ---------------- */
const RESEARCH = {
  salvage: { name: 'Salvage Methods', rp: 25, mat: 6, desc: 'Scrapyards make 25% more scrap' },
  walls: { name: 'Reinforced Walls', rp: 30, mat: 10, desc: 'New and repaired walls get 30% more HP' },
  stockpile: { name: 'Bigger Stockpiles', rp: 40, mat: 12, desc: '+30 supply cap' },
  medicine: { name: 'Field Medicine', rp: 25, mat: 6, desc: 'Scrap bandages cost less, and every bandage lasts longer' },
  blades: { name: 'Bladesmithing', rp: 20, mat: 5, desc: 'Craft Machete and Fire Axe' },
  firearms: { name: 'Firearms', rp: 40, mat: 12, need: 'blades', desc: 'Craft Pistol and Hunting Rifle' },
  bodyArmor: { name: 'Body Armor', rp: 35, mat: 10, desc: 'Craft protective clothing: Riot Vest and Scrap Plate' },
  gadgets: { name: 'Gadgets', rp: 30, mat: 8, desc: 'Craft stat accessories' },
};
const RECIPES = { blades: ['machete', 'nailbat', 'spear', 'shovel', 'axe', 'roadsign', 'sledge', 'spiked', 'katana'], firearms: ['pistol', 'revolver', 'rifle', 'shotgun', 'crossbow', 'smg', 'magnum'], bodyArmor: ['biker', 'riot', 'firecoat', 'hazmat', 'ghillie', 'kevlar', 'plate', 'tactical', 'military', 'swatarmor', 'football', 'army', 'riothelm', 'gasmask', 'swathelm'], gadgets: ['gloves', 'belt', 'shoes', 'goggles', 'glasses', 'charm', 'dogtags', 'backpack', 'hikerpack', 'toolbelt', 'medpouch', 'watch', 'kneepads', 'walkie'] };
const researched = (k) => !k || !!(S.res && S.res[k]);
const craftCost = (id) => Math.ceil(ITEMS[id].cost * 1.3) + 1;
function doResearch(k) { const r = RESEARCH[k]; if (!r || researched(k) || !researched(r.need) || (S.rp || 0) < r.rp || S.mat < r.mat) return false; S.rp -= r.rp; S.mat -= r.mat; S.res = S.res || {}; S.res[k] = true; S.resWeek = (S.resWeek || 0) + 1; banner('🔬 RESEARCHED: ' + r.name.toUpperCase()); SFX('chime'); say(`Research complete: ${r.name} — ${r.desc}.`, true); saveGame(); ui(); return true; }
function craft(id) { const c = craftCost(id); if (S.mat < c || !Object.entries(RECIPES).some(([k, l]) => researched(k) && l.includes(id)) || !bOf('workshop').length) return false; S.mat -= c; stashAdd(id); SFX('coin'); banner('🛠 CRAFTED ' + ITEMS[id].name.toUpperCase()); say(`Crafted a ${ITEMS[id].name} (−${c} scrap). It's in the stash.`, true); saveGame(); ui(); return true; }
function outPop(b, got, icon, col) {   /* V2.36: each whole unit a building really produced pops above it; the fraction fills its badge ring */
  b.acc = (b.acc || 0) + got; if (b.acc >= 1) { const n = Math.floor(b.acc); b.acc -= n; floats.push({ w: { x: b.x + b.w / 2, y: b.y + b.h / 2 - .2 }, t: `+${n} ${icon}`, col, a: 80 }); }
}
/* V3D.13 weather: now and then it rains for a few hours; Rain Collectors fill 1.5x faster in light rain, 2x in heavy */
/* V3D.17 seasons and weather: a 28-day year (7 days a season, starting in autumn). Each morning the radio gives the forecast
   for the day; rain and snow come in a few short spells instead of all the time. Snow settles on the ground, roofs and trees. */
const SEASONS = [
  { id: 'spring', name: 'Spring', icon: '🌱', wet: .45, farm: 1.1 }, { id: 'summer', name: 'Summer', icon: '☀️', wet: .25, farm: 1.15 },
  { id: 'autumn', name: 'Autumn', icon: '🍂', wet: .45, farm: 1 }, { id: 'winter', name: 'Winter', icon: '❄️', wet: .55, farm: .7, snow: true }];
const SEASON_DAYS = 7;
const seasonOf = (day = S.day) => SEASONS[Math.floor((day - 1) / SEASON_DAYS + 2) % 4];
function forecastFor(day) {   /* planned once per day: 0–2 short spells of rain (or snow in winter) */
  S.fc = S.fc || {}; if (S.fc[day]) return S.fc[day]; const se = seasonOf(day), out = [];
  let n = rnd() < se.wet ? 1 : 0; if (n && rnd() < .2) n = 2;
  for (let i = 0; i < n; i++) { const h0 = 1 + Math.floor(rnd() * 21), dur = 2 + Math.floor(rnd() * 3), heavy = rnd() < .25; if (out.some((o) => h0 < o.h1 + 2 && o.h0 < h0 + dur + 2)) continue; out.push({ h0, h1: Math.min(24, h0 + dur), kind: (se.snow ? 'snow' : 'rain') + (heavy ? '-heavy' : '') }); }
  for (const k of Object.keys(S.fc)) if (+k < day - 1) delete S.fc[k];
  return (S.fc[day] = out.sort((a, b) => a.h0 - b.h0));
}
const WX_ICON = { rain: '🌧', 'rain-heavy': '⛈', snow: '🌨', 'snow-heavy': '❄️' }, WX_NAME = { rain: 'Light rain', 'rain-heavy': 'Heavy rain', snow: 'Snow', 'snow-heavy': 'Heavy snow' };
function forecastText(day) { const f = forecastFor(day), se = seasonOf(day); if (!f.length) return `${se.icon} ${se.name}: dry all day`; return se.icon + ' ' + f.map((o) => `${WX_NAME[o.kind]} ${String(o.h0).padStart(2, '0')}:00–${String(o.h1 % 24).padStart(2, '0')}:00`).join(', '); }
const rainMult = () => (S.weather && S.weather.kind.startsWith('rain') ? (S.weather.kind === 'rain-heavy' ? 2 : 1.5) : 1);
const seasonFarm = () => seasonOf().farm * ((S.seedUntil || 0) >= S.day ? 1.25 : 1);   /* 3D.111 Greenwater's thanks: seed stock */
function weatherHour() {
  leadsHour();
  const f = forecastFor(S.day), now = f.find((o) => S.hour >= o.h0 && S.hour < o.h1), was = S.weather;
  if (S.hour === 0 && seasonOf(S.day) !== seasonOf(S.day - 1)) { const se = seasonOf(); banner(`${se.icon} ${se.name} has come`); logEvent(`${se.name} has come.${se.snow ? ' Snow instead of rain, gardens grow 30% slower, bonfires matter.' : ''}`, 'important'); }
  if (S.hour === 6) { forecastFor(S.day + 1); banner('📻 ' + forecastText(S.day)); logEvent('Weather report: ' + forecastText(S.day) + '. Tomorrow: ' + forecastText(S.day + 1).replace(/^\S+ /, '') + '.'); }
  S.weather = now ? { kind: now.kind, h: now.h1 - S.hour } : null;
  if (S.weather && (!was || was.kind !== S.weather.kind)) { const k = S.weather.kind; barkSomeone(k.startsWith('snow') ? 'snow' : k === 'rain-heavy' ? 'storm' : 'rain', {}, { pri: 1 }); banner(`${WX_ICON[k]} ${WX_NAME[k]}${k.startsWith('rain') ? ': collectors fill faster' : ''}`); }
  if (!S.weather && was) barkSomeone('rainStop', {}, {});
  if (!S.weather && was) banner(was.kind.startsWith('snow') ? '🌤 The snow stops' : '🌤 The rain stops');
  const snowing = S.weather && S.weather.kind.startsWith('snow');
  S.snowK = Math.max(0, Math.min(1, (S.snowK || 0) + (snowing ? (S.weather.kind === 'snow-heavy' ? .35 : .2) : seasonOf().snow ? -.02 : -.18)));
}
/* 3D.28 tap-to-collect (Fallout Shelter style): producing buildings also fill a small BONUS (35% of what they make, up to
   12 hours' worth). When a whole unit is waiting a bubble pops over the building; tap it to collect. Normal production
   still reaches the stores on its own, so nothing is lost if you never tap. */
const BONUS = .35, BONUS_H = 12, BONUS_RES = { water: '💧', food: '🍖', mat: '⚙', wood: '🪵', stone: '🪨', rp: '🔬' };
function addBonus(b, res, a) { if (!(a > 0)) return; b.bonusRes = res; b.bonus = Math.min(a * BONUS * BONUS_H, (b.bonus || 0) + a * BONUS); if (b.bonus >= 1 && !S.collectHint) { S.collectHint = 1; say('Tap the bubbles over buildings to collect bonus supplies!', true); } }
/* 3D.30 real Fallout Shelter collecting (glass/cozy UI): what a building makes waits in its tray until you tap the bubble.
   The tray holds TRAY_H hours of output; past that the building stops filling (shown as FULL, and listed in the alert hub). */
const TAP_COLLECT = true, TRAY_H = 8;
function trayAdd(b, res, a, nm) { if (!(a > 0)) return; b.bonusRes = res; const cap = Math.max(2, a * TRAY_H), had = b.bonus || 0, put = Math.max(0, Math.min(a, cap - had)); b.bonus = had + put; b.trayCap = cap; b.trayFull = b.bonus >= cap - 1e-6; if (a > put && res !== 'rp') flow(res, 'Wasted: not collected', 0); if (b.bonus >= 1 && !S.collectHint) { S.collectHint = 1; note('important', 'Tap the bubbles over buildings to collect what they made', { banner: '👆 Tap the bubbles to collect!' }); } }
function collectBonus(b) { statAdd('trays');
  const r = b.bonusRes, n = TAP_COLLECT ? Math.round((b.bonus || 0) * 10) / 10 : Math.floor(b.bonus || 0); if (!r || n < 1) return false;
  const room = r === 'rp' ? 1e9 : r === 'water' || r === 'food' ? supplyCap() - (S[r] || 0) : r === 'mat' ? 1e9 : resCap(r) - (S[r] || 0), got = Math.max(0, Math.min(n, TAP_COLLECT ? room : Math.floor(room)));
  if (!got) { say(`${RES_TITLE[r] || 'Storage'} is full: build more storage to collect.`); return true; }
  if (got < .05) { say(`${RES_TITLE[r] || 'Storage'} is full: build more storage to collect.`); return true; }
  S[r] = (S[r] || 0) + got; b.bonus = Math.max(0, b.bonus - got); b.trayFull = false; if (r !== 'rp') flow(r, TAP_COLLECT ? DEFS[b.type].name : 'Collected bonus', got); if (r === 'water' || r === 'food') S.produced += got;
  floats.push({ w: { x: b.x + b.w / 2, y: b.y + b.h / 2 - .3 }, t: `+${Math.round(got)} ${BONUS_RES[r]}`, col: '#C6FF4D', a: 90, big: true }); SFX('reward'); S.collected = (S.collected || 0) + 1; ui(); return true;
}
function hitBonus(px, py) { for (const b of world.buildings) { const c = b._cb; if (c && tick - c.t < 8 && Math.hypot(px - c.x, py - c.y) < c.r * 1.5) return b; } return null; }
function drawBonus(b, cx, cy, z) {   /* white glass bubble with the resource icon and the amount, bobbing; tappable */
  const n = Math.floor(b.bonus || 0); if (n < 1 || !window.ZHIcons) return; const full = TAP_COLLECT && b.trayFull; const im = ZHIcons.img({ water: 'water', food: 'food', mat: 'parts', wood: 'wood', stone: 'stone', rp: 'research' }[b.bonusRes]);
  const r = (full ? 22 : 19) * z, x = cx, y = cy - 58 * z + Math.sin(tick / (full ? 5 : 10) + b.x) * (full ? 4 : 2.5) * z;
  ctx.save(); ctx.shadowColor = 'rgba(0,0,0,.35)'; ctx.shadowBlur = 8 * z; ctx.shadowOffsetY = 3 * z;
  ctx.beginPath(); ctx.arc(x, y, r, 0, 7); ctx.fillStyle = 'rgba(255,255,255,.96)'; ctx.fill(); ctx.shadowColor = 'transparent';
  ctx.lineWidth = 2.5 * z; ctx.strokeStyle = full ? '#FF7A59' : '#C6FF4D'; ctx.beginPath(); ctx.arc(x, y, r + 1.5 * z, 0, 7); ctx.stroke();
  ctx.beginPath(); ctx.moveTo(x - 5 * z, y + r - 1); ctx.lineTo(x, y + r + 7 * z); ctx.lineTo(x + 5 * z, y + r - 1); ctx.fillStyle = 'rgba(255,255,255,.96)'; ctx.fill();
  if (im && im.complete) ctx.drawImage(im, x - 14 * z, y - 15 * z, 28 * z, 28 * z);
  const t = full ? 'FULL' : '+' + n; ctx.font = `800 ${Math.round(13 * z)}px Manrope, system-ui, sans-serif`; const tw = ctx.measureText(t).width + 8 * z;
  ctx.beginPath(); ctx.roundRect(x + r * .45, y - r - 5 * z, tw, 18 * z, 9 * z); ctx.fillStyle = full ? '#FF7A59' : '#C6FF4D'; ctx.fill(); ctx.fillStyle = full ? '#fff' : '#14200A'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillText(t, x + r * .45 + tw / 2, y - r + 4 * z);
  ctx.restore(); b._cb = { x, y, r, t: tick };
}
function newProduce(b, d, cap) {   /* 3D.77: the power, fuel and ammo buildings */
    if (b.burnt || b.fire) return d.fam === 'pump' || d.fam === 'greenhouse' || d.fam === 'fuel' || d.fam === 'ammo' || d.fam === 'ammo2';
    const tk = b.staff && hasSkill(b.staff, 'tinkerer') ? 1.25 : 1, base = b.staff ? 1 : .25;   /* no Mechanic on the job: a quarter */
    if (d.fam === 'pump') { const a = d.out / 24 * prodMult(b) * base * (powered(b) ? 1 : PUMP_HAND), got = Math.min(a, Math.max(0, cap - S.water)); S.water += got; flow('water', d.name, got); outPop(b, got, '💧', '#8fd8ff'); return true; }
    if (d.fam === 'greenhouse') { const full = S.food >= supplyCap() - .5, need = full ? 0 : d.waterUse / 24, frac = full ? 0 : Math.min(1, (S.water || 0) / need); S.water -= need * frac; flow('water', 'Irrigation', -need * frac); const a = d.out / 24 * frac * prodMult(b) * base * (powered(b) ? 1.4 : 1), got = Math.min(a, Math.max(0, cap - S.food)); S.food += got; flow('food', d.name, got); outPop(b, got, '🍖', '#9fe58a'); return true; }   /* lamps with power: +40% */
    if (d.fam === 'fuel') { const a = Math.min(d.out / 24 * prodMult(b) * base * tk, rareCap() - (S.fuel || 0)), wood = a * 2; if (a <= 0 || (S.wood || 0) < wood) return true; S.wood -= wood; S.fuel = Math.min(rareCap(), (S.fuel || 0) + a); flow('fuel', d.name, a); outPop(b, a, '⛽', '#ffb36b'); return true; }   /* 2 wood -> 1 fuel */
    if (d.fam === 'ammo' || d.fam === 'ammo2') { if (d.fam === 'ammo2' && !powered(b)) return true; const a = Math.min(d.out / 24 * prodMult(b) * base * tk, ammoCap() - (S.ammo || 0)), scrap = a / 4; if (a <= 0 || S.mat < scrap) return true; S.mat -= scrap; S.ammo = (S.ammo || 0) + a; flow('mat', d.name, -scrap); flow('ammo', d.name, a); outPop(b, a, '🔸', '#ffd27a'); return true; }   /* 1 scrap -> 4 rounds */
    return false;
}
function hourlyProduction() {   // runs every game hour
  goalsTick(); if (S.hour % 3 === 0) ammoAlert(false);
  let fi = 0, wi = 0; const cap = supplyCap();
  for (const b of world.buildings) {
    const d = DEFS[b.type]; if (!d) continue; const nm = d.name;
    if (d.slot) { b.wh = b.wh || []; b.wh.push(b.staff ? (b.wsN ? b.wsW / b.wsN : (isWorking(b) ? 1 : 0)) : 0); if (b.wh.length > 24) b.wh.shift(); b.wsN = b.wsW = 0; }   /* V2.35: measured share of the hour the worker was on the job */
    if (d.fam === 'water' && TAP_COLLECT) { trayAdd(b, 'water', d.out / 24 * prodMult(b) * helpMult(b) * (isT(b, 'water') ? rainMult() : 1)); continue; }
    if (d.fam === 'water') { const a = d.out / 24 * prodMult(b) * helpMult(b) * (isT(b, 'water') ? rainMult() : 1), room = Math.max(0, cap - S.water), got = Math.min(a, room); S.water = keepCap(cap, S.water, a); wi += got; flow('water', nm, got); addBonus(b, 'water', a); outPop(b, got, '💧', '#8fd8ff'); if (a > got) flow('water', 'Wasted: storage full', -(a - got)); }
    if (d.fam === 'scrap' && TAP_COLLECT) { trayAdd(b, 'mat', d.out / 24 * prodMult(b) * (researched('salvage') ? 1.25 : 1)); continue; }
    if (d.fam === 'scrap') { const a = d.out / 24 * prodMult(b) * (researched('salvage') ? 1.25 : 1); S.mat += a; flow('mat', nm, a); addBonus(b, 'mat', a); outPop(b, a, '⚙', '#9fe0ff'); }
    if ((d.fam === 'lumber' || d.fam === 'quarry') && TAP_COLLECT) { trayAdd(b, d.fam === 'lumber' ? 'wood' : 'stone', d.out / 24 * prodMult(b)); continue; }
    if (d.fam === 'lumber' || d.fam === 'quarry') { const r = d.fam === 'lumber' ? 'wood' : 'stone', a = Math.max(0, Math.min(d.out / 24 * prodMult(b), matCap() - (S[r] || 0))); S[r] = (S[r] || 0) + a; flow(r, nm, a); addBonus(b, r, d.out / 24 * prodMult(b)); outPop(b, a, RES_ICON[r], '#e8b878'); }   /* V3D.23 */
    if (d.fam === 'research' && TAP_COLLECT) { trayAdd(b, 'rp', (isWorking(b) ? d.out : 6) / 24 * prodMult(b)); continue; }
    if (d.fam === 'research') { const a = (isWorking(b) ? d.out : 6) / 24 * prodMult(b); S.rp = (S.rp || 0) + a; addBonus(b, 'rp', a); outPop(b, a, '🔬', '#c7b6ff'); }
    if (newProduce(b, d, cap)) continue;
    if (d.fam === 'farm') { const full = S.food >= supplyCap() - .5, need = full ? 0 : d.waterUse / 24, frac = full ? 0 : need > 0 ? Math.min(1, S.water / need) : 1;   /* 3D.110 balance run: a full pantry means the farm rests and drinks no water */ S.water -= need * frac; flow('water', 'Irrigation', -need * frac); b.dry = !full && frac < 1; b.rest = full; const a = d.out / 24 * frac * prodMult(b) * helpMult(b) * seasonFarm(); if (TAP_COLLECT) { trayAdd(b, 'food', a); continue; } const room = Math.max(0, cap - S.food), got = Math.min(a, room); S.food = keepCap(cap, S.food, a); fi += got; flow('food', nm, got); addBonus(b, 'food', a); outPop(b, got, '🍖', '#ffe06b'); if (a > got) flow('food', 'Wasted: storage full', -(a - got)); }
  }
  S.produced += fi + wi; dayLog.foodIn += fi; dayLog.waterIn += wi;
}
/* ---------------- V2.35 economy: expected daily rates from the same formulas as the simulation + an hourly ledger of what really happened ---------------- */
const RES_TITLE = { food: 'Food', water: 'Water', mat: 'Scrap', wood: 'Wood', stone: 'Stone', cloth: 'Cloth', meds: 'Medicine', fuel: 'Fuel', ammo: 'Ammo' };
const ECO = { start: null, cur: null, hist: [] };   // hist: last 24 game hours of { res: { category: amount } } (not saved: rebuilt after a load)
function flow(res, cat, amt) { if (!ECO.cur) ecoHour(); const r = ECO.cur[res] ||= {}; r[cat] = (r[cat] || 0) + amt; }
function ecoHour() {   // close the hour: what is not explained by a recorded flow goes to "Other" (kills, story events, trader, purchases...)
  if (ECO.cur && ECO.start) { for (const k of ['food', 'water', 'mat']) { const rec = Object.values(ECO.cur[k]).reduce((a, v) => a + v, 0), res = (S[k] - ECO.start[k]) - rec; if (Math.abs(res) > .005) ECO.cur[k][res > 0 ? 'Other income' : 'Other spending'] = res; } ECO.hist.push(ECO.cur); if (ECO.hist.length > 24) ECO.hist.shift(); }
  ECO.cur = { food: {}, water: {}, mat: {}, wood: {}, stone: {} }; ECO.start = { food: S.food, water: S.water, mat: S.mat, wood: S.wood || 0, stone: S.stone || 0 };
}
function ecoLast24(res) { const out = {}; for (const h of ECO.hist) for (const [k, v] of Object.entries(h[res] || {})) out[k] = (out[k] || 0) + v; return { hours: ECO.hist.length, by: out }; }
const workShare = (b) => { if (!b.staff) return 0; const h = b.wh || []; return h.length >= 4 ? h.reduce((a, v) => a + v, 0) / h.length : .5; };   // measured; .5 until there are a few hours of history
function expectedMult(b) { const sh = workShare(b); return prodMult(b, false) * (1 - sh) + prodMult(b, true) * sh; }
function econ() {   // expected per-day flows for food, water and scrap, with the buildings behind them
  const R = { food: { prod: [], use: [] }, water: { prod: [], use: [] }, mat: { prod: [], use: [] }, wood: { prod: [], use: [] }, stone: { prod: [], use: [] } }, need = rationNeed(), issues = [];
  let wAvail = 0; for (const b of world.buildings) { const d = DEFS[b.type]; if (d && (d.fam === 'water' || d.fam === 'pump')) wAvail += d.out * expectedMult(b) * (d.fam === 'pump' ? (powered(b) ? 1 : PUMP_HAND) : 1); }
  for (const b of world.buildings) {
    const d = DEFS[b.type]; if (!d) continue; const m = expectedMult(b), who = { b, name: d.name };
    if (d.fam === 'water') R.water.prod.push({ ...who, v: d.out * m });
    if (d.fam === 'scrap') R.mat.prod.push({ ...who, v: d.out * m * (researched('salvage') ? 1.25 : 1) });
    if (d.fam === 'lumber') R.wood.prod.push({ ...who, v: d.out * m }); if (d.fam === 'quarry') R.stone.prod.push({ ...who, v: d.out * m });
    if (d.fam === 'farm' || d.fam === 'greenhouse') { const frac = S.water > 1 || wAvail > d.waterUse ? 1 : Math.min(1, S.water / (d.waterUse || 1)); R.food.prod.push({ ...who, v: d.out * m * frac * (d.fam === 'greenhouse' && powered(b) ? 1.4 : 1) }); R.water.use.push({ ...who, name: d.name + ' irrigation', v: d.waterUse * frac }); }
    if (d.fam === 'pump') R.water.prod.push({ ...who, v: d.out * m * (b.staff ? 1 : .25) * (powered(b) ? 1 : PUMP_HAND) });   /* 3D.77 */
    const u = upkeepOf(b); if (u > 0) R.mat.use.push({ ...who, name: d.name + ' upkeep', v: u, group: 'Upkeep' });
    if (d.slot && !b.staff) issues.push({ b, t: `${d.name}: no ${(STAFF_JOBS[d.fam] || ['worker']).join(' or ')} assigned, base output only`, res: FAMRES(d.fam) });
    if (b.unpaid) issues.push({ b, t: `${d.name}: upkeep unpaid, half output`, res: FAMRES(d.fam) || 'mat' });
    if (b.fire || b.burnt) issues.push({ b, t: `${d.name}: ${b.fire ? 'on fire' : 'burnt down'}, no output`, res: FAMRES(d.fam) });
    if (d.fam === 'farm' && b.dry) issues.push({ b, t: `${d.name}: not enough water to irrigate`, res: 'food' });
  }
  R.food.use.push({ name: `Rations (${S.sv.length} survivors${(S.kids || []).length ? ', ' + S.kids.length + ' children' : ''})`, v: need.f });
  R.water.use.push({ name: `Rations (${S.sv.length} survivors${(S.kids || []).length ? ', ' + S.kids.length + ' children' : ''})`, v: need.w });
  const cap = supplyCap(), out = {};
  for (const k of ['food', 'water', 'mat', 'wood', 'stone']) {
    const P = R[k].prod.reduce((a, q) => a + q.v, 0), U = R[k].use.reduce((a, q) => a + q.v, 0), net = P - U, stock = S[k] || 0, c = k === 'mat' ? null : k === 'wood' || k === 'stone' ? matCap() : cap;
    out[k] = { k, stock, prod: P, use: U, net, cap: c, producers: R[k].prod.sort((a, b) => b.v - a.v), consumers: R[k].use.sort((a, b) => b.v - a.v), days: net < -1e-6 ? stock / -net : Infinity, fullIn: c && net > 1e-6 && stock < c ? (c - stock) / net : null, full: c ? stock >= c - .01 : false, issues: issues.filter((i) => i.res === k) };
  }
  return out;
}
const keepCap = (cap, cur, add) => Math.max(cur, Math.min(cap, cur + add));   /* audit: a cap that shrinks (Cold Store loses power) never deletes what is stored */
const FAMRES = (fam) => fam === 'water' || fam === 'pump' ? 'water' : fam === 'farm' || fam === 'greenhouse' ? 'food' : fam === 'fuel' ? 'fuel' : fam === 'ammo' || fam === 'ammo2' ? 'ammo' : fam === 'scrap' ? 'mat' : fam === 'lumber' ? 'wood' : fam === 'quarry' ? 'stone' : null;
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
  let item = null; if (g === 'S' || g === 'A') { const pool = ['gloves', 'belt', 'shoes', 'goggles', 'glasses', 'charm', 'dogtags', 'backpack', 'watch', 'kneepads', 'toolbelt', 'walkie', 'medpouch', 'headlamp', 'gasmask']; item = pool[Math.floor(rnd() * pool.length)]; stashAdd(item); }
  S.mat += R[1]; renownGain(R[0], 'Weekly Haven Review: ' + g); S.titles = S.titles || []; if (!S.titles.includes(R[2])) S.titles.push(R[2]); S.lastReview = { week: Math.floor((S.day - 1) / 7), grade: g, total, sc };
  showEventPopup({ title: `HAVEN REVIEW · WEEK ${Math.floor((S.day - 1) / 7)} · GRADE ${g}`, text: Object.entries(sc).map(([k, v]) => `${k}: <b>${Math.round(v)}</b>/20`).join('<br>') + `<br><b>Total ${total}/120</b> — title: <b>${R[2]}</b>`, gains: `+${R[0]} Renown · +${R[1]} scrap${item ? ' · ' + ITEMS[item].name : ''}` });
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
  if (d.fam === 'water') { S.water = keepCap(supplyCap(), S.water, a); S.produced += a; t = 'water'; }
  if (d.fam === 'farm') { S.water = Math.max(0, S.water - d.waterUse / 6); S.food = keepCap(supplyCap(), S.food, a); S.produced += a; t = 'food'; }
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
  if (!world.buildings.includes(b) || b.burnt || (b.safeUntil || 0) > nowH()) return false; const was = b.fire; if (!was) barkSomeone('fire', { b: DEFS[b.type].name }, { pri: 2 }, { x: b.x + b.w / 2, y: b.y + b.h / 2 }); b.fire = Math.max(b.fire || 0, n); if (was) return true;
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
  barkSomeone('fireOut', {}, { pri: 1 }, { x: b.x + b.w / 2, y: b.y + b.h / 2 }); b.fire = 0; const crew = S.sv.filter((q) => q.fireAt === b && ['goFire', 'fightFire'].includes(q.mode)); crew.forEach((q) => { q.fireAt = null; q.activity = null; gainXp(q, 3); enterFree(q, 40); });
  note('routine', `The fire at the ${DEFS[b.type].name} is out${crew.length ? ' — thanks to ' + crew.map((q) => q.name).join(', ') : ''}.`, { at: { x: b.x + b.w / 2, y: b.y + b.h / 2 }, float: '✔ FIRE OUT', col: '#9fe58a' }); renownGain(2, 'Fire put out');
}
const repairCost = (b) => repCostFrac(b, .25);   /* 3D.61: a quarter of each of its materials */
function repairBurnt(b) {
  const rc = repairCost(b); if (!b.burnt || !canPay(rc)) return false; payCost(rc); for (const [k, v] of Object.entries(rc)) flow(k, 'Repairs', -v); b.burnt = false; b.wrecked = false; b.hp = bMax(b); b.max = b.hp; b.safeUntil = nowH() + 24; Wd.bump(world); autoStaff();
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
  b.fire -= (wet ? 2 : 1) * Math.max(.6, sMod(s, 'end', .04)) * (gearFx(s, 'fire') ? 1.6 : 1); if (b.fire <= 0) fireOut(b);   /* 3D.28 Firefighter Coat */
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
  dog: { name: 'Dog', st: { per: 2, end: 1 }, desc: '+2 PER, +1 END · barks when raiders sneak close · sometimes digs up scrap or food' },
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
    if (s.pet.kind === 'dog' && dogRole(s) === 'companion') s.sat = Math.min(100, (s.sat || 0) + 4);   /* 3D.104 companion dog */
    if (s.pet.kind === 'dog' && rnd() < (dogRole(s) === 'digger' ? .65 : .35)) { const k = rnd() < .5 ? 'mat' : 'food'; S[k] += 1; floats.push({ w: { ...s.w }, t: `+1 ${SHORT_ICON[k] || '🍖'} (${s.pet.name})`, col: '#9fe58a', a: 80 }); }
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
const TRADES = [{ give: { food: 6 }, get: { mat: 4 } }, { give: { water: 6 }, get: { mat: 4 } }, { give: { mat: 5 }, get: { food: 6 } }, { give: { mat: 5 }, get: { water: 6 } }, { give: { mat: 8 }, get: { wood: 4 } }];   /* 3D.131 owner: spare scrap buys wood, at a poor rate (scrap piled up to 300-480 with nothing to spend it on) */
const RES_NAME = { food: 'food', water: 'water', mat: 'scrap', wood: 'wood', stone: 'stone', cloth: 'cloth', meds: 'medicine', fuel: 'fuel', ammo: 'ammo' };
function traderDisc() { const c = Math.max(5, ...S.sv.filter((q) => q.hp > 0 && q.mode !== 'away').map((q) => stat(q, 'cha'))); return Math.min(.35, Math.max(0, (c - 5) * .02) + (bOf('tradepost').length ? .15 : 0)); }   /* 3D.104 a Trading Post: better deals */
const priced = (cost) => Object.fromEntries(Object.entries(cost).map(([k, v]) => [k, Math.max(1, Math.ceil(v * (1 - traderDisc())))]));
const costText = (c) => Object.entries(c).map(([k, v]) => v + ' ' + RES_NAME[k]).join(' + ');
const canPay = (c) => Object.entries(c).every(([k, v]) => (S[k] || 0) >= v);
/* V3D.22 resources: costs are objects { wood, mat (= scrap), ... } */
const RES_ICON = { food: '🍖', water: '💧', mat: '⚙', wood: '🪵', stone: '🪨', cloth: '🧵', meds: '💊', fuel: '⛽', ammo: '🔸' };
const bCost = (d) => { const c = {}; for (const k of ['wood', 'stone', 'mat', 'cloth', 'meds', 'fuel']) if (d[k]) c[k] = d[k]; return c; };
const payCost = (c) => { for (const [k, v] of Object.entries(c)) S[k] = (S[k] || 0) - v; };
const refundCost = (c, f) => { for (const [k, v] of Object.entries(c)) S[k] = (S[k] || 0) + Math.floor(v * f); };
const costShort = (c) => Object.entries(c).map(([k, v]) => (RES_ICON[k] || '') + ' ' + v).join('  ') || 'free';
const missText = (c) => Object.entries(c).filter(([k, v]) => (S[k] || 0) < v).map(([k, v]) => (v - Math.floor(S[k] || 0)) + ' ' + RES_NAME[k]).join(' + ');
function traderStock() {
  const gear = Object.keys(ITEMS).filter((id) => id !== 'pipe' && ITEMS[id].cost >= 4), st = [];
  while (st.length < 3 && gear.length) { const id = gear.splice(Math.floor(rnd() * gear.length), 1)[0]; st.push({ k: 'item', id, cost: { mat: Math.ceil(ITEMS[id].cost * 1.1), food: 3 } }); }
  st.push({ k: 'pet', id: rnd() < .5 ? 'dog' : 'cat', cost: { food: 6, water: 6 } }); if (S.day >= 5) { const e = ['molotov', 'pipebomb', 'grenade'][Math.floor(rnd() * (S.lvl >= 7 ? 3 : 2))]; st.push({ k: 'ex', id: e, n: 2, cost: { mat: EX_DEFS[e].price } }); }   /* 3D.104 explosives */ st.push({ k: 'rp', n: 15, cost: { mat: 8 } }); return st;
}
function traderSpot(cx, cy) {   /* V3D.17: an open patch for the stall: walkable, no building, site or approach tile within a tile */
  const clear = (x, y) => { for (let dx = -1; dx <= 1; dx++) for (let dy = -1; dy <= 1; dy++) { if (Wd.buildingAt(world, x + dx, y + dy)) return false; } return Wd.walkable ? Wd.walkable(world, x, y) : true; };
  const taken = new Set(world.buildings.map((b) => { const t = Wd.approachTile(b); return t.x + ',' + t.y; }));
  for (let r = 0; r < 12; r++) for (let dx = -r; dx <= r; dx++) for (let dy = -r; dy <= r; dy++) { if (Math.max(Math.abs(dx), Math.abs(dy)) !== r) continue; const x = cx + dx, y = cy + dy;
    if (Wd.inMap(x, y) && clear(x, y) && !taken.has(x + ',' + y) && !S.sv.some((s) => s.post && s.post.x === x && s.post.y === y)) return { x, y }; }
  return Wd.nearestWalkable(world, cx, cy) || { x: cx, y: cy };
}
const hwyEnd = () => [rnd() < .5 ? 0 : COLS - 1, Wd.HWY_Y + (rnd() < .5 ? 0 : 1)];   /* 3D.101: one end of the north-east highway */
function traderArrive() {
  const a = hwyEnd(), cx = Math.round((Wd.BUILD.x0 + Wd.BUILD.x1) / 2), cy = Math.round((Wd.BUILD.y0 + Wd.BUILD.y1) / 2), g = traderSpot(cx, cy);
  S.trader = { human: true, w: tc(a[0], a[1]), home: tc(a[0], a[1]), goal: tc(g.x, g.y), mode: 'arrive', stock: traderStock(), ex: TRADES.map(() => 0), path: null };
  S.nextTrader = S.day + (bOf('market').length ? 1 : bOf('tradepost').length ? 1 + Math.floor(rnd() * 2) : 3 + Math.floor(rnd() * 2));   /* 3D.113 the Market Square: a trader every day */   /* 3D.104 a Trading Post brings traders twice as often */
  screenToast('🛒 A WANDERING TRADER ARRIVES'); barkSomeone('trader', {}, { pri: 1 }); say('A wandering trader is coming to the Haven until 19:00. Tap them (or Town → Trade) to buy gear, pets or research.');
}
function traderTick() {
  const T = S.trader; if (!T) return; T.moving = false;
  if (T.mode === 'arrive') { const r = followPath(T, T.goal, WALK * 1.2); T.moving = r === 'moving'; if (r !== 'moving') { T.mode = 'stay'; T.path = null; } }
  else if (T.mode === 'leave') { const r = followPath(T, T.home, WALK * 1.3); T.moving = r === 'moving'; if (r !== 'moving') S.trader = null; }
}
function traderLeave() { if (!S.trader || S.trader.mode === 'leave') return; S.trader.mode = 'leave'; S.trader.path = null; barkSomeone('traderBye', {}, {}); say('The wandering trader is packing up and leaving.'); }
function traderBuy(i) {
  const T = S.trader, o = T && T.stock[i]; if (!o || o.sold) return false; const c = priced(o.cost); if (!canPay(c)) return false;
  for (const [k, v] of Object.entries(c)) S[k] -= v; o.sold = true; SFX('coin');
  if (o.k === 'item') { stashAdd(o.id); say(`Bought a ${ITEMS[o.id].name}. It's in the stash.`); }
  if (o.k === 'pet') { const p = newPet(o.id); (S.pets = S.pets || []).push(p); say(`Adopted ${p.name} the ${PETS[o.id].name}! Tap a survivor → Pet to give it an owner.`); }
  if (o.k === 'rp') { S.rp = (S.rp || 0) + o.n; say(`Bought research notes: +${o.n} RP.`); }
  if (o.k === 'ex') { const got = exAdd(o.id, o.n); say(`Bought ${got} ${EX_DEFS[o.id].name}${got > 1 ? 's' : ''}.`); }
  saveGame(); ui(); return true;
}
function traderTrade(i) {
  const T = S.trader, t = TRADES[i]; if (!T || (T.ex[i] || 0) >= 3) return false; const c = i < 2 ? t.give : priced(t.give); if (!canPay(c)) return false;
  for (const [k, v] of Object.entries(c)) S[k] -= v; for (const [k, v] of Object.entries(t.get)) S[k] += v; T.ex[i] = (T.ex[i] || 0) + 1; saveGame(); ui(); return true;
}
function showTrader() {
  const T = S.trader; if (!T) return; selected = null; closeP(); $('it').textContent = 'WANDERING TRADER'; const disc = Math.round(traderDisc() * 100);
  const tIcon = (o) => { if ((o.k === 'item') && window.ZHItemIcons && ZHItemIcons.has(o.id)) return `<span class="tIco">${ZHItemIcons.svg(o.id, 30)}</span>`; const src = o.k === 'item' && window.ZHItems && ZHItems.icon(o.id); return src ? `<img class="pix tIco" src="${src}" alt="">` : `<span class="tIco">${o.k === 'pet' ? (o.id === 'dog' ? '🐕' : '🐈') : o.k === 'rp' ? '📜' : '📦'}</span>`; };   /* V2.33: item icons in the trader menu */
  const offer = (o) => tIcon(o) + (o.k === 'item' ? `${ITEMS[o.id].name}<small> · ${itemText(ITEMS[o.id])}</small>` : o.k === 'ex' ? `${EX_DEFS[o.id].icon} ${o.n} ${EX_DEFS[o.id].name}s<small> · ${EX_DEFS[o.id].desc}</small>` : o.k === 'pet' ? `${PETS[o.id].name}<small> · ${PETS[o.id].desc}</small>` : `Research notes<small> · +${o.n} RP</small>`);
  $('ib').innerHTML = `Leaves at 19:00. Prices ${disc ? `<b>−${disc}%</b> (your best Charisma)` : 'are full price — a survivor with high Charisma gets a discount'}.<br><b>For sale</b><br>`
    + T.stock.map((o, i) => o.sold ? `<div><small>✔ sold: ${o.k === 'item' ? ITEMS[o.id].name : o.k === 'ex' ? EX_DEFS[o.id].name : o.k === 'pet' ? PETS[o.id].name : 'Research notes'}</small></div>` : `<button class="act" data-buy="${i}" ${canPay(priced(o.cost)) ? '' : 'style="opacity:.45"'}>${offer(o)} · ${costText(priced(o.cost))}</button>`).join('')
    + '<br><b>Exchange</b> <small>(3 times each per visit)</small><br>' + TRADES.map((t, i) => { const c = i < 2 ? t.give : priced(t.give); return `<button class="act" data-trade="${i}" ${(T.ex[i] || 0) < 3 && canPay(c) ? '' : 'style="opacity:.45"'}>${costText(c)} → ${costText(t.get)} <small>(${3 - (T.ex[i] || 0)} left)</small></button>`; }).join('');
  showPanel();
  $('ib').querySelectorAll('[data-buy]').forEach((x) => { x.onclick = () => { if (traderBuy(+x.dataset.buy)) showTrader(); }; });
  $('ib').querySelectorAll('[data-trade]').forEach((x) => { x.onclick = () => { if (traderTrade(+x.dataset.trade)) showTrader(); }; });
}
function drawTrader() {
  const T = S.trader, p = project(T.w.x, T.w.y); if (!T.look) T.look = { sex: 'm', skin: 1, hair: 5 }; T.job = 'Trader';
  { const u = hudU(), y = p.y - CHAR_H * TWs() * 1.05; if (T.mode === 'stay') bubble({ x: p.x, y: y - 6 * u }, '🛒'); return; }   /* V3D.17: the 3D renderer draws the trader */
}
function hitTrader(px, py) { const T = S.trader; if (!T) return false; const p = project(T.w.x, T.w.y), d = Math.hypot(px - p.x, py - (p.y - CHAR_H * TWs() * .5)); return d < Math.max(24, .45 * TWs()); }

/* ---------------- V2.22 bonds: friendships, couples and children (Fallout Shelter style) ---------------- */
const BOND = { acq: 20, friend: 50, close: 80 }, bondDay = new Map();
const bondOf = (a, b) => (a.rel && a.rel[b.id]) || 0;
const bondName = (v) => (v >= BOND.close ? 'Close friend' : v >= BOND.friend ? 'Friend' : v >= BOND.acq ? 'Acquaintance' : 'Stranger');
function addBond(a, b, n) {
  if (!a || !b || a === b) return; a.rel = a.rel || {}; b.rel = b.rel || {}; const pk = Math.min(a.id, b.id) + '-' + Math.max(a.id, b.id), today = bondDay.get(pk) || 0; if (today >= 20) return; bondDay.set(pk, today + n);   /* at most ~20 a day per pair */
  const before = bondOf(a, b), m = n * (hasT(a, 'caring') || hasT(b, 'caring') ? 1.5 : 1) * (hasT(a, 'loner') || hasT(b, 'loner') ? .5 : 1) * Math.max(.6, (sMod(a, 'cha', .04) + sMod(b, 'cha', .04)) / 2) * ageBondMul(a, b) * Math.max(.25, 1 - before / 150), v = Math.min(100, before + m);   /* each step up is harder */
  a.rel[b.id] = v; b.rel[a.id] = v;
  for (const [k, lvl] of [['friend', BOND.friend], ['close', BOND.close]]) if (before < lvl && v >= lvl) { if (k === 'friend') S.friendsMade = (S.friendsMade || 0) + 1; floats.push({ w: { x: (a.w.x + b.w.x) / 2, y: (a.w.y + b.w.y) / 2 }, t: k === 'close' ? '♥ CLOSE FRIENDS' : '♥ FRIENDS', col: '#ff9ac8', a: 90 }); note('routine', `${a.name} and ${b.name} are now ${k === 'close' ? 'close friends' : 'friends'}.`); }
}
function bondTick() {   /* every 120 ticks: time together builds bonds */
  const L = S.sv.filter((q) => q.hp > 0 && !['down', 'away'].includes(q.mode));
  for (let i = 0; i < L.length; i++) for (let j = i + 1; j < L.length; j++) {
    const a = L[i], b = L[j]; let n = 0;
    if (a.facility && a.facility === b.facility && a.mode === 'useFacility' && b.mode === 'useFacility') n += a.sleeping || b.sleeping ? .3 : 1.6;   /* 3D.63 study: sleeping in the same Camp made everyone best friends overnight; meals, chats and fights matter more now */   /* eating, resting or training together */
    else if (dist(a.w, b.w) < 1.6) n += .5;
    if (a.target && a.target === b.target && ['chase', 'attack', 'recover'].includes(a.mode) && ['chase', 'attack', 'recover'].includes(b.mode)) n += 1.2;   /* fighting side by side */
    if (n) addBond(a, b, n);
  }
}
function friendBoost(s) {   /* damage bonus with a friend fighting within 3 tiles */
  let best = 0; for (const q of S.sv) if (q !== s && q.hp > 0 && ['chase', 'attack', 'recover'].includes(q.mode) && dist(q.w, s.w) < 3) best = Math.max(best, bondOf(s, q));
  return best >= BOND.close ? 1.15 : best >= BOND.friend ? 1.1 : 1;
}
/* V3D.12 Inn and homes: everyone sleeps at the Inn; a House is one long-time resident's own home (they rest faster
   and get happier there). Houses are handed out to the longest-staying residents who have none. */
const okBed = (b) => !b.fire && !b.burnt && facilityUsers(b) < cap(b);
const homeOf = (s) => world.buildings.find((b) => isT(b, 'house') && b.owner === s.id);
/* 3D.30 housing: each Tent / Cabin / Stone House has its own residents (b.res = survivor ids), set by the player. Housing is
   for its residents only. Everyone else sleeps at the Camp, which has room for CAMP_CAP[tier]; past that they sleep rough. */
const CAMP_CAP = { hq: 10, hq2: 14, hq3: 18 };
const isHousing = (b) => !!b && isT(b, 'inn');
const housingOf = (s) => world.buildings.find((b) => isHousing(b) && (b.res || []).includes(s.id));
const campB = () => world.buildings.find((b) => DEFS[b.type] && DEFS[b.type].role === 'hq' && !b.burnt);
const unhoused = () => S.sv.filter((q) => !homeOf(q) && !housingOf(q));
const campCap = () => { const c = campB(); return c ? CAMP_CAP[c.type] || 10 : 0; };
function housingTidy() {   // drop residents who left or died; old saves get their beds filled once
  for (const b of world.buildings) if (isHousing(b)) b.res = (b.res || []).filter((id) => S.sv.some((q) => q.id === id) || (S.trip && S.trip.members.some((m) => m.id === id)) || (S.sh && S.sh.units.some((m) => m.id === id))).slice(0, cap(b));
  if (!S.housingV) { S.housingV = 1; fillBeds(); }
}
function fillBeds(only) {   // put unhoused survivors into empty beds (longest-staying first)
  const want = unhoused().sort((a, b) => (b.daysHere || 0) - (a.daysHere || 0) || a.id - b.id); let n = 0;
  for (const b of world.buildings) { if (!isHousing(b) || b.burnt || (only && b !== only)) continue; b.res = b.res || []; while (b.res.length < cap(b) && want.length) { b.res.push(want.shift().id); n++; } }
  return n;
}
function bedFor(s) {
  const h = homeOf(s); if (h && okBed(h)) return h;
  const hs = housingOf(s); if (hs && !hs.fire && !hs.burnt) return hs;
  const c = campB(); if (c && !c.fire) { const rank = unhoused().filter((q) => q.hp > 0).sort((a, b) => (b.daysHere || 0) - (a.daysHere || 0) || a.id - b.id).indexOf(s); if (rank < campCap() && facilityUsers(c) < campCap()) return c; }
  return null;
}
function rpStarter() {   /* V3D.13: the first research is a tutorial: the first Workshop comes with starter notes */
  if (S.rpGift || !bOf('workshop').length) return; S.rpGift = true; S.rp = (S.rp || 0) + 15; banner('🔬 Starter notes: +15 research'); logEvent('The new Workshop came with a box of old notes: +15 research points to get the first project going.', 'important');
}
function assignHomes() {
  for (const b of world.buildings) if (isT(b, 'house') && b.owner && !S.sv.some((q) => q.id === b.owner)) b.owner = null;
  const free = world.buildings.filter((b) => isT(b, 'house') && !b.owner && !b.burnt); if (!free.length) return;
  const want = S.sv.filter((q) => q.hp > 0 && !homeOf(q) && (q.resident || (q.daysHere || 0) >= 3)).sort((a, b) => (b.resident ? 1 : 0) - (a.resident ? 1 : 0) || (b.daysHere || 0) - (a.daysHere || 0) || a.id - b.id);
  for (const b of free) { const q = want.shift(); if (!q) break; b.owner = q.id; banner(`🏠 ${q.name} has a home now!`, q); logEvent(`${q.name} moved into a House of their own: they rest faster and get happier there.`, 'routine'); }
}
const bedCount = () => 4 + bOf('inn').reduce((a, b) => a + (DEFS[b.type].cap || 2), 0) + 2 * bOf('house').length;
const cityL = () => Math.max(0, (S.lvl || 1) - 15);
const rankRoom = () => 8 + 4 * Math.max(0, (S.rank || 1) - 1) + 2 * (S.terr || 0) + 3 * cityL();   /* 3D.113 the City: +3 people a city level */   /* 3D.72: the town's standing limits how many it can take in: 8 at rank 1, +4 a rank, +2 per territory */
const popCap = () => Math.max(8, Math.min(28 + 3 * cityL(), bedCount(), rankRoom()));   /* V3D.23 beds; 3D.72 capped by rank, so growing the town means upgrading it */   /* V3D.23: beds in Tents / Cabins / Stone Houses */   /* V3D.12: an Inn makes room for 4 */
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
  for (const k of [...S.kids]) { k.age = (k.age || 0) + 1; if (k.age >= (bOf('school').length ? 3 : 5)) growUp(k); }   /* 3D.104 a School: children grow up in 3 days */
  // new babies
  for (const a of S.sv) { if (!a.partner || a.id > a.partner) continue; const b = S.sv.find((q) => q.id === a.partner); if (!b) continue;
    if (S.kids.some((k) => k.parents.includes(a.id)) || popNow() >= popCap() || (a.sat || 0) < 40 || (b.sat || 0) < 40 || S.food < 10 || S.water < 10 || rnd() > .45) continue;
    const name = KID_NAMES.find((n) => !S.sv.some((q) => q.name === n) && !S.kids.some((k) => k.name === n)) || 'Kid ' + (S.kids.length + 1);
    barkSomeone('baby', {}, { pri: 2 }); S.born = (S.born || 0) + 1; S.kids.push({ name, age: 0, parents: [a.id, b.id], st: Object.fromEntries(STATS.map((k) => [k, Math.round((((a.st && a.st[k]) || 5) + ((b.st && b.st[k]) || 5)) / 2)])) });
    SFX('reward'); renownGain(5, 'A baby is born'); showEventPopup({ title: '👶 A BABY IS BORN', text: `${a.name} and ${b.name} welcome little ${name}. ${name} will grow up in the Houses and join the Haven in 5 days.`, gains: `Inherits the parents' stats · eats half a ration until grown` });
  }
}
function growUp(k) {
  S.grown = (S.grown || 0) + 1;
  S.kids = S.kids.filter((q) => q !== k); const h = bOf('house')[0], p = h ? Wd.approachPoint(h) : tc(7 + OFF, 10 + OFF);
  const v = mk(k.name, 'Civilian', 1, Math.floor(p.x), Math.floor(p.y), S.sv.length); v.w = { x: p.x, y: p.y };
  for (const s of STATS) v.st[s] = Math.min(STAT_CAP, Math.max(1, (k.st[s] || 5) + (rnd() < .5 ? 1 : 0))); v.max = baseMax(v); v.hp = v.max; v.resident = true; v.sat = 40; v.parents = [...k.parents];
  v.rel = {}; for (const pid of k.parents) { const par = S.sv.find((q) => q.id === pid); if (par) { v.rel[pid] = 90; par.rel = par.rel || {}; par.rel[v.id] = 90; } }
  v.src = 'grown'; v.age = 18; S.sv.push(v); SFX('reward'); showEventPopup({ title: '🧑 ' + k.name.toUpperCase() + ' HAS GROWN UP', text: `${k.name} is ready to help the Haven. Give them a profession from the survivor panel (Job tab).`, gains: 'New resident · Civilian Lv.1 · stats from the parents' + traitTag(v) }); ui();
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
/* ---------------- 3D.71 skill study changes ----------------
   1. Progress pays: the horde grows with the day, and a town upgrade brings a newcomer, supplies and healing.
   2. The economy has teeth: hungry or thirsty people work at 70% and hit 20% softer; days with empty stores make people leave.
   3. Newcomers come to well-run towns: spare beds, food and water and a higher rank bring them sooner; a starving town gets none.
   4. Live calls: Send rescue (escorted, into danger) on a down alert, Focus the boss on the boss alert. Left alone, rescues are cautious.
   5. Score counts what skill changes: people kept, people lost, days survived, town rank. */
function rankReward() {
  S.food += 2; S.water += 2; for (const q of S.sv) if (q.hp > 0 && q.mode !== 'down') q.hp = Math.min(q.max, q.hp + Math.round(q.max * .25));
  if (popNow() < popCap()) S.arrivalClock = 1e9;   /* the next visitorArrival() call brings someone */
}
const hungryPen = (s) => (s && (s.hunger > 70 || s.thirst > 70) ? .7 : 1);
function townAppeal() {   /* 0..4: what makes survivors want to come here */
  const days = (k) => S[k] / Math.max(1, S.sv.length);   /* rations in store per person (about one a day) */
  return (days('food') >= 2 ? 1 : 0) + (days('water') >= 2 ? 1 : 0) + Math.min(2, (S.rank - 1) * .5) + (popCap() - popNow() >= 2 ? .5 : 0);
}
function comebackConvoy() {   /* Phase 1 (approved): a town down to its last few people gets one more chance: a small convoy at dawn, at most every 6 days */
  if (S.finale || S.hour !== 8 || !S.sv.length) return; const few = S.sv.length <= 3 || (S.sv.length <= 4 && (S.food < 2 || S.water < 2)) || (S.sv.length <= 6 && S.food < 1 && supplyStats().fNet < 0);   /* 3D.104: no food and few people also brings the convoy */
  if (!few || (S.convoyNext || 0) > S.day) return; S.convoyNext = S.day + 6; S.convoys = (S.convoys || 0) + 1;
  const got = []; for (const j of ['Farmer', rnd() < .5 ? 'Guard' : 'Scavenger']) { const v = newcomer(j, 1); if (v) { v.src = 'convoy'; got.push(`${v.name} (${j})`); } }
  S.food = keepCap(supplyCap(), S.food, 15); S.water = keepCap(supplyCap(), S.water, 15); S.mat += 6;
  showEventPopup({ title: '🚚 A CONVOY FOUND THE HAVEN', text: `A battered truck rolls up at dawn. ${got.length ? got.join(' and ') + ' climb down to stay, and they' : 'They'} unload 15 food, 15 water and some scrap.<br><br>“Heard there were people still holding out here. Don't waste it.”` });
  note('important', '🚚 A convoy brought help', { log: `A convoy brought ${got.length} survivors, 15 food, 15 water and 6 scrap.` });
}
function hardshipCheck() {
  if (S.food < 1 || S.water < 1) S.hardship = (S.hardship || 0) + 1; else S.hardship = 0;
  if (S.hardship >= 2 && S.sv.length > 2) { const q = S.sv.filter((v) => !['down', 'hospital', 'away', 'errand'].includes(v.mode)).sort((a, b) => (a.sat || 0) - (b.sat || 0))[0];
    if (q && rnd() < .6) { S.sv = S.sv.filter((v) => v !== q); for (const b of world.buildings) if (b.staff === q) b.staff = null; S.left = (S.left || 0) + 1;
      note('critical', `${q.name} left the Haven`, { icon: '🎒', log: `${q.name} couldn't take another day without ${S.food < 1 ? 'food' : 'water'} and left to find somewhere better.` }); } }
}
function orderEscorts(q) { const zs = S.z.filter((z) => z.hp > 0 && !z.zoo && z.mode !== 'zleave' && dist(z.w, q.w) < 4); if (!zs.length) return [];
  const esc = S.sv.filter((f) => isFighter(f) && canFight(f) && f.hp >= f.max * .6 && !f.rescuing && !f.carrying && !['down', 'hospital', 'away', 'errand', 'chase', 'attack', 'recover'].includes(f.mode)).sort((a, b) => dist(a.w, q.w) - dist(b.w, q.w)).slice(0, 2);
  esc.forEach((f, i) => { engage(f, zs[i % zs.length]); f.why = `Clearing the way to ${q.name}`; }); return esc; }
function orderRescue(q) {   /* the player's call: escorts clear the way and a rescuer goes in even if zombies are close */
  if (!q || q.mode !== 'down') return false;
  const crowd0 = S.z.filter((z) => z.hp > 0 && !z.zoo && z.mode !== 'zleave' && dist(z.w, q.w) < 4).length, esc = orderEscorts(q);
  if (crowd0 && !esc.length) { say(`No fighter is fit to cover a rescue of ${q.name} yet.`); return false; }   /* 3D.75: no cover, no rescue into zombies */ q.ordered = true;
  if (!q.rescuer) assignRescue(); say(q.rescuer ? `${q.rescuer.name} is going for ${q.name}${esc.length ? ', ' + esc.map((f) => f.name).join(' and ') + ' covering' : ''}.` : `Nobody can reach ${q.name} right now.`);
  return !!q.rescuer || esc.length > 0;
}
function focusBoss() { const b = S.z.find((z) => z.type === 'boss' && z.hp > 0); if (!b) return false; let n = 0;
  for (const f of S.sv) if (isFighter(f) && canFight(f) && f.hp >= f.max * .7 && !['down', 'hospital', 'away', 'errand'].includes(f.mode) && !f.rescuing && !f.carrying) { f.focusUntil = tick + 1500; engage(f, b); f.why = 'All together on the boss'; n++; }
  if (n) { S.focusT = tick + 1500; say(`${n} fighter${n > 1 ? 's' : ''} go for the boss together (+30% damage while they focus).`); } return n > 0; }
/* ---------------- 3D.73 played over weeks: the town keeps working while you're away, and daily / weekly goals give a reason to come back ----------------
   Away: every 10 real minutes counts as one game hour of work, up to 8 hours (a full tray). Production goes into the buildings' trays, as if
   the workers kept their shifts; nothing else happens (no hunger, no fights, no days pass). Expeditions already run on real time.
   Goals: three small goals each real day and one bigger goal each real week, with rewards to claim. */
let hiddenAt = 0;
const AWAY_MIN_PER_H = 10, AWAY_MAX_H = 8;
function statAdd(k, n = 1) { S.stat = S.stat || {}; S.stat[k] = (S.stat[k] || 0) + n; }
function awayCredit(ms) {
  if (titleOn || S.finale || !(ms > 0)) return null; lvTick(ms);   /* 3D.104 a level upgrade keeps going while away (at 1x) */ const hours = Math.min(AWAY_MAX_H, Math.floor(ms / 60000 / AWAY_MIN_PER_H)); goalsTick();
  if (hours < 1) return null; const got = {};
  for (let h = 0; h < hours; h++) for (const b of world.buildings) {
    const d = DEFS[b.type]; if (!d || b.burnt || b.fire || !d.out) continue; const sh = d.slot ? (b.staff ? Math.max(.5, (b.wh && b.wh.length ? b.wh.reduce((a, v) => a + v, 0) / b.wh.length : .7)) : 0) : 1;
    const pm = prodMult(b, sh >= .5) * (d.slot && !b.staff ? 1 : 1); let res = null, a = 0;
    if (d.fam === 'water') { res = 'water'; a = d.out / 24 * pm * helpMult(b); }
    else if (d.fam === 'scrap') { res = 'mat'; a = d.out / 24 * pm * (researched('salvage') ? 1.25 : 1); }
    else if (d.fam === 'lumber' || d.fam === 'quarry') { res = d.fam === 'lumber' ? 'wood' : 'stone'; a = d.out / 24 * pm; }
    else if (d.fam === 'research') { res = 'rp'; a = (b.staff ? d.out : 6) / 24 * pm; }
    else if (d.fam === 'farm') { res = 'food'; a = d.out / 24 * pm * helpMult(b) * seasonFarm(); }
    else if (d.fam === 'greenhouse') { const need = d.waterUse / 24; if ((S.water || 0) >= need) { S.water -= need; res = 'food'; a = d.out / 24 * pm * (b.staff ? 1 : .25) * (powered(b) ? 1.4 : 1); } }
    else if (d.fam === 'pump') { res = 'water'; a = d.out / 24 * pm * (b.staff ? 1 : .25) * (powered(b) ? 1 : PUMP_HAND); }
    if (!res || !(a > 0)) continue; const before = b.bonus || 0; trayAdd(b, res, a); got[res] = (got[res] || 0) + Math.max(0, (b.bonus || 0) - before);
  }
  const ic = { food: '🍖', water: '💧', mat: '⚙', wood: '🪵', stone: '🪨', rp: '🔬' }, parts = Object.entries(got).filter(([, v]) => v >= .5).map(([k, v]) => `${ic[k]} ${Math.round(v)}`);
  const real = ms >= 36e5 ? Math.round(ms / 36e5 * 10) / 10 + ' h' : Math.round(ms / 6e4) + ' min';
  const txt = `You were away ${real}. Your people kept their shifts for ${hours} game hour${hours > 1 ? 's' : ''}` + (parts.length ? `. Waiting in the trays: ${parts.join(' · ')}. Tap the bubbles to collect.` : ', but nothing was staffed to produce.') + (S.trip ? ' The expedition carried on too.' : '');
  note('important', '🌅 WHILE YOU WERE AWAY', { log: txt }); if (parts.length) try { showEventPopup({ title: '🌅 WHILE YOU WERE AWAY', text: txt }); } catch (e) { /* the note is enough */ }
  return { hours, got };
}
const dayKey = (t = Date.now()) => { const d = new Date(t); return d.getFullYear() + '-' + (d.getMonth() + 1) + '-' + d.getDate(); };
const weekKey = (t = Date.now()) => { const d = new Date(t); d.setHours(0, 0, 0, 0); d.setDate(d.getDate() - ((d.getDay() + 6) % 7)); return dayKey(d.getTime()); };   /* weeks start on Monday */
const GOALS_DAILY = {
  kills:   { icon: '🧟', name: 'Clear the streets', desc: (n) => `Defeat ${n} zombies`, n: () => 12 + 4 * S.rank, now: () => S.kills || 0, reward: { mat: 6 } },
  trays:   { icon: '🧺', name: 'Bring it in', desc: (n) => `Collect from production bubbles ${n} times`, n: () => 8, now: () => (S.stat || {}).trays || 0, reward: { food: 4, water: 4 } },
  produce: { icon: '🌾', name: 'Stock up', desc: (n) => `Produce ${n} food and water`, n: () => 15 + 5 * S.rank, now: () => S.produced || 0, reward: { mat: 5 } },
  build:   { icon: '🔨', name: 'Raise something', desc: () => 'Finish a building or an upgrade', n: () => 1, now: () => world.buildings.length + world.buildings.reduce((a, b) => a + (DEFS[b.type].tier || 1), 0), reward: { wood: 5, mat: 3 } },
  exped:   { icon: '🧭', name: 'Head out', desc: () => 'Send out an expedition', n: () => 1, now: () => (S.stat || {}).exp || 0, reward: { cloth: 2, meds: .5 } },
  saved:   { icon: '🩹', name: 'Nobody left behind', desc: () => 'Bring someone back from being down', n: () => 1, now: () => (S.stat || {}).saved || 0, reward: { meds: 1 } },
  study:   { icon: '🔬', name: 'Learn something', desc: () => 'Finish a research topic', n: () => 1, now: () => Object.keys(RESEARCH).filter((k) => researched(k)).length, reward: { mat: 6 } },
};
const GOALS_WEEKLY = {
  grow:    { icon: '👥', name: 'A growing Haven', desc: (n) => `Have ${n} people living in the Haven`, n: () => Math.min(28, popNow() + 3), now: () => popNow(), abs: true, reward: { mat: 20, food: 10, water: 10 } },
  rank:    { icon: '🏡', name: 'Moving up', desc: () => 'Raise the Haven one level', n: () => 1, now: () => S.lvl || 1, reward: { mat: 25, wood: 10 } },
  hunter:  { icon: '⚔', name: 'Hold the line', desc: (n) => `Defeat ${n} zombies this week`, n: () => 120 + 20 * S.rank, now: () => S.kills || 0, reward: { mat: 15, meds: 2 } },
  builder: { icon: '🏗', name: 'Town planner', desc: (n) => `Finish ${n} buildings or upgrades`, n: () => 5, now: () => GOALS_DAILY.build.now(), reward: { mat: 15, wood: 15, stone: 8 } },
};
function seededPick(keys, k, seed) { let x = 0; for (const c of seed) x = (x * 31 + c.charCodeAt(0)) >>> 0; const a = keys.slice(), out = []; while (out.length < k && a.length) { x = (x * 1103515245 + 12345) >>> 0; out.push(a.splice(x % a.length, 1)[0]); } return out; }
function makeGoal(set, id) { const g = set[id], n = g.n(); return { id, n, start: g.abs ? 0 : g.now(), done: false, claimed: false }; }
function goalsTick() {
  if (!S.sv || titleOn) return; const dk = dayKey(), wk = weekKey(); S.goals = S.goals || {};
  if (S.goals.day !== dk) { const pool = Object.keys(GOALS_DAILY).filter((k) => !(k === 'exped' && S.sv.length < 4) && !(k === 'study' && !Object.keys(RESEARCH).some((r) => !researched(r)))); S.goals.day = dk; S.goals.daily = seededPick(pool, 3, dk + (S.townName || '')).map((id) => makeGoal(GOALS_DAILY, id)); }
  if (S.goals.week !== wk) { const pool = Object.keys(GOALS_WEEKLY).filter((k) => !(k === 'rank' && !rankConds())); S.goals.week = wk; S.goals.weekly = seededPick(pool, 1, wk + (S.townName || '')).map((id) => makeGoal(GOALS_WEEKLY, id)); }
  for (const [list, set, tag] of [[S.goals.daily, GOALS_DAILY, 'Daily'], [S.goals.weekly, GOALS_WEEKLY, 'Weekly']]) for (const g of list || []) {
    if (g.done) continue; const d = set[g.id]; if (!d) continue; if (d.now() - g.start >= g.n) { g.done = true; SFX('coin');
      note('important', `✔ ${tag} goal: ${d.name}`, { key: 'goal' + tag + g.id, icon: d.icon, log: `${d.desc(g.n)}: done! Claim the reward from the alert or the Goals screen.`, live: () => !g.claimed, acts: [{ label: () => 'Claim ' + rewardText(d.reward), ok: () => !g.claimed, fn: () => claimGoal(g, set) }] }); }
  }
}
const rewardText = (r) => Object.entries(r).map(([k, v]) => ({ mat: '⚙', food: '🍖', water: '💧', wood: '🪵', stone: '🪨', cloth: '🧵', meds: '💊' }[k] || k) + v).join(' ');
function claimGoal(g, set) { if (!g || !g.done || g.claimed) return false; g.claimed = true; const r = set[g.id].reward; for (const [k, v] of Object.entries(r)) { S[k] = (S[k] || 0) + v; if (['food', 'water', 'mat'].includes(k)) flow(k, 'Goal reward', v); } SFX('reward'); say(`Reward: ${rewardText(r)}`); return true; }
function goalProgress(g, set) { const d = set[g.id]; return Math.max(0, Math.min(g.n, d.now() - g.start)); }
function goalsHtml() {
  goalsTick(); const G = S.goals || {}; const row = (g, set) => { const d = set[g.id]; if (!d) return ''; const p = goalProgress(g, set);
    return `<div style="margin:3px 0;opacity:${g.claimed ? .55 : 1}">${g.claimed ? '✔' : d.icon} <b>${d.name}</b> — ${d.desc(g.n)} <span class="sm">${g.done ? '' : Math.floor(p) + '/' + g.n}</span>${g.done && !g.claimed ? ` <button class="act" data-claim="${set === GOALS_DAILY ? 'd' : 'w'}:${g.id}">Claim ${rewardText(d.reward)}</button>` : g.claimed ? ' <span class="sm">claimed</span>' : ` <span class="sm">${rewardText(d.reward)}</span>`}</div>`; };
  const left = () => { const n = new Date(), m = new Date(n); m.setHours(24, 0, 0, 0); const h = Math.floor((m - n) / 36e5), mi = Math.floor((m - n) / 6e4) % 60; return h + 'h ' + mi + 'm'; };
  return `<div class="card"><b>📅 Today</b> <span class="sm">new goals in ${left()}</span>${(G.daily || []).map((g) => row(g, GOALS_DAILY)).join('')}</div><div class="card"><b>🗓 This week</b> <span class="sm">resets Monday</span>${(G.weekly || []).map((g) => row(g, GOALS_WEEKLY)).join('')}</div>`;
}
function endOfDay() {            // rations: every survivor eats half food, half water; a shortfall makes them hungry and thirsty (gentle, no damage yet)
  const up = payUpkeep();
  for (const b of world.buildings) if (b.rushes) b.rushes--; petDaily(); exDaily(); kennelDaily(); vehDaily(); crisisDaily(); cityDaily(); allyDaily(); hybDaily(); bondsDaily(); try { legacyCheck(); } catch (e) { /* never block the day */ }
  for (const q of S.sv) if (hasT(q, 'scrounger') && q.hp > 0 && q.mode !== 'down' && rnd() < .5) { S.mat += 1; flow('mat', 'Scrounged (trait)', 1); note('routine', `${q.name} scrounged some scrap.`, { at: q.w, float: '🔍 +1 PART', col: '#9fe0ff' }); }   /* V2.43 */
  if (!S.wk) weekStart(); if (S.day > 1 && (S.day - 1) % 7 === 0) havenReview();
  let nf = 0, nw = 0; for (const q of S.sv) { nf += ration(q) / 2; nw += ration(q) / 2; } for (const k of S.kids || []) { nf += .25; nw += .25; }   /* children eat half a ration */
  const ef = Math.min(S.food, nf), ew = Math.min(S.water, nw); S.food -= ef; S.water -= ew; flow('food', 'Rations', -ef); flow('water', 'Rations', -ew);
  const ff = nf ? ef / nf : 1, fw = nw ? ew / nw : 1; hardshipCheck();
  for (const q of S.sv) { q.hunger = ff < 1 ? Math.min(100, q.hunger + 28 * (1 - ff)) : Math.max(0, q.hunger - 35); q.thirst = fw < 1 ? Math.min(100, q.thirst + 28 * (1 - fw)) : Math.max(0, q.thirst - 35); } /* a full ration relieves the meters; a shortfall raises them */
  const open = world.buildings.filter((b) => DEFS[b.type].slot && !b.staff).map((b) => DEFS[b.type].name);
  const f1 = (n) => (Math.round(n * 10) / 10).toFixed(1);
  note('routine', `Day ${S.day - 1} · Food +${f1(dayLog.foodIn)} −${f1(ef)} · Water +${f1(dayLog.waterIn)} −${f1(ew)} · Upkeep −${f1(up.paid)} scrap${up.unpaid ? ` (${up.unpaid} unpaid)` : ''}` + (open.length ? ` · Open staff slot: ${[...new Set(open)].join(', ')}` : ''));
  dayLog.foodIn = dayLog.waterIn = 0;
  if (ff < 1) note('critical', 'Out of food: rations were short today', { key: 'nofood', icon: '🍖', live: () => S.food < rationNeed().f, dyn: () => `Out of food · ${S.food.toFixed(1)} of ${rationNeed().f.toFixed(1)} needed per day`, acts: [{ label: 'Why?', fn: () => showResource('food') }] }); else if (S.food < nf) note('important', '⚠ FOOD: under 1 day left');
  if (fw < 1) note('critical', 'Out of water: rations were short today', { key: 'nowater', icon: '💧', live: () => S.water < rationNeed().w, dyn: () => `Out of water · ${S.water.toFixed(1)} of ${rationNeed().w.toFixed(1)} needed per day`, acts: [{ label: 'Why?', fn: () => showResource('water') }] }); else if (S.water < nw) note('important', '⚠ WATER: under 1 day left');
}
function releasePost(b) { if (b.staff) { if (b.staff.post === b) b.staff.post = null; b.staff = null; } }
function showResidents(b) {   /* 3D.30: choose who lives in this housing */
  const d = DEFS[b.type]; b.res = b.res || []; closeP(); selected = { kind: 'building', ref: b };
  const L = S.sv.slice().sort((x, y) => (b.res.includes(y.id) - b.res.includes(x.id)) || (!!housingOf(x) - !!housingOf(y)) || (y.daysHere || 0) - (x.daysHere || 0));
  $('ib').innerHTML = `<div class="sm" style="margin-bottom:6px">${d.name}: ${b.res.length}/${cap(b)} beds used. Tap to move someone in or out.</div><div class="lst">` + L.map((q) => { const here = b.res.includes(q.id), oh = housingOf(q) || homeOf(q), where = here ? 'Lives here' : oh ? `Lives at the ${DEFS[oh.type].name}` : 'Sleeps at the Camp';
    return `<div class="card row${here ? ' fit' : ''}" data-rs="${q.id}" style="cursor:pointer;gap:8px">${portrait(q)}<div class="sp"><b>${esc(q.name)}</b> <span class="sm">${q.job} Lv.${q.l}</span>${!oh ? '<span class="fitTag" style="background:#FF7A59;color:#fff">No housing</span>' : ''}<div class="sm">${where}</div></div><b>${here ? '✔' : '+'}</b></div>`; }).join('') + `</div><button class="act" id="rsBack" style="width:100%;margin-top:6px">Done</button>`;
  showPanel('WHO LIVES HERE');
  $('ib').querySelectorAll('[data-rs]').forEach((el) => { el.onclick = () => { const id = +el.dataset.rs; if (b.res.includes(id)) b.res = b.res.filter((x) => x !== id); else if (b.res.length < cap(b)) { for (const o of world.buildings) if (isHousing(o) && o.res) o.res = o.res.filter((x) => x !== id); b.res.push(id); } else { say(`${d.name} is full: move someone out first`); return; } saveGame(); showResidents(b); }; });
  $('rsBack').onclick = () => showBuildingInfo(b);
}
function showAssign(b) {   /* V3D.13: pick who works at a building (matching professions first; others work there without the bonus) */
  const d = DEFS[b.type], jobs = STAFF_JOBS[d.fam] || [], can = S.sv.filter((q) => q.hp > 0 && q.mode !== 'away');
  const rank = (q) => (jobs.includes(q.job) ? 2 : q.job === 'Civilian' ? 1 : 0); can.sort((x, y) => (rank(y) - rank(x)) || (y.l - x.l));
  const row = (q) => { const m = jobs.includes(q.job), where = q.post && q.post !== b ? `works at the ${DEFS[q.post.type].name}` : q.post === b ? 'works here now' : 'free';
    return `<div class="card row${m ? ' fit' : ''}" data-as="${q.id}" style="cursor:pointer;gap:8px${m ? '' : ';opacity:.75'}">${portrait(q)}<div class="sp"><b>${esc(q.name)}</b> <span class="sm">${q.job} Lv.${q.l}</span>${m ? '<span class="fitTag">Best fit</span>' : ''}<div class="sm">${m ? '★ +' + Math.round(workBoost(q) * 100) + '% here' : q.job === 'Civilian' ? '+25% here (helping hands)' : '−25% here (wrong job)'} · ${where}</div></div><span style="color:var(--gold)">›</span></div>`; };
  $('ib').innerHTML = `<div class="sm" style="margin-bottom:6px">Who works at the ${d.name}? ${jobs.length ? `${jobs.join(' / ')} get a bonus; a Civilian helps a little; anyone else slows it down.` : ''}</div><div class="lst">${can.map(row).join('')}<div class="card" data-as="none" style="cursor:pointer;text-align:center">Nobody</div></div>`;
  showPanel('Assign worker'); $('pBack').style.display = 'block'; panelBack = () => showBuildingInfo(b);
  $('ib').querySelectorAll('[data-as]').forEach((el) => { el.onclick = () => {
    if (el.dataset.as === 'none') { releasePost(b); b.noStaff = true; b.manual = false; say(`Nobody works at the ${d.name} now.`, true); }
    else { const q = S.sv.find((x) => x.id === +el.dataset.as); if (!q) return; if (q.post && q.post !== b) releasePost(q.post); releasePost(b); b.staff = q; q.post = b; b.manual = true; b.noStaff = false; if (q.mode === 'work') { q.mode = 'free'; q.stateTicks = 0; } say(`${q.name} now works at the ${d.name}.`, true); }
    autoStaff(); saveGame(); showBuildingInfo(b); }; });
}
function autoStaff() {           // one slot per building; a matching profession is assigned automatically, the best level first
  for (const q of S.sv) if (q.post && (!world.buildings.includes(q.post) || q.post.staff !== q)) q.post = null;
  for (const b of world.buildings) {
    const d = DEFS[b.type]; if (!d || !d.slot) continue; if (b.burnt) { releasePost(b); continue; } const jobs = STAFF_JOBS[d.fam] || [];
    if (b.staff && (!S.sv.includes(b.staff) || (!jobs.includes(b.staff.job) && !b.manual && !(b.staff.job === 'Civilian' && !S.sv.some((q) => !q.post && jobs.includes(q.job) && q.hp > 0))))) releasePost(b);   /* a Civilian stands in until a matching worker is free */
    if (b.noStaff) continue;   /* V3D.13: the player chose 'nobody' */
    if (b.staff) continue;
    const c = S.sv.filter((q) => !q.post && q.hp > 0 && !['down', 'hospital'].includes(q.mode) && jobs.includes(q.job)).sort((x, y) => (y.l - x.l) || (dist(x.w, Wd.doorPoint(b)) - dist(y.w, Wd.doorPoint(b))));
    if (c.length) { b.staff = c[0]; c[0].post = b; note('routine', `${c[0].name} will staff the ${d.name}.`); }
    else { const cv = S.sv.filter((q) => !q.post && q.hp > 0 && !['down', 'hospital', 'away'].includes(q.mode) && q.job === 'Civilian').sort((x, y) => dist(x.w, Wd.doorPoint(b)) - dist(y.w, Wd.doorPoint(b)))[0]; if (cv && FAMRES(d.fam)) { b.staff = cv; cv.post = b; note('routine', `${cv.name} lends a hand at the ${d.name}.`); } }   /* 3D.67: Civilians fill gaps (+25%) */
  }
}
function upgradeCheck(b) {   /* V3D.23: an upgrade is a construction job on the building; it keeps working meanwhile */
  const d = DEFS[b.type], n = d.next && DEFS[d.next]; if (!n) return { ok: false, why: 'Already the top tier' };
  if (b.upg) return { ok: false, why: 'Upgrade under way' }; if (b.burnt) return { ok: false, why: 'Repair it first' };
  if (n.role !== 'hq' && n.tier > hqTier()) return { ok: false, why: `Needs the ${hqName(n.tier)} (upgrade your ${DEFS[hqB() ? hqB().type : 'hq'].name})` };
  if (S.rank < (n.rank || 1)) return { ok: false, why: `Needs Haven level ${lvlOfRank(n.rank)}` };
  return { ok: true, why: '' };
}
const hqName = (t) => DEFS[['hq', 'hq', 'hq2', 'hq3'][t] || 'hq3'].name;
const grows = (b, n) => n.w * n.h !== b.w * b.h;   /* 3D.41: the next tier has a bigger (or different) footprint */
function upgradeBuilding(b, place) {
  const c = upgradeCheck(b); if (!c.ok) { say(c.why); return false; }
  const n = DEFS[DEFS[b.type].next];
  if (!place && grows(b, n)) { closeP(); startTool({ kind: 'building', type: n.key, rot: b.rot | 0, upgFrom: b }); updatePreview(b.x, b.y); say(`The ${n.name} is ${n.w}×${n.h}: place it (turn it with ↻), then Build.`, true); return false; }
  b.upg = newJob({ to: n.key, place: place || null }, bCost(n)); SFX('build');
  say(`${DEFS[b.type].name} → ${n.name}: ` + (canPay(bCost(n)) ? 'builders are bringing the materials.' : `still missing ${missText(bCost(n))}; survivors will gather it.`), true); saveGame(); ui(); return true;
}
function cancelUpgrade(b) { const u = b.upg; if (!u) return; for (const [k, v] of Object.entries(u.got || {})) S[k] = (S[k] || 0) + v; b.upg = null; say('Upgrade cancelled: delivered materials went back to the stockpile.'); ui(); saveGame(); }
function queueResidentRequest(s) { S.requests.push({ type: 'resident', s }); showNextRequest(); }
function showNextRequest() {
  const box = $('requestBox'); if (!box || box.innerHTML || !S.requests.length) return; const q = S.requests[0], s = q.s;
  box.innerHTML = `<div class="request frame"><b class="out">🏠 Move-in request</b><br>${s.name} wants to make the Haven home. <span style="color:#ff9ab0">♥${Math.floor(s.sat)}</span><br><button class="act go out" id="acceptReq">Accept</button><button class="act danger out" id="declineReq">Not yet</button></div>`;
  $('acceptReq').onclick = () => { s.resident = true; renownGain(4, 'New resident'); say(s.name + ' became a resident!', true); S.requests.shift(); box.innerHTML = ''; showNextRequest(); ui(); };
  $('declineReq').onclick = () => { s.requested = false; s.sat = Math.max(20, s.sat - 5); S.requests.shift(); box.innerHTML = ''; showNextRequest(); ui(); };
}
const ARRIVE = { low: 8000, high: 14000 };   /* 3D.72: growth is the goal, and the rank limit keeps the town from filling too fast */    /* V3D.21 ticks between newcomers at the gate (1000 ticks = 1 game hour): every 12 h below 60% of the room, every 24 h above (was 1.1 h / 2.2 h: the town filled in 2 days) */
function visitorArrival() {
  if (S.finale) return;   /* V2.46: nobody travels during the final stand */ S.arrivalClock++; if (S.food < 1 || S.water < 1) return; if (((window.ZH_BAL || {}).gateWait ?? 1) && S.z.some((z) => z.hp > 0 && !z.human && Wd.inTown(Math.floor(z.w.x), Math.floor(z.w.y)))) return;   /* spiral fix: newcomers wait outside while zombies are in the town */   /* 3D.71: nobody moves to a starving town */ if (S.arrivalClock < (popNow() < popCap() * .6 ? ARRIVE.low : ARRIVE.high) / (1 + .25 * townAppeal()) / (anyPowered('radio') ? 1.3 : 1) / (ST().arrive && S.day <= 7 ? ST().arrive : 1) || popNow() >= popCap() - waitingCouples()) return;   /* leave room for couples to start a family */ S.arrivalClock = 0;
  const names = ['Noah', 'Maya', 'Eli', 'June', 'Rosa', 'Theo'], jobs = ['Civilian', 'Scavenger', 'Guard', 'Medic', 'Farmer', 'Engineer', 'Cook', ...(hqTier() >= 2 ? ['Mechanic'] : [])];
  const name = names.find((n) => !S.sv.some((s) => s.name === n)) || freeFirst(), job = jobs[Math.floor(rnd() * jobs.length)], lv = Math.max(1, Math.min(6, S.rank - 1 + Math.floor(rnd() * 2))), v = mk(name, job, lv, 7 + OFF, 6 + OFF, S.sv.length); clearSpot(v);   /* V2.18: newcomers to a bigger Haven are more experienced */
  v.sat = 3; v.stateTicks = 80; v.src = 'gate';  S.sv.push(v);
  /* V3D.15: they walk in and wave; the player decides whether they stay (no party until then) */
    showEventPopup({ stage: { scene: 'newcomer', head: 'Someone at the gate', hero: v }, short: `${fullName(v)} wants to join`, chips: [job + ' Lv.' + lv].concat(TRAITS[v.trait] ? [TRAITS[v.trait].icon + ' ' + TRAITS[v.trait].name] : []), title: 'NEWCOMER',
      buttons: [{ label: 'Welcome', fn: () => { say(name + ' joined the Haven!', true); if (!bark(v, 'newcomer', {}, { pri: 2 })) emote(v, '😊', 120, true); barkSomeone('welcome', { other: name }, { pri: 2 }, v.w, v); logEvent(`${name} (${job} Lv.${lv}) joined the Haven.`, 'important'); ui(); } },
        { label: 'Turn away', fn: () => { S.sv = S.sv.filter((q) => q !== v); logEvent(`${name} was turned away at the gate.`, 'routine'); say(name + ' walks off.', true); ui(); } }] });
    ui(); return;
}
/* ---------------- V2.19 guided goals (one system at a time, then random missions) + event log ---------------- */
const GUIDE = [
  { name: 'Grow Food', desc: 'Build a Garden Plot', hint: 'Build → Garden Plot. Every survivor eats a daily ration of food and water. A Farmer staffs it automatically (green dot) and makes it produce more.', done: () => bOf('farm').length + bOf('field').length > 0, parts: 3, ren: 4 },
  { name: 'A Second Garden', desc: 'Build a second Garden Plot', hint: 'One garden rarely feeds a growing camp. A second Garden Plot (and a Farmer to work it) keeps food ahead of new mouths. New gardens grow half as much again for the first 10 days.', done: () => bOf('farm').length + bOf('field').length >= 2, parts: 3, ren: 4 },   /* 3D.104 early food help; 3D.110 its renown was missing (turned Renown into NaN) */
  { name: 'A Place to Rest', desc: 'Build a Tent', hint: 'Tired survivors sleep in Tents (2 beds each). Without a free bed they sleep rough and rest badly. Upgrade a Tent to a Cabin (after the Lodge) for more beds.', done: () => bOf('inn').length >= 1, parts: 3, ren: 4 },
  { name: 'Scrap Economy', desc: 'Build a Scrapyard', hint: 'Every building costs a little upkeep in scrap each day (a building that can\'t be paid runs at half output). A Scrapyard staffed by a Scavenger makes scrap. Kills, missions and expeditions also bring scrap.', done: () => bOf('scrapyard').length > 0, parts: 4, ren: 5 },
  { name: 'Grow the Camp', desc: 'Upgrade the Camp to a Lodge', hint: 'Tap your Camp → Upgrade. It needs wood and scrap: idle survivors chop trees and salvage wrecks on their own, and builders carry everything over. The Lodge unlocks Timber buildings and more land.', done: () => hqTier() >= 2, parts: 4, ren: 6 },
  { name: 'Gear Up', desc: 'Get a survivor some armor', hint: 'Build an Armory: survivors buy basic gear there on their own when you have spare scrap. Or tap a survivor → Equipment → Change to pick from the stash.', done: () => S.sv.some((q) => q.eq && q.eq.armor), parts: 4, ren: 5 },
  { name: 'Train Up', desc: 'Build a Gym, Library or Lounge', hint: 'Survivors train in their free time: 100% training = +1 permanent stat. Strength helps fighters and farmers, Intelligence helps medics and research, Charisma helps happiness and trading.', done: () => ['gym', 'library', 'lounge', 'range', 'track', 'sparring'].some((t) => bOf(t).length), parts: 4, ren: 5 },
  { name: 'Research', desc: 'Complete a research project', hint: 'Build a Workbench and tap it. An Engineer working there makes research points faster. Research unlocks gear recipes and town upgrades.', done: () => Object.keys(S.res || {}).length >= 1, parts: 5, ren: 6 },
  { name: 'Hold the Line', desc: 'Build 10 wall segments', hint: 'Build → Wood Fence or Gate, then tap tiles in the glowing ring around the town. Most zombies come from the north. A broken segment turns to rubble and is repaired automatically with scrap.', done: () => world.walls.size >= 10, parts: 5, ren: 6 },
  { name: 'Go Out There', desc: 'Send an expedition', hint: 'EXPEDITION → pick a place, a risk level and a squad. Trips run in real time, even while the game is closed, and bring back supplies, scrap and sometimes gear or new survivors.', done: () => !!S.trip || (S.expCount || 0) > 0, parts: 5, ren: 6 },
  { name: 'More Land', desc: 'Expand the territory', hint: 'Town → Expand territory (needs Renown, wood and scrap; a bigger HQ lets you claim more). More land to build on — and more zombies, from more directions.', done: () => (S.terr || 0) >= 1, parts: 6, ren: 8 },
];
const guideActive = () => { if (!S.guideV41) { S.guideV41 = 1; if ((S.guide || 0) > 2) S.guide--; } return S.stage >= 2 && (S.guide || 0) < GUIDE.length; };   /* 3D.41: 'Make It Home' (move-in) goal removed; old saves past it shift back one */
function guideIntro() { const g = GUIDE[S.guide]; if (g) showEventPopup({ title: 'NEXT GOAL · ' + g.name.toUpperCase(), text: g.hint, gains: g.desc + ` · reward +${g.parts} scrap, +${g.parts * 2} wood, +${g.ren} Renown` }); }
function guideProgress() {
  const g = GUIDE[S.guide || 0]; if (!g || !g.done()) return;
  S.mat += g.parts; S.wood = Math.min(matCap(), (S.wood || 0) + g.parts * 2); renownGain(g.ren, g.name); SFX('reward'); banner('✔ GOAL COMPLETE · ' + g.name.toUpperCase()); questFlash(); say(`Goal complete: ${g.name} (+${g.parts} scrap).`, true);
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
  return { reqs: [{ label: `${d.name}: ${costShort(bCost(d))}`, ok: canPay(bCost(d)), detail: canPay(bCost(d)) ? `you have 🪵 ${Math.floor(S.wood || 0)}  ⚙ ${Math.floor(S.mat)}` : `missing ${missText(bCost(d))}: chop trees for wood; wrecks, missions and kills bring scrap` }, ...(lock ? [{ label: 'Unlocked', ok: false, detail: lock }] : []), ...(lock || sp ? [] : [{ label: 'Free space', ok: false, detail: 'no free spot fits it: demolish or move something' }])],
    spots: sp ? [{ x: sp.sx + .5, y: sp.sy + .5, label: 'free spot' }] : [], act: lock ? null : { label: `Build ${d.name}`, fn: () => { closeP(); startTool({ kind: 'building', type }); if (sp) { updatePreview(sp.x, sp.y); centerOn(sp.sx + .5, sp.sy + .5); } } }, ...extra }; };
const zSpots = (f) => S.z.filter((z) => z.hp > 0 && f(z)).slice(0, 6).map((z) => ({ x: z.w.x, y: z.w.y, label: z.human ? 'raider' : 'zombie', live: z }));
const bSpots = (types) => world.buildings.filter((b) => types.includes(b.type)).map((b) => ({ x: b.x + b.w / 2, y: b.y + b.h / 2, label: DEFS[b.type].name }));
const OBJ_GUIDE = {
  'Grow Food': buildObj('farm'), 'A Place to Rest': buildObj('house'),
  'Make It Home': () => { const happy = S.sv.filter((q) => !q.resident && (q.sat || 0) >= 35); return { reqs: [{ label: 'A happy survivor (♥ 35+)', ok: happy.length > 0, detail: happy.length ? happy.map((q) => q.name).join(', ') : 'meals, rest, friends and fun raise ♥' }, { label: 'A free home', ok: popNow() < popCap(), detail: `${popNow()}/${popCap()} beds` }],
    spots: happy.map((q) => ({ x: q.w.x, y: q.w.y, label: q.name, live: q })), act: S.requests.length ? { label: 'See the request', fn: () => { closeP(); showNextRequest(); } } : null }; },
  'Scrap Economy': buildObj('scrapyard'),
  'Gear Up': () => bOf('armory').length ? { reqs: [{ label: 'Spare scrap for gear', ok: S.mat >= 4, detail: `${Math.floor(S.mat)} scrap` }], spots: bSpots(['armory']), act: { label: 'Open People', fn: () => { closeP(); showSurvivors(); } } } : buildObj('armory')(),
  'Train Up': () => ({ reqs: [{ label: 'Any one of: Gym, Library or Lounge', ok: ['gym', 'library', 'lounge'].some((t) => canPay(bCost(DEFS[t]))), detail: 'You only need one. Each trains a different stat: Gym = Strength, Library = Intelligence, Lounge = Charisma.' }], spots: [], act: { label: 'Pick one to build', fn: () => { bCat = 'train'; showBuild(); } } }),   /* 3D.30: any one counts */
  'Research': () => { const ws = bOf('workshop')[0]; return ws ? { reqs: [{ label: 'Research points', ok: (S.rp || 0) >= Math.min(...Object.values(RESEARCH).map((r) => r.rp)), detail: `${Math.floor(S.rp || 0)} RP: the workshop makes more` }], spots: bSpots(['workshop']), act: { label: 'Open the Workshop', fn: () => showBuildingInfo(ws, 'research') } } : buildObj('workshop')(); },
  'Hold the Line': () => { const wd = Wd.WALL_DEFS.wood; return { reqs: [{ label: `Walls: ${world.walls.size}/10`, ok: world.walls.size >= 10 }, { label: `Wood Fence: ${costShort(bCost(wd))} each`, ok: canPay(bCost(wd)), detail: `you have 🪵 ${Math.floor(S.wood || 0)}` }], spots: [], act: { label: 'Place walls', fn: () => { closeP(); startTool({ kind: 'wall', wtype: 'wood' }); } } }; },
  'Go Out There': () => ({ reqs: [{ label: 'A free squad member', ok: S.sv.some((q) => q.hp > q.max * .5 && !['down', 'away', 'errand', 'hospital'].includes(q.mode)) }], spots: [], act: { label: 'Open Explore', fn: () => { closeP(); showExpedition(); } } }),
  'More Land': () => { const e = expandInfo(); return { reqs: e ? [{ label: `Renown ${e.n.ren}`, ok: S.ren >= e.n.ren, detail: `you have ${Math.floor(S.ren)}` }, { label: costShort(bCost(e.n)), ok: canPay(bCost(e.n)), detail: `you have 🪵 ${Math.floor(S.wood || 0)}  ⚙ ${Math.floor(S.mat)}` }] : [], spots: [], act: { label: 'Open Town', fn: () => { closeP(); showTown(); } } }; },
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
  seal: () => { const gaps = findGaps(), wd = Wd.WALL_DEFS.wood; return { reqs: [{ label: gaps.length ? `${gaps.length} gap${gaps.length > 1 ? 's' : ''} found` : 'No gaps left', ok: !gaps.length, detail: gaps.some((g) => g.label === 'gate') ? 'a road needs a Gate, not a wall' : 'zombies walk in through them' }, { label: `Wood for ${gaps.length} wall${gaps.length === 1 ? '' : 's'}`, ok: (S.wood || 0) >= gaps.length * wd.wood, detail: `about 🪵 ${gaps.length * wd.wood}, you have ${Math.floor(S.wood || 0)}` }],
    spots: gaps, act: { label: gaps.some((g) => g.label === 'gate') ? 'Place walls / gates' : 'Place walls', fn: () => { closeP(); startTool({ kind: 'wall', wtype: 'wood' }); showObjMarks(gaps); } } }; },
};
function currentObjective() {
  if (S.stage === 0) return { name: 'Water First', desc: 'Build a Rain Barrel', how: 'Every survivor drinks a daily ration. A Rain Barrel makes water; staffed, it makes more. Upgrade it later to a Rain Collector and a Stone Well.', prog: [0, 1], reward: '', ...buildObj('barrel')() };
  if (S.stage === 1) return { name: 'First Blood', desc: 'Defeat 3 Walkers', how: 'Your fighters attack zombies that come close. Watch them work, or tap a survivor to see what they are doing.', prog: [Math.min(S.kills, 3), 3], reward: '+10 Renown', reqs: [], spots: zSpots((z) => !z.human), act: null };
  if (guideActive()) { const g = GUIDE[S.guide], f = OBJ_GUIDE[g.name]; return { name: g.name, desc: g.desc, how: g.hint, prog: [0, 1], reward: `+${g.parts} scrap, +${g.parts * 2} wood, +${g.ren} Renown`, reqs: [], spots: [], act: null, ...(f ? f() : {}) }; }
  if (S.mission) { const m = S.mission, f = OBJ_MISSION[m.id], o = f ? f() : {}; return { name: m.name, desc: m.desc, how: o.tip || '', prog: [Math.floor(m.progress), m.goal], reward: `+${m.rewardParts} scrap, +${m.rewardParts} wood, +${m.rewardRen} Renown`, reqs: [], spots: [], act: null, ...o }; }
  return null;
}
function showObjMarks(spots) { objMarks = { spots, until: performance.now() + 12000 }; }
/* ---------------- V2.35 resource panel: tap food / water / scrap in the top-left plaque ---------------- */
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
  $('ib').innerHTML = tabBar([['food', 'Food'], ['water', 'Water'], ['wood', 'Wood'], ['stone', 'Stone'], ['mat', 'Scrap']], rTab)
    + `<div class="card"><div class="kv"><div><span>In stock</span><span><b>${Math.floor(e.stock)}</b>${e.cap ? ' / ' + e.cap : ''}</span></div><div><span>Produced / day</span><span style="color:var(--good)">${sgn(e.prod)}</span></div><div><span>Used / day</span><span style="color:#ffb36b">−${f1(e.use)}</span></div><div><span><b>Net / day</b></span><span style="color:${e.net >= 0 ? 'var(--good)' : 'var(--bad)'}"><b>${sgn(e.net)}</b></span></div></div>`
    + (e.cap ? `<div style="height:8px;background:#1d242b;border-radius:4px;margin:5px 0;position:relative"><i style="position:absolute;left:0;top:0;bottom:0;width:${Math.min(100, 100 * e.stock / e.cap)}%;background:${e.full ? 'var(--gold)' : '#6fb3e0'};border-radius:4px"></i></div>` : '')
    + `<div style="color:${fc.c}">${fc.t}</div>` + (rTab === 'wood' || rTab === 'stone' ? `<div class="card row gTog" style="gap:10px;align-items:center"><span class="sp"><b>${rTab === 'wood' ? 'Chop trees' : 'Break rocks'}</b><div class="sm">${S.gatherPause && S.gatherPause[rTab] ? `Paused: nobody ${rTab === 'wood' ? 'chops trees' : 'breaks rocks'} (a Lumber Camp or Quarry keeps working)` : `Idle survivors ${rTab === 'wood' ? 'chop trees' : 'break rocks'} when the town needs ${rTab}`}</div></span><button class="tgl${S.gatherPause && S.gatherPause[rTab] ? '' : ' on'}" id="gPause" role="switch" aria-label="${rTab === 'wood' ? 'Chop trees' : 'Break rocks'}"></button></div>` : '') + (rTab === 'mat' ? '<div class="sm">Scrap also comes from zombie kills, missions and expeditions, and goes to repairs, gear and building. Those swing day to day, so they are in "Last 24 h" below, not in the daily rate.</div>' : rTab === 'stone' ? '<div class="sm">Stone comes from rock outcrops around the town (survivors break them with a pick) and from a staffed Quarry. Rocks you tap get mined first. Broken rocks come back after about 4 days. Stone builds the stone tier (Fort, Stone House, Stone Well…).</div>' : rTab === 'wood' ? '<div class="sm">Wood comes from chopping trees: idle survivors chop on their own in the daytime, and you can tap a tree to mark it (marked trees go first, even far ones). Chopped trees leave a stump that grows back in about 3 days. Storage holds more.</div>' : '') + '</div>'
    + (e.issues.length ? `<div class="card" style="border-color:#c0574a"><b style="color:var(--bad)">Problems</b>${e.issues.map((i) => `<div class="row" data-b="${world.buildings.indexOf(i.b)}" style="gap:6px"><span class="sp">⚠ ${esc(i.t)}</span><span style="color:var(--gold)">›</span></div>`).join('')}</div>` : '')
    + `<div class="card"><b>Producers</b>${e.producers.length ? e.producers.map((q) => row(q, 1)).join('') : `<div class="sm">None yet: ${rTab === 'food' ? 'build a Garden Plot' : rTab === 'water' ? 'build a Rain Barrel' : rTab === 'wood' ? 'idle survivors chop trees; a Lumber Camp chops all day' : rTab === 'stone' ? 'idle survivors break rocks; a Quarry digs all day' : 'build a Scrapyard'}.</div>`}</div>`
    + `<div class="card"><b>Users</b>${e.consumers.length ? grp(e.consumers).map((q) => row(q, -1)).join('') : '<div class="sm">Nothing uses it every day.</div>'}</div>`
    + `<div class="card"><b>Last ${L.hours || 0} h (what really happened)</b>${last.length ? last.map(([n, v]) => `<div class="row"><span class="sp">${esc(n)}</span><span style="color:${v >= 0 ? 'var(--good)' : '#ffb36b'}">${sgn(v)}</span></div>`).join('') : '<div class="sm">Nothing recorded yet: this fills in hour by hour.</div>'}</div>`
    + `<div class="sm">Rates are per game day and use each worker's measured share of the day on the job.</div>`;
  showPanel();
  $('ib').querySelectorAll('[data-tab]').forEach((b) => { b.onclick = () => showResource(b.dataset.tab); });
  { const gp = $('gPause'); if (gp) gp.onclick = () => { const r = rTab; S.gatherPause = S.gatherPause || {}; S.gatherPause[r] = !S.gatherPause[r]; if (S.gatherPause[r]) for (const q of S.sv) if (q.gatherAt && q.gatherK && NODE[q.gatherK] && NODE[q.gatherK].res === r && !q.carriedLoot) { q.gatherAt = null; enterFree(q, 10); } say(S.gatherPause[r] ? (r === 'wood' ? 'Chopping paused.' : 'Mining paused.') : (r === 'wood' ? 'Chopping back on.' : 'Mining back on.')); saveGame(); showResource(r); }; }
  $('ib').querySelectorAll('[data-b]').forEach((el) => { const b = world.buildings[+el.dataset.b]; if (b) { el.style.cursor = 'pointer'; el.onclick = () => showBuildingInfo(b); } });
}
/* ---------------- V2.39 Town Advisor: one line under the objective with the most urgent strategic issue (emergencies stay in the red alerts) ---------------- */
let advShown = null;
function advisorTips() {
  const T = [], E = econ(), add = (key, pri, icon, text, act) => T.push({ key, pri, icon, text, act });
  for (const k of ['food', 'water']) { const e = E[k]; if (e.net < -1e-6 && e.days < 3) add('short' + k, 90 - e.days * 10, k === 'food' ? '🍖' : '💧', `${RES_TITLE[k]} runs out in about ${e.days < 1 ? Math.max(1, Math.round(e.days * 24)) + ' h' : e.days.toFixed(1) + ' days'}`, () => showResource(k)); }
  { const full = world.buildings.filter((b) => TAP_COLLECT && b.trayFull && (b.bonus || 0) >= 1); if (full.length) add('tray', 75, '👆', full.length === 1 ? `${DEFS[full[0].type].name} is full: tap its bubble to collect` : `${full.length} buildings are full: tap their bubbles to collect`, () => { const b = full[0]; closeP(); centerOn(b.x + b.w / 2, b.y + b.h / 2); }); }   /* 3D.30 */
  const up = upkeepTotal(); if (S.mat + (S.wood || 0) < up) add('upkeep', 70, '⚙', `Not enough wood and scrap for tonight's upkeep (${f1(up)})`, () => showResource('mat'));
  for (const b of world.buildings) { const d = DEFS[b.type]; if (!d.slot || b.staff || !FAMRES(d.fam)) continue; const free = S.sv.find((q) => (STAFF_JOBS[d.fam] || []).includes(q.job) && !q.post && q.hp > 0); add('staff' + b.x + ',' + b.y, 60, '👷', free ? `${d.name} has no worker: ${free.name} could take it` : `${d.name} has no ${(STAFF_JOBS[d.fam] || []).join(' or ')}: change someone's profession`, () => showBuildingInfo(b)); }
  if (S.rankReady || (rankConds() && rankConds().every((r) => r.ok))) add('rank', 85, '⭐', 'The Haven can reach the next level', () => showUpgrade('rank'));
  if (world.walls.size >= 8 && !Wd.perimeter(world).sealed) { const g = findGaps(4).length; if (g) add('gaps', 45, '🧱', `Your wall ring has ${g} gap${g > 1 ? 's' : ''}`, () => { closeP(); startTool({ kind: 'wall', wtype: 'wood' }); showObjMarks(findGaps()); }); }
  { const n = unhoused().length, c = campCap(), eb = world.buildings.filter((b) => isHousing(b) && !b.burnt && (b.res || []).length < cap(b));   /* 3D.30 housing */
    if (n && eb.length) add('emptyBeds', 55, '🛏', `${eb.reduce((a, b) => a + cap(b) - (b.res || []).length, 0)} empty bed${eb.length > 1 || cap(eb[0]) - (eb[0].res || []).length > 1 ? 's' : ''}: choose who moves in`, () => showResidents(eb[0]));
    else if (c && n > c) add('campFull', 65, '⛺', `Camp is over capacity: ${n}/${c}. Build housing`, () => { bCat = 'live'; showBuild(); }); }
  const rough = S.sv.filter((q) => q.sleeping === 'rough').length; if (rough >= 2) add('beds', 40, '🛏', `${rough} survivors sleep rough: build a Shelter`, () => { bCat = 'live'; showBuild(); });
  for (const k of ['food', 'water']) if (E[k].full && E[k].net > .2) add('full' + k, 30, '📦', `${RES_TITLE[k]} storage is full: build Storage${S.rank >= 3 ? ' or hold a Trade Caravan' : ''}`, () => showResource(k));
  const q = RANK_REQ[S.rank];
  const ws = bOf('workshop')[0]; if (ws) { const r = Object.entries(RESEARCH).find(([k, x]) => !researched(k) && researched(x.need) && (S.rp || 0) >= x.rp && S.mat >= x.mat); if (r) add('res', 25, '🔬', `Research ready: ${r[1].name}`, () => showBuildingInfo(ws, 'research')); }
  if (S.rank >= 2 && !(S.posts || []).length && S.sv.some((q) => isFighter(q)) && S.mat >= POST_COST) add('post', 22, '🛡️', 'Build a guard post: a fighter on watch draws zombies away from your workers', () => { closeP(); startTool({ kind: 'post' }); });   /* V2.45 */
  if (S.day >= 4 && Date.now() - exportedAt(SLOT - 1) > 7 * 864e5) add('backup', 15, '💾', 'No backup this week: export one (Safari can clear old site data)', () => showBackup());   /* V2.42 */
  const day = S.day, mute = S.advMute || {}; return T.filter((t) => mute[t.key] !== day && (S.stage >= 2 || t.pri >= 70)).sort((a, b) => b.pri - a.pri);   /* during the opening goals only serious issues */
}
function layoutTop() {   // the left menu and the alerts sit just under the plaque, whatever its height
  const pl = $('plaque'), w = $('world'); if (!pl || !w) return; const y = Math.round(pl.getBoundingClientRect().bottom - w.getBoundingClientRect().top + 6);
  for (const id of GLASS ? ['alerts'] : ['lmenu', 'alerts']) { const e = $(id); if (e && e.style.top !== y + 'px') e.style.top = y + 'px'; }   /* 3D.28 Glass: the menu is the bottom tab bar */
  if (GLASS) { const ck = $('clock'), y2 = ck ? Math.round(ck.getBoundingClientRect().bottom - w.getBoundingClientRect().top + 6) : y, g = $('gauge'), h = $('btnHome'), bt = $('bottom'); if (g) g.style.top = y2 + 'px'; if (h) h.style.top = (y2 + 44) + 'px'; if (bt && !HUD_B) bt.style.top = (y2 + 102) + 'px'; }   /* the right column hangs off the clock card, so tips and notifications under the mission card never push it down */
}
function advisorUpdate() {
  if (GLASS) { const e0 = $('adv'); if (e0) e0.style.display = 'none'; alertHub(); return; }
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
  const first = [['Water', 'Build a Rain Barrel', S.stage >= 1], ['First Blood', 'Defeat 3 Walkers', S.stage >= 2]];
  const rows = first.map(([n, d, ok]) => `<div style="opacity:${ok ? .6 : 1}">${ok ? '✔' : '▶'} <b>${n}</b> — ${d}</div>`).join('')
    + GUIDE.map((g, i) => { const done = S.stage >= 2 && i < gi, cur = S.stage >= 2 && i === gi; return `<div style="opacity:${done ? .6 : cur ? 1 : .45};${cur ? 'border:1px solid #ffe38a;border-radius:4px;padding:3px;margin:2px 0' : ''}">${done ? '✔' : cur ? '▶' : '·'} <b>${g.name}</b> — ${g.desc}${cur ? `<br><small>${g.hint}</small><br><small>Reward: +${g.parts} scrap, +${g.parts * 2} wood, +${g.ren} Renown</small>` : ''}</div>`; }).join('');
  legacyCheck(); const lg = `<div class="card" style="margin-top:8px"><b>🏅 Legacy goals</b> <span class="sm">${legacyDone()}/${LEGACY.length} · ${DF().icon} ${DF().name} · ${ST().icon} ${ST().name}</span>${LEGACY.map((g) => { const d = (S.legacy || {})[g.id], [a, b] = g.prog(); return `<div style="opacity:${d ? .6 : 1}">${d ? '✔' : g.icon} <b>${g.name}</b> — ${g.desc} <span class="sm">${d ? 'day ' + d : Math.min(a, b) + '/' + b}</span></div>`; }).join('')}<div class="sm">Each: +15 Renown, +10 scrap.</div></div>
    <div class="card"><b>📻 The Signal</b><div class="sm">${S.won ? `The convoy came on day ${S.won.day}. Score ${S.won.score}. The town is yours to keep building.` : S.finale ? `Final stand under way: night ${S.finale.night} of ${FINALE_NIGHTS}. Hold out until dawn after night ${FINALE_NIGHTS}.` : `Reach ★5 and finish ${LEGACY_NEED} legacy goals, build a Radio Tower with a running Generator, then call for the convoy: ${FINALE_NIGHTS} nights of hordes, then the ending and your score. (★${S.rank}/5 · ${legacyDone()}/${LEGACY_NEED} goals · ${radioOk() ? '📻 radio on air' : world.buildings.some((b) => b.type === 'radio') ? '📻 radio needs power' : '📻 no Radio Tower yet'})`}</div>${signalReady() ? '<button class="act go" id="gSignal" style="width:100%">📻 Call for the convoy</button>' : ''}</div>`;
  $('ib').innerHTML = goalsHtml() + (gi >= GUIDE.length ? lg + rows : rows + lg) + legacyCard() + (gi >= GUIDE.length && S.mission ? `<br><b>Mission:</b> ${S.mission.name} — ${S.mission.desc} (${Math.floor(S.mission.progress)}/${S.mission.goal})` : '') + '<br><button class="act" id="gLog">📜 Event log</button>';
  showPanel(); $('gLog').onclick = showLog; { const lo = $('legOpen'); if (lo) lo.onclick = showLegacy; } $('ib').querySelectorAll('[data-claim]').forEach((el) => { el.onclick = () => { const [t, id] = el.dataset.claim.split(':'), G = S.goals || {}, g = (t === 'd' ? G.daily : G.weekly || []).find((q) => q.id === id); claimGoal(g, t === 'd' ? GOALS_DAILY : GOALS_WEEKLY); showGoals(); }; }); const gs = $('gSignal'); if (gs) gs.onclick = () => { closeP(); startFinale(); };
}
function logEvent(t, lvl = 'routine') { if (!t || /^★ RENOWN|^Goal complete:|^\+\d+ SCRAP · mission/.test(t)) return;   /* skip echoes of toasts */ S.log = S.log || []; const last = S.log[S.log.length - 1]; if (last && last.t === t) return; S.log.push({ d: S.day, h: S.hour, t: String(t), l: lvl }); if (S.log.length > 60) S.log.splice(0, S.log.length - 60); }
let logOnlyKey = false;
function showLog() {
  endBuildMode(true); closeP(); $('it').textContent = 'EVENT LOG';
  const L = (S.log || []).slice().reverse().filter((e) => !logOnlyKey || e.l === 'critical' || e.l === 'important'), C = document.documentElement.classList.contains('cozy') ? { critical: '#b85a47', important: '#a8682a' } : { critical: '#ff9a84', important: '#ffe08a' };
  $('ib').innerHTML = `<div class="row" style="gap:6px;margin-bottom:6px"><button class="act" id="logFilt" style="flex:1">${logOnlyKey ? 'Showing: alerts + important' : 'Showing: everything'}</button><button class="act" id="logSlow" style="flex:1">1× on emergencies: ${OPTS.autoSlow ? 'ON' : 'OFF'}</button></div><div class="row" style="gap:6px;margin-bottom:6px"><button class="act" id="logLights" style="flex:1">Night lights: ${OPTS.nightLights ? 'ON' : 'OFF (faster)'}</button><button class="act" id="logAdv" style="flex:1">Town advisor: ${OPTS.advisor ? 'ON' : 'OFF'}</button></div><button class="act" id="logBak" style="width:100%;margin-bottom:6px">💾 Backup this town</button>`
    + (L.length ? L.map((e) => `<div style="padding:2px 0;border-bottom:1px solid ${document.documentElement.classList.contains('cozy') ? '#e2cfb0' : '#3e4a56'}${e.l === 'routine' || !e.l ? ';opacity:.8' : ''}"><small style="color:var(--muted)">Day ${e.d} · ${String(e.h).padStart(2, '0')}:00</small> <span style="color:${C[e.l] || 'inherit'}">${e.l === 'critical' ? '⚠ ' : ''}${esc(e.t)}</span></div>`).join('') : '<small>Nothing yet.</small>');
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
  if (m.progress >= m.goal) { S.mat += m.rewardParts; S.wood = Math.min(matCap(), (S.wood || 0) + m.rewardParts); flow('mat', 'Mission rewards', m.rewardParts); flow('wood', 'Mission rewards', m.rewardParts); screenToast('+' + m.rewardParts + ' SCRAP · mission reward'); renownGain(m.rewardRen, m.name); screenToast('MISSION COMPLETE · ' + m.name); questFlash(); SFX('reward'); S.mission = null; setTimeout(() => beginMission(), 1200); }
}
/* 3D.104 factions */
const FACTIONS = { toll: { name: 'The Toll Kings', icon: '👑', desc: 'A warlord gang that taxes the highway. Mostly melee.' }, green: { name: 'Greenwater Commune', icon: '🌿', desc: 'Farmers by the river. Friendly; they trade and ask for help.' },
  foundry: { name: 'The Foundry', icon: '⚙', desc: 'A rival town that builds its own heavy gear. (coming)' }, quar: { name: 'Quarantine Command', icon: '🪖', desc: 'Soldiers holding the cordons. (coming)' }, helix: { name: 'Helix Biotech', icon: '🧬', desc: 'The best-equipped of all. (coming)' }, hollow: { name: 'The Hollow', icon: '🕯', desc: 'A cult that walks inside the hordes. (coming)' } };
function fac(k) { S.fac = S.fac || {}; return (S.fac[k] ||= { att: k === 'green' ? 10 : k === 'toll' ? -20 : 0, met: false }); }
const facOk = (k) => !(fac(k).goneUntil > S.day);
function facAttText(a) { return a >= 60 ? 'Friendly' : a >= 25 ? 'Warm' : a > -25 ? 'Wary' : a > -60 ? 'Hostile' : 'At war'; }
function factionsHtml() { return crisisCard() + `<div class="card"><b>🎯 Stronghold practice</b><div class="sm">Try the squad controls on any stronghold or faction camp. Nothing is lost.</div><button class="act" id="shPrac">Practice</button></div>` + `<div class="card"><b>Raids</b><div class="sm">Hit a faction camp with up to ${shCap(true)} people: steal their stockpile, free their prisoners or take out their leader. They will remember.</div><div class="row" style="gap:6px;flex-wrap:wrap">${['raid_toll', 'raid_green'].map((k) => `<button class="act" data-raid="${k}" ${expLocked(k) ? 'disabled' : ''} title="${esc(expLocked(k))}">${EXP_DEFS[k].icon} ${EXP_DEFS[k].name.replace('Raid: ', '')}${expLocked(k) ? ` <small>(${esc(expLocked(k))})</small>` : ''}</button>`).join('')}</div></div>` + `<div class="card"><b>Factions</b>${Object.entries(FACTIONS).map(([k, F]) => { const f = (S.fac || {})[k]; return `<div class="row" style="gap:6px;margin-top:3px"><span>${F.icon}</span><span class="sp"><b>${F.name}</b><br><small>${f && f.met ? `${facAttText(f.att)} (${Math.round(f.att)})${f.ally ? ' · ally' : ''}${f.goneUntil > S.day ? ` · beaten, regroup day ${f.goneUntil}` : ''}` : 'Not met yet'} · ${F.desc}</small></span></div>`; }).join('')}</div>`; }
function allyDaily() { for (const k of ['toll', 'green']) { const F = (S.fac || {})[k]; if (F && F.revenge && S.day >= F.revenge) { F.revenge = 0; if (!(F.goneUntil > S.day)) { note('important', k === 'toll' ? '👑 The Toll Kings ride in for revenge!' : '🌿 Greenwater fighters come for what you took!'); spawnRaid(k); } } }   /* 3D.114 raids have consequences */
  const g = (S.fac || {}).green; if (g && g.ally && S.day % 4 === 0) { S.food = keepCap(supplyCap(), S.food, 6); S.water = keepCap(supplyCap(), S.water, 6); note('routine', '🌿 Greenwater sent their allies 6 food and 6 water.'); } const t = (S.fac || {}).toll; if (t && t.goneUntil && t.goneUntil === S.day) { t.goneUntil = 0; t.att = -40; t.defied = 0; t.str = .6; note('important', '👑 The Toll Kings have regrouped on the highway (weaker than before).'); } }
/* story events: one a day at most; some are chains that continue a few days later */
const pickSv = (f = () => true) => { const c = S.sv.filter((q) => q.hp > 0 && !['down', 'hospital', 'away', 'errand'].includes(q.mode) && f(q)); return c.length ? c[Math.floor(rnd() * c.length)] : null; };
const storyLater = (id, days) => { S.storyQ = S.storyQ || []; S.storyQ.push({ id, day: S.day + days }); };
const pay = (c) => { if (!Object.entries(c).every(([k, v]) => S[k] >= v)) return false; for (const [k, v] of Object.entries(c)) S[k] -= v; ui(); return true; };
const result = (title, text, gains = '') => showEventPopup({ title, text, gains });
function clearSpot(v) { if (!Wd.buildingAt(world, Math.floor(v.w.x), Math.floor(v.w.y))) return; const t = Wd.nearestWalkable(world, Math.floor(v.w.x), Math.floor(v.w.y), true); if (t) v.w = tc(t.x, t.y); }   /* 3D.58: a newcomer never appears inside a building (tests: geometry) */
function newcomer(job, lvl) { if (popNow() >= popCap()) return null; const name = freeFirst(), v = mk(name, job, lvl, 7 + OFF, 9 + OFF, S.sv.length); clearSpot(v); v.sat = 20; v.src = 'event'; S.sv.push(v); return v; }
/* V3D.17 errands: event jobs done by real people. They walk out of the map (or to a crate), and walk back in. */
const ERRANDS = {
  scout: { out: 'edge', hours: 44, why: 'Scouting the radio signal', done(e, ms) { const sc = ms[0]; if (!sc) return; if (e.trap) { sc.hp = Math.max(1, Math.round(sc.max * .35)); showEventPopup({ stage: { scene: 'sad', head: 'An ambush', icon: '📻', hero: sc }, short: `It was a trap. ${sc.name} made it back, badly hurt.` }); return; } STORY.radio2.run(sc); } },
  kid: { out: 'edge', hours: 5, why: 'Searching for a lost child', done(e, ms) { if (ms.length && rnd() < .8 && popNow() < popCap()) { S.kids = S.kids || []; const name = KID_NAMES.find((n) => !S.sv.some((q) => q.name.split(' ')[0] === n) && !S.kids.some((k) => k.name === n)) || 'Kid'; S.kids.push({ name, age: 2, parents: [], st: Object.fromEntries(STATS.map((k) => [k, 4 + Math.floor(rnd() * 3)])) }); renownGain(8, 'A child saved'); showEventPopup({ stage: { scene: 'party', head: 'Safe!', icon: '🧒', badge: name, hero: ms[0], crowd: ms.slice(1) }, short: `${name} is safe and will grow up in the Haven.`, chips: ['+8 Renown'] }); } else { const s = ms.find(isFighter) || ms[0]; if (s) s.hp = Math.max(1, Math.round(s.max * .5)); showEventPopup({ stage: { scene: 'sad', head: 'Too late', icon: '🧒', hero: s || S.sv[0] }, short: 'They searched until dark and found nothing.' }); } } },
  drop: { out: 'crate', grab: 300, why: 'Fetching the supply crate', done(e, ms) { const c = (S.crates || []).find((x) => x.id === e.data.crate); S.crates = (S.crates || []).filter((x) => x !== c); if (!ms.length || !c) { banner('📦 The crate was lost'); return; } const k = c.k, n = c.n; if (c.loot) { addLoot(c.loot, 'Supply drop'); (c.items || []).forEach((id) => stashAdd(id)); } else S[k] += n; ui(); SFX('reward'); if ((c.loot) && !window.ZH_NO_REVEAL) { lootReveal({ title: 'SUPPLY CRATE', sub: `${ms.map((q) => q.name).join(' and ')} brought it home · ${RARITY[c.rar].n} crate`, entries: lootEntries(c.loot, c.items) }); return; } showEventPopup({ stage: { scene: 'party', head: 'Got it!', icon: k === 'mat' ? '⚙️' : k === 'food' ? '🍖' : '💧', badge: '+' + n, hero: ms[0], crowd: ms.slice(1) }, short: `${ms.map((q) => q.name).join(' and ')} brought the crate home.` }); } },
};
const errandOk = (q) => q.hp > q.max * .6 && !['down', 'hospital', 'away', 'errand', 'rescueTo', 'rescueCarry', 'chase', 'attack', 'recover'].includes(q.mode) && !q.carrying && !q.errand;
function errandTeam(kind, n) {   /* who goes: scouts and fighters first, healthiest first; never the last people at home */
  const pref = (q) => (kind === 'scout' ? (q.job === 'Scavenger' ? 30 : 0) : 0) + (isFighter(q) ? 20 : 0) + q.hp / q.max * 10 + (q.l || 1);
  const c = S.sv.filter(errandOk).sort((a, b) => pref(b) - pref(a)); return S.sv.length - n < 2 ? [] : c.slice(0, n);
}
function dropCrate() {   /* the crate lands outside the walls, inside the map */
  const a = spawnPoint(), cx = (Wd.BUILD.x0 + Wd.BUILD.x1) / 2, cy = (Wd.BUILD.y0 + Wd.BUILD.y1) / 2; let x = a[0], y = a[1];
  for (let i = 0; i < 6; i++) { const nx = Math.round(x + Math.sign(cx - x)), ny = Math.round(y + Math.sign(cy - y)); if (Wd.inWallZone && Wd.inWallZone(nx, ny)) break; if (!Wd.walkable(world, nx, ny)) break; x = nx; y = ny; }
  const k = ['food', 'water', 'mat'][Math.floor(rnd() * 3)], r = rnd(), rar = r < .55 ? 'common' : r < .83 ? 'uncommon' : r < .96 ? 'rare' : 'epic';   /* V3D.25: crates come in rarities */
  const loot = { [k]: 8 + Math.floor(rnd() * 5) }; if (rar !== 'common') { loot.wood = 6 + Math.floor(rnd() * 5); loot.cloth = 1 + Math.floor(rnd() * 2); } if (rar === 'rare' || rar === 'epic') { loot.meds = 1 + Math.floor(rnd() * 2); loot.fuel = 1 + Math.floor(rnd() * 2); }
  const items = rar === 'epic' ? [['kevlar', 'rifle', 'crossbow', 'katana', 'riot'][Math.floor(rnd() * 5)]] : [];
  const c = { id: 'c' + tick, w: tc(x, y), t0: tick, k, n: loot[k], loot, items, rar, until: tick + 9000 }; (S.crates ||= []).push(c); SFX('event'); return c;
}
function homeSpot() { const cx = Math.round((Wd.BUILD.x0 + Wd.BUILD.x1) / 2), cy = Math.round((Wd.BUILD.y0 + Wd.BUILD.y1) / 2), g = Wd.nearestWalkable(world, cx, cy) || { x: cx, y: cy }; return tc(g.x, g.y); }
function startErrand(kind, ms, data = {}) {
  const E = ERRANDS[kind], e = { id: 'e' + tick + kind, kind, ids: ms.map((q) => q.id), phase: 'out', data, trap: kind === 'scout' && rnd() < .25 };
  if (E.out === 'crate') { const c = (S.crates || []).find((x) => x.id === data.crate); e.target = c ? { x: c.w.x + .6, y: c.w.y } : homeSpot(); } else { const a = spawnPoint(); e.target = tc(a[0], a[1]); }
  for (const q of ms) { if (q.post) releasePost(q.post); q.facility = null; q.activity = null; q.target = null; q.dest = null; q.path = null; if (q.chatWith) endChat(q); q.mode = 'errand'; q.errand = e.id; q.arrived = false; q.atHome = false; q.why = E.why;
    const n = Math.max(1, Math.ceil((E.hours || 2) / 10)), pf = Math.min(n, Math.floor(S.food)), pw = Math.min(n, Math.floor(S.water)); S.food -= pf; S.water -= pw; q.pack = { f: pf, w: pw }; }   /* 3D.64 owner: errands pack rations (1 food + 1 water per 10 hours away), eaten on the road; leftovers come back */
  (S.errands ||= []).push(e); return e;
}
function errandAi(s) {
  const e = (S.errands || []).find((x) => x.id === s.errand); if (!e) { s.errand = null; enterFree(s, 30); return; }
  if (s.pack && tick % 120 === (s.i * 13) % 120) { if (s.hunger > 55 && s.pack.f > 0) { s.pack.f--; s.hunger = Math.max(0, s.hunger - 45); } if (s.thirst > 55 && s.pack.w > 0) { s.pack.w--; s.thirst = Math.max(0, s.thirst - 45); } }
  if (s.mode === 'away') { s.moving = false; return; }
  if (e.phase === 'out') { const r = followPath(s, e.target, WALK * 1.25); s.moving = r === 'moving'; if (r !== 'moving' || dist(s.w, e.target) < .6) { s.moving = false; s.arrived = true; if (ERRANDS[e.kind].out === 'edge') s.mode = 'away'; } return; }
  if (e.phase === 'grab') { s.moving = false; s.activity = 'Working'; s.faceW = e.target; return; }
  if (e.phase === 'back') { s.activity = null; s.faceW = null; if (s.atHome) { s.moving = false; return; } const r = followPath(s, e.home, WALK * (e.kind === 'drop' ? 1.05 : 1.15)); s.moving = r === 'moving'; if (r !== 'moving' || dist(s.w, e.home) < 1.2) { s.moving = false; s.atHome = true; } }
}
function errandsTick() {
  for (const c of S.crates || []) if (!c.taken && tick > c.until && !(S.errands || []).some((e) => e.data.crate === c.id)) c.gone = true;
  if (S.crates) S.crates = S.crates.filter((c) => !c.gone);
  for (const e of (S.errands || []).slice()) {
    const ms = S.sv.filter((q) => q.errand === e.id), live = ms.filter((q) => q.mode === 'errand' || q.mode === 'away');
    if (!live.length) { finishErrand(e, ms, []); continue; }
    if (e.phase === 'out' && live.every((q) => q.arrived)) {
      if (ERRANDS[e.kind].out === 'edge') { e.phase = 'away'; e.until = tick + ERRANDS[e.kind].hours * 1000; }
      else { e.phase = 'grab'; e.t = ERRANDS.drop.grab; const c = (S.crates || []).find((x) => x.id === e.data.crate); if (c) { c.grabT = e.t; for (let i = 0; i < 3 + Math.floor(S.day / 6); i++) { const a = spawnPoint(); spawn(a[0], a[1]); const z = S.z[S.z.length - 1]; z.target = live[i % live.length]; z.mode = 'zchase'; } } S.alert = Math.max(S.alert, 600); }
    }
    if (e.phase === 'grab') { const c = (S.crates || []).find((x) => x.id === e.data.crate); if (c) c.grab = 1 - e.t / ERRANDS.drop.grab; if (--e.t <= 0) { e.phase = 'back'; e.home = homeSpot(); if (c) { c.taken = true; c.by = live[0].id; } } }
    if (e.phase === 'away' && tick >= e.until) { e.phase = 'back'; e.home = homeSpot(); for (const q of live) { q.mode = 'errand'; q.w = { ...e.target }; q.path = null; q.atHome = false; } }
    if (e.phase === 'back') { const c = (S.crates || []).find((x) => x.id === e.data.crate); if (c && c.taken) { const by = S.sv.find((q) => q.id === c.by && q.mode === 'errand') || live[0]; c.by = by.id; c.w = { x: by.w.x, y: by.w.y }; } if (live.every((q) => q.atHome)) finishErrand(e, ms, live); }
  }
}
function finishErrand(e, ms, live) {
  S.errands = (S.errands || []).filter((x) => x !== e);
  for (const q of ms) { if (q.pack) { S.food += q.pack.f; S.water += q.pack.w; q.pack = null; } q.errand = null; q.arrived = false; q.atHome = false; q.activity = null; q.faceW = null; if (q.mode === 'errand' || q.mode === 'away') enterFree(q, 30); }
  ERRANDS[e.kind].done(e, live);
}
const STORY = {
  radio1: { cond: () => S.day >= 4 && !!errandTeam('scout', 1).length, w: 2, run: () => { const sc = errandTeam('scout', 1)[0]; if (!sc) return; showEventPopup({ title: '📻 A RADIO SIGNAL', text: 'The radio crackles: a voice repeating coordinates, then static.', stage: { scene: 'radio', head: 'Radio signal', team: [sc], who: sc.name + ' can go' }, short: 'Someone is out there… or it\'s a trap.', chips: ['Trip: about 2 days', '🍖3 💧3'], buttons: [
    { label: `Send ${sc.name}`, fn: () => { if (!pay({ food: 3, water: 3 })) return banner('📻 Not enough supplies for the trip'); startErrand('scout', [sc]); banner({ t: `📻 ${sc.name} set off. Back in about 2 days`, who: sc }); } },
    { label: 'Ignore it', fn: () => {} }] }); } },
  radio2: { chain: true, run: (sc) => showEventPopup({ title: '📻 THE BUNKER', text: 'The scout found a sealed bunker with a small group of survivors who have been hiding for months.', stage: sc ? { scene: 'arrive', head: sc.name + ' is back!', icon: '📻', badge: 'A bunker', hero: sc, crowd: others(sc) } : null, short: 'Found a sealed bunker full of survivors.', buttons: [
    { label: popNow() >= popCap() ? `Invite them in · no room (${popNow()}/${popCap()})` : 'Invite them in', disabled: popNow() >= popCap(), fn: () => { const a = newcomer(rnd() < .5 ? 'Engineer' : 'Medic', 2 + Math.floor(rnd() * 2)), b = rnd() < .5 ? newcomer('Guard', 2) : null; storyLater('radio3', 3); result('📻 NEW ARRIVALS', a ? `${[a, b].filter(Boolean).map((q) => q.name + ' (' + q.job + ' Lv.' + q.l + traitTag(q) + ')').join(' and ')} joined the Haven.` : 'There was no room in the Haven, so they stayed in the bunker — but they\'ll remember you.', a ? '' : '+8 scrap as thanks'); if (!a) S.mat += 8; } },
    { label: 'Trade with them (+10 scrap)', fn: () => { S.mat += 10; storyLater('radio3', 3); ui(); } }] }) },
  radio3: { chain: true, run: () => { const id = ['rifle', 'riot', 'goggles', 'charm', 'axe'][Math.floor(rnd() * 5)]; stashAdd(id); renownGain(15, 'The bunker'); result('📻 A GIFT FROM THE BUNKER', 'The bunker people send a runner with a map of a hidden cache. Your scouts recover it.', `${ITEMS[id].name} added to the stash · +15 Renown`); } },
  /* 3D.104 FACTIONS, first pass (approved order: the Toll Kings and Greenwater Commune first). Each faction has an attitude (-100..100) and
     comes to the Haven through visits. The Toll Kings demand tolls on the highway; defy them twice and the Toll Collector rides in himself:
     beat him for a Victory Banner (they regroup after ~60 days). Greenwater trades and asks for help; at attitude 50 they offer an alliance
     (an Alliance Banner, and gifts every few days). */
  toll1: { cond: () => S.day >= 6 && facOk('toll') && (S.fac.toll.next || 0) <= S.day, w: 1.6, run: () => { const F = fac('toll'), toll = 6 + 2 * (S.lvl || 1); F.met = true; F.next = S.day + 5; showEventPopup({ title: '👑 THE TOLL KINGS', text: `Riders in road-sign armour block the highway ramp. "This road belongs to the Toll Kings. ${toll} scrap, and your people come and go in peace. Or don't pay, and see what happens."`, stage: { scene: 'danger', head: 'The Toll Kings', icon: '👑', badge: 'Toll', hero: S.sv[0], crowd: S.sv.slice(1, 3) }, short: `The Toll Kings want ${toll} scrap.`, buttons: [
    { label: `Pay ${toll} scrap`, fn: () => { if (!pay({ mat: toll })) { F.att -= 10; F.defied = (F.defied || 0) + 1; spawnRaid('toll'); return result('👑 THEY ATTACK', 'You couldn\'t pay. The Toll Kings ride in!'); } F.att = Math.min(100, F.att + 6); S.nextRaid = Math.max(S.nextRaid, S.day + S.hour / 24 + 4); result('👑 TOLL PAID', 'They take the scrap and leave. No raids for 4 days.'); } },
    { label: 'Refuse', fn: () => { F.att = Math.max(-100, F.att - 15); F.defied = (F.defied || 0) + 1; spawnRaid('toll'); if (F.defied >= 2 && !F.leaderDue) { F.leaderDue = true; storyLater('toll3', 2); } result('👑 THEY ATTACK', F.defied >= 2 ? 'The riders charge. One of them shouts back: "The Collector will hear of this!"' : 'The riders charge the Haven!'); } }] }); } },
  toll3: { chain: true, run: () => { const F = fac('toll'); spawnRaid('toll', true); showEventPopup({ title: '👑 THE TOLL COLLECTOR', text: 'The leader of the Toll Kings rides in himself, a road sign for a shield, with his best riders. Beat him and the Toll Kings are finished on this road.', stage: { scene: 'danger', head: 'The Toll Collector', icon: '👑', badge: 'Leader', hero: S.sv[0], crowd: S.sv.slice(1, 3) }, short: 'The Toll Collector attacks!' }); F.leaderDue = false; } },
  green1: { cond: () => S.day >= 3 && facOk('green') && fac('green').att < 50, w: 1.4, run: () => { const F = fac('green'); F.met = true; showEventPopup({ title: '🌿 GREENWATER COMMUNE', text: 'Farmers from Greenwater, a commune by the river, stop at the Haven with a handcart. "We trade, we don\'t take. Got anything to share?"', stage: { scene: 'arrive', head: 'Greenwater Commune', icon: '🌿', badge: 'Visitors', hero: S.sv[0], crowd: S.sv.slice(1, 3) }, short: 'Greenwater farmers want to trade.', buttons: [
    { label: 'Trade 6 food for 10 water', fn: () => { if (!pay({ food: 6 })) return result('🌿 NOTHING TO TRADE', 'You have no food to spare. They wave and move on.'); S.water = keepCap(supplyCap(), S.water, 10); F.att = Math.min(100, F.att + 8); ui(); result('🌿 A FAIR TRADE', 'They swap water barrels for your food and promise to come back.', '+10 water · Greenwater likes you more'); } },
    { label: 'Share a meal (-5 food)', fn: () => { if (!pay({ food: 5 })) return result('🌿 NOTHING TO SHARE', 'There is nothing to share. They understand.'); F.att = Math.min(100, F.att + 15); for (const q of S.sv) q.sat = Math.min(100, (q.sat || 0) + 4); renownGain(3, 'Greenwater'); result('🌿 A GOOD EVENING', 'Stories and laughter around the fire. Greenwater will remember this.', 'Greenwater likes you a lot more · +mood'); } },
    { label: 'Send them on their way', fn: () => { F.att = Math.max(-100, F.att - 3); } }] }); } },
  green2: { cond: () => S.day >= 6 && facOk('green') && fac('green').met && !fac('green').ally, w: 1.1, run: () => { const F = fac('green'); showEventPopup({ title: '🌿 A CHILD IS SICK', text: 'A Greenwater runner arrives out of breath: a child in the commune has a fever and they have no medicine left.', buttons: [
    { label: 'Send 2 medicine', fn: () => { if (!pay({ meds: 2 })) return result('🌿 NO MEDICINE', 'You have none to give. The runner leaves in tears.'); F.att = Math.min(100, F.att + 22); storyLater('green4', 2); renownGain(5, 'Greenwater'); result('🌿 MEDICINE SENT', 'The runner hurries home with the medicine.', 'Greenwater will not forget'); } },
    { label: 'We can\'t spare any', fn: () => { F.att = Math.max(-100, F.att - 6); } }] }); } },
  green4: { chain: true, run: () => { S.food = keepCap(supplyCap(), S.food, 12); S.cloth = (S.cloth || 0) + 2; ui(); result('🌿 THE CHILD IS WELL', 'Greenwater sends a cart of vegetables and blankets to say thank you.', '+12 food · +2 cloth'); } },
  green3: { cond: () => facOk('green') && fac('green').att >= 50 && !fac('green').ally, w: 3, run: () => { const F = fac('green'); showEventPopup({ title: '🌿 AN ALLIANCE?', text: 'Greenwater\'s elders come in person: "We\'ve watched the Haven. You share, you help. Stand with us, and we\'ll stand with you."', stage: { scene: 'party', head: 'Greenwater Commune', icon: '🤝', badge: 'Alliance', hero: S.sv[0], crowd: S.sv.slice(1, 3) }, short: 'Greenwater offers an alliance.', buttons: [
    { label: 'Join hands', fn: () => { F.ally = true; F.att = Math.max(F.att, 70); setTimeout(() => earnBanner('ally', 'The Haven and Greenwater Commune are allies.'), 300); } },
    { label: 'Not yet', fn: () => { F.att -= 10; } }] }); } },
  rival1: { cond: () => false, w: 1.5,   /* 3D.104 replaced by the Toll Kings (toll1) */ run: () => showEventPopup({ title: '🏴 IRONFIELD RIDERS', text: 'Riders from Ironfield, a town to the east, demand tribute: "Pay, or we take it."', buttons: [
    { label: 'Pay 8 scrap', fn: () => { if (!pay({ mat: 8 })) { spawnRaid(); return result('🏴 THEY ATTACK', 'You couldn\'t pay. The riders attack!'); } S.nextRaid = Math.max(S.nextRaid, S.day + S.hour / 24 + 4); storyLater('rival2', 4); result('🏴 TRIBUTE PAID', 'They leave. No raiders for 4 days.'); } },
    { label: 'Refuse', fn: () => { spawnRaid(); spawnRaid(); S.rivalFight = true; storyLater('rival3', 1); result('🏴 THEY ATTACK', 'Two raiding parties ride in at once!'); } }] }) },
  rival2: { chain: true, run: () => { S.food += 10; S.water += 6; ui(); result('🏴 IRONFIELD TRADERS', 'Ironfield sends a cart of supplies as a sign of peace.', '+10 food · +6 water'); } },
  rival3: { chain: true, run: () => { renownGain(15, 'Ironfield backs down'); result('🏴 IRONFIELD BACKS DOWN', 'Word spreads that the Haven stood its ground.', '+15 Renown'); } },
  sick: { cond: () => S.sv.length >= 4, w: 1.2, run: () => { const s = pickSv(); if (!s) return; showEventPopup({ title: '🤒 ' + s.name.toUpperCase() + ' IS SICK', text: `${s.name} has a fever and can barely stand.`, buttons: [
    { label: 'Treat (2 scrap, 3 water)', fn: () => { if (!pay({ mat: 2, water: 3 })) return result('NOT ENOUGH SUPPLIES', `${s.name} will have to ride it out.`); s.sat = Math.min(100, (s.sat || 0) + 5); result('🤒 RECOVERING', `${s.name} will be fine.`); } },
    { label: 'Let them rest', fn: () => { s.hp = Math.max(1, Math.round(s.max * .45)); s.fatigue = 90; result('🤒 A ROUGH FEW DAYS', `${s.name} is weak for a while.`); } }] }); } },
  lostkid: { cond: () => S.day >= 5 && errandTeam('kid', 2).length === 2, w: .8, run: () => { const t = errandTeam('kid', 2); showEventPopup({ title: '🧒 A LOST CHILD', text: 'A child is crying somewhere beyond the walls.', stage: { scene: 'radio', head: 'A lost child', team: t, who: t.map((q) => q.name).join(' & ') + ' can go', quiet: true }, short: 'A child is crying beyond the walls.', chips: ['Search: about 5 hours'], buttons: [
    { label: `Send ${t.map((q) => q.name).join(' & ')}`, fn: () => { startErrand('kid', t); banner({ t: `🧒 ${t[0].name} and ${t[1].name} went searching`, who: t[0] }); } },
    { label: 'Too dangerous', fn: () => { for (const q of S.sv) q.sat = Math.max(0, (q.sat || 0) - 4); } }] }); } },
  drop: { cond: () => S.day >= 3 && !S.crates?.length && errandTeam('drop', 2).length >= 1, w: 1, run: () => { const c = dropCrate(), t = errandTeam('drop', 2); showEventPopup({ title: '📦 SUPPLY DROP', text: 'A parachute crate is coming down outside the walls.', stage: { scene: 'drop', head: 'Supply drop!', team: t, who: t.map((q) => q.name).join(' & ') + ' can fetch it' }, short: 'The noise will wake the dead.', chips: ['Lands outside the walls'], buttons: [
    { label: `Send ${t.map((q) => q.name).join(' & ')}`, fn: () => { startErrand('drop', t, { crate: c.id }); centerOn(c.w.x, c.w.y); } },
    { label: 'Leave it', fn: () => { c.left = true; } }] }); } },
  dog: { cond: () => !S.sv.some((q) => q.pet) || rnd() < .3, w: .7, run: () => showEventPopup({ title: '🐕 A STRAY DOG', text: 'A skinny dog has been following the patrols for days.', buttons: [
    { label: 'Adopt (2 food)', fn: () => { if (!pay({ food: 2 })) return; const p = newPet('dog'); (S.pets = S.pets || []).push(p); result('🐕 ' + p.name.toUpperCase(), `${p.name} has a home. Give the dog to a survivor from their Gear tab.`); } },
    { label: 'Shoo it away', fn: () => {} }] }) },
  medic: { cond: () => S.day >= 4, w: .8, run: () => showEventPopup({ title: '🩺 A WANDERING MEDIC', text: 'A travelling medic asks for shelter for the night.', buttons: [
    { label: popNow() >= popCap() ? `Ask them to stay · no room (${popNow()}/${popCap()})` : 'Ask them to stay', disabled: popNow() >= popCap(), fn: () => { const v = newcomer('Medic', 2); result('🩺 ' + (v ? v.name.toUpperCase() + ' STAYS' : 'NO ROOM'), v ? `${v.name} (Medic Lv.2) joins the Haven.` : 'There\'s no room — they treat everyone before leaving.'); if (!v) for (const q of S.sv) q.hp = Math.min(q.max, q.hp + q.max * .3); } },
    { label: 'Ask for treatment', fn: () => { for (const q of S.sv) q.hp = Math.min(q.max, q.hp + q.max * .4); result('🩺 PATCHED UP', 'Everyone is treated before the medic moves on.'); } }] }) },
  storm: { cond: () => S.day >= 3 && !seasonOf().snow, w: .5, run: () => { S.water = keepCap(supplyCap(), S.water, 8); let t = 'Heavy rain fills every barrel.'; if (rnd() < .35) { const c = world.buildings.filter((b) => !OPEN_AIR.has(b.type) && !b.burnt); if (c.length && startFire(c[Math.floor(rnd() * c.length)], 25, 'Lightning')) t += ' Lightning struck a building!'; } ui(); result('⛈ STORM', t, '+8 water'); } },
  feast: { cond: () => S.sv.length >= 5 && S.food >= 12 && S.water >= 12, w: .9, run: () => showEventPopup({ title: '🎉 A FEAST?', text: 'Spirits are low. Someone suggests a feast to bring everyone together.', buttons: [
    { label: 'Hold a feast (6 food, 6 water)', fn: () => { if (!pay({ food: 6, water: 6 })) return; for (const a of S.sv) { a.sat = Math.min(100, (a.sat || 0) + 15); for (const b of S.sv) if (a.id < b.id) addBond(a, b, 6); } SFX('reward'); result('🎉 WHAT A NIGHT', 'Everyone feels closer.', '+15 ♥ for everyone · bonds grow'); } },
    { label: 'Not now', fn: () => {} }] }) },
  gift: { cond: () => true, w: 1.5, run: () => { const e = TOWN_EVENT_DEFS[Math.floor(rnd() * TOWN_EVENT_DEFS.length)]; if (e.food) S.food += e.food; if (e.water) S.water += e.water; if (e.mat) S.mat += e.mat; if (e.ren) renownGain(e.ren, e.name); const g = []; if (e.food) g.push('+' + e.food + ' food'); if (e.water) g.push('+' + e.water + ' water'); if (e.mat) g.push('+' + e.mat + ' scrap'); if (e.ren) g.push('+' + e.ren + ' renown'); result(e.name.toUpperCase(), e.text, g.join(' · ')); ui(); } },
};
function triggerTownEvent() {   /* once a day: a due chain step first, else a random eligible event */
  S.storyQ = S.storyQ || []; const due = S.storyQ.find((q) => q.day <= S.day);
  if (due) { S.storyQ = S.storyQ.filter((q) => q !== due); STORY[due.id] && STORY[due.id].run(); return; }
  const pool = Object.entries(STORY).filter(([k, e]) => !e.chain && e.cond() && k !== S.lastStory && !(k === 'radio1' && S.radioDone) && !(k === 'rival1' && S.rivalDone));
  let tot = pool.reduce((a, [, e]) => a + e.w, 0), r = rnd() * tot; for (const [k, e] of pool) { r -= e.w; if (r <= 0) { S.lastStory = k; if (k === 'radio1') S.radioDone = true; if (k === 'rival1') S.rivalDone = true; e.run(); return; } }
}
const eventQueue = []; let modalOpen = false;
/* stage: { scene: 'arrive' | 'party' | 'danger' | 'sad', head, icon, badge, hero (survivor), crowd: [survivors] } */
function stageHtml(st) {
  const fig = (s, pose) => (window.ZH3D && ZH3D.figure && s ? ZH3D.figure(s, pose) : null), img = (u, cls) => (u ? `<div class="sa ${cls}"><img src="${u}" alt=""></div>` : '');
  if (st.scene === 'radio' || st.scene === 'drop') {   /* V3D.17: the radio crackling (or a crate coming down), and the people who would go */
    const team = (st.team || []).slice(0, 2).map((q, i) => img(fig(q, 'ready'), 'team t' + i)).join('');
    const prop = st.scene === 'drop' ? '<div class="chute"><div class="canopy"></div><div class="lines"></div><div class="crate"></div></div><div class="dust"></div>' : st.quiet ? '' : '<div class="radioSet"><i class="ant"></i><span class="sig"></span><span class="sig s2"></span><span class="sig s3"></span></div>';
    return `<div class="evStage ${st.scene === 'drop' ? 'arrive' : 'radio'}"><div class="cloud" style="left:10%"></div><div class="cloud" style="left:62%;animation-delay:-7s;top:30px"></div><div class="hills"></div><div class="fence"></div><div class="ground"></div>${prop}${team}${st.who ? `<div class="who">${esc(st.who)}</div>` : ''}</div>`;
  }
  if (st.scene === 'boss') {   /* V3D.17: the boss itself lumbers in from the right, under a red sky */
    const K = BOSS_KINDS[st.boss] || BOSS_KINDS.mutant, z = window.ZH3D && ZH3D.zombieFigure, f1 = z && z(K.look, 0, K.run), f2 = z && z(K.look, 1, K.run);
    return `<div class="evStage danger boss"><div class="hills"></div><div class="fence"></div><div class="ground"></div>
      <div class="sa mid walkR${K.run ? ' fast' : ''}" style="--bs:${(K.sc / 1.6).toFixed(2)}">${f1 ? `<img class="w1" src="${f1}" alt="">` : ''}${f2 ? `<img class="w2" src="${f2}" alt="">` : ''}</div><div class="bossName">${K.name}</div></div>`;
  }
  if (st.scene === 'newcomer') {   /* one person walks in from the left to the middle and waves (two frames swap) */
    const f1 = fig(st.hero, 'wave1'), f2 = fig(st.hero, 'wave2');
    return `<div class="evStage arrive"><div class="cloud" style="left:10%"></div><div class="cloud" style="left:62%;animation-delay:-7s;top:30px"></div><div class="hills"></div><div class="fence"></div><div class="ground"></div>
      <div class="sa mid walkL">${f1 ? `<img class="w1" src="${f1}" alt="">` : ''}${f2 ? `<img class="w2" src="${f2}" alt="">` : ''}</div></div>`;
  }
  const crowd = (st.crowd || []).slice(0, 2), sc = st.scene || 'arrive';
  const heroPose = sc === 'arrive' ? 'wave' : sc === 'danger' ? 'ready' : sc === 'sad' ? 'down' : 'cheer', crowdPose = sc === 'danger' ? 'ready' : sc === 'sad' ? 'down' : 'cheer';
  const conf = sc === 'arrive' || sc === 'party' ? Array.from({ length: 14 }, (_, i) => `<i class="conf" style="left:${(i * 7.3 + 3) % 100}%;background:${['#ffd45c', '#ff9ab0', '#9be2ff', '#a8e08a'][i % 4]};animation-delay:${(i * .37) % 2.2}s"></i>`).join('') : '';
  return `<div class="evStage ${sc}"><div class="cloud" style="left:10%"></div><div class="cloud" style="left:62%;animation-delay:-7s;top:30px"></div><div class="hills"></div><div class="fence"></div><div class="ground"></div>
    <div class="glow"><div class="ic">${st.icon || '★'}</div>${st.badge ? `<div class="bd">${st.badge}</div>` : ''}</div>
    ${crowd.map((s, i) => img(fig(s, crowdPose), `l${i} ${sc === 'danger' ? 'shake' : sc === 'sad' ? '' : 'hop d' + (i + 1)}`)).join('')}
    ${img(fig(st.hero, heroPose), 'r0 ' + (sc === 'arrive' ? 'walkin' : sc === 'danger' ? 'shake' : sc === 'party' ? 'hop' : ''))}${conf}</div>`;
}
const others = (s, n = 2) => S.sv.filter((q) => q !== s && q.hp > 0).slice(0, n);
function showEventPopup(o) { eventQueue.push(o); nextEventPopup(); }
function nextEventPopup() {
  const m = $('eventModal'); if (!m || m.innerHTML || !eventQueue.length || sel) return; const e = eventQueue.shift(); modalOpen = true;
  const bt = e.buttons && e.buttons.length ? e.buttons : [{ label: 'OK' }];
  if ((e.stage)) {   /* V3D.12: DV2-style stage card */
    m.innerHTML = `<div class="evBox frame stageCard"><div class="evTitle">${e.stage.head || 'News'}</div>${stageHtml(e.stage)}<div class="evLine">${e.short || e.title}</div>${e.chips ? `<div class="evChips">${e.chips.map((c) => `<span>${c}</span>`).join('')}</div>` : ''}${bt.map((b, i) => `<button class="act${i === 0 ? ' go' : ''} out" data-i="${i}"${i === 0 ? ' id="eventOk"' : ''}${b.disabled ? ' disabled' : ''}>${b.label}</button>`).join('')}</div>`;
    m.querySelectorAll('button[data-i]').forEach((el) => { el.onclick = () => { const b = bt[+el.dataset.i]; m.innerHTML = ''; modalOpen = false; if (b && b.fn) b.fn(); nextEventPopup(); }; });
    SFX(e.stage.scene === 'sad' || e.stage.scene === 'danger' ? 'alarm' : 'event'); return;
  }
  m.innerHTML = `<div class="evBox frame"><div class="evTitle out">${e.title}</div><div class="evText">${e.text}</div>${e.gains ? `<div class="evGain">${e.gains}</div>` : ''}${bt.map((b, i) => `<button class="act${i === 0 ? ' go' : ''} out" data-i="${i}"${i === 0 ? ' id="eventOk"' : ''}${b.disabled ? ' disabled' : ''}>${b.label}</button>`).join('')}</div>`;
  m.querySelectorAll('button').forEach((el) => { el.onclick = () => { const b = bt[+el.dataset.i]; m.innerHTML = ''; modalOpen = false; if (b && b.fn) b.fn(); nextEventPopup(); }; });
}
const residents = () => S.sv.filter((s) => s.resident).length;
/* V2.33 DV2-style "Upgrade Town": each star has rating conditions; when all are met the player upgrades the town */
const RANK_REQ = [null, { ren: 60, flow: 2, events: 1, build: 'canteen', people: 7, bld: 10 }, { ren: 200, flow: 4, events: 2, build: 'storage', people: 11, bld: 18 }, { ren: 450, flow: 7, events: 4, build: 'barracks', people: 15, bld: 26 }, { ren: 900, flow: 10, events: 6, build: 'hospital', people: 19, bld: 34 }];   /* 3D.74: a rank-up needs people and buildings (ren/flow/events/build kept for the auto-player and older screens) */
/* 3D.104 HAVEN LEVELS (owner, Round 5): levels 1-15 in three eras replace the 5 stars. People and buildings drive each level, the player
   presses Upgrade, the upgrade takes real time (0.5 h + 0.8 h per level, never over 12 h; 3x faster while playing), each level has 3 small
   celebrated steps, territory and storage grow with the level, and the Banner gates level 5 -> 6 and 10 -> 11. The old star rank is kept
   underneath (every 3 levels = one old rank) so the buildings, threat ceiling and room for people it drives keep their balance. */
const lvlOfRank = (r) => 1 + 3 * Math.max(0, (r || 1) - 1);   /* the level where an old star rank begins */
const LV_MAX = 20, LV_REQ = [null, { people: 6, bld: 6 }, { people: 7, bld: 8 }, { people: 8, bld: 10 }, { people: 9, bld: 13 }, { people: 11, bld: 16 }, { people: 12, bld: 18 }, { people: 13, bld: 21 },
  { people: 15, bld: 24 }, { people: 16, bld: 26 }, { people: 17, bld: 29 }, { people: 19, bld: 32 }, { people: 20, bld: 34 }, { people: 21, bld: 37 }, { people: 23, bld: 40 },
  { people: 25, bld: 43 }, { people: 27, bld: 46 }, { people: 29, bld: 49 }, { people: 31, bld: 52 }, { people: 33, bld: 55 }];   /* 3D.113 Endgame A: levels 16-20, Era IV The City */
const ERAS = [{ n: 'I', name: 'The Camp', from: 1, to: 5 }, { n: 'II', name: 'The Settlement', from: 6, to: 10 }, { n: 'III', name: 'The Town', from: 11, to: 15 }, { n: 'IV', name: 'The City', from: 16, to: 20 }];
const eraOf = (l = S.lvl || 1) => ERAS.find((e) => l >= e.from && l <= e.to) || ERAS[ERAS.length - 1];
const rankOfLvl = (l) => Math.min(5, 1 + Math.floor((l - 1) / 3));
const terrOfLvl = (l) => (l >= 16 ? 4 : l >= 11 ? 3 : l >= 7 ? 2 : l >= 4 ? 1 : 0);   /* 12x12 (L1-3), 16x18 (L4-6), 20x23 (L7-10), 24x26 (L11-15) */
/* 3D.128 pacing (owner: the start should feel quick, later levels take effort and a check-in a day). Real hours per level; 3x faster while playing:
   level 2 in 3 minutes of play, 3 in 6, 4 in 35, 5 in 50, 6 in 60; from 7 on it is a wait you come back to (3.5 h, 4 h, 6 h, 8 h, then 12 h, then 16 h in the City). */
const LV_HOURS = [0, 0, .15, .3, 1.75, 2.5, 3, 3.5, 4, 6, 8, 12, 12, 12, 12, 12, 16, 16, 16, 16, 16];   /* 3D.129 owner: levels 4 and 5 slowed (35 and 50 minutes of play, were 10 and 20) so rank 2 and its bigger hordes arrive around day 10-12, not day 6 */
const lvHours = (to) => LV_HOURS[to] ?? 12;
const needsBanner = (l = S.lvl || 1) => l === 5 || l === 10 || l === 15;   /* 3D.113 a Banner also opens the City era */
const bannersFree = () => (S.banners || []).filter((b) => !b.used).length;
const BANNER_ROUTES = { stronghold: { icon: '🏚', name: 'Stronghold Banner', how: 'Clear a stronghold (the Overrun Clinic on the Explore map)' }, faction: { icon: '⚔', name: 'Victory Banner', how: 'Defeat a faction (coming)' },
  ally: { icon: '🤝', name: 'Alliance Banner', how: 'Make an ally of a faction (coming)' }, civic: { icon: '🏛', name: 'Civic Banner', how: 'Finish a civic project: a Trading Post, or the Radio Tower' } };
function earnBanner(route, why) {   /* a Banner raised over the Haven; one is spent on each era gate */
  S.banners = S.banners || []; if (S.banners.some((b) => b.route === route && !b.used && route !== 'stronghold')) return false; const R = BANNER_ROUTES[route];
  S.banners.push({ route, day: S.day, used: false }); SFX('rankup'); renownGain(8, R.name);
  showEventPopup({ stage: { scene: 'party', head: 'A Banner for the Haven!', icon: R.icon, badge: 'Banner', hero: S.sv[0], crowd: S.sv.slice(1, 3) }, short: `${R.name} raised: ${why}`, title: R.icon + ' ' + R.name.toUpperCase(), text: why + '<br>A Banner opens the next era of the Haven (level 5 → 6 and 10 → 11).' });
  checkRank(); return true;
}
function lvStepCheck(c) {   /* 3 small celebrated steps inside each level: a third, two thirds, then ready to upgrade */
  if (!c || S.lvUp) return; const p = c.reduce((a, r) => a + (r.ok ? 1 : Math.min(1, (+r.have || 0) / Math.max(1, +r.need || 1))), 0) / c.length, st = p >= 1 ? 3 : p >= .66 ? 2 : p >= .33 ? 1 : 0;
  if (st > (S.lvStep || 0)) { S.lvStep = st; if (st < 3) { banner(`🏁 LEVEL ${S.lvl + 1} · STEP ${st} OF 3`); renownGain(1 + st, 'Level step'); SFX('chime'); } }
}
function levelUpDone() {   /* the timer ran out: the Haven reaches the next level */
  const u = S.lvUp; if (!u) return; S.lvUp = null; const from = S.lvl || 1; S.lvl = Math.min(LV_MAX, u.to); S.lvStep = 0; const oldRank = S.rank || 1; S.rank = Math.max(oldRank, rankOfLvl(S.lvl));
  if (u.banner) { const b = (S.banners || []).find((q) => !q.used); if (b) b.used = true; }
  const t = Math.max(S.terr || 0, terrOfLvl(S.lvl)); if (t !== (S.terr || 0)) { S.terr = t; Wd.setTerritory(t); Wd.bump(world); }
  const lines = [`Room to store more: food/water ${supplyCap()}, wood/stone ${matCap()}, scrap ${scrapCap()}`]; if (terrOfLvl(S.lvl) > terrOfLvl(from)) lines.unshift('🗺 The Haven claims more land (more zombies, from more directions)');
  if (eraOf(S.lvl) !== eraOf(from)) lines.unshift(`A new era begins: Era ${eraOf(S.lvl).n} · ${eraOf(S.lvl).name}`);
  if (S.rank > oldRank) { S.threat = Math.floor(S.day / 4); rankReward(); S.mat += 4 + S.rank; for (const x of rankUnlocks(S.rank).filter((x) => !x.startsWith('+'))) lines.push(x); }
  else { S.food = keepCap(supplyCap(), S.food, 2); S.water = keepCap(supplyCap(), S.water, 2); S.mat += 2; }
  SFX('rankup'); renownGain(4 + S.lvl, 'Haven Level ' + S.lvl);
  showEventPopup({ stage: { scene: 'party', head: 'The Haven grows!', icon: '🏡', badge: 'Level ' + S.lvl, hero: S.sv[0], crowd: S.sv.slice(1, 3) }, short: `The Haven is now Level ${S.lvl}!`, chips: S.rank > oldRank ? rankUnlocks(S.rank).filter((x) => x.startsWith('Buildings')).map((x) => '🔓 ' + x.replace('Buildings: ', '')) : [], title: '🏡 HAVEN LEVEL ' + S.lvl, text: lines.map((x) => '• ' + esc(x)).join('<br>'), gains: S.rank > oldRank ? '+' + (4 + S.rank) + ' scrap' : '+2 scrap' });
  say('HAVEN LEVEL ' + S.lvl + '!', true); saveGame(); ui();
}
function lvTick(ms) {   /* ms of real time; while playing the timer runs 3x faster */
  if (!S.lvUp) return; S.lvUp.left -= ms; if (S.lvUp.left <= 0) levelUpDone();
}
const lvLeftText = () => { if (!S.lvUp) return ''; const m = Math.max(0, Math.ceil(S.lvUp.left / 60000 / 3)); return m >= 60 ? `${Math.floor(m / 60)} h ${m % 60} min` : `${m} min`; };
const scrapCap = () => 100 + 25 * (S.lvl || 1) + 40 * storeTiers();   /* 3D.104 owner: stockpiles are limited by level */
function rankUnlocks(r) {   /* V2.39: what reaching star r opens up (buildings, walls, events) and what it costs (threat) */
  const b = Object.entries(DEFS).filter(([, d]) => (d.rank || 1) === r).map(([k, d]) => d.name + (d.res && !researched(d.res) ? ` (after ${RESEARCH[d.res].name})` : ''));
  const w = Object.values(Wd.WALL_DEFS).filter((d) => (d.rank || 1) === r).map((d) => d.name), e = Object.values(TOWN_EVENTS).filter((x) => (x.rank || 1) === r).map((x) => x.icon + ' ' + x.name);
  const tr = Object.values(TRAP_DEFS).filter((d) => d.rank === r).map((d) => d.name);
  const out = []; if (b.length) out.push('Buildings: ' + b.join(', ')); if (w.length) out.push('Walls: ' + w.join(', ')); if (tr.length) out.push('Traps: ' + tr.join(', ')); if (e.length) out.push('Events: ' + e.join(', '));
  out.push(`Room for ${rankRoom() + 4} people (was ${rankRoom()}), and a newcomer hears of the Haven (needs a free bed)`); if (r < HORDE_DAY_CAP.length) out.push(`☠ The zombie threat ceiling rises: hordes can grow to their day-${HORDE_DAY_CAP[r]} strength (was day ${HORDE_DAY_CAP[r - 1] || HORDE_DAY_CAP[1]})`); out.push(`+2 food, +2 water, everyone heals 25%`); out.push(`+${4 + r} scrap on upgrade`); return out;
}

function rankConds() {
  if ((S.lvl || 1) >= LV_MAX) return null; const q = LV_REQ[S.lvl || 1]; if (!q) return null;
  const pe = popNow(), nb = world.buildings.filter((b) => !b.burnt).length;   /* 3D.74 owner: the town grows by people and buildings; the player still presses Upgrade */
  const c = [
    { ic: 'rating', name: 'People living here', need: q.people, have: pe, ok: pe >= q.people, sub: `room for ${popCap()} now: build beds, keep everyone fed and newcomers will come` },
    { ic: 'living', name: 'Buildings standing', need: q.bld, have: nb, ok: nb >= q.bld, sub: 'any building counts; burnt ones don\'t until repaired' },
  ];
  if (needsBanner()) c.push({ ic: 'rating', name: 'A Banner over the Haven', need: 1, have: bannersFree(), ok: bannersFree() > 0, sub: 'opens the next era: ' + Object.values(BANNER_ROUTES).map((r) => r.icon + ' ' + r.how).join(' · ') });
  return c;
}
function checkRank() {
  const c = rankConds(); if (!c) return; lvStepCheck(c); const ok = c.every((r) => r.ok);
  if (ok && !S.rankReady && !S.lvUp) { S.rankReady = true; banner('🏡 THE HAVEN CAN REACH LEVEL ' + ((S.lvl || 1) + 1)); say('Ready for the next level: open Upgrade (tap the Renown wheel or Town) to start it.', true); }
  if (!ok) S.rankReady = false; ui();
}
function upgradeTown() {   /* 3D.104 starts the level-up timer; the level arrives when it runs out */
  const c = rankConds(); if (!c || !c.every((r) => r.ok) || S.lvUp) return false; const to = (S.lvl || 1) + 1;
  S.lvUp = { to, left: lvHours(to) * 3600000, total: lvHours(to) * 3600000, banner: needsBanner() }; S.rankReady = false; S.lvStep = 3;
  SFX('build'); banner('🏗 UPGRADING TO LEVEL ' + to); say(`The Haven is working toward level ${to}: about ${lvLeftText()} while you play (3x slower while away).`, true); saveGame(); ui(); return true;
}
/* V2.33 town events (like DV2's): cost supplies, run for a few hours, give Renown and mood, and count toward the next star */
const TOWN_EVENTS = {
  bonfire: { name: 'Bonfire Night', icon: '🔥', cost: { food: 4, water: 2 }, ren: 6, sat: 8, hours: 3, desc: 'Stories and songs around the fire. Everyone feels better.' },
  market: { name: 'Swap Market', icon: '🧺', cost: { mat: 6 }, ren: 8, sat: 4, hours: 4, desc: 'Survivors trade odds and ends. Brings in a little food and water.', gain: { food: 3, water: 3 } },
  sports: { name: 'Sports Day', icon: '🏃', cost: { food: 3, water: 4 }, ren: 7, sat: 5, hours: 3, desc: 'Races and games. Everyone gets some training in.', train: 30 },
  feast: { name: 'Harvest Feast', icon: '🍲', cost: { food: 8, water: 4 }, ren: 12, sat: 12, hours: 4, rank: 2, desc: 'A proper meal for everyone. Hunger and mood are restored.' },
  caravan: { name: 'Trade Caravan', icon: '🐫', cost: { food: 12, water: 10 }, ren: 6, sat: 3, hours: 4, rank: 3, desc: 'A passing caravan takes surplus food and water and pays in scrap.', gain: { mat: 10 } },   /* V2.38: a use for a full pantry */
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
    h += `<div class="ribbon"><div class="rname">${esc(S.townName || 'Zombie Haven')}</div><div class="rstars" style="font-size:22px;letter-spacing:0">Level ${S.lvl || 1} <span style="font-size:15px;opacity:.85">· Era ${eraOf().n}: ${eraOf().name}</span></div></div>`
      + `<div class="card"><div class="row" style="gap:3px">${Array.from({ length: LV_MAX }, (_, i) => `<span style="flex:1;height:9px;border-radius:3px;background:${i < (S.lvl || 1) ? 'var(--gold)' : 'rgba(255,255,255,.15)'};${[4, 9].includes(i) ? 'margin-right:5px' : ''}"></span>`).join('')}</div><div class="sm">Banners: ${(S.banners || []).length ? S.banners.map((b) => BANNER_ROUTES[b.route].icon + (b.used ? ' (raised)' : ' (ready)')).join(' ') : 'none yet'}</div></div>`;
    if (S.lvUp) { const f = 1 - S.lvUp.left / S.lvUp.total; h += `<div class="card"><b>🏗 Upgrading to level ${S.lvUp.to}</b>${progRow('Done', Math.round(f * 100), 100)}<div class="sm">About ${lvLeftText()} left while you play (it keeps going, slower, while you are away).</div></div>`; }
    if (!c) h += '<div class="card" style="text-align:center">The Haven is at the highest level.</div>';
    else {
      if (!S.lvUp) h += `<div class="conds"><div class="ctitle">Level ${(S.lvl || 1) + 1} · step ${Math.min(3, S.lvStep || 0)} of 3</div>` + c.map((r) => `<div class="crow"><span class="cic">${uiIcon(r.ic)}</span><span class="cname">${r.name}${r.sub ? `<small>${r.sub}</small>` : ''}</span>${r.wide ? '' : `<span class="cneed">${r.need}</span>`}<span class="chave${r.wide ? ' wide' : ''}">${r.have}</span><span class="cok ${r.ok ? 'y' : 'n'}">${r.ok ? '✔' : '✘'}</span></div>`).join('') + '</div>';
      { const nl = (S.lvl || 1) + 1, nr = rankOfLvl(nl), un = nr > (S.rank || 1) ? rankUnlocks(nr) : [`+2 scrap, +2 food, +2 water`]; if (terrOfLvl(nl) > terrOfLvl(S.lvl || 1)) un.unshift('More land for the Haven'); un.push(`Upgrade time ${lvHours(nl).toFixed(1)} h (3x faster while you play)`); h += `<div class="card"><b>Level ${nl} brings</b>${un.map((x) => `<div class="sm">• ${esc(x)}</div>`).join('')}</div>`; }
      if (!S.lvUp) h += `<div style="text-align:center"><button class="act go" id="uDo" ${c.every((r) => r.ok) ? '' : 'disabled'}>Start upgrading to level ${(S.lvl || 1) + 1}</button></div>`;
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
  { const n = rankRules[S.rank], pv = rankRules[S.rank - 1] || { ren: 0 }, bar = $('renBar'); if (bar) { const rc = rankConds(); bar.style.width = (rc && rc.length ? Math.round(100 * rc.reduce((a, r) => a + (r.ok ? 1 : Math.min(1, (+r.have || 0) / Math.max(1, +r.need || 1))), 0) / rc.length) : 100) + '%'; }   /* audit: the bar fills toward the next rank's conditions (people + buildings), not old Renown thresholds */ if (bar) $('gauge').style.setProperty('--p', parseFloat(bar.style.width) || 0); } $('food').textContent = Math.floor(S.food); $('water').textContent = Math.floor(S.water); $('mat').textContent = Math.floor(S.mat); { const rr = $('rare'); if (rr) rr.textContent = ['cloth', 'meds', 'fuel'].map((k) => Math.floor(S[k] || 0)).join('·'); ammoChip(rr); } { const w = $('wood'); if (w) w.textContent = Math.floor(S.wood || 0); const sn = $('stone'); if (sn) { sn.textContent = Math.floor(S.stone || 0); sn.parentNode.style.display = (S.stone || 0) > 0 || hqTier() >= 2 ? '' : 'none'; } } $('ren').textContent = S.ren; $('rank').textContent = 'Lv ' + (S.lvl || 1); $('gauge').classList.toggle('ready', !!S.rankReady); $('threat').textContent = S.threat;
  { const mb = $('mExp'); if (mb) { leadsTidy(); const n = (S.leads || []).length; mb.classList.toggle('dim', !n && !S.trip); mb.dataset.badge = !S.trip && n ? n : ''; } }
  $('clock').textContent = (`${S.weather ? WX_ICON[S.weather.kind] || "🌧" : seasonOf().icon} DAY ${S.day} · ${String(S.hour).padStart(2, '0')}:00`);
  $('qt').textContent = S.stage === 0 ? 'Build a Rain Barrel' : S.stage === 1 ? `Defeat 3 Walkers (${Math.min(S.kills, 3)}/3)` : guideActive() ? `▶ ${GUIDE[S.guide].desc}` : (S.mission ? `${S.mission.name}: ${Math.floor(S.mission.progress)}/${S.mission.goal}` : 'Grow the Haven!');
}

/* ---------------- save / load / migration ---------------- */
const SKIP = new Set(['para', 'aidTo', 'aidBy', 'aidT', 'comboZ', 'comboQ', 'comboStep', 'reloadT', 'avoid', 'visits', 'stays', 'emo', 'chatWith', 'chatLines', 'chatStep', 'chatT', 'faceW', 'fire', 'helpAt', 'helpT', '_lastKills', 'lootId', '_lvT', '_ghost', '_ghostHold', 'post', 'target', 'facility', 'rescuer', 'rescuing', 'carrying', 'path', 'pathGoal', 'pathVer', 'lastFacility', 'moving', 'stuck', 'lastD', 'hideAt', 'fireAt', 'careAt', 'fixB', 'careTo', 'arrG', 'prog', 'nearT', 'talk', 'talkBy']);   /* 3D.58: fixB (a building) broke saves while someone was repairing */   /* V2.36: hideAt / fireAt are building links too: saving while someone hid in a staffed building failed silently */
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
    + `<button class="moreRow" id="moSet"><span class="moI">${I('parts')}</span><span class="moT"><b>Settings</b><small>Save, sound, event log, tips, main menu</small></span><span class="moA">›</span></button>`;
  $('moGuide').onclick = () => { showGuide(); panelBack = showMore; $('pBack').style.display = 'block'; }; $('moSet').onclick = () => showSettings(showMore);
  showPanel('MORE');
}
const DAYMUS = { mix: ['Mix', 'A different tune each day'], slow: ['Slow mix', 'Only the slow, calm tracks'], calm: ['Calm', 'Slow guitar, piano and strings'], hearth: ['Hearth', 'Slow fingerpicking and cello'], strum: ['Strum', 'Lively strummed guitar, cajon and shaker'], travis: ['Picking', 'Bright fingerstyle guitar with claps'], western: ['Western', 'Galloping guitar, whistle and trumpet'], jig: ['Jig', 'Celtic fiddle, guitar and drum'], rag: ['Honky-tonk', 'Old saloon piano'], day: ['Folk', 'Guitar picking and a whistle'], lounge: ['Lounge', 'Retro 50s swing: vibes, walking bass, brushes'], porch: ['Porch', 'Banjo, boom-chick guitar and harmonica'] };   /* 3D.51 */
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
  if (!s.cls) { s.cls = { [s.job]: { l: s.l || 1, xp: s.mastery || 0 } }; } if (!s.skills) s.skills = []; learnSkills(s, true); syncClass(s); { const m = baseMax(s); if (m > s.max) { s.hp += m - s.max; s.max = m; } }   /* V2.12 save upgrade: class levels + earned skills */
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

/* ---------------- V3D.25 loot rarity, the crate-style loot reveal, and the Stash ---------------- */
const RARITY = { common: { n: 'Common', c: '#c9b8a4', o: 0 }, uncommon: { n: 'Uncommon', c: '#7cc95a', o: 1 }, rare: { n: 'Rare', c: '#5aa8f0', o: 2 }, epic: { n: 'Epic', c: '#b072f0', o: 3 } };
const RES_RAR = { food: 'common', water: 'common', wood: 'common', stone: 'common', mat: 'common', cloth: 'uncommon', meds: 'rare', fuel: 'rare', ammo: 'uncommon' };
const itemRar = (id) => { const c = (ITEMS[id] && ITEMS[id].cost) || 1; return c >= 13 ? 'epic' : c >= 9 ? 'rare' : c >= 5 ? 'uncommon' : 'common'; };
function lootEntries(loot, items) {   // resources + items, rarest last so the reveal builds up
  const e = Object.entries(loot || {}).filter(([, v]) => v > 0).map(([k, v]) => ({ icon: RES_ICON[k] || '•', name: RES_TITLE[k] || k, n: Math.round(v), rar: RES_RAR[k] || 'common' }));
  for (const id of items || []) if (ITEMS[id]) e.push({ item: id, name: ITEMS[id].name, n: 1, rar: itemRar(id) });
  return e.sort((a, b) => RARITY[a.rar].o - RARITY[b.rar].o);
}
function addLoot(loot, why) {   // into the stockpile, within caps
  for (const [k, v] of Object.entries(loot || {})) { if (!v) continue; const cap = k === 'food' || k === 'water' ? supplyCap() : resCap(k); const got = Math.max(0, Math.min(v, cap - (S[k] || 0))); S[k] = (S[k] || 0) + got; if (ECO.cur && ECO.cur[k]) flow(k, why, got); }
}
let revealCss = false;
function lootReveal(o) {   // { title, sub, entries, note, best }: cards flip in one at a time; rare ones shine
  if (!revealCss) { revealCss = true; const st = document.createElement('style'); st.textContent = `
#lootRev{position:fixed;inset:0;z-index:60;display:flex;align-items:center;justify-content:center;background:rgba(30,20,12,.55);animation:lrFade .25s}
#lootRev .lrBox{width:min(92vw,420px);max-height:86vh;overflow:auto;background:#fff8ec;border:3px solid #5a3f31;border-radius:22px;padding:14px 14px 12px;box-shadow:0 8px 0 rgba(0,0,0,.25);text-align:center;font-family:Fredoka,Nunito,sans-serif;color:#5a3f31}
#lootRev h3{margin:2px 0 0;font-family:'Lilita One',Fredoka,sans-serif;font-size:24px;letter-spacing:.5px}
#lootRev .lrSub{font-size:13px;opacity:.75;margin-bottom:8px}
#lootRev .lrGrid{display:grid;grid-template-columns:repeat(3,1fr);gap:8px;perspective:600px}
#lootRev .lrCard{position:relative;border:3px solid var(--rc);border-radius:14px;background:#fff;padding:8px 4px 6px;opacity:0;transform:rotateY(90deg) scale(.6);animation:lrFlip .45s cubic-bezier(.2,1.5,.4,1) forwards;overflow:hidden;box-shadow:0 0 0 0 var(--rc)}
#lootRev .lrCard .ic{font-size:30px;line-height:38px;height:40px;display:flex;align-items:center;justify-content:center}
#lootRev .lrCard .nm{font-size:12px;font-weight:600;line-height:1.1;min-height:26px}
#lootRev .lrCard .n{font-size:18px;font-weight:700}
#lootRev .lrCard .rr{font-size:10px;font-weight:700;color:var(--rc);text-transform:uppercase;letter-spacing:.6px}
#lootRev .lrCard.r2,#lootRev .lrCard.r3{animation:lrFlip .5s cubic-bezier(.2,1.5,.4,1) forwards,lrGlow 1.6s ease-in-out infinite alternate}
#lootRev .lrCard.r2::after,#lootRev .lrCard.r3::after{content:'';position:absolute;top:-30%;left:-60%;width:40%;height:160%;background:linear-gradient(90deg,transparent,rgba(255,255,255,.85),transparent);transform:rotate(18deg);animation:lrShine 2.2s ease-in-out infinite;animation-delay:inherit}
#lootRev .lrNote{text-align:left;font-size:12.5px;margin:10px 2px 6px;max-height:120px;overflow:auto;opacity:.85}
#lootRev button{margin-top:8px;font:inherit;font-size:18px;font-weight:700;padding:8px 28px;border-radius:99px;border:3px solid #5a3f31;background:#8fc46a;color:#fff;box-shadow:0 4px 0 #5a3f31}
@keyframes lrFlip{to{opacity:1;transform:none}}
@keyframes lrGlow{from{box-shadow:0 0 0 0 var(--rc)}to{box-shadow:0 0 14px 3px var(--rc)}}
@keyframes lrShine{0%{left:-60%}60%,100%{left:130%}}
@keyframes lrFade{from{opacity:0}}`; document.head.appendChild(st); }
  const old = document.getElementById('lootRev'); if (old) old.remove();
  const el = document.createElement('div'); el.id = 'lootRev'; const E = o.entries || [], step = Math.max(.12, Math.min(.32, 2.4 / Math.max(1, E.length)));
  const best = E.reduce((a, e) => Math.max(a, RARITY[e.rar].o), 0);
  el.innerHTML = `<div class="lrBox"><h3>${esc(o.title || 'LOOT')}</h3><div class="lrSub">${o.sub || ''}${E.length ? ` · best find: <b style="color:${Object.values(RARITY)[best].c}">${Object.values(RARITY)[best].n}</b>` : ''}</div>`
    + (E.length ? `<div class="lrGrid">${E.map((e, i) => `<div class="lrCard r${RARITY[e.rar].o}" style="--rc:${RARITY[e.rar].c};animation-delay:${(i * step).toFixed(2)}s${RARITY[e.rar].o >= 2 ? `,${(i * step).toFixed(2)}s` : ''}"><div class="ic">${e.item ? itemIcon(e.item) : e.icon}</div><div class="n">${e.item ? '' : '+' + e.n}</div><div class="nm">${esc(e.name)}</div><div class="rr">${RARITY[e.rar].n}</div></div>`).join('')}</div>` : '<div class="lrSub">Nothing found this time.</div>')
    + (o.note ? `<div class="lrNote">${o.note}</div>` : '') + `<button id="lrOk">Collect</button></div>`;
  document.body.appendChild(el); if (window.ZHIcons) ZHIcons.swap(el);
  E.forEach((e, i) => setTimeout(() => SFX(RARITY[e.rar].o >= 2 ? 'chime' : 'coin'), (i * step + .2) * 1000));
  el.querySelector('#lrOk').onclick = () => { el.remove(); SFX('reward'); if (o.onClose) o.onClose(); };
}
function showStash() {   /* every resource, how much room there is, and where more comes from */
  endBuildMode(true); closeP(); $('it').textContent = 'STASH';
  const WHERE = { food: 'Garden Plots, farms; Abandoned Houses trips', water: 'Rain Barrels and Collectors, wells', wood: 'chopping trees, a Lumber Camp; Lumber Yard trips', stone: 'breaking rocks, a Quarry; Old Quarry trips',
    mat: 'salvaging wrecks, the Scrapyard, zombie bags; Warehouse trips', cloth: 'clothes bins past the walls; Abandoned Houses trips; some zombies', meds: 'Pharmacy trips, bloated and spitter zombies, supply drops', fuel: 'Gas Station trips, siphoning wrecks, raiders, supply drops' };
  const row = (k) => { const cap = k === 'food' || k === 'water' ? supplyCap() : k === 'mat' ? 0 : resCap(k), v = Math.floor(S[k] || 0); return `<div class="card" style="padding:7px 10px"><div class="row" style="gap:8px"><span style="font-size:22px">${RES_ICON[k]}</span><span class="sp"><b>${RES_TITLE[k]}</b> <small style="color:${RARITY[RES_RAR[k]].c};font-weight:700">${RARITY[RES_RAR[k]].n}</small><br><small>${WHERE[k]}</small></span><b>${v}${cap ? ' / ' + cap : ''}</b></div></div>`; };
  const inv = Object.entries(S.inv || {}).filter(([id, n]) => n > 0 && ITEMS[id]);
  $('ib').innerHTML = `<div class="sm" style="margin-bottom:6px">Storage buildings (Supply Crates → Storehouse → Warehouse) hold more of everything.</div>` + ['food', 'water', 'wood', 'stone', 'mat', 'cloth', 'meds', 'fuel'].map(row).join('')
    + `<div class="card"><b>Gear in the stash</b>${inv.length ? inv.map(([id, n]) => `<div class="row" style="gap:6px"><span class="sp">${esc(ITEMS[id].name)}${n > 1 ? ' ×' + n : ''}</span><small style="color:${RARITY[itemRar(id)].c};font-weight:700">${RARITY[itemRar(id)].n}</small></div>`).join('') : '<div class="sm">Nothing spare.</div>'}</div>`;
  showPanel('Stash');
}
/* ---------------- expeditions (V2.8): a squad leaves the map for a timed trip in real time ---------------- */
// Trips run on the real clock (Date.now), so they keep going while the game is closed; the town itself pauses while closed.
const EXP_DEFS = {
  houses:    { name: 'Abandoned Houses',   icon: '🏚️', desc: 'Food, water and cloth from empty homes.',          risks: ['low'],             lock: () => '', loot: { food: [1, 2], water: [1, 2], cloth: [1, 2] }, lines: ['The squad searches a row of empty houses.', 'They check cellars and cupboards.', 'A quiet street, a few useful cans.'] },
  pharmacy:  { name: 'Pharmacy and Clinic', icon: '🏥', desc: 'Medicine, a little scrap, and a chance to find survivors.', risks: ['low', 'medium'], lock: () => (world.walls.size ? '' : 'Build a wall first'), loot: { meds: [1, 2], mat: [1, 2] }, recruit: { low: .3, medium: .55 }, lines: ['The squad forces the pharmacy shutters.', 'Shelves are mostly bare, but the back room is intact.', 'They hear someone calling from the clinic.'] },
  lumberyard: { name: 'Lumber Yard', icon: '🪵', desc: 'Stacks of cut timber: wood, and lots of it.', risks: ['low', 'medium'], lock: () => '', loot: { wood: [3, 5] }, lines: ['The squad pries open the yard gate.', 'They load cut planks and logs onto a cart.', 'A sawmill shed still holds dry timber.'] },   /* V3D.23 */
  gasstation: { name: 'Gas Station', icon: '⛽', desc: 'Fuel from the underground tanks, and scrap from the garage.', risks: ['medium', 'high'], lock: () => (hqTier() >= 2 ? '' : 'Needs the Lodge'), loot: { fuel: [2, 4], mat: [1, 2] }   /* 3D.131 owner: more fuel (was 1-3): towns owned a Pickup and a Van and could rarely afford a trip */, lines: ['The squad rigs a hand pump over the tank hatch.', 'Jerrycans fill slowly; the noise carries.', 'The garage still has tools on the wall.'] },   /* V3D.25 */
  military: { name: 'Military Checkpoint', icon: '🪖', desc: 'Dangerous, but rich: a bit of everything and good gear.', risks: ['high'], lock: () => (S.rank >= 3 ? '' : 'Needs Haven level 7'), loot: { mat: [2, 4], meds: [1, 2], fuel: [1, 2], cloth: [1, 2], ammo: [6, 10] }, gear: 2.5, lines: ['Sandbags and an overturned truck block the road.', 'The squad works through the supply tents one by one.', 'A radio crackles in an empty guard hut.'] },
  quarrysite: { name: 'Old Quarry', icon: '🪨', desc: 'Cut stone blocks left behind: stone for the stone tier.', risks: ['medium', 'high'], lock: () => (hqTier() >= 2 ? '' : 'Needs the Lodge'), loot: { stone: [3, 5] }, lines: ['The squad climbs down into the old quarry.', 'They lever cut blocks onto a sled.', 'Something moves in the flooded pit below.'] },
  clinic:   { name: 'The Overrun Clinic', icon: '🏚', desc: 'A stronghold: the old clinic, packed with the dead. Clear it and raise a Banner over the Haven.', risks: ['high'], lock: () => ((S.lvl || 1) >= 3 ? '' : 'Needs Haven level 3'),   /* 3D.128 was 4: the first stronghold comes early */ loot: { meds: [2, 3], mat: [2, 3], cloth: [1, 2] }, gear: 2, stronghold: true, lines: ['The squad breaks into the clinic lobby. Dozens of shapes turn.', 'Ward by ward, they clear the ground floor.', 'In the operating theatre, something huge is waiting.'] },   /* 3D.104 first pass of the strongholds: a hard expedition that earns the Stronghold Banner */
  mall:     { name: 'Shopping Mall', icon: '🛒', desc: 'A loot run through the dead mall: cloth, food, scrap and the odd piece of gear. Noisy.', risks: ['medium', 'high'], lock: () => ((S.lvl || 1) >= 6 ? '' : 'Needs Haven level 6'), loot: { cloth: [2, 4], food: [2, 4], mat: [2, 3] }, gear: 1.5, lines: ['The squad slips in through the loading bay.', 'Shop after shop: some picked clean, some untouched.', 'The food court is full of the dead.'] },   /* 3D.104 */
  prison:   { name: 'Blackgate Prison', icon: '⛓', desc: 'A stronghold: the prison yard is a fortress of the dead. Clear it and raise a Banner.', risks: ['high'], lock: () => ((S.lvl || 1) >= 9 ? '' : 'Needs Haven level 9'), loot: { mat: [3, 5], ammo: [8, 14], cloth: [1, 2] }, gear: 3, stronghold: true, lines: ['The squad cuts through the outer fence.', 'Cell block by cell block, the doors grind open.', 'In the yard, the warden waits, still in uniform.'] },   /* 3D.104 a second stronghold */
  /* 3D.111 Endgame C: seasonal strongholds, from Haven level 15. One per season (7 days), cleared once per season. */
  sh_spring: { name: 'The Drowned Greenhouse', icon: '🌱', desc: 'A seasonal stronghold: the flooded glasshouses at the edge of town. Spring only.', risks: ['high'], lock: () => seasonLock('spring'), loot: { food: [3, 5], meds: [2, 3], cloth: [2, 3] }, gear: 3, stronghold: true, lines: ['The squad wades in.'] },
  sh_summer: { name: 'The Burning Refinery', icon: '☀️', desc: 'A seasonal stronghold: the refinery has smouldered for years. Summer only.', risks: ['high'], lock: () => seasonLock('summer'), loot: { fuel: [3, 5], mat: [3, 5], ammo: [8, 12] }, gear: 3, stronghold: true, lines: ['Heat shimmers over the tanks.'] },
  sh_autumn: { name: 'The Harvest Fair', icon: '🍂', desc: 'A seasonal stronghold: the old county fairground. Autumn only.', risks: ['high'], lock: () => seasonLock('autumn'), loot: { food: [4, 6], cloth: [2, 4], wood: [4, 6] }, gear: 3, stronghold: true, lines: ['Rides creak in the wind.'] },
  sh_winter: { name: 'The Frozen Depot', icon: '❄️', desc: 'A seasonal stronghold: a snowed-in army depot. Winter only.', risks: ['high'], lock: () => seasonLock('winter'), loot: { mat: [4, 6], stone: [3, 5], ammo: [10, 14] }, gear: 3.5, stronghold: true, lines: ['Snow drifts against the hangar doors.'] },
  raid_toll: { name: "Raid: the Toll Kings' fort", icon: '👑', desc: 'Hit the Toll Kings where they live: a truck yard fort on the highway. Break what you like, loot what you can carry, and get out through the gate.', risks: ['high'], lock: () => { const f = (S.fac || {}).toll; return !f || !f.met ? 'Meet the Toll Kings first' : f.goneUntil > S.day ? `They are scattered until day ${f.goneUntil}` : f.raidUntil > S.day ? `On high alert after the last raid: wait until day ${f.raidUntil}` : ''; }, loot: { mat: [4, 6], fuel: [1, 3], ammo: [6, 10] }, gear: 2, stronghold: true, raid: true, lines: ['The squad creeps up on the fort.'] },
  raid_green: { name: 'Raid: Greenwater Commune', icon: '🌿', desc: 'Greenwater is soft and well fed. Raiding them ends any friendship for good.', risks: ['high'], lock: () => { const f = (S.fac || {}).green; return !f || !f.met ? 'Meet Greenwater first' : f.goneUntil > S.day ? `They are scattered until day ${f.goneUntil}` : f.raidUntil > S.day ? `On high alert after the last raid: wait until day ${f.raidUntil}` : ''; }, loot: { food: [5, 8], water: [3, 5], cloth: [2, 3] }, gear: 1, stronghold: true, raid: true, lines: ['The squad slips past the orchard.'] },
  warehouse: { name: 'Warehouse District', icon: '🏭', desc: 'Scrap, and plenty of it.',                  risks: ['medium', 'high'],  lock: () => (S.rank >= 3 ? '' : 'Needs Haven level 7'), loot: { mat: [3, 5] }, lines: ['The squad slips between loading docks.', 'Crates of hardware, half of it salvageable.', 'A forklift pins a stack of steel; they cut it free.'] },
};
const seasonIdx = () => Math.floor((S.day - 1) / SEASON_DAYS);
function seasonLock(id) { if ((S.lvl || 1) < 15 && !QS.get('season')) return 'Needs Haven level 15'; if (seasonOf().id !== id) return `Only in ${SEASONS.find((x) => x.id === id).name}`; if ((S.shSeason || {})['sh_' + id] === seasonIdx()) return 'Cleared this season'; return ''; }
const EXP_RISK = { low: { label: 'Low', min: 5, mult: 1, death: .005, hurt: .10 }, medium: { label: 'Medium', min: 15, mult: 2.5, death: .017, hurt: .22 }, high: { label: 'High', min: 30, mult: 5, death: .04, hurt: .38 } };
/* V3D.18 DV2-style exploration: trips run on game time (pause and speed apply) and are short: 2 / 3 / 5 game hours.
   They are only possible when a lead comes in (mornings and afternoons, each lasts ~10 hours); the squad walks a bar at the bottom of the screen. */
const EXP_HMS = 1000 * 1000 / 60, expNow = () => S.expClock || 0, EXP_HOURS = { low: 2, medium: 3, high: 5 };
const EXP_STAGES = 3, EXP_MAX_SQUAD = 4, EXP_HOME_MIN = 2, EXP_COST = { low: 1, medium: 2, high: 4 }, EXP_BACK_DEATH = .003;
const expKind = (s) => (['Guard', 'Police Officer'].includes(s.job) ? 'guard' : s.job === 'Medic' ? 'medic' : s.job === 'Scavenger' ? 'scav' : 'other');
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
function expSafety(ms) { return ms.reduce((a, s) => a + 1 + .08 * (s.l || 1) + .05 * (professions[s.job]?.combat || 0) + .03 * weaponOf(s).atk / 10 + .02 * (((itemOf(s, 'armor') || {}).def) || 0) + (s.pet && s.pet.kind === 'dog' ? .06 : 0) + (hasSpec(s, 'ranger') ? .1 : 0), 0) / (ms.length || 1) + (townHyb('pathfinder') ? .08 : 0) + (townHyb('tracker') ? .08 : 0); }   /* 3D.104 a dog scouts ahead */
const expTraitLoot = (ms) => (1 + .15 * ms.filter((m) => hasT(m, 'scrounger')).length) * (ms.length <= 2 ? 1 + .25 * ms.filter((m) => hasT(m, 'loner')).length : 1);   /* V2.43 */
const expRiskMult = (t) => Math.min(1.6, Math.max(.5, 1.3 / expSafety(t.members))) * (t.short ? 1.5 : 1) * vehSafe(t);   /* 3D.109 the Armored Van */
function expPreview(destId, riskId, members) {
  const d = EXP_DEFS[destId], rk = EXP_RISK[riskId], n = members.length, need = EXP_COST[riskId] * n, short = S.food < need || S.water < need;
  const kinds = new Set(members.map(expKind).filter((k) => k !== 'other')).size, avgL = n ? members.reduce((a, s) => a + (s.l || 1), 0) / n : 1;
  const mult = rk.mult * (1 + .12 * Math.max(0, kinds - 1)) * (1 + .04 * (avgL - 1)) * expTraitLoot(members);
  const rm = n ? Math.min(1.6, Math.max(.5, 1.3 / expSafety(members))) * (short ? 1.5 : 1) : 1;
  return { need, short, mult, deathPerStage: rk.death * rm, hurtPerStage: rk.hurt * rm, minutes: rk.min };
}
const LEAD_TEXT = { mall: ['Someone saw lights in the old mall: the shops were never emptied'], prison: ['Blackgate Prison: the guards locked themselves in with the dead. Whoever clears it takes the armoury'], clinic: ['Smoke over the old clinic: the dead are packed inside, and so is the medicine', 'A radio voice: "the clinic is overrun, whoever clears it is a hero"'], houses: ['A scout saw a quiet street of empty houses', 'Someone spotted canned food in a row of houses', 'The radio mentions an untouched cul-de-sac'], pharmacy: ['Smoke stopped rising over the old pharmacy', 'A light blinked in the clinic window', 'The pharmacy shutters were seen half open'], warehouse: ['A loading door at the warehouses was left open', 'Trucks were abandoned at the depot', 'The radio talks of a sealed scrap store'] };
function leadsTidy() { const h = nowH(); S.leads = (S.leads || []).filter((l) => l.untilH > h); }
function leadsHour() {   /* hourly: new leads at 7:00 and 15:00 (not every time), at most two waiting; the first one comes on day 1 */
  leadsTidy(); const first = !S.leadSeen && S.day === 1 && S.hour === 9; if (!first && ![7, 15].includes(S.hour)) return; if ((S.leads || []).length >= 2 || (!first && rnd() > .7)) return;
  const opts = Object.keys(EXP_DEFS).filter((k) => !expLocked(k) && !EXP_DEFS[k].raid), wantB = needsBanner() && !bannersFree() && opts.includes('clinic') && !(S.leads || []).some((l) => l.dest === 'clinic'), seas = opts.find((k) => k.startsWith('sh_') && !(S.leads || []).some((l) => l.dest === k)), dest = first ? 'houses' : wantB && rnd() < .6 ? 'clinic' : seas && rnd() < .5 ? seas : opts[Math.floor(rnd() * opts.length)], d = EXP_DEFS[dest], risk = d.risks[Math.floor(rnd() * d.risks.length)];
  const T = LEAD_TEXT[dest] || ['A new place to search']; S.leadSeen = true;
  (S.leads ||= []).push({ id: 'l' + S.day + '_' + S.hour, dest, risk, text: T[Math.floor(rnd() * T.length)], untilH: nowH() + 10 });
  banner(`🧭 New lead: ${d.name}`); logEvent(`New lead: ${d.name} (${EXP_RISK[risk].label} risk, ${EXP_HOURS[risk]} h trip). Open Explore to send a squad. It's gone in about 10 hours.`, 'important'); ui();
}
function expLocked(destId) { return EXP_DEFS[destId].lock(); }
function startExpedition(destId, riskId, ids) {
  const d = EXP_DEFS[destId], rk = EXP_RISK[riskId]; if (!d || !rk) return { ok: false, why: 'Unknown trip' };
  if (S.trip) return { ok: false, why: 'A squad is already out' }; if (S.sh) return { ok: false, why: 'A squad is inside a stronghold' }; const r0 = startExpedition0(destId, riskId, ids); if (r0 && r0.ok) statAdd('exp'); return r0; }
function startExpedition0(destId, riskId, ids) {
  const d = EXP_DEFS[destId], rk = EXP_RISK[riskId];
  const lock = expLocked(destId); if (lock) return { ok: false, why: lock };
  if (!d.risks.includes(riskId)) return { ok: false, why: d.name + ' only offers ' + d.risks.map((r) => EXP_RISK[r].label).join(' / ') + ' trips' };
  const ms = (ids || []).map((id) => S.sv.find((q) => q.id === id)).filter(Boolean);
  if (!ms.length) return { ok: false, why: 'Pick at least one survivor' }; if (ms.length > expMax()) return { ok: false, why: 'A squad is at most ' + expMax() };
  if (S.sv.length - ms.length < EXP_HOME_MIN) return { ok: false, why: `Keep at least ${EXP_HOME_MIN} survivors at home` };
  if (ms.some((q) => q.hp <= 0 || ['down', 'hospital', 'rescueTo', 'rescueCarry'].includes(q.mode))) return { ok: false, why: (ms.find((q) => q.hp <= 0 || ['down', 'hospital', 'rescueTo', 'rescueCarry'].includes(q.mode)) || {}).name + ' is hurt or busy' };
  const pv = expPreview(destId, riskId, ms), take = (k, n) => { const g = Math.min(S[k], n); S[k] -= g; return g; };
  if ((d.stronghold) && SH_DEFS[destId]) { if (S.sh) return { ok: false, why: 'A squad is already inside a stronghold' }; take('food', pv.need); take('water', pv.need); return startStronghold(destId, ids, { goal: expSel.goal }); }   /* 3D.108 */
  take('food', pv.need); take('water', pv.need);
  for (const q of ms) { releasePost(q); for (const z of S.z) if (z.target === q) { z.target = null; z.mode = 'idle'; } if (selected && selected.ref === q) { selected = null; closeP(); } }
  S.sv = S.sv.filter((q) => !ms.includes(q));
  S.trip = { dest: destId, risk: riskId, t0: expNow(), dur: ((EXP_HOURS[riskId] * EXP_HMS)), stage: 0, phase: 'out', backAt: 0, short: pv.short, members: ms.map(expPlain), loot: { food: 0, water: 0, mat: 0, wood: 0, stone: 0, cloth: 0, meds: 0, fuel: 0 }, log: [`Departed for ${d.name} (${rk.label} risk).` + (pv.short ? ' Short on supplies: the trip is riskier.' : '')], lost: [], hurt: [], troubleSeen: 0 };
  ms.forEach((q) => { const m = S.trip.members.find((x) => x.id === q.id); m.mode = 'away'; }); vehDepart(S.trip, expSel.veh);   /* 3D.109 */
  autoStaff(); barkSomeone('farewell', { dest: d.name }, { pri: 1 }); say(`${ms.map((q) => q.name).join(', ')} left for ${d.name}.`, true); saveGame(); ui(); expTick(); return { ok: true, why: '' };
}
const expStageAt = (t, k) => t.t0 + k * t.dur / EXP_STAGES;
function expResolveStage(t, quiet) {
  t.stage++; const d = EXP_DEFS[t.dest], rk = EXP_RISK[t.risk], ms = t.members; vehStage(t); if (t.stage >= EXP_STAGES) vehFind(t);
  const kinds = new Set(ms.map(expKind).filter((k) => k !== 'other')).size, avgL = ms.reduce((a, s) => a + (s.l || 1), 0) / (ms.length || 1), f = rk.mult * (1 + .12 * Math.max(0, kinds - 1)) * (1 + .04 * (avgL - 1)) * (1 + .15 * ms.filter((m) => hasSkill(m, 'lootSense')).length) * (1 + .2 * ms.filter((m) => hasSkill(m, 'treasureHunter')).length) * expTraitLoot(ms) * vehLoot(t);
  const got = [], r = (a) => a[0] + Math.floor(Math.random() * (a[1] - a[0] + 1));
  for (const k in d.loot) { const n = Math.max(1, Math.round(r(d.loot[k]) * f)); t.loot[k] = (t.loot[k] || 0) + n; got.push(`${n} ${RES_NAME[k] || k}`); }
  if (Math.random() < .2 * Math.sqrt(rk.mult) * (d.gear || 1) * (ms.some((m) => hasSkill(m, 'treasureHunter')) ? 2 : 1)) { const pool = ['gloves', 'belt', 'shoes', 'goggles', 'glasses', 'charm', 'backpack', 'hikerpack', 'watch', 'walkie', 'medpouch', 'raincoat', 'firecoat', 'hazmat', 'ghillie', 'tactcap', 'gasmask', 'shovel', 'roadsign', 'leather', 'hockey', 'biker', 'crowbar', 'nailbat', 'machete', 'spear', 'axe', 'bow', 'revolver', 'riot', 'kevlar', 'rifle', 'shotgun', 'plate', 'dogtags', 'katana', 'smg', 'military', 'assault'], id = pool[Math.floor(Math.random() * Math.min(pool.length, 7 + Math.round(rk.mult * 1.3)))]; t.items = (t.items || []).concat(id); got.push(ITEMS[id].name); }   /* V2.14: gear finds */
  const rm = expRiskMult(t); let trouble = [];
  for (const m of [...ms]) {
    const x = Math.random(), tm = hasT(m, 'cautious') ? .7 : 1, dead = rk.death * rm * tm, collapse = rk.hurt * rm * .35 * tm, hurt = rk.hurt * rm * tm;
    if (x < dead) { ms.splice(ms.indexOf(m), 1); t.lost.push(m.name); t.log.push(`Stage ${t.stage}: ${m.name} did not make it.`); trouble.push(`${m.name} was lost`); }
    else if (x < dead + collapse) { m.hp = 0; m.collapsed = true; t.log.push(`Stage ${t.stage}: ${m.name} collapsed and is being carried.`); trouble.push(`${m.name} collapsed`); }
    else if (x < dead + collapse + hurt && !m.collapsed) { m.hp = Math.max(1, Math.round(m.hp * (.3 + Math.random() * .3))); t.log.push(`Stage ${t.stage}: ${m.name} was hurt.`); trouble.push(`${m.name} was hurt`); if (!t.hurt.includes(m.name)) t.hurt.push(m.name); }
  }
  t.log.splice(Math.max(1, t.log.length - trouble.length), 0, `Stage ${t.stage}: ${d.lines[Math.floor(Math.random() * d.lines.length)]} Found ${got.join(' and ')}.`); t.lastGot = got.slice(0, 2);
  if (!ms.length) { t.log.push('Nobody came back.'); return 'wiped'; }
  if (t.enc) encResolve(t, null);   /* V2.44: no order came during the last stage */
  if (t.stage < EXP_STAGES && encLive(t).length && Math.random() < EXP_ENC_CHANCE && expEncounter(t)) { if (quiet) encResolve(t, null); else encPopup(t); }
  if ((trouble.length && !quiet && t.stage < EXP_STAGES)) banner(`⚠ ${trouble.join(', ')} · tap the trip bar to recall`);
  else if (trouble.length && !quiet && t.stage < EXP_STAGES) showEventPopup({ title: 'SQUAD IN TROUBLE', text: `${trouble.join(', ')} on stage ${t.stage} of ${EXP_STAGES}. Recall the squad now, or keep going?`, buttons: [{ label: 'RECALL', fn: () => expRecall() }, { label: 'KEEP GOING' }] });
  return trouble.length ? 'trouble' : 'ok';
}
/* ---- V2.44 expedition choices: at the end of stage 1 or 2 the squad may meet a situation with 2–3 options. Each option shows who would do it and the
   chance, worked out from stats, gear, profession and personality. If no order comes before the next stage (or the game is closed) the squad decides itself. ---- */
const STAT_ABBR = { str: 'STR', end: 'END', agi: 'AGI', per: 'PER', int: 'INT', cha: 'CHA' };
const EXP_ENC = {
  door: { title: '🚪 A BARRICADED STORE', text: 'Chained shutters on a corner shop. Whatever is inside has not been looted.', opts: [
    { id: 'force', label: 'Force the shutters', chk: 'str', job: { Engineer: .1, Guard: .05 }, win: { mat: [2, 3] }, fail: 'hurt', winT: '{who} wrenched the shutters open: {got}.', failT: 'The chain snapped back and caught {who}.' },
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
    { id: 'pry', label: 'Pry the door off', chk: 'str', job: { Engineer: .12 }, win: { mat: [2, 4] }, fail: 'none', winT: '{who} pried it open and stripped the van: {got}.', failT: 'The door would not move. Nothing lost.' },
    { id: 'leave', label: 'Leave it', safe: true, winT: 'The squad left the van alone.' }] },
  stranger: { title: '🤒 A SICK STRANGER', text: 'A feverish man sits by a burnt-out car, clutching a backpack.', opts: [
    { id: 'treat', label: 'Treat him', chk: 'int', job: { Medic: .2 }, tr: { caring: .1 }, win: { item: 1, ren: 3 }, fail: 'none', winT: '{who} brought the fever down. He gave them {got}.', failT: 'There was nothing {who} could do. Nothing lost.' },
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
    for (const k of ['food', 'water', 'mat']) if (o.win[k]) { const n = r(o.win[k]); t.loot[k] = (t.loot[k] || 0) + n; got.push(`${n} ${RES_NAME[k] || k}`); }
    if (o.win.item) { const pool = ['crowbar', 'machete', 'leather', 'hockey', 'goggles', 'charm', 'spear', 'axe', 'riot', 'revolver', 'kevlar', 'shotgun', 'strawhat', 'army', 'football'], id = pool[Math.floor(Math.random() * Math.min(pool.length, 4 + Math.round(rk.mult * 1.6)))]; t.items = (t.items || []).concat(id); got.push(ITEMS[id].name); }
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
function tripUpdate(now = (expNow())) {
  const t = S.trip; if (!t) return;
  if (t.phase === 'out') {
    let guard = 0; while (t.phase === 'out' && t.stage < EXP_STAGES && now >= expStageAt(t, t.stage + 1) && guard++ < 5) { const res = expResolveStage(t, now - expStageAt(t, t.stage + 1) > ((3 * EXP_HMS))); if ((res !== 'wiped')) t.fx = { stage: t.stage, at: now, bad: res === 'trouble', got: t.lastGot }; if (res === 'wiped') { expFinish(false); return; } }
    if (t.phase === 'out' && t.stage >= EXP_STAGES) { t.phase = 'back'; t.home = true; t.backFrom = now; t.backPos = 1; t.backAt = now + t.dur * .3; t.log.push('Heading home with the loot.'); }
  } else if (t.phase === 'back' && now >= t.backAt) expFinish(!t.home);
}
function expRecall() {
  const t = S.trip; if (!t || t.phase !== 'out') return false; const now = (expNow()), back = (Math.max(.4 * EXP_HMS, (now - t.t0) * .5));
  t.phase = 'back'; t.backAt = now + back; t.backFrom = now; t.backPos = Math.min(1, (now - t.t0) / t.dur); if (t.enc) { t.enc = null; t.log.push('The squad left the situation behind.'); } t.log.push(`Recalled during stage ${t.stage + 1}. Loot from finished stages is kept; walking home.`); say('The squad is on its way home.', true); saveGame(); ui(); return true;
}
function expFinish(recalled) {
  const t = S.trip; if (!t) return; if (t.enc) { if (recalled) { t.enc = null; t.log.push('The squad left the situation behind on the way home.'); } else encResolve(t, null); } S.expCount = (S.expCount || 0) + 1; const d = EXP_DEFS[t.dest], rk = EXP_RISK[t.risk], lines = [];
  if (recalled) for (const m of [...t.members]) if (Math.random() < EXP_BACK_DEATH * expRiskMult(t)) { t.members.splice(t.members.indexOf(m), 1); t.lost.push(m.name); t.log.push(`${m.name} fell on the way home.`); }
  (t.items || []).forEach((id) => stashAdd(id)); const cap = supplyCap(); S.food = keepCap(cap, S.food, t.loot.food); S.water = keepCap(cap, S.water, t.loot.water); S.mat += t.loot.mat; addLoot({ wood: t.loot.wood, stone: t.loot.stone, cloth: t.loot.cloth, meds: t.loot.meds, fuel: t.loot.fuel, ammo: t.loot.ammo }, 'Expedition'); S.produced += t.loot.food + t.loot.water;
  const entry = (() => { for (const w of world.walls.values()) if (w.type === 'gate' && w.y < Wd.BUILD.y0) return tc(w.x, w.y + 1); return tc(7 + OFF, 7 + OFF); })();
  barkSquad = { ids: t.members.map((m) => m.id), lost: (t.lost || []).length, at: tick + 90 };
  if (t.ren) renownGain(t.ren, 'Expedition'); t.members.forEach((m, i) => { if (m.hp > 0) gainXp(m, 3 * Math.max(1, t.stage) + (m.xpB || 0)); delete m.xpB; m.w = { x: entry.x + (i - 1) * .3, y: entry.y + (i % 2) * .3 }; delete m.collapsed; if (m.hp > 0) m.mode = 'free'; else { m.mode = 'down'; } m.cool = 20; m.stateTicks = 60; const o = { ...m }; relinkSurvivor(o); o.why = m.hp <= 0 ? 'Collapsed — needs rescue' : 'Back from the expedition'; S.sv.push(o); });
  let recruit = null; const tot = Object.entries(t.loot).filter(([, v]) => v).map(([k, v]) => `${v} ${RES_NAME[k] || k}`).concat((t.items || []).map((id) => ITEMS[id].name));
  if (t.members.length && S.sv.length + (S.kids || []).length < popCap() && (t.recruitNow || (d.recruit && t.stage >= EXP_STAGES && S.sv.length < 10 && Math.random() < d.recruit[t.risk]))) {
    const names = ['Noah', 'Maya', 'Eli', 'June', 'Rosa', 'Theo', 'Iris', 'Omar'], nm = names.find((n) => !S.sv.some((s) => s.name === n)) || freeFirst(), jobs = ['Civilian', 'Scavenger', 'Guard', 'Medic', 'Farmer', 'Engineer', 'Cook', ...(hqTier() >= 2 ? ['Mechanic'] : [])], jb = jobs[Math.floor(Math.random() * jobs.length)];
    recruit = mk(nm, jb, 1, entry.x, entry.y + .6, S.sv.length); recruit.sat = 3; recruit.stateTicks = 80; recruit.src = 'trip'; S.sv.push(recruit); t.log.push(`${nm}, a ${jb} (${TRAITS[recruit.trait].icon} ${TRAITS[recruit.trait].name}), was found and followed the squad home.`);
  }
  if (t.dest === 'military' && !recalled && t.stage >= EXP_STAGES && exAdd('grenade', 1)) t.log.push('They found a grenade in an ammo crate.');
  if (d.stronghold && !recalled && t.stage >= EXP_STAGES && t.members.some((m) => m.hp > 0)) { t.log.push(`${d.name} is cleared. The squad brings home a Banner.`); setTimeout(() => earnBanner('stronghold', `The squad cleared ${d.name}.`), 400); }
  const body = t.log.map((l) => esc(l)).join('<br>') + `<br><b>Returned:</b> ${t.members.map((m) => esc(m.name)).join(', ') || 'nobody'}.` + (t.lost.length ? `<br><b style="color:#ff8a7a">Lost:</b> ${t.lost.map(esc).join(', ')}.` : '');
  S.lastTrip = { dest: t.dest, risk: t.risk, loot: t.loot, lost: t.lost.slice(), recalled: !!recalled, recruit: recruit && recruit.name };
  vehReturn(t); S.trip = null; autoStaff(); if ((!window.ZH_NO_REVEAL)) lootReveal({ title: 'EXPEDITION BACK', sub: `${d.icon} ${d.name} · ${rk.label} risk`, entries: lootEntries(t.loot, t.items), note: body }); else showEventPopup({ title: 'EXPEDITION REPORT', text: `<b>${d.name}</b> · ${rk.label} risk<br>${body}`, gains: tot.length ? '+' + tot.join(' · +') : 'Nothing found' }); saveGame(); ui(); expTick();
}
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
    start: (c) => { c.night = S.day + 1; }, hour: (c) => { if (S.day === c.night && [21, 22, 23].includes(S.hour)) { const n = Math.round((14 + 4 * (S.hour - 20) + Math.floor(S.day / 6)) * DF().count); for (let i = 0; i < n; i++) { spawn(null, null, i % 9 === 0 ? 'brute' : i % 4 === 0 ? 'runner' : null); const z = S.z[S.z.length - 1]; z.siege = true; z.mob = true; } if (S.hour === 23) spawnBoss(); }
      if (S.day === c.night + 1 && S.hour === 7) crisisEnd((c.lost || 0) === 0 ? 'won' : 'held'); } },
  refugees: { icon: '🚌', name: 'A refugee column', fits: () => true, desc: 'Six people from a fallen town are on the highway. Take them in within 2 days: you need the beds and 3 food each.',
    start: (c) => { c.until = S.day + 2; }, act: () => { const room = popCap() - S.sv.length - (S.kids || []).length, n = Math.min(6, room); if (n < 3) { say('Not enough beds: build more housing first (room for at least 3).'); return false; } if (S.food < n * 3) { say(`Taking in ${n} people needs ${n * 3} food.`); return false; } S.food -= n * 3; const e = tc(7 + OFF, 10 + OFF); for (let i = 0; i < n; i++) { const q = mk(freeFirst(), ['Farmer', 'Engineer', 'Guard', 'Medic', 'Cook', 'Scavenger'][i % 6], 2 + (i % 3), e.x + (i % 3) * .3, e.y + (i >> 1) * .3, S.sv.length); q.src = 'event'; q.sat = 2; S.sv.push(q); } crisisEnd('won', `${n} refugees joined the Haven.`); return true; },
    actLabel: 'Take them in', day: (c) => { if (S.day >= c.until) crisisEnd('lost'); } },
};
function crisisDaily() {
  const c = S.crisis; if (c) { const C = CRISES[c.k]; if (C.day) C.day(c); return; }
  if ((S.lvl || 1) < CRISIS_LVL && !QS.get('crisis')) return; if (S.finale) return;
  if (S.crisisNext == null) S.crisisNext = S.day + 2; if (S.day < S.crisisNext) return;
  const pool = Object.keys(CRISES).filter((k) => CRISES[k].fits() && k !== S.crisisLast); const k = QS.get('crisis') && CRISES[QS.get('crisis')] ? QS.get('crisis') : pool[Math.floor(rnd() * pool.length)]; if (!k) return;
  S.crisis = { k, day0: S.day, lost: 0 }; CRISES[k].start(S.crisis); S.crisisLast = k; S.crisisNext = S.day + CRISIS_EVERY;
  const C = CRISES[k]; SFX('alarm'); showEventPopup({ title: `${C.icon} WEEKLY CRISIS`, text: `<b>${C.name}</b><br>${C.desc}<br><small>See it through for a Crisis Medal, 30 renown and an epic crate.</small>`, buttons: C.act ? [{ label: C.actLabel.toUpperCase(), fn: () => C.act() }, { label: 'LATER' }] : [{ label: 'GET READY' }] });
}
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
/* ---- 3D.109 Vehicles (owner 11 Nov: "Do all three"). From the Explosives and Vehicles study: the Hand Cart is built from the
   start; the Pickup Truck and the Armored Van are found as wrecks on trips, towed home and restored in a Garage (one motor
   vehicle per Garage). A trip can take one vehicle: it costs fuel, wears it, and a worn one can break down on the road (the
   squad walks home). A Mechanic repairs them. Loot bonuses stay small (+20% at most) so vehicles don't rush the late game. ---- */
const VEH = {
  cart:   { name: 'Hand Cart',    icon: '🛒', fuel: 0, loot: 1.1, speed: 1,   seats: 0, safe: 1,   wear: 6,  build: { wood: 6, mat: 2 }, desc: 'No fuel. Carries a bit more home (+10% loot).' },
  pickup: { name: 'Pickup Truck', icon: '🛻', fuel: 2, loot: 1.2, speed: .6,  seats: 1, safe: .85, wear: 12, restore: { mat: 12, fuel: 2 }, days: 3, desc: '2 fuel a trip. Trips 40% shorter, one more seat, +20% loot.' },
  van:    { name: 'Armored Van',  icon: '🚐', fuel: 4, loot: 1.2, speed: .75, seats: 1, safe: .5,  wear: 10, restore: { mat: 20, stone: 6, fuel: 3 }, days: 4, desc: '4 fuel a trip. Much safer (half the injuries), one more seat, +20% loot.' },
};
const VEH_FIND = { pickup: ['gasstation', 'warehouse', 'houses', 'mall', 'military'], van: ['military', 'mall', 'warehouse'] };
const vehOf = (k) => (S.veh || {})[k];
const vehReady = (k) => { const v = vehOf(k); return !!(v && !v.broken && !(v.restoring > 0) && !v.waiting && (S.fuel || 0) >= VEH[k].fuel); };
const vehWhyNot = (k) => { const v = vehOf(k); if (!v) return 'Not found yet'; if (v.waiting) return 'Waiting at the gate: needs a free Garage' + (v.need ? ' and ' + v.need : ''); if (v.restoring > 0) return `Being restored: ${v.restoring} day${v.restoring > 1 ? 's' : ''} left`; if (v.broken) return 'Broken down: needs a repair'; if ((S.fuel || 0) < VEH[k].fuel) return `Needs ${VEH[k].fuel} fuel`; return ''; };
const garageRoom = () => bOf('garage').filter((b) => !b.unpaid).length - Object.keys(VEH).filter((k) => k !== 'cart' && vehOf(k) && !vehOf(k).waiting).length;
const vehSeats = () => (expSel.veh && VEH[expSel.veh] && vehReady(expSel.veh) && !(EXP_DEFS[expSel.dest] || {}).stronghold ? VEH[expSel.veh].seats : 0);
const expMax = () => ((EXP_DEFS[expSel.dest] || {}).stronghold) ? shCap(!!EXP_DEFS[expSel.dest].raid) : EXP_MAX_SQUAD + vehSeats();   /* 3D.114 strongholds up to 6, raids up to 8 */
const vehLoot = (t) => (t.veh && !t.vehBroke ? VEH[t.veh].loot : 1);
const vehSafe = (t) => (t.veh && !t.vehBroke ? VEH[t.veh].safe : 1);
function vehBuildCart() { if (vehOf('cart')) return false; const c = VEH.cart.build; if ((S.wood || 0) < c.wood || S.mat < c.mat) { say(`A Hand Cart needs ${c.wood} wood and ${c.mat} scrap.`); return false; } S.wood -= c.wood; S.mat -= c.mat; S.veh = S.veh || {}; S.veh.cart = { wear: 0 }; say('🛒 The Hand Cart is ready for trips.', true); ui(); return true; }
function vehRepair(k) { const v = vehOf(k); if (!v || !v.broken) return false; const cost = k === 'cart' ? 2 : k === 'pickup' ? 6 : 10; if (!S.sv.some((q) => q.job === 'Mechanic' && q.hp > 0) && k !== 'cart') { say('Repairs need a Mechanic in the Haven.'); return false; } if (S.mat < cost) { say(`The repair needs ${cost} scrap.`); return false; } S.mat -= cost; v.broken = false; v.wear = 20; say(`🔧 The ${VEH[k].name} is running again.`, true); ui(); return true; }
function vehDepart(t, k) {   /* called when a trip leaves */
  if (!k || !VEH[k] || !vehReady(k) || (EXP_DEFS[t.dest] || {}).stronghold) return; t.veh = k; S.fuel -= VEH[k].fuel; t.dur = Math.round(t.dur * VEH[k].speed);
  t.log.push(`They took the ${VEH[k].name}.`); if (k !== 'cart') vehDrive(k, false);
}
function vehStage(t) {   /* each stage a worn vehicle may break down */
  if (!t.veh || t.vehBroke) return; const v = vehOf(t.veh); if (!v) return; const ch = Math.max(0, (v.wear - 50) / 400);
  if (rnd() < ch) { t.vehBroke = true; v.broken = true; t.dur = Math.round(t.dur / VEH[t.veh].speed); t.log.push(`Stage ${t.stage}: the ${VEH[t.veh].name} broke down. The squad leaves it and walks; someone will tow it home.`); }
}
function vehFind(t) {   /* last stage of a trip: a wreck that might run again */
  if (t.found) return; for (const k of ['van', 'pickup']) { if (vehOf(k) || !(VEH_FIND[k] || []).includes(t.dest)) continue; const ch = k === 'pickup' ? ((S.lvl || 1) >= 3 ? .22 : 0) : ((S.lvl || 1) >= 6 ? (t.dest === 'military' ? .3 : .12) : 0);
    if (rnd() < ch) { t.found = k; t.log.push(`They found a ${VEH[k].name} that might run again, and towed it home.`); return; } }
}
function vehArrive(k, why) {   /* a found vehicle reaches the Haven: restored in a free Garage, or it waits at the gate */
  S.veh = S.veh || {}; S.veh[k] = { wear: 30, waiting: true }; vehStartRestore(k); const v = S.veh[k];
  note('important', `${VEH[k].icon} ${why}: a ${VEH[k].name}! ` + (v.waiting ? `It waits at the gate until there is a free Garage${v.need ? ' and ' + v.need : ''}.` : `A Garage is restoring it (${v.restoring} days).`), { icon: VEH[k].icon });
}
function vehStartRestore(k) { const v = vehOf(k); if (!v || !v.waiting) return; if (garageRoom() <= 0) { v.need = ''; return; }
  const c = VEH[k].restore, miss = Object.entries(c).filter(([r, n]) => (r === 'mat' ? S.mat : S[r] || 0) < n); if (miss.length) { v.need = miss.map(([r, n]) => `${n} ${RES_NAME[r] || r}`).join(', '); return; }
  for (const [r, n] of Object.entries(c)) { if (r === 'mat') S.mat -= n; else S[r] -= n; } v.waiting = false; v.need = ''; v.restoring = VEH[k].days; }
function vehDaily() { for (const k of Object.keys(VEH)) { const v = vehOf(k); if (!v) continue; if (v.waiting) vehStartRestore(k);
    else if (v.restoring > 0) { v.restoring -= S.sv.some((q) => q.job === 'Mechanic' && q.hp > 0) ? 2 : 1; if (v.restoring <= 0) { v.restoring = 0; note('important', `${VEH[k].icon} The ${VEH[k].name} is restored and ready for trips.`, { icon: VEH[k].icon }); } } } }
function vehReturn(t) {
  if (t.veh) { const v = vehOf(t.veh); if (v) { v.wear = Math.min(100, (v.wear || 0) + VEH[t.veh].wear * (t.dest === 'military' ? 1.5 : 1)); if (v.wear >= 100) v.broken = true; } if (!t.vehBroke && t.veh !== 'cart') vehDrive(t.veh, true); }
  if (t.found) setTimeout(() => vehArrive(t.found, 'The squad brought home'), 1200);
}
function vehDrive(k, back) {   /* the vehicle drives between its Garage and the highway (the renderer shows it) */
  const g = bOf('garage')[0]; if (!g) return; const at = Wd.approachTile(g), end = { x: COLS - 1, y: Wd.HWY_Y }, p = Wd.findPath(world, at, end); if (!p || !p.length) return;
  const path = [at, ...p].map((q) => ({ x: q.x + .5, y: q.y + .5 })); S.drive = { k, path: back ? path.reverse() : path, i: 0 };
}
function driveTick() { const d = S.drive; if (!d) return; d.i += .055; if (d.i >= d.path.length - 1) S.drive = null; }
function vehCard() {   /* the Explore screen: pick a vehicle for the trip, build the cart, repair */
  const d = EXP_DEFS[expSel.dest] || {}; if (d.stronghold) return '';
  const own = Object.keys(VEH).filter((k) => vehOf(k)); if (expSel.veh && !vehReady(expSel.veh)) expSel.veh = null;
  const btn = (k) => { const ok = vehReady(k), why = vehWhyNot(k), v = vehOf(k); return `<button class="vehB ${expSel.veh === k ? 'on' : ''}" data-veh="${k}" ${ok ? '' : 'disabled'} title="${esc(why || VEH[k].desc)}">${VEH[k].icon} ${VEH[k].name}<small>${ok ? (VEH[k].fuel ? VEH[k].fuel + ' fuel · ' : '') + 'wear ' + Math.round(v.wear || 0) + '%' : esc(why)}</small></button>`; };
  const extra = []; if (!vehOf('cart')) extra.push(`<button class="vehB" data-vbuild="cart">🛒 Build a Hand Cart<small>${VEH.cart.build.wood} wood · ${VEH.cart.build.mat} scrap</small></button>`);
  for (const k of own) if (vehOf(k).broken) extra.push(`<button class="vehB" data-vfix="${k}">🔧 Repair the ${VEH[k].name}<small>${k === 'cart' ? 2 : k === 'pickup' ? 6 : 10} scrap${k === 'cart' ? '' : ' · needs a Mechanic'}</small></button>`);
  return `<div class="etLine vehLine"><span class="etK">Vehicle</span><button class="vehB ${!expSel.veh ? 'on' : ''}" data-veh="">🚶 On foot</button>${own.map(btn).join('')}${extra.join('')}</div>${expSel.veh ? `<div class="sm">${esc(VEH[expSel.veh].desc)}</div>` : ''}`;
}
/* ---- 3D.108 Strongholds as their own map (owner 11 Nov: "Yes build them"). The squad of up to 4 leaves the town and fights
   through three areas and a boss room in real time, on a separate arena that the camera follows. Live calls: Focus the boss,
   Use a medkit, Fall back. The boss's strength is fixed, so a stronger squad is how you win. The town keeps running, slowed
   to a quarter speed. Losing never kills outright: anyone knocked down comes home Wounded, with a 4% chance they don't make it. ---- */
/* ---- 3D.114 Strongholds and faction raids v2 (owner 11 Nov: "Do all four now", raids as camp maps with goals, squads of 6/8).
   The arena is a set of rooms joined by doors, well off the town map:
       side room (S)                    north wing (A)
       entrance (R0) ── hall (R1) ─┤                 ├── boss room (B)
                                        south wing (C)
   Rooms wake up when one of the squad walks in. Movement uses a tile grid (BFS), so doors and walls matter.
   Player control: select survivors (portraits or All), tap the floor to move, an enemy to attack, a door to open or close;
   time runs at 25% while someone is selected. Stances (Attack, Hold, Guard, Pull back) and one ability per profession.
   Explosives from the town's stock can be thrown where you tap. ---- */
const SH_AX = -150, SH_AY = 2, SH_GW = 46, SH_GH = 19;
/* 3D.128 one layout per stronghold (review step 7): the same ten rooms (entrance R0, side room S, hall R1, wings A and C, boss room B, four locked rooms),
   laid out differently: the clinic is a row of wards, the prison a big yard with a cell corridor, the greenhouse one great glasshouse with rooms down its side;
   the refinery, the fair and the depot are the same three turned over. x, y, w, h in grid tiles; doors: a, b, x, y, w, h, locked. */
const SH_LAY = {
  hall: { rooms: { R0: [0, 7, 10, 8], S: [2, 1, 6, 5], R1: [11, 7, 10, 8], A: [22, 3, 10, 6], C: [22, 12, 10, 6], B: [33, 4, 12, 12], L1: [12, 1, 8, 5], L2: [1, 16, 7, 3], L3: [12, 16, 8, 3], L4: [35, 0, 8, 3] },
    doors: [['R0', 'S', 4, 6, 2, 1], ['R0', 'R1', 10, 10, 1, 2], ['R1', 'A', 21, 7, 1, 2], ['R1', 'C', 21, 13, 1, 2], ['A', 'B', 32, 6, 1, 2], ['C', 'B', 32, 13, 1, 2], ['R1', 'L1', 15, 6, 2, 1, 1], ['R0', 'L2', 4, 15, 2, 1, 1], ['R1', 'L3', 15, 15, 2, 1, 1], ['B', 'L4', 38, 3, 2, 1, 1]] },
  yard: { rooms: { R0: [0, 5, 12, 10], S: [2, 0, 6, 4], R1: [13, 7, 14, 4], A: [24, 0, 10, 6], C: [24, 12, 10, 6], B: [35, 3, 11, 11], L1: [14, 1, 8, 5], L2: [1, 16, 7, 3], L3: [14, 12, 8, 4], L4: [37, 15, 7, 4] },
    doors: [['R0', 'S', 4, 4, 2, 1], ['R0', 'R1', 12, 8, 1, 2], ['R1', 'A', 25, 6, 2, 1], ['R1', 'C', 25, 11, 2, 1], ['A', 'B', 34, 3, 1, 2], ['C', 'B', 34, 12, 1, 2], ['R1', 'L1', 17, 6, 2, 1, 1], ['R0', 'L2', 4, 15, 2, 1, 1], ['R1', 'L3', 17, 11, 2, 1, 1], ['B', 'L4', 40, 14, 2, 1, 1]] },
  glass: { rooms: { R0: [0, 6, 9, 8], S: [1, 0, 7, 5], R1: [10, 2, 13, 15], A: [24, 0, 9, 5], C: [24, 14, 9, 5], B: [34, 2, 12, 15], L1: [24, 6, 6, 3], L2: [1, 15, 7, 4], L3: [24, 10, 6, 3], L4: [31, 6, 2, 7] },
    doors: [['R0', 'S', 4, 5, 2, 1], ['R0', 'R1', 9, 9, 1, 2], ['R1', 'A', 23, 2, 1, 2], ['R1', 'C', 23, 15, 1, 2], ['A', 'B', 33, 2, 1, 2], ['C', 'B', 33, 15, 1, 2], ['R1', 'L1', 23, 6, 1, 2, 1], ['R0', 'L2', 4, 14, 2, 1, 1], ['R1', 'L3', 23, 10, 1, 2, 1], ['B', 'L4', 33, 8, 1, 2, 1]] },
};
for (const k of ['hall', 'yard', 'glass']) { const l = SH_LAY[k]; SH_LAY[k + 'F'] = { rooms: Object.fromEntries(Object.entries(l.rooms).map(([r, [x, y, w, h]]) => [r, [x, SH_GH - y - h, w, h]])), doors: l.doors.map(([a, b, x, y, w, h, lk]) => [a, b, x, SH_GH - y - h, w, h, lk]) }; }
const SH_LAYOF = { clinic: 'hall', prison: 'yard', sh_spring: 'glass', sh_summer: 'yardF', sh_autumn: 'glassF', sh_winter: 'hallF' };
let SH_LKEY = 'hall', SH_ROOMS = SH_LAY.hall.rooms, SH_DOORS = SH_LAY.hall.doors;
function shUseLayout(dest) { const k = SH_LAYOF[dest] || 'hall'; if (k === SH_LKEY) return; SH_LKEY = k; SH_ROOMS = SH_LAY[k].rooms; SH_DOORS = SH_LAY[k].doors; SHG = null; }
/* 3D.115 owner: doors and locked rooms like Zomboid: every door starts shut, you can't see into a room until it is opened, and a locked room may hold good loot, nothing, or a nest */
const SH_PACE = 1, SH_SLOW = 1;   /* owner: it felt sped up (it was running at the town's 2x/3x). 3D.117 owner: match normal speed, no slow-down: always 1x, whatever the town speed is */
const SH_LROOM = { S: 'the side room', L1: 'a locked office', L2: 'a locked storeroom', L3: 'a locked closet', L4: 'the back room' };
const SH_DEFS = {
  clinic: { tough: 1.2,   /* the first stronghold, met with bats and a pistol: 1.38 beat a real early squad too often */ rec: 175, areas: [
    { name: 'The Lobby', spawn: [['walker', 6], ['runner', 2]] },
    { name: 'The Wards', spawn: [['walker', 6], ['runner', 2], ['bloated', 1], ['spitter', 1]] },
    { name: 'The Operating Theatre', spawn: [['walker', 3]], boss: { type: 'brute', name: 'The Butcher of Ward 3', hp: 680, atk: 12, big: 1.6, spd: .011 } } ],
    floor: ['#cfd6d2', '#d9d4c4', '#c9d3d6'], wall: '#e6ece6', props: 'clinic', side: 'A supply closet', wings: ['The East Ward', 'The Storerooms'] },
  prison: { tough: 1.5, rec: 350, areas: [
    { name: 'The Outer Yard', spawn: [['walker', 7], ['runner', 2], ['riot', 1]] },
    { name: 'Cell Block C', spawn: [['walker', 6], ['riot', 2], ['brute', 1]] },
    { name: "The Warden's Yard", spawn: [['riot', 1], ['walker', 3]], boss: { type: 'riot', name: 'The Warden', hp: 860, atk: 14, big: 1.55, spd: .012 } } ],
    floor: ['#a9a395', '#9a9a96', '#a9a395'], wall: '#7d7f84', props: 'prison', side: 'The guard post', wings: ['Cell Block C', 'The Laundry'] },
};
Object.assign(SH_DEFS, {
  sh_spring: { tough: 1.35, rec: 450, areas: [ { name: 'The Potting Sheds', spawn: [['walker', 8], ['bloated', 2], ['spitter', 2]] }, { name: 'The Flooded Glasshouse', spawn: [['bloated', 2], ['sporehead', 1], ['walker', 6]] },
    { name: 'The Pump House', spawn: [['bloated', 2], ['walker', 4]], boss: { type: 'bloated', name: 'The Mire Mother', hp: 1100, atk: 16, big: 1.9, spd: .009 } } ], floor: ['#8fa38a', '#9cb39a', '#7d9479'], wall: '#cfe0d6', props: 'clinic', side: 'A seed store', wings: ['The Palm House', 'The Orchid Rooms'] },
  sh_summer: { tough: 1.55, rec: 450, areas: [ { name: 'The Gate Yard', spawn: [['burnt', 8], ['runner', 3]] }, { name: 'The Tank Farm', spawn: [['burnt', 7], ['brute', 1], ['rotbomb', 2]] },
    { name: 'The Cracking Tower', spawn: [['burnt', 4], ['runner', 2]], boss: { type: 'brute', name: 'Cinder', hp: 1100, atk: 17, big: 1.7, spd: .012 } } ], floor: ['#a68f74', '#9a8166', '#8a6f58'], wall: '#6b5d52', props: 'prison', side: 'A control room', wings: ['The Pipe Racks', 'The Pump Station'] },
  sh_autumn: { tough: 1.5, rec: 450, areas: [ { name: 'The Midway', spawn: [['walker', 8], ['runner', 3], ['rotbomb', 1]] }, { name: 'The Livestock Barns', spawn: [['walker', 6], ['dog', 3], ['lasher', 1]] },
    { name: 'The Haunted Ride', spawn: [['lasher', 2], ['walker', 4]], boss: { type: 'lasher', name: 'The Scarecrow', hp: 1050, atk: 16, big: 1.7, spd: .013 } } ], floor: ['#b39064', '#a68458', '#9a7a52'], wall: '#8a5a32', props: 'prison', side: 'A prize booth', wings: ['The Barns', 'The Hall of Mirrors'] },
  sh_winter: { tough: 1.4, rec: 450, areas: [ { name: 'The Snowed Gate', spawn: [['walker', 9], ['riot', 2]] }, { name: 'The Barracks', spawn: [['riot', 2], ['walker', 6], ['brute', 1]] },
    { name: 'The Hangar', spawn: [['riot', 2], ['walker', 4]], boss: { type: 'brute', name: 'The Frostbite Giant', hp: 1200, atk: 18, big: 1.85, spd: .01 } } ], floor: ['#dfe6ec', '#cfd8de', '#e8eef2'], wall: '#9aa6b0', props: 'prison', side: 'The quartermaster', wings: ['The Barracks', 'The Motor Pool'] },
  /* faction camps: human enemies; north wing = their stockpile, south wing = the prisoners, boss room = the leader */
  raid_toll: { rec: 300, raid: 'toll', areas: [ { name: 'The Toll Gate', spawn: [['raider', 4], ['raiderG', 1]] }, { name: 'The Truck Yard', spawn: [['raider', 4], ['raiderG', 2]] },
    { name: "The Collector's Hall", spawn: [['raider', 2], ['raiderG', 1]], boss: { type: 'raider', name: 'The Toll Collector', hp: 520, atk: 16, big: 1.3, spd: .016, wpn: 'roadsign' } } ], floor: ['#8a8378', '#7d776c', '#94897a'], wall: '#6b5d52', props: 'camp', side: 'A lookout', wings: ['Their stockpile', 'The cages'] },
  raid_green: { rec: 200, raid: 'green', areas: [ { name: 'The Orchard Gate', spawn: [['raiderB', 3], ['raider', 2]] }, { name: 'The Commons', spawn: [['raiderB', 3], ['raider', 2]] },
    { name: 'The Meeting House', spawn: [['raiderB', 2], ['raider', 1]], boss: { type: 'raider', name: 'Elder Maren', hp: 360, atk: 11, big: 1.15, spd: .015, wpn: 'bow' } } ], floor: ['#8fa36a', '#9cb07a', '#a3946c'], wall: '#8a6038', props: 'camp', side: 'A tool shed', wings: ['The granary', 'The stockade'] },
});
const RAID_GOALS = { loot: { icon: '📦', name: 'Steal their stockpile', room: 'A', desc: 'Reach their stockpile (north wing) and load it up: triple loot.' }, free: { icon: '🔓', name: 'Free the prisoners', room: 'C', desc: 'Open the cages (south wing): the prisoners join the Haven.' }, leader: { icon: '👑', name: 'Take out their leader', room: 'B', desc: 'Defeat the leader in the last hall: the faction is driven off for 60 days.' } };
const shPower = (ms) => Math.round(ms.reduce((a, s) => a + 8 * (s.l || 1) + ((weaponOf(s) || {}).atk || 0), 0));
const shCap = (raid) => Math.min(raid ? 8 : 6, 4 + (bOf('barracks').some((b) => !b.unpaid) ? 1 : 0) + ((S.lvl || 1) >= 12 ? 1 : 0) + (raid ? (vehOf('van') && !vehOf('van').broken ? 2 : vehOf('pickup') && !vehOf('pickup').broken ? 1 : vehOf('cart') ? 1 : 0) : 0));
/* the grid */
var SHG = null;
const shW = () => (S.sh && S.sh.camp ? S.sh.gw : SH_GW), shH = () => (S.sh && S.sh.camp ? S.sh.gh : SH_GH);
function shGrid() { if (S.sh && S.sh.camp) return S.sh.grid; if (S.sh) shUseLayout(S.sh.dest); if (SHG) return SHG; const g = []; for (let y = 0; y < SH_GH; y++) { g.push(new Array(SH_GW).fill(null)); }
  for (const [k, [x0, y0, w, h]] of Object.entries(SH_ROOMS)) for (let y = y0; y < y0 + h; y++) for (let x = x0; x < x0 + w; x++) g[y][x] = k;
  SH_DOORS.forEach(([a, b, x0, y0, w, h], i) => { for (let y = y0; y < y0 + h; y++) for (let x = x0; x < x0 + w; x++) g[y][x] = 'D' + i; }); return (SHG = g); }
const shCell = (w) => ({ x: Math.floor(w.x - SH_AX), y: Math.floor(w.y - SH_AY) });
const shRoomAt = (w) => { const c = shCell(w), g = shGrid(); const v = g[c.y] && g[c.y][c.x]; return v && v[0] !== 'D' ? v : null; };
const shWorld = (x, y) => ({ x: SH_AX + x + .5, y: SH_AY + y + .5 });
function shOpen(x, y, who) { const g = shGrid(); const v = g[y] && g[y][x]; if (!v) return false; if (S.sh.camp) { if (v === 'W') { const f = S.sh.fence && S.sh.fence[x + ',' + y]; return !!(f && f.dead); } if (v[0] === 'K') { const kb = S.sh.blds[+v.slice(1)]; return !!(kb && kb.dead); }   /* 3D.128 a building that is down is rubble: walk over it (was a wall for the rest of the raid) */ return true; } if (v[0] === 'D') { const d = S.sh.doors[+v.slice(1)]; return d.open || d.broken || (who === 'z' ? 'bash' : !d.locked); } if (S.sh.blocks && S.sh.blocks.some((b) => b.x === x && b.y === y && b.hp > 0)) return who === 'z' ? 'bash' : false; return true; }
function shPath(from, to, who) {   /* BFS on the grid; zombies may plan through closed doors and barricades (they bash them) */
  const a = shCell(from), b = shCell(to); if (a.x === b.x && a.y === b.y) return [to]; const W = shW(), HH = shH(), prev = new Int32Array(W * HH).fill(-1), q = [a.y * W + a.x]; prev[q[0]] = q[0];
  for (let i = 0; i < q.length; i++) { const c = q[i], cx = c % W, cy = (c / W) | 0; if (cx === b.x && cy === b.y) break; for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) { const nx = cx + dx, ny = cy + dy; if (nx < 0 || ny < 0 || nx >= W || ny >= HH) continue; const n = ny * W + nx; if (prev[n] >= 0 || !shOpen(nx, ny, who)) continue; prev[n] = c; q.push(n); } }
  const e = b.y * W + b.x; if (prev[e] < 0) return null; const out = []; for (let c = e; c !== a.y * W + a.x; c = prev[c]) out.push(shWorld(c % W, (c / W) | 0)); out.reverse(); out[out.length - 1] = { ...to }; return out; }
function shGo(o, to, sp, who) {   /* walk toward a point along the grid; returns true when there */
  const d = dist(o.w, to); if (d < .08) { o.moving = false; o.path = null; return true; }
  if (!o.path || !o.pathTo || dist(o.pathTo, to) > .6 || (o.pathT = (o.pathT || 0) - 1) < 0) { o.path = shPath(o.w, to, who); o.pathTo = { ...to }; o.pathT = 40; if (!o.path) { o.moving = false; return false; } }
  let n = o.path[0]; while (n && dist(o.w, n) < .12 && o.path.length > 1) { o.path.shift(); n = o.path[0]; } if (!n) return true;
  const c = shCell(n), dr0 = shDoorAt(c.x, c.y); if (who === 'z') { const bl = S.sh.blocks && S.sh.blocks.find((q) => q.x === c.x && q.y === c.y && q.hp > 0), dr = dr0 && !dr0.open && !dr0.broken ? dr0 : null; if (dr || bl) { o.bash = dr || bl; o.moving = false; return false; } }
  else if (dr0 && !dr0.open && !dr0.broken && !dr0.locked && dist(o.w, n) < 1.2) shDoorOpen(dr0);
  const dx = n.x - o.w.x, dy = n.y - o.w.y, l = Math.hypot(dx, dy) || 1, st = Math.min(l, sp); o.w = { x: o.w.x + dx / l * st, y: o.w.y + dy / l * st }; o.moving = true; o.faceW = null; return false; }
const shDoorAt = (x, y) => { const v = (shGrid()[y] || [])[x]; return v && v[0] === 'D' ? S.sh.doors[+v.slice(1)] : null; };
const shDoorW = (i) => { const [, , dx, dy, dw, dh] = SH_DOORS[i]; return shWorld(dx + (dw - 1) / 2, dy + (dh - 1) / 2); };
function shReveal(r) { const H = S.sh; if (!H || !r || H.rev[r]) return; H.rev[r] = 1; const m = H.myst && H.myst[r]; if (m && !m.told) { m.told = true; const at = shWorld(SH_ROOMS[r][0] + SH_ROOMS[r][2] / 2, SH_ROOMS[r][1] + SH_ROOMS[r][3] / 2); shFx(at, m.kind === 'empty' ? 'Empty…' : m.kind === 'nest' ? '💢 A nest!' : m.kind === 'survivor' ? '🙋 Someone is in here!' : m.kind === 'guarded' ? '📦 Supplies… and company' : '📦 Supplies!', m.kind === 'nest' ? '#ff6e62' : '#ffe9b8'); } }
function shDoorOpen(d, how) { const H = S.sh, i = H.doors.indexOf(d); if (i < 0) return; if (how === 'break') { d.broken = true; d.locked = false; } d.open = true; if (how === 'pick') d.locked = false; shReveal(SH_DOORS[i][0]); shReveal(SH_DOORS[i][1]); SFX('hit'); }
function shMystery() {   /* what is behind each closed side door: rolled when the squad goes in, so nobody knows until it opens */
  const H = S.sh, D = SH_DEFS[H.dest], t0 = D.areas[0].spawn[0][0], t1 = (D.areas[1].spawn[1] || D.areas[1].spawn[0])[0]; H.myst = {};
  const cache = (big) => { const l = { meds: 1 + (rnd() < .5 ? 1 : 0), ammo: 4 + Math.floor(rnd() * 5), mat: 3 + Math.floor(rnd() * 4) }; if (rnd() < .5) l.fuel = 1 + (big ? 1 : 0); if (rnd() < .4) l.food = 3; const pool = H.raid === 'toll' ? ['roadsign', 'spikedclub', 'biker', 'rifle'] : H.raid === 'green' ? ['bow', 'crossbow', 'raincoat'] : ['machete', 'crossbow', 'kevlar', 'gasmask', 'medpouch', 'shotgun', 'tactvest']; const items = rnd() < (big ? .9 : .35) ? [pool[Math.floor(rnd() * pool.length)]].filter((k) => ITEMS[k]) : []; return { loot: l, items }; };
  for (const r of Object.keys(SH_LROOM)) { const x = rnd(), last = r === 'L4';
    const kind = last ? (x < .7 ? 'cache' : 'guarded') : x < .28 ? 'cache' : x < .52 ? 'empty' : x < .76 ? 'nest' : x < .94 ? 'guarded' : 'survivor';
    const m = { kind, ...(kind === 'cache' || kind === 'guarded' ? cache(last) : kind === 'nest' ? { loot: { mat: 2 }, items: [] } : { loot: {}, items: [] }) }; if (kind === 'empty' && rnd() < .5) m.loot = { mat: 1 }; H.myst[r] = m;
    if (kind === 'nest') H.spawnQ.push([r, [[t0, 3 + Math.floor(rnd() * 3)]]]); else if (kind === 'guarded') H.spawnQ.push([r, [[t1, 2]]]); } }
function shPickup(H, live) {   /* walk into a revealed room with nobody hostile left in it: the squad takes what is there */
  for (const [r, m] of Object.entries(H.myst || {})) { if (m.took || !H.rev[r]) continue; const s = live.find((q) => shRoomAt(q.w) === r); if (!s || H.zs.some((z) => z.hp > 0 && z.room === r && !z.hid)) continue; m.took = true;
    for (const [k, n] of Object.entries(m.loot || {})) H.loot[k] = (H.loot[k] || 0) + n; (H.items ||= []).push(...(m.items || []));
    if (m.kind === 'survivor') { H.found = (H.found || 0) + 1; shFx(s.w, '🙋 They will come home with you', '#7be08a'); }
    const t = Object.entries(m.loot || {}).map(([k, n]) => '+' + n + ' ' + (RES_NAME[k] || k)).concat((m.items || []).map((k) => '🎁 ' + ITEMS[k].name)); if (t.length) { shFx(s.w, t.join('  '), '#ffe9b8'); SFX('reward'); } else if (m.kind !== 'survivor') shFx(s.w, 'Nothing here.', '#b4a296'); } }
function shFx(w, t, col) { if (S.sh) S.sh.fx.push({ w: { ...w }, t, col, a: 60 }); }
function shUnitDmg(s, z) { const w = weaponOf(s), bonus = (professions[s.job]?.combat || 0) + skillDmg(s);
  return Math.round((4 + w.atk * .55 + (w.ranged ? stat(s, 'per') : stat(s, 'str')) * .6 + bonus) * (w.ranged && hasSkill(s, 'marksman') ? 1.25 : 1) * (isFighter(s) ? 1 : TUNE.nfDmg) * (z.type === 'riot' && w.kind === 'blade' ? .5 : 1) * (s.spec && (hasSpec(s, 'swat') || hasSpec(s, 'marksman')) ? 1.2 : 1) * (z.boss && S.sh.focus ? 1.3 : 1) * (s.rallyT > S.sh.t ? 1.2 : 1)); }
/* abilities: one per profession (Specialists get the stronger version) */
const SH_ABIL = {
  Guard: { k: 'taunt', icon: '🛡', name: 'Taunt', cd: 1200, desc: 'Nearby enemies go for them; they take half damage for 6 s' },
  'Police Officer': { k: 'aim', icon: '🎯', name: 'Aimed Shot', cd: 900, desc: 'The next hit does triple damage' },
  Medic: { k: 'patch', icon: '✚', name: 'Patch Up', cd: 1500, desc: 'Heals everyone within 3 tiles by 30%' },
  Scavenger: { k: 'search', icon: '🔍', name: 'Search', cd: 1800, desc: 'Turns the room over for supplies' },
  Mechanic: { k: 'breach', icon: '🔧', name: 'Breach', cd: 900, desc: 'Opens the nearest locked door at once (within 3 tiles); with none near, braces the nearest shut door so it takes 4× the beating' },   /* 3D.115 owner: Barricade and Snare were useless */
  Engineer: { k: 'peek', icon: '🔦', name: 'Peek', cd: 1200, desc: 'Checks behind every unopened door within 8 tiles: supplies, empty or a nest' },
  _: { k: 'rally', icon: '📣', name: 'Rally', cd: 1500, desc: 'Everyone hits 20% harder for 6 s' },
};
const shAbil = (s) => SH_ABIL[s.job] || SH_ABIL._;
function shUseAbil(s) { const H = S.sh, A = shAbil(s), sp = s.spec ? 1.5 : 1; if (!H || s.hp <= 0 || (s.abT || 0) > H.t) return false; s.abT = H.t + A.cd;
  if (A.k === 'taunt') { s.tauntT = H.t + 360 * sp; for (const z of H.zs) if (z.hp > 0 && dist(z.w, s.w) < 4 * sp) { z.target = s; z.tauntBy = s; } shFx(s.w, '🛡 TAUNT', '#9fd8ff'); }
  else if (A.k === 'aim') { s.aimNext = true; shFx(s.w, '🎯 AIM', '#ffd56b'); }
  else if (A.k === 'patch') { for (const q of H.units) if (dist(q.w, s.w) < 3 * sp && q.hp > -1) { const up = q.hp <= 0, add = Math.round(q.max * .3 * sp); q.hp = Math.min(q.max, Math.max(0, q.hp) + add); if (up) q.mode = 'free'; shFx(q.w, '+' + add, '#7be08a'); } }
  else if (A.k === 'search') { const r = shRoomAt(s.w) || 'R0'; const got = rnd() < .5 ? { meds: 1 + (rnd() < .4 ? 1 : 0) } : rnd() < .5 ? { mat: 2 + Math.floor(rnd() * 3) } : { cloth: 1, food: 2 }; if (rnd() < .25 * sp) got.ammo = 4; for (const [k, n] of Object.entries(got)) H.loot[k] = (H.loot[k] || 0) + n; shFx(s.w, '🔍 ' + Object.entries(got).map(([k, n]) => '+' + n + ' ' + (RES_NAME[k] || k)).join(' '), '#ffe9b8'); if (H.goal && RAID_GOALS[H.goal] && RAID_GOALS[H.goal].room === r && H.goal !== 'leader' && !H.zs.some((z) => z.hp > 0 && z.room === r)) shGoalDone(); }
  else if (A.k === 'breach') { const ds = H.doors.map((d, i) => ({ d, i, r: dist(shDoorW(i), s.w) })).filter((q) => !q.d.broken && q.r < 3 * sp).sort((a, b) => a.r - b.r), lk = ds.find((q) => q.d.locked && !q.d.open);
    if (lk) { shDoorOpen(lk.d, 'pick'); shFx(shDoorW(lk.i), '🔧 Breached!', '#7be08a'); } else { const sh = ds.find((q) => !q.d.open) || ds.find((q) => q.d.open && ![...H.units, ...H.zs].some((o) => o.hp > 0 && shDoorAt(shCell(o.w).x, shCell(o.w).y) === q.d)); if (!sh) { s.abT = 0; say('No door close enough.'); return false; } sh.d.open = false; sh.d.hp = Math.max(sh.d.hp, 120) * 4; shFx(shDoorW(sh.i), '🔧 Braced', '#ffe9b8'); } }
  else if (A.k === 'peek') { let n = 0; for (const [r, m] of Object.entries(H.myst || {})) { if (H.rev[r] || m.peek) continue; const [x0, y0, w, h] = SH_ROOMS[r]; if (dist(shWorld(x0 + w / 2, y0 + h / 2), s.w) > 8 * sp) continue; m.peek = true; n++; } for (const r of ['R1', 'A', 'C', 'B']) if (!H.rev[r]) { const [x0, y0, w, h] = SH_ROOMS[r]; if (dist(shWorld(x0 + w / 2, y0 + h / 2), s.w) <= 8 * sp) { (H.peekR ||= {})[r] = true; n++; } } shFx(s.w, n ? `🔦 Peeked into ${n} room${n > 1 ? 's' : ''}` : '🔦 Nothing new nearby', '#9fd8ff'); }
  else { for (const q of H.units) q.rallyT = H.t + 360 * sp; shFx(s.w, '📣 RALLY!', '#ffd56b'); }
  SFX('chime'); shPanel(); return true; }
const SH_STANCE = { attack: { icon: '⚔', name: 'Attack' }, hold: { icon: '✋', name: 'Hold' }, guard: { icon: '🫂', name: 'Guard' }, back: { icon: '↩', name: 'Pull back <30%' } };
/* starting a run */
function startStronghold(destId, ids, opts = {}) {
  const D = SH_DEFS[destId], d = EXP_DEFS[destId] || { name: destId, icon: '⚔' }; if (!D) return { ok: false, why: 'Unknown stronghold' }; if (S.sh) return { ok: false, why: 'A squad is already inside' };
  if (!opts.practice && (S.shTryDay || {})[destId] === S.day) return { ok: false, why: 'The squad was beaten back from there today: try again tomorrow' };   /* 3D.125 the loss cooldown was recorded but never read */
  shUseLayout(destId); const cap = shCap(!!D.raid); const ms = (ids || []).map((id) => S.sv.find((q) => q.id === id)).filter(Boolean).slice(0, opts.practice ? 8 : cap);
  if (!ms.length) return { ok: false, why: 'Pick at least one survivor' };
  for (const q of ms) { releasePost(q); for (const z of S.z) if (z.target === q) { z.target = null; z.mode = 'idle'; } if (selected && selected.ref === q) { selected = null; closeP(); } }
  if (!opts.practice) S.sv = S.sv.filter((q) => !ms.includes(q));
  const units = opts.practice ? ms.map((q) => ({ ...JSON.parse(JSON.stringify(expPlain(q), (k, v) => (['target', 'post', 'path', 'chatWith', 'aidTo', 'aidBy', 'rescuer', 'facility', 'faceW', 'emo'].includes(k) ? undefined : v))), id: 90000 + q.id, practiceOf: q.id })) : ms;
  units.forEach((s, i) => { if (!opts.practice) s.shHome = { w: s.w, mode: s.mode }; s.w = shWorld(1 + (i % 3) * .9, 8.5 + Math.floor(i / 3) * 1.3); s.mode = 'free'; s.target = null; s.moving = false; s.path = null; s.stateTicks = 0; s.para = 0; s.carrying = null; s.carriedLoot = null; s.sleeping = false; s.stance = s.stance || 'attack'; s.abT = 0; s.crit = 0; if (opts.practice) { s.hp = s.max; } });
  const camp = !!D.raid; if (camp) units.forEach((s, i) => { s.w = shWorld(12.4 + (i % 4) * .75, 26.2 + Math.floor(i / 4) * .8); });
  S.sh = { camp, akey: camp ? destId + ':' + Math.floor(rnd() * 1e6) : destId, dest: destId, units, zs: [], phase: 'fight', t: 0, focus: false, back: false, view: true, cz: 1.8, cx: SH_AX + 5, cy: SH_AY + 11, fx: [], kills: 0, power: shPower(units), log: [], loot: {}, sel: [], doors: SH_DOORS.map((q) => ({ open: false, hp: q[6] ? 160 : 120, locked: !!q[6] })), woke: {}, rev: { R0: 1 }, spawnQ: [], items: [], goal: D.raid ? (opts.goal || 'loot') : null, practice: !!opts.practice, raid: D.raid || null, night: camp && (opts.night === undefined ? isNight() : !!opts.night) };   /* 3D.128 a raid happens at the hour you set out: at night the guards see less far and the workers sleep */
  if (camp) { S.sh.cx = SH_AX + 15; S.sh.cy = SH_AY + 24; S.sh.cz = 1.5; S.sh.goal = null; S.sh.doors = []; campBuild(); } else { shMystery(); shSpawnAll(); } if (!opts.practice) { barkSomeone('farewell', { dest: d.name }, { pri: 1 }); say(`${ms.map((q) => q.name).join(', ')} went into ${d.name}.`, true); } shPanel(); ui(); return { ok: true, why: '' };
}
function shSpawnAll() {   /* every room gets its enemies up front; they sleep until the squad walks in */
  const H = S.sh, D = SH_DEFS[H.dest], A = D.areas, TK = D.tough || 1, put = (room, list, boss) => { const [x0, y0, w, h] = SH_ROOMS[room];   /* 3D.130 balance run: at the recommended power an unled squad won every stronghold 10 times in 10. 'tough' scales enemy health and damage so that is about 7 in 10, and near certain with three medkits */
    for (const [t, c] of list) for (let i = 0; i < c; i++) { const raider = t.startsWith('raider'), zd = zombieTypes[raider ? 'raider' : t] || zombieTypes.walker, wpn = t === 'raiderG' ? 'rifle' : t === 'raiderB' ? 'bow' : raider ? ['bat', 'crowbar', 'machete'][i % 3] : null;
      H.zs.push({ type: raider ? 'raider' : t, human: raider, wpn, ranged: !!(wpn === 'rifle' || wpn === 'bow'), room, w: shWorld(x0 + 1 + rnd() * (w - 2), y0 + 1 + rnd() * (h - 2)), hp: Math.round(zd.hp * (raider ? 1.3 : 1) * TK), max: Math.round(zd.hp * (raider ? 1.3 : 1) * TK), atk: zd.atk * (raider ? 1.2 : 1) * TK, spd: (zd.chase || .012) * 1.25, mode: 'sleep', stateTicks: 0, target: null, moving: false, phase: rnd() * 100, fk: H.raid }); }
    if (boss) { H.zs.push({ type: boss.type, human: boss.type === 'raider', wpn: boss.wpn || null, ranged: boss.wpn === 'bow' || boss.wpn === 'rifle', leader: !!H.raid, boss: true, name: boss.name, room, big: boss.big, w: shWorld(x0 + w - 3, y0 + h / 2), hp: Math.round(boss.hp * TK), max: Math.round(boss.hp * TK), atk: boss.atk * TK, spd: boss.spd, mode: 'sleep', target: null, moving: false, fk: H.raid }); } };
  const half = (list, k) => list.map(([t, c]) => [t, Math.max(k ? 0 : 1, k ? Math.floor(c / 2) : Math.ceil(c / 2))]).filter(([, c]) => c > 0);
  put('R0', A[0].spawn); for (const [r, l] of H.spawnQ) put(r, l); put('R1', half(A[1].spawn, 0)); put('A', half(A[1].spawn, 1).concat([[A[1].spawn[0][0], 2]])); put('C', half(A[1].spawn, 1)); put('B', A[2].spawn, A[2].boss);
  for (const z of H.zs) z.hid = !H.rev[z.room];
}
function shLiveZs() { return S.sh.zs.filter((z) => z.hp > 0); }
function shTick() {
  const H = S.sh; if (!H) return;   /* 3D.115 the pace (and the slow-mo while someone is selected) is set in simTick */
  H.t++; const live = H.units.filter((s) => s.hp > 0);
  for (const f of H.fx) f.a--; H.fx = H.fx.filter((f) => f.a > 0);
  if (H.phase === 'done') return; if (!live.length) return shEnd(false);
  /* rooms wake when someone walks in */
  if (!H.camp) for (const z of H.zs) z.hid = z.hp > 0 && !H.rev[shRoomAt(z.w) || z.room];   /* behind a shut door: unseen */
  if (!H.camp) for (const s of live) { const r = shRoomAt(s.w); if ((r === 'A' || r === 'C') && !H.wing) H.wing = r; if (r) shReveal(r); if (r && !H.woke[r]) { H.woke[r] = H.t; if (!H.seen) H.seen = {}; if (!H.seen[r]) { H.seen[r] = 1; const D = SH_DEFS[H.dest], nm = r === 'R0' ? D.areas[0].name : r === 'R1' ? D.areas[1].name : r === 'B' ? D.areas[2].name : r === 'S' ? D.side : r === 'A' ? D.wings[0] : r === 'C' ? D.wings[1] : SH_LROOM[r]; if (r !== 'R0') say(`The squad enters ${nm}.`); } } }
  if (H.back) { let home = 0; for (const s of live) { s.target = null; s.mode = 'walk'; if (shGo(s, H.camp ? { x: H.exit.x + (H.units.indexOf(s) % 4 - 1.5) * .5, y: H.exit.y } : shWorld(.6, 10.5 + (H.units.indexOf(s) % 3) * .4), .045, 'u')) { home++; s.mode = 'free'; } } if (home === live.length || H.t - H.backT > 1200) return shEnd(false, true); }
  const zsLive = shLiveZs();
  if (!H.back) for (const s of H.units) (H.camp ? campUnitAI : shUnitAI)(s, zsLive, live);
  for (const z of zsLive) (H.camp ? campEnemyAI : shZombieAI)(z, live);
  if (H.camp) { campReinforce(); for (const b of H.blds) if (b.hitT > 0) b.hitT--; }
  if (H.camp) for (const f of Object.values(H.fence || {})) if (f.hitT > 0) f.hitT--;
  /* snares, barricades */
  for (const n of H.snares || []) if (!n.used) for (const z of zsLive) if (dist(z.w, n.w) < .55) { n.used = true; z.stuckT = H.t + 240; z.hp -= n.dmg; shFx(z.w, '🪤 -' + Math.round(n.dmg), '#ffb060'); break; }
  shSep(H.units.filter((s) => s.hp > 0), .5); shSep(zsLive, .48); shPickup(H, live);
  /* the camera follows the selected survivors, or everyone */
  const fol = H.free ? [] : (H.sel.length ? H.units.filter((s) => H.sel.includes(s.id) && s.hp > 0) : live); if (fol.length) { const cx = fol.reduce((a, s) => a + s.w.x, 0) / fol.length, cy = fol.reduce((a, s) => a + s.w.y, 0) / fol.length; H.cx += (cx + 1.8 - H.cx) * .05; H.cy += (cy + 1.5 - H.cy) * .05; }   /* keep the fight above the panel */
  if (H.raid && !H.camp && !H.goalDone && H.goal !== 'leader') { const r = RAID_GOALS[H.goal].room; if (!zsLive.some((z) => z.room === r) && live.some((s) => shRoomAt(s.w) === r)) { H.load = (H.load || 0) + 1; if (H.load % 60 === 1) shFx(live.find((s) => shRoomAt(s.w) === r).w, H.goal === 'loot' ? `📦 Loading ${Math.round(H.load / 1.8)}%` : `🔓 Opening ${Math.round(H.load / 1.8)}%`, '#ffe9b8'); if (H.load >= 180) shGoalDone(); } }   /* stand in the cleared goal room for 3 s */
  const boss = H.zs.find((z) => z.boss); if (boss && boss.hp <= 0 && !H.bossDown) { H.bossDown = true; SFX('reward'); say(`${boss.name} is down!`); if (H.camp) banner(`👑 ${boss.name.toUpperCase()} IS DOWN`); if (H.goal === 'leader' || !H.raid) shGoalDone(); }
  if (H.t % 20 === 0) shPanelTick();
}
function shSep(list, r) { for (let i = 0; i < list.length; i++) for (let j = i + 1; j < list.length; j++) { const a = list[i], b = list[j]; const dx = b.w.x - a.w.x, dy = b.w.y - a.w.y, l = Math.hypot(dx, dy) || .01; if (l < r) { const p = (r - l) / 2 / l, na = { x: a.w.x - dx * p, y: a.w.y - dy * p }, nb = { x: b.w.x + dx * p, y: b.w.y + dy * p }, ca = shCell(na), cb = shCell(nb); if (shOpen(ca.x, ca.y, 'u') === true) a.w = na; if (shOpen(cb.x, cb.y, 'u') === true) b.w = nb; } } }
function shUnitAI(s, zs, live) {
  const H = S.sh; if (s.hp <= 0) { s.mode = 'down'; s.moving = false; return; }
  if (s.reloadT > 0) { s.moving = false; if (--s.reloadT <= 0) reloadGun(s); return; }
  const w = weaponOf(s), reach = (w.ranged ? Math.min(4.5, rangeOf(s)) : .8) + (s.aimNext ? 1.5 : 0);
  if (s.mode === 'attack') { s.moving = false; if (--s.stateTicks > 0) return; const z = s.target;
    if (z && z.hp > 0 && dist(s.w, z.w) <= reach + .3) { const cr = !!s.critNext || !!s.aimNext, dm = shUnitDmg(s, z) * (cr ? 3 : 1); if (cr) { s.critNext = false; s.aimNext = false; shFx({ x: z.w.x, y: z.w.y - .4 }, 'CRIT!', '#ffd56b'); } else s.crit = Math.min(100, (s.crit || 0) + 14);
      z.hp -= dm; z.hitT = 9; if (z.mode === 'sleep') z.mode = 'idle'; SFX(w.ranged ? 'shot' : 'hit'); shFx(z.w, '-' + dm, z.boss ? '#ffd56b' : '#ffffff'); if (w.ranged) shots.push({ a: { ...s.w }, b: { ...z.w }, t: 6, bow: w.kind === 'bow' });
      if (w.ranged && usesAmmo(w)) { s.ammo = (s.ammo == null ? w.mag : s.ammo) - 1; if (s.ammo <= 0) s.reloadT = Math.round((w.reload || 2) * 60); }
      if (z.hp <= 0) { H.kills++; if (!H.practice) { S.kills++; gainXp(s, z.boss ? 12 : 2); } if (H.order === z) H.order = null; for (const q of H.units) if (q.order === z) q.order = null; } }
    s.mode = 'recover'; s.stateTicks = s.recDur = Math.round(48 * Math.max(.6, 1 - (stat(s, 'agi') - 5) * .02) * (w.rate || 1)); return; }
  if (s.mode === 'recover') { s.moving = false; if (--s.stateTicks > 0) return; s.mode = 'free'; }
  /* player orders come first: move, then attack */
  if (s.pick != null) { const d = H.doors[s.pick]; if (!d || !d.locked || d.open || d.broken) { s.pick = null; s.pickT = 0; s.mode = 'free'; } else { const dw = shDoorW(s.pick), near = dist(s.w, s.pickAt || dw) < .5 || dist(s.w, dw) < 1.05;
      if (!near) { s.mode = 'walk'; s.target = null; if (!shGo(s, s.pickAt || dw, .042, 'u') && !s.path) { s.pick = null; say(`${s.name} can't reach that door.`); } return; }
      s.mode = 'fix'; s.moving = false; s.faceW = dw; s.pickT = (s.pickT || 0) + 1; const need = ['Mechanic', 'Scavenger', 'Engineer'].includes(s.job) ? 150 : 300; d.prog = s.pickT / need;
      if (s.pickT >= need) { shDoorOpen(d, 'pick'); d.prog = 0; shFx(dw, '🔓 Unlocked', '#7be08a'); s.pick = null; s.pickT = 0; s.mode = 'free'; } return; } }
  if (s.moveTo) { s.mode = 'walk'; s.target = null; if (shGo(s, s.moveTo, .042, 'u')) { s.moveTo = null; s.mode = 'free'; s.holdAt = { ...s.w }; } return; }
  if (s.order && (s.order.hp <= 0)) s.order = null;
  const st = s.stance || 'attack', hurt = s.hp < s.max * .3;
  if (st === 'back' && hurt) { const safe = live.filter((q) => q !== s).sort((a, b) => dist(a.w, s.w) - dist(b.w, s.w))[0]; const away = zs.filter((z) => dist(z.w, s.w) < 3); if (away.length) { const e = shWorld(1, 10); s.mode = 'walk'; shGo(s, safe && !away.some((z) => dist(z.w, safe.w) < 2) ? safe.w : e, .045, 'u'); return; } }
  const awake = zs.filter((z) => !z.hid && (z.mode !== 'sleep' || dist(z.w, s.w) < 3));
  let t = s.order || H.order || null; if (!t && H.focus) t = awake.find((z) => z.boss) || null;
  if (!t) { let bd = st === 'hold' ? reach + .2 : 1e9; for (const z of awake) { const d0 = dist(s.w, z.w); if (d0 < bd) { bd = d0; t = z; } } }
  if (st === 'guard' && !s.order) { const ward = live.find((q) => q !== s && (q.job === 'Medic' || q.hp < q.max * .5)) || live.find((q) => q !== s); if (ward && dist(ward.w, s.w) > 1.6 && (!t || dist(t.w, ward.w) > 2.5)) { s.mode = 'walk'; shGo(s, ward.w, .042, 'u'); return; } }
  s.target = t;
  if (t) { const d0 = dist(s.w, t.w); if (d0 > reach) { if (st === 'hold' && !s.order && !H.order) { s.mode = 'free'; s.moving = false; return; } s.mode = 'chase'; shGo(s, t.w, .032, 'u'); } else { s.mode = 'attack'; s.stateTicks = 14; s.moving = false; s.faceW = { ...t.w }; } return; }
  /* nothing to fight and no orders: move on to the next room on the route (Hold stays put) */
  if (st !== 'hold' && !H.sel.includes(s.id)) { const nx = shNextRoom(); if (nx) { const [x0, y0, w, h] = SH_ROOMS[nx], i = H.units.indexOf(s), to = shWorld(x0 + 1.5 + (i % 3) * .9, y0 + h / 2 - 1 + Math.floor(i / 3) * .9); if (dist(s.w, to) > .5) { s.mode = 'walk'; shGo(s, to, .038, 'u'); return; } } }
  s.mode = 'free'; s.moving = false;
}
function shNextRoom() {   /* the default route: entrance, hall, the wing for the goal (north for the stockpile, south for the prisoners), boss room */
  if (S.sh.camp) return null; const H = S.sh, wing = H.wing || (H.goal === 'free' ? 'C' : 'A'), route = ['R0', 'R1', wing, 'B'];
  if (H.goalDone && H.raid) return null; if (shLiveZs().some((z) => z.mode !== 'sleep')) return null;
  return route.find((r) => !H.woke[r] || H.zs.some((z) => z.hp > 0 && z.room === r)) || null; }
function shZombieAI(z, live) {
  const H = S.sh; if (z.mode === 'sleep') { if (H.woke[z.room] || (H.rev[z.room] && live.some((s) => dist(s.w, z.w) < 5)) || live.some((s) => dist(s.w, z.w) < 2.2)) { z.mode = 'idle'; } else { z.moving = false; return; } }
  if (z.stuckT > H.t) { z.moving = false; return; }
  let t = z.tauntBy && z.tauntBy.hp > 0 && z.tauntBy.tauntT > H.t ? z.tauntBy : null, bd = 1e9; if (!t) for (const s of live) { const d0 = dist(s.w, z.w); if (d0 < bd) { bd = d0; t = s; } } z.target = t; if (!t) { z.moving = false; return; }
  const reach = z.ranged ? 4 : z.type === 'spitter' ? 2.4 : z.boss ? 1.15 : .75, d0 = dist(z.w, t.w);
  if (z.mode === 'zattack') { z.moving = false; if (--z.stateTicks > 0) return;
    if (z.bash) { const b = z.bash; b.hp -= z.atk * 1.5; shFx(z.w, '💥', '#ffb060'); if (b.hp <= 0) { if (b.x == null) shDoorOpen(b, 'break'); else { b.broken = true; b.open = true; } shFx(z.w, z.bash.x != null ? 'Barricade broken!' : 'Door broken!', '#ff6e62'); } z.bash = null; z.mode = 'zrecover'; z.stateTicks = 50; return; }
    if (dist(z.w, t.w) <= reach + .35 && t.hp > 0) { const dm = Math.max(1, Math.round(z.atk * (t.spec && hasSpec(t, 'swat') ? .8 : 1) * (t.tauntT > H.t ? .5 : 1) * (1 - dmgReduce(t)))); t.hp -= dm; t.hitT = 9; shFx(t.w, '-' + dm, '#ff6e62'); SFX(z.ranged ? 'shot' : 'hurt'); if (z.ranged) shots.push({ a: { ...z.w }, b: { ...t.w }, t: 6, bow: z.wpn === 'bow' }); if (t.hp <= 0) { t.hp = 0; t.mode = 'down'; t.moveTo = null; shFx(t.w, 'DOWN', '#ff6e62'); say(`${t.name} is down!`); } }
    z.mode = 'zrecover'; z.stateTicks = z.boss ? 70 : z.ranged ? 80 : 45; return; }
  if (z.mode === 'zrecover') { z.moving = false; if (--z.stateTicks > 0) return; z.mode = 'idle'; }
  if (z.bash) { z.mode = 'zattack'; z.stateTicks = 30; return; }
  if (z.ranged && d0 < 2.2) { const dx = z.w.x - t.w.x, dy = z.w.y - t.w.y, l = Math.hypot(dx, dy) || 1, to = { x: z.w.x + dx / l, y: z.w.y + dy / l }, c = shCell(to); if (shOpen(c.x, c.y, 'u') === true) { z.mode = 'rflee'; shGo(z, to, z.spd, 'z'); return; } }
  if (d0 > reach) { z.mode = 'zchase'; shGo(z, t.w, z.spd, 'z'); } else { z.mode = 'zattack'; z.stateTicks = z.boss ? 38 : z.type === 'brute' ? 34 : z.ranged ? 30 : 26; z.moving = false; }
}
function shGoalDone() { const H = S.sh; if (!H || H.goalDone) return; H.goalDone = true; SFX('reward');
  if (!H.raid) return shEnd(true);
  const G = RAID_GOALS[H.goal]; banner(`${G.icon} ${G.name.toUpperCase()}: DONE`); say(`${G.name}: done. Fall back to the entrance to get out with it.`); shPanel(); }
function shThrow(at) { const H = S.sh, k = ['grenade', 'pipebomb', 'molotov'].find((x) => (S.ex || {})[x] > 0); if (!k && !H.practice) { say('No explosives in stock.'); return false; }
  const thr = H.units.filter((s) => s.hp > 0 && (!H.sel.length || H.sel.includes(s.id))).sort((a, b) => dist(a.w, at) - dist(b.w, at))[0]; if (!thr || dist(thr.w, at) > 6) { say('Too far: get someone within 6 tiles.'); return false; }
  const E = EX_DEFS[k || 'pipebomb']; if (!H.practice) S.ex[k]--; let n = 0;
  for (const z of shLiveZs()) { const d = dist(z.w, at); if (d > E.r) continue; const kk = Math.round(E.dmg * (d < E.r * .5 ? 1 : .6) * (z.boss ? .5 : 1)); z.hp -= kk; z.hitT = 12; if (z.boss) z.stuckT = H.t + 120; if (E.burn) z.burnT = 180; if (z.mode === 'sleep') z.mode = 'idle'; shFx(z.w, '-' + kk, '#ffb060'); n++; if (z.hp <= 0) H.kills++; }
  if (H.camp) for (const f of Object.values(H.fence || {})) if (!f.dead && dist(f.w, at) < E.r) { const kk = Math.round(E.dmg * 1.5); f.hp -= kk; f.hitT = 12; if (f.hp <= 0) campFall(f); if (!H.alarm && H.zs.some((q) => q.hp > 0 && !q.worker && dist(q.w, at) < 10)) campAlarm(at, 'The blast was heard'); }
  if (H.camp) for (const b of H.blds) if (!b.dead && campDist({ w: at }, b) < E.r) { const kk = Math.round(E.dmg * 1.5); b.hp -= kk; b.hitT = 12; shFx(b.w, '-' + kk, '#ffb060'); if (b.hp <= 0) campFall(b); campAlarm(at, 'The blast woke the camp'); }
  H.doors.forEach((d, i) => { if (!d.broken && dist(shDoorW(i), at) < E.r) { shDoorOpen(d, 'break'); shFx(shDoorW(i), 'Door blown open!', '#ffb060'); } });
  for (const s of H.units) if (s.hp > 0 && dist(s.w, at) < E.r * .8) { const kk = Math.round(E.dmg * .25); s.hp = Math.max(0, s.hp - kk); shFx(s.w, '-' + kk, '#ff6e62'); }
  (window.ZH_BOOMS ||= []).push({ x: at.x, y: at.y, r: E.r, burn: !!E.burn, t: performance.now() }); SFX('hit'); shFx(at, E.icon, '#ffd070'); H.throwMode = false; shPanel(); return true; }
function shCall(k) { const H = S.sh; if (!H || H.phase === 'done') return;
  if (k === 'focus') { H.focus = !H.focus; say(H.focus ? 'Focus the boss!' : 'Fight as you see fit.'); }
  else if (k === 'med') { if ((S.meds || 0) < 1 && !H.practice) { say('No medicine left in the stash.'); return; } const pool = H.sel.length ? H.units.filter((q) => H.sel.includes(q.id)) : H.units; const s = pool.slice().sort((a, b) => a.hp / a.max - b.hp / b.max)[0]; if (!s) return; if (!H.practice) S.meds--; const up = s.hp <= 0; s.hp = Math.min(s.max, Math.max(s.hp, 0) + Math.round(s.max * .5)); if (up) s.mode = 'free'; shFx(s.w, '+' + Math.round(s.max * .5), '#7be08a'); say(`${s.name} used a medkit${up ? ' and is back up' : ''}.`); ui(); }
  else if (k === 'back') { if (H.back) return; if (H.camp) { H.back = true; H.backT = H.t; say('Everyone out through the gate!'); } else if (H.goalDone && H.raid) { H.back = true; H.backT = H.t; H.winOnExit = true; say('Out, with the goods!'); } else { H.back = true; H.backT = H.t; say('Fall back! The squad retreats to the entrance.'); } }
  else if (k === 'view') { H.view = !H.view; shTapLayer(); }
  else if (k === 'follow') { H.free = false; }
  else if (k === 'list') { H.list = !H.list; }
  else if (k.startsWith('med:')) { const s = H.units.find((q) => q.id === +k.slice(4)); if (!s) return; if ((S.meds || 0) < 1 && !H.practice) { say('No medicine left in the stash.'); return; } if (s.hp >= s.max) return; if (!H.practice) S.meds--; const up = s.hp <= 0, add = Math.round(s.max * .5); s.hp = Math.min(s.max, Math.max(s.hp, 0) + add); if (up) s.mode = 'free'; shFx(s.w, '+' + add, '#7be08a'); say(`${s.name} used a medkit${up ? ' and is back up' : ''}.`); ui(); }
  else if (k === 'stall') { const ks = Object.keys(SH_STANCE), sel = H.units.filter((q) => H.sel.includes(q.id)), nx = ks[(ks.indexOf(sel[0].stance || 'attack') + 1) % ks.length]; for (const q of sel) { q.stance = nx; } shFx(sel[0].w, SH_STANCE[nx].icon + ' ' + SH_STANCE[nx].name, '#ffe9b8'); }
  else if (k === 'all') { H.sel = H.sel.length === H.units.filter((q) => q.hp > 0).length ? [] : H.units.filter((q) => q.hp > 0).map((q) => q.id); }
  else if (k === 'throw') { H.throwMode = !H.throwMode; if (H.throwMode) say('Tap where to throw.'); }
  else if (k === 'clear') { H.sel = []; H.order = null; }
  else if (k.startsWith('sel:')) { const id = +k.slice(4); H.sel = H.sel.length === 1 && H.sel[0] === id ? [] : [id]; if (H.sel.length) H.free = false; }
  else if (k.startsWith('ab:')) { const s = H.units.find((q) => q.id === +k.slice(3)); if (s) shUseAbil(s); return; }
  else if (k.startsWith('st:')) { const s = H.units.find((q) => q.id === +k.slice(3)); if (s) { const ks = Object.keys(SH_STANCE); s.stance = ks[(ks.indexOf(s.stance || 'attack') + 1) % ks.length]; shFx(s.w, SH_STANCE[s.stance].icon + ' ' + SH_STANCE[s.stance].name, '#ffe9b8'); } }
  else if (k.startsWith('crit:')) { const s = H.units.find((q) => q.id === +k.slice(5)); if (s && (s.crit || 0) >= 100) H.ring = { id: s.id, t0: performance.now() }; }
  shPanel(); }
function shEnd(won, fled) {
  const H = S.sh; if (!H || H.phase === 'done') return; H.phase = 'done'; const D = SH_DEFS[H.dest], d = EXP_DEFS[H.dest] || { name: H.dest, icon: '⚔', loot: { mat: [3, 5] } };
  if (fled && H.winOnExit) { won = true; fled = false; }
  if (H.practice) { S.sh = null; shPanel(); showEventPopup({ title: won ? 'PRACTICE: CLEARED' : 'PRACTICE OVER', text: `${H.kills} enemies down in ${Math.round(H.t / 60)} s of fighting. Nothing was lost or gained.`, buttons: [{ label: 'AGAIN', fn: () => showShPractice() }, { label: 'DONE' }] }); return; }
  const entry = (() => { for (const w of world.walls.values()) if (w.type === 'gate' && w.y < Wd.BUILD.y0) return tc(w.x, w.y + 1); return tc(7 + OFF, 7 + OFF); })();
  const lost = [], hurt = [], loot = { ...H.loot }, lines0 = []; let recruit = null; const items = [];
  for (const [i, s] of H.units.entries()) {
    const down = s.hp <= 0; if (down && !won && rnd() < .04) { lost.push(s.name); continue; }
    if (down) { s.hp = Math.max(1, Math.round(s.max * .2)); hurt.push(s.name); }
    s.w = { x: entry.x + (i % 3 - 1) * .3, y: entry.y + Math.floor(i / 3) * .3 }; s.mode = 'free'; s.target = null; s.moving = false; s.reloadT = 0; s.moveTo = null; s.order = null; s.path = null; delete s.shHome; s.stateTicks = 60; S.sv.push(s); if (won) gainXp(s, 10);
  }
  if (H.camp) { const F = fac(H.raid), down = H.blds.filter((b) => b.dead).length; F.att = Math.max(-100, (F.att || 0) - (H.raid === 'green' ? 120 : 15 + 4 * down)); F.raided = (F.raided || 0) + 1;
    if (H.raid === 'green') { F.ally = false; F.revenge = S.day + 3; lines0.push('🌿 Greenwater will never forgive this. The alliance is over, and they will hit back.'); }
    if (H.raid === 'toll') { F.next = Math.min(F.next || 1e9, S.day + 2); F.revenge = S.day + 2; lines0.push('👑 The Toll Kings will come for revenge.'); }
    if (H.bossDown) { F.goneUntil = S.day + 60; F.beaten = (F.beaten || 0) + 1; if (H.raid === 'toll') setTimeout(() => earnBanner('faction', 'The Toll Collector fell in his own camp.'), 900); lines0.push(`${H.raid === 'toll' ? '👑' : '🌿'} Their leader is down: they scatter for 60 days.`); }
    F.raidUntil = S.day + 4; F.ruins = [...(F.ruins || []).filter((r) => S.day - r.d < 10), ...H.blds.filter((b) => b.dead && !b.wasRuin).map((b) => ({ t: b.type, d: S.day }))];   /* 3D.125 review bug 2: a camp is on high alert for 4 days after a raid, and what was burnt stays burnt for 10 */
    if (down) lines0.push(`💥 ${down} of their buildings brought down.`); if (fled) renownGain(5 + 2 * down + (H.bossDown ? 10 : 0), d.name); if (!fled) H.loot = {}; }
  if ((won || fled) && H.found) { const n = Math.min(H.found, popCap() - S.sv.length - (S.kids || []).length); for (let i = 0; i < n; i++) { const q = mk(freeFirst(), ['Scavenger', 'Farmer', 'Medic'][i % 3], 2, entry.x, entry.y + .6, S.sv.length); q.src = 'trip'; q.sat = 3; S.sv.push(q); } if (n > 0) lines0.push(`🙋 ${n} survivor${n > 1 ? 's' : ''} found behind a locked door came home with the squad.`); }
  if (won || fled) items.push(...(H.items || []));
  if (fled) { const r = { ...H.loot }; S.mat += r.mat || 0; addLoot({ wood: r.wood, stone: r.stone, cloth: r.cloth, meds: r.meds, fuel: r.fuel, ammo: r.ammo, food: r.food, water: r.water }, d.name); items.filter(Boolean).forEach((id) => stashAdd(id)); if (Object.keys(r).length || items.length) lines0.push('📦 They got out with what they found in the side rooms.'); H.loot = {}; }
  if (won) { const r = (a) => a[0] + Math.floor(rnd() * (a[1] - a[0] + 1)), mult = H.raid ? (H.goal === 'loot' ? 3 : 1) : 3; for (const k in d.loot) loot[k] = (loot[k] || 0) + r(d.loot[k]) * mult;
    const pool = H.raid === 'toll' ? ['roadsign', 'spikedclub', 'biker', 'riot', 'rifle'] : H.raid === 'green' ? ['bow', 'crossbow', 'raincoat', 'hoodie'] : H.dest.startsWith('sh_') ? ['katana', 'military', 'swathelm', 'tactvest', 'shotgun', 'smg', 'kevlar'] : H.dest === 'prison' ? ['rifle', 'shotgun', 'riot', 'kevlar', 'swathelm', 'tactvest'] : ['medpouch', 'hazmat', 'gasmask', 'kevlar', 'machete', 'crossbow'];
    const nf = items.length; for (const id of pool) if (ITEMS[id] && items.length < nf + 2 && rnd() < .5) items.push(id); if (items.length === nf) items.push(pool.find((id) => ITEMS[id]));
    if (H.raid) { const F = fac(H.raid); F.att = Math.max(-100, (F.att || 0) - (H.raid === 'green' ? 120 : 30)); F.raided = (F.raided || 0) + 1;
      if (H.raid === 'green') { F.ally = false; F.revenge = S.day + 3; lines0.push('🌿 Greenwater will never forgive this. The alliance is over, and they will hit back.'); }
      if (H.raid === 'toll') { F.next = Math.min(F.next || 1e9, S.day + 2); F.revenge = S.day + 2; lines0.push('👑 The Toll Kings will come for revenge.'); }
      if (H.goal === 'free') { const n = Math.min(3, popCap() - S.sv.length - (S.kids || []).length); for (let i = 0; i < n; i++) { const q = mk(freeFirst(), ['Farmer', 'Engineer', 'Scavenger'][i % 3], 2 + i, entry.x, entry.y + .6, S.sv.length); q.src = 'event'; q.sat = 3; S.sv.push(q); } lines0.push(n > 0 ? `🔓 ${n} prisoner${n > 1 ? 's' : ''} came home with the squad.` : '🔓 The prisoners were freed, but there were no beds for them.'); }
      if (H.goal === 'leader' || H.bossDown) { F.goneUntil = S.day + 60; F.beaten = (F.beaten || 0) + 1; if (H.raid === 'toll') setTimeout(() => earnBanner('faction', 'The Toll Collector fell in his own hall.'), 900); lines0.push(`${H.raid === 'toll' ? '👑' : '🌿'} Their leader is down: they scatter for 60 days.`); } }
    else { if (H.dest.startsWith('sh_')) { S.shSeason = { ...(S.shSeason || {}), [H.dest]: seasonIdx() }; S.trophies = [...(S.trophies || []), { k: H.dest, day: S.day }]; renownGain(15, 'Seasonal trophy'); lines0.push(`🏆 A ${d.name} trophy now hangs in the HQ.`); }
      if (H.dest === 'prison' && !vehOf('van')) setTimeout(() => vehArrive('van', 'In the prison motor pool the squad found'), 2500);
      if (S.sv.length + (S.kids || []).length < popCap()) { const names = H.dest === 'prison' ? ['Dutch', 'Marisol', 'Grant', 'Lou'] : ['Dr. Ines', 'Nurse Pat', 'Callum', 'Ada'], nm = names.find((n) => !S.sv.some((q) => q.name === n)) || freeFirst(), jb = H.dest === 'prison' ? 'Guard' : 'Medic';
        recruit = mk(nm, jb, 3, entry.x, entry.y + .6, S.sv.length); recruit.sat = 3; recruit.stateTicks = 80; recruit.src = 'trip'; S.sv.push(recruit); }
      S.shCleared = S.shCleared || {}; S.shCleared[H.dest] = (S.shCleared[H.dest] || 0) + 1; setTimeout(() => earnBanner('stronghold', `The squad cleared ${d.name}.`), 900); }
    S.mat += loot.mat || 0; addLoot({ wood: loot.wood, stone: loot.stone, cloth: loot.cloth, meds: loot.meds, fuel: loot.fuel, ammo: loot.ammo, food: loot.food, water: loot.water }, d.name); items.filter(Boolean).forEach((id) => stashAdd(id)); renownGain(H.raid ? 15 : 25, d.name);
  } else { if (H.raid) { const F = fac(H.raid); F.att = Math.max(-100, (F.att || 0) - 15); } if (H.loot.mat) S.mat += H.loot.mat; if (!fled) S.shTryDay = { ...(S.shTryDay || {}), [H.dest]: S.day }; }
  S.sh = null; shPanel(); autoStaff(); statAdd('exp');
  const bossName = (D.areas[2].boss || {}).name || 'the boss', lines = [won ? (H.raid ? `<b>${RAID_GOALS[H.goal].icon} ${RAID_GOALS[H.goal].name}: done.</b>` : `<b>${esc(bossName)} is dead.</b> ${esc(d.name)} is cleared.`) : fled ? 'The squad fell back and got out.' : 'The squad was overrun and dragged itself home.'];
  lines.push(...lines0); if (hurt.length) lines.push(`<b>Wounded:</b> ${hurt.map(esc).join(', ')}.`); if (lost.length) lines.push(`<b style="color:#ff8a7a">Didn't make it:</b> ${lost.map(esc).join(', ')}.`); if (recruit) lines.push(`${esc(recruit.name)}, a ${recruit.job}, was rescued inside and came home with the squad.`);
  if (H.camp) lines[0] = fled ? `The squad got out of ${esc(d.name)}.` : 'The squad was overrun and dragged itself home.';
  if ((H.camp && fled) && !window.ZH_NO_REVEAL && (Object.keys(loot).length || items.length)) lootReveal({ title: 'RAID DONE', sub: `${d.icon} ${d.name}`, entries: lootEntries(loot, items.filter(Boolean)), note: lines.join('<br>') });
  else if ((won) && !window.ZH_NO_REVEAL) lootReveal({ title: H.raid ? 'RAID DONE' : 'STRONGHOLD CLEARED', sub: `${d.icon} ${d.name}`, entries: lootEntries(loot, items.filter(Boolean)), note: lines.join('<br>') });
  else showEventPopup({ title: won ? (H.raid ? 'RAID DONE' : 'STRONGHOLD CLEARED') : 'BACK HOME', text: lines.join('<br>'), buttons: [{ label: 'OK' }] });
  saveGame(); ui();
}
/* the panel: portraits with health, crit, stance and ability; the calls; the goal */
function shPanel() {   /* 3D.115 owner: too crowded. Now a slim pill on top (where, goal, boss) and one bar at the bottom; a survivor's own buttons show only while they are selected */
  let el = $('shPanel'), top = $('shTop'); const H = S.sh;
  document.documentElement.classList.toggle('shView', !!(H && H.view));   /* the town's own menu bar hides while watching the squad */
  if (!H) { if (el) el.remove(); if (top) top.remove(); shPickClose(); shTapLayer(); return; }
  const d = EXP_DEFS[H.dest] || { name: H.dest, icon: '⚔' };
  if (!el) { el = document.createElement('div'); el.id = 'shPanel'; el.className = 'shPanel'; document.body.appendChild(el); el.addEventListener('click', (e) => { const b = e.target.closest('[data-c]'); if (b) { e.stopPropagation(); shCall(b.dataset.c); } }); }
  if (!top) { top = document.createElement('div'); top.id = 'shTop'; top.className = 'shTop'; document.body.appendChild(top); }
  top.innerHTML = `<b>${d.icon} ${esc(d.name)}${H.practice ? ' · practice' : ''}</b>${H.goal ? `<span class="shGoal ${H.goalDone ? 'done' : ''}">${RAID_GOALS[H.goal].icon} ${RAID_GOALS[H.goal].name}${H.goalDone ? ' ✓' : ''}</span>` : ''}<div class="shBoss"></div>`;
  const exN = Object.values(S.ex || {}).reduce((a, b) => a + b, 0), sel = H.units.filter((q) => H.sel.includes(q.id) && q.hp > 0);
  let ctx0 = '';
  if (sel.length === 1) { const s = sel[0], A = shAbil(s), cd = Math.max(0, (s.abT || 0) - H.t), St = SH_STANCE[s.stance || 'attack'];
    ctx0 = `<div class="shSel"><span class="nm">${esc(s.name)}<em><b style="width:${Math.max(0, Math.round(s.hp / s.max * 100))}%"></b></em></span><button data-c="st:${s.id}">${St.icon} ${St.name}</button><button data-c="ab:${s.id}" ${cd ? 'disabled' : ''} title="${A.desc}">${A.icon} ${A.name}${cd ? ` ${Math.ceil(cd / 60)}s` : ''}</button>${(s.crit || 0) >= 100 ? `<button data-c="crit:${s.id}" class="crit">✦ Crit</button>` : ''}<button data-c="med:${s.id}" ${s.hp >= s.max ? 'disabled' : ''}>💊</button><button data-c="clear" class="x">✕</button></div>`; }
  else if (sel.length > 1) ctx0 = `<div class="shSel"><span class="nm">${sel.length} selected</span><button data-c="stall">${SH_STANCE[sel[0].stance || 'attack'].icon} Stance</button><button data-c="clear" class="x">✕</button></div>`;
  const list = H.list ? `<div class="shList"><div class="shLHead"><b>Squad</b><button data-c="all">${sel.length > 1 ? 'Let go' : 'Select all'}</button><button data-c="list" class="x">✕</button></div>${H.units.map((s) => { const A = shAbil(s), cd = Math.max(0, (s.abT || 0) - H.t), St = SH_STANCE[s.stance || 'attack'];
    return `<div class="shU ${s.hp <= 0 ? 'down' : ''} ${H.sel.includes(s.id) ? 'sel' : ''}" data-c="sel:${s.id}" data-id="${s.id}"><span class="nm">${esc(s.name)}<small>${esc(s.job)}</small></span><em><b style="width:${Math.max(0, Math.round(s.hp / s.max * 100))}%"></b></em><span class="ctl"><button data-c="st:${s.id}" title="Stance: ${St.name}">${St.icon}</button><button data-c="ab:${s.id}" class="ab" ${cd || s.hp <= 0 ? 'disabled' : ''} title="${A.name}: ${A.desc}">${A.icon}${cd ? `<i>${Math.ceil(cd / 60)}</i>` : ''}</button><button data-c="crit:${s.id}" class="crit" ${(s.crit || 0) >= 100 && s.hp > 0 ? '' : 'hidden'} title="Critical: tap, then tap again as the ring hits the gold band">✦</button><button data-c="med:${s.id}" class="med" ${s.hp >= s.max ? 'disabled' : ''} title="Use a medkit on ${esc(s.name)}">💊</button></span></div>`; }).join('')}</div>` : '';   /* 3D.118 owner: a squad list you can open, with a medkit for each person */
  el.innerHTML = list + (H.list ? '' : ctx0) + `<div class="shBtns"><button data-c="list" class="${H.list ? 'on' : ''}">👥 Squad</button><button data-c="med">💊 Medkit <small>${H.practice ? '∞' : S.meds || 0}</small></button><button data-c="throw" class="${H.throwMode ? 'on' : ''}" ${exN || H.practice ? '' : 'disabled'}>💣 Bomb <small>${H.practice ? '∞' : exN}</small></button><button data-c="back" ${H.back ? 'disabled' : ''}>${(H.goalDone && H.raid) || H.camp ? '🏃 Get out' : '↩ Fall back'}</button><button data-c="view">${H.view ? '🏠 Town' : '⚔ Squad'}</button>${H.free && H.view ? '<button data-c="follow">⌖</button>' : ''}</div>`;
  el.classList.toggle('town', !H.view); shTapLayer(); shCoach(); shPanelTick(true);
}
/* 3D.128 a short coach the first time you lead a squad: three cards that move on as you do each thing */
const SH_COACH = ['<b>Pick someone.</b> Tap a survivor, or open 👥 Squad to pick everyone.', '<b>Give an order.</b> Tap the ground to walk there, an enemy to attack it, a door or a building to open or break it.', '<b>The bar.</b> 💊 heals, 💣 throws where you tap next, and the run button gets everyone out with what they carry.'];
function shCoach() { const H = S.sh; let el = $('shCoach'); const on = H && H.view && !S.shCoached && H.phase !== 'done' && !H.list;
  if (!on) { if (el) el.remove(); return; }
  const st = H.coachSt = Math.max(H.coachSt || 0, H.coachAct ? 2 : H.sel.length ? 1 : 0);
  if (!el) { el = document.createElement('div'); el.id = 'shCoach'; el.className = 'shCoach'; document.body.appendChild(el); el.addEventListener('click', (e) => { const b = e.target.closest('button'); if (!b) return; e.stopPropagation(); S.shCoached = true; el.remove(); }); }
  if (el.dataset.st !== String(st)) { el.dataset.st = st; el.innerHTML = `<span class="n">${st + 1}/3</span><span class="t">${SH_COACH[st]}</span><button>${st === 2 ? 'Got it' : 'Skip'}</button>`; }
}
function shPanelTick(inner) { const el = $('shPanel'), top = $('shTop'), H = S.sh; if (!H) { const c = $('shCoach'); if (c) c.remove(); } if (!el || !H) return; shCoach();
  if (H.list) el.querySelectorAll('.shU').forEach((row) => { const s = H.units.find((q) => q.id === +row.dataset.id); if (!s) return; const b = row.querySelector('em b'); if (b) b.style.width = Math.max(0, Math.round(s.hp / s.max * 100)) + '%'; row.classList.toggle('down', s.hp <= 0); row.classList.toggle('sel', H.sel.includes(s.id));
    const ab = row.querySelector('.ab'), cd = Math.max(0, (s.abT || 0) - H.t); if (ab) { ab.disabled = !!cd || s.hp <= 0; const i = ab.querySelector('i'); if (cd) { if (i) i.textContent = Math.ceil(cd / 60); else ab.insertAdjacentHTML('beforeend', `<i>${Math.ceil(cd / 60)}</i>`); } else if (i) i.remove(); }
    const cr = row.querySelector('.crit'); if (cr) cr.hidden = !((s.crit || 0) >= 100 && s.hp > 0); const md = row.querySelector('.med'); if (md) md.disabled = s.hp >= s.max; });
  const nm = el.querySelector('.shSel .nm em b'), s1 = H.sel.length === 1 && H.units.find((q) => q.id === H.sel[0]); if (nm && s1) nm.style.width = Math.max(0, Math.round(s1.hp / s1.max * 100)) + '%';
  const b = top && top.querySelector('.shBoss'), bz = H.zs.find((z) => z.boss && z.hp > 0 && H.rev.B), left = H.zs.filter((z) => z.hp > 0 && !z.hid).length, hidden = Object.keys(SH_ROOMS).filter((r) => !H.rev[r]).length;
  if (b && H.camp) { const gl = H.zs.filter((z) => z.hp > 0 && !z.worker).length, dn = H.blds.filter((q) => q.dead).length; const rs = H.alarm && H.reinAt ? Math.max(0, Math.ceil((H.reinAt - H.t) / 60)) : 0; b.innerHTML = `<span class="sm">${H.night ? '🌙 ' : ''}${H.alarm ? '🔔 Alarm!' + (rs ? ` More in ${Math.floor(rs / 60)}:${String(rs % 60).padStart(2, '0')}` : '') : '🤫 Unseen'} · ${gl} guards · ${dn}/${H.blds.length} buildings down · 🎒 ${campBagLoad(H)}/${campBag(H)}${(H.items || []).length ? ' +' + H.items.length + ' gear' : ''}</span>`; }
  else if (b) b.innerHTML = bz && H.woke.B ? `<span>☠ ${esc(bz.name)}</span><em><b style="width:${Math.max(0, Math.round(bz.hp / bz.max * 100))}%"></b></em>` : `<span class="sm">${left} in sight · ${hidden} room${hidden === 1 ? '' : 's'} unexplored</span>`;
  if (!inner && !H.list && s1 && (((s1.crit || 0) >= 100) !== !!el.querySelector('.crit') || (s1.abT && s1.abT - H.t <= 0 && el.querySelector(`[data-c="ab:${s1.id}"][disabled]`)) || (s1.abT - H.t > 0 && H.t % 60 === 0))) shPanel(); }
/* the tap layer over the 3D view */
function shTapLayer() { let el = $('shTap'); const on = !!(S.sh && S.sh.view && S.sh.phase !== 'done');
  if (!on) { if (el) el.remove(); return; } if (el) return;   /* 3D.115 owner: drag to pan, pinch or wheel to zoom; a short tap still gives orders. In the Town view this layer is gone, so the town pans as usual */
  el = document.createElement('div'); el.id = 'shTap'; el.style.cssText = 'position:fixed;inset:0;z-index:39;touch-action:none'; document.body.appendChild(el);
  const P = new Map(); let st = null, pin = null;
  const pan = (dx, dy) => { const H = S.sh; if (!H || !ZH3D.shProject) return; const a = ZH3D.shProject(H.cx, H.cy, 0), bx = ZH3D.shProject(H.cx + 1, H.cy, 0), by = ZH3D.shProject(H.cx, H.cy + 1, 0); if (!a || !bx || !by) return;
    const m00 = bx.x - a.x, m01 = by.x - a.x, m10 = bx.y - a.y, m11 = by.y - a.y, det = m00 * m11 - m01 * m10 || 1; H.cx -= (m11 * dx - m01 * dy) / det; H.cy -= (-m10 * dx + m00 * dy) / det;
    H.cx = Math.max(SH_AX - 2, Math.min(SH_AX + shW() + 2, H.cx)); H.cy = Math.max(SH_AY - 3, Math.min(SH_AY + shH() + 4, H.cy)); if (!H.free) { H.free = true; shPanel(); } };
  el.addEventListener('pointerdown', (e) => { el.setPointerCapture(e.pointerId); P.set(e.pointerId, { x: e.clientX, y: e.clientY }); if (P.size === 1) st = { x: e.clientX, y: e.clientY, lx: e.clientX, ly: e.clientY, moved: false }; else { st = null; const a = [...P.values()]; pin = { d: Math.max(20, Math.hypot(a[1].x - a[0].x, a[1].y - a[0].y)), z: S.sh ? S.sh.cz : 1.8 }; } });
  el.addEventListener('pointermove', (e) => { if (!P.has(e.pointerId)) return; P.set(e.pointerId, { x: e.clientX, y: e.clientY }); const H = S.sh; if (!H) return;
    if (P.size >= 2 && pin) { const a = [...P.values()]; H.cz = Math.max(.9, Math.min(3.2, pin.z * Math.max(20, Math.hypot(a[1].x - a[0].x, a[1].y - a[0].y)) / pin.d)); return; }
    if (st) { if (Math.hypot(e.clientX - st.x, e.clientY - st.y) > 9) st.moved = true; if (st.moved) { shPickClose(); pan(e.clientX - st.lx, e.clientY - st.ly); st.lx = e.clientX; st.ly = e.clientY; } } });
  const end = (e, cancel) => { const tap = !cancel && st && !st.moved && P.size === 1; P.delete(e.pointerId); if (P.size < 2) pin = null; if (P.size === 1) { const q = [...P.values()][0]; st = { x: q.x, y: q.y, lx: q.x, ly: q.y, moved: true }; } else if (!P.size) st = null; if (tap) { e.preventDefault(); shTap(e.clientX, e.clientY); } };
  el.addEventListener('pointerup', (e) => end(e)); el.addEventListener('pointercancel', (e) => end(e, true));
  el.addEventListener('wheel', (e) => { e.preventDefault(); const H = S.sh; if (H) H.cz = Math.max(.9, Math.min(3.2, H.cz * (e.deltaY < 0 ? 1.1 : .91))); }, { passive: false }); }
function shUnproject(x, y) { if (!window.ZH3D || !ZH3D.shProject) return null; const H = S.sh; let best = null, bd = 1e9;   /* coarse-to-fine search over the grid for the floor point under the tap */
  for (let gy = 0; gy < shH(); gy++) for (let gx = 0; gx < shW(); gx++) { if (!shGrid()[gy][gx]) continue; const w = shWorld(gx, gy), p = ZH3D.shProject(w.x, w.y, 0); if (!p) continue; const d = Math.hypot(p.x - x, p.y - y); if (d < bd) { bd = d; best = w; } }
  if (!best) return null; let w = best; for (const step of [.25, .12]) { let b2 = w, d2 = 1e9; for (let i = -2; i <= 2; i++) for (let j = -2; j <= 2; j++) { const q = { x: w.x + i * step, y: w.y + j * step }, p = ZH3D.shProject(q.x, q.y, 0); const d = Math.hypot(p.x - x, p.y - y); if (d < d2) { d2 = d; b2 = q; } } w = b2; } return w; }
function shTap(px, py) {   /* 3D.118 owner: when a tap lands on several things, a small menu asks which one (like the town) */
  const H = S.sh; if (!H || !window.ZH3D || !ZH3D.shProject) return; shPickClose(); const r0 = cv.getBoundingClientRect(), x = px - r0.left, y = py - r0.top;
  if (H.ring) { const k = (performance.now() - H.ring.t0) / 1000, rad = 70 - 60 * k; const u = H.units.find((q) => q.id === H.ring.id); if (u) { if (rad >= 16 && rad <= 30) { u.critNext = true; shFx(u.w, 'CRITICAL READY!', '#ffd56b'); SFX('chime'); } else shFx(u.w, 'Missed the timing', '#b4a296'); u.crit = 0; } H.ring = null; shPanel(); return; }
  if (H.throwMode) { const at = shUnproject(x, y); if (at) shThrow(at); return; }
  const all = (list, h, r, k) => list.map((o) => { const p = ZH3D.shProject(o.w.x, o.w.y, h); return p ? { k, o, d: Math.hypot(p.x - x, p.y - y) } : null; }).filter((c) => c && c.d < r);
  const c = [...all(H.units.filter((q) => q.hp > 0), .9, 34, 'u'), ...all(H.zs.filter((q) => q.hp > 0 && !q.hid && (q.mode !== 'sleep' || H.woke[q.room] || H.rev[q.room])), 1, 40, 'z'),
    ...(H.camp ? all(H.blds.filter((b) => !b.looted || !b.dead), .7, 44, 'b') : []), ...(H.camp ? all(Object.values(H.fence || {}).filter((f) => !f.dead), .4, 26, 'b') : []), ...all(H.doors.map((d, i) => ({ d, i, w: shDoorW(i) })).filter((q) => !q.d.broken), .5, 40, 'd')].sort((a, b) => a.d - b.d);
  const at = shUnproject(x, y);
  if (c.length > 1) { shPickMenu(px, py, c, at); return; }
  if (c.length === 1 && (c[0].k !== 'b' || c[0].o.fence)) { shAct(c[0]); return; }
  if (c.length === 1) { shPickMenu(px, py, c, null); return; }
  if (H.sel.length && at) shMoveTo(at);
}
function shMoveTo(at) { const H = S.sh; H.coachAct = true; const who = H.units.filter((q) => H.sel.includes(q.id) && q.hp > 0); who.forEach((q, i) => { q.moveTo = { x: at.x + (i % 3 - 1) * .5, y: at.y + Math.floor(i / 3) * .5 }; q.order = null; q.target = null; q.loot = null; q.pick = null; }); shFx(at, '⬤', '#9fd8ff'); }
const shFoeName = (z) => z.name || (z.worker ? 'Worker' : z.human ? (z.wpn === 'rifle' ? 'Gunman' : z.wpn === 'bow' ? 'Archer' : 'Guard') : (zombieTypes[z.type] || {}).name || 'Zombie');
function shActLabel(c) { const H = S.sh, o = c.o;
  if (c.k === 'u') return [H.sel.includes(o.id) ? '✋' : '🙂', `${o.name}`, `${o.job} · ${H.sel.includes(o.id) ? 'tap to let go' : 'select'}`];
  if (c.k === 'z') return ['⚔', `Attack the ${shFoeName(o)}`, `Health ${Math.max(0, Math.ceil(o.hp))}/${o.max}`];
  if (c.k === 'b' && o.fence) return ['🪓', 'Break the fence here', `${Math.ceil(o.hp)}/${o.max} · loud: guards close by will hear`];
  if (c.k === 'b') { const ks = Object.entries(o.loot || {}).filter(([, n]) => n > 0).map(([k]) => (RES_NAME[k] || k).toLowerCase()), has = o.pris ? 'Prisoners locked inside' : ks.length || o.items.length ? 'Holds ' + [...(o.items.length ? [o.items.length > 1 ? 'gear' : 'a piece of gear'] : []), ...ks].join(', ') : 'Nothing worth taking';
    return o.dead ? ['📦', `Loot the ${o.name}`, has] : ['🎯', `Attack the ${o.name}`, `${has} · ${Math.ceil(o.hp)}/${o.max}`]; }
  return o.d.locked && !o.d.open ? ['🔒', 'Force the lock', 'Mechanics, Scavengers and Engineers are quicker'] : ['🚪', o.d.open ? 'Shut the door' : 'Open the door', ''];
}
function shPickClose() { const e = $('shPick'); if (e) e.remove(); }
function shPickMenu(px, py, c, at) { const H = S.sh, d = document.createElement('div'); d.id = 'shPick'; d.className = 'pick shPick';
  const opts = c.slice(0, 5); if (H.sel.length && at) opts.push({ k: 'm', at });
  d.innerHTML = opts.map((q, i) => { const [ic, t, sub] = q.k === 'm' ? ['⬤', 'Move here', 'The selected survivors walk here'] : shActLabel(q); return `<button data-k="${i}"><span class="pi">${ic}</span><span><b>${esc(t)}</b><small>${esc(sub)}</small></span></button>`; }).join('');
  document.body.appendChild(d); const bw = d.offsetWidth, bh = d.offsetHeight; d.style.left = Math.max(8, Math.min(innerWidth - bw - 8, px - bw / 2)) + 'px'; d.style.top = Math.max(60, Math.min(innerHeight - bh - 130, py + 18)) + 'px';
  d.querySelectorAll('button').forEach((el) => { el.onclick = (e) => { e.stopPropagation(); const q = opts[+el.dataset.k]; shPickClose(); if (!S.sh) return; if (q.k === 'm') shMoveTo(q.at); else shAct(q); }; }); }
function shAct(c) { const H = S.sh; H.coachAct = true; const pool = () => (H.sel.length ? H.units.filter((q) => H.sel.includes(q.id)) : H.units).filter((q) => q.hp > 0);
  if (c.k === 'u') { const u = c.o; H.sel = H.sel.length === 1 && H.sel[0] === u.id ? [] : [u.id]; if (H.sel.length) H.free = false; shPanel(); return; }
  if (c.k === 'z') { const z = c.o; for (const q of pool()) { q.order = z; q.moveTo = null; q.loot = null; q.pick = null; } if (!H.sel.length) H.order = z; shFx(z.w, '🎯', '#ff6e62'); return; }
  if (c.k === 'b') { const b = c.o, pl = pool();
    if (b.dead && !b.looted) { const who = pl.slice().sort((a, q) => dist(a.w, b.w) - dist(q.w, b.w))[0]; if (!who) return; for (const q of H.units) if (q.loot === b.i && q !== who) q.loot = null; who.loot = b.i; who.lootT = 0; who.lootAt = null; who.moveTo = null; who.order = null; shFx(b.w, `📦 ${who.name}: looting`, '#ffe9b8'); return; }
    if (b.dead) { say(`The ${b.name} has been picked clean.`); return; }
    for (const q of pl) { q.order = b; q.moveTo = null; q.loot = null; q.spotFor = null; } shFx(b.w, b.fence ? '🪓 Break through' : `🎯 ${b.name}`, '#ff6e62'); return; }
  const dn = c.o;
  if (dn.d.locked && !dn.d.open && !dn.d.broken) { const [, , dx, dy, dw] = SH_DOORS[dn.i], pl = pool(); const sides = dw > 1 ? [shWorld(dx + .5, dy - 1), shWorld(dx + .5, dy + 1)] : [shWorld(dx - 1, dy + .5), shWorld(dx + 1, dy + .5)];
    const ok = sides.filter((p) => H.rev[shRoomAt(p)]); const who = pl.slice().sort((a, b) => (['Mechanic', 'Scavenger', 'Engineer'].includes(b.job) - ['Mechanic', 'Scavenger', 'Engineer'].includes(a.job)) || dist(a.w, dn.w) - dist(b.w, dn.w))[0]; if (!who || !ok.length) { say('Nobody can get to that door yet.'); return; }
    for (const q of H.units) if (q.pick === dn.i && q !== who) q.pick = null; who.pick = dn.i; who.pickT = 0; who.pickAt = ok.sort((a, b) => dist(a, who.w) - dist(b, who.w))[0]; who.moveTo = null; who.order = null; shFx(dn.w, `🔒 ${who.name}: forcing the lock`, '#ffe9b8'); return; }
  const [, , dx, dy, dw, dh] = SH_DOORS[dn.i]; const busy = [...H.units, ...H.zs].some((o) => o.hp > 0 && (() => { const q = shCell(o.w); return q.x >= dx && q.x < dx + dw && q.y >= dy && q.y < dy + dh; })()); if (busy && dn.d.open) { say('Someone is standing in the doorway.'); return; } if (dn.d.open) { dn.d.open = false; dn.d.hp = 120; SFX('hit'); } else shDoorOpen(dn.d); shFx(dn.w, dn.d.open ? 'Door open' : 'Door shut', '#ffe9b8'); }
/* 3D.119 owner: the rings were too big. Marker styles to choose from (try ?mark=disc|chevron|brackets|tag; the owner picks one) */
const SH_MARK = 'chevron';   /* 3D.122 owner picked the arrow overhead (spinning); the other styles stay only for reference */
function shMark(f, hd, col, label, wide) { const st = window.ZH_MARK || SH_MARK, t = performance.now() / 1000; ctx.save();
  if (st === 'ring') { ctx.strokeStyle = col; ctx.lineWidth = 3; ctx.beginPath(); ctx.ellipse(f.x, f.y, 20 + (wide || 0), 10 + (wide || 0) / 2, 0, 0, 6.29); ctx.stroke(); }
  else if (st === 'disc') { const k = 1 + Math.sin(t * 5) * .08; ctx.fillStyle = col; ctx.globalAlpha = .38; ctx.beginPath(); ctx.ellipse(f.x, f.y, (11 + (wide || 0)) * k, (5.5 + (wide || 0) / 2) * k, 0, 0, 6.29); ctx.fill(); ctx.globalAlpha = .9; ctx.lineWidth = 1.5; ctx.strokeStyle = col; ctx.stroke(); }
  else if (st === 'chevron') spinArrow(hd.x, hd.y - 12, col, 1.05);
  else if (st === 'brackets') { const h = Math.max(18, f.y - hd.y + 8), w = Math.max(12, h * .42) + (wide || 0), x0 = f.x - w, x1 = f.x + w, y0 = f.y - h, y1 = f.y + 4, L = 6; ctx.strokeStyle = col; ctx.lineWidth = 2.2; ctx.beginPath();
    for (const [x, y, dx, dy] of [[x0, y0, 1, 1], [x1, y0, -1, 1], [x0, y1, 1, -1], [x1, y1, -1, -1]]) { ctx.moveTo(x, y + dy * L); ctx.lineTo(x, y); ctx.lineTo(x + dx * L, y); } ctx.stroke(); }
  else if (st === 'tag') { ctx.font = '700 11px Fredoka, sans-serif'; const tx = label || '', w = ctx.measureText(tx).width + 12, y = hd.y - 24; ctx.fillStyle = 'rgba(255,248,236,.95)'; ctx.strokeStyle = col; ctx.lineWidth = 2; ctx.beginPath(); ctx.roundRect(hd.x - w / 2, y - 9, w, 17, 8); ctx.fill(); ctx.stroke(); ctx.fillStyle = '#4a3428'; ctx.textAlign = 'center'; ctx.fillText(tx, hd.x, y + 3.5); }
  ctx.restore(); }
function shDraw() {   /* the 2D overlay while watching the squad */
  shTapLayer(); const H = S.sh; if (!H || !H.view || !window.ZH3D || !ZH3D.shProject) return; ctx.save(); ctx.textAlign = 'center'; const HU = Math.max(.72, Math.min(1.5, H.cz * .62));
  for (const u of H.units) { if (u.hp <= 0) continue; const p = ZH3D.shProject(u.w.x, u.w.y, 1.2), f = ZH3D.shProject(u.w.x, u.w.y, 0); if (!p) continue;
    if (H.sel.includes(u.id) && f) { shMark(f, { x: p.x, y: p.y - 12 * HU }, '#5fb4ff', u.name); ctx.strokeStyle = '#9fd8ff'; ctx.lineWidth = 2; if (u.moveTo) { const m = ZH3D.shProject(u.moveTo.x, u.moveTo.y, 0); if (m) { ctx.setLineDash([5, 5]); ctx.beginPath(); ctx.moveTo(f.x, f.y); ctx.lineTo(m.x, m.y); ctx.stroke(); ctx.setLineDash([]); } } }
    const by = hpPill(u, p.x + 3 * HU, p.y - 10 * HU, { lv: u.l || 1, u: HU });   /* 3D.120 owner: the same bar as the town (outline, round ends, the level beside it) */
    if ((u.crit || 0) >= 100 || u.critNext || u.aimNext) { ctx.font = `700 ${Math.round(15 * HU)}px Fredoka, sans-serif`; ctx.fillStyle = u.critNext || u.aimNext ? '#ff9f43' : '#ffd56b'; ctx.strokeStyle = '#5a3f31'; ctx.lineWidth = 3; ctx.strokeText('✦', p.x + 24 * HU, by + 7 * HU); ctx.fillText('✦', p.x + 24 * HU, by + 7 * HU); }
    if ((u.stance || 'attack') !== 'attack') { ctx.font = `600 ${Math.round(12 * HU)}px Fredoka, sans-serif`; ctx.fillStyle = '#fff'; ctx.fillText(SH_STANCE[u.stance].icon, p.x - 30 * HU, by + 7 * HU); } }
  if (H.camp) for (const f of Object.values(H.fence || {})) { if (f.dead || f.hp >= f.max) continue; const p = ZH3D.shProject(f.w.x, f.w.y, 1.3); if (p) hpPill(f, p.x, p.y, { col: '#f2b84a', w: 34, u: HU }); }
  if (H.camp) for (const b of H.blds) { if (b.dead ? !(b.prog > 0) : b.hp >= b.max) continue; const p = ZH3D.shProject(b.w.x, b.w.y, b.bw * b.bh >= 4 ? 2.6 : 1.9); if (!p) continue;   /* 3D.118 owner: no icons over the buildings; tap one to see what it is */
    if (b.dead) hpPill({ hp: b.prog, max: 1 }, p.x, p.y, { col: '#ffd45c', w: 46, u: HU }); else { const k = b.hp / b.max; hpPill(b, p.x, p.y, { col: k > .5 ? '#7fbf5a' : k > .25 ? '#f2b84a' : '#e8584a', w: 46, u: HU }); } }
  if (!H.camp) for (const [r, [x0, y0, w, h]] of Object.entries(SH_ROOMS)) if (!H.rev[r]) { const p = ZH3D.shProject(SH_AX + x0 + w / 2, SH_AY + y0 + h / 2, 1.3); if (p) { const m = H.myst && H.myst[r], pk = m && m.peek, pr = H.peekR && H.peekR[r], n = pr ? H.zs.filter((z) => z.hp > 0 && z.room === r).length : 0; ctx.font = pk || pr ? '700 14px Fredoka, sans-serif' : '700 22px Fredoka, sans-serif'; ctx.fillStyle = pk && m.kind === 'nest' || n > 3 ? '#ff8a7a' : 'rgba(255,233,184,.85)'; ctx.fillText(pk ? { cache: '📦 Supplies', empty: 'Empty', nest: '💢 Nest', guarded: '📦 + 2 enemies', survivor: '🙋 Someone' }[m.kind] : pr ? `${n} enem${n === 1 ? 'y' : 'ies'}` : '?', p.x, p.y); } }
  for (const z of H.zs) { if (z.hp <= 0 || z.hid || (z.mode === 'sleep' && !H.woke[z.room])) continue; if (z.boss || z.human || z.hp < z.max) { const p = ZH3D.shProject(z.w.x, z.w.y, z.boss ? 1.75 : 1.2); if (p) hpPill(z, p.x, p.y - 8 * HU, z.boss ? { col: '#e8453c', w: 70, u: HU } : z.human ? { col: '#f6c445', u: HU } : { zed: true, w: 34, u: HU }); } }
  const ord = new Set([H.order, ...H.units.map((q) => q.order)].filter((z) => z && z.hp > 0)); for (const z of ord) { const p = ZH3D.shProject(z.w.x, z.w.y, .05), hd = ZH3D.shProject(z.w.x, z.w.y, z.bld ? (z.bw * z.bh >= 4 ? 2.6 : 1.9) : z.boss ? 1.75 : 1.2); if (p && hd) shMark(p, hd, '#ff5a4e', z.bld ? z.name : shFoeName(z), z.bld ? 10 * Math.max(z.bw, z.bh) : 0); }
  H.doors.forEach((d, i) => { if (d.open && !d.broken) return; const [, , dx, dy, dw, dh] = SH_DOORS[i], w = shWorld(dx + (dw - 1) / 2, dy + (dh - 1) / 2), p = ZH3D.shProject(w.x, w.y, 1.4); if (!p) return; ctx.font = '600 13px Fredoka, sans-serif'; ctx.fillStyle = d.broken ? '#ff8a7a' : '#ffe9b8'; ctx.fillText(d.broken ? 'broken' : d.prog > 0 && d.locked ? `🔓 ${Math.round(d.prog * 100)}%` : (d.locked ? '🔒' : '🚪') + (d.hp < (d.locked ? 160 : 120) ? ' ' + Math.max(0, Math.round(d.hp)) : ''), p.x, p.y); });
  if (H.ring) { const u = H.units.find((q) => q.id === H.ring.id), k = (performance.now() - H.ring.t0) / 1000, rad = 70 - 60 * k; if (!u || rad < 6) { if (u) { u.crit = 0; shFx(u.w, 'Too slow', '#b4a296'); } H.ring = null; } else { const p = ZH3D.shProject(u.w.x, u.w.y, .7);
      if (p) { ctx.lineWidth = 6; ctx.strokeStyle = 'rgba(255,213,107,.45)'; ctx.beginPath(); ctx.arc(p.x, p.y, 23, 0, 6.29); ctx.stroke(); ctx.lineWidth = 3; ctx.strokeStyle = rad >= 16 && rad <= 30 ? '#7be08a' : '#ffffff'; ctx.beginPath(); ctx.arc(p.x, p.y, rad, 0, 6.29); ctx.stroke(); } } }
  if (H.throwMode) { ctx.font = '700 15px Fredoka, sans-serif'; ctx.fillStyle = '#ffd070'; ctx.fillText('💣 Tap where to throw', VW / 2, 110); }
  ctx.font = '700 15px Fredoka, sans-serif';
  for (const f of H.fx) { const p = ZH3D.shProject(f.w.x, f.w.y, 1.9 + (60 - f.a) / 60 * .8); if (!p) continue; ctx.globalAlpha = Math.min(1, f.a / 25); ctx.lineWidth = 3; ctx.strokeStyle = 'rgba(0,0,0,.6)'; ctx.strokeText(f.t, p.x, p.y); ctx.fillStyle = f.col; ctx.fillText(f.t, p.x, p.y); }
  ctx.restore(); }

/* ---- 3D.116 owner: a raid is a camp map like the town. Their buildings, their guards and workers. Send the squad at a building,
   bring it down, then decide whether to stop and loot it (a water building gives water, and so on). The good stuff (gear, guns,
   ammo, the leader) sits in the middle, the hardest part to reach. Survivors fight on their own; you tell them where to go. ---- */
const CAMP_W = 28, CAMP_H = 28, CAMP_GATE = [13, 14];
/* 3D.130 balance run (tools/balance/sh_probe.js): before these settings a squad at the recommended power killed every guard and stripped a whole camp
   (about 145 resources and 3 pieces of gear) in two and a half minutes with at most one person down.
   tough = guard and leader health and damage; reinFirst / reinEvery = seconds from the alarm to the first patrol and between patrols; reinN0 = size of the
   first patrol (each one after is one bigger); reinMax = how many patrols; hear = how far (tiles) a guard hears a building being smashed (workers half, night 60%). */
const CAMP_PLAN = {
  toll: { inner: ['hq3', 'armory', 'ammobench'], mid: ['warehouse', 'storage', 'workshop', 'medic', 'kennel', 'generator', 'crates'], outer: ['barrel', 'barrel', 'well', 'farm', 'farm', 'tent', 'tent', 'tent', 'scrapyard', 'bonfire', 'bonfire'],
    guards: [['raider', 5], ['raiderG', 3]], workers: 5, tough: 1.4, reinFirst: 40, reinEvery: 30, reinN0: 3, reinMax: 8, hear: 7, ground: '#8a7d68', yard: '#9a8a70', fence: '#6b4a2e' },
  green: { inner: ['hq2', 'armory', 'clinic'], mid: ['storage', 'greenhouse', 'canteen', 'well', 'crates', 'medic'], outer: ['field', 'field', 'field', 'farm', 'farm', 'barrel', 'barrel', 'water', 'cabin', 'cabin', 'cabin', 'bonfire'],
    guards: [['raiderB', 3], ['raider', 3]], workers: 7, tough: 1.15, reinFirst: 40, reinEvery: 30, reinN0: 2, reinMax: 6, hear: 7, ground: '#7f8f5e', yard: '#93a06a', fence: '#8a6038' },
};
const rint = (a, b) => a + Math.floor(rnd() * (b - a + 1));
function campLoot(type, H) {   /* what each building holds */
  const role = (DEFS[type] || {}).role, pool = H.raid === 'toll' ? ['rifle', 'shotgun', 'roadsign', 'spikedclub', 'biker', 'riot', 'kevlar'] : ['bow', 'crossbow', 'raincoat', 'hoodie', 'machete', 'leather'], pick = () => pool.filter((k) => ITEMS[k])[Math.floor(rnd() * pool.filter((k) => ITEMS[k]).length)];
  if (type === 'kennel') return { icon: '🔓', name: 'Cages', loot: {}, items: [], pris: rint(1, 3) };
  if (role === 'hq') return { icon: '👑', loot: { mat: rint(6, 10), meds: 1, fuel: 1 }, items: [pick()] };
  if (role === 'gear') return { icon: '🛡', loot: { ammo: rint(6, 10) }, items: [pick(), pick()] };
  if (role === 'ammo') return { icon: '🎯', loot: { ammo: rint(12, 18) }, items: [] };
  if (role === 'water') return { icon: '💧', loot: { water: rint(6, 10) }, items: [] };
  if (role === 'food') return { icon: '🌾', loot: { food: rint(6, 10) }, items: [] };
  if (role === 'storage') return { icon: '📦', loot: { wood: rint(4, 6), stone: rint(3, 5), mat: rint(3, 5) }, items: [] };
  if (role === 'medical') return { icon: '✚', loot: { meds: rint(2, 3), cloth: 2 }, items: [] };
  if (role === 'engineering' || role === 'parts') return { icon: '⚙', loot: { mat: rint(5, 8), fuel: rnd() < .5 ? 1 : 0 }, items: [] };
  if (role === 'power') return { icon: '⛽', loot: { fuel: rint(2, 3) }, items: [] };
  if (role === 'inn') return { icon: '🛏', loot: { cloth: 2, food: 2 }, items: [] };
  return { icon: '', loot: {}, items: [] }; }
function campBuild() {   /* lay out the camp: a fenced square, the gate south, rings of buildings with the valuables in the middle */
  const H = S.sh, P = CAMP_PLAN[H.raid] || CAMP_PLAN.toll, W = CAMP_W, Ht = CAMP_H, g = [];
  for (let y = 0; y < Ht; y++) { g.push(new Array(W).fill('o')); } const F0 = 3, F1 = 24;
  for (let y = F0; y <= F1; y++) for (let x = F0; x <= F1; x++) g[y][x] = x === F0 || x === F1 || y === F0 || y === F1 ? 'W' : 'y';
  for (const x of CAMP_GATE) g[F1][x] = 'G';
  H.grid = g; H.gw = W; H.gh = Ht; H.blds = []; H.exit = shWorld(13.5, 26.6);
  /* 3D.121 owner: the fence has health like the town's walls; break a section to make a way in (loud: guards close by hear it) */
  const fType = H.raid === 'toll' ? 'palisade' : 'wood', fHp = (Wd.WALL_DEFS[fType] || { hp: 80 }).hp; H.fence = {};
  for (let y = F0; y <= F1; y++) for (let x = F0; x <= F1; x++) if (g[y][x] === 'W') H.fence[x + ',' + y] = { bld: true, fence: true, type: fType, name: 'fence', x, y, bw: 1, bh: 1, hp: fHp, max: fHp, dead: false, looted: true, loot: {}, items: [], w: shWorld(x, y) };
  const c = 13.5, ring = (x, y, w, h) => Math.max(Math.abs(x + w / 2 - c), Math.abs(y + h / 2 - c));
  const place = (type, r0, r1) => { const d = DEFS[type]; if (!d) return; for (let k = 0; k < 400; k++) { const rot = rint(0, 3), w = rot & 1 ? d.h : d.w, h = rot & 1 ? d.w : d.h, x = rint(F0 + 2, F1 - 1 - w), y = rint(F0 + 2, F1 - 1 - h), rr = ring(x, y, w, h);
      if (rr < r0 || rr > r1) continue; if (x <= 15 && x + w >= 12 && y + h >= 19) continue;   /* keep the way in from the gate open */
      let ok = true; for (let yy = y - 1; yy <= y + h && ok; yy++) for (let xx = x - 1; xx <= x + w && ok; xx++) { const v = g[yy] && g[yy][xx]; if (v && v[0] === 'K') ok = false; if (xx >= x && xx < x + w && yy >= y && yy < y + h && v !== 'y') ok = false; }
      if (!ok) continue; const i = H.blds.length, L = campLoot(type, H), inner = rr <= 4.5, hp = Math.round((w * h >= 4 ? 240 : w * h >= 2 ? 150 : 90) * (inner ? 1.4 : 1) * (type === 'bonfire' ? .4 : 1));
      H.blds.push({ i, bld: true, type, name: L.name || d.name, x, y, bw: w, bh: h, rot, hp, max: hp, icon: L.icon, loot: L.loot, items: L.items.filter(Boolean), pris: L.pris || 0, dead: false, looted: false, inner, w: shWorld(x + w / 2 - .5, y + h / 2 - .5) });
      for (let yy = y; yy < y + h; yy++) for (let xx = x; xx < x + w; xx++) g[yy][xx] = 'K' + i; return; } };
  for (const t of P.inner) place(t, 0, 4.5); for (const t of P.mid) place(t, 4, 7.2); for (const t of P.outer) place(t, 6.5, 9.5);
  if (!H.practice) for (const r of ((S.fac || {})[H.raid] || {}).ruins || []) { if (S.day - r.d >= 10) continue; const b = H.blds.find((q) => q.type === r.t && !q.dead); if (b) { b.dead = true; b.looted = true; b.hp = 0; b.wasRuin = true; } }   /* still in ruins from the last raid */
  /* the people: guards on posts and patrols, workers going about their jobs, the leader by the hall */
  const yard = () => { for (let k = 0; k < 200; k++) { const x = rint(F0 + 1, F1 - 1), y = rint(F0 + 1, F1 - 5); if (g[y][x] === 'y') return shWorld(x, y); } return shWorld(13, 13); };
  const mk0 = (t, w, ex) => { const zd = zombieTypes.raider || zombieTypes.walker, wpn = t === 'raiderG' ? 'rifle' : t === 'raiderB' ? 'bow' : t === 'worker' ? 'pipe' : ['bat', 'crowbar', 'machete'][H.zs.length % 3], TKc = (CAMP_PLAN[H.raid] || {}).tough || 1, hp = Math.round(zd.hp * (t === 'worker' ? .55 : 1.3 * TKc));
    H.zs.push({ type: 'raider', human: true, wpn, ranged: wpn === 'rifle' || wpn === 'bow', room: 'y', w, hp, max: hp, atk: zd.atk * (t === 'worker' ? .4 : 1.2 * TKc), spd: (zd.chase || .012) * 1.25, mode: 'patrol', stateTicks: 0, target: null, moving: false, phase: rnd() * 100, fk: H.raid, worker: t === 'worker', home: { ...w }, ...ex }); };
  mk0('raider', shWorld(12, 21.5), { post: true }); mk0(P.guards[1][0], shWorld(15, 21.5), { post: true });
  const hq = H.blds.find((b) => DEFS[b.type].role === 'hq'), arm = H.blds.find((b) => DEFS[b.type].role === 'gear');
  for (const b of [arm, hq].filter(Boolean)) mk0(P.guards[0][0], shWorld(b.x + b.bw, b.y + b.bh), { post: true, keep: true });
  let n = 0; for (const [t, k] of P.guards) for (let i = 0; i < k; i++) if (n++ >= 3) mk0(t, yard(), {});
  for (let i = 0; i < P.workers; i++) mk0('worker', yard(), H.night ? { asleep: true } : {});
  const D = SH_DEFS[H.dest], boss = D.areas[2].boss; if (boss && hq) H.zs.push({ type: 'raider', human: true, wpn: boss.wpn || null, ranged: boss.wpn === 'bow' || boss.wpn === 'rifle', leader: true, boss: true, name: boss.name, room: 'y', big: boss.big, w: shWorld(hq.x - 1, hq.y + hq.bh / 2), hp: Math.round(boss.hp * (P.tough || 1)), max: Math.round(boss.hp * (P.tough || 1)), atk: boss.atk * (P.tough || 1), spd: boss.spd, mode: 'patrol', post: true, keep: true, target: null, moving: false, fk: H.raid, home: shWorld(hq.x - 1, hq.y + hq.bh / 2) });
}
function campDist(s, t) { if (!t.bld) return dist(s.w, t.w); const x0 = SH_AX + t.x, y0 = SH_AY + t.y, dx = Math.max(x0 - s.w.x, 0, s.w.x - (x0 + t.bw)), dy = Math.max(y0 - s.w.y, 0, s.w.y - (y0 + t.bh)); return Math.hypot(dx, dy); }
function campSpot(b, s) {   /* a free tile beside the building, spread out by who is going */
  const g = S.sh.grid, c = []; for (let y = b.y - 1; y <= b.y + b.bh; y++) for (let x = b.x - 1; x <= b.x + b.bw; x++) { if (x >= b.x && x < b.x + b.bw && y >= b.y && y < b.y + b.bh) continue; const v = g[y] && g[y][x]; if (v === 'y' || v === 'o' || v === 'G') c.push(shWorld(x, y)); }
  c.sort((a, q) => dist(a, s.w) - dist(q, s.w)); return c[S.sh.units.indexOf(s) % Math.max(1, Math.min(3, c.length))] || c[0] || b.w; }
function campAlarm(at, why) { const H = S.sh; if (!H || H.alarm) return; H.alarm = true; H.reinAt = H.t + 60 * ((CAMP_PLAN[H.raid] || {}).reinFirst || 50); H.reinN = 0; for (const z of H.zs) z.asleep = false; SFX('alarm'); shFx(at, '❗ ' + (why || 'Spotted!'), '#ff6e62'); say(`${why || 'The squad was spotted'}: the whole camp is on alert!`);
  const hq = H.blds.find((b) => DEFS[b.type].role === 'hq' && !b.dead); for (const z of H.zs) if (z.hp > 0) { z.mode = 'idle'; if (z.worker) z.hide = hq ? campSpot(hq, H.units[0]) : z.home; } shPanel(); }
function campFall(b) { const H = S.sh; b.dead = true; b.hp = 0; SFX('hit'); if (b.fence) { shFx(b.w, '💥 A way through the fence', '#ffb060'); for (const q of H.units) if (q.order === b) q.order = null; shPanel(); return; } shFx(b.w, `💥 ${b.name} is down`, '#ffb060');
  if (b.pris) { H.found = (H.found || 0) + b.pris; shFx({ x: b.w.x, y: b.w.y + .6 }, `🔓 ${b.pris} prisoner${b.pris > 1 ? 's' : ''} freed`, '#7be08a'); b.looted = true; }
  else if (!Object.values(b.loot).some((n) => n > 0) && !b.items.length) b.looted = true; shPanel(); }
/* 3D.131 owner: a raid must not be overpowering. The squad carries home 10 resources a head (gear does not count): 40 for four, 80 for eight.
   A level-9 squad of eight used to walk out with about 150. What does not fit stays in the building. */
const CAMP_CARRY = 10, campBag = (H) => CAMP_CARRY * H.units.length, campBagLoad = (H) => Object.values(H.loot).reduce((a, n) => a + n, 0);
function campTake(b, s) { const H = S.sh; let room = campBag(H) - campBagLoad(H); const got = [];
  for (const [k, n] of Object.entries(b.loot)) { const t = Math.min(n, room); if (t > 0) { H.loot[k] = (H.loot[k] || 0) + t; b.loot[k] = n - t; room -= t; got.push('+' + t + ' ' + (RES_NAME[k] || k)); } }
  (H.items ||= []).push(...b.items); got.push(...b.items.map((k) => '🎁 ' + ITEMS[k].name)); b.items = []; const left = Object.values(b.loot).some((n) => n > 0); b.looted = !left;
  shFx(s.w, got.join('  ') || (left ? '🎒 Bags are full' : 'Nothing left'), '#ffe9b8'); if (left) say(`The squad can't carry any more (${campBagLoad(H)}/${campBag(H)}). Time to get out.`); SFX('reward'); shPanel(); }
function campUnitAI(s, zs, live) {
  const H = S.sh; if (s.hp <= 0) { s.mode = 'down'; s.moving = false; s.loot = null; return; }
  if (s.reloadT > 0) { s.moving = false; if (--s.reloadT <= 0) reloadGun(s); return; }
  const w = weaponOf(s), reach = (w.ranged ? Math.min(4.5, rangeOf(s)) : .8) + (s.aimNext ? 1.5 : 0);
  if (s.mode === 'attack') { s.moving = false; if (--s.stateTicks > 0) return; const z = s.target;
    if (z && z.hp > 0 && campDist(s, z) <= reach + .3) { const cr = !!s.critNext || !!s.aimNext; let dm = shUnitDmg(s, z.bld ? { type: 'bld' } : z) * (cr ? 3 : 1); if (cr) { s.critNext = false; s.aimNext = false; shFx({ x: z.w.x, y: z.w.y - .4 }, 'CRIT!', '#ffd56b'); } else s.crit = Math.min(100, (s.crit || 0) + 14);
      if (z.bld) dm = Math.max(1, Math.round(dm * .35 * (['Mechanic', 'Engineer'].includes(s.job) ? 2 : 1)));
      z.hp -= dm; z.hitT = 9; SFX(w.ranged ? 'shot' : 'hit'); shFx(z.w, '-' + dm, z.boss ? '#ffd56b' : z.bld ? '#ffe9b8' : '#ffffff'); if (w.ranged) shots.push({ a: { ...s.w }, b: { ...z.w }, t: 6, bow: w.kind === 'bow' });
      if (w.ranged && usesAmmo(w)) { s.ammo = (s.ammo == null ? w.mag : s.ammo) - 1; if (s.ammo <= 0) s.reloadT = Math.round((w.reload || 2) * 60); }
      if (!H.alarm && (z.fence ? H.zs.some((q) => q.hp > 0 && !q.worker && !q.asleep && dist(q.w, z.w) < 7 * (H.night ? .6 : 1)) : z.bld ? H.zs.some((q) => q.hp > 0 && !q.asleep && dist(q.w, z.w) < ((CAMP_PLAN[H.raid] || {}).hear || 99) * (H.night ? .6 : 1) * (q.worker ? .5 : 1)) : (!z.worker || rnd() < .5))) campAlarm(z.w, z.fence ? 'A guard heard the fence going down' : z.bld ? `They heard the ${z.name} being smashed` : 'A guard shouts');
      if (z.hp <= 0) { if (z.bld) campFall(z); else { H.kills++; if (!H.practice) { S.kills++; S.raiderKills = (S.raiderKills || 0) + 1; gainXp(s, z.boss ? 12 : 2); } } for (const q of H.units) if (q.order === z) q.order = null; } }
    s.mode = 'recover'; s.stateTicks = s.recDur = Math.round(48 * Math.max(.6, 1 - (stat(s, 'agi') - 5) * .02) * (w.rate || 1)); return; }
  if (s.mode === 'recover') { s.moving = false; if (--s.stateTicks > 0) return; s.mode = 'free'; }
  if (s.loot != null) { const b = H.blds[s.loot]; if (!b || b.looted) { s.loot = null; s.lootT = 0; } else { const near = zs.find((z) => !z.worker && dist(z.w, s.w) < 2); if (near) { s.target = near; s.mode = 'attack'; s.stateTicks = 14; return; }
      if (campDist(s, b) > .95) { s.mode = 'walk'; s.target = null; if (!shGo(s, s.lootAt || (s.lootAt = campSpot(b, s)), .042, 'u') && !s.path && campDist(s, b) > .95) { s.loot = null; say(`${s.name} can't get to the ${b.name}.`); } return; }
      s.mode = 'fix'; s.moving = false; s.faceW = b.w; s.lootT = (s.lootT || 0) + 1; b.prog = s.lootT / 150; if (s.lootT >= 150) { campTake(b, s); b.prog = 0; s.loot = null; s.lootT = 0; s.mode = 'free'; } return; } }
  if (s.moveTo) { s.mode = 'walk'; s.target = null; if (shGo(s, s.moveTo, .042, 'u')) { s.moveTo = null; s.mode = 'free'; } return; }
  if (s.order && s.order.hp <= 0) s.order = null;
  const st = s.stance || 'attack', hurt = s.hp < s.max * .3;
  if (st === 'back' && hurt && zs.some((z) => dist(z.w, s.w) < 3)) { s.mode = 'walk'; shGo(s, H.exit, .045, 'u'); return; }
  let t = s.order && !s.order.bld ? s.order : null;
  if (!t) { let bd = st === 'hold' ? reach + .2 : w.ranged ? Math.max(reach, 3) : 3.2; for (const z of zs) { if (z.worker && !H.alarm) continue; const d0 = dist(s.w, z.w); if (!H.alarm && d0 > 1.6) continue;   /* 3D.130 while the camp has not seen them the squad holds its fire (the riflemen used to open up on the gate guards at once, so no raid was ever quiet); it still defends itself at arm's length and attacks whoever you point at */ if (d0 < bd) { bd = d0; t = z; } } }
  if (!t && s.order && s.order.bld) t = s.order;
  s.target = t;
  if (t) { const d0 = campDist(s, t); if (d0 > reach) { if (st === 'hold' && !s.order) { s.mode = 'free'; s.moving = false; return; } s.mode = 'chase'; if (t.bld) { if (!s.spotFor || s.spotFor !== t) { s.spotFor = t; s.spotAt = campSpot(t, s); } if (!w.ranged || d0 > reach) shGo(s, s.spotAt, .036, 'u'); } else shGo(s, t.w, .032, 'u'); } else { s.mode = 'attack'; s.stateTicks = 14; s.moving = false; s.faceW = { ...t.w }; } return; }
  s.mode = 'free'; s.moving = false; }
function campEnemyAI(z, live) {
  const H = S.sh; if (z.stuckT > H.t) { z.moving = false; return; }
  if (!H.alarm && z.asleep) { z.moving = false; z.mode = 'patrol'; if (live.some((s) => dist(s.w, z.w) < 1.2)) campAlarm(z.w, 'A sleeper woke and shouted'); return; }   /* 3D.128 night: the workers sleep; only stepping on one wakes it */
  if (!H.alarm) { const sp = live.find((s) => dist(s.w, z.w) < (z.worker ? 3 : z.post ? 4.2 : 4.5) * (H.night ? .6 : 1)); if (sp) { campAlarm(z.w, z.worker ? 'A worker raised the alarm' : `${z.leader ? z.name : 'A guard'} spotted the squad`); return; }
    if (z.post) { z.moving = false; z.mode = 'patrol'; return; }
    if (!z.dest || (z.waitT = (z.waitT || 0) - 1) === 0) { const bs = H.blds.filter((b) => !b.dead); const b = bs[Math.floor(rnd() * bs.length)]; z.dest = z.worker && b ? campSpot(b, z) : (() => { for (let k = 0; k < 30; k++) { const x = rint(5, 22), y = rint(5, 22); if (H.grid[y][x] === 'y') return shWorld(x, y); } return z.home; })(); }
    if (z.waitT > 0) { z.moving = false; z.mode = 'patrol'; return; }
    z.mode = 'patrol'; if (shGo(z, z.dest, z.spd * .6, 'z') || !z.path) { z.waitT = rint(150, 360); } return; }
  if (z.worker) { const t = live.find((s) => dist(s.w, z.w) < 1.1); if (t) { shZombieAI(z, [t]); return; } z.mode = 'rflee'; if (z.hide) shGo(z, z.hide, z.spd * 1.1, 'z'); else z.moving = false; return; }
  if (z.keep) {   /* 3D.128 the armoury guard, the hall guard and the leader stay with what they guard: they fight whoever comes close (or shoots them), and walk back when the squad pulls away */
    if (z.hp < (z.hpSeen ?? z.hp)) z.keepOff = H.t + 600; z.hpSeen = z.hp; const near = z.keepOff > H.t ? live : live.filter((s) => dist(s.w, z.home) < 6.5);
    if (!near.length) { z.target = null; z.mode = 'patrol'; if (dist(z.w, z.home) > .5) shGo(z, z.home, z.spd, 'z'); else z.moving = false; return; }
    if (z.mode === 'patrol') z.mode = 'idle'; shZombieAI(z, near); return; }
  if (z.mode === 'patrol') z.mode = 'idle'; shZombieAI(z, live); }
function campReinforce() {   /* 3D.128 once the alarm is up, patrols come back to the gate: don't linger. 3D.130: how soon, how often, how many and how tough come from the camp's plan */
  const H = S.sh; if (!H || !H.alarm || !H.reinAt || H.t < H.reinAt || H.back) return; const P = CAMP_PLAN[H.raid] || {}, TK = P.tough || 1, n = (P.reinN0 || 2) + H.reinN, zd = zombieTypes.raider || zombieTypes.walker; H.reinN++; H.reinAt = H.reinN < (P.reinMax || 3) ? H.t + 60 * (P.reinEvery || 60) : 0;
  for (let i = 0; i < n; i++) { const wpn = i % 3 === 2 ? 'rifle' : ['bat', 'crowbar', 'machete'][i % 3], hp = Math.round(zd.hp * 1.3 * TK), w = shWorld(12 + (i % 4), 26.4 + Math.floor(i / 4) * .6);
    H.zs.push({ type: 'raider', human: true, wpn, ranged: wpn === 'rifle', room: 'y', w, hp, max: hp, atk: zd.atk * 1.2 * TK, spd: (zd.chase || .012) * 1.25, mode: 'idle', stateTicks: 0, target: null, moving: false, phase: rnd() * 100, fk: H.raid, home: { ...w }, rein: true }); }
  SFX('alarm'); shFx(shWorld(13.5, 25.5), `❗ ${n} more at the gate`, '#ff6e62'); say(`A patrol is back: ${n} more ${H.raid === 'toll' ? 'Toll Kings' : 'of them'} at the gate.`); shPanel(); }
/* the practice page (owner: "a test page in the game for that function"): try any stronghold or camp with a ready-made squad;
   nothing is lost or gained, and the town waits. Open it from Town > Defense, or with ?shtest=1. */
function showShPractice() {
  endBuildMode(true); const maps = Object.keys(SH_DEFS); expSel.pr = expSel.pr || { map: 'clinic', n: 6, goal: 'loot', lv: 6, night: false }; const P = expSel.pr;
  $('ib').innerHTML = `<div class="card"><b>🎯 Stronghold practice</b><div class="sm">Try every control with a ready-made squad. Nothing is lost or gained, and the town waits while you play.</div></div>
    <div class="sm">Map</div><div class="row" style="flex-wrap:wrap;gap:6px">${maps.map((k) => `<button class="vehB ${P.map === k ? 'on' : ''}" data-pm="${k}">${(EXP_DEFS[k] || {}).icon || (SH_DEFS[k].raid ? '⚔' : '🏚')} ${esc((EXP_DEFS[k] || {}).name || k)}<small>${SH_DEFS[k].raid ? 'faction camp' : 'rec. ' + SH_DEFS[k].rec}</small></button>`).join('')}</div>
    ${('')}
    <div class="sm">Squad size</div><div class="row" style="gap:6px">${[4, 5, 6, 7, 8].map((n) => `<button class="vehB ${P.n === n ? 'on' : ''}" data-pn="${n}">${n}</button>`).join('')}</div>
    <div class="sm">Squad level</div><div class="row" style="gap:6px">${[3, 6, 9, 12].map((n) => `<button class="vehB ${P.lv === n ? 'on' : ''}" data-pl="${n}">Lv ${n}</button>`).join('')}</div>
    ${SH_DEFS[P.map].raid ? `<div class="sm">Time (faction camps)</div><div class="row" style="gap:6px"><button class="vehB ${P.night ? '' : 'on'}" data-pt="0">☀️ Day</button><button class="vehB ${P.night ? 'on' : ''}" data-pt="1">🌙 Night<small>guards see less, workers sleep</small></button></div>` : ''}
    <button class="act go" id="prGo" style="margin-top:10px">Start practice</button>
    <div class="sm" style="margin-top:8px"><b>Controls:</b> drag to look around, pinch or scroll to zoom. Tap a survivor (or 👥 All) to take control. Then tap the floor to move, an enemy to attack, a door to open or shut it. A 🔒 locked door: tap it and someone forces the lock (Mechanics, Scavengers and Engineers are quicker), or blow it open with a 💣. You can't see into a room until its door opens: it may hold supplies, nothing, or a nest. <b>Faction camps:</b> tap a building to send the squad at it; once it's down, tap it again to loot it. Stay unseen as long as you can: once the alarm goes up, the patrols come for you (the armoury and hall guards stay at their posts), and a bigger patrol arrives at the gate every half minute, so take what you came for and get out. Until they see you the squad holds its fire. At night the guards see and hear less far and the workers sleep. 🏃 Get out leaves through the gate with what you took. The fence can be broken (tap a section, or bomb it) to make your own way in, but guards close by will hear it. The selected survivor's stance, ability and ✦ critical show above the bottom bar.</div>`;
  $('ib').querySelectorAll('[data-pm]').forEach((b) => { b.onclick = () => { P.map = b.dataset.pm; showShPractice(); }; }); $('ib').querySelectorAll('[data-pg]').forEach((b) => { b.onclick = () => { P.goal = b.dataset.pg; showShPractice(); }; });
  $('ib').querySelectorAll('[data-pt]').forEach((b) => { b.onclick = () => { P.night = b.dataset.pt === '1'; showShPractice(); }; }); $('ib').querySelectorAll('[data-pn]').forEach((b) => { b.onclick = () => { P.n = +b.dataset.pn; showShPractice(); }; }); $('ib').querySelectorAll('[data-pl]').forEach((b) => { b.onclick = () => { P.lv = +b.dataset.pl; showShPractice(); }; });
  $('prGo').onclick = () => { if (S.sh) { say('A squad is already inside.'); return; } const jobs = ['Guard', 'Police Officer', 'Medic', 'Scavenger', 'Mechanic', 'Engineer', 'Guard', 'Police Officer'], wp = ['machete', 'rifle', 'pistol', 'crossbow', 'sledge', 'shotgun', 'katana', 'rifle'], ar = P.lv >= 9 ? 'kevlar' : P.lv >= 6 ? 'leather' : null;
    const sq = []; for (let i = 0; i < P.n; i++) { const q = mk(FIRST_NAMES[(i * 7 + 3) % FIRST_NAMES.length], jobs[i], P.lv, 0, 0, i); q.eq = { weapon: ITEMS[wp[i]] ? wp[i] : 'bat', armor: ar && ITEMS[ar] ? ar : null, head: null, acc: null }; setMaxHp(q); q.hp = q.max; q.ammo = 99; q.id = 80000 + i; sq.push(q); }
    S.sv.push(...sq); const r = startStronghold(P.map, sq.map((q) => q.id), { practice: true, goal: P.goal, night: !!P.night }); S.sv = S.sv.filter((q) => !sq.includes(q)); if (!r.ok) { say(r.why); return; } closeP(); };
  showPanel('Stronghold practice');
}
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
function showExpedition() {
  endBuildMode(true); closeP(); expOpen = true; $('it').textContent = 'Explore'; const t = S.trip;
  if (t) {
    const d = EXP_DEFS[t.dest];
    $('ib').innerHTML = `<b>${d.icon} ${d.name}</b> · ${EXP_RISK[t.risk].label} risk<br><span id="expStage">${t.phase === 'back' ? 'Walking home' : `Stage ${Math.min(EXP_STAGES, t.stage + 1)} of ${EXP_STAGES}`}</span> · <b id="expTime">${mmss(expTripLeft(t))}</b> left<br>
      Squad: ${t.members.map((m) => `${esc(m.name)} (${m.job}, HP ${Math.ceil(m.hp)}/${m.max})`).join(', ')}<br>
      Loot so far: ${['food', 'water', 'wood', 'stone', 'mat'].filter((k) => k !== 'wood' && k !== 'stone' || t.loot[k]).map((k) => `${t.loot[k] || 0} ${RES_NAME[k]}`).join(' · ')}<br>${t.enc ? `<div class="card encCard"><b>${EXP_ENC[t.enc.k].title}</b><div class="sm">${EXP_ENC[t.enc.k].text} Decide before the next stage, or the squad decides.</div>${encButtons(t).map((b, i) => `<button class="act${i === 0 ? ' go' : ''}" data-enc="${i}" style="width:100%;margin:4px 0 0">${b.label}</button>`).join('')}</div>` : ''}<small>${t.log.map(esc).join('<br>')}</small><br>
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
    const lootTxt = Object.entries(d.loot || {}).map(([r, [a0, a1]]) => `${(RES_NAME[r] || r)} ${Math.round(a0 * EXP_STAGES * pv.mult)}–${Math.round(a1 * EXP_STAGES * pv.mult)}`).join(' · ');   /* 3D.41: a rough total for the whole trip */
    $('ib').innerHTML = (`<div class="card expTop"><div class="etRow"><span class="etN"><b>${ids.length}/${expMax()}</b><small>squad</small></span><button class="act go" id="expGo">${(SH_DEFS[expSel.dest]) ? 'Enter the stronghold' : `Send squad · ${EXP_HOURS[expSel.risk]} h`}</button></div>${vehCard()}${EXP_DEFS[expSel.dest].raid ? `<div class="etLine sm">Their camp: pick which buildings to bring down and what to loot. Gear, ammo and the leader are in the middle. Get out through the gate with what you took.</div>` : ''}${(SH_DEFS[expSel.dest]) ? (() => { const pw = shPower(members), rc = SH_DEFS[expSel.dest].rec; return `<div class="etLine"><span class="etK">Power</span> <b style="color:${pw >= rc ? 'var(--good)' : pw >= rc * .85 ? '#c98a1e' : 'var(--bad)'}">${pw}</b> / ${rc} recommended · you watch the fight and give the calls</div>`; })() : ''}<div class="etLine"><span class="etK">Cost</span> 🍖${pv.need} 💧${pv.need}${pv.short ? ' <span style="color:var(--bad)">(short: riskier)</span>' : ''}</div><div class="etLine"><span class="etK">Loot</span> ${lootTxt || '×' + pv.mult.toFixed(1)}</div><div class="sm">Each stage, per person: ${(pv.hurtPerStage * 100).toFixed(0)}% hurt · ${(pv.deathPerStage * 100).toFixed(1)}% lost forever</div>${ready.length ? '' : '<div class="sm">Nobody is healthy and free right now.</div>'}<div id="expWhy" class="expWhy">${expPreWhy(ids)}</div></div>`
      + where + `<div class="sm">Squad (1–${expMax()}, ${EXP_HOME_MIN} stay home)</div><div class="lst">${S.sv.map((q) => { const on = ids.includes(q.id), ok = expEligible(q); return `<div class="card" data-s="${q.id}" style="${on ? 'border-color:var(--good)' : ''}${ok || on ? '' : ';opacity:.45'}">${portrait(q)}<div class="sp">${esc(q.name)} ${traitIcon(q)} <span class="sm">${q.job} Lv.${q.l}</span><div class="sm">${ok ? 'Ready' : expBlock(q) || 'Busy'}</div></div>${on ? '<b style="color:var(--good)">✔</b>' : ''}</div>`; }).join('')}</div>`);
    $('ib').querySelectorAll('[data-lead]').forEach((b) => { b.onclick = () => { expSel.lead = b.dataset.lead; showExpedition(); }; });
    $('ib').querySelectorAll('[data-d]').forEach((b) => { b.onclick = () => { if (expLocked(b.dataset.d)) { say(expLocked(b.dataset.d)); return; } expSel.dest = b.dataset.d; showExpedition(); }; });
    $('ib').querySelectorAll('[data-r]').forEach((b) => { b.onclick = () => { expSel.risk = b.dataset.r; showExpedition(); }; });
    $('ib').querySelectorAll('[data-s]').forEach((b) => { b.onclick = () => { const id = +b.dataset.s, q = S.sv.find((x) => x.id === id); if (ids.includes(id)) expSel.ids = ids.filter((x) => x !== id); else if (q && expEligible(q) && ids.length < expMax()) expSel.ids = [...ids, id]; else expMsg(q && !expEligible(q) ? `${q.name} can’t go: ${expBlock(q) || 'busy right now'}` : ids.length >= EXP_MAX_SQUAD ? `A squad is at most ${EXP_MAX_SQUAD}` : 'That survivor can’t go right now'); showExpedition(); }; });
    $('ib').querySelectorAll('[data-goal]').forEach((b) => { b.onclick = () => { expSel.goal = b.dataset.goal; showExpedition(); }; }); $('ib').querySelectorAll('[data-veh]').forEach((b) => { b.onclick = () => { expSel.veh = b.dataset.veh || null; showExpedition(); }; }); $('ib').querySelectorAll('[data-vbuild]').forEach((b) => { b.onclick = () => { vehBuildCart(); showExpedition(); }; }); $('ib').querySelectorAll('[data-vfix]').forEach((b) => { b.onclick = () => { vehRepair(b.dataset.vfix); showExpedition(); }; });   /* 3D.109 */
    $('expGo').onclick = () => { const r = startExpedition(expSel.dest, expSel.risk, expSel.ids); if (!r.ok) { expMsg(r.why); return; } if (!expSel.force) S.leads = (S.leads || []).filter((l) => l.id !== expSel.lead); closeP(); expSel.ids = null; expSel.force = null;  };
  }
  showPanel();
}
/* V2.9 death and recovery model */
const BLEED_TICKS = { none: 7200, medic: 10800, clinic: 12600, hospital: 14400 };
const CARE_TICKS = { medic: 3600, clinic: 2700, hospital: 1800 };   // the Camp: 1.5 x medic (careTicks)
let BANDAGE_COST = 2, BANDAGE_TICKS = 3600;   /* Field Medicine research: 1 part, longer */
function medTier() { const m = medSite(); return m ? m.type : 'none'; }
function bleedMax() { return Math.round(BLEED_TICKS[medTier()] * DF().bleed * ((window.ZH_BAL || {}).bleed || 1.5)   /* balance study (Nov 8): every long-run death was a bleed-out; the downed hold on 50% longer */ * (medTier() === 'hospital' && anyPowered('hospital') ? 1.4 : 1)); }   /* 3D.77: surgery: a powered Hospital gives the dying 40% longer */
function careTicks(b) { if (b !== undefined && (!b || isCamp(b))) return Math.round(CARE_TICKS.medic * 1.5);   /* 3D.46 camp care: half again as long as a Medical Tent */
  const t = b ? b.type : medTier(), m = b || medSite(), st = m && isWorking(m) ? Math.max(.6, 1 - (stat(m.staff, 'int') - 5) * .03) : 1; return Math.round((CARE_TICKS[t] || CARE_TICKS.medic) * st * (m ? 1 - combos(m).care : 1) * (m && m.unpaid ? 1.4 : 1) * (m && !(isWorking(m) && m.staff && m.staff.job === 'Medic') ? 1.3 : 1)); }   /* 3D.69: care without a Medic on staff is 1.3x slower (was 1.6x in 3D.67: made the Medic too essential) */
/* ---------------- 3D.67 Medic field aid. A Medic patches the hurt where they stand and gets the downed back on their feet, but only so far:
   a field dressing heals to 60% at most, and someone revived in the field gets up at 30% Wounded (no healing past 60% until a medical
   building treats them). Being downed twice in a day is too serious for the field: the Medic stabilises them (the bleed stops) and carries them in.
   Each treatment uses 1 cloth or 0.1 meds. ---------------- */
const FIELD_CAP = .6, PATCH_TICKS = 240, PATCH_CD = 3600;
const zNear = (p, r) => S.z.some((z) => z.hp > 0 && !z.human && dist(z.w, p) < r);
function patchSupply(dry) { if ((S.cloth || 0) >= 1) { if (!dry) { S.cloth -= 1; flow('cloth', 'Field aid', -1); } return true; } if ((S.meds || 0) >= .1) { if (!dry) { S.meds -= .1; flow('meds', 'Field aid', -.1); } return true; } return false; }
const injuryTrip = (q) => ['goFacility', 'useFacility'].includes(q.mode) && q.facility && facilityRules[q.facility.type] && facilityRules[q.facility.type].need === 'injury';
function medicFindPatient(s) {
  if (s.job !== 'Medic' || s.hp < s.max * .5 || onShift(s) || s.carriedLoot || !patchSupply(true)) return null;
  let best = null, bd = 14;
  for (const q of S.sv) { if (q === s || q.hp <= 0 || q.hp >= Math.round(q.max * FIELD_CAP) || (q.aidBy && q.aidBy.mode === 'fieldAid' && q.aidBy.aidTo === q) || (q.patchT && tick - q.patchT < PATCH_CD) || injuryTrip(q)
      || ['down', 'hospital', 'away', 'errand', 'chase', 'attack', 'recover', 'rescueTo', 'rescueCarry', 'fieldAid', 'hide', 'hiding'].includes(q.mode) || insideBuilding(q) || q.sleeping) continue;
    const d = dist(s.w, q.w); if (d < bd && !zNear(q.w, 5)) { bd = d; best = q; } }
  return best;
}
function startAid(s, q, kind) { s.mode = 'fieldAid'; s.aidTo = q; s.aidKind = kind; q.aidBy = s; s.aidT = 0; s.path = null; s.dest = null; s.target = null; s.facility = null; s.activity = null; s.purpose = null;
  if (kind === 'revive') { q.stable = true; }   /* pressure on the wound: the bleed stops while they work */
  s.why = kind === 'patch' ? `Patching up ${q.name}` : `Treating ${q.name} where they fell`; }
function endAid(s) { const q = s.aidTo; if (q && q.aidBy === s) q.aidBy = null; s.aidTo = null; s.aidKind = null; s.aidT = 0; if (s.activity === 'Treating') s.activity = null; }
function fieldAidAI(s) {
  const q = s.aidTo, kind = s.aidKind;
  if (!q || !S.sv.includes(q) || (kind === 'patch' ? q.mode === 'down' || q.hp >= Math.round(q.max * FIELD_CAP) || ['hospital', 'away', 'errand'].includes(q.mode) || injuryTrip(q) : q.mode !== 'down')) {
    if (q && kind === 'revive' && q.rescuer === s) { q.rescuer = null; q.stable = false; } s.rescuing = null; endAid(s); enterFree(s, 30); return; }
  if (kind === 'patch' && (zNear(q.w, 5) || threatOf(s))) { endAid(s); enterFree(s, 60); return; }
  if (kind === 'revive' && zNear(q.w, 2.5)) { endAid(s); q.stable = false; s.carrying = q; q.w = { x: s.w.x, y: s.w.y }; s.mode = 'rescueCarry'; s.path = null; s.careTo = careDest(); s.why = `No time: carrying ${q.name} to safety`; return; }   /* zombies close in: grab them and go */
  const d = dist(s.w, q.w);
  if (d > .95) { s.aidT = 0; s.activity = null; const k = .6 / Math.max(.6, d), goal = { x: q.w.x + (s.w.x - q.w.x) * k, y: q.w.y + (s.w.y - q.w.y) * k };
    const r = followPath(s, goal, .02); if (r === 'fail' && (s.aidFail = (s.aidFail || 0) + 1) > 4) { s.aidFail = 0; if (kind === 'revive') { q.rescuer = null; q.stable = false; s.rescuing = null; } endAid(s); enterFree(s, 60); } return; }
  s.moving = false; s.path = null; s.aidFail = 0; s.activity = 'Treating'; if (s.aidT === 0) { s.facing = q.w.x < s.w.x ? -1 : 1; emote(s, '🩹', PATCH_TICKS, true); }
  if (++s.aidT < PATCH_TICKS) return;
  if (!patchSupply(false)) { floats.push({ w: { ...s.w }, t: 'Needs 🧵 or 💊', col: '#ff8a4b', a: 70 });
    if (kind === 'revive') { endAid(s); q.stable = false; s.carrying = q; s.mode = 'rescueCarry'; s.path = null; s.careTo = careDest(); s.why = `Out of dressings: carrying ${q.name} in`; } else { endAid(s); enterFree(s, 60); } return; }
  gainXp(s, kind === 'revive' ? 4 : 2); addBond(s, q, kind === 'revive' ? 6 : 3);
  if (kind === 'patch') { const to = Math.round(q.max * FIELD_CAP), h = Math.max(0, to - q.hp); q.hp = Math.max(q.hp, to); q.patchT = tick; floats.push({ w: { ...q.w }, t: '+' + h + ' HP 🩹', col: '#7fd35a', a: 70 }); emote(q, '🙏', 90, true); endAid(s); enterFree(s, 40); return; }
  if ((q.downN || 0) >= 2) {   /* too serious for the field: stabilised, then carried in */
    endAid(s); q.stable = true; s.carrying = q; q.w = { x: s.w.x, y: s.w.y }; s.mode = 'rescueCarry'; s.path = null; s.careTo = careDest(); s.why = `${q.name} is stable but needs care: carrying them in`;
    note('routine', `${s.name} stabilised ${q.name} (down twice today: needs a medical bed).`); return; }
  endAid(s); q.hp = Math.max(1, Math.round(q.max * .3)); q.bleed = null; q.warned = false; q.stable = false; q.rescuer = null; q.wounded = true; s.rescuing = null; enterFree(q, 150); q.why = 'Back on their feet (Wounded)'; emote(q, '🙏', 120, true);
  floats.push({ w: { ...q.w }, t: '🩹 BACK UP', col: '#7fd35a', a: 80 }); statAdd('saved'); SFX('rescued'); note('routine', `${s.name} got ${q.name} back on their feet. ${q.name} is Wounded until treated at a medical building.`); enterFree(s, 40);
}
function beingCarried(s) { const r = s.rescuer; return !!(r && r.carrying === s && r.mode === 'rescueCarry'); }
function bleedTick(s) {
  if (s.bleed == null) { s.bleed = bleedMax(); s.warned = false; }
  if (beingCarried(s) || s.stable) return;   /* 3D.67: a Medic stabilised them */
  if (!(townHyb('combatmedic') && tick % 2)) s.bleed--;   /* 3D.104 a Combat Medic in town: downed friends bleed out half as fast */
  if (!s.warned && s.bleed <= 1800) { s.warned = true; note('routine', s.name + ' is bleeding out!'); }
  if (s.bleed <= 0) killSurvivor(s, 'bled out');
}
function killSurvivor(s, cause) {
  if (!S.sv.includes(s)) return;
  S.sv = S.sv.filter((q) => q !== s); bondsOnDeath(s); endAid(s); for (const q of S.sv) if (q.aidTo === s) { endAid(q); if (q.mode === 'fieldAid') enterFree(q, 60); }
  S.deaths = (S.deaths || []).filter((d) => d > nowD() - 1); S.deaths.push(nowD());
  if (S.deaths.length >= 2 && !graceOn()) { S.graceUntil = nowD() + 1.5; note('important', '🕯 THE HAVEN MOURNS', { log: 'After so many losses the survivors hold a vigil. The horde pulls back for a while — rebuild your defences.' }); }
  for (const q of S.sv) { if (q.rescuing === s) { q.rescuing = null; if (['rescueTo', 'rescueCarry'].includes(q.mode)) { q.carrying = null; enterFree(q, 60); } } if (q.target === s) q.target = null; }
  for (const b of world.buildings) if (b.staff === s) b.staff = null;
  if (selected && selected.ref === s) { selected = null; closeP(); }
  for (const sl of SLOTS) { const id = s.eq && s.eq[sl]; if (id && id !== 'pipe') stashAdd(id); }   /* their gear goes back to the stash */
  if (s.pet) { (S.pets = S.pets || []).push(s.pet); s.pet = null; }   /* their pet stays with the town */
  let near = 0;
  for (const q of S.sv) { const close = dist(q.w, s.w) < 6 || (q.job === s.job); const d = close ? 6 : 2; q.sat = Math.max(0, q.sat - d); if (close) near++; }
  S.griefUntil = nowH() + 18; for (const q of S.sv) emote(q, '😢', 160, true); barkSomeone('grief', { other: s.name }, { pri: 2 }, s.w);   /* V3D.14 mourning */
  S.fallen = S.fallen || []; S.fallen.push({ name: s.name, job: s.job, l: s.l, day: S.day, cause, trait: s.trait });
  if (s.w && !insideBuilding(s)) {   /* V3D.21: the dead rise again: a walker in their clothes gets up where they fell */
    const n0 = S.z.length; spawn(Math.floor(s.w.x), Math.floor(s.w.y), 'walker'); const z = S.z.length > n0 ? S.z[S.z.length - 1] : null;
    if (z) { z.w = { x: s.w.x, y: s.w.y }; z.turned = { name: s.name, fem: (() => { try { return window.ZHChars && ZHChars.look(s).sex === 'f'; } catch (e) { return false; } })() }; z.mode = 'appear'; z.stateTicks = 240;
      note('important', `🧟 ${s.name} rose again as a zombie`, { at: z.w, float: '🧟 TURNED', col: '#a8e07a' }); }
  }
  autoStaff();
  showEventPopup({ stage: { scene: 'sad', head: 'Farewell', icon: '🕯️', badge: s.job + ' Lv.' + s.l, hero: s, crowd: others(s) }, short: `${s.name} has died.`, chips: [S.sv.length + ' survivors remain'], title: 'LOST: ' + s.name.toUpperCase(), text: `${s.name}, a level ${s.l} ${s.job}, ${cause}. ${near ? near + ' survivors are shaken.' : ''} Their name is added to the memorial in the Town panel.`, gains: S.sv.length + ' survivors remain' });
  ui();
}

/* 3D.125 review bug 1: people sat at 100 hunger and lost health beside a stocked pantry when the town had no food or water
   building (the daily rations were paid, but hunger only dropped at a food building). Now anyone very hungry or thirsty eats
   or drinks straight from the stores when there is no such building, and nobody ever starves while there is stock. */
function pantry(s) {
  const has = (need) => world.buildings.some((b) => !b.burnt && facilityRules[b.type] && facilityRules[b.type].need === need);
  if (s.hunger >= (has('hunger') ? 97 : 70) && S.food >= 1) { s.hunger = Math.max(0, s.hunger - 40); floats.push({ w: { ...s.w }, t: '🍖', col: '#ffe9b8', a: 60 }); if (!has('hunger') && S.pantryDay !== S.day) { S.pantryDay = S.day; say('People are eating straight from the stores: a Garden Plot or Canteen feeds them better.'); } }
  if (s.thirst >= (has('thirst') ? 97 : 70) && S.water >= 1) { s.thirst = Math.max(0, s.thirst - 40); floats.push({ w: { ...s.w }, t: '💧', col: '#cfe9ff', a: 60 }); }
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
  if ((S.cloth || 0) >= 1) S.cloth -= 1; else if (S.mat >= BANDAGE_COST * 2) S.mat -= BANDAGE_COST * 2; else { say('A bandage needs 1 cloth (or ' + BANDAGE_COST * 2 + ' scrap).'); return false; }   /* V3D.25: bandages are cloth; scrap rags cost double */ if (s.bleed == null) s.bleed = bleedMax(); s.bleed = Math.min(s.bleed + BANDAGE_TICKS, bleedMax() + BANDAGE_TICKS); s.warned = false; say('Bandaged ' + s.name + ' · +60 s'); ui(); return true;
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
  if (tool.kind === 'wall') { const wd = Wd.WALL_DEFS[tool.wtype]; $('confirmName').textContent = `${wd.name.toUpperCase()} · ${costShort(bCost(wd))} per tile · tap to place, tap again to remove` + (tool.wtype === 'metal' ? ' · tap a wood wall to upgrade' : ''); $('yesBuild').style.display = 'none'; $('nudge').style.display = 'none'; $('rotBuild').style.display = 'none'; $('noBuild').textContent = 'DONE'; $('confirmBar').style.display = 'block'; }
  else if (tool.kind === 'trap') { const td = TRAP_DEFS[tool.ttype]; $('confirmName').textContent = `${td.name.toUpperCase()} · ${costShort(bCost(td))} · tap any open ground to set · tap a spent one to re-arm · ${trapMap().size}/${trapMax()} traps`; $('yesBuild').style.display = 'none'; $('nudge').style.display = 'none'; $('rotBuild').style.display = 'none'; $('noBuild').textContent = 'DONE'; $('confirmBar').style.display = 'block'; }
  else if (tool.kind === 'post') { $('yesBuild').style.display = 'none'; $('nudge').style.display = 'none'; $('rotBuild').style.display = 'none'; $('noBuild').textContent = 'DONE'; $('confirmBar').style.display = 'block'; updatePostBar(); }
  else if (tool.kind === 'demolish') { $('confirmName').textContent = 'DEMOLISH · tap a building, road or wall to remove it · buildings and walls give back half their scrap'; $('yesBuild').style.display = 'none'; $('nudge').style.display = 'none'; $('rotBuild').style.display = 'none'; $('noBuild').textContent = 'DONE'; $('confirmBar').style.display = 'block'; demoPick = null; }
  else if (tool.kind === 'road') { $('confirmName').textContent = `ROAD · ${Wd.ROAD_COST} scrap per tile · tap a tile to add, tap a road to remove`; $('yesBuild').style.display = 'none'; $('nudge').style.display = 'none'; $('rotBuild').style.display = 'none'; $('noBuild').textContent = 'DONE'; $('confirmBar').style.display = 'block'; }
  else { $('yesBuild').style.display = ''; $('nudge').style.display = ''; $('rotBuild').style.display = ''; $('noBuild').textContent = 'CANCEL'; say('Tap the tile where the building’s SOUTH corner should sit.'); }
}
function updatePreview(x, y) {
  const d = Wd.rotDef(DEFS[sel.type], sel.rot), chk = Wd.placementCheck(world, x, y, d, sel.upgFrom || null); if (chk.ok && sel.upgFrom && !Iso.rectsOverlap(sel.upgFrom, { x, y, w: d.w, h: d.h })) { chk.ok = false; chk.why = 'Must cover the old building'; } if (chk.ok && (S.posts || []).some((p) => p.x >= x && p.x < x + d.w && p.y >= y && p.y < y + d.h)) { chk.ok = false; chk.why = 'A guard post is in the way'; }
  preview = { type: sel.type, x, y, w: d.w, h: d.h, rot: (sel.rot | 0) & 3, q: d.q, a: d.a, ok: chk.ok, why: chk.why };
  const afford = true;   /* V3D.23: a site can start before you have everything; builders bring materials as they come */
  $('confirmName').textContent = `${d.name.toUpperCase()} · ${d.w}×${d.h}` + (moving ? ' · MOVE (free)' : sel.upgFrom ? ` · UPGRADE · ${costShort(bCost(d))}` : ` · ${costShort(bCost(d))}`) + (!chk.ok ? ' · ' + chk.why.toUpperCase() : !moving && !canPay(bCost(d)) ? ' · STILL NEED ' + missText(bCost(d)).toUpperCase() : '') + (chk.ok ? (() => { const pv = { type: sel.type, x, y, w: d.w, h: d.h }, c = combos(pv); comboCache.map.delete(pv); return c.names.length ? ' · ★ ' + c.names.map((n) => n.split(' (')[0]).join(', ') : ''; })() : '');
  const go = chk.ok && afford; $('yesBuild').disabled = !go; $('yesBuild').style.opacity = go ? 1 : .45; $('confirmBar').style.display = 'block';
}
function pushUnitsOut(b) {
  const dp = Wd.approachPoint(b);
  for (const u of [...S.sv, ...S.z]) if (Iso.footprintContains(b, u.w.x, u.w.y)) { u.w = { x: dp.x + (rnd() - .5) * .3, y: dp.y }; u.path = null; }
}
function confirmPreview() {
  if (!preview || !sel || sel.kind !== 'building') return; const d = Wd.rotDef(DEFS[sel.type], sel.rot);
  if (sel.upgFrom) { if (!preview.ok) { say(preview.why); return; } const b = sel.upgFrom, place = { x: preview.x, y: preview.y, rot: (sel.rot | 0) & 3, w: d.w, h: d.h }; sel = null; preview = null; $('confirmBar').style.display = 'none'; upgradeBuilding(b, place); ui(); return; }   /* 3D.41 */
  const chk = Wd.placementCheck(world, preview.x, preview.y, d, null); if (!chk.ok) { say(chk.why); return; } if (!preview.ok) { say(preview.why); return; }
  if (!moving && buildLock(sel.type)) { say(buildLock(sel.type)); return; }
  const nb = { type: sel.type, x: preview.x, y: preview.y, rot: (sel.rot | 0) & 3, w: d.w, h: d.h, q: moving ? moving.q : d.q, a: moving ? moving.a : d.a, staff: moving ? moving.staff : null };
  if ((!moving)) {   /* V3D.12 (DV2 style): a construction site first; the building joins the town when it is done */
    SFX('build'); (S.sites ||= []).push(newJob({ ...nb }, bCost(d))); world.sites = S.sites; Wd.bump(world); pushUnitsOut(nb);
    say(d.name + (canPay(bCost(d)) ? ': construction started. Builders are bringing the materials.' : `: site marked. Still missing ${missText(bCost(d))}: survivors will gather it.`), true); sel = null; preview = null; $('confirmBar').style.display = 'none'; selected = null; saveGame(); ui(); return;
  }
  if (!moving) { SFX('build'); payCost(bCost(d)); S.builtCount++; renownGain(1, 'Construction'); banner('🔨 ' + d.name.toUpperCase() + ' BUILT'); if (DEFS[sel.type].fam === 'water' && S.stage === 0) { S.stage = 1; renownGain(5, 'Water secured'); questFlash(); } }
  world.buildings.push(nb); Wd.bump(world); pushUnitsOut(nb); if (nb.staff) nb.staff.post = nb; autoStaff(); say(moving ? d.name + ' moved.' : d.name + ' constructed!', true); moving = null; sel = null; preview = null; $('confirmBar').style.display = 'none'; selected = null; saveGame(); ui();
}
function sitesTick() {   /* V3D.12/23: work counts down once every material is in; finished sites become buildings, finished upgrades swap the type */
  world.sites = S.sites ||= [];
  if (tick % 60 === 0) for (const { j } of jobList()) {   /* recount what is on its way (self-healing after loads and interruptions) */
    const inb = {}; for (const q of S.sv) { if (q.haul && q.haul.id === j.id) inb[q.haul.r] = (inb[q.haul.r] || 0) + q.haul.n; if (q.gjob === j.id && q.carriedLoot) inb[q.carriedLoot] = (inb[q.carriedLoot] || 0) + (q.carryAmt || 0); }
    j.inb = inb; j.got ||= {}; j.hammer = S.sv.filter((q) => q.hammerJob === j.id).length; }
  if (tick % 90 === 45) for (const x of jobList().sort((a, b) => a.j.id - b.j.id)) {   /* 3D.58 owner: materials are carried to the site by people. A job with nothing on its way pulls in a helper (builders first, then whoever is nearest and not busy with something urgent) */
    const j = x.j, wants = Object.keys(j.need).some((k) => (j.need[k] || 0) - (j.got[k] || 0) - (j.inb[k] || 0) > 0 && (S[k] || 0) >= 1); if (!wants || zombieNear(jobPt(x), 5)) continue;
    const haulers = S.sv.filter((q) => q.haul && q.haul.id === j.id).length; if (haulers >= 2) continue;
    const OKM = ['free', 'wait', 'work', 'gather', 'chat', 'campfire', 'walk']; const c = S.sv.filter((q) => q.hp > q.max * .4 && !q.haul && !q.carrying && !q.carriedLoot && !q.rescuing && !q.sleeping && OKM.includes(q.mode) && !(q.mode === 'walk' && q.purpose) && !urgentNeed(q) && !(isNight() && q.job === 'Guard') && !insideBuilding(q))
      .sort((p, q) => (q.job === 'Builder' || q.job === 'Engineer' ? 1 : 0) - (p.job === 'Builder' || p.job === 'Engineer' ? 1 : 0) || dist(p.w, jobPt(x)) - dist(q.w, jobPt(x)))[0];
    if (!c) continue; if (c.gatherAt) { c.gatherAt = null; } c.activity = null; c.target = null; enterFree(c, 0); if (tryHaul(c)) { j.lastHaul = tick; break; } }
  if (tick % 200 === 0) for (const { j } of jobList().sort((a, b) => a.j.id - b.j.id)) {   /* last resort only: nobody has been able to carry for a long time (everyone away or hurt) */
    if (tick - (j.lastHaul || j.made || 0) < 3600 || S.sv.some((q) => q.haul && q.haul.id === j.id)) continue;
    const r = Object.keys(j.need).find((k) => (j.need[k] || 0) - (j.got[k] || 0) - (j.inb[k] || 0) > 0 && (S[k] || 0) >= 1); if (!r) continue;
    S[r] -= 1; j.got[r] = (j.got[r] || 0) + 1; if (jobReady(j) && !j.readyMsg) { j.readyMsg = true; const x = jobById(j.id); if (x) say(`${jobName(x)}: all materials are in, building now.`, true); } break; }
  for (const st of [...S.sites]) {
    if (!jobReady(st)) continue; if (--st.cons > 0) continue;
    S.sites.splice(S.sites.indexOf(st), 1); const { cons, dur, need, got, inb, id, hammer, readyMsg, ...nb } = st; nb.staff = null; const d = DEFS[nb.type];
    world.buildings.push(nb); Wd.bump(world); pushUnitsOut(nb); autoStaff(); S.builtCount++; renownGain(1, 'Construction');
    if (d.fam === 'water' && S.stage === 0) { S.stage = 1; renownGain(5, 'Water secured'); questFlash(); }
    celebrate(nb, d); rpStarter(); ui(); saveGame();
  }
  for (const b of world.buildings) {
    const u = b.upg; if (!u || !jobReady(u) || b.burnt) continue; if (--u.cons > 0) continue;
    const d0 = DEFS[b.type], n = DEFS[u.to]; b.upg = null;
    if (u.place) { const pd = Wd.rotDef(n, u.place.rot); if (Wd.placementCheck(world, u.place.x, u.place.y, pd, b).ok) { Object.assign(b, { x: u.place.x, y: u.place.y, rot: u.place.rot, w: pd.w, h: pd.h }); pushUnitsOut(b); } else say(`Something was built where the ${n.name} was meant to grow: it kept its old spot.`, true); }   /* 3D.41 */
    b.type = u.to; b.q = n.q; b.a = n.a; if (b.max) { b.max = bMax(b); b.hp = b.max; } Wd.bump(world);
    renownGain(2 + n.tier, n.name); autoStaff(); celebrate(b, n, d0);
    if (n.role === 'hq') { say(`The camp is now a ${n.name}! Tier ${n.tier} buildings unlocked${Wd.TERRITORY[n.tier] ? ', and you can claim more land' : ''}.`, true); showEventPopup({ stage: { scene: 'party', head: n.name + '!', icon: n.tier >= 3 ? '🏰' : '🏡', badge: 'Tier ' + n.tier, here: true }, title: '🏗 ' + n.name.toUpperCase() + ' COMPLETE', text: `Your base grew into a ${n.name}. ${n.tier === 2 ? 'Timber buildings are open: Cabins, Rain Collectors, Fenced Farms, Storehouses, the Workshop, the Lumber Camp and the Quarry.' : 'The stone tier is open: Stone Houses, the Stone Well, Irrigated Farms, the Mess Hall, the Hospital, Barracks and Stone Walls.'}` }); }
    ui(); saveGame();
  }
}
function celebrate(b, d, from) {
  if (b && (b.type === 'radio' || b.type === 'tradepost')) setTimeout(() => earnBanner('civic', b.type === 'radio' ? 'The Radio Tower is finished: the Haven can be heard for miles.' : 'The Trading Post is open: traders come to the Haven now.'), 600);   /* 3D.104 civic projects raise a Banner */   /* the "it's done!" moment: confetti, a banner, a line on what it does */
  SFX('reward'); banner((from ? '⬆ ' : '🏠 ') + d.name.toUpperCase() + ' COMPLETE'); doneFx.push({ b, f: 0, label: from ? d.name.toUpperCase() + '!' : 'DONE!' });
  (window.ZH_BURSTS ||= []).push({ x: b.x + b.w / 2, y: b.y + b.h / 2, t: performance.now() });
  const what = BDESC[d.key] || BDESC[d.like] || ''; if (what) screenToast(d.name + ': ' + what.split('.')[0]);
  logEvent(from ? `${from.name} upgraded to ${d.name}.` : `${d.name} built.`, 'important');
  barkSomeone(from ? 'upgraded' : 'built', { b: d.name }, { pri: 2 }, { x: b.x + b.w / 2, y: b.y + b.h / 2 });
}
const doneFx = [];
function drawSites() {   /* progress pill + time left over each site, a bouncing hammer, and a burst when one finishes */
  const u = hudU(), tw = TWs();
  for (const { j: st, b: bb } of jobList()) {   /* V3D.23: sites and upgrades; "need" text until every material is in */
    const c = project(bb.x + bb.w / 2, bb.y + bb.h / 2), top = c.y - (1.1 + .25 * Math.max(bb.w, bb.h)) * tw * .55, ready = jobReady(st), mi = jobMiss(st);
    const tot = Object.values(st.need).reduce((a, v) => a + v, 0) || 1, gotN = Object.entries(st.need).reduce((a, [k, v]) => a + Math.min(v, st.got[k] || 0), 0);
    const k = ready ? 1 - st.cons / st.dur : gotN / tot;
    const o = { hp: k, max: 1 }; o._ghost = k; hpPill(o, c.x + 4 * u, top, { col: ready ? '#f2b84a' : '#c9a36a', w: 46 });
    const secs = Math.ceil(st.cons / 60 / simSpeedNow()), txt = !ready ? 'need ' + costShort(mi) : secs >= 60 ? Math.floor(secs / 60) + 'm ' + String(secs % 60).padStart(2, '0') + 's' : secs + 's';
    hudText((st.to ? '⬆ ' : '') + txt, c.x + 4 * u, top - 4 * u, `600 ${Math.round(12 * u)}px Fredoka, Nunito, sans-serif`, ready ? '#fff8ec' : '#ffe0b0', '#5a3f31', 3.2 * u);
    if (ready) { const hb = Math.abs(Math.sin(tick / 9)) * 5 * u; ctx.save(); ctx.font = `${Math.round(17 * u)}px sans-serif`; ctx.textAlign = 'center'; ctx.translate(c.x - 24 * u, top + 6 * u - hb); ctx.rotate(-.6 + Math.abs(Math.sin(tick / 9)) * .9); ctx.fillText('🔨', 0, 0); ctx.restore(); }
  }
  for (let i = doneFx.length - 1; i >= 0; i--) {
    const e = doneFx[i], t = e.f++ / 60; if (t > 1.6) { doneFx.splice(i, 1); continue; }
    const c = project(e.b.x + e.b.w / 2, e.b.y + e.b.h / 2); ctx.save();
    for (let j = 0; j < 16; j++) { const a = j / 16 * 6.283, r = (10 + 60 * Math.min(1, t * 1.8)) * u; ctx.globalAlpha = Math.max(0, 1 - t / 1.5); ctx.fillStyle = ['#ffd45c', '#fff6c2', '#9be2ff', '#ffb0d0'][j % 4]; hudStar(c.x + Math.cos(a) * r, c.y - 30 * u + Math.sin(a) * r * .55 - t * 20 * u, 5 * u, t * 4); ctx.fill(); }
    ctx.globalAlpha = Math.min(1, (1.6 - t) * 2); hudText(e.label || 'DONE!', c.x, c.y - 60 * u - t * 10 * u, `${Math.round(24 * u * (t < .15 ? .6 + t * 2.7 : 1))}px 'Lilita One', Fredoka, sans-serif`, '#ffd45c', '#5a3f31', 6 * u); ctx.restore();
  }
}
function entranceArrow(pv) {   /* V3D.12: a bouncing arrow on the ground at the door, pointing out of the entrance */
  const dp = Wd.doorPoint(pv), ap = Wd.approachPoint(pv); let dx = ap.x - dp.x, dy = ap.y - dp.y; const L = Math.hypot(dx, dy) || 1; dx /= L; dy /= L;
  const bob = .12 + .12 * Math.sin(tick / 7), x0 = dp.x + dx * (.15 + bob), y0 = dp.y + dy * (.15 + bob), x1 = x0 + dx * 1.05, y1 = y0 + dy * 1.05;
  const P = (x, y) => project(x, y), a = P(x0, y0), b = P(x1, y1), ang = Math.atan2(b.y - a.y, b.x - a.x), len = Math.hypot(b.x - a.x, b.y - a.y), u = hudU(), w = 7 * u, hw = 15 * u, hl = Math.min(len * .55, 20 * u);
  ctx.save(); ctx.translate(a.x, a.y); ctx.rotate(ang); ctx.scale(1, .82);
  ctx.beginPath(); ctx.moveTo(0, -w); ctx.lineTo(len - hl, -w); ctx.lineTo(len - hl, -hw); ctx.lineTo(len, 0); ctx.lineTo(len - hl, hw); ctx.lineTo(len - hl, w); ctx.lineTo(0, w); ctx.closePath();
  ctx.lineJoin = 'round'; ctx.lineWidth = 4 * u; ctx.strokeStyle = '#5a3f31'; ctx.stroke(); ctx.fillStyle = pv.ok ? '#ffe07a' : '#ff9b8a'; ctx.fill(); ctx.restore();
}
const simSpeedNow = () => Math.max(1, simSpeed || 1);
let demoPick = null;
let tileConfirm = null;   /* V2.38: removing a wall or road takes a second tap on the same tile (it was instant: easy to do by accident) */
function confirmTile(kind, x, y, msg) { const k = kind + x + ',' + y, now = performance.now(); if (tileConfirm && tileConfirm.k === k && now - tileConfirm.t < 4000) { tileConfirm = null; return true; } tileConfirm = { k, x, y, t: now }; say(msg); return false; }
function drawTileConfirm() { if (!tileConfirm || performance.now() - tileConfirm.t > 4000) return; diamond(tileConfirm.x, tileConfirm.y, 'rgba(226,91,85,.55)', '#ffb0a8'); }
function tryDemolish(px, py, x, y) {   /* V2.33: one Demolish tool for buildings, roads and walls (buildings need a second tap to confirm) */
  { const st = (S.sites || []).find((q) => x >= q.x && x < q.x + q.w && y >= q.y && y < q.y + q.h); if (st) { if (!confirmTile('s', x, y, `Tap the ${DEFS[st.type].name} site again to cancel it (delivered materials come back).`)) return; for (const [k, v] of Object.entries(st.got || {})) S[k] = (S[k] || 0) + v; S.sites.splice(S.sites.indexOf(st), 1); world.sites = S.sites; Wd.bump(world); say('Site cancelled.'); saveGame(); ui(); return; } }   /* V3D.23 */
  const b = hitBuilding(px, py) || Wd.buildingAt(world, x, y);
  if (b) { if (demoPick === b) { demoPick = null; selected = null; demolish(b); startTool({ kind: 'demolish' }); return; } demoPick = b; selected = { kind: 'building', ref: b }; say(`Tap ${DEFS[b.type].name} again to demolish it (+${Math.floor(DEFS[b.type].mat * .5)} scrap).`); return; }
  demoPick = null; selected = null;
  { const gp = postAt(x, y); if (gp) { if (!confirmTile('p', x, y, 'Tap the guard post again to remove it (+1 part).')) return; removePost(gp); say('Guard post removed.'); ui(); return; } }
  { const tp = trapAt(x, y); if (tp) { if (!confirmTile('t', x, y, `Tap the ${TRAP_DEFS[tp.type].name} again to remove it (half the cost back).`)) return; trapMap().delete(x + ',' + y); refundCost(bCost(TRAP_DEFS[tp.type]), .5); Wd.bump(world); say(TRAP_DEFS[tp.type].name + ' removed.'); saveGame(); ui(); return; } }
  const wl = Wd.wallAt(world, x, y); if (wl) { if (!confirmTile('w', x, y, `Tap the ${Wd.WALL_DEFS[wl.type].name} again to remove it (half the cost back).`)) return; world.walls.delete(Wd.key(x, y)); Wd.bump(world); refundCost(bCost(Wd.WALL_DEFS[wl.type]), .5); say(Wd.WALL_DEFS[wl.type].name + ' removed.'); checkPerimeter(); saveGame(); ui(); return; }
  if (Wd.isRoad(world, x, y)) { if (!confirmTile('r', x, y, 'Tap the road again to remove it.')) return; world.roads.delete(Wd.key(x, y)); Wd.bump(world); say('Road removed.'); saveGame(); ui(); return; }
  say('Nothing to demolish there.');
}
function tryRoad(x, y) {
  if (!Wd.inTown(x, y)) { say('Roads only inside the build zone.'); return; }
  if (Wd.buildingAt(world, x, y)) { say('A building is in the way.'); return; }
  if (Wd.isRoad(world, x, y)) { if (!confirmTile('r', x, y, 'Tap the road again to remove it.')) return; world.roads.delete(Wd.key(x, y)); Wd.bump(world); say('Road removed.'); ui(); return; }
  if (S.mat < Wd.ROAD_COST) { say('Not enough scrap.'); return; }
  S.mat -= Wd.ROAD_COST; world.roads.add(Wd.key(x, y)); Wd.bump(world); ui();
}
function tryWall(x, y, type) {
  const wd = Wd.WALL_DEFS[type];
  if (!Wd.inWallZone(x, y)) { say('Walls go around the town, inside the glowing area.'); return; }
  if (Wd.buildingAt(world, x, y)) { say('A building is in the way.'); return; }
  if (postAt(x, y)) { say('A guard post is in the way.'); return; }
  { const bl = world.buildings.find((b) => { const t = Wd.approachTile(b); return t.x === x && t.y === y; }); if (bl && type !== 'gate') { say(`That's the ${DEFS[bl.type].name}'s doorway: keep it clear (a gate is fine).`); return; } }   /* 3D.115 entrances matter */
  const ex = Wd.wallAt(world, x, y), k = Wd.key(x, y);
  if (ex && ex.type === type) { if (!confirmTile('w', x, y, `Tap the ${wd.name} again to remove it.`)) return; world.walls.delete(k); Wd.bump(world); refundCost(bCost(wd), .5); say(wd.name + ' removed.'); saveGame(); ui(); return; }
  if (ex && wd.lvl && (Wd.WALL_DEFS[ex.type].lvl || 0) && wd.lvl > Wd.WALL_DEFS[ex.type].lvl) {   /* 3D.103 wall tiers: building a stronger wall on a weaker one upgrades it in place (half of the old one's cost back) */
    if ((wd.tier || 1) > hqTier()) { say(wd.name + ' needs the ' + hqName(wd.tier) + '.'); return; } if (!canPay(bCost(wd))) { say('Not enough: need ' + missText(bCost(wd)) + '.'); return; }
    payCost(bCost(wd)); refundCost(bCost(Wd.WALL_DEFS[ex.type]), .5); const old = Wd.WALL_DEFS[ex.type].name; ex.type = type; ex.broken = false; ex.max = Math.round(wd.hp * (researched('walls') ? 1.3 : 1)); ex.hp = ex.max; Wd.bump(world); checkPerimeter(); say(old + ' upgraded to ' + wd.name + '.'); saveGame(); ui(); return; }
  if (ex) { say('Remove the ' + Wd.WALL_DEFS[ex.type].name + ' first.'); return; }
  if (wd.rank > S.rank) { say(wd.name + ' needs Haven level ' + lvlOfRank(wd.rank) + '.'); return; } if ((wd.tier || 1) > hqTier()) { say(wd.name + ' needs the ' + hqName(wd.tier) + '.'); return; }
  if (Wd.isRoad(world, x, y) && type !== 'gate') { say('Use a Gate to close a road.'); return; }
  if ([...S.sv, ...S.z].some((u) => u.hp > 0 && Math.floor(u.w.x) === x && Math.floor(u.w.y) === y)) { say('Someone is standing there.'); return; }
  if (!canPay(bCost(wd))) { say('Not enough: need ' + missText(bCost(wd)) + '.'); return; }
  payCost(bCost(wd)); const whp = Math.round(wd.hp * (researched('walls') ? 1.3 : 1)); world.walls.set(k, { x, y, type, hp: whp, max: whp }); Wd.bump(world); checkPerimeter(); saveGame(); ui();
}
function checkPerimeter() {
  const p = Wd.perimeter(world); if (p.sealed && !S.sealed) { note('important', '🛡 PERIMETER SEALED', { log: 'The perimeter is sealed. Zombies must break through.' }); }
  if (!p.sealed && S.sealed) { note('important', '⚠ PERIMETER OPEN', { log: 'The perimeter is open: zombies can walk in through a gap.' }); }
  S.sealed = p.sealed; return p;
}
/* ---------------- 3D.76 traps (3D.100: anywhere open, not only outside the wall ring), they wear out and are re-armed with scrap (a choice made before the night) ---------------- */
const TRAP_DEFS = {
  spikes: { name: 'Spike Strip', rank: 2, mat: 2, wood: 2, rearm: { mat: 2 }, ch: 5, dmg: 15, icon: '🔺', desc: 'Sharpened stakes. A zombie that steps on it takes 15 damage and stumbles. Blunt after 5 hits: re-arm for 2 scrap.' },
  wire:   { name: 'Barbed Wire', rank: 2, mat: 3, wood: 1, rearm: { mat: 2 }, ch: 12, icon: '〰', desc: 'Zombies crossing it move at half speed. Torn after 12 crossings: re-arm for 2 scrap.' },
  trench: { name: 'Fire Trench', rank: 3, mat: 3, wood: 2, fuel: 1, rearm: { fuel: 1 }, ch: 6, dmg: 22, icon: '🔥', desc: 'A ditch of fuel-soaked brush. A zombie crossing it is set alight: 22 damage. Burns out after 6: re-arm with 1 fuel.' },   /* 3D.104 */
  mine:   { name: 'Land Mine', rank: 3, mat: 6, fuel: 1, rearm: { mat: 6, fuel: 1 }, ch: 1, dmg: 70, icon: '💥', desc: 'One blast: 70 damage to every zombie within a tile and a half. Explosives are limited stock: re-arm for 6 scrap and 1 fuel.' },   /* 3D.104 explosives */
  lure:   { name: 'Noise Lure',  rank: 3, mat: 4, wood: 1, rearm: { mat: 3 }, ch: 1, pull: 3, reach: 12, hold: 1500, icon: '🔔', desc: 'Cans and a wind-up bell. When a boss attacks it rattles once and pulls up to 3 nearby zombies of the horde aside for a while. The boss ignores it. One use: re-arm for 3 scrap.' },
};
const trapMap = () => world.traps || (world.traps = new Map());
const trapAt = (x, y) => trapMap().get(x + ',' + y) || null;
const trapMax = () => 4 + 2 * (S.rank || 1);
const trapsSpent = () => [...trapMap().values()].filter((t) => t.ch <= 0);
const trapOkTile = (x, y) => Wd.inMap(x, y) && x > 0 && y > 0 && x < Wd.COLS - 1 && y < Wd.ROWS - 1 && !Wd.buildingAt(world, x, y) && !Wd.wallAt(world, x, y) && !isTreeSpot(x, y);   /* 3D.100 owner: traps go anywhere open, inside the walls too */
function tryTrap(x, y, type) {
  const td = TRAP_DEFS[type]; if (!td) return { ok: false, why: 'type' };
  const ex = trapAt(x, y), k = x + ',' + y;
  if (ex && ex.type === type && ex.ch <= 0) { if (!canPay(td.rearm)) { say('Not enough: need ' + missText(td.rearm) + ' to re-arm.'); return { ok: false, why: 'cost' }; } payCost(td.rearm); ex.ch = td.ch; say(td.name + ' re-armed.'); Wd.bump(world); saveGame(); ui(); return { ok: true, why: 'rearm' }; }
  if (ex && ex.type === type) { if (!confirmTile('t', x, y, `Tap the ${td.name} again to remove it.`)) return { ok: false, why: 'confirm' }; trapMap().delete(k); refundCost(bCost(td), .5); Wd.bump(world); say(td.name + ' removed.'); saveGame(); ui(); return { ok: true, why: 'removed' }; }
  if (ex) { say('A ' + TRAP_DEFS[ex.type].name + ' is already there.'); return { ok: false, why: 'taken' }; }
  if (!trapOkTile(x, y)) { say('Something is in the way.'); return { ok: false, why: 'tile' }; }
  if (S.rank < td.rank) { say(td.name + ' needs Haven level ' + lvlOfRank(td.rank) + '.'); return { ok: false, why: 'rank' }; }
  if (trapMap().size >= trapMax()) { say(`Room for ${trapMax()} traps at this rank.`); return { ok: false, why: 'max' }; }
  if (!canPay(bCost(td))) { say('Not enough: need ' + missText(bCost(td)) + '.'); return { ok: false, why: 'cost' }; }
  payCost(bCost(td)); trapMap().set(k, { x, y, type, ch: td.ch }); Wd.bump(world); saveGame(); ui(); return { ok: true, why: 'placed' };
}
function rearmAll() {   /* re-arm every spent trap the scrap pays for */
  let n = 0; for (const t of trapsSpent()) { const c = TRAP_DEFS[t.type].rearm; if (!canPay(c)) break; payCost(c); t.ch = TRAP_DEFS[t.type].ch; n++; }
  if (n) { Wd.bump(world); saveGame(); } return n;
}
const rearmCost = () => trapsSpent().reduce((a, t) => a + (TRAP_DEFS[t.type].rearm.mat || 0), 0);
/* 3D.104 EXPLOSIVES (approved: limited stock). Pipe bombs and molotovs are made at the Ammo Bench and Fuel Still (a Mechanic, one a day each
   while there is room), grenades come from traders and military loot. Fighters throw one on their own at a tight crowd (4+) or a boss,
   never where a survivor would be caught in the blast. Stock is capped low. */
const EX_DEFS = { pipebomb: { name: 'Pipe Bomb', icon: '💣', dmg: 60, r: 1.6, price: 9, desc: '60 damage in a 1.6-tile blast' }, molotov: { name: 'Molotov', icon: '🍾', dmg: 26, r: 1.4, burn: true, price: 6, desc: '26 damage and sets the crowd alight' }, grenade: { name: 'Grenade', icon: '🧨', dmg: 75, r: 1.9, price: 14, desc: '75 damage in a 1.9-tile blast' } };
const exCap = () => 3 + storeTiers();
function exAdd(id, n) { S.ex = S.ex || {}; const room = Math.max(0, exCap() - (S.ex[id] || 0)), g = Math.min(n, room); S.ex[id] = (S.ex[id] || 0) + g; return g; }
function boom(at, dmg, r, burn) {   /* an explosion: hurts every zombie and raider in reach */
  let n = 0; for (const z of S.z) { if (z.hp <= 0 || z.zoo) continue; const d = dist(z.w, at); if (d > r) continue; const big = z.type === 'boss' || z.type === 'alpha', k = Math.round(dmg * (d < r * .5 ? 1 : .6) * (big ? .5 : 1)); if (big) z.stunT = tick + 120; z.hp -= k; z.hitT = 12;   /* 3D.110 as approved: bosses take half and are stunned 2 s */ if (burn) z.burnT = 180; n++; floats.push({ w: { ...z.w }, t: '-' + k, col: '#ffb060', a: 50 }); if (z.hp <= 0) { S.kills++; if (z.human) raiderDown(z); } }
  floats.push({ w: { ...at }, t: burn ? '🔥' : '💥', col: '#ffd070', a: 60, big: true }); (window.ZH_BOOMS ||= []).push({ x: at.x, y: at.y, r, burn: !!burn, t: performance.now() }); SFX('hit'); return n;
}
function exTick() {   /* every half second: should a fighter throw something? */
  if (S.exAuto === false || !S.ex) return; if ((S.exCD || 0) > tick) return; const have = ['grenade', 'pipebomb', 'molotov'].filter((k) => (S.ex[k] || 0) > 0); if (!have.length) return;
  for (const q of S.sv) { if (q.hp <= 0 || !isFighter(q) || !q.target || q.target.hp <= 0 || ['away', 'down', 'hospital'].includes(q.mode)) continue; const t = q.target; if (dist(q.w, t.w) > 6) continue;
    const crowd = S.z.filter((z) => z.hp > 0 && !z.zoo && dist(z.w, t.w) < 1.6), boss = t.type === 'boss'; if (crowd.length < 4 && !boss) continue;
    const at = { x: crowd.reduce((a, z) => a + z.w.x, 0) / crowd.length, y: crowd.reduce((a, z) => a + z.w.y, 0) / crowd.length }, id = boss ? (have.includes('grenade') ? 'grenade' : have.includes('pipebomb') ? 'pipebomb' : have[0]) : have[have.length - 1], E = EX_DEFS[id];
    if (S.sv.some((o) => o.hp > 0 && o.mode !== 'away' && !insideBuilding(o) && dist(o.w, at) < E.r + .3)) continue;   /* never on our own people */
    S.ex[id]--; S.exCD = tick + 240; const n = boom(at, E.dmg, E.r, E.burn); bark(q, 'kill', {}, { pri: 2, line: id === 'molotov' ? 'Light them up!' : 'Fire in the hole!', style: 'shout' }); note('routine', `${E.icon} ${q.name} threw a ${E.name}: ${n} hit.`); return; }
}
function exDaily() {   /* the workshops make a little each day */
  if (bOf('ammobench').some((b) => isWorking(b)) && S.mat >= 20 && S.fuel >= 1 && exAdd('pipebomb', 1)) { S.mat -= 4; S.fuel -= 1; }
  if (bOf('fuelstill').some((b) => isWorking(b)) && (S.cloth || 0) >= 1 && S.fuel >= 2 && exAdd('molotov', 1)) { S.cloth -= 1; S.fuel -= 1; }
}
/* 3D.104 KENNEL and DOGS (approved). A Kennel keeps two dogs; while there is room a stray turns up every few days. A dog that follows someone works
   by its owner's job: a guard dog (Guard, Police) bites zombies next to its owner, a digger (Scavenger, Farmer) finds scrap or food more often,
   a companion (everyone else) keeps its owner happy, and a dog that goes on an expedition scouts ahead (a safer trip). */
const dogRole = (s) => (['Guard', 'Police Officer'].includes(s.job) ? 'guard' : ['Scavenger', 'Farmer'].includes(s.job) ? 'digger' : 'companion');
const dogsOwned = () => (S.pets || []).filter((p) => p.kind === 'dog').length + S.sv.filter((q) => q.pet && q.pet.kind === 'dog').length;
function kennelDaily() {
  const room = 2 * bOf('kennel').length; if (!room || dogsOwned() >= room || (S.strayNext || 0) > S.day) return; S.strayNext = S.day + 3;
  const p = newPet('dog'); (S.pets = S.pets || []).push(p); SFX('woof'); note('important', `🐕 A stray dog, ${p.name}, found the Kennel. Tap a survivor → Pet to give it an owner.`);
}
function dogBite() {   /* every 30 ticks: guard dogs bite zombies next to their owner */
  for (const s of S.sv) { if (!s.pet || s.pet.kind !== 'dog' || s.hp <= 0 || ['away', 'down'].includes(s.mode) || insideBuilding(s) || dogRole(s) !== 'guard') continue;
    const z = S.z.find((q) => q.hp > 0 && !q.zoo && q.mode !== 'appear' && dist(q.w, s.w) < 1.3); if (!z) continue; z.hp -= 4; z.hitT = 8; if (!z.slowT || z.slowT < tick) z.slowT = tick + 40; floats.push({ w: { ...z.w }, t: '🐕-4', col: '#ffe38a', a: 40 }); if (z.hp <= 0) S.kills++; }
}
function trapStep(z, px, py) {   /* after a zombie moves: wire slows it, spikes hurt it (once per strip) */
  if (z.stun > 0) { z.stun--; z.w.x = px; z.w.y = py; z.moving = false; return; }
  const tx = Math.floor(z.w.x), ty = Math.floor(z.w.y), t = trapMap().size ? trapAt(tx, ty) : null; if (!t || t.ch <= 0) { z.onTrap = null; return; }
  const k = tx + ',' + ty, fresh = z.onTrap !== k; z.onTrap = k;
  if (t.type === 'wire') { z.w.x = px + (z.w.x - px) * .5; z.w.y = py + (z.w.y - py) * .5; if (fresh) { t.ch--; if (t.ch <= 0) Wd.bump(world); } return; }
  if (t.type === 'trench' && fresh) { const dmg = TRAP_DEFS.trench.dmg; z.hp -= dmg; z.hitT = 9; t.ch--; S.trapHits = (S.trapHits || 0) + 1; if (z.hp <= 0) S.trapKills = (S.trapKills || 0) + 1; floats.push({ w: { ...z.w }, t: '🔥-' + dmg, col: '#ffa040', a: 45 }); if (t.ch <= 0) Wd.bump(world); return; }
  if (t.type === 'mine' && fresh && !z.human) { const at = { x: tx + .5, y: ty + .5 }; boom(at, TRAP_DEFS.mine.dmg, 1.5); t.ch = 0; Wd.bump(world); return; }
  if (t.type === 'spikes' && fresh) {
    const dmg = Math.round(TRAP_DEFS.spikes.dmg * (townHyb('sapper') ? 1.3 : 1)); z.hp -= dmg; z.hitT = 9; z.stun = z.type === 'boss' ? 10 : 40; t.ch--; S.trapHits = (S.trapHits || 0) + 1; if (z.hp <= 0) S.trapKills = (S.trapKills || 0) + 1;
    floats.push({ w: { ...z.w }, t: '-' + dmg, col: '#ffcf6a', a: 45 }); if (t.ch <= 0) { Wd.bump(world); floats.push({ w: { x: tx + .5, y: ty + .5 }, t: 'spikes blunt', col: '#c9c4b8', a: 70 }); }
  }
}
function lureFire() {   /* a boss attacks: each armed lure rattles once and pulls a few of the horde near it aside */
  let pulled = 0;
  for (const t of trapMap().values()) {
    if (t.type !== 'lure' || t.ch <= 0) continue; const td = TRAP_DEFS.lure, at = { x: t.x + .5, y: t.y + .5 };
    const cand = S.z.filter((z) => z.hp > 0 && z.mob && z.type !== 'boss' && !z.human && !z.lure && dist(z.w, at) < td.reach).sort((a, b) => dist(a.w, at) - dist(b.w, at)).slice(0, td.pull);
    for (const z of cand) { z.lure = at; z.lureUntil = tick + td.hold; } t.ch = 0; pulled += cand.length; floats.push({ w: at, t: '🔔 clang clang', col: '#ffe08a', a: 90 });
  }
  if (pulled) { S.lurePulled = (S.lurePulled || 0) + pulled; Wd.bump(world); note('important', `🔔 The Noise Lure rattles: ${pulled} zombie${pulled > 1 ? 's' : ''} of the horde turn${pulled > 1 ? '' : 's'} toward it.`); }
  return pulled;
}
function lureStep(z) {   /* a lured zombie shuffles to the noise and mills there, unless someone comes close */
  if (!z.lure) return false; if (tick > z.lureUntil || z.mode === 'appear') { if (tick > z.lureUntil) z.lure = null; return false; }
  const d = zDef(z); for (const s of S.sv) if (s.hp > 0 && !['down', 'hospital'].includes(s.mode) && !insideBuilding(s) && dist(s.w, z.w) < d.aggro) { z.lure = null; return false; }
  if (dist(z.w, z.lure) > .9) moveSlide(z, z.lure, d.chase * .7); else z.moving = false; return true;
}
function demolish(b) { const d = DEFS[b.type], c = bCost(d); releasePost(b); world.buildings = world.buildings.filter((q) => q !== b); Wd.bump(world); refundCost(c, .5); selected = null; closeP(); say(`${d.name} demolished · half the wood and scrap back`, true); saveGame(); ui(); }
function moveBuilding(b) { world.buildings = world.buildings.filter((q) => q !== b); Wd.bump(world); moving = b; selected = null; closeP(); sel = { kind: 'building', type: b.type, rot: (b.rot | 0) & 3 }; preview = null; $('yesBuild').style.display = ''; $('nudge').style.display = ''; $('rotBuild').style.display = ''; $('noBuild').textContent = 'CANCEL'; updatePreview(b.x, b.y); say('Tap a new spot for the south corner.'); }

/* ---------------- panels (V2.27: DV2-style, big text, less clutter) ---------------- */
let panelBack = null;
function showPanel(title, back) {
  $('say').style.opacity = 0; if (title) $('it').textContent = title; panelBack = back || null; $('pBack').style.display = panelBack ? 'block' : 'none';
  $('infoPanel').classList.add('show'); $('ib').scrollTop = 0;
}
const BDESC = {
  townhall: 'The City\'s heart. +3 renown every day, and one more Specialist and Hybrid slot. Needs Haven level 16.', market: 'A trader comes every day. Needs Haven level 17.', watertower: 'Pumps 30 water a day with power (a quarter without). Needs Haven level 16.',
  garage: 'Holds one vehicle (Pickup Truck or Armored Van) and restores the wrecks your squads find. The Hand Cart is kept here too. Build a second Garage for a second vehicle.',
  hq: 'The heart of the base. Upgrade it to unlock the next tier of buildings and more land to claim.', hq2: 'A timber lodge: unlocks Timber buildings.', hq3: 'A stone fort: unlocks the Stone tier.',
  tent: 'Beds for 2. Upgrade to a Cabin, then a Stone House, for more beds and better rest.', cabin: 'A log cabin with beds for 3; better rest than a tent.', stonehouse: 'A stone house with beds for 4: the best rest and a happier mood.',
  house: 'A home of their own for one long-time resident.', inn: 'Beds for 4.',
  bonfire: 'A big camp fire: burns bright at night and lights the camp around it (about 4 tiles), so you can see your people and the zombies.',
  barrel: 'Catches a little rainwater. Upgrade to a Rain Collector, then a Stone Well.', water: 'Catches rainwater. A Farmer makes it collect more.', well: 'Draws groundwater: the most water.',
  farm: 'A small vegetable patch. Drinks a little water. A Farmer boosts it.', field: 'A fenced field: nearly twice the food of a Garden Plot.', irrig: 'Irrigated rows: the most food, but thirsty.',
  medic: 'Treats the hurt and heals field wounds. Care is slower without a Medic on staff.', clinic: 'Faster healing and longer survival for the badly hurt.', hospital: 'The best care: fastest healing, the most time to save the dying. With power (1) it can operate: the badly hurt hold on 40% longer.',
  canteen: 'Survivors eat here. A Cook makes every meal more filling.', mess: 'A big stone mess hall: seats 4 and meals do more.',
  crates: 'Holds more food, water, wood and stone.', storage: 'Holds more food, water, wood and stone.', warehouse: 'Holds the most.',
  bench: 'Research and craft gear. Upgrade to a Workshop for more research.', workshop: 'Research new tech and craft gear. Engineers work fastest.',
  armory: 'Survivors buy basic weapons and armor here with spare scrap.',
  scrapyard: 'Turns junk into scrap. A Scavenger boosts it.', lumber: 'A worker chops wood all day (plants as they go). A Scavenger boosts it.', quarry: 'A worker digs stone all day. An Engineer boosts it.',
  gym: 'Free-time training for Strength.', library: 'Study for Intelligence. Every visit adds research.', lounge: 'Relax for Charisma and a happier mood.',
  range: 'Target practice for Perception (better with guns and bows).', track: 'Obstacle runs for Agility (speed and dodging).', sparring: 'Bouts in the ring for Endurance (more HP).',
  barracks: 'Fighters rest and gear up here. Next to an Armory, gear gets cheaper.',
  generator: 'Burns 3 fuel a day (a Mechanic on it saves a quarter). While it runs it gives 4 power to the buildings that need it, lights the camp at night and gives buildings within 5 tiles +20% output.',
  radio: 'Needs power (1). With power it can send the rescue signal (the way to end the game and get your score), and newcomers hear of the Haven 30% sooner.',
  pump: 'Needs power (1). Pumps 16 water a day; a Mechanic runs it at full speed. Dead without power.',
  greenhouse: 'Grows food all year from a little water. With power (1) its lamps grow 40% more. A Farmer tends it.',
  coldstore: 'Needs power (1). Stores 40 more food and water. Without power it holds no extra (nothing already stored is lost).',
  fuelstill: 'A Mechanic turns 2 wood into 1 fuel: keeps the Generators running without trips to the Gas Station.',
  ammobench: 'A Mechanic hand-loads rounds: 16 a day for 4 scrap. Guns need ammo; crossbows and melee never do.',
  tradepost: 'Traders come twice as often and pay 20% more for your goods. Finishing one is a civic project: it raises a Civic Banner.', kennel: 'Keeps two dogs. A stray turns up every few days while there is room. Dogs guard, dig and keep their owner company.', school: 'Trains intelligence (3 at a time). Children grow up in 3 days instead of 5.',
  floodlight: 'Needs power (1). At night, zombies within 5 tiles are slowed by the glare.', turbine: '+2 power, no fuel. Works day and night.', solar: '+3 power in daylight (6:00-19:00), no fuel.', pole: 'Carries a running Generator\'s +20% output boost 5 tiles further.',
  ammofactory: 'Needs power (2). A Mechanic makes 64 rounds a day for 16 scrap: what a big town of gunners needs.',
};
const BCAT = [['live', 'Living', ['tent', 'bonfire', 'barrel', 'farm', 'canteen', 'crates', 'bench', 'scrapyard', 'tradepost', 'kennel', 'garage', 'townhall', 'market', 'watertower', 'lumber', 'quarry', 'generator', 'turbine', 'solar', 'pole', 'fuelstill', 'radio', 'pump', 'greenhouse', 'coldstore']], ['care', 'Care', ['medic']],
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
  if (d.out && d.fam === 'water') fx.push(`💧 +${d.out} water / day`); if (d.out && d.fam === 'farm') fx.push(`🍖 +${d.out} food / day · 💧 −${d.waterUse}`);
  if (d.fam === 'scrap') fx.push(`⚙ +${d.out} scrap / day`); if (d.fam === 'lumber') fx.push(`🪵 +${d.out} wood / day`); if (d.fam === 'quarry') fx.push(`🪨 +${d.out} stone / day`); if (d.cap > 1 && d.role === 'inn') fx.push(`🛏 beds for ${d.cap}`); if (d.tier) fx.push(['', '⛺ Camp tier', '🪵 Timber tier', '🪨 Stone tier'][d.tier]); if (d.fam === 'research') fx.push('🔬 research + crafting'); if (d.train) fx.push(`📈 trains ${STAT_NAME[d.train]}`);
  if (d.role === 'home') fx.push('🛏 +2 people'); if (d.role === 'medical') fx.push(`💊 treats ${d.cap}`); if (d.slot) fx.push('👷 1 worker: ' + (STAFF_JOBS[d.fam] || []).join(' / '));
  $('ib').innerHTML = `<div class="bdetail"><div class="big">${bImg(k, 300, 140)}</div>
    <div class="row" style="justify-content:center;gap:14px;font-size:21px"><span><b>${costShort(bCost(d))}</b></span><span>${size}</span><span class="sm">upkeep ${(UPKEEP[k] ?? .3).toFixed(1)}/day</span></div>
    <p class="desc">${BDESC[k] || ''}</p><div class="desc">${fx.map((x) => `<div>${x}</div>`).join('')}</div>
    <div class="desc sm" style="margin-top:6px">Quality ${d.q} · Appeal ${d.a}${have ? ` · you have ${have}` : ''}</div>
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
function traitCard(u) { const t = TRAITS[u.trait], vn = voiceName(u); return (`<div class="card traitCard"><b>Age ${ageOf(u)}</b>${vn ? ` · ${vn} voice` : ''}<div class="sm">Gets along fastest with people about the same age.</div></div>`) + (t ? `<div class="card traitCard"><b>${t.icon} ${t.name}</b><div class="sm">✔ ${traitGood(u)}</div><div class="sm">✖ ${t.bad}</div></div>` : ''); }
function unitPanel(u) {
  selected = { kind: 'unit', ref: u }; closeP();
  $('ib').innerHTML = `<div class="card row">${portrait(u)}<div class="sp"><div style="font-size:24px;line-height:22px">${esc(fullName(u))} ${u.resident ? '🏠' : ''}${u.partner ? '💑' : ''}</div><div class="sm">${u.job} · Lv.${u.l}</div>
    <div class="row"><span class="sm">HP</span><div class="sp">${meter(u.hp / u.max * 100, 'hp')}</div><span class="sm">${Math.ceil(u.hp)}/${u.max}</span></div></div></div>
    <div style="margin:-2px 0 6px">${esc(activityText(u))}</div>` + classHtml(u) + `<div class="card row gTog"><span class="sp"><b>${window.ZHIcons ? ZHIcons.svg('wood', 20) : '🪵'} Gather wood &amp; supplies</b><div class="sm">${chopOn(u) ? (u.post ? 'Splits some work time with chopping and gathering' : 'Chops and gathers in free time') : (u.post ? 'Focuses on the ' + DEFS[u.post.type].name : 'Won’t chop or gather')}</div></span><button class="tgl${chopOn(u) ? ' on' : ''}" id="uChop" aria-pressed="${chopOn(u)}"><i></i></button></div>` + traitCard(u) + nowCard(u)
    + (u.mode === 'down' ? `<div class="card"><b style="color:var(--bad)">Bleeding out: ${Math.ceil((u.bleed ?? 0) / 60)} s left</b><br><button class="act go" id="bandage">Bandage +60 s (${(S.cloth || 0) >= 1 ? '🧵 1' : '⚙ ' + BANDAGE_COST * 2})</button></div>` : '');
  showPanel(u.name.toUpperCase()); { const us = $('uSpec'); if (us) us.onclick = () => { if (promoteSpec(u)) unitPanel(u); }; $('ib').querySelectorAll('[data-hyb]').forEach((b) => { b.onclick = () => { if (promoteHyb(u, b.dataset.hyb)) unitPanel(u); }; }); } { const cb = $('uChop'); if (cb) cb.onclick = () => { u.chop = !chopOn(u); if (!u.chop && (u.purpose === 'gath-out' || u.mode === 'gather')) { u.gatherAt = null; enterFree(u, 10); } saveGame(); unitPanel(u); }; } { const nd = unitNow(u), dd = $('uDest'), pp = $('uPost'); if (dd && nd.destB) dd.onclick = () => showBuildingInfo(nd.destB); if (pp) pp.onclick = () => showBuildingInfo(u.post); } const bd = $('bandage'); if (bd) bd.onclick = () => { if (useBandage(u)) unitPanel(u); }; unitExtra(u);
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
function classHtml(u) {   /* a small class tree: profession level → Specialist → Hybrid */
  const sp = SPECS[u.job], c = clsL(u, u.job), sw = specWhy(u), hy = hybOptions(u).slice(0, 4);
  const step = (on, t) => `<span style="padding:2px 7px;border-radius:9px;background:${on ? 'var(--gold)' : 'rgba(255,255,255,.12)'};color:${on ? '#1b1206' : 'inherit'}">${t}</span>`;
  return `<div class="card"><b>Class path</b><div class="row" style="gap:4px;flex-wrap:wrap;margin:4px 0">${step(true, `${u.job} Lv.${c}`)} › ${step(!!u.spec, sp ? `${sp.icon} ${sp.name}` : '—')} › ${step(!!u.hyb, u.hyb ? HYBRIDS.find((h) => h.k === u.hyb).icon + ' ' + HYBRIDS.find((h) => h.k === u.hyb).name : 'Hybrid')}</div>`
    + (sp ? `<div class="sm">${u.spec ? `${sp.name}: ${sp.desc}` : `${sp.name}: ${sp.desc}. ${sw || ''}`}</div>${!u.spec ? `<button class="act${sw ? '' : ' go'}" id="uSpec" ${sw ? 'disabled' : ''}>Promote to ${sp.name} · ${costShort(SPEC_COST)}</button>` : ''}` : '')
    + (u.hyb ? '' : hy.map((h) => { const w = hybWhy(u, h); return `<div class="sm" style="margin-top:4px">${h.icon} <b>${h.name}</b> (${h.a} + ${h.b}): ${h.desc}${w ? ' · ' + w : ''}</div>${w ? '' : `<button class="act go" data-hyb="${h.k}">Become a ${h.name} · ${costShort(HYB_COST)}</button>`}`; }).join('')) + '</div>';
}
function hybDaily() {   /* the town perks of Hybrids */
  if (townHyb('gunsmith')) S.ammo = Math.min(ammoCap(), (S.ammo || 0) + 16); if (townHyb('salvager')) { S.mat += 3; if (rnd() < .3) S.fuel = (S.fuel || 0) + 1; }
  if (townHyb('homesteader')) S.food = keepCap(supplyCap(), S.food, 4); if (townHyb('herbalist')) S.meds = Math.min(rareCap(), (S.meds || 0) + 1);
  if (townHyb('caretaker') || S.sv.some((q) => q.hp > 0 && hasSpec(q, 'leader'))) for (const q of S.sv) { q.sat = Math.min(100, (q.sat || 0) + 3); if (townHyb('caretaker') && q.hp > 0 && q.mode !== 'down') q.hp = Math.min(q.max, q.hp + Math.round(q.max * .05)); }
  if (townHyb('sapper') && S.day % 7 === 0) exAdd('pipebomb', 1);
}
function nextSkillText(s, job) {   // e.g. "next: Tough at Lv.5"
  const c = (s.cls && s.cls[job]) || { l: 1 }; const nx = Object.values(SKILLS).filter((k) => k.from === job && k.at > c.l).sort((a, b) => a.at - b.at)[0];
  return nx ? `Next skill: ${nx.name} at Lv.${nx.at}` : 'All skills learned';
}
const itemText = (it) => !it ? '—' : [it.atk ? `ATK ${it.atk}${it.ranged ? ' (range)' : ''}` : '', it.slot === 'weapon' && it.rate ? (it.rate < .85 ? 'Fast' : it.rate > 1.2 ? 'Slow' : '') : '', it.mag ? `${it.mag} ${it.mag > 1 ? 'rounds' : 'bolt'} · ${it.reload}s reload` : '', it.def ? `DEF ${it.def}` : '', ...Object.entries(it.st || {}).map(([k, v]) => `${v > 0 ? '+' : ''}${v} ${k.toUpperCase()}`), FX_TEXT[it.fx] || ''].filter(Boolean).join(' · ');
const FX_TEXT = { carry1: 'Carries +1', carry2: 'Carries +2', build: 'Builds 30% faster', fire: 'Puts out fires faster', gas: 'Spit & gas hurt 60% less', night: '+2 PER at night', rain: 'Happy in rain', regen: 'Slowly heals', radio: 'Calls help from twice as far' };   /* 3D.28 */

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
  $('ib').innerHTML = `<div class="sm" style="margin-bottom:6px">${S.sv.length} people · room for ${popCap()} (beds ${bedCount()}, rank allows ${rankRoom()})</div><div class="lst">` + S.sv.map((s) => `<div class="card" data-sv="${s.id}">${portrait(s)}<div class="sp" style="min-width:0"><div>${esc(fullName(s))} <span title="${TRAITS[s.trait] ? TRAITS[s.trait].name : ''}">${traitIcon(s)}</span> <span class="sm">${s.job} Lv.${s.l}</span></div>${meter(s.hp / s.max * 100, 'hp')}<div class="sm" style="white-space:nowrap;overflow:hidden;text-overflow:ellipsis">${esc(activityText(s))}</div></div><span class="sm">›</span></div>`).join('') + '</div>';
  showPanel('People');
  $('ib').querySelectorAll('[data-sv]').forEach((el) => { el.onclick = () => { const s = S.sv.find((q) => q.id === +el.dataset.sv); if (s) { centerOn(s.w.x, s.w.y); unitPanel(s); panelBack = showSurvivors; $('pBack').style.display = 'block'; } }; });
}
function perimText() {
  const p = Wd.perimeter(world); if (!p.walls) return 'No walls yet: zombies walk straight in.';
  return `${p.walls} wall tiles, ${p.gates} gate${p.gates === 1 ? '' : 's'}: ` + (p.sealed ? '<b style="color:var(--good)">SEALED</b>' : '<b style="color:var(--bad)">OPEN</b> <span class="sm">(close every gap)</span>') + (p.weakest ? `<div class="sm">Weakest: ${Math.ceil(p.weakest.hp)}/${p.weakest.max} HP</div>` : '');
}
function expandInfo() { const t = (S.terr || 0) + 1, n = Wd.TERRITORY[t]; return n ? { n, hqOk: t <= hqTier(), ok: t <= hqTier() && S.ren >= n.ren && canPay(bCost(n)) } : null; }
function expandTerritory() {   /* V2.13: more land to build on, more zombies to hold off */
  const e = expandInfo(); if (!e || !e.ok) return false; payCost(bCost(e.n)); S.terr = (S.terr || 0) + 1; Wd.setTerritory(S.terr); Wd.bump(world);   /* 3D.100: traps inside the new walls stay (they go anywhere now) */
  banner('🗺 TERRITORY EXPANDED'); say(`The Haven claimed more land (tier ${S.terr}). More zombies will come, from more directions.`, true); renownGain(3, 'Territory expanded'); saveGame(); ui(); return true;
}
let tTab = 'overview';
const progRow = (label, have, need) => `<div class="row"><span style="width:96px">${label}</span><div class="sp">${meter(have / Math.max(1, need) * 100, have >= need ? '' : 'xp')}</div><span class="sm" style="width:74px;text-align:right">${Math.floor(have)}/${need}</span></div>`;
function showTown(tab) {
  endBuildMode(true); closeP(); if (tab) tTab = tab; const nx = rankRules[S.rank], st = supplyStats();
  const net = (n) => (n >= 0 ? '+' : '−') + Math.abs(n).toFixed(1), days = (d) => (d === Infinity ? 'stable' : `${d.toFixed(1)} days`);
  let h = tabBar([['overview', 'Haven'], ['defense', 'Defense'], ['people', 'People'], ['more', 'More']], tTab);
  if (tTab === 'overview') {
    h += `<div class="card"><b>Town policy</b><div class="row" style="gap:4px;flex-wrap:wrap;margin:4px 0">${Object.entries(POLICIES).map(([k, q]) => `<button class="act${policy() === k ? ' go' : ''}" data-pol="${k}" style="flex:1 1 45%;margin:0;padding:6px 4px;font-size:17px">${q.icon} ${q.name}</button>`).join('')}</div><div class="sm">${POLICIES[policy()].desc}</div></div>`;
    h += `<div class="card"><div style="font-size:23px">Level ${S.lvl || 1} <span class="sm">· Era ${eraOf().n}: ${eraOf().name} · threat ☠${S.threat}</span></div>`
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
  const tl = $('tLog'); if (tl) tl.onclick = showLog;
  const tt = $('tTrade'); if (tt) tt.onclick = showTrader;
  const tx = $('tExpand'); if (tx) tx.onclick = () => { if (expandTerritory()) showTown(); };
  { const ea = $('tExAuto'); if (ea) ea.onclick = () => { S.exAuto = S.exAuto === false; showTown('defense'); }; }
  { const pr = $('shPrac'); if (pr) pr.onclick = () => showShPractice(); $('ib').querySelectorAll('[data-raid]').forEach((b) => { b.onclick = () => { expSel.force = b.dataset.raid; expSel.ids = null; showExpedition(); }; }); }
  { const ca = $('crisisAct'); if (ca) ca.onclick = () => { const c = S.crisis; if (c && CRISES[c.k].act && CRISES[c.k].act()) showTown('defense'); }; }
  const tu = $('tUpg'); if (tu) tu.onclick = () => showUpgrade('rank');
  const tTi = $('tTitle'); if (tTi) tTi.onclick = backToTitle;
}
/* ---------------- 3D.79 Field Notes (owner, Nov 8): the first time a feature, a zombie type or a profession shows up, a short card
   says what it is and what to do about it. The game pauses while it is open. Every note stays readable in Guide → Field Notes. ---------------- */
const INTRO = {
  // zombies
  'z:walker': ['🧟', 'Walker', 'The common dead: slow, weak alone, dangerous in a crowd. They drift toward the town and pile up at night.', 'Fighters handle them. Close the walls so they have to break through, and keep non-fighters inside when a crowd comes.'],
  'z:crawler': ['🧟', 'Crawler', 'Drags itself along on its arms: the slowest zombie, easy to miss in the grass.', 'Not a big threat on its own, but it reaches people who think the coast is clear. Look before sending workers out.'],
  'z:runner': ['🏃', 'Runner', 'Fast and fragile. It closes the distance before your people can get inside.', 'Guards and Police on watch catch them; walls slow them down. Don\'t leave workers far from a door at night.'],
  'z:bloated': ['🤢', 'Bloated', 'Swollen and tough. It soaks up hits and hits hard.', 'Gang up on it with two fighters. A Gas Mask or Hazmat Suit cuts its damage.'],
  'z:spitter': ['🤮', 'Spitter', 'Spits acid from a few tiles away: it hurts people who think they are safe.', 'Close in fast or shoot it first. A Gas Mask or Hazmat Suit cuts the acid damage.'],
  'z:brute': ['💪', 'Brute', 'A huge zombie that breaks walls and buildings fast and hits like a truck.', 'Focus it with your best fighters and guns. Stone walls hold it longer than wood.'],
  'z:thrower': ['🪨', 'Thrower', 'Stands back and lobs rubble from about four tiles away. Slow, but it hits hard.', 'Rush it between throws, or outrange it with rifles. Walls block its line.'],
  'z:sporehead': ['🍄', 'Sporehead', 'A fungus-headed brawler: every attack is a three-hit combo.', 'Keep your distance between its combos, or fight it with ranged weapons.'],
  'z:screamer': ['😱', 'Screamer', 'Throws its head back and shrieks: hurts everyone close and calls more zombies.', 'Kill it from range before it screams, and don\'t let your people bunch up near it.'],
  'z:riot': ['🛡️', 'Riot Zombie', 'Still wearing riot gear: blades and knives do half damage.', 'Use blunt weapons or guns on it.'],
  'z:burnt': ['🔥', 'Burnt Zombie', 'Smouldering: it sets buildings it hits on fire.', 'Keep it away from buildings. A Firefighter Coat puts fires out faster, and rain helps.'],
  'z:lasher': ['🪢', 'Lasher', 'Gaunt, with arms far too long: it hooks a survivor with a gun, bow or crossbow from up to 2 tiles away, drags them in and paralyses them for about 8 seconds.', 'Kill it first. Keep melee fighters near your shooters; Guards often brace and hold their ground.'],
  'z:rotbomb': ['💥', 'Rotbomb', 'A swollen clown full of rot: it bursts when it dies and hurts everyone and every wall close by, zombies too.', 'Shoot it at range or let it die outside the walls. Gas masks halve the damage.'],
  'z:dog': ['🐕', 'Infected Dog', 'Fast and low: it goes for workers out at the trees and rocks.', 'Gather in pairs, keep a fighter nearby, and walls keep it out.'],
  'z:alpha': ['👑', 'The Alpha', 'Leads the horde: zombies near it move 20% faster.', 'Kill it and the horde breaks. Use Focus the boss on it.'],
  'z:raider': ['🏴', 'Raiders', 'People, not zombies: they slip in through the gate, steal supplies, start fires and run.', 'Police Officers spot and hit raiders best. Keep fighters near the stores and gate; a beaten raider drops what they took.'],
  'boss:mutant': ['☠', 'Boss: Mutant Zombie', 'A huge mutant leading a mob. While it lives, no other zombies join the night.', 'Kill the boss and the night goes quiet. Traps, a Noise Lure and Focus the boss all help. Scouts warn you at noon on boss days.'],
  'boss:bloater': ['☠', 'Boss: Bloater Queen', 'A slow, enormous bloated boss with a lot of health.', 'Wear it down from range; keep fighters spread out.'],
  'boss:stalker': ['☠', 'Boss: Stalker', 'A fast boss that hunts lone survivors.', 'Keep everyone inside or in groups and bring it down with several fighters at once.'],
  'boss:butcher': ['☠', 'Boss: The Butcher', 'A brute boss that hits harder than anything else.', 'Don\'t trade blows with it alone. Traps, walls and guns.'],
  // professions
  'job:Guard': ['🛡️', 'Guard', 'A tough wall-holder: 20% more HP and takes 20% less damage.', 'Put Guards on guard posts and at the gate. Every town needs at least two fighters.'],
  'job:Police Officer': ['👮', 'Police Officer', 'A ranged specialist: shoots further, spots sneaking raiders sooner and hits raiders harder.', 'Give them a gun, and keep ammo coming.'],
  'job:Scavenger': ['🎒', 'Scavenger', 'Fights a little and brings in scrap and wood: runs the Scrapyard and Lumber Camp.', 'Send them on expeditions and to the wrecks around town.'],
  'job:Medic': ['⚕️', 'Medic', 'Patches people up in the field and gets the downed back on their feet.', 'Keep one near the fighting. Care is slower without a Medic on staff.'],
  'job:Engineer': ['🔧', 'Engineer', 'Researches at the Workbench and Workshop, and digs stone at the Quarry. Builds and repairs fastest.', 'Staff the Workshop to unlock gear and buildings.'],
  'job:Mechanic': ['⚙️', 'Mechanic', 'Runs the machines: the Generator (burns a quarter less fuel), Fuel Still, Ammo Bench and Factory, and the Electric Pump.', 'Without a Mechanic those buildings run at a quarter. One Mechanic per machine building is ideal.'],
  'job:Farmer': ['🌾', 'Farmer', 'Grows food and draws water: Garden Plots, Farms, Rain Collectors, Wells and the Greenhouse.', 'Food and water first: a hungry town stops growing and people leave.'],
  'job:Cook': ['🍳', 'Cook', 'Makes every meal at the Canteen more filling: rations go further.', 'One Cook on shift saves a lot of food in a big town.'],
  'job:Civilian': ['🙂', 'Civilian', 'No profession yet: fills any job at a bit less than the right worker, and carries twice the load.', 'Give them a profession from the survivor panel when the town needs one.'],
  // features
  'f:night': ['🌙', 'Nights', 'At dusk a horde comes in three waves: the big one first, then two smaller pushes. Kill them all and the night goes quiet.', 'Get people inside before dark, keep fighters at the walls, and heal up during the day.'],
  'f:down': ['🩸', 'Downed survivors', 'A survivor knocked to 0 HP is down: they bleed out unless someone carries them to medical care in time.', 'Tap Send rescue on the alert. A medical building and a Medic give them much longer.'],
  'f:boss': ['☠', 'Boss night', 'Scouts saw a boss gathering a horde. It attacks tonight at 21:00.', 'Re-arm traps, set a Noise Lure, give the gunners ammo, and get the hurt healed: build a Medical Tent (hurt fighters go there by themselves before dark; beds heal up to 75% too). Anyone knocked down in the fight: tap them, then Bandage or Send rescue.'],
  'f:rank': ['🏡', 'Levelling up the Haven', 'The Haven grows through 20 levels. Each level needs enough people living here and enough buildings standing; then you press Upgrade and the work takes a while (3x faster while you play).', 'Upgrading unlocks buildings and room for more people, but raises the zombie threat ceiling too. Upgrade when you are ready.'],
  'f:ceiling': ['☠', 'The threat ceiling', 'Zombies grow tougher every day, but only up to a ceiling set by your Haven level.', 'If the nights feel too hard, hold off on the next upgrade and build up first.'],
  'f:explore': ['🧭', 'Expeditions', 'Send a squad out to scavenge places on the map: food, scrap, medicine, fuel, ammo, and sometimes survivors.', 'Higher risk brings more loot and more danger. Always keep a fighter at home.'],
  'f:power': ['⚡', 'Power', 'Generators burn fuel and each gives 4 power. Powered buildings take it in order: water first, the Ammo Factory last.', 'Keep fuel coming (Gas Station trips, wrecks, a Fuel Still). Food and water never depend on power.'],
  'f:ammo': ['🔸', 'Ammo', 'Guns now use rounds from the town stock (the 🔸 count). Out of ammo, a gunner clubs with the empty gun.', 'A Mechanic at an Ammo Bench makes about 16 rounds a day. Crossbows and melee never need ammo.'],
  'f:traps': ['🔺', 'Traps', 'Spike Strips, Barbed Wire and (rank 3) the Noise Lure go on any open ground, inside or outside the walls: best on the paths zombies come along.', 'They wear out: re-arm them with scrap before the night, especially on boss days.'],
  'f:convoy': ['🚚', 'The comeback convoy', 'When the town is down to its last few people, a convoy sometimes finds it with help and supplies.', 'Use the second chance: food and water first, then beds.'],
  'f:fire': ['🔥', 'Fire', 'A burning building spreads fire and stops working.', 'People rush to put it out; a Firefighter Coat helps. Burnt buildings can be repaired.'],
  'f:trader': ['🛒', 'The trader', 'A travelling trader visits by day with goods to swap.', 'Trade spare food or water for what you lack. They leave at dusk.'],
};
const introOff = () => !!S.introOff || (/[?&]test=/.test(location.search) && !window.ZH_INTRO);
function intro(key) {   /* show a Field Note once per game */
  S.intro = S.intro || {}; if (S.intro[key]) return false; const d = INTRO[key] || (key.startsWith('b:') && DEFS[key.slice(2)] && [ '🏗️', DEFS[key.slice(2)].name, BDESC[key.slice(2)] || '', 'Tap it to see how it is doing, who works there and what it needs.' ]); if (!d) return false;
  S.intro[key] = S.day || 1; if (introOff()) return true;
  let pic = '';   /* 3D.102: a new zombie gets its picture, seen from the game's iso angle, in the middle of the card */
  if (key.startsWith('z:') || key.startsWith('boss:')) { try { const zi = window.ZH3D && ZH3D.zombieIso, bk = key.startsWith('boss:') && (BOSS_KINDS[key.slice(5)] || BOSS_KINDS.mutant), u = zi && (bk ? zi(bk.look, true) : zi(key.slice(2))); if (u) pic = `<div style="text-align:center;margin:-4px 0 6px"><img src="${u}" alt="" style="width:170px;height:170px;object-fit:contain;filter:drop-shadow(0 6px 4px rgba(0,0,0,.35))"></div>`; } catch (e) { pic = ''; } }
  showEventPopup({ title: `${d[0]} NEW: ${d[1].toUpperCase()}`, text: `${pic}<div style="text-align:left"><b>What it is</b><br>${d[2]}<br><br><b>What to do</b><br>${d[3]}</div><div class="sm" style="margin-top:8px">Field Notes keeps every note: Guide → Field Notes.</div>`,
    buttons: [{ label: 'Got it' }, { label: 'No more tips', fn: () => { S.introOff = true; say('Tips are off. Turn them back on in Guide → Field Notes.', true); } }] });
  return true;
}
/* 3D.102 the opening cutscene of a new game (owner): four survivors run off the north-east highway with two zombies on their heels,
   lose them, find a broken-down farm (a 5x5 wood fence with gaps) in the middle of the map, see the scrap lying around and put the
   camp up there. The camera follows them zoomed in; the HUD is hidden behind letterbox bars; Skip jumps straight to the built camp. */
const CUT_FENCE = (() => { const o = [], x0 = 12, y0 = 15;   /* around the camp site (STARTS hq 8,11 + OFF = 14,17) */ for (let i = 0; i < 5; i++) { o.push([x0 + i, y0], [x0 + i, y0 + 4]); if (i > 0 && i < 4) o.push([x0, y0 + i], [x0 + 4, y0 + i]); } return o; })();
const CUT_GAP = new Set(['14,15', '15,15', '16,17']);   /* the way in (north, facing the highway) and a section blown out on the east */
const CUT_RUBBLE = new Set(['12,18', '13,19']);   /* fallen panels: rubble anyone can cross */
const CUT_SPOT = [[14.6, 16.4], [13.5, 16.5], [15.6, 16.2], [13.4, 17.6]].map(([x, y]) => ({ x, y }));   /* Marcus, Amy, Lena, Ben: just north of the camp site */
const CUT_LINES = {
  run: [[2, "Don't stop! They're right behind us!", 'shout'], [0, 'Keep moving! We need a place to hide!', 'shout'], [3, "I can't... my legs are done!", 'talk'], [1, "The whole world's turning to shit...", 'talk'], [2, "They're slow off the road. Keep going and we lose them!", 'shout']],
  farm: [[2, "Look! An old farm. The fence is half down, but it's something.", 'talk'], [0, "We lost them. A fence, open ground, a road out... we can settle here.", 'talk'], [3, "Soil's still good. I could grow something here.", 'talk'], [1, "And there's scrap lying all over the place. Enough to build a camp.", 'talk'], [0, "Then this is it. Let's build.", 'shout']],
  done: [[1, 'Home. For now.', 'talk'], [0, "Rest while you can. They'll come at night.", 'talk']],
};
function clearDoorways() {   /* 3D.120 owner's video: the old farm fence ran across the Camp's doorway, so tired people walked up, failed to get in, and shuffled in front of it forever. Nothing but a gate may stand on a building's doorway */
  let n = 0; for (const b of world.buildings) { const t = Wd.approachTile(b), k = t.x + ',' + t.y, w = world.walls.get(k); if (w && w.type !== 'gate') { world.walls.delete(k); n++; } } if (n) Wd.bump(world); return n; }
function cutFence() {   /* the broken farm fence: placed on any new game (with or without the cutscene) */
  const door = new Set(world.buildings.map((b) => { const t = Wd.approachTile(b); return t.x + ',' + t.y; }));
  for (const [x, y] of CUT_FENCE) { const k = x + ',' + y; if (CUT_GAP.has(k) || door.has(k) || world.walls.has(k) || Wd.buildingAt(world, x, y)) continue; const def = Wd.WALL_DEFS.wood, h = (x * 7 + y * 13) % 5;
    const hp = CUT_RUBBLE.has(k) ? 0 : Math.round(def.hp * (h < 2 ? .45 : h < 4 ? .7 : 1)); world.walls.set(k, { x, y, type: 'wood', hp, max: def.hp, ...(CUT_RUBBLE.has(k) ? { broken: true } : {}) }); }
  Wd.bump(world); for (const q of S.sv) if (q.w && solidWall(q.w.x, q.w.y)) { const t = Wd.nearestWalkable(world, Math.floor(q.w.x), Math.floor(q.w.y)); if (t) q.w = { x: t.x + .5, y: t.y + .5 }; }   /* 3D.106: nobody starts inside the fence line */
}
const cutZoom = () => Math.max(.7, Math.min(1.1, VW / 430)) * ((1.25));
function cutStart() {
  const C = S.cut = { ph: 'run', t: 0, line: 0, lineT: 0, cx: 0, cy: 0, hq: null, z0: cutZoom() };
  const hi = world.buildings.findIndex((b) => b.type === 'hq'); if (hi >= 0) C.hq = world.buildings.splice(hi, 1)[0]; Wd.bump(world);
  const crew = S.sv.slice(0, 4), y = Wd.HWY_Y + .5;
  crew.forEach((q, i) => { q.w = { x: 33.2 + i * .9 + (i % 2) * .3, y: y + (i % 2 ? 1 : .2) }; q.mode = 'cutRun'; q.path = null; q.dest = null; q.moving = true; q.cutWp = 0; q.pv = { ...q.w }; });
  C.zs = [[37.6, y + .3, 'runner'], [39.2, y + 1.1, 'runner']].map(([x, yy, t]) => { spawn(x, yy, t); const z = S.z[S.z.length - 1]; z.w = { x, y: yy }; z.mode = 'zchase'; z.stateTicks = 0; z.cut = true; z.siege = false; return z; });
  C.cx = 34.5; C.cy = y + .5; centerOn(C.cx, C.cy, C.z0 * 1.85);
  document.getElementById('app').classList.add('cutMode'); cutUi(true);
}
function cutUi(on) {
  let el = document.getElementById('cutBox');
  if (!on) { if (el) el.remove(); document.getElementById('app').classList.remove('cutMode'); return; }
  if (!document.getElementById('cutCss')) { const st = document.createElement('style'); st.id = 'cutCss'; st.textContent = `#app.cutMode #plaque,#app.cutMode #quest,#app.cutMode #adv,#app.cutMode #lmenu,#app.cutMode #gauge,#app.cutMode #btnHome,#app.cutMode #zoom,#app.cutMode #alerts,#app.cutMode #bottom,#app.cutMode #requestBox,#app.cutMode #nudge{display:none!important}
#cutBox{position:fixed;inset:0;z-index:60;pointer-events:auto;touch-action:none}#cutBox .bar{position:absolute;left:0;right:0;height:11vh;background:#0d0a07;border-radius:0;transition:height .6s}#cutBox .bar.t{top:0}#cutBox .bar.b{bottom:0;height:15vh}
#cutBox .sub{position:absolute;left:0;right:0;bottom:3vh;padding:0 max(16px,env(safe-area-inset-left,0px));text-align:center;font:600 clamp(15px,2.4vw,21px)/1.3 system-ui,sans-serif;color:#f3e6c8;text-shadow:0 2px 0 #000;min-height:2.6em}#cutBox .sub b{color:#f0b84a}
#cutBox .ttl{position:absolute;top:2.6vh;left:0;right:0;text-align:center;font:800 clamp(14px,2vw,18px)/1 system-ui,sans-serif;letter-spacing:.2em;color:#bfae8a;text-transform:uppercase}
#cutBox .skip{position:absolute;right:max(14px,env(safe-area-inset-right,0px));top:calc(11vh + 10px);background:rgba(13,10,7,.75);color:#f3e6c8;border:1.5px solid #6d5a3c;border-radius:8px;padding:7px 14px;font:700 14px system-ui,sans-serif;cursor:pointer}
#cutBox.out .bar{height:0}#cutBox.out .sub,#cutBox.out .ttl,#cutBox.out .skip{opacity:0;transition:opacity .4s}`; document.head.appendChild(st); }
  if (!el) { el = document.createElement('div'); el.id = 'cutBox'; el.innerHTML = `<div class="bar t"></div><div class="bar b"></div><div class="ttl">${esc(S.townName || 'Zombie Haven')} · Day 1</div><div class="sub" id="cutSub"></div><button class="skip" id="cutSkip">Skip ▸▸</button>`; document.body.appendChild(el); el.querySelector('#cutSkip').onclick = (e) => { e.stopPropagation(); cutEnd(true); }; }
}
function cutSay(set) {   /* the next line of this phase, once the last one has had time to be read; returns true when the phase's lines are done */
  const C = S.cut, L = CUT_LINES[set]; if (C.lineT > 0) { C.lineT--; return false; } if (C.line >= L.length) return true;
  const [who, t, st] = L[C.line++], q = S.sv[who]; for (const o of S.sv) if (o.bark && o.bark.pri === 3) o.bark = null; if (q) { const f = Math.min(250, 100 + t.length * 2.5); q.bark = { t: GLASS ? t : t.toUpperCase(), st, f, f0: f, pri: 3 }; q.emo = null; C.lineT = f - 30; const sb = document.getElementById('cutSub'); if (sb) sb.innerHTML = `<b>${esc(q.name)}:</b> ${esc(t)}`; }
  return false;
}
function cutTick() {
  const C = S.cut; C.t++; const crew = S.sv.slice(0, 4);
  for (const q of S.sv) if (q.bark && --q.bark.f <= 0) q.bark = null;
  const rampTop = { x: Wd.HWY_RAMP_X + 1, y: Wd.HWY_Y + 1.5 }, rampBot = { x: Wd.HWY_RAMP_X + .9, y: Wd.HWY_Y + 5.4 };
  if (C.ph === 'run') {
    let home = 0;
    crew.forEach((q, i) => { const wp = [{ x: rampTop.x + (i % 2) * .5 + i * .25, y: rampTop.y - (i % 2) * .7 }, { x: rampBot.x + (i % 2) * .5, y: rampBot.y + i * .2 }, CUT_SPOT[i]];
      if (q.cutWp >= wp.length) { q.moving = false; q.mode = 'cutIdle'; home++; return; }
      const r = q.cutWp < 2 ? (stepToward(q, wp[q.cutWp], .03 - i * .0012 + (i === 3 ? -.001 : 0)) ? 'arrived' : 'moving') : followPath(q, wp[2], .05 - (i === 3 ? .002 : 0));
      if (r === 'arrived' || (q.cutWp < 2 && dist(q.w, wp[q.cutWp]) < .25)) q.cutWp++; else if (r === 'fail') { q.w = { ...wp[2] }; q.cutWp = 3; } });
    const lead = crew.reduce((a, q) => (q.w.x < a.w.x ? a : q), crew[0]), back = crew.reduce((a, q) => (q.w.x > a.w.x ? a : q), crew[0]), off = crew.every((q) => q.cutWp >= 2);
    for (const z of C.zs) { if (z.hp <= 0) continue; if (!off) { z.mode = 'zchase'; z.target = back; stepToward(z, { x: back.w.x + 1.3, y: back.w.y + (z === C.zs[0] ? -.2 : .5) }, .022 + (z === C.zs[0] ? .002 : 0)); } else { z.mode = 'idle'; z.target = null; z.moving = false; } }
    cutSay('run'); if (home === crew.length) { C.ph = 'farm'; C.line = 0; C.lineT = 40; C.t = 0; }
  } else if (C.ph === 'farm') { crew.forEach((q) => { q.moving = false; }); if (cutSay('farm')) { C.ph = 'build'; C.t = 0; crew.forEach((q, i) => { q.mode = 'hammer'; q.path = null; q.cutGo = i; }); SFX('build'); } }
  else if (C.ph === 'build') {
    const b = C.hq, site = b ? [{ x: b.x - .45, y: b.y + .5 }, { x: b.x + b.w + .45, y: b.y + 1 }, { x: b.x + 1, y: b.y - .45 }, { x: b.x + .3, y: b.y + b.h + .45 }] : CUT_SPOT;
    crew.forEach((q, i) => { const r = followPath(q, site[i], CHASE); if (r !== 'moving') q.moving = false; });
    if (C.t % 50 === 0 && b) floats.push({ w: { x: b.x + 1, y: b.y + 1 }, t: '🔨', col: '#f0d9a0', a: 50 });
    const sb = document.getElementById('cutSub'); if (sb && C.t === 1) sb.innerHTML = '<b>Building the camp…</b>';
    if (C.t >= 330) { cutPlaceHq(); C.ph = 'done'; C.t = 0; C.line = 0; C.lineT = 50; crew.forEach((q) => { q.mode = 'cutIdle'; q.moving = false; q.path = null; }); }
  } else if (C.ph === 'done') { if (cutSay('done') && C.t > 60) { C.ph = 'out'; C.t = 0; const bx = document.getElementById('cutBox'); if (bx) bx.classList.add('out'); } }
  else if (C.ph === 'out') { if (C.t >= 70) return cutEnd(false); }
  /* camera: follows the middle of the group, a little ahead of them; zooms back out at the end */
  const cx = crew.reduce((a, q) => a + q.w.x, 0) / crew.length, cy = crew.reduce((a, q) => a + q.w.y, 0) / crew.length, k = C.ph === 'run' ? .06 : .03;
  const lx = C.ph === 'run' ? -1.2 : 0, ly = C.ph === 'run' ? .4 : .5; C.cx += (cx + lx - C.cx) * k; C.cy += (cy + ly - C.cy) * k;
  const zt = C.ph === 'out' ? C.z0 : C.ph === 'run' ? C.z0 * 1.85 : C.z0 * 2.05; cam.z += (zt - cam.z) * (C.ph === 'out' ? .08 : .02); centerOn(C.cx, C.cy);
}
function cutPlaceHq() {
  const C = S.cut; if (!C || !C.hq) return; if (!world.buildings.includes(C.hq)) world.buildings.push(C.hq); Wd.bump(world);
  (window.ZH_BURSTS ||= []).push({ x: C.hq.x + C.hq.w / 2, y: C.hq.y + C.hq.h / 2, t: performance.now() }); SFX('reward'); banner('⛺ THE CAMP IS UP'); C.hq = null;
}
function cutEnd(skip) {
  const C = S.cut; if (!C) return; cutPlaceHq(); const crew = S.sv.slice(0, 4);
  crew.forEach((q, i) => { if (skip || !Wd.walkable(world, Math.floor(q.w.x), Math.floor(q.w.y))) q.w = { ...CUT_SPOT[i] }; q.pv = { ...q.w }; q.mode = 'free'; q.moving = false; q.path = null; q.dest = null; q.bark = null; q.cutWp = undefined; q.stateTicks = 30 + i * 20; });
  for (const z of C.zs || []) if (z.hp > 0) { z.cut = false; z.mode = 'zleave'; z.retreat = true; z.target = null; z.path = null; z.leaveTo = tc(Wd.COLS - 1, Wd.HWY_Y + (z === C.zs[0] ? 0 : 1)); if (skip) z.hp = 0; }
  S.cut = null; cutUi(false); cam.z = C.z0; centerOn(7.5 + OFF, 10 + OFF); updateZoomLabel();
  spawn(5 + OFF, 3 + OFF, 'walker'); spawn(9 + OFF, 3 + OFF, 'crawler'); spawn(12 + OFF, 4 + OFF, 'walker');
  if (!S.mission) beginMission(); say('Day 1. Build up the camp before night falls.'); saveGame(); ui();
}
const INTRO_B = ['generator', 'fuelstill', 'ammobench', 'ammofactory', 'pump', 'greenhouse', 'coldstore', 'radio', 'armory', 'workshop', 'barracks', 'hospital', 'quarry', 'lumber'];
function introTick() {   /* every few seconds: what is new on screen? */
  if (tick % 60) return; S.intro = S.intro || {};
  if (S.day <= 1 && S.hour < 9) for (const q of S.sv) S.intro['job:' + q.job] = S.intro['job:' + q.job] || 1;   /* the starting crew needs no introduction */
  for (const z of S.z) if (z.hp > 0 && !z.zoo && z.mode !== 'appear') { if (z.type === 'boss') { if (intro('boss:' + (z.bk || 'mutant'))) return; } else if (intro('z:' + z.type)) return; }
  for (const q of S.sv) if (intro('job:' + q.job)) return;
  for (const b of world.buildings) if (INTRO_B.includes(b.type) && intro('b:' + b.type)) return;
  if (isNight() && intro('f:night')) return;
  if (S.sv.some((q) => q.mode === 'down') && intro('f:down')) return;
  if (S.day === S.nextBoss && S.hour >= 12 && S.hour < 21 && intro('f:boss')) return;
  if (rankConds() && S.day >= 2 && intro('f:rank')) return;
  if ((S.rank || 1) >= 2 && intro('f:ceiling')) return;
  if (S.day >= 2 && Object.keys(EXP_DEFS).some((k) => !expLocked(k)) && intro('f:explore')) return;
  if (gens().length && intro('f:power')) return;
  if (gunners().length && intro('f:ammo')) return;
  if ((S.rank || 1) >= 2 && intro('f:traps')) return;
  if ((S.convoys || 0) > 0 && intro('f:convoy')) return;
  if (world.buildings.some((b) => b.fire) && intro('f:fire')) return;
  if (S.trader && intro('f:trader')) return;
}
function fieldNotesHtml() {
  const seen = Object.keys(S.intro || {}).filter((k) => INTRO[k] || k.startsWith('b:'));
  const rows = seen.map((k) => { const d = INTRO[k] || ['🏗️', DEFS[k.slice(2)] ? DEFS[k.slice(2)].name : k, BDESC[k.slice(2)] || '', '']; return `<details class="card"><summary style="font-size:19px;color:var(--gold)">${d[0]} ${d[1]}</summary><div style="margin-top:4px">${d[2]}${d[3] ? '<br><b>Tip:</b> ' + d[3] : ''}</div></details>`; }).join('');
  return `<div class="card"><b>📓 Field Notes</b> <span class="sm">${seen.length} found</span><br><button class="act" id="gTips">${S.introOff ? 'Turn tips back on' : 'Turn tips off'}</button></div>` + (rows || '<div class="sm">Nothing yet: notes appear as you meet new zombies, people and buildings.</div>');
}
const GUIDE_TXT = [
  ['Moving around', 'Drag to look around, pinch to zoom. ⌖ jumps back to the town. 1× / 2× / 3× changes the game speed.'],
  ['Building', 'Build → pick a building → Build. Tap the ground where its front corner goes, nudge it with the arrows, ↻ turns it so the entrance faces the other way, then tap Build. Buildings cost wood, scrap and (later) stone, and a little scrap upkeep each day.'],
  ['Food and water', 'Everyone eats a daily ration: half food, half water. Rain Barrels and Collectors make water, Garden Plots make food. Watch the Town panel to see how many days you have left.'],
  ['Workers', 'Buildings with a work slot are staffed automatically by the right job (Farmer, Engineer, Medic, Cook…). A green dot means someone is on shift.'],
  ['Walls', 'Build → Defend → Wood Fence (camp), Log Palisade (Lodge), Stone Wall (Fort) or Gate, then tap tiles around the town. Build a stronger wall on a weaker one to upgrade it. Close every gap to SEAL the perimeter. Broken walls turn to rubble and are repaired with scrap.'],
  ['Fighting', 'Guards, Police and Scavengers fight. Everyone else runs inside when zombies come. A survivor knocked down bleeds out unless someone carries them to a medic in time, or a Medic treats them where they fell.'],
  ['Running the town', 'The goal is a bigger town with more people. Beds give people somewhere to sleep, but the town\'s rank limits how many it can take in (8 at rank 1, +4 each rank, +2 per territory), so upgrade the town to grow. An upgrade needs enough people living here and enough buildings standing; you choose when to press Upgrade. The horde grows a little every day, whatever you build; each town upgrade brings a newcomer, supplies and healing. Newcomers come sooner to a town with spare beds, food and water. Hungry or thirsty people work at 70% and hit softer, and after two days with an empty store people start leaving. When someone is down, nobody walks into zombies on their own: tap Send rescue on the alert and fighters clear the way. When a boss comes, tap Focus the boss and every fighter goes for it together (+30% damage).'],
  ['Professions', 'Guards are tough wall-holders (+20% HP, take 20% less damage). Police Officers shoot further, spot sneaking raiders sooner and hit raiders harder. Scavengers loot and fetch wood and scrap. Medics patch people up in the field (to 60%) and get the downed back up Wounded; a medical building heals the rest. Engineers build and repair fastest. Cooks stretch every ration. Farmers grow food and water. Mechanics run the Generator, Fuel Still, Ammo Bench and Factory and the Electric Pump. Civilians fill any job and carry twice the load. Someone in the wrong job works at 75%.'],
  ['Gear', 'Tap a survivor → Gear to equip weapons, armor and accessories from the stash. The Armory, crafting, the trader and expeditions give new gear.'],
  ['Explore', 'Send a squad out from the Explore button. Trips run in real time, even while the game is closed. Losses are permanent.'],
  ['Renown and levels', 'Building, goals and victories earn Renown. The Haven grows through 20 levels in four eras (the last is the City, from level 16). A level needs enough people living here and enough buildings standing; you press Upgrade and it takes a while (faster while you play). Levels unlock buildings, room for more people, more land and more storage. Going from level 5 to 6 and 10 to 11 needs a Banner: clear a stronghold, defeat or ally with a faction, or finish a civic project.'],
  ['The threat ceiling', 'Zombies grow tougher every day, but only up to a ceiling set by your Haven level (levels 1-3: day 9, 4-6: day 14, 7-9: day 20, 10-12: day 28, 13-15: day 38, then slowly beyond). Levelling up raises the ceiling, so upgrade when you are ready for it.'],
  ['Power', 'Generators burn fuel (a Mechanic on shift saves a quarter) and each gives 4 power. The Electric Pump, Cold Store, Greenhouse lamps, Hospital surgery, Radio Tower and Ammo Factory draw power: water first, the Ammo Factory last. Food and water never depend on power: a pump without power still works by hand.'],
  ['Ammo', 'Guns use rounds from the town stock (the 🔸 count). Crossbows and melee never do. Out of ammo, a gunner clubs with the empty gun. A Mechanic at an Ammo Bench makes about 16 rounds a day; a powered Ammo Factory about 64. Raiders and the Military Checkpoint drop rounds.'],
  ['Traps', 'Build → Defend: Spike Strips, Barbed Wire and the Noise Lure go on any open ground, inside or outside the walls; the paths zombies come along are best. They wear out: re-arm them with scrap before the night. Scouts warn you at noon when a boss is coming.'],
];
function showGuide() {
  endBuildMode(true); closeP();
  $('ib').innerHTML = `<details class="card"><summary style="font-size:21px;color:var(--gold)">📓 Field Notes</summary><div style="margin-top:6px">${fieldNotesHtml()}</div></details>` + GUIDE_TXT.map(([t, x], i) => `<details class="card"${i === 0 ? ' open' : ''}><summary style="font-size:21px;color:var(--gold)">${t}</summary><div style="margin-top:4px">${x}</div></details>`).join('') + `<button class="act" id="gGoals">🎯 Goals</button><button class="act" id="gLog2">📜 Event log</button><div class="sm" style="margin-top:8px">V${VERSION}</div>`;
  showPanel('Guide'); $('gGoals').onclick = showGoals; $('gLog2').onclick = showLog; { const tb = $('gTips'); if (tb) tb.onclick = () => { S.introOff = !S.introOff; showGuide(); }; }
}
/* V2.20 tabbed panels */
let UIM = null; const uiIconCache = {};
/* V2.47 stat and need icons (assets/ui/stats.png, tools/art/build_stat_icons.py): 16-px pixel art; until the sheet exists, short text */
const SI_NAMES = ['str', 'agi', 'int', 'end', 'per', 'cha', 'hunger', 'thirst', 'fatigue'], SI_LABEL = { str: 'Strength', agi: 'Agility', int: 'Intelligence', end: 'Endurance', per: 'Perception', cha: 'Charisma', hunger: 'Hunger', thirst: 'Thirst', fatigue: 'Tired' }, SI_TEXT = { str: 'STR', agi: 'AGI', int: 'INT', end: 'END', per: 'PER', cha: 'CHA', hunger: 'Hunger', thirst: 'Thirst', fatigue: 'Tired' }, siCache = {};
function SI(k) {
  if (GLASS && window.ZHIcons) { const n = { str: 'strong', agi: 'speed', int: 'research', end: 'heart', per: 'search', cha: 'chat', hunger: 'food', thirst: 'water', fatigue: 'sleep' }[k]; if (n) return `<span class="si zi-si" data-si="${k}" title="${SI_LABEL[k]}">${ZHIcons.svg(n, 22)}</span>`; }
  if (siCache[k] !== undefined) return siCache[k]; const im = IMG.statIcons, i = SI_NAMES.indexOf(k); if (i < 0 || !okImg(im)) return `<span class="siT" data-si="${k}">${SI_TEXT[k] || k}</span>`;
  const c = document.createElement('canvas'), Z = 2; c.width = c.height = 16 * Z; const g = c.getContext('2d'); g.imageSmoothingEnabled = false; g.drawImage(im, i * 16, 0, 16, 16, 0, 0, 16 * Z, 16 * Z);
  return (siCache[k] = `<img class="pix si" data-si="${k}" src="${c.toDataURL()}" alt="${SI_LABEL[k]}" title="${SI_LABEL[k]}">`);
}
function wireSI(root) { root.querySelectorAll('[data-si]').forEach((e) => { e.onclick = (ev) => { ev.stopPropagation(); say(SI_LABEL[e.dataset.si] || e.dataset.si); }; }); }
function uiIcon(name) {   /* V2.32: DV2-style menu icons (assets/ui/icons.png), 2x crisp */
  if (GLASS && window.ZHIcons) { const n = { living: 'home', care: 'medic', train: 'train', defend: 'shield', road: 'road', demolish: 'demolish', events: 'bang', trader: 'shop', rating: 'star', supplies: 'box' }[name]; if (n) return `<span class="ti zi-ti">${ZHIcons.svg(n, 24)}</span>`; }   /* 3D.28 Glass: sticker icons, no pixel art */
  if (uiIconCache[name] !== undefined) return uiIconCache[name]; const im = IMG.uiIcons, i = UIM ? UIM.icons.indexOf(name) : -1; if (i < 0 || !okImg(im)) return '';
  const n = UIM.n, Z = 2, c = document.createElement('canvas'); c.width = c.height = n * Z; const g = c.getContext('2d'); g.imageSmoothingEnabled = false; g.drawImage(im, i * n, 0, n, n, 0, 0, n * Z, n * Z);
  return (uiIconCache[name] = `<img class="pix ti" src="${c.toDataURL()}" alt="">`);
}
function tabBar(list, cur) { return `<div class="tabs">${list.map(([k, l, ic]) => `<button data-tab="${k}" class="${k === cur ? 'on' : ''}">${ic ? uiIcon(ic) : ''}${l}</button>`).join('')}</div>`; }
/* V2.35 building status: one place that says what a building is doing and why, used by its panel and the resource panel */
function staffNote(b) {   // explicit staffing wording, from the real rule: only the listed professions can staff it; without one it runs at base output
  const d = DEFS[b.type], jobs = STAFF_JOBS[d.fam] || []; if (!d.slot || b.staff) return '';
  const have = S.sv.filter((q) => jobs.includes(q.job)), free = have.filter((q) => !q.post && q.hp > 0 && !['down', 'hospital', 'away', 'errand'].includes(q.mode));
  if (!have.length) return `No ${jobs.join(' or ')} in town. It runs at base output; change a survivor's profession (People → survivor → Profession) to staff it.`;
  if (!free.length) return `No ${jobs.join(' or ')} free: ${have.map((q) => esc(q.name) + (q.post ? ' works at the ' + DEFS[q.post.type].name : q.mode === 'away' ? ' is on an expedition' : ' is recovering')).join(', ')}.`;
  return `${esc(free[0].name)} (${free[0].job}) will take it shortly.`;
}
function bOutput(b) {   // expected per-day output and inputs (same formulas as the simulation, with the worker's measured share of the day)
  const d = DEFS[b.type], m = expectedMult(b), o = { out: [], use: [] };
  if (d.fam === 'water') o.out.push(['💧', d.out * m, '']); if (d.fam === 'farm') { o.out.push(['🍖', d.out * m, '']); o.use.push(['💧', d.waterUse, '🌱']); }
  if (d.fam === 'scrap') o.out.push(['⚙', d.out * m * (researched('salvage') ? 1.25 : 1), '']); if (d.fam === 'research') o.out.push(['🔬', (d.out * workShare(b) + 4 * (1 - workShare(b))) * prodMult(b, false), 'research points']);
  const u = upkeepOf(b); if (u > 0) o.use.push(['⚙', u, '🔧']); return o;
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
  const tabs = [['overview', 'Info'], ['details', 'Details']]; if (isT(b, 'workshop')) tabs.push(['research', 'Research'], ['craft', 'Craft']);
  if (!tabs.some(([k]) => k === bTab)) bTab = 'overview';
  const jobs = STAFF_JOBS[d.fam] || [], cb = combos(b);
  const out = d.fam === 'lumber' || d.fam === 'quarry' ? `${d.fam === 'lumber' ? '🪵' : '🪨'} <b>+${(d.out * prodMult(b)).toFixed(1)}</b> ${d.fam === 'lumber' ? 'wood' : 'stone'} / day` : d.fam === 'scrap' ? `⚙ <b>+${(d.out * prodMult(b) * (researched('salvage') ? 1.25 : 1)).toFixed(1)}</b> scrap / day` : d.fam === 'research' ? `🔬 <b>+${((isWorking(b) ? d.out : 4) * prodMult(b)).toFixed(1)}</b> research / day` : d.train ? `📈 Trains <b>${STAT_NAME[d.train]}</b>` : d.fam === 'water' ? `💧 <b>+${(d.out * prodMult(b)).toFixed(1)}</b> water / day` : d.fam === 'farm' ? `🍖 <b>+${(d.out * prodMult(b)).toFixed(1)}</b> food / day <span class="sm">(💧 −${d.waterUse})</span>` : r ? `🛎 ${r.label}` : '';
  const staff = d.slot ? (b.staff ? `👷 ${esc(b.staff.name)} <span class="sm">${b.staff.job} Lv.${b.staff.l} · ${isWorking(b) ? (fitOf(b, b.staff) === 'wrong' ? '−25% (wrong job)' : '+' + Math.round((fitOf(b, b.staff) === 'civ' ? .25 : workBoost(b.staff)) * 100) + '%') : 'off shift'}</span>` : `👷 <span style="color:var(--bad)">No worker</span> <span class="sm">needs ${jobs.join(' / ')}</span>`) : '';
  let h = tabBar(tabs, bTab);
  if (bTab === 'overview') {
    let status = ''; const st = bStatus(b), io = bOutput(b), sn = staffNote(b);
    if ((!b.burnt)) { const hp = bHp(b); status += `<div class="row" style="gap:8px;align-items:center"><span class="sm">Health</span><div style="flex:1;height:10px;border:2px solid var(--cocoa);border-radius:99px;background:#fff8ec;overflow:hidden"><div style="height:100%;width:${Math.round(hp / b.max * 100)}%;background:${hp / b.max > .5 ? '#7fbf5a' : hp / b.max > .25 ? '#f2b84a' : '#e8584a'}"></div></div><span class="sm">${Math.ceil(hp)}/${b.max}</span></div>`; if (hp < b.max) status += `<button class="act go" id="bFix" ${canPay(fixCost(b)) ? '' : 'disabled'}>Repair now (${costShort(fixCost(b))})</button><div class="sm">Idle Engineers also patch it up with its own materials (${Object.keys(repMix(b)).map((k) => RES_ICON[k]).join(' ')}, 1 per 12 HP).</div>`; }
    if (b.burnt) status += `${b.wrecked ? '<div style="color:var(--bad)">Wrecked by zombies</div>' : ''}<button class="act go" id="bRepair" ${canPay(repairCost(b)) ? '' : 'disabled'}>Repair (${costShort(repairCost(b))})</button>`;
    { const at = Wd.approachTile(b), blk = Wd.buildingAt(world, at.x, at.y); if (blk && blk !== b) status += `<div style="color:var(--bad)">🚪 Entrance blocked by the ${esc(DEFS[blk.type].name)}: move one of them</div>`; }   /* V2.34: older towns can still have this */
    if (DEFS[b.type].fam === 'research') status += toolsCard();   /* V3D.26 */
    if (isHousing(b) && !b.burnt) { const rs = (b.res || []).map((id) => S.sv.find((q) => q.id === id)).filter(Boolean), c = cap(b);   /* 3D.30 residents */
      status += `<div class="card"><div class="row"><b class="sp">Residents ${rs.length}/${c}</b>${rs.length < c && unhoused().length ? '<button class="act" id="hFill">Fill beds</button>' : ''}</div><div class="resRow">${rs.map((q) => `<div class="resP" data-rid="${q.id}">${portrait(q)}<span>${esc(q.name)}</span></div>`).join('')}${Array.from({ length: c - rs.length }, () => '<div class="resP empty" data-add="1"><div class="portrait">+</div><span>Empty bed</span></div>').join('')}</div><div class="sm">Only residents sleep here. Tap a bed to choose who lives here.</div></div>`; }
    if (DEFS[b.type].role === 'hq' && !b.burnt) { const n = unhoused().length, c = campCap(), over = n > c;   /* 3D.30 camp beds */
      status += `<div class="card campBeds${over ? ' over' : ''}"><div class="row"><b class="sp">Sleeping at the ${d.name}</b><b class="cbN">${n}/${c}</b></div><div class="sm">${over ? `${n - c} survivor${n - c > 1 ? 's' : ''} sleep rough (tired and unhappy). Build or upgrade housing and assign residents.` : 'Everyone without housing sleeps here.'}</div>${n ? '<button class="act" id="campHouse">Assign housing</button>' : ''}</div>`; }
    if (b.type === 'generator') status += `<div class="card"><b>⚡ ${S.power ? 'Running' : 'Off: no fuel'}</b><div class="sm">${gens().length} generator${gens().length > 1 ? 's' : ''} burn ${(gens().length * 3).toFixed(0)} fuel a day · you have ⛽ ${Math.floor(S.fuel || 0)}${S.power ? ` (about ${Math.floor((S.fuel || 0) / (gens().length * 3))} days)` : ''}.</div></div>`;
    if (b.type === 'radio') status += `<div class="card"><b>📻 ${S.won ? 'The convoy came' : S.finale ? 'Signal on air: hold out!' : radioOk() ? 'Ready to transmit' : 'No power'}</b><div class="sm">${S.won ? '' : S.finale ? `Night ${S.finale.night} of ${FINALE_NIGHTS}.` : `To call the convoy: ★5 (you: ★${S.rank}), ${LEGACY_NEED} legacy goals (${legacyDone()} done) and a running Generator${radioOk() ? ' ✓' : ''}.`}</div>${signalReady() ? '<button class="act go" id="bSignal" style="width:100%">📻 Call for the convoy</button>' : ''}</div>`;
    { const d0 = DEFS[b.type], n = d0.next && DEFS[d0.next];   /* V3D.23 upgrades */
      if (b.upg) { const u = b.upg, m = jobMiss(u); status += `<div class="card"><b>⬆ Upgrading to ${DEFS[u.to].name}</b><div class="sm">${Object.keys(m).length ? 'Waiting for ' + costShort(m) + ': builders bring it from the stockpile, idle survivors gather what is missing.' : 'All materials in: building… ' + Math.round(100 * (1 - u.cons / u.dur)) + '%'}</div><button class="act" id="bUpX">Cancel upgrade</button></div>`; }
      else if (n) { const c = upgradeCheck(b); status += `<div class="card"><b>⬆ ${n.name}</b> <span class="sm">${costShort(bCost(n))}</span><div class="sm">${esc(BDESC[n.key] || '')}</div><button class="act${c.ok ? ' go' : ''}" id="bUp" ${c.ok ? '' : 'disabled'}>${c.ok ? 'Upgrade' + (canPay(bCost(n)) ? '' : ' (start now, gather the rest)') : '🔒 ' + esc(c.why)}</button></div>`; } }
    const worker = d.slot ? (b.staff ? `<div class="row" id="bWorker" style="gap:6px;cursor:pointer"><span>👷</span><span class="sp"><b>${esc(b.staff.name)}</b> <span class="sm">${b.staff.job} Lv.${b.staff.l} · on the job ${Math.round(workShare(b) * 100)}% of the day</span></span><span style="color:var(--gold)">›</span></div>`
      : `<div>👷 <span style="color:var(--bad)">No ${(STAFF_JOBS[d.fam] || []).join(' or ')} assigned</span><div class="sm">${sn}</div></div>`) : '';
    const assignBtn = d.slot ? `<button class="act go" id="bAssign" style="margin-top:6px">👷 ${b.staff ? 'Change worker' : 'Assign a worker'}</button>` : '';
    const fmt = (l, sign) => l.map(([ic, v, what]) => `<div>${ic} <b style="color:${sign > 0 ? 'var(--good)' : '#ffb36b'}">${sign > 0 ? '+' : '−'}${f1(v)}</b> <span class="sm">${what ? what + ' ' : ''}/ day</span></div>`).join('');
    const nt = nextTier(b);
    h += `<div class="card row"><div style="width:84px;height:76px;display:flex;align-items:flex-end;justify-content:center">${bImg(b.type, 84, 76)}</div><div class="sp"><div style="color:${st.c}">● ${st.t}</div>${fmt(io.out, 1)}${fmt(io.use, -1)}${!io.out.length && out ? `<div>${out}</div>` : ''}${cb.names.length ? `<div class="sm">★ ${cb.names.length} neighbour bonus${cb.names.length > 1 ? 'es' : ''}</div>` : ''}</div></div>`
      + (worker ? `<div class="card">${worker}${assignBtn}</div>` : '') + status + (['medic', 'clinic', 'hospital'].includes(b.type) ? patientsHtml(b) : '')
      + (nt ? `<div class="sm">Better in this family: <b>${nt[1].name}</b>${nt[1].out ? ` (${nt[1].out} / day base vs ${d.out || 0})` : ''}${buildLock(nt[0]) ? ' · ' + buildLock(nt[0]).replace(/^Needs/, 'needs') : DEFS[nt[0]].up ? ' · upgrade this building' : ' · available in Build'}</div>` : '');
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
  { const fx = $('bFix'); if (fx) fx.onclick = () => { const c = fixCost(b); if (!canPay(c)) return; payCost(c); for (const [k, v] of Object.entries(c)) flow(k, 'Repairs', -v); b.hp = b.max; screenToast('🔨 ' + DEFS[b.type].name.toUpperCase() + ' REPAIRED'); ui(); showBuildingInfo(b); }; }
  $('ib').querySelectorAll('[data-u]').forEach((el) => { const q = S.sv[+el.dataset.u]; if (q) el.onclick = () => unitPanel(q); });
  const ba = $('bAssign'); if (ba) ba.onclick = () => showAssign(b);
  { const hf = $('hFill'); if (hf) hf.onclick = () => { fillBeds(b); saveGame(); showBuildingInfo(b); }; $('ib').querySelectorAll('.resP').forEach((el) => { el.onclick = () => showResidents(b); });
    const ch = $('campHouse'); if (ch) ch.onclick = () => { const h = world.buildings.find((q) => isHousing(q) && !q.burnt && (q.res || []).length < cap(q)); if (h) showResidents(h); else { say('No empty beds: build or upgrade a Tent'); bCat = 'live'; showBuild(); } }; }
  const bw = $('bWorker'); if (bw && b.staff) bw.onclick = () => { const q = b.staff; closeP(); selected = { kind: 'unit', ref: q }; unitPanel(q); };   /* V2.35: tap the worker to open their panel */
  $('ib').querySelectorAll('[data-ctool]').forEach((x) => { x.onclick = () => { craftTool(x.dataset.ctool); showBuildingInfo(b); }; }); { const sg = $('bSignal'); if (sg) sg.onclick = () => { closeP(); startFinale(); }; }
  { const up = $('bUp'); if (up) up.onclick = () => { upgradeBuilding(b); showBuildingInfo(b); }; const ux = $('bUpX'); if (ux) ux.onclick = () => { cancelUpgrade(b); showBuildingInfo(b); }; }
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
function hitBuilding(px, py) {   /* 3D.129 the building under the finger in the 3D view (was the outline of the old 2D picture); falls back to the tile */
  const b = window.ZH3D && ZH3D.pickBuilding && ZH3D.pickBuilding(px, py); if (b) return b;
  const t = unproject(px, py); return Wd.buildingAt(world, Math.floor(t.x), Math.floor(t.y));
}
function closePick() { const e = $('pick'); if (e) e.remove(); }
function showPick(px, py, c) {
  const w = $('world'), d = document.createElement('div'); d.id = 'pick'; d.className = 'pick';
  d.innerHTML = c.map((o, i) => { if (o.kind === 'unit') { const pic = window.ZH3D && ZH3D.portrait ? ZH3D.portrait(o.ref) : null; return `<button data-k="${i}"><span class="pi">${pic ? `<img src="${pic}" alt="">` : '🙂'}</span><span><b>${esc(fullName(o.ref))}</b><small>${o.ref.job} · ${esc((o.ref.why || '').slice(0, 26))}</small></span></button>`; }
    if (o.kind === 'trader') return `<button data-k="${i}"><span class="pi">${window.ZHIcons ? ZHIcons.svg('box', 26) : '🛒'}</span><span><b>Trader</b><small>Buy and sell</small></span></button>`;
    const b = o.ref, dd = DEFS[b.type]; return `<button data-k="${i}"><span class="pi">${window.ZHIcons ? ZHIcons.svg(FAC_ICON[dd.fam] || TYPE_ICON[b.type] || 'home', 26) : '🏠'}</span><span><b>${dd.name}</b><small>${b.burnt ? 'Needs repair' : bHp(b) < b.max ? `Health ${Math.ceil(b.hp)}/${b.max}` : 'Building'}</small></span></button>`; }).join('');
  w.appendChild(d); const r = w.getBoundingClientRect(), bw = d.offsetWidth, bh = d.offsetHeight;
  d.style.left = Math.max(8, Math.min(r.width - bw - 8, px - bw / 2)) + 'px'; d.style.top = Math.max(60, Math.min(r.height - bh - 90, py + 18)) + 'px';
  d.querySelectorAll('button').forEach((el) => { el.onclick = (e) => { e.stopPropagation(); const o = c[+el.dataset.k]; closePick(); if (o.kind === 'unit') unitPanel(o.ref); else if (o.kind === 'trader') showTrader(); else showBuildingInfo(o.ref); }; });
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
    if (sel.kind === 'trap') { tryTrap(tx, ty, sel.ttype); return; }
    if (sel.kind === 'post') { const r = tryPost(tx, ty); if (r.why !== 'open') updatePostBar(); return; }
    const d = Wd.rotDef(DEFS[sel.type], sel.rot), o = Iso.originFromSouthTile(tx, ty, d.w, d.h); updatePreview(o.x, o.y); return;
  }
  closePick();
  { const cb = hitBonus(px, py); if (cb && collectBonus(cb)) return; }   /* 3D.28 tap a bonus bubble to collect */
  {   /* V3D.17: people and a building under the same tap → a small chooser instead of guessing */
    const us = S.sv.filter((s) => !insideBuilding(s) && s.mode !== 'away' && s.w).map((s) => { const p = project(s.w.x, s.w.y); return [s, Math.hypot(px - p.x, py - (p.y - CHAR_H * TWs() * .5))]; }).filter(([, d]) => d < Math.max(26, .45 * TWs())).sort((a, b) => a[1] - b[1]).map(([s]) => s);
    const c = []; if (hitTrader(px, py)) c.push({ kind: 'trader' }); for (const s of us.slice(0, 4)) c.push({ kind: 'unit', ref: s });
    const bb = hitBuilding(px, py); if (bb) c.push({ kind: 'building', ref: bb });
    if (c.length > 1) { showPick(px, py, c); return; }
  }
  if (hitTrader(px, py)) { showTrader(); return; }
  const u = hitUnit(px, py); if (u) { unitPanel(u); return; }
  { const t0 = unproject(px, py), st = (S.sites || []).find((q) => t0.x >= q.x && t0.x < q.x + q.w && t0.y >= q.y && t0.y < q.y + q.h); if (st) { const mi = jobMiss(st), secs = Math.ceil(st.cons / 60 / simSpeedNow()); say(`${DEFS[st.type].name}: ` + (Object.keys(mi).length ? `waiting for ${costShort(mi)}. Builders bring it from the stockpile; idle survivors gather what is missing. (Demolish tool cancels it.)` : `building, ${secs >= 60 ? Math.ceil(secs / 60) + ' min' : secs + ' s'} left.`), true); return; } }
  const b = hitBuilding(px, py); if (b) { showBuildingInfo(b); return; }
  { const t = unproject(px, py), gp = postAt(Math.floor(t.x), Math.floor(t.y)); if (gp) { showPost(gp); return; } }
  { const t = unproject(px, py), wl = Wd.wallAt(world, Math.floor(t.x), Math.floor(t.y)); if (wl) { const n = S.z.filter((z) => z.hp > 0 && z.mode === 'zbreak' && z.wallT === wl).length, hot = S.z.some((z) => z.hp > 0 && dist(z.w, { x: wl.x + .5, y: wl.y + .5 }) < 2.6); say(`${Wd.WALL_DEFS[wl.type].name} · ${Math.ceil(wl.hp)}/${wl.max} HP` + (n ? ` · ${n} zombie${n > 1 ? 's' : ''} hitting it` : '') + (wl.hp < wl.max ? (S.mat < 1 ? ' · no scrap to repair' : hot ? ' · repairs wait until zombies leave' : ' · being repaired') : '') + (wl.broken ? ' · BROKEN: zombies can walk through' : '')); return; } }
  { const t = unproject(px, py); if (isTreeSpot(Math.floor(t.x), Math.floor(t.y)) && tapTree(Math.floor(t.x), Math.floor(t.y))) return; }   /* V3D.22 */
  selected = null; closeP();
}
$('rotBuild').onclick = () => { if (!sel || sel.kind !== 'building') return; sel.rot = (((sel.rot | 0) + 1) & 3); if (preview && sel.upgFrom) { const b = sel.upgFrom, d = Wd.rotDef(DEFS[sel.type], sel.rot), c = [[b.x, b.y], [b.x + b.w - d.w, b.y + b.h - d.h], [b.x, b.y + b.h - d.h], [b.x + b.w - d.w, b.y]].find(([x, y]) => Wd.placementCheck(world, x, y, d, b).ok) || [b.x, b.y]; updatePreview(c[0], c[1]); return; }   /* 3D.41: turning an upgrade keeps it over the old building */ if (preview) { const d = Wd.rotDef(DEFS[sel.type], sel.rot), sx = preview.x + preview.w - 1, sy = preview.y + preview.h - 1, o = Iso.originFromSouthTile(sx, sy, d.w, d.h); updatePreview(o.x, o.y); } say(['Entrance faces front-left.', 'Entrance faces front-right.', 'Entrance faces back-right.', 'Entrance faces back-left.'][(sel.rot | 0) & 3]); };   /* V2.47: turn the entrance */
$('nudge').addEventListener('click', (e) => { const bt = e.target.closest('button'); if (!bt || !preview) return; const [dx, dy] = bt.dataset.d.split(',').map(Number); updatePreview(preview.x + dx, preview.y + dy); });
$('yesBuild').onclick = confirmPreview; $('noBuild').onclick = () => { endBuildMode(true); say(sel ? '' : 'Done.'); };
$('mBuild').onclick = showBuild; $('gauge').onclick = () => showUpgrade('rank'); $('btnHome').onclick = () => { if (titleOn) return; backToTitle(); }; $('mSurv').onclick = showSurvivors; $('mTown').onclick = showTown; $('mGuide').onclick = () => (HUD_B ? showMore() : showGuide()); $('mExp').onclick = showExpedition; $('tripChip').onclick = showExpedition;
$('closeInfo').onclick = closeP; $('pBack').onclick = () => { const f = panelBack; if (f) f(); };
$('btnCenter').onclick = () => centerOn(7.5 + OFF, 10 + OFF, .9 * ((1.25)));   /* V3D.3: 3D tiles are bigger, zoom in a bit so people stay readable */
$('btnSpeed').onclick = () => { simSpeed = simSpeed === 1 ? 2 : simSpeed === 2 ? 3 : 1; $('btnSpeed').textContent = simSpeed + '×'; try { localStorage.setItem('zhSpeed', simSpeed); } catch (e) { /* private mode */ } };
try { const sp = +localStorage.getItem('zhSpeed'); if (sp >= 1 && sp <= 3) { simSpeed = sp; $('btnSpeed').textContent = sp + '×'; } } catch (e) { /* private mode */ }   /* V3D.13: the chosen speed sticks */
$('btnLog').onclick = showLog; { const sv = $('btnSave'); if (sv) sv.onclick = () => { if (saveGame()) { say('Saved.'); banner('💾 SAVED'); } else say(saveBlocked ? 'This tab is not saving (see the alert).' : 'Saving failed: see the alert.'); }; }
/* V3D.14 Clay icons (style A) on the top bar, left menu, Home and bottom bar */
if ((window.ZHIcons)) {
  const I = ZHIcons.svg, set = (sel, n, px) => { const e = document.querySelector(sel); if (e) e.innerHTML = I(n, px); };
  const res = document.querySelectorAll('#plaque .res > span > i'); ['food', 'water', 'wood', 'stone', 'parts', 'stash'].forEach((n, k) => { if (res[k]) res[k].innerHTML = I(n, 26); });
  [['mBuild', 'build'], ['mExp', 'explore'], ['mSurv', 'people'], ['mTown', 'town'], ['mGuide', HUD_B ? 'menu' : 'guide']].forEach(([id, n]) => set('#' + id + ' i', n, 30));
  if (HUD_B) { const g = $('mGuide'); if (g) { g.lastChild.textContent = 'More'; g.title = 'Guide and settings'; } }
  set('#btnHome', 'home', 30); set('#btnLog', 'log', 30); set('#btnCenter', 'locate', 30); if (document.documentElement.classList.contains('glass')) { set('#btnSave', 'save', 30); const sv = $('btnSave'); if (sv) sv.setAttribute('aria-label', 'Save'); }   /* 3D.28 Glass: round icon buttons */
  ZHIcons.watch(['ib', 'eventModal', 'alerts', 'requestBox', 'confirmBar', 'quest', 'say', 'fx', 'infoPanel', 'adv', 'slots']);   /* panels, cards, alerts: emoji -> Clay icons */
}
{ const sb = $('btnSound'), lab = () => { if (sb && window.SND) { if ((window.ZHIcons)) sb.innerHTML = ZHIcons.svg(SND.mode === 'all' ? 'sound' : SND.mode === 'sfx' ? 'soundLow' : 'soundOff', 26); else sb.textContent = SND.mode === 'all' ? '🔊' : SND.mode === 'sfx' ? '🔉' : '🔇'; } }; lab(); if (sb) sb.onclick = () => { if (window.SND) { SND.unlock(); const m = SND.cycle(); lab(); say(m === 'all' ? 'Sound: effects and music.' : m === 'sfx' ? 'Sound: effects only.' : 'Sound off.'); } }; }
document.addEventListener('pointerdown', () => { if (window.SND) { SND.unlock(); SND.music(isNight(), S.day); } }, { capture: true });
document.addEventListener('click', (e) => { if (e.target.closest('button')) SFX('click'); }, { capture: true }); $('plaque').onclick = (e) => { if (e.target.closest('#tripChip')) return; if (e.target.closest('#advX')) { if (advShown) { S.advMute = { ...(S.advMute || {}), [advShown.key]: S.day }; advisorUpdate(); } return; } if (e.target.closest('#adv')) { if (advShown) advShown.act(); return; } const r = e.target.closest('.res > span'); if (r) { if ((r.querySelector('b') || {}).id === 'rare') { showStash(); return; } const k = { food: 'food', water: 'water', mat: 'mat', wood: 'wood', stone: 'stone' }[(r.querySelector('b') || {}).id]; if (k) { showResource(k); return; } } showObjective(); };
$('btnDebug').onclick = () => { debug = !debug; $('btnDebug').classList.toggle('on', debug); };

/* ---------------- loop ---------------- */
function simTick() { Wd.touch();
  if (S.cut) { for (const o of movers()) o.pv = { x: o.w.x, y: o.w.y }; tick++; cutTick(); return; }   /* 3D.102 the opening cutscene runs instead of the town */
  if (S.sh) { S.shAcc = (S.shAcc || 0) + (S.sh.sel.length || S.sh.ring ? SH_SLOW : SH_PACE) / simSpeed; while (S.sh && S.shAcc >= 1) { S.shAcc--; shTick(); } if (S.sh && S.sh.practice) return; S.shSlow = (S.shSlow || 0) + 1; if (S.shSlow % 4) return; }   /* 3D.115 the squad's own pace, not the town speed */   /* practice: the town waits */   /* 3D.108 the town keeps running, slowed right down, while the squad is inside */
  for (const o of movers()) o.pv = { x: o.w.x, y: o.w.y };   /* V2.33: previous position, for smooth drawing between ticks */
  tick++; if (S.alert > 0) S.alert--; driveTick(); traderTick(); bagsTick(); errandsTick(); sitesTick(); if (tick % 30 === 0) { incidentTick(); petTick(); exTick(); dogBite(); } S.expClock = (S.expClock || 0) + 1000 / 60; lvTick(STEP * 3); S.sv.forEach(ai); spreadOut(); if (world.walls.size && tick % 6 === 0) for (const q of S.sv) if (q.hp > 0 && q.w && !insideBuilding(q) && !['away', 'down'].includes(q.mode)) unwall(q); dryTick(); introTick(); if (tick % 30 === 7) { answerSOS(); engineerRepairs(); } S.z.forEach(zai); for (const z of S.z) if (z.hp <= 0 && z.type === 'rotbomb' && !z.escaped && !z.zoo && !z.burst) { if (!(z.fuseT >= 0)) { z.fuseT = ROT_FUSE; z.mode = 'zfuse'; z.moving = false; } else if (--z.fuseT <= 0) rotBurst(z); }   /* 3D.85 it swells for a second, then bursts */ for (const z of S.z) if (z.hp <= 0 && z.type !== 'raider' && !z.escaped && !(z.fuseT > 0) && !z.burst) corpses.push({ type: z.type, w: { ...z.w }, phase: z.phase, mode: 'dead', dead: 0, target: z.target && z.target.w ? { w: { ...z.target.w } } : null }); S.z = S.z.filter((z) => z.hp > 0 || z.fuseT > 0); for (let i = corpses.length - 1; i >= 0; i--) if (++corpses[i].dead > 120) corpses.splice(i, 1); monsterGeneration(); visitorArrival();
  if (tick % 30 === 0) { alertsTick(); refreshNow(); for (let k = 0; k < 4 && assignRescue(); k++); } if (tick % 60 === 20) repelRaid(); if (tick % 300 === 150) rally() || militia(); if (tick % 120 === 0) { missionProgress(); bondTick(); } if (tick % 240 === 0) checkRank(); if (tick % 24000 === 0 && tick > 0) triggerTownEvent(); if (tick % 450 === 0) saveGame();
  if (tick % 300 === 0) { autoStaff(); postsAssign(); powerGrid(); } if (tick % 60 === 0) { tripUpdate(); expTick(); } if (tick % 60 === 0 && world.walls.size) autoRepair(); if (tick % 240 === 0 && world.walls.size) checkPerimeter();
  if (tick % 100 === 0) for (const b of world.buildings) if (b.staff) { b.wsN = (b.wsN || 0) + 1; b.wsW = (b.wsW || 0) + (isWorking(b) ? 1 : 0); }
  if (tick % 60 === 30 && window.SND) { if (S.z.some((z) => z.hp > 0 && !z.zoo && ['zchase', 'zattack', 'zbash', 'zmarch'].includes(z.mode) && Wd.inTown(Math.floor(z.w.x), Math.floor(z.w.y)))) S.musDanger = tick + 1500; SND.music(isNight(), S.day); SND.danger((S.musDanger || 0) > tick); }   /* 3D.50 music follows the clock and the fighting */
  barkWatch(); if (tick % 30 === 15 && lastStand()) for (const q of standing()) if (['chase', 'attack', 'recover'].includes(q.mode) && q.target) { const z = q.target; q.target = null; engage(q, z); }   /* 3D.48 */
  if (tick % 60 === 40) helpTick();
  if (tick % 1000 === 0) { S.hour++; if (S.mat > scrapCap()) { S.mat = scrapCap(); if (!S.capNote || S.day > S.capNote) { S.capNote = S.day; say('Scrap storage is full: build storage or level up the Haven to keep more.'); } } if (S.hour % 24 === 6) for (const q of S.sv) q.daysHere = (q.daysHere || 0) + 1; assignHomes(); housingTidy(); rpStarter(); weatherHour(); barkHour(); nodesTick(); powerTick(); hourlyProduction(); ecoHour(); shortageCheck(); advisorUpdate(); eventSchedule(); if (S.hour === 20 || S.hour === 6) { SFX(S.hour === 20 ? 'night' : 'dawn'); if (window.SND) SND.music(isNight()); } if (S.hour === 19) note('important', '🌙 NIGHT IN 1 HOUR — MORE ZOMBIES', { log: 'Night falls at 20:00: more zombies, and they come for the town.' }); if (S.hour === 20) note('important', '🌙 NIGHT FALLS — THE DEAD ARE RESTLESS', { log: 'Night falls: more zombies, and they come for the town.' }); if (S.hour === 6) note('routine', 'Dawn: fewer zombies until nightfall.'); if (S.hour >= 24) { S.hour = 0; S.day++; endOfDay(); } ui(); }
}
let last = 0, acc = 0; const STEP = 1000 / 60;
/* what the 3D renderer (js/render3d.js) reads each frame */
window.ZHG = { shots, CAR_SPOTS, BIN_SPOTS, treeState, nodeState, nodeList: () => nodeList(), ROCK_SPOTS, nodeVer: () => S.nodeVer || 0, jobList: () => jobList(), jobReady, season: () => seasonOf().id, tick: () => tick, preview: () => (sel && sel.kind === 'building' ? preview : null), world, S, cam, BASE_TW, COLS, ROWS, Wd, DEFS, ITEMS, corpses, TREE_SPOTS, CRATE_SPOTS, VW: () => VW, VH: () => VH, unproject, humanAnim, facing, insideBuilding, beingCarried, wreckSpots, simSpeed: () => (S.sh && S.sh.view ? (S.sh.sel.length || S.sh.ring ? SH_SLOW : SH_PACE) : simSpeed), paused: () => modalOpen || titleOn };
const movers = () => { const l = S.sv.concat(S.z); if (S.trader) l.push(S.trader); return l; };
function drawSmooth(alpha) {   /* V2.33: draw everyone between their last two simulation positions, so movement is smooth at any frame rate and at 1x / 2x */
  const moved = [];
  for (const o of movers()) { const p = o.pv; if (!p || !o.w) continue; const dx = o.w.x - p.x, dy = o.w.y - p.y; if (Math.abs(dx) + Math.abs(dy) > 1.2 || (!dx && !dy)) continue; moved.push([o, o.w]); o.w = { x: p.x + dx * alpha, y: p.y + dy * alpha }; }
  try { draw(); } finally { for (const [o, w] of moved) o.w = w; }
}
function frame(t) { if (titleOn) { const k = t / 1000; centerOn(7.5 + OFF + Math.sin(k * .07) * 3, 10 + OFF + Math.cos(k * .05) * 2.5, Math.max(.8, Math.min(1.2, VW / 400))); } if (!last) last = t; acc += modalOpen || titleOn ? 0 : Math.min(100, t - last) * simSpeed; last = t; let n = 0; while (acc >= STEP && n < 12) { simTick(); acc -= STEP; n++; } if (n === 12) acc = 0; drawSmooth(modalOpen ? 1 : Math.min(1, acc / STEP)); requestAnimationFrame(frame); }
document.addEventListener('visibilitychange', () => { if (window.SND) SND.pause(document.hidden); if (document.hidden) { hiddenAt = Date.now(); saveGame(); } else { last = 0; tripUpdate(); expTick(); if (hiddenAt) { awayCredit(Date.now() - hiddenAt); hiddenAt = 0; } } }); window.addEventListener('pagehide', saveGame);

/* ---------------- init ---------------- */
async function init() {
  await loadAll(); resize();
  if (!SKIP_TITLE) { titleOn = true; document.getElementById('app').classList.add('titleMode'); }
  const restored = titleOn || ZOO ? null : loadGame();
  if (!restored) {
    let o = {}; if (!titleOn) { try { o = JSON.parse(localStorage.getItem('zhNewOpts') || '{}') || {}; localStorage.removeItem('zhNewOpts'); } catch (e) { o = {}; } } const tq = (k) => QS.get(k);   /* V2.46: chosen on the new-game screen (?start=&diff= for testing) */
    S.diff = DIFFS[tq('diff') || o.diff] ? (tq('diff') || o.diff) : 'normal'; setMap(tq('map') || o.map || 'road'); applyStart(tq('start') || o.start || 'camp'); if (o.legacy) applyLegacy();   /* 3D.112 */
    cutFence(); if ((!titleOn && !ZOO) && !QS.get('nocut')) S.cutPending = true; else { spawn(5 + OFF, 3 + OFF, 'walker'); spawn(9 + OFF, 3 + OFF, 'crawler'); spawn(12 + OFF, 4 + OFF, 'walker'); }   /* 3D.102 the broken farm fence; the opening cutscene (the zombies come after it) */
  } else { for (let i = 0; i < 3; i++) spawn(); if (restored.cam && restored.cam.z) { cam.z = restored.cam.z; cam.x = restored.cam.x; cam.y = restored.cam.y; clampCam(); } }
  if (!restored || !restored.cam) centerOn(7.5 + OFF, 10 + OFF, Math.max(.7, Math.min(1.1, VW / 430)) * ((1.25)));
  if (titleOn) { $('loading').style.display = 'none'; showTitle(); requestAnimationFrame(frame); return; }
  if (!restored) { let nm = null; try { nm = localStorage.getItem('zhNewName'); localStorage.removeItem('zhNewName'); } catch (e) { /* ignore */ } if (nm) S.townName = nm.slice(0, 22); }
  if (QS.get('shtest')) setTimeout(() => showShPractice(), 1200);   /* 3D.114 the practice page */
  if (S.cutPending) { delete S.cutPending; cutStart(); } autoStaff(); tripUpdate(); expTick(); if (S.trip && S.trip.enc) encPopup(S.trip); if (!S.mission && !S.cut) beginMission(); updateZoomLabel(); ui(); $('loading').style.display = 'none'; requestAnimationFrame(frame);
  if (ZOO) zooStart();
  try { if (navigator.storage && navigator.storage.persist) navigator.storage.persisted().then((p) => p || navigator.storage.persist()).catch(() => {}); } catch (e) { /* not supported */ }   /* V2.42: ask the browser not to evict saves */
  if (loadedFrom === 'bak') note('important', '💾 LOADED THE DAY BACKUP', { log: `The latest save of this slot was damaged, so the backup from Day ${S.day} was loaded. The damaged copy was kept.` });
  if (saveBlocked === 'load') showEventPopup({ title: '💾 SAVE COULD NOT BE OPENED', text: `The town in slot ${SLOT} could not be loaded. <b>Nothing was overwritten</b>: this town will not save while you look around.<br><br>On the main screen, <b>Start → Backups</b> can export the file or import an older backup.`, buttons: [{ label: 'MAIN SCREEN', fn: () => { location.href = location.pathname; } }, { label: 'LOOK AROUND' }] });
}
/* ---------------- 3D.32 Zombie test page (?zoo): every zombie type lined up on the map, frozen, with name tags and a list.
   Tap a card to fly to it; "Let them attack" releases them on the town; "Line up again" resets. Nothing is saved. */
const ZOO_ROWS = [['walker', 'crawler', 'runner', 'bloated', 'spitter', 'thrower', 'brute', 'sporehead', 'raider'], ['lasher', 'rotbomb', 'stalker', 'screamer', 'riot', 'burnt', 'dog', 'alpha', 'boss']], ZOO_GRID = [['lasher', 'rotbomb', 'stalker'], ['screamer', 'riot', 'burnt'], ['dog', 'alpha', 'boss'], ['walker', 'crawler', 'runner', 'bloated'], ['spitter', 'brute', 'sporehead', 'raider']];
function zooLine() {
  S.z = []; ZOO_GRID.forEach((row, r) => row.forEach((t, i) => {
    const S0 = 11 + r * 2.1, D = -3 + (i - (row.length - 1) / 2) * 2.2, x = (S0 + D) / 2 + OFF, y = (S0 - D) / 2 + OFF;   /* a compact grid that runs across the screen (iso), north of the camp */
    if (t === 'raider') { const d = zombieTypes.raider; S.z.push({ type: 'raider', human: true, w: tc(x, y), home: tc(x, y), pw: 1, hp: d.hp, max: d.hp, cool: 40, phase: rnd() * 100, mode: 'zoo', stateTicks: 0, target: null, path: null, zoo: true }); return; }
    if (t === 'stalker') { S.z.push({ type: 'boss', bk: 'stalker', boss: true, pw: 1, w: tc(x, y), hp: 182, max: 182, cool: 40, phase: 0, mode: 'zoo', stateTicks: 0, target: null, path: null, zoo: true }); return; }   /* 3D.80 */
    if (t === 'boss') { S.z.push({ type: 'boss', boss: true, pw: 1, w: tc(x, y), hp: 260, max: 260, cool: 40, phase: 0, mode: 'zoo', stateTicks: 0, target: null, path: null, zoo: true }); return; }
    spawn(x, y, t); const z = S.z[S.z.length - 1]; z.zoo = true; z.mode = 'zoo'; z.hp = z.max;
  }));
}
function zooStart() {
  S.mission = null; zooLine(); centerOn(6.3 + OFF, 9.3 + OFF, Math.max(.95, Math.min(1.3, VW / 330))); simSpeed = 1;
  const d = document.createElement('div'); d.id = 'zooPanel'; d.className = 'zooPanel';
  const card = (t) => { const z = zombieTypes[t] || (t === 'stalker' ? { name: 'Stalker (boss)', hp: 182, atk: 15, isNew: 1 } : { name: 'Mutant Boss' }); return `<button class="zc" data-t="${t}"><b>${esc(z.name || t)}</b>${z.isNew ? '<i>NEW</i>' : ''}<small>HP ${z.hp || 260} · ATK ${z.atk || 14}</small></button>`; };
  d.innerHTML = `<div class="zh"><b>Zombie test</b><span class="sm">${ZOO_ROWS.flat().length} types · tap one to look closer</span></div><div class="zrow">${[...ZOO_ROWS[1], ...ZOO_ROWS[0]].map(card).join('')}</div><div class="zinfo" id="zooInfo">Top two rows: the new zombies from the story plan (NEW). Bottom rows: the ones in the game today.</div><div class="zbtns"><button class="act" id="zooExit">Exit</button><button class="act" id="zooReset">Line up again</button><button class="act go" id="zooGo">Let them attack</button></div>`;
  $('world').appendChild(d);
  d.querySelectorAll('.zc').forEach((b) => { b.onclick = () => { const t = b.dataset.t, z = S.z.find((q) => (q.type === t || q.bk === t) && q.hp > 0), def = zombieTypes[t] || (t === 'stalker' ? { name: 'Stalker (boss)', hp: 182, atk: 15, desc: BOSS_KINDS.stalker.line } : null); if (z) centerOn(z.w.x, z.w.y, 2.2); $('zooInfo').innerHTML = `<b>${esc((def && def.name) || 'Mutant Boss')}</b> · HP ${(def && def.hp) || 260} · ATK ${(def && def.atk) || 14} · speed ${def ? Math.round(def.chase * 1000) : 9}<br>${esc((def && def.desc) || (t === 'boss' ? 'The big mutant that comes every few nights.' : t === 'raider' ? 'Human enemy: steals from your stockpile and runs.' : 'A regular in every wave.'))}`; }; });
  $('zooExit').onclick = () => { const q = new URLSearchParams(location.search); q.delete('zoo'); location.search = q.toString(); };
  $('zooReset').onclick = () => { zooLine(); centerOn(6.3 + OFF, 9.3 + OFF, Math.max(.95, Math.min(1.3, VW / 330))); };
  $('zooGo').onclick = () => { for (const z of S.z) { z.zoo = false; z.mode = 'appear'; z.stateTicks = 0; z.siege = true; } };
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
  location.href = location.pathname + '?play=1' + location.hash;   // V3D.19: keep #v2 (test character) when the game starts
}
function backToTitle() { saveGame(); location.href = location.pathname + location.hash; }
function showTitle() {
  $('title').style.display = 'flex'; $('slots').style.display = 'none';
  const latest = [0, 1, 2].map((i) => [i, slotInfo(i)]).filter(([, x]) => x && !x.broken).sort((a, b) => b[1].time - a[1].time)[0];
  $('tCont').style.display = latest ? 'block' : 'none'; if (latest) { $('tCont').innerHTML = `Continue<small>${esc(latest[1].name)} · Day ${latest[1].day}</small>`; $('tCont').onclick = () => playSlot(latest[0]); }
  if (document.documentElement.classList.contains('cozy')) { const t = document.querySelector('.tLogo .tsub'); if (t) t.textContent = 'a cozy end of the world'; $('tStart').textContent = 'New game'; }
  $('tStart').onclick = showSlots; { const zb = $('tZoo'); if (zb) zb.onclick = () => { const q = new URLSearchParams(location.search); q.set('zoo', '1'); location.search = q.toString(); }; }   /* 3D.32 */ { const R = Object.entries(records()).sort((a, b) => b[1].score - a[1].score)[0]; $('tVer').textContent = 'ver ' + VERSION + ((' · ' + BUILD_TAG)) + (R ? ` · 🏆 ${R[1].score} (${(STARTS[R[0].split('/')[0]] || STARTS.camp).name}, ${(DIFFS[R[0].split('/')[1]] || DIFFS.normal).name})` : ''); }
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
let newOpt = { start: 'camp', diff: 'normal', map: 'road' };
function newSlot(i, keepName) {   /* V2.46: name, starting condition and difficulty */
  const box = $('slots'), nm = keepName ?? 'Zombie Haven', R = records(), rec = R[newOpt.start + '/' + newOpt.diff];
  box.querySelector('.slist').innerHTML = `<div class="card newGame" style="color:#2a2a5a;background:#f3f6f9"><b style="font-size:22px">Slot ${i + 1} · New haven</b>
    <div class="sm" style="margin:6px 0 2px;color:#5b6b7a">Name your town</div><input id="sName" maxlength="22" value="${esc(nm)}" style="width:100%;box-sizing:border-box;font:inherit;font-size:22px;padding:6px;border-radius:6px;border:2px solid #7f93a6;background:#f7fafc;color:#1f2a33;text-align:center">
    <div class="sm" style="margin:8px 0 2px;color:#5b6b7a">Land</div><div class="row" style="gap:4px;flex-wrap:wrap">${Object.entries(MAPS).map(([k, v]) => `<button class="act${(newOpt.map || 'road') === k ? ' go' : ''}" data-mp="${k}" style="flex:1 1 40%;margin:0;padding:6px 2px;font-size:16px">${v.icon} ${v.name}</button>`).join('')}</div>
    <div class="sm" style="margin-top:4px;color:#5b6b7a">${MAPS[newOpt.map || 'road'].desc}</div>
    <div class="sm" style="margin:8px 0 2px;color:#5b6b7a">Difficulty</div><div class="row" style="gap:4px">${Object.entries(DIFFS).map(([k, v]) => `<button class="act${newOpt.diff === k ? ' go' : ''}" data-df="${k}" style="flex:1 1 0;margin:0;padding:6px 2px;font-size:17px">${v.icon} ${v.name}</button>`).join('')}</div>
    <div class="sm" style="margin-top:4px;color:#5b6b7a">${DIFFS[newOpt.diff].desc}</div>
    <div class="sm" style="margin-top:4px;color:#2a5ac8">${rec ? `🏆 Best here: ${rec.score} (${esc(rec.name)}, day ${rec.day})` : 'No win yet with this start and difficulty.'}</div>
    ${legacySaved() ? `<button class="act${newOpt.legacy ? ' go' : ''}" id="sLeg" style="margin-top:8px;width:100%">🌳 Legacy start: ${newOpt.legacy ? 'on' : 'off'}<small style="display:block;font-size:13px">${esc(legacySaved().from)} · ${(legacySaved().vets || []).map((v) => esc(v.name)).join(', ')}</small></button>` : ''}
    <div class="row" style="gap:8px;margin-top:10px;justify-content:center"><button class="act" id="sCancel">Cancel</button><button class="act go" id="sGo">Start</button></div></div>`;
  { const lb = $('sLeg'); if (lb) lb.onclick = () => { newOpt.legacy = !newOpt.legacy; newSlot(i, ($('sName').value || '').trim() || 'Zombie Haven'); }; }
  const nmNow = () => ($('sName').value || '').trim() || 'Zombie Haven';
  box.querySelectorAll('[data-st]').forEach((e) => { e.onclick = () => { newOpt.start = e.dataset.st; newSlot(i, nmNow()); }; });
  box.querySelectorAll('[data-df]').forEach((e) => { e.onclick = () => { newOpt.diff = e.dataset.df; newSlot(i, nmNow()); }; });
  box.querySelectorAll('[data-mp]').forEach((e) => { e.onclick = () => { newOpt.map = e.dataset.mp; newSlot(i, nmNow()); }; });
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
window.ZH = { BUILD_TAG, ARRIVE, TUNE,   /* balance knobs (tools/balance/README.md) */ shBot: { act: (c) => shAct(c), move: (at) => shMoveTo(at), call: (k) => shCall(k) },   /* 3D.130 orders without the screen, for the balance bot (tools/balance/sh_probe.py) */ CAMP_PLAN, get SH_ROOMS() { return SH_ROOMS; }, get SH_DOORS() { return SH_DOORS; }, SH_AX, SH_AY, shGridOf: () => shGrid(), shWorldOf: (x, y) => shWorld(x, y), showShPractice, shTap, showLegacy, legSel, crisisDaily, promoteSpec, promoteHyb, hybOptions, specWhy, needsBanner, setExpVeh: (k) => { expSel.veh = k || null; }, vehReady, VEH, vehArrive, vehBuildCart, vehRepair, vehDrive, unitPanel, raiderDown, spawn, spawnRaid, startStronghold, shCall, shEnd, shTick, SH_DEFS, shPower, STORY, fac, boom, upgradeTown, levelUpDone, earnBanner, rankConds, showUpgrade, showTown, supplyCap, matCap, scrapCap, zombieTypes, intro, INTRO, danger, powerTick, powered, gunners, tryTrap, trapAt, trapMap, trapMax, rearmAll, trapsSpent, helpReady, facilityRules, newJob, collectBonus, autoStaff, ECO, supplyCap, rationNeed, radioHelp, ageOf, newcomer, mk, impactFx, note, downAlert, alertHub, bark, barkSomeone, craftTool, TOOLS, radioOk, lootReveal, lootEntries, showStash, dropBag, openBag, hqTier, canPay, bCost, upgradeBuilding, upgradeCheck, jobList: () => jobList(), newSite: (t, x, y) => { const d = DEFS[t], nb = { type: t, x, y, rot: 0, w: d.w, h: d.h, q: d.q, a: d.a, staff: null }; (S.sites ||= []).push(newJob(nb, bCost(d))); world.sites = S.sites; Wd.bump(world); pushUnitsOut(nb); return nb; }, upgradeTown, holdEvent, showUpgrade, rankConds, TOWN_EVENTS, RANK_REQ, ui, showBuildingInfo, showBuild, showTown, showSurvivors, STORY, bondOf, popCap, popNow, BANDAGE: () => BANDAGE_COST, repairBurnt, traderArrive, traderBuy, traderTrade, givePet, S, world, Wd, cam, project, unproject, insideBuilding, tapAt, unitPanel, doResearch, craft, RESEARCH, researched, upkeepTotal, equip, stat, ITEMS, stashAdd, expandTerritory, spawnRaid, spawnBoss, changeProfession, gainXp, SKILLS, isNight, startTool, updatePreview, centerOn, draw, simTick, step(n) { for (let i = 0; i < n; i++) simTick(); }, spawn, mk, get sel() { return sel; }, get preview() { return preview; }, get selected() { return selected; }, get tick() { return tick; }, serialize, saveGame, closeP, expAutoSquad, startExpedition, tripUpdate, showExpedition, expLocked, EXP_DEFS, showEventPopup, autoStaff, tryWall, killSurvivor, useBandage, upgradeBuilding, upgradeCheck, hourlyProduction, supplyStats, isWorking, supplyCap, DEFS, setDebug(v) { debug = v; }, finaleTest: () => finaleHour(), legacyDone, signalReady, startFinale, scoreOf, tryPost, postMax, encOdds, get saveBlocked() { return saveBlocked; }, get saveErr() { return saveErr; }, get loadedFrom() { return loadedFrom; }, get advShown() { return advShown; }, militia, setPolicy, policy, onShift, wreckSpots, pixelCacheSize: () => pixelCache.size, pixelCacheMB: () => Math.round([...pixelCache.values()].reduce((t, c) => t + c.width * c.height * 4, 0) / 1e5) / 10, econ, showResource, ECO, get objMarks() { return objMarks; }, alerts, note, sendDefender, get simSpeed() { return simSpeed; }, get repairFirst() { return repairFirst; }, demolish, BASE_TW, get groundChunks() { return groundChunks; } };
Object.assign(window.ZH, { rankRoom, bedCount, orderRescue, focusBoss, ai, });   /* 3D.67 test hooks */
Object.assign(window.ZH, { forecastFor, STORY, BOSS_KINDS });   /* V3D.17 test hooks */
init();
})();
