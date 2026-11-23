# zmove_crawler.py -- RAW.glb MODE OUT.json : the Crawler's moves, both models (14-ZOMBIE-MOVES.md; previews for W216 and W239, made by hand, not in the
# game). The Crawlers have no legs and lie on the ground.
# MODE grab (clip crawler_grab, 1.4 s, its attack): the ankle grab. One hand shoots out and grabs the ankle in front, the other hand grabs higher up the
#   shin, the first hand goes higher still (hauling itself up the leg hand over hand, the chest rising off the ground), then the head lunges in and
#   bites at the knee, shaking; then it drops back down. Starts and ends on today's attack's first pose.
# MODE look (clip crawler_look, 2.4 s, the extra move that is not an attack, W239): it drags itself a little (one arm reaches out flat and pulls, the
#   body surging forward, then the other), then lifts its head and looks round, left and right. Starts and ends on its first idle pose.
# Rig: +X its left, -Y forward, +Z up. Arms solved to hand targets (two bones), the elbows out to the side.
import bpy, sys, os, math, json
from mathutils import Matrix, Vector, Quaternion
a = sys.argv[sys.argv.index('--') + 1:]; src, MODE, out = a[0], a[1], a[2]
bpy.ops.wm.read_factory_settings(use_empty=True); bpy.ops.import_scene.gltf(filepath=src)
ao = next(o for o in bpy.data.objects if o.type == 'ARMATURE'); body = bpy.data.objects['body']; PB = ao.pose.bones; W = ao.matrix_world; sc = bpy.context.scene
ad = ao.animation_data
for tr in ad.nla_tracks: tr.mute = True
base = bpy.data.actions['crawl_attack' if MODE == 'grab' else 'crawl']; ad.action = base   # 'crawl_idle' hangs above the ground; the game plays 'crawl'
try:
    if base.slots: ad.action_slot = base.slots[0]
except Exception: pass
for pb in PB: pb.rotation_mode = 'QUATERNION'
f0 = base.frame_range[0]; FPS = 30; SC = W.to_scale().x
SECS = float(os.environ.get('ZH_SECS', 1.4 if MODE == 'grab' else 2.4))
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
goto(); base_low = lowest()
ARMS = [n for s in 'LR' for n in ('upperarm.' + s, 'forearm.' + s, 'hand.' + s)]
SH = {s: wpos('upperarm.' + s) for s in 'LR'}; Y0 = min(SH['L'].y, SH['R'].y); Z0 = wpos('hand.L').z
if MODE == 'grab':
    # (t, weight, tip up (degrees: the whole body tipped up about the end of its stumps, no bend at the waist), head (- = up), bite,
    #  R hand from its shoulder (out, forward, up) wt, L hand from its shoulder (out, forward, up) wt)
    K = [(0.00, (0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0)),
         (0.16, (1, 3, -10, 0, .02, .27, -.08, 1, 0, 0, 0, 0)),             # the right hand shoots out low and grabs the ankle, out in front of the face
         (0.32, (1, 8, -14, 0, .02, .27, -.07, 1, .02, .27, .00, 1)),      # the left hand grabs above it, the body coming up off the ground
         (0.48, (1, 13, -16, 0, .02, .26, .05, 1, .02, .27, -.02, 1)),     # the right hand above that: hauling itself up the leg, hand over hand
         (0.60, (1, 15, 6, 1, .03, .22, .00, 1, .03, .23, -.04, 1)),       # both hands pull down, the face lunges to bite at the knee, shaking
         (0.84, (1, 14, 4, 1, .03, .22, .00, 1, .03, .23, -.04, 1)),
         (1.00, (0, 0, 0, 0, .03, .22, .00, 0, .03, .23, -.04, 0))]
    dg = bpy.context.evaluated_depsgraph_get(); ev = body.evaluated_get(dg); m = ev.to_mesh(); back = max((ev.matrix_world @ v.co).y for v in m.vertices); ev.to_mesh_clear()
    PIV = Vector((0, back - .04, base_low))   # tipped about the end of the stumps, which stays on the ground
else:
    # (t, weight, surge forward, head (- = up), look round, R hand forward reach, L hand forward reach)
    K = [(0.00, (0, 0, 0, 0, 0, 0)), (0.12, (1, 0, 0, 0, .12, 0)), (0.26, (1, .035, 0, 0, 0, 0)), (0.38, (1, .035, 0, 0, 0, .12)),
         (0.52, (1, .07, 0, 0, 0, 0)), (0.62, (1, .07, -24, 0, 0, 0)), (0.90, (1, .07, -24, 1, 0, 0)), (1.00, (0, 0, 0, 0, 0, 0))]
order = [b.name for b in PB]; KEY = {b: {'rot': [], 'loc': []} for b in order}
nf = int(round(SECS * FPS))
for i in range(nf + 1):
    t = i / nf; goto(); k = keys(K, t); w = k[0]
    q0 = {n: PB[n].rotation_quaternion.copy() for n in ARMS}
    if MODE == 'grab':
        rot_about('pelvis', Quaternion(Vector((1, 0, 0)), math.radians(-k[1] * w)), PIV)   # tipped up about the stumps
        turn('neck', (1, 0, 0), k[1] * .5 * w + 10 * k[3] * w); turn('head', (1, 0, 0), k[2] * w)
        turn('head', (0, 0, 1), 14 * k[3] * w * jit(t, 5.5))                         # shaking at the bite
        for s, sg, o in (('R', -1, 4), ('L', 1, 8)):
            hw = k[o + 3]
            if hw > .001:
                tgt = wpos('upperarm.' + s) + Vector((sg * k[o], -k[o + 1], k[o + 2]))
                q1 = {n: PB[n].rotation_quaternion.copy() for n in ('upperarm.' + s, 'forearm.' + s, 'hand.' + s)}
                two_bone('upperarm.' + s, 'forearm.' + s, tgt, Vector((sg * 1, .3, .2)))
                aim('hand.' + s, wpos('hand.' + s) + Vector((-sg * .6, -.3, .5)))
                for n, qa in q1.items(): PB[n].rotation_quaternion = qa.slerp(PB[n].rotation_quaternion.copy(), hw)
                upd()
    else:
        move_pelvis(Vector((0, -k[1], 0)) * w)
        turn('neck', (1, 0, 0), k[2] * .6 * w); turn('head', (1, 0, 0), k[2] * .4 * w)
        look = math.sin(2 * math.pi * 1.2 * sst(.62, .9, t)) * k[3]
        turn('head', (0, 0, 1), 38 * look * w); turn('neck', (0, 0, 1), 12 * look * w)
        for s, sg, o in (('R', -1, 4), ('L', 1, 5)):
            r = k[o]
            if r > .001:   # one arm reaches out flat along the ground (the other one stays planted and the body surges past it)
                sh = wpos('upperarm.' + s)
                two_bone('upperarm.' + s, 'forearm.' + s, sh + Vector((sg * .03, -.26 * r / .12, base_low + .03 - sh.z)), Vector((sg, .2, .3)))
    for n in ARMS: PB[n].rotation_quaternion = q0[n].slerp(PB[n].rotation_quaternion.copy(), w)
    upd()
    lo = lowest()
    if lo < base_low - .002 or lo > base_low + .002: move_pelvis(Vector((0, 0, base_low - lo)))   # lying: when the arms leave the ground the body drops onto it
    for b in order:
        q = PB[b].rotation_quaternion; KEY[b]['rot'].append([q.x, q.y, q.z, q.w])
        if b == 'pelvis': KEY[b]['loc'].append(list(PB[b].location))
for b in order:
    for i in range(1, len(KEY[b]['rot'])):
        if sum(x * y for x, y in zip(KEY[b]['rot'][i], KEY[b]['rot'][i - 1])) < 0: KEY[b]['rot'][i] = [-x for x in KEY[b]['rot'][i]]
KEY = {b: v for b, v in KEY.items() if not b.startswith(('weapon_', 'armor_')) and not b.endswith(('_tip', '_grip1', '_grip2', '_grip_low'))}
json.dump({'fps': FPS, 'frames': nf, 'stride': None, 'seconds': SECS, 'bones': KEY, 'wdir': None}, open(out, 'w'))
print('CRAWLER', MODE, 'frames', nf, 'seconds', SECS, '->', out)
