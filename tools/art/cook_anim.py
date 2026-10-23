#!/usr/bin/env python3
"""Camp-kitchen animation: fire flicker with rising sparks, and wisps of steam from soup pots.
    python3 tools/art/cook_anim.py <in.png> <out_strip.png> <fire x0,y0,x1,y1> <spark x,y> <steam x,y;x,y...> [frames=8]
Fire pixels (warm yellow/orange/red inside the fire box) cycle brightness; sparks and steam are single pixels drawn
only over empty or background-free spots above; nothing is moved or rescaled. Rows grow upward from the given points."""
import sys, math
from PIL import Image

SPARK = [(255, 236, 140, 255), (255, 170, 60, 255)]
STEAM = [(236, 236, 230, 255), (206, 206, 200, 255)]

def warm(p): return p[3] and p[0] > 140 and p[2] < 120 and p[0] > p[1] + 20

def frames(im, fire, spark, steams, n=8):
    px = im.load(); x0, y0, x1, y1 = fire
    F = [(x, y) for y in range(y0, y1 + 1) for x in range(x0, x1 + 1) if warm(px[x, y])]
    out = []
    for f in range(n):
        o = im.copy(); op = o.load()
        for (x, y) in F:   # flicker: each fire pixel takes a neighbour's colour in turn, so the flame shape shimmers
            k = (x * 3 + y * 5 + f) % 4
            r, g, b, a = px[x, y]
            if k == 0: op[x, y] = (min(255, r + 20), min(255, g + 40), b, a)
            elif k == 2: op[x, y] = (r, max(0, g - 40), b, a)
        sx, sy = spark   # two sparks rising and drifting
        for i, ph in enumerate((0, n // 2)):
            t = (f + ph) % n
            x = sx + round(math.sin(t * 0.9 + i) * 1.0) + (i * 10 - 5); y = sy - 1 - t * 2
            if 0 <= y < o.height and 0 <= x < o.width: op[x, y] = SPARK[t > n // 2]
        for j, (wx, wy) in enumerate(steams):   # steam wisps: 2 pixels rising and fading
            for ph in (0, n // 2):
                t = (f + ph + j * 3) % n
                if t > 5: continue
                x = wx + round(math.sin(t * 0.8 + j) * 1); y = wy - 1 - t
                for dx in (0, 1):   # 2 pixels wide so it reads on any ground
                    if 0 <= y < o.height and 0 <= x + dx < o.width: op[x + dx, y] = STEAM[t > 2]
        out.append(o)
    return out

if __name__ == '__main__':
    a = sys.argv[1:]; im = Image.open(a[0]).convert('RGBA')
    fire = tuple(int(v) for v in a[2].split(',')); spark = tuple(int(v) for v in a[3].split(','))
    steams = [tuple(int(v) for v in s.split(',')) for s in a[4].split(';')]; n = int(a[5]) if len(a) > 5 else 8
    fr = frames(im, fire, spark, steams, n); s = Image.new('RGBA', (im.width * n, im.height), (0, 0, 0, 0))
    for i, f in enumerate(fr): s.alpha_composite(f, (i * im.width, 0))
    s.save(a[1]); print('frames', n, im.size)
