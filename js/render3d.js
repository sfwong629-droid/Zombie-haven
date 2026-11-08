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
// phones drop the WebGL context when graphics memory runs short or the tab is backgrounded: the world goes black while
// the 2D UI keeps drawing. Save, then reload (the most reliable way back on iOS Safari).
canvas.addEventListener('webglcontextlost', (e) => {
  e.preventDefault(); console.warn('WebGL context lost');
  const b = document.getElementById('crash'); if (b) { b.style.display = 'block'; b.textContent = 'Graphics paused by the phone — restoring…'; }
  try { window.ZH && ZH.saveGame && ZH.saveGame(); } catch (err) { /* saving is best effort */ }
  const back = () => location.reload();
  canvas.addEventListener('webglcontextrestored', back, { once: true }); setTimeout(back, 2500);
});
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
  [0, 0x33405c, 0x8494c4, 1.18, 0xaabfe6, .72, 1], [4.5, 0x33405c, 0x8494c4, 1.18, 0xaabfe6, .72, 1], [6.5, 0xd99a6c, 0xffc896, 1, 0xff9a5a, 1.3, .6],
  [8, 0x9fb2bc, 0xfff0d8, 1.12, 0xffe8c4, 1.55, 0], [10.5, 0x9db8c6, 0xfff4dc, 1.22, 0xfff0d6, 1.85, 0], [13, 0x9cbac9, 0xfff6e2, 1.3, 0xfff4e0, 2.05, 0], [15.5, 0x9fb7c2, 0xfff2da, 1.24, 0xfff0d0, 1.85, 0],   /* 3D.58: the light climbs to noon and eases off through the afternoon */
  [17.3, 0xb4b2a8, 0xffe8c8, 1.12, 0xffd8a8, 1.6, .1], [19, 0xd99a6c, 0xffc896, 1, 0xff9a5a, 1.4, .6],
  [20.5, 0x33405c, 0x8494c4, 1.18, 0xaabfe6, .72, 1], [24, 0x33405c, 0x8494c4, 1.18, 0xaabfe6, .72, 1]];   // V3D.15: nights brighter again (.95 / .55 -> 1.18 / .72)   // V3D.12: nights brighter (were .7 / .35)
const cA = new THREE.Color(), cB = new THREE.Color();
let glowNow = -1, sunH = -1;
function light(h) {
  let i = 0; while (i < KEYS.length - 2 && h >= KEYS[i + 1][0]) i++;
  const a = KEYS[i], b = KEYS[i + 1], u = Math.max(0, Math.min(1, (h - a[0]) / (b[0] - a[0] || 1)));
  const mix = (k) => cA.set(a[k]).lerp(cB.set(b[k]), u).clone(), num = (k) => a[k] + (b[k] - a[k]) * u;
  scene.background = mix(1); hemi.color.copy(mix(2)); hemi.intensity = num(3); sun.color.copy(mix(4)); sun.intensity = num(5);
  { const day = h > 5.5 && h < 20.5, f = day ? (h - 6) / 14 : .5, el = day ? Math.max(.12, Math.sin(Math.PI * Math.min(1, Math.max(0, f)))) : .75, az = (f - .5) * 1.7, bx = -30, bz = 18, L = Math.hypot(bx, bz) * (1.25 - .45 * el);   /* 3D.58 the sun crosses the sky: long shadows morning and evening */
    const k = Math.round(h * 10) / 10; if (k !== sunH) { sunH = k; sun.position.set(MC.x + (bx * Math.cos(az) - bz * Math.sin(az)) / Math.hypot(bx, bz) * L, 22 + 34 * el, MC.z + (bx * Math.sin(az) + bz * Math.cos(az)) / Math.hypot(bx, bz) * L); renderer.shadowMap.needsUpdate = true; } }
  const g = Math.round(num(6) * 50) / 50;
  if (g !== glowNow) { glowNow = g; winMat.color.set(0x4a3a28).lerp(new THREE.Color(0xffc864), g); poolMat.opacity = .8 * g; lampSprite.opacity = .9 * g; beamMat.opacity = .45 * g; haloMat.opacity = .5 * g; for (const m of charMats) m.emissive.setScalar(m.userData.nightGlow * g); }
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
// V3D.21 rolling ground: gentle rises and dips (also under the roads), flat wherever something is built (buildings, walls)
// so their bases stay on the ground. Heights live on a half-tile grid; groundH() samples it for everything placed on the ground.
const GH = { a: null, x0: 0, y0: 0, nx: 0, ny: 0, amp: .45 };
function groundH(wx, wz) {
  if (!GH.a) return 0; const u = (wx / T - GH.x0) * 2, v = (wz / T - GH.y0) * 2, i = Math.floor(u), j = Math.floor(v);
  if (i < 0 || j < 0 || i >= GH.nx || j >= GH.ny) return 0; const fu = u - i, fv = v - j, N = GH.nx + 1, A = GH.a;
  return (A[j * N + i] * (1 - fu) + A[j * N + i + 1] * fu) * (1 - fv) + (A[(j + 1) * N + i] * (1 - fu) + A[(j + 1) * N + i + 1] * fu) * fv;
}
function buildHeights(X0, Y0, NX, NY) {
  const W = G.world, blk = (x, y) => G.Wd.buildingAt(W, x, y) || G.Wd.wallAt(W, x, y);
  const D = new Float32Array(NX * NY).fill(9);   // distance (tiles) to the nearest built tile, up to 3
  for (let y = 0; y < NY; y++) for (let x = 0; x < NX; x++) if (blk(x + X0, y + Y0)) for (let dy = -3; dy <= 3; dy++) for (let dx = -3; dx <= 3; dx++) { const xx = x + dx, yy = y + dy; if (xx < 0 || yy < 0 || xx >= NX || yy >= NY) continue; const d = Math.hypot(dx, dy); if (d < D[yy * NX + xx]) D[yy * NX + xx] = d; }
  const sm = (a, b, t) => { const k = Math.max(0, Math.min(1, (t - a) / (b - a))); return k * k * (3 - 2 * k); };
  const gx = NX * 2, gy = NY * 2, A = new Float32Array((gx + 1) * (gy + 1));
  for (let j = 0; j <= gy; j++) for (let i = 0; i <= gx; i++) {
    const u = X0 + i / 2, v = Y0 + j / 2;   // tile coordinates of this grid point
    // distance to built ground, from the four tiles around this point (tile centres are at +.5)
    let d = 9; for (const tx of [Math.floor(u - .01), Math.floor(u + .01)]) for (const ty of [Math.floor(v - .01), Math.floor(v + .01)]) { const xx = tx - X0, yy = ty - Y0; if (xx >= 0 && yy >= 0 && xx < NX && yy < NY) d = Math.min(d, D[yy * NX + xx]); }
    const flat = sm(.9, 2.2, d), n = .5 * Math.sin(u * 1.35 + 1.3) * Math.cos(v * 1.1 + .4) + .32 * Math.sin(u * 2.3 - v * 1.9 + 2.1) + .18 * Math.cos(u * 3.7 + v * 3.1 + .7);
    A[j * (gx + 1) + i] = GH.amp * flat * n;
  }
  Object.assign(GH, { a: A, x0: X0, y0: Y0, nx: gx, ny: gy });
}
const hash = (x, y) => { let h = (x * 374761393 + y * 668265263) | 0; h = (h ^ (h >>> 13)) * 1274126177 | 0; return ((h ^ (h >>> 16)) >>> 0) / 4294967296; };
const regrow = (x, y) => {   // town tiles where grass creeps back: near the town edge and in a few clumps
  const B = G.Wd.BUILD, d = Math.min(x - B.x0, B.x1 - x, y - B.y0, B.y1 - y), c = hash(Math.floor(x / 3) * 7 + 1, Math.floor(y / 3) * 5 + 3);
  return (d === 0 && hash(x * 5, y * 3) < .6) || (d === 1 && hash(x * 3, y * 7) < .3) || (c < .22 && hash(x, y * 11) < .55);
};
const ROAD_STYLE = (() => { try { const q = new URLSearchParams(location.search).get('road'); if (q) localStorage.setItem('zh_road', q); return +(q || localStorage.getItem('zh_road') || 1); } catch (e) { return 1; } })();   // V3D.21 road look: 0 dirt track, 1 light gravel (default), 2 cobbles, 3 flagstones, 4 cracked asphalt
const RU = { uRoad: { value: null }, uRO: { value: new THREE.Vector2() }, uRN: { value: new THREE.Vector2(1, 1) }, uT: { value: T }, uRS: { value: ROAD_STYLE } };
let _gmat = null;
// ---------------------------------------------------------------- night lights (V3D.12): warm light pools at every
// door, a lantern glow above it, and a flashlight beam ahead of each survivor outside. Additive ground decals, so they
// cost nothing like real lights do on a phone.
function lightTex(cone) {
  const S2 = 128, c = document.createElement('canvas'); c.width = c.height = S2; const g = c.getContext('2d');
  if (!cone) { const r = g.createRadialGradient(64, 64, 0, 64, 64, 64); r.addColorStop(0, 'rgba(255,255,255,1)'); r.addColorStop(.45, 'rgba(255,255,255,.45)'); r.addColorStop(1, 'rgba(255,255,255,0)'); g.fillStyle = r; g.fillRect(0, 0, S2, S2); }
  else {   // a beam from the bottom centre widening upwards, brightest along its axis
    const img = g.createImageData(S2, S2);
    for (let y = 0; y < S2; y++) for (let x = 0; x < S2; x++) { const v = 1 - y / S2, half = .08 + .42 * v, dx = Math.abs(x / S2 - .5) / half;
      const a = dx < 1 ? (1 - dx * dx) * Math.min(1, v * 6) * (1 - v * v * .85) : 0, i = (y * S2 + x) * 4; img.data[i] = img.data[i + 1] = img.data[i + 2] = 255; img.data[i + 3] = a * 255; }
    g.putImageData(img, 0, 0);
  }
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; return t;
}
const addM = (map, col) => new THREE.MeshBasicMaterial({ map, color: col, transparent: true, opacity: 0, blending: THREE.AdditiveBlending, depthWrite: false });
const glowT = lightTex(false), poolMat = addM(glowT, 0xffb860), beamMat = addM(lightTex(true), 0xfff0c8);
const poolG = new THREE.PlaneGeometry(1, 1).rotateX(-Math.PI / 2), beamG = new THREE.PlaneGeometry(1.5, 2.6).rotateX(-Math.PI / 2).translate(0, 0, -1.3);
function doorLight(b) {   // world group: a pool on the ground at the door and a small lantern halo above it
  const d = G.Wd.doorPoint(b), g = new THREE.Group(), pool = new THREE.Mesh(poolG, poolMat), lamp = new THREE.Sprite(lampSprite);
  pool.scale.set(4.2, 1, 4.2); pool.position.y = .03; pool.renderOrder = 2; lamp.scale.set(.9, .9, 1); lamp.position.y = 1.35; g.add(pool, lamp);
  g.position.set(d.x * T, 0, d.y * T); return g;
}
const haloMat = addM(glowT, 0xffe2b0);   // the light a survivor's lamp throws around them
const lampSprite = new THREE.SpriteMaterial({ map: glowT, color: 0xffd890, transparent: true, opacity: 0, blending: THREE.AdditiveBlending, depthWrite: false });
function groundMat() {   // V3D.5: painted ground. World-space noise: big yellow/green patches, darker clumps, light flecks (grass), pebbles and ruts (dirt)
  if (_gmat) return _gmat;
  const gs = new THREE.DataTexture(new Uint8Array([120, 120, 120, 255, 165, 165, 165, 255, 205, 205, 205, 255, 235, 235, 235, 255, 255, 255, 255, 255]), 5, 1); gs.needsUpdate = true;   /* 3D.30: softer light steps on the ground (the 3-step toon ramp banded the slopes) */
  const m = new THREE.MeshToonMaterial({ vertexColors: true, gradientMap: gs });
  m.onBeforeCompile = (sh) => {
    Object.assign(sh.uniforms, RU);
    sh.vertexShader = 'varying vec3 vWP; varying vec3 vWN;\n' + sh.vertexShader.replace('#include <begin_vertex>', '#include <begin_vertex>\n  vWP = (modelMatrix * vec4(position, 1.)).xyz; vWN = normalize(mat3(modelMatrix) * normal);');
    sh.fragmentShader = `varying vec3 vWP; varying vec3 vWN; uniform sampler2D uRoad; uniform vec2 uRO, uRN; uniform float uT; uniform int uRS;
      vec2 vor(vec2 q){ vec2 i = floor(q), f = fract(q); float d1 = 9., d2 = 9.; for (int y = -1; y <= 1; y++) for (int x = -1; x <= 1; x++) { vec2 o = vec2(x, y), c = o + vec2(fract(sin(dot(i + o, vec2(127.1, 311.7))) * 43758.5), fract(sin(dot(i + o, vec2(269.5, 183.3))) * 43758.5)) * .8 + .1; float d = length(c - f); if (d < d1) { d2 = d1; d1 = d; } else if (d < d2) d2 = d; } return vec2(d1, d2); }
      float gh(vec2 p){ return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453); }
      float gn(vec2 p){ vec2 i = floor(p), f = fract(p); f = f * f * (3. - 2. * f); return mix(mix(gh(i), gh(i + vec2(1., 0.)), f.x), mix(gh(i + vec2(0., 1.)), gh(i + 1.), f.x), f.y); }
      float gf(vec2 p){ return .5 * gn(p) + .25 * gn(p * 2.03 + 7.1) + .125 * gn(p * 4.1 + 3.3) + .125 * gn(p * 8.3 + 1.7); }
      ` + sh.fragmentShader.replace('#include <color_fragment>', `#include <color_fragment>
      {
        vec2 p = vWP.xz;
        float grass = smoothstep(-.10, .0, diffuseColor.g - diffuseColor.r);           // 1 on grass, 0 on dirt and roads
        float big = gf(p * .09), mid = gf(p * .45), fine = gn(p * 7.), fleck = gn(p * 19. + 3.);
        vec3 patchTint = mix(vec3(1.06, 1.03, .80), vec3(.88, 1.04, .90), smoothstep(.35, .65, big));   // dry yellow vs fresh green
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
        // V3D.21 road detail (it read as a brown smudge): pale dusty middle, two wheel ruts, a grassy crown, pebbles, footprints of wear
        road = mix(road, road * vec3(1.28, 1.22, 1.12), smoothstep(.55, .75, gf(p * .7 + 5.)) * .55);          // sun-bleached dusty patches
        float brk = smoothstep(.25, .45, gn(p * 2.3 + 13.));                                                      // ruts come and go
        float rut = (1. - smoothstep(.0, .045, abs(rm - .79))) * brk;
        road = mix(road, road * .62, rut * .85);                                                                  // two dark wheel ruts either side of the middle
        road = mix(road, road * 1.18, (1. - smoothstep(.0, .03, abs(rm - .755))) * brk * .6);                   // their pale lip
        float crown = smoothstep(.93, .99, rm) * smoothstep(.62, .82, gn(p * 13. + 31.));
        road = mix(road, vec3(.16, .23, .05), crown * .75);                                                       // grass blades down the middle
        { vec2 q = p * 1.3, ci = floor(q), cf = fract(q); vec2 c = vec2(gh(ci), gh(ci + 3.7)) * .7 + .15; float dd = length(cf - c), on = step(.62, gh(ci + 7.3)), rs = .07 + .07 * gh(ci + 9.1);
          road = mix(road, road * .55, on * (1. - smoothstep(rs, rs + .05, length(cf - c - vec2(.03, -.04)))));   // pebble shadow
          road = mix(road, mix(vec3(.42, .34, .22), vec3(.30, .26, .21), gh(ci + 2.2)), on * (1. - smoothstep(rs - .02, rs, dd))); }   // pebbles, sandy or grey
        { vec2 q = p * 4.5, ci = floor(q), cf = fract(q); float dd = length(cf - vec2(gh(ci + 1.3), gh(ci + 5.9)) * .8 - .1);
          road = mix(road, road * 1.35, step(.7, gh(ci + 4.4)) * (1. - smoothstep(.05, .09, dd))); }             // grit
        if (uRS == 1) {   // gravel, light: packed tan dirt with a scatter of grey chips (thicker in the middle, thinning to the edges)
          vec3 base = mix(vec3(.25, .17, .09), vec3(.32, .24, .14), gf(p * .8)) * (.92 + .16 * gn(p * 3.));
          vec2 v = vor(p * 4.5); vec2 ci = floor(p * 4.5); float t = gh(ci + 3.), dens = .22 + .2 * smoothstep(.6, .95, rm);
          float chip = step(1. - dens, gh(ci + 8.1)) * (1. - smoothstep(.14, .2, v.x));
          vec3 stone = mix(vec3(.26, .24, .21), vec3(.40, .37, .31), t);
          road = mix(base, base * .78, (1. - smoothstep(.0, .05, abs(rm - .79))) * smoothstep(.25, .45, gn(p * 2.3 + 13.)) * .6);   // faint ruts
          road = mix(road, road * .7, chip * .5 * (1. - smoothstep(.1, .22, length(v.x - .03))));   // chip shadow
          road = mix(road, stone, chip);
        } else if (uRS == 2) {   // cobbles: rounded grey-brown stones in dark joints
          vec2 v = vor(p * 2.6); float edge = smoothstep(.03, .14, v.y - v.x), dome = 1. - smoothstep(.0, .45, v.x);
          vec3 st = mix(vec3(.20, .17, .13), vec3(.30, .26, .20), gh(floor(p * 2.6) + 1.)) * (.8 + .35 * dome);
          road = mix(vec3(.07, .055, .04), st, edge); road = mix(road, vec3(.12, .19, .04), (1. - edge) * smoothstep(.6, .8, gn(p * 6.)) * .7);   // moss in the joints
        } else if (uRS == 3) {   // flagstones: big flat pale slabs with grass between
          vec2 v = vor(p * 1.1); float edge = smoothstep(.02, .09, v.y - v.x);
          vec3 st = mix(vec3(.33, .30, .25), vec3(.42, .38, .31), gh(floor(p * 1.1) + 5.)) * (.85 + .25 * gf(p * 1.7));
          road = mix(vec3(.12, .17, .05), st, edge);
        } else if (uRS == 4) {   // cracked asphalt: dark grey, faded patches, cracks with weeds, worn middle line
          vec3 a = vec3(.075, .075, .08) * (.85 + .35 * gf(p * .9)); a = mix(a, a * 1.5, smoothstep(.6, .8, gf(p * .5 + 3.)) * .6);
          vec2 v = vor(p * .9); float crack = 1. - smoothstep(.0, .025, v.y - v.x);
          a = mix(a, vec3(.03, .03, .03), crack * smoothstep(.35, .55, gn(p * 1.4 + 2.)));
          a = mix(a, vec3(.10, .17, .04), crack * smoothstep(.55, .75, gn(p * 3. + 7.)));
          float mid = (1. - smoothstep(.0, .025, abs(rm - .985))) * step(.5, fract(gn(p * .2) * 3. + p.x * .25 + p.y * .25)) * smoothstep(.4, .6, gn(p * 2.));
          road = mix(a, vec3(.55, .42, .10), mid * .7);
        }
        g = mix(g, g * .82, rim);                                                        // darker trodden edge
        g = mix(g, vec3(.12, .19, .04), rim * smoothstep(.6, .8, gn(p * 17. + 8.)) * .8);  // grass tufts along the edge
        g = mix(g, road, rw);
        float hs = dot(normalize(vWN), normalize(vec3(-.55, 1., .35)));                    // V3D.21 hill shading: sunny slopes lighter, the far sides darker,
        g *= mix(1., clamp(.55 + .62 * hs, .7, 1.25), .9) * (.93 + .14 * smoothstep(-.4, .4, vWP.y));   // hollows a touch darker than the tops
        diffuseColor.rgb = g;
      }`);
  };
  return (_gmat = m);
}
// V3D.17 seasons: grass, tufts, bushes and tree crowns follow the season (winter crowns are bare twigs)
const season = () => (G.season ? G.season() : 'autumn');
const SEASON_PAL = {
  spring: { grass: ['#7aa846', '#80ae4a', '#76a242', '#86b24c', '#8db650', '#78a444'], tuft: ['#7ea83a', '#8fb446', '#a3c050', '#6f9a34'], bush: ['#e8a8c0', '#8fc25a', '#7fb04a', '#f2c8d8', '#a8c86a'], crown: ['#8fc25a', '#7fb04a', '#e8a8c0', '#a8c86a', '#9ac860', '#f2c8d8'] },
  summer: { grass: ['#6f9e3e', '#74a442', '#6a983a', '#79a845', '#80ac48', '#6c9a3c'], tuft: ['#6a9a34', '#7aa83c', '#88b044', '#5e8c30'], bush: ['#4f8a3a', '#5a9a42', '#3f7a34', '#68a048', '#4a8238'], crown: ['#4f8a3a', '#5a9a42', '#3f7a34', '#68a048', '#4a8238', '#5c9440'] },
  autumn: { grass: ['#7c9e42', '#80a245', '#78993f', '#85a547', '#8ba649', '#7a9b40'], tuft: ['#7d8a34', '#8f9a3c', '#a39a40', '#6f7d30'], bush: ['#c96a28', '#d9963a', '#8a9636', '#b8562a', '#a8a03a'], crown: ['#d06a2a', '#e39a35', '#c9541f', '#b8a03a', '#8a9a3a', '#d98a2c'] },
  winter: { grass: ['#8a9a6a', '#8e9e6e', '#869666', '#92a272', '#96a474', '#889868'], tuft: ['#9a9a78', '#a6a482', '#8e8e6e', '#b0ac8a'], bush: ['#7a6a58', '#86765e', '#6e6252', '#8e7e66', '#7a7060'], crown: ['#7a6a5a', '#86745e', '#6e6050', '#8e7c66', '#76685a', '#827260'] },
};
// snow settles on whatever faces up (ground, roofs, tree tops): a shader hook on the scenery's toon materials
const SNOW = { uSnow: { value: 0 } };
function snowPatch(m) {
  if (!m || !m.isMeshToonMaterial || m.userData.snowP) return; m.userData.snowP = true;
  const prev = m.onBeforeCompile, pk = m.customProgramCacheKey && m.customProgramCacheKey !== THREE.Material.prototype.customProgramCacheKey ? m.customProgramCacheKey.bind(m) : null;
  m.onBeforeCompile = (sh, r) => { if (prev) prev.call(m, sh, r); sh.uniforms.uSnow = SNOW.uSnow;
    sh.fragmentShader = 'uniform float uSnow;\n' + sh.fragmentShader.replace('#include <lights_toon_fragment>', '{ vec3 wn = normalize((vec4(normal, 0.0) * viewMatrix).xyz); float sn = uSnow * smoothstep(0.22, 0.7, wn.y); diffuseColor.rgb = mix(diffuseColor.rgb, vec3(0.93, 0.95, 1.0), sn * 0.88); }\n#include <lights_toon_fragment>'); };
  m.customProgramCacheKey = () => (pk ? pk() : '') + '|snow'; m.needsUpdate = true;
}
let snowScan = 0;
function snowWalk(o) { if (o.userData.actor || o.userData.hull) return; if (o.isMesh && !o.isSkinnedMesh) (Array.isArray(o.material) ? o.material : [o.material]).forEach(snowPatch); for (const c of o.children) snowWalk(c); }
const SNOW_N = 700, snowPos = new Float32Array(SNOW_N * 3), snowG = new THREE.BufferGeometry(); snowG.setAttribute('position', new THREE.BufferAttribute(snowPos, 3));
const snowPts = new THREE.Points(snowG, new THREE.PointsMaterial({ color: 0xffffff, size: .16, transparent: true, opacity: .9, depthWrite: false })); snowPts.frustumCulled = false; snowPts.visible = false; scene.add(snowPts);
const snowSeed = Array.from({ length: SNOW_N }, () => [Math.random(), Math.random(), Math.random(), Math.random() * 6]); let snowFallK = 0;
function syncSnow(dt) {
  const target = G.S.snowK || 0; SNOW.uSnow.value += (target - SNOW.uSnow.value) * Math.min(1, dt * .5);
  if (SNOW.uSnow.value > .01 && (snowScan -= dt) <= 0) { snowScan = 2; snowWalk(scene); }
  const w = G.S.weather, fk = w && w.kind && w.kind.startsWith('snow') ? (w.kind === 'snow-heavy' ? 1 : .55) : 0; snowFallK += (fk - snowFallK) * Math.min(1, dt * .8); snowPts.visible = snowFallK > .02; if (!snowPts.visible) return;
  const n = Math.round(SNOW_N * snowFallK), c = cam.position.clone().addScaledVector(DIR, -120), span = (cam.right - cam.left) * 1.4;
  for (let i = 0; i < n; i++) { const sd = snowSeed[i]; sd[1] = (sd[1] - dt * (.12 + sd[2] * .06)) % 1; if (sd[1] < 0) { sd[1] += 1; sd[0] = Math.random(); sd[2] = Math.random(); } sd[3] += dt;
    snowPos.set([c.x + (sd[0] - .5) * span + Math.sin(sd[3] * 1.3) * .3, sd[1] * 9, c.z + (sd[2] - .5) * span + Math.cos(sd[3]) * .2], i * 3); }
  snowG.setDrawRange(0, n); snowG.attributes.position.needsUpdate = true;
  hemi.intensity *= 1 - .08 * snowFallK; sun.intensity *= 1 - .3 * snowFallK;
}
function buildGround() {
  const W = G.world, B = G.Wd.BUILD, WZ = G.Wd.WALLZONE;
  const key = [B.x0, B.y0, B.x1, B.y1, W.roads.size, W.ver, season()].join(',');
  if (key === groundKey) return false; groundKey = key;
  if (groundMesh) { scene.remove(groundMesh); groundMesh.geometry.dispose(); }
  const pos = [], col = [], c = new THREE.Color();
  const GR = SEASON_PAL[season()].grass   /* V3D.12: greener, so the town and people stand out; V3D.17: by season */, DIRT = ['#b08a52', '#ad874f', '#b38d55', '#a9854d'];
  const X0 = -PAD, Y0 = -PAD, NX = G.COLS + 2 * PAD, NY = G.ROWS + 2 * PAD, tc = new Float32Array(NX * NY * 3);
  for (let y = Y0; y < Y0 + NY; y++) for (let x = X0; x < X0 + NX; x++) {   // one colour per tile ...
    const r = hash(x, y), inB = x >= B.x0 && x <= B.x1 && y >= B.y0 && y <= B.y1;
    const edge = Math.max(0, B.x0 - x, x - B.x1, B.y0 - y, y - B.y1);
    let k;
    if (inB && regrow(x, y) && !G.Wd.isRoad(W, x, y)) k = r < .5 ? '#90a046' : '#97a44a';   // V3D.6: grass growing back into the town dirt
    else if (inB || (edge === 1 && r < .55)) k = DIRT[(r * 4) | 0];
    else if (x >= WZ.x0 && x <= WZ.x1 && y >= WZ.y0 && y <= WZ.y1 && r < .4) k = '#a39150';
    else if (x < 0 || y < 0 || x >= G.COLS || y >= G.ROWS) k = r < .5 ? '#73923a' : '#6f8d38';
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
  buildHeights(X0, Y0, NX, NY);
  const ccol = (x, y) => { const x0 = Math.floor(x), y0 = Math.floor(y), fx = x - x0, fy = y - y0, a = corner(x0, y0), b = corner(x0 + 1, y0), c2 = corner(x0, y0 + 1), d2 = corner(x0 + 1, y0 + 1); return [0, 1, 2].map((k) => (a[k] * (1 - fx) + b[k] * fx) * (1 - fy) + (c2[k] * (1 - fx) + d2[k] * fx) * fy); };
  for (let y = Y0; y < Y0 + NY; y++) for (let x = X0; x < X0 + NX; x++) for (let sy = 0; sy < 2; sy++) for (let sx = 0; sx < 2; sx++)   // two by two quads per tile, so the rises are smooth
    for (const [dx, dz] of [[0, 0], [1, 1], [1, 0], [0, 0], [0, 1], [1, 1]]) { const u = x + (sx + dx) / 2, v = y + (sy + dz) / 2; pos.push(u * T, groundH(u * T, v * T), v * T); col.push(...(sx + dx === 0 || sx + dx === 2) && (sy + dz === 0 || sy + dz === 2) ? corner(u, v) : ccol(u, v)); }
  const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3)); g.setAttribute('color', new THREE.Float32BufferAttribute(col, 3));
  { const nr = new Float32Array(pos.length), e = 1.4; for (let i = 0; i < pos.length; i += 3) { const x = pos[i], z = pos[i + 2], dx = (groundH(x + e, z) - groundH(x - e, z)) * .7, dz = (groundH(x, z + e) - groundH(x, z - e)) * .7, n = new THREE.Vector3(-dx, 2 * e, -dz).normalize();   /* 3D.30: wider, softer slope sample: no diamond banding when zoomed out or at dusk */ nr[i] = n.x; nr[i + 1] = n.y; nr[i + 2] = n.z; }
    g.setAttribute('normal', new THREE.BufferAttribute(nr, 3)); }   // V3D.21 smooth normals from the height field (face normals showed the tile seams)
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
  list.forEach(([x, z, s, r], i) => { m.compose(new THREE.Vector3(x, groundH(x, z), z), new THREE.Quaternion().setFromEuler(new THREE.Euler(0, r * 6, 0)), new THREE.Vector3(s, s * (.9 + r * .25), s)); im.setMatrixAt(i, m); im.setColorAt(i, new THREE.Color(colorFn(r))); });
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
  list.forEach(([x, z, s, r], i) => { m.compose(new THREE.Vector3(x, groundH(x, z), z), new THREE.Quaternion().setFromEuler(new THREE.Euler(0, r * 6, 0)), new THREE.Vector3(s, s * (.9 + r * .25), s)); im.setMatrixAt(i, m); im.setColorAt(i, new THREE.Color(colorFn(r))); });
  im.castShadow = true; im.receiveShadow = true; scene.add(im); addHull(im, th); return im;
}
const tuftG = merge([0, 1, 2, 3, 4].map((i) => new THREE.ConeGeometry(.035, .3 + (i % 3) * .07, 3, 1, true).translate(0, .15, 0).rotateZ((i - 2) * .22).rotateY(i * 1.3).translate(Math.cos(i * 2.4) * .06, 0, Math.sin(i * 2.4) * .06)));
const bushG = merge([new THREE.IcosahedronGeometry(.3, 0).scale(1, .95, 1).translate(0, .2, 0), new THREE.IcosahedronGeometry(.22, 0).scale(1, .75, 1).translate(.24, .14, .08), new THREE.IcosahedronGeometry(.2, 0).scale(1, .7, 1).translate(-.2, .13, -.1)]);
const plankG = box(.9, .05, .16).translate(0, .025, 0);
const planksG = merge([box(.95, .05, .15).translate(0, .025, 0), box(.85, .05, .15).rotateY(.18).translate(.05, .075, .2), box(.7, .05, .14).rotateY(-.3).translate(-.1, .025, -.24)]);
const smallCrateG = merge([box(.34, .3, .34).translate(0, .15, 0), box(.26, .22, .26).rotateY(.5).translate(.36, .11, .1)]);
const barrelG = cyl(.15, .15, .42, 10).translate(0, .21, 0);
const tyreG = new THREE.TorusGeometry(.17, .07, 6, 12).rotateX(Math.PI / 2).translate(0, .07, 0);
/* V3D.22 chopped trees: a stump; marked trees: an orange ribbon round the trunk */
const rockG = new THREE.DodecahedronGeometry(.42, 0).scale(1.25, .8, 1).translate(0, .2, 0), rockG2 = new THREE.DodecahedronGeometry(.26, 0).scale(1, .9, 1.2).translate(.38, .14, .2), rubbleFlatG = merge([new THREE.DodecahedronGeometry(.16, 0).scale(1.3, .4, 1).translate(0, .04, 0), new THREE.DodecahedronGeometry(.12, 0).scale(1, .4, 1.2).translate(.22, .03, .12), new THREE.DodecahedronGeometry(.1, 0).scale(1.2, .4, 1).translate(-.18, .03, -.1)]);
const binG = merge([new THREE.BoxGeometry(.62, .62, .42).translate(0, .31, 0), new THREE.BoxGeometry(.66, .05, .46).translate(0, .14, 0)]), binLidG = new THREE.BoxGeometry(.66, .06, .46).translate(0, .65, 0), binLidOpenG = new THREE.BoxGeometry(.66, .06, .46).rotateX(-1.1).translate(0, .82, -.3);   // V3D.25 clothes bins
const stumpG = cyl(.15, .2, .26, 8).translate(0, .13, 0), stumpTopG = cyl(.135, .135, .03, 8).translate(0, .275, 0), ribbonG = cyl(.16, .16, .1, 10).translate(0, .42, 0), flagG = merge([cyl(.02, .02, .9, 5).translate(0, .45, 0), new THREE.BoxGeometry(.28, .17, .015).translate(.15, .8, 0)]);
const pebbleG = merge([new THREE.OctahedronGeometry(.07, 0).scale(1.2, .55, 1).translate(0, .03, 0), new THREE.OctahedronGeometry(.05, 0).scale(1, .55, 1.2).translate(.11, .02, .05)]);
function instD(geo, list, colorFn, shadow) {   // small scatter: no outline, one draw call each
  const im = new THREE.InstancedMesh(geo, new THREE.MeshToonMaterial({ color: 0xffffff, gradientMap: grad }), Math.max(1, list.length)), m = new THREE.Matrix4();
  im.count = list.length;
  list.forEach(([x, z, s, r], i) => { m.compose(new THREE.Vector3(x, groundH(x, z), z), new THREE.Quaternion().setFromEuler(new THREE.Euler(0, r * 9, 0)), new THREE.Vector3(s, s * (.8 + r * .4), s)); im.setMatrixAt(i, m); im.setColorAt(i, new THREE.Color(colorFn(r))); });
  im.castShadow = !!shadow; im.receiveShadow = true; scene.add(im); return im;
}
function buildForest() {
  const W = G.world, wr = G.wreckSpots(), key = groundKey + '|' + W.buildings.length + '|' + W.walls.size + '|' + wr.length + '|' + season() + '|' + (G.nodeVer ? G.nodeVer() : 0) + '|' + (G.S.sites || []).length;
  if (key === forestKey) return false; forestKey = key;
  for (const o of forest) { scene.remove(o); } forest = [];
  const pines = [], rounds = [], rubble = [], crates = [];
  const blocked = (x, y) => G.Wd.buildingAt(W, x, y) || G.Wd.wallAt(W, x, y) || G.Wd.isRoad(W, x, y);
  const stumps = [], marks = [];   // marks: orange ribbons (trees) / flags (rocks, wrecks)
  for (const [x, y] of G.TREE_SPOTS) { const st = G.treeState ? G.treeState(x, y) : (blocked(x, y) ? null : 'tree'); if (!st) continue; const r = hash(x, y), t = [(x + .5) * T, (y + .5) * T, .8 + r * .5, r];
    if (st === 'stump') { stumps.push([t[0], t[1], 1.2 + r * .4, r]); continue; } (r < .55 ? pines : rounds).push(t); if (st === 'marked') marks.push(t); }
  for (let y = -PAD + 1; y < G.ROWS + PAD - 1; y++) for (let x = -PAD + 1; x < G.COLS + PAD - 1; x++) {
    const out = Math.max(-x, x - G.COLS + 1, -y, y - G.ROWS + 1); if (out < 1) continue;
    const r = hash(x * 7 + 3, y * 5 + 1); if (r > Math.min(.55, .12 + out * .06)) continue;
    const q = hash(x, y * 3); (q < .55 ? pines : rounds).push([(x + hash(x, y + 9)) * T, (y + hash(x + 9, y)) * T, .75 + q * .6, q]);
  }
  const rocks = [], rubbleE = [];
  for (const [x, y] of [...wr, ...(G.CAR_SPOTS || [])]) { const st = G.nodeState ? G.nodeState(x, y) : (blocked(x, y) ? null : 'full'); if (!st) continue; const t = [(x + .5) * T, (y + .5) * T, 1 + hash(x, y) * .6, hash(y, x)]; if (st === 'empty') rubbleE.push([t[0], t[1], .7, t[3]]); else { rubble.push(t); if (st === 'marked') marks.push([t[0], t[1], 1.6, 0]); } }
  const bins = [], binsE = [];
  for (const [x, y] of G.BIN_SPOTS || []) { const st = G.nodeState(x, y); if (!st) continue; const r = hash(x * 5, y * 3), t = [(x + .5) * T, (y + .5) * T, 1, r]; if (st === 'empty') binsE.push(t); else { bins.push(t); if (st === 'marked') marks.push([t[0], t[1], 1.6, 0]); } }
  for (const [x, y] of G.ROCK_SPOTS || []) { const st = G.nodeState(x, y); if (!st) continue; const r = hash(x * 3, y * 7), t = [(x + .5) * T, (y + .5) * T, 1.2 + r * .5, r]; if (st === 'empty') rubbleE.push([t[0], t[1], 1, r]); else { rocks.push(t); if (st === 'marked') marks.push([t[0], t[1], 1.9, 0]); } }
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
  const SP = SEASON_PAL[season()];
  { const t = instD(tuftG, tufts, (r) => SP.tuft[(r * 4) | 0]); t.userData.noInk = true; forest.push(t); }   // grass tufts are too thin to ink
  forest.push(instD(bushG, bushes, (r) => SP.bush[(r * 5) | 0], true));
  { const t = instD(pebbleG, pebbles, (r) => ['#8c8478', '#9a9080', '#7c7468'][(r * 3) | 0]); t.userData.noInk = true; forest.push(t); }
  for (const t of [...pines, ...rounds]) t[2] *= 1.35;   // V3D.5: bigger trees for the 2.4-unit tiles (mockup proportions)
  const dead = rounds.filter((t) => hash(t[0] * 3.1, t[1] * 7.7) < .2), leafy = rounds.filter((t) => !dead.includes(t));
  forest.push(instSway(pineTrunkG, pines, () => '#5a3b23', .03, 0, .8));
  const PINE = ['#3d7048', '#386a44', '#447a4e', '#33613f', '#4a7f50'], CROWN = SP.crown;
  const dk = (c) => '#' + new THREE.Color(c).multiplyScalar(.7).getHexString();
  forest.push(instSway(pineCoreG, pines, (r) => dk(PINE[(r * 5) | 0]), .03, .3, 2.7));
  forest.push(instSway(pineCardsG, pines, (r) => PINE[(r * 5) | 0], 0, .3, 2.7, NEEDLE_TEX));
  forest.push(instSway(trunkG, leafy, () => '#5a3b23', .03, 0, 1.4));
  forest.push(instSway(crownCoreG, leafy, (r) => dk(CROWN[(r * 6) | 0]), .03, 1.0, 2.5));
  forest.push(instSway(crownCardsG, leafy, (r) => CROWN[(r * 6) | 0], 0, 1.0, 2.6, LEAF_TEX));
  forest.push(instSway(deadG, dead, (r) => ['#5e4a3a', '#6a5544', '#54443a'][(r * 3) | 0], .03, 0, 2.0));
  forest.push(instD(stumpG, stumps, () => '#6a4a30', true)); forest.push(instD(stumpTopG, stumps, () => '#d9b07a'));
  { const tr = marks.filter((t) => pines.includes(t) || rounds.includes(t)), fl = marks.filter((t) => !tr.includes(t)); const rb = tr.map((t) => [t[0], t[1], t[2] * 1.35 * (pines.includes(t) ? .8 : 1.05), 0]); forest.push(instD(ribbonG, rb, () => '#ff7a2e')); forest.push(instD(flagG, fl.map((t) => [t[0] + .35, t[1] - .2, 1, 0]), () => '#ff7a2e')); }
  forest.push(instD(rockG, rocks, (r) => ['#8c8478', '#9a9080', '#7c7468'][(r * 3) | 0], true)); forest.push(instD(rockG2, rocks, (r) => ['#a39b8e', '#8f887c'][(r * 2) | 0], true));
  forest.push(instD(rubbleFlatG, rubbleE, () => '#7a7266'));
  forest.push(instD(binG, bins, (r) => ['#3f7a5a', '#4a6a8a', '#7a5a3a'][(r * 3) | 0], true)); forest.push(instD(binLidG, bins, () => '#2e4a3a')); forest.push(instD(binG, binsE, () => '#5a5a52', true)); forest.push(instD(binLidOpenG, binsE, () => '#3a3a34'));
  forest.push(inst(rubbleG, rubble, (r) => r < .5 ? '#6f675c' : '#7a6a58', .025));
  forest.push(inst(crateG, crates, () => '#9a6d3e', .025));
  return true;
}

// ---------------------------------------------------------------- 3D.76 traps (outside the wall ring; a spent trap lies flat and dull)
let trapGroup = null, trapKey = '';
function buildTraps() {
  const W = G.world, list = W.traps ? [...W.traps.values()] : [];
  const key = list.map((t) => `${t.x},${t.y},${t.type},${t.ch > 0 ? 1 : 0}`).join(';');
  if (key === trapKey) return false; trapKey = key;
  if (trapGroup) scene.remove(trapGroup);
  trapGroup = new THREE.Group(); scene.add(trapGroup);
  const P = new Parts();
  for (const t of list) {
    const cx = (t.x + .5) * T, cz = (t.y + .5) * T, y0 = groundH(cx, cz), s = hash(t.x, t.y), live = t.ch > 0;
    if (t.type === 'spikes') {   // a plank with a row of stakes
      P.put(box(1.2, .08, .34), '#6f4a2c', M4(cx, y0 + .04, cz, s));
      for (let k = -2; k <= 2; k++) { const h = live ? .45 + hash(t.x + k, t.y) * .12 : .12; P.put(new THREE.ConeGeometry(.06, h, 5), live ? '#c9a46a' : '#7a6650', M4(cx + Math.cos(s) * k * .22, y0 + .08 + h / 2, cz - Math.sin(s) * k * .22, 0, live ? .25 : 1.2)); }
    } else if (t.type === 'wire') {   // two stakes and a coil between them
      for (const k of [-1, 1]) P.put(cyl(.04, .05, .7, 5), '#6a4528', M4(cx + k * .5, y0 + .35, cz));
      if (live) for (let k = -2; k <= 2; k++) P.put(new THREE.TorusGeometry(.17, .015, 4, 10), '#9aa0a6', M4(cx + k * .18, y0 + .3, cz, Math.PI / 2));
      else P.put(new THREE.TorusGeometry(.2, .015, 4, 10), '#7d7466', M4(cx, y0 + .03, cz, 0, Math.PI / 2));
    } else if (t.type === 'lure') {   // a pole with a bell and hanging cans
      P.put(cyl(.05, .06, 1.4, 6), '#6a4528', M4(cx, y0 + .7, cz)); P.put(box(.5, .05, .05), '#6a4528', M4(cx, y0 + 1.35, cz, s));
      P.put(new THREE.ConeGeometry(.13, .2, 8), live ? '#d8b04a' : '#7a6a4a', M4(cx, y0 + 1.2, cz));
      for (const k of [-1, 1]) P.put(cyl(.06, .06, .14, 8), live ? '#b8bec4' : '#6f6a62', M4(cx + Math.cos(s) * k * .22, y0 + 1.15, cz - Math.sin(s) * k * .22));
    }
  }
  P.build(trapGroup, .02);
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
  if (P.doorX === undefined) P.doorX = -w * .2;   /* 3D.28: remember where the door is so survivors walk in through it */
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
/* V3D.23 tier looks: canvas tents (camp), log cabins (timber), stone walls (stone) */
function tentG(P, w, d, col = '#c9b48a', o = {}) {
  const H = o.h || 1.05, half = w / 2, len = Math.hypot(half, H), ang = Math.atan2(H, half);
  P.put(box(len, .05, d), col, M4(-half / 2, H / 2, 0, 0, 0, ang)); P.put(box(len, .05, d), o.col2 || col, M4(half / 2, H / 2, 0, 0, 0, -ang));
  P.put(cyl(.03, .03, d + .3, 6), '#6f4a2c', M4(0, H, 0, 0, Math.PI / 2));
  const tv = [-half, 0, d / 2, half, 0, d / 2, 0, H, d / 2, half, 0, -d / 2, -half, 0, -d / 2, 0, H, -d / 2], tg = new THREE.BufferGeometry(); tg.setAttribute('position', new THREE.Float32BufferAttribute(tv, 3)); tg.computeVertexNormals();
  P.put(tg, o.col2 || col, M4(0, 0, 0)); P.put(new THREE.ConeGeometry(.22, H * .62, 3).rotateY(Math.PI / 6), '#3a2c20', M4(0, H * .31, d / 2 + .01));
  for (const k of [-1, 1]) P.put(cyl(.02, .02, .5, 4), '#6f4a2c', M4(k * (half + .2), .16, d / 2 + .1, 0, 0, k * .6));
}
function stoneHall(P, w, d, roof, o = {}) {
  const H = o.h || 1.3; cabin(P, w, d, roof, { ...o, h: H, plank: true, wall: ['#a8a196', '#9a948a'] });
  P.put(box(w + .12, .22, d + .12), '#7d776d', M4(0, .11, 0));
  for (const [x, z] of [[-1, -1], [1, -1], [1, 1], [-1, 1]]) for (let i = 0; i < 3; i++) P.put(box(.2, .18, .2), i % 2 ? '#b8b2a6' : '#8f8a80', M4(x * w / 2, .3 + i * H * .3, z * d / 2));
  for (let i = 0; i < 4; i++) P.put(box(w * (.18 + hash(i, 3) * .1), .1, .03), '#8a847a', M4(-w * .3 + i * w * .2, .45 + (i % 2) * .4, d / 2 + .02));
}
function flag(P, x, z, h = 2.4, c = '#c83a32') { P.put(cyl(.035, .04, h, 6), '#5a3b23', M4(x, h / 2, z)); P.put(box(.5, .3, .02), c, M4(x + .26, h - .2, z)); }
function logPile(P, x, z, n = 3) { for (let r = 0; r < n; r++) for (let i = 0; i < n - r; i++) P.put(cyl(.1, .1, .9, 7), i % 2 ? '#8a5a32' : '#7a4f2c', M4(x - (n - r - 1) * .1 + i * .2, .1 + r * .18, z, 0, 0, Math.PI / 2)); }
function rockPile(P, x, z, n = 4, s0 = 1) { for (let i = 0; i < n; i++) P.put(new THREE.DodecahedronGeometry(.18 * s0 * (.7 + hash(i, 5) * .6), 0).scale(1.2, .8, 1), i % 2 ? '#8c8478' : '#a39b8e', M4(x + (hash(i, 9) - .5) * .5, .12, z + (hash(i, 2) - .5) * .4, i)); }
const BUILD = {
  /* 3D.77 power, fuel and ammo buildings (low detail toon parts) */
  pump: (P, w, d) => { P.put(box(w * .5, .14, d * .5), '#7d776d', M4(0, .07, 0)); P.put(cyl(.2, .22, .55, 10), '#5d7a8c', M4(-w * .1, .42, 0)); P.put(box(.34, .3, .26), '#4e6a4e', M4(w * .16, .3, -d * .05)); P.put(cyl(.05, .05, .7, 6), '#8f9aa6', M4(-w * .1, .9, 0)); P.put(cyl(.05, .05, w * .5, 6), '#8f9aa6', M4(0, 1.22, 0, 0, 0, Math.PI / 2)); P.put(cyl(.03, .03, .3, 6), '#2e2e2e', M4(w * .16, .5, -d * .05)); P.put(box(.12, .1, .02), '#e8c83a', M4(w * .16, .32, d * .085)); },
  greenhouse: (P, w, d) => { P.put(box(w * .86, .12, d * .8), '#8a847a', M4(0, .06, 0)); const H = 1.3; for (let i = 0; i < 5; i++) { const x = -w * .4 + i * w * .2; P.put(box(.05, H, .05), '#e8e2d4', M4(x, H / 2, -d * .38)); P.put(box(.05, H, .05), '#e8e2d4', M4(x, H / 2, d * .38)); } for (const k of [-1, 1]) P.put(box(w * .84, .04, d * .42), '#bfe3d8', M4(0, H + .15, k * d * .19, 0, k * .45)); P.put(box(w * .82, H * .9, .03), '#cfeee4', M4(0, H * .45, d * .38)); beds(P, w * .7, d * .5, 2); },
  coldstore: (P, w, d) => { cabin(P, w * .8, d * .74, '#8fa6b8', { plank: true, wall: ['#dfe7ec', '#d4dde3'], h: 1.2 }); P.put(box(.3, .3, .2), '#9aa0a6', M4(w * .3, 1.4, -d * .1)); for (let i = 0; i < 3; i++) P.put(box(.26, .02, .2), '#6f7a84', M4(w * .3, 1.3 + i * .08, -d * .1)); },
  fuelstill: (P, w, d) => { P.put(cyl(.3, .32, .7, 12), '#b0773e', M4(-w * .12, .35, 0)); P.put(new THREE.SphereGeometry(.3, 10, 6, 0, Math.PI * 2, 0, Math.PI / 2), '#c4884a', M4(-w * .12, .7, 0)); P.put(cyl(.03, .03, .6, 6), '#b0773e', M4(w * .1, .95, 0, 0, 0, 1.2)); P.put(cyl(.16, .16, .44, 10), '#8a3a2a', M4(w * .28, .22, d * .15)); P.put(new THREE.DodecahedronGeometry(.12, 0), '#3a2a20', M4(-w * .12, .08, d * .3)); logPile(P, w * .2, -d * .3, 2); },
  ammobench: (P, w, d) => { for (const [x, z] of [[-1, -1], [1, -1], [1, 1], [-1, 1]]) P.put(cyl(.04, .05, .8, 6), '#6f4a2c', M4(x * w * .34, .4, z * d * .26)); P.put(box(w * .8, .08, d * .6), '#7a6a4e', M4(0, .82, 0)); P.put(box(.26, .3, .2), '#5d6b44', M4(-w * .2, 1.0, 0)); for (let i = 0; i < 4; i++) P.put(cyl(.025, .025, .1, 6), '#d8b04a', M4(w * .05 + i * .07, .91, d * .1)); P.put(box(.3, .2, .24), '#5d6b44', M4(w * .25, .1, d * .3)); },
  ammofactory: (P, w, d) => { stoneHall(P, w * .82, d * .72, '#4e555c', { h: 1.5, windows: [w * .2] }); P.put(cyl(.12, .14, 1.2, 8), '#5f666e', M4(-w * .3, 2.1, -d * .15)); P.put(box(.5, .3, .3), '#5d6b44', M4(w * .3, .15, d * .45)); P.put(box(.12, .1, .02), '#e8c83a', M4(-w * .1, 1.1, d * .37 + .02)); },
  generator: (P, w, d) => { P.put(box(w * .55, .5, d * .4), '#4e6a4e', M4(0, .32, 0)); P.put(box(w * .6, .08, d * .45), '#3a4a3a', M4(0, .6, 0)); for (const k of [-1, 1]) P.put(cyl(.09, .09, .06, 10), '#2e2e2e', M4(k * w * .2, .09, d * .22, 0, Math.PI / 2)); P.put(cyl(.04, .05, .5, 6), '#5f666e', M4(w * .18, .85, -d * .1)); P.put(cyl(.06, .06, .05, 8), '#2a2a2a', M4(w * .18, 1.1, -d * .1)); P.put(cyl(.025, .03, 1.5, 6), '#5a3b23', M4(-w * .36, .75, d * .3)); P.put(box(.16, .1, .16), '#ffe08a', M4(-w * .36, 1.52, d * .3)); for (let i = 0; i < 3; i++) P.put(box(.08, .12, .02), '#e8c36a', M4(-w * .1 + i * .1, .4, d * .2 + .01)); },
  radio: (P, w, d) => { const H = 4.2; for (const [x, z] of [[-1, -1], [1, -1], [1, 1], [-1, 1]]) P.put(cyl(.025, .035, Math.hypot(H, w * .3), 5), '#8f9aa6', M4(x * w * .15, H / 2, z * d * .15, 0, -z * .07, x * .07)); for (let i = 1; i < 6; i++) { const y = i * H / 6, k = 1 - y / H * .7; P.put(box(w * .3 * k + .05, .03, .03), '#c83a32', M4(0, y, d * .15 * k)); P.put(box(.03, .03, d * .3 * k + .05), '#c83a32', M4(w * .15 * k, y, 0)); }
    P.put(cyl(.2, .02, .12, 12).rotateX(Math.PI / 2), '#e8e2d4', M4(.1, H * .75, .12, .6)); P.put(box(.04, .04, .04), '#ff4a3a', M4(0, H + .05, 0)); P.put(box(w * .5, .55, d * .4), '#7a6a58', M4(-w * .1, .28, d * .25)); P.put(box(.2, .2, .04), '#3b2a1a', M4(-w * .1, .3, d * .45 + .02)); },
  hq: (P, w, d) => { tentG(P, w * .62, d * .55, '#b9a37a', { h: 1.4, col2: '#a8926a' }); flag(P, -w * .38, -d * .3); crates(P, w * .3, d * .3, 3); for (let i = 0; i < 6; i++) { const a = i / 6 * 6.283; P.put(new THREE.DodecahedronGeometry(.09, 0), '#8c8478', M4(-w * .3 + Math.cos(a) * .22, .06, d * .32 + Math.sin(a) * .22)); } },
  hq2: (P, w, d) => { cabin(P, w * .78, d * .6, '#7a4a2e', { h: 1.6, chimney: true, sign: '#e8c36a', windows: [w * .05, w * .25] }); flag(P, -w * .42, -d * .36, 2.8); P.put(box(w * .7, .08, .5), '#8a6038', M4(0, .32, d * .3 + .3)); logPile(P, w * .38, d * .38); },
  hq3: (P, w, d) => { stoneHall(P, w * .76, d * .66, '#4e555c', { h: 2.1, windows: [w * .05, w * .25] }); for (let i = 0; i < 7; i++) P.put(box(.18, .2, .18), '#9a948a', M4(-w * .38 + i * w * .76 / 6, 2.2, d * .33)); flag(P, 0, -d * .2, 3.4); },
  tent: (P, w, d) => { tentG(P, w * .78, d * .72, '#c9b48a'); },
  cabin: (P, w, d) => cabin(P, w * .82, d * .78, '#7a4a2e', { chimney: true }),
  stonehouse: (P, w, d) => stoneHall(P, w * .8, d * .76, '#6a4a3a', { chimney: true }),
  barrel: (P, w, d) => { P.put(cyl(.28, .26, .62, 12), '#7a5232', M4(0, .31, 0)); for (const y of [.12, .5]) P.put(cyl(.29, .29, .05, 12), '#4e555c', M4(0, y, 0)); P.put(new THREE.ConeGeometry(.42, .22, 12).rotateX(Math.PI), '#5d7a8c', M4(0, .74, 0)); },
  irrig: (P, w, d) => { beds(P, w * .86, d * .86, 4); P.put(box(w * .9, .1, d * .92), '#8a847a', M4(0, .03, 0)); for (const z of [-d * .2, d * .2]) P.put(box(w * .8, .04, .08), '#5d8aa8', M4(0, .07, z)); P.put(cyl(.25, .28, .4, 10), '#9a948a', M4(w * .4, .2, -d * .38)); },
  mess: (P, w, d) => { stoneHall(P, w * .8, d * .7, '#c47a2e', { chimney: true, windows: [w * .05, w * .28] }); P.put(box(w * .5, .05, .45), '#c8a46a', M4(w * .1, 1.25, d * .35 + .25, 0, -.35)); },
  crates: (P, w, d) => { crates(P, -w * .15, -d * .1, 3); crates(P, w * .12, d * .12, 2); P.put(box(.7, .04, .6), '#5d7a5a', M4(-w * .05, .63, -d * .05, .2, .1)); },
  warehouse: (P, w, d) => { stoneHall(P, w * .82, d * .76, '#4e555c', { h: 1.5, windows: [] }); crates(P, w * .25, d * .45, 3); },
  bench: (P, w, d) => { for (const [x, z] of [[-1, -1], [1, -1], [1, 1], [-1, 1]]) P.put(cyl(.04, .05, 1.3, 6), '#6f4a2c', M4(x * w * .36, .65, z * d * .3)); P.put(box(w * .82, .06, d * .72), '#7a6a4e', M4(0, 1.32, 0, 0, .12)); P.put(box(w * .5, .08, .4), '#8a6038', M4(0, .5, 0)); for (const k of [-1, 1]) P.put(box(.06, .5, .34), '#6f4a2c', M4(k * w * .22, .25, 0)); P.put(cyl(.12, .12, .05, 10), '#8f9aa6', M4(w * .12, .58, 0, 0, Math.PI / 2)); crates(P, -w * .3, d * .32, 1); },
  lumber: (P, w, d) => { logPile(P, -w * .18, d * .1, 3); logPile(P, w * .22, -d * .15, 2); P.put(cyl(.2, .22, .3, 10), '#8a6038', M4(w * .3, .15, d * .3)); P.put(cyl(.02, .02, .5, 4), '#5a3b23', M4(w * .3, .45, d * .3, 0, 0, .4)); for (const [x, z] of [[-1, -1], [1, -1]]) P.put(cyl(.04, .05, 1.1, 6), '#6f4a2c', M4(x * w * .4, .55, z * d * .32)); P.put(box(w * .9, .05, .6), '#7a5a3a', M4(0, 1.1, -d * .28, 0, -.2)); },
  quarry: (P, w, d) => { rockPile(P, -w * .15, -d * .05, 6, 1.4); rockPile(P, w * .25, d * .2, 3, 1); P.put(box(.5, .22, .34), '#6f4a2c', M4(w * .3, .2, -d * .25)); for (const k of [-1, 1]) P.put(cyl(.1, .1, .04, 10), '#3a3a3a', M4(w * .3 + k * .18, .1, -d * .25 + .2, 0, Math.PI / 2)); P.put(new THREE.DodecahedronGeometry(.4, 0).scale(1.6, .4, 1.2), '#6a6358', M4(0, .02, 0)); },
  house: (P, w, d) => cabin(P, w * .82, d * .78, '#b5532e', { chimney: true }),
  bonfire: (P, w, d) => {   // V3D.13: stone ring and a log pyre (the flames are fire FX, lit at night)
    for (let i = 0; i < 9; i++) { const a = i / 9 * Math.PI * 2; P.put(new THREE.DodecahedronGeometry(.13, 0), i % 2 ? '#8c8478' : '#7a7368', M4(Math.cos(a) * .42, .08, Math.sin(a) * .42, a)); }
    for (let i = 0; i < 4; i++) { const a = i / 4 * Math.PI + .3; P.put(cyl(.06, .07, .62, 6), i % 2 ? '#6f4a2c' : '#5a3b23', M4(Math.cos(a) * .05, .2, Math.sin(a) * .05, a, 0, .9)); }
    P.put(new THREE.CircleGeometry(.36, 12).rotateX(-Math.PI / 2), '#3a2a20', M4(0, .02, 0)); },
  inn: (P, w, d) => { cabin(P, w * .84, d * .74, '#3f6e8a', { h: 1.85, chimney: true, sign: '#e8c36a', windows: [w * .02, w * .2, w * .34] });   // V3D.12: everyone's beds
    for (const wx of [-w * .28, w * .02, w * .3]) { P.put(box(.36, .3, .06), '#3b2a1a', M4(wx, 1.45, d * .37 + .08)); P.win(box(.26, .2, .04), M4(wx, 1.45, d * .37 + .105)); }
    P.put(box(.7, .08, .22), '#7b5232', M4(w * .25, .28, d * .37 + .38)); for (const k of [-1, 1]) P.put(box(.06, .26, .2), '#6f4a2c', M4(w * .25 + k * .3, .13, d * .37 + .38)); },
  water: (P, w, d) => { for (const [x, z] of [[-1, -1], [1, -1], [1, 1], [-1, 1]]) P.put(cyl(.05, .06, 1.1, 6), '#6f4a2c', M4(x * w * .25, .55, z * d * .25)); P.put(box(w * .6, .08, d * .6), '#7d5534', M4(0, 1.1, 0)); P.put(cyl(.38, .38, .7, 12), '#5d7a8c', M4(0, 1.5, 0)); P.put(new THREE.ConeGeometry(.5, .3, 12, 1, true), '#8f9aa6', M4(0, 2.0, 0, 0, Math.PI)); P.put(cyl(.04, .04, .9, 6), '#6f6a62', M4(.3, .5, .3)); },
  well: (P, w, d) => { P.put(cyl(.42, .46, .5, 12), '#8f8a80', M4(0, .25, 0)); P.put(cyl(.32, .32, .52, 12), '#2a3a44', M4(0, .26, 0)); for (const k of [-1, 1]) P.put(box(.08, 1.2, .08), '#6f4a2c', M4(k * .42, .85, 0)); P.put(box(1.1, .07, .07), '#6f4a2c', M4(0, 1.42, 0)); P.put(new THREE.ConeGeometry(.75, .45, 4), '#8a4a2a', M4(0, 1.7, 0, Math.PI / 4)); P.put(cyl(.09, .07, .16, 8), '#7a5232', M4(.1, .9, 0)); },
  farm: (P, w, d) => { beds(P, w * .9, d * .9, 2); },
  field: (P, w, d) => { beds(P, w * .86, d * .86, 4); fenceRing(P, w * .96, d * .96, .5); P.put(box(.06, 1.1, .06), '#6f4a2c', M4(w * .3, .55, -d * .3)); P.put(box(.6, .06, .06), '#6f4a2c', M4(w * .3, .85, -d * .3)); P.put(new THREE.IcosahedronGeometry(.12, 0), '#d9b45a', M4(w * .3, 1.18, -d * .3)); },
  medic: (P, w, d) => {   /* 3D.41 Medical Tent (1x1), toon parts: white canvas field tent with red crosses, a cot, a supply crate and an IV stand */
    const tw = w * .74, td = d * .62, H = 1.0, gz = -d * .06; P.put(box(w * .86, .04, d * .82), '#8f8a7e', M4(0, .02, 0));   // canvas ground sheet
    { const P2 = { put: (g, c, m) => P.put(g, c, new THREE.Matrix4().makeTranslation(0, 0, gz).multiply(m)) }; tentG(P2, tw, td, '#ece7da', { h: H, col2: '#d8d1c0' }); }
    const fz = gz + td / 2 + .012; P.put(box(.26, .07, .02), '#c8352c', M4(0, H * .66, fz)); P.put(box(.07, .26, .02), '#c8352c', M4(0, H * .66, fz));   // cross over the door
    for (const k of [-1, 1]) { const ang = Math.atan2(H, tw / 2); P.put(box(.22, .02, .06), '#c8352c', M4(k * tw * .25, H * .52, gz, 0, 0, -k * ang)); P.put(box(.06, .02, .22), '#c8352c', M4(k * tw * .25, H * .52, gz, 0, 0, -k * ang)); }   // crosses on both roof sides
    P.put(cyl(.025, .025, 1.5, 6), '#6f4a2c', M4(-w * .38, .75, -d * .3)); P.put(box(.34, .22, .02), '#f4f1e8', M4(-w * .38 + .18, 1.36, -d * .3)); P.put(box(.16, .05, .025), '#c8352c', M4(-w * .38 + .18, 1.36, -d * .3)); P.put(box(.05, .16, .025), '#c8352c', M4(-w * .38 + .18, 1.36, -d * .3));   // red-cross flag
    const cx = w * .3, cz = d * .3; P.put(box(.3, .05, .62), '#d9d4c6', M4(cx, .26, cz)); P.put(box(.26, .04, .14), '#f4f1e8', M4(cx, .3, cz - .22)); for (const [x, z] of [[-1, -1], [1, -1], [1, 1], [-1, 1]]) P.put(box(.03, .24, .03), '#5a5650', M4(cx + x * .13, .12, cz + z * .28));   // cot with a pillow
    P.put(box(.3, .24, .24), '#f2efe6', M4(-w * .3, .12, d * .3)); P.put(box(.16, .05, .01), '#c8352c', M4(-w * .3, .14, d * .3 + .125)); P.put(box(.05, .16, .01), '#c8352c', M4(-w * .3, .14, d * .3 + .125));   // supply crate
    P.put(cyl(.012, .012, .9, 5), '#9aa0a6', M4(cx + .26, .45, cz - .3)); P.put(box(.12, .02, .02), '#9aa0a6', M4(cx + .26, .9, cz - .3)); P.put(box(.07, .12, .04), '#bfe3f2', M4(cx + .3, .8, cz - .3));   // IV stand
  },
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
function buildingKey(b) { return [b.type, b.x, b.y, b.w, b.h, (b.rot | 0) & 3, b.burnt ? 1 : 0, b.wrecked ? 1 : 0].join(','); }
function syncDoors() {   /* 3D.28: the game's door point (where survivors enter) follows the door drawn on each 3D building */
  const def = (P2, w2, d2) => cabin(P2, w2 * .8, d2 * .75, '#8a4a2a', {});
  for (const [k, D] of Object.entries(G.DEFS)) {
    if (!D || D.door || glbB[k]) continue; const f = BUILD[k] || def, P = new Parts();
    try { f(P, D.w * T, D.h * T); } catch (e) { continue; }
    if (P.doorX !== undefined) D.door = [D.w / 2 + P.doorX / T, D.h - .35];
  }
}
function makeBuilding(b) {
  const g = new THREE.Group(), odd = (b.rot | 0) & 1, w = (odd ? b.h : b.w) * T, d = (odd ? b.w : b.h) * T;
  if (false && b.type === 'medic' && tentScene) {   /* 3D.41: the old Hunyuan tent is retired; the Medical Tent is built from toon parts */
    const t = tentScene.clone(); const s = Math.min(w / 2.2, d / 2.4) * .95; t.scale.setScalar(s); g.add(t);
  } else if (glbB[b.type]) {
    const m = glbB[b.type], t = m.scene.clone(); t.scale.setScalar(Math.min(w / m.sx, d / m.sz) * .95); g.add(t);
  } else {
    const P = new Parts(); (BUILD[b.type] || ((P2, w2, d2) => cabin(P2, w2 * .8, d2 * .75, '#8a4a2a', {})))(P, w, d); P.build(g, .028);
  }
  if (b.burnt) g.traverse((o) => { if (o.isMesh && !o.userData.hull && o.material.color) { o.material = o.material.clone(); o.material.color.multiplyScalar(b.wrecked ? .55 : .35); } });
  g.position.set((b.x + b.w / 2) * T, 0, (b.y + b.h / 2) * T); g.rotation.y = ((b.rot | 0) & 3) * Math.PI / 2;   // V3D.15: four entrance directions
  return g;
}
function syncBuildings() {
  let changed = false; const seen = new Set();
  for (const b of G.world.buildings) {
    seen.add(b); const k = buildingKey(b), cur = bGroups.get(b);
    if (cur && cur.key === k) continue;
    if (cur) { scene.remove(cur.g); if (cur.lit) scene.remove(cur.lit); }
    const g = makeBuilding(b); scene.add(g); let lit = null; try { if (!b.burnt) { lit = doorLight(b); scene.add(lit); } } catch (e) { lit = null; }
    bGroups.set(b, { g, key: k, lit }); changed = true;
  }
  for (const [b, v] of bGroups) if (!seen.has(b)) { scene.remove(v.g); if (v.lit) scene.remove(v.lit); bGroups.delete(b); changed = true; }
  for (const [b, v] of bGroups) { const bx = (b.x + b.w / 2) * T, bz = (b.y + b.h / 2) * T; if (b.hitT > 0) { b.hitT--; v.g.position.set(bx + Math.sin(b.hitT * 2.3) * .06 * b.hitT / 12, 0, bz + Math.cos(b.hitT * 1.7) * .04 * b.hitT / 12); } else if (v.g.position.x !== bx) v.g.position.set(bx, 0, bz); }   // V3D.17: a hit building shudders
  return changed;
}

// ---------------------------------------------------------------- construction sites (V3D.12): the building rises out of
// the ground inside wooden scaffolding on a dug plot with a plank stack; dust puffs drift up while work goes on
const siteMeshes = new Map();
const dustT = lightTex(false), dustMat = new THREE.SpriteMaterial({ map: dustT, color: 0xd8c4a0, transparent: true, depthWrite: false, opacity: .6 });
function makeSite(st, upg) {
  const W = st.w * T, D = st.h * T, cx = (st.x + st.w / 2) * T, cz = (st.y + st.h / 2) * T, g = new THREE.Group(), wood = toon('#b98a56'), dark = toon('#8a5f36');
  const plot = new THREE.Mesh(new THREE.PlaneGeometry(W + .3, D + .3).rotateX(-Math.PI / 2), toon('#9c7444')); plot.position.y = .015; plot.receiveShadow = true; g.add(plot);
  const pole = new THREE.CylinderGeometry(.045, .05, 2.3, 6).translate(0, 1.15, 0), H = 2.3;
  for (const [sx, sz] of [[-1, -1], [1, -1], [-1, 1], [1, 1]]) { const m = new THREE.Mesh(pole, wood); m.position.set(sx * (W / 2 - .05), 0, sz * (D / 2 - .05)); m.castShadow = true; g.add(m); addHull(m, .018); }
  for (const y of [.85, 1.7]) for (const [len, rx, px, pz] of [[W, 0, 0, -D / 2 + .05], [W, 0, 0, D / 2 - .05], [D, 1, -W / 2 + .05, 0], [D, 1, W / 2 - .05, 0]]) {
    const b = new THREE.Mesh(new THREE.BoxGeometry(len, .07, .09), y > 1 ? wood : dark); b.position.set(px, y, pz); if (rx) b.rotation.y = Math.PI / 2; b.castShadow = true; g.add(b); addHull(b, .015); }
  const diag = new THREE.Mesh(new THREE.BoxGeometry(Math.hypot(W, .85), .05, .06), dark); diag.position.set(0, .43, D / 2 - .05); diag.rotation.z = Math.atan2(.85, W); g.add(diag);
  for (let i = 0; i < 3; i++) { const pl = new THREE.Mesh(new THREE.BoxGeometry(.9, .07, .22), i % 2 ? dark : wood); pl.position.set(W / 2 + .35, .04 + i * .075, D / 2 - .2 - i * .03); pl.rotation.y = .2 * i; pl.castShadow = true; g.add(pl); addHull(pl, .012); }
  g.position.set(cx, 0, cz); scene.add(g);
  if (upg) { plot.visible = false; return { g, model: null, puffs: [], next: 0, upg: true }; }   // V3D.23: an upgrade gets scaffolding round the working building
  const model = makeBuilding(st); model.scale.y = .05; scene.add(model);
  return { g, model, puffs: [], next: 0 };
}
const confetti = [], CONF_COL = [0xffd45c, 0xff8a5c, 0x9be2ff, 0xffb0d0, 0x8fe07a, 0xfff6c2];
function syncSites(dt) {
  const seen = new Set(), ready = G.jobReady || (() => true);
  const jobs = [...(G.S.sites || []).map((st) => [st, st, false]), ...G.world.buildings.filter((b) => b.upg).map((b) => [b.upg, b, true])];
  for (const [j, at, upg] of jobs) {
    seen.add(j); let e = siteMeshes.get(j); if (!e) { e = makeSite(at, upg); siteMeshes.set(j, e); }
    const on = ready(j), k = on ? 1 - j.cons / j.dur : 0; if (e.model) e.model.scale.y = .05 + .95 * k;
    e.next -= dt; if (on && e.next <= 0) { e.next = .35 + Math.random() * .4; const sp = new THREE.Sprite(dustMat.clone()); sp.position.set(e.g.position.x + (Math.random() - .5) * at.w * T, .2, e.g.position.z + (Math.random() - .5) * at.h * T); sp.scale.setScalar(.4); scene.add(sp); e.puffs.push({ sp, t: 0 }); }
    for (let i = e.puffs.length - 1; i >= 0; i--) { const q = e.puffs[i]; q.t += dt; q.sp.position.y += dt * .5; q.sp.scale.setScalar(.4 + q.t * .7); q.sp.material.opacity = .55 * Math.max(0, 1 - q.t / 1.4); if (q.t > 1.4) { scene.remove(q.sp); q.sp.material.dispose(); e.puffs.splice(i, 1); } }
  }
  for (const [st, e] of siteMeshes) if (!seen.has(st)) { scene.remove(e.g); if (e.model) scene.remove(e.model); for (const q of e.puffs) scene.remove(q.sp); siteMeshes.delete(st); }
  // V3D.23 completion confetti: paper bits shoot up and flutter down, plus a ring of dust
  const B = window.ZH_BURSTS; while (B && B.length) { const b = B.shift(), x = b.x * T, z = b.y * T;
    for (let i = 0; i < 46; i++) { const m = new THREE.Mesh(new THREE.PlaneGeometry(.11, .07), new THREE.MeshBasicMaterial({ color: CONF_COL[i % CONF_COL.length], side: THREE.DoubleSide, transparent: true })); m.position.set(x, 1.2, z); scene.add(m);
      const a = Math.random() * 6.283, sp = 1.2 + Math.random() * 2.2; confetti.push({ m, v: new THREE.Vector3(Math.cos(a) * sp, 4 + Math.random() * 3, Math.sin(a) * sp), r: new THREE.Vector3(Math.random() * 9, Math.random() * 9, 0), t: 0 }); }
    for (let i = 0; i < 10; i++) { const sp = new THREE.Sprite(dustMat.clone()); const a = i / 10 * 6.283; sp.position.set(x + Math.cos(a) * .9, .25, z + Math.sin(a) * .9); sp.scale.setScalar(.7); scene.add(sp); confetti.push({ m: sp, v: new THREE.Vector3(Math.cos(a) * 1.2, .5, Math.sin(a) * 1.2), dust: true, t: 0 }); } }
  for (let i = confetti.length - 1; i >= 0; i--) { const c = confetti[i]; c.t += dt;
    if (c.dust) { c.m.position.addScaledVector(c.v, dt); c.m.scale.setScalar(.7 + c.t * 1.2); c.m.material.opacity = .6 * Math.max(0, 1 - c.t / 1.2); }
    else { c.v.y -= 9 * dt; c.v.multiplyScalar(c.v.y < 0 ? .94 : 1); if (c.v.y < -1.6) c.v.y = -1.6; c.m.position.addScaledVector(c.v, dt); c.m.rotation.x += c.r.x * dt; c.m.rotation.y += c.r.y * dt; if (c.m.position.y < .03) { c.m.position.y = .03; c.v.set(0, 0, 0); } c.m.material.opacity = Math.max(0, Math.min(1, (3.2 - c.t) * 1.5)); }
    if (c.t > (c.dust ? 1.2 : 3.2)) { scene.remove(c.m); c.m.material.dispose(); if (c.m.geometry && !c.dust) c.m.geometry.dispose(); confetti.splice(i, 1); } }
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
const JOB_SHIRT = { Mechanic: '#3f5f7f', Civilian: null, Farmer: '#6f8a3a', Medic: '#8fc4d8', Engineer: '#d9822e', Cook: '#f2eadb', Scavenger: '#8a6a48', Guard: '#5d6b44', 'Police Officer': '#2f4a7a', SWAT: '#2a2f36', Raider: '#7a2e28', Trader: '#6b4f8c' };
const JOB_PANTS = { Guard: '#4a5236', 'Police Officer': '#1f2a44', SWAT: '#1d2126', Raider: '#3a2a22', Cook: '#3a3a3a', Trader: '#3b3346' };
const ZTINT = { walker: [.62, .86, .55], runner: [.75, .8, .5], crawler: [.6, .7, .55], bloated: [.7, .85, .45], spitter: [.8, .9, .4], brute: [.55, .7, .5], boss: [.7, .5, .8] };
const ZSC = { bloated: 1.18, brute: 1.32, crawler: 1, boss: 1.6, alpha: 1.75, screamer: 1, riot: 1, dog: 1.15 };
function toonScene(root, map, clean = false) {   // clean (the #v2 models): mipmapped texture and no hull outline (it poked through the AI mesh as dark specks)
  root.traverse((o) => {
    if (!o.isMesh || o.userData.hull) return;
    const m = o.material; const tex = map || m.map || null;
    if (tex) { tex.colorSpace = THREE.SRGBColorSpace; if (clean) { tex.generateMipmaps = true; tex.minFilter = THREE.LinearMipmapLinearFilter; tex.anisotropy = 4; tex.needsUpdate = true; } else { tex.generateMipmaps = false; tex.minFilter = THREE.LinearFilter; } }
    o.material = new THREE.MeshToonMaterial({ color: m.color, map: tex, gradientMap: grad });
    o.castShadow = false; o.receiveShadow = true;
    if (o.isSkinnedMesh) { o.geometry.boundingSphere = new THREE.Sphere(new THREE.Vector3(0, .6, 0), 1.2); }
  });
  if (clean) return;
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
// The faces ship as face-only overlays (<model>_face_<expr>.png, transparent elsewhere) laid over the outfit's texture
// in the shader, so every job shares one small texture per expression (full recoloured copies ran phones out of memory).
const FACE_OVL = {};       // expr -> THREE.Texture
function imgTex(img) { const t = new THREE.Texture(img); t.flipY = false; t.colorSpace = THREE.SRGBColorSpace; t.generateMipmaps = false; t.minFilter = THREE.LinearFilter; t.needsUpdate = true; return t; }
const jobTex = {}, jobMats = {};
const charMats = [];   // characters glow faintly from their own texture at night (lit by their lamps), so they don't turn to silhouettes
function nightLit(m, k) { m.emissiveMap = m.map; m.emissive = new THREE.Color(0, 0, 0); m.userData.nightGlow = k; charMats.push(m); if (glowNow > 0) m.emissive.setScalar(k * glowNow); return m; }
function jobBase(job) {
  if (jobTex[job]) return jobTex[job]; const img = MALE.bodyImage;
  return (jobTex[job] = img && (JOB_SHIRT[job] || JOB_PANTS[job]) ? recolor(img, JOB_SHIRT[job], JOB_PANTS[job]) : MALE.body.material.map);
}
// V3D.15 looks: skin tone and hair colour recoloured in the shader (the texture stays shared). Skin and hair are found by
// colour: skin by its chromaticity, hair as dark brown (the darker eyes are left alone). Multipliers keep the shading.
const lin = (h) => new THREE.Color(h);   // THREE.Color stores linear values
const SKIN_REF = lin('#fac39f'), HAIR_REF = lin('#34251f');
const SKINS = ['#fac9a8', '#e0ac82', '#c68c64', '#966446', '#69462f'], HAIRS = ['#34251f', '#1c1818', '#78341e', '#c4964f', '#82807c'];
const mulOf = (h, ref) => { const c = lin(h); return new THREE.Vector3(c.r / ref.r, c.g / ref.g, c.b / ref.b); };
const SKIN_MUL = SKINS.map((h) => mulOf(h, SKIN_REF)), HAIR_MUL = HAIRS.map((h) => mulOf(h, HAIR_REF));
const SN = (() => { const t = SKIN_REF.r + SKIN_REF.g + SKIN_REF.b; return [SKIN_REF.r / t, SKIN_REF.g / t, SKIN_REF.b / t].map((v) => v.toFixed(4)).join(', '); })();
const LOOK_GLSL = `{ vec3 c = diffuseColor.rgb; vec3 n = c / max(1e-4, c.r + c.g + c.b); float lum = dot(c, vec3(.3, .59, .11)); vec3 sn = vec3(${SN});
    float isSkin = (1. - smoothstep(.022, .04, distance(n, sn))) * smoothstep(.12, .2, lum);
    float isHair = (1. - smoothstep(.06, .11, distance(n, sn))) * smoothstep(.011, .016, lum) * (1. - smoothstep(.07, .1, lum));
    diffuseColor.rgb = mix(c, min(c * skinMul, vec3(1.)), isSkin); diffuseColor.rgb = mix(diffuseColor.rgb, min(c * hairMul, vec3(1.)), isHair); }`;
const CHAR_V2 = (() => {   // #v2 turns the new survivor on and remembers it; #v1 turns it off
  /* 3D.27: the simple 1:6 survivor is now the default for everyone (it used to need #v2 on each device, so a fresh browser showed the old chibi one). #v1 or ?char=v1 brings the old one back for testing. */
  try { if (location.hash === '#v1') localStorage.setItem('zh_char', 'v1'); if (location.hash === '#v2') localStorage.removeItem('zh_char'); } catch (e) {}
  let ls = false; try { ls = localStorage.getItem('zh_char') === 'v1'; } catch (e) {}
  return !(new URLSearchParams(location.search).get('char') === 'v1' || location.hash === '#v1' || ls); })();   // V3D.19 test: the new simple 1:6 survivor (Hunyuan) for everyone
let v2Mat = null; const v2MatF = { m: null };
let FEMALE3D = null;   // V3D.19 test: the female survivor model (only with #v2)
function isFemale(s) { try { return !!(window.ZHChars && ZHChars.look(s).sex === 'f'); } catch (e) { return false; } }
function newPerson(s) {   // a survivor's 3D actor: with #v2 women get the female model, each model keeps its own texture
  if (MALE && MALE.v2 && FEMALE3D && isFemale(s)) { const m = (v2MatF.m ||= nightLit(new THREE.MeshToonMaterial({ map: FEMALE3D.body.material.map, gradientMap: grad }), .32)); return new Actor(FEMALE3D, m, false, () => m); }
  return new Actor(MALE, jobMaterial(s.job, 'neutral', lookOf(s)), false, (e) => jobMaterial(s.job, e, lookOf(s)));
}
function jobMaterial(job, expr = 'neutral', look = null) {
  if (MALE && MALE.v2) return (v2Mat ||= nightLit(new THREE.MeshToonMaterial({ map: MALE.body.material.map, gradientMap: grad }), .32));
  if (!FACE_OVL[expr]) expr = 'neutral';
  const sk = look ? look.sk % SKINS.length : 0, hr = look ? look.hr % HAIRS.length : 0, key = job + '|' + expr + '|' + sk + hr; if (jobMats[key]) return jobMats[key];
  const m = new THREE.MeshToonMaterial({ map: jobBase(job), gradientMap: grad }), ovl = expr !== 'neutral' && FACE_OVL[expr];
  m.onBeforeCompile = (sh) => { sh.uniforms.skinMul = { value: SKIN_MUL[sk] }; sh.uniforms.hairMul = { value: HAIR_MUL[hr] }; if (ovl) sh.uniforms.faceMap = { value: ovl };
    sh.fragmentShader = 'uniform vec3 skinMul; uniform vec3 hairMul;\n' + (ovl ? 'uniform sampler2D faceMap;\n' : '') + sh.fragmentShader.replace('#include <map_fragment>', '#include <map_fragment>\n' + LOOK_GLSL + (ovl ? '\n{ vec4 fo = texture2D(faceMap, vMapUv); diffuseColor.rgb = mix(diffuseColor.rgb, fo.rgb, fo.a); }' : '')); };
  m.customProgramCacheKey = () => (ovl ? 'face+look' : 'look');
  return (jobMats[key] = nightLit(m, .32));
}
function lookOf(s) { if (!s.look3) { const r = Math.imul(s.id || 1, 2654435761) >>> 0; s.look3 = { sk: r % SKINS.length, hr: (r >>> 8) % HAIRS.length }; } return s.look3; }
// zombie skins (tools/art/b3d/zombie_tex.py): grey-green skin, milky eyes, four dirty bloody outfits. Each zombie
// picks one at random; a few types keep a light tint on top so they still read apart.
const ZSKIN_TINT = { spitter: [.88, 1, .72], bloated: [.95, 1, .85], boss: [.85, .7, .95], brute: [.9, .9, .9], screamer: [1, .96, 1], burnt: [.42, .34, .3], riot: [.82, .86, .95], alpha: [1, .58, .52] };   /* 3D.32 new types */
const ZALIAS = { alpha: 'brute', screamer: 'walker', burnt: 'walker' };
const zMats = {};
// V3D.20 (#v2): zombies wear the new male / female bodies with zombie skins (tools/art/b3d/zombie_tex_v2.py)
function v2Tex(img) { const t = imgTex(img); t.generateMipmaps = true; t.minFilter = THREE.LinearMipmapLinearFilter; return t; }
// V3D.21: each zombie type gets its own Hunyuan model when there is one (ZMODEL); the rest wear reskinned survivor bodies
const ZMODEL = { walker: { url: 'assets/characters/ai3d_v2/zombie_walker.glb', stride: { zombie_walk: .525, zombie_run: 1.197 } },
  runner: { url: 'assets/characters/ai3d_v2/zombie_runner.glb', stride: { zombie_walk: .538, zombie_run: 1.273 } },
  brute: { url: 'assets/characters/ai3d_v2/zombie_brute.glb', stride: { zombie_walk: .540, zombie_run: 1.264 } },
  bloated: { url: 'assets/characters/ai3d_v2/zombie_bloated.glb', stride: { bloated_walk: .395 } },
  crawler: { url: 'assets/characters/ai3d_v2/zombie_crawler.glb', stride: { crawl: .24 }, crawl: true },
  spitter: { url: 'assets/characters/ai3d_v2/zombie_spitter.glb', stride: { zombie_walk: .53, zombie_run: 1.2 } },
  sporehead: { url: 'assets/characters/ai3d_v2/zombie_sporehead.glb', stride: { zombie_walk: .53, zombie_run: 1.2 } },
  screamer: { url: 'assets/characters/ai3d_v2/zombie_screamer.glb', stride: { zombie_walk: .53, zombie_run: 1.2 } },
  riot: { url: 'assets/characters/ai3d_v2/zombie_riot.glb', stride: { zombie_walk: .53, zombie_run: 1.2 } } }, ZSRC = {};   /* 3D.39 the user's riot zombie (helmet, pads and vest are part of the model) */   /* 3D.38 the user's screamer */   /* 3D.37 the user's sporehead */   /* 3D.35 the user's spitter */   /* 3D.34 the user's legless crawler: lies face down, pulls itself on its arms */
function zombieOwn(type) {
  const src = ZSRC[type] || ZSRC[ZALIAS[type]]; if (!src) return null;
  const t = (type === 'spitter' || type === 'sporehead' || type === 'screamer' || type === 'riot' ? null : ZSKIN_TINT[type]) || [1, 1, 1], key = 'own|' + type;   /* 3D.35: the spitter's own model keeps its colours */
  const m = zMats[key] ||= nightLit(new THREE.MeshToonMaterial({ map: src.body.material.map, color: new THREE.Color(...t), gradientMap: grad }), .2);
  return new Actor(src, m, true);
}
const OWN_SHARE = { walker: .7 };
function zombieV2(type, female, v, noOwn = false) {
  const own = !noOwn && Math.random() < (OWN_SHARE[type] ?? 1) && zombieOwn(type); if (own) return own;   // 3D.33: runners, brutes and bloated always wear their own model; walkers 70% (the rest a reskinned survivor for variety)
  const src = female ? FEMALE3D : MALE, tx = src && src.zTex2; if (!tx || !tx.length) return null;
  const key = 'v2|' + type + '|' + (female ? 'f' : 'm') + v, t = ZSKIN_TINT[type] || [1, 1, 1];
  const m = zMats[key] ||= nightLit(new THREE.MeshToonMaterial({ map: tx[v % tx.length], color: new THREE.Color(...t), gradientMap: grad }), .2);
  return new Actor(src, m, true);
}
function zombieMaterial(type, v = 0) {
  const key = type + '|' + v; if (zMats[key]) return zMats[key];
  if (LITE.zTex && LITE.zTex.length) {
    const t = ZSKIN_TINT[type] || [1, 1, 1];
    return (zMats[key] = nightLit(new THREE.MeshToonMaterial({ map: LITE.zTex[v % LITE.zTex.length], color: new THREE.Color(...t), gradientMap: grad }), .2));
  }
  const t = ZTINT[type] || ZTINT.walker; return (zMats[key] = new THREE.MeshToonMaterial({ map: LITE.zombieMap || LITE.body.material.map, color: new THREE.Color(...t), gradientMap: grad }));
}
const WMODEL = { pipe: 'bat', bat: 'bat', crowbar: 'bat', nailbat: 'bat', sledge: 'bat', spear: 'bat', knife: 'axe', machete: 'axe', axe: 'axe', katana: 'axe',
  pistol: 'pistol', revolver: 'pistol', shotgun: 'rifle', rifle: 'rifle', bow: 'rifle', crossbow: 'rifle', smg: 'ak47', assault: 'ak47',
  golf: 'bat', shovel: 'bat', roadsign: 'bat', spiked: 'bat', hatchet: 'axe', cleaver: 'axe', magnum: 'pistol' };   // 3D.28 new gear
const WCLASS = { bat: 'melee', axe: 'melee', pistol: 'pistol', rifle: 'gun', ak47: 'gun' };
const STAND_OF = { walk: 'idle', walk_f: 'idle', run: 'idle', carry_walk: 'carry_idle', melee_hold_walk: 'melee_hold_idle', gun_hold_walk: 'gun_hold_idle', zombie_walk: 'idle', zombie_run: 'idle', bloated_walk: 'idle', crawl: 'crawl_idle' };
class Actor {
  constructor(src, mat, lite, faces = null) {
    this.o = SkeletonUtils.clone(src.scene); this.o.userData.actor = true; this.src = src; scene.add(this.o);
    this.w = {}; this.arm = []; this.skin = []; this.faces = faces; this.expr = 'neutral';   // faces: expr -> material (people only)
    this.o.traverse((n) => { if (n.name.startsWith('weapon_')) this.w[n.name.slice(7)] = n; if (n.name.startsWith('armor_')) this.arm.push(n); if (n.isSkinnedMesh && !n.userData.hull) { this.skin.push(n); if (mat) n.material = mat; } });
    this.mixer = new THREE.AnimationMixer(this.o); this.acts = {}; for (const c of src.animations) this.acts[c.name] = this.mixer.clipAction(c);
    this.cur = null; this.name = ''; this.weapon = undefined; this.armor = undefined; this.yaw = 0; this.last = null; this.acc = 0; this.lite = lite; this.spd = 0;
    this.sh = new THREE.Mesh(blobG, blobM); scene.add(this.sh);
    if (faces) { this.beam = new THREE.Mesh(beamG, beamMat); this.beam.renderOrder = 2; this.halo = new THREE.Mesh(poolG, haloMat); this.halo.scale.set(1.7, 1, 1.7); this.halo.renderOrder = 2; this.beam.add(this.halo); this.halo.position.z = -.25; scene.add(this.beam); }   // survivors carry a flashlight at night
  }
  play(name, once = false, restart = false) {
    if (this.src && this.src.crawl && name === 'collapse') name = 'crawl_die';   /* 3D.34 */
    { const st0 = STAND_OF[name]; if (st0 && this.last && this.acts[st0] && !this.isMov() && this.spd < (this.name === name ? .05 : .1)) name = st0; }   /* 3D.28: blocked or waiting = standing, never walking on the spot (a little hysteresis so it doesn't flicker) */
    if (!this.acts[name]) name = this.acts['idle'] ? 'idle' : Object.keys(this.acts)[0];
    if (this.name === name && !restart) return;
    const n = this.acts[name];
    if (this.cur && this.cur !== n) this.cur.fadeOut(.12);
    n.reset(); n.setLoop(once ? THREE.LoopOnce : THREE.LoopRepeat); n.clampWhenFinished = true; n.fadeIn(this.cur && this.cur !== n ? .12 : 0).play();
    this.cur = n; this.name = name;
    this.setExpr(EXPR_OF_CLIP[name] || this.mood || 'neutral');
  }
  setExpr(e) { if (this.faces && e !== this.expr) { this.expr = e; const m = this.faces(e); for (const k of this.skin) k.material = m; } }
  setMood(e) { this.mood = e; if (!EXPR_OF_CLIP[this.name]) this.setExpr(e || 'neutral'); }   // V3D.14: the face follows the survivor's emote between moves
  setWeapon(kind) { if (kind === this.weapon) return; this.weapon = kind; for (const k in this.w) this.w[k].visible = k === kind; }
  setArmor(on) { if (on === this.armor) return; this.armor = on; for (const a of this.arm) a.visible = on; }
  place(wx, wy, faceTo, dt, scale = 1) {
    const x = wx * T, z = wy * T;
    let dx, dz; const mv = this.last ? Math.hypot(x - this.last.x, z - this.last.z) / Math.max(dt, 1e-3) / scale : 0;   /* 3D.57 audit: a body that is really moving faces where it goes, even with a target (no sideways or backwards walking) */
    if (faceTo && !(mv > .3 && this.spd > .25)) { dx = faceTo.x * T - x; dz = faceTo.y * T - z; } else if (this.last) { dx = x - this.last.x; dz = z - this.last.z; }
    if (dx !== undefined && Math.abs(dx) + Math.abs(dz) > 1e-4) { const want = Math.atan2(dx, dz); let d = want - this.yaw; d = Math.atan2(Math.sin(d), Math.cos(d)); this.yaw += d * Math.min(1, dt * 12); }
    if (this.last && dt > 0) { const v = Math.min(8, Math.hypot(x - this.last.x, z - this.last.z) / dt / scale); this.spd += (v - this.spd) * Math.min(1, dt * 5); this.movT = v > .07 ? 0 : (this.movT || 0) + dt; }   /* 3D.57: slow drifts (.07+) walk too, never glide in the idle pose */   /* 3D.41 movT: time since the body last really moved (raw, no smoothing lag) */   // V3D.20 ground speed (model units / s) for stride matching
    const gy = groundH(x, z); this.o.position.set(x, gy, z); this.o.rotation.y = this.yaw; this.o.scale.setScalar(scale); this.last = { x, z };
    this.sh.position.set(x, gy + .02, z); this.sh.scale.setScalar(scale);
    if (this.beam) { this.beam.position.set(x + Math.sin(this.yaw) * .25, gy + .05, z + Math.cos(this.yaw) * .25); this.beam.rotation.y = this.yaw + Math.PI; this.beam.visible = this.o.visible && glowNow > .3; }
  }
  isMov() { return !!this.last && (this.movT || 0) < .25; }   /* 3D.41: moving right now, measured from the body itself */
  show(v) { if (!v) { this.spd = 0; this.last = null; this.movT = 9; } this.o.visible = v; this.sh.visible = v; if (this.beam) this.beam.visible = v && glowNow > .3; }
  dispose() { scene.remove(this.o); scene.remove(this.sh); if (this.beam) scene.remove(this.beam); }
}
// ---------------------------------------------------------------- job hats (V3D.12): simple toon shapes parented to the head
// bone, sized from the rig's head (bone at y .73, hair top 1.14, about .47 wide, centred slightly back)
const HATS_ON = false;
const HEAD = { x: .004, z: -.02, top: 1.14, r: .245 };
function hatFor(job) {
  const g = new THREE.Group(), M = (c) => toon(c), add = (geo, c, x, y, z, hull = .012) => { const m = new THREE.Mesh(geo, M(c)); m.position.set(x, y, z); m.castShadow = true; g.add(m); if (hull) addHull(m, hull); return m; };
  const dome = (r, sy) => new THREE.SphereGeometry(r, 18, 10, 0, Math.PI * 2, 0, Math.PI / 2).scale(1, sy, 1), cyl = (r1, r2, h) => new THREE.CylinderGeometry(r1, r2, h, 22);
  const T0 = HEAD.top;
  switch (job) {
    case 'Farmer': add(cyl(.37, .37, .018), '#e3c472', 0, T0 - .13, 0); add(cyl(.18, .205, .13), '#e8cc7c', 0, T0 - .06, 0); add(cyl(.207, .207, .035), '#8a5a2a', 0, T0 - .105, 0, 0); break;
    case 'Engineer': add(dome(.262, .82), '#f2b632', 0, T0 - .14, 0); add(cyl(.3, .3, .02), '#e8a822', 0, T0 - .14, .02); add(new THREE.BoxGeometry(.05, .2, .04).translate(0, .08, 0), '#ffd25a', 0, T0 - .14, .19, 0); break;
    case 'Cook': add(cyl(.235, .235, .1), '#f7f3ea', 0, T0 - .08, 0); add(new THREE.SphereGeometry(.24, 16, 12).scale(1, .75, 1), '#ffffff', 0, T0 + .07, 0); break;
    case 'Scavenger': add(dome(.258, .92), '#6b6a3a', 0, T0 - .15, 0); add(new THREE.TorusGeometry(.252, .03, 8, 24).rotateX(Math.PI / 2), '#5a5930', 0, T0 - .15, 0, 0); add(new THREE.SphereGeometry(.05, 8, 6), '#7d7c45', 0, T0 + .08, 0); break;
    case 'Guard': add(dome(.27, .85), '#5d6b44', 0, T0 - .15, 0); add(cyl(.29, .29, .025), '#4e5a39', 0, T0 - .15, 0); break;
    case 'Police Officer': add(cyl(.245, .225, .11), '#2f4a7a', 0, T0 - .07, 0); add(cyl(.255, .255, .03), '#1f2f50', 0, T0 - .12, 0, 0); add(new THREE.CylinderGeometry(.2, .2, .015, 18, 1, false, -Math.PI / 2, Math.PI).scale(1, 1, .7), '#141c30', 0, T0 - .13, .17, 0); add(new THREE.CircleGeometry(.035, 6), '#ffd45c', 0, T0 - .06, .245, 0); break;
    case 'SWAT': add(dome(.275, .9), '#2a2f36', 0, T0 - .155, 0); add(cyl(.285, .285, .03), '#20242a', 0, T0 - .155, 0); break;
    case 'Medic': add(new THREE.TorusGeometry(.243, .028, 8, 26).rotateX(Math.PI / 2), '#f7f7f2', 0, T0 - .17, 0, 0); { const c1 = add(new THREE.BoxGeometry(.07, .022, .02), '#d9443a', 0, T0 - .17, .27, 0), c2 = add(new THREE.BoxGeometry(.022, .07, .02), '#d9443a', 0, T0 - .17, .27, 0); } break;
    case 'Raider': add(new THREE.TorusGeometry(.243, .034, 8, 26).rotateX(Math.PI / 2), '#a8322a', 0, T0 - .16, 0, 0); add(new THREE.SphereGeometry(.05, 8, 6), '#8a2a22', 0, T0 - .16, -.26, 0); break;
    /* 3D.28 new hats */
    case 'Headlamp': add(new THREE.TorusGeometry(.25, .025, 8, 26).rotateX(Math.PI / 2), '#2b2b2b', 0, T0 - .17, 0, 0); add(new THREE.BoxGeometry(.11, .08, .06), '#3a3f45', 0, T0 - .17, .26); { const l = new THREE.Mesh(new THREE.CircleGeometry(.032, 14), new THREE.MeshBasicMaterial({ color: 0xfff2a8 })); l.position.set(0, T0 - .17, .292); g.add(l); } break;
    case 'GasMask': add(new THREE.SphereGeometry(.17, 16, 12).scale(1.1, .85, .7), '#3d4248', 0, T0 - .34, .17); for (const sx of [-1, 1]) { add(new THREE.TorusGeometry(.05, .014, 6, 16), '#22262b', sx * .085, T0 - .28, .275, 0); const l = new THREE.Mesh(new THREE.CircleGeometry(.045, 14), new THREE.MeshToonMaterial({ color: 0x9fd6e0, gradientMap: grad })); l.position.set(sx * .085, T0 - .28, .277); g.add(l); } add(cyl(.06, .07, .08).rotateX(Math.PI / 2), '#5c6670', 0, T0 - .41, .3); add(new THREE.TorusGeometry(.25, .02, 6, 26).rotateX(Math.PI / 2), '#22262b', 0, T0 - .27, 0, 0); break;
    case 'TactCap': add(dome(.255, .55), '#4b5540', 0, T0 - .12, 0); add(new THREE.CylinderGeometry(.2, .2, .015, 18, 1, false, -Math.PI / 2, Math.PI).scale(1, 1, .75), '#3b4432', 0, T0 - .12, .18, 0); add(new THREE.BoxGeometry(.07, .045, .01), '#c9b98a', 0, T0 - .05, .245, 0); break;
    case 'SwatHelm': add(dome(.285, .92), '#1e2228', 0, T0 - .16, 0); add(cyl(.295, .295, .03), '#15181c', 0, T0 - .16, 0); { const v = new THREE.Mesh(new THREE.CylinderGeometry(.29, .29, .17, 22, 1, true, -Math.PI / 2.6, Math.PI / 1.3), new THREE.MeshToonMaterial({ color: 0x8fb4c8, gradientMap: grad, transparent: true, opacity: .45, side: THREE.DoubleSide })); v.position.set(0, T0 - .25, .005); g.add(v); } break;
    default: return null;
  }
  g.position.set(HEAD.x, 0, HEAD.z); g.rotation.x = -.06; return g;
}
const HAT_SHAPE = { bandana: 'Raider', cap: 'Police Officer', beanie: 'Scavenger', straw: 'Farmer', hard: 'Engineer', bike: 'SWAT', football: 'SWAT', army: 'Guard', riot: 'SWAT', headlamp: 'Headlamp', gasmask: 'GasMask', tactcap: 'TactCap', swathelm: 'SwatHelm' };
const headFits = new Map();
function headFit(a) {   // 3D.28: measure this model's head (top of the hair, centre, width) so hats fit any rig, not just the old one
  if (headFits.has(a.src)) return headFits.get(a.src);
  let head = null; a.o.traverse((n) => { if (n.isBone && n.name === 'head') head = n; }); const m = a.skin[0]; if (!head || !m) return null;
  a.o.position.set(0, 0, 0); a.o.rotation.set(0, 0, 0); a.o.updateMatrixWorld(true); const hb = new THREE.Vector3(); head.getWorldPosition(hb);
  const v = new THREE.Vector3(), n = m.geometry.attributes.position.count; let top = -1e9, x0 = 1e9, x1 = -1e9, z0 = 1e9, z1 = -1e9;
  for (let i = 0; i < n; i++) { m.getVertexPosition(i, v); v.applyMatrix4(m.matrixWorld); if (v.y < hb.y + .02) continue; if (v.y > top) top = v.y; if (v.x < x0) x0 = v.x; if (v.x > x1) x1 = v.x; if (v.z < z0) z0 = v.z; if (v.z > z1) z1 = v.z; }
  if (top < -1e8) return null; const f = { x: (x0 + x1) / 2, z: (z0 + z1) / 2, top, r: Math.max(x1 - x0, z1 - z0) / 2, hb: hb.y, front: z1, hw: (x1 - x0) / 2 }; headFits.set(a.src, f); return f;
}
function addHat(a, job, equipped = false) {   // parent to the head bone, placed at the rest pose
  if (!HATS_ON && !equipped) { if (a.hat) { a.hat.parent && a.hat.parent.remove(a.hat); a.hat = null; } return; }   // V3D.16: no job hats; equipped hats (the Hat slot) do show
  if (a.hat) { a.hat.parent && a.hat.parent.remove(a.hat); a.hat = null; }
  const h0 = hatFor(job); if (!h0) return; let h = h0;
  if (MALE && MALE.v2) { const f = headFit(a); if (!f) return; const k = f.r / HEAD.r * 1.13; h = new THREE.Group(); h0.position.set(h0.position.x - HEAD.x, -HEAD.top, h0.position.z - HEAD.z); h.add(h0); h.scale.setScalar(k); h.position.set(f.x, f.top + .015 * k, f.z); }   /* 3D.28: refit the old hats to the new head */
  let head = null; a.o.traverse((n) => { if (n.isBone && n.name === 'head') head = n; }); if (!head) return;
  a.o.updateMatrixWorld(true); const inv = new THREE.Matrix4().copy(a.o.matrixWorld).invert(), m = new THREE.Matrix4().multiplyMatrices(inv, head.matrixWorld).invert();
  h.updateMatrix(); h.applyMatrix4(m); head.add(h); a.hat = h;
}
/* ---------------- 3D.28 gear looks: accessories as small toon pieces on the bones; clothing recolours the shirt ----------------
   Accessories: glasses, goggles, dog tags, lucky charm (neck), lifting gloves (hands), running shoes (feet), back brace (waist).
   Clothing: light pieces swap the shirt colour (shader hue window, so shading and folds stay); heavy armour adds the plate parts. */
const sliceFits = new Map();
function sliceFit(a, key, test) {   // extents of the skinned rest-pose vertices that pass test(v) (model space)
  const k = key + '|' + (a.src === FEMALE3D ? 'f' : 'm'); if (sliceFits.has(k)) return sliceFits.get(k); const m = a.skin[0]; if (!m) return null;
  a.o.updateMatrixWorld(true); const inv = new THREE.Matrix4().copy(a.o.matrixWorld).invert(), v = new THREE.Vector3(), n = m.geometry.attributes.position.count;
  let x0 = 1e9, x1 = -1e9, y0 = 1e9, y1 = -1e9, z0 = 1e9, z1 = -1e9, c = 0;
  for (let i = 0; i < n; i++) { m.getVertexPosition(i, v); v.applyMatrix4(m.matrixWorld).applyMatrix4(inv); if (!test(v)) continue; c++; x0 = Math.min(x0, v.x); x1 = Math.max(x1, v.x); y0 = Math.min(y0, v.y); y1 = Math.max(y1, v.y); z0 = Math.min(z0, v.z); z1 = Math.max(z1, v.z); }
  const f = c ? { x0, x1, y0, y1, z0, z1, cx: (x0 + x1) / 2, cy: (y0 + y1) / 2, cz: (z0 + z1) / 2 } : null; sliceFits.set(k, f); return f;
}
function boneOf(a, name) { let b = null; a.o.traverse((n) => { if (n.isBone && n.name === name) b = n; }); return b; }
function attachTo(a, bone, g) {   // g is built in model space at the rest pose; keep its world placement once parented to the bone
  a.o.updateMatrixWorld(true); const inv = new THREE.Matrix4().copy(a.o.matrixWorld).invert(), m = new THREE.Matrix4().multiplyMatrices(inv, bone.matrixWorld).invert();
  g.updateMatrix(); g.applyMatrix4(m); bone.add(g); return g;
}
function bonePos(a, name) { const b = boneOf(a, name); if (!b) return null; a.o.updateMatrixWorld(true); const v = new THREE.Vector3(); b.getWorldPosition(v); return v.applyMatrix4(new THREE.Matrix4().copy(a.o.matrixWorld).invert()); }
function accFor(a, id) {   // -> [[bone, group], ...]
  const f = headFit(a); if (!f) return []; const M = (c) => toon(c), out = [];
  const mesh = (geo, c, x, y, z, hull = .006) => { const m = new THREE.Mesh(geo, M(c)); m.position.set(x, y, z); if (hull) addHull(m, hull); return m; };
  const r = f.r, eyeY = f.hb + (f.top - f.hb) * .3, fz = f.front;
  if (id === 'glasses' || id === 'goggles') {
    const g = new THREE.Group(), gog = id === 'goggles', lr = r * (gog ? .28 : .2), dx = r * (gog ? .36 : .33), y = gog ? eyeY + r * .42 : eyeY;
    for (const sx of [-1, 1]) {
      g.add(mesh(new THREE.TorusGeometry(lr, r * (gog ? .07 : .045), 8, 20), gog ? '#3a3a3a' : '#2a1d14', f.x + sx * dx, y, fz + r * .02));
      const lens = mesh(new THREE.CircleGeometry(lr * .9, 20), gog ? '#7fd3e8' : '#d8eef5', f.x + sx * dx, y, fz + r * .025, 0); lens.material = new THREE.MeshToonMaterial({ color: gog ? 0x7fd3e8 : 0xe6f4f8, gradientMap: grad, transparent: true, opacity: gog ? .85 : .45 }); g.add(lens);
    }
    g.add(mesh(new THREE.BoxGeometry(dx * .7, r * .05, r * .05), gog ? '#3a3a3a' : '#2a1d14', f.x, y + (gog ? 0 : r * .04), fz + r * .02, 0));
    if (gog) { const band = mesh(new THREE.TorusGeometry(f.hw * 1.02, r * .06, 6, 30).rotateX(Math.PI / 2), '#5b3a22', f.x, y, f.z, 0); band.scale.set(1, 1, (fz - f.z) / f.hw * 1.02); g.add(band); }
    out.push(['head', g]);
  }
  if (id === 'dogtags' || id === 'charm') {
    const n = bonePos(a, 'neck'), c = bonePos(a, 'chest'); if (n && c) {
      const yb = c.y + (n.y - c.y) * .45, ch = sliceFit(a, 'chestband', (v) => Math.abs(v.y - yb) < .03 && Math.abs(v.x - n.x) < f.hw * .9), nk = sliceFit(a, 'neckband', (v) => Math.abs(v.y - (n.y + .01)) < .02 && Math.abs(v.x - n.x) < f.hw);
      if (ch && nk) { const g = new THREE.Group(), col = id === 'charm' ? '#c9a24a' : '#b9c0c4', fz2 = ch.z1 + r * .03, top = n.y + .01;
        for (const sx of [-1, 1]) { const len = Math.hypot(fz2 - nk.cz, top - yb), seg = mesh(new THREE.CylinderGeometry(r * .022, r * .022, len, 6), col, n.x + sx * (nk.x1 - nk.x0) * .32, (top + yb) / 2, (nk.z1 + fz2) / 2, 0); seg.rotation.x = Math.atan2(fz2 - nk.z1, top - yb); seg.rotation.z = -sx * .35; g.add(seg); }
        if (id === 'dogtags') for (const k of [0, 1]) { const t = mesh(new THREE.BoxGeometry(r * .17, r * .27, r * .03), '#d5dadd', n.x + (k - .5) * r * .1, yb - k * r * .06, fz2 + k * .003); t.rotation.z = (k - .5) * .5; g.add(t); }
        else g.add(mesh(new THREE.OctahedronGeometry(r * .13), '#d9443a', n.x, yb - r * .05, fz2 + r * .03));
        out.push(['chest', g]); } }
  }
  if (id === 'gloves') for (const side of ['L', 'R']) { const h = bonePos(a, 'hand' + side); if (!h) continue; const hf = sliceFit(a, 'hand' + side, (v) => v.distanceTo(h) < r * .55 && v.y < h.y + r * .05);
    if (hf) { const g = new THREE.Group(), rr = Math.max(hf.x1 - hf.x0, hf.z1 - hf.z0, hf.y1 - hf.y0) * .58; g.add(mesh(new THREE.SphereGeometry(rr, 12, 10), '#6b4a2b', hf.cx, hf.cy, hf.cz)); g.add(mesh(new THREE.CylinderGeometry(rr * .9, rr * .9, rr * .5, 12), '#4a3220', hf.cx, hf.y1 + rr * .1, hf.cz, 0)); out.push(['hand' + side, g]); } }
  if (id === 'shoes') for (const side of ['L', 'R']) { const ft = bonePos(a, 'foot' + side); if (!ft) continue; const sf = sliceFit(a, 'foot' + side, (v) => v.y < ft.y + r * .15 && Math.sign(v.x - f.x) === Math.sign(ft.x - f.x) && Math.abs(v.x - ft.x) < r * .7);
    if (sf) { const g = new THREE.Group(), w = (sf.x1 - sf.x0) * 1.12, d = (sf.z1 - sf.z0) * 1.1, hgt = (sf.y1 - sf.y0) * .8; g.add(mesh(new THREE.BoxGeometry(w, hgt, d), '#ece7dc', sf.cx, sf.y0 + hgt / 2, sf.cz)); g.add(mesh(new THREE.BoxGeometry(w * 1.02, hgt * .22, d * 1.02), '#d9443a', sf.cx, sf.y0 + hgt * .11, sf.cz, 0)); out.push(['foot' + side, g]); } }
  if (id === 'belt') { const p = bonePos(a, 'pelvis'), c = bonePos(a, 'chest'); if (p && c) { const y = p.y + (c.y - p.y) * .3, wf = sliceFit(a, 'waist', (v) => Math.abs(v.y - y) < r * .08 && Math.abs(v.x - p.x) < f.hw * 1.05);
    if (wf) { const g = new THREE.Group(), rx = (wf.x1 - wf.x0) / 2 * 1.1, rz = (wf.z1 - wf.z0) / 2 * 1.12; const b = new THREE.Mesh(new THREE.CylinderGeometry(1, 1, r * .34, 28, 1, true), new THREE.MeshToonMaterial({ color: 0x5b3a22, gradientMap: grad, side: THREE.DoubleSide })); b.scale.set(rx, 1, rz); b.position.set(wf.cx, y, wf.cz); g.add(b); g.add(mesh(new THREE.BoxGeometry(r * .3, r * .28, r * .06), '#c9a24a', wf.cx, y, wf.cz + rz)); out.push(['pelvis', g]); } } }
  /* 3D.28 new accessories (low detail, one or two boxes each) */
  const torso = () => { const p = bonePos(a, 'pelvis'), n = bonePos(a, 'neck'); if (!p || !n) return null; const y = p.y + (n.y - p.y) * .55, t = sliceFit(a, 'torso', (v) => Math.abs(v.y - y) < r * .1 && Math.abs(v.x - p.x) < f.hw * 1.1); return t && { p, n, y, t }; };
  if (id === 'backpack' || id === 'hikerpack') { const T = torso(); if (T) { const g = new THREE.Group(), big = id === 'hikerpack', w = (T.t.x1 - T.t.x0) * (big ? .82 : .72), h = (T.n.y - T.p.y) * (big ? .95 : .7), d = r * (big ? .55 : .42), z = T.t.z0 - d / 2 + r * .04, y = T.y - h * .08;
    g.add(mesh(new THREE.BoxGeometry(w, h, d), big ? '#3f6b4a' : '#d9573c', T.p.x, y, z)); g.add(mesh(new THREE.BoxGeometry(w * .7, h * .3, d * .35), big ? '#335a3d' : '#2f6fb0', T.p.x, y - h * .18, z - d * .6, 0));
    if (big) g.add(mesh(new THREE.CylinderGeometry(d * .32, d * .32, w * 1.05, 12).rotateZ(Math.PI / 2), '#8a6a3c', T.p.x, y + h * .58, z));
    for (const sx of [-1, 1]) g.add(mesh(new THREE.BoxGeometry(r * .1, h * .8, r * .03), '#2b2b2b', T.p.x + sx * w * .3, y + h * .05, T.t.z1 + r * .01, 0));
    out.push(['chest', g]); } }
  if (id === 'toolbelt' || id === 'medpouch') { const p = bonePos(a, 'pelvis'), c = bonePos(a, 'chest'); if (p && c) { const y = p.y + (c.y - p.y) * .3, wf = sliceFit(a, 'waist', (v) => Math.abs(v.y - y) < r * .08 && Math.abs(v.x - p.x) < f.hw * 1.05);
    if (wf) { const g = new THREE.Group(), rx = (wf.x1 - wf.x0) / 2 * 1.1, rz = (wf.z1 - wf.z0) / 2 * 1.12, med = id === 'medpouch';
      const b = new THREE.Mesh(new THREE.CylinderGeometry(1, 1, r * .26, 28, 1, true), new THREE.MeshToonMaterial({ color: med ? 0x2b2b2b : 0x8a5a2a, gradientMap: grad, side: THREE.DoubleSide })); b.scale.set(rx, 1, rz); b.position.set(wf.cx, y, wf.cz); g.add(b);
      if (med) { g.add(mesh(new THREE.BoxGeometry(r * .5, r * .45, r * .3), '#f2efe6', wf.cx + rx * .85, y - r * .12, wf.cz + rz * .35)); g.add(mesh(new THREE.BoxGeometry(r * .3, r * .08, r * .02), '#d9443a', wf.cx + rx * .85, y - r * .12, wf.cz + rz * .35 + r * .16, 0)); g.add(mesh(new THREE.BoxGeometry(r * .08, r * .3, r * .02), '#d9443a', wf.cx + rx * .85, y - r * .12, wf.cz + rz * .35 + r * .16, 0)); }
      else for (const sx of [-1, 1]) { g.add(mesh(new THREE.BoxGeometry(r * .32, r * .38, r * .22), '#6b4226', wf.cx + sx * rx * .8, y - r * .15, wf.cz + rz * .55)); g.add(mesh(new THREE.BoxGeometry(r * .05, r * .45, r * .05), sx < 0 ? '#c9b98a' : '#9aa3a8', wf.cx + sx * rx * .8, y + r * .05, wf.cz + rz * .62, 0)); }
      out.push(['pelvis', g]); } } }
  if (id === 'watch') { const h = bonePos(a, 'handL'), fa = bonePos(a, 'forearmL'); if (h && fa) { const g = new THREE.Group(), wp = h.clone().lerp(fa, .12), rr = r * .17; const band = mesh(new THREE.SphereGeometry(rr, 10, 8), '#2b2b2b', wp.x, wp.y, wp.z, 0); band.scale.set(1, .55, 1); g.add(band); g.add(mesh(new THREE.BoxGeometry(rr * .9, rr * .9, rr * .9), '#c9a24a', wp.x, wp.y, wp.z + rr * .55)); out.push(['forearmL', g]); } }
  if (id === 'kneepads') for (const side of ['L', 'R']) { const k = bonePos(a, 'shin' + side); if (!k) continue; const kf = sliceFit(a, 'knee' + side, (v) => Math.abs(v.y - k.y) < r * .1 && v.distanceTo(k) < r * .6);
    if (kf) { const g = new THREE.Group(); g.add(mesh(new THREE.BoxGeometry((kf.x1 - kf.x0) * .9, r * .36, r * .12), '#2f3338', kf.cx, k.y, kf.z1 + r * .03)); out.push(['shin' + side, g]); } }
  if (id === 'walkie') { const T = torso(); if (T) { const g = new THREE.Group(), x = T.p.x + (T.t.x1 - T.t.x0) * .26, y = T.y + (T.n.y - T.y) * .35, z = T.t.z1 + r * .08; g.add(mesh(new THREE.BoxGeometry(r * .26, r * .42, r * .14), '#2b2f35', x, y, z)); g.add(mesh(new THREE.CylinderGeometry(r * .025, r * .025, r * .35, 6), '#1a1a1a', x + r * .07, y + r * .36, z, 0)); g.add(mesh(new THREE.BoxGeometry(r * .07, r * .05, r * .02), '#ffb347', x - r * .05, y + r * .12, z + r * .075, 0)); out.push(['chest', g]); } }
  return out;
}
function setAccessory(a, id) {   // add / swap the accessory pieces
  if (a.accId === (id || null)) return; for (const g of a.acc || []) g.parent && g.parent.remove(g); a.acc = []; a.accId = id || null; if (!id || !MALE || !MALE.v2) return;
  const keep = [a.o.position.clone(), a.o.rotation.clone()]; a.o.position.set(0, 0, 0); a.o.rotation.set(0, 0, 0);
  for (const [bn, g] of accFor(a, id)) { const b = boneOf(a, bn); if (b) a.acc.push(attachTo(a, b, g)); }
  a.o.position.copy(keep[0]); a.o.rotation.copy(keep[1]); a.o.updateMatrixWorld(true);
}
const CLOTHES = { jacket: '#3d5f91', leather: '#6b4226', hockey: '#e6e1d4', biker: '#2c2c31', riot: '#3b4a5a', kevlar: '#4b5540', military: '#5d6b44', plate: '#5a5a55',
  hoodie: '#8a8f96', raincoat: '#f2c230', firecoat: '#b8432f', hazmat: '#c9d34a', ghillie: '#6b7a3a', tactical: '#3f4636', swatarmor: '#262a30' };   // 3D.28 new clothing
/* 3D.31 looks: skin tone, hair colour and hairstyle per survivor (v2 models), together with the Clothing shirt colour.
   One shader on the v2 texture: skin = the peach areas scaled to the new tone (shading kept), hair = the near-black brown
   areas recoloured by brightness, shirt = the hue window from 3D.28. Hairstyles are low-detail toon pieces on the head bone. */
const SKIN2 = ['#f8d8c0', '#efc09e', '#d9a077', '#b07a52', '#85553a', '#5a3826'];
const HAIR2 = ['#1d1817', '#3d2616', '#6e4528', '#8e3c1f', '#c4642f', '#dcb974', '#a9a59d'];
const STYLES = { m: ['short', 'short', 'mohawk', 'afro', 'spiky', 'bun', 'long'], f: ['base', 'long', 'ponytail', 'bun', 'afro', 'long', 'ponytail'] };
function look2(s) { const L = lookOf(s); if (L.v !== 2) { const r = Math.imul((s.id || 1) + 977, 2654435761) >>> 0; L.sk = r % SKIN2.length; L.hr = (r >>> 7) % HAIR2.length; L.hs = (r >>> 13) % 7; L.v = 2; } return L; }
const clothMats = {}, SKIN_REF2 = { m: new THREE.Color('#efc09e'), f: new THREE.Color('#e6b587') }, HAIR_REF_LUM = .016;
const headZones = new Map();
function headZone(a) {   // 3D.31: where the face is, in the model's rest space, so hair recolouring skips the eyes
  if (headZones.has(a.src)) return headZones.get(a.src); const f = headFit(a), m = a.skin[0]; if (!f || !m) return null;
  a.o.updateMatrixWorld(true); const M = new THREE.Matrix4().copy(a.o.matrixWorld).invert().multiply(m.matrixWorld);
  const z = { M, brow: f.hb + (f.top - f.hb) * .46, cz: f.z, cx: f.x, hw: f.hw }; headZones.set(a.src, z); return z;
}
function clothMaterial(fem, id, lk, zone) {   // the v2 texture with skin, hair and (Clothing) shirt recoloured
  const col = CLOTHES[id], sk = lk ? lk.sk : -1, hr = lk ? lk.hr : -1, key = (fem ? 'f' : 'm') + (col || '') + '|' + sk + '|' + hr + (zone ? 'z' : ''); if (clothMats[key]) return clothMats[key];
  const src = fem ? FEMALE3D : MALE, m = new THREE.MeshToonMaterial({ map: src.body.material.map, gradientMap: grad });
  const c = new THREE.Color(col || '#000'), ref = SKIN_REF2[fem ? 'f' : 'm'], st = sk >= 0 ? new THREE.Color(SKIN2[sk]) : ref, ht = hr >= 0 ? new THREE.Color(HAIR2[hr]) : null;
  m.onBeforeCompile = (sh) => { sh.uniforms.shirt = { value: new THREE.Vector3(c.r, c.g, c.b) }; sh.uniforms.skinK = { value: new THREE.Vector3(st.r / ref.r, st.g / ref.g, st.b / ref.b) }; sh.uniforms.hairT = { value: ht ? new THREE.Vector3(ht.r, ht.g, ht.b) : new THREE.Vector3(-1, 0, 0) }; sh.uniforms.zhM = { value: zone ? zone.M : new THREE.Matrix4() }; sh.uniforms.zhZ = { value: new THREE.Vector4(zone ? zone.brow : -1e9, zone ? zone.cz : 1e9, zone ? zone.cx : 0, zone ? zone.hw * .5 : 0) };
    sh.vertexShader = 'uniform mat4 zhM; varying vec3 vZh;\n' + sh.vertexShader.replace('#include <begin_vertex>', '#include <begin_vertex>\nvZh = (zhM * vec4(position, 1.)).xyz;');
    sh.fragmentShader = 'uniform vec3 shirt; uniform vec3 skinK; uniform vec3 hairT; uniform vec4 zhZ; varying vec3 vZh;\nvec3 zhHsv(vec3 c){vec4 K=vec4(0.,-1./3.,2./3.,-1.);vec4 p=mix(vec4(c.bg,K.wz),vec4(c.gb,K.xy),step(c.b,c.g));vec4 q=mix(vec4(p.xyw,c.r),vec4(c.r,p.yzx),step(p.x,c.r));float d=q.x-min(q.w,q.y);return vec3(abs(q.z+(q.w-q.y)/(6.*d+1e-10)),d/(q.x+1e-10),q.x);}\n' +
      sh.fragmentShader.replace('#include <map_fragment>', `#include <map_fragment>
{ vec3 lin = diffuseColor.rgb, h = zhHsv(lin), sc = zhHsv(pow(max(lin, vec3(0.)), vec3(.4545)));
  float skinM = step(.03, sc.x) * step(sc.x, .115) * step(.18, sc.y) * (1. - step(.53, sc.y)) * step(.55, sc.z);
  float hairM = step(.02, sc.x) * step(sc.x, .15) * step(.5, sc.y) * (1. - step(.29, sc.z)) * max(max(step(zhZ.x, vZh.y), step(vZh.z, zhZ.y)), step(zhZ.w, abs(vZh.x - zhZ.z)));   /* not the eyes: above the brow or behind the head's middle */
  float shirtM = ${col ? (fem ? 'step(.052, h.x) * step(h.x, .115) * step(.72, h.y) * step(.28, h.z)' : 'step(.24, h.x) * step(h.x, .42) * step(.3, h.y) * step(.08, h.z)') : '0.'} * (1. - skinM);
  vec3 o = mix(lin, min(lin * skinK, vec3(1.)), skinM);
  if (hairT.x >= 0.) { float l = clamp(dot(lin, vec3(.3, .59, .11)) / ${HAIR_REF_LUM.toFixed(3)}, .55, 1.7); o = mix(o, hairT * l, hairM); }
  o = mix(o, shirt * min(1.25, h.z / ${fem ? '.72' : '.25'}), shirtM); diffuseColor.rgb = o; }`).replace('#include <emissivemap_fragment>', 'totalEmissiveRadiance *= diffuseColor.rgb;'); };
  m.customProgramCacheKey = () => 'look2' + (fem ? 'f' : 'm') + (col ? 's' : '');
  return (clothMats[key] = nightLit(m, .32));
}
function setClothing(a, s) {   // 3D.28 shirt colour from the Clothing slot; 3D.31 plus skin and hair colour (v2 models only)
  const id = (s.eq && s.eq.armor) || null, lk = s.id ? look2(s) : null, sig = id + '|' + (lk ? lk.sk + '.' + lk.hr : ''); if (a.clothSig === sig || !MALE || !MALE.v2) return; a.clothSig = sig; a.clothId = id;
  const mat = clothMaterial(a.src === FEMALE3D, id, lk, lk ? headZone(a) : null); for (const n of a.skin) n.material = mat; a.faces = () => mat;
}
function hairFor(a, style, col) {   // -> [{ g, top }] pieces in model space at the rest pose
  const f = headFit(a); if (!f) return []; const r = f.r, M = toon(col), out = [], mk = (geo, x, y, z, sx = 1, sy = 1, sz = 1) => { const m = new THREE.Mesh(geo, M); m.position.set(x, y, z); m.scale.set(sx, sy, sz); m.castShadow = true; addHull(m, .008); return m; };
  const top = f.top, back = f.z - r * .55;
  if (style === 'long') { const g = new THREE.Group(), h = (top - f.hb); g.add(mk(new THREE.SphereGeometry(1, 16, 12), f.x, f.hb + h * .2, back - r * .25, f.hw * .98, h * .78, r * .42)); out.push({ g, top: false }); }
  if (style === 'ponytail') { const g = new THREE.Group(); g.add(mk(new THREE.SphereGeometry(r * .22, 12, 10), f.x, top - r * .45, f.z - r * .98)); g.add(mk(new THREE.SphereGeometry(1, 12, 10), f.x, top - r * 1.05, f.z - r * 1.12, r * .17, r * .5, r * .17)); out.push({ g, top: false }); }
  if (style === 'bun') { const g = new THREE.Group(); g.add(mk(new THREE.SphereGeometry(r * .3, 14, 12), f.x, top - r * .02, f.z - r * .5)); out.push({ g, top: true }); }
  if (style === 'afro') { const g = new THREE.Group(); g.add(mk(new THREE.SphereGeometry(r * 1.08, 18, 12, 0, Math.PI * 2, 0, Math.PI * .55), f.x, top - r * .72, f.z - r * .2, 1.05, 1, 1));
    for (const [dx, dy, dz, k] of [[0, .32, .05, .5], [-.62, .05, .05, .45], [.62, .05, .05, .45], [-.45, .25, -.4, .5], [.45, .25, -.4, .5], [0, .2, -.7, .55], [-.3, .38, .45, .38], [.3, .38, .45, .38]]) g.add(mk(new THREE.SphereGeometry(r * k, 10, 8), f.x + dx * r, top - r * .25 + dy * r, f.z - r * .2 + dz * r)); out.push({ g, top: true }); }
  if (style === 'mohawk') { const g = new THREE.Group(); g.add(mk(new THREE.BoxGeometry(r * .2, r * .42, r * 1.55), f.x, top + r * .04, f.z - r * .12)); out.push({ g, top: true }); }
  if (style === 'spiky') { const g = new THREE.Group(); for (const [dx, dz, k] of [[0, .25, 1], [-.32, 0, .85], [.32, 0, .85], [0, -.3, .9], [-.2, -.55, .7], [.2, -.55, .7]]) { const c = mk(new THREE.ConeGeometry(r * .17, r * .45 * k, 6), f.x + dx * r, top + r * .08 * k, f.z + dz * r); c.rotation.set(-dz * .7, 0, dx * .9); g.add(c); } out.push({ g, top: true }); }
  return out;
}
function setHair(a, s) {   // 3D.31 add / swap the hairstyle pieces; pieces on top of the head hide under a hat
  if (!MALE || !MALE.v2 || !s.id) return; const lk = look2(s), fem = a.src === FEMALE3D, style = STYLES[fem ? 'f' : 'm'][lk.hs % 7], sig = style + '|' + lk.hr + '|' + !!a.hat;
  if (a.hairSig === sig) return; a.hairSig = sig; for (const p of a.hair || []) p.parent && p.parent.remove(p); a.hair = [];
  const head = boneOf(a, 'head'); if (!head) return; const keep = [a.o.position.clone(), a.o.rotation.clone(), a.o.scale.clone()]; a.o.position.set(0, 0, 0); a.o.rotation.set(0, 0, 0); a.o.scale.setScalar(1);
  for (const { g, top } of hairFor(a, style, HAIR2[lk.hr])) { if (top && a.hat) continue; a.hair.push(attachTo(a, head, g)); }
  a.o.position.copy(keep[0]); a.o.rotation.copy(keep[1]); a.o.scale.copy(keep[2]); a.o.updateMatrixWorld(true);
}
const blobG = new THREE.CircleGeometry(.3, 20).rotateX(-Math.PI / 2), blobM = new THREE.MeshBasicMaterial({ color: 0x1a140c, transparent: true, opacity: .3, depthWrite: false });
const people = new Map(), zeds = new Map(), dead = new Map();
const ATTACK = new Set(['punch', 'blunt', 'shoot']), STRIKE_RE = /punch|swing|fire|attack|blunt|shoot/;
const TOOL_OF = { work_chop: 'axe', work_hammer: 'hammer', work_dig: 'hoe', work_tinker: 'wrench', eat: 'bowl', carry_walk: 'crate', carry_idle: 'crate' };   // props shown with each everyday clip
const WORK_CLIP = { farm: 'work_dig', field: 'work_dig', water: 'work_tinker', well: 'work_tinker' };
const CALM_NOT = new Set(['hide', 'rescueTo', 'rescueCarry', 'chase', 'attack', 'recover', 'goFire', 'fightFire', 'postCombat', 'hiding']);
function everyday(a, s, anim, hold) {   // returns a clip name when one of the everyday clips fits, if this model has it
  const has = (c) => !!a.acts[c], still = !a.isMov() && !(a.last && a.spd > .3) && (s.moving === false || (!s.moving && !s.path) || (a.last && a.spd < .06));   // 3D.39: really covering ground is never 'still'; V3D.21: not actually covering ground = standing
  if (a.name === 'pickup' && a.cur && a.cur.isRunning()) return 'pickup';   // let the pick-up finish even after the bag is gone
  let c = null;
  if (still && s.mode === 'work' && s.post && WORK_CLIP[s.post.type]) c = WORK_CLIP[s.post.type];   /* 3D.41: never dig or tinker while walking */
  else if (still && s.mode === 'gather') c = s.gatherK === 'rock' ? 'work_dig' : s.gatherK === 'wreck' || s.gatherK === 'bin' ? 'work_tinker' : 'work_chop';   // V3D.22/23 gathering
  else if (still && s.mode === 'hammer') c = 'work_hammer';
  else if (anim === 'carry') c = still ? 'carry_idle' : 'carry_walk';
  else if (still && s.mode === 'chat') c = 'talk';
  else if (still && s.mode === 'campfire') c = a.src === FEMALE3D && a.acts.sit_f ? 'sit_f' : 'sit';
  else if (still && (s.mode === 'fix' || s.mode === 'pitch')) c = 'work_hammer';
  else if (still && s.mode === 'loot') { const bg = (G.S.bags || []).find((q) => q.id === s.lootId); if (bg && Math.hypot(bg.w.x - s.w.x, bg.w.y - s.w.y) < .7) c = 'pickup'; }   /* 3D.28: only bend down at the bag itself */
  else if (anim === 'walk' && !hold && a.src === FEMALE3D && !CALM_NOT.has(s.mode) && !s.target) c = 'walk_f';   /* 3D.28: the relaxed walk only in calm moments; in a fight she runs like everyone */
  return c && has(c) ? c : null;
}
function personAnim(a, s, dt) {
  const wid = s.mode === 'work' ? null : s.eq && s.eq.weapon, model = wid ? WMODEL[wid] || 'bat' : null, cls = model ? (s.dry && WCLASS[model] === 'gun' ? 'melee' : WCLASS[model]) : null;   /* 3D.77: out of ammo, they swing the gun */
  a.setWeapon(model);
  const arm = s.eq && s.eq.armor && G.ITEMS[s.eq.armor] && (G.ITEMS[s.eq.armor].def || 0) >= 7; a.setArmor(!!arm);
  let [anim] = G.humanAnim(s, G.facing(s));
  if (anim === 'walk' && a.last && a.spd < .06 && !a.isMov()) anim = 'idle';   // V3D.21: the sim can say 'walking' while they wait in place: no walking on the spot
  if (anim !== 'walk' && anim !== 'run' && anim !== 'carry' && anim !== 'collapse' && !ATTACK.has(anim) && a.isMov() && !(a.attacking && a.cur && a.cur.isRunning() && STRIKE_RE.test(a.name) && performance.now() - (a.atkT || 0) < 600)) anim = 'walk';
  if (anim === 'run' && a.last && a.spd < (a.name === 'run' ? .65 : .8)) anim = 'walk';   /* 3D.45 audit: 'run' at walking pace looked like a slow-motion sprint */   /* 3D.41: anything 'standing' while the body moves walks (owner: Marcus, Noah still sliding) */   /* 3D.39: the sim says 'standing' (fight stance, waiting, cooldown) but the body is moving: walk, never slide (owner video: Noah) */
  const hold = cls === 'gun' ? 'gun' : cls ? 'melee' : null;
  if (anim === 'collapse') { a.play('collapse', true); return; }
  if (s.mode === 'rescueCarry') { a.setWeapon(null); a.play('rescue'); return; }   /* 3D.30: pushing the cart wins over the carry clip */
  const day = everyday(a, s, anim, hold); if (day) { a.attacking = false; const prop = TOOL_OF[day]; if (prop && a.w[prop]) a.setWeapon(prop); else if (day !== 'walk_f') a.setWeapon(null); a.play(day, day === 'pickup'); return; }   // V3D.19: work, rest, chat and carrying clips (models that have them)
  if (ATTACK.has(anim)) {
    const step = s.comboStep || 0, burst = step > 0 && (s.comboQ > 0 || s.comboFin);   /* 3D.58 random quick combo: A, B, finisher, played fast */
    if (!a.attacking || (burst && a.comboSeen !== step)) {
      const clip = anim === 'punch' || !cls ? 'punch' : anim === 'shoot' ? (cls === 'pistol' ? 'pistol_fire' : 'gun_fire') : burst ? ['melee_swing_a', 'melee_swing_b', a.acts.melee_swing_d ? 'melee_swing_d' : 'melee_swing_c'][Math.min(2, step - 1)] : ((s.swingN || 0) % 2 ? 'melee_swing_b' : 'melee_swing_a');
      a.play(clip, true, true); a.attacking = true; a.atkT = performance.now(); a.comboSeen = burst ? step : 0; if (a.cur) a.cur.timeScale = burst ? 1.9 : 1;
    }
    return;
  }
  if (a.attacking && a.cur && a.cur.isRunning() && STRIKE_RE.test(a.name) && performance.now() - (a.atkT || 0) < (a.isMov() ? 600 : 1500)) return;    // let the strike finish (3D.64 owner's log, Noah: a punch held for 8 s while he walked off; a strike now holds at most 1.5 s, 0.6 s once they move)   /* 3D.59 owner's log (Marcus, Ben): only a strike clip holds; a work or carry pose left over after a fight used to freeze them while they chased */
  a.attacking = false;
  if (s._lvT > 24 && !s.carrying && anim !== 'walk' && !(a.spd > .14)) { a.play('cheer'); return; }   /* 3D.30: only cheer standing still (cheering while walking looked like a frozen slide) */   // level-up: a happy jump while the LEVEL UP burst plays
  // run (empty-handed clip) when hiding, hurrying to a downed friend, or rushing a zombie bare-handed
  const rush = s.moving !== false && (s.mode === 'hide' || s.mode === 'rescueTo' || (s.mode === 'chase' && !hold));
  if (anim === 'walk' && rush && a.spd > (a.name === 'run' ? .65 : .8)) { a.play('run'); return; }   /* 3D.45: only sprint when actually moving fast */
  if (anim === 'walk' || anim === 'carry') { a.play(hold ? hold + '_hold_walk' : 'walk'); return; }
  a.play(hold ? hold + '_hold_idle' : 'idle');
}
/* 3D.32 Infected Dog: a low-detail toon dog built from boxes, legs swing with its ground speed (no rig needed) */
class DogActor {
  constructor() {
    const o = new THREE.Group(), fur = toon('#5b5148'), dark = toon('#3a332d'), sore = toon('#8c3b33'), add = (geo, m, x, y, z, p = o) => { const k = new THREE.Mesh(geo, m); k.position.set(x, y, z); k.castShadow = true; addHull(k, .012); p.add(k); return k; };
    add(new THREE.BoxGeometry(.26, .24, .62), fur, 0, .38, 0); add(new THREE.BoxGeometry(.12, .1, .18), sore, .08, .46, .05);
    this.head = new THREE.Group(); this.head.position.set(0, .5, .34); o.add(this.head);
    add(new THREE.BoxGeometry(.2, .2, .22), fur, 0, 0, .04, this.head); add(new THREE.BoxGeometry(.13, .1, .16), dark, 0, -.05, .2, this.head);
    for (const sx of [-1, 1]) { add(new THREE.ConeGeometry(.045, .12, 4), dark, sx * .07, .14, -.02, this.head); const e = new THREE.Mesh(new THREE.SphereGeometry(.022, 6, 4), new THREE.MeshBasicMaterial({ color: 0xd8ff7a })); e.position.set(sx * .055, .04, .155); this.head.add(e); }
    this.legs = []; for (const [x, z] of [[-.09, .22], [.09, .22], [-.09, -.22], [.09, -.22]]) { const g = new THREE.Group(); g.position.set(x, .3, z); add(new THREE.BoxGeometry(.07, .3, .08), dark, 0, -.15, 0, g); o.add(g); this.legs.push(g); }
    this.tail = new THREE.Group(); this.tail.position.set(0, .45, -.31); add(new THREE.BoxGeometry(.05, .05, .22), fur, 0, 0, -.1, this.tail); o.add(this.tail);
    o.scale.setScalar(1.15); this.o = o; scene.add(o); this.sh = new THREE.Mesh(blobG, blobM); scene.add(this.sh);
    this.dog = true; this.acts = {}; this.w = {}; this.arm = []; this.skin = []; this.cur = null; this.name = ''; this.yaw = 0; this.last = null; this.acc = 0; this.lite = true; this.spd = 0; this.t = 0; this.atk = 0;
    this.mixer = { update: (dt) => this.anim(dt) };
  }
  play(name) { if (name === 'collapse') this.dead = true; if (/attack/.test(name) && this.name !== name) this.atk = .35; this.name = name; }
  setWeapon() {} setArmor() {} setExpr() {} setMood() {}
  anim(dt) {
    if (this.dead) { this.o.rotation.z = Math.min(Math.PI / 2, (this.o.rotation.z || 0) + dt * 5); return; }
    const run = Math.min(1, this.spd / 1.2); this.t += dt * (3 + run * 12);
    this.legs.forEach((g, i) => { g.rotation.x = Math.sin(this.t + (i % 2 ? Math.PI : 0) + (i > 1 ? Math.PI / 2 : 0)) * (.15 + .6 * run); });
    this.tail.rotation.y = Math.sin(this.t * 1.7) * .5; this.atk = Math.max(0, this.atk - dt);
    this.head.rotation.x = this.atk > 0 ? -Math.sin(this.atk / .35 * Math.PI) * .6 : Math.sin(this.t * .5) * .06;
  }
}
DogActor.prototype.place = Actor.prototype.place; DogActor.prototype.show = Actor.prototype.show; DogActor.prototype.dispose = Actor.prototype.dispose;
function makeCart() {   // V3D.17 rescue cart: a wooden barrow on two wheels with a pushing handle
  const g = new THREE.Group(), wood = toon('#b07a45'), dark = toon('#6b4a2e'), tyre = toon('#3a302a');
  const add = (geo, m, x, y, z, rx = 0, ry = 0, rz = 0) => { const o = new THREE.Mesh(geo, m); o.position.set(x, y, z); o.rotation.set(rx, ry, rz); o.castShadow = true; addHull(o, .012); g.add(o); return o; };
  add(box(.56, .06, .92), wood, 0, .3, 0);                                   // bed
  for (const sx of [-1, 1]) add(box(.05, .16, .92), dark, sx * .28, .38, 0);   // sides
  add(box(.56, .16, .05), dark, 0, .38, .46); add(box(.56, .16, .05), dark, 0, .38, -.46);
  for (const sx of [-1, 1]) { add(cyl(.17, .17, .06, 14), tyre, sx * .33, .17, .12, 0, 0, Math.PI / 2); add(cyl(.05, .05, .07, 8), wood, sx * .33, .17, .12, 0, 0, Math.PI / 2); }
  for (const sx of [-1, 1]) add(box(.04, .04, .42), dark, sx * .2, .4, -.62, -.25);   // handles toward the pusher
  add(box(.44, .04, .04), dark, 0, .45, -.82);
  scene.add(g); return g;
}
function syncPeople(dt, vis) {
  const seen = new Set();
  for (const s of G.S.sv) {
    seen.add(s); let a = people.get(s);
    if (!a) { a = newPerson(s); addHat(a, s.job); people.set(s, a); a.job = s.job; }
    if (a.job !== s.job) { a.dispose(); a = newPerson(s); addHat(a, s.job); people.set(s, a); a.job = s.job; }
    const carried = s.mode === 'down' && G.beingCarried(s), ra = carried && people.get(s.rescuer);
    if (carried && ra && ra.cart && ra.cart.visible) {   // V3D.17: ride in the rescuer's cart, lying down
      a.show(true); const c = ra.cart; a.o.position.set(c.position.x, .34, c.position.z); a.o.rotation.set(0, c.rotation.y + Math.PI, 0); a.yaw = c.rotation.y + Math.PI; a.o.scale.setScalar(.9); a.sh.visible = false;
      personAnim(a, s, dt); tickMixer(a, dt, vis); continue; }
    const hidden = s.mode === 'away' || !s.w || G.insideBuilding(s) || carried;
    a.show(!hidden); if (hidden) { if (a.cart) a.cart.visible = false; continue; }
    const tgt = (s.mode === 'attack' || s.mode === 'chase') && s.target && s.target.w;
    a.place(s.w.x, s.w.y, tgt && s.mode === 'attack' ? tgt : (!s.moving && s.faceW) || null, dt);   // V3D.14: chatting / at the fire: face them
    setClothing(a, s); setAccessory(a, s.eq && s.eq.acc);   /* 3D.28 */
    { const hid = s.eq && s.eq.head, shape = hid && G.ITEMS[hid] && G.ITEMS[hid].shape; if (a.hatId !== (shape || null)) { a.hatId = shape || null; addHat(a, shape ? HAT_SHAPE[shape] : null, !!shape); } }   // V3D.16 equipped hat
    setHair(a, s);   /* 3D.31 */
    personAnim(a, s, dt); a.setMood(s.emo && s.emo.face);
    { const pushing = s.mode === 'rescueCarry' && s.carrying; if (pushing && !a.cart) a.cart = makeCart();   // the cart rolls ahead of the rescuer
      if (a.cart) { a.cart.visible = pushing; if (pushing) { a.cart.position.set(a.o.position.x + Math.sin(a.yaw) * .95, 0, a.o.position.z + Math.cos(a.yaw) * .95); a.cart.rotation.y = a.yaw; } } }
    { const wn = a.weapon && a.w[a.weapon]; if (wn) { if (!wn.userData.q0) wn.userData.q0 = wn.quaternion.clone();   // V3D.16 reload: the gun tips down and rattles
        if (s.reloadT > 0 && !a.isMov()) { a.play(WCLASS[a.weapon] === 'gun' ? 'gun_hold_idle' : 'melee_hold_idle'); wn.quaternion.copy(wn.userData.q0).multiply(_rq.setFromEuler(_re.set(-.9 + .18 * Math.sin(performance.now() / 60), 0, .25))); } else wn.quaternion.copy(wn.userData.q0); } } if (a.beam && a.beam.visible && (s.sleeping || s.mode === 'campfire' || s.mode === 'chat' || s.mode === 'useFacility' || s.mode === 'work' || s.mode === 'hospital' || s.mode === 'down' || (!a.isMov() && !['chase', 'attack', 'recover', 'postCombat'].includes(s.mode) && s.purpose !== 'patrol'))) a.beam.visible = false;   /* 3D.62 owner: the flashlight's orange pool stayed on round people asleep or standing about; it's on only while they walk or fight at night */ tickMixer(a, dt, vis); if (TRACK.on) trackActor(a, s, dt);
  }
  const T = G.S.trader;   // V3D.17 the wandering trader: a survivor-style figure in purple with a straw hat and a pack
  if (T && T.w) { seen.add(T); let a = people.get(T); if (!a) { a = new Actor(MALE, jobMaterial('Trader', 'happy', { sk: 2, hr: 3 }), false, (e) => jobMaterial('Trader', e, { sk: 2, hr: 3 })); addHat(a, 'Farmer', true); a.setWeapon(null); a.setArmor(false); people.set(T, a); }
    a.show(true); a.place(T.w.x, T.w.y, null, dt); a.play(T.moving ? 'walk' : 'idle'); tickMixer(a, dt, vis); }
  for (const [s, a] of people) if (!seen.has(s)) { if (a.cart) { scene.remove(a.cart); a.cart = null; } a.dispose(); people.delete(s); }
}
function zombieAnim(a, z) {
  if (a.dog) { a.play(z.mode); return; }   /* 3D.32 */
  if (a.src && a.src.crawl) { if (z.mode === 'zattack' || z.mode === 'zbreak' || (z.mode === 'zbash' && z.moving === false)) { if (!a.attacking || !a.cur.isRunning()) { a.play('crawl_attack', true, true); a.attacking = true; } return; } a.attacking = false; a.play('crawl'); return; }   /* 3D.34 */
  if (z.turned && z.mode === 'appear' && z.stateTicks > 70) { a.play('collapse', true); return; }   // V3D.21: a survivor who died falls, lies still, then gets up a zombie
  if (z.mode === 'zattack' || z.mode === 'zbreak' || z.mode === 'attack' || (z.mode === 'zbash' && z.moving === false)) { if (!a.attacking || !a.cur.isRunning()) { const spit = a.src === ZSRC.spitter && a.acts.spit && z.mode === 'zattack'; a.play(a.src === ZSRC.bloated && a.acts.bloated_attack ? 'bloated_attack' : a.src === ZSRC.brute && a.acts.brute_attack ? 'brute_attack' : a.src === ZSRC.sporehead && a.acts.spore_combo ? 'spore_combo' : a.src === ZSRC.screamer && a.acts.scream ? 'scream' : spit ? 'spit' : z.type !== 'raider' && a.acts.zombie_attack ? 'zombie_attack' : 'punch', true, true); if (spit && a.cur) a.cur.timeScale = 1.65; a.attacking = true; } return; }   /* 3D.35 brute hammer fist (also the Alpha), spitter spit: the glob leaves the mouth ~20 ticks in */   // V3D.20 zombies claw-swipe
  a.attacking = false;
  if (z.type === 'raider') { a.play(z.moving === false ? 'melee_hold_idle' : z.mode === 'rflee' ? 'run' : 'melee_hold_walk'); return; }
  if (z.type === 'runner') { a.play(a.spd > (a.name === 'zombie_run' ? .6 : .75) ? 'zombie_run' : 'zombie_walk'); return; }   /* 3D.45: a runner that is slowing down walks (no slow-motion sprint) */
  a.play(a.src === ZSRC.bloated && a.acts.bloated_walk ? 'bloated_walk' : 'zombie_walk');   // V3D.20 playback speed follows the ground speed (tickMixer); V3D.21 the bloated model waddles (arms fused to the belly)
}
function syncZombies(dt, vis) {
  const seen = new Set();
  for (const z of G.S.z) {
    if (z.hp <= 0 || !z.w) continue; seen.add(z); let a = zeds.get(z);
    if (!a) {
      if (z.type === 'raider') { a = new Actor(MALE, jobMaterial('Raider'), false, (e) => jobMaterial('Raider', e)); addHat(a, 'Raider'); const m = WMODEL[z.wpn] || 'bat'; a.setWeapon(m); a.setArmor(false); }
      else if (z.type === 'dog') a = new DogActor();   /* 3D.32 */
      else if (z.type === 'alpha') { a = zombieOwn('alpha') || new Actor(LITE, zombieMaterial('brute', 0), true); a.setWeapon(null); a.setArmor(false); }
      else if (z.type === 'riot' && ZSRC.riot) { a = zombieOwn('riot'); a.setWeapon(null); a.setArmor(false); }   /* 3D.39 */
      else if (z.type === 'riot' && MALE.v2) { a = zombieV2('riot', false, (Math.random() * 4) | 0, true) || new Actor(LITE, zombieMaterial('walker', 0), true); a.setWeapon(null); a.setArmor(true); addHat(a, 'SwatHelm', true); }
      else { const v = (Math.random() * 4) | 0; a = (MALE.v2 && (z.turned ? zombieV2(z.type, !!(FEMALE3D && z.turned.fem), v, true) : zombieV2(z.type, FEMALE3D && Math.random() < .4, v))) || new Actor(LITE, zombieMaterial(z.type, v), true); a.setWeapon(null); a.setArmor(false); }
      a.yaw = Math.random() * 6; zeds.set(z, a);
    }
    const tgt = z.target && z.target.w && (z.mode === 'zattack' || z.mode === 'attack') ? z.target.w : z.mode === 'zbash' && z.moving === false && z.faceB ? z.faceB : null;
    a.place(z.w.x, z.w.y, tgt, dt, ZSC[z.type] || 1); zombieAnim(a, z); tickMixer(a, dt, vis);
  }
  for (const [z, a] of zeds) if (!seen.has(z)) { zeds.delete(z); if (z.type === 'raider' || !a.lite || z.escaped) { a.dispose(); continue; }   /* escaped: walked off the map, no death fall */ dead.set(a, 0); a.play('collapse', true, true); }
  for (const c of G.corpses) c.__3d = true;
  for (const [a, t0] of dead) {   // fall, lie still, then sink away (the 2D corpse fades over the same time)
    const t = t0 + dt; dead.set(a, t); tickMixer(a, dt, vis);
    if (t > 3) a.o.position.y = -(t - 3) * .4; if (t > 4.2) { a.dispose(); dead.delete(a); }
  }
}
// ---------------------------------------------------------------- loot bags (V3D.12): a tied cloth sack that drops in
// with a bounce, wobbles while it waits, and puffs up then shrinks away when opened (game.js draws the sparkles)
const bagMeshes = new Map();
const sackG = (() => { const pts = []; for (let i = 0; i <= 10; i++) { const t = i / 10, y = t * .42; pts.push(new THREE.Vector2(Math.max(.02, Math.sin(Math.min(1, t * 1.15) * Math.PI) * .2 * (1 - t * .25)), y)); } return new THREE.LatheGeometry(pts, 14); })();
const knotG = new THREE.ConeGeometry(.075, .14, 8).translate(0, .46, 0), tieG = new THREE.TorusGeometry(.06, .018, 6, 12).rotateX(Math.PI / 2).translate(0, .38, 0);
function makeBag() {
  const g = new THREE.Group(), cloth = toon('#a8743c'), m = new THREE.Mesh(sackG, cloth), k = new THREE.Mesh(knotG, cloth), t = new THREE.Mesh(tieG, toon('#e2c27a'));
  for (const o of [m, k, t]) { o.castShadow = true; g.add(o); } addHull(m, .02); addHull(k, .018);
  const pat = new THREE.Mesh(new THREE.CircleGeometry(.07, 10), toon('#d9a55a')); pat.position.set(.08, .2, .17); pat.lookAt(.3, .2, .8); g.add(pat);   // a patch
  scene.add(g); return g;
}
// V3D.17 supply crate: drifts down under a striped parachute, thumps down, the chute folds beside it; carried home overhead
const crateMeshes = new Map();
function makeCrate() {
  const g = new THREE.Group(), wood = toon('#c8924f'), dark = toon('#7a5230');
  const cr = new THREE.Mesh(box(.62, .5, .62), wood); cr.position.y = .25; cr.castShadow = true; addHull(cr, .014); g.add(cr);
  for (const [x, z, w, d] of [[0, .32, .66, .06], [0, -.32, .66, .06], [.32, 0, .06, .66], [-.32, 0, .06, .66]]) { const b = new THREE.Mesh(box(w, .1, d), dark); b.position.set(x, .25, z); g.add(b); }
  const ch = new THREE.Group(), red = toon('#e8584a'), wht = toon('#f2f0e6');
  for (let i = 0; i < 8; i++) { const seg = new THREE.Mesh(new THREE.SphereGeometry(1.1, 8, 6, i * Math.PI / 4, Math.PI / 4, 0, Math.PI / 2), i % 2 ? red : wht); seg.scale.y = .55; ch.add(seg); }
  const lm = new THREE.LineBasicMaterial({ color: 0x5a3f31 }); for (const [x, z] of [[.7, .7], [-.7, .7], [.7, -.7], [-.7, -.7]]) ch.add(new THREE.Line(new THREE.BufferGeometry().setFromPoints([new THREE.Vector3(x, 0, z), new THREE.Vector3(x * .35, -1.6, z * .35)]), lm));
  ch.position.y = 2.2; g.add(ch); g.userData.chute = ch; scene.add(g); return g;
}
const RAR_COL = { uncommon: 0x7cc95a, rare: 0x5aa8f0, epic: 0xb072f0 };   // V3D.25: a coloured glow ring under rare crates and bags
function rarRing(g, rar) { const c = RAR_COL[rar]; if (!c || g.userData.ring) return; const m = new THREE.Mesh(new THREE.RingGeometry(.28, .5, 24).rotateX(-Math.PI / 2), new THREE.MeshBasicMaterial({ color: c, transparent: true, opacity: .7, depthWrite: false, blending: THREE.AdditiveBlending }));
  m.position.y = .04; g.add(m); const p = new THREE.Mesh(new THREE.CylinderGeometry(.18, .32, 1.6, 12, 1, true).translate(0, .8, 0), new THREE.MeshBasicMaterial({ color: c, transparent: true, opacity: .22, depthWrite: false, blending: THREE.AdditiveBlending, side: THREE.DoubleSide })); g.add(p); g.userData.ring = [m, p]; }
function pulseRing(g, t) { const r = g.userData.ring; if (!r) return; const k = .5 + .5 * Math.sin(t * 3); r[0].material.opacity = .45 + .35 * k; r[0].scale.setScalar(.9 + .2 * k); r[1].material.opacity = .14 + .12 * k; }
function syncCrates(dt) {
  const seen = new Set();
  for (const c of G.S.crates || []) {
    seen.add(c); let g = crateMeshes.get(c); if (!g) { g = makeCrate(); g.userData.t = 0; crateMeshes.set(c, g); rarRing(g, c.rar); } pulseRing(g, g.userData.t);
    g.userData.t += dt; const t = Math.max(g.userData.t, ((G.tick ? G.tick() : 0) - c.t0) / 60), ch = g.userData.chute; g.position.set(c.w.x * T, groundH(c.w.x * T, c.w.y * T), c.w.y * T);
    if (c.taken) { g.position.y = 1.2; g.scale.setScalar(.7); ch.visible = false; continue; }
    const fall = Math.max(0, 1 - t / 3.2); g.position.y = 9 * fall * fall; g.rotation.z = fall * Math.sin(t * 2.2) * .18;
    if (fall > 0) { ch.visible = true; ch.position.set(0, 2.2, 0); ch.rotation.set(0, 0, 0); ch.scale.set(1, 1, 1); }
    else { const k = Math.min(1, (t - 3.2) / .8); ch.position.set(1.1 * k, 2.2 * (1 - k) + .05, .3 * k); ch.rotation.z = -1.4 * k; ch.scale.set(1, 1 - .85 * k, 1); }
  }
  for (const [c, g] of crateMeshes) if (!seen.has(c)) { scene.remove(g); crateMeshes.delete(c); }
}
function syncBags(dt) {
  const seen = new Set();
  for (const b of G.S.bags || []) {
    seen.add(b); let e = bagMeshes.get(b);
    if (!e) { e = { g: makeBag(), t: 0, spin: Math.random() * 6 }; bagMeshes.set(b, e); if (b.rar && b.rar !== 'common') rarRing(e.g, b.rar); } pulseRing(e.g, e.t);
    e.t += dt; const g = e.g; g.position.set(b.w.x * T, groundH(b.w.x * T, b.w.y * T), b.w.y * T); g.rotation.y = e.spin;
    if (!b.opened) {   // fall in from above with two bounces, then a gentle wobble
      const t = e.t, fall = t < .35 ? 1.4 * (1 - (t / .35) ** 2) : t < .55 ? .22 * Math.sin((t - .35) / .2 * Math.PI) : t < .68 ? .06 * Math.sin((t - .55) / .13 * Math.PI) : 0;
      g.position.y = fall; const sq = t > .33 && t < .45 ? 1 - .25 * Math.sin((t - .33) / .12 * Math.PI) : 1; g.scale.set(1 / Math.sqrt(sq), sq, 1 / Math.sqrt(sq)); g.rotation.z = Math.sin(t * 3) * .05;
      e.ot = 0;
    } else { e.ot = (e.ot || 0) + dt; const k = e.ot; const s2 = k < .15 ? 1 + 1.6 * k : Math.max(0, 1.24 * (1 - (k - .15) / .35)); g.scale.setScalar(s2); g.position.y = k < .15 ? k * .8 : .12; }
  }
  for (const [b, e] of bagMeshes) if (!seen.has(b)) { scene.remove(e.g); bagMeshes.delete(b); }
}
// ---------------------------------------------------------------- fire (V3D.13): 3D flames, embers and smoke on burning buildings
// and on bonfires at night, with a flickering orange pool of light; burnt shells keep smoking
const flameT = (() => { const c = document.createElement('canvas'); c.width = 64; c.height = 128; const g = c.getContext('2d');
  const r = g.createRadialGradient(32, 92, 2, 32, 84, 44); r.addColorStop(0, 'rgba(255,255,230,1)'); r.addColorStop(.25, 'rgba(255,214,90,.95)'); r.addColorStop(.6, 'rgba(255,120,30,.75)'); r.addColorStop(1, 'rgba(255,60,10,0)');
  g.fillStyle = r; g.beginPath(); g.moveTo(32, 4); g.bezierCurveTo(52, 46, 62, 74, 54, 98); g.bezierCurveTo(46, 122, 18, 122, 10, 98); g.bezierCurveTo(2, 74, 12, 46, 32, 4); g.fill();
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; return t; })();
const flameMat = new THREE.SpriteMaterial({ map: flameT, transparent: true, blending: THREE.AdditiveBlending, depthWrite: false });
const smokeMat = new THREE.SpriteMaterial({ map: glowT, color: 0x5a5048, transparent: true, depthWrite: false, opacity: .5 });
const firePoolMat = addM(glowT, 0xff8a3a), fires = new Map();
function makeFire(n) { const g = new THREE.Group(), fl = [], sm = [];
  for (let i = 0; i < n; i++) { const sp = new THREE.Sprite(flameMat.clone()); sp.userData = { ph: Math.random() * 6, x: (Math.random() - .5), z: (Math.random() - .5), s: .7 + Math.random() * .6 }; g.add(sp); fl.push(sp); }
  for (let i = 0; i < 6; i++) { const sp = new THREE.Sprite(smokeMat.clone()); sp.userData = { t: Math.random() * 3 }; g.add(sp); sm.push(sp); }
  const pool = new THREE.Mesh(poolG, firePoolMat.clone()); pool.position.y = .04; pool.renderOrder = 2; g.add(pool); scene.add(g); return { g, fl, sm, pool };
}
function syncFires(dt, t) {
  const want = new Map();
  for (const b of G.world.buildings) {
    const bon = b.type === 'bonfire' || (b.type === 'generator' && G.S.power), lvl = bon ? (glowNow > .15 ? 1 : .25) : b.fire ? Math.min(1, .45 + .15 * b.fire) : b.burnt ? 0 : -1;
    if (lvl < 0) continue; want.set(b, lvl);
  }
  for (const [b, lvl] of want) {
    let f = fires.get(b); const bon = b.type === 'bonfire';
    if (!f) { f = makeFire(bon ? 5 : 9); f.bon = bon; fires.set(b, f); }
    const W = b.w * T, D = b.h * T, cx = (b.x + b.w / 2) * T, cz = (b.y + b.h / 2) * T; f.g.position.set(cx, 0, cz);
    const spread = bon ? .2 : Math.min(W, D) * .32, hgt = bon ? .18 : 1.5;
    f.fl.forEach((sp, i) => { const u = sp.userData, fk = .8 + .25 * Math.sin(t * 9 + u.ph) + .12 * Math.sin(t * 23 + u.ph * 2);
      sp.visible = lvl > 0; const sz = (bon ? .85 : 1.35) * u.s * fk * (.5 + .5 * lvl); sp.scale.set(sz * .6, sz, 1); sp.position.set(u.x * spread * 2, hgt + sz * .45 + Math.sin(t * 5 + u.ph) * .04, u.z * spread * 2); sp.material.opacity = .9 * Math.min(1, lvl * 1.2); });
    f.sm.forEach((sp) => { const u = sp.userData; u.t += dt * (bon ? .5 : .8); if (u.t > 3) { u.t = 0; u.x = (Math.random() - .5) * spread; u.z = (Math.random() - .5) * spread; }
      const k = u.t / 3; sp.position.set((u.x || 0) + Math.sin(t + u.t) * .1, hgt + .4 + k * (bon ? 1.6 : 2.6), u.z || 0); sp.scale.setScalar(.4 + k * (bon ? .9 : 1.6)); sp.material.opacity = (bon ? .18 : lvl > 0 ? .45 : .3) * (1 - k) * Math.min(1, k * 5); });
    const fk = .85 + .15 * Math.sin(t * 11) * Math.sin(t * 7.3);
    const R = bon ? 10 : 5.5 * lvl; f.pool.scale.set(R * fk, 1, R * fk); f.pool.material.opacity = lvl > 0 ? (bon ? (.25 + .55 * glowNow) * Math.min(1, lvl * 1.4) : .55 * lvl) * fk : 0;
  }
  for (const [b, f] of fires) if (!want.has(b)) { scene.remove(f.g); fires.delete(b); }
}
let fireT = 0;
// rain (V3D.13): streaks falling in a box around the view, denser in heavy rain; the light greys a little
const RAIN_N = 900, rainPos = new Float32Array(RAIN_N * 6), rainG = new THREE.BufferGeometry();
rainG.setAttribute('position', new THREE.BufferAttribute(rainPos, 3));
const rain = new THREE.LineSegments(rainG, new THREE.LineBasicMaterial({ color: 0xdce8f4, transparent: true, opacity: .45, depthWrite: false })); rain.frustumCulled = false; rain.visible = false; scene.add(rain);
const rainSeed = Array.from({ length: RAIN_N }, () => [Math.random(), Math.random(), Math.random()]); let rainK = 0;
function syncRain(dt) {
  const w = G.S.weather, target = w && w.kind && w.kind.startsWith('rain') ? (w.kind === 'rain-heavy' ? .5 : .26) : 0;   // V3D.17: lighter, so the town stays readable rainK += (target - rainK) * Math.min(1, dt * .8); rain.visible = rainK > .02; if (!rain.visible) return;
  const n = Math.round(RAIN_N * rainK), c = cam.position.clone().addScaledVector(DIR, -120), span = (cam.right - cam.left) * 1.4, L = .55;
  for (let i = 0; i < n; i++) { const sd = rainSeed[i]; sd[1] = (sd[1] - dt * (1.6 + sd[2] * .6)) % 1; if (sd[1] < 0) { sd[1] += 1; sd[0] = Math.random(); sd[2] = Math.random(); }
    const x = c.x + (sd[0] - .5) * span, z = c.z + (sd[2] - .5) * span, y = sd[1] * 9; rainPos.set([x, y, z, x - .06, y - L, z - .03], i * 6); }
  rainG.setDrawRange(0, n * 2); rainG.attributes.position.needsUpdate = true;
  hemi.intensity *= 1 - .18 * rainK; sun.intensity *= 1 - .45 * rainK; hemi.color.lerp(new THREE.Color(0xb8c4d0), .5 * rainK);   // overcast: flatter, cooler light, soft shadows
}
// placement ghost (V3D.12): a see-through copy of the building being placed, tinted red where it can't go
let ghost = null;
function syncGhost() {
  const pv = G.preview && G.preview(), key = pv && [pv.type, pv.rot, pv.ok].join(',');
  if (ghost && (!pv || ghost.key !== key)) { scene.remove(ghost.g); ghost = null; }
  if (!pv) return;
  if (!ghost) { const g = makeBuilding(pv); g.traverse((o) => { if (!o.isMesh) return; if (o.userData.hull) { o.visible = false; return; } o.material = o.material.clone(); o.material.transparent = true; o.material.opacity = .55; o.material.depthWrite = false; if (!pv.ok) o.material.color.lerp(new THREE.Color('#ff6a5a'), .55); o.castShadow = false; });
    scene.add(g); ghost = { g, key }; }
  ghost.g.position.set((pv.x + pv.w / 2) * T, 0, (pv.y + pv.h / 2) * T);
}
const insideBuilding3 = (s) => false;   // hidden survivors are already not shown
const _rq = new THREE.Quaternion(), _re = new THREE.Euler();
let zCount = 0;
const _fr = new THREE.Frustum(), _sph = new THREE.Sphere(new THREE.Vector3(), 1.4), _pm = new THREE.Matrix4();
// V3D.20 stride matching: how fast the planted foot slides back in each walking clip (model units / s at 1x),
// measured from the exported models (tools: scratchpad stride/meas.py). Playback speed = ground speed / this,
// so the feet stay planted instead of skating or running in place.
const STRIDE = {
  v2m: { walk: 1.019, walk_f: .918, run: 1.614, hold_walk: 1.019, gun_hold_walk: .930, carry_walk: .838, zombie_walk: .550, zombie_run: 1.301 },
  v2f: { walk: 1.036, walk_f: .948, run: 1.648, hold_walk: 1.036, gun_hold_walk: .940, carry_walk: .864, zombie_walk: .561, zombie_run: 1.291 },
  v1: { walk: .443, run: .800, hold_walk: .443, gun_hold_walk: .405, zombie_walk: .159, zombie_run: .636 },
};
function strideOf(a) {
  const t = a.src.stride || STRIDE[a.src === FEMALE3D && FEMALE3D ? 'v2f' : a.src.v2 ? 'v2m' : 'v1'], n = a.name;
  return t[n] || (n.endsWith('gun_hold_walk') ? t.gun_hold_walk : n.endsWith('hold_walk') ? t.hold_walk : 0);
}
function tickMixer(a, dt, vis) {
  const st = a.cur && strideOf(a); if (st) a.cur.timeScale = Math.max(.15, Math.min(8, a.spd / st));   /* 3D.57: slow walkers step slowly instead of skating (min was .35) */   /* 3D.45 audit: at 2x-3x game speed the old cap of 3 left the feet skating (the 'sliding' the owner saw) */
  a.acc += dt; _sph.center.set(a.o.position.x, .6, a.o.position.z);
  const seen = _fr.intersectsSphere(_sph), every = !seen ? .25 : (a.lite && zCount > 40 ? 1 / 30 : 0);
  if (a.acc >= every) { a.mixer.update(a.acc); a.acc = 0; }
  const cs = seen && a.cur && CLIP_SFX[a.name]; if (cs) { const d = a.cur.getClip().duration, ph = d ? (a.cur.time % d) / d : 0; if (a.sfxPh != null && a.sfxPh < cs[0] && ph >= cs[0] && window.SND) SND.play(cs[1]); a.sfxPh = ph; } else a.sfxPh = null;   /* 3D.57 the axe and hammer sound when the tool lands */
}
/* 3D.58 animation tracker: for each survivor, compares how fast the body really moves (over the last .3 s) with what the
   feet do, and logs anything that would look like sliding. Settings > Animation tracker shows it live; ZH3D.track for tests. */
const TRACK = { on: false, log: [], rows: new Map(), t0: performance.now() };
const LOCO_RE = /walk|run|crawl$|rescue/, ATK_RE = /punch|swing|blunt|fire|attack|shoot/;
function trackActor(a, s, dt) {
  const now = performance.now(), h = a.trk || (a.trk = []); a.trkT = (a.trkT || 0) + dt; h.push([a.trkT, a.o.position.x, a.o.position.z]); while (h.length > 2 && a.trkT - h[0][0] > .3) h.shift();   // game time, the same clock the animation runs on
  const [t0, x0, z0] = h[0], span = a.trkT - t0, sp = G.simSpeed ? G.simSpeed() : 1, v = span > .05 ? Math.hypot(a.o.position.x - x0, a.o.position.z - z0) / span : 0;
  const n = a.name || '', loco = LOCO_RE.test(n), st = loco ? strideOf(a) : 0, ts = a.cur ? a.cur.timeScale : 1, foot = st ? st * ts : 0;
  const mvAng = span > .05 && v > .1 ? Math.atan2(a.o.position.x - x0, a.o.position.z - z0) : null, side = mvAng == null ? 0 : Math.abs(Math.atan2(Math.sin(mvAng - a.yaw), Math.cos(mvAng - a.yaw))) * 57.3;
  let flag = '';
  if (v > .12 && !loco && !ATK_RE.test(n) && !/collapse|cheer|pickup/.test(n)) flag = 'SLIDE (no walk clip)';
  else if (v > .12 && ATK_RE.test(n)) flag = 'SLIDE (attacking while moving)';
  else if (loco && st && v > .12 && (foot / v < .6 || foot / v > 1.7)) flag = foot < v ? 'SKATE (feet too slow)' : 'FEET TOO FAST';
  else if (loco && v < .03 && h.length > 3 && !/crawl/.test(n)) flag = 'WALK IN PLACE';
  else if (side > 70) flag = side > 120 ? 'MOONWALK (backwards)' : 'SIDEWAYS';
  let sim = ''; try { const r = G.humanAnim(s, G.facing(s)); sim = Array.isArray(r) ? r[0] : r; } catch (e) { /* */ }
  const row = { name: s.name, job: s.job, mode: s.mode, why: (s.why || '').slice(0, 40), clip: n, sim, v: +v.toFixed(2), foot: +foot.toFixed(2), ts: +ts.toFixed(2), moving: s.moving, flag, fps: Math.round(window.ZH3D.fps || 0), speed: sp, wpn: a.weapon || '' };
  TRACK.rows.set(s, row);
  if (flag) { const last = a.trkLast; if (!last || last.flag !== flag || now - last.t > 1500) { a.trkLast = { flag, t: now }; TRACK.log.push({ t: +((now - TRACK.t0) / 1000).toFixed(1), ...row }); if (TRACK.log.length > 400) TRACK.log.shift(); } }
}
function trackPanel(on) {   /* 3D.58 the live tracker panel (Settings > Animation tracker) */
  TRACK.on = !!on; let el = document.getElementById('trkPanel'); if (!on) { if (el) el.remove(); clearInterval(TRACK.iv); return; }
  if (!el) { el = document.createElement('div'); el.id = 'trkPanel'; el.style.cssText = 'position:fixed;left:6px;top:calc(env(safe-area-inset-top) + 64px);z-index:60;background:rgba(20,16,12,.86);color:#f3ead8;font:11px/1.35 ui-monospace,Menlo,monospace;padding:6px 8px;border-radius:8px;max-width:min(94vw,430px);pointer-events:auto';
    el.innerHTML = '<div style="display:flex;gap:6px;align-items:center;margin-bottom:4px"><b>Animation tracker</b><span id="trkN" style="opacity:.7"></span><span style="flex:1"></span><button id="trkCopy" style="font:inherit;padding:2px 8px;border-radius:6px;border:0">Copy log</button><button id="trkClr" style="font:inherit;padding:2px 8px;border-radius:6px;border:0">Clear</button></div><div id="trkRows" style="white-space:pre;overflow-x:auto"></div>'; document.body.appendChild(el);
    el.querySelector('#trkClr').onclick = () => { TRACK.log.length = 0; };
    el.querySelector('#trkCopy').onclick = () => { const txt = 'Zombie Haven animation log (build ' + ((window.ZH && ZH.BUILD_TAG) || document.title) + ', ' + new Date().toISOString() + ', ' + navigator.userAgent + ')\n' + TRACK.log.map((e) => JSON.stringify(e)).join('\n'); const done = () => { const b = el.querySelector('#trkCopy'); b.textContent = 'Copied ' + TRACK.log.length; setTimeout(() => (b.textContent = 'Copy log'), 1500); };
      if (navigator.clipboard && navigator.clipboard.writeText) navigator.clipboard.writeText(txt).then(done, () => fallback()); else fallback();
      function fallback() { const ta = document.createElement('textarea'); ta.value = txt; ta.style.cssText = 'position:fixed;inset:10%;z-index:99;font-size:10px'; document.body.appendChild(ta); ta.select(); try { document.execCommand('copy'); done(); } catch (e) { /* */ } ta.onblur = () => ta.remove(); } };
    el.querySelector('#trkRows').onclick = (ev) => { const r = ev.target.closest('[data-n]'); if (!r) return; const s = G.S.sv.find((q) => q.name === r.dataset.n); if (s && s.w && window.ZH && ZH.centerOn) ZH.centerOn(s.w.x, s.w.y); };
  }
  const esc = (t) => String(t).replace(/[<>&]/g, (c) => ({ '<': '&lt;', '>': '&gt;', '&': '&amp;' }[c]));
  clearInterval(TRACK.iv); TRACK.iv = setInterval(() => { const rows = el.querySelector('#trkRows'); if (!rows) return; el.querySelector('#trkN').textContent = TRACK.log.length + ' flagged · ' + Math.round(window.ZH3D.fps || 0) + ' fps';
    rows.innerHTML = G.S.sv.map((s) => { const r = TRACK.rows.get(s); if (!r) return ''; return `<div data-n="${esc(s.name)}" style="cursor:pointer;${r.flag ? 'color:#ff8a7a' : ''}">${esc(s.name.split(' ')[0]).padEnd(7)} ${esc(r.mode).padEnd(10).slice(0, 10)} ${esc(r.clip).padEnd(15).slice(0, 15)} body ${r.v.toFixed(2)} feet ${r.foot.toFixed(2)}${r.flag ? ' ⚠ ' + esc(r.flag) : ''}</div>`; }).join('') || 'Nobody visible'; }, 250);
}
const CLIP_SFX = { work_chop: [.55, 'chop'], work_hammer: [.45, 'hammer'] };


// ---------------------------------------------------------------- comic ink (V3D.19): bold, even outlines like a graphic novel
// Two passes: the scene (colour + depth) and a normals pass (same scene, MeshNormalMaterial). A full-screen shader then inks
// (1) depth jumps: every silhouette against what is behind it, and (2) normal breaks: roof/wall corners, box edges, folds.
// Lines are a fixed width on screen (no wobble), dark cocoa, and fade a little with distance so far crowds stay readable.
// The old inverted-hull outlines are hidden while ink is on, so edges are not doubled. Toggle: the pen button, ?ink=0/1.
let INK = (() => { const q = new URLSearchParams(location.search).get('ink'); if (q === '0' || q === '1') return q === '1'; try { return localStorage.getItem('zh3d_ink') !== '0'; } catch (e) { return true; } })();
let inkRT = null, nrmRT = null;
const inkCam = new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1), inkScene = new THREE.Scene();
const nrmMat = new THREE.MeshNormalMaterial();
const inkMat = new THREE.ShaderMaterial({
  uniforms: { tCol: { value: null }, tDep: { value: null }, tNrm: { value: null }, px: { value: new THREE.Vector2() }, near: { value: .1 }, far: { value: 400 },
    r: { value: 1.5 }, dJump: { value: .14 }, nBreak: { value: .5 }, strength: { value: .9 }, ink: { value: new THREE.Color(0x22160f) } },
  vertexShader: 'varying vec2 vUv; void main(){ vUv = uv; gl_Position = vec4(position.xy, 0., 1.); }',
  fragmentShader: `uniform sampler2D tCol, tDep, tNrm; uniform vec2 px; uniform float near, far, r, dJump, nBreak, strength; uniform vec3 ink; varying vec2 vUv;
    float D(vec2 u){ return near + texture2D(tDep, u).x * (far - near); }
    vec3 N(vec2 u){ return texture2D(tNrm, u).xyz * 2. - 1.; }
    void main(){
      float c = D(vUv); vec3 nc = N(vUv); float cs = step(.5, length(nc));
      float de = 0., ne = 0.;
      for (int i = 0; i < 8; i++) {
        float a = float(i) * 0.785398;
        vec2 o = vec2(cos(a), sin(a)) * r * px;
        float d = D(vUv + o);
        vec3 n = N(vUv + o); float solid = step(.5, length(n));   // grass, leaves and effects are left out of the normals pass: they never ink
        de = max(de, (c - d) * solid);                 // a nearer solid surface next to this pixel: the line sits just outside the object
        ne = max(ne, (1. - dot(nc, n)) * step(abs(d - c), 0.6) * solid * cs);   // a crease inside one solid surface
      }
      float e = max(smoothstep(dJump, dJump * 1.8, de), smoothstep(nBreak, nBreak * 1.6, ne));
      vec4 col = texture2D(tCol, vUv);
      gl_FragColor = vec4(mix(col.rgb, ink, e * strength), 1.);
      #include <colorspace_fragment>
    }`,
  depthTest: false, depthWrite: false,
});
inkScene.add(new THREE.Mesh(new THREE.PlaneGeometry(2, 2), inkMat));
const _db = new THREE.Vector2();
let hullsShown = true, nrmSkip = [], nrmSkipT = 0;
function showHulls(v, force) { if (hullsShown === v && !force) return; hullsShown = v; scene.traverse((o) => { if (o.userData.hull) o.visible = v; }); }
function nrmSkipList() {   // things that must not go into the normals pass: sprites, particles, lines, see-through and cut-out leaves
  const l = []; scene.traverse((o) => { if (!o.visible) return; const m = o.material; if (o.userData.noInk || o.isSprite || o.isPoints || o.isLine || (m && (m.transparent || m.alphaTest > 0 || (Array.isArray(m) && m.some((x) => x.transparent))))) l.push(o); }); return l;
}
function renderInk() {
  renderer.getDrawingBufferSize(_db);
  if (!inkRT || inkRT.width !== _db.x || inkRT.height !== _db.y) {
    if (inkRT) { inkRT.dispose(); nrmRT.dispose(); }
    inkRT = new THREE.WebGLRenderTarget(_db.x, _db.y, { type: THREE.HalfFloatType, samples: 4 });
    inkRT.depthTexture = new THREE.DepthTexture(_db.x, _db.y); inkRT.depthTexture.type = THREE.UnsignedIntType;
    nrmRT = new THREE.WebGLRenderTarget(_db.x, _db.y, { type: THREE.UnsignedByteType });
    nrmRT.depthTexture = new THREE.DepthTexture(_db.x, _db.y); nrmRT.depthTexture.type = THREE.UnsignedIntType;   // depth of the inkable things only
  }
  showHulls(false);
  renderer.setRenderTarget(inkRT); renderer.render(scene, cam);
  // normals pass: same camera, no shadows, background black
  if ((nrmSkipT -= 1) <= 0) { showHulls(false, true); nrmSkip = nrmSkipList(); nrmSkipT = 20; }   // new buildings and actors appear all the time
  const bg = scene.background, fog = scene.fog, cc = renderer.getClearColor(new THREE.Color()), ca = renderer.getClearAlpha(), su = renderer.shadowMap.needsUpdate; scene.background = null; scene.fog = null; renderer.shadowMap.needsUpdate = false;
  for (const o of nrmSkip) o.visible = false;
  scene.overrideMaterial = nrmMat; renderer.setRenderTarget(nrmRT); renderer.setClearColor(0x000000, 1); renderer.clear(); renderer.render(scene, cam);
  scene.overrideMaterial = null; for (const o of nrmSkip) o.visible = true;
  scene.background = bg; scene.fog = fog; renderer.setClearColor(cc, ca); renderer.shadowMap.needsUpdate = su;
  renderer.setRenderTarget(null);
  const u = inkMat.uniforms, ppu = (G.BASE_TW / 2 * G.cam.z) / (T / SQ2);   // CSS px per world unit
  u.tCol.value = inkRT.texture; u.tDep.value = nrmRT.depthTexture; u.tNrm.value = nrmRT.texture; u.px.value.set(1 / _db.x, 1 / _db.y);
  u.near.value = cam.near; u.far.value = cam.far; u.r.value = Math.max(1.2, Math.min(3, ppu * .018)) * dpr;
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
  let dirty = buildGround(); dirty = buildWalls() || dirty; dirty = buildTraps() || dirty; dirty = syncBuildings() || dirty; dirty = buildForest() || dirty;
  if (dirty) { renderer.shadowMap.needsUpdate = true; nrmSkipT = 0; }   /* 3D.58: rebuilt grass is left out of the ink pass at once (it flashed an outline for up to 20 frames) */
  light(((G.S.hour || 12) % 24) + (G.tick ? (G.tick() % 1000) / 1000 : 0));   // V3D.13: fractional hour, so dusk and dawn fade smoothly
  _fr.setFromProjectionMatrix(_pm.multiplyMatrices(cam.projectionMatrix, cam.matrixWorldInverse));
  zCount = G.S.z.length;
  const sp = G.simSpeed ? G.simSpeed() : 1, adt = G.paused && G.paused() ? 0 : dt * sp;
  syncPeople(adt, true); syncZombies(adt, true); syncBags(dt); syncCrates(dt); syncSites(dt * (G.simSpeed ? G.simSpeed() : 1)); syncGhost(); fireT += dt; syncFires(dt, fireT); syncRain(dt); syncSnow(dt);
  if (INK) renderInk(); else { showHulls(true); renderer.render(scene, cam); }
  frames++; fpsT += dt;
  if (fpsT > 1) { const fps = frames / fpsT; frames = 0; fpsT = 0; const nd = fps < 45 ? Math.max(1, dpr - .25) : fps > 57 ? Math.min(DPR_MAX, dpr + .125) : dpr; if (nd !== dpr) { dpr = nd; renderer.setPixelRatio(dpr); size = [0, 0]; } window.ZH3D.fps = fps; }
}
// ---------------------------------------------------------------- portraits (V3D.12): the People page's chest-up shots
// rendered from the real 3D survivor in their outfit, weapon and armour (cached per look)
const portraits = new Map(); let pRig = null;
function inkEdge(d, W, H, r) {   // a dark outline r px wide just outside the opaque figure (comic look for card pictures)
  const a = new Uint8Array(W * H); for (let i = 0; i < W * H; i++) a[i] = d[i * 4 + 3] > 100 ? 1 : 0;
  for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) { const i = y * W + x; if (a[i]) continue; let hit = false;
    for (let dy = -r; dy <= r && !hit; dy++) { const yy = y + dy; if (yy < 0 || yy >= H) continue; for (let dx = -r; dx <= r; dx++) { const xx = x + dx; if (xx < 0 || xx >= W || dx * dx + dy * dy > r * r) continue; if (a[yy * W + xx]) { hit = true; break; } } }
    if (hit) { d[i * 4] = 0x22; d[i * 4 + 1] = 0x16; d[i * 4 + 2] = 0x0f; d[i * 4 + 3] = 255; } }
}
function snapActor(s, o) {   // o: { clip, t, half, dy, yaw, W, H, key }: a transparent PNG of the survivor in a pose
  if (!ready || !MALE) return null;
  const wid = s.eq && s.eq.weapon, model = o.noWeapon ? null : wid ? WMODEL[wid] || 'bat' : null, cls = model ? WCLASS[model] : null;
  const arm = !!(s.eq && s.eq.armor && G.ITEMS[s.eq.armor] && (G.ITEMS[s.eq.armor].def || 0) >= 7), lk = s.id ? look2(s) : { sk: 0, hr: 0, hs: 0 }, key = o.zt ? 'z|' + o.key : [o.key, s.job, model, arm ? 1 : 0, (s.eq && s.eq.head) || '', (s.eq && s.eq.armor) || '', (s.eq && s.eq.acc) || '', o.face || '', lk.sk, lk.hr, lk.hs, s.id && isFemale(s) ? 'f' : 'm'].join('|');
  if (portraits.has(key)) return portraits.get(key);
  const W = o.W || 256, H = o.H || 256;
  if (!pRig) { const sc = new THREE.Scene(); sc.add(new THREE.HemisphereLight(0xfff4dc, 0x6a5a44, 1.35)); const kl = new THREE.DirectionalLight(0xfff0d8, 1.7); kl.position.set(1.4, 2.2, 2.6); sc.add(kl);
    pRig = { sc, cam: new THREE.OrthographicCamera(-1, 1, 1, -1, .1, 50), rts: {} }; }
  const rk = W + 'x' + H; if (!pRig.rts[rk]) { const rt = new THREE.WebGLRenderTarget(W, H, { samples: 4 }); rt.texture.colorSpace = THREE.SRGBColorSpace; pRig.rts[rk] = { rt, buf: new Uint8Array(W * H * 4), cv: Object.assign(document.createElement('canvas'), { width: W, height: H }) }; }
  const R = pRig.rts[rk], a = o.zt ? ((MALE.v2 && (zombieOwn(o.zt) || zombieV2(o.zt, false, 0))) || new Actor(LITE, zombieMaterial(o.zt, 0), true)) : (s.id && MALE.v2 && FEMALE3D && isFemale(s) ? newPerson(s) : new Actor(MALE, jobMaterial(s.job, o.face || 'neutral', s.id ? lookOf(s) : null), false, null)); if (!o.zt) { const hid = s.eq && s.eq.head, shape = hid && G.ITEMS[hid] && G.ITEMS[hid].shape; addHat(a, shape ? HAT_SHAPE[shape] : s.job, !!shape); } if (!o.zt) { setClothing(a, s); setAccessory(a, s.eq && s.eq.acc); setHair(a, s); }   /* 3D.28: the equipped hat shows in the picture */ scene.remove(a.o); scene.remove(a.sh); pRig.sc.add(a.o);
  a.setWeapon(o.zt ? null : model); a.setArmor(o.zt ? false : arm); a.play(o.clip ? o.clip(cls) : cls === 'gun' ? 'gun_hold_idle' : cls ? 'melee_hold_idle' : 'idle'); a.mixer.update(o.t ?? .35); a.o.rotation.y = o.yaw ?? -.5; if (o.bend) { const B = {}; a.o.traverse((n) => { if (n.isBone) B[n.name] = n; }); o.bend(B); } a.o.updateMatrixWorld(true);
  let head = null; a.o.traverse((n) => { if (n.isBone && n.name === 'head') head = n; }); const hp = new THREE.Vector3(); head.getWorldPosition(hp);
  const c = pRig.cam, hh = o.half, hw = hh * W / H, tgt = new THREE.Vector3(0, o.dy === undefined ? hp.y - .03 : o.dy, 0); if (o.dy === undefined) { tgt.x = hp.x; tgt.z = hp.z; }
  c.left = -hw; c.right = hw; c.top = hh; c.bottom = -hh; c.updateProjectionMatrix(); c.position.copy(tgt).add(new THREE.Vector3(0, .25, 5)); c.lookAt(tgt);
  const prevT = renderer.getRenderTarget(), prevC = renderer.getClearColor(new THREE.Color()), prevA = renderer.getClearAlpha();
  renderer.setRenderTarget(R.rt); renderer.setClearColor(0x000000, 0); renderer.clear(); renderer.render(pRig.sc, c); renderer.readRenderTargetPixels(R.rt, 0, 0, W, H, R.buf);
  renderer.setRenderTarget(prevT); renderer.setClearColor(prevC, prevA); pRig.sc.remove(a.o);
  const g2 = R.cv.getContext('2d'), im = g2.createImageData(W, H), row = W * 4; for (let y = 0; y < H; y++) im.data.set(R.buf.subarray((H - 1 - y) * row, (H - y) * row), y * row);
  if (MALE.v2) inkEdge(im.data, W, H, Math.max(2, Math.round(W / 96)));   // the hull is off on the #v2 models: draw a clean outline around the figure
  g2.putImageData(im, 0, 0); const url = R.cv.toDataURL('image/png'); portraits.set(key, url); return url;
}
// V3D.24 building pictures for the Build menu and panels: the same coded model as on the map, three-quarter view, inked
const bthumbs = new Map();
function buildingThumb(type, W = 208, H = 156) {
  const D = G.DEFS[type]; if (!ready || !D) return null; const key = type + '|' + W + 'x' + H; if (bthumbs.has(key)) return bthumbs.get(key);
  if (!pRig) { const sc = new THREE.Scene(); sc.add(new THREE.HemisphereLight(0xfff4dc, 0x6a5a44, 1.35)); const kl = new THREE.DirectionalLight(0xfff0d8, 1.7); kl.position.set(1.4, 2.2, 2.6); sc.add(kl); pRig = { sc, cam: new THREE.OrthographicCamera(-1, 1, 1, -1, .1, 50), rts: {} }; }
  const rk = W + 'x' + H; if (!pRig.rts[rk]) { const rt = new THREE.WebGLRenderTarget(W, H, { samples: 4 }); rt.texture.colorSpace = THREE.SRGBColorSpace; pRig.rts[rk] = { rt, buf: new Uint8Array(W * H * 4), cv: Object.assign(document.createElement('canvas'), { width: W, height: H }) }; }
  const R = pRig.rts[rk], g = makeBuilding({ type, x: 0, y: 0, w: D.w, h: D.h, rot: 0 }); g.position.set(0, 0, 0); g.updateMatrixWorld(true);
  const bb = new THREE.Box3().setFromObject(g), ctr = bb.getCenter(new THREE.Vector3()), sz = bb.getSize(new THREE.Vector3());
  const c = pRig.cam, dir = new THREE.Vector3(.75, .85, 1).normalize(); c.position.copy(ctr).addScaledVector(dir, 20); c.lookAt(ctr);
  c.updateMatrixWorld(true); const inv = c.matrixWorldInverse; let mx = 0, my = 0;
  for (const x of [bb.min.x, bb.max.x]) for (const y of [bb.min.y, bb.max.y]) for (const z of [bb.min.z, bb.max.z]) { const v = new THREE.Vector3(x, y, z).applyMatrix4(inv); mx = Math.max(mx, Math.abs(v.x)); my = Math.max(my, Math.abs(v.y)); }
  const hh = Math.max(my, mx * H / W) * 1.08 + .05, hw = hh * W / H; c.left = -hw; c.right = hw; c.top = hh; c.bottom = -hh; c.updateProjectionMatrix();
  pRig.sc.add(g); const prevT = renderer.getRenderTarget(), prevC = renderer.getClearColor(new THREE.Color()), prevA = renderer.getClearAlpha();
  renderer.setRenderTarget(R.rt); renderer.setClearColor(0x000000, 0); renderer.clear(); renderer.render(pRig.sc, c); renderer.readRenderTargetPixels(R.rt, 0, 0, W, H, R.buf);
  renderer.setRenderTarget(prevT); renderer.setClearColor(prevC, prevA); pRig.sc.remove(g);   // (geometry is not freed: the tent / house GLB clones share theirs with the map)
  const g2 = R.cv.getContext('2d'), im = g2.createImageData(W, H), row = W * 4; for (let y = 0; y < H; y++) im.data.set(R.buf.subarray((H - 1 - y) * row, (H - y) * row), y * row);
  inkEdge(im.data, W, H, Math.max(2, Math.round(W / 90))); g2.putImageData(im, 0, 0); const url = R.cv.toDataURL('image/png'); bthumbs.set(key, url); return url;
}
// People page: framed from the hair down to the chest, turned so the weapon hand is away from the face
const portraitOf = (s) => snapActor(s, { key: 'bust', half: .46 });
// event-card stage figures, full body: wave (arriving), cheer, ready (danger), down (mourning)
const WAVE = (k) => (B) => {   // right arm up beside the head, forearm swinging (k: 0 / 1)
  const ua = B.upperarmR, fa = B.forearmR; if (!ua) return;
  ua.rotateOnWorldAxis(new THREE.Vector3(0, 0, 1), k ? WAVE_A.z1 : WAVE_A.z);   // the raised arm swings between two angles
  if (fa) fa.rotateOnWorldAxis(new THREE.Vector3(0, 0, 1), WAVE_A.f0);
};
const WAVE_A = { z: -2.05, z1: -2.65, f0: .35 };
const POSE = { wave1: { clip: () => 'idle', t: .3, face: 'happy', noWeapon: true, yaw: 0, bend: WAVE(0) }, wave2: { clip: () => 'idle', t: .3, face: 'happy', noWeapon: true, yaw: 0, bend: WAVE(1) }, wave: { clip: () => 'cheer', t: .25, face: 'happy', noWeapon: true, yaw: .35 }, cheer: { clip: () => 'cheer', t: .5, face: 'happy', noWeapon: true, yaw: -.35 },
  walkA: { clip: (c) => (c === 'gun' ? 'gun_hold_walk' : c ? 'melee_hold_walk' : 'walk'), t: .12, face: 'neutral', yaw: Math.PI / 2 }, walkB: { clip: (c) => (c === 'gun' ? 'gun_hold_walk' : c ? 'melee_hold_walk' : 'walk'), t: .52, face: 'neutral', yaw: Math.PI / 2 },   // V3D.18 the exploration bar
  ready: { clip: (c) => (c === 'gun' ? 'gun_hold_idle' : c ? 'melee_hold_idle' : 'idle'), t: .3, face: 'angry', yaw: -.4 }, down: { clip: () => 'idle', t: .3, face: 'ko', noWeapon: true, yaw: 0 } };
window.__WAVE_A = WAVE_A;
const figureOf = (s, pose = 'wave') => snapActor(s, { key: 'fig_' + pose, half: pose === 'wave' || pose === 'cheer' ? .78 : .66, dy: pose === 'wave' || pose === 'cheer' ? .74 : .62, W: 192, H: 256, ...POSE[pose] });
// V3D.17 boss cards: the boss itself walking in (two frames of its walk cycle, swapped by CSS)
const zombieFigure = (zt, k = 0, run = false) => snapActor({}, { zt, key: 'zfig_' + zt + (run ? 'r' : 'w') + k, clip: () => (run ? 'zombie_run' : zt === 'bloated' && ZSRC.bloated ? 'bloated_walk' : 'zombie_walk'), t: k ? .62 : .18, yaw: -1.05, half: .82, dy: .66, W: 192, H: 256 });
window.ZH3D = { track: TRACK, trackPanel, people: () => people, zeds: () => zeds, bthumb: buildingThumb, snap: (s, o) => snapActor(s, o), scene: () => scene, actors: () => [...people.values(), ...zeds.values()], snow: SNOW, portrait: portraitOf, figure: figureOf, zombieFigure, clearPics: () => portraits.clear(), frame, ready: false, fps: 0, setInk: (v) => { INK = !!v; }, inkMat };
inkButton();
(async () => {
  const base = 'assets/characters/ai3d_male/realtime/';
  const [m, l, t] = await Promise.all([load(CHAR_V2 ? 'assets/characters/ai3d_v2/survivor_v2.glb' : base + 'male_mid.glb'), load(base + 'male_lite.glb'), load('assets/buildings/ai3d/medic/medical_tent_realtime.glb').catch(() => null)]);
  for (const src of [m, l]) { src.body = null; src.scene.traverse((o) => { if (o.isSkinnedMesh && o.name === 'body') src.body = o; }); if (!src.body) src.scene.traverse((o) => { if (o.isSkinnedMesh && !src.body) src.body = o; }); }
  m.bodyImage = m.body.material.map && m.body.material.map.image;
  toonScene(m.scene, null, CHAR_V2); toonScene(l.scene);
  MALE = m; LITE = l; MALE.body = m.body; MALE.bodyImage = m.bodyImage; MALE.v2 = CHAR_V2;
  if (CHAR_V2) { try { const f = await load('assets/characters/ai3d_v2/survivor_v2_f.glb'); f.scene.traverse((o) => { if (o.isSkinnedMesh && !f.body) f.body = o; }); toonScene(f.scene, null, true); FEMALE3D = f; } catch (e) { console.warn('female model', e); } }
  const il = new THREE.ImageLoader();
  await Promise.all(['angry', 'hurt', 'ko', 'happy'].map((e) => il.loadAsync(base + 'male_mid_face_' + e + '.png').then((img) => { FACE_OVL[e] = imgTex(img); }).catch(() => {})));
  if (CHAR_V2) await Promise.all(Object.entries(ZMODEL).map(async ([k, d]) => { try { const g = await load(d.url); g.scene.traverse((o) => { if (o.isSkinnedMesh && !g.body) g.body = o; }); toonScene(g.scene, null, true); g.stride = d.stride; g.v2 = true; g.crawl = !!d.crawl; ZSRC[k] = g; } catch (e) { console.warn('zombie model', k, e); } }));
  if (CHAR_V2) for (const [src, k] of [[MALE, 'm'], [FEMALE3D, 'f']]) if (src) src.zTex2 = (await Promise.all([0, 1, 2, 3].map((i) => il.loadAsync('assets/characters/ai3d_v2/zombie_' + k + '_' + i + '.webp?e=1').then(v2Tex).catch(() => null)))).filter(Boolean);
  LITE.zTex = (await Promise.all([0, 1, 2, 3].map((i) => il.loadAsync(base + 'male_lite_zombie_' + i + '.webp').then(imgTex).catch(() => null)))).filter(Boolean);
  if (t) { toonScene(t.scene); t.scene.traverse((o) => { if (o.isMesh) o.castShadow = true; }); tentScene = t.scene; }
  await Promise.all(Object.entries(BGLB).map(async ([k, url]) => { try { const r = await load(url); toonScene(r.scene); r.scene.traverse((o) => { if (o.isMesh) o.castShadow = true; }); const sz = new THREE.Box3().setFromObject(r.scene).getSize(new THREE.Vector3()); glbB[k] = { scene: r.scene, sx: sz.x, sz: sz.z }; } catch (e) { console.warn('building model', k, e); } }));
  bGroups.forEach((v) => scene.remove(v.g)); bGroups.clear();
  syncDoors(); ready = true; window.ZH3D.ready = true;
})().catch((e) => { console.error('3D load failed', e); const b = document.getElementById('crash'); if (b) { b.style.display = 'block'; b.textContent = '3D: ' + e.message; } });
