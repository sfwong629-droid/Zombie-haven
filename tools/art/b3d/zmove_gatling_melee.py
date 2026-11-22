# zmove_gatling_melee.py -- RAW.glb OUT.json : the Gatling Boss's close-up attack, the gun club (owner, 22 Nov: "Can we change up the melee attack?
# The feet looks weirdly apart. Think of a melee attack for the zombie"). Preview for W216: made by hand. Clip name gatling_melee, 1.0 s.
# He swings the heavy gun like a club: the body turns to his left and the gun is cocked back and up behind the shoulder, then the body whips round
# and the gun sweeps flat across his front at chest height and follows through to his right, then he settles back. The feet stay planted where
# they stand in idle (no stride, no wide stance); the right arm stays as it hangs in idle. Starts and ends exactly on his first idle pose.
# Rig: +X his left, -Y forward, +Z up. Env: ZH_SECS (1.0).
import bpy, sys, os, math, json
from mathutils import Matrix, Vector, Quaternion
a = sys.argv[sys.argv.index('--') + 1:]; src, out = a[0], a[1]
SECS = float(os.environ.get('ZH_SECS', 1.0))
bpy.ops.wm.read_factory_settings(use_empty=True); bpy.ops.import_scene.gltf(filepath=src)
ao = next(o for o in bpy.data.objects if o.type == 'ARMATURE'); body = bpy.data.objects['body']; PB = ao.pose.bones; W = ao.matrix_world; sc = bpy.context.scene
ad = ao.animation_data
for tr in ad.nla_tracks: tr.mute = True
base = bpy.data.actions['idle']; ad.action = base
try:
    if base.slots: ad.action_slot = base.slots[0]
except Exception: pass
for pb in PB: pb.rotation_mode = 'QUATERNION'
f0 = base.frame_range[0]; FPS = 30; SC = W.to_scale().x
def upd(): bpy.context.view_layer.update()
def goto(): sc.frame_set(int(f0)); upd()
def sst(a_, b_, x): t = min(1., max(0., (x - a_) / max(1e-6, b_ - a_))); return t * t * (3 - 2 * t)
def wpos(n, tail=False): pb = PB[n]; return W @ (pb.tail if tail else pb.head)
def rot_about(name, q, c):
    pb = PB[name]; M = W @ pb.matrix; T = Matrix.Translation(c) @ q.to_matrix().to_4x4() @ Matrix.Translation(-c); pb.matrix = W.inverted() @ T @ M; upd()
def aim(name, to):
    d0 = (wpos(name, True) - wpos(name)).normalized(); d1 = (to - wpos(name)).normalized(); rot_about(name, d0.rotation_difference(d1), wpos(name))
def turn(name, axis, deg, about=None):
    if abs(deg) < .005: return
    rot_about(name, Quaternion(Vector(axis), math.radians(deg)), (about if about is not None else wpos(name)).copy())
def keys(K, t):
    for (ta, va), (tb, vb) in zip(K, K[1:]):
        if ta <= t <= tb: s = sst(ta, tb, t); return [x * (1 - s) + y * s for x, y in zip(va, vb)]
    return list(K[-1][1])
def lowest():
    dg = bpy.context.evaluated_depsgraph_get(); ev = body.evaluated_get(dg); m = ev.to_mesh(); z = min((ev.matrix_world @ v.co).z for v in m.vertices); ev.to_mesh_clear(); return z
def move_pelvis(d):
    pb = PB['pelvis']; M = pb.matrix.copy(); M.translation = M.translation + W.inverted().to_3x3() @ d; pb.matrix = M; upd()
goto(); base_low = lowest()
import numpy as np   # the gun's own axis in the left forearm's frame (the gun is modelled onto the forearm)
gi = body.vertex_groups['forearm.L'].index
dg = bpy.context.evaluated_depsgraph_get(); ev = body.evaluated_get(dg); m = ev.to_mesh()
P = np.array([tuple(ev.matrix_world @ m.vertices[v.index].co) for v in body.data.vertices if v.groups and max(v.groups, key=lambda g: g.weight).group == gi]); ev.to_mesh_clear()
ax = np.linalg.svd(P - P.mean(0))[2][0]; ax = ax if ax[1] < 0 else -ax
GUN_LOCAL = (W @ PB['forearm.L'].matrix).to_3x3().inverted() @ Vector(ax)
def gun_dir(): return ((W @ PB['forearm.L'].matrix).to_3x3() @ GUN_LOCAL).normalized()
# (t, weight, body turn (+ = to his left), chest lean, upper-arm dir xyz, gun dir xyz) -- directions in the body's frame before the turn
K = [(0.00, (0, 0, 0, .25, -.15, -.95, .25, -.85, -.45)),
     (0.36, (1, 28, -4, .70, .45, -.25, .35, .55, .75)),      # cocked: the gun back and up behind his left shoulder
     (0.50, (1, 2, 8, .55, -.55, -.15, -.25, -.95, .10)),     # the swing: flat across his front at chest height
     (0.60, (1, -26, 12, .30, -.90, -.10, -.70, -.70, -.10)),  # follow-through to his right, kept out in front of the chest
     (0.80, (.6, -14, 6, .25, -.60, -.55, -.40, -.75, -.40)),
     (1.00, (0, 0, 0, .25, -.15, -.95, .25, -.85, -.45))]
order = [b.name for b in PB]; KEY = {b: {'rot': [], 'loc': []} for b in order}
nf = int(round(SECS * FPS))
for i in range(nf + 1):
    t = i / nf; goto(); k = keys(K, t); w = k[0]
    turn('chest', (0, 0, 1), k[1] * w, wpos('chest'))   # only the upper body turns: the hips and legs stay as in idle, so the feet stay planted; turn('chest', (1, 0, 0), k[2] * w, wpos('chest')); turn('neck', (1, 0, 0), -k[2] * .5 * w)
    R = Matrix.Rotation(math.radians(k[1] * w), 3, 'Z')
    q0 = {n: PB[n].rotation_quaternion.copy() for n in ('upperarm.L', 'forearm.L', 'hand.L')}
    u = R @ Vector(k[3:6]).normalized(); g = R @ Vector(k[6:9]).normalized()
    aim('upperarm.L', wpos('upperarm.L') + u)
    rot_about('forearm.L', gun_dir().rotation_difference(g), wpos('forearm.L'))
    for n, qa in q0.items(): PB[n].rotation_quaternion = qa.slerp(PB[n].rotation_quaternion.copy(), w)
    upd()
    lo = lowest()
    if lo < base_low - .002: move_pelvis(Vector((0, 0, base_low - lo)))
    for b in order:
        q = PB[b].rotation_quaternion; KEY[b]['rot'].append([q.x, q.y, q.z, q.w])
        if b == 'pelvis': KEY[b]['loc'].append(list(PB[b].location))
for b in order:
    for i in range(1, len(KEY[b]['rot'])):
        if sum(x * y for x, y in zip(KEY[b]['rot'][i], KEY[b]['rot'][i - 1])) < 0: KEY[b]['rot'][i] = [-x for x in KEY[b]['rot'][i]]
KEY = {b: v for b, v in KEY.items() if not b.startswith(('weapon_', 'armor_')) and not b.endswith(('_tip', '_grip1', '_grip2', '_grip_low'))}
json.dump({'fps': FPS, 'frames': nf, 'stride': None, 'seconds': SECS, 'bones': KEY, 'wdir': None}, open(out, 'w'))
print('GATMELEE frames', nf, 'seconds', SECS, '->', out)
