#!/usr/bin/env python3
"""Side-by-side ChatGPT guide: an approved building on the left guide, an empty guide on the right (same pixel size).
    python3 tools/art/make_view_guide.py <size: 1x1|2x1|2x2> <building.png> <out.png>"""
import sys
from PIL import Image
S = 12
GEO = {'1x1': (72, 32, 78), '2x1': (100, 46, 92), '2x2': (128, 60, 106)}   # panel width, diamond centre x, diamond bottom y (art px)
size, src, dst = sys.argv[1:4]
g = Image.open(f'tools/art/templates/t56/footprint_{size}.png').convert('RGB')
PW, CX, BY = GEO[size]; PH = g.height // S
panel = g.crop((0, 0, PW * S, PH * S)); pp = panel.load()
for y in range(panel.height):
    for x in range(panel.width):
        r, gg, b = pp[x, y]
        if not ((r > 200 and b > 200 and gg < 80) or (b > 180 and r < 120)): pp[x, y] = (255, 0, 255)
t = Image.open(src).convert('RGBA')
left = panel.convert('RGBA'); left.alpha_composite(t.resize((t.width * S, t.height * S), Image.NEAREST), ((CX - t.width // 2) * S, (BY + 1 - t.height) * S))
out = Image.new('RGB', (2 * PW * S + 4 * S, PH * S), (255, 0, 255)); out.paste(left.convert('RGB'), (0, 0)); out.paste(panel, (PW * S + 4 * S, 0))
out.save(dst); print(dst, out.size)
