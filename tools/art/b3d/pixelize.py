"""Turn 3D render passes into a pixel-art sprite in an existing sprite's palette.

python3 pixelize.py FLAT.png LIT.png REF_SPRITE.png OUT.png [height=60] [canvas=64]
  FLAT: flat base colours (one colour per material), LIT: white-clay lighting pass, same camera.
  Each sprite pixel takes the majority material of its cell (tiny face features win if present),
  then a light / mid / dark shade from that colour's ramp in the reference sprite's palette.
  A 1-pixel black outline goes around the silhouette.
"""
import colorsys, sys
from collections import Counter
from PIL import Image

LUM = [None]   # shared shade thresholds for every frame of an animation (set from the standing pose)
PRIORITY = {'#1a1310': 3, '#f4efe6': 2, '#3a6a8a': 3, '#5a2a1e': 2, '#4d3930': 2, '#2a1a10': 2, '#3a2516': 2, '#fff8e8': 1, '#e08a72': 1}   # eyes, mouth, brows

def hexrgb(h): return tuple(int(h[i:i + 2], 16) for i in (1, 3, 5))

_PRI = {k: hexrgb(k) for k in PRIORITY}
_canon_cache = {}
def _canon(rgb):
    """Rendered colours come out a shade off; snap anything close to a face-feature colour onto it."""
    if rgb in _canon_cache: return _canon_cache[rgb]
    out = '#%02x%02x%02x' % rgb
    for k, v in _PRI.items():
        if sum((a - b) ** 2 for a, b in zip(rgb, v)) < 150: out = k; break
    _canon_cache[rgb] = out; return out

def palette_of(ref):
    im = ref.convert('RGBA')
    return sorted({p[:3] for p in im.getdata() if p[3] > 200 and sum(p[:3]) > 30})

def ramp(base, pal, n=3):
    """Shades from the sprite palette that share the base colour's hue, darkest to lightest."""
    def chroma(c): t = sum(c) / 3 or 1; return ((c[0] - c[1]) / t, (c[1] - c[2]) / t)
    cb = chroma(base)
    def score(p):   # same colour family: compare the colour's balance, not its brightness
        cp = chroma(p); return (cp[0] - cb[0]) ** 2 + (cp[1] - cb[1]) ** 2
    cands = sorted(pal, key=score)[:6]
    cands = [c for c in cands if score(c) < score(cands[0]) + .05] or cands[:1]
    cands.sort(key=lambda c: sum(c))
    mid = min(cands, key=lambda c: abs(sum(c) - sum(base)))
    i = cands.index(mid)
    dark = cands[i - 1] if i > 0 else tuple(int(c * .72) for c in mid)
    light = cands[i + 1] if i + 1 < len(cands) else mid
    return [dark, mid, light]

def pixelize(flat, lit, pal, height=60, canvas=64, outline=(0, 0, 0), ref_bb=None):
    """ref_bb: bounding box of the standing pose. Given it, every frame uses the same scale and the
    same foot position, so animations (raised weapons, strides) stay steady instead of re-fitting."""
    from PIL import ImageFilter
    flat = flat.convert('RGBA'); lit = lit.convert('L')
    rb = ref_bb or flat.getbbox(); k = (rb[3] - rb[1]) / height
    lit = lit.filter(ImageFilter.GaussianBlur(k * .9))   # broad light shapes, no speckle
    cx = (rb[0] + rb[2]) / 2; bottom = rb[3] + 2 * k
    box = (int(cx - canvas * k / 2), int(bottom - canvas * k), int(cx + canvas * k / 2), int(bottom))
    flat = flat.crop(box); lit = lit.crop(box)
    w = canvas; height = canvas
    out = Image.new('RGBA', (canvas, canvas), (0, 0, 0, 0)); ox, oy = 0, 0
    ramps = {}
    F = flat.load(); L = lit.load()
    # shade thresholds from this character's own lighting: darkest ~30% dark, brightest ~25% light
    vals = sorted(L[xx, yy] for yy in range(0, flat.height, 3) for xx in range(0, flat.width, 3) if F[xx, yy][3] > 128) if not LUM[0] else None
    if LUM[0]: vals = LUM[0]
    lo_t = vals[int(len(vals) * .3)] / 255 if vals else .42; hi_t = vals[int(len(vals) * .75)] / 255 if vals else .68
    mat = {}
    for y in range(height):
        for x in range(w):
            x0, x1 = int(x * k), max(int(x * k) + 1, int((x + 1) * k)); y0, y1 = int(y * k), max(int(y * k) + 1, int((y + 1) * k))
            cnt = Counter(); lum = {}; n = 0
            for yy in range(y0, min(y1, flat.height)):
                for xx in range(x0, min(x1, flat.width)):
                    r, g, b, a = F[xx, yy]; n += 1
                    if a < 128: cnt[None] += 1; continue
                    c = _canon((r, g, b)); cnt[c] += 1; lum.setdefault(c, []).append(L[xx, yy])
            if not n or cnt[None] > n * .55: continue
            pick = None
            for c, m in cnt.items():   # small face features survive the shrink
                if c in PRIORITY and m >= n * .06 and (pick is None or PRIORITY[c] > PRIORITY.get(pick, 0)): pick = c
            if pick is None: pick = max((c for c in cnt if c), key=lambda c: cnt[c])
            base = hexrgb(pick)
            if pick in PRIORITY and pick != '#4d3930':
                col = min(pal, key=lambda p: sum((p[i] - base[i]) ** 2 for i in range(3)))
            else:
                if pick not in ramps: ramps[pick] = ramp(base, pal)
                v = sum(lum[pick]) / len(lum[pick]) / 255
                col = ramps[pick][0 if v < lo_t else 1 if v < hi_t else 2]
            out.putpixel((ox + x, oy + y), col + (255,)); mat[(ox + x, oy + y)] = pick
    # dark seams where two parts meet (arm against body, shirt against overalls), like hand-drawn sprites
    for (x, y), m in list(mat.items()):
        if m in PRIORITY: continue
        for dx, dy in ((1, 0), (0, 1)):
            n = mat.get((x + dx, y + dy))
            if n and n != m and n not in PRIORITY and abs(sum(hexrgb(m)) - sum(hexrgb(n))) > 60:
                a_, b_ = hexrgb(m), hexrgb(n)
                if sum(a_) > sum(b_): continue   # the darker part draws the seam
                r = ramps.get(m) or ramp(a_, pal); d = r[0]
                out.putpixel((x, y), tuple(int(c * .7) for c in d) + (255,)); break
    src = out.copy()
    for y in range(canvas):
        for x in range(canvas):
            if src.getpixel((x, y))[3]: continue
            if any(0 <= x + dx < canvas and 0 <= y + dy < canvas and src.getpixel((x + dx, y + dy))[3]
                   for dx, dy in ((1, 0), (-1, 0), (0, 1), (0, -1))):
                out.putpixel((x, y), outline + (255,))
    return out

if __name__ == '__main__':
    args = [a for a in sys.argv[1:] if '=' not in a]
    kw = dict(a.split('=') for a in sys.argv[1:] if '=' in a)
    pal = palette_of(Image.open(args[2]))
    pixelize(Image.open(args[0]), Image.open(args[1]), pal, int(kw.get('height', 60)), int(kw.get('canvas', 64))).save(args[3])
