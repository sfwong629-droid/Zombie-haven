# doggallop.py -- DOG.raw.glb OUT.json : the Dog's (or the Stag's) run as a real gallop (owner, 21 Nov: "the dog leg run is not natural").
# Made by hand from how a dog gallops: the hind feet land one after the other, far forward under the belly, and push; the body stretches out in the air
# (fore legs reaching, hind legs trailing, back straight); the fore feet land one after the other and the body rolls over them; the back arches and all
# four feet gather under the body in the air; the hind feet land again. Each foot stands still on the ground while it is down (the game moves the dog
# ZH_STRIDE per cycle), and the legs are solved to the feet. ZH_N frames at 24 a second.
import bpy, sys, os, json, math, numpy as np
from mathutils import Vector, Matrix, Quaternion
a = sys.argv[sys.argv.index('--') + 1:]; src, out = a[0], a[1]
STRIDE = float(os.environ.get('ZH_STRIDE', .62)); N = int(os.environ.get('ZH_N', 13)); fps = 24; SUB = 2
bpy.ops.wm.read_factory_settings(use_empty=True); bpy.ops.import_scene.gltf(filepath=src)
ao = next(o for o in bpy.data.objects if o.type == 'ARMATURE'); PB = ao.pose.bones; W = ao.matrix_world
if ao.animation_data: ao.animation_data.action = None; [setattr(t, 'mute', True) for t in ao.animation_data.nla_tracks]
for pb in PB: pb.rotation_mode = 'QUATERNION'
def upd(): bpy.context.view_layer.update()
def rest():
    for pb in PB: pb.rotation_quaternion = (1, 0, 0, 0); pb.location = (0, 0, 0); pb.scale = (1, 1, 1)
    upd()
rest(); R = {b.name: ((W @ b.head).copy(), (W @ b.tail).copy()) for b in PB}; S = max(R['head'][0].z, R['hips'][0].z) / .6   # size against the Dog (the Stag is bigger)
sst = lambda a_, b_, x: (lambda u: u * u * (3 - 2 * u))(min(1, max(0, (x - a_) / (b_ - a_))))
def turn(name, axis, deg, about=None):   # turn a bone (and what hangs on it) about a world axis through its own head
    pb = PB[name]; M = W @ pb.matrix; c = (about if about is not None else M.translation).copy(); T = Matrix.Translation(c) @ Matrix.Rotation(math.radians(deg), 4, axis) @ Matrix.Translation(-c); pb.matrix = W.inverted() @ T @ M; upd()
def aim(name, to):   # point a bone from its head at a world point, by the smallest turn
    pb = PB[name]; M = W @ pb.matrix; h = M.translation.copy(); d0 = (M.to_3x3() @ Vector((0, 1, 0))).normalized(); d1 = (to - h).normalized(); q = d0.rotation_difference(d1).to_matrix().to_4x4()
    pb.matrix = W.inverted() @ Matrix.Translation(h) @ q @ Matrix.Translation(-h) @ M; upd()
def leg(up, lo, paw, ankle, pole, pawdir):   # two-bone leg to an ankle point, the knee towards the pole; then the paw along pawdir
    h = (W @ PB[up].matrix).translation.copy(); l1 = PB[up].length * W.to_scale().x; l2 = PB[lo].length * W.to_scale().x; v = ankle - h; d = min(v.length, (l1 + l2) * .999); d = max(d, abs(l1 - l2) * 1.02 + 1e-4); n = v.normalized()
    x = (l1 * l1 - l2 * l2 + d * d) / (2 * d); hgt = math.sqrt(max(l1 * l1 - x * x, 0)); p = pole - n * pole.dot(n); p = p.normalized() if p.length > 1e-6 else Vector((0, 0, 1))
    knee = h + n * x + p * hgt; aim(up, knee); aim(lo, h + n * d); aim(paw, (W @ PB[paw].matrix).translation + pawdir)
# the feet: (bones, where the foot stands under the body at rest, when it lands in the cycle, how far forward of rest it lands)
F = lambda n_: R[n_][0]
# a dog never lands two feet at once (owner, 21 Nov): the four feet come down one after the other, round the body (a rotary gallop):
# left hind, right hind, the stretched flight, right fore, left fore, the gathered flight. ZH_LAND = the four landing times (hind L, hind R, fore L, fore R).
LAND = [float(x) for x in os.environ.get('ZH_LAND', '0,.15,.66,.48').split(',')]
LEGS = [(('bthigh.L', 'bshin.L', 'bpaw.L'), F('bpaw.L'), LAND[0], .10, True), (('bthigh.R', 'bshin.R', 'bpaw.R'), F('bpaw.R'), LAND[1], .12, True),
        (('fupper.L', 'flower.L', 'fpaw.L'), F('fpaw.L'), LAND[2], .13, False), (('fupper.R', 'flower.R', 'fpaw.R'), F('fpaw.R'), LAND[3], .09, False)]
DUTY = .24; SW = STRIDE * DUTY   # how far a foot slides back under the body while it is down
def foot(t, land, fwd, hind, rest_p):
    u = (t - land) % 1.
    if u < DUTY: y = -fwd * S + SW * (u / DUTY); z = 0.; k = u / DUTY; lift = .035 * S * sst(.6, 1, k) if hind else .02 * S * sst(.7, 1, k)   # down: forward is -Y; the heel rises as it pushes off
    else:
        k = (u - DUTY) / (1 - DUTY); y = (-fwd * S + SW) + (-SW) * sst(0, 1, k) + (.10 if hind else .06) * S * math.sin(math.pi * k) * (1 if hind else -.4)   # in the air: trails back, then swings forward
        z = (.15 if hind else .17) * S * math.sin(math.pi * min(1, k * 1.03)) ** 1.3; lift = z
    return rest_p + Vector((0, y, lift if u < DUTY else z)), (u < DUTY), (u / DUTY if u < DUTY else (u - DUTY) / (1 - DUTY))
MISS = {}; ARCH = float(os.environ.get('ZH_ARCH', -9)); ROCK = float(os.environ.get('ZH_ROCK', -5)); BOB = float(os.environ.get('ZH_BOB', .025)); LOW = float(os.environ.get('ZH_LOW', .035))
order = [b.name for b in PB]; KEY = {b: {'rot': [], 'loc': []} for b in order}; nf = N * SUB
for i in range(nf + 1):
    t = (i / nf) % 1.; rest()
    arch = math.cos(2 * math.pi * (t - .92))            # +1 gathered (back arched, just before the hind feet land), -1 stretched out in the air
    bob = -LOW * S + BOB * S * (math.cos(2 * math.pi * (t - .38)) * .6 + math.cos(4 * math.pi * (t - .12)) * .4)   # highest in the stretched flight
    PB['hips'].location = PB['hips'].location + (PB['hips'].bone.matrix_local.to_3x3().inverted() @ Vector((0, 0, bob))); upd()
    turn('hips', 'X', -ROCK * math.sin(2 * math.pi * (t - .30)) , about=(R['hips'][0] + R['chest'][1]) / 2 + Vector((0, 0, bob)))   # the whole body rocks: nose down as the fore feet land
    turn('hips', 'X', ARCH * arch, about=(W @ PB['chest'].matrix).translation)      # the haunches tuck under when gathered
    turn('chest', 'X', -ARCH * .9 * arch)                                                # and the chest rounds the other way
    turn('neck', 'X', 6 * arch + 5 * math.sin(2 * math.pi * (t - .30))); turn('head', 'X', 4 * arch)   # the head stays level, reaching in the stretch
    turn('tail', 'X', -25 * arch + 10)
    for (up, lo, paw), rp, land, fwd, hind in LEGS:
        tgt, down, k = foot(t, land, fwd, hind, rp); ank_off = R[paw][0] - rp if False else Vector((0, 0, 0))
        # the ankle (paw bone's head) sits above and behind the toes: flat on the ground when down, toes hanging when in the air
        pd = (R[paw][1] - R[paw][0]); flat = pd.normalized(); hang = (Vector((0, .25 if hind else .1, -1))).normalized(); w = 0 if down and k < .6 else (sst(.6, 1, k) if down else 1 - .6 * sst(.6, 1, k))
        pawdir = (flat * (1 - w) + hang * w).normalized(); ankle = tgt + Vector((0, 0, R[paw][0].z - rp.z)) * 0 + (R[paw][0] - R[paw][0])
        ankle = Vector((tgt.x, tgt.y, tgt.z)) ; pole = Vector((0, 1, .25)) if hind else Vector((0, 1, -.1))
        if hind: pole = Vector((0, -1, .3))      # a dog's knee points forward, its hock back: the thigh+shin pair bends forward
        else: pole = Vector((0, 1, .2))          # the elbow points back
        leg(up, lo, paw, ankle, pole, pawdir); MISS[paw] = max(MISS.get(paw, 0), ((W @ PB[paw].matrix).translation - ankle).length if down else 0)
    for b in order:
        q = PB[b].rotation_quaternion; KEY[b]['rot'].append([q.x, q.y, q.z, q.w])
        if b == 'hips': KEY[b]['loc'].append(list(PB[b].location))
for b in order:
    KEY[b]['rot'][-1] = KEY[b]['rot'][0]
    for i in range(1, len(KEY[b]['rot'])):
        if sum(x * y for x, y in zip(KEY[b]['rot'][i], KEY[b]['rot'][i - 1])) < 0: KEY[b]['rot'][i] = [-x for x in KEY[b]['rot'][i]]
    if KEY[b]['loc']: KEY[b]['loc'][-1] = KEY[b]['loc'][0]
json.dump({'fps': fps * SUB, 'frames': nf, 'stride': STRIDE, 'seconds': nf / (fps * SUB), 'bones': KEY, 'wdir': None}, open(out, 'w')); print('GALLOP', src.split('/')[-1], 'feet miss the ground by', {k: round(v, 3) for k, v in MISS.items()}, 'frames', nf, 'size', round(S, 2), '->', out)
