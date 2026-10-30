"""Direction B test: a stylized low-poly 3D Farmer, rendered to sprite sheets.

Run:  python3 tools/art/b3d/farmer3d.py OUT_DIR [--hero]
Needs the `bpy` package (pip install bpy). Renders idle, walk and punch in the
SE (front) and NE (back) views with a fixed orthographic game camera:
45 deg turn, 30 deg tilt (ground tiles come out at an exact 2:1).

The figure faces -Y while it is built. A facing empty turns it:
SE = facing +X, NE = facing +Y (a true 180 deg turn from the camera's view).
"""
import math, os, sys, json
import bpy
from mathutils import Vector, Euler
from bpy_extras.object_utils import world_to_camera_view

OUT = sys.argv[sys.argv.index('--') + 1] if '--' in sys.argv else (sys.argv[1] if len(sys.argv) > 1 else 'out')
HERO = '--hero' in sys.argv
os.makedirs(OUT, exist_ok=True)

PPM = 120            # rendered pixels per metre (shown at half size on screen = 60 css px/m)
FW, FH = 256, 288    # frame size in rendered pixels
TARGET = Vector((0, 0, 0.9))
D = math.radians

# ---------------------------------------------------------------- materials
def lin(h):
    h = h.lstrip('#'); c = [int(h[i:i + 2], 16) / 255 for i in (0, 2, 4)]
    return [(x / 12.92 if x <= 0.04045 else ((x + 0.055) / 1.055) ** 2.4) for x in c] + [1]

def mat(name, col, rough=0.85, noise=None, plaid=None):
    m = bpy.data.materials.new(name); m.use_nodes = True
    nt = m.node_tree; b = nt.nodes['Principled BSDF']
    b.inputs['Roughness'].default_value = rough
    b.inputs['Specular IOR Level'].default_value = 0.25
    if plaid:
        tc = nt.nodes.new('ShaderNodeTexCoord'); sx = nt.nodes.new('ShaderNodeSeparateXYZ')
        nt.links.new(tc.outputs['Object'], sx.inputs[0])
        acc = None
        for ax in ('X', 'Z'):
            mu = nt.nodes.new('ShaderNodeMath'); mu.operation = 'MULTIPLY'; mu.inputs[1].default_value = 42
            nt.links.new(sx.outputs[ax], mu.inputs[0])
            si = nt.nodes.new('ShaderNodeMath'); si.operation = 'SINE'; nt.links.new(mu.outputs[0], si.inputs[0])
            gt = nt.nodes.new('ShaderNodeMath'); gt.operation = 'GREATER_THAN'; gt.inputs[1].default_value = 0.35
            nt.links.new(si.outputs[0], gt.inputs[0])
            if acc is None: acc = gt
            else:
                ad = nt.nodes.new('ShaderNodeMath'); ad.operation = 'ADD'
                nt.links.new(acc.outputs[0], ad.inputs[0]); nt.links.new(gt.outputs[0], ad.inputs[1]); acc = ad
        sc = nt.nodes.new('ShaderNodeMath'); sc.operation = 'MULTIPLY'; sc.inputs[1].default_value = 0.5
        nt.links.new(acc.outputs[0], sc.inputs[0])
        r = nt.nodes.new('ShaderNodeValToRGB'); r.color_ramp.interpolation = 'CONSTANT'
        r.color_ramp.elements[0].color = lin(plaid[0]); r.color_ramp.elements[1].position = 0.4
        r.color_ramp.elements[1].color = lin(plaid[1]); e = r.color_ramp.elements.new(0.9); e.color = lin(plaid[2])
        nt.links.new(sc.outputs[0], r.inputs[0]); nt.links.new(r.outputs[0], b.inputs['Base Color'])
    elif noise:
        n = nt.nodes.new('ShaderNodeTexNoise'); n.inputs['Scale'].default_value = noise[2]
        n.inputs['Detail'].default_value = 3
        r = nt.nodes.new('ShaderNodeValToRGB')
        r.color_ramp.elements[0].position = 0.35; r.color_ramp.elements[0].color = lin(noise[0])
        r.color_ramp.elements[1].position = 0.65; r.color_ramp.elements[1].color = lin(noise[1])
        nt.links.new(n.outputs['Fac'], r.inputs[0]); nt.links.new(r.outputs[0], b.inputs['Base Color'])
    else:
        b.inputs['Base Color'].default_value = lin(col)
    return m

# ---------------------------------------------------------------- scene
bpy.ops.wm.read_factory_settings(use_empty=True)
S = bpy.context.scene

def W(o): return Vector(o['wp'])

def empty(name, loc, parent=None):
    o = bpy.data.objects.new(name, None); S.collection.objects.link(o)
    o.empty_display_size = 0.05
    wp = Vector(loc)
    o.location = wp - (W(parent) if parent else Vector())
    o['wp'] = wp; o.parent = parent; o.rotation_mode = 'XYZ'
    return o

def part(kind, size, loc, parent, m, rot=(0, 0, 0), smooth=True, **kw):
    if kind == 'sphere':
        bpy.ops.mesh.primitive_uv_sphere_add(segments=kw.get('seg', 16), ring_count=kw.get('rings', 10), radius=1)
    elif kind == 'cyl':
        bpy.ops.mesh.primitive_cylinder_add(vertices=kw.get('seg', 14), radius=1, depth=1)
    elif kind == 'cone':
        bpy.ops.mesh.primitive_cone_add(vertices=kw.get('seg', 14), radius1=1, radius2=kw.get('top', 1), depth=1)
    elif kind == 'box':
        bpy.ops.mesh.primitive_cube_add(size=1)
        if kw.get('bevel'):
            mod = bpy.context.object.modifiers.new('bv', 'BEVEL'); mod.width = kw['bevel']; mod.segments = 2
    o = bpy.context.object
    o.scale = size; o.rotation_euler = rot
    o.location = Vector(loc) - W(parent); o.parent = parent
    o.data.materials.append(m)
    if smooth:
        bpy.ops.object.shade_smooth_by_angle(angle=D(50)) if kind != 'sphere' else bpy.ops.object.shade_smooth()
    return o

def limb(p0, p1, r, parent, m, seg=12, r1=None):
    """A tapered cylinder from p0 to p1 (world)."""
    p0, p1 = Vector(p0), Vector(p1); mid = (p0 + p1) / 2; d = p1 - p0
    bpy.ops.mesh.primitive_cone_add(vertices=seg, radius1=r, radius2=r1 if r1 else r, depth=d.length)
    o = bpy.context.object
    o.rotation_euler = d.to_track_quat('Z', 'Y').to_euler()
    o.location = mid - W(parent); o.parent = parent; o.data.materials.append(m)
    bpy.ops.object.shade_smooth_by_angle(angle=D(50))
    return o

# palette taken from the approved PixelLab Farmer
SKIN = mat('skin', '#eeae86', 0.7)
HAIR = mat('hair', '#d8b25a', 0.8, noise=('#c39a45', '#e6c46c', 60))
SHIRT = mat('shirt', None, 0.9, plaid=('#5aa54a', '#3e8a38', '#25572a'))
PANTS = mat('pants', None, 0.9, noise=('#6c3f1f', '#83512b', 25))
BOOT = mat('boot', '#47291a', 0.6)
STRAP = mat('strap', '#5a3519', 0.7)
BELT = mat('belt', '#33200f', 0.5)
STRAW = mat('straw', None, 0.9, noise=('#c9a14c', '#ecce80', 45))
BAND = mat('band', '#3b7a2f', 0.8)
EYE = mat('eye', '#1b1714', 0.3)
BUCKLE = mat('buckle', '#c9b27a', 0.3)

# rig: empties at the joints, rigid parts hang off them
face = empty('facing', (0, 0, 0))
pelvis = empty('pelvis', (0, 0, 0.95), face)
spine = empty('spine', (0, 0, 1.04), pelvis)
neck = empty('neck', (0, 0, 1.50), spine)
J = {}
for s, n in ((1, 'L'), (-1, 'R')):     # s=+1: the character's left (+X while facing -Y)
    J['sh' + n] = empty('sh' + n, (s * 0.235, 0, 1.43), spine)
    J['el' + n] = empty('el' + n, (s * 0.26, 0, 1.15), J['sh' + n])
    J['wr' + n] = empty('wr' + n, (s * 0.265, 0, 0.92), J['el' + n])
    J['hp' + n] = empty('hp' + n, (s * 0.10, 0, 0.93), pelvis)
    J['kn' + n] = empty('kn' + n, (s * 0.105, 0, 0.51), J['hp' + n])
    J['an' + n] = empty('an' + n, (s * 0.105, 0, 0.10), J['kn' + n])

# hips, belt, torso
part('cyl', (0.185, 0.135, 0.11), (0, 0, 0.95), pelvis, PANTS)
part('cyl', (0.19, 0.142, 0.025), (0, 0, 1.045), pelvis, BELT)
part('box', (0.045, 0.012, 0.035), (0, -0.142, 1.045), pelvis, BUCKLE, bevel=0.004)
part('cone', (0.19, 0.14, 0.42), (0, 0, 1.27), spine, SHIRT, top=1.25)
part('sphere', (0.235, 0.17, 0.075), (0, 0, 1.47), spine, SHIRT)
for s in (1, -1):
    part('box', (0.032, 0.012, 0.44), (s * 0.09, -0.155, 1.27), spine, STRAP, rot=(D(4), 0, 0))
    part('box', (0.032, 0.012, 0.44), (s * 0.09, 0.156, 1.27), spine, STRAP, rot=(D(-4), 0, 0))
    part('box', (0.015, 0.006, 0.02), (s * 0.09, -0.164, 1.08), spine, BUCKLE)
    part('sphere', (0.085, 0.085, 0.085), (s * 0.215, 0, 1.43), J['sh' + ('L' if s > 0 else 'R')], SHIRT)

# head
part('cyl', (0.06, 0.06, 0.10), (0, 0, 1.53), neck, SKIN)
part('sphere', (0.14, 0.142, 0.155), (0, -0.005, 1.69), neck, SKIN, seg=20, rings=12)
part('sphere', (0.148, 0.135, 0.14), (0, 0.04, 1.72), neck, HAIR, seg=20, rings=12)
for s in (1, -1):
    part('sphere', (0.02, 0.012, 0.025), (s * 0.052, -0.135, 1.695), neck, EYE, seg=8, rings=6)
    part('sphere', (0.025, 0.034, 0.04), (s * 0.142, 0.0, 1.68), neck, SKIN, seg=8, rings=6)
part('sphere', (0.026, 0.034, 0.03), (0, -0.147, 1.66), neck, SKIN, seg=10, rings=6)
# hat
part('cyl', (0.27, 0.26, 0.022), (0, 0.02, 1.825), neck, STRAW, seg=20, rot=(D(-12), 0, 0))
part('cone', (0.155, 0.15, 0.13), (0, 0.035, 1.89), neck, STRAW, seg=18, top=0.85, rot=(D(-12), 0, 0))
part('cyl', (0.157, 0.152, 0.03), (0, 0.027, 1.85), neck, BAND, seg=18, rot=(D(-12), 0, 0))

# arms and legs
for s, n in ((1, 'L'), (-1, 'R')):
    sh, el, wr = J['sh' + n], J['el' + n], J['wr' + n]
    limb(W(sh), W(el), 0.078, sh, SHIRT, r1=0.068)
    part('sphere', (0.064, 0.064, 0.064), W(el), el, SKIN)
    limb(W(el), W(wr), 0.06, el, SKIN, r1=0.05)
    part('sphere', (0.058, 0.05, 0.065), W(wr) + Vector((0, 0, -0.05)), wr, SKIN, seg=10, rings=8)
    hp, kn, an = J['hp' + n], J['kn' + n], J['an' + n]
    limb(W(hp), W(kn), 0.1, hp, PANTS, r1=0.085)
    part('sphere', (0.086, 0.086, 0.086), W(kn), kn, PANTS)
    limb(W(kn), W(an) + Vector((0, 0, 0.2)), 0.082, kn, PANTS, r1=0.078)
    limb(W(an) + Vector((0, 0, 0.24)), W(an) + Vector((0, 0, -0.03)), 0.084, kn, BOOT, r1=0.082)
    part('box', (0.12, 0.25, 0.08), W(an) + Vector((0, -0.055, -0.06)), an, BOOT, bevel=0.025)

# ---------------------------------------------------------------- camera & light
cam = bpy.data.objects.new('cam', bpy.data.cameras.new('cam')); S.collection.objects.link(cam)
cam.data.type = 'ORTHO'; cam.data.ortho_scale = max(FW, FH) / PPM
cam.rotation_euler = (D(60), 0, D(45))
look = Vector((0, 0, -1)); look.rotate(cam.rotation_euler)
cam.location = TARGET - look * 20; cam.data.clip_end = 60; S.camera = cam

sun = bpy.data.objects.new('sun', bpy.data.lights.new('sun', 'SUN')); S.collection.objects.link(sun)
sun.data.energy = 3.2; sun.data.angle = D(6); sun.data.color = (1.0, 0.95, 0.85)
d = Vector((0.75, -0.15, -0.8)).normalized()
sun.rotation_euler = (-d).to_track_quat('Z', 'Y').to_euler()
fill = bpy.data.objects.new('fill', bpy.data.lights.new('fill', 'SUN')); S.collection.objects.link(fill)
fill.data.energy = 0.6; fill.data.color = (0.75, 0.85, 1.0)
d2 = Vector((-0.6, 0.5, -0.3)).normalized(); fill.rotation_euler = (-d2).to_track_quat('Z', 'Y').to_euler()

world = bpy.data.worlds.new('w'); S.world = world; world.use_nodes = True
world.node_tree.nodes['Background'].inputs['Color'].default_value = (0.42, 0.45, 0.5, 1)
world.node_tree.nodes['Background'].inputs['Strength'].default_value = 0.7

S.render.engine = 'BLENDER_EEVEE'
S.render.resolution_x, S.render.resolution_y = FW, FH
S.render.film_transparent = True
S.render.filter_size = 1.0
S.eevee.taa_render_samples = 10
S.view_settings.view_transform = 'Standard'
S.view_settings.look = 'None'

# ---------------------------------------------------------------- posing
POSE_JOINTS = ['pelvis', 'spine', 'neck'] + list(J)
OBJ = {o.name: o for o in bpy.data.objects}

def ease(x): return x * x * (3 - 2 * x)

def blank():
    return {k: [0.0, 0.0, 0.0] for k in POSE_JOINTS} | {'bob': 0.0}

def fwd(p, j, a): p[j][0] -= a          # swing forward (towards the character's front)
def bend(p, j, a): p[j][0] += a         # knee bend: shin swings back
def out(p, n, a): p['sh' + n][1] += (-a if n == 'L' else a)   # arm away from the body
def inw(p, n, a): p['sh' + n][2] += (-a if n == 'L' else a)   # raised arm turned in towards the middle

def apply(p):
    for k in POSE_JOINTS:
        OBJ[k].rotation_euler = [D(v) for v in p[k]]
    OBJ['pelvis'].location = Vector((0, 0, 0.95 + p['bob']))

def relaxed(p):
    for n in 'LR':
        out(p, n, 6); fwd(p, 'el' + n, 12)

def idle(t):
    p = blank(); relaxed(p); w = math.sin(2 * math.pi * t)
    p['spine'][0] += 1.5 * w; p['bob'] = -0.004 * (1 - w) / 2
    p['neck'][0] -= 1.2 * w; p['neck'][2] += 3 * math.sin(2 * math.pi * t + 1)
    for n in 'LR':
        out(p, n, 1.2 * w); fwd(p, 'el' + n, 2 * w)
    return p

def walk(t):
    p = blank(); ph = 2 * math.pi * t; sn, cs = math.sin(ph), math.cos(ph)
    for n, sg in (('L', 1), ('R', -1)):
        th = 24 * sg * sn
        fwd(p, 'hp' + n, th)
        kn = 6 + 42 * max(0.0, sg * cs) ** 1.4
        bend(p, 'kn' + n, kn)
        p['an' + n][0] += -(th - kn) * 0.35 - kn * 0.45 + (10 if sg * sn < -0.6 else 0) * 0
        fwd(p, 'sh' + n, -20 * sg * sn); out(p, n, 7)
        fwd(p, 'el' + n, 18 + 14 * max(0.0, -sg * sn))
    p['bob'] = 0.022 * math.cos(2 * ph) - 0.01
    p['pelvis'][2] += 6 * sn; p['spine'][2] -= 10 * sn; p['spine'][0] += 4
    p['neck'][2] += 4 * sn; p['neck'][0] -= 3
    return p

def guard(p, twist=0.0):
    for n in 'LR':
        fwd(p, 'sh' + n, 55); inw(p, n, 22); fwd(p, 'el' + n, 105)
    p['hpL'][0] -= 8; p['hpR'][0] += 8; p['knL'][0] += 10; p['knR'][0] += 12
    p['bob'] = -0.03; p['spine'][0] += 6; p['spine'][2] += twist; p['neck'][2] -= twist * 0.7

def punch(t):
    keys = [0.0, 0.22, 0.36, 0.5, 0.72, 1.0]
    def P(i):
        p = blank()
        if i in (0, 5): relaxed(p)
        elif i == 1: guard(p, -8)
        elif i in (2, 3):
            guard(p, 16); p['pelvis'][2] += 8
            fwd(p, 'shR', 32 if i == 2 else 30); fwd(p, 'elR', -103 if i == 2 else -98)
            inw(p, 'R', -46); p['hpL'][0] -= 6; p['knL'][0] += 6; p['spine'][0] += 4
        elif i == 4: guard(p, 0)
        return p
    for i in range(len(keys) - 1):
        if keys[i] <= t <= keys[i + 1]:
            a, b = P(i), P(i + 1); u = ease((t - keys[i]) / (keys[i + 1] - keys[i]))
            r = blank()
            for k in POSE_JOINTS: r[k] = [x + (y - x) * u for x, y in zip(a[k], b[k])]
            r['bob'] = a['bob'] + (b['bob'] - a['bob']) * u
            return r
    return P(5)

ANIMS = {'idle': (idle, 24, 10), 'walk': (walk, 16, 16), 'punch': (punch, 14, 18)}
VIEWS = {'se': D(90), 'ne': D(180), 'sw': D(0), 'nw': D(-90)}   # a true turn for every direction
if '--views' in sys.argv:
    _want = sys.argv[sys.argv.index('--views') + 1].split(',')
else:
    _want = ['se', 'ne']

def anchor():
    bpy.context.view_layer.update()
    co = world_to_camera_view(S, cam, Vector((0, 0, 0)))
    return round(co.x * FW, 1), round((1 - co.y) * FH, 1)

if HERO:
    raise SystemExit  # the hero still is made by scene3d.py, which imports this file's figure

from PIL import Image
if '--preview' in sys.argv:
    for spec in sys.argv[sys.argv.index('--preview') + 1:]:
        an, i, v = spec.split(':'); fn, nf, _ = ANIMS[an]; i = int(i)
        face.rotation_euler = (0, 0, VIEWS[v]); apply(fn(i / nf if an != 'punch' else i / (nf - 1)))
        S.render.filepath = os.path.join(OUT, f'pv_{an}_{i}_{v}.png'); bpy.ops.render.render(write_still=True)
    print('anchor', anchor()); raise SystemExit
meta = {'frame': [FW, FH], 'anchor': anchor(), 'ppm': PPM, 'scale_shown': 0.5, 'anims': {}}
tmp = os.path.join(OUT, '_f'); os.makedirs(tmp, exist_ok=True)
only = [a for a in sys.argv if a in ANIMS] or list(ANIMS)
for an in only:
    fn, nf, fps = ANIMS[an]
    meta['anims'][an] = {'frames': nf, 'fps': fps}
    for v, rz in [(k, VIEWS[k]) for k in _want]:
        face.rotation_euler = (0, 0, rz)
        sheet = Image.new('RGBA', (FW * nf, FH))
        for i in range(nf):
            apply(fn(i / nf if an != 'punch' else i / (nf - 1)))
            S.render.filepath = os.path.join(tmp, f'{an}_{v}_{i:02d}.png')
            bpy.ops.render.render(write_still=True)
            sheet.paste(Image.open(S.render.filepath), (i * FW, 0))
        sheet.save(os.path.join(OUT, f'farmer3d_{an}_{v}.png'), optimize=True)
        print('sheet', an, v, flush=True)
if os.path.exists(os.path.join(OUT, 'farmer3d_meta.json')):
    old = json.load(open(os.path.join(OUT, 'farmer3d_meta.json'))); old['anims'].update(meta['anims']); meta['anims'] = old['anims']
json.dump(meta, open(os.path.join(OUT, 'farmer3d_meta.json'), 'w'), indent=1)
print('done', meta['anchor'])
