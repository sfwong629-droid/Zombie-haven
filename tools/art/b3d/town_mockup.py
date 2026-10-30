"""Direction B style frames: one walled town, rendered in different styles.

Run:  python3 tools/art/b3d/town_mockup.py STYLE OUT.png      STYLE = gritty | night | toy
Same layout in every style so they compare fairly. Survivors are shorter than
the first 3D Farmer test (about 1.6 m, or a chunky 1.35 m in the toy style).
Camera turn is 45 deg like the game; tilt is per style.
"""
import math, sys, random
import bpy
from mathutils import Vector

STYLE = sys.argv[1] if len(sys.argv) > 1 else 'gritty'
OUT = sys.argv[2] if len(sys.argv) > 2 else f'{STYLE}.png'
W, H = 1600, 1000
D = math.radians
random.seed(11)

# ------------------------------------------------------------------ styles
STY = {
    'gritty': dict(tilt=45, ppm=56, view='AgX', look='AgX - Medium High Contrast', bevel=0.02,
                   grass=('#4f5a2c', '#66703a', '#7a7d47'), dirt=('#5a4630', '#76603f'),
                   wood=('#6a5440', '#8a7058', '#9b8468'), wood_d=('#4a3a2c', '#5a4836'),
                   metal=('#5c5f5c', '#7a7266'), rust=('#6e4a30', '#8b5d3a'), canvas=('#cfc8b2', '#e2dcc8'),
                   roof=('#5b4a3c', '#6d5a48'), leaf=('#3f5228', '#56693a'), rock=('#6f6d66', '#8d8a80'),
                   sun=(3.0, (1.0, 0.92, 0.8)), world=((0.45, 0.47, 0.5), 0.7), night=False,
                   body=dict(hip=0.78, torso=0.47, head=0.14, bw=0.19, limb=1.0)),
    'toy': dict(tilt=30, ppm=64, view='Standard', look='None', bevel=0.06,
                grass=('#7fbf4a', '#93cc56', '#a6d867'), dirt=('#d9a86a', '#e6bb80'),
                wood=('#b07848', '#c98d58', '#d49c66'), wood_d=('#8a5a34', '#9c6a40'),
                metal=('#8fa3ad', '#a7b9c2'), rust=('#d0623e', '#e0744d'), canvas=('#f2f0e8', '#ffffff'),
                roof=('#d3573b', '#e2694a'), leaf=('#4d9a3a', '#63b24a'), rock=('#a8a8a0', '#c2c0b6'),
                sun=(3.6, (1.0, 0.97, 0.9)), world=((0.6, 0.66, 0.76), 0.95), night=False, grid=True,
                body=dict(hip=0.42, torso=0.36, head=0.23, bw=0.19, limb=1.35)),
}
STY['ink'] = dict(tilt=45, ppm=64, view='Standard', look='None', bevel=0.0,
                  grass=('#8f9236', '#a3a13e', '#b5a646'), dirt=('#c4954e', '#d4a65c'),
                  wood=('#8a5a34',), wood_d=('#6a4428',), metal=('#7d7f78',), rust=('#a8552f',), canvas=('#e9dfc4',),
                  roof=('#b9532f',), leaf=('#3f5e36',), rock=('#9a968a',),
                  sun=(3.0, (1.0, 0.95, 0.85)), world=((0.5, 0.5, 0.5), 0.6), night=False, ink=True,
                  body=dict(hip=0.62, torso=0.44, head=0.17, bw=0.19, limb=1.15))
STY['night'] = dict(STY['gritty'], sun=(0.6, (0.55, 0.65, 1.0)), world=((0.07, 0.09, 0.16), 1.0),
                    night=True, view='AgX', look='AgX - Base Contrast')
st = STY[STYLE]
B = st['body']

def lin(h):
    h = h.lstrip('#'); c = [int(h[i:i + 2], 16) / 255 for i in (0, 2, 4)]
    return [(x / 12.92 if x <= 0.04045 else ((x + 0.055) / 1.055) ** 2.4) for x in c] + [1]

bpy.ops.wm.read_factory_settings(use_empty=True)
S = bpy.context.scene

# ------------------------------------------------------------------ materials
_mc = {}
def M(name, cols, scale=5, rough=0.85, wave=None, emit=None, planks=False):
    key = (name, tuple(cols) if isinstance(cols, (list, tuple)) else cols)
    if key in _mc: return _mc[key]
    m = bpy.data.materials.new(name); m.use_nodes = True; nt = m.node_tree
    b = nt.nodes['Principled BSDF']; b.inputs['Roughness'].default_value = rough
    b.inputs['Specular IOR Level'].default_value = 0.2
    if isinstance(cols, str): cols = (cols,)
    if len(cols) == 1:
        b.inputs['Base Color'].default_value = lin(cols[0])
    else:
        if wave:
            t = nt.nodes.new('ShaderNodeTexWave'); t.inputs['Scale'].default_value = scale
            t.inputs['Distortion'].default_value = wave
            tc = nt.nodes.new('ShaderNodeTexCoord'); nt.links.new(tc.outputs['Object'], t.inputs['Vector'])
            if planks: t.bands_direction = 'Z'
        else:
            t = nt.nodes.new('ShaderNodeTexNoise'); t.inputs['Scale'].default_value = scale; t.inputs['Detail'].default_value = 3
        r = nt.nodes.new('ShaderNodeValToRGB'); el = r.color_ramp.elements
        el[0].position, el[0].color = 0.3, lin(cols[0]); el[1].position, el[1].color = 0.7, lin(cols[-1])
        if len(cols) == 3: e = el.new(0.5); e.color = lin(cols[1])
        nt.links.new(t.outputs['Fac'], r.inputs[0]); nt.links.new(r.outputs[0], b.inputs['Base Color'])
    if emit:
        b.inputs['Emission Color'].default_value = lin(emit[0]); b.inputs['Emission Strength'].default_value = emit[1]
    _mc[key] = m
    return m

def ground_mat():
    """Grass outside, trodden dirt inside the walls (a square mask), patchy where they meet."""
    m = bpy.data.materials.new('ground'); m.use_nodes = True; nt = m.node_tree
    b = nt.nodes['Principled BSDF']; b.inputs['Roughness'].default_value = 0.95; b.inputs['Specular IOR Level'].default_value = 0.1
    L = nt.links.new
    tc = nt.nodes.new('ShaderNodeTexCoord')
    n1 = nt.nodes.new('ShaderNodeTexNoise'); n1.inputs['Scale'].default_value = 0.35; n1.inputs['Detail'].default_value = 3
    n2 = nt.nodes.new('ShaderNodeTexNoise'); n2.inputs['Scale'].default_value = 6; n2.inputs['Detail'].default_value = 6
    L(tc.outputs['Object'], n1.inputs['Vector']); L(tc.outputs['Object'], n2.inputs['Vector'])
    g = nt.nodes.new('ShaderNodeValToRGB'); e = g.color_ramp.elements
    e[0].position, e[0].color = 0.35, lin(st['grass'][0]); e[1].position, e[1].color = 0.65, lin(st['grass'][2])
    x = e.new(0.5); x.color = lin(st['grass'][1]); L(n1.outputs['Fac'], g.inputs[0])
    d = nt.nodes.new('ShaderNodeValToRGB'); e = d.color_ramp.elements
    e[0].position, e[0].color = 0.4, lin(st['dirt'][0]); e[1].position, e[1].color = 0.6, lin(st['dirt'][1]); L(n2.outputs['Fac'], d.inputs[0])
    # square mask: max(|x|,|y|) < 6.6, edge broken up by noise
    sx = nt.nodes.new('ShaderNodeSeparateXYZ'); L(tc.outputs['Object'], sx.inputs[0])
    ax = nt.nodes.new('ShaderNodeMath'); ax.operation = 'ABSOLUTE'; L(sx.outputs['X'], ax.inputs[0])
    ay = nt.nodes.new('ShaderNodeMath'); ay.operation = 'ABSOLUTE'; L(sx.outputs['Y'], ay.inputs[0])
    mx = nt.nodes.new('ShaderNodeMath'); mx.operation = 'MAXIMUM'; L(ax.outputs[0], mx.inputs[0]); L(ay.outputs[0], mx.inputs[1])
    nb = nt.nodes.new('ShaderNodeMath'); nb.operation = 'MULTIPLY_ADD'; nb.inputs[1].default_value = 2.2; nb.inputs[2].default_value = -1.1
    L(n2.outputs['Fac'], nb.inputs[0])
    ad = nt.nodes.new('ShaderNodeMath'); ad.operation = 'ADD'; L(mx.outputs[0], ad.inputs[0]); L(nb.outputs[0], ad.inputs[1])
    mr = nt.nodes.new('ShaderNodeMapRange'); mr.inputs['From Min'].default_value = 5.6; mr.inputs['From Max'].default_value = 6.8
    L(ad.outputs[0], mr.inputs['Value'])
    mix = nt.nodes.new('ShaderNodeMix'); mix.data_type = 'RGBA'
    L(mr.outputs['Result'], mix.inputs['Factor']); L(d.outputs[0], mix.inputs['A']); L(g.outputs[0], mix.inputs['B'])
    out = mix.outputs['Result']
    if st.get('grid'):   # faint 2 m build grid, the town-builder cue
        gx = nt.nodes.new('ShaderNodeMath'); gx.operation = 'PINGPONG'; gx.inputs[1].default_value = 1.0; L(sx.outputs['X'], gx.inputs[0])
        gy = nt.nodes.new('ShaderNodeMath'); gy.operation = 'PINGPONG'; gy.inputs[1].default_value = 1.0; L(sx.outputs['Y'], gy.inputs[0])
        mn = nt.nodes.new('ShaderNodeMath'); mn.operation = 'MINIMUM'; L(gx.outputs[0], mn.inputs[0]); L(gy.outputs[0], mn.inputs[1])
        lt = nt.nodes.new('ShaderNodeMath'); lt.operation = 'LESS_THAN'; lt.inputs[1].default_value = 0.025; L(mn.outputs[0], lt.inputs[0])
        k = nt.nodes.new('ShaderNodeMath'); k.operation = 'MULTIPLY'; k.inputs[1].default_value = 0.18; L(lt.outputs[0], k.inputs[0])
        m2 = nt.nodes.new('ShaderNodeMix'); m2.data_type = 'RGBA'; m2.inputs['B'].default_value = (1, 1, 1, 1)
        L(k.outputs[0], m2.inputs['Factor']); L(out, m2.inputs['A']); out = m2.outputs['Result']
    L(out, b.inputs['Base Color'])
    return m

INK = st.get('ink', False)
if INK:
    import os as _os; sys.path.insert(0, _os.path.dirname(_os.path.abspath(__file__)))
    import inkstyle
    _plain_M = M
    def M(name, cols, scale=5, rough=0.85, wave=None, emit=None, planks=False):
        if isinstance(cols, str): cols = (cols,)
        base = cols[len(cols) // 2]
        lines = ('Z', 0.26) if planks else None
        return inkstyle.ink(name, base, emit=emit, lines=lines)
GROUND = ground_mat()
WOOD = M('wood', st['wood'], 0.6, wave=3); WOODD = M('woodd', st['wood_d'], 0.8, wave=2)
WALL = M('wall', st['wood'], 0.45, wave=0.6, planks=True)
METAL = M('metal', st['metal'], 8, 0.5); RUST = M('rust', st['rust'], 6, 0.7)
CANVAS = M('canvas', st['canvas'], 4); ROOF = M('roof', st['roof'], 0.9, wave=0.4)
if INK: ROOF = inkstyle.ink('roof', st['roof'][0], lines=('X', 0.3))
LEAF = M('leaf', st['leaf'], 6); ROCK = M('rock', st['rock'], 5); TRUNK = M('trunk', st['wood_d'], 6)
SOIL = M('soil', ('#3d2a1b', '#5a3d27') if STYLE != 'toy' else ('#8a5a36', '#a06c42'), 7)
CROP = M('crop', ('#4f7d2d', '#6e9e3a') if STYLE != 'toy' else ('#5cb843', '#78cc55'), 8)
RED = M('red', '#b8312b' if STYLE != 'toy' else '#e5483a', rough=0.6)
GLASS = M('glass', '#2a3036', rough=0.2, emit=('#ffc070', 6.0) if st['night'] else None)
FIRE = M('fire', '#ff8a2a', emit=('#ff8a2a', 12 if st['night'] else 5))
FIRE2 = M('fire2', '#ffd060', emit=('#ffd060', 16 if st['night'] else 6))
LAMP = M('lamp', '#ffe0a0', emit=('#ffd890', 10 if st['night'] else 0.6))

def obj(prim, loc, scale, m, rot=(0, 0, 0), bevel=None, smooth=False, **kw):
    getattr(bpy.ops.mesh, 'primitive_' + prim + '_add')(**kw)
    o = bpy.context.object; o.location = loc; o.scale = scale; o.rotation_euler = rot
    o.data.materials.append(m)
    bv = st['bevel'] if bevel is None else bevel
    if bv and prim == 'cube':
        md = o.modifiers.new('bv', 'BEVEL'); md.width = bv; md.segments = 2
    if smooth: bpy.ops.object.shade_smooth()
    return o

def box(loc, size, m, rz=0, bevel=None): return obj('cube', loc, size, m, rot=(0, 0, rz), bevel=bevel, size=1)

def prism(center_xy, base_z, length, half_w, h, m, axis='X', rz=0):
    """Triangular prism (gable roof or tent), ridge along `axis`, built from explicit vertices."""
    L2 = length / 2
    v = [(-L2, -half_w, 0), (-L2, half_w, 0), (-L2, 0, h), (L2, -half_w, 0), (L2, half_w, 0), (L2, 0, h)]
    f = [(0, 2, 1), (3, 4, 5), (0, 3, 5, 2), (1, 2, 5, 4), (0, 1, 4, 3)]
    me = bpy.data.meshes.new('prism'); me.from_pydata(v, [], f); me.update()
    o = bpy.data.objects.new('prism', me); S.collection.objects.link(o)
    o.location = (center_xy[0], center_xy[1], base_z); o.rotation_euler = (0, 0, (D(90) if axis == 'Y' else 0) + rz)
    me.materials.append(m)
    return o

# ------------------------------------------------------------------ ground
if INK:
    obj('plane', (0, 0, 0), (1, 1, 1), inkstyle.ink('grass', st['grass'][1], flecks=0.55, fleck_scale=26, patches=0.28, speckle=0.3), size=80)
    obj('plane', (0, 0, 0.004), (1, 1, 1), inkstyle.ink('dirt', st['dirt'][1], flecks=0.45, fleck_scale=30, patches=0.18, speckle=0.25), size=13.6)
    # grass tufts and fallen leaves: lots of small marks give the drawn texture
    _t = [inkstyle.ink('tuft1', '#6f7a2c'), inkstyle.ink('tuft2', '#55692a'), inkstyle.ink('tuft3', '#8a8a32')]
    _lv = [inkstyle.ink('lf' + c, c, hatch=False) for c in ('#d4752e', '#c2502a', '#e0b24a', '#b8642c')]
    _r = random.Random(5)
    for _ in range(900):
        x, y = _r.uniform(-16, 16), _r.uniform(-16, 16)
        if max(abs(x), abs(y)) < 7.3: continue
        h = _r.uniform(0.12, 0.26); m = _r.choice(_t)
        for k in range(3):
            obj('cone', (x + _r.uniform(-.07, .07), y + _r.uniform(-.07, .07), h / 2), (0.03, 0.03, h), m, vertices=3, radius1=1, depth=1,
                rot=(_r.uniform(-.5, .5), _r.uniform(-.5, .5), _r.uniform(0, 3)), bevel=0)
    for _ in range(500):
        x, y = _r.uniform(-16, 16), _r.uniform(-16, 16)
        if max(abs(x), abs(y)) < 6.4 and _r.random() < 0.8: continue
        obj('cylinder', (x, y, 0.012), (0.09, 0.06, 0.01), _r.choice(_lv), vertices=5, radius=1, depth=1, rot=(0, 0, _r.uniform(0, 3)))
    for _ in range(140):   # pebbles and dirt clods inside
        x, y = _r.uniform(-6.6, 6.6), _r.uniform(-6.6, 6.6)
        obj('ico_sphere', (x, y, 0.02), (0.06, 0.05, 0.03), inkstyle.ink('peb', '#8f7f66'), subdivisions=1, radius=1)
else:
    obj('plane', (0, 0, 0), (1, 1, 1), GROUND, size=80)

# ------------------------------------------------------------------ walls
WL = 7.0
def palisade(p0, p1, step=0.34, hgt=1.9):
    p0, p1 = Vector(p0), Vector(p1); n = int((p1 - p0).length / step)
    for i in range(n + 1):
        p = p0 + (p1 - p0) * (i / n); h = hgt + random.uniform(-0.12, 0.08)
        obj('cylinder', (p.x, p.y, h / 2), (0.15, 0.15, h), WOOD if i % 3 else WOODD, vertices=7, radius=1, depth=1,
            rot=(random.uniform(-.03, .03), random.uniform(-.03, .03), 0))
        obj('cone', (p.x, p.y, h + 0.12), (0.15, 0.15, 0.25), WOODD, vertices=7, radius1=1, depth=1)
def fence(p0, p1, gap=None, step=1.4):
    p0, p1 = Vector(p0), Vector(p1); d = p1 - p0; L = d.length; u = d / L; n = int(L / step)
    segs = [(0, L)] if not gap else [(0, gap[0]), (gap[1], L)]
    for a, b in segs:
        k = max(1, round((b - a) / step))
        for i in range(k + 1):
            p = p0 + u * (a + (b - a) * i / k)
            box((p.x, p.y, 0.5), (0.14, 0.14, 1.0), WOODD)
        mid = p0 + u * ((a + b) / 2); rz = math.atan2(u.y, u.x)
        for z in (0.4, 0.82):
            box((mid.x, mid.y, z), (b - a, 0.06, 0.12), WOOD, rz=rz)
palisade((-WL, -WL), (-WL, WL)); palisade((-WL, WL), (WL, WL))
fence((WL, WL), (WL, -WL)); fence((-WL, -WL), (WL, -WL), gap=(5.8, 8.2))
# gate posts
for x in (-1.25, 1.25):
    box((x, -WL, 1.2), (0.25, 0.25, 2.4), WOODD)
box((0, -WL, 2.35), (2.8, 0.22, 0.2), WOODD)

# watchtower, back corner
tx, ty = -5.8, 5.8
for dx in (-0.8, 0.8):
    for dy in (-0.8, 0.8):
        box((tx + dx, ty + dy, 1.6), (0.16, 0.16, 3.2), WOODD)
box((tx, ty, 3.05), (2.0, 2.0, 0.14), WOOD)
for dx, dy, sx, sy in ((0, -0.95, 2.0, 0.08), (0.95, 0, 0.08, 2.0), (0, 0.95, 2.0, 0.08), (-0.95, 0, 0.08, 2.0)):
    box((tx + dx, ty + dy, 3.45), (sx, sy, 0.1), WOOD)
for dx in (-0.9, 0.9):
    for dy in (-0.9, 0.9):
        box((tx + dx, ty + dy, 3.7), (0.1, 0.1, 1.3), WOODD)
obj('cone', (tx, ty, 4.65), (1.55, 1.55, 0.8), ROOF, vertices=4, radius1=1, depth=1, rot=(0, 0, D(45)))

# ------------------------------------------------------------------ buildings
# medical tent (back left): white canvas, red cross on the front end only
mx, my = -3.6, 3.4
prism((mx, my), 0.0, 2.6, 1.15, 1.7, CANVAS, axis='Y')
box((mx, my - 1.31, 0.75), (0.5, 0.02, 0.14), RED, bevel=0); box((mx, my - 1.31, 0.75), (0.14, 0.02, 0.5), RED, bevel=0)
for dy in (-1.3, 1.3): box((mx, my + dy, 0.85), (0.06, 0.06, 1.7), WOODD, bevel=0)

# workshop shed (front left): plank walls, rusty tin roof, workbench
wx, wy = -3.6, -3.4
box((wx, wy, 0.9), (2.8, 2.2, 1.8), WALL)
prism((wx, wy), 1.8, 3.1, 1.35, 0.8, RUST, axis='X')
box((wx + 1.41, wy, 0.8), (0.03, 0.9, 1.5), WOODD, bevel=0)                         # door
box((wx + 1.9, wy - 0.3, 0.45), (0.6, 1.4, 0.08), WOOD)                              # bench top
for dy in (-0.9, 0.3): box((wx + 1.9, wy + dy, 0.22), (0.5, 0.08, 0.44), WOODD)
box((wx + 1.9, wy - 0.6, 0.56), (0.25, 0.3, 0.15), METAL)                            # toolbox
for i, (dx, dy) in enumerate(((0.2, -1.6), (0.75, -1.65), (0.45, -1.7))):            # crates
    box((wx + dx, wy + dy, 0.28 + (0.55 if i == 2 else 0)), (0.55, 0.55, 0.55), WOOD, rz=random.uniform(-.2, .2))
for dx, dy in ((-1.7, -1.0), (-1.7, -0.4)):
    obj('cylinder', (wx + dx, wy + dy, 0.4), (0.26, 0.26, 0.8), RUST, vertices=14, radius=1, depth=1, smooth=True)

# cabin (back right): log walls, gable roof, chimney, lit windows at night
cx, cy = 3.0, 3.6
box((cx, cy, 1.0), (3.2, 2.6, 2.0), WALL)
prism((cx, cy), 2.0, 3.6, 1.55, 1.2, ROOF, axis='X')
box((cx + 1.0, cy + 0.6, 3.0), (0.4, 0.4, 1.2), ROCK)
box((cx + 0.2, cy - 1.31, 0.8), (0.8, 0.04, 1.5), WOODD, bevel=0)                  # door, front
for dx in (-1.0, 1.0): box((cx + dx, cy - 1.31, 1.1), (0.55, 0.04, 0.5), GLASS, bevel=0)
box((cx + 1.61, cy, 1.1), (0.04, 0.6, 0.5), GLASS, bevel=0)

# farm plots (front right)
fx, fy = 3.4, -3.0
for k, dx in enumerate((-1.0, 1.0)):
    box((fx + dx, fy, 0.06), (1.7, 2.6, 0.12), SOIL, bevel=0.03)
    for r in range(4):
        for c in range(3):
            x, y = fx + dx - 0.55 + c * 0.55, fy - 1.0 + r * 0.66
            if k == 0:
                obj('ico_sphere', (x, y, 0.2), (0.17, 0.17, 0.13), CROP, subdivisions=1, radius=1)
            else:
                for j in range(3):
                    obj('cone', (x + random.uniform(-.08, .08), y + random.uniform(-.08, .08), 0.3), (0.05, 0.05, 0.36), CROP,
                        vertices=4, radius1=1, depth=1, rot=(random.uniform(-.3, .3), random.uniform(-.3, .3), 0))
for i in range(4):   # low plot fence
    pass

# campfire in the middle, two log benches
ox, oy = 0.4, 0.4
for i in range(9):
    a = i / 9 * 2 * math.pi
    obj('ico_sphere', (ox + 0.42 * math.cos(a), oy + 0.42 * math.sin(a), 0.07), (0.11, 0.1, 0.08), ROCK, subdivisions=1, radius=1)
for a in (0.3, 1.9):
    obj('cylinder', (ox, oy, 0.12), (0.06, 0.06, 0.6), TRUNK, vertices=7, radius=1, depth=1, rot=(D(80), 0, a))
obj('cone', (ox, oy, 0.33), (0.22, 0.22, 0.5), FIRE, vertices=7, radius1=1, depth=1)
obj('cone', (ox + 0.03, oy - 0.02, 0.3), (0.12, 0.12, 0.42), FIRE2, vertices=6, radius1=1, depth=1)
for bx, by, rz in ((ox - 1.3, oy + 0.2, D(80)), (ox + 0.2, oy + 1.35, D(-10))):
    obj('cylinder', (bx, by, 0.2), (0.2, 0.2, 1.2), TRUNK, vertices=9, radius=1, depth=1, rot=(D(90), 0, rz))

# lamp posts
for lx, ly in ((-1.6, -5.6), (5.6, 0.2), (-5.6, -0.4), (1.6, -5.6)):
    box((lx, ly, 1.0), (0.1, 0.1, 2.0), WOODD, bevel=0)
    box((lx + 0.2, ly, 1.95), (0.42, 0.06, 0.06), WOODD, bevel=0)
    obj('cube', (lx + 0.38, ly, 1.75), (0.16, 0.16, 0.22), LAMP, size=1)
    if st['night']:
        l = bpy.data.lights.new('lamp', 'POINT'); l.energy = 140; l.color = (1.0, 0.75, 0.45); l.shadow_soft_size = 0.1
        lo = bpy.data.objects.new('lamp', l); lo.location = (lx + 0.38, ly, 1.6); S.collection.objects.link(lo)

# trees and rocks outside the walls (mostly behind, so nothing hides the town)
def tree(x, y, s):
    obj('cylinder', (x, y, 0.5 * s), (0.14 * s, 0.14 * s, 1.0 * s), TRUNK, vertices=7, radius=1, depth=1)
    if INK and random.random() < 0.55:
        col = random.choice(('#d4752e', '#d9a63a', '#c2502a', '#e0b24a'))
        obj('cylinder', (x, y, 0.6 * s), (0.11 * s, 0.11 * s, 1.2 * s), TRUNK, vertices=6, radius=1, depth=1)
        for k in range(6):
            obj('ico_sphere', (x + random.uniform(-.5, .5) * s, y + random.uniform(-.5, .5) * s, (1.25 + random.uniform(0, .7)) * s),
                (random.uniform(.38, .55) * s,) * 2 + (random.uniform(.3, .45) * s,), inkstyle.ink('leafA' + col, col), subdivisions=2, radius=1)
        return
    if STYLE == 'toy':
        obj('ico_sphere', (x, y, 1.6 * s), (0.85 * s, 0.85 * s, 0.95 * s), LEAF, subdivisions=2, radius=1, smooth=True)
    else:
        for k, (z, r) in enumerate(((1.1, 0.95), (1.7, 0.75), (2.25, 0.5))):
            obj('cone', (x, y, z * s), (r * s, r * s, 0.9 * s), LEAF, vertices=8, radius1=1, depth=1, rot=(0, 0, random.uniform(0, 1)))
spots = []
while len(spots) < 26:
    x, y = random.uniform(-15, 14), random.uniform(-14, 15)
    m = max(abs(x), abs(y))
    if m < 8.4: continue
    if x > 8 and y < 2: continue               # keep the front open: zombies stand there
    if x - y > 9: continue
    spots.append((x, y)); tree(x, y, random.uniform(0.9, 1.3))
for x, y, s in ((-8.5, -2, .35), (9.0, 6.5, .45), (-2, 8.6, .3), (8.4, -6.5, .3), (4.5, -8.6, .28)):
    obj('ico_sphere', (x, y, s * .25), (s, s * .85, s * .6), ROCK, subdivisions=1, radius=1)

# ------------------------------------------------------------------ people
def person(loc, rz, pal, pose='stand', hat=None, zombie=False, prop=None):
    hp, to, hr, bw, lf = B['hip'], B['torso'], B['head'], B['bw'], B['limb']
    root = bpy.data.objects.new('p', None); S.collection.objects.link(root)
    root.location = (loc[0], loc[1], loc[2] if len(loc) > 2 else 0); root.rotation_euler = (0, 0, D(rz))
    def J(name, wp, parent, rot=(0, 0, 0)):
        e = bpy.data.objects.new(name, None); S.collection.objects.link(e)
        e.parent = parent; e['wp'] = wp
        pw = Vector(parent['wp']) if 'wp' in parent else Vector((0, 0, 0))
        e.location = Vector(wp) - pw; e.rotation_euler = [D(a) for a in rot]; return e
    def P(kind, sc, wp, parent, m, rot=(0, 0, 0), **kw):
        o = obj(kind, (0, 0, 0), sc, m, rot=rot, smooth=kind in ('uv_sphere',), **kw)
        o.parent = parent; o.location = Vector(wp) - Vector(parent['wp']); return o
    def limb(a, b, r, r1, parent, m):
        a, b = Vector(a), Vector(b); d = b - a
        bpy.ops.mesh.primitive_cone_add(vertices=10, radius1=r, radius2=r1, depth=d.length)
        o = bpy.context.object; o.rotation_euler = d.to_track_quat('Z', 'Y').to_euler()
        o.parent = parent; o.location = (a + b) / 2 - Vector(parent['wp']); o.data.materials.append(m)
        bpy.ops.object.shade_smooth_by_angle(angle=D(50)); return o
    root['wp'] = (0, 0, 0)
    ps = POSES[pose]
    pel = J('pel', (0, 0, hp), root, ps.get('pel', (0, 0, 0)))
    spn = J('spn', (0, 0, hp + 0.08), pel, ps.get('spn', (0, 0, 0)))
    shz = hp + to; nk = J('nk', (0, 0, shz + 0.03), spn, ps.get('nk', (0, 0, 0)))
    skin, top, pants, boots, hair = pal
    P('cylinder', (bw * 0.95, bw * 0.72, 0.12), (0, 0, hp), pel, pants, vertices=12, radius=1, depth=1)
    P('cone', (bw, bw * 0.72, to - 0.04), (0, 0, hp + 0.04 + (to - 0.04) / 2), spn, top, vertices=12, radius1=1, radius2=1.18, depth=1)
    P('uv_sphere', (bw * 1.2, bw * 0.85, 0.06), (0, 0, shz - 0.02), spn, top, segments=12, ring_count=8, radius=1)
    hz = shz + 0.05 + hr
    P('uv_sphere', (hr * 0.95, hr, hr * 1.05), (0, 0, hz), nk, skin, segments=16, ring_count=10, radius=1)
    P('uv_sphere', (hr, hr * 0.93, hr * 0.95), (0, hr * 0.28, hz + hr * 0.18), nk, hair, segments=16, ring_count=10, radius=1)
    eye = M('eye', '#ffdd55', emit=('#ffdd55', 4)) if zombie and st['night'] else M('eye', '#1b1714', 0.3)
    es = 1.7 if (zombie and INK) else 1.0
    for s in (1, -1):
        P('uv_sphere', (hr * .14 * es, hr * .08, hr * .17 * es), (s * hr * .36, -hr * .93, hz + hr * .05), nk, eye, segments=8, ring_count=6, radius=1)
    if zombie and INK:
        P('cube', (hr * 0.5, hr * 0.06, hr * 0.16), (0, -hr * 0.97, hz - hr * 0.42), nk, M('teeth', '#efe6cc'), size=1, bevel=0)
    if hat == 'straw':
        P('cylinder', (hr * 1.9, hr * 1.85, 0.02), (0, 0.02, hz + hr * 0.75), nk, M('straw', ('#c9a14c', '#ecce80'), 45), vertices=18, radius=1, depth=1, rot=(D(-10), 0, 0))
        P('cone', (hr * 1.05, hr * 1.0, hr * 0.85), (0, 0.04, hz + hr * 1.12), nk, M('straw', ('#c9a14c', '#ecce80'), 45), vertices=16, radius1=1, radius2=0.85, depth=1, rot=(D(-10), 0, 0))
        P('cylinder', (hr * 1.07, hr * 1.02, 0.03), (0, 0.03, hz + hr * 0.86), nk, M('band', '#3b7a2f'), vertices=16, radius=1, depth=1, rot=(D(-10), 0, 0))
    elif hat == 'cap':
        P('uv_sphere', (hr * 1.02, hr * 1.02, hr * 0.6), (0, 0.01, hz + hr * 0.45), nk, M('cap', '#3d4a5a'), segments=14, ring_count=8, radius=1)
        P('cylinder', (hr * 0.6, hr * 0.45, 0.015), (0, -hr * 0.85, hz + hr * 0.42), nk, M('cap', '#3d4a5a'), vertices=12, radius=1, depth=1)
    arm = (to * 0.98) * lf ** 0.2
    for s, n in ((1, 'L'), (-1, 'R')):
        sh = J('sh' + n, (s * (bw + 0.04), 0, shz - 0.03), spn, ps.get('sh' + n, (0, 0, 0)))
        el = J('el' + n, (s * (bw + 0.05), 0, shz - 0.03 - arm * 0.5), sh, ps.get('el' + n, (0, 0, 0)))
        wr = J('wr' + n, (s * (bw + 0.055), 0, shz - 0.03 - arm), el, (0, 0, 0))
        r = 0.058 * lf
        P('uv_sphere', (r * 1.15,) * 3, sh['wp'], sh, top, segments=10, ring_count=8, radius=1)
        limb(sh['wp'], el['wp'], r, r * 0.9, sh, top)
        limb(el['wp'], wr['wp'], r * 0.85, r * 0.72, el, skin if not hat == 'cap' else top)
        P('uv_sphere', (r * 0.95, r * 0.8, r * 1.05), Vector(wr['wp']) + Vector((0, 0, -r * 0.8)), wr, skin, segments=10, ring_count=8, radius=1)
        if prop and n == 'R': prop(wr)
        hpj = J('hp' + n, (s * bw * 0.5, 0, hp - 0.02), pel, ps.get('hp' + n, (0, 0, 0)))
        kn = J('kn' + n, (s * bw * 0.52, 0, (hp - 0.02) * 0.52), hpj, ps.get('kn' + n, (0, 0, 0)))
        an = J('an' + n, (s * bw * 0.52, 0, 0.08), kn, ps.get('an' + n, (0, 0, 0)))
        lr = 0.08 * lf
        limb(hpj['wp'], kn['wp'], lr, lr * 0.88, hpj, pants)
        P('uv_sphere', (lr * 0.9,) * 3, kn['wp'], kn, pants, segments=10, ring_count=8, radius=1)
        limb(kn['wp'], Vector(an['wp']) + Vector((0, 0, 0.1)), lr * 0.85, lr * 0.85, kn, pants)
        limb(Vector(an['wp']) + Vector((0, 0, 0.14)), Vector(an['wp']) + Vector((0, 0, -0.03)), lr * 0.92, lr * 0.92, kn, boots)
        P('cube', (lr * 1.4, lr * 2.8, 0.08), Vector(an['wp']) + Vector((0, -lr * 0.7, -0.05)), an, boots, size=1, bevel=0.02)
    return root

POSES = {
    'stand': {'shL': (0, -6, 0), 'shR': (0, 6, 0), 'elL': (-12, 0, 0), 'elR': (-12, 0, 0)},
    'walk': {'hpL': (-22, 0, 0), 'hpR': (20, 0, 0), 'knR': (28, 0, 0), 'anL': (10, 0, 0),
             'shL': (18, -6, 0), 'shR': (-20, 6, 0), 'elL': (-12, 0, 0), 'elR': (-25, 0, 0), 'pel': (0, 0, 5), 'spn': (4, 0, -8)},
    'hoe': {'spn': (14, 0, 10), 'shL': (-55, 0, -20), 'shR': (-35, 0, 15), 'elL': (-50, 0, 0), 'elR': (-55, 0, 0),
            'hpL': (-14, 0, 0), 'hpR': (10, 0, 0), 'knL': (14, 0, 0), 'knR': (10, 0, 0), 'nk': (8, 0, 0)},
    'carry': {'shL': (-40, 0, -14), 'shR': (-40, 0, 14), 'elL': (-55, 0, 0), 'elR': (-55, 0, 0),
              'hpL': (-18, 0, 0), 'hpR': (16, 0, 0), 'knR': (22, 0, 0), 'spn': (-4, 0, 0)},
    'warm': {'shL': (-35, 0, -10), 'shR': (-35, 0, 10), 'elL': (-70, 0, 0), 'elR': (-70, 0, 0), 'spn': (6, 0, 0)},
    'point': {'shL': (0, -6, 0), 'shR': (-80, 0, 10), 'elL': (-12, 0, 0), 'elR': (-5, 0, 0), 'nk': (-5, 0, 10)},
    'zombie': {'spn': (14, 0, 8), 'nk': (18, 12, 10), 'shL': (-75, 0, -5), 'shR': (-68, 0, 12), 'elL': (-10, 0, 0), 'elR': (-22, 0, 0),
               'hpL': (-14, 0, 0), 'hpR': (16, 0, 0), 'knR': (24, 0, 0), 'pel': (0, 4, -6)},
    'zombie2': {'spn': (24, 6, -6), 'nk': (25, -14, 0), 'shL': (-55, 0, -12), 'shR': (-5, 8, 0), 'elL': (-35, 0, 0), 'elR': (-5, 0, 0),
                'hpL': (12, 0, 0), 'hpR': (-10, 0, 0), 'knL': (18, 0, 0)},
}

def hoe(wr):
    o = obj('cylinder', (0, 0, 0), (0.02, 0.02, 1.25), WOOD, vertices=6, radius=1, depth=1, rot=(D(70), 0, 0))
    o.parent = wr; o.location = (0, -0.25, -0.12)
    h = obj('cube', (0, 0, 0), (0.18, 0.03, 0.14), METAL, size=1, bevel=0); h.parent = wr; h.location = (0, -0.8, -0.38)
def crate_prop(wr):
    o = obj('cube', (0, 0, 0), (0.45, 0.4, 0.35), WOOD, size=1); o.parent = wr; o.location = (0.2, -0.12, -0.1)

def P_(skin, top, pants, boots, hair): return (M('s' + skin, skin, rough=0.7), M('t' + str(top), top, 4), M('p' + pants, pants),
                                              M('b' + boots, boots, rough=0.6), M('h' + hair, (hair, hair), 50))
SK = '#e6a882'; SK2 = '#b97d58'; ZS = '#8d9c74' if STYLE != 'toy' else '#9ccc78'
if INK: ZS = '#b4bb9c'
FARMER = (M('fs', SK, rough=0.7), M('plaid', ('#2f6a2a', '#4a9640', '#5cab4c'), 18, wave=0.2) if STYLE != 'toy' else M('plaid', '#4fb33f'),
          M('fp', '#7a4a26'), M('fb', '#47291a', rough=0.6), M('fh', ('#c39a45', '#e6c46c'), 60))
MEDIC = P_(SK2, ('#d8dde0', '#eef2f4'), '#3f5a73', '#2b2b2b', '#2a1f18')
GUARD = P_(SK, ('#5a5038', '#6d6244'), '#3e3a30', '#2b2420', '#4a3020')
WORKER = P_(SK2, ('#c46a2a', '#d67a36') if STYLE != 'toy' else ('#ff8a3a', '#ff9a4a'), '#3d4a5c', '#2f2a26', '#1c1a18')
COOK = P_(SK, ('#e8e2d0', '#f6f1e2'), '#5a4a3a', '#2e2620', '#8a4a2a')
Z1 = (M('zs', (ZS, ZS)), M('zt', ('#3e4a5a', '#56627a'), 9), M('zp', '#2f2c28'), M('zb', '#262220'), M('zh', ('#2d2a22', '#3a3528'), 40))
Z2 = (M('zs', (ZS, ZS)), M('zt2', ('#6a3a32', '#7d4a3e'), 9), M('zp2', '#3a3a44'), M('zb', '#262220'), M('zh2', ('#5a4a30', '#6a5a3a'), 40))

person((3.4, -1.25), 0, FARMER, 'hoe', hat='straw', prop=hoe)           # the Farmer at the plots
person((-2.2, 2.2), 90, MEDIC, 'stand')                                  # medic outside the tent
person((-1.7, -1.9), 90, WORKER, 'carry', prop=crate_prop)               # survivor hauling supplies
person((1.3, 1.25), -125, COOK, 'warm')                                  # by the fire
person((-0.6, 0.6), -70 + 180, GUARD, 'stand')                           # by the fire, other side
person((tx + 0.3, ty - 0.2, 3.12), 45, GUARD, 'point', hat='cap')       # lookout on the tower
person((0.2, -5.4), 0, WORKER, 'walk')                                   # coming in through the gate
for (x, y, rz, pal, ps) in ((9.0, -2.0, -45, Z1, 'zombie'), (10.2, -0.4, -60, Z2, 'zombie2'),
                            (9.6, -4.4, -30, Z2, 'zombie'), (11.2, -2.9, -50, Z1, 'zombie2')):
    person((x, y), rz, pal, ps, zombie=True)

# ------------------------------------------------------------------ camera, light, render
cam = bpy.data.objects.new('cam', bpy.data.cameras.new('cam')); S.collection.objects.link(cam)
cam.data.type = 'ORTHO'; cam.data.ortho_scale = W / st['ppm']
cam.rotation_euler = (D(90 - st['tilt']), 0, D(45))
look = Vector((0, 0, -1)); look.rotate(cam.rotation_euler)
target = Vector((-0.5, 0.5, 1.4))
cam.location = target - look * 40; cam.data.clip_end = 120; S.camera = cam

sun = bpy.data.objects.new('sun', bpy.data.lights.new('sun', 'SUN')); S.collection.objects.link(sun)
sun.data.energy, sun.data.color = st['sun'][0], st['sun'][1]; sun.data.angle = D(4)
d = Vector((0.7, -0.25, -0.75)).normalized() if not st['night'] else Vector((-0.4, -0.7, -0.6)).normalized()
sun.rotation_euler = (-d).to_track_quat('Z', 'Y').to_euler()
fill = bpy.data.objects.new('fill', bpy.data.lights.new('fill', 'SUN')); S.collection.objects.link(fill)
fill.data.energy = 0.5 if not st['night'] else 0.08; fill.data.color = (0.75, 0.85, 1.0)
d2 = Vector((-0.6, 0.5, -0.3)).normalized(); fill.rotation_euler = (-d2).to_track_quat('Z', 'Y').to_euler()
if st['night']:
    for (x, y, z, e) in ((ox, oy, 0.6, 900), ):
        l = bpy.data.lights.new('fire', 'POINT'); l.energy = e; l.color = (1.0, 0.55, 0.22); l.shadow_soft_size = 0.25
        lo = bpy.data.objects.new('fire', l); lo.location = (x, y, z); S.collection.objects.link(lo)
    for (x, y, z) in ((cx - 1.0, cy - 1.7, 1.1), (cx + 1.0, cy - 1.7, 1.1)):
        l = bpy.data.lights.new('win', 'POINT'); l.energy = 60; l.color = (1.0, 0.7, 0.4)
        lo = bpy.data.objects.new('win', l); lo.location = (x, y, z); S.collection.objects.link(lo)
    l = bpy.data.lights.new('torch', 'POINT'); l.energy = 120; l.color = (1.0, 0.7, 0.4)
    lo = bpy.data.objects.new('torch', l); lo.location = (tx, ty, 4.0); S.collection.objects.link(lo)
world = bpy.data.worlds.new('w'); S.world = world; world.use_nodes = True
world.node_tree.nodes['Background'].inputs['Color'].default_value = (*st['world'][0], 1)
world.node_tree.nodes['Background'].inputs['Strength'].default_value = st['world'][1]

S.render.engine = 'BLENDER_EEVEE'
S.render.resolution_x, S.render.resolution_y = W, H
S.eevee.taa_render_samples = 16
try:
    S.eevee.use_shadows = True
except Exception: pass
S.view_settings.view_transform = st['view']
if st['look'] != 'None':
    try: S.view_settings.look = st['look']
    except Exception: pass
S.render.image_settings.file_format = 'JPEG'; S.render.image_settings.quality = 90
if INK:
    inkstyle.setup(S, line_px=2.0, wobble=1.3)
    S.render.image_settings.file_format = 'PNG'
    OUT = OUT.rsplit('.', 1)[0] + '.png'
S.render.filepath = OUT
bpy.ops.render.render(write_still=True)
if INK:
    inkstyle.paper(OUT, strength=0.55)
    from PIL import Image as _I; _I.open(OUT).convert('RGB').save(OUT.rsplit('.', 1)[0] + '.jpg', quality=90)
print('rendered', STYLE, OUT)
