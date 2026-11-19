#!/bin/sh
# tools/qa/fire_check.sh — 3D.225 (owner, 19 Nov, W115: "1 for long gun, yes to pistol plan"): the two firing movements.
# gun_fire (rifle, assault rifle, shotgun, SMG, bow, crossbow) is a man aiming a long gun (CMU 79_96); pistol_fire (pistol, revolver, magnum) the
# same body with the pistol in both hands. Each shot replays the clip, so it must start and end in the same aim. Checked on both models, at 31 moments:
#   - the gun is never inside the head, and never inside the body away from the hands (tools/art/b3d/bodyhit.py; the rifle's butt and the
#     arms holding it are in contact on purpose, so only the trunk and legs count for the rifle);
#   - the aim: the gun points straight ahead (within 8 degrees sideways) and level (within 4 degrees) at the start and the end, and the recoil
#     lifts the muzzle at least 4 degrees (at most 20) in between;
#   - it loops: every joint ends within 1 cm of where it started;
#   - the feet stand where the gun stance (gun_hold_idle) has them (each ankle within 3 cm), so starting to fire does not slide them;
#   - both hands on the gun: each hand's middle within 6 cm of the gun.
set -e; cd "$(dirname "$0")/../.."; T=$(mktemp -d); bad=0
for m in m3 f3; do
  node tools/art/decomp.mjs assets/characters/ai3d_v2/survivor_$m.glb $T/$m.glb >/dev/null
  python3 tools/art/b3d/weapdump.py $T/$m.glb $T/r$m.npz 31 "gun_hold_idle:rifle,gun_fire:rifle" >/dev/null 2>&1
  python3 tools/art/b3d/weapdump.py $T/$m.glb $T/p$m.npz 31 "pistol_fire:pistol" >/dev/null 2>&1
  python3 - "$T/r$m.npz" "$T/p$m.npz" "$m" <<'P' || bad=1
import numpy as np, sys
r = np.load(sys.argv[1], allow_pickle=True); p = np.load(sys.argv[2], allow_pickle=True); m = sys.argv[3]; bad = 0
B = list(r['bones']); mid = lambda J, b: (J[B.index(b)][:3] + J[B.index(b)][3:]) / 2
def say(ok, msg):
    global bad
    bad += 0 if ok else 1; print(('ok   ' if ok else 'FAIL ') + m + ' ' + msg)
st = r['J:gun_hold_idle'][0]
for d, c in ((r, 'gun_fire'), (p, 'pistol_fire')):
    M = d['M:' + c]; n = int((M[:, 1] < M[:, 0]).sum()); say(n == 0, c + ': the gun nearest %.3f from the head centre (radius %.3f), inside the head at %d of %d moments' % (M[:, 1].min(), M[:, 0].mean(), n, len(M)))
    D = d['D:' + c]; J = d['J:' + c]; V = d['V:' + c]; nb = int(d['NB:' + c])
    fw = np.array([0, -1., 0]); s = 1 if (D[0] @ fw) > 0 else -1; Dn = D * s
    side = np.degrees(np.arctan2(np.abs(Dn[[0, -1], 0]), -Dn[[0, -1], 1])).max(); up = np.degrees(np.arcsin(np.clip(Dn[:, 2], -1, 1))); kick = up.max() - up[[0, -1]].mean()
    say(side <= 8 and abs(up[0]) <= 4 and abs(up[-1]) <= 4, c + ': aimed straight ahead (%.1f degrees off to the side) and level (%.1f / %.1f degrees at the start / end)' % (side, up[0], up[-1]))
    say(4 <= kick <= 20, c + ': the recoil lifts the muzzle %.1f degrees (4 to 20)' % kick)
    lp = np.abs(J[0] - J[-1]).max(); say(lp <= .01, c + ': it loops (every joint ends within %.4f of its start, limit 0.010)' % lp)
    fe = max(np.linalg.norm(J[0][B.index('foot.' + s_)][:3] - st[B.index('foot.' + s_)][:3]) for s_ in 'LR'); say(fe <= .03, c + ': the feet where the gun stance has them (%.3f off, limit 0.030)' % fe)
    W = V[:, nb:]; hd = max(np.linalg.norm(W[i] - mid(J[i], 'hand.' + s_), axis=1).min() for i in range(len(J)) for s_ in 'LR'); say(hd <= .06, c + ': both hands on the gun (each hand within %.3f of it, limit 0.060)' % hd)
sys.exit(1 if bad else 0)
P
  python3 tools/art/b3d/bodyhit.py $T/r$m.npz RL | sed "s/^\(ok   \|FAIL \)/\1$m /" > $T/b1.txt; grep -v ^BAD $T/b1.txt; grep -q "^BAD 0" $T/b1.txt || bad=1
  python3 tools/art/b3d/bodyhit.py $T/p$m.npz RL | sed "s/^\(ok   \|FAIL \)/\1$m /" > $T/b2.txt; grep -v ^BAD $T/b2.txt; grep -q "^BAD 0" $T/b2.txt || bad=1
done; rm -rf $T; [ $bad = 0 ] && echo "ALL OK" || { echo FAILED; exit 1; }
