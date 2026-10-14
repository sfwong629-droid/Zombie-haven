#!/usr/bin/env python3
"""Straighten a generated isometric building so its ground footprint is exact 2:1 and exactly w × h tiles.
AI images often draw the base edges too flat (e.g. 1:2.8 instead of 1:2) and the two sides out of proportion.
We find the footprint's left, bottom (south) and right corners and warp the LEFT face and the RIGHT face separately
(two linear pieces that meet at the south corner): verticals stay vertical, each base edge lands exactly on the
2:1 grid, and heights scale with the average width change so proportions survive.
fix_footprint(im, L, B, R, w, h, S) -> (image, (sx, sy)) with (sx, sy) = south corner in output pixels,
at S output px per art px on the HD grid (tile 192 × 96 art px)."""
import numpy as np
from PIL import Image

def corners(im, is_bg, low=0.45):
    W, H = im.size; px = im.load()
    pts = [(x, y) for y in range(int(H * low), H) for x in range(W) if not is_bg(px[x, y])]
    return min(pts, key=lambda p: (p[0], p[1])), max(pts, key=lambda p: p[1]), max(pts, key=lambda p: (p[0], -p[1]))

def fix_footprint(im, L, B, R, w, h, S=5, tile=192, pad=30):
    hw, hh = tile / 2 * S, tile / 4 * S
    Lt, Rt = (-hw * w, -hh * w), (hw * h, -hh * h)
    a1 = Lt[0] / (L[0] - B[0]); a2 = Rt[0] / (R[0] - B[0]); d = (a1 + a2) / 2
    k1 = (Lt[1] - d * (L[1] - B[1])) / (L[0] - B[0]); k2 = (Rt[1] - d * (R[1] - B[1])) / (R[0] - B[0])
    src = np.asarray(im.convert('RGB')); H, W = src.shape[:2]
    # forward-map the source box to size the output
    xs = np.array([0, W]); X = np.concatenate([np.where(xs < B[0], a1, a2) * (xs - B[0])])
    top = min((0 - B[1]) * d + k * (x - B[0]) for x, k in ((0, k1), (B[0], k1), (W, k2)))
    bot = max((H - B[1]) * d + k * (x - B[0]) for x, k in ((0, k1), (B[0], k1), (W, k2)))
    x0, x1 = a1 * (0 - B[0]) - pad, a2 * (W - B[0]) + pad; y0, y1 = top - pad, bot + pad
    OW, OH = int(x1 - x0), int(y1 - y0)
    gx, gy = np.meshgrid(np.arange(OW) + x0 + .5, np.arange(OH) + y0 + .5)
    left = gx < 0; a = np.where(left, a1, a2); k = np.where(left, k1, k2)
    sx = B[0] + gx / a; sy = B[1] + (gy - k * (sx - B[0])) / d
    ok = (sx >= 0) & (sx < W) & (sy >= 0) & (sy < H)
    out = np.empty((OH, OW, 3), np.uint8); out[:] = (255, 0, 255)
    out[ok] = src[sy[ok].astype(int), sx[ok].astype(int)]
    return Image.fromarray(out), (-x0, -y0)

def repix_anchor(im, s, sx, sy, is_bg):
    """art-pixel sampling with the grid anchored ON the south corner (sx, sy); returns (sprite, (ax, ay)) where
    (ax, ay) is the south corner in sprite pixels (the game's building anchor)."""
    from collections import Counter
    W, H = im.size; px = im.load()
    pts = [(x, y) for y in range(0, H, 2) for x in range(0, W, 2) if not is_bg(px[x, y])]
    x0, y0, x1, y1 = min(p[0] for p in pts), min(p[1] for p in pts), max(p[0] for p in pts) + 2, max(p[1] for p in pts) + 2
    i0 = int((x0 - sx) // s) - 1; i1 = int((x1 - sx) // s) + 1; j0 = int((y0 - sy) // s) - 1; j1 = int((y1 - sy) // s) + 1
    out = Image.new('RGBA', (i1 - i0, j1 - j0), (0, 0, 0, 0)); op = out.load()
    for j in range(j0, j1):
        for i in range(i0, i1):
            gx = sx + i * s; gy = sy + j * s; c = Counter()
            for yy in range(int(gy + s * .3), int(gy + s * .7) + 1):
                for xx in range(int(gx + s * .3), int(gx + s * .7) + 1):
                    if 0 <= xx < W and 0 <= yy < H: p = px[xx, yy]; c[None if is_bg(p) else (p[0] >> 2 << 2, p[1] >> 2 << 2, p[2] >> 2 << 2)] += 1
            if not c: continue
            k, n = c.most_common(1)[0]
            if k is None and n < sum(c.values()) * .55: k = next(q for q, _ in c.most_common() if q is not None)
            if k is not None: op[i - i0, j - j0] = k + (255,)
    bb = out.getbbox(); return out.crop(bb), (-i0 - bb[0], -j0 - bb[1])
