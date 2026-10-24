#!/usr/bin/env python3
"""Colour-block model guide for the 56-tile Sparring Ring (2x1): a raised plank platform with a corner post at each corner,
two rope lines all round, a stool and a bucket in one corner. Medical Tent left, model on the footprint, farmer right."""
import sys
from PIL import Image, ImageDraw
sys.path.insert(0, 'tools/art')
from clay_model import box
from model_scrapyard import sh

DIRT, DECK, POST, ROPE, STOOL, BUCKET = (150, 140, 120), (165, 120, 70), (120, 80, 45), (200, 60, 50), (110, 75, 45), (120, 130, 140)
U0, U1, V0, V1 = .1, 1.9, .1, .9               # deck
P = .07                                        # post size
def ropes(h):
    t = .02
    return [(U0, U1, V0, V0 + t, h, h + 2, ROPE), (U0, U0 + t, V0, V1, h, h + 2, ROPE),
            (U1 - t, U1, V0, V1, h, h + 2, ROPE), (U0, U1, V1 - t, V1, h, h + 2, ROPE)]
POSTS = [(u, u + P, v, v + P, 6, 26, POST) for u in (U0, U1 - P) for v in (V0, V1 - P)]
OBJ = [(0, 2, 0, 1, 0, 2, DIRT), (U0, U1, V0, V1, 2, 6, DECK)] + POSTS + ropes(14) + ropes(21) + [
    (U1 - .3, U1 - .16, V0 + .1, V0 + .24, 6, 12, STOOL),     # stool in the far corner
    (U1 - .3, U1 - .2, V0 + .32, V0 + .42, 6, 11, BUCKET),    # bucket beside it
]
def depth(o): return (o[2] + o[3]) / 2 - (o[0] + o[1]) / 2
def render(A=(84, 69), W=198, H=86, objs=None):
    objs = objs or OBJ
    m = Image.new('RGBA', (W, H), (0, 0, 0, 0)); d = ImageDraw.Draw(m)
    base = [o for o in objs if o[5] <= 6]
    far_ropes = [o for o in objs if o[6] == ROPE and (o[3] - o[2] > .5 and o[2] < .5 or o[1] - o[0] > .5 and o[0] > 1)]
    order = sorted(base, key=lambda o: o[5]) + far_ropes + sorted([o for o in objs if o[5] > 6 and o not in far_ropes], key=depth)
    for o in order: box(d, A, *o[:6], sh(o[6]))
    return m
if __name__ == '__main__':
    g = Image.open('tools/art/templates/t56/model_guide_2x1_workshop.png').convert('RGB')
    g.paste((255, 0, 255), (78 * 12, 0, 171 * 12, g.height))
    m = render().resize((198 * 12, 86 * 12), Image.NEAREST)
    g.paste(m, (0, 0), m)
    g.save(sys.argv[1] if len(sys.argv) > 1 else 'tools/art/templates/t56/model_guide_2x1_sparring.png')

def back_guide(out='tools/art/templates/t56/back_model_2x1_sparring.png', front='assets/buildings/t56/sparring.png'):
    """Approved front on the left, the model turned 180 degrees (u -> 2-u, v -> 1-v) on the right."""
    objs = [(2 - u1, 2 - u0, 1 - v1, 1 - v0, h0, h1, c) for (u0, u1, v0, v1, h0, h1, c) in OBJ]
    m = render(A=(110, 69), objs=objs)
    g = Image.new('RGBA', (198 * 12, 86 * 12), (255, 0, 255, 255))
    f = Image.open(front).convert('RGBA')
    g.alpha_composite(f.resize((f.width * 12, f.height * 12), Image.NEAREST), (2 * 12, (84 - f.height) * 12))
    g.alpha_composite(m.resize((198 * 12, 86 * 12), Image.NEAREST))
    g.convert('RGB').save(out)
