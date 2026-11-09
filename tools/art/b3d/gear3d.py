"""3D.94 Low-detail toon models for every weapon that had no model of its own (they all borrowed the bat, axe,
pistol or rifle). Built from tubes and boxes in the survivor's rest pose, in the same frames as anims.build_weapon
(melee: handle runs forward out of the right fist; guns: held at chest height, barrel forward; pistols: barrel along
the hand), exported unparented in model space. The game fits each one next to the weapon it used to borrow
(render3d.js loadGear): same bone, same grip, so every existing clip still lines up.

  python3 gear3d.py RIG.blend OUT.glb [only=knife,katana]
"""
import bpy, bmesh, sys, math, os
from mathutils import Vector
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import survivor
from anims import _join

def toon_mat(name, hexc):   # plain Principled colour so the glTF export keeps it (the game re-shades it as toon)
    m = bpy.data.materials.get(name)
    if m: return m
    m = bpy.data.materials.new(name); m.use_nodes = True; bs = m.node_tree.nodes.get('Principled BSDF')
    c = tuple((int(hexc[i:i + 2], 16) / 255) ** 2.2 for i in (1, 3, 5)); bs.inputs['Base Color'].default_value = (*c, 1); bs.inputs['Roughness'].default_value = .9
    if 'Metallic' in bs.inputs: bs.inputs['Metallic'].default_value = 0
    return m

# kind -> the weapon whose bone and grip it borrows (and so its animation class)
REF = {'axe': 'axe', 'pipe': 'bat', 'crowbar': 'bat', 'nailbat': 'bat', 'sledge': 'bat', 'spear': 'bat', 'golf': 'bat', 'shovel': 'bat', 'roadsign': 'bat', 'spiked': 'bat',
       'knife': 'axe', 'machete': 'axe', 'katana': 'axe', 'hatchet': 'axe', 'cleaver': 'axe',
       'revolver': 'pistol', 'magnum': 'pistol', 'shotgun': 'rifle', 'bow': 'rifle', 'crossbow': 'rifle', 'smg': 'ak47', 'batref': 'bat', 'rifleref': 'rifle', 'pistolref': 'pistol'}

def build(ao, kind):
    for pb in ao.pose.bones: pb.rotation_euler = (0, 0, 0); pb.location = (0, 0, 0)
    ao.rotation_euler = (0, 0, 0); bpy.context.view_layer.update()
    hb = ao.data.bones['hand.R']; a, b = ao.matrix_world @ hb.head_local, ao.matrix_world @ hb.tail_local
    g = a.lerp(b, .55); fwd = Vector((0, -1, 0)); up = (fwd + Vector((0, 0, .08))).normalized()
    side = fwd.cross(Vector((0, 0, 1))).normalized(); across = up.cross(side).normalized()
    M = lambda n, c: toon_mat('g_' + n, c)
    wood, dark, metal, steel = M('wood', '#a8703c'), M('dark', '#3b2b20'), M('metal', '#a9afb5'), M('steel', '#cfd5da')
    gun, gunwood, tape, rust, red = M('gun', '#3c3f42'), M('gunwood', '#7a4a26'), M('tape', '#d8cfb8'), M('rust', '#8e4a2c'), M('red', '#c23a2c')
    wrap, white, green, yellow, cord = M('wrap', '#262a33'), M('white', '#ece8dc'), M('green', '#3f6b45'), M('yellow', '#e0b23a'), M('cord', '#e9e2cc')
    P = []
    T = lambda p0, p1, r0, r1, m, seg=8: P.append(survivor.tube(p0, p1, r0, r1, m, seg=seg))
    def Bx(c, size, m, ax=None):   # box with its axes along (side, up, across) unless told otherwise
        o = survivor.box(Vector((0, 0, 0)), size, m, bevel=.004); X, Y, Z = ax or (side, up, across)
        from mathutils import Matrix
        R = Matrix((X, Y, Z)).transposed().to_4x4(); o.matrix_world = Matrix.Translation(c) @ R; P.append(o)
    def F(pts, o, X, Y, th, m):   # flat plate: 2D outline (x along X, y along Y) around o, th thick along X x Y
        N = X.cross(Y).normalized(); bm = bmesh.new()
        fr = [bm.verts.new(o + X * x + Y * y + N * th / 2) for x, y in pts]; bk = [bm.verts.new(o + X * x + Y * y - N * th / 2) for x, y in pts]
        bm.faces.new(fr); bm.faces.new(bk[::-1]); n = len(pts)
        for i in range(n): bm.faces.new((fr[i], bk[i], bk[(i + 1) % n], fr[(i + 1) % n]))
        bmesh.ops.recalc_face_normals(bm, faces=bm.faces); o2 = survivor._obj(bm, 'plate', m)
        for q in o2.data.polygons: q.use_smooth = False
        P.append(o2)
    forged = M('forged', '#4c4f52')
    if kind == 'axe':                                     # fire axe: yellow handle, red head, steel edge away from the body, pick behind
        T(g - up * .08, g + up * .47, .02, .019, yellow, seg=8); T(g - up * .1, g - up * .06 + across * .012, .024, .02, yellow, seg=8)
        hd = g + up * .43
        F([(-.02, .035), (.03, .03), (.115, .06), (.115, -.075), (.03, -.035), (-.02, -.035), (-.14, -.004)], hd, across, up, .026, red)
        F([(.112, .061), (.136, .066), (.136, -.082), (.112, -.076)], hd, across, up, .016, steel)
    elif kind in ('batref',):
        T(g - up * .08, g + up * .14, .028, .03, tape); T(g + up * .14, g + up * .5, .03, .052, wood, seg=12)
    elif kind == 'pipe':                                  # lead pipe with an elbow fitting at the end
        T(g - up * .08, g + up * .42, .017, .017, metal, seg=8)
        T(g + up * .42, g + up * .47 + across * .05, .024, .024, gun, seg=8); T(g - up * .02, g + up * .08, .021, .021, wrap, seg=8)
    elif kind == 'crowbar':                               # dark steel bar, flat claw bent back at the end
        T(g - up * .08, g + up * .44, .013, .013, rust, seg=6)
        h = g + up * .44; T(h, h + up * .03 - across * .07, .013, .009, rust, seg=6)
        T(g - up * .08, g - up * .12 + across * .03, .011, .007, rust, seg=6)
    elif kind == 'nailbat':                               # the bat with nails driven through the barrel
        T(g - up * .08, g + up * .14, .028, .03, tape); T(g + up * .14, g + up * .5, .03, .052, wood, seg=12)
        for i in range(10):
            t = .26 + .2 * (i % 5) / 4; an = i * 2.1; d = across * math.cos(an) + side * math.sin(an); c = g + up * t + d * .04
            T(c, c + d * .05, .004, .003, steel, seg=4)
    elif kind == 'spiked':                                # thick club with steel spikes and a band
        T(g - up * .07, g + up * .12, .03, .032, dark, seg=8); T(g + up * .12, g + up * .48, .036, .07, wood, seg=10)
        T(g + up * .3, g + up * .33, .062, .062, metal, seg=10)
        for i in range(12):
            t = .36 + .1 * (i % 3) / 2; an = i * 1.7; d = across * math.cos(an) + side * math.sin(an); c = g + up * t + d * .06
            T(c, c + d * .045, .012, .002, steel, seg=4)
    elif kind == 'sledge':                                # long handle, big block head across the end
        T(g - up * .1, g + up * .58, .016, .016, wood, seg=8); T(g - up * .1, g + up * .02, .019, .019, wrap, seg=8)
        Bx(g + up * .58, (.07, .07, .19), gun)
    elif kind == 'spear':                                 # pole with a taped-on blade
        T(g - up * .32, g + up * .62, .013, .013, wood, seg=6); T(g + up * .5, g + up * .6, .017, .017, tape, seg=6)
        T(g + up * .6, g + up * .78, .03, .002, steel, seg=4)
    elif kind == 'golf':                                  # thin steel shaft, rubber grip, club head out to the side
        T(g - up * .08, g + up * .08, .016, .014, wrap, seg=8); T(g + up * .08, g + up * .6, .009, .007, steel, seg=6)
        Bx(g + up * .6 - across * .035, (.03, .035, .085), metal)
    elif kind == 'shovel':                                # D-handle, wooden shaft, steel blade
        T(g - up * .08, g + up * .52, .015, .015, wood, seg=8); T(g - up * .1 - across * .03, g - up * .1 + across * .03, .012, .012, gun, seg=6)
        F([(-.07, -.06), (.07, -.06), (.072, .03), (.055, .075), (0, .13), (-.055, .075), (-.072, .03)], g + up * .62, across, up, .012, metal)   # pointed spade
        T(g + up * .5, g + up * .57, .02, .02, metal, seg=8)
    elif kind == 'roadsign':                              # a stop sign torn off its post
        T(g - up * .08, g + up * .6, .016, .016, metal, seg=6)
        c = g + up * .64; oc = lambda r: [(r * math.cos(math.pi / 8 + k * math.pi / 4), r * math.sin(math.pi / 8 + k * math.pi / 4)) for k in range(8)]
        F(oc(.125), c, across, up, .012, red); F(oc(.113), c, across, up, .016, white); F(oc(.103), c, across, up, .02, red)   # octagon, white rim
        GL = {'S': [(0, 4, 3, 5), (0, 2, 3, 3), (0, 0, 3, 1), (0, 2, 1, 5), (2, 0, 3, 3)], 'T': [(0, 4, 3, 5), (1, 0, 2, 5)],
              'O': [(0, 0, 3, 1), (0, 4, 3, 5), (0, 0, 1, 5), (2, 0, 3, 5)], 'P': [(0, 4, 3, 5), (0, 2, 3, 3), (0, 0, 1, 5), (2, 2, 3, 5)]}
        u = .011
        for n in (side, -side):                           # STOP in white on both faces, reading left to right
            r = up.cross(n).normalized()
            for i, ch in enumerate('STOP'):
                x0 = -.083 + i * (3 * u + .0095)
                for a0, b0, a1, b1 in GL[ch]:
                    F([(x0 + a0 * u, -.028 + b0 * u), (x0 + a1 * u, -.028 + b0 * u), (x0 + a1 * u, -.028 + b1 * u), (x0 + a0 * u, -.028 + b1 * u)], c + n * .0105, r, up, .002, white)
    elif kind == 'knife':                                 # kitchen knife: black handle, short flat blade
        T(g - up * .06, g + up * .07, .016, .014, wrap, seg=6)
        Bx(g + up * .15, (.006, .16, .03), steel); T(g + up * .23, g + up * .26, .012, .001, steel, seg=4)
    elif kind == 'machete':                               # long wide blade, slight drop at the tip
        T(g - up * .07, g + up * .08, .017, .016, wrap, seg=6)
        for t in (-.03, .04): T(g + up * t - side * .019, g + up * t + side * .019, .005, .005, metal, seg=4)   # rivets
        L0, L = .08, .44; sp, ed = [], []                 # dark forged blade, widening, gently curved, bright edge away from the body
        for i in range(9):
            uu = i / 8; t = L0 + L * uu; s0 = -.006 - .02 * uu * uu; w = .042 + .02 * uu + .006 * math.sin(math.pi * uu)
            sp.append((s0, t)); ed.append((s0 + w, t))
        ed[-1] = (ed[-1][0] - .012, ed[-1][1] - .01); tip = (sp[-1][0] + .006, L0 + L + .012)
        F(sp[::-1] + [(sp[0][0], L0 - .01), (ed[0][0], L0 - .01)] + ed + [tip], g, across, up, .005, forged)
        F([(x - .011, t) for x, t in ed[::-1]] + ed, g, across, up, .0035, steel)
    elif kind == 'katana':                                # wrapped long handle, round guard, long thin blade
        T(g - up * .15, g + up * .1, .018, .018, wrap, seg=8); T(g - up * .17, g - up * .15, .02, .02, gun, seg=8)   # wrapped grip, end cap
        for n in (side, -side):                           # the white diamonds of the wrap
            for i in range(5):
                t = -.12 + i * .05; F([(0, -.016), (.009, 0), (0, .016), (-.009, 0)], g + up * t + n * .0175, across, up, .002, white)
        T(g + up * .1, g + up * .112, .04, .04, gun, seg=12); T(g + up * .112, g + up * .135, .014, .016, tape, seg=8)   # black guard, collar
        L0, L = .13, .62; sp, ed = [], []                # long curved blade, edge away from the body, angled tip
        for i in range(11):
            uu = i / 10; t = L0 + L * uu; s0 = -.012 - .055 * uu * uu; w = .03 - .008 * uu
            sp.append((s0, t)); ed.append((s0 + w, t))
        tip = (sp[-1][0] - .004, L0 + L + .035)
        F(sp[::-1] + ed[:-1] + [(ed[-1][0] - .006, ed[-1][1] + .004), tip], g, across, up, .005, steel)
    elif kind == 'hatchet':                               # short handle, small axe head
        T(g - up * .06, g + up * .3, .015, .014, wood, seg=8)
        h = g + up * .28; Bx(h + across * .04, (.02, .06, .09), metal); T(h + across * .02, h + across * .1, .014, .03, metal, seg=4)   # edge away from the body
    elif kind == 'cleaver':                               # square heavy blade
        T(g - up * .06, g + up * .08, .015, .015, wood, seg=6)
        Bx(g + up * .19 + across * .04, (.007, .2, .11), steel)   # edge away from the body
    elif kind in ('revolver', 'magnum', 'pistolref'):     # pistol frame: barrel along the hand
        dirB = (b - a).normalized(); dirU = fwd; side2 = dirB.cross(dirU).normalized(); top = g + dirU * .038
        if kind == 'pistolref':
            T(top - dirB * .045, top + dirB * .11, .022, .022, gun, seg=4); T(g + dirU * .012 - dirB * .03, g - dirU * .055 - dirB * .045, .017, .019, gunwood, seg=4)
        else:
            L = .19 if kind == 'magnum' else .14; mt = metal if kind == 'magnum' else gun
            T(g + dirU * .012 - dirB * .03, g - dirU * .06 - dirB * .05, .017, .02, gunwood if kind == 'revolver' else wrap, seg=6)   # grip
            T(top - dirB * .04, top + dirB * .03, .025, .025, mt, seg=8)                                                              # cylinder
            T(top + dirB * .02, top + dirB * L, .011, .011, mt, seg=8); T(top + dirB * .03 + dirU * .012, top + dirB * L + dirU * .012, .005, .005, mt, seg=4)   # barrel, rib
            T(top - dirB * .05, top - dirB * .035, .012, .012, mt, seg=6)                                                              # hammer
    else:                                                 # long guns: chest-held, barrel forward
        sh = ao.matrix_world @ ao.data.bones['upperarm.R'].head_local
        g = Vector((sh.x * .55, sh.y - .2, sh.z - .1)); up = fwd; rec = g + up * .02 + Vector((0, 0, .05)); Z = Vector((0, 0, 1))
        if kind == 'rifleref':
            T(g, rec, .018, .018, gunwood, seg=6); T(rec - up * .2, rec - up * .02, .027, .032, gunwood); T(rec - up * .03, rec + up * .16, .03, .03, gun, seg=8)
            T(rec + up * .16, rec + up * .4, .011, .011, gun, seg=8)
        elif kind == 'shotgun':                           # wood stock, long double tube, pump grip
            T(g, rec, .018, .018, gunwood, seg=6); T(rec - up * .22, rec - up * .02, .026, .036, gunwood)
            T(rec - up * .03, rec + up * .12, .031, .031, gun, seg=8); T(rec + up * .1, rec + up * .44, .014, .014, gun, seg=8)
            T(rec + up * .1 - Z * .022, rec + up * .4 - Z * .022, .011, .011, gun, seg=8); T(rec + up * .2 - Z * .02, rec + up * .3 - Z * .02, .024, .024, gunwood, seg=8)
        elif kind == 'smg':                               # compact: short receiver, stubby barrel, straight mag, wire stock
            T(g, rec, .016, .016, gun, seg=6); T(rec - up * .03, rec + up * .14, .028, .028, gun, seg=6); T(rec + up * .14, rec + up * .22, .01, .01, gun, seg=6)
            T(rec + up * .05 - Z * .02, rec + up * .05 - Z * .15, .012, .012, gun, seg=4); T(rec - up * .03, rec - up * .16 - Z * .01, .006, .006, gun, seg=4)
            T(rec - up * .16 - Z * .04, rec - up * .16 + Z * .02, .008, .008, gun, seg=4)
        elif kind == 'bow':                               # recurve limbs up and down in front of the grip, a string behind
            c = rec + up * .2; T(c - Z * .05, c + Z * .05, .016, .016, wrap, seg=6)
            pts = [(-.33, .05), (-.22, .0), (-.05, -.0), (.05, .0), (.22, .0), (.33, .05)]
            for (z0, f0), (z1, f1) in zip(pts, pts[1:]):
                if abs(z0) < .06 and abs(z1) < .06: continue
                T(c + Z * z0 + up * f0, c + Z * z1 + up * f1, .012 if abs(z0) < .2 else .009, .009 if abs(z1) > .2 else .012, wood, seg=6)
            T(c + Z * .33 + up * .05, c - Z * .33 + up * .05, .002, .002, cord, seg=4)
        elif kind == 'crossbow':                          # rifle-like stock with short limbs across the front
            T(g, rec, .018, .018, gunwood, seg=6); T(rec - up * .2, rec - up * .02, .025, .03, gunwood); T(rec - up * .03, rec + up * .3, .022, .022, gunwood, seg=6)
            f = rec + up * .28; T(f - side * .2 + up * .05, f, .012, .016, gun, seg=6); T(f + side * .2 + up * .05, f, .012, .016, gun, seg=6)
            T(f - side * .2 + up * .05, rec + up * .1, .002, .002, cord, seg=4); T(f + side * .2 + up * .05, rec + up * .1, .002, .002, cord, seg=4)
            T(rec + up * .1 + Z * .028, rec + up * .34 + Z * .028, .005, .004, metal, seg=4)
    return _join(P, 'gw_' + kind)

def main(blend, out, only=None):
    bpy.ops.wm.open_mainfile(filepath=blend)
    ao = bpy.data.objects['rig']
    for o in [o for o in bpy.data.objects if o.name != 'rig']: bpy.data.objects.remove(o)
    objs = [build(ao, k) for k in REF if not only or k in only]
    bpy.ops.object.select_all(action='DESELECT')
    for o in objs: o.select_set(True); o.parent = None
    bpy.ops.export_scene.gltf(filepath=out, use_selection=True, export_format='GLB', export_apply=True, export_yup=True, export_animations=False, export_skins=False)
    print('gear', len(objs), out)

if __name__ == '__main__':
    a = sys.argv[sys.argv.index('--') + 1:] if '--' in sys.argv else sys.argv[1:]
    opt = dict(x.split('=') for x in a[2:])
    main(a[0], a[1], opt.get('only', '').split(',') if opt.get('only') else None)
