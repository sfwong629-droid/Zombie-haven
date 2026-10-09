import sys,json; sys.path.insert(0, __import__('os').path.dirname(__file__))
from sheet import *
def make(name, nfront=6, target=None, fh=None, foot=None):
    fr=load_checked(f'z_{name}.json')
    if not fr: return None
    fr=[clean(f) for f in fr]
    if target: fr=[shrink(f,target) if f.height>target else f for f in fr]
    print(name,[f.size for f in fr])
    front,back=fr[:nfront],fr[nfront:]
    W=max(f.width for f in fr)+2; H=max(f.height for f in fr)
    foot=foot or H+1; fh=fh or H+3
    sf=build(front,W,fh,foot); pal=list({p[:3] for p in sf.getdata() if p[3]}); sb=build(back,W,fh,foot,palette_from=pal)
    sf.save(f'assets/zombies/v4/{name}.png'); sb.save(f'assets/zombies/v4/{name}_back.png')
    both=Image.new('RGBA',(W*max(len(front),len(back)),fh*2),(0,0,0,0)); both.alpha_composite(sf,(0,0)); both.alpha_composite(sb,(0,fh)); preview(both,f'{name}_preview.png',4)
    print(f"  {name}: {{ fw: {W}, fh: {fh}, foot: {foot}, h: {H} }}  colours",len({p[:3] for p in sf.getdata() if p[3]}),len({p[:3] for p in sb.getdata() if p[3]}))
if __name__=='__main__':
    a=sys.argv; make(a[1], target=int(a[2]) if len(a)>2 and a[2]!='0' else None)
