"""Rig an AI-generated character model (Hunyuan3D / Tripo / Meshy GLB) on the shared survivor skeleton.

  python3 ai_model.py prep  MODEL.glb OUT.blend        # decimate, fit skeleton, skin -> cached .blend
The skeleton uses the same bone names and axes as survivor.py, so survivor.walk / swing / idle drive it.
The model must face -Y (front), Z up, feet on the ground, arms in a relaxed A-pose.
"""
import bpy, bmesh, math, os, sys
import numpy as np
from mathutils import Vector
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

D = math.radians

def landmarks(co):
    """Find joints from the mesh shape (front view slices). co: Nx3 world verts. Returns J in survivor.joints format."""
    zmax = co[:, 2].max()
    def slice_(z, h=.008): return co[np.abs(co[:, 2] - z) < h]
    def segs(s, gap=.02):
        xs = np.sort(s[:, 0]); g = np.where(np.diff(xs) > gap)[0]
        starts = np.r_[0, g + 1]; ends = np.r_[g, len(xs) - 1]
        return [(xs[a], xs[b]) for a, b in zip(starts, ends)]
    zs = np.arange(.01, zmax, .005)
    S = {round(z, 3): segs(slice_(z)) for z in zs if len(slice_(z))}
    # crotch: highest z (lower half) with a clear gap between the legs at x = 0
    # (legs can nearly touch: any clear gap at the centre line counts)
    crotch = max(z for z in S if z < zmax * .45 and not np.any(np.abs(slice_(z)[:, 0]) < .003))
    if os.environ.get('ZH_CROTCH'): crotch = float(os.environ['ZH_CROTCH'])   # override when thick legs touch (the brute)
    # arms hang apart from the body: slices with a piece entirely beyond 0.2 x height from the centre
    # arms hang apart from the body: slices with a separate piece on each side of the torso
    free = lambda s: [p for p in s if p[0] * p[1] > 0 and min(abs(p[0]), abs(p[1])) > .06]
    three = [z for z, s in S.items() if zmax * .15 < z < zmax * .7 and len(free(s)) >= 2
             and any(p[0] < 0 for p in free(s)) and any(p[0] > 0 for p in free(s))]
    hand_lo, arm_join = min(three), max(three)
    if os.environ.get('ZH_HANDLO'): hand_lo = float(os.environ['ZH_HANDLO'])   # Nov 9: override when wide-apart legs count as free pieces (the stalker v2)
    if os.environ.get('ZH_ARMJOIN'): arm_join = float(os.environ['ZH_ARMJOIN'])   # override when the arms touch a big belly (the bloated)
    # neck: narrowest torso width above the arm junction, below 75% height
    cand = [(s[0][1] - s[0][0], z) for z, s in S.items() if arm_join < z < zmax * .8 and len(s) == 1]
    neck = min(cand)[1]
    # shoulder: widest point below the neck, above the arm junction, within 0.1
    sh_z = neck - (neck - arm_join) * .45
    torso = slice_(sh_z)
    sh_x = np.percentile(np.abs(torso[:, 0]), 92) * .78
    hand_s = co[(co[:, 2] < hand_lo + .1) & (co[:, 2] > hand_lo) & (np.abs(co[:, 0]) > sh_x * 1.3)]
    hx = np.abs(hand_s[:, 0]).mean(); hz = hand_lo + .065
    wrist = Vector((hx - .01, 0, hz + .035)); tip = Vector((hx + .012, 0, hand_lo + .005))
    shoulder = Vector((sh_x, .0, sh_z)); elbow = shoulder.lerp(wrist, .52) + Vector((.012, .02, 0))
    leg = co[(co[:, 2] < crotch * .6) & (co[:, 2] > crotch * .4) & (co[:, 0] > 0)]
    lx = leg[:, 0].mean()
    hip = Vector((lx * .9, 0, crotch + .03)); knee = Vector((lx, -.005, crotch * .55))
    foot = co[(co[:, 2] < .04) & (co[:, 0] > 0)]
    ankle = Vector((lx, foot[:, 1].mean() + .02, .085)); toe = Vector((lx, foot[:, 1].min() + .03, .025))
    pelvis_lo = crotch + .01; chest_lo = crotch + (neck - crotch) * .42
    J = {'pelvis': (Vector((0, 0, pelvis_lo)), Vector((0, 0, chest_lo)), None),
         'chest': (Vector((0, 0, chest_lo)), Vector((0, 0, neck - .02)), 'pelvis'),
         'neck': (Vector((0, 0, neck - .02)), Vector((0, .0, neck + .04)), 'chest'),
         'head': (Vector((0, .0, neck + .04)), Vector((0, .0, zmax)), 'neck')}
    for side, x in (('L', 1), ('R', -1)):
        m = lambda v: Vector((v.x * x, v.y, v.z))
        J['upperarm.' + side] = (m(shoulder), m(elbow), 'chest')
        J['forearm.' + side] = (m(elbow), m(wrist), 'upperarm.' + side)
        J['hand.' + side] = (m(wrist), m(tip), 'forearm.' + side)
        J['thigh.' + side] = (m(hip), m(knee), 'pelvis')
        J['shin.' + side] = (m(knee), m(ankle), 'thigh.' + side)
        J['foot.' + side] = (m(ankle), m(toe), 'shin.' + side)
    info = dict(crotch=crotch, hand_lo=hand_lo, arm_join=arm_join, neck=neck, sh=(sh_x, sh_z), hand=(hx, hz), leg_x=lx, zmax=zmax)
    return J, info

def flat_material(o):
    """Keep only the colour texture, matte, no normal map: reads as painted when shrunk to a sprite."""
    for m in o.data.materials:
        nt = m.node_tree; bsdf = next(n for n in nt.nodes if n.type == 'BSDF_PRINCIPLED')
        for name in ('Normal', 'Metallic', 'Roughness'):
            for l in list(bsdf.inputs[name].links): nt.links.remove(l)
        bsdf.inputs['Metallic'].default_value = 0; bsdf.inputs['Roughness'].default_value = 1
        if 'Specular IOR Level' in bsdf.inputs: bsdf.inputs['Specular IOR Level'].default_value = 0

def fill_unweighted(o):
    """Vertices the heat weighting missed (stray hair bits) would stay behind and stretch: copy the nearest weighted vertex."""
    from mathutils.kdtree import KDTree
    vs = o.data.vertices; ok = [v for v in vs if sum(g.weight for g in v.groups) > .01]
    kd = KDTree(len(ok))
    for i, v in enumerate(ok): kd.insert(v.co, i)
    kd.balance(); n = 0
    for v in vs:
        if sum(g.weight for g in v.groups) > .01: continue
        _, i, _ = kd.find(v.co); src = ok[i]
        for g in src.groups: o.vertex_groups[g.group].add([v.index], g.weight, 'REPLACE')
        n += 1
    print('filled unweighted verts', n)

ARM_G = ('upperarm', 'forearm', 'hand'); LEG_G = ('thigh', 'shin', 'foot', 'pelvis')
def split_arms(o, info, J):
    """Long arms that hang against the legs pick up leg weights (and the other way round). Below the arm junction each
    vertex is given to the nearer chain, arm or body (by distance to the bone lines), and loses the other chain's weights."""
    co = np.array([v.co[:] for v in o.data.vertices])
    def segd(p, a, b):
        a = np.array(a[:]); b = np.array(b[:]); ab = b - a; t = np.clip(((p - a) @ ab) / (ab @ ab), 0, 1)
        return np.linalg.norm(p - (a + t[:, None] * ab), axis=1)
    near = lambda names: np.min([segd(co, J[n][0], J[n][1]) for n in names], axis=0)
    ext = lambda n: (J[n][0], J[n][1] + (J[n][1] - J[n][0]).normalized() * .1) if n.startswith('hand') else J[n]   # fingers hang past the hand bone's tip
    near = lambda names: np.min([segd(co, *ext(n)[:2]) for n in names], axis=0)
    n_arm = 0; n_body = 0; cls = {}; stray = []
    for sd, sgn in (('L', 1), ('R', -1)):
        da = near([g + '.' + sd for g in ARM_G]); db = near(['pelvis', 'chest'] + [g + '.' + s2 for g in LEG_G[:3] for s2 in 'LR'])
        sel = (co[:, 0] * sgn > 0) & (co[:, 2] < info['arm_join'])
        armset = set()   # below the crotch the hands hang beside the knees: there the outermost separate piece in each slice is the arm
        for z0 in np.arange(max(0, info['hand_lo'] - .02), info['crotch'], .01):   # nothing below the fingertips is arm (a coat hem there is not)
            sl = np.where(sel & (co[:, 2] >= z0) & (co[:, 2] < z0 + .01))[0]
            if not len(sl): continue
            order = sl[np.argsort(co[sl, 0] * sgn)]; gaps = np.where(np.diff(co[order, 0] * sgn) > .012)[0]
            if len(gaps): armset.update(order[gaps[-1] + 1:].tolist())
        for vi in np.where(sel)[0]:
            arm = ((vi in armset) and da[vi] < .06) if co[vi, 2] < info['crotch'] else (da[vi] < db[vi] and da[vi] < float(os.environ.get('ZH_ARMR', .032))); v = o.data.vertices[vi]; tot = 0
            cls[vi] = arm
            if (not arm and co[vi, 2] < info['crotch'] and abs(co[vi, 0]) > info['leg_x'] + .06) or (arm and da[vi] > .08): stray.append(int(vi))
            for g in list(v.groups):
                name = o.vertex_groups[g.group].name
                if name.startswith(ARM_G) != arm: o.vertex_groups[g.group].remove([int(vi)])
                else: tot += g.weight
            if tot < 1e-3:
                best = min(([g + '.' + sd for g in ARM_G]) if arm else ['pelvis'] + [g + '.' + sd for g in LEG_G[:3]], key=lambda n: segd(co[vi:vi + 1], J[n][0], J[n][1])[0])
                o.vertex_groups[best].add([int(vi)], 1.0, 'REPLACE')
            n_arm += arm; n_body += not arm
    import bmesh   # skin triangles joining an arm to the body (the arms touched the shorts in the model) would stretch into webs
    bm = bmesh.new(); bm.from_mesh(o.data)
    web = [f for f in bm.faces if len({cls.get(v.index) for v in f.verts if v.index in cls}) > 1]
    bmesh.ops.delete(bm, geom=web, context='FACES'); bm.verts.ensure_lookup_table()
    bmesh.ops.delete(bm, geom=[bm.verts[i] for i in stray], context='VERTS')   # specks left far from their own bones
    bm.to_mesh(o.data); o.data.update(); bm.free()
    print('split arms: arm verts', n_arm, 'body verts', n_body, 'web faces cut', len(web), 'strays', len(stray), flush=True)

def lower_arms(o, ao, deg):
    """Rotate both upper arms down about the front axis at the shoulder, bake that into the mesh and make it the rest pose,
    so the A-pose animations (ai_render.ARM_DOWN) work on a T-pose model."""
    from mathutils import Matrix
    bpy.context.view_layer.objects.active = ao; bpy.ops.object.mode_set(mode='POSE')
    for side, sgn in (('L', 1), ('R', -1)):
        pb = ao.pose.bones['upperarm.' + side]; h = pb.head.copy()
        pb.matrix = Matrix.Translation(h) @ Matrix.Rotation(math.radians(deg * sgn), 4, 'Y') @ Matrix.Translation(-h) @ pb.matrix
        bpy.context.view_layer.update()
    bpy.ops.object.mode_set(mode='OBJECT')
    bpy.context.view_layer.objects.active = o
    m = next(m for m in o.modifiers if m.type == 'ARMATURE'); name = m.name
    before = [v.co.copy() for v in o.data.vertices]
    bpy.ops.object.modifier_apply(modifier=name)
    bpy.context.view_layer.objects.active = ao; bpy.ops.object.mode_set(mode='POSE')
    bpy.ops.pose.select_all(action='SELECT'); bpy.ops.pose.armature_apply(selected=False)
    bpy.ops.object.mode_set(mode='OBJECT')
    m = o.modifiers.new(name, 'ARMATURE'); m.object = ao
    while o.modifiers[0].name != name:
        bpy.context.view_layer.objects.active = o; bpy.ops.object.modifier_move_up(modifier=name)
    import bmesh   # skin stretched by the re-pose (a sliver from a hand to the coat or a thigh) is long and thin: drop it
    bm = bmesh.new(); bm.from_mesh(o.data)
    grew = lambda e: e.calc_length() / max(1e-5, (before[e.verts[0].index] - before[e.verts[1].index]).length)
    long = [f for f in bm.faces if any(grew(e) > 2.2 and e.calc_length() > .02 for e in f.edges)]   # stretched by the re-pose, not just big
    bmesh.ops.delete(bm, geom=long, context='FACES'); bm.to_mesh(o.data); o.data.update(); bm.free()
    print('arms lowered', deg, 'degrees; stretched faces dropped', len(long), flush=True)

def prep(src, out, tris=40000):
    import survivor
    bpy.ops.wm.read_factory_settings(use_empty=True)
    bpy.ops.import_scene.gltf(filepath=src)
    o = next(o for o in bpy.data.objects if o.type == 'MESH'); o.name = 'body'
    bpy.context.view_layer.objects.active = o; o.select_set(True)
    bpy.ops.object.transform_apply(location=True, rotation=True, scale=True)
    for ob in list(bpy.data.objects):
        if ob is not o: bpy.data.objects.remove(ob)
    o.parent = None
    import bmesh   # Nov 9: Tripo splits every vertex along its UV seams (an open mesh): weld it closed before decimating and remeshing
    bm = bmesh.new(); bm.from_mesh(o.data); n = len(bm.verts)
    bmesh.ops.remove_doubles(bm, verts=bm.verts, dist=1e-5); bm.to_mesh(o.data); o.data.update()
    print('welded', n - len(bm.verts), 'seam vertices', flush=True); bm.free()
    hgt = float(os.environ.get('ZH_HEIGHT', 0))   # Nov 9: scale to this height (Tripo models come 1.0 tall; the survivor rig is 1.156)
    if hgt:
        zs = [v.co.z for v in o.data.vertices]; k = hgt / (max(zs) - min(zs))
        for v in o.data.vertices: v.co *= k
        print('scaled x', round(k, 3), flush=True)
    floor = float(os.environ.get('ZH_FLOOR', 0))   # Nov 8: some AI models stand on a thin ground plate; drop every face lying below this height
    if floor:
        import bmesh
        bm = bmesh.new(); bm.from_mesh(o.data)
        bmesh.ops.delete(bm, geom=[f for f in bm.faces if all(v.co.z < floor for v in f.verts)], context='FACES')
        bmesh.ops.delete(bm, geom=[v for v in bm.verts if not v.link_faces], context='VERTS')
        bmesh.ops.remove_doubles(bm, verts=bm.verts, dist=1e-4)
        bmesh.ops.holes_fill(bm, edges=bm.edges, sides=0)   # close the soles again (the skin proxy needs a closed mesh)
        bm.to_mesh(o.data); o.data.update(); bm.free()
        zmin = min(v.co.z for v in o.data.vertices)
        for v in o.data.vertices: v.co.z -= zmin   # feet back on the ground
        print('floor plate removed below', floor, flush=True)
    n0 = len(o.data.polygons)
    co_full = np.array([v.co[:] for v in o.data.vertices])   # joints from the full mesh: a decimated one is too sparse to slice
    if n0 > tris:
        dm = o.modifiers.new('dec', 'DECIMATE'); dm.ratio = tris / n0
        bpy.ops.object.modifier_apply(modifier=dm.name)
    print('tris', n0, '->', len(o.data.polygons), flush=True)
    flat_material(o)
    J, info = landmarks(co_full); del co_full
    print('landmarks', {k: (tuple(round(c, 3) for c in v) if isinstance(v, tuple) else round(v, 3)) for k, v in info.items()}, flush=True)
    ao = survivor.armature(J, 'rig', (0, 0, 0), 0)
    # skin: heat weights on a watertight proxy, then copy to the real mesh
    px = o.copy(); px.data = o.data.copy(); px.name = 'proxy'; bpy.context.scene.collection.objects.link(px)
    rm = px.modifiers.new('rm', 'REMESH'); rm.mode = 'VOXEL'; rm.voxel_size = float(os.environ.get('ZH_VOXEL', .006))   # fine enough to keep close legs apart (ZH_VOXEL: coarser when heat weighting fails)
    bpy.context.view_layer.objects.active = px; bpy.ops.object.modifier_apply(modifier='rm')
    print('proxy verts', len(px.data.vertices), flush=True)
    bpy.ops.object.select_all(action='DESELECT'); px.select_set(True); ao.select_set(True)
    bpy.context.view_layer.objects.active = ao
    bpy.ops.object.parent_set(type='ARMATURE_AUTO')
    print('proxy groups', len(px.vertex_groups), flush=True)
    for k in J: o.vertex_groups.new(name=k)
    dt = o.modifiers.new('dt', 'DATA_TRANSFER'); dt.object = px
    dt.use_vert_data = True; dt.data_types_verts = {'VGROUP_WEIGHTS'}; dt.vert_mapping = 'POLYINTERP_NEAREST'
    dt.layers_vgroup_select_src = 'ALL'; dt.layers_vgroup_select_dst = 'NAME'
    bpy.context.view_layer.objects.active = o; bpy.ops.object.modifier_apply(modifier='dt')
    bpy.data.objects.remove(px)
    fill_unweighted(o)
    if os.environ.get('ZH_SPLITARMS'): split_arms(o, info, J)
    survivor.attach(o, ao)
    tpose = float(os.environ.get('ZH_TPOSE', 0))   # Nov 8: a T-pose model: swing the arms down this many degrees and make that the rest pose
    if tpose: lower_arms(o, ao, tpose)
    ao['info'] = str(info)
    bpy.ops.wm.save_as_mainfile(filepath=out)
    print('saved', out)

if __name__ == '__main__':
    a = sys.argv[sys.argv.index('--') + 1:] if '--' in sys.argv else sys.argv[1:]
    if a[0] == 'prep': prep(a[1], a[2])
