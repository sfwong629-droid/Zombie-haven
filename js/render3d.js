/* Zombie Haven: real-time 3D renderer (?3d=1). The game runs exactly as before: its simulation, UI, taps and camera
   are unchanged. This module draws the world (ground, roads, walls, buildings, trees, survivors, zombies) with three.js
   on a canvas UNDER the game canvas, with an orthographic camera that reproduces the game's own 2:1 projection
   pixel for pixel, so every 2D overlay (labels, health bars, selection, build grid, alerts) still lines up.
   Models: assets/characters/ai3d_male/realtime/*.glb (tools/art/b3d/export3d.py), the tent (export_prop3d.py);
   everything else is built here from simple shapes as stand-ins. */
import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import * as SkeletonUtils from 'three/addons/utils/SkeletonUtils.js';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';

const G = window.ZHG;
const T = 1.3;                                                    // world units per tile (the character scale)
const SQ2 = Math.SQRT2, ELEV = Math.asin(.5);
const DIR = new THREE.Vector3(Math.cos(ELEV) / SQ2, Math.sin(ELEV), Math.cos(ELEV) / SQ2);   // toward the camera: 30° up, from the +x +y corner

// ---------------------------------------------------------------- renderer + camera matched to the game projection
const worldEl = document.getElementById('world'), gameCv = document.getElementById('game');
const renderer = new THREE.WebGLRenderer({ antialias: true });
const canvas = renderer.domElement;
Object.assign(canvas.style, { position: 'absolute', left: '0', top: '0', width: '100%', height: '100%', pointerEvents: 'none', zIndex: '0' });
worldEl.insertBefore(canvas, gameCv);
Object.assign(gameCv.style, { position: 'relative', zIndex: '1' });
renderer.outputColorSpace = THREE.SRGBColorSpace;
renderer.shadowMap.enabled = true; renderer.shadowMap.type = THREE.PCFSoftShadowMap; renderer.shadowMap.autoUpdate = false;
const DPR_MAX = Math.min(1.5, devicePixelRatio || 1); let dpr = DPR_MAX; renderer.setPixelRatio(dpr);
const scene = new THREE.Scene();
const cam = new THREE.OrthographicCamera(-1, 1, 1, -1, 0.1, 400);
let size = [0, 0];
function placeCamera() {
  const VW = G.VW(), VH = G.VH(), c = G.cam;
  if (size[0] !== VW || size[1] !== VH) { size = [VW, VH]; renderer.setSize(VW, VH, false); }
  const ppu = (G.BASE_TW / 2 * c.z) / (T / SQ2);                     // screen px per world unit
  const ctr = G.unproject(VW / 2, VH / 2);                          // tile under the screen centre (ground level)
  const tgt = new THREE.Vector3(ctr.x * T, 0, ctr.y * T);
  cam.left = -VW / 2 / ppu; cam.right = VW / 2 / ppu; cam.top = VH / 2 / ppu; cam.bottom = -VH / 2 / ppu;
  cam.position.copy(tgt).addScaledVector(DIR, 120); cam.lookAt(tgt); cam.updateProjectionMatrix();
}

// ---------------------------------------------------------------- light
const hemi = new THREE.HemisphereLight(0xfff4dc, 0x5a5236, 1.25); scene.add(hemi);
const sun = new THREE.DirectionalLight(0xfff0d0, 1.9); sun.castShadow = true;
sun.shadow.mapSize.set(2048, 2048);
const MC = new THREE.Vector3(G.COLS * T / 2, 0, G.ROWS * T / 2);
Object.assign(sun.shadow.camera, { left: -30, right: 30, top: 30, bottom: -30, near: 1, far: 160 });
sun.shadow.bias = -0.0008; sun.shadow.normalBias = 0.03;
sun.position.copy(MC).add(new THREE.Vector3(-30, 52, 18)); sun.target.position.copy(MC); scene.add(sun, sun.target);
const KEYS = [   // hour: sky, hemi colour, hemi intensity, sun colour, sun intensity, window glow 0..1
  [0, 0x1c2638, 0x5a6a9a, .7, 0x8aa0d0, .35, 1], [4.5, 0x1c2638, 0x5a6a9a, .7, 0x8aa0d0, .35, 1], [6.5, 0xd99a6c, 0xffc896, 1, 0xff9a5a, 1.3, .6],
  [8, 0x9fb7c2, 0xfff4dc, 1.25, 0xfff0d0, 1.9, 0], [17, 0x9fb7c2, 0xfff4dc, 1.25, 0xfff0d0, 1.9, 0], [19, 0xd99a6c, 0xffc896, 1, 0xff9a5a, 1.4, .6],
  [20.5, 0x1c2638, 0x5a6a9a, .7, 0x8aa0d0, .35, 1], [24, 0x1c2638, 0x5a6a9a, .7, 0x8aa0d0, .35, 1]];
const cA = new THREE.Color(), cB = new THREE.Color();
let glowNow = -1;
function light(h) {
  let i = 0; while (i < KEYS.length - 2 && h >= KEYS[i + 1][0]) i++;
  const a = KEYS[i], b = KEYS[i + 1], u = Math.max(0, Math.min(1, (h - a[0]) / (b[0] - a[0] || 1)));
  const mix = (k) => cA.set(a[k]).lerp(cB.set(b[k]), u).clone(), num = (k) => a[k] + (b[k] - a[k]) * u;
  scene.background = mix(1); hemi.color.copy(mix(2)); hemi.intensity = num(3); sun.color.copy(mix(4)); sun.intensity = num(5);
  const g = Math.round(num(6) * 10) / 10;
  if (g !== glowNow) { glowNow = g; winMat.color.set(0x4a3a28).lerp(new THREE.Color(0xffc864), g); }
}

// ---------------------------------------------------------------- materials, ink outline
const grad = new THREE.DataTexture(new Uint8Array([95, 95, 95, 255, 180, 180, 180, 255, 255, 255, 255, 255]), 3, 1);
grad.minFilter = grad.magFilter = THREE.NearestFilter; grad.needsUpdate = true;
const MATS = {};
const toon = (c) => MATS[c] ||= new THREE.MeshToonMaterial({ color: new THREE.Color(c), gradientMap: grad });
const winMat = new THREE.MeshBasicMaterial({ color: 0x4a3a28 });
const hullMats = new Map();
function hullMat(th) {
  if (hullMats.has(th)) return hullMats.get(th);
  const m = new THREE.MeshBasicMaterial({ color: 0x1e140f, side: THREE.BackSide });
  m.onBeforeCompile = (s) => {
    s.vertexShader = s.vertexShader.replace('#include <begin_vertex>', `vec3 transformed = position + normalize(normal) * ${th.toFixed(4)};`)
      .replace('#include <project_vertex>', '#include <project_vertex>\n  gl_Position.z += 0.0004 * gl_Position.w;');
  };
  hullMats.set(th, m); return m;
}
function addHull(mesh, th) {
  let h;
  if (mesh.isSkinnedMesh) { h = new THREE.SkinnedMesh(mesh.geometry, hullMat(th)); h.bind(mesh.skeleton, mesh.bindMatrix); h.position.copy(mesh.position); h.quaternion.copy(mesh.quaternion); h.scale.copy(mesh.scale); mesh.parent.add(h); }
  else if (mesh.isInstancedMesh) { h = new THREE.InstancedMesh(mesh.geometry, hullMat(th), mesh.count); h.instanceMatrix = mesh.instanceMatrix; mesh.add(h); }
  else { h = new THREE.Mesh(mesh.geometry, hullMat(th)); mesh.add(h); }
  h.userData.hull = true; h.castShadow = false; h.frustumCulled = !!mesh.isSkinnedMesh; return h;
}

// ---------------------------------------------------------------- shape builder: geometry collected per colour, merged at the end
const M4 = (x, y, z, ry = 0, rx = 0, rz = 0, sx = 1, sy = sx, sz = sx) => new THREE.Matrix4().compose(new THREE.Vector3(x, y, z), new THREE.Quaternion().setFromEuler(new THREE.Euler(rx, ry, rz)), new THREE.Vector3(sx, sy, sz));
const box = (w, h, d) => new THREE.BoxGeometry(w, h, d);
const cyl = (r0, r1, h, s = 8) => new THREE.CylinderGeometry(r0, r1, h, s);
class Parts {
  constructor() { this.p = {}; this.glow = []; }
  put(geo, col, m) { const g = geo.index ? geo.toNonIndexed() : geo; for (const k of Object.keys(g.attributes)) if (k !== 'position' && k !== 'normal') g.deleteAttribute(k); g.applyMatrix4(m); (this.p[col] ||= []).push(g); return this; }
  win(geo, m) { const g = geo.index ? geo.toNonIndexed() : geo; for (const k of Object.keys(g.attributes)) if (k !== 'position' && k !== 'normal') g.deleteAttribute(k); g.applyMatrix4(m); this.glow.push(g); }
  build(group, th = .03, shadows = true) {
    for (const [c, list] of Object.entries(this.p)) {
      const g = mergeGeometries(list); g.computeVertexNormals();
      const m = new THREE.Mesh(g, toon(c)); m.castShadow = shadows; m.receiveShadow = true; group.add(m); addHull(m, th);
    }
    if (this.glow.length) { const g = mergeGeometries(this.glow); group.add(new THREE.Mesh(g, winMat)); }
    return group;
  }
}

// ---------------------------------------------------------------- ground (one colour per tile), forest and wreckage
const PAD = 14;
let groundMesh = null, groundKey = '';
const hash = (x, y) => { let h = (x * 374761393 + y * 668265263) | 0; h = (h ^ (h >>> 13)) * 1274126177 | 0; return ((h ^ (h >>> 16)) >>> 0) / 4294967296; };
function buildGround() {
  const W = G.world, B = G.Wd.BUILD, WZ = G.Wd.WALLZONE;
  const key = [B.x0, B.y0, B.x1, B.y1, W.roads.size, W.ver].join(',');
  if (key === groundKey) return false; groundKey = key;
  if (groundMesh) { scene.remove(groundMesh); groundMesh.geometry.dispose(); }
  const pos = [], col = [], c = new THREE.Color();
  const GR = ['#7f8f3a', '#83913c', '#7c8c39', '#86933d', '#8a933e', '#7d8b38'], DIRT = ['#ad8850', '#aa864e', '#b08a52', '#a9854d'];
  for (let y = -PAD; y < G.ROWS + PAD; y++) for (let x = -PAD; x < G.COLS + PAD; x++) {
    const r = hash(x, y), inB = x >= B.x0 && x <= B.x1 && y >= B.y0 && y <= B.y1;
    const edge = Math.max(0, B.x0 - x, x - B.x1, B.y0 - y, y - B.y1);
    let k;
    if (G.Wd.isRoad(W, x, y)) k = r < .5 ? '#8f6b3f' : '#94703f';
    else if (inB || (edge === 1 && r < .55)) k = DIRT[(r * 4) | 0];
    else if (x >= WZ.x0 && x <= WZ.x1 && y >= WZ.y0 && y <= WZ.y1 && r < .4) k = '#9a8c4c';
    else if (x < 0 || y < 0 || x >= G.COLS || y >= G.ROWS) k = r < .5 ? '#748634' : '#6f8132';
    else k = GR[(r * 6) | 0];
    c.set(k);
    for (const [dx, dz] of [[0, 0], [1, 1], [1, 0], [0, 0], [0, 1], [1, 1]]) { pos.push((x + dx) * T, 0, (y + dz) * T); col.push(c.r, c.g, c.b); }
  }
  const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3)); g.setAttribute('color', new THREE.Float32BufferAttribute(col, 3)); g.computeVertexNormals();
  groundMesh = new THREE.Mesh(g, new THREE.MeshToonMaterial({ vertexColors: true, gradientMap: grad })); groundMesh.receiveShadow = true; scene.add(groundMesh);
  return true;
}
const ni = (g) => { const n = g.index ? g.toNonIndexed() : g; for (const k of Object.keys(n.attributes)) if (k !== 'position' && k !== 'normal') n.deleteAttribute(k); return n; };
const merge = (list) => mergeGeometries(list.map(ni));
const pineG = merge([cyl(.08, .1, .5, 6).translate(0, .25, 0), new THREE.ConeGeometry(.75, 1.2, 8).translate(0, 1.0, 0), new THREE.ConeGeometry(.6, 1.0, 8).translate(0, 1.55, 0), new THREE.ConeGeometry(.42, .85, 8).translate(0, 2.05, 0)]);
const trunkG = cyl(.09, .12, 1.1, 6).translate(0, .55, 0);
const crownG = merge([new THREE.IcosahedronGeometry(.7, 0).translate(0, 1.55, 0), new THREE.IcosahedronGeometry(.5, 0).translate(.35, 1.25, .2), new THREE.IcosahedronGeometry(.48, 0).translate(-.35, 1.3, -.15)]);
const rubbleG = merge([new THREE.DodecahedronGeometry(.22, 0).scale(1.4, .5, 1).translate(0, .06, 0), box(.36, .1, .14).rotateY(.6).translate(.12, .12, .05), box(.3, .08, .1).rotateY(-.4).translate(-.15, .1, -.08)]);
const crateG = box(.36, .36, .36).translate(0, .18, 0);
let forest = [], forestKey = '';
function inst(geo, list, colorFn, th) {
  const im = new THREE.InstancedMesh(geo, new THREE.MeshToonMaterial({ color: 0xffffff, gradientMap: grad }), Math.max(1, list.length)), m = new THREE.Matrix4();
  im.count = list.length;
  list.forEach(([x, z, s, r], i) => { m.compose(new THREE.Vector3(x, 0, z), new THREE.Quaternion().setFromEuler(new THREE.Euler(0, r * 6, 0)), new THREE.Vector3(s, s * (.9 + r * .25), s)); im.setMatrixAt(i, m); im.setColorAt(i, new THREE.Color(colorFn(r))); });
  im.castShadow = true; im.receiveShadow = true; scene.add(im); addHull(im, th); return im;
}
function buildForest() {
  const W = G.world, wr = G.wreckSpots(), key = groundKey + '|' + W.buildings.length + '|' + W.walls.size + '|' + wr.length;
  if (key === forestKey) return false; forestKey = key;
  for (const o of forest) { scene.remove(o); } forest = [];
  const pines = [], rounds = [], rubble = [], crates = [];
  const blocked = (x, y) => G.Wd.buildingAt(W, x, y) || G.Wd.wallAt(W, x, y) || G.Wd.isRoad(W, x, y);
  for (const [x, y] of G.TREE_SPOTS) if (!blocked(x, y)) { const r = hash(x, y); (r < .55 ? pines : rounds).push([(x + .5) * T, (y + .5) * T, .8 + r * .5, r]); }
  for (let y = -PAD + 1; y < G.ROWS + PAD - 1; y++) for (let x = -PAD + 1; x < G.COLS + PAD - 1; x++) {
    const out = Math.max(-x, x - G.COLS + 1, -y, y - G.ROWS + 1); if (out < 1) continue;
    const r = hash(x * 7 + 3, y * 5 + 1); if (r > Math.min(.55, .12 + out * .06)) continue;
    const q = hash(x, y * 3); (q < .55 ? pines : rounds).push([(x + hash(x, y + 9)) * T, (y + hash(x + 9, y)) * T, .75 + q * .6, q]);
  }
  for (const [x, y] of wr) if (!blocked(x, y)) rubble.push([(x + .5) * T, (y + .5) * T, 1 + hash(x, y) * .6, hash(y, x)]);
  for (const [x, y] of G.CRATE_SPOTS) if (!blocked(x, y)) crates.push([(x + .5) * T, (y + .5) * T, 1, hash(x, y)]);
  forest.push(inst(pineG, pines, (r) => ['#2f5a3c', '#2c5236', '#36603f', '#2a4c33'][(r * 4) | 0], .045));
  forest.push(inst(trunkG, rounds, () => '#5a3b23', .035));
  forest.push(inst(crownG, rounds, (r) => ['#d06a2a', '#e39a35', '#c9541f', '#b8a03a', '#8a9a3a', '#d98a2c'][(r * 6) | 0], .045));
  forest.push(inst(rubbleG, rubble, (r) => r < .5 ? '#6f675c' : '#7a6a58', .025));
  forest.push(inst(crateG, crates, () => '#9a6d3e', .025));
  return true;
}

// ---------------------------------------------------------------- walls
let wallGroup = null, wallKey = '';
function buildWalls() {
  const W = G.world, list = [...W.walls.values()];
  const key = list.map((w) => `${w.x},${w.y},${w.type},${w.broken ? 1 : 0},${w.hp < w.max * .6 ? 1 : 0}`).join(';');
  if (key === wallKey) return false; wallKey = key;
  if (wallGroup) scene.remove(wallGroup);
  wallGroup = new THREE.Group(); scene.add(wallGroup);
  const P = new Parts();
  const has = (x, y) => { const o = G.Wd.wallAt(W, x, y); return !!o && !o.broken; };
  for (const w of list) {
    const cx = (w.x + .5) * T, cz = (w.y + .5) * T, s = hash(w.x, w.y);
    if (w.broken) { P.put(new THREE.DodecahedronGeometry(.3, 0).scale(1.6, .45, 1.3), '#6a5a48', M4(cx, .1, cz, s * 6)); P.put(cyl(.08, .09, .7, 6), '#6f4a2c', M4(cx + .2, .12, cz - .1, s, 0, Math.PI / 2)); continue; }
    const arms = [[1, 0], [-1, 0], [0, 1], [0, -1]].filter(([dx, dy]) => has(w.x + dx, w.y + dy));
    const dmg = w.hp < w.max * .6;
    if (w.type === 'gate') {
      const alongX = has(w.x - 1, w.y) || has(w.x + 1, w.y) || !(has(w.x, w.y - 1) || has(w.x, w.y + 1));
      for (const k of [-1, 1]) P.put(cyl(.1, .11, 2.2, 7), '#5a3b23', M4(cx + (alongX ? k * .6 : 0), 1.1, cz + (alongX ? 0 : k * .6)));
      P.put(box(1.5, .14, .14), '#6f4a2c', M4(cx, 2.05, cz, alongX ? 0 : Math.PI / 2));
      for (const k of [-.36, 0, .36]) P.put(box(.34, 1.2, .07), '#8a6038', M4(cx + (alongX ? k : 0), .7, cz + (alongX ? 0 : k), alongX ? 0 : Math.PI / 2));
      continue;
    }
    if (w.type === 'metal') {
      P.put(box(.18, 1.7, .18), '#5f666e', M4(cx, .85, cz));
      for (const [dx, dy] of arms) P.put(box(dx ? T / 2 : .12, 1.5 - (dmg ? .4 * s : 0), dy ? T / 2 : .12), dmg ? '#7d7466' : '#8f9aa6', M4(cx + dx * T / 4, .75, cz + dy * T / 4));
      if (!arms.length) P.put(box(.6, 1.4, .12), '#8f9aa6', M4(cx, .7, cz));
      continue;
    }
    // wood palisade: a post in the middle, stakes along each joined side
    P.put(cyl(.12, .13, 2.1, 7), '#6a4528', M4(cx, 1.05, cz));
    const segs = arms.length ? arms : [[1, 0], [-1, 0]];
    for (const [dx, dy] of segs) for (let k = 1; k <= 2; k++) {
      const o = k * T / 5, h = 1.8 + hash(w.x * 3 + k, w.y + dx * 5 + dy) * .35 - (dmg && k === 2 ? .7 : 0);
      P.put(cyl(.11, .12, h, 7), '#7a5232', M4(cx + dx * o, h / 2, cz + dy * o, k));
      P.put(new THREE.ConeGeometry(.12, .3, 7), '#7a5232', M4(cx + dx * o, h + .15, cz + dy * o));
    }
  }
  P.build(wallGroup, .03);
  return true;
}

// ---------------------------------------------------------------- buildings: one stand-in per type, built for its footprint
function cabin(P, w, d, roof, o = {}) {
  const H = o.h || 1.2, r = .08, n = Math.round(H / (2 * r)), wall = o.wall || ['#7b5232', '#6f4a2c'];
  if (o.plank) P.put(box(w, H, d), wall[0], M4(0, H / 2, 0));
  else for (let i = 0; i < n; i++) {
    const y = r + i * 2 * r, c = wall[i % 2];
    P.put(cyl(r, r, w + .2, 7), c, M4(0, y, d / 2, 0, 0, Math.PI / 2)); P.put(cyl(r, r, w + .2, 7), c, M4(0, y, -d / 2, 0, 0, Math.PI / 2));
    P.put(cyl(r, r, d + .2, 7), c, M4(w / 2, y + r * .5, 0, 0, Math.PI / 2)); P.put(cyl(r, r, d + .2, 7), c, M4(-w / 2, y + r * .5, 0, 0, Math.PI / 2));
  }
  P.put(box(w - .02, H, d - .02), '#5a3b23', M4(0, H / 2, 0));
  const rise = o.rise || .7, half = d / 2 + .22, len = Math.hypot(half, rise), ang = Math.atan2(rise, half);
  P.put(box(w + .4, .09, len), roof, M4(0, H + rise / 2, half / 2, 0, ang)); P.put(box(w + .4, .09, len), roof, M4(0, H + rise / 2, -half / 2, 0, -ang));
  const gv = [];
  for (const sx of [w / 2, -w / 2]) gv.push(sx, H, -d / 2, sx, H, d / 2, sx, H + rise, 0, sx, H, d / 2, sx, H, -d / 2, sx, H + rise, 0);
  const gable = new THREE.BufferGeometry(); gable.setAttribute('position', new THREE.Float32BufferAttribute(gv, 3)); gable.computeVertexNormals();
  P.put(gable, o.plank ? wall[0] : wall[1], M4(0, 0, 0));
  P.put(box(.4, .76, .06), '#3d2817', M4(-w * .2, .38, d / 2 + .08)); P.put(box(.56, .1, .4), '#6a5a48', M4(-w * .2, .05, d / 2 + .26));
  for (const wx of o.windows || [w * .22]) { P.put(box(.4, .34, .06), '#3b2a1a', M4(wx, .72, d / 2 + .08)); P.win(box(.3, .24, .04), M4(wx, .72, d / 2 + .105)); }
  if (o.chimney) P.put(box(.3, .8, .3), '#8c8478', M4(w * .3, H + .5, -d * .2));
  if (o.sign) P.put(box(.5, .3, .05), o.sign, M4(w * .2, H - .15, d / 2 + .09));
  if (o.cross) { P.put(box(.32, .1, .04), '#c83a32', M4(w * .2, H - .15, d / 2 + .12)); P.put(box(.1, .32, .04), '#c83a32', M4(w * .2, H - .15, d / 2 + .12)); }
}
function crates(P, x, z, n = 3) { for (let i = 0; i < n; i++) P.put(box(.3, .3, .3), '#9a6d3e', M4(x + (i % 2) * .34, .15 + (i > 1 ? .3 : 0), z + (i === 1 ? .05 : 0), i * .3)); }
function beds(P, w, d, rows) {
  const bw = w - .3, bd = (d - .3) / rows - .15;
  for (let j = 0; j < rows; j++) {
    const z = -d / 2 + .15 + bd / 2 + j * (bd + .15);
    P.put(box(bw, .16, bd), '#5a3e25', M4(0, .08, z));
    const n = Math.max(2, Math.round(bw / .4));
    for (let i = 0; i < n; i++) {
      const x = -bw / 2 + .2 + i * (bw - .4) / Math.max(1, n - 1);
      if (j % 2) P.put(new THREE.IcosahedronGeometry(.13, 0), i % 2 ? '#7fae4a' : '#6f9e3f', M4(x, .26, z));
      else for (let k = -1; k <= 1; k += 2) P.put(new THREE.ConeGeometry(.04, .24, 4), '#5f8f38', M4(x + k * .06, .28, z));
    }
  }
}
function fenceRing(P, w, d, h = .55, gapFront = true) {
  const posts = [];
  for (let i = 0; i <= 4; i++) { const x = -w / 2 + i * w / 4; posts.push([x, -d / 2], [x, d / 2]); }
  for (let i = 1; i < 4; i++) { const z = -d / 2 + i * d / 4; posts.push([-w / 2, z], [w / 2, z]); }
  for (const [x, z] of posts) P.put(cyl(.04, .05, h, 6), '#6f4a2c', M4(x, h / 2, z));
  for (const y of [h * .45, h * .85]) {
    P.put(box(w, .05, .05), '#7b5232', M4(0, y, -d / 2)); P.put(box(.05, .05, d), '#7b5232', M4(-w / 2, y, 0)); P.put(box(.05, .05, d), '#7b5232', M4(w / 2, y, 0));
    if (gapFront) { P.put(box(w * .35, .05, .05), '#7b5232', M4(-w * .325, y, d / 2)); P.put(box(w * .35, .05, .05), '#7b5232', M4(w * .325, y, d / 2)); }
    else P.put(box(w, .05, .05), '#7b5232', M4(0, y, d / 2));
  }
}
const BUILD = {
  house: (P, w, d) => cabin(P, w * .82, d * .78, '#b5532e', { chimney: true }),
  water: (P, w, d) => { for (const [x, z] of [[-1, -1], [1, -1], [1, 1], [-1, 1]]) P.put(cyl(.05, .06, 1.1, 6), '#6f4a2c', M4(x * w * .25, .55, z * d * .25)); P.put(box(w * .6, .08, d * .6), '#7d5534', M4(0, 1.1, 0)); P.put(cyl(.38, .38, .7, 12), '#5d7a8c', M4(0, 1.5, 0)); P.put(new THREE.ConeGeometry(.5, .3, 12, 1, true), '#8f9aa6', M4(0, 2.0, 0, 0, Math.PI)); P.put(cyl(.04, .04, .9, 6), '#6f6a62', M4(.3, .5, .3)); },
  well: (P, w, d) => { P.put(cyl(.42, .46, .5, 12), '#8f8a80', M4(0, .25, 0)); P.put(cyl(.32, .32, .52, 12), '#2a3a44', M4(0, .26, 0)); for (const k of [-1, 1]) P.put(box(.08, 1.2, .08), '#6f4a2c', M4(k * .42, .85, 0)); P.put(box(1.1, .07, .07), '#6f4a2c', M4(0, 1.42, 0)); P.put(new THREE.ConeGeometry(.75, .45, 4), '#8a4a2a', M4(0, 1.7, 0, Math.PI / 4)); P.put(cyl(.09, .07, .16, 8), '#7a5232', M4(.1, .9, 0)); },
  farm: (P, w, d) => { beds(P, w * .9, d * .9, 2); },
  field: (P, w, d) => { beds(P, w * .86, d * .86, 4); fenceRing(P, w * .96, d * .96, .5); P.put(box(.06, 1.1, .06), '#6f4a2c', M4(w * .3, .55, -d * .3)); P.put(box(.6, .06, .06), '#6f4a2c', M4(w * .3, .85, -d * .3)); P.put(new THREE.IcosahedronGeometry(.12, 0), '#d9b45a', M4(w * .3, 1.18, -d * .3)); },
  medic: null,   // the tent model
  clinic: (P, w, d) => cabin(P, w * .86, d * .72, '#d9d2c2', { plank: true, wall: ['#e8e2d4', '#e8e2d4'], cross: true, windows: [w * .1, w * .32] }),
  hospital: (P, w, d) => { cabin(P, w * .84, d * .8, '#c83a32', { plank: true, wall: ['#ece6d8', '#ece6d8'], h: 2.1, cross: true, windows: [w * .05, w * .3] }); },
  canteen: (P, w, d) => { cabin(P, w * .8, d * .7, '#c47a2e', { chimney: true, windows: [w * .05, w * .28] }); P.put(box(w * .5, .05, .45), '#c8a46a', M4(w * .1, 1.15, d * .35 + .25, 0, -.35)); },
  armory: (P, w, d) => { cabin(P, w * .82, d * .74, '#4e555c', { plank: true, wall: ['#6c6f70', '#6c6f70'], sign: '#3d4a52', windows: [w * .3] }); crates(P, w * .32, d * .45, 2); },
  workshop: (P, w, d) => { cabin(P, w * .82, d * .72, '#7a6a4e', { sign: '#c47a2e', windows: [w * .3] }); P.put(box(.8, .45, .35), '#8a6038', M4(w * .05, .22, d * .45)); P.put(cyl(.16, .16, .06, 10), '#8f9aa6', M4(w * .05 + .3, .5, d * .45, 0, Math.PI / 2)); },
  storage: (P, w, d) => { cabin(P, w * .8, d * .74, '#7a4a2e', { windows: [] }); crates(P, w * .22, d * .45, 3); },
  scrapyard: (P, w, d) => { fenceRing(P, w * .94, d * .9, .7); for (let i = 0; i < 5; i++) { const x = -w * .3 + i * w * .15, s = .6 + hash(i, 7) * .5; P.put(new THREE.DodecahedronGeometry(.28 * s, 0).scale(1.3, .7, 1), i % 2 ? '#6c6f70' : '#7d5f48', M4(x, .15 * s, (hash(i, 3) - .5) * d * .4, i)); } P.put(cyl(.2, .2, .1, 12), '#2a2a2a', M4(w * .3, .05, d * .2)); P.put(cyl(.2, .2, .1, 12), '#2a2a2a', M4(w * .3, .15, d * .2)); },
  gym: (P, w, d) => { P.put(box(w * .9, .12, d * .9), '#8a6a48', M4(0, .06, 0)); P.put(cyl(.03, .03, .9, 6), '#5f666e', M4(0, .45, -.1, 0, 0, Math.PI / 2)); for (const k of [-.42, .42]) P.put(cyl(.16, .16, .08, 12), '#2a2a2a', M4(k, .45, -.1, 0, 0, Math.PI / 2)); for (const k of [-1, 1]) P.put(box(.06, .5, .06), '#5f666e', M4(k * .35, .25, -.1)); P.put(box(.5, .12, .25), '#7a3a32', M4(0, .18, .3)); },
  library: (P, w, d) => cabin(P, w * .8, d * .76, '#3e5a8a', { sign: '#e8e2d4' }),
  lounge: (P, w, d) => { cabin(P, w * .8, d * .7, '#4f7a4a', {}); P.put(box(.7, .1, .25), '#7b5232', M4(w * .15, .25, d * .45)); },
  range: (P, w, d) => { P.put(box(w * .9, .05, .3), '#7b5232', M4(0, .5, d * .32)); for (const k of [-1, 0, 1]) { P.put(box(.05, .7, .05), '#6f4a2c', M4(k * w * .3, .35, -d * .3)); P.put(cyl(.2, .2, .04, 14), '#e8e2d4', M4(k * w * .3, .75, -d * .3, 0, Math.PI / 2)); P.put(cyl(.1, .1, .05, 14), '#c83a32', M4(k * w * .3, .75, -d * .3 + .01, 0, Math.PI / 2)); } },
  track: (P, w, d) => { for (let i = 0; i < 3; i++) { const x = -w * .3 + i * w * .3; for (const k of [-1, 1]) P.put(box(.05, .45, .05), '#6f4a2c', M4(x, .22, k * .3)); P.put(box(.06, .06, .7), '#c47a2e', M4(x, .42, 0)); } P.put(cyl(.1, .1, w * .7, 7), '#7b5232', M4(0, .1, d * .3, 0, 0, Math.PI / 2)); },
  sparring: (P, w, d) => { P.put(box(w * .8, .2, d * .8), '#7a6a58', M4(0, .1, 0)); for (const [x, z] of [[-1, -1], [1, -1], [1, 1], [-1, 1]]) P.put(cyl(.05, .05, .8, 6), '#c83a32', M4(x * w * .38, .5, z * d * .38)); for (const y of [.5, .75]) { P.put(box(w * .76, .03, .03), '#e8e2d4', M4(0, y, -d * .38)); P.put(box(w * .76, .03, .03), '#e8e2d4', M4(0, y, d * .38)); P.put(box(.03, .03, d * .76), '#e8e2d4', M4(-w * .38, y, 0)); P.put(box(.03, .03, d * .76), '#e8e2d4', M4(w * .38, y, 0)); } },
  barracks: (P, w, d) => { cabin(P, w * .86, d * .62, '#3e5a3e', { windows: [w * .05, w * .25, w * .4] }); crates(P, -w * .36, d * .38, 2); },
};
let tentScene = null;
const bGroups = new Map();
function buildingKey(b) { return [b.type, b.x, b.y, b.w, b.h, b.rot ? 1 : 0, b.burnt ? 1 : 0].join(','); }
function makeBuilding(b) {
  const g = new THREE.Group(), w = (b.rot ? b.h : b.w) * T, d = (b.rot ? b.w : b.h) * T;
  if (b.type === 'medic' && tentScene) {
    const t = tentScene.clone(); const s = Math.min(w / 2.2, d / 2.4) * .95; t.scale.setScalar(s); g.add(t);
  } else {
    const P = new Parts(); (BUILD[b.type] || ((P2, w2, d2) => cabin(P2, w2 * .8, d2 * .75, '#8a4a2a', {})))(P, w, d); P.build(g, .028);
  }
  if (b.burnt) g.traverse((o) => { if (o.isMesh && !o.userData.hull && o.material.color) { o.material = o.material.clone(); o.material.color.multiplyScalar(.35); } });
  g.position.set((b.x + b.w / 2) * T, 0, (b.y + b.h / 2) * T); g.rotation.y = b.rot ? Math.PI / 2 : 0;
  return g;
}
function syncBuildings() {
  let changed = false; const seen = new Set();
  for (const b of G.world.buildings) {
    seen.add(b); const k = buildingKey(b), cur = bGroups.get(b);
    if (cur && cur.key === k) continue;
    if (cur) scene.remove(cur.g);
    const g = makeBuilding(b); scene.add(g); bGroups.set(b, { g, key: k }); changed = true;
  }
  for (const [b, v] of bGroups) if (!seen.has(b)) { scene.remove(v.g); bGroups.delete(b); changed = true; }
  return changed;
}

// ---------------------------------------------------------------- characters
const loader = new GLTFLoader();
const parse = (buf) => new Promise((ok, bad) => loader.parse(buf, '', ok, bad));
async function load(url) {   // hosts that can't serve .glb get a base64 copy next to it (<name>.glb.txt)
  if (!window.ZH_GLB_TXT) return new Promise((ok, bad) => loader.load(url, ok, undefined, bad));
  const t = await (await fetch(url + '.txt')).text(), bin = atob(t.trim()), u = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) u[i] = bin.charCodeAt(i);
  return parse(u.buffer);
}
let MALE = null, LITE = null;
const JOB_SHIRT = { Civilian: null, Farmer: '#6f8a3a', Medic: '#8fc4d8', Engineer: '#d9822e', Cook: '#f2eadb', Scavenger: '#8a6a48', Guard: '#5d6b44', 'Police Officer': '#2f4a7a', SWAT: '#2a2f36', Raider: '#7a2e28' };
const JOB_PANTS = { Guard: '#4a5236', 'Police Officer': '#1f2a44', SWAT: '#1d2126', Raider: '#3a2a22', Cook: '#3a3a3a' };
const ZTINT = { walker: [.62, .86, .55], runner: [.75, .8, .5], crawler: [.6, .7, .55], bloated: [.7, .85, .45], spitter: [.8, .9, .4], brute: [.55, .7, .5], boss: [.7, .5, .8] };
const ZSC = { bloated: 1.18, brute: 1.32, crawler: .85, boss: 1.6 };
function toonScene(root, map) {
  root.traverse((o) => {
    if (!o.isMesh || o.userData.hull) return;
    const m = o.material; const tex = map || m.map || null;
    if (tex) { tex.colorSpace = THREE.SRGBColorSpace; tex.generateMipmaps = false; tex.minFilter = THREE.LinearFilter; }
    o.material = new THREE.MeshToonMaterial({ color: m.color, map: tex, gradientMap: grad });
    o.castShadow = false; o.receiveShadow = true;
    if (o.isSkinnedMesh) { o.geometry.boundingSphere = new THREE.Sphere(new THREE.Vector3(0, .6, 0), 1.2); }
  });
  const ms = []; root.traverse((o) => { if (o.isMesh && !o.userData.hull) ms.push(o); }); for (const o of ms) addHull(o, o.isSkinnedMesh ? .022 : .018);
}
function recolor(img, shirt, pants) {   // the flat-colour body texture: shirt pixels are exactly (240,240,240), trousers two blues
  const c = document.createElement('canvas'); c.width = img.width; c.height = img.height; const g = c.getContext('2d'); g.drawImage(img, 0, 0);
  const d = g.getImageData(0, 0, c.width, c.height), a = d.data, S = shirt && new THREE.Color(shirt), Pn = pants && new THREE.Color(pants);
  for (let i = 0; i < a.length; i += 4) {
    const r = a[i], gg = a[i + 1], b = a[i + 2];
    if (S && Math.abs(r - 240) < 5 && Math.abs(gg - 240) < 5 && Math.abs(b - 240) < 5) { a[i] = S.r * 255; a[i + 1] = S.g * 255; a[i + 2] = S.b * 255; }
    else if (Pn && ((Math.abs(r - 21) < 6 && Math.abs(gg - 51) < 6 && Math.abs(b - 85) < 6) || (Math.abs(r - 57) < 6 && Math.abs(gg - 75) < 6 && Math.abs(b - 112) < 6))) { const k = r < 40 ? .8 : 1.1; a[i] = Math.min(255, Pn.r * 255 * k); a[i + 1] = Math.min(255, Pn.g * 255 * k); a[i + 2] = Math.min(255, Pn.b * 255 * k); }
  }
  g.putImageData(d, 0, 0); const t = new THREE.CanvasTexture(c); t.flipY = false; t.colorSpace = THREE.SRGBColorSpace; t.generateMipmaps = false; t.minFilter = THREE.LinearFilter; return t;
}
const jobMats = {};
function jobMaterial(job) {
  if (jobMats[job]) return jobMats[job];
  const body = MALE.body.material, img = MALE.bodyImage;
  const tex = img && (JOB_SHIRT[job] || JOB_PANTS[job]) ? recolor(img, JOB_SHIRT[job], JOB_PANTS[job]) : body.map;
  return (jobMats[job] = new THREE.MeshToonMaterial({ map: tex, gradientMap: grad }));
}
const zMats = {};
function zombieMaterial(type) {
  if (zMats[type]) return zMats[type];
  const t = ZTINT[type] || ZTINT.walker; return (zMats[type] = new THREE.MeshToonMaterial({ map: LITE.body.material.map, color: new THREE.Color(...t), gradientMap: grad }));
}
const WMODEL = { pipe: 'bat', bat: 'bat', crowbar: 'bat', nailbat: 'bat', sledge: 'bat', spear: 'bat', knife: 'axe', machete: 'axe', axe: 'axe', katana: 'axe',
  pistol: 'pistol', revolver: 'pistol', shotgun: 'rifle', rifle: 'rifle', bow: 'rifle', crossbow: 'rifle', smg: 'ak47', assault: 'ak47' };
const WCLASS = { bat: 'melee', axe: 'melee', pistol: 'pistol', rifle: 'gun', ak47: 'gun' };
class Actor {
  constructor(src, mat, lite) {
    this.o = SkeletonUtils.clone(src.scene); scene.add(this.o);
    this.w = {}; this.arm = [];
    this.o.traverse((n) => { if (n.name.startsWith('weapon_')) this.w[n.name.slice(7)] = n; if (n.name.startsWith('armor_')) this.arm.push(n); if (n.isSkinnedMesh && !n.userData.hull && mat) n.material = mat; });
    this.mixer = new THREE.AnimationMixer(this.o); this.acts = {}; for (const c of src.animations) this.acts[c.name] = this.mixer.clipAction(c);
    this.cur = null; this.name = ''; this.weapon = undefined; this.armor = undefined; this.yaw = 0; this.last = null; this.acc = 0; this.lite = lite;
    this.sh = new THREE.Mesh(blobG, blobM); scene.add(this.sh);
  }
  play(name, once = false, restart = false) {
    if (!this.acts[name]) name = this.acts['idle'] ? 'idle' : Object.keys(this.acts)[0];
    if (this.name === name && !restart) return;
    const n = this.acts[name];
    if (this.cur && this.cur !== n) this.cur.fadeOut(.12);
    n.reset(); n.setLoop(once ? THREE.LoopOnce : THREE.LoopRepeat); n.clampWhenFinished = true; n.fadeIn(this.cur && this.cur !== n ? .12 : 0).play();
    this.cur = n; this.name = name;
  }
  setWeapon(kind) { if (kind === this.weapon) return; this.weapon = kind; for (const k in this.w) this.w[k].visible = k === kind; }
  setArmor(on) { if (on === this.armor) return; this.armor = on; for (const a of this.arm) a.visible = on; }
  place(wx, wy, faceTo, dt, scale = 1) {
    const x = wx * T, z = wy * T;
    let dx, dz; if (faceTo) { dx = faceTo.x * T - x; dz = faceTo.y * T - z; } else if (this.last) { dx = x - this.last.x; dz = z - this.last.z; }
    if (dx !== undefined && Math.abs(dx) + Math.abs(dz) > 1e-4) { const want = Math.atan2(dx, dz); let d = want - this.yaw; d = Math.atan2(Math.sin(d), Math.cos(d)); this.yaw += d * Math.min(1, dt * 12); }
    this.o.position.set(x, 0, z); this.o.rotation.y = this.yaw; this.o.scale.setScalar(scale); this.last = { x, z };
    this.sh.position.set(x, .006, z); this.sh.scale.setScalar(scale);
  }
  show(v) { this.o.visible = v; this.sh.visible = v; }
  dispose() { scene.remove(this.o); scene.remove(this.sh); }
}
const blobG = new THREE.CircleGeometry(.3, 20).rotateX(-Math.PI / 2), blobM = new THREE.MeshBasicMaterial({ color: 0x1a140c, transparent: true, opacity: .3, depthWrite: false });
const people = new Map(), zeds = new Map(), dead = new Map();
const ATTACK = new Set(['punch', 'blunt', 'shoot']);
function personAnim(a, s, dt) {
  const wid = s.mode === 'work' ? null : s.eq && s.eq.weapon, model = wid ? WMODEL[wid] || 'bat' : null, cls = model ? WCLASS[model] : null;
  a.setWeapon(model);
  const arm = s.eq && s.eq.armor && G.ITEMS[s.eq.armor] && (G.ITEMS[s.eq.armor].def || 0) >= 7; a.setArmor(!!arm);
  const [anim] = G.humanAnim(s, G.facing(s));
  const hold = cls === 'gun' ? 'gun' : cls ? 'melee' : null;
  if (anim === 'collapse') { a.play('collapse', true); return; }
  if (ATTACK.has(anim)) {
    if (!a.attacking) {
      const clip = anim === 'punch' || !cls ? 'punch' : anim === 'shoot' ? (cls === 'pistol' ? 'pistol_fire' : 'gun_fire') : ['melee_swing_a', 'melee_swing_b', 'melee_swing_c'][(Math.random() * 3) | 0];
      a.play(clip, true, true); a.attacking = true;
    }
    return;
  }
  if (a.attacking && a.cur && a.cur.isRunning()) return;    // let the strike finish
  a.attacking = false;
  if (s.mode === 'rescueCarry') { a.play('rescue'); return; }
  if (anim === 'walk' || anim === 'carry') { a.play(hold ? hold + '_hold_walk' : 'walk'); return; }
  a.play(hold ? hold + '_hold_idle' : 'idle');
}
function syncPeople(dt, vis) {
  const seen = new Set();
  for (const s of G.S.sv) {
    seen.add(s); let a = people.get(s);
    if (!a) { a = new Actor(MALE, jobMaterial(s.job)); people.set(s, a); a.job = s.job; }
    if (a.job !== s.job) { a.dispose(); a = new Actor(MALE, jobMaterial(s.job)); people.set(s, a); a.job = s.job; }
    const hidden = s.mode === 'away' || !s.w || G.insideBuilding(s) || (s.mode === 'down' && G.beingCarried(s));
    a.show(!hidden); if (hidden) continue;
    const tgt = (s.mode === 'attack' || s.mode === 'chase') && s.target && s.target.w;
    a.place(s.w.x, s.w.y, tgt && s.mode === 'attack' ? tgt : null, dt);
    personAnim(a, s, dt); tickMixer(a, dt, vis);
  }
  for (const [s, a] of people) if (!seen.has(s)) { a.dispose(); people.delete(s); }
}
function zombieAnim(a, z) {
  if (z.mode === 'zattack' || z.mode === 'zbreak' || z.mode === 'attack') { if (!a.attacking || !a.cur.isRunning()) { a.play('punch', true, true); a.attacking = true; } return; }
  a.attacking = false;
  if (z.type === 'raider') { a.play(z.moving === false ? 'melee_hold_idle' : 'melee_hold_walk'); return; }
  a.play('zombie_walk'); a.cur.timeScale = z.type === 'runner' ? 1.7 : z.type === 'brute' || z.type === 'bloated' ? .7 : 1;
}
function syncZombies(dt, vis) {
  const seen = new Set();
  for (const z of G.S.z) {
    if (z.hp <= 0 || !z.w) continue; seen.add(z); let a = zeds.get(z);
    if (!a) {
      if (z.type === 'raider') { a = new Actor(MALE, jobMaterial('Raider')); const m = WMODEL[z.wpn] || 'bat'; a.setWeapon(m); a.setArmor(false); }
      else { a = new Actor(LITE, zombieMaterial(z.type), true); a.setWeapon(null); a.setArmor(false); }
      a.yaw = Math.random() * 6; zeds.set(z, a);
    }
    const tgt = z.target && z.target.w && (z.mode === 'zattack' || z.mode === 'attack') ? z.target.w : null;
    a.place(z.w.x, z.w.y, tgt, dt, ZSC[z.type] || 1); zombieAnim(a, z); tickMixer(a, dt, vis);
  }
  for (const [z, a] of zeds) if (!seen.has(z)) { zeds.delete(z); if (z.type === 'raider' || !a.lite) { a.dispose(); continue; } dead.set(a, 0); a.play('collapse', true, true); }
  for (const c of G.corpses) c.__3d = true;
  for (const [a, t0] of dead) {   // fall, lie still, then sink away (the 2D corpse fades over the same time)
    const t = t0 + dt; dead.set(a, t); tickMixer(a, dt, vis);
    if (t > 3) a.o.position.y = -(t - 3) * .4; if (t > 4.2) { a.dispose(); dead.delete(a); }
  }
}
let zCount = 0;
const _fr = new THREE.Frustum(), _sph = new THREE.Sphere(new THREE.Vector3(), 1.4), _pm = new THREE.Matrix4();
function tickMixer(a, dt, vis) {
  a.acc += dt; _sph.center.set(a.o.position.x, .6, a.o.position.z);
  const seen = _fr.intersectsSphere(_sph), every = !seen ? .25 : (a.lite && zCount > 40 ? 1 / 30 : 0);
  if (a.acc >= every) { a.mixer.update(a.acc); a.acc = 0; }
}

// ---------------------------------------------------------------- frame
let ready = false, lastT = 0, frames = 0, fpsT = 0;
function frame() {
  if (!ready) return;
  const now = performance.now(), dt = lastT ? Math.min(.1, (now - lastT) / 1000) : 0; lastT = now;
  placeCamera();
  let dirty = buildGround(); dirty = buildWalls() || dirty; dirty = syncBuildings() || dirty; dirty = buildForest() || dirty;
  if (dirty) renderer.shadowMap.needsUpdate = true;
  light(G.S.hour || 12);
  _fr.setFromProjectionMatrix(_pm.multiplyMatrices(cam.projectionMatrix, cam.matrixWorldInverse));
  zCount = G.S.z.length;
  const sp = G.simSpeed ? G.simSpeed() : 1, adt = G.paused && G.paused() ? 0 : dt * sp;
  syncPeople(adt, true); syncZombies(adt, true);
  renderer.render(scene, cam);
  frames++; fpsT += dt;
  if (fpsT > 1) { const fps = frames / fpsT; frames = 0; fpsT = 0; const nd = fps < 45 ? Math.max(1, dpr - .25) : fps > 57 ? Math.min(DPR_MAX, dpr + .125) : dpr; if (nd !== dpr) { dpr = nd; renderer.setPixelRatio(dpr); size = [0, 0]; } window.ZH3D.fps = fps; }
}
window.ZH3D = { frame, ready: false, fps: 0 };
(async () => {
  const base = 'assets/characters/ai3d_male/realtime/';
  const [m, l, t] = await Promise.all([load(base + 'male_mid.glb'), load(base + 'male_lite.glb'), load('assets/buildings/ai3d/medic/medical_tent_realtime.glb').catch(() => null)]);
  for (const src of [m, l]) { src.body = null; src.scene.traverse((o) => { if (o.isSkinnedMesh && o.name === 'body') src.body = o; }); if (!src.body) src.scene.traverse((o) => { if (o.isSkinnedMesh && !src.body) src.body = o; }); }
  m.bodyImage = m.body.material.map && m.body.material.map.image;
  toonScene(m.scene); toonScene(l.scene);
  MALE = m; LITE = l; MALE.body = m.body; MALE.bodyImage = m.bodyImage;
  if (t) { toonScene(t.scene); t.scene.traverse((o) => { if (o.isMesh) o.castShadow = true; }); tentScene = t.scene; }
  ready = true; window.ZH3D.ready = true;
})().catch((e) => { console.error('3D load failed', e); const b = document.getElementById('crash'); if (b) { b.style.display = 'block'; b.textContent = '3D: ' + e.message; } });
