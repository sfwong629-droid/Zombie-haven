#!/usr/bin/env python3
"""Wall autotiles from the ChatGPT wall strips (tools/art/sheets/w_wood, w_metal, w_gate).

    python3 tools/art/build_walls.py

Each strip is one long wall piece running along world +x (screen down-right). It is first sheared so its foot
follows the true 2:1 iso slope (1 px down per 2 px across), then cut into half-tile arms:
  E (+x) / W (-x) arms from the strip, N (-y) / S (+y) arms from its mirror image.
One cell per type x neighbour mask (W,E,N,S) x cracked, plus rubble -> assets/map/v7/walls.png + entries in map.json.
Tile = 96 x 48 art px; a cell's anchor (ax, ay) is the tile's north corner, as in the old format.
"""
import json, os, random, sys
sys.path.insert(0, os.path.dirname(__file__))
from ingest import load_sheet, clean, quantize_set, tidy
from build_chars import despeckle
from PIL import Image

ROOT = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
SH = os.path.join(os.path.dirname(__file__), 'sheets'); OUT = os.path.join(ROOT, 'assets', 'map', 'v7')
TW, TH = 96, 48
CW, CH, AX, AY = 112, 100, 56, 44          # cell size; tile north corner inside the cell
CX, CY = AX, AY + TH // 2                  # tile centre inside the cell
HALF = TW // 4                             # an arm spans 24 px across (centre -> edge midpoint)

def foot(im):
    px = im.load(); out = []
    for x in range(im.width):
        ys = [y for y in range(im.height) if px[x, y][3]]
        out.append(max(ys) if ys else None)
    return out

def shear(im):
    """re-slope the strip so its foot drops exactly 1 px per 2 px across; returns (image, b0) with foot y = b0 + x / 2"""
    f = foot(im); pts = [(x, y) for x, y in enumerate(f) if y is not None]
    n = len(pts); mx = sum(p[0] for p in pts) / n; my = sum(p[1] for p in pts) / n
    k = sum((x - mx) * (y - my) for x, y in pts) / max(1e-6, sum((x - mx) ** 2 for x, _ in pts)); b = my - k * mx
    shift = [round(x * .5 - (k * x + b)) for x in range(im.width)]
    lo = min(shift); H = im.height + max(shift) - lo + 2
    out = Image.new('RGBA', (im.width, H), (0, 0, 0, 0)); src = im.load(); op = out.load()
    for x in range(im.width):
        for y in range(im.height):
            if src[x, y][3]: op[x, y + shift[x] - lo] = src[x, y]
    return out, b - lo

def arm(strip, b0, a, side, flip):
    """half-tile slice of the strip starting at column a, placed so column a's foot sits on the tile centre"""
    s = strip.transpose(Image.FLIP_LEFT_RIGHT) if flip else strip; W = s.width
    x0, x1 = (a, a + HALF + 1) if side > 0 else (a - HALF, a + 1)
    piece = s.crop((x0, 0, x1, s.height))
    footy = b0 + ((W - 1 - a) if flip else a) * .5   # foot y at column a (mirror: foot runs the other way)
    return piece, (CX - (a - x0), round(CY - footy))

def height(im):
    px = im.load(); hs = []
    for x in range(im.width):
        ys = [y for y in range(im.height) if px[x, y][3]]
        if ys: hs.append(max(ys) - min(ys))
    hs.sort(); return hs[len(hs) // 2] if hs else 30

def crack(im, seed):
    r = random.Random(seed); im = im.copy(); px = im.load(); W, H = im.size
    pts = [(x, y) for y in range(H) for x in range(W) if px[x, y][3]]
    if not pts: return im
    for _ in range(4):   # jagged dark cracks
        x, y = r.choice(pts)
        for _ in range(r.randint(4, 8)):
            if 0 <= x < W and 0 <= y < H and px[x, y][3]: c = px[x, y]; px[x, y] = (c[0] * 2 // 5, c[1] * 2 // 5, c[2] * 2 // 5, 255)
            x += r.choice((-1, 0, 1)); y += 1
    top = min(p[1] for p in pts)   # chunks knocked off the top edge
    for _ in range(3):
        x = r.choice([p[0] for p in pts if p[1] < top + 4])
        for dx in range(r.randint(2, 4)):
            for y in range(top, top + r.randint(3, 7)):
                if 0 <= x + dx < W: px[x + dx, y] = (0, 0, 0, 0)
    return im

def cell(strip, b0, mask, gate=None):
    W_, E_, N_, S_ = mask; c = Image.new('RGBA', (CW, CH), (0, 0, 0, 0)); a = strip.width // 2; am = strip.width - 1 - a
    if gate is not None:   # gate spans the tile along whichever axis it joins
        g, gb = gate; along_y = (N_ or S_) and not (W_ or E_)
        if along_y: g = g.transpose(Image.FLIP_LEFT_RIGHT)
        gx = g.width // 2; fy = gb + gx * .5
        c.alpha_composite(g, (CX - gx, round(CY - fy))); return c
    parts = []
    if N_: parts.append(arm(strip, b0, am, +1, True))    # up-right (behind)
    if W_: parts.append(arm(strip, b0, a, -1, False))    # up-left (behind)
    if not any(mask):                                    # lone post: a short stub
        p = strip.crop((a - 7, 0, a + 8, strip.height)); parts.append((p, (CX - 7, round(CY - (b0 + a * .5)))))
    if E_: parts.append(arm(strip, b0, a, +1, False))    # down-right (front)
    if S_: parts.append(arm(strip, b0, am, -1, True))    # down-left (front)
    for p, (x, y) in parts: c.alpha_composite(p, (x, y))
    return c

def load(tag):
    _, F = load_sheet(os.path.join(SH, tag + '.txt')); im = despeckle(clean(F[0]), 8)
    return tidy(quantize_set([im], 40)[0])

def main():
    os.makedirs(OUT, exist_ok=True)
    strips = {k: shear(load('w_' + k)) for k in ('wood', 'metal')}
    gate = shear(load('w_gate'))
    keys, cells = [], []
    for kind in ('wood', 'metal', 'gate'):
        st, b0 = strips['wood' if kind == 'gate' else kind]
        for m in range(16):
            mask = [(m >> 3) & 1, (m >> 2) & 1, (m >> 1) & 1, m & 1]; name = kind + ''.join(map(str, mask))
            im = cell(st, b0, mask, gate if kind == 'gate' else None)
            keys += [name, name + 'c']; cells += [im, crack(im, hash(name) & 0xffff)]
    # rubble: low scattered chunks of the wood + metal strips
    r = random.Random(7); rub = Image.new('RGBA', (CW, CH), (0, 0, 0, 0))
    for st, b0 in strips.values():
        for _ in range(16):
            w, h = r.randint(8, 16), r.randint(6, 12); x0 = r.randint(0, st.width - w); y0 = r.randint(0, st.height - h)
            ch = st.crop((x0, y0, x0 + w, y0 + h)); bb = ch.getbbox()
            if bb: rub.alpha_composite(ch.crop(bb), (CX - 28 + r.randint(0, 44), CY - 10 + r.randint(-8, 10)))
    keys.append('rubble'); cells.append(rub)
    cols = 16; rows = (len(cells) + cols - 1) // cols
    sheet = Image.new('RGBA', (cols * CW, rows * CH), (0, 0, 0, 0))
    for i, im in enumerate(cells): sheet.alpha_composite(im, ((i % cols) * CW, (i // cols) * CH))
    sheet.save(os.path.join(OUT, 'walls.png'))
    mp = os.path.join(OUT, 'map.json'); meta = json.load(open(mp)) if os.path.exists(mp) else {}
    meta['wall'] = {'w': CW, 'h': CH, 'ax': AX, 'ay': AY, 'cols': cols, 'cells': {k: i for i, k in enumerate(keys)},
                    'hgt': {k: height(st) for k, (st, _) in strips.items()}}
    json.dump(meta, open(mp, 'w')); print('walls', sheet.size, len(keys), 'cells')

if __name__ == '__main__':
    main()
