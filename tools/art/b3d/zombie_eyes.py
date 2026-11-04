"""Blank white zombie eyes on the reskinned v2 survivor textures (like the Gemini zombie designs).

  python3 zombie_eyes.py MODEL.glb BASE_TEX.webp SKIN_0.webp [SKIN_1.webp ...]

Finds the eye faces on the model (dark faces on the front of the head at eye height, below the brows), paints
their UV area clouded white with a dark rim, and darkens a small socket around them, on every skin given."""
import bpy, sys, numpy as np
from PIL import Image, ImageDraw, ImageFilter
glb, base, skins = sys.argv[1], sys.argv[2], sys.argv[3:]
bpy.ops.wm.read_factory_settings(use_empty=True); bpy.ops.import_scene.gltf(filepath=glb)
o = max((o for o in bpy.data.objects if o.type == 'MESH'), key=lambda o: len(o.data.polygons))
me = o.data; uv = me.uv_layers.active.data; mw = o.matrix_world; R = mw.to_3x3()
im = np.asarray(Image.open(base).convert('RGB')).astype(int); H, W, _ = im.shape
ztop = max((mw @ v.co).z for v in me.vertices)
def px(p):
    u = np.mean([uv[l].uv[0] for l in p.loop_indices]); v = np.mean([uv[l].uv[1] for l in p.loop_indices])
    return im[min(H - 1, int((1 - v) * H)), min(W - 1, int(u * W))]
front = [p for p in me.polygons if (R @ p.normal).normalized().y < -.3 and ztop - .3 < (mw @ p.center).z]
eye = [p for p in front if ztop - .175 < (mw @ p.center).z < ztop - .13 and abs((mw @ p.center).x) < .08 and px(p).mean() < 80]
cs = np.array([(mw @ p.center)[:] for p in eye])
L, Rr = cs[cs[:, 0] < cs[:, 0].mean()], cs[cs[:, 0] >= cs[:, 0].mean()]
cen = [L.mean(0), Rr.mean(0)]; print('eye faces', len(eye), 'centres', [tuple(np.round(c, 3)) for c in cen])
# per-pixel 3D position map of the head front (barycentric fill of each face's UV triangles), so the eyes are drawn
# as smooth ellipses in 3D however the UV islands are cut
P = np.full((H, W, 3), np.nan)
for p in front:
    L3 = [mw @ me.vertices[me.loops[l].vertex_index].co for l in p.loop_indices]
    T2 = [(uv[l].uv[0] * W, (1 - uv[l].uv[1]) * H) for l in p.loop_indices]
    for i in range(1, len(T2) - 1):
        (x0, y0), (x1, y1), (x2, y2) = T2[0], T2[i], T2[i + 1]; q0, q1, q2 = np.array(L3[0]), np.array(L3[i]), np.array(L3[i + 1])
        xa, xb = int(max(0, np.floor(min(x0, x1, x2)) - 1)), int(min(W - 1, np.ceil(max(x0, x1, x2)) + 1))
        ya, yb = int(max(0, np.floor(min(y0, y1, y2)) - 1)), int(min(H - 1, np.ceil(max(y0, y1, y2)) + 1))
        if xb < xa or yb < ya: continue
        X, Y = np.meshgrid(np.arange(xa, xb + 1) + .5, np.arange(ya, yb + 1) + .5)
        den = (y1 - y2) * (x0 - x2) + (x2 - x1) * (y0 - y2)
        if abs(den) < 1e-9: continue
        w0 = ((y1 - y2) * (X - x2) + (x2 - x1) * (Y - y2)) / den; w1 = ((y2 - y0) * (X - x2) + (x0 - x2) * (Y - y2)) / den; w2 = 1 - w0 - w1
        ins = (w0 >= -.02) & (w1 >= -.02) & (w2 >= -.02)
        pos = w0[..., None] * q0 + w1[..., None] * q1 + w2[..., None] * q2
        sub = P[ya:yb + 1, xa:xb + 1]; sub[ins] = pos[ins]
def ell(rx, rz):
    m = np.zeros((H, W), bool)
    for e in cen:
        m |= (((P[..., 0] - e[0]) / rx) ** 2 + ((P[..., 2] - e[2]) / rz) ** 2) < 1
    return m
wm, rm, sm = ell(.017, .013), ell(.021, .017), ell(.03, .025)
print('px white', wm.sum(), 'rim', rm.sum(), 'socket', sm.sum())
for s in skins:
    a = np.asarray(Image.open(s).convert('RGB')).astype(float)
    a[sm & ~rm] *= .62                                   # sunken, shadowed socket
    a[rm & ~wm] = [44, 34, 30]                           # dark rim
    a[wm] = [232, 232, 220]                              # clouded white, no pupil
    Image.fromarray(np.clip(a, 0, 255).astype(np.uint8)).save(s, quality=90); print('painted', s)
