#!/usr/bin/env python3
"""Cut ChatGPT's emote sheet (read at its own pixel grid) into 13 bubbles and give each a small looping animation:
the icon inside the bubble moves by whole pixels (bob, shake, wobble, pulse, float, drip); the bubble stays still.
    python3 tools/art/emote_anim.py <read.png> <out_dir>  -> emotes.png (13 strips stacked, 8 frames each), emotes.json, emotes.gif"""
import sys, json, os
from collections import deque, Counter
from PIL import Image

NAMES = ['happy', 'sad', 'angry', 'scared', 'love', 'hungry', 'thirsty', 'tired', 'hurt', 'sick', 'alert', 'idea', 'question']
N = 8
MOVES = {   # per frame (dx, dy) of the icon
    'happy':    [(0, 0), (0, -1), (0, -2), (0, -1), (0, 0), (0, -1), (0, -2), (0, -1)],
    'sad':      [(0, 0), (0, 0), (0, 1), (0, 1), (0, 1), (0, 1), (0, 0), (0, 0)],
    'angry':    [(-1, 0), (1, 0), (-1, 0), (1, 0), (0, 0), (0, 0), (0, 0), (0, 0)],
    'scared':   [(1, 0), (-1, 0), (1, 0), (-1, 0), (1, 0), (-1, 0), (1, 0), (-1, 0)],
    'love':     [(0, 0), (0, -2), (0, 0), (0, -1), (0, 0), (0, 0), (0, 0), (0, 0)],
    'hungry':   [(0, 0), (1, 0), (1, -1), (0, 0), (0, 0), (-1, 0), (-1, -1), (0, 0)],
    'thirsty':  [(0, 0), (0, -1), (0, -1), (0, 0), (0, 1), (0, 1), (0, 0), (0, 0)],
    'tired':    [(0, 0), (0, 0), (0, -1), (0, -1), (0, -2), (0, -2), (0, -1), (0, -1)],
    'hurt':     [(0, 0), (0, -1), (0, 0), (0, 0), (0, -1), (0, 0), (0, 0), (0, 0)],
    'sick':     [(0, 0), (0, 0), (1, 0), (1, 0), (0, 0), (0, 0), (-1, 0), (-1, 0)],
    'alert':    [(0, -2), (0, 0), (-1, 0), (1, 0), (-1, 0), (1, 0), (0, 0), (0, 0)],
    'idea':     [(0, 0), (0, -1), (0, -1), (0, 0), (0, 0), (0, -1), (0, -1), (0, 0)],
    'question': [(0, 0), (1, 0), (1, 0), (0, 0), (0, 0), (-1, 0), (-1, 0), (0, 0)],
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

def animate(c, moves):
    p = c.load(); W, H = c.size
    dark = lambda q: q[3] and max(q[:3]) < 70
    # bubble box: rows/cols of the outline; the box bottom is the last row that is mostly dark
    rows = [y for y in range(H) if sum(dark(p[x, y]) for x in range(W)) > W * .6]
    top, bot = rows[0], rows[-1]
    cols = [x for x in range(W) if sum(dark(p[x, y]) for y in range(top, bot + 1)) > (bot - top) * .6]
    left, right = cols[0], cols[-1]
    inner = [(x, y) for x in range(left + 2, right - 1) for y in range(top + 2, bot - 1)]
    fill = Counter(p[x, y] for (x, y) in inner).most_common(1)[0][0]
    def differs(q): return q[3] and sum(abs(q[i] - fill[i]) for i in range(3)) > 40
    icon = {(x, y): p[x, y] for (x, y) in inner if differs(p[x, y])}
    frames = []
    for dx, dy in moves:
        o = c.copy(); op = o.load()
        for (x, y) in icon: op[x, y] = fill
        for (x, y), col in icon.items():
            X, Y = x + dx, y + dy
            if left + 2 <= X < right - 1 and top + 2 <= Y < bot - 1: op[X, Y] = col
        frames.append(o)
    return frames

if __name__ == '__main__':
    src, out = sys.argv[1], sys.argv[2]
    im = Image.open(src).convert('RGBA'); cs = cells(im); assert len(cs) == 13, len(cs)
    cw = max(c.width for c in cs); ch = max(c.height for c in cs)
    sheet = Image.new('RGBA', (cw * N, ch * len(cs)), (0, 0, 0, 0)); allf = []
    for i, (name, c) in enumerate(zip(NAMES, cs)):
        fr = animate(c, MOVES[name]); allf.append(fr)
        for f, im2 in enumerate(fr): sheet.alpha_composite(im2, (f * cw + (cw - c.width) // 2, i * ch + ch - c.height))
    os.makedirs(out, exist_ok=True); sheet.save(os.path.join(out, 'emotes.png'))
    json.dump({'cell': [cw, ch], 'frames': N, 'ms': 120, 'names': NAMES, 'tail_x': cw // 2}, open(os.path.join(out, 'emotes.json'), 'w'), indent=1)
    print('cells', len(cs), cw, ch)
