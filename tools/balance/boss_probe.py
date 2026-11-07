"""Boss-night probe: auto-plays to the first boss night (day 6), then logs the town every half hour from 18:00 to 18:00 the next day:
zombies by kind and mode, the boss, survivors by mode, downs and deaths.
    python3 tools/balance/boss_probe.py [seed,seed,...] [label] [bossDay]"""
import asyncio, sys, os, json, collections
sys.path.insert(0, os.path.join(os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__)))), 'tests'))
import run_tests as R
R.ROOT = os.environ.get('ZROOT', R.ROOT)
from playwright.async_api import async_playwright
AP = open(os.path.join(R.ROOT, 'tools', 'balance', 'ap.js')).read()
PROBE = """(bd)=>{const S=ZH.S,out={log:[],boss:null};
  while(!(S.day===bd&&S.hour>=18)){ZH.step(60);ZH.tripUpdate();AP.tick();if(ZH.tick%1000<60)AP.hour();}
  const d0=AP.downs.length,x0=AP.deaths.length,f0=(S.fallen||[]).length;
  for(let i=0;i<48;i++){for(let k=0;k<500;k+=60){ZH.step(60);ZH.tripUpdate();AP.tick();if(ZH.tick%1000<60)AP.hour();}
    const z=S.z.filter(z=>z.hp>0&&!z.human),zm={},zk={},sm={};for(const q of z){zm[q.mode]=(zm[q.mode]||0)+1;zk[q.type]=(zk[q.type]||0)+1}
    for(const q of S.sv)sm[q.mode]=(sm[q.mode]||0)+1;const b=S.z.find(q=>q.type==='boss'&&q.hp>0);
    if(b&&!out.boss)out.boss={bk:b.bk,max:b.max,mob:S.z.filter(q=>q.mob).length};
    out.log.push({t:S.day+':'+String(S.hour).padStart(2,'0'),z:z.length,zk,zm,sv:S.sv.length,sm,boss:b?Math.round(b.hp/b.max*100)+'% '+b.mode:'-',fighters:S.sv.filter(q=>['Guard','Police Officer','Scavenger'].includes(q.job)&&q.hp>q.max*.5&&!['down','hospital'].includes(q.mode)).length})}
  out.downs=AP.downs.slice(d0);out.deaths=AP.deaths.slice(x0);out.fallen=(S.fallen||[]).slice(f0);out.levels=S.sv.map(q=>q.job+' L'+q.l);return out}"""
async def one(br, port, seed, bd):
    ctx, pg, errs = await R.open_game(br, port, 'boss%d' % seed)
    await pg.evaluate("(sd)=>{let x=sd;Math.random=()=>{x=(x*1103515245+12345)%2147483648;return x/2147483648};const b0=Date.now();Date.now=()=>b0+ZH.tick*1000/60;}", seed)
    await pg.evaluate(AP); await pg.evaluate("()=>{AP.exp=true}")
    r = await pg.evaluate(PROBE, bd); r['seed'] = seed; r['errs'] = errs[:2]; await ctx.close(); return r
async def main():
    seeds = [int(x) for x in (sys.argv[1] if len(sys.argv) > 1 else '3,7,11,19').split(',')]
    label = sys.argv[2] if len(sys.argv) > 2 else 'run'; bd = int(sys.argv[3]) if len(sys.argv) > 3 else 6
    srv, port = R.serve(); res = []
    async with async_playwright() as p:
        br = await p.chromium.launch()
        for sd in seeds:
            r = await one(br, port, sd, bd); res.append(r)
            print(f"seed {sd} boss {r['boss']} downs {len(r['downs'])} deaths {len(r['fallen'])} errs {r['errs']}", flush=True)
            for e in r['log'][::2]: print('  ', e['t'], 'z', e['z'], e['zk'], 'boss', e['boss'], '| sv', e['sv'], e['sm'], 'fit fighters', e['fighters'], flush=True)
            for x in r['downs']: print('   down', x.get('d'), x.get('h'), x.get('by'), x.get('who'), x.get('was'))
            for x in r['fallen']: print('   DIED', x)
        await br.close()
    json.dump(res, open(os.path.join(os.path.dirname(os.path.abspath(__file__)), f'boss_{label}.json'), 'w'), indent=1)
asyncio.run(main())
