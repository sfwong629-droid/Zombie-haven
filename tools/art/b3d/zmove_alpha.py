# zmove_alpha.py -- RAW.glb MODE OUT.json : the Alpha's moves (14-ZOMBIE-MOVES.md; previews for W216 and W239, made by hand, not in the game).
# MODE attack (clip alpha_attack, 1.8 s, its attack): a roar, chest out, head up and both arms flung wide; then a sweeping backhand: the right arm
#   winds across to its left side with the chest turning, then sweeps out wide to its right at chest height, the chest turning with it.
#   Feet planted. Starts and ends on today's attack's (brute_attack) first pose.
# MODE rally (clip alpha_rally, 2.2 s, the extra move that is not an attack, W239): it looks back over its right shoulder and waves the others on:
#   the right arm swings from behind, under and up to point forward and high, the body leaning on; twice. Feet planted. Starts and ends on idle.
# Rig: +X its left, -Y forward, +Z up.
import bpy, sys, os, math, json
from mathutils import Matrix, Vector, Quaternion
a = sys.argv[sys.argv.index('--') + 1:]; src, MODE, out = a[0], a[1], a[2]
bpy.ops.wm.read_factory_settings(use_empty=True); bpy.ops.import_scene.gltf(filepath=src)
ao = next(o for o in bpy.data.objects if o.type == 'ARMATURE'); body = bpy.data.objects['body']; PB = ao.pose.bones; W = ao.matrix_world; sc = bpy.context.scene
ad = ao.animation_data
for tr in ad.nla_tracks: tr.mute = True
base = bpy.data.actions['brute_attack' if MODE == 'attack' else 'idle']; ad.action = base
try:
    if base.slots: ad.action_slot = base.slots[0]
except Exception: pass
for pb in PB: pb.rotation_mode = 'QUATERNION'
f0 = base.frame_range[0]; FPS = 30; SC = W.to_scale().x
SECS = float(os.environ.get('ZH_SECS', 1.8 if MODE == 'attack' else 2.2))
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
    for n, qa in q1.items(): PB[n].rotation_quaternion = qa.slerp(PB[n].rotation_quaternion.copy(), w_)
    upd()
def fist(s, w_):
    hx = (W @ PB['hand.' + s].matrix).to_3x3().col[0].normalized(); rot_about('fingers.' + s, Quaternion(hx, math.radians(75 * w_)), wpos('fingers.' + s))
L = (PB['upperarm.R'].length + PB['forearm.R'].length) * SC
if MODE == 'attack':
    # (t, weight, rear (chest pitch, - = back), hips down, chest yaw (+ = to its left), head up, roar (arms wide 0..1), backhand on (0..1), psi (deg, + = across to its left))
    K = [(0.00, (0, 0, 0, 0, 0, 0, 0, 0)),
         (0.12, (1, -12, .03, 0, 14, 1, 0, 0)),     # roar: chest out, head up, arms flung wide
         (0.40, (1, -14, .03, 0, 16, 1, 0, 0)),
         (0.55, (1, 4, .05, 30, 0, 0, 1, 70)),      # wind the right arm across to its left, chest turned left
         (0.62, (1, 6, .05, 32, 0, 0, 1, 72)),
         (0.72, (1, 10, .06, -35, -4, 0, 1, -85)),  # the backhand sweeps out wide to its right
         (0.84, (1, 9, .06, -36, -4, 0, 1, -88)),
         (1.00, (0, 0, 0, 0, 0, 0, 0, -88))]
else:
    # (t, weight, chest yaw, lean forward, head yaw, phi (deg; 0 down, 90 forward, -50 behind))
    K = [(0.00, (0, 0, 0, 0, 0)),
         (0.14, (1, -22, -4, -28, -45)),            # look back over the right shoulder, arm back
         (0.26, (1, -24, -4, -30, -50)),
         (0.44, (1, 6, 10, 4, 122)),                # swing under and up, pointing forward and high
         (0.54, (1, 6, 11, 4, 124)),
         (0.64, (1, -20, -2, -26, -45)),
         (0.80, (1, 8, 12, 4, 122)),
         (0.88, (1, 8, 12, 4, 124)),
         (1.00, (0, 0, 0, 0, 0))]
for i in range(nf + 1):
    t = i / nf; goto(); q0 = {n: PB[n].rotation_quaternion.copy() for n in LEGS}
    base_hand = {s: wpos('hand.' + s) - wpos('upperarm.' + s) for s in 'LR'}
    k = keys(K, t); w = k[0]
    if MODE == 'attack':
        move_pelvis(Vector((0, 0, -k[2] * H)) * w); plant()
        turn('chest', (0, 0, 1), k[3] * w, wpos('chest')); turn('chest', (1, 0, 0), k[1] * w, wpos('chest'))
        turn('neck', (1, 0, 0), -k[4] * .5 * w); turn('head', (1, 0, 0), -k[4] * .7 * w); turn('neck', (0, 0, 1), -k[3] * .3 * w)
        roar, bh, ps = k[5], k[6], math.radians(k[7])
        for s, sg in (('L', 1), ('R', -1)):
            S = wpos('upperarm.' + s)
            wide = S + Vector((sg * .42 * L, -.38 * L, .02 * L))                      # thrown out wide and forward, elbows kept low (raised upper arms drag the coat up)
            low = S + base_hand[s]
            if s == 'R':
                r = L * (.92 - .38 * max(0., math.sin(ps)))
                swp = S + Vector((r * math.sin(ps), -r * math.cos(ps), (-.12 - .25 * max(0., math.sin(ps))) * L))   # across the body it stays at chest height, clear of the face
                tgt = low.lerp(wide, roar).lerp(swp, bh)
                arm_to(s, sg, tgt, w, Vector((sg * .5, .6, -.5)) if bh > .5 else Vector((sg * .5, .2, -.9))); fist(s, bh * w)
            else:
                tgt = low.lerp(wide, roar).lerp(S + Vector((sg * .12 * L, .05 * L, -.85 * L)), bh)   # the free arm drops to its side for the blow
                arm_to(s, sg, tgt, w, Vector((sg * .5, .2, -.9)))
            if roar > .01: rot_about('fingers.' + s, Quaternion((W @ PB['hand.' + s].matrix).to_3x3().col[0].normalized(), math.radians(-20 * roar * w)), wpos('fingers.' + s))  # fingers splayed
    else:
        plant()
        turn('chest', (0, 0, 1), k[1] * w, wpos('chest')); turn('chest', (1, 0, 0), k[2] * w, wpos('chest'))
        turn('neck', (0, 0, 1), k[3] * .4 * w); turn('head', (0, 0, 1), k[3] * .6 * w)
        ph = math.radians(k[4]); S = wpos('upperarm.R')
        d = Vector((0, -math.sin(ph), -math.cos(ph)))
        tgt = S + Vector((-.14 * L, 0, 0)) + d * (.93 * L)                              # a little out from the side so the swing clears the hip
        arm_to('R', -1, tgt, w, Vector((-.9, .2, -.2)))
        arm_to('L', 1, wpos('upperarm.L') + base_hand['L'] + Vector((.02, -.03, .02)) * w, w)
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
print('ALPHA', MODE, 'frames', nf, 'seconds', SECS, '->', out)
