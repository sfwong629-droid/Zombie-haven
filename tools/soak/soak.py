"""Overnight soak: auto-plays a town for N days; every game day it saves, reloads the page from the save and carries on.
Checks invariants every second of game time and logs every violation with context.
    python3 tools/soak/soak.py [days] [seed] [label]"""
import asyncio, sys, os, json, collections
ROOT = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
sys.path.insert(0, os.path.join(ROOT, 'tests')); import run_tests as R
from playwright.async_api import async_playwright
AP = open(os.path.join(ROOT, 'tools', 'balance', 'ap.js')).read()
CHECK = r"""(hours)=>{const S=ZH.S,W=ZH.world,Wd=ZH.Wd,V=window.__V||(window.__V=[]),T=window.__T||(window.__T=new Map());
 const LIM={hide:3000,goFacility:2500,goWork:2500,walk:3000,chase:1800,loot:1500,rescueTo:2500,rescueCarry:3000,errand:60000,chat:1500,postCombat:1200,attack:900,recover:900,fix:6000,hammer:9000,gather:9000};
 const add=(k,s,x)=>{if(V.length<4000)V.push({k,day:S.day,h:S.hour,who:s?s.name+' ('+s.job+')':'',mode:s?s.mode:'',why:s?(s.why||'').slice(0,60):'',x:x||''});};
 for(let h=0;h<hours;h++){for(let k=0;k<1000;k+=60){ZH.step(60);ZH.tripUpdate();AP.tick();
   for(const s of S.sv){
     if(!s.w||!isFinite(s.w.x)||!isFinite(s.w.y))add('bad position',s);
     else if(!Wd.inMap(Math.floor(s.w.x),Math.floor(s.w.y)))add('off map',s,s.w.x.toFixed(1)+','+s.w.y.toFixed(1));
     if(!isFinite(s.hp)||!isFinite(s.hunger)||!isFinite(s.thirst)||!isFinite(s.fatigue))add('NaN stat',s);
     if(s.hp>s.max+1)add('hp over max',s,s.hp+'/'+s.max);
     if(s.facility&&!W.buildings.includes(s.facility))add('facility gone',s);
     if(s.post&&!W.buildings.includes(s.post))add('post gone',s);
     if(s.target&&s.target.hp<=0&&['chase','attack'].includes(s.mode))add('fighting a dead target',s);
     const t=T.get(s)||{m:null,since:ZH.tick,p:{...s.w},still:0};if(t.m!==s.mode){t.m=s.mode;t.since=ZH.tick;}
     const lim=LIM[s.mode];if(lim&&ZH.tick-t.since>lim&&!t.flag){t.flag=1;add('stuck in mode '+s.mode,s,Math.round((ZH.tick-t.since)/60)+'s');}if(t.m!==s.mode||ZH.tick-t.since<=(lim||1e9))t.flag=0;
     if(s.moving&&Math.hypot(s.w.x-t.p.x,s.w.y-t.p.y)<.05){t.still+=60;if(t.still===1200)add('walking in place 20s',s);}else t.still=0;t.p={...s.w};
     if(s.sleeping&&S.hour>=10&&S.hour<17)add('asleep at midday',s);
     T.set(s,t);}
   for(const z of S.z){if(z.hp>0&&(!z.w||!isFinite(z.w.x)))add('zombie bad position',null,z.type);}
   if(S.food<0||S.water<0||S.mat<0||(S.wood||0)<0)add('negative stock',null,[S.food,S.water,S.mat,S.wood].map(v=>+(+v).toFixed(1)).join('/'));
   for(const j of (S.sites||[]))if(j.made!=null&&ZH.tick-j.made>3*24000&&!j.flagged){j.flagged=1;add('building site unfinished for 3 days',null,j.type);}
 }AP.hour();}
 return {n:V.length,sv:S.sv.length,fallen:(S.fallen||[]).length,day:S.day,z:S.z.length}}"""
async def boot(br, port, seed, fresh):
    ctx = await br.new_context(viewport={'width': 390, 'height': 844}); pg = await ctx.new_page(); errs = []
    pg.on('pageerror', lambda e: errs.append(str(e)[:300]))
    if not fresh: await ctx.add_init_script(f"localStorage.setItem('zombieHavenR1', {json.dumps(SAVE[0])})")
    await pg.goto(f'http://127.0.0.1:{port}/index.html?test=soak{seed}')
    await pg.wait_for_function('window.ZH && ZH.S && ZH.S.sv.length > 0', timeout=30000)
    await pg.evaluate("()=>{window.requestAnimationFrame=()=>0}")
    await pg.evaluate("(sd)=>{let x=sd;Math.random=()=>{x=(x*1103515245+12345)%2147483648;return x/2147483648}}", seed)
    await pg.evaluate(AP); await pg.evaluate("()=>{AP.exp=true}")
    return ctx, pg, errs
SAVE = [None]
async def main():
    days = int(sys.argv[1]) if len(sys.argv) > 1 else 10; seed = int(sys.argv[2]) if len(sys.argv) > 2 else 7; label = sys.argv[3] if len(sys.argv) > 3 else f'seed{seed}'
    srv, port = R.serve(); allV = []; allE = []; log = []
    async with async_playwright() as p:
        br = await p.chromium.launch()
        ctx, pg, errs = await boot(br, port, seed, True)
        for d in range(days):
            r = await pg.evaluate(CHECK, 24); V = await pg.evaluate("()=>{const v=window.__V||[];window.__V=[];return v}")
            allV += V; allE += [{'day': r['day'], 'err': e} for e in errs]; errs.clear()
            ok = await pg.evaluate("()=>ZH.saveGame()"); SAVE[0] = await pg.evaluate("()=>localStorage.getItem('zombieHavenR1')")
            before = await pg.evaluate("()=>({sv:ZH.S.sv.map(s=>s.name).sort().join(','),b:ZH.world.buildings.length,food:Math.round(ZH.S.food),day:ZH.S.day,h:ZH.S.hour})")
            await ctx.close(); ctx, pg, errs = await boot(br, port, seed + d + 1, False)
            after = await pg.evaluate("()=>({sv:ZH.S.sv.map(s=>s.name).sort().join(','),b:ZH.world.buildings.length,food:Math.round(ZH.S.food),day:ZH.S.day,h:ZH.S.hour})")
            same = before == after
            if not same or not ok: allV.append({'k': 'save/load mismatch' if ok else 'save failed', 'day': before['day'], 'x': json.dumps([before, after])[:400]})
            log.append(dict(r, saved=ok, reload_same=same)); print('day', r['day'], r, 'saved', ok, 'reload same', same, flush=True)
        await br.close()
    json.dump({'log': log, 'violations': allV, 'errors': allE}, open(os.path.join(os.path.dirname(os.path.abspath(__file__)), f'soak_{label}.json'), 'w'), indent=1)
    c = collections.Counter(v['k'] for v in allV); print('\nviolations:', c.most_common())
    for k in c:
        ex = [v for v in allV if v['k'] == k][:3]; print('\n##', k); [print('  ', e) for e in ex]
    print('\npage errors:', len(allE)); [print('  ', e) for e in allE[:8]]
asyncio.run(main())
