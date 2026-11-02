"""Face pieces for the AI-3D survivors: the painted dot eyes are covered by separate eye pieces that ride on the head
bone, so eyes can be restyled (and later swapped for expressions) without touching the model.

  apply(ao, body)  -> list of objects. Finds the painted eyes by casting rays at the face and reading the texture,
                      then adds an oval eye (taller than wide, a little bigger than the painted one so it covers it)
                      with a white highlight on the same side in both eyes.
  python3 face.py preview RIG.blend OUT.png
Call before toonify (it reads the original texture) and before any weapon/armour is built (rest pose).
"""
import bpy, bmesh, math, os, sys
import numpy as np
from mathutils import Vector, Matrix
from mathutils.bvhtree import BVHTree
from mathutils.geometry import barycentric_transform
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

EYE_W, EYE_H = 1.15, 1.38          # new eye size relative to the painted eye
HIGHLIGHT = (-.32, .36, .30)        # highlight centre (x, y as a fraction of the eye half-size; screen left/up), radius vs eye width

def _flat(name, hexc):
    m = bpy.data.materials.new(name); m.use_nodes = True; N, L = m.node_tree.nodes, m.node_tree.links
    for n in list(N): N.remove(n)
    out = N.new('ShaderNodeOutputMaterial'); em = N.new('ShaderNodeEmission')
    em.inputs['Color'].default_value = (*[(int(hexc[i:i + 2], 16) / 255) ** 2.2 for i in (1, 3, 5)], 1)
    L.new(em.outputs[0], out.inputs['Surface']); return m

def _texture(body):
    for m in body.data.materials:
        for n in m.node_tree.nodes:
            if n.type == 'TEX_IMAGE' and 'normal' not in n.image.name and 'metal' not in n.image.name:
                im = n.image; w, h = im.size
                buf = np.empty(w * h * 4, np.float32); im.pixels.foreach_get(buf)
                return buf.reshape(h, w, 4)[..., :3]

def locate(body, step=.0025):
    """Rays from the front (-Y) over the upper face: returns [(centre, normal, half_w, half_h)] for the two eyes."""
    tex = _texture(body); H, W = tex.shape[:2]
    bm = bmesh.new(); bm.from_mesh(body.data); bm.transform(body.matrix_world)
    bmesh.ops.triangulate(bm, faces=bm.faces); bm.faces.ensure_lookup_table()
    uv = bm.loops.layers.uv.active
    bvh = BVHTree.FromBMesh(bm)
    co = np.array([v.co[:] for v in body.data.vertices]); co = (np.array(body.matrix_world)[:3, :3] @ co.T).T + np.array(body.matrix_world)[:3, 3]
    top = co[:, 2].max(); head_lo = top * .55
    hits = []
    for z in np.arange(head_lo, top, step):
        for x in np.arange(-.2, .2, step):
            loc, nrm, idx, d = bvh.ray_cast(Vector((x, -2, z)), Vector((0, 1, 0)))
            if loc is None or nrm.y > -.35: continue          # only surfaces facing the camera-front
            f = bm.faces[idx]; ls = f.loops
            u = barycentric_transform(loc, ls[0].vert.co, ls[1].vert.co, ls[2].vert.co,
                                      ls[0][uv].uv.to_3d(), ls[1][uv].uv.to_3d(), ls[2][uv].uv.to_3d())
            px = tex[min(H - 1, int(u.y * H)), min(W - 1, int(u.x * W))]
            lum = .2126 * px[0] + .7152 * px[1] + .0722 * px[2]
            hits.append((x, z, loc.copy(), nrm.copy(), lum))
    bm.free()
    # grid image of the face: dark blobs completely surrounded by skin are the painted eyes (hair touches no skin ring)
    from scipy import ndimage
    xs_ = np.arange(-.2, .2, step); zs_ = np.arange(head_lo, top, step)
    G = np.full((len(zs_), len(xs_)), -1.0); idx = {}
    for h in hits:
        i, j = int(round((h[1] - head_lo) / step)), int(round((h[0] + .2) / step))
        if 0 <= i < G.shape[0] and 0 <= j < G.shape[1]: G[i, j] = h[4]; idx[(i, j)] = h
    dark = (G >= 0) & (G < .13); skin = G > .55
    lab, n = ndimage.label(dark)
    cands = []
    for k in range(1, n + 1):
        m = lab == k; ii, jj = np.nonzero(m)
        hgt, wid = (ii.max() - ii.min() + 1) * step, (jj.max() - jj.min() + 1) * step
        if not (.02 < wid < .09 and .02 < hgt < .11): continue
        ring = ndimage.binary_dilation(m, iterations=3) & ~m
        frac = skin[ring].mean()
        if frac < .8: continue                      # touches hair or the background
        cx = (xs_[jj.min()] + xs_[jj.max()]) / 2; cz = (zs_[ii.min()] + zs_[ii.max()]) / 2
        cands.append((m.sum(), cx, cz, wid / 2, hgt / 2, list(zip(ii, jj))))
    eyes = []
    for sg in (-1, 1):
        side = [c for c in cands if c[1] * sg > .03]
        if not side: raise RuntimeError('no painted eye found on side %d' % sg)
        _, cx, cz, hw, hh, cells = max(side)
        P = [idx[c] for c in cells if c in idx]
        c = min(P, key=lambda p: (p[0] - cx) ** 2 + (p[1] - cz) ** 2)
        nrm = sum((p[3] for p in P), Vector()).normalized()
        eyes.append((c[2], nrm, hw, hh))
        print('eye', sg, 'centre', tuple(round(v, 3) for v in c[2]), 'size', round(hw * 2, 3), round(hh * 2, 3), 'cells', len(P), flush=True)
    return eyes

def _oval(name, mat, rx, ry, seg=32):
    bm = bmesh.new(); vs = [bm.verts.new((rx * math.cos(2 * math.pi * i / seg), ry * math.sin(2 * math.pi * i / seg), 0)) for i in range(seg)]
    bm.faces.new(vs); me = bpy.data.meshes.new(name); bm.to_mesh(me); bm.free()
    o = bpy.data.objects.new(name, me); bpy.context.scene.collection.objects.link(o); me.materials.append(mat)
    return o

def apply(ao, body, eye_w=EYE_W, eye_h=EYE_H):
    for pb in ao.pose.bones: pb.rotation_euler = (0, 0, 0); pb.location = (0, 0, 0)
    ao.rotation_euler = (0, 0, 0); bpy.context.view_layer.update()
    black, white = _flat('f_eye', '#1d1514'), _flat('f_shine', '#ffffff')
    objs = []
    for i, (c, n, hw, hh) in enumerate(locate(body)):
        up = Vector((0, 0, 1)); xa = up.cross(n).normalized(); ya = n.cross(xa).normalized()   # xa = screen left->right as seen from the front
        R = Matrix((xa, ya, n)).transposed().to_4x4()
        rx, ry = hw * eye_w, max(hh * eye_h, hw * eye_w * 1.12)
        e = _oval(f'face_eye_{i}', black, rx, ry); e.matrix_world = Matrix.Translation(c + n * .004) @ R
        hx, hy, hr = HIGHLIGHT
        s = _oval(f'face_shine_{i}', white, rx * hr, rx * hr, seg=20)
        s.matrix_world = Matrix.Translation(c + n * .0055 + xa * (hx * rx) + ya * (hy * ry)) @ R
        objs += [e, s]
    import armor
    for o in objs: armor.bone_parent(ao, o, 'head')
    return objs

if __name__ == '__main__':
    a = sys.argv[1:]
    if a[0] == 'preview':
        import ai_render, anims
        ao, body = ai_render.load(a[1]); ai_render.TEX_PX = 1024
        apply(ao, body); ai_render.toonify(body)
        cam = ai_render.setup_scene(px=300, tilt=60); cam.data.ortho_scale = .7
        look = Vector((0, 0, -1)); look.rotate(cam.rotation_euler); cam.location = Vector((0, 0, .8)) - look * 20
        S = bpy.context.scene; S.eevee.taa_render_samples = 8
        from PIL import Image
        shots = []
        for view in ('se', 'sw', 'ne'):
            ai_render.face(ao, view); ai_render.apply_pose(ao, anims.idle(0)); bpy.context.view_layer.update()
            fn = os.path.abspath(f'{a[2][:-4]}_{view}.png'); S.render.filepath = fn; bpy.ops.render.render(write_still=True); shots.append(fn)
        ims = [Image.open(f) for f in shots]; sheet = Image.new('RGBA', (900, 300), (200, 186, 150, 255))
        for i, im in enumerate(ims): sheet.paste(im, (i * 300, 0), im)
        sheet.save(a[2]); print('saved', a[2])
