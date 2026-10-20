import os, json
from PIL import Image, ImageSequence, ImageDraw
D='/home/claude/Zombie-haven/tools/art/sources/small/farm_m_set/'
OUT='/tmp/claude-0/-home-claude/77a2a33f-40e5-51d5-92b1-709af4ea3c51/scratchpad/showcase/'
names=['idle','walking','hold_idle','hold_walking','swing_a','swing_b','swing_c','fire','taking_damage','happy_jump','collapse','rescue']
C=48; FEET=44
def isskin(c):
    r,g,b,a=c
    return a and r>200 and 110<g<200 and b>=65 and (b>=100 or g<140)
def comps(cell):
    px=cell.load(); seen=set(); out=[]
    for y in range(C):
        for x in range(C):
            if (x,y) in seen or not isskin(px[x,y]): continue
            st=[(x,y)]; seen.add((x,y)); cc=[]
            while st:
                p=st.pop(); cc.append(p)
                for dx,dy in ((1,0),(-1,0),(0,1),(0,-1),(1,1),(-1,-1),(1,-1),(-1,1)):
                    q=(p[0]+dx,p[1]+dy)
                    if 0<=q[0]<C and 0<=q[1]<C and q not in seen and isskin(px[q]): seen.add(q); st.append(q)
            out.append(cc)
    return out
atlas=[]; meta={}
for n in names:
    meta[n]={}
    for v in ('se','ne'):
        p=D+f'{n}_{v}.gif'
        if not os.path.exists(p): continue
        fr=[f.convert('RGBA') for f in ImageSequence.Iterator(Image.open(p))]
        bot=max(f.getbbox()[3] for f in fr)
        b0=fr[0].getbbox(); cx=(b0[0]+b0[2])/2
        if n=='rescue':
            # smoother carry walk: the arms-up upper body from the first rescue frame on top of the normal walk's legs
            wk=[x.convert('RGBA') for x in ImageSequence.Iterator(Image.open(D+f'walking_{v}.gif'))]
            wbot=max(x.getbbox()[3] for x in wk); wb0=wk[0].getbbox(); wcx=(wb0[0]+wb0[2])/2
            up=Image.new('RGBA',(C,C),(0,0,0,0)); up.alpha_composite(fr[0],(round(C/2-cx),FEET-bot))
            WAIST=FEET-9; t0=None; nf=[]
            for x in wk:
                legs=Image.new('RGBA',(C,C),(0,0,0,0)); legs.alpha_composite(x,(round(C/2-wcx),FEET-wbot))
                top=legs.getbbox()[1]; t0=top if t0 is None else t0; bobv=top-t0
                lg=legs.crop((0,WAIST,C,C)); lp=lg.load(); W_,H_=lg.size
                def handish(c): r,g,b,a=c; return a and ((r>200 and g>110 and b>=65) or (g>r+10 and g>b))   # skin or green sleeve, not trousers or boots
                gone=set()                                          # only outside the legs' own columns (knees show skin too)
                rows_=[y for y in range(H_) if any(lp[x,y][3] for x in range(W_))]; fx=[x for y in rows_[-5:] for x in range(W_) if lp[x,y][3]]; lo,hi=min(fx)-1,max(fx)+1
                for y in range(H_):
                    for x in range(W_):
                        if (x<lo or x>hi) and handish(lp[x,y]): lp[x,y]=(0,0,0,0); gone.add((x,y))
                kill=[]                                             # the hand's own outline: black pixels next to the removed hand
                for y in range(H_):                                 # that touch no remaining coloured pixel
                    for x in range(W_):
                        c=lp[x,y]
                        if not (c[3] and max(c[:3])<45): continue
                        near=any((x+dx,y+dy) in gone for dx in (-1,0,1) for dy in (-1,0,1))
                        col=any(0<=x+dx<W_ and 0<=y+dy<H_ and lp[x+dx,y+dy][3] and max(lp[x+dx,y+dy][:3])>=45 for dx,dy in ((1,0),(-1,0),(0,1),(0,-1)))
                        if near and not col: kill.append((x,y))
                for q in kill: lp[q]=(0,0,0,0)
                cell=Image.new('RGBA',(C,C),(0,0,0,0)); cell.alpha_composite(lg,(0,WAIST))
                cell.alpha_composite(up.crop((0,0,C,WAIST)),(0,bobv)); nf.append(cell)
            fr=nf; bot=FEET; cx=C/2
        lst=[]
        for f in fr:
            cell=Image.new('RGBA',(C,C),(0,0,0,0)); cell.alpha_composite(f,(round(C/2-cx),FEET-bot))
            bb=cell.getbbox(); top=bb[1]; mid=(bb[0]+bb[2])/2
            cs=comps(cell)
            # face = the biggest skin blob in the head rows (front view); everything else is a hand or arm
            head=[c for c in cs if sum(1 for q in c if q[1]<top+14)>len(c)*0.6 and len(c)>=6]
            face=max(head,key=len) if (head and v=='se') else None
            hands=[c for c in cs if c is not face and len(c)>=2]
            tor=(mid+2, top+15)
            hand=None
            if hands:
                # every drawn view faces right, so the weapon hand is the skin blob furthest right
                far=max(hands,key=lambda c: max(q[0] for q in c))
                q=max(far,key=lambda q:(q[0]-tor[0])**2+(q[1]-tor[1])**2)
                hand=[q[0],q[1]]
            if n in ('hold_idle','hold_walking') and v=='ne' and hand:
                # back view: PixelLab raised the weapon arm to the shoulder; drop the fist 5 px to hip height like the front view
                hx,hy=hand; import math
                PX,PY=27,hy+2                                     # shoulder pivot
                arm=Image.new('RGBA',(C,C),(0,0,0,0)); ap=arm.load(); cp=cell.load()
                for y in range(hy-2,hy+5):
                    for x in range(PX,C):
                        if cp[x,y][3]: ap[x,y]=cp[x,y]; cp[x,y]=(0,0,0,0)
                ANG=-38
                arm=arm.rotate(ANG,resample=Image.NEAREST,center=(PX,PY)); rp=arm.load()
                lone=[(x,y) for y in range(1,C-1) for x in range(1,C-1) if rp[x,y][3] and sum(1 for dx in (-1,0,1) for dy in (-1,0,1) if (dx or dy) and rp[x+dx,y+dy][3])<2]
                for q in lone: rp[q]=(0,0,0,0)                    # drop stray specks left by the rotation
                cell.alpha_composite(arm)
                r=math.radians(-ANG); dx,dy=hx-PX,hy-PY
                hand=[round(PX+dx*math.cos(r)-dy*math.sin(r)), round(PY+dx*math.sin(r)+dy*math.cos(r))]
            if n in ('collapse','happy_jump'):
                ep=cell.load(); skin=(248,193,149,255); K=(0,0,0,255)
                eyes=[(x,y) for y in range(C-1) for x in range(1,C-1) if ep[x,y][3] and ep[x,y][2]>180 and ep[x,y][0]<200
                      and ep[x,y+1][3] and min(ep[x,y+1][:3])>220]
                for (x,y) in eyes:
                    if n=='collapse':  ep[x,y]=skin; ep[x-1,y]=skin; ep[x,y+1]=K; ep[x-1,y+1]=K          # -  -
                    else:              ep[x-1,y]=skin; ep[x,y]=K; ep[x,y+1]=skin; ep[x-1,y+1]=K; ep[x+1,y+1]=K   # ^  ^
            lst.append({'i':len(atlas),'hand':hand,'tor':[tor[0],tor[1]],'top':top}); atlas.append(cell)
        meta[n][v]=lst
cols=16; rows=(len(atlas)+cols-1)//cols
sheet=Image.new('RGBA',(cols*C,rows*C),(0,0,0,0))
for i,c in enumerate(atlas): sheet.alpha_composite(c,((i%cols)*C,(i//cols)*C))
sheet.save(OUT+'farm_atlas.png'); json.dump(meta,open(OUT+'farm_meta.json','w'))
rows=[('swing_a','se'),('swing_a','ne'),('swing_b','se'),('swing_b','ne'),('hold_idle','se'),('hold_idle','ne')]
out=Image.new('RGBA',(7*C,len(rows)*C),(205,205,200,255)); d=ImageDraw.Draw(out)
for r,(a,v) in enumerate(rows):
    for k,e in enumerate(meta[a][v]):
        i=e['i']; out.alpha_composite(sheet.crop(((i%16)*C,(i//16)*C,(i%16)*C+C,(i//16)*C+C)),(k*C,r*C))
        if e['hand']:
            hx,hy=e['hand']; tx,ty=e['tor']; d.line([(k*C+tx,r*C+ty),(k*C+hx,r*C+hy)],fill=(0,120,255,255)); d.point((k*C+hx,r*C+hy),fill=(255,0,255,255))
out.resize((out.width*5,out.height*5),Image.NEAREST).save(OUT+'swings.png')
