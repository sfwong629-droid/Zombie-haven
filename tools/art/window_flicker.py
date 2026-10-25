#!/usr/bin/env python3
"""Lit windows: all of them glow steadily with a faint flicker, and one failing bulb cuts out now and then.
Windows are the lit (warm yellow) pixels inside the given boxes; nothing else changes.
    python3 tools/art/window_flicker.py <in.png> <out_strip.png> <bad x0,y0,x1,y1> <other x0,y0,x1,y1> [...]"""
import sys
from PIL import Image
N = 12
BAD = [1, 1, 1, .35, 1, .35, .35, .35, 1, 1, 1, 1]          # the failing bulb
SOFT = [1, .95, 1, .97, .93, 1, .96, 1, .94, 1, .97, .95]   # everyone else
def lit(c): return c[3] and c[0] > 200 and c[1] > 150 and c[2] < 150
def boxed(px, b): x0, y0, x1, y1 = b; return [(x, y) for x in range(x0, x1 + 1) for y in range(y0, y1 + 1) if lit(px[x, y])]
if __name__ == '__main__':
    a = sys.argv[1:]; im = Image.open(a[0]).convert('RGBA'); px = im.load()
    boxes = [tuple(int(v) for v in s.split(',')) for s in a[2:]]
    bad = boxed(px, boxes[0]); rest = [p for b in boxes[1:] for p in boxed(px, b)]
    st = Image.new('RGBA', (im.width * N, im.height), (0, 0, 0, 0))
    for f in range(N):
        o = im.copy(); op = o.load()
        for pts, k in ((bad, BAD[f]), (rest, SOFT[f])):
            for (x, y) in pts:
                r, g, b, al = px[x, y]
                op[x, y] = (int(r * (0.55 + 0.45 * k)), int(g * k), int(b * k), al) if k < .5 else (int(r * (0.94 + 0.06 * k)), int(g * k), int(b * k), al)
        st.alpha_composite(o, (f * im.width, 0))
    st.save(a[1]); print('frames', N, im.size, len(bad), len(rest))
