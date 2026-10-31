"""Turn big character renders into small pixel-art sprites: shrink, flatten colours, ink outline.

  python3 spritify.py RAW_DIR OUT_DIR [size=64] [colors=40]
RAW_DIR holds <clip>_<view>_<i>.png renders (from ai_render.py sprites). One palette is shared by every frame,
so colours never flicker between frames or directions.
"""
import glob, os, re, sys
import numpy as np
from PIL import Image, ImageEnhance

INK = (38, 26, 20)

def shrink(im, size):
    a = np.asarray(im.convert('RGBA')).astype(np.float32) / 255
    f = im.width // size
    rgb = a[..., :3] * a[..., 3:4]                       # premultiply so edges don't go grey
    blk = lambda x: x.reshape(size, f, size, f, -1).mean((1, 3))
    al = blk(a[..., 3:4]); c = blk(rgb) / np.maximum(al, 1e-4)
    out = np.dstack([c, al])
    out[..., 3] = (out[..., 3] > .45).astype(np.float32)
    return Image.fromarray((np.clip(out, 0, 1) * 255).astype(np.uint8), 'RGBA')

def punch(im):
    rgb = im.convert('RGB'); rgb = ImageEnhance.Color(rgb).enhance(1.25); rgb = ImageEnhance.Contrast(rgb).enhance(1.12)
    out = rgb.convert('RGBA'); out.putalpha(im.getchannel('A')); return out

def outline(im):
    a = np.array(im); m = a[..., 3] > 0
    n = np.zeros_like(m)
    n[1:] |= m[:-1]; n[:-1] |= m[1:]; n[:, 1:] |= m[:, :-1]; n[:, :-1] |= m[:, 1:]
    rim = n & ~m
    a[rim] = (*INK, 255)
    return Image.fromarray(a, 'RGBA')

def build_palette(frames, colors):
    strip = Image.new('RGB', (sum(f.width for f in frames), frames[0].height))
    x = 0
    for f in frames:
        bg = Image.new('RGB', f.size, (0, 0, 0)); bg.paste(f, mask=f.getchannel('A')); strip.paste(bg, (x, 0)); x += f.width
    # weight only opaque pixels: collect them into one tall image
    px = np.concatenate([np.asarray(f)[np.asarray(f)[..., 3] > 0][:, :3] for f in frames])
    side = int(np.ceil(np.sqrt(len(px))))
    pad = np.zeros((side * side, 3), np.uint8); pad[:len(px)] = px; pad[len(px):] = px[0]
    return Image.fromarray(pad.reshape(side, side, 3), 'RGB').quantize(colors, method=Image.Quantize.MEDIANCUT)

def apply_palette(f, pal):
    q = f.convert('RGB').quantize(palette=pal, dither=Image.Dither.NONE).convert('RGBA')
    q.putalpha(f.getchannel('A')); return q

def run(raw, out, size=64, colors=40):
    os.makedirs(out, exist_ok=True)
    paths = sorted(glob.glob(os.path.join(raw, '*.png')))
    small = {os.path.basename(p)[:-4]: punch(shrink(Image.open(p), size)) for p in paths}
    pal = build_palette(list(small.values()), colors)
    done = {}
    for k, f in small.items():
        s = outline(apply_palette(f, pal)); s.save(os.path.join(out, k + '.png')); done[k] = s
    return done

def key(name):
    m = re.match(r'(\w+?)_(\w\w)_(\d+)$', name); return m.group(1), m.group(2), int(m.group(3))

def sheets(done, out, scale=4, bg=(236, 222, 190, 255)):
    clips = {}
    for k, im in done.items():
        c, v, i = key(k); clips.setdefault(c, {}).setdefault(v, {})[i] = im
    for c, vs in clips.items():
        views = [v for v in ('se', 'sw', 'ne', 'nw') if v in vs]
        n = max(len(x) for x in vs.values()); S = next(iter(done.values())).width
        sheet = Image.new('RGBA', (n * S, len(views) * S), bg)
        for r, v in enumerate(views):
            for i in range(n): sheet.alpha_composite(vs[v][i], (i * S, r * S))
        sheet.resize((sheet.width * scale, sheet.height * scale), Image.NEAREST).save(os.path.join(out, f'sheet_{c}.png'))
        # one GIF per clip: four directions side by side
        dur = [110] * n if c == 'walk' else [160, 130, 120, 160, 60, 60, 200, 160][:n]
        gif = []
        for i in range(n):
            fr = Image.new('RGBA', (len(views) * S, S), bg)
            for r, v in enumerate(views): fr.alpha_composite(vs[v][i], (r * S, 0))
            gif.append(fr.resize((fr.width * scale, fr.height * scale), Image.NEAREST).convert('RGB'))
        gif[0].save(os.path.join(out, f'{c}.gif'), save_all=True, append_images=gif[1:], duration=dur, loop=0)

if __name__ == '__main__':
    raw, out = sys.argv[1], sys.argv[2]
    opt = dict(a.split('=') for a in sys.argv[3:] if '=' in a)
    done = run(raw, out, int(opt.get('size', 64)), int(opt.get('colors', 40)))
    sheets(done, out)
    print('sprites', len(done), '->', out)
