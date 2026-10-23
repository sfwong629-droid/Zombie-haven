import sys
from PIL import Image
S='/tmp/claude-0/-home-claude/77a2a33f-40e5-51d5-92b1-709af4ea3c51/scratchpad/workshop/'
DX,DY=int(sys.argv[1]),int(sys.argv[2])
src=Image.open('assets/buildings/t56/workshop.png').convert('RGBA');W,H=src.size;q=src.load()
def brown(c):
    r,g,b,a=c; return a and r>=60 and r-b>=40 and g>=0.52*r and g<r
def floor(c):
    r,g,b,a=c; return a and ((abs(r-g)<=12 and 0<=r-b<=30 and r>=110) or (abs(r-g)<=8 and 0<=r-b<=20 and r>=72))
X0,X1,Y0,Y1=61,W,30,58
def wallbot(x): return 44-(x-60)//2
def inobj(x,y):
    c=q[x,y]
    if c[3]==0 or floor(c) or brown(c): return False
    if y<wallbot(x)-1 and max(c[:3])<=25:   # wall plank outlines
        return False
    return True
obj={(x,y):q[x,y] for x in range(X0,X1) for y in range(Y0,Y1) if inobj(x,y)}
for it in range(2):
    add={}
    for x in range(X0,X1):
        for y in range(Y0,Y1):
            if (x,y) in obj or q[x,y][3]==0 or brown(q[x,y]): continue
            hits=sum(any((x+dx*k,y+dy*k) in obj for k in range(1,4)) for dx,dy in ((1,0),(-1,0),(0,1),(0,-1)))
            if hits>=4: add[(x,y)]=q[x,y]
    obj.update(add)
im=src.copy();p=im.load()
for (x,y) in obj:
    if y>=wallbot(x): p[x,y]=(150,142,126,255)
    else:
        for k in range(1,10):
            if 0<=x-k and brown(q[x-k,y]): p[x,y]=q[x-k,y];break
        else: p[x,y]=(0,0,0,0)
for (x,y),c in obj.items(): p[x+DX,y+DY]=c
BX,BY=29,74
def yb(x): return BY-(x-BX)//2
RX=85
for x in range(BX+1,W):
    b=yb(x)
    for y in range(max(b+1,0),H): p[x,y]=(0,0,0,0)
    if x>RX:
        for y in range(H): p[x,y]=(0,0,0,0)
        continue
    for y,c in ((b,(0,0,0,255)),(b-1,(80,80,72,255)),(b-2,(80,80,72,255))):
        if (x-DX,y-DY) not in obj: p[x,y]=c
# right corner: back edge up-left from (RX, yb(RX)-2)
cy=yb(RX)
for x in range(77,RX+1):
    top=cy-2-(RX-x)//2
    for y in range(0,top):
        if p[x,y][3] and floor(p[x,y]) : p[x,y]=(0,0,0,0)
    if (x-DX,top-DY) not in obj: p[x,top]=(0,0,0,255)
for y in range(cy-3,cy+1): p[RX,y]=(0,0,0,255)
im.save(S+'ws_edge.png')
bg=Image.new('RGBA',(W,H),(255,0,255,255));bg.alpha_composite(im)
bg.resize((W*8,H*8),Image.NEAREST).save(S+'ws_edge_x8.png')
print(len(obj))
