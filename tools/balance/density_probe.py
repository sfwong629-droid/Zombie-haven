"""How much land does a town use? Auto-plays N days, then measures building footprint tiles, wall tiles and the territory's size."""
import asyncio, sys, os, json
sys.path.insert(0, os.path.join(os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__)))), 'tests'))
import run_tests as R
from playwright.async_api import async_playwright
AP = open(os.path.join(R.ROOT, 'tools', 'balance', 'ap.js')).read()
RUN = """(days)=>{const S=ZH.S,W=ZH.world;const d0=S.day;const out=[];
  while(S.day<d0+days){for(let k=0;k<1000;k+=60){ZH.step(60);ZH.tripUpdate();AP.tick();}AP.hour();
    if(S.hour===12&&S.day%5===0){const T=ZH.Wd.TERRITORY[S.terr||0];const area=(T.x1-T.x0+1)*(T.y1-T.y0+1);let fp=0;const types={};for(const b of W.buildings){const d=ZH.DEFS[b.type];fp+=d.w*d.h;types[b.type]=(types[b.type]||0)+1;}
      out.push({day:S.day,terr:S.terr||0,area,nb:W.buildings.length,fp,walls:[...W.walls.values()].length,pop:S.sv.length,rank:S.rank,types});}}
  return out}"""
async def main():
    days = int(sys.argv[1]); seeds = [int(x) for x in sys.argv[2].split(',')]; srv, port = R.serve(); res = {}
    async with async_playwright() as p:
        br = await p.chromium.launch()
        for sd in seeds:
            ctx, pg, errs = await R.open_game(br, port, 'dn%d' % sd)
            await pg.evaluate("(sd)=>{let x=sd;Math.random=()=>{x=(x*1103515245+12345)%2147483648;return x/2147483648};const b0=Date.now();Date.now=()=>b0+ZH.tick*1000/60;}", sd)
            await pg.evaluate(AP); await pg.evaluate("()=>{AP.exp=true}"); res[sd] = await pg.evaluate(RUN, days); await ctx.close()
            for r in res[sd]: print(sd, {k: v for k, v in r.items() if k != 'types'}, flush=True)
        await br.close()
    json.dump(res, open(os.path.join(os.path.dirname(os.path.abspath(__file__)), 'density.json'), 'w'))
asyncio.run(main())
