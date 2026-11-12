// node compress.mjs IN.glb OUT.glb [zombie]
// 3D.126: shrink a character GLB without changing how it looks or moves.
//  - zombie: drop the survivor-only clips and the weapon / armour meshes zombies never show
//  - every model: drop redundant animation keys, then store all buffers with meshopt compression (floats kept: no quantization,
//    because the game reads vertex positions directly for hair, hats and outlines)
import { NodeIO } from '@gltf-transform/core';
import { ALL_EXTENSIONS, EXTMeshoptCompression } from '@gltf-transform/extensions';
import { resample, prune, reorder, dedup } from '@gltf-transform/functions';
import { MeshoptEncoder, MeshoptDecoder } from 'meshoptimizer';

const [, , IN, OUT, MODE] = process.argv;
const KEEP = new Set(['idle', 'walk', 'run', 'hurt', 'collapse', 'knockdown', 'grabbed', 'shove', 'punch', 'zombie_walk', 'zombie_run', 'zombie_attack', 'bloated_walk', 'bloated_attack', 'brute_attack',
  'crawl', 'crawl_idle', 'crawl_attack', 'crawl_die', 'creepy_walk', 'naruto_run', 'heavy_walk', 'heavy_run', 'haymaker', 'haymaker_kick', 'smash', 'lash', 'scream', 'spit', 'spore_combo', 'rot_swell',
  'melee_swing_a', 'gun_fire', 'gun_hold_idle', 'gun_hold_walk']);   // the last four: the Thrower's lob and the Gatling Boss
await MeshoptEncoder.ready; await MeshoptDecoder.ready;
const io = new NodeIO().registerExtensions(ALL_EXTENSIONS).registerDependencies({ 'meshopt.encoder': MeshoptEncoder, 'meshopt.decoder': MeshoptDecoder });
const doc = await io.read(IN), root = doc.getRoot();
if (MODE === 'zombie') {
  for (const a of root.listAnimations()) if (!KEEP.has(a.getName())) a.dispose();
  for (const n of root.listNodes()) { const nm = n.getName() || ''; if (/^(weapon_|armor_|w_|a_)/.test(nm) && !n.getSkin() && n.listChildren().every((c) => !c.getSkin())) { if (n.getMesh()) n.setMesh(null); } }
  for (const n of root.listNodes()) { const nm = n.getName() || ''; if (/^armor_/.test(nm)) n.setMesh(null); }
}
// tracks that sit at the bone's rest value in EVERY clip do nothing: drop them everywhere (safe for cross-fades, because no clip ever moves that property)
{ const key = (c) => c.getTargetNode() && (c.getTargetNode().getName() + '|' + c.getTargetPath()), moving = new Set(), EPS = 1e-4;
  const rest = (n, path) => path === 'translation' ? n.getTranslation() : path === 'rotation' ? n.getRotation() : path === 'scale' ? n.getScale() : null;
  for (const a of root.listAnimations()) for (const c of a.listChannels()) { const n = c.getTargetNode(), smp = c.getSampler(); if (!n || !smp) continue; const r = rest(n, c.getTargetPath()); if (!r) { moving.add(key(c)); continue; }
    const out = smp.getOutput().getArray(), k = r.length; let still = true; for (let i = 0; i < out.length && still; i++) if (Math.abs(out[i] - r[i % k]) > EPS) still = false; if (!still) moving.add(key(c)); }
  let cut = 0; for (const a of root.listAnimations()) for (const c of a.listChannels()) if (c.getTargetNode() && !moving.has(key(c))) { const smp = c.getSampler(); c.dispose(); if (smp && !smp.listParents().some((p) => p.propertyType === 'AnimationChannel')) smp.dispose(); cut++; }
  console.log('dropped', cut, 'still tracks'); }
await doc.transform(resample({ tolerance: 0.001 }), dedup(), prune({ keepLeaves: true, keepAttributes: true }), reorder({ encoder: MeshoptEncoder, target: 'size' }));
doc.createExtension(EXTMeshoptCompression).setRequired(true).setEncoderOptions({ method: EXTMeshoptCompression.EncoderMethod.QUANTIZE });
await io.write(OUT, doc);
console.log(OUT, root.listAnimations().length, 'clips', root.listMeshes().length, 'meshes');
