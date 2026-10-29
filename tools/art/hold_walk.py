#!/usr/bin/env python3
"""Hold walk by code: the walk's legs (every frame) under the Hold pose's upper body (arm held forward).
PixelLab keeps swinging both arms when asked for a hold walk, so the upper body is taken from the Hold
rotation, moved with the walk's head bob, and the lower body is the character's own walk frame.
    python3 tools/art/hold_walk.py <walk_strip.png> <hold_rotation.png> <out_strip.png> [hip_fraction]"""
import sys
import numpy as np
from PIL import Image

def rows(a): ys = np.where(a[..., 3].any(1))[0]; return ys.min(), ys.max()

import colorsys
def skin(c):
    h, s_, v = colorsys.rgb_to_hsv(*(np.array(c[:3], float) / 255)); h *= 360
    return c[3] and 5 <= h <= 40 and .2 <= s_ <= .75 and v >= .35 and not (v < .5 and s_ > .6)

def outline_fix(a):
    H, W = a.shape[:2]
    for _ in range(2):   # outline pixels left floating next to the removed hands
        o = a.copy()
        for y in range(H):
            for x in range(W):
                if a[y, x, 3] and a[y, x, :3].max() < 40:
                    nb = sum(1 for u, v in ((1, 0), (-1, 0), (0, 1), (0, -1)) if 0 <= y + v < H and 0 <= x + u < W and a[y + v, x + u, 3] and a[y + v, x + u, :3].max() >= 40)
                    if nb == 0: o[y, x] = 0
        a = o
    return a

def main(walk, hold, out, frac=.6):
    w = np.array(Image.open(walk).convert('RGBA')); h = np.array(Image.open(hold).convert('RGBA'))
    n = w.shape[1] // 48
    ht, hb = rows(h); hip = ht + int((hb - ht) * frac)
    frames = [w[:, 48 * i:48 * i + 48] for i in range(n)]
    t0 = rows(frames[0])[0]
    res = []
    for f in frames:
        ft, fb = rows(f); bob = ft - t0           # head bob of this walk frame
        o = np.zeros_like(f)
        cut = hip + bob                           # waist line follows the bob
        low = f[cut:].copy()                      # legs from the walk, minus the walk's swinging hands
        # the walk's swinging hands hang beside the hips: in the hip band keep only the torso's columns
        tor = np.where(h[hip - 1, :, 3] > 0)[0]; x0, x1 = tor.min(), tor.max()
        band = low[:7]; band[:, :max(0, x0 - 1)] = 0; band[:, x1 + 2:] = 0
        low = outline_fix(low)
        o[cut:] = low
        up = np.roll(h[:hip], bob, 0) if bob >= 0 else np.roll(h[:hip], bob, 0)
        y0 = max(0, bob); up = h[:hip][max(0, -bob):]
        m = up[..., 3] > 0
        reg = o[y0:y0 + up.shape[0]]
        reg[m[:reg.shape[0]]] = up[:reg.shape[0]][m[:reg.shape[0]]]
        res.append(o)
    s = np.concatenate(res, 1)
    Image.fromarray(s).save(out)

if __name__ == '__main__':
    main(sys.argv[1], sys.argv[2], sys.argv[3], *(float(x) for x in sys.argv[4:]))
