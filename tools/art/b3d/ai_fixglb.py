"""python3 fixglb.py IN.glb OUT.glb [flip]: apply transforms, optionally turn 180 deg to face -Y, drop small loose islands.
If ai_model.py prep then fails with an empty weight list (fill_unweighted TypeError), prep the original file instead
(when it already faces -Y: toes at negative y).
Pipeline: [ai_fixglb.py] -> ai_model.py prep -> ai_solefix.py -> export3d.main(rig, out, 1024, .3, 5, 24), FACE=False."""
import bpy, math, sys, numpy as np, bmesh
from mathutils import Matrix
src, out = sys.argv[1], sys.argv[2]; flip = 'flip' in sys.argv
bpy.ops.wm.read_factory_settings(use_empty=True); bpy.ops.import_scene.gltf(filepath=src)
o = next(o for o in bpy.data.objects if o.type == 'MESH'); bpy.context.view_layer.objects.active = o; o.select_set(True)
bpy.ops.object.transform_apply(location=True, rotation=True, scale=True)
if flip: o.data.transform(Matrix.Rotation(math.pi, 4, 'Z'))
bm = bmesh.new(); bm.from_mesh(o.data); bmesh.ops.remove_doubles(bm, verts=bm.verts, dist=.0005); bm.verts.ensure_lookup_table(); bm.verts.index_update()
seen = set(); islands = []
for v in bm.verts:
    if v.index in seen: continue
    st = [v]; isl = []; seen.add(v.index)
    while st:
        x = st.pop(); isl.append(x)
        for e in x.link_edges:
            y = e.other_vert(x)
            if y.index not in seen: seen.add(y.index); st.append(y)
    islands.append(isl)
n = len(bm.verts); drop = [v for isl in islands if len(isl) < n * .002 for v in isl]
print('islands', len(islands), 'dropping verts', len(drop), 'sizes', sorted(len(i) for i in islands)[-5:])
bmesh.ops.delete(bm, geom=drop, context='VERTS')
flat = [f for f in bm.faces if all(v.co.z < .004 for v in f.verts)] if 'noflat' in sys.argv else []
print('flat ground faces', len(flat)); bmesh.ops.delete(bm, geom=flat, context='FACES_ONLY')
loose = [v for v in bm.verts if not v.link_faces]; bmesh.ops.delete(bm, geom=loose, context='VERTS')
bm.to_mesh(o.data); bm.free()
co = np.array([v.co[:] for v in o.data.vertices]); f = co[co[:, 2] < .05]; print('feet y', f[:, 1].min().round(3), f[:, 1].max().round(3))
bpy.ops.export_scene.gltf(filepath=out, export_format='GLB', use_selection=True)
