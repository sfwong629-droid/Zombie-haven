# dumpstance.py -- GAME.glb OUT.json [clip]: the game's stance (first frame of melee_hold_idle): every bone's local turn, and the hip and gun offsets
import bpy, sys, json
a = sys.argv[sys.argv.index('--') + 1:]; clip = a[2] if len(a) > 2 else 'melee_hold_idle'
bpy.ops.wm.read_factory_settings(use_empty=True); bpy.ops.import_scene.gltf(filepath=a[0])
ao = next(o for o in bpy.data.objects if o.type == 'ARMATURE'); ad = ao.animation_data
for tr in ad.nla_tracks: tr.mute = True
act = bpy.data.actions[clip]; ad.action = act
try:
    if act.slots: ad.action_slot = act.slots[0]
except Exception: pass
bpy.context.scene.frame_set(int(act.frame_range[0])); bpy.context.view_layer.update()
json.dump({b.name: {'rot': list(b.rotation_quaternion), 'loc': list(b.location)} for b in ao.pose.bones}, open(a[1], 'w'))
print('STANCE', len(ao.pose.bones), 'bones')
