# bloatmove.py -- RAW.glb walk|attack OUT.json : the Bloated's and the Bloater Queen's signature moves (owner, 21 Nov, W181: "Bloated and bloater queen has
# like no arms movement at all"; the move list of 14-ZOMBIE-MOVES.md, approved W190).
#   walk   (bloated_walk): today's waddle (legs, hips, belly roll) kept; the arms swing wide of the belly for balance, each arm forward with the other leg.
#   attack (bloated_attack): the belly slam: the arms thrown wide and up while the body rears back, then the whole body throws itself forward belly first,
#          the arms swinging round to the front as if to hug the target. ZH_KIND=queen: first one wide two-arm sweep across the front (the body twisting
#          with it), then the same slam; her clip is ZH_QSEC long (1.4 s).
# Hand-made, not a recording. Each arm is solved to a hand target round its shoulder (elbow towards a pole); the legs and body come from today's clip, so
# the feet stay where they were. The hips are lifted wherever a moment would put the body into the ground. Rig: +X left, -Y forward, +Z up.
import bpy, sys, os, math, json
from mathutils import Matrix, Vector
a = sys.argv[sys.argv.index('--') + 1:]; src, mode, out = a[0], a[1], a[2]
KIND = os.environ.get('ZH_KIND', 'bloated'); QSEC = float(os.environ.get('ZH_QSEC', 1.4)); SWING = float(os.environ.get('ZH_SWING', 1.0)); OUT = float(os.environ.get('ZH_OUT', .78))
bpy.ops.wm.read_factory_settings(use_empty=True); bpy.ops.import_scene.gltf(filepath=src)
ao = next(o for o in bpy.data.objects if o.type == 'ARMATURE'); body = bpy.data.objects['body']; PB = ao.pose.bones; W = ao.matrix_world; sc = bpy.context.scene
ad = ao.animation_data
for tr in ad.nla_tracks: tr.mute = True
clip = 'bloated_walk' if mode == 'walk' else 'bloated_attack'; old = bpy.data.actions[clip]; ad.action = old
try:
    if old.slots: ad.action_slot = old.slots[0]
except Exception: pass
for pb in PB: pb.rotation_mode = 'QUATERNION'
SUB = 2; f0, f1 = old.frame_range; fps = sc.render.fps
def upd(): bpy.context.view_layer.update()
def goto_t(u):   # u in 0..1 of the old clip
    t = f0 + u * (f1 - f0); sc.frame_set(int(t), subframe=t - int(t))
def sst(a_, b_, x): t = min(1., max(0., (x - a_) / max(1e-6, b_ - a_))); return t * t * (3 - 2 * t)
def wpos(n, tail=False): pb = PB[n]; return W @ (pb.tail if tail else pb.head)
def aim(name, to):   # point a bone from its head at a world point, by the smallest turn
    pb = PB[name]; M = W @ pb.matrix; h = M.translation.copy(); d0 = (M.to_3x3() @ Vector((0, 1, 0))).normalized(); d1 = (to - h).normalized()
    q = d0.rotation_difference(d1).to_matrix().to_4x4(); pb.matrix = W.inverted() @ Matrix.Translation(h) @ q @ Matrix.Translation(-h) @ M; upd()
def turn(name, axis, deg, about=None):   # turn a bone (and what hangs on it) about a world axis through `about` (default its head)
    if abs(deg) < .01: return
    pb = PB[name]; M = W @ pb.matrix; c = (about if about is not None else M.translation).copy()
    T = Matrix.Translation(c) @ Matrix.Rotation(math.radians(deg), 4, axis) @ Matrix.Translation(-c); pb.matrix = W.inverted() @ T @ M; upd()
SC = W.to_scale().x
def arm(side, d, frac, pole):   # the hand `frac` of the arm's reach from the shoulder along d, the elbow towards pole
    ua, fa, hd = 'upperarm.' + side, 'forearm.' + side, 'hand.' + side
    h = wpos(ua); l1 = PB[ua].length * SC; l2 = PB[fa].length * SC; n = Vector(d).normalized(); dd = max(abs(l1 - l2) * 1.05, min(frac, .995) * (l1 + l2))
    x = (l1 * l1 - l2 * l2 + dd * dd) / (2 * dd); hg = math.sqrt(max(l1 * l1 - x * x, 0)); p = Vector(pole); p = (p - n * p.dot(n)).normalized()
    aim(ua, h + n * x + p * hg); aim(fa, h + n * dd); aim(hd, wpos(hd) + (h + n * dd - wpos(fa)).normalized())
def lowest():
    dg = bpy.context.evaluated_depsgraph_get(); ev = body.evaluated_get(dg); m = ev.to_mesh(); z = min((ev.matrix_world @ v.co).z for v in m.vertices); ev.to_mesh_clear(); return z
def lift(dz):
    pb = PB['pelvis']; M = pb.matrix.copy(); M.translation = M.translation + W.inverted().to_3x3() @ Vector((0, 0, dz)); pb.matrix = M; upd()
def keys(K, t):   # smooth between keyframes [(t, value-tuple)], values blended per element
    for (ta, va), (tb, vb) in zip(K, K[1:]):
        if ta <= t <= tb: s = sst(ta, tb, t); return [x * (1 - s) + y * s for x, y in zip(va, vb)]
    return list(K[-1][1])
order = [b.name for b in PB]; KEY = {b: {'rot': [], 'loc': []} for b in order}
goto_t(0); base_low = lowest()   # the clip's own first moment is on the ground already (3D.244): keep every moment at or above it

if mode == 'walk':
    nf = int(round(f1 - f0)) * SUB; secs = (f1 - f0) / fps
    # how far each foot is forward over the cycle (to swing each arm with the other leg)
    FY = []
    for i in range(nf + 1): goto_t(i / nf); upd(); FY.append(wpos('foot.R').y - wpos('foot.L').y)
    m = max(abs(v) for v in FY) or 1
    for i in range(nf + 1):
        u = i / nf; goto_t(u); upd()
        s = FY[i] / m * SWING   # +1: the left foot is forward (-Y), so the right arm swings forward
        for side, sg, sw in (('L', 1, -s), ('R', -1, s)):
            d = (sg * OUT, -.55 * sw, -.80 + .18 * max(sw, 0)); arm(side, d, .90 - .05 * max(sw, 0), (sg * .7, .55, .1))
        lo = lowest()
        if lo < base_low - .002: lift(base_low - lo)
        for b in order:
            q = PB[b].rotation_quaternion; KEY[b]['rot'].append([q.x, q.y, q.z, q.w])
            if b == 'pelvis': KEY[b]['loc'].append(list(PB[b].location))
else:
    secs = QSEC if KIND == 'queen' else (f1 - f0) / fps; nf = int(round(secs * fps)) * SUB
    T0 = .40 if KIND == 'queen' else 0.   # the queen's sweep comes first; the slam is today's clip played in the rest of the time
    HANG = ((.78, 0, -.80), .9)
    # (t of the slam part, extra chest lean (+ forward), L dir, L reach, R dir, R reach, L pole, R pole)
    SLAM = [(0., (0, .78, 0, -.80, .90, -.78, 0, -.80, .90, .7, .5, -.2, -.7, .5, -.2)),
            (.30, (-12, .88, .42, .05, .97, -.88, .42, .05, .97, .3, .5, -.8, -.3, .5, -.8)),   # arms thrown wide and back at shoulder height, rearing back (higher drags the belly skin up with the arms: ~300 belly points carry some upper-arm weight)
            (.48, (14, .70, -.70, -.12, .97, -.70, -.70, -.12, .97, .9, .3, -.3, -.9, .3, -.3)),  # swinging round to the front, throwing forward
            (.60, (22, .40, -.90, -.25, .88, -.40, -.90, -.25, .88, 1., .2, -.3, -1., .2, -.3)),  # belly first, arms round the target
            (.74, (22, .40, -.90, -.25, .88, -.40, -.90, -.25, .88, 1., .2, -.3, -1., .2, -.3)),
            (1., (0, .78, 0, -.80, .90, -.78, 0, -.80, .90, .7, .5, -.2, -.7, .5, -.2))]
    # the queen's sweep: both arms out to her right (-X), the body turned that way, then swept across to her left and back to the hang
    SWEEP = [(0., (0, 0, .78, 0, -.80, .90, -.78, 0, -.80, .90, .7, .5, -.2, -.7, .5, -.2)),
             (.30, (-28, 4, -.25, -.85, -.05, .97, -.95, -.25, -.05, .97, .3, .4, .5, -.3, .6, .4)),
             (.75, (30, 6, .95, -.25, -.05, .97, .25, -.85, -.05, .97, .3, .6, .4, -.3, .4, .5)),
             (1., (0, 0, .78, 0, -.80, .90, -.78, 0, -.80, .90, .7, .5, -.2, -.7, .5, -.2))]
    for i in range(nf + 1):
        t = i / nf
        if t < T0:   # the sweep: the body stands on today's first pose, turning about the vertical
            k = keys(SWEEP, t / T0); goto_t(0); upd()
            turn('pelvis', 'Z', k[0] * .35); turn('chest', 'Z', k[0] * .65); turn('chest', 'X', k[1])
            arm('L', k[2:5], k[5], k[10:13]); arm('R', k[6:9], k[9], k[13:16])
        else:
            u = (t - T0) / (1 - T0); k = keys(SLAM, u); goto_t(u); upd()
            turn('chest', 'X', k[0])
            arm('L', k[1:4], k[4], k[9:12]); arm('R', k[5:8], k[8], k[12:15])
        lo = lowest()
        if lo < base_low - .002: lift(base_low - lo)
        for b in order:
            q = PB[b].rotation_quaternion; KEY[b]['rot'].append([q.x, q.y, q.z, q.w])
            if b == 'pelvis': KEY[b]['loc'].append(list(PB[b].location))
for b in order:
    if mode == 'walk': KEY[b]['rot'][-1] = KEY[b]['rot'][0]
    for i in range(1, len(KEY[b]['rot'])):
        if sum(x * y for x, y in zip(KEY[b]['rot'][i], KEY[b]['rot'][i - 1])) < 0: KEY[b]['rot'][i] = [-x for x in KEY[b]['rot'][i]]
    if mode == 'walk' and KEY[b]['loc']: KEY[b]['loc'][-1] = KEY[b]['loc'][0]
KEY = {b: v for b, v in KEY.items() if not b.startswith(('weapon_', 'armor_')) and not b.endswith(('_tip', '_grip1', '_grip2', '_grip_low'))}
json.dump({'fps': fps * SUB, 'frames': nf, 'stride': None, 'seconds': secs, 'bones': KEY, 'wdir': None}, open(out, 'w'))
print('BLOAT', KIND, mode, 'frames', nf, 'seconds', round(secs, 2), '->', out)
