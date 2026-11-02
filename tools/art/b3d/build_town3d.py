"""Build the real-time 3D town test page (town3d_template.html) with the models embedded.

  python3 build_town3d.py OUT.html --mid MALE_MID.glb (or --male MALE.glb) --lite MALE_LITE.glb --tent TENT.glb [--notes HTML_OR_FILE]

MALE.glb / MALE_LITE.glb from export3d.py (full and decimate=0.25), TENT.glb from export_prop3d.py.
"""
import base64, json, os, sys

def uri(p): return 'data:model/gltf-binary;base64,' + base64.b64encode(open(p, 'rb').read()).decode()

def main(a):
    out = a[0]; kw = {}
    for k in ('male', 'mid', 'lite', 'tent', 'notes'):
        if '--' + k in a: kw[k] = a[a.index('--' + k) + 1]
    data = {k: uri(kw[k]) for k in ('mid', 'lite', 'tent') if k in kw}; data['male'] = None if 'mid' in kw else uri(kw['male']); n = kw.get('notes', ''); data['notes'] = open(n).read() if n and os.path.exists(n) else n
    html = open(os.path.join(os.path.dirname(os.path.abspath(__file__)), 'town3d_template.html')).read()
    html = html.replace('/*__DATA__*/null', json.dumps(data))
    open(out, 'w').write(html); print('page', out, round(len(html) / 1e6, 2), 'MB')

if __name__ == '__main__': main(sys.argv[1:])
