#!/usr/bin/env python3
"""Pixel-art ground for the 56-px tile grid, made in code so tiles line up exactly and never show seams:
dying olive grass (3 tones, bare dead patches, dry tufts, stone/rust debris), dirt path (browns, pebbles, wheel ruts) with a ragged,
edge that fades into the grass through dithered dry-grass bands, all on whole art pixels.
    python3 tools/art/ground56.py <out.png> [N=10]    -> a sample N x N map with the test page's path loop"""
import sys, math, random
from PIL import Image

TW, TH = 56, 28
G = [(84, 86, 50), (100, 100, 56), (116, 112, 62), (140, 130, 76)]       # dying olive grass: dark .. light
D = [(156, 134, 98), (178, 154, 114), (192, 168, 126), (206, 184, 142)]   # dusty sand path: dark .. light
BARE = [(118, 100, 74), (132, 114, 84)]                                   # dead bare-earth patches in the grass
MIX = [(126, 116, 70), (146, 130, 84), (164, 144, 98)]                 # grass -> sand: dry grass, sandy grass, grassy sand
ASPH = [(68, 68, 70), (78, 78, 79), (88, 87, 86), (106, 104, 100)]       # cracked asphalt: dark .. light
CRACK = (40, 40, 42)
FLOW = [(150, 146, 136), (90, 84, 78), (170, 120, 80)]                  # scattered debris: pale stone, dark stone, rust

def vnoise(seed, scale):
    rnd = random.Random(seed); cache = {}
    def h(i, j):
        if (i, j) not in cache: cache[(i, j)] = random.Random(seed * 1000003 + i * 7919 + j * 104729).random()
        return cache[(i, j)]
    def n(x, y):
        x /= scale; y /= scale; i, j = math.floor(x), math.floor(y); fx, fy = x - i, y - j
        sx, sy = fx * fx * (3 - 2 * fx), fy * fy * (3 - 2 * fy)
        a, b, c, d = h(i, j), h(i + 1, j), h(i, j + 1), h(i + 1, j + 1)
        return (a + (b - a) * sx) + ((c + (d - c) * sx) - (a + (b - a) * sx)) * sy
    return n

def render(N, path):
    """path: a set of road tiles (all sand), or a dict {tile: 'sand' | 'asphalt'}"""
    if not isinstance(path, dict): path = {k: 'sand' for k in path}
    W, H = N * TW, N * TH + 2
    OX = N * TW // 2
    im = Image.new('RGBA', (W, H), (0, 0, 0, 0)); p = im.load()
    warp_u, warp_v = vnoise(1, 9), vnoise(2, 9)
    shade, clump, fine = vnoise(3, 22), vnoise(4, 5), vnoise(5, 2.2); blot = vnoise(6, 7); dead = vnoise(8, 15)
    crk1, crk2 = vnoise(9, 11), vnoise(10, 6)
    kind = {}
    rnd = random.Random(7)
    mat = {}
    for y in range(H):
        for x in range(W):
            # screen -> tile coords (u right-down, v left-down): x = OX + (u - v) * TW/2, y = (u + v) * TH/2
            a = (x - OX + .5) / (TW / 2); b = (y + .5) / (TH / 2); u = (a + b) / 2; v = (b - a) / 2
            if not (0 <= u < N and 0 <= v < N): continue
            wu, wv = u, v   # no warp: a road tile's look depends only on itself and its 8 neighbours, so built roads tile cleanly
            # signed distance (in tiles) to the path edge, from the 3x3 neighbouring tiles: + outside, - inside
            iu, iv = math.floor(wu), math.floor(wv); dout, din = 9., 9.
            k = path.get((iu, iv)); kind[(x, y)] = k   # a tile only blends with neighbours of the SAME ground type
            for du in (-1, 0, 1):
                for dv in (-1, 0, 1):
                    tu, tv = iu + du, iv + dv
                    ex = max(tu - wu, 0, wu - tu - 1); ey = max(tv - wv, 0, wv - tv - 1); d = math.hypot(ex, ey)
                    if path.get((tu, tv)) == k and k: dout = min(dout, d)
                    else: din = min(din, min(wu - tu, tu + 1 - wu, wv - tv, tv + 1 - wv) if d == 0 else d)
            sd = dout if not k else -din
            # sand amount: the whole fade happens INSIDE the road tile (grass at its edge, full sand ~.2 tile in)
            f = min(1, max(0, (-sd - .01) / .2))
            if 0 < f < 1: f += (blot(x, y * 2) - .5) * .5   # irregular fade, only inside the transition band
            if k == 'asphalt':   # asphalt: a broken, crumbled edge instead of a soft fade (1 = tar, .5 = crumbs, 0 = grass)
                f = min(1, max(0, (-sd - .01) / .18)) + (fine(x, y * 2) - .5) * .8
                f = 1. if f > .6 else .5 if f > .35 else 0.
            mat[(x, y)] = max(0., min(1., f))
    BAYER = [[0, 8, 2, 10], [12, 4, 14, 6], [3, 11, 1, 9], [15, 7, 13, 5]]
    for (x, y), f in mat.items():
        # flat base colour with a few big, hard-edged patches; the path fades into the grass through
        # dry-grass and sandy-grass bands, dithered in 2-px steps so it stays crisp pixel art
        s = shade(x, y * 2) * .7 + clump(x, y * 2) * .3
        sand = D[1] if s < .4 else D[2] if s < .72 else D[3]
        grass = G[0] if s < .3 else G[1] if s < .62 else G[2]
        dd = dead(x, y * 2) + (clump(x, y * 2) - .5) * .25
        if dd > .73: grass = BARE[0] if dd > .8 else BARE[1] if dd > .76 else MIX[0]   # dead patches: dry rim, bare earth
        if kind[(x, y)] == 'asphalt':
            if f == 0: col = grass
            elif f == .5: col = BARE[1] if (x + y) % 3 else ASPH[3]   # crumbs of tar on bare earth
            else:
                col = ASPH[0] if s < .3 else ASPH[1] if s < .62 else ASPH[2]
                if mat.get((x, y - 1)) != 1.: col = ASPH[3]   # lit top lip where tar meets earth
            p[x, y] = col + (255,); continue
        ramp = [grass, MIX[0], MIX[1], MIX[2], sand]
        lv = f * 4 + (BAYER[(y // 1) % 4][(x // 2) % 4] / 16 - .5) * .9
        col = ramp[max(0, min(4, round(lv)))]
        p[x, y] = col + (255,)
    # cracks and potholes, drawn per asphalt tile from that tile's own seed (so a road tile always looks the same)
    def tar(x, y): return kind.get((x, y)) == 'asphalt' and mat.get((x, y)) == 1.
    for (tu, tv), k in sorted(path.items()):
        if k != 'asphalt': continue
        tr = random.Random(tu * 7349 + tv * 1931 + 5)
        cx, cy = OX + (tu - tv) * TW // 2, (tu + tv + 1) * TH // 2   # tile centre on screen
        for _ in range(tr.choice((1, 2, 2))):   # crack: a jagged random walk with a short branch
            x, y = cx + tr.randint(-14, 14), cy + tr.randint(-5, 5); dx = tr.choice((-1, 1))
            for i in range(tr.randint(10, 20)):
                if tar(x, y): p[x, y] = CRACK + (255,)
                if tar(x, y + 1) and i % 3 == 0: p[x, y + 1] = ASPH[3] + (255,)   # light chipped edge under the crack
                x += dx if tr.random() < .75 else 0; y += tr.choice((-1, 0, 0, 1))
                if i == 6:
                    bx, by = x, y
                    for j in range(5):
                        bx -= dx if j % 2 else 0; by += 1
                        if tar(bx, by): p[bx, by] = CRACK + (255,)
        if tr.random() < .15:   # pothole: a small flat iso oval, dark inside, lit far rim
            hx, hy = cx + tr.randint(-10, 10), cy + tr.randint(-3, 3); a, b = tr.choice(((3, 1), (4, 2), (5, 2)))
            for yy in range(-b, b + 1):
                for xx in range(-a, a + 1):
                    if (xx / (a + .5)) ** 2 + (yy / (b + .5)) ** 2 <= 1 and tar(hx + xx, hy + yy):
                        top = (xx / (a + .5)) ** 2 + ((yy - 1) / (b + .5)) ** 2 > 1
                        p[hx + xx, hy + yy] = ((34, 33, 32) if top else (50, 48, 46) if yy < b else ASPH[3]) + (255,)
    rr = random.Random(11)
    TUFT = [(0, 0, 3), (0, -1, 3), (2, 0, 3), (2, -1, 3), (2, -2, 3), (4, 0, 3), (4, -1, 3), (1, 1, 0), (2, 1, 0), (3, 1, 0)]
    TC = [G[0], None, None, (150, 134, 80)]   # dry, yellowed blades   # three blades
    for _ in range(N * N * 5):
        x, y = rr.randrange(W), rr.randrange(H)
        if not all((x + dx, y + dy) in mat and mat[(x + dx, y + dy)] < .05 for dx, dy, _ in TUFT): 
            if kind.get((x, y)) == 'asphalt' and mat.get((x, y)) == 1. and p[x, y][:3] == CRACK and rr.random() < .5:   # weed in a crack
                for dx, dy in ((0, 0), (0, -1), (1, -1), (-1, -1), (0, -2)): p[x + dx, y + dy] = ((150, 134, 80) if dy == -2 else G[1]) + (255,)
                continue
            if kind.get((x, y)) == 'sand' and mat.get((x, y), 0) > .95 and mat.get((x + 1, y + 1), 0) > .95 and rr.random() < .35:   # pebble on the path
                for dx, dy, c in ((0, 0, (236, 222, 190)), (1, 0, (236, 222, 190)), (2, 0, D[3]), (0, 1, D[0]), (1, 1, D[0]), (2, 1, D[0])):
                    if mat.get((x + dx, y + dy), 0) > .9: p[x + dx, y + dy] = c + (255,)
            continue
        if rr.random() < .25:   # debris: a 2 x 1 stone or rust bit with a dark shadow pixel under it
            c = rr.choice(FLOW); p[x, y] = c + (255,); p[x + 1, y] = c + (255,); p[x, y + 1] = G[0] + (255,); p[x + 1, y + 1] = G[0] + (255,)
        else:
            for dx, dy, k in TUFT: p[x + dx, y + dy] = TC[k] + (255,)
    return im

if __name__ == '__main__':
    out = sys.argv[1]; N = int(sys.argv[2]) if len(sys.argv) > 2 else 10
    path = {(x, y) for x in range(N) for y in range(N) if ((y in (1, N - 2)) and 1 <= x <= N - 2) or ((x in (1, N - 2)) and 1 <= y <= N - 2)}
    im = render(N, path); im.save(out); print(im.size)
