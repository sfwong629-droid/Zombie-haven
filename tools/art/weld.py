#!/usr/bin/env python3
"""Welding sparks: short bursts of bright sparks flying out of a point (the vice), with a pause between bursts.
    python3 tools/art/weld.py <in.png> <out_strip.png> <x,y> [frames=10]
Sparks are single pixels drawn over the sprite; nothing is moved or rescaled."""
import sys
from PIL import Image

WHITE, YEL, ORA = (255, 252, 230, 255), (255, 220, 90, 255), (255, 150, 40, 255)
# per frame: list of (dx, dy, colour); frames without sparks are the pause between bursts
BURSTS = [
    [(0, 0, WHITE), (1, -1, YEL), (-1, -1, YEL)],
    [(0, 0, WHITE), (2, -2, YEL), (-2, -1, YEL), (3, 0, ORA)],
    [(0, -1, YEL), (3, -3, ORA), (-3, -2, ORA), (4, 1, ORA), (-1, 1, YEL)],
    [(4, -2, ORA), (-4, -1, ORA), (5, 2, ORA)],
    [(0, 0, WHITE), (1, -2, YEL), (-2, 0, YEL)],
    [(2, -3, ORA), (-3, -1, ORA), (3, 1, YEL)],
    [], [], [], [],
]

def frames(im, x, y, n=10):
    out = []
    for f in range(n):
        o = im.copy(); op = o.load()
        for dx, dy, c in BURSTS[f % len(BURSTS)]:
            if 0 <= x + dx < im.width and 0 <= y + dy < im.height: op[x + dx, y + dy] = c
        out.append(o)
    return out

if __name__ == '__main__':
    a = sys.argv[1:]; im = Image.open(a[0]).convert('RGBA'); x, y = (int(v) for v in a[2].split(','))
    n = int(a[3]) if len(a) > 3 else 10
    fr = frames(im, x, y, n); s = Image.new('RGBA', (im.width * n, im.height), (0, 0, 0, 0))
    for i, f in enumerate(fr): s.alpha_composite(f, (i * im.width, 0))
    s.save(a[1]); print('frames', n, im.size)
