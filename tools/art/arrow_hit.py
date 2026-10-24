#!/usr/bin/env python3
"""Archery range: an arrow flies from the counter to the middle target, the target shudders when it lands, then a pause.
    python3 tools/art/arrow_hit.py <in.png> <out_strip.png>   (coordinates are for assets/buildings/t56/range.png)"""
import sys
from PIL import Image
START, HIT = (27, 24), (61, 12)            # leaves the counter, lands on the middle board's face
BOARD = (67.5, 13, 5.6, 7.6)               # middle target: centre x, y and radii (with its outline)
FLY = 6
SHAKE = [1, -1, 1, 0]
REST = 4
TIP, SHAFT, FLETCH = (40, 40, 44, 255), (230, 200, 140, 255), (235, 60, 50, 255)
ARROW = [(0, 0, TIP), (1, 0, TIP), (-1, 1, SHAFT), (-2, 1, SHAFT), (-3, 2, SHAFT), (-4, 2, SHAFT), (-5, 3, FLETCH), (-6, 3, FLETCH), (-5, 2, FLETCH), (-6, 4, FLETCH)]   # pointing up-right, along the lane

def board_mask(im):
    cx, cy, rx, ry = BOARD; px = im.load()
    return {(x, y) for x in range(im.width) for y in range(im.height)
            if px[x, y][3] and ((x - cx) / rx) ** 2 + ((y - cy) / ry) ** 2 <= 1}

def frames(im):
    px = im.load(); B = board_mask(im); out = []
    for i in range(FLY):
        o = im.copy(); op = o.load(); t = (i + 1) / FLY
        x = round(START[0] + (HIT[0] - START[0]) * t); y = round(START[1] + (HIT[1] - START[1]) * t - 4 * t * (1 - t))   # slight arc
        for dx, dy, c in ARROW:
            if 0 <= x + dx < o.width and 0 <= y + dy < o.height: op[x + dx, y + dy] = c
        out.append(o)
    for s in SHAKE + [0] * REST:
        o = im.copy(); op = o.load()
        if s:
            for (x, y) in B:
                if (x - s, y) not in B: op[x, y] = px[x - s, y] if 0 <= x - s < o.width else (0, 0, 0, 0)
            for (x, y) in B: op[x + s, y] = px[x, y]
        out.append(o)
    return out

if __name__ == '__main__':
    im = Image.open(sys.argv[1]).convert('RGBA'); fr = frames(im)
    st = Image.new('RGBA', (im.width * len(fr), im.height), (0, 0, 0, 0))
    for i, f in enumerate(fr): st.alpha_composite(f, (i * im.width, 0))
    st.save(sys.argv[2]); print('frames', len(fr), im.size)
