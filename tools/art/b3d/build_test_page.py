"""Build the 'Survivor 3D Test' review page: every sprite of the AI-3D survivors, animated, in four directions,
with weapon swapping and a walk-around in the ink town.

  python3 build_test_page.py SPRITES_DIR OUT.html [--town TOWN.jpg] [--extra name=path ...]
SPRITES_DIR/<weapon>/<clip>_<view>_<i>.png (smooth 128px frames), SPRITES_DIR/anchor.json (ground point).
"""
import base64, glob, io, json, os, re, sys
from PIL import Image

def b64(im, fmt='PNG', **kw):
    buf = io.BytesIO(); im.save(buf, fmt, **kw)
    return f'data:image/{fmt.lower()};base64,' + base64.b64encode(buf.getvalue()).decode()

def strips(root):
    out = {}
    for wdir in sorted(glob.glob(os.path.join(root, '*/'))):
        w = os.path.basename(wdir.rstrip('/')); frames = {}
        for p in glob.glob(os.path.join(wdir, '*.png')):
            m = re.match(r'(walk|chop)_(se|sw|ne|nw)_(\d+)\.png$', os.path.basename(p))
            if m: frames.setdefault((m.group(1), m.group(2)), {})[int(m.group(3))] = p
        if not frames: continue
        out[w] = {}
        for (clip, view), fs in frames.items():
            ims = [Image.open(fs[i]) for i in sorted(fs)]; S = ims[0].width
            st = Image.new('RGBA', (S * len(ims), S))
            for i, im in enumerate(ims): st.paste(im, (i * S, 0))
            out[w].setdefault(clip, {})[view] = {'src': b64(st, optimize=True), 'n': len(ims), 'size': S}
    return out

def build(sprites, out_html, town=None, extras=(), buildings=()):
    data = strips(sprites)
    anchor = json.load(open(os.path.join(sprites, 'anchor.json')))
    S = next(iter(next(iter(data.values())).values()))['se']['size']
    town_src = None
    if town:
        t = Image.open(town).convert('RGB').crop((300, 200, 840, 605))
        t = t.resize((t.width * 2, t.height * 2), Image.LANCZOS)
        town_src = b64(t, 'JPEG', quality=86)
    ex = []
    for name, path in extras:
        im = Image.open(path).convert('RGBA'); im.thumbnail((640, 640))
        ex.append({'name': name, 'src': b64(im, optimize=True)})
    bl = []
    for name, d in buildings:
        an = json.load(open(os.path.join(d, 'anchor.json'))); n = an['size_final']
        rots, nf = [], 1
        for r in (0, 90, 180, 270):
            fs = sorted(glob.glob(os.path.join(d, f'rot{r}_f*.png')), key=lambda q: int(re.search(r'_f(\d+)', q).group(1)))
            ims = [Image.open(q) for q in fs] or [Image.open(os.path.join(d, f'rot{r}.png'))]; nf = len(ims)
            st = Image.new('RGBA', (n * nf, n))
            for i, im in enumerate(ims): st.paste(im, (i * n, 0))
            rots.append(b64(st, optimize=True))
        bl.append({'name': name, 'rots': rots, 'frames': nf, 'ms': 140,
                   'anchor': [an['ground_x'] * n, an['ground_y'] * n], 'size': n, 'ppu': an['ppu_final'],
                   'tile': max(an['footprint']) * 1.02})
    payload = {'buildings': bl, 'sprites': data, 'anchor': [anchor['ground_x'] * S, anchor['ground_y'] * S], 'size': S,
               'town': town_src, 'extras': ex,
               'ms': {'walk': [110] * 8, 'chop': [160, 130, 120, 160, 60, 60, 200, 160]}}
    html = open(os.path.join(os.path.dirname(os.path.abspath(__file__)), 'test_page_template.html')).read()
    html = html.replace('/*__DATA__*/null', json.dumps(payload))
    open(out_html, 'w').write(html)
    print('page', out_html, round(len(html) / 1e6, 2), 'MB')

if __name__ == '__main__':
    a = sys.argv[1:]; town = None; extras = []; bls = []
    while '--building' in a:
        i = a.index('--building'); n, p = a[i + 1].split('=', 1); bls.append((n, p)); del a[i:i + 2]
    if '--town' in a: i = a.index('--town'); town = a[i + 1]; del a[i:i + 2]
    while '--extra' in a:
        i = a.index('--extra'); n, p = a[i + 1].split('=', 1); extras.append((n, p)); del a[i:i + 2]
    build(a[0], a[1], town, extras, bls)
