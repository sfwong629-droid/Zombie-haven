# movesheet.py OUT.png "TITLE" "SUBTITLE" "LABEL|MODEL.raw.glb|CLIP|VIEW" ... : a review sheet of animations, eight moments per row, labelled, the way
# the owner has been shown each zombie move (today's move above the new one, from the side and from the front). VIEW: side, front, q (front
# three-quarter), back, or 'dx,dy,dz'. Env: FIXED x,y,z and DIST (camera target and distance; default from the model's height), N (moments, 8).
# Renders with closeup.py (Blender, one process per picture, six at a time). Rig: +X left, -Y forward, +Z up.
import sys, os, subprocess, tempfile, json, struct
from PIL import Image, ImageDraw, ImageFont
out, title, sub = sys.argv[1:4]; rows = [r.split('|') for r in sys.argv[4:]]
HERE = os.path.dirname(os.path.abspath(__file__)); N = int(os.environ.get('N', 8)); tmp = tempfile.mkdtemp()
VIEWS = {'side': '1,0,.1', 'front': '0,-1,.1', 'q': '.6,-.8,.15', 'back': '-.6,.8,.15'}
def height(glb):
    b = open(glb, 'rb').read(); n = struct.unpack('<I', b[12:16])[0]; g = json.loads(b[20:20 + n])
    for m in g['meshes']:
        for p in m['primitives']:
            a = g['accessors'][p['attributes']['POSITION']]
            if 'max' in a: return (a['max'][1] - a['min'][1]) if (a['max'][1] - a['min'][1]) > (a['max'][2] - a['min'][2]) else (a['max'][2] - a['min'][2])
    return 1.
jobs = []
for r, (lab, glb, clip, view) in enumerate(rows):
    h = float(os.environ.get('H', height(glb))); fx = os.environ.get('FIXED', '0,-.1,%.3f' % (.5 * h)); ds = os.environ.get('DIST', '%.3f' % (1.8 * h))
    for i in range(N):
        o = os.path.join(tmp, 'r%02d_%02d.png' % (r, i))
        env = dict(os.environ, GROUND='1', WEAP=os.environ.get('WEAP', 'none'), FIXED=fx, DIST=ds, VIEWS=VIEWS.get(view, view))
        jobs.append((['python3', os.path.join(HERE, 'closeup.py'), '--', glb, 'x', clip, '%.4f' % (i / N), o], env))
running = []
for cmd, env in jobs:
    running.append(subprocess.Popen(cmd, env=env, stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL))
    if len(running) >= 6: running.pop(0).wait()
for p in running: p.wait()
try: F = lambda s: ImageFont.truetype('/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf', s)
except Exception: F = lambda s: None
cw = ch = 210; X0 = 250; Wim = Image.new('RGB', (X0 + cw * N + 10, 96 + ch * len(rows)), 'white'); D = ImageDraw.Draw(Wim)
D.text((14, 14), title, fill=(20, 20, 20), font=F(28)); D.text((14, 56), sub, fill=(70, 70, 70), font=F(17))
for r, (lab, glb, clip, view) in enumerate(rows):
    y = 96 + ch * r; D.text((12, y + 80), lab, fill=(20, 20, 20), font=F(18)); D.text((12, y + 106), clip, fill=(110, 110, 110), font=F(13))
    for i in range(N):
        p = os.path.join(tmp, 'r%02d_%02d.png' % (r, i))
        if os.path.exists(p):
            im = Image.open(p).convert('RGB'); w, hh = im.size; Wim.paste(im.crop((int(w * .1), 0, int(w * .9), int(hh * .95))).resize((cw, ch)), (X0 + cw * i, y))
        else: D.text((X0 + cw * i + 10, y + 90), 'not rendered', fill=(200, 0, 0), font=F(14))
Wim.save(out); print('MOVESHEET', len(rows), 'rows ->', out)
