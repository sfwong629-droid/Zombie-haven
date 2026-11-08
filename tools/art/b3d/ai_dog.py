"""Rig and animate the user's AI-generated dog (Hunyuan3D GLB) for the real-time 3D game: the Infected Dog zombie.

  python3 ai_dog.py MODEL.glb OUT.glb [tris=12000] [tex=1024]

The model faces -Y (nose at -Y), Z up, standing on the ground. A four-legged skeleton (hips, chest, neck, head, tail, and
upper / lower / paw bones on every leg) is placed from the dog's measured shape, skinned with heat weights on a closed
voxel copy, then cleaned up: each leg keeps only its own side's weights and the hanging tail is its own piece.
Clips (the names the game's zombie code plays): idle, zombie_walk, zombie_run (gallop), zombie_attack (lunge and bite),
collapse (falls on its side). Bare model only: no weapons, no armour.
"""
import bpy, math, os, sys
import numpy as np
from mathutils import Vector, Matrix, Euler
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from export3d import clean_texture, plain

D = math.radians
FPS = 30


def bones(co):
    """Joint positions from the mesh (metres in the model's own units)."""
    zmax = co[:, 2].max(); ymin, ymax = co[:, 1].min(), co[:, 1].max()
    def legx(y0, y1, z):
        s = co[(co[:, 1] > y0) & (co[:, 1] < y1) & (np.abs(co[:, 2] - z) < .012) & (co[:, 0] > .015)]
        return float(s[:, 0].mean()), float(s[:, 1].mean())
    L = ymax - ymin
    fy0, fy1 = ymin + .27 * L, ymin + .5 * L          # front legs
    by0, by1 = ymin + .82 * L, ymax                   # back legs
    fx, fyl = legx(fy0, fy1, .15); bx, byl = legx(by0, by1, .15)
    fxp, fyp = legx(fy0, fy1, .03); bxp, byp = legx(by0, by1, .03)
    body_lo = .27; back = .46
    J = {
        'hips': ((0, byl - .03, back), (0, ymin + .55 * L, back + .01), None),
        'chest': ((0, ymin + .55 * L, back + .01), (0, fyl - .02, back + .03), 'hips'),
        'neck': ((0, fyl - .02, back + .03), (0, ymin + .21 * L, .6), 'chest'),
        'head': ((0, ymin + .21 * L, .6), (0, ymin, .57), 'neck'),
        'tail': ((0, ymax - .06, back), (0, ymax - .02, .14), 'hips'),
    }
    for side, sg in (('L', 1), ('R', -1)):
        J['fupper.' + side] = ((sg * fx, fyl - .02, back - .06), (sg * fx, fyl, .2), 'chest')
        J['flower.' + side] = ((sg * fx, fyl, .2), (sg * fxp, fyp + .03, .06), 'fupper.' + side)
        J['fpaw.' + side] = ((sg * fxp, fyp + .03, .06), (sg * fxp, fyp - .04, .015), 'flower.' + side)
        J['bthigh.' + side] = ((sg * bx, byl - .04, back - .06), (sg * bx, byl - .05, .24), 'hips')
        J['bshin.' + side] = ((sg * bx, byl - .05, .24), (sg * bxp, byp + .02, .07), 'bthigh.' + side)
        J['bpaw.' + side] = ((sg * bxp, byp + .02, .07), (sg * bxp, byp - .05, .012), 'bshin.' + side)
    return J, dict(fx=fx, bx=bx, fy=fyl, by=byl, back=back, body_lo=body_lo, ymin=ymin, ymax=ymax, zmax=zmax)


def armature(J):
    arm = bpy.data.armatures.new('rig'); ao = bpy.data.objects.new('rig', arm); bpy.context.scene.collection.objects.link(ao)
    bpy.context.view_layer.objects.active = ao; ao.select_set(True); bpy.ops.object.mode_set(mode='EDIT')
    for n, (h, t, par) in J.items():
        b = arm.edit_bones.new(n); b.head = Vector(h); b.tail = Vector(t)
        # roll so every bone's local X points along world +X: rotating about X then pitches it fore and aft
        b.align_roll(Vector((0, 0, 1)) if abs(b.vector.normalized().z) < .7 else Vector((0, -1, 0)))
    for n, (h, t, par) in J.items():
        if par: arm.edit_bones[n].parent = arm.edit_bones[par]; arm.edit_bones[n].use_connect = False
    bpy.ops.object.mode_set(mode='OBJECT')
    return ao


def skin(o, ao, J, info):
    px = o.copy(); px.data = o.data.copy(); bpy.context.scene.collection.objects.link(px)
    rm = px.modifiers.new('rm', 'REMESH'); rm.mode = 'VOXEL'; rm.voxel_size = .005
    bpy.context.view_layer.objects.active = px; bpy.ops.object.modifier_apply(modifier='rm')
    bpy.ops.object.select_all(action='DESELECT'); px.select_set(True); ao.select_set(True); bpy.context.view_layer.objects.active = ao
    bpy.ops.object.parent_set(type='ARMATURE_AUTO')
    for k in J: o.vertex_groups.new(name=k)
    dt = o.modifiers.new('dt', 'DATA_TRANSFER'); dt.object = px
    dt.use_vert_data = True; dt.data_types_verts = {'VGROUP_WEIGHTS'}; dt.vert_mapping = 'POLYINTERP_NEAREST'
    dt.layers_vgroup_select_src = 'ALL'; dt.layers_vgroup_select_dst = 'NAME'
    bpy.context.view_layer.objects.active = o; bpy.ops.object.modifier_apply(modifier='dt'); bpy.data.objects.remove(px)
    co = np.array([v.co[:] for v in o.data.vertices]); G = o.vertex_groups
    def segd(p, a, b):
        a = np.array(a); b = np.array(b); ab = b - a; t = np.clip(((p - a) @ ab) / (ab @ ab), 0, 1)
        return np.linalg.norm(p - (a + t[:, None] * ab), axis=1)
    near = {n: segd(co, J[n][0], J[n][1]) for n in J}
    tail = (np.abs(co[:, 0]) < .035) & (co[:, 1] > info['ymax'] - .1) & (co[:, 2] < info['back'] - .02)
    legs = [n for n in J if n[:1] in 'fb' and '.' in n]
    for vi, v in enumerate(o.data.vertices):
        x, y, z = co[vi]
        if tail[vi]: allowed = {'tail'}
        elif z < info['body_lo'] - .02:   # below the belly: only this side's legs
            sd = 'L' if x > 0 else 'R'; allowed = {n for n in legs if n.endswith(sd)}
        else: allowed = None
        tot = 0
        for g in list(v.groups):
            nm = G[g.group].name
            if allowed is not None and nm not in allowed: G[g.group].remove([vi])
            elif '.' in nm and nm.endswith('L' if x < -.01 else 'R' if x > .01 else '?'): G[g.group].remove([vi])   # never the far side's leg
            else: tot += g.weight
        if tot < 1e-3:
            cand = list(allowed) if allowed else list(J)
            best = min(cand, key=lambda n: near[n][vi]); G[best].add([vi], 1.0, 'REPLACE')
    o.parent = ao; m = o.modifiers.new('arm', 'ARMATURE'); m.object = ao


# ---- poses: {bone: (rx, ry, rz) degrees in the bone's own frame}, plus optional 'loc': hips offset (x, y, z) in metres (world)
LEG = ('fupper', 'flower', 'fpaw', 'bthigh', 'bshin', 'bpaw')

def gait(t, phases, A, lift, spine=0.0, bob=0.0, head=0.0, tailw=10):
    P = {}; ph = lambda f: 2 * math.pi * (t + f)
    for key, f in phases.items():
        front = key[0] == 'f'; sd = key[-1]; a = math.sin(ph(f)); sw = max(0.0, -math.cos(ph(f)))   # sw: paw off the ground, swinging forward
        if front:
            P['fupper.' + sd] = (A * a, 0, 0); P['flower.' + sd] = (lift * sw, 0, 0); P['fpaw.' + sd] = (lift * .6 * sw, 0, 0)
        else:
            P['bthigh.' + sd] = (A * a, 0, 0); P['bshin.' + sd] = (-lift * .7 * sw, 0, 0); P['bpaw.' + sd] = (lift * .7 * sw, 0, 0)
    s2 = math.sin(4 * math.pi * t)
    P['chest'] = (spine * math.sin(ph(0)), 0, 0); P['hips'] = (-spine * .6 * math.sin(ph(0)), 0, 0)
    P['neck'] = (head * s2, 0, 0); P['head'] = (-head * .6 * s2, 0, 0)
    P['tail'] = (6, 0, tailw * math.sin(ph(0)))
    P['loc'] = (0, 0, -bob * abs(s2))
    return P

def walk(t):   # lateral four-beat walk, the zombie lurch: head low and swinging
    return gait(t, {'b.L': 0, 'f.L': .25, 'b.R': .5, 'f.R': .75}, 22, 38, spine=2, bob=.008, head=4)

def run(t):    # rotary gallop: front pair close together, hind pair close together, the back flexing
    P = gait(t, {'f.L': 0, 'f.R': .1, 'b.L': .5, 'b.R': .6}, 40, 60, spine=10, bob=.02, head=8, tailw=18)
    P['loc'] = (0, 0, .018 * math.sin(2 * math.pi * t) - .01)
    return P

def idle(t):   # breathing, head sway, a twitching tail
    s = math.sin(2 * math.pi * t)
    return {'chest': (1.5 * s, 0, 0), 'neck': (-6 + 3 * s, 0, 4 * math.sin(math.pi * 2 * t + 1)), 'head': (4, 6 * math.sin(2 * math.pi * t), 0),
            'tail': (6, 0, 14 * math.sin(4 * math.pi * t)), 'loc': (0, 0, -.004 * (1 + s))}

def keys(K, t):
    for (t0, a), (t1, b) in zip(K, K[1:]):
        if t0 <= t <= t1:
            u = (t - t0) / (t1 - t0); u = u * u * (3 - 2 * u)
            return {k: a[k] + (b[k] - a[k]) * u for k in a}
    return dict(K[-1][1])

def attack(t):   # crouch, lunge forward and up with the jaws, snap, back off
    K = [(0, {'p': 0, 'f': 0, 'n': 0, 'h': 0, 'fl': 0, 'bl': 0, 'up': 0}),
         (.3, {'p': 8, 'f': -.04, 'n': 14, 'h': -6, 'fl': -10, 'bl': 18, 'up': -.05}),
         (.5, {'p': -14, 'f': .16, 'n': -26, 'h': 14, 'fl': -50, 'bl': -28, 'up': .05}),
         (.62, {'p': -10, 'f': .16, 'n': -18, 'h': 22, 'fl': -40, 'bl': -24, 'up': .03}),
         (1, {'p': 0, 'f': 0, 'n': 0, 'h': 0, 'fl': 0, 'bl': 0, 'up': 0})]
    k = keys(K, t); P = {'hips': (k['p'], 0, 0), 'neck': (k['n'], 0, 0), 'head': (k['h'], 0, 0), 'tail': (-10, 0, 0)}
    for sd in 'LR':
        P['fupper.' + sd] = (k['fl'], 0, 0); P['flower.' + sd] = (-k['fl'] * .4, 0, 0)
        P['bthigh.' + sd] = (k['bl'], 0, 0); P['bshin.' + sd] = (-k['bl'] * .5, 0, 0)
    P['loc'] = (0, -k['f'], k['up'])
    return P

def collapse(t):   # legs give way and it rolls onto its side
    u = min(1.0, t / .7); u = u * u * (3 - 2 * u)
    P = {'hips': (0, 0, 0), 'neck': (-20 * u, 0, 0), 'head': (10 * u, 0, 0), 'tail': (30 * u, 0, 0)}
    for sd in 'LR':
        P['fupper.' + sd] = (-25 * u, 0, 0); P['flower.' + sd] = (30 * u, 0, 0); P['bthigh.' + sd] = (25 * u, 0, 0); P['bshin.' + sd] = (-20 * u, 0, 0)
    P['roll'] = 88 * u; P['loc'] = (0, 0, 0)
    return P

CLIPS = [('idle', idle, 2.0, True), ('zombie_walk', walk, .9, True), ('zombie_run', run, .45, True),
         ('zombie_attack', attack, .8, False), ('collapse', collapse, 1.0, False)]


def bake(ao, name, fn, dur, loop, info):
    act = bpy.data.actions.new(name); act.use_fake_user = True
    ao.animation_data_create(); ao.animation_data.action = act
    nf = max(2, round(dur * FPS)) + (0 if loop else 1)
    hips_rest = ao.data.bones['hips'].matrix_local.copy()
    for f in range(nf):
        t = (f / FPS / dur) % 1.0 if loop else min(1.0, f / FPS / dur)
        P = fn(t)
        for pb in ao.pose.bones:
            pb.rotation_mode = 'QUATERNION'; r = P.get(pb.name, (0, 0, 0))
            pb.rotation_quaternion = Euler((D(r[0]), D(r[1]), D(r[2])), 'XYZ').to_quaternion(); pb.location = (0, 0, 0)
        # the whole dog moves and rolls from the hips (root): world offset and roll about the long axis, in the hips' frame
        lx, ly, lz = P.get('loc', (0, 0, 0)); roll = D(P.get('roll', 0))
        piv = Vector((info['fx'] + .05, 0, 0))   # tip over the right-hand feet onto its side, so it lies on the ground
        M = Matrix.Translation(Vector((lx, ly, lz))) @ Matrix.Translation(piv) @ Matrix.Rotation(roll, 4, 'Y') @ Matrix.Translation(-piv) @ hips_rest
        r = Euler([D(a) for a in P.get('hips', (0, 0, 0))], 'XYZ').to_matrix().to_4x4()
        basis = hips_rest.inverted() @ M @ r
        loc, rot, _ = basis.decompose()
        hb = ao.pose.bones['hips']; hb.location = loc; hb.rotation_quaternion = rot
        for pb in ao.pose.bones:
            pb.keyframe_insert('location', frame=f); pb.keyframe_insert('rotation_quaternion', frame=f)
    tr = ao.animation_data.nla_tracks.new(); tr.name = name; tr.strips.new(name, 0, act); tr.mute = True
    ao.animation_data.action = None
    print('baked', name, nf, 'frames', flush=True)


def main(src, out, tris=12000, tex=1024, preview=None):
    bpy.ops.wm.read_factory_settings(use_empty=True)
    bpy.ops.import_scene.gltf(filepath=src)
    o = next(o for o in bpy.data.objects if o.type == 'MESH'); o.name = 'body'
    bpy.context.view_layer.objects.active = o; o.select_set(True)
    bpy.ops.object.transform_apply(location=True, rotation=True, scale=True)
    for ob in list(bpy.data.objects):
        if ob is not o: bpy.data.objects.remove(ob)
    o.parent = None
    co = np.array([v.co[:] for v in o.data.vertices]); J, info = bones(co); del co
    print('joints', {k: tuple(round(c, 3) for c in v[1]) for k, v in J.items()}, flush=True)
    n0 = len(o.data.polygons); dm = o.modifiers.new('dec', 'DECIMATE'); dm.ratio = 40000 / n0
    bpy.ops.object.modifier_apply(modifier=dm.name)
    img = clean_texture(o, tex, 5, 24)
    for m in o.data.materials: plain(m, image=img)
    ao = armature(J); skin(o, ao, J, info)
    if tris < len(o.data.polygons):
        dm = o.modifiers.new('dec', 'DECIMATE'); dm.ratio = tris / len(o.data.polygons)
        bpy.context.view_layer.objects.active = o
        while o.modifiers[0].name != 'dec': bpy.ops.object.modifier_move_up(modifier='dec')
        bpy.ops.object.modifier_apply(modifier='dec')
    for name, fn, dur, loop in CLIPS: bake(ao, name, fn, dur, loop, info)
    for pb in ao.pose.bones: pb.location = (0, 0, 0); pb.rotation_quaternion = (1, 0, 0, 0)
    if preview: bpy.ops.wm.save_as_mainfile(filepath=preview)
    bpy.ops.object.select_all(action='DESELECT')
    bpy.ops.export_scene.gltf(filepath=os.path.abspath(out), export_format='GLB', export_animation_mode='NLA_TRACKS',
                              export_skins=True, export_def_bones=False, export_optimize_animation_size=True,
                              export_image_format='WEBP', export_apply=False, export_yup=True)
    print('tris', len(o.data.polygons), 'saved', out, round(os.path.getsize(out) / 1e6, 2), 'MB')


if __name__ == '__main__':
    a = sys.argv[1:]; opt = dict(x.split('=', 1) for x in a if '=' in x); pos = [x for x in a if '=' not in x]
    main(pos[0], pos[1], int(opt.get('tris', 12000)), int(opt.get('tex', 1024)), opt.get('blend'))
