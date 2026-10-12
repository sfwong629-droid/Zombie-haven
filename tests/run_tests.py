#!/usr/bin/env python3
"""Zombie Haven regression tests.

    python3 tests/run_tests.py            # all tests
    python3 tests/run_tests.py fire tabs  # only tests whose name contains one of the words

Starts its own local web server, opens the game in headless Chromium at iPhone size (390x844, 3x)
and checks the systems end to end. Needs: pip install playwright (Chromium installed for it).
Exit code 0 = all passed.
"""
import asyncio, functools, http.server, json, os, socketserver, sys, threading, time, traceback
from playwright.async_api import async_playwright

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
AP = open(os.path.join(ROOT, 'tools', 'balance', 'ap.js')).read()

def serve():
    class Quiet(http.server.SimpleHTTPRequestHandler):
        def log_message(self, *a): pass
    h = functools.partial(Quiet, directory=ROOT)
    s = socketserver.ThreadingTCPServer(('127.0.0.1', 0), h); s.daemon_threads = True
    threading.Thread(target=s.serve_forever, daemon=True).start(); return s, s.server_address[1]

class T:   # tiny assertion helper that records the failing check
    def __init__(self): self.notes = []
    def ok(self, cond, msg):
        if not cond: raise AssertionError(msg)
        self.notes.append(msg)

PLACE = """(t)=>{const W=ZH.world,D=ZH.Wd.DEFS[t],B=ZH.Wd.BUILD;for(let y=B.y0;y<=B.y1;y++)for(let x=B.x0;x<=B.x1;x++)if(ZH.Wd.placementCheck(W,x,y,D,null).ok){const b={type:t,x,y,w:D.w,h:D.h,q:D.q,a:D.a,staff:null};W.buildings.push(b);ZH.Wd.bump(W);ZH.autoStaff();return true}return false}"""

async def open_game(browser, port, tag, init=None):
    ctx = await browser.new_context(viewport={'width': 390, 'height': 844}, device_scale_factor=3, is_mobile=True, has_touch=True)
    if init: await ctx.add_init_script(init)
    pg = await ctx.new_page(); errs = []
    pg.on('pageerror', lambda e: errs.append(str(e)))
    await pg.goto(f'http://127.0.0.1:{port}/index.html?test={tag}')
    await pg.wait_for_function('window.ZH && ZH.S && ZH.S.sv.length > 0', timeout=15000)
    await pg.evaluate("()=>{window.requestAnimationFrame=()=>0}")
    return ctx, pg, errs

async def close_popups(pg):
    for _ in range(12):
        b = await pg.query_selector('#eventModal button')
        if not b: return
        await b.click()

# ---------------------------------------------------------------- tests
async def t_boot(br, port, t):
    ctx, pg, errs = await open_game(br, port, 'boot')
    v = await pg.evaluate("()=>({title:document.title,sv:ZH.S.sv.length,b:ZH.world.buildings.length,menu:['mBuild','mExp','mSurv','mTown','mGuide','btnSave','btnSpeed','btnSound','btnLog','btnCenter','food','water','mat','ren','rank','threat','clock','qt','renBar'].filter(id=>!document.getElementById(id))})")
    t.ok(v['title'].startswith('Zombie Haven V'), f"title has the version: {v['title']}")
    t.ok(not v['menu'], f"every HUD element exists (missing: {v['menu']})")
    t.ok(v['sv'] >= 4 and v['b'] >= 3, f"new game has {v['sv']} survivors, {v['b']} buildings")
    await pg.evaluate("()=>{ZH.step(3000);ZH.draw()}")
    t.ok(not errs, f'no page errors after 3000 ticks and a draw {errs[:1]}'); await ctx.close()

async def t_geometry(br, port, t):   # V2.34: isometric geometry, sprite anchors, hit tests, placement ghost, entrances, depth order
    ctx, pg, errs = await open_game(br, port, 'geom')
    r = await pg.evaluate("""()=>{const I=ZH.Iso,out={};out.ratio=I.RATIO;out.angle=I.ANGLE_DEG;out.th=ZH.BASE_TH/ZH.BASE_TW;
      let rt=0;for(const z of [.5,.85,1.6,2.4]){ZH.cam.z=z;for(const [x,y] of [[0,0],[3.25,7.5],[11.9,2.1],[15,19]]){const p=ZH.project(x,y),q=ZH.unproject(p.x,p.y);rt=Math.max(rt,Math.abs(q.x-x),Math.abs(q.y-y))}}out.rt=rt;ZH.cam.z=1;
      const W=ZH.world,keep=W.buildings.slice(),bad=[],hit=[];
      for(const type of Object.keys(ZH.DEFS)){const D=ZH.DEFS[type];if(!D||!D.w)continue;const b={type,x:6,y:8,w:D.w,h:D.h,q:D.q,a:D.a,staff:null};W.buildings.length=0;W.buildings.push(b);ZH.Wd.bump(W);
        const r=ZH.spriteRect(b);if(!r)continue;const a=ZH.project(b.x+b.w,b.y+b.h);
        if(Math.abs(r.anchor.x-a.x)>.01||Math.abs(r.anchor.y-a.y)>.01)bad.push(type+' anchor');
        const want=(D.w+D.h)*ZH.TWs()/2;if(Math.abs(r.w-want)>3*r.s+.5)bad.push(type+' width '+r.w.toFixed(1)+' vs '+want.toFixed(1));
        const c=ZH.project(b.x+b.w/2,b.y+b.h/2);if(ZH.hitBuilding(c.x,c.y)!==b)hit.push(type)}
      W.buildings.length=0;keep.forEach(b=>W.buildings.push(b));ZH.Wd.bump(W);out.bad=bad;out.hit=hit;
      ZH.startTool({kind:'building',type:'workshop'});const tp=ZH.project(9.5,9.5);ZH.tapAt(tp.x,tp.y);const pv=ZH.preview;out.ghost=pv&&[pv.x,pv.y,pv.w,pv.h];ZH.endBuildMode(true);
      const box=(x,y,r)=>({x1:x-r,y1:y-r,x2:x+r,y2:y+r});const bb={x1:6,y1:8,x2:8,y2:9,id:'b'};
      const s1=I.sortDrawables([{...box(7,9.3,.12),id:'front'},bb,{...box(7,7.7,.12),id:'back'}]).map(o=>o.id).join(',');out.depth=s1;
      return out}""")
    t.ok(r['ratio'] == .5 and abs(r['th'] - .5) < 1e-9, f"one 2:1 projection everywhere (TH/TW = {r['th']})")
    t.ok(abs(r['angle'] - 26.565) < .01, f"edge angle is atan(1/2) = {r['angle']:.3f} deg")
    t.ok(r['rt'] < 1e-9, f"project/unproject round trip at 4 zoom levels (max error {r['rt']:.2e})")
    t.ok(not r['bad'], f"every building sprite is anchored at its south corner and as wide as its footprint {r['bad']}")
    t.ok(not r['hit'], f"tapping the middle of every building's footprint selects it {r['hit']}")
    t.ok(r['ghost'] == [8, 9, 2, 1], f"placement ghost: tapped tile is the footprint's south tile {r['ghost']}")
    t.ok(r['depth'] == 'back,b,front', f"depth: a person behind a building is drawn before it, in front after it ({r['depth']})")
    r = await pg.evaluate("""()=>{const W=ZH.world,Wd=ZH.Wd,out={};const h=W.buildings.find(b=>b.type==='house'&&b.w===1)||W.buildings[0];const at=Wd.approachTile(h);
      out.block=Wd.placementCheck(W,at.x,at.y,ZH.DEFS.storage,null);return out}""")
    t.ok(not r['block']['ok'] and 'entrance' in r['block']['why'].lower(), f"a building cannot be placed on another building's entrance ({r['block']['why']})")
    for k in ['water', 'farm', 'house', 'workshop', 'clinic', 'gym', 'storage', 'house', 'canteen', 'library']: await pg.evaluate(PLACE, k)
    r = await pg.evaluate("""()=>{const W=ZH.world,S=ZH.S,Wd=ZH.Wd;S.food=S.water=200;S.mat=200;const out={sv:0,z:0,n:0,blocked:0,ex:[]};
      for(const b of W.buildings){const at=Wd.approachTile(b);if(Wd.buildingAt(W,at.x,at.y))out.blocked++}
      for(let i=0;i<6;i++)ZH.spawn&&ZH.spawn();
      for(let k=0;k<15000;k++){ZH.simTick();if(k%5)continue;out.n++;
        for(const s of S.sv){if(s.mode==='away')continue;const b=Wd.buildingAt(W,Math.floor(s.w.x),Math.floor(s.w.y));if(!b)continue;const d=Wd.doorPoint(b);if(Math.hypot(s.w.x-d.x,s.w.y-d.y)>.5){out.sv++;if(out.ex.length<3)out.ex.push([s.mode,b.type,s.w.x.toFixed(2),s.w.y.toFixed(2)])}}
        for(const z of S.z){if(z.hp>0&&Wd.buildingAt(W,Math.floor(z.w.x),Math.floor(z.w.y)))out.z++}}
      return out}""")
    t.ok(r['blocked'] == 0, f"no building's entrance is covered by another building ({r['blocked']})")
    t.ok(r['sv'] == 0, f"survivors never cut through a building (only in and out at the door) over 15000 ticks {r['ex']}")
    t.ok(r['z'] == 0, f"zombies never stand on a building footprint over 15000 ticks ({r['z']} samples)")
    t.ok(not errs, f'no page errors {errs[:1]}'); await ctx.close()

async def t_alerts(br, port, t):   # V2.34: notification levels, breach alerts, emergency controls
    ctx, pg, errs = await open_game(br, port, 'alerts')
    await close_popups(pg)
    r = await pg.evaluate("""()=>{const S=ZH.S,W=ZH.world,out={};S.mat=80;S.z.length=0;ZH.alerts.clear();document.querySelectorAll('#fx .toast').forEach(e=>e.remove());
      for(let x=3;x<=8;x++)ZH.tryWall(x,5,'wood');const wl=ZH.Wd.wallAt(W,5,5);
      const n0=S.log.length;ZH.note('routine','test routine line');out.routineToast=document.querySelectorAll('#fx .toast').length;out.routineLog=S.log[S.log.length-1].l;
      for(let i=0;i<5;i++)ZH.note('important','IMPORTANT '+i);out.toasts=document.querySelectorAll('#fx .toast').length;
      document.getElementById('btnSpeed').click();out.sp0=ZH.simSpeed;
      ZH.spawn(5,3,'walker');ZH.wallBroken(wl);out.sp1=ZH.simSpeed;ZH.wallBroken(wl);ZH.alertsTick();
      out.keys=[...ZH.alerts.keys()];out.rows=document.querySelectorAll('#alerts .alert[data-k]').length;out.text=document.querySelector('#alerts .at').textContent;
      out.btns=[...document.querySelectorAll('#alerts .aa')].map(b=>b.textContent+(b.disabled?'(off)':''));
      ZH.centerOn(16,18);document.querySelector('#alerts .alert[data-k]').click();const p=ZH.project(5.5,5.5),c=document.getElementById('game').getBoundingClientRect();
      out.centred=Math.abs(p.x-c.width/2)<40&&Math.abs(p.y-c.height*.46)<60;
      const def=ZH.bestDefender({x:5.5,y:5.5});out.sent=ZH.sendDefender({x:5.5,y:5.5});out.defMode=def&&def.mode;
      [...document.querySelectorAll('#alerts .aa')].find(b=>b.textContent==='Repair first').click();out.rf=ZH.repairFirst===wl;
      wl.broken=false;wl.hp=wl.max;ZH.alertsTick();out.after=ZH.alerts.size;out.rowsAfter=document.querySelectorAll('#alerts .alert[data-k]').length;
      return out}""")
    t.ok(r['routineToast'] == 0 and r['routineLog'] == 'routine', 'routine news goes to the log only, no banner')
    t.ok(r['toasts'] == 1, f"important banners never overlap ({r['toasts']} on screen after 5 at once)")
    t.ok(r['keys'] == ['breach5,5'] and r['rows'] == 1, f"one breach alert per broken piece, not repeated {r['keys']}")
    t.ok('breached' in r['text'] and 'zombie' in r['text'], f"breach alert says what is going on: {r['text']}")
    t.ok('Repair first' in r['btns'][0] and 'Send defender' in r['btns'][1], f"breach actions offered {r['btns']}")
    t.ok(r['sp0'] == 2 and r['sp1'] == 1, f"first emergency drops 2x speed to 1x ({r['sp0']} -> {r['sp1']})")
    t.ok(r['centred'], 'tapping the alert centres the camera on the breach')
    t.ok(r['sent'] and r['defMode'] == 'chase', 'Send defender sends a fighter at the zombie')
    t.ok(r['rf'], 'Repair first puts the breach at the head of the repair queue')
    t.ok(r['after'] == 0 and r['rowsAfter'] == 0, 'the alert clears itself once the wall is repaired')
    r = await pg.evaluate("""()=>{const S=ZH.S,out={};ZH.OPTS.autoSlow=false;const s=S.sv[0];s.hp=0;ZH.step(2);out.down=[...ZH.alerts.keys()].some(k=>k.startsWith('down'));out.dtext=document.querySelector('#alerts .at').textContent;
      ZH.startTool({kind:'building',type:'house'});ZH.showEventPopup({title:'TEST',text:'x'});out.popupWhileBuilding=!!document.getElementById('eventModal').innerHTML;out.compact=document.querySelectorAll('#alerts .alert[data-k]').length;
      ZH.endBuildMode(true);return out}""")
    await pg.wait_for_timeout(50)
    pop = await pg.evaluate("()=>!!document.getElementById('eventModal').innerHTML")
    t.ok(r['down'] and 's left' in r['dtext'], f"a collapsed survivor raises an alert with the bleed-out timer: {r['dtext']}")
    t.ok(not r['popupWhileBuilding'] and pop, 'pop-ups wait until building placement is finished')
    t.ok(r['compact'] <= 1, 'while placing a building the alerts shrink to one row')
    t.ok(not errs, f'no page errors {errs[:1]}'); await ctx.close()

async def t_save_load(br, port, t):
    ctx, pg, errs = await open_game(br, port, 'save1')
    await pg.evaluate(PLACE, 'water'); await pg.evaluate(PLACE, 'workshop')
    before = await pg.evaluate("""()=>{const S=ZH.S;S.mat=99;for(let x=3;x<=6;x++)ZH.tryWall(x,5,'wood');ZH.wallBroken(ZH.Wd.wallAt(ZH.world,4,5));S.pets.push(ZH.newPet('cat'));ZH.givePet(S.sv[0],0);
      S.kids.push({name:'Ivy',age:2,parents:[S.sv[0].id],st:{str:5,end:5,agi:5,per:5,int:5,cha:5}});S.sv[0].rel={[S.sv[1].id]:60};S.res.blades=true;ZH.saveGame();
      return {b:ZH.world.buildings.length,w:ZH.world.walls.size,broken:ZH.Wd.wallAt(ZH.world,4,5).broken,pet:S.sv[0].pet.name,kids:S.kids.length,rel:S.sv[0].rel[S.sv[1].id],res:Object.keys(S.res).length,mat:Math.round(S.mat)}}""")
    save = await pg.evaluate("()=>localStorage.getItem('zombieHavenV26')"); await ctx.close()
    ctx, pg, errs = await open_game(br, port, 'save2', init=f"if(!sessionStorage.getItem('x')){{sessionStorage.setItem('x',1);localStorage.setItem('zombieHavenV26',{json.dumps(save)})}}")
    after = await pg.evaluate("""()=>{const S=ZH.S;return {b:ZH.world.buildings.length,w:ZH.world.walls.size,broken:ZH.Wd.wallAt(ZH.world,4,5).broken,pet:S.sv[0].pet&&S.sv[0].pet.name,kids:S.kids.length,rel:S.sv[0].rel[S.sv[1].id],res:Object.keys(S.res).length,mat:Math.round(S.mat)}}""")
    for k in before: t.ok(before[k] == after[k], f'save/load keeps {k}: {before[k]} == {after[k]}')
    t.ok(not errs, 'no page errors'); await ctx.close()

async def t_old_save(br, port, t):
    ctx, pg, _ = await open_game(br, port, 'old1')
    save = await pg.evaluate("""()=>{const d=JSON.parse(ZH.serialize());d.version='2.16.0';for(const k of ['pets','nextTrader','incidents','trader','guide','log','kids','storyQ','deaths'])delete d.S[k];
      d.buildings.forEach(b=>{delete b.fire;delete b.burnt;delete b.rushT;delete b.rushes});d.sv.forEach(s=>{delete s.pet;delete s.rel;delete s.partner});d.walls=d.walls.map(w=>w.slice(0,4));return JSON.stringify(d)}""")
    await ctx.close()
    ctx, pg, errs = await open_game(br, port, 'old2', init=f"if(!sessionStorage.getItem('x')){{sessionStorage.setItem('x',1);localStorage.setItem('zombieHavenV26',{json.dumps(save)})}}")
    r = await pg.evaluate("()=>{ZH.step(2000);return {pets:Array.isArray(ZH.S.pets),kids:Array.isArray(ZH.S.kids),log:Array.isArray(ZH.S.log),guide:typeof ZH.S.guide}}")
    t.ok(r['pets'] and r['kids'] and r['log'] and r['guide'] == 'number', f'old save gets new fields {r}')
    t.ok(not errs, f'old save runs 2000 ticks without errors {errs[:1]}'); await ctx.close()

async def t_guide(br, port, t):
    ctx, pg, errs = await open_game(br, port, 'guide')
    await pg.evaluate("()=>{ZH.S.mat=300;ZH.S.stage=1;ZH.S.kills=3;ZH.missionProgress()}"); await close_popups(pg)
    steps = [('farm', PLACE), ('house', PLACE), ('res', "()=>{ZH.S.sv[0].resident=true}"), ('scrapyard', PLACE), ('armor', "()=>{ZH.S.sv[0].eq.armor='jacket'}"),
             ('gym', PLACE), ('research', "()=>{ZH.S.res.blades=true}"), ('walls', "()=>{for(let x=3;x<=12;x++)ZH.tryWall(x,5,'wood')}"), ('exp', "()=>{ZH.S.expCount=1}"), ('expand', "()=>{ZH.S.ren=999;ZH.expandTerritory()}")]
    for i, (k, js) in enumerate(steps):
        g0 = await pg.evaluate("()=>ZH.S.guide")
        if js == PLACE: await pg.evaluate(PLACE, k)
        else: await pg.evaluate(js)
        await pg.evaluate("()=>ZH.missionProgress()"); await close_popups(pg)
        g1 = await pg.evaluate("()=>ZH.S.guide")
        t.ok(g1 == g0 + 1, f'guide goal {i + 1} ({k}) completes: {g0} -> {g1}')
    t.ok(await pg.evaluate("()=>!!ZH.S.mission"), 'missions start after the guide'); t.ok(not errs, 'no page errors'); await ctx.close()

async def t_fire(br, port, t):
    ctx, pg, errs = await open_game(br, port, 'fire')
    r = await pg.evaluate("""()=>{ZH.S.z.length=0;ZH.S.water=30;const c=ZH.world.buildings.find(b=>b.type==='canteen');ZH.startFire(c,40);let n=0;while(c.fire>0&&n<20000){ZH.step(30);n+=30}
      const out=!c.fire&&!c.burnt;const h=ZH.world.buildings.find(b=>b.type==='house');ZH.burnDown(h);const prod=ZH.prodMult(h);ZH.S.mat=50;const rep=ZH.repairBurnt(h);return {out,n,burnt:h.burnt,prod,rep,safe:ZH.startFire(h,30)}}""")
    t.ok(r['out'] and r['n'] < 6000, f"survivors put a fire out ({r['n']} ticks)")
    t.ok(r['prod'] == 0, 'a burnt building produces nothing'); t.ok(r['rep'] and not r['burnt'], 'repair works')
    t.ok(r['safe'] is False, 'a freshly repaired building cannot catch fire'); t.ok(not errs, 'no page errors'); await ctx.close()

async def t_rush(br, port, t):
    ctx, pg, errs = await open_game(br, port, 'rush')
    await pg.evaluate(PLACE, 'water')
    r = await pg.evaluate("""()=>{const b=ZH.world.buildings.find(q=>q.type==='water');ZH.S.water=5;const r0=Math.random;Math.random=()=>.99;const w0=ZH.S.water;ZH.rush(b);const gain=ZH.S.water-w0;
      const cd=!ZH.rushCheck(b).ok;b.rushT=0;Math.random=()=>0;ZH.rush(b);Math.random=r0;return {gain,cd,fire:b.fire}}""")
    t.ok(r['gain'] > 0, f"successful rush gives water (+{r['gain']:.2f})"); t.ok(r['cd'], 'rush has a cooldown'); t.ok(r['fire'] > 0, 'a failed rush starts a fire')
    t.ok(not errs, 'no page errors'); await ctx.close()

async def t_trader(br, port, t):
    ctx, pg, errs = await open_game(br, port, 'trader')
    r = await pg.evaluate("""()=>{const S=ZH.S;S.food=S.water=S.mat=60;ZH.traderArrive();let k=0;while(S.trader.mode==='arrive'&&k<8000){ZH.step(20);k+=20}
      const pi=S.trader.stock.findIndex(o=>o.k==='pet');const bought=ZH.traderBuy(pi);const m0=S.mat;const tr=ZH.traderTrade(0);const gain=S.mat-m0;ZH.traderLeave();k=0;while(S.trader&&k<8000){ZH.step(20);k+=20}
      return {stay:k>0,bought,pets:S.pets.length,tr,gain,gone:!S.trader}}""")
    t.ok(r['bought'] and r['pets'] >= 1, 'buying a pet from the trader'); t.ok(r['tr'] and r['gain'] == 4, 'exchange 6 food -> 4 parts'); t.ok(r['gone'], 'the trader leaves')
    t.ok(not errs, 'no page errors'); await ctx.close()

async def t_walls(br, port, t):
    ctx, pg, errs = await open_game(br, port, 'walls')
    r = await pg.evaluate("""()=>{const S=ZH.S;S.mat=50;S.z.length=0;for(let x=3;x<=6;x++)ZH.tryWall(x,5,'wood');const w=ZH.Wd.wallAt(ZH.world,4,5);ZH.wallBroken(w);
      const walk=ZH.Wd.walkable(ZH.world,4,5,true);const m0=S.mat;for(let i=0;i<40;i++)ZH.autoRepair();return {walk,fixed:!w.broken&&w.hp===w.max,cost:m0-S.mat}}""")
    t.ok(r['walk'], 'a broken wall is rubble zombies can cross'); t.ok(r['fixed'], 'the repair crew rebuilds it'); t.ok(r['cost'] <= 1, f"a wood repair costs at most 1 part ({r['cost']})")
    t.ok(not errs, 'no page errors'); await ctx.close()

async def t_research(br, port, t):
    ctx, pg, errs = await open_game(br, port, 'research')
    await pg.evaluate(PLACE, 'workshop')
    r = await pg.evaluate("()=>{const S=ZH.S;S.rp=60;S.mat=40;const ok=ZH.doResearch('blades');const c=ZH.craft('machete');return {ok,rp:S.rp,c,inv:S.inv.machete||0,mat:S.mat}}")
    t.ok(r['ok'] and r['rp'] == 40, 'research spends RP'); t.ok(r['c'] and r['inv'] == 1, 'crafting puts gear in the stash'); t.ok(not errs, 'no page errors'); await ctx.close()

async def t_bonds(br, port, t):
    ctx, pg, errs = await open_game(br, port, 'bonds')
    r = await pg.evaluate("""()=>{const S=ZH.S,[a,b]=S.sv;a.resident=b.resident=true;a.sat=b.sat=60;S.food=S.water=40;a.rel={[b.id]:85};b.rel={[a.id]:85};const r0=Math.random;Math.random=()=>.01;
      ZH.bondsDaily();const couple=a.partner===b.id;ZH.bondsDaily();const kid=S.kids.length;for(let d=0;d<5;d++)ZH.bondsDaily();Math.random=r0;const grown=S.sv[S.sv.length-1];
      ZH.killSurvivor(a,'test');return {couple,kid,grown:grown.resident&&grown.job==='Civilian',grief:b.partner===null&&/Grieving/.test(b.why)}}""")
    t.ok(r['couple'], 'close friends become a couple'); t.ok(r['kid'] >= 1, 'a couple has a baby'); t.ok(r['grown'], 'the child grows up into a resident'); t.ok(r['grief'], 'a partner grieves')
    await close_popups(pg); t.ok(not errs, 'no page errors'); await ctx.close()

async def t_story(br, port, t):
    ctx, pg, errs = await open_game(br, port, 'story')
    await pg.evaluate("()=>{const S=ZH.S;S.food=S.water=S.mat=80;S.day=9;S.rank=2;S.stage=2;S.guide=99}")
    keys = await pg.evaluate("()=>Object.keys(ZH.STORY)")
    for k in keys:
        for ch in (0, 1):
            await pg.evaluate(f"()=>ZH.STORY['{k}'].run()")
            for i in range(6):
                bs = await pg.query_selector_all('#eventModal button')
                if not bs: break
                await bs[min(ch, len(bs) - 1)].click(); ch = 0
    t.ok(len(keys) >= 10, f'{len(keys)} story events'); t.ok(not errs, f'every story event and choice runs {errs[:1]}')
    ms = await pg.evaluate("()=>ZH.MISSION_DEFS.map(d=>{ZH.beginMission(d.id);return ZH.S.mission.goal>0&&ZH.S.mission.rewardParts>0})")
    t.ok(all(ms) and len(ms) >= 10, f'{len(ms)} mission types start'); await ctx.close()

async def t_tabs(br, port, t):
    ctx, pg, errs = await open_game(br, port, 'tabs')
    await pg.evaluate(PLACE, 'workshop')
    await pg.evaluate("()=>{const b=ZH.world.buildings.find(q=>q.type==='workshop');ZH.centerOn(b.x+1,b.y+1,1.2);ZH.draw();const r=ZH.spriteRect(b);ZH.tapAt(r.x+r.w/2,r.y+r.h*.6)}")
    tabs = await pg.evaluate("()=>[...document.querySelectorAll('#ib .tabs button')].map(b=>b.dataset.tab)")
    t.ok(tabs == ['overview', 'details', 'research', 'craft'], f'workshop tabs {tabs}')
    for k in tabs:
        await pg.click(f'#ib [data-tab={k}]'); on = await pg.evaluate("()=>document.querySelector('#ib .tabs button.on').dataset.tab"); t.ok(on == k, f'building tab {k} opens')
    await pg.evaluate("()=>ZH.unitPanel(ZH.S.sv[0])")
    for k in ['stats', 'gear', 'bonds', 'skills']:
        await pg.click(f'#unitExtra [data-tab={k}]'); on = await pg.evaluate("()=>document.querySelector('#unitExtra .tabs button.on').dataset.tab"); t.ok(on == k, f'survivor tab {k} opens')
    t.ok(not errs, 'no page errors'); await ctx.close()

async def t_sound(br, port, t):
    ctx, pg, errs = await open_game(br, port, 'sound')
    r = await pg.evaluate("async()=>{const out={};for(const n of SND.names){const d=await SND.render([[0.05,n]],1.5);let pk=0;for(const v of d)pk=Math.max(pk,Math.abs(v));out[n]=pk}return out}")
    t.ok(len(r) >= 15, f'{len(r)} sound effects'); t.ok(all(.05 < v < .99 for v in r.values()), f'every effect is audible and does not clip {r}')
    t.ok(not errs, 'no page errors'); await ctx.close()

async def t_sim(br, port, t):
    ctx, pg, errs = await open_game(br, port, 'sim')
    await pg.evaluate("()=>{let x=5;Math.random=()=>{x=(x*1103515245+12345)%2147483648;return x/2147483648};const b0=Date.now();Date.now=()=>b0+ZH.tick*1000/60;}")
    await pg.evaluate(AP); await pg.evaluate("()=>{AP.exp=true}")
    r = await pg.evaluate("()=>{for(let d=0;d<12;d++)for(let h=0;h<24;h++){for(let k=0;k<1000;k+=60){ZH.step(60);ZH.tripUpdate();AP.tick()}AP.hour()}return AP.snap()}")
    t.ok(r['sv'] >= 4, f"12-day auto-played town survives ({r['sv']} survivors, {r['fallen']} fallen, rank {r['rank']})")
    t.ok(r['nb'] >= 12, f"it grows ({r['nb']} buildings)"); t.ok(not errs, f'no page errors {errs[:1]}'); await ctx.close()

TESTS = [('boot', t_boot), ('geometry', t_geometry), ('alerts', t_alerts), ('save_load', t_save_load), ('old_save', t_old_save), ('guide', t_guide), ('fire', t_fire), ('rush', t_rush), ('trader', t_trader),
         ('walls', t_walls), ('research', t_research), ('bonds', t_bonds), ('story', t_story), ('tabs', t_tabs), ('sound', t_sound), ('sim', t_sim)]

async def main():
    want = sys.argv[1:]; srv, port = serve(); failed = 0; t0 = time.time()
    async with async_playwright() as p:
        br = await p.chromium.launch()
        for name, fn in TESTS:
            if want and not any(w in name for w in want): continue
            t = T(); s = time.time()
            try:
                await asyncio.wait_for(fn(br, port, t), timeout=300); print(f'PASS  {name:10} ({len(t.notes)} checks, {time.time() - s:.1f}s)')
            except Exception as e:
                failed += 1; print(f'FAIL  {name:10} {e if isinstance(e, AssertionError) else traceback.format_exc(limit=2)}')
        await br.close()
    srv.shutdown(); print(f'\n{"ALL PASSED" if not failed else str(failed) + " FAILED"} in {time.time() - t0:.0f}s'); sys.exit(1 if failed else 0)

if __name__ == '__main__':
    asyncio.run(main())
