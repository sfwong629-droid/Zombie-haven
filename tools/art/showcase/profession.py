"""Make a profession from the approved small farmer: recolour clothes, swap the straw hat for hair.
   python3 profession.py medic_m   ->  <tag>_atlas.png (same layout and meta as the farmer atlas)"""
import sys, json
from PIL import Image
SHOW='/tmp/claude-0/-home-claude/77a2a33f-40e5-51d5-92b1-709af4ea3c51/scratchpad/showcase/'
C=48
def lum(c): return 0.3*c[0]+0.59*c[1]+0.11*c[2]
def is_black(c): return max(c[:3])<45
def is_straw(c):
    r,g,b=c[:3]; return r>175 and g>125 and b<180 and r-b>55 and not (r>200 and b>=100 and g<200 and r-g>40)   # yellow straw / blond, not skin
def is_green(c): r,g,b=c[:3]; return g>r+8 and g>=b and not is_black(c)
def is_brown(c): r,g,b=c[:3]; return r>g>b and r-b>35 and not is_straw(c) and not (r>200 and b>=65 and g>110)   # trousers / boots / straps, not skin
def is_skin(c): r,g,b=c[:3]; return r>200 and 110<g<200 and b>=65 and (b>=100 or g<140)
def shade(pal, c):
    """pick from a 4-step palette (dark..light) by the source pixel's brightness"""
    L=lum(c); i=0 if L<60 else 1 if L<100 else 2 if L<150 else 3
    return pal[i]+(255,)
PROF={
  'medic_m': dict(shirt=[(150,156,172),(196,202,214),(232,235,240),(255,255,255)],
                  shorts=[(52,78,128),(70,104,160),(104,152,206),(140,186,232)],
                  hair=[(40,25,18),(62,40,28),(92,58,38),(128,84,54)],
                  cross=(214,46,46)),
}
def hat_to_hair(cell, P):
    bb=cell.getbbox()
    if not bb: return cell
    lying=(bb[2]-bb[0])>(bb[3]-bb[1])*1.25
    if lying:                                    # lying frames: turn head-up, swap, turn back
        up=cell.rotate(90); up=_hat_upright(up,P); return up.rotate(-90)
    return _hat_upright(cell,P)
def _hat_upright(cell, P):
    """remove the straw hat and draw a short haircut on the head underneath"""
    px=cell.load(); W,H=cell.size
    straw=[(x,y) for y in range(H) for x in range(W) if px[x,y][3] and is_straw(px[x,y])]
    if not straw: return cell
    top=min(p[1] for p in straw)
    crown=[p for p in straw if p[1]<=top+2]
    clo=min(p[0] for p in crown); chi=max(p[0] for p in crown)
    face=next((y for y in range(top+3,H) if any(px[x,y][3] and is_skin(px[x,y]) for x in range(clo,chi+1))), None)
    back = face is None or face>top+12
    if back: face=top+7                                         # back view: hair runs down to the nape
    # head width: the widest run of non-transparent pixels a little below where the hat ends
    def run(y):
        xs=[x for x in range(clo-4,chi+5) if 0<=x<W and px[x,y][3]]
        return (min(xs),max(xs)) if xs else (clo-1,chi+1)
    L,R=run(min(H-1,face+2))
    L=max(L,clo-2); R=min(R,chi+2)
    capTop=top+2
    # clear the hat completely (everything above the face, plus brim pixels beside the head)
    for y in range(max(0,top-1), face):
        for x in range(W): px[x,y]=(0,0,0,0)
    for y in range(face, min(H,face+3)):
        for x in range(W):
            c=px[x,y]
            if c[3] and (x<L or x>R) and (is_straw(c) or is_brown(c) or is_black(c) or is_green(c)): px[x,y]=(0,0,0,0)
            elif c[3] and is_straw(c): px[x,y]=P['hair'][2]+(255,)
    hd,hm,hl,hh=[c+(255,) for c in P['hair']]
    K=(0,0,0,255)
    rows=list(range(capTop, face+ (2 if back else 1)))
    for k,y in enumerate(rows):
        inset = 2 if k==0 else 1 if k==1 else 0
        x0,x1=L+inset,R-inset
        for x in range(x0,x1+1):
            if k==0 or x in (x0,x1): px[x,y]=K
            else:
                col = hh if (k==1 and x<x0+4) else hl if k<=2 else hm if k<len(rows)-1 else hd
                px[x,y]=col
    if not back:                                               # fringe and sideburns over the forehead
        y=face
        for x in range(L,R+1):
            if x in (L,R): px[x,y]=K
            elif x in (L+1,R-1) or (x-L)%3==0: px[x,y]=hd
        for x in (L,R): 
            if face+1<H: px[x,face+1]=K
        if face+1<H: px[L+1,face+1]=hd; px[R-1,face+1]=hd
    else:
        y=rows[-1]+1
        if y<H:
            for x in range(L,R+1): px[x,y]=K if x in (L,R) or not px[x,y][3] else px[x,y]
    return cell
def recolor(cell, P):
    px=cell.load(); W,H=cell.size; bb=cell.getbbox()
    if not bb: return
    lying=(bb[2]-bb[0])>(bb[3]-bb[1])*1.25
    for y in range(H):
        for x in range(W):
            c=px[x,y]
            if not c[3]: continue
            if is_green(c): px[x,y]=shade(P['shirt'],c)
            elif is_brown(c):
                boots = (x < bb[0]+6) if lying else (y > bb[3]-6)
                if not boots: px[x,y]=shade(P['shorts'],c)
def add_cross(cell, P, front):
    """a small red cross on the bib of the front view"""
    if not front or 'cross' not in P: return
    px=cell.load(); bb=cell.getbbox(); h=bb[3]-bb[1]
    if (bb[2]-bb[0])>h*1.25: return
    sh=set(P['shorts'])
    bib=[(x,y) for y in range(bb[1]+int(h*0.42),bb[1]+int(h*0.62)) for x in range(bb[0],bb[2]) if px[x,y][3] and px[x,y][:3] in sh]
    if len(bib)<6: return
    cx=round(sum(p[0] for p in bib)/len(bib)); cy=round(sum(p[1] for p in bib)/len(bib))
    R=P['cross']+(255,); W=(255,255,255,255)
    for (dx,dy) in ((0,0),(1,0),(-1,0),(0,1),(0,-1)): px[cx+dx,cy+dy]=R
def main(tag):
    P=PROF[tag]; atlas=Image.open(SHOW+'farm_atlas.png').convert('RGBA'); meta=json.load(open(SHOW+'farm_meta.json'))
    out=atlas.copy(); cols=atlas.width//C
    front=set(e['i'] for a in meta for v in meta[a] if v=='se' for e in meta[a][v])
    for i in range(cols*(atlas.height//C)):
        box=((i%cols)*C,(i//cols)*C,(i%cols)*C+C,(i//cols)*C+C); cell=atlas.crop(box)
        if not cell.getbbox(): continue
        recolor(cell,P); cell=hat_to_hair(cell,P); add_cross(cell,P,i in front)
        out.paste(cell,box)
    out.save(f'{tag}_atlas.png'); print('saved',tag)
if __name__=='__main__': main(sys.argv[1])
