# legcheck.py RAW.glb clip,clip,...  (Blender as a Python module: python3 legcheck.py -- RAW.glb ...)
# 3D.210 (owner on two-handed C: "the leg is not ok at all. It looks like jelly fish"): the feet of these clips must stay planted.
# Per clip at 30 frames a second: each ankle moves at most 0.10 along the ground over the whole clip, it is never lifted more than
# 0.02 above where it starts, and the toes never go more than 0.02 into the ground. Clips named 'clip:step' have real steps: only the twist rule.
# 3D.211 (owner: "the butt area and thigh still looks weird"): no thigh or shin is ever turned more than 90 degrees about its own length (the
# skin at the hips gets wrung). Prints "ok"/"FAIL" per clip and foot, then "BAD n".
import bpy, sys, math, numpy as np
a = sys.argv[sys.argv.index('--') + 1:]
bpy.ops.wm.read_factory_settings(use_empty=True); bpy.ops.import_scene.gltf(filepath=a[0])
ao = [o for o in bpy.data.objects if o.type == 'ARMATURE'][0]; ad = ao.animation_data; PB = ao.pose.bones; sc = bpy.context.scene; bad = 0; tag = a[0].split('/')[-1]
for tr in ad.nla_tracks: tr.mute = True
for c in a[1].split(','):
    c, _, mode = c.partition(':')
    act = bpy.data.actions[c]; ad.action = act
    try:
        if act.slots: ad.action_slot = act.slots[0]
    except Exception: pass
    f0, f1 = act.frame_range; n = max(1, int(round((f1 - f0) / sc.render.fps * 30))); A = {'L': [], 'R': []}; T = {'L': [], 'R': []}; TW = {'L': 0., 'R': 0.}
    for i in range(n + 1):
        f = f0 + (f1 - f0) * i / n; sc.frame_set(int(f), subframe=f - int(f)); bpy.context.view_layer.update()
        for s in 'LR':
            for b in ('thigh.', 'shin.'):
                q = PB[b + s].rotation_quaternion; TW[s] = max(TW[s], abs((2 * math.degrees(math.atan2(q.y, q.w)) + 180) % 360 - 180))
        for s in 'LR': A[s].append(np.array((ao.matrix_world @ PB['foot.' + s].head)[:])); T[s].append((ao.matrix_world @ PB['foot.' + s].tail)[2])
    for s in 'LR':
        P = np.array(A[s]); slide = float(np.linalg.norm(np.diff(P[:, :2], axis=0), axis=1).sum()); lift = float(P[:, 2].max() - P[0, 2]); toe = float(min(T[s]))
        ok = (mode == 'step' or (slide <= .10 and lift <= .02 and toe >= -.02)) and TW[s] <= 90; bad += 0 if ok else 1
        print(('ok   ' if ok else 'FAIL ') + '%s %s leg %s: ' % (tag, c, s) + ('' if mode == 'step' else 'slides %.3f along the ground (limit 0.10), lifts %.3f (limit 0.02), toes at %.3f (limit -0.02); ' % (slide, lift, toe)) + 'thigh and shin twisted at most %.0f degrees (limit 90)' % TW[s])
print('BAD', bad)
