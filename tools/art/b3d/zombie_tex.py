"""Zombie skins from the survivor texture: grey-green bruised skin, dirty torn clothes in four colourways, blood on
clothes and skin, duller hair. The input is the 'zombie' face texture written by export3d.py (milky eyes, scowl;
see facepaint.py), so the face needs no work here.

  python3 zombie_tex.py IN.webp OUT_STEM        -> OUT_STEM_0.webp .. OUT_STEM_3.webp
"""
import sys
import numpy as np
from PIL import Image
from scipy import ndimage

VARIANTS = [   # name, shirt colour, pants colour, skin, blood amount
    ('grey_green', (176, 170, 150), (40, 48, 58), (138, 160, 122), .22),
    ('flannel', (150, 62, 52), (52, 58, 62), (150, 162, 140), .18),
    ('faded_blue', (110, 128, 150), (70, 60, 48), (128, 150, 118), .26),
    ('tan', (170, 150, 112), (36, 42, 52), (160, 168, 150), .30)]

def main(src, stem):
    a = np.asarray(Image.open(src).convert('RGB')).astype(float); H, W, _ = a.shape
    r, g, b = a[..., 0], a[..., 1], a[..., 2]; mx = a.max(2)
    eye = ndimage.binary_dilation(np.abs(a - [226, 224, 196]).sum(2) < 40, iterations=2)
    shirt = (r > 200) & (g > 200) & (b > 200) & ~eye
    pants = (b > r + 25) & (b > g + 10) & (mx < 150)
    skin = (r > 190) & (g > 140) & (b > 110) & (r - b > 50)
    hair = (mx < 80) & (r > b + 8) & ~eye
    lum = a.mean(2) / 255
    def noise(frac, seed):          # smooth value noise, cell size = frac of the texture width
        sc = max(2, int(W * frac)); n = np.random.default_rng(seed).random((H // sc + 2, W // sc + 2))
        return np.asarray(Image.fromarray((n * 255).astype(np.uint8)).resize((W + 2 * sc, H + 2 * sc), Image.BICUBIC)).astype(float)[:H, :W] / 255
    fbm = lambda seed: .5 * noise(1 / 16, seed) + .3 * noise(1 / 42, seed + 1) + .2 * noise(1 / 128, seed + 2)
    for vi, (name, shc, pac, skc, blood) in enumerate(VARIANTS):
        out = a.copy(); f1, f2, f3 = fbm(10 + vi * 7), fbm(40 + vi * 7), fbm(80 + vi * 7)
        sk = np.array(skc)[None, None] * (lum / lum[skin].mean())[..., None] * (.85 + .3 * f1[..., None])
        sk = sk * (1 - .25 * (f2 > .62)[..., None]); out[skin] = sk[skin]                      # grey-green, bruised
        shs = np.array(shc)[None, None] * (lum / max(1e-3, lum[shirt].mean()))[..., None] * (.78 + .35 * f1[..., None])
        out[shirt] = shs[shirt]; tear = shirt & (f3 > .7); out[tear] = out[tear] * .35          # dirty, torn
        pas = np.array(pac)[None, None] * (.75 + .5 * f2[..., None]) * (lum / max(1e-3, lum[pants].mean()))[..., None] ** .4
        out[pants] = pas[pants]
        bl = (f2 > 1 - blood) | ((f1 * f3) > .42 - blood * .5)
        bm = bl & (shirt | pants); out[bm] = out[bm] * .25 + np.array([110, 18, 16]) * .75 * (.8 + .4 * f3[bm][:, None])
        bs = bl & skin & (f1 > .66); out[bs] = out[bs] * .4 + np.array([120, 26, 22]) * .6
        out[hair] = out[hair] * .7 + np.array([70, 66, 60]) * .3
        Image.fromarray(np.clip(out, 0, 255).astype(np.uint8)).save(f'{stem}_{vi}.webp', quality=88)
        print('wrote', f'{stem}_{vi}.webp', name)

if __name__ == '__main__':
    main(sys.argv[1], sys.argv[2])
