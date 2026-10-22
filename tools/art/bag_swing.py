#!/usr/bin/env python3
"""Gym punching bag swinging on its chain: the bag (red pixels and their outline) sways 1 px left and right;
the lower half leads, so it reads as a pendulum. Behind it, the pixel on the trailing side is repeated.
    python3 tools/art/bag_swing.py   -> assets/buildings/t56/gym_anim.png and gym_back_anim.png (8 frames)"""
import os
from PIL import Image

N = 8
SWING = [0, 1, 1, 0, 0, -1, -1, 0]
VIEWS = {'gym': ('gym.png', (12, 24, 19, 38)), 'gym_back': ('gym_back.png', (40, 24, 48, 46))}   # bag box incl. outline

def red(p): return p[3] and p[0] > p[1] + 50 and p[0] > p[2] + 40 and p[0] > 70
def dark(p): return p[3] and sum(p[:3]) < 160

def frames(im, box):
    px = im.load(); W, H = im.size; x0, y0, x1, y1 = box
    bag = {(x, y) for y in range(y0, y1 + 1) for x in range(x0, x1 + 1) if red(px[x, y])}
    top = min(y for _, y in bag); bot = max(y for _, y in bag); mid = (top + bot) // 2
    S = bag | {(x + dx, y + dy) for (x, y) in bag for dx, dy in ((1, 0), (-1, 0), (0, 1), (0, -1), (1, -1), (-1, -1), (1, 1), (-1, 1))
               if dark(px[x + dx, y + dy]) and (x + dx, y + dy) not in bag}
    out = []
    for f in range(N):
        o = im.copy(); op = o.load(); s0 = SWING[f]
        if s0:
            shift = {(x, y): s0 for (x, y) in S}   # the whole bag swings; the chain above stays
            moved = {(x + shift[(x, y)], y) for (x, y) in S}
            for (x, y) in S:
                if (x, y) not in moved:
                    q = x - s0
                    while (q, y) in S: q -= s0
                    op[x, y] = px[q, y] if 0 <= q < W else (0, 0, 0, 0)
            for (x, y) in S: op[x + shift[(x, y)], y] = px[x, y]
        out.append(o)
    return out

if __name__ == '__main__':
    d = os.path.join(os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__)))), 'assets/buildings/t56')
    for name, (fn, box) in VIEWS.items():
        im = Image.open(os.path.join(d, fn)).convert('RGBA'); fr = frames(im, box)
        strip = Image.new('RGBA', (im.width * N, im.height), (0, 0, 0, 0))
        for i, f in enumerate(fr): strip.alpha_composite(f, (i * im.width, 0))
        strip.save(os.path.join(d, name + '_anim.png')); print(name, N, im.size)
