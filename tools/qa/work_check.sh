#!/bin/sh
# tools/qa/work_check.sh — 3D.242: the work group stands on the ground (owner, 20 Nov, W165: "they are fine keep them").
# For both models, in work_chop, work_hammer, work_dig, work_tinker and work_barricade: nothing is in the ground (1.5 cm) at any moment (the old clips
# sank 2 to 5 cm), and each ends in the pose it starts in (hammer and barricade used to jump 4 to 7 cm at every repeat).
set -e; cd "$(dirname "$0")/../.."; T=$(mktemp -d); bad=0
for m in m3 f3; do
  node tools/art/decomp.mjs assets/characters/ai3d_v2/survivor_$m.glb $T/$m.glb >/dev/null
  python3 tools/art/b3d/animdump.py $T/$m.glb $T/$m.npz 25 >/dev/null 2>&1
  python3 - $T/$m.npz $m > $T/out.txt <<'P' || true
import numpy as np, sys
d = np.load(sys.argv[1], allow_pickle=True); m = sys.argv[2]; B = list(d['bones']); bad = 0
def say(ok, t):
    global bad; print(('ok   ' if ok else 'FAIL ') + m + ' ' + t); bad += (not ok)
for c in ('work_chop', 'work_hammer', 'work_dig', 'work_tinker', 'work_barricade'):
    J = d['J:' + c]; V = d['V:' + c]; lo = V[:, :, 2].min(1); hz = (J[:, B.index('head'), 2] + J[:, B.index('head'), 5]) / 2
    say(lo.min() >= -.015, c + ': nothing in the ground (lowest point %.3f, limit -0.015)' % lo.min())
    if c in ('knockdown', 'collapse'):
        lie = (J[:, B.index('pelvis'), 2] < .21) & (J[:, B.index('chest'), 5] < .21);   # flat on the ground: hips and chest both low
        say(lie.any() and np.median(lo[lie]) <= .02, c + ': lying down, the body rests on the ground (%.3f up at the middle moment, limit 0.020)' % (np.median(lo[lie]) if lie.any() else 9))
    if c == 'collapse': say(hz[-1] < .30, c + ': ends lying down')
    else: e = np.abs(J[0] - J[-1]).max(); say(e <= .02, c + ': ends in the pose it starts in (%.3f apart at most, limit 0.020)' % e)
print('BAD', bad)
P
  grep -v ^BAD $T/out.txt; grep -q "^BAD 0" $T/out.txt || bad=1
done; rm -rf $T; [ $bad = 0 ] && echo "ALL OK" || { echo FAILED; exit 1; }
