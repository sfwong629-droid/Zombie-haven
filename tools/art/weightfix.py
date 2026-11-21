# weightfix.py IN.glb OUT.glb : skin points that follow a hand but belong to a leg (owner, 21 Nov, the Lasher: "part of the gray pant is stick to the arm").
# A point counts as stuck when at least 0.2 of its weight is on the forearm, hand or fingers while, in the rest pose, it lies less than half as far from a
# leg bone as from any arm bone. Stuck points, and the points touching them that also carry arm weight, take the weights of the nearest point that has none.
# Plain glTF edit (uncompressed file), no Blender. Prints how many points were changed.
import sys, json, struct, numpy as np
src, out = sys.argv[1:3]
b = open(src, 'rb').read(); n = struct.unpack('<I', b[12:16])[0]; j = json.loads(b[20:20 + n]); bl = struct.unpack('<I', b[20 + n:24 + n])[0]; binb = bytearray(b[28 + n:28 + n + bl])
N = j['nodes']; par = {c: i for i, x in enumerate(N) for c in x.get('children', [])}
def local(x):
    if 'matrix' in x: return np.array(x['matrix'], float).reshape(4, 4).T
    t = np.array(x.get('translation', [0, 0, 0]), float); q = np.array(x.get('rotation', [0, 0, 0, 1]), float); s = np.array(x.get('scale', [1, 1, 1]), float)
    X, Y, Z, W = q; R = np.array([[1 - 2 * (Y * Y + Z * Z), 2 * (X * Y - Z * W), 2 * (X * Z + Y * W)], [2 * (X * Y + Z * W), 1 - 2 * (X * X + Z * Z), 2 * (Y * Z - X * W)], [2 * (X * Z - Y * W), 2 * (Y * Z + X * W), 1 - 2 * (X * X + Y * Y)]])
    M = np.eye(4); M[:3, :3] = R * s; M[:3, 3] = t; return M
def world(i): return (world(par[i]) if i in par else np.eye(4)) @ local(N[i])
mn = next(i for i, x in enumerate(N) if 'mesh' in x and 'skin' in x); sk = j['skins'][N[mn]['skin']]; J = sk['joints']; names = [N[i]['name'] for i in J]; pos = {N[i]['name']: world(i)[:3, 3] for i in J}
ARM = ('forearm', 'hand', 'finger', 'thumb'); ARMALL = ('upperarm',) + ARM; LEG = ('thigh', 'shin', 'foot', 'pelvis')
seg = lambda pre: [(pos[N[i]['name']], pos[N[c]['name']]) for i in J for c in N[i].get('children', []) if c in J and N[i]['name'].startswith(pre)] + [(pos[N[i]['name']], pos[N[i]['name']]) for i in J if N[i]['name'].startswith(pre)]
def dist(P, S):
    d = np.full(len(P), 1e9)
    for a, c in S:
        v = c - a; L = v @ v; t = np.clip(((P - a) @ v) / L, 0, 1) if L > 1e-12 else np.zeros(len(P)); d = np.minimum(d, np.linalg.norm(P - (a + np.outer(t, v)), axis=1))
    return d
CT = {5126: 'f4', 5123: 'u2', 5121: 'u1'}
def acc(ai):
    a = j['accessors'][ai]; v = j['bufferViews'][a['bufferView']]; nc = {'VEC3': 3, 'VEC4': 4, 'SCALAR': 1}[a['type']]; ct = CT[a['componentType']]; st = v.get('byteStride', np.dtype(ct).itemsize * nc); o = v.get('byteOffset', 0) + a.get('byteOffset', 0)
    return np.array([np.frombuffer(binb, ct, nc, o + i * st) for i in range(a['count'])]), o, st, ct, a
total = 0; Mw = world(mn)
for pr in j['meshes'][N[mn]['mesh']]['primitives']:
    P, *_ = acc(pr['attributes']['POSITION']); P = P.astype(float) @ Mw[:3, :3].T + Mw[:3, 3]; JJ, jo, js, jc, _ = acc(pr['attributes']['JOINTS_0']); WW, wo, ws, wc, wa = acc(pr['attributes']['WEIGHTS_0'])
    Wf = WW.astype(float) / ({'u1': 255, 'u2': 65535}.get(wc, 1)); isarm = np.array([nm.startswith(ARM) for nm in names]); isarmall = np.array([nm.startswith(ARMALL) for nm in names])
    aw = (Wf * isarm[JJ]).sum(1); awall = (Wf * isarmall[JJ]).sum(1); da = dist(P, seg(ARMALL)); dl = dist(P, seg(LEG))
    stuck = (aw >= .2) & (dl < da * .5)
    if not stuck.any(): continue
    I, *_ = acc(pr['indices']); I = I.reshape(-1, 3); key = {}; rep = np.array([key.setdefault(tuple(np.round(p, 5)), k) for k, p in enumerate(P)])   # points at the same place count as one
    adj = {}
    for t in rep[I]:
        for a_ in t:
            adj.setdefault(a_, set()).update(t)
    reg = set(rep[np.where(stuck)[0]]); todo = list(reg)
    while todo:
        k = todo.pop()
        for m in adj.get(k, ()):
            if m not in reg and awall[m] > .05 and dl[m] < da[m]: reg.add(m); todo.append(m)
    sel = np.isin(rep, list(reg)); clean = np.where((awall < 1e-6) & ~sel)[0]
    for k in np.where(sel)[0]:
        m = clean[np.argmin(np.linalg.norm(P[clean] - P[k], axis=1))]
        struct.pack_into('<4' + {'u1': 'B', 'u2': 'H'}[jc], binb, jo + k * js, *map(int, JJ[m])); struct.pack_into('<4' + {'f4': 'f', 'u1': 'B', 'u2': 'H'}[wc], binb, wo + k * ws, *(WW[m].tolist()))
    total += int(sel.sum())
open(out, 'wb').write(b[:20 + n] + struct.pack('<I', len(binb)) + b'BIN\0' + bytes(binb) + b[28 + n + bl:]); print('weightfix: %d points moved from the arm to the leg -> %s' % (total, out))
