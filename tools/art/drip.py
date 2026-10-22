#!/usr/bin/env python3
"""Dripping tap: a drop swells at the spout, falls into the bucket and makes a small splash.
    python3 tools/art/drip.py <in.png> <spout_x> <spout_y> <surface_y> <out_strip.png> [frames=10]
spout_y = first row under the spout; surface_y = the water row in the bucket. The building's pixels are only covered, never moved."""
import sys
from PIL import Image

HI, MID, DK = (214, 240, 255, 255), (110, 180, 235, 255), (52, 104, 168, 255)

def drip(im, sx, sy, wy, n=10):
    frames = []
    fall = max(1, wy - sy)
    for f in range(n):
        out = im.copy(); px = out.load()
        def put(x, y, c):
            if 0 <= x < out.width and 0 <= y < out.height: px[x, y] = c
        if f < 3:                       # swelling at the spout
            put(sx, sy, MID if f == 0 else HI)
            if f == 2: put(sx, sy + 1, MID)
        elif f < 3 + fall // 2 + 1:     # falling, 2 rows a frame
            y = sy + 1 + (f - 3) * 2
            if y < wy: put(sx, y, HI); put(sx, y + 1, MID)
        elif f == 3 + fall // 2 + 1:    # splash
            put(sx, wy - 1, HI); put(sx - 1, wy, MID); put(sx + 1, wy, MID)
        elif f == 3 + fall // 2 + 2:    # ripple
            put(sx - 2, wy, DK); put(sx + 2, wy, DK); put(sx - 1, wy, MID); put(sx + 1, wy, MID)
        frames.append(out)
    return frames

if __name__ == '__main__':
    a = sys.argv[1:]; im = Image.open(a[0]).convert('RGBA'); n = int(a[5]) if len(a) > 5 else 10
    fr = drip(im, int(a[1]), int(a[2]), int(a[3]), n)
    strip = Image.new('RGBA', (im.width * n, im.height), (0, 0, 0, 0))
    for i, f in enumerate(fr): strip.alpha_composite(f, (i * im.width, 0))
    strip.save(a[4]); print('frames', n, 'size', im.size)
