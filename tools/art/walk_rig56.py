#!/usr/bin/env python3
"""Clean 8-frame walk for the approved 30-px farmer, built only from the sprite's OWN pixels (no AI redraw, no traced
video pixels, so no stray colours). Legs (rows 25-29, split at column 10) slide through a 1-px-each-way stride in even steps,
arms swing opposite the legs, and the body never bobs (a 1-px bob at this size reads as a jump).
    python3 tools/art/walk_rig56.py <out.png>     -> 8 frames of 48 x 48, feet on row 38 (same anchor as walk_se)"""
import sys, os
from PIL import Image
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import guide_2x2

LEG_TOP, SPLIT = 25, 10
ARM_L = (0, 4, 16, 22)    # x0, x1, y0, y1 (inclusive): the arm on the left of the image
ARM_R = (15, 18, 17, 21)
STRIDE = [1, 1, 0, -1, -1, -1, 0, 1]   # left leg (1 px each way: 2 px made the forward leg look like a stilt): +down = forward (toward the viewer); the right leg is half a cycle later

def farmer():
    _, f = guide_2x2.people(); return f.crop(f.getbbox()).convert('RGBA')

def split(f):
    W, H = f.size; px = f.load()
    mk = lambda: Image.new('RGBA', (W, H), (0, 0, 0, 0))
    body, legL, legR, armL, armR = mk(), mk(), mk(), mk(), mk()
    for y in range(H):
        for x in range(W):
            c = px[x, y]
            if not c[3]: continue
            if y >= LEG_TOP: (legL if x < SPLIT else legR).putpixel((x, y), c)
            elif ARM_L[0] <= x <= ARM_L[1] and ARM_L[2] <= y <= ARM_L[3]: armL.putpixel((x, y), c)
            elif ARM_R[0] <= x <= ARM_R[1] and ARM_R[2] <= y <= ARM_R[3]: armR.putpixel((x, y), c)
            else: body.putpixel((x, y), c)
    return body, legL, legR, armL, armR

def leg_at(leg, dy):
    """move a leg down by dy (>0 stretches it: its top row repeats so it stays joined to the shorts) or up (<0: hidden under them)"""
    W, H = leg.size; out = Image.new('RGBA', (W, H + 3), (0, 0, 0, 0)); out.alpha_composite(leg, (0, dy) if dy >= 0 else (0, 0))
    if dy > 0:
        top = leg.crop((0, LEG_TOP, W, LEG_TOP + 1))
        for k in range(dy): out.alpha_composite(top, (0, LEG_TOP + k))
    elif dy < 0:   # lifted foot: shift up, the part above LEG_TOP disappears behind the body
        out = Image.new('RGBA', (W, H + 3), (0, 0, 0, 0)); out.alpha_composite(leg.crop((0, LEG_TOP - dy, W, H)), (0, LEG_TOP))
        out.alpha_composite(leg.crop((0, LEG_TOP, W, LEG_TOP + 1)), (0, LEG_TOP))
    return out

def frames():
    f = farmer(); body, legL, legR, armL, armR = split(f)
    out = []
    for i in range(8):
        l, r = STRIDE[i], STRIDE[(i + 4) % 8]
        sw = lambda s: -1 if s > 0 else 1 if s < 0 else 0
        cell = Image.new('RGBA', (48, 48), (0, 0, 0, 0)); X, Y = 14, 9
        cell.alpha_composite(leg_at(legL, l), (X, Y)); cell.alpha_composite(leg_at(legR, r), (X, Y))
        cell.alpha_composite(body, (X, Y))
        cell.alpha_composite(armL, (X, Y + sw(r))); cell.alpha_composite(armR, (X, Y + sw(l)))   # each arm swings with the OTHER leg
        out.append(cell)
    return out

if __name__ == '__main__':
    fr = frames(); s = Image.new('RGBA', (48 * 8, 48), (0, 0, 0, 0))
    for i, c in enumerate(fr): s.alpha_composite(c, (48 * i, 0))
    s.save(sys.argv[1])
