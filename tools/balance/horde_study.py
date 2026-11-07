"""Horde balance study: auto-plays the game for N days over several seeds and reports, per day, which zombies came,
how many survivors went down or died, and what killed them.
    python3 tools/balance/horde_study.py [days] [seed,seed,...] [label]
Writes tools/balance/horde_<label>.json and prints a summary. ZROOT=<folder> runs another copy of the game."""
import asyncio, sys, os, json, collections
sys.path.insert(0, os.path.join(os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__)))), 'tests'))
import run_tests as R
R.ROOT = os.environ.get('ZROOT', R.ROOT)
from playwright.async_api import async_playwright
AP = open(os.path.join(R.ROOT, 'tools', 'balance', 'ap.js')).read()
PROBE = """(days)=>{const S=ZH.S, seen=new WeakSet(), out={days:[]}; let downs0=0;
  for(let d=0;d<days;d++){const day={day:S.day,spawn:{},night:{},downs:0,deaths:0,peak:0,peakNight:0,bossNight:false};
    for(let h=0;h<24;h++){for(let k=0;k<1000;k+=60){ZH.step(60);ZH.tripUpdate();AP.tick();
        const act=S.z.filter(z=>z.hp>0&&!z.human&&z.mode!=='zleave').length; if(S.hour>=6&&S.hour<20) day.peak=Math.max(day.peak,act); else day.peakNight=Math.max(day.peakNight,act);
        for(const z of S.z){if(seen.has(z))continue;seen.add(z);const b=(S.hour>=20||S.hour<6)?day.night:day.spawn;b[z.type]=(b[z.type]||0)+1;if(z.type==='boss')day.bossNight=true;}}
      AP.hour();}
    day.downs=AP.downs.length-downs0;downs0=AP.downs.length;day.deaths=AP.deaths.filter(x=>x.d===S.day-1||x.d===S.day).length;day.alive=S.sv.length;day.fallen=(S.fallen||[]).length;day.rank=S.rank;day.food=Math.round(S.food);day.water=Math.round(S.water);
    out.days.push(day);}
  out.downs=AP.downs.map(x=>({d:x.d,h:x.h,by:x.by,who:x.who,was:x.was,inTown:x.inTown}));out.deaths=AP.deaths.map(x=>({d:x.d,h:x.h,who:x.who,z:x.z}));out.events=AP.events;out.snap=AP.snap();return out}"""
async def one(br, port, seed, days):
    ctx, pg, errs = await R.open_game(br, port, 'horde%d' % seed)
    await pg.evaluate("(sd)=>{let x=sd;Math.random=()=>{x=(x*1103515245+12345)%2147483648;return x/2147483648};const b0=Date.now();Date.now=()=>b0+ZH.tick*1000/60;}", seed)
    await pg.evaluate(AP); await pg.evaluate("()=>{AP.exp=true}")
    r = await pg.evaluate(PROBE, days); r['seed'] = seed; r['errs'] = errs[:2]; await ctx.close(); return r
async def main():
    days = int(sys.argv[1]) if len(sys.argv) > 1 else 12
    seeds = [int(x) for x in (sys.argv[2] if len(sys.argv) > 2 else '3,5,7,11').split(',')]
    label = sys.argv[3] if len(sys.argv) > 3 else 'run'
    srv, port = R.serve(); res = []
    async with async_playwright() as p:
        br = await p.chromium.launch()
        for sd in seeds: res.append(await one(br, port, sd, days)); print('seed', sd, 'alive', res[-1]['snap'].get('sv'), 'fallen', res[-1]['snap'].get('fallen'), flush=True)
        await br.close()
    json.dump(res, open(os.path.join(os.path.dirname(os.path.abspath(__file__)), f'horde_{label}.json'), 'w'), indent=1)
    # summary
    n = len(res); print(f'\n{label}: {n} seeds x {days} days')
    print('day  alive  fallen  downs  peak day/night  new types (day+night, avg per seed)')
    for i in range(days):
        ds = [r['days'][i] for r in res if len(r['days']) > i]
        ty = collections.Counter()
        for d in ds: ty.update(d['spawn']); ty.update(d['night'])
        ts = ', '.join(f'{k} {v / n:.1f}' for k, v in ty.most_common() if k not in ('walker', 'crawler'))
        print(f"{ds[0]['day']:>3} {sum(d['alive'] for d in ds) / n:6.1f} {sum(d['fallen'] for d in ds) / n:7.1f} {sum(d['downs'] for d in ds) / n:6.1f} {sum(d['peak'] for d in ds) / n:6.1f}/{sum(d['peakNight'] for d in ds) / n:<5.1f} walkers+crawlers {sum(ty[k] for k in ('walker', 'crawler')) / n:.0f}; {ts}")
    by = collections.Counter(x['by'] for r in res for x in r['downs']); print('downed next to:', by.most_common())
    print('deaths by day:', collections.Counter(x['d'] for r in res for x in r['deaths']).most_common())
asyncio.run(main())
