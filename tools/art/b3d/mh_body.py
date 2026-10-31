"""MakeHuman base body for the survivors (CC0 data in mh_data/).

mh_body(b) returns a game-weight body mesh with real human proportions, plus our
skeleton (the J dict the wardrobe and animations use) read from MakeHuman's game rig.

  - shape: race blend + gender + weight/muscle/proportion/height targets (body settings in b)
  - pose: MakeHuman's A-pose arms are lowered to hang at the sides (linear blend skinning
    with MakeHuman's own arm weights), so our idle/walk animations work unchanged
  - budget: the body is decimated to about b['tris'] triangles (default 3000)
  - scale: matched to our skeleton (neck base at 1.10) so every wardrobe piece still fits
"""
import gzip, json, math, os
import bpy, bmesh
from mathutils import Vector, Quaternion

DATA = os.path.join(os.path.dirname(os.path.abspath(__file__)), 'mh_data')
_cache = {}
FIELD = [None]   # (KDTree, weights) of the last body built, for skinning clothes with MakeHuman's own weights
HEAD_Y = [0.0]   # head centre front/back offset of the last body built (hair is built around y=0, then moved here)

def _obj():
    if 'obj' in _cache: return _cache['obj']
    verts, faces, cur = [], [], None
    for l in open(os.path.join(DATA, 'base.obj')):
        if l.startswith('v '):
            x, y, z = map(float, l.split()[1:4]); verts.append([x, y, z])
        elif l.startswith('g '): cur = l.split()[1]
        elif l.startswith('f '):
            faces.append((cur, [int(t.split('/')[0]) - 1 for t in l.split()[1:]]))
    _cache['obj'] = (verts, faces); return verts, faces

def _target(name):
    p = os.path.join(DATA, 'targets', name + '.target.gz')
    out = []
    for l in gzip.open(p, 'rt'):
        l = l.strip()
        if not l or l[0] == '#': continue
        i, dx, dy, dz = l.split(); out.append((int(i), float(dx), float(dy), float(dz)))
    return out

def _shape(b):
    """Base mesh vertices with MakeHuman targets applied (MakeHuman space: y up, +z front)."""
    verts, faces = _obj()
    V = [list(v) for v in verts]
    male = b.get('male', 1.0)
    def add(name, w):
        if abs(w) < 1e-4: return
        for i, dx, dy, dz in _target(name):
            V[i][0] += dx * w; V[i][1] += dy * w; V[i][2] += dz * w
    for race in ('caucasian', 'african', 'asian'):
        add(race + '-male-young', male / 3); add(race + '-female-young', (1 - male) / 3)
    w = b.get('mh_weight', 0.0)           # -1 slim .. 0 average .. +1 heavy
    add('universal-male-young-averagemuscle-' + ('minweight' if w < 0 else 'maxweight'), abs(w) * male)
    if w < 0: add('universal-female-young-averagemuscle-minweight', abs(w) * (1 - male))
    m = b.get('mh_muscle', 0.0)           # -1 .. +1
    add('universal-male-young-' + ('minmuscle' if m < 0 else 'maxmuscle') + '-averageweight', abs(m) * male)
    add('male-young-averagemuscle-averageweight-idealproportions', b.get('mh_ideal', .5) * male)
    add('female-young-averagemuscle-averageweight-idealproportions', b.get('mh_ideal', .5) * (1 - male))
    h = b.get('mh_height', 0.0)
    add('male-young-averagemuscle-averageweight-' + ('maxheight' if h > 0 else 'minheight'), abs(h))
    return V, faces

def _groups_mean(V, faces):
    acc = {}
    for g, idx in faces:
        if g and g.startswith('joint-'):
            s = acc.setdefault(g, [Vector(), 0, set()])
            for i in idx:
                if i not in s[2]: s[2].add(i); s[0] += Vector(V[i]); s[1] += 1
    return {g: s[0] / s[1] for g, s in acc.items()}

def _to_b(v, k):      # MakeHuman (y up, +z front, decimetres) -> Blender (z up, -y front)
    return Vector((v[0], -v[2], v[1])) * k

# MakeHuman game_engine bones -> our skeleton
_MAP = {'pelvis': 'pelvis', 'spine_01': 'chest', 'spine_02': 'chest', 'spine_03': 'chest', 'neck_01': 'neck', 'head': 'head'}
for s, S in (('l', 'L'), ('r', 'R')):
    _MAP.update({f'clavicle_{s}': 'chest', f'upperarm_{s}': f'upperarm.{S}', f'lowerarm_{s}': f'forearm.{S}', f'hand_{s}': f'hand.{S}',
                 f'thigh_{s}': f'thigh.{S}', f'calf_{s}': f'shin.{S}', f'foot_{s}': f'foot.{S}', f'ball_{s}': f'foot.{S}'})
    for f in ('thumb', 'index', 'middle', 'ring', 'pinky'):
        for n in ('01', '02', '03'): _MAP[f'{f}_{n}_{s}'] = f'hand.{S}'

def mh_body(b, name='body'):
    V, faces = _shape(b)
    rig = json.load(open(os.path.join(DATA, 'rig.game_engine.json')))
    W = json.load(open(os.path.join(DATA, 'weights.game_engine.json')))['weights']
    jm = _groups_mean(V, faces)
    def P(bone, end):
        c = rig[bone][end]
        return Vector(jm[c['cube_name']]) if c.get('cube_name') in jm else Vector(c['default_position'])
    # scale so the neck base sits at our 1.10 with feet on the ground
    raw = {bn: (_to_b(P(bn, 'head'), 1), _to_b(P(bn, 'tail'), 1)) for bn in rig if bn != 'Root'}
    body_idx = sorted({i for g, idx in faces if g == 'body' for i in idx})
    zmin = min(_to_b(V[i], 1).z for i in body_idx)
    k = 1.10 / (raw['neck_01'][0].z - zmin)
    def T(v): p = _to_b(v, 1); return Vector((p.x * k, p.y * k, (p.z - zmin) * k))
    def TB(bn, end): return Vector((raw[bn][0 if end == 'head' else 1].x * k, raw[bn][0 if end == 'head' else 1].y * k,
                                    (raw[bn][0 if end == 'head' else 1].z - zmin) * k))
    BV = {i: T(V[i]) for i in body_idx}
    # our skeleton from MakeHuman joints
    J = {'pelvis': (TB('pelvis', 'head'), TB('spine_01', 'head'), None),
         'chest': (TB('spine_01', 'head'), TB('neck_01', 'head'), 'pelvis'),
         'neck': (TB('neck_01', 'head'), TB('head', 'head'), 'chest'),
         'head': (TB('head', 'head'), TB('head', 'tail'), 'neck')}
    for s, S in (('l', 'L'), ('r', 'R')):
        hh, ht = TB(f'hand_{s}', 'head'), TB(f'middle_03_{s}', 'tail') if f'middle_03_{s}' in raw else TB(f'hand_{s}', 'tail')
        J[f'upperarm.{S}'] = (TB(f'upperarm_{s}', 'head'), TB(f'upperarm_{s}', 'tail'), 'chest')
        J[f'forearm.{S}'] = (TB(f'lowerarm_{s}', 'head'), TB(f'lowerarm_{s}', 'tail'), f'upperarm.{S}')
        J[f'hand.{S}'] = (hh, ht, f'forearm.{S}')
        J[f'thigh.{S}'] = (TB(f'thigh_{s}', 'head'), TB(f'thigh_{s}', 'tail'), 'pelvis')
        J[f'shin.{S}'] = (TB(f'calf_{s}', 'head'), TB(f'calf_{s}', 'tail'), f'thigh.{S}')
        J[f'foot.{S}'] = (TB(f'foot_{s}', 'head'), TB(f'ball_{s}', 'tail'), f'shin.{S}')
    # weights per vertex on our bones (MakeHuman's own skinning, merged)
    VW = {}
    for bn, lst in W.items():
        ob = _MAP.get(bn)
        if not ob: continue
        for i, w in lst:
            if i in BV: VW.setdefault(i, {}); VW[i][ob] = VW[i].get(ob, 0) + w
    # lower the A-pose arms to hang at the sides (rotate about the shoulder; skinned by arm weight)
    drop = b.get('arm_drop', None)
    for S, sx in (('L', 1), ('R', -1)):
        sh, el = J[f'upperarm.{S}'][0], J[f'upperarm.{S}'][1]
        d = (el - sh).normalized()
        tgt = Vector((sx * math.sin(math.radians(b.get('arm_out', 7))), 0.02, -1)).normalized()
        q = d.rotation_difference(tgt)
        arm = (f'upperarm.{S}', f'forearm.{S}', f'hand.{S}')
        for i, p in BV.items():
            w = sum(VW.get(i, {}).get(a, 0) for a in arm)
            if w > 0: BV[i] = p.lerp(sh + q @ (p - sh), min(1.0, w))
        for a in arm:
            h, t, par = J[a]; J[a] = (sh + q @ (h - sh), sh + q @ (t - sh), par)
        # straighten MakeHuman's forward elbow bend: forearm follows the upper arm, with a slight natural bend
        el = J[f'forearm.{S}'][0]; ua = (J[f'upperarm.{S}'][1] - J[f'upperarm.{S}'][0]).normalized()
        f = (J[f'forearm.{S}'][1] - el).normalized()
        q2 = f.rotation_difference((ua + Vector((0, -math.tan(math.radians(b.get('elbow_bend', 6))), 0))).normalized())
        low = (f'forearm.{S}', f'hand.{S}')
        for i, p in BV.items():
            w = sum(VW.get(i, {}).get(a, 0) for a in low)
            if w > 0: BV[i] = p.lerp(el + q2 @ (p - el), min(1.0, w))
        for a in low:
            h, t, par = J[a]; J[a] = (el + q2 @ (h - el), el + q2 @ (t - el), par)
    # relaxed hands: draw the splayed fingers together (reads as a loose fist at game size)
    for S, s_ in (('L', 'l'), ('R', 'r')):
        h0, h1 = J[f'hand.{S}'][0], J[f'hand.{S}'][1]; ax = (h1 - h0).normalized()
        fb = [f'{f}_{n}_{s_}' for f in ('index', 'middle', 'ring', 'pinky') for n in ('01', '02', '03')]
        fw = {}
        for bn in fb:
            for i, w in W.get(bn, []):
                if i in BV: fw[i] = fw.get(i, 0) + w
        for i, w in fw.items():
            p = BV[i]; t = (p - h0).dot(ax); c = h0 + ax * t
            BV[i] = c + (p - c) * (1 - .55 * min(1.0, w))
        # and shorten the fingers a touch so the hand is a compact shape
        for i, w in fw.items():
            p = BV[i]; t = (p - h0).dot(ax)
            if t > 0: BV[i] = p - ax * t * .25 * min(1.0, w)
    # weight field: every dense MakeHuman vertex with its own skin weights, looked up by nearest point
    from mathutils.kdtree import KDTree
    kd = KDTree(len(BV)); WL = []
    for n, (i, p) in enumerate(BV.items()):
        kd.insert(p, n)
        w = sorted(VW.get(i, {'chest': 1.0}).items(), key=lambda t: -t[1])[:4]; tot = sum(x for _, x in w) or 1
        WL.append([(k, x / tot) for k, x in w])
    kd.balance(); FIELD[0] = (kd, WL, [p.copy() for p in BV.values()])
    # build the mesh (body group only), smooth, then cut to the triangle budget
    remap = {i: n for n, i in enumerate(body_idx)}
    bm = bmesh.new(); bv = [bm.verts.new(BV[i]) for i in body_idx]; bm.verts.ensure_lookup_table()
    nohead = not b.get('mh_head', True)
    for g, idx in faces:
        if g != 'body': continue
        if nohead and all(VW.get(i, {}).get('head', 0) > .5 for i in idx): continue   # stylized head goes here instead
        try: bm.faces.new([bv[remap[i]] for i in idx])
        except ValueError: pass
    me = bpy.data.meshes.new(name); bm.to_mesh(me); bm.free()
    o = bpy.data.objects.new(name, me); bpy.context.scene.collection.objects.link(o)
    tris = sum(len(p.vertices) - 2 for p in me.polygons)
    target = b.get('tris', 3000)
    if tris > target:
        d = o.modifiers.new('budget', 'DECIMATE'); d.ratio = target / tris
        dg = bpy.context.evaluated_depsgraph_get(); ev = o.evaluated_get(dg)
        nm = bpy.data.meshes.new_from_object(ev); o.modifiers.remove(d); old = o.data; o.data = nm; bpy.data.meshes.remove(old)
    for p in o.data.polygons: p.use_smooth = True
    # head centre and radius for hair and face
    hv = [o.data.vertices[i].co for i in range(len(o.data.vertices)) if o.data.vertices[i].co.z > J['head'][0].z + .01]
    zs = [v.z for v in hv]; xs = [v.x for v in hv]
    top = max(zs); hr = (max(xs) - min(xs)) / 2 * 1.02
    hv2 = [v for v in hv if v.z > top - hr * .9]
    HEAD_Y[0] = sum(v.y for v in hv2) / max(1, len(hv2))
    hz = top - hr * 1.02
    eyes = {S: Vector(jm['joint-%s-eye' % s]) for s, S in (('l', 'L'), ('r', 'R')) if 'joint-%s-eye' % s in jm}
    eye = None
    if eyes:
        e = T(list(eyes['L'])); eye = (abs(e.x) / hr, (e.z - hz) / hr)
    return o, J, hz, hr, eye
