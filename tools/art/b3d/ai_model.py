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
    crotch = max(z for z in S if z < zmax * .45 and not np.any(np.abs(slice_(z)[:, 0]) < .012))
    # arms hang apart from the body: slices with a piece entirely beyond 0.2 x height from the centre
    free = lambda s: [p for p in s if min(abs(p[0]), abs(p[1])) > zmax * .2 and p[0] * p[1] > 0]
    three = [z for z, s in S.items() if zmax * .15 < z < zmax * .7 and len(free(s)) >= 2]
    hand_lo, arm_join = min(three), max(three)
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
    n0 = len(o.data.polygons)
    if n0 > tris:
        dm = o.modifiers.new('dec', 'DECIMATE'); dm.ratio = tris / n0
        bpy.ops.object.modifier_apply(modifier=dm.name)
    print('tris', n0, '->', len(o.data.polygons), flush=True)
    flat_material(o)
    co = np.array([v.co[:] for v in o.data.vertices])
    J, info = landmarks(co)
    print('landmarks', {k: (tuple(round(c, 3) for c in v) if isinstance(v, tuple) else round(v, 3)) for k, v in info.items()}, flush=True)
    ao = survivor.armature(J, 'rig', (0, 0, 0), 0)
    # skin: heat weights on a watertight proxy, then copy to the real mesh
    px = o.copy(); px.data = o.data.copy(); px.name = 'proxy'; bpy.context.scene.collection.objects.link(px)
    rm = px.modifiers.new('rm', 'REMESH'); rm.mode = 'VOXEL'; rm.voxel_size = .01
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
    survivor.attach(o, ao)
    ao['info'] = str(info)
    bpy.ops.wm.save_as_mainfile(filepath=out)
    print('saved', out)

if __name__ == '__main__':
    a = sys.argv[sys.argv.index('--') + 1:] if '--' in sys.argv else sys.argv[1:]
    if a[0] == 'prep': prep(a[1], a[2])
