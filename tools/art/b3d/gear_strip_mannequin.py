import bpy, bmesh, numpy as np, colorsys
bpy.ops.wm.read_factory_settings(use_empty=True)
bpy.ops.import_scene.gltf(filepath='raw.glb')
o=[o for o in bpy.data.objects if o.type=='MESH'][0]
for x in [x for x in bpy.data.objects if x!=o]: bpy.data.objects.remove(x)
o.parent=None; bpy.context.view_layer.objects.active=o; o.select_set(True); bpy.ops.object.transform_apply(location=True, rotation=True, scale=True)
d=np.load('fc.npy'); col=np.clip(d[:,3:],0,1)**(1/2.2)
mx=col.max(1); mn=col.min(1); sat=np.where(mx>0,(mx-mn)/np.maximum(mx,1e-6),0)
body=(mx>.77)&(sat<.13)
C=d[:,:3]; yleg=-.02+(.31-C[:,2])*.18
knee=(C[:,2]>.19)&(C[:,2]<.28)&(np.abs(C[:,0])>.03)&(np.abs(C[:,0])<.13)&(C[:,1]<yleg+.004)
print('knee plate faces kept', (body&knee).sum()); 
print('mannequin faces', body.sum(), 'of', len(body))
bm=bmesh.new(); bm.from_mesh(o.data); bm.faces.ensure_lookup_table()
bmesh.ops.delete(bm, geom=[f for f in bm.faces if body[f.index]], context='FACES')
bmesh.ops.remove_doubles(bm, verts=bm.verts, dist=1e-5)
# islands: drop the crumbs
bm.verts.ensure_lookup_table(); lab={}; k=0; sizes=[]
for v in bm.verts:
    if v.index in lab: continue
    st=[v]; lab[v.index]=k; n=0
    while st:
        x=st.pop(); n+=1
        for e in x.link_edges:
            w=e.other_vert(x)
            if w.index not in lab: lab[w.index]=k; st.append(w)
    sizes.append(n); k+=1
big=sorted(sizes)[-14:]; print('islands', k, 'largest', big)
kill=[v for v in bm.verts if sizes[lab[v.index]]<3000]
bmesh.ops.delete(bm, geom=kill, context='VERTS')
bm.to_mesh(o.data); o.data.update(); bm.free()
print('left', len(o.data.vertices), len(o.data.polygons))
P=np.array([v.co[:] for v in o.data.vertices]); np.save('gear_pts.npy', P)
bpy.ops.export_scene.gltf(filepath='gear_only.glb', export_format='GLB', use_selection=True, export_animations=False, export_yup=True)
