#!/usr/bin/env python3
"""Colour-block model guide for the 56-tile Barracks (2x2): a long, low army hut of plywood with a sandbag wall along its
front-right side, an open door on the front-left wall (bunk beds inside), and a small watch platform with a canopy on
the roof. Dirt yard with a sandbag ring at the front corner. No vehicles."""
import sys
sys.path.insert(0, 'tools/art')
from guide_2x2 import guide

DIRT, PLY, ROOF, SAND, DOOR, BUNK, POST, DECK, CANVAS = ((150, 140, 120), (170, 140, 95), (95, 105, 80), (195, 175, 125),
    (45, 40, 35), (120, 90, 60), (110, 80, 50), (140, 105, 65), (110, 125, 75))
HUT = [
    (.3, 1.9, .2, .95, 2, 30, PLY),                 # long, low plywood hut along the back
    (.28, 1.92, .18, .97, 30, 34, ROOF),            # flat corrugated roof, army green
]
FRONT_WALL = [
    (.25, .3, .4, .8, 2, 24, DOOR),                 # open doorway on the front-left wall (dark inside)
    (.26, .3, .45, .75, 4, 16, BUNK),               # a bunk bed seen through it
]
TOWER = [
    (1.25, 1.29, .3, .34, 34, 56, POST), (1.65, 1.69, .3, .34, 34, 56, POST),   # watch platform on the roof: back posts
    (1.25, 1.69, .3, .84, 34, 36, DECK),            # its deck
    (1.25, 1.29, .8, .84, 34, 56, POST), (1.65, 1.69, .8, .84, 34, 56, POST),   # front posts
    (1.25, 1.69, .8, .84, 43, 45, DECK), (1.25, 1.29, .3, .84, 43, 45, DECK),   # rails on the open sides
    (1.21, 1.73, .26, .88, 56, 59, CANVAS),         # canvas canopy
]
YARD = [
    (.4, 1.85, 1.0, 1.18, 2, 10, SAND),             # sandbag wall along the front-right side
    (.08, .26, 1.3, 1.85, 2, 9, SAND),              # sandbag ring at the front corner
    (.26, .7, 1.7, 1.88, 2, 9, SAND),
]
OBJ = [(0, 2, 0, 2, 0, 2, DIRT)] + HUT + FRONT_WALL + TOWER + YARD
ORDER = OBJ
if __name__ == '__main__':
    guide(OBJ, sys.argv[1] if len(sys.argv) > 1 else 'tools/art/templates/t56/model_guide_2x2_barracks.png', order=ORDER)
