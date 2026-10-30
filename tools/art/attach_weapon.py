#!/usr/bin/env python3
"""Put a weapon in a character's hand, frame by frame, at its drawn size (no scaling).

The weapon sprite lies horizontal with the grip on the LEFT. For every 48-px frame the lead hand is found
(the body pixel farthest from the chest, away from the head), the weapon is rotated to follow the arm and its
grip is placed in that hand; the hand's own pixels are drawn back on top so the fist wraps the grip.
    python3 tools/art/attach_weapon.py <strip.png> <weapon.png> <mode> <out.png> <hold_rotation.png>
modes: swing (weapon continues the arm), hold (raised ready, tilted up), fire (rifle level along the aim)"""
import sys, math
import numpy as np
from PIL import Image

C = 48
import os
TOL = int(os.environ.get("ZH_TOL", 40)); HEADR = float(os.environ.get("ZH_HEADR", 6))

def grip_of(w):
    """grip point: 2 px in from the left end, at the vertical middle of the left end"""
    a = np.array(w); ys, xs = np.where(a[..., 3] > 0); x0 = xs.min()
    col = ys[xs <= x0 + 3]
    return x0 + 2, int(round(col.mean()))

def skin_of(hold_rot):
    """the character's hand colours: the lead fist of its Hold pose is the right-most part above the hips"""
    a = np.array(Image.open(hold_rot).convert('RGBA')); ys, xs = np.where(a[..., 3] > 0)
    top, bot = ys.min(), ys.max(); up = ys < top + .62 * (bot - top)
    xm = xs[up].max(); cols = []
    for y, x in zip(ys[up], xs[up]):
        if x >= xm - 2:
            c = a[y, x, :3].astype(int)
            if c.max() > 60: cols.append(c)
    # drop colours that are really headwear/hair (common in the top rows), e.g. the farmer's straw hat
    head = a[top:top + 6].reshape(-1, 4); head = head[head[:, 3] > 0][:, :3].astype(int)
    keep = [c for c in cols if (np.abs(head - c).sum(1) < 20).sum() <= 4]
    return np.array(keep or cols)

def hand_of(f, head_c, skin):
    """the lead hand: a patch of skin colour that is NOT the face. Skin pixels are grouped into touching patches;
    the face is the patch nearest the head centre; the hand is the remaining patch farthest from the shoulder."""
    from scipy import ndimage
    a = f; ys, xs = np.where(a[..., 3] > 0)
    if not len(ys): return None
    top, bot = ys.min(), ys.max(); h = bot - top
    band = (ys >= top + .33 * h) & (ys <= top + .6 * h)
    cx, cy = xs[band].mean(), ys[band].mean()
    m = np.zeros(a.shape[:2], bool)
    for y, x in zip(ys, xs):
        if y <= top + .75 * h and np.abs(skin - a[y, x, :3].astype(int)).sum(1).min() < TOL: m[y, x] = True
    lab, n = ndimage.label(m, structure=np.ones((3, 3)))
    if n == 0: return None
    cents = ndimage.center_of_mass(m, lab, range(1, n + 1)); sizes = ndimage.sum(m, lab, range(1, n + 1))
    near = [k for k in range(n) if math.hypot(cents[k][1] - head_c[0], cents[k][0] - head_c[1]) <= 8 and sizes[k] >= 8]
    face = max(near, key=lambda k: sizes[k]) if near else -1   # the face is the BIG skin patch at the head (a fist is small)
    sx, sy = cx + 1, top + .36 * h                                                       # the lead shoulder
    best = None
    for k in range(n):
        if k == face or sizes[k] < 1: continue
        yy, xx = cents[k]; d = math.hypot(xx - sx, yy - sy)
        if xx < cx - 3 and yy > top + 3: continue                     # the back hand (behind the body)
        if best is None or d > best[0]: best = (d, k)
    if best is None: return None
    k = best[1]; pts = [(x, y) for y, x in zip(*np.where(lab == k + 1))]
    yy, xx = cents[k]
    return (xx, yy), (sx, sy), pts

def rot(w, deg, grip):
    """rotate the weapon about its grip with nearest-neighbour (pixels stay pixels); returns image + new grip"""
    W = w.width * 3
    big = Image.new('RGBA', (W, W)); off = (W // 2 - grip[0], W // 2 - grip[1]); big.paste(w, off)
    r = big.rotate(-deg, resample=Image.NEAREST, center=(W // 2, W // 2))
    return r, (W // 2, W // 2)

def main(strip, weapon, mode, out, hold_rot):
    skin = skin_of(hold_rot)
    s = Image.open(strip).convert('RGBA'); w = Image.open(weapon).convert('RGBA')
    w = w.crop(w.getbbox()); g = grip_of(w)
    n = s.width // C
    f0 = np.array(s.crop((0, 0, C, C))); ys, xs = np.where(f0[..., 3] > 0); t0 = ys.min()
    hm = ys <= t0 + 9; head0 = (xs[hm].mean(), ys[hm].mean())
    res = Image.new('RGBA', s.size)
    prev, prev_t = None, 0
    for i in range(n):
        fr = s.crop((i * C, 0, i * C + C, C)); a = np.array(fr)
        ys, xs = np.where(a[..., 3] > 0); t = ys.min()
        head = (head0[0] + (xs[ys <= t + 9].mean() - head0[0]), head0[1] + (t - t0))
        hit = hand_of(a, head, skin)
        # a held weapon does not jump: if the hand vanishes (behind the body) or leaps, keep the last grip
        if prev and (hit is None or (mode != 'swing' and math.hypot(hit[0][0] - prev[0][0], hit[0][1] - prev[0][1]) > 5)):
            dy = t - prev_t; hit = ((prev[0][0], prev[0][1] + dy), (prev[1][0], prev[1][1] + dy), [])
        if hit: prev, prev_t = hit, t
        o = Image.new('RGBA', (C, C))
        if hit:
            (hx, hy), (cx, cy), pts = hit
            ang = math.degrees(math.atan2(hy - cy, hx - cx))
            if mode == 'hold': ang -= 60
            elif mode == 'fire': ang = max(-20, min(8, ang));
            r, rg = rot(w, ang, g)
            back = mode == 'fire'
            gx, gy = (hx, hy)
            if back:   # the rifle sits across both fists: its grip a little behind the hands
                gx -= 4 * math.cos(math.radians(ang)); gy -= 4 * math.sin(math.radians(ang))
            layer = Image.new('RGBA', (C + r.width, C + r.height))
            layer.alpha_composite(r, (int(round(gx - rg[0])) + r.width // 2, int(round(gy - rg[1])) + r.height // 2))
            o.alpha_composite(layer.crop((r.width // 2, r.height // 2, r.width // 2 + C, r.height // 2 + C)))
            # weapon over the body, then the fist back on top of the grip
            comp = fr.copy(); comp.alpha_composite(o)
            fist = np.array(comp); src = np.array(fr)
            for x, y in pts:
                if math.hypot(x - hx, y - hy) <= 1.6: fist[y, x] = src[y, x]
            res.paste(Image.fromarray(fist), (i * C, 0))
        else:
            res.paste(fr, (i * C, 0))
    res.save(out)

def bat_angle(kind, ax, ay):
    """the bat's direction from where the hand is relative to the shoulder (0 = forward, -90 = up, 90 = down).
    The bat is not the arm: hand forward at shoulder height -> bat raised up-forward; hand up high -> bat back
    over the shoulder; hand low in front (the hit) -> bat out forward and down. A thrust keeps it along the arm."""
    e = math.degrees(math.atan2(-ay, ax))            # arm elevation: + up, - down
    if kind == 'swing_c': return round(math.degrees(math.atan2(ay, ax)) * .35)
    b = -70 - 1.0 * e if e >= 0 else -70 - 2.6 * e   # raised arm swings the bat back; lowered arm brings it through
    return round(max(-175, min(75, b)))

def rig(strip, hold_rot, mode, kind=''):
    """per frame: [hand x, hand y, arm angle in degrees (0 = forward, -90 = up)] for the game to draw the weapon"""
    skin = skin_of(hold_rot); s = Image.open(strip).convert('RGBA'); n = s.width // C
    f0 = np.array(s.crop((0, 0, C, C))); ys, xs = np.where(f0[..., 3] > 0); t0 = ys.min()
    hm = ys <= t0 + 9; head0 = (xs[hm].mean(), ys[hm].mean())
    out, prev, prev_t = [], None, 0
    for i in range(n):
        a = np.array(s.crop((i * C, 0, i * C + C, C))); ys, xs = np.where(a[..., 3] > 0); t = ys.min()
        head = (xs[ys <= t + 9].mean(), head0[1] + (t - t0))
        if mode in ('hold', 'fire'):   # the fist held forward is the front-most point of the arm band
            ys2, xs2 = np.where(a[..., 3] > 0); h2 = ys2.max() - t
            band = (ys2 >= t + .26 * h2) & (ys2 <= t + .62 * h2); xm = xs2[band].max()
            yy = ys2[band & (xs2 >= xm - 1)]
            hit = ((float(xm) - .5, float(yy.mean())), (float(xm) - 8, float(t + .36 * h2)), [])
        else:
            hit = hand_of(a, head, skin)
        if prev and (hit is None or (mode == 'never' and math.hypot(hit[0][0] - prev[0][0], hit[0][1] - prev[0][1]) > 5)):
            dy = t - prev_t; hit = ((prev[0][0], prev[0][1] + dy), (prev[1][0], prev[1][1] + dy), [])
        if hit: prev, prev_t = hit, t
        if not hit: out.append(None); continue
        (hx, hy), (sx, sy), _ = hit
        out.append([round(float(hx), 1), round(float(hy), 1), bat_angle(kind, hx - sx, hy - sy)])
    # frames before the first found hand borrow the first one
    first = next((r for r in out if r), None)
    return [r or first for r in out]

if __name__ == '__main__':
    if sys.argv[1] == 'rig':   # rig <char_dir> <prefix> <hold_rotation> <out.json>
        import json
        d, pre, hr, o = sys.argv[2:6]
        MODES = {'hold_idle': 'hold', 'hold_walk': 'hold', 'swing_a': 'swing', 'swing_b': 'swing', 'swing_c': 'swing', 'hurt': 'hold', 'fire': 'fire'}
        R = {f'{k}_{t}': rig(f'{d}/{pre}_{k}_{t}.png', hr, m, k) for k, m in MODES.items() for t in ('se', 'ne')}
        json.dump(R, open(o, 'w'))
    else:
        main(*sys.argv[1:6])
