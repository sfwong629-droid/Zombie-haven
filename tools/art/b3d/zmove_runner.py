# zmove_runner.py -- RAW.glb MODE OUT.json : the Runner's moves, man and woman (14-ZOMBIE-MOVES.md; previews for W216 and W239, made by hand, not in
# the game).
# MODE tackle (clip runner_tackle, 1.0 s, its attack): a running tackle. It drops its weight and throws both arms back, then drives its hips forward
#   and down, the body pitching forward over the front foot, and flings both arms out at the target, hands open and wide, as if diving into a tackle
#   without slowing; then it pulls back up. The feet stay planted (the legs are solved to them). Starts and ends on today's attack's first pose.
# MODE bounce (clip runner_bounce, 1.8 s, the extra move that is not an attack, W239): bouncing on the spot, ready to sprint: quick knee bounces,
#   the arms pumping a little, the head twitching sharply from side to side. Feet planted. Starts and ends on its first idle pose.
# Rig: +X its left, -Y forward, +Z up.
import bpy, sys, os, math, json
from mathutils import Matrix, Vector, Quaternion
a = sys.argv[sys.argv.index('--') + 1:]; src, MODE, out = a[0], a[1], a[2]
bpy.ops.wm.read_factory_settings(use_empty=True); bpy.ops.import_scene.gltf(filepath=src)
ao = next(o for o in bpy.data.objects if o.type == 'ARMATURE'); body = bpy.data.objects['body']; PB = ao.pose.bones; W = ao.matrix_world; sc = bpy.context.scene
ad = ao.animation_data
for tr in ad.nla_tracks: tr.mute = True
base = bpy.data.actions['zombie_attack' if MODE == 'tackle' else 'idle']; ad.action = base
try:
    if base.slots: ad.action_slot = base.slots[0]
except Exception: pass
for pb in PB: pb.rotation_mode = 'QUATERNION'
f0 = base.frame_range[0]; FPS = 30; SC = W.to_scale().x
SECS = float(os.environ.get('ZH_SECS', 1.0 if MODE == 'tackle' else 1.8))
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
def move_pelvis(d):
    pb = PB['pelvis']; M = pb.matrix.copy(); M.translation = M.translation + W.inverted().to_3x3() @ d; pb.matrix = M; upd()
def lowest():
    dg = bpy.context.evaluated_depsgraph_get(); ev = body.evaluated_get(dg); m = ev.to_mesh(); z = min((ev.matrix_world @ v.co).z for v in m.vertices); ev.to_mesh_clear(); return z
def jit(t, f, ph=0): return math.sin(2 * math.pi * f * t * SECS + ph)
def keys(K, t):
    for (ta, va), (tb, vb) in zip(K, K[1:]):
        if ta <= t <= tb: s_ = sst(ta, tb, t); return [x * (1 - s_) + y * s_ for x, y in zip(va, vb)]
    return list(K[-1][1])
goto(); base_low = lowest(); H = wpos('head', True).z
FOOT = {s: (wpos('foot.' + s), wpos('foot.' + s, True), wpos('shin.' + s) - (wpos('thigh.' + s) + wpos('foot.' + s)) / 2) for s in 'LR'}
LEGS = [n for s in 'LR' for n in ('thigh.' + s, 'shin.' + s, 'foot.' + s)]; ARMS = [n for s in 'LR' for n in ('upperarm.' + s, 'forearm.' + s, 'hand.' + s)]
def plant():
    for s in 'LR':
        an, to, pole = FOOT[s]; two_bone('thigh.' + s, 'shin.' + s, an, pole); aim('foot.' + s, wpos('foot.' + s) + (to - an))
if MODE == 'tackle':
    # (t, weight, hips forward, hips down, chest lean, head (- = up), arm: upper dir xyz, fore dir xyz) -- right arm mirrors the left
    K = [(0.00, (0, 0, 0, 0, 0, .2, -.1, -.95, .15, -.5, -.85)),
         (0.28, (1, -.04, .05, 8, -4, .35, .55, -.75, .2, .55, -.8)),        # gather: weight down, arms thrown back
         (0.48, (1, .10, .11, 34, -22, .45, -.88, -.12, .35, -.93, .05)),    # the dive: hips driven forward, body pitched, arms flung out wide, face up at the target
         (0.68, (1, .105, .11, 36, -24, .40, -.90, -.15, .25, -.96, -.05)),   # the hold: arms closing round the target
         (1.00, (0, 0, 0, 0, 0, .2, -.1, -.95, .15, -.5, -.85))]
else:
    K = [(0.00, (0,)), (0.10, (1,)), (0.90, (1,)), (1.00, (0,))]
order = [b.name for b in PB]; KEY = {b: {'rot': [], 'loc': []} for b in order}
nf = int(round(SECS * FPS))
for i in range(nf + 1):
    t = i / nf; goto(); k = keys(K, t); w = k[0]
    q0 = {n: PB[n].rotation_quaternion.copy() for n in LEGS + ARMS}
    if MODE == 'tackle':
        move_pelvis(Vector((0, -k[1] * H, -k[2] * H)) * w); plant()
        turn('chest', (1, 0, 0), k[3] * w, wpos('chest')); turn('neck', (1, 0, 0), -k[3] * .35 * w); turn('head', (1, 0, 0), k[4] * w)
        for s, sg in (('L', 1), ('R', -1)):
            aim('upperarm.' + s, wpos('upperarm.' + s) + Vector((sg * k[5], k[6], k[7])).normalized())
            aim('forearm.' + s, wpos('forearm.' + s) + Vector((sg * k[8], k[9], k[10])).normalized())
            aim('hand.' + s, wpos('hand.' + s) + Vector((sg * k[8], k[9], k[10])).normalized())
        aw = w
    else:   # bounce: knees dip at 2.6 a second, arms pump a little, the head twitches in sharp jerks
        dip = .5 - .5 * math.cos(2 * math.pi * 2.6 * t * SECS)
        move_pelvis(Vector((0, 0, -.025 * H * dip * w))); plant()
        turn('chest', (1, 0, 0), (5 + 3 * dip) * w, wpos('chest'))
        jerk = math.copysign(abs(jit(t, 1.3)) ** .25, jit(t, 1.3))   # snaps from side to side and holds
        turn('head', (0, 0, 1), 22 * jerk * w); turn('head', (0, 1, 0), 9 * jit(t, 3.1, 1) * w)
        for s, sg in (('L', 1), ('R', -1)):
            turn('upperarm.' + s, (1, 0, 0), (10 * sg * jit(t, 2.6)) * w, wpos('upperarm.' + s)); turn('forearm.' + s, (1, 0, 0), -25 * w, wpos('forearm.' + s))
        aw = w
    wl = min(1., 8 * w)
    for n in LEGS: PB[n].rotation_quaternion = q0[n].slerp(PB[n].rotation_quaternion.copy(), wl)
    for n in ARMS: PB[n].rotation_quaternion = q0[n].slerp(PB[n].rotation_quaternion.copy(), aw)
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
print('RUNNER', MODE, 'frames', nf, 'seconds', SECS, '->', out)
