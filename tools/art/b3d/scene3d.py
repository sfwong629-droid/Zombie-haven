"""Direction B test: a ground patch rendered with the same camera as farmer3d.py.

Run:  python3 tools/art/b3d/scene3d.py OUT.png
Same lens as the characters: orthographic, 45 deg turn, 30 deg tilt, 120 px per metre.
World origin lands in the middle of the image.
"""
import math, sys, random
import bpy
from mathutils import Vector

OUT = sys.argv[1] if len(sys.argv) > 1 else 'ground.png'
PPM, W, H = 120, 1200, 720
D = math.radians
random.seed(7)

def lin(h):
    h = h.lstrip('#'); c = [int(h[i:i + 2], 16) / 255 for i in (0, 2, 4)]
    return [(x / 12.92 if x <= 0.04045 else ((x + 0.055) / 1.055) ** 2.4) for x in c] + [1]

bpy.ops.wm.read_factory_settings(use_empty=True)
S = bpy.context.scene

def ramp_mat(name, cols, scale, rough=0.9, wave=None, detail=4):
    m = bpy.data.materials.new(name); m.use_nodes = True; nt = m.node_tree
    b = nt.nodes['Principled BSDF']; b.inputs['Roughness'].default_value = rough
    b.inputs['Specular IOR Level'].default_value = 0.2
    if wave:
        t = nt.nodes.new('ShaderNodeTexWave'); t.inputs['Scale'].default_value = scale
        t.inputs['Distortion'].default_value = wave; t.bands_direction = 'X'
        out = t.outputs['Fac']
    else:
        t = nt.nodes.new('ShaderNodeTexNoise'); t.inputs['Scale'].default_value = scale
        t.inputs['Detail'].default_value = detail; out = t.outputs['Fac']
    r = nt.nodes.new('ShaderNodeValToRGB'); el = r.color_ramp.elements
    el[0].position, el[0].color = 0.3, lin(cols[0]); el[1].position, el[1].color = 0.7, lin(cols[-1])
    if len(cols) == 3: e = el.new(0.5); e.color = lin(cols[1])
    nt.links.new(out, r.inputs[0]); nt.links.new(r.outputs[0], b.inputs['Base Color'])
    return m

def grass_mat():
    """Two noise layers: broad patches of colour plus fine mottling, the Last Day on Earth look."""
    m = bpy.data.materials.new('grass'); m.use_nodes = True; nt = m.node_tree
    b = nt.nodes['Principled BSDF']; b.inputs['Roughness'].default_value = 0.95
    b.inputs['Specular IOR Level'].default_value = 0.1
    n1 = nt.nodes.new('ShaderNodeTexNoise'); n1.inputs['Scale'].default_value = 0.6; n1.inputs['Detail'].default_value = 2
    n2 = nt.nodes.new('ShaderNodeTexNoise'); n2.inputs['Scale'].default_value = 9; n2.inputs['Detail'].default_value = 6
    r1 = nt.nodes.new('ShaderNodeValToRGB'); e = r1.color_ramp.elements
    e[0].position, e[0].color = 0.38, lin('#56702f'); e[1].position, e[1].color = 0.62, lin('#7a8f3c')
    x = e.new(0.5); x.color = lin('#647e34')
    r2 = nt.nodes.new('ShaderNodeValToRGB'); e = r2.color_ramp.elements
    e[0].position, e[0].color = 0.4, (0.55, 0.55, 0.55, 1); e[1].position, e[1].color = 0.6, (1, 1, 1, 1)
    mx = nt.nodes.new('ShaderNodeMix'); mx.data_type = 'RGBA'; mx.blend_type = 'MULTIPLY'
    mx.inputs['Factor'].default_value = 0.45
    nt.links.new(n1.outputs['Fac'], r1.inputs[0]); nt.links.new(n2.outputs['Fac'], r2.inputs[0])
    nt.links.new(r1.outputs[0], mx.inputs['A']); nt.links.new(r2.outputs[0], mx.inputs['B'])
    nt.links.new(mx.outputs['Result'], b.inputs['Base Color'])
    return m

GRASS = grass_mat()
SOIL = ramp_mat('soil', ['#4a2e1c', '#6b4429', '#7d5434'], 6)
FURROW = ramp_mat('furrow', ['#3a2214', '#5a3820'], 8)
WOOD = ramp_mat('wood', ['#6e4a2a', '#8c6238', '#a37647'], 3, wave=6)
WOOD_D = ramp_mat('wood_dark', ['#4a301b', '#5e3e22'], 4, wave=4)
ROCK = ramp_mat('rock', ['#6b6b66', '#8a8a82', '#9c9b92'], 5)
LEAF = ramp_mat('leaf', ['#3d6a26', '#5c8f32'], 8)
TUFT = ramp_mat('tuft', ['#4c6a28', '#6c8a34'], 6)
METAL = ramp_mat('metal', ['#55595a', '#6e7476'], 10, rough=0.5)

def obj(prim, loc, scale, m, rot=(0, 0, 0), bevel=0, smooth=False, **kw):
    getattr(bpy.ops.mesh, prim)(**kw)
    o = bpy.context.object; o.location = loc; o.scale = scale; o.rotation_euler = rot
    o.data.materials.append(m)
    if bevel:
        md = o.modifiers.new('bv', 'BEVEL'); md.width = bevel; md.segments = 2
    if smooth: bpy.ops.object.shade_smooth()
    return o

# ground
obj('primitive_plane_add', (0, 0, 0), (1, 1, 1), GRASS, size=40)

# crop plot with furrows and seedlings (back left)
px, py = -2.6, 2.2
obj('primitive_cube_add', (px, py, 0.02), (1.3, 0.95, 0.04), SOIL, bevel=0.03, size=1)
for i in range(5):
    y = py - 0.75 + i * 0.375
    obj('primitive_cube_add', (px, y, 0.055), (1.2, 0.12, 0.03), FURROW, bevel=0.015, size=1)
    for j in range(6):
        x = px - 0.5 + j * 0.2 + random.uniform(-0.03, 0.03)
        h = random.uniform(0.12, 0.22)
        obj('primitive_cone_add', (x, y, 0.07 + h / 2), (0.05, 0.05, h), LEAF, vertices=5, radius1=1, depth=1,
            rot=(0, 0, random.uniform(0, 3)))

# fence along the right edge (runs along +Y, follows the grid)
fx = 3.4
for k in range(7):
    y = -3.0 + k
    obj('primitive_cube_add', (fx, y, 0.45), (0.11, 0.11, 0.9), WOOD_D, bevel=0.015, size=1,
        rot=(0, 0, random.uniform(-0.05, 0.05)))
for z in (0.35, 0.7):
    obj('primitive_cube_add', (fx, 0, z), (0.05, 6.2, 0.12), WOOD, bevel=0.012, size=1)

# crates (front left)
def crate(x, y, s, rz, z0=0.0):
    obj('primitive_cube_add', (x, y, z0 + s / 2), (s, s, s), WOOD, bevel=0.02, size=1, rot=(0, 0, rz))
    for dz in (0.08, s - 0.08):
        obj('primitive_cube_add', (x, y, z0 + dz), (s + 0.02, s + 0.02, 0.07), WOOD_D, bevel=0.01, size=1, rot=(0, 0, rz))
crate(-1.6, -3.2, 0.6, 0.1); crate(-0.95, -3.35, 0.5, -0.25); crate(-1.55, -3.2, 0.45, 0.35, z0=0.6)

# rusty barrel and stump
obj('primitive_cylinder_add', (2.3, -1.6, 0.42), (0.28, 0.28, 0.84), METAL, vertices=16, radius=1, depth=1, smooth=True)
for z in (0.2, 0.64):
    obj('primitive_cylinder_add', (2.3, -1.6, z), (0.292, 0.292, 0.04), WOOD_D, vertices=16, radius=1, depth=1, smooth=True)
obj('primitive_cylinder_add', (0.6, 3.3, 0.15), (0.3, 0.3, 0.3), WOOD, vertices=10, radius=1, depth=1)

# rocks
for x, y, s in ((-3.6, -0.6, 0.32), (-3.3, -0.2, 0.18), (1.2, -3.6, 0.25), (3.0, 3.6, 0.3), (-0.6, 4.3, 0.22)):
    obj('primitive_ico_sphere_add', (x, y, s * 0.25), (s, s * 0.85, s * 0.6), ROCK, subdivisions=1, radius=1,
        rot=(0, 0, random.uniform(0, 3)))

# grass tufts, kept out of the walking area in the middle
n = 0
while n < 70:
    x, y = random.uniform(-6, 6), random.uniform(-6, 6)
    if abs(x) < 2.6 and abs(y) < 2.6: continue
    if abs(x - px) < 1.5 and abs(y - py) < 1.1: continue
    for _ in range(3):
        h = random.uniform(0.1, 0.2)
        obj('primitive_cone_add', (x + random.uniform(-0.06, 0.06), y + random.uniform(-0.06, 0.06), h / 2),
            (0.025, 0.025, h), TUFT, vertices=4, radius1=1, depth=1,
            rot=(random.uniform(-0.4, 0.4), random.uniform(-0.4, 0.4), 0))
    n += 1

# camera and light: identical to farmer3d.py
cam = bpy.data.objects.new('cam', bpy.data.cameras.new('cam')); S.collection.objects.link(cam)
cam.data.type = 'ORTHO'; cam.data.ortho_scale = max(W, H) / PPM
cam.rotation_euler = (D(60), 0, D(45))
look = Vector((0, 0, -1)); look.rotate(cam.rotation_euler)
cam.location = -look * 20; cam.data.clip_end = 60; S.camera = cam
sun = bpy.data.objects.new('sun', bpy.data.lights.new('sun', 'SUN')); S.collection.objects.link(sun)
sun.data.energy = 3.2; sun.data.angle = D(6); sun.data.color = (1.0, 0.95, 0.85)
d = Vector((0.75, -0.15, -0.8)).normalized(); sun.rotation_euler = (-d).to_track_quat('Z', 'Y').to_euler()
fill = bpy.data.objects.new('fill', bpy.data.lights.new('fill', 'SUN')); S.collection.objects.link(fill)
fill.data.energy = 0.6; fill.data.color = (0.75, 0.85, 1.0)
d2 = Vector((-0.6, 0.5, -0.3)).normalized(); fill.rotation_euler = (-d2).to_track_quat('Z', 'Y').to_euler()
world = bpy.data.worlds.new('w'); S.world = world; world.use_nodes = True
world.node_tree.nodes['Background'].inputs['Color'].default_value = (0.42, 0.45, 0.5, 1)
world.node_tree.nodes['Background'].inputs['Strength'].default_value = 0.7

S.render.engine = 'BLENDER_EEVEE'
S.render.resolution_x, S.render.resolution_y = W, H
S.eevee.taa_render_samples = 16
S.view_settings.view_transform = 'Standard'
S.render.image_settings.file_format = 'JPEG'; S.render.image_settings.quality = 88
S.render.filepath = OUT
bpy.ops.render.render(write_still=True)
print('ground done')
