#!/usr/bin/env python3
"""Chimney smoke for a building sprite: pixel puffs rise from the chimney top, grow, drift and thin out.
    python3 tools/art/smoke.py <in.png> <chimney_x> <chimney_top_y> <out_strip.png> [frames=12] [headroom=18]
Writes a strip of frames, each the sprite with `headroom` empty rows added on top (the building's pixels are untouched);
the game draws the frame `headroom` rows higher so the building stays in place (8 extra columns on the right)."""
import sys, math
from PIL import Image

LIGHT, MID, DARK = (232, 230, 224, 255), (196, 194, 190, 255), (138, 136, 140, 255)
SHAPES = {   # rows of the puff: L light, M shade, . empty
    1: ['LL', 'LM'],
    2: ['.LL.', 'LLLM', 'LLMM', '.MM.'],
    3: ['.LLL.', 'LLLLM', 'LLLMM', 'LLMMM', '.MMM.'],
    4: ['..LLL..', '.LLLLL.', 'LLLLLLM', 'LLLLLMM', '.LLMMM.', '..MMM..'],
}

def puff(op, W, H, cx, cy, size, thin):
    rows = SHAPES[size]; h = len(rows); w = len(rows[0]); x0 = round(cx - w / 2); y0 = round(cy - h / 2)
    cells = {(x0 + i, y0 + j): (LIGHT if c == 'L' else MID) for j, r in enumerate(rows) for i, c in enumerate(r) if c != '.'}
    if thin: cells = {p: c for p, c in cells.items() if (p[0] + p[1]) % 2 == 0}   # dissolving: checkerboard
    edge = set()
    if not thin:
        for (x, y) in cells:
            for dx, dy in ((1, 0), (-1, 0), (0, 1), (0, -1)):
                q = (x + dx, y + dy)
                if q not in cells: edge.add(q)
    for (x, y) in edge:
        if 0 <= x < W and 0 <= y < H and op[x, y][3] == 0: op[x, y] = DARK
    for (x, y), c in cells.items():
        if 0 <= x < W and 0 <= y < H: op[x, y] = c

def smoke(im, cx, top, n=12, head=18, drift=0.45):
    W, H = im.width + 8, im.height + head; life = n; puffs = 4; frames = []
    for f in range(n):
        out = Image.new('RGBA', (W, H), (0, 0, 0, 0)); out.alpha_composite(im, (0, head)); op = out.load()   # 8 spare columns on the right for the drift
        ages = sorted(((f + k * n // puffs) % life for k in range(puffs)), reverse=True)   # oldest (highest) first
        for a in ages:
            t = a / (life - 1)
            y = head + top - 1 - (t ** 0.85) * (head - 3)
            x = cx + drift * a + math.sin(a * 0.9) * 0.8
            size = 1 if t < 0.1 else (2 if t < 0.35 else (3 if t < 0.65 else 4))
            puff(op, W, H, x, y, size, thin=t > 0.85)
        frames.append(out)
    return frames

if __name__ == '__main__':
    a = sys.argv[1:]; im = Image.open(a[0]).convert('RGBA')
    n = int(a[4]) if len(a) > 4 else 12; head = int(a[5]) if len(a) > 5 else 18
    fr = smoke(im, float(a[1]), int(a[2]), n, head)
    strip = Image.new('RGBA', (fr[0].width * n, fr[0].height), (0, 0, 0, 0))
    for i, f in enumerate(fr): strip.alpha_composite(f, (i * f.width, 0))
    strip.save(a[3]); print('frames', n, 'frame size', fr[0].size, 'headroom', head)
