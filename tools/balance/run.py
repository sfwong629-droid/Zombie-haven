# usage: run.py SEED DAYS OUTFILE  — plays DAYS game days with the auto-player, one JSON line per day
import asyncio,json,sys,time
from playwright.async_api import async_playwright
SEED,DAYS,OUT=int(sys.argv[1]),int(sys.argv[2]),sys.argv[3]
AP=open(__import__('os').path.join(__import__('os').path.dirname(__file__),'ap.js')).read()
async def main():
    async with async_playwright() as p:
        b=await p.chromium.launch(); pg=await (await b.new_context(viewport={'width':390,'height':844})).new_page(); errs=[]
        pg.on('pageerror',lambda e:errs.append(str(e)))
        await pg.goto(f'http://localhost:8765/index.html?s={SEED}'); await pg.wait_for_timeout(2500)
        await pg.evaluate("(seed)=>{window.requestAnimationFrame=()=>0;let x=seed;Math.random=()=>{x=(x*1103515245+12345)%2147483648;return x/2147483648};ZH.showEventPopup=()=>{};const b0=Date.now();Date.now=()=>b0+ZH.tick*1000/60;}",SEED)
        await pg.evaluate("()=>{let v=ZH.S.mat;window.LEDGER={};Object.defineProperty(ZH.S,'mat',{get(){return v},set(n){const d=n-v;if(Math.abs(d)>1e-9){const st=new Error().stack.split(String.fromCharCode(10));let fn='?';for(let i=2;i<st.length;i++){const m=st[i].match(/at (?:Object\\.)?([A-Za-z_$][\\w$]*)/);if(m&&!['set','eval'].includes(m[1])){fn=m[1];break}}const k=fn+(d>0?'+':'-');LEDGER[k]=(LEDGER[k]||0)+d}v=n},configurable:true,enumerable:true})}"); await pg.evaluate(AP); await pg.evaluate('(e)=>{AP.exp=e[0];AP.nowalls=e[1]}', [len(sys.argv)<5 or sys.argv[4]!='noexp', len(sys.argv)>5 and sys.argv[5]=='nowalls'])
        f=open(OUT,'w'); t0=time.time()
        for d in range(DAYS):
            r=await pg.evaluate("()=>{for(let h=0;h<24;h++){for(let k=0;k<1000;k+=60){ZH.step(60);ZH.tripUpdate();AP.tick();}AP.hour()}return AP.snap()}")
            r['t']=round(time.time()-t0); r['err']=len(errs); f.write(json.dumps(r)+'\n'); f.flush()
            if r['sv']==0: break
        fin=await pg.evaluate("()=>({downs:AP.downs,deaths:AP.deaths,built:AP.built,events:AP.events,ledger:Object.fromEntries(Object.entries(LEDGER).map(([k,v])=>[k,Math.round(v)]).sort((a,b)=>a[1]-b[1])),fallen:ZH.S.fallen.length,trips:ZH.S.tripLog||null,levels:ZH.S.sv.map(s=>s.name+' '+s.job+' L'+s.l)})")
        fin['errors']=errs[:5]; f.write(json.dumps({'final':fin})+'\n'); f.close(); await b.close()
asyncio.run(main())
