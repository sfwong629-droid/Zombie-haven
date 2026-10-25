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
OBJ += [(.15, 1.15, v, v + .16, 2, 4, SOIL) for v in (.2, .5, .8, 1.1, 1.4)]           # tilled rows
OBJ += [(.2, 1.1, v + .03, v + .13, 4, 8, CROP) for v in (.2, .5, .8, 1.1, 1.4)]       # crops on them
OBJ += [(1.35, 1.9, .1, .9, 2, 30, BARN), (1.33, 1.92, .08, .92, 30, 34, BROOF)]        # small barn, back corner
OBJ += [(1.4, 1.75, 1.45, 1.65, 2, 7, TROUGH)]                                          # water trough
OBJ += [(1.25, 1.29, 1.05, 1.09, 2, 30, FENCE), (1.25, 1.29, .95, 1.19, 22, 25, STRAW), # scarecrow: pole, arms
        (1.24, 1.30, 1.04, 1.10, 25, 31, STRAW)]                                         # and head
OBJ += [(0, 2, 0, t, 2, 9, FENCE), (2 - t, 2, 0, 2, 2, 9, FENCE),                        # low fence all round
        (0, t, 0, 2, 2, 9, FENCE), (0, 2, 2 - t, 2, 2, 9, FENCE)]
FAR = OBJ[-4:-2]; NEAR = OBJ[-2:]
ORDER = [OBJ[0]] + FAR + [o for o in OBJ[1:-4]] + NEAR
ORDER = [ORDER[0]] + FAR + sorted([o for o in OBJ[1:-4]], key=lambda o: (o[5] > 8, (o[2] + o[3]) / 2 - (o[0] + o[1]) / 2)) + NEAR
if __name__ == '__main__':
    guide(OBJ, sys.argv[1] if len(sys.argv) > 1 else 'tools/art/templates/t56/model_guide_2x2_field.png', order=ORDER)
