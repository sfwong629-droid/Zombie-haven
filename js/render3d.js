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
  [8, 0x9fb7c2, 0xfff4dc, 1.25, 0xfff0d0, 1.9, 0], [17, 0x9fb7c2, 0xfff4dc, 1.25, 0xfff0d0, 1.9, 0], [19, 0xd99a6c, 0xffc896, 1, 0xff9a5a, 1.4, .6],
  [20.5, 0x33405c, 0x8494c4, 1.18, 0xaabfe6, .72, 1], [24, 0x33405c, 0x8494c4, 1.18, 0xaabfe6, .72, 1]];   // V3D.15: nights brighter again (.95 / .55 -> 1.18 / .72)   // V3D.12: nights brighter (were .7 / .35)
const cA = new THREE.Color(), cB = new THREE.Color();
let glowNow = -1;
function light(h) {
  let i = 0; while (i < KEYS.length - 2 && h >= KEYS[i + 1][0]) i++;
  const a = KEYS[i], b = KEYS[i + 1], u = Math.max(0, Math.min(1, (h - a[0]) / (b[0] - a[0] || 1)));
  const mix = (k) => cA.set(a[k]).lerp(cB.set(b[k]), u).clone(), num = (k) => a[k] + (b[k] - a[k]) * u;
  scene.background = mix(1); hemi.color.copy(mix(2)); hemi.intensity = num(3); sun.color.copy(mix(4)); sun.intensity = num(5);
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
const hash = (x, y) => { let h = (x * 374761393 + y * 668265263) | 0; h = (h ^ (h >>> 13)) * 1274126177 | 0; return ((h ^ (h >>> 16)) >>> 0) / 4294967296; };
const regrow = (x, y) => {   // town tiles where grass creeps back: near the town edge and in a few clumps
  const B = G.Wd.BUILD, d = Math.min(x - B.x0, B.x1 - x, y - B.y0, B.y1 - y), c = hash(Math.floor(x / 3) * 7 + 1, Math.floor(y / 3) * 5 + 3);
  return (d === 0 && hash(x * 5, y * 3) < .6) || (d === 1 && hash(x * 3, y * 7) < .3) || (c < .22 && hash(x, y * 11) < .55);
};
const RU = { uRoad: { value: null }, uRO: { value: new THREE.Vector2() }, uRN: { value: new THREE.Vector2(1, 1) }, uT: { value: T } };
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
        g = mix(g, g * .82, rim);                                                        // darker trodden edge
        g = mix(g, road, rw);
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
  const W = G.world, wr = G.wreckSpots(), key = groundKey + '|' + W.buildings.length + '|' + W.walls.size + '|' + wr.length + '|' + season();
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
function buildingKey(b) { return [b.type, b.x, b.y, b.w, b.h, (b.rot | 0) & 3, b.burnt ? 1 : 0, b.wrecked ? 1 : 0].join(','); }
function makeBuilding(b) {
  const g = new THREE.Group(), odd = (b.rot | 0) & 1, w = (odd ? b.h : b.w) * T, d = (odd ? b.w : b.h) * T;
  if (b.type === 'medic' && tentScene) {
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
function makeSite(st) {
  const W = st.w * T, D = st.h * T, cx = (st.x + st.w / 2) * T, cz = (st.y + st.h / 2) * T, g = new THREE.Group(), wood = toon('#b98a56'), dark = toon('#8a5f36');
  const plot = new THREE.Mesh(new THREE.PlaneGeometry(W + .3, D + .3).rotateX(-Math.PI / 2), toon('#9c7444')); plot.position.y = .015; plot.receiveShadow = true; g.add(plot);
  const pole = new THREE.CylinderGeometry(.045, .05, 2.3, 6).translate(0, 1.15, 0), H = 2.3;
  for (const [sx, sz] of [[-1, -1], [1, -1], [-1, 1], [1, 1]]) { const m = new THREE.Mesh(pole, wood); m.position.set(sx * (W / 2 - .05), 0, sz * (D / 2 - .05)); m.castShadow = true; g.add(m); addHull(m, .018); }
  for (const y of [.85, 1.7]) for (const [len, rx, px, pz] of [[W, 0, 0, -D / 2 + .05], [W, 0, 0, D / 2 - .05], [D, 1, -W / 2 + .05, 0], [D, 1, W / 2 - .05, 0]]) {
    const b = new THREE.Mesh(new THREE.BoxGeometry(len, .07, .09), y > 1 ? wood : dark); b.position.set(px, y, pz); if (rx) b.rotation.y = Math.PI / 2; b.castShadow = true; g.add(b); addHull(b, .015); }
  const diag = new THREE.Mesh(new THREE.BoxGeometry(Math.hypot(W, .85), .05, .06), dark); diag.position.set(0, .43, D / 2 - .05); diag.rotation.z = Math.atan2(.85, W); g.add(diag);
  for (let i = 0; i < 3; i++) { const pl = new THREE.Mesh(new THREE.BoxGeometry(.9, .07, .22), i % 2 ? dark : wood); pl.position.set(W / 2 + .35, .04 + i * .075, D / 2 - .2 - i * .03); pl.rotation.y = .2 * i; pl.castShadow = true; g.add(pl); addHull(pl, .012); }
  g.position.set(cx, 0, cz); scene.add(g);
  const model = makeBuilding(st); model.scale.y = .05; scene.add(model);
  return { g, model, puffs: [], next: 0 };
}
function syncSites(dt) {
  const seen = new Set();
  for (const st of G.S.sites || []) {
    seen.add(st); let e = siteMeshes.get(st); if (!e) { e = makeSite(st); siteMeshes.set(st, e); }
    const k = 1 - st.cons / st.dur; e.model.scale.y = .05 + .95 * k;
    e.next -= dt; if (e.next <= 0) { e.next = .35 + Math.random() * .4; const sp = new THREE.Sprite(dustMat.clone()); sp.position.set(e.g.position.x + (Math.random() - .5) * st.w * T, .2, e.g.position.z + (Math.random() - .5) * st.h * T); sp.scale.setScalar(.4); scene.add(sp); e.puffs.push({ sp, t: 0 }); }
    for (let i = e.puffs.length - 1; i >= 0; i--) { const q = e.puffs[i]; q.t += dt; q.sp.position.y += dt * .5; q.sp.scale.setScalar(.4 + q.t * .7); q.sp.material.opacity = .55 * Math.max(0, 1 - q.t / 1.4); if (q.t > 1.4) { scene.remove(q.sp); q.sp.material.dispose(); e.puffs.splice(i, 1); } }
  }
  for (const [st, e] of siteMeshes) if (!seen.has(st)) { scene.remove(e.g); scene.remove(e.model); for (const q of e.puffs) scene.remove(q.sp); siteMeshes.delete(st); }
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
const JOB_SHIRT = { Civilian: null, Farmer: '#6f8a3a', Medic: '#8fc4d8', Engineer: '#d9822e', Cook: '#f2eadb', Scavenger: '#8a6a48', Guard: '#5d6b44', 'Police Officer': '#2f4a7a', SWAT: '#2a2f36', Raider: '#7a2e28', Trader: '#6b4f8c' };
const JOB_PANTS = { Guard: '#4a5236', 'Police Officer': '#1f2a44', SWAT: '#1d2126', Raider: '#3a2a22', Cook: '#3a3a3a', Trader: '#3b3346' };
const ZTINT = { walker: [.62, .86, .55], runner: [.75, .8, .5], crawler: [.6, .7, .55], bloated: [.7, .85, .45], spitter: [.8, .9, .4], brute: [.55, .7, .5], boss: [.7, .5, .8] };
const ZSC = { bloated: 1.18, brute: 1.32, crawler: .85, boss: 1.6 };
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
  try { if (location.hash === '#v2') localStorage.setItem('zh_char', 'v2'); if (location.hash === '#v1') localStorage.removeItem('zh_char'); } catch (e) {}
  let ls = false; try { ls = localStorage.getItem('zh_char') === 'v2'; } catch (e) {}
  return new URLSearchParams(location.search).get('char') === 'v2' || location.hash === '#v2' || ls; })();   // V3D.19 test: the new simple 1:6 survivor (Hunyuan) for everyone
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
const ZSKIN_TINT = { spitter: [.88, 1, .72], bloated: [.95, 1, .85], boss: [.85, .7, .95], brute: [.9, .9, .9] };
const zMats = {};
// V3D.20 (#v2): zombies wear the new male / female bodies with zombie skins (tools/art/b3d/zombie_tex_v2.py)
function v2Tex(img) { const t = imgTex(img); t.generateMipmaps = true; t.minFilter = THREE.LinearMipmapLinearFilter; return t; }
// V3D.21: each zombie type gets its own Hunyuan model when there is one (ZMODEL); the rest wear reskinned survivor bodies
const ZMODEL = { walker: { url: 'assets/characters/ai3d_v2/zombie_walker.glb', stride: { zombie_walk: .525, zombie_run: 1.197 } },
  runner: { url: 'assets/characters/ai3d_v2/zombie_runner.glb', stride: { zombie_walk: .538, zombie_run: 1.273 } },
  brute: { url: 'assets/characters/ai3d_v2/zombie_brute.glb', stride: { zombie_walk: .540, zombie_run: 1.264 } },
  bloated: { url: 'assets/characters/ai3d_v2/zombie_bloated.glb', stride: { bloated_walk: .395 } } }, ZSRC = {};
function zombieOwn(type) {
  const src = ZSRC[type]; if (!src) return null;
  const t = ZSKIN_TINT[type] || [1, 1, 1], key = 'own|' + type;
  const m = zMats[key] ||= nightLit(new THREE.MeshToonMaterial({ map: src.body.material.map, color: new THREE.Color(...t), gradientMap: grad }), .2);
  return new Actor(src, m, true);
}
function zombieV2(type, female, v) {
  const own = Math.random() < .6 && zombieOwn(type); if (own) return own;   // 60% wear the type's own model, the rest a reskinned survivor for variety
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
  pistol: 'pistol', revolver: 'pistol', shotgun: 'rifle', rifle: 'rifle', bow: 'rifle', crossbow: 'rifle', smg: 'ak47', assault: 'ak47' };
const WCLASS = { bat: 'melee', axe: 'melee', pistol: 'pistol', rifle: 'gun', ak47: 'gun' };
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
    let dx, dz; if (faceTo) { dx = faceTo.x * T - x; dz = faceTo.y * T - z; } else if (this.last) { dx = x - this.last.x; dz = z - this.last.z; }
    if (dx !== undefined && Math.abs(dx) + Math.abs(dz) > 1e-4) { const want = Math.atan2(dx, dz); let d = want - this.yaw; d = Math.atan2(Math.sin(d), Math.cos(d)); this.yaw += d * Math.min(1, dt * 12); }
    if (this.last && dt > 0) { const v = Math.min(8, Math.hypot(x - this.last.x, z - this.last.z) / dt / scale); this.spd += (v - this.spd) * Math.min(1, dt * 5); }   // V3D.20 ground speed (model units / s) for stride matching
    this.o.position.set(x, 0, z); this.o.rotation.y = this.yaw; this.o.scale.setScalar(scale); this.last = { x, z };
    this.sh.position.set(x, .006, z); this.sh.scale.setScalar(scale);
    if (this.beam) { this.beam.position.set(x + Math.sin(this.yaw) * .25, .035, z + Math.cos(this.yaw) * .25); this.beam.rotation.y = this.yaw + Math.PI; this.beam.visible = this.o.visible && glowNow > .3; }
  }
  show(v) { this.o.visible = v; this.sh.visible = v; if (this.beam) this.beam.visible = v && glowNow > .3; }
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
    default: return null;
  }
  g.position.set(HEAD.x, 0, HEAD.z); g.rotation.x = -.06; return g;
}
const HAT_SHAPE = { bandana: 'Raider', cap: 'Police Officer', beanie: 'Scavenger', straw: 'Farmer', hard: 'Engineer', bike: 'SWAT', football: 'SWAT', army: 'Guard', riot: 'SWAT' };
function addHat(a, job, equipped = false) {   // parent to the head bone, placed at the rest pose
  if (MALE && MALE.v2) return;   // V3D.19 test model: hats are fitted to the old head
  if (!HATS_ON && !equipped) { if (a.hat) { a.hat.parent && a.hat.parent.remove(a.hat); a.hat = null; } return; }   // V3D.16: no job hats; equipped hats (the Hat slot) do show
  if (a.hat) { a.hat.parent && a.hat.parent.remove(a.hat); a.hat = null; }
  const h = hatFor(job); if (!h) return; let head = null; a.o.traverse((n) => { if (n.isBone && n.name === 'head') head = n; }); if (!head) return;
  a.o.updateMatrixWorld(true); const inv = new THREE.Matrix4().copy(a.o.matrixWorld).invert(), m = new THREE.Matrix4().multiplyMatrices(inv, head.matrixWorld).invert();
  h.updateMatrix(); h.applyMatrix4(m); head.add(h); a.hat = h;
}
const blobG = new THREE.CircleGeometry(.3, 20).rotateX(-Math.PI / 2), blobM = new THREE.MeshBasicMaterial({ color: 0x1a140c, transparent: true, opacity: .3, depthWrite: false });
const people = new Map(), zeds = new Map(), dead = new Map();
const ATTACK = new Set(['punch', 'blunt', 'shoot']);
const TOOL_OF = { work_chop: 'axe', work_hammer: 'hammer', work_dig: 'hoe', work_tinker: 'wrench', eat: 'bowl', carry_walk: 'crate', carry_idle: 'crate' };   // props shown with each everyday clip
const WORK_CLIP = { farm: 'work_dig', field: 'work_dig', water: 'work_tinker', well: 'work_tinker' };
function everyday(a, s, anim, hold) {   // returns a clip name when one of the everyday clips fits, if this model has it
  const has = (c) => !!a.acts[c], still = s.moving === false || (!s.moving && !s.path) || (a.last && a.spd < .06);   // V3D.21: not actually covering ground = standing
  if (a.name === 'pickup' && a.cur && a.cur.isRunning()) return 'pickup';   // let the pick-up finish even after the bag is gone
  let c = null;
  if (s.mode === 'work' && s.post && WORK_CLIP[s.post.type]) c = WORK_CLIP[s.post.type];
  else if (anim === 'carry') c = still ? 'carry_idle' : 'carry_walk';
  else if (still && s.mode === 'chat') c = 'talk';
  else if (still && s.mode === 'campfire') c = a.src === FEMALE3D && a.acts.sit_f ? 'sit_f' : 'sit';
  else if (still && (s.mode === 'fix' || s.mode === 'pitch')) c = 'work_hammer';
  else if (still && s.mode === 'loot') c = 'pickup';
  else if (anim === 'walk' && !hold && a.src === FEMALE3D && s.mode !== 'hide' && s.mode !== 'rescueTo') c = 'walk_f';
  return c && has(c) ? c : null;
}
function personAnim(a, s, dt) {
  const wid = s.mode === 'work' ? null : s.eq && s.eq.weapon, model = wid ? WMODEL[wid] || 'bat' : null, cls = model ? WCLASS[model] : null;
  a.setWeapon(model);
  const arm = s.eq && s.eq.armor && G.ITEMS[s.eq.armor] && (G.ITEMS[s.eq.armor].def || 0) >= 7; a.setArmor(!!arm);
  let [anim] = G.humanAnim(s, G.facing(s));
  if (anim === 'walk' && a.last && a.spd < .06) anim = 'idle';   // V3D.21: the sim can say 'walking' while they wait in place: no walking on the spot
  const hold = cls === 'gun' ? 'gun' : cls ? 'melee' : null;
  if (anim === 'collapse') { a.play('collapse', true); return; }
  const day = everyday(a, s, anim, hold); if (day) { const prop = TOOL_OF[day]; if (prop && a.w[prop]) a.setWeapon(prop); else if (day !== 'walk_f') a.setWeapon(null); a.play(day, day === 'pickup'); return; }   // V3D.19: work, rest, chat and carrying clips (models that have them)
  if (ATTACK.has(anim)) {
    if (!a.attacking) {
      const clip = anim === 'punch' || !cls ? 'punch' : anim === 'shoot' ? (cls === 'pistol' ? 'pistol_fire' : 'gun_fire') : (a.acts.melee_swing_d ? ['melee_swing_a', 'melee_swing_b', 'melee_swing_c', 'melee_swing_d'] : ['melee_swing_a', 'melee_swing_b', 'melee_swing_c'])[(Math.random() * (a.acts.melee_swing_d ? 4 : 3)) | 0];
      a.play(clip, true, true); a.attacking = true;
    }
    return;
  }
  if (a.attacking && a.cur && a.cur.isRunning()) return;    // let the strike finish
  a.attacking = false;
  if (s.mode === 'rescueCarry') { a.play('rescue'); return; }
  if (s._lvT > 24 && !s.carrying) { a.play('cheer'); return; }   // level-up: a happy jump while the LEVEL UP burst plays
  // run (empty-handed clip) when hiding, hurrying to a downed friend, or rushing a zombie bare-handed
  const rush = s.moving !== false && (s.mode === 'hide' || s.mode === 'rescueTo' || (s.mode === 'chase' && !hold));
  if (anim === 'walk' && rush) { a.play('run'); return; }
  if (anim === 'walk' || anim === 'carry') { a.play(hold ? hold + '_hold_walk' : 'walk'); return; }
  a.play(hold ? hold + '_hold_idle' : 'idle');
}
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
    { const hid = s.eq && s.eq.head, shape = hid && G.ITEMS[hid] && G.ITEMS[hid].shape; if (a.hatId !== (shape || null)) { a.hatId = shape || null; addHat(a, shape ? HAT_SHAPE[shape] : null, !!shape); } }   // V3D.16 equipped hat
    personAnim(a, s, dt); a.setMood(s.emo && s.emo.face);
    { const pushing = s.mode === 'rescueCarry' && s.carrying; if (pushing && !a.cart) a.cart = makeCart();   // the cart rolls ahead of the rescuer
      if (a.cart) { a.cart.visible = pushing; if (pushing) { a.cart.position.set(a.o.position.x + Math.sin(a.yaw) * .95, 0, a.o.position.z + Math.cos(a.yaw) * .95); a.cart.rotation.y = a.yaw; } } }
    { const wn = a.weapon && a.w[a.weapon]; if (wn) { if (!wn.userData.q0) wn.userData.q0 = wn.quaternion.clone();   // V3D.16 reload: the gun tips down and rattles
        if (s.reloadT > 0) { a.play(WCLASS[a.weapon] === 'gun' ? 'gun_hold_idle' : 'melee_hold_idle'); wn.quaternion.copy(wn.userData.q0).multiply(_rq.setFromEuler(_re.set(-.9 + .18 * Math.sin(performance.now() / 60), 0, .25))); } else wn.quaternion.copy(wn.userData.q0); } } if (a.beam && (s.mode === 'campfire' || insideBuilding3(s))) a.beam.visible = false; tickMixer(a, dt, vis);
  }
  const T = G.S.trader;   // V3D.17 the wandering trader: a survivor-style figure in purple with a straw hat and a pack
  if (T && T.w) { seen.add(T); let a = people.get(T); if (!a) { a = new Actor(MALE, jobMaterial('Trader', 'happy', { sk: 2, hr: 3 }), false, (e) => jobMaterial('Trader', e, { sk: 2, hr: 3 })); addHat(a, 'Farmer', true); a.setWeapon(null); a.setArmor(false); people.set(T, a); }
    a.show(true); a.place(T.w.x, T.w.y, null, dt); a.play(T.moving ? 'walk' : 'idle'); tickMixer(a, dt, vis); }
  for (const [s, a] of people) if (!seen.has(s)) { if (a.cart) { scene.remove(a.cart); a.cart = null; } a.dispose(); people.delete(s); }
}
function zombieAnim(a, z) {
  if (z.mode === 'zattack' || z.mode === 'zbreak' || z.mode === 'attack' || (z.mode === 'zbash' && z.moving === false)) { if (!a.attacking || !a.cur.isRunning()) { a.play(a.src === ZSRC.bloated && a.acts.bloated_attack ? 'bloated_attack' : z.type !== 'raider' && a.acts.zombie_attack ? 'zombie_attack' : 'punch', true, true); a.attacking = true; } return; }   // V3D.20 zombies claw-swipe
  a.attacking = false;
  if (z.type === 'raider') { a.play(z.moving === false ? 'melee_hold_idle' : z.mode === 'rflee' ? 'run' : 'melee_hold_walk'); return; }
  if (z.type === 'runner') { a.play('zombie_run'); return; }
  a.play(a.src === ZSRC.bloated && a.acts.bloated_walk ? 'bloated_walk' : 'zombie_walk');   // V3D.20 playback speed follows the ground speed (tickMixer); V3D.21 the bloated model waddles (arms fused to the belly)
}
function syncZombies(dt, vis) {
  const seen = new Set();
  for (const z of G.S.z) {
    if (z.hp <= 0 || !z.w) continue; seen.add(z); let a = zeds.get(z);
    if (!a) {
      if (z.type === 'raider') { a = new Actor(MALE, jobMaterial('Raider'), false, (e) => jobMaterial('Raider', e)); addHat(a, 'Raider'); const m = WMODEL[z.wpn] || 'bat'; a.setWeapon(m); a.setArmor(false); }
      else { const v = (Math.random() * 4) | 0; a = (MALE.v2 && zombieV2(z.type, FEMALE3D && Math.random() < .4, v)) || new Actor(LITE, zombieMaterial(z.type, v), true); a.setWeapon(null); a.setArmor(false); }
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
function syncCrates(dt) {
  const seen = new Set();
  for (const c of G.S.crates || []) {
    seen.add(c); let g = crateMeshes.get(c); if (!g) { g = makeCrate(); g.userData.t = 0; crateMeshes.set(c, g); }
    g.userData.t += dt; const t = Math.max(g.userData.t, ((G.tick ? G.tick() : 0) - c.t0) / 60), ch = g.userData.chute; g.position.set(c.w.x * T, 0, c.w.y * T);
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
    if (!e) { e = { g: makeBag(), t: 0, spin: Math.random() * 6 }; bagMeshes.set(b, e); }
    e.t += dt; const g = e.g; g.position.set(b.w.x * T, 0, b.w.y * T); g.rotation.y = e.spin;
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
    const bon = b.type === 'bonfire', lvl = bon ? (glowNow > .15 ? 1 : .25) : b.fire ? Math.min(1, .45 + .15 * b.fire) : b.burnt ? 0 : -1;
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
  const st = a.cur && strideOf(a); if (st) a.cur.timeScale = Math.max(.35, Math.min(3, a.spd / st));
  a.acc += dt; _sph.center.set(a.o.position.x, .6, a.o.position.z);
  const seen = _fr.intersectsSphere(_sph), every = !seen ? .25 : (a.lite && zCount > 40 ? 1 / 30 : 0);
  if (a.acc >= every) { a.mixer.update(a.acc); a.acc = 0; }
}


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
  let dirty = buildGround(); dirty = buildWalls() || dirty; dirty = syncBuildings() || dirty; dirty = buildForest() || dirty;
  if (dirty) renderer.shadowMap.needsUpdate = true;
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
  const arm = !!(s.eq && s.eq.armor && G.ITEMS[s.eq.armor] && (G.ITEMS[s.eq.armor].def || 0) >= 7), lk = s.id ? lookOf(s) : { sk: 0, hr: 0 }, key = o.zt ? 'z|' + o.key : [o.key, s.job, model, arm ? 1 : 0, o.face || '', lk.sk, lk.hr, s.id && isFemale(s) ? 'f' : 'm'].join('|');
  if (portraits.has(key)) return portraits.get(key);
  const W = o.W || 256, H = o.H || 256;
  if (!pRig) { const sc = new THREE.Scene(); sc.add(new THREE.HemisphereLight(0xfff4dc, 0x6a5a44, 1.35)); const kl = new THREE.DirectionalLight(0xfff0d8, 1.7); kl.position.set(1.4, 2.2, 2.6); sc.add(kl);
    pRig = { sc, cam: new THREE.OrthographicCamera(-1, 1, 1, -1, .1, 50), rts: {} }; }
  const rk = W + 'x' + H; if (!pRig.rts[rk]) { const rt = new THREE.WebGLRenderTarget(W, H, { samples: 4 }); rt.texture.colorSpace = THREE.SRGBColorSpace; pRig.rts[rk] = { rt, buf: new Uint8Array(W * H * 4), cv: Object.assign(document.createElement('canvas'), { width: W, height: H }) }; }
  const R = pRig.rts[rk], a = o.zt ? ((MALE.v2 && (zombieOwn(o.zt) || zombieV2(o.zt, false, 0))) || new Actor(LITE, zombieMaterial(o.zt, 0), true)) : (s.id && MALE.v2 && FEMALE3D && isFemale(s) ? newPerson(s) : new Actor(MALE, jobMaterial(s.job, o.face || 'neutral', s.id ? lookOf(s) : null), false, null)); if (!o.zt) addHat(a, s.job); scene.remove(a.o); scene.remove(a.sh); pRig.sc.add(a.o);
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
window.ZH3D = { scene: () => scene, actors: () => [...people.values(), ...zeds.values()], snow: SNOW, portrait: portraitOf, figure: figureOf, zombieFigure, clearPics: () => portraits.clear(), frame, ready: false, fps: 0, setInk: (v) => { INK = !!v; }, inkMat };
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
  if (CHAR_V2) await Promise.all(Object.entries(ZMODEL).map(async ([k, d]) => { try { const g = await load(d.url); g.scene.traverse((o) => { if (o.isSkinnedMesh && !g.body) g.body = o; }); toonScene(g.scene, null, true); g.stride = d.stride; g.v2 = true; ZSRC[k] = g; } catch (e) { console.warn('zombie model', k, e); } }));
  if (CHAR_V2) for (const [src, k] of [[MALE, 'm'], [FEMALE3D, 'f']]) if (src) src.zTex2 = (await Promise.all([0, 1, 2, 3].map((i) => il.loadAsync('assets/characters/ai3d_v2/zombie_' + k + '_' + i + '.webp?e=1').then(v2Tex).catch(() => null)))).filter(Boolean);
  LITE.zTex = (await Promise.all([0, 1, 2, 3].map((i) => il.loadAsync(base + 'male_lite_zombie_' + i + '.webp').then(imgTex).catch(() => null)))).filter(Boolean);
  if (t) { toonScene(t.scene); t.scene.traverse((o) => { if (o.isMesh) o.castShadow = true; }); tentScene = t.scene; }
  await Promise.all(Object.entries(BGLB).map(async ([k, url]) => { try { const r = await load(url); toonScene(r.scene); r.scene.traverse((o) => { if (o.isMesh) o.castShadow = true; }); const sz = new THREE.Box3().setFromObject(r.scene).getSize(new THREE.Vector3()); glbB[k] = { scene: r.scene, sx: sz.x, sz: sz.z }; } catch (e) { console.warn('building model', k, e); } }));
  bGroups.forEach((v) => scene.remove(v.g)); bGroups.clear();
  ready = true; window.ZH3D.ready = true;
})().catch((e) => { console.error('3D load failed', e); const b = document.getElementById('crash'); if (b) { b.style.display = 'block'; b.textContent = '3D: ' + e.message; } });
