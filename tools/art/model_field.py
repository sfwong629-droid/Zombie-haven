#!/usr/bin/env python3
"""Colour-block model guide for the 56-tile Farm (2x2): a fenced field of crop rows, a small barn on the back corner, a water
trough and a scarecrow. Low, so the rows stay readable."""
import sys
sys.path.insert(0, 'tools/art')
from guide_2x2 import guide

DIRT, SOIL, CROP, FENCE, BARN, BROOF, TROUGH, STRAW = ((150, 140, 120), (120, 85, 55), (110, 150, 60), (150, 110, 65),
    (170, 60, 45), (90, 80, 75), (120, 130, 140), (210, 180, 90))
t = .03
OBJ = [(0, 2, 0, 2, 0, 2, DIRT)]
ROWS = (.15, .7, 1.25)
OBJ += [(.12, 1.25, v, v + .4, 2, 4, SOIL) for v in ROWS]                                 # three wide beds
OBJ += [(u, u + .3, v + .05, v + .35, 4, 20, CROP) for v in ROWS for u in (.15, .55, .9)]  # three BIG plants per bed
OBJ += [(1.4, 1.88, 1.0, 1.4, 2, 4, SOIL), (1.45, 1.8, 1.05, 1.35, 4, 14, CROP)]           # one bed in front of the barn
OBJ += [(1.35, 1.9, .1, .9, 2, 30, BARN), (1.33, 1.92, .08, .92, 30, 34, BROOF)]        # small barn, back corner
OBJ += [(1.5, 1.8, 1.62, 1.85, 2, 7, TROUGH)]                                           # water trough, front corner
OBJ += [(.66, .7, .9, .94, 2, 32, FENCE), (.66, .7, .8, 1.04, 24, 27, STRAW),   # scarecrow in the middle of the crops: pole, arms
        (.65, .71, .89, .95, 27, 33, STRAW)]                                         # and head
# low fence ON the footprint edge: posts every quarter tile and two rails, so ChatGPT copies its exact outline
POSTS = [(s, s + .05, e, e + .05) for s in [i * .25 for i in range(8)] + [1.95] for e in (0, 1.95)]
POSTS += [(e, e + .05, s, s + .05) for s in [i * .25 for i in range(1, 8)] for e in (0, 1.95)]
def rails(u0, u1, v0, v1): return [(u0, u1, v0, v1, 4, 5, FENCE), (u0, u1, v0, v1, 8, 9, FENCE)]
FAR = rails(0, 2, 0, t) + rails(2 - t, 2, 0, 2) + [(a, b, c, d, 2, 11, FENCE) for (a, b, c, d) in POSTS if c < .1 or a > 1.9]
NEAR = rails(0, t, 0, 2) + rails(0, 2, 2 - t, 2) + [(a, b, c, d, 2, 11, FENCE) for (a, b, c, d) in POSTS if not (c < .1 or a > 1.9)]
OBJ += FAR + NEAR
MID = [o for o in OBJ[1:] if o not in FAR and o not in NEAR]
DEPTH = lambda o: (o[2] + o[3]) / 2 - (o[0] + o[1]) / 2
ORDER = [OBJ[0]] + FAR + sorted(MID, key=lambda o: (o[5] > 8, DEPTH(o))) + sorted(NEAR, key=DEPTH)
K = .82   # ChatGPT paints this busy field 20-30% past the model (3 tries: 137, 143, 136 px for a 112 px tile), so the model is drawn 82% size about the tile centre
def shrink(o): u0, u1, v0, v1, h0, h1, c = o; f = lambda s: 1 + (s - 1) * K; return (f(u0), f(u1), f(v0), f(v1), round(h0 * K) if h0 > 2 else h0, round(h1 * K) if h1 > 2 else h1, c)
if __name__ == '__main__':
    out = sys.argv[1] if len(sys.argv) > 1 else 'tools/art/templates/t56/model_guide_2x2_field.png'
    guide([shrink(o) for o in OBJ], out, order=[shrink(o) for o in ORDER])
