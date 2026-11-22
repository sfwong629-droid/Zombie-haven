# zmove_gatling_roar.py -- RAW.glb OUT.json : the Gatling Boss's roar, a move that is not an attack (owner, 22 Nov: "add some additional non attack
# animation to each zombie. Like the Gatling boss will do a roar every now and then or before an attack"). Preview for W229: made by hand.
# Clip name gatling_roar, 1.8 s. He draws a breath (chest up, leaning back, head up), then throws the chest forward and roars with the face thrust
# out and up, both arms flexed out to the sides (the gun pointing out and up, the right fist up), the whole upper body shaking; then he settles.
# The feet stay planted as in idle. Starts and ends exactly on his first idle pose. Rig: +X his left, -Y forward, +Z up. Env: ZH_SECS (1.8).
import bpy, sys, os, math, json
from mathutils import Matrix, Vector, Quaternion
a = sys.argv[sys.argv.index('--') + 1:]; src, out = a[0], a[1]
SECS = float(os.environ.get('ZH_SECS', 1.8))
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
# (t, weight, chest lean (+ forward), neck, head (- = face up), shake, L upper-arm dir, gun dir, R upper-arm dir, R forearm dir) -- body frame
REST = (0, 0, 0, 0, .25, -.15, -.95, .25, -.85, -.45, -.25, -.15, -.95, -.25, -.85, -.45)
K = [(0.00, (0,) + REST),
     (0.22, (1, -9, -10, -6, 0, .55, .05, -.85, .35, -.75, -.1, -.55, .05, -.85, -.3, -.6, .2)),     # the breath: chest up, head up, arms starting out
     (0.36, (1, 6, 8, -30, 1, .80, .15, -.58, .45, -.55, .70, -.80, .15, -.58, -.35, -.45, .82)),  # the roar: chest forward, face thrust out and up, arms flexed
     (0.72, (1, 7, 9, -32, 1, .80, .15, -.58, .45, -.55, .70, -.80, .15, -.58, -.35, -.45, .82)),
     (0.88, (.5, 2, 4, -6, 0, .55, .05, -.85, .35, -.80, -.2, -.55, .05, -.85, -.3, -.7, .0)),
     (1.00, (0,) + REST)]
order = [b.name for b in PB]; KEY = {b: {'rot': [], 'loc': []} for b in order}
nf = int(round(SECS * FPS))
def jit(t, f, ph): return math.sin(2 * math.pi * f * t * SECS + ph)
for i in range(nf + 1):
    t = i / nf; goto(); k = keys(K, t); w = k[0]; sh = k[4] * w
    turn('chest', (1, 0, 0), k[1] * w + 1.8 * sh * jit(t, 9, 0), wpos('chest')); turn('chest', (0, 0, 1), 2.5 * sh * jit(t, 6, 1), wpos('chest'))
    turn('neck', (1, 0, 0), k[2] * w); turn('head', (1, 0, 0), k[3] * w + 3 * sh * jit(t, 11, .5)); turn('head', (0, 1, 0), 3 * sh * jit(t, 7, 2))
    q0 = {n: PB[n].rotation_quaternion.copy() for s in 'LR' for n in ('upperarm.' + s, 'forearm.' + s, 'hand.' + s)}
    aim('upperarm.L', wpos('upperarm.L') + Vector(k[5:8]).normalized())
    rot_about('forearm.L', gun_dir().rotation_difference(Vector(k[8:11]).normalized()), wpos('forearm.L'))
    aim('upperarm.R', wpos('upperarm.R') + Vector(k[11:14]).normalized())
    aim('forearm.R', wpos('forearm.R') + Vector(k[14:17]).normalized())
    aim('hand.R', wpos('hand.R') + (wpos('forearm.R', True) - wpos('forearm.R')).normalized())
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
print('GATROAR frames', nf, 'seconds', SECS, '->', out)
