#!/usr/bin/env python3
"""Zombie Haven V3 map art: wall segments and props as true pixel art at the map's pixel size (tile = 42 x 21 art px).

    python3 tools/chars/mapart.py     # assets/map/walls.png + props.png + map.json

Walls: one sprite per type x neighbour mask (W,E,N,S joins) x damage (clean/cracked), plus rubble. Each cell's
anchor (ax, ay) is the tile's NORTH corner. Props: pines, dead trees, bushes, rocks, crates, barrels, tyres, rubble,
a burnt-out car; anchor = the ground point under the prop's centre.
"""
import json, math, os, sys, random
sys.path.insert(0, os.path.dirname(__file__))
from pix import Cv, hx, adj, texture, outline_sel, ramp4
from PIL import Image

ROOT = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
OUT = os.path.join(ROOT, 'assets', 'map')
TX, TY = 21, 10.5
WW, WH, TOP = 46, 56, 30          # wall cell; tile north corner at (TX + 2, TOP)
HGT = {'wood': 17, 'metal': 22, 'gate': 19}

def P(u, v, z=0):   # tile coords -> cell px
    return (TX + 2 + (u - v) * TX, TOP + (u + v) * TY - z)

def poly(cv, pts, col, tag):
    from PIL import ImageDraw
    m = Image.new('L', (cv.w, cv.h), 0); ImageDraw.Draw(m).polygon([(round(x), round(y)) for x, y in pts], fill=255); mp = m.load()
    for y in range(cv.h):
        for x in range(cv.w):
            if mp[x, y]: cv.set(x, y, col, tag)

def wall(kind, mask, cracked, seed):
    W, E, N, S = mask; a0, a1 = .36, .64
    boxes = []   # back to front: N arm, W arm, post, E arm, S arm
    if N: boxes.append((a0, a1, 0, .5))
    if W: boxes.append((0, .5, a0, a1))
    boxes.append((.3, .7, .3, .7))
    if E: boxes.append((.5, 1, a0, a1))
    if S: boxes.append((a0, a1, .5, 1))
    h = HGT[kind]; cv = Cv(WW, WH); rnd = random.Random(seed)
    base = {'wood': '#8a6238', 'metal': '#7e8a92', 'gate': '#9a6e3c'}[kind]; R = ramp4(base)
    for (x0, x1, y0, y1) in boxes:
        poly(cv, [P(x0, y1), P(x1, y1), P(x1, y1, h), P(x0, y1, h)], R['b'], 'sw'); poly(cv, [P(x1, y1), P(x1, y0), P(x1, y0, h), P(x1, y1, h)], R['sh'], 'se')
        poly(cv, [P(x0, y0, h), P(x1, y0, h), P(x1, y1, h), P(x0, y1, h)], R['hi'], 'tp')
    x0, x1, y0, y1 = .3, .7, .3, .7
    sw_m, se_m = cv.mask('sw'), cv.mask('se')
    if kind == 'wood':   # vertical stakes with pointed tops, rope band, nails
        for (x, y) in sw_m | se_m:
            if x % 3 == 0: cv.p[y][x] = R['dk']
        for (x, y) in list(cv.mask('tp')): cv.p[y][x] = None; cv.tag[y][x] = None
        for x in range(cv.w):
            col = [y for y in range(cv.h) if cv.tag[y][x] in ('sw', 'se')]
            if col and x % 3 != 0:
                t = min(col); cv.set(x, t - 1, R['hi'], 'tip');
                if x % 3 == 1: cv.set(x, t - 2, R['hi'], 'tip'); cv.set(x, t - 3, adj(R['hi'], .05), 'tip')
        for (x, y) in sw_m | se_m:
            col = [yy for yy in range(cv.h) if cv.tag[yy][x] in ('sw', 'se')]
            if col and y == min(col) + 6: cv.p[y][x] = hx('#c8a86a')
    elif kind == 'metal':   # corrugated sheets, rivet rows, rust
        for (x, y) in sw_m | se_m:
            c = R['b'] if (x, y) in sw_m else R['sh']
            cv.p[y][x] = adj(c, .06) if x % 2 else adj(c, -.05)
        for (x, y) in sw_m | se_m:
            col = [yy for yy in range(cv.h) if cv.tag[yy][x] in ('sw', 'se')]
            if col and (y - min(col)) in (3, 15) and x % 3 == 0: cv.p[y][x] = hx('#d8dde0')
            if rnd.random() < .05: cv.p[y][x] = hx('#8a4a2a')
        for (x, y) in cv.mask('tp'): cv.p[y][x] = hx('#a8b2b8')
    else:   # gate: planks, two iron bands, a centre seam
        for (x, y) in sw_m | se_m:
            col = [yy for yy in range(cv.h) if cv.tag[yy][x] in ('sw', 'se')]
            d = y - min(col) if col else 0
            if d in (4, 5, 13, 14): cv.p[y][x] = hx('#3a3a40') if d in (4, 13) else hx('#5a5a62')
            elif x % 4 == 0: cv.p[y][x] = R['dk']
        mid = P((x0 + x1) / 2, y1)
        for y in range(int(mid[1] - h), int(mid[1])): cv.set(int(mid[0]), y, hx('#2a1e14'), 'seam')
        cv.set(int(mid[0]) - 2, int(mid[1] - h / 2), hx('#f2d27a'), 'ring'); cv.set(int(mid[0]) + 2, int(mid[1] - h / 2), hx('#f2d27a'), 'ring')
    texture(cv, 'sw', R, .08, seed); texture(cv, 'se', R, .08, seed + 1)
    if cracked:
        for (x, y) in sorted(sw_m | se_m):
            if rnd.random() < .07: cv.p[y][x] = hx('#1e1410')
        cx, cy = P((x0 + x1) / 2, y1, h * .7)
        for k in range(6): cv.set(int(cx + k % 2 - 1), int(cy + k), hx('#1a100c'), 'crk')
    outline_sel(cv); return cv

def rubble(seed):
    cv = Cv(WW, WH); rnd = random.Random(seed)
    for k in range(16):
        u, v = .2 + rnd.random() * .6, .2 + rnd.random() * .6; x, y = P(u, v); c = rnd.choice(['#7a6a58', '#8a7a64', '#6a5a4a', '#8a6238', '#5e6a72'])
        cv.ell(x, y - 2, rnd.randint(1, 3), rnd.randint(1, 2), hx(c), 'r%d' % k); cv.set(x - 1, y - 3, adj(hx(c), .1), 'r%d' % k)
    outline_sel(cv); return cv

# ---------------------------------------------------------------- props
def pine(seed, tall=1.0):
    cv = Cv(30, 46); rnd = random.Random(seed); g = ramp4('#3f6a3c'); cx, gy = 15, 43
    cv.rect(cx - 1, gy - 7, cx + 1, gy, hx('#5e4228'), 'trunk')
    tiers = [(gy - 6, 11), (gy - 13, 9), (gy - 20, 7), (gy - 26, 5), (gy - 31, 3)]
    for i, (y, r) in enumerate(tiers):
        r = round(r * tall)
        for yy in range(int(y - 8 * tall), y + 1):
            w = r * (yy - (y - 8 * tall)) / (8 * tall)
            for xx in range(int(cx - w), int(cx + w) + 1): cv.set(xx, yy, g['b'], 'leaf')
    cv.set(cx, gy - 40, g['b'], 'leaf')
    m = cv.mask('leaf')
    for (x, y) in m:
        if (x + 1, y) not in m or (x, y + 1) not in m: cv.p[y][x] = g['dk']
        elif x > cx + 1 and rnd.random() < .5: cv.p[y][x] = g['sh']
        elif x < cx - 1 and rnd.random() < .3: cv.p[y][x] = g['hi']
        elif rnd.random() < .12: cv.p[y][x] = g['sh']
    for (x, y) in m:
        if (x, y + 1) not in m and rnd.random() < .5: cv.set(x, y + 1, g['dk'], 'leaf')
    cv.shade('trunk', ramp4('#5e4228')); outline_sel(cv); return cv, cx, gy

def deadtree(seed):
    cv = Cv(30, 42); rnd = random.Random(seed); b = ramp4('#6a5440'); cx, gy = 15, 39
    cv.line(cx, gy, cx, gy - 22, b['b'], 2, 'tr')
    for (sx, sy, ex, ey) in ((cx, gy - 14, cx - 8, gy - 22), (cx, gy - 18, cx + 7, gy - 27), (cx, gy - 22, cx - 3, gy - 31), (cx - 5, gy - 19, cx - 9, gy - 18), (cx + 4, gy - 23, cx + 9, gy - 24)):
        cv.line(sx, sy, ex, ey, b['b'], 1, 'br')
    cv.shade('tr', b); outline_sel(cv); return cv, cx, gy

def bush(seed):
    cv = Cv(24, 18); rnd = random.Random(seed); g = ramp4(rnd.choice(['#4d7a3a', '#5a7a34', '#3f6a40'])); cx, gy = 12, 15
    for k in range(5): cv.ell(cx - 6 + k * 3, gy - 4 - (k % 2) * 2, 4, 3.5, g['b'], 'b')
    m = cv.mask('b')
    for (x, y) in m:
        if (x, y + 1) not in m or (x + 1, y) not in m: cv.p[y][x] = g['dk']
        elif rnd.random() < .22: cv.p[y][x] = g['sh']
        elif (x, y - 1) not in m: cv.p[y][x] = g['hi']
    if rnd.random() < .5:
        for k in range(3): cv.set(cx - 4 + k * 4, gy - 6 + k % 2, hx('#e84a4a'), 'berry')
    outline_sel(cv); return cv, cx, gy

def rock(seed):
    cv = Cv(22, 16); rnd = random.Random(seed); r = ramp4(rnd.choice(['#7a7670', '#6e6a64', '#82786a'])); cx, gy = 11, 13
    cv.ell(cx, gy - 4, 7, 4, r['b'], 'r'); cv.ell(cx + 3, gy - 6, 4, 3, r['b'], 'r')
    cv.shade('r', r); texture(cv, 'r', r, .12, seed, True)
    for k in range(3): cv.set(cx - 4 + k * 3, gy - 6 + k, hx('#5e8a4a'), 'moss')
    outline_sel(cv); return cv, cx, gy

def crate(seed):
    cv = Cv(24, 24); cx, gy = 12, 21; R = ramp4('#9a6a3a')
    pts = lambda u, v, z: (cx + (u - v) * 7, gy - 3.5 + (u + v) * 3.5 - z - 7)
    poly(cv, [pts(-1, 1, 0), pts(1, 1, 0), pts(1, 1, 11), pts(-1, 1, 11)], R['b'], 'a'); poly(cv, [pts(1, 1, 0), pts(1, -1, 0), pts(1, -1, 11), pts(1, 1, 11)], R['sh'], 'b'); poly(cv, [pts(-1, -1, 11), pts(1, -1, 11), pts(1, 1, 11), pts(-1, 1, 11)], R['hi'], 'c')
    for t in ('a', 'b'):
        m = cv.mask(t); ys = [y for _, y in m]; y0, y1 = min(ys), max(ys)
        for (x, y) in m:
            if y in (y0 + 1, y1 - 1) or (x - cx) % 6 == 0: cv.p[y][x] = R['dk']
    outline_sel(cv); return cv, cx, gy

def barrel(seed):
    cv = Cv(18, 24); cx, gy = 9, 21; rnd = random.Random(seed); R = ramp4(rnd.choice(['#3f6a8a', '#8a3a2a', '#5a6a3a']))
    cv.rect(cx - 5, gy - 14, cx + 5, gy - 1, R['b'], 'b'); cv.ell(cx, gy - 14, 5, 2, R['hi'], 't'); cv.ell(cx, gy - 1, 5, 1.5, R['b'], 'b')
    cv.shade('b', R)
    for y in (gy - 11, gy - 5): cv.rect(cx - 5, y, cx + 5, y, R['dk'], 'band')
    for (x, y) in sorted(cv.mask('b')):
        if rnd.random() < .08: cv.p[y][x] = hx('#7a4a2a')
    cv.ell(cx, gy - 14, 3, 1, R['dk'], 'hole'); outline_sel(cv); return cv, cx, gy

def tyres(seed):
    cv = Cv(22, 18); cx, gy = 11, 15
    for k in range(3):
        y = gy - 3 - k * 4; cv.ell(cx, y, 7, 2.5, hx('#2a2a2e'), 't%d' % k); cv.ell(cx, y - 1, 3, 1, hx('#141416'), 'h%d' % k); cv.rect(cx - 7, y, cx + 7, y, hx('#3a3a40'), 'rim%d' % k)
    outline_sel(cv); return cv, cx, gy

def car(seed):
    cv = Cv(64, 40); cx, gy = 32, 34; rnd = random.Random(seed); body = ramp4('#7a3a2c')
    pts = lambda u, v, z: (cx + (u - v) * 9, gy - 8 + (u + v) * 4.5 - z)
    # body (2 tiles long along u), cabin
    poly(cv, [pts(-2, .8, 0), pts(2, .8, 0), pts(2, .8, 8), pts(-2, .8, 8)], body['b'], 'sw'); poly(cv, [pts(2, .8, 0), pts(2, -.8, 0), pts(2, -.8, 8), pts(2, .8, 8)], body['sh'], 'se')
    poly(cv, [pts(-2, -.8, 8), pts(2, -.8, 8), pts(2, .8, 8), pts(-2, .8, 8)], body['hi'], 'tp')
    poly(cv, [pts(-1, .7, 8), pts(1, .7, 8), pts(.7, .7, 14), pts(-.6, .7, 14)], hx('#2a3038'), 'win'); poly(cv, [pts(-.6, -.7, 14), pts(.7, -.7, 14), pts(.7, .7, 14), pts(-.6, .7, 14)], body['b'], 'roof')
    for (x, y) in sorted(cv.mask('sw') | cv.mask('se') | cv.mask('tp') | cv.mask('roof')):
        v = rnd.random()
        if v < .18: cv.p[y][x] = hx('#5a3a24')   # rust
        elif v < .23: cv.p[y][x] = hx('#2a2220')  # burn
    for u in (-1.3, 1.3):
        x, y = pts(u, .85, 1); cv.ell(x, y, 2.5, 2.5, hx('#1e1e22'), 'wh')
    outline_sel(cv); return cv, cx, gy

def rubble_prop(seed):
    cv = Cv(26, 16); rnd = random.Random(seed); cx, gy = 13, 13
    for k in range(9):
        x = cx + rnd.randint(-8, 8); y = gy - rnd.randint(0, 4); c = hx(rnd.choice(['#7a6a58', '#8a7a64', '#6a5a4a', '#5e6a72', '#8a6238']))
        cv.rect(x - 1, y - 1, x + rnd.randint(0, 2), y, c, 'r%d' % k)
    cv.line(cx - 6, gy - 5, cx + 4, gy - 2, hx('#8a6238'), 1, 'plank')
    outline_sel(cv); return cv, cx, gy

PROPS = [('pine', lambda s: pine(s)), ('pine', lambda s: pine(s, .85)), ('pine', lambda s: pine(s, 1.12)), ('deadtree', deadtree), ('deadtree', lambda s: deadtree(s + 9)),
         ('bush', bush), ('bush', lambda s: bush(s + 5)), ('rock', rock), ('rock', lambda s: rock(s + 3)), ('crate', crate), ('barrel', barrel), ('barrel', lambda s: barrel(s + 1)),
         ('tyres', tyres), ('rubble', rubble_prop), ('rubble', lambda s: rubble_prop(s + 4)), ('car', car)]

def main():
    os.makedirs(OUT, exist_ok=True); meta = {'wall': {'w': WW, 'h': WH, 'ax': TX + 2, 'ay': TOP, 'cells': {}}, 'props': []}
    cells = []
    for kind in ('wood', 'metal', 'gate'):
        for mk in range(16):
            mask = ((mk >> 3) & 1, (mk >> 2) & 1, (mk >> 1) & 1, mk & 1)
            for cr in (0, 1): meta['wall']['cells'][f'{kind}{"".join(map(str, mask))}{"c" if cr else ""}'] = len(cells); cells.append(wall(kind, mask, cr, mk * 3 + cr))
    meta['wall']['cells']['rubble'] = len(cells); cells.append(rubble(5))
    cols = 16; rows = (len(cells) + cols - 1) // cols; im = Image.new('RGBA', (cols * WW, rows * WH), (0, 0, 0, 0))
    for i, c in enumerate(cells): im.alpha_composite(c.img(), ((i % cols) * WW, (i // cols) * WH))
    im.save(os.path.join(OUT, 'walls.png')); meta['wall']['cols'] = cols
    x = 0; strips = []
    for i, (name, fn) in enumerate(PROPS):
        cv, ax, ay = fn(17 + i * 5); strips.append((cv, x)); meta['props'].append({'k': name, 'x': x, 'w': cv.w, 'h': cv.h, 'ax': ax, 'ay': ay}); x += cv.w
    H = max(c.h for c, _ in strips); pim = Image.new('RGBA', (x, H), (0, 0, 0, 0))
    for c, xx in strips: pim.alpha_composite(c.img(), (xx, 0))
    pim.save(os.path.join(OUT, 'props.png')); json.dump(meta, open(os.path.join(OUT, 'map.json'), 'w')); print('walls', len(cells), 'props', len(PROPS))

if __name__ == '__main__':
    main()
