#!/usr/bin/env python3
"""Fire (recoil) by code from a character's Aim pose (both fists forward, empty hands).
PixelLab cannot hold the aim: it drops the arms, hops or turns. Here the arms (everything in front of the
torso above the hips) kick up and back, the upper body rocks back, then all settles to the steady aim.
    python3 tools/art/fire_recoil.py <aim_rotation.png> <out_strip.png>"""
import sys
import numpy as np
from PIL import Image

KEYS = [  # (arm dx, arm dy up, upper-body dx, head extra dx)
    (0, 0, 0, 0), (0, 0, 0, 0), (-2, 3, -1, -1), (-1, 2, -1, -1), (-1, 1, 0, 0), (0, 0, 0, 0)]

def main(src, out):
    a = np.array(Image.open(src).convert('RGBA')); H, W = a.shape[:2]
    ys = np.where(a[..., 3].any(1))[0]; top, bot = ys.min(), ys.max(); hip = top + int((bot - top) * .6)
    head = top + int((bot - top) * .38)
    xs = np.where(a[hip - 1, :, 3] > 0)[0]; front = xs.max() + 1          # torso front edge (character faces right)
    arm = np.zeros((H, W), bool); arm[:hip, front:] = a[:hip, front:, 3] > 0
    frames = []
    for adx, ady, bdx, hdx in KEYS:
        o = np.zeros_like(a); o[hip:] = a[hip:]
        body = a.copy(); body[arm] = 0
        for y in range(hip):
            dx = bdx + (hdx if y < head else 0)
            for x in range(W):
                if body[y, x, 3] and 0 <= x + dx < W: o[y, x + dx] = body[y, x]
        yy, xx = np.where(arm)
        for y, x in zip(yy, xx):
            # the kick lifts the fists most: rise grows toward the fist
            k = (x - front + 1) / max(1, W - front); Y, X = y - int(round(ady * min(1, .4 + k * 2))), x + adx + bdx
            if 0 <= Y < H and 0 <= X < W: o[Y, X] = a[y, x]
        frames.append(o)
    Image.fromarray(np.concatenate(frames, 1)).save(out)

if __name__ == '__main__':
    main(sys.argv[1], sys.argv[2])
