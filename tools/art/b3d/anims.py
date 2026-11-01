"""Full survivor animation set on the shared skeleton, with real weapons on the hand bone and baked effects.

  python3 anims.py RIG.blend RAW_DIR [clips=all|idle,walk,...] [weapons=none,bat,axe,rifle,ak47] [views=se,sw,ne,nw] [px=256] [preview] [actions=WORKBENCH.blend]
Writes RAW_DIR/<weapon>/<clip>_<view>_<i>.png and RAW_DIR/anchor.json; spritify.py RAW/<weapon> OUT smooth makes 128-px frames.

Pose angles are degrees, survivor.pose convention: x = forward swing (upperarm, thigh), bend (forearm), lean (chest/pelvis);
shin negative = knee bend; head negative x = look up; y = twist about the bone; 'bob' = body up/down (units).
Weapon angle above 'forward' ~= upperarm + forearm + hand x (hammer grip: the weapon leaves the fist pointing forward).
"""
import bpy, math, os, sys, json
from mathutils import Vector, Matrix
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import survivor, ai_render

D = math.radians
def ease(x): return x * x * (3 - 2 * x)
def lerp(a, b, u): return a + (b - a) * u

def keys(K, t, loop=False):
    """K: [(time, {name: value or (x, y, z)}), ...] -> interpolated dict at t (0..1)."""
    if loop: t = t % 1.0
    for (t0, a), (t1, b) in zip(K, K[1:]):
        if t0 <= t <= t1:
            u = ease((t - t0) / max(t1 - t0, 1e-6)); out = {}
            for k in set(a) | set(b):
                va, vb = a.get(k, b.get(k)), b.get(k, a.get(k))
                out[k] = tuple(lerp(x, y, u) for x, y in zip(va, vb)) if isinstance(va, tuple) else lerp(va, vb, u)
            return out
    return dict(K[-1][1])

def soft_legs(p, k=1.0):
    """Knees always a little bent (an athletic, game-like stance)."""
    p.update({'thigh.L': (14 * k, 0, 0), 'thigh.R': (11 * k, 0, 0), 'shin.L': (-26 * k, 0, 0), 'shin.R': (-22 * k, 0, 0),
              'foot.L': (12 * k, 0, 0), 'foot.R': (11 * k, 0, 0)})
    p['bob'] = p.get('bob', 0) - .025 * k
    return p

def walk_legs(t, stride=1.0):
    """Walk cycle with strong knee bend: the lifting leg folds high, the planted leg stays soft."""
    ph = 2 * math.pi * t; sn, cs = math.sin(ph), math.cos(ph); p = {}
    for n, sg in (('L', 1), ('R', -1)):
        th = 32 * sg * sn * stride; kn = 22 + 62 * max(0.0, sg * cs) ** 1.3
        p['thigh.' + n] = (th + 8, 0, 0)
        p['shin.' + n] = (-kn, 0, 0)
        p['foot.' + n] = (-(th - kn) * .35 + kn * .45, 0, 0)
        p['upperarm.' + n] = (-26 * sg * sn, 0, 0)
        p['forearm.' + n] = (28 + 22 * max(0.0, -sg * sn), 0, 0)
    p['bob'] = .02 * math.cos(2 * ph) - .045
    p['pelvis'] = (0, 6 * sn, 0); p['chest'] = (5, -9 * sn, 0); p['head'] = (-12, 4 * sn, 0)
    return p

def legs_walk(p, t, stride=1.0):
    w = walk_legs(t)
    for k in ('thigh.L', 'thigh.R', 'shin.L', 'shin.R', 'foot.L', 'foot.R', 'pelvis'):
        p[k] = tuple(x * stride for x in w[k])
    p['bob'] = w['bob']
    return p

# ------------------------------------------------------------------ clips: f(t) -> pose dict;  (frames, ms, loop, needs)
def idle(t):
    w = math.sin(2 * math.pi * t)
    p = soft_legs({'chest': (1.5 * w, 0, 0), 'neck': (-1.5 * w, 0, 0), 'head': (-6 - 1.5 * w, 0, 3 * math.sin(2 * math.pi * t + 1)),
                   'upperarm.L': (3, 0, 4 + 2 * w), 'upperarm.R': (3, 0, -4 - 2 * w), 'forearm.L': (18 + 4 * w, 0, 0), 'forearm.R': (18 + 4 * w, 0, 0)})
    p['bob'] = -.012 - .006 * (1 - w) / 2
    return p

def walk(t):
    return walk_legs(t)

def hold_idle_melee(t):
    """Weapon ready: two hands on the handle in front of the chest, head of the weapon up, a little bounce."""
    w = math.sin(2 * math.pi * t)
    p = soft_legs({'upperarm.R': (6 + 2 * w, 0, -18), 'forearm.R': (18, 0, 0), 'hand.R': (-78, 0, 0),   # held down at the side, head forward
                   'chest': (4 + w, -6, 0), 'head': (-8, 4, 0)}, 1.2)
    p['thigh.L'] = (20, 0, 0); p['shin.L'] = (-28, 0, 0)
    p['bob'] -= .006 * (1 - w) / 2
    return p

def hold_walk_melee(t):
    p = legs_walk({}, t)
    s = math.sin(2 * math.pi * t)
    p.update({'upperarm.R': (6 - 10 * s, 0, -18), 'forearm.R': (18, 0, 0), 'hand.R': (-78, 0, 0), 'chest': (6, -6 + 4 * s, 0), 'head': (-10, 4, 0)})
    return p

GUN = (65, 55)    # upper arm, forearm: rifle at chest height

def hold_idle_gun(t):
    """Rifle at the shoulder, aimed forward, small breathing sway."""
    w = math.sin(2 * math.pi * t)
    ua, fa = GUN
    p = soft_legs({'upperarm.R': (ua + w, 0, -12), 'forearm.R': (fa, 0, 0), 'hand.R': (-(ua + fa) + 2 * w, 0, 0),
                   'chest': (5, 0, 0), 'head': (-8, 0, 0), 'thigh.L': (14, 0, 0), 'shin.L': (-14, 0, 0)}, 1.2)
    p['bob'] = -.025 - .005 * (1 - w) / 2
    return p

def hold_walk_gun(t):
    p = legs_walk({}, t, .85)
    s = math.sin(4 * math.pi * t)
    ua, fa = GUN
    p.update({'upperarm.R': (ua, 0, -12), 'forearm.R': (fa, 0, 0), 'hand.R': (-(ua + fa) + 2 * s, 0, 0), 'chest': (7, 0, 0), 'head': (-9, 0, 0)})
    return p

def fire(t):
    """Shot at t=0: recoil kick up and back, settle."""
    ua, fa = GUN
    kick = math.exp(-t * 9) * (1 if t < .9 else 0)
    p = hold_idle_gun(0)
    p['chest'] = (5 - 6 * kick, 0, 0); p['head'] = (-8 - 3 * kick, 0, 0); p['recoil'] = kick
    return p

def punch(t):
    K = [(0, {'ua': 30, 'fa': 110, 'tw': -12, 'lean': 0}), (.3, {'ua': 20, 'fa': 120, 'tw': -22, 'lean': -2}),
         (.5, {'ua': 85, 'fa': 5, 'tw': 18, 'lean': 10}), (.65, {'ua': 85, 'fa': 5, 'tw': 18, 'lean': 10}), (1, {'ua': 30, 'fa': 110, 'tw': -12, 'lean': 0})]
    k = keys(K, t)
    p = soft_legs({'upperarm.R': (k['ua'], 0, 6), 'forearm.R': (k['fa'], 0, 0), 'hand.R': (0, 0, 0),
                   'upperarm.L': (45, 0, -10), 'forearm.L': (115, 0, 0),
                   'chest': (k['lean'], k['tw'], 0), 'pelvis': (0, k['tw'] * .4, 0), 'head': (-8, -k['tw'] * .5, 0),
                   }, 1)
    p.update({'thigh.L': (34, 0, -4), 'shin.L': (-34, 0, 0), 'foot.L': (8, 0, 0),
              'thigh.R': (-26, 0, 4), 'shin.R': (-30, 0, 0), 'foot.R': (30, 0, 0)})
    p['bob'] = -.06
    return p

def swing_a(t):
    """Overhead chop: wind-up beside the head, fast strike low in front, hold, recover."""
    K = [(0, {'ua': 35, 'fa': 70, 'wr': -15, 'lean': 4, 'tw': -8}), (.36, {'ua': 170, 'fa': 50, 'wr': -10, 'lean': -5, 'tw': -14}),
         (.46, {'ua': 175, 'fa': 55, 'wr': -5, 'lean': -6, 'tw': -16}), (.56, {'ua': 95, 'fa': 10, 'wr': -75, 'lean': 5, 'tw': 10}),
         (.66, {'ua': 55, 'fa': 5, 'wr': -90, 'lean': 8, 'tw': 12}), (1, {'ua': 35, 'fa': 70, 'wr': -15, 'lean': 4, 'tw': -8})]
    k = keys(K, t)
    p = soft_legs({'upperarm.R': (k['ua'], 0, 0), 'forearm.R': (k['fa'], 0, 0), 'hand.R': (k['wr'], 0, 0),
                   'chest': (k['lean'], k['tw'], 0), 'pelvis': (0, k['tw'] * .3, 0), 'head': (-10 - k['lean'] * .6, -k['tw'] * .4, 0),
                   'thigh.L': (14, 0, 0), 'shin.L': (-14, 0, 0), 'thigh.R': (-8, 0, 0), 'shin.R': (-10, 0, 0)})
    p['bob'] = -.02 - .015 * max(0, k['lean']) / 8
    return p

def swing_b(t):
    """Side swing: wind back to the right, sweep across in front to the left at chest height, follow through."""
    K = [(0, {'ua': 35, 'fa': 70, 'wr': -15, 'wy': 0, 'tw': -8, 'ab': 0}), (.35, {'ua': 80, 'fa': 40, 'wr': -40, 'wy': 80, 'tw': -55, 'ab': -35}),
         (.45, {'ua': 82, 'fa': 35, 'wr': -40, 'wy': 85, 'tw': -60, 'ab': -38}), (.58, {'ua': 88, 'fa': 5, 'wr': -80, 'wy': 85, 'tw': 30, 'ab': 15}),
         (.7, {'ua': 80, 'fa': 15, 'wr': -80, 'wy': 85, 'tw': 50, 'ab': 25}), (1, {'ua': 35, 'fa': 70, 'wr': -15, 'wy': 0, 'tw': -8, 'ab': 0})]
    k = keys(K, t)
    p = soft_legs({'upperarm.R': (k['ua'], 0, k['ab']), 'forearm.R': (k['fa'], 0, 0), 'hand.R': (k['wr'], k['wy'], 0),
                   'chest': (6, k['tw'], 0), 'pelvis': (0, k['tw'] * .35, 0), 'head': (-10, -k['tw'] * .45, 0),
                   'thigh.L': (14, 0, 0), 'shin.L': (-14, 0, 0), 'thigh.R': (-8, 0, 0), 'shin.R': (-10, 0, 0)}, 1.2)
    p['bob'] = -.025
    return p

def swing_c(t):
    """Diagonal slash: from high over the right shoulder down across to the left hip."""
    K = [(0, {'ua': 35, 'fa': 70, 'wr': -15, 'wy': 0, 'tw': -8, 'ab': 0, 'lean': 4}),
         (.35, {'ua': 150, 'fa': 60, 'wr': -20, 'wy': 30, 'tw': -35, 'ab': -45, 'lean': -4}),
         (.45, {'ua': 155, 'fa': 62, 'wr': -15, 'wy': 30, 'tw': -40, 'ab': -48, 'lean': -5}),
         (.58, {'ua': 75, 'fa': 10, 'wr': -80, 'wy': 30, 'tw': 12, 'ab': -30, 'lean': 10}),
         (.7, {'ua': 45, 'fa': 10, 'wr': -85, 'wy': 30, 'tw': 16, 'ab': -35, 'lean': 10}),
         (1, {'ua': 35, 'fa': 70, 'wr': -15, 'wy': 0, 'tw': -8, 'ab': 0, 'lean': 4})]
    k = keys(K, t)
    p = soft_legs({'upperarm.R': (k['ua'], 0, k['ab']), 'forearm.R': (k['fa'], 0, 0), 'hand.R': (k['wr'], k['wy'], 0),
                   'chest': (k['lean'], k['tw'], 0), 'pelvis': (0, k['tw'] * .35, 0), 'head': (-10 - k['lean'] * .5, -k['tw'] * .45, 0),
                   'thigh.L': (16, 0, 0), 'shin.L': (-16, 0, 0), 'thigh.R': (-8, 0, 0), 'shin.R': (-10, 0, 0)}, 1.2)
    p['bob'] = -.025 - .01 * max(0, k['lean']) / 10
    return p

def rescue(t):
    """Pushing the rescue cart: lean in, both arms forward low, slow heavy steps."""
    p = legs_walk({}, t, .8)
    p.update({'upperarm.R': (62, 0, 6), 'upperarm.L': (62, 0, -6), 'forearm.R': (25, 0, 0), 'forearm.L': (25, 0, 0),
              'chest': (16, 0, 0), 'head': (-20, 0, 0)})
    p['pelvis'] = (8, p['pelvis'][1] * .5, 0)
    return p

def hurt(t):
    K = [(0, {'lean': 0, 'hd': -6, 'ua': 3, 'fa': 18, 'bob': -.012, 'th': 7}),
         (.25, {'lean': -18, 'hd': 10, 'ua': 25, 'fa': 70, 'bob': -.035, 'th': -6}),
         (.5, {'lean': -12, 'hd': 4, 'ua': 20, 'fa': 60, 'bob': -.03, 'th': -2}),
         (1, {'lean': 0, 'hd': -6, 'ua': 3, 'fa': 18, 'bob': -.012, 'th': 7})]
    k = keys(K, t)
    p = soft_legs({'chest': (k['lean'], 0, 0), 'head': (k['hd'], 0, 0), 'upperarm.L': (k['ua'], 0, 18), 'upperarm.R': (k['ua'], 0, -18),
                   'forearm.L': (k['fa'], 0, 0), 'forearm.R': (k['fa'], 0, 0)})
    p['thigh.R'] = (k['th'], 0, 0); p['bob'] = k['bob']
    return p

def hold_hurt(t, wclass):
    """Hit while armed: flinch back from the ready pose, weapon kept in hand."""
    base = (hold_idle_gun if wclass == 'gun' else hold_idle_melee)(0)
    K = [(0, {'lean': 0, 'hd': 0, 'bob': 0, 'th': 0}), (.25, {'lean': -16, 'hd': 12, 'bob': -.025, 'th': -14}),
         (.5, {'lean': -10, 'hd': 6, 'bob': -.02, 'th': -8}), (1, {'lean': 0, 'hd': 0, 'bob': 0, 'th': 0})]
    k = keys(K, t); p = dict(base)
    c = p.get('chest', (0, 0, 0)); p['chest'] = (c[0] + k['lean'], c[1], c[2])
    h = p.get('head', (0, 0, 0)); p['head'] = (h[0] + k['hd'], h[1], h[2])
    r = p.get('thigh.R', (0, 0, 0)); p['thigh.R'] = (r[0] + k['th'], 0, 0)
    p['bob'] = p.get('bob', 0) + k['bob']
    return p

def collapse(t):
    """Knees give, falls back onto the ground, ends lying still."""
    K = [(0, {'pel': 0, 'bob': -.012, 'th': 7, 'sh': -13, 'lean': 0, 'hd': -6, 'ua': 3, 'fa': 18}),
         (.25, {'pel': 0, 'bob': -.1, 'th': 50, 'sh': -90, 'lean': 15, 'hd': 8, 'ua': 15, 'fa': 40}),
         (.55, {'pel': -50, 'bob': -.17, 'th': 45, 'sh': -55, 'lean': -10, 'hd': -10, 'ua': 25, 'fa': 25}),
         (.8, {'pel': -86, 'bob': -.21, 'th': 18, 'sh': -14, 'lean': -4, 'hd': -20, 'ua': 4, 'fa': 8}),
         (1, {'pel': -88, 'bob': -.215, 'th': 12, 'sh': -10, 'lean': -4, 'hd': -22, 'ua': 0, 'fa': 6})]
    k = keys(K, t)
    turn = 40 * min(1, max(0, (t - .45) / .4))
    p = {'pelvis': (k['pel'], 0, 0), 'chest': (k['lean'], 0, 0), 'head': (k['hd'] * .3 + 6 * min(1, t * 2), turn, 0),
         'thigh.L': (k['th'], 0, 0), 'thigh.R': (k['th'] * .9, 0, 0), 'shin.L': (k['sh'], 0, 0), 'shin.R': (k['sh'] * 1.1, 0, 0),
         'upperarm.L': (k['ua'], 0, 8), 'upperarm.R': (k['ua'] * .9, 0, -8), 'forearm.L': (k['fa'], 0, 0), 'forearm.R': (k['fa'], 0, 0),
         'bob': k['bob']}
    return p

def cheer(t):
    s = abs(math.sin(2 * math.pi * t))
    p = soft_legs({'upperarm.L': (8, 0, 168), 'upperarm.R': (8, 0, -168), 'forearm.L': (-5 + 10 * s, 0, 0), 'forearm.R': (-5 + 10 * s, 0, 0),
                   'chest': (-6, 0, 0), 'head': (-18, 0, 4 * math.sin(4 * math.pi * t))}, 1 - s)
    p['bob'] = -.01 + .05 * s
    return p

CLIPS = {  # name: (pose fn, frames, ms per frame, loop, weapon class: None/'melee'/'gun')
    'idle': (idle, 8, 160, True, None), 'walk': (walk, 8, 110, True, None),
    'hold_idle': (None, 8, 160, True, 'any'), 'hold_walk': (None, 8, 110, True, 'any'),
    'rescue': (rescue, 8, 140, True, None), 'punch': (punch, 6, 80, False, None),
    'swing_a': (swing_a, 8, 0, False, 'melee'), 'swing_b': (swing_b, 8, 0, False, 'melee'), 'swing_c': (swing_c, 8, 0, False, 'melee'),
    'fire': (fire, 6, 70, False, 'gun'), 'hurt': (hurt, 5, 110, False, None), 'hold_hurt': (None, 5, 110, False, 'any'), 'collapse': (collapse, 8, 140, False, None),
    'cheer': (cheer, 8, 120, True, None)}
SWING_T = [0, .2, .38, .46, .54, .6, .66, .82]          # uneven times: slow wind-up, fast strike
SWING_MS = [160, 130, 120, 160, 60, 60, 200, 160]
WEAPONS = {'bat': 'melee', 'axe': 'melee', 'rifle': 'gun', 'ak47': 'gun'}

def pose_fn(clip, wclass):
    if clip == 'hold_idle': return hold_idle_gun if wclass == 'gun' else hold_idle_melee
    if clip == 'hold_walk': return hold_walk_gun if wclass == 'gun' else hold_walk_melee
    if clip == 'hold_hurt': return lambda t: hold_hurt(t, wclass)
    return CLIPS[clip][0]

def times(clip):
    f, n = CLIPS[clip][0], CLIPS[clip][1]
    if clip.startswith('swing'): return SWING_T
    loop = CLIPS[clip][3]
    return [i / n for i in range(n)] if loop else [i / (n - 1) for i in range(n)]

# ------------------------------------------------------------------ materials
def toon_mat(name, hexc, alpha=1.0, glow=1.0):
    m = bpy.data.materials.new(name); m.use_nodes = True; N, L = m.node_tree.nodes, m.node_tree.links
    for n in list(N): N.remove(n)
    c = tuple((int(hexc[i:i + 2], 16) / 255) ** 2.2 for i in (1, 3, 5))
    out = N.new('ShaderNodeOutputMaterial'); em = N.new('ShaderNodeEmission')
    if glow == 1.0:
        dif = N.new('ShaderNodeBsdfDiffuse'); s2r = N.new('ShaderNodeShaderToRGB'); bw = N.new('ShaderNodeRGBToBW')
        ramp = N.new('ShaderNodeValToRGB'); ramp.color_ramp.interpolation = 'CONSTANT'; el = ramp.color_ramp.elements
        el[0].position = 0; el[0].color = (*[x * .62 for x in c], 1); el[1].position = .4; el[1].color = (*[min(1, x * 1.05) for x in c], 1)
        L.new(dif.outputs[0], s2r.inputs[0]); L.new(s2r.outputs['Color'], bw.inputs[0]); L.new(bw.outputs[0], ramp.inputs[0])
        L.new(ramp.outputs['Color'], em.inputs['Color'])
    else:
        em.inputs['Color'].default_value = (*c, 1); em.inputs['Strength'].default_value = glow
    if alpha < 1.0:
        tr = N.new('ShaderNodeBsdfTransparent'); mix = N.new('ShaderNodeMixShader'); mix.inputs['Fac'].default_value = alpha
        L.new(tr.outputs[0], mix.inputs[1]); L.new(em.outputs[0], mix.inputs[2]); L.new(mix.outputs[0], out.inputs['Surface'])
        m['alpha_node'] = mix.name
        try: m.surface_render_method = 'BLENDED'
        except Exception: m.blend_method = 'BLEND'
    else:
        L.new(em.outputs[0], out.inputs['Surface'])
    return m

# ------------------------------------------------------------------ weapons (built at the rest pose, parented to the hand bone)
def _join(objs, name):
    bpy.ops.object.select_all(action='DESELECT')
    for o in objs: o.select_set(True)
    bpy.context.view_layer.objects.active = objs[0]
    if len(objs) > 1: bpy.ops.object.join()
    w = bpy.context.view_layer.objects.active; w.name = name; return w

def build_weapon(ao, kind):
    """Returns dict(obj, tip (empty at the striking end / muzzle), grip2 (left-hand target or None), cls)."""
    for pb in ao.pose.bones: pb.rotation_euler = (0, 0, 0); pb.location = (0, 0, 0)
    ao.rotation_euler = (0, 0, 0)          # build in the model's own frame, whatever direction was rendered last
    bpy.context.view_layer.update()
    hb = ao.data.bones['hand.R']; a, b = ao.matrix_world @ hb.head_local, ao.matrix_world @ hb.tail_local
    g = a.lerp(b, .55); fwd = Vector((0, -1, 0)); up = (fwd + Vector((0, 0, .08))).normalized()
    side = fwd.cross(Vector((0, 0, 1))).normalized(); across = up.cross(side).normalized()
    wood = toon_mat('w_wood', '#a8703c'); dark = toon_mat('w_dark', '#4a3324'); metal = toon_mat('w_metal', '#a9afb5')
    gun = toon_mat('w_gun', '#3c3f42'); gunwood = toon_mat('w_gunwood', '#7a4a26'); tape = toon_mat('w_tape', '#d8cfb8')
    parts = []
    T = lambda p0, p1, r0, r1, m, seg=10: parts.append(survivor.tube(p0, p1, r0, r1, m, seg=seg))
    Bx = lambda c, size, m, rot=(0, 0, 0): parts.append(survivor.box(c, size, m, rot=rot, bevel=.006))
    tip = grip2 = None
    if kind == 'bat':
        T(g - up * .08, g + up * .14, .028, .03, tape)
        T(g + up * .14, g + up * .5, .03, .052, wood, seg=12); tip = g + up * .46; grip2 = g + up * .1
    elif kind == 'axe':
        T(g - up * .08, g + up * .46, .024, .022, wood)
        hd = g + up * .42
        Bx(hd - across * .06, (.03, .09, .13), metal, rot=(0, 0, 0))
        T(hd - across * .02, hd - across * .14, .02, .045, metal, seg=4)
        tip = hd - across * .12; grip2 = g + up * .12
    elif kind in ('rifle', 'ak47'):
        # held at chest height in front of the right shoulder, barrel straight forward; the chest bone carries it
        sh = ao.matrix_world @ ao.data.bones['upperarm.R'].head_local
        g = Vector((sh.x * .55, sh.y - .2, sh.z - .1)); up = fwd
        rec = g + up * .02 + Vector((0, 0, .05))
        T(g - Vector((0, 0, .0)), rec, .022, .022, gun if kind == 'ak47' else gunwood, seg=6)              # grip
        T(rec - up * .26, rec - up * .02, .035, .042, gunwood)                                             # stock
        T(rec - up * .03, rec + up * .2, .04, .04, gun, seg=8)                                             # receiver
        T(rec + up * .2, rec + up * (.5 if kind == 'rifle' else .4), .014, .014, gun, seg=8)              # barrel
        T(rec + up * .2, rec + up * .34, .03, .028, gunwood if kind == 'rifle' else gunwood, seg=8)       # handguard
        if kind == 'ak47':
            T(rec + up * .08 - Vector((0, 0, .03)), rec + up * .14 - Vector((0, 0, .17)), .022, .018, gun, seg=6)   # curved mag
        else:
            T(rec + up * .05 + Vector((0, 0, .045)), rec + up * .17 + Vector((0, 0, .045)), .016, .016, gun, seg=6)  # scope
        tip = rec + up * (.52 if kind == 'rifle' else .42); grip2 = rec + up * .27 - Vector((0, 0, .03))
    w = _join(parts, 'weapon_' + kind)
    isgun = WEAPONS[kind] == 'gun'
    def bone_parent(ob, bone):
        mw = ob.matrix_world.copy(); ob.parent = ao; ob.parent_type = 'BONE'; ob.parent_bone = bone
        bpy.context.view_layer.update(); ob.matrix_world = mw
    bone_parent(w, 'chest' if isgun else 'hand.R')
    def empty(name, at):
        e = bpy.data.objects.new(name, None); bpy.context.scene.collection.objects.link(e); e.location = at
        bpy.context.view_layer.update(); mw = e.matrix_world.copy(); e.parent = w; bpy.context.view_layer.update(); e.matrix_world = mw
        return e
    out = {'obj': w, 'tip': empty('tip', tip), 'grip2': empty('grip2', grip2) if grip2 else None,
           'grip1': empty('grip1', g) if isgun else None, 'cls': WEAPONS[kind], 'kind': kind}
    return out

def hand_ik(ao, side, target, on):
    pb = ao.pose.bones['forearm.' + side]
    c = pb.constraints.get('ik') or pb.constraints.new('IK'); c.name = 'ik'
    c.target = target; c.chain_count = 2; c.influence = 1.0 if on else 0.0

def left_hand_ik(ao, target, on): hand_ik(ao, 'L', target, on)

# ------------------------------------------------------------------ effects
class FX:
    def __init__(self):
        self.objs = []
        self.trail_m = toon_mat('fx_trail', '#fff6dc', alpha=.4, glow=1.5)
        self.flash_m = toon_mat('fx_flash', '#ffd25a', alpha=.95, glow=4.0)
        self.spark_m = toon_mat('fx_spark', '#fff2b0', alpha=.95, glow=3.0)
        self.dust_m = toon_mat('fx_dust', '#d9c49a')
    def clear(self):
        for o in self.objs: bpy.data.objects.remove(o, do_unlink=True)
        self.objs = []
    def _mesh(self, name, verts, faces, mat):
        me = bpy.data.meshes.new(name); me.from_pydata(verts, [], faces); me.update(); me.materials.append(mat)
        o = bpy.data.objects.new(name, me); bpy.context.scene.collection.objects.link(o); self.objs.append(o); return o
    def trail(self, heads, roots):
        """Ribbon between the weapon head path and a point nearer the hand: a swoosh arc."""
        if len(heads) < 2: return
        v, f = [], []
        for h, r in zip(heads, roots): v += [tuple(h), tuple(r.lerp(h, .7))]
        for i in range(len(heads) - 1): f.append((2 * i, 2 * i + 1, 2 * i + 3, 2 * i + 2))
        self._mesh('trail', v, f, self.trail_m)
    def star(self, at, r, mat, spikes=8, seed=0):
        import random; rnd = random.Random(seed); v, f = [tuple(at)], []
        cam = bpy.context.scene.camera; R = cam.matrix_world.to_3x3()
        x, y = R @ Vector((1, 0, 0)), R @ Vector((0, 1, 0))    # in the camera plane so it always faces the viewer
        n = spikes * 2
        for i in range(n):
            a = 2 * math.pi * i / n; rr = r * (1 if i % 2 == 0 else .35) * (.7 + .6 * rnd.random())
            v.append(tuple(at + (x * math.cos(a) + y * math.sin(a)) * rr))
        for i in range(n): f.append((0, 1 + i, 1 + (i + 1) % n))
        return self._mesh('star', v, f, mat)
    def dust(self, at, t, seed=3):
        import random; rnd = random.Random(seed)
        for i in range(6):
            a = 2 * math.pi * i / 6 + rnd.random(); d = .12 + .25 * t
            c = at + Vector((math.cos(a) * d, math.sin(a) * d, .03 + .06 * t))
            bpy.ops.mesh.primitive_uv_sphere_add(radius=.05 + .05 * t, location=c, segments=8, ring_count=5)
            o = bpy.context.object; o.data.materials.append(self.dust_m); self.objs.append(o)

def world(ob): return ob.matrix_world.translation.copy()

def render_all(blend, out, clips, weapons, views, px=256, preview=False, actions=None):
    ao, body = ai_render.load(blend); ai_render.toonify(body)
    acts = {}
    if actions:                      # hand-made poses from a workbench .blend (workbench.py): Actions named like the clips
        import workbench; acts = workbench.load_actions(actions); print('actions', sorted(acts), flush=True)
    ms_out = {}
    # same pixels per unit as the 128-px walk frames and the buildings (98.46 px/unit at final size = px/2),
    # but a bigger frame so raised weapons never leave it
    cam = ai_render.setup_scene(px=px, tilt=60); cam.data.ortho_scale = (px / 2) / (128 / 1.3) if not preview else 1.6
    look = Vector((0, 0, -1)); look.rotate(cam.rotation_euler); cam.location = Vector((0, 0, .58)) - look * 20
    S = bpy.context.scene; S.eevee.taa_render_samples = 8 if not preview else 4
    bpy.context.view_layer.update()
    from bpy_extras.object_utils import world_to_camera_view
    g = world_to_camera_view(S, cam, Vector((0, 0, 0)))
    os.makedirs(out, exist_ok=True)
    json.dump({'ground_x': g.x, 'ground_y': 1 - g.y, 'ms': {c: (SWING_MS if c.startswith('swing') else [CLIPS[c][2]] * CLIPS[c][1]) for c in CLIPS},
               'loop': {c: CLIPS[c][3] for c in CLIPS}}, open(os.path.join(out, 'anchor.json'), 'w'))
    fx = FX()
    for wk in weapons:
        W = build_weapon(ao, wk) if wk != 'none' else None
        wcls = W['cls'] if W else None
        for clip in clips:
            need = CLIPS[clip][4]
            if need == 'any' and not W: continue
            if need in ('melee', 'gun') and wcls != need: continue
            if need is None and W and clip not in ('walk', 'idle', 'hurt', 'collapse', 'cheer'): continue   # unarmed-only clips
            if need is None and W: continue   # unarmed clips are rendered once, without a weapon
            fn = pose_fn(clip, wcls); ts = times(clip)
            calc = fn; aname = clip + '_' + wcls if clip in ('hold_idle', 'hold_walk', 'hold_hurt') and wcls else clip
            if aname in acts:
                import workbench
                drive, ts, ms = workbench.action_clip(ao, acts[aname], clip)
                ms_out[clip] = ms
                def fn(t, drive=drive, calc=calc):
                    drive(t); P = calc(t); return {'recoil': P.get('recoil', 0), '_drive': True}
            elif ao.animation_data: ao.animation_data.action = None
            two = W is not None and W['cls'] == 'gun'          # melee is one-handed; guns take both hands
            if W: left_hand_ik(ao, W['grip2'] or W['tip'], two)
            if W and W['cls'] == 'gun': hand_ik(ao, 'R', W['grip1'], True)
            for view in views:
                ai_render.face(ao, view)
                for i, t in enumerate(ts):
                    fx.clear()
                    if clip.startswith('swing') and W:     # swoosh from the previous frame's time to this one
                        t0 = ts[i - 1] if i > 0 else t
                        if t - t0 > .05 and .3 < t < .75:
                            heads, roots = [], []
                            for k in range(9):
                                tt = t0 + (t - t0) * k / 8; pose_at(ao, fn(tt)); bpy.context.view_layer.update()
                                heads.append(world(W['tip'])); roots.append(world(W['obj']))
                            fx.trail(heads, roots)
                    P = fn(t); pose_at(ao, P)
                    if W and W['cls'] == 'gun':
                        k = P.get('recoil', 0); W['obj'].delta_location = (0, 0, 0); W['obj'].delta_rotation_euler = (0, 0, 0)
                        W['obj'].delta_location = (0, .04 * k, 0)        # chest-bone space: +Y runs up the spine; small kick
                        W['obj'].delta_rotation_euler = (D(-10 * k), 0, 0)
                    bpy.context.view_layer.update()
                    if W and clip.startswith('swing') and abs(t - .6) < .01: fx.star(world(W['tip']), .16, fx.spark_m, seed=i)
                    if W and clip == 'fire' and i in (0, 1): fx.star(world(W['tip']) + (world(W['tip']) - world(W['obj'])).normalized() * .05, .14 if i == 0 else .08, fx.flash_m, spikes=6, seed=i)
                    if clip == 'punch' and i == 3:
                        hb = ao.pose.bones['hand.R']; fx.star(ao.matrix_world @ hb.tail, .1, fx.spark_m, seed=5)
                    if clip in ('hurt', 'hold_hurt') and i == 1: fx.star(ao.matrix_world @ ao.pose.bones['chest'].tail + Vector((0, 0, -.05)), .12, fx.spark_m, spikes=6, seed=9)
                    S.render.filepath = os.path.abspath(os.path.join(out, wk, f'{clip}_{view}_{i}.png'))
                    bpy.ops.render.render(write_still=True)
                print('done', wk, clip, view, flush=True)
            if W: left_hand_ik(ao, W['grip2'] or W['tip'], False)
            if W and W['cls'] == 'gun': hand_ik(ao, 'R', W['grip1'], False)
        if W:
            if ao.animation_data: ao.animation_data.action = None
            for k in ('tip', 'grip2', 'grip1', 'obj'):
                if W[k]: bpy.data.objects.remove(W[k], do_unlink=True)
    fx.clear()
    if ms_out:                       # hand-made timing replaces the built-in timing in anchor.json
        A = json.load(open(os.path.join(out, 'anchor.json'))); A['ms'].update(ms_out)
        json.dump(A, open(os.path.join(out, 'anchor.json'), 'w'))

def pose_at(ao, P):
    if not P.get('_drive'): ai_render.apply_pose(ao, P)   # Action-driven frames are already posed

if __name__ == '__main__':
    a = sys.argv[1:]; opt = dict(x.split('=', 1) for x in a if '=' in x); pos = [x for x in a if '=' not in x and x != 'preview']
    clips = list(CLIPS) if opt.get('clips', 'all') == 'all' else opt['clips'].split(',')
    weapons = opt.get('weapons', 'none,bat,axe,rifle,ak47').split(',')
    views = opt.get('views', 'se,sw,ne,nw').split(',')
    render_all(pos[0], pos[1], clips, weapons, views, int(opt.get('px', 300)), 'preview' in a, opt.get('actions'))
