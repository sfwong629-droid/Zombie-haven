# zmove_gatling_carry.py -- RAW.glb CLIP OUT.json : the Gatling Boss's walk or run with the gun carried level (owner, 22 Nov: "Make a preview with
# his walk and run"; today the gun arm swings like an empty arm and points at the ground). Preview for W216: made by hand on top of today's clip.
# Everything but the gun arm is today's clip unchanged (legs, body, the right arm's swing). The gun arm is held as in the braced fire: the elbow
# tucked at his side, the gun level at hip height, pointing where his chest points, so it bobs and turns with his body. It loops as today's does.
# ZH_SLOW (walk 1.5, run 1.3; the run sinks deeper and leans further): the clip is played that many times slower, and made heavy (owner, 22 Nov: "Walk should be slower since it a big body.
# Make it seem more like a big person moving"): the hips shift over the foot that carries the weight, sink at each footfall, the chest rolls
# against the hips and leans forward a little; the feet stay exactly where today's clip puts them (the legs are solved to them).
# Rig: +X his left, -Y forward, +Z up.
import bpy, sys, os, math, json
from mathutils import Matrix, Vector
a = sys.argv[sys.argv.index('--') + 1:]; src, clip, out = a[0], a[1], a[2]
bpy.ops.wm.read_factory_settings(use_empty=True); bpy.ops.import_scene.gltf(filepath=src)
ao = next(o for o in bpy.data.objects if o.type == 'ARMATURE'); body = bpy.data.objects['body']; PB = ao.pose.bones; W = ao.matrix_world; sc = bpy.context.scene
ad = ao.animation_data
for tr in ad.nla_tracks: tr.mute = True
def use(name):
    act = bpy.data.actions[name]; ad.action = act
    try:
        if act.slots: ad.action_slot = act.slots[0]
    except Exception: pass
    return act
for pb in PB: pb.rotation_mode = 'QUATERNION'
def upd(): bpy.context.view_layer.update()
def wpos(n, tail=False): pb = PB[n]; return W @ (pb.tail if tail else pb.head)
def rot_about(name, q, c):
    pb = PB[name]; M = W @ pb.matrix; T = Matrix.Translation(c) @ q.to_matrix().to_4x4() @ Matrix.Translation(-c); pb.matrix = W.inverted() @ T @ M; upd()
def aim(name, to):
    d0 = (wpos(name, True) - wpos(name)).normalized(); d1 = (to - wpos(name)).normalized(); rot_about(name, d0.rotation_difference(d1), wpos(name))
use('idle'); sc.frame_set(0); upd()
import numpy as np   # the gun's own axis in the left forearm's frame (the gun is modelled onto the forearm)
gi = body.vertex_groups['forearm.L'].index
dg = bpy.context.evaluated_depsgraph_get(); ev = body.evaluated_get(dg); m = ev.to_mesh()
P = np.array([tuple(ev.matrix_world @ m.vertices[v.index].co) for v in body.data.vertices if v.groups and max(v.groups, key=lambda g: g.weight).group == gi]); ev.to_mesh_clear()
ax = np.linalg.svd(P - P.mean(0))[2][0]; ax = ax if ax[1] < 0 else -ax
GUN_LOCAL = (W @ PB['forearm.L'].matrix).to_3x3().inverted() @ Vector(ax)
def gun_dir(): return ((W @ PB['forearm.L'].matrix).to_3x3() @ GUN_LOCAL).normalized()
act = use(clip); f0, f1 = act.frame_range; fps = sc.render.fps
SLOW = float(os.environ.get('ZH_SLOW', 1.5 if clip == 'walk' else 1.3))   # run: owner, 22 Nov: "Make a new run for the Gatling boss. Try to be similar to your walk"
RUN = clip != 'walk'; SWAY, DROP, LEAN = (.03, .03, 11) if RUN else (.03, .018, 6); nf = int(round((f1 - f0) * SLOW))
def sst(a_, b_, x): t = min(1., max(0., (x - a_) / max(1e-6, b_ - a_))); return t * t * (3 - 2 * t)
SC = W.to_scale().x
def two_bone(b1, b2, end, pole):
    h = wpos(b1); l1 = PB[b1].length * SC; l2 = PB[b2].length * SC
    v = end - h; dd = min(max(v.length, abs(l1 - l2) * 1.05), .995 * (l1 + l2)); n = v.normalized()
    x_ = (l1 * l1 - l2 * l2 + dd * dd) / (2 * dd); hg = math.sqrt(max(l1 * l1 - x_ * x_, 0)); p = Vector(pole); p = (p - n * p.dot(n)).normalized()
    aim(b1, h + n * x_ + p * hg); aim(b2, h + n * dd)
def move_pelvis(d):
    pb = PB['pelvis']; M = pb.matrix.copy(); M.translation = M.translation + W.inverted().to_3x3() @ d; pb.matrix = M; upd()
order = [b.name for b in PB]; KEY = {b: {'rot': [], 'loc': []} for b in order}
Z = Vector((0, 0, 1))
for i in range(nf + 1):
    ft = f0 + i * (f1 - f0) / nf; sc.frame_set(int(ft), subframe=ft - int(ft)); upd()
    if SLOW > 1:   # heavy: weight over the carrying foot, a sink at each footfall, the chest rolling against the hips
        FT = {sd: (wpos('foot.' + sd), wpos('foot.' + sd, True), wpos('shin.' + sd) - (wpos('thigh.' + sd) + wpos('foot.' + sd)) / 2) for sd in 'LR'}
        hL, hR = FT['L'][0].z, FT['R'][0].z; wgt = sst(-.04, .04, hR - hL)   # 1: all the weight on the left foot (the right one is higher)
        side = (wgt - .5) * 2; drop = 1 - abs(side)                           # drop: both feet down, the weight passing from one to the other
        move_pelvis(Vector((SWAY * side, 0, -DROP * drop)))
        for sd in 'LR':
            an, to, pole = FT[sd]; two_bone('thigh.' + sd, 'shin.' + sd, an, pole); aim('foot.' + sd, to)
        c = wpos('chest'); rot_about('chest', Matrix.Rotation(math.radians(-5 * side), 3, 'Y').to_quaternion(), c)
        rot_about('chest', Matrix.Rotation(math.radians(LEAN), 3, 'X').to_quaternion(), wpos('chest'))
        rot_about('neck', Matrix.Rotation(math.radians(-4), 3, 'X').to_quaternion(), wpos('neck'))
    x = wpos('upperarm.L') - wpos('upperarm.R'); x.z = 0; x.normalize(); fwd = x.cross(Z).normalized()   # where his chest points, flat
    S = wpos('upperarm.L')
    aim('upperarm.L', S + x * .045 + fwd * .07 + Vector((0, 0, -.2)))
    g = (fwd + Vector((0, 0, .04))).normalized()
    rot_about('forearm.L', gun_dir().rotation_difference(g), wpos('forearm.L'))
    for b in order:
        q = PB[b].rotation_quaternion; KEY[b]['rot'].append([q.x, q.y, q.z, q.w])
        if b == 'pelvis': KEY[b]['loc'].append(list(PB[b].location))
for b in order:
    for i in range(1, len(KEY[b]['rot'])):
        if sum(x * y for x, y in zip(KEY[b]['rot'][i], KEY[b]['rot'][i - 1])) < 0: KEY[b]['rot'][i] = [-x for x in KEY[b]['rot'][i]]
KEY = {b: v for b, v in KEY.items() if not b.startswith(('weapon_', 'armor_')) and not b.endswith(('_tip', '_grip1', '_grip2', '_grip_low'))}
json.dump({'fps': fps, 'frames': nf, 'stride': None, 'seconds': nf / fps, 'bones': KEY, 'wdir': None}, open(out, 'w'))
print('GATCARRY', clip, 'frames', nf, '->', out)
