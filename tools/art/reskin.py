#!/usr/bin/env python3
"""Template character test: dress the PixelLab farmer's animations as another profession by code.

Every pixel of every farmer frame is sorted into a body part by its colour (and, for the head, its position):
headwear, hair, skin, eyes, shirt, straps, trousers, boots, outline. A profession is a recolour of those parts plus a
new head (the straw hat becomes hair). Shading is kept: each part's colours map by brightness onto the new ramp.
    python3 tools/art/reskin.py <out_dir>     -> medic walk + swing A, front (se) and back (ne), PNG strips + GIFs"""
import sys, os, colorsys
import numpy as np
from PIL import Image, ImageSequence

SRC = os.path.join(os.path.dirname(os.path.abspath(__file__)), 'sources/small/farm_m_set')

def hsv(c):
    h, s, v = colorsys.rgb_to_hsv(*(np.array(c[:3]) / 255)); return h * 360, s, v
def lum(c): return (0.3 * c[0] + 0.59 * c[1] + 0.11 * c[2]) / 255

def kind(c):
    """colour -> part family (position decides the rest)"""
    r, g, b = int(c[0]), int(c[1]), int(c[2]); h, s, v = hsv(c)
    if v < .13: return 'K'                                      # outline
    if b > r and b > 150: return 'eye'                          # pale blue eyes / white highlight
    if r > 225 and g > 225 and b > 200: return 'eye'
    if 60 < h < 170 and g > r: return 'green'                   # shirt (and the hat band)
    if 170 <= h < 230: return 'strap'                           # dark teal suspenders
    if r > 205 and 115 < g < 200 and b > 75 and h < 30: return 'skin'
    if h >= 34 and v > .55: return 'straw'                      # hat straw / blond hair
    return 'brown'                                              # trousers, boots, hat-brim shadow

def ramp(cols, t):   # t in 0..1 (dark..light) -> one of the ramp colours
    return cols[min(len(cols) - 1, int(t * len(cols)))]

MEDIC = {
    'hair':  [(58, 34, 22), (86, 52, 30), (118, 74, 42), (150, 100, 58)],
    'coat':  [(96, 104, 120), (156, 164, 178), (206, 212, 220), (238, 240, 242), (252, 252, 250)],
    'strap': [(52, 86, 140), (74, 116, 176)],                  # blue scrub top showing at the neck
    'pants': [(36, 52, 92), (52, 76, 128), (70, 102, 160), (92, 128, 186)],
    'boots': [(34, 34, 40), (58, 58, 66), (84, 84, 94)],
}

def reskin(im, P, back):
    a = np.array(im.convert('RGBA')); H, W = a.shape[:2]
    ys, xs = np.where(a[..., 3] > 0)
    if not len(ys): return im
    top, bot = ys.min(), ys.max()
    K = np.empty((H, W), object)
    for y in range(H):
        for x in range(W): K[y, x] = kind(a[y, x]) if a[y, x, 3] else None
    # head: the face's first skin row (front) or the hat's lowest straw row (back) splits headwear from the body
    skin_rows = [y for y in range(top, top + 16) if sum(K[y, x] == 'skin' for x in range(W)) >= 3]
    if skin_rows and not back:
        st = skin_rows[0]; fx = [x for y in range(st, st + 4) for x in range(W) if K[y, x] == 'skin']; hx0, hx1 = min(fx), max(fx)
    else:
        st = max(y for y in range(top, top + 14) if any(K[y, x] == 'straw' for x in range(W))) + 1
        cx = [x for y in range(top + 1, top + 4) for x in range(W) if K[y, x] == 'straw']   # back: the hat's crown is the head's width
        hx0, hx1 = (min(cx), max(cx)) if cx else (0, W)
    gy = [y for y in range(st, H) for x in range(W) if K[y, x] == 'green']
    belt = max(gy) + 1 if gy else st + 13          # the shirt's lowest row: above it the bib is coat, below it trousers
    out = np.zeros_like(a)
    for y in range(H):
        for x in range(W):
            c = a[y, x]; k = K[y, x]
            if k is None: continue
            t = lum(c)
            if y < st:                                          # headwear zone: hat -> hair, brim -> gone
                if k == 'K': out[y, x] = c; continue
                if not (hx0 - 1 <= x <= hx1 + 1) or y < st - (7 if back else 4): continue
                out[y, x] = ramp(P['hair'], min(1, t * 1.1)) + (255,); continue
            if k in ('straw', 'strap', 'green') and y < st + 4 and not back: out[y, x] = ramp(P['hair'], t) + (255,); continue   # hair beside the face
            if y <= belt and k in ('brown', 'strap', 'straw') and not (k == 'brown' and t > .62):   # overall bib / straps on the chest -> the coat
                out[y, x] = ramp(P['coat'], .55 if k == 'strap' else min(1, t * 1.6)) + (255,); continue
            if k in ('skin', 'eye', 'K'): out[y, x] = c; continue
            if k == 'green': out[y, x] = ramp(P['coat'], min(1, t * 1.25)) + (255,); continue
            if k == 'strap': out[y, x] = ramp(P['strap'], t * 3) + (255,); continue
            if k == 'straw': out[y, x] = ramp(P['coat'], .9) + (255,); continue                   # buckle -> coat button
            out[y, x] = (ramp(P['boots'], t * 1.6) if y > bot - 4 else ramp(P['pants'], t * 1.5)) + (255,)
    hair_rows = [y for y in range(H) if any(tuple(out[y, x, :3]) in P['hair'] for x in range(W))]
    for n, y in enumerate(hair_rows[:2]):
        xs_ = [x for x in range(W) if out[y, x, 3] and out[y, x, :3].max() >= 34]
        for x in (xs_[:2 - n] + xs_[len(xs_) - (2 - n):]) if len(xs_) > 4 else []: out[y, x] = 0
    # outline: drop black pixels that no longer touch colour (the old brim), then close every colour edge
    col = lambda y, x: 0 <= y < H and 0 <= x < W and out[y, x, 3] and out[y, x, :3].max() >= 34
    o2 = out.copy()
    for y in range(H):
        for x in range(W):
            if out[y, x, 3] and out[y, x, :3].max() < 34 and not any(col(y + v, x + u) for u in (-1, 0, 1) for v in (-1, 0, 1)): o2[y, x] = 0
    o3 = o2.copy()
    for y in range(H):
        for x in range(W):
            if not o2[y, x, 3] and any(0 <= y + v < H and 0 <= x + u < W and o2[y + v, x + u, 3] and o2[y + v, x + u, :3].max() >= 34 for u, v in ((1, 0), (-1, 0), (0, 1), (0, -1))):
                o3[y, x] = (0, 0, 0, 255)
    return Image.fromarray(o3)

def frames(name):
    return [f.convert('RGBA') for f in ImageSequence.Iterator(Image.open(os.path.join(SRC, name + '.gif')))]

if __name__ == '__main__':
    out = sys.argv[1]; os.makedirs(out, exist_ok=True)
    for anim in ('walking', 'swing_a'):
        for d in ('se', 'ne'):
            fr = frames(f'{anim}_{d}'); md = [reskin(f, MEDIC, d == 'ne') for f in fr]
            w, h = fr[0].size; strip = Image.new('RGBA', (w * len(fr), h * 2), (0, 0, 0, 0))
            for i, (a, b) in enumerate(zip(fr, md)): strip.alpha_composite(a, (w * i, 0)); strip.alpha_composite(b, (w * i, h))
            strip.save(f'{out}/{anim}_{d}.png')
