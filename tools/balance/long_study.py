"""Long-run study (Balance chat, 21 Nov 2026): one bot town played for as many game days as the time budget allows,
one line of JSON per game day, with logic checks and a backup of the town every 10 days.
    python3 tools/balance/long_study.py SEED MAX_DAYS BUDGET_SECONDS OUT_DIR
Writes OUT_DIR/s<seed>.jsonl (a line a day), OUT_DIR/s<seed>_d<day>.json (backups that Import in the game reads)
and OUT_DIR/s<seed>_end.json (every down, death and bot event). The game is not changed."""
import asyncio, sys, os, json, time
sys.path.insert(0, os.path.join(os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__)))), 'tests'))
import run_tests as R
R.ROOT = os.environ.get('ZROOT', R.ROOT)
from playwright.async_api import async_playwright
AP = open(os.path.join(R.ROOT, 'tools', 'balance', 'ap.js')).read()
SETUP = """(sd)=>{let x=sd;Math.random=()=>{x=(x*1103515245+12345)%2147483648;return x/2147483648};const b0=Date.now();Date.now=()=>b0+ZH.tick*1000/60;
  const q=[];window.setTimeout=(fn,ms,...a)=>{q.push({t:ZH.tick+Math.ceil((ms||0)*60/1000),fn,a});return q.length;};window.clearTimeout=(id)=>{if(q[id-1])q[id-1]=null;};
  window.__terr=[];window.__flushTimers=()=>{for(let i=0;i<q.length;i++){const e=q[i];if(e&&e.t<=ZH.tick){q[i]=null;try{typeof e.fn==='function'&&e.fn(...e.a);}catch(err){if(__terr.length<20)__terr.push(String(err&&err.stack||err).slice(0,300));}}} if(q.length>5000&&q.every(e=>!e))q.length=0;};
  window.__L={seen:new WeakSet(),downs0:0,pos:new WeakMap(),zpos:new WeakMap(),site:new WeakMap(),downAt:new WeakMap(),flags:{}};}"""
DAY = """()=>{const S=ZH.S,L=__L,W=ZH.world,t0=performance.now();const day={day:S.day,spawn:{},night:{},peak:0,peakNight:0,bossNight:false,raid:0,issues:[]};
  const flag=(k,v)=>{const key=k+'|'+v;if(L.flags[key])return;L.flags[key]=1;if(day.issues.length<40)day.issues.push(k+': '+v);};
  let stepErr=null;
  for(let h=0;h<24;h++){for(let k=0;k<1000;k+=60){try{ZH.step(60);ZH.tripUpdate();AP.tick();}catch(e){stepErr=String(e&&e.stack||e).slice(0,400);break;} __flushTimers();
      const act=S.z.filter(z=>z.hp>0&&!z.human&&z.mode!=='zleave').length; if(S.hour>=6&&S.hour<20) day.peak=Math.max(day.peak,act); else day.peakNight=Math.max(day.peakNight,act);
      for(const z of S.z){if(L.seen.has(z))continue;L.seen.add(z);const b=(S.hour>=20||S.hour<6)?day.night:day.spawn;b[z.type]=(b[z.type]||0)+1;if(z.type==='boss')day.bossNight=true;if(z.human)day.raid++;}}
    if(stepErr)break; try{AP.hour();}catch(e){stepErr='AP.hour '+String(e&&e.stack||e).slice(0,300);break;}
    /* hourly: who has not moved */
    for(const s of S.sv){if(!s.w||!isFinite(s.w.x)||!isFinite(s.w.y)||!isFinite(s.hp)){flag('survivor has a broken number',(s.name||s.id)+' hp '+s.hp);continue;}
      const p=L.pos.get(s),key=Math.round(s.w.x*4)+','+Math.round(s.w.y*4)+','+s.mode;if(p&&p.key===key)p.n++;else L.pos.set(s,{key,n:0});
      const pp=L.pos.get(s);if(pp.n===48&&!['down','hospital','away','sleep','rest','post','guard'].includes(s.mode))flag('survivor in one spot and one state for 48 game hours',(s.name||s.id)+' '+s.job+' mode '+s.mode+(s.purpose?'/'+s.purpose:'')+' day '+S.day);
      if(s.mode==='down'){const d0=L.downAt.get(s)||(L.downAt.set(s,S.day*24+h),S.day*24+h);if(S.day*24+h-d0===72)flag('survivor down for 72 game hours',(s.name||s.id)+' day '+S.day);}else L.downAt.delete(s);}
    for(const z of S.z){if(z.hp<=0)continue;if(!isFinite(z.w&&z.w.x)||!isFinite(z.hp)){flag('zombie has a broken number',z.type);continue;}
      const p=L.zpos.get(z),key=Math.round(z.w.x*2)+','+Math.round(z.w.y*2);if(p&&p.key===key)p.n++;else L.zpos.set(z,{key,n:0});
      if(L.zpos.get(z).n===24)flag('zombie in one spot for 24 game hours',z.type+' mode '+z.mode+' at '+key+' day '+S.day);}
  }
  day.stepErr=stepErr;day.timerErrs=__terr.splice(0);
  /* daily checks */
  for(const k of ['food','water','wood','stone','mat','fuel','meds','ammo','cloth','ren','rp'])if(S[k]!=null&&(!isFinite(S[k])||S[k]<-0.01))flag('stock is negative or not a number',k+' = '+S[k]+' day '+S.day);
  for(const j of (S.sites||[])){const d0=L.site.get(j)||(L.site.set(j,S.day),S.day);if(S.day-d0===10)flag('building site unfinished after 10 game days',((j.b&&j.b.type)||j.type||'?')+' day '+S.day);}
  day.zLeft=S.z.filter(z=>z.hp>0&&!z.human).length;day.zAll=S.z.length;
  const snap=AP.snap();Object.assign(day,snap);
  day.downs=AP.downs.length-L.downs0;L.downs0=AP.downs.length;day.deathsDay=AP.deaths.filter(x=>x.d===day.day).length;
  day.lvl=S.lvl||1;day.banners=(S.banners||[]).map(b=>b.route).join(',');day.cloth=Math.round(S.cloth||0);day.inv=(S.inv||[]).length;
  day.cap=ZH.supplyCap?ZH.supplyCap():null;day.mcap=ZH.matCap?ZH.matCap():null;day.scap=ZH.scrapCap?ZH.scrapCap():null;
  day.fighters=S.sv.filter(q=>['Guard','Police Officer','Soldier'].includes(q.job)).length;day.left=S.left||0;{const st=ZH.supplyStats();day.wIn=+st.wIn.toFixed(1);day.wNet=+st.wNet.toFixed(1);day.fIn=+st.fIn.toFixed(1);day.fNet=+st.fNet.toFixed(1);}day.convoys=S.convoys||0;day.staffed=W.buildings.filter(b=>b.staff).length;day.gear=S.sv.filter(q=>q.armor||(q.gear&&q.gear.armor)).length;day.jobs={};for(const q of S.sv)day.jobs[q.job]=(day.jobs[q.job]||0)+1;
  day.idle=S.sv.filter(q=>q.mode==='idle').length;day.sites=(S.sites||[]).length;day.trip=S.trip?1:0;
  day.btypes={};for(const b of W.buildings)day.btypes[b.type]=(day.btypes[b.type]||0)+1;
  day.arr={};for(const [k,v] of Object.entries(S))if(Array.isArray(v)&&v.length>30)day.arr[k]=v.length;
  day.ms=Math.round(performance.now()-t0);return day}"""
async def main():
    seed, maxd, budget, out = int(sys.argv[1]), int(sys.argv[2]), float(sys.argv[3]), sys.argv[4]
    os.makedirs(out, exist_ok=True); t0 = time.time(); srv, port = R.serve()
    async with async_playwright() as p:
        br = await p.chromium.launch(); ctx, pg, errs = await R.open_game(br, port, 'long%d' % seed)
        await pg.evaluate(SETUP, seed); await pg.evaluate(AP); await pg.evaluate("(v)=>{AP.exp=true;AP.long=v}", os.environ.get('AP_LONG', '1') == '1')
        f = open(os.path.join(out, 's%d.jsonl' % seed), 'a'); n = 0
        while n < maxd and time.time() - t0 < budget:
            d = await pg.evaluate(DAY); d['errs'] = errs[:]; errs.clear(); f.write(json.dumps(d) + '\n'); f.flush(); n += 1
            if d.get('stepErr') or d.get('sv', 1) == 0: break
            if n % 10 == 0:
                try:
                    b = await pg.evaluate("()=>{try{const r=ZH.saveGame&&ZH.saveGame();const t=ZH.backupText?ZH.backupText((ZH.SLOT||1)-1):null;return {r:r===undefined?'u':r,t}}catch(e){return {e:String(e)}}}")
                    if b.get('t'): open(os.path.join(out, 's%d_d%d.json' % (seed, d['day'])), 'w').write(b['t'])
                    elif n == 10: print('no backup:', str(b)[:200], flush=True)
                except Exception as e: print('backup failed', e, flush=True)
            if n % 10 == 0: json.dump(await pg.evaluate("()=>({downs:AP.downs.map(x=>({d:x.d,h:x.h,by:x.by,who:x.who,was:x.was,inTown:x.inTown})),deaths:AP.deaths.map(x=>({d:x.d,h:x.h,who:x.who,z:x.z})),events:AP.events.filter((e,i,a)=>e!==a[i-1]),built:AP.built})"), open(os.path.join(out, 's%d_end.json' % seed), 'w'))
            if n % 5 == 0: print('seed', seed, 'day', d['day'], 'lvl', d['lvl'], 'pop', d['sv'], 'fallen', d['fallen'], 'bld', d['nb'], 'ms', d['ms'], 'issues', len(d['issues']), flush=True)
        end = await pg.evaluate("()=>({downs:AP.downs.map(x=>({d:x.d,h:x.h,by:x.by,who:x.who,was:x.was,inTown:x.inTown})),deaths:AP.deaths.map(x=>({d:x.d,h:x.h,who:x.who,z:x.z})),events:AP.events})")
        json.dump(end, open(os.path.join(out, 's%d_end.json' % seed), 'w')); await br.close()
    print('done seed', seed, 'days', n, 'in', round(time.time() - t0), 's')
asyncio.run(main())
