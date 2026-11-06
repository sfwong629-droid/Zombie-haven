"""Real-time 3D export: the rigged character, every weapon, the armour and every animation in one GLB for three.js.

  python3 export3d.py RIG.blend OUT.glb [tex=1024] [decimate=1.0] [median=5] [colors=24]

Animations are sampled from the same pose functions as the sprites (anims.py), at 30 fps, with the sprite timing
(swings keep their slow wind-up and fast strike). Constraints (the two-hand gun grip) are baked, so the GLB needs
no IK. Action names: '<clip>' for empty hands, 'melee_<clip>' (bat, axe), 'gun_<clip>' (rifle, AK-47), 'pistol_fire' (the pistol
uses the melee hold clips).
Nodes: 'weapon_bat|axe|rifle|ak47' (toggle visibility), each with a 'tip' child (muzzle / striking end);
'armor_*' meshes for the plate armour. Materials are plain base colour + texture; the viewer does the toon look.
"""
import bpy, math, os, sys
from mathutils import Matrix
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import ai_render, anims, armor

FPS = 30
TWO_HAND = {'pistol_fire': ('pistol', 'grip2'), 'work_dig': ('hoe', 'grip_low'), 'melee_swing_d': ('bat', 'grip_low'), 'work_chop': ('axe', 'grip_low')}   # action -> weapon whose grip2 the left hand holds
FACE_OUT = None      # set by main: path stem for the extra expression textures
FACE = True          # paint the face touch-up (narrower eyes, smile, brows; facepaint.py)
WELD = 1e-3          # merge vertices closer than this: the AI mesh is full of hairline cracks the background shows through
FLAT = True          # flat colour regions (see flat_regions); False = the filtered texture
COLORS = {'w_crate': '#c8924f', 'w_wood': '#a8703c', 'w_dark': '#4a3324', 'w_metal': '#a9afb5', 'w_gun': '#3c3f42', 'w_gunwood': '#7a4a26',
          'w_tape': '#d8cfb8', 'a_steel': armor.STEEL, 'a_trim': armor.TRIM, 'a_leather': armor.LEATHER}

def plain(m, hexc=None, image=None, rough=.9, metal=0.0):
    N, L = m.node_tree.nodes, m.node_tree.links
    for n in list(N): N.remove(n)
    out = N.new('ShaderNodeOutputMaterial'); bs = N.new('ShaderNodeBsdfPrincipled')
    bs.inputs['Roughness'].default_value = rough; bs.inputs['Metallic'].default_value = metal
    if image:
        tx = N.new('ShaderNodeTexImage'); tx.image = image; L.new(tx.outputs['Color'], bs.inputs['Base Color'])
    else:
        bs.inputs['Base Color'].default_value = (*[(int(hexc[i:i + 2], 16) / 255) ** 2.2 for i in (1, 3, 5)], 1)
    L.new(bs.outputs[0], out.inputs['Surface'])

def clip_plan():
    """[(action name, clip, weapon class or None, duration s, t(time) -> pose t)]"""
    plan = []
    for clip, (fn, n, ms, loop, need) in anims.CLIPS.items():
        classes = [None] if need is None else {'any': ['melee', 'gun'], 'shoot': ['gun', 'pistol']}.get(need, [need])   # the pistol holds like a melee weapon
        if clip.startswith('swing'):
            T, M = anims.SWING_T + [1.0], anims.SWING_MS
            cum = [0]
            for x in M: cum.append(cum[-1] + x)
            dur = cum[-1] / 1000
            def tf(s, T=T, cum=cum):
                s *= 1000
                for i in range(len(cum) - 1):
                    if cum[i] <= s <= cum[i + 1]: return T[i] + (T[i + 1] - T[i]) * (s - cum[i]) / (cum[i + 1] - cum[i])
                return 1.0
        elif loop:
            dur = n * ms / 1000; tf = lambda s, dur=dur: s / dur
        else:
            dur = n * ms / 1000; last = (n - 1) * ms / 1000; tf = lambda s, last=last: min(1.0, s / last)
        for c in classes:
            plan.append(((c + '_' if c else '') + clip, clip, c, dur, tf))
    plan.append(('zombie_walk', 'zombie_walk', None, 1.4, lambda s: s / 1.4))      # 3D-only extra clips
    plan.append(('run', 'run', None, .62, lambda s: s / .62))
    plan.append(('zombie_run', 'zombie_run', None, .72, lambda s: s / .72))
    for name, dur in (('work_chop', 1.3), ('work_hammer', 1.0), ('work_dig', 1.4), ('work_tinker', 1.6), ('sit', 3.0), ('sleep', 4.0),
                      ('eat', 2.2), ('talk', 2.4), ('wave', 1.0), ('carry_walk', .9), ('carry_idle', 2.0), ('walk_f', .86), ('sit_f', 3.0)):   # V3D.19 everyday clips
        plan.append((name, name, None, dur, lambda s, d=dur: s / d))
    plan.append(('pickup', 'pickup', None, 1.1, lambda s: min(1.0, s / 1.1)))   # one-shot
    plan.append(('zombie_attack', 'zombie_attack', None, .9, lambda s: min(1.0, s / .9)))   # V3D.20 zombie claw swipe, one-shot
    plan.append(('bloated_walk', 'bloated_walk', None, 1.5, lambda s: s / 1.5))   # V3D.21 bloated zombie (arms fused to the belly)
    plan.append(('bloated_attack', 'bloated_attack', None, 1.0, lambda s: min(1.0, s / 1.0)))
    plan.append(('brute_attack', 'brute_attack', None, 1.1, lambda s: min(1.0, s / 1.1)))   # 3D.35 brute double hammer fist
    plan.append(('spit', 'spit', None, 1.1, lambda s: min(1.0, s / 1.1)))   # 3D.35 spitter ranged spit
    plan += [('crawl', 'crawl', None, 1.6, lambda s: s / 1.6), ('crawl_idle', 'crawl_idle', None, 2.4, lambda s: s / 2.4),   # 3D.34 legless crawler
             ('crawl_attack', 'crawl_attack', None, 1.0, lambda s: min(1.0, s / 1.0)), ('crawl_die', 'crawl_die', None, 1.2, lambda s: min(1.0, s / 1.2))]
    return plan

def key_frames(ao, name, frames):
    act = bpy.data.actions.new(name); act.use_fake_user = True
    ao.animation_data_create(); ao.animation_data.action = act
    for c in [c for pb in ao.pose.bones for c in pb.constraints]: c.mute = True
    B = ao.data.bones
    for f, P in enumerate(frames):
        for pb in ao.pose.bones:
            b = B[pb.name]
            if b.parent:
                rel = b.parent.matrix_local.inverted() @ b.matrix_local
                basis = rel.inverted() @ P[b.parent.name].inverted() @ P[pb.name]
            else:
                basis = b.matrix_local.inverted() @ P[pb.name]
            loc, rot, sc = basis.decompose()
            pb.rotation_mode = 'QUATERNION'; pb.location = loc; pb.rotation_quaternion = rot; pb.scale = (1, 1, 1)
            pb.keyframe_insert('location', frame=f); pb.keyframe_insert('rotation_quaternion', frame=f)
    for c in [c for pb in ao.pose.bones for c in pb.constraints]: c.mute = False
    for pb in ao.pose.bones:          # back to Euler: apply_pose writes rotation_euler, which quaternion mode ignores
        pb.rotation_mode = 'XYZ'; pb.rotation_quaternion = (1, 0, 0, 0)
    # keep the action on an NLA track so the exporter sees it as its own animation
    tr = ao.animation_data.nla_tracks.new(); tr.name = name; tr.strips.new(name, 0, act); tr.mute = True
    ao.animation_data.action = None
    return act

def clean_texture(body, tex=1024, median=5, colors=24):
    """Flat-colour copy of the body texture for close-up viewing. The Hunyuan atlas is ~1,200 tiny UV islands, so
    filtering it directly mixes neighbouring islands' colours into every seam (dark specks up close). First pad every
    island outward with its own edge colours (nearest-texel fill of the gaps), then shrink, median and posterise."""
    import numpy as np
    from PIL import Image, ImageDraw, ImageFilter
    from scipy import ndimage
    texn = next(n for m in body.data.materials for n in m.node_tree.nodes
                if n.type == 'TEX_IMAGE' and 'normal' not in n.image.name and 'metal' not in n.image.name)
    im = texn.image; w, h = im.size
    buf = np.empty(w * h * 4, np.float32); im.pixels.foreach_get(buf)
    px = (buf.reshape(h, w, 4)[..., :3] * 255).astype(np.uint8); del buf          # rows bottom-up, as blender stores them
    mask = Image.new('L', (w, h), 0); d = ImageDraw.Draw(mask); uv = body.data.uv_layers.active.data
    for poly in body.data.polygons:
        d.polygon([(uv[i].uv.x * w, uv[i].uv.y * h) for i in poly.loop_indices], fill=255)
    inside = ndimage.binary_erosion(np.asarray(mask) > 0, iterations=1)
    idx = ndimage.distance_transform_edt(~inside, return_distances=False, return_indices=True)
    px = px[idx[0], idx[1]]
    pil = Image.fromarray(px).resize((tex, tex), Image.LANCZOS).filter(ImageFilter.MedianFilter(median))
    if colors: pil = pil.quantize(colors, method=Image.Quantize.MEDIANCUT).convert('RGB')
    a = np.asarray(pil).astype(np.float32) / 255
    new = bpy.data.images.new('body_tex', tex, tex); new.colorspace_settings.name = 'sRGB'
    new.pixels.foreach_set(np.dstack([a, np.ones(a.shape[:2], np.float32)]).ravel()); new.pack()
    return new

def flat_regions(body, tex=1024, k=10, min_patch=40, detail_h=.62):
    """Clean the body's colours for close-up 3D. Hunyuan bakes blotches into the texture (skin colour on the shirt,
    dark specks along seams). Each face gets one colour class (k-means over the texture under it), stray patches are
    voted away by their mesh neighbours, then every face is painted flat in its class colour. Faces on the front of
    the head above `detail_h` x height keep the texture, so the eyes, brows and mouth stay drawn."""
    import numpy as np
    from PIL import Image, ImageDraw, ImageFilter
    from scipy import ndimage
    from collections import Counter, defaultdict
    texn = next(n for m in body.data.materials for n in m.node_tree.nodes
                if n.type == 'TEX_IMAGE' and 'normal' not in n.image.name and 'metal' not in n.image.name)
    im = texn.image; w, h = im.size
    buf = np.empty(w * h * 4, np.float32); im.pixels.foreach_get(buf); px = buf.reshape(h, w, 4)[..., :3].copy(); del buf
    me = body.data; uv = me.uv_layers.active.data; P = me.polygons; nP = len(P)
    # colour under each face: median of samples between the centroid and each corner
    col = np.zeros((nP, 3), np.float32)
    for f in P:
        u = np.array([uv[i].uv[:] for i in f.loop_indices]); c = u.mean(0)
        pts = np.vstack([c, c + (u - c) * .55])
        xs = np.clip((pts[:, 0] * w).astype(int), 0, w - 1); ys = np.clip((pts[:, 1] * h).astype(int), 0, h - 1)
        col[f.index] = np.median(px[ys, xs], 0)
    # k-means (k colours) in a perceptual-ish space
    X = np.sqrt(col); rng = np.random.default_rng(1); C = X[rng.choice(nP, k, replace=False)]
    for _ in range(25):
        lab = ((X[:, None] - C[None]) ** 2).sum(-1).argmin(1)
        C = np.array([X[lab == j].mean(0) if (lab == j).any() else C[j] for j in range(k)])
    # face adjacency through shared edges
    ef = defaultdict(list)
    for f in P:
        for e in f.edge_keys: ef[e].append(f.index)
    nb = [[] for _ in range(nP)]
    for fs in ef.values():
        for a in fs:
            nb[a] += [b for b in fs if b != a]
    co = np.array([v.co[:] for v in me.vertices]); zt = co[:, 2].max(); z0 = co[:, 2].min()
    detail = np.array([f.center.z > z0 + detail_h * (zt - z0) and f.normal.y < -.15 for f in P])
    for _ in range(4):                                   # majority vote: lone faces take their neighbours' colour
        new = lab.copy()
        for i in range(nP):
            if detail[i] or not nb[i]: continue
            c = Counter(lab[j] for j in nb[i]); top, n = c.most_common(1)[0]
            if top != lab[i] and n >= max(2, len(nb[i]) * .6): new[i] = top
        lab = new
    for _ in range(3):                                   # small same-colour islands merge into what surrounds them
        seen = np.zeros(nP, bool)
        for s0 in range(nP):
            if seen[s0] or detail[s0]: continue
            comp, stack = [], [s0]; seen[s0] = True
            while stack:
                a = stack.pop(); comp.append(a)
                for b in nb[a]:
                    if not seen[b] and lab[b] == lab[s0] and not detail[b]: seen[b] = True; stack.append(b)
            if len(comp) < min_patch:
                c = Counter(lab[b] for a in comp for b in nb[a] if lab[b] != lab[s0])
                if c: lab[comp] = c.most_common(1)[0][0]
    pal = np.array([np.median(col[lab == j], 0) if (lab == j).any() else [0, 0, 0] for j in range(k)])
    # paint: padded original underneath (for the detail faces), flat class colours on top
    S = tex; base = Image.fromarray((px * 255).astype(np.uint8)).resize((S, S), Image.LANCZOS).filter(ImageFilter.MedianFilter(3))
    flat = Image.new('RGB', (S, S)); df = ImageDraw.Draw(flat); m = Image.new('L', (S, S)); dm = ImageDraw.Draw(m)
    for f in P:
        q = [(uv[i].uv.x * S, uv[i].uv.y * S) for i in f.loop_indices]
        dm.polygon(q, fill=255, outline=255)
        if not detail[f.index]:
            c = tuple(int(v * 255) for v in pal[lab[f.index]]); df.polygon(q, fill=c, outline=c)
    dmask = Image.new('L', (S, S)); dd = ImageDraw.Draw(dmask)
    for f in P:
        if detail[f.index]: dd.polygon([(uv[i].uv.x * S, uv[i].uv.y * S) for i in f.loop_indices], fill=255, outline=255)
    out = np.where(np.asarray(dmask)[..., None] > 0, np.asarray(base), np.asarray(flat)).copy()
    inside = np.asarray(m) > 0
    idx = ndimage.distance_transform_edt(~inside, return_distances=False, return_indices=True)
    if FACE:
        # one texture per facial expression: the GLB carries 'neutral'; the others are saved next to it as
        # <name>_face_<expr>.webp (same UV layout) for the viewer to swap in while a clip plays (facepaint.EXPR_OF_CLIP)
        import facepaint
        pos, nrm = facepaint.head_maps(me, S, detail_h); raw = out
        for e in facepaint.EXPRESSIONS:
            o = facepaint.face_paint(pos, nrm, raw.copy(), e, log=lambda *a: print(*a, flush=True))[idx[0], idx[1]]
            o = facepaint.fix_gutters(o, inside)
            if e == 'neutral': out = o
            elif FACE_OUT:
                Image.fromarray(o).transpose(Image.FLIP_TOP_BOTTOM).save(f'{FACE_OUT}_face_{e}.webp', quality=92)
                # face-only overlay (transparent elsewhere): the viewer lays it over any outfit's texture, so one small
                # texture per expression serves every job instead of a full recoloured copy each (phones run out of memory)
                dm = ndimage.binary_dilation((o != out).any(2), iterations=2)
                Image.fromarray(np.dstack([o, (dm * 255).astype(np.uint8)])).transpose(Image.FLIP_TOP_BOTTOM).save(f'{FACE_OUT}_face_{e}.png', optimize=True)
    else:
        out = out[idx[0], idx[1]]                                              # pad gaps so seams never sample black
    out = out.astype(np.float32) / 255
    new = bpy.data.images.new('body_tex', S, S); new.colorspace_settings.name = 'sRGB'
    new.pixels.foreach_set(np.dstack([out, np.ones(out.shape[:2], np.float32)]).ravel()); new.pack()
    print('flat colours', [tuple(int(v * 255) for v in c) for c in pal], 'detail faces', int(detail.sum()), flush=True)
    return new

def main(blend, out, tex=1024, decimate=1.0, median=5, colors=24):
    global FACE_OUT
    ai_render.TEX_PX = tex; FACE_OUT = os.path.splitext(out)[0]
    ao, body = ai_render.load(blend)
    bpy.context.scene.render.fps = FPS
    if WELD:
        import bmesh
        bm = bmesh.new(); bm.from_mesh(body.data); n0 = len(bm.verts)
        bmesh.ops.remove_doubles(bm, verts=bm.verts, dist=WELD); bm.to_mesh(body.data); body.data.update()
        print('welded', n0 - len(bm.verts), 'vertices', flush=True); bm.free()
    if FACE:
        import facepaint
        facepaint.flatten_eyes(body.data, log=lambda *a: print(*a, flush=True))
    img = flat_regions(body, tex) if FLAT else clean_texture(body, tex, median, colors)
    for m in body.data.materials: plain(m, image=img)
    if decimate < 1.0:
        d = body.modifiers.new('dec', 'DECIMATE'); d.ratio = decimate
        bpy.context.view_layer.objects.active = body; bpy.ops.object.modifier_apply(modifier='dec')
    # armour (built at rest, bone-parented) and the four weapons
    arm = armor.build(ao, body)
    for i, o in enumerate(arm): o.name = f'armor_{i}'
    W = {}
    for k in ('bat', 'axe', 'rifle', 'ak47', 'pistol', 'hammer', 'hoe', 'wrench', 'bowl', 'crate'):
        W[k] = anims.build_weapon(ao, k)
        for e in ('grip1', 'grip2', 'grip_low'):
            if W[k][e]: W[k][e].name = f'{k}_{e}'
        W[k]['tip'].name = f'{k}_tip'
    for o in bpy.data.objects:
        if o.type != 'MESH' or o == body: continue
        for m in o.data.materials:
            base = m.name.split('.')[0]
            if base in COLORS: plain(m, COLORS[base], rough=.5 if base.startswith('a_') else .9, metal=.0)
    # animations
    for name, clip, cls, dur, tf in clip_plan():
        loop = anims.CLIPS[clip][3] if clip in anims.CLIPS else clip not in ('pickup', 'zombie_attack', 'bloated_attack', 'crawl_attack', 'crawl_die', 'brute_attack', 'spit')
        fn = anims.pose_fn(clip, cls) if clip in anims.CLIPS else getattr(anims, clip)
        if cls == 'gun':
            anims.left_hand_ik(ao, W['rifle']['grip2'], True); anims.hand_ik(ao, 'R', W['rifle']['grip1'], True)
        two = TWO_HAND.get(name)   # V3D.19: the left hand follows a second grip on these one-weapon clips
        if two: anims.left_hand_ik(ao, W[two[0]][two[1]], True)
        nf = max(2, round(dur * FPS)) + (0 if loop else 1)
        frames = []
        order = [b.name for b in ao.data.bones]
        for f in range(nf):
            s = f / FPS; t = tf(s) % 1.0 if loop else tf(s)
            ai_render.apply_pose(ao, fn(t)); bpy.context.view_layer.update()
            frames.append({b: ao.pose.bones[b].matrix.copy() for b in order})
        if cls == 'gun':
            anims.left_hand_ik(ao, W['rifle']['grip2'], False); anims.hand_ik(ao, 'R', W['rifle']['grip1'], False)
        if two: anims.left_hand_ik(ao, W[two[0]][two[1]], False)
        key_frames(ao, name, frames)
        print('baked', name, nf, 'frames', flush=True)
    for pb in ao.pose.bones:
        for c in list(pb.constraints): pb.constraints.remove(c)        # baked; IK targets are not exported
        pb.location = (0, 0, 0); pb.rotation_mode = 'QUATERNION'; pb.rotation_quaternion = (1, 0, 0, 0)   # the keys are quaternions
    for o in list(bpy.data.objects):
        if o.type in ('CAMERA', 'LIGHT'): bpy.data.objects.remove(o, do_unlink=True)
    bpy.ops.object.select_all(action='DESELECT')
    bpy.ops.export_scene.gltf(filepath=os.path.abspath(out), export_format='GLB', export_animation_mode='NLA_TRACKS',
                              export_skins=True, export_def_bones=False, export_optimize_animation_size=True,
                              export_image_format='WEBP', export_apply=False, export_yup=True)
    print('saved', out, round(os.path.getsize(out) / 1e6, 2), 'MB')

if __name__ == '__main__':
    a = sys.argv[1:]; opt = dict(x.split('=', 1) for x in a if '=' in x); pos = [x for x in a if '=' not in x]
    main(pos[0], pos[1], int(opt.get('tex', 1024)), float(opt.get('decimate', 1.0)), int(opt.get('median', 5)), int(opt.get('colors', 24)))
