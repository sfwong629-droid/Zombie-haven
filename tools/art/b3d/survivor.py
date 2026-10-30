"""Modular 3D survivor for Zombie Haven (direction B, ink style).

One base body and one skeleton are shared by every profession. A profession is
data (see professions.py): body shape, skin, hair, face, and a list of wardrobe
and equipment pieces. Every piece is a mesh bound to the same skeleton, so all
of them follow the same walk and idle animations, and new professions or gear
only need new data or one new piece-builder.

    import survivor
    rig = survivor.build(PROFESSIONS['farmer'], origin=(0, 0, 0), facing=90)
    survivor.pose(rig, survivor.walk(0.25))

Rest pose: facing -Y, A-pose arms. Units: metres. Default height ~1.55 m,
head ~0.33 m (about 4.75 heads).
"""
import math, random
import bpy, bmesh
from mathutils import Vector, Matrix
from mathutils.geometry import intersect_point_line
from inkstyle import ink

D = math.radians

# ------------------------------------------------------------------ skeleton
# name: (head, tail, parent). Character faces -Y. x>0 is the character's left.
def joints(b):
    s = b.get('height', 1.0); sw = b.get('shoulders', 1.0); hw = b.get('hips', 1.0)
    J = {
        'pelvis': ((0, 0, .70), (0, 0, .86), None),
        'chest': ((0, 0, .86), (0, 0, 1.10), 'pelvis'),
        'neck': ((0, 0, 1.10), (0, -.01, 1.18), 'chest'),
        'head': ((0, -.01, 1.18), (0, -.01, 1.50), 'neck'),
    }
    for side, x in (('L', 1), ('R', -1)):
        J['upperarm.' + side] = ((x * .19 * sw, 0, 1.06), (x * .25 * sw, .005, .81), 'chest')
        J['forearm.' + side] = ((x * .25 * sw, .005, .81), (x * .29 * sw, -.025, .59), 'upperarm.' + side)
        J['hand.' + side] = ((x * .29 * sw, -.025, .59), (x * .305 * sw, -.035, .47), 'forearm.' + side)
        J['thigh.' + side] = ((x * .092 * hw, 0, .69), (x * .095 * hw, -.005, .38), 'pelvis')
        J['shin.' + side] = ((x * .095 * hw, -.005, .38), (x * .095 * hw, .012, .085), 'thigh.' + side)
        J['foot.' + side] = ((x * .095 * hw, .012, .085), (x * .095 * hw, -.12, .03), 'shin.' + side)
    return {k: (Vector(h) * s, Vector(t) * s, p) for k, (h, t, p) in J.items()}

BODY_BONES = ['pelvis', 'chest', 'neck'] + [p + '.' + s for s in 'LR' for p in ('upperarm', 'forearm', 'hand', 'thigh', 'shin', 'foot')]

# ------------------------------------------------------------------ mesh helpers
def _link(me, name):
    o = bpy.data.objects.new(name, me); bpy.context.scene.collection.objects.link(o); return o

def _sphere(c, r, seg=24, ring=16):
    bm = bmesh.new(); bmesh.ops.create_uvsphere(bm, u_segments=seg, v_segments=ring, radius=1.0)
    bmesh.ops.scale(bm, vec=Vector(r) if hasattr(r, '__len__') else Vector((r, r, r)), verts=bm.verts)
    bmesh.ops.translate(bm, vec=Vector(c), verts=bm.verts); return bm

def _capsule(bm_all, p0, p1, r0, r1, seg=16):
    """Tapered capsule from p0 to p1, added into bm_all."""
    p0, p1 = Vector(p0), Vector(p1); d = p1 - p0; L = d.length
    q = d.to_track_quat('Z', 'Y')
    tmp = bmesh.new(); bmesh.ops.create_cone(tmp, cap_ends=True, segments=seg, radius1=r0, radius2=r1, depth=L)
    bmesh.ops.rotate(tmp, cent=Vector(), matrix=q.to_matrix(), verts=tmp.verts)
    bmesh.ops.translate(tmp, vec=(p0 + p1) / 2, verts=tmp.verts)
    for c, r in ((p0, r0), (p1, r1)):
        sb = _sphere(c, r, seg, seg // 2); _merge(tmp, sb)
    _merge(bm_all, tmp)

def _merge(dst, src):
    me = bpy.data.meshes.new('_t'); src.to_mesh(me); src.free(); dst.from_mesh(me); bpy.data.meshes.remove(me)

# Look E (low-poly papercraft): every organic mesh is decimated to big flat facets.
FACET = {'body': .06, 'head': .09, 'hair': .07, 'garment': .07, 'beard': .16}

def _facet(o, ratio):
    """Collapse a smooth mesh into big flat facets (the folded-paper look)."""
    if not ratio: return o
    d = o.modifiers.new('dec', 'DECIMATE'); d.decimate_type = 'COLLAPSE'; d.ratio = ratio; d.use_collapse_triangulate = True
    dg = bpy.context.evaluated_depsgraph_get(); ev = o.evaluated_get(dg)
    nm = bpy.data.meshes.new_from_object(ev); o.modifiers.remove(d); old = o.data; o.data = nm; bpy.data.meshes.remove(old)
    for p in o.data.polygons: p.use_smooth = False
    return o

def _remesh(bm, name, voxel, smooth=6, smooth_factor=0.6):
    """Fuse overlapping primitives into one clean surface (voxel remesh + smoothing)."""
    me = bpy.data.meshes.new(name); bm.to_mesh(me); bm.free()
    o = _link(me, name)
    r = o.modifiers.new('r', 'REMESH'); r.mode = 'VOXEL'; r.voxel_size = voxel; r.use_smooth_shade = True
    if smooth:
        sm = o.modifiers.new('s', 'SMOOTH'); sm.factor = smooth_factor; sm.iterations = smooth
    dg = bpy.context.evaluated_depsgraph_get(); ev = o.evaluated_get(dg)
    nm = bpy.data.meshes.new_from_object(ev); o.modifiers.clear(); old = o.data; o.data = nm; bpy.data.meshes.remove(old)
    for p in o.data.polygons: p.use_smooth = True
    return o

# ------------------------------------------------------------------ body
def body_mesh(b, J):
    bm = bmesh.new()
    s = b.get('height', 1.0); sw = b.get('shoulders', 1.0); hw = b.get('hips', 1.0); belly = b.get('belly', 1.0); bulk = b.get('bulk', 1.0)
    # torso: stacked ellipsoids, fused
    for (z, rx, ry, rz) in ((.73, .155 * hw, .112, .12), (.87, .145 * belly, .108 * belly, .12), (.99, .168 * sw, .118, .12), (1.055, .185 * sw, .108, .075)):
        _merge(bm, _sphere((0, 0, z * s), (rx * s * bulk, ry * s * bulk, rz * s)))
    _capsule(bm, J['neck'][0] - Vector((0, 0, .03)), J['neck'][1], .052 * s, .05 * s)
    for side in 'LR':
        ua, fa, hd = J['upperarm.' + side], J['forearm.' + side], J['hand.' + side]
        _merge(bm, _sphere(ua[0], .07 * s * bulk))   # shoulder ball
        _capsule(bm, ua[0], ua[1], .064 * s * bulk, .055 * s * bulk)
        _capsule(bm, fa[0], fa[1], .055 * s * bulk, .043 * s)
        hc = (hd[0] + hd[1]) / 2
        sx = 1 if side == 'L' else -1
        _merge(bm, _sphere(hc + Vector((0, 0, -.005)) * s, (.05 * s, .046 * s, .056 * s)))                 # fist
        _capsule(bm, hc + Vector((sx * .005, -.04, -.03)) * s, hc + Vector((sx * .005, -.04, .025)) * s, .026 * s, .026 * s, 8)   # knuckles
        _merge(bm, _sphere(hc + Vector((-sx * .03, -.032, .018)) * s, (.02 * s, .024 * s, .03 * s)))     # thumb
        th, sh, ft = J['thigh.' + side], J['shin.' + side], J['foot.' + side]
        _capsule(bm, th[0] + Vector((0, 0, .03)) * s, th[1], .082 * s * bulk, .062 * s * bulk)
        _capsule(bm, sh[0], sh[1], .06 * s * bulk, .045 * s)
        _merge(bm, _sphere((ft[0] + ft[1]) / 2 + Vector((0, 0, -.01)) * s, (.06 * s, .115 * s, .05 * s)))
    return _remesh(bm, 'body', 0.011 * s, smooth=8)      # faceted later, after covered skin is removed

# ------------------------------------------------------------------ head & face
def head_mesh(b, J):
    s = b.get('height', 1.0); hr = .168 * s * b.get('head_scale', 1.0); hz = 1.18 * s + hr * .98
    jaw = b.get('jaw', 1.0); ns = b.get('nose', 1.0)
    hs = b.get('head_shape', (.96, 1.0, 1.03))
    bm = _sphere((0, 0, hz), (hr * hs[0], hr * hs[1], hr * hs[2]), 32, 24)
    if b.get('chin'):   # narrower lower face with a soft chin, so the face reads less like a ball
        _merge(bm, _sphere((0, -hr * .3, hz - hr * .5), (hr * .55 * jaw, hr * .55, hr * .5)))
        _merge(bm, _sphere((0, -hr * .52, hz - hr * .72), (hr * .3, hr * .3, hr * .26)))
    else:
        _merge(bm, _sphere((0, -hr * .25, hz - hr * .48), (hr * .62 * jaw, hr * .62, hr * .52)))      # jaw / cheeks
    if ns: _capsule(bm, Vector((0, -hr * .86, hz + hr * .02)), Vector((0, -hr * (.86 + .22 * ns), hz - hr * .16)), hr * .1 * ns, hr * .13 * ns, 8)   # nose
    for x in (1, -1):
        _merge(bm, _sphere((x * hr * .95, .01, hz - hr * .05), (hr * .12, hr * .2, hr * .27)))     # ears
    return _facet(_remesh(bm, 'head', 0.006 * s, smooth=5, smooth_factor=0.5), FACET['head']), hz, hr

def face(b, hz, hr, parts):
    """Eyes, highlights, brows, mouth, cheeks. Big oval eyes read from the 45 deg camera."""
    eye = ink('f_eye', '#1a1310', hatch=False, speckle=0)
    hi = ink('f_hi', '#fff8e8', hatch=False, speckle=0, emit=('#ffffff', 0.4))
    brow = ink('f_brow', b.get('brow', '#3a2516'), hatch=False, speckle=0)
    cheek = ink('f_cheek', '#e08a72', hatch=False, speckle=0)
    mouth = ink('f_mouth', '#5a2a1e', hatch=False, speckle=0)
    es = b.get('eye_size', 1.0) * 1.2; ey = hz + hr * b.get('eye_y', .12); ex = hr * b.get('eye_x', .34)
    for x in (1, -1):
        e = _sphere((x * ex, -hr * .9, ey), (hr * .09 * es, hr * .08, hr * .16 * es), 10, 6)
        parts.append(('eye', _obj(e, 'eye', eye)))
        h = _sphere((x * ex + hr * .035, -hr * .985, ey + hr * .07), hr * .035, 8, 6)
        parts.append(('hi', _obj(h, 'hi', hi)))
        bb = bmesh.new(); bmesh.ops.create_cube(bb, size=1)
        bmesh.ops.scale(bb, vec=Vector((hr * .34, hr * .08, hr * .085)), verts=bb.verts)
        bmesh.ops.rotate(bb, cent=Vector(), matrix=Matrix.Rotation(x * D(b.get('brow_tilt', 8)), 3, 'Y'), verts=bb.verts)
        bmesh.ops.translate(bb, vec=Vector((x * ex, -hr * .93, ey + hr * .29)), verts=bb.verts)
        parts.append(('brow', _obj(bb, 'brow', brow)))
        if b.get('cheeks', False):
            c = _sphere((x * hr * .52, -hr * .78, hz - hr * .25), (hr * .13, hr * .05, hr * .08), 10, 6)
            parts.append(('cheek', _obj(c, 'cheek', cheek)))
    if b.get('smile'):   # small curved mouth: a bent capsule sitting on the face
        mb = bmesh.new()
        pts = [Vector((x * hr * .19, -hr * (.94 - .04 * abs(x)), hz - hr * b.get('mouth_y', .4) + hr * .08 * x * x)) for x in (-1, -.5, 0, .5, 1)]
        for a_, b_ in zip(pts, pts[1:]): _capsule(mb, a_, b_, hr * .036, hr * .036, 6)
        parts.append(('mouth', _obj(mb, 'mouth', mouth)))
    else:
        m = _sphere((0, -hr * .9, hz - hr * b.get('mouth_y', .5)), (hr * .16, hr * .05, hr * .035), 12, 6)
        parts.append(('mouth', _obj(m, 'mouth', mouth)))
    if b.get('beard'):
        bd = _sphere((0, -hr * .45, hz - hr * .62), (hr * .7, hr * .58, hr * .44), 20, 12)
        _merge(bd, _sphere((0, -hr * .78, hz - hr * .78), (hr * .4, hr * .3, hr * .3), 12, 8))
        o = _remesh(bd, 'beard', .006, smooth=2); _facet(o, FACET['beard'])
        o.data.materials.append(ink('f_beard' + b['beard'], b['beard'], hatch=False))
        parts.append(('beard', o))

def _obj(bm, name, mat):
    me = bpy.data.meshes.new(name); bm.to_mesh(me); bm.free(); o = _link(me, name); o.data.materials.append(mat)
    for p in o.data.polygons: p.use_smooth = True
    return o

# ------------------------------------------------------------------ hair
def hair(style, colour, hz, hr, parts, seed=1):
    """Closed hair volumes are fused first, then the face opening is cut out."""
    if style in (None, 'none'): return
    R = random.Random(seed)
    cap = {'tousled': (1.04, 1.03, 1.0), 'swoop': (1.04, 1.04, 1.0)}.get(style, (1.07, 1.08, 1.02))
    bm = _sphere((0, hr * .06, hz + hr * .12), tuple(c * hr for c in cap), 24, 16)
    if style in ('messy', 'spiky'):
        n = 11 if style == 'messy' else 13
        for i in range(n):
            a = R.uniform(0, 2 * math.pi); el = R.uniform(.35, 1.25)
            dirv = Vector((math.cos(a) * math.cos(el), math.sin(a) * math.cos(el) + .15, math.sin(el))).normalized()
            base = Vector((0, hr * .08, hz + hr * .14)) + dirv * hr * .85
            tip = base + (dirv + Vector((0, 0, -.2 if style == 'messy' else .2))).normalized() * hr * R.uniform(.32, .55)
            _capsule(bm, base, tip * 1.0 + (tip - base) * .6, hr * R.uniform(.24, .32), hr * .03, 6)
    if style == 'swept':   # shaped clumps sweeping back and out, plus a fringe (Look E)
        for i in range(10):
            a = D(-150 + i * 33) + R.uniform(-.15, .15)          # around the head, back half denser
            dirv = Vector((math.cos(a), math.sin(a) * .8 + .35, R.uniform(.35, .75))).normalized()
            base = Vector((0, hr * .1, hz + hr * .2)) + dirv * hr * .75
            tip = base + (dirv + Vector((0, .5, -.35))).normalized() * hr * R.uniform(.4, .55)
            _capsule(bm, base, tip, hr * R.uniform(.3, .36), hr * .13, 6)
        for x in (-.45, -.1, .3):                                  # fringe falling forward over the brow
            base = Vector((x * hr, -hr * .55, hz + hr * .85))
            _capsule(bm, base, base + Vector((x * hr * .5 - hr * .1, -hr * .35, -hr * .25)), hr * .24, hr * .1, 6)
    def chain(pts, r0, r1):   # a curved lock: capsules along a path, tapering
        n = len(pts) - 1
        for i in range(n):
            _capsule(bm, Vector(pts[i]), Vector(pts[i + 1]), r0 + (r1 - r0) * i / n, r0 + (r1 - r0) * (i + 1) / n, 8)
    def curve(a, m, e, k=6):   # quadratic curve through a control point
        a, m, e = Vector(a), Vector(m), Vector(e)
        return [a * (1 - t) ** 2 + m * 2 * t * (1 - t) + e * t * t for t in (j / k for j in range(k + 1))]
    if style == 'swoop':   # storybook: smooth cap, side part, fringe sweeping across the brow in a few big locks
        px = hr * .38                                                   # parting on the character's left
        for i, (sx, ex, ez) in enumerate(((0, -.7, .52), (.22, -.3, .42), (.42, .12, .47), (.6, .52, .6))):
            st = (px - hr * sx, -hr * .2, hz + hr * 1.0)
            mid = (st[0] - hr * .25, -hr * .95, hz + hr * .88)
            en = (ex * hr - hr * .12, -hr * 1.0, hz + hr * ez)
            chain(curve(st, mid, en), hr * .2, hr * .05)
        for x in (1, -1):                                               # soft tufts over the ears, tucked down and back
            chain(curve((x * hr * .7, -hr * .25, hz + hr * .6), (x * hr * .98, -hr * .2, hz + hr * .3), (x * hr * .9, hr * .05, hz + hr * .02), 4), hr * .2, hr * .08)
        for x in (-.45, 0, .45):                                        # nape locks curling under
            chain(curve((x * hr, hr * .6, hz + hr * .5), (x * hr * 1.1, hr * 1.02, hz + hr * .05), (x * hr * 1.05, hr * .85, hz - hr * .3), 5), hr * .24, hr * .1)
        chain(curve((hr * .15, hr * .2, hz + hr * 1.0), (hr * .2, hr * .4, hz + hr * 1.18), (hr * .05, hr * .55, hz + hr * 1.22), 4), hr * .12, hr * .04)   # cowlick
    if style == 'tousled':   # one solid cap with a few chunky locks over the brow and at the crown
        for x in (-.55, -.18, .2, .55):   # fringe stops above the brows so the eyes stay clear
            base = Vector((x * hr, -hr * .5, hz + hr * .86))
            _capsule(bm, base, base + Vector((x * hr * .25, -hr * .42, -hr * (.24 - .06 * abs(x)))), hr * .22, hr * .09, 8)
        for a in (-.8, 0, .8):            # a few short crown locks, close to the head
            base = Vector((math.sin(a) * hr * .45, hr * .25, hz + hr * .9))
            _capsule(bm, base, base + Vector((math.sin(a) * hr * .18, hr * .22, hr * .08)), hr * .2, hr * .08, 8)
        for x in (1, -1):   # sideburn locks
            _capsule(bm, Vector((x * hr * .82, -hr * .2, hz + hr * .4)), Vector((x * hr * .9, -hr * .25, hz - hr * .05)), hr * .16, hr * .08, 8)
    if style == 'bun':
        _merge(bm, _sphere((0, hr * .75, hz + hr * .6), hr * .42, 16, 10))
    if style == 'ponytail':
        _capsule(bm, Vector((0, hr * .95, hz + hr * .3)), Vector((0, hr * 1.25, hz - hr * .5)), hr * .2, hr * .08, 10)
    if style == 'short':
        for i in range(10):
            a = R.uniform(-1.3, 1.3)
            base = Vector((math.sin(a) * hr * .62, -hr * .5, hz + hr * .82))
            _capsule(bm, base, base + Vector((math.sin(a) * hr * .2, -hr * .3, -hr * .1)), hr * .13, hr * .03, 8)
    o = _remesh(bm, 'hair', 0.008, smooth=3, smooth_factor=0.5)
    # cut the face: front below the hairline, and everything below the nape
    fb = bmesh.new(); fb.from_mesh(o.data)
    def gone(c):
        if c.y < -hr * .25 and c.z < hz + hr * .55 - (abs(c.x) / hr) * .3 and not (c.y < -hr * .9 and c.z > hz + hr * .3): return True
        if c.z < hz - hr * (.35 if c.y < hr * .3 else .62): return True
        if abs(c.x) > hr * .9 and c.z < hz + hr * .05 and c.y < hr * .2: return True   # keep ears clear
        return False
    bmesh.ops.delete(fb, geom=[v for v in fb.verts if gone(v.co)], context='VERTS')
    fb.to_mesh(o.data); fb.free(); _facet(o, FACET['hair'])
    so = o.modifiers.new('t', 'SOLIDIFY'); so.thickness = .006
    o.data.materials.append(ink('hair' + colour, colour, hatch=False, speckle=.08))
    parts.append(('hair', o))

# ------------------------------------------------------------------ garments cut from the body
COVERS = []   # keep() rules of every garment on the survivor being built: the body under them is removed

def hide_covered(body, dom, rings=2):
    """Delete body skin that clothing covers (keeping a small overlap under the edges), then facet what is left."""
    bm = bmesh.new(); bm.from_mesh(body.data); bm.verts.ensure_lookup_table()
    covered = [any(k(dom[v.index], v.co) for k in COVERS) for v in bm.verts]
    show = [not c for c in covered]
    for _ in range(rings):   # grow the visible skin a little under garment edges
        grow = list(show)
        for e in bm.edges:
            a, b = e.verts[0].index, e.verts[1].index
            if show[a] or show[b]: grow[a] = grow[b] = True
        show = grow
    bmesh.ops.delete(bm, geom=[v for v in bm.verts if not show[v.index]], context='VERTS')
    bm.to_mesh(body.data); bm.free(); body.data.update()
    return _facet(body, FACET['body'] * 2.2)

def garment(body, dom, keep, offset, name, mat, thicken=.006):
    """Copy the body, keep only vertices whose dominant bone/height pass keep(bone, co), push out along normals."""
    COVERS.append(keep)
    bm = bmesh.new(); bm.from_mesh(body.data); bm.verts.ensure_lookup_table(); bm.normal_update()
    drop = [v for v in bm.verts if not keep(dom[v.index], v.co)]
    for v in bm.verts: v.co += v.normal * offset
    bmesh.ops.delete(bm, geom=drop, context='VERTS')
    # remove tiny islands left by the cut
    o = _obj(bm, name, mat); _facet(o, FACET['garment'])
    if thicken:
        so = o.modifiers.new('t', 'SOLIDIFY'); so.thickness = thicken; so.offset = 1
    return o

# ------------------------------------------------------------------ rigid pieces
def box(c, size, mat, rot=(0, 0, 0), bevel=.012, name='box'):
    bm = bmesh.new(); bmesh.ops.create_cube(bm, size=1)
    bmesh.ops.scale(bm, vec=Vector(size), verts=bm.verts)
    bmesh.ops.rotate(bm, cent=Vector(), matrix=Matrix.Rotation(rot[0], 3, 'X') @ Matrix.Rotation(rot[1], 3, 'Y') @ Matrix.Rotation(rot[2], 3, 'Z'), verts=bm.verts)
    bmesh.ops.translate(bm, vec=Vector(c), verts=bm.verts)
    o = _obj(bm, name, mat)
    for p in o.data.polygons: p.use_smooth = False
    if bevel:
        b = o.modifiers.new('b', 'BEVEL'); b.width = bevel; b.segments = 2
    return o

def tube(p0, p1, r0, r1, mat, seg=12, name='tube'):
    bm = bmesh.new(); _capsule(bm, p0, p1, r0, r1, seg); return _obj(bm, name, mat)

def ellip(c, r, mat, name='ell', seg=16):
    return _obj(_sphere(c, r, seg, max(6, seg // 2)), name, mat)

def ring(c, r, h, mat, thick=.01, axis=None, name='ring', seg=24):
    """A flat band around c (radius r) — belts, armbands, hat bands."""
    bm = bmesh.new(); bmesh.ops.create_cone(bm, cap_ends=False, segments=seg, radius1=r, radius2=r, depth=h)
    if axis is not None:
        q = Vector(axis).to_track_quat('Z', 'Y'); bmesh.ops.rotate(bm, cent=Vector(), matrix=q.to_matrix(), verts=bm.verts)
    bmesh.ops.translate(bm, vec=Vector(c), verts=bm.verts)
    o = _obj(bm, name, mat); so = o.modifiers.new('t', 'SOLIDIFY'); so.thickness = thick; return o

def ragged_disc(c, rx, ry, mat, tilt=0, name='brim', seed=2):
    R = random.Random(seed)
    bm = bmesh.new(); bmesh.ops.create_circle(bm, cap_ends=True, segments=32, radius=1)
    for i, v in enumerate(bm.verts):
        k = 1 + (.08 if i % 2 else -.03) + R.uniform(-.04, .04); v.co.x *= k * rx; v.co.y *= k * ry
    bmesh.ops.rotate(bm, cent=Vector(), matrix=Matrix.Rotation(tilt, 3, 'X'), verts=bm.verts)
    bmesh.ops.translate(bm, vec=Vector(c), verts=bm.verts)
    o = _obj(bm, name, mat); so = o.modifiers.new('t', 'SOLIDIFY'); so.thickness = .018; return o

# ------------------------------------------------------------------ binding
def dominant(body, J):
    """Weights by distance to bone segments (smooth falloff), plus the dominant bone per vertex."""
    segs = {k: (J[k][0], J[k][1]) for k in BODY_BONES}
    W, dom = [], []
    for v in body.data.vertices:
        p = v.co; ds = []
        for k, (a, b) in segs.items():
            pt, t = intersect_point_line(p, a, b); t = max(0, min(1, t)); q = a + (b - a) * t
            ds.append(((p - q).length, k))
        ds.sort(); best = ds[:3]
        ws = [(1 / max(d, .004) ** 5, k) for d, k in best]; tot = sum(w for w, _ in ws)
        W.append([(k, w / tot) for w, k in ws]); dom.append(best[0][1])
    return W, dom

def bind_weights(obj, J, rigid=None, body=None, bodyW=None):
    """Bind a mesh to the skeleton: one bone (rigid), the body's weights (same vertices), or by distance."""
    for g in list(obj.vertex_groups): obj.vertex_groups.remove(g)
    groups = {}
    def g(k):
        if k not in groups: groups[k] = obj.vertex_groups.new(name=k)
        return groups[k]
    if rigid:
        g(rigid).add(list(range(len(obj.data.vertices))), 1.0, 'REPLACE'); return
    segs = {k: (J[k][0], J[k][1]) for k in BODY_BONES}
    for v in obj.data.vertices:
        p = v.co; ds = []
        for k, (a, b) in segs.items():
            pt, t = intersect_point_line(p, a, b); t = max(0, min(1, t)); ds.append(((p - (a + (b - a) * t)).length, k))
        ds.sort(); best = ds[:3]; ws = [(1 / max(d, .004) ** 5, k) for d, k in best]; tot = sum(w for w, _ in ws)
        for w, k in ws: g(k).add([v.index], w / tot, 'REPLACE')

def armature(J, name, origin, facing):
    arm = bpy.data.armatures.new(name); ao = _link(arm, name); ao.show_in_front = True
    bpy.context.view_layer.objects.active = ao; ao.select_set(True)
    bpy.ops.object.mode_set(mode='EDIT')
    eb = {}
    for k, (h, t, p) in J.items():
        b = arm.edit_bones.new(k); b.head = h; b.tail = t; b.align_roll(Vector((0, -1, 0)))
        eb[k] = b
    for k, (h, t, p) in J.items():
        if p: eb[k].parent = eb[p]; eb[k].use_connect = False
    bpy.ops.object.mode_set(mode='OBJECT')
    ao.location = origin; ao.rotation_euler = (0, 0, D(facing))
    for pb in ao.pose.bones: pb.rotation_mode = 'XYZ'
    return ao

def attach(obj, ao):
    obj.parent = ao
    m = obj.modifiers.new('arm', 'ARMATURE'); m.object = ao
    # keep any solidify/bevel after the armature so thickness follows the pose
    for mod in list(obj.modifiers):
        if mod.type in ('SOLIDIFY', 'BEVEL'):
            name, typ = mod.name, mod.type; props = {}
            if typ == 'SOLIDIFY': props = dict(thickness=mod.thickness, offset=mod.offset)
            if typ == 'BEVEL': props = dict(width=mod.width, segments=mod.segments)
            obj.modifiers.remove(mod); nm = obj.modifiers.new(name, typ)
            for a, v in props.items(): setattr(nm, a, v)

# ------------------------------------------------------------------ build a whole survivor
def build(prof, origin=(0, 0, 0), facing=90, tag='s'):
    import wardrobe
    from professions import TEMPLATES
    b = dict(TEMPLATES[prof['body'].get('template', 'average')]); b.update(prof['body']); J = joints(b)
    COVERS.clear()
    saved = dict(FACET)
    if b.get('smooth'): FACET.update({k: 0 for k in FACET})
    try:
        return _build(prof, b, J, origin, facing, tag)
    finally:
        FACET.update(saved)

def _build(prof, b, J, origin, facing, tag):
    import wardrobe
    body = body_mesh(b, J); body.name = tag + '_body'
    W, dom = dominant(body, J)
    import inkstyle as _ik
    body.data.materials.append(ink(tag + 'skin' + b['skin'], b['skin'], shadow=_ik.shade_of(b['skin'], k=.84, hue_shift=-.012, sat=.95), hatch=False, speckle=.05))
    parts = [('body', body)]
    head, hz, hr = head_mesh(b, J); head.data.materials.append(body.data.materials[0]); parts.append(('head', head))
    face(b, hz, hr, parts)
    hair(prof.get('hair'), prof.get('hair_colour', '#6a4a2a'), hz, hr, parts, seed=prof.get('seed', 1))
    ctx = dict(J=J, body=body, dom=dom, hz=hz, hr=hr, s=b.get('height', 1.0), parts=parts, prof=prof)
    for item in prof.get('wear', []):
        kind, opts = (item, {}) if isinstance(item, str) else (item[0], item[1])
        getattr(wardrobe, kind)(ctx, **opts)
    hide_covered(body, dom)
    # Look E proportions: shorter legs. Squash everything below the hips, shift the rest down.
    # Proportions: legs squashed below the hip, torso between hip and neck; head and neck top only shift.
    # With arm_scale the arms are scaled as a whole about the shoulder, so hands keep their shape.
    S = b.get('height', 1.0); lf = b.get('legs', .84); tf = b.get('torso', 1.0); af = b.get('arm_scale')
    hip, neck = .66 * S, 1.10 * S
    def f(z):
        if z < hip: return z * lf
        if z < neck: return hip * lf + (z - hip) * tf
        return hip * lf + (neck - hip) * tf + (z - neck)
    def core(co): return Vector((co.x, co.y, f(co.z)))
    ARM = [k for k in J if k.split('.')[0] in ('upperarm', 'forearm', 'hand')]
    def arm_map(co, side):
        P = J['upperarm.' + side][0]; Pn = core(P)
        ax = (J['hand.' + side][1] - P).normalized(); d = co - P; along = ax * d.dot(ax)
        a = Pn + along * af + (d - along) * max(af, b.get('arm_thick', .85))   # shorter, but not thinner
        w = max(0.0, min(1.0, ((co - P).length - .04 * S) / (.09 * S)))
        return core(co).lerp(a, w)
    def near_arm(co):
        best, bk = 9, None
        for k, (h, t, _) in J.items():
            pt, u = intersect_point_line(co, h, t); u = max(0, min(1, u)); d = (co - (h + (t - h) * u)).length
            if d < best: best, bk = d, k
        return bk.split('.')[1] if bk in ARM else None
    for role, o in parts:
        bone = o.get('bone')
        for v in o.data.vertices:
            side = None
            if af:
                if bone: side = bone.split('.')[1] if bone in ARM else None
                elif role not in ('head', 'eye', 'hi', 'brow', 'cheek', 'mouth', 'beard', 'hair', 'hat'): side = near_arm(v.co)
            v.co = arm_map(v.co, side) if side else core(v.co)
        o.data.update()
    def mp(k, p): return arm_map(p, k.split('.')[1]) if (af and k in ARM) else core(p)
    J = {k: (mp(k, h), mp(k, t), p) for k, (h, t, p) in J.items()}
    ao = armature(J, tag + '_rig', origin, facing)
    # bind: body/garments by distance, head pieces rigid to the head bone, others as declared
    for role, o in parts:
        rigid = 'head' if role in ('head', 'eye', 'hi', 'brow', 'cheek', 'mouth', 'beard', 'hair', 'hat') else None
        rigid = o.get('bone', rigid)
        bind_weights(o, J, rigid=rigid)
        attach(o, ao)
    return dict(arm=ao, parts=parts, J=J, head_up=b.get('head_up', 0))

# ------------------------------------------------------------------ posing
SIGN = {}   # filled by calibration: per bone, +1/-1 so that 'forward' swings mean the same thing everywhere

def pose(rig, p):
    ao = rig['arm']
    for pb in ao.pose.bones:
        x, y, z = p.get(pb.name, (0, 0, 0))
        if pb.name == 'head': x -= rig.get('head_up', 0)   # big heads tip back a little so the face meets the camera
        sg = SIGN.get(pb.name, 1)
        pb.rotation_euler = (D(x) * sg, D(y), D(z) * sg)
    ao.pose.bones['pelvis'].location = (0, 0, 0)
    bob = p.get('bob', 0)
    ao.pose.bones['pelvis'].location = (0, bob, 0)   # bone-local Y points up along the pelvis bone

def idle(t):
    w = math.sin(2 * math.pi * t)
    return {'chest': (1.2 * w, 0, 0), 'neck': (-2 * w, 0, 0), 'head': (-12, 0, 3 * math.sin(2 * math.pi * t + 1)),
            'upperarm.L': (3, 0, -5), 'upperarm.R': (3, 0, 5), 'forearm.L': (20, 0, 0), 'forearm.R': (20, 0, 0),
            'thigh.L': (7, 0, 0), 'thigh.R': (5, 0, 0), 'shin.L': (-13, 0, 0), 'shin.R': (-10, 0, 0), 'foot.L': (6, 0, 0), 'foot.R': (5, 0, 0),
            'bob': -.012 - .004 * (1 - w) / 2}   # soft knees so the legs never lock straight

def walk(t):
    ph = 2 * math.pi * t; sn, cs = math.sin(ph), math.cos(ph); p = {}
    for n, sg in (('L', 1), ('R', -1)):
        th = 28 * sg * sn; kn = 12 + 50 * max(0.0, sg * cs) ** 1.4
        p['thigh.' + n] = (th, 0, 0)                 # + = forward
        p['shin.' + n] = (-kn, 0, 0)                 # - = knee bends (foot goes back)
        p['foot.' + n] = (-(th - kn) * .35 + kn * .45, 0, 0)
        p['upperarm.' + n] = (-24 * sg * sn, 0, 0)
        p['forearm.' + n] = (26 + 20 * max(0.0, -sg * sn), 0, 0)
    p['bob'] = .016 * math.cos(2 * ph) - .02
    # twist about the spine (bone-local Y), never a sideways tilt: hips stay level, body stays upright
    p['pelvis'] = (0, 6 * sn, 0); p['chest'] = (4, -9 * sn, 0); p['head'] = (-12, 4 * sn, 0)
    return p
