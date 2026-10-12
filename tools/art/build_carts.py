#!/usr/bin/env python3
"""Rescue-cart sheets: a survivor pushing an empty hand cart (ChatGPT, one sheet per character).

    python3 tools/art/build_carts.py [tags]      # tools/art/sheets/cart_<tag>.txt (+ cart_<tag>_b.txt = row 2 re-sampled)

Input: 2 rows x 4 frames, row 0 = cart rolling down-left (pusher behind, facing down-left),
row 1 = cart rolling up-left (pusher seen from behind). Frames that touched are split.
Output: assets/characters/v7/cart/<tag>.png — row 0/1 = the 8 frames, rows 2/3 = the cart's front rim for each frame
(drawn over the injured person so they lie INSIDE the cart) + cart/meta.json: cell size, the pusher's feet (anchor)
and the bed point (where the injured person's lying sprite is centred) per frame.
"""
import colorsys, glob, json, os, sys
sys.path.insert(0, os.path.dirname(__file__))
from ingest import load_sheet, clean, quantize_set, tidy
from build_chars import despeckle, cut_box as cut_even
from PIL import Image

ROOT = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
SH = os.path.join(os.path.dirname(__file__), 'sheets'); OUT = os.path.join(ROOT, 'assets', 'characters', 'v7', 'cart')
CW, CH, AX, AY = 100, 60, 76, 56     # cell; the pusher's feet sit at (AX, AY)
MAN = .64                            # the pusher is the right ~36% of each frame

def cut_box(f, k, stencil=True):
    """split at real gaps: for each even division point take the nearest (near-)empty column, else the emptiest one nearby"""
    px = f.load(); cols = [sum(1 for y in range(f.height) if px[x, y][3]) for x in range(f.width)]
    # the pusher stands to the RIGHT of his cart and is the tallest thing in the frame: cut just after each pusher
    top = [next((y for y in range(f.height) if px[x, y][3]), f.height) for x in range(f.width)]
    tall = [t < f.height * .18 for t in top]; runs = []; x = 0
    while x < f.width:
        if tall[x]:
            a = x
            while x < f.width and tall[x]: x += 1
            if x - a >= 4: runs.append((a, x))
        x += 1
    if len(runs) == k:
        out = split_2d(f, runs) if stencil else split_2d(f, runs, False)
        if len(out) == k: return out
    step = f.width / k; cuts = [0]
    for j in range(1, k):
        t = step * j; lo, hi = int(t - step * .5), int(t + step * .5)
        empty = [x for x in range(max(lo, cuts[-1] + 8), min(hi, f.width - 8)) if cols[x] <= 1]
        cuts.append(min(empty, key=lambda x: abs(x - t)) if empty else min(range(int(t - step * .35), int(t + step * .35)), key=lambda x: cols[x]))
    cuts.append(f.width); out = []
    for a, b in zip(cuts, cuts[1:]):
        p = f.crop((a, 0, b, f.height)); bb = p.getbbox()
        if bb: out.append(despeckle(p.crop(bb)))
    return out

def split_2d(f, runs, stencil=True):
    """frames are evenly spaced copies, but each cart's front tip pokes in under the previous pusher's feet.
    Frame 0's cart tip has nothing in front of it, so it is used as a stencil (shifted by the head spacing) to give
    those pixels to the right frame; everything else is cut just after each pusher."""
    from scipy import ndimage
    import numpy as np
    a = np.array(f); op = a[:, :, 3] > 0; H, W = op.shape
    xs = np.where(op.any(0))[0]; left0 = int(xs[0]); own = np.zeros((H, W), int) - 1
    cuts = [0] + [min(W, r[1] + 2) for r in runs[:-1]] + [W]
    for i, (x0, x1) in enumerate(zip(cuts, cuts[1:])): own[:, x0:x1][op[:, x0:x1]] = i
    for k in range(1, len(runs) if stencil else 1):
        sh = runs[k][0] - runs[0][0]; x0 = left0 + sh; x1 = cuts[k]
        if x1 <= x0: continue
        st = np.zeros((H, W), bool); w = x1 - x0; st[:, x0:x1] = op[:, left0:left0 + w]
        st = ndimage.binary_dilation(st, np.ones((3, 3)))
        take = st & op & (own == k - 1); take[:, :x0] = False; own[take] = k
    out = []
    for i in range(len(runs)):
        b = a.copy(); b[own != i] = 0; im = Image.fromarray(b, 'RGBA'); bb = im.getbbox()
        if bb: out.append(despeckle(im.crop(bb)))
    return out

def row_frames(path, row):
    meta, F = load_sheet(path); F = [f for f, fr in zip(F, meta['frames']) if fr['r'] == row]
    out = []; F = [despeckle(clean(f), 6) for f in F]; unit = sum(f.width for f in F) / 4
    for f in F:
        k = max(1, round(f.width / unit))
        out += [despeckle(p, 12) for p in (cut_box(f, k, row == 0) if k > 1 else [f])]
    return out

def man_height(f):
    px = f.load(); ys = [y for y in range(f.height) for x in range(int(f.width * MAN), f.width) if px[x, y][3]]
    return max(ys) - min(ys) + 1 if ys else 0

def feet(f):
    px = f.load(); x0 = int(f.width * MAN); pts = [(x, y) for y in range(f.height) for x in range(x0, f.width) if px[x, y][3]]
    yb = max(p[1] for p in pts); xs = [x for x, y in pts if y >= yb - 3]
    return (min(xs) + max(xs)) // 2, yb

def bed(f):
    px = f.load(); pts = []
    for y in range(f.height):
        for x in range(int(f.width * .6)):
            p = px[x, y]
            if p[3]:
                h, s, v = colorsys.rgb_to_hsv(p[0] / 255, p[1] / 255, p[2] / 255)
                if .05 < h < .15 and .15 < s < .42 and v > .55: pts.append((x, y))
    if not pts: return f.width // 3, f.height // 2
    return sum(p[0] for p in pts) // len(pts), sum(p[1] for p in pts) // len(pts)

def build(tag):
    a = os.path.join(SH, f'cart_{tag}.txt'); b = os.path.join(SH, f'cart_{tag}_b.txt')
    F = row_frames(a, 0) + row_frames(b if os.path.exists(b) else a, 1)
    if len(F) != 8: raise ValueError(f'{tag}: {len(F)} frames')
    for r in (0, 4):   # frame 4 is the second 'passing' step; if it came out shrunken, reuse frame 2
        hs = [man_height(f) for f in F[r:r + 4]]
        if hs[3] < sorted(hs)[1] * .88: F[r + 3] = F[r + 1]; print(f'{tag}: row {r // 4} frame 4 shrunken ({hs[3]}), reusing frame 2')
    F = [tidy(f) for f in quantize_set(F, 48)]
    sheet = Image.new('RGBA', (CW * 8, CH * 2), (0, 0, 0, 0)); rims = Image.new('RGBA', (CW * 8, CH * 2), (0, 0, 0, 0)); beds = []
    for i, f in enumerate(F):
        fx, fy = feet(f); ox, oy = AX - fx, AY - fy; bx, by = bed(f)
        cell = Image.new('RGBA', (CW, CH), (0, 0, 0, 0)); cell.alpha_composite(f, (ox, oy)) if ox >= 0 and oy >= 0 else cell.paste(f, (ox, oy), f)
        rim = f.copy(); rp = rim.load()
        for y in range(rim.height):
            for x in range(rim.width):
                if y < by + 3 or x > int(f.width * MAN): rp[x, y] = (0, 0, 0, 0)
        rc = Image.new('RGBA', (CW, CH), (0, 0, 0, 0)); rc.paste(rim, (ox, oy), rim)
        r = i // 4; sheet.alpha_composite(cell, ((i % 4) * CW, r * CH)); rims.alpha_composite(rc, ((i % 4) * CW, r * CH))
        beds.append([bx + ox, by + oy, man_height(f)])
    full = Image.new('RGBA', (CW * 4, CH * 4), (0, 0, 0, 0))
    full.alpha_composite(sheet.crop((0, 0, CW * 4, CH * 2)), (0, 0)); full.alpha_composite(rims.crop((0, 0, CW * 4, CH * 2)), (0, CH * 2))
    return full, beds

def main():
    os.makedirs(OUT, exist_ok=True); mp = os.path.join(OUT, 'meta.json')
    meta = json.load(open(mp)) if os.path.exists(mp) else {'fw': CW, 'fh': CH, 'ax': AX, 'ay': AY, 'beds': {}}
    tags = sys.argv[1:] or sorted({os.path.basename(p)[5:-4] for p in glob.glob(os.path.join(SH, 'cart_*.txt')) if not p.endswith('_b.txt')})
    for t in tags:
        try:
            im, beds = build(t); im.save(os.path.join(OUT, t + '.png')); meta['beds'][t] = beds
            print('built', t, 'man heights', [b[2] for b in beds])
        except Exception as e: print('FAILED', t, e)
    meta.update({'fw': CW, 'fh': CH, 'ax': AX, 'ay': AY}); json.dump(meta, open(mp, 'w'))

if __name__ == '__main__':
    main()
