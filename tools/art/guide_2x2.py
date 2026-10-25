#!/usr/bin/env python3
"""2x2 (112-px) colour-block model guides: Medical Tent on the left, the model on a 2x2 footprint, the farmer on the right,
all at 12 image px per art px on one magenta canvas. The tent and farmer are taken from the 2x1 guide at art size."""
import sys
from PIL import Image, ImageDraw
sys.path.insert(0, 'tools/art')
from clay_model import box
from model_scrapyard import sh

W, H = 250, 144                 # art px
A = (100, 104)                  # left corner of the 2x2 footprint; bottom corner = A + (56, 28)
BOTTOM = A[1] + 28

def people():
    g = Image.open('tools/art/templates/t56/model_guide_2x1_workshop.png').convert('RGBA').resize((198, 86), Image.NEAREST)
    px = g.load()
    for x in range(198):
        for y in range(86):
            r, gg, b, a = px[x, y]
            if r > 200 and gg < 60 and b > 200: px[x, y] = (0, 0, 0, 0)
    return g.crop((4, 18, 68, 82)), g.crop((174, 47, 193, 77))   # tent (bottom at 2x1 guide y 81), farmer (bottom 76)

def guide(objs, out, order=None, A=A):
    c = Image.new('RGBA', (W, H), (255, 0, 255, 255))
    tent, farmer = people()
    c.alpha_composite(tent, (4, BOTTOM - 2 - tent.height + 1))
    c.alpha_composite(farmer, (W - 26, BOTTOM - 7 - farmer.height + 1))
    m = Image.new('RGBA', (W, H), (0, 0, 0, 0)); d = ImageDraw.Draw(m)
    for o in (order or sorted(objs, key=lambda o: (o[5] > 2, (o[2] + o[3]) / 2 - (o[0] + o[1]) / 2))):
        box(d, A, *o[:6], sh(o[6]))
    c.alpha_composite(m)
    c.resize((W * 12, H * 12), Image.NEAREST).convert('RGB').save(out)
    return c

def back(objs):   # the same model turned 180 degrees on a 2x2 footprint
    return [(2 - u1, 2 - u0, 2 - v1, 2 - v0, h0, h1, c) for (u0, u1, v0, v1, h0, h1, c) in objs]

def back_guide(objs, front, out, order=None):
    """Approved front sprite on the left, the model turned 180 degrees on the right (same footprint, same ground line)."""
    c = Image.new('RGBA', (W, H), (255, 0, 255, 255))
    f = Image.open(front).convert('RGBA')
    c.alpha_composite(f, (2, BOTTOM - f.height + 1))
    m = Image.new('RGBA', (W, H), (0, 0, 0, 0)); d = ImageDraw.Draw(m); A2 = (W - 2 - 112 - 4, A[1])
    objs = back(objs)
    for o in (order or sorted(objs, key=lambda o: (o[5] > 2, (o[2] + o[3]) / 2 - (o[0] + o[1]) / 2))):
        box(d, A2, *o[:6], sh(o[6]))
    c.alpha_composite(m)
    c.resize((W * 12, H * 12), Image.NEAREST).convert('RGB').save(out)
