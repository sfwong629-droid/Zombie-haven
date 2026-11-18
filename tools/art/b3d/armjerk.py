import bpy,sys,numpy as np
bpy.ops.wm.read_factory_settings(use_empty=True); bpy.ops.import_scene.gltf(filepath=sys.argv[-1])
ao=next(o for o in bpy.data.objects if o.type=='ARMATURE'); ad=ao.animation_data
for tr in ad.nla_tracks: tr.mute=True
for c in('melee_swing_a','melee_swing_b','melee_swing_c','melee_swing_d'):
    act=bpy.data.actions[c]; ad.action=act
    try: ad.action_slot=act.slots[0]
    except Exception: pass
    f0,f1=act.frame_range; N=80; fps=bpy.context.scene.render.fps; H=[]
    for i in range(N+1):
        f=f0+(f1-f0)*i/N; bpy.context.scene.frame_set(int(f),subframe=f-int(f)); bpy.context.view_layer.update()
        H.append([list(ao.pose.bones[b].tail) for b in('hand.L','forearm.L','hand.R')]+[list(ao.pose.bones['upperarm.L'].head)])
    H=np.array(H); dt=(f1-f0)/fps/N; v=np.linalg.norm(np.diff(H[:,0]-H[:,3],axis=0),axis=1)/dt; a=np.abs(np.diff(v))/dt
    rel=H[:,0]-H[:,3]
    print(c,'dur %.2f fps %d | left hand speed max %.1f at %d%%, mean %.1f | accel max %.0f | left hand height vs shoulder min %.2f max %.2f | speed every 8th:'%((f1-f0)/fps,fps,v.max(),100*v.argmax()/N,v.mean(),a.max(),rel[:,2].min(),rel[:,2].max()),np.round(v[::8],1))
