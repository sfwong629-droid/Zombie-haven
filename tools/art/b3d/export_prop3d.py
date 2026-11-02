"""Static AI-3D model (a building or prop from Hunyuan3D) -> light GLB for the real-time 3D town.

  python3 export_prop3d.py MODEL.glb OUT.glb [height=1.3] [tris=20000] [rot=0] [tex=1024]

height: in Farmer heights (1.09 units), like ai_building.py. rot: degrees about the vertical axis so the door faces
-Y (Blender) = +Z in three.js = the game's front-left. The texture gets the same island-padded flat-colour clean-up as
the characters (export3d.clean_texture). Origin at the centre of the footprint, on the ground.
"""
import bpy, math, os, sys
import numpy as np
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from export3d import clean_texture, plain

FARMER_H = 1.09

def main(src, out, height=1.3, tris=20000, rot=0.0, tex=1024):
    bpy.ops.wm.read_factory_settings(use_empty=True)
    bpy.ops.import_scene.gltf(filepath=src)
    o = next(o for o in bpy.data.objects if o.type == 'MESH'); o.name = os.path.splitext(os.path.basename(out))[0]
    for ob in list(bpy.data.objects):
        if ob is not o: bpy.data.objects.remove(ob)
    o.rotation_euler.z += math.radians(rot)
    bpy.context.view_layer.objects.active = o; o.select_set(True)
    bpy.ops.object.transform_apply(location=True, rotation=True, scale=True)
    n0 = len(o.data.polygons)
    if n0 > tris:
        dm = o.modifiers.new('dec', 'DECIMATE'); dm.ratio = tris / n0; bpy.ops.object.modifier_apply(modifier=dm.name)
    co = np.array([v.co[:] for v in o.data.vertices]); lo, hi = co.min(0), co.max(0)
    s = height * FARMER_H / (hi[2] - lo[2])
    for v in o.data.vertices:
        v.co = ((v.co.x - (lo[0] + hi[0]) / 2) * s, (v.co.y - (lo[1] + hi[1]) / 2) * s, (v.co.z - lo[2]) * s)
    img = clean_texture(o, tex, 5, 24)
    for m in o.data.materials: plain(m, image=img); m.use_backface_culling = False
    bpy.ops.export_scene.gltf(filepath=os.path.abspath(out), export_format='GLB', export_image_format='WEBP', export_yup=True)
    print('tris', n0, '->', len(o.data.polygons), 'footprint', round((hi[0] - lo[0]) * s, 2), round((hi[1] - lo[1]) * s, 2),
          'saved', out, round(os.path.getsize(out) / 1e6, 2), 'MB')

if __name__ == '__main__':
    a = sys.argv[1:]; opt = dict(x.split('=', 1) for x in a if '=' in x); pos = [x for x in a if '=' not in x]
    main(pos[0], pos[1], float(opt.get('height', 1.3)), int(opt.get('tris', 20000)), float(opt.get('rot', 0)), int(opt.get('tex', 1024)))
