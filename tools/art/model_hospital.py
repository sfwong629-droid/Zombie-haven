#!/usr/bin/env python3
"""Colour-block model guide for the 56-tile Hospital (2x2): two-storey patched brick block with a flat roof, a red-cross sign
on the roof, double doors with a small canopy on the front-left wall, a generator and an IV stand outside."""
import sys
sys.path.insert(0, 'tools/art')
from guide_2x2 import guide

CONC, BRICK, ROOF, SIGN, DOOR, CANOPY, GEN, POLE = (150, 150, 145), (165, 95, 70), (110, 105, 100), (235, 230, 220), (90, 120, 140), (200, 200, 195), (110, 130, 70), (160, 160, 165)
OBJ = [  # u0,u1, v0,v1, h0,h1, colour  (2x2: u and v both 0..2, h px)
    (0, 2, 0, 2, 0, 2, CONC),                        # concrete yard
    (.15, 1.85, .15, 1.45, 2, 62, BRICK),            # two-storey block
    (.15, 1.85, .15, 1.45, 62, 65, ROOF),            # flat roof with a low parapet
    (.75, .81, .45, 1.15, 65, 83, SIGN),             # red-cross sign board on the roof, facing front-left
    (.05, .15, .55, 1.05, 2, 33, DOOR),              # double doors (porch)
    (.0, .2, .5, 1.1, 33, 36, CANOPY),               # small canopy over the doors
    (1.3, 1.75, 1.6, 1.9, 2, 15, GEN),               # generator in the front yard
    (.02, .06, 1.25, 1.29, 2, 28, POLE),             # IV stand by the door
]
if __name__ == '__main__':
    guide(OBJ, sys.argv[1] if len(sys.argv) > 1 else 'tools/art/templates/t56/model_guide_2x2_hospital.png')
