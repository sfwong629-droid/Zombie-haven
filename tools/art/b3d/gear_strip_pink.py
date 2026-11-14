# python3 strip.py KIT  ->  KIT_gear.glb + KIT.json (joints for fit_armor)      (pink mannequin removed by colour)
import bpy, bmesh, sys, json, numpy as np, colorsys
k=sys.argv[1]; opt=json.loads(sys.argv[2]) if len(sys.argv)>2 else {}
bpy.ops.wm.read_factory_settings(use_empty=True)
bpy.ops.import_scene.gltf(filepath=k+'.glb')
o=[o for o in bpy.data.objects if o.type=='MESH'][0]
for x in [x for x in bpy.data.objects if x!=o]: bpy.data.objects.remove(x)
o.parent=None; bpy.context.view_layer.objects.active=o; o.select_set(True); bpy.ops.object.transform_apply(location=True, rotation=True, scale=True)
d=np.load(k+'_fc.npy'); C=d[:,:3]; col=np.clip(d[:,3:],0,1)**(1/2.2)
mx=col.max(1); mn=col.min(1); sat=(mx-mn)/np.maximum(mx,1e-6)
r,g,b=col[:,0],col[:,1],col[:,2]
pink=(r>=b)&(b>g*1.35)&(r>g*1.6)&(sat>.4)&(mx>.45)          # magenta: red and blue well above green
for x0,x1,z0,z1 in opt.get('cut',[]): pink|=(C[:,0]>x0)&(C[:,0]<x1)&(C[:,2]>z0)&(C[:,2]<z1)   # a box to drop (raw coords), e.g. an armband fused to the vest
print(k,'pink faces',pink.sum(),'of',len(pink))
# joints: the drawing is the same mannequin every time; only where the body sits front-to-back differs
def ymid(m):
    q=C[pink&m,1]
    if len(q)<=50: q=C[m,1]   # Nov 13: no pink showing there (trousers, a full vest): centre on the gear itself, not on 0
    return float((np.percentile(q,2)+np.percentile(q,98))/2) if len(q)>50 else 0.
yl=ymid((C[:,2]>.15)&(C[:,2]<.30)); yt=ymid((C[:,2]>.36)&(C[:,2]<.46)); ya=ymid((C[:,2]>.50)&(C[:,2]<.66)&(np.abs(C[:,0])>.10)); yh=ymid((C[:,2]>.78)&(C[:,2]<.86))
if not (pink&(C[:,2]>.78)&(C[:,2]<.86)).sum()>50: yh=yt
yt=opt.get('yt',yt); ya=opt.get('ya',ya)   # Nov 13: a vest that hides the whole pink chest gives no torso centre: set it by hand
print('y centres legs %.3f torso %.3f arms %.3f head %.3f'%(yl,yt,ya,yh))
el=opt.get('elbow',.56); kn=opt.get('knee',.275)
J={"pelvis":[[0,yt,.38],[0,yt,.46]],"chest":[[0,yt,.46],[0,yt,.70]],"neck":[[0,yt,.70],[0,yt,.74]],"head":[[0,yh,opt.get("head0",.74)],[0,yh,opt.get("head1",.97)]],
   "upperarm.L":[[.105,ya,.675],[.148,ya,el]],"forearm.L":[[.148,ya,el],[.168,ya,.47]],"hand.L":[[.168,ya,.47],[.178,ya,.37]],
   "thigh.L":[[.07,yl,.40],[.076,yl,kn]],"shin.L":[[.076,yl,kn],[.078,yl,.10]],"foot.L":[[.078,yl,.10],[.078,yl-.085,.02]]}
if opt.get("vpose"):   # Nov 13: the V-pose mannequin (batch 2 on): taller torso, legs further apart, arms out at about 30 degrees
    kn=opt.get('knee',.29); el=opt.get('elbow',.60)
    J={"pelvis":[[0,yt,.40],[0,yt,.50]],"chest":[[0,yt,.50],[0,yt,.78]],"neck":[[0,yt,.78],[0,yt,.82]],"head":[[0,yh,.82],[0,yh,1.0]],
       "upperarm.L":[[.13,ya,.745],[.215,ya,el]],"forearm.L":[[.215,ya,el],[.285,ya,.48]],"hand.L":[[.285,ya,.48],[.31,ya,.40]],
       "thigh.L":[[.105,yl,.42],[.12,yl,kn]],"shin.L":[[.12,yl,kn],[.125,yl,.08]],"foot.L":[[.125,yl,.08],[.125,yl-.085,.02]]}
if opt.get("vpose"):   # Nov 13: arms drawn at another angle: turn the arm chain about the shoulder to point at the measured hand (outermost 0.5% of the model)
    import math
    R=C[C[:,0]>.2]; xt=np.percentile(R[:,0],99.5); tz=R[R[:,0]>xt-.03,2].mean()
    ang=math.atan2(tz-.745,xt-.13)-math.atan2(-.271,.192); ang=opt.get("armrot",ang); print('arm turn %.1f deg'%math.degrees(ang))
    for b in ("upperarm.L","forearm.L","hand.L"):
        J[b]=[[.13+(p[0]-.13)*math.cos(ang)-(p[2]-.745)*math.sin(ang),p[1],.745+(p[0]-.13)*math.sin(ang)+(p[2]-.745)*math.cos(ang)] for p in J[b]]
if opt.get("vpose"):   # Nov 13: legs drawn wide apart: turn the leg chain about the hip to point at the measured ankle
    import math
    Lg=C[(C[:,0]>0)&(np.abs(C[:,2]-.12)<.015)]; ax_=float(np.median(Lg[:,0])) if len(Lg)>50 else .125
    la=math.atan2(ax_-.105,.42-.12)-math.atan2(.125-.105,.42-.12); la=opt.get("legrot",la); print('leg turn %.1f deg (ankle x %.3f)'%(math.degrees(la),ax_))
    for b in ("thigh.L","shin.L","foot.L"):
        J[b]=[[.105+(p[0]-.105)*math.cos(la)-(p[2]-.42)*math.sin(la),p[1],.42+(p[0]-.105)*math.sin(la)+(p[2]-.42)*math.cos(la)] for p in J[b]]
dx=opt.get("armdx",0)
for b in ("upperarm.L","forearm.L","hand.L"): J[b]=[[p[0]+dx*(i>0 or b!="upperarm.L"),p[1],p[2]] for i,p in enumerate(J[b])]
for b in list(J):
    if b.split(".")[0] in opt.get("nob",[]): del J[b]
# Nov 13 (rig plan): cloth is painted in the game, so it is cut from the model here. Each face goes to its nearest bone (the same rule as the fit);
# "drop": {"bones": [...], "keep": [[r,g,b,tol],...], "also": [[r,g,b,tol],...]} deletes the faces on those bones unless their colour is a kept (hard piece) colour, plus the "also" colours anywhere.
def _seg(P,a,b):
    a=np.array(a,float); b=np.array(b,float); ab=b-a; t=np.clip(((P-a)@ab)/(ab@ab),0,1); return np.linalg.norm(P-(a+t[:,None]*ab),axis=1)
_JJ=dict(J)
for _k,(_h,_t) in list(J.items()):
    if _k.endswith('.L'): _JJ[_k[:-2]+'.R']=[[-_h[0],_h[1],_h[2]],[-_t[0],_t[1],_t[2]]]
_nm=list(_JJ); _D=np.stack([_seg(C,_JJ[n][0],_JJ[n][1]) for n in _nm],1)
for _i,_n in enumerate(_nm):
    if _n.endswith('.L'): _D[C[:,0]<0,_i]=9
    if _n.endswith('.R'): _D[C[:,0]>0,_i]=9
_own=np.array([n.split('.')[0] for n in _nm])[_D.argmin(1)]
def _near(spec): return (np.linalg.norm(col-np.array(spec[:3])[None],axis=1)<spec[3])&((_own==spec[4]) if len(spec)>4 and spec[4] else True)&(((C[:,2]>spec[5])&(C[:,2]<spec[6])) if len(spec)>6 else True)   # an optional 5th item limits the colour to one bone's faces
if opt.get('info'):
    for bn in ["chest","pelvis","upperarm","forearm","hand","thigh","shin","foot"]:
        m=(_own==bn)&~pink; q=(col[m]*5).astype(int).clip(0,4); key=q[:,0]*25+q[:,1]*5+q[:,2]; u,cnt=np.unique(key,return_counts=True); o_=np.argsort(-cnt)[:6]
        print(bn.ljust(9),m.sum(),' '.join('[%.2f,%.2f,%.2f]:%d%%'%(*col[m][key==u[j]].mean(0),100*cnt[j]//max(1,m.sum())) for j in o_))
    sys.exit(0)
dr=opt.get('drop')
if dr:
    dm=np.isin(_own,dr.get('bones',[]))
    for sp in dr.get('keep',[]): dm&=~_near(sp)
    for sp in dr.get('also',[]): dm|=_near(sp)
    for x0,x1,z0,z1 in dr.get('keepbox',[]): dm&=~((C[:,0]>x0)&(C[:,0]<x1)&(C[:,2]>z0)&(C[:,2]<z1))
    print('dropped cloth faces',int((dm&~pink).sum())); pink|=dm
K={"upperarm":1.1,"forearm":1.05,"hand":.95,"chest":1.08,"pelvis":1.02,"thigh":1.05,"shin":1.12,"head":1.28,"neck":1.1,"foot":1.3}; K.update(opt.get('K',{}))
json.dump({"J":J,"K":K,"rigid":opt.get('rigid',["shin","head","hand"]),"islands":opt.get("islands",True),"core":opt.get("core",[]),"solid":opt.get("solid",False),"force":opt.get("force",[])},open(k+'.json','w'))
bm=bmesh.new(); bm.from_mesh(o.data); bm.faces.ensure_lookup_table(); bm.verts.ensure_lookup_table()
sp=opt.get('splitat',[])   # Nov 13 (rig plan): pieces Tripo fused across a joint (an arm pillow to the chest pillow) are cut apart there, so each can move with its own body part
if sp:
    va={}
    for f in bm.faces:
        ow=_own[f.index]
        for v in f.verts: va.setdefault(v.index,set()).add(ow)
    ns=0
    for f in bm.faces:
        if pink[f.index]: continue
        u=set().union(*[va[v.index] for v in f.verts])
        hit=[b_ for a_,b_ in sp if b_ in u and ((len(u)>1) if a_=='*' else a_ in u)]
        if hit and _own[f.index]==hit[0]: pink[f.index]=True; ns+=1   # the limb's own faces along the seam go; ['*', limb] cuts the limb from everything it touches
    print('split faces',ns)
pv=set()
for f in bm.faces:
    if pink[f.index]:
        for v in f.verts: pv.add(v.index)
bmesh.ops.delete(bm, geom=[f for f in bm.faces if (pink[f.index] if opt.get('drop') else any(v.index in pv for v in f.verts))], context='FACES')   # the pink faces and one ring round them (no pink fringe)
bmesh.ops.remove_doubles(bm, verts=bm.verts, dist=1e-5)
bm.verts.ensure_lookup_table(); lab={}; n=0; sizes=[]
for v in bm.verts:
    if v.index in lab: continue
    st=[v]; lab[v.index]=n; c=0
    while st:
        x=st.pop(); c+=1
        for e in x.link_edges:
            w=e.other_vert(x)
            if w.index not in lab: lab[w.index]=n; st.append(w)
    sizes.append(c); n+=1
print('islands',n,'largest',sorted(sizes)[-16:])
bmesh.ops.delete(bm, geom=[v for v in bm.verts if sizes[lab[v.index]]<opt.get('crumb',1200)], context='VERTS')
bm.to_mesh(o.data); o.data.update(); bm.free(); print('left', len(o.data.polygons))
bpy.ops.export_scene.gltf(filepath=k+'_gear.glb', export_format='GLB', use_selection=True, export_animations=False, export_yup=True)
