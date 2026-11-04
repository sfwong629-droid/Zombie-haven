"""Zombie skins for the v2 survivor bodies (Hunyuan models, flat posterised textures).

Classic horror, low detail: grey-green / pale / blue-grey dead skin with dark wounds, shirt dirtied and torn,
blood soaking the shirt and jeans, dull grey-brown hair. Four variants per body.

  python3 zombie_tex_v2.py IN.webp OUT_STEM [female]   -> OUT_STEM_0.webp .. OUT_STEM_3.webp
"""
import sys
import numpy as np
from PIL import Image

VARIANTS = [   # skin, shirt recolour (None = keep, dirtied), jeans tint, blood amount
    ((138, 156, 118), None, (52, 62, 74), .16),
    ((168, 168, 152), (120, 122, 112), (60, 56, 50), .2),
    ((126, 142, 148), (70, 92, 120), (44, 52, 62), .14),
    ((160, 164, 112), (150, 134, 100), (38, 44, 54), .22)]

def masks(a):
    r, g, b = a[..., 0], a[..., 1], a[..., 2]; mx = a.max(2)
    jeans = (b > r + 15) & (b > g - 4)
    shirt = ((g > r + 18) & (g > b + 8)) | ((r > 140) & (b < 95) & (r - b > 95))   # male green / female mustard
    skin = (r > 150) & (b > 80) & (r - b > 45) & (r - b < 115) & ~shirt
    hair = (mx < 72) & ~jeans
    shoes = ~(jeans | shirt | skin | hair)
    return jeans, shirt, skin, hair, shoes

def main(src, stem):
    a = np.asarray(Image.open(src).convert('RGB')).astype(float); H, W, _ = a.shape
    jeans, shirt, skin, hair, shoes = masks(a); lum = a.mean(2) / 255
    def noise(frac, seed):
        sc = max(2, int(W * frac)); n = np.random.default_rng(seed).random((H // sc + 2, W // sc + 2))
        return np.asarray(Image.fromarray((n * 255).astype(np.uint8)).resize((W + 2 * sc, H + 2 * sc), Image.BICUBIC)).astype(float)[:H, :W] / 255
    fbm = lambda seed: .55 * noise(1 / 14, seed) + .3 * noise(1 / 40, seed + 1) + .15 * noise(1 / 110, seed + 2)
    for vi, (skc, shc, jc, blood) in enumerate(VARIANTS):
        out = a.copy(); f1, f2, f3 = fbm(11 + vi * 7), fbm(43 + vi * 7), fbm(87 + vi * 7)
        rel = lambda m: (lum / max(1e-3, lum[m].mean()))[..., None]
        sk = np.array(skc)[None, None] * rel(skin) ** .8 * (.86 + .26 * f1[..., None])
        sk = sk * (1 - .28 * (f2 > .64)[..., None]); out[skin] = sk[skin]                       # dead skin, bruising
        base = np.array(shc)[None, None] if shc else a * .78
        shs = base * (rel(shirt) ** .6 if shc else 1) * (.72 + .36 * f1[..., None]); out[shirt] = shs[shirt]
        tear = shirt & (f3 > .68); out[tear] = out[tear] * .3                                    # torn / dirty
        js = np.array(jc)[None, None] * rel(jeans) ** .5 * (.8 + .4 * f2[..., None]); out[jeans] = js[jeans]
        out[hair] = out[hair] * .35 + np.array([82, 78, 70]) * .65
        out[shoes] = out[shoes] * .7
        # blood: soaked patches on clothes, darker towards the middle
        bl = (f2 > 1 - blood) | ((f1 * f3) > .5 - blood * .4); cl = bl & (shirt | jeans)
        k = np.clip((f2[cl] - (1 - blood)) * 6, 0, 1)[:, None]
        out[cl] = out[cl] * .18 + (np.array([118, 16, 14]) * (1 - .45 * k)) * .82
        # wounds on the skin: red with a near-black centre
        w = skin & (f3 > .7); out[w] = np.array([128, 22, 20]) * (.8 + .3 * f1[w][:, None])
        wc = skin & (f3 > .78); out[wc] = np.array([42, 8, 8])
        Image.fromarray(np.clip(out, 0, 255).astype(np.uint8)).save(f'{stem}_{vi}.webp', quality=90)
        print('wrote', f'{stem}_{vi}.webp')

if __name__ == '__main__':
    main(sys.argv[1], sys.argv[2])
