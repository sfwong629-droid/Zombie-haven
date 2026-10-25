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
ROWS = (.12, .4, .68, .96, 1.24, 1.52)
OBJ += [(.1, 1.25, v, v + .22, 2, 4, SOIL) for v in ROWS]                                # six tilled rows, full length
OBJ += [(.12, 1.23, v + .02, v + .2, 4, 16, CROP) for v in ROWS]                        # tall, full crops on them
OBJ += [(1.38, 1.9, v, v + .2, 2, 4, SOIL) for v in (1.0, 1.28)]                        # two short rows in front of the barn
OBJ += [(1.4, 1.88, v + .02, v + .18, 4, 12, CROP) for v in (1.0, 1.28)]
OBJ += [(1.35, 1.9, .1, .9, 2, 30, BARN), (1.33, 1.92, .08, .92, 30, 34, BROOF)]        # small barn, back corner
OBJ += [(1.5, 1.8, 1.62, 1.85, 2, 7, TROUGH)]                                           # water trough, front corner
OBJ += [(.66, .7, .9, .94, 2, 32, FENCE), (.66, .7, .8, 1.04, 24, 27, STRAW),   # scarecrow in the middle of the crops: pole, arms
        (.65, .71, .89, .95, 27, 33, STRAW)]                                         # and head
OBJ += [(0, 2, 0, t, 2, 9, FENCE), (2 - t, 2, 0, 2, 2, 9, FENCE),                        # low fence all round
        (0, t, 0, 2, 2, 9, FENCE), (0, 2, 2 - t, 2, 2, 9, FENCE)]
FAR = OBJ[-4:-2]; NEAR = OBJ[-2:]
ORDER = [OBJ[0]] + FAR + [o for o in OBJ[1:-4]] + NEAR
ORDER = [ORDER[0]] + FAR + sorted([o for o in OBJ[1:-4]], key=lambda o: (o[5] > 8, (o[2] + o[3]) / 2 - (o[0] + o[1]) / 2)) + NEAR
if __name__ == '__main__':
    guide(OBJ, sys.argv[1] if len(sys.argv) > 1 else 'tools/art/templates/t56/model_guide_2x2_field.png', order=ORDER)
