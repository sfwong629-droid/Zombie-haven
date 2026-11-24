# propfx.py -- an optional loose prop for preview renders (animvid.py, closeup.py): PROP = path of a JSON {"r": radius, "pos": [[x, y, z] or null, ...]},
# the prop's world place sampled evenly over the clip (null hides it). Made for the Thrower's rock: a lumpy grey-brown stone made here in code.
import os, json, random, bpy
from mathutils import Vector
def make():
    p = os.environ.get('PROP')
    if not p: return None
    d = json.load(open(p)); bpy.ops.mesh.primitive_ico_sphere_add(subdivisions=2, radius=d.get('r', .05)); o = bpy.context.object; rnd = random.Random(3)
    for v in o.data.vertices: v.co *= 1 + rnd.uniform(-.22, .18)
    o.scale = (1.15, 1, .85); m = bpy.data.materials.new('rock'); m.diffuse_color = (.45, .41, .36, 1); o.data.materials.append(m); o.color = (.45, .41, .36, 1)
    for f in o.data.polygons: f.use_smooth = False
    o['_pos'] = json.dumps(d['pos']); return o
def place(o, u):
    if o is None: return
    pos = json.loads(o['_pos']); i = min(len(pos) - 1, max(0, int(round(u * (len(pos) - 1))))); q = pos[i]
    if q is None: o.hide_render = True
    else: o.hide_render = False; o.location = Vector(q); o.rotation_euler = (u * 9, u * 5, 0)
