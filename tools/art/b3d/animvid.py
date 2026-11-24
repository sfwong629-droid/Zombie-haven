# animvid.py -- MODEL.glb CLIP OUT.mp4 : a short video of one animation playing, from several angles side by side (owner, 22 Nov: "I want to see the
# actual animation first"), for reviewing zombie moves before they go in the game. One Blender process renders every frame from every view (same
# look as closeup.py: Workbench, studio light, the model's own colours, a green ground), then ffmpeg joins them; the clip plays LOOPS times.
# Env: VIEWS 'dx,dy,dz;...' (default: side, front three-quarter, front, back three-quarter), FIXED x,y,z camera target (default: the model's middle),
# DIST camera distance (default: from the model's height), FPS (24), SIZE (320 per view), LOOPS (3), LABEL (text at the top left, optional).
# Rig: +X left, -Y forward, +Z up. Needs bpy, PIL and ffmpeg.
import bpy, sys, os, math, subprocess, tempfile, shutil
from mathutils import Vector
a = sys.argv[sys.argv.index('--') + 1:]; src, clip, out = a[0], a[1], a[2]
bpy.ops.wm.read_factory_settings(use_empty=True); bpy.ops.import_scene.gltf(filepath=src)
ao = [o for o in bpy.data.objects if o.type == 'ARMATURE'][0]
if os.environ.get('ATTACH'):   # optional: a held prop for previews, ATTACH = JSON {"glb": path, "parent": object name, "M": 4x4 rows (prop local -> parent local)}
    import json as _j; from mathutils import Matrix as _M
    _a = _j.loads(os.environ['ATTACH']); _before = set(bpy.data.objects); bpy.ops.import_scene.gltf(filepath=_a['glb'])
    for _o in set(bpy.data.objects) - _before:
        if _o.type == 'MESH': _o.parent = bpy.data.objects[_a['parent']]; _o.matrix_parent_inverse = _M.Identity(4); _o.matrix_basis = _M(_a['M'])
for o in bpy.data.objects:
    if (o.name.startswith('weapon_') and o.name not in ['weapon_' + w for w in os.environ.get('WEAP', '').split(',') if w]) or (o.type == 'MESH' and o.name.startswith('armor')): o.hide_render = True
for tr in ao.animation_data.nla_tracks: tr.mute = True
act = bpy.data.actions[clip]; ao.animation_data.action = act
try: ao.animation_data.action_slot = act.slots[0]
except Exception: pass
sc = bpy.context.scene; f0, f1 = act.frame_range; fps0 = sc.render.fps; FPS = int(os.environ.get('FPS', 24)); S = int(os.environ.get('SIZE', 320))
body = next(o for o in bpy.data.objects if o.type == 'MESH' and o.name.startswith('body'))
sc.frame_set(int(f0)); bpy.context.view_layer.update()
bb = [body.matrix_world @ Vector(c) for c in body.bound_box]; H = max(v.z for v in bb) - min(v.z for v in bb); L = max(max(v.y for v in bb) - min(v.y for v in bb), H)
hc = Vector(tuple(map(float, os.environ['FIXED'].split(',')))) if os.environ.get('FIXED') else Vector((0, -.1 * L, .5 * H))
DIST = float(os.environ.get('DIST', 2.0 * max(H, L * .8)))
sc.render.engine = 'BLENDER_WORKBENCH'; sc.display.shading.light = 'STUDIO'; sc.display.shading.color_type = 'TEXTURE'
sc.render.resolution_x = S; sc.render.resolution_y = S; sc.render.film_transparent = False; sc.world = bpy.data.worlds.new('w'); sc.world.color = (0.95, 0.95, 0.95)
bpy.ops.mesh.primitive_plane_add(size=20, location=(0, 0, 0)); pl = bpy.context.object; m = bpy.data.materials.new('g'); m.diffuse_color = (.42, .5, .36, 1); pl.data.materials.append(m); pl.color = (.42, .5, .36, 1)
cam = bpy.data.cameras.new('c'); co = bpy.data.objects.new('c', cam); sc.collection.objects.link(co); sc.camera = co; cam.lens = 50
views = [tuple(map(float, v.split(','))) for v in os.environ.get('VIEWS', '1,0,.12;.6,-.8,.15;0,-1,.1;-.6,.8,.15').split(';')]
secs = (f1 - f0) / fps0; n = max(2, int(round(secs * FPS)))
tmp = tempfile.mkdtemp(); from PIL import Image, ImageDraw, ImageFont
try: FNT = ImageFont.truetype('/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf', 15)
except Exception: FNT = None
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__))); import propfx; PROPO = propfx.make()
frames = []
for i in range(n):
    t = f0 + (f1 - f0) * i / n; sc.frame_set(int(t), subframe=t - int(t)); propfx.place(PROPO, i / n); bpy.context.view_layer.update(); ims = []
    for k, (dx, dy, dz) in enumerate(views):
        d = Vector((dx, dy, dz)).normalized(); co.location = hc + d * DIST; co.rotation_euler = (hc - co.location).to_track_quat('-Z', 'Y').to_euler()
        sc.render.filepath = os.path.join(tmp, 'v.png'); bpy.ops.render.render(write_still=True); ims.append(Image.open(sc.render.filepath).convert('RGB'))
    Wim = Image.new('RGB', (S * len(ims), S + 24), 'white')
    for k, im in enumerate(ims): Wim.paste(im, (S * k, 24))
    D = ImageDraw.Draw(Wim); D.text((6, 5), (os.environ.get('LABEL', '') + '   ' if os.environ.get('LABEL') else '') + '%s  %.2f / %.2f s' % (clip, secs * i / n, secs), fill=(30, 30, 30), font=FNT)
    p = os.path.join(tmp, 'f%04d.png' % i); Wim.save(p); frames.append(p)
seq = os.path.join(tmp, 'seq'); os.makedirs(seq)
for r in range(int(os.environ.get('LOOPS', 3))):
    for i, p in enumerate(frames): shutil.copy(p, os.path.join(seq, 'g%05d.png' % (r * n + i)))
subprocess.run(['ffmpeg', '-y', '-loglevel', 'error', '-framerate', str(FPS), '-i', os.path.join(seq, 'g%05d.png'), '-vf', 'pad=ceil(iw/2)*2:ceil(ih/2)*2', '-c:v', 'libx264', '-preset', 'veryfast', '-pix_fmt', 'yuv420p', '-crf', '23', out], check=True)
shutil.copy(frames[len(frames) // 2], out.rsplit('.', 1)[0] + '_still.png'); shutil.rmtree(tmp)
print('ANIMVID', clip, '%d frames x %d views, %.2f s ->' % (n, len(views), secs), out)
