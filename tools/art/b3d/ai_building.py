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

def render(blend, out, px=708):
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
    for r in (0, 90, 180, 270):
        o.rotation_euler = (0, 0, D(r))
        bpy.context.scene.render.filepath = os.path.abspath(os.path.join(out, f'rot{r}.png'))
        bpy.ops.render.render(write_still=True); print('rot', r, flush=True)

if __name__ == '__main__':
    a = sys.argv[1:]; opt = dict(x.split('=') for x in a if '=' in x); a = [x for x in a if '=' not in x]
    if a[0] == 'prep': prep(a[1], a[2], float(opt.get('height', 1.3)), int(opt.get('tris', 60000)))
    if a[0] == 'render': render(a[1], a[2], int(opt.get('px', 708)))
