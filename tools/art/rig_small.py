#!/usr/bin/env python3
"""Small-character rig: make every animation from TWO still poses (3/4 front facing down-right, 3/4 back facing up-right).

    python3 tools/art/rig_small.py farm_m            # test: GIF previews in the scratch folder given by --out

Each character is drawn on the same 32 x 32 template (30 px tall, feet on row 30), so one body layout fits all:
legs below LEG, the front arm in columns >= ARM_X from SHOULDER_Y down, the back arm in columns <= BACK_X.
Animation is code: legs take turns, the body bobs, arms rotate about the shoulder, the whole sprite leans,
lunges, hops and tips over. Nothing is redrawn by AI, so every profession moves the same way.
"""
import os, sys
from PIL import Image, ImageSequence, ImageDraw

ROOT = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
C = 48                     # output cell (room for hops and swings), feet on row FEET
FEET = 42
OX, OY = (C - 32) // 2, FEET - 30   # where the 32 x 32 template goes in the cell

# body layout of the template, per view (front = facing down-right, back = facing up-right)
LAYOUT = {
    # R_X / RPIV: arm on the right of the image (columns >= R_X), L_X / LPIV: arm on the left (columns <= L_X).
    # FACE -1 = the pose faces left (down-left front, up-left back); the game mirrors it for the right-facing directions.
    'front': dict(LEG=24, SPLIT=16, R_X=20, RPIV=(20, 15), L_X=11, LPIV=(11, 16), EYES=[(15, 10), (20, 10)], FACE=-1),
    'back':  dict(LEG=24, SPLIT=15, R_X=20, RPIV=(20, 15), L_X=11, LPIV=(11, 16), EYES=[], FACE=-1),
}
K = (0, 0, 0, 255)

def views(tag):
    if tag == 'farm_m':
        fr = [f.convert('RGBA') for f in ImageSequence.Iterator(Image.open(os.path.join(ROOT, 'tools/art/sources/small/farm_m_8dir.gif')))]
        return {'front': fr[1], 'back': fr[3]}
    d = os.path.join(ROOT, 'tools/art/sources/small')
    return {'front': Image.open(f'{d}/{tag}_front_32.png').convert('RGBA'), 'back': Image.open(f'{d}/{tag}_back_32.png').convert('RGBA')}

def parts(im, L):
    """split the still pose into legs (left, right), front arm, back arm and the rest of the body"""
    W, H = im.size; px = im.load()
    mk = lambda: Image.new('RGBA', (W, H), (0, 0, 0, 0))
    body, legL, legR, arm, barm = mk(), mk(), mk(), mk(), mk()
    for y in range(H):
        for x in range(W):
            c = px[x, y]
            if not c[3]: continue
            if y >= L['LEG']: (legL if x < L['SPLIT'] else legR).putpixel((x, y), c)
            elif x >= L['R_X'] and y >= L['RPIV'][1]: (arm if L['FACE'] > 0 else barm).putpixel((x, y), c)
            elif x <= L['L_X'] and y >= L['LPIV'][1]: (barm if L['FACE'] > 0 else arm).putpixel((x, y), c)
            else: body.putpixel((x, y), c)
    return dict(body=body, legL=legL, legR=legR, arm=arm, barm=barm)

def rot(part, pivot, deg):
    return part.rotate(deg, resample=Image.NEAREST, center=pivot) if deg else part

def eyes(im, L, kind):
    """swap the eyes: 'shut' (- -), 'happy' (^ ^), 'hurt' (> <); eyes are 1 px wide, 2 px tall (iris over white)"""
    if not L['EYES'] or kind is None: return im
    im = im.copy(); px = im.load(); skin = px[L['EYES'][0][0] - 1, L['EYES'][0][1] + 2]
    for (x, y) in L['EYES']:
        px[x, y] = skin; px[x, y + 1] = skin
        if kind == 'shut': px[x, y + 1] = K
        elif kind == 'happy': px[x, y] = K
        elif kind == 'hurt': px[x, y] = K; px[x, y + 1] = K
    return im

def piv(L, front):
    right = (L['FACE'] > 0) == front
    return L['RPIV'] if right else L['LPIV']

def pose(P, L, dx=0, dy=0, body_dx=0, body_dy=0, lift=(0, 0), arm=0, barm=0, arm_dy=(0, 0), eye=None, tilt=0, legs_dy=0):
    """assemble one frame in a C x C cell. dx/dy move the whole sprite (lunge/hop); body_* moves the upper body
    over planted legs (bob/lean); lift raises the left/right foot; arm/barm rotate the arms (degrees, + = up/back)."""
    cell = Image.new('RGBA', (32, 40), (0, 0, 0, 0)); Y = 6   # 6 px headroom inside the part canvas
    def put(im, x, y): cell.alpha_composite(im, (x, Y + y))
    put(P['legL'], 0, -lift[0] + legs_dy); put(P['legR'], 0, -lift[1] + legs_dy)
    up = Image.new('RGBA', (32, 32), (0, 0, 0, 0))
    f = L['FACE']   # arm angles are 'toward the facing side' (+ = forward/up); PIL turns counter-clockwise
    bk = rot(P['barm'], piv(L, False), -barm * f)
    if barm <= 100: up.alpha_composite(bk, (0, arm_dy[1]))       # hanging back arm sits behind the body
    up.alpha_composite(eyes(P['body'], L, eye))
    if barm > 100: up.alpha_composite(bk, (0, arm_dy[1]))        # raised back arm shows above the shoulder
    up.alpha_composite(rot(P['arm'], piv(L, True), arm * f), (0, arm_dy[0]))
    put(up, body_dx, body_dy)
    if tilt:
        big = Image.new('RGBA', (64, 64), (0, 0, 0, 0)); big.alpha_composite(cell, (16, 18))
        cell = big.rotate(tilt, resample=Image.NEAREST, center=(32, 18 + Y + 30)); bb = cell.getbbox()
        out = Image.new('RGBA', (C, C), (0, 0, 0, 0))
        if bb: s = cell.crop(bb); out.alpha_composite(s, (C // 2 - s.width // 2 + dx, FEET + 1 - s.height + dy))
        return out
    out = Image.new('RGBA', (C, C), (0, 0, 0, 0)); out.alpha_composite(cell, (OX + dx, OY - Y + dy)); return out

def anims(P, L):
    f = L['FACE']
    return {
        'idle':  [pose(P, L), pose(P, L, body_dy=1)],
        'walk':  [pose(P, L, lift=(2, 0), arm_dy=(1, -1)), pose(P, L, dy=-1), pose(P, L, lift=(0, 2), arm_dy=(-1, 1)), pose(P, L, dy=-1)],
        'swingA': [pose(P, L, body_dx=-f, arm=165), pose(P, L, dx=2 * f, body_dx=f, body_dy=1, arm=70), pose(P, L, dx=f, body_dy=1, arm=30)],
        'gun':   [pose(P, L, arm=90), pose(P, L, body_dx=-f, arm=105)],
        'hurt':  [pose(P, L, dx=-2 * f, body_dx=-f, arm=-35, barm=35, eye='hurt'), pose(P, L, dx=-f, eye='shut')],
        'jump':  [pose(P, L, body_dy=2), pose(P, L, dy=-6, arm=150, barm=150, eye='happy'), pose(P, L, body_dy=2, eye='happy')],
        'collapse': [pose(P, L, body_dy=2, eye='shut'), pose(P, L, tilt=45 * -f, eye='shut'), pose(P, L, tilt=90 * -f, eye='shut')],
        'carry': [pose(P, L, lift=(2, 0), arm=155, barm=155), pose(P, L, dy=-1, arm=155, barm=155),
                  pose(P, L, lift=(0, 2), arm=155, barm=155), pose(P, L, dy=-1, arm=155, barm=155)],
    }

def main(tag, out):
    os.makedirs(out, exist_ok=True); v = views(tag); res = {}
    for name in ('front', 'back'):
        L = LAYOUT[name]; res[name] = anims(parts(v[name], L), L)
    S = 6; pipe = (120, 124, 130, 255)
    for a in res['front']:
        n = len(res['front'][a]); frames = []
        for i in range(n):
            fr = Image.new('RGBA', (2 * C * S, C * S), (205, 205, 200, 255))
            for k, name in enumerate(('front', 'back')):
                cell = res[name][a][i]
                fr.alpha_composite(cell.resize((C * S, C * S), Image.NEAREST), (k * C * S, 0))
            frames.append(fr.convert('RGB'))
        dur = {'walk': 160, 'carry': 180, 'idle': 500, 'collapse': 300}.get(a, 220)
        frames[0].save(os.path.join(out, f'{tag}_{a}.gif'), save_all=True, append_images=frames[1:], duration=dur, loop=0)
    names = list(res['front']); T = 12; S2 = 4; frames = []
    for t in range(T):
        fr = Image.new('RGBA', (len(names) * C * S2, 2 * C * S2), (205, 205, 200, 255))
        for c, a in enumerate(names):
            for k, name in enumerate(('front', 'back')):
                seq = res[name][a]; cell = seq[t % len(seq)]
                fr.alpha_composite(cell.resize((C * S2, C * S2), Image.NEAREST), (c * C * S2, k * C * S2))
        frames.append(fr.convert('RGB'))
    frames[0].save(os.path.join(out, f'{tag}_all.gif'), save_all=True, append_images=frames[1:], duration=220, loop=0)
    # one overview sheet
    names = list(res['front']); W = max(len(res['front'][a]) for a in names)
    sheet = Image.new('RGBA', (W * C, 2 * len(names) * C), (205, 205, 200, 255))
    for r, a in enumerate(names):
        for k, name in enumerate(('front', 'back')):
            for i, cell in enumerate(res[name][a]): sheet.alpha_composite(cell, (i * C, (2 * r + k) * C))
    sheet.resize((sheet.width * 4, sheet.height * 4), Image.NEAREST).save(os.path.join(out, f'{tag}_rig_sheet.png'))
    print('done', tag, names)

if __name__ == '__main__':
    a = sys.argv[1:]; out = a[a.index('--out') + 1] if '--out' in a else 'rig_out'
    main(a[0] if a and not a[0].startswith('--') else 'farm_m', out)
