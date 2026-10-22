#!/usr/bin/env python3
"""Lamp-light flicker: lit pixels (warm yellow/orange glow) dim and brighten a little each frame.
    python3 tools/art/flicker.py <in.png> <out_strip.png> [frames=8]
Only lit pixels change brightness; nothing moves."""
import sys
from PIL import Image

LEVELS = [1.0, 0.86, 1.0, 0.93, 0.8, 1.0, 0.9, 0.97]
def lit(p): return p[3] and p[0] > 200 and p[1] > 150 and p[2] < 150

def frames(im, n=8):
    px = im.load(); L = [(x, y) for y in range(im.height) for x in range(im.width) if lit(px[x, y])]
    out = []
    for f in range(n):
        o = im.copy(); op = o.load(); k = LEVELS[f % len(LEVELS)]
        for (x, y) in L:
            r, g, b, a = px[x, y]; op[x, y] = (int(r * (0.94 + 0.06 * k)), int(g * k), int(b * k), a)
        out.append(o)
    return out

if __name__ == '__main__':
    a = sys.argv[1:]; im = Image.open(a[0]).convert('RGBA'); n = int(a[2]) if len(a) > 2 else 8
    fr = frames(im, n); s = Image.new('RGBA', (im.width * n, im.height), (0, 0, 0, 0))
    for i, f in enumerate(fr): s.alpha_composite(f, (i * im.width, 0))
    s.save(a[1]); print('frames', n, im.size)
