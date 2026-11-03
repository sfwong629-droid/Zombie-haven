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
const T = 2.4;                                                    // world units per tile; the survivor is 1.09 tall. V3D.3: 1.6 -> 2.4 (buildings 1.5x vs survivors, the ink-town mockup proportions)
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
const regrow = (x, y) => {   // town tiles where grass creeps back: near the town edge and in a few clumps
  const B = G.Wd.BUILD, d = Math.min(x - B.x0, B.x1 - x, y - B.y0, B.y1 - y), c = hash(Math.floor(x / 3) * 7 + 1, Math.floor(y / 3) * 5 + 3);
  return (d === 0 && hash(x * 5, y * 3) < .6) || (d === 1 && hash(x * 3, y * 7) < .3) || (c < .22 && hash(x, y * 11) < .55);
};
const RU = { uRoad: { value: null }, uRO: { value: new THREE.Vector2() }, uRN: { value: new THREE.Vector2(1, 1) }, uT: { value: T } };
let _gmat = null;
function groundMat() {   // V3D.5: painted ground. World-space noise: big yellow/green patches, darker clumps, light flecks (grass), pebbles and ruts (dirt)
  if (_gmat) return _gmat;
  const m = new THREE.MeshToonMaterial({ vertexColors: true, gradientMap: grad });
  m.onBeforeCompile = (sh) => {
    Object.assign(sh.uniforms, RU);
    sh.vertexShader = 'varying vec3 vWP;\n' + sh.vertexShader.replace('#include <begin_vertex>', '#include <begin_vertex>\n  vWP = (modelMatrix * vec4(position, 1.)).xyz;');
    sh.fragmentShader = `varying vec3 vWP; uniform sampler2D uRoad; uniform vec2 uRO, uRN; uniform float uT;
      float gh(vec2 p){ return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453); }
      float gn(vec2 p){ vec2 i = floor(p), f = fract(p); f = f * f * (3. - 2. * f); return mix(mix(gh(i), gh(i + vec2(1., 0.)), f.x), mix(gh(i + vec2(0., 1.)), gh(i + 1.), f.x), f.y); }
      float gf(vec2 p){ return .5 * gn(p) + .25 * gn(p * 2.03 + 7.1) + .125 * gn(p * 4.1 + 3.3) + .125 * gn(p * 8.3 + 1.7); }
      ` + sh.fragmentShader.replace('#include <color_fragment>', `#include <color_fragment>
      {
        vec2 p = vWP.xz;
        float grass = smoothstep(-.10, .0, diffuseColor.g - diffuseColor.r);           // 1 on grass, 0 on dirt and roads
        float big = gf(p * .09), mid = gf(p * .45), fine = gn(p * 7.), fleck = gn(p * 19. + 3.);
        vec3 patchTint = mix(vec3(1.10, 1.02, .78), vec3(.86, 1.02, .92), smoothstep(.35, .65, big));   // dry yellow vs fresh green
        vec3 g = diffuseColor.rgb * mix(vec3(1.), patchTint, grass);
        g *= .86 + .26 * mid;                                                            // soft light and dark clumps
        g *= 1. - .16 * smoothstep(.58, .78, gn(p * 3.1 + 9.)) * grass;                   // dark grass clumps
        g = mix(g, g * vec3(1.08, 1.06, .97), smoothstep(.72, .90, fleck) * grass);      // sunlit blades (subtle)
        g *= 1. - .08 * (gn(p * 2.2 + 4.) - .5) * (1. - grass);                       // dirt: soft mottling, no specks
        g = mix(g, g * .80, smoothstep(.66, .80, gn(vec2(p.x * 1.6, p.y * 5.) + 11.)) * (1. - grass) * .7);   // ruts
        float rm = texture2D(uRoad, (p / uT - uRO) / uRN).r + (gn(p * 1.7) - .5) * .12;   // wobbly road edge
        float rw = smoothstep(.42, .56, rm), rim = smoothstep(.36, .46, rm) * (1. - smoothstep(.5, .6, rm));
        vec3 road = vec3(.215, .118, .045) * (.85 + .3 * gf(p * 1.3 + 2.));             // packed earth (#7f5f3b, linear), mottled
        road = mix(road, road * .78, smoothstep(.80, .90, gn(p * 9. + 21.)) * .6);       // a few dark stones
        g = mix(g, g * .82, rim);                                                        // darker trodden edge
        g = mix(g, road, rw);
        diffuseColor.rgb = g;
      }`);
  };
  return (_gmat = m);
}
function buildGround() {
  const W = G.world, B = G.Wd.BUILD, WZ = G.Wd.WALLZONE;
  const key = [B.x0, B.y0, B.x1, B.y1, W.roads.size, W.ver].join(',');
  if (key === groundKey) return false; groundKey = key;
  if (groundMesh) { scene.remove(groundMesh); groundMesh.geometry.dispose(); }
  const pos = [], col = [], c = new THREE.Color();
  const GR = ['#8a923c', '#8e963e', '#86903a', '#939a40', '#9a9a42', '#878f39'], DIRT = ['#b08a52', '#ad874f', '#b38d55', '#a9854d'];
  const X0 = -PAD, Y0 = -PAD, NX = G.COLS + 2 * PAD, NY = G.ROWS + 2 * PAD, tc = new Float32Array(NX * NY * 3);
  for (let y = Y0; y < Y0 + NY; y++) for (let x = X0; x < X0 + NX; x++) {   // one colour per tile ...
    const r = hash(x, y), inB = x >= B.x0 && x <= B.x1 && y >= B.y0 && y <= B.y1;
    const edge = Math.max(0, B.x0 - x, x - B.x1, B.y0 - y, y - B.y1);
    let k;
    if (inB && regrow(x, y) && !G.Wd.isRoad(W, x, y)) k = r < .5 ? '#9c9442' : '#a39a48';   // V3D.6: grass growing back into the town dirt
    else if (inB || (edge === 1 && r < .55)) k = DIRT[(r * 4) | 0];
    else if (x >= WZ.x0 && x <= WZ.x1 && y >= WZ.y0 && y <= WZ.y1 && r < .4) k = '#a39150';
    else if (x < 0 || y < 0 || x >= G.COLS || y >= G.ROWS) k = r < .5 ? '#7f8a36' : '#7a8634';
    else k = GR[(r * 6) | 0];
    c.set(k); const i = ((y - Y0) * NX + (x - X0)) * 3; tc[i] = c.r; tc[i + 1] = c.g; tc[i + 2] = c.b;
  }
  const corner = (x, y) => {   // ... and every tile corner takes the average of the tiles around it: soft painted edges, no checkerboard
    let r = 0, g = 0, b = 0, n = 0;
    for (const [dx, dy] of [[-1, -1], [0, -1], [-1, 0], [0, 0]]) { const xx = x + dx - X0, yy = y + dy - Y0; if (xx < 0 || yy < 0 || xx >= NX || yy >= NY) continue; const i = (yy * NX + xx) * 3; r += tc[i]; g += tc[i + 1]; b += tc[i + 2]; n++; }
    return [r / n, g / n, b / n];
  };
  const rm = new Uint8Array(NX * NY);   // V3D.7: roads as a smooth mask (bilinear between tile centres): ~1 tile wide, rounded corners, soft edges
  for (let y = Y0; y < Y0 + NY; y++) for (let x = X0; x < X0 + NX; x++) if (G.Wd.isRoad(W, x, y)) rm[(y - Y0) * NX + (x - X0)] = 255;
  if (RU.uRoad.value) RU.uRoad.value.dispose();
  const rt = new THREE.DataTexture(rm, NX, NY, THREE.RedFormat); rt.magFilter = rt.minFilter = THREE.LinearFilter; rt.needsUpdate = true;
  RU.uRoad.value = rt; RU.uRO.value.set(X0, Y0); RU.uRN.value.set(NX, NY);
  for (let y = Y0; y < Y0 + NY; y++) for (let x = X0; x < X0 + NX; x++)
    for (const [dx, dz] of [[0, 0], [1, 1], [1, 0], [0, 0], [0, 1], [1, 1]]) { pos.push((x + dx) * T, 0, (y + dz) * T); col.push(...corner(x + dx, y + dz)); }
  const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3)); g.setAttribute('color', new THREE.Float32BufferAttribute(col, 3)); g.computeVertexNormals();
  groundMesh = new THREE.Mesh(g, groundMat()); groundMesh.receiveShadow = true; scene.add(groundMesh);
  return true;
}
const ni = (g) => { const n = g.index ? g.toNonIndexed() : g; for (const k of Object.keys(n.attributes)) if (k !== 'position' && k !== 'normal') n.deleteAttribute(k); return n; };
const merge = (list) => mergeGeometries(list.map(ni));
// V3D.8 trees: layered pines, lumpy leaf crowns, bare dead trees; they sway in the wind (vertex shader, phase from position)
const pineG = merge([0, 1, 2, 3, 4].map((i) => new THREE.ConeGeometry([.95, .8, .64, .48, .3][i], [1.1, 1.0, .9, .8, .7][i], 9).rotateY(i * .41).translate(Math.sin(i * 2.1) * .04, [.75, 1.2, 1.6, 1.98, 2.32][i], Math.cos(i * 1.7) * .04)));
const pineTrunkG = cyl(.09, .13, .8, 6).translate(0, .4, 0);
const branch = (len, r0, r1, tilt, yaw, y, s = 5) => cyl(r1, r0, len, s).translate(0, len / 2, 0).rotateZ(-tilt).rotateY(yaw).translate(0, y, 0);   // grows out of the trunk at height y
const trunkG = merge([cyl(.1, .15, 1.4, 7).translate(0, .7, 0), branch(.6, .06, .035, .8, 0, 1.0), branch(.55, .05, .03, .75, 2.3, 1.1)]);
const crownG = merge([new THREE.IcosahedronGeometry(.62, 1).translate(0, 1.78, 0), new THREE.IcosahedronGeometry(.48, 0).translate(.44, 1.52, .16), new THREE.IcosahedronGeometry(.46, 0).translate(-.4, 1.56, -.2),
  new THREE.IcosahedronGeometry(.42, 0).translate(.08, 1.46, -.44), new THREE.IcosahedronGeometry(.4, 0).translate(-.12, 2.16, .14), new THREE.IcosahedronGeometry(.36, 0).translate(.28, 2.0, .32), new THREE.IcosahedronGeometry(.38, 0).translate(-.3, 1.42, .34)]);
const deadG = merge([cyl(.07, .13, 1.7, 6).translate(0, .85, 0), branch(.8, .055, .03, .85, .3, 1.05), branch(.7, .05, .025, .8, 2.6, .95), branch(.6, .04, .02, .6, 4.4, 1.3), branch(.45, .03, .015, .5, 1.4, 1.55, 4), branch(.35, .025, .012, .9, 5.3, 1.45, 4)]);

// V3D.9 foliage made of leaf cards: painted leaf clusters / pine-needle sprays with cut-out gaps, laid around each crown.
// Cards lean toward the (fixed) camera so few are seen edge-on; normals point out from the crown centre for soft round shading.
function rng(seed) { let a = seed >>> 0; return () => { a = (a + 0x6D2B79F5) | 0; let t = Math.imul(a ^ (a >>> 15), 1 | a); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; }; }
function leafTexture() {
  const c = document.createElement('canvas'); c.width = c.height = 256; const g = c.getContext('2d'), R = rng(7);
  for (let i = 0; i < 70; i++) {
    const x = 30 + R() * 196, y = 30 + R() * 196, a = R() * 6.28, L = 26 + R() * 22, W = L * .42, v = 150 + R() * 105 | 0;
    if (Math.hypot(x - 128, y - 128) > 108) continue;
    g.save(); g.translate(x, y); g.rotate(a);
    g.fillStyle = `rgb(${v},${v},${v})`; g.beginPath(); g.moveTo(-L / 2, 0); g.quadraticCurveTo(0, -W, L / 2, 0); g.quadraticCurveTo(0, W, -L / 2, 0); g.fill();
    g.strokeStyle = `rgba(0,0,0,.25)`; g.lineWidth = 1.5; g.beginPath(); g.moveTo(-L / 2, 0); g.lineTo(L / 2, 0); g.stroke();
    g.restore();
  }
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; return t;
}
function needleTexture() {   // a fluffy pine spray: soft body + thick needle strokes along a stem, tip at the right
  const c = document.createElement('canvas'); c.width = 256; c.height = 128; const g = c.getContext('2d'), R = rng(11);
  g.fillStyle = 'rgb(150,150,150)'; g.beginPath(); g.moveTo(2, 64); g.quadraticCurveTo(110, 4, 252, 60); g.quadraticCurveTo(110, 124, 2, 64); g.fill();
  g.lineCap = 'round';
  for (let i = 0; i < 260; i++) {
    const u = R(), x = 4 + u * 240, half = (1 - u * .75) * 54, y = 64 + (R() * 2 - 1) * half * .55, len = (1 - u * .6) * (16 + R() * 14), s = y < 64 ? -1 : 1, v = 165 + R() * 90 | 0;
    g.strokeStyle = `rgb(${v},${v},${v})`; g.lineWidth = 3.6; g.beginPath(); g.moveTo(x, y); g.lineTo(x + len * .6, y + s * len * .8); g.stroke();
  }
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; return t;
}
const LEAF_TEX = leafTexture(), NEEDLE_TEX = needleTexture();
function cardGeometry(cards) {   // cards: [centre(Vector3), normal-for-light(Vector3), u-axis, v-axis] -> one BufferGeometry with uvs
  const P = [], N = [], U = [], I = [];
  cards.forEach(([c, n, ua, va], k) => {
    const corners = [[-1, -1, 0, 0], [1, -1, 1, 0], [1, 1, 1, 1], [-1, 1, 0, 1]];
    for (const [a, b, u, v] of corners) { const q = c.clone().addScaledVector(ua, a).addScaledVector(va, b); P.push(q.x, q.y, q.z); N.push(n.x, n.y, n.z); U.push(u, v); }
    const o = k * 4; I.push(o, o + 1, o + 2, o, o + 2, o + 3);
  });
  const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.Float32BufferAttribute(P, 3)); g.setAttribute('normal', new THREE.Float32BufferAttribute(N, 3)); g.setAttribute('uv', new THREE.Float32BufferAttribute(U, 2)); g.setIndex(I); return g;
}
const CAM_DIR = new THREE.Vector3(Math.cos(Math.PI / 6) / Math.SQRT2, Math.sin(Math.PI / 6), Math.cos(Math.PI / 6) / Math.SQRT2);
const BLOBS = [[0, 1.8, 0, .66], [.46, 1.54, .16, .5], [-.42, 1.58, -.2, .48], [.08, 1.46, -.46, .44], [-.12, 2.2, .14, .44], [.3, 2.04, .32, .4], [-.32, 1.44, .36, .4]];
const crownCardsG = (() => {
  const R = rng(3), cards = [], ctr = new THREE.Vector3(0, 1.75, 0);
  for (const [x, y, z, r] of BLOBS) {
    const n = Math.round(22 * (r / .45) ** 2);
    for (let i = 0; i < n; i++) {
      const d = new THREE.Vector3(R() * 2 - 1, R() * 2 - 1, R() * 2 - 1); if (d.lengthSq() < .01) continue; d.normalize();
      const c = new THREE.Vector3(x, y, z).addScaledVector(d, r * (.55 + R() * .4));
      const face = d.clone().multiplyScalar(.45).addScaledVector(CAM_DIR, .55).normalize();
      const t1 = new THREE.Vector3(0, 1, 0).cross(face).normalize(), t2 = face.clone().cross(t1).normalize(), a = R() * 6.28, sz = .26 + R() * .14;
      const ua = t1.clone().multiplyScalar(Math.cos(a)).addScaledVector(t2, Math.sin(a)).multiplyScalar(sz), va = t2.clone().multiplyScalar(Math.cos(a)).addScaledVector(t1, -Math.sin(a)).multiplyScalar(sz);
      cards.push([c, c.clone().sub(ctr).normalize(), ua, va]);
    }
  }
  return cardGeometry(cards);
})();
const crownCoreG = merge(BLOBS.map(([x, y, z, r]) => new THREE.IcosahedronGeometry(r * .62, 0).translate(x, y, z)));
const TIERS = [[.75, .98], [1.2, .82], [1.6, .66], [1.98, .5], [2.32, .34]];
const pineCardsG = (() => {
  const R = rng(5), cards = [];
  TIERS.forEach(([y, rad], ti) => {
    const nb = 11 + (ti < 2 ? 4 : 0);
    for (let i = 0; i < nb; i++) {
      const a = i / nb * 6.28 + ti * .5 + R() * .3, out = new THREE.Vector3(Math.cos(a), 0, Math.sin(a));
      const base = new THREE.Vector3(0, y + .3, 0), tip = new THREE.Vector3(out.x * rad * 1.05, y - .28, out.z * rad * 1.05);
      const along = tip.clone().sub(base), c = base.clone().add(tip).multiplyScalar(.5), half = along.clone().multiplyScalar(.5);
      const side = along.clone().cross(new THREE.Vector3(0, 1, 0)).normalize().multiplyScalar(.24 + rad * .26);
      const n = out.clone().multiplyScalar(.7).add(new THREE.Vector3(0, .7, 0)).normalize();
      cards.push([c, n, half, side]);
    }
  });
  return cardGeometry(cards);
})();
const pineCoreG = merge(TIERS.map(([y, rad]) => new THREE.ConeGeometry(rad * .62, .75, 7).translate(0, y + .02, 0)));

const SWAY = { uTime: { value: 0 } };
const swayCode = (lo, hi) => `
  { vec3 ip = instanceMatrix[3].xyz; float ph = ip.x * .37 + ip.z * .53, h = max(transformed.y - .5, 0.);
    float w = sin(uTime * 1.3 + ph) * .7 + sin(uTime * 2.3 + ph * 1.7) * .3;
    transformed.x += w * h * h * .03; transformed.z += w * h * h * .018; vShade = clamp((position.y - ${lo.toFixed(2)}) / ${(hi - lo).toFixed(2)}, 0., 1.); }`;
function swayMats(lo, hi, th, map) {   // the toon material and its outline both bend the same way
  const m = new THREE.MeshToonMaterial(map ? { color: 0xffffff, gradientMap: grad, map, alphaTest: .45, side: THREE.DoubleSide } : { color: 0xffffff, gradientMap: grad });
  m.onBeforeCompile = (sh) => { sh.uniforms.uTime = SWAY.uTime;
    sh.vertexShader = 'uniform float uTime; varying float vShade;\n' + sh.vertexShader.replace('#include <begin_vertex>', '#include <begin_vertex>' + swayCode(lo, hi));
    sh.fragmentShader = 'varying float vShade;\n' + sh.fragmentShader.replace('#include <color_fragment>', '#include <color_fragment>\n  diffuseColor.rgb *= mix(.7, 1.12, vShade);'); };
  const hm = new THREE.MeshBasicMaterial({ color: 0x1e140f, side: THREE.BackSide });
  hm.onBeforeCompile = (sh) => { sh.uniforms.uTime = SWAY.uTime;
    sh.vertexShader = 'uniform float uTime; varying float vShade;\n' + sh.vertexShader.replace('#include <begin_vertex>', `vec3 transformed = position + normalize(normal) * ${th.toFixed(4)};` + swayCode(lo, hi))
      .replace('#include <project_vertex>', '#include <project_vertex>\n  gl_Position.z += 0.0004 * gl_Position.w;'); };
  return [m, hm];
}
function instSway(geo, list, colorFn, th, lo, hi, map) {
  const [mat, hm] = swayMats(lo, hi, th, map), im = new THREE.InstancedMesh(geo, mat, Math.max(1, list.length)), m = new THREE.Matrix4();
  im.count = list.length;
  list.forEach(([x, z, s, r], i) => { m.compose(new THREE.Vector3(x, 0, z), new THREE.Quaternion().setFromEuler(new THREE.Euler(0, r * 6, 0)), new THREE.Vector3(s, s * (.9 + r * .25), s)); im.setMatrixAt(i, m); im.setColorAt(i, new THREE.Color(colorFn(r))); });
  im.castShadow = true; im.receiveShadow = true; scene.add(im);
  if (map) { im.customDepthMaterial = new THREE.MeshDepthMaterial({ depthPacking: THREE.RGBADepthPacking, map, alphaTest: .45, side: THREE.DoubleSide }); return im; }
  const h = new THREE.InstancedMesh(geo, hm, im.count); h.instanceMatrix = im.instanceMatrix; h.userData.hull = true; h.castShadow = false; h.frustumCulled = false; im.add(h);
  return im;
}
const rubbleG = merge([new THREE.DodecahedronGeometry(.22, 0).scale(1.4, .5, 1).translate(0, .06, 0), box(.36, .1, .14).rotateY(.6).translate(.12, .12, .05), box(.3, .08, .1).rotateY(-.4).translate(-.15, .1, -.08)]);
const crateG = box(.36, .36, .36).translate(0, .18, 0);
let forest = [], forestKey = '';
function inst(geo, list, colorFn, th) {
  const im = new THREE.InstancedMesh(geo, new THREE.MeshToonMaterial({ color: 0xffffff, gradientMap: grad }), Math.max(1, list.length)), m = new THREE.Matrix4();
  im.count = list.length;
  list.forEach(([x, z, s, r], i) => { m.compose(new THREE.Vector3(x, 0, z), new THREE.Quaternion().setFromEuler(new THREE.Euler(0, r * 6, 0)), new THREE.Vector3(s, s * (.9 + r * .25), s)); im.setMatrixAt(i, m); im.setColorAt(i, new THREE.Color(colorFn(r))); });
  im.castShadow = true; im.receiveShadow = true; scene.add(im); addHull(im, th); return im;
}
const tuftG = merge([0, 1, 2, 3, 4].map((i) => new THREE.ConeGeometry(.035, .3 + (i % 3) * .07, 3, 1, true).translate(0, .15, 0).rotateZ((i - 2) * .22).rotateY(i * 1.3).translate(Math.cos(i * 2.4) * .06, 0, Math.sin(i * 2.4) * .06)));
const bushG = merge([new THREE.IcosahedronGeometry(.3, 0).scale(1, .95, 1).translate(0, .2, 0), new THREE.IcosahedronGeometry(.22, 0).scale(1, .75, 1).translate(.24, .14, .08), new THREE.IcosahedronGeometry(.2, 0).scale(1, .7, 1).translate(-.2, .13, -.1)]);
const plankG = box(.9, .05, .16).translate(0, .025, 0);
const planksG = merge([box(.95, .05, .15).translate(0, .025, 0), box(.85, .05, .15).rotateY(.18).translate(.05, .075, .2), box(.7, .05, .14).rotateY(-.3).translate(-.1, .025, -.24)]);
const smallCrateG = merge([box(.34, .3, .34).translate(0, .15, 0), box(.26, .22, .26).rotateY(.5).translate(.36, .11, .1)]);
const barrelG = cyl(.15, .15, .42, 10).translate(0, .21, 0);
const tyreG = new THREE.TorusGeometry(.17, .07, 6, 12).rotateX(Math.PI / 2).translate(0, .07, 0);
const pebbleG = merge([new THREE.OctahedronGeometry(.07, 0).scale(1.2, .55, 1).translate(0, .03, 0), new THREE.OctahedronGeometry(.05, 0).scale(1, .55, 1.2).translate(.11, .02, .05)]);
function instD(geo, list, colorFn, shadow) {   // small scatter: no outline, one draw call each
  const im = new THREE.InstancedMesh(geo, new THREE.MeshToonMaterial({ color: 0xffffff, gradientMap: grad }), Math.max(1, list.length)), m = new THREE.Matrix4();
  im.count = list.length;
  list.forEach(([x, z, s, r], i) => { m.compose(new THREE.Vector3(x, 0, z), new THREE.Quaternion().setFromEuler(new THREE.Euler(0, r * 9, 0)), new THREE.Vector3(s, s * (.8 + r * .4), s)); im.setMatrixAt(i, m); im.setColorAt(i, new THREE.Color(colorFn(r))); });
  im.castShadow = !!shadow; im.receiveShadow = true; scene.add(im); return im;
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
  const tufts = [], bushes = [], pebbles = [], planks = [], junk = [], barrels = [], tyres = [], lone = [], B = G.Wd.BUILD;
  for (let y = -PAD + 1; y < G.ROWS + PAD - 1; y++) for (let x = -PAD + 1; x < G.COLS + PAD - 1; x++) {   // V3D.5: grass tufts, autumn bushes, pebbles
    if (blocked(x, y)) continue;
    const inB = x >= B.x0 && x <= B.x1 && y >= B.y0 && y <= B.y1, h1 = hash(x * 13 + 5, y * 7 + 2), h2 = hash(x * 3 + 11, y * 17 + 4), h3 = hash(x * 29 + 1, y * 11 + 9);
    const at = (a, b) => [(x + a) * T, (y + b) * T];
    const rg = inB && regrow(x, y);
    const nt = inB ? (rg ? (h1 < .7 ? 2 : 1) : h1 < .1 ? 1 : 0) : (h1 < .55 ? 2 : h1 < .85 ? 1 : 0);
    if (inB && !rg) {   // V3D.6: survivor clutter on the town dirt
      const h4 = hash(x * 41 + 7, y * 23 + 5);
      if (h4 < .09) planks.push([...at(.2 + .6 * h2, .2 + .6 * h3), 1, h1]);
      else if (h4 < .14) junk.push([...at(.25 + .5 * h3, .25 + .5 * h1), 1, h2]);
      else if (h4 < .175) barrels.push([...at(.3 + .4 * h1, .3 + .4 * h2), 1 + h3 * .15, h3]);
      else if (h4 < .205) tyres.push([...at(.3 + .4 * h2, .3 + .4 * h1), 1, h1]);
      else if (h4 < .26) lone.push([...at(.2 + .6 * h1, .2 + .6 * h3), 1, h2]);
    }
    for (let k = 0; k < nt; k++) { const a = hash(x + k * 31, y - k * 7), b = hash(x - k * 5, y + k * 19); tufts.push([...at(.1 + .8 * a, .1 + .8 * b), 1.1 + a * .9, b]); }
    if (!inB && h2 < .10) bushes.push([...at(.2 + .6 * h3, .2 + .6 * h1), 1 + h2 * 6, h3]);
    if (h3 < (inB ? .3 : .12)) pebbles.push([...at(.15 + .7 * h2, .15 + .7 * h1), 1.5 + h1 * 1.4, h2]);
  }
  for (const t of [...planks, ...junk, ...barrels, ...tyres, ...lone]) t[2] *= 1.45;   // sized against the survivors
  forest.push(instD(planksG, planks, (r) => ['#8a6a44', '#7a6248', '#9a7a52', '#6e5a44'][(r * 4) | 0], true));
  forest.push(instD(plankG, lone, (r) => ['#8a6a44', '#9a7a52', '#7a6248'][(r * 3) | 0]));
  forest.push(instD(smallCrateG, junk, (r) => ['#9a6d3e', '#8a6038', '#a57a48'][(r * 3) | 0], true));
  forest.push(instD(barrelG, barrels, (r) => ['#5a6e7a', '#7a4a32', '#6a6e58'][(r * 3) | 0], true));
  forest.push(instD(tyreG, tyres, () => '#2e2c2a', true));
  forest.push(instD(tuftG, tufts, (r) => ['#7d8a34', '#8f9a3c', '#a39a40', '#6f7d30'][(r * 4) | 0]));
  forest.push(instD(bushG, bushes, (r) => ['#c96a28', '#d9963a', '#8a9636', '#b8562a', '#a8a03a'][(r * 5) | 0], true));
  forest.push(instD(pebbleG, pebbles, (r) => ['#8c8478', '#9a9080', '#7c7468'][(r * 3) | 0]));
  for (const t of [...pines, ...rounds]) t[2] *= 1.35;   // V3D.5: bigger trees for the 2.4-unit tiles (mockup proportions)
  const dead = rounds.filter((t) => hash(t[0] * 3.1, t[1] * 7.7) < .2), leafy = rounds.filter((t) => !dead.includes(t));
  forest.push(instSway(pineTrunkG, pines, () => '#5a3b23', .03, 0, .8));
  const PINE = ['#3d7048', '#386a44', '#447a4e', '#33613f', '#4a7f50'], CROWN = ['#d06a2a', '#e39a35', '#c9541f', '#b8a03a', '#8a9a3a', '#d98a2c'];
  const dk = (c) => '#' + new THREE.Color(c).multiplyScalar(.7).getHexString();
  forest.push(instSway(pineCoreG, pines, (r) => dk(PINE[(r * 5) | 0]), .03, .3, 2.7));
  forest.push(instSway(pineCardsG, pines, (r) => PINE[(r * 5) | 0], 0, .3, 2.7, NEEDLE_TEX));
  forest.push(instSway(trunkG, leafy, () => '#5a3b23', .03, 0, 1.4));
  forest.push(instSway(crownCoreG, leafy, (r) => dk(CROWN[(r * 6) | 0]), .03, 1.0, 2.5));
  forest.push(instSway(crownCardsG, leafy, (r) => CROWN[(r * 6) | 0], 0, 1.0, 2.6, LEAF_TEX));
  forest.push(instSway(deadG, dead, (r) => ['#5e4a3a', '#6a5544', '#54443a'][(r * 3) | 0], .03, 0, 2.0));
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
const BGLB = { house: 'assets/buildings/ai3d/house/house_realtime.glb' }, glbB = {};   // V3D.3: Hunyuan models from export_prop3d.py (origin = footprint centre, door faces +Z = front-left); scaled to fill the footprint
const bGroups = new Map();
function buildingKey(b) { return [b.type, b.x, b.y, b.w, b.h, b.rot ? 1 : 0, b.burnt ? 1 : 0].join(','); }
function makeBuilding(b) {
  const g = new THREE.Group(), w = (b.rot ? b.h : b.w) * T, d = (b.rot ? b.w : b.h) * T;
  if (b.type === 'medic' && tentScene) {
    const t = tentScene.clone(); const s = Math.min(w / 2.2, d / 2.4) * .95; t.scale.setScalar(s); g.add(t);
  } else if (glbB[b.type]) {
    const m = glbB[b.type], t = m.scene.clone(); t.scale.setScalar(Math.min(w / m.sx, d / m.sz) * .95); g.add(t);
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
// facial expressions: the GLB texture has the neutral face; <model>_face_<expr>.webp are the same texture with another
// face painted on (tools/art/b3d/facepaint.py). Each clip shows one of them.
const EXPR_OF_CLIP = { punch: 'angry', melee_swing_a: 'angry', melee_swing_b: 'angry', melee_swing_c: 'angry', gun_fire: 'angry', pistol_fire: 'angry',
  hurt: 'hurt', melee_hold_hurt: 'hurt', gun_hold_hurt: 'hurt', collapse: 'ko', cheer: 'happy' };
const FACE_IMG = {};       // expr -> HTMLImage of the mid model's texture with that face
function imgTex(img) { const t = new THREE.Texture(img); t.flipY = false; t.colorSpace = THREE.SRGBColorSpace; t.generateMipmaps = false; t.minFilter = THREE.LinearFilter; t.needsUpdate = true; return t; }
const jobMats = {};
function jobMaterial(job, expr = 'neutral') {
  const key = job + '|' + expr; if (jobMats[key]) return jobMats[key];
  const neutral = expr === 'neutral' || !FACE_IMG[expr], img = neutral ? MALE.bodyImage : FACE_IMG[expr];
  const tex = img && (JOB_SHIRT[job] || JOB_PANTS[job]) ? recolor(img, JOB_SHIRT[job], JOB_PANTS[job]) : neutral ? MALE.body.material.map : imgTex(img);
  return (jobMats[key] = new THREE.MeshToonMaterial({ map: tex, gradientMap: grad }));
}
// zombie skins (tools/art/b3d/zombie_tex.py): grey-green skin, milky eyes, four dirty bloody outfits. Each zombie
// picks one at random; a few types keep a light tint on top so they still read apart.
const ZSKIN_TINT = { spitter: [.88, 1, .72], bloated: [.95, 1, .85], boss: [.85, .7, .95], brute: [.9, .9, .9] };
const zMats = {};
function zombieMaterial(type, v = 0) {
  const key = type + '|' + v; if (zMats[key]) return zMats[key];
  if (LITE.zTex && LITE.zTex.length) {
    const t = ZSKIN_TINT[type] || [1, 1, 1];
    return (zMats[key] = new THREE.MeshToonMaterial({ map: LITE.zTex[v % LITE.zTex.length], color: new THREE.Color(...t), gradientMap: grad }));
  }
  const t = ZTINT[type] || ZTINT.walker; return (zMats[key] = new THREE.MeshToonMaterial({ map: LITE.zombieMap || LITE.body.material.map, color: new THREE.Color(...t), gradientMap: grad }));
}
const WMODEL = { pipe: 'bat', bat: 'bat', crowbar: 'bat', nailbat: 'bat', sledge: 'bat', spear: 'bat', knife: 'axe', machete: 'axe', axe: 'axe', katana: 'axe',
  pistol: 'pistol', revolver: 'pistol', shotgun: 'rifle', rifle: 'rifle', bow: 'rifle', crossbow: 'rifle', smg: 'ak47', assault: 'ak47' };
const WCLASS = { bat: 'melee', axe: 'melee', pistol: 'pistol', rifle: 'gun', ak47: 'gun' };
class Actor {
  constructor(src, mat, lite, faces = null) {
    this.o = SkeletonUtils.clone(src.scene); scene.add(this.o);
    this.w = {}; this.arm = []; this.skin = []; this.faces = faces; this.expr = 'neutral';   // faces: expr -> material (people only)
    this.o.traverse((n) => { if (n.name.startsWith('weapon_')) this.w[n.name.slice(7)] = n; if (n.name.startsWith('armor_')) this.arm.push(n); if (n.isSkinnedMesh && !n.userData.hull) { this.skin.push(n); if (mat) n.material = mat; } });
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
    const e = EXPR_OF_CLIP[name] || 'neutral';
    if (this.faces && e !== this.expr) { this.expr = e; const m = this.faces(e); for (const k of this.skin) k.material = m; }
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
  // run (empty-handed clip) when hiding, hurrying to a downed friend, or rushing a zombie bare-handed
  const rush = s.moving !== false && (s.mode === 'hide' || s.mode === 'rescueTo' || (s.mode === 'chase' && !hold));
  if (anim === 'walk' && rush) { a.play('run'); return; }
  if (anim === 'walk' || anim === 'carry') { a.play(hold ? hold + '_hold_walk' : 'walk'); return; }
  a.play(hold ? hold + '_hold_idle' : 'idle');
}
function syncPeople(dt, vis) {
  const seen = new Set();
  for (const s of G.S.sv) {
    seen.add(s); let a = people.get(s);
    if (!a) { a = new Actor(MALE, jobMaterial(s.job), false, (e) => jobMaterial(s.job, e)); people.set(s, a); a.job = s.job; }
    if (a.job !== s.job) { a.dispose(); a = new Actor(MALE, jobMaterial(s.job), false, (e) => jobMaterial(s.job, e)); people.set(s, a); a.job = s.job; }
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
  if (z.type === 'raider') { a.play(z.moving === false ? 'melee_hold_idle' : z.mode === 'rflee' ? 'run' : 'melee_hold_walk'); return; }
  if (z.type === 'runner') { a.play('zombie_run'); a.cur.timeScale = 1.1; return; }
  a.play('zombie_walk'); a.cur.timeScale = z.type === 'brute' || z.type === 'bloated' ? .7 : 1;
}
function syncZombies(dt, vis) {
  const seen = new Set();
  for (const z of G.S.z) {
    if (z.hp <= 0 || !z.w) continue; seen.add(z); let a = zeds.get(z);
    if (!a) {
      if (z.type === 'raider') { a = new Actor(MALE, jobMaterial('Raider'), false, (e) => jobMaterial('Raider', e)); const m = WMODEL[z.wpn] || 'bat'; a.setWeapon(m); a.setArmor(false); }
      else { a = new Actor(LITE, zombieMaterial(z.type, (Math.random() * 4) | 0), true); a.setWeapon(null); a.setArmor(false); }
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


// ---------------------------------------------------------------- ink lines (V3D.4): the ink-town mockup's thick outlines
// One extra pass: the scene is drawn into a texture with its depth; a full-screen shader then inks every place where the
// depth surface bends or jumps (outer silhouettes, roof/wall corners, the base of walls, tree facets). The camera is
// orthographic, so a flat surface has zero second derivative of depth and only real edges light up. A slow noise
// nudges the lookup so the lines wobble a little, like a pen. Toggle: the pen button, ?ink=0, ZH3D.setInk(bool).
let INK = new URLSearchParams(location.search).get('ink') === '1';   // set aside for now: off unless ?ink=1
let inkRT = null;
const inkCam = new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1), inkScene = new THREE.Scene();
const inkMat = new THREE.ShaderMaterial({
  uniforms: { tCol: { value: null }, tDep: { value: null }, px: { value: new THREE.Vector2() }, near: { value: .1 }, far: { value: 400 },
    r: { value: 2 }, pixW: { value: .03 }, bend: { value: 1.3 }, wob: { value: 1.2 }, ink: { value: new THREE.Color(0x1e140f) } },
  vertexShader: 'varying vec2 vUv; void main(){ vUv = uv; gl_Position = vec4(position.xy, 0., 1.); }',
  fragmentShader: `uniform sampler2D tCol, tDep; uniform vec2 px; uniform float near, far, r, pixW, bend, wob; uniform vec3 ink; varying vec2 vUv;
    float D(vec2 u){ return near + texture2D(tDep, u).x * (far - near); }
    float h(vec2 p){ return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453); }
    float n(vec2 p){ vec2 i = floor(p), f = fract(p); f = f * f * (3. - 2. * f); return mix(mix(h(i), h(i + vec2(1., 0.)), f.x), mix(h(i + vec2(0., 1.)), h(i + 1.), f.x), f.y); }
    void main(){
      vec2 q = vUv / px / 36.;
      vec2 uv = vUv + (vec2(n(q), n(q + 17.3)) - .5) * px * wob * r;
      uv = (floor(uv / px) + .5) * px;                 // whole pixels: a flat surface then gives exactly zero
      float R = floor(r + .5), c = D(uv), e = 0.;
      vec2 o0 = vec2(R, 0.) * px, o1 = vec2(0., R) * px, o2 = vec2(R, R) * px, o3 = vec2(R, -R) * px;
      e = max(e, abs(D(uv + o0) + D(uv - o0) - 2. * c));
      e = max(e, abs(D(uv + o1) + D(uv - o1) - 2. * c));
      e = max(e, abs(D(uv + o2) + D(uv - o2) - 2. * c));
      e = max(e, abs(D(uv + o3) + D(uv - o3) - 2. * c));
      float t = R * pixW * bend;                       // only strong bends (~50 deg): corners, roof edges, silhouettes; not roof ribs
      float a = smoothstep(t, t * 2.2, e) * (.75 + .25 * n(q * 3. + 5.));
      vec4 col = texture2D(tCol, vUv);
      gl_FragColor = vec4(mix(col.rgb, ink, a * .92), 1.);
      #include <colorspace_fragment>
    }`,
  depthTest: false, depthWrite: false,
});
inkScene.add(new THREE.Mesh(new THREE.PlaneGeometry(2, 2), inkMat));
const _db = new THREE.Vector2();
function renderInk() {
  renderer.getDrawingBufferSize(_db);
  if (!inkRT || inkRT.width !== _db.x || inkRT.height !== _db.y) {
    if (inkRT) inkRT.dispose();
    inkRT = new THREE.WebGLRenderTarget(_db.x, _db.y, { type: THREE.HalfFloatType, samples: 4 });
    inkRT.depthTexture = new THREE.DepthTexture(_db.x, _db.y); inkRT.depthTexture.type = THREE.UnsignedIntType;
  }
  renderer.setRenderTarget(inkRT); renderer.render(scene, cam); renderer.setRenderTarget(null);
  const u = inkMat.uniforms, ppu = (G.BASE_TW / 2 * G.cam.z) / (T / SQ2);   // CSS px per world unit
  u.tCol.value = inkRT.texture; u.tDep.value = inkRT.depthTexture; u.px.value.set(1 / _db.x, 1 / _db.y);
  u.near.value = cam.near; u.far.value = cam.far; u.r.value = Math.max(1.5, 1.6 * dpr); u.pixW.value = 1 / (ppu * dpr);
  renderer.render(inkScene, inkCam);
}
function inkButton() {
  const bar = document.getElementById('bottom'); if (!bar || document.getElementById('btnInk')) return;
  const b = document.createElement('button'); b.className = 'bb frame out'; b.id = 'btnInk'; b.title = 'Ink outlines'; b.textContent = '✒️';
  const paint = () => { b.style.opacity = INK ? '1' : '.45'; }; paint();
  b.onclick = () => { INK = !INK; paint(); try { localStorage.setItem('zh3d_ink', INK ? '1' : '0'); } catch (e) {} };
  const before = document.getElementById('btnCenter'); bar.insertBefore(b, before ? before.nextSibling : null);
}

// ---------------------------------------------------------------- frame
let ready = false, lastT = 0, frames = 0, fpsT = 0;
function frame() {
  if (!ready) return;
  const now = performance.now(), dt = lastT ? Math.min(.1, (now - lastT) / 1000) : 0; lastT = now;
  SWAY.uTime.value = now / 1000;
  placeCamera();
  let dirty = buildGround(); dirty = buildWalls() || dirty; dirty = syncBuildings() || dirty; dirty = buildForest() || dirty;
  if (dirty) renderer.shadowMap.needsUpdate = true;
  light(G.S.hour || 12);
  _fr.setFromProjectionMatrix(_pm.multiplyMatrices(cam.projectionMatrix, cam.matrixWorldInverse));
  zCount = G.S.z.length;
  const sp = G.simSpeed ? G.simSpeed() : 1, adt = G.paused && G.paused() ? 0 : dt * sp;
  syncPeople(adt, true); syncZombies(adt, true);
  if (INK) renderInk(); else renderer.render(scene, cam);
  frames++; fpsT += dt;
  if (fpsT > 1) { const fps = frames / fpsT; frames = 0; fpsT = 0; const nd = fps < 45 ? Math.max(1, dpr - .25) : fps > 57 ? Math.min(DPR_MAX, dpr + .125) : dpr; if (nd !== dpr) { dpr = nd; renderer.setPixelRatio(dpr); size = [0, 0]; } window.ZH3D.fps = fps; }
}
window.ZH3D = { frame, ready: false, fps: 0, setInk: (v) => { INK = !!v; }, inkMat };
if (INK) inkButton();
(async () => {
  const base = 'assets/characters/ai3d_male/realtime/';
  const [m, l, t] = await Promise.all([load(base + 'male_mid.glb'), load(base + 'male_lite.glb'), load('assets/buildings/ai3d/medic/medical_tent_realtime.glb').catch(() => null)]);
  for (const src of [m, l]) { src.body = null; src.scene.traverse((o) => { if (o.isSkinnedMesh && o.name === 'body') src.body = o; }); if (!src.body) src.scene.traverse((o) => { if (o.isSkinnedMesh && !src.body) src.body = o; }); }
  m.bodyImage = m.body.material.map && m.body.material.map.image;
  toonScene(m.scene); toonScene(l.scene);
  MALE = m; LITE = l; MALE.body = m.body; MALE.bodyImage = m.bodyImage;
  const il = new THREE.ImageLoader();
  await Promise.all(['angry', 'hurt', 'ko', 'happy'].map((e) => il.loadAsync(base + 'male_mid_face_' + e + '.webp').then((img) => { FACE_IMG[e] = img; }).catch(() => {})));
  try { LITE.zombieMap = imgTex(await il.loadAsync(base + 'male_lite_face_angry.webp')); } catch (e) {}   // fallback: scowl rather than smile
  LITE.zTex = (await Promise.all([0, 1, 2, 3].map((i) => il.loadAsync(base + 'male_lite_zombie_' + i + '.webp').then(imgTex).catch(() => null)))).filter(Boolean);
  if (t) { toonScene(t.scene); t.scene.traverse((o) => { if (o.isMesh) o.castShadow = true; }); tentScene = t.scene; }
  await Promise.all(Object.entries(BGLB).map(async ([k, url]) => { try { const r = await load(url); toonScene(r.scene); r.scene.traverse((o) => { if (o.isMesh) o.castShadow = true; }); const sz = new THREE.Box3().setFromObject(r.scene).getSize(new THREE.Vector3()); glbB[k] = { scene: r.scene, sx: sz.x, sz: sz.z }; } catch (e) { console.warn('building model', k, e); } }));
  bGroups.forEach((v) => scene.remove(v.g)); bGroups.clear();
  ready = true; window.ZH3D.ready = true;
})().catch((e) => { console.error('3D load failed', e); const b = document.getElementById('crash'); if (b) { b.style.display = 'block'; b.textContent = '3D: ' + e.message; } });
