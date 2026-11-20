#!/bin/sh
# tools/qa/punch_shove_check.sh — 3D.237: punch and shove are the old hand-made clips, corrected (owner, 19 Nov: the recorded ones of 3D.236 were "not good
# at all"; "go back to the old one and just make that better"; the shove: "arm come near body elbow bent down and then arm straight as a push, body lean
# forward. one leg step in as the shove happen").
# For both models. Both clips: no foot in the ground (1.5 cm; the old punch sank 11 to 12 cm, the old shove 4), the clip ends in the pose it starts in, no
# hand inside the head. Punch: the old lunge is kept (the head drops at least 15% of the body height) and the right fist goes at least 0.20 in front of the
# chest. Shove: first the hands come in to the chest (each within 0.17 of its shoulder, the elbow below the hand's shoulder); then both arms are straight
# (elbow at least 160 degrees) with the hands at least 0.22 in front of the shoulders, level with each other and at chest height (below the head, above the
# hips); the body leans forward (the chest's top at least 0.05 in front of its base); and one leg has stepped in (the feet at least 0.10 further apart, front to back, than at the start).
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
def ang(a, b, c): u = a - b; v = c - b; return np.degrees(np.arccos(np.clip(u @ v / np.linalg.norm(u) / np.linalg.norm(v), -1, 1)))
for c in ('punch', 'shove'):
    J = d['J:' + c]; V = d['V:' + c]; ch = J[:, B.index('chest'), 3:]; H = J[0, B.index('head'), 3:][2]; hd = mid(J, 'head')
    S = {s_: J[:, B.index('upperarm.' + s_), :3] for s_ in 'LR'}; E = {s_: J[:, B.index('forearm.' + s_), :3] for s_ in 'LR'}; Wr = {s_: J[:, B.index('hand.' + s_), :3] for s_ in 'LR'}
    z = V[:, :, 2].min(); say(z >= -.015, c + ': no foot in the ground (lowest point %.3f, limit -0.015)' % z)
    e = np.abs(J[0] - J[-1]).max(); say(e <= .02, c + ': ends in the pose it starts in (%.3f apart at most, limit 0.020)' % e)
    dh = min(np.linalg.norm(mid(J, h) - hd, axis=1).min() for h in ('hand.R', 'hand.L')); say(dh >= .12, c + ': no hand in the head (%.3f from its centre at least, limit 0.120)' % dh)
    if c == 'punch':
        fr = -(mid(J, 'hand.R') - ch)[:, 1]; say(fr.max() >= .20, c + ': the right fist goes %.3f in front of the chest (at least 0.200)' % fr.max())
        dr = (hd[0, 2] - hd[:, 2].min()) / H; say(dr >= .15, c + ': the old lunge is kept (the head drops %.0f%% of the body height, at least 15)' % (dr * 100))
    else:
        fw = np.minimum(-(Wr['L'] - S['L'])[:, 1], -(Wr['R'] - S['R'])[:, 1]); k = int(fw.argmax()); n_ = len(J); pre = range(0, k)
        near = [max(np.linalg.norm(Wr[s_][i] - S[s_][i]) for s_ in 'LR') for i in pre]; i0 = int(np.argmin(near))
        say(near[i0] <= .17, c + ': first the hands come in to the chest (%.3f from the shoulders at most, limit 0.170)' % near[i0])
        say(all(E[s_][i0, 2] < S[s_][i0, 2] - .05 for s_ in 'LR'), c + ': with the elbows bent and down')
        a_ = min(ang(S[s_][k], E[s_][k], Wr[s_][k]) for s_ in 'LR'); say(a_ >= 160, c + ': then both arms are straight (%.0f degrees at the elbow, at least 160)' % a_)
        say(fw[k] >= .22, c + ': the hands push %.3f in front of the shoulders (at least 0.220)' % fw[k])
        say(abs(Wr['L'][k, 2] - Wr['R'][k, 2]) <= .05, c + ': the two hands push at the same height')
        hz = (Wr['L'][k, 2] + Wr['R'][k, 2]) / 2; say(J[k, B.index('pelvis'), 2] < hz < hd[k, 2] - .08, c + ': at chest height')
        cb = J[k, B.index('chest')]; say(cb[1] - cb[4] >= .05, c + ': the body leans forward into the push (chest top %.3f in front of its base, at least 0.050)' % (cb[1] - cb[4]))
        gap = np.abs(J[:, B.index('foot.L'), 1] - J[:, B.index('foot.R'), 1]); st = gap.max() - gap[0]; say(st >= .10, c + ': one leg steps in as the push happens (the feet %.3f further apart front to back, at least 0.100)' % st)
print('BAD', bad)
P
  grep -v ^BAD $T/out.txt; grep -q "^BAD 0" $T/out.txt || bad=1
done; rm -rf $T; [ $bad = 0 ] && echo "ALL OK" || { echo FAILED; exit 1; }
