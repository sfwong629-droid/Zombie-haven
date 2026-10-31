"""Draw an equipped weapon or tool into a character's hand on every animation frame.

The character sprites are animated empty-handed (PixelLab skeleton animation); this finds the
weapon hand on each frame, angles the weapon from the arm direction, and redraws the fist on top
so the fingers wrap the handle. Swap the weapon sprite and every animation re-equips.

  python3 equip.py FRAMES_DIR WEAPON.png GRIP_X,GRIP_Y ANIM DIRECTION OUT_DIR
"""
import glob, math, os, sys
import numpy as np
from PIL import Image
from scipy import ndimage as nd

def skin_mask(a):
    r, g, b, al = [a[..., i].astype(int) for i in range(4)]
    return (al > 0) & (r > 190) & (g > 120) & (g < 215) & (b > 80) & (b < 175) & (r - g > 25) & (r - b > 55)

def shirt_mask(a):
    r, g, b, al = [a[..., i].astype(int) for i in range(4)]
    return (al > 0) & (g > r - 5) & (g > b + 15) & (g > 60)

def hands(a):
    """Skin blobs that are not the face: [(cx, cy, pixels), ...]."""
    m = skin_mask(a); lab, n = nd.label(m)
    blobs = []
    for i in range(1, n + 1):
        ys, xs = np.nonzero(lab == i)
        if len(xs) >= 3: blobs.append((xs.mean(), ys.mean(), len(xs), (ys, xs)))
    if not blobs: return []
    face = max(blobs, key=lambda b: b[2] - b[1] * .5)   # biggest and highest blob is the face
    return [b for b in blobs if b is not face and b[1] > face[1] + 2]

def shoulder(a, side_x):
    sm = shirt_mask(a); ys, xs = np.nonzero(sm)
    if not len(ys): return None
    top = ys.min(); band = (ys < top + 5)
    bx = xs[band]
    x = bx.max() if side_x > 0 else bx.min()
    return (float(x), float(top + 3))

# weapon angle relative to the arm (degrees), per frame of each animation, for a character facing screen-right
OFFSETS = {
    'walk': [-130] * 8,
    'idle': [-130] * 8,
    'chop': [-130, -150, -175, -175, -60, 0, -60, -120],
}

def equip_frames(frames, weapon, grip, anim, facing_right, weapon_side=None, behind=False):
    """frames: list of RGBA images. weapon: RGBA sprite, handle vertical, head at top; grip: (x, y) in it."""
    arr = [np.asarray(f.convert('RGBA')) for f in frames]
    # which screen side holds the weapon: the hand that rises highest during the clip if not given
    if weapon_side is None:
        best = None
        for a in arr:
            for h in hands(a):
                if best is None or h[1] < best[1]: best = (h[0], h[1])
        cx = np.mean([np.nonzero(a[..., 3])[1].mean() for a in arr])
        weapon_side = 1 if (best and best[0] > cx) else -1
    out = []; last = None
    offs = OFFSETS.get(anim, [-130] * len(frames))
    for i, (f, a) in enumerate(zip(frames, arr)):
        hs = hands(a); cx = np.nonzero(a[..., 3])[1].mean()
        side = [h for h in hs if (h[0] - cx) * weapon_side > -3] or hs
        if not side:
            hand = last
        else:
            h = max(side, key=lambda h: (h[0] - cx) * weapon_side) if anim != 'chop' else min(side, key=lambda h: h[1])
            hand = h
        if hand is None: out.append(f); continue
        last = hand
        sh = shoulder(a, weapon_side) or (cx, hand[1] - 12)
        arm = math.degrees(math.atan2(hand[1] - sh[1], hand[0] - sh[0]))
        off = offs[i % len(offs)]
        ang = arm + (off if facing_right else -off)   # screen angle of the weapon's head direction
        # rotate the weapon (its head points up = -90 deg) to ang
        rot = -(ang + 90)
        w = weapon.rotate(rot, resample=Image.NEAREST, expand=True)
        gx, gy = grip; cxw, cyw = weapon.width / 2, weapon.height / 2
        t = math.radians(-rot); dx, dy = gx - cxw, gy - cyw
        rx, ry = dx * math.cos(t) - dy * math.sin(t), dx * math.sin(t) + dy * math.cos(t)
        px, py = w.width / 2 + rx, w.height / 2 + ry
        base = Image.new('RGBA', f.size, (0, 0, 0, 0))
        pos = (int(round(hand[0] - px)), int(round(hand[1] - py)))
        if behind:
            base.alpha_composite(w, pos); base.alpha_composite(f.convert('RGBA'))
        else:
            base.alpha_composite(f.convert('RGBA')); base.alpha_composite(w, pos)
            # fist back on top so the fingers wrap the handle
            fist = np.zeros(a.shape[:2], bool); fist[hand[3]] = True
            fist = nd.binary_dilation(fist, iterations=1) & (a[..., 3] > 0)
            top = np.zeros_like(a); top[fist] = a[fist]
            base.alpha_composite(Image.fromarray(top, 'RGBA'))
        out.append(base)
    return out, weapon_side

# ---------------------------------------------------------------- exact placement from known skeletons
WRIST_TURN = {   # weapon angle relative to the forearm (degrees, screen space, character facing screen-right)
    'walk': [-135] * 8,
    'chop': [-135, -150, -165, -60, -10, 0, -70, -135],
}

def equip_exact(frames, keypoints, weapon, grip, anim, facing_right=True, size=64, hand='RIGHT'):
    """keypoints: per frame dict label -> (x, y) in sprite pixels (the skeleton we sent PixelLab).
    The weapon sprite is vertical with its head up; grip is its handle point (x, y)."""
    out = []
    turns = WRIST_TURN.get(anim, [-135] * len(frames))
    for i, (f, P) in enumerate(zip(frames, keypoints)):
        f = f.convert('RGBA'); a = np.asarray(f)
        sx, sy = f.width / size, f.height / size
        wx, wy = P[hand + ' ARM'][0] * sx, P[hand + ' ARM'][1] * sy
        ex, ey = P[hand + ' ELBOW'][0] * sx, P[hand + ' ELBOW'][1] * sy
        fore = math.degrees(math.atan2(wy - ey, wx - ex))
        t = turns[i % len(turns)]
        ang = fore + (t if facing_right else -t)
        rot = -(ang + 90)
        w = weapon.rotate(rot, resample=Image.NEAREST, expand=True)
        gx, gy = grip; dx, dy = gx - weapon.width / 2, gy - weapon.height / 2
        r = math.radians(-rot); rx, ry = dx * math.cos(r) - dy * math.sin(r), dx * math.sin(r) + dy * math.cos(r)
        pos = (int(round(wx - (w.width / 2 + rx))), int(round(wy - (w.height / 2 + ry))))
        head_y = P['NOSE'][1] * sy
        behind = wy < head_y + 2 * sy        # hand up behind the head: weapon goes behind the body
        base = Image.new('RGBA', f.size, (0, 0, 0, 0))
        if behind:
            base.alpha_composite(w, pos); base.alpha_composite(f)
        else:
            base.alpha_composite(f); base.alpha_composite(w, pos)
            yy, xx = np.ogrid[:f.height, :f.width]
            fist = ((xx - wx) ** 2 + (yy - wy) ** 2 <= (2.2 * sx) ** 2) & (a[..., 3] > 0)
            top = np.zeros_like(a); top[fist] = a[fist]
            base.alpha_composite(Image.fromarray(top, 'RGBA'))
        out.append(base)
    return out
