#!/usr/bin/env python3
"""Rain Collector animation: raindrops run down the tarp into the funnel hole (both views); the front view's tap also drips.
    python3 tools/art/water_anim.py   -> assets/buildings/t56/water_anim.png and water_back_anim.png (20 frames each)
Drops are drawn only on tarp pixels; nothing is moved or rescaled."""
import os, sys
from PIL import Image
sys.path.insert(0, os.path.dirname(__file__))
from drip import drip

DROP, WET, DARK = (92, 160, 222, 255), (186, 210, 226, 255), (52, 104, 168, 255)
N = 20
VIEWS = {   # (file, funnel hole, drop starts (x, y, first frame), tap (x, y, water row) or None)
    'water':      ('water.png', (30, 16), [(14, 10, 0), (45, 10, 7), (27, 4, 13)], (41, 36, 38)),
    'water_back': ('water_back.png', (30, 16), [(46, 10, 0), (14, 10, 7), (30, 4, 13)], None),
}
LIFE = 7   # frames a drop takes to reach the hole

def is_tarp(p):
    return p[3] and p[0] > 170 and p[1] > 140 and p[2] > 90

def frames(base, hole, drops, tap):
    out = []
    taps = drip(base, *tap, n=10) if tap else None
    for f in range(N):
        im = (taps[f % 10] if taps else base).copy(); px = im.load()
        for (sx, sy, start) in drops:
            a = (f - start) % N
            if a >= LIFE: continue
            t = a / (LIFE - 1)
            pos = lambda u: (round(sx + (hole[0] - sx) * u), round(sy + (hole[1] - sy) * u ** 1.4))   # slow at first, then runs
            for k in range(12):   # wet streak behind the drop
                u = max(0, t - .3 + .3 * k / 11); q = pos(u)
                if a and is_tarp(base.getpixel(q)): px[q] = WET
            q = pos(t)
            if is_tarp(base.getpixel(q)): px[q] = DROP
            q2 = (q[0], q[1] + 1)
            if q2[1] < base.height and is_tarp(base.getpixel(q2)): px[q2] = DARK
        out.append(im)
    return out

if __name__ == '__main__':
    d = os.path.join(os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__)))), 'assets/buildings/t56')
    for name, (fn, hole, drops, tap) in VIEWS.items():
        base = Image.open(os.path.join(d, fn)).convert('RGBA'); fr = frames(base, hole, drops, tap)
        strip = Image.new('RGBA', (base.width * N, base.height), (0, 0, 0, 0))
        for i, f in enumerate(fr): strip.alpha_composite(f, (i * base.width, 0))
        strip.save(os.path.join(d, name + '_anim.png')); print(name, N, 'frames', base.size)
