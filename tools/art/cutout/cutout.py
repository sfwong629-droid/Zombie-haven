"""2D cut-out character rig from a parts sheet (head, torso, arms, thigh, shin+boot, tool per view).

Parts are drawn once (e.g. by ChatGPT in the game's style); motion comes from rotating them on a
simple 2D skeleton, so the drawing never changes between frames and a held tool is pinned to the hand.

  python3 cutout.py PARTS.png OUT_DIR
writes per view: a standing pose, walk frames, and (side view) a chop; plus 64 px sprites and GIFs.
"""
import math, os, sys
import numpy as np
from PIL import Image
from scipy import ndimage as nd

ORDER = ['head', 'torso', 'arm_a', 'arm_b', 'thigh', 'shin', 'tool']
VIEWS = ['front', 'side', 'back']

def cut_parts(path):
    im = np.asarray(Image.open(path).convert('RGB')).astype(int)
    bg = np.median(np.concatenate([im[:20, :20].reshape(-1, 3), im[-20:, -20:].reshape(-1, 3)]), axis=0)
    mask = np.sqrt(((im - bg) ** 2).sum(-1)) > 28
    mask = nd.binary_fill_holes(nd.binary_closing(mask, iterations=2))
    lab, n = nd.label(mask)
    objs = [(sl, i + 1) for i, sl in enumerate(nd.find_objects(lab)) if (lab[sl] == i + 1).sum() > 1500]
    rows = {}
    for sl, lid in objs:
        rows.setdefault(min(2, int((sl[0].start + sl[0].stop) / 2 * 3 / im.shape[0])), []).append((sl, lid))
    out = {}
    for r, items in rows.items():
        items.sort(key=lambda t: t[0][1].start)
        for name, (sl, lid) in zip(ORDER, items):
            sub = im[sl].copy(); m = lab[sl] == lid
            sub = _paint_out_discs(sub, m)
            rgba = np.dstack([sub, (m * 255)]).astype(np.uint8)
            out[(VIEWS[r], name)] = Image.fromarray(rgba, 'RGBA')
    return out

def _paint_out_discs(sub, m):
    """Remove the round joint markers (flat tan discs at part ends) by filling from the surrounding paint."""
    r, g, b = sub[..., 0], sub[..., 1], sub[..., 2]
    tan = m & (r > 180) & (r < 236) & (g > 118) & (g < 180) & (b > 60) & (b < 135) & (r - b > 70)
    lab, n = nd.label(tan)
    h = sub.shape[0]; kill = np.zeros_like(m)
    for i, sl in enumerate(nd.find_objects(lab)):
        reg = lab[sl] == i + 1; a = reg.sum(); cy = (sl[0].start + sl[0].stop) / 2
        hh, ww = sl[0].stop - sl[0].start, sl[1].stop - sl[1].start
        round_ = a > .55 * hh * ww and .6 < hh / max(ww, 1) < 1.6
        if a > 100 and round_ and (cy < h * .36 or cy > h * .64): kill[sl] |= reg
    if not kill.any(): return sub
    kill = nd.binary_dilation(kill, iterations=6) & m
    dark = (sub.sum(-1) < 260)
    good = m & ~kill & ~dark
    if not good.any(): return sub
    out = sub.copy(); kl, kn = nd.label(kill)
    for i in range(1, kn + 1):   # each disc: flat fill with the average paint just around it
        k = kl == i; ring = nd.binary_dilation(k, iterations=14) & good
        if ring.any(): out[k] = np.median(sub[ring], axis=0)
    return out

# ---------------------------------------------------------------- rig
def bbox_alpha(img):
    return img.getbbox()

class Part:
    def __init__(self, img, pivot, scale=1.0, flip=False):
        if flip: img = img.transpose(Image.FLIP_LEFT_RIGHT); pivot = (img.width - pivot[0], pivot[1])
        if scale != 1.0:
            img = img.resize((max(1, round(img.width * scale)), max(1, round(img.height * scale))), Image.LANCZOS)
            pivot = (pivot[0] * scale, pivot[1] * scale)
        self.img, self.pivot = img, pivot
    def local(self, fx, fy):   # a point given as a fraction of the part's box, in pivot-relative pixels
        return (fx * self.img.width - self.pivot[0], fy * self.img.height - self.pivot[1])

def rot(p, a):
    c, s = math.cos(a), math.sin(a); return (p[0] * c - p[1] * s, p[0] * s + p[1] * c)

def place(canvas, part, at, ang):
    """Draw part rotated by ang (radians, clockwise on screen) with its pivot at 'at'."""
    deg = -math.degrees(ang)
    big = part.img.rotate(deg, resample=Image.BICUBIC, expand=True)
    # where the pivot ended up inside the expanded image
    w, h = part.img.size; cx, cy = w / 2, h / 2
    px, py = part.pivot[0] - cx, part.pivot[1] - cy
    rx, ry = rot((px, py), ang)
    nx, ny = big.width / 2 + rx, big.height / 2 + ry
    canvas.alpha_composite(big, (int(round(at[0] - nx)), int(round(at[1] - ny))))

def joint(part, at, ang, fx, fy):
    lx, ly = part.local(fx, fy); rx, ry = rot((lx, ly), ang); return (at[0] + rx, at[1] + ry)

# ---------------------------------------------------------------- the farmer rig
SC = dict(head=1.0, torso=.82, arm=.8, thigh=.56, shin=.6, tool=.72)

def tool_grip(img):
    """Grip point of a vertical tool: centre of the handle, low on the shaft."""
    a = np.asarray(img)[..., 3] > 128; h = a.shape[0]
    rows = a[int(h * .7):int(h * .9)]; xs = np.nonzero(rows.any(0))[0]
    return ((xs.min() + xs.max()) / 2 / img.width if len(xs) else .5, .82)

def build_rig(P, view):
    g = lambda n: P[(view, n)]
    R = {}
    R['torso'] = Part(g('torso'), (g('torso').width * .5, g('torso').height * .86), SC['torso'])
    R['head'] = Part(g('head'), (g('head').width * (.5 if view != 'side' else .55), g('head').height * .9), SC['head'])
    for k, name in (('arm_r', 'arm_a'), ('arm_l', 'arm_b')):
        im = g(name); R[k] = Part(im, (im.width * .5, im.height * .1), SC['arm'])
    th, sh = g('thigh'), g('shin')
    R['thigh_l'] = Part(th, (th.width * .5, th.height * .08), SC['thigh'])
    R['thigh_r'] = Part(th, (th.width * .5, th.height * .08), SC['thigh'], flip=(view != 'side'))
    R['shin_l'] = Part(sh, (sh.width * (.45 if view == 'side' else .5), sh.height * .07), SC['shin'])
    R['shin_r'] = Part(sh, (sh.width * (.45 if view == 'side' else .5), sh.height * .07), SC['shin'], flip=(view != 'side'))
    tl = g('tool'); gx, gy = tool_grip(tl); R['tool'] = Part(tl, (tl.width * gx, tl.height * gy), SC['tool'])
    return R

def pose_frame(R, view, p, size=(900, 1000), root=(450, 560), tool=True):
    """p: dict of angles (degrees, clockwise) and offsets: bob, lift_l/lift_r (front/back walks)."""
    c = Image.new('RGBA', size, (0, 0, 0, 0)); D = math.radians
    T = R['torso']; tor_a = D(p.get('torso', 0)); root = (root[0], root[1] + p.get('bob', 0))
    neck = joint(T, root, tor_a, .5, .1)
    sw = .2 if view != 'side' else .5
    sh_r = joint(T, root, tor_a, sw, .2); sh_l = joint(T, root, tor_a, 1 - sw, .2)
    hip_r = joint(T, root, tor_a, .36 if view != 'side' else .5, .84); hip_l = joint(T, root, tor_a, .64 if view != 'side' else .5, .84)
    if view == 'back': sh_r, sh_l, hip_r, hip_l = sh_l, sh_r, hip_l, hip_r
    def leg(side, hip):
        th, sn = R['thigh_' + side], R['shin_' + side]
        a1 = D(p.get('thigh_' + side, 0)); hp = (hip[0], hip[1] - p.get('lift_' + side, 0))
        knee = joint(th, hp, a1, .5, .9); a2 = a1 + D(p.get('shin_' + side, 0))
        return [(th, hp, a1), (sn, knee, a2)]
    def arm(side, sh):
        A = R['arm_' + side]; a = D(p.get('arm_' + side, 0))
        hand = joint(A, sh, a, .5, .86)
        return A, hand, a
    Lr, Ll = leg('r', hip_r), leg('l', hip_l)
    (Ar, hand_r, ar), (Al, hand_l, al) = arm('r', sh_r), arm('l', sh_l)
    tool_d = (R['tool'], hand_r, ar + D(p.get('wrist', 0))) if tool else None
    if view == 'side':   # far side first; the character faces right, his right side is the near side
        layers = [(Al, sh_l, al)] + Ll + ([tool_d] if tool and p.get('tool_back') else []) + [(T, root, tor_a)] + Lr + \
                 [(R['head'], neck, D(p.get('head', 0)))] + ([tool_d] if tool and not p.get('tool_back') else []) + [(Ar, sh_r, ar)]
    else:
        front_tool = view == 'front'
        layers = Lr + Ll + ([tool_d] if tool and not front_tool else []) + [(Ar, sh_r, ar), (Al, sh_l, al), (T, root, tor_a)] + \
                 [(R['head'], neck, D(p.get('head', 0)))] + ([tool_d] if tool and front_tool else [])
    for part, at, ang in layers: place(c, part, at, ang)
    return c

def walk(t, view):
    s = math.sin(2 * math.pi * t); cs = math.cos(2 * math.pi * t)
    if view == 'side':
        return {'thigh_r': 26 * s, 'thigh_l': -26 * s, 'shin_r': -32 * max(0, -cs), 'shin_l': -32 * max(0, cs),
                'arm_r': -22 * s, 'arm_l': 22 * s, 'bob': -6 * abs(math.cos(math.pi * 2 * t)), 'torso': 3, 'wrist': 0}
    return {'lift_r': 14 * max(0, s), 'lift_l': 14 * max(0, -s), 'arm_r': 7 * s, 'arm_l': 7 * s,
            'bob': -5 * abs(s), 'torso': 2 * s, 'head': -2 * s}

def chop(t):
    """Side-view pickaxe swing for big-headed characters: lift the pick up in front, strike down and forward.
    (Negative arm angles swing forward for a character facing right.) Tool angle = arm + wrist."""
    def ease(x): return x * x * (3 - 2 * x)
    K = [(0, 0, 0, 0), (.38, -150, 120, -8), (.48, -158, 128, -9),     # lift: pick head up and back over the hat
         (.58, -40, 175, 12), (.7, -35, 172, 12), (1, 0, 0, 0)]          # strike: pick head down in front, hold, settle
    for (t0, *a0), (t1, *a1) in zip(K, K[1:]):
        if t0 <= t <= t1:
            u = ease((t - t0) / (t1 - t0)); arm, wr, tor = [x + (y - x) * u for x, y in zip(a0, a1)]; break
    return {'arm_r': arm, 'arm_l': arm * .92, 'wrist': wr, 'torso': tor, 'thigh_r': -12, 'thigh_l': 10, 'shin_l': -6}

def to_sprite(img, char_h, ref_h=56, canvas=64, foot=None):
    """Scale a big frame down to sprite size with one fixed scale (char_h = standing height in big pixels)."""
    k = ref_h / char_h
    w, h = img.size
    sm = img.resize((max(1, round(w * k)), max(1, round(h * k))), Image.LANCZOS)
    a = np.asarray(sm).copy(); a[..., 3] = np.where(a[..., 3] > 110, 255, 0)
    sm = Image.fromarray(a, 'RGBA')
    fx, fy = foot; fx, fy = fx * k, fy * k
    out = Image.new('RGBA', (canvas, canvas), (0, 0, 0, 0))
    out.alpha_composite(sm, (int(round(canvas / 2 - fx)), int(round(canvas - 3 - fy))))
    return out
