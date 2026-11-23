# zmove_brute.py -- RAW.glb MODE OUT.json : the Brute's moves (14-ZOMBIE-MOVES.md; previews for W216 and W239, made by hand, not in the game).
# Who it was: a Foundry cannery loader on double rations.
# MODE hammer (clip brute_hammer, 1.25 s, its attack): the two-fisted hammer blow. Both fists come up together over the head, the body rearing back on
#   bent knees, then it brings them down as one onto the target in front, the body folding forward and the hips dropping; a beat, then it straightens.
#   Feet planted (the legs are solved to them). Starts and ends on today's attack's first pose.
# MODE pound (clip brute_pound, 2.0 s, the extra move that is not an attack, W239): it pounds its chest with both fists in turn, chest out and head up,
#   four blows, then lets the arms drop. Feet planted. Starts and ends on its first idle pose.
# Rig: +X its left, -Y forward, +Z up.
import bpy, sys, os, math, json
from mathutils import Matrix, Vector, Quaternion
a = sys.argv[sys.argv.index('--') + 1:]; src, MODE, out = a[0], a[1], a[2]
bpy.ops.wm.read_factory_settings(use_empty=True); bpy.ops.import_scene.gltf(filepath=src)
ao = next(o for o in bpy.data.objects if o.type == 'ARMATURE'); body = bpy.data.objects['body']; PB = ao.pose.bones; W = ao.matrix_world; sc = bpy.context.scene
ad = ao.animation_data
for tr in ad.nla_tracks: tr.mute = True
base = bpy.data.actions['brute_attack' if MODE == 'hammer' else 'idle']; ad.action = base
try:
    if base.slots: ad.action_slot = base.slots[0]
except Exception: pass
for pb in PB: pb.rotation_mode = 'QUATERNION'
f0 = base.frame_range[0]; FPS = 30; SC = W.to_scale().x
SECS = float(os.environ.get('ZH_SECS', 1.25 if MODE == 'hammer' else 2.0))
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
# the chains on its wrists may touch the ground (they hang from the hands): the ground check leaves out what hangs from the hands
_gi = {g.index for g in body.vertex_groups if g.name.startswith(('hand.', 'fingers.'))}
_keep = [v.index for v in body.data.vertices if not (v.groups and max(v.groups, key=lambda g: g.weight).group in _gi)]
def lowest():
    dg = bpy.context.evaluated_depsgraph_get(); ev = body.evaluated_get(dg); m = ev.to_mesh(); z = min((ev.matrix_world @ m.vertices[i].co).z for i in _keep); ev.to_mesh_clear(); return z
goto(); base_low = lowest(); H = wpos('head', True).z
FOOT = {s: (wpos('foot.' + s), wpos('foot.' + s, True), wpos('shin.' + s) - (wpos('thigh.' + s) + wpos('foot.' + s)) / 2) for s in 'LR'}
LEGS = [n for s in 'LR' for n in ('thigh.' + s, 'shin.' + s, 'foot.' + s)]; ARMS = [n for s in 'LR' for n in ('upperarm.' + s, 'forearm.' + s, 'hand.' + s)]
FROT = {s: (W @ PB['foot.' + s].matrix).to_3x3().normalized() for s in 'LR'}
def plant():   # legs solved to the planted ankles; each foot keeps its whole first-pose turn (a matched direction alone let the boot roll onto its edge)
    for s in 'LR':
        an, to, pole = FOOT[s]; two_bone('thigh.' + s, 'shin.' + s, an, pole)
        pb = PB['foot.' + s]; M = W @ pb.matrix; R = FROT[s].to_4x4(); R.translation = M.translation
        S = Matrix.Diagonal(M.to_scale()).to_4x4(); pb.matrix = W.inverted() @ (R @ S); upd()
order = [b.name for b in PB]; KEY = {b: {'rot': [], 'loc': []} for b in order}
nf = int(round(SECS * FPS))
def arm_to(s, sg, tgt, w_, pole=None):
    q1 = {n: PB[n].rotation_quaternion.copy() for n in ('upperarm.' + s, 'forearm.' + s, 'hand.' + s, 'fingers.' + s)}
    two_bone('upperarm.' + s, 'forearm.' + s, tgt, pole or Vector((sg * .8, .5, -.3)))
    d = (wpos('forearm.' + s, True) - wpos('forearm.' + s)).normalized(); aim('hand.' + s, wpos('hand.' + s) + d)
    turn('fingers.' + s, (1, 0, 0), 0)
    for n, qa in q1.items(): PB[n].rotation_quaternion = qa.slerp(PB[n].rotation_quaternion.copy(), w_)
    upd()
def fist(s, w_):   # curl the fingers into a fist about the hand's own side axis
    hx = (W @ PB['hand.' + s].matrix).to_3x3().col[0].normalized(); rot_about('fingers.' + s, Quaternion(hx, math.radians(75 * w_)), wpos('fingers.' + s))
if MODE == 'hammer':
    # (t, weight, rear (chest, - = back), knees (hips down), hands: (in, forward, up) from each shoulder)
    K = [(0.00, (0, 0, 0, .00, -.05, -.30)),
         (0.30, (1, -10, .04, .13, -.13, .30)),     # fists up together over the head (in front of it, clear of the face), rearing back
         (0.40, (1, -12, .05, .13, -.12, .31)),
         (0.52, (1, 30, .10, .14, -.30, -.20)),     # brought down as one onto the target in front, folding forward
         (0.72, (1, 32, .10, .14, -.29, -.22)),
         (1.00, (0, 0, 0, .14, -.29, -.22))]
for i in range(nf + 1):
    t = i / nf; goto(); q0 = {n: PB[n].rotation_quaternion.copy() for n in LEGS}; T = t * SECS
    if MODE == 'hammer':
        k = keys(K, t); w = k[0]
        move_pelvis(Vector((0, 0, -k[2] * H)) * w); plant()
        turn('chest', (1, 0, 0), k[1] * w, wpos('chest')); turn('neck', (1, 0, 0), -k[1] * .4 * w)
        for s, sg in (('L', 1), ('R', -1)):
            S = wpos('upperarm.' + s); arm_to(s, sg, S + Vector((-sg * k[3], k[4], k[5])), w); fist(s, w)
    else:
        w = sst(0, .12, t) * (1 - sst(.85, 1, t))
        plant(); turn('chest', (1, 0, 0), -8 * w, wpos('chest')); turn('neck', (1, 0, 0), -8 * w); turn('head', (1, 0, 0), -10 * w)
        for s, sg, ph in (('L', 1, 0), ('R', -1, .5)):   # alternate fists, 2 blows each a second
            c = (math.sin(2 * math.pi * (2.0 * T * .5 * 2 - ph)) * .5 + .5) if .15 < t < .8 else 0
            hit = c ** 3   # snaps in to the chest
            S = wpos('upperarm.' + s); tgt = S + Vector((-sg * .09, -.21 + .16 * hit, -.12 - .02 * hit))   # drawn back out in front, then slammed into the chest
            arm_to(s, sg, tgt, w); fist(s, w)
            if hit > .9: turn('chest', (0, 0, 1), sg * 2 * w, wpos('chest'))
    wl = min(1., 8 * w)
    for n in LEGS: PB[n].rotation_quaternion = q0[n].slerp(PB[n].rotation_quaternion.copy(), wl)
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
print('BRUTE', MODE, 'frames', nf, 'seconds', SECS, '->', out)
