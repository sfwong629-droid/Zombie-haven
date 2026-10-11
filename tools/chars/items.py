#!/usr/bin/env python3
"""Zombie Haven V3 items: DV2-style item icons (18x18) and held-weapon overlays, true pixel art.

    python3 tools/chars/items.py     # assets/items/icons.png, assets/items/held.png, assets/items/items.json

Melee weapons are described along their length (grip -> tip) and drawn only at multiples of 45 degrees, so lines stay clean.
Guns and bows are small hand-placed pixel maps. Held sheet: one row per weapon, columns = poses, each cell HC x HC with the
grip on the cell centre (the game puts that point on the character's hand).
"""
import json, math, os, sys
sys.path.insert(0, os.path.dirname(__file__))
from pix import Cv, ramp, hx, adj, OUTLINE
from PIL import Image

ROOT = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
OUT = os.path.join(ROOT, 'assets', 'items')
IC, HC = 18, 32
POSES = ['rest', 'up', 'fwd', 'down', 'aim', 'fire']
ANG = {'rest': 225, 'up': 90, 'fwd': 180, 'down': 225, 'aim': 180, 'fire': 180}

C = {k: hx(v) for k, v in dict(k='#2b2d33', g='#6e7681', l='#b8c2cc', L='#e8eef2', w='#7a4a24', W='#b47a40', b='#4e3018', y='#e8b84a', r='#c8402e', R='#ff6a4a', s='#efe6c8',
     o='#6f8a3c', O='#4d6428', n='#2a3e66', N='#3f63c9', t='#c9a777', T='#e2c9a0', p='#d06a9a', G='#7fd0ff', e='#3a3a40', c='#cfd8dc', f='#ffd84a', F='#fff3a0', h='#a8b0b8', u='#8b5a3c').items()}

def put_map(cv, rows, x0, y0, flip=False):
    for y, row in enumerate(rows):
        for x, ch in enumerate(row):
            if ch in C: cv.set(x0 + ((len(row) - 1 - x) if flip else x), y0 + y, C[ch], 'm' + ch)

def vec(a): r = math.radians(a); return (round(math.cos(r), 6), -round(math.sin(r), 6))

def seg(cv, gx, gy, a, t0, t1, col, w=1, off=0):
    dx, dy = vec(a); px, py = -dy, dx
    diag = abs(dx) > .1 and abs(dy) > .1; st = 1 / (1.4142 if diag else 1)
    t = t0
    while t <= t1 + 1e-6:
        x = gx + dx * t + px * off; y = gy + dy * t + py * off
        for k in range(w):
            cv.set(round(x + px * k), round(y + py * k), col, 'w')
            if diag and k == 0: pass
        t += st

def melee(cv, kind, gx, gy, a, L):
    """grip at (gx, gy), pointing at angle a, length L"""
    dx, dy = vec(a); px, py = -dy, dx
    P = lambda t, o=0: (round(gx + dx * t + px * o), round(gy + dy * t + py * o))
    def put(t, o, c):
        x, y = P(t, o); cv.set(x, y, c, 'w')
    if kind == 'pipe':
        seg(cv, gx, gy, a, -1, L, C['g'], 2); seg(cv, gx, gy, a, -1, L, C['l'], 1)
    elif kind in ('bat', 'nailbat'):
        seg(cv, gx, gy, a, -1, L * .4, C['w'], 1); seg(cv, gx, gy, a, L * .35, L, C['W'], 2); put(-1, 0, C['b'])
        if kind == 'nailbat':
            for t in (L * .55, L * .72, L * .9): put(t, -1, C['L']); put(t, 2, C['L'])
    elif kind == 'crowbar':
        seg(cv, gx, gy, a, -1, L, C['r'], 1); seg(cv, gx, gy, a, -1, 1, C['k'], 1)
        put(L, 1, C['r']); put(L - 1, 2, C['r'])
    elif kind == 'knife':
        seg(cv, gx, gy, a, -1, L * .35, C['k'], 2); seg(cv, gx, gy, a, L * .35, L, C['l'], 1); seg(cv, gx, gy, a, L * .35, L * .8, C['L'], 1, 1)
    elif kind == 'machete':
        seg(cv, gx, gy, a, -1, L * .3, C['b'], 2); seg(cv, gx, gy, a, L * .3, L, C['l'], 2); seg(cv, gx, gy, a, L * .3, L - 1, C['L'], 1, 1); put(L + .5, 0, C['l'])
    elif kind == 'spear':
        seg(cv, gx, gy, a, -3, L * .75, C['W'], 1); seg(cv, gx, gy, a, L * .75, L, C['l'], 1); put(L * .78, -1, C['l']); put(L * .78, 1, C['l']); put(L * .7, 0, C['r'])
    elif kind == 'axe':
        seg(cv, gx, gy, a, -1, L, C['W'], 1)
        for t in range(int(L * .7), int(L) + 1): put(t, 1, C['r']); put(t, 2, C['r']); put(t, 3, C['L'])
        put(L * .7 - 1, 1, C['k'])
    elif kind == 'sledge':
        seg(cv, gx, gy, a, -1, L, C['W'], 1)
        for t in range(int(L) - 2, int(L) + 2):
            for o in (-2, -1, 0, 1, 2): put(t, o, C['g'] if abs(o) < 2 else C['h'])
    elif kind == 'katana':
        seg(cv, gx, gy, a, -1, L * .28, C['e'], 2)
        for t in range(0, int(L * .28), 2): put(t, 0, C['T'])
        for o in (-1, 0, 1, 2): put(L * .28 + 1, o, C['y'])
        seg(cv, gx, gy, a, L * .3 + 1, L, C['L'], 1); seg(cv, gx, gy, a, L * .3 + 1, L - 1, C['l'], 1, 1)

# ---------------------------------------------------------------- guns and bows: maps pointing RIGHT, grip marked by '+' (not drawn)
GUNS = {
  'pistol':   {'held': ['kkkkkk', 'gggggk', '.+w...', '..w...'],
               'icon': ['..............', '.kkkkkkkkkkk..', '.gllllllllllk.', '.ggggggggggk..', '....wwk.......', '....wwk.......', '...wwwk.......', '...wwk........']},
  'revolver': {'held': ['kgggggg', 'kkgk...', '.+w....', '..w....'],
               'icon': ['.kkkkkkkkkkkkkk.', '.kllllllllllllk.', '.kgggkkggggggk..', '..kggk.........', '...kwwk.........', '...wWwk.........', '..wWwwk.........', '..wwwk..........']},
  'shotgun':  {'held': ['...kkkkkkkkk', 'wwwggggkkkkk', 'ww+.uu......'],
               'icon': ['..................', '.......kkkkkkkkkkk', 'WWw.kkgggggggggggk', 'WWWwwgkuuuuukkkkk.', '.WWww+k...........', '..ww..............']},
  'smg':      {'held': ['kkkkkkkk', '.ekkgkk.', '.+e.e...', '....e...'],
               'icon': ['.................', '..kkkkkkkkkkkkk..', '.kegggggggggggkkk', '.ke+kkeeek.......', '.kk..k.eek.......', '......k.ek.......', '.........k.......']},
  'rifle':    {'held': ['....ekk.......', 'wWWwwggggkkkkk', 'ww+w.........'],
               'icon': ['......eeee........', '.....ekGGke.......', 'WWw..kkkkkk.......', 'WWWwwwwwgggggkkkkk', '.WWwww+w..........', '..ww..............']},
  'assault':  {'held': ['...kkk.......', 'kkkegggkkkkkk', 'k.+e.e.......', '.....e.......'],
               'icon': ['..................', '.....kkkk.........', 'kk..kegggkkkkkkkkk', 'kkkkeeggggggggkk..', 'kk.k+ke.kk........', '.......e.k........', '.......ee.........']},
  'bow':      {'held': ['.Ws', 'W.s', 'W.s', '+.s', 'W.s', 'W.s', '.Ws'],
               'icon': ['....WW......', '...W..s.....', '..W...s.....', '..W....s....', '.W.....s....', '.W.....s....', '.W.....s....', '.W.....s....', '..W....s....', '..W...s.....', '...W..s.....', '....WW......']},
  'crossbow': {'held': ['..W.....', 'wwWwwkkk', '.+W.....', '..W.....'],
               'icon': ['....W.........', '...W.s........', '..W...s.......', 'wwwwwwwkkkkkk.', 'www+ww.s......', '..W...s.......', '...W.s........', '....W.........']},
}
MELEE = {   # kind, held length, icon length
  'pipe': ('pipe', 10, 17), 'knife': ('knife', 6, 12), 'bat': ('bat', 11, 18), 'crowbar': ('crowbar', 10, 17), 'nailbat': ('nailbat', 11, 18),
  'machete': ('machete', 10, 16), 'spear': ('spear', 15, 20), 'axe': ('axe', 11, 17), 'sledge': ('sledge', 12, 17), 'katana': ('katana', 14, 20),
}

def grip_of(rows):
    for y, r in enumerate(rows):
        x = r.find('+')
        if x >= 0: return x, y
    return 0, len(rows) // 2

def held_cell(wid, pose):
    cv = Cv(HC, HC); g = HC // 2
    if wid in MELEE:
        kind, L, _ = MELEE[wid]; melee(cv, kind, g, g, ANG[pose], L)
    else:
        rows = GUNS[wid]['held']; gx, gy = grip_of(rows); w = max(len(r) for r in rows)
        if pose in ('rest', 'up', 'down', 'fwd') and wid not in ('bow',):
            # carried pointing down along the leg: rotate the map 90 degrees clockwise (lossless), grip stays on the hand
            rr = [''.join(rows[len(rows) - 1 - y][x] if x < len(rows[len(rows) - 1 - y]) else '.' for y in range(len(rows))) for x in range(w)]
            rr = [''.join(reversed(r)) for r in rr]
            gx2, gy2 = grip_of(rr); put_map(cv, rr, g - gx2, g - gy2)
        else:
            put_map(cv, rows, g - (w - 1 - gx), g - gy, flip=True)   # pointing left (the character faces left)
            if pose == 'fire' and wid not in ('bow', 'crossbow'):
                tipx = g - (w - 1 - gx) - 1; ty = g - gy
                cv.set(tipx, ty, C['F'], 'fx'); cv.set(tipx - 1, ty, C['f'], 'fx'); cv.set(tipx - 1, ty - 1, C['f'], 'fx'); cv.set(tipx - 1, ty + 1, C['f'], 'fx'); cv.set(tipx - 2, ty, C['R'], 'fx')
    cv.outline()
    if pose == 'fire':   # the flash should glow, not be outlined: redraw it on top
        pass
    return cv

# ---------------------------------------------------------------- armor and accessory icons
def vest(cv, main, trim=None, sleeves=True, studs=False, plates=False, text=None, pads=False, camo=False):
    m = ramp(main)
    if sleeves:
        cv.rect(2, 5, 4, 12, m['sh'], 'sl'); cv.rect(13, 5, 15, 12, m['sh'], 'sl')
    cv.rect(4, 3, 13, 15, m['b'], 'body'); cv.rect(7, 3, 10, 5, None)
    for x in range(7, 11):
        for y in range(3, 6): cv.p[y][x] = None
    cv.set(8, 6, m['dk'], 'nk'); cv.set(9, 6, m['dk'], 'nk')
    cv.shade('body', m); cv.shade('sl', ramp(adj(m['b'], -.05)))
    if trim: cv.rect(8, 6, 9, 15, hx(trim), 'zip')
    if studs:
        for (x, y) in ((5, 5), (12, 5), (5, 9), (12, 9)): cv.set(x, y, C['L'], 'st')
    if plates:
        for y in (7, 11):
            cv.rect(5, y, 12, y, m['dk'], 'pl')
        for (x, y) in ((5, 5), (12, 5), (5, 13), (12, 13), (8, 9)): cv.set(x, y, C['h'], 'rv')
    if pads:
        cv.rect(2, 4, 5, 7, C['L'], 'pd'); cv.rect(12, 4, 15, 7, C['L'], 'pd'); cv.rect(6, 9, 11, 10, hx('#3f63c9'), 'pd')
    if text: cv.rect(5, 9, 12, 10, hx(text), 'tx'); cv.rect(6, 9, 6, 10, C['k'], 'tx'); cv.rect(9, 9, 9, 10, C['k'], 'tx'); cv.rect(11, 9, 11, 10, C['k'], 'tx')
    if camo:
        for (x, y) in ((5, 7), (6, 7), (10, 11), (11, 11), (12, 6), (7, 13), (8, 13), (4, 10)): cv.set(x, y, hx('#3e5222'), 'cm')
        for (x, y) in ((9, 8), (10, 8), (5, 12), (12, 13)): cv.set(x, y, hx('#a08a5a'), 'cm')
        cv.rect(5, 11, 7, 13, hx('#4d6428'), 'pc'); cv.rect(10, 11, 12, 13, hx('#4d6428'), 'pc')

ACC = {
  'gloves':  lambda cv: (cv.rect(3, 5, 8, 13, hx('#b07a44'), 'a'), cv.rect(9, 4, 14, 12, hx('#c98a50'), 'b'), cv.rect(3, 13, 8, 14, hx('#5a3a1e'), 'c'), cv.rect(9, 12, 14, 13, hx('#5a3a1e'), 'c'),
                        [cv.set(x, 4, hx('#b07a44'), 'a') for x in (3, 5, 7)], [cv.set(x, 3, hx('#c98a50'), 'b') for x in (9, 11, 13)]),
  'belt':    lambda cv: (cv.rect(1, 7, 16, 10, hx('#7a4a24'), 'a'), cv.rect(7, 6, 10, 11, C['y'], 'b'), cv.rect(8, 7, 9, 10, hx('#7a4a24'), 'c'), [cv.set(x, 8, hx('#4e3018'), 'd') for x in (3, 5, 13, 15)]),
  'shoes':   lambda cv: (cv.rect(2, 9, 9, 13, hx('#e84a3a'), 'a'), cv.rect(2, 4, 5, 9, hx('#e84a3a'), 'a'), cv.rect(2, 13, 10, 14, C['L'], 'b'), cv.rect(9, 7, 15, 11, hx('#3f63c9'), 'c'), cv.rect(9, 3, 12, 7, hx('#3f63c9'), 'c'), cv.rect(9, 11, 16, 12, C['L'], 'b')),
  'goggles': lambda cv: (cv.rect(1, 8, 16, 9, hx('#3a3a40'), 'a'), cv.ell(5, 9, 3, 3, hx('#5a5a60'), 'b'), cv.ell(12, 9, 3, 3, hx('#5a5a60'), 'b'), cv.ell(5, 9, 2, 2, C['G'], 'g'), cv.ell(12, 9, 2, 2, C['G'], 'g'), cv.set(4, 8, C['L'], 'h'), cv.set(11, 8, C['L'], 'h')),
  'glasses': lambda cv: (cv.rect(3, 7, 7, 11, hx('#2b2d33'), 'a'), cv.rect(10, 7, 14, 11, hx('#2b2d33'), 'a'), cv.rect(4, 8, 6, 10, hx('#bfe6ff'), 'g'), cv.rect(11, 8, 13, 10, hx('#bfe6ff'), 'g'), cv.rect(8, 8, 9, 8, hx('#2b2d33'), 'a'), cv.rect(1, 7, 2, 7, hx('#2b2d33'), 'a'), cv.rect(15, 7, 16, 7, hx('#2b2d33'), 'a')),
  'charm':   lambda cv: (cv.line(9, 1, 9, 6, hx('#c9a777'), 1, 's'), cv.ell(6, 9, 2.5, 2.5, hx('#4fb84a'), 'a'), cv.ell(12, 9, 2.5, 2.5, hx('#4fb84a'), 'a'), cv.ell(9, 6.5, 2.5, 2.5, hx('#4fb84a'), 'a'), cv.ell(9, 11.5, 2.5, 2.5, hx('#4fb84a'), 'a'), cv.line(9, 12, 11, 16, hx('#3a8a36'), 1, 'b'), cv.set(9, 9, hx('#9fe58a'), 'c')),
  'dogtags': lambda cv: (cv.line(2, 2, 8, 9, hx('#8a8f96'), 1, 's'), cv.line(15, 2, 10, 9, hx('#8a8f96'), 1, 's'), cv.rect(5, 9, 10, 15, hx('#c9d1d8'), 'a'), cv.rect(9, 8, 14, 13, hx('#a9b2bc'), 'b'), cv.rect(6, 11, 9, 11, hx('#6e7681'), 'c'), cv.rect(6, 13, 8, 13, hx('#6e7681'), 'c')),
}
ARMOR = {
  'jacket':   lambda cv: vest(cv, '#b8a070', trim='#7a6a4a'),
  'leather':  lambda cv: vest(cv, '#7a4a2a', trim='#c9a777'),
  'hockey':   lambda cv: vest(cv, '#e8eef2', pads=True),
  'biker':    lambda cv: vest(cv, '#3a3a44', studs=True, trim='#a9b2bc'),
  'riot':     lambda cv: vest(cv, '#2a3e66', sleeves=False, text='#e8eef2'),
  'kevlar':   lambda cv: vest(cv, '#4a4f3a', sleeves=False, plates=False, trim='#2b2d33'),
  'military': lambda cv: vest(cv, '#6f8a3c', camo=True),
  'plate':    lambda cv: vest(cv, '#8a939c', sleeves=False, plates=True),
}

def icon(wid):
    cv = Cv(IC, IC)
    if wid in MELEE:
        kind, _, L = MELEE[wid]; melee(cv, kind, 3, 14, 45, L * .72)
    elif wid in GUNS:
        rows = GUNS[wid]['icon']; w = max(len(r) for r in rows); put_map(cv, [r.replace('+', 'w' if 'w' in r else 'k') for r in rows], (IC - w) // 2, (IC - len(rows)) // 2)
    elif wid in ARMOR: ARMOR[wid](cv)
    elif wid in ACC: ACC[wid](cv)
    cv.outline(); return cv

ORDER = list(MELEE) + list(GUNS) + list(ARMOR) + list(ACC)
WEAPONS = list(MELEE) + list(GUNS)

def main():
    os.makedirs(OUT, exist_ok=True)
    ic = Image.new('RGBA', (IC * len(ORDER), IC), (0, 0, 0, 0))
    for i, k in enumerate(ORDER): ic.alpha_composite(icon(k).img(), (i * IC, 0))
    ic.save(os.path.join(OUT, 'icons.png'))
    hd = Image.new('RGBA', (HC * len(POSES), HC * len(WEAPONS)), (0, 0, 0, 0))
    for r, w in enumerate(WEAPONS):
        for c, p in enumerate(POSES): hd.alpha_composite(held_cell(w, p).img(), (c * HC, r * HC))
    hd.save(os.path.join(OUT, 'held.png'))
    json.dump({'ic': IC, 'hc': HC, 'icons': ORDER, 'weapons': WEAPONS, 'poses': POSES}, open(os.path.join(OUT, 'items.json'), 'w'))
    print('icons', len(ORDER), 'held', len(WEAPONS))

if __name__ == '__main__':
    main()
