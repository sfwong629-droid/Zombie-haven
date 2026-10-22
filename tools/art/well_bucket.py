#!/usr/bin/env python3
"""Well bucket going up and down on its rope, dipping into the water, plus the water twinkle (well_anim.frames).
    python3 tools/art/well_bucket.py   -> assets/buildings/t56/well_anim.png and well_back_anim.png
The drawn bucket and rope are taken out (each pixel filled from its row neighbour outside the bucket), then a bucket of the
same size and colours is drawn back at each height. The front stone wall stays in front: the bucket hides below WALL_Y."""
import os, sys
from PIL import Image
sys.path.insert(0, os.path.dirname(__file__))
import well_anim

K, D, W, w, G, R = (0, 0, 0, 255), (70, 40, 20, 255), (214, 146, 62, 255), (150, 92, 36, 255), (156, 156, 150, 255), (120, 84, 44, 255)
BUCKET = ['.#####.', '#DDDDD#', '#WWWWw#', '#GGGGG#', '#WWWWw#', '.#####.']
COL = {'#': K, 'D': D, 'W': W, 'w': w, 'G': G}
VIEWS = {   # file, erase boxes, bucket centre x, rope top y (under the axle), rest top y, wall top y, water ring centre
    'well':      ('well.png', [(28, 20, 31, 23), (26, 24, 34, 30)], 30, 20, 24, 31, (30, 31)),
    'well_back': ('well_back.png', [(34, 19, 37, 23), (30, 24, 39, 30)], 35, 19, 24, 31, (35, 31)),
}
# bucket top y offset from rest per frame: hangs, lowers into the water, waits, comes back up past rest, settles
PATH = [0, 0, 1, 2, 3, 4, 5, 6, 6, 5, 4, 3, 2, 1, 0, -1, -2, -3, -3, -2, -1]
WATER = 29          # first row of the water surface in both views
RING = {6: 1, 7: 2, 8: 3, 10: 1, 11: 2}   # splash ring size when the bucket goes in and comes out

def ring(o, c, size):
    px = o.load(); hi, mid = well_anim.HI, well_anim.MID
    for a in range(-size - 3, size + 4):
        q = (c[0] + a, c[1])
        if abs(a) >= size + 2 and well_anim.water(px[q]): px[q] = hi if size < 3 else mid

def empty(im, boxes):
    o = im.copy(); px = o.load(); src = im.load()
    S = {(x, y) for (x0, y0, x1, y1) in boxes for y in range(y0, y1 + 1) for x in range(x0, x1 + 1)}
    for (x, y) in sorted(S):
        q = x - 1
        while (q, y) in S: q -= 1
        r = x + 1
        while (r, y) in S: r += 1
        px[x, y] = src[q, y] if (x - q) <= (r - x) else src[r, y]
    return o

def draw(o, cx, rope_top, top, wall):
    wall = min(wall, WATER)   # below the water line the bucket is under water
    px = o.load(); x0 = cx - 3
    for y in range(rope_top, top):   # rope
        if y < wall: px[cx, y] = R
    for j, row in enumerate(BUCKET):
        y = top + j
        if y >= wall: break
        for i, c in enumerate(row):
            if c != '.': px[x0 + i, y] = COL[c]

if __name__ == '__main__':
    d = os.path.join(os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__)))), 'assets/buildings/t56')
    N = len(PATH)
    for name, (fn, boxes, cx, rope_top, rest, wall, ring_c) in VIEWS.items():
        im = Image.open(os.path.join(d, fn)).convert('RGBA'); base = empty(im, boxes)
        water = well_anim.frames(base, well_anim.VIEWS[name][1], (-99, -99))   # 12-frame twinkle on the empty well
        strip = Image.new('RGBA', (im.width * N, im.height), (0, 0, 0, 0))
        for f, off in enumerate(PATH):
            o = water[f % len(water)].copy(); draw(o, cx, rope_top, rest + off, wall)
            if f in RING: ring(o, ring_c, RING[f])
            strip.alpha_composite(o, (f * im.width, 0))
        strip.save(os.path.join(d, name + '_anim.png')); print(name, N, 'frames', im.size)
