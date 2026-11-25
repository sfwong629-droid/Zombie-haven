# zmove_leaper.py -- RAW.glb MODE OUT.json : the Leaper's moves (a new kind; 14-ZOMBIE-MOVES.md; previews for W216 and W239, made by hand, not in the game).
# MODE jump (clip leaper_jump, 1.7 s; the trick: over a fence or low wall): a deep crouch with the arms swung back, then a leap in
#   the air (W192: "the Leaper hurdles"): the right leg leads out in front, the left trails bent back under him, the left arm reaches
#   forward; a crouched landing, then it rises. Up and down on the spot (the game moves it across).
# MODE pounce (clip leaper_pounce, 1.3 s, its attack): crouch, spring forward and up with the body flat and both clawed hands reaching,
#   land in a deep crouch and claw down twice, rise. Starts and ends on today's attack's first pose.
# MODE perch (clip leaper_perch, 3.0 s, the extra move, W239): squats like a gargoyle, knuckles on the ground, the head darting from
#   side to side, two small hops on the spot, then rises. Starts and ends on idle.
# Rig: +X its left, -Y forward, +Z up.
import bpy, sys, os, math, json
from mathutils import Matrix, Vector, Quaternion
a = sys.argv[sys.argv.index('--') + 1:]; src, MODE, out = a[0], a[1], a[2]
bpy.ops.wm.read_factory_settings(use_empty=True); bpy.ops.import_scene.gltf(filepath=src)
ao = next(o for o in bpy.data.objects if o.type == 'ARMATURE'); body = bpy.data.objects['body']; PB = ao.pose.bones; W = ao.matrix_world; sc = bpy.context.scene
ad = ao.animation_data
for tr in ad.nla_tracks: tr.mute = True
base = bpy.data.actions['zombie_attack' if MODE == 'pounce' else 'idle']; ad.action = base
try:
    if base.slots: ad.action_slot = base.slots[0]
except Exception: pass
for pb in PB: pb.rotation_mode = 'QUATERNION'
f0 = base.frame_range[0]; FPS = 30; SC = W.to_scale().x
SECS = float(os.environ.get('ZH_SECS', {'jump': 1.7, 'pounce': 1.3, 'perch': 3.0}[MODE]))
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
def air_legs(kind, a_):   # forward-kinematics leg pose in the air, blended over the planted one by a_
    if a_ <= 0: return
    q1 = {n: PB[n].rotation_quaternion.copy() for n in LEGS}
    for n in LEGS: PB[n].rotation_quaternion = Q0[n].copy()
    upd()
    if kind == 'hurdle':   # feet placed directly, knees pointing forward (owner, 25 Nov: the trailing leg was "really angled out and not too natural")
        LL = (PB['thigh.R'].length + PB['shin.R'].length) * SC
        hr, hl = wpos('thigh.R'), wpos('thigh.L')
        two_bone('thigh.R', 'shin.R', hr + Vector((-.02 * LL, -.62 * LL, -.62 * LL)), Vector((0, -.3, 1)))      # lead leg out in front, a soft knee
        two_bone('thigh.L', 'shin.L', hl + Vector((.01 * LL, .42 * LL, -.42 * LL)), Vector((0, -1, -.2)))       # trailing leg folded back under him
        for s_ in 'LR':
            d = (wpos('shin.' + s_, True) - wpos('shin.' + s_)).normalized(); aim('foot.' + s_, wpos('foot.' + s_) + (d + Vector((0, -.6, 0))).normalized())
    else:   # tuck
        for s in 'LR': turn('thigh.' + s, (1, 0, 0), -70); turn('shin.' + s, (1, 0, 0), 90)
    qa = {n: PB[n].rotation_quaternion.copy() for n in LEGS}
    for n in LEGS: PB[n].rotation_quaternion = q1[n].slerp(qa[n], a_)
    upd()
def hop(t, t0, t1): return math.sin(math.pi * (t - t0) / (t1 - t0)) if t0 <= t <= t1 else 0.
def keysm(t):
    if MODE == 'jump':   # (w, crouch, arms back, lean)
        K = [(0, (0, 0, 0, 0)), (.18, (1, 1, 1, 10)), (.27, (1, 1, 1, 12)), (.34, (1, .2, -1, 18)), (.70, (1, .2, -1, 18)),
             (.78, (1, 1.1, .3, 20)), (.86, (1, 1, .2, 14)), (1, (0, 0, 0, 0))]
    elif MODE == 'pounce':   # (w, crouch, arms back, lean)
        K = [(0, (0, 0, 0, 0)), (.20, (1, 1, 1, 15)), (.27, (1, 1, 1, 15)), (.33, (1, .2, -1, 50)), (.54, (1, .2, -1, 55)),
             (.62, (1, 1.3, -1, 45)), (.82, (1, 1.3, -1, 45)), (1, (0, 0, 0, 0))]
    else:   # (w, crouch, knuckles down, lean)
        K = [(0, (0, 0, 0, 0)), (.14, (1, 2.0, 1, 50)), (.58, (1, 2.0, 1, 50)), (.62, (1, 1.7, .3, 40)), (.88, (1, 1.7, .3, 40)), (1, (0, 0, 0, 0))]
    return keys(K, t)
for i in range(nf + 1):
    t = i / nf; goto(); Q0 = {n: PB[n].rotation_quaternion.copy() for n in LEGS}
    w, cr, ab, lean = keysm(t)
    if MODE == 'jump':
        up = .42 * H * hop(t, .32, .72); aw = sst(.29, .36, t) * (1 - sst(.66, .73, t)); kind = 'hurdle'; fwd = 0
    elif MODE == 'pounce':
        up = .2 * H * hop(t, .30, .60); aw = sst(.28, .34, t) * (1 - sst(.54, .61, t)); kind = 'tuck'; fwd = .06 * H * aw
    else:
        up = .06 * H * (hop(t, .62, .72) + hop(t, .76, .86)); aw = sst(.61, .63, t) * (1 - sst(.71, .73, t)) + sst(.75, .77, t) * (1 - sst(.85, .87, t)); kind = 'tuck'; fwd = 0
        aw *= .35
    move_pelvis(Vector((0, -fwd + .04 * H * cr, -.16 * H * cr + up)))
    turn('pelvis', (1, 0, 0), lean * .5, wpos('pelvis'))
    plant(); air_legs(kind, aw)
    turn('chest', (1, 0, 0), lean * .5, wpos('chest'))
    sh = {s: wpos('upperarm.' + s) for s in 'LR'}
    for s, sg in (('L', 1), ('R', -1)):
        if MODE == 'perch':
            ft = wpos('foot.' + s); tg = Vector((sg * .05 * H, ft.y - .12 * H, base_low + .02 + .02 * hop(t, .62, .72)))
            arm_to(s, sg, tg, ab * w, Vector((sg * .8, .3, -.2))); fist(s, ab * w)
        else:
            back = sh[s] + Vector((sg * .05 * H, .30 * H, -.25 * H))
            if MODE == 'jump': front = sh[s] + Vector((-sg * .02 * H, -.36 * H, .02 * H)) if s == 'L' else sh[s] + Vector((sg * .04 * H, .25 * H, -.2 * H))
            else:
                down = sst(.56, .62, t); strike = hop(t, .62, .72) if s == 'R' else hop(t, .70, .80)
                front = sh[s] + Vector((sg * .03 * H, -.36 * H * (1 - down) - .16 * H * down, -.08 * H - .30 * H * down + .10 * H * (1 - strike) * down))
            tgt = back if ab > 0 else front; aa = abs(ab) * w
            arm_to(s, sg, tgt, aa, Vector((sg * .8, .4, -.3))); claw(s, aa if MODE == 'pounce' else 0)
    if MODE == 'perch':
        dart = 0.
        for c0, ang in ((.20, 35), (.27, -30), (.35, 10), (.42, -38), (.50, 25)):
            dart += ang * (sst(c0, c0 + .025, t) - sst(c0 + .06, c0 + .085, t))
        turn('neck', (0, 0, 1), dart * .5 * w); turn('head', (0, 0, 1), dart * .5 * w); turn('head', (1, 0, 0), -14 * w)
    else:
        turn('head', (1, 0, 0), -lean * .5 * w)
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
print('LEAPER', MODE, 'frames', nf, 'seconds', SECS, '->', out)
