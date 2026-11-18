# retarget.py RAW.glb BVH f0 T CLIP OUT.npz [N]  : fit a recorded (BVH) cycle onto the survivor rig as action CLIP+'_new', dump strips data for old and new
import bpy,sys,numpy as np,math
from mathutils import Matrix,Vector,Quaternion
import os; sys.path.insert(0,os.path.dirname(os.path.abspath(__file__))); import bvh
a=sys.argv[sys.argv.index('--')+1:]; src,bv,f0,T,clip,out=a[0],a[1],int(a[2]),int(a[3]),a[4],a[5]; N=int(a[6]) if len(a)>6 else 9
n,par,off,ch,D,dt=bvh.load(bv); P=np.array([bvh.fk(n,par,off,ch,r) for r in D[f0:f0+T+1]]); I=n.index
# --- mocap -> rig axes (rig: +X left, -Y forward, +Z up)
h=P[:,0]; f=h[-1]-h[0]; f[1]=0; dist=np.linalg.norm(f); f/=dist; u=np.array([0,1.,0]); s=np.cross(f,u)
def W(v): return np.stack([-(v@s),-(v@f),v@u],-1)
Q=W(P); hip=Q[:,0].copy(); Q=Q-hip[:,None]          # joints relative to hips, rig axes
k=np.linspace(0,1,T+1)[:,None,None]; Q=Q-k*(Q[-1]-Q[0])   # close the loop
tt=np.linspace(0,1,T+1); hx=hip[:,0]-(hip[0,0]+tt*(hip[-1,0]-hip[0,0])); hy=hip[:,1]-(hip[0,1]+tt*(hip[-1,1]-hip[0,1])); hx-=hx.mean(); hy-=hy.mean()
LEG=np.linalg.norm(Q[0,I('LeftLeg')]-Q[0,I('LeftUpLeg')])+np.linalg.norm(Q[0,I('LeftFoot')]-Q[0,I('LeftLeg')])
ankM=np.minimum(W(P)[:,I('LeftFoot'),2],W(P)[:,I('RightFoot'),2]); ank0=np.percentile(np.concatenate([W(P)[:,I('LeftFoot'),2],W(P)[:,I('RightFoot'),2]]),8)
bpy.ops.wm.read_factory_settings(use_empty=True); bpy.ops.import_scene.gltf(filepath=src)
ao=next(o for o in bpy.data.objects if o.type=='ARMATURE'); body=bpy.data.objects['body']; BN=ao.data.bones
rest={b.name:b.matrix_local.copy() for b in BN}
SC=(BN['thigh.L'].length+BN['shin.L'].length)/LEG; print('scale',SC,'stride per cycle',dist*SC,'seconds',T*dt)
def nz(v): v=np.asarray(v,float); return v/max(np.linalg.norm(v),1e-9)
def frame(y,x):   # bone rotation with Y along y, X as close to x as possible
    y=nz(y); x=nz(x-y*(x@y)); z=np.cross(x,y); return Matrix(np.stack([x,y,z],1).tolist())
def sstep(a,b,x): t=min(1,max(0,(x-a)/(b-a))); return t*t*(3-2*t)
def footflat(side):
    d=Q[:,I(side+'ToeBase')]-Q[:,I(side+'Foot')]; z=W(P)[:,I(side+'Foot'),2]; i=np.argsort(z)[:max(3,T//6)]; dd=d[i].mean(0); return math.atan2(-dd[2],-dd[1])
FLAT={'Left':footflat('Left'),'Right':footflat('Right')}; ry=rest['foot.L'].col[1]; RESTP=math.atan2(-ry[2],-ry[1]); print('foot flat pitch',FLAT,'rest',RESTP)
def solve(i):
    q=Q[i]; J=lambda nm:q[I(nm)]; R={}
    px=nz(J('LeftUpLeg')-J('RightUpLeg')); pup=nz(J('Spine1')-J('Hips')); pup=nz(pup*.6+np.array([0,0,.4])); R['pelvis']=frame(pup,px)
    cx=nz(J('LeftArm')-J('RightArm')); R['chest']=frame(nz(J('Neck')-J('Spine')),cx)
    R['neck']=frame(nz(J('Head')-J('Neck')),cx); R['head']=frame(nz(J('Head_end')-J('Head')),cx)
    for sd,S in(('L','Left'),('R','Right')):
        dt_=nz(J(S+'Leg')-J(S+'UpLeg')); ds=nz(J(S+'Foot')-J(S+'Leg')); nn=np.cross(dt_,ds); ang=math.degrees(math.asin(min(1,np.linalg.norm(nn)))); w=sstep(8,25,ang)
        hh=nz(w*(-nz(nn))+(1-w)*(-px)); R['thigh.'+sd]=frame(dt_,hh); R['shin.'+sd]=frame(ds,hh)
        d=J(S+'ToeBase')-J(S+'Foot'); pit=math.atan2(-d[2],math.hypot(d[0],d[1]))-FLAT[S]+RESTP; hd=nz([d[0],d[1],0]); hd=nz(hd*.6+np.array([0,-.4,0]))
        R['foot.'+sd]=frame([hd[0]*math.cos(pit),hd[1]*math.cos(pit),-math.sin(pit)],hh)
        du=nz(J(S+'ForeArm')-J(S+'Arm')); df=nz(J(S+'Hand')-J(S+'ForeArm')); nn=np.cross(du,df); ang=math.degrees(math.asin(min(1,np.linalg.norm(nn)))); w=sstep(8,25,ang)
        hh=nz(w*nz(nn)+(1-w)*(-cx)); R['upperarm.'+sd]=frame(du,hh); R['forearm.'+sd]=frame(df,hh)
    # stance height: the lower ankle sits where the recorded one does (scaled)
    low=9
    for sd in'LR':
        hp=R['pelvis']@(rest['pelvis'].to_3x3().inverted()@(rest['thigh.'+sd].translation-rest['pelvis'].translation)); az=hp[2]+BN['thigh.'+sd].length*R['thigh.'+sd].col[1][2]+BN['shin.'+sd].length*R['shin.'+sd].col[1][2]; low=min(low,az)
    pz=rest['foot.L'].translation[2]+SC*(ankM[i]-ank0)-low
    return R,Vector((hx[i]*SC,hy[i]*SC,pz))
fps=bpy.context.scene.render.fps; nf=round(T*dt*fps); old=bpy.data.actions[clip]
def fcs(act):
    try: return list(act.fcurves)
    except Exception: return [fc for l in act.layers for st in l.strips for cb in st.channelbags for fc in cb.fcurves]
keep={}
for fc in fcs(old): keep[(fc.data_path,fc.array_index)]=fc.evaluate(0)
new=bpy.data.actions.new(clip+'_new'); ad=ao.animation_data
for tr in ad.nla_tracks: tr.mute=True
ad.action=new
order=[b.name for b in BN]; prevq={}
for fr in range(nf+1):
    i=min(T,round(fr/nf*T)) if fr<nf else 0
    R,ploc=solve(i); posed={}
    for b in order:
        pb=ao.pose.bones[b]; bn=BN[b]
        base=(posed[bn.parent.name]@rest[bn.parent.name].inverted()@rest[b]) if bn.parent else rest[b].copy()
        if b in R:
            M=R[b].to_4x4(); M.translation=base.translation if b!='pelvis' else ploc; 
        else: M=base.copy()
        if b in R:
            basis=base.inverted()@M; pb.rotation_quaternion=basis.to_quaternion()
            if b=='pelvis': pb.location=basis.translation; pb.keyframe_insert('location',frame=fr)
        else:
            qv=[keep.get((f'pose.bones["{b}"].rotation_quaternion',k),1 if k==0 else 0) for k in range(4)]; pb.rotation_quaternion=Quaternion(qv)
            if b=='gun': pb.location=Vector([keep.get((f'pose.bones["{b}"].location',k),0) for k in range(3)]); pb.keyframe_insert('location',frame=fr)
            M=base@Matrix.LocRotScale(pb.location if b=='gun' else None,pb.rotation_quaternion,None)
        q=pb.rotation_quaternion.copy()
        if b in prevq and q.dot(prevq[b])<0: q.negate(); pb.rotation_quaternion=q
        prevq[b]=q; pb.keyframe_insert('rotation_quaternion',frame=fr); posed[b]=M
for fc in fcs(new):
    for kp in fc.keyframe_points: kp.interpolation='LINEAR'
new.frame_range if False else None
if '--save' in sys.argv: bpy.ops.wm.save_as_mainfile(filepath=out.replace('.npz','.blend'))
# --- dump old and new for strips
me=body.data; me.calc_loop_triangles(); tri=np.array([t.vertices[:] for t in me.loop_triangles]); tl=np.array([t.loops[:] for t in me.loop_triangles]); uv=np.array([d.uv[:] for d in me.uv_layers[0].data])[tl]
img=next(i for i in bpy.data.images if i.size[0]>0 and len(i.pixels)); Wd,Hd=img.size; px=(np.array(img.pixels[:]).reshape(Hd,Wd,4)[:,:,:3]*255).astype(np.uint8)
res={'tri':tri,'uv':uv,'tex':px,'bones':np.array(order)}
for nm,act,fa,fb in((clip,old,*old.frame_range),(clip+'_new',new,0,nf)):
    ad.action=act
    try:
        if act.slots: ad.action_slot=act.slots[0]
    except Exception: pass
    V=[];J=[]
    for i in range(N):
        fr=fa+(fb-fa)*i/(N-1); bpy.context.scene.frame_set(int(fr),subframe=fr-int(fr)); dg=bpy.context.evaluated_depsgraph_get(); ev=body.evaluated_get(dg); m=ev.to_mesh()
        V.append(np.array([(ev.matrix_world@v.co)[:] for v in m.vertices],np.float32)); ev.to_mesh_clear()
        J.append(np.array([list((ao.matrix_world@pb.head)[:])+list((ao.matrix_world@pb.tail)[:]) for pb in ao.pose.bones],np.float32))
    res['V:'+nm]=np.array(V); res['J:'+nm]=np.array(J); res['F:'+nm]=np.array([fa,fb,fps])
np.savez_compressed(out,**res); print('done',nf)
