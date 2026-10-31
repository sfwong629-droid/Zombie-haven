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

def cut_parts(path, views=None):
    views = views or VIEWS
    im = np.asarray(Image.open(path).convert('RGB')).astype(int)
    bg = np.median(np.concatenate([im[:20, :20].reshape(-1, 3), im[-20:, -20:].reshape(-1, 3)]), axis=0)
    mask = np.sqrt(((im - bg) ** 2).sum(-1)) > 28
    mask = nd.binary_fill_holes(nd.binary_closing(mask, iterations=2))
    lab, n = nd.label(mask)
    objs = [(sl, i + 1) for i, sl in enumerate(nd.find_objects(lab)) if (lab[sl] == i + 1).sum() > 1500]
    rows = {}
    for sl, lid in objs:
        nv = len(views); rows.setdefault(min(nv - 1, int((sl[0].start + sl[0].stop) / 2 * nv / im.shape[0])), []).append((sl, lid))
    out = {}
    for r, items in rows.items():
        items.sort(key=lambda t: t[0][1].start)
        for name, (sl, lid) in zip(ORDER, items):
            sub = im[sl].copy(); m = lab[sl] == lid
            sub, discs = _paint_out_discs(sub, m)
            rgba = np.dstack([sub, (m * 255)]).astype(np.uint8)
            img = Image.fromarray(rgba, 'RGBA'); img.info['discs'] = discs
            out[(views[r], name)] = img
    return out

def _paint_out_discs(sub, m):
    """Remove the round joint markers (flat tan discs at part ends) by filling from the surrounding paint."""
    r, g, b = sub[..., 0], sub[..., 1], sub[..., 2]
    tan = m & (r > 185) & (r < 248) & (g > 120) & (g < 200) & (b > 60) & (b < 155) & (r - b > 60) & (g - b > 25)
    lab, n = nd.label(tan)
    h = sub.shape[0]; kill = np.zeros_like(m); discs = []
    for i, sl in enumerate(nd.find_objects(lab)):
        reg = lab[sl] == i + 1; a = reg.sum(); cy = (sl[0].start + sl[0].stop) / 2
        hh, ww = sl[0].stop - sl[0].start, sl[1].stop - sl[1].start
        round_ = a > .42 * hh * ww and .55 < hh / max(ww, 1) < 1.8
        if a > 100 and round_ and (cy < h * .36 or cy > h * .64):
            kill[sl] |= reg; discs.append(((sl[1].start + sl[1].stop) / 2 / sub.shape[1], cy / h))
    if not kill.any(): return sub, discs
    kill = nd.binary_dilation(kill, iterations=6) & m
    dark = (sub.sum(-1) < 260)
    good = m & ~kill & ~dark
    if not good.any(): return sub, discs
    out = sub.copy(); kl, kn = nd.label(kill)
    for i in range(1, kn + 1):   # each disc: flat fill with the average paint just around it
        k = kl == i; ring = nd.binary_dilation(k, iterations=14) & good
        if ring.any(): out[k] = np.median(sub[ring], axis=0)
    return out, discs

# ---------------------------------------------------------------- rig
def bbox_alpha(img):
    return img.getbbox()

class Part:
    def __init__(self, img, pivot, scale=1.0, flip=False):
        if flip: img = img.transpose(Image.FLIP_LEFT_RIGHT); pivot = (img.width - pivot[0], pivot[1])
        sx, sy = (scale, scale) if not isinstance(scale, tuple) else scale
        if (sx, sy) != (1.0, 1.0):
            img = img.resize((max(1, round(img.width * sx)), max(1, round(img.height * sy))), Image.LANCZOS)
            pivot = (pivot[0] * sx, pivot[1] * sy)
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


# ---------------------------------------------------------------- three-quarter (isometric) rig
def end_point(img, frac=.1, top=True):
    """Centre of the part's top (or bottom) end, as a fraction of its box."""
    a = np.asarray(img)[..., 3] > 128; h = a.shape[0]
    ys = np.nonzero(a.any(1))[0]; y0, y1 = ys.min(), ys.max()
    band = a[y0:y0 + int(h * frac)] if top else a[y1 - int(h * frac):y1 + 1]
    yy, xx = np.nonzero(band)
    return (xx.mean() / a.shape[1], ((y0 if top else y1 - int(h * frac)) + yy.mean()) / h)

SC3 = dict(head=.92, torso=(.98, .8), arm=.78, thigh=(.66, .4), shin=(.66, .44), tool=.62)

def build_rig3q(P, view, sc=None):
    sc = dict(SC3, **(sc or {})); g = lambda n: P[(view, n)]; R = {}
    T = g('torso'); R['torso'] = Part(T, (T.width * .5, T.height * .88), sc['torso'])
    nx, ny = end_point(T, .06, True); R['_neck'] = (nx, ny + .04)
    H = g('head'); hx, hy = end_point(H, .06, False); R['head'] = Part(H, (H.width * hx, H.height * (hy - .03)), sc['head'])
    for k, name in (('arm_far', 'arm_b' if view == 'se' else 'arm_a'), ('arm_near', 'arm_a' if view == 'se' else 'arm_b')):
        A = g(name); ax, ay = end_point(A, .12, True); R[k] = Part(A, (A.width * ax, A.height * (ay + .03)), sc['arm'])
        gx, gy = end_point(A, .14, False); R[k + '_grip'] = (gx, gy - .05)
    th, sh = g('thigh'), g('shin')
    tx, ty = end_point(th, .1, True); kx, ky = end_point(th, .1, False)
    sx, sy = end_point(sh, .1, True)
    for side in ('far', 'near'):
        R['thigh_' + side] = Part(th, (th.width * tx, th.height * (ty + .03)), sc['thigh']); R['_knee'] = (kx, ky - .05)
        R['shin_' + side] = Part(sh, (sh.width * sx, sh.height * (sy + .03)), sc['shin'])
    tl = g('tool'); gx, gy = tool_grip(tl); R['tool'] = Part(tl, (tl.width * gx, tl.height * gy), sc['tool'])
    return R

def pose3q(R, view, p, size=(900, 1000), root=(450, 600), tool=True):
    c = Image.new('RGBA', size, (0, 0, 0, 0)); D = math.radians
    T = R['torso']; ta = D(p.get('torso', 0)); root = (root[0], root[1] + p.get('bob', 0))
    neck = joint(T, root, ta, *R['_neck'])
    sh_far, sh_near = joint(T, root, ta, .16, .2), joint(T, root, ta, .86, .22)
    hip_far, hip_near = joint(T, root, ta, .34, .86), joint(T, root, ta, .66, .88)
    if view == 'ne': sh_far, sh_near, hip_far, hip_near = joint(T, root, ta, .84, .2), joint(T, root, ta, .14, .22), joint(T, root, ta, .66, .86), joint(T, root, ta, .34, .88)
    def leg(side, hip):
        th, sn = R['thigh_' + side], R['shin_' + side]; a1 = D(p.get('thigh_' + side, 0))
        hp = (hip[0], hip[1] - p.get('lift_' + side, 0))
        knee = joint(th, hp, a1, *R['_knee']); return [(th, hp, a1), (sn, knee, a1 + D(p.get('shin_' + side, 0)))]
    def arm(side, sh):
        A = R['arm_' + side]; a = D(p.get('arm_' + side, 0)); return (A, sh, a), joint(A, sh, a, *R['arm_' + side + '_grip']), a
    Lf, Ln = leg('far', hip_far), leg('near', hip_near)
    af, hand_f, aa_f = arm('far', sh_far); an, hand_n, aa_n = arm('near', sh_near)
    td = (R['tool'], hand_n, aa_n + D(p.get('wrist', 0)))
    head = (R['head'], neck, D(p.get('head', 0)))
    if view == 'se':   # facing the viewer: far limbs behind the body, near limbs and tool in front
        layers = [af] + Lf + [(T, root, ta)] + Ln + [head] + ([td] if tool else []) + [an]
    else:              # facing away: the tool and near arm are hidden behind the body
        layers = ([td] if tool else []) + [an] + Ln + [(T, root, ta)] + Lf + [af, head]
    for part, at, ang in layers: place(c, part, at, ang)
    return c

def walk3q(t, view):
    s = math.sin(2 * math.pi * t); cs = math.cos(2 * math.pi * t)
    d = 1 if view == 'se' else -1
    return {'thigh_near': 18 * s * d, 'thigh_far': -18 * s * d, 'shin_near': -22 * max(0, -cs) * d, 'shin_far': -22 * max(0, cs) * d,
            'lift_near': 6 * max(0, s), 'lift_far': 6 * max(0, -s),
            'arm_near': -16 * s * d, 'arm_far': 16 * s * d, 'bob': -6 * abs(math.cos(2 * math.pi * t)), 'torso': 2 * d}

def swing3q(t, view):
    def ease(x): return x * x * (3 - 2 * x)
    d = 1 if view == 'se' else -1
    K = [(0, 0, 0, 0), (.38, -150, 120, -8), (.48, -158, 128, -9), (.58, -40, 175, 12), (.7, -35, 172, 12), (1, 0, 0, 0)]
    for (t0, *a0), (t1, *a1) in zip(K, K[1:]):
        if t0 <= t <= t1:
            u = ease((t - t0) / (t1 - t0)); arm, wr, tor = [x + (y - x) * u for x, y in zip(a0, a1)]; break
    return {'arm_near': arm * d, 'arm_far': arm * .9 * d, 'wrist': wr * d, 'torso': tor * d, 'thigh_near': -10 * d, 'thigh_far': 8 * d}
