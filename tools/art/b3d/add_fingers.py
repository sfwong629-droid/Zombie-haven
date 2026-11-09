"""3D.88 Give a rigged AI model one 'fingers' bone per hand so clips can close the hand into a fist.
  python3 add_fingers.py RIG.blend OUT.blend [split=.5]
The fingers bone runs from the middle of the hand bone to just past its tip; vertices past the split point along the
hand move their hand weight onto it (blended over a short band so the knuckles bend smoothly)."""
import bpy, sys, numpy as np
from mathutils import Vector
src, out = sys.argv[1], sys.argv[2]; opt = dict(a.split('=') for a in sys.argv[3:]); SPLIT = float(opt.get('split', .5))
bpy.ops.wm.open_mainfile(filepath=src)
arm = next(o for o in bpy.data.objects if o.type == 'ARMATURE'); body = [o for o in bpy.data.objects if o.type == 'MESH' and o.find_armature() == arm]
bpy.context.view_layer.objects.active = arm; bpy.ops.object.mode_set(mode='EDIT'); eb = arm.data.edit_bones; seg = {}
for sd in 'LR':
    h = eb['hand.' + sd]; a, b = h.head.copy(), h.tail.copy(); d = (b - a)
    f = eb.new('fingers.' + sd); f.head = a + d * SPLIT; f.tail = b + d.normalized() * .06; f.roll = h.roll; f.parent = h; f.use_connect = False
    seg[sd] = (arm.matrix_world @ a, arm.matrix_world @ (b + d.normalized() * .06))
bpy.ops.object.mode_set(mode='OBJECT')
for o in body:
    co = np.array([(o.matrix_world @ v.co)[:] for v in o.data.vertices])
    for sd in 'LR':
        hg = o.vertex_groups.get('hand.' + sd)
        if not hg: continue
        fg = o.vertex_groups.get('fingers.' + sd) or o.vertex_groups.new(name='fingers.' + sd)
        a, b = np.array(seg[sd][0][:]), np.array(seg[sd][1][:]); ab = b - a; t = ((co - a) @ ab) / (ab @ ab); n = 0
        for v in o.data.vertices:
            w = next((g.weight for g in v.groups if g.group == hg.index), 0)
            if w <= 0: continue
            k = min(1.0, max(0.0, (t[v.index] - (SPLIT - .08)) / .16))
            if k <= 0: continue
            fg.add([v.index], w * k, 'REPLACE'); hg.add([v.index], w * (1 - k), 'REPLACE'); n += 1
        print('fingers', sd, o.name, n, flush=True)
bpy.ops.wm.save_as_mainfile(filepath=out)
