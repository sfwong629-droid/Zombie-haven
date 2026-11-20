# hoecheck.py -- RAW.glb : the hoe in work_dig (owner, W162: "the sharp end should face the ground, not the shaft").
# Prints HOECHK lines: at the strike the blade points down and bites the ground a little, the shaft's end stays above the blade, and the shaft never passes through the body or head.
import bpy,sys,numpy as np
from mathutils import Vector
from mathutils.bvhtree import BVHTree
src=sys.argv[sys.argv.index('--')+1]
bpy.ops.wm.read_factory_settings(use_empty=True); bpy.ops.import_scene.gltf(filepath=src)
ao=[o for o in bpy.data.objects if o.type=='ARMATURE'][0]; hoe=bpy.data.objects['weapon_hoe']
for tr in ao.animation_data.nla_tracks: tr.mute=True
act=bpy.data.actions['work_dig']; ao.animation_data.action=act
try: ao.animation_data.action_slot=act.slots[0]
except Exception: pass
V=np.array([v.co[:] for v in hoe.data.vertices]); c=V.mean(0); u,s,vt=np.linalg.svd(V-c); ax=vt[0]; P=V-c; t=P@ax; r=np.linalg.norm(P-np.outer(t,ax),axis=1); bl=r>np.median(r)*2.5
sh=V[~bl]; ts=(sh-c)@ax; pts=[c+ax*x for x in np.linspace(ts.min(),ts.max(),80)]
body=[o for o in bpy.data.objects if o.type=='MESH' and not o.name.startswith(('weapon_','armor')) and o.find_armature()]
f0,f1=act.frame_range; res=[]; inside=0; worst=0
for f in np.arange(f0,f1+.01,.5):
    bpy.context.scene.frame_set(int(f),subframe=f-int(f)); dg=bpy.context.evaluated_depsgraph_get()
    W=np.array([(hoe.matrix_world@Vector(v))[:] for v in V]); hand=np.array((ao.matrix_world@ao.pose.bones['hand.R'].tail)[:]); handL=np.array((ao.matrix_world@ao.pose.bones['hand.L'].tail)[:])
    bd=W[bl].mean(0)-W[~bl][np.argmin(np.abs(t[~bl]-t[bl].mean()))]; res.append((f,W[bl][:,2].min(),W[~bl][:,2].min(),-bd[2]/np.linalg.norm(bd)))
    n=0
    for o in body:
        e=o.evaluated_get(dg); bv=BVHTree.FromObject(e,dg); mi=e.matrix_world.inverted()
        for p in pts:
            w=hoe.matrix_world@Vector(p)
            if min(np.linalg.norm(np.array(w[:])-hand),np.linalg.norm(np.array(w[:])-handL))<.12: continue     # the hands hold it
            q=mi@w; k=0; o_=q.copy(); d=Vector((.577,.577,.577))
            while True:
                h=bv.ray_cast(o_,d)
                if h[0] is None: break
                k+=1; o_=h[0]+d*1e-5
            if k%2: n+=1
    inside+=n>0; worst=max(worst,n)
    if n and __import__('os').environ.get('ZH_V'): print('  frame',f,n)
res=np.array(res); i=res[:,1].argmin()
print('HOECHK %s: blade lowest %.3f, shaft lowest %.3f, blade down %.2f at the strike; shaft inside the body on %d of %d frames (worst %d of 80 points)'%(src.split('/')[-1],res[i,1],res[:,2].min(),res[i,3],inside,len(res),worst))
