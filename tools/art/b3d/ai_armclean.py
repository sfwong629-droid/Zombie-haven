"""python3 ai_armclean.py RIG.blend [radius=.06]: arms that touch the body (the bloated's belly) pick up belly skin and
stretch it into webs. Vertices whose normal faces the arm bone (body skin looking at the arm), or farther than
`radius` from it, lose their arm
weights; the remaining weights are renormalised, or the vertex goes to the chest/pelvis when nothing is left."""
import bpy, sys
from mathutils import Vector
from mathutils.geometry import intersect_point_line
blend = sys.argv[1]; R = float(sys.argv[2]) if len(sys.argv) > 2 else .14
bpy.ops.wm.open_mainfile(filepath=blend)
o = bpy.data.objects['body']; ao = next(x for x in bpy.data.objects if x.type == 'ARMATURE')
B = {b.name: (ao.matrix_world @ b.head_local, ao.matrix_world @ b.tail_local) for b in ao.data.bones}
names = {g.index: g.name for g in o.vertex_groups}; G = {g.name: g for g in o.vertex_groups}
def seg_c(p, a, b):
    q, t = intersect_point_line(p, a, b); t = max(0, min(1, t)); return a + (b - a) * t
n = 0
for v in o.data.vertices:
    p = o.matrix_world @ v.co
    for s in 'LR':
        arm = ['upperarm.' + s, 'forearm.' + s, 'hand.' + s]
        ws = {names[g.group]: g.weight for g in v.groups if names[g.group] in arm and g.weight > 0}
        if not ws: continue
        c = min((seg_c(p, *B[k]) for k in arm), key=lambda c: (p - c).length); d = (p - c).length
        nrm = (o.matrix_world.to_3x3() @ v.normal).normalized(); faces_arm = nrm.dot((c - p).normalized()) > .2
        dsh = (p - B['upperarm.' + s][0]).length
        if (d > R or faces_arm) and dsh > .07:
            for k in ws: G[k].remove([v.index])
            rest = sum(g.weight for g in v.groups)
            if rest < 1e-3: G['chest' if p.z > B['chest'][0].z else 'pelvis'].add([v.index], 1.0, 'REPLACE')
            n += 1
print('cleaned arm weights on', n, 'verts'); bpy.ops.wm.save_mainfile()
