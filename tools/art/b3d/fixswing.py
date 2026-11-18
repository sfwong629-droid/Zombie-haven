# fixswing.py -- RAW.glb CLIP OUT.json [OUT.npz]
# Keep an old hand-made melee swing (the owner prefers its force) and correct what is wrong with it:
#   1. the weapon, the hands and the elbows never enter the head (the weapon arm, then the other arm, are turned the least that clears it);
#   2. the weapon never goes into the ground;
#   3. the feet never sink below the ground (the hips are lifted as much as needed).
# Corrections are spread over neighbouring frames so nothing pops. Writes the clip for tools/art/inject_clips.mjs.
import bpy, sys, json, math, os, numpy as np
from mathutils import Matrix, Vector, Quaternion
a = sys.argv[sys.argv.index('--') + 1:]; src, clip, out = a[0], a[1], a[2]; dump = a[3] if len(a) > 3 else None
FREEARM = os.environ.get('ZH_FREEARM', '1') != '0'
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
_ax = np.argmax(np.ptp(batv, axis=0)); TIPI = int(batv[:, _ax].argmax()); GRIPI = int(batv[:, _ax].argmin())
def _fixtip():   # the tip is the end further from the hand
    global TIPI, GRIPI
    bpy.context.view_layer.update(); mw = np.array(bat.matrix_world); h = np.array((ao.matrix_world @ ao.pose.bones['hand.R'].head)[:]); e = [np.linalg.norm(mw[:3, :3] @ batv[i] + mw[:3, 3] - h) for i in (TIPI, GRIPI)]
    if e[0] < e[1]: TIPI, GRIPI = GRIPI, TIPI
_fixtip()
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
M_BAT = HEADR + float(os.environ.get('ZH_MBAT', '.055')); M_HAND = HEADR + float(os.environ.get('ZH_MHAND', '.06')); M_ELB = HEADR + float(os.environ.get('ZH_MELB', '.035'))
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
# ---- the free arm (owner, 18 Nov: "the arm that is not holding the weapon is still glitching ... make them look more natural").
# In the old swings the free fist jumps up in front of the chin and flings about. It is replaced by what a person's free arm does in a one-handed swing:
# it comes forward across the body as the weapon is drawn back, is pulled back to the hip as the blow lands (the counter-weight), then returns to the stance.
# Directions are in the chest's own frame (left, up, forward), so the arm follows the body's turn.
def nz(v): v = np.asarray(v, float); return v / max(np.linalg.norm(v), 1e-9)
def chest3(): return np.array(PB['chest'].matrix.to_3x3())   # columns: left, up (along the spine), forward
def larm_local():
    C = chest3(); u = nz(P(PB['upperarm.L'].tail) - P(PB['upperarm.L'].head)); f = nz(P(PB['forearm.L'].tail) - P(PB['forearm.L'].head)); W2A = np.array(ao.matrix_world.to_3x3()).T
    return (C.T @ (W2A @ u), C.T @ (W2A @ f))
L_WIND = (nz([.30, -.62, .72]), nz([-.42, .30, .86]))    # upper arm forward and down, forearm across the chest: the fist in front of the breastbone, below the chin
L_HIT = (nz([.38, -.80, -.46]), nz([.10, -.45, .88]))     # elbow drawn back, fist by the hip
def frame4(y, x, head):
    y = nz(y); x = nz(x - y * (x @ y)); z = np.cross(x, y); m = Matrix(np.stack([x, y, z], 1).tolist()).to_4x4(); m.translation = head; return m
HPREV = {}
def hinge_of(side, C, du, df, fr):   # 3D.204: the elbow's hinge is square to both arm bones; when the arm is nearly straight that is undefined and it used to
    # switch to a fixed axis all at once (an 84-degree flip in Swing 4). It now blends towards the last hinge as the arm straightens.
    if fr == 0 or side not in HPREV: HPREV[side] = -C[:, 0]
    n = np.cross(du, df); prev = HPREV[side]; prev = nz(prev - du * (prev @ du)); w = sst(.04, .22, float(np.linalg.norm(n))) * sst(-.05, .3, float(nz(n) @ prev))   # (3D.205) a bend the other way (the elbow backwards) keeps the last hinge; the hand-over is gradual
    h = nz(nz(n) * w + prev * (1 - w)) if w > 0 else prev; HPREV[side] = h
    if os.environ.get('ZH_DBG') and side == 'R' and fr is not None and 26 <= fr <= 44: print('HINGE', fr, '|n| %.2f n.prev %.2f w %.2f' % (np.linalg.norm(n), float(n @ prev), w), 'du', np.round(du, 2), 'df', np.round(df, 2), 'h', np.round(h, 2))
    return h
def set_larm(dirs, fr=None):
    C = chest3(); du = nz(C @ dirs[0]); df = nz(C @ dirs[1]); hinge = hinge_of('L', C, du, df, fr)
    pb = PB['upperarm.L']; pb.matrix = frame4(du, hinge, pb.matrix.translation.copy()); upd(); pb = PB['forearm.L']; pb.matrix = frame4(df, hinge, pb.matrix.translation.copy()); upd()
def set_arm(side, dirs, fr=None):   # upper arm and forearm along two directions given in the chest's frame
    C = chest3(); du = nz(C @ dirs[0]); df = nz(C @ dirs[1]); hinge = hinge_of(side, C, du, df, fr)
    pb = PB['upperarm.' + side]; pb.matrix = frame4(du, hinge, pb.matrix.translation.copy()); upd(); pb = PB['forearm.' + side]; pb.matrix = frame4(df, hinge, pb.matrix.translation.copy()); upd()
def batdir():
    upd(); mw = np.array(bat.matrix_world); return nz(mw[:3, :3] @ (batv[TIPI] - batv[GRIPI]))
def aim_bat(d):   # turn the hand so the weapon points along d (chest frame), by the shortest turn
    W2A = np.array(ao.matrix_world.to_3x3()).T; want = nz(chest3() @ nz(d)); cur = nz(W2A @ batdir()); ax = np.cross(cur, want); sn = np.linalg.norm(ax)
    if sn > 1e-6: turn('hand.R', ax / sn * math.atan2(sn, float(cur @ want)), PB['hand.R'].matrix.copy()); upd()
# ---- the rising cut (owner, 18 Nov: "can swing 3 be the bat start on the lower right and then swing upward across the body?"). ZH_RISE=1 replaces the
# weapon arm of the clip: the hand drops behind the right hip with the weapon pointing down and back, sweeps forward and up across the body and ends high
# on the left, the weapon pointing up over the left shoulder. The body (step, twist) is the old clip's. (upper arm, forearm, weapon) in the chest's frame.
RISE = os.environ.get('ZH_RISE', '0') == '1'
R_WOUND = (nz([-.45, -.80, -.40]), nz([-.25, -.90, -.20]), nz([-.30, -.70, -.65]))   # the elbow slightly bent forwards (3D.205: it bent backwards)
R_MID = (nz([-.25, -.75, .60]), nz([.15, -.25, .95]), nz([-.35, -.25, .90]))
R_END = (nz([.35, .55, .76]), nz([.70, .65, .30]), nz([.40, .88, -.25]))
def gslerp(a, b, u):   # along the great circle from direction a to direction b
    a = nz(a); b = nz(b); c = float(np.clip(a @ b, -1, 1)); th = math.acos(c)
    if th < 1e-4: return a
    return nz((math.sin((1 - u) * th) * a + math.sin(u * th) * b) / math.sin(th))
def gpath(keys, u):   # through several directions in turn (so no step is ever between two nearly opposite directions)
    n = len(keys) - 1; x = min(n - 1e-9, max(0., u * n)); i = int(x); return gslerp(keys[i], keys[i + 1], x - i)
# the wind-up goes round, not straight: the bat tips back over the shoulder, then drops behind the hip (3D.205: a straight blend flipped the arm 144 degrees)
R_PRE = (nz([-.30, -.92, .10]), nz([-.20, -.80, .55]), nz([-.20, .30, -.93]))
def rarm_at(fr):
    a0, a1 = RARM[0], RARM[-1]; kB = T_S - 2 * SUB; kE = T_S + 2 * SUB; w1 = sst(T_W * .15, min(T_W, kB - 1), fr); u = min(1., max(0., (fr - kB) / (kE - kB))); u = u ** 1.5; w3 = sst(kE + (nf - kE) * .3, nf, fr); out = []
    for k in (0, 1, 2):
        d = gpath([a0[k], R_PRE[k], R_WOUND[k]], w1)
        if u > 0: d = nz(R_WOUND[k] * (1 - u) ** 2 + R_MID[k] * 2 * u * (1 - u) * 1.6 + R_END[k] * u * u)
        d = gslerp(d, a1[k], w3); out.append(d)
    return out
HQ = {}
def set_rarm(fr):   # the hand starts from its last turn, so aiming the weapon is always a small step (3D.205: aiming from scratch flipped the hand 200 degrees)
    d = rarm_at(fr); set_arm('R', d[:2], fr)
    if fr and 'q' in HQ: PB['hand.R'].rotation_quaternion = HQ['q']; upd()
    aim_bat(d[2]); HQ['q'] = PB['hand.R'].rotation_quaternion.copy()
def rarm_local():
    C = chest3(); W2A = np.array(ao.matrix_world.to_3x3()).T; u = nz(P(PB['upperarm.R'].tail) - P(PB['upperarm.R'].head)); f = nz(P(PB['forearm.R'].tail) - P(PB['forearm.R'].head)); return (C.T @ (W2A @ u), C.T @ (W2A @ f), C.T @ (W2A @ batdir()))
def sst(a, b, x): t = min(1., max(0., (x - a) / max(1e-6, b - a))); return t * t * (3 - 2 * t)
RH = []; LARM = []; RARM = []
# 3D.204 (owner, 18 Nov: "the left arm is the same issue"): the old swings start with the free arm 46 to 60 degrees away from the stance (the game blends it
# across in 0.12 s) and end another 55 to 75 degrees away (a one-frame snap whenever a swing follows a swing). The free arm now starts and ends exactly in
# the stance (melee_hold_idle, first frame), roll included.
STANCE = os.environ.get('ZH_STANCE', 'melee_hold_idle'); _st = bpy.data.actions[STANCE]; ad.action = _st
try:
    if _st.slots: ad.action_slot = _st.slots[0]
except Exception: pass
sc.frame_set(int(_st.frame_range[0])); upd()
# 3D.205: the game's stance is the recorded standing body (3D.194), which is not in RAW.glb: ZH_STANCE_JSON (from dumpstance.py on the game's file) gives it
SJ = json.load(open(os.environ['ZH_STANCE_JSON'])) if os.environ.get('ZH_STANCE_JSON') else None
if SJ:
    ad.action = None
    for b in order: PB[b].rotation_quaternion = Quaternion(SJ[b]['rot']); PB[b].location = Vector(SJ[b]['loc'])
    upd()
STL = larm_local(); STQ = {b: PB[b].rotation_quaternion.copy() for b in ('upperarm.L', 'forearm.L', 'hand.L', 'fingers.L')}
STALL = {b: (PB[b].rotation_quaternion.copy(), PB[b].location.copy()) for b in order}
ad.action = old
try:
    if old.slots: ad.action_slot = old.slots[0]
except Exception: pass
def stance_lock(t):   # 1 at the clip's two ends, 0 in the swing
    tW = TT0[T_W]; Tc = TT0[-1]; return max(1 - sst(0, max(.08, tW * .45), t), sst(Tc - max(.12, (Tc - TT0[T_S]) * .35), Tc, t))
def lock_all(fr):   # 3D.205: the whole body starts and ends in the game's stance
    w = stance_lock(TT0[fr])
    if w <= 0: return
    for b, (q0, l0) in STALL.items():
        q = PB[b].rotation_quaternion.copy()
        if q.dot(q0) < 0: q.negate()
        PB[b].rotation_quaternion = q.slerp(q0, w)
        if b in ('pelvis', 'gun'): PB[b].location = PB[b].location.lerp(l0, w)
    upd()
def lock_larm(fr):
    w = stance_lock(TT0[fr])
    if w <= 0: return
    for b, q0 in STQ.items():
        q = PB[b].rotation_quaternion.copy()
        if q.dot(q0) < 0: q.negate()
        PB[b].rotation_quaternion = q.slerp(q0, w)
    upd()
for fr in range(nf + 1): goto(fr); upd(); RH.append(P(PB['hand.R'].tail) - P(PB['chest'].head)); LARM.append(larm_local()); RARM.append(rarm_local())
RHa = np.array(RH); _v = np.linalg.norm(np.diff(RHa, axis=0), axis=1); _v = np.convolve(np.pad(_v, 3, mode='edge'), np.ones(7) / 7, 'valid'); T_S = int(_v.argmax()); T_W = int(max(3, _v[int(nf * .12):max(int(nf * .12) + 1, T_S - 2)].argmin() + int(nf * .12)))
print('KEYS wind-up', T_W, 'strike', T_S, 'of', nf)
# ---- pass 1: the turn each frame needs
RV = {'upperarm.R': np.zeros((nf + 1, 3)), 'upperarm.L': np.zeros((nf + 1, 3))}; before = []
for fr in range(nf + 1):
    goto(fr); m = meas(); before.append(m)
    if RISE: upd(); set_rarm(fr)
    for bone, viol in (('upperarm.R', violR),) + (() if FREEARM else (('upperarm.L', violL),)):
        RV[bone][fr] = solve(bone, viol, RV[bone][fr - 1] if fr else np.zeros(3))
    if RISE and os.environ.get('ZH_DBG') and 28 <= fr <= 40: m2 = meas(); print('DBG', fr, 'rv %.0f' % np.degrees(np.linalg.norm(RV['upperarm.R'][fr])), {k: round(v, 2) for k, v in m2.items()}, 'hand', np.round(P(PB['hand.R'].tail), 2), 'bat', np.round(batdir(), 2), 'chestF', np.round(chest3()[:, 2], 2), 'up', np.round(chest3()[:, 1], 2))
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
def larm_at(fr):
    # 3D.204 (owner: "the left arm is the same issue"): timed in real seconds, after the blow has been re-spread, and never over less than 0.42 s
    a0 = a1 = STL; t = TT0[fr]; tW = TT0[T_W]; tS = TT0[T_S]; Tc = TT0[-1]; e2 = min(Tc - .1, tS + .16); w1 = sst(tW * .2, tW, t); w2 = sst(min(tW, tS - .26), e2, t); w3 = sst(e2 + (Tc - e2) * .2, Tc, t); out = []
    for k in (0, 1):
        d = nz(a0[k] * (1 - w1) + L_WIND[k] * w1); d = nz(d * (1 - w2) + L_HIT[k] * w2); d = nz(d * (1 - w3) + a1[k] * w3); out.append(d)
    return out
RV0 = {b: RV[b].copy() for b in RV}
for b in RV:   # even out the turn over time (the search works in 4-degree steps, which would shake the arm)
    A = np.pad(RV[b], ((3, 3), (0, 0)), mode='edge'); RV[b] = sum(A[k:k + nf + 1] * w for k, w in enumerate([1, 2, 3, 4, 3, 2, 1])) / 16
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
OMEGA = float(os.environ.get('ZH_OMEGA', '1150')); VHAND = float(os.environ.get('ZH_VHAND', '5.5')); Tclip = nf / fps / SUB
VLEFT = float(os.environ.get('ZH_VLEFT', '99'))   # 3D.204: the free hand too (the body's own twist threw it across in two frames)
def retime(BATD, HANDP, HANDL=None):
    dth = np.degrees(np.arccos(np.clip((np.array(BATD[1:]) * np.array(BATD[:-1])).sum(1), -1, 1))); dh = np.linalg.norm(np.diff(np.array(HANDP), axis=0), axis=1)
    need = np.maximum(dth / OMEGA, dh / VHAND)
    if HANDL is not None: need = np.maximum(need, np.linalg.norm(np.diff(np.array(HANDL), axis=0), axis=1) / VLEFT)
    base_ = np.full(nf, Tclip / nf); tau = base_.copy()
    capped = np.zeros(nf, bool)
    for _ in range(200):
        newc = (need > tau + 1e-12) & ~capped
        if not newc.any(): break
        capped |= newc; free = ~capped; left = Tclip - need[capped].sum()
        if left <= 0 or not free.any(): tau = need * (Tclip / need.sum()); break
        tau[capped] = need[capped]; tau[free] = base_[free] * left / base_[free].sum()
    for _ in range(2):   # ease into and out of the fast part: no moment may be much shorter than its neighbours
        ts = np.convolve(np.pad(tau, 3, mode='edge'), np.array([1, 2, 3, 4, 3, 2, 1]) / 16, 'valid'); tau = np.maximum(tau, ts * .92)
    tt = np.concatenate([[0], np.cumsum(tau)]); tt *= Tclip / tt[-1]; return tt, dth, dh, need, base_
_B = []; _H = []; _C = []   # a first run through the corrected weapon arm, only to learn the timing (the free arm is timed in real seconds)
for fr in range(nf + 1):
    goto(fr); upd()
    if lift[fr] > 1e-4: m = PB['pelvis'].matrix.copy(); m.translation.z += lift[fr]; PB['pelvis'].matrix = m; upd()
    if RISE: set_rarm(fr)
    turn('upperarm.R', RV['upperarm.R'][fr], PB['upperarm.R'].matrix.copy()); upd(); _B.append(batdir()); _H.append(P(PB['hand.R'].tail)); _C.append((chest3().copy(), P(PB['chest'].head))); _L0 = P(PB['hand.L'].tail) if fr == 0 else _L0
TT0 = retime(_B, _H, [c[0] @ (_C[0][0].T @ (_L0 - _C[0][1])) + c[1] for c in _C])[0]
new = bpy.data.actions.new(clip + '_fix'); frames = []; BATD = []; HANDP = []; HANDL = []; SHL = []; CHM = []; _l = batv @ np.array([0, 0, 0.]) if False else None
for fr in range(nf + 1):
    goto(fr); upd()
    if lift[fr] > 1e-4: m = PB['pelvis'].matrix.copy(); m.translation.z += lift[fr]; PB['pelvis'].matrix = m; upd()
    if FREEARM: set_larm(larm_at(fr), fr); lock_larm(fr)
    if RISE: set_rarm(fr)
    for bone, viol in (('upperarm.R', violR),) + ((() if FREEARM else (('upperarm.L', violL),))):
        base = PB[bone].matrix.copy(); turn(bone, RV[bone][fr], base); m = meas()
        if viol(m) > 0:   # the hips were lifted since pass 1: solve again from the same turn
            ok_ = False
            for k_ in (1.1, 1.2, 1.35, 1.5):   # a little more of the same turn, before searching afresh
                turn(bone, RV[bone][fr] * k_, base)
                if viol(meas()) == 0: ok_ = True; break
            if not ok_: turn(bone, np.zeros(3), base); upd(); rv = solve(bone, viol, RV0[bone][fr]); turn(bone, rv, base); upd()
    if SJ: lock_all(fr)
    after.append(meas()); frames.append({b: (PB[b].rotation_quaternion.copy(), PB[b].location.copy()) for b in order})
    _mw = np.array(bat.matrix_world); _bv2 = batv @ _mw[:3, :3].T + _mw[:3, 3]; BATD.append(nz(_bv2[TIPI] - _bv2[GRIPI])); HANDP.append(P(PB['hand.R'].tail)); HANDL.append(P(PB['hand.L'].tail)); SHL.append(P(PB['upperarm.L'].head)); CHM.append((chest3().copy(), P(PB['chest'].head)))
# ---- timing (owner, 18 Nov, video: "the right arm is still teleporting"): going round the head is a longer way than going through it, and the old clip gave the
# blow only two or three frames, so the weapon jumped from behind the back to the front. Time is moved from the still part of the wind-up to the blow:
# the weapon may turn at most OMEGA degrees a second and the hand move at most VHAND units a second; the clip keeps its length.
tt, dth, dh, need, base_ = retime(BATD, HANDP, HANDL)
def pose_at(t):
    k = int(min(nf - 1, max(0, np.searchsorted(tt, t, side='right') - 1))); u = 0 if tt[k + 1] == tt[k] else (t - tt[k]) / (tt[k + 1] - tt[k]); out = {}
    for b in order:
        qa, la = frames[k][b]; qb, lb = frames[k + 1][b]; qb = qb.copy()
        if qa.dot(qb) < 0: qb.negate()
        out[b] = (qa.slerp(qb, u), la.lerp(lb, u))
    return out
print('DIAG total turn %.0f deg, need.sum %.2f s of %.2f, hand path %.2f, segs' % (dth.sum(), need.sum(), Tclip, dh.sum()), np.round(dth / base_)[::2].astype(int).tolist())
print('TIMING weapon turn before: fastest %.0f deg/s; after: %.0f deg/s | the blow (turn over 400 deg/s) lasted %.2f s, now %.2f s' % ((dth / base_).max(), (dth / np.diff(tt)).max(), base_[dth / base_ > 400].sum(), np.diff(tt)[dth / np.diff(tt) > 400].sum()))
print('LEFT hand fastest %.2f units/s (was timed over %.2f s)' % ((np.linalg.norm(np.diff(np.array(HANDL), axis=0), axis=1) / np.diff(tt)).max(), min(Tclip - .1, TT0[T_S] + .16) - min(TT0[T_W], TT0[T_S] - .26)))
_dt = np.diff(tt); _sp = lambda A: np.linalg.norm(np.diff(np.array(A), axis=0), axis=1) / _dt
_rig = [CHM[i][0] @ (CHM[0][0].T @ (HANDL[0] - CHM[0][1])) + CHM[i][1] for i in range(nf + 1)]   # the left hand if the arm were frozen to the chest
_k = int(_sp(HANDL).argmax()); print('LEFT detail: hand %.2f at t=%.2f s; shoulder max %.2f; hand-if-frozen-to-chest max %.2f; strike t=%.2f' % (_sp(HANDL).max(), tt[_k], _sp(SHL).max(), _sp(_rig).max(), tt[T_S]))
print('LEFT speeds /10', (np.array(_sp(HANDL)) * 10).round().astype(int)[::2].tolist()); print('FROZ speeds /10', (np.array(_sp(_rig)) * 10).round().astype(int)[::2].tolist())
frames2 = [pose_at(Tclip * i / nf) for i in range(nf + 1)]; frames = frames2
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
    res = {'tex': px, 'bones': np.array(order)}; N = int(os.environ.get('ZH_N', '11'))
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
