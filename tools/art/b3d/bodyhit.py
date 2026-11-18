# bodyhit.py IN.npz [hands]   (IN.npz from weapdump.py; hands = R or RL, the hands that hold the weapon; default R)
# 3D.206 (owner, 18 Nov: "the weapons are not going through the head or body correct?"): is the weapon ever inside the body?
# For every moment: points all over the weapon's surface; a point is inside when it lies behind the body's surface at its nearest body points
# (the average outward direction of the 8 nearest body vertices), deeper than 1.5 cm. The gripping hand (or hands) close round the handle,
# so weapon points within 9 cm of a gripping hand are not counted. Prints, per clip: the moments with the weapon inside, the deepest point and the body part.
import sys, numpy as np
from scipy.spatial import cKDTree
d = np.load(sys.argv[1], allow_pickle=True); hands = sys.argv[2] if len(sys.argv) > 2 else 'R'; B = list(d['bones'])
PART = {'pelvis': 'hips', 'chest': 'chest', 'neck': 'neck', 'head': 'head', 'upperarm.L': 'left upper arm', 'forearm.L': 'left forearm', 'hand.L': 'left hand', 'fingers.L': 'left hand',
        'upperarm.R': 'right upper arm', 'forearm.R': 'right forearm', 'hand.R': 'right hand', 'fingers.R': 'right hand', 'thigh.L': 'left thigh', 'shin.L': 'left shin', 'foot.L': 'left foot',
        'thigh.R': 'right thigh', 'shin.R': 'right shin', 'foot.R': 'right foot', 'gun': 'hips'}
bad = 0
for k in sorted(x for x in d.files if x.startswith('V:')):
    c = k[2:]; V = d[k]; T = d['T:' + c]; nb = int(d['NB:' + c]); J = d['J:' + c]
    tb = T[(T < nb).all(1)]; tw = T[(T >= nb).all(1)]; worst = (0., -1, ''); hits = 0
    for i in range(len(V)):
        Vb = V[i, :nb]; Vw = V[i, nb:]
        P = np.concatenate([Vw, V[i][tw].mean(1)])   # weapon vertices and triangle centres
        a, b_, c_ = Vb[tb[:, 0]], Vb[tb[:, 1]], Vb[tb[:, 2]]; fn = np.cross(b_ - a, c_ - a); N = np.zeros_like(Vb)
        for j in range(3): np.add.at(N, tb[:, j], fn)
        N /= np.maximum(np.linalg.norm(N, axis=1, keepdims=True), 1e-12)
        keep = np.ones(len(P), bool)
        for h in hands:
            for bn in ('hand.' + h, 'fingers.' + h):
                q = J[i, B.index(bn)]; keep &= np.linalg.norm(P - q[3:6], axis=1) > .09; keep &= np.linalg.norm(P - q[0:3], axis=1) > .09
        P = P[keep]
        if not len(P): continue
        dist, idx = cKDTree(Vb).query(P, k=8); n = N[idx].mean(1); n /= np.maximum(np.linalg.norm(n, axis=1, keepdims=True), 1e-12)
        depth = -((P - Vb[idx].mean(1)) * n).sum(1); depth[dist[:, 0] > .15] = 0   # far from the body: outside
        j = int(depth.argmax())
        if depth[j] > .015:
            hits += 1
            if depth[j] > worst[0]:
                p = P[j]; seg = [np.linalg.norm(p - (J[i, q, :3] + np.clip(((p - J[i, q, :3]) @ (J[i, q, 3:] - J[i, q, :3])) / max(1e-9, np.sum((J[i, q, 3:] - J[i, q, :3]) ** 2)), 0, 1) * (J[i, q, 3:] - J[i, q, :3]))) for q in range(len(B))]
                worst = (float(depth[j]), i, PART.get(B[int(np.argmin(seg))], B[int(np.argmin(seg))]))
    bad += hits
    print(('ok   ' if not hits else 'FAIL ') + c + ': weapon inside the body at %d of %d moments' % (hits, len(V)) + (' (deepest %.0f cm, the %s, at moment %d)' % (worst[0] * 100, worst[2], worst[1]) if hits else ''))
print('BAD', bad)
