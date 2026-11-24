# zmove_souphead.py -- RAW.glb MODE OUT.json : the Souphead's moves (14-ZOMBIE-MOVES.md; previews for W216 and W239, made by hand, not in the game).
# Who it was: Mr. Mushroom, the soup mascot in costume (W192; the model is the old Sporehead, unchanged). It leads with the hat.
# MODE claws (clip souphead_claws, 1.6 s, its attack): head shake, then claws. It ducks its big mushroom hat at the target and shakes it hard,
#   three times side to side, then two quick claws, right then left, each raking down and across with the chest turning into it.
#   Feet planted. Starts and ends on today's attack's (spore_combo) first pose.
# MODE shake (clip souphead_shake, 2.0 s, the extra move that is not an attack, W239): it shakes its big hat like a dog shaking off water:
#   the head and shoulders whip side to side, fast, the swings dying away, the arms flopping loose; then it settles.
#   Feet planted. Starts and ends on its first idle pose.
# Rig: +X its left, -Y forward, +Z up.
import bpy, sys, os, math, json
from mathutils import Matrix, Vector, Quaternion
a = sys.argv[sys.argv.index('--') + 1:]; src, MODE, out = a[0], a[1], a[2]
bpy.ops.wm.read_factory_settings(use_empty=True); bpy.ops.import_scene.gltf(filepath=src)
ao = next(o for o in bpy.data.objects if o.type == 'ARMATURE'); body = bpy.data.objects['body']; PB = ao.pose.bones; W = ao.matrix_world; sc = bpy.context.scene
ad = ao.animation_data
for tr in ad.nla_tracks: tr.mute = True
base = bpy.data.actions['spore_combo' if MODE == 'claws' else 'idle']; ad.action = base
try:
    if base.slots: ad.action_slot = base.slots[0]
except Exception: pass
for pb in PB: pb.rotation_mode = 'QUATERNION'
f0 = base.frame_range[0]; FPS = 30; SC = W.to_scale().x
SECS = float(os.environ.get('ZH_SECS', 1.6 if MODE == 'claws' else 2.0))
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
def plant2(off, lift):   # plant(), each foot moved by off[s] and its knee led forward by lift[s] (the stamping steps)
    for s in 'LR':
        an, to, pole = FOOT[s]; an = an + off[s]
        two_bone('thigh.' + s, 'shin.' + s, an, pole + Vector((0, -.3 * lift[s], .2 * lift[s])))
        pb = PB['foot.' + s]; M = W @ pb.matrix; R = FROT[s].to_4x4(); R.translation = M.translation
        S_ = Matrix.Diagonal(M.to_scale()).to_4x4(); pb.matrix = W.inverted() @ (R @ S_); upd()
if MODE == 'claws':
    # (t, weight, duck (head down), shake amount, R claw (0 up .. 1 raked), L claw, hips down)
    K = [(0.00, (0, 0, 0, 0, 0, 0)),
         (0.10, (1, 1, 0, 0, 0, .02)),
         (0.14, (1, 1, 1, 0, 0, .02)),
         (0.42, (1, 1, 1, 0, 0, .02)),     # the hat shaken at the target
         (0.48, (1, .3, 0, -.6, 0, .03)),  # right claw up
         (0.58, (1, .2, 0, 1, -.6, .04)),  # right claw rakes, left goes up
         (0.68, (1, .2, 0, 1, 1, .05)),    # left claw rakes
         (0.80, (1, .2, 0, 1, 1, .05)),
         (1.00, (0, 0, 0, 0, 0, 0))]
else:
    # (t, weight, amount)
    K = [(0.00, (0, 0)), (0.08, (1, 1)), (0.55, (1, .35)), (0.75, (1, .1)), (1.00, (0, 0))]
def claw(s, w_):   # fingers splayed and hooked
    hx = (W @ PB['hand.' + s].matrix).to_3x3().col[0].normalized(); rot_about('fingers.' + s, Quaternion(hx, math.radians(35 * w_)), wpos('fingers.' + s))
UPC, RAKE = (-.35, -.25, .80), (.30, -.72, -.25)    # a claw up out to the side / raked down across the front (from that shoulder; x for the right side)
for i in range(nf + 1):
    t = i / nf; goto(); q0 = {n: PB[n].rotation_quaternion.copy() for n in LEGS}
    k = keys(K, t); w = k[0]
    if MODE == 'claws':
        move_pelvis(Vector((0, 0, -k[5] * H)) * w); plant()
        sh = k[2] * math.sin(2 * math.pi * 3 * (t - .14) / .28) if .14 <= t <= .42 else 0
        turn('chest', (1, 0, 0), (10 * k[1] + 8 * max(k[3], k[4], 0)) * w, wpos('chest'))
        turn('chest', (0, 0, 1), (16 * max(k[3], 0) - 16 * max(k[4], 0)) * w, wpos('chest'))     # the chest turns into each claw
        turn('neck', (1, 0, 0), 22 * k[1] * w); turn('head', (0, 0, 1), 28 * sh * w); turn('head', (0, 1, 0), 14 * sh * w)
        for s_, sg, c in (('R', -1, k[3]), ('L', 1, k[4])):
            S = wpos('upperarm.' + s_); up_ = Vector((UPC[0] * -sg, UPC[1], UPC[2])) * L; rk = Vector((RAKE[0] * -sg, RAKE[1], RAKE[2])) * L
            rest = Vector((.0 * sg, -.25, -.55)) * L
            tg = S + (rest.lerp(up_, -c) if c < 0 else up_.lerp(rk, c)) if c != 0 else S + rest
            arm_to(s_, sg, tg, w, Vector((sg * .8, .2, -.3)) if c >= 0 else Vector((sg * .9, .1, .3)))
            claw(s_, w)
    else:
        plant(); a_ = k[1] * w; ph = 2 * math.pi * 4.5 * t
        turn('chest', (0, 1, 0), 14 * a_ * math.sin(ph - .5), wpos('chest')); turn('chest', (0, 0, 1), 8 * a_ * math.sin(ph - .5), wpos('chest'))
        turn('neck', (0, 1, 0), 16 * a_ * math.sin(ph)); turn('head', (0, 1, 0), 18 * a_ * math.sin(ph + .3)); turn('head', (0, 0, 1), 14 * a_ * math.sin(ph + .3))
        for s_, sg in (('L', 1), ('R', -1)):                                  # the arms flop loose with the shake
            S = wpos('upperarm.' + s_); arm_to(s_, sg, S + Vector((sg * (.12 + .10 * a_ * math.sin(ph + 1.2 + (sg > 0) * 3.14)), -.12, -.88)) * L, a_, Vector((sg * .8, .3, -.3)))
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
print('SOUPHEAD', MODE, 'frames', nf, 'seconds', SECS, '->', out)
