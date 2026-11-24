# zmove_fizzbomb.py -- RAW.glb MODE OUT.json : the Fizzbomb's moves (14-ZOMBIE-MOVES.md; previews for W216 and W239, made by hand, not in the game).
# Who it was: Fizzy the Clown (W192; the model is the old Rotbomb, unchanged).
# MODE swell (clip fizzbomb_swell, 1.6 s, its attack): clutch and swell, with a hurried waddle. Both arms hug the belly; it waddles on the spot,
#   four quick short steps, rocking side to side; it puffs up, chest out and back, head tipping back, heaving; then lurches forward belly first.
#   (A clip moves bones only, so the belly does not really grow here: if the swelling should show, the game scales it up as it clutches.)
#   Starts and ends on today's attack's first pose.
# MODE pat (clip fizzbomb_pat, 2.2 s, the extra move that is not an attack, W239): it looks down and pats its swollen belly, hands in turn,
#   four pats, then one big pleased pat with both. Feet planted. Starts and ends on its first idle pose. (Replaced by balloon, owner 23 Nov.)
# MODE balloon (clip fizzbomb_balloon, 3.4 s, the extra move, owner 23 Nov: "maybe it bring out a ballon and blow it up?", "make it as extra move"):
#   the right hand pulls a limp balloon from the costume's front, brings it to the mouth, four big puffs (breathe in leaning back, blow leaning in),
#   the balloon growing with each; the fourth is one too many: it pops in its face, it flinches back with both hands up, then settles.
#   Feet planted. Starts and ends on its first idle pose. Also writes OUT minus .json plus .prop.json: the balloon's knot, direction and size
#   in each frame, for the preview renders (propfx.py, kind "balloon"). In the game the balloon would be a small model that grows the same way.
# Rig: +X its left, -Y forward, +Z up.
import bpy, sys, os, math, json
from mathutils import Matrix, Vector, Quaternion
a = sys.argv[sys.argv.index('--') + 1:]; src, MODE, out = a[0], a[1], a[2]
bpy.ops.wm.read_factory_settings(use_empty=True); bpy.ops.import_scene.gltf(filepath=src)
ao = next(o for o in bpy.data.objects if o.type == 'ARMATURE'); body = bpy.data.objects['body']; PB = ao.pose.bones; W = ao.matrix_world; sc = bpy.context.scene
ad = ao.animation_data
for tr in ad.nla_tracks: tr.mute = True
base = bpy.data.actions['zombie_attack' if MODE == 'swell' else 'idle']; ad.action = base
try:
    if base.slots: ad.action_slot = base.slots[0]
except Exception: pass
for pb in PB: pb.rotation_mode = 'QUATERNION'
f0 = base.frame_range[0]; FPS = 30; SC = W.to_scale().x
SECS = float(os.environ.get('ZH_SECS', {'swell': 1.6, 'pat': 2.2, 'balloon': 3.4}[MODE]))
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
def belly(dx, dz):   # a point on the front of the belly within reach: dx to the side, dz below the shoulders (arm lengths; the arms are short)
    z = wpos('upperarm.L').z - dz * L; return Vector((dx * L, front_y(z, .05) + .015, z))
if MODE == 'swell':
    # (t, weight, hug (0..1), waddle (0..1), puff (chest back), lurch)
    K = [(0.00, (0, 0, 0, 0, 0)), (0.10, (1, 1, 0, 0, 0)), (0.16, (1, 1, 1, .2, 0)), (0.62, (1, 1, 1, 1, 0)),
         (0.74, (1, 1, 0, .4, 1)), (0.84, (1, 1, 0, .4, 1)), (1.00, (0, 0, 0, 0, 0))]
elif MODE == 'balloon':
    # (t, weight, hand at the pocket, hand at the mouth, flinch)
    K = [(0.00, (0, 0, 0, 0)), (0.10, (1, 1, 0, 0)), (0.17, (1, 1, 0, 0)), (0.26, (1, 0, 1, 0)), (0.83, (1, 0, 1, 0)),
         (0.875, (1, 0, 0, 1)), (0.91, (1, 0, 0, 1)), (1.00, (0, 0, 0, 0))]
    P0, P1, NP = .28, .83, 4          # the four puffs; each: breathe in (first 40%), blow (the rest)
    BR = .12; BAX = Vector((-.2, -1, .45)).normalized()   # full balloon radius; its direction out of the mouth (forward, up, a little to its right)
    goto(); hm = W @ PB['head'].matrix; zm = wpos('head').z - .02; MOUTH = hm.inverted() @ Vector((0, front_y(zm, .02) + .012, zm))
    BAL = []
else:
    # (t, weight, look down)
    K = [(0.00, (0, 0)), (0.12, (1, 1)), (0.86, (1, 1)), (1.00, (0, 0))]
    PATS = [(.18, 'R'), (.32, 'L'), (.46, 'R'), (.60, 'L'), (.76, 'B')]
for i in range(nf + 1):
    t = i / nf; goto(); q0 = {n: PB[n].rotation_quaternion.copy() for n in LEGS}
    k = keys(K, t); w = k[0]
    if MODE == 'swell':
        wd = k[2] * w; ph = (t - .16) / (.62 - .16) * 4 if .16 <= t <= .62 else 0      # four steps
        n_ = int(min(3, ph)); f = ph - n_; side = 'L' if n_ % 2 == 0 else 'R'; up = math.sin(math.pi * f) * wd if .16 <= t <= .62 else 0
        rock = math.sin(math.pi * ph) * (1 if n_ % 2 == 0 else -1) * wd if .16 <= t <= .62 else 0
        move_pelvis(Vector((-.02 * H * rock, -.06 * H * k[4] * w, -.02 * H * w)))
        off = {'L': Vector((0, 0, 0)), 'R': Vector((0, 0, 0))}; lift = {'L': 0, 'R': 0}
        off[side] = Vector((0, 0, .045 * H * up)); lift[side] = up * 1.2
        turn('pelvis', (0, 1, 0), 9 * rock); plant2(off, lift)                            # the hips rock, the feet stay on their spots
        turn('chest', (0, 1, 0), -12 * rock, wpos('chest'))
        heave = math.sin(2 * math.pi * 5 * t) * k[3] * w
        turn('chest', (1, 0, 0), (-14 * k[3] + 3 * heave + 24 * k[4]) * w, wpos('chest'))
        turn('neck', (1, 0, 0), (-10 * k[3] - 10 * k[4]) * w); turn('head', (1, 0, 0), -12 * k[3] * w)
        hug = k[1] * w
        for s_, sg in (('L', 1), ('R', -1)):
            arm_to(s_, sg, belly(sg * .35, .78), hug, Vector((sg * .9, .4, -.2))); 
    elif MODE == 'balloon':
        pk, mo, fl = k[1] * w, k[2] * w, k[3] * w
        u = (t - P0) / (P1 - P0) * NP if P0 <= t <= P1 else (-1 if t < P0 else NP); j = int(min(NP - 1, max(0, u))); f = u - j if 0 <= u <= NP else 0
        inh = math.sin(math.pi * min(1, f / .4)) if 0 <= u < NP and f < .4 else 0        # breathe in: lean back
        blw = math.sin(math.pi * (f - .4) / .6) if 0 <= u < NP and f >= .4 else 0       # blow: lean in
        move_pelvis(Vector((0, .03 * H * fl, 0))); plant()      # hips back in the flinch, feet stay put
        turn('chest', (1, 0, 0), (-7 * inh + 9 * blw) * mo - 16 * fl + 4 * pk, wpos('chest'))
        turn('neck', (1, 0, 0), (6 - 5 * inh + 5 * blw) * mo - 12 * fl + 10 * pk); turn('head', (1, 0, 0), (4 * mo) - 16 * fl + 6 * pk)
        turn('head', (0, 0, 1), -8 * fl)
        mouth = (W @ PB['head'].matrix) @ MOUTH
        for s_, sg in (('L', 1), ('R', -1)):
            if s_ == 'R':
                pocket = belly(-.45, .62); atm = mouth + Vector((-.03, -.035, -.075))
                tg = pocket * (pk / max(1e-6, pk + mo)) + atm * (mo / max(1e-6, pk + mo)) if pk + mo > 1e-6 else pocket
                arm_to('R', -1, tg, min(1., pk + mo), Vector((-.9, .2, -.4)))
                if mo > .01:      # the hand turned up to hold the balloon's neck at the lips
                    q = PB['hand.R'].rotation_quaternion.copy(); aim('hand.R', mouth + Vector((-.01, -.03, .0)))
                    PB['hand.R'].rotation_quaternion = q.slerp(PB['hand.R'].rotation_quaternion.copy(), mo); upd()
            if fl > .01:      # both hands up in front of the face
                arm_to(s_, sg, mouth + Vector((sg * .07, -.06, -.02)), fl, Vector((sg * .9, .3, -.4)))
    else:
        plant(); lk = k[1] * w
        turn('neck', (1, 0, 0), 18 * lk); turn('head', (1, 0, 0), 14 * lk); turn('chest', (1, 0, 0), 5 * lk, wpos('chest'))
        for s_, sg in (('L', 1), ('R', -1)):
            lift_ = 0.
            for tp, who in PATS:
                if who in (s_, 'B'): lift_ = max(lift_, (1 - min(1, abs(t - tp) / .07)) * (1.6 if who == 'B' else 1))
            tg = belly(sg * .28, .82) + Vector((0, -.25 * L * lift_, .12 * L * lift_))   # the hand lifts off the belly and pats down
            arm_to(s_, sg, tg, lk, Vector((sg * .9, .3, -.3)))
    wl = min(1., 8 * w)
    for n in LEGS: PB[n].rotation_quaternion = q0[n].slerp(PB[n].rotation_quaternion.copy(), wl)
    upd()
    lo = lowest()
    if lo < base_low - .002: move_pelvis(Vector((0, 0, base_low - lo)))
    if MODE == 'balloon':     # where the balloon is: its knot, its direction and its size (null: not out, or popped)
        if .16 <= t < P1 + .002:
            mouth = (W @ PB['head'].matrix) @ MOUTH; ht = wpos('fingers.R')
            a_ = k[2] if t > .17 else 0; knot = ht.lerp(mouth + Vector((-.006, -.022, -.004)), a_)
            ax = Vector((0, -.2, -1)).normalized().lerp(BAX, a_).normalized()
            bl = max(0., (f - .4) / .6) if 0 <= u < NP else (1. if u >= NP else 0.)   # how far through this puff's blow
            g = .14 if u < 0 else (.14 + .86 * (j + bl) / (NP - 1) if j < NP - 1 else 1 + .28 * bl)   # three puffs to full, the fourth too many
            g *= 1 + .03 * math.sin(2 * math.pi * 9 * t * SECS / 3.2)
            BAL.append({'knot': list(knot), 'ax': list(ax), 's': BR * g})
        else: BAL.append(None)
    for b in order:
        q = PB[b].rotation_quaternion; KEY[b]['rot'].append([q.x, q.y, q.z, q.w])
        if b == 'pelvis': KEY[b]['loc'].append(list(PB[b].location))
for b in order:
    for i in range(1, len(KEY[b]['rot'])):
        if sum(x * y for x, y in zip(KEY[b]['rot'][i], KEY[b]['rot'][i - 1])) < 0: KEY[b]['rot'][i] = [-x for x in KEY[b]['rot'][i]]
KEY = {b: v for b, v in KEY.items() if not b.startswith(('weapon_', 'armor_')) and not b.endswith(('_tip', '_grip1', '_grip2', '_grip_low'))}
json.dump({'fps': FPS, 'frames': nf, 'stride': None, 'seconds': SECS, 'bones': KEY, 'wdir': None}, open(out, 'w'))
if MODE == 'balloon': json.dump({'kind': 'balloon', 'pos': BAL}, open(out[:-5] + '.prop.json', 'w'))
print('FIZZBOMB', MODE, 'frames', nf, 'seconds', SECS, '->', out)
