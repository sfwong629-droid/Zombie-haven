#!/usr/bin/env python3
"""Turn a ChatGPT sprite image (big chunky pixels on magenta) into exact game pixel art.

Library used by the build scripts:
  load_dump(path)                    -> PIL image from a browser dump (JSON with base64 PNG)
  find_sprites(im)                   -> list of rows, each a list of (x0,y0,x1,y1) boxes (left to right)
  repix(im, box, s)                  -> RGBA art-pixel sprite: each art pixel = majority colour of an s x s source cell
  clean(sprite)                      -> remove magenta fringe, pink tints and stray pixels
Standard (docs/ART_STANDARD.md): one art pixel everywhere; people 42 px tall; tiles 96 x 48.
"""
import base64, io, json, math
from collections import Counter
from PIL import Image

def load_dump(path):
    import re
    t = open(path).read()
    m = re.search(r'"b64\\?"\s*:\s*\\?"([A-Za-z0-9+/=]+)', t); tg = re.search(r'"tag\\?"\s*:\s*\\?"([^"\\]+)', t)
    return Image.open(io.BytesIO(base64.b64decode(m.group(1)))).convert('RGB'), (tg.group(1) if tg else 'img')

def is_bg(p):
    r, g, b = p[:3]
    return r > 170 and b > 170 and g < 120 and abs(r - b) < 90

def find_sprites(im, min_px=400, gap=6):
    W, H = im.size; px = im.load()
    rows_has = [sum(1 for x in range(0, W, 2) if not is_bg(px[x, y])) for y in range(H)]
    bands = []; y = 0
    while y < H:
        if rows_has[y] > 1:
            y0 = y
            while y < H and (rows_has[y] > 1 or any(rows_has[min(H - 1, y + k)] > 1 for k in range(1, gap))): y += 1
            if y - y0 > 20: bands.append((y0, y))
        y += 1
    out = []
    for (y0, y1) in bands:
        cols = [sum(1 for yy in range(y0, y1, 2) if not is_bg(px[x, yy])) for x in range(W)]
        boxes = []; x = 0
        while x < W:
            if cols[x] > 0:
                x0 = x
                while x < W and (cols[x] > 0 or any(cols[min(W - 1, x + k)] > 0 for k in range(1, gap))): x += 1
                if x - x0 > 12:
                    ys = [yy for yy in range(y0, y1) for xx in range(x0, x, 3) if not is_bg(px[xx, yy])]
                    if ys and (x - x0) * (max(ys) - min(ys)) > min_px: boxes.append((x0, min(ys), x, max(ys) + 1))
            x += 1
        if boxes: out.append(boxes)
    return out

def repix(im, box, s, ox=None, oy=None):
    """sample a box of the source into art pixels of size s (float); grid anchored at the box's bottom-centre so feet line up"""
    px = im.load(); W, H = im.size; x0, y0, x1, y1 = box
    cx = (x0 + x1) / 2 if ox is None else ox; by = y1 if oy is None else oy
    nw = int(math.ceil((x1 - x0) / s)) + 2; nh = int(math.ceil((y1 - y0) / s)) + 2
    out = Image.new('RGBA', (nw, nh), (0, 0, 0, 0)); op = out.load()
    for j in range(nh):
        for i in range(nw):
            sx0 = cx + (i - nw / 2) * s; sy0 = by - (nh - j) * s
            c = Counter()
            for yy in range(int(sy0 + s * .3), int(sy0 + s * .7) + 1):
                for xx in range(int(sx0 + s * .3), int(sx0 + s * .7) + 1):
                    if 0 <= xx < W and 0 <= yy < H:
                        p = px[xx, yy]; c[None if is_bg(p) else (p[0] >> 2 << 2, p[1] >> 2 << 2, p[2] >> 2 << 2)] += 1
            if not c: continue
            k, n = c.most_common(1)[0]
            if k is None and n < sum(c.values()) * .55:
                k = next(q for q, _ in c.most_common() if q is not None)
            if k is not None: op[i, j] = k + (255,)
    bb = out.getbbox()
    return out.crop(bb) if bb else out

def clean(sp):
    px = sp.load(); W, H = sp.size
    mag = lambda p: p[3] and p[0] > 70 and p[2] > 70 and p[1] < 0.62 * min(p[0], p[2]) and abs(p[0] - p[2]) < 120
    for _ in range(2):
        for y in range(H):
            for x in range(W):
                if mag(px[x, y]):
                    nb = [px[x + dx, y + dy] for dx, dy in ((1, 0), (-1, 0), (0, 1), (0, -1)) if 0 <= x + dx < W and 0 <= y + dy < H]
                    if any(q[3] == 0 for q in nb) or len(nb) < 4: px[x, y] = (0, 0, 0, 0)
                    else:
                        ok = [q for q in nb if q[3] and not mag(q)]; px[x, y] = min(ok, key=lambda q: sum(q[:3])) if ok else (0, 0, 0, 0)
    for y in range(H):
        for x in range(W):
            r, g, b, a = px[x, y]
            if a and r - g > 45 and b - g > 30 and abs(r - b) < 70:
                l = int(.3 * r + .59 * g + .11 * b); px[x, y] = (l, l, max(0, l - 4), 255)
    for y in range(H):
        for x in range(W):
            if px[x, y][3] and not any(0 <= x + dx < W and 0 <= y + dy < H and px[x + dx, y + dy][3] for dx, dy in ((1, 0), (-1, 0), (0, 1), (0, -1))): px[x, y] = (0, 0, 0, 0)
    bb = sp.getbbox(); return sp.crop(bb) if bb else sp

def quantize_set(sprites, n=48):
    """one shared palette for a set of frames (keeps a character's colours identical across frames)"""
    W = sum(s.width for s in sprites); H = max(s.height for s in sprites)
    strip = Image.new('RGBA', (W, H), (0, 0, 0, 0)); x = 0
    for s in sprites: strip.alpha_composite(s, (x, 0)); x += s.width
    rgb = strip.convert('RGB'); q = rgb.quantize(n, method=Image.Quantize.MEDIANCUT, dither=Image.Dither.NONE).convert('RGB')
    out = []; x = 0; qp = q.load(); sp = strip.load()
    for s in sprites:
        o = Image.new('RGBA', s.size, (0, 0, 0, 0)); op = o.load()
        for yy in range(s.height):
            for xx in range(s.width):
                if sp[x + xx, yy][3]: op[xx, yy] = qp[x + xx, yy] + (255,)
        out.append(o); x += s.width
    return out

def load_sheet(path):
    """browser __sheet() dump -> (meta, [frame images]); frames already on the art-pixel grid"""
    outer = json.load(open(path)); txt = outer[0]['text']
    inner = json.JSONDecoder().raw_decode(txt)[0] if txt.startswith('"') else txt
    meta = json.loads(inner.strip())
    atlas = Image.open(io.BytesIO(base64.b64decode(meta['b64']))).convert('RGBA')
    frames = [atlas.crop((f['x'], meta['AH'] - f['h'], f['x'] + f['w'], meta['AH'])) for f in meta['frames']]
    return meta, frames

def tidy(im, passes=2):
    """remove sampling noise: a lone pixel whose 8 neighbours mostly agree on another colour takes that colour.
    Transparent pixels and outline-dark pixels are left alone so silhouettes and outlines keep their shape."""
    from collections import Counter
    for _ in range(passes):
        px = im.load(); W, H = im.size; out = im.copy(); op = out.load()
        for y in range(1, H - 1):
            for x in range(1, W - 1):
                p = px[x, y]
                if not p[3]: continue
                nb = [px[x + dx, y + dy] for dx in (-1, 0, 1) for dy in (-1, 0, 1) if dx or dy]
                if any(not q[3] for q in nb): continue
                same = sum(1 for q in nb if q == p)
                if same >= 2: continue
                c, k = Counter(nb).most_common(1)[0]
                if k >= 4 and sum(abs(a - b) for a, b in zip(c[:3], p[:3])) < 90: op[x, y] = c   # only soft noise; eyes and other high-contrast details stay
        im = out
    return im
