#!/usr/bin/env python3
"""Warning lamp blink: the red lamp pixels (bright red near the top of the sprite) light up with a 1-pixel glow ring,
then go dark. python3 tools/art/lamp_blink.py <in.png> <out_strip.png> [frames=8] [y_max=12]"""
import sys
from PIL import Image

ON = [1, 1, 1, 0, 0, 0, 0, 0]   # lit for 3 of 8 frames
GLOW = (255, 120, 90, 255)

def lamp(p): return p[3] and p[0] > 170 and p[1] < 110 and p[2] < 100

def frames(im, n=8, ymax=12):
    px = im.load(); L = [(x, y) for y in range(min(ymax, im.height)) for x in range(im.width) if lamp(px[x, y])]
    ring = {(x + dx, y + dy) for (x, y) in L for dx, dy in ((1, 0), (-1, 0), (0, -1), (1, -1), (-1, -1))} - set(L)
    out = []
    for f in range(n):
        o = im.copy(); op = o.load()
        if ON[f % len(ON)]:
            for (x, y) in ring:
                if 0 <= x < im.width and 0 <= y < im.height and not px[x, y][3]: op[x, y] = GLOW
        else:
            for (x, y) in L:
                r, g, b, a = px[x, y]; op[x, y] = (r * 45 // 100, g * 45 // 100, b * 45 // 100, a)
        out.append(o)
    return out

if __name__ == '__main__':
    a = sys.argv[1:]; im = Image.open(a[0]).convert('RGBA'); n = int(a[2]) if len(a) > 2 else 8
    fr = frames(im, n, int(a[3]) if len(a) > 3 else 12); s = Image.new('RGBA', (im.width * n, im.height), (0, 0, 0, 0))
    for i, f in enumerate(fr): s.alpha_composite(f, (i * im.width, 0))
    s.save(a[1]); print('frames', n, im.size)
