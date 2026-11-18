// node inject_clips.mjs IN.glb OUT.glb name=clip.json [name=clip.json ...] [--verify name=clip.json]
// Replace (or add) animation clips in a character GLB from retarget.py's JSON (pose per bone per frame, relative to the bone's rest).
import { NodeIO } from '@gltf-transform/core'; import { ALL_EXTENSIONS } from '@gltf-transform/extensions'; import { MeshoptDecoder, MeshoptEncoder } from 'meshoptimizer'; import fs from 'fs';
await MeshoptDecoder.ready; await MeshoptEncoder.ready;
const io = new NodeIO().registerExtensions(ALL_EXTENSIONS).registerDependencies({ 'meshopt.decoder': MeshoptDecoder, 'meshopt.encoder': MeshoptEncoder });
const [, , IN, OUT, ...rest] = process.argv; const verify = rest.includes('--verify'); const pairs = rest.filter((x) => x.includes('=')).map((x) => x.split('='));
const doc = await io.read(IN), root = doc.getRoot(), buf = root.listBuffers()[0];
const qmul = (a, b) => [a[3] * b[0] + a[0] * b[3] + a[1] * b[2] - a[2] * b[1], a[3] * b[1] - a[0] * b[2] + a[1] * b[3] + a[2] * b[0], a[3] * b[2] + a[0] * b[1] - a[1] * b[0] + a[2] * b[3], a[3] * b[3] - a[0] * b[0] - a[1] * b[1] - a[2] * b[2]];
const qrot = (q, v) => { const p = qmul(qmul(q, [v[0], v[1], v[2], 0]), [-q[0], -q[1], -q[2], q[3]]); return [p[0], p[1], p[2]]; };
const node = (n) => root.listNodes().find((x) => x.getName() === n);
for (const [name, file] of pairs) {
  const C = JSON.parse(fs.readFileSync(file)), old = root.listAnimations().find((a) => a.getName() === name);
  if (verify) { let worst = 0; for (const ch of old.listChannels()) { const n = ch.getTargetNode(), b = C.bones[n.getName()]; if (!b) continue; const s = ch.getSampler(), tin = s.getInput().getArray(), out = s.getOutput().getArray(), path = ch.getTargetPath();
      for (let i = 0; i < tin.length; i++) { const f = Math.round(tin[i] * C.fps); if (Math.abs(f - tin[i] * C.fps) > 1e-3 || f > C.frames) continue;
        if (path === 'rotation') { const q = qmul(n.getRotation(), b.rot[f]); const d = Math.abs(q[0] * out[i * 4] + q[1] * out[i * 4 + 1] + q[2] * out[i * 4 + 2] + q[3] * out[i * 4 + 3]); worst = Math.max(worst, 1 - d); }
        else if (path === 'translation' && b.loc.length) { const r = qrot(n.getRotation(), b.loc[f]), t = n.getTranslation(); for (let k = 0; k < 3; k++) worst = Math.max(worst, Math.abs(t[k] + r[k] - out[i * 3 + k])); } } }
    console.log('verify', name, 'worst difference', worst.toExponential(2)); continue; }
  if (old) { for (const ch of old.listChannels()) ch.dispose(); for (const s of old.listSamplers()) s.dispose(); }
  const anim = old || doc.createAnimation(name), n = C.frames + 1, times = new Float32Array(n); for (let i = 0; i < n; i++) times[i] = i / C.fps;
  const tAcc = doc.createAccessor().setType('SCALAR').setArray(times).setBuffer(buf);
  for (const [bn, b] of Object.entries(C.bones)) { const nd = node(bn); if (!nd) throw new Error('no node ' + bn); const r0 = nd.getRotation(), t0 = nd.getTranslation();
    const rot = new Float32Array(n * 4); for (let i = 0; i < n; i++) rot.set(qmul(r0, b.rot[i]), i * 4);
    const rs = doc.createAnimationSampler().setInput(tAcc).setOutput(doc.createAccessor().setType('VEC4').setArray(rot).setBuffer(buf)).setInterpolation('LINEAR');
    anim.addSampler(rs).addChannel(doc.createAnimationChannel().setTargetNode(nd).setTargetPath('rotation').setSampler(rs));
    if (b.loc.length) { const loc = new Float32Array(n * 3); for (let i = 0; i < n; i++) { const r = qrot(r0, b.loc[i]); loc.set([t0[0] + r[0], t0[1] + r[1], t0[2] + r[2]], i * 3); }
      const ls = doc.createAnimationSampler().setInput(tAcc).setOutput(doc.createAccessor().setType('VEC3').setArray(loc).setBuffer(buf)).setInterpolation('LINEAR');
      anim.addSampler(ls).addChannel(doc.createAnimationChannel().setTargetNode(nd).setTargetPath('translation').setSampler(ls)); } }
  console.log(old ? 'replaced' : 'added', name, n, 'frames', (C.seconds || 0).toFixed(2), 's stride', (C.stride || 0).toFixed(3)); }
if (!verify) { for (const e of root.listExtensionsUsed()) if (e.extensionName === 'EXT_meshopt_compression') e.dispose(); await io.write(OUT, doc); console.log('wrote', OUT, root.listAnimations().length, 'clips'); }
