#!/usr/bin/env python3
"""Survivor looks: recolour a PixelLab character's skin and hair across every animation strip (free, exact).
A profession's base sprites come from PixelLab once; every survivor then gets a skin tone and a hair colour
from the tables below, so two medics never look the same. Hair STYLE needs its own PixelLab base.
    python3 tools/art/look_variant.py <strip_dir> <prefix> <skin> <hair> <out_dir>"""
import sys, os, glob, colorsys
import numpy as np
from PIL import Image

SKIN = {   # dark .. light ramp (shadow, mid, light, highlight)
    'peach':  [(186, 112, 72), (234, 143, 93), (247, 182, 128), (252, 210, 170)],
    'tan':    [(150, 88, 52), (196, 124, 76), (222, 158, 104), (240, 190, 140)],
    'olive':  [(122, 82, 48), (168, 116, 70), (196, 146, 96), (220, 178, 128)],
    'brown':  [(88, 52, 30), (128, 78, 46), (160, 104, 62), (190, 134, 88)],
    'deep':   [(52, 30, 20), (84, 50, 32), (112, 70, 44), (140, 94, 62)],
}
HAIR = {
    'brown':  [(24, 12, 8), (47, 26, 18), (72, 42, 27), (106, 62, 39), (152, 102, 66)],
    'black':  [(10, 8, 10), (22, 20, 24), (36, 32, 38), (54, 48, 56), (80, 74, 84)],
    'blonde': [(96, 66, 30), (150, 110, 50), (200, 160, 80), (232, 200, 120), (250, 230, 170)],
    'auburn': [(48, 14, 10), (92, 32, 18), (138, 54, 28), (176, 82, 40), (210, 120, 70)],
    'grey':   [(56, 56, 60), (96, 96, 100), (140, 140, 144), (180, 180, 184), (214, 214, 216)],
}
lum = lambda c: .3 * c[0] + .59 * c[1] + .11 * c[2]

def hsv(c):
    h, s, v = colorsys.rgb_to_hsv(*(np.array(c[:3], float) / 255)); return h * 360, s, v

def is_skin(c):
    h, s, v = hsv(c); return 12 <= h <= 34 and .25 <= s <= .62 and v >= .78

def is_hairish(c):
    h, s, v = hsv(c); return 8 <= h <= 40 and s >= .3 and .07 <= v <= .66

def ramp(r, t): return r[min(len(r) - 1, max(0, int(t * len(r))))]

def recolour(cell, skin, hair, ref):
    a = np.array(cell); H, W = a.shape[:2]
    ys, xs = np.where(a[..., 3] > 0)
    if not len(ys): return cell
    top, bot, l, r = ys.min(), ys.max(), xs.min(), xs.max()
    lying = (r - l) > (bot - top) * 1.2
    sk = [(y, x) for y, x in zip(ys, xs) if is_skin(a[y, x])]
    # the head: around the highest skin (standing) or the skin end of the body (lying)
    if lying:
        sx = np.mean([x for _, x in sk]) if sk else W / 2
        head = lambda y, x: abs(x - sx) <= 9 or (x > sx if sx > (l + r) / 2 else x < sx)
    else:
        lim = top + max(10, int((bot - top) * .42))
        head = lambda y, x: y <= lim
    out = a.copy()
    for y, x in zip(ys, xs):
        c = a[y, x]
        if is_skin(c): out[y, x, :3] = ramp(SKIN[skin], (lum(c) - ref['s0']) / ref['sr'])
        elif is_hairish(c) and head(y, x): out[y, x, :3] = ramp(HAIR[hair], (lum(c) - ref['h0']) / ref['hr'])
    return Image.fromarray(out)

def main(src, prefix, skin, hair, out):
    os.makedirs(out, exist_ok=True)
    files = sorted(glob.glob(os.path.join(src, prefix + '*.png')))
    S, Hh = [], []
    for f in files:
        a = np.array(Image.open(f).convert('RGBA')).reshape(-1, 4)
        for c in a[a[:, 3] > 0][::7]:
            if is_skin(c): S.append(lum(c))
            elif is_hairish(c): Hh.append(lum(c))
    ref = {'s0': np.percentile(S, 2), 'sr': np.percentile(S, 98) - np.percentile(S, 2) + 1,
           'h0': np.percentile(Hh, 2), 'hr': np.percentile(Hh, 98) - np.percentile(Hh, 2) + 1}
    for f in files:
        im = Image.open(f).convert('RGBA'); n = im.width // im.height; c = im.height
        o = Image.new('RGBA', im.size)
        for i in range(n): o.paste(recolour(im.crop((i * c, 0, i * c + c, c)), skin, hair, ref), (i * c, 0))
        o.save(os.path.join(out, os.path.basename(f)))

if __name__ == '__main__':
    main(*sys.argv[1:6])
