// node tools/art/cut_legs.mjs IN.glb OUT.glb [frac=0.3] [u,v] [--tex=dump.webp]
// 3D.185 owner: "Crawler should have no leg". Cuts both legs off a rigged zombie GLB a little below the hip and closes each
// stump with a flat cap. Only the mesh changes: the skeleton, the skin weights and every animation clip stay exactly as they
// are, so the model keeps working with the same game code. frac = how far down the thigh the cut sits (0 hip, 1 knee).
// u,v = the texture point the two caps are coloured with (pick a dark red one; --tex writes the texture out to look for it).
import fs from 'fs';
import { NodeIO } from '@gltf-transform/core';
import { ALL_EXTENSIONS, EXTMeshoptCompression } from '@gltf-transform/extensions';
import { prune, reorder } from '@gltf-transform/functions';
import { MeshoptEncoder, MeshoptDecoder } from 'meshoptimizer';
const args = process.argv.slice(2), pos = args.filter((a) => !a.startsWith('--')), [IN, OUT] = pos, FRAC = +(pos[2] ?? .3), UVC = pos[3] ? pos[3].split(',').map(Number) : null, TEX = (args.find((a) => a.startsWith('--tex=')) || '').slice(6);
await MeshoptEncoder.ready; await MeshoptDecoder.ready;
const io = new NodeIO().registerExtensions(ALL_EXTENSIONS).registerDependencies({ 'meshopt.encoder': MeshoptEncoder, 'meshopt.decoder': MeshoptDecoder });
const doc = await io.read(IN), root = doc.getRoot();
if (TEX) { fs.writeFileSync(TEX, root.listTextures()[0].getImage()); console.log('texture written to', TEX); }
const node = root.listNodes().find((n) => n.getSkin() && n.getMesh()), skin = node.getSkin(), prim = node.getMesh().listPrimitives()[0], joints = skin.listJoints();
const wy = (n) => n.getWorldTranslation()[1], J = (re) => joints.find((n) => re.test(n.getName()));
const hip = wy(J(/^thigh\.L/)), knee = wy(J(/^shin\.L/)), cutY = hip - (hip - knee) * FRAC, legJ = new Set(joints.map((n, i) => (/^(thigh|shin|foot)\./.test(n.getName()) ? i : -1)).filter((i) => i >= 0));
const A = (k) => prim.getAttribute(k), P = Array.from(A('POSITION').getArray()), N = Array.from(A('NORMAL').getArray()), UV = Array.from(A('TEXCOORD_0').getArray()), JN = Array.from(A('JOINTS_0').getArray()), W = Array.from(A('WEIGHTS_0').getArray()), I = Array.from(prim.getIndices().getArray());
let nv = P.length / 3; const isLeg = (v) => { let s = 0; for (let k = 0; k < 4; k++) if (legJ.has(JN[v * 4 + k])) s += W[v * 4 + k]; return s > .5; }, leg = Array.from({ length: nv }, (_, v) => isLeg(v));
const out = []; let cutN = 0;
for (let t = 0; t < I.length; t += 3) { const [a, b, c] = [I[t], I[t + 1], I[t + 2]]; if ([a, b, c].every((v) => leg[v] && P[v * 3 + 1] < cutY)) { cutN++; continue; } out.push(a, b, c); }
const used = new Set(out); for (const v of used) if (leg[v] && P[v * 3 + 1] < cutY) P[v * 3 + 1] = cutY;   // the ragged edge left below the cut is pressed flat onto it
// caps: the open edges that lie on the cut. Vertices are split along UV seams, so edges are matched by position, not by index.
const key = (v) => `${Math.round(P[v * 3] * 1e5)},${Math.round(P[v * 3 + 1] * 1e5)},${Math.round(P[v * 3 + 2] * 1e5)}`, E = new Map();
for (let t = 0; t < out.length; t += 3) for (let k = 0; k < 3; k++) { const a = out[t + k], b = out[t + (k + 1) % 3], ka = key(a), kb = key(b); if (ka === kb) continue; const id = ka < kb ? ka + '|' + kb : kb + '|' + ka; const e = E.get(id) || { n: 0, a, b }; e.n++; E.set(id, e); }
const open = [...E.values()].filter((e) => e.n === 1 && leg[e.a] && leg[e.b] && Math.abs(P[e.a * 3 + 1] - cutY) < 1e-6 && Math.abs(P[e.b * 3 + 1] - cutY) < 1e-6);
const push = (x, y, z, src, uv) => { P.push(x, y, z); N.push(0, -1, 0); UV.push(uv[0], uv[1]); for (let k = 0; k < 4; k++) { JN.push(JN[src * 4 + k]); W.push(W[src * 4 + k]); } return nv++; };
let caps = 0; for (const side of [1, -1]) { const es = open.filter((e) => Math.sign(P[e.a * 3] + P[e.b * 3]) === side); if (es.length < 3) continue;
  let cx = 0, cz = 0; for (const e of es) { cx += P[e.a * 3] + P[e.b * 3]; cz += P[e.a * 3 + 2] + P[e.b * 3 + 2]; } cx /= es.length * 2; cz /= es.length * 2;
  const uv = UVC || [UV[es[0].a * 2], UV[es[0].a * 2 + 1]], c = push(cx, cutY - .012, cz, es[0].a, uv);
  for (const e of es) { const a = push(P[e.a * 3], cutY, P[e.a * 3 + 2], e.a, uv), b = push(P[e.b * 3], cutY, P[e.b * 3 + 2], e.b, uv);
    const ux = P[b * 3] - P[a * 3], uz = P[b * 3 + 2] - P[a * 3 + 2], vx = cx - P[a * 3], vz = cz - P[a * 3 + 2], ny = uz * vx - ux * vz;   // y of (b-a) x (c-a): the cap must face down
    if (ny < 0) out.push(a, b, c); else out.push(b, a, c); caps++; } }
A('POSITION').setArray(new Float32Array(P)); A('NORMAL').setArray(new Float32Array(N)); A('TEXCOORD_0').setArray(new Float32Array(UV)); A('JOINTS_0').setArray(new (A('JOINTS_0').getArray().constructor)(JN)); A('WEIGHTS_0').setArray(new Float32Array(W));
prim.getIndices().setArray(nv > 65535 ? new Uint32Array(out) : new Uint16Array(out));
await doc.transform(prune({ keepLeaves: true, keepAttributes: true }), reorder({ encoder: MeshoptEncoder, target: 'size' }));
doc.createExtension(EXTMeshoptCompression).setRequired(true).setEncoderOptions({ method: EXTMeshoptCompression.EncoderMethod.QUANTIZE });
await io.write(OUT, doc);
console.log(OUT, 'cut at height', cutY.toFixed(3), '(hip', hip.toFixed(3) + ', knee', knee.toFixed(3) + '):', cutN, 'triangles removed,', caps, 'cap triangles,', root.listAnimations().length, 'clips kept');
