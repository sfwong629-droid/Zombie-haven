#!/usr/bin/env python3
"""Waving flag for a building sprite: the cloth's columns move up and down in a wave that grows away from the pole.
    python3 tools/art/flag_wave.py <in.png> <side: r|l> <pole_x> <bottom_y> <out_strip.png> [frames=6] [amp=1.5]
side r = the flag hangs to the right of the pole (cloth columns x > pole_x), l = to the left (x < pole_x).
Only pixels above bottom_y are cloth. Pixels keep their colours; nothing is redrawn or rescaled."""
import sys, math
from PIL import Image

def wave(im, side, pole, bottom, n=6, amp=1.5):
    W, H = im.size; px = im.load()
    cols = range(pole + 1, W) if side == 'r' else range(pole - 1, -1, -1)
    cloth = [(x, y) for x in cols for y in range(bottom + 1) if px[x, y][3]]
    L = max(abs(x - pole) for x, _ in cloth)
    frames = []
    for f in range(n):
        out = im.copy(); op = out.load()
        for x, y in cloth: op[x, y] = (0, 0, 0, 0)
        for x, y in cloth:
            d = abs(x - pole); ph = 2 * math.pi * f / n - d * 0.55
            dy = round(amp * math.sin(ph) * (d / L) ** 0.8)
            if 0 <= y + dy < H: op[x, y + dy] = px[x, y]
        frames.append(out)
    return frames

if __name__ == '__main__':
    a = sys.argv[1:]; im = Image.open(a[0]).convert('RGBA')
    n = int(a[5]) if len(a) > 5 else 6; amp = float(a[6]) if len(a) > 6 else 1.5
    fr = wave(im, a[1], int(a[2]), int(a[3]), n, amp)
    strip = Image.new('RGBA', (im.width * n, im.height), (0, 0, 0, 0))
    for i, f in enumerate(fr): strip.alpha_composite(f, (i * im.width, 0))
    strip.save(a[4]); print('frames', n, 'size', im.size)
