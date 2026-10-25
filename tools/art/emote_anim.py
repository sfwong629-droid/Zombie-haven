#!/usr/bin/env python3
"""Cut ChatGPT's emote sheet (read at its own pixel grid) into 13 bubbles and animate what is INSIDE each bubble; the bubble
itself never moves. Every change is whole pixels from the drawing itself (nothing rescaled):
  happy: the sparkles twinkle in turn and the face's shine glints   sad: drops fall from the tear
  angry: the steam puffs billow up                                   tired: the big Z appears, then the small z, then both stay
  idea: the bulb starts dark (no rays), flickers, then lights up     question: the ? swings in from an angle and settles upright
  the others: the icon bobs, shakes or wobbles inside the bubble.
    python3 tools/art/emote_anim.py <read.png> <out_dir>  -> emotes.png (one row of 8 frames per emote), emotes.json"""
import sys, json, os, math
from collections import deque, Counter
from PIL import Image

NAMES = ['happy', 'sad', 'angry', 'scared', 'love', 'hungry', 'thirsty', 'tired', 'hurt', 'sick', 'alert', 'idea', 'question']
N = 8
MOVES = {   # icons that just move inside the bubble: per frame (dx, dy)
    'scared':   [(1, 0), (-1, 0), (1, 0), (-1, 0), (1, 0), (-1, 0), (1, 0), (-1, 0)],
    'love':     [(0, 0), (0, -2), (0, 0), (0, -1), (0, 0), (0, 0), (0, 0), (0, 0)],
    'hungry':   [(0, 0), (1, 0), (1, -1), (0, 0), (0, 0), (-1, 0), (-1, -1), (0, 0)],
    'thirsty':  [(0, 0), (0, -1), (0, -1), (0, 0), (0, 1), (0, 1), (0, 0), (0, 0)],
    'hurt':     [(0, 0), (0, -1), (0, 0), (0, 0), (0, -1), (0, 0), (0, 0), (0, 0)],
    'sick':     [(0, 0), (0, 0), (1, 0), (1, 0), (0, 0), (0, 0), (-1, 0), (-1, 0)],
    'alert':    [(0, -2), (0, 0), (-1, 0), (1, 0), (-1, 0), (1, 0), (0, 0), (0, 0)],
}

def cells(im):
    p = im.load(); W, H = im.size; seen = set(); out = []
    for y in range(H):
        for x in range(W):
            if p[x, y][3] and (x, y) not in seen:
                q = deque([(x, y)]); seen.add((x, y)); pts = []
                while q:
                    a, b = q.popleft(); pts.append((a, b))
                    for dx in (-1, 0, 1):
                        for dy in (-1, 0, 1):
                            n = (a + dx, b + dy)
                            if 0 <= n[0] < W and 0 <= n[1] < H and p[n][3] and n not in seen: seen.add(n); q.append(n)
                if len(pts) > 200:
                    xs = [a for a, _ in pts]; ys = [b for _, b in pts]; out.append((min(xs), min(ys), max(xs) + 1, max(ys) + 1))
    out.sort(key=lambda b: (b[1] // 20, b[0]))
    return [im.crop(b) for b in out]

class Cell:
    def __init__(self, c):
        self.c = c; p = c.load(); W, H = c.size; self.W, self.H = W, H
        dark = lambda q: q[3] and max(q[:3]) < 70
        rows = [y for y in range(H) if sum(dark(p[x, y]) for x in range(W)) > W * .6]
        self.top, self.bot = rows[0], rows[-1]
        self.inside = lambda x, y: 2 <= x <= W - 3 and self.top + 2 <= y <= self.bot - 2
        self.fill = Counter(p[x, y] for x in (3, 4, 5, W - 4, W - 5) for y in range(8, self.bot - 6) if p[x, y][3] and not dark(p[x, y])).most_common(1)[0][0]
        # the drawing inside the bubble = groups of non-fill pixels that do not touch the bubble's edge (its rounded corners
        # and outline bits are left alone, so nothing of the bubble ever moves or disappears)
        p = c.load(); todo = {(x, y) for x in range(W) for y in range(H) if self.inside(x, y) and self.differs(p[x, y])}
        edge = lambda x, y: x <= 2 or x >= W - 3 or y <= self.top + 2 or y >= self.bot - 2
        self.art = set()
        while todo:
            s = todo.pop(); grp = [s]; q = [s]
            while q:
                a, b = q.pop()
                for dx in (-1, 0, 1):
                    for dy in (-1, 0, 1):
                        n = (a + dx, b + dy)
                        if n in todo: todo.discard(n); grp.append(n); q.append(n)
            if not any(edge(x, y) and max(p[x, y][:3]) < 90 for x, y in grp) or len(grp) > 30: self.art.update(grp)
        # clean the bubble: stray specks inside it (from reading ChatGPT's image) become fill; the rounded corners stay
        corner = lambda x, y: (x <= 4 or x >= W - 5) and (y <= self.top + 4 or y >= self.bot - 4)
        for x in range(W):
            for y in range(H):
                if self.inside(x, y) and (x, y) not in self.art and not corner(x, y): p[x, y] = self.fill
    def differs(self, q): return q[3] and sum(abs(q[i] - self.fill[i]) for i in range(3)) > 40
    def pick(self, box, test=None):   # pixels of one element: inside box, part of the drawing (not bubble fill or bubble edge)
        p = self.c.load(); x0, y0, x1, y1 = box
        return {(x, y): p[x, y] for x in range(x0, x1 + 1) for y in range(y0, y1 + 1)
                if (x, y) in self.art and (test is None or test(x, y, p[x, y]))}
    def frame(self, erase=(), draw=()):
        o = self.c.copy(); op = o.load()
        for px in erase:
            for xy in px: op[xy] = self.fill
        for px, dx, dy in draw:
            for (x, y), col in px.items():
                if self.inside(x + dx, y + dy): op[x + dx, y + dy] = col
        return o

def happy(C):
    face = lambda x, y, q: (x - 19.5) ** 2 + (y - 17) ** 2 > 12.5 ** 2   # sparkles sit outside the face disc
    sp = [C.pick((2, 2, 13, 14), face), C.pick((27, 4, 35, 15), face), C.pick((2, 19, 11, 28), face)]
    shine = C.pick((11, 8, 16, 13), lambda x, y, q: min(q[:3]) > 220)
    face_col = C.c.load()[18, 18]
    on = [[1, 1, 1, 0, 0, 0, 1, 1], [0, 0, 1, 1, 1, 1, 0, 0], [1, 0, 0, 0, 1, 1, 1, 0]]
    out = []
    for f in range(N):
        o = C.frame(erase=[s for s, o_ in zip(sp, on) if not o_[f]]); op = o.load()
        if f in (4, 5):
            for xy in shine: op[xy] = face_col   # the shine glints off for a moment
        out.append(o)
    return out

def sad(C):
    tear = C.pick((22, 15, 31, 26), lambda x, y, q: q[2] > q[0] + 60)
    bx = max(x for x, _ in tear); by = max(y for _, y in tear); cx = round(sum(x for x, _ in tear) / len(tear))
    DROP = {(cx, 0): (40, 170, 250, 255), (cx + 1, 0): (20, 120, 230, 255), (cx, 1): (20, 120, 230, 255), (cx + 1, 1): (10, 70, 170, 255)}
    out = []
    for f in range(N):
        o = C.frame(); op = o.load(); k = f - 2
        if 0 <= k <= 3:
            for (x, y), col in DROP.items():
                X, Y = x, by + 1 + k * 2 + y
                if C.inside(X, Y): op[X, Y] = col
        out.append(o)
    return out

def angry(C):
    puffs = [C.pick((2, 3, 13, 14), lambda x, y, q: min(q[:3]) > 200 or max(q[:3]) < 70 and (x < 9 or y < 9)),
             C.pick((24, 3, 35, 13), lambda x, y, q: min(q[:3]) > 200 or max(q[:3]) < 70 and (x > 28 or y < 9))]
    rise = [0, 1, 2, 2, 1, 0, 0, 0]; side = [0, 0, 1, 1, 1, 0, 0, 0]
    out = []
    for f in range(N):
        draws = []
        for i, pf in enumerate(puffs):
            sx = -side[f] if i == 0 else side[f]
            for k in range(1, rise[f] + 1): draws.append(({xy: c for xy, c in pf.items()}, sx * (k > 1), -k))
        out.append(C.frame(draw=draws + [(pf, 0, 0) for pf in puffs]))
    return out

def tired(C):
    big = C.pick((4, 3, 23, 26)); small = C.pick((23, 12, 34, 26))
    show = [('none',), ('big',), ('big',), ('big', 'small'), ('big', 'small'), ('big', 'small'), ('big', 'small'), ('none',)]   # what is shown in each frame
    return [C.frame(erase=[e for e, n in ((big, 'big'), (small, 'small')) if n not in s]) for s in show]

def idea(C):
    p = C.c.load()
    rays = [C.pick(b) for b in ((15, 1, 20, 5), (5, 4, 11, 10), (24, 4, 31, 10), (2, 11, 8, 16), (27, 11, 34, 16), (5, 19, 12, 25), (24, 19, 31, 25))]
    ray_px = set().union(*rays)
    bulb = C.pick((10, 6, 26, 26), lambda x, y, q: q[0] > 180 and q[1] > 120 and q[2] < 200 and (x, y) not in ray_px)
    def dim(col, k):   # k = 0 dark .. 1 lit
        r, g, b, a = col; l = .3 * r + .6 * g + .1 * b; d = (l * .42, l * .42, l * .40)
        return (round(d[0] + (r - d[0]) * k), round(d[1] + (g - d[1]) * k), round(d[2] + (b - d[2]) * k), a)
    level = [0, 0, 0, .55, 0, 1, 1, 1]; rays_on = [0, 0, 0, 0, 0, 1, 1, 1]
    out = []
    for f in range(N):
        o = C.frame(erase=[] if rays_on[f] else rays); op = o.load()
        if level[f] < 1:
            for xy, col in bulb.items(): op[xy] = dim(col, level[f])
        out.append(o)
    return out

def question(C):
    q = C.pick((9, 2, 28, 27)); xs = [x for x, _ in q]; ys = [y for _, y in q]
    x0, y0 = min(xs), min(ys); w, h = max(xs) - x0 + 1, max(ys) - y0 + 1
    g = Image.new('RGBA', (w, h), (0, 0, 0, 0)); gp = g.load()
    for (x, y), col in q.items(): gp[x - x0, y - y0] = col
    ang = [32, 22, 12, 4, -3, 0, 0, 0]; px, py = w / 2, h - 2   # swings in around the dot at its foot
    out = []
    for f in range(N):
        o = C.frame(erase=[q]); op = o.load(); a = math.radians(ang[f]); ca, sa = math.cos(a), math.sin(a)
        for y in range(-4, h + 4):
            for x in range(-6, w + 6):   # inverse mapping, nearest neighbour: whole pixels only
                ux, uy = x - px, y - py; sx = round(ca * ux + sa * uy + px); sy = round(-sa * ux + ca * uy + py)
                if 0 <= sx < w and 0 <= sy < h and gp[sx, sy][3] and C.inside(x + x0, y + y0): op[x + x0, y + y0] = gp[sx, sy]
        out.append(o)
    return out

def mover(C, moves):
    p = C.c.load(); icon = {xy: p[xy] for xy in C.art}
    return [C.frame(erase=[icon], draw=[(icon, dx, dy)]) for dx, dy in moves]

SPECIAL = {'happy': happy, 'sad': sad, 'angry': angry, 'tired': tired, 'idea': idea, 'question': question}

if __name__ == '__main__':
    src, out = sys.argv[1], sys.argv[2]
    im = Image.open(src).convert('RGBA'); cs = cells(im); assert len(cs) == 13, len(cs)
    cw = max(c.width for c in cs); ch = max(c.height for c in cs)
    sheet = Image.new('RGBA', (cw * N, ch * len(cs)), (0, 0, 0, 0))
    for i, (name, c) in enumerate(zip(NAMES, cs)):
        C = Cell(c); fr = SPECIAL[name](C) if name in SPECIAL else mover(C, MOVES[name])
        for f, im2 in enumerate(fr): sheet.alpha_composite(im2, (f * cw + (cw - c.width) // 2, i * ch + ch - c.height))
    os.makedirs(out, exist_ok=True); sheet.save(os.path.join(out, 'emotes.png'))
    json.dump({'cell': [cw, ch], 'frames': N, 'ms': 140, 'names': NAMES}, open(os.path.join(out, 'emotes.json'), 'w'), indent=1)
    print('cells', len(cs), cw, ch)
