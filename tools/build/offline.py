#!/usr/bin/env python3
"""The offline copy of the game for the iPhone's Home Screen (W275, owner 25 Nov).

    python3 tools/build/offline.py OUT_DIR          # build the site from the committed game files
    python3 tools/build/offline.py OUT_DIR --push   # ... and push it as the `gh-pages` branch

Site: https://sfwong629-droid.github.io/Zombie-haven/ (GitHub Pages, branch gh-pages, folder / root).
What it does: copies the game (index.html, js, css, vendor, the assets the game loads), adds the offline saver
(tools/build/offline/sw.js, offline.js), a Home Screen icon and the manifest. The page is the repo's index.html with
the cache tag set to the game's BUILD_TAG and the real .glb models (the artifact host needs .glb.txt; GitHub Pages does not).
The artifact (claude.ai) is not touched. Check: node tools/qa/offline_check.js OUT_DIR
"""
import hashlib, json, os, re, shutil, subprocess, sys

R = os.path.abspath(os.path.join(os.path.dirname(__file__), '..', '..'))
SRC = os.path.join(R, 'tools', 'build', 'offline')
SKIP_EXT = ('.blend', '.blend1')
SKIP_DIRS = ('/source/', '/rig/')


def build_tag():
    t = open(os.path.join(R, 'src/game/01-core.js')).read()
    return re.search(r"BUILD_TAG\s*=\s*'([^']+)'", t).group(1)


def game_files():
    out = ['index.html', 'manifest.webmanifest', 'offline.js', 'icon-180.png', 'icon-512.png']
    for top in ('js', 'css', 'vendor', 'assets'):
        for d, _, fs in os.walk(os.path.join(R, top)):
            for f in fs:
                p = os.path.relpath(os.path.join(d, f), R).replace(os.sep, '/')
                if p.endswith(SKIP_EXT) or any(s in '/' + p for s in SKIP_DIRS) or f.startswith('.'):
                    continue
                if top == 'js' and not f.endswith('.js'):
                    continue
                out.append(p)
    return out


def make_icon(path, size):
    from PIL import Image, ImageDraw, ImageFont
    im = Image.new('RGB', (size, size), (16, 33, 42))
    d = ImageDraw.Draw(im)
    for y in range(size):  # dusk sky to dark ground
        k = y / size
        d.line([(0, y), (size, y)], fill=(int(30 + 40 * (1 - k)), int(52 + 30 * (1 - k)), int(66 + 20 * (1 - k))))
    font = ImageFont.truetype(os.path.join(R, 'assets/fonts/Jersey15-Regular.ttf'), int(size * 0.34))
    for txt, y, col in (('ZOMBIE', 0.20, (168, 224, 97)), ('HAVEN', 0.52, (255, 213, 107))):
        w = d.textlength(txt, font=font)
        x = (size - w) / 2
        for dx in (-3, 0, 3):
            for dy in (-3, 0, 3):
                d.text((x + dx * size / 180, size * y + dy * size / 180), txt, font=font, fill=(16, 21, 26))
        d.text((x, size * y), txt, font=font, fill=col)
    im.save(path)


def main():
    if len(sys.argv) < 2:
        print(__doc__); sys.exit(1)
    out = os.path.abspath(sys.argv[1]); push = '--push' in sys.argv
    tag = build_tag(); v = tag.lower()
    if os.path.exists(out):
        shutil.rmtree(out)
    os.makedirs(out)
    files = game_files()
    for p in files:
        if p in ('index.html', 'manifest.webmanifest', 'offline.js', 'icon-180.png', 'icon-512.png'):
            continue
        os.makedirs(os.path.dirname(os.path.join(out, p)), exist_ok=True)
        shutil.copy2(os.path.join(R, p), os.path.join(out, p))
    # the page
    h = open(os.path.join(R, 'index.html')).read()
    h = re.sub(r'\?v=3d\.\d+', '?v=' + v, h)
    h = h.replace('<link rel="manifest" href="manifest.webmanifest">',
                  '<link rel="manifest" href="manifest.webmanifest"><link rel="apple-touch-icon" href="icon-180.png">'
                  '<meta name="apple-mobile-web-app-title" content="Zombie Haven">')
    h = h.replace('<script src="js/iso.js', '<script>window.ZH_FORCE3D = true;</script>\n<script src="offline.js?v=' + v + '"></script>\n<script src="js/iso.js', 1)
    assert 'offline.js' in h and 'apple-touch-icon' in h
    open(os.path.join(out, 'index.html'), 'w').write(h)
    m = json.load(open(os.path.join(R, 'manifest.webmanifest')))
    m.update({'start_url': './', 'scope': './', 'icons': [{'src': 'icon-180.png', 'sizes': '180x180', 'type': 'image/png'},
                                                        {'src': 'icon-512.png', 'sizes': '512x512', 'type': 'image/png'}]})
    json.dump(m, open(os.path.join(out, 'manifest.webmanifest'), 'w'))
    shutil.copy2(os.path.join(SRC, 'offline.js'), os.path.join(out, 'offline.js'))
    make_icon(os.path.join(out, 'icon-180.png'), 180)
    make_icon(os.path.join(out, 'icon-512.png'), 512)
    # the saver, with every file's hash
    lst = []
    for p in files:
        b = open(os.path.join(out, p), 'rb').read()
        lst.append([p, hashlib.md5(b).hexdigest()[:10], len(b)])
    sw = open(os.path.join(SRC, 'sw.js')).read().replace('__BUILD__', tag).replace('__FILES__', json.dumps(lst, separators=(',', ':')))
    open(os.path.join(out, 'sw.js'), 'w').write(sw)
    open(os.path.join(out, '.nojekyll'), 'w').write('')
    total = sum(x[2] for x in lst)
    print(f'{tag}: {len(lst)} files, {total / 1e6:.1f} MB -> {out}')
    if push:
        g = lambda *a: subprocess.run(['git', '-C', out] + list(a), check=True)
        g('init', '-q', '-b', 'gh-pages')
        g('add', '-A')
        g('-c', 'user.name=Claude', '-c', 'user.email=noreply@anthropic.com', 'commit', '-q', '-m',
          f'Offline copy of {tag} (tools/build/offline.py)\n\nCo-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>\n'
          'Claude-Session: https://claude.ai/code/session_017WFo2cPEr12sd1c6z3M2gh')
        url = subprocess.run(['git', '-C', R, 'remote', 'get-url', 'origin'], capture_output=True, text=True).stdout.strip()
        g('push', '-q', '-f', url, 'gh-pages')
        print('pushed gh-pages')


if __name__ == '__main__':
    main()
