"""2D skeletons (COCO-18, in sprite pixels on the 64x64 base) for PixelLab animate_with_skeleton_v3.

Because we write the skeleton for every frame, the wrist and elbow of the weapon hand are known exactly,
so an equipped weapon can be attached to the hand on every frame (equip_exact).
Views: 'se' (facing down-right) and 'ne' (facing up-right); SW/NW are mirrors.
"""
import math

BASE = {
    'se': {'NOSE': (36.5, 29.5), 'NECK': (33.5, 33), 'RIGHT EYE': (32.5, 27), 'LEFT EYE': (38.8, 27),
           'RIGHT EAR': (23.5, 27), 'LEFT EAR': (41.5, 26),
           'RIGHT SHOULDER': (23, 36), 'RIGHT ELBOW': (22, 40.5), 'RIGHT ARM': (23.5, 44.5),
           'LEFT SHOULDER': (39, 36), 'LEFT ELBOW': (40, 40), 'LEFT ARM': (40.5, 43),
           'RIGHT HIP': (28.5, 47), 'RIGHT KNEE': (27, 52), 'RIGHT LEG': (26.5, 56.5),
           'LEFT HIP': (34.5, 47), 'LEFT KNEE': (36, 52), 'LEFT LEG': (36.5, 56)},
    'ne': {'NOSE': (36, 28.5), 'NECK': (31.5, 32.5), 'RIGHT EYE': (37, 27), 'LEFT EYE': (33, 27),
           'RIGHT EAR': (39, 27.5), 'LEFT EAR': (24, 27),
           'RIGHT SHOULDER': (38.5, 36), 'RIGHT ELBOW': (38.5, 40.5), 'RIGHT ARM': (39, 44.5),
           'LEFT SHOULDER': (23, 36), 'LEFT ELBOW': (22.5, 40), 'LEFT ARM': (23, 43),
           'RIGHT HIP': (34.5, 47), 'RIGHT KNEE': (35.5, 52), 'RIGHT LEG': (35.5, 57.5),
           'LEFT HIP': (28, 47), 'LEFT KNEE': (27, 52), 'LEFT LEG': (26.5, 56.5)},
}
FWD = {'se': (1.0, .5), 'ne': (1.0, -.5)}
UPPER = ['NOSE', 'NECK', 'RIGHT EYE', 'LEFT EYE', 'RIGHT EAR', 'LEFT EAR', 'RIGHT SHOULDER', 'RIGHT ELBOW', 'RIGHT ARM',
         'LEFT SHOULDER', 'LEFT ELBOW', 'LEFT ARM']

def _add(p, d, s=1.0): return (p[0] + d[0] * s, p[1] + d[1] * s)

def walk(view, n=8):
    B = BASE[view]; f = FWD[view]; out = []
    for i in range(n):
        t = 2 * math.pi * i / n; s, c = math.sin(t), math.cos(t)
        P = dict(B); bob = -1.0 * abs(c)
        for k in UPPER + ['RIGHT HIP', 'LEFT HIP']: P[k] = (P[k][0], P[k][1] + bob)
        for side, sg in (('RIGHT', 1), ('LEFT', -1)):
            st = 3.6 * s * sg; lift = 2.2 * max(0.0, -c * sg)
            P[side + ' LEG'] = (B[side + ' LEG'][0] + f[0] * st, B[side + ' LEG'][1] + f[1] * st - lift)
            hip = P[side + ' HIP']; ank = P[side + ' LEG']
            P[side + ' KNEE'] = ((hip[0] + ank[0]) / 2 + f[0] * 1.4, (hip[1] + ank[1]) / 2 + f[1] * 1.4 - lift * .4)
            sw = -2.6 * s * sg
            P[side + ' ARM'] = (P[side + ' ARM'][0] + f[0] * sw, P[side + ' ARM'][1] + f[1] * sw - abs(sw) * .25)
            P[side + ' ELBOW'] = (P[side + ' ELBOW'][0] + f[0] * sw * .5, P[side + ' ELBOW'][1] + f[1] * sw * .5)
        out.append(P)
    return out

def chop(view, n=8):
    """Overhead chop with the right hand: wind-up high, hold, strike down in front, follow, recover."""
    B = BASE[view]; f = FWD[view]; out = []
    sh = B['RIGHT SHOULDER']
    up = (sh[0] - f[0] * 1.5, sh[1] - 23)                       # hand above and a little behind the head
    keys = [  # (hand, elbow offset from the shoulder->hand midpoint, body lean px forward, body drop px)
        (B['RIGHT ARM'], (0, 0), 0, 0),
        (_add(up, (0, 4)), (-f[0] * 2, 2), -1, -.5),
        (up, (-f[0] * 2.5, 2), -1.5, -1),
        (_add(sh, f, 9), (0, 2), 1, .5),
        (_add(_add(sh, f, 13), (0, 9)), (0, 1), 2, 1.5),
        (_add(_add(sh, f, 12), (0, 11)), (0, 1), 2.5, 2),
        (_add(_add(sh, f, 7), (0, 9)), (0, 1), 1, 1),
        (B['RIGHT ARM'], (0, 0), 0, 0)]
    for i in range(n):
        hand, eo, lean, drop = keys[i % len(keys)]
        P = dict(B)
        for k in UPPER: P[k] = (P[k][0] + f[0] * lean, P[k][1] + f[1] * lean + drop)
        for k in ('RIGHT HIP', 'LEFT HIP', 'RIGHT KNEE', 'LEFT KNEE'): P[k] = (P[k][0] + f[0] * lean * .4, P[k][1] + drop * .7)
        shp = P['RIGHT SHOULDER']; hd = (hand[0] + f[0] * lean, hand[1] + drop)
        P['RIGHT ARM'] = hd
        P['RIGHT ELBOW'] = ((shp[0] + hd[0]) / 2 + eo[0], (shp[1] + hd[1]) / 2 + eo[1])
        if i in (3, 4, 5):   # lunge: the left foot steps forward on the hit
            P['LEFT LEG'] = _add(B['LEFT LEG'], f, 3); P['LEFT KNEE'] = _add(P['LEFT KNEE'], f, 2.5)
        out.append(P)
    return out

def to_keypoints(P, size=64):
    return [{'label': k, 'x': round(v[0] / size, 4), 'y': round(v[1] / size, 4)} for k, v in P.items()]
