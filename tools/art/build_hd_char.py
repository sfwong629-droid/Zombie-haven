#!/usr/bin/env python3
"""Build a character sheet from PixelLab animations, in one of two standards:

    python3 tools/art/build_hd_char.py farm_m            # HD (V8): 84-px people, half-size pixels   (preview ?hd=1)
    python3 tools/art/build_hd_char.py --c64 farm_m      # C64: 58-px people on PixelLab's 64 canvas, normal pixels (preview ?c64=1)

C64 (owner-approved October 2026, matches the town mock-up's medic): same pixel size as the V7 world, people about 58 px
tall (V7: 42), PixelLab 64 x 64 canvas, cells 96 x 80, feet on row 74; sources in tools/art/sources/pixellab/c64/.

Sources (tools/art/sources/pixellab/):
    <tag>_walk_sw.gif   6-frame walk facing south-west  = our FRONT view (down-left)
    <tag>_walk_nw.gif   6-frame walk facing north-west  = our BACK view (up-left)
    <tag>_<anim>_sw.gif / _nw.gif  optional extra animations (idle, carry, collapse, punch, blunt, shoot);
                         any that are missing are derived from the walk (see below).
PixelLab draws native pixel art at our HD size (about 84 px tall on a 160 x 160 canvas), so frames are used
1:1, never resampled. Output: assets/characters/hd/<tag>.png + an entry in assets/characters/hd/meta.json.

HD standard: 1 art pixel = half a V7 pixel. Cells 128 x 120, feet on row 113, so (foot + 1) / 2 = 57 = V7's 56 + 1
and an HD sheet drawn at half scale stands exactly where a V7 sheet stands.
Frame table: idle 2, walk 6, carry 6, collapse 4, punch 3, blunt 3, shoot 3 (27 per row).
Fallbacks until PixelLab versions exist: idle = the walk's feet-together frame plus a 2-px breathing bob;
carry = the walk; collapse = the idle tipping over; punch / blunt / shoot = the idle (the game swings the
weapon overlay through its up / forward / down / aim poses).
"""
import json, os, sys
from PIL import Image, ImageSequence

ROOT = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
KINDS = {'hd': dict(res=2, fw=128, fh=120, foot=113, src='', out='hd', bob=2), 'c64': dict(res=1, fw=96, fh=80, foot=74, src='c64', out='c64', bob=1)}
SRC = OUT = None; FW = FH = FOOT = BOB = 0; KIND = 'hd'
def use(kind):
    global SRC, OUT, FW, FH, FOOT, BOB, KIND
    k = KINDS[kind]; KIND = kind; FW, FH, FOOT, BOB = k['fw'], k['fh'], k['foot'], k['bob']
    SRC = os.path.join(ROOT, 'tools', 'art', 'sources', 'pixellab', k['src']); OUT = os.path.join(ROOT, 'assets', 'characters', k['out'])
use('hd')
PICKS = {'farm_m_punch_sw': [2, 3, 4]}   # hand-picked frames (0-based) where even sampling would miss the key poses
ANIMS = [('idle', 2), ('walk', 6), ('carry', 6), ('collapse', 4), ('punch', 3), ('blunt', 3), ('shoot', 3)]
WPOSE = (['rest'] * 2 + ['rest'] * 6 + ['none'] * 6 + ['none'] * 4 + ['rest'] * 3 + ['up', 'fwd', 'down'] + ['aim', 'fire', 'aim'])

def gif_frames(path):
    im = Image.open(path); return [f.convert('RGBA') for f in ImageSequence.Iterator(im)]

def ground(frames):
    """ground row of a PixelLab canvas = the lowest opaque row over the whole animation (a planted foot)"""
    return max(f.getbbox()[3] for f in frames) - 1

def centre_x(frames):
    """horizontal anchor: middle of the opaque columns, averaged over the animation"""
    bbs = [f.getbbox() for f in frames]; return sum((b[0] + b[2]) / 2 for b in bbs) / len(bbs)

def to_cell(f, gy, cx):
    cell = Image.new('RGBA', (FW, FH), (0, 0, 0, 0)); cell.alpha_composite(f, (int(round(FW / 2 - cx)), FOOT - gy)); return cell

def feet_together(cells):
    """the walk frame whose lowest 10 rows are narrowest (feet closest)"""
    def w(c):
        px = c.load(); xs = [x for y in range(FOOT - 9, FOOT + 1) for x in range(FW) if px[x, y][3]]; return (max(xs) - min(xs)) if xs else 999
    return min(range(len(cells)), key=lambda i: w(cells[i]))

def bob(cell, dy=None):
    dy = dy or BOB
    """breathing: everything above the waist moves down dy px (the legs stay planted)"""
    bb = cell.getbbox(); waist = bb[1] + int((bb[3] - bb[1]) * .62)
    out = Image.new('RGBA', cell.size, (0, 0, 0, 0)); out.alpha_composite(cell.crop((0, waist, FW, FH)), (0, waist))
    top = cell.crop((0, 0, FW, waist)); out.alpha_composite(top, (0, dy)); return out

def tip(cell, deg):
    """collapse: rotate the figure about its feet; the last frame lies flat on the ground"""
    if not deg: return cell.copy()
    bb = cell.getbbox(); fig = cell.crop(bb); P = 2 * max(fig.size)
    pad = Image.new('RGBA', (P, P), (0, 0, 0, 0)); fx = P // 2 - fig.width // 2; pad.alpha_composite(fig, (fx, P // 2 - fig.height))
    r = pad.rotate(deg, resample=Image.NEAREST, center=(P // 2, P // 2), expand=False)
    rb = r.getbbox(); out = Image.new('RGBA', (FW, FH), (0, 0, 0, 0))
    if rb: s = r.crop(rb); out.alpha_composite(s, (int(FW / 2 - s.width / 2), FOOT + 1 - s.height))
    return out

SKIN = [(253, 194, 119), (253, 166, 75), (248, 149, 74), (207, 140, 68)]
def hand(cell, front):
    """weapon grip point (upright frames): the lowest skin pixel of the leftmost hand, between head and thighs; centre of the body otherwise"""
    px = cell.load(); bb = cell.getbbox(); h = bb[3] - bb[1]; y0, y1 = bb[1] + int(h * .40), bb[1] + int(h * .66)   # below the head, above the thighs
    pts = [(x, y) for y in range(y0, y1) for x in range(bb[0], bb[2]) if px[x, y][3] and px[x, y][:3] in SKIN]
    if not pts: pts = [(x, y) for y in range(y0, y1) for x in range(bb[0], bb[2]) if px[x, y][3]]   # other palettes: the leftmost limb in that band
    if not pts: return [FW // 2 - 10, bb[1] + int(h * .62)]
    xl = min(p[0] for p in pts); near = [p for p in pts if p[0] <= xl + 4]   # the hand on the near (left) side
    x, y = max(near, key=lambda p: p[1]); return [x + 2, y - 2]

def row(tag, view):
    walk_src = gif_frames(os.path.join(SRC, f'{tag}_walk_{view}.gif'))
    gy, cx = ground(walk_src), centre_x(walk_src)
    walk = [to_cell(f, gy, cx) for f in walk_src]
    def load(anim, n):
        p = os.path.join(SRC, f'{tag}_{anim}_{view}.gif')
        if not os.path.exists(p): return None
        fr = gif_frames(p); g2, c2 = ground(fr), centre_x(fr); cells = [to_cell(f, g2, c2) for f in fr]
        pick = PICKS.get(f'{tag}_{anim}_{view}')
        return [cells[i] for i in pick] if pick else [cells[int(i * len(cells) / n)] for i in range(n)]
    stand = walk[feet_together(walk)]
    anims = {
        'idle': load('idle', 2) or [stand, bob(stand)],
        'walk': walk,
        'carry': load('carry', 6) or walk,
        'collapse': load('collapse', 4) or [tip(stand, d) for d in (0, 30, 62, 90)],
        'punch': load('punch', 3) or [stand] * 3,
        'blunt': load('blunt', 3) or [stand] * 3,
        'shoot': load('shoot', 3) or [stand] * 3,
    }
    cells = [c for a, n in ANIMS for c in anims[a][:n]]
    assert len(cells) == sum(n for _, n in ANIMS), (tag, view, len(cells))
    return cells, [hand(c, view == 'sw') for c in cells]

def main(tag):
    os.makedirs(OUT, exist_ok=True)
    front, hf = row(tag, 'sw'); back, hb = row(tag, 'nw')
    sheet = Image.new('RGBA', (FW * len(front), FH * 2), (0, 0, 0, 0))
    for i, c in enumerate(front): sheet.alpha_composite(c, (i * FW, 0))
    for i, c in enumerate(back): sheet.alpha_composite(c, (i * FW, FH))
    sheet.save(os.path.join(OUT, f'{tag}.png'), optimize=True)
    mp = os.path.join(OUT, 'meta.json'); meta = json.load(open(mp)) if os.path.exists(mp) else {}
    frames, k = {}, 0
    for a, n in ANIMS: frames[a] = [k, n]; k += n
    dn = 'v8' if KIND == 'hd' else KIND; bb = front[0].getbbox()
    meta.setdefault('defs', {})[dn] = {'res': KINDS[KIND]['res'], 'fw': FW, 'fh': FH, 'foot': FOOT, 'frames': frames, 'wpose': WPOSE}
    meta.setdefault('sheets', {})[tag] = {'file': f'{tag}.png', 'def': dn, 'hands': [hf, hb], 'h': FOOT + 1 - bb[1]}
    json.dump(meta, open(mp, 'w'), separators=(',', ':'))
    print(tag, sheet.size, 'frames', k)

if __name__ == '__main__':
    args = sys.argv[1:]
    if '--c64' in args: use('c64'); args.remove('--c64')
    for t in args or ['farm_m']: main(t)
