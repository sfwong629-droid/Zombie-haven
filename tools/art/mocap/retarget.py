# retarget.py RAW.glb BVH f0 T CLIP OUT.npz [N]  : fit a recorded (BVH) cycle onto the survivor rig as action CLIP+'_new', dump strips data for old and new
import bpy,sys,numpy as np,math,os
from mathutils import Matrix,Vector,Quaternion
sys.path.insert(0,'/home/claude/zwork/mocap'); import bvh
a=sys.argv[sys.argv.index('--')+1:]; src,bv,f0,T,clip,out=a[0],a[1],int(a[2]),int(a[3]),a[4],a[5]; N=int(a[6]) if len(a)>6 else 9
n,par,off,ch,D,dt=bvh.load(bv); _pm=[bvh.fk(n,par,off,ch,r,True) for r in D[f0:f0+T+1]]; P=np.array([x[0] for x in _pm]); I=n.index
HM={S:np.array([x[1][n.index(S+'Hand')] for x in _pm]) for S in('Left','Right')}
if os.environ.get('ZH_MIRROR'):   # 3D.208: the recording mirrored left for right (owner: two-handed B, the backhand return, is swing A the other way)
    _perm=[n.index(x.replace('Left','#').replace('Right','Left').replace('#','Right')) if ('Left' in x or 'Right' in x) and x.replace('Left','#').replace('Right','Left').replace('#','Right') in n else i for i,x in enumerate(n)]
    P=P[:,_perm].copy(); P[:,:,0]*=-1; _S=np.diag([-1.,1,1]); HM={'Left':np.einsum('ij,fjk,kl->fil',_S,HM['Right'],_S),'Right':np.einsum('ij,fjk,kl->fil',_S,HM['Left'],_S)}   # the hands' full recorded turn (world, 3x3 per frame)
# --- mocap -> rig axes (rig: +X left, -Y forward, +Z up)
import os
h=P[:,0]; u=np.array([0,1.,0])
if os.environ.get('ZH_STAND') or os.environ.get('ZH_FACEHIPS'):   # (ZH_FACEHIPS, 3D.207: the facing from the hips but the recorded legs kept: a swing with a step) a standing recording: no travel, so the facing comes from the hips (left hip - right hip, crossed with up)
    lf=(P[:,I('LeftUpLeg')]-P[:,I('RightUpLeg')]).mean(0); f=np.cross(lf,u); f[1]=0; f/=np.linalg.norm(f); dist=0.
else: f=h[-1]-h[0]; f[1]=0; dist=np.linalg.norm(f); f/=dist
s=np.cross(f,u)
def W(v): return np.stack([-(v@s),-(v@f),v@u],-1)
Wm=lambda v: np.array([-(v@s),-(v@f),v@u])
Q=W(P); hip=Q[:,0].copy(); Q=Q-hip[:,None]          # joints relative to hips, rig axes
ONESHOT=bool(os.environ.get('ZH_ONESHOT'))   # an action played once (a swing): no loop to close, the last frame is the recording's own
if not ONESHOT: k=np.linspace(0,1,T+1)[:,None,None]; Q=Q-k*(Q[-1]-Q[0])   # close the loop
RET=float(os.environ.get('ZH_RETURN','0'))   # a one-shot action: over this last share of the clip the body eases back to the pose it started in (so the swing ends in the stance it began from)
pass   # (done on the finished pose, after the keys are made: see below)
tt=np.linspace(0,1,T+1); hx=hip[:,0]-(hip[0,0]+tt*(hip[-1,0]-hip[0,0])); hy=hip[:,1]-(hip[0,1]+tt*(hip[-1,1]-hip[0,1])); hx-=hx.mean(); hy-=hy.mean()
LEG=np.linalg.norm(Q[0,I('LeftLeg')]-Q[0,I('LeftUpLeg')])+np.linalg.norm(Q[0,I('LeftFoot')]-Q[0,I('LeftLeg')])
ankM=np.minimum(W(P)[:,I('LeftFoot'),2],W(P)[:,I('RightFoot'),2]); ank0=np.percentile(np.concatenate([W(P)[:,I('LeftFoot'),2],W(P)[:,I('RightFoot'),2]]),8)
bpy.ops.wm.read_factory_settings(use_empty=True); bpy.ops.import_scene.gltf(filepath=src)
ao=next(o for o in bpy.data.objects if o.type=='ARMATURE'); body=bpy.data.objects['body']; BN=ao.data.bones
rest={b.name:b.matrix_local.copy() for b in BN}
SC=(BN['thigh.L'].length+BN['shin.L'].length)/LEG; print('scale',SC,'ground per cycle',dist*SC,'seconds',T*dt,'GROUND SPEED for STRIDE in render3d.js: %.3f'%(dist*SC/(T*dt)))
def sstep(a,b,x): t=min(1,max(0,(x-a)/(b-a))); return t*t*(3-2*t)
def nz(v): v=np.asarray(v,float); return v/max(np.linalg.norm(v),1e-9)
def frame(y,x):   # bone rotation with Y along y, X as close to x as possible
    y=nz(y); x=nz(x-y*(x@y)); z=np.cross(x,y); return Matrix(np.stack([x,y,z],1).tolist())

def footflat(side):
    d=Q[:,I(side+'ToeBase')]-Q[:,I(side+'Foot')]; z=W(P)[:,I(side+'Foot'),2]; i=np.argsort(z)[:max(3,T//6)]; dd=d[i].mean(0); return math.atan2(-dd[2],-dd[1])
FLAT={'Left':footflat('Left'),'Right':footflat('Right')}; ry=rest['foot.L'].col[1]; RESTP=math.atan2(-ry[2],-ry[1]); print('foot flat pitch',FLAT,'rest',RESTP)
HANDS=bool(os.environ.get('ZH_HANDS'))
# --- more force (owner, 18 Nov: "a bit more force and wide so the player can see it"): ZH_TWIST turns the chest and hips further than recorded, ZH_REACH straightens the weapon arm
# through the strike (a wider arc), ZH_LUNGE moves the hips into the blow, ZH_DUR + ZH_STRIKE give the strike a short share of the clip (a slow wind-up, a fast hit).
TWIST=float(os.environ.get('ZH_TWIST','1')); REACH=float(os.environ.get('ZH_REACH','0')); LUNGE=float(os.environ.get('ZH_LUNGE','0')); DUR=float(os.environ.get('ZH_DUR','0'))
_hv=np.linalg.norm(np.diff(Q[:,I('RightHand')],axis=0),axis=1); _hv=np.convolve(_hv,np.ones(9)/9,'same'); _pk=int(_hv.argmax()); _thr=_hv[_pk]*.4
S0=_pk
while S0>0 and _hv[S0]>_thr: S0-=1
S1=_pk
while S1<T-1 and _hv[S1]>_thr: S1+=1
CUT=bool(os.environ.get('ZH_CUT'))
if CUT: S1=min(S1,_pk+int(os.environ.get('ZH_AFTER','14')))
def strikeW(i): return sstep(S0-18,S0,i)*(1-sstep(S1,S1+22,i))
_sh=Q[:,I('LeftArm')]-Q[:,I('RightArm')]; _phi=np.unwrap(np.arctan2(_sh[:,1],_sh[:,0])); PHI0=float(_phi[0])
print('strike: recording frames',S0,'to',S1,'of',T,'; chest turn range (deg)',round(float(np.degrees(_phi.min()-PHI0))),round(float(np.degrees(_phi.max()-PHI0))))
STAND=bool(os.environ.get('ZH_STAND')); HIPS=float(os.environ.get('ZH_HIPS','.3')); FOOTBACK=float(os.environ.get('ZH_FOOTBACK','0')); SWAY=float(os.environ.get('ZH_SWAY','1')); TOE=float(os.environ.get('ZH_TOE','7'))   # SWAY: how much of the recorded hip sway to keep; TOE: degrees the feet turn out
def _m(a,b): v=Q[:,I(a)]-Q[:,I(b)]; v/=np.linalg.norm(v,axis=1,keepdims=True); return v.mean(0)
NDM=_m('Head','Neck'); HDM=_m('Head_end','Head')
def solve(i):
    q=Q[i]; J=lambda nm:q[I(nm)]; R={}
    px=nz(J('LeftUpLeg')-J('RightUpLeg')); pup=nz(J('Spine1')-J('Hips')); pup=nz(pup*.6+np.array([0,0,.4])); 
    if STAND: px=nz(px*HIPS+np.array([1.,0,0])*(1-HIPS)); pup=nz(pup*HIPS+np.array([0,0,1.])*(1-HIPS))   # standing: only part of the recorded hip tilt and turn, or the planted legs must bend a lot to follow
    R['pelvis']=frame(pup,px)
    dphi=(TWIST-1)*float(_phi[i]-PHI0); RZ=np.array(Matrix.Rotation(dphi,3,'Z')); sw=strikeW(i)
    cx=nz(J('LeftArm')-J('RightArm')); cup=nz(J('Neck')-J('Spine'))
    if TWIST!=1: cx=RZ@cx; cup=RZ@cup; R['pelvis']=Matrix.Rotation(dphi*.45,3,'Z')@R['pelvis']
    if LUNGE: cup=nz(cup+np.array([0,-.22*LUNGE*sw,0]))   # lean into the blow
    R['chest']=frame(cup,cx)
    nd=nz(J('Head')-J('Neck')); hd=nz(J('Head_end')-J('Head'))
    if STAND and not HANDS: nd=nz(nd-NDM+np.array([0,-.05,1.])); hd=nz(hd-HDM+np.array([0,-.04,1.]))   # standing: the head keeps its small recorded movements around a level, forward-looking pose (people in the recordings look up, down or aside)
    R['neck']=frame(nd,cx); R['head']=frame(hd,cx)
    for sd,S in(('L','Left'),('R','Right')):
        dt_=nz(J(S+'Leg')-J(S+'UpLeg')); ds=nz(J(S+'Foot')-J(S+'Leg')); nn=np.cross(dt_,ds); ang=math.degrees(math.asin(min(1,np.linalg.norm(nn)))); w=sstep(8,25,ang)
        hh=nz(w*(-nz(nn))+(1-w)*(-px)); R['thigh.'+sd]=frame(dt_,hh); R['shin.'+sd]=frame(ds,hh)
        d=J(S+'ToeBase')-J(S+'Foot'); pit=math.atan2(-d[2],math.hypot(d[0],d[1]))-FLAT[S]+RESTP; hd=nz([d[0],d[1],0]); hd=nz(hd*.6+np.array([0,-.4,0]))
        R['foot.'+sd]=frame([hd[0]*math.cos(pit),hd[1]*math.cos(pit),-math.sin(pit)],hh)
        du=nz(J(S+'ForeArm')-J(S+'Arm')); df=nz(J(S+'Hand')-J(S+'ForeArm'))
        if TWIST!=1: du=RZ@du; df=RZ@df
        if REACH and sd=='R': dd_=nz(du*np.linalg.norm(J(S+'ForeArm')-J(S+'Arm'))+df*np.linalg.norm(J(S+'Hand')-J(S+'ForeArm'))); a_=REACH*sw; du=nz(du*(1-a_)+dd_*a_); df=nz(df*(1-a_)+dd_*a_)
        nn=np.cross(du,df); ang=math.degrees(math.asin(min(1,np.linalg.norm(nn)))); w=sstep(8,25,ang)
        hh=nz(w*nz(nn)+(1-w)*(-cx)); R['upperarm.'+sd]=frame(du,hh); R['forearm.'+sd]=frame(df,hh)
        if HANDS:   # the recorded wrist, turn and all. In the recording's rest pose (a T) the fingers point out to the side and the palm faces down;
            m=HM[S][i]; sg=1. if sd=='L' else -1.   # on the model the hand bone's Y runs along the fingers and its X is the palm's normal on the left hand, the back of the hand on the right
            hy_,hx_=Wm(m@np.array([sg,0,0])),Wm(m@np.array([0,-sg,0]))
            if TWIST!=1: hy_,hx_=RZ@hy_,RZ@hx_
            R['hand.'+sd]=frame(hy_,hx_)
    # stance height: the lower ankle sits where the recorded one does (scaled)
    low=9
    for sd in'LR':
        hp=R['pelvis']@(rest['pelvis'].to_3x3().inverted()@(rest['thigh.'+sd].translation-rest['pelvis'].translation)); az=hp[2]+BN['thigh.'+sd].length*R['thigh.'+sd].col[1][2]+BN['shin.'+sd].length*R['shin.'+sd].col[1][2]; low=min(low,az)
    pz=rest['foot.L'].translation[2]+SC*(ankM[i]-ank0)-low
    if LEAN:   # lean the body back (carrying a load): chest by LEAN degrees, pelvis by a third of it; the head stays level
        for b,k in(('chest',1.),('pelvis',.35)): R[b]=Matrix.Rotation(-math.radians(LEAN*k),3,'X')@R[b]
    if STAND and FEET:
        for b in('pelvis','chest'): R[b]=Matrix.Rotation(FEET[b],3,'Z')@R[b]
    pv=Vector((hx[i]*SC,hy[i]*SC,pz))
    if STAND:
        # Standing: the library's standing recordings have unusable knees (20 to 60 degrees of bend while standing still), so the legs are solved instead:
        # both feet planted where the model's feet rest, the hips swaying as recorded, each knee as straight as the sway allows.
        sx,sy=hx[i]*SC*SWAY,hy[i]*SC*SWAY; hp={}; pz=9.
        if LUNGE: sy-=.07*LUNGE*strikeW(i)   # the hips move into the blow
        if FEET: sy+=(FEET['L'][0][1]+FEET['R'][0][1])/2-rest['foot.L'].translation[1]+FOOTBACK   # the hips sit over the middle of the two feet
        for sd in'LR':
            off=np.array(R['pelvis']@(rest['pelvis'].to_3x3().inverted()@(rest['thigh.'+sd].translation-rest['pelvis'].translation))); an=np.array(rest['foot.'+sd].translation)
            if FEET: an=np.array([FEET[sd][0][0],FEET[sd][0][1],an[2]])
            Lg=(BN['thigh.'+sd].length+BN['shin.'+sd].length)*.998
            dx,dy=an[0]-(sx+off[0]),an[1]-(sy+off[1]); pz=min(pz,an[2]+math.sqrt(max(1e-9,Lg*Lg-dx*dx-dy*dy))-off[2]); hp[sd]=(off,an)
        for sd in'LR':
            off,an=hp[sd]; h0=np.array([sx,sy,pz])+off; dv=an-h0; dd=min(np.linalg.norm(dv),(BN['thigh.'+sd].length+BN['shin.'+sd].length)*.9999); l1,l2=BN['thigh.'+sd].length,BN['shin.'+sd].length; dn=dv/np.linalg.norm(dv)
            x=(l1*l1-l2*l2+dd*dd)/(2*dd); y=math.sqrt(max(0.,l1*l1-x*x)); fw=np.array([0,-1.,0]); fw=nz(fw-dn*(fw@dn)); kn=h0+dn*x+fw*y
            hh=np.array([-1.,0,0]); R['thigh.'+sd]=frame(kn-h0,hh); R['shin.'+sd]=frame(an-kn,hh)
            yw=math.radians(TOE)*(1 if sd=='L' else -1)
            if FEET: yw=-FEET[sd][1]
            ry_=np.array(rest['foot.'+sd].col[1][:3]); c_,s_=math.cos(yw),math.sin(yw); R['foot.'+sd]=frame([ry_[0]*c_-ry_[1]*s_,ry_[0]*s_+ry_[1]*c_,ry_[2]],hh)
        pv=Vector((sx,sy,pz))
    for b in list(R):
        if any(b.startswith(k) for k in KEEPB): del R[b]
    return R,pv
import os; LEAN=float(os.environ.get('ZH_LEAN','0')); KEEPB=[k for k in os.environ.get('ZH_KEEP','').split(',') if k]   # bones left as the old clip has them at its first frame (ZH_KEEP=upperarm,forearm,hand : arms keep holding the crate)
fps=bpy.context.scene.render.fps; SPEED=float(os.environ.get('ZH_SPEED','1')); nf=round(T*dt*fps/SPEED); old=bpy.data.actions[clip]   # ZH_SPEED: play the recording this many times faster (a practice swing done slowly)
if DUR: nf=round(DUR*fps)
SHARE=[float(x) for x in os.environ.get('ZH_STRIKE','.46,.64').split(',')]   # the strike's place in the clip (start, end, as shares of its length)
def warp(u):
    if not DUR: return u*T
    a0,a1=SHARE
    return np.interp(u,[0,a0,a1,1],[0,S0,S1,S1 if CUT else T])   # ZH_CUT: nothing of the recording after the strike is used; the return eases back from the end of the blow
OLDT=bool(os.environ.get('ZH_OLDTIME'))   # the new clip keeps the old clip's length, and the kept bones (ZH_KEEP) keep their old movement over time (a wave, a reload) instead of the first frame
of0,of1=old.frame_range
if OLDT: nf=int(round(of1-of0))
FEET=None
if os.environ.get('ZH_FEET')=='old':   # standing: plant the feet where the old clip has them (a fighting stance with one foot forward)
    _ad=ao.animation_data; _ad.action=old
    try:
        if old.slots: _ad.action_slot=old.slots[0]
    except Exception: pass
    bpy.context.scene.frame_set(int(of0)); bpy.context.view_layer.update(); FEET={}
    for sd in'LR':
        pb=ao.pose.bones['foot.'+sd]; y=pb.matrix.col[1]; FEET[sd]=(np.array(pb.head[:]),math.atan2(-y[0],-y[1]))
    for b in('pelvis','chest'): x=ao.pose.bones[b].matrix.col[0]; FEET[b]=math.atan2(x[1],x[0])   # how far the old stance turns the hips and the chest
def fcs(act):
    try: return list(act.fcurves)
    except Exception: return [fc for l in act.layers for st in l.strips for cb in st.channelbags for fc in cb.fcurves]
keepfc={(fc.data_path,fc.array_index):fc for fc in fcs(old)}
class _K:
    fr=0
    def get(self,k,d):
        fc=keepfc.get(k); return fc.evaluate(of0+(of1-of0)*self.fr/nf if OLDT else 0) if fc else d
keep=_K()
new=bpy.data.actions.new(clip+'_new'); ad=ao.animation_data
for tr in ad.nla_tracks: tr.mute=True
ad.action=new
order=[b.name for b in BN]; prevq={}; KEY={b:{'rot':[],'loc':[]} for b in order}
for fr in range(nf+1):
    keep.fr=fr if (fr<nf or ONESHOT) else 0
    i=min(T,int(round(float(warp(fr/nf))))) if (fr<nf or ONESHOT) else 0
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
        prevq[b]=q; pb.keyframe_insert('rotation_quaternion',frame=fr); posed[b]=M; KEY[b]['rot'].append([q.x,q.y,q.z,q.w]); KEY[b]['loc'].append(list(pb.location)) if b in('pelvis','gun') else None
if RET>0:   # ease every bone from where it is at the start of the return back to its first-frame pose (turns blended as turns, so no limb collapses on the way)
    fr0=int(round(nf*(1-RET)))
    for fr in range(fr0+1,nf+1):
        t=(fr-fr0)/max(1,nf-fr0); t=t*t*(3-2*t)
        for b in order:
            pb=ao.pose.bones[b]; qa=Quaternion([KEY[b]['rot'][fr0][3]]+KEY[b]['rot'][fr0][:3]); qb=Quaternion([KEY[b]['rot'][0][3]]+KEY[b]['rot'][0][:3])
            if qa.dot(qb)<0: qb.negate()
            q=qa.slerp(qb,t); pb.rotation_quaternion=q; pb.keyframe_insert('rotation_quaternion',frame=fr); KEY[b]['rot'][fr]=[q.x,q.y,q.z,q.w]
            if KEY[b]['loc']:
                la=Vector(KEY[b]['loc'][fr0]); lb=Vector(KEY[b]['loc'][0]); l=la.lerp(lb,t); pb.location=l; pb.keyframe_insert('location',frame=fr); KEY[b]['loc'][fr]=list(l)
for fc in fcs(new):
    for kp in fc.keyframe_points: kp.interpolation='LINEAR'
WD=None
if os.environ.get('ZH_WDIR'):   # 3D.207 two-handed weapons: the line from the left hand to the right hand in the recording (the weapon runs through both hands), smoothed
    _d=(Q[:,I('RightHand')]-Q[:,I('LeftHand')])*(-1 if os.environ.get('ZH_MIRROR') else 1); _k=int(os.environ.get('ZH_WSMOOTH','9')); _d=np.array([_d[max(0,j-_k):j+_k+1].mean(0) for j in range(len(_d))]); _d/=np.linalg.norm(_d,axis=1,keepdims=True)
    WD=[list(map(float,_d[min(T,int(round(float(warp(fr/nf)))))])) for fr in range(nf+1)]
import json; json.dump({'fps':fps,'frames':nf,'stride':dist*SC,'seconds':(DUR or T*dt/SPEED),'bones':KEY,'wdir':WD},open(out.replace('.npz','.json'),'w'))
if '--save' in sys.argv: bpy.ops.wm.save_as_mainfile(filepath=out.replace('.npz','.blend'))
# --- dump old and new for strips
me=body.data; me.calc_loop_triangles(); tri=np.array([t.vertices[:] for t in me.loop_triangles]); tl=np.array([t.loops[:] for t in me.loop_triangles]); uv=np.array([d.uv[:] for d in me.uv_layers[0].data])[tl]
img=next(i for i in bpy.data.images if i.size[0]>0 and len(i.pixels)); Wd,Hd=img.size; px=(np.array(img.pixels[:]).reshape(Hd,Wd,4)[:,:,:3]*255).astype(np.uint8)
PROP=os.environ.get('ZH_PROP'); wob=bpy.data.objects.get('weapon_'+PROP) if PROP else None
if wob: wm=wob.data; wm.calc_loop_triangles(); wt=np.array([t.vertices[:] for t in wm.loop_triangles])+len(me.vertices); px[0:3,0:3]=(70,70,75)
res={'tri':tri,'uv':uv,'tex':px,'bones':np.array(order)}
for nm,act,fa,fb in((clip,old,*old.frame_range),(clip+'_new',new,0,nf)):
    ad.action=act
    try:
        if act.slots: ad.action_slot=act.slots[0]
    except Exception: pass
    V=[];J=[]
    for i in range(N):
        fr=fa+(fb-fa)*i/(N-1); bpy.context.scene.frame_set(int(fr),subframe=fr-int(fr)); dg=bpy.context.evaluated_depsgraph_get(); ev=body.evaluated_get(dg); m=ev.to_mesh()
        vv=np.array([(ev.matrix_world@v.co)[:] for v in m.vertices],np.float32); ev.to_mesh_clear()
        if wob: mw=wob.evaluated_get(dg).matrix_world; vv=np.concatenate([vv,np.array([(mw@x.co)[:] for x in wm.vertices],np.float32)])
        V.append(vv)
        J.append(np.array([list((ao.matrix_world@pb.head)[:])+list((ao.matrix_world@pb.tail)[:]) for pb in ao.pose.bones],np.float32))
    res['T:'+nm]=np.concatenate([tri,wt]) if wob else tri; res['U:'+nm]=np.concatenate([uv,np.zeros((len(wt),3,2))+.0005]) if wob else uv
    res['V:'+nm]=np.array(V); res['J:'+nm]=np.array(J); res['F:'+nm]=np.array([fa,fb,fps])
np.savez_compressed(out,**res); print('done',nf)
