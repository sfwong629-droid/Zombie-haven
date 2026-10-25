#!/usr/bin/env python3
"""Pixel-art ground for the 56-px tile grid, made in code so tiles line up exactly and never show seams:
grass (3 greens, darker 2-px clumps, light blade tufts, a few flowers), dirt path (browns, pebbles, wheel ruts) with a ragged,
edge that fades into the grass through dithered dry-grass bands, all on whole art pixels.
    python3 tools/art/ground56.py <out.png> [N=10]    -> a sample N x N map with the test page's path loop"""
import sys, math, random
from PIL import Image

TW, TH = 56, 28
G = [(78, 110, 52), (92, 126, 58), (106, 142, 64), (124, 160, 74)]      # grass: dark .. light
D = [(170, 142, 98), (192, 164, 116), (206, 180, 130), (220, 198, 150)]   # sandy path: dark .. light
MIX = [(118, 136, 66), (150, 148, 84), (178, 158, 102)]                # grass -> sand: dry grass, sandy grass, grassy sand
FLOW = [(236, 226, 150), (230, 160, 170), (240, 240, 230)]

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
    W, H = N * TW, N * TH + 2
    OX = N * TW // 2
    im = Image.new('RGBA', (W, H), (0, 0, 0, 0)); p = im.load()
    warp_u, warp_v = vnoise(1, 9), vnoise(2, 9)
    shade, clump, fine = vnoise(3, 22), vnoise(4, 5), vnoise(5, 2.2); blot = vnoise(6, 7)
    rnd = random.Random(7)
    mat = {}
    for y in range(H):
        for x in range(W):
            # screen -> tile coords (u right-down, v left-down): x = OX + (u - v) * TW/2, y = (u + v) * TH/2
            a = (x - OX + .5) / (TW / 2); b = (y + .5) / (TH / 2); u = (a + b) / 2; v = (b - a) / 2
            if not (0 <= u < N and 0 <= v < N): continue
            wu = u + (warp_u(x, y) - .5) * .18; wv = v + (warp_v(x, y) - .5) * .18
            # signed distance (in tiles) to the path edge, from the 3x3 neighbouring tiles: + outside, - inside
            iu, iv = math.floor(wu), math.floor(wv); dout, din = 9., 9.
            for du in (-1, 0, 1):
                for dv in (-1, 0, 1):
                    tu, tv = iu + du, iv + dv
                    ex = max(tu - wu, 0, wu - tu - 1); ey = max(tv - wv, 0, wv - tv - 1); d = math.hypot(ex, ey)
                    if (tu, tv) in path: dout = min(dout, d)
                    else: din = min(din, min(wu - tu, tu + 1 - wu, wv - tv, tv + 1 - wv) if d == 0 else d)
            sd = dout if (iu, iv) not in path else -din
            # sand amount: full sand to ~.1 tile past the tile edge, fading to grass by ~.6 tile outside it
            f = min(1, max(0, (.6 - sd) / .5))
            if 0 < f < 1: f += (blot(x, y * 2) - .5) * .5   # irregular fade, only inside the transition band
            mat[(x, y)] = max(0., min(1., f))
    BAYER = [[0, 8, 2, 10], [12, 4, 14, 6], [3, 11, 1, 9], [15, 7, 13, 5]]
    for (x, y), f in mat.items():
        # flat base colour with a few big, hard-edged patches; the path fades into the grass through
        # dry-grass and sandy-grass bands, dithered in 2-px steps so it stays crisp pixel art
        s = shade(x, y * 2) * .7 + clump(x, y * 2) * .3
        sand = D[1] if s < .4 else D[2] if s < .72 else D[3]
        grass = G[0] if s < .3 else G[1] if s < .62 else G[2]
        ramp = [grass, MIX[0], MIX[1], MIX[2], sand]
        lv = f * 4 + (BAYER[(y // 1) % 4][(x // 2) % 4] / 16 - .5) * .9
        col = ramp[max(0, min(4, round(lv)))]
        p[x, y] = col + (255,)
    rr = random.Random(11)
    TUFT = [(0, 0, 3), (0, -1, 3), (2, 0, 3), (2, -1, 3), (2, -2, 3), (4, 0, 3), (4, -1, 3), (1, 1, 0), (2, 1, 0), (3, 1, 0)]   # three blades
    for _ in range(N * N * 5):
        x, y = rr.randrange(W), rr.randrange(H)
        if not all((x + dx, y + dy) in mat and mat[(x + dx, y + dy)] < .05 for dx, dy, _ in TUFT): 
            if mat.get((x, y), 0) > .95 and mat.get((x + 1, y + 1), 0) > .95 and rr.random() < .35:   # pebble on the path
                for dx, dy, c in ((0, 0, (236, 222, 190)), (1, 0, (236, 222, 190)), (2, 0, D[3]), (0, 1, D[0]), (1, 1, D[0]), (2, 1, D[0])):
                    if mat.get((x + dx, y + dy), 0) > .9: p[x + dx, y + dy] = c + (255,)
            continue
        if rr.random() < .15:   # flower: a 2 x 1 petal on a dark stem
            c = rr.choice(FLOW); p[x, y] = c + (255,); p[x + 1, y] = c + (255,); p[x, y + 1] = G[0] + (255,)
        else:
            for dx, dy, k in TUFT: p[x + dx, y + dy] = G[k] + (255,)
    return im

if __name__ == '__main__':
    out = sys.argv[1]; N = int(sys.argv[2]) if len(sys.argv) > 2 else 10
    path = {(x, y) for x in range(N) for y in range(N) if ((y in (1, N - 2)) and 1 <= x <= N - 2) or ((x in (1, N - 2)) and 1 <= y <= N - 2)}
    im = render(N, path); im.save(out); print(im.size)
