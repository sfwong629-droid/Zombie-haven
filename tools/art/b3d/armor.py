"""Equipment test: plate armour for the AI-3D survivors, built in Blender from the model's own shape and riding on the
shared skeleton, so every animation (and every hand-made Action) works with it unchanged.

  build(ao, body)  -> list of armour objects, each bone-parented (metal is rigid: no skin weights needed)
  python3 armor.py preview RIG.blend OUT.png        # quick look: idle front/back with and without armour

Pieces: breastplate + backplate with a gorget collar (chest bone), belt and fauld band (pelvis), pauldrons (upper
arms), bracers (forearms), tassets (thighs). Sizes come from slices of the body mesh, so it fits other models too.
"""
import bpy, bmesh, math, os, sys
import numpy as np
from mathutils import Vector, Matrix
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

D = math.radians
STEEL, TRIM, LEATHER = '#8f9aa6', '#b08a45', '#6b4326'

def metal_mat(name, hexc, bands=(.55, .95, 1.4), cut=(.2, .8)):
    """Toon metal: shadow / body / a bright highlight band so it reads as polished plate at sprite size."""
    m = bpy.data.materials.new(name); m.use_nodes = True; N, L = m.node_tree.nodes, m.node_tree.links
    for n in list(N): N.remove(n)
    c = [(int(hexc[i:i + 2], 16) / 255) ** 2.2 for i in (1, 3, 5)]
    out = N.new('ShaderNodeOutputMaterial'); em = N.new('ShaderNodeEmission')
    # fixed key light from the camera's upper left (world space): the scene sun sits behind the character,
    # which suits the painted body texture but would leave plain metal in flat shadow
    geo = N.new('ShaderNodeNewGeometry'); dot = N.new('ShaderNodeVectorMath'); dot.operation = 'DOT_PRODUCT'
    k = (Vector((.612, -.612, .5)) + Vector((-.707, -.707, 0)) * .55 + Vector((0, 0, .55))).normalized()
    dot.inputs[1].default_value = k
    ramp = N.new('ShaderNodeValToRGB'); ramp.color_ramp.interpolation = 'CONSTANT'; el = ramp.color_ramp.elements
    el[0].position = 0; el[0].color = (*[x * bands[0] for x in c], 1)
    el[1].position = cut[0]; el[1].color = (*[min(1, x * bands[1]) for x in c], 1)
    e = el.new(cut[1]); e.color = (*[min(1, x * bands[2]) for x in c], 1)
    L.new(geo.outputs['Normal'], dot.inputs[0]); L.new(dot.outputs['Value'], ramp.inputs[0])
    L.new(ramp.outputs['Color'], em.inputs['Color']); L.new(em.outputs[0], out.inputs['Surface'])
    return m

def _obj(bm, name, mat, smooth=True):
    me = bpy.data.meshes.new(name); bm.to_mesh(me); bm.free()
    o = bpy.data.objects.new(name, me); bpy.context.scene.collection.objects.link(o)
    me.materials.append(mat)
    for p in me.polygons: p.use_smooth = smooth
    return o

def _solid(o, t, offset=1):
    s = o.modifiers.new('s', 'SOLIDIFY'); s.thickness = t; s.offset = offset; s.use_even_offset = True
    return o

def loft(rings, name, mat, cap_top=False):
    """rings: list of lists of Vector (same count each), bottom to top -> a tube surface."""
    bm = bmesh.new(); V = [[bm.verts.new(p) for p in r] for r in rings]; n = len(rings[0])
    for a, b in zip(V, V[1:]):
        for i in range(n): bm.faces.new((a[i], a[(i + 1) % n], b[(i + 1) % n], b[i]))
    bmesh.ops.recalc_face_normals(bm, faces=bm.faces)
    return _obj(bm, name, mat)

def body_slices(body, groups):
    names = [g.name for g in body.vertex_groups]
    co = np.array([(body.matrix_world @ v.co)[:] for v in body.data.vertices])
    dom = np.array([names[max(v.groups, key=lambda g: g.weight).group] if len(v.groups) else '' for v in body.data.vertices])
    return co, dom

def superellipse(cx, cy, a, yf, yb, z, n=2.6, seg=40, ridge=0.0):
    """Ring at height z: half-width a, front at yf (negative y = front), back at yb. ridge pushes the centre front out."""
    pts = []
    for i in range(seg):
        t = 2 * math.pi * i / seg; c, s = math.cos(t), math.sin(t)
        x = a * math.copysign(abs(c) ** (2 / n), c)
        r = yf if s < 0 else yb
        y = r * abs(s) ** (2 / n)
        if s < 0 and ridge: y -= ridge * max(0, 1 - abs(x) / (a * .55)) ** 2
        pts.append(Vector((cx + x, cy + y, z)))
    return pts

def bone_parent(ao, ob, bone):
    mw = ob.matrix_world.copy(); ob.parent = ao; ob.parent_type = 'BONE'; ob.parent_bone = bone
    bpy.context.view_layer.update(); ob.matrix_world = mw

def dome(center, axis, r, h, mat, name, seg=20, cut=0.0):
    """Half-ellipsoid shell: base circle radius r around center, height h along axis (cut < 0 keeps a bit below)."""
    bm = bmesh.new(); rings = []
    q = Vector(axis).normalized().to_track_quat('Z', 'Y').to_matrix()
    for k in range(7):
        ph = (math.pi / 2) * (k / 6) * (1 - cut) + cut * 0
        ph = -cut * math.pi / 2 + (math.pi / 2 + cut * math.pi / 2) * k / 6
        rr, zz = r * math.cos(ph), h * math.sin(ph)
        ring = [bm.verts.new(Vector(center) + q @ Vector((rr * math.cos(2 * math.pi * i / seg), rr * math.sin(2 * math.pi * i / seg), zz))) for i in range(seg)]
        rings.append(ring)
    for a, b in zip(rings, rings[1:]):
        for i in range(seg): bm.faces.new((a[i], a[(i + 1) % seg], b[(i + 1) % seg], b[i]))
    bmesh.ops.remove_doubles(bm, verts=bm.verts, dist=1e-5)
    bmesh.ops.recalc_face_normals(bm, faces=bm.faces)
    return _obj(bm, name, mat)

def band(center, axis, r0, r1, length, mat, name, seg=24):
    """Open cone section along axis (bracers, lames)."""
    bm = bmesh.new(); q = Vector(axis).normalized().to_track_quat('Z', 'Y').to_matrix()
    rs = [[bm.verts.new(Vector(center) + q @ Vector((r * math.cos(2 * math.pi * i / seg), r * math.sin(2 * math.pi * i / seg), z))) for i in range(seg)]
          for r, z in ((r0, -length / 2), ((r0 + r1) / 2 * 1.04, 0), (r1, length / 2))]
    for a, b in zip(rs, rs[1:]):
        for i in range(seg): bm.faces.new((a[i], a[(i + 1) % seg], b[(i + 1) % seg], b[i]))
    bmesh.ops.recalc_face_normals(bm, faces=bm.faces)
    return _obj(bm, name, mat)

def arc_plate(center, axis, front, r, a0, a1, length, mat, name, seg=12, flare=1.12):
    """Curved plate: part of a cylinder (angles a0..a1 measured from 'front') along axis; wider at the bottom."""
    bm = bmesh.new(); ax = Vector(axis).normalized(); fr = (Vector(front) - ax * Vector(front).dot(ax)).normalized(); sd = ax.cross(fr)
    rows = []
    for k, (z, rr) in enumerate(((0, r), (-length * .5, r * (1 + (flare - 1) * .5)), (-length, r * flare))):
        rows.append([bm.verts.new(Vector(center) + ax * z + (fr * math.cos(a) + sd * math.sin(a)) * rr)
                     for a in np.linspace(a0, a1, seg)])
    for a, b in zip(rows, rows[1:]):
        for i in range(seg - 1): bm.faces.new((a[i], a[i + 1], b[i + 1], b[i]))
    bmesh.ops.recalc_face_normals(bm, faces=bm.faces)
    return _obj(bm, name, mat)

def build(ao, body):
    for pb in ao.pose.bones: pb.rotation_euler = (0, 0, 0); pb.location = (0, 0, 0)
    ao.rotation_euler = (0, 0, 0); bpy.context.view_layer.update()
    steel = metal_mat('a_steel', STEEL); trim = metal_mat('a_trim', TRIM, bands=(.5, .9, 1.25)); leather = metal_mat('a_leather', LEATHER, bands=(.6, 1.0, 1.08))
    co, dom = body_slices(body, None)
    torso = np.isin(dom, ['chest', 'pelvis', 'neck'])
    def sl(z, pad):
        s = co[torso & (np.abs(co[:, 2] - z) < .008)]
        return (max(-s[:, 0].min(), s[:, 0].max()) + pad, s[:, 1].min() - pad, s[:, 1].max() + pad)
    B = lambda n: ao.matrix_world @ ao.data.bones[n].head_local
    T = lambda n: ao.matrix_world @ ao.data.bones[n].tail_local
    chest0, neck0 = B('chest').z, B('neck').z
    out = []
    # ---- cuirass (breast + back plate as one shell), chest bone
    zs = np.linspace(chest0 - .005, neck0 - .015, 9)
    raw = [sl(z, .024) for z in zs]
    a = np.array([r[0] for r in raw])
    a = np.convolve(np.pad(a, 1, mode='edge'), [1 / 3] * 3, 'valid')
    yf = np.convolve(np.pad([r[1] for r in raw], 1, mode='edge'), [1 / 3] * 3, 'valid')
    yb = np.convolve(np.pad([r[2] for r in raw], 1, mode='edge'), [1 / 3] * 3, 'valid')
    rings = []
    for i, z in enumerate(zs):
        u = i / (len(zs) - 1)
        aa = a[i] * (1.03 if u < .2 else 1.0) * (1 - .18 * max(0, u - .7) / .3)      # flares at the waist, rounds in at the top
        rings.append(superellipse(0, 0, aa, yf[i] - .006 * math.sin(math.pi * u), yb[i], z, ridge=.014 * math.sin(math.pi * min(1, u * 1.2))))
    cu = _solid(loft(rings, 'armor_cuirass', steel), .012, 1); out.append((cu, 'chest'))
    # trims: bottom rim and a raised gorget collar
    bot = [p + Vector((0, 0, 0)) for p in rings[0]]
    rim = loft([[Vector((p.x * 1.05, p.y * 1.05, p.z - .012)) for p in rings[0]], [Vector((p.x * 1.05, p.y * 1.05, p.z + .016)) for p in rings[0]]], 'armor_rim', trim)
    out.append((_solid(rim, .01, 1), 'chest'))
    top = rings[-1]; nz = top[0].z
    col = loft([[Vector((p.x * 1.02, p.y * 1.02, nz - .008)) for p in top], [Vector((p.x * .86, p.y * .86, nz + .03)) for p in top]], 'armor_gorget', trim)
    out.append((_solid(col, .01, 1), 'neck'))
    # ---- belt (leather) + fauld band (steel), pelvis
    zb = chest0 - .02; ab, fb, bb = sl(zb, .02)
    belt = loft([superellipse(0, 0, ab, fb, bb, zb - .016), superellipse(0, 0, ab, fb, bb, zb + .016)], 'armor_belt', leather)
    out.append((_solid(belt, .01, 1), 'pelvis'))
    zf = zb - .045; af, ff, bf = sl(zf, .028)
    fauld = loft([superellipse(0, 0, af * 1.06, ff * 1.06, bf * 1.04, zf - .03), superellipse(0, 0, af, ff, bf, zf + .028)], 'armor_fauld', steel)
    out.append((_solid(fauld, .01, 1), 'pelvis'))
    # ---- pauldrons, upper arms
    for side, sg in (('L', 1), ('R', -1)):
        h = B('upperarm.' + side); e = T('upperarm.' + side); arm = (e - h).normalized()
        upout = (Vector((sg * .55, 0, 1)) - arm * Vector((sg * .55, 0, 1)).dot(arm)).normalized()
        c = h + upout * .012 + Vector((sg * .012, 0, 0))
        pd = _solid(dome(c, upout, .076, .056, steel, 'armor_pauldron_' + side, cut=.25), .01, 1); out.append((pd, 'upperarm.' + side))
        lame = band(c - upout * .024 + arm * .026, upout, .082, .073, .024, trim, 'armor_lame_' + side)
        out.append((_solid(lame, .008, 1), 'upperarm.' + side))
        # bracer on the forearm
        fh, ft = B('forearm.' + side), T('forearm.' + side); fax = (ft - fh)
        fv = co[dom == 'forearm.' + side]
        dist = [((Vector(p) - fh) - fax.normalized() * (Vector(p) - fh).dot(fax.normalized())).length for p in fv]
        r = float(np.percentile(dist, 55)) + .006
        br = band(fh.lerp(ft, .6), fax, r * 1.08, r * .96, fax.length * .55, steel, 'armor_bracer_' + side)
        out.append((_solid(br, .006, 1), 'forearm.' + side))
        cuff = band(fh.lerp(ft, .32), fax, r * 1.14, r * 1.12, fax.length * .12, trim, 'armor_cuff_' + side)
        out.append((_solid(cuff, .006, 1), 'forearm.' + side))
        # tasset over the front-outer thigh
        th, tt = B('thigh.' + side), T('thigh.' + side); tax = (tt - th)
        tv = co[dom == 'thigh.' + side]
        dist = [((Vector(p) - th) - tax.normalized() * (Vector(p) - th).dot(tax.normalized())).length for p in tv]
        r = float(np.percentile(dist, 80)) + .02
        ts = arc_plate(th + tax * .05, -tax, Vector((sg * .5, -1, 0)), r, -1.0, 1.0, tax.length * .45, steel, 'armor_tasset_' + side)
        out.append((_solid(ts, .01, 1), 'thigh.' + side))
    objs = []
    for ob, bone in out:
        bone_parent(ao, ob, bone); objs.append(ob)
    return objs

if __name__ == '__main__':
    a = sys.argv[1:]
    if a[0] == 'preview':
        import ai_render, anims
        ao, body = ai_render.load(a[1]); ai_render.toonify(body)
        cam = ai_render.setup_scene(px=300, tilt=60); cam.data.ortho_scale = 150 / (128 / 1.3)
        look = Vector((0, 0, -1)); look.rotate(cam.rotation_euler); cam.location = Vector((0, 0, .58)) - look * 20
        S = bpy.context.scene; S.eevee.taa_render_samples = 8
        from PIL import Image
        shots = []
        objs = []
        for withA in (False, True):
            if withA: objs = build(ao, body)
            for clip, t in (('idle', 0), ('swing_a', .38), ('walk', .25)):
                for view in ('se', 'sw', 'ne'):
                    ai_render.face(ao, view); ai_render.apply_pose(ao, anims.CLIPS[clip][0](t)); bpy.context.view_layer.update()
                    fn = os.path.abspath(f'{a[2][:-4]}_{int(withA)}_{clip}_{view}.png'); S.render.filepath = fn
                    bpy.ops.render.render(write_still=True); shots.append(fn)
        ims = [Image.open(f) for f in shots]; W = ims[0].width
        sheet = Image.new('RGBA', (W * 9, W * 2), (200, 186, 150, 255))
        for i, im in enumerate(ims): sheet.paste(im, ((i % 9) * W, (i // 9) * W), im)
        sheet.save(a[2]); print('saved', a[2])
