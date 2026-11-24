# zmove_thrower.py -- RAW.glb MODE OUT.json : the Thrower's moves (14-ZOMBIE-MOVES.md; previews for W216 and W239, made by hand, not in the game).
# Who it was: the pitcher of the Sunnyside works baseball team. It throws rubble (the game draws the rock; no weapon).
# MODE pitch (clip thrower_pitch, 1.6 s, its attack): a real pitch. Hands come together at the chest, the left knee kicks up as the body turns
#   away, the left foot strides forward and lands, the throwing arm goes down, back and up behind the head, then the whip: the chest turns
#   through and the arm comes over the top, the rock leaving the hand high in front (about 1.09 s in); the follow-through ends across the
#   left knee; then the left foot steps back. The right foot stays planted. Starts and ends on today's attack's first pose.
# MODE toss (clip thrower_toss, 2.8 s, the extra move that is not an attack, W239): it bends to pick a rock up off the ground, straightens,
#   tosses it from hand to hand four times, its head following it, then lets it drop. Feet planted. Starts and ends on its first idle pose.
# Also writes OUT minus .json plus .prop.json: where the rock is in each frame, for the preview renders (propfx.py, PROP=...).
# Rig: +X its left, -Y forward, +Z up.
import bpy, sys, os, math, json
from mathutils import Matrix, Vector, Quaternion
a = sys.argv[sys.argv.index('--') + 1:]; src, MODE, out = a[0], a[1], a[2]
bpy.ops.wm.read_factory_settings(use_empty=True); bpy.ops.import_scene.gltf(filepath=src)
ao = next(o for o in bpy.data.objects if o.type == 'ARMATURE'); body = bpy.data.objects['body']; PB = ao.pose.bones; W = ao.matrix_world; sc = bpy.context.scene
ad = ao.animation_data
for tr in ad.nla_tracks: tr.mute = True
base = bpy.data.actions['melee_swing_a' if MODE == 'pitch' else 'idle']; ad.action = base
try:
    if base.slots: ad.action_slot = base.slots[0]
except Exception: pass
for pb in PB: pb.rotation_mode = 'QUATERNION'
f0 = base.frame_range[0]; FPS = 30; SC = W.to_scale().x
SECS = float(os.environ.get('ZH_SECS', 1.6 if MODE == 'pitch' else 2.8))
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
def plant2(offL=Vector((0, 0, 0)), liftL=0.):   # plant(), with the left foot moved by offL (for the stride and the leg kick)
    for s in 'LR':
        an, to, pole = FOOT[s]
        if s == 'L': an = an + offL
        two_bone('thigh.' + s, 'shin.' + s, an, pole + Vector((0, -.3 * liftL, .2 * liftL)))
        pb = PB['foot.' + s]; M = W @ pb.matrix; R = FROT[s].to_4x4(); R.translation = M.translation
        S_ = Matrix.Diagonal(M.to_scale()).to_4x4(); pb.matrix = W.inverted() @ (R @ S_); upd()
def palm(s): return wpos('fingers.' + s) + Vector((0, 0, .025))
ROCK = []
if MODE == 'pitch':
    SET, LOW, COCK, REL, FOL = (.35, -.38, -.38), (-.22, .30, -.50), (-.28, .42, .22), (-.06, -.70, .42), (.55, -.42, -.78)
    LSET, LPT, LTUCK = (-.35, -.38, -.38), (.05, -.85, .05), (-.08, -.30, -.40)
    def mix3(a_, b_, x): return tuple(p * (1 - x) + q * x for p, q in zip(a_, b_))
    # (t, weight, left foot up, left foot forward (stride), chest yaw (+ to its left), chest pitch, hips down, hips forward, right-hand stage, left-hand stage)
    #   (k[0] weight .. k[8] left-hand stage)
    #   right-hand stage: 0 set .. 1 low .. 2 cocked .. 3 release .. 4 follow-through; left: 0 set .. 1 pointing .. 2 tucked
    K = [(0.00, (0, 0, 0, 0, 0, 0, 0, 0, 0)),
         (0.12, (1, 0, 0, -8, 0, .01, 0, 0, 0)),
         (0.30, (1, .13, .02, -24, -4, .01, 0, 0, 0)),     # leg kick, turned away
         (0.46, (1, .02, .22, -36, 0, .04, .06, 1, 1)),    # stride lands, the arm drops back
         (0.58, (1, 0, .24, -42, -6, .05, .07, 2, 1)),     # cocked behind the head
         (0.68, (1, 0, .24, 28, 20, .06, .10, 3, 2)),      # release
         (0.80, (1, 0, .24, 42, 30, .07, .11, 4, 2)),      # follow-through
         (0.88, (1, 0, .24, 38, 26, .06, .10, 4, 2)),
         (1.00, (0, 0, 0, 0, 0, 0, 0, 4, 2))]
    RH = [SET, LOW, COCK, REL, FOL]; LH = [LSET, LPT, LTUCK]
    def stage(lst, x): i_ = min(len(lst) - 2, int(x)); return mix3(lst[i_], lst[i_ + 1], x - i_)
    REL_T = .68; rel = None
else:
    # (t, weight, crouch (0..1), toss phase (0..4: the rock goes R->L->R->L->R), drop)
    K = [(0.00, (0, 0, 0, 0)), (0.13, (1, 1, 0, 0)), (0.20, (1, 1, 0, 0)), (0.32, (1, 0, 0, 0)),
         (0.80, (1, 0, 4, 0)), (0.86, (1, 0, 4, 0)), (0.93, (1, 0, 4, 1)), (1.00, (0, 0, 4, 1))]
    goto(); GROCK = wpos('shin.R') * 0 + Vector((wpos('upperarm.R').x - .02, wpos('upperarm.R').y - .30, base_low + .045))   # the rock on the ground in front-right
for i in range(nf + 1):
    t = i / nf; goto(); q0 = {n: PB[n].rotation_quaternion.copy() for n in LEGS}
    k = keys(K, t); w = k[0]
    if MODE == 'pitch':
        move_pelvis(Vector((0, -k[6] * H * .3, -k[5] * H)) * w)
        plant2(Vector((0, -k[2] * H * w, k[1] * H * w)), k[1] / .13 * w)
        turn('chest', (0, 0, 1), k[3] * w, wpos('chest')); turn('chest', (1, 0, 0), k[4] * w, wpos('chest'))
        turn('neck', (0, 0, 1), -k[3] * .6 * w)                                       # the eyes stay on the target
        S = wpos('upperarm.R'); h = stage(RH, k[7]); arm_to('R', -1, S + Vector(h) * L, w, Vector((-.7, .5, -.4)) if k[7] < 2.5 else Vector((-.8, -.1, .4)))
        fist('R', .5 * w)
        Sl = wpos('upperarm.L'); h = stage(LH, k[8]); arm_to('L', 1, Sl + Vector(h) * L, w, Vector((.8, .3, -.4)))
        if t <= REL_T: ROCK.append(list(palm('R')) if w > .02 else None); rel = palm('R'); relt = t
        else:
            dt = (t - relt) * SECS; p = rel + Vector((0, -6.5 * dt, 1.2 * dt - 4.9 * dt * dt)); ROCK.append(list(p) if p.y > -1.1 and p.z > base_low else None)   # out of the picture after that
    else:
        cr = k[1]; move_pelvis(Vector((0, 0, -.13 * H * cr)) * w); plant()
        turn('chest', (1, 0, 0), 38 * cr * w, wpos('chest')); turn('neck', (1, 0, 0), 15 * cr * w)
        ph = k[2]; n_ = int(min(3.999, ph)); f = ph - n_; frm, to_ = ('R', 'L') if n_ % 2 == 0 else ('L', 'R')
        SR, SL = wpos('upperarm.R'), wpos('upperarm.L')
        hold = {'R': SR + Vector((.02, -.66, -.40)) * L, 'L': SL + Vector((-.02, -.66, -.40)) * L}   # hands out in front at chest height
        pick = GROCK + Vector((0, .02, .03))
        flick = {s_: (.12 * L * math.sin(math.pi * min(1, f / .3)) if s_ == frm and 0 < ph < 4 else 0) for s_ in 'LR'}
        for s_, sg in (('L', 1), ('R', -1)):
            tg = hold[s_] + Vector((0, 0, flick[s_]))
            if s_ == 'R' and cr > 0: tg = tg.lerp(pick, cr)
            arm_to(s_, sg, tg, w * (1 if s_ == 'R' else (1 - cr)), Vector((sg * .8, .3, -.4)))
        # the rock
        if t < .13 or (cr > .6 and t < .2): rk = GROCK
        elif ph <= 0 or ph >= 4:
            rk = palm('R')
            if k[3] > 0: rk = palm('R').lerp(GROCK, min(1., k[3] ** 2))
        else:
            a_, b_ = palm(frm), palm(to_); rk = a_.lerp(b_, f) + Vector((0, -.12 * L * 4 * f * (1 - f), .22 * L * 4 * f * (1 - f)))   # a low hop, out in front of the chest
        ROCK.append(list(rk))
        hx = (rk.x - (SR.x + SL.x) / 2) * 60 * (0 < ph < 4)
        turn('head', (0, 0, 1), max(-14, min(14, hx)) * w); turn('head', (1, 0, 0), 10 * w * (1 - cr))
    wl = min(1., 8 * w)
    for n in LEGS: PB[n].rotation_quaternion = q0[n].slerp(PB[n].rotation_quaternion.copy(), wl)
    upd()
    lo = lowest()
    if lo < base_low - .002: move_pelvis(Vector((0, 0, base_low - lo)))
    for b in order:
        q = PB[b].rotation_quaternion; KEY[b]['rot'].append([q.x, q.y, q.z, q.w])
        if b == 'pelvis': KEY[b]['loc'].append(list(PB[b].location))
json.dump({'r': .07, 'pos': ROCK}, open(out[:-5] + '.prop.json', 'w'))
for b in order:
    for i in range(1, len(KEY[b]['rot'])):
        if sum(x * y for x, y in zip(KEY[b]['rot'][i], KEY[b]['rot'][i - 1])) < 0: KEY[b]['rot'][i] = [-x for x in KEY[b]['rot'][i]]
KEY = {b: v for b, v in KEY.items() if not b.startswith(('weapon_', 'armor_')) and not b.endswith(('_tip', '_grip1', '_grip2', '_grip_low'))}
json.dump({'fps': FPS, 'frames': nf, 'stride': None, 'seconds': SECS, 'bones': KEY, 'wdir': None}, open(out, 'w'))
print('THROWER', MODE, 'frames', nf, 'seconds', SECS, '->', out)
