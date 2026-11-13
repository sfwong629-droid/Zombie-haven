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
    q=C[pink&m,1]; return float((np.percentile(q,2)+np.percentile(q,98))/2) if len(q)>50 else 0.
yl=ymid((C[:,2]>.15)&(C[:,2]<.30)); yt=ymid((C[:,2]>.36)&(C[:,2]<.46)); ya=ymid((C[:,2]>.50)&(C[:,2]<.66)&(np.abs(C[:,0])>.10)); yh=ymid((C[:,2]>.78)&(C[:,2]<.86))
if not (pink&(C[:,2]>.78)&(C[:,2]<.86)).sum()>50: yh=yt
print('y centres legs %.3f torso %.3f arms %.3f head %.3f'%(yl,yt,ya,yh))
el=opt.get('elbow',.56); kn=opt.get('knee',.275)
J={"pelvis":[[0,yt,.38],[0,yt,.46]],"chest":[[0,yt,.46],[0,yt,.70]],"neck":[[0,yt,.70],[0,yt,.74]],"head":[[0,yh,opt.get("head0",.74)],[0,yh,opt.get("head1",.97)]],
   "upperarm.L":[[.105,ya,.675],[.148,ya,el]],"forearm.L":[[.148,ya,el],[.168,ya,.47]],"hand.L":[[.168,ya,.47],[.178,ya,.37]],
   "thigh.L":[[.07,yl,.40],[.076,yl,kn]],"shin.L":[[.076,yl,kn],[.078,yl,.10]],"foot.L":[[.078,yl,.10],[.078,yl-.085,.02]]}
K={"upperarm":1.1,"forearm":1.05,"hand":.95,"chest":1.08,"pelvis":1.02,"thigh":1.05,"shin":1.12,"head":1.28,"neck":1.1,"foot":1.3}; K.update(opt.get('K',{}))
json.dump({"J":J,"K":K,"rigid":opt.get('rigid',["shin","head","hand"]),"islands":True,"force":opt.get("force",[])},open(k+'.json','w'))
bm=bmesh.new(); bm.from_mesh(o.data); bm.faces.ensure_lookup_table(); bm.verts.ensure_lookup_table()
pv=set()
for f in bm.faces:
    if pink[f.index]:
        for v in f.verts: pv.add(v.index)
bmesh.ops.delete(bm, geom=[f for f in bm.faces if any(v.index in pv for v in f.verts)], context='FACES')   # the pink faces and one ring round them (no pink fringe)
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
