#!/usr/bin/env python3
"""Template test 2: carry a POLISHED standing character (e.g. a PixelLab medic) onto the farmer's animations.

  * head: the new character's own head (hair, face) is cut from its standing pose and pasted onto every farmer frame,
    following where the farmer's head moved in that frame; the farmer's hat is erased
  * body: each farmer body part takes the new character's own colours (coat, scrub top, trousers, boots, skin),
    matched light-for-light, so the shading stays the farmer's but the palette is the new character's
    python3 tools/art/reskin2.py <rotation.gif> <front_index> <back_index> <out_dir>"""
import sys, os, colorsys
import numpy as np
from PIL import Image, ImageSequence

SRC = os.path.join(os.path.dirname(os.path.abspath(__file__)), 'sources/small/farm_m_set')
lum = lambda c: 0.3 * int(c[0]) + 0.59 * int(c[1]) + 0.11 * int(c[2])

def hsv(c):
    h, s, v = colorsys.rgb_to_hsv(*(np.array(c[:3], float) / 255)); return h * 360, s, v

def fkind(c):   # farmer colour -> part family
    r, g, b = int(c[0]), int(c[1]), int(c[2]); h, s, v = hsv(c)
    if v < .13: return 'K'
    if b > r and b > 150 or (r > 225 and g > 225 and b > 200): return 'eye'
    if 60 < h < 170 and g > r: return 'green'
    if 170 <= h < 230: return 'strap'
    if r > 205 and 115 < g < 200 and b > 75 and h < 30: return 'skin'
    if h >= 34 and v > .55: return 'straw'
    return 'brown'

def mkind(c):   # new character colour -> part family
    h, s, v = hsv(c)
    if v < .13: return 'K'
    if s < .2 and v > .5: return 'coat'
    if 185 <= h <= 250 and s > .2: return 'blue'
    if int(c[0]) > 200 and 110 < int(c[1]) < 205 and h < 35: return 'skin'
    return 'other'

def ramp_of(cols):
    cols = sorted(set(cols), key=lum); return cols if cols else [(128, 128, 128)]

def pick(ramp, t):   # t 0..1
    return ramp[min(len(ramp) - 1, max(0, int(t * len(ramp))))]

def shirt_top(a, K):
    """first shirt row BELOW the hat (the hat band is green too): start under the lowest straw row of the hat"""
    H, W = a.shape[:2]; ys = np.where(a[..., 3].any(1))[0]; top = ys.min()
    straw = [y for y in range(top, min(H, top + 14)) if sum(K[y][x] == 'straw' for x in range(W)) >= 2]
    y0 = (max(straw) + 1) if straw else top
    for y in range(y0, H):
        if sum(K[y][x] == 'green' for x in range(a.shape[1])) >= 3: return y
    return a.shape[0] // 2

def new_parts(m):
    """the new character: its head sprite (everything above the coat) and its colour ramps"""
    a = np.array(m); H, W = a.shape[:2]; MK = [[mkind(a[y, x]) if a[y, x, 3] else None for x in range(W)] for y in range(H)]
    ys = np.where(a[..., 3].any(1))[0]; top, bot = ys.min(), ys.max()
    ct = next(y for y in range(top, H) if sum(MK[y][x] in ('coat', 'blue') for x in range(W)) >= 3)
    head = a.copy(); head[ct:] = 0
    body = [(y, x) for y in range(ct, H) for x in range(W) if a[y, x, 3]]
    R = {'coat': ramp_of([tuple(a[y, x, :3]) for y, x in body if MK[y][x] == 'coat']),
         'top': ramp_of([tuple(a[y, x, :3]) for y, x in body if MK[y][x] == 'blue' and y < ct + 8]),
         'pants': ramp_of([tuple(a[y, x, :3]) for y, x in body if MK[y][x] == 'blue' and y >= ct + 8]),
         'boots': ramp_of([tuple(a[y, x, :3]) for y, x in body if MK[y][x] == 'other' and y > bot - 4]),
         'skin': ramp_of([tuple(a[y, x, :3]) for y, x in body if MK[y][x] == 'skin'])}
    xs = [x for x in range(W) if a[ct - 1, x, 3]]
    return head, (ct, (min(xs) + max(xs)) / 2), R

def farmer_head(f0):
    """the farmer's standing head: its mask (hat + face, above the shirt) and its anchor (shirt top, face centre)"""
    a = np.array(f0); H, W = a.shape[:2]; K = [[fkind(a[y, x]) if a[y, x, 3] else None for x in range(W)] for y in range(H)]
    st = shirt_top(a, K); mask = a[..., 3] > 0; mask[st:] = False
    sk = [x for y in range(st - 6, st) for x in range(W) if K[y][x] == 'skin'] or [x for x in range(W) if a[st - 1, x, 3]]
    gy = [y for y in range(st, H) for x in range(W) if K[y][x] == 'green']
    return mask, (st, (min(sk) + max(sk)) / 2), a, (max(gy) + 1 - st) if gy else 12

def track(a, ref, mask):
    """where did the head move in this frame? best shift of the standing head over the frame"""
    best = None; ys, xs = np.where(mask)
    for dy in range(-10, 9):
        for dx in range(-8, 9):
            yy, xx = ys + dy, xs + dx; ok = (yy >= 0) & (yy < a.shape[0]) & (xx >= 0) & (xx < a.shape[1])
            if ok.sum() < len(ys) * .8: continue
            d = np.abs(a[yy[ok], xx[ok], :3].astype(int) - ref[ys[ok], xs[ok], :3].astype(int)).sum(1)
            d = np.where(a[yy[ok], xx[ok], 3] > 0, d, 400).mean()
            if best is None or d < best[0]: best = (d, dy, dx)
    return best[1], best[2]

def dress(f, f0info, new):
    mask, (fst, fcx), ref, torso = f0info; head, (mct, mcx), R = new
    a = np.array(f); H, W = a.shape[:2]
    dy, dx = track(a, ref, mask)
    K = [[fkind(a[y, x]) if a[y, x, 3] else None for x in range(W)] for y in range(H)]
    gy = [y for y in range(H) for x in range(W) if K[y][x] == 'green' and y >= fst + dy]
    belt = fst + dy + torso   # the waist follows the head (the standing torso length), not the sleeves
    ys = np.where(a[..., 3].any(1))[0]; bot = ys.max()
    # farmer luminance range per part -> new ramp
    def rng(kinds, cond):
        L = [lum(a[y, x]) for y in range(H) for x in range(W) if K[y][x] in kinds and cond(y)]
        return (min(L), max(L)) if L else (0, 255)
    rc = rng(('green',), lambda y: True); rt = rng(('brown', 'strap'), lambda y: y <= belt); rp = rng(('brown',), lambda y: belt < y <= bot - 4)
    rb = rng(('brown',), lambda y: y > bot - 4); rs = rng(('skin',), lambda y: y >= fst + dy)
    T = lambda c, r: (lum(c) - r[0]) / max(1, r[1] - r[0] + 1)
    out = np.zeros_like(a)
    hm = np.zeros((H, W), bool); yy, xx = np.where(mask); ok = (yy + dy >= 0) & (yy + dy < H) & (xx + dx >= 0) & (xx + dx < W)
    hm[yy[ok] + dy, xx[ok] + dx] = True
    for y in range(H):
        for x in range(W):
            k = K[y][x]; c = a[y, x]
            if k is None: continue
            if hm[y, x] and k in ('straw', 'brown', 'eye', 'K', 'skin', 'strap') and y < fst + dy: continue   # the farmer's hat and face go
            if k == 'K': out[y, x] = c
            elif k == 'green': out[y, x] = pick(R['coat'], T(c, rc)) + (255,)
            elif k == 'skin' or k == 'eye': out[y, x] = pick(R['skin'], T(c, rs)) + (255,)
            elif y <= belt: out[y, x] = pick(R['top'], T(c, rt)) + (255,)
            elif y <= belt + 2 and y <= bot - 5: out[y, x] = pick(R['coat'], .45 + .5 * T(c, rp)) + (255,)   # coat hem over the hips
            elif y > bot - 4: out[y, x] = pick(R['boots'], T(c, rb)) + (255,)
            else: out[y, x] = pick(R['pants'], T(c, rp)) + (255,)
    # paste the new head so its chin sits where the farmer's chin went
    oy, ox = fst + dy - mct, int(round(fcx + dx - mcx))
    hy, hx = np.where(head[..., 3] > 0)
    for y, x in zip(hy, hx):
        Y, X = y + oy, x + ox
        if 0 <= Y < H and 0 <= X < W: out[Y, X] = head[y, x]
    # outline: drop black pixels with no colour around them, then close colour edges
    colr = lambda y, x: 0 <= y < H and 0 <= x < W and out[y, x, 3] and out[y, x, :3].max() >= 34
    o2 = out.copy()
    for y in range(H):
        for x in range(W):
            if out[y, x, 3] and out[y, x, :3].max() < 34 and not any(colr(y + v, x + u) for u in (-1, 0, 1) for v in (-1, 0, 1)): o2[y, x] = 0
    o3 = o2.copy()
    for y in range(H):
        for x in range(W):
            if not o2[y, x, 3] and any(0 <= y + v < H and 0 <= x + u < W and o2[y + v, x + u, 3] and o2[y + v, x + u, :3].max() >= 34 for u, v in ((1, 0), (-1, 0), (0, 1), (0, -1))):
                o3[y, x] = (0, 0, 0, 255)
    return Image.fromarray(o3)

def frames(path): return [f.convert('RGBA') for f in ImageSequence.Iterator(Image.open(path))]

def fit(m, size):   # put the new character's 48-px frame on the farmer's canvas, feet on the same row
    a = Image.new('RGBA', size, (0, 0, 0, 0)); b = m.getbbox(); a.alpha_composite(m.crop(b), ((size[0] - (b[2] - b[0])) // 2, size[1] - 7 - (b[3] - b[1]))); return a

if __name__ == '__main__':
    rot, fi, bi, out = sys.argv[1], int(sys.argv[2]), int(sys.argv[3]), sys.argv[4]; os.makedirs(out, exist_ok=True)
    R = frames(rot)
    for d, idx in (('se', fi), ('ne', bi)):
        f0 = frames(os.path.join(SRC, f'idle_{d}.gif'))[0]; info = farmer_head(f0)
        new = new_parts(fit(R[idx], f0.size))
        for anim in ('walking', 'swing_a', 'swing_b', 'swing_c', 'fire', 'taking_damage', 'collapse', 'rescue'):
            p = os.path.join(SRC, f'{anim}_{d}.gif')
            if not os.path.exists(p): continue
            fr = frames(p); md = [dress(f, info, new) for f in fr]; w, h = fr[0].size
            s = Image.new('RGBA', (w * len(fr), h * 2), (0, 0, 0, 0))
            for i, (x, y) in enumerate(zip(fr, md)): s.alpha_composite(x, (w * i, 0)); s.alpha_composite(y, (w * i, h))
            s.save(f'{out}/{anim}_{d}.png')
