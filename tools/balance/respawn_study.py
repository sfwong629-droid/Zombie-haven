"""Night respawn study: how fast killed zombies are replaced at night, and what that does to a town.
Runs the auto-player for N days per seed under one spawn rule and records, per night: zombies spawned, kills,
how much of the night the horde sat at full strength, downs and deaths.
    python3 tools/balance/respawn_study.py DAYS SEEDS VARIANT
VARIANT: base | gapX (refill gap times X, e.g. gap4) | budgetX (a fixed pool of X times the night cap per night) | waveX (refill only every X hours)"""
import asyncio, sys, os, json, re, statistics as st
sys.path.insert(0, os.path.join(os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__)))), 'tests'))
import run_tests as R
from playwright.async_api import async_playwright
AP = open(os.path.join(R.ROOT, 'tools', 'balance', 'ap.js')).read()
PROBE = """(days)=>{const S=ZH.S,out={nights:[]};let d0=0,x0=0,k0=0,s0=0;
  const kills=()=>Object.values(S.killsBy||{}).reduce((a,b)=>a+b,0)||S.kills||0;
  for(let d=0;d<days;d++){const n={day:S.day,full:0,ticks:0,boss:false};
    for(let h=0;h<24;h++){if(S.hour===20){d0=AP.downs.length;x0=(S.fallen||[]).length;k0=S.kills||0;s0=S.spawnTot||0;}
      for(let k=0;k<1000;k+=60){ZH.step(60);ZH.tripUpdate();AP.tick();
        if(S.hour>=20||S.hour<6){const act=S.z.filter(z=>z.hp>0&&!z.human&&z.mode!=='zleave').length;n.ticks++;if(act>=(S.nightCap||99)*.85)n.full++;if(S.z.some(z=>z.type==='boss'&&z.hp>0))n.boss=true;}}
      AP.hour();
      if(S.hour===6){n.spawned=(S.spawnTot||0)-s0;n.kills=(S.kills||0)-k0;n.downs=AP.downs.length-d0;n.deaths=(S.fallen||[]).length-x0;n.cap=S.nightCap;n.alive=S.sv.length;}}
    n.fullPct=Math.round(100*n.full/Math.max(1,n.ticks));out.nights.push(n);}
  out.fallen=(S.fallen||[]).length;out.alive=S.sv.length;return out}"""
def knobs(v):
    m = re.match(r'(gap|budget|wave)([\d.]+)', v)
    return {m.group(1): float(m.group(2))} if m else {}
async def one(br, port, seed, days, v):
    ctx, pg, errs = await R.open_game(br, port, 'resp%d' % seed)
    await pg.evaluate("(a)=>{let x=a[0];Math.random=()=>{x=(x*1103515245+12345)%2147483648;return x/2147483648};const b0=Date.now();Date.now=()=>b0+ZH.tick*1000/60;window.ZH_SPAWN=a[1];}", [seed, knobs(v)])
    await pg.evaluate(AP); await pg.evaluate("()=>{AP.exp=true}")
    r = await pg.evaluate(PROBE, days); r['seed'] = seed; r['errs'] = errs[:2]; await ctx.close(); return r
async def main():
    days = int(sys.argv[1]); seeds = [int(x) for x in sys.argv[2].split(',')]; v = sys.argv[3]
    srv, port = R.serve(); res = []
    async with async_playwright() as p:
        br = await p.chromium.launch()
        for sd in seeds:
            r = await one(br, port, sd, days, v); res.append(r); print(f"{v} seed {sd} alive {r['alive']} fallen {r['fallen']} errs {r['errs']}", flush=True)
        await br.close()
    json.dump(res, open(os.path.join(os.path.dirname(os.path.abspath(__file__)), f'resp_{v}.json'), 'w'), indent=1)
    ns = [n for r in res for n in r['nights'] if 'spawned' in n]
    f = [r['fallen'] for r in res]
    print(f"{v}: fallen {st.mean(f):.2f} ±{st.stdev(f)/len(f)**.5:.2f} | per night: spawned {st.mean(n['spawned'] for n in ns):.1f} kills {st.mean(n['kills'] for n in ns):.1f} downs {st.mean(n['downs'] for n in ns):.2f} deaths {st.mean(n['deaths'] for n in ns):.2f} at full strength {st.mean(n['fullPct'] for n in ns):.0f}%")
asyncio.run(main())
