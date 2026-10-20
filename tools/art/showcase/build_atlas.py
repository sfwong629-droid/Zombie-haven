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
