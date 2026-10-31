"""Animate a rigged AI model (from ai_model.py prep) and render isometric sprites.

  python3 ai_render.py RIG.blend OUT_DIR preview            # big check renders: front + SE rest/walk/chop
  python3 ai_render.py RIG.blend OUT_DIR sprites [weapon=pickaxe,club,none] [px=64]
Weapons are meshes bound rigidly to the hand.R bone, so they move with the hand on every frame.
"""
import bpy, math, os, sys
from mathutils import Vector, Matrix
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import survivor

D = math.radians
FACE = {'side': 0, 'se': 90, 'sw': 0, 'nw': -90, 'ne': 180, 'front': 45}
ARM_DOWN = -24
HEAD_UP = -8       # tip the big head back a little so the face meets the high camera     # degrees to bring the A-pose arms in toward the body

def load(path):
    bpy.ops.wm.open_mainfile(filepath=path)
    ao = bpy.data.objects['rig']; body = bpy.data.objects['body']
    ao.show_in_front = False; ao.hide_render = True
    return ao, body

def _mat(name, hexc):
    m = bpy.data.materials.new(name); m.use_nodes = True
    b = m.node_tree.nodes['Principled BSDF']
    c = tuple(int(hexc[i:i + 2], 16) / 255 for i in (1, 3, 5))
    b.inputs['Base Color'].default_value = (*[x ** 2.2 for x in c], 1); b.inputs['Roughness'].default_value = 1
    return m

def weapon(ao, kind):
    """Build the weapon in the rest pose around the right fist and bind it to hand.R."""
    if kind in (None, 'none'): return None
    hb = ao.data.bones['hand.R']
    a, b = ao.matrix_world @ hb.head_local, ao.matrix_world @ hb.tail_local
    g = a.lerp(b, .55)                                  # fist centre
    fwd = Vector((0, -1, 0))                            # model front
    up = (fwd + Vector((0, 0, .08))).normalized()     # hammer grip: handle runs forward out of the fist (wrist angle aims it)
    wood = _mat('wood', '#8a5a32'); metal = _mat('metal', '#9a9c98'); dark = _mat('grip', '#4a3020')
    bm_objs = []
    def tube(p0, p1, r0, r1, m, seg=8):
        o = survivor.tube(p0, p1, r0, r1, m, seg=seg); bm_objs.append(o)
    def box(c, size, m, rot=(0, 0, 0)):
        o = survivor.box(c, size, m, rot=rot, bevel=.004); bm_objs.append(o)
    L = .42
    if kind == 'pickaxe':
        tube(g - up * .06, g + up * L, .016, .014, wood)
        hd = g + up * (L - .02); side = fwd.cross(up).normalized(); across = up.cross(side).normalized()
        for sg in (1, -1):
            tip = hd + across * sg * .16 - up * .045
            tube(hd, tip, .022, .006, metal, seg=6)
    elif kind == 'club':
        tube(g - up * .05, g + up * .12, .018, .018, dark)
        tube(g + up * .12, g + up * (L + .02), .02, .042, wood, seg=10)
    elif kind == 'axe':
        tube(g - up * .06, g + up * L, .016, .014, wood)
        hd = g + up * (L - .05); side = fwd.cross(up).normalized(); across = up.cross(side).normalized()
        box(hd + across * .05, (.02, .1, .1), metal)
    bpy.ops.object.select_all(action='DESELECT')
    for o in bm_objs: o.select_set(True)
    bpy.context.view_layer.objects.active = bm_objs[0]
    if len(bm_objs) > 1: bpy.ops.object.join()
    w = bpy.context.view_layer.objects.active; w.name = 'weapon_' + kind
    # orient the box helper's rotation in world space then bind
    J = {k: (ao.data.bones[k].head_local, ao.data.bones[k].tail_local, None) for k in ao.data.bones.keys()}
    survivor.bind_weights(w, J, rigid='hand.R'); survivor.attach(w, ao)
    return w

def setup_scene(px=512, tilt=45, height=1.1):
    S = bpy.context.scene
    for o in list(bpy.data.objects):
        if o.type in ('CAMERA', 'LIGHT'): bpy.data.objects.remove(o)
    cam = bpy.data.objects.new('cam', bpy.data.cameras.new('cam')); S.collection.objects.link(cam)
    cam.data.type = 'ORTHO'; cam.data.ortho_scale = height * 1.0 / .875 * 1.0   # character ~ 7/8 of the frame
    cam.rotation_euler = (D(tilt), 0, D(45))
    look = Vector((0, 0, -1)); look.rotate(cam.rotation_euler)
    cam.location = Vector((0, 0, height * .5)) - look * 20; cam.data.clip_end = 60; S.camera = cam
    S.render.resolution_x = S.render.resolution_y = px
    sun = bpy.data.objects.new('sun', bpy.data.lights.new('sun', 'SUN')); S.collection.objects.link(sun)
    sun.data.energy = 2.2; sun.data.angle = D(10); sun.data.color = (1.0, .97, .9)
    d = Vector((.5, -.6, -.75)).normalized(); sun.rotation_euler = (-d).to_track_quat('Z', 'Y').to_euler()
    w = bpy.data.worlds.new('w'); S.world = w; w.use_nodes = True
    w.node_tree.nodes['Background'].inputs['Color'].default_value = (1, 1, 1, 1)
    w.node_tree.nodes['Background'].inputs['Strength'].default_value = .85
    S.render.engine = 'BLENDER_EEVEE'; S.eevee.taa_render_samples = 16
    S.view_settings.view_transform = 'Standard'
    S.render.film_transparent = True
    S.render.image_settings.file_format = 'PNG'; S.render.image_settings.color_mode = 'RGBA'
    return cam

def apply_pose(ao, p):
    p = dict(p)
    for side, sg in (('L', 1), ('R', -1)):           # A-pose -> arms nearer the body
        x, y, z = p.get('upperarm.' + side, (0, 0, 0)); p['upperarm.' + side] = (x, y, z + sg * ARM_DOWN)
    hx, hy, hz = p.get('head', (0, 0, 0)); p['head'] = (hx + HEAD_UP, hy, hz)
    survivor.pose({'arm': ao}, p)

def chop(t):
    """Overhead chop for a big-headed chibi (short arms): wind-up beside/behind the head, fast strike low in front.
    Weapon angle above 'forward' = upperarm + forearm + wrist (all forward rotations)."""
    def ease(x): return x * x * (3 - 2 * x)
    K = [  # time, upperarm fwd, forearm bend, wrist, chest lean, chest twist
        (0.0, 5, 20, 20, 0, 0), (.36, 170, 50, -10, -5, -14), (.46, 175, 55, -5, -6, -16),
        (.56, 95, 10, -75, 5, 10), (.66, 55, 5, -90, 7, 12), (1.0, 5, 20, 20, 0, 0)]
    for (t0, *a0), (t1, *a1) in zip(K, K[1:]):
        if t0 <= t <= t1:
            u = ease((t - t0) / (t1 - t0)); ua, fa, wr, lean, tw = [x + (y - x) * u for x, y in zip(a0, a1)]; break
    p = survivor.idle(0)
    p['upperarm.R'] = (ua, 0, 0); p['forearm.R'] = (fa, 0, 0); p['hand.R'] = (wr, 0, 0)
    p['upperarm.L'] = (15 + .2 * ua, 0, 0); p['forearm.L'] = (40, 0, 0)
    p['chest'] = (lean, tw, 0); p['pelvis'] = (0, tw * .3, 0); p['head'] = (-10 - lean * .6, -tw * .4, 0)
    p['thigh.L'] = (14, 0, 0); p['shin.L'] = (-14, 0, 0); p['thigh.R'] = (-8, 0, 0); p['shin.R'] = (-10, 0, 0)
    return p

def face(ao, view): ao.rotation_euler = (0, 0, D(FACE[view]))

def shot(path):
    S = bpy.context.scene; S.render.filepath = path; bpy.ops.render.render(write_still=True)

if __name__ == '__main__':
    blend, out, job = sys.argv[1], sys.argv[2], sys.argv[3]
    os.makedirs(out, exist_ok=True)
    ao, body = load(blend)
    if job == 'sprites':
        # big renders per frame; spritify.py turns them into 64px pixel sprites
        kinds = ([a.split('=', 1)[1].split(',') for a in sys.argv if a.startswith('weapon=')] or [['pickaxe']])[0]
        scale = float(([a.split('=')[1] for a in sys.argv if a.startswith('scale=')] or ['1.0'])[0])
        cam = setup_scene(px=256); cam.data.ortho_scale = scale
        look = Vector((0, 0, -1)); look.rotate(cam.rotation_euler); cam.location = Vector((0, 0, .55)) - look * 20
        bpy.context.scene.eevee.taa_render_samples = 8
        clips = {'walk': [dict(survivor.walk(i / 8), **{'hand.R': (40, 0, 0)}) for i in range(8)],   # tool tipped up while walking
                 'chop': [chop(t) for t in (0, .2, .38, .46, .54, .6, .66, .82)]}
        for kind in kinds:
            w = weapon(ao, kind)
            for view in ('se', 'sw', 'ne', 'nw'):
                face(ao, view)
                for clip, poses in clips.items():
                    for i, p in enumerate(poses):
                        apply_pose(ao, p); shot(os.path.join(out, kind, f'{clip}_{view}_{i}.png'))
                print('done', kind, view, flush=True)
            if w: bpy.data.objects.remove(w)
    if job == 'diag':
        setup_scene(px=384)
        for view in ('se', 'side'):
            for name, p in [('rest', {}), ('w0', survivor.walk(0)), ('w25', survivor.walk(.25)), ('w50', survivor.walk(.5)),
                            ('c42', chop(.42)), ('c60', chop(.62))]:
                face(ao, view); apply_pose(ao, p); shot(os.path.join(out, f'd_{view}_{name}.png'))
    if job == 'preview':
        weapon(ao, 'pickaxe')
        setup_scene(px=512)
        for view, name, p in [('front', 'rest', {}), ('se', 'rest', {}), ('se', 'walk', survivor.walk(.25)),
                              ('se', 'chop_up', chop(.42)), ('se', 'chop_hit', chop(.62)),
                              ('ne', 'walk', survivor.walk(.75))]:
            face(ao, view); apply_pose(ao, p); shot(os.path.join(out, f'{view}_{name}.png')); print('shot', view, name, flush=True)
