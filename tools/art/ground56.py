#!/usr/bin/env python3
"""Pixel-art ground for the 56-px tile grid, made in code so tiles line up exactly and never show seams:
grass (3 greens, darker 2-px clumps, light blade tufts, a few flowers), dirt path (browns, pebbles, wheel ruts) with a ragged,
organic grass edge (the border is pushed around by smooth noise), all on whole art pixels.
    python3 tools/art/ground56.py <out.png> [N=10]    -> a sample N x N map with the test page's path loop"""
import sys, math, random
from PIL import Image

TW, TH = 56, 28
G = [(78, 110, 52), (92, 126, 58), (106, 142, 64), (124, 160, 74)]      # grass: dark .. light
D = [(116, 88, 58), (134, 104, 68), (150, 118, 78), (168, 136, 92)]     # dirt
EDGE = (64, 92, 44)                                                     # grass lip over the dirt
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
    shade, clump, fine = vnoise(3, 22), vnoise(4, 5), vnoise(5, 2.2)
    rnd = random.Random(7)
    mat = {}
    for y in range(H):
        for x in range(W):
            # screen -> tile coords (u right-down, v left-down): x = OX + (u - v) * TW/2, y = (u + v) * TH/2
            a = (x - OX + .5) / (TW / 2); b = (y + .5) / (TH / 2); u = (a + b) / 2; v = (b - a) / 2
            if not (0 <= u < N and 0 <= v < N): continue
            wu = u + (warp_u(x, y) - .5) * .32; wv = v + (warp_v(x, y) - .5) * .32
            dirt = (math.floor(wu), math.floor(wv)) in path
            mat[(x, y)] = dirt
    for (x, y), dirt in mat.items():
        # flat base colour with a few big, hard-edged patches (no soft gradients: reads as pixel art)
        s = shade(x, y * 2) * .7 + clump(x, y * 2) * .3
        if dirt:
            col = D[1] if s < .38 else D[2] if s < .66 else D[3]
            if not mat.get((x, y - 1), True) or not mat.get((x, y - 2), True): col = EDGE if not mat.get((x, y - 1), True) else D[0]   # grass lip + its shadow
        else:
            col = G[0] if s < .3 else G[1] if s < .62 else G[2]
            if mat.get((x, y + 1)) : col = G[3]   # bright rim where grass meets the path
        p[x, y] = col + (255,)
    rr = random.Random(11)
    TUFT = [(0, 0, 3), (0, -1, 3), (2, 0, 3), (2, -1, 3), (2, -2, 3), (4, 0, 3), (4, -1, 3), (1, 1, 0), (2, 1, 0), (3, 1, 0)]   # three blades
    for _ in range(N * N * 5):
        x, y = rr.randrange(W), rr.randrange(H)
        if not all((x + dx, y + dy) in mat and not mat[(x + dx, y + dy)] for dx, dy, _ in TUFT): 
            if (x, y) in mat and mat[(x, y)] and mat.get((x + 1, y + 1)) and rr.random() < .35:   # pebble on the path
                for dx, dy, c in ((0, 0, D[3]), (1, 0, D[3]), (2, 0, D[2]), (0, 1, D[0]), (1, 1, D[0]), (2, 1, D[0])):
                    if mat.get((x + dx, y + dy)): p[x + dx, y + dy] = c + (255,)
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
