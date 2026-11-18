# spearcheck.py IN.npz   (IN.npz from weapdump.py with spear_hold_idle and spear_stab held as gear-spear)
# 3D.213 (owner, 18 Nov): "Can the left hand be an underhand hold on the spear? ... hold the spear more closer to the middle of the spear.
# For the stab, the path of the stab should be more straight." Checked at every moment of both spear clips:
#   - underhand: the left palm faces up (its direction at least 45 degrees above level; on this rig the palm is the +X side of hand.L);
#   - the back hand is at least 0.25 from the spear's butt end, and the front hand at least 0.10 short of the blade's end;
#   - the stab's thrust (the moments where the spear moves forward fastest, 30% to 46% of the clip): the spear tip stays within 1 cm of
#     one straight line and the spear's angle changes by at most 3 degrees.
# Prints "ok"/"FAIL" per rule and clip, then "BAD n".
import sys, numpy as np
d = np.load(sys.argv[1], allow_pickle=True); B = list(d['bones']); bad = 0
def mid(J, b): return (J[B.index(b)][:3] + J[B.index(b)][3:]) / 2
for c in ('spear_hold_idle', 'spear_stab'):
    if 'V:' + c not in d.files: print('FAIL ' + c + ': not in the file'); bad += 1; continue
    V = d['V:' + c]; nb = int(d['NB:' + c]); J = d['J:' + c]; D = d['D:' + c]; n = len(V)
    under = []; back = []; front = []; tips = []
    for i in range(n):
        W = V[i][nb:]; cen = W.mean(0); u, s, vt = np.linalg.svd(W - cen); ax = vt[0]
        t = (W - cen) @ ax; w = np.linalg.norm((W - cen) - np.outer(t, ax), axis=1)
        if (t > t.max() - .35).sum() < (t < t.min() + .35).sum(): ax = -ax; t = -t   # the blade end (most of the spear's points: the blade and its binding) is at +ax
        head = t.max(); hl = mid(J[i], 'hand.L'); hr = mid(J[i], 'hand.R')
        under.append(float(d['PL:' + c][i][2])); back.append(float((hr - cen) @ ax - t.min())); front.append(float(head - (hl - cen) @ ax))
        tips.append(cen + ax * head)
    a_up = np.degrees(np.arcsin(np.clip(under, -1, 1))); ok = a_up.min() >= 45
    print(('ok   ' if ok else 'FAIL ') + c + ': an underhand hold (the left palm faces %.0f to %.0f degrees above level; at least 45)' % (a_up.min(), a_up.max())); bad += 0 if ok else 1
    ok = min(back) >= .25 and min(front) >= .10
    print(('ok   ' if ok else 'FAIL ') + c + ': the hands towards the middle (back hand %.2f to %.2f from the butt, at least 0.25; front hand at least %.2f short of the tip, at least 0.10)' % (min(back), max(back), min(front))); bad += 0 if ok else 1
    if c == 'spear_stab':
        i0, i1 = int(.30 * (n - 1)), int(.46 * (n - 1)); T = np.array(tips[i0:i1 + 1]); c0 = T.mean(0); u, s, vt = np.linalg.svd(T - c0); a_ = vt[0]
        dev = float(np.linalg.norm((T - c0) - np.outer((T - c0) @ a_, a_), axis=1).max()); up = np.degrees(np.arcsin(np.clip(np.abs(D[i0:i1 + 1, 2]), 0, 1)))
        ok = dev <= .01 and up.max() - up.min() <= 3
        print(('ok   ' if ok else 'FAIL ') + c + ': a straight thrust (the tip moves %.2f, at most %.3f off one straight line, limit 0.010; the spear\'s angle %.0f to %.0f degrees, limit 3 apart)' % (np.linalg.norm(T[-1] - T[0]), dev, up.min(), up.max())); bad += 0 if ok else 1
print('BAD %d' % bad)
