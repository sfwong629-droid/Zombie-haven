#!/usr/bin/env python3
"""Crane chain and hook swinging like a pendulum: rows shift left/right in proportion to their distance below the pivot.
Pixels left behind are filled from the trailing side (usually background). Nothing is rescaled.
    python3 tools/art/hook_swing.py <in.png> <out_strip.png> x0,y0,x1,y1"""
import sys
from PIL import Image
SW = [0, 1, 2, 1, 0, -1, -2, -1]

def hookish(p):
    r, g, b, a = p
    if not a: return False
    if max(r, g, b) < 60: return True                       # outline / dark chain links
    return abs(r - g) < 22 and abs(g - b) < 26 and r < 210   # grey steel

def frames(im, box):
    x0, y0, x1, y1 = box; px = im.load(); W, H = im.size
    S = {(x, y) for y in range(y0, y1 + 1) for x in range(x0, x1 + 1) if hookish(px[x, y])}
    out = []
    for s in SW:
        o = im.copy(); op = o.load()
        sh = {(x, y): round(s * (y - y0) / (y1 - y0)) for (x, y) in S}
        moved = {(x + sh[(x, y)], y) for (x, y) in S}
        for (x, y) in S:
            d = sh[(x, y)]
            if d and (x, y) not in moved:
                q = x - d
                while (q, y) in S: q -= d
                op[x, y] = px[q, y] if 0 <= q < W else (0, 0, 0, 0)
        for (x, y) in S: op[x + sh[(x, y)], y] = px[x, y]
        out.append(o)
    return out

if __name__ == '__main__':
    im = Image.open(sys.argv[1]).convert('RGBA'); box = tuple(int(v) for v in sys.argv[3].split(','))
    fr = frames(im, box); st = Image.new('RGBA', (im.width * len(fr), im.height), (0, 0, 0, 0))
    for i, f in enumerate(fr): st.alpha_composite(f, (i * im.width, 0))
    st.save(sys.argv[2]); print('frames', len(fr), im.size)
