#!/usr/bin/env python3
"""Assemble game character sheets from the ChatGPT sprite dumps in tools/art/sheets/.

    python3 tools/art/build_chars.py            # every character that has both sheets (<tag>_a and <tag>_b)

Input per character: <tag>_a = 2 rows x 6 (front: idle, walk x4, kneel / back: idle, walk x4, lying)
                     <tag>_b = 1 row x 7 (punch x2, swing raise, swing follow, aim, carry x2), front view.
Output: assets/characters/v7/<tag>.png (row 0 front facing down-left, row 1 back facing up-left) + meta.json
with the same animation table the game used before (idle 2, walk 4, carry 4, collapse 4, punch 3, blunt 3, shoot 3),
per-frame front-hand points (for the weapon overlay) and weapon poses.
Art standard: people 42 px tall, one art pixel = one map pixel (tiles 96 x 48).
"""
import colorsys, json, os, sys, glob
sys.path.insert(0, os.path.dirname(__file__))
from ingest import load_sheet, clean, quantize_set, tidy
from PIL import Image
sys.path.insert(0, os.path.join(os.path.dirname(__file__), '..', 'chars'))
from pix import Cv, rot

ROOT = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
SH = os.path.join(os.path.dirname(__file__), 'sheets'); OUT = os.path.join(ROOT, 'assets', 'characters', 'v7')
FW, FH, FOOT = 64, 60, 56
ANIMS = [('idle', 2), ('walk', 4), ('carry', 4), ('collapse', 4), ('punch', 3), ('blunt', 3), ('shoot', 3)]
WPOSE = ['rest'] * 10 + ['none'] * 4 + ['rest'] * 3 + ['up', 'fwd', 'down', 'aim', 'fire', 'aim']

def despeckle(im, minpx=10):
    """drop tiny islands (slivers of a neighbouring frame left by a cut)"""
    px = im.load(); W, H = im.size; seen = set(); out = im.copy(); op = out.load()
    for y in range(H):
        for x in range(W):
            if px[x, y][3] and (x, y) not in seen:
                comp, st = [], [(x, y)]; seen.add((x, y))
                while st:
                    a, b = st.pop(); comp.append((a, b))
                    for c, d in ((a + 1, b), (a - 1, b), (a, b + 1), (a, b - 1), (a + 1, b + 1), (a - 1, b - 1), (a + 1, b - 1), (a - 1, b + 1)):
                        if 0 <= c < W and 0 <= d < H and (c, d) not in seen and px[c, d][3]: seen.add((c, d)); st.append((c, d))
                if len(comp) < minpx:
                    for a, b in comp: op[a, b] = (0, 0, 0, 0)
    bb = out.getbbox(); return out.crop(bb) if bb else im

def cut_box(f, k):
    """split one fused box into k frames at the emptiest columns near the even divisions"""
    px = f.load(); cols = [sum(1 for y in range(f.height) if px[x, y][3]) for x in range(f.width)]
    cuts, step = [0], f.width / k
    for j in range(1, k):
        lo, hi = int(step * (j - .35)), int(step * (j + .35)); cuts.append(min(range(lo, hi), key=lambda x: cols[x]))
    cuts.append(f.width); parts = []
    for a0, a1 in zip(cuts, cuts[1:]):
        p = f.crop((a0, 0, a1, f.height)); bb = p.getbbox()
        if bb: parts.append(despeckle(p.crop(bb)))
    return parts

def split_wide(frames, want):
    """frames that touched in the source come out as one wide frame: split them at the emptiest column"""
    if len(frames) < want:   # first try one frame width u that explains every box at once
        hs = sorted(f.height for f in frames); mh = hs[len(hs) // 2]
        tall = [f.height >= mh * .8 for f in frames]; fits = []
        for u in range(8, 200):
            n = [max(1, round(f.width / u)) if t else 1 for f, t in zip(frames, tall)]
            if sum(n) == want: fits.append((u, n))
        if fits:
            u, n = fits[len(fits) // 2]; out = []
            for f, k in zip(frames, n): out += cut_box(f, k) if k > 1 else [f]
            if len(out) == want: return out
    while len(frames) < want:
        ws = [f.width for f in frames]; med = sorted(ws)[len(ws) // 2]; hs = sorted(f.height for f in frames); mh = hs[len(hs) // 2]
        if len(frames) <= want // 2: med = min(med, mh * .8)   # too few boxes to trust the median width
        tall = [k for k in range(len(frames)) if frames[k].height >= mh * .8]   # a lone lying frame is wide but short: never split it
        if not tall: break
        i = max(tall, key=lambda k: frames[k].width)
        f = frames[i]
        if f.width < med * 1.5: break
        k = max(2, min(want - len(frames) + 1, round(f.width / med)))   # how many frames are fused in this box
        px = f.load(); cols = [sum(1 for y in range(f.height) if px[x, y][3]) for x in range(f.width)]
        cuts, step = [0], f.width / k
        for j in range(1, k):
            lo, hi = int(step * (j - .35)), int(step * (j + .35)); cuts.append(min(range(lo, hi), key=lambda x: cols[x]))
        cuts.append(f.width); parts = []
        for a0, a1 in zip(cuts, cuts[1:]):
            p = f.crop((a0, 0, a1, f.height)); bb = p.getbbox()
            if bb: parts.append(despeckle(p.crop(bb)))
        frames[i:i + 1] = parts
    return frames

def feet_cx(im):
    px = im.load(); W, H = im.size; xs = [x for y in range(max(0, H - 6), H) for x in range(W) if px[x, y][3]]
    return (min(xs) + max(xs)) / 2 if xs else W / 2

def place(im, lying=False):
    cell = Image.new('RGBA', (FW, FH), (0, 0, 0, 0)); cx = im.width / 2 if lying else feet_cx(im)
    cell.alpha_composite(im, (int(round(FW / 2 - cx)), FOOT - im.height + 1)); return cell

def bob(cell):   # breathing: upper body down 1 px
    px = cell.load(); out = cell.copy(); op = out.load(); ys = [y for y in range(FH) for x in range(FW) if px[x, y][3]]
    top = min(ys); hip = top + int((FOOT - top) * .62)
    for y in range(hip, top, -1):
        for x in range(FW): op[x, y] = px[x, y - 1]
    for x in range(FW): op[x, top] = (0, 0, 0, 0)
    return out

def to_cv(im):
    c = Cv(im.width, im.height); px = im.load()
    for y in range(im.height):
        for x in range(im.width):
            if px[x, y][3]: c.p[y][x] = px[x, y]
    return c

def fall(cell):
    r = rot(to_cv(cell), -50, FW // 2, FOOT - 1).img(); bb = r.getbbox(); out = Image.new('RGBA', (FW, FH), (0, 0, 0, 0))
    if bb: out.alpha_composite(r.crop(bb), (int(FW / 2 - (bb[2] - bb[0]) / 2), FOOT - (bb[3] - bb[1]) + 1))
    return out

def skin_set(idle):
    """skin colours: warm, light pixels in the face band of the idle frame"""
    px = idle.load(); W, H = idle.size; ys = [y for y in range(H) for x in range(W) if px[x, y][3]]; top = min(ys); h = FOOT - top
    s = set()
    for y in range(top + int(h * .22), top + int(h * .42)):
        for x in range(W):
            p = px[x, y]
            if p[3]:
                hh, ss, vv = colorsys.rgb_to_hsv(p[0] / 255, p[1] / 255, p[2] / 255)
                if .02 < hh < .12 and ss > .2 and vv > .45: s.add(p[:3])
    return s

def hand(cell, skin, pose):
    px = cell.load(); pts = [(x, y) for y in range(FH) for x in range(FW) if px[x, y][3] and px[x, y][:3] in skin]
    ys = [y for y in range(FH) for x in range(FW) if px[x, y][3]]; top = min(ys) if ys else 0; h = FOOT - top
    if pose == 'up': cand = [p for p in pts if p[1] < top + h * .3]
    elif pose in ('fwd', 'aim', 'fire'): cand = sorted(pts, key=lambda p: p[0])[:6]
    else: cand = [p for p in pts if top + h * .42 < p[1] < top + h * .85]; cand = sorted(cand, key=lambda p: p[0])[:5]
    if not cand: return {'up': [FW // 2, top + 2], 'fwd': [FW // 2 - 12, top + h // 2]}.get(pose, [FW // 2 - 6, top + int(h * .66)])
    return [round(sum(p[0] for p in cand) / len(cand)), round(sum(p[1] for p in cand) / len(cand))]

def build(tag):
    _, A = load_sheet(os.path.join(SH, tag + '_a.txt')); _, B = load_sheet(os.path.join(SH, tag + '_b.txt'))
    A = split_wide([despeckle(clean(f), 6) for f in A], 12); B = split_wide([despeckle(clean(f), 6) for f in B], 7)
    if len(A) == 11:   # lying frame missing from the source: lay the front idle down
        A.append(A[0].rotate(90, expand=True))
    if len(A) < 12 or len(B) < 7: raise ValueError(f'{tag}: got {len(A)} + {len(B)} frames')
    allf = [tidy(f) for f in quantize_set(A[:12] + B[:7], 40)]; A, B = allf[:12], allf[12:]
    F = [place(f) for f in A[:5]] + [place(A[5])]; Bk = [place(f) for f in A[6:11]]; lying = place(A[11], lying=True)
    Bf = [place(f) for f in B]
    front = [F[0], bob(F[0]), F[1], F[2], F[3], F[4], Bf[5], Bf[6], Bf[5], Bf[6], F[5], F[5], fall(F[0]), lying, Bf[0], Bf[1], Bf[0], Bf[2], Bf[1], Bf[3], Bf[4], Bf[4], Bf[4]]
    back = [Bk[0], bob(Bk[0]), Bk[1], Bk[2], Bk[3], Bk[4], Bk[1], Bk[2], Bk[3], Bk[4], F[5], F[5], fall(F[0]), lying, Bk[0], Bk[1], Bk[0], Bk[0], Bk[1], Bk[2], Bk[0], Bk[0], Bk[0]]
    sheet = Image.new('RGBA', (FW * len(front), FH * 2), (0, 0, 0, 0))
    for i, c in enumerate(front): sheet.alpha_composite(c, (i * FW, 0))
    for i, c in enumerate(back): sheet.alpha_composite(c, (i * FW, FH))
    sk = skin_set(F[0]); hands = [[hand(c, sk, WPOSE[i]) for i, c in enumerate(front)], [hand(c, sk, WPOSE[i] if WPOSE[i] in ('rest', 'none') else 'rest') for i, c in enumerate(back)]]
    return sheet, hands

def main():
    os.makedirs(OUT, exist_ok=True); metap = os.path.join(OUT, 'meta.json')
    meta = json.load(open(metap)) if os.path.exists(metap) else {'fw': FW, 'fh': FH, 'foot': FOOT, 'anims': ANIMS, 'wpose': WPOSE, 'sheets': {}, 'hands': {}}
    k = 0
    for n, (name, cnt) in enumerate(ANIMS): pass
    meta['frames'] = {}
    for name, cnt in ANIMS: meta['frames'][name] = [k, cnt]; k += cnt
    tags = sorted({os.path.basename(p)[:-6] for p in glob.glob(os.path.join(SH, '*_a.txt')) if not os.path.basename(p).startswith('z_')})
    want = sys.argv[1:] or tags
    for tag in want:
        if not os.path.exists(os.path.join(SH, tag + '_b.txt')): print('skip', tag, '(no action sheet yet)'); continue
        try:
            sheet, hands = build(tag); sheet.save(os.path.join(OUT, tag + '.png')); meta['sheets'][tag] = tag + '.png'; meta['hands'][tag] = hands; print('built', tag)
        except Exception as e: print('FAILED', tag, e)
    json.dump(meta, open(metap, 'w'))

if __name__ == '__main__':
    main()
