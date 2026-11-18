# fixswing.py -- RAW.glb CLIP OUT.json [OUT.npz]
# Keep an old hand-made melee swing (the owner prefers its force) and correct what is wrong with it:
#   1. the weapon, the hands and the elbows never enter the head (the weapon arm, then the other arm, are turned the least that clears it);
#   2. the weapon never goes into the ground;
#   3. the feet never sink below the ground (the hips are lifted as much as needed).
# Corrections are spread over neighbouring frames so nothing pops. Writes the clip for tools/art/inject_clips.mjs.
import bpy, sys, json, math, os, numpy as np
from mathutils import Matrix, Vector, Quaternion
a = sys.argv[sys.argv.index('--') + 1:]; src, clip, out = a[0], a[1], a[2]; dump = a[3] if len(a) > 3 else None
GROUND = .012   # (the head clearances are set below, from the head's measured size)
bpy.ops.wm.read_factory_settings(use_empty=True); bpy.ops.import_scene.gltf(filepath=src)
ao = next(o for o in bpy.data.objects if o.type == 'ARMATURE'); body = bpy.data.objects['body']; bat = bpy.data.objects['weapon_bat']; PB = ao.pose.bones
ad = ao.animation_data
for tr in ad.nla_tracks: tr.mute = True
old = bpy.data.actions[clip]; ad.action = old
try:
    if old.slots: ad.action_slot = old.slots[0]
except Exception: pass
SUB = int(os.environ.get('ZH_SUB', '3'))   # keys per old frame: the weapon moves fast, and between two coarse frames it could still cross the head
f0, f1 = old.frame_range; fps = bpy.context.scene.render.fps; nf = int(round(f1 - f0)) * SUB; sc = bpy.context.scene
def goto(fr): t = f0 + fr / SUB; sc.frame_set(int(t), subframe=t - int(t))
bat.data.calc_loop_triangles(); _bv = np.array([v.co[:] for v in bat.data.vertices]); _bt = _bv[np.array([t.vertices[:] for t in bat.data.loop_triangles])]
batv = np.concatenate([_bv, _bt.mean(1), (_bt[:, 0] + _bt[:, 1]) / 2, (_bt[:, 1] + _bt[:, 2]) / 2, (_bt[:, 0] + _bt[:, 2]) / 2])   # the weapon's surface, sampled as the check samples it (its triangles are long)
order = [b.name for b in ao.data.bones]
def upd(): bpy.context.view_layer.update()
# the head as tools/art/b3d/weapdump.py (the independent check) sees it: the middle of the vertices that follow the head bone, and their median distance from it
_gi = body.vertex_groups['head'].index; _hv = [v.co.copy() for v in body.data.vertices if any(g.group == _gi and g.weight > .6 for g in v.groups)]
_c = sum(_hv, Vector()) / len(_hv); HEADR = float(np.median([(v - _c).length for v in _hv])); HCL = ao.data.bones['head'].matrix_local.inverted() @ (ao.matrix_world.inverted() @ (body.matrix_world @ _c))
def P(v): return np.array((ao.matrix_world @ v)[:])
def meas():
    upd(); hc = P(PB['head'].matrix @ HCL)
    mw = np.array(bat.matrix_world); bv = batv @ mw[:3, :3].T + mw[:3, 3]
    d = lambda p: float(np.linalg.norm(p - hc))
    return {'bat': float(np.linalg.norm(bv - hc, axis=1).min()), 'low': float(bv[:, 2].min()),
            'hR': min(d(P(PB['hand.R'].head)), d(P(PB['hand.R'].tail)), d(P(PB['fingers.R'].tail))), 'eR': d(P(PB['forearm.R'].head)),
            'hL': min(d(P(PB['hand.L'].head)), d(P(PB['hand.L'].tail)), d(P(PB['fingers.L'].tail))), 'eL': d(P(PB['forearm.L'].head))}
M_BAT = HEADR + float(os.environ.get('ZH_MBAT', '.05')); M_HAND = HEADR + float(os.environ.get('ZH_MHAND', '.045')); M_ELB = HEADR + float(os.environ.get('ZH_MELB', '.035'))
def violR(m): return max(0, M_BAT - m['bat']) + max(0, M_HAND - m['hR']) + max(0, M_ELB - m['eR']) + max(0, GROUND - m['low'])
def violL(m): return max(0, M_HAND - m['hL']) + max(0, M_ELB - m['eL'])
def turn(bone, rv, base):   # turn a bone about its own head by the rotation vector rv (world axes), starting from its matrix `base`
    ang = float(np.linalg.norm(rv)); pb = PB[bone]
    if ang < 1e-6: pb.matrix = base; return
    R = Matrix.Rotation(ang, 4, Vector(rv / ang)); h = base.translation.copy(); m = R @ base; m.translation = h; pb.matrix = m
DIRS = [np.array(v, float) / np.linalg.norm(v) for v in [(1,0,0),(-1,0,0),(0,1,0),(0,-1,0),(0,0,1),(0,0,-1),(1,1,0),(1,-1,0),(-1,1,0),(-1,-1,0),(1,0,1),(1,0,-1),(-1,0,1),(-1,0,-1),(0,1,1),(0,1,-1),(0,-1,1),(0,-1,-1)]]
STEP = math.radians(4)
def solve(bone, viol, prev):
    """The turn for this moment, starting from the last moment's turn: if that no longer clears the head, the nearest turn that does; then it relaxes
    towards no turn at all, but only through turns that stay clear, so the arm slides round the head and never cuts back through it."""
    base = PB[bone].matrix.copy(); rv = prev.copy()
    def v(r): turn(bone, r, base); return viol(meas())
    if v(rv) > 0:
        found = None
        for k in range(1, 24):
            c = [rv + d * STEP * k for d in DIRS]; c = [r for r in c if v(r) == 0]
            if c: found = min(c, key=np.linalg.norm); break
        rv = found if found is not None else rv
    for _ in range(10):
        if np.linalg.norm(rv) < 1e-6: break
        c = [rv * .8] + [rv + d * STEP for d in DIRS]; c = [r for r in c if np.linalg.norm(r) < np.linalg.norm(rv) - 1e-6 and v(r) == 0]
        if not c: break
        rv = min(c, key=np.linalg.norm)
    if np.linalg.norm(rv) < math.radians(2) and v(np.zeros(3)) == 0: rv = np.zeros(3)
    turn(bone, np.zeros(3), base); upd(); return rv
# ---- pass 1: the turn each frame needs
RV = {'upperarm.R': np.zeros((nf + 1, 3)), 'upperarm.L': np.zeros((nf + 1, 3))}; before = []
for fr in range(nf + 1):
    goto(fr); m = meas(); before.append(m)
    for bone, viol in (('upperarm.R', violR), ('upperarm.L', violL)):
        RV[bone][fr] = solve(bone, viol, RV[bone][fr - 1] if fr else np.zeros(3))
# ---- spread each turn over the frames around it
def spread(A):
    n = len(A); B = A.copy(); W = [(1, .7), (2, .4), (3, .15)]
    for i in range(n):
        if np.linalg.norm(A[i]) > 0: continue
        acc = np.zeros(3)
        for k, w in W:
            for j in (i - k, i + k):
                if 0 <= j < n and np.linalg.norm(A[j]) > 0 and np.linalg.norm(A[j]) * w > np.linalg.norm(acc): acc = A[j] * w
        B[i] = acc
    return B
pass   # (no spreading needed: each moment's turn starts from the one before)
# ---- pass 2: apply, lift the hips where the feet sink, read the finished pose
me = body.data; restlow = None; KEY = {b: {'rot': [], 'loc': []} for b in order}; after = []; lows = []
def bodylow():
    dg = bpy.context.evaluated_depsgraph_get(); ev = body.evaluated_get(dg); m = ev.to_mesh(); z = min((ev.matrix_world @ v.co)[2] for v in m.vertices); ev.to_mesh_clear(); return z
sc.frame_set(int(f0)); ad.action = None
for pb in PB: pb.rotation_quaternion = Quaternion(); pb.location = Vector()
upd(); restlow = bodylow(); ad.action = old
try:
    if old.slots: ad.action_slot = old.slots[0]
except Exception: pass
for fr in range(nf + 1):
    goto(fr); upd(); lows.append(bodylow())
lift = np.array([max(0., restlow - z) for z in lows]); lift = np.array([max(lift[max(0, i - SUB):i + SUB + 1]) for i in range(len(lift))]); k_ = 2 * SUB + 1; lift = np.convolve(np.pad(lift, SUB, mode='edge'), np.ones(k_) / k_, 'valid')
new = bpy.data.actions.new(clip + '_fix'); frames = []
for fr in range(nf + 1):
    goto(fr); upd()
    if lift[fr] > 1e-4: m = PB['pelvis'].matrix.copy(); m.translation.z += lift[fr]; PB['pelvis'].matrix = m; upd()
    for bone, viol in (('upperarm.R', violR), ('upperarm.L', violL)):
        base = PB[bone].matrix.copy(); turn(bone, RV[bone][fr], base); m = meas()
        if viol(m) > 0:   # the hips were lifted since pass 1: solve again from the same turn
            turn(bone, np.zeros(3), base); upd(); rv = solve(bone, viol, RV[bone][fr]); turn(bone, rv, base); upd()
    after.append(meas()); frames.append({b: (PB[b].rotation_quaternion.copy(), PB[b].location.copy()) for b in order})
prevq = {}
ad.action = new
for fr in range(nf + 1):
    for b in order:
        q, l = frames[fr][b]; pb = PB[b]
        if b in prevq and q.dot(prevq[b]) < 0: q.negate()
        prevq[b] = q; pb.rotation_quaternion = q; pb.keyframe_insert('rotation_quaternion', frame=fr); KEY[b]['rot'].append([q.x, q.y, q.z, q.w])
        if b in ('pelvis', 'gun'): pb.location = l; pb.keyframe_insert('location', frame=fr); KEY[b]['loc'].append(list(l))
try: fcs = list(new.fcurves)
except Exception: fcs = [fc for l in new.layers for st in l.strips for cb in st.channelbags for fc in cb.fcurves]
for fc in fcs:
    for kp in fc.keyframe_points: kp.interpolation = 'LINEAR'
json.dump({'fps': fps * SUB, 'frames': nf, 'stride': 0, 'seconds': nf / fps / SUB, 'bones': KEY}, open(out, 'w'))
g = lambda L, k: [round(x[k], 3) for x in L]
print('RESULT', clip, 'frames', nf + 1, '| weapon-head before min %.3f after min %.3f | right hand %.3f -> %.3f | left hand %.3f -> %.3f | elbows %.3f -> %.3f | weapon lowest %.3f -> %.3f | hips lifted up to %.3f | frames turned R %d L %d' % (
    min(g(before, 'bat')), min(g(after, 'bat')), min(g(before, 'hR')), min(g(after, 'hR')), min(g(before, 'hL')), min(g(after, 'hL')), min(min(g(before, 'eR')), min(g(before, 'eL'))), min(min(g(after, 'eR')), min(g(after, 'eL'))),
    min(g(before, 'low')), min(g(after, 'low')), lift.max(), int((np.linalg.norm(RV['upperarm.R'], axis=1) > 0).sum()), int((np.linalg.norm(RV['upperarm.L'], axis=1) > 0).sum())))
if dump:   # old and new, body + bat, for wstrips.py
    me.calc_loop_triangles(); tri = np.array([t.vertices[:] for t in me.loop_triangles]); tl = np.array([t.loops[:] for t in me.loop_triangles]); uv = np.array([d.uv[:] for d in me.uv_layers[0].data])[tl]
    img = next(i for i in bpy.data.images if i.size[0] > 0 and len(i.pixels)); Wd, Hd = img.size; px = (np.array(img.pixels[:]).reshape(Hd, Wd, 4)[:, :, :3] * 255).astype(np.uint8); px[0:3, 0:3] = (70, 70, 75)
    wm = bat.data; wm.calc_loop_triangles(); wt = np.array([t.vertices[:] for t in wm.loop_triangles]) + len(me.vertices)
    res = {'tex': px, 'bones': np.array(order)}; N = 11
    for nm, act, fa, fb in ((clip, old, f0, f1), (clip + '_fix', new, 0, nf)):
        if act is new: sc.render.fps = fps * SUB
        ad.action = act
        try:
            if act.slots: ad.action_slot = act.slots[0]
        except Exception: pass
        V = []; J = []
        for i in range(N):
            fr = fa + (fb - fa) * i / (N - 1); sc.frame_set(int(fr), subframe=fr - int(fr)); dg = bpy.context.evaluated_depsgraph_get(); ev = body.evaluated_get(dg); m = ev.to_mesh()
            vv = np.array([(ev.matrix_world @ v.co)[:] for v in m.vertices], np.float32); ev.to_mesh_clear(); mw = bat.evaluated_get(dg).matrix_world
            V.append(np.concatenate([vv, np.array([(mw @ x.co)[:] for x in wm.vertices], np.float32)])); J.append(np.array([list(P(pb.head)) + list(P(pb.tail)) for pb in PB], np.float32))
        res['V:' + nm] = np.array(V); res['J:' + nm] = np.array(J); res['F:' + nm] = np.array([fa, fb, fps * (SUB if act is new else 1)]); res['T:' + nm] = np.concatenate([tri, wt]); res['U:' + nm] = np.concatenate([uv, np.zeros((len(wt), 3, 2)) + .0005])
    np.savez_compressed(dump, **res)
