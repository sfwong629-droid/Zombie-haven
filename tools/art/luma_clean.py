#!/usr/bin/env python3
"""Light clean-up for a Luma walk read onto our pixel grid ("Luma raw"): keeps Luma's own colours and motion, only fixes
the video's smudges.  python3 tools/art/luma_clean.py in.png out.png
1. grey ghost pixels (motion blur against the grey background) on the edge -> removed
2. stray single pixels sticking out of the silhouette -> removed
3. lone speckles inside (one pixel far from all 4 neighbours, which agree with each other) -> the neighbours' average
4. gaps in the black outline -> filled (empty pixel touching a coloured, non-outline pixel becomes black)"""
import sys
import numpy as np
from PIL import Image

N4 = ((1, 0), (-1, 0), (0, 1), (0, -1))

def clean_cell(a):
    H, W = a.shape[:2]
    op = lambda y, x: 0 <= y < H and 0 <= x < W and a[y, x, 3] > 0
    for _ in range(2):   # 1 + 2
        b = a.copy()
        for y in range(H):
            for x in range(W):
                if not a[y, x, 3]: continue
                c = a[y, x, :3].astype(int); n = sum(op(y + v, x + u) for u, v in N4)
                grey = c.max() - c.min() < 22 and 45 < c.mean() < 150
                if n <= 1 or (grey and n < 4): b[y, x] = 0
        a = b
    b = a.copy()   # 3
    for y in range(1, H - 1):
        for x in range(1, W - 1):
            if not a[y, x, 3] or not all(op(y + v, x + u) for u, v in N4): continue
            nb = np.array([a[y + v, x + u, :3] for u, v in N4]).astype(int); c = a[y, x, :3].astype(int)
            if np.abs(nb - c).sum(1).min() > 70 and np.abs(nb - nb.mean(0)).sum(1).max() < 60: b[y, x, :3] = nb.mean(0)
    a = b
    b = a.copy()   # 4
    for y in range(H):
        for x in range(W):
            if a[y, x, 3]: continue
            for u, v in N4:
                if op(y + v, x + u) and a[y + v, x + u, :3].astype(int).sum() > 90: b[y, x] = (0, 0, 0, 255); break
    return b

if __name__ == '__main__':
    s = np.array(Image.open(sys.argv[1]).convert('RGBA')); h = s.shape[0]
    out = np.concatenate([clean_cell(s[:, i:i + h].copy()) for i in range(0, s.shape[1], h)], 1)
    Image.fromarray(out).save(sys.argv[2])
