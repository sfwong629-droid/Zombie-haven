# alpha_blade.py -- OUT.glb OUT_TEX.png : the Alpha's big rusted blade (owner, 23 Nov: the Alpha is the second zombie allowed a weapon).
# Made in code: a broad, heavy machete-cleaver, chipped along the edge, rust in patches and pits, the edge worn bright, two rivets,
# old dark stains near the tip; a guard of bent iron; the grip wrapped in dirty cloth strips; a round iron pommel.
# One texture (1024 x 1024): blade face top half, the grip wrap below it, iron bottom strip. Run: python3 alpha_blade.py -- OUT.glb OUT.png
# Axes: the blade lies along +X from the guard (x = 0); the grip runs along -X; +Y the spine, -Y the edge; Z its flat thickness.
import bpy, bmesh, sys, math, random
import numpy as np
from PIL import Image, ImageFilter
from mathutils import Vector
a = sys.argv[sys.argv.index('--') + 1:]; OUT, TEX = a[0], a[1]
rng = np.random.default_rng(7); random.seed(7)
N = 1024
def noise(scale, oct_=5, seed=0):
    g = np.random.default_rng(seed); out = np.zeros((N, N), np.float32); amp = 1.; tot = 0.
    for o in range(oct_):
        s = max(2, int(scale * 2 ** o)); r = g.random((s, s)).astype(np.float32)
        im = Image.fromarray((r * 255).astype(np.uint8)).resize((N, N), Image.BICUBIC)
        out += amp * np.asarray(im, np.float32) / 255; tot += amp; amp *= .5
    return out / tot
def mix(a_, b_, t): return a_ * (1 - t[..., None]) + b_ * t[..., None]
img = np.zeros((N, N, 3), np.float32)
yy, xx = np.mgrid[0:N, 0:N].astype(np.float32); U = xx / N; V = 1 - yy / N      # V up, like the UVs
# --- blade face: v .5..1 (v .5 = the edge, v 1 = the spine) ---
steel = np.array([.50, .51, .50]); dark = np.array([.25, .24, .23]); rust1 = np.array([.47, .22, .09]); rust2 = np.array([.62, .33, .13]); rust3 = np.array([.30, .14, .07])
n1 = noise(4, 6, 1); n2 = noise(16, 4, 2); n3 = noise(48, 3, 3)
bl = steel + (n2[..., None] - .5) * .18
bl = mix(bl, dark, np.clip((n3 - .45) * 2, 0, 1) * .5)                                  # grime
rust = np.clip((n1 - .45) * 4.5 + (n2 - .5) * 1.8, 0, 1)                               # patches
bl = mix(bl, mix(rust1, rust2, n3), rust * .92)
bl = mix(bl, rust3, np.clip((n3 - .7) * 4, 0, 1) * rust)                               # deep rust inside the patches
vb = (V - .5) * 2                                                                       # 0 at the edge, 1 at the spine
bl = mix(bl, dark * .9, np.clip((vb - .85) * 6, 0, 1) * .6)                            # dark along the spine
edge = np.clip(1 - vb / .16, 0, 1) ** .7 * (.7 + .3 * n2)                                   # the edge worn bright by use
bl = mix(bl, np.array([.84, .84, .82]), edge * (1 - rust * .45))
bl = mix(bl, np.array([.40, .40, .40]), np.clip(1 - abs(vb - .17) / .015, 0, 1) * .6)   # the line where the edge bevel starts
scr = np.zeros((N, N), np.float32); im = Image.fromarray((scr * 255).astype(np.uint8)); from PIL import ImageDraw
d = ImageDraw.Draw(im)
for _ in range(260):                                                                    # fine scratches, mostly along the blade
    x0 = rng.uniform(0, N); y0 = rng.uniform(0, N * .5); l = rng.uniform(20, 140); an = rng.normal(0, .25)
    d.line([(x0, y0), (x0 + l * math.cos(an), y0 + l * math.sin(an))], fill=int(rng.uniform(60, 160)), width=1)
scr = np.asarray(im, np.float32) / 255
bl = mix(bl, np.array([.78, .76, .72]), scr * .55)
pit = np.zeros((N, N), np.float32); im = Image.fromarray(pit.astype(np.uint8)); d = ImageDraw.Draw(im)
for _ in range(1400):                                                                   # pits, only where it has rusted
    x0 = rng.uniform(0, N); y0 = rng.uniform(0, N * .5); r = rng.uniform(.8, 3.)
    if rust[int(y0), int(x0) % N] < .35: continue
    d.ellipse([x0 - r, y0 - r, x0 + r, y0 + r], fill=255)
pit = np.asarray(im.filter(ImageFilter.GaussianBlur(.8)), np.float32) / 255
bl = mix(bl, rust3 * .7, pit * .8)
st = np.clip((noise(6, 4, 9) - .6) * 5, 0, 1) * np.clip((U - .62) * 5, 0, 1) * np.clip(1 - vb * 1.2, 0, 1)   # old dark stains near the tip
bl = mix(bl, np.array([.22, .05, .04]), st * .75)
for cx in (.08, .19):                                                                   # two rivets near the guard
    rr = np.hypot((U - cx) * N, (V - .86) * N); ring = np.clip(1 - rr / 15, 0, 1)
    bl = mix(bl, np.array([.18, .16, .15]), np.clip(1 - rr / 9, 0, 1)); bl = mix(bl, np.array([.62, .58, .52]), np.clip(1 - abs(rr - 11) / 2.5, 0, 1) * .7)
img = np.where((V >= .5)[..., None], bl, img)
# --- grip wrap: v .2..5 (u round the grip, v along it) ---
cl = np.array([.55, .45, .32]); cld = np.array([.24, .18, .12])
band = ((V - .2) / .3 * 9 + U * 1.0) % 1                                                # 9 diagonal turns of the strip
wrap = mix(cl + (noise(40, 3, 5)[..., None] - .5) * .2, cld, np.clip((band - .82) * 8, 0, 1) + np.clip((.08 - band) * 12, 0, 1))
wrap = mix(wrap, cld, np.clip((noise(8, 4, 6) - .5) * 2.5, 0, 1) * .7)                 # dirt and old blood soaked in
wrap = mix(wrap, np.array([.30, .08, .05]), np.clip((noise(5, 3, 11) - .62) * 4, 0, 1) * .6)
fib = (np.sin(U * 900 + V * 60) * .5 + .5) * .06; wrap = wrap - fib[..., None]
img = np.where(((V >= .2) & (V < .5))[..., None], wrap, img)
# --- iron (guard and pommel): v 0..2 ---
ir = np.array([.20, .19, .18]) + (noise(20, 4, 8)[..., None] - .5) * .12
ir = mix(ir, mix(rust1, rust3, noise(30, 3, 12)), np.clip((noise(6, 5, 13) - .45) * 3, 0, 1) * .8)
img = np.where((V < .2)[..., None], ir, img)
Image.fromarray((np.clip(img, 0, 1) * 255).astype(np.uint8)).save(TEX)

# ---------------- the mesh ----------------
bpy.ops.wm.read_factory_settings(use_empty=True)
LB, SP, W0, W1 = .64, .040, .085, .150          # blade length; spine height; edge depth at the guard and at the belly
TH = (.017, .011, .002)                          # thickness at the spine, the middle, the edge
CHIPS = [(.15, .010, .014), (.29, .016, .020), (.37, .007, .010), (.47, .013, .016)]   # (x, depth, width) notches in the edge
def spine_y(x):                                   # straight, then it drops towards the tip (a clipped point)
    k = max(0., (x - .44) / (LB - .44)); return SP - .085 * k ** 1.5
def edge_y(x):                                    # deepens to a belly near the front, then sweeps up to meet the spine in a point
    t = x / LB; e = -(W0 + (W1 - W0) * math.sin(math.pi * .5 * min(1., t / .78)) ** 1.4)
    k = max(0., (x - .50) / (LB - .50)); e = e + (spine_y(LB) - .003 - e) * k ** 1.8
    for cx, dp, wd in CHIPS: e += dp * max(0., 1 - abs(x - cx) / (wd / 2))
    return e
bm = bmesh.new(); uvl = bm.loops.layers.uv.new('UVMap')
NC = 64; cols = []; FR = []
for i in range(NC + 1):
    x = LB * i / NC; ys = spine_y(x); ye = edge_y(x); k = max(0., (x - .50) / (LB - .50))
    ym = ys + (ye - ys) * .55
    tz = 1 - .6 * k                                # thinner towards the tip
    pts = [(x, ys, TH[0] * tz), (x, ym, TH[1] * tz), (x, ye, TH[2] * tz), (x, ym, -TH[1] * tz), (x, ys, -TH[0] * tz)]
    cols.append([bm.verts.new(p) for p in pts]); FR.append((1., .45, 0., .45, 1.))
UVI = {}
def uvb(v): return UVI[v]
for i, c in enumerate(cols):
    for j, v in enumerate(c): UVI[v] = (c[0].co.x / LB * .98 + .01, .505 + .49 * FR[i][j])   # v: .5 the edge, 1 the spine, on both faces
for i in range(NC):
    for j in range(4):
        f = bm.faces.new((cols[i][j], cols[i + 1][j], cols[i + 1][j + 1], cols[i][j + 1]))
        for l in f.loops: l[uvl].uv = uvb(l.vert)
    f = bm.faces.new((cols[i][4], cols[i + 1][4], cols[i + 1][0], cols[i][0]))            # the spine's flat top
    for l in f.loops: l[uvl].uv = uvb(l.vert)
for c, rev in ((cols[0], True), (cols[-1], False)):                                       # caps
    vs = c[::-1] if rev else c; f = bm.faces.new(vs)
    for l in f.loops: l[uvl].uv = uvb(l.vert)
def ring_tube(x0, x1, rad, nseg, nl, v0, v1, ridge=0.):
    rings = []
    for i in range(nl + 1):
        t = i / nl; x = x0 + (x1 - x0) * t; r = rad(t) * (1 + ridge * (abs(math.sin(t * math.pi * 9)) ** .5 - .7))
        rings.append([bm.verts.new((x, -.035 + r * math.cos(2 * math.pi * s / nseg) * 1.15, r * math.sin(2 * math.pi * s / nseg))) for s in range(nseg)])
    for i in range(nl):
        for s in range(nseg):
            s2 = (s + 1) % nseg; f = bm.faces.new((rings[i][s], rings[i][s2], rings[i + 1][s2], rings[i + 1][s]))
            for l, (ii, ss) in zip(f.loops, ((i, s), (i, s + 1), (i + 1, s + 1), (i + 1, s))): l[uvl].uv = (ss / nseg, v0 + (v1 - v0) * ii / nl)
    for rr, rev in ((rings[0], True), (rings[-1], False)):
        f = bm.faces.new(rr[::-1] if rev else rr)
        for l in f.loops: l[uvl].uv = (.5, (v0 + v1) / 2)
ring_tube(-.005, -.235, lambda t: .021, 12, 36, .21, .49, ridge=.12)                    # the wrapped grip, ridged by the turns
ring_tube(-.235, -.275, lambda t: .030 * math.sin(math.pi * (.15 + .7 * t)), 10, 6, .02, .18)   # the round pommel
def box(c, s, v0, v1):
    vs = [bm.verts.new((c[0] + sx * s[0], c[1] + sy * s[1], c[2] + sz * s[2])) for sx in (-1, 1) for sy in (-1, 1) for sz in (-1, 1)]
    for q in ((0, 1, 3, 2), (4, 6, 7, 5), (0, 4, 5, 1), (2, 3, 7, 6), (0, 2, 6, 4), (1, 5, 7, 3)):
        f = bm.faces.new([vs[k] for k in q])
        for l, uv in zip(f.loops, ((.1, v0), (.9, v0), (.9, v1), (.1, v1))): l[uvl].uv = uv
box((-.007, -.045, 0), (.007, .085, .016), .02, .18)                                    # the guard, a short iron bar
box((-.016, -.128, .0), (.012, .008, .014), .02, .18)                                   # its end bent back towards the hand
bmesh.ops.recalc_face_normals(bm, faces=bm.faces[:])
me = bpy.data.meshes.new('alpha_blade'); bm.to_mesh(me); bm.free()
for p in me.polygons: p.use_smooth = True
ob = bpy.data.objects.new('weapon_alpha_blade', me); bpy.context.scene.collection.objects.link(ob)
mat = bpy.data.materials.new('alpha_blade'); mat.use_nodes = True; nt = mat.node_tree; bsdf = nt.nodes['Principled BSDF']
ti = nt.nodes.new('ShaderNodeTexImage'); ti.image = bpy.data.images.load(TEX); nt.links.new(ti.outputs['Color'], bsdf.inputs['Base Color'])
bsdf.inputs['Metallic'].default_value = .35; bsdf.inputs['Roughness'].default_value = .75; me.materials.append(mat)
bpy.ops.export_scene.gltf(filepath=OUT, export_format='GLB', use_selection=False)
print('BLADE', len(me.vertices), 'verts', len(me.polygons), 'faces ->', OUT)
