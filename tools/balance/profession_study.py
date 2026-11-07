"""Profession study: auto-plays a town with a fixed roster (one of each profession) for N days, then repeats with each
profession removed (replaced by a Civilian), over several seeds. Reports what each profession contributes and what
the town loses without it.
    python3 tools/balance/profession_study.py [days] [seeds] [jobs-to-ablate|all] [label]"""
import asyncio, sys, os, json, collections
ROOT = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
sys.path.insert(0, os.path.join(ROOT, 'tests')); import run_tests as R
R.ROOT = os.environ.get('ZROOT', R.ROOT)
from playwright.async_api import async_playwright
AP = open(os.path.join(R.ROOT, 'tools', 'balance', 'ap.js')).read()
JOBS = ['Guard', 'Police Officer', 'Medic', 'Scavenger', 'Engineer', 'Cook', 'Farmer', 'Civilian']
RUN = r"""([days, roster, lock])=>{const S=ZH.S,W=ZH.world;
  S.sv.length=0;roster.forEach((j,i)=>S.sv.push(ZH.mk(['Ada','Bo','Cy','Di','Ed','Flo','Gus','Hal'][i],j,2,6+(i%4)*.6,10+Math.floor(i/4)*.6,i)));for(const b of W.buildings)b.staff=null;ZH.autoStaff();
  AP.lockJobs=lock;const M={kills:{},work:{},fight:{},care:{},fix:0,repairHp:0,downs:0,deaths:0,downT:[],prodFood:0,prodWater:0,prodMat:0,prodWood:0,heal:{}};const zT=new Map(),bH=new Map(),downAt=new Map();let tk=0;
  for(let d=0;d<days;d++)for(let h=0;h<24;h++){for(let k=0;k<1000;k++){
     for(const s of S.sv){if(s.target&&['attack','recover','chase'].includes(s.mode))zT.set(s.target,s.job);}
     const hp0=new Map(S.sv.map(s=>[s,s.hp]));
     ZH.simTick();tk++;if(k%60===59){ZH.tripUpdate();AP.tick();}
     for(const s of S.sv){const g=s.hp-(hp0.get(s)||s.hp);if(g>0){const src=s.mode==='hospital'?'care':s.mode==='down'?'down':s.sleeping?'sleep':s.mode;M.heal[src]=(M.heal[src]||0)+g;}
       if(s.mode==='down'&&!downAt.has(s)){downAt.set(s,tk);M.downs++;} if(s.mode!=='down'&&s.mode!=='hospital'&&downAt.has(s)){M.downT.push(tk-downAt.get(s));downAt.delete(s);}}
     {const live=new Set(S.z);for(const [z,j] of zT){if((!live.has(z)||z.hp<=0)&&!z.escaped){M.kills[j]=(M.kills[j]||0)+1;zT.delete(z);}else if(!live.has(z))zT.delete(z);}}   /* dead zombies leave S.z within the tick */
     if(k%30===0){for(const s of S.sv){if(s.mode==='work')M.work[s.job]=(M.work[s.job]||0)+1;if(['chase','attack','recover'].includes(s.mode))M.fight[s.job]=(M.fight[s.job]||0)+1;if(s.mode==='fix')M.fix++;}
       for(const b of W.buildings){const p=bH.get(b);if(p!=null&&b.hp>p&&tk-(b.lastHit||-9999)>60)M.repairHp+=b.hp-p;bH.set(b,b.hp);}}}
   AP.hour();}
  const E=ZH.econ?ZH.econ():null;M.deaths=(S.fallen||[]).length;M.alive=S.sv.length;M.nb=W.buildings.length;M.rank=S.rank;M.food=Math.round(S.food);M.water=Math.round(S.water);
  M.econ=E?{food:E.food&&E.food.prod,water:E.water&&E.water.prod}:null;M.produced=S.produced;M.kTot=S.kills;return M}"""
async def one(br, port, seed, days, removed):
    ctx, pg, errs = await R.open_game(br, port, 'prof%d' % seed)
    await pg.evaluate("(sd)=>{let x=sd;Math.random=()=>{x=(x*1103515245+12345)%2147483648;return x/2147483648};const b0=Date.now();Date.now=()=>b0+ZH.tick*1000/60;}", seed)
    await pg.evaluate(AP); await pg.evaluate("()=>{AP.exp=true}")
    roster = [('Civilian' if j == removed else j) for j in JOBS]
    r = await pg.evaluate(RUN, [days, roster, [removed] if removed else []]); r['errs'] = errs[:2]; await ctx.close(); return r
async def main():
    days = int(sys.argv[1]) if len(sys.argv) > 1 else 10
    seeds = [int(x) for x in (sys.argv[2] if len(sys.argv) > 2 else '3,7,11').split(',')]
    which = sys.argv[3] if len(sys.argv) > 3 else 'all'
    label = sys.argv[4] if len(sys.argv) > 4 else 'run'
    nofull = which.startswith('-'); which = which.lstrip('-')   # '-Guard,Medic' = only those ablations, no full roster
    cfgs = ([] if nofull else [None]) + ([j for j in JOBS if j != 'Civilian'] if which == 'all' else which.split(','))
    srv, port = R.serve(); res = {}
    async with async_playwright() as p:
        br = await p.chromium.launch()
        for c in cfgs:
            for sd in seeds:
                r = await one(br, port, sd, days, c); res.setdefault(c or 'full', []).append(r)
                print(c or 'full', sd, 'deaths', r['deaths'], 'downs', r['downs'], 'alive', r['alive'], 'nb', r['nb'], 'kills', r['kTot'], flush=True)
        await br.close()
    json.dump(res, open(os.path.join(os.path.dirname(os.path.abspath(__file__)), f'prof_{label}.json'), 'w'), indent=1)
asyncio.run(main())
