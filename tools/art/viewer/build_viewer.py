"""Embed GLBs into the turntable viewer page.
Run: python3 build_viewer.py out.html "Title" "Heading" "Sub text" Label=model.glb [Label2=other.glb ...]
"""
import base64, json, os, sys
t = open(os.path.join(os.path.dirname(os.path.abspath(__file__)), 'viewer_template.html')).read()
out, title, h1, sub = sys.argv[1:5]
models = {}
for a in sys.argv[5:]:
    k, p = a.split('=', 1); models[k] = base64.b64encode(open(p, 'rb').read()).decode()
for k, v in (('__TITLE__', title), ('__H1__', h1), ('__SUB__', sub), ('__MODELS__', json.dumps(models))):
    t = t.replace(k, v)
open(out, 'w').write(t)
