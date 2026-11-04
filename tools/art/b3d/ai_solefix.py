"""python3 solefix.py RIG.blend: sole vertices (lowest 3 cm) belong to the foot bone only (no shin stretch flaps)."""
import bpy, sys
bpy.ops.wm.open_mainfile(filepath=sys.argv[1])
o = bpy.data.objects['body']; G = {g.name: g for g in o.vertex_groups}; n = 0
for v in o.data.vertices:
    if v.co.z < .03:
        s = 'L' if v.co.x > 0 else 'R'
        for g in list(v.groups): o.vertex_groups[g.group].remove([v.index])
        G['foot.' + s].add([v.index], 1.0, 'REPLACE'); n += 1
print('sole verts', n)
import bmesh
bm = bmesh.new(); bm.from_mesh(o.data)
flat = [f for f in bm.faces if all(v.co.z < .004 for v in f.verts)]; bmesh.ops.delete(bm, geom=flat, context='FACES_ONLY')
loose = [v for v in bm.verts if not v.link_faces]; bmesh.ops.delete(bm, geom=loose, context='VERTS')
bm.to_mesh(o.data); bm.free(); print('removed flat ground faces', len(flat))
bpy.ops.wm.save_mainfile()
