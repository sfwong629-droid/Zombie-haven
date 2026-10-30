"""Embed a GLB into the turntable viewer page. Run: python3 build_viewer.py model.glb out.html"""
import base64, os, sys
t = open(os.path.join(os.path.dirname(os.path.abspath(__file__)), 'viewer_template.html')).read()
open(sys.argv[2], 'w').write(t.replace('__GLB__', base64.b64encode(open(sys.argv[1], 'rb').read()).decode()))
