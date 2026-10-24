#!/usr/bin/env python3
"""Colour-block model guide for the 56-tile Hospital (2x2), v2: a wide, low two-storey clinic block at the back, the entrance
on its front-left wall with a red canopy on posts, a parked ambulance along its front-right side, a stretcher in the yard and a
red-cross sign on the roof. (u runs up-right, v down-right; the front-left wall is the u0 face.)"""
import sys
sys.path.insert(0, 'tools/art')
from guide_2x2 import guide

CONC, WALL, ROOF, SIGN, DOOR, CANOPY, POST, VAN, CAB, STRETCH = ((150, 150, 145), (225, 220, 205), (110, 105, 100),
    (235, 230, 220), (90, 120, 140), (200, 70, 60), (180, 180, 180), (230, 230, 225), (200, 200, 195), (110, 140, 90))
OBJ = [  # u0,u1, v0,v1, h0,h1, colour  (2x2: u and v both 0..2, h px)
    (0, 2, 0, 2, 0, 2, CONC),                        # concrete yard
    (.8, 1.9, .1, 1.4, 2, 48, WALL),                 # two-storey block at the back
    (.8, 1.9, .1, 1.4, 48, 51, ROOF),                # flat roof
    (.86, .92, .4, 1.1, 51, 67, SIGN),               # red-cross sign board on the roof's front edge, facing front-left
    (.75, .8, .4, 1.0, 2, 30, DOOR),                 # wide double doors on the front-left wall
    (.42, .8, .3, 1.1, 30, 34, CANOPY),              # red entrance canopy on two posts
    (.44, .49, .32, .37, 2, 30, POST),
    (.44, .49, 1.03, 1.08, 2, 30, POST),
    (.95, 1.75, 1.5, 1.9, 2, 22, VAN),               # ambulance along the front-right side: box body
    (.8, .95, 1.53, 1.87, 2, 16, CAB),               # and its cab
    (.1, .3, .5, 1.0, 2, 8, STRETCH),                # stretcher in the yard
]
if __name__ == '__main__':
    guide(OBJ, sys.argv[1] if len(sys.argv) > 1 else 'tools/art/templates/t56/model_guide_2x2_hospital.png')
