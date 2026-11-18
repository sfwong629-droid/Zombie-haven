# animdump.py RAW.glb OUT.npz [N=8]  : every clip, N phases: body vertices + joint head positions (world, Z up)
import bpy,sys,numpy as np
src,out=sys.argv[1],sys.argv[2]; N=int(sys.argv[3]) if len(sys.argv)>3 else 8
bpy.ops.wm.read_factory_settings(use_empty=True); bpy.ops.import_scene.gltf(filepath=src)
ao=next(o for o in bpy.data.objects if o.type=='ARMATURE'); body=next(o for o in bpy.data.objects if o.type=='MESH' and (o.name=='body' or o.name.startswith('body') or len([m for m in bpy.data.objects if m.type=='MESH'])==1))
me=body.data; me.calc_loop_triangles(); tri=np.array([t.vertices[:] for t in me.loop_triangles]); tl=np.array([t.loops[:] for t in me.loop_triangles]); uv=np.array([d.uv[:] for d in me.uv_layers[0].data])[tl]
img=next(i for i in bpy.data.images if i.size[0]>0 and len(i.pixels)); W,H=img.size; px=(np.array(img.pixels[:]).reshape(H,W,4)[:,:,:3]*255).astype(np.uint8)
res={'tri':tri,'uv':uv,'tex':px,'bones':np.array([b.name for b in ao.pose.bones])}
ad=ao.animation_data or ao.animation_data_create()
for tr in ad.nla_tracks: tr.mute=True
names=[]
for act in bpy.data.actions:
    if not any(True for _ in [1]): continue
    ad.action=act
    try:
        if hasattr(ad,'action_slot') and act.slots: ad.action_slot=act.slots[0]
    except Exception: pass
    f0,f1=act.frame_range; V=[];J=[];T=[]
    for i in range(N):
        f=f0+(f1-f0)*i/(N-1) if N>1 else f0
        bpy.context.scene.frame_set(int(f),subframe=f-int(f)); dg=bpy.context.evaluated_depsgraph_get(); ev=body.evaluated_get(dg); m=ev.to_mesh()
        V.append(np.array([(ev.matrix_world@v.co)[:] for v in m.vertices],np.float32)); ev.to_mesh_clear()
        J.append(np.array([list((ao.matrix_world@pb.head)[:])+list((ao.matrix_world@pb.tail)[:]) for pb in ao.pose.bones],np.float32)); T.append(f)
    res['V:'+act.name]=np.array(V); res['J:'+act.name]=np.array(J); res['F:'+act.name]=np.array([f0,f1,bpy.context.scene.render.fps]); names.append(act.name)
np.savez_compressed(out,**res); print('clips',len(names))
