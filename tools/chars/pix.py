"""Tiny pixel-art toolkit for the Zombie Haven sprite generators (true pixel art: every pixel placed on a grid)."""
import colorsys, math
from PIL import Image

def hx(c):
    c = c.lstrip('#'); c = ''.join(ch * 2 for ch in c) if len(c) == 3 else c; return (int(c[0:2], 16), int(c[2:4], 16), int(c[4:6], 16), 255)

def adj(c, dl=0.0, ds=0.0, dh=0.0):
    r, g, b = [v / 255 for v in c[:3]]; h, l, s = colorsys.rgb_to_hls(r, g, b)
    h = (h + dh) % 1; l = max(0, min(1, l + dl)); s = max(0, min(1, s + ds))
    r, g, b = colorsys.hls_to_rgb(h, l, s); return (round(r * 255), round(g * 255), round(b * 255), 255)

def ramp(base):
    """hi, base, shadow, dark for one material (shadows shift slightly toward purple/blue, highlights toward yellow: DV2-like warmth)"""
    b = hx(base) if isinstance(base, str) else base
    return {'hi': adj(b, .10, .02, -.015), 'b': b, 'sh': adj(b, -.13, .02, .02), 'dk': adj(b, -.25, .0, .03)}

OUTLINE = (34, 22, 20, 255)

class Cv:
    def __init__(self, w, h):
        self.w, self.h = w, h; self.p = [[None] * w for _ in range(h)]; self.tag = [[None] * w for _ in range(h)]
    def get(self, x, y):
        return self.p[y][x] if 0 <= x < self.w and 0 <= y < self.h else None
    def set(self, x, y, c, tag=None):
        x, y = int(round(x)), int(round(y))
        if 0 <= x < self.w and 0 <= y < self.h and c is not None:
            self.p[y][x] = c; self.tag[y][x] = tag
    def rect(self, x0, y0, x1, y1, c, tag=None):
        for y in range(int(y0), int(y1) + 1):
            for x in range(int(x0), int(x1) + 1): self.set(x, y, c, tag)
    def ell(self, cx, cy, rx, ry, c, tag=None):
        for y in range(int(cy - ry - 1), int(cy + ry + 2)):
            for x in range(int(cx - rx - 1), int(cx + rx + 2)):
                if ((x - cx) / (rx + .35)) ** 2 + ((y - cy) / (ry + .35)) ** 2 <= 1: self.set(x, y, c, tag)
    def line(self, x0, y0, x1, y1, c, w=1, tag=None):
        n = int(max(abs(x1 - x0), abs(y1 - y0)) * 2) + 1
        for i in range(n + 1):
            t = i / max(1, n); x = x0 + (x1 - x0) * t; y = y0 + (y1 - y0) * t
            for dy in range(w):
                for dx in range(w): self.set(math.floor(x + dx - (w - 1) / 2 + .5), math.floor(y + dy - (w - 1) / 2 + .5), c, tag)
    def mask(self, tag):
        return {(x, y) for y in range(self.h) for x in range(self.w) if self.tag[y][x] == tag}
    def shade(self, tag, rp, light=(-1, -1)):
        """volume: 1px highlight on the lit edge, 1px shadow on the far edge of a part"""
        m = self.mask(tag)
        for (x, y) in m:
            r, d, l, u = (x + 1, y) not in m, (x, y + 1) not in m, (x - 1, y) not in m, (x, y - 1) not in m
            if r and d: self.p[y][x] = rp['dk']
            elif r or d: self.p[y][x] = rp['sh']
            elif (l or u) and len(m) > 6: self.p[y][x] = rp['hi']
            else: self.p[y][x] = rp['b']
    def blit(self, o, dx, dy, flip=False):
        for y in range(o.h):
            for x in range(o.w):
                c = o.p[y][x]
                if c is not None: self.set((o.w - 1 - x if flip else x) + dx, y + dy, c, o.tag[y][x])
    def outline(self, col=OUTLINE, inner=True):
        """1px dark outline around the silhouette; inner=True also darkens edges between differently-tagged parts (selective, softer)"""
        add = []
        for y in range(self.h):
            for x in range(self.w):
                if self.p[y][x] is None and any(self.get(x + a, y + b) is not None for a, b in ((1, 0), (-1, 0), (0, 1), (0, -1))): add.append((x, y))
        for x, y in add: self.p[y][x] = col; self.tag[y][x] = 'ol'
    def copy(self):
        c = Cv(self.w, self.h); c.p = [r[:] for r in self.p]; c.tag = [r[:] for r in self.tag]; return c
    def img(self):
        im = Image.new('RGBA', (self.w, self.h), (0, 0, 0, 0)); px = im.load()
        for y in range(self.h):
            for x in range(self.w):
                if self.p[y][x] is not None: px[x, y] = self.p[y][x]
        return im
    def bbox(self):
        xs = [x for y in range(self.h) for x in range(self.w) if self.p[y][x] is not None]; ys = [y for y in range(self.h) for x in range(self.w) if self.p[y][x] is not None]
        return (min(xs), min(ys), max(xs), max(ys)) if xs else None

def rot(cv, ang, cx, cy):
    """rotate a canvas about (cx, cy) by ang degrees: RotSprite-lite (8x nearest upscale, rotate, majority downsample)"""
    if ang % 360 == 0: return cv.copy()
    S = 8; a = math.radians(ang); ca, sa = math.cos(a), math.sin(a); out = Cv(cv.w, cv.h)
    for y in range(cv.h):
        for x in range(cv.w):
            votes = {}
            for sy in range(S):
                for sx in range(S):
                    px = x + (sx + .5) / S - cx; py = y + (sy + .5) / S - cy
                    ox = px * ca + py * sa + cx; oy = -px * sa + py * ca + cy
                    ix, iy = math.floor(ox), math.floor(oy)
                    c = cv.get(ix, iy); k = (c, cv.tag[iy][ix] if c is not None else None)
                    votes[k] = votes.get(k, 0) + 1
            (c, t), n = max(votes.items(), key=lambda kv: kv[1])
            if c is None and n < S * S * .6:   # keep thin lines: prefer any colour that covers 40%+
                rest = [(k, v) for k, v in votes.items() if k[0] is not None]
                if rest:
                    (c, t), n2 = max(rest, key=lambda kv: kv[1])
                    if n2 < S * S * .4: c = None
            if c is not None: out.p[y][x] = c; out.tag[y][x] = t
    return out

import random as _r
def texture(cv, tag, rp, density=.12, seed=1, light=False):
    """fabric grit: scattered darker (and a few lighter) pixels inside a part, never on its edge"""
    rnd = _r.Random(seed); m = cv.mask(tag)
    for (x, y) in sorted(m):
        if (x + 1, y) in m and (x - 1, y) in m and (x, y + 1) in m and (x, y - 1) in m:
            v = rnd.random()
            if v < density: cv.p[y][x] = rp['sh']
            elif light and v < density * 1.4: cv.p[y][x] = rp['hi']

def outline_sel(cv, base=(28, 18, 16, 255), f=.42):
    """coloured outline: each outline pixel takes the darkest neighbouring colour, darkened (softer than flat black)"""
    add = []
    for y in range(cv.h):
        for x in range(cv.w):
            if cv.p[y][x] is None:
                nb = [cv.get(x + a, y + b) for a, b in ((1, 0), (-1, 0), (0, 1), (0, -1))]
                nb = [c for c in nb if c is not None]
                if nb:
                    keyed = [c for c in nb if (c[0] > 160 and c[1] == 0) or (c[0] == 0 and c[1] > 140)]
                    if keyed and len(keyed) == len(nb):   # next to skin/hair key colours (recoloured later): a fixed warm dark
                        add.append((x, y, (58, 30, 26, 255) if keyed[0][1] == 0 else (30, 20, 18, 255))); continue
                    nb = [c for c in nb if c not in keyed] or nb
                    c = min(nb, key=lambda c: c[0] + c[1] + c[2])
                    add.append((x, y, (round(c[0] * f * .8 + base[0] * .2), round(c[1] * f * .8 + base[1] * .2), round(c[2] * f * .8 + base[2] * .2), 255)))
    for x, y, c in add: cv.p[y][x] = c; cv.tag[y][x] = 'ol'

def ramp4(base, warm=True):
    from pix import hx, adj
    b = hx(base) if isinstance(base, str) else base
    return {'hi': adj(b, .09, .03, -.02 if warm else 0), 'b': b, 'sh': adj(b, -.11, .03, .025), 'dk': adj(b, -.22, .02, .04)}
