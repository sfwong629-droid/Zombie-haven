# hoefix.py -- RAW.glb OUT.json : the hoe was held with its blade turned away from the ground, so the digger struck with the shaft's end (owner, W162).
# Finds the turn about the shaft that points the blade at the ground at the lowest point of work_dig, and writes the hoe node's new place (glTF local TRS).
import bpy,sys,json,math,numpy as np
from mathutils import Vector,Matrix,Quaternion
a=sys.argv[sys.argv.index('--')+1:]; src,out=a[0],a[1]
bpy.ops.wm.read_factory_settings(use_empty=True); bpy.ops.import_scene.gltf(filepath=src)
ao=[o for o in bpy.data.objects if o.type=='ARMATURE'][0]; hoe=bpy.data.objects['weapon_hoe']
V=np.array([v.co[:] for v in hoe.data.vertices]); c=V.mean(0); u,s,vt=np.linalg.svd(V-c); ax=vt[0]
# shaft = verts close to the long axis; blade = the rest
P=V-c; t=P@ax; r=np.linalg.norm(P-np.outer(t,ax),axis=1); rs=np.median(r); blade=V[r>rs*2.5]; shaft=V[r<=rs*2.5]
ax=np.linalg.svd(shaft-shaft.mean(0))[2][0]; print('HOE shaft axis',np.round(ax,4))
sc=shaft.mean(0); bt=(blade.mean(0)-sc)@ax; boff=(blade.mean(0)-sc)-bt*ax    # the blade's offset from the shaft line, mesh space
p0=Vector(sc); axv=Vector(ax)
for tr in ao.animation_data.nla_tracks: tr.mute=True
act=bpy.data.actions['work_dig']; ao.animation_data.action=act
try: ao.animation_data.action_slot=act.slots[0]
except Exception: pass
f0,f1=act.frame_range; best=None
def blade_end(): return hoe.matrix_world@Vector(sc+bt*ax)
lo=min(np.arange(f0,f1+.01,.5),key=lambda f:(bpy.context.scene.frame_set(int(f),subframe=f-int(f)),bpy.context.view_layer.update(),blade_end().z)[2])
bpy.context.scene.frame_set(int(lo),subframe=lo-int(lo)); bpy.context.view_layer.update(); M=hoe.matrix_world.copy()
def down(th):
    R=Matrix.Rotation(th,4,axv); w=(M.to_3x3()@(R.to_3x3()@Vector(boff))).normalized(); return w
th=min(np.radians(np.arange(0,360,1)),key=lambda t:down(t).z)
print('HOE blade verts',len(blade),'offset',np.round(boff,3),'strike frame',lo,'blade dir now',np.round(down(0),2),'turn',round(math.degrees(th)),'deg -> dir',np.round(down(th),2))
# the hoe also went far into the ground (the shaft's end 26 cm under it; it is 0.99 long, nearly as tall as the digger). Sliding it up through the hand put the
# shaft's other end through the body, so the shaft is made shorter instead (from the hand's end), until only the blade's edge bites (ZH_BITE under the ground).
import os
bite=float(os.environ.get('ZH_BITE','.07')); R3=Matrix.Rotation(th,4,axv); 
sgn=1 if bt>0 else -1; tt=(shaft-sc)@ax; butt=Vector(sc+ax*(tt.min() if sgn>0 else tt.max()))      # the end away from the blade: the hand's end
def S(f): return Matrix.Translation(butt)@Matrix.Scale(f,4,axv)@Matrix.Translation(-butt)
def lowest(f): return min((M@(Matrix.Translation(p0)@R3@Matrix.Translation(-p0)@S(f)@Vector(v))).z for v in blade)
a_,b_=.4,1.
for _ in range(30):
    m_=(a_+b_)/2
    if lowest(m_)<-bite: b_=m_
    else: a_=m_
f=a_ if lowest(1)<-bite else 1.
L=tt.max()-tt.min(); print('HOE shaft %.2f -> %.2f long (x%.3f); blade lowest %.3f -> %.3f'%(L,L*f,f,lowest(1),lowest(f)))
json.dump({'turn':math.degrees(th),'axis':list(ax),'point':list(sc),'butt':list(butt),'shrink':f},open(out,'w'))
