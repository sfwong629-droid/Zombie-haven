import json, os, sys
from PIL import Image
ROOT = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
D = os.path.join(ROOT, 'assets', 'characters', 'v6'); M = json.load(open(os.path.join(D, 'meta.json')))
SKINS = [((255, 214, 170), 'light'), ((236, 178, 128), 'tan'), ((196, 132, 88), 'brown'), ((132, 86, 58), 'dark')]
HAIRS = [(74, 48, 30), (36, 30, 30), (226, 178, 84), (178, 72, 42), (230, 230, 220), (120, 80, 50)]
def shade(c, f): return tuple(max(0, min(255, round(v * f))) for v in c)
def recolor(im, skin, hair):
    im = im.copy(); px = im.load(); w, h = im.size
    sk = {(255, 0, 200): shade(skin, 1.08), (230, 0, 180): skin, (200, 0, 160): shade(skin, .86), (170, 0, 140): shade(skin, .72), (255, 0, 120): (240, 120, 120)}
    hr = {(0, 255, 200): shade(hair, 1.3), (0, 220, 170): hair, (0, 185, 140): shade(hair, .78), (0, 150, 115): shade(hair, .6)}
    for y in range(h):
        for x in range(w):
            r, g, b, a = px[x, y]
            if a and (r, g, b) in sk: px[x, y] = sk[(r, g, b)] + (a,)
            elif a and (r, g, b) in hr: px[x, y] = hr[(r, g, b)] + (a,)
    return im
fw, fh = M['fw'], M['fh']
mode = sys.argv[1] if len(sys.argv) > 1 else 'all'
if mode == 'all':
    keys = list(M['sheets']); cols = 6; rows = (len(keys) + cols - 1) // cols
    out = Image.new('RGBA', (cols * fw * 2, rows * fh), (70, 92, 60, 255))
    for i, k in enumerate(keys):
        im = recolor(Image.open(os.path.join(D, M['sheets'][k])), SKINS[i % 4][0], HAIRS[i % 6])
        out.alpha_composite(im.crop((0, 0, fw, fh)), ((i % cols) * fw * 2, (i // cols) * fh)); out.alpha_composite(im.crop((0, fh, fw, fh * 2)), ((i % cols) * fw * 2 + fw, (i // cols) * fh))
    out.resize((out.width * 4, out.height * 4), Image.NEAREST).save(sys.argv[2] if len(sys.argv) > 2 else '/tmp/chars_all.png')
elif mode != 'zoom':
    im = recolor(Image.open(os.path.join(D, M['sheets'][mode])), SKINS[1][0], HAIRS[0])
    out = Image.new('RGBA', im.size, (70, 92, 60, 255)); out.alpha_composite(im)
    out.resize((out.width * 4, out.height * 4), Image.NEAREST).save(sys.argv[2])
if mode == 'zoom':
    keys = sys.argv[3].split(',') if len(sys.argv) > 3 else ['Guard|m', 'Civilian|f', 'Scavenger|m', 'Medic|f', 'Farmer|m', 'Police Officer|m']
    out = Image.new('RGBA', (fw * len(keys), fh * 2), (70, 92, 60, 255))
    for i, k in enumerate(keys):
        im = recolor(Image.open(os.path.join(D, M['sheets'][k])), SKINS[i % 4][0], HAIRS[i % 6]); out.alpha_composite(im.crop((0, 0, fw, fh)), (i * fw, 0)); out.alpha_composite(im.crop((0, fh, fw, fh * 2)), (i * fw, fh))
    out.resize((out.width * 6, out.height * 6), Image.NEAREST).save(sys.argv[2])
