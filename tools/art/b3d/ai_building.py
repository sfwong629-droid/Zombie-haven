"""AI-generated building model (Hunyuan3D GLB) -> game sprites at the same camera and scale as the survivors.

  python3 ai_building.py prep   MODEL.glb OUT.blend [height=1.3] [tris=60000]
  python3 ai_building.py render OUT.blend RAW_DIR [px=708]
prep: decimates, puts the model on the ground centred on its footprint, scales it so its height is
`height` x the Farmer's height (1.09 units). Front (door) must face -Y, which the game camera shows facing down-left.
render: toon shading like the survivors, game camera (2:1 tiles = 30 deg down, 45 deg turn), same pixels per unit as
the 128-px character frames, one image per rotation (0/90/180/270) plus anchor.json with the ground point and footprint.
"""
import bpy, json, math, os, sys
import numpy as np
from mathutils import Vector
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

FARMER_H = 1.09
CHAR_PPU = 128 / 1.3          # pixels per unit of the smooth 128-px character frames (ortho 1.3)
D = math.radians

def prep(src, out, height=1.3, tris=60000):
    bpy.ops.wm.read_factory_settings(use_empty=True)
    bpy.ops.import_scene.gltf(filepath=src)
    o = next(o for o in bpy.data.objects if o.type == 'MESH'); o.name = 'building'
    for ob in list(bpy.data.objects):
        if ob is not o: bpy.data.objects.remove(ob)
    bpy.context.view_layer.objects.active = o; o.select_set(True)
    bpy.ops.object.transform_apply(location=True, rotation=True, scale=True)
    n0 = len(o.data.polygons)
    if n0 > tris:
        dm = o.modifiers.new('dec', 'DECIMATE'); dm.ratio = tris / n0; bpy.ops.object.modifier_apply(modifier=dm.name)
    co = np.array([v.co[:] for v in o.data.vertices])
    lo, hi = co.min(0), co.max(0)
    s = height * FARMER_H / (hi[2] - lo[2])
    for v in o.data.vertices:
        v.co = Vector(((v.co.x - (lo[0] + hi[0]) / 2) * s, (v.co.y - (lo[1] + hi[1]) / 2) * s, (v.co.z - lo[2]) * s))
    fx, fy = (hi[0] - lo[0]) * s, (hi[1] - lo[1]) * s
    o['footprint'] = (fx, fy)
    print('tris', n0, '->', len(o.data.polygons), 'scale', round(s, 3), 'footprint', round(fx, 2), round(fy, 2), 'height', round((hi[2] - lo[2]) * s, 2))
    bpy.ops.wm.save_as_mainfile(filepath=os.path.abspath(out))

def _toon_tex_mat(name, img_path, light=(.48, .76, .94)):
    """Emission toon material from an image (same light bands as the building)."""
    m = bpy.data.materials.new(name); m.use_nodes = True; N, L = m.node_tree.nodes, m.node_tree.links
    for n in list(N): N.remove(n)
    tex = N.new('ShaderNodeTexImage'); tex.image = bpy.data.images.load(img_path); tex.image.pack(); tex.interpolation = 'Closest'
    out = N.new('ShaderNodeOutputMaterial'); em = N.new('ShaderNodeEmission'); dif = N.new('ShaderNodeBsdfDiffuse')
    s2r = N.new('ShaderNodeShaderToRGB'); bw = N.new('ShaderNodeRGBToBW'); ramp = N.new('ShaderNodeValToRGB')
    ramp.color_ramp.interpolation = 'CONSTANT'; el = ramp.color_ramp.elements
    el[0].position = 0; el[0].color = (light[0],) * 3 + (1,); el[1].position = .35; el[1].color = (light[1],) * 3 + (1,)
    e3 = el.new(.7); e3.color = (light[2],) * 3 + (1,)
    mul = N.new('ShaderNodeMix'); mul.data_type = 'RGBA'; mul.blend_type = 'MULTIPLY'; mul.inputs['Factor'].default_value = 1
    L.new(dif.outputs[0], s2r.inputs[0]); L.new(s2r.outputs['Color'], bw.inputs[0]); L.new(bw.outputs[0], ramp.inputs[0])
    L.new(tex.outputs['Color'], mul.inputs['A']); L.new(ramp.outputs['Color'], mul.inputs['B'])
    L.new(mul.outputs['Result'], em.inputs['Color']); L.new(em.outputs[0], out.inputs['Surface'])
    m.use_backface_culling = False
    return m

def add_flag(o, base, pole_h=.55, size=(.46, .3), cols=14, rows=7):
    """A pole on the building with a cloth flag (cream, red cross). Returns a function f(t) that waves it, t in [0,1)."""
    import survivor, tempfile
    from PIL import Image, ImageDraw
    W, H = 92, 60; img = Image.new('RGB', (W, H), (236, 226, 200)); d = ImageDraw.Draw(img)
    d.rectangle((40, 12, 52, 48), fill=(196, 40, 32)); d.rectangle((26, 24, 66, 36), fill=(196, 40, 32))
    d.rectangle((0, 0, W - 1, H - 1), outline=(150, 130, 100), width=2)
    path = os.path.join(tempfile.gettempdir(), 'flag_cross.png'); img.save(path)
    base = Vector(base); top = base + Vector((0, 0, pole_h))
    wood = bpy.data.materials.new('pole'); wood.use_nodes = True
    pole = survivor.tube(base, top + Vector((0, 0, .03)), .022, .018, wood, seg=8); pole.name = 'flagpole'
    pole.data.materials.clear(); pole.data.materials.append(_toon_tex_mat('polemat', _solid('#8a5a32')))
    me = bpy.data.meshes.new('flag'); fl = bpy.data.objects.new('flag', me); bpy.context.scene.collection.objects.link(fl)
    verts, faces, uvs = [], [], []
    for j in range(rows + 1):
        for i in range(cols + 1): verts.append((0, 0, 0))
    for j in range(rows):
        for i in range(cols):
            a = j * (cols + 1) + i; faces.append((a, a + 1, a + cols + 2, a + cols + 1))
    me.from_pydata(verts, [], faces); me.update()
    uv = me.uv_layers.new()
    for poly in me.polygons:
        for li in poly.loop_indices:
            vi = me.loops[li].vertex_index; i, j = vi % (cols + 1), vi // (cols + 1); uv.data[li].uv = (i / cols, 1 - j / rows)
    me.materials.append(_toon_tex_mat('flagmat', path))
    fw, fh = size; anchor = top - Vector((0, 0, .02))
    def wave(t):
        for v in me.vertices:
            i, j = v.index % (cols + 1), v.index // (cols + 1); u = i / cols; w = j / rows
            ph = 2 * math.pi * (t - u * .9)
            x = anchor.x + fw * u * .96; y = anchor.y + (.09 * u ** 1.2) * math.sin(ph)
            z = anchor.z - fh * w - .03 * u * (1 + .5 * math.sin(ph + 1))
            v.co = (x, y, z)
        me.update()
    for ob in (pole, fl): ob.parent = o
    return wave

def _solid(hexc):
    import tempfile
    from PIL import Image
    c = tuple(int(hexc[i:i + 2], 16) for i in (1, 3, 5)); p = os.path.join(tempfile.gettempdir(), f'solid_{hexc[1:]}.png')
    Image.new('RGB', (4, 4), c).save(p); return p

def render(blend, out, px=708, flag=None, frames=8):
    import ai_render
    bpy.ops.wm.open_mainfile(filepath=os.path.abspath(blend))
    o = bpy.data.objects['building']
    ai_render.toonify(o, tex_px=640, colors=0, median=5, light=(.48, .76, .94))   # building look (user pick 2026-10-31): deeper shadows
    o.rotation_mode = 'XYZ'
    fx, fy = o['footprint']
    ppu = CHAR_PPU * px / 354          # px=708 renders at 2x; spritify smooth size=354 gives character scale
    cam = ai_render.setup_scene(px=px, tilt=60)
    cam.data.ortho_scale = px / ppu
    look = Vector((0, 0, -1)); look.rotate(cam.rotation_euler)
    cam.location = Vector((0, 0, .55)) - look * 30; cam.data.clip_end = 80
    bpy.context.scene.eevee.taa_render_samples = 16
    bpy.context.view_layer.update()
    from bpy_extras.object_utils import world_to_camera_view
    g = world_to_camera_view(bpy.context.scene, cam, Vector((0, 0, 0)))
    os.makedirs(out, exist_ok=True)
    json.dump({'ground_x': g.x, 'ground_y': 1 - g.y, 'footprint': [fx, fy], 'ppu_final': CHAR_PPU, 'size_final': 354},
              open(os.path.join(out, 'anchor.json'), 'w'))
    wave = add_flag(o, flag) if flag else None
    for r in (0, 90, 180, 270):
        o.rotation_euler = (0, 0, D(r))
        for f in range(frames if wave else 1):
            if wave: wave(f / frames)
            name = f'rot{r}_f{f}.png' if wave else f'rot{r}.png'
            bpy.context.scene.render.filepath = os.path.abspath(os.path.join(out, name))
            bpy.ops.render.render(write_still=True)
        print('rot', r, flush=True)

if __name__ == '__main__':
    a = sys.argv[1:]; opt = dict(x.split('=') for x in a if '=' in x); a = [x for x in a if '=' not in x]
    if a[0] == 'prep': prep(a[1], a[2], float(opt.get('height', 1.3)), int(opt.get('tris', 60000)))
    if a[0] == 'render': render(a[1], a[2], int(opt.get('px', 708)), tuple(map(float, opt['flag'].split(','))) if 'flag' in opt else None)
