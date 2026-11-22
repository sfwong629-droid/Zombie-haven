# zmove_screamer.py -- RAW.glb MODE OUT.json : the Screamer's moves (14-ZOMBIE-MOVES.md; previews for W216 and W229, made by hand, not in the game).
# MODE scream (clip screamer_scream, 1.6 s, her attack): she draws in (hunched a little, fists pulled to the chest), then throws the chest forward
#   and the arms back and out behind her, back arched, head thrown up, the whole body shaking through the scream; then she settles. It starts and
#   ends on today's scream's first pose (today she folds forward with her face to the ground).
# MODE cough (clip screamer_cough, 2.2 s, the extra move that is not an attack, W229): one hand to the throat, three hacking coughs that jerk the
#   chest forward, then a short warm-up shriek with the head up; the hand comes down. Starts and ends on her first idle pose.
# The feet stay planted. Rig: +X her left, -Y forward, +Z up.
import bpy, sys, os, math, json
from mathutils import Matrix, Vector, Quaternion
a = sys.argv[sys.argv.index('--') + 1:]; src, MODE, out = a[0], a[1], a[2]
bpy.ops.wm.read_factory_settings(use_empty=True); bpy.ops.import_scene.gltf(filepath=src)
ao = next(o for o in bpy.data.objects if o.type == 'ARMATURE'); body = bpy.data.objects['body']; PB = ao.pose.bones; W = ao.matrix_world; sc = bpy.context.scene
ad = ao.animation_data
for tr in ad.nla_tracks: tr.mute = True
base = bpy.data.actions['scream' if MODE == 'scream' else 'idle']; ad.action = base
try:
    if base.slots: ad.action_slot = base.slots[0]
except Exception: pass
for pb in PB: pb.rotation_mode = 'QUATERNION'
f0 = base.frame_range[0]; FPS = 30; SC = W.to_scale().x
SECS = float(os.environ.get('ZH_SECS', 1.6 if MODE == 'scream' else 2.2))
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
def keys(K, t):
    for (ta, va), (tb, vb) in zip(K, K[1:]):
        if ta <= t <= tb: s = sst(ta, tb, t); return [x * (1 - s) + y * s for x, y in zip(va, vb)]
    return list(K[-1][1])
def lowest():
    dg = bpy.context.evaluated_depsgraph_get(); ev = body.evaluated_get(dg); m = ev.to_mesh(); z = min((ev.matrix_world @ v.co).z for v in m.vertices); ev.to_mesh_clear(); return z
def move_pelvis(d):
    pb = PB['pelvis']; M = pb.matrix.copy(); M.translation = M.translation + W.inverted().to_3x3() @ d; pb.matrix = M; upd()
def jit(t, f, ph): return math.sin(2 * math.pi * f * t * SECS + ph)
goto(); base_low = lowest()
ARMS = [n for s in 'LR' for n in ('upperarm.' + s, 'forearm.' + s, 'hand.' + s)]
if MODE == 'scream':
    # (t, weight, chest lean (+ forward), neck, head (- = face up), shake, L upper-arm dir, L forearm dir) -- the right arm mirrors the left
    K = [(0.00, (0, 0, 0, 0, 0, .3, -.1, -.95, .2, -.6, -.75)),
         (0.20, (1, 12, 6, 8, 0, .30, -.25, -.92, -.35, -.55, .75)),        # drawing in: hunched a little, fists pulled up to the chest
         (0.34, (1, -16, -12, -26, 1, .55, .62, -.55, .45, .75, -.5)),    # the scream: chest out, back arched, face up, arms flung back and out
         (0.80, (1, -18, -13, -28, 1, .57, .62, -.53, .45, .75, -.48)),
         (0.92, (.45, -6, -4, -10, .2, .45, .3, -.85, .3, .3, -.9)),
         (1.00, (0, 0, 0, 0, 0, .3, -.1, -.95, .2, -.6, -.75))]
else:
    # (t, weight, chest lean, neck, head, shake, hand-at-throat weight, cough jerk)
    K = [(0.00, (0, 0, 0, 0, 0, 0)), (0.16, (1, 6, 4, 2, 0, 1)), (0.62, (1, 10, 6, 4, 0, 1)), (0.70, (1, -6, -8, -20, 1, .7)), (0.86, (1, -6, -8, -22, 1, .6)),
         (1.00, (0, 0, 0, 0, 0, 0))]
order = [b.name for b in PB]; KEY = {b: {'rot': [], 'loc': []} for b in order}
nf = int(round(SECS * FPS))
for i in range(nf + 1):
    t = i / nf; goto(); k = keys(K, t); w = k[0]; sh = k[4] * w
    cough = 0
    if MODE == 'cough':   # three hacks between 0.18 and 0.6: a sharp jerk forward, a slower recovery
        for c0 in (.18, .32, .46):
            if c0 <= t < c0 + .12: u = (t - c0) / .12; cough = (u / .2 if u < .2 else 1 - sst(.2, 1, u))
    turn('chest', (1, 0, 0), k[1] * w + 9 * cough + 2 * sh * jit(t, 9, 0), wpos('chest')); turn('chest', (0, 0, 1), 3 * sh * jit(t, 6, 1), wpos('chest'))
    turn('neck', (1, 0, 0), k[2] * w + 6 * cough); turn('head', (1, 0, 0), k[3] * w + 4 * sh * jit(t, 13, .5)); turn('head', (0, 1, 0), 4 * sh * jit(t, 7, 2))
    q0 = {n: PB[n].rotation_quaternion.copy() for n in ARMS}
    if MODE == 'scream':
        for s, sg in (('L', 1), ('R', -1)):
            u = Vector((sg * k[5], k[6], k[7])).normalized(); f = Vector((sg * k[8], k[9], k[10])).normalized()
            aim('upperarm.' + s, wpos('upperarm.' + s) + u); aim('forearm.' + s, wpos('forearm.' + s) + f)
            aim('hand.' + s, wpos('hand.' + s) + f)
        aw = w
    else:   # the right hand to the front of the throat
        nk = wpos('neck'); hd = wpos('head'); fwd = Vector((0, -1, 0))
        two_bone('upperarm.R', 'forearm.R', nk * .6 + hd * .4 + fwd * .075 + Vector((-.012, 0, -.01)), Vector((-.5, .3, -.8)))
        aim('hand.R', wpos('hand.R') + Vector((.6, -.3, .3)))
        aw = k[5] * w
    for n, qa in q0.items(): PB[n].rotation_quaternion = qa.slerp(PB[n].rotation_quaternion.copy(), aw)
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
print('SCREAMER', MODE, 'frames', nf, 'seconds', SECS, '->', out)
