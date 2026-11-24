# propfx.py -- an optional loose prop for preview renders (animvid.py, closeup.py): PROP = path of a JSON {"r": radius, "pos": [[x, y, z] or null, ...]},
# the prop's world place sampled evenly over the clip (null hides it). Made for the Thrower's rock: a lumpy grey-brown stone made here in code.
# With "kind": "balloon" (the Fizzbomb's extra move) each sample is {knot, ax, s} or null, and red shreds fly for a few frames after the pop.
import os, json, random, bpy
from mathutils import Vector
def _mat(o, c):
    m = bpy.data.materials.new('p'); m.diffuse_color = c; o.data.materials.append(m); o.color = c
def make_balloon(d):   # the Fizzbomb's balloon (kind "balloon"): knot at the origin, the body along +Z, radius 1; red, with a tied knot
    bpy.ops.mesh.primitive_uv_sphere_add(segments=24, ring_count=14, radius=1, location=(0, 0, 1.18)); o = bpy.context.object
    for v in o.data.vertices:
        if v.co.z < 0: f = 1 + .35 * v.co.z; v.co.x *= max(.25, f); v.co.y *= max(.25, f)    # a teardrop: narrower toward the knot
    for v in o.data.vertices: v.co.z = 1.18 + (v.co.z - 1.18) * 1.12
    for f in o.data.polygons: f.use_smooth = True
    bpy.ops.mesh.primitive_cone_add(vertices=10, radius1=.16, radius2=.05, depth=.22, location=(0, 0, .11)); k = bpy.context.object
    bpy.ops.mesh.primitive_torus_add(major_radius=.09, minor_radius=.05, location=(0, 0, .02)); r = bpy.context.object
    for x in (k, r): x.select_set(True)
    o.select_set(True); bpy.context.view_layer.objects.active = o; bpy.ops.object.join(); _mat(o, (.86, .1, .12, 1))
    bits = []
    for i in range(12):   # the pop: red shreds flying out
        bpy.ops.mesh.primitive_plane_add(size=1); b = bpy.context.object; _mat(b, (.86, .1, .12, 1)); b.hide_render = True; bits.append(b.name)
    o['_bits'] = json.dumps(bits); o['_pos'] = json.dumps(d['pos']); o['_kind'] = 'balloon'; return o
def place_balloon(o, u):
    pos = json.loads(o['_pos']); i = min(len(pos) - 1, max(0, int(round(u * (len(pos) - 1))))); q = pos[i]; bits = [bpy.data.objects[n] for n in json.loads(o['_bits'])]
    for b in bits: b.hide_render = True
    if q is None:   # just popped: shreds for a few frames after the last frame it was whole
        last = next((j for j in range(i, -1, -1) if pos[j] is not None), None)
        if last is None or i - last > 5: o.hide_render = True; return
        q = pos[last]; o.hide_render = True; c = Vector(q['knot']) + Vector(q['ax']) * q['s'] * 1.2; e = (i - last) / 5; rnd = random.Random(7)
        for b in bits:
            dv = Vector((rnd.uniform(-1, 1), rnd.uniform(-1, 1), rnd.uniform(-.6, 1))).normalized()
            b.hide_render = False; b.location = c + dv * q['s'] * (1.1 + 2.2 * e) - Vector((0, 0, .05 * e * e)); b.scale = [q['s'] * .45 * (1 - .5 * e)] * 3
            b.rotation_euler = (rnd.uniform(0, 6), rnd.uniform(0, 6), rnd.uniform(0, 6))
        return
    o.hide_render = False; s = q['s']; zs = s * (1 + 1.6 * max(0., 1 - s / .12))   # a limp balloon is long and thin
    o.location = Vector(q['knot']); o.rotation_mode = 'QUATERNION'; o.rotation_quaternion = Vector((0, 0, 1)).rotation_difference(Vector(q['ax'])); o.scale = (s, s, zs)
def make():
    p = os.environ.get('PROP')
    if not p: return None
    d = json.load(open(p))
    if d.get('kind') == 'balloon': return make_balloon(d)
    bpy.ops.mesh.primitive_ico_sphere_add(subdivisions=2, radius=d.get('r', .05)); o = bpy.context.object; rnd = random.Random(3)
    for v in o.data.vertices: v.co *= 1 + rnd.uniform(-.22, .18)
    o.scale = (1.15, 1, .85); m = bpy.data.materials.new('rock'); m.diffuse_color = (.45, .41, .36, 1); o.data.materials.append(m); o.color = (.45, .41, .36, 1)
    for f in o.data.polygons: f.use_smooth = False
    o['_pos'] = json.dumps(d['pos']); return o
def place(o, u):
    if o is None: return
    if o.get('_kind') == 'balloon': return place_balloon(o, u)
    pos = json.loads(o['_pos']); i = min(len(pos) - 1, max(0, int(round(u * (len(pos) - 1))))); q = pos[i]
    if q is None: o.hide_render = True
    else: o.hide_render = False; o.location = Vector(q); o.rotation_euler = (u * 9, u * 5, 0)
