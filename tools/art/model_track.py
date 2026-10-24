#!/usr/bin/env python3
"""Colour-block model guide for the 56-tile Obstacle Course (2x1): tyres to step through, a hurdle, a rope net, a climbing wall,
laid out along the long side. Medical Tent left, model on the 2x1 footprint, farmer right."""
import sys
from PIL import Image, ImageDraw
sys.path.insert(0, 'tools/art')
from clay_model import box
from model_scrapyard import sh

DIRT, TYRE, WOOD, ROPE, PLANK = (150, 140, 120), (55, 55, 60), (130, 90, 50), (200, 175, 110), (165, 115, 65)
OBJ = [  # u0,u1, v0,v1, h0,h1, colour   (u = long axis, v = short axis, h px)
    (0, 2, 0, 1, 0, 2, DIRT),                   # dirt pad
    (.12, .34, .14, .42, 2, 5, TYRE),           # tyres lying flat
    (.12, .34, .58, .86, 2, 5, TYRE),
    (.42, .64, .36, .64, 2, 5, TYRE),
    (.86, .9, .12, .16, 2, 11, WOOD),           # hurdle: two posts and a bar
    (.86, .9, .84, .88, 2, 11, WOOD),
    (.86, .9, .12, .88, 9, 12, WOOD),
    (1.30, 1.34, .08, .12, 2, 22, WOOD),        # rope net between two posts
    (1.30, 1.34, .88, .92, 2, 22, WOOD),
    (1.31, 1.33, .12, .88, 8, 21, ROPE),
    (1.72, 1.86, .06, .94, 2, 28, PLANK),       # climbing wall
]
def render(A=(84, 69), W=198, H=86, order=None):
    m = Image.new('RGBA', (W, H), (0, 0, 0, 0)); d = ImageDraw.Draw(m)
    for o in (order or sorted(OBJ, key=lambda o: (o[5] > 2, (o[0] + o[1]) / -2, (o[2] + o[3]) / 2))):   # far end first, then nearer
        box(d, A, *o[:6], sh(o[6]))
    return m
if __name__ == '__main__':
    g = Image.open('tools/art/templates/t56/model_guide_2x1_workshop.png').convert('RGB')
    g.paste((255, 0, 255), (78 * 12, 0, 171 * 12, g.height))
    m = render().resize((198 * 12, 86 * 12), Image.NEAREST)
    g.paste(m, (0, 0), m)
    g.save(sys.argv[1] if len(sys.argv) > 1 else 'tools/art/templates/t56/model_guide_2x1_track.png')
