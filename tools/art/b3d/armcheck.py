# armcheck.py RAW.glb clip,clip,...  (Blender as a Python module: python3 armcheck.py -- RAW.glb ...)
# 3D.205 (owner, 18 Nov: "the left arm is the same issue", after the weapon arm's jump was fixed). Prints one line per test, "ok" or "FAIL":
#   1. each swing starts in the melee stance (melee_hold_idle, first frame): the game blends into a swing in only 0.12 s, so any gap there is a jump;
#   2. each swing ends where it started, so a swing that follows a swing (and the test page, which repeats it) has no seam;
#   3. no arm bone turns more than 30 degrees in one screen frame (1/30 s), twist included;
#   4. melee_swing_c is a rising cut: the weapon's tip is lowest, low and on the right, then highest, high and on the left.
import bpy, sys, math, numpy as np
a = sys.argv[sys.argv.index('--') + 1:]; src = a[0]; clips = a[1].split(',')
bpy.ops.wm.read_factory_settings(use_empty=True); bpy.ops.import_scene.gltf(filepath=src)
ao = next(o for o in bpy.data.objects if o.type == 'ARMATURE'); ad = ao.animation_data; PB = ao.pose.bones; sc = bpy.context.scene; bat = bpy.data.objects['weapon_bat']
for tr in ad.nla_tracks: tr.mute = True
ARM = ('upperarm.L', 'forearm.L', 'hand.L', 'upperarm.R', 'forearm.R', 'hand.R', 'chest')
LIM = {'upperarm.L': 30, 'forearm.L': 30, 'hand.L': 30, 'upperarm.R': 48, 'forearm.R': 48, 'hand.R': 48}   # the weapon arm may move as fast as the weapon (swing_head_check: 48)
def use(c):
    act = bpy.data.actions[c]; ad.action = act
    try:
        if act.slots: ad.action_slot = act.slots[0]
    except Exception: pass
    return act.frame_range
def at(f):
    sc.frame_set(int(f), subframe=f - int(f)); bpy.context.view_layer.update()
def quats(): return {b: PB[b].rotation_quaternion.copy() for b in ARM}
def deg(q1, q2): d = abs(q1.dot(q2)) / (q1.magnitude * q2.magnitude); return math.degrees(2 * math.acos(min(1., d)))
r = use('melee_hold_idle'); at(r[0]); ST = quats()
fps = sc.render.fps; bad = 0; tag = src.split('/')[-1]
def say(ok, txt):
    global bad
    bad += 0 if ok else 1; print(('ok   ' if ok else 'FAIL ') + tag + ' ' + txt)
bv = np.array([v.co[:] for v in bat.data.vertices]); ax = int(np.argmax(np.ptp(bv, axis=0)))
for c in clips:
    f0, f1 = use(c); at(f0); Q0 = quats(); at(f1); Q1 = quats()
    g, gb = max((deg(Q0[b], ST[b]), b) for b in ARM); say(g <= 3, '%s: starts in the melee stance (largest gap %.1f degrees, %s; limit 3)' % (c, g, gb))
    g, gb = max((deg(Q0[b], Q1[b]), b) for b in ARM); say(g <= 3, '%s: ends where it starts (largest gap %.1f degrees, %s; limit 3)' % (c, g, gb))
    n = int(round((f1 - f0) / fps * 30)); worst = (0, '', 0); prev = None; tips = []
    for i in range(n + 1):
        f = f0 + (f1 - f0) * i / n; at(f); q = quats()
        if prev:
            for b in ARM[:-1]:
                d = deg(q[b], prev[b]) / LIM[b] * 30
                if d > worst[0]: worst = (d, b, i / 30)
        prev = q
        mw = bat.matrix_world; pts = [mw @ bat.data.vertices[j].co for j in (int(bv[:, ax].argmax()), int(bv[:, ax].argmin()))]
        h = PB['hand.R'].tail; hw = ao.matrix_world @ h; tip = max(pts, key=lambda p: (p - hw).length)
        pv = ao.matrix_world @ PB['pelvis'].head; C = (ao.matrix_world.to_3x3() @ PB['chest'].matrix.to_3x3()); left = C.col[0]
        tips.append((tip.z - pv.z, (tip - pv).dot(left), (ao.matrix_world @ PB['neck'].head).z - pv.z))
    wd = worst[0] / 30 * LIM.get(worst[1], 30); say(worst[0] <= 30, '%s: no arm bone jumps: the worst is %s, %.0f degrees in one screen frame at %.2f s (limit %d: free arm 30, weapon arm 48)' % (c, worst[1], wd, worst[2], LIM.get(worst[1], 30)))
    if c == 'melee_swing_c':
        T = np.array(tips); lo = int(T[:, 0].argmin()); hi = lo + int(T[lo:, 0].argmax())
        ok = hi > lo and T[lo, 0] < 0 and T[lo, 1] < 0 and T[hi, 0] > T[hi, 2] and T[hi, 1] > 0
        say(ok, '%s: a rising cut: tip lowest at %.2f s (%.2f below the hips, %.2f to the right), then highest at %.2f s (%.2f above the hips, neck at %.2f; %.2f to the left)' % (
            c, lo / 30, -T[lo, 0], -T[lo, 1], hi / 30, T[hi, 0], T[hi, 2], T[hi, 1]))
print('BAD', bad)
