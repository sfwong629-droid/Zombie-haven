"""Are staffed buildings actually worked? Samples every staffed building every 100 ticks for N days under the auto-player:
share of samples where the worker is at work (ZH.isWorking), by building type and by hour, and what the staff are doing instead."""
import asyncio, sys, os, json
sys.path.insert(0, os.path.join(os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__)))), 'tests'))
import run_tests as R
from playwright.async_api import async_playwright
AP = open(os.path.join(R.ROOT, 'tools', 'balance', 'ap.js')).read()
RUN = """(days)=>{const S=ZH.S,W=ZH.world,by={},hr={},inst={};const d0=S.day;
  while(S.day<d0+days){for(let k=0;k<1000;k+=100){ZH.step(100);ZH.tripUpdate();if(k%600===0)AP.tick();
      for(const b of W.buildings){const d=ZH.DEFS[b.type];if(!d.slot||!b.staff)continue;const w=ZH.isWorking(b),o=by[b.type]||(by[b.type]={n:0,w:0,shift:0,wShift:0});o.n++;if(w)o.w++;
        const on=ZH.onShift(b.staff);if(on){o.shift++;if(w)o.wShift++;else{const m=b.staff.mode+(b.staff.purpose?'/'+b.staff.purpose:'');inst[m]=(inst[m]||0)+1;}}
        const h=hr[S.hour]||(hr[S.hour]={n:0,w:0});h.n++;if(w)h.w++;}}AP.hour();}
  return {by,hr,inst}}"""
async def main():
    days = int(sys.argv[1]); seeds = [int(x) for x in sys.argv[2].split(',')]; srv, port = R.serve(); res = []
    async with async_playwright() as p:
        br = await p.chromium.launch()
        for sd in seeds:
            ctx, pg, errs = await R.open_game(br, port, 'wp%d' % sd)
            await pg.evaluate("(sd)=>{let x=sd;Math.random=()=>{x=(x*1103515245+12345)%2147483648;return x/2147483648};const b0=Date.now();Date.now=()=>b0+ZH.tick*1000/60;}", sd)
            await pg.evaluate(AP); await pg.evaluate("()=>{AP.exp=true}"); res.append(await pg.evaluate(RUN, days)); await ctx.close()
        await br.close()
    by = {}; inst = {}; hr = {}
    for r in res:
        for k, v in r['by'].items():
            o = by.setdefault(k, [0, 0, 0, 0]); o[0] += v['n']; o[1] += v['w']; o[2] += v['shift']; o[3] += v['wShift']
        for k, v in r['inst'].items(): inst[k] = inst.get(k, 0) + v
        for k, v in r['hr'].items(): o = hr.setdefault(int(k), [0, 0]); o[0] += v['n']; o[1] += v['w']
    print('building: worked share of all time | share of shift time on the job')
    for k, (n, w, sh, ws) in sorted(by.items(), key=lambda x: -x[1][0]): print(f'  {k:12} {w / n:5.0%} | {ws / max(1, sh):5.0%} on shift ({sh} samples)')
    print('by hour:', ' '.join(f'{h}:{w / n:.0%}' for h, (n, w) in sorted(hr.items())))
    tot = sum(inst.values()); print('on shift but not working, doing:', ', '.join(f'{k} {v / tot:.0%}' for k, v in sorted(inst.items(), key=lambda x: -x[1])[:12]))
asyncio.run(main())
