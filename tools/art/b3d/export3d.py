"""Real-time 3D export: the rigged character, every weapon, the armour and every animation in one GLB for three.js.

  python3 export3d.py RIG.blend OUT.glb [tex=1024] [decimate=1.0] [median=5] [colors=24]

Animations are sampled from the same pose functions as the sprites (anims.py), at 30 fps, with the sprite timing
(swings keep their slow wind-up and fast strike). Constraints (the two-hand gun grip) are baked, so the GLB needs
no IK. Action names: '<clip>' for empty hands, 'melee_<clip>' (bat, axe), 'gun_<clip>' (rifle, AK-47).
Nodes: 'weapon_bat|axe|rifle|ak47' (toggle visibility), each with a 'tip' child (muzzle / striking end);
'armor_*' meshes for the plate armour. Materials are plain base colour + texture; the viewer does the toon look.
"""
import bpy, math, os, sys
from mathutils import Matrix
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import ai_render, anims, armor

FPS = 30
COLORS = {'w_wood': '#a8703c', 'w_dark': '#4a3324', 'w_metal': '#a9afb5', 'w_gun': '#3c3f42', 'w_gunwood': '#7a4a26',
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
        classes = [None] if need is None else (['melee', 'gun'] if need == 'any' else [need])
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
    plan.append(('zombie_walk', 'zombie_walk', None, 1.4, lambda s: s / 1.4))      # 3D-only extra clip
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

def main(blend, out, tex=1024, decimate=1.0, median=5, colors=24):
    ai_render.TEX_PX = tex
    ao, body = ai_render.load(blend)
    bpy.context.scene.render.fps = FPS
    img = clean_texture(body, tex, median, colors)
    for m in body.data.materials: plain(m, image=img)
    if decimate < 1.0:
        d = body.modifiers.new('dec', 'DECIMATE'); d.ratio = decimate
        bpy.context.view_layer.objects.active = body; bpy.ops.object.modifier_apply(modifier='dec')
    # armour (built at rest, bone-parented) and the four weapons
    arm = armor.build(ao, body)
    for i, o in enumerate(arm): o.name = f'armor_{i}'
    W = {}
    for k in ('bat', 'axe', 'rifle', 'ak47'):
        W[k] = anims.build_weapon(ao, k)
        for e in ('grip1', 'grip2'):
            if W[k][e]: W[k][e].name = f'{k}_{e}'
        W[k]['tip'].name = f'{k}_tip'
    for o in bpy.data.objects:
        if o.type != 'MESH' or o == body: continue
        for m in o.data.materials:
            base = m.name.split('.')[0]
            if base in COLORS: plain(m, COLORS[base], rough=.5 if base.startswith('a_') else .9, metal=.0)
    # animations
    for name, clip, cls, dur, tf in clip_plan():
        loop = anims.CLIPS[clip][3] if clip in anims.CLIPS else True
        fn = anims.pose_fn(clip, cls) if clip in anims.CLIPS else getattr(anims, clip)
        if cls == 'gun':
            anims.left_hand_ik(ao, W['rifle']['grip2'], True); anims.hand_ik(ao, 'R', W['rifle']['grip1'], True)
        nf = max(2, round(dur * FPS)) + (0 if loop else 1)
        frames = []
        order = [b.name for b in ao.data.bones]
        for f in range(nf):
            s = f / FPS; t = tf(s) % 1.0 if loop else tf(s)
            ai_render.apply_pose(ao, fn(t)); bpy.context.view_layer.update()
            frames.append({b: ao.pose.bones[b].matrix.copy() for b in order})
        if cls == 'gun':
            anims.left_hand_ik(ao, W['rifle']['grip2'], False); anims.hand_ik(ao, 'R', W['rifle']['grip1'], False)
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
