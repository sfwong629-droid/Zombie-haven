#!/usr/bin/env python3
"""String lights chasing: each warm bulb (bright yellow-orange blob) dims in turn, so a wave runs along the string.
    python3 tools/art/lights_chase.py <in.png> <out_strip.png> [frames=6] [y_max]
Bulbs are found by colour above y_max; their pixels only change brightness."""
import sys
from PIL import Image

def bulb(p): return p[3] and p[0] > 200 and p[1] > 130 and p[2] < 120

def frames(im, n=6, ymax=None):
    px = im.load(); ymax = ymax or im.height
    pts = [(x, y) for y in range(ymax) for x in range(im.width) if bulb(px[x, y])]
    blobs = []   # group bulb pixels into bulbs
    for p in pts:
        for b in blobs:
            if any(abs(p[0] - q[0]) <= 1 and abs(p[1] - q[1]) <= 1 for q in b): b.append(p); break
        else: blobs.append([p])
    blobs.sort(key=lambda b: min(q[0] for q in b))
    out = []
    for f in range(n):
        o = im.copy(); op = o.load()
        for i, b in enumerate(blobs):
            k = 1.0 if (i - f) % 3 else 0.55       # every third bulb dims, the gap moves along
            for (x, y) in b:
                r, g, bb, a = px[x, y]; op[x, y] = (int(r * (0.8 + 0.2 * k)), int(g * k), int(bb * k), a)
        out.append(o)
    print('bulbs', len(blobs))
    return out

if __name__ == '__main__':
    a = sys.argv[1:]; im = Image.open(a[0]).convert('RGBA'); n = int(a[2]) if len(a) > 2 else 6
    fr = frames(im, n, int(a[3]) if len(a) > 3 else None); s = Image.new('RGBA', (im.width * n, im.height), (0, 0, 0, 0))
    for i, f in enumerate(fr): s.alpha_composite(f, (i * im.width, 0))
    s.save(a[1]); print('frames', n, im.size)
