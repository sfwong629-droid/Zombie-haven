# hoefix_apply.py IN.glb HOE.json OUT.glb : rewrites the hoe's own points: turned about its shaft so the blade faces the ground, and the shaft made shorter
# from the hand's end (see hoefix.py). The shaft is not along a mesh axis, so this cannot be a node scale. Plain glTF edit, no Blender.
import sys,json,struct,math,numpy as np
src,hj,out=sys.argv[1:4]; h=json.load(open(hj))
b=open(src,'rb').read(); n=struct.unpack('<I',b[12:16])[0]; j=json.loads(b[20:20+n]); bl=struct.unpack('<I',b[20+n:24+n])[0]; binb=bytearray(b[28+n:28+n+bl])
g=lambda v:np.array([v[0],v[2],-v[1]])           # Blender (Z up) -> glTF (Y up)
ax=g(h['axis']); ax/=np.linalg.norm(ax); p=g(h['point']); bu=g(h['butt']); th=math.radians(h['turn']); f=h['shrink']
K=np.array([[0,-ax[2],ax[1]],[ax[2],0,-ax[0]],[-ax[1],ax[0],0]]); R=np.eye(3)+math.sin(th)*K+(1-math.cos(th))*K@K
S=np.eye(3)+(f-1)*np.outer(ax,ax); Si=np.eye(3)+(1/f-1)*np.outer(ax,ax)
nd=[x for x in j['nodes'] if x.get('name')=='weapon_hoe'][0]; me=j['meshes'][nd['mesh']]
used={}
for mi,mm in enumerate(j['meshes']):
    for pr in mm['primitives']:
        for a in pr['attributes'].values(): used.setdefault(a,set()).add(mi)
def rd(ai):
    a=j['accessors'][ai]; v=j['bufferViews'][a['bufferView']]; st=v.get('byteStride',12); o=v.get('byteOffset',0)+a.get('byteOffset',0)
    return np.array([struct.unpack_from('<3f',binb,o+i*st) for i in range(a['count'])]),o,st
def wr(ai,A):
    a=j['accessors'][ai]; _,o,st=rd(ai)
    for i,x in enumerate(A): struct.pack_into('<3f',binb,o+i*st,*map(float,x))
for pr in me['primitives']:
    P,_,_=rd(pr['attributes']['POSITION']); assert used[pr['attributes']['POSITION']]=={nd['mesh']}
    P2=p+(bu+(P-bu)@S.T-p)@R.T; wr(pr['attributes']['POSITION'],P2); a=j['accessors'][pr['attributes']['POSITION']]; a['min']=list(map(float,P2.astype(np.float32).min(0))); a['max']=list(map(float,P2.astype(np.float32).max(0)))
    N,_,_=rd(pr['attributes']['NORMAL']); N2=(N@Si.T)@R.T; N2/=np.linalg.norm(N2,axis=1,keepdims=True)
    if used[pr['attributes']['NORMAL']]=={nd['mesh']}: wr(pr['attributes']['NORMAL'],N2)
    else:                                              # these normals are shared with other meshes: give the hoe its own copy
        while len(binb)%4: binb.append(0)
        j['bufferViews'].append({'buffer':0,'byteOffset':len(binb),'byteLength':12*len(N2),'target':34962}); binb+=N2.astype('<f4').tobytes()
        j['accessors'].append({'type':'VEC3','componentType':5126,'count':len(N2),'bufferView':len(j['bufferViews'])-1}); pr['attributes']['NORMAL']=len(j['accessors'])-1
while len(binb)%4: binb.append(0)
j['buffers'][0]['byteLength']=len(binb)
s=json.dumps(j,separators=(',',':')).encode(); s+=b' '*((4-len(s)%4)%4)
open(out,'wb').write(b'glTF'+struct.pack('<II',2,12+8+len(s)+8+len(binb))+struct.pack('<I',len(s))+b'JSON'+s+struct.pack('<I',len(binb))+b'BIN\0'+bytes(binb)); print('hoe turned',round(h['turn']),'deg, shaft x%.3f ->'%f,out)
