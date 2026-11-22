# grabbite.py -- RAW.glb OUT.json : the Walker's signature move, grab and bite (14-ZOMBIE-MOVES.md, approved W190; owner, 21 Nov: "next").
# Both arms reach out for the target at chest height with the hands open, clamp on (the fingers curl), pull the target in, and the head lunges forward
# for the bite; then the zombie lets go and settles back. Replaces zombie_attack (same length, 0.92 s). Hand-made, not a recording.
# The body stands on the first pose of today's attack the whole time (feet planted) and leans into the bite; each arm is solved to a hand target round
# its shoulder; each arm bone's turn is blended from today's first pose by a weight (0 at the start and end), so the clip starts and ends exactly
# where today's does. Rig: +X left, -Y forward, +Z up.
import bpy, sys, os, math, json
from mathutils import Matrix, Vector, Quaternion
a = sys.argv[sys.argv.index('--') + 1:]; src, out = a[0], a[1]
CURL = float(os.environ.get('ZH_CURL', 70)); BITE = float(os.environ.get('ZH_BITE', 30)); LEAN = float(os.environ.get('ZH_LEAN', 16))
bpy.ops.wm.read_factory_settings(use_empty=True); bpy.ops.import_scene.gltf(filepath=src)
ao = next(o for o in bpy.data.objects if o.type == 'ARMATURE'); body = bpy.data.objects['body']; PB = ao.pose.bones; W = ao.matrix_world; sc = bpy.context.scene
ad = ao.animation_data
for tr in ad.nla_tracks: tr.mute = True
old = bpy.data.actions['zombie_attack']; ad.action = old
try:
    if old.slots: ad.action_slot = old.slots[0]
except Exception: pass
for pb in PB: pb.rotation_mode = 'QUATERNION'
SUB = 2; f0, f1 = old.frame_range; fps = sc.render.fps; SC = W.to_scale().x
def upd(): bpy.context.view_layer.update()
def sst(a_, b_, x): t = min(1., max(0., (x - a_) / max(1e-6, b_ - a_))); return t * t * (3 - 2 * t)
def wpos(n, tail=False): pb = PB[n]; return W @ (pb.tail if tail else pb.head)
def aim(name, to):
    pb = PB[name]; M = W @ pb.matrix; h = M.translation.copy(); d0 = (M.to_3x3() @ Vector((0, 1, 0))).normalized(); d1 = (to - h).normalized()
    q = d0.rotation_difference(d1).to_matrix().to_4x4(); pb.matrix = W.inverted() @ Matrix.Translation(h) @ q @ Matrix.Translation(-h) @ M; upd()
def turn(name, axis, deg, about=None):
    if abs(deg) < .01: return
    pb = PB[name]; M = W @ pb.matrix; c = (about if about is not None else M.translation).copy()
    T = Matrix.Translation(c) @ Matrix.Rotation(math.radians(deg), 4, axis) @ Matrix.Translation(-c); pb.matrix = W.inverted() @ T @ M; upd()
def arm_to(side, hand_at, pole):   # two-bone solve: the wrist at hand_at, the elbow towards pole
    ua, fa = 'upperarm.' + side, 'forearm.' + side; h = wpos(ua); l1 = PB[ua].length * SC; l2 = PB[fa].length * SC
    v = hand_at - h; dd = min(max(v.length, abs(l1 - l2) * 1.05), .995 * (l1 + l2)); n = v.normalized()
    x = (l1 * l1 - l2 * l2 + dd * dd) / (2 * dd); hg = math.sqrt(max(l1 * l1 - x * x, 0)); p = Vector(pole); p = (p - n * p.dot(n)).normalized()
    aim(ua, h + n * x + p * hg); aim(fa, h + n * dd)
def keys(K, t):
    for (ta, va), (tb, vb) in zip(K, K[1:]):
        if ta <= t <= tb: s = sst(ta, tb, t); return [x * (1 - s) + y * s for x, y in zip(va, vb)]
    return list(K[-1][1])
def lowest():
    dg = bpy.context.evaluated_depsgraph_get(); ev = body.evaluated_get(dg); m = ev.to_mesh(); z = min((ev.matrix_world @ v.co).z for v in m.vertices); ev.to_mesh_clear(); return z
def lift(dz):
    pb = PB['pelvis']; M = pb.matrix.copy(); M.translation = M.translation + W.inverted().to_3x3() @ Vector((0, 0, dz)); pb.matrix = M; upd()
# (t, weight of the made arms, chest lean, head lunge, L dir xyz, L reach, R dir xyz, R reach, finger curl 0..1)
K = [(0.00, (0, 0, 0, .15, -.95, .05, .97, -.15, -.95, .05, .97, 0)),
     (0.24, (1, 10, 4, .22, -.95, .10, .97, -.22, -.95, .10, .97, 0)),     # reaching out, hands open
     (0.40, (1, 12, 6, .40, -.90, .08, .90, -.40, -.90, .08, .90, 1)),     # clamp on the target's shoulders, a shoulder-width apart
     (0.54, (1, LEAN, BITE, .42, -.88, .0, .84, -.42, -.88, .0, .84, 1)),  # pull it in and bite between the hands
     (0.66, (1, LEAN, BITE * .7, .42, -.88, .0, .84, -.42, -.88, .0, .84, 1)),
     (0.70, (1, LEAN, BITE, .42, -.88, .0, .84, -.42, -.88, .0, .84, 1)),  # a second snap of the jaws
     (0.86, (.5, 8, 4, .20, -.90, -.10, .88, -.20, -.90, -.10, .88, .3)),  # letting go
     (1.00, (0, 0, 0, .15, -.90, -.10, .85, -.15, -.90, -.10, .85, 0))]
goto = lambda: sc.frame_set(int(f0))
goto(); upd(); base_low = lowest()
REST = {s: (wpos('hand.' + s), (wpos('forearm.' + s) - (wpos('upperarm.' + s) + wpos('hand.' + s)) / 2)) for s in 'LR'}   # today's first pose: wrist, elbow pole
REST_ROT = {n: PB[n].rotation_quaternion.copy() for n in ('fingers.L', 'fingers.R') if n in PB}
secs = (f1 - f0) / fps; nf = int(round(f1 - f0)) * SUB
order = [b.name for b in PB]; KEY = {b: {'rot': [], 'loc': []} for b in order}
for i in range(nf + 1):
    t = i / nf; k = keys(K, t); w = k[0]; goto(); upd()
    turn('chest', 'X', k[1]); turn('neck', 'X', k[2]); turn('head', 'X', -k[2] * .45)   # the neck thrusts the face forward; the head stays near level (a jaw thrust, not a nod)
    for side, o in (('L', 3), ('R', 7)):
        S = wpos('upperarm.' + side); L = (PB['upperarm.' + side].length + PB['forearm.' + side].length) * SC
        tgt = S + Vector(k[o:o + 3]).normalized() * k[o + 3] * L; sg = 1 if side == 'L' else -1
        pole = Vector((sg * .8, .3, -.5))
        bones = ['upperarm.' + side, 'forearm.' + side, 'hand.' + side]; q0 = [PB[n].rotation_quaternion.copy() for n in bones]
        arm_to(side, tgt, pole)
        aim('hand.' + side, wpos('hand.' + side) + (wpos('forearm.' + side, True) - wpos('forearm.' + side)).normalized())
        for n, qa in zip(bones, q0): PB[n].rotation_quaternion = qa.slerp(PB[n].rotation_quaternion.copy(), w)   # weight 0 = today's pose exactly
        upd()
        fn = 'fingers.' + side
        if fn in PB: PB[fn].rotation_quaternion = REST_ROT[fn] @ Quaternion((1, 0, 0), math.radians(CURL * k[11])); upd()
    lo = lowest()
    if lo < base_low - .002: lift(base_low - lo)
    for b in order:
        q = PB[b].rotation_quaternion; KEY[b]['rot'].append([q.x, q.y, q.z, q.w])
        if b == 'pelvis': KEY[b]['loc'].append(list(PB[b].location))
for b in order:
    for i in range(1, len(KEY[b]['rot'])):
        if sum(x * y for x, y in zip(KEY[b]['rot'][i], KEY[b]['rot'][i - 1])) < 0: KEY[b]['rot'][i] = [-x for x in KEY[b]['rot'][i]]
KEY = {b: v for b, v in KEY.items() if not b.startswith(('weapon_', 'armor_')) and not b.endswith(('_tip', '_grip1', '_grip2', '_grip_low'))}
json.dump({'fps': fps * SUB, 'frames': nf, 'stride': None, 'seconds': secs, 'bones': KEY, 'wdir': None}, open(out, 'w'))
print('GRABBITE frames', nf, 'seconds', round(secs, 2), '->', out)
