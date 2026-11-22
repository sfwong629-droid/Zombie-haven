# zmove_gatling.py -- RAW.glb OUT.json : the Gatling Boss's signature move, braced fire at long range (14-ZOMBIE-MOVES.md, approved W190; owner, 21 Nov:
# "galting gun long range shooting animation"). Preview for W216: made by hand, not a recording. Clip name gatling_fire, 3.0 s.
# He plants his feet wide (left foot forward, right foot back), sinks a little and leans into the gun; the gun (modelled onto his left forearm, no
# left hand) comes up level at hip height, pointing ahead, the right hand on top of it near the elbow. The barrels spin up (the gun arm shakes,
# harder and harder), then a long burst: the kick shakes the gun, the chest and the head every frame while the upper body sweeps the gun right,
# left and back to the middle; then the shaking dies away and he settles back. Starts and ends exactly on his first idle pose.
# Rig: +X his left, -Y forward, +Z up. Env: ZH_SWEEP (degrees each way, 24), ZH_SECS (3.0), ZH_LEAN (14), ZH_TWIST (chest turned towards the gun, 24), ZH_KICK (recoil shake, 1.0).
import bpy, sys, os, math, json
from mathutils import Matrix, Vector, Quaternion
a = sys.argv[sys.argv.index('--') + 1:]; src, out = a[0], a[1]
SWEEP = float(os.environ.get('ZH_SWEEP', 24)); SECS = float(os.environ.get('ZH_SECS', 3.0)); LEAN = float(os.environ.get('ZH_LEAN', 14)); TW = float(os.environ.get('ZH_TWIST', 24)); KICK = float(os.environ.get('ZH_KICK', 1.0))
bpy.ops.wm.read_factory_settings(use_empty=True); bpy.ops.import_scene.gltf(filepath=src)
ao = next(o for o in bpy.data.objects if o.type == 'ARMATURE'); body = bpy.data.objects['body']; PB = ao.pose.bones; W = ao.matrix_world; sc = bpy.context.scene
ad = ao.animation_data
for tr in ad.nla_tracks: tr.mute = True
base = bpy.data.actions['idle']; ad.action = base
try:
    if base.slots: ad.action_slot = base.slots[0]
except Exception: pass
for pb in PB: pb.rotation_mode = 'QUATERNION'
f0 = base.frame_range[0]; FPS = 30; SC = W.to_scale().x
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
def two_bone(b1, b2, end, pole):   # b1's tail (the joint) bends towards pole, b2's tail lands on end
    h = wpos(b1); l1 = PB[b1].length * SC; l2 = PB[b2].length * SC
    v = end - h; dd = min(max(v.length, abs(l1 - l2) * 1.05), .995 * (l1 + l2)); n = v.normalized()
    x = (l1 * l1 - l2 * l2 + dd * dd) / (2 * dd); hg = math.sqrt(max(l1 * l1 - x * x, 0)); p = Vector(pole); p = (p - n * p.dot(n)).normalized()
    aim(b1, h + n * x + p * hg); aim(b2, h + n * dd)
def lowest():
    dg = bpy.context.evaluated_depsgraph_get(); ev = body.evaluated_get(dg); m = ev.to_mesh(); z = min((ev.matrix_world @ v.co).z for v in m.vertices); ev.to_mesh_clear(); return z
def move_pelvis(d):
    pb = PB['pelvis']; M = pb.matrix.copy(); M.translation = M.translation + W.inverted().to_3x3() @ d; pb.matrix = M; upd()
goto(); base_low = lowest()
# the gun's own axis, in the left forearm's frame (the gun is modelled onto the forearm; measured from its vertices, see 06-ASSETS.md)
import numpy as np
gi = body.vertex_groups['forearm.L'].index
dg = bpy.context.evaluated_depsgraph_get(); ev = body.evaluated_get(dg); m = ev.to_mesh()
P = np.array([tuple(ev.matrix_world @ m.vertices[v.index].co) for v in body.data.vertices if v.groups and max(v.groups, key=lambda g: g.weight).group == gi]); ev.to_mesh_clear()
c = P.mean(0); ax = np.linalg.svd(P - c)[2][0]; ax = ax if ax[1] < 0 else -ax   # pointing out of the muzzle (forward in idle)
R0 = (W @ PB['forearm.L'].matrix).to_3x3(); GUN_LOCAL = R0.inverted() @ Vector(ax)
def gun_dir(): return ((W @ PB['forearm.L'].matrix).to_3x3() @ GUN_LOCAL).normalized()
BASE = {b.name: b.rotation_quaternion.copy() for b in PB}; BASE_LOC = PB['pelvis'].location.copy()
FOOT0 = {s: (wpos('foot.' + s), wpos('foot.' + s, True)) for s in 'LR'}   # ankle, toe
STANCE = {'L': Vector((.06, -.07, 0)), 'R': Vector((-.07, .07, 0))}        # left foot out and forward, right foot out and back
order = [b.name for b in PB]; KEY = {b: {'rot': [], 'loc': []} for b in order}
nf = int(round(SECS * FPS)); T_IN, T_SPIN, T_BURST, T_END = .30 / SECS, .75 / SECS, (SECS - .55) / SECS, (SECS - .25) / SECS
def jit(t, f, ph): return math.sin(2 * math.pi * f * t * SECS + ph)
for i in range(nf + 1):
    t = i / nf; goto()
    w = sst(0, T_IN, t) * (1 - sst(T_END, 1, t))                     # braced (1) or standing as in idle (0)
    shake = sst(T_IN, T_SPIN, t) * .45 + sst(T_SPIN, T_SPIN + .03, t) * .55; shake *= (1 - sst(T_BURST, T_END, t)) * KICK
    sw = math.sin(2 * math.pi * sst(T_SPIN, T_BURST, t)) * SWEEP      # right, left, back to the middle
    # legs: sink, feet out to the wide stance (each lifts a touch on the way), legs solved to the ankles, feet kept flat as in idle
    move_pelvis(Vector((0, .012 * w, -.035 * w)))
    ql = {n: PB[n].rotation_quaternion.copy() for s in 'LR' for n in ('thigh.' + s, 'shin.' + s, 'foot.' + s)}
    for s in 'LR':
        an, to = FOOT0[s]; d = STANCE[s] * w; lift = .03 * math.sin(math.pi * w)   # each foot lifts a touch while it moves out or back
        tgt = an + d + Vector((0, 0, lift)); sg = 1 if s == 'L' else -1
        two_bone('thigh.' + s, 'shin.' + s, tgt, Vector((sg * .25, -1, 0)))
        fd = (to - an).normalized(); fd.rotate(Matrix.Rotation(math.radians(sg * 8 * w), 3, 'Z')); aim('foot.' + s, wpos('foot.' + s) + fd)   # toes turned out a little
    for n, qa in ql.items(): PB[n].rotation_quaternion = qa.slerp(PB[n].rotation_quaternion.copy(), min(1., 3 * w))   # the solved knee is not quite idle's: ease into it
    upd()
    # body: lean into the gun, sweep, recoil
    hip = wpos('pelvis'); turn('pelvis', (0, 0, 1), sw * .35 * w, hip)
    turn('chest', (1, 0, 0), LEAN * w - 3.5 * shake * abs(jit(t, 11, 0)), wpos('chest')); turn('chest', (0, 0, 1), (sw * .65 + TW) * w + 1.5 * shake * jit(t, 7, 1), wpos('chest'))
    turn('neck', (1, 0, 0), -LEAN * .5 * w + 1.2 * shake * jit(t, 13, .5)); turn('head', (0, 1, 0), 2.5 * shake * jit(t, 5.5, 2))
    # gun arm: elbow tucked at the side, the gun level and pointing where the chest points, shaking with the kick
    fwd = Vector((0, -1, 0)); fwd.rotate(Matrix.Rotation(math.radians(sw * w), 3, 'Z'))   # the gun points where the sweep points
    q0 = {n: PB[n].rotation_quaternion.copy() for n in ('upperarm.L', 'forearm.L', 'hand.L', 'upperarm.R', 'forearm.R', 'hand.R')}
    S = wpos('upperarm.L'); side = Vector((1, 0, 0)); side.rotate(Matrix.Rotation(math.radians((sw + TW) * w), 3, 'Z'))
    elbow = S + side * .02 + fwd * .07 + Vector((0, 0, -.2))   # tucked in at the side, a little forward
    aim('upperarm.L', elbow)
    g = (fwd + Vector((0, 0, .04 + .05 * shake * jit(t, 17, 0)))).normalized(); g.rotate(Matrix.Rotation(math.radians(3 * shake * jit(t, 19, 1.3)), 3, 'Z'))
    rot_about('forearm.L', gun_dir().rotation_difference(g), wpos('forearm.L'))
    # right hand on top of the gun, a little in front of the elbow
    E = wpos('forearm.L'); grip = E + g * .09 + Vector((0, 0, .07))
    two_bone('upperarm.R', 'forearm.R', grip, Vector((-.7, .2, -.6)))
    aim('hand.R', grip + g * .1 + Vector((.02, 0, -.02)))
    if os.environ.get('ZH_DEBUG') and w > .99 and i % 15 == 0: print('GRIP miss', round((wpos('hand.R') - grip).length, 3))
    for n, qa in q0.items(): PB[n].rotation_quaternion = qa.slerp(PB[n].rotation_quaternion.copy(), w)
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
print('GATLING frames', nf, 'seconds', SECS, '->', out)
