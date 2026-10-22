#!/usr/bin/env python3
"""Tarp flapping: the hanging edge of a cloth (olive tarp) ripples 1 px up and down in a travelling wave.
    python3 tools/art/tarp_flap.py <in.png> <out_strip.png> [frames=8]
The cloth is found by colour (olive green); its bottom edge pixels grow or shrink by one pixel per column."""
import sys, math
from PIL import Image

def cloth(p): return p[3] and p[1] > p[2] + 30 and p[0] > p[2] + 10 and p[1] >= p[0] - 10 and sum(p[:3]) > 150
def dark(p): return p[3] and sum(p[:3]) < 110

def flap(im, n=8):
    W, H = im.size; px = im.load()
    edge = [(x, y) for y in range(H - 2) for x in range(W) if cloth(px[x, y]) and not cloth(px[x, y + 1])]
    out = []
    for f in range(n):
        o = im.copy(); op = o.load()
        for (x, y) in edge:
            d = round(math.sin(2 * math.pi * f / n + x * 0.6))
            if d > 0 and dark(px[x, y + 1]) and px[x, y + 2][3]:          # cloth hangs 1 px lower
                op[x, y + 1] = px[x, y]
                if not cloth(px[x, y + 2]): op[x, y + 2] = px[x, y + 1]
            elif d < 0 and cloth(px[x, y - 1]) and dark(px[x, y + 1]):    # cloth lifts 1 px
                op[x, y] = px[x, y + 1]
                if px[x, y + 2][3] and not dark(px[x, y + 2]): op[x, y + 1] = px[x, y + 2]
        out.append(o)
    return out

if __name__ == '__main__':
    a = sys.argv[1:]; im = Image.open(a[0]).convert('RGBA'); n = int(a[2]) if len(a) > 2 else 8
    fr = flap(im, n); strip = Image.new('RGBA', (im.width * n, im.height), (0, 0, 0, 0))
    for i, f in enumerate(fr): strip.alpha_composite(f, (i * im.width, 0))
    strip.save(a[1]); print('frames', n, im.size)
