/* Zombie Haven V2.6 — game (single IIFE; built from tools/parts/p1..p3 by tools/build_game.sh). */
(function () {
'use strict';
const Iso = window.ZHIso, Wd = window.ZHWorld;
const SFX = (n) => { if (window.SND) SND.play(n); };   /* V2.21 sound (js/sound.js) */
const VERSION = '2.55.0', BUILD_TAG = '3D.230', PREV_KEY = 'zombieHavenV25', OLD_KEY = 'zombieHavenV2';
/* V2.40 save slots: slot 1 keeps the old key, so existing towns carry over */
const SLOT_KEYS = ['zombieHavenR1', 'zombieHavenR1_s2', 'zombieHavenR1_s3']   /* V3D.22 resources: fresh saves (old towns are not converted) */, QS = new URLSearchParams(location.search);
let SLOT = 1; try { SLOT = Math.min(3, Math.max(1, +localStorage.getItem('zhSlot') || 1)); } catch (e) { /* storage blocked */ }
let titleOn = false; const SAVE_KEY = SLOT_KEYS[SLOT - 1], SKIP_TITLE = ['test', 's', 'play', 'tune', 'zoo', 'gear', 'svt'].some((k) => QS.has(k)), GEAR = QS.has('gear'), SVT = QS.has('svt'), ZOO = QS.has('zoo') || GEAR || SVT;   /* 3D.190 ?svt = Survivor test */   /* 3D.151 ?gear = gear test page (never saves, like ?zoo) */   /* 3D.32 ?zoo = zombie test page (never saves) */
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
/* 3D.159 owner (UI check): one size rule for the whole HUD. Everything on top of the map is drawn at --u times its phone size, worked out from
   the game's phone-shaped column: 390 px wide is 1, a small phone shrinks a little, a tablet or a computer window grows a little (0.85 .. 1.2). A phone on its side gets
   the compact layout (html.shortScr) instead of shrinking further. */
let UI_U = 1;
function uiScale() {
  const a = typeof document !== 'undefined' && document.getElementById('app'); if (!a) return; const r = a.getBoundingClientRect(); if (!r.width || !r.height) return;
  UI_U = Math.round(Math.max(.85, Math.min(1.2, r.width / 390, r.height / 700)) * 100) / 100;   /* never below .85: buttons stay at least 44 px */
  document.documentElement.style.setProperty('--u', UI_U); document.documentElement.classList.toggle('shortScr', r.height < 560);   /* a phone on its side */
}
uiScale();
window.addEventListener('resize', () => { uiScale(); resize(); layoutTop(); });
if (typeof ResizeObserver !== 'undefined' && document.getElementById('app')) new ResizeObserver(() => { const u = UI_U; uiScale(); if (u !== UI_U) layoutTop(); }).observe(document.getElementById('app'));   /* the column can change size after the window's resize event (address bar, rotation) */

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

