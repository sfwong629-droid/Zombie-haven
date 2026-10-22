#!/usr/bin/env python3
"""Well animation: the water inside the well (and in the trough) twinkles; a drop falls from the hanging bucket and rings out.
    python3 tools/art/well_anim.py   -> assets/buildings/t56/well_anim.png and well_back_anim.png (12 frames each)
Only water pixels change colour; nothing moves or is rescaled."""
import os
from PIL import Image

N = 12
HI, MID = (176, 214, 238, 255), (96, 150, 196, 255)
VIEWS = {   # file, region holding the water (x0, y0, x1, y1), bucket drip (x, y) landing in the well water
    'well':      ('well.png', (14, 26, 46, 40), (30, 31)),
    'well_back': ('well_back.png', (20, 26, 60, 40), (35, 31)),
}

def water(p): return p[3] and p[2] > p[0] + 15 and p[2] >= p[1] and sum(p[:3]) < 420

def frames(im, box, drip):
    px = im.load(); x0, y0, x1, y1 = box
    wpx = [(x, y) for y in range(y0, y1 + 1) for x in range(x0, x1 + 1) if water(px[x, y])]
    out = []
    for f in range(N):
        o = im.copy(); op = o.load()
        for (x, y) in wpx:
            k = (x * 5 + y * 7 + f * 3) % 23
            if k == 0: op[x, y] = HI
            elif k == 1: op[x, y] = MID
        dx, dy = drip   # ring after a drop: frames 0-3
        ring = {0: [(0, 0)], 1: [(-1, 0), (1, 0)], 2: [(-2, 0), (2, 0), (0, -1)], 3: [(-3, 0), (3, 0)]}.get(f, [])
        for (a, b) in ring:
            q = (dx + a, dy + b)
            if water(px[q]): op[q] = HI if f < 2 else MID
        out.append(o)
    return out

if __name__ == '__main__':
    d = os.path.join(os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__)))), 'assets/buildings/t56')
    for name, (fn, box, drip) in VIEWS.items():
        im = Image.open(os.path.join(d, fn)).convert('RGBA'); fr = frames(im, box, drip)
        strip = Image.new('RGBA', (im.width * N, im.height), (0, 0, 0, 0))
        for i, f in enumerate(fr): strip.alpha_composite(f, (i * im.width, 0))
        strip.save(os.path.join(d, name + '_anim.png')); print(name, N, im.size)
