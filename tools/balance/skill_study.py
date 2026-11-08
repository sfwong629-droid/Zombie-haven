"""Skill study: does playing well matter? Runs the same towns under different players and compares how they end up.
Players: idle (answers popups and move-ins only), casual (builds, nothing else), the auto-player (a sensible player),
expert (the auto-player plus live decisions: policy by situation, answering breach alerts, calling the militia),
and the auto-player with one habit switched off at a time.
    python3 tools/balance/skill_study.py DAYS SEEDS PLAYER[,PLAYER...] LABEL
PLAYER: idle | casual | ap | expert | no-<habit> (habits: trays events rank finale posts exp bandage repair jobs research tools supply plan walls territory trader radio) | shuffle (random build order)"""
import asyncio, sys, os, json, statistics as st
sys.path.insert(0, os.path.join(os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__)))), 'tests'))
import run_tests as R
from playwright.async_api import async_playwright
AP = open(os.path.join(R.ROOT, 'tools', 'balance', 'ap.js')).read()
CASUAL_OFF = ['trays', 'events', 'finale', 'posts', 'exp', 'bandage', 'repair', 'jobs', 'research', 'tools', 'walls', 'territory', 'trader', 'radio', 'supply']
RUN = """(a)=>{const [days,pl]=a,S=ZH.S;
  if(pl==='idle')AP.off.add('all');else if(pl==='casual')for(const k of %s)AP.off.add(k);else if(pl==='expert')AP.expert=true;else if(pl.startsWith('expert-'))(AP.expert=true,AP.xoff=new Set([pl.slice(7)]));else if(pl.startsWith('no-'))AP.off.add(pl.slice(3));
  else if(pl==='shuffle'){const p=['barrel','farm','tent','medic','bench','hq2','scrapyard','water','tent','lumber','crates','farm','quarry','armory','gym','cabin','library','storage','field','clinic','workshop'];for(let i=p.length-1;i>0;i--){const j=Math.floor(Math.random()*(i+1));[p[i],p[j]]=[p[j],p[i]];}AP.plan=p;}
  const d0=S.day;const peak={pop:0};
  const tl=[];const pw=()=>S.sv.filter(q=>['Guard','Police Officer','Scavenger'].includes(q.job)).map(q=>8*q.l+((ZH.ITEMS[(q.eq||{}).weapon]||{}).atk||0)).sort((a,b)=>b-a).slice(0,4).reduce((a,b)=>a+b,0);
  while(S.day<d0+days&&S.sv.length){for(let k=0;k<1000;k+=60){ZH.step(60);ZH.tripUpdate();AP.tick();}AP.hour();peak.pop=Math.max(peak.pop,S.sv.length);
    if(S.hour===12)tl.push([S.day,S.sv.length,S.rank,ZH.world.buildings.length,pw(),(S.fallen||[]).length,S.left||0,Math.round(S.food),Math.round(S.water),Math.round(S.mat)]);}
  const bt={};for(const b of ZH.world.buildings){const d=ZH.DEFS[b.type];const o=bt[b.type]||(bt[b.type]={n:0,staffed:0,wh:0,slot:!!d.slot});o.n++;if(b.staff)o.staffed++;if(b.wh&&b.wh.length)o.wh+=b.wh.reduce((a,v)=>a+v,0)/b.wh.length;}
  const jobs={};for(const q of S.sv)jobs[q.job]=(jobs[q.job]||0)+1;
  const fallen=(S.fallen||[]).length;
  return {fallen,alive:S.sv.length,peakPop:peak.pop,joined:Object.values(AP.joins||{}).reduce((a,b)=>a+b,0),rank:S.rank,terr:S.terr||0,nb:ZH.world.buildings.length,hq:ZH.hqTier(),
    walls:[...ZH.world.walls.values()].filter(w=>!w.broken).length,res:Object.keys(ZH.RESEARCH).filter(k=>ZH.researched(k)).length,lv:S.sv.length?S.sv.reduce((a,q)=>a+q.l,0)/S.sv.length:0,
    tl,bt,jobs,left:S.left||0,food:Math.round(S.food),water:Math.round(S.water),mat:Math.round(S.mat),kills:S.kills||0,downs:AP.downs.length,wiped:S.sv.length===0,day:S.day,won:!!S.won,score:ZH.scoreOf?ZH.scoreOf():0}}""" % json.dumps(CASUAL_OFF)
async def one(br, port, seed, days, pl):
    ctx, pg, errs = await R.open_game(br, port, 'skill%d' % seed)
    await pg.evaluate("(sd)=>{let x=sd;Math.random=()=>{x=(x*1103515245+12345)%2147483648;return x/2147483648};const b0=Date.now();Date.now=()=>b0+ZH.tick*1000/60;}", seed)
    await pg.evaluate(AP); await pg.evaluate("()=>{AP.exp=true}")
    r = await pg.evaluate(RUN, [days, pl]); r['seed'] = seed; r['player'] = pl; r['errs'] = errs[:2]; await ctx.close(); return r
async def main():
    days = int(sys.argv[1]); seeds = [int(x) for x in sys.argv[2].split(',')]; pls = sys.argv[3].split(','); label = sys.argv[4]
    srv, port = R.serve(); res = {}
    out = os.path.join(os.path.dirname(os.path.abspath(__file__)), f'skill_{label}.json')
    async with async_playwright() as p:
        br = await p.chromium.launch()
        for pl in pls:
            res[pl] = []
            for sd in seeds:
                r = await one(br, port, sd, days, pl); res[pl].append(r)
                print(f"{pl:12} seed {sd}: fallen {r['fallen']} alive {r['alive']} rank {r['rank']} nb {r['nb']} score {r['score']} errs {r['errs']}", flush=True)
                json.dump(res, open(out, 'w'), indent=1)
        await br.close()
asyncio.run(main())
