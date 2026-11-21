#!/bin/sh
# tools/qa/every_check.sh — 3D.243: the everyday group is on the ground, and the man sits with his legs open (owner, 20 Nov, W166:
# "Men sitting should be a bit manspreading. Open the leg a bit").
# For both models, in cheer, pickup, limp_walk, rescue, sit, sit_f, eat, sleep: nothing is in the ground (1.5 cm) at any moment (the old clips sank 4 to
# 10 cm); sitting and sleeping, the body rests on the ground (it hung 4 cm above it); each but pickup ends in the pose it starts in; and in the man's
# sit and eat the knees are at least 0.20 apart (they were 0.10), while the woman's stay as they were (under 0.14).
set -e; cd "$(dirname "$0")/../.."; T=$(mktemp -d); bad=0
for m in m3 f3; do
  node tools/art/decomp.mjs assets/characters/ai3d_v2/survivor_$m.glb $T/$m.glb >/dev/null
  python3 tools/art/b3d/animdump.py $T/$m.glb $T/$m.npz 25 >/dev/null 2>&1
  python3 - $T/$m.npz $m > $T/out.txt <<'P' || true
import numpy as np, sys
d = np.load(sys.argv[1], allow_pickle=True); m = sys.argv[2]; B = list(d['bones']); bad = 0
def say(ok, t):
    global bad; print(('ok   ' if ok else 'FAIL ') + m + ' ' + t); bad += (not ok)
for c in ('cheer', 'pickup', 'limp_walk', 'rescue', 'sit', 'sit_f', 'eat', 'sleep'):
    J = d['J:' + c]; V = d['V:' + c]; lo = V[:, :, 2].min(1)
    say(lo.min() >= -.015, c + ': nothing in the ground (lowest point %.3f, limit -0.015)' % lo.min())
    if c in ('sit', 'sit_f', 'eat', 'sleep'): say(lo.max() <= .05 and lo.min() <= .015, c + ': the body rests on the ground (lowest point %.3f to %.3f)' % (lo.min(), lo.max()))
    if c != 'pickup': e = np.abs(J[0] - J[-1]).max(); say(e <= .02, c + ': ends in the pose it starts in (%.3f apart at most, limit 0.020)' % e)
    if c in ('sit', 'eat'):
        k = np.linalg.norm(J[:, B.index('thigh.L'), 3:6] - J[:, B.index('thigh.R'), 3:6], axis=1).min()
        if m == 'm3': say(k >= .20, c + ': the man sits with his knees apart (%.3f, at least 0.20)' % k)
        else: say(k < .14, c + ': the woman sits as before (knees %.3f apart, under 0.14)' % k)
print('BAD', bad)
P
  grep -v ^BAD $T/out.txt; grep -q "^BAD 0" $T/out.txt || bad=1
done; rm -rf $T; [ $bad = 0 ] && echo "ALL OK" || { echo FAILED; exit 1; }
