# cutloc.py SHEET.png NAME [OUTDIR=.] — split a three-view armour sheet (front, right side, back on one image) into three square PNGs
# at the same scale, named zombie-haven-NAME-1-front.png / -3-right-side.png / -4-back.png (the names the equipment folder uses).
import sys, os, numpy as np
from PIL import Image
im = Image.open(sys.argv[1]).convert('RGB'); out = sys.argv[3] if len(sys.argv) > 3 else '.'; os.makedirs(out, exist_ok=True)
a = np.asarray(im).astype(int); H, W, _ = a.shape; bg = a[10, 3]
col = (np.abs(a - bg).sum(2) > 40).sum(0); on = col > 1; runs = []; s = -1
for x in range(W + 1):
    o = x < W and on[x]
    if o and s < 0: s = x
    if not o and s >= 0: runs.append([s, x - 1]); s = -1
R = [r for r in runs if r[1] - r[0] > 8]
while len(R) > 3:
    i = min(range(len(R) - 1), key=lambda i: R[i + 1][0] - R[i][1]); R[i:i + 2] = [[R[i][0], R[i + 1][1]]]
for (x0, x1), v in zip(R, ['1-front', '3-right-side', '4-back']):
    cx = (x0 + x1) // 2; S = H; o = Image.new('RGB', (S, S), tuple(bg)); a0 = max(0, x0 - 6); a1 = min(W, x1 + 7); o.paste(im.crop((a0, 0, a1, S)), (S // 2 - (cx - a0), 0))
    o = o.resize((887, 887), Image.LANCZOS); p = os.path.join(out, 'zombie-haven-%s-%s.png' % (sys.argv[2], v)); o.save(p); print(p)
