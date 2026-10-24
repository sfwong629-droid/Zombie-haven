#!/usr/bin/env python3
"""Colour-block model guide for the 56-tile Shooting Range (2x1): Medical Tent left, model on the 2x1 footprint, farmer right.
Shooters stand at the left end behind a counter and fire along the long side at three targets at the right end."""
import sys
from PIL import Image, ImageDraw
sys.path.insert(0, 'tools/art')
from clay_model import box
from model_scrapyard import sh

DIRT, WOOD, SAND, POST, PAPER, CRATE = (150, 140, 120), (150, 100, 55), (190, 170, 120), (110, 80, 50), (235, 230, 215), (110, 120, 70)
OBJ = [  # u0,u1, v0,v1, h0,h1, colour   (u = long axis, v = short axis, h px)
    (0, 2, 0, 1, 0, 2, DIRT),                   # dirt pad
    (.12, .38, .08, .92, 2, 14, WOOD),         # shooting counter at the left end
    (1.84, 1.98, .04, .96, 2, 12, SAND),       # sandbag wall behind the targets
    (1.74, 1.78, .18, .22, 2, 16, POST),       # target posts
    (1.74, 1.78, .48, .52, 2, 16, POST),
    (1.74, 1.78, .78, .82, 2, 16, POST),
    (1.70, 1.74, .10, .30, 14, 26, PAPER),     # paper targets, facing the counter
    (1.70, 1.74, .40, .60, 14, 26, PAPER),
    (1.70, 1.74, .70, .90, 14, 26, PAPER),
    (.48, .64, .70, .90, 2, 9, CRATE),         # ammo crate
]
def render(A=(84, 69), W=198, H=86):
    m = Image.new('RGBA', (W, H), (0, 0, 0, 0)); d = ImageDraw.Draw(m)
    for o in sorted(OBJ, key=lambda o: (o[5] > 2, (o[2] + o[3]) / 2 - (o[0] + o[1]) / 2)):
        box(d, A, *o[:6], sh(o[6]))
    return m
if __name__ == '__main__':
    g = Image.open('tools/art/templates/t56/model_guide_2x1_workshop.png').convert('RGB')
    g.paste((255, 0, 255), (78 * 12, 0, 171 * 12, g.height))
    m = render().resize((198 * 12, 86 * 12), Image.NEAREST)
    g.paste(m, (0, 0), m)
    g.save(sys.argv[1] if len(sys.argv) > 1 else 'tools/art/templates/t56/model_guide_2x1_range.png')
