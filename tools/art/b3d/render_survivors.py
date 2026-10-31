"""Render the survivor professions: a lineup in four directions and a walk GIF.

Run: python3 tools/art/b3d/render_survivors.py OUT_DIR [lineup] [walk] [only=farmer,medic]
Camera matches the ink town (orthographic, 45 deg turn, 45 deg tilt).
"""
import bpy, math, os, sys, time
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from mathutils import Vector
from PIL import Image
import inkstyle, survivor
inkstyle.DEFAULTS.update(bands=3, hatch=False)   # Look E: faceted, four flat tones, no hatching
from professions import PROFESSIONS, ORDER

OUT = sys.argv[1]; os.makedirs(OUT, exist_ok=True)
JOBS = [a for a in sys.argv[2:] if a in ('lineup', 'walk', 'pixel')] or ['lineup', 'walk']
only = [a.split('=', 1)[1].split(',') for a in sys.argv if a.startswith('only=')]
names = only[0] if only else ORDER
D = math.radians
FACE = {'se': 90, 'sw': 0, 'nw': -90, 'ne': 180, 'front': 45, 'side': 135}

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
TILT = float(([a.split('=')[1] for a in sys.argv if a.startswith('tilt=')] or ['45'])[0])
cam.data.type = 'ORTHO'; cam.data.ortho_scale = max(W, H) / PPM; cam.rotation_euler = (D(TILT), 0, D(45))
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
LINE = float(([a.split('=')[1] for a in sys.argv if a.startswith('line=')] or ['2.0'])[0])
OUTER = [float(a.split('=')[1]) for a in sys.argv if a.startswith('outer=')]
inkstyle.setup(S, line_px=LINE * Z, wobble=1.0)
S.render.film_transparent = True
S.render.image_settings.file_format = 'PNG'; S.render.image_settings.color_mode = 'RGBA'
PAPER = (236, 222, 190, 255)

def shot(path):
    S.render.filepath = path; bpy.ops.render.render(write_still=True)

def outline(im, px):
    """Bold storybook contour: grow the sprite's silhouette by px and fill the rim with dark ink."""
    from PIL import ImageFilter
    a = im.split()[3].point(lambda v: 255 if v > 40 else 0)
    k = int(px) * 2 + 1
    rim = a.filter(ImageFilter.MaxFilter(k)).filter(ImageFilter.GaussianBlur(.7))
    ink_ = Image.new('RGBA', im.size, (34, 24, 18, 255)); ink_.putalpha(rim)
    ink_.alpha_composite(im); return ink_

def on_paper(src, dst, seed=3):
    im = Image.open(src).convert('RGBA')
    if OUTER: im = outline(im, OUTER[0] * Z); im.save(src)
    bg = Image.new('RGBA', im.size, PAPER); bg.alpha_composite(im); bg.save(dst)
    inkstyle.paper(dst, strength=.6, seed=seed)

if 'lineup' in JOBS:
    VIEWS = ([a.split('=')[1].split(',') for a in sys.argv if a.startswith('views=')] or [('se', 'sw', 'nw', 'ne')])[0]
    APOSE = float(([a.split('=')[1] for a in sys.argv if a.startswith('apose=')] or ['0'])[0])
    for v in VIEWS:
        for r in rigs:
            r['arm'].rotation_euler = (0, 0, D(FACE[v])); p_ = survivor.idle(0)
            if APOSE: p_['upperarm.L'] = (p_['upperarm.L'][0], 0, p_['upperarm.L'][2] - APOSE); p_['upperarm.R'] = (p_['upperarm.R'][0], 0, p_['upperarm.R'][2] + APOSE)
            survivor.pose(r, p_)
        p = os.path.join(OUT, f'lineup_{v}.png'); shot(p); on_paper(p, os.path.join(OUT, f'lineup_{v}_paper.png'))
        print('lineup', v, round(time.time() - t0), flush=True)

def pixel_passes(tag):
    """Two clean passes for sprite conversion: flat base colours, and lighting only (white clay)."""
    S.render.use_freestyle = False
    saved = {}
    for o in S.objects:
        if o.type != 'MESH': continue
        saved[o.name] = list(o.data.materials)
        for i, m in enumerate(o.data.materials):
            if m is None or 'zh_base' not in m: continue
            key = 'flat' + m['zh_base']
            fm = bpy.data.materials.get(key)
            if not fm:
                fm = bpy.data.materials.new(key); fm.use_nodes = True; nt = fm.node_tree
                for n in list(nt.nodes): nt.nodes.remove(n)
                em = nt.nodes.new('ShaderNodeEmission'); em.inputs[0].default_value = inkstyle.lin(m['zh_base'])
                out = nt.nodes.new('ShaderNodeOutputMaterial'); nt.links.new(em.outputs[0], out.inputs[0])
            o.data.materials[i] = fm
    S.eevee.taa_render_samples = 1
    shot(os.path.join(OUT, f'flat_{tag}.png'))
    for o in S.objects:
        if o.name in saved:
            for i, m in enumerate(saved[o.name]): o.data.materials[i] = m
    clay = bpy.data.materials.get('clay') or bpy.data.materials.new('clay')
    clay.use_nodes = True; clay.node_tree.nodes['Principled BSDF'].inputs['Base Color'].default_value = (.8, .8, .8, 1)
    clay.node_tree.nodes['Principled BSDF'].inputs['Roughness'].default_value = 1
    S.view_layers[0].material_override = clay; S.eevee.taa_render_samples = 8
    shot(os.path.join(OUT, f'lit_{tag}.png'))
    S.view_layers[0].material_override = None; S.render.use_freestyle = True; S.eevee.taa_render_samples = 16

if 'pixel' in JOBS:
    VIEWS = ([a.split('=')[1].split(',') for a in sys.argv if a.startswith('views=')] or [('front', 'se', 'sw', 'ne')])[0]
    for v in VIEWS:
        for r in rigs:
            r['arm'].rotation_euler = (0, 0, D(FACE[v])); survivor.pose(r, survivor.idle(0))
        pixel_passes(v); print('pixel', v, round(time.time() - t0), flush=True)
    if 'swing' in sys.argv[2:]:
        for v in ('se', 'sw'):
            for r in rigs: r['arm'].rotation_euler = (0, 0, D(FACE[v]))
            for i in range(12):
                for r in rigs: survivor.pose(r, survivor.swing(i / 12))
                pixel_passes(f'swing_{v}_{i:02d}')
            print('pixel swing', v, round(time.time() - t0), flush=True)
    if 'walk' in sys.argv[2:]:
        for v in ('se',):
            for r in rigs: r['arm'].rotation_euler = (0, 0, D(FACE[v]))
            for i in range(12):
                for r in rigs: survivor.pose(r, survivor.walk(i / 12))
                pixel_passes(f'walk_{v}_{i:02d}')
            print('pixel walk', round(time.time() - t0), flush=True)
    JOBS = [j for j in JOBS if j != 'walk']

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
