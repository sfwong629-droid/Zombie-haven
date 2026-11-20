#!/bin/sh
# tools/qa/punch_shove_check.sh — 3D.236: punch and shove are recordings of real people (owner's picks, W157: CMU 02_05 and 81_10).
# For both models: the punch throws the right fist straight forward at chest height or above (at least 0.20 in front of the chest), the shove puts both hands
# forward together (each at least 0.17, within 0.10 of each other in height); each clip ends in the pose it starts in; no foot sinks in the ground (2 cm);
# no hand inside the head; and the old deep lunge is gone (the head never drops more than 12% of the body height; the old punch dropped a quarter).
set -e; cd "$(dirname "$0")/../.."; T=$(mktemp -d); bad=0
for m in m3 f3; do
  node tools/art/decomp.mjs assets/characters/ai3d_v2/survivor_$m.glb $T/$m.glb >/dev/null
  python3 tools/art/b3d/animdump.py $T/$m.glb $T/$m.npz 17 >/dev/null 2>&1
  python3 - $T/$m.npz $m > $T/out.txt <<'P' || true
import numpy as np, sys
d = np.load(sys.argv[1], allow_pickle=True); m = sys.argv[2]; B = list(d['bones']); bad = 0
def say(ok, t):
    global bad; print(('ok   ' if ok else 'FAIL ') + m + ' ' + t); bad += (not ok)
mid = lambda J, b: (J[:, B.index(b), :3] + J[:, B.index(b), 3:]) / 2
for c in ('punch', 'shove'):
    J = d['J:' + c]; V = d['V:' + c]; ch = J[:, B.index('chest'), 3:]; H = J[0, B.index('head'), 3:][2]
    fr = -(mid(J, 'hand.R') - ch)[:, 1]; fl = -(mid(J, 'hand.L') - ch)[:, 1]; i = int(fr.argmax())
    if c == 'punch':
        say(fr.max() >= .20, c + ': the right fist goes %.3f in front of the chest (at least 0.200)' % fr.max())
        say(mid(J, 'hand.R')[i, 2] >= J[i, B.index('chest'), 2], c + ': the fist lands at chest height or above')
    else:
        k = int(np.minimum(fr, fl).argmax()); say(min(fr[k], fl[k]) >= .17, c + ': both hands go forward together (%.3f and %.3f, at least 0.170)' % (fr[k], fl[k]))
        say(abs(mid(J, 'hand.R')[k, 2] - mid(J, 'hand.L')[k, 2]) <= .10, c + ': the two hands push at the same height')
    e = np.abs(J[0] - J[-1]).max(); say(e <= .02, c + ': ends in the pose it starts in (%.3f apart at most, limit 0.020)' % e)
    z = V[:, :, 2].min(); say(z >= -.02, c + ': no foot in the ground (lowest point %.3f, limit -0.020)' % z)
    hd = mid(J, 'head'); dh = min(np.linalg.norm(mid(J, h) - hd, axis=1).min() for h in ('hand.R', 'hand.L')); say(dh >= .12, c + ': no hand in the head (%.3f from its centre at least, limit 0.120)' % dh)
    dr = (hd[0, 2] - hd[:, 2].min()) / H; say(dr <= .12, c + ': the head drops %.0f%% of the body height at most (limit 12)' % (dr * 100))
print('BAD', bad)
P
  grep -v ^BAD $T/out.txt; grep -q "^BAD 0" $T/out.txt || bad=1
done; rm -rf $T; [ $bad = 0 ] && echo "ALL OK" || { echo FAILED; exit 1; }
