/* Zombie Haven V2.6 — game (single IIFE; built from tools/parts/p1..p3 by tools/build_game.sh). */
(function () {
'use strict';
const Iso = window.ZHIso, Wd = window.ZHWorld;
const VERSION = '2.15.0', SAVE_KEY = 'zombieHavenV26', PREV_KEY = 'zombieHavenV25', OLD_KEY = 'zombieHavenV2';
const BASE_TW = 56, BASE_TH = BASE_TW * Iso.RATIO;          // ONE projection for terrain, roads, buildings, units
const COLS = Wd.COLS, ROWS = Wd.ROWS, DEFS = Wd.DEFS, STAFF_JOBS = Wd.STAFF_JOBS;
const CHAR_H = 30 / 42;   // = 30 art px on the 42-px tile grid: characters and map share one pixel size                                         // character content height in tile-widths (chibi, tunable)
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
const B4_DEFS = {   // pixel-art buildings (assets/buildings/v4/<type>.png): ax, ay = south ground corner in art px; 42 art px = 1 tile width
  house: { ax: 45, ay: 81 },
  water: { ax: 44, ay: 75 },
  farm: { ax: 48, ay: 60 },
  medic: { ax: 46, ay: 65 },
  canteen: { ax: 44, ay: 79 },
  armory: { ax: 50, ay: 80 },
};
const ART_TILE = 42;
const Z4_DEFS = {   // h = body height for the health bar (the brute's raised-arm attack frame is taller than its body)
  walker: { fw: 35, fh: 35, foot: 33, h: 32 }, crawler: { fw: 32, fh: 25, foot: 23, h: 22 }, runner: { fw: 40, fh: 34, foot: 32, h: 31 },
  spitter: { fw: 42, fh: 33, foot: 31, h: 30 }, bloated: { fw: 38, fh: 43, foot: 41, h: 40 }, brute: { fw: 42, fh: 55, foot: 53, h: 42 },
};
function loadImg(key, src) { return new Promise((res) => { const im = new Image(); im.onload = () => res(); im.onerror = () => { console.warn('missing asset', src); res(); }; im.src = src + '?v=' + VERSION; IMG[key] = im; }); }
const okImg = (im) => im && im.complete && im.naturalWidth > 0;
const scaledCache = new Map();
const pixelCache = new Map();
function pixelUp(key, img, m) {   // whole-number nearest-neighbour enlargement of a pixel-art sheet, cached per factor
  const k = key + '#' + m; let c = pixelCache.get(k); if (c) return c;
  c = document.createElement('canvas'); c.width = img.width * m; c.height = img.height * m; const g = c.getContext('2d'); g.imageSmoothingEnabled = false; g.drawImage(img, 0, 0, c.width, c.height);
  if (pixelCache.size > 24) pixelCache.clear(); pixelCache.set(k, c); return c;
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
function alphaMask(type) {                    // per-sprite alpha for pixel-accurate tapping
  if (type in alphaMasks) return alphaMasks[type];
  let m = null; try { const im4 = IMG['b4:' + type], im = B4_DEFS[type] && okImg(im4) ? im4 : SPR[type].img, c = document.createElement('canvas'); c.width = im.naturalWidth; c.height = im.naturalHeight; const g = c.getContext('2d'); g.drawImage(im, 0, 0); m = { w: c.width, h: c.height, d: g.getImageData(0, 0, c.width, c.height).data }; } catch (e) { m = null; }
  return (alphaMasks[type] = m);
}
async function loadAll() {
  const jobs = [];
  for (const [k, f] of Object.entries(CHAR_FILES)) jobs.push(loadImg('char:' + k, `assets/characters/${f}.png`));
  jobs.push(loadImg('char4', CHAR4.file)); jobs.push(loadImg('char4b', CHAR4.back));
  ZOMBIE_FILES.forEach((z) => jobs.push(loadImg('zombie:' + z, `assets/zombies/${z}.png`)));
  Object.keys(Z4_DEFS).forEach((z) => { jobs.push(loadImg('z4:' + z, `assets/zombies/v4/${z}.png`)); jobs.push(loadImg('z4b:' + z, `assets/zombies/v4/${z}_back.png`)); });
  ['tree', 'crate', 'debris'].forEach((p) => jobs.push(loadImg('prop:' + p, `assets/props/${p}.png`)));
  jobs.push(loadImg('grass_a', 'assets/terrain/grass_a.png'), loadImg('grass_b', 'assets/terrain/grass_b.png'));
  [['uiBuildIcon', 'build'], ['uiSurvivorsIcon', 'survivors'], ['uiItemsIcon', 'items']].forEach(([id, f]) => { $(id).src = `assets/ui/${f}.png?v=${VERSION}`; });
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
  Object.keys(B4_DEFS).forEach((t) => jobs.push(loadImg('b4:' + t, `assets/buildings/v4/${t}.png`)));
  await Promise.all(jobs);
}

/* ---------------- state ---------------- */
const world = Wd.createWorld();
const S = { inv: {}, terr: 0, nextRaid: 2.6, nextBoss: 3, produced: 0, food: 14, water: 14, mat: 30, alert: 0, sealed: false, retreat: 35, fallen: [], spare: [], ren: 0, rank: 1, threat: 1, day: 1, hour: 8, kills: 0, stage: 0, sv: [], z: [], spawnClock: 0, eventClock: 0, arrivalClock: 0, requests: [], builtCount: 0, mission: null, missionStart: { kills: 0, produced: 0, built: 0 }, lastSave: 0, seq: 0 };
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
window.addEventListener('resize', () => { resize(); });

/* ---------------- ground layer: true pixel art, one art pixel = one character pixel (docs/ART_STANDARD.md) ----------------
   Tile = APX x APY art px (42 x 28, the 2:3 projection). Grass and roads are generated pixel by pixel into one native-size
   canvas, rebuilt whenever the world changes, then drawn with the same sharp-bilinear scaling as the sprites. */
const APX = 42, APY = 28, GOXA = ROWS * APX / 2;   // tile size in art px; x of tile (0,0)'s north corner
let groundCv = null, groundKey = '';
const hash2 = (x, y) => { let h = (x * 374761393 + y * 668265263) | 0; h = (h ^ (h >>> 13)) * 1274126177 | 0; return ((h ^ (h >>> 16)) >>> 0) / 4294967296; };
function vnoise(x, y) { const xi = Math.floor(x), yi = Math.floor(y), xf = x - xi, yf = y - yi, s = (t) => t * t * (3 - 2 * t);
  const a = hash2(xi, yi), b = hash2(xi + 1, yi), c = hash2(xi, yi + 1), d = hash2(xi + 1, yi + 1); return a + (b - a) * s(xf) + (c - a) * s(yf) + (a - b - c + d) * s(xf) * s(yf); }
const hex = (h) => [parseInt(h.slice(1, 3), 16), parseInt(h.slice(3, 5), 16), parseInt(h.slice(5, 7), 16)];
const GRASS = ['#3d6e2f', '#4a7f35', '#56903b', '#63a043', '#74b04d'].map(hex), GRASS_OUT = ['#2c4f2a', '#355d2f', '#3e6a33', '#477637', '#53833d'].map(hex);
const ROADC = { base: hex('#76736a'), dark: hex('#69665e'), light: hex('#827f75'), curb: hex('#4c4943'), lip: hex('#8f8b7e'), dash: hex('#d9d1ac') };
function buildGround() {
  const W = (COLS + ROWS) * APX / 2, H = (COLS + ROWS) * APY / 2;
  if (!groundCv) { groundCv = document.createElement('canvas'); groundCv.width = W; groundCv.height = H; }
  const g = groundCv.getContext('2d'), id = g.createImageData(W, H), d = id.data;
  const road = (x, y) => Wd.isRoad(world, x, y);
  for (let py = 0; py < H; py++) for (let px = 0; px < W; px++) {
    const A = (px + .5 - GOXA) / (APX / 2), B = (py + .5) / (APY / 2), wx = (A + B) / 2, wy = (B - A) / 2;
    if (wx < 0 || wy < 0 || wx >= COLS || wy >= ROWS) continue;
    const tx = Math.floor(wx), ty = Math.floor(wy), u = wx - tx, v = wy - ty; let c;
    if (road(tx, ty)) {
      const e = 0.075, n = road(tx, ty - 1), ea = road(tx + 1, ty), so = road(tx, ty + 1), we = road(tx - 1, ty);
      const edge = (!n && v < e) || (!so && v > 1 - e) || (!we && u < e) || (!ea && u > 1 - e);
      const lip = !edge && ((!n && v < 2 * e) || (!so && v > 1 - 2 * e) || (!we && u < 2 * e) || (!ea && u > 1 - 2 * e));
      const onX = Math.abs(v - .5) < .045 && ((ea && u >= .5) || (we && u <= .5)), onY = Math.abs(u - .5) < .045 && ((so && v >= .5) || (n && v <= .5));
      const dash = (onX && Math.floor(wx * 6) % 2 === 0) || (onY && Math.floor(wy * 6) % 2 === 0);
      const r = hash2(px, py);
      c = edge ? ROADC.curb : lip ? ROADC.lip : dash ? ROADC.dash : r < .08 ? ROADC.dark : r > .95 ? ROADC.light : ROADC.base;
    } else {
      const pal = Wd.inTown(tx, ty) ? GRASS : GRASS_OUT;
      let k = vnoise(wx * 2.2, wy * 2.2) * 0.65 + vnoise(px / 3.1, py / 2.3) * 0.35;   // clumps + fine texture
      let i = k < .34 ? 0 : k < .46 ? 1 : k < .58 ? 2 : k < .7 ? 3 : 4;
      const r = hash2(px * 3 + 1, py * 5 + 2);
      if (r < .035 && i > 0) i -= 1; else if (r > .975 && i < 4) i += 1;            // single-pixel tufts
      if (hash2(px, py * 7) > .985 && hash2(py, px) > .5 && i >= 2) c = hex('#e7d77a'); else c = pal[i];   // rare flowers
    }
    const j = (py * W + px) * 4; d[j] = c[0]; d[j + 1] = c[1]; d[j + 2] = c[2]; d[j + 3] = 255;
  }
  g.putImageData(id, 0, 0); pixelCache.forEach((v, k) => { if (k.startsWith('ground#')) pixelCache.delete(k); });
}
function drawGround() {
  const key = [...world.roads].join('|') + '#' + Wd.BUILD.x1 + ',' + Wd.BUILD.y1 + ',' + Wd.BUILD.y0;   // ground depends on roads and the territory
  if (!groundCv || key !== groundKey) { groundKey = key; buildGround(); }
  const s = TWs() / APX, o = project(0, 0), want = s * DPR, m = Math.min(4, Math.max(1, Math.ceil(want - 0.02))), big = pixelUp('ground', groundCv, m);
  ctx.imageSmoothingEnabled = Math.abs(want - m) > 0.02; ctx.imageSmoothingQuality = 'high';
  ctx.drawImage(big, o.x - GOXA * s, o.y, groundCv.width * s, groundCv.height * s); ctx.imageSmoothingEnabled = true;
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
function b4(b) { const d = B4_DEFS[b.type], im = IMG['b4:' + b.type]; return d && okImg(im) ? { d, im } : null; }
function spriteRect(b) { const p4 = b4(b); if (p4) { const a = project(b.x + b.w, b.y + b.h), s = TWs() / ART_TILE, im = p4.im; return { x: a.x - p4.d.ax * s, y: a.y - p4.d.ay * s, w: im.width * s, h: im.height * s, s, anchor: a }; }
  const sp = SPR[b.type]; if (!sp) return null; const a = project(b.x + b.w, b.y + b.h), tw = TWs(), s = sp.grid ? tw / sp.tileW : ((b.w + b.h) * tw / 2) * sp.fit / sp.w; return { x: a.x - sp.ax * s, y: a.y - sp.ay * s, w: sp.w * s, h: sp.h * s, s, anchor: a }; }
function drawBuilding(b, ghost, ok) {
  const p4 = b4(b);
  if (p4) {   // pixel art: same sharp-bilinear path as characters, one shared art-pixel size
    const r = spriteRect(b), m = Math.max(1, Math.ceil(r.s * DPR - 0.02)), big = pixelUp('b4' + b.type, p4.im, m);
    ctx.save(); if (ghost) ctx.globalAlpha = ok ? .7 : .45; ctx.imageSmoothingEnabled = Math.abs(r.s * DPR - m) > 0.02; ctx.imageSmoothingQuality = 'high';
    ctx.drawImage(big, r.x, r.y, r.w, r.h); ctx.restore(); return;
  }
  const sp = SPR[b.type]; if (!sp || !okImg(sp.img)) return; const r = spriteRect(b), img = scaled('b:' + b.type, sp.img, r.w, r.h);   // anchor = SOUTH corner
  ctx.save(); ctx.imageSmoothingEnabled = true; ctx.imageSmoothingQuality = 'high'; if (ghost) ctx.globalAlpha = ok ? .7 : .45;
  ctx.drawImage(img, r.x, r.y, r.w, r.h); ctx.restore();
}
function drawProp(kind, tx, ty) {
  const im = IMG['prop:' + kind]; if (!okImg(im)) return; const p = project(tx + .5, ty + .5), tw = TWs();
  const cfg = { tree: { cw: 106, ax: 128, ay: 150, k: 1.0 }, crate: { cw: 215, ax: 128, ay: 246, k: .5 }, debris: { cw: 134, ax: 128, ay: 150, k: .75 } }[kind];
  const s = cfg.k * tw / cfg.cw, w = im.width * s, h = im.height * s; const sc = scaled('p:' + kind, im, w, h);
  ctx.imageSmoothingEnabled = true; ctx.drawImage(sc, p.x - cfg.ax * s, p.y - cfg.ay * s, w, h);
}
function drawSheet(key, img, frame, fw, fh, p, hScale, footY, content = 118, crisp = false, flip = false) {   // hScale = content height in tile widths; content = figure height in source px
  if (!okImg(img)) return; const tw = TWs(), sc = hScale * tw / content;
  ctx.fillStyle = 'rgba(0,0,0,.28)'; ctx.beginPath(); ctx.ellipse(p.x, p.y, .26 * tw * Math.max(1, hScale / CHAR_H), .09 * tw, 0, 0, 7); ctx.fill();
  if (crisp) {   // pixel art, "sharp bilinear": exact size (tracks zoom smoothly), nearest-neighbour pre-scale keeps pixels square and sharp
    const want = sc * DPR, m = Math.max(1, Math.ceil(want - 0.02)), big = pixelUp(key, img, m), snap = (v) => Math.round(v * DPR) / DPR;
    const w = fw * sc, h = fh * sc, y = snap(p.y - (footY + 1) * sc);
    ctx.imageSmoothingEnabled = Math.abs(want - m) > 0.02; ctx.imageSmoothingQuality = 'high';
    if (flip) { ctx.save(); ctx.translate(snap(p.x), 0); ctx.scale(-1, 1); ctx.drawImage(big, frame * fw * m, 0, fw * m, fh * m, -w / 2, y, w, h); ctx.restore(); }   // art faces left; mirrored = facing right
    else ctx.drawImage(big, frame * fw * m, 0, fw * m, fh * m, snap(p.x - w / 2), y, w, h);
    ctx.imageSmoothingEnabled = true; return; }
  ctx.imageSmoothingEnabled = true;
  if (sc >= .75) { ctx.drawImage(img, frame * fw, 0, fw, fh, p.x - fw * sc / 2, p.y - footY * sc, fw * sc, fh * sc); return; }
  const k = Math.max(.05, Math.round(sc * 32) / 32), sheet = scaled(key + 's', img, Math.round(img.width * k), Math.round(img.height * k));
  ctx.drawImage(sheet, Math.round(frame * fw * k), 0, Math.round(fw * k), sheet.height, p.x - fw * k / 2, p.y - footY * k, Math.round(fw * k), sheet.height);
}
const EMOJI = { Eating: '🍖', Drinking: '💧', Resting: '💤', Treatment: '💊', Shopping: '🛒', 'Getting food': '🥫', Working: '🔧' };
function bubble(p, txt) { ctx.font = `${Math.max(11, 13 * cam.z)}px sans-serif`; ctx.textAlign = 'center'; ctx.fillText(txt, p.x, p.y); }
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
function drawHuman(s) {
  if (insideBuilding(s)) return;   // hidden while inside
  const p = project(s.w.x, s.w.y); let f = 0;
  if (s.mode === 'down') f = 8; else if (s.carrying) f = 7; else if (s.mode === 'attack' || s.mode === 'recover') f = 1 + (Math.floor((tick + s.phase) / 5) % 4); else if (s.activity) f = 6; else if (s.moving) f = 1 + (Math.floor((tick + s.phase) / 6) % 4);
  const c4 = IMG['char4'], c4b = IMG['char4b'], fc = facing(s), back = fc.up && f <= 4 && c4b && okImg(c4b);   // back view only for idle/walk/attack frames
  if (back) drawSheet('c4b', c4b, f, CHAR4.fw, CHAR4.fh, p, CHAR_H, CHAR4.foot, CHAR4.content, true, fc.right);
  else if (c4 && okImg(c4)) drawSheet('c4', c4, f, CHAR4.fw, CHAR4.fh, p, CHAR_H, CHAR4.foot, CHAR4.content, true, fc.right); else drawSheet('c' + s.job, IMG['char:' + s.job] || IMG['char:Civilian'], f, 128, 160, p, CHAR_H, 147);
  const tw = TWs(), top = p.y - CHAR_H * tw - 3;
  if (s.hp < s.max || s.mode === 'attack' || s.mode === 'chase') { ctx.fillStyle = '#1a1715'; ctx.fillRect(p.x - 11 * cam.z, top, 22 * cam.z, 4 * cam.z); ctx.fillStyle = '#67c75a'; ctx.fillRect(p.x - 10 * cam.z, top + cam.z, 20 * cam.z * Math.max(0, s.hp / s.max), 2 * cam.z); }
  if (s.mode === 'down' && s.bleed != null) { const mx = bleedMax() + (s.bleed > bleedMax() ? s.bleed - bleedMax() : 0), fr = Math.max(0, Math.min(1, s.bleed / mx)), r = 13 * cam.z, cy = p.y - CHAR_H * tw * .45, carried = beingCarried(s); ctx.lineWidth = 3 * cam.z; ctx.strokeStyle = 'rgba(0,0,0,.6)'; ctx.beginPath(); ctx.arc(p.x, cy, r, 0, 7); ctx.stroke(); ctx.strokeStyle = carried ? '#6fc3ff' : fr < .25 ? '#ff3b30' : '#ffb347'; ctx.beginPath(); ctx.arc(p.x, cy, r, -Math.PI / 2, -Math.PI / 2 + fr * Math.PI * 2); ctx.stroke(); ctx.fillStyle = '#fff'; ctx.font = `bold ${Math.max(9, 10 * cam.z)}px monospace`; ctx.textAlign = 'center'; ctx.fillText(Math.ceil(s.bleed / 60), p.x, cy + 3 * cam.z); }
  const ic = s.activity ? EMOJI[s.activity] : (s.mode === 'chase' || s.mode === 'attack' ? '⚔️' : s.mode === 'rescueTo' || s.mode === 'rescueCarry' ? '🚑' : s.mode === 'down' ? '💀' : s.mode === 'hospital' ? '💊' : s.purpose === 'patrol' ? '🛡️' : (s.purpose || '').startsWith('scav') ? '🔍' : s.mode === 'wait' && s.idleBubble && (tick + s.phase) % 600 < 130 ? s.idleBubble : '');
  if (ic) bubble({ x: p.x, y: top - 3 }, ic);
  if (selected && selected.ref === s) { ctx.strokeStyle = '#ffe145'; ctx.lineWidth = 2; ctx.beginPath(); ctx.ellipse(p.x, p.y, .34 * tw, .14 * tw, 0, 0, 7); ctx.stroke(); ctx.fillStyle = '#fff0b0'; ctx.font = `bold ${Math.max(9, 10 * cam.z)}px monospace`; ctx.textAlign = 'center'; ctx.fillText(s.name, p.x, p.y + .32 * tw); }
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
function drawZombie(zm) {
  const p = project(zm.w.x, zm.w.y); let f = 0;
  if (zm.type === 'raider') {   /* placeholder art: the survivor body in raider colours */
    const fc = facing(zm), moving = ['rsneak', 'rflee', 'zchase'].includes(zm.mode) || zm.evadeT > 0; let fr = zm.mode === 'zattack' ? 1 + (Math.floor((tick + zm.phase) / 5) % 4) : moving ? 1 + (Math.floor((tick + zm.phase) / 6) % 4) : zm.mode === 'rsteal' ? 6 : 0;
    const back = fc.up && fr <= 4, src = back ? tinted('rb', IMG['char4b'], RAIDER_TINT) : tinted('rf', IMG['char4'], RAIDER_TINT);
    if (src) drawSheet(back ? 'rb' : 'rf', src, fr, CHAR4.fw, CHAR4.fh, p, CHAR_H, CHAR4.foot, CHAR4.content, true, fc.right);
    const tw = TWs(), top = p.y - CHAR_H * tw - 3; ctx.fillStyle = '#1a1715'; ctx.fillRect(p.x - 11 * cam.z, top, 22 * cam.z, 4 * cam.z); ctx.fillStyle = '#ff9a3a'; ctx.fillRect(p.x - 10 * cam.z, top + cam.z, 20 * cam.z * Math.max(0, zm.hp / zm.max), 2 * cam.z);
    if (zm.carried) { ctx.fillStyle = '#ffe06b'; ctx.font = `bold ${Math.max(9, 10 * cam.z)}px monospace`; ctx.textAlign = 'center'; ctx.fillText('$' + zm.carried, p.x, top - 3); }
    return;
  }
  if (zm.type === 'boss') {   /* placeholder art: the Brute in boss colours, with a big health bar */
    if (zm.mode === 'zattack') f = 5; else if (['zchase', 'zmarch'].includes(zm.mode)) f = 1 + (Math.floor((tick + zm.phase) / 7) % 4);
    const b = Z4_DEFS.brute, fc = facing(zm), back = fc.up && f <= 4, src = back ? tinted('bossb', IMG['z4b:brute'], BOSS_TINT) : tinted('bossf', IMG['z4:brute'], BOSS_TINT);
    if (src) drawSheet(back ? 'bossb' : 'bossf', src, f, b.fw, b.fh, p, 1, b.foot, APX, true, fc.right);
    const tw = TWs(), top = p.y - b.h * tw / APX - 8; ctx.fillStyle = '#1a1715'; ctx.fillRect(p.x - 26 * cam.z, top, 52 * cam.z, 6 * cam.z); ctx.fillStyle = '#c74bff'; ctx.fillRect(p.x - 25 * cam.z, top + cam.z, 50 * cam.z * Math.max(0, zm.hp / zm.max), 4 * cam.z);
    ctx.fillStyle = '#f2c8ff'; ctx.font = `bold ${Math.max(9, 10 * cam.z)}px monospace`; ctx.textAlign = 'center'; ctx.fillText('BOSS', p.x, top - 3); return;
  }
  if (zm.mode === 'zattack') f = 6; else if (zm.mode === 'zchase') f = 1 + (Math.floor((tick + zm.phase) / 6) % 4); else if (zm.mode === 'idle') f = Math.floor((tick + zm.phase) / 18) % 2 ? 1 : 0;
  const z4 = Z4_DEFS[zm.type], zf = IMG['z4:' + zm.type], zb = IMG['z4b:' + zm.type];
  if (z4 && zf && okImg(zf)) {   // pixel art: one art px = one map px; bigger zombies are drawn with more pixels, never scaled up
    const fc = facing(zm), back = fc.up && f <= 4 && zb && okImg(zb), f4 = zm.mode === 'zattack' ? 5 : f;
    drawSheet(back ? 'z4b' + zm.type : 'z4' + zm.type, back ? zb : zf, back ? f : f4, z4.fw, z4.fh, p, 1, z4.foot, APX, true, fc.right);
    const tw = TWs(), top = p.y - z4.h * tw / APX - 3; ctx.fillStyle = '#1a1715'; ctx.fillRect(p.x - 11 * cam.z, top, 22 * cam.z, 4 * cam.z); ctx.fillStyle = '#d84d48'; ctx.fillRect(p.x - 10 * cam.z, top + cam.z, 20 * cam.z * Math.max(0, zm.hp / zm.max), 2 * cam.z);
    return;
  }
  const sc = ZSCALE[zm.type] || 1; drawSheet('z' + zm.type, IMG['zombie:' + zm.type], f, 128, 160, p, CHAR_H * sc, 147);
  const tw = TWs(), top = p.y - CHAR_H * sc * tw - 3; ctx.fillStyle = '#1a1715'; ctx.fillRect(p.x - 11 * cam.z, top, 22 * cam.z, 4 * cam.z); ctx.fillStyle = '#d84d48'; ctx.fillRect(p.x - 10 * cam.z, top + cam.z, 20 * cam.z * Math.max(0, zm.hp / zm.max), 2 * cam.z);
}

/* ---------------- main draw ---------------- */
const TREE_SPOTS = [[0, 2], [2, 2], [4, 3], [7, 2], [10, 3], [13, 2], [15, 4], [0, 7], [1, 11], [0, 15], [1, 18], [4, 19], [7, 19], [10, 19], [13, 18], [15, 16], [15, 11], [14, 7], [1, 4], [13, 4], [1, 17], [14, 18]];
const CRATE_SPOTS = [[1, 6], [14, 13], [2, 19], [13, 5], [0, 12]];
const DEBRIS_SPOTS = [[3, 3], [6, 3], [9, 2], [12, 3], [1, 8], [14, 9], [0, 17], [5, 18], [11, 18], [15, 6], [15, 18]];
function draw() {
  ctx.setTransform(DPR, 0, 0, DPR, 0, 0); ctx.fillStyle = '#10241f'; ctx.fillRect(0, 0, VW, VH);
  drawGround();
  {
    const c = [[Wd.BUILD.x0, Wd.BUILD.y0], [Wd.BUILD.x1 + 1, Wd.BUILD.y0], [Wd.BUILD.x1 + 1, Wd.BUILD.y1 + 1], [Wd.BUILD.x0, Wd.BUILD.y1 + 1]].map(([x, y]) => project(x, y));
    ctx.beginPath(); ctx.moveTo(c[0].x, c[0].y); c.slice(1).forEach((p) => ctx.lineTo(p.x, p.y)); ctx.closePath(); ctx.strokeStyle = 'rgba(214,235,178,.28)'; ctx.lineWidth = Math.max(1, cam.z); ctx.stroke();
  }
  if (sel && sel.kind === 'wall') {
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
  const items = [];
  const box = (x, y, r) => ({ x1: x - r, y1: y - r, x2: x + r, y2: y + r });
  TREE_SPOTS.forEach(([x, y]) => { if (!Wd.buildingAt(world, x, y) && !Wd.wallAt(world, x, y)) items.push({ ...box(x + .5, y + .5, .22), fn: () => drawProp('tree', x, y) }); });
  CRATE_SPOTS.forEach(([x, y]) => !Wd.wallAt(world, x, y) && items.push({ ...box(x + .5, y + .5, .2), fn: () => drawProp('crate', x, y) }));
  DEBRIS_SPOTS.forEach(([x, y]) => !Wd.wallAt(world, x, y) && items.push({ ...box(x + .5, y + .5, .2), fn: () => drawProp('debris', x, y) }));
  for (const wl of world.walls.values()) items.push({ x1: wl.x, y1: wl.y, x2: wl.x + 1, y2: wl.y + 1, fn: () => drawWall(wl) });
  world.buildings.forEach((b) => items.push({ x1: b.x, y1: b.y, x2: b.x + b.w, y2: b.y + b.h, fn: () => { drawBuilding(b); if (selected && selected.ref === b) selectRing(b); drawStaffBadge(b); } }));
  if (preview && sel && sel.kind === 'building') items.push({ x1: preview.x, y1: preview.y, x2: preview.x + preview.w, y2: preview.y + preview.h, bias: .01, fn: () => drawBuilding(preview, true, preview.ok) });
  S.z.forEach((z) => { if (z.hp > 0) items.push({ ...box(z.w.x, z.w.y, .12), fn: () => drawZombie(z) }); });
  S.sv.forEach((s) => items.push({ ...box(s.w.x, s.w.y, .12), fn: () => drawHuman(s) }));
  Iso.sortDrawables(items).forEach((o) => o.fn());
  for (const f of floats) { const p = project(f.w.x, f.w.y); ctx.globalAlpha = Math.min(1, f.a / 15); ctx.fillStyle = f.col; ctx.font = `bold ${Math.max(10, 11 * cam.z)}px Arial`; ctx.textAlign = 'center'; ctx.fillText(f.t, p.x, p.y - CHAR_H * TWs() - 8 - (55 - f.a) * .25); ctx.globalAlpha = 1; }
  for (let i = floats.length - 1; i >= 0; i--) if (--floats[i].a <= 0) floats.splice(i, 1);
  if (debug) drawDebug();
}
/* walls: procedural placeholder art (no sprite sheet yet) — single-tile blocks that join their neighbours */
const WALL_COL = { wood: ['#b98f58', '#8d6a3e', '#6f512f'], metal: ['#aeb7bd', '#7f8b93', '#5f6b73'], gate: ['#c9a05c', '#9a7440', '#775629'] };
function drawWall(wl) {
  const def = Wd.WALL_DEFS[wl.type], col = WALL_COL[wl.type], hgt = (wl.type === 'metal' ? .78 : wl.type === 'gate' ? .62 : .55) * .527, f = wl.hp / wl.max, tw = TWs();
  const has = (dx, dy) => !!Wd.wallAt(world, wl.x + dx, wl.y + dy), m = .14;
  const x0 = wl.x + (has(-1, 0) ? 0 : m), x1 = wl.x + 1 - (has(1, 0) ? 0 : m), y0 = wl.y + (has(0, -1) ? 0 : m), y1 = wl.y + 1 - (has(0, 1) ? 0 : m);
  const P = (x, y, z) => { const p = project(x, y); return { x: p.x, y: p.y - z * tw }; };
  const shade = (c) => (wl.hit > 0 ? '#ffffff' : c), poly = (pts, fill) => { ctx.beginPath(); ctx.moveTo(pts[0].x, pts[0].y); pts.slice(1).forEach((q) => ctx.lineTo(q.x, q.y)); ctx.closePath(); ctx.fillStyle = fill; ctx.fill(); ctx.strokeStyle = 'rgba(20,14,8,.55)'; ctx.lineWidth = Math.max(1, cam.z * .8); ctx.stroke(); };
  if (wl.hit > 0) wl.hit--;
  // faces: south-west (left), south-east (right), top
  poly([P(x0, y1, 0), P(x1, y1, 0), P(x1, y1, hgt), P(x0, y1, hgt)], shade(col[1]));
  poly([P(x1, y1, 0), P(x1, y0, 0), P(x1, y0, hgt), P(x1, y1, hgt)], shade(col[2]));
  poly([P(x0, y0, hgt), P(x1, y0, hgt), P(x1, y1, hgt), P(x0, y1, hgt)], shade(col[0]));
  ctx.strokeStyle = 'rgba(30,20,10,.45)'; ctx.lineWidth = Math.max(1, cam.z * .7);
  for (const z of wl.type === 'metal' ? [hgt * .33, hgt * .66] : [hgt * .5]) { ctx.beginPath(); const a = P(x0, y1, z), b = P(x1, y1, z), c = P(x1, y0, z); ctx.moveTo(a.x, a.y); ctx.lineTo(b.x, b.y); ctx.lineTo(c.x, c.y); ctx.stroke(); }
  if (wl.type === 'gate') { const a = P(x0 + .5 * (x1 - x0), y1, 0), b = P(x0 + .5 * (x1 - x0), y1, hgt); ctx.strokeStyle = '#f3d27a'; ctx.lineWidth = Math.max(2, cam.z * 2); ctx.beginPath(); ctx.moveTo(a.x, a.y); ctx.lineTo(b.x, b.y); ctx.stroke(); }
  if (f < .6) { ctx.strokeStyle = '#2a1a10'; ctx.lineWidth = Math.max(1, cam.z); const c1 = P(x0 + .3 * (x1 - x0), y1, hgt * .85), c2 = P(x0 + .5 * (x1 - x0), y1, hgt * .35), c3 = P(x0 + .7 * (x1 - x0), y1, hgt * .7); ctx.beginPath(); ctx.moveTo(c1.x, c1.y); ctx.lineTo(c2.x, c2.y); ctx.lineTo(c3.x, c3.y); ctx.stroke(); }
  if (f < 1) { const p = P(wl.x + .5, wl.y + .5, hgt + .1); ctx.fillStyle = '#1a1715'; ctx.fillRect(p.x - 10 * cam.z, p.y - 2 * cam.z, 20 * cam.z, 4 * cam.z); ctx.fillStyle = f > .5 ? '#67c75a' : f > .25 ? '#e0b43c' : '#d84d48'; ctx.fillRect(p.x - 9 * cam.z, p.y - cam.z, 18 * cam.z * Math.max(0, f), 2 * cam.z); }
}
function drawStaffBadge(b) {            // small status dot: green = staffed (boosted when the worker is on site), amber = open slot
  const d = DEFS[b.type]; if (!d || !d.slot) return; const r = spriteRect(b); if (!r) return;
  const cx = r.anchor.x, cy = r.anchor.y - TWs() * (b.w + b.h) * .5 * .62, on = b.staff && b.staff.mode === 'work';
  ctx.save(); ctx.beginPath(); ctx.arc(cx, cy, Math.max(4, 5.5 * cam.z), 0, 7); ctx.fillStyle = b.staff ? (on ? '#4fd36a' : '#2f8f48') : 'rgba(240,176,48,.9)'; ctx.fill(); ctx.lineWidth = 1.5; ctx.strokeStyle = '#102418'; ctx.stroke();
  ctx.fillStyle = '#fff'; ctx.font = `bold ${Math.max(7, 8 * cam.z)}px Arial`; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillText(b.staff ? '✓' : '·', cx, cy + .5); ctx.restore();
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
const WALK = .0167, CHASE = .026, CARRY = .0133;
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
const LEVEL_CAP = 5;
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
};
const hasSkill = (s, k) => !!(s.skills && s.skills.includes(k));
/* ---------------- V2.14: survivor stats (DV2 + Fallout SPECIAL) and equipment ---------------- */
const STATS = ['str', 'end', 'agi', 'per', 'int', 'cha'];
const STAT_NAME = { str: 'Strength', end: 'Endurance', agi: 'Agility', per: 'Perception', int: 'Intelligence', cha: 'Charisma' };
const STAT_CAP = 20;
const JOB_STATS = { Civilian: ['cha', 'int'], Guard: ['str', 'end'], 'Police Officer': ['per', 'end'], Medic: ['int', 'cha'], Scavenger: ['agi', 'per'], Engineer: ['int', 'str'], Cook: ['cha', 'end'], Farmer: ['str', 'end'], Mechanic: ['int', 'str'], Paramedic: ['int', 'agi'], SWAT: ['per', 'str'] };
const ITEMS = {   // slot, attack (weapons), defence (armor), stat bonuses, parts cost (armory/crafting), ranged = attacks from ~2.4 tiles
  pipe: { name: 'Pipe', slot: 'weapon', atk: 6, cost: 0 }, knife: { name: 'Knife', slot: 'weapon', atk: 9, cost: 2 }, bat: { name: 'Bat', slot: 'weapon', atk: 14, cost: 4 },
  machete: { name: 'Machete', slot: 'weapon', atk: 19, cost: 6 }, axe: { name: 'Fire Axe', slot: 'weapon', atk: 25, cost: 9, st: { agi: -1 } },
  pistol: { name: 'Pistol', slot: 'weapon', atk: 17, cost: 8, ranged: true }, rifle: { name: 'Hunting Rifle', slot: 'weapon', atk: 27, cost: 12, ranged: true },
  jacket: { name: 'Work Jacket', slot: 'armor', def: 2, cost: 2 }, leather: { name: 'Leather Jacket', slot: 'armor', def: 4, cost: 4 },
  riot: { name: 'Riot Vest', slot: 'armor', def: 7, cost: 8, st: { agi: -1 } }, plate: { name: 'Scrap Plate', slot: 'armor', def: 10, cost: 11, st: { agi: -2 } },
  gloves: { name: 'Lifting Gloves', slot: 'acc', st: { str: 2 }, cost: 3 }, belt: { name: 'Back Brace', slot: 'acc', st: { end: 2 }, cost: 3 }, shoes: { name: 'Running Shoes', slot: 'acc', st: { agi: 2 }, cost: 3 },
  goggles: { name: 'Scope Goggles', slot: 'acc', st: { per: 2 }, cost: 3 }, glasses: { name: 'Reading Glasses', slot: 'acc', st: { int: 2 }, cost: 3 }, charm: { name: 'Lucky Charm', slot: 'acc', st: { cha: 2 }, cost: 3 },
  dogtags: { name: 'Dog Tags', slot: 'acc', st: { str: 1, end: 1, per: 1 }, cost: 6 },
};
const SLOTS = ['weapon', 'armor', 'acc'], SLOT_NAME = { weapon: 'Weapon', armor: 'Armor', acc: 'Accessory' };
const ARMORY_STOCK = { weapon: ['knife', 'bat', 'machete', 'pistol'], armor: ['jacket', 'leather', 'riot'] };   // what survivors can buy at an Armory with parts
const itemOf = (s, slot) => (s.eq && s.eq[slot] && ITEMS[s.eq[slot]]) || null;
const weaponOf = (s) => itemOf(s, 'weapon') || ITEMS.pipe;
function stat(s, k) { let v = (s.st && s.st[k]) || 5; for (const sl of SLOTS) { const it = itemOf(s, sl); if (it && it.st && it.st[k]) v += it.st[k]; } return Math.max(1, v); }
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
const skillMaxHp = (s) => (hasSkill(s, 'hardy') ? 10 : 0) + (hasSkill(s, 'tough') ? 15 : 0) + (hasSkill(s, 'strongBack') ? 10 : 0);
const baseMax = (s) => 48 + 8 * (s.l || 1) + 2 * stat(s, 'end') + skillMaxHp(s);   /* V2.14: Endurance adds HP */
const dmgReduce = (s) => (s && s.job !== undefined ? Math.min(.6, ((itemOf(s, 'armor') || {}).def || 0) * .03 + (stat(s, 'end') - 5) * .012) : 0);   /* armor + Endurance */
const skillDmg = (s) => (hasSkill(s, 'brawler') ? 3 : 0) + (hasSkill(s, 'steadyAim') ? 4 : 0);
const xpMult = (s) => (hasSkill(s, 'quickLearner') ? 1.25 : 1) * Math.max(.7, sMod(s, 'int', .03));
function gainXp(s, n) { if (!s || n <= 0) return; s.mastery = (s.mastery || 0) + n * xpMult(s); masteryCheck(s); }
function learnSkills(s, quiet = false) {   // grant every skill this survivor has earned in any profession
  s.skills = s.skills || []; const got = [];
  for (const [k, sk] of Object.entries(SKILLS)) { const c = s.cls && s.cls[sk.from]; if (c && c.l >= sk.at && !s.skills.includes(k)) { s.skills.push(k); got.push(sk.name); } }
  if (got.length && !quiet) { screenToast(`${s.name} learned ${got.join(', ')}`); say(`${s.name} learned ${got.join(', ')} (kept in every profession).`); }
  return got;
}
function syncClass(s) { s.cls = s.cls || {}; s.cls[s.job] = { l: s.l || 1, xp: s.mastery || 0 }; }
function setMaxHp(s) { const f = s.max ? s.hp / s.max : 1; s.max = baseMax(s); s.hp = Math.max(s.hp > 0 ? 1 : 0, Math.min(s.max, Math.round(s.max * f))); }
function changeProfession(s, job) {   // keeps every class level and every learned skill
  if (!s || s.job === job || !professions[job]) return false;
  syncClass(s); const c = s.cls[job] || { l: 1, xp: 0 }; s.job = job; s.l = c.l; s.mastery = c.xp; s.mastered = c.l >= LEVEL_CAP && c.xp >= (professions[job].master || 60);
  if (s.post && s.post.staff === s) { s.post.staff = null; } s.post = null; setMaxHp(s); syncClass(s);
  say(`${s.name} is now a ${job} (Lv.${s.l}).`); if (typeof autoStaff === 'function') autoStaff(); return true;
}
const ration = (s) => (RATION_BASE[s.job] || 1) * (1 + .1 * (Math.min(LEVEL_CAP, s.l || 1) - 1));   // rations per day (half food, half water)
const workBoost = (s) => .5 + .1 * (Math.min(LEVEL_CAP, s.l || 1) - 1);                            // matching-profession output boost (+50%, +10% per level above 1)
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
const MISSION_DEFS = [
  { id: 'clear', name: 'Clear the Perimeter', desc: 'Defeat 5 zombies', goal: 5, rewardParts: 5, rewardRen: 6 },
  { id: 'produce', name: 'Keep the Town Supplied', desc: 'Produce 16 food and water', goal: 16, rewardParts: 4, rewardRen: 5 },
  { id: 'build', name: 'Expand the Haven', desc: 'Construct 1 new facility', goal: 1, rewardParts: 3, rewardRen: 5 },
];
const TOWN_EVENT_DEFS = [
  { id: 'caravan', name: 'Trader Caravan', text: 'A caravan leaves food and water.', food: 3, water: 3, ren: 2 },
  { id: 'supplies', name: 'Supply Cache', text: 'Scavengers uncover some useful parts.', mat: 2, ren: 1 },
  { id: 'rumor', name: 'Safe Haven Rumor', text: 'Word of the Haven spreads.', ren: 4 },
];
const rankRules = [{ rank: 1, ren: 0, income: 0, residents: 0, facilities: 0 }, { rank: 2, ren: 25, income: 24, residents: 1, facilities: 4 }, { rank: 3, ren: 70, income: 70, residents: 2, facilities: 6 }, { rank: 4, ren: 150, income: 160, residents: 3, facilities: 8 }, { rank: 5, ren: 280, income: 320, residents: 4, facilities: 10 }];   // income = supplies produced
const MASTER_BONUS = {};

/* ---------------- helpers ---------------- */
const dist = (a, b) => Math.hypot(a.x - b.x, a.y - b.y);
const tileOf = (w) => ({ x: Math.max(0, Math.min(COLS - 1, Math.floor(w.x))), y: Math.max(0, Math.min(ROWS - 1, Math.floor(w.y))) });
const tc = (x, y) => ({ x: x + .5, y: y + .5 });
const rnd = () => Math.random();
function say(t) { const e = $('say'); e.textContent = t; e.style.opacity = 1; clearTimeout(say.t); say.t = setTimeout(() => (e.style.opacity = 0), 1700); }
function screenToast(t) { const d = document.createElement('div'); d.className = 'toast'; d.textContent = t; $('fx').appendChild(d); setTimeout(() => d.remove(), 1500); }
function renownGain(n, why = '') { S.ren += n; const el = $('ren'); if (el) { el.parentElement.classList.remove('renFlash'); void el.offsetWidth; el.parentElement.classList.add('renFlash'); } screenToast(`★ RENOWN +${n}${why ? ' · ' + why : ''}`); ui(); }
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
  if (!o.path || o.pathGoal !== gk || o.pathVer !== world.ver) {
    const p = Wd.findPath(world, tileOf(o.w), gt, o.job === undefined && !o.human); o.pathGoal = gk; o.pathVer = world.ver;
    if (!p) { o.path = null; return 'fail'; }
    o.path = p.map((q) => tc(q.x, q.y)); o.stuck = 0; o.lastD = 1e9;
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
  const o = mk0(name, job, l, x, y, i); o.st = rollStats(job, l); o.eq = { weapon: 'pipe', armor: null, acc: null }; o.tp = {}; o.cls = { [job]: { l, xp: 0 } }; o.skills = []; learnSkills(o, true); o.max = baseMax(o); o.hp = o.max; return o;
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
function enterFree(s, d = 110) { s.mode = 'free'; s.target = null; s.activity = null; s.stateTicks = d; s.dest = null; s.path = null; s.moving = false; s.purpose = null; }
function enterPost(s) { s.mode = 'postCombat'; s.target = null; s.stateTicks = 135 + s.i * 24; s.moving = false; s.path = null; s.why = 'Catching breath after a fight'; }
function needScore(s, b) {
  const r = facilityRules[b.type]; if (!r) return -999; let sc = 0;
  if (r.need === 'hunger') sc += s.hunger * 1.4; if (r.need === 'thirst') sc += s.thirst * 1.5; if (r.need === 'fatigue') sc += s.fatigue * 1.2;
  if (r.need === 'injury') sc += (1 - s.hp / s.max) * 140;
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
function chooseFacility(s) {
  const c = world.buildings.filter((b) => facilityRules[b.type] && facilityUsers(b) < cap(b)); if (!c.length) return null;
  c.sort((a, b) => needScore(s, b) - needScore(s, a)); return needScore(s, c[0]) > 24 ? c[0] : null;
}
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
  const cfg = jobAI[s.job] || jobAI.Civilian, rng = S.alert > 0 && (s.job === 'Guard' || s.job === 'Police Officer') ? 9 : cfg.aggro;
  let best = null, bs = 1e9;
  for (const z of S.z) {
    if (z.hp <= 0 || z.mode === 'appear') continue; const d = dist(s.w, z.w);
    const onPerson = z.target && z.target !== s && z.target.job !== undefined && ['zchase', 'zattack', 'zrecover'].includes(z.mode);
    const sneaking = z.human && z.mode === 'rsneak' && !z.carried && !(S.alert > 0);
    if (sneaking && d > 2.5 + (stat(s, 'per') - 5) * .15) continue;   /* raiders sneaking in are hard to spot */
    if (d > rng && !(onPerson && d <= rng + 3)) continue;
    if (s.hp < s.max * .6 && !onPerson) continue;   /* hurt fighters only step in to defend someone */
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
function assignRescue() {
  const downs = downedUnassigned(); if (!downs.length) return false; const free = S.sv.filter((r) => r.hp > 0 && ['free', 'postCombat', 'wait', 'work', 'goWork'].includes(r.mode) && !r.rescuing); if (!free.length) return false;
  let best = null, bs = -1e9; for (const q of downs) for (const r of free) { const sc = (jobAI[r.job] || jobAI.Civilian).rescue * 3 - dist(r.w, q.w); if (sc > bs) { bs = sc; best = { r, q }; } }
  best.q.rescuer = best.r; best.r.rescuing = best.q; best.r.target = null; best.r.facility = null; best.r.dest = null; best.r.path = null; best.r.mode = 'rescueTo'; best.r.why = `Rescuing ${best.q.name}`; say(`${best.r.name} is rescuing ${best.q.name}.`); return true;
}
function patrolDest() { const pts = [...world.roads].map((k) => k.split(',').map(Number)).filter(([x, y]) => y <= 9); const p = pts[Math.floor(rnd() * pts.length)] || [7, 7]; return tc(p[0], p[1]); }
function roamDest() { const here = tileOf(s_dummy), open = [...world.roads].map((k) => k.split(',').map(Number)); const p = open[Math.floor(rnd() * open.length)] || [7, 10]; return tc(p[0], p[1]); }
const s_dummy = { x: 7, y: 10 };
function chooseLifePurpose(s) {
  if (downedUnassigned().length) { assignRescue(); if (s.mode === 'rescueTo') return; }
  const cfg = jobAI[s.job] || jobAI.Civilian;
  if (acquireEnemy(s)) return;   // a zombie in sight comes before any errand
  if (rnd() < Math.min(.94, .58 * cfg.town) && chooseTownAction(s)) return;
  if (chooseTownAction(s)) return;
  if (s.post && s.post.staff === s && S.hour >= 6 && S.hour < 20 && rnd() < .85) { s.mode = 'goWork'; s.dest = null; s.path = null; s.stateTicks = 9999; s.why = 'Heading to work at ' + DEFS[s.post.type].name; return; }
  const r = rnd();
  if ((s.job === 'Guard' || s.job === 'Police Officer') && r < .35) { s.dest = patrolDest(); s.mode = 'walk'; s.purpose = 'patrol'; s.why = 'Patrolling the north road'; s.stateTicks = 700; return; }
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
  if (r.need === 'hunger') { if (S.food >= .5) s.hunger = Math.max(0, s.hunger - r.benefit * (hasSkill(s, 'fieldRations') ? 1.25 : 1) * (b && isWorking(b) && b.staff.job === 'Cook' ? 1.5 : 1) * (b && isWorking(b) ? Math.max(.8, sMod(b.staff, 'cha', .03)) : 1) * (1 + combos(b).meal) * (b.unpaid ? .5 : 1)); else floats.push({ w: { ...s.w }, t: 'NO FOOD', col: '#ff8a7a', a: 70 }); }
  if (r.need === 'thirst') { if (S.water >= .5) s.thirst = Math.max(0, s.thirst - r.benefit * (hasSkill(s, 'fieldRations') ? 1.25 : 1)); else floats.push({ w: { ...s.w }, t: 'NO WATER', col: '#ff8a7a', a: 70 }); }
  if (r.need === 'fatigue') s.fatigue = Math.max(0, s.fatigue - r.benefit);
  if (r.need === 'injury') { s.hp = Math.min(s.max, s.hp + r.benefit); }   // no medicine stock: care is limited by the building's tier, beds and the time it takes
  if (b.type === 'armory') { for (let n = 0; n < 2; n++) { const g = gearUpgrade(s); if (!g) break; if (g.buy) { S.mat -= Math.max(1, ITEMS[g.id].cost - (combos(b).arsenal ? 1 : 0)); stashAdd(g.id); } equip(s, g.id); screenToast(s.name + ' equipped ' + ITEMS[g.id].name + (g.buy ? ' · -' + ITEMS[g.id].cost + ' PARTS' : '')); s.sat += 2; say(s.name + (g.buy ? ' bought a ' : ' took a ') + ITEMS[g.id].name + ' at the Armory.'); } }
  if (r.need === 'train') {   /* each visit fills a stat's training bar; 100 = +1 permanent point */
    s.tp = s.tp || {}; s.st = s.st || rollStats(s.job, s.l); const k = r.stat, gainT = r.benefit * (b.q || 10) / 10 * Math.max(.7, sMod(s, 'int', .02)) * (1 + combos(b).train) * (b.unpaid ? .5 : 1);
    s.tp[k] = (s.tp[k] || 0) + gainT; s.fatigue = Math.min(100, s.fatigue + 6);
    while (s.tp[k] >= 100 && s.st[k] < STAT_CAP) { s.tp[k] -= 100; s.st[k]++; if (k === 'end') setMaxHp(s); screenToast(`${s.name} · ${STAT_NAME[k].toUpperCase()} ${s.st[k]}`); say(`${s.name}'s ${STAT_NAME[k]} rose to ${s.st[k]}.`); }
    floats.push({ w: { ...s.w }, t: '+' + STAT_NAME[k].slice(0, 3).toUpperCase(), col: '#b6f0ff', a: 60 });
  }
  gainXp(s, .5);   /* using town buildings teaches a little */
  if (isWorking(b) && b.staff !== s) gainXp(b.staff, r.need === 'injury' ? 3 : 1);   /* the staff member (medic, cook, farmer, engineer) learns from every visitor served */
  if (!s.resident && s.sat >= 35 && !s.requested) { s.requested = true; queueResidentRequest(s); }
  s.lastFacility = b; s.facility = null; s.activity = null; s.mode = 'free'; s.stateTicks = 120 + s.i * 28; s.cool = 0; s.why = 'Feeling better'; ui();
}
function ai(s) {
  if (s.cool > 0) s.cool--; if (s.stateTicks > 0) s.stateTicks--;
  if (tick % 90 === (s.i * 17) % 90 && !['down', 'hospital'].includes(s.mode)) { { const ns = (hasSkill(s, 'ironStomach') ? .8 : 1) * Math.max(.6, 1 - (stat(s, 'end') - 5) * .02); s.hunger = Math.min(100, s.hunger + .3 * ns); s.thirst = Math.min(100, s.thirst + .36 * ns); } /* V2.11.1: ~3.3 hunger / ~4 thirst per game hour (was ~17 / ~20, which pinned everyone at 100) */ s.fatigue = Math.min(100, s.fatigue + 1); starve(s); }
  if (s.fleeT > 0) s.fleeT--;
  if (hasSkill(s, 'firstAid') && tick % 300 === (s.i * 31) % 300 && s.hp > 0 && s.hp < s.max && !['chase', 'attack', 'recover', 'down'].includes(s.mode)) s.hp = Math.min(s.max, s.hp + 1);
  if (s.hp <= 0 && s.mode !== 'down') { s.hp = 0; s.mode = 'down'; s.target = null; s.dest = null; s.path = null; s.facility = null; s.activity = null; s.moving = false; s.rescuer = null; s.rescuing = null; s.carrying = null; s.why = 'Collapsed — needs rescue'; s.bleed = bleedMax(); s.warned = false; say(s.name + ' collapsed! Rescue within ' + Math.round(s.bleed / 60) + ' s.'); return; }
  if (s.mode === 'down') { s.moving = false; bleedTick(s); return; }
  if (['goFacility', 'useFacility', 'goWork', 'work', 'walk', 'wait', 'free'].includes(s.mode) && tick % 6 === s.i % 6 && !insideBuilding(s)) { const th = threatOf(s); if (th) { if (isFighter(s)) engage(s, th); else startHide(s, th); return; } }
  if (s.mode === 'hide') {   /* running for cover */
    const b = s.hideAt; if (!b || !world.buildings.includes(b)) { s.hideAt = null; enterFree(s, 30); return; }
    const r = followPath(s, Wd.doorPoint(b), CHASE); if (r === 'arrived') { s.mode = 'hiding'; s.stateTicks = 160; s.path = null; s.why = 'Hiding in ' + DEFS[b.type].name; } else if (r === 'fail') { const th = threatOf(s); s.hideAt = null; if (th) { engage(s, th); s.why = 'Cornered — fighting back'; } else enterFree(s, 40); } return;
  }
  if (s.mode === 'hiding') {   /* inside: hidden and safe; come out once the area is clear */
    s.moving = false; const b = s.hideAt; if (!b || !world.buildings.includes(b)) { s.hideAt = null; enterFree(s, 30); return; }
    if (s.stateTicks <= 0) { if (zombieNear(Wd.doorPoint(b), 3.5)) s.stateTicks = 90; else { s.hideAt = null; enterFree(s, 30); s.why = 'Coming out — area clear'; } } return;
  }   // being attacked beats lunch
  if (s.mode === 'hospital') { s.moving = false; if (s.stateTicks <= 0) { s.hp = Math.round(s.max * (bOf('hospital').length ? 1 : bOf('clinic').length ? .85 : .7)); s.fatigue = Math.max(0, s.fatigue - 35); enterFree(s, 420); s.why = 'Recovered'; say(s.name + ' recovered and returned.'); } return; }
  if (s.mode === 'rescueTo') {
    const q = s.rescuing; if (!q || q.mode !== 'down') { s.rescuing = null; enterPost(s); return; }
    const r = followPath(s, q.w, .02); if (r === 'arrived') { s.carrying = q; q.w = { x: s.w.x, y: s.w.y }; s.mode = 'rescueCarry'; s.path = null; s.why = `Carrying ${q.name} to ${medSite() ? DEFS[medSite().type].name : 'safety'}`; say(`${s.name} picked up ${q.name}.`); } else if (r === 'fail') { q.rescuer = null; s.rescuing = null; enterPost(s); } return;
  }
  if (s.mode === 'rescueCarry') {
    const q = s.carrying; if (!q) { enterPost(s); return; }
    const r = followPath(s, sitePoint(), CARRY); q.w = { x: s.w.x - .12, y: s.w.y - .05 };
    if (r === 'arrived' || r === 'fail') { q.w = { ...sitePoint() }; q.mode = 'hospital'; q.hp = 1; q.bleed = null; q.stateTicks = Math.round(careTicks() * (hasSkill(s, 'steadyHands') || (medSite() && medSite().staff && hasSkill(medSite().staff, 'steadyHands')) ? .7 : 1)); gainXp(s, 4); q.rescuer = null; q.why = 'Recovering in care'; q.path = null; s.carrying = null; s.rescuing = null; enterPost(s); say(q.name + ' reached ' + (medSite() ? DEFS[medSite().type].name : 'safety') + '.'); } return;
  }
  if (s.mode === 'goWork') {
    if (!s.post || !world.buildings.includes(s.post) || s.post.staff !== s) { s.post = null; enterFree(s, 30); return; }
    if (acquireEnemy(s) && ['Guard', 'Police Officer'].includes(s.job)) return;
    const r = followPath(s, Wd.doorPoint(s.post), WALK * 1.1);
    if (r === 'arrived') { s.mode = 'work'; s.activity = 'Working'; s.stateTicks = 600 + s.i * 25; s.path = null; s.why = 'Working at ' + DEFS[s.post.type].name; }
    else if (r === 'fail') { enterFree(s, 120); s.why = "Couldn't reach work — trying later"; } return;
  }
  if (s.mode === 'work') {
    s.moving = false; if (!s.post || !world.buildings.includes(s.post) || s.post.staff !== s) { s.post = null; s.activity = null; enterFree(s, 30); return; }
    if (downedUnassigned().length && tick % 30 === 0) { assignRescue(); if (s.mode === 'rescueTo') { s.activity = null; return; } }
    if (tick % 20 === s.i % 20 && acquireEnemy(s)) { s.activity = null; return; }
    if (tick % 1000 === (s.i * 37) % 1000) gainXp(s, 2);   /* every game hour on shift */
    if (s.stateTicks <= 0 || S.hour < 6 || S.hour >= 20) { s.activity = null; gainXp(s, 1); enterFree(s, 40); } return;
  }
  if (s.mode === 'goFacility') {
    if (!s.facility || !world.buildings.includes(s.facility)) { s.facility = null; enterFree(s, 25); return; }
    const r = followPath(s, Wd.doorPoint(s.facility), WALK * 1.15);
    if (r === 'arrived') { const ru = facilityRules[s.facility.type]; s.mode = 'useFacility'; s.activity = ru.label; s.stateTicks = ru.use + (ru.need === 'injury' ? Math.round(900 * (1 - s.hp / s.max)) : 0); s.path = null; s.why = ru.label + ' at ' + DEFS[s.facility.type].name; }
    else if (r === 'fail') { s.facility = null; enterFree(s, 90); s.why = "Couldn't reach it — trying later"; } return;
  }
  if (s.mode === 'useFacility') { s.moving = false; if (!s.facility || !world.buildings.includes(s.facility)) { s.facility = null; s.activity = null; enterFree(s, 40); return; } if (s.stateTicks <= 0) { finishFacility(s); s.stateTicks = 50 + s.i * 9; } return; }
  if (['chase', 'attack', 'recover'].includes(s.mode)) {
    if (!s.target || s.target.hp <= 0) { enterPost(s); return; }
    if (retreatCheck(s)) return;
    if (s.mode === 'chase') { const d = dist(s.w, s.target.w); if (d > (weaponOf(s).ranged ? 2.4 : .9)) { const r = followPath(s, s.target.w, CHASE); if (r === 'fail') { s.target = null; enterPost(s); } } else { s.moving = false; s.mode = 'attack'; s.path = null; s.stateTicks = 32 + s.i * 8; } return; }
    if (s.mode === 'attack') { s.moving = false; if (s.stateTicks <= 0) { const z = s.target, w = weaponOf(s), bonus = (professions[s.job]?.combat || 0) + skillDmg(s), dmg = Math.round(4 + w.atk * .55 + (w.ranged ? stat(s, 'per') : stat(s, 'str')) * .6 + bonus); z.hp -= dmg; floats.push({ w: { ...z.w }, t: '-' + dmg, col: '#ffe06b', a: 55 }); gainXp(s, .5);
      if (z.hp <= 0) { S.kills++; gainXp(s, 2); raiderDown(z); if (z.type === 'boss') { S.mat += 15; screenToast('☠ BOSS DEFEATED'); } const zd = zombieTypes[z.type] || zombieTypes.walker; if (rnd() < .25) { S.mat += 1; floats.push({ w: { ...z.w }, t: '+1 PARTS', col: '#9fe0ff', a: 70 }); } renownGain(zd.ren, zd.name + ' defeated'); say(s.name + ' defeated a ' + zd.name + '!'); if (S.stage === 1 && S.kills >= 3) { S.stage = 2; renownGain(10, 'Goal complete'); say('Goal complete!'); } enterPost(s); return; }
      s.mode = 'recover'; s.stateTicks = Math.round((48 + s.i * 9) * Math.max(.6, 1 - (stat(s, 'agi') - 5) * .02)); } return; }
    if (s.mode === 'recover') { s.moving = false; if (s.stateTicks <= 0) s.mode = 'chase'; } return;
  }
  if (s.mode === 'postCombat') { s.moving = false; if (downedUnassigned().length) { assignRescue(); if (s.mode === 'rescueTo') return; } if (s.stateTicks <= 0) enterFree(s, 20); return; }
  if (s.mode === 'wait') { s.moving = false; if (s.stateTicks <= 0) { s.mode = 'free'; s.stateTicks = 0; scavWait(s); } return; }
  if (s.mode === 'walk') {
    if (acquireEnemy(s) && (s.job === 'Guard' || s.job === 'Police Officer')) return;
    const r = s.dest ? followPath(s, s.dest, WALK) : 'arrived';
    if (r === 'moving' && s.stateTicks > 0) return;
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
  const pool = Object.entries(zombieTypes).filter(([k]) => k === 'walker' || k === 'crawler' || (k === 'runner' && S.rank >= 2) || ((k === 'bloated' || k === 'spitter') && S.rank >= 3) || (k === 'brute' && S.rank >= 4));
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
function spawn(x = null, y = null, type = null) {
  const a = spawnPoint(), kind = type || weightedZombie(), d = zombieTypes[kind];
  S.z.push({ type: kind, w: tc(x ?? a[0], y ?? a[1]), hp: d.hp, max: d.hp, cool: 35 + rnd() * 40, phase: rnd() * 100, dest: null, mode: 'appear', stateTicks: 45 + rnd() * 30, target: null, path: null, siege: rnd() < Math.min(.85, .08 + .12 * (S.rank - 1) + (world.walls.size ? .15 : 0) + (isNight() ? .25 : 0) + .05 * (S.terr || 0)), blocked: 0, goal: null, goalT: 0, wallT: null });
}
const isNight = () => S.hour >= 20 || S.hour < 6;   /* V2.12: dangerous nights, quieter days */
function monsterGeneration() {
  S.spawnClock++; const tr = S.terr || 0, base = 4 + S.rank + Math.floor(S.threat / 2) + 2 * tr, night = isNight();
  const desired = night ? Math.min(Math.round(base * 1.35), 12 + 3 * tr) : Math.max(2, Math.min(Math.round(base * .6), 8 + 2 * tr)), gap = (110 - Math.min(50, S.threat * 6)) * (night ? .5 : 1.6);
  if (activeZ() < desired && S.spawnClock > gap) { spawn(); S.spawnClock = 0; }
}
/* ---------------- V2.13 raiders: humans who dodge zombies, slip in through the gate, steal, fight, and run ---------------- */
const RAID_TARGETS = ['storage', 'canteen', 'farm', 'field', 'water', 'well', 'armory', 'workshop', 'house'];
function spawnRaid() {
  const n = Math.min(5, 2 + Math.floor(S.rank / 2) + (S.terr || 0) >> 0), a = spawnPoint();
  for (let i = 0; i < n; i++) { const d = zombieTypes.raider; S.z.push({ type: 'raider', human: true, w: tc(a[0] + (i % 2) * .4, a[1] + (i >> 1) * .4), home: tc(a[0], a[1]), hp: d.hp, max: d.hp, cool: 30, phase: rnd() * 100, mode: 'appear', stateTicks: 30 + i * 20, target: null, path: null, loot: { food: 0, water: 0, mat: 0 }, carried: 0, goalB: null, evadeT: 0 }); }
  screenToast('⚠ RAIDERS SPOTTED'); say(`${n} raiders are sneaking toward the Haven. They'll steal supplies and fight anyone in the way.`); S.alert = 1200;
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
    if (r === 'arrived' || r === 'fail' || dist(z.w, z.home) < .6) { if (z.carried) say(`A raider escaped with ${['food', 'water', 'mat'].filter((q) => z.loot[q]).map((q) => z.loot[q] + ' ' + (q === 'mat' ? 'parts' : q)).join(', ')}.`); z.hp = 0; z.escaped = true; }
  }
}
function raiderDown(z) {   /* a beaten raider drops what they carried */
  if (!z.human || z.escaped) return; for (const k of ['food', 'water', 'mat']) if (z.loot && z.loot[k]) { S[k] += z.loot[k]; floats.push({ w: { ...z.w }, t: '+' + z.loot[k] + ' ' + (k === 'mat' ? 'PARTS' : k.toUpperCase()) + ' RECOVERED', col: '#9fe58a', a: 80 }); }
}
/* ---------------- V2.13 boss: every 3rd night a boss leads a mob against the town ---------------- */
function spawnBoss() {
  const a = spawnPoint(), d = zombieTypes.boss, tr = S.terr || 0;
  const bhp = 260 + 70 * Math.max(0, S.rank - 1) + 60 * tr;
  S.z.push({ type: 'boss', boss: true, w: tc(a[0], a[1]), hp: bhp, max: bhp, cool: 40, phase: 0, dest: null, mode: 'appear', stateTicks: 60, target: null, path: null, siege: true, blocked: 0, goal: null, goalT: 0, wallT: null });
  S.z[S.z.length - 1].max = S.z[S.z.length - 1].hp;
  const mob = 3 + S.rank + 2 * tr; for (let i = 0; i < mob; i++) { spawn(Math.max(0, Math.min(COLS - 1, a[0] + (rnd() - .5) * 3)), Math.max(0, Math.min(ROWS - 1, a[1] + (rnd() - .5) * 3))); S.z[S.z.length - 1].siege = true; S.z[S.z.length - 1].mob = true; }
  screenToast('☠ A BOSS ATTACKS WITH ITS HORDE'); say(`A Mutant Boss is leading ${mob} zombies against the Haven!`); S.alert = 2400;
}
function eventSchedule() {   /* called every game hour */
  const now = S.day + S.hour / 24;
  if (S.day >= 3 && now >= S.nextRaid) { spawnRaid(); S.nextRaid = now + 2 + rnd() * 1.5; }
  if (S.day === S.nextBoss && S.hour === 18) { screenToast('☠ SOMETHING BIG IS COMING TONIGHT'); say('Scouts report a huge mutant gathering a horde. It will hit the Haven at 21:00.'); }
  if (S.day === S.nextBoss && S.hour === 21) { spawnBoss(); S.nextBoss += 3; }
  if (S.hour === 6) { const b = S.z.find((z) => z.type === 'boss' && z.hp > 0); if (b) { b.hp = 0; b.escaped = true; screenToast('☀ THE BOSS RETREATS AT DAWN'); say('The Mutant Boss slunk back into the wasteland. It will return.'); } S.z.forEach((z) => { if (z.mob) { z.siege = false; z.mob = false; } }); }
}
function alertPack(z, target) {   /* V2.12: zombies near one that spots a survivor join the chase */
  for (const o of S.z) if (o !== z && o.hp > 0 && o.mode === 'idle' && dist(o.w, z.w) < 2.5 && dist(o.w, target.w) < 6) { o.target = target; o.mode = 'zchase'; o.path = null; o.blocked = 0; }
}
function zai(z) {
  if (z.human && z.hp < z.max * .5 && ['zchase', 'zattack', 'zrecover'].includes(z.mode)) { z.mode = 'rflee'; z.target = null; z.path = null; }
  if (z.human && !['zchase', 'zattack', 'zrecover', 'appear'].includes(z.mode)) return rai(z);
  const d = zombieTypes[z.type] || zombieTypes.walker; if (z.cool > 0) z.cool--; if (z.stateTicks > 0) z.stateTicks--;
  if (z.mode === 'appear') { z.moving = false; if (z.stateTicks <= 0) { z.mode = 'idle'; z.stateTicks = 35 + rnd() * 70; } return; }
  if (z.mode === 'idle' && z.siege) { z.mode = 'zmarch'; z.goalT = 0; }
  if (z.mode === 'zmarch') {            // mobs head for the nearest survivor or building; elites aim for the weakest wall segment or the gate
    let best = null, bd = 1e9; for (const s of S.sv) if (s.hp > 0 && !['down', 'hospital'].includes(s.mode) && !insideBuilding(s)) { const dd = dist(s.w, z.w); if (dd < bd) { bd = dd; best = s; } }
    if (best && bd < d.aggro) { z.target = best; z.mode = 'zchase'; z.path = null; z.blocked = 0; alertPack(z, best); return; }
    if (--z.goalT <= 0) { z.goal = siegeGoal(z); z.goalT = 90; }
    zWalk(z, z.goal, d.chase * .8); return;
  }
  if (z.mode === 'zbreak') {
    const wl = z.wallT; z.moving = false;
    if (!wl || world.walls.get(wl.x + ',' + wl.y) !== wl) { z.wallT = null; z.mode = z.siege ? 'zmarch' : 'idle'; z.blocked = 0; z.stateTicks = 20; return; }
    if (z.stateTicks <= 0) { const dmg = d.atk * (z.type === 'brute' ? 2.5 : z.type === 'boss' ? 4 : 1); wl.hp -= dmg; wl.hit = 14; floats.push({ w: { x: wl.x + .5, y: wl.y + .5 }, t: '-' + Math.round(dmg), col: '#ffb27a', a: 45 }); z.stateTicks = z.type === 'brute' ? 60 : z.type === 'runner' ? 34 : 46;
      if (wl.hp <= 0) wallBroken(wl); }
    let best = null, bd = 1.1; for (const s of S.sv) if (s.hp > 0 && !['down', 'hospital'].includes(s.mode) && !insideBuilding(s)) { const dd = dist(s.w, z.w); if (dd < bd) { bd = dd; best = s; } }
    if (best) { z.target = best; z.mode = 'zchase'; z.wallT = null; z.path = null; } return;
  }
  if (z.mode === 'idle') {
    if (!z.dest || z.stateTicks <= 0) { z.dest = { x: z.w.x + (rnd() - .5) * 3, y: z.w.y + (rnd() - .5) * 3 }; z.stateTicks = 60 + rnd() * 100; }
    if (z.dest) moveSlide(z, z.dest, d.chase * .35);
    let best = null, bd = 1e9; for (const s of S.sv) if (s.hp > 0 && !['down', 'hospital'].includes(s.mode) && !insideBuilding(s)) { const dd = dist(s.w, z.w); if (dd < bd) { bd = dd; best = s; } }
    if (best && bd < d.aggro) { z.target = best; z.mode = 'zchase'; z.path = null; alertPack(z, best); } return;
  }
  if (z.mode === 'zchase') {
    if (!z.target || z.target.hp <= 0 || ['down', 'hospital'].includes(z.target.mode) || insideBuilding(z.target)) { z.target = null; z.mode = z.siege ? 'zmarch' : 'idle'; z.stateTicks = 40; return; }
    const dd = dist(z.target.w, z.w); if (dd > 4.8) { z.target = null; z.mode = 'idle'; z.stateTicks = 60; return; }
    if (z.type === 'spitter' && dd < 2.8) { z.mode = 'zattack'; z.stateTicks = 34; } else if (dd > .8) { if (followPath(z, z.target.w, d.chase) === 'fail') zWalk(z, z.target.w, d.chase, true); } else { z.mode = 'zattack'; z.stateTicks = 26; } return;
  }
  if (z.mode === 'zattack') { z.moving = false; if (z.stateTicks <= 0) { if (z.target && z.target.hp > 0 && !insideBuilding(z.target)) { const dmg = Math.max(1, Math.round((d.atk + (z.type === 'brute' ? 2 : 0)) * (hasSkill(z.target, 'armored') ? .8 : 1) * (1 - dmgReduce(z.target)))); z.target.hp -= dmg; floats.push({ w: { ...z.target.w }, t: '-' + dmg, col: '#ff6e62', a: 55 }); } z.mode = 'zrecover'; z.stateTicks = (z.type === 'runner' ? 38 : z.type === 'brute' ? 82 : 58) + rnd() * 22; } return; }
  if (z.mode === 'zrecover') { if (z.stateTicks <= 0) z.mode = z.target && z.target.hp > 0 ? 'zchase' : (z.siege ? 'zmarch' : 'idle'); }
}
/* ---------------- walls: zombies march, break segments, repairs, breach alert ---------------- */
const wallAtTile = (x, y) => world.walls.get(x + ',' + y) || null;
function siegeGoal(z) {
  const d = zombieTypes[z.type] || zombieTypes.walker, elite = z.type === 'spitter' || z.type === 'brute' || z.type === 'boss';
  if (elite && world.walls.size) {   // elites are smarter: they go for the gate; with no gate they pick the weakest segment
    let best = null, bs = 1e9; for (const wl of world.walls.values()) if (wl.type === 'gate') { const sc = dist(z.w, { x: wl.x + .5, y: wl.y + .5 }); if (sc < bs) { bs = sc; best = wl; } }
    if (!best) for (const wl of world.walls.values()) { const sc = wl.hp + dist(z.w, { x: wl.x + .5, y: wl.y + .5 }) * 6; if (sc < bs) { bs = sc; best = wl; } }
    return { x: best.x + .5, y: best.y + .5 }; }
  let g = null, gd = 1e9; for (const s of S.sv) if (s.hp > 0 && !insideBuilding(s)) { const dd = dist(s.w, z.w); if (dd < gd) { gd = dd; g = s.w; } }
  for (const b of world.buildings) { const c = { x: b.x + b.w / 2, y: b.y + b.h / 2 }, dd = dist(c, z.w); if (dd < gd) { gd = dd; g = c; } }
  return g ? { x: g.x, y: g.y } : tc(7, 11);
}
function zWalk(z, goal, sp, viaPath = false) {   // slide toward the goal; when walls hold it still for a moment, start breaking the nearest one
  const bx = z.w.x, by = z.w.y; if (!goal) return; moveSlide(z, goal, sp);
  if (Math.hypot(z.w.x - bx, z.w.y - by) < sp * .3) z.blocked++; else z.blocked = 0;
  if (z.blocked > 8) { const tx = Math.floor(z.w.x), ty = Math.floor(z.w.y); let best = null, bd = 1e9;
    for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) { const wl = wallAtTile(tx + dx, ty + dy); if (!wl) continue; const dd = dist({ x: tx + dx + .5, y: ty + dy + .5 }, goal); if (dd < bd) { bd = dd; best = wl; } }
    if (best) { z.wallT = best; z.mode = 'zbreak'; z.stateTicks = 20; z.blocked = 0; z.path = null; } else if (z.blocked > 120) { z.goalT = 0; z.blocked = 0; z.dest = null; }
  }
}
function wallBroken(wl) {
  world.walls.delete(wl.x + ',' + wl.y); Wd.bump(world); S.alert = 1800; const gate = wl.type === 'gate';
  screenToast('⚠ ' + (gate ? 'GATE' : 'WALL') + ' BREACHED'); say((gate ? 'The gate' : 'A wall section') + ' was broken!'); ui();
}
let repairFrac = 0;
function autoRepair() {   // every second: the most damaged segment with no zombie close by is patched up; engineers and mechanics work twice as fast; repairs cost parts
  let best = null, bs = 1; for (const wl of world.walls.values()) { if (wl.hp >= wl.max) continue; const f = wl.hp / wl.max; if (f < bs && !S.z.some((z) => z.hp > 0 && dist(z.w, { x: wl.x + .5, y: wl.y + .5 }) < 2.6)) { bs = f; best = wl; } }
  if (!best) return; const fast = S.sv.some((q) => q.hp > 0 && (q.job === 'Engineer' || q.job === 'Mechanic' || hasSkill(q, 'handy'))), amt = Math.min(best.max - best.hp, fast ? 8 : 4), cost = amt / 16;
  repairFrac += cost; if (repairFrac >= 1) { if (S.mat < 1) { repairFrac = 1; return; } S.mat -= 1; repairFrac -= 1; }
  best.hp += amt; if (best.hp >= best.max) { best.hp = best.max; floats.push({ w: { x: best.x + .5, y: best.y + .5 }, t: 'REPAIRED', col: '#9fe58a', a: 50 }); }
}

/* ---------------- town systems ---------------- */
function masteryCheck(s) {      // experience: each level raises the work boost and the daily ration; capped at LEVEL_CAP
  const p = professions[s.job]; if (!p || s.mastery < p.master) return;
  if ((s.l || 1) < LEVEL_CAP) { s.l = (s.l || 1) + 1; s.mastery = 0; s.mastered = false; s.st = s.st || rollStats(s.job, 1); for (const k of (JOB_STATS[s.job] || [])) s.st[k] = Math.min(STAT_CAP, s.st[k] + 1); syncClass(s); setMaxHp(s); s.hp = Math.min(s.max, s.hp + 8); renownGain(1, `${s.name} reached ${s.job} Lv.${s.l}`); screenToast(`${s.name} · ${s.job.toUpperCase()} LV ${s.l}`); learnSkills(s); }
  else if (!s.mastered) { syncClass(s); s.mastered = true; renownGain(2, s.name + ' mastered ' + s.job); screenToast(s.name + ' MASTERED ' + s.job); }
}

/* ---------------- supplies: production, staffing, rations, upgrades ---------------- */
const SUPPLY_BASE_CAP = 60, SUPPLY_PER_STORAGE = 40;
const supplyCap = () => SUPPLY_BASE_CAP + SUPPLY_PER_STORAGE * bOf('storage').length;
const isWorking = (b) => !!(b.staff && b.staff.mode === 'work' && b.staff.hp > 0);
const BUILDING_STAT = { farm: 'str', field: 'str', water: 'per', well: 'per', medic: 'int', clinic: 'int', hospital: 'int', canteen: 'cha', workshop: 'int', scrapyard: 'str' };
const prodMult = (b) => (b.unpaid ? .5 : 1) * (1 + combos(b).prod) * (1 + (isWorking(b) ? workBoost(b.staff) + (BUILDING_STAT[b.type] ? (stat(b.staff, BUILDING_STAT[b.type]) - 5) * .03 : 0) + (hasSkill(b.staff, 'efficient') ? .15 : 0) + (hasSkill(b.staff, 'greenThumb') ? .2 : 0) : 0));
const dayLog = { foodIn: 0, waterIn: 0 };
/* ---------------- V2.15 upkeep: every building costs parts each day; unpaid buildings run at half output ---------------- */
const UPKEEP = { house: .2, water: .3, well: .5, farm: .3, field: .5, medic: .4, clinic: .7, hospital: 1.1, canteen: .4, armory: .4, workshop: .6, storage: .3, barracks: .6, scrapyard: .2, gym: .3, library: .3, lounge: .3, range: .4, track: .3, sparring: .3 };
const upkeepOf = (b) => UPKEEP[b.type] ?? .3;
const upkeepTotal = () => world.buildings.reduce((a, b) => a + upkeepOf(b), 0);
function payUpkeep() {   /* at day end: pay in order of importance (water, food, medical first); what can't be paid runs at half output tomorrow */
  const order = ['water', 'well', 'farm', 'field', 'medic', 'clinic', 'hospital', 'scrapyard', 'canteen', 'house'];
  const list = [...world.buildings].sort((a, b) => ((order.indexOf(a.type) + 1) || 99) - ((order.indexOf(b.type) + 1) || 99));
  let paid = 0, unpaid = 0; for (const b of list) { const c = upkeepOf(b); if (S.mat >= c) { S.mat -= c; paid += c; b.unpaid = false; } else { b.unpaid = true; unpaid++; } }
  if (unpaid) { screenToast(`⚠ ${unpaid} BUILDING${unpaid > 1 ? 'S' : ''} UNPAID — HALF OUTPUT`); say(`Not enough parts for upkeep: ${unpaid} building${unpaid > 1 ? 's run' : ' runs'} at half output tomorrow. Build a Scrapyard or scavenge for parts.`); }
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
function hourlyProduction() {   // runs every game hour
  let fi = 0, wi = 0;
  for (const b of world.buildings) {
    const d = DEFS[b.type]; if (!d) continue;
    if (d.fam === 'water') { const a = d.out / 24 * prodMult(b); S.water = Math.min(supplyCap(), S.water + a); wi += a; }
    if (d.fam === 'scrap') { const a = d.out / 24 * prodMult(b); S.mat += a; }
    if (d.fam === 'farm') { const need = d.waterUse / 24, frac = need > 0 ? Math.min(1, S.water / need) : 1; S.water -= need * frac; const a = d.out / 24 * frac * prodMult(b); S.food = Math.min(supplyCap(), S.food + a); fi += a; }
  }
  S.produced += fi + wi; dayLog.foodIn += fi; dayLog.waterIn += wi;
}
function supplyStats() {         // per-day picture for the Town panel (assumes staffed buildings are being worked)
  let need = 0, fIn = 0, wIn = 0, wUse = 0;
  for (const q of S.sv) need += ration(q);
  for (const b of world.buildings) { const d = DEFS[b.type]; if (!d) continue; const m = b.staff ? 1 + workBoost(b.staff) : 1; if (d.fam === 'water') wIn += d.out * m; if (d.fam === 'farm') { fIn += d.out * m; wUse += d.waterUse; } }
  const fNet = fIn - need / 2, wNet = wIn - wUse - need / 2;
  return { need, fIn, wIn, wUse, fNet, wNet, fDays: fNet >= 0 ? Infinity : S.food / -fNet, wDays: wNet >= 0 ? Infinity : S.water / -wNet };
}
function endOfDay() {            // rations: every survivor eats half food, half water; a shortfall makes them hungry and thirsty (gentle, no damage yet)
  const up = payUpkeep();
  let nf = 0, nw = 0; for (const q of S.sv) { nf += ration(q) / 2; nw += ration(q) / 2; }
  const ef = Math.min(S.food, nf), ew = Math.min(S.water, nw); S.food -= ef; S.water -= ew;
  const ff = nf ? ef / nf : 1, fw = nw ? ew / nw : 1;
  for (const q of S.sv) { q.hunger = ff < 1 ? Math.min(100, q.hunger + 28 * (1 - ff)) : Math.max(0, q.hunger - 35); q.thirst = fw < 1 ? Math.min(100, q.thirst + 28 * (1 - fw)) : Math.max(0, q.thirst - 35); } /* a full ration relieves the meters; a shortfall raises them */
  const open = world.buildings.filter((b) => DEFS[b.type].slot && !b.staff).map((b) => DEFS[b.type].name);
  const f1 = (n) => (Math.round(n * 10) / 10).toFixed(1);
  say(`Day ${S.day - 1} · Food +${f1(dayLog.foodIn)} −${f1(ef)} · Water +${f1(dayLog.waterIn)} −${f1(ew)} · Upkeep −${f1(up.paid)} parts${up.unpaid ? ` (${up.unpaid} unpaid)` : ''}` + (open.length ? ` · Open staff slot: ${[...new Set(open)].join(', ')}` : ''));
  dayLog.foodIn = dayLog.waterIn = 0;
  if (ff < 1) screenToast('⚠ OUT OF FOOD'); else if (S.food < nf) screenToast('⚠ FOOD: under 1 day left');
  if (fw < 1) screenToast('⚠ OUT OF WATER'); else if (S.water < nw) screenToast('⚠ WATER: under 1 day left');
}
function releasePost(b) { if (b.staff) { if (b.staff.post === b) b.staff.post = null; b.staff = null; } }
function autoStaff() {           // one slot per building; a matching profession is assigned automatically, the best level first
  for (const q of S.sv) if (q.post && (!world.buildings.includes(q.post) || q.post.staff !== q)) q.post = null;
  for (const b of world.buildings) {
    const d = DEFS[b.type]; if (!d || !d.slot) continue; const jobs = STAFF_JOBS[d.fam] || [];
    if (b.staff && (!S.sv.includes(b.staff) || !jobs.includes(b.staff.job))) releasePost(b);
    if (b.staff) continue;
    const c = S.sv.filter((q) => !q.post && q.hp > 0 && !['down', 'hospital'].includes(q.mode) && jobs.includes(q.job)).sort((x, y) => (y.l - x.l) || (dist(x.w, Wd.doorPoint(b)) - dist(y.w, Wd.doorPoint(b))));
    if (c.length) { b.staff = c[0]; c[0].post = b; say(`${c[0].name} will staff the ${d.name}.`); }
  }
}
function upgradeCheck(b) {
  const d = DEFS[b.type], n = d.next && DEFS[d.next]; if (!n) return { ok: false, why: 'Already the highest tier available' };
  if (S.rank < n.rank) return { ok: false, why: `Needs Haven rank ${n.rank}` };
  if (S.mat < d.up) return { ok: false, why: `Needs ${d.up} parts` };
  if (n.w !== b.w || n.h !== b.h) return { ok: false, why: 'Footprint differs' };
  const chk = Wd.placementCheck(world, b.x, b.y, n, b); if (!chk.ok) return { ok: false, why: chk.why };
  return { ok: true, why: '' };
}
function upgradeBuilding(b) {    // in place: same footprint, same anchor; the building keeps working and keeps its staff
  const c = upgradeCheck(b); if (!c.ok) { say(c.why); return false; }
  const d = DEFS[b.type], n = DEFS[d.next]; S.mat -= d.up; b.type = d.next; b.q = n.q; b.a = n.a; Wd.bump(world);
  renownGain(2, n.name); screenToast('⬆ ' + n.name.toUpperCase()); say(`${d.name} upgraded to ${n.name}.`); autoStaff(); saveGame(); ui(); return true;
}
function queueResidentRequest(s) { S.requests.push({ type: 'resident', s }); showNextRequest(); }
function showNextRequest() {
  const box = $('requestBox'); if (!box || box.innerHTML || !S.requests.length) return; const q = S.requests[0], s = q.s;
  box.innerHTML = `<div class="request"><b>🏠 MOVE-IN REQUEST</b><br>${s.name} wants to make Zombie Haven home.<br>Satisfaction ♥${Math.floor(s.sat)}<br><button id="acceptReq" style="background:#3f8f4f;color:#fff">ACCEPT</button><button id="declineReq" style="background:#a74b45;color:#fff">NOT YET</button></div>`;
  $('acceptReq').onclick = () => { s.resident = true; renownGain(4, 'New resident'); say(s.name + ' became a resident!'); S.requests.shift(); box.innerHTML = ''; showNextRequest(); ui(); };
  $('declineReq').onclick = () => { s.requested = false; s.sat = Math.max(20, s.sat - 5); S.requests.shift(); box.innerHTML = ''; showNextRequest(); ui(); };
}
function visitorArrival() {
  S.arrivalClock++; if (S.arrivalClock < 2200 || S.sv.length + (S.trip ? S.trip.members.length : 0) >= 8) return; S.arrivalClock = 0;
  const names = ['Noah', 'Maya', 'Eli', 'June', 'Rosa', 'Theo'], jobs = ['Civilian', 'Scavenger', 'Guard', 'Medic', 'Farmer', 'Engineer', 'Cook'];
  const name = names.find((n) => !S.sv.some((s) => s.name === n)) || 'Survivor ' + (S.sv.length + 1), job = jobs[Math.floor(rnd() * jobs.length)], v = mk(name, job, 1, 7, 6, S.sv.length);
  v.sat = 3; v.stateTicks = 80; giveSpare(v); S.sv.push(v); showEventPopup({ title: 'NEW SURVIVOR', text: name + ', a ' + job + ', has arrived at the Haven and is looking around.', gains: job + ' · Lv.1' }); say(name + ' arrived at the Haven.'); ui();
}
function beginMission(id = null) { const d = id ? MISSION_DEFS.find((m) => m.id === id) : MISSION_DEFS[Math.floor(rnd() * MISSION_DEFS.length)]; S.mission = { ...d, progress: 0 }; S.missionStart = { kills: S.kills, produced: S.produced, built: S.builtCount }; say('Mission: ' + d.name); ui(); }
function missionProgress() {
  if (!S.mission) { beginMission(); return; } const m = S.mission; let p = 0;
  if (m.id === 'clear') p = S.kills - S.missionStart.kills; if (m.id === 'produce') p = S.produced - S.missionStart.produced; if (m.id === 'build') p = S.builtCount - S.missionStart.built;
  m.progress = Math.max(0, Math.min(m.goal, p));
  if (m.progress >= m.goal) { S.mat += m.rewardParts; screenToast('+' + m.rewardParts + ' PARTS · mission reward'); renownGain(m.rewardRen, m.name); screenToast('MISSION COMPLETE · ' + m.name); S.mission = null; setTimeout(() => beginMission(), 1200); }
}
const eventQueue = []; let modalOpen = false;
function showEventPopup(o) { eventQueue.push(o); nextEventPopup(); }
function nextEventPopup() {
  const m = $('eventModal'); if (!m || m.innerHTML || !eventQueue.length) return; const e = eventQueue.shift(); modalOpen = true;
  const bt = e.buttons && e.buttons.length ? e.buttons : [{ label: 'OK' }];
  m.innerHTML = `<div class="evBox"><div class="evTitle">${e.title}</div><div class="evText">${e.text}</div>${e.gains ? `<div class="evGain">${e.gains}</div>` : ''}${bt.map((b, i) => `<button data-i="${i}"${i === 0 ? ' id="eventOk"' : ''} style="margin:0 4px">${b.label}</button>`).join('')}</div>`;
  m.querySelectorAll('button').forEach((el) => { el.onclick = () => { const b = bt[+el.dataset.i]; m.innerHTML = ''; modalOpen = false; if (b && b.fn) b.fn(); nextEventPopup(); }; });
}
function triggerTownEvent() { const e = TOWN_EVENT_DEFS[Math.floor(rnd() * TOWN_EVENT_DEFS.length)]; if (e.food) S.food += e.food; if (e.water) S.water += e.water; if (e.mat) S.mat += e.mat; if (e.ren) renownGain(e.ren, e.name); const g = []; if (e.food) g.push('+' + e.food + ' food'); if (e.water) g.push('+' + e.water + ' water'); if (e.mat) g.push('+' + e.mat + ' parts'); if (e.ren) g.push('+' + e.ren + ' renown'); showEventPopup({ title: e.name.toUpperCase(), text: e.text, gains: g.join(' · ') }); ui(); }
const residents = () => S.sv.filter((s) => s.resident).length;
function checkRank() {
  const n = rankRules[S.rank]; if (!n) return;
  if (S.ren >= n.ren && S.produced >= n.income && residents() >= n.residents && world.buildings.length >= n.facilities) { S.rank++; S.threat++; S.mat += 4 + S.rank; renownGain(5, 'Haven Rank ' + S.rank); showEventPopup({ title: '★ HAVEN RANK ' + S.rank + ' ★', text: 'Word of the Haven spreads. New threats and new opportunities lie ahead.', gains: '+' + (4 + S.rank) + ' parts' }); say('HAVEN RANK ' + S.rank + '! New threats and opportunities.'); ui(); }
}
function ui() {
  $('food').textContent = Math.floor(S.food); $('water').textContent = Math.floor(S.water); $('mat').textContent = Math.floor(S.mat); $('ren').textContent = S.ren; $('rank').textContent = '★'.repeat(S.rank); $('threat').textContent = S.threat;
  $('clock').textContent = `DAY ${S.day} · ${String(S.hour).padStart(2, '0')}:00`;
  $('qt').textContent = S.stage === 0 ? 'Build a Rain Collector' : S.stage === 1 ? `Defeat 3 Walkers (${Math.min(S.kills, 3)}/3)` : (S.mission ? `${S.mission.name}: ${Math.floor(S.mission.progress)}/${S.mission.goal}` : 'Grow the Haven!');
}

/* ---------------- save / load / migration ---------------- */
const SKIP = new Set(['post', 'target', 'facility', 'rescuer', 'rescuing', 'carrying', 'path', 'pathGoal', 'pathVer', 'lastFacility', 'moving', 'stuck', 'lastD']);
function serialize() {
  const sv = S.sv.map((s) => { const o = {}; for (const k in s) if (!SKIP.has(k)) o[k] = s[k]; return o; });
  const { requests, sv: _sv, z: _z, ...rest } = S;
  return JSON.stringify({ version: VERSION, S: rest, sv, roads: [...world.roads], walls: [...world.walls.values()].map((w) => [w.x, w.y, w.type, Math.round(w.hp)]), buildings: world.buildings.map((b) => ({ type: b.type, x: b.x, y: b.y, w: b.w, h: b.h, q: b.q, a: b.a, unpaid: !!b.unpaid, staffId: b.staff ? b.staff.id : null })), cam: { x: cam.x, y: cam.y, z: cam.z }, time: Date.now() });
}
function saveGame() { try { localStorage.setItem(SAVE_KEY, serialize()); S.lastSave = tick; } catch (e) { /* storage unavailable */ } }
function relinkSurvivor(s) {
  if (!s.st) s.st = rollStats(s.job, s.l); if (!s.tp) s.tp = {}; if (!s.eq) { const nm = s.weapon && s.weapon[0], id = Object.keys(ITEMS).find((k) => ITEMS[k].name === nm) || 'pipe'; s.eq = { weapon: id, armor: null, acc: null }; } delete s.weapon;   /* V2.14 save upgrade: stats + gear slots */
  if (!s.cls) { s.cls = { [s.job]: { l: s.l || 1, xp: s.mastery || 0 } }; } if (!s.skills) s.skills = []; learnSkills(s, true); syncClass(s); { const m = baseMax(s); if (m > s.max) { s.hp += m - s.max; s.max = m; } }   /* V2.12 save upgrade: class levels + earned skills */
  s.post = null; s.target = s.facility = s.rescuer = s.rescuing = s.carrying = null; s.path = null; s.moving = false; s.why = s.why || 'Back from a break'; s.purpose = null; s.idleBubble = '';
  if (s.hp <= 0) s.mode = 'down'; else if (!['free', 'wait', 'down', 'hospital', 'postCombat'].includes(s.mode)) { s.mode = 'free'; s.stateTicks = 80; s.activity = null; s.dest = null; }
  if (s.mode === 'postCombat') { s.mode = 'free'; s.stateTicks = 40; } if (!s.id) s.id = ++S.seq;
}
function loadGame() {
  try {
    let raw = localStorage.getItem(SAVE_KEY), legacy = false, prev = false;
    if (!raw) { raw = localStorage.getItem(PREV_KEY); prev = !!raw; } if (!raw) { raw = localStorage.getItem(OLD_KEY); legacy = !!raw; } if (!raw) return false;
    const d = JSON.parse(raw); if (!d || !d.S) return false;
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
    if (d.roads) world.roads = new Set(d.roads.map((r) => (Array.isArray(r) ? r.join(',') : r))); world.buildings = (d.buildings || []).filter((b) => DEFS[b.type]).map((b) => ({ type: b.type, x: b.x, y: b.y, w: DEFS[b.type].w, h: DEFS[b.type].h, q: b.q ?? DEFS[b.type].q, a: b.a ?? DEFS[b.type].a, unpaid: !!b.unpaid, staff: null, _staffId: b.staffId || null }));
    world.walls = new Map(); for (const [x, y, type, hp] of (d.walls || [])) { const def = Wd.WALL_DEFS[type]; if (def) world.walls.set(x + ',' + y, { x, y, type, hp: Math.min(def.hp, hp), max: def.hp }); }
    S.z = []; S.requests = []; S.sv.forEach(relinkSurvivor); S.terr = S.terr || 0; Wd.setTerritory(S.terr); S.inv = S.inv || {}; for (const w of (S.spare || [])) { const id = Object.keys(ITEMS).find((k) => ITEMS[k].name === (w && w[0])); if (id && id !== 'pipe') stashAdd(id); } S.spare = []; if (S.nextRaid === undefined) S.nextRaid = S.day + 1.6; if (S.nextBoss === undefined) S.nextBoss = Math.max(3, Math.ceil(S.day / 3) * 3);
    for (const b of world.buildings) { if (b._staffId) { const q = S.sv.find((x) => x.id === b._staffId); if (q) { b.staff = q; q.post = b; } } delete b._staffId; }
    Wd.bump(world); return d;
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
const expRiskMult = (t) => Math.min(1.6, Math.max(.5, 1.3 / expSafety(t.members))) * (t.short ? 1.5 : 1);
function expPreview(destId, riskId, members) {
  const d = EXP_DEFS[destId], rk = EXP_RISK[riskId], n = members.length, need = EXP_COST[riskId] * n, short = S.food < need || S.water < need;
  const kinds = new Set(members.map(expKind).filter((k) => k !== 'other')).size, avgL = n ? members.reduce((a, s) => a + (s.l || 1), 0) / n : 1;
  const mult = rk.mult * (1 + .12 * Math.max(0, kinds - 1)) * (1 + .04 * (avgL - 1));
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
  autoStaff(); say(`${ms.map((q) => q.name).join(', ')} left for ${d.name}.`); saveGame(); ui(); expTick(); return { ok: true, why: '' };
}
const expStageAt = (t, k) => t.t0 + k * t.dur / EXP_STAGES;
function expResolveStage(t, quiet) {
  t.stage++; const d = EXP_DEFS[t.dest], rk = EXP_RISK[t.risk], ms = t.members;
  const kinds = new Set(ms.map(expKind).filter((k) => k !== 'other')).size, avgL = ms.reduce((a, s) => a + (s.l || 1), 0) / (ms.length || 1), f = rk.mult * (1 + .12 * Math.max(0, kinds - 1)) * (1 + .04 * (avgL - 1)) * (1 + .15 * ms.filter((m) => hasSkill(m, 'lootSense')).length);
  const got = [], r = (a) => a[0] + Math.floor(Math.random() * (a[1] - a[0] + 1));
  for (const k in d.loot) { const n = Math.max(1, Math.round(r(d.loot[k]) * f)); t.loot[k] += n; got.push(`${n} ${k === 'mat' ? 'parts' : k}`); }
  if (Math.random() < .2 * Math.sqrt(rk.mult)) { const pool = ['gloves', 'belt', 'shoes', 'goggles', 'glasses', 'charm', 'leather', 'machete', 'axe', 'riot', 'rifle', 'plate', 'dogtags'], id = pool[Math.floor(Math.random() * Math.min(pool.length, 7 + Math.round(rk.mult * 1.3)))]; t.items = (t.items || []).concat(id); got.push(ITEMS[id].name); }   /* V2.14: gear finds */
  const rm = expRiskMult(t); let trouble = [];
  for (const m of [...ms]) {
    const x = Math.random(), dead = rk.death * rm, collapse = rk.hurt * rm * .35, hurt = rk.hurt * rm;
    if (x < dead) { ms.splice(ms.indexOf(m), 1); t.lost.push(m.name); t.log.push(`Stage ${t.stage}: ${m.name} did not make it.`); trouble.push(`${m.name} was lost`); }
    else if (x < dead + collapse) { m.hp = 0; m.collapsed = true; t.log.push(`Stage ${t.stage}: ${m.name} collapsed and is being carried.`); trouble.push(`${m.name} collapsed`); }
    else if (x < dead + collapse + hurt && !m.collapsed) { m.hp = Math.max(1, Math.round(m.hp * (.3 + Math.random() * .3))); t.log.push(`Stage ${t.stage}: ${m.name} was hurt.`); trouble.push(`${m.name} was hurt`); if (!t.hurt.includes(m.name)) t.hurt.push(m.name); }
  }
  t.log.splice(Math.max(1, t.log.length - trouble.length), 0, `Stage ${t.stage}: ${d.lines[Math.floor(Math.random() * d.lines.length)]} Found ${got.join(' and ')}.`);
  if (!ms.length) { t.log.push('Nobody came back.'); return 'wiped'; }
  if (trouble.length && !quiet && t.stage < EXP_STAGES) showEventPopup({ title: 'SQUAD IN TROUBLE', text: `${trouble.join(', ')} on stage ${t.stage} of ${EXP_STAGES}. Recall the squad now, or keep going?`, buttons: [{ label: 'RECALL', fn: () => expRecall() }, { label: 'KEEP GOING' }] });
  return trouble.length ? 'trouble' : 'ok';
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
  t.phase = 'back'; t.backAt = now + back; t.log.push(`Recalled during stage ${t.stage + 1}. Loot from finished stages is kept; walking home.`); say('The squad is on its way home.'); saveGame(); ui(); return true;
}
function expFinish(recalled) {
  const t = S.trip; if (!t) return; const d = EXP_DEFS[t.dest], rk = EXP_RISK[t.risk], lines = [];
  if (recalled) for (const m of [...t.members]) if (Math.random() < EXP_BACK_DEATH * expRiskMult(t)) { t.members.splice(t.members.indexOf(m), 1); t.lost.push(m.name); t.log.push(`${m.name} fell on the way home.`); }
  (t.items || []).forEach((id) => stashAdd(id)); const cap = supplyCap(); S.food = Math.min(cap, S.food + t.loot.food); S.water = Math.min(cap, S.water + t.loot.water); S.mat += t.loot.mat; S.produced += t.loot.food + t.loot.water;
  const entry = (() => { for (const w of world.walls.values()) if (w.type === 'gate' && w.y <= 6) return tc(w.x, w.y + 1); return tc(7, 7); })();
  t.members.forEach((m, i) => { if (m.hp > 0) gainXp(m, 3 * Math.max(1, t.stage)); m.w = { x: entry.x + (i - 1) * .3, y: entry.y + (i % 2) * .3 }; delete m.collapsed; if (m.hp > 0) m.mode = 'free'; else { m.mode = 'down'; } m.cool = 20; m.stateTicks = 60; const o = { ...m }; relinkSurvivor(o); o.why = m.hp <= 0 ? 'Collapsed — needs rescue' : 'Back from the expedition'; S.sv.push(o); });
  let recruit = null; const tot = Object.entries(t.loot).filter(([, v]) => v).map(([k, v]) => `${v} ${k === 'mat' ? 'parts' : k}`).concat((t.items || []).map((id) => ITEMS[id].name));
  if (d.recruit && t.stage >= EXP_STAGES && t.members.length && S.sv.length < 10 && Math.random() < d.recruit[t.risk]) {
    const names = ['Noah', 'Maya', 'Eli', 'June', 'Rosa', 'Theo', 'Iris', 'Omar'], nm = names.find((n) => !S.sv.some((s) => s.name === n)) || 'Survivor ' + (S.sv.length + 1), jobs = ['Civilian', 'Scavenger', 'Guard', 'Medic', 'Farmer', 'Engineer', 'Cook'], jb = jobs[Math.floor(Math.random() * jobs.length)];
    recruit = mk(nm, jb, 1, entry.x, entry.y + .6, S.sv.length); recruit.sat = 3; recruit.stateTicks = 80; S.sv.push(recruit); t.log.push(`${nm}, a ${jb}, was found and followed the squad home.`);
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
  endBuildMode(true); closeP(); expOpen = true; $('it').textContent = 'EXPEDITION'; const t = S.trip;
  if (t) {
    const d = EXP_DEFS[t.dest];
    $('ib').innerHTML = `<b>${d.icon} ${d.name}</b> · ${EXP_RISK[t.risk].label} risk<br><span id="expStage">${t.phase === 'back' ? 'Walking home' : `Stage ${Math.min(EXP_STAGES, t.stage + 1)} of ${EXP_STAGES}`}</span> · <b id="expTime">${mmss(expTripLeft(t))}</b> left<br>
      Squad: ${t.members.map((m) => `${esc(m.name)} (${m.job}, HP ${Math.ceil(m.hp)}/${m.max})`).join(', ')}<br>
      Loot so far: ${['food', 'water', 'mat'].map((k) => `${t.loot[k]} ${k === 'mat' ? 'parts' : k}`).join(' · ')}<br><small>${t.log.map(esc).join('<br>')}</small><br>
      ${t.phase === 'out' ? '<button class="act danger" id="expRecall">RECALL SQUAD</button><br><small>Recall keeps the loot from finished stages and skips the risk of the rest. Leaving mid-stage forfeits that stage’s loot. The trip keeps running while the game is closed.</small>' : '<small>The squad is heading back.</small>'}`;
    const rb = $('expRecall'); if (rb) rb.onclick = () => { if (expRecall()) showExpedition(); };
  } else {
    if (!EXP_DEFS[expSel.dest] || expLocked(expSel.dest)) expSel.dest = 'houses';
    const d = EXP_DEFS[expSel.dest]; if (!d.risks.includes(expSel.risk)) expSel.risk = d.risks[0];
    let ids = (expSel.ids || []).filter((id) => S.sv.some((q) => q.id === id && expEligible(q))); if (!ids.length) ids = expAutoSquad().map((q) => q.id); expSel.ids = ids;
    const members = ids.map((id) => S.sv.find((q) => q.id === id)).filter(Boolean), pv = expPreview(expSel.dest, expSel.risk, members), rk = EXP_RISK[expSel.risk];
    const ready = S.sv.filter(expEligible);
    $('ib').innerHTML = `<b>Destination</b><br>${Object.entries(EXP_DEFS).map(([k, v]) => { const lk = expLocked(k); return `<button class="act" data-d="${k}" style="${expSel.dest === k ? 'outline:2px solid #ffe38a' : ''}${lk ? ';opacity:.5' : ''}">${v.icon} ${v.name}${lk ? ' · 🔒 ' + lk : ''}</button>`; }).join('')}<br><small>${d.desc}</small><br>
      <b>Risk</b><br>${d.risks.map((r) => `<button class="act" data-r="${r}" style="${expSel.risk === r ? 'outline:2px solid #ffe38a' : ''}">${EXP_RISK[r].label} · ${EXP_RISK[r].min} min · ×${EXP_RISK[r].mult}</button>`).join('')}<br>
      <b>Squad</b> (tap to swap, 1–${EXP_MAX_SQUAD}, ${EXP_HOME_MIN} stay home)<br>${S.sv.map((q) => { const on = ids.includes(q.id), ok = expEligible(q); return `<button class="act" data-s="${q.id}" style="${on ? 'outline:2px solid #9fe58a' : ''}${ok || on ? '' : ';opacity:.4'}">${esc(q.name)} · ${q.job} Lv.${q.l}${ok ? '' : ' · ' + (expBlock(q) || 'busy')}</button>`; }).join('')}<br>
      <small>Cost: ${pv.need} food + ${pv.need} water${pv.short ? ' — <b style="color:#ff8a7a">not enough in stock, riskier</b>' : ''}. Loot ×${pv.mult.toFixed(1)}. Per stage per person: about ${(pv.hurtPerStage * 100).toFixed(0)}% hurt, ${(pv.deathPerStage * 100).toFixed(1)}% lost (permanent).<br>${ready.length ? '' : 'Nobody is healthy and free right now.'}</small><br>
      <button class="act" id="expGo" style="background:#3f8f4f;color:#fff">SEND SQUAD · ${rk.min} min</button>`;
    $('ib').querySelectorAll('[data-d]').forEach((b) => { b.onclick = () => { if (expLocked(b.dataset.d)) { say(expLocked(b.dataset.d)); return; } expSel.dest = b.dataset.d; showExpedition(); }; });
    $('ib').querySelectorAll('[data-r]').forEach((b) => { b.onclick = () => { expSel.risk = b.dataset.r; showExpedition(); }; });
    $('ib').querySelectorAll('[data-s]').forEach((b) => { b.onclick = () => { const id = +b.dataset.s, q = S.sv.find((x) => x.id === id); if (ids.includes(id)) expSel.ids = ids.filter((x) => x !== id); else if (q && expEligible(q) && ids.length < EXP_MAX_SQUAD) expSel.ids = [...ids, id]; else say('That survivor can’t go right now.'); showExpedition(); }; });
    $('expGo').onclick = () => { const r = startExpedition(expSel.dest, expSel.risk, expSel.ids); if (!r.ok) { say(r.why); return; } expSel.ids = null; showExpedition(); };
  }
  $('infoPanel').style.display = 'block';
}
/* V2.9 death and recovery model */
const BLEED_TICKS = { none: 7200, medic: 10800, clinic: 12600, hospital: 14400 };
const CARE_TICKS = { medic: 3600, clinic: 2700, hospital: 1800 };
const BANDAGE_COST = 2, BANDAGE_TICKS = 3600;
function medTier() { const m = medSite(); return m ? m.type : 'none'; }
function bleedMax() { return BLEED_TICKS[medTier()]; }
function careTicks() { const t = medTier(), m = medSite(), st = m && isWorking(m) ? Math.max(.6, 1 - (stat(m.staff, 'int') - 5) * .03) : 1; return Math.round((CARE_TICKS[t] || CARE_TICKS.medic) * st * (m ? 1 - combos(m).care : 1) * (m && m.unpaid ? 1.4 : 1)); }
function beingCarried(s) { const r = s.rescuer; return !!(r && r.carrying === s && r.mode === 'rescueCarry'); }
function bleedTick(s) {
  if (s.bleed == null) { s.bleed = bleedMax(); s.warned = false; }
  if (beingCarried(s)) return;
  s.bleed--;
  if (!s.warned && s.bleed <= 1800) { s.warned = true; say(s.name + ' is bleeding out! Get them to care.'); }
  if (s.bleed <= 0) killSurvivor(s, 'bled out');
}
function killSurvivor(s, cause) {
  if (!S.sv.includes(s)) return;
  S.sv = S.sv.filter((q) => q !== s);
  for (const q of S.sv) { if (q.rescuing === s) { q.rescuing = null; if (['rescueTo', 'rescueCarry'].includes(q.mode)) { q.carrying = null; enterFree(q, 60); } } if (q.target === s) q.target = null; }
  for (const b of world.buildings) if (b.staff === s) b.staff = null;
  if (selected && selected.ref === s) { selected = null; closeP(); }
  for (const sl of SLOTS) { const id = s.eq && s.eq[sl]; if (id && id !== 'pipe') stashAdd(id); }   /* their gear goes back to the stash */
  let near = 0;
  for (const q of S.sv) { const close = dist(q.w, s.w) < 6 || (q.job === s.job); const d = close ? 6 : 2; q.sat = Math.max(0, q.sat - d); if (close) near++; }
  S.fallen = S.fallen || []; S.fallen.push({ name: s.name, job: s.job, l: s.l, day: S.day, cause });
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
    if (!s.starveWarn) { s.starveWarn = true; say(s.name + ' is ' + (s.thirst >= 100 ? 'dying of thirst' : 'starving') + '!'); }
  } else s.starveWarn = false;
}
function useBandage(s) {
  if (s.mode !== 'down') return false;
  if (S.mat < BANDAGE_COST) { say('Need ' + BANDAGE_COST + ' parts for a bandage.'); return false; }
  S.mat -= BANDAGE_COST; if (s.bleed == null) s.bleed = bleedMax(); s.bleed = Math.min(s.bleed + BANDAGE_TICKS, bleedMax() + BANDAGE_TICKS); s.warned = false; say('Bandaged ' + s.name + ' · +60 s'); ui(); return true;
}
function retreatCheck(s) {
  if (s.fleeT > 0) return false;
  const on = S.z.filter((z) => z.hp > 0 && z.target === s && ['zchase', 'zattack', 'zrecover'].includes(z.mode) && dist(z.w, s.w) < 2.5).length;
  if (on >= 3 && s.hp < s.max * .6) { const keep = S.retreat; S.retreat = 100; const r = retreatCheck2(s); S.retreat = keep; if (r) s.why = 'Outnumbered — falling back to ' + (medSite() ? DEFS[medSite().type].name : 'cover'); return r; }
  return retreatCheck2(s);
}
function retreatCheck2(s) {
  if (s.hp < s.max * (S.retreat ?? 35) / 100) { s.fleeT = 1500; s.target = null; s.path = null; const m = medSite(); if (m) { s.facility = m; s.mode = 'goFacility'; s.stateTicks = 9999; s.dest = null; s.why = 'Badly hurt → ' + DEFS[m.type].name; } else { const z = nearestZombie(s); if (z) { startHide(s, z); s.why = 'Badly hurt — ' + s.why; } else { s.mode = 'free'; s.stateTicks = 30; s.why = 'Retreating, badly hurt'; } } return true; }
  return false;
}

/* ---------------- build / move / demolish ---------------- */
let moving = null;   // building being moved (removed from world while placing)
function closeP() { $('buildPanel').style.display = $('infoPanel').style.display = 'none'; expOpen = false; }
function endBuildMode(restore) {
  if (restore && moving) { world.buildings.push(moving); Wd.bump(world); }
  moving = null; sel = null; preview = null; $('confirmBar').style.display = 'none';
}
function startTool(tool) {
  endBuildMode(true); closeP(); sel = tool; preview = null;
  if (tool.kind === 'wall') { const wd = Wd.WALL_DEFS[tool.wtype]; $('confirmName').textContent = `${wd.name.toUpperCase()} · ${wd.mat} part${wd.mat > 1 ? 's' : ''} per tile · tap to place, tap again to remove` + (tool.wtype === 'metal' ? ' · tap a wood wall to upgrade' : ''); $('yesBuild').style.display = 'none'; $('nudge').style.display = 'none'; $('noBuild').textContent = 'DONE'; $('confirmBar').style.display = 'block'; }
  else if (tool.kind === 'road') { $('confirmName').textContent = `ROAD · ${Wd.ROAD_COST} part per tile · tap a tile to add, tap a road to remove`; $('yesBuild').style.display = 'none'; $('nudge').style.display = 'none'; $('noBuild').textContent = 'DONE'; $('confirmBar').style.display = 'block'; }
  else { $('yesBuild').style.display = ''; $('nudge').style.display = ''; $('noBuild').textContent = 'CANCEL'; say('Tap the tile where the building’s SOUTH corner should sit.'); }
}
function updatePreview(x, y) {
  const d = DEFS[sel.type], chk = Wd.placementCheck(world, x, y, d, null);
  preview = { type: sel.type, x, y, w: d.w, h: d.h, q: d.q, a: d.a, ok: chk.ok, why: chk.why };
  const mat = moving ? 0 : d.mat, afford = S.mat >= mat;
  $('confirmName').textContent = `${d.name.toUpperCase()} · ${d.w}×${d.h}` + (moving ? ' · MOVE (free)' : ` · PARTS ${d.mat}`) + (!chk.ok ? ' · ' + chk.why.toUpperCase() : !afford ? ' · NOT ENOUGH PARTS' : '') + (chk.ok ? (() => { const pv = { type: sel.type, x, y, w: d.w, h: d.h }, c = combos(pv); comboCache.map.delete(pv); return c.names.length ? ' · ★ ' + c.names.map((n) => n.split(' (')[0]).join(', ') : ''; })() : '');
  const go = chk.ok && afford; $('yesBuild').disabled = !go; $('yesBuild').style.opacity = go ? 1 : .45; $('confirmBar').style.display = 'block';
}
function pushUnitsOut(b) {
  const dp = Wd.approachPoint(b);
  for (const u of [...S.sv, ...S.z]) if (Iso.footprintContains(b, u.w.x, u.w.y)) { u.w = { x: dp.x + (rnd() - .5) * .3, y: dp.y }; u.path = null; }
}
function confirmPreview() {
  if (!preview || !sel || sel.kind !== 'building') return; const d = DEFS[sel.type];
  const chk = Wd.placementCheck(world, preview.x, preview.y, d, null); if (!chk.ok) { say(chk.why); return; }
  if (!moving && S.mat < d.mat) { say('Not enough parts.'); return; }
  if (!moving) { S.mat -= d.mat; S.builtCount++; renownGain(1, 'Construction'); screenToast('🔨 ' + d.name.toUpperCase() + ' BUILT'); if (sel.type === 'water' && S.stage === 0) { S.stage = 1; renownGain(5, 'Water secured'); } }
  const nb = { type: sel.type, x: preview.x, y: preview.y, w: d.w, h: d.h, q: moving ? moving.q : d.q, a: moving ? moving.a : d.a, staff: moving ? moving.staff : null };
  world.buildings.push(nb); Wd.bump(world); pushUnitsOut(nb); if (nb.staff) nb.staff.post = nb; autoStaff(); say(moving ? d.name + ' moved.' : d.name + ' constructed!'); moving = null; sel = null; preview = null; $('confirmBar').style.display = 'none'; selected = null; saveGame(); ui();
}
function tryRoad(x, y) {
  if (!Wd.inTown(x, y)) { say('Roads only inside the build zone.'); return; }
  if (Wd.buildingAt(world, x, y)) { say('A building is in the way.'); return; }
  if (Wd.isRoad(world, x, y)) { world.roads.delete(Wd.key(x, y)); Wd.bump(world); say('Road removed.'); ui(); return; }
  if (S.mat < Wd.ROAD_COST) { say('Not enough parts.'); return; }
  S.mat -= Wd.ROAD_COST; world.roads.add(Wd.key(x, y)); Wd.bump(world); ui();
}
function tryWall(x, y, type) {
  const wd = Wd.WALL_DEFS[type];
  if (!Wd.inWallZone(x, y)) { say('Walls go around the town, inside the glowing area.'); return; }
  if (Wd.buildingAt(world, x, y)) { say('A building is in the way.'); return; }
  const ex = Wd.wallAt(world, x, y), k = Wd.key(x, y);
  if (ex && ex.type === type) { world.walls.delete(k); Wd.bump(world); S.mat += Math.floor(wd.mat * .5); say(wd.name + ' removed.'); saveGame(); ui(); return; }
  if (ex && type === 'metal' && ex.type === 'wood') { const diff = wd.mat - Wd.WALL_DEFS.wood.mat; if (S.mat < diff) { say('Not enough parts.'); return; } S.mat -= diff; ex.type = 'metal'; ex.max = wd.hp; ex.hp = wd.hp; say('Upgraded to Metal Wall.'); saveGame(); ui(); return; }
  if (ex) { say('Remove the ' + Wd.WALL_DEFS[ex.type].name + ' first.'); return; }
  if (wd.rank > S.rank) { say(wd.name + ' needs Haven rank ' + wd.rank + '.'); return; }
  if (Wd.isRoad(world, x, y) && type !== 'gate') { say('Use a Gate to close a road.'); return; }
  if ([...S.sv, ...S.z].some((u) => u.hp > 0 && Math.floor(u.w.x) === x && Math.floor(u.w.y) === y)) { say('Someone is standing there.'); return; }
  if (S.mat < wd.mat) { say('Not enough parts.'); return; }
  S.mat -= wd.mat; world.walls.set(k, { x, y, type, hp: wd.hp, max: wd.hp }); Wd.bump(world); checkPerimeter(); saveGame(); ui();
}
function checkPerimeter() {
  const p = Wd.perimeter(world); if (p.sealed && !S.sealed) { screenToast('🛡 PERIMETER SEALED'); say('The perimeter is sealed. Zombies must break through.'); }
  if (!p.sealed && S.sealed) { screenToast('⚠ PERIMETER OPEN'); }
  S.sealed = p.sealed; return p;
}
function demolish(b) { const d = DEFS[b.type], refund = Math.floor(d.mat * .5); releasePost(b); world.buildings = world.buildings.filter((q) => q !== b); Wd.bump(world); S.mat += refund; selected = null; closeP(); say(`${d.name} demolished · refund ${refund} parts`); saveGame(); ui(); }
function moveBuilding(b) { world.buildings = world.buildings.filter((q) => q !== b); Wd.bump(world); moving = b; selected = null; closeP(); sel = { kind: 'building', type: b.type }; preview = null; $('yesBuild').style.display = ''; $('nudge').style.display = ''; $('noBuild').textContent = 'CANCEL'; updatePreview(b.x, b.y); say('Tap a new spot for the south corner.'); }

/* ---------------- panels ---------------- */
function showBuild() {
  endBuildMode(true); closeP(); const grid = $('buildGrid'); grid.innerHTML = '';
  const rb = document.createElement('button'); rb.className = 'build'; rb.innerHTML = `<span style="font-size:26px;width:40px;text-align:center">🛣️</span><span>Road<small>${Wd.ROAD_COST} part per tile</small></span>`; rb.onclick = () => startTool({ kind: 'road' }); grid.appendChild(rb);
  for (const [wt, wd] of Object.entries(Wd.WALL_DEFS)) { if (S.rank < wd.rank) continue; const wb = document.createElement('button'); wb.className = 'build'; wb.innerHTML = `<span style="font-size:26px;width:40px;text-align:center">${wt === 'gate' ? '🚪' : wt === 'metal' ? '🧱' : '🪵'}</span><span>${wd.name}<small>${wd.mat} part${wd.mat > 1 ? 's' : ''} per tile · ${wd.hp} HP</small></span>`; wb.onclick = () => startTool({ kind: 'wall', wtype: wt }); grid.appendChild(wb); }
  Object.entries(DEFS).filter(([, d]) => S.rank >= d.rank && !d.hidden).forEach(([k, d]) => {   // upgrade-only tiers (hidden) are reached from the building panel
    const b = document.createElement('button'); b.className = 'build'; b.innerHTML = `<img src="assets/buildings/${B4_DEFS[k] ? 'v4/' : ''}${k}.png?v=${VERSION}" alt="" style="image-rendering:pixelated"><span>${d.name} · ${d.w}×${d.h}<small>PARTS ${d.mat} · upkeep ${(UPKEEP[k] ?? .3).toFixed(1)}/day${d.train ? ' · trains ' + STAT_NAME[d.train] : ''}</small></span>`;
    b.onclick = () => startTool({ kind: 'building', type: k }); grid.appendChild(b);
  });
  $('buildPanel').style.display = 'block';
}
const esc = (t) => String(t).replace(/[&<>]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;' }[c]));
const meter = (v, cls = '') => `<div class="bar ${cls}"><i style="width:${Math.max(0, Math.min(100, v))}%"></i></div>`;
function unitPanel(u) {
  selected = { kind: 'unit', ref: u }; closeP(); $('it').textContent = u.name.toUpperCase(); $('ib').innerHTML = `${u.job} Lv.${u.l} · HP ${Math.ceil(u.hp)}/${u.max} · ration ${ration(u).toFixed(2)}/day${u.post ? ' · works at ' + DEFS[u.post.type].name : ''}<br><b>${esc(u.why)}</b><br>Hunger ${Math.round(u.hunger)} · Thirst ${Math.round(u.thirst)} · Fatigue ${Math.round(u.fatigue)}` + (u.mode === 'down' ? `<br><b style="color:#ff8a7a">Bleeding out: ${Math.ceil((u.bleed ?? 0) / 60)} s left</b><br><button class="act" id="bandage">Bandage +60 s (${BANDAGE_COST} parts)</button>` : ''); $('infoPanel').style.display = 'block'; const bd = $('bandage'); if (bd) bd.onclick = () => { if (useBandage(u)) unitPanel(u); }; unitExtra(u);
}
function nextSkillText(s, job) {   // e.g. "next: Tough at Lv.5"
  const c = (s.cls && s.cls[job]) || { l: 1 }; const nx = Object.values(SKILLS).filter((k) => k.from === job && k.at > c.l).sort((a, b) => a.at - b.at)[0];
  return nx ? `next: ${nx.name} at Lv.${nx.at}` : 'all skills learned';
}
const itemText = (it) => !it ? '—' : [it.atk ? `ATK ${it.atk}${it.ranged ? ' ranged' : ''}` : '', it.def ? `DEF ${it.def}` : '', ...Object.entries(it.st || {}).map(([k, v]) => `${v > 0 ? '+' : ''}${v} ${k.toUpperCase()}`)].filter(Boolean).join(' · ');
function statsHtml(u) {   /* V2.14 character sheet: base stat, gear bonus, training bar */
  const rows = STATS.map((k) => { const base = (u.st && u.st[k]) || 5, tot = stat(u, k), tp = Math.floor((u.tp && u.tp[k]) || 0), main = (JOB_STATS[u.job] || []).includes(k);
    return `<div style="display:flex;align-items:center;gap:6px"><span style="width:92px">${main ? '<b>' : ''}${STAT_NAME[k]}${main ? '</b>' : ''}</span><b style="width:22px;text-align:right">${tot}</b><small style="width:44px">${tot !== base ? `(${base}${tot > base ? '+' : ''}${tot - base})` : ''}</small><span style="flex:1">${meter(base / STAT_CAP * 100)}</span><small style="width:34px;text-align:right">${base >= STAT_CAP ? 'max' : tp + '%'}</small></div>`; }).join('');
  const w = weaponOf(u), dmg = Math.round(4 + w.atk * .55 + (w.ranged ? stat(u, 'per') : stat(u, 'str')) * .6 + (professions[u.job]?.combat || 0) + skillDmg(u));
  return `<b>Stats</b> <small>(bold = ${u.job} main stats; % = training toward +1)</small>${rows}<small>Hit ${dmg}${w.ranged ? ' at range' : ''} · damage taken −${Math.round(dmgReduce(u) * 100)}% · speed ${Math.round(sMod(u, 'agi', .02) * 100)}%</small>`;
}
function gearHtml(u, picking) {
  let h = '<br><b>Equipment</b>' + SLOTS.map((sl) => { const it = itemOf(u, sl); return `<div>${SLOT_NAME[sl]}: <b>${it ? it.name : 'none'}</b> <small>${itemText(it)}</small> <button class="act" data-slot="${sl}" style="padding:2px 8px">Change</button></div>`; }).join('');
  if (picking) { const ids = Object.keys(S.inv || {}).filter((id) => ITEMS[id] && ITEMS[id].slot === picking);
    h += `<div style="border:1px solid #2c627a;padding:4px;margin-top:4px"><b>${SLOT_NAME[picking]} in the stash</b><br>` + (ids.length ? ids.map((id) => `<button class="act" data-equip="${id}">${ITEMS[id].name} ×${S.inv[id]}<small> · ${itemText(ITEMS[id])}</small></button>`).join('') : '<small>nothing in the stash for this slot — the Armory sells basics, expeditions and crafting find more</small><br>')
      + `${itemOf(u, picking) && u.eq[picking] !== 'pipe' ? '<button class="act" data-unequip="1">Unequip</button>' : ''}<button class="act" data-gearcancel="1">Close</button></div>`; }
  return h;
}
function unitExtra(u, picking = false, gearPick = null) {   /* V2.12: skills, per-profession levels and profession change in the survivor panel */
  syncClass(u); const box = document.createElement('div'); box.id = 'unitExtra';
  const sk = (u.skills || []).map((k) => `<span title="${esc(SKILLS[k].desc)}">${SKILLS[k].name}</span> <small>(${esc(SKILLS[k].desc)})</small>`).join('<br>') || '<small>none yet — reach Lv.3 in any profession</small>';
  const lv = CLASS_LIST.filter((j) => u.cls[j]).map((j) => `${j} Lv.${u.cls[j].l}`).join(' · ');
  const xpNeed = professions[u.job]?.master || 60;
  box.innerHTML = '<br>' + statsHtml(u) + gearHtml(u, gearPick) + `<br><b>${u.job} Lv.${u.l}</b> · XP ${Math.floor(u.mastery)}/${xpNeed}${u.l >= LEVEL_CAP ? ' (max)' : ''} · ${nextSkillText(u, u.job)}<br><b>Skills</b> (kept in every profession):<br>${sk}<br><b>Levels:</b> ${lv}`;
  const busy = ['down', 'hospital'].includes(u.mode) || u.hp <= 0;
  if (!picking) box.innerHTML += `<br><button class="act" id="chgJob" ${busy ? 'disabled style="opacity:.45"' : ''}>Change profession${busy ? ' (not while hurt)' : ''}</button>`;
  else box.innerHTML += '<br><b>Pick a profession</b> (levels and skills are kept):<br>' + CLASS_LIST.map((j) => { const c = u.cls[j]; return `<button class="act" data-job="${j}" ${j === u.job ? 'disabled style="opacity:.45"' : ''}>${j} · Lv.${c ? c.l : 1}<small> · ${isFighter({ job: j }) ? 'fighter' : 'hides from zombies'} · ${nextSkillText(u, j)}</small></button>`; }).join('') + '<button class="act" id="chgCancel">Cancel</button>';
  const old = $('unitExtra'); if (old) old.remove(); $('ib').appendChild(box);
  const cj = $('chgJob'); if (cj && !busy) cj.onclick = () => unitExtra(u, true);
  box.querySelectorAll('[data-slot]').forEach((b) => { b.onclick = () => unitExtra(u, false, b.dataset.slot); });
  box.querySelectorAll('[data-equip]').forEach((b) => { b.onclick = () => { if (equip(u, b.dataset.equip)) { saveGame(); unitPanel(u); } }; });
  box.querySelectorAll('[data-unequip]').forEach((b) => { b.onclick = () => { if (unequip(u, gearPick)) { saveGame(); unitPanel(u); } }; });
  box.querySelectorAll('[data-gearcancel]').forEach((b) => { b.onclick = () => unitExtra(u, false); });
  const cc = $('chgCancel'); if (cc) cc.onclick = () => unitExtra(u, false);
  box.querySelectorAll('[data-job]').forEach((b) => { b.onclick = () => { if (changeProfession(u, b.dataset.job)) { ui(); saveGame(); unitPanel(u); } }; });
}
function showSurvivors() {
  endBuildMode(true); closeP(); $('it').textContent = 'SURVIVORS';
  $('ib').innerHTML = S.sv.map((s) => `<div data-sv="${s.id}" style="padding:4px 0;border-bottom:1px solid #2c627a"><b>${esc(s.name)}</b> · ${s.job} Lv.${s.l}${(s.skills || []).length ? ' · ' + s.skills.length + ' skill' + (s.skills.length > 1 ? 's' : '') : ''} ${s.resident ? '🏠' : ''} <span style="float:right;color:#ffe38a">${esc(s.why || s.mode)}</span>
   HP ${Math.ceil(s.hp)}/${s.max} · ♥${Math.floor(s.sat)} · ${weaponOf(s).name}${itemOf(s, 'armor') ? ' + ' + itemOf(s, 'armor').name : ''} · ration ${ration(s).toFixed(2)}/day${s.post ? ' · works at ' + DEFS[s.post.type].name : ''}${meter(s.hp / s.max * 100)}<small>Hunger ${Math.round(s.hunger)} · Thirst ${Math.round(s.thirst)} · Fatigue ${Math.round(s.fatigue)} · XP ${Math.floor(s.mastery)}/${professions[s.job]?.master || 0}</small></div>`).join('') + '<small>Tap a survivor to follow them.</small>';
  $('infoPanel').style.display = 'block';
}
function perimText() {
  const p = Wd.perimeter(world); if (!p.walls) return 'no walls yet — zombies walk straight in';
  const wk = p.weakest ? ` · weakest segment ${Math.ceil(p.weakest.hp)}/${p.weakest.max} HP at (${p.weakest.x}, ${p.weakest.y})` : '';
  return `${p.walls} segments, ${p.gates} gate${p.gates === 1 ? '' : 's'} — ` + (p.sealed ? '<b style="color:#9fe58a">SEALED</b>' : '<b style="color:#ff8a7a">OPEN</b> (zombies can walk in; close every gap)') + wk;
}
function expandInfo() { const n = Wd.TERRITORY[(S.terr || 0) + 1]; return n ? { n, ok: S.ren >= n.ren && S.mat >= n.mat } : null; }
function expandTerritory() {   /* V2.13: more land to build on, more zombies to hold off */
  const e = expandInfo(); if (!e || !e.ok) return false; S.mat -= e.n.mat; S.terr = (S.terr || 0) + 1; Wd.setTerritory(S.terr); Wd.bump(world); groundKey = '';
  S.threat++; screenToast('🗺 TERRITORY EXPANDED'); say(`The Haven claimed more land (tier ${S.terr}). More zombies will come, from more directions.`); renownGain(3, 'Territory expanded'); saveGame(); ui(); return true;
}
function showTown() {
  endBuildMode(true); closeP(); $('it').textContent = 'TOWN'; const nx = rankRules[S.rank], st = supplyStats();
  const net = (n) => (n >= 0 ? '+' : '−') + Math.abs(n).toFixed(1), days = (d) => (d === Infinity ? 'stable' : `${d.toFixed(1)} days left`);
  $('ib').innerHTML = `<b>Haven rank ${S.rank}</b> · ${S.sv.length} survivors (${residents()} residents) · ${world.buildings.length} buildings<br>
   <b>Supplies</b> (cap ${supplyCap()}): Food ${Math.floor(S.food)} · Water ${Math.floor(S.water)} · Parts ${Math.floor(S.mat)}<br>
   <b>Perimeter:</b> ${perimText()}<br>
   <b>Retreat at:</b> <input type="range" id="retreatR" min="15" max="60" step="5" value="${S.retreat}"> <span id="retreatV">${S.retreat}%</span> HP<br>
   <b>Memorial:</b> ${S.fallen.length ? S.fallen.map((f) => esc(f.name) + ' (' + f.job + ', day ' + f.day + ')').join(', ') : 'none yet'}<br>
   Rations eaten per day: <b>${st.need.toFixed(1)}</b> (half food, half water)<br>
   Parts: upkeep <b>−${upkeepTotal().toFixed(1)}</b>/day · Scrapyards <b>+${world.buildings.filter((b) => DEFS[b.type].fam === 'scrap').reduce((a, b) => a + DEFS[b.type].out * prodMult(b), 0).toFixed(1)}</b>/day${world.buildings.some((b) => b.unpaid) ? ' · <b style="color:#ff8a7a">' + world.buildings.filter((b) => b.unpaid).length + ' unpaid</b>' : ''}<br>
   Food ${net(st.fNet)}/day · ${days(st.fDays)} · Water ${net(st.wNet)}/day · ${days(st.wDays)}<br>
   ${nx ? `Next rank needs: Renown ${S.ren}/${nx.ren} · Supplies produced ${Math.floor(S.produced)}/${nx.income} · Residents ${residents()}/${nx.residents} · Buildings ${world.buildings.length}/${nx.facilities}` : 'Max rank reached.'}<br>${S.mission ? `<br><b>Mission:</b> ${S.mission.name} — ${S.mission.desc} (${Math.floor(S.mission.progress)}/${S.mission.goal})` : ''}
   <br><b>Territory:</b> tier ${S.terr || 0}/${Wd.TERRITORY.length - 1}${(() => { const e = expandInfo(); return e ? ` · next needs Renown ${S.ren}/${e.n.ren} and ${e.n.mat} parts<br><button class="act" id="tExpand" ${e.ok ? '' : 'disabled style="opacity:.45"'}>Expand territory (more land, more zombies)</button>` : ' · fully expanded'; })()}
   <br><br><button class="act" id="tSave">Save now</button><button class="act danger" id="tReset">New game…</button>`;
  $('infoPanel').style.display = 'block';
  $('retreatR').oninput = (e) => { S.retreat = +e.target.value; $('retreatV').textContent = S.retreat + '%'; };
  $('tSave').onclick = () => { saveGame(); say('Saved.'); };
  const tx = $('tExpand'); if (tx) tx.onclick = () => { if (expandTerritory()) showTown(); };
  $('tReset').onclick = () => { if (confirm('Erase this town and start over?')) { try { localStorage.removeItem(SAVE_KEY); localStorage.removeItem(PREV_KEY); localStorage.removeItem(OLD_KEY); } catch (e) {} location.reload(); } };
}
function showGuide() {
  endBuildMode(true); closeP(); $('it').textContent = 'GUIDE';
  $('ib').innerHTML = `<b>Drag</b> to pan, <b>pinch</b> to zoom, <b>⌖</b> recenters, <b>1×/2×/3×</b> changes speed, <b>🐞</b> shows the geometry overlay.<br><b>Walls:</b> Build → Wood Barricade / Metal Wall / Gate, then tap tiles around the town (tap again to remove; Metal over Wood upgrades). Zombies attack the nearest wall; elites (Spitters, Brutes) go for the weakest segment. Guards leave through the Gate to fight. Broken segments are repaired automatically with parts (faster with an Engineer or Mechanic). Town shows if the perimeter is SEALED.<br><b>Expedition:</b> EXPEDITION button → pick a destination, a risk level and a squad (auto-picked: one guard, one medic, one scavenger). The squad leaves the map and the trip runs in real time, even while the game is closed. After each of 3 stages something may happen; you can RECALL (keeps loot from finished stages). Losses are permanent.<br><b>Build:</b> choose a building, tap the tile for its <b>south corner</b> (the front tip of the footprint), nudge with the arrows, then CONFIRM. Buildings can't rotate. Buildings cost <b>parts</b>; there is no money.<br><b>Supplies:</b> every survivor eats a daily ration (half food, half water); heavier jobs and higher levels eat more. Rain collectors make water, garden plots make food (and use some water). Medicine heals; without it care is half as effective.<br><b>Staffing is automatic:</b> a survivor with the matching profession (Farmer, Engineer/Mechanic, Medic) takes the building's one slot and boosts it (+50%, +10% per level). A green dot on the building means it is staffed.<br><b>Upgrade</b> a building from its panel: it keeps its footprint and keeps working.<br><b>Roads:</b> the Road tool adds or removes single tiles (1 part each).<br><b>Tap a survivor</b> to see what they are doing and why.<br><b>Renown</b> raises your Haven rank; higher ranks bring tougher zombies.<br><small>V${VERSION} · geometry: tile ratio 3:2 (33.69°), anchor = south corner.</small>`;
  $('infoPanel').style.display = 'block';
}
function showBuildingInfo(b) {
  const d = DEFS[b.type], r = facilityRules[b.type]; selected = { kind: 'building', ref: b }; closeP(); $('it').textContent = d.name.toUpperCase();
  const jobs = STAFF_JOBS[d.fam] || [], up = null, nd = null, cb = combos(b);
  const prod = (d.fam === 'scrap' ? `Makes <b>${(d.out * prodMult(b)).toFixed(1)}</b> parts/day` : '') + (d.train ? `Trains <b>${STAT_NAME[d.train]}</b>` : '') + (d.fam === 'water' ? `Makes <b>${(d.out * prodMult(b)).toFixed(1)}</b> water/day` : d.fam === 'farm' ? `Makes <b>${(d.out * prodMult(b)).toFixed(1)}</b> food/day · uses ${d.waterUse} water/day` : '') + `<br>Upkeep <b>${upkeepOf(b).toFixed(1)}</b> parts/day${b.unpaid ? ' · <b style="color:#ff8a7a">UNPAID — half output</b>' : ''}` + (cb.names.length ? `<br>★ ${cb.names.join('<br>★ ')}` : '<br><small>No neighbour bonus — try building related buildings next to it.</small>');
  $('ib').innerHTML = `Tier <b>${d.tier || 1}</b> · footprint <b>${b.w}×${b.h}</b> · south anchor <b>(${b.x + b.w}, ${b.y + b.h})</b><br>${prod ? prod + '<br>' : ''}${d.slot ? `Staff: <b>${b.staff ? esc(b.staff.name) + ' (' + b.staff.job + ' Lv.' + b.staff.l + ')' + (isWorking(b) ? ' · boosted +' + Math.round(workBoost(b.staff) * 100) + '%' : ' · off shift') : 'open'}</b> · matching: ${jobs.join(' / ') || '—'}<br>` : ''}${r ? `Service: <b>${r.label}</b>${r.need === 'injury' ? ' · uses 1 medicine' : ''}<br>` : ''}Capacity <b>${cap(b)}</b> · in use <b>${facilityUsers(b)}</b> · Quality <b>${b.q}</b> · Appeal <b>${b.a}</b><br>
   ${nd ? `<button class="act" id="bUp" ${up.ok ? '' : 'style="opacity:.5"'}>Upgrade → ${nd.name} (${d.up} parts)</button>${up.ok ? '' : `<br><small>${esc(up.why)}</small><br>`}` : ''}<button class="act" id="bMove">Move</button><button class="act danger" id="bDem">Demolish (+${Math.floor(d.mat * .5)} parts)</button>`;
  $('infoPanel').style.display = 'block'; $('bMove').onclick = () => moveBuilding(b); $('bDem').onclick = () => demolish(b); if (nd) $('bUp').onclick = () => { if (upgradeBuilding(b)) showBuildingInfo(b); };
}

/* ---------------- input ---------------- */
const pointers = new Map(); let gesture = null, tapStart = null;
const local = (e) => { const r = cv.getBoundingClientRect(); return { x: e.clientX - r.left, y: e.clientY - r.top }; };
function zoomAt(px, py, nz) { nz = Math.max(.5, Math.min(1.9, nz)); const w = unproject(px, py); cam.z = nz; const p = project(w.x, w.y); cam.x += px - p.x; cam.y += py - p.y; clampCam(); updateZoomLabel(); }
cv.addEventListener('pointerdown', (e) => { cv.setPointerCapture(e.pointerId); const p = local(e); pointers.set(e.pointerId, p); if (pointers.size === 1) tapStart = { ...p, id: e.pointerId, cx: cam.x, cy: cam.y, moved: false, t: performance.now() }; else if (pointers.size === 2) { const a = [...pointers.values()]; gesture = { dist: Math.max(20, Math.hypot(a[1].x - a[0].x, a[1].y - a[0].y)), z: cam.z }; tapStart = null; } });
cv.addEventListener('pointermove', (e) => {
  if (!pointers.has(e.pointerId)) return; const p = local(e); pointers.set(e.pointerId, p);
  if (pointers.size === 1 && tapStart) { const dx = p.x - tapStart.x, dy = p.y - tapStart.y; if (Math.hypot(dx, dy) > 8) tapStart.moved = true; if (tapStart.moved) { cam.x = tapStart.cx + dx; cam.y = tapStart.cy + dy; clampCam(); } }
  else if (pointers.size >= 2 && gesture) { const a = [...pointers.values()].slice(0, 2), d = Math.max(20, Math.hypot(a[1].x - a[0].x, a[1].y - a[0].y)); zoomAt((a[0].x + a[1].x) / 2, (a[0].y + a[1].y) / 2, gesture.z * d / gesture.dist); }
});
function pointerEnd(e) { const p = local(e), wasTap = tapStart && tapStart.id === e.pointerId && !tapStart.moved && pointers.size === 1; pointers.delete(e.pointerId); if (pointers.size < 2) gesture = null; if (wasTap) tapAt(p.x, p.y); if (!pointers.size) tapStart = null; }
cv.addEventListener('pointerup', pointerEnd); cv.addEventListener('pointercancel', (e) => { pointers.delete(e.pointerId); gesture = null; tapStart = null; });
cv.addEventListener('wheel', (e) => { e.preventDefault(); const p = local(e); zoomAt(p.x, p.y, cam.z * (e.deltaY < 0 ? 1.1 : .91)); }, { passive: false });
function hitBuilding(px, py) {   // pixel-accurate against the sprite alpha, topmost first; falls back to the footprint
  const order = [...world.buildings].sort((a, b) => (b.x + b.w + b.y + b.h) - (a.x + a.w + a.y + a.h));
  for (const b of order) { const r = spriteRect(b); if (!r || px < r.x || py < r.y || px >= r.x + r.w || py >= r.y + r.h) continue; const m = alphaMask(b.type); if (!m) return b; const ix = Math.floor((px - r.x) / r.w * m.w), iy = Math.floor((py - r.y) / r.h * m.h); if (m.d[(iy * m.w + ix) * 4 + 3] > 24) return b; }
  const t = unproject(px, py); return Wd.buildingAt(world, Math.floor(t.x), Math.floor(t.y));
}
function hitUnit(px, py) {
  let best = null, bd = 1e9; for (const s of S.sv) { if (insideBuilding(s)) continue; const p = project(s.w.x, s.w.y), cy = p.y - CHAR_H * TWs() * .5, d = Math.hypot(px - p.x, py - cy); if (d < Math.max(22, .4 * TWs()) && d < bd) { bd = d; best = s; } } return best;
}
function tapAt(px, py) {
  if (sel) {
    const t = unproject(px, py), tx = Math.floor(t.x), ty = Math.floor(t.y);
    if (sel.kind === 'road') { tryRoad(tx, ty); return; }
    if (sel.kind === 'wall') { tryWall(tx, ty, sel.wtype); return; }
    const d = DEFS[sel.type], o = Iso.originFromSouthTile(tx, ty, d.w, d.h); updatePreview(o.x, o.y); return;
  }
  const u = hitUnit(px, py); if (u) { unitPanel(u); return; }
  const b = hitBuilding(px, py); if (b) { showBuildingInfo(b); return; }
  { const t = unproject(px, py), wl = Wd.wallAt(world, Math.floor(t.x), Math.floor(t.y)); if (wl) { say(`${Wd.WALL_DEFS[wl.type].name} · ${Math.ceil(wl.hp)}/${wl.max} HP`); return; } }
  selected = null; closeP();
}
$('nudge').addEventListener('click', (e) => { const bt = e.target.closest('button'); if (!bt || !preview) return; const [dx, dy] = bt.dataset.d.split(',').map(Number); updatePreview(preview.x + dx, preview.y + dy); });
$('yesBuild').onclick = confirmPreview; $('noBuild').onclick = () => { endBuildMode(true); say(sel ? '' : 'Done.'); };
$('mBuild').onclick = showBuild; $('mSurv').onclick = showSurvivors; $('mTown').onclick = showTown; $('mGuide').onclick = showGuide; $('mExp').onclick = showExpedition; $('tripChip').onclick = showExpedition;
$('closeBuild').onclick = closeP; $('closeInfo').onclick = closeP;
$('btnCenter').onclick = () => centerOn(7.5, 10, .9);
$('btnSpeed').onclick = () => { simSpeed = simSpeed === 1 ? 2 : simSpeed === 2 ? 3 : 1; $('btnSpeed').textContent = simSpeed + '×'; };
$('btnDebug').onclick = () => { debug = !debug; $('btnDebug').classList.toggle('on', debug); };
$('ib').addEventListener('click', (e) => { const r = e.target.closest('[data-sv]'); if (!r) return; const s = S.sv.find((q) => q.id === +r.dataset.sv); if (s) { selected = { kind: 'unit', ref: s }; closeP(); centerOn(s.w.x, s.w.y); } });

/* ---------------- loop ---------------- */
function simTick() {
  tick++; if (S.alert > 0) S.alert--; S.sv.forEach(ai); S.z.forEach(zai); S.z = S.z.filter((z) => z.hp > 0); monsterGeneration(); visitorArrival();
  if (tick % 120 === 0) missionProgress(); if (tick % 240 === 0) checkRank(); if (tick % 24000 === 0 && tick > 0) triggerTownEvent(); if (tick % 450 === 0) saveGame();
  if (tick % 300 === 0) autoStaff(); if (tick % 60 === 0) { tripUpdate(); expTick(); } if (tick % 60 === 0 && world.walls.size) autoRepair(); if (tick % 240 === 0 && world.walls.size) checkPerimeter();
  if (tick % 1000 === 0) { S.hour++; hourlyProduction(); eventSchedule(); if (S.hour === 20) { screenToast('🌙 NIGHT FALLS — THE DEAD ARE RESTLESS'); say('Night falls: more zombies, and they come for the town.'); } if (S.hour === 6) { screenToast('☀ DAWN — THE HORDE THINS'); say('Dawn: fewer zombies until nightfall.'); } if (S.hour >= 24) { S.hour = 0; S.day++; endOfDay(); } ui(); }
}
let last = 0, acc = 0; const STEP = 1000 / 60;
function frame(t) { if (!last) last = t; acc += modalOpen ? 0 : Math.min(100, t - last) * simSpeed; last = t; let n = 0; while (acc >= STEP && n < 12) { simTick(); acc -= STEP; n++; } if (n === 12) acc = 0; draw(); requestAnimationFrame(frame); }
document.addEventListener('visibilitychange', () => { if (document.hidden) saveGame(); else { last = 0; tripUpdate(); expTick(); } }); window.addEventListener('pagehide', saveGame);

/* ---------------- init ---------------- */
async function init() {
  await loadAll(); resize();
  const restored = loadGame();
  if (!restored) {
    world.buildings = [{ type: 'medic', x: 2, y: 7, w: 2, h: 2, q: 10, a: 10 }, { type: 'canteen', x: 8, y: 6, w: 2, h: 2, q: 10, a: 10 }, { type: 'house', x: 11, y: 11, w: 2, h: 2, q: 10, a: 8 }]; Wd.bump(world);
    S.sv = [mk('Marcus', 'Guard', 3, 7, 12, 0), mk('Amy', 'Medic', 2, 5, 10, 1), mk('Lena', 'Scavenger', 2, 9, 14, 2), mk('Ben', 'Farmer', 1, 6, 11, 3)];
    spawn(5, 3, 'walker'); spawn(9, 3, 'crawler'); spawn(12, 4, 'walker');
  } else { for (let i = 0; i < 3; i++) spawn(); if (restored.cam && restored.cam.z) { cam.z = restored.cam.z; cam.x = restored.cam.x; cam.y = restored.cam.y; clampCam(); } }
  if (!restored || !restored.cam) centerOn(7.5, 10, Math.max(.7, Math.min(1.1, VW / 430)));
  autoStaff(); tripUpdate(); expTick(); if (!S.mission) beginMission(); updateZoomLabel(); ui(); $('loading').style.display = 'none'; requestAnimationFrame(frame);
}
// test / debug hook (no effect on gameplay)
window.ZH = { S, world, Wd, Iso, cam, project, unproject, spriteRect, hitBuilding, hitUnit, insideBuilding, tapAt, unitPanel, combos, payUpkeep, upkeepTotal, equip, unequip, stat, ITEMS, stashAdd, gearUpgrade, expandTerritory, spawnRaid, spawnBoss, changeProfession, unitExtra, gainXp, SKILLS, expBlock, isNight, startTool, updatePreview, confirmPreview, centerOn, draw, simTick, step(n) { for (let i = 0; i < n; i++) simTick(); }, spawn, mk, SPR, get sel() { return sel; }, get preview() { return preview; }, get selected() { return selected; }, get tick() { return tick; }, serialize, loadGame, saveGame, closeP, expAutoSquad, expEligible, expPreview, startExpedition, expRecall, tripUpdate, expTick, showExpedition, expLocked, EXP_DEFS, EXP_RISK, showEventPopup, autoStaff, tryWall, checkPerimeter, autoRepair, killSurvivor, useBandage, bleedMax, careTicks, BLEED_TICKS, CARE_TICKS, retreatCheck, wallBroken, perimText, upgradeBuilding, upgradeCheck, hourlyProduction, endOfDay, supplyStats, ration, workBoost, isWorking, prodMult, supplyCap, DEFS, setDebug(v) { debug = v; }, endBuildMode, demolish, moveBuilding, TWs, THs, BASE_TW, BASE_TH };
init();
})();
