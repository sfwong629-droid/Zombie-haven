#!/usr/bin/env python3
"""Zombie Haven V3 survivors: detailed, gritty pixel art (style reference: the user's soldier sprite), generated pixel by pixel.

    python3 tools/chars/gen.py            # writes assets/characters/v6/*.png + meta.json

Scale: one art pixel = one map art pixel (a tile is 42 px wide). A survivor is ~32 px tall (head ~40% of that).
Sheet = 2 rows (0 = front, facing down-left; 1 = back, facing up-left) x N frames of FW x FH.
Skin and hair are drawn in KEY colours and recoloured in the game per survivor (skin tones x hair colours).
Animations (frame ranges in meta.json): idle 2, walk 4, carry 4, collapse 4, punch 3, blunt 3, shoot 3.
Each frame records the front hand point and the weapon pose, so the game draws the equipped weapon in the hand.
"""
import json, math, os, sys, random
sys.path.insert(0, os.path.dirname(__file__))
from pix import Cv, hx, adj, rot, texture, outline_sel, ramp4

ROOT = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
OUT = os.path.join(ROOT, 'assets', 'characters', 'v6')
FW, FH, CX, FOOT = 44, 46, 22, 42

SKIN = {'hi': (255, 0, 200, 255), 'b': (230, 0, 180, 255), 'sh': (200, 0, 160, 255), 'dk': (170, 0, 140, 255)}
HAIR = {'hi': (0, 255, 200, 255), 'b': (0, 220, 170, 255), 'sh': (0, 185, 140, 255), 'dk': (0, 150, 115, 255)}
EYE = hx('#24161a'); BLOOD = hx('#7a1e1a')

ANIMS = [('idle', 2), ('walk', 4), ('carry', 4), ('collapse', 4), ('punch', 3), ('blunt', 3), ('shoot', 3)]

JOBS = {   # one strong silhouette + colour scheme per job; pat = fabric pattern
    'Civilian':       dict(top='#4f9a92', pants='#45618f', boots='#6b5a4a', sleeve='long', hat=None, pat='grit'),
    'Guard':          dict(top='#6c7a3e', pants='#4a4f36', boots='#4a3424', sleeve='long', hat='helmet', hatc='#5b6a33', vest='#7a6640', belt='#33281c', pat='camo', pockets=True),
    'Police Officer': dict(top='#34508f', pants='#232c4a', boots='#1e1e26', sleeve='long', hat='cap', hatc='#232c4a', badge='#f2c94a', collar='#9ec0e8', pat='grit'),
    'Medic':          dict(top='#e9e5da', pants='#4fa3b0', boots='#d8d4cc', sleeve='long', hat='band', hatc='#e9e5da', cross='#d8403a', coat=True, pat='stain'),
    'Scavenger':      dict(top='#8c5a32', pants='#4e4234', boots='#33261a', sleeve='long', hat='hood', hatc='#7a4e2c', scarf='#b8923e', pack='#5e4e34', pat='grit', pockets=True),
    'Engineer':       dict(top='#6e767e', pants='#384a6a', boots='#4a3220', sleeve='long', hat='hardhat', hatc='#f2c22e', vest='#f07a1e', stripe='#eae6c8', belt='#4a3218', pat='grit'),
    'Cook':           dict(top='#efebe2', pants='#33333c', boots='#24242a', sleeve='short', hat='toque', hatc='#f6f4ee', apron='#c8463a', check=True, pat='stain'),
    'Farmer':         dict(top='#b8423a', pants='#4672a8', boots='#5e3e22', sleeve='long', hat='straw', hatc='#e2b45e', overalls=True, pat='plaid'),
    'Mechanic':       dict(top='#3a6aa2', pants='#3a6aa2', boots='#2a2a2a', sleeve='long', hat='capback', hatc='#c83a34', belt='#2a2a2a', pat='grease', patch='#f2c22e'),
    'Paramedic':      dict(top='#e0603a', pants='#283a5e', boots='#1e1e22', sleeve='long', hat=None, stripe='#eae4b8', cross='#f4f4f0', pat='grit'),
    'SWAT':           dict(top='#2c323c', pants='#252932', boots='#141518', sleeve='long', hat='helmet', hatc='#1c2027', vest='#3a404c', visor='#6cc4f0', belt='#141518', pat='grit', pockets=True),
    'Raider':         dict(top='#6a2a24', pants='#3a2e2a', boots='#20160f', sleeve='short', hat='bandana', hatc='#b8302a', vest='#4a3424', spikes=True, mask=True, pat='stain'),
    'Trader':         dict(top='#527a44', pants='#5e4632', boots='#33261a', sleeve='long', hat='wide', hatc='#6e5030', pack='#946a3e', bigpack=True, pat='grit'),
}

class P(dict):
    __getattr__ = dict.get
    __setattr__ = dict.__setitem__

def base_pose():
    return P(bob=0, lean=0, legF=0, legB=0, liftF=0, liftB=0, armF=(-1, 9), armB=(1, 9), head=0, kneel=0, carry=False, wpose='rest', both=False)

def poses():
    out = {}
    q = base_pose(); q.bob = 1; q.armF = (-1, 8); q.armB = (1, 8)
    out['idle'] = [base_pose(), q]
    walk = []
    for i in range(4):
        w = base_pose(); s = [1, 0, -1, 0][i]
        w.legF = -3 * s; w.legB = 3 * s; w.liftF = 1 if i == 3 else 0; w.liftB = 1 if i == 1 else 0
        w.armF = (-1 + 3 * s, 9); w.armB = (1 - 3 * s, 9); w.bob = [0, -1, 0, -1][i]; walk.append(w)
    out['walk'] = walk
    out['carry'] = []
    for w0 in walk:
        c = P(w0); c.carry = True; c.armF = (-6, 5); c.armB = (-2, 5); out['carry'].append(c)
    k1 = base_pose(); k1.lean = -1; k1.armF = (-4, 6); k1.armB = (4, 6); k1.head = 1
    k2 = base_pose(); k2.kneel = 5; k2.lean = -1; k2.armF = (-4, 6); k2.armB = (3, 7); k2.head = 1
    out['collapse'] = [k1, k2, 'fall45', 'lying']
    a = base_pose(); a.armF = (4, 5); a.lean = 1; a.legF = -1; a.legB = 1
    b = base_pose(); b.armF = (-9, 2); b.lean = -2; b.legF = -3; b.legB = 3
    c = base_pose(); c.armF = (-4, 7); c.lean = -1
    out['punch'] = [a, b, c]
    r = base_pose(); r.armF = (2, -6); r.lean = 1; r.wpose = 'up'
    s = base_pose(); s.armF = (-8, 1); s.lean = -2; s.legF = -3; s.legB = 3; s.wpose = 'fwd'
    f = base_pose(); f.armF = (-6, 7); f.lean = -1; f.legF = -1; f.legB = 1; f.wpose = 'down'
    out['blunt'] = [r, s, f]
    g = base_pose(); g.armF = (-8, 4); g.armB = (-5, 4); g.both = True; g.wpose = 'aim'
    h = P(g); h.lean = 1; h.wpose = 'fire'
    i2 = P(g); i2.armF = (-7, 5); i2.wpose = 'aim'
    out['shoot'] = [g, h, i2]
    return out

def draw_figure(o, female, view, pz, hair_style, seed):
    cv = Cv(FW, FH); parts = []; rnd = random.Random(seed)
    R = {k: ramp4(v) for k, v in o.items() if isinstance(v, str) and v.startswith('#')}
    back = view == 1
    up = pz.bob + pz.kneel
    hip = 32 + up; sh = 23 + up; bx = CX + pz.lean; tw = 4 if female else 5
    def leg(tag, x, fdx, lift):
        fx = x + fdx; fy = FOOT - lift
        if pz.kneel: fy = min(fy, hip + 5)
        for yy in range(hip, fy - 2):
            t = (yy - hip) / max(1, fy - 2 - hip); xx = round(x + (fx - x) * t)
            cv.rect(xx - 1, yy, xx + 2, yy, R['pants']['b'], tag)
        bxx = fx - (1 if not back else 0)
        cv.rect(bxx - 1, fy - 2, bxx + 2, fy, R['boots']['b'], tag + 'b'); cv.set(bxx - 2, fy, R['boots']['b'], tag + 'b')
        parts.extend([(tag, R['pants'], 'tex'), (tag + 'b', R['boots'], None)])
    def arm(tag, sx, sy, d):
        hx_, hy_ = sx + d[0], sy + d[1]; mid = (sx + d[0] * .5, sy + d[1] * .5)
        long_ = o['sleeve'] == 'long'
        cv.line(sx, sy, mid[0], mid[1], R['top']['b'], 4 if not female else 3, tag)
        cv.line(mid[0], mid[1], hx_, hy_, R['top']['b'] if long_ else SKIN['b'], 3 if long_ else 2, tag + ('' if long_ else 'k'))
        cv.rect(hx_ - 1, hy_, hx_ + 1, hy_ + 1, SKIN['b'], tag + 'h')
        parts.extend([(tag, R['top'], 'tex'), (tag + 'k', SKIN, None), (tag + 'h', SKIN, None)])
        return (hx_, hy_)
    shL, shR = (bx - tw + 1, sh + 1), (bx + tw - 1, sh + 1)
    if not back:
        arm('armB', shR[0], shR[1], pz.armB)
        leg('legB', bx + 2, pz.legB, pz.liftB); leg('legF', bx - 2, pz.legF, pz.liftF)
    else:
        arm('armB', shL[0], shL[1], pz.armF)
        leg('legF', bx - 2, pz.legF, pz.liftF); leg('legB', bx + 2, pz.legB, pz.liftB)
    if o.get('bigpack') or (o.get('pack') and back):
        w = 6 if o.get('bigpack') else 5
        if back: cv.rect(bx - w + 1, sh - 1, bx + w - 1, sh + 9, R['pack']['b'], 'pack')
        else: cv.rect(bx + tw - 1, sh - 2 - (4 if o.get('bigpack') else 0), bx + tw + w - 2, sh + 8, R['pack']['b'], 'pack')
        parts.append(('pack', R['pack'], 'tex'))
    cv.rect(bx - tw, sh, bx + tw, hip, R['top']['b'], 'torso'); cv.set(bx - tw, sh, None); cv.set(bx + tw, sh, None)
    parts.append(('torso', R['top'], 'tex'))
    if o.get('coat') and not back: cv.rect(bx - tw, hip - 1, bx + tw, hip + 3, R['top']['b'], 'coat'); parts.append(('coat', R['top'], 'tex'))
    if o.get('overalls'):
        cv.rect(bx - tw, sh + 5, bx + tw, hip, R['pants']['b'], 'bib'); cv.rect(bx - 2, sh + 1, bx + 2, sh + 5, R['pants']['b'], 'bib')
        cv.set(bx - 3, sh + 1, R['pants']['dk'], 'strap'); cv.set(bx + 3, sh + 1, R['pants']['dk'], 'strap'); parts.append(('bib', R['pants'], 'tex'))
    if o.get('vest'):
        cv.rect(bx - tw, sh + 1, bx + tw, hip - 1, R['vest']['b'], 'vest'); parts.append(('vest', R['vest'], 'tex'))
    if o.get('stripe'): cv.rect(bx - tw, sh + 6, bx + tw, sh + 6, hx(o['stripe']), 'stripe'); cv.rect(bx - tw, sh + 3, bx + tw, sh + 3, hx(o['stripe']), 'stripe')
    if o.get('apron') and not back:
        cv.rect(bx - 3, sh + 3, bx + 3, hip + 3, R['apron']['b'], 'apron'); parts.append(('apron', R['apron'], None))
    if o.get('belt'): cv.rect(bx - tw, hip - 1, bx + tw, hip - 1, hx(o['belt']), 'belt'); cv.set(bx - 1, hip - 1, hx('#c8a24a'), 'buckle')
    if o.get('scarf'): cv.rect(bx - tw, sh, bx + tw, sh + 1, R['scarf']['b'], 'scarf'); parts.append(('scarf', R['scarf'], None))
    if o.get('spikes'):
        for sx in (bx - tw - 1, bx + tw + 1): cv.set(sx, sh, hx('#cfd2d6'), 'spk'); cv.set(sx, sh - 1, hx('#8a8f96'), 'spk')
    vk = 'vest' if o.get('vest') else 'top'
    if not back:
        if o.get('collar'): cv.set(bx - 1, sh, hx(o['collar']), 'col'); cv.set(bx + 1, sh, hx(o['collar']), 'col')
        else: cv.set(bx, sh, R['top']['dk'], 'col')
        cv.line(bx, sh + 1, bx, hip - 2, R[vk]['dk'], 1, 'zip')
        if o.get('pockets'):
            for px in (bx - tw + 1, bx + 2): cv.rect(px, sh + 4, px + 2, sh + 5, R[vk]['sh'], 'pk'); cv.rect(px, sh + 4, px + 2, sh + 4, R[vk]['dk'], 'pk')
        if o.get('badge'): cv.rect(bx - 3, sh + 2, bx - 2, sh + 3, hx(o['badge']), 'badge')
        if o.get('cross'): cv.rect(bx - 4, sh + 3, bx - 2, sh + 3, hx(o['cross']), 'x'); cv.rect(bx - 3, sh + 2, bx - 3, sh + 4, hx(o['cross']), 'x')
        if o.get('patch'): cv.set(bx + 3, sh + 2, hx(o['patch']), 'pt')
        if o.get('check') and o.get('apron'):
            for yy in range(sh + 4, hip + 3, 2):
                for xx in range(bx - 3 + (yy % 2), bx + 4, 2): cv.set(xx, yy, hx('#f2e2d2'), 'ck')
    elif o.get('cross'):
        cv.rect(bx - 2, sh + 3, bx + 2, sh + 3, hx(o['cross']), 'x'); cv.rect(bx, sh + 1, bx, sh + 5, hx(o['cross']), 'x')
    hf = arm('armF', shL[0], shL[1], pz.armF) if not back else arm('armF', shR[0], shR[1], (-pz.armB[0], pz.armB[1]))
    if pz.both and not back: arm('armB2', shR[0] - 3, shR[1], pz.armB)
    if pz.carry:
        c0 = bx - 9 if not back else bx - 5; cv.rect(c0, sh + 1, c0 + 7, sh + 7, hx('#9a6a3a'), 'crate'); parts.append(('crate', ramp4('#9a6a3a'), 'tex'))
        cv.rect(c0, sh + 4, c0 + 7, sh + 4, hx('#6a4626'), 'crl')
    hcx, hcy = bx - (0 if back else 1), 16 + up + pz.head
    cv.ell(hcx, hcy, 7, 6.5, SKIN['b'], 'head'); parts.append(('head', SKIN, None))
    hr = HAIR['b']
    def tufts(y0, x0, x1, n):
        for _ in range(n):
            x = rnd.randint(x0, x1); h = rnd.randint(1, 2)
            for k in range(h): cv.set(x + (k if rnd.random() < .5 else -k), y0 - k, hr, 'hair')
    if back:
        cv.ell(hcx, hcy - 1, 7, 6.5, hr, 'hair')
        if not o.get('hat'): tufts(hcy - 8, hcx - 5, hcx + 5, 7)
        cv.set(hcx - 7, hcy + 1, SKIN['b'], 'ear'); cv.set(hcx + 7, hcy + 1, SKIN['b'], 'ear')
        if female and hair_style in ('long', 'pony', 'bob'):
            cv.rect(hcx - 6, hcy + 2, hcx + 6, hcy + (9 if hair_style == 'long' else 5), hr, 'hair')
            if hair_style == 'pony': cv.rect(hcx - 1, hcy + 4, hcx + 1, hcy + 11, hr, 'hair')
    else:
        for y in range(hcy - 8, hcy + 1):
            for x in range(hcx - 8, hcx + 9):
                if 0 <= y < FH and 0 <= x < FW and cv.tag[y][x] == 'head':
                    edge = hcy - 3 + (1 if x > hcx else 0) + (2 if x > hcx + 3 else 0)
                    if y <= edge or x >= hcx + 5: cv.set(x, y, hr, 'hair')
        if not o.get('hat'): tufts(hcy - 7, hcx - 5, hcx + 5, 8)
        for k in range(3): cv.set(hcx - 6 + k * 2, hcy - 3 + (k % 2), hr, 'hair')
        if hair_style in ('long', 'pony', 'bob'):
            cv.rect(hcx + 4, hcy - 1, hcx + 7, hcy + (8 if hair_style == 'long' else 4), hr, 'hair')
            if hair_style == 'pony': cv.rect(hcx + 7, hcy - 3, hcx + 9, hcy + 5, hr, 'hair')
            cv.rect(hcx - 7, hcy - 2, hcx - 5, hcy + 1, hr, 'hair')
        ey = hcy + 1
        for ex in (hcx - 5, hcx - 1):
            cv.rect(ex, ey - 3, ex + 1, ey - 3, HAIR['dk'], 'brow')
            cv.rect(ex, ey - 1, ex + 1, ey + 1, EYE, 'eye'); cv.set(ex + 1, ey - 1, hx('#e8e0d8'), 'eye')
            if female: cv.set(ex - 1, ey - 1, EYE, 'eye')
        cv.set(hcx - 3, ey + 3, SKIN['sh'], 'nose'); cv.set(hcx - 3, ey + 2, SKIN['sh'], 'nose')
        cv.rect(hcx - 4, ey + 5, hcx - 2, ey + 5, SKIN['dk'], 'mouth')
        cv.set(hcx + 3, hcy + 1, SKIN['sh'], 'ear'); cv.set(hcx + 3, hcy + 2, SKIN['dk'], 'ear')
        if o.get('mask'): cv.rect(hcx - 7, hcy + 3, hcx + 3, hcy + 6, hx(o['hatc']), 'maskc')
    ht = o.get('hat'); hc = ramp4(o['hatc']) if o.get('hatc') else None
    if ht == 'helmet':
        cv.ell(hcx, hcy - 4, 8, 4, hc['b'], 'hat'); cv.rect(hcx - 9, hcy - 1, hcx + 8, hcy - 1, hc['sh'], 'hatb'); cv.set(hcx + 4, hcy - 5, hc['dk'], 'hatd')
        if o.get('visor') and not back: cv.rect(hcx - 8, hcy, hcx, hcy, hx(o['visor']), 'visor')
    elif ht == 'cap':
        cv.ell(hcx, hcy - 4, 7, 3, hc['b'], 'hat'); cv.rect(hcx - 7, hcy - 3, hcx + 7, hcy - 2, hc['sh'], 'hatb')
        if not back: cv.rect(hcx - 10, hcy - 2, hcx - 6, hcy - 2, hc['dk'], 'brim'); cv.set(hcx - 2, hcy - 5, hx('#f2c94a'), 'cb')
    elif ht == 'capback':
        cv.ell(hcx, hcy - 4, 7, 3, hc['b'], 'hat'); cv.rect(hcx + 5 if not back else hcx - 2, hcy - 3, hcx + 9 if not back else hcx + 2, hcy - 3, hc['dk'], 'brim')
    elif ht == 'band':
        cv.rect(hcx - 7, hcy - 3, hcx + 7, hcy - 2, hc['b'], 'hat')
        if not back: cv.rect(hcx - 4, hcy - 3, hcx - 2, hcy - 2, hx(o['cross']), 'x2')
    elif ht == 'hood':
        cv.ell(hcx + (1 if not back else 0), hcy - 1, 8, 7.5, hc['b'], 'hat')
        if not back:
            for y in range(hcy - 4, hcy + 5):
                for x in range(hcx - 7, hcx + 3):
                    if ((x - hcx + 1.5) / 5.6) ** 2 + ((y - hcy) / 4.8) ** 2 <= 1: cv.set(x, y, SKIN['b'], 'head')
            for ex in (hcx - 5, hcx - 1): cv.rect(ex, hcy, ex + 1, hcy + 1, EYE, 'eye'); cv.rect(ex, hcy - 2, ex + 1, hcy - 2, HAIR['dk'], 'brow')
            cv.rect(hcx - 7, hcy + 3, hcx + 2, hcy + 5, hx(o['scarf']), 'scarf2'); parts.append(('scarf2', ramp4(o['scarf']), None))
            cv.rect(hcx - 6, hcy - 4, hcx, hcy - 4, hx('#3a3a3a'), 'gog'); cv.set(hcx - 5, hcy - 4, hx('#7fd0ff'), 'gog'); cv.set(hcx - 2, hcy - 4, hx('#7fd0ff'), 'gog')
        parts.append(('hat', hc, 'tex'))
    elif ht == 'hardhat':
        cv.ell(hcx, hcy - 4, 8, 4, hc['b'], 'hat'); cv.rect(hcx - 9, hcy - 2, hcx + 9, hcy - 1, hc['sh'], 'hatb'); cv.rect(hcx - 1, hcy - 8, hcx, hcy - 3, hc['hi'], 'hatr')
    elif ht == 'toque':
        cv.rect(hcx - 6, hcy - 5, hcx + 6, hcy - 3, hc['b'], 'hat'); cv.ell(hcx, hcy - 9, 6, 4, hc['b'], 'hatt'); cv.ell(hcx - 3, hcy - 10, 3, 3, hc['b'], 'hatt'); cv.ell(hcx + 3, hcy - 10, 3, 3, hc['b'], 'hatt')
        parts.append(('hatt', hc, None))
    elif ht == 'straw':
        cv.ell(hcx, hcy - 5, 6, 3, hc['b'], 'hat'); cv.rect(hcx - 11, hcy - 3, hcx + 11, hcy - 2, hc['sh'], 'hatb'); cv.rect(hcx - 6, hcy - 4, hcx + 6, hcy - 4, hx('#a8382a'), 'hband')
        for x in range(hcx - 10, hcx + 11, 3): cv.set(x, hcy - 2, hc['dk'], 'weave')
    elif ht == 'bandana':
        cv.ell(hcx, hcy - 4, 7, 3, hc['b'], 'hat'); cv.rect(hcx + 6, hcy - 3, hcx + 9, hcy - 1, hc['sh'], 'hatk')
    elif ht == 'wide':
        cv.ell(hcx, hcy - 5, 6, 3, hc['b'], 'hat'); cv.rect(hcx - 10, hcy - 3, hcx + 10, hcy - 2, hc['sh'], 'hatb')
    if hc and ht != 'hood': parts.append(('hat', hc, None))
    parts.append(('hair', HAIR, None))
    for t, r, tex in parts: cv.shade(t, r)
    for i, (t, r, tex) in enumerate(parts):
        if tex: texture(cv, t, r, .14, seed + i)
    pat = o.get('pat')
    tm = cv.mask('torso') | cv.mask('armF') | cv.mask('armB') | cv.mask('legF') | cv.mask('legB') | cv.mask('coat')
    if pat == 'camo':
        for (x, y) in tm:
            v = (math.sin(x * 1.3 + y * .7) + math.sin(y * 1.9 - x * .4))
            if v > 1.1: cv.p[y][x] = hx('#3e4a24')
            elif v < -1.3: cv.p[y][x] = hx('#8a8456')
    elif pat == 'plaid':
        for (x, y) in cv.mask('torso') | cv.mask('armF') | cv.mask('armB'):
            if y % 3 == 0 or x % 3 == 0: cv.p[y][x] = R['top']['dk'] if (x + y) % 2 else R['top']['sh']
    elif pat in ('stain', 'grease'):
        for (x, y) in sorted(tm):
            if rnd.random() < .05: cv.p[y][x] = hx('#8a7a5a') if pat == 'stain' else hx('#2a2a30')
    for (x, y) in sorted(tm):
        if rnd.random() < .006: cv.p[y][x] = BLOOD
    return cv, hf

def fall_frames(stand):
    a = rot(stand, -50, CX, FOOT - 1); b = rot(stand, -90, CX, FOOT - 1)
    for cv in (a, b):
        bb = cv.bbox()
        if bb: n = Cv(FW, FH); n.blit(cv, 2 if cv is b else 0, FOOT - bb[3]); cv.p, cv.tag = n.p, n.tag
    return a, b

def figure_frames(o, female, hair_style, seed):
    PZ = poses(); rows = []; meta = {'frames': {}, 'hand': [[], []], 'wpose': []}
    for view in (0, 1):
        frames = []; hands = []
        for name, n in ANIMS:
            for i in range(n):
                pz = PZ[name][i]
                if pz in ('fall45', 'lying'):
                    st, _ = draw_figure(o, female, view, base_pose(), hair_style, seed); outline_sel(st)
                    a, b = fall_frames(st); frames.append(a if pz == 'fall45' else b); hands.append([CX, FOOT - 2]); continue
                cv, h = draw_figure(o, female, view, pz, hair_style, seed); outline_sel(cv); frames.append(cv); hands.append([int(round(h[0])), int(round(h[1]))])
        rows.append(frames); meta['hand'][view] = hands
    k = 0
    for name, n in ANIMS: meta['frames'][name] = [k, n]; k += n
    for name, n in ANIMS:
        for i in range(n): pz = PZ[name][i]; meta['wpose'].append(pz.wpose if isinstance(pz, dict) else 'none')
    return rows, meta

def sheet(rows):
    from PIL import Image
    n = len(rows[0]); im = Image.new('RGBA', (FW * n, FH * 2), (0, 0, 0, 0))
    for r, frames in enumerate(rows):
        for i, cv in enumerate(frames): im.alpha_composite(cv.img(), (i * FW, r * FH))
    return im

def main():
    os.makedirs(OUT, exist_ok=True); allmeta = {'fw': FW, 'fh': FH, 'foot': FOOT, 'anims': ANIMS, 'sheets': {}}
    only = sys.argv[1:]
    for n, (job, o) in enumerate(JOBS.items()):
        for sex in ('m', 'f'):
            if job == 'Trader' and sex == 'f': continue
            hs = ('pony' if job in ('Guard', 'Police Officer', 'Medic', 'SWAT', 'Cook') else 'long' if job in ('Civilian', 'Farmer') else 'bob') if sex == 'f' else ('spiky' if job in ('Scavenger', 'Raider', 'Mechanic') else 'short')
            fn = f"{job.lower().replace(' ', '_')}_{sex}.png"; allmeta['sheets'][f'{job}|{sex}'] = fn
            if only and job not in only: continue
            rows, meta = figure_frames(o, sex == 'f', hs, 11 + n * 7 + (sex == 'f'))
            sheet(rows).save(os.path.join(OUT, fn))
            allmeta['hand'] = meta['hand']; allmeta['frames'] = meta['frames']; allmeta['wpose'] = meta['wpose']
    if 'hand' in allmeta: json.dump(allmeta, open(os.path.join(OUT, 'meta.json'), 'w'))
    print('wrote', len(allmeta['sheets']), 'sheets to', OUT)

if __name__ == '__main__':
    main()
