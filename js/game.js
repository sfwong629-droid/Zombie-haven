/* Zombie Haven V2.6 — game (single IIFE; built from tools/parts/p1..p3 by tools/build_game.sh). */
(function () {
'use strict';
const Iso = window.ZHIso, Wd = window.ZHWorld;
const VERSION = '2.6.1', SAVE_KEY = 'zombieHavenV26', PREV_KEY = 'zombieHavenV25', OLD_KEY = 'zombieHavenV2';
const BASE_TW = 56, BASE_TH = BASE_TW * Iso.RATIO;          // ONE projection for terrain, roads, buildings, units
const COLS = Wd.COLS, ROWS = Wd.ROWS, DEFS = Wd.DEFS, STAFF_JOBS = Wd.STAFF_JOBS;
const CHAR_H = 0.70;                                         // character content height in tile-widths (chibi, tunable)
const $ = (id) => document.getElementById(id);
const cv = $('game'), ctx = cv.getContext('2d'), worldEl = $('world');
let VW = 390, VH = 600, DPR = 1, tick = 0, simSpeed = 1, debug = false;

window.addEventListener('error', (e) => { const b = $('crash'); b.style.display = 'block'; b.textContent = 'GAME ERROR: ' + e.message + ' @ ' + (e.filename || '').split('/').pop() + ':' + e.lineno; });
window.addEventListener('unhandledrejection', (e) => { const b = $('crash'); b.style.display = 'block'; b.textContent = 'GAME ERROR: ' + (e.reason && e.reason.message || e.reason); });

/* ---------------- assets ---------------- */
const IMG = {}, SPR = {};   // SPR[type] = {img,w,h,ax,ay,grid,tileW}
const CHAR_FILES = { Civilian: 'civilian', Guard: 'guard', Medic: 'medic', Scavenger: 'scavenger', 'Police Officer': 'police_officer', Engineer: 'engineer', Cook: 'cook', Farmer: 'farmer' };
const ZOMBIE_FILES = ['walker', 'crawler', 'runner', 'bloated', 'spitter', 'brute'];
function loadImg(key, src) { return new Promise((res) => { const im = new Image(); im.onload = () => res(); im.onerror = () => { console.warn('missing asset', src); res(); }; im.src = src + '?v=' + VERSION; IMG[key] = im; }); }
const okImg = (im) => im && im.complete && im.naturalWidth > 0;
const scaledCache = new Map();
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
  let m = null; try { const im = SPR[type].img, c = document.createElement('canvas'); c.width = im.naturalWidth; c.height = im.naturalHeight; const g = c.getContext('2d'); g.drawImage(im, 0, 0); m = { w: c.width, h: c.height, d: g.getImageData(0, 0, c.width, c.height).data }; } catch (e) { m = null; }
  return (alphaMasks[type] = m);
}
async function loadAll() {
  const jobs = [];
  for (const [k, f] of Object.entries(CHAR_FILES)) jobs.push(loadImg('char:' + k, `assets/characters/${f}.png`));
  ZOMBIE_FILES.forEach((z) => jobs.push(loadImg('zombie:' + z, `assets/zombies/${z}.png`)));
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
  await Promise.all(jobs);
}

/* ---------------- state ---------------- */
const world = Wd.createWorld();
const S = { produced: 0, food: 14, water: 14, mat: 30, med: 8, ren: 0, rank: 1, threat: 1, day: 1, hour: 8, kills: 0, stage: 0, sv: [], z: [], spawnClock: 0, eventClock: 0, arrivalClock: 0, requests: [], builtCount: 0, mission: null, missionStart: { kills: 0, produced: 0, built: 0 }, lastSave: 0, seq: 0 };
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

/* ---------------- ground layer (pre-rendered once from the approved grass master tile) ---------------- */
const GS = 2; let groundCv = null; const GOX = ROWS * BASE_TW / 2 * GS;
function buildGround() {
  const w = Math.ceil((COLS + ROWS) * BASE_TW / 2 * GS), h = Math.ceil((COLS + ROWS) * BASE_TH / 2 * GS);
  groundCv = document.createElement('canvas'); groundCv.width = w; groundCv.height = h; const g = groundCv.getContext('2d'); g.imageSmoothingQuality = 'high';
  const tw = BASE_TW * GS, th = BASE_TH * GS; const A = scaled('ga', IMG.grass_a, tw + 2, th + 1.4), B = scaled('gb', IMG.grass_b, tw + 2, th + 1.4);
  for (let y = 0; y < ROWS; y++) for (let x = 0; x < COLS; x++) {
    const cx = GOX + (x - y) * tw / 2, top = (x + y) * th / 2;
    g.save(); g.beginPath(); g.moveTo(cx, top - .5); g.lineTo(cx + tw / 2 + .5, top + th / 2); g.lineTo(cx, top + th + .5); g.lineTo(cx - tw / 2 - .5, top + th / 2); g.closePath(); g.clip();
    const im = (x * 7 + y * 13) % 3 === 0 ? B : A; if (okImg(IMG.grass_a)) g.drawImage(im, cx - tw / 2 - 1, top - .7); else { g.fillStyle = '#6aa84f'; g.fillRect(cx - tw / 2, top, tw, th); }
    if (!Wd.inTown(x, y)) { g.fillStyle = 'rgba(8,38,24,.30)'; g.fillRect(cx - tw / 2 - 1, top - 1, tw + 2, th + 2); }
    g.restore();
  }
}
function drawGround() {
  if (!groundCv) return; const z = cam.z / GS, o = project(0, 0);
  ctx.imageSmoothingEnabled = true; ctx.imageSmoothingQuality = 'high';
  ctx.drawImage(groundCv, o.x - GOX * z, o.y, groundCv.width * z, groundCv.height * z);
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
function spriteRect(b) { const sp = SPR[b.type]; if (!sp) return null; const a = project(b.x + b.w, b.y + b.h), tw = TWs(), s = sp.grid ? tw / sp.tileW : ((b.w + b.h) * tw / 2) * sp.fit / sp.w; return { x: a.x - sp.ax * s, y: a.y - sp.ay * s, w: sp.w * s, h: sp.h * s, s, anchor: a }; }
function drawBuilding(b, ghost, ok) {
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
function drawSheet(key, img, frame, fw, fh, p, hScale, footY) {   // hScale = content height in tile widths; content ≈118px tall in the 160px frame
  if (!okImg(img)) return; const tw = TWs(), sc = hScale * tw / 118;
  ctx.fillStyle = 'rgba(0,0,0,.28)'; ctx.beginPath(); ctx.ellipse(p.x, p.y, .26 * tw * Math.max(1, hScale / CHAR_H), .09 * tw, 0, 0, 7); ctx.fill();
  ctx.imageSmoothingEnabled = true;
  if (sc >= .75) { ctx.drawImage(img, frame * fw, 0, fw, fh, p.x - fw * sc / 2, p.y - footY * sc, fw * sc, fh * sc); return; }
  const k = Math.max(.05, Math.round(sc * 32) / 32), sheet = scaled(key + 's', img, Math.round(img.width * k), Math.round(img.height * k));
  ctx.drawImage(sheet, Math.round(frame * fw * k), 0, Math.round(fw * k), sheet.height, p.x - fw * k / 2, p.y - footY * k, Math.round(fw * k), sheet.height);
}
const EMOJI = { Eating: '🍖', Drinking: '💧', Resting: '💤', Treatment: '💊', Shopping: '🛒', 'Getting food': '🥫', Working: '🔧' };
function bubble(p, txt) { ctx.font = `${Math.max(11, 13 * cam.z)}px sans-serif`; ctx.textAlign = 'center'; ctx.fillText(txt, p.x, p.y); }
function drawHuman(s) {
  const p = project(s.w.x, s.w.y); let f = 0;
  if (s.mode === 'down') f = 8; else if (s.carrying) f = 7; else if (s.mode === 'attack' || s.mode === 'recover') f = 1 + (Math.floor((tick + s.phase) / 5) % 4); else if (s.activity) f = 6; else if (s.moving) f = 1 + (Math.floor((tick + s.phase) / 6) % 4);
  drawSheet('c' + s.job, IMG['char:' + s.job] || IMG['char:Civilian'], f, 128, 160, p, CHAR_H, 147);
  const tw = TWs(), top = p.y - CHAR_H * tw - 3;
  if (s.hp < s.max || s.mode === 'attack' || s.mode === 'chase') { ctx.fillStyle = '#1a1715'; ctx.fillRect(p.x - 11 * cam.z, top, 22 * cam.z, 4 * cam.z); ctx.fillStyle = '#67c75a'; ctx.fillRect(p.x - 10 * cam.z, top + cam.z, 20 * cam.z * Math.max(0, s.hp / s.max), 2 * cam.z); }
  const ic = s.activity ? EMOJI[s.activity] : (s.mode === 'chase' || s.mode === 'attack' ? '⚔️' : s.mode === 'rescueTo' || s.mode === 'rescueCarry' ? '🚑' : s.mode === 'down' ? '💀' : s.mode === 'hospital' ? '💊' : s.purpose === 'patrol' ? '🛡️' : (s.purpose || '').startsWith('scav') ? '🔍' : s.mode === 'wait' && s.idleBubble && (tick + s.phase) % 600 < 130 ? s.idleBubble : '');
  if (ic) bubble({ x: p.x, y: top - 3 }, ic);
  if (selected && selected.ref === s) { ctx.strokeStyle = '#ffe145'; ctx.lineWidth = 2; ctx.beginPath(); ctx.ellipse(p.x, p.y, .34 * tw, .14 * tw, 0, 0, 7); ctx.stroke(); ctx.fillStyle = '#fff0b0'; ctx.font = `bold ${Math.max(9, 10 * cam.z)}px monospace`; ctx.textAlign = 'center'; ctx.fillText(s.name, p.x, p.y + .32 * tw); }
}
const ZSCALE = { bloated: 1.2, brute: 1.28, crawler: .9 };
function drawZombie(zm) {
  const p = project(zm.w.x, zm.w.y); let f = 0;
  if (zm.mode === 'zattack') f = 6; else if (zm.mode === 'zchase') f = 1 + (Math.floor((tick + zm.phase) / 6) % 4); else if (zm.mode === 'idle') f = Math.floor((tick + zm.phase) / 18) % 2 ? 1 : 0;
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
  for (const k of world.roads) { const [x, y] = k.split(',').map(Number); drawRoadTile(x, y); }
  {
    const c = [[Wd.BUILD.x0, Wd.BUILD.y0], [Wd.BUILD.x1 + 1, Wd.BUILD.y0], [Wd.BUILD.x1 + 1, Wd.BUILD.y1 + 1], [Wd.BUILD.x0, Wd.BUILD.y1 + 1]].map(([x, y]) => project(x, y));
    ctx.beginPath(); ctx.moveTo(c[0].x, c[0].y); c.slice(1).forEach((p) => ctx.lineTo(p.x, p.y)); ctx.closePath(); ctx.strokeStyle = 'rgba(214,235,178,.28)'; ctx.lineWidth = Math.max(1, cam.z); ctx.stroke();
  }
  if (sel) {
    for (let y = Wd.BUILD.y0; y <= Wd.BUILD.y1; y++) for (let x = Wd.BUILD.x0; x <= Wd.BUILD.x1; x++) {
      const occ = Wd.buildingAt(world, x, y), road = Wd.isRoad(world, x, y);
      if (sel.kind === 'road') diamond(x, y, road ? 'rgba(113,129,138,.55)' : (occ ? 'rgba(183,90,85,.45)' : 'rgba(95,174,97,.30)'), road ? '#b4c2c8' : 'rgba(155,220,133,.5)');
      else diamond(x, y, road ? 'rgba(113,129,138,.35)' : (occ ? 'rgba(183,90,85,.40)' : 'rgba(95,174,97,.22)'), 'rgba(155,220,133,.35)');
    }
    if (preview && sel.kind === 'building') for (let yy = 0; yy < preview.h; yy++) for (let xx = 0; xx < preview.w; xx++) diamond(preview.x + xx, preview.y + yy, preview.ok ? 'rgba(114,217,223,.62)' : 'rgba(226,91,85,.62)', preview.ok ? '#d7ffff' : '#ffb0a8');
  }
  const items = [];
  const box = (x, y, r) => ({ x1: x - r, y1: y - r, x2: x + r, y2: y + r });
  TREE_SPOTS.forEach(([x, y]) => { if (!Wd.buildingAt(world, x, y)) items.push({ ...box(x + .5, y + .5, .22), fn: () => drawProp('tree', x, y) }); });
  CRATE_SPOTS.forEach(([x, y]) => items.push({ ...box(x + .5, y + .5, .2), fn: () => drawProp('crate', x, y) }));
  DEBRIS_SPOTS.forEach(([x, y]) => items.push({ ...box(x + .5, y + .5, .2), fn: () => drawProp('debris', x, y) }));
  world.buildings.forEach((b) => items.push({ x1: b.x, y1: b.y, x2: b.x + b.w, y2: b.y + b.h, fn: () => { drawBuilding(b); if (selected && selected.ref === b) selectRing(b); drawStaffBadge(b); } }));
  if (preview && sel && sel.kind === 'building') items.push({ x1: preview.x, y1: preview.y, x2: preview.x + preview.w, y2: preview.y + preview.h, bias: .01, fn: () => drawBuilding(preview, true, preview.ok) });
  S.z.forEach((z) => { if (z.hp > 0) items.push({ ...box(z.w.x, z.w.y, .12), fn: () => drawZombie(z) }); });
  S.sv.forEach((s) => items.push({ ...box(s.w.x, s.w.y, .12), fn: () => drawHuman(s) }));
  Iso.sortDrawables(items).forEach((o) => o.fn());
  for (const f of floats) { const p = project(f.w.x, f.w.y); ctx.globalAlpha = Math.min(1, f.a / 15); ctx.fillStyle = f.col; ctx.font = `bold ${Math.max(10, 11 * cam.z)}px Arial`; ctx.textAlign = 'center'; ctx.fillText(f.t, p.x, p.y - CHAR_H * TWs() - 8 - (55 - f.a) * .25); ctx.globalAlpha = 1; }
  for (let i = floats.length - 1; i >= 0; i--) if (--floats[i].a <= 0) floats.splice(i, 1);
  if (debug) drawDebug();
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
};
const weaponCost = (w) => Math.ceil(w[2] / 45);   // weapons are bought with PARTS from the stockpile (no money)
const RATION_BASE = { Civilian: 1, Farmer: 1, Medic: 1, Paramedic: 1, Engineer: 1.25, Mechanic: 1.25, Guard: 1.5, 'Police Officer': 1.5, SWAT: 1.5, Scavenger: 1.5 };
const LEVEL_CAP = 5;
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
const rnd = Math.random;
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
  const gt = tileOf(goal), gk = gt.x + ',' + gt.y;
  if (!o.path || o.pathGoal !== gk || o.pathVer !== world.ver) {
    const p = Wd.findPath(world, tileOf(o.w), gt); o.pathGoal = gk; o.pathVer = world.ver;
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
    if (o.path && !o.path.length) { if (stepToward(o, goal, sp)) { o.path = null; o.pathGoal = null; return 'arrived'; } }
  }
  const moved = Math.hypot(o.w.x - before.x, o.w.y - before.y);
  o.stuck = moved < sp * .25 ? (o.stuck || 0) + 1 : 0;
  if (o.stuck > 90) { o.path = null; o.pathGoal = null; o.stuck = 0; return 'fail'; }
  return 'moving';
}
function moveSlide(o, t, sp) {                // free movement that cannot enter buildings (zombie roaming)
  const dx = t.x - o.w.x, dy = t.y - o.w.y, d = Math.hypot(dx, dy); o.moving = d > .02; if (d <= sp) { if (Wd.walkable(world, Math.floor(t.x), Math.floor(t.y))) { o.w.x = t.x; o.w.y = t.y; } return true; }
  const nx = o.w.x + dx / d * sp, ny = o.w.y + dy / d * sp;
  if (Wd.walkable(world, Math.floor(nx), Math.floor(ny))) { o.w.x = nx; o.w.y = ny; }
  else if (Wd.walkable(world, Math.floor(nx), Math.floor(o.w.y))) o.w.x = nx;
  else if (Wd.walkable(world, Math.floor(o.w.x), Math.floor(ny))) o.w.y = ny; else return true;
  return false;
}

/* ---------------- survivors ---------------- */
function mk(name, job, l, x, y, i) {
  return { id: ++S.seq, name, job, l, mastery: 0, w: tc(x, y), hp: 58 + l * 8, max: 58 + l * 8, post: null, weapon: weapons[0], mode: 'free', target: null, cool: 20 + i * 23, stateTicks: 30 + i * 11, sat: 8 + i * 3, resident: false, i, phase: i * 37, dest: null, moving: false, hunger: 15 + i * 8, thirst: 10 + i * 6, fatigue: 8 + i * 5, activity: null, facility: null, rescuer: null, rescuing: null, carrying: null, lastFacility: null, why: 'Settling in', purpose: null, idleBubble: '' };
}
const medSite = () => bOf('hospital')[0] || bOf('clinic')[0] || bOf('medic')[0] || null;
function sitePoint() { const b = medSite(); return b ? Wd.doorPoint(b) : tc(3, 10); }
const downedUnassigned = () => S.sv.filter((q) => q.mode === 'down' && !q.rescuer);
function facilityUsers(b) { return S.sv.filter((s) => s.facility === b && ['goFacility', 'useFacility'].includes(s.mode)).length; }   // reservation: heading there counts
const cap = (b) => (DEFS[b.type] ? DEFS[b.type].cap : 1);
function settlePause(s, min = 150, max = 330) { s.mode = 'wait'; s.dest = null; s.path = null; s.moving = false; s.stateTicks = min + rnd() * (max - min); s.idleBubble = ['💭', '👀', '🙂', '💬'][Math.floor(rnd() * 4)]; if (!s.why.startsWith('Idle')) s.why = 'Idle · taking a breather'; }
function enterFree(s, d = 110) { s.mode = 'free'; s.target = null; s.activity = null; s.stateTicks = d; s.dest = null; s.path = null; s.moving = false; s.purpose = null; }
function enterPost(s) { s.mode = 'postCombat'; s.target = null; s.stateTicks = 135 + s.i * 24; s.moving = false; s.path = null; s.why = 'Catching breath after a fight'; }
function needScore(s, b) {
  const r = facilityRules[b.type]; if (!r) return -999; let sc = 0;
  if (r.need === 'hunger') sc += s.hunger * 1.4; if (r.need === 'thirst') sc += s.thirst * 1.5; if (r.need === 'fatigue') sc += s.fatigue * 1.2;
  if (r.need === 'injury') sc += (1 - s.hp / s.max) * 140;
  if (r.need === 'gear') { const best = weapons.filter((w) => weaponCost(w) + 6 <= S.mat && w[1] >= s.weapon[1] * 1.15).sort((a, c) => c[1] - a[1])[0]; sc += best ? 75 : 0; }
  if ((r.need === 'hunger' && S.food < 1) || (r.need === 'thirst' && S.water < 1)) sc -= 90;
  sc += b.a * .35 + b.q * .45; if (s.lastFacility === b) sc -= 30;
  sc -= dist(s.w, Wd.doorPoint(b)) * 1.2;       // nearer is better
  return sc;
}
function chooseFacility(s) {
  const c = world.buildings.filter((b) => facilityRules[b.type] && facilityUsers(b) < cap(b)); if (!c.length) return null;
  c.sort((a, b) => needScore(s, b) - needScore(s, a)); return needScore(s, c[0]) > 24 ? c[0] : null;
}
const NEEDTXT = { hunger: 'Hungry', thirst: 'Thirsty', fatigue: 'Tired', injury: 'Hurt', gear: 'Wants better gear' };
function chooseTownAction(s) { const b = chooseFacility(s); if (b && b !== s.lastFacility) { s.facility = b; s.mode = 'goFacility'; s.stateTicks = 9999; s.dest = null; s.path = null; s.why = `${NEEDTXT[facilityRules[b.type].need]} → ${DEFS[b.type].name}`; return true; } return false; }
function nearestZombie(s) { let best = null, bd = 1e9; for (const z of S.z) if (z.hp > 0) { const d = dist(s.w, z.w); if (d < bd) { bd = d; best = z; } } return best; }
function acquireEnemy(s) { const z = nearestZombie(s), cfg = jobAI[s.job] || jobAI.Civilian; if (z && dist(s.w, z.w) <= cfg.aggro) { s.target = z; s.mode = 'chase'; s.stateTicks = 9999; s.path = null; s.why = `Fighting a ${zombieTypes[z.type].name}`; return true; } return false; }
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
  if (rnd() < Math.min(.94, .58 * cfg.town) && chooseTownAction(s)) return;
  if (acquireEnemy(s)) return; if (chooseTownAction(s)) return;
  if (s.post && s.post.staff === s && S.hour >= 6 && S.hour < 20 && rnd() < .85) { s.mode = 'goWork'; s.dest = null; s.path = null; s.stateTicks = 9999; s.why = 'Heading to work at ' + DEFS[s.post.type].name; return; }
  const r = rnd();
  if ((s.job === 'Guard' || s.job === 'Police Officer') && r < .35) { s.dest = patrolDest(); s.mode = 'walk'; s.purpose = 'patrol'; s.why = 'Patrolling the north road'; s.stateTicks = 700; return; }
  if (s.job === 'Scavenger' && r < .30 && activeZ() <= 3) { s.dest = tc(2 + Math.floor(rnd() * 11), 3 + Math.floor(rnd() * 3)); s.mode = 'walk'; s.purpose = 'scav-out'; s.why = 'Scavenging outside the walls'; s.stateTicks = 900; return; }
  if (r < .66) { settlePause(s); return; }
  s.dest = roamDest(); s.mode = 'walk'; s.purpose = 'roam'; s.why = 'Strolling through town'; s.stateTicks = 600;
}
const activeZ = () => S.z.filter((z) => z.hp > 0).length;
function finishFacility(s) {
  const b = s.facility; if (!b) { s.activity = null; enterFree(s, 110); return; } const r = facilityRules[b.type]; if (!r) { s.facility = null; enterFree(s, 110); return; }
  s.sat += r.sat; floats.push({ w: { ...s.w }, t: '♥+' + r.sat, col: '#ff9fbd', a: 70 });
  if (r.need === 'hunger') { if (S.food >= .5) s.hunger = Math.max(0, s.hunger - r.benefit); else floats.push({ w: { ...s.w }, t: 'NO FOOD', col: '#ff8a7a', a: 70 }); }
  if (r.need === 'thirst') { if (S.water >= .5) s.thirst = Math.max(0, s.thirst - r.benefit); else floats.push({ w: { ...s.w }, t: 'NO WATER', col: '#ff8a7a', a: 70 }); }
  if (r.need === 'fatigue') s.fatigue = Math.max(0, s.fatigue - r.benefit);
  if (r.need === 'injury') {            // medicine is its own supply: full care with a dose, half without
    if (S.med >= 1) { S.med -= 1; s.hp = Math.min(s.max, s.hp + r.benefit); floats.push({ w: { ...s.w }, t: '-1 MED', col: '#9fe0ff', a: 70 }); }
    else { s.hp = Math.min(s.max, s.hp + Math.round(r.benefit * .5)); floats.push({ w: { ...s.w }, t: 'NO MEDICINE', col: '#ff8a7a', a: 70 }); }
  }
  if (b.type === 'armory') { const ch = weapons.filter((w) => w[1] >= s.weapon[1] * 1.15 && weaponCost(w) + 6 <= S.mat).sort((a, c) => c[1] - a[1]); if (ch.length) { const w = ch[0]; S.mat -= weaponCost(w); s.weapon = w; screenToast(s.name + ' equipped ' + w[0] + ' · -' + weaponCost(w) + ' PARTS'); s.sat += 2; say(s.name + ' took a ' + w[0] + ' from the Armory.'); } }
  s.mastery += 1 + (professions[s.job]?.facility || 0) * .1; masteryCheck(s);
  if (!s.resident && s.sat >= 35 && !s.requested) { s.requested = true; queueResidentRequest(s); }
  s.lastFacility = b; s.facility = null; s.activity = null; s.mode = 'free'; s.stateTicks = 120 + s.i * 28; s.cool = 0; s.why = 'Feeling better'; ui();
}
function ai(s) {
  if (s.cool > 0) s.cool--; if (s.stateTicks > 0) s.stateTicks--;
  if (tick % 90 === (s.i * 17) % 90 && !['down', 'hospital'].includes(s.mode)) { s.hunger = Math.min(100, s.hunger + 1.5); s.thirst = Math.min(100, s.thirst + 1.8); s.fatigue = Math.min(100, s.fatigue + 1); }
  if (s.hp <= 0 && s.mode !== 'down') { s.hp = 0; s.mode = 'down'; s.target = null; s.dest = null; s.path = null; s.facility = null; s.activity = null; s.moving = false; s.rescuer = null; s.rescuing = null; s.carrying = null; s.why = 'Collapsed — needs rescue'; say(s.name + ' collapsed!'); return; }
  if (s.mode === 'down') { s.moving = false; return; }
  if (s.mode === 'hospital') { s.moving = false; if (s.stateTicks <= 0) { const dose = S.med >= 1; if (dose) S.med -= 1; s.hp = Math.round(s.max * (dose ? (bOf('hospital').length ? 1 : .7) : .4)); if (!dose) say('No medicine: ' + s.name + ' recovered only partly.'); s.fatigue = Math.max(0, s.fatigue - 35); enterFree(s, 60); s.why = 'Recovered'; say(s.name + ' recovered and returned.'); } return; }
  if (s.mode === 'rescueTo') {
    const q = s.rescuing; if (!q || q.mode !== 'down') { s.rescuing = null; enterPost(s); return; }
    const r = followPath(s, q.w, .02); if (r === 'arrived') { s.carrying = q; q.w = { x: s.w.x, y: s.w.y }; s.mode = 'rescueCarry'; s.path = null; s.why = `Carrying ${q.name} to ${medSite() ? DEFS[medSite().type].name : 'safety'}`; say(`${s.name} picked up ${q.name}.`); } else if (r === 'fail') { q.rescuer = null; s.rescuing = null; enterPost(s); } return;
  }
  if (s.mode === 'rescueCarry') {
    const q = s.carrying; if (!q) { enterPost(s); return; }
    const r = followPath(s, sitePoint(), CARRY); q.w = { x: s.w.x - .12, y: s.w.y - .05 };
    if (r === 'arrived' || r === 'fail') { q.w = { ...sitePoint() }; q.mode = 'hospital'; q.hp = 1; q.stateTicks = 230; q.rescuer = null; q.why = 'Recovering in care'; q.path = null; s.carrying = null; s.rescuing = null; enterPost(s); say(q.name + ' reached ' + (medSite() ? DEFS[medSite().type].name : 'safety') + '.'); } return;
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
    if (s.stateTicks <= 0 || S.hour < 6 || S.hour >= 20) { s.activity = null; s.mastery += .6; masteryCheck(s); enterFree(s, 40); } return;
  }
  if (s.mode === 'goFacility') {
    if (!s.facility || !world.buildings.includes(s.facility)) { s.facility = null; enterFree(s, 25); return; }
    const r = followPath(s, Wd.doorPoint(s.facility), WALK * 1.15);
    if (r === 'arrived') { const ru = facilityRules[s.facility.type]; s.mode = 'useFacility'; s.activity = ru.label; s.stateTicks = ru.use; s.path = null; s.why = ru.label + ' at ' + DEFS[s.facility.type].name; }
    else if (r === 'fail') { s.facility = null; enterFree(s, 90); s.why = "Couldn't reach it — trying later"; } return;
  }
  if (s.mode === 'useFacility') { s.moving = false; if (!s.facility || !world.buildings.includes(s.facility)) { s.facility = null; s.activity = null; enterFree(s, 40); return; } if (s.stateTicks <= 0) { finishFacility(s); s.stateTicks = 50 + s.i * 9; } return; }
  if (['chase', 'attack', 'recover'].includes(s.mode)) {
    if (!s.target || s.target.hp <= 0) { enterPost(s); return; }
    if (s.mode === 'chase') { const d = dist(s.w, s.target.w); if (d > .9) { const r = followPath(s, s.target.w, CHASE); if (r === 'fail') { s.target = null; enterPost(s); } } else { s.moving = false; s.mode = 'attack'; s.path = null; s.stateTicks = 32 + s.i * 8; } return; }
    if (s.mode === 'attack') { s.moving = false; if (s.stateTicks <= 0) { const z = s.target, bonus = professions[s.job]?.combat || 0, dmg = Math.round(6 + s.weapon[1] * .55 + bonus); z.hp -= dmg; floats.push({ w: { ...z.w }, t: '-' + dmg, col: '#ffe06b', a: 55 }); s.mastery += .5; masteryCheck(s);
      if (z.hp <= 0) { S.kills++; const zd = zombieTypes[z.type] || zombieTypes.walker; if (rnd() < .25) { S.mat += 1; floats.push({ w: { ...z.w }, t: '+1 PARTS', col: '#9fe0ff', a: 70 }); } renownGain(zd.ren, zd.name + ' defeated'); say(s.name + ' defeated a ' + zd.name + '!'); if (S.stage === 1 && S.kills >= 3) { S.stage = 2; renownGain(10, 'Goal complete'); say('Goal complete!'); } enterPost(s); return; }
      s.mode = 'recover'; s.stateTicks = 48 + s.i * 9; } return; }
    if (s.mode === 'recover') { s.moving = false; if (s.stateTicks <= 0) s.mode = 'chase'; } return;
  }
  if (s.mode === 'postCombat') { s.moving = false; if (downedUnassigned().length) { assignRescue(); if (s.mode === 'rescueTo') return; } if (s.stateTicks <= 0) enterFree(s, 20); return; }
  if (s.mode === 'wait') { s.moving = false; if (s.stateTicks <= 0) { s.mode = 'free'; s.stateTicks = 0; scavWait(s); } return; }
  if (s.mode === 'walk') {
    if (acquireEnemy(s) && (s.job === 'Guard' || s.job === 'Police Officer')) return;
    const r = s.dest ? followPath(s, s.dest, WALK) : 'arrived';
    if (r === 'moving' && s.stateTicks > 0) return;
    if (s.purpose === 'scav-out' && r === 'arrived') { s.mode = 'wait'; s.stateTicks = 160; s.purpose = 'scav-search'; s.why = 'Searching for supplies'; s.dest = null; s.path = null; return; }
    if (s.purpose === 'scav-back' && r === 'arrived') { lootFind(s); s.mastery += 1; masteryCheck(s); ui(); }
    s.dest = null; s.path = null; settlePause(s, 100, 220); return;
  }
  if (s.mode === 'wait' || s.purpose === 'scav-search') return;
  if (s.mode === 'free') { if (s.stateTicks > 0) { s.moving = false; return; } chooseLifePurpose(s); }
}
// scavenger leaves 'wait' after searching → head home
function lootFind(s) {
  const r = rnd(), bonus = professions[s.job]?.scav > 2 ? 1 : 0, f = (t, col) => floats.push({ w: { ...s.w }, t, col, a: 70 });
  if (r < .42) { const n = 1 + bonus; S.mat += n; f('+' + n + ' PARTS', '#9fe0ff'); }
  else if (r < .49) { S.med += 1; f('+1 MEDICINE', '#c5f0a0'); say(s.name + ' found medicine while scavenging.'); }
  else if (r < .75) { const n = 1 + bonus; S.food += n; S.produced += n; f('+' + n + ' FOOD', '#ffe06b'); }
  else { const n = 1 + bonus; S.water += n; S.produced += n; f('+' + n + ' WATER', '#8fd8ff'); }
}
function scavWait(s) { if (s.purpose === 'scav-search' && s.mode === 'free') { s.mode = 'walk'; s.purpose = 'scav-back'; s.dest = tc(7, 9); s.why = 'Returning with supplies'; s.stateTicks = 900; } }

/* ---------------- zombies ---------------- */
function weightedZombie() {
  const pool = Object.entries(zombieTypes).filter(([k]) => k === 'walker' || k === 'crawler' || (k === 'runner' && S.rank >= 2) || ((k === 'bloated' || k === 'spitter') && S.rank >= 3) || (k === 'brute' && S.rank >= 4));
  let tot = pool.reduce((a, [, v]) => a + v.weight, 0), r = rnd() * tot; for (const [k, v] of pool) { r -= v.weight; if (r <= 0) return k; } return 'walker';
}
function spawn(x = null, y = null, type = null) {
  const edge = [[1, 2], [4, 2], [8, 2], [12, 2], [14, 4], [1, 5]], a = edge[Math.floor(rnd() * edge.length)], kind = type || weightedZombie(), d = zombieTypes[kind];
  S.z.push({ type: kind, w: tc(x ?? a[0], y ?? a[1]), hp: d.hp, max: d.hp, cool: 35 + rnd() * 40, phase: rnd() * 100, dest: null, mode: 'appear', stateTicks: 45 + rnd() * 30, target: null, path: null });
}
function monsterGeneration() { S.spawnClock++; const desired = Math.min(2 + S.rank + Math.floor(S.threat / 2), 7); if (activeZ() < desired && S.spawnClock > 150 - Math.min(70, S.threat * 8)) { spawn(); S.spawnClock = 0; } }
function zai(z) {
  const d = zombieTypes[z.type] || zombieTypes.walker; if (z.cool > 0) z.cool--; if (z.stateTicks > 0) z.stateTicks--;
  if (z.mode === 'appear') { z.moving = false; if (z.stateTicks <= 0) { z.mode = 'idle'; z.stateTicks = 35 + rnd() * 70; } return; }
  if (z.mode === 'idle') {
    if (!z.dest || z.stateTicks <= 0) { z.dest = { x: z.w.x + (rnd() - .5) * 3, y: z.w.y + (rnd() - .5) * 3 }; z.stateTicks = 60 + rnd() * 100; }
    if (z.dest) moveSlide(z, z.dest, d.chase * .35);
    let best = null, bd = 1e9; for (const s of S.sv) if (s.hp > 0 && !['down', 'hospital'].includes(s.mode)) { const dd = dist(s.w, z.w); if (dd < bd) { bd = dd; best = s; } }
    if (best && bd < d.aggro) { z.target = best; z.mode = 'zchase'; z.path = null; } return;
  }
  if (z.mode === 'zchase') {
    if (!z.target || z.target.hp <= 0 || ['down', 'hospital'].includes(z.target.mode)) { z.target = null; z.mode = 'idle'; z.stateTicks = 40; return; }
    const dd = dist(z.target.w, z.w); if (dd > 4.8) { z.target = null; z.mode = 'idle'; z.stateTicks = 60; return; }
    if (z.type === 'spitter' && dd < 2.8) { z.mode = 'zattack'; z.stateTicks = 34; } else if (dd > .8) { if (followPath(z, z.target.w, d.chase) === 'fail') moveSlide(z, z.target.w, d.chase); } else { z.mode = 'zattack'; z.stateTicks = 26; } return;
  }
  if (z.mode === 'zattack') { z.moving = false; if (z.stateTicks <= 0) { if (z.target && z.target.hp > 0) { const dmg = d.atk + (z.type === 'brute' ? 2 : 0); z.target.hp -= dmg; floats.push({ w: { ...z.target.w }, t: '-' + dmg, col: '#ff6e62', a: 55 }); } z.mode = 'zrecover'; z.stateTicks = (z.type === 'runner' ? 38 : z.type === 'brute' ? 82 : 58) + rnd() * 22; } return; }
  if (z.mode === 'zrecover') { if (z.stateTicks <= 0) z.mode = z.target && z.target.hp > 0 ? 'zchase' : 'idle'; }
}

/* ---------------- town systems ---------------- */
function masteryCheck(s) {      // experience: each level raises the work boost and the daily ration; capped at LEVEL_CAP
  const p = professions[s.job]; if (!p || s.mastery < p.master) return;
  if ((s.l || 1) < LEVEL_CAP) { s.l = (s.l || 1) + 1; s.mastery = 0; s.max += 8; s.hp = Math.min(s.max, s.hp + 8); s.mastered = false; renownGain(1, `${s.name} reached Lv.${s.l}`); screenToast(`${s.name} · LEVEL ${s.l}`); }
  else if (!s.mastered) { s.mastered = true; renownGain(2, s.name + ' mastered ' + s.job); screenToast(s.name + ' MASTERED ' + s.job); }
}

/* ---------------- supplies: production, staffing, rations, upgrades ---------------- */
const SUPPLY_BASE_CAP = 60, SUPPLY_PER_STORAGE = 40;
const supplyCap = () => SUPPLY_BASE_CAP + SUPPLY_PER_STORAGE * bOf('storage').length;
const isWorking = (b) => !!(b.staff && b.staff.mode === 'work' && b.staff.hp > 0);
const prodMult = (b) => 1 + (isWorking(b) ? workBoost(b.staff) : 0);
const dayLog = { foodIn: 0, waterIn: 0 };
function hourlyProduction() {   // runs every game hour
  let fi = 0, wi = 0;
  for (const b of world.buildings) {
    const d = DEFS[b.type]; if (!d) continue;
    if (d.fam === 'water') { const a = d.out / 24 * prodMult(b); S.water = Math.min(supplyCap(), S.water + a); wi += a; }
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
  let nf = 0, nw = 0; for (const q of S.sv) { nf += ration(q) / 2; nw += ration(q) / 2; }
  const ef = Math.min(S.food, nf), ew = Math.min(S.water, nw); S.food -= ef; S.water -= ew;
  const ff = nf ? ef / nf : 1, fw = nw ? ew / nw : 1;
  for (const q of S.sv) { q.hunger = Math.min(100, q.hunger + (ff < 1 ? 28 * (1 - ff) : 0)); q.thirst = Math.min(100, q.thirst + (fw < 1 ? 28 * (1 - fw) : 0)); }
  const open = world.buildings.filter((b) => DEFS[b.type].slot && !b.staff).map((b) => DEFS[b.type].name);
  const f1 = (n) => (Math.round(n * 10) / 10).toFixed(1);
  say(`Day ${S.day - 1} · Food +${f1(dayLog.foodIn)} −${f1(ef)} · Water +${f1(dayLog.waterIn)} −${f1(ew)}` + (open.length ? ` · Open staff slot: ${[...new Set(open)].join(', ')}` : ''));
  dayLog.foodIn = dayLog.waterIn = 0;
  if (ff < 1) screenToast('⚠ OUT OF FOOD'); else if (S.food < nf) screenToast('⚠ FOOD: under 1 day left');
  if (fw < 1) screenToast('⚠ OUT OF WATER'); else if (S.water < nw) screenToast('⚠ WATER: under 1 day left');
  if (S.med < 2) screenToast('⚠ MEDICINE LOW');
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
  S.arrivalClock++; if (S.arrivalClock < 2200 || S.sv.length >= 8) return; S.arrivalClock = 0;
  const names = ['Noah', 'Maya', 'Eli', 'June', 'Rosa', 'Theo'], jobs = ['Civilian', 'Scavenger', 'Guard', 'Medic', 'Farmer', 'Mechanic'];
  const name = names.find((n) => !S.sv.some((s) => s.name === n)) || 'Survivor ' + (S.sv.length + 1), job = jobs[Math.floor(rnd() * jobs.length)], v = mk(name, job, 1, 7, 6, S.sv.length);
  v.sat = 3; v.stateTicks = 80; S.sv.push(v); screenToast('NEW SURVIVOR · ' + name); say(name + ' arrived at the Haven.'); ui();
}
function beginMission(id = null) { const d = id ? MISSION_DEFS.find((m) => m.id === id) : MISSION_DEFS[Math.floor(rnd() * MISSION_DEFS.length)]; S.mission = { ...d, progress: 0 }; S.missionStart = { kills: S.kills, produced: S.produced, built: S.builtCount }; say('Mission: ' + d.name); ui(); }
function missionProgress() {
  if (!S.mission) { beginMission(); return; } const m = S.mission; let p = 0;
  if (m.id === 'clear') p = S.kills - S.missionStart.kills; if (m.id === 'produce') p = S.produced - S.missionStart.produced; if (m.id === 'build') p = S.builtCount - S.missionStart.built;
  m.progress = Math.max(0, Math.min(m.goal, p));
  if (m.progress >= m.goal) { S.mat += m.rewardParts; screenToast('+' + m.rewardParts + ' PARTS · mission reward'); renownGain(m.rewardRen, m.name); screenToast('MISSION COMPLETE · ' + m.name); S.mission = null; setTimeout(() => beginMission(), 1200); }
}
function triggerTownEvent() { const e = TOWN_EVENT_DEFS[Math.floor(rnd() * TOWN_EVENT_DEFS.length)]; if (e.food) S.food += e.food; if (e.water) S.water += e.water; if (e.med) S.med += e.med; if (e.mat) S.mat += e.mat; if (e.ren) renownGain(e.ren, e.name); screenToast(e.name.toUpperCase()); say(e.text); ui(); }
const residents = () => S.sv.filter((s) => s.resident).length;
function checkRank() {
  const n = rankRules[S.rank]; if (!n) return;
  if (S.ren >= n.ren && S.produced >= n.income && residents() >= n.residents && world.buildings.length >= n.facilities) { S.rank++; S.threat++; S.mat += 4 + S.rank; S.med += 1; renownGain(5, 'Haven Rank ' + S.rank); screenToast('★ HAVEN RANK ' + S.rank + ' ★'); say('HAVEN RANK ' + S.rank + '! New threats and opportunities.'); ui(); }
}
function ui() {
  $('meds').textContent = Math.floor(S.med); $('food').textContent = Math.floor(S.food); $('water').textContent = Math.floor(S.water); $('mat').textContent = Math.floor(S.mat); $('ren').textContent = S.ren; $('rank').textContent = '★'.repeat(S.rank); $('threat').textContent = S.threat;
  $('clock').textContent = `DAY ${S.day} · ${String(S.hour).padStart(2, '0')}:00`;
  $('qt').textContent = S.stage === 0 ? 'Build a Rain Collector' : S.stage === 1 ? `Defeat 3 Walkers (${Math.min(S.kills, 3)}/3)` : (S.mission ? `${S.mission.name}: ${Math.floor(S.mission.progress)}/${S.mission.goal}` : 'Grow the Haven!');
}

/* ---------------- save / load / migration ---------------- */
const SKIP = new Set(['post', 'target', 'facility', 'rescuer', 'rescuing', 'carrying', 'path', 'pathGoal', 'pathVer', 'lastFacility', 'moving', 'stuck', 'lastD']);
function serialize() {
  const sv = S.sv.map((s) => { const o = {}; for (const k in s) if (!SKIP.has(k)) o[k] = s[k]; return o; });
  const { requests, sv: _sv, z: _z, ...rest } = S;
  return JSON.stringify({ version: VERSION, S: rest, sv, roads: [...world.roads], buildings: world.buildings.map((b) => ({ type: b.type, x: b.x, y: b.y, w: b.w, h: b.h, q: b.q, a: b.a, staffId: b.staff ? b.staff.id : null })), cam: { x: cam.x, y: cam.y, z: cam.z }, time: Date.now() });
}
function saveGame() { try { localStorage.setItem(SAVE_KEY, serialize()); S.lastSave = tick; } catch (e) { /* storage unavailable */ } }
function relinkSurvivor(s) {
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
      if (S.med === undefined) S.med = 8; S.food = Number(S.food) || 0; S.water = Number(S.water) || 0; S.mission = null; S.missionStart = { kills: S.kills || 0, produced: S.produced, built: S.builtCount || 0 };
      delete S.money; delete S.earned; S.sv.forEach((q) => { delete q.money; });
    }
    if (S.produced === undefined) S.produced = 0; if (S.med === undefined) S.med = 8;
    if (d.roads) world.roads = new Set(d.roads.map((r) => (Array.isArray(r) ? r.join(',') : r))); world.buildings = (d.buildings || []).filter((b) => DEFS[b.type]).map((b) => ({ type: b.type, x: b.x, y: b.y, w: DEFS[b.type].w, h: DEFS[b.type].h, q: b.q ?? DEFS[b.type].q, a: b.a ?? DEFS[b.type].a, staff: null, _staffId: b.staffId || null }));
    S.z = []; S.requests = []; S.sv.forEach(relinkSurvivor);
    for (const b of world.buildings) { if (b._staffId) { const q = S.sv.find((x) => x.id === b._staffId); if (q) { b.staff = q; q.post = b; } } delete b._staffId; }
    Wd.bump(world); return d;
  } catch (e) { console.warn('load failed', e); return false; }
}

/* ---------------- build / move / demolish ---------------- */
let moving = null;   // building being moved (removed from world while placing)
function closeP() { $('buildPanel').style.display = $('infoPanel').style.display = 'none'; }
function endBuildMode(restore) {
  if (restore && moving) { world.buildings.push(moving); Wd.bump(world); }
  moving = null; sel = null; preview = null; $('confirmBar').style.display = 'none';
}
function startTool(tool) {
  endBuildMode(true); closeP(); sel = tool; preview = null;
  if (tool.kind === 'road') { $('confirmName').textContent = `ROAD · ${Wd.ROAD_COST} part per tile · tap a tile to add, tap a road to remove`; $('yesBuild').style.display = 'none'; $('nudge').style.display = 'none'; $('noBuild').textContent = 'DONE'; $('confirmBar').style.display = 'block'; }
  else { $('yesBuild').style.display = ''; $('nudge').style.display = ''; $('noBuild').textContent = 'CANCEL'; say('Tap the tile where the building’s SOUTH corner should sit.'); }
}
function updatePreview(x, y) {
  const d = DEFS[sel.type], chk = Wd.placementCheck(world, x, y, d, null);
  preview = { type: sel.type, x, y, w: d.w, h: d.h, q: d.q, a: d.a, ok: chk.ok, why: chk.why };
  const mat = moving ? 0 : d.mat, afford = S.mat >= mat;
  $('confirmName').textContent = `${d.name.toUpperCase()} · ${d.w}×${d.h}` + (moving ? ' · MOVE (free)' : ` · PARTS ${d.mat}`) + (!chk.ok ? ' · ' + chk.why.toUpperCase() : !afford ? ' · NOT ENOUGH PARTS' : '');
  const go = chk.ok && afford; $('yesBuild').disabled = !go; $('yesBuild').style.opacity = go ? 1 : .45; $('confirmBar').style.display = 'block';
}
function pushUnitsOut(b) {
  const dp = Wd.doorPoint(b);
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
function demolish(b) { const d = DEFS[b.type], refund = Math.floor(d.mat * .5); releasePost(b); world.buildings = world.buildings.filter((q) => q !== b); Wd.bump(world); S.mat += refund; selected = null; closeP(); say(`${d.name} demolished · refund ${refund} parts`); saveGame(); ui(); }
function moveBuilding(b) { world.buildings = world.buildings.filter((q) => q !== b); Wd.bump(world); moving = b; selected = null; closeP(); sel = { kind: 'building', type: b.type }; preview = null; $('yesBuild').style.display = ''; $('nudge').style.display = ''; $('noBuild').textContent = 'CANCEL'; updatePreview(b.x, b.y); say('Tap a new spot for the south corner.'); }

/* ---------------- panels ---------------- */
function showBuild() {
  endBuildMode(true); closeP(); const grid = $('buildGrid'); grid.innerHTML = '';
  const rb = document.createElement('button'); rb.className = 'build'; rb.innerHTML = `<span style="font-size:26px;width:40px;text-align:center">🛣️</span><span>Road<small>${Wd.ROAD_COST} part per tile</small></span>`; rb.onclick = () => startTool({ kind: 'road' }); grid.appendChild(rb);
  Object.entries(DEFS).filter(([, d]) => S.rank >= d.rank && !d.hidden).forEach(([k, d]) => {   // upgrade-only tiers (hidden) are reached from the building panel
    const b = document.createElement('button'); b.className = 'build'; b.innerHTML = `<img src="assets/buildings/${k}.png?v=${VERSION}" alt=""><span>${d.name} · ${d.w}×${d.h}<small>PARTS ${d.mat}${d.next ? ' · upgradable' : ''}</small></span>`;
    b.onclick = () => startTool({ kind: 'building', type: k }); grid.appendChild(b);
  });
  $('buildPanel').style.display = 'block';
}
const esc = (t) => String(t).replace(/[&<>]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;' }[c]));
const meter = (v, cls = '') => `<div class="bar ${cls}"><i style="width:${Math.max(0, Math.min(100, v))}%"></i></div>`;
function showSurvivors() {
  endBuildMode(true); closeP(); $('it').textContent = 'SURVIVORS';
  $('ib').innerHTML = S.sv.map((s) => `<div data-sv="${s.id}" style="padding:4px 0;border-bottom:1px solid #2c627a"><b>${esc(s.name)}</b> · ${s.job} Lv.${s.l} ${s.resident ? '🏠' : ''} <span style="float:right;color:#ffe38a">${esc(s.why || s.mode)}</span>
   HP ${Math.ceil(s.hp)}/${s.max} · ♥${Math.floor(s.sat)} · ${s.weapon[0]} · ration ${ration(s).toFixed(2)}/day${s.post ? ' · works at ' + DEFS[s.post.type].name : ''}${meter(s.hp / s.max * 100)}<small>Hunger ${Math.round(s.hunger)} · Thirst ${Math.round(s.thirst)} · Fatigue ${Math.round(s.fatigue)} · XP ${Math.floor(s.mastery)}/${professions[s.job]?.master || 0}</small></div>`).join('') + '<small>Tap a survivor to follow them.</small>';
  $('infoPanel').style.display = 'block';
}
function showTown() {
  endBuildMode(true); closeP(); $('it').textContent = 'TOWN'; const nx = rankRules[S.rank], st = supplyStats();
  const net = (n) => (n >= 0 ? '+' : '−') + Math.abs(n).toFixed(1), days = (d) => (d === Infinity ? 'stable' : `${d.toFixed(1)} days left`);
  $('ib').innerHTML = `<b>Haven rank ${S.rank}</b> · ${S.sv.length} survivors (${residents()} residents) · ${world.buildings.length} buildings<br>
   <b>Supplies</b> (cap ${supplyCap()}): Food ${Math.floor(S.food)} · Water ${Math.floor(S.water)} · Parts ${Math.floor(S.mat)} · Medicine ${Math.floor(S.med)}<br>
   Rations eaten per day: <b>${st.need.toFixed(1)}</b> (half food, half water)<br>
   Food ${net(st.fNet)}/day · ${days(st.fDays)} · Water ${net(st.wNet)}/day · ${days(st.wDays)}<br>
   ${nx ? `Next rank needs: Renown ${S.ren}/${nx.ren} · Supplies produced ${Math.floor(S.produced)}/${nx.income} · Residents ${residents()}/${nx.residents} · Buildings ${world.buildings.length}/${nx.facilities}` : 'Max rank reached.'}<br>${S.mission ? `<br><b>Mission:</b> ${S.mission.name} — ${S.mission.desc} (${Math.floor(S.mission.progress)}/${S.mission.goal})` : ''}
   <br><br><button class="act" id="tSave">Save now</button><button class="act danger" id="tReset">New game…</button>`;
  $('infoPanel').style.display = 'block';
  $('tSave').onclick = () => { saveGame(); say('Saved.'); };
  $('tReset').onclick = () => { if (confirm('Erase this town and start over?')) { try { localStorage.removeItem(SAVE_KEY); localStorage.removeItem(PREV_KEY); localStorage.removeItem(OLD_KEY); } catch (e) {} location.reload(); } };
}
function showGuide() {
  endBuildMode(true); closeP(); $('it').textContent = 'GUIDE';
  $('ib').innerHTML = `<b>Drag</b> to pan, <b>pinch</b> to zoom, <b>⌖</b> recenters, <b>1×/2×/3×</b> changes speed, <b>🐞</b> shows the geometry overlay.<br><b>Build:</b> choose a building, tap the tile for its <b>south corner</b> (the front tip of the footprint), nudge with the arrows, then CONFIRM. Buildings can't rotate. Buildings cost <b>parts</b>; there is no money.<br><b>Supplies:</b> every survivor eats a daily ration (half food, half water); heavier jobs and higher levels eat more. Rain collectors make water, garden plots make food (and use some water). Medicine heals; without it care is half as effective.<br><b>Staffing is automatic:</b> a survivor with the matching profession (Farmer, Engineer/Mechanic, Medic) takes the building's one slot and boosts it (+50%, +10% per level). A green dot on the building means it is staffed.<br><b>Upgrade</b> a building from its panel: it keeps its footprint and keeps working.<br><b>Roads:</b> the Road tool adds or removes single tiles (1 part each).<br><b>Tap a survivor</b> to see what they are doing and why.<br><b>Renown</b> raises your Haven rank; higher ranks bring tougher zombies.<br><small>V${VERSION} · geometry: tile ratio 3:2 (33.69°), anchor = south corner.</small>`;
  $('infoPanel').style.display = 'block';
}
function showBuildingInfo(b) {
  const d = DEFS[b.type], r = facilityRules[b.type]; selected = { kind: 'building', ref: b }; closeP(); $('it').textContent = d.name.toUpperCase();
  const jobs = STAFF_JOBS[d.fam] || [], up = d.next ? upgradeCheck(b) : null, nd = d.next && DEFS[d.next];
  const prod = d.fam === 'water' ? `Makes <b>${(d.out * prodMult(b)).toFixed(1)}</b> water/day` : d.fam === 'farm' ? `Makes <b>${(d.out * prodMult(b)).toFixed(1)}</b> food/day · uses ${d.waterUse} water/day` : '';
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
  let best = null, bd = 1e9; for (const s of S.sv) { const p = project(s.w.x, s.w.y), cy = p.y - CHAR_H * TWs() * .5, d = Math.hypot(px - p.x, py - cy); if (d < Math.max(22, .4 * TWs()) && d < bd) { bd = d; best = s; } } return best;
}
function tapAt(px, py) {
  if (sel) {
    const t = unproject(px, py), tx = Math.floor(t.x), ty = Math.floor(t.y);
    if (sel.kind === 'road') { tryRoad(tx, ty); return; }
    const d = DEFS[sel.type], o = Iso.originFromSouthTile(tx, ty, d.w, d.h); updatePreview(o.x, o.y); return;
  }
  const u = hitUnit(px, py); if (u) { selected = { kind: 'unit', ref: u }; closeP(); $('it').textContent = u.name.toUpperCase(); $('ib').innerHTML = `${u.job} Lv.${u.l} · HP ${Math.ceil(u.hp)}/${u.max} · ration ${ration(u).toFixed(2)}/day${u.post ? ' · works at ' + DEFS[u.post.type].name : ''}<br><b>${esc(u.why)}</b><br>Hunger ${Math.round(u.hunger)} · Thirst ${Math.round(u.thirst)} · Fatigue ${Math.round(u.fatigue)}`; $('infoPanel').style.display = 'block'; return; }
  const b = hitBuilding(px, py); if (b) { showBuildingInfo(b); return; }
  selected = null; closeP();
}
$('nudge').addEventListener('click', (e) => { const bt = e.target.closest('button'); if (!bt || !preview) return; const [dx, dy] = bt.dataset.d.split(',').map(Number); updatePreview(preview.x + dx, preview.y + dy); });
$('yesBuild').onclick = confirmPreview; $('noBuild').onclick = () => { endBuildMode(true); say(sel ? '' : 'Done.'); };
$('mBuild').onclick = showBuild; $('mSurv').onclick = showSurvivors; $('mTown').onclick = showTown; $('mGuide').onclick = showGuide;
$('closeBuild').onclick = closeP; $('closeInfo').onclick = closeP;
$('btnCenter').onclick = () => centerOn(7.5, 10, .9);
$('btnSpeed').onclick = () => { simSpeed = simSpeed === 1 ? 2 : simSpeed === 2 ? 3 : 1; $('btnSpeed').textContent = simSpeed + '×'; };
$('btnDebug').onclick = () => { debug = !debug; $('btnDebug').classList.toggle('on', debug); };
$('ib').addEventListener('click', (e) => { const r = e.target.closest('[data-sv]'); if (!r) return; const s = S.sv.find((q) => q.id === +r.dataset.sv); if (s) { selected = { kind: 'unit', ref: s }; closeP(); centerOn(s.w.x, s.w.y); } });

/* ---------------- loop ---------------- */
function simTick() {
  tick++; S.sv.forEach(ai); S.z.forEach(zai); S.z = S.z.filter((z) => z.hp > 0); monsterGeneration(); visitorArrival();
  if (tick % 120 === 0) missionProgress(); if (tick % 240 === 0) checkRank(); if (tick % 24000 === 0 && tick > 0) triggerTownEvent(); if (tick % 450 === 0) saveGame();
  if (tick % 300 === 0) autoStaff();
  if (tick % 1000 === 0) { S.hour++; hourlyProduction(); if (S.hour >= 24) { S.hour = 0; S.day++; endOfDay(); } ui(); }
}
let last = 0, acc = 0; const STEP = 1000 / 60;
function frame(t) { if (!last) last = t; acc += Math.min(100, t - last) * simSpeed; last = t; let n = 0; while (acc >= STEP && n < 12) { simTick(); acc -= STEP; n++; } if (n === 12) acc = 0; draw(); requestAnimationFrame(frame); }
document.addEventListener('visibilitychange', () => { if (document.hidden) saveGame(); else last = 0; }); window.addEventListener('pagehide', saveGame);

/* ---------------- init ---------------- */
async function init() {
  await loadAll(); resize(); buildGround();
  const restored = loadGame();
  if (!restored) {
    world.buildings = [{ type: 'medic', x: 2, y: 7, w: 2, h: 2, q: 10, a: 10 }, { type: 'canteen', x: 8, y: 6, w: 2, h: 2, q: 10, a: 10 }, { type: 'house', x: 11, y: 11, w: 2, h: 2, q: 10, a: 8 }]; Wd.bump(world);
    S.sv = [mk('Marcus', 'Guard', 3, 7, 12, 0), mk('Amy', 'Medic', 2, 5, 10, 1), mk('Lena', 'Scavenger', 2, 9, 14, 2), mk('Ben', 'Farmer', 1, 6, 11, 3)];
    spawn(5, 3, 'walker'); spawn(9, 3, 'crawler'); spawn(12, 4, 'walker');
  } else { for (let i = 0; i < 3; i++) spawn(); if (restored.cam && restored.cam.z) { cam.z = restored.cam.z; cam.x = restored.cam.x; cam.y = restored.cam.y; clampCam(); } }
  if (!restored || !restored.cam) centerOn(7.5, 10, Math.max(.7, Math.min(1.1, VW / 430)));
  autoStaff(); if (!S.mission) beginMission(); updateZoomLabel(); ui(); $('loading').style.display = 'none'; requestAnimationFrame(frame);
}
// test / debug hook (no effect on gameplay)
window.ZH = { S, world, Wd, Iso, cam, project, unproject, spriteRect, hitBuilding, hitUnit, tapAt, startTool, updatePreview, confirmPreview, centerOn, draw, simTick, step(n) { for (let i = 0; i < n; i++) simTick(); }, spawn, mk, SPR, get sel() { return sel; }, get preview() { return preview; }, get selected() { return selected; }, get tick() { return tick; }, serialize, loadGame, saveGame, closeP, autoStaff, upgradeBuilding, upgradeCheck, hourlyProduction, endOfDay, supplyStats, ration, workBoost, isWorking, prodMult, supplyCap, DEFS, setDebug(v) { debug = v; }, endBuildMode, demolish, moveBuilding, TWs, THs, BASE_TW, BASE_TH };
init();
})();
