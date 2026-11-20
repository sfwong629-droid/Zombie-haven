# fixfist.py -- RAW.glb CLIP OUT.json : the old hand-made punch and shove, kept and corrected (3D.237).
# Owner, 19 Nov, on the recorded punch and shove of 3D.236: "This punch is not good at all. go back to the old one and just make that better. Shove is not
# good at all too. it should just be arm come near body elbow bent down and then arm straight as a push, body lean forward. one leg step in as the shove happen."
#   punch: the old clip as it is, the hips lifted where the feet sank into the ground (up to 12 cm), so the lunge stands on the ground.
#   shove: the old clip's body and step-in, the hips lifted the same way, more lean into the push, and both arms redone: the hands come in to the chest with
#          the elbows bent and pointing down, then both arms drive straight out, level, at chest height, hold a beat, and come back.
import bpy, sys, os, math, json, numpy as np
from mathutils import Matrix, Vector, Quaternion
a = sys.argv[sys.argv.index('--') + 1:]; src, clip, out = a[0], a[1], a[2]
bpy.ops.wm.read_factory_settings(use_empty=True); bpy.ops.import_scene.gltf(filepath=src)
ao = next(o for o in bpy.data.objects if o.type == 'ARMATURE'); body = bpy.data.objects['body']; PB = ao.pose.bones; ad = ao.animation_data; sc = bpy.context.scene
for tr in ad.nla_tracks: tr.mute = True
old = bpy.data.actions[clip]; ad.action = old
try:
    if old.slots: ad.action_slot = old.slots[0]
except Exception: pass
SUB = 2; f0, f1 = old.frame_range; fps = sc.render.fps; nf = int(round(f1 - f0)) * SUB
def goto(fr): t = f0 + fr / SUB; sc.frame_set(int(t), subframe=t - int(t))
def upd(): bpy.context.view_layer.update()
def nz(v): v = np.asarray(v, float); return v / max(np.linalg.norm(v), 1e-9)
def sst(a_, b_, x): t = min(1., max(0., (x - a_) / max(1e-6, b_ - a_))); return t * t * (3 - 2 * t)
def lowest():
    dg = bpy.context.evaluated_depsgraph_get(); ev = body.evaluated_get(dg); m = ev.to_mesh(); z = min((ev.matrix_world @ v.co).z for v in m.vertices); ev.to_mesh_clear(); return z
def swing(pb, want):   # turn a bone the shortest way so it points along `want` (armature space), about its own head
    M = pb.matrix.copy(); R = M.to_3x3(); cur = (R @ Vector((0, 1, 0))).normalized(); q = cur.rotation_difference(Vector(want).normalized())
    N = (q.to_matrix() @ R).to_4x4(); N.translation = M.translation; pb.matrix = N; upd()
def lift(dz):
    pb = PB['pelvis']; M = pb.matrix.copy(); M.translation = M.translation + ao.matrix_world.inverted().to_3x3() @ Vector((0, 0, dz)); pb.matrix = M; upd()
def lean(deg):   # the chest further forward (about the armature's left-right axis, at the chest's own head); rig: +X left, -Y forward, +Z up
    if abs(deg) < .01: return
    pb = PB['chest']; M = pb.matrix.copy(); N = (Matrix.Rotation(math.radians(deg), 3, 'X') @ M.to_3x3()).to_4x4(); N.translation = M.translation; pb.matrix = N; upd()
def arms(t):
    w = sst(0, .2, t) * (1 - sst(.84, 1, t)); push = sst(.30, .43, t) * (1 - sst(.66, .84, t))   # 0 = the old guard at the clip's two ends; push: 0 hands in at the chest, 1 arms out
    for side, sg in (('L', 1), ('R', -1)):
        ua, fa = PB['upperarm.' + side], PB['forearm.' + side]; S = np.array(ua.head[:]); G = np.array(fa.tail[:]); la = (ua.tail - ua.head).length; lb = (fa.tail - fa.head).length
        K1 = S + np.array([-sg * .035, -.07, -.115])                                  # in: the hand in front of the lower chest, close to the body
        K2 = S + nz([-sg * .05, -1, -.02]) * (la + lb) * .996                        # out: the arm straight, forward and level, at chest height
        Nw = K1 * (1 - push) + K2 * push; W = G * (1 - w) + Nw * w
        n = W - S; d = min(la + lb - 1e-4, max(abs(la - lb) + 1e-4, np.linalg.norm(n))); n = nz(n); pole = np.array([sg * .25, .35, -1.]); p = nz(pole - n * (pole @ n))   # the elbow down (a little out and back)
        ca = (la * la + d * d - lb * lb) / (2 * la * d); E = S + n * la * ca + p * la * math.sqrt(max(0, 1 - ca * ca)); Wc = S + n * d
        swing(ua, E - S); swing(fa, Wc - np.array(fa.head[:]))
        hd = PB['hand.' + side]; cur = np.array((hd.matrix.to_3x3() @ Vector((0, 1, 0)))[:]); k = w * push   # the palms face forward in the push: the hand tips up, fingers up
        if k > .01: swing(hd, nz(nz(cur) * (1 - k) + np.array([0, -.5, .87]) * k))
def pose(fr, dz):
    goto(fr); t = fr / nf
    if dz: lift(dz)
    if clip == 'shove': lean(14 * sst(.30, .43, t) * (1 - sst(.66, .84, t))); arms(t)
# pass 1: how far the lowest point of the body is under the ground at each frame; the lift is that, held over its neighbours and smoothed (no jitter)
sink = np.array([max(0., -(lowest() if not pose(fr, 0) else 0)) for fr in range(nf + 1)])
hold = np.array([sink[max(0, i - 2):i + 3].max() for i in range(nf + 1)]); L = np.array([hold[max(0, i - 2):i + 3].mean() for i in range(nf + 1)]); L = np.maximum(L, sink)
order = [pb.name for pb in PB]; KEY = {b: {'rot': [], 'loc': []} for b in order}; low = []
for fr in range(nf + 1):
    pose(fr, float(L[fr])); low.append(lowest())
    for b in order:
        q = PB[b].rotation_quaternion; KEY[b]['rot'].append([q.x, q.y, q.z, q.w])
        if b in ('pelvis', 'gun'): KEY[b]['loc'].append(list(PB[b].location))
LOOPS = all(sum(abs(x - y) for x, y in zip(KEY[b]['rot'][0], KEY[b]['rot'][-1])) < .05 for b in order)   # a clip that ends lying down (collapse) keeps its own end
for b in order if LOOPS else []:   # the clip ends exactly where it starts
    KEY[b]['rot'][-1] = KEY[b]['rot'][0]
    if KEY[b]['loc']: KEY[b]['loc'][-1] = KEY[b]['loc'][0]
json.dump({'fps': fps * SUB, 'frames': nf, 'stride': 0., 'seconds': nf / (fps * SUB), 'bones': KEY, 'wdir': None}, open(out, 'w'))
print('FIST', clip, 'frames', nf, 'sank %.3f, now lowest %.3f' % (sink.max(), min(low)))
