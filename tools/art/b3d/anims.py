"""Full survivor animation set on the shared skeleton, with real weapons on the hand bone and baked effects.

  python3 anims.py RIG.blend RAW_DIR [clips=all|idle,walk,...] [weapons=none,bat,axe,rifle,ak47] [views=se,sw,ne,nw] [px=256] [preview] [actions=WORKBENCH.blend] [outfit=armor] [tex=1024]
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
    """Knees always bent (an athletic, game-like stance)."""
    p.update({'thigh.L': (20 * k, 0, 0), 'thigh.R': (16 * k, 0, 0), 'shin.L': (-36 * k, 0, 0), 'shin.R': (-30 * k, 0, 0),
              'foot.L': (16 * k, 0, 0), 'foot.R': (14 * k, 0, 0)})
    p['bob'] = p.get('bob', 0) - .035 * k
    return p

def stance(p, w=0.0, k=1.0):
    """Fighting stance: left foot forward, right foot back, both knees bent.
    w = weight shift, -1 (on the back foot: wind-up) .. +1 (on the front foot: strike)."""
    p.update({'thigh.L': ((32 + 16 * w) * k, 0, -4), 'shin.L': (-(42 + 22 * w) * k, 0, 0), 'foot.L': ((12 + 8 * w) * k, 0, 0),
              'thigh.R': (-(26 + 12 * w) * k, 0, 4), 'shin.R': (-(34 - 18 * w) * k, 0, 0), 'foot.R': ((26 + 6 * w) * k, 0, 0)})
    p['bob'] = p.get('bob', 0) - (.07 + .03 * max(0, w) + .015 * max(0, -w)) * k
    return p

WALK_LONG = 1.15   # V3D.20 slightly longer steps (the game walks at 60% of the old pace, legs step quicker)
def walk_legs(t, stride=1.0):
    """Walk cycle, exaggerated: big stride and arm swing, high knee lift, bouncy body, hips and shoulders counter-twist."""
    ph = 2 * math.pi * t; sn, cs = math.sin(ph), math.cos(ph); p = {}
    for n, sg in (('L', 1), ('R', -1)):
        th = 40 * WALK_LONG * sg * sn * stride; kn = 26 + 74 * max(0.0, sg * cs) ** 1.3
        p['thigh.' + n] = (th + 10, 0, 0)
        p['shin.' + n] = (-kn, 0, 0)
        p['foot.' + n] = (-(th - kn) * .35 + kn * .45, 0, 0)
        p['upperarm.' + n] = (-36 * sg * sn, 0, 0)
        p['forearm.' + n] = (32 + 30 * max(0.0, -sg * sn), 0, 0)
    p['bob'] = .032 * math.cos(2 * ph) - .055
    p['pelvis'] = (0, 10 * sn, 0); p['chest'] = (7, -14 * sn, 0); p['head'] = (-12, 0, 0)
    return steady_head(p, 0, 0)

def steady_head(p, base=0.0, k=.15):
    """Keep the head facing where he walks: cancel most of the hip/shoulder twist (world yaw = base + k * twist)."""
    tw = sum(p.get(b, (0, 0, 0))[1] for b in ('pelvis', 'chest', 'neck'))
    h = p.get('head', (0, 0, 0)); p['head'] = (h[0], base - (1 - k) * tw, h[2])
    return p

def legs_walk(p, t, stride=1.0):
    w = walk_legs(t)
    for k in ('thigh.L', 'thigh.R', 'shin.L', 'shin.R', 'foot.L', 'foot.R', 'pelvis'):
        p[k] = tuple(x * stride for x in w[k])
    p['bob'] = w['bob']
    return p

# ------------------------------------------------------------------ clips: f(t) -> pose dict;  (frames, ms, loop, needs)
# Melee rule: the weapon stays (almost) perpendicular to the forearm (hammer grip, hand.R x near 0), so its angle
# above 'forward' is about upperarm + forearm; twisting the hand (y) turns it around the forearm.
def idle(t):
    w = math.sin(2 * math.pi * t)
    p = soft_legs({'chest': (3 * w, 0, 0), 'neck': (-2 * w, 0, 0), 'head': (-6 - 2.5 * w, 0, 5 * math.sin(2 * math.pi * t + 1)),
                   'upperarm.L': (4, 0, 6 + 4 * w), 'upperarm.R': (4, 0, -6 - 4 * w), 'forearm.L': (22 + 8 * w, 0, 0), 'forearm.R': (22 + 8 * w, 0, 0)})
    p['bob'] = -.035 - .014 * (1 - w) / 2
    return p

def walk(t):
    return walk_legs(t)

READY = {'ua': -4, 'fa': 52, 'wr': 0, 'wy': 18}   # low ready: hand at the hip, forearm forward, weapon pointing forward-up, tilted out

def hold_idle_melee(t):
    """Weapon ready at the right side, held upright (perpendicular to the forearm), knees bent, breathing bounce."""
    w = math.sin(2 * math.pi * t); r = READY
    p = soft_legs({'upperarm.R': (r['ua'] + 3 * w, 0, -22), 'forearm.R': (r['fa'] - 3 * w, 0, 0), 'hand.R': (r['wr'], r['wy'], 0),
                   'upperarm.L': (10, 0, 10), 'forearm.L': (40, 0, 0),
                   'chest': (6 + 2 * w, -10, 0), 'pelvis': (0, -4, 0), 'head': (-8, 6, 0)}, 1.25)
    p['thigh.L'] = (28, 0, -4); p['shin.L'] = (-40, 0, 0); p['thigh.R'] = (-6, 0, 4); p['shin.R'] = (-34, 0, 0)
    p['bob'] -= .012 * (1 - w) / 2
    return p

def hold_walk_melee(t):
    p = legs_walk({}, t)
    s = math.sin(2 * math.pi * t); r = READY
    p.update({'upperarm.R': (r['ua'] - 10 * s, 0, -22), 'forearm.R': (r['fa'] + 6 * s, 0, 0), 'hand.R': (r['wr'], r['wy'], 0),
              'upperarm.L': (34 * s, 0, 10), 'forearm.L': (30 + 26 * max(0.0, s), 0, 0),   # the free arm swings with the step
              'chest': (9, -10 + 8 * s, 0), 'head': (-10, 0, 0)})
    return steady_head(p, -4)

GUN = (65, 55)    # upper arm, forearm (the hands are locked to the rifle grips by IK; these only seed the elbows)
# The rifle rides on its own 'gun' bone (child of the chest, at the grip, pointing forward). Bone axes: x = pitch
# (+ muzzle up), z = yaw, y = roll; gun_loc is an offset in that bone's space (x = side, y = along the barrel, z = up).
CARRY = {'gun': (-34, -25, 82), 'gun_loc': (.08, -.06, -.08)}          # low diagonal carry: muzzle down and across to the left
AIM = {'gun': (2, 0, 24), 'gun_loc': (.0, .02, .075)}               # yaw undoes the bladed chest twist so it aims straight ahead                  # shouldered at cheek height, level

def hold_idle_gun(t):
    """Rifle carried low and diagonal across the body (muzzle down-left), relaxed stance, breathing."""
    w = math.sin(2 * math.pi * t)
    ua, fa = GUN
    p = stance({'upperarm.R': (ua, 0, -12), 'forearm.R': (fa, 0, 0), 'upperarm.L': (40, 0, 0), 'forearm.L': (70, 0, 0),
                'chest': (5 + 2 * w, 0, 0), 'head': (-8, 0, 0), 'pelvis': (0, -6, 0)}, 0, .55)
    p.update(CARRY); g = p['gun']; p['gun'] = (g[0] + 2 * w, g[1], g[2])
    p['bob'] -= .01 * (1 - w) / 2
    return p

def hold_walk_gun(t):
    p = legs_walk({}, t, .9)
    s = math.sin(4 * math.pi * t); s2 = math.sin(2 * math.pi * t)
    ua, fa = GUN
    p.update({'upperarm.R': (ua, 0, -12), 'forearm.R': (fa, 0, 0), 'upperarm.L': (40, 0, 0), 'forearm.L': (70, 0, 0),
              'chest': (8, -6 * s2, 0), 'head': (-10, 0, 0)})
    p.update(CARRY); g = p['gun']; p['gun'] = (g[0] + 3 * s, g[1] + 4 * s2, g[2])
    return steady_head(p)

def fire(t):
    """Rifle shouldered and aimed (cheek to the stock, elbows out), bladed stance with the weight forward; the shot at
    t=0 kicks the muzzle up and the shoulder back, then it settles back on target."""
    kick = math.exp(-t * 7) * (1 if t < .9 else 0)
    ua, fa = GUN
    p = stance({'upperarm.R': (ua, 0, -30), 'forearm.R': (fa, 0, 0), 'upperarm.L': (60, 0, 0), 'forearm.L': (40, 0, 0),
                'chest': (8 - 12 * kick, -14, 0), 'pelvis': (-3 * kick, -10, 0), 'head': (4 - 6 * kick, 18, 0)}, .35 - .7 * kick, .9)
    p.update(AIM); g = p['gun']; p['gun'] = (g[0] + 14 * kick, g[1], g[2])
    l = p['gun_loc']; p['gun_loc'] = (l[0], l[1] - .05 * kick, l[2] + .015 * kick)
    p['recoil'] = 0                        # the kick is in the gun bone now
    return p

def fire_pistol(t):
    """Two-handed pistol shot: both arms straight out in front of the chest centre, the left hand cupping the right
    (IK to the grip), square stance; the muzzle kicks up and the arms ride back, then return on target."""
    kick = math.exp(-t * 8) * (1 if t < .9 else 0)
    p = stance({'upperarm.R': (84 + 10 * kick, 0, 14), 'forearm.R': (6 + 10 * kick, 0, 0), 'hand.R': (-8 + 12 * kick, 0, 0),
                'upperarm.L': (84 + 10 * kick, 0, -14), 'forearm.L': (10, 0, 0),
                'chest': (6 - 6 * kick, 0, 0), 'pelvis': (0, 0, 0), 'head': (-8 - 4 * kick, 0, 0)}, .2 - .5 * kick, .7)
    return p

def punch(t):
    """Boxer's lunging cross (reference: '3D Animation Basic training: punch'): crouched guard with fists at the chin,
    coil, then lunge: front knee deep, back leg straight, body leaning well forward, the right arm driving out along the
    line of the body while the left arm pulls back to the ribs; recover to guard."""
    K = [(0, {'ua': 38, 'fa': 128, 'la': 44, 'lf': 122, 'tw': -18, 'lean': 12, 'w': .1, 'dip': 0, 'el': -30, 'le': 26}),
         (.28, {'ua': 28, 'fa': 136, 'la': 48, 'lf': 124, 'tw': -36, 'lean': 6, 'w': -.6, 'dip': .02, 'el': -34, 'le': 28}),
         (.46, {'ua': 104, 'fa': 4, 'la': -46, 'lf': 118, 'tw': 30, 'lean': 50, 'w': 1.7, 'dip': .07, 'el': -20, 'le': 34}),
         (.64, {'ua': 106, 'fa': 4, 'la': -48, 'lf': 118, 'tw': 30, 'lean': 52, 'w': 1.7, 'dip': .07, 'el': -20, 'le': 34}),
         (1, {'ua': 38, 'fa': 128, 'la': 44, 'lf': 122, 'tw': -18, 'lean': 12, 'w': .1, 'dip': 0, 'el': -30, 'le': 26})]
    k = keys(K, t)
    p = stance({'upperarm.R': (k['ua'], 0, k['el']), 'forearm.R': (k['fa'], 0, 0), 'hand.R': (0, 0, 0),
                'upperarm.L': (k['la'], 0, k['le']), 'forearm.L': (k['lf'], 0, 0),
                'chest': (k['lean'] * .65, k['tw'], 0), 'pelvis': (k['lean'] * .35, k['tw'] * .5, 0), 'head': (-18 - k['lean'] * .45, -k['tw'] * .6, 0)}, k['w'], 1.1)
    p['bob'] -= k['dip']
    return p

def _swing(t, K, ab=False):
    k = keys(K, t)
    p = stance({'upperarm.R': (k['ua'], 0, k.get('ab', 0)), 'forearm.R': (k['fa'], 0, 0), 'hand.R': (k['wr'], k.get('wy', 0), 0),
                'upperarm.L': (k.get('la', 30), 0, 18), 'forearm.L': (60, 0, 0),
                'chest': (k['lean'], k['tw'], 0), 'pelvis': (k['lean'] * .25, k['tw'] * .45, 0),
                'head': (-10 - k['lean'] * .6, -k['tw'] * .5, 0)}, k['w'])
    return p

ROLL = -24    # overhead, the chest leans to its left so the raised hands sit over the centre line
def swing_d(t):
    """Two-handed overhead chop like a katana: both hands on the bat in front of the belly, lift it straight up over
    the head, then cut down the centre line onto the front foot. The left hand follows the grip by IK."""
    K = [(0, {'ua': 40, 'fa': 62, 'wr': -40, 'lean': 6, 'w': 0, 'ab': 50, 'roll': 0}),
         (.4, {'ua': 165, 'fa': 48, 'wr': 0, 'lean': -10, 'w': -.6, 'ab': 40, 'roll': 1}),
         (.5, {'ua': 168, 'fa': 50, 'wr': 0, 'lean': -12, 'w': -.7, 'ab': 40, 'roll': 1}),
         (.62, {'ua': 78, 'fa': 4, 'wr': -40, 'lean': 26, 'w': 1.1, 'ab': 26, 'roll': 0}),
         (.74, {'ua': 52, 'fa': 6, 'wr': -70, 'lean': 30, 'w': 1.2, 'ab': 26, 'roll': 0}),
         (1, {'ua': 40, 'fa': 62, 'wr': -40, 'lean': 6, 'w': 0, 'ab': 50, 'roll': 0})]
    k = keys(K, t)
    p = stance({'upperarm.R': (k['ua'], 0, k['ab']), 'forearm.R': (k['fa'], -20, 0), 'hand.R': (k['wr'], 0, 0),
                'upperarm.L': (k['ua'], 0, -k['ab']), 'forearm.L': (k['fa'] + 6, 0, 0),
                'chest': (k['lean'], -22 * k['roll'], ROLL * k['roll']), 'pelvis': (k['lean'] * .25, 0, 0), 'head': (-8 - k['lean'] * .5, 0, -ROLL * .6 * k['roll'])}, k['w'])
    return p

R0 = {'ua': -4, 'fa': 52, 'wr': 0, 'wy': 18, 'lean': 6, 'tw': -10, 'w': 0, 'ab': -22}   # = the ready pose

def swing_a(t):
    """Overhead chop: rock back onto the rear foot with the weapon cocked behind the head, then drive forward onto the
    front knee and chop down; the weapon stays square to the forearm the whole way."""
    K = [(0, R0),
         (.36, {'ua': 150, 'fa': 74, 'wr': 4, 'wy': -22, 'lean': -14, 'tw': -26, 'w': -1, 'ab': -34, 'la': 70}),
         (.46, {'ua': 156, 'fa': 80, 'wr': 4, 'wy': -24, 'lean': -16, 'tw': -28, 'w': -1, 'ab': -36, 'la': 75}),
         (.56, {'ua': 84, 'fa': 14, 'wr': -10, 'wy': -16, 'lean': 16, 'tw': 12, 'w': .8, 'ab': -34, 'la': 20}),
         (.62, {'ua': 34, 'fa': 4, 'wr': -18, 'wy': 0, 'lean': 26, 'tw': 18, 'w': 1, 'ab': -4, 'la': 0}),
         (.7, {'ua': 22, 'fa': 8, 'wr': -18, 'wy': 0, 'lean': 28, 'tw': 20, 'w': 1, 'ab': -4, 'la': -5}),
         (1, R0)]
    return _swing(t, K)

def swing_b(t):
    """Side swing: coil to the right on the back foot, uncoil hips then shoulders, sweep across at chest height onto
    the front foot. The hand is turned 90 degrees so the weapon lies flat, still square to the forearm."""
    K = [(0, R0),
         (.35, {'ua': 78, 'fa': 70, 'wr': 0, 'wy': 88, 'lean': -6, 'tw': -62, 'w': -1, 'ab': -62, 'la': 55}),
         (.45, {'ua': 80, 'fa': 74, 'wr': 0, 'wy': 90, 'lean': -6, 'tw': -66, 'w': -1, 'ab': -66, 'la': 55}),
         (.58, {'ua': 86, 'fa': 18, 'wr': -8, 'wy': 90, 'lean': 10, 'tw': 34, 'w': .9, 'ab': 10, 'la': 10}),
         (.7, {'ua': 80, 'fa': 26, 'wr': -8, 'wy': 90, 'lean': 14, 'tw': 58, 'w': 1, 'ab': 30, 'la': 0}),
         (1, R0)]
    return _swing(t, K)

def swing_c(t):
    """Diagonal slash: weapon cocked over the right shoulder on the back foot, cut down across the body to the left
    hip while stepping onto the front knee."""
    K = [(0, R0),
         (.35, {'ua': 152, 'fa': 74, 'wr': 0, 'wy': 35, 'lean': -10, 'tw': -40, 'w': -1, 'ab': -48, 'la': 60}),
         (.45, {'ua': 158, 'fa': 78, 'wr': 0, 'wy': 35, 'lean': -12, 'tw': -44, 'w': -1, 'ab': -50, 'la': 60}),
         (.58, {'ua': 66, 'fa': 14, 'wr': -12, 'wy': 35, 'lean': 18, 'tw': 18, 'w': .9, 'ab': -22, 'la': 10}),
         (.7, {'ua': 36, 'fa': 12, 'wr': -15, 'wy': 35, 'lean': 24, 'tw': 26, 'w': 1, 'ab': -26, 'la': 0}),
         (1, R0)]
    return _swing(t, K)

def rescue(t):
    """Pushing the rescue cart: lean in hard, both arms forward low, heavy steps."""
    p = legs_walk({}, t, .9)
    p.update({'upperarm.R': (66, 0, 6), 'upperarm.L': (66, 0, -6), 'forearm.R': (25, 0, 0), 'forearm.L': (25, 0, 0),
              'chest': (22, 0, 0), 'head': (-26, 0, 0)})
    p['pelvis'] = (12, p['pelvis'][1] * .5, 0)
    return steady_head(p)

def hurt(t):
    K = [(0, {'lean': 0, 'hd': -6, 'ua': 4, 'fa': 22, 'bob': -.035, 'th': 16, 'sh': -30}),
         (.25, {'lean': -28, 'hd': 18, 'ua': 40, 'fa': 85, 'bob': -.07, 'th': -14, 'sh': -46}),
         (.5, {'lean': -18, 'hd': 8, 'ua': 30, 'fa': 70, 'bob': -.06, 'th': -6, 'sh': -40}),
         (1, {'lean': 0, 'hd': -6, 'ua': 4, 'fa': 22, 'bob': -.035, 'th': 16, 'sh': -30})]
    k = keys(K, t)
    p = soft_legs({'chest': (k['lean'], 0, 0), 'head': (k['hd'], 0, 0), 'upperarm.L': (k['ua'], 0, 26), 'upperarm.R': (k['ua'], 0, -26),
                   'forearm.L': (k['fa'], 0, 0), 'forearm.R': (k['fa'], 0, 0)})
    p['thigh.R'] = (k['th'], 0, 0); p['shin.R'] = (k['sh'], 0, 0); p['bob'] = k['bob']
    return p

def hold_hurt(t, wclass):
    """Hit while armed: big flinch back from the ready pose, weapon kept in hand."""
    base = (hold_idle_gun if wclass == 'gun' else hold_idle_melee)(0)
    K = [(0, {'lean': 0, 'hd': 0, 'bob': 0, 'th': 0}), (.25, {'lean': -26, 'hd': 18, 'bob': -.04, 'th': -22}),
         (.5, {'lean': -16, 'hd': 9, 'bob': -.03, 'th': -12}), (1, {'lean': 0, 'hd': 0, 'bob': 0, 'th': 0})]
    k = keys(K, t); p = dict(base)
    c = p.get('chest', (0, 0, 0)); p['chest'] = (c[0] + k['lean'], c[1], c[2])
    h = p.get('head', (0, 0, 0)); p['head'] = (h[0] + k['hd'], h[1], h[2])
    r = p.get('thigh.R', (0, 0, 0)); p['thigh.R'] = (r[0] + k['th'], r[1], r[2])
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
    """Crouch, spring high with both fists up, hang at the top, land and absorb."""
    t = t % 1.0
    if t < .14 or t >= .86:                       # on the ground: deep crouch before take-off / after landing
        u = (t - .86) / .28 if t >= .86 else .5 + t / .28
        c = math.sin(math.pi * u)                 # crouch depth 0..1..0
        p = soft_legs({'chest': (14 * c, 0, 0), 'head': (-10 - 6 * c, 0, 0),
                       'upperarm.L': (-20 * c, 0, 30 + 20 * c), 'upperarm.R': (-20 * c, 0, -30 - 20 * c),
                       'forearm.L': (40, 0, 0), 'forearm.R': (40, 0, 0)}, 1 + 1.2 * c)
        p['bob'] = -.035 - .07 * c
        return p
    u = (t - .14) / .72                           # 0..1 in the air
    h = math.sin(math.pi * u) ** .45              # flat top = hang time
    tuck = math.sin(math.pi * u) ** 2
    p = {'chest': (-8, 0, 0), 'head': (-20, 0, 4 * math.sin(4 * math.pi * u)),
         'upperarm.L': (8, -CHEER_TW, 142), 'upperarm.R': (8, CHEER_TW, -142), 'forearm.L': (-5 + 15 * tuck, 0, 0), 'forearm.R': (-5 + 15 * tuck, 0, 0),
         'thigh.L': (10 + 45 * tuck, 0, 0), 'thigh.R': (5 + 35 * tuck, 0, 0), 'shin.L': (-15 - 70 * tuck, 0, 0), 'shin.R': (-12 - 60 * tuck, 0, 0),
         'foot.L': (20 * tuck, 0, 0), 'foot.R': (20 * tuck, 0, 0)}
    p['bob'] = .22 * h
    return p

def zombie_walk(t):
    """Placeholder zombie shamble (3D only, not in CLIPS): short dragging steps, arms out straight, head lolling."""
    p = legs_walk({}, t, .8)   # V3D.21 longer shamble: chasing zombies were shuffling 3x too fast to match the ground
    s = math.sin(2 * math.pi * t)
    p['shin.R'] = (p['shin.R'][0] * .5 - 8, 0, 0)            # stiff right leg drags
    p.update({'upperarm.L': (84 + 6 * s, 0, 10), 'upperarm.R': (80 - 6 * s, 0, -10), 'forearm.L': (8, 0, 0), 'forearm.R': (14, 0, 0),
              'hand.L': (-10, 0, 0), 'hand.R': (-10, 0, 0),
              'chest': (16, 0, 6 * s), 'pelvis': (0, 8 * s, 5 * s), 'head': (6, 0, 16 + 5 * s)})
    p['bob'] = p.get('bob', 0) - .02
    return p

def run(t):
    """Survivor run (3D only): long strides with a flight phase, high knees, forward lean, bent arms pumping."""
    ph = 2 * math.pi * t; sn, cs = math.sin(ph), math.cos(ph); p = {}
    for n, sg in (('L', 1), ('R', -1)):
        th = 52 * sg * sn; kn = 34 + 96 * max(0.0, sg * cs) ** 1.2
        p['thigh.' + n] = (th + 16, 0, 0)
        p['shin.' + n] = (-kn, 0, 0)
        p['foot.' + n] = (-(th - kn) * .3 + kn * .4, 0, 0)
        p['upperarm.' + n] = (-58 * sg * sn + 6, 0, 10 * sg)
        p['forearm.' + n] = (88 + 10 * max(0.0, -sg * sn), 0, 0)
        p['hand.' + n] = (10, 0, 0)
    p['bob'] = .045 * math.cos(2 * ph) - .06
    p['pelvis'] = (6, 12 * sn, 0); p['chest'] = (16, -18 * sn, 0); p['neck'] = (-6, 0, 0); p['head'] = (-16, 0, 0)
    return steady_head(p, 0, 0)

def zombie_run(t):
    """Zombie run (3D only): a lurching, hunched sprint, arms flailing forward and grabbing, head bobbing and lolling."""
    ph = 2 * math.pi * t; sn, cs = math.sin(ph), math.cos(ph); p = {}
    for n, sg in (('L', 1), ('R', -1)):
        th = 46 * sg * sn; kn = 30 + 80 * max(0.0, sg * cs) ** 1.2
        p['thigh.' + n] = (th + 22, 0, -6 * sg)
        p['shin.' + n] = (-kn, 0, 0)
        p['foot.' + n] = (-(th - kn) * .3 + kn * .35, 0, 0)
    p['shin.R'] = (p['shin.R'][0] * .7 - 6, 0, 0)                       # the bad leg bends less: a limping gallop
    p.update({'upperarm.L': (78 + 26 * sn, 0, 18), 'upperarm.R': (74 - 26 * sn, 0, -18),
              'forearm.L': (14 + 18 * max(0.0, sn), 0, 0), 'forearm.R': (18 + 18 * max(0.0, -sn), 0, 0),
              'hand.L': (-16, 0, 0), 'hand.R': (-16, 0, 0),
              'pelvis': (10, 10 * sn, 6 * sn), 'chest': (30, -8 * sn, 8 * cs), 'neck': (-6, 0, 0), 'head': (-30, 8 * sn, 8 + 5 * cs)})   # head up: eyes on the target
    p['bob'] = .04 * math.cos(2 * ph) - .085
    return p


def zombie_attack(t):
    """Zombie claw swipe (3D only, one-shot): from the arms-out shamble the right arm rises high and wide, then
    rakes down and across the body (note: with the arm raised this high, + upperarm.R z swings it OUT) while the zombie lurches in, head lunging as if to bite; the left arm grabs
    forward. Recovers to the reaching pose."""
    K = [(0, {'ua': 80, 'ab': -10, 'fa': 14, 'la': 84, 'le': 10, 'lf': 8, 'tw': 0, 'lean': 16, 'w': 0, 'hd': 6}),
         (.34, {'ua': 150, 'ab': 40, 'fa': 30, 'la': 70, 'le': 16, 'lf': 20, 'tw': -24, 'lean': 4, 'w': -.5, 'hd': 0}),
         (.52, {'ua': 60, 'ab': -45, 'fa': 36, 'la': 96, 'le': 6, 'lf': 6, 'tw': 26, 'lean': 26, 'w': 1.3, 'hd': -10}),
         (.66, {'ua': 55, 'ab': -50, 'fa': 40, 'la': 98, 'le': 6, 'lf': 6, 'tw': 28, 'lean': 28, 'w': 1.3, 'hd': -12}),
         (1, {'ua': 80, 'ab': -10, 'fa': 14, 'la': 84, 'le': 10, 'lf': 8, 'tw': 0, 'lean': 16, 'w': 0, 'hd': 6})]
    k = keys(K, t)
    p = stance({'upperarm.R': (k['ua'], 0, k['ab']), 'forearm.R': (k['fa'], 0, 0), 'hand.R': (-24, 0, 0),
                'upperarm.L': (k['la'], 0, k['le']), 'forearm.L': (k['lf'], 0, 0), 'hand.L': (-16, 0, 0),
                'chest': (k['lean'] * .7, k['tw'], 6), 'pelvis': (k['lean'] * .3, k['tw'] * .4, 4),
                'head': (k['hd'] - k['lean'] * .4, -k['tw'] * .5, 14)}, k['w'], 1.0)
    p['bob'] -= .04
    return p


BRUTE_SPREAD = 18   # thighs out to the sides (deg); shins and feet turn back so the soles stay flat
def brute_attack(t):
    """Brute double hammer fist (3D only, one-shot): feet planted side by side, both arms swing up over the head together,
    then smash straight down in front, knees and back bending into the blow."""
    K = [(0, {'ua': 20, 'fa': 26, 'lean': 4, 'kn': .4, 'hd': -8, 'az': 6}),
         (.42, {'ua': 168, 'fa': 46, 'lean': -12, 'kn': .2, 'hd': -22, 'az': 10}),
         (.58, {'ua': 62, 'fa': 4, 'lean': 30, 'kn': 1.2, 'hd': 4, 'az': -16}),
         (.74, {'ua': 58, 'fa': 6, 'lean': 28, 'kn': 1.1, 'hd': 2, 'az': -16}),
         (1, {'ua': 20, 'fa': 26, 'lean': 4, 'kn': .4, 'hd': -8, 'az': 6})]
    k = keys(K, t); kn = k['kn']
    p = {'pelvis': (k['lean'] * .3, 0, 0), 'chest': (k['lean'] * .7, 0, 0), 'neck': (0, 0, 0), 'head': (k['hd'] - k['lean'] * .4, 0, 0)}
    for n, sg in (('L', 1), ('R', -1)):   # both feet parallel, shoulder-width, knees bending together
        p['thigh.' + n] = (22 * kn, 0, sg * BRUTE_SPREAD); p['shin.' + n] = (-40 * kn, 0, sg * -BRUTE_SPREAD * .6); p['foot.' + n] = (18 * kn, 0, sg * -BRUTE_SPREAD * .4)
        p['upperarm.' + n] = (k['ua'], 0, sg * k['az']); p['forearm.' + n] = (k['fa'], 0, 0); p['hand.' + n] = (0, 0, -sg * 10)   # fists come together
    p['bob'] = -.035 * kn - .01
    return p

def spit(t):
    """Spitter ranged attack (3D only, one-shot): rears back with the chest puffed and the head tipped up, gathering it,
    then snaps the head and chest forward and spits (the glob leaves the mouth at t = .5), arms flung back for balance."""
    K = [(0, {'lean': 4, 'hd': -6, 'w': 0, 'ua': 4, 'fa': 18}),
         (.38, {'lean': -18, 'hd': -34, 'w': -.8, 'ua': -10, 'fa': 30}),
         (.5, {'lean': 26, 'hd': 22, 'w': 1.2, 'ua': -34, 'fa': 12}),
         (.68, {'lean': 22, 'hd': 16, 'w': 1.1, 'ua': -28, 'fa': 14}),
         (1, {'lean': 4, 'hd': -6, 'w': 0, 'ua': 4, 'fa': 18})]
    k = keys(K, t)
    p = stance({'chest': (k['lean'] * .7, 0, 0), 'pelvis': (k['lean'] * .3, 0, 0), 'neck': (k['hd'] * .4, 0, 0), 'head': (k['hd'] * .6, 0, 0),
                'upperarm.L': (k['ua'], 0, 12), 'upperarm.R': (k['ua'], 0, -12), 'forearm.L': (k['fa'], 0, 0), 'forearm.R': (k['fa'], 0, 0)}, k['w'], .7)
    return p

def spore_combo(t):
    """Sporehead three-hit combo (3D only, one-shot, ~1.9 s): a wide left claw swipe (lands t=.2), a wide right claw swipe
    (t=.45), then a lunging headbutt with the spore cap, both hands raking down (t=.74); recovers to the ready stance.
    The swipes wind the arm far out and back with the torso turned away, then sweep all the way across the body."""
    K = [(0, {'tw': 0, 'lean': 8, 'w': 0, 'Lx': 40, 'Lz': 20, 'Rx': 40, 'Rz': -20, 'Lf': 24, 'Rf': 24, 'hd': -8}),
         (.1, {'tw': 58, 'lean': -4, 'w': -.8, 'Lx': 14, 'Lz': 104, 'Rx': 20, 'Rz': -30, 'Lf': 34, 'Rf': 24, 'hd': -14}),
         (.2, {'tw': -48, 'lean': 20, 'w': 1.0, 'Lx': 88, 'Lz': -46, 'Rx': 14, 'Rz': -40, 'Lf': 4, 'Rf': 24, 'hd': -2}),
         (.33, {'tw': -58, 'lean': -4, 'w': -.8, 'Lx': 50, 'Lz': -30, 'Rx': 14, 'Rz': -104, 'Lf': 24, 'Rf': 34, 'hd': -14}),
         (.45, {'tw': 48, 'lean': 20, 'w': 1.0, 'Lx': 20, 'Lz': 40, 'Rx': 88, 'Rz': 46, 'Lf': 24, 'Rf': 4, 'hd': -2}),
         (.6, {'tw': 0, 'lean': -16, 'w': -.8, 'Lx': 150, 'Lz': 20, 'Rx': 150, 'Rz': -20, 'Lf': 24, 'Rf': 24, 'hd': -30}),
         (.74, {'tw': 0, 'lean': 38, 'w': 1.3, 'Lx': 70, 'Lz': 10, 'Rx': 70, 'Rz': -10, 'Lf': 24, 'Rf': 24, 'hd': 26}),
         (.86, {'tw': 0, 'lean': 30, 'w': 1.1, 'Lx': 60, 'Lz': 14, 'Rx': 60, 'Rz': -14, 'Lf': 24, 'Rf': 24, 'hd': 16}),
         (1, {'tw': 0, 'lean': 8, 'w': 0, 'Lx': 40, 'Lz': 20, 'Rx': 40, 'Rz': -20, 'Lf': 24, 'Rf': 24, 'hd': -8})]
    k = keys(K, t)
    p = stance({'chest': (k['lean'] * .7, k['tw'] * .75, 0), 'pelvis': (k['lean'] * .3, k['tw'] * .5, 0), 'neck': (k['hd'] * .4, 0, 0), 'head': (k['hd'] * .6 - k['lean'] * .2, -k['tw'] * .4, 0),
                'upperarm.L': (k['Lx'], 0, k['Lz']), 'upperarm.R': (k['Rx'], 0, k['Rz']), 'forearm.L': (k['Lf'], 0, 0), 'forearm.R': (k['Rf'], 0, 0),
                'hand.L': (-20, 0, 0), 'hand.R': (-20, 0, 0)}, k['w'], .9)
    return p

def scream(t):
    """Screamer area attack (3D only, one-shot, ~1.6 s): draws in a breath hunched over, then throws the head back until it
    almost faces the sky, arms flung out about 45 degrees to the sides, and holds the shriek, shaking; the shockwave goes
    out at t = .32. Then it slumps back to the ready stance."""
    K = [(0, {'hd': -8, 'ch': 6, 'ua': 4, 'sp': 12, 'fa': 18, 'kn': .5}),
         (.22, {'hd': 22, 'ch': 18, 'ua': 10, 'sp': 4, 'fa': 40, 'kn': .9}),
         (.32, {'hd': -72, 'ch': -16, 'ua': 2, 'sp': 28, 'fa': 6, 'kn': .3}),
         (.8, {'hd': -70, 'ch': -14, 'ua': 2, 'sp': 29, 'fa': 8, 'kn': .3}),
         (1, {'hd': -8, 'ch': 6, 'ua': 4, 'sp': 12, 'fa': 18, 'kn': .5})]
    k = keys(K, t); sh = 3 * math.sin(t * 90) if .32 < t < .82 else 0   # shaking with the shriek
    p = soft_legs({'chest': (k['ch'], 0, sh * .5), 'pelvis': (k['ch'] * .2, 0, 0), 'neck': (k['hd'] * .45, 0, sh), 'head': (k['hd'] * .55, sh, 0),
                   'upperarm.L': (k['ua'], 0, k['sp']), 'upperarm.R': (k['ua'], 0, -k['sp']), 'forearm.L': (k['fa'], 0, 0), 'forearm.R': (k['fa'], 0, 0),
                   'hand.L': (-10, 0, 8), 'hand.R': (-10, 0, -8)}, k['kn'])
    return p

def bloated_walk(t):
    """Bloated zombie waddle (3D only): short heavy steps, hips rolling side to side, the belly leading, arms kept low
    beside the belly (his model has the arms fused to the belly: raising them would stretch the skin)."""
    p = legs_walk({}, t, .6)
    ph = 2 * math.pi * t; sn = math.sin(ph)
    for n, sg in (('L', 1), ('R', -1)):
        th = p['thigh.' + n]; p['thigh.' + n] = (th[0], 0, -6 * sg)            # legs a little apart
        p['upperarm.' + n] = (4 + 5 * sg * sn, 0, 0); p['forearm.' + n] = (10 + 4 * max(0.0, sg * sn), 0, 0)
    p.update({'pelvis': (-4, 6 * sn, 9 * sn), 'chest': (-6, -4 * sn, -12 * sn), 'neck': (4, 0, 0), 'head': (6, 6 * sn, 10 + 6 * sn)})
    p['bob'] = p.get('bob', 0) - .015 * abs(sn) - .02
    return p

def bloated_attack(t):
    """Bloated belly slam (3D only, one-shot): rears back with the belly out, then throws himself forward onto the
    front foot, belly and head first, mouth open to bite; arms stay low."""
    K = [(0, {'lean': -4, 'w': 0, 'hd': 6, 'ua': 4}),
         (.36, {'lean': -18, 'w': -.8, 'hd': -10, 'ua': -6}),
         (.55, {'lean': 26, 'w': 1.5, 'hd': 14, 'ua': 16}),
         (.7, {'lean': 28, 'w': 1.5, 'hd': 16, 'ua': 16}),
         (1, {'lean': -4, 'w': 0, 'hd': 6, 'ua': 4})]
    k = keys(K, t)
    p = stance({'upperarm.L': (k['ua'], 0, 0), 'upperarm.R': (k['ua'], 0, 0), 'forearm.L': (14, 0, 0), 'forearm.R': (14, 0, 0),
                'chest': (k['lean'] * .6, 0, 0), 'pelvis': (k['lean'] * .4, 0, 0), 'neck': (4, 0, 0),
                'head': (k['hd'] - k['lean'] * .3, 0, 10)}, k['w'], .9)
    p['bob'] -= .02
    return p


# ------------------------------------------------------------------ 3D.34 crawler (legless zombie, 3D only): lies face down and drags itself on its arms
CRAWL = {'lie': 72, 'bob': -.105, 'spread': 24}   # body pitch forward (deg), drop of the pelvis, arms out to the side

def _prone(p, sway=0.0):
    p.update({'pelvis': (CRAWL['lie'], 0, 0), 'chest': (4, 6 * sway, 3 * sway), 'neck': (-30, 0, 0), 'head': (-36, -8 * sway, 0),
              'thigh.L': (6, 0, 8), 'thigh.R': (10, 0, -8), 'shin.L': (-6, 0, 0), 'shin.R': (-10, 0, 0)})   # stumps trail behind
    p['bob'] = CRAWL['bob']
    return p

def _arm(p, n, sg, u):
    """One arm's crawl cycle, u 0..1: plant far ahead (0), pull the body forward (0..0.6), lift and reach ahead again (0.6..1)."""
    if u < .6:
        k = ease(u / .6); ua = lerp(166, 100, k); fa = lerp(4, 74, k)   # elbow bends mid-pull so the hand stays on the ground
    else:
        k = ease((u - .6) / .4); ua = lerp(100, 166, k) + 16 * math.sin(math.pi * k); fa = lerp(74, 4, k) + 24 * math.sin(math.pi * k)       # hand lifts clear as it swings forward
    p['upperarm.' + n] = (ua, 0, sg * CRAWL['spread']); p['forearm.' + n] = (fa, 0, 0); p['hand.' + n] = (-20, 0, 0)

def crawl(t):
    """Crawler locomotion: arms pull alternately, the body slides, shoulders roll with each pull, head up eyeing its prey."""
    sn = math.sin(2 * math.pi * t); p = _prone({}, sn)
    _arm(p, 'L', 1, t % 1.0); _arm(p, 'R', -1, (t + .5) % 1.0)
    p['bob'] += .008 * abs(math.cos(2 * math.pi * t))
    return p

def crawl_idle(t):
    """Crawler waiting: lying on its arms, head lifting and weaving, fingers clawing at the dirt."""
    w = math.sin(2 * math.pi * t); p = _prone({}, w * .5)
    for n, sg in (('L', 1), ('R', -1)):
        p['upperarm.' + n] = (150 + 4 * sg * w, 0, sg * CRAWL['spread']); p['forearm.' + n] = (30 - 6 * sg * w, 0, 0); p['hand.' + n] = (-10 + 14 * max(0.0, sg * w), 0, 0)
    p['neck'] = (-30 - 6 * w, 0, 0); p['head'] = (-30, 14 * math.sin(2 * math.pi * t + 1), 0)
    return p

def crawl_attack(t):
    """Crawler grab (one-shot): rears up on its chest, flings both arms wide open, then wraps them together in front in a
    grabbing hug, jaw snapping, and sinks back down."""
    K = [(0, {'lie': 72, 'ua': 150, 'op': 0, 'fa': 30, 'hd': -36, 'bob': 0}),
         (.35, {'lie': 52, 'ua': 124, 'op': -78, 'fa': 8, 'hd': -44, 'bob': .03}),
         (.58, {'lie': 64, 'ua': 128, 'op': -26, 'fa': 62, 'hd': -26, 'bob': .015}),
         (.78, {'lie': 66, 'ua': 130, 'op': -24, 'fa': 64, 'hd': -28, 'bob': .01}),
         (1, {'lie': 72, 'ua': 150, 'op': 0, 'fa': 30, 'hd': -36, 'bob': 0})]
    k = keys(K, t); p = _prone({})
    p['pelvis'] = (k['lie'], 0, 0); p['chest'] = (72 - k['lie'] + 4, 0, 0); p['head'] = (k['hd'], 0, 0)
    for n, sg in (('L', 1), ('R', -1)):   # op < -40: arms flung wide open; op near -26: hands meet in front (the hug)
        p['upperarm.' + n] = (k['ua'], 0, sg * (CRAWL['spread'] + k['op'])); p['forearm.' + n] = (k['fa'], 0, 0); p['hand.' + n] = (-20, 0, 0)
    p['bob'] = CRAWL['bob'] + k['bob']
    return p

def crawl_die(t):
    """Crawler death (one-shot): the arms give out and it slumps flat, head dropping to the dirt."""
    u = ease(min(1.0, t)); p = _prone({})
    p['pelvis'] = (CRAWL['lie'] + 10 * u, 0, 0); p['neck'] = (-30 + 14 * u, 0, 0); p['head'] = (-36 + 16 * u, 34 * u, 0)
    for n, sg in (('L', 1), ('R', -1)):
        p['upperarm.' + n] = (150 - 40 * u, 0, sg * (CRAWL['spread'] + 30 * u)); p['forearm.' + n] = (30 - 20 * u, 0, 0)
    p['bob'] = CRAWL['bob'] - .015 * u
    return p

# ------------------------------------------------------------------ V3D.19 everyday clips (3D only, not in CLIPS): work, rest, social, carrying
def _crouch(p, depth=1.0):
    """Both knees deep, hips low (for tinkering)."""
    p.update({'thigh.L': (95 * depth, 0, -8), 'thigh.R': (90 * depth, 0, 8), 'shin.L': (-125 * depth, 0, 0), 'shin.R': (-120 * depth, 0, 0),
              'foot.L': (30 * depth, 0, 0), 'foot.R': (30 * depth, 0, 0)})
    p['bob'] = -.24 * depth
    return p

def _kneel(p):
    """Right knee on the ground, left foot planted in front."""
    p.update({'thigh.L': (85, 0, -6), 'shin.L': (-88, 0, 0), 'foot.L': (4, 0, 0),
              'thigh.R': (-8, 0, 6), 'shin.R': (-100, 0, 0), 'foot.R': (40, 0, 0)})
    p['bob'] = -.2
    return p

SIT_TW = 80       # forearm twist so the palms face down onto the thighs
def _seated(p, apart=14):
    """Sitting on a crate or bench about a shin high: thighs level, shins down, palms resting on the knees.
    apart: how far the knees open (degrees; 0 = knees together)."""
    p.update({'thigh.L': (88, 0, -apart), 'thigh.R': (88, 0, apart), 'shin.L': (-86, 0, 0), 'shin.R': (-86, 0, 0), 'foot.L': (0, 0, apart * .6), 'foot.R': (0, 0, -apart * .6),
              'upperarm.L': (26, 0, 6), 'upperarm.R': (26, 0, -6), 'forearm.L': (52, SIT_TW, 0), 'forearm.R': (52, -SIT_TW, 0), 'hand.L': (-8, 0, 0), 'hand.R': (-8, 0, 0), 'pelvis': (-4, 0, 0)})
    p['bob'] = -.2
    return p

def work_chop(t):
    """Chopping wood with the axe: big overhead wind-up, fast strike down in front, short recovery."""
    K = [(0, {'ua': 20, 'fa': 30, 'wr': 10, 'lean': 6, 'tw': 0, 'k': 1.0}),
         (.42, {'ua': 165, 'fa': 55, 'wr': -10, 'lean': -8, 'tw': -12, 'k': .8}),
         (.5, {'ua': 168, 'fa': 58, 'wr': -8, 'lean': -9, 'tw': -14, 'k': .8}),
         (.62, {'ua': 70, 'fa': 10, 'wr': -40, 'lean': 26, 'tw': 8, 'k': 1.5}),
         (.72, {'ua': 55, 'fa': 8, 'wr': -45, 'lean': 30, 'tw': 10, 'k': 1.6}),
         (1, {'ua': 20, 'fa': 30, 'wr': 10, 'lean': 6, 'tw': 0, 'k': 1.0})]
    k = keys(K, t)
    p = soft_legs({'upperarm.R': (k['ua'], 0, -4), 'forearm.R': (k['fa'], 0, 0), 'hand.R': (k['wr'], 0, 0),
                   'upperarm.L': (k['ua'] * .95, 0, 10), 'forearm.L': (k['fa'] + 10, 0, 0),
                   'chest': (k['lean'], k['tw'], 0), 'head': (-6 - k['lean'] * .3, 0, 0)}, k['k'])
    return p

def work_hammer(t):
    """Building or fixing: kneeling, quick hammer taps with the right hand, left hand steadying the plank."""
    s = math.sin(2 * math.pi * t * 2)                       # two taps per loop
    hit = max(0.0, s)
    p = _kneel({'chest': (30 + 4 * hit, -8, 0), 'neck': (6, 0, 0), 'head': (8, 4, 0),
                'upperarm.R': (58 + 10 * s, 0, -10), 'forearm.R': (78 + 52 * s, 0, 0), 'hand.R': (-96 + 24 * s, 0, 0),   # forearm hinges up and down: a real hammer blow
                'upperarm.L': (62, 0, 18), 'forearm.L': (50, 0, 0), 'hand.L': (-10, 0, 0)})
    return p

def work_dig(t):
    """Hoeing (reference: farmer building a field ridge): feet apart, bent at the waist, both hands on the long handle;
    lift the hoe up past the shoulder, chop the blade into the ground in front, pull the soil back towards the feet."""
    K = [(0, {'ua': 40, 'fa': 60, 'wr': -105, 'lean': 40, 'hd': 10}),
         (.3, {'ua': 125, 'fa': 45, 'wr': -10, 'lean': 22, 'hd': -4}),
         (.45, {'ua': 128, 'fa': 42, 'wr': -8, 'lean': 20, 'hd': -6}),
         (.6, {'ua': 66, 'fa': 8, 'wr': -82, 'lean': 46, 'hd': 14}),
         (.82, {'ua': 34, 'fa': 58, 'wr': -110, 'lean': 42, 'hd': 12}),
         (1, {'ua': 40, 'fa': 60, 'wr': -105, 'lean': 40, 'hd': 10})]
    k = keys(K, t)
    p = soft_legs({'chest': (k['lean'], -6, 0), 'pelvis': (k['lean'] * .35, 0, 0), 'head': (k['hd'], 0, 0),
                   'upperarm.R': (k['ua'], 0, 6), 'forearm.R': (k['fa'], 0, 0), 'hand.R': (k['wr'], 0, 0),
                   'upperarm.L': (k['ua'] * .9, 0, -6), 'forearm.L': (k['fa'], 0, 0)}, 1.3)
    p['thigh.L'] = (40, 0, -10); p['shin.L'] = (-52, 0, 0); p['thigh.R'] = (-6, 0, 10); p['shin.R'] = (-26, 0, 0)
    return p

def work_tinker(t):
    """Repairing or crafting at ground level: crouched, both hands busy in front, small turning motions."""
    s, c = math.sin(2 * math.pi * t), math.cos(2 * math.pi * t * 2)
    p = _crouch({'chest': (34, 6 * s, 0), 'neck': (8, 0, 0), 'head': (10, 10 * s, 0),
                 'upperarm.R': (70 + 6 * c, 0, -8), 'forearm.R': (70 + 10 * s, 0, 0), 'hand.R': (-100, 30 * s, 0),
                 'upperarm.L': (70 - 6 * c, 0, 8), 'forearm.L': (70 - 10 * s, 0, 0), 'hand.L': (0, -20 * s, 0)})
    return p

def sit(t):
    """Sitting on a crate or bench, relaxed breathing, looking around a little."""
    w = math.sin(2 * math.pi * t)
    p = _seated({'chest': (4 + 2 * w, 0, 0), 'head': (-4 - 2 * w, 14 * math.sin(2 * math.pi * t + 1), 0)})
    return p

def sit_f(t):
    """Female sit: knees and feet together, hands on the knees."""
    w = math.sin(2 * math.pi * t)
    p = _seated({'chest': (4 + 2 * w, 0, 0), 'head': (-4 - 2 * w, 14 * math.sin(2 * math.pi * t + 1), 0)}, 0)
    p['thigh.L'] = (88, 0, 3); p['thigh.R'] = (88, 0, -3)
    return p

def sleep(t):
    """Lying on the back asleep: slow breathing, head turned to the side, arms on the belly."""
    w = math.sin(2 * math.pi * t)
    p = {'pelvis': (-88, 0, 0), 'chest': (-3 + 2.5 * w, 0, 0), 'neck': (0, 0, 0), 'head': (-6, 32, 0),
         'thigh.L': (8, 0, -4), 'thigh.R': (14, 0, 6), 'shin.L': (-8, 0, 0), 'shin.R': (-22, 0, 0),
         'upperarm.L': (-4, 0, 6), 'upperarm.R': (-2, 0, -6), 'forearm.L': (14, 0, 0), 'forearm.R': (16, 0, 0)}   # arms resting along the body
    p['bob'] = -.215
    return p

def eat(t):
    """Sitting and eating: right hand goes from the lap to the mouth, a little chewing nod."""
    K = [(0, {'ua': 30, 'fa': 50, 'hd': -2}), (.25, {'ua': 46, 'fa': 128, 'hd': 4}), (.45, {'ua': 46, 'fa': 132, 'hd': 6}),
         (.6, {'ua': 34, 'fa': 70, 'hd': 0}), (1, {'ua': 30, 'fa': 50, 'hd': -2})]
    k = keys(K, t)
    p = _seated({'chest': (10, 0, 0), 'head': (k['hd'] + 2 * math.sin(2 * math.pi * t * 4), 0, 0)})
    p['upperarm.R'] = (k['ua'], 0, -14); p['forearm.R'] = (k['fa'], 0, 0); p['hand.R'] = (-20, 0, 0)
    p['upperarm.L'] = (40, 0, 10); p['forearm.L'] = (78, 0, 0)          # left hand holds the bowl
    return p

def talk(t):
    """Standing and chatting: weight shifts, hands gesture, head nods."""
    s, c = math.sin(2 * math.pi * t), math.sin(2 * math.pi * t * 2 + .7)
    p = soft_legs({'chest': (3, 8 * s, 0), 'head': (-6 + 5 * c, 10 * s, 4 * s),
                   'upperarm.R': (22 + 16 * max(0.0, c), 0, -10), 'forearm.R': (70 + 20 * c, 0, 0), 'hand.R': (0, 40 * c, 0),
                   'upperarm.L': (14 + 10 * max(0.0, -s), 0, 12), 'forearm.L': (50 + 22 * max(0.0, -s), 0, 0)}, .8)
    p['thigh.R'] = (10 + 6 * s, 0, 4)
    return p

WAVE_TW = 90      # twist of the raised arm so the palm faces forward
CHEER_TW = 90
def wave(t):
    """Waving hello: right arm high, forearm swinging side to side."""
    s = math.sin(2 * math.pi * t * 2)
    p = soft_legs({'chest': (-2, -6, 0), 'head': (-10, -6, 6),
                   'upperarm.R': (8, WAVE_TW, -138 + 18 * s), 'forearm.R': (8, 0, 0), 'hand.R': (0, 0, 0),
                   'upperarm.L': (8 + 2 * s, 0, 10 - 1.5 * s), 'forearm.L': (30 + 3 * s, 0, 0)}, .8)   # the other hand moves a little too
    return p

CARRY_ARMS = {'upperarm.R': (42, 0, -14), 'upperarm.L': (42, 0, 14), 'forearm.R': (68, 0, 0), 'forearm.L': (68, 0, 0), 'hand.R': (-10, 0, 0), 'hand.L': (-10, 0, 0)}

def carry_walk(t):
    """Walking with a crate held against the belly: arms locked, a little lean back, shorter steps."""
    p = legs_walk({}, t, .8)
    p.update(CARRY_ARMS); p['chest'] = (-6, 0, 0); p['head'] = (-10, 0, 0)
    return steady_head(p)

def carry_idle(t):
    """Standing with the crate."""
    w = math.sin(2 * math.pi * t)
    p = soft_legs({'chest': (-6 + 2 * w, 0, 0), 'head': (-10, 0, 0)}, .9)
    p.update(CARRY_ARMS)
    return p

def walk_f(t):
    """Female walk: lighter, narrower steps, hips sway side to side, arms swing closer to the body."""
    p = legs_walk({}, t, .85)
    ph = 2 * math.pi * t; sn = math.sin(ph)
    for n, sg in (('L', 1), ('R', -1)):
        p['upperarm.' + n] = (-26 * sg * sn, 0, 12 * sg); p['forearm.' + n] = (22 + 16 * max(0.0, -sg * sn), 0, 0)   # arms clear of the hips
        th = p['thigh.' + n]; p['thigh.' + n] = (th[0], 0, -5 * sg)
    p['pelvis'] = (0, 14 * sn, 7 * sn); p['chest'] = (4, -10 * sn, -4 * sn); p['head'] = (-10, 0, 0)
    return steady_head(p, 0, 0)

def pickup(t):
    """Picking something up off the ground (loot bag, crate, supplies): squat and bend, both hands reach down,
    grab, stand back up hugging it. Plays once (about 1.1 s); ends in the carry pose."""
    K = [(0, {'lean': 3, 'th': 18, 'sh': -33, 'ft': 15, 'bob': -.035, 'ua': 4, 'fa': 22, 'hd': -6}),
         (.32, {'lean': 52, 'th': 78, 'sh': -105, 'ft': 30, 'bob': -.2, 'ua': 66, 'fa': 12, 'hd': 18}),
         (.5, {'lean': 56, 'th': 82, 'sh': -110, 'ft': 30, 'bob': -.21, 'ua': 70, 'fa': 16, 'hd': 20}),
         (.82, {'lean': -4, 'th': 20, 'sh': -34, 'ft': 15, 'bob': -.04, 'ua': 42, 'fa': 68, 'hd': -10}),
         (1, {'lean': -6, 'th': 18, 'sh': -32, 'ft': 15, 'bob': -.035, 'ua': 42, 'fa': 68, 'hd': -10})]
    k = keys(K, t)
    return {'chest': (k['lean'], 0, 0), 'pelvis': (k['lean'] * .35, 0, 0), 'head': (k['hd'], 0, 0),
            'thigh.L': (k['th'], 0, -6), 'thigh.R': (k['th'] * .9, 0, 6), 'shin.L': (k['sh'], 0, 0), 'shin.R': (k['sh'] * .95, 0, 0),
            'foot.L': (k['ft'], 0, 0), 'foot.R': (k['ft'], 0, 0),
            'upperarm.L': (k['ua'], 0, 14), 'upperarm.R': (k['ua'], 0, -14), 'forearm.L': (k['fa'], 0, 0), 'forearm.R': (k['fa'], 0, 0),
            'hand.L': (-10, 0, 0), 'hand.R': (-10, 0, 0), 'bob': k['bob']}

CLIPS = {  # name: (pose fn, frames, ms per frame, loop, weapon class: None/'melee'/'gun')
    'idle': (idle, 8, 160, True, None), 'walk': (walk, 8, 110, True, None),
    'hold_idle': (None, 8, 160, True, 'any'), 'hold_walk': (None, 8, 110, True, 'any'),
    'rescue': (rescue, 8, 140, True, None), 'punch': (punch, 6, 80, False, None),
    'swing_a': (swing_a, 8, 0, False, 'melee'), 'swing_b': (swing_b, 8, 0, False, 'melee'), 'swing_c': (swing_c, 8, 0, False, 'melee'), 'swing_d': (swing_d, 8, 0, False, 'melee'),
    'fire': (fire, 6, 70, False, 'shoot'), 'hurt': (hurt, 5, 110, False, None), 'hold_hurt': (None, 5, 110, False, 'any'), 'collapse': (collapse, 8, 140, False, None),
    'cheer': (cheer, 10, 100, True, None)}
SWING_T = [0, .2, .38, .46, .54, .6, .66, .82]          # uneven times: slow wind-up, fast strike
SWING_MS = [160, 130, 120, 160, 60, 60, 200, 160]
WEAPONS = {'bat': 'melee', 'axe': 'melee', 'rifle': 'gun', 'ak47': 'gun', 'pistol': 'pistol', 'hammer': 'tool', 'hoe': 'tool', 'wrench': 'tool', 'crate': 'tool', 'bowl': 'tool'}   # pistol: one-handed gun

def pose_fn(clip, wclass):
    if clip == 'hold_idle': return hold_idle_gun if wclass == 'gun' else hold_idle_melee
    if clip == 'hold_walk': return hold_walk_gun if wclass == 'gun' else hold_walk_melee
    if clip == 'hold_hurt': return lambda t: hold_hurt(t, wclass)
    if clip == 'fire' and wclass == 'pistol': return fire_pistol
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
        T(g - Vector((0, 0, .0)), rec, .018, .018, gun if kind == 'ak47' else gunwood, seg=6)              # grip
        T(rec - up * .2, rec - up * .02, .027, .032, gunwood)                                             # stock
        T(rec - up * .03, rec + up * .16, .03, .03, gun, seg=8)                                             # receiver
        T(rec + up * .16, rec + up * (.4 if kind == 'rifle' else .32), .011, .011, gun, seg=8)              # barrel
        T(rec + up * .16, rec + up * .27, .023, .021, gunwood if kind == 'rifle' else gunwood, seg=8)       # handguard
        if kind == 'ak47':
            T(rec + up * .06 - Vector((0, 0, .025)), rec + up * .11 - Vector((0, 0, .13)), .017, .014, gun, seg=6)   # curved mag
        else:
            T(rec + up * .04 + Vector((0, 0, .036)), rec + up * .14 + Vector((0, 0, .036)), .012, .012, gun, seg=6)  # scope
        tip = rec + up * (.42 if kind == 'rifle' else .34); grip2 = rec + up * .22 - Vector((0, 0, .025))
        ensure_gun_bone(ao, g, g + fwd * .12)
    elif kind == 'pistol':
        # one-handed: the barrel runs along the hand (so with a straight wrist it points where the forearm points),
        # the slide sits on the thumb side of the fist and the grip goes down through it
        dirB = (b - a).normalized(); dirU = fwd; side2 = dirB.cross(dirU).normalized()
        top = g + dirU * .038
        T(top - dirB * .045, top + dirB * .11, .022, .022, gun, seg=4)                                       # slide
        T(g + dirU * .012 - dirB * .03, g - dirU * .055 - dirB * .045, .017, .019, gunwood, seg=4)           # grip
        T(top + dirB * .11, top + dirB * .125, .008, .008, gun, seg=6)                                       # muzzle
        tip = top + dirB * .13; grip2 = g - side2 * .035 - dirU * .02   # where the left hand cups the right
    elif kind == 'hammer':          # claw hammer: short wooden handle, steel head across the end
        T(g - up * .05, g + up * .22, .014, .016, wood)
        hd = g + up * .22; T(hd - across * .05, hd + across * .045, .024, .024, metal, seg=8); tip = hd
    elif kind == 'hoe':             # garden hoe: long handle, flat blade at the end bent back towards the user
        T(g - up * .3, g + up * .62, .014, .014, wood)
        hd = g + up * .62; Bx(hd - across * .05, (.012, .11, .07), metal); tip = hd - across * .08; grip2 = g + up * .3
    elif kind == 'wrench':          # big spanner
        T(g - up * .04, g + up * .17, .011, .011, metal, seg=6)
        hd = g + up * .19; Bx(hd, (.018, .05, .03), metal); tip = hd
    elif kind == 'bowl':            # food bowl in the left hand
        hl = ao.data.bones['hand.L']; ga = (ao.matrix_world @ hl.head_local).lerp(ao.matrix_world @ hl.tail_local, .6)
        T(ga + Vector((0, 0, -.02)), ga + Vector((0, 0, .03)), .03, .055, wood, seg=12); tip = ga
    elif kind == 'crate':           # carried crate, centred between the hands in the carry pose (rides on the chest bone)
        import ai_render as _ar
        _ar.apply_pose(ao, carry_idle(0)); bpy.context.view_layer.update()
        hl = ao.matrix_world @ ao.pose.bones['hand.L'].head; hr = ao.matrix_world @ ao.pose.bones['hand.R'].head
        hl2 = ao.matrix_world @ ao.pose.bones['hand.L'].tail; hr2 = ao.matrix_world @ ao.pose.bones['hand.R'].tail
        c = (hl + hr + hl2 + hr2) / 4; c.x = 0
        Bx(c, (max(.2, abs(hl.x - hr.x) - .02), .18, .18), toon_mat('w_crate', '#c8924f')); tip = c
    w = _join(parts, 'weapon_' + kind)
    isgun = WEAPONS[kind] == 'gun'
    def bone_parent(ob, bone):
        mw = ob.matrix_world.copy(); ob.parent = ao; ob.parent_type = 'BONE'; ob.parent_bone = bone
        bpy.context.view_layer.update(); ob.matrix_world = mw
    bone_parent(w, 'gun' if isgun else 'hand.L' if kind == 'bowl' else 'chest' if kind == 'crate' else 'hand.R')
    def empty(name, at):
        e = bpy.data.objects.new(name, None); bpy.context.scene.collection.objects.link(e); e.location = at
        bpy.context.view_layer.update(); mw = e.matrix_world.copy(); e.parent = w; bpy.context.view_layer.update(); e.matrix_world = mw
        return e
    low = {'bat': .06, 'axe': .06, 'hoe': .24}.get(kind)   # second hand just below the first on the handle (two-hand chops, hoeing)
    out = {'obj': w, 'tip': empty('tip', tip), 'grip2': empty('grip2', grip2) if grip2 else None,
           'grip_low': empty('grip_low', g - up * low) if low else None,
           'grip1': empty('grip1', g) if isgun or kind == 'pistol' else None,   # pistol: reference only (no IK)
           'cls': WEAPONS[kind], 'kind': kind}
    return out

def ensure_gun_bone(ao, head, tail):
    """A bone for two-hand guns (child of the chest, at the right-hand grip, pointing down the barrel), so a clip can
    carry the rifle low across the body or shoulder it, and the hands follow by IK. Unweighted: it moves no skin."""
    if 'gun' in ao.data.bones: return
    vl = bpy.context.view_layer; prev = vl.objects.active
    vl.objects.active = ao; ao.select_set(True); bpy.ops.object.mode_set(mode='EDIT')
    inv = ao.matrix_world.inverted(); eb = ao.data.edit_bones.new('gun')
    eb.head = inv @ head; eb.tail = inv @ tail; eb.roll = 0; eb.parent = ao.data.edit_bones['chest']; eb.use_deform = False
    bpy.ops.object.mode_set(mode='OBJECT'); vl.objects.active = prev
    ao.pose.bones['gun'].rotation_mode = 'XYZ'

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

def render_all(blend, out, clips, weapons, views, px=256, preview=False, actions=None, outfit=None):
    ao, body = ai_render.load(blend); ai_render.toonify(body)
    if outfit == 'armor':            # equipment: plate armour riding on the bones (armor.py)
        import armor; armor.build(ao, body)
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
            if need == 'melee' and wcls != 'melee': continue
            if need == 'shoot' and wcls not in ('gun', 'pistol'): continue
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
    if 'tex' in opt: ai_render.TEX_PX = int(opt['tex'])
    render_all(pos[0], pos[1], clips, weapons, views, int(opt.get('px', 300)), 'preview' in a, opt.get('actions'), opt.get('outfit'))
