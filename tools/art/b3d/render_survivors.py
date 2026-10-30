"""Render the survivor professions: a lineup in four directions and a walk GIF.

Run: python3 tools/art/b3d/render_survivors.py OUT_DIR [lineup] [walk] [only=farmer,medic]
Camera matches the ink town (orthographic, 45 deg turn, 45 deg tilt).
"""
import bpy, math, os, sys, time
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from mathutils import Vector
from PIL import Image
import inkstyle, survivor
inkstyle.DEFAULTS.update(bands=4, hatch=False)   # Look E: faceted, four flat tones, no hatching
from professions import PROFESSIONS, ORDER

OUT = sys.argv[1]; os.makedirs(OUT, exist_ok=True)
JOBS = [a for a in sys.argv[2:] if a in ('lineup', 'walk')] or ['lineup', 'walk']
only = [a.split('=', 1)[1].split(',') for a in sys.argv if a.startswith('only=')]
names = only[0] if only else ORDER
D = math.radians
FACE = {'se': 90, 'sw': 0, 'nw': -90, 'ne': 180}

bpy.ops.wm.read_factory_settings(use_empty=True)
S = bpy.context.scene
t0 = time.time()
right = Vector((math.cos(D(45)), math.sin(D(45)), 0))
gap = 0.95
rigs = []
for i, n in enumerate(names):
    pos = right * (i - (len(names) - 1) / 2) * gap
    rigs.append(survivor.build(PROFESSIONS[n], origin=pos, facing=FACE['se'], tag=n))
    print('built', n, round(time.time() - t0), flush=True)

cam = bpy.data.objects.new('cam', bpy.data.cameras.new('cam')); S.collection.objects.link(cam)
Z = float(([a.split('=')[1] for a in sys.argv if a.startswith('zoom=')] or ['1'])[0])
PPM = 300 * Z
W = int(PPM * (len(names) * gap + .5)); H = int(560 * Z)
cam.data.type = 'ORTHO'; cam.data.ortho_scale = W / PPM; cam.rotation_euler = (D(45), 0, D(45))
look = Vector((0, 0, -1)); look.rotate(cam.rotation_euler); cam.location = Vector((0, 0, .72)) - look * 30
cam.data.clip_end = 80; S.camera = cam
S.render.resolution_x, S.render.resolution_y = W, H
sun = bpy.data.objects.new('sun', bpy.data.lights.new('sun', 'SUN')); S.collection.objects.link(sun)
sun.data.energy = 3.0; sun.data.angle = D(3); sun.data.color = (1.0, .96, .88)
d = Vector((.55, -.45, -.7)).normalized(); sun.rotation_euler = (-d).to_track_quat('Z', 'Y').to_euler()
w = bpy.data.worlds.new('w'); S.world = w; w.use_nodes = True
w.node_tree.nodes['Background'].inputs['Color'].default_value = (.5, .5, .5, 1)
w.node_tree.nodes['Background'].inputs['Strength'].default_value = .6
S.render.engine = 'BLENDER_EEVEE'; S.eevee.taa_render_samples = 16
inkstyle.setup(S, line_px=2.0, wobble=1.0)
S.render.film_transparent = True
S.render.image_settings.file_format = 'PNG'; S.render.image_settings.color_mode = 'RGBA'
PAPER = (236, 222, 190, 255)

def shot(path):
    S.render.filepath = path; bpy.ops.render.render(write_still=True)

def on_paper(src, dst, seed=3):
    im = Image.open(src); bg = Image.new('RGBA', im.size, PAPER); bg.alpha_composite(im); bg.save(dst)
    inkstyle.paper(dst, strength=.6, seed=seed)

if 'lineup' in JOBS:
    for v in ('se', 'sw', 'nw', 'ne'):
        for r in rigs:
            r['arm'].rotation_euler = (0, 0, D(FACE[v])); survivor.pose(r, survivor.idle(0))
        p = os.path.join(OUT, f'lineup_{v}.png'); shot(p); on_paper(p, os.path.join(OUT, f'lineup_{v}_paper.png'))
        print('lineup', v, round(time.time() - t0), flush=True)

if 'walk' in JOBS:
    NF = 12; frames = []
    for v in ('se',):
        for r in rigs: r['arm'].rotation_euler = (0, 0, D(FACE[v]))
        for i in range(NF):
            for k, r in enumerate(rigs): survivor.pose(r, survivor.walk(((i / NF) + k * .13) % 1))
            p = os.path.join(OUT, f'_w_{v}_{i:02d}.png'); shot(p)
            q = p.replace('.png', '_p.png'); on_paper(p, q); frames.append(Image.open(q).convert('RGB')); os.remove(q)
            print('walk', i, round(time.time() - t0), flush=True)
    frames[0].save(os.path.join(OUT, 'lineup_walk_se.gif'), save_all=True, append_images=frames[1:], duration=1000 // 12, loop=0)
print('all done', round(time.time() - t0), flush=True)
