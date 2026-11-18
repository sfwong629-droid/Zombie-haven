# spearcheck.py IN.npz   (IN.npz from weapdump.py with spear_hold_idle and spear_stab held as gear-spear)
# 3D.213 (owner, 18 Nov): "Can the left hand be an underhand hold on the spear? ... hold the spear more closer to the middle of the spear.
# For the stab, the path of the stab should be more straight." Checked at every moment of both spear clips:
#   - underhand: the left palm faces up (its direction at least 45 degrees above level; on this rig the palm is the +X side of hand.L);
#   - the back hand is at least 0.25 from the spear's butt end, and the front hand at least 0.10 short of the blade's end;
#   - the stab's thrust (the moments where the spear moves forward fastest, 30% to 46% of the clip): the spear tip stays within 1 cm of
#     one straight line and the spear's angle changes by at most 3 degrees. (3D.214) The thrust is found from the tip's own path.
#   - (3D.214, owner: "it feels like a little poke") a strong thrust: the tip driven at least 0.38 forward, 10% to 90% of it within 0.15 s.
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
    if c == 'spear_stab':   # the thrust: from the tip's furthest point back to its furthest point forward, along the line it is driven
        T_all = np.array(tips); i1 = int(np.argmax(np.linalg.norm(T_all - T_all[0], axis=1)))   # the moment the tip is furthest from where it starts: the hit
        a_ = D[i1] * (1 if (T_all[i1] - T_all[0]) @ D[i1] > 0 else -1); prog = (T_all - T_all[0]) @ a_; i1 = int(np.argmax(prog)); i0 = int(np.argmin(prog[:i1 + 1]))   # along the spear's own line at the hit; from the furthest back to the furthest forward
        T = T_all[i0:i1 + 1]; c0 = T.mean(0); u, s, vt = np.linalg.svd(T - c0); l_ = vt[0]
        dev = float(np.linalg.norm((T - c0) - np.outer((T - c0) @ l_, l_), axis=1).max()); up = np.degrees(np.arcsin(np.clip(np.abs(D[i0:i1 + 1, 2]), 0, 1)))
        ok = dev <= .01 and up.max() - up.min() <= 3
        print(('ok   ' if ok else 'FAIL ') + c + ': a straight thrust (the tip at most %.3f off one straight line, limit 0.010; the spear\'s angle %.0f to %.0f degrees, limit 3 apart)' % (dev, up.min(), up.max())); bad += 0 if ok else 1
        # 3D.214 (owner: "the stab should feel a bit stronger. it feels like a little poke"): a long, fast drive
        F = d['F:' + c]; dt = (F[1] - F[0]) / F[2] / (n - 1); pr = prog[i0:i1 + 1] - prog[i0]; L = float(pr[-1])
        k10 = int(np.argmax(pr >= .1 * L)); k90 = int(np.argmax(pr >= .9 * L)); tdrive = (k90 - k10) * dt
        ok = L >= .38 and tdrive <= .15
        print(('ok   ' if ok else 'FAIL ') + c + ': a strong thrust (the tip driven %.2f forward, at least 0.38; most of it in %.2f s, at most 0.15)' % (L, tdrive)); bad += 0 if ok else 1
print('BAD %d' % bad)
