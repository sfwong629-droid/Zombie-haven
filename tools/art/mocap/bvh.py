import numpy as np, re
def load(path):
    L=open(path).read().split('\n'); names=[];par=[];off=[];ch=[];stack=[];i=0;ends=[]
    while not L[i].startswith('MOTION'):
        t=L[i].split()
        if t and t[0] in('ROOT','JOINT'): names.append(t[1]); par.append(stack[-1] if stack else -1); stack.append(len(names)-1); ch.append([])
        elif t and t[0]=='End': names.append(names[stack[-1]]+'_end'); par.append(stack[-1]); stack.append(len(names)-1); ch.append([])
        elif t and t[0]=='OFFSET': off.append([float(x) for x in t[1:4]])
        elif t and t[0]=='CHANNELS': ch[stack[-1]]=t[2:]
        elif t and t[0]=='}': stack.pop()
        i+=1
    n=int(L[i+1].split()[1]); dt=float(L[i+2].split()[2]); D=np.array([[float(x) for x in l.split()] for l in L[i+3:i+3+n]])
    return names,par,np.array(off),ch,D,dt
def R(ax,a):
    c,s=np.cos(a),np.sin(a)
    return {'X':np.array([[1,0,0],[0,c,-s],[0,s,c]]),'Y':np.array([[c,0,s],[0,1,0],[-s,0,c]]),'Z':np.array([[c,-s,0],[s,c,0],[0,0,1]])}[ax]
def fk(names,par,off,ch,row,mats=False):
    P=np.zeros((len(names),3)); M=[None]*len(names); k=0
    for j in range(len(names)):
        r=np.eye(3); t=off[j].copy()
        for c in ch[j]:
            v=row[k]; k+=1
            if c.endswith('position'): t['XYZ'.index(c[0])]=v if par[j]<0 else t['XYZ'.index(c[0])]
            else: r=r@R(c[0],np.radians(v))
        if par[j]<0: M[j]=r; P[j]=t
        else: M[j]=M[par[j]]@r; P[j]=P[par[j]]+M[par[j]]@t
    return (P,M) if mats else P
