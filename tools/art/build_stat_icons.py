#!/usr/bin/env python3
"""V2.47 stat and need icons, drawn in code on a 16-px grid (original pixel art): shapes + 3-tone shading + an automatic dark outline.
-> assets/ui/stats.png (one 16-px cell per icon, in NAMES order) + assets/ui/stats.json.  --preview PATH writes an enlarged labelled sheet."""
import json, math, os, sys
from PIL import Image, ImageDraw
ROOT = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
N = 16
NAMES = ['str', 'agi', 'int', 'end', 'per', 'cha', 'hunger', 'thirst', 'fatigue']
LABEL = {'str': 'STR', 'agi': 'AGI', 'int': 'INT', 'end': 'END', 'per': 'PER', 'cha': 'CHA', 'hunger': 'Hunger', 'thirst': 'Thirst', 'fatigue': 'Tired'}
OUT = (36, 26, 16, 255)

def blank(): return [[None] * N for _ in range(N)]
def put(g, x, y, c):
    if 0 <= x < N and 0 <= y < N: g[y][x] = c
def disc(g, cx, cy, r, c, sx=1.0, sy=1.0):
    for y in range(N):
        for x in range(N):
            if ((x + .5 - cx) / sx) ** 2 + ((y + .5 - cy) / sy) ** 2 <= r * r: g[y][x] = c
def rect(g, x0, y0, x1, y1, c):
    for y in range(y0, y1 + 1):
        for x in range(x0, x1 + 1): put(g, x, y, c)
def outline(g):
    o = [row[:] for row in g]
    for y in range(N):
        for x in range(N):
            if g[y][x] is None and any(0 <= x + dx < N and 0 <= y + dy < N and g[y + dy][x + dx] not in (None, OUT) for dx, dy in ((1, 0), (-1, 0), (0, 1), (0, -1))): o[y][x] = OUT
    return o
H = lambda s: tuple(int(s[i:i + 2], 16) for i in (1, 3, 5)) + (255,)

def i_str():   # iron dumbbell
    g = blank(); d, m, l = H('#4d5258'), H('#7d858c'), H('#b9c2c8')
    rect(g, 4, 7, 11, 8, m); rect(g, 4, 7, 11, 7, l)
    for x0 in (1, 11):
        rect(g, x0, 4, x0 + 3, 11, d); rect(g, x0, 4, x0 + 3, 4, m); rect(g, x0, 5, x0, 10, m); put(g, x0 + 1, 5, l)
    for x0 in (1, 11):   # round the plates
        for (x, y) in ((x0, 4), (x0 + 3, 4), (x0, 11), (x0 + 3, 11)): g[y][x] = None
    return outline(g)
def i_agi():   # running shoe (toe to the right) with speed lines
    g = blank(); w, s, r, rd, sole = H('#f3ead2'), H('#bdb196'), H('#d0503c'), H('#8e2f22'), H('#5a3d22')
    rect(g, 5, 4, 8, 9, w); rect(g, 5, 4, 8, 4, s); rect(g, 9, 7, 12, 9, w); rect(g, 13, 8, 14, 9, w)
    rect(g, 6, 6, 8, 6, r); rect(g, 9, 8, 11, 8, r); put(g, 12, 8, r)
    rect(g, 5, 10, 14, 10, s); rect(g, 5, 11, 14, 11, sole); put(g, 14, 11, None)
    o = outline(g)
    for y, x0, x1 in ((5, 1, 3), (8, 0, 3), (11, 1, 2)): rect(o, x0, y, x1, y, H('#f0e2b4'))
    return o
def i_int():   # light bulb
    g = blank(); y1, y2, y3, gr, gd = H('#ffe27a'), H('#f2b63a'), H('#fff8d6'), H('#9aa2a8'), H('#5f666c')
    disc(g, 8, 6.2, 5.1, y2); disc(g, 7.6, 5.8, 4.2, y1); rect(g, 5, 3, 6, 4, y3); put(g, 5, 5, y3)
    rect(g, 6, 11, 9, 11, y2); rect(g, 6, 12, 9, 12, gr); rect(g, 6, 13, 9, 13, gd); rect(g, 7, 14, 8, 14, gr)
    return outline(g)
def i_end():   # heart
    g = blank(); r, rd, l = H('#e0483a'), H('#9c2a21'), H('#ff9a86')
    disc(g, 5.3, 6, 3.6, r); disc(g, 10.7, 6, 3.6, r)
    for y in range(6, 15):
        for x in range(N):
            if abs(x + .5 - 8) <= (14.2 - y) * 1.0 and y <= 13: g[y][x] = r
    for y in range(8, 14):
        for x in range(8, N):
            if g[y][x] == r and abs(x + .5 - 8) >= (14.2 - y) * 1.0 - 1.4: g[y][x] = rd
    rect(g, 4, 4, 5, 4, l); put(g, 3, 5, l); put(g, 4, 5, l)
    return outline(g)
def i_per():   # eye
    g = blank(); w, s, b, bd, k = H('#f6efdc'), H('#c9bfa6'), H('#4f8fd0'), H('#2c5a8f'), H('#16110b')
    for y in range(N):
        for x in range(N):
            if abs(y + .5 - 8) <= 4.2 * math.cos((x + .5 - 8) / 7.6 * math.pi / 2) and 1 <= x <= 14: g[y][x] = w
    for x in range(2, 14):
        if g[5][x] == w: g[5][x] = s
    disc(g, 8, 8, 3.2, b); disc(g, 8.3, 8.6, 2.2, bd); disc(g, 8, 8, 1.3, k); put(g, 7, 6, w); put(g, 6, 7, w)
    return outline(g)
def i_cha():   # speech bubble
    g = blank(); w, s, k = H('#fff5dc'), H('#d9c9a0'), H('#6a4a2a')
    disc(g, 8, 6.8, 6.4, w, 1.0, .72); rect(g, 4, 11, 6, 11, w); rect(g, 3, 12, 4, 12, w); put(g, 2, 13, w)
    for x in range(N):
        for y in range(8, 12):
            if g[y][x] == w and (y >= 10 or x >= 13): g[y][x] = s
    for cx in (5, 8, 11): rect(g, cx, 7, cx, 7, k)
    return outline(g)
def i_hunger():   # drumstick
    g = blank(); m, md, ml, b, bs = H('#c8743a'), H('#8a4520'), H('#eba264'), H('#f6efdc'), H('#c9bfa6')
    disc(g, 6.2, 6.2, 4.8, m); disc(g, 7.4, 7.4, 3.4, md); disc(g, 5.8, 5.8, 3.5, m); rect(g, 3, 3, 4, 3, ml); put(g, 3, 4, ml); put(g, 5, 2, ml)
    for i in range(4): rect(g, 9 + i, 9 + i, 10 + i, 10 + i, b)
    disc(g, 13.2, 12.4, 1.3, b); disc(g, 12.4, 13.2, 1.3, b); put(g, 13, 13, bs); put(g, 11, 12, bs)
    return outline(g)
def i_thirst():   # water drop
    g = blank(); b, bd, bl, w = H('#4fa3e0'), H('#2a6aa8'), H('#9fd6ff'), H('#eaf8ff')
    disc(g, 8, 10, 4.6, b)
    for y in range(1, 10):
        for x in range(N):
            if abs(x + .5 - 8) <= (y - 1) * .55: g[y][x] = b
    for y in range(9, 15):
        for x in range(9, N):
            if g[y][x] == b and (x + y) >= 21: g[y][x] = bd
    rect(g, 5, 9, 5, 11, bl); put(g, 6, 8, bl); put(g, 6, 12, w)
    return outline(g)
def i_fatigue():   # crescent moon and a z
    g = blank(); y1, y2, yl, z = H('#f2cf5a'), H('#c9952c'), H('#fff2b0'), H('#dfe8ff')
    disc(g, 7, 9, 5.6, y1)
    for y in range(N):
        for x in range(N):
            if ((x + .5 - 10) ** 2 + (y + .5 - 6.6) ** 2) <= 4.6 ** 2: g[y][x] = None
    for y in range(N):
        for x in range(N):
            if g[y][x] == y1 and (x + .5 - 7) * .6 + (y + .5 - 9) >= 3: g[y][x] = y2
    put(g, 3, 8, yl); put(g, 3, 9, yl); put(g, 4, 6, yl)
    o = outline(g)
    for (x, y) in ((11, 0), (12, 0), (13, 0), (14, 0), (13, 1), (12, 2), (11, 3), (12, 3), (13, 3), (14, 3)): put(o, x, y, z)
    return o
F = [i_str, i_agi, i_int, i_end, i_per, i_cha, i_hunger, i_thirst, i_fatigue]
def to_img(g):
    im = Image.new('RGBA', (N, N), (0, 0, 0, 0))
    for y in range(N):
        for x in range(N):
            if g[y][x]: im.putpixel((x, y), g[y][x])
    return im
icons = [to_img(f()) for f in F]
if '--preview' in sys.argv:
    out = sys.argv[sys.argv.index('--preview') + 1]; Z = 8; cw = N * Z + 40
    sheet = Image.new('RGBA', (cw * len(icons) + 20, N * Z + 70), (92, 70, 48, 255)); d = ImageDraw.Draw(sheet)
    for i, im in enumerate(icons):
        sheet.alpha_composite(im.resize((N * Z, N * Z), Image.NEAREST), (20 + i * cw, 14)); d.text((20 + i * cw + N * Z // 2 - 14, N * Z + 26), LABEL[NAMES[i]], fill=(255, 240, 200, 255))
        sheet.alpha_composite(im.resize((N * 2, N * 2), Image.NEAREST), (20 + i * cw + N * Z // 2 - 16, N * Z + 40))
    sheet.save(out); print('preview', out)
else:
    strip = Image.new('RGBA', (N * len(icons), N), (0, 0, 0, 0))
    for i, im in enumerate(icons): strip.alpha_composite(im, (i * N, 0))
    strip.save(os.path.join(ROOT, 'assets', 'ui', 'stats.png')); json.dump({'n': N, 'icons': NAMES}, open(os.path.join(ROOT, 'assets', 'ui', 'stats.json'), 'w')); print('stats icons', len(icons))
