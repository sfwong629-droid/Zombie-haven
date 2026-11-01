"""Hand-animation workbench: a .blend you open in Blender to pose the survivor yourself, and the reader that renders
your poses with the same camera, weapons, effects and sprite look as anims.py.

  python3 workbench.py make RIG.blend OUT.blend      # rig + toon body + weapons + game camera + every clip as an Action
  python3 anims.py RIG.blend RAW actions=OUT.blend   # render using the Actions saved in OUT.blend (see anims.py)

Each clip is one Action named like the clip (walk, swing_a, hold_idle_melee, hold_idle_gun, ...). Scene runs at
100 fps, so 1 Blender frame = 10 ms. Every keyframe becomes one sprite frame; the gap to the next keyframe is how
long that frame shows in the game; the Action's frame range end closes the last frame (and loops back for loops).
"""
import bpy, math, os, sys
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import anims, ai_render
from mathutils import Vector

FPS = 100
VARIANTS = ('hold_idle', 'hold_walk', 'hold_hurt')      # these exist once per weapon class

def action_name(clip, wcls):
    return f'{clip}_{wcls}' if clip in VARIANTS else clip

def clip_list():
    """(action name, clip, weapon class) for every Action in the workbench."""
    out = []
    for clip, (_, n, ms, loop, need) in anims.CLIPS.items():
        if clip in VARIANTS: out += [(action_name(clip, c), clip, c) for c in ('melee', 'gun')]
        elif need in ('melee', 'gun'): out.append((clip, clip, need))
        else: out.append((clip, clip, None))
    return out

def frame_ms(clip):
    n = anims.CLIPS[clip][1]
    return list(anims.SWING_MS) if clip.startswith('swing') else [anims.CLIPS[clip][2]] * n

def _bake_pose(ao, P, frame):
    ai_render.apply_pose(ao, P)
    for pb in ao.pose.bones:
        pb.keyframe_insert('rotation_euler', frame=frame, group=pb.name)
    ao.pose.bones['pelvis'].keyframe_insert('location', frame=frame, group='pelvis')

def make(rig, out):
    ao, body = ai_render.load(rig); ai_render.toonify(body)
    for im in list(bpy.data.images):                      # drop the 4K source textures: toonify packed a small copy
        if im.users == 0: bpy.data.images.remove(im)
    S = bpy.context.scene
    cam = ai_render.setup_scene(px=600, tilt=60); cam.data.ortho_scale = 300 / (128 / 1.3)
    look = Vector((0, 0, -1)); look.rotate(cam.rotation_euler); cam.location = Vector((0, 0, .58)) - look * 20
    S.render.fps = FPS
    ao.hide_render = True; ao.show_in_front = True; ao.data.display_type = 'STICK'
    # weapons, each in its own collection; only the bat shows to start with
    for kind in ('bat', 'axe', 'rifle', 'ak47'):
        W = anims.build_weapon(ao, kind)
        col = bpy.data.collections.new('weapon ' + kind); S.collection.children.link(col)
        for k in ('obj', 'tip', 'grip2', 'grip1'):
            ob = W[k]
            if not ob: continue
            for c in list(ob.users_collection): c.objects.unlink(ob)
            col.objects.link(ob)
            if k != 'obj': ob.empty_display_size = .03
        if kind == 'rifle':          # gun clips lock both hands to the rifle at render time; preview that here
            for side, tgt in (('R', W['grip1']), ('L', W['grip2'])):
                c = ao.pose.bones['forearm.' + side].constraints.new('IK'); c.name = 'gun grip'
                c.target = tgt; c.chain_count = 2; c.influence = 0
        if kind != 'bat':
            col.hide_viewport = True; col.hide_render = True
    # every clip as an Action, one keyframe per sprite frame, spaced by the game timing
    ao.animation_data_create()
    for name, clip, wcls in clip_list():
        fn = anims.pose_fn(clip, wcls); ts = anims.times(clip); ms = frame_ms(clip)
        act = bpy.data.actions.new(name); act.use_fake_user = True
        ao.animation_data.action = act
        if not ao.animation_data.action_slot and act.slots: ao.animation_data.action_slot = act.slots[0]
        f = 0
        for t, m in zip(ts, ms):
            _bake_pose(ao, fn(t), f); f += round(m / 1000 * FPS)
        act.use_frame_range = True; act.frame_start = 0; act.frame_end = f
        act['loop'] = bool(anims.CLIPS[clip][3])
        for fc in fcurves(act):
            for kp in fc.keyframe_points: kp.interpolation = 'LINEAR' if act['loop'] or clip.startswith('swing') else 'BEZIER'
        print('baked', name, len(ts), 'keys, end', f, flush=True)
    walk = bpy.data.actions['swing_a']; ao.animation_data.action = walk
    ao.animation_data.action_slot = walk.slots[0]
    S.frame_start, S.frame_end = 0, int(walk.frame_end) - 1; S.frame_set(0)
    ai_render.face(ao, 'se')                               # facing the game's front-right view through the camera
    bpy.ops.wm.save_as_mainfile(filepath=os.path.abspath(out), compress=True)
    print('saved', out, round(os.path.getsize(out) / 1e6, 1), 'MB')

# ---------------------------------------------------------------- reading actions back
def fcurves(act):
    """All F-curves of an Action (Blender 4.4+ layered actions; falls back to the old flat list)."""
    out = []
    try:
        for layer in act.layers:
            for strip in layer.strips:
                for cb in strip.channelbags: out += list(cb.fcurves)
    except AttributeError:
        out = list(act.fcurves)
    return out

def key_frames(act):
    return sorted({round(kp.co.x, 3) for fc in fcurves(act) for kp in fc.keyframe_points})

def load_actions(path):
    with bpy.data.libraries.load(os.path.abspath(path), link=False) as (src, dst):
        dst.actions = list(src.actions)
    return {a.name: a for a in dst.actions if a}

def action_clip(ao, act, clip):
    """Pose function t -> applies the Action, keyframe times, per-frame ms, and the t of each keyframe.
    t runs 0..1 over the Action; if the keyframe count still matches the built-in clip, the built-in times are
    kept so the effects (swooshes, sparks, muzzle flash) land on the same frames."""
    ks = key_frames(act); end = act.frame_end if act.use_frame_range else ks[-1] + (ks[-1] - ks[-2] if len(ks) > 1 else 10)
    base = anims.times(clip)
    ts = base if len(base) == len(ks) else [(k - ks[0]) / max(1e-6, end - ks[0]) for k in ks]
    ms = [round((b - a) * 1000 / FPS) for a, b in zip(ks, ks[1:] + [end])]
    if not ao.animation_data: ao.animation_data_create()
    def frame_at(t):
        pts = list(zip(ts, ks)) + [(1.0 if anims.CLIPS[clip][3] else ts[-1] + 1e-6, end)]
        for (t0, f0), (t1, f1) in zip(pts, pts[1:]):
            if t <= t1: return f0 + (f1 - f0) * (t - t0) / max(1e-9, t1 - t0)
        return pts[-1][1]
    def apply(t):
        ao.animation_data.action = act
        if act.slots: ao.animation_data.action_slot = act.slots[0]
        f = frame_at(t); bpy.context.scene.frame_set(int(math.floor(f)), subframe=f - math.floor(f))
    return apply, ts, ms

if __name__ == '__main__':
    a = sys.argv[1:]
    if a[0] == 'make': make(a[1], a[2])
