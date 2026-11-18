# strips.py IN.npz OUTDIR [per=5] : film strips of every clip, side view (top row) and 3/4 front (bottom row), ground line drawn
import sys,os,numpy as np
from PIL import Image,ImageDraw
d=np.load(sys.argv[1],allow_pickle=True); out=sys.argv[2]; per=int(sys.argv[3]) if len(sys.argv)>3 else 5; os.makedirs(out,exist_ok=True)
tri=d['tri']; uv=d['uv']; tex=d['tex']; th,tw=tex.shape[:2]
B=np.array([[1/3,1/3,1/3],[.6,.2,.2],[.2,.6,.2],[.2,.2,.6],[.9,.05,.05],[.05,.9,.05],[.05,.05,.9],[.45,.45,.1],[.45,.1,.45],[.1,.45,.45]],np.float32)
UVs=np.einsum('sb,tbc->tsc',B,uv).reshape(-1,2); COL=tex[np.clip((UVs[:,1]%1*th).astype(int),0,th-1),np.clip((UVs[:,0]%1*tw).astype(int),0,tw-1)].astype(np.float32)
FW,FH=130,170; ZM=1.45
def frame(V,yaw):
    P=V[tri]; n=np.cross(P[:,1]-P[:,0],P[:,2]-P[:,0]); n/=np.maximum(np.linalg.norm(n,axis=1,keepdims=True),1e-9)
    a=np.radians(yaw); L=np.array([np.sin(a)*-.6+.25,-.7*np.cos(a)-.2,.6]); L/=np.linalg.norm(L); sh=np.repeat(np.clip(.6+.4*np.abs(n@L),0,1),len(B))
    S=np.einsum('sb,tbc->tsc',B,P).reshape(-1,3)
    x=S[:,0]*np.cos(a)-S[:,1]*np.sin(a); dep=-(S[:,0]*np.sin(a)+S[:,1]*np.cos(a)); z=S[:,2]
    s=(FH-14)/ZM; px=np.clip((x*s+FW/2).astype(int),0,FW-2); py=np.clip((FH-8-z*s).astype(int),0,FH-2)
    img=np.full((FH,FW,3),246,np.uint8); gy=FH-8; img[gy:gy+1,:]=(150,150,150)
    o=np.argsort(dep); c=(COL*sh[:,None]).astype(np.uint8)
    for dx in(0,1):
        for dy in(0,1): img[py[o]+dy,px[o]+dx]=c[o]
    return Image.fromarray(img)
clips=[k[2:] for k in d.files if k.startswith('V:')]
if len(sys.argv)>4: clips=[c for c in sys.argv[4].split(',') if 'V:'+c in d.files]
sheets=[]
for ci,c in enumerate(clips):
    V=d['V:'+c]; n=len(V); row=Image.new('RGB',(FW*n,FH*2+16),'white'); dr=ImageDraw.Draw(row); f0,f1,fps=d['F:'+c]
    dr.text((4,2),f"{c}   ({(f1-f0)/fps:.2f} s)   top: side view, facing left   bottom: front 3/4",fill=(0,0,0))
    for i in range(n): row.paste(frame(V[i],90),(FW*i,16)); row.paste(frame(V[i],28),(FW*i,16+FH))
    sheets.append(row)
    if len(sheets)==per or ci==len(clips)-1:
        sh=Image.new('RGB',(sheets[0].width,sum(r.height for r in sheets)),'white'); y=0
        for r in sheets: sh.paste(r,(0,y)); y+=r.height
        k=ci//per; sh.save(f'{out}/sheet_{k:02d}.png'); print(k,[*clips[k*per:ci+1]]); sheets=[]
