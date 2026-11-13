"""3D.96 Fit a converter-made armour set (an image-to-3D GLB of the armour alone, in an A-pose, no body) onto the survivor.

The converter normalises the set to about 1.1 tall, with longer arms and bigger proportions than our survivor. So the set is
re-posed piece by piece with a skeleton: joints are marked on the armour (ARMOR_J, read off a front/side point plot), each
vertex is weighted to its nearest armour bones, then moved bone by bone onto the survivor's rest bones: along the bone it is
stretched by the bone-length ratio, across it scaled by K (so pads sit just outside the body). The same weights become the
skin weights, so the armour bends with every clip. Exported as one skinned mesh on the survivor rig (no animations).

  python3 fit_armor.py RIG.blend ARMOR_RAW.glb OUT.glb [tris=12000] [tex=512] [check=PNG] [joints=JSON]
"""
import bpy, sys, os, math
import numpy as np
from mathutils import Vector, Quaternion
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

# Armour joints for the riot set (converter units, x right, -y front, z up); .L = +x
ARMOR_J = {'pelvis': ((0, 0, .58), (0, 0, .72)), 'chest': ((0, 0, .72), (0, 0, 1.08)),
           'upperarm.L': ((.17, 0, .97), (.27, 0, .82)), 'forearm.L': ((.27, 0, .82), (.37, 0, .62)),
           'thigh.L': ((.12, 0, .58), (.13, 0, .33)), 'shin.L': ((.13, 0, .33), (.13, 0, .09)), 'foot.L': ((.13, 0, .09), (.13, -.09, .02))}
RIGID = set(); FORCE = []; BLEND = []; ISLANDS = False
K = {'pelvis': .96, 'chest': .95, 'upperarm': 1.0, 'forearm': .98, 'thigh': 1.08, 'shin': 1.08, 'foot': 1.1}

def mirror(J):
    out = dict(J)
    for k, (h, t) in J.items():
        if k.endswith('.L'): out[k[:-2] + '.R'] = ((-h[0], h[1], h[2]), (-t[0], t[1], t[2]))
    return out

def seg_dist(P, a, b):
    ab = b - a; t = np.clip(((P - a) @ ab) / (ab @ ab), 0, 1); return np.linalg.norm(P - (a + t[:, None] * ab), axis=1), t

def frame(a, b):
    u = (b - a) / np.linalg.norm(b - a); ref = np.array([0, -1., 0]) if abs(u[1]) < .9 else np.array([0, 0, 1.])
    e1 = ref - (ref @ u) * u; e1 /= np.linalg.norm(e1); e2 = np.cross(u, e1); return u, e1, e2

def main(rig_blend, raw, out, tris=12000, tex=512, check=None, joints=None):
    global ARMOR_J, K, RIGID, FORCE, BLEND, ISLANDS
    if joints:   # Nov 9: a JSON file {"J": {bone: [head, tail]}, "K": {...}} for another armour set (marked on its own front/side plot)
        import json; d = json.load(open(joints)); ARMOR_J = {k: tuple(map(tuple, v)) for k, v in d['J'].items()}; K = {**K, **d.get('K', {})}; RIGID = set(d.get('rigid', [])); FORCE = d.get('force', []); BLEND = d.get('blend', []); ISLANDS = d.get('islands', False)
    bpy.ops.wm.open_mainfile(filepath=rig_blend)
    ao = bpy.data.objects['rig']; body = bpy.data.objects['body']
    have = set(bpy.data.objects)
    bpy.ops.import_scene.gltf(filepath=raw)
    arm = [o for o in bpy.data.objects if o not in have and o.type == 'MESH'][0]
    for o in [o for o in bpy.data.objects if o not in have and o != arm]: bpy.data.objects.remove(o)
    arm.parent = None; bpy.ops.object.select_all(action='DESELECT'); arm.select_set(True); bpy.context.view_layer.objects.active = arm
    bpy.ops.object.transform_apply(location=True, rotation=True, scale=True)
    import bmesh   # Nov 9: weld Tripo's UV-seam splits, or the decimate can't reduce the open mesh
    bm = bmesh.new(); bm.from_mesh(arm.data); bmesh.ops.remove_doubles(bm, verts=bm.verts, dist=1e-5); bm.to_mesh(arm.data); arm.data.update(); bm.free()
    import export3d
    img = export3d.clean_texture(arm, tex, 3, 20)          # flat, seam-padded colour; drops the normal/metal maps
    for m in arm.data.materials: export3d.plain(m, image=img)
    n0 = sum(len(p.vertices) - 2 for p in arm.data.polygons)
    d = arm.modifiers.new('d', 'DECIMATE'); d.ratio = min(1, tris / n0); bpy.ops.object.modifier_apply(modifier='d')
    arm.name = 'armor_riot'; arm.data.name = 'armor_riot'
    J = mirror(ARMOR_J)
    BJ = {b.name: (np.array(ao.matrix_world @ b.head_local), np.array(ao.matrix_world @ b.tail_local)) for b in ao.data.bones}
    names = [n for n in J if n in BJ]
    P = np.array([v.co[:] for v in arm.data.vertices])
    D = np.stack([seg_dist(P, np.array(J[n][0]), np.array(J[n][1]))[0] for n in names], 1)
    # side rule: a .L bone never takes a vertex on the -x side and the reverse, so the legs don't pull on each other
    for i, n in enumerate(names):
        if n.endswith('.L'): D[P[:, 0] < 0, i] = 9
        if n.endswith('.R'): D[P[:, 0] > 0, i] = 9
    W = np.exp(-(D - D.min(1, keepdims=True)) / .018); W[D > D.min(1, keepdims=True) + .06] = 0
    top = np.argsort(-W, 1)[:, 2:]; np.put_along_axis(W, top, 0, 1); W /= W.sum(1, keepdims=True)
    for b, xmin, zmin, zmax in FORCE:   # Nov 9: regions (raw armour coords, |x|) that belong to one bone, e.g. the whole shoulder pad to the upper arm
        for sd in ('.L', '.R'):
            if b + sd not in names: continue
            i = names.index(b + sd); m = (np.abs(P[:, 0]) > xmin) & (P[:, 2] > zmin) & (P[:, 2] <= zmax) & ((P[:, 0] > 0) == (sd == '.L')); W[m] = 0; W[m, i] = 1
    shared = np.zeros(len(P), bool)
    trunkV = np.ones(len(P), bool)
    if ISLANDS:   # Nov 12: a blend (an apron shared by the pelvis and the thighs) applies only to pieces that cross the middle, never to a glove hanging beside it
        import bmesh
        bm = bmesh.new(); bm.from_mesh(arm.data); bm.verts.ensure_lookup_table(); lab0 = -np.ones(len(P), int); k0 = 0
        for v in bm.verts:
            if lab0[v.index] >= 0: continue
            st = [v]; lab0[v.index] = k0
            while st:
                x = st.pop()
                for e in x.link_edges:
                    w = e.other_vert(x)
                    if lab0[w.index] < 0: lab0[w.index] = k0; st.append(w)
            k0 += 1
        bm.free()
        for c in range(k0):
            m = lab0 == c; trunkV[m] = P[m, 0].min() < -.03 and P[m, 0].max() > .03
    for b, o2, x0, x1, z0, z1, wmax in BLEND:   # Nov 9: a piece shared by two bones (a shoulder pad on the vest): a smooth ramp across x, so it bends instead of tearing
        for sd in ('.L', '.R'):
            if b + sd not in names: continue
            i = names.index(b + sd); j = names.index(o2 if o2 in names else o2 + sd)
            m = (P[:, 2] > z0) & (P[:, 2] <= z1) & ((P[:, 0] > 0) == (sd == '.L')) & (np.abs(P[:, 0]) > x0 - .02) & trunkV
            t = np.clip((np.abs(P[m, 0]) - x0) / (x1 - x0), 0, 1); w = wmax * t * t * (3 - 2 * t)
            W[m] = 0; W[m, i] = w; W[m, j] = 1 - w; shared |= m
    if ISLANDS:   # Nov 9: each separate piece (vest, belt, thigh pad, shin guard, arm guard) follows only the bones most of it is on: no piece bends on a bone it barely touches
        import bmesh
        bm = bmesh.new(); bm.from_mesh(arm.data); bm.verts.ensure_lookup_table(); lab = -np.ones(len(P), int); k = 0
        for v in bm.verts:
            if lab[v.index] >= 0: continue
            st = [v]; lab[v.index] = k
            while st:
                x = st.pop()
                for e in x.link_edges:
                    w = e.other_vert(x)
                    if lab[w.index] < 0: lab[w.index] = k; st.append(w)
            k += 1
        bm.free(); am_ = W.argmax(1)
        for c in range(k):
            m = lab == c
            if m.sum() < 30: W[m] = 0; W[m, np.bincount(am_[m], minlength=len(names)).argmax()] = 1; continue
            share = np.bincount(am_[m], minlength=len(names)) / m.sum(); keep = share > .15
            if P[m, 0].min() < -.03 and P[m, 0].max() > .03:   # a piece across the middle (vest, belt) is trunk: no leg or arm bone may pull on it
                trunk = np.array([not n.endswith(('.L', '.R')) for n in names]); keep &= trunk
                if not keep.any(): keep = trunk & (share == share[trunk].max())
                share = np.where(trunk, share, 0) / max(1e-9, share[trunk].sum())
            for i, n in enumerate(names):
                if keep[i] and n.split('.')[0] in RIGID and share[i] > .6: keep[:] = False; keep[i] = True   # a piece almost all on one limb bone: rigid
            Wm = W[m] * keep[None]; Wm[shared[m]] = W[m][shared[m]]
            z = Wm.sum(1) < 1e-6; Wm[z] = 0; Wm[z, int(np.argmax(np.where(keep, share, -1)))] = 1   # a vertex left with no weight goes to the piece's main bone (else the exporter adds a 'neutral_bone')
            W[m] = Wm
        for b, xmin, zmin, zmax in FORCE:   # Nov 13: a forced region wins over the island rule (an armband fused to the vest stayed on the chest)
            for sd in ('.L', '.R'):
                if b + sd not in names: continue
                i = names.index(b + sd); m = (np.abs(P[:, 0]) > xmin) & (P[:, 2] > zmin) & (P[:, 2] <= zmax) & ((P[:, 0] > 0) == (sd == '.L')); W[m] = 0; W[m, i] = 1
        W /= np.maximum(W.sum(1, keepdims=True), 1e-9); print('pieces', k, flush=True)
    for i, n in enumerate(names):   # Nov 9: pieces on these bones move rigidly with them (a shoulder pad shared with the chest stretched into a flap when the arm went overhead)
        if n.split('.')[0] in RIGID and not ISLANDS:
            own = (W.argmax(1) == i) & ~shared; W[own] = 0; W[own, i] = 1; W[~own & ~shared, i] = 0   # and nothing else leans on that bone (shared pieces keep their blend)
    W /= np.maximum(W.sum(1, keepdims=True), 1e-9)
    NP = np.zeros_like(P)
    for i, n in enumerate(names):
        a0, a1 = np.array(J[n][0], float), np.array(J[n][1], float); b0, b1 = BJ[n]
        ua, e1a, e2a = frame(a0, a1); ub, e1b, e2b = frame(b0, b1)
        r = np.linalg.norm(b1 - b0) / np.linalg.norm(a1 - a0); k = K[n.split('.')[0]]
        if n.startswith('foot'): r = k                          # boots keep their own shape, just smaller
        q = P - a0; NP += W[:, i:i + 1] * (b0 + np.outer(q @ ua, ub) * r + np.outer(q @ e1a, e1b) * k + np.outer(q @ e2a, e2b) * k)
    for v, p in zip(arm.data.vertices, NP): v.co = Vector(p)
    arm.data.update()
    for i, n in enumerate(names):
        vg = arm.vertex_groups.new(name=n); idx = np.nonzero(W[:, i] > .001)[0]
        for j in idx: vg.add([int(j)], float(W[j, i]), 'REPLACE')
    if RIGID and not ISLANDS:   # faces bridging a rigid arm piece and the body (pieces touching, joined by the weld or the decimate) would stretch: cut them
        import bmesh
        side = np.zeros(len(P), int)
        for i, n in enumerate(names):
            if n.split('.')[0] in RIGID: side[(W[:, i] > .5) & ~shared] = 1 + i   # each rigid bone its own group: no face may join two of them
        bm = bmesh.new(); bm.from_mesh(arm.data); bm.faces.ensure_lookup_table()
        cut = [f for f in bm.faces if len({side[v.index] for v in f.verts}) > 1]
        bmesh.ops.delete(bm, geom=cut, context='FACES'); bm.to_mesh(arm.data); arm.data.update(); bm.free(); print('bridging faces cut', len(cut), flush=True)
    arm.parent = ao; am = arm.modifiers.new('arm', 'ARMATURE'); am.object = ao
    for p in arm.data.polygons: p.use_smooth = False
    if check: np.save(check, NP)                            # fitted points, for a quick overlay check
    for o in list(bpy.data.objects):
        if o not in (ao, arm): bpy.data.objects.remove(o, do_unlink=True)
    for pb in ao.pose.bones: pb.location = (0, 0, 0); pb.rotation_quaternion = (1, 0, 0, 0); pb.rotation_euler = (0, 0, 0)
    bpy.ops.object.select_all(action='DESELECT'); ao.select_set(True); arm.select_set(True)
    bpy.ops.export_scene.gltf(filepath=os.path.abspath(out), export_format='GLB', use_selection=True, export_animations=False,
                              export_skins=True, export_def_bones=False, export_image_format='WEBP', export_apply=False, export_yup=True)
    print('armor', os.path.abspath(out), round(os.path.getsize(out) / 1e6, 2), 'MB', len(arm.data.polygons), 'faces')

if __name__ == '__main__':
    a = sys.argv[sys.argv.index('--') + 1:] if '--' in sys.argv else sys.argv[1:]
    opt = dict(x.split('=', 1) for x in a if '=' in x); pos = [x for x in a if '=' not in x]
    main(pos[0], pos[1], pos[2], int(opt.get('tris', 12000)), int(opt.get('tex', 512)), opt.get('check'), opt.get('joints'))
