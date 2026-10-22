#!/usr/bin/env python3
"""Garden Plot animation: the scarecrow's top sways 1 px in the wind and the crop leaves ripple in a wave.
    python3 tools/art/farm_anim.py <in.png> <out_strip.png> <scarecrow box x0,y0,x1,y1> <sway rows y_top_end> [crop_top_y]
Pixels only shift by one place; colours are kept and nothing is rescaled."""
import sys, math
from PIL import Image

N = 12
def green(p): return p[3] and p[1] > p[0] + 10 and p[1] > p[2] + 15

def frames(im, box, sway_end, crop_y):
    W, H = im.size; px = im.load(); x0, y0, x1, y1 = box; out = []
    sway = [0, 0, 1, 1, 1, 0, 0, 0, -1, -1, -1, 0]
    for f in range(N):
        o = im.copy(); op = o.load()
        # scarecrow: rows y0..sway_end shift by s, rows sway_end+1..y1 by s only on the outer frames (a slight bend)
        s = sway[f]
        if s:
            rows = [(y, s) for y in range(y0, sway_end + 1)]
            for y, d in rows:
                line = [px[x, y] for x in range(x0, x1 + 1)]
                for x in range(x0, x1 + 1): op[x, y] = (0, 0, 0, 0) if line[x - x0][3] else op[x, y]
                for x in range(x0, x1 + 1):
                    c = line[x - x0]
                    if c[3] and x0 <= x + d <= x1: op[x + d, y] = c
                # rows that had a background behind keep it where the scarecrow moved away
                for x in range(x0, x1 + 1):
                    if op[x, y][3] == 0 and px[x, y][3] and y >= sway_end - 3: op[x, y] = px[x, y]
        # crops: the top pixel of each leaf column leans with a travelling wave
        for x in range(W):
            d = round(0.75 * math.sin(2 * math.pi * f / N - x * 0.45))
            if not d: continue
            for y in range(crop_y, H - 1):
                if green(px[x, y]) and not green(px[x, y - 1]) and green(px[x, y + 1]):
                    t = x + d
                    if 0 <= t < W and not green(px[t, y]) and px[t, y][3]:
                        op[t, y] = px[x, y]; op[x, y] = px[x, y + 1] if px[x, y + 1][3] else op[x, y]
        out.append(o)
    return out

if __name__ == '__main__':
    a = sys.argv[1:]; im = Image.open(a[0]).convert('RGBA')
    box = tuple(int(v) for v in a[2].split(',')); fr = frames(im, box, int(a[3]), int(a[4]) if len(a) > 4 else 20)
    strip = Image.new('RGBA', (im.width * N, im.height), (0, 0, 0, 0))
    for i, f in enumerate(fr): strip.alpha_composite(f, (i * im.width, 0))
    strip.save(a[1]); print('frames', N, im.size)
