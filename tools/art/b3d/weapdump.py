# weapdump.py RAW.glb OUT.npz N clip:weapon,clip:weapon...   body + weapon mesh per phase, plus head-clearance numbers
# 3D.207: weapon 'gear-sledge' (etc.) is the real weapon model from ZH_GEAR (the decompressed gear_weapons.glb), placed on the bat as the game places it
# (js/render3d.js fitGear: its position relative to the bat in the rest pose).
import bpy,sys,numpy as np
src,out,N=sys.argv[-4],sys.argv[-3],int(sys.argv[-2]); pairs=[p.split(':') for p in sys.argv[-1].split(',')]
bpy.ops.wm.read_factory_settings(use_empty=True); bpy.ops.import_scene.gltf(filepath=src)
ao=next(o for o in bpy.data.objects if o.type=='ARMATURE'); body=bpy.data.objects['body']
me=body.data; me.calc_loop_triangles(); tri=np.array([t.vertices[:] for t in me.loop_triangles]); tl=np.array([t.loops[:] for t in me.loop_triangles]); uv=np.array([d.uv[:] for d in me.uv_layers[0].data])[tl]
img=next(i for i in bpy.data.images if i.size[0]>0 and len(i.pixels)); W,H=img.size; px=(np.array(img.pixels[:]).reshape(H,W,4)[:,:,:3]*255).astype(np.uint8); px[0:3,0:3]=(70,70,75)
gi=body.vertex_groups['head'].index; hv=np.array([any(g.group==gi and g.weight>.6 for g in v.groups) for v in me.vertices])
res={'tex':px,'bones':np.array([b.name for b in ao.pose.bones])}
ad=ao.animation_data
import os
GR={}
if os.environ.get('ZH_GEAR'):
    _b=set(bpy.data.objects); bpy.ops.import_scene.gltf(filepath=os.environ['ZH_GEAR']); bat0=bpy.data.objects['weapon_bat']
    ao.data.pose_position='REST'; bpy.context.view_layer.update(); _Wb=bat0.matrix_world.copy()
    from mathutils import Matrix as _M
    for o in [o for o in bpy.data.objects if o not in _b and o.name.startswith('gw_')]: GR[o.name[3:]]=(o,(_M.Translation((0,-float(os.environ.get("ZH_SPEAR_SHIFT",".04")),0)) if o.name=='gw_spear' else _M())@_Wb.inverted()@o.matrix_world); o.hide_set(True)   # (3D.212) the spear held near its end, as fitGear does
    ao.data.pose_position='POSE'; bpy.context.view_layer.update()
for tr in ad.nla_tracks: tr.mute=True
for clip,wn in pairs:
    act=bpy.data.actions[clip]; ad.action=act
    try:
        if act.slots: ad.action_slot=act.slots[0]
    except Exception: pass
    gear=GR.get(wn[5:]) if wn.startswith('gear-') else None
    w=gear[0] if gear else bpy.data.objects.get('weapon_'+wn) if wn!='none' else None
    if w: wm=w.data; wm.calc_loop_triangles(); wt=np.array([t.vertices[:] for t in wm.loop_triangles])+len(me.vertices)
    f0,f1=act.frame_range; V=[];J=[];M=[];DD=[];PX=[]
    for i in range(N):
        f=f0+(f1-f0)*i/(N-1); bpy.context.scene.frame_set(int(f),subframe=f-int(f)); dg=bpy.context.evaluated_depsgraph_get(); ev=body.evaluated_get(dg); m=ev.to_mesh()
        v=np.array([(ev.matrix_world@x.co)[:] for x in m.vertices],np.float32); ev.to_mesh_clear()
        hc=v[hv].mean(0); hr=float(np.median(np.linalg.norm(v[hv]-hc,axis=1)))
        jj=np.array([list((ao.matrix_world@pb.head)[:])+list((ao.matrix_world@pb.tail)[:]) for pb in ao.pose.bones],np.float32); J.append(jj); PX.append(np.array((ao.matrix_world.to_3x3()@ao.pose.bones['hand.L'].matrix.to_3x3()).col[0].normalized()[:],np.float32))   # (3D.213) the left palm's direction (+X of hand.L is its palm side)
        wd=9.
        if w:
            mw=(bpy.data.objects['weapon_bat'].evaluated_get(dg).matrix_world@gear[1]) if gear else w.evaluated_get(dg).matrix_world; wv=np.array([(mw@x.co)[:] for x in wm.vertices],np.float32)
            # dense samples on weapon triangles
            P=wv[wt-len(me.vertices)]; S=np.concatenate([wv,P.mean(1),(P[:,0]+P[:,1])/2,(P[:,1]+P[:,2])/2,(P[:,0]+P[:,2])/2]); wd=float(np.linalg.norm(S-hc,axis=1).min()); v=np.concatenate([v,wv])
        if w:
            if gear: bw=bpy.data.objects['weapon_bat']; bm=bw.evaluated_get(dg).matrix_world; lo=np.array([x.co[:] for x in bw.data.vertices]); ax=int(np.argmax(np.ptp(lo,axis=0))); a_=np.array((bm@bw.data.vertices[int(lo[:,ax].argmin())].co)[:]); b_=np.array((bm@bw.data.vertices[int(lo[:,ax].argmax())].co)[:]); DD.append((b_-a_)/np.linalg.norm(b_-a_))
            else: ax=int(np.argmax(np.ptp(np.array([x.co[:] for x in wm.vertices]),axis=0))); lo=np.array([x.co[:] for x in wm.vertices]); a_=wv[int(lo[:,ax].argmin())]; b_=wv[int(lo[:,ax].argmax())]; DD.append((b_-a_)/np.linalg.norm(b_-a_))
        M.append([hr,wd]); V.append(v)
    res['V:'+clip]=np.array(V); res['J:'+clip]=np.array(J); res['PL:'+clip]=np.array(PX); res['M:'+clip]=np.array(M); res['F:'+clip]=np.array([f0,f1,bpy.context.scene.render.fps])
    res['D:'+clip]=np.array(DD)   # the weapon's direction at each moment
    res['T:'+clip]=np.concatenate([tri,wt]) if w else tri
    res['NB:'+clip]=np.array(len(me.vertices))   # how many of the vertices are the body's (the rest are the weapon's)
    res['U:'+clip]=np.concatenate([uv,np.zeros((len(wt),3,2))+.0005]) if w else uv
np.savez_compressed(out,**res); print('ok')
