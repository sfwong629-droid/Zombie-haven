# zmove_dog.py -- RAW.glb MODE OUT.json : the Dog's moves (14-ZOMBIE-MOVES.md; previews for W216 and W239, made by hand, not in the game).
# MODE lunge (clip dog_lunge, 1.3 s, its attack): it crouches back on its hind legs, springs up and forward with the front legs reaching, bites at
#   arm height and shakes its head hard from side to side three times, then drops back down onto its front paws. It starts and ends on today's
#   attack's first pose.
# MODE shake (clip dog_shake, 2.4 s, the extra move that is not an attack, W239): nose down to the ground, sniffing (quick small bobs), then it
#   shakes itself off: the whole body rolls from side to side, the head turning against it and the tail wagging, dying away. Starts and ends on its
#   first idle pose.
# The hind paws stay planted throughout (the legs are solved to them); in the shake all four do. Rig: hips (root), chest, neck, head, tail,
# bthigh/bshin/bpaw and fupper/flower/fpaw .L/.R; +X its left, -Y forward, +Z up.
import bpy, sys, os, math, json
from mathutils import Matrix, Vector, Quaternion
a = sys.argv[sys.argv.index('--') + 1:]; src, MODE, out = a[0], a[1], a[2]
bpy.ops.wm.read_factory_settings(use_empty=True); bpy.ops.import_scene.gltf(filepath=src)
ao = next(o for o in bpy.data.objects if o.type == 'ARMATURE'); body = next(o for o in bpy.data.objects if o.type == 'MESH' and o.find_armature() == ao)
PB = ao.pose.bones; W = ao.matrix_world; sc = bpy.context.scene; ad = ao.animation_data
for tr in ad.nla_tracks: tr.mute = True
base = bpy.data.actions['zombie_attack' if MODE == 'lunge' else 'idle']; ad.action = base
try:
    if base.slots: ad.action_slot = base.slots[0]
except Exception: pass
for pb in PB: pb.rotation_mode = 'QUATERNION'
f0 = base.frame_range[0]; FPS = 30; SC = W.to_scale().x
SECS = float(os.environ.get('ZH_SECS', 1.3 if MODE == 'lunge' else 2.4))
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
def two_bone(b1, b2, end, pole):
    h = wpos(b1); l1 = PB[b1].length * SC; l2 = PB[b2].length * SC
    v = end - h; dd = min(max(v.length, abs(l1 - l2) * 1.05), .995 * (l1 + l2)); n = v.normalized()
    x = (l1 * l1 - l2 * l2 + dd * dd) / (2 * dd); hg = math.sqrt(max(l1 * l1 - x * x, 0)); p = Vector(pole); p = (p - n * p.dot(n)).normalized()
    aim(b1, h + n * x + p * hg); aim(b2, h + n * dd)
def move_root(d):
    pb = PB['hips']; M = pb.matrix.copy(); M.translation = M.translation + W.inverted().to_3x3() @ d; pb.matrix = M; upd()
def lowest():
    dg = bpy.context.evaluated_depsgraph_get(); ev = body.evaluated_get(dg); m = ev.to_mesh(); z = min((ev.matrix_world @ v.co).z for v in m.vertices); ev.to_mesh_clear(); return z
def jit(t, f, ph=0): return math.sin(2 * math.pi * f * t * SECS + ph)
goto(); base_low = lowest()
LEGS = {'b': ('bthigh', 'bshin', 'bpaw'), 'f': ('fupper', 'flower', 'fpaw')}
PAW0 = {}
for k, (u, l, p) in LEGS.items():
    for s in 'LR':
        PAW0[k + s] = (wpos(p + '.' + s), wpos(p + '.' + s, True), wpos(l + '.' + s) - (wpos(u + '.' + s) + wpos(p + '.' + s)) / 2)
def plant(k, s):
    u, l, p = LEGS[k]; an, to, pole = PAW0[k + s]; two_bone(u + '.' + s, l + '.' + s, an, pole); aim(p + '.' + s, wpos(p + '.' + s) + (to - an))
if MODE == 'lunge':
    # (t, crouch, rear (degrees, nose up), forward, front legs reach (degrees), head up/out (degrees), shake)
    K = [(0.00, (0, 0, 0, 0, 0, 0)), (0.20, (1, 0, -.02, 0, 0, 0)), (0.36, (.2, 24, .15, 55, -14, 0)), (0.44, (0, 27, .17, 45, -18, 1)),
         (0.80, (0, 26, .16, 40, -16, 1)), (0.92, (.3, 6, .04, 10, -4, 0)), (1.00, (0, 0, 0, 0, 0, 0))]
else:
    # (t, nose down (degrees), sniff, roll (degrees), tail wag)
    K = [(0.00, (0, 0, 0, 0)), (0.12, (34, 1, 0, 0)), (0.50, (36, 1, 0, 0)), (0.58, (0, 0, 0, 0)), (0.62, (0, 0, 1, 1)), (0.88, (0, 0, .25, .5)), (1.00, (0, 0, 0, 0))]
def keys(t):
    for (ta, va), (tb, vb) in zip(K, K[1:]):
        if ta <= t <= tb: s_ = sst(ta, tb, t); return [x * (1 - s_) + y * s_ for x, y in zip(va, vb)]
    return list(K[-1][1])
order = [b.name for b in PB]; KEY = {b: {'rot': [], 'loc': []} for b in order}
nf = int(round(SECS * FPS)); BACK = ['bthigh.L', 'bshin.L', 'bpaw.L', 'bthigh.R', 'bshin.R', 'bpaw.R']; FRONT = [n.replace('b', 'f', 1).replace('thigh', 'upper').replace('shin', 'lower') for n in BACK]
for i in range(nf + 1):
    t = i / nf; goto(); k = keys(t)
    q0 = {n: PB[n].rotation_quaternion.copy() for n in BACK + FRONT}
    if MODE == 'lunge':
        crouch, rear, fwd, reach, headup, shake = k; w = min(1., (abs(rear) / 10 + crouch + abs(fwd) * 20))
        hp = (wpos('bpaw.L') + wpos('bpaw.R')) / 2 + Vector((0, 0, .08))            # rear up about the hind feet
        move_root(Vector((0, .02 * crouch, -.06 * crouch)))                         # crouch back and down
        rot_about('hips', Quaternion(Vector((1, 0, 0)), math.radians(-rear)), hp)  # nose up
        move_root(Vector((0, -fwd, 0)))
        for s in 'LR': plant('b', s)
        fr0 = {n: PB[n].rotation_quaternion.copy() for n in FRONT}
        for s in 'LR': plant('f', s)                       # on the ground (crouch, landing)
        fpl = {n: PB[n].rotation_quaternion.copy() for n in FRONT}
        for n in FRONT: PB[n].rotation_quaternion = fr0[n]
        upd()
        for s in 'LR':   # in the air: front legs reach forward and up from the shoulder, the lower leg folded a little
            turn('fupper.' + s, (1, 0, 0), -reach, wpos('fupper.' + s)); turn('flower.' + s, (1, 0, 0), reach * .5, wpos('flower.' + s))
        up = sst(2, 10, rear)
        for n in FRONT: PB[n].rotation_quaternion = fpl[n].slerp(PB[n].rotation_quaternion.copy(), up)
        upd()
        turn('neck', (1, 0, 0), rear * .55 + headup * .2); turn('head', (1, 0, 0), rear * .35)   # the body rears, the head stays pointed at the arm in front, a little up
        turn('neck', (0, 0, 1), 24 * shake * jit(t, 4.5), wpos('neck')); turn('head', (0, 1, 0), 10 * shake * jit(t, 4.5, .6))
        turn('tail', (1, 0, 0), -20 * min(1, rear / 30))
        wl = min(1., 8 * w)
        for n in BACK + FRONT: PB[n].rotation_quaternion = q0[n].slerp(PB[n].rotation_quaternion.copy(), wl)
    else:
        nose, sniff, roll, wag = k; w = min(1., nose / 10 + roll * 3 + sniff)
        turn('neck', (1, 0, 0), nose + 4 * sniff * abs(jit(t, 3.2))); turn('head', (1, 0, 0), nose * .4 + 3 * sniff * jit(t, 6.4))
        c = (wpos('hips') + wpos('chest', True)) / 2
        ang = 22 * roll * jit(t, 4.2)
        rot_about('hips', Quaternion(Vector((0, 1, 0)), math.radians(ang)), c)
        move_root(Vector((0, 0, -.075 * abs(math.sin(math.radians(ang))))))   # sink a little as it rolls, so the far legs still reach the ground
        turn('neck', (0, 0, 1), -1.6 * ang, wpos('neck')); turn('head', (0, 1, 0), -1.2 * ang)
        turn('tail', (0, 0, 1), 35 * wag * jit(t, 5))
        for kk in 'bf':
            for s in 'LR': plant(kk, s)
        wl = min(1., 8 * w)
        for n in BACK + FRONT: PB[n].rotation_quaternion = q0[n].slerp(PB[n].rotation_quaternion.copy(), wl)
    upd()
    lo = lowest()
    if lo < base_low - .002: move_root(Vector((0, 0, base_low - lo)))
    for b in order:
        q = PB[b].rotation_quaternion; KEY[b]['rot'].append([q.x, q.y, q.z, q.w])
        if b == 'hips': KEY[b]['loc'].append(list(PB[b].location))
for b in order:
    for i in range(1, len(KEY[b]['rot'])):
        if sum(x * y for x, y in zip(KEY[b]['rot'][i], KEY[b]['rot'][i - 1])) < 0: KEY[b]['rot'][i] = [-x for x in KEY[b]['rot'][i]]
json.dump({'fps': FPS, 'frames': nf, 'stride': None, 'seconds': SECS, 'bones': KEY, 'wdir': None}, open(out, 'w'))
print('DOG', MODE, 'frames', nf, 'seconds', SECS, '->', out)
