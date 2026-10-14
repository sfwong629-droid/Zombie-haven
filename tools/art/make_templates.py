#!/usr/bin/env python3
"""Guide images for ChatGPT: the exact 2:1 footprint diamond (and wall guides) on flat magenta, at 4 image px per HD art px.
Image models follow a drawn outline far better than a written angle. -> tools/art/templates/footprint_<w>x<h>.png"""
import os
from PIL import Image, ImageDraw
OUT = os.path.join(os.path.dirname(__file__), 'templates')
S = 4; HW, HH = 96 * S, 48 * S          # half tile across / down in image px (HD tile 192 x 96 art px)
def template(w, h, wall=1.3):
    Wd = HW * (w + h) + 2 * 120; Hd = HH * (w + h) + int(HW * wall * 1.6) + 2 * 120
    im = Image.new('RGB', (Wd, Hd), (255, 0, 255)); d = ImageDraw.Draw(im)
    bx = 120 + HW * w; by = Hd - 120                                   # south corner
    L = (bx - HW * w, by - HH * w); R = (bx + HW * h, by - HH * h); T = (L[0] + HW * h, L[1] - HH * h); Bt = (bx, by)
    d.polygon([Bt, L, T, R], fill=(214, 168, 96))                      # the ground the building stands on
    d.line([Bt, L, T, R, Bt], fill=(40, 26, 14), width=6)
    up = int(HW * wall)                                                # suggested wall height: dashed verticals at the 3 front corners
    for (x, y) in (L, Bt, R):
        for k in range(0, up, 28): d.line([(x, y - k), (x, y - k - 14)], fill=(40, 26, 14), width=4)
    for a, b in ((L, Bt), (Bt, R)):                                    # dashed top edges, parallel to the ground edges
        n = 24
        for i in range(0, n, 2):
            p = (a[0] + (b[0] - a[0]) * i / n, a[1] - up + (b[1] - a[1]) * i / n); q = (a[0] + (b[0] - a[0]) * (i + 1) / n, a[1] - up + (b[1] - a[1]) * (i + 1) / n)
            d.line([p, q], fill=(40, 26, 14), width=4)
    os.makedirs(OUT, exist_ok=True); f = os.path.join(OUT, f'footprint_{w}x{h}.png'); im.save(f); print(f, im.size)
for w, h in ((1, 1), (2, 1), (2, 2)): template(w, h)
