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
AXV = batv.copy()   # the bat's own points: they give the weapon's line (tip, grip) even when the clearances use other weapons
# 3D.207: the real weapons (ZH_GEAR = the decompressed gear_weapons.glb, ZH_GEARW = sledge,axe,... ): each is placed on the bat as the game places it
# (js/render3d.js fitGear: its position relative to the bat in the rest pose), and the head and body clearances use all of them at once.
SPEAR_SHIFT = float(os.environ.get('ZH_SPEAR_SHIFT', '.25'))
if os.environ.get('ZH_GEAR'):
    _before = set(bpy.data.objects); bpy.ops.import_scene.gltf(filepath=os.environ['ZH_GEAR']); _new = [o for o in bpy.data.objects if o not in _before]
    ao.data.pose_position = 'REST'; bpy.context.view_layer.update(); _Wb = bat.matrix_world.copy(); _G = []
    for _k in os.environ.get('ZH_GEARW', 'sledge').split(','):
        _o = bpy.data.objects['gw_' + _k]; _o.data.calc_loop_triangles(); _R = (Matrix.Translation((0, -SPEAR_SHIFT, 0)) if _k == 'spear' else Matrix()) @ _Wb.inverted() @ _o.matrix_world   # (3D.212) the spear held near its end, as js/render3d.js fitGear does
        _gv = np.array([(_R @ v.co)[:] for v in _o.data.vertices]); _gt = _gv[np.array([t.vertices[:] for t in _o.data.loop_triangles])]
        _G.append(np.concatenate([_gv, _gt.mean(1), (_gt[:, 0] + _gt[:, 1]) / 2, (_gt[:, 1] + _gt[:, 2]) / 2, (_gt[:, 0] + _gt[:, 2]) / 2]))
    ao.data.pose_position = 'POSE'; bpy.context.view_layer.update()
    for _o in _new: bpy.data.objects.remove(_o, do_unlink=True)
    batv = np.concatenate(_G); print('GEAR', os.environ.get('ZH_GEARW'), len(batv), 'points')
def _fixtip():   # the tip is the end further from the hand
    global TIPI, GRIPI
    bpy.context.view_layer.update(); mw = np.array(bat.matrix_world); h = np.array((ao.matrix_world @ ao.pose.bones['hand.R'].head)[:]); e = [np.linalg.norm(mw[:3, :3] @ AXV[i] + mw[:3, 3] - h) for i in (TIPI, GRIPI)]
    if e[0] < e[1]: TIPI, GRIPI = GRIPI, TIPI
_fixtip()
order = [b.name for b in ao.data.bones]
def upd(): bpy.context.view_layer.update()
# the head as tools/art/b3d/weapdump.py (the independent check) sees it: the middle of the vertices that follow the head bone, and their median distance from it
_gi = body.vertex_groups['head'].index; _hv = [v.co.copy() for v in body.data.vertices if any(g.group == _gi and g.weight > .6 for g in v.groups)]
_c = sum(_hv, Vector()) / len(_hv); HEADR = float(np.median([(v - _c).length for v in _hv])); HCL = ao.data.bones['head'].matrix_local.inverted() @ (ao.matrix_world.inverted() @ (body.matrix_world @ _c))
def P(v): return np.array((ao.matrix_world @ v)[:])
MEAS_RAW = [False]
# 3D.206 (owner, 18 Nov: "the weapons are not going through the head or body correct?"): the body as one rounded tube per bone, as thick as the model there
# (the 80th percentile distance of the bone's own vertices from it, in the rest pose). The weapon must stay out of all of them, except within 9 cm of the
# gripping hand (the fist closes round the handle; tools/art/b3d/bodyhit.py, the independent check, skips the same zone).
CAPS = ('pelvis', 'chest', 'thigh.L', 'thigh.R', 'shin.L', 'shin.R', 'upperarm.L', 'forearm.L', 'upperarm.R', 'forearm.R')
_mw = body.matrix_world; CAPR = {}
for _b in CAPS:
    _gi2 = body.vertex_groups[_b].index; _bb = ao.data.bones[_b]; _h = np.array((ao.matrix_world @ _bb.head_local)[:]); _t = np.array((ao.matrix_world @ _bb.tail_local)[:])
    _vs = np.array([(_mw @ v.co)[:] for v in body.data.vertices if any(g.group == _gi2 and g.weight > .6 for g in v.groups)])
    _u = np.clip(((_vs - _h) @ (_t - _h)) / max(1e-9, (_t - _h) @ (_t - _h)), 0, 1); CAPR[_b] = float(np.percentile(np.linalg.norm(_vs - (_h + _u[:, None] * (_t - _h)), axis=1), 80))
print('CAPSULES', {k: round(v, 3) for k, v in CAPR.items()})
WORSTB = ['']
def segd(Pts, h, t):
    u = np.clip(((Pts - h) @ (t - h)) / max(1e-9, (t - h) @ (t - h)), 0, 1); return np.linalg.norm(Pts - (h + u[:, None] * (t - h)), axis=1)
def meas():
    if TWO and PLFR[0] is not None and not MEAS_RAW[0]: place_left()
    upd(); hc = P(PB['head'].matrix @ HCL)
    mw = np.array(bat.matrix_world); bv = batv @ mw[:3, :3].T + mw[:3, 3]
    d = lambda p: float(np.linalg.norm(p - hc))
    hr = P(PB['hand.R'].tail); farm = np.linalg.norm(bv - hr, axis=1) > .09
    if TWO: farm &= np.linalg.norm(bv - P(PB['hand.L'].tail), axis=1) > .09
    far = bv[farm]; bod = 9.; own = 9.
    if len(far):
        for _b in CAPS:
            c_ = float(segd(far, P(PB[_b].head), P(PB[_b].tail)).min()) - CAPR[_b]
            if _b in ('upperarm.R', 'forearm.R') or (TWO and _b in ('upperarm.L', 'forearm.L')): own = min(own, c_)   # the weapon arm itself: only the wrist can clear it
            else:
                if c_ < bod: WORSTB[0] = _b
                bod = min(bod, c_)
    return {'bat': float(np.linalg.norm(bv - hc, axis=1).min()), 'low': float(bv[:, 2].min()), 'body': bod, 'own': own,
            'hR': min(d(P(PB['hand.R'].head)), d(P(PB['hand.R'].tail)), d(P(PB['fingers.R'].tail))), 'eR': d(P(PB['forearm.R'].head)),
            'hL': min(d(P(PB['hand.L'].head)), d(P(PB['hand.L'].tail)), d(P(PB['fingers.L'].tail))), 'eL': d(P(PB['forearm.L'].head))}
M_BAT = HEADR + float(os.environ.get('ZH_MBAT', '.055')); M_HAND = HEADR + float(os.environ.get('ZH_MHAND', '.06')); M_ELB = HEADR + float(os.environ.get('ZH_MELB', '.035'))
BODYM = float(os.environ.get('ZH_BODYM', '.008'))
def violOwn(m): return max(0, BODYM - m['own'])
def violR(m): return (max(0, GROUND - m['low']) if TWO else 0) + max(0, BODYM - m['body']) + max(0, M_BAT - m['bat']) + ((max(0, M_HAND - m['hL']) + max(0, M_ELB - m['eL'])) if TWO else 0) + max(0, M_HAND - m['hR']) + max(0, M_ELB - m['eR']) + max(0, GROUND - m['low'])
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
IKH = [False]
def hinge_of(side, C, du, df, fr):   # 3D.204: the elbow's hinge is square to both arm bones; when the arm is nearly straight that is undefined and it used to
    # switch to a fixed axis all at once (an 84-degree flip in Swing 4). It now blends towards the last hinge as the arm straightens.
    if fr == 0 or side not in HPREV: HPREV[side] = -C[:, 0]
    n = np.cross(du, df); prev = HPREV[side]; prev = nz(prev - du * (prev @ du)); w = sst(.04, .22, float(np.linalg.norm(n))) * (1. if IKH[0] else sst(-.05, .3, float(nz(n) @ prev)))   # (3D.207) an arm solved to reach a point always bends towards its hint, so its true bend is always right   # (3D.205) a bend the other way (the elbow backwards) keeps the last hinge; the hand-over is gradual
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
    upd(); mw = np.array(bat.matrix_world); return nz(mw[:3, :3] @ (AXV[TIPI] - AXV[GRIPI]))
def aim_bat(d):   # turn the hand so the weapon points along d (chest frame), by the shortest turn
    W2A = np.array(ao.matrix_world.to_3x3()).T; want = nz(chest3() @ nz(d)); cur = nz(W2A @ batdir()); ax = np.cross(cur, want); sn = np.linalg.norm(ax)
    if sn > 1e-6: turn('hand.R', ax / sn * math.atan2(sn, float(cur @ want)), PB['hand.R'].matrix.copy()); upd()
# ---- the rising cut (owner, 18 Nov: "can swing 3 be the bat start on the lower right and then swing upward across the body?"). ZH_RISE=1 replaces the
# weapon arm of the clip: the hand drops behind the right hip with the weapon pointing down and back, sweeps forward and up across the body and ends high
# on the left, the weapon pointing up over the left shoulder. The body (step, twist) is the old clip's. (upper arm, forearm, weapon) in the chest's frame.
RISE = os.environ.get('ZH_RISE', '0') == '1'
R_WOUND = (nz([-.45, -.80, -.40]), nz([-.25, -.90, -.20]), nz([-.30, -.70, -.65]))   # the elbow slightly bent forwards (3D.205: it bent backwards)
R_MID = (nz([-.25, -.75, .60]), nz([.15, -.25, .95]), nz([-.35, -.25, .90]))
R_END = (nz([.35, .45, .82]), nz([.90, .25, .36]), nz([.42, .86, -.28]))   # (3D.206) forearm across the chest, so the weapon leans over the left shoulder and its handle stays off the wrist
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
# ---- 3D.207 two-handed weapons (owner, 18 Nov: two-handed swings copied from real people: a baseball swing, a golf swing, chopping wood; a spear stab).
# ZH_TWOHAND = rec  : the weapon runs along the line between the recorded hands (ZH_WDIR: the retarget.py JSON with 'wdir'), the right arm as recorded
#              hold : a still pose for a ready stance (ZH_HOLD: 'stab' for the spear, otherwise the two-handed ready stance)
#              stab : the spear thrust, made by hand on the recorded body: the spear drawn back at the hip, driven forward, recovered
# Every frame the left hand is put on the handle (ZH_GRIP: 'below' = towards the handle's end, as on a bat or an axe; 'ahead' = towards the tip, as on a spear),
# ZH_GAP apart, by solving the left arm (two bones, the elbow kept down and out).
TWO = os.environ.get('ZH_TWOHAND', ''); GRIP = os.environ.get('ZH_GRIP', 'below'); GAP = float(os.environ.get('ZH_GAP', '.11'))
if TWO: FREEARM = False
WDJ = json.load(open(os.environ['ZH_WDIR'])) if os.environ.get('ZH_WDIR') else None
W2A = np.array(ao.matrix_world.to_3x3()).T; A2W = np.array(ao.matrix_world.to_3x3())
def wdir_at(fr):   # the recorded weapon line at this fine frame, in armature space
    t = fr / (fps * SUB); W = WDJ['wdir']; x = min(len(W) - 1.001, max(0., t * WDJ['fps'])); i = int(x); u = x - i
    return nz(np.array(W[i]) * (1 - u) + np.array(W[i + 1]) * u)
def swing_bone(bone, want):   # turn a bone the shortest way so it points along `want` (world)
    c_ = W2A @ nz(P(PB[bone].tail) - P(PB[bone].head)); w_ = W2A @ nz(want); ax = np.cross(c_, w_); sn = float(np.linalg.norm(ax))
    if sn > 1e-7: turn(bone, ax / sn * math.atan2(sn, float(c_ @ w_)), PB[bone].matrix.copy()); upd()
CURW = [0.]
LEGERR = {}
def plant_legs():
    if not ((PLANT or SP2) and FOOTST): return
    sc_ = ao.matrix_world.to_scale()[0]; f = A2W @ hips3()[:, 2]
    over = 0.   # the hips higher than the legs reach (with a little bend kept): lower them first
    for s_ in 'LR':
        L_ = (PB['thigh.' + s_].length + PB['shin.' + s_].length) * sc_ * .975; over = max(over, float(np.linalg.norm(FOOTST[s_][0] - P(PB['thigh.' + s_].head))) - L_)
    over *= 1 - CURW[0]   # (none at the two ends, where the clip is the stance itself)
    if over > 0:
        m = PB['pelvis'].matrix.copy(); m.translation.z -= over / ao.matrix_world.to_scale()[2]; PB['pelvis'].matrix = m; upd()
    for s_ in 'LR':   # (3D.211) each leg starts from the stance's own turn, so it keeps the stance's natural twist (the recorded chopper's thighs came in turned about 175 degrees about their own length, which wrung the skin at the hips)
        for b_ in ('thigh.', 'shin.', 'foot.'): PB[b_ + s_].scale = (1., 1., 1.)   # (3D.212) a bone set from a matrix can pick up a squash the game file never gets (the spear's front shin came out 9% short, so in the game its foot sank into the ground)
        for b_ in ('thigh.', 'shin.'): PB[b_ + s_].rotation_quaternion = (STALL[b_ + s_][0] if SJ else Quaternion()).copy()
    upd()
    for s_ in [c_ for c_ in 'LR' for _ in range(3)]:   # (3D.212) three passes per leg: each one aims at the planted place corrected by what the last one missed
        hip = P(PB['thigh.' + s_].head); A = (LEGERR[s_] + FOOTST[s_][0] - P(PB['foot.' + s_].head)) if s_ in LEGERR else FOOTST[s_][0]; LEGERR[s_] = A; l1 = PB['thigh.' + s_].length * sc_; l2 = PB['shin.' + s_].length * sc_
        dv = A - hip; dd = float(np.clip(np.linalg.norm(dv), .05, (l1 + l2) * .999)); dn = nz(dv); pole = nz(f - dn * (f @ dn))
        x = (l1 * l1 - l2 * l2 + dd * dd) / (2 * dd); y = math.sqrt(max(0., l1 * l1 - x * x)); e = hip + dn * x + pole * y
        swing_bone('thigh.' + s_, e - hip); swing_bone('shin.' + s_, (hip + dn * dd) - P(PB['shin.' + s_].head))
        m = FOOTST[s_][1].copy(); m.translation = PB['foot.' + s_].matrix.translation.copy(); PB['foot.' + s_].matrix = m
        for b_ in ('thigh.', 'shin.', 'foot.'): PB[b_ + s_].scale = (1., 1., 1.)
        upd()
    if os.environ.get('ZH_DBGF') and PLFR[0] in (0, 30, 45): print('FOOT', PLFR[0], {c_: np.round(FOOTST[c_][0] - P(PB['foot.' + c_].head), 3) for c_ in 'LR'})
    LEGERR.clear()
def place_left():
    upd(); mw = np.array(bat.matrix_world); tip = mw[:3, :3] @ AXV[TIPI] + mw[:3, 3]; grp = mw[:3, :3] @ AXV[GRIPI] + mw[:3, 3]; wd = nz(tip - grp)
    rc = (P(PB['hand.R'].head) + P(PB['hand.R'].tail)) / 2; t_ = float((rc - grp) @ wd); c = grp + wd * t_; perp = rc - c
    tgt = c + wd * (GAP if GRIP == 'ahead' else -GAP) + perp   # the left hand's middle: on the handle, the same side of it as the right hand's
    w = tgt + (P(PB['hand.R'].head) - rc)
    s_ = P(PB['upperarm.L'].head); sc_ = ao.matrix_world.to_scale()[0]; l1 = PB['upperarm.L'].length * sc_; l2 = PB['forearm.L'].length * sc_
    for _ in range(4):
        dv = w - s_; dd = float(np.clip(np.linalg.norm(dv), .05, (l1 + l2) * .999)); dn = nz(dv)
        C = A2W @ chest3(); pole = nz(C @ np.array([.55, -.75, -.25])); pole = nz(pole - dn * (pole @ dn))
        x = (l1 * l1 - l2 * l2 + dd * dd) / (2 * dd); y = math.sqrt(max(0., l1 * l1 - x * x)); e = s_ + dn * x + pole * y
        du = W2A @ nz(e - s_); df = W2A @ nz(s_ + dn * dd - e); Cc = chest3(); IKH[0] = True; set_arm('L', (Cc.T @ du, Cc.T @ df), PLFR[0] if _ == 0 else None); IKH[0] = False
        m = PB['hand.R'].matrix.copy(); mL = PB['hand.L'].matrix.copy(); r = m.to_3x3() @ Matrix.Rotation(math.pi, 3, 'Y'); n_ = r.to_4x4(); n_.translation = mL.translation; PB['hand.L'].matrix = n_; upd()
        err = tgt - (P(PB['hand.L'].head) + P(PB['hand.L'].tail)) / 2
        if os.environ.get('ZH_DBGL') and PLFR[0] in (0, 30): print('PLR', PLFR[0], _, 'reach %.3f of %.3f' % (np.linalg.norm(w - s_), l1 + l2), 'shoulder->right hand %.3f' % np.linalg.norm(rc - s_), 'tgt-rc', np.round(tgt - rc, 3))
        if np.linalg.norm(w - s_) > (l1 + l2) * .999: break   # out of reach: as close as the arm allows
        if os.environ.get('ZH_DBGL') and PLFR[0] in (0, 30): print('PL', PLFR[0], _, 'err %.3f' % np.linalg.norm(err), 'reach %.3f of %.3f' % (np.linalg.norm(w - s_), l1 + l2), 'hand.L len', round(PB['hand.L'].length * sc_, 3))
        if np.linalg.norm(err) < .004: break
        w = w + err
    return tgt - (P(PB['hand.L'].head) + P(PB['hand.L'].tail)) / 2
PLFR = [None]
def ik_arm(side, centre, pole_c, fr=None):   # put the hand's middle at `centre` (world): two bones, the elbow towards pole_c (chest frame); a few passes
    sc_ = ao.matrix_world.to_scale()[0]; l1 = PB['upperarm.' + side].length * sc_; l2 = PB['forearm.' + side].length * sc_; s_ = P(PB['upperarm.' + side].head)
    hc = lambda: (P(PB['hand.' + side].head) + P(PB['hand.' + side].tail)) / 2
    w = centre + (P(PB['hand.' + side].head) - hc())
    for k in range(4):
        dv = w - s_; dd = float(np.clip(np.linalg.norm(dv), .05, (l1 + l2) * .999)); dn = nz(dv)
        pole = nz(A2W @ chest3() @ np.array(pole_c)); pole = nz(pole - dn * (pole @ dn))
        x = (l1 * l1 - l2 * l2 + dd * dd) / (2 * dd); y = math.sqrt(max(0., l1 * l1 - x * x)); e = s_ + dn * x + pole * y
        Cc = chest3(); IKH[0] = True; set_arm(side, (Cc.T @ (W2A @ nz(e - s_)), Cc.T @ (W2A @ nz(s_ + dn * dd - e))), fr if k == 0 else None); IKH[0] = False
        err = centre - hc()
        if np.linalg.norm(err) < .004 or np.linalg.norm(w - s_) > (l1 + l2): break
        w = w + err
# the spear (3D.207): the right hand's middle at a point in front of the body, as an offset from the neck in the hips' frame (left, forward, up), and the
# spear pointing straight ahead (hips' frame), whatever the chest does. The chest is turned (ZH_CHESTTURN) so the left shoulder comes forward.
SP_READY = (np.array([-.08, .06, -.27]), np.array([.24, 1., .14])); SP_DRAW = (np.array([-.10, -.02, -.27]), np.array([.24, 1., .16])); SP_HIT = (np.array([-.02, .26, -.22]), np.array([.18, 1., .06]))   # (3D.208) the rear hand low, by the right hip; the spear angled a little up and across   # angled a little across the body, so the butt passes outside the right hip
def hips3():   # the hips' turn about the vertical only (3D.207: when the body leans into the thrust the spear stays level)
    m = np.array(PB['pelvis'].matrix.to_3x3()); f = m[:, 2].copy(); f[2] = 0; f = nz(f); up = np.array([0, 0, 1.]); l = nz(np.cross(up, f)); return np.stack([l, up, f], 1)
def spear_at(key):
    off, d = key; H = A2W @ hips3(); nk = P(PB['neck'].head)
    # the pelvis bone's columns are (left, up along the spine, forward) like the chest's: offsets given as (left, forward, up) map to columns 0, 2, 1
    cen = nk + H @ np.array([off[0], off[2], off[1]]); dirw = nz(H @ np.array([d[0], d[2], d[1]]))
    for _ in range(4):   # (3D.208) if the left hand cannot reach its place on the shaft, both hands slide towards it together (the gap is kept)
        ik_arm('R', cen, [-.4, -.8, -.2], PLFR[0]); aim_arm(W2A @ dirw); err = place_left()
        if err is None or np.linalg.norm(err) < .008: break
        cen = cen - err * 1.1   # (towards the left hand, which is as far as its arm reaches)
HOLD = os.environ.get('ZH_HOLD', '')
H_READY = (nz([-.02, -.78, .62]), nz([.78, .40, .48]), nz([-.30, .90, -.30]))   # two-handed ready: hands in front of the breastbone (the arms are short), the weapon up over the right shoulder
S_READY = (nz([-.20, -.62, .76]), nz([.82, .12, .56]), nz([.00, -.04, 1.]))      # spear ready (high guard; the arms are short): the right forearm across the chest, the spear pointing forward
S_DRAW = (nz([-.25, -.85, .45]), nz([.75, .15, .64]), nz([.02, -.02, 1.]))       # drawn back for the thrust
S_HIT = (nz([.05, -.25, .97]), nz([.55, -.02, .84]), nz([-.02, -.06, 1.]))        # driven forward
SL_UP = nz(np.array([0., .35, 1.])); SL_OVER = nz(np.array([0., -1., .35])); SL_DOWN = nz(np.array([0., -.72, -.70]))   # armature space: +Y is behind, -Y in front, +Z up
CHT = math.radians(float(os.environ.get('ZH_CHESTTURN', '0')))
# ---- 3D.212 the spear, from the owner's picture (a spear form: a deep, wide stance, the rear hand at the end of the spear by the right hip, the front
# hand high on the shaft, the spear angled up about 30 degrees at the target, the body side-on). The library has no spear form, so the whole pose is made
# here, all of a piece: the hips sink and turn, the feet are planted wide (the legs solved, no twist), both arms reach their places on the shaft.
# ZH_TWOHAND=spear2hold : the stance; spear2 : the stab (a short draw back, a lunge: the hips drive forward, the back leg straightens, the spear is
# driven along its line and levels out; then back to the stance). Offsets: from the neck in the character's own frame (left, forward, up), not turned.
SP2 = TWO in ('spear2hold', 'spear2')
S2_READY = dict(drop=.07, fwd=0., yaw=-32., chest=-8., hand=(-.19, .02, -.33), dir=(.30, 1., .62))
S2_DRAW = dict(drop=.075, fwd=-.03, yaw=-36., chest=-10., hand=(-.20, -.04, -.33), dir=(.30, 1., .66))
S2_HIT = dict(drop=.09, fwd=.12, yaw=-18., chest=0., hand=(-.12, .27, -.24), dir=(.18, 1., .12))
FEET2 = {'L': ((.10, -.23), -12.), 'R': ((-.12, .19), -60.)}   # (left, back) from where the hips start; the foot's turn (negative: toes to the right)
def s2_mix(a, b, u): return {k: (tuple(x * (1 - u) + y * u for x, y in zip(a[k], b[k])) if isinstance(a[k], tuple) else a[k] * (1 - u) + b[k] * u) for k in a}
def s2_key(fr):
    if TWO == 'spear2hold': return S2_READY
    t = fr / nf; w1 = sst(.05, .30, t); u = sst(.30, .46, t); w3 = sst(.62, .97, t)
    return s2_mix(s2_mix(s2_mix(S2_READY, S2_DRAW, w1), S2_HIT, u), S2_READY, w3)
S2_BASE = {}
def s2_body(k):
    if not S2_BASE:   # the hips and the stance's feet where the clip starts
        S2_BASE['p'] = PB['pelvis'].matrix.copy(); S2_BASE['f'] = {s_: PB['foot.' + s_].matrix.copy() for s_ in 'LR'}; S2_BASE['a'] = {s_: P(PB['foot.' + s_].head) for s_ in 'LR'}
    m = PB['pelvis'].matrix.copy(); t_ = m.translation.copy(); R_ = Matrix.Rotation(math.radians(k['yaw']), 4, 'Z'); m = R_ @ m
    m.translation = t_ + Vector((0, -k['fwd'], -k['drop'])); PB['pelvis'].matrix = m; upd()
    for b_, ang in (('chest', k['chest']), ('head', -(k['yaw'] + k['chest']) * .8)):
        m = PB[b_].matrix.copy(); t_ = m.translation.copy(); m = Matrix.Rotation(math.radians(ang), 4, 'Z') @ m; m.translation = t_; PB[b_].matrix = m; upd()
def s2_feet():   # the planted feet of the stance from the picture
    pz = np.array(S2_BASE['p'].translation[:]); out = {}
    for s_, ((l_, b_), turn_) in FEET2.items():
        a0 = S2_BASE['a'][s_]; pos = A2W @ np.array([pz[0] + l_, pz[1] + b_, (W2A @ a0)[2]]) if False else np.array((ao.matrix_world @ Vector((pz[0] + l_, pz[1] + b_, (ao.matrix_world.inverted() @ Vector(a0))[2])))[:])
        fm = S2_BASE['f'][s_].copy(); t_ = fm.translation.copy(); fm = Matrix.Rotation(math.radians(turn_), 4, 'Z') @ fm; fm.translation = t_; out[s_] = (pos, fm)
        if SJ: out[s_] = (np.array(S2_BASE['a'][s_]), S2_BASE['f'][s_].copy())   # (3D.212) the stab starts from the stance itself: its feet stay exactly where the stance put them (turning them again turned the back foot twice)
    return out
def spear2_at(k):
    nk = P(PB['neck'].head); cen = nk + A2W @ np.array([k['hand'][0], -k['hand'][1], k['hand'][2]]); dirw = nz(A2W @ np.array([k['dir'][0], -k['dir'][1], k['dir'][2]]))
    for _ in range(5):   # if the left hand cannot reach its place on the shaft, both hands slide towards it together (the gap is kept)
        ik_arm('R', cen, [-.4, -.8, -.2], PLFR[0]); aim_arm(W2A @ dirw); err = place_left()
        if err is None or np.linalg.norm(err) < .008: break
        cen = cen - err * 1.1
def two_pose(fr):
    if SP2:
        global FOOTST
        k = s2_key(fr); s2_body(k); FOOTST = s2_feet(); plant_legs(); PLFR[0] = fr; spear2_at(k); return
    if CHT:
        for b_, k_ in (('pelvis', .35), ('chest', .65)):
            m_ = PB[b_].matrix.copy(); R_ = Matrix.Rotation(-CHT * k_, 4, 'Z'); t_ = m_.translation.copy(); m_ = R_ @ m_; m_.translation = t_; PB[b_].matrix = m_; upd()
    if fr == 0: HQ.pop('q', None)
    if TWO == 'rec':
        aim_arm(wdir_at(fr))
    elif TWO == 'slam':   # (3D.208, owner: "big overhead slam") the arms as recorded (chopping wood), the weapon set by hand: lifted straight up overhead,
        # over the top in front, slammed forward-down to the ground; held there a moment; then back with the recording
        kB = T_S - 4 * SUB; kE = T_S + 2 * SUB; w1 = sst(T_W * .15, kB, fr); u = sst(kB, kE, fr); w3 = sst(kE + (nf - kE) * .4, nf, fr)
        d = SL_UP   # (the stance already holds it up over the shoulder: it stays up through the wind-up)
        if u > 0: d = gpath([SL_UP, SL_OVER, SL_DOWN], u)
        if w3 > 0: d = gslerp(d, SL_UP, w3)
        aim_arm(d)
    elif TWO == 'hold' and HOLD == 'stab':
        PLFR[0] = fr; spear_at(SP_READY)
    elif TWO == 'hold':
        d = H_READY; set_arm('R', d[:2], fr); aim_bat(d[2])
    elif TWO == 'stab':
        kB = T_S - 3 * SUB; kE = T_S + SUB; w1 = sst(T_W * .2, kB, fr); u = sst(kB, kE, fr); w3 = sst(kE + (nf - kE) * .35, nf, fr); out = []
        L = lambda a, b, t: (a[0] * (1 - t) + b[0] * t, nz(a[1] * (1 - t) + b[1] * t))
        PLFR[0] = fr; spear_at(L(L(L(SP_READY, SP_DRAW, w1), SP_HIT, u), SP_READY, w3))
    PLFR[0] = fr; err = place_left()
    if TWO in ('rec', 'slam'):   # (3D.208) where the left hand cannot reach the handle, the right hand gives way towards it (the weapon keeps its direction)
        wd_ = batdir()
        for _ in range(3):
            if err is None or np.linalg.norm(err) < .01: break
            rc_ = (P(PB['hand.R'].head) + P(PB['hand.R'].tail)) / 2; ik_arm('R', rc_ - err * 1.1, [-.4, -.8, -.2], None); aim_arm(W2A @ wd_); err = place_left()
def aim_arm(v_arm):   # aim the weapon along a direction in armature space, the hand starting from its last turn (no flips)
    if 'q' in HQ: PB['hand.R'].rotation_quaternion = HQ['q']; upd()
    aim_bat(chest3().T @ nz(v_arm)); HQ['q'] = PB['hand.R'].rotation_quaternion.copy()
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
# 3D.210 (owner on C: "the leg is not ok at all. It looks like jelly fish"): ZH_PLANT=1 keeps both feet planted where the stance has them all through the
# clip, and solves the legs (two bones, the knee forwards) to the recorded hips. (The chopper stood square with his feet wide; blending from the
# staggered stance to that slid both feet 0.6 to 0.7 across the ground, unlifted.)
PLANT = os.environ.get('ZH_PLANT') == '1'
FOOTST = {s_: (P(PB['foot.' + s_].head), PB['foot.' + s_].matrix.copy()) for s_ in 'LR'} if SJ else None
ad.action = old
try:
    if old.slots: ad.action_slot = old.slots[0]
except Exception: pass
def stance_lock(t):   # 1 at the clip's two ends, 0 in the swing
    tW = TT0[T_W]; Tc = TT0[-1]; e_ = max(.25, (Tc - TT0[T_S]) * .5) if TWO else max(.12, (Tc - TT0[T_S]) * .35)   # (3D.207) two hands on the weapon: a longer return
    return max(1 - sst(0, max(.08, tW * .45), t), sst(Tc - e_, Tc, t))
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
RV = {'upperarm.R': np.zeros((nf + 1, 3)), 'upperarm.L': np.zeros((nf + 1, 3)), 'hand.R': np.zeros((nf + 1, 3))}; before = []
for fr in range(nf + 1):
    goto(fr); m = meas(); before.append(m)
    plant_legs()
    if RISE: upd(); set_rarm(fr)
    if TWO: upd(); two_pose(fr)
    if os.environ.get('ZH_DBGV') and fr % 10 == 0: m_ = meas(); print('DBGV', fr, {k_: round(v_, 3) for k_, v_ in m_.items()}, 'violR %.3f' % violR(m_), 'part', WORSTB[0], 'BODYM', BODYM, 'M_BAT %.3f M_HAND %.3f M_ELB %.3f' % (M_BAT, M_HAND, M_ELB))
    for bone, viol in (('upperarm.R', violR), ('hand.R', lambda m: violR(m) + violOwn(m))) + (() if (FREEARM or TWO) else (('upperarm.L', violL),)):
        if bone == 'hand.R': turn('upperarm.R', RV['upperarm.R'][fr], PB['upperarm.R'].matrix.copy()); upd()
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
OMEGA_ARM = float(os.environ.get('ZH_OMEGA_ARM', '1300'))   # (3D.207, two-handed) no arm bone turns faster than this, degrees a second
ARMB = ('upperarm.L', 'forearm.L', 'hand.L', 'upperarm.R', 'forearm.R', 'hand.R')
def retime(BATD, HANDP, HANDL=None, ARMQ=None):
    dth = np.degrees(np.arccos(np.clip((np.array(BATD[1:]) * np.array(BATD[:-1])).sum(1), -1, 1))); dh = np.linalg.norm(np.diff(np.array(HANDP), axis=0), axis=1)
    need = np.maximum(dth / OMEGA, dh / VHAND)
    if HANDL is not None: need = np.maximum(need, np.linalg.norm(np.diff(np.array(HANDL), axis=0), axis=1) / VLEFT)
    if ARMQ is not None:
        A = np.array(ARMQ); dq = np.degrees(2 * np.arccos(np.clip(np.abs((A[1:] * A[:-1]).sum(2)), 0, 1))).max(1); need = np.maximum(need, dq / OMEGA_ARM)
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
    if lift[fr] > 1e-4 and not PLANT: m = PB['pelvis'].matrix.copy(); m.translation.z += lift[fr]; PB['pelvis'].matrix = m; upd()
    plant_legs()
    if RISE: set_rarm(fr)
    if TWO: two_pose(fr)
    turn('upperarm.R', RV['upperarm.R'][fr], PB['upperarm.R'].matrix.copy()); upd(); turn('hand.R', RV['hand.R'][fr], PB['hand.R'].matrix.copy()); upd(); _B.append(batdir()); _H.append(P(PB['hand.R'].tail)); _C.append((chest3().copy(), P(PB['chest'].head))); _L0 = P(PB['hand.L'].tail) if fr == 0 else _L0
TT0 = retime(_B, _H, [c[0] @ (_C[0][0].T @ (_L0 - _C[0][1])) + c[1] for c in _C])[0]
new = bpy.data.actions.new(clip + '_fix'); frames = []; BATD = []; HANDP = []; HANDL = []; SHL = []; CHM = []; ARMQ = []; _l = batv @ np.array([0, 0, 0.]) if False else None
for fr in range(nf + 1):
    goto(fr); upd()
    if lift[fr] > 1e-4 and not PLANT: m = PB['pelvis'].matrix.copy(); m.translation.z += lift[fr]; PB['pelvis'].matrix = m; upd()
    CURW[0] = stance_lock(TT0[fr]) if SJ else 0.
    plant_legs()
    if FREEARM: set_larm(larm_at(fr), fr); lock_larm(fr)
    if RISE: set_rarm(fr)
    if TWO: two_pose(fr)
    WL = 0.
    if TWO and SJ: CURW[0] = stance_lock(TT0[fr]); lock_all(fr); plant_legs(); place_left(); WL = CURW[0]   # (3D.208) into the stance first, then the head and body are cleared (the other way round the return to the stance undid the clearing)
    for bone, viol in (('upperarm.R', violR), ('hand.R', lambda m: violR(m) + violOwn(m))) + ((() if (FREEARM or TWO) else (('upperarm.L', violL),))):
        base = PB[bone].matrix.copy(); turn(bone, RV[bone][fr] * (1 - WL), base); m = meas()
        if viol(m) > 0:   # the hips were lifted since pass 1: solve again from the same turn
            ok_ = False
            for k_ in (1.1, 1.2, 1.35, 1.5):   # a little more of the same turn, before searching afresh
                turn(bone, RV[bone][fr] * k_, base)
                if viol(meas()) == 0: ok_ = True; break
            if not ok_: turn(bone, np.zeros(3), base); upd(); rv = solve(bone, viol, RV0[bone][fr]); turn(bone, rv, base); upd()
    if SJ and not TWO: lock_all(fr)
    if TWO:
        place_left()
        if SJ and not os.environ.get('ZH_NOLBLEND'):   # (3D.207) near the two ends the left arm is the stance's own (which holds the handle), blended in, so the clip ends exactly where it starts
            w_ = stance_lock(TT0[fr])
            if w_ > 0:
                for b_ in ('upperarm.L', 'forearm.L', 'hand.L', 'fingers.L'):
                    q_ = PB[b_].rotation_quaternion.copy(); q0_ = STALL[b_][0]
                    if q_.dot(q0_) < 0: q_.negate()
                    PB[b_].rotation_quaternion = q_.slerp(q0_, w_)
                upd()
    if os.environ.get('ZH_DBGF') and fr in (0, 30): upd(); print('Q', [(b_, PB[b_].rotation_mode, tuple(round(x, 3) for x in PB[b_].rotation_quaternion), tuple(round(x,3) for x in PB[b_].scale)) for b_ in ('pelvis','thigh.L','shin.L')]); print('FOOTEND', fr, {b_: tuple(round(x, 3) for x in PB[b_].location) for b_ in ('thigh.L','shin.L','foot.L','thigh.R','chest')}, {c_: round(float(P(PB['foot.' + c_].head)[2]), 3) for c_ in 'LR'}, 'want', {c_: round(float(FOOTST[c_][0][2]), 3) for c_ in 'LR'} if FOOTST else None)
    ARMQ.append([list(PB[b_].rotation_quaternion) for b_ in ARMB])
    MEAS_RAW[0] = True; after.append(meas()); MEAS_RAW[0] = False; frames.append({b: (PB[b].rotation_quaternion.copy(), PB[b].location.copy()) for b in order})
    _mw = np.array(bat.matrix_world); _bv2 = AXV @ _mw[:3, :3].T + _mw[:3, 3]; BATD.append(nz(_bv2[TIPI] - _bv2[GRIPI])); HANDP.append(P(PB['hand.R'].tail)); HANDL.append(P(PB['hand.L'].tail)); SHL.append(P(PB['upperarm.L'].head)); CHM.append((chest3().copy(), P(PB['chest'].head)))
# ---- timing (owner, 18 Nov, video: "the right arm is still teleporting"): going round the head is a longer way than going through it, and the old clip gave the
# blow only two or three frames, so the weapon jumped from behind the back to the front. Time is moved from the still part of the wind-up to the blow:
# the weapon may turn at most OMEGA degrees a second and the hand move at most VHAND units a second; the clip keeps its length.
tt, dth, dh, need, base_ = retime(BATD, HANDP, HANDL, ARMQ if TWO else None)
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
print('BODY', clip, 'own arm after %.3f |' % min(g(after, 'own')), 'body clearance before %.3f after %.3f | wrist turned at %d frames' % (min(g(before, 'body')), min(g(after, 'body')), int((np.linalg.norm(RV['hand.R'], axis=1) > 0).sum())))
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
        res['NB:' + nm] = np.array(len(me.vertices))
        res['V:' + nm] = np.array(V); res['J:' + nm] = np.array(J); res['F:' + nm] = np.array([fa, fb, fps * (SUB if act is new else 1)]); res['T:' + nm] = np.concatenate([tri, wt]); res['U:' + nm] = np.concatenate([uv, np.zeros((len(wt), 3, 2)) + .0005])
    np.savez_compressed(dump, **res)
