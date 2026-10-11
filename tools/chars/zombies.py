#!/usr/bin/env python3
"""Zombie Haven V3 zombies and the boss: DV2-style pixel art from the same toolkit as the survivors.

    python3 tools/chars/zombies.py     # assets/zombies/v6/<type>.png + meta.json

Sheets: row 0 = front (facing down-left), row 1 = back (facing up-left).
Zombie anims: idle 2, walk 4, attack 3, death 4.  Boss: idle 2, walk 4, slam 4, roar 2, death 4.
"""
import json, math, os, sys, random
sys.path.insert(0, os.path.dirname(__file__))
from pix import Cv, hx, adj, rot, OUTLINE, texture, outline_sel, ramp4 as ramp

ROOT = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
OUT = os.path.join(ROOT, 'assets', 'zombies', 'v6')

class P(dict):
    __getattr__ = dict.get
    __setattr__ = dict.__setitem__

PS = 1
TYPES = {   # K = body knobs: tw torso half-width, th torso height, leg leg length, aw arm width, hr head radius x, hy head radius y, hunch
  'walker':  dict(fw=44, fh=46, foot=42, skin='#8a9a72', shirt='#4e6078', pants='#4a5266', shoes='#3a3030', K=dict(tw=5, th=9, leg=9, aw=3, hr=7, hy=6.5, hunch=1), tears=True),
  'runner':  dict(fw=44, fh=46, foot=42, skin='#94a07a', shirt='#9a8a68', pants='#3f4f3a', shoes='#2a2a2a', K=dict(tw=4, th=9, leg=10, aw=3, hr=6.5, hy=6, hunch=2), tank=True, tears=True),
  'crawler': dict(fw=48, fh=32, foot=28, skin='#86966e', shirt='#6e5448', pants='#4a4a52', shoes='#2a2a2a', K=dict(tw=5, th=9, leg=7, aw=3, hr=7, hy=6.5, hunch=0), crawl=True),
  'bloated': dict(fw=48, fh=50, foot=46, skin='#a8ac6a', shirt='#7a5e5e', pants='#5a4a44', shoes='#3a2a2a', K=dict(tw=8, th=11, leg=8, aw=4, hr=7, hy=6.5, hunch=0), belly=True, pus=True),
  'spitter': dict(fw=44, fh=46, foot=42, skin='#7c9e62', shirt='#4c4c6a', pants='#3c3c50', shoes='#2a2a2a', K=dict(tw=5, th=9, leg=9, aw=3, hr=7.5, hy=7, hunch=2), goo=True, tears=True),
  'brute':   dict(fw=58, fh=62, foot=58, skin='#768a64', shirt=None, pants='#4a3a2e', shoes='#2a2018', K=dict(tw=10, th=15, leg=13, aw=5, hr=7, hy=6, hunch=2, ps=1.6), bare=True, belt='#2a2018'),
  'boss':    dict(fw=84, fh=88, foot=84, skin='#8e6a96', shirt=None, pants='#3a2a3a', shoes='#2a1a2a', K=dict(tw=16, th=25, leg=18, aw=8, hr=8, hy=7, hunch=4, ps=2.6), bare=True, boss=True, belt='#5a3a2a'),
}
EYE = hx('#fff6a0'); EYE2 = hx('#d0302a'); BLOOD = hx('#8a1a1a'); GOO = hx('#b8f04a')

def zpose(kind):
    out = {}
    b = lambda **k: P(dict(bob=0, lean=-1, legF=0, legB=0, liftF=0, liftB=0, armF=(-6, 2), armB=(-4, 1), head=0, mouth=0) | k)
    if kind == 'boss':   # knuckle-dragger: arms hang to the knees
        out['idle'] = [b(armF=(-4, 6), armB=(-1, 6)), b(bob=1, armF=(-4, 7), armB=(-1, 7))]
        out['walk'] = [b(legF=-2, legB=2, armF=(-5, 6), armB=(0, 6)), b(liftB=1, bob=-1, armF=(-4, 6), armB=(-1, 6)), b(legF=2, legB=-2, armF=(-3, 6), armB=(-2, 6)), b(liftF=1, bob=-1, armF=(-4, 6), armB=(-1, 6))]
        return out | {k: v for k, v in zpose('x').items() if k not in ('idle', 'walk')}
    out['idle'] = [b(), b(bob=1, armF=(-6, 3), armB=(-4, 2))]
    out['walk'] = [b(legF=-2, legB=2, armF=(-6, 1)), b(liftB=1, bob=-1, armF=(-6, 2)), b(legF=2, legB=-2, armF=(-6, 3)), b(liftF=1, bob=-1, armF=(-6, 2))]
    out['attack'] = [b(armF=(-2, -5), armB=(0, -5), lean=1, mouth=1), b(armF=(-8, 4), armB=(-6, 3), lean=-3, mouth=1, legF=-2, legB=2), b(armF=(-6, 6), armB=(-4, 5), lean=-2)]
    out['death'] = [b(lean=1, head=1, armF=(-3, 5), armB=(2, 5)), b(lean=1, bob=4, head=1, armF=(-3, 4), armB=(2, 4)), 'fall', 'flat']
    out['slam'] = [b(armF=(1, -9), armB=(3, -9), lean=2, mouth=1), b(armF=(-2, -11), armB=(0, -11), lean=3, mouth=1), b(armF=(-10, 9), armB=(-8, 9), lean=-4, bob=2, mouth=1, legF=-3, legB=3), b(armF=(-8, 7), armB=(-6, 7), lean=-2, bob=1)]
    out['roar'] = [b(armF=(-3, -6), armB=(4, -6), lean=2, mouth=2, head=-1), b(armF=(-4, -7), armB=(5, -7), lean=2, mouth=2, head=-2, bob=-1)]
    return out

def draw_z(t, o, pz, view):
    K = o['K']; fw, fh, foot = o['fw'], o['fh'], o['foot']; cv = Cv(fw, fh); cx = fw // 2; parts = []
    rs, rp, rsh = ramp(o['skin']), ramp(o['pants']), ramp(o['shoes']); rshirt = ramp(o['shirt']) if o.get('shirt') else rs
    back = view == 1; aw = K['aw']; big = o.get('boss')
    hip = foot - K['leg'] - 1 + round(pz.bob * K.get('ps', 1)); sh = hip - K['th']; bx = cx + round(pz.lean * K.get('ps', 1))
    def leg(tag, x, fdx, lift):
        fx = x + round(fdx * K.get('ps', 1)); fy = foot - lift
        for yy in range(hip, fy - 1):
            tt = (yy - hip) / max(1, fy - 1 - hip); xx = round(x + (fx - x) * tt)
            cv.rect(xx - aw // 2 - 1 - (1 if big else 0), yy, xx + aw // 2 + (1 if big else 0), yy, rp['b'], tag)
        cv.rect(fx - aw // 2 - 2, fy - 1, fx + aw // 2 + 1, fy, rsh['b'], tag + 's'); parts.extend([(tag, rp), (tag + 's', rsh)])
    ps = K.get('ps', 1)
    def arm(tag, sx, sy, d):
        d = (d[0] * ps, d[1] * ps); ex, ey = sx + d[0], sy + d[1]; mid = (sx + d[0] * .45, sy + d[1] * .45)
        sleeve = rshirt['b'] if (o.get('shirt') and not o.get('tank')) else rs['b']
        cv.line(sx, sy, mid[0], mid[1], sleeve, aw, tag); cv.line(mid[0], mid[1], ex, ey, rs['b'], aw + (2 if K.get('ps', 1) > 1 else 0), tag + 'k')
        cv.rect(ex - aw // 2 - (1 if big else 0), ey, ex + aw // 2, ey + aw // 2 + (1 if big else 0), rs['b'], tag + 'h')
        if big:   # claws
            for k in range(3): cv.set(ex - 2 - k, ey + aw // 2 + 2, hx('#e8e0c8'), 'claw')
        parts.extend([(tag, rshirt if o.get('shirt') and not o.get('tank') else rs), (tag + 'k', rs), (tag + 'h', rs)])
    tw = K['tw']; shL, shR = (bx - tw + 1, sh + 1), (bx + tw - 1, sh + 1)
    arm('armB', shR[0], shR[1], (pz.armB[0] if not back else -pz.armB[0] * .3, pz.armB[1]))
    if not back: leg('legB', bx + tw // 2 + 1, pz.legB, pz.liftB); leg('legF', bx - tw // 2, pz.legF, pz.liftF)
    else: leg('legF', bx - tw // 2, pz.legF, pz.liftF); leg('legB', bx + tw // 2 + 1, pz.legB, pz.liftB)
    # torso
    top = rshirt['b'] if o.get('shirt') else rs['b']
    if K.get('ps', 1) > 1:   # hulking: wide rounded chest, narrow waist
        cv.ell(bx, sh + K['th'] * .42, tw, K['th'] * .5, top, 'torso'); cv.rect(bx - round(tw * .62), sh + K['th'] * .5, bx + round(tw * .62), hip, top, 'torso')
    else:
        cv.rect(bx - tw, sh, bx + tw, hip, top, 'torso'); cv.set(bx - tw, sh, None); cv.set(bx + tw, sh, None)
    parts.append(('torso', rshirt if o.get('shirt') else rs))
    if o.get('belly'): cv.ell(bx - (2 if not back else 0), sh + K['th'] * .6, tw + 1, K['th'] * .55, top, 'torso')
    if o.get('tank') and not back: cv.rect(bx - tw, sh, bx + tw, sh + 1, rs['b'], 'neck'); parts.append(('neck', rs))
    if o.get('bare'):   # muscle lines, scars
        cv.line(bx, sh + 2, bx, hip - 2, rs['sh'], 1, 'mus'); cv.rect(bx - tw + 2, sh + 3, bx - 2, sh + 3, rs['sh'], 'mus'); cv.rect(bx + 2, sh + 3, bx + tw - 2, sh + 3, rs['sh'], 'mus')
    if o.get('belt'): cv.rect(bx - tw, hip - 1, bx + tw, hip, hx(o['belt']), 'belt')
    if big:
        rnd = random.Random(7 + view)
        for k in range(9):   # tumours and bone spikes
            x = bx + rnd.randint(-tw + 1, tw - 1); y = sh + rnd.randint(1, K['th'] - 2); cv.ell(x, y, 1.5, 1.5, hx('#d07a9a'), 'tum'); cv.set(x - 1, y - 1, hx('#f0a8c0'), 'tum')
        for k in range(4): x = bx - tw + 2 + k * (2 * tw // 4) + (1 if back else 0); cv.line(x, sh, x - 1, sh - 4, hx('#e8e0c8'), 2, 'bone'); cv.set(x - 1, sh - 5, hx('#ffffff'), 'bone')
    if o.get('tears') and not back:
        for (dx, dy) in ((-2, 3), (1, 5), (3, 2)): cv.set(bx + dx, sh + dy, rs['b'], 'tear')
        cv.set(bx - 1, sh + 4, BLOOD, 'bl'); cv.set(bx + 2, sh + 6, BLOOD, 'bl')
    if o.get('pus'):
        for (dx, dy) in ((-3, 3), (2, 5), (-1, 7), (4, 2)): cv.set(bx + dx, sh + dy, hx('#e8e070'), 'pus')
    # front arm
    arm('armF', shL[0] if not back else shR[0], shL[1], (pz.armF[0] if not back else -pz.armF[0] * .3, pz.armF[1]))
    # head (smaller on the big ones), tilted forward by the hunch; gaunt face: dark sockets, pale pupils, bared teeth
    hr, hy = K['hr'], K['hy']; hcx = bx - (1 if not back else 0) - K['hunch'] // 2; hcy = sh - hy + 1 + K['hunch'] + pz.head + (3 if big else 0)
    cv.ell(hcx, hcy, hr, hy, rs['b'], 'head'); parts.append(('head', rs))
    rnd2 = random.Random(hash(t) % 997 + view)
    hair = hx('#2e2622')
    if not big:   # thin, patchy hair
        for y in range(int(hcy - hy - 1), int(hcy - hy + (3 if not back else 6))):
            for x in range(int(hcx - hr), int(hcx + hr + 1)):
                if 0 <= y < fh and 0 <= x < fw and cv.tag[y][x] == 'head' and rnd2.random() < .62: cv.set(x, y, hair, 'hairz')
    if not back:
        ex = hcx - hr + 2; ey = hcy
        for dx in (0, 4 if not big else 5):
            cv.rect(ex + dx - 1, ey - 1, ex + dx + 1, ey + 1, hx('#1c1210'), 'sock'); cv.set(ex + dx, ey, hx('#f4f0d8') if not big else hx('#ffe040'), 'eye')
        cv.set(ex + 2, ey + 2, rs['dk'], 'nose')
        mw = 4 + pz.mouth; my = ey + 3 + (1 if big else 0)
        cv.rect(ex, my, ex + mw - 1, my + 1 + pz.mouth, hx('#2a0c0c'), 'mouth')
        for k in range(0, mw, 2): cv.set(ex + k, my, hx('#e8e2c8'), 'teeth')
        if pz.mouth: 
            for k in range(1, mw, 2): cv.set(ex + k, my + 1 + pz.mouth, hx('#e8e2c8'), 'teeth')
        if o.get('goo'): cv.line(ex + 1, my + 2, ex + 1, my + 5, GOO, 1, 'goo'); cv.set(ex + 2, my + 6, GOO, 'goo')
        cv.set(hcx + hr - 3, hcy + 1, BLOOD, 'bl'); cv.set(hcx + hr - 3, hcy + 2, BLOOD, 'bl')
    if big:
        for sgn in (-1, 1): cv.line(hcx + sgn * (hr - 2), hcy - hy + 2, hcx + sgn * (hr + 2), hcy - hy - 4, hx('#e8e0c8'), 2, 'horn')
    for tg, r in parts: cv.shade(tg, r)
    for i, (tg, r) in enumerate(parts):
        if tg in ('torso', 'armB', 'armF', 'legF', 'legB', 'head', 'armBk', 'armFk'): texture(cv, tg, r, .16, i * 13 + view)
    # torn, bloodied clothes
    cl = cv.mask('torso') | cv.mask('legF') | cv.mask('legB') | cv.mask('armF') | cv.mask('armB')
    for (x, y) in sorted(cl):
        v = rnd2.random()
        if v < .025: cv.p[y][x] = BLOOD
        elif v < .08: cv.p[y][x] = rs['sh']
    outline_sel(cv); return cv

def drop(cv, foot, dx=0):
    bb = cv.bbox(); n = Cv(cv.w, cv.h)
    if bb: n.blit(cv, dx, foot - bb[3])
    return n

def frames_for(t):
    o = TYPES[t]; PZ = zpose(t); anims = [('idle', 2), ('walk', 4), ('slam', 4), ('roar', 2), ('death', 4)] if o.get('boss') else [('idle', 2), ('walk', 4), ('attack', 3), ('death', 4)]
    rows = []
    for view in (0, 1):
        fr = []
        for name, n in anims:
            for i in range(n):
                pz = PZ[name][i]
                if pz in ('fall', 'flat'):
                    st = draw_z(t, o, PZ['idle'][0], view); r = rot(st, -50 if pz == 'fall' else -90, o['fw'] // 2, o['foot'] - 1)
                    fr.append(drop(r, o['foot'], 2 if pz == 'flat' else 0)); continue
                cv = draw_z(t, o, pz, view)
                if o.get('crawl'):   # a crawler is the same body, flat on the ground, dragging itself with its arms
                    cv = drop(rot(cv, -90, o['fw'] // 2, o['foot'] - 1), o['foot'], -4)
                fr.append(cv)
        rows.append(fr)
    meta, k = {}, 0
    for name, n in anims: meta[name] = [k, n]; k += n
    return rows, meta

def main():
    from PIL import Image
    os.makedirs(OUT, exist_ok=True); allm = {}
    for t, o in TYPES.items():
        rows, fm = frames_for(t); n = len(rows[0])
        im = Image.new('RGBA', (o['fw'] * n, o['fh'] * 2), (0, 0, 0, 0))
        for r, fr in enumerate(rows):
            for i, cv in enumerate(fr): im.alpha_composite(cv.img(), (i * o['fw'], r * o['fh']))
        im.save(os.path.join(OUT, t + '.png'))
        bb = [cv.bbox() for cv in rows[0][:2]]; top = min(b[1] for b in bb if b)
        allm[t] = {'fw': o['fw'], 'fh': o['fh'], 'foot': o['foot'], 'h': o['foot'] - top, 'frames': fm}
    json.dump(allm, open(os.path.join(OUT, 'meta.json'), 'w')); print('zombies', list(allm))

if __name__ == '__main__':
    main()
