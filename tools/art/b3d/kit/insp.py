# insp.py KIT  (run with Blender python / the bpy module, inside the kit work folder): reads KIT.glb and saves KIT_fc.npy (face centres + texture colour), used by gear_strip_pink.py
import bpy, sys, numpy as np
k=sys.argv[1]
bpy.ops.wm.read_factory_settings(use_empty=True)
bpy.ops.import_scene.gltf(filepath=k+'.glb')
ms=[o for o in bpy.data.objects if o.type=='MESH']; o=ms[0]; print(k,'meshes', [(x.name, len(x.data.polygons)) for x in ms])
bpy.context.view_layer.objects.active=o; o.select_set(True); bpy.ops.object.transform_apply(location=True, rotation=True, scale=True)
me=o.data; img=None
for m in me.materials:
    for n in m.node_tree.nodes:
        if n.type=='TEX_IMAGE' and n.image and any(l.to_socket.name=='Base Color' for l in n.outputs[0].links): img=n.image
W,H=img.size; px=np.array(img.pixels[:],dtype=np.float32).reshape(H,W,4)
n=len(me.polygons); C=np.zeros(n*3,dtype=np.float32); me.polygons.foreach_get('center',C); C=C.reshape(n,3)
ls=np.zeros(n,dtype=np.int32); me.polygons.foreach_get('loop_start',ls); lt=np.zeros(n,dtype=np.int32); me.polygons.foreach_get('loop_total',lt)
uv=np.zeros(len(me.loops)*2,dtype=np.float32); me.uv_layers.active.data.foreach_get('uv',uv); uv=uv.reshape(-1,2)
u=(uv[ls]+uv[ls+1]+uv[ls+2])/3
col=px[np.clip((u[:,1]%1*H).astype(int),0,H-1), np.clip((u[:,0]%1*W).astype(int),0,W-1), :3]
np.save(k+'_fc.npy', np.hstack([C,col])); print(k,'faces',n,'bounds',C.min(0).round(3),C.max(0).round(3))
