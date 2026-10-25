#!/usr/bin/env python3
"""Give the 2x2 Farm the same big scarecrow as the 1x1 Garden Plot (ChatGPT drew it about half that size): the Garden Plot's
scarecrow pixels are lifted out unchanged and stood where the small one was; the small one's pixels are first replaced by
the soil or crop beside them. The back view gets the same scarecrow mirrored (seen from behind it looks the same).
    python3 tools/art/farm_scarecrow.py"""
from PIL import Image, ImageOps
T = 'assets/buildings/t56/'
def lift():
    f = Image.open(T + 'farm.png').convert('RGBA'); p = f.load()
    o = Image.new('RGBA', (30, 31), (0, 0, 0, 0)); q = o.load()
    for y in range(31):
        xr = range(26, 54) if y < 16 else (range(34, 45) if y < 23 else range(36, 41))
        for x in xr:
            c = p[x, y]
            if c[3] and not (y >= 23 and c[1] > c[0] + 10): q[x - 26, y] = c
    return o, (12, 30)                       # sprite, pole foot
def small(c):                                # the small scarecrow's straw hat, shirt, hat band and outline
    r, g, b, a = c
    return a and ((r > 180 and g > 140 and b < 110) or (min(r, g, b) > 150 and max(r, g, b) - min(r, g, b) < 60)
                  or (b > r and b > 80 and g < 120) or (r > 130 and 60 < g < 110 and b < 60))
def place(name, box, foot, mirror, keep=None):
    im = Image.open(T + name).convert('RGBA'); p = im.load(); x0, y0, x1, y1 = box
    for y in range(y0, y1 + 1):
        for x in range(x0, x1 + 1):
            if small(p[x, y]) or (max(p[x, y][:3]) < 40 and any(small(p[x + a, y + b]) for a in (-1, 0, 1) for b in (-1, 0, 1))):
                q = x - 1
                while q > x0 - 6 and (small(p[q, y]) or max(p[q, y][:3]) < 40): q -= 1
                p[x, y] = p[q, y]
    s, (fx, fy) = lift()
    if mirror: s = ImageOps.mirror(s); fx = s.width - 1 - fx
    before = im.copy(); bp = before.load()
    im.alpha_composite(s, (foot[0] - fx, foot[1] - fy))
    if keep:   # things standing in front of the scarecrow (the barn in the back view) stay in front
        q = im.load(); X0, Y0, X1, Y1 = keep
        for x in range(X0, X1 + 1):
            for y in range(Y0, Y1 + 1):
                r, g, b, a = bp[x, y]
                if a and ((abs(r - g) < 16 and abs(g - b) < 16 and 40 < r < 150) or (r > 110 and g < 75 and b < 75)): q[x, y] = bp[x, y]
    im.save(T + name)
if __name__ == '__main__':
    place('field.png', (64, 31, 76, 50), (70, 49), False)
    place('field_back.png', (56, 16, 67, 37), (61, 37), True, keep=(40, 28, 75, 40))
