"""Helpers: decode extracted frames, trim to target height by removing near-duplicate rows, build sheets on a fixed palette."""
import json, base64, io, sys
import numpy as np
from PIL import Image

def decode(parts_list):
    out = []
    for i, parts in enumerate(parts_list):
        u = ''.join(parts) if isinstance(parts, list) else parts
        im = Image.open(io.BytesIO(base64.b64decode(u))); im.load()
        out.append(im.convert('RGBA'))
    return out

def clean(im):
    a = np.array(im).astype(int)
    m = (a[..., 3] > 0) & (a[..., 2] > a[..., 1] + 30) & (a[..., 0] > a[..., 1] + 30) & (a[..., 1] < 90) & (np.abs(a[..., 0] - a[..., 2]) < 70)
    a[m] = 0
    al = a[..., 3] > 0                       # drop isolated pixels (no 4-neighbour)
    nb = np.zeros_like(al)
    nb[1:, :] |= al[:-1, :]; nb[:-1, :] |= al[1:, :]; nb[:, 1:] |= al[:, :-1]; nb[:, :-1] |= al[:, 1:]
    a[al & ~nb] = 0
    from scipy import ndimage                 # drop tiny disconnected specks (< 8 px) left over from frame splits
    lab, n = ndimage.label(a[..., 3] > 0)
    if n > 1:
        sizes = ndimage.sum(np.ones_like(lab), lab, range(1, n + 1))
        for k, sz in enumerate(sizes, 1):
            if sz < 8: a[lab == k] = 0
    im = Image.fromarray(a.astype(np.uint8), 'RGBA')
    return im.crop(im.getbbox())

def shrink(im, target, axis=0):
    a = np.array(im).astype(int)
    while a.shape[axis] > target:
        n = a.shape[axis]
        cost = []
        for y in range(n - 1):
            if axis == 0: c = np.abs(a[y] - a[y + 1]).sum()
            else: c = np.abs(a[:, y] - a[:, y + 1]).sum()
            cost.append(c if 2 <= y < n - 3 else 1e18)
        a = np.delete(a, int(np.argmin(cost)), axis=axis)
    return Image.fromarray(a.astype(np.uint8), 'RGBA')

def build(frames, fw, fh, foot, palette_from=None, maxcol=24):
    sheet = Image.new('RGBA', (fw * len(frames), fh), (0, 0, 0, 0))
    for i, f in enumerate(frames):
        assert f.width <= fw and f.height <= foot + 1, (i, f.size)
        sheet.alpha_composite(f, (i * fw + (fw - f.width) // 2, foot - f.height + 1))
    from collections import Counter
    cols = Counter(p[:3] for p in sheet.getdata() if p[3])
    for thr in range(24, 80, 4):
        keep = list(palette_from or [])
        for c, n in cols.most_common():
            if all(sum((a - b) ** 2 for a, b in zip(c, k)) > thr ** 2 for k in keep): keep.append(c)
        used = {min(keep, key=lambda k: sum((p - q) ** 2 for p, q in zip(c, k))) for c in cols}
        if len(used) <= maxcol: break
    px = sheet.load()
    for y in range(sheet.height):
        for x in range(sheet.width):
            r, g, b, a = px[x, y]
            if a: px[x, y] = (*min(keep, key=lambda k: sum((p - q) ** 2 for p, q in zip((r, g, b), k))), 255)
    return sheet

def preview(sheet, path, k=4):
    bg = Image.new('RGBA', sheet.size, (85, 85, 85, 255)); bg.alpha_composite(sheet)
    bg.resize((sheet.width * k, sheet.height * k), Image.NEAREST).save(path)

def h(s):
    x = 0
    for c in s: x = (x * 31 + ord(c)) & 0xffffffff
    return '%x:%d' % (x, len(s))

def load_checked(fn):
    """Load [{i,hash,parts}] and verify every chunk hash; report bad chunks."""
    data = json.load(open(fn)); bad = []
    for fr in data:
        for k, (p, hh) in enumerate(zip(fr['parts'], fr['hash'])):
            if h(p) != hh: bad.append((fr['i'], k))
        if len(fr['parts']) != len(fr['hash']): bad.append((fr['i'], 'count'))
    if bad: print('BAD CHUNKS', bad); return None
    return decode([fr['parts'] for fr in data])
