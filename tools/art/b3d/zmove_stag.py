# zmove_stag.py -- RAW.glb MODE OUT.json : the Stag's moves (a new kind; 14-ZOMBIE-MOVES.md; previews for W216 and W239, made by hand, not in the game).
# MODE charge (clip stag_charge, 1.4 s, its attack): it drops its head, antlers forward, sinks back on its hind legs, drives forward
#   with the hind legs straightening, then tosses the antlers up and to its left, the front paws coming off the ground, and settles.
#   Starts and ends on today's attack's first pose; the hind paws stay planted.
# MODE scrape (clip stag_scrape, 2.6 s, the extra move that is not an attack, W239): head low, the right front hoof scrapes the ground
#   twice (lifted forward, dragged back), then a snort: the head jerks down and up and shakes, the tail flicks. Starts and ends on idle.
# Rig: hips (root), chest, neck, head, tail, bthigh/bshin/bpaw and fupper/flower/fpaw .L/.R; +X its left, -Y forward, +Z up.
import bpy, sys, os, math, json
from mathutils import Matrix, Vector, Quaternion
a = sys.argv[sys.argv.index('--') + 1:]; src, MODE, out = a[0], a[1], a[2]
bpy.ops.wm.read_factory_settings(use_empty=True); bpy.ops.import_scene.gltf(filepath=src)
ao = next(o for o in bpy.data.objects if o.type == 'ARMATURE'); body = next(o for o in bpy.data.objects if o.type == 'MESH' and o.find_armature() == ao)
PB = ao.pose.bones; W = ao.matrix_world; sc = bpy.context.scene; ad = ao.animation_data
for tr in ad.nla_tracks: tr.mute = True
base = bpy.data.actions['zombie_attack' if MODE == 'charge' else 'idle']; ad.action = base
try:
    if base.slots: ad.action_slot = base.slots[0]
except Exception: pass
for pb in PB: pb.rotation_mode = 'QUATERNION'
f0 = base.frame_range[0]; FPS = 30; SC = W.to_scale().x
SECS = float(os.environ.get('ZH_SECS', 1.4 if MODE == 'charge' else 2.6))
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
def move_root(d):
    pb = PB['hips']; M = pb.matrix.copy(); M.translation = M.translation + W.inverted().to_3x3() @ d; pb.matrix = M; upd()
def lowest():
    dg = bpy.context.evaluated_depsgraph_get(); ev = body.evaluated_get(dg); m = ev.to_mesh(); z = min((ev.matrix_world @ v.co).z for v in m.vertices); ev.to_mesh_clear(); return z
def jit(t, f, ph=0): return math.sin(2 * math.pi * f * t * SECS + ph)
goto(); base_low = lowest()
LEGS = {'b': ('bthigh', 'bshin', 'bpaw'), 'f': ('fupper', 'flower', 'fpaw')}
PAW0 = {}
for k, (u, l, p) in LEGS.items():
    for s in 'LR':
        PAW0[k + s] = (wpos(p + '.' + s), wpos(p + '.' + s, True), wpos(l + '.' + s) - (wpos(u + '.' + s) + wpos(p + '.' + s)) / 2)
def plant(k, s):
    u, l, p = LEGS[k]; an, to, pole = PAW0[k + s]; two_bone(u + '.' + s, l + '.' + s, an, pole); aim(p + '.' + s, wpos(p + '.' + s) + (to - an))
def plant_off(k, s, off):
    u, l, p = LEGS[k]; an, to, pole = PAW0[k + s]; two_bone(u + '.' + s, l + '.' + s, an + off, pole); aim(p + '.' + s, wpos(p + '.' + s) + (to - an))
if MODE == 'charge':
    # (t, head down (deg), sink back, drive forward, toss (0..1), front lift (deg))
    K = [(0.00, (0, 0, 0, 0, 0)), (0.22, (58, 1, 0, 0, 0)), (0.30, (62, 1, 0, 0, 0)), (0.44, (66, 0, 1, 0, 0)), (0.52, (60, 0, 1, 0, 0)),
         (0.62, (-6, 0, .7, 1, 20)), (0.72, (-4, 0, .5, 1, 16)), (1.00, (0, 0, 0, 0, 0))]
else:
    # (t, head low (deg), scrape, snort, look up (deg))
    K = [(0.00, (0, 0, 0, 0)), (0.12, (30, 1, 0, 0)), (0.56, (30, 1, 0, 0)), (0.62, (18, 0, 1, 0)), (0.76, (18, 0, 1, 0)), (0.84, (-8, 0, 0, 1)),
         (0.92, (-8, 0, 0, 1)), (1.00, (0, 0, 0, 0))]
def keys(t):
    for (ta, va), (tb, vb) in zip(K, K[1:]):
        if ta <= t <= tb: s_ = sst(ta, tb, t); return [x * (1 - s_) + y * s_ for x, y in zip(va, vb)]
    return list(K[-1][1])
order = [b.name for b in PB]; KEY = {b: {'rot': [], 'loc': []} for b in order}
nf = int(round(SECS * FPS)); BACK = ['bthigh.L', 'bshin.L', 'bpaw.L', 'bthigh.R', 'bshin.R', 'bpaw.R']; FRONT = [n.replace('b', 'f', 1).replace('thigh', 'upper').replace('shin', 'lower') for n in BACK]
for i in range(nf + 1):
    t = i / nf; goto(); k = keys(t)
    q0 = {n: PB[n].rotation_quaternion.copy() for n in BACK + FRONT + ['tail']}
    if MODE == 'charge':
        hd, sink, drive, toss, lift = k; w = min(1., abs(hd) / 8 + sink + drive + toss)
        move_root(Vector((0, .05 * sink - .06 * drive, -.05 * sink - .01 * drive)))
        hp = (wpos('bpaw.L') + wpos('bpaw.R')) / 2 + Vector((0, 0, .08))
        rot_about('hips', Quaternion(Vector((1, 0, 0)), math.radians(-6 * drive * (1 - toss) - lift * .8)), hp)   # nose down into the drive, up for the toss
        for s in 'LR': plant('b', s)
        for s in 'LR': plant('f', s)
        if lift > .1:
            for s, ph in (('L', 0), ('R', .2)):
                turn('fupper.' + s, (1, 0, 0), -lift * 2.2, wpos('fupper.' + s)); turn('flower.' + s, (1, 0, 0), lift * 3.2, wpos('flower.' + s))
        turn('neck', (1, 0, 0), hd * .7 - 30 * toss, wpos('neck')); turn('head', (1, 0, 0), hd * .5 - 12 * toss)
        turn('neck', (0, 0, 1), 22 * toss * sst(.54, .62, t) * (1 - sst(.72, .95, t)), wpos('neck'))   # the antlers thrown up and to its left
        turn('head', (0, 1, 0), 16 * toss * (1 - sst(.72, .95, t)))
        turn('tail', (1, 0, 0), -25 * max(drive, toss))
    else:
        hd, scr, sn, look = k; w = min(1., abs(hd) / 6 + scr + sn + look)
        turn('neck', (1, 0, 0), hd * .8 + look * -.5, wpos('neck')); turn('head', (1, 0, 0), hd * .4)
        for s in 'LR': plant('b', s)
        plant('f', 'L')
        off = Vector((0, 0, 0))
        if scr > 0:
            u = ((t - .14) / .2) % 1 if .14 <= t < .54 else 0.
            if u < .4: v = sst(0, .4, u); off = Vector((0, -.13 * v, .15 * math.sin(math.pi * u / .4)))
            else: v = sst(.4, 1, u); off = Vector((0, -.13 + .18 * v, .004))
            if t >= .54: off = Vector((0, .05, .004)) * (1 - sst(.54, .6, t))
            off = off * scr
        plant_off('f', 'R', off)
        snort = sn * math.sin(2 * math.pi * (t - .62) / .07) * (1 - sst(.62, .76, t)) if .62 <= t <= .76 else 0
        turn('head', (1, 0, 0), 14 * snort); turn('neck', (0, 0, 1), 12 * sn * jit(t, 5.5), wpos('neck'))
        turn('neck', (0, 0, 1), 18 * look * math.sin(2 * math.pi * (t - .82) / .14) if .82 <= t <= .96 else 0, wpos('neck'))
        turn('tail', (0, 0, 1), 40 * (sn + look) * jit(t, 6))
    wl = min(1., 8 * w)
    for n in BACK + FRONT + ['tail']: PB[n].rotation_quaternion = q0[n].slerp(PB[n].rotation_quaternion.copy(), wl)
    upd()
    lo = lowest()
    if lo < base_low - .002: move_root(Vector((0, 0, base_low - lo)))
    for b in order:
        q = PB[b].rotation_quaternion; KEY[b]['rot'].append([q.x, q.y, q.z, q.w])
        if b == 'hips': KEY[b]['loc'].append(list(PB[b].location))
for b in order:
    for i in range(1, len(KEY[b]['rot'])):
        if sum(x * y for x, y in zip(KEY[b]['rot'][i], KEY[b]['rot'][i - 1])) < 0: KEY[b]['rot'][i] = [-x for x in KEY[b]['rot'][i]]
json.dump({'fps': FPS, 'frames': nf, 'stride': None, 'seconds': SECS, 'bones': KEY, 'wdir': None}, open(out, 'w'))
print('STAG', MODE, 'frames', nf, 'seconds', SECS, '->', out)
