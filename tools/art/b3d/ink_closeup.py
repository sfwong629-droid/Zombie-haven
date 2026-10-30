"""Direction B, ink style close-up: one detailed log cabin and the Farmer.

Run:  python3 tools/art/b3d/ink_closeup.py OUT_DIR [scene] [turn] [walk]
  scene -> OUT_DIR/ink_closeup.png   cabin + Farmer + props, 1600x1000
  turn  -> OUT_DIR/ink_farmer_turn.png   Farmer facing SE, SW, NW, NE
  walk  -> OUT_DIR/ink_farmer_walk_{se,ne}_NN.png  12-frame walk, plus a GIF
Farmer is about 4.75 heads tall (1.55 m): a grown-up, slightly big-headed.
Camera: orthographic, 45 deg turn, 45 deg tilt (same as the ink town mockup).
"""
import math, os, sys, random
import bpy
from mathutils import Vector
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import inkstyle
from inkstyle import ink

OUT = sys.argv[1]
JOBS = [a for a in sys.argv[2:] if a in ('scene', 'turn', 'walk')] or ['scene', 'turn', 'walk']
os.makedirs(OUT, exist_ok=True)
D = math.radians
R = random.Random(4)

bpy.ops.wm.read_factory_settings(use_empty=True)
S = bpy.context.scene

def obj(prim, loc, scale, m, rot=(0, 0, 0), parent=None, **kw):
    getattr(bpy.ops.mesh, 'primitive_' + prim + '_add')(**kw)
    o = bpy.context.object; o.scale = scale; o.rotation_euler = rot; o.data.materials.append(m)
    if parent is not None:
        o.parent = parent; o.location = Vector(loc) - Vector(parent['wp'])
    else:
        o.location = loc
    return o

def box(loc, size, m, rz=0, parent=None, rot=None):
    return obj('cube', loc, size, m, rot=rot or (0, 0, rz), parent=parent, size=1)

def rod(p0, p1, r, m, parent=None, seg=8, r1=None):
    p0, p1 = Vector(p0), Vector(p1); d = p1 - p0
    bpy.ops.mesh.primitive_cone_add(vertices=seg, radius1=r, radius2=r1 if r1 else r, depth=d.length)
    o = bpy.context.object; o.rotation_euler = d.to_track_quat('Z', 'Y').to_euler(); o.data.materials.append(m)
    mid = (p0 + p1) / 2
    if parent is not None: o.parent = parent; o.location = mid - Vector(parent['wp'])
    else: o.location = mid
    bpy.ops.object.shade_smooth_by_angle(angle=D(50))
    return o

def jit(v, a): return v + R.uniform(-a, a)

# ------------------------------------------------------------------ palette
LOG = ink('log', '#8a5a34', lines=[('X', 0.31, 0.05, None, 0.35)], speckle=0.22)
LOGEND = ink('logend', '#c99a62', lines=[('Z', 0.05, 0.12, '#8a5a34', 0.6)])
SHINGLE = [ink('sh1', '#b9532f', speckle=0.25), ink('sh2', '#a8482a', speckle=0.25), ink('sh3', '#c7623a', speckle=0.25)]
STONE = [ink('st1', '#9a968a'), ink('st2', '#86837a'), ink('st3', '#aaa596')]
PLANK = ink('plank', '#6a4428', lines=('X', 0.16))
WINDOW = ink('win', '#f2c46a', hatch=False, emit=('#ffcf70', 1.2))
FRAME = ink('frame', '#4f331d')
DIRT = ink('dirt', '#c4954e', flecks=0.45, fleck_scale=14, patches=0.2, speckle=0.25)
GRASS = ink('grass', '#a3a13e', flecks=0.55, fleck_scale=12, patches=0.25, speckle=0.3)
TUFT = [ink('tf1', '#6f7a2c'), ink('tf2', '#55692a'), ink('tf3', '#8a8a32')]
LEAF = [ink('lf' + c, c, hatch=False) for c in ('#d4752e', '#c2502a', '#e0b24a', '#b8642c')]
SOIL = ink('soil', '#5a3a22', flecks=0.4, fleck_scale=20)
CROP = ink('crop', '#6e9e3a'); CROP2 = ink('crop2', '#4f7d2d')
BARREL = ink('barrel', '#8a5a34', lines=('Z', 0.12)); HOOP = ink('hoop', '#4a4a44')
CRATE = ink('crate', '#b07a46', lines=('Z', 0.14))
LANTERN = ink('lantern', '#ffd890', hatch=False, emit=('#ffd890', 1.5))
IRON = ink('iron', '#3d3d3a')

# farmer
SKIN = ink('skin', '#e8b08a', hatch=False, speckle=0.08)
PLAID = ink('plaid', '#4a9640', lines=[('X', 0.15, 0.32, '#33702c', 0.8), ('Z', 0.15, 0.32, '#33702c', 0.55),
                                        ('X', 0.15, 0.07, '#1e3a1a', 0.75), ('Z', 0.15, 0.07, '#1e3a1a', 0.75)], speckle=0.12, hatch=False)
PANTS = ink('pants', '#7a4a26', speckle=0.2); BOOT = ink('boot', '#47291a')
STRAP = ink('strap', '#5a3519'); HAIR = ink('hair', '#d8a854', lines=('Z', 0.025, 0.25, '#8a6a2a', 0.6))
STRAW = ink('straw', '#e6c46c', lines=[('X', 0.03, 0.18, '#a8823a', 0.6)], speckle=0.2)
BAND = ink('band', '#3b7a2f'); EYE = ink('eye', '#1b1410', hatch=False, speckle=0)
CHEEK = ink('cheek', '#e08a72', hatch=False, speckle=0); STUB = ink('stub', '#c69a70', hatch=False)
WOOD = ink('wood', '#9a6a3c'); BLADE = ink('blade', '#8a8c88')

# ------------------------------------------------------------------ the Farmer (rigid parts on joint empties)
H = dict(ankle=0.08, knee=0.36, hip=0.66, waist=0.76, chest=1.04, neck=1.12, head=1.36, headr=0.165)

def empty(name, wp, parent=None):
    o = bpy.data.objects.new(name, None); S.collection.objects.link(o)
    o['wp'] = tuple(wp); o.parent = parent
    o.location = Vector(wp) - (Vector(parent['wp']) if parent is not None else Vector())
    o.rotation_mode = 'XYZ'; o.empty_display_size = 0.05
    return o

def farmer(root_loc=(0, 0, 0), hoe=True):
    root = empty('froot', root_loc)
    face = empty('fface', root_loc, root); face.location = (0, 0, 0)
    def W(x, y, z): return Vector(root_loc) + Vector((x, y, z))
    J = {}
    J['pelvis'] = empty('pelvis', W(0, 0, H['hip']), face)
    J['spine'] = empty('spine', W(0, 0, H['waist']), J['pelvis'])
    J['neck'] = empty('neck', W(0, 0, H['neck']), J['spine'])
    for s, n in ((1, 'L'), (-1, 'R')):
        J['sh' + n] = empty('sh' + n, W(s * 0.19, 0, H['chest'] + 0.02), J['spine'])
        J['el' + n] = empty('el' + n, W(s * 0.21, 0, H['chest'] - 0.22), J['sh' + n])
        J['wr' + n] = empty('wr' + n, W(s * 0.22, 0, H['chest'] - 0.43), J['el' + n])
        J['hp' + n] = empty('hp' + n, W(s * 0.09, 0, H['hip'] - 0.02), J['pelvis'])
        J['kn' + n] = empty('kn' + n, W(s * 0.095, 0, H['knee']), J['hp' + n])
        J['an' + n] = empty('an' + n, W(s * 0.095, 0, H['ankle']), J['kn' + n])
    P = J['pelvis']; SP = J['spine']; NK = J['neck']
    # hips and torso
    obj('cylinder', W(0, 0, H['hip'] + 0.02), (0.16, 0.12, 0.12), PANTS, parent=P, vertices=12, radius=1, depth=1)
    obj('cylinder', W(0, 0, H['waist'] - 0.01), (0.165, 0.125, 0.03), STRAP, parent=P, vertices=12, radius=1, depth=1)
    obj('cone', W(0, 0, (H['waist'] + H['chest']) / 2), (0.165, 0.12, H['chest'] - H['waist'] + 0.04), PLAID, parent=SP,
        vertices=12, radius1=1, radius2=1.22, depth=1)
    obj('uv_sphere', W(0, 0, H['chest'] + 0.02), (0.21, 0.14, 0.07), PLAID, parent=SP, segments=12, ring_count=8, radius=1)
    for s in (1, -1):
        box(W(s * 0.08, -0.128, (H['waist'] + H['chest']) / 2 + 0.02), (0.035, 0.012, 0.32), STRAP, parent=SP, rot=(D(6), 0, 0))
        box(W(s * 0.08, 0.13, (H['waist'] + H['chest']) / 2 + 0.02), (0.035, 0.012, 0.32), STRAP, parent=SP, rot=(D(-6), 0, 0))
    # head: big, round, dot eyes, rosy cheeks, stubble, straw hat
    hz = H['head']; hr = H['headr']
    obj('cylinder', W(0, 0, H['neck'] + 0.04), (0.055, 0.055, 0.1), SKIN, parent=NK, vertices=10, radius=1, depth=1)
    obj('uv_sphere', W(0, -0.005, hz), (hr * 0.95, hr, hr * 1.02), SKIN, parent=NK, segments=18, ring_count=12, radius=1)
    obj('uv_sphere', W(0, 0.03, hz + 0.035), (hr * 0.99, hr * 0.92, hr * 0.92), HAIR, parent=NK, segments=18, ring_count=12, radius=1)
    for s in (1, -1):
        obj('uv_sphere', W(s * hr * 0.3, -hr * 0.94, hz + hr * 0.16), (hr * 0.15, hr * 0.09, hr * 0.2), EYE, parent=NK, segments=8, ring_count=6, radius=1)
        obj('uv_sphere', W(s * hr * 0.55, -hr * 0.74, hz - hr * 0.2), (hr * 0.13, hr * 0.05, hr * 0.08), CHEEK, parent=NK, segments=8, ring_count=6, radius=1)
        obj('uv_sphere', W(s * hr * 0.97, 0, hz - 0.01), (hr * 0.13, hr * 0.2, hr * 0.24), SKIN, parent=NK, segments=8, ring_count=6, radius=1)
    obj('uv_sphere', W(0, -hr * 1.0, hz - hr * 0.12), (hr * 0.15, hr * 0.17, hr * 0.15), SKIN, parent=NK, segments=10, ring_count=6, radius=1)
    # straw hat with a ragged brim (jagged ring)
    bpy.ops.mesh.primitive_circle_add(vertices=28, radius=1, fill_type='NGON')
    brim = bpy.context.object
    for i, v in enumerate(brim.data.vertices):
        k = 1.0 + (0.09 if i % 2 else -0.02) + R.uniform(-0.04, 0.04); v.co.x *= k; v.co.y *= k
    sol = brim.modifiers.new('t', 'SOLIDIFY'); sol.thickness = 0.02
    brim.scale = (hr * 1.6, hr * 1.55, 1); brim.rotation_euler = (D(-26), D(3), 0); brim.data.materials.append(STRAW)
    brim.parent = NK; brim.location = W(0, 0.05, hz + hr * 0.78) - Vector(NK['wp'])
    obj('cone', W(0, 0.09, hz + hr * 1.12), (hr * 0.98, hr * 0.93, hr * 0.7), STRAW, parent=NK, vertices=14, radius1=1, radius2=0.78, depth=1, rot=(D(-26), 0, 0))
    obj('cylinder', W(0, 0.07, hz + hr * 0.88), (hr * 1.0, hr * 0.95, 0.03), BAND, parent=NK, vertices=14, radius=1, depth=1, rot=(D(-26), 0, 0))
    # limbs
    for s, n in ((1, 'L'), (-1, 'R')):
        sh, el, wr = J['sh' + n], J['el' + n], J['wr' + n]
        obj('uv_sphere', sh['wp'], (0.075,) * 3, PLAID, parent=sh, segments=10, ring_count=8, radius=1)
        rod(sh['wp'], el['wp'], 0.068, PLAID, parent=sh, r1=0.06)
        rod(el['wp'], Vector(el['wp']) + Vector((0, 0, -0.06)), 0.062, PLAID, parent=el, r1=0.064)   # rolled cuff
        rod(Vector(el['wp']) + Vector((0, 0, -0.05)), wr['wp'], 0.048, SKIN, parent=el, r1=0.042)
        obj('uv_sphere', Vector(wr['wp']) + Vector((0, 0, -0.05)), (0.055, 0.045, 0.062), SKIN, parent=wr, segments=10, ring_count=8, radius=1)
        hp, kn, an = J['hp' + n], J['kn' + n], J['an' + n]
        rod(hp['wp'], kn['wp'], 0.085, PANTS, parent=hp, r1=0.075)
        obj('uv_sphere', kn['wp'], (0.075,) * 3, PANTS, parent=kn, segments=10, ring_count=8, radius=1)
        rod(kn['wp'], Vector(an['wp']) + Vector((0, 0, 0.1)), 0.073, PANTS, parent=kn, r1=0.078)
        rod(Vector(an['wp']) + Vector((0, 0, 0.14)), Vector(an['wp']) + Vector((0, 0, -0.02)), 0.08, BOOT, parent=kn, r1=0.08)
        b = box(Vector(an['wp']) + Vector((0, -0.05, -0.05)), (0.12, 0.22, 0.07), BOOT, parent=an)
        bv = b.modifiers.new('b', 'BEVEL'); bv.width = 0.025; bv.segments = 2
    if hoe:
        wr = J['wrR']
        h = rod(Vector(wr['wp']) + Vector((0.02, 0.04, 0.62)), Vector(wr['wp']) + Vector((0.04, -0.1, -0.6)), 0.018, WOOD, parent=wr, seg=6)
        box(Vector(wr['wp']) + Vector((0.04, -0.17, -0.6)), (0.15, 0.14, 0.025), BLADE, parent=wr, rot=(D(-10), 0, 0))
    return root, face, J

POSE_J = ['pelvis', 'spine', 'neck', 'shL', 'shR', 'elL', 'elR', 'hpL', 'hpR', 'knL', 'knR', 'anL', 'anR']
def pose_apply(J, p):
    for k in POSE_J: J[k].rotation_euler = [D(v) for v in p.get(k, (0, 0, 0))]
    J['pelvis'].location.z = J['pelvis']['wp'][2] - J['pelvis'].parent['wp'][2] + p.get('bob', 0)

def stand():
    return {'shL': (0, -7, 0), 'shR': (0, 7, 0), 'elL': (-14, 0, 0), 'elR': (-14, 0, 0), 'neck': (-14, 0, 0)}

def hold_hoe():
    return {'shL': (0, -7, 0), 'elL': (-14, 0, 0), 'shR': (-10, 10, 0), 'elR': (-52, 0, 0), 'neck': (-14, 0, -6)}

def walk(t, hoe=True):
    ph = 2 * math.pi * t; sn, cs = math.sin(ph), math.cos(ph); p = {}
    for n, sg in (('L', 1), ('R', -1)):
        th = 26 * sg * sn; kn = 6 + 46 * max(0.0, sg * cs) ** 1.4
        p['hp' + n] = (-th, 0, 0); p['kn' + n] = (kn, 0, 0); p['an' + n] = (-(th - kn) * 0.35 - kn * 0.45, 0, 0)
        p['sh' + n] = (20 * sg * sn, (-7 if n == 'L' else 7), 0); p['el' + n] = (-(18 + 14 * max(0.0, -sg * sn)), 0, 0)
    if hoe:   # the hoe arm stays at the shoulder, swinging a little
        p['shR'] = (-10 + 4 * sn, 10, 0); p['elR'] = (-52, 0, 0)
    p['bob'] = 0.02 * math.cos(2 * ph) - 0.008
    p['pelvis'] = (0, 0, 6 * sn); p['spine'] = (4, 0, -9 * sn); p['neck'] = (-14, 0, 4 * sn)
    return p

FACE = {'se': 90, 'sw': 0, 'nw': -90, 'ne': 180}

# ------------------------------------------------------------------ camera / light
def camera(ppm, w, h, target):
    cam = bpy.data.objects.new('cam', bpy.data.cameras.new('cam')); S.collection.objects.link(cam)
    cam.data.type = 'ORTHO'; cam.data.ortho_scale = max(w, h) / ppm; cam.rotation_euler = (D(45), 0, D(45))
    look = Vector((0, 0, -1)); look.rotate(cam.rotation_euler); cam.location = Vector(target) - look * 30
    cam.data.clip_end = 80; S.camera = cam
    S.render.resolution_x, S.render.resolution_y = w, h
    return cam

def lights():
    sun = bpy.data.objects.new('sun', bpy.data.lights.new('sun', 'SUN')); S.collection.objects.link(sun)
    sun.data.energy = 3.0; sun.data.angle = D(3); sun.data.color = (1.0, 0.95, 0.85)
    d = Vector((0.7, -0.25, -0.75)).normalized(); sun.rotation_euler = (-d).to_track_quat('Z', 'Y').to_euler()
    w = bpy.data.worlds.new('w'); S.world = w; w.use_nodes = True
    w.node_tree.nodes['Background'].inputs['Color'].default_value = (0.5, 0.5, 0.5, 1)
    w.node_tree.nodes['Background'].inputs['Strength'].default_value = 0.6

S.render.engine = 'BLENDER_EEVEE'
S.eevee.taa_render_samples = 16
inkstyle.setup(S, line_px=2.4, wobble=1.2)
lights()

def render(path, transparent=False):
    S.render.film_transparent = transparent
    S.render.image_settings.file_format = 'PNG'; S.render.image_settings.color_mode = 'RGBA'
    S.render.filepath = path; bpy.ops.render.render(write_still=True)

# ------------------------------------------------------------------ scene: cabin close-up
def cabin(cx, cy, w=3.4, d=2.6, h=1.9):
    logr = 0.13; n = int(h / (logr * 2))
    for i in range(n):
        z = logr + i * logr * 2
        for (p0, p1) in (((cx - w / 2 - 0.22, cy - d / 2), (cx + w / 2 + 0.22, cy - d / 2)),
                         ((cx - w / 2 - 0.22, cy + d / 2), (cx + w / 2 + 0.22, cy + d / 2))):
            rod((p0[0] + R.uniform(-.04, .04), p0[1], z), (p1[0] + R.uniform(-.04, .04), p1[1], z), jit(logr, 0.01), LOG, seg=9)
        for (p0, p1) in (((cx - w / 2, cy - d / 2 - 0.2), (cx - w / 2, cy + d / 2 + 0.2)),
                         ((cx + w / 2, cy - d / 2 - 0.2), (cx + w / 2, cy + d / 2 + 0.2))):
            rod((p0[0], p0[1] + R.uniform(-.04, .04), z + logr * 0.9), (p1[0], p1[1] + R.uniform(-.04, .04), z + logr * 0.9), jit(logr, 0.01), LOG, seg=9)
    # gable roof of overlapping shingle rows (ridge along X)
    top = n * logr * 2 + 0.05; rise = 1.15; half = d / 2 + 0.35; L = w + 0.7
    rows = 9; slope = math.atan2(rise, half)
    for side in (-1, 1):
        for r in range(rows):
            f = (r + 0.5) / rows
            y = cy + side * half * (1 - f); z = top + rise * f
            cols = 11
            for c in range(cols):
                x = cx - L / 2 + (c + 0.5 + (0.5 if r % 2 else 0)) * L / cols
                if x > cx + L / 2: continue
                box((jit(x, 0.02), y, z), (L / cols * 0.97, half / rows * 1.35, 0.035), R.choice(SHINGLE),
                    rot=(-side * slope + R.uniform(-.03, .03), 0, R.uniform(-.03, .03)))
    box((cx, cy, top + rise + 0.02), (L, 0.16, 0.08), ink('ridge', '#8a3a22'))
    # gable ends: planks
    for gx in (cx - w / 2 - 0.02, cx + w / 2 + 0.02):
        v = [(0, -d / 2, 0), (0, d / 2, 0), (0, 0, rise)]
        me = bpy.data.meshes.new('gable'); me.from_pydata(v, [], [(0, 1, 2)]); me.update()
        g = bpy.data.objects.new('gable', me); S.collection.objects.link(g); g.location = (gx, cy, top); me.materials.append(PLANK)
        sol = g.modifiers.new('s', 'SOLIDIFY'); sol.thickness = 0.06
    # chimney of stones
    chx, chy = cx + w / 2 - 0.5, cy + 0.35
    for i in range(14):
        for j in range(2):
            box((chx + (j - 0.5) * 0.2 + R.uniform(-.02, .02), chy + R.uniform(-.02, .02), top - 0.4 + i * 0.13),
                (0.2, 0.4, 0.13), R.choice(STONE), rz=R.uniform(-.06, .06))
    # front (-Y) door and windows, side window
    fy = cy - d / 2 - logr
    box((cx - 0.3, fy - 0.01, 0.75), (0.75, 0.06, 1.45), PLANK)
    box((cx - 0.3, fy - 0.05, 1.5), (0.9, 0.08, 0.1), FRAME)
    obj('uv_sphere', (cx - 0.05, fy - 0.07, 0.75), (0.04,) * 3, IRON, segments=8, ring_count=6, radius=1)
    for wx in (cx + 0.75, cx - 1.25):
        box((wx, fy - 0.01, 1.1), (0.55, 0.05, 0.5), WINDOW)
        for (dx, dz, sx, sz) in ((0, 0.28, 0.66, 0.08), (0, -0.28, 0.7, 0.1), (-0.3, 0, 0.07, 0.6), (0.3, 0, 0.07, 0.6), (0, 0, 0.04, 0.5), (0, 0, 0.55, 0.04)):
            box((wx + dx, fy - 0.05, 1.1 + dz), (sx, 0.06, sz), FRAME)
    sx_ = cx + w / 2 + logr
    box((sx_ + 0.01, cy - 0.2, 1.1), (0.05, 0.5, 0.45), WINDOW)
    for (dy, dz, sy, sz) in ((0, 0.26, 0.6, 0.07), (0, -0.26, 0.62, 0.09), (-0.28, 0, 0.06, 0.55), (0.28, 0, 0.06, 0.55), (0, 0, 0.04, 0.45)):
        box((sx_ + 0.04, cy - 0.2 + dy, 1.1 + dz), (0.06, sy, sz), FRAME)
    # porch step and props
    box((cx - 0.3, fy - 0.35, 0.08), (1.1, 0.45, 0.16), PLANK)
    return fy

def firewood(x, y):
    for r in range(4):
        for c in range(6 - r):
            yy = y + (c - (5 - r) / 2) * 0.17
            rod((x - 0.35, yy, 0.09 + r * 0.15), (x + 0.35, yy, 0.09 + r * 0.15), jit(0.075, 0.01), LOG, seg=7)
            for e in (-1, 1):
                obj('cylinder', (x + e * 0.351, yy, 0.09 + r * 0.15), (0.07, 0.07, 0.005), LOGEND, vertices=7, radius=1, depth=1, rot=(0, D(90), 0))

def barrel(x, y):
    obj('cylinder', (x, y, 0.42), (0.27, 0.27, 0.84), BARREL, vertices=14, radius=1, depth=1)
    for z in (0.15, 0.69):
        obj('cylinder', (x, y, z), (0.285, 0.285, 0.05), HOOP, vertices=14, radius=1, depth=1)

def crate(x, y, s, rz, z0=0):
    box((x, y, z0 + s / 2), (s, s, s), CRATE, rz=rz)
    box((x, y, z0 + s / 2), (s * 1.02, s * 0.15, s * 1.02), FRAME, rz=rz + D(0))

def tufts(n, area, avoid=None):
    for _ in range(n):
        x, y = R.uniform(*area[0]), R.uniform(*area[1])
        if avoid and avoid(x, y): continue
        h = R.uniform(0.12, 0.24); m = R.choice(TUFT)
        for k in range(4):
            obj('cone', (x + R.uniform(-.05, .05), y + R.uniform(-.05, .05), h / 2), (0.022, 0.022, h), m, vertices=3, radius1=1, depth=1,
                rot=(R.uniform(-.55, .55), R.uniform(-.55, .55), R.uniform(0, 3)))

def leaves(n, area):
    for _ in range(n):
        x, y = R.uniform(*area[0]), R.uniform(*area[1])
        obj('cylinder', (x, y, 0.012), (0.08, 0.05, 0.01), R.choice(LEAF), vertices=5, radius=1, depth=1, rot=(0, 0, R.uniform(0, 3)))

if 'scene' in JOBS:
    obj('plane', (0, 0, 0), (1, 1, 1), GRASS, size=40)
    obj('cylinder', (0.2, -0.2, 0.004), (4.6, 3.8, 0.004), DIRT, vertices=24, radius=1, depth=1)
    fy = cabin(0.4, 1.2)
    firewood(2.9, 0.1); barrel(-1.85, -0.35); crate(-2.35, 0.1, 0.5, 0.2); crate(-2.3, 0.15, 0.4, 0.5, z0=0.5)
    # lantern post
    box((1.5, -1.0, 0.8), (0.08, 0.08, 1.6), FRAME); box((1.62, -1.0, 1.55), (0.3, 0.05, 0.05), FRAME)
    obj('cube', (1.74, -1.0, 1.38), (0.12, 0.12, 0.17), LANTERN, size=1)
    # crop bed
    box((-0.6, -2.4, 0.06), (1.9, 1.0, 0.12), SOIL)
    for i in range(6):
        for j in range(2):
            obj('ico_sphere', (-1.35 + i * 0.3, -2.62 + j * 0.42, 0.2), (0.13, 0.13, 0.1), CROP if (i + j) % 2 else CROP2, subdivisions=1, radius=1)
    root, face, J = farmer((0.95, -2.1, 0))
    face.rotation_euler = (0, 0, D(150)); pose_apply(J, hold_hoe())
    tufts(180, ((-7, 7), (-7, 7)), avoid=lambda x, y: ((x - 0.2) / 4.4) ** 2 + ((y + 0.2) / 3.6) ** 2 < 1)
    leaves(160, ((-7, 7), (-7, 7)))
    camera(150, 1600, 1000, (0.2, -0.2, 0.9))
    p = os.path.join(OUT, 'ink_closeup.png'); render(p)
    inkstyle.paper(p, strength=0.5)
    print('scene done', flush=True)

if 'turn' in JOBS or 'walk' in JOBS:
    for o in list(bpy.data.objects):
        if o.type != 'LIGHT': bpy.data.objects.remove(o, do_unlink=True)
    root, face, J = farmer((0, 0, 0), hoe=False)
    cam = camera(260, 420, 520, (0, 0, 0.8))
    from PIL import Image
    if 'turn' in JOBS:
        sheet = Image.new('RGBA', (420 * 4, 520), (0, 0, 0, 0))
        for i, v in enumerate(('se', 'sw', 'nw', 'ne')):
            face.rotation_euler = (0, 0, D(FACE[v])); pose_apply(J, stand())
            p = os.path.join(OUT, f'_t_{v}.png'); render(p, transparent=True)
            sheet.paste(Image.open(p), (i * 420, 0)); os.remove(p)
        sp = os.path.join(OUT, 'ink_farmer_turn.png'); sheet.save(sp)
        bg = Image.new('RGBA', sheet.size, (236, 222, 190, 255)); bg.alpha_composite(sheet); bg.save(sp)
        inkstyle.paper(sp, strength=0.6)
        print('turn done', flush=True)
    if 'walk' in JOBS:
        NF = 12; frames = {}
        for v in ('se', 'ne'):
            face.rotation_euler = (0, 0, D(FACE[v])); frames[v] = []
            for i in range(NF):
                pose_apply(J, walk(i / NF, hoe=False))
                p = os.path.join(OUT, f'ink_farmer_walk_{v}_{i:02d}.png'); render(p, transparent=True); frames[v].append(p)
        gif = []
        for i in range(NF):
            fr = Image.new('RGBA', (840, 520), (236, 222, 190, 255))
            fr.alpha_composite(Image.open(frames['se'][i]), (0, 0)); fr.alpha_composite(Image.open(frames['ne'][i]), (420, 0))
            fp = os.path.join(OUT, f'_g_{i:02d}.png'); fr.save(fp); inkstyle.paper(fp, strength=0.6, seed=3)
            gif.append(Image.open(fp).convert('RGB')); os.remove(fp)
        gif[0].save(os.path.join(OUT, 'ink_farmer_walk.gif'), save_all=True, append_images=gif[1:], duration=1000 // 12, loop=0)
        print('walk done', flush=True)
