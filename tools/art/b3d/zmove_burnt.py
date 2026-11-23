# zmove_burnt.py -- RAW.glb MODE OUT.json : the Burnt's moves, man and woman (14-ZOMBIE-MOVES.md; previews for W216 and W239, made by hand, not in
# the game). Who it was: caught in the fires of the first week.
# MODE rush (clip burnt_rush, 1.3 s, its attack): a flailing rush. Both arms beat wildly down at the target, out of step with each other, the body
#   twisting from side to side and the head thrashing as if it were still on fire, the hips driving forward. Feet planted (the legs are solved to them).
#   Starts and ends on today's attack's first pose.
# MODE circle (clip burnt_circle, 1.9 s, the extra move that is not an attack, W239): it runs round in a little circle with both hands up in the air,
#   waving, like a cartoon character on fire (owner, 23 Nov: "do a hand rising running in circle like a cartoon character"; the patting was turned
#   down). Its own run (zombie_run) for the legs, two strides round a circle that comes back to where it started, leaning in, head thrown back.
#   Starts and ends on its first idle pose, on the spot it started.
# Rig: +X its left, -Y forward, +Z up.
import bpy, sys, os, math, json
from mathutils import Matrix, Vector, Quaternion
a = sys.argv[sys.argv.index('--') + 1:]; src, MODE, out = a[0], a[1], a[2]
bpy.ops.wm.read_factory_settings(use_empty=True); bpy.ops.import_scene.gltf(filepath=src)
ao = next(o for o in bpy.data.objects if o.type == 'ARMATURE'); body = bpy.data.objects['body']; PB = ao.pose.bones; W = ao.matrix_world; sc = bpy.context.scene
ad = ao.animation_data
for tr in ad.nla_tracks: tr.mute = True
base = bpy.data.actions['zombie_attack' if MODE == 'rush' else 'idle']; ad.action = base
try:
    if base.slots: ad.action_slot = base.slots[0]
except Exception: pass
for pb in PB: pb.rotation_mode = 'QUATERNION'
f0 = base.frame_range[0]; FPS = 30; SC = W.to_scale().x
SECS = float(os.environ.get('ZH_SECS', 1.3 if MODE == 'rush' else 1.9))
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
goto(); base_low = lowest(); H = wpos('head', True).z
FOOT = {s: (wpos('foot.' + s), wpos('foot.' + s, True), wpos('shin.' + s) - (wpos('thigh.' + s) + wpos('foot.' + s)) / 2) for s in 'LR'}
LEGS = [n for s in 'LR' for n in ('thigh.' + s, 'shin.' + s, 'foot.' + s)]; ARMS = [n for s in 'LR' for n in ('upperarm.' + s, 'forearm.' + s, 'hand.' + s)]
def plant():
    for s in 'LR':
        an, to, pole = FOOT[s]; two_bone('thigh.' + s, 'shin.' + s, an, pole); aim('foot.' + s, wpos('foot.' + s) + (to - an))
order = [b.name for b in PB]; KEY = {b: {'rot': [], 'loc': []} for b in order}
nf = int(round(SECS * FPS))
SHL = {s: wpos('upperarm.' + s) for s in 'LR'}
RUNSTRIDE = float(os.environ.get('ZH_STRIDE', 1.27))   # zombie_run's stride (js/render3d.js, ZMODEL burnt)
def arm_to(s, sg, tgt, w_):
    q1 = {n: PB[n].rotation_quaternion.copy() for n in ('upperarm.' + s, 'forearm.' + s, 'hand.' + s)}
    two_bone('upperarm.' + s, 'forearm.' + s, tgt, Vector((sg * .8, .5, -.3)))
    aim('hand.' + s, wpos('hand.' + s) + (wpos('forearm.' + s, True) - wpos('forearm.' + s)).normalized())
    for n, qa in q1.items(): PB[n].rotation_quaternion = qa.slerp(PB[n].rotation_quaternion.copy(), w_)
    upd()
for i in range(nf + 1):
    ad.action = base   # (switching the action back after posing re-applies it and wipes the pose: the circle run's legs were lost that way)
    try: ad.action_slot = base.slots[0]
    except Exception: pass
    t = i / nf; goto(); q0 = {n: PB[n].rotation_quaternion.copy() for n in LEGS}
    if MODE == 'circle': q0 = None
    if MODE == 'rush':
        w = sst(0, .14, t) * (1 - sst(.84, 1, t)); T = t * SECS
        move_pelvis(Vector((0, -.05 * H, -.03 * H)) * w); plant()
        tw = 24 * math.sin(2 * math.pi * 2.3 * T); turn('chest', (0, 0, 1), tw * w, wpos('chest')); turn('chest', (1, 0, 0), 14 * w, wpos('chest'))
        turn('head', (0, 0, 1), -18 * math.sin(2 * math.pi * 2.3 * T + 1.2) * w); turn('head', (0, 1, 0), 12 * math.sin(2 * math.pi * 3.4 * T) * w)
        R = Matrix.Rotation(math.radians(tw * w), 3, 'Z')
        for s, sg, ph in (('L', 1, 0), ('R', -1, 2.4)):   # each hand beats down at the target in its own rhythm
            a_ = 2 * math.pi * 2.9 * T + ph; S = wpos('upperarm.' + s)
            off = Vector((sg * .12, -(.18 + .06 * math.cos(a_)) * H / .95, (.0 + .12 * math.sin(a_)) * H / .95))   # out wide of the head, no higher than it
            arm_to(s, sg, S + R @ off, w)
    else:   # circle
        TIN, TOUT = .25 / SECS, 1 - .25 / SECS; w = sst(0, TIN, t) * (1 - sst(TOUT, 1, t)); u = min(1., max(0., (t - TIN) / (TOUT - TIN)))
        RUN = bpy.data.actions['zombie_run']; r0, r1 = RUN.frame_range; ph = (u * 2) % 1 if u < 1 else 0
        base_q = {b.name: b.rotation_quaternion.copy() for b in PB}; base_l = PB['pelvis'].location.copy()
        ad.action = RUN
        try: ad.action_slot = RUN.slots[0]
        except Exception: pass
        fr = r0 + ph * (r1 - r0); sc.frame_set(int(fr), subframe=fr - int(fr)); upd()
        for b in PB: b.rotation_quaternion = base_q[b.name].slerp(b.rotation_quaternion.copy(), w)
        PB['pelvis'].location = base_l.lerp(PB['pelvis'].location.copy(), w); upd()
        turn('neck', (1, 0, 0), -14 * w); turn('head', (1, 0, 0), -12 * w + 6 * math.sin(2 * math.pi * 3 * t * SECS) * w)
        for s, sg, ph2 in (('L', 1, 0), ('R', -1, 1.6)):   # both hands up in the air, waving
            wav = math.sin(2 * math.pi * 3.2 * t * SECS + ph2)
            q1 = {n: PB[n].rotation_quaternion.copy() for n in ('upperarm.' + s, 'forearm.' + s, 'hand.' + s)}
            aim('upperarm.' + s, wpos('upperarm.' + s) + Vector((sg * (.45 + .1 * wav), -.1, .88)))
            aim('forearm.' + s, wpos('forearm.' + s) + Vector((sg * (.15 + .35 * wav), -.05, 1)))
            aim('hand.' + s, wpos('hand.' + s) + Vector((sg * (.1 + .4 * wav), 0, 1)))
            for n, qa in q1.items(): PB[n].rotation_quaternion = qa.slerp(PB[n].rotation_quaternion.copy(), w)
            upd()
        R = RUNSTRIDE * 2 / (2 * math.pi); th = 2 * math.pi * u                 # two strides round the circle, curving to its right
        lean = 12 * w * math.sin(math.pi * u)
        rot_about('pelvis', Quaternion(Vector((0, 1, 0)), math.radians(-lean)), Vector((0, 0, 0)))        # leaning in to the turn
        rot_about('pelvis', Quaternion(Vector((0, 0, 1)), -th), Vector((0, 0, 0)))
        move_pelvis(Vector((-R + R * math.cos(th), -R * math.sin(th), 0)))
    if q0:
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
print('BURNT', MODE, 'frames', nf, 'seconds', SECS, '->', out)
