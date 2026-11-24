# closeup.py -- RAW.glb GEAR.glb clip frame out.png [views]
import bpy,sys,math,os,numpy as np
from mathutils import Vector, Matrix
a=sys.argv[sys.argv.index('--')+1:]; src,gear,clip,fr,out=a[0],a[1],a[2],float(a[3]),a[4]; shift=float(a[5]) if len(a)>5 else .04
bpy.ops.wm.read_factory_settings(use_empty=True); bpy.ops.import_scene.gltf(filepath=src)
import os as _os
if _os.environ.get('ATTACH'):   # optional held prop for previews (as in animvid.py)
    import json as _j; from mathutils import Matrix as _M
    _a = _j.loads(_os.environ['ATTACH']); _before = set(bpy.data.objects); bpy.ops.import_scene.gltf(filepath=_a['glb'])
    for _o in set(bpy.data.objects) - _before:
        if _o.type == 'MESH': _o.parent = bpy.data.objects[_a['parent']]; _o.matrix_parent_inverse = _M.Identity(4); _o.matrix_basis = _M(_a['M'])
ao=[o for o in bpy.data.objects if o.type=='ARMATURE'][0]; bat=bpy.data.objects.get('weapon_bat')
ao.data.pose_position='REST'; bpy.context.view_layer.update(); Wb=bat.matrix_world.copy() if bat else None
WEAP=__import__('os').environ.get('WEAP')
b0=set(bpy.data.objects)
if not WEAP: bpy.ops.import_scene.gltf(filepath=gear)
for o in [o for o in bpy.data.objects if o not in b0 and o.name.startswith('gw_') and o.name!='gw_spear']: o.hide_render=True
sp=bpy.data.objects.get('gw_spear') if not WEAP else None
if sp: R=Matrix.Translation((0,-shift,0))@Wb.inverted()@sp.matrix_world; sp.parent=None
for o in bpy.data.objects:
    if (o.name.startswith('weapon_') and o.name not in ['weapon_'+w for w in (WEAP or '').split(',')]) or (o.type=='MESH' and o.name.startswith('armor')): o.hide_render=True
ao.data.pose_position='POSE'
for tr in ao.animation_data.nla_tracks: tr.mute=True
act=bpy.data.actions[clip]; ao.animation_data.action=act
try: ao.animation_data.action_slot=act.slots[0]
except Exception: pass
f0,f1=act.frame_range; f=f0+(f1-f0)*fr; bpy.context.scene.frame_set(int(f),subframe=f-int(f)); bpy.context.view_layer.update()
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__))); import propfx; propfx.place(propfx.make(), fr); bpy.context.view_layer.update()
if sp: sp.matrix_world=bat.matrix_world@R
sc=bpy.context.scene; sc.render.engine='BLENDER_WORKBENCH'; sc.display.shading.light='STUDIO'; sc.display.shading.color_type='TEXTURE'; sc.render.resolution_x=360; sc.render.resolution_y=360
sc.render.film_transparent=False; sc.world=bpy.data.worlds.new('w'); sc.world.color=(0.95,0.95,0.95)
hc=Vector((0,0,.4))
if not os.environ.get('FIXED'): hc=(ao.matrix_world@ao.pose.bones[__import__('os').environ.get('FOCUS','hand.L')].head + ao.matrix_world@ao.pose.bones[__import__('os').environ.get('FOCUS','hand.L')].tail)/2
if os.environ.get('FIXED'): hc=Vector(tuple(map(float,os.environ['FIXED'].split(','))))
if os.environ.get('GROUND'):
    bpy.ops.mesh.primitive_plane_add(size=8,location=(0,0,0)); pl_=bpy.context.object; m_=bpy.data.materials.new('g'); m_.diffuse_color=(.42,.5,.36,1); pl_.data.materials.append(m_); pl_.color=(.42,.5,.36,1)
cam=bpy.data.cameras.new('c'); co=bpy.data.objects.new('c',cam); sc.collection.objects.link(co); sc.camera=co; cam.lens=50
from PIL import Image
ims=[]
views=[tuple(map(float,v.split(','))) for v in os.environ.get('VIEWS','1,0,0;1,-1,-.3;.3,-1,.1').split(';')]   # front, left side, from below, front-right
for dx,dy,dz in views:
    d=Vector((dx,dy,dz)).normalized(); co.location=hc+d*float(os.environ.get('DIST','.6'))
    co.rotation_euler=(hc-co.location).to_track_quat('-Z','Y').to_euler()
    sc.render.filepath=out+'_tmp.png'; bpy.ops.render.render(write_still=True); ims.append(Image.open(out+'_tmp.png').convert('RGB'))
W=Image.new('RGB',(360*len(ims),360),'white')
for i,im in enumerate(ims): W.paste(im,(360*i,0))
W.save(out)
