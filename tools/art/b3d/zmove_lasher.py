# zmove_lasher.py -- RAW.glb MODE OUT.json : the Lasher's extra move (W239; a preview, made by hand, not in the game). Its attack, the whip
# ('lash'), is kept as it is (W190): only checked.
# MODE lasso (clip lasher_lasso, 2.0 s, its attack; owner, 24 Nov: "A"): the right arm whirls overhead twice like a cowboy's rope, is flung
#   out at chest height (the hook lands at about 1.0 s, t .50; today's 'lash' lands at .38 of 1.42 s, about 0.54 s: the game's timing moves),
#   held a moment with the fist closed, then three hauls hand over hand, leaning back; back to the start. Feet planted as in today's 'lash'.
#   Starts and ends on today's 'lash' first pose.
# MODE scratch (clip lasher_scratch, 2.8 s, the extra move; owner, 24 Nov: "1"): the right arm goes up and over the shoulder and scratches
#   between the shoulder blades, then slides all the way down behind to the back of the right knee (the heel lifted, leaning over to that
#   side) and scratches there, the head rolled back in relief; back to the idle. Starts and ends on its first idle pose.
# MODE stretch (turned down 24 Nov; clip lasher_stretch, 2.8 s): a long, slow stretch of the long arms: both arms reach straight up overhead, it leans over to its
#   left, then to its right, reaches up once more, lets the arms swing down, and cracks its neck, head to one side then the other.
#   Feet planted. Starts and ends on its first idle pose.
# Rig: +X its left, -Y forward, +Z up.
import bpy, sys, os, math, json
from mathutils import Matrix, Vector, Quaternion
a = sys.argv[sys.argv.index('--') + 1:]; src, MODE, out = a[0], a[1], a[2]
bpy.ops.wm.read_factory_settings(use_empty=True); bpy.ops.import_scene.gltf(filepath=src)
ao = next(o for o in bpy.data.objects if o.type == 'ARMATURE'); body = bpy.data.objects['body']; PB = ao.pose.bones; W = ao.matrix_world; sc = bpy.context.scene
ad = ao.animation_data
for tr in ad.nla_tracks: tr.mute = True
base = bpy.data.actions['lash' if MODE == 'lasso' else 'idle']; ad.action = base
try:
    if base.slots: ad.action_slot = base.slots[0]
except Exception: pass
for pb in PB: pb.rotation_mode = 'QUATERNION'
f0 = base.frame_range[0]; FPS = 30; SC = W.to_scale().x
SECS = float(os.environ.get('ZH_SECS', 2.0 if MODE == 'lasso' else 2.8))
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
# the ground check leaves out what the hands lead (the long arms may swing low)
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
def arm_to(s, sg, tgt, w_, pole=None):
    q1 = {n: PB[n].rotation_quaternion.copy() for n in ('upperarm.' + s, 'forearm.' + s, 'hand.' + s, 'fingers.' + s)}
    two_bone('upperarm.' + s, 'forearm.' + s, tgt, pole or Vector((sg * .8, .5, -.3)))
    d = (wpos('forearm.' + s, True) - wpos('forearm.' + s)).normalized(); aim('hand.' + s, wpos('hand.' + s) + d)
    turn('fingers.' + s, (1, 0, 0), 0)
    for n, qa in q1.items(): PB[n].rotation_quaternion = qa.slerp(PB[n].rotation_quaternion.copy(), w_)
    upd()
def fist(s, w_):   # curl the fingers into a fist about the hand's own side axis
    hx = (W @ PB['hand.' + s].matrix).to_3x3().col[0].normalized(); rot_about('fingers.' + s, Quaternion(hx, math.radians(75 * w_)), wpos('fingers.' + s))
order = [b.name for b in PB]; KEY = {b: {'rot': [], 'loc': []} for b in order}
nf = int(round(SECS * FPS))
L = (PB['upperarm.R'].length + PB['forearm.R'].length) * SC
def front_y(z0, band=.04):   # the front of the body (most forward point) at height z0, near the middle
    dg = bpy.context.evaluated_depsgraph_get(); ev = body.evaluated_get(dg); m = ev.to_mesh(); mw = ev.matrix_world
    ys = [(mw @ v.co).y for v in m.vertices if abs((mw @ v.co).z - z0) < band and abs((mw @ v.co).x) < .12]
    ev.to_mesh_clear(); return min(ys)
def plant2(off, lift):   # plant(), each foot moved by off[s] and its knee led forward by lift[s] (the stamping steps)
    for s in 'LR':
        an, to, pole = FOOT[s]; an = an + off[s]
        two_bone('thigh.' + s, 'shin.' + s, an, pole + Vector((0, -.3 * lift[s], .2 * lift[s])))
        pb = PB['foot.' + s]; M = W @ pb.matrix; R = FROT[s].to_4x4(); R.translation = M.translation
        S_ = Matrix.Diagonal(M.to_scale()).to_4x4(); pb.matrix = W.inverted() @ (R @ S_); upd()
def belly(dx, dz):   # a point on the front of the belly within reach: dx to the side, dz below the shoulders (arm lengths; the arms are short)
    z = wpos('upperarm.L').z - dz * L; return Vector((dx * L, front_y(z, .05) + .015, z))
def sideway(sg): return Vector((sg, 0, 0))
if MODE == 'lasso':
    # (t, weight, spin (arm overhead), fling (arm out), haul (leaning back))
    K = [(0.00, (0, 0, 0, 0)), (0.08, (1, 1, 0, 0)), (0.42, (1, 1, 0, 0)), (0.50, (1, 0, 1, 0)), (0.60, (1, 0, 1, 0)),
         (0.66, (1, 0, 0, 1)), (0.90, (1, 0, 0, 1)), (1.00, (0, 0, 0, 0))]
elif MODE == 'scratch':
    # (t, weight, hand at the shoulder blades, hand at the back of the knee)
    K = [(0.00, (0, 0, 0)), (0.16, (1, 1, 0)), (0.44, (1, 1, 0)), (0.58, (1, 0, 1)), (0.86, (1, 0, 1)), (1.00, (0, 0, 0))]
if MODE in ('lasso', 'scratch'):
  for i in range(nf + 1):
    t = i / nf; goto(); q0 = {n: PB[n].rotation_quaternion.copy() for n in LEGS}
    k = keys(K, t); w = k[0]
    if MODE == 'lasso':
        sp, fg, hl = k[1] * w, k[2] * w, k[3] * w
        ph = 2 * math.pi * 2 * min(1, max(0, (t - .08) / (.42 - .08)))             # two turns overhead
        nh = int(min(2, max(0, (t - .64) / (.90 - .64) * 3))); fh = min(1, max(0, (t - .64) / (.90 - .64) * 3 - nh)) if .64 <= t <= .90 else 0
        move_pelvis(Vector((0, -.03 * H * fg + .04 * H * hl, -.01 * H * hl))); plant()
        turn('chest', (0, 0, 1), -14 * sp + 22 * fg + 4 * math.sin(ph) * sp, wpos('chest'))     # winds the right shoulder back, throws it forward
        turn('chest', (1, 0, 0), -4 * sp + 14 * fg - 14 * hl, wpos('chest')); turn('head', (1, 0, 0), 6 * sp - 6 * fg + 8 * hl)
        shR = wpos('upperarm.R'); shL = wpos('upperarm.L')
        circ = shR + Vector((.05, -.06, .80 * L)) + Vector((math.cos(ph), math.sin(ph), 0)) * .34 * L
        reach = shR + Vector((.12, -1, -.08)).normalized() * L * .99
        if hl > .01:      # hand over hand: the reaching hand goes out, closes, pulls back to the chest; the other the other way
            for s_, sg, ph0 in (('R', -1, 0), ('L', 1, .5)):
                u_ = (fh + ph0) % 1; ex = .5 + .5 * math.cos(2 * math.pi * u_)
                sh_ = wpos('upperarm.' + s_); tg = sh_ + Vector((-sg * .08, -1, -.25)).normalized() * L * (.45 + .5 * ex)
                if s_ == 'R': ww = fg + hl; tg = reach.lerp(tg, hl / max(1e-6, ww))      # from the flung-out arm into the hauling
                else: ww = hl
                arm_to(s_, sg, tg, min(1, ww), Vector((sg * .9, .2, -.4))); fist(s_, min(1, ww))
        else:
            tg = circ.lerp(reach, fg / max(1e-6, sp + fg)) if sp + fg > 1e-6 else circ
            arm_to('R', -1, tg, min(1, sp + fg), Vector((-.6, .6, .3)))
            if fg > .01: fist('R', fg)
            arm_to('L', 1, shL + Vector((.55, -.1, -.6)).normalized() * L * .95, sp * .8 + fg * .3, Vector((.4, .8, -.2)))   # out to the side for balance
    else:
        sb, kn = k[1] * w, k[2] * w
        jit_ = math.sin(2 * math.pi * 7 * t * SECS) * .025 * (1 if (.20 < t < .42 or .62 < t < .84) else 0)
        off = {'L': Vector((0, 0, 0)), 'R': Vector((0, .05 * H * kn, .07 * H * kn))}; lift = {'L': 0, 'R': -.6 * kn}
        move_pelvis(Vector((.02 * H * kn, 0, -.015 * H * kn))); plant2(off, lift)
        turn('chest', (0, 1, 0), -20 * kn, wpos('chest')); turn('chest', (1, 0, 0), 6 * kn - 4 * sb, wpos('chest'))
        turn('neck', (1, 0, 0), -14 * sb - 10 * kn); turn('head', (1, 0, 0), -10 * sb - 8 * kn); turn('head', (0, 1, 0), 10 * sb)
        if sb > .01:
            tg = wpos('chest', True) + Vector((-.02, .11, -.17 + jit_)); arm_to('R', -1, tg, sb, Vector((-.5, .3, 1)))
        if kn > .01:
            kp = wpos('shin.R'); tg = kp + Vector((-.02, .07, .03 + jit_)); arm_to('R', -1, tg, kn, Vector((-.8, .6, .1)))
        claw('R', .5 * (sb + kn)) if 'claw' in globals() else None
    wl = min(1., 8 * w)
    for n in LEGS: PB[n].rotation_quaternion = q0[n].slerp(PB[n].rotation_quaternion.copy(), wl)
    upd()
    lo = lowest()
    if lo < base_low - .002: move_pelvis(Vector((0, 0, base_low - lo)))
    for b in order:
        q = PB[b].rotation_quaternion; KEY[b]['rot'].append([q.x, q.y, q.z, q.w])
        if b == 'pelvis': KEY[b]['loc'].append(list(PB[b].location))
else:
 # (t, weight, arms up, lean (+ to its left), reach higher, neck tilt (+ to its left))
 K = [(0.00, (0, 0, 0, 0, 0)), (0.10, (1, 0, 0, 0, 0)), (0.26, (1, 1, 0, 0, 0)), (0.40, (1, 1, 1, 0, 0)), (0.47, (1, 1, 1, 0, 0)),
      (0.60, (1, 1, -1, 0, 0)), (0.66, (1, 1, -1, 0, 0)), (0.74, (1, 1, 0, 1, 0)), (0.78, (1, 1, 0, 1, 0)), (0.86, (1, 0, 0, 0, 0)),
      (0.89, (1, 0, 0, 0, 1)), (0.92, (1, 0, 0, 0, 1)), (0.95, (1, 0, 0, 0, -1)), (0.97, (1, 0, 0, 0, -1)), (1.00, (0, 0, 0, 0, 0))]
 for i in range(nf + 1):
     t = i / nf; goto(); q0 = {n: PB[n].rotation_quaternion.copy() for n in LEGS}
     k = keys(K, t); w = k[0]; up, ln, hi, nk = k[1] * w, k[2] * w, k[3] * w, k[4] * w
     move_pelvis(Vector((.025 * H * ln * -1, 0, 0))); plant()            # the hips shift away from the lean, feet stay put
     turn('chest', (0, 1, 0), 18 * ln, wpos('chest')); turn('chest', (1, 0, 0), -6 * up - 4 * hi, wpos('chest'))
     turn('neck', (0, 1, 0), 6 * ln - 22 * nk); turn('head', (1, 0, 0), -10 * up - 6 * hi); turn('head', (0, 1, 0), -8 * nk)
     for s_, sg in (('L', 1), ('R', -1)):
         sh = wpos('upperarm.' + s_); d = Vector((sg * .10, .03, 1)).normalized()
         arm_to(s_, sg, sh + d * L * (.93 + .06 * hi), up, Vector((sg * .3, .9, 0)))
         if up > .01: turn('fingers.' + s_, (1, 0, 0), 0)
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
print('LASHER', MODE, 'frames', nf, 'seconds', SECS, '->', out)
