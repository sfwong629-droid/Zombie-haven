"""Squad power over time: what a sensible player's best 4 fighters look like each day (levels, weapons, HP), with the town's rank and size.
Used to set the strength gates of the dungeon plan.  python3 tools/balance/squad_probe.py DAYS SEEDS"""
import asyncio, sys, os, json
sys.path.insert(0, os.path.join(os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__)))), 'tests'))
import run_tests as R
from playwright.async_api import async_playwright
AP = open(os.path.join(R.ROOT, 'tools', 'balance', 'ap.js')).read()
RUN = """(days)=>{const S=ZH.S,out=[];const d0=S.day;
  while(S.day<d0+days&&S.sv.length){for(let k=0;k<1000;k+=60){ZH.step(60);ZH.tripUpdate();AP.tick();}AP.hour();
    if(S.hour===12){const F=S.sv.filter(q=>['Guard','Police Officer','Scavenger'].includes(q.job)).map(q=>{const w=ZH.ITEMS[(q.eq||{}).weapon]||{atk:0};return {l:q.l,atk:w.atk||0,max:q.max,p:8*q.l+(w.atk||0)}}).sort((a,b)=>b.p-a.p).slice(0,4);
      out.push({day:S.day,rank:S.rank,pop:S.sv.length,nb:ZH.world.buildings.length,n:F.length,power:F.reduce((a,f)=>a+f.p,0),lv:F.length?F.reduce((a,f)=>a+f.l,0)/F.length:0,atk:F.length?F.reduce((a,f)=>a+f.atk,0)/F.length:0,hp:F.length?F.reduce((a,f)=>a+f.max,0)/F.length:0});}}
  return out}"""
async def main():
    days = int(sys.argv[1]); seeds = [int(x) for x in sys.argv[2].split(',')]; srv, port = R.serve(); res = {}
    async with async_playwright() as p:
        br = await p.chromium.launch()
        for sd in seeds:
            ctx, pg, errs = await R.open_game(br, port, 'sq%d' % sd)
            await pg.evaluate("(sd)=>{let x=sd;Math.random=()=>{x=(x*1103515245+12345)%2147483648;return x/2147483648};const b0=Date.now();Date.now=()=>b0+ZH.tick*1000/60;}", sd)
            await pg.evaluate(AP); await pg.evaluate("()=>{AP.exp=true}"); res[sd] = await pg.evaluate(RUN, days); await ctx.close()
            print('seed', sd, ' '.join(f"d{r['day']}:R{r['rank']}/p{r['pop']}/P{r['power']}" for r in res[sd]), flush=True)
        await br.close()
    json.dump(res, open(os.path.join(os.path.dirname(os.path.abspath(__file__)), 'squad_probe.json'), 'w'))
asyncio.run(main())
