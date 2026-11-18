# gripcheck.py IN.npz [limit] : how far each hand is from the weapon's axis, and how far apart the two hands are along it (3D.207).
# For a two-handed weapon both hands must hold it: the left hand's middle at most `limit` (default 0.07; a perfect grip is 0.03, the hand's own thickness) from the line along the weapon through the right hand's middle, and the hands 3.5 cm or more apart (touching, as on a bat, is fine; on top of each other is not).
import sys, numpy as np
LIMIT = float(sys.argv[2]) if len(sys.argv) > 2 else .07; bad = 0
d = np.load(sys.argv[1], allow_pickle=True); B = list(d['bones'])
for k in sorted(x for x in d.files if x.startswith('V:')):
    c = k[2:]; V = d[k]; J = d['J:' + c]; nb = int(d['NB:' + c]) if 'NB:' + c in d.files else None
    out = []; D = d['D:' + c] if 'D:' + c in d.files else None
    for i in range(len(V)):
        hl = (J[i, B.index('hand.L'), :3] + J[i, B.index('hand.L'), 3:]) / 2; hr = (J[i, B.index('hand.R'), :3] + J[i, B.index('hand.R'), 3:]) / 2
        if D is not None and len(D) == len(V): a = D[i]   # the weapon's own line (the bat's axis: an axe or hammer head would tilt a fitted line)
        else: W = V[i, nb:]; a = np.linalg.svd(W - W.mean(0))[2][0]
        q = hl - hr; t = float(q @ a); out.append((float(np.linalg.norm(q - a * t)), 0., abs(t)))   # the left hand's middle from the line through the right hand's middle
    o = np.array(out); ok = o[:, 0].max() <= LIMIT and o[:, 2].min() >= .035; bad += 0 if ok else 1
    print(('ok   ' if ok else 'FAIL ') + c + ': both hands on the weapon:', 'the left hand at most %.3f off the line through the right hand (limit %.2f); the hands %.2f to %.2f apart along it' % (o[:, 0].max(), LIMIT, o[:, 2].min(), o[:, 2].max()))
print('BAD', bad)
