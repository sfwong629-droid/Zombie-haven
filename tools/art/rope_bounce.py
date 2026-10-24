#!/usr/bin/env python3
"""Sparring ring: the two near ropes bounce, sagging most in the middle as if someone just hit them, then settle.
Rope pixels (red, with their outline) between x0 and x1 and below the separator line move down; the gap they leave
is filled with the pixel just above it (the mat behind). Nothing is rescaled.
    python3 tools/art/rope_bounce.py <in.png> <out_strip.png> x0 x1 sep_a sep_b   (rope pixels need y > sep_a - x * sep_b)"""
import sys, math
from PIL import Image
AMP = [0, 1, 1, 0, 1, 0, 0, 0, 0, 0]

def red(c): return c[3] and c[0] > 150 and c[1] < 100
def frames(im, x0, x1, sa, sb):
    px = im.load(); W, H = im.size
    R = {(x, y) for x in range(x0, x1 + 1) for y in range(H) if y > sa - x * sb and red(px[x, y])}
    R |= {(x, y + d) for (x, y) in list(R) for d in (-1, 1) if 0 <= y + d < H and px[x, y + d][3] and max(px[x, y + d][:3]) < 45}
    out = []
    for a in AMP:
        o = im.copy(); op = o.load()
        sh = {(x, y): round(a * math.sin(math.pi * (x - x0) / (x1 - x0))) for (x, y) in R}
        moved = {(x, y + sh[(x, y)]) for (x, y) in R}
        for (x, y) in R:
            if sh[(x, y)] and (x, y) not in moved:
                q = y - 1
                while (x, q) in R: q -= 1
                op[x, y] = px[x, q]
        for (x, y) in R:
            if y + sh[(x, y)] < H: op[x, y + sh[(x, y)]] = px[x, y]
        out.append(o)
    return out

if __name__ == '__main__':
    a = sys.argv[1:]; im = Image.open(a[0]).convert('RGBA')
    fr = frames(im, int(a[2]), int(a[3]), float(a[4]), float(a[5]))
    st = Image.new('RGBA', (im.width * len(fr), im.height), (0, 0, 0, 0))
    for i, f in enumerate(fr): st.alpha_composite(f, (i * im.width, 0))
    st.save(a[1]); print('frames', len(fr), im.size)
