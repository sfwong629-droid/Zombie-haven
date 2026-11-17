# handlo.py MODEL.glb HEIGHT -> "<lowest fingertip height> <half arm span>" for a raw Tripo zombie in the wide A pose, at HEIGHT tall.
# ai_model.py takes wide-apart legs for hanging arms on these models; zombie.sh passes this height to it as ZH_HANDLO.
import json,struct,sys,numpy as np
def pos(p):
    b=open(p,'rb').read(); cl=struct.unpack('<I',b[12:16])[0]; j=json.loads(b[20:20+cl]); o=20+cl+8
    a=j['accessors'][j['meshes'][0]['primitives'][0]['attributes']['POSITION']]; bv=j['bufferViews'][a['bufferView']]
    st=bv.get('byteStride',12); raw=np.frombuffer(b,np.uint8,st*a['count'],o+bv.get('byteOffset',0)+a.get('byteOffset',0)).reshape(a['count'],st)[:,:12]
    return np.frombuffer(raw.tobytes(),np.float32).reshape(-1,3)
P=pos(sys.argv[1]); H=float(sys.argv[2]); P=P*(H/(P[:,1].max()-P[:,1].min())); z=P[:,1]; x=np.abs(P[:,0])
band=(z>.25*H)&(z<.75*H); xm=x[band].max(); hand=band&(x>xm-.07*H)
print(round(float(np.percentile(z[hand],1)),3), round(float(xm),3))
