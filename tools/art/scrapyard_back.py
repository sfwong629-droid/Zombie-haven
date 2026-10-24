#!/usr/bin/env python3
"""Scrapyard back view (180 degrees) built from the front's own pixels: nothing is redrawn at another size.
The 2x1 pad outline is the same on screen after a 180-degree turn, so its edge pixels are reused; every object
moves to its turned ground spot (2*C - g). The fence that stood along the two far sides now stands along the two
near sides: its clean plank columns are repeated along the near edges, bottom-aligned on the pad."""
from PIL import Image, ImageDraw
SRC = 'assets/buildings/t56/scrapyard.png'
f = Image.open(SRC).convert('RGBA'); W, H = f.size; q = f.load()
BLK = (0, 0, 0, 255); T0 = (0, 0, 0, 0)
bot = [max([y for y in range(H) if q[x, y][3]] or [0]) for x in range(W)]   # pad outline (bottom) per column

def dirt(c): r, g, b, a = c; return a and r >= 140 and g >= 100 and 50 <= b <= 100 and r - b >= 55
def yellow(c): r, g, b, a = c; return a and r > 150 and g > 110 and b < 90 and r - b > 100
def tyre(c): r, g, b, a = c; return a and max(r, g, b) < 110 and abs(r - b) < 25
def bluegrey(c): r, g, b, a = c; return a and b > r + 10 and b > 90

def mask_box(x0, y0, x1, y1, test, ring=True):
    m = {(x, y) for x in range(x0, x1 + 1) for y in range(y0, y1 + 1) if test(q[x, y])}
    if ring:   # add the black outline around the object
        m |= {(x + dx, y + dy) for (x, y) in list(m) for dx, dy in ((1, 0), (-1, 0), (0, 1), (0, -1))
              if 0 <= x + dx < W and 0 <= y + dy < H and q[x + dx, y + dy][3] and max(q[x + dx, y + dy][:3]) < 40}
    return m

def poly_mask(pts):
    m = Image.new('L', (W, H), 0); ImageDraw.Draw(m).polygon(pts, fill=255); mp = m.load()
    return {(x, y) for x in range(W) for y in range(H) if mp[x, y] and q[x, y][3]}

o = Image.new('RGBA', (W, H), T0); p = o.load()
def put(m, dx, dy):
    for (x, y) in m:
        X, Y = x + dx, y + dy
        if 0 <= X < W and 0 <= Y < H: p[X, Y] = q[x, y]

# 1. pad: top surface of dirt (texture from bare dirt in the front), near edge + outline copied, far edges outlined
far = lambda x: 53 - x / 2 if x <= 53.5 else 26 + (x - 53.5) / 2          # far pad edges (were under the fence)
tex = [(x, y) for x in range(W) for y in range(H) if dirt(q[x, y]) and y > far(x) + 2]
for x in range(W):
    top = int(far(x) + .5)
    for y in range(top + 1, bot[x] - 1):
        if dirt(q[x, y]) and y > far(x) + 2: p[x, y] = q[x, y]
        else:
            sx, sy = tex[(x * 7 + y * 13) % len(tex)]; p[x, y] = q[sx, sy]
    p[x, top] = BLK
    for y in (bot[x] - 1, bot[x]): p[x, y] = q[x, y]

C = (42.5, 47)
def shift(g): return (round(2 * (C[0] - g[0])), round(2 * (C[1] - g[1])))

# 2. tyre stack (front-left) -> back-right corner (behind the heap and the near fence)
TY = mask_box(17, 44, 36, 63, tyre); put(TY, 42, -19)
# 3. junk heap stays in the middle (it sits on the pad centre)
HEAP = poly_mask([(24, 31), (28, 27), (34, 26), (40, 24), (46, 23), (52, 24), (56, 26), (60, 28), (64, 30), (66, 36),
                  (66, 46), (62, 52), (52, 54), (44, 53), (36, 51), (28, 50), (24, 45)])
def greyish(c): return c[3] and (max(c[:3]) < 60 or (abs(c[0] - c[1]) < 22 and abs(c[1] - c[2]) < 26 and c[0] < 210))
lo = lambda x: 17 - (x - 16) / 2                  # beam's lower edge in the front
up = lambda x: 10 - (x - 17) / 2                  # beam's upper edge
HOOK = {(x, y) for x in range(31, 42) for y in range(int(lo(x)) + 1, 27) if greyish(q[x, y])}
HEAP -= HOOK
put(HEAP, 0, 0)
# 4. crane: the post moves to the near-right corner; the beam slides along its own axis (-u) so it starts at the post's top
POST = {(x, y) for x in range(8, 17) for y in range(12, 52) if q[x, y][3] and not dirt(q[x, y]) and not (x == 16 and y < 14)}
BEAM = {(x, y) for x in range(17, 43) for y in range(int(up(x)) - 2, int(lo(x)) + 2) if 0 <= y < H and q[x, y][3] and (x, y) not in HOOK}
PDX, PDY = shift((12, 51))                         # post: (61, -8)
BDX, BDY = PDX - 26, PDY + 13                      # beam: (35, 5)
put(BEAM, BDX, BDY)
for y in range(int(up(17)) - 1 + BDY, int(lo(17)) + 1 + BDY): p[17 + BDX - 1, y] = BLK   # cap on the beam's free end
put(HOOK, 19, 14)                                  # chain hangs under the beam's free end
put(POST, PDX, PDY)
# 5. car door (back-right) -> near-left, inside the fence
DOOR = set()
for x in range(63, 80):
    ys = [y for y in range(18, 44) if bluegrey(q[x, y])]
    if ys: DOOR |= {(x, y) for y in range(min(ys) - 1, max(ys) + 2) if q[x, y][3] and (bluegrey(q[x, y]) or max(q[x, y][:3]) < 70)}
# the door would stand just behind the near fence, where only a sliver of its top shows: left out

# 6. fence along the two NEAR sides, from clean fence columns of the far sides (bottom-aligned, 15 px tall)
FH = 15
def strip(x):
    g = int(far(x) + .5)                           # where the fence met the dirt
    return [q[x, y] for y in range(g - FH, g)]
LONG = [strip(x) for x in list(range(0, 9)) + list(range(16, 25))]      # far long side: its face is in shade, like the near long side
SHORT = [strip(x) for x in list(range(54, 62)) + list(range(78, 86))]   # far short side: lit face, like the near short side
def fence(xs, cols, slope_end):
    for i, x in enumerate(xs):
        b = bot[x] - 2; s = cols[i % len(cols)]
        for k, c in enumerate(s):
            y = b - FH + 1 + k
            if 0 <= y < H and c[3]: p[x, y] = c
        p[x, b - FH + 1] = BLK                       # clean top outline
xb = min(range(W), key=lambda x: -bot[x])          # bottom corner
fence(range(0, xb + 1), SHORT, 0)
fence(range(xb, W), LONG, 0)
for x in (0, xb, W - 1):                           # end posts and the corner: dark outline
    for y in range(bot[x] - 2 - FH + 1, bot[x] - 1): p[x, y] = BLK if x != xb else p[x, y]
# 1-pixel black outline wherever a coloured pixel meets the background (the heap's cut sides)
add = [(x, y) for x in range(W) for y in range(H) if not p[x, y][3] and any(
    0 <= x + a < W and 0 <= y + b < H and p[x + a, y + b][3] and max(p[x + a, y + b][:3]) > 60 for a, b in ((1, 0), (-1, 0), (0, 1), (0, -1)))]
for xy in add: p[xy] = BLK
o.save('assets/buildings/t56/scrapyard_back.png'); print(o.size)
