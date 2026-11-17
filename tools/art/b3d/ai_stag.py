"""Rig and animate the owner's Stag (Tripo GLB) with the four-legged rig and clips of ai_dog.py.
  python3 ai_stag.py Stag.glb OUT.glb [tris=16000] [tex=1024] [scale=1.2] [blend=preview.blend]
Same bone names and clips as the Dog (idle, zombie_walk, zombie_run, zombie_attack, collapse). Only the joint positions differ:
a deer stands taller on longer legs and carries its neck up. The antlers ride on the head bone."""
import bpy, os, sys
import numpy as np
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import ai_dog
K = 1.2

def bones(co):
    k = K; zmax = co[:, 2].max(); ymin, ymax = co[:, 1].min(), co[:, 1].max()
    def legx(y0, y1, z):
        s = co[(co[:, 1] > y0 * k) & (co[:, 1] < y1 * k) & (np.abs(co[:, 2] - z * k) < .012 * k) & (co[:, 0] > .015)]
        return float(s[:, 0].mean()) / k, float(s[:, 1].mean()) / k
    fx, fyl = legx(-.20, -.04, .20); fxp, fyp = legx(-.20, -.04, .03)
    bx, byl = legx(.25, .48, .20); bxp, byp = legx(.25, .48, .03)
    back = .50; body_lo = .31
    J = {
        'hips': ((0, .36, back), (0, .10, back + .01), None),
        'chest': ((0, .10, back + .01), (0, -.13, back + .03), 'hips'),
        'neck': ((0, -.13, back + .03), (0, -.30, .72), 'chest'),
        'head': ((0, -.30, .72), (0, -.47, .64), 'neck'),
        'tail': ((0, .45, .52), (0, .48, .44), 'hips'),
    }
    for side, sg in (('L', 1), ('R', -1)):
        J['fupper.' + side] = ((sg * fx, fyl - .01, .44), (sg * fx, fyl, .25), 'chest')
        J['flower.' + side] = ((sg * fx, fyl, .25), (sg * fxp, fyp + .02, .07), 'fupper.' + side)
        J['fpaw.' + side] = ((sg * fxp, fyp + .02, .07), (sg * fxp, fyp - .03, .012), 'flower.' + side)
        J['bthigh.' + side] = ((sg * bx, byl - .05, .45), (sg * bx, byl, .27), 'hips')
        J['bshin.' + side] = ((sg * bx, byl, .27), (sg * bxp, byp + .02, .08), 'bthigh.' + side)
        J['bpaw.' + side] = ((sg * bxp, byp + .02, .08), (sg * bxp, byp - .04, .012), 'bshin.' + side)
    J = {n: (tuple(c * k for c in h), tuple(c * k for c in t), p) for n, (h, t, p) in J.items()}
    # skin(): 'tail' = the small flap behind the rump only (y > ymax - .1 and z < back - .02 in its test)
    return J, dict(fx=fx * k, bx=bx * k, fy=fyl * k, by=byl * k, back=.55 * k, body_lo=body_lo * k, ymin=ymin, ymax=.445 * k + .1, zmax=zmax)

ai_dog.bones = bones

def main(src, out, tris=16000, tex=1024, preview=None):
    """ai_dog.main, plus: scale to the game's size, weld Tripo's split UV seams (the decimator cannot close an open mesh),
    and reduce to the final triangle count before skinning."""
    import bmesh
    from export3d import clean_texture, plain
    bpy.ops.wm.read_factory_settings(use_empty=True)
    bpy.ops.import_scene.gltf(filepath=src)
    o = next(o for o in bpy.data.objects if o.type == 'MESH'); o.name = 'body'
    bpy.context.view_layer.objects.active = o; o.select_set(True)
    bpy.ops.object.transform_apply(location=True, rotation=True, scale=True)
    for ob in list(bpy.data.objects):
        if ob is not o: bpy.data.objects.remove(ob)
    o.parent = None
    bm = bmesh.new(); bm.from_mesh(o.data); n = len(bm.verts)
    bmesh.ops.remove_doubles(bm, verts=bm.verts, dist=1e-5); bm.to_mesh(o.data); o.data.update(); print('welded', n - len(bm.verts), 'seam vertices', flush=True); bm.free()
    for v in o.data.vertices: v.co *= K
    co = np.array([v.co[:] for v in o.data.vertices]); J, info = bones(co); del co
    print('joints', {k: tuple(round(c, 3) for c in v[1]) for k, v in J.items()}, flush=True)
    n0 = len(o.data.polygons); dm = o.modifiers.new('dec', 'DECIMATE'); dm.ratio = tris / n0
    bpy.ops.object.modifier_apply(modifier=dm.name)
    img = clean_texture(o, tex, 5, 24)
    for m in o.data.materials: plain(m, image=img)
    ao = ai_dog.armature(J); ai_dog.skin(o, ao, J, info)
    # below the belly a vertex belongs to one leg only: its own side, and the front or the hind pair by where it stands
    # (heat weights sometimes hand a hoof vertex to the other pair, and it stays behind as a spike when the leg lifts)
    G = o.vertex_groups; mid = (info['fy'] + info['by']) / 2; fixed = 0
    def segd(p, a, b):
        a = np.array(a); b = np.array(b); ab = b - a; t = np.clip(((p - a) @ ab) / (ab @ ab), 0, 1); return float(np.linalg.norm(p - (a + t * ab)))
    for v in o.data.vertices:
        x, y, z = v.co
        if z > info['body_lo'] - .02 * K: continue
        own = [n + ('.L' if x > 0 else '.R') for n in (('fupper', 'flower', 'fpaw') if y < mid else ('bthigh', 'bshin', 'bpaw'))]; tot = 0
        for g in list(v.groups):
            if G[g.group].name in own: tot += g.weight
            else: G[g.group].remove([v.index]); fixed += 1
        if tot < 1e-3: G[min(own, key=lambda n: segd(np.array(v.co[:]), J[n][0], J[n][1]))].add([v.index], 1.0, 'REPLACE')
    print('leg weights cleaned', fixed, flush=True)
    for name, fn, dur, loop in ai_dog.CLIPS: ai_dog.bake(ao, name, fn, dur, loop, info)
    for pb in ao.pose.bones: pb.location = (0, 0, 0); pb.rotation_quaternion = (1, 0, 0, 0)
    if preview: bpy.ops.wm.save_as_mainfile(filepath=os.path.abspath(preview))
    bpy.ops.object.select_all(action='DESELECT')
    bpy.ops.export_scene.gltf(filepath=os.path.abspath(out), export_format='GLB', export_animation_mode='NLA_TRACKS',
                              export_skins=True, export_def_bones=False, export_optimize_animation_size=True,
                              export_image_format='WEBP', export_apply=False, export_yup=True)
    print('tris', len(o.data.polygons), 'saved', out, round(os.path.getsize(out) / 1e6, 2), 'MB')

if __name__ == '__main__':
    a = sys.argv[1:]; opt = dict(x.split('=', 1) for x in a if '=' in x); pos = [x for x in a if '=' not in x]
    K = float(opt.get('scale', 1.2))
    main(pos[0], pos[1], int(opt.get('tris', 16000)), int(opt.get('tex', 1024)), opt.get('blend'))
