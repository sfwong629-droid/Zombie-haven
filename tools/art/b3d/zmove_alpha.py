# zmove_alpha.py -- RAW.glb MODE OUT.json : the Alpha's moves (14-ZOMBIE-MOVES.md; previews for W216 and W239, made by hand, not in the game).
# The Alpha carries a big rusted blade in his right hand (owner, 23 Nov, W265; the blade is alpha_blade.py, W266). The blade's place in the hand
#   is BLADE_M (blade local -> the hand's weapon_bat frame, the frame the game's one-handed weapons hang from); animvid's ATTACH shows it.
# MODE attack (clip alpha_attack, 1.8 s, its attack; owner, 23 Nov: "from the drag blade position, slowly lift and then quick swing across"):
#   it starts with the blade dragged behind, as in the walk; the arm slowly lifts it up behind the right shoulder, the chest winding back;
#   then a quick swing across the front, from its right to its left and down, the chest turning through; a beat, then it lets the blade
#   drop back behind into the drag. Feet planted. Starts and ends in the drag.
# MODE walk / run (clips alpha_walk, alpha_run, the length of zombie_walk / zombie_run): today's walk and run with the blade dragged behind:
#   the right arm hangs back and the blade trails from it, its tip on the ground. The left arm hangs at its side and swings with the step
#   (owner: "the left hand ... should move normally on the side of the body"). Legs and hips are today's.
# MODE idle (clip alpha_idle, the length of idle): today's stand, the blade hanging from the hand, its tip resting on the ground in front.
#   The attack and the wave-on start and end with the blade held like this.
# MODE rally (clip alpha_rally, 2.2 s, the extra move, W239): it looks back over its right shoulder, then swings the blade up from behind to
#   point it forward and high, twice: waving the others on. Feet planted. Starts and ends on idle.
# Rig: +X its left, -Y forward, +Z up.
import bpy, sys, os, math, json
from mathutils import Matrix, Vector, Quaternion
a = sys.argv[sys.argv.index('--') + 1:]; src, MODE, out = a[0], a[1], a[2]
bpy.ops.wm.read_factory_settings(use_empty=True); bpy.ops.import_scene.gltf(filepath=src)
ao = next(o for o in bpy.data.objects if o.type == 'ARMATURE'); body = bpy.data.objects['body']; PB = ao.pose.bones; W = ao.matrix_world; sc = bpy.context.scene
ad = ao.animation_data
for tr in ad.nla_tracks: tr.mute = True
base = bpy.data.actions[{'attack': 'brute_attack', 'walk': 'zombie_walk', 'run': 'zombie_run', 'rally': 'idle', 'idle': 'idle'}[MODE]]; ad.action = base
try:
    if base.slots: ad.action_slot = base.slots[0]
except Exception: pass
for pb in PB: pb.rotation_mode = 'QUATERNION'
f0 = base.frame_range[0]; FPS = 30; SC = W.to_scale().x
f1 = base.frame_range[1]
SECS = float(os.environ.get('ZH_SECS', {'attack': 1.8, 'rally': 2.2}.get(MODE, (f1 - f0) / FPS)))
def upd(): bpy.context.view_layer.update()
def goto(f=None):
    f = f0 if f is None else f; sc.frame_set(int(math.floor(f)), subframe=f - math.floor(f)); upd()
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
BLADE_M = Matrix(((0, 0, 1, -.316), (-1, 0, 0, -.10), (0, -1, 0, .505), (0, 0, 0, 1)))
GRIP, TIP = Vector((-.10, -.035, 0)), Vector((.64, -.045, 0))
goto(); HW = W @ PB['hand.R'].matrix; BW = bpy.data.objects['weapon_bat'].matrix_world @ BLADE_M
BL = HW.inverted() @ BW; BLR = BL.to_3x3().normalized()             # the blade in the hand bone's frame (fixed)
def blade_w(): return (W @ PB['hand.R'].matrix) @ BL
def blade_frame(d, edge):                                            # a world turn with the blade along d and its edge towards edge
    x = d.normalized(); y = -(edge - x * edge.dot(x)).normalized(); z = x.cross(y); return Matrix((x, y, z)).transposed()
def set_blade(R, w_):
    pb = PB['hand.R']; M = W @ pb.matrix; cur = M.to_3x3().normalized()
    want = (R @ BLR.inverted()).to_quaternion(); q = cur.to_quaternion().slerp(want, w_)
    T = q.to_matrix().to_4x4(); T.translation = M.translation; S_ = Matrix.Diagonal(M.to_scale()).to_4x4(); pb.matrix = W.inverted() @ (T @ S_); upd()
def arm_to(s, sg, tgt, w_, pole=None):
    q1 = {n: PB[n].rotation_quaternion.copy() for n in ('upperarm.' + s, 'forearm.' + s, 'hand.' + s, 'fingers.' + s)}
    two_bone('upperarm.' + s, 'forearm.' + s, tgt, pole or Vector((sg * .8, .5, -.3)))
    d = (wpos('forearm.' + s, True) - wpos('forearm.' + s)).normalized(); aim('hand.' + s, wpos('hand.' + s) + d)
    for n, qa in q1.items(): PB[n].rotation_quaternion = qa.slerp(PB[n].rotation_quaternion.copy(), w_)
    upd()
def claw(s, w_):
    hx = (W @ PB['hand.' + s].matrix).to_3x3().col[0].normalized(); rot_about('fingers.' + s, Quaternion(hx, math.radians(-20 * w_)), wpos('fingers.' + s))
def fist(s, w_):   # curl the fingers round the grip
    hx = (W @ PB['hand.' + s].matrix).to_3x3().col[0].normalized(); rot_about('fingers.' + s, Quaternion(hx, math.radians(75 * w_)), wpos('fingers.' + s))
def grip(): fist('R', 1.)
L = (PB['upperarm.R'].length + PB['forearm.R'].length) * SC; LT = (TIP - GRIP).length
GROUND = base_low
def settle(hdir, edge, lift=.012):   # turn the blade along hdir (horizontal part) and down until its tip rests on the ground; returns the turn
    hd = hdir.normalized(); dz = -.6; hz = math.sqrt(1 - dz * dz)
    for _ in range(5):
        R = blade_frame(Vector((hd.x * hz, hd.y * hz, dz)), edge); set_blade(R, 1.)
        err = (blade_w() @ TIP).z - GROUND - lift; dz = max(-.98, min(-.1, dz - err / LT)); hz = math.sqrt(1 - dz * dz)
    return R
def rest_blade(): grip(); return settle(Vector((-.12, -1, 0)), Vector((0, -1, 0)), .03)   # standing: the blade hangs from the hand, tip forward on the ground
DRAG = Vector((-.28, .36, -.82))                                        # the hand's place in the drag, from the right shoulder, in arm lengths
def drag_blade(): return settle(Vector((-.45, .89, 0)), Vector((0, 0, -1)))
if MODE == 'attack':
    # (t, swing weight (0 the drag, 1 on the swing path), psi (deg round the right shoulder: 0 in front, + to its left, -180 behind),
    #  reach (horizontal, arm lengths), height (arm lengths), blade tilt up, chest yaw (+ to its left), chest pitch (+ forward), hips down,
    #  left hand: 0 at its side .. 1 reaching forward .. -1 pulled back)
    K = [(0.00, (0, -142, .46, -.82, -.5, 0, 0, 0, 0)),
         (0.50, (1, -118, .82, .04, .55, -30, -4, .02, 1)),    # slowly lifted up behind the right shoulder, winding back
         (0.58, (1, -120, .83, .07, .60, -33, -5, .02, 1)),
         (0.69, (1, 62, .70, -.30, -.22, 34, 11, .06, -1)),    # the quick swing across, to its left and down
         (0.80, (1, 70, .68, -.34, -.25, 36, 12, .06, -1)),
         (0.90, (.7, -60, .66, -.50, -.45, 8, 5, .03, -.3)),   # brought back round its right side, clear of the legs
         (1.00, (0, -142, .46, -.82, -.5, 0, 0, 0, 0))]
elif MODE == 'rally':
    K = [(0.00, (0, 0, 0, 0, 0)),
         (0.14, (1, -22, -4, -28, -40)),            # look back over the right shoulder, the blade hanging back
         (0.26, (1, -24, -4, -30, -45)),
         (0.44, (1, 6, 10, 4, 122)),                # swung under and up, the blade pointing forward and high
         (0.54, (1, 6, 11, 4, 124)),
         (0.64, (1, -20, -2, -26, -40)),
         (0.80, (1, 8, 12, 4, 122)),
         (0.88, (1, 8, 12, 4, 124)),
         (1.00, (0, 0, 0, 0, 0))]
F0, F1 = base.frame_range
TIPZ = []
for i in range(nf + 1):
    t = i / nf
    if MODE == 'idle':
        goto(F0 + (F1 - F0) * (i % nf) / nf); w = 1.; rest_blade(); TIPZ.append((blade_w() @ TIP).z - GROUND); q0 = None
    elif MODE in ('walk', 'run'):
        goto(F0 + (F1 - F0) * (i % nf) / nf); w = 1.
        turn('chest', (0, 1, 0), 4, wpos('chest'))                                 # a little weight onto the blade side
        S = wpos('upperarm.R'); ph = 2 * math.pi * t
        tgt = S + Vector((-.28 * L, (.36 + .04 * math.sin(ph)) * L, -.82 * L))     # the arm hangs back, the blade's weight pulling it
        arm_to('R', -1, tgt, 1., Vector((-.6, .5, -.4))); grip()
        fy = lambda f_: wpos(f_).y
        sw_ = max(-1., min(1., (fy('foot.L') - fy('foot.R')) / (.45 * L)))     # + when the right foot is forward: the left arm goes forward with it
        Sl = wpos('upperarm.L')
        arm_to('L', 1, Sl + Vector((.10 * L, -.30 * L * sw_, -.92 * L + .06 * L * abs(sw_))), 1., Vector((.5, .6, -.3)))
        g = blade_w() @ GRIP; dz = max(-.98, min(-.2, -(g.z - GROUND - .012) / LT)); hz = math.sqrt(1 - dz * dz)
        for _ in range(4):                                                         # settle the tip onto the ground
            d = Vector((-.45 * hz, .89 * hz, dz)); edge = Vector((0, 0, -1))     # trailing back and a little out, the edge to the ground
            set_blade(blade_frame(d, edge), 1.)
            err = (blade_w() @ TIP).z - GROUND - .012; dz = max(-.98, min(-.1, dz - err / LT)); hz = math.sqrt(1 - dz * dz)
        TIPZ.append((blade_w() @ TIP).z - GROUND)
        q0 = None
    else:
        goto(); q0 = {n: PB[n].rotation_quaternion.copy() for n in LEGS}
        if MODE == 'rally': k = keys(K, t); w = k[0]; qb = rest_blade()   # rest_blade() closes the hand on the grip
        else: grip()
    if MODE == 'attack':
        k = keys(K, t); sw = k[0]; w = 1.
        move_pelvis(Vector((0, 0, -k[7] * H))); plant()
        turn('chest', (0, 0, 1), k[5], wpos('chest')); turn('chest', (1, 0, 0), k[6], wpos('chest'))
        turn('neck', (0, 0, 1), -k[5] * .35); turn('head', (1, 0, 0), -k[6] * .3)
        S = wpos('upperarm.R'); ps = math.radians(k[1])
        hand = S + Vector((k[2] * math.sin(ps) * L, -k[2] * math.cos(ps) * L, k[3] * L))
        arm_to('R', -1, hand, 1., Vector((-.6, .3, -.8)) if k[3] > -.2 else Vector((-.6, .5, -.5)))
        Rd = drag_blade()                                                   # the drag at this hand place
        rad = Vector((math.sin(ps), -math.cos(ps), 0)); edge = Vector((math.cos(ps), math.sin(ps), 0))   # edge leads the swing (psi growing)
        Rs = blade_frame(rad + Vector((0, 0, k[4])), edge)
        set_blade(Rd.to_quaternion().slerp(Rs.to_quaternion(), sw).to_matrix(), 1.)
        Sl = wpos('upperarm.L'); lh = k[8]
        tl = Sl + Vector((.12 * L, 0, -.9 * L)) + (Vector((.12 * L, -.45 * L, .40 * L)) * lh if lh > 0 else Vector((.06 * L, .28 * L, .12 * L)) * -lh)
        arm_to('L', 1, tl, 1., Vector((.6, .4, -.6)))
    elif MODE == 'rally':
        plant()
        turn('chest', (0, 0, 1), k[1] * w, wpos('chest')); turn('chest', (1, 0, 0), k[2] * w, wpos('chest'))
        turn('neck', (0, 0, 1), k[3] * .4 * w); turn('head', (0, 0, 1), k[3] * .6 * w)
        ph = math.radians(k[4]); S = wpos('upperarm.R'); d = Vector((0, -math.sin(ph), -math.cos(ph)))
        arm_to('R', -1, S + Vector((-.16 * L, 0, 0)) + d * (.93 * L), w, Vector((-.9, .2, -.2)))
        bd = (d + Vector((-.1, 0, .15))).normalized()                                     # the blade carries on the line of the arm
        set_blade(qb.to_quaternion().slerp(blade_frame(bd, Vector((0, 0, -1)) if ph > 0 else Vector((0, -1, 0))).to_quaternion(), w).to_matrix(), 1.)
        arm_to('L', 1, wpos('upperarm.L') + (wpos('hand.L') - wpos('upperarm.L')) + Vector((.02, -.03, .02)) * w, w)
    if q0 is not None:
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
if TIPZ: print('TIP above ground: min %.3f max %.3f' % (min(TIPZ), max(TIPZ)))
print('ALPHA', MODE, 'frames', nf, 'seconds', SECS, '->', out)
