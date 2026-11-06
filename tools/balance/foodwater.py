# Food / water balance: a fresh camp + a set of buildings, no zombies, N days; per-day income and spending by source.
import asyncio, json, sys
from playwright.async_api import async_playwright
SC = json.loads(sys.argv[1]); DAYS = int(sys.argv[2]) if len(sys.argv) > 2 else 4; EV = sys.argv[3] if len(sys.argv) > 3 else ''
async def main():
    async with async_playwright() as p:
        br = await p.chromium.launch(); pg = await br.new_page(viewport={'width': 390, 'height': 844}); errs = []; pg.on('pageerror', lambda e: errs.append(str(e)))
        await pg.goto('http://127.0.0.1:8765/index.html?s=7&3d=1'); await pg.wait_for_function('window.ZH && ZH.S && ZH.S.sv.length > 0'); await pg.wait_for_timeout(1500)
        await pg.evaluate("()=>{window.requestAnimationFrame=()=>0;ZH.showEventPopup=()=>{};}")
        if EV: await pg.evaluate('()=>{' + EV + '}')
        r = await pg.evaluate("""(sc)=>{const S=ZH.S,W=ZH.world,D=ZH.Wd.DEFS;S.wood=99;S.mat=99;
          const spots=[[4,8],[5,8],[4,7],[5,7],[11,8],[12,8],[11,7],[12,7],[3,12],[4,12],[12,12],[3,9],[3,10]];let i=0;
          for(const [t,n] of Object.entries(sc.b||{}))for(let k=0;k<n;k++){const [x,y]=spots[i++];W.buildings.push({type:t,x,y,rot:0,w:D[t].w,h:D[t].h,q:D[t].q,a:D[t].a});}
          ZH.Wd.bump(W);for(const j of (sc.add||[]))ZH.newcomer(j,1);ZH.autoStaff();
          const days=[];const n0=ZH.ECO.hist.length;
          for(let d=0;d<sc.days;d++){const f0=S.food,w0=S.water;for(let h=0;h<24;h++){for(let k=0;k<1000;k+=100){S.z.length=0;ZH.step(100);}if(h%2===0){ZH.autoStaff();for(const b of W.buildings)if(b.bonus)ZH.collectBonus(b);}}
            const H=ZH.ECO.hist.slice(-24),sum={food:{},water:{}};for(const e of H)for(const r of ['food','water'])for(const [c,v] of Object.entries(e[r]||{}))sum[r][c]=(sum[r][c]||0)+v;
            const rd=(o)=>Object.fromEntries(Object.entries(o).map(([k,v])=>[k,+v.toFixed(1)]).sort((a,b)=>b[1]-a[1]));
            days.push({d:S.day,pop:S.sv.length,staff:W.buildings.filter(b=>b.staff).map(b=>b.type+':'+b.staff.job).join(','),food:+S.food.toFixed(1),water:+S.water.toFixed(1),cap:ZH.supplyCap(),dF:+(S.food-f0).toFixed(1),dW:+(S.water-w0).toFixed(1),fIn:rd(sum.food),wIn:rd(sum.water)});}
          return days}""", {**SC, 'days': DAYS})
        for d in r: print(json.dumps(d))
        print('errors', errs[:2]); await br.close()
asyncio.run(main())
