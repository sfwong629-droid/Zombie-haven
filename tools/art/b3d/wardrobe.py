"""Wardrobe and equipment pieces for survivor.py.

Each function adds meshes to ctx['parts'] as (role, object). Garments are cut
from the shared body, so they fit every body shape and follow every animation.
Rigid gear sets obj['bone'] to ride on one bone (head, chest, pelvis, hand.R...).
Colours are hex strings; 'plaid' and 'stripes' are pattern options.
"""
from mathutils import Vector
import math
from inkstyle import ink
from survivor import garment, box, tube, ellip, ring, ragged_disc, D, COVERS

def _mat(name, colour, pattern=None, accent=None, **kw):
    lines = None
    if pattern == 'plaid':
        a = accent or '#1e3a1a'
        lines = [('X', .16, .45, a, .5), ('Z', .12, .45, a, .4)]     # big checks (Look E)
    elif pattern == 'stripes':
        lines = [('Z', .06, .3, accent or '#20201c', .6)]
    elif pattern == 'seams':
        lines = [('Z', .25, .03, None, .6)]
    return ink(name + colour + str(pattern), colour, lines=lines, coord='Generated', **kw)

def _surf(ctx, x, z, side=-1, pad=.006):
    """Point on the body surface at (x, z), seen from the front (side=-1) or back (side=+1)."""
    if '_bvh' not in ctx:
        from mathutils.bvhtree import BVHTree
        me = ctx['body'].data
        ctx['_bvh'] = BVHTree.FromPolygons([v.co.copy() for v in me.vertices], [tuple(p.vertices) for p in me.polygons])
    hit = ctx['_bvh'].ray_cast(Vector((x, side * 2.0, z)), Vector((0, -side, 0)))
    y = hit[0].y if hit[0] is not None else side * .12
    return Vector((x, y + side * pad, z))

def _strap(ctx, pts, r, mat, name='strap', bone='chest'):
    for a_, b_ in zip(pts, pts[1:]):
        _add(ctx, name, tube(a_, b_, r, r, mat, seg=6), bone)

def _add(ctx, role, o, bone=None):
    if bone: o['bone'] = bone
    ctx['parts'].append((role, o)); return o

def _arm_len(J, side, f):
    """Height of a point f (0 shoulder .. 1 wrist) down the arm."""
    a = J['upperarm.' + side][0].z; b = J['forearm.' + side][1].z
    return a + (b - a) * f

# ------------------------------------------------------------------ garments
def shirt(ctx, colour='#4a9640', pattern=None, accent=None, sleeves='long', tuck=True, layer=0, collar=True, buttons=True):
    J = ctx['J']; s = ctx['s']
    cut = {'long': .97, 'rolled': .62, 'short': .3, 'none': 0.0}[sleeves]
    zl = {k: _arm_len(J, k, cut) for k in 'LR'}
    bottom = (.79 if tuck else .7) * s
    def keep(bone, co):
        if bone in ('pelvis', 'chest'): return bottom < co.z < 1.115 * s
        if bone == 'neck': return co.z < 1.115 * s
        side = bone[-1]
        if bone.startswith(('upperarm', 'forearm')) and cut > 0: return co.z > zl[side]
        return False
    o = garment(ctx['body'], ctx['dom'], keep, .017 + .012 * layer, 'shirt', _mat('shirt', colour, pattern, accent))   # sits over the trouser waist
    _add(ctx, 'shirt', o)
    if sleeves == 'rolled':     # chunky rolled cuffs
        for side in 'LR':
            a, b = J['forearm.' + side][:2]; c = a + (b - a) * ((cut - .5) / .5 if cut > .5 else 0)
            lm = ctx.get('b', {}).get('limb', 1.0)
            _add(ctx, 'cuff', tube(c + Vector((0, 0, .028)), c - Vector((0, 0, .028)), .07 * s * lm, .066 * s * lm, _mat('cuff', colour, pattern, accent), seg=8))
    if collar and layer == 0:   # pointed shirt collar, open at the neck
        cm = _mat('collar', colour, pattern, accent)
        for x in (1, -1):
            _add(ctx, 'collar', box((x * .045 * s, -.098 * s, 1.105 * s), (.075 * s, .014, .055 * s), cm,
                                    rot=(D(-35), x * D(-12), x * D(28)), bevel=.004), 'chest')
            _add(ctx, 'collar', box((x * .06 * s, -.02 * s, 1.135 * s), (.06 * s, .1 * s, .03 * s), cm, rot=(0, 0, x * D(12)), bevel=.004), 'chest')
    if buttons and layer == 0:
        for z in (1.0, .93, .86):
            _add(ctx, 'button', ellip((0, -.152 * s, z * s), (.011, .006, .011), ink('sbtn', '#d8c8a0'), seg=8), 'chest')

def jacket(ctx, colour='#8a5a34', pattern=None, accent=None, sleeves='long', open_front=False, collar=True):
    shirt(ctx, colour, pattern, accent, sleeves, tuck=False, layer=1)
    J = ctx['J']; s = ctx['s']; dark = '#2a1a10'
    _add(ctx, 'zip', box((0, -.13 * s, .95 * s), (.012, .01, .3 * s), ink('zip', dark, hatch=False), bevel=0), 'chest')
    if collar:
        _add(ctx, 'collar', ring((0, -.005, 1.1 * s), .085 * s, .05 * s, _mat('collar', colour), thick=.02), 'chest')

def vest(ctx, colour='#5a5a3a', plates=True):
    J = ctx['J']; s = ctx['s']
    def keep(bone, co): return bone in ('chest', 'pelvis') and .78 * s < co.z < 1.1 * s and abs(co.x) < .16 * s
    _add(ctx, 'vest', garment(ctx['body'], ctx['dom'], keep, .045, 'vest', _mat('vest', colour, 'seams'), thicken=.012))
    if plates:
        for z in (.88, 1.0):
            _add(ctx, 'plate', box((0, -.165 * s, z * s), (.2 * s, .03, .1 * s), ink('plate', '#4a4a32'), bevel=.01), 'chest')

def pants(ctx, colour='#7a4a26', pattern=None, pockets=False):
    J = ctx['J']; s = ctx['s']
    lim = ctx.get('b', {}).get('limb', 1.0)
    def keep(bone, co):
        if bone in ('pelvis', 'chest'): return co.z < .86 * s
        if bone.startswith(('thigh', 'shin')): return co.z > ctx.get('b', {}).get('pants_low', .16) * s
        return False
    _add(ctx, 'pants', garment(ctx['body'], ctx['dom'], keep, .012, 'pants', _mat('pants', colour, pattern)))
    for side in 'LR':   # bunched hems over the boots
        a, b = J['shin.' + side][:2]; c = a + (b - a) * .72
        _add(ctx, 'hem', tube(c + Vector((0, 0, .03)), c - Vector((0, 0, .02)), .072 * s * lim, .08 * s * lim, _mat('hem', colour), seg=8), 'shin.' + side)
    if pockets:
        for side, x in (('L', 1), ('R', -1)):
            a, b = J['thigh.' + side][:2]; c = a + (b - a) * .55
            pm = _mat('pocket', colour, 'seams')
            _add(ctx, 'pocket', box(c + Vector((x * .085 * s, -.01, 0)), (.035, .11 * s, .12 * s), pm, bevel=.008), 'thigh.' + side)
            _add(ctx, 'pocket', box(c + Vector((x * .1 * s, -.01, .06 * s)), (.02, .115 * s, .035 * s), pm, bevel=.005), 'thigh.' + side)

def overalls(ctx, colour='#3f5a8a'):
    pants(ctx, colour)
    J = ctx['J']; s = ctx['s']
    c0, c1 = J['chest'][0], J['chest'][1]; top = c0.z + (c1.z - c0.z) * .55; w = abs(J['upperarm.L'][0].x) * .55
    def keep(bone, co): return bone in ('chest', 'pelvis') and c0.z - .05 * s < co.z < top and co.y < 0 and abs(co.x) < w
    _add(ctx, 'bib', garment(ctx['body'], ctx['dom'], keep, .03, 'bib', _mat('bib', colour, 'seams')))
    ctx['_bibtop'] = top; ctx['_bibw'] = w
    suspenders(ctx, colour)

def suspenders(ctx, colour='#5a3519'):
    """Straps from the bib (or waist) up over the shoulders and down the back, laid on the body surface."""
    J = ctx['J']; s = ctx['s']; m = ink('susp' + colour, colour)
    c0, c1 = J['chest'][0], J['chest'][1]
    lo = ctx.get('_bibtop', c0.z + (c1.z - c0.z) * .3); sh = J['upperarm.L'][0]
    for x in (1, -1):
        xa = x * ctx.get('_bibw', abs(sh.x) * .5) * .75; xs = x * abs(sh.x) * .62
        tz = sh.z + .015
        front = [_surf(ctx, xa + (xs - xa) * t, lo + (tz - lo) * t, -1, .012) for t in (0, .35, .7, 1)]
        back = [_surf(ctx, xs + (xa - xs) * t, tz - (tz - lo) * t, 1, .012) for t in (0, .35, .7, 1)]
        _strap(ctx, front + back, .014 * s, m, 'strap')
        _add(ctx, 'button', ellip(front[0] + Vector((0, -.004, 0)), (.011, .006, .011), ink('btn', '#c9b27a')), 'chest')

def boots(ctx, colour='#47291a', tall=False):
    """Chunky work boots: shaft on the shin, rounded foot with a raised toe, thick sole, folded top."""
    bs = ctx.get('b', {}).get('boot_scale', 1.0)
    s = ctx['s'] * bs; top = (.28 if tall else .2) * s
    def keep(bone, co): return (bone.startswith('foot') or bone.startswith('shin')) and co.z < top
    COVERS.append(keep)
    m = ink('boot' + colour, colour); sole = ink('sole', '#2a1a10')
    import inkstyle; cuffc = inkstyle.shade_of(colour, k=1.15, sat=.9)
    for side, x in (('L', 1), ('R', -1)):
        a, b = ctx['J']['foot.' + side][:2]
        _add(ctx, 'boots', tube((a.x, a.y, .05 * s), (a.x, a.y, top), .072 * s, .07 * s, m, seg=8), 'shin.' + side)
        _add(ctx, 'boots', ring((a.x, a.y, top - .01), .078 * s, .04 * s, ink('bcuff' + cuffc, cuffc), thick=.012, seg=8), 'shin.' + side)
        _add(ctx, 'boots', box((a.x, a.y - .07 * s, .06 * s), (.13 * s, .2 * s, .1 * s), m, bevel=.035), 'foot.' + side)
        _add(ctx, 'boots', ellip((a.x, a.y - .145 * s, .065 * s), (.066 * s, .06 * s, .05 * s), m, seg=8), 'foot.' + side)   # round toe
        _add(ctx, 'sole', box((a.x, a.y - .075 * s, .014), (.14 * s, .25 * s, .03), sole, bevel=.008), 'foot.' + side)
        for k in range(3):   # laces
            _add(ctx, 'lace', box((a.x, a.y - .072 * s, (.1 + k * .03) * s), (.06 * s, .01, .008), ink('lace', '#c9b27a'), bevel=0), 'shin.' + side)

def gloves(ctx, colour='#3d3d3a'):
    def keep(bone, co): return bone.startswith('hand')
    _add(ctx, 'gloves', garment(ctx['body'], ctx['dom'], keep, .008, 'gloves', ink('glove' + colour, colour)))

def belt(ctx, colour='#33200f', pouches=0, buckle='#c9b27a'):
    s = ctx['s']
    _add(ctx, 'belt', ring((0, 0, .8 * s), .162 * s, .035 * s, ink('belt' + colour, colour), thick=.012), 'pelvis')
    _add(ctx, 'buckle', box((0, -.172 * s, .8 * s), (.05, .012, .04), ink('buckle' + buckle, buckle), bevel=.003), 'pelvis')
    for i in range(pouches):
        a = D(-60 + i * 40) if pouches > 1 else D(-50)
        x, y = math.sin(a) * .17 * s, -math.cos(a) * .17 * s
        _add(ctx, 'pouch', box((x, y, .76 * s), (.07, .045, .08), _mat('pouch', '#6a5a3a', 'seams'), rot=(0, 0, a), bevel=.01), 'pelvis')

def apron(ctx, colour='#ece4cc'):
    s = ctx['s']; m = _mat('apron', colour, 'seams')
    _add(ctx, 'apron', box((0, -.15 * s, .96 * s), (.24 * s, .012, .2 * s), m, bevel=.004), 'chest')
    _add(ctx, 'apron', box((0, -.175 * s, .62 * s), (.3 * s, .012, .34 * s), m, rot=(D(-4), 0, 0), bevel=.004), 'pelvis')
    _add(ctx, 'apron', ring((0, 0, .8 * s), .165 * s, .02 * s, m, thick=.008), 'pelvis')

def scarf(ctx, colour='#5a6a7a'):
    s = ctx['s']; m = ink('scarf' + colour, colour, lines=[('Z', .03, .2, None, .4)])
    _add(ctx, 'scarf', ring((0, -.01, 1.11 * s), .08 * s, .06 * s, m, thick=.03), 'chest')
    _add(ctx, 'scarf', box((.05 * s, -.1 * s, 1.0 * s), (.06, .02, .16 * s), m, rot=(D(8), 0, D(10)), bevel=.008), 'chest')

def armband(ctx, colour='#f2efe6', cross='#c0392b', side='L'):
    J = ctx['J']; a, b = J['upperarm.' + side][:2]; c = a + (b - a) * .45; ax = b - a
    _add(ctx, 'armband', ring(c, .062 * ctx['s'], .05, ink('armband', colour), thick=.01, axis=ax), 'upperarm.' + side)
    out = Vector((1 if side == 'L' else -1, 0, 0))
    for sz in ((.012, .045, .035), (.012, .016, .055)):   # red cross facing outward/front
        _add(ctx, 'cross', box(c + out * .068 * ctx['s'] + Vector((0, -.012, 0)), sz, ink('cross' + cross, cross), bevel=0), 'upperarm.' + side)

# ------------------------------------------------------------------ hats
def hat(ctx, kind='straw', colour=None):
    hz, hr = ctx['hz'], ctx['hr']; tilt = D(-14)
    if kind == 'straw':
        c = colour or '#e6c46c'; m = ink('straw' + c, c, lines=[('X', .04, .2, '#a8823a', .55)], coord='Generated')
        bb = ctx.get('b', {}); band = bb.get('hat_band', '#3b7a2f'); low = bb.get('hat_low', 1.0); wide = bb.get('hat_wide', 1.0)
        _add(ctx, 'hat', ragged_disc((0, hr * .05, hz + hr * .72), hr * 1.55 * wide, hr * 1.5 * wide, m, tilt=tilt))
        _add(ctx, 'hat', tube((0, hr * .12, hz + hr * .74), (0, hr * .2, hz + hr * (.74 + .46 * low)), hr * .92, hr * .78, m, seg=16))
        _add(ctx, 'hat', ring((0, hr * .11, hz + hr * .86), hr * .95, hr * .16, ink('band' + band, band), thick=.012, axis=(0, math.sin(-tilt), 1)))
    elif kind == 'cap':
        c = colour or '#5a5038'; m = ink('cap' + c, c, lines=[('Z', .2, .03, None, .5)], coord='Generated')
        _add(ctx, 'hat', ellip((0, hr * .1, hz + hr * .62), (hr * 1.1, hr * 1.12, hr * .62), m, seg=20))
        _add(ctx, 'hat', box((0, -hr * 1.05, hz + hr * .55), (hr * 1.1, hr * .65, .015), m, rot=(D(-14), 0, 0), bevel=.01))
    elif kind == 'hardhat':
        c = colour or '#e8b830'; m = ink('hard' + c, c)
        _add(ctx, 'hat', ellip((0, hr * .02, hz + hr * .48), (hr * 1.12, hr * 1.14, hr * .85), m, seg=20))
        _add(ctx, 'hat', ring((0, hr * .02, hz + hr * .32), hr * 1.22, .02, m, thick=.03))
        _add(ctx, 'hat', box((0, hr * .02, hz + hr * 1.18), (hr * .25, hr * 1.9, hr * .2), m, bevel=.01))
    elif kind == 'bandana':
        c = colour or '#c0392b'; m = ink('band' + c, c, lines=[('Z', .1, .15, '#f2efe6', .5)], coord='Generated')
        _add(ctx, 'hat', ring((0, hr * .05, hz + hr * .48), hr * 1.04, hr * .3, m, thick=.02, axis=(0, .2, 1)))
        for a in (-.3, .3):
            _add(ctx, 'hat', box((a * hr, hr * 1.1, hz + hr * .3), (hr * .2, .015, hr * .55), m, rot=(D(20), a, 0), bevel=.005))
    elif kind == 'beanie':
        c = colour or '#7a3a2a'; m = ink('bean' + c, c, lines=[('X', .05, .3, None, .4)], coord='Generated')
        _add(ctx, 'hat', ellip((0, hr * .08, hz + hr * .48), (hr * 1.07, hr * 1.08, hr * .82), m, seg=20))
        _add(ctx, 'hat', ring((0, hr * .06, hz + hr * .3), hr * 1.08, hr * .28, m, thick=.03))

def goggles(ctx):
    hz, hr = ctx['hz'], ctx['hr']
    _add(ctx, 'hat', ring((0, 0, hz + hr * .62), hr * 1.12, hr * .14, ink('gstrap', '#2a2a26'), thick=.01))
    for x in (1, -1):
        _add(ctx, 'hat', tube((x * hr * .35, -hr * 1.0, hz + hr * .66), (x * hr * .35, -hr * 1.12, hz + hr * .68), hr * .22, hr * .22, ink('glens', '#8ab0b8', hatch=False), seg=14))

# ------------------------------------------------------------------ carried gear
def backpack(ctx, colour='#6a5a3a', bedroll='#4a6a3a', size=1.0):
    s = ctx['s'] * size; m = _mat('pack', colour, 'seams')
    _add(ctx, 'pack', box((0, .2 * s, .93 * ctx['s']), (.3 * s, .17 * s, .36 * s), m, bevel=.035), 'chest')
    _add(ctx, 'pack', box((0, .3 * s, .88 * ctx['s']), (.22 * s, .05, .16 * s), m, bevel=.02), 'chest')   # front pocket
    _add(ctx, 'pack', box((0, .18 * s, 1.1 * ctx['s']), (.31 * s, .19 * s, .05), m, bevel=.02), 'chest')   # flap
    if bedroll:
        _add(ctx, 'pack', tube((-.2 * s, .2 * s, 1.17 * ctx['s']), (.2 * s, .2 * s, 1.17 * ctx['s']), .065 * s, .065 * s,
                               ink('roll' + bedroll, bedroll, lines=[('X', .3, .06, None, .7)], coord='Generated'), seg=14), 'chest')
    st = ink('pstrap', '#3a2a18')
    for x in (1, -1):
        _add(ctx, 'strap', box((x * .1 * ctx['s'], -.13 * ctx['s'], .98 * ctx['s']), (.04, .015, .26 * ctx['s']), st, rot=(D(8), 0, 0), bevel=0), 'chest')
        _add(ctx, 'strap', box((x * .1 * ctx['s'], -.02, 1.11 * ctx['s']), (.04, .24 * ctx['s'], .015), st, bevel=0), 'chest')

def satchel(ctx, colour='#7a5a34', side='R', cross=None):
    J = ctx['J']; s = ctx['s']; sx = -1 if side == 'R' else 1
    m = _mat('satchel', colour, 'seams')
    pz = J['pelvis'][0].z; hipx = abs(J['thigh.L'][0].x) * 1.9
    x = sx * hipx
    x = sx * hipx * 1.15
    _add(ctx, 'bag', ellip((x, -.05 * s, pz), (.06 * s, .04 * s, .065 * s), m, seg=12), 'pelvis')                    # rounded pouch
    _add(ctx, 'bag', ellip((x, -.066 * s, pz + .03 * s), (.062 * s, .03 * s, .038 * s), m, seg=10), 'pelvis')       # flap
    sh = J['upperarm.L'][0]; shx = -sx * abs(sh.x) * .55; tz = sh.z + .015
    pts = [_surf(ctx, shx + (x * .85 - shx) * t, tz - (tz - pz - .04 * s) * t, -1, .014) for t in (0, .25, .5, .75, 1)]
    pts = [_surf(ctx, shx * .9, tz - .02, 1, .014)] + pts
    _strap(ctx, pts, .014 * s, ink('sstrap' + ctx.get('b', {}).get('strap', '#9f5f32'), ctx.get('b', {}).get('strap', '#9f5f32')), 'strap')
    if cross:   # red cross on the outer face of the bag
        cx = x + sx * .037 * s
        _add(ctx, 'bag', box((cx, -.02, pz), (.01, .05, .05), ink('bx' + cross, cross), bevel=0), 'pelvis')
        _add(ctx, 'bag', box((cx, -.02, pz), (.01, .016, .1), ink('bx' + cross, cross), bevel=0), 'pelvis')

def binoculars(ctx):
    s = ctx['s']; m = ink('bino', '#2e2e2a')
    for x in (1, -1):
        _add(ctx, 'gear', tube((x * .035, -.15 * s, 1.0 * s), (x * .035, -.21 * s, 1.0 * s), .028, .03, m, seg=12), 'chest')
    _add(ctx, 'gear', ring((0, -.03, 1.06 * s), .12 * s, .012, ink('bstrap', '#3a2a18'), thick=.008, axis=(0, .5, 1)), 'chest')

def rifle_on_back(ctx):
    s = ctx['s']; wood = ink('stock', '#7a4a26'); metal = ink('barrel', '#3d3d3a')
    a = Vector((-.2 * s, .17 * s, .7 * s)); b = Vector((.22 * s, .17 * s, 1.28 * s))
    _add(ctx, 'gear', tube(a, a + (b - a) * .35, .03, .025, wood, seg=8), 'chest')
    _add(ctx, 'gear', tube(a + (b - a) * .35, b, .014, .012, metal, seg=8), 'chest')
    _add(ctx, 'strap', box((0, -.135 * s, .97 * s), (.03, .012, .5 * s), ink('rstrap', '#3a2a18'), rot=(0, D(-34), 0), bevel=0), 'chest')

def tool(ctx, kind='hoe', side='R'):
    """Something held in the hand; rides on the hand bone."""
    J = ctx['J']; s = ctx['s']; a, b = J['hand.' + side][:2]; c = (a + b) / 2
    wood = ink('twood', '#9a6a3c'); metal = ink('tmetal', '#8a8c88')
    if kind == 'hoe':
        # gripped in front of the fist, leaning forward so the shaft clears the arm
        g = c + Vector((0, -.05, -.005)) * s; up = Vector((0, -.34, 1)).normalized()
        _add(ctx, 'tool', tube(g + up * .6 * s, g - up * .42 * s, .017, .017, wood, seg=8), 'hand.' + side)
        bl = g - up * .44 * s
        _add(ctx, 'tool', box(bl + Vector((0, -.05, 0)), (.14, .12, .02), metal, rot=(D(-34), 0, 0), bevel=.004), 'hand.' + side)
    elif kind == 'axe':   # held at the end of the handle; the head sits past the thumb side
        g = c + Vector((0, -.04, -.005)) * s; up = Vector((0, -.25, 1)).normalized()
        _add(ctx, 'tool', tube(g - up * .06 * s, g + up * .55 * s, .019, .016, wood, seg=8), 'hand.' + side)
        hd = g + up * .5 * s
        _add(ctx, 'tool', box(hd + Vector((0, -.07, 0)) * s, (.03, .16 * s, .12 * s), metal, bevel=.006), 'hand.' + side)
        _add(ctx, 'tool', box(hd + Vector((0, -.155, 0)) * s, (.022, .025 * s, .17 * s), ink('edge', '#c8ccc6'), bevel=.004), 'hand.' + side)
    elif kind == 'pickaxe':   # handle up from the fist, curved double point across the top
        g = c + Vector((0, -.04, -.005)) * s; up = Vector((0, -.25, 1)).normalized()
        _add(ctx, 'tool', tube(g - up * .06 * s, g + up * .52 * s, .019, .016, wood, seg=8), 'hand.' + side)
        hd = g + up * .5 * s; fw = Vector((0, -1, .25)).normalized()
        for sgn in (1, -1):
            _add(ctx, 'tool', tube(hd, hd + fw * sgn * .17 * s + Vector((0, 0, -.05 * s)), .024, .008, metal, seg=6), 'hand.' + side)
    elif kind == 'ladle':
        _add(ctx, 'tool', tube(c + Vector((0, -.02, .02)), c + Vector((0, -.04, -.3 * s)), .01, .01, metal, seg=8), 'hand.' + side)
        _add(ctx, 'tool', ellip(c + Vector((0, -.05, -.33 * s)), (.05, .05, .03), metal), 'hand.' + side)
    elif kind == 'wrench':
        _add(ctx, 'tool', box(c + Vector((0, -.02, -.12 * s)), (.025, .018, .26 * s), metal, bevel=.004), 'hand.' + side)
        _add(ctx, 'tool', box(c + Vector((0, -.02, -.27 * s)), (.06, .02, .05), metal, bevel=.004), 'hand.' + side)
    elif kind == 'crowbar':
        _add(ctx, 'tool', tube(c + Vector((0, 0, .1)), c + Vector((0, -.04, -.5 * s)), .012, .012, ink('crow', '#b0392b'), seg=8), 'hand.' + side)
    elif kind == 'medkit':
        _add(ctx, 'tool', box(c + Vector((0, -.02, -.1 * s)), (.1, .19 * s, .14 * s), ink('kit', '#e6ddc8'), bevel=.02), 'hand.' + side)
        for xx in (.052, -.052):
            _add(ctx, 'tool', box(c + Vector((xx, -.02, -.1 * s)), (.01, .05, .016), ink('kx', '#c0392b'), bevel=0), 'hand.' + side)
            _add(ctx, 'tool', box(c + Vector((xx, -.02, -.1 * s)), (.01, .016, .05), ink('kx', '#c0392b'), bevel=0), 'hand.' + side)
