#!/usr/bin/env python3
"""Assemble zombie + boss sheets from the ChatGPT sprite dumps in tools/art/sheets/.

    python3 tools/art/build_zombies.py [types]

Input per type: z_<type>_a = 2 rows x 6 (front: idle, walk x4, flinch / back: idle, walk x4, dead face-down)
                z_<type>_b = 1 row x 7 (idle, attack wind-up, strike, follow-through, death stagger, falling, dead)
Boss:           z_boss_a   = same as above but frame 6 of each row is a roar
                z_boss_b   = 1 row x 8 (idle, slam x4, death stagger, falling, dead)
Output: assets/zombies/v7/<type>.png (row 0 front facing down-left, row 1 back facing up-left) + meta.json
in the format the game already reads (fw, fh, foot, h, frames{name: [start, count]}).
"""
import json, os, sys
sys.path.insert(0, os.path.dirname(__file__))
from ingest import load_sheet, clean, quantize_set, tidy
from build_chars import split_wide, feet_cx, despeckle
from PIL import Image

ROOT = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
SH = os.path.join(os.path.dirname(__file__), 'sheets'); OUT = os.path.join(ROOT, 'assets', 'zombies', 'v7')
TYPES = ['walker', 'runner', 'crawler', 'bloated', 'spitter', 'brute', 'boss']

def bob(im):
    out = Image.new('RGBA', im.size, (0, 0, 0, 0)); H = im.height; hip = int(H * .38)
    out.alpha_composite(im.crop((0, 0, im.width, hip)), (0, 1)); out.alpha_composite(im.crop((0, hip, im.width, H)), (0, hip))
    return out

def build(t):
    _, A = load_sheet(os.path.join(SH, f'z_{t}_a.txt')); _, B = load_sheet(os.path.join(SH, f'z_{t}_b.txt'))
    nb = 8 if t == 'boss' else 7
    A = split_wide([despeckle(clean(f), 6) for f in A], 12); B = split_wide([despeckle(clean(f), 6) for f in B], nb)
    if len(A) == 11: A.append(A[0].rotate(90, expand=True))
    k = A[0].height / B[0].height   # the action sheet's first frame is the same idle pose: match its scale to the walk sheet
    if abs(k - 1) > .06: B = [f.resize((max(1, round(f.width * k)), max(1, round(f.height * k))), Image.NEAREST) for f in B]
    if len(A) < 12 or len(B) < nb: raise ValueError(f'{t}: got {len(A)} + {len(B)} frames')
    allf = [tidy(f) for f in quantize_set(A[:12] + B[:nb], 40)]; A, B = allf[:12], allf[12:]
    if t == 'boss':
        names = [('idle', 2), ('walk', 4), ('slam', 4), ('roar', 2), ('death', 4)]
        front = [A[0], bob(A[0]), A[1], A[2], A[3], A[4], B[1], B[2], B[3], B[4], A[5], A[5], B[5], B[6], B[7], B[7]]
        back = [A[6], bob(A[6]), A[7], A[8], A[9], A[10], A[6], A[7], A[6], A[6], A[11], A[11], B[5], B[6], B[7], B[7]]
    else:
        names = [('idle', 2), ('walk', 4), ('attack', 3), ('death', 4)]
        front = [A[0], bob(A[0]), A[1], A[2], A[3], A[4], B[1], B[2], B[3], A[5], B[4], B[5], B[6]]
        back = [A[6], bob(A[6]), A[7], A[8], A[9], A[10], A[7], A[6], A[8], A[5], B[4], B[5], A[11]]
    W = max(f.width for f in front + back); H = max(f.height for f in front + back)
    fw, fh = W + 6 + (W % 2), H + 6; foot = fh - 4
    sheet = Image.new('RGBA', (fw * len(front), fh * 2), (0, 0, 0, 0))
    for row, fr in enumerate((front, back)):
        for i, im in enumerate(fr):
            lying = im.width > im.height * 1.2; cx = im.width / 2 if lying else feet_cx(im)
            sheet.alpha_composite(im, (int(i * fw + round(fw / 2 - cx)), row * fh + foot - im.height + 1))
    frames, k = {}, 0
    for n, c in names: frames[n] = [k, c]; k += c
    return sheet, {'fw': fw, 'fh': fh, 'foot': foot, 'h': A[0].height, 'frames': frames}

def main():
    os.makedirs(OUT, exist_ok=True); mp = os.path.join(OUT, 'meta.json')
    meta = json.load(open(mp)) if os.path.exists(mp) else {}
    for t in sys.argv[1:] or TYPES:
        if not (os.path.exists(os.path.join(SH, f'z_{t}_a.txt')) and os.path.exists(os.path.join(SH, f'z_{t}_b.txt'))): print('skip', t); continue
        try:
            sheet, m = build(t); sheet.save(os.path.join(OUT, t + '.png')); meta[t] = m; print('built', t, m['fw'], m['fh'], 'h', m['h'])
        except Exception as e: print('FAILED', t, e)
    json.dump(meta, open(mp, 'w'))

if __name__ == '__main__':
    main()
