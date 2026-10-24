#!/usr/bin/env python3
"""Colour-block model guide for the 56-tile Scrapyard (2x1): Medical Tent left, model on the 2x1 footprint, farmer right. 12 image px per art px."""
import sys
from PIL import Image, ImageDraw
sys.path.insert(0, 'tools/art')
from clay_model import box

def sh(c):  # top, lit left face, shaded right face
    return (tuple(min(255, int(v * 1.15)) for v in c) + (255,), c + (255,), tuple(int(v * .75) for v in c) + (255,))
DIRT, FENCE, RUST, TYRE, DOOR, CRANE, STEEL = (150, 140, 120), (130, 95, 60), (150, 80, 50), (55, 55, 60), (90, 120, 140), (210, 170, 50), (120, 120, 125)
OBJ = [  # u0,u1, v0,v1, h0,h1, colour   (u = long axis, v = short axis, h px)
    (0, 2, 0, 1, 0, 2, DIRT),                    # dirt pad
    (0, 2, 0, .08, 2, 15, FENCE),               # back fence (long side)
    (1.92, 2, .08, 1, 2, 15, FENCE),            # end fence
    (.15, .27, .12, .24, 2, 40, CRANE),         # crane post
    (.15, 1.2, .14, .22, 36, 40, CRANE),        # crane boom
    (1.1, 1.14, .16, .2, 26, 36, STEEL),        # cable
    (1.05, 1.19, .13, .23, 21, 26, STEEL),      # hook block
    (.7, 1.55, .2, .82, 2, 11, RUST),           # junk heap base
    (.85, 1.35, .3, .7, 11, 18, RUST),          # junk heap top
    (.15, .45, .6, .9, 2, 10, TYRE),            # tyre stack
    (1.6, 1.88, .66, .74, 2, 14, DOOR),         # car door leaning
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
    g.save(sys.argv[1] if len(sys.argv) > 1 else 'tools/art/templates/t56/model_guide_2x1_scrapyard.png')

def back_guide(out='tools/art/templates/t56/back_model_2x1_scrapyard.png', front='assets/buildings/t56/scrapyard.png'):
    """Approved front on the left, the model turned 180 degrees (u -> 2-u, v -> 1-v) on the right."""
    global OBJ
    keep = OBJ
    OBJ = [(2 - u1, 2 - u0, 1 - v1, 1 - v0, h0, h1, c) for (u0, u1, v0, v1, h0, h1, c) in keep]
    m = render(A=(110, 69)); OBJ = keep
    g = Image.new('RGBA', (198 * 12, 86 * 12), (255, 0, 255, 255))
    f = Image.open(front).convert('RGBA')
    g.alpha_composite(f.resize((f.width * 12, f.height * 12), Image.NEAREST), (4 * 12, (84 - f.height) * 12))
    g.alpha_composite(m.resize((198 * 12, 86 * 12), Image.NEAREST))
    g.convert('RGB').save(out)
