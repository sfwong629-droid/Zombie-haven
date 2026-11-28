# zmove_digger.py -- RAW.glb MODE OUT.json : the Digger's moves (a new kind; 14-ZOMBIE-MOVES.md; previews for W216 and W239, made by hand, not in the game).
# MODE dig (clip digger_dig, 2.6 s; the trick: tunnelling under the wall): a deep crouch, both hands scooping the dirt back between
#   the legs in turn, then he sinks into the ground (about his own height down). Starts on idle and ends under the ground.
# MODE burst (clip digger_burst, 1.6 s, its attack): starts under the ground with both arms overhead, rises up through the mound,
#   stands tall, brings both arms down on the target, then settles on today's attack's first pose.
# MODE brush (clip digger_brush, 2.8 s, the extra move, W239): brushes the dirt off his left shoulder, then his right, then shakes
#   his head hard like a wet dog. Starts and ends on idle.
# Rig: +X its left, -Y forward, +Z up.
import bpy, sys, os, math, json
from mathutils import Matrix, Vector, Quaternion
a = sys.argv[sys.argv.index('--') + 1:]; src, MODE, out = a[0], a[1], a[2]
bpy.ops.wm.read_factory_settings(use_empty=True); bpy.ops.import_scene.gltf(filepath=src)
ao = next(o for o in bpy.data.objects if o.type == 'ARMATURE'); body = bpy.data.objects['body']; PB = ao.pose.bones; W = ao.matrix_world; sc = bpy.context.scene
ad = ao.animation_data
for tr in ad.nla_tracks: tr.mute = True
base = bpy.data.actions['zombie_attack' if MODE == 'burst' else 'idle']; ad.action = base
try:
    if base.slots: ad.action_slot = base.slots[0]
except Exception: pass
for pb in PB: pb.rotation_mode = 'QUATERNION'
f0 = base.frame_range[0]; FPS = 30; SC = W.to_scale().x
SECS = float(os.environ.get('ZH_SECS', {'dig': 2.6, 'burst': 1.6, 'brush': 2.8}[MODE]))
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
def claw(s, w_):   # fingers splayed and hooked
    hx = (W @ PB['hand.' + s].matrix).to_3x3().col[0].normalized(); rot_about('fingers.' + s, Quaternion(hx, math.radians(35 * w_)), wpos('fingers.' + s))
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
if MODE == 'dig':     # (w, crouch, lean, scoop, sink)
    K = [(0, (0, 0, 0, 0, 0)), (.12, (1, 1.8, 48, 1, 0)), (.60, (1, 1.8, 48, 1, 0)), (.66, (1, 1.8, 40, 1, .15)), (.95, (1, 1.8, 30, 1, 1)), (1, (1, 1.8, 30, 1, 1))]
elif MODE == 'burst':  # (w, crouch, lean, arms up, sink, slam)
    K = [(0, (1, 1.6, 0, 1, 1, 0)), (.10, (1, 1.6, 0, 1, 1, 0)), (.38, (1, .4, -6, 1, 0, 0)), (.46, (1, 0, -10, 1, 0, 0)), (.52, (1, .5, 28, 1, 0, 0)),
         (.60, (1, .7, 38, 0, 0, 1)), (.70, (1, .7, 34, 0, 0, 1)), (1, (0, 0, 0, 0, 0, 0))]
else:                  # (w, brush left shoulder, brush right shoulder, head shake)
    K = [(0, (0, 0, 0, 0)), (.10, (1, 1, 0, 0)), (.34, (1, 1, 0, 0)), (.40, (1, 0, 1, 0)), (.62, (1, 0, 1, 0)), (.68, (1, 0, 0, 1)), (.88, (1, 0, 0, 1)), (1, (0, 0, 0, 0))]
DEEP = 1.05 * H
for i in range(nf + 1):
    t = i / nf; goto(); k = keys(K, t); w = k[0]
    sh = {s: wpos('upperarm.' + s) for s in 'LR'}
    if MODE in ('dig', 'burst'):
        cr, lean = k[1], k[2]; sink = k[4]
        move_pelvis(Vector((0, .04 * H * cr, -.15 * H * cr)))
        turn('pelvis', (1, 0, 0), lean * .5, wpos('pelvis')); plant(); turn('chest', (1, 0, 0), lean * .5, wpos('chest'))
        sh = {s: wpos('upperarm.' + s) for s in 'LR'}
        for s, sg in (('L', 1), ('R', -1)):
            if MODE == 'dig':
                u = ((t - .12) * 4.5 + (.5 if s == 'R' else 0)) % 1          # scoop cycle: reach to the front, drag back between the legs, fling
                ft = (wpos('foot.L') + wpos('foot.R')) / 2
                fy, by = ft.y - .30 * H, ft.y + .10 * H
                if u < .55: v = sst(0, .55, u); tg = Vector((sg * .07 * H, fy + (by - fy) * v, base_low + .03 * H))
                else: v = sst(.55, 1, u); tg = Vector((sg * .09 * H, by + (fy - by) * v, base_low + .03 * H + .22 * H * math.sin(math.pi * v)))
                aa = k[3] * w * (1 - sst(.9, 1., t) * 0)
                arm_to(s, sg, tg, aa, Vector((sg * .8, .2, .2))); claw(s, aa)
            else:
                up = sh[s] + Vector((sg * .08 * H, -.05 * H, .5 * H)); slam = sh[s] + Vector((sg * .04 * H, -.36 * H, -.30 * H))
                arm_to(s, sg, up, k[3] * w, Vector((sg * .8, .3, 0))); arm_to(s, sg, slam, k[5] * w, Vector((sg * .8, .3, -.3))); claw(s, max(k[3], k[5]) * w)
        if MODE == 'burst': turn('neck', (0, 0, 1), 10 * jit(t, 9) * (1 - sst(.1, .3, t)), wpos('neck'))
        turn('head', (1, 0, 0), -lean * .4 * w)
        upd()
        if sink <= 0:
            lo = lowest()
            if lo < base_low - .002: move_pelvis(Vector((0, 0, base_low - lo)))
        else:
            move_pelvis(Vector((0, 0, -DEEP * sink)))                   # into the ground: the whole body goes down, legs and all
    else:
        b1, b2, hs = k[1], k[2], k[3]
        for s, sg, o, b in (('R', -1, 'L', b1), ('L', 1, 'R', b2)):
            if b <= 0: continue
            tgt = wpos('upperarm.' + o) + Vector((-sg * .02 * H, -.07 * H, .03 * H)) + Vector((-sg * .03 * H, 0, .03 * H)) * jit(t, 4.5)
            arm_to(s, sg, tgt, b * w, Vector((sg * .6, .2, -1))); turn('head', (0, 0, 1), sg * 18 * b * w); turn('head', (1, 0, 0), 12 * b * w)
        if hs > 0:
            turn('neck', (0, 0, 1), 16 * hs * jit(t, 5.5), wpos('neck')); turn('head', (0, 0, 1), 22 * hs * jit(t, 5.5, .6)); turn('head', (0, 1, 0), 8 * hs * jit(t, 5.5, 1.2))
            turn('chest', (0, 0, 1), 5 * hs * jit(t, 5.5, -.4), wpos('chest'))
        upd()
    for b in order:
        q = PB[b].rotation_quaternion; KEY[b]['rot'].append([q.x, q.y, q.z, q.w])
        if b == 'pelvis': KEY[b]['loc'].append(list(PB[b].location))
for b in order:
    for i in range(1, len(KEY[b]['rot'])):
        if sum(x * y for x, y in zip(KEY[b]['rot'][i], KEY[b]['rot'][i - 1])) < 0: KEY[b]['rot'][i] = [-x for x in KEY[b]['rot'][i]]
KEY = {b: v for b, v in KEY.items() if not b.startswith(('weapon_', 'armor_')) and not b.endswith(('_tip', '_grip1', '_grip2', '_grip_low'))}
json.dump({'fps': FPS, 'frames': nf, 'stride': None, 'seconds': SECS, 'bones': KEY, 'wdir': None}, open(out, 'w'))
print('DIGGER', MODE, 'frames', nf, 'seconds', SECS, '->', out)
