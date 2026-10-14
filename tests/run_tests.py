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
    r = await pg.evaluate("""()=>{const S=ZH.S,out={};ZH.OPTS.autoSlow=false;const s=S.sv[0];s.hp=0;ZH.step(2);out.down=[...ZH.alerts.keys()].some(k=>k.startsWith('down'));out.dtext=document.querySelector('#alerts .at').textContent;const el0=document.querySelector('#alerts .alert[data-k]');el0.classList.remove('new');ZH.step(130);const el1=document.querySelector('#alerts .alert[data-k]');out.same=el0===el1&&!el1.classList.contains('new');out.dtext2=el1.querySelector('.at').textContent;
      ZH.startTool({kind:'building',type:'house'});ZH.showEventPopup({title:'TEST',text:'x'});out.popupWhileBuilding=!!document.getElementById('eventModal').innerHTML;out.compact=document.querySelectorAll('#alerts .alert[data-k]').length;
      ZH.endBuildMode(true);return out}""")
    await pg.wait_for_timeout(50)
    pop = await pg.evaluate("()=>!!document.getElementById('eventModal').innerHTML")
    t.ok(r['down'] and 's left' in r['dtext'], f"a collapsed survivor raises an alert with the bleed-out timer: {r['dtext']}")
    t.ok(r['same'] and r['dtext2'] != r['dtext'], f"a live alert updates its text in place without re-animating ({r['dtext']} -> {r['dtext2']})")
    t.ok(not r['popupWhileBuilding'] and pop, 'pop-ups wait until building placement is finished')
    t.ok(r['compact'] <= 1, 'while placing a building the alerts shrink to one row')
    t.ok(not errs, f'no page errors {errs[:1]}'); await ctx.close()

async def t_objectives(br, port, t):   # V2.34: actionable objectives
    ctx, pg, errs = await open_game(br, port, 'obj')
    await close_popups(pg)
    r = await pg.evaluate("""()=>{const S=ZH.S,out={};S.stage=0;S.mat=50;const o=ZH.currentObjective();out.act=o.act&&o.act.label;out.spots=o.spots.length;
      o.act.fn();out.sel=ZH.sel&&ZH.sel.type;out.pv=!!(ZH.preview&&ZH.preview.ok);ZH.endBuildMode(true);
      document.getElementById('quest').click();out.title=document.getElementById('it').textContent;out.reqRows=document.querySelectorAll('#ib .card .row').length;
      const sh=document.getElementById('oShow');if(sh)sh.click();out.marks=!!ZH.objMarks;return out}""")
    t.ok(r['act'] == 'Build Rain Collector' and r['spots'] == 1, f"first objective offers a shortcut and a map spot {r}")
    t.ok(r['sel'] == 'water' and r['pv'], 'the shortcut opens placement with a valid ghost already on the suggested spot')
    t.ok(r['title'] == 'OBJECTIVE' and r['reqRows'] >= 1, 'tapping the objective line opens the objective with its requirements')
    t.ok(r['marks'], 'Show on map highlights the spot')
    r = await pg.evaluate("""()=>{const S=ZH.S,W=ZH.world,Wd=ZH.Wd,Z=Wd.WALLZONE,out={};S.mat=999;S.rank=5;S.stage=2;S.guide=99;S.z.length=0;
      const ring=[];for(let x=Z.x0;x<=Z.x1;x++){ring.push([x,Z.y0]);ring.push([x,Z.y1]);}for(let y=Z.y0+1;y<Z.y1;y++){ring.push([Z.x0,y]);ring.push([Z.x1,y]);}
      let k=0;for(const [x,y] of ring){k++;if(k%9===0)continue;if(Wd.isRoad(W,x,y))continue;ZH.tryWall(x,y,'wood');}
      out.sealed0=Wd.perimeter(W).sealed;S.mission={id:'seal',name:'Close the Gaps',desc:'Seal the perimeter with walls',goal:1,progress:0,rewardParts:6,rewardRen:7};
      const o=ZH.currentObjective();out.gaps=o.spots.map(g=>[g.x,g.y,g.label]);out.req=o.reqs[0].label;
      for(const g of o.spots)ZH.tryWall(g.x,g.y,g.label==='gate'?'gate':'wood');out.sealed1=Wd.perimeter(W).sealed;out.left=ZH.findGaps().length;return out}""")
    t.ok(not r['sealed0'] and len(r['gaps']) > 0, f"Close the Gaps lists the gaps ({r['req']}: {r['gaps'][:6]})")
    t.ok(r['sealed1'] and r['left'] == 0, f"walling exactly the listed gaps seals the town (sealed={r['sealed1']}, gaps left={r['left']})")
    t.ok(not errs, f'no page errors {errs[:1]}'); await ctx.close()

async def t_economy(br, port, t):   # V2.35: resource panels, building status, shortage warnings
    ctx, pg, errs = await open_game(br, port, 'eco')
    await close_popups(pg)
    for k in ['water', 'farm', 'scrapyard', 'farm']: await pg.evaluate(PLACE, k)
    r = await pg.evaluate("""()=>{const S=ZH.S;S.mat=60;S.food=S.water=30;ZH.step(25000);const E=ZH.econ(),out={};
      for(const k of ['food','water']){const L=ZH.ecoLast24(k),fam=k==='food'?['Garden Plot']:['Rain Collector'];const act=fam.reduce((a,n)=>a+(L.by[n]||0),0)+(L.by['Wasted: storage full']||0)*0;out[k]={exp:E[k].prod,act,hours:L.hours,net:E[k].net,p:E[k].prod,u:E[k].use,days:E[k].days,stock:E[k].stock}}
      const st=ZH.supplyStats();out.same=Math.abs(st.fNet-E.food.net)<1e-9&&Math.abs(st.wNet-E.water.net)<1e-9;
      document.querySelector('#food').parentElement.click();out.title=document.getElementById('it').textContent;out.hasNet=/Net . day/.test(document.getElementById('ib').textContent);
      return out}""")
    for k in ['food', 'water']:
        e = r[k]; t.ok(e['hours'] == 24 and abs(e['exp'] - e['act']) <= .2 * max(1, e['act']), f"{k}: expected production {e['exp']:.2f}/day matches the last 24 h ({e['act']:.2f})")
        t.ok(abs(e['net'] - (e['p'] - e['u'])) < 1e-9 and (e['net'] >= 0 or abs(e['days'] - e['stock'] / -e['net']) < 1e-6), f"{k}: net = produced - used, days left = stock / net")
    t.ok(r['same'], 'Town panel / rank conditions use the same numbers as the resource panel')
    t.ok(r['title'] == 'FOOD' and r['hasNet'], 'tapping food at the top opens the food panel')
    r = await pg.evaluate("""()=>{const S=ZH.S,W=ZH.world,out={};const farm=W.buildings.find(b=>b.type==='farm');
      for(const q of S.sv)if(q.job==='Farmer'){q.job='Civilian';}ZH.autoStaff();ZH.showBuildingInfo(farm);const tx=document.getElementById('ib').textContent;
      out.noFarmer=/No Farmer assigned/.test(tx)&&/base output/.test(tx)&&!/needs Farmer/.test(tx);
      const sy=W.buildings.find(b=>b.type==='water');S.sv[0].job='Engineer';ZH.autoStaff();ZH.showBuildingInfo(sy);const w=document.getElementById('bWorker');out.worker=!!w;if(w){w.click();out.unit=ZH.selected&&ZH.selected.kind==='unit'}
      return out}""")
    t.ok(r['noFarmer'], 'a farm without a Farmer says so plainly (and that it runs at base output)')
    t.ok(r['worker'] and r['unit'], "tapping a building's worker opens that survivor")
    r = await pg.evaluate("""()=>{const S=ZH.S,W=ZH.world,out={};ZH.OPTS.autoSlow=false;ZH.alerts.clear();for(const b of W.buildings.filter(b=>b.type==='water'))ZH.demolish(b);for(const b of W.buildings.filter(b=>b.type==='water'))ZH.demolish(b);
      S.water=4;S.hour=11;ZH.step(1000);out.keys=[...ZH.alerts.keys()];const a=ZH.alerts.get('lowwater');out.text=a&&a.text;
      const why=[...document.querySelectorAll('#alerts .aa')].find(b=>b.textContent==='Why?');if(why)why.click();out.panel=document.getElementById('it').textContent;
      S.hour=17;while(ZH.tick%1000!==999)ZH.simTick();S.mat=0;ZH.simTick();out.up=S.log.slice(-6).some(e=>/Upkeep at midnight/.test(e.t));return out}""")
    t.ok('lowwater' in r['keys'], f"a water shortage under a day raises a critical alert ({r['text']})")
    t.ok(r['panel'] == 'WATER', "the alert's Why? button opens the water panel")
    t.ok(r['up'], 'a warning at 18:00 when tonight\'s upkeep cannot be paid')
    t.ok(not errs, f'no page errors {errs[:1]}'); await ctx.close()

async def t_living(br, port, t):   # V2.36: task commitment, sleep, survivor panel, treatment clarity, saves never fail
    ctx, pg, errs = await open_game(br, port, 'living')
    await close_popups(pg)
    for k in ['water', 'farm', 'scrapyard', 'house', 'house', 'gym']: await pg.evaluate(PLACE, k)
    r = await pg.evaluate("""()=>{const S=ZH.S,out={};let x=11;Math.random=()=>{x=(x*1103515245+12345)%2147483648;return x/2147483648};S.mat=80;S.food=S.water=40;
      for(const [n,j] of [['W1','Engineer'],['W2','Farmer'],['W3','Scavenger']])S.sv.push(ZH.mk(n,j,2,7,10,S.sv.length));ZH.autoStaff();
      let on=0,tot=0,saveFail=0,sleep=0,sleepN=0,night=0;
      for(let t=0;t<48000;t++){if(t%400===0)S.z.length=0;ZH.simTick();
        if(t%50===0&&((S.hour>=8&&S.hour<12)||(S.hour>=14&&S.hour<18)))for(const b of ZH.world.buildings)if(b.staff){tot++;if(['work','goWork'].includes(b.staff.mode))on++}
        if(t%500===0){try{ZH.serialize()}catch(e){saveFail++}}
        if(t%250===0&&S.hour>=23){night++;for(const q of S.sv){sleepN++;if(q.sleeping||(q.mode==='goFacility'&&q.facility&&q.facility.type==='house'))sleep++}}}
      out.shift=on/tot;out.saveFail=saveFail;out.sleep=sleep/sleepN;
      const w=S.sv.find(q=>q.post);while(!(S.hour>=8&&S.hour<11))ZH.step(100);for(let k=0;k<3000&&!['work','goWork'].includes(w.mode);k++)ZH.simTick();ZH.unitPanel(w);out.now=document.getElementById('uNow').textContent;out.prio=w.mode;
      return out}""")
    t.ok(r['shift'] >= .6, f"staffed workers are at (or heading to) work {r['shift']:.0%} of shift hours (zombie-free town)")
    t.ok(r['saveFail'] == 0, f"autosave never fails over 2 days of play ({r['saveFail']} failures)")
    t.ok(r['sleep'] >= .6, f"at 23:00 most survivors are asleep or going to bed ({r['sleep']:.0%})")
    t.ok('Shift work' in r['now'] and 'Medical Tent ›' in r['now'], f"survivor panel shows priority, destination and workplace ({r['now'][:90]})")
    r = await pg.evaluate("""()=>{const S=ZH.S,out={};const q=S.sv[2];q.hp=0;let k=0;while(q.mode!=='hospital'&&k<20000){ZH.simTick();k++}out.inCare=q.mode==='hospital';out.total=!!q.careTotal;
      ZH.unitPanel(q);out.line=document.getElementById('uNow').textContent;const m=ZH.world.buildings.find(b=>['medic','clinic','hospital'].includes(b.type));ZH.showBuildingInfo(m);const tx=document.getElementById('ib').textContent;out.patients=/Patients [(][0-9]+[)]/.test(tx)&&tx.includes(q.name);
      const b=ZH.world.buildings.find(b=>b.type==='water');const f0=ZH.S.sv.length;return out}""")
    t.ok(r['inCare'] and r['total'], 'a rescued survivor is in care with a known treatment time')
    t.ok('Recovering' in r['line'] and '%' in r['line'], f"their panel shows treatment progress ({r['line'][:80]})")
    t.ok(r['patients'], 'the medical building lists its patient')
    t.ok(not errs, f'no page errors {errs[:1]}'); await ctx.close()

async def t_combat(br, port, t):   # V2.37: policies, rescue pool, contextual combat feedback
    ctx, pg, errs = await open_game(br, port, 'combat')
    await close_popups(pg)
    await pg.evaluate(PLACE, 'water')
    r = await pg.evaluate("""()=>{const S=ZH.S,out={};S.z.length=0;const e=S.sv.find(q=>q.job!=='Guard');e.job='Engineer';ZH.autoStaff();const w=e;
      ZH.setPolicy('produce');S.hour=18;out.produce18=ZH.onShift(w);ZH.setPolicy('recover');out.recover18=ZH.onShift(w);S.hour=14;out.recover14=ZH.onShift(w);out.rp=ZH.retreatPct();
      ZH.setPolicy('balanced');out.rb=ZH.retreatPct();ZH.setPolicy('defend');out.rd=ZH.retreatPct();
      const g=S.sv.find(q=>q.job==='Guard');S.alert=0;ZH.spawn(g.w.x+7.5,g.w.y,'walker');const z=S.z[S.z.length-1];z.mode='idle';out.zDist=Math.hypot(z.w.x-g.w.x,z.w.y-g.w.y);
      out.idleBar=ZH.engaged(z);z.hp-=5;out.hurtBar=ZH.engaged(z);ZH.saveGame();out.saved=JSON.parse(localStorage.getItem('zombieHavenV26')).S.policy;return out}""")
    t.ok(r['produce18'] and not r['recover18'] and r['recover14'], f"policies move the shift end (Production to 19:00, Recover to 16:00) {r}")
    t.ok(r['rp'] == r['rb'] + 15 and r['rd'] == r['rb'] - 5, f"Recover falls back sooner, Defend holds longer ({r['rb']} / {r['rp']} / {r['rd']})")
    t.ok(r['saved'] == 'defend', 'the town policy is saved')
    t.ok(not r['idleBar'] and r['hurtBar'], 'a zombie shows its HP bar only once hurt or fighting')
    r = await pg.evaluate("""()=>{const S=ZH.S,out={};S.z.length=0;const v=S.sv[0];for(const q of S.sv)if(q!==v){q.mode='useFacility';q.sleeping=true;q.facility=ZH.world.buildings.find(b=>b.type==='house');}
      v.hp=0;ZH.simTick();ZH.simTick();out.down=v.mode==='down';out.ok=ZH.assignRescue();out.rescuer=!!v.rescuer;out.wasAsleep=v.rescuer&&v.rescuer.facility===null;return out}""")
    t.ok(r['down'] and r['rescuer'], 'a sleeping survivor is woken to rescue someone who collapsed')
    r = await pg.evaluate("""()=>{const S=ZH.S,out={};S.z.length=0;for(const q of S.sv){q.mode='free';q.sleeping=false;q.facility=null;q.hp=q.max;q.rescuer=null;q.rescuing=null;q.bleed=null}
      ZH.spawnBoss();ZH.spawnBoss();out.bosses=S.z.filter(z=>z.type==='boss'&&z.hp>0).length;while(S.hour!==5)ZH.step(100);ZH.step(1100);out.after=S.z.filter(z=>z.type==='boss'&&z.hp>0).length;
      S.z.length=0;const v=S.sv.find(q=>q.job!=='Guard');v.hp=0;ZH.simTick();ZH.spawn(v.w.x+.5,v.w.y,'walker');const zz=S.z[S.z.length-1];zz.mode='idle';zz.stateTicks=99999;
      for(const q of S.sv)if(q!==v&&q.job!=='Guard'){q.mode='hiding';q.hideAt=ZH.world.buildings[0];q.stateTicks=9999}
      const civ=S.sv.filter(q=>q!==v&&!['Guard','Police Officer','SWAT','Scavenger'].includes(q.job));out.civRescue=false;ZH.assignRescue();out.civRescue=!!(v.rescuer&&civ.includes(v.rescuer));
      if(!S.sv.some(q=>q!==v&&q.job==='Guard'))S.sv.push(ZH.mk('Gus','Guard',3,v.w.x+1,v.w.y,S.sv.length));for(const q of S.sv)if(q.job==='Guard'){q.mode='hiding';q.hideAt=ZH.world.buildings[0];q.hp=q.max;q.rescuing=null;q.carrying=null}v.rescuer=null;
      out.rally=ZH.rally();return out}""")
    t.ok(r['bosses'] >= 2 and r['after'] == 0, f"every boss leaves at dawn ({r['bosses']} -> {r['after']})")
    t.ok(not r['civRescue'], 'a non-fighter does not walk up to a body with a zombie on it')
    t.ok(r['rally'], 'when someone is down and nobody fights, fighters rally out of shelter')
    t.ok(not errs, f'no page errors {errs[:1]}'); await ctx.close()

async def t_polish(br, port, t):   # V2.38: pacing, night lights, safe removal, touch targets
    ctx, pg, errs = await open_game(br, port, 'polish')
    await close_popups(pg)
    r = await pg.evaluate("""()=>{const S=ZH.S,W=ZH.world,Wd=ZH.Wd,out={};S.mat=99;ZH.tryWall(3,5,'wood');ZH.startTool({kind:'demolish'});const p=ZH.project(3.5,5.5);
      ZH.tapAt(p.x,p.y);out.after1=!!Wd.wallAt(W,3,5);ZH.tapAt(p.x,p.y);out.after2=!!Wd.wallAt(W,3,5);
      const rk=[...W.roads][0].split(',').map(Number),q=ZH.project(rk[0]+.5,rk[1]+.5);ZH.tapAt(q.x,q.y);out.road1=Wd.isRoad(W,rk[0],rk[1]);ZH.tapAt(q.x,q.y);out.road2=Wd.isRoad(W,rk[0],rk[1]);ZH.endBuildMode(true);
      S.rank=2;S.food=S.water=40;S.lastEventDay=-1;out.lock=ZH.holdEvent('caravan');S.rank=3;const m0=S.mat,f0=S.food;out.ok=ZH.holdEvent('caravan');out.parts=S.mat-m0;out.food=f0-S.food;
      S.rank=4;S.res={};ZH.showUpgrade('rank');out.path=document.getElementById('ib').textContent;
      S.hour=22;ZH.OPTS.nightLights=true;ZH.draw();ZH.OPTS.nightLights=false;ZH.draw();ZH.OPTS.nightLights=true;out.opt=JSON.parse(localStorage.getItem('zombieHavenOpts')||'{}');
      ZH.showTown('overview');const c=document.getElementById('closeInfo').getBoundingClientRect(),tb=document.querySelector('.tabs button').getBoundingClientRect();out.close=[c.width,c.height];out.tab=tb.height;return out}""")
    t.ok(r['after1'] and not r['after2'], 'a wall needs a second tap to be removed')
    t.ok(r['road1'] and not r['road2'], 'a road needs a second tap to be removed')
    t.ok(not r['lock'] and r['ok'] and r['parts'] == 10 and r['food'] == 12, f"Trade Caravan: locked before rank 3, then 12 food + 10 water -> 10 parts {r['parts']},{r['food']}")
    t.ok('Trauma Care' in r['path'] and 'Field Surgery' in r['path'], 'Upgrade Town says the Hospital needs the Field Surgery -> Trauma Care research')
    t.ok(min(r['close']) >= 44 and r['tab'] >= 42, f"panel close button {r['close']} and tabs ({r['tab']} px) are thumb-sized")
    t.ok(not errs, f'night lights draw without errors {errs[:1]}'); await ctx.close()

async def t_input_staff(br, port, t):   # V2.39: touch gestures, roads, worker assignment, advisor
    ctx, pg, errs = await open_game(br, port, 'input')
    await close_popups(pg)
    r = await pg.evaluate("""()=>{const cv=document.getElementById('game'),R=cv.getBoundingClientRect(),out={};const ev=(type,id,x,y)=>cv.dispatchEvent(new PointerEvent(type,{pointerId:id,clientX:R.left+x,clientY:R.top+y,bubbles:true,isPrimary:id===1}));
      cv.setPointerCapture=()=>{};const S=ZH.S,W=ZH.world,Wd=ZH.Wd;S.mat=99;ZH.cam.z=1;ZH.centerOn(7.5,11);
      let t=null;for(let y=Wd.BUILD.y0;y<=Wd.BUILD.y1&&!t;y++)for(let x=Wd.BUILD.x0;x<=Wd.BUILD.x1;x++)if(!Wd.isRoad(W,x,y)&&!Wd.buildingAt(W,x,y)){const p=ZH.project(x+.5,y+.5);if(p.x>40&&p.x<R.width-40&&p.y>200&&p.y<R.height-120){t={x,y,p};break}}
      ZH.startTool({kind:'road'});const n0=W.roads.size,cx0=ZH.cam.x;
      ev('pointerdown',1,t.p.x,t.p.y);ev('pointermove',1,t.p.x+40,t.p.y+10);ev('pointerup',1,t.p.x+40,t.p.y+10);out.drag=ZH.cam.x!==cx0&&W.roads.size===n0;
      ZH.centerOn(7.5,11);const z0=ZH.cam.z;ev('pointerdown',1,t.p.x-30,t.p.y);ev('pointerdown',2,t.p.x+30,t.p.y);ev('pointermove',2,t.p.x+80,t.p.y);out.zoom=ZH.cam.z>z0;
      const cx1=ZH.cam.x;ev('pointerup',2,t.p.x+80,t.p.y);ev('pointermove',1,t.p.x+10,t.p.y);out.panAfter=ZH.cam.x!==cx1;ev('pointerup',1,t.p.x+10,t.p.y);out.noTapPinch=W.roads.size===n0;
      ZH.cam.z=1;ZH.centerOn(7.5,11);const p=ZH.project(t.x+.5,t.y+.5);ev('pointerdown',1,p.x,p.y);ev('pointerup',1,p.x,p.y);out.tap=Wd.isRoad(W,t.x,t.y);ZH.endBuildMode(true);
      ZH.tryRoad&&0;return out}""")
    t.ok(r['drag'], 'dragging pans the map and does not place anything')
    t.ok(r['zoom'], 'pinching zooms')
    t.ok(r['panAfter'], 'after a pinch, the finger left on the screen keeps panning')
    t.ok(r['noTapPinch'], 'a pinch never counts as a tap')
    t.ok(r['tap'], 'a quick tap places a road')
    r = await pg.evaluate("""()=>{const S=ZH.S,W=ZH.world,Wd=ZH.Wd,out={};S.mat=99;const B=Wd.BUILD;
      const rd=[...W.roads][0].split(',').map(Number);out.onRoad=!Wd.placementCheck(W,rd[0],rd[1],ZH.DEFS.house,null).ok;
      out.outside=!Wd.inTown(B.x0-1,B.y0);const n=W.roads.size;ZH.startTool({kind:'road'});const pb=ZH.project(B.x0-.5,B.y0+.5);ZH.tapAt(pb.x,pb.y);out.noOutside=W.roads.size===n;ZH.endBuildMode(true);
      const a={x:B.x0,y:rd[1]},b={x:B.x1,y:rd[1]};const p1=Wd.findPath(W,a,b);out.path=!!p1;out.roadShare=p1?p1.filter(q=>Wd.isRoad(W,q.x,q.y)).length/p1.length:0;
      for(const q of S.sv)q.job='Civilian';S.sv[0].job='Farmer';S.sv[0].l=1;S.sv[1].job='Farmer';S.sv[1].l=4;
      const D=ZH.DEFS.farm;let f=null;for(let y=B.y0;y<=B.y1&&!f;y++)for(let x=B.x0;x<=B.x1;x++)if(Wd.placementCheck(W,x,y,D,null).ok){f={type:'farm',x,y,w:D.w,h:D.h,q:D.q,a:D.a,staff:null};W.buildings.push(f);Wd.bump(W);break}
      ZH.autoStaff();out.best=f.staff===S.sv[1];S.sv[1].job='Guard';ZH.autoStaff();out.swap=f.staff===S.sv[0];
      ZH.killSurvivor(S.sv[0],'test');ZH.autoStaff();out.released=!f.staff;S.sv[2].job='Farmer';ZH.autoStaff();out.refill=f.staff===S.sv[2];ZH.burnDown(f);ZH.autoStaff();out.burnt=!f.staff;
      return out}""")
    t.ok(r['onRoad'] and r['outside'] and r['noOutside'], 'roads stay in the build zone and buildings cannot sit on them')
    t.ok(r['path'] and r['roadShare'] > .5, f"paths follow the road when there is one ({r['roadShare']:.0%} of steps on road)")
    t.ok(r['best'], 'the higher-level Farmer gets the farm')
    t.ok(r['swap'], 'a worker who changes profession leaves the post and a matching survivor takes it')
    t.ok(r['released'] and r['refill'], 'a dead worker frees the post, a new Farmer fills it')
    t.ok(r['burnt'], 'a burnt building releases its worker')
    r = await pg.evaluate("""()=>{const S=ZH.S,out={};S.stage=2;S.guide=99;S.water=1;S.advMute={};ZH.OPTS.advisor=true;ZH.advisorUpdate();const el=document.getElementById('adv');out.shown=el.style.display!=='none';out.text=el.textContent;
      const k=ZH.advShown&&ZH.advShown.key;document.getElementById('advX').click();out.muted=!ZH.advisorTips().some(t=>t.key===k);return out}""")
    t.ok(r['shown'] and 'Water' in r['text'], f"the town advisor names the most urgent issue ({r['text']})")
    t.ok(r['muted'], 'hiding an advisor tip mutes it for the day')
    t.ok(not errs, f'no page errors {errs[:1]}'); await ctx.close()

async def t_title(br, port, t):   # V2.40: title screen and save slots
    ctx = await br.new_context(viewport={'width': 390, 'height': 844}, device_scale_factor=2, is_mobile=True, has_touch=True)
    pg = await ctx.new_page(); errs = []; pg.on('pageerror', lambda e: errs.append(str(e)))
    await pg.goto(f'http://127.0.0.1:{port}/index.html?test=prep'); await pg.wait_for_function('window.ZH && ZH.S && ZH.S.sv.length>0')
    await pg.evaluate("()=>{localStorage.clear();ZH.S.townName='Old Town';ZH.S.day=9;ZH.saveGame()}")
    base = f'http://127.0.0.1:{port}/index.html'
    await pg.goto(base); await pg.wait_for_selector('#title', state='visible')
    r = await pg.evaluate("()=>({hud:getComputedStyle(document.getElementById('plaque')).display,cont:document.getElementById('tCont').textContent})")
    t.ok(r['hud'] == 'none', 'the title screen hides the game HUD')
    t.ok('Old Town' in r['cont'] and 'Day 9' in r['cont'], f"Continue offers the latest save ({r['cont']})")
    await pg.click('#tStart'); await pg.wait_for_selector('#slots', state='visible')
    r = await pg.evaluate("()=>[...document.querySelectorAll('.slot')].map(e=>e.textContent)")
    t.ok('Old Town' in r[0] and 'Empty' in r[1] and 'Empty' in r[2], 'an existing save shows up in slot 1, the others are empty')
    await pg.click('.slot[data-i="2"]'); await pg.fill('#sName', 'Ember Hold'); await pg.click('#sGo')
    await pg.wait_for_function('window.ZH && ZH.S && ZH.S.sv.length>0'); await pg.wait_for_timeout(300)
    r = await pg.evaluate("()=>{ZH.S.day=3;ZH.saveGame();return {slot:ZH.SLOT,name:ZH.S.townName,old:JSON.parse(localStorage.getItem('zombieHavenV26')).S.townName,s3:!!localStorage.getItem('zombieHavenV26_s3')}}")
    t.ok(r['slot'] == 3 and r['name'] == 'Ember Hold' and r['s3'], f"a new game starts in the chosen slot with its name {r}")
    t.ok(r['old'] == 'Old Town', 'starting a new slot and leaving the title never overwrites the other saves')
    await pg.goto(base); await pg.wait_for_selector('#title', state='visible'); await pg.click('#tStart')
    await pg.click('.sdel[data-del="2"]'); still = await pg.evaluate("()=>!!localStorage.getItem('zombieHavenV26_s3')")
    await pg.click('.sdel[data-del="2"]'); gone = await pg.evaluate("()=>!localStorage.getItem('zombieHavenV26_s3')")
    t.ok(still and gone, 'deleting a slot takes two taps')
    await pg.click('.slot[data-i="0"]'); await pg.wait_for_function('window.ZH && ZH.S && ZH.S.townName'); r = await pg.evaluate("()=>({slot:ZH.SLOT,name:ZH.S.townName,day:ZH.S.day})")
    t.ok(r['slot'] == 1 and r['name'] == 'Old Town', f"tapping a saved slot loads it {r}")
    t.ok(not errs, f'no page errors {errs[:1]}'); await ctx.close()

async def t_menu(br, port, t):   # V2.41: Demolish inside Build, home button
    ctx, pg, errs = await open_game(br, port, 'menu')
    r = await pg.evaluate("()=>({mdemo:!!document.getElementById('mDemo'),home:getComputedStyle(document.getElementById('btnHome')).display})")
    t.ok(not r['mdemo'], 'the separate Demolish button is gone from the side menu')
    t.ok(r['home'] != 'none', 'the main-screen button shows in game')
    await pg.evaluate("()=>ZH.showBuild()"); await pg.click('#bDemo')
    t.ok(await pg.evaluate("()=>ZH.sel&&ZH.sel.kind==='demolish'"), 'Demolish inside the Build menu starts the demolish tool')
    await pg.evaluate("()=>{ZH.endBuildMode(true);ZH.S.townName='Home Test';ZH.saveGame()}")
    await pg.click('#btnHome'); await pg.wait_for_selector('#title', state='visible')
    r = await pg.evaluate("()=>({home:getComputedStyle(document.getElementById('btnHome')).display,cont:document.getElementById('tCont').textContent})")
    t.ok(r['home'] == 'none', 'the main-screen button is hidden on the title screen')
    t.ok('Home Test' in r['cont'], f"going back to the main screen keeps the save ({r['cont']})")
    t.ok(not errs, f'no page errors {errs[:1]}'); await ctx.close()

async def t_saves(br, port, t):   # V2.42: slot isolation, day backup, damaged saves never overwritten, storage full, second tab, export / import
    base = f'http://127.0.0.1:{port}/index.html'
    ctx, pg, errs = await open_game(br, port, 'saves1')
    good = await pg.evaluate("()=>{ZH.S.townName='Bak Town';ZH.S.day=7;return ZH.serialize()}")
    await ctx.close()
    # 1. slot isolation: playing slot 2 writes only slot 2 keys
    ctx = await br.new_context(viewport={'width': 390, 'height': 844}); await ctx.add_init_script("if(!sessionStorage.getItem('x')){sessionStorage.setItem('x',1);localStorage.setItem('zhSlot','2');localStorage.setItem('zombieHavenV26','SLOT1');localStorage.setItem('zombieHavenV26_s3','SLOT3')}")
    pg = await ctx.new_page(); errs = []; pg.on('pageerror', lambda e: errs.append(str(e)))
    await pg.goto(base + '?test=iso'); await pg.wait_for_function('window.ZH && ZH.S && ZH.S.sv.length>0')
    r = await pg.evaluate("()=>{const ok=ZH.saveGame();return {ok,slot:ZH.SLOT,keys:Object.keys(localStorage).filter(k=>k.startsWith('zombieHaven')).sort(),s1:localStorage.getItem('zombieHavenV26'),s3:localStorage.getItem('zombieHavenV26_s3')}}")
    t.ok(r['ok'] and r['slot'] == 2 and r['s1'] == 'SLOT1' and r['s3'] == 'SLOT3', f'playing slot 2 never touches slots 1 and 3 {r}')
    t.ok(set(r['keys']) == {'zombieHavenV26', 'zombieHavenV26_s2', 'zombieHavenV26_s2_bak', 'zombieHavenV26_s3'}, f"slot 2 keeps its own day backup {r['keys']}")
    # 5. a second tab on the same slot stops this one from saving
    pg2 = await ctx.new_page(); await pg2.goto(base + '?test=iso2'); await pg2.wait_for_function('window.ZH && ZH.S && ZH.S.sv.length>0')
    await pg2.evaluate("()=>ZH.saveGame()"); await pg.wait_for_timeout(200)
    r = await pg.evaluate("()=>({blocked:ZH.saveBlocked,saved:ZH.saveGame(),alert:ZH.alerts.has('savetab')})")
    t.ok(r['blocked'] == 'tab' and not r['saved'] and r['alert'], f'a second tab on the same slot makes the first stop saving, with an alert {r}')
    # 4. storage full: reported, then recovers
    r = await pg2.evaluate("""()=>{const o=Storage.prototype.setItem;Storage.prototype.setItem=function(){const e=new Error('full');e.name='QuotaExceededError';throw e};const a=ZH.saveGame(),al=ZH.alerts.has('savefail'),err=ZH.saveErr;Storage.prototype.setItem=o;const b=ZH.saveGame();ZH.alertsTick&&ZH.alertsTick();return {a,al,err,b,cleared:!ZH.saveErr}}""")
    t.ok(not r['a'] and r['al'] and 'full' in r['err'], f'a full storage is reported as a critical alert {r}')
    t.ok(r['b'] and r['cleared'], 'saving works again once there is room, and the alert clears')
    t.ok(not errs, f'no page errors {errs[:1]}'); await ctx.close()
    # 2. damaged save + day backup: the backup loads, the damaged copy is kept
    ctx = await br.new_context(viewport={'width': 390, 'height': 844}); await ctx.add_init_script("if(!sessionStorage.getItem('x')){sessionStorage.setItem('x',1);localStorage.setItem('zombieHavenV26','{\"broken');localStorage.setItem('zombieHavenV26_bak'," + json.dumps(good) + ")}")
    pg = await ctx.new_page(); errs = []; pg.on('pageerror', lambda e: errs.append(str(e)))
    await pg.goto(base + '?test=bak'); await pg.wait_for_function('window.ZH && ZH.S && ZH.S.sv.length>0')
    r = await pg.evaluate("()=>({from:ZH.loadedFrom,name:ZH.S.townName,day:ZH.S.day,bad:localStorage.getItem('zombieHavenV26_bad'),saved:ZH.saveGame()})")
    t.ok(r['from'] == 'bak' and r['name'] == 'Bak Town' and r['day'] == 7, f'a damaged save falls back to the day backup {r}')
    t.ok(r['bad'] == '{"broken' and r['saved'], 'the damaged copy is kept aside and the game saves normally')
    await ctx.close()
    # 3. damaged save, no backup: nothing is overwritten
    ctx = await br.new_context(viewport={'width': 390, 'height': 844}); await ctx.add_init_script("if(!sessionStorage.getItem('x')){sessionStorage.setItem('x',1);localStorage.setItem('zombieHavenV26','{\"S\":{\"day\":3},\"sv\":5}')}")
    pg = await ctx.new_page(); errs = []; pg.on('pageerror', lambda e: errs.append(str(e)))
    await pg.goto(base + '?test=dmg'); await pg.wait_for_function('window.ZH && ZH.S && ZH.S.sv.length>0'); await pg.wait_for_timeout(300)
    r = await pg.evaluate("()=>{const a=ZH.saveGame();ZH.step(3000);window.dispatchEvent(new Event('pagehide'));return {a,blocked:ZH.saveBlocked,raw:localStorage.getItem('zombieHavenV26'),pop:document.getElementById('ev')?getComputedStyle(document.getElementById('ev')).display:'?',txt:document.body.innerText.includes('SAVE COULD NOT BE OPENED')}}")
    t.ok(not r['a'] and r['blocked'] == 'load' and r['raw'] == '{"S":{"day":3},"sv":5}', f'a save that cannot be loaded is never overwritten {r}')
    t.ok(r['txt'], 'the player is told the save could not be opened')
    t.ok(not errs, f'no page errors {errs[:1]}'); await ctx.close()
    # 6. export / import
    ctx, pg, errs = await open_game(br, port, 'saves2')
    r = await pg.evaluate("""()=>{ZH.S.townName='Export Town';ZH.S.day=11;ZH.saveGame();const txt=ZH.backupText(0),o=JSON.parse(txt);const p=ZH.parseBackup(txt),bad=ZH.parseBackup('hello'),half=ZH.parseBackup(txt.slice(0,200));
      const nv=JSON.parse(txt);nv.save.version='99.0.0';const newer=ZH.importBackup(2,JSON.stringify(nv));const imp=ZH.importBackup(2,txt);const raw=ZH.importBackup(1,JSON.stringify(o.save));
      return {zh:o.zhBackup,name:o.name,day:o.day,p:p.ok,bad:bad.ok,half:half.ok,newer:newer.ok,imp:imp.ok,info:ZH.slotInfo(2),raw:raw.ok,info1:ZH.slotInfo(1)}}""")
    t.ok(r['zh'] == 1 and r['name'] == 'Export Town' and r['day'] == 11 and r['p'], f"a backup carries the town name and day {r['name']} {r['day']}")
    t.ok(not r['bad'] and not r['half'] and not r['newer'], 'garbage, a cut-off file and a backup from a newer version are refused')
    t.ok(r['imp'] and r['info']['name'] == 'Export Town' and r['info']['day'] == 11 and r['raw'] and r['info1']['name'] == 'Export Town', f"a backup (or a raw save) imports into another slot {r['info']}")
    t.ok(not errs, f'no page errors {errs[:1]}'); await ctx.close()
    # 7. title screen Backups: import by pasting into an empty slot, two taps to replace a town
    ctx = await br.new_context(viewport={'width': 320, 'height': 568}, device_scale_factor=2, is_mobile=True, has_touch=True)
    await ctx.add_init_script("if(!sessionStorage.getItem('x')){sessionStorage.setItem('x',1);localStorage.setItem('zombieHavenV26'," + json.dumps(good) + ")}")
    pg = await ctx.new_page(); errs = []; pg.on('pageerror', lambda e: errs.append(str(e)))
    await pg.goto(base); await pg.wait_for_selector('#title', state='visible'); await pg.click('#tStart'); await pg.click('#sBak')
    t.ok(await pg.locator('[data-ex]').count() == 3 and await pg.locator('[data-imp]').count() == 3, 'Backups lists export for the saved slot and import for every slot')
    await pg.click('[data-imp="1"]'); await pg.fill('#impText', good.replace('Bak Town', 'Pasted Town')); await pg.click('#impGo')
    r = await pg.evaluate("()=>({s2:JSON.parse(localStorage.getItem('zombieHavenV26_s2')||'{}').S?.townName,msg:(document.getElementById('bakMsg')||{}).textContent})")
    t.ok(r['s2'] == 'Pasted Town', f'pasting a backup into an empty slot imports it {r}')
    await pg.click('[data-imp="0"]'); await pg.fill('#impText', good.replace('Bak Town', 'Replaced')); await pg.click('#impGo')
    first = await pg.evaluate("()=>JSON.parse(localStorage.getItem('zombieHavenV26')).S.townName"); await pg.click('#impGo')
    second = await pg.evaluate("()=>[JSON.parse(localStorage.getItem('zombieHavenV26')).S.townName,JSON.parse(localStorage.getItem('zombieHavenV26_bak')).S.townName]")
    t.ok(first == 'Bak Town' and second == ['Replaced', 'Bak Town'], f'replacing a town takes two taps and keeps the old one as the day backup {first} {second}')
    await pg.click('[data-imp="2"]'); await pg.set_input_files('#impFile', files=[{'name': 'b.json', 'mimeType': 'application/json', 'buffer': good.replace('Bak Town', 'File Town').encode()}]); await pg.wait_for_timeout(200)
    r = await pg.evaluate("()=>JSON.parse(localStorage.getItem('zombieHavenV26_s3')||'{}').S?.townName"); t.ok(r == 'File Town', f'choosing a backup file imports it ({r})')
    sw = await pg.evaluate("()=>document.documentElement.scrollWidth"); t.ok(sw <= 320, f'Backups fit a 320 px screen ({sw})')
    t.ok(not errs, f'no page errors {errs[:1]}'); await ctx.close()

async def t_traits(br, port, t):   # V2.43: survivor personalities change existing decisions and are explained
    ctx, pg, errs = await open_game(br, port, 'traits')
    r = await pg.evaluate("""()=>{const S=ZH.S,T=ZH.TRAITS,o={};o.all=S.sv.every(q=>T[q.trait]);o.start=S.sv.slice(0,4).map(q=>q.trait).join(',');
      const g=S.sv.find(q=>q.job==='Guard'),keep=g.trait;g.trait=null;o.r1=ZH.traitRange(g);g.trait='brave';o.r2=ZH.traitRange(g);g.trait='cautious';o.r3=ZH.traitRange(g);g.trait=keep;
      const a={name:'Zed',id:41},b={name:'Zed',id:41};o.stable=ZH.rollTrait(a)===ZH.rollTrait(b)&&!!T[ZH.rollTrait(a)];
      const f=S.sv.find(q=>q.job==='Farmer');const k0=f.trait;f.trait=null;const r0=ZH.ration(f);f.trait='eater';o.eat=ZH.ration(f)/r0;f.trait=k0;
      o.loot=ZH.expTraitLoot([{trait:'scrounger'},{trait:'loner'}]);o.loot4=ZH.expTraitLoot([{trait:'loner'},{},{},{}]);return o}""")
    t.ok(r['all'] and r['start'] == 'brave,caring,scrounger,diligent', f"every survivor has a personality; the starters are Brave Marcus, Caring Amy, Scrounger Lena, Hard-working Ben ({r['start']})")
    t.ok(r['r1'] == 1 and r['r2'] == 1.25 and r['r3'] == .8, f"Brave fighters engage from farther, Cautious from closer {r['r1']} {r['r2']} {r['r3']}")
    t.ok(r['stable'], 'old saves get a stable personality (same survivor, same trait)')
    t.ok(abs(r['eat'] - 1.3) < 1e-6, f"a Big Eater eats 30% more ({r['eat']})")
    t.ok(abs(r['loot'] - 1.15 * 1.25) < 1e-6 and r['loot4'] == 1, f"Scrounger +15% loot, Loner +25% only in a squad of 1–2 ({r['loot']}, {r['loot4']})")
    r = await pg.evaluate("""()=>{const S=ZH.S,q=S.sv.find(x=>x.job==='Guard'),o={};S.retreat=35;S.policy='balanced';S.z.length=0;
      const test=(tr,pct)=>{q.trait=tr;q.fleeT=0;q.hp=Math.round(q.max*pct);q.mode='chase';const r=ZH.retreatCheck(q);q.mode='free';q.facility=null;q.fleeT=0;return r};
      o.c=test('cautious',.45);o.n=test('scrounger',.45);o.b=test('brave',.3);o.n2=test('scrounger',.3);q.hp=q.max;q.trait='brave';return o}""")
    t.ok(r['c'] and not r['n'], f'a Cautious fighter falls back at 45% health where others keep going {r}')
    t.ok(not r['b'] and r['n2'], f'a Brave fighter keeps fighting at 30% where others fall back {r}')
    r = await pg.evaluate("""()=>{const S=ZH.S,o={};const b=ZH.world.buildings.find(x=>ZH.DEFS[x.type].slot);if(!b)return {skip:1};const q=S.sv.find(x=>x.job!=='Guard');const keep=b.staff;b.staff=q;const md=q.mode;q.mode='work';q.trait='scrounger';const base=ZH.prodMult(b);q.trait='diligent';const dil=ZH.prodMult(b);q.mode=md;b.staff=keep;return {base,dil}}""")
    t.ok(r.get('skip') or r['dil'] > r['base'] + .2, f'a Hard-working worker out-produces a Scrounger at the same post {r}')
    r = await pg.evaluate("""()=>{const S=ZH.S;S.z.length=0;const v=S.sv.find(q=>q.job==='Farmer');v.hp=0;ZH.simTick();for(let i=0;i<2;i++){ZH.spawn(v.w.x+.4+i*.3,v.w.y,'walker');const z=S.z[S.z.length-1];z.mode='idle';z.stateTicks=99999}
      for(const q of S.sv)if(q!==v){q.mode=['Guard','Scavenger','Police Officer'].includes(q.job)?'hiding':'free';q.rescuing=null;q.carrying=null;q.hp=q.max;q.trait='scrounger'}
      const m=S.sv.find(q=>q.job==='Medic');v.rescuer=null;ZH.assignRescue();const plain=v.rescuer===m;if(v.rescuer){v.rescuer.rescuing=null;v.rescuer.mode='free'}v.rescuer=null;m.trait='caring';ZH.assignRescue();return {plain,caring:v.rescuer===m,why:m.why}}""")
    t.ok(not r['plain'] and r['caring'] and 'Caring' in r['why'], f'only a Caring non-fighter runs to the downed past two zombies, and says why {r}')
    r = await pg.evaluate("""()=>{const S=ZH.S,q=S.sv.find(x=>x.job==='Medic');ZH.unitPanel(q);const h=document.getElementById('ib').innerHTML;ZH.closeP();return {card:h.includes('traitCard'),name:h.includes(ZH.TRAITS[q.trait].name)}}""")
    t.ok(r['card'] and r['name'], 'the survivor panel explains the personality (upside and cost)')
    r = await pg.evaluate("""()=>{const S=ZH.S;S.sv.forEach(q=>q.trait='loner');const q=S.sv[0];q.trait='eater';ZH.saveGame();const d=JSON.parse(ZH.serialize());return d.sv.map(x=>x.trait)}""")
    t.ok(r[0] == 'eater' and all(x == 'loner' for x in r[1:]), 'personalities are saved')
    t.ok(not errs, f'no page errors {errs[:1]}'); await ctx.close()

async def t_expchoices(br, port, t):   # V2.44: expedition situations with choices; odds from stats, gear, professions and personalities
    ctx, pg, errs = await open_game(br, port, 'expc')
    SETUP = """(risk)=>{const S=ZH.S;S.trip=null;S.food=S.water=60;for(const q of S.sv){q.hp=q.max;q.hunger=q.thirst=0;q.mode='free';q.rescuing=q.carrying=null}
      while(S.sv.length<5)S.sv.push(ZH.mk('X'+S.sv.length,'Civilian',1,7,10,S.sv.length));const ids=ZH.expAutoSquad(3).map(q=>q.id);const r=ZH.startExpedition(risk==='low'?'houses':'pharmacy',risk,ids);ZH.closeP();return r.ok}"""
    await pg.evaluate("()=>{ZH.tryWall(3,5,'wood')}")
    t.ok(await pg.evaluate(SETUP, 'low'), 'a squad can leave')
    r = await pg.evaluate("""()=>{const t=ZH.S.trip,e=ZH.expEncounter(t,'door'),names=t.members.map(m=>m.name);const best=t.members.reduce((a,m)=>(m.st.str+(m.job==='Engineer'?2:0))>(a.st.str+(a.job==='Engineer'?2:0))?m:a);
      const o={n:e.opts.length,c:e.opts.map(x=>x.chance),who:e.opts[0].who,inSquad:names.includes(e.opts[0].who)};const m0=t.loot.mat;const res=ZH.encResolve(t,0,0);o.ok=res.ok;o.gain=t.loot.mat-m0;o.cleared=!t.enc;return o}""")
    t.ok(r['n'] == 3 and all(0 < c <= 1 for c in r['c']) and r['inSquad'], f"a situation offers 3 options with odds and names who would do it {r}")
    t.ok(r['ok'] and r['gain'] >= 2 and r['cleared'], f"a successful choice adds its reward {r}")
    r = await pg.evaluate("""()=>{const t=ZH.S.trip;ZH.expEncounter(t,'horde');const id=t.enc.opts[1].whoId,m=t.members.find(x=>x.id===id),hp=m.hp;const res=ZH.encResolve(t,1,.999);return {ok:res.ok,hp,after:m.hp,col:!!m.collapsed}}""")
    t.ok(not r['ok'] and (r['after'] < r['hp'] or r['col']), f"a failed risky choice hurts the person who tried {r}")
    r = await pg.evaluate("""()=>{const t=ZH.S.trip,E=ZH.EXP_ENC.cache.opts[0],F=ZH.EXP_ENC.horde.opts[0];t.members.forEach(m=>m.trait='diligent');const a=ZH.encOdds(t,E).chance;t.members.forEach(m=>m.trait='scrounger');const b=ZH.encOdds(t,E).chance;
      const f1=ZH.encOdds(t,F).chance;const keep=t.members.map(m=>m.eq.weapon);t.members.forEach(m=>m.eq.weapon='katana');const f2=ZH.encOdds(t,F).chance;t.members.forEach((m,i)=>m.eq.weapon=keep[i]);return {a,b,f1,f2}}""")
    t.ok(r['b'] - r['a'] > .1, f"a Scrounger improves the odds of searching a wreck {r['a']:.2f} -> {r['b']:.2f}")
    t.ok(r['f2'] > r['f1'] + .05, f"better weapons improve the odds of a fight {r['f1']:.2f} -> {r['f2']:.2f}")
    r = await pg.evaluate("""()=>{const t=ZH.S.trip;t.members.forEach(m=>{m.trait='brave';m.eq.weapon='katana';m.l=6});ZH.expEncounter(t,'horde');const a=ZH.encDefault(t).i;t.enc=null;
      t.members.forEach(m=>m.trait='cautious');ZH.expEncounter(t,'horde');const b=ZH.encDefault(t).i;ZH.encResolve(t,null);return {a,b,phase:t.phase,log:t.log[t.log.length-2]||''}}""")
    t.ok(r['a'] == 0 and r['b'] == 2, f"with no orders a Brave squad fights through, a Cautious one turns back {r}")
    t.ok(r['phase'] == 'back' and 'no orders came' in r['log'], f"turning back ends the trip and the report says who decided {r}")
    await pg.evaluate("()=>{ZH.S.trip=null}")
    t.ok(await pg.evaluate(SETUP, 'medium'), 'a medium-risk squad can leave')
    r = await pg.evaluate("""()=>{const t=ZH.S.trip;t.loot={food:6,water:4,mat:8};ZH.expEncounter(t,'raiders');ZH.encResolve(t,0);return t.loot}""")
    t.ok(r == {'food': 3, 'water': 2, 'mat': 4}, f"paying the raiders' toll costs half the haul {r}")
    r = await pg.evaluate("""()=>{const t=ZH.S.trip;ZH.expEncounter(t,'stranger');const pend=!!t.enc,ser=JSON.parse(ZH.serialize()).S.trip.enc;ZH.tripUpdate(t.t0+t.dur/3*2+1);return {pend,saved:!!ser&&ser.k==='stranger',done:!t.enc||t.enc.k!=='stranger',log:t.log.join(' | ')}}""")
    t.ok(r['pend'] and r['saved'], 'a pending choice is saved with the trip')
    t.ok(r['done'] and 'no orders came' in r['log'], f"if no order comes before the next stage, the squad decides and it is logged")
    await pg.evaluate("()=>{const t=ZH.S.trip;t.enc=null;ZH.expEncounter(t,'cry');ZH.eventQueue.length=0;document.getElementById('eventModal').innerHTML='';ZH.encPopup(t)}")
    r = await pg.evaluate("()=>({btn:document.querySelectorAll('#eventModal button').length,html:document.getElementById('eventModal').innerHTML})")
    t.ok(r['btn'] == 3, f"the situation pop-up shows one button per option ({r['btn']})")
    await pg.click('#eventModal button >> nth=2'); await pg.wait_for_timeout(100)
    r = await pg.evaluate("()=>({left:!ZH.S.trip.enc,log:ZH.S.trip.log[ZH.S.trip.log.length-1]})")
    t.ok(r['left'] and 'Keep moving' in r['log'], f"tapping an option resolves it {r}")
    r = await pg.evaluate("""()=>{const S=ZH.S,t=S.trip;ZH.expEncounter(t,'cry');const en=t.enc;ZH.encResolve(t,0,0);let err=null;try{ZH.encChoose(en,0)}catch(e){err=String(e)}
      const n=S.sv.length+t.members.length,rec=t.recruitNow;t.phase='back';t.backAt=0;ZH.tripUpdate(Date.now()+1);return {rec,err,grew:S.sv.length-n,trip:!!S.trip,last:(S.lastTrip||{}).recruit}}""")
    t.ok(r['rec'] and r['grew'] == 1 and not r['err'] and not r['trip'], f"rescuing the survivor brings them home with the squad; a stale tap does nothing {r}")
    r = await pg.evaluate("""()=>{const S=ZH.S;ZH.showExpedition();const h1=document.getElementById('ib').innerHTML;ZH.closeP();return {hint:h1.includes('personalities set the odds')}}""")
    t.ok(r['hint'], 'the Explore panel says that stats, gear and personalities set the odds')
    t.ok(not errs, f'no page errors {errs[:1]}'); await ctx.close()

async def t_posts(br, port, t):   # V2.45: guard posts, watches, patrols, zombie lure
    ctx, pg, errs = await open_game(br, port, 'posts')
    r = await pg.evaluate("""()=>{const S=ZH.S,o={};S.mat=40;S.rank=1;const m0=S.mat;const a=ZH.tryPost(7,8);o.ok=a.ok;o.cost=m0-S.mat;o.close=ZH.tryPost(8,8).why;const b=ZH.tryPost(4,11);o.max=ZH.tryPost(11,8).why;
      const bb=ZH.world.buildings[0];o.bld=ZH.tryPost(bb.x,bb.y).why;o.n=S.posts.length;o.cur=S.posts.map(p=>{const q=S.sv.find(x=>x.id===p.cur);return q&&q.job});return o}""")
    t.ok(r['ok'] and r['cost'] == 3 and r['n'] == 2, f"a guard post costs 3 parts {r}")
    t.ok(r['close'] == 'close' and r['max'] == 'max' and r['bld'] == 'building', f"posts must be spread out, are capped by rank and can't go on a building {r}")
    t.ok(r['cur'][0] == 'Guard', f"auto picks a Guard first {r['cur']}")
    r = await pg.evaluate("""()=>{const S=ZH.S,[p1,p2]=S.posts,lena=S.sv.find(q=>q.job==='Scavenger');p2.holder=lena.id;p1.holder='auto';ZH.postsAssign();return {p1:S.sv.find(q=>q.id===p1.cur).name,p2:S.sv.find(q=>q.id===p2.cur).name}}""")
    t.ok(r['p2'] == 'Lena' and r['p1'] == 'Marcus', f"a chosen holder takes the post and auto fills the other {r}")
    r = await pg.evaluate("""()=>{const S=ZH.S,p=S.posts[0],h=S.sv.find(q=>q.id===p.cur);S.z.length=0;S.hour=21;p.sched='night';h.hunger=h.thirst=h.fatigue=0;h.hp=h.max;h.mode='free';h.stateTicks=0;h.w={x:p.x+.5+3,y:p.y+.5+1};
      let held=false;for(let i=0;i<1500&&!held;i++){ZH.simTick();held=!!ZH.atPost(h)}return {held,why:h.why}}""")
    t.ok(r['held'], f"at night the holder walks to the post and stands watch {r}")
    r = await pg.evaluate("""()=>{const S=ZH.S,p=S.posts[0],h=S.sv.find(q=>q.id===p.cur);ZH.spawn(p.x+.5+3.2,p.y+.5,'walker');const z=S.z[S.z.length-1];z.mode='idle';z.stateTicks=999;
      for(const q of S.sv)if(q!==h)q.w={x:z.w.x+.6,y:z.w.y+.3};let got=false;for(let i=0;i<30&&!got;i++){ZH.simTick();got=z.target===h}return {got,t:z.target&&z.target.name}}""")
    t.ok(r['got'], f"a zombie inside the watch radius goes for the post holder, even with others closer {r}")
    r = await pg.evaluate("""()=>{const S=ZH.S;S.z.length=0;const p=S.posts[0],h=S.sv.find(q=>q.id===p.cur);const pts=[];for(let i=0;i<20;i++){const d=ZH.patrolDest();pts.push(Math.min(...S.posts.map(q=>Math.hypot(d.x-q.x-.5,d.y-q.y-.5))))}
      S.hour=10;const off=!ZH.atPost(h);return {near:Math.max(...pts),off}}""")
    t.ok(r['near'] < 1.2, f"fighters without a post patrol between the posts {r}")
    t.ok(r['off'], 'a night-watch post is off duty by day')
    r = await pg.evaluate("""()=>{const S=ZH.S,p=S.posts[0];S.mat=50;const w=ZH.Wd.wallAt(ZH.world,p.x,p.y);ZH.tryWall(p.x,p.y,'wood');const wall=!!ZH.Wd.wallAt(ZH.world,p.x,p.y);
      const sv=JSON.parse(ZH.serialize()).S.posts;const m=S.mat;ZH.removePost(S.posts[1]);return {wall,saved:sv.length,refund:S.mat-m,left:S.posts.length}}""")
    t.ok(not r['wall'], 'a wall cannot be built on a guard post')
    t.ok(r['saved'] == 2 and r['refund'] == 1 and r['left'] == 1, f"posts are saved; removing one gives a part back {r}")
    r = await pg.evaluate("""()=>{ZH.showPost(ZH.S.posts[0]);document.querySelector('[data-ps="all"]').click();const s=ZH.S.posts[0].sched;const h=document.getElementById('ib').innerHTML;ZH.closeP();return {s,txt:h.includes('25% farther')&&h.includes('Zombies within')}}""")
    t.ok(r['s'] == 'all' and r['txt'], f"the post panel explains the effects and sets the watch {r}")
    t.ok(not errs, f'no page errors {errs[:1]}'); await ctx.close()

async def t_replay(br, port, t):   # V2.46: starts, difficulty, legacy goals, the ending
    base = f'http://127.0.0.1:{port}/index.html'
    ctx = await br.new_context(viewport={'width': 390, 'height': 844}); pg = await ctx.new_page(); errs = []; pg.on('pageerror', lambda e: errs.append(str(e)))
    want = {'camp': (3, 4, 30), 'farm': (4, 3, 14), 'scrap': (3, 4, 70), 'lone': (1, 2, 25)}
    for st, (nb, ns, mat) in want.items():
        await ctx.close(); ctx = await br.new_context(viewport={'width': 390, 'height': 844}); pg = await ctx.new_page(); pg.on('pageerror', lambda e: errs.append(str(e)))
        await pg.goto(f'{base}?test=r{st}&start={st}'); await pg.wait_for_function('window.ZH && ZH.S && ZH.S.sv.length>0')
        r = await pg.evaluate("()=>({b:ZH.world.buildings.length,s:ZH.S.sv.length,m:ZH.S.mat,st:ZH.S.start})")
        t.ok(r['b'] == nb and r['s'] == ns and r['m'] == mat and r['st'] == st, f"start '{st}' sets up its town {r}")
    await ctx.close(); ctx = await br.new_context(viewport={'width': 390, 'height': 844}); pg = await ctx.new_page(); pg.on('pageerror', lambda e: errs.append(str(e)))
    await pg.goto(f'{base}?test=rdiff'); await pg.wait_for_function('window.ZH && ZH.S && ZH.S.sv.length>0')
    r = await pg.evaluate("""()=>{const S=ZH.S,o={};const sp=(d)=>{S.diff=d;ZH.spawn(5,3,'walker');return S.z[S.z.length-1]};const n=sp('normal'),h=sp('hard'),e=sp('easy');o.hp=[e.hp/n.hp,h.hp/n.hp];o.pw=[e.pw/n.pw,h.pw/n.pw];
      const b=ZH.world.buildings[0];S.diff='normal';const u0=ZH.upkeepTotal(),bl0=ZH.bleedMax();S.diff='hard';o.up=ZH.upkeepTotal()/u0;o.bl=ZH.bleedMax()/bl0;S.diff='normal';const sc0=ZH.scoreOf();S.diff='hard';o.sc=ZH.scoreOf()/sc0;S.diff='normal';return o}""")
    t.ok(abs(r['hp'][0] - .75) < .05 and abs(r['hp'][1] - 1.25) < .05 and abs(r['pw'][1] - 1.25) < .01, f"difficulty scales zombie health and damage {r['hp']} {r['pw']}")
    t.ok(abs(r['up'] - 1.25) < .01 and abs(r['bl'] - .8) < .01 and abs(r['sc'] - 1.6) < .02, f"hard costs more upkeep, bleeds out sooner and scores ×1.6 {r}")
    r = await pg.evaluate("""()=>{const S=ZH.S;S.diff='hard';S.start='scrap';const d=JSON.parse(ZH.serialize());delete d.S.diff;delete d.S.start;delete d.S.legacy;localStorage.setItem('zombieHavenV26',JSON.stringify(d));const o=Storage.prototype.setItem;Storage.prototype.setItem=function(k,v){if(k.startsWith('zombieHavenV26'))return;return o.call(this,k,v)};return 1}""")
    await pg.goto(f'{base}?test=rold'); await pg.wait_for_function('window.ZH && ZH.S && ZH.S.sv.length>0')
    r = await pg.evaluate("()=>[ZH.S.diff,ZH.S.start]")
    t.ok(r == ['normal', 'camp'], f'an older save plays as Survivor difficulty from the Roadside Camp {r}')
    r = await pg.evaluate("""()=>{const S=ZH.S;S.legacy={};S.day=31;const m=S.mat,ren=S.ren;ZH.legacyCheck();return {month:S.legacy.month,mat:S.mat-m,ren:S.ren-ren,ready:ZH.signalReady()}}""")
    t.ok(r['month'] == 31 and r['mat'] >= 10 and r['ren'] >= 15 and not r['ready'], f"a legacy goal pays out once and the signal still needs ★5 {r}")
    r = await pg.evaluate("""()=>{const S=ZH.S;localStorage.removeItem('zhRecords');S.rank=5;S.legacy={month:1,town:1,land:1,giants:1};const ready=ZH.signalReady();ZH.startFinale();const f=!!S.finale;S.hour=21;const z0=S.z.length;ZH.eventSchedule&&0;return {ready,f}}""")
    t.ok(r['ready'] and r['f'], f"at ★5 with 4 legacy goals the convoy can be called {r}")
    r = await pg.evaluate("""()=>{const S=ZH.S;S.z.length=0;let mobs=0;for(let n=1;n<=3;n++){S.finale.night=n-1;S.hour=21;ZH.finaleTest();mobs=Math.max(mobs,S.z.filter(z=>z.mob).length)}const boss=S.z.some(z=>z.type==='boss');S.hour=6;ZH.finaleTest();
      return {mobs,boss,won:!!S.won,score:S.won&&S.won.score,rec:JSON.parse(localStorage.getItem('zhRecords')||'{}')}}""")
    t.ok(r['mobs'] >= 10 and r['boss'], f"the final stand sends growing hordes and a boss on the last night {r['mobs']} {r['boss']}")
    t.ok(r['won'] and r['score'] > 0 and 'camp/normal' in r['rec'], f"surviving the third night wins, scores and records the best {r}")
    t.ok(not errs, f'no page errors {errs[:1]}'); await ctx.close()
    ctx = await br.new_context(viewport={'width': 320, 'height': 568}, device_scale_factor=2, is_mobile=True, has_touch=True); pg = await ctx.new_page(); errs = []; pg.on('pageerror', lambda e: errs.append(str(e)))
    await pg.goto(base); await pg.wait_for_selector('#title', state='visible'); await pg.click('#tStart'); await pg.click('.slot[data-i="2"]')
    await pg.click('[data-st="farm"]'); await pg.click('[data-df="easy"]'); sw = await pg.evaluate("()=>document.documentElement.scrollWidth"); await pg.fill('#sName', 'Hayfield'); await pg.click('#sGo')
    await pg.wait_for_function('window.ZH && ZH.S && ZH.S.sv.length>0'); await pg.wait_for_timeout(300)
    r = await pg.evaluate("()=>{ZH.saveGame();return [ZH.S.start,ZH.S.diff,ZH.S.townName,ZH.SLOT]}")
    t.ok(r == ['farm', 'easy', 'Hayfield', 3] and sw <= 320, f"the new-game screen sets the name, start and difficulty and fits 320 px {r} {sw}")
    t.ok(not errs, f'no page errors {errs[:1]}'); await ctx.close()

async def t_rotate(br, port, t):   # V2.47: buildings can be turned so the entrance faces the other wall
    ctx, pg, errs = await open_game(br, port, 'rotate')
    r = await pg.evaluate("""()=>{const S=ZH.S,Wd=ZH.Wd;S.mat=300;ZH.startTool({kind:'building',type:'canteen'});let sp=null;const rb=document.getElementById('rotBuild');
      for(let y=Wd.BUILD.y0;y<=Wd.BUILD.y1&&!sp;y++)for(let x=Wd.BUILD.x0;x<=Wd.BUILD.x1&&!sp;x++){ZH.updatePreview(x,y);const ok1=ZH.preview.ok;rb.click();const ok2=ZH.preview.ok;rb.click();if(ok1&&ok2)sp=[x,y]}
      ZH.updatePreview(sp[0],sp[1]);const p0={...ZH.preview};rb.click();const p1={...ZH.preview};ZH.confirmPreview();const b=ZH.world.buildings[ZH.world.buildings.length-1];
      const d=Wd.doorPoint(b),a=Wd.approachTile(b);const path=!!Wd.findPath(ZH.world,{x:7,y:10},a);
      const rect=ZH.spriteRect(b),hit=ZH.hitBuilding(rect.anchor.x,rect.anchor.y-rect.h*.3);
      return {vis:getComputedStyle(rb).display,p0:[p0.w,p0.h],p1:[p1.w,p1.h,p1.rot],b:[b.rot,b.w,b.h],door:[d.x-b.x,d.y-b.y],app:[a.x-b.x,a.y-b.y],path,hit:hit===b}}""")
    t.ok(r['vis'] != 'none' and r['p0'] == [2, 1] and r['p1'] == [1, 2, 1], f"the ↻ button turns the building while placing it (footprint 2×1 → 1×2) {r}")
    t.ok(r['b'] == [1, 1, 2] and abs(r['door'][0] - .65) < 1e-6 and r['door'][1] == 1 and r['app'] == [1, 1], f"a turned building has its entrance on the other wall {r}")
    t.ok(r['path'] and r['hit'], f"the new entrance is reachable and the mirrored sprite can be tapped {r}")
    r = await pg.evaluate("""()=>{const d=JSON.parse(ZH.serialize());return d.buildings.filter(b=>b.rot).length}""")
    save = await pg.evaluate("()=>{ZH.saveGame();return localStorage.getItem('zombieHavenV26')}"); await ctx.close()
    ctx, pg, errs2 = await open_game(br, port, 'rotate2', init=f"if(!sessionStorage.getItem('x')){{sessionStorage.setItem('x',1);localStorage.setItem('zombieHavenV26',{json.dumps(save)})}}")
    r2 = await pg.evaluate("()=>ZH.world.buildings.filter(b=>b.rot).map(b=>[b.type,b.w,b.h])")
    t.ok(r == 1 and r2 == [['canteen', 1, 2]], f"turned buildings are saved and load turned {r} {r2}")
    r = await pg.evaluate("""()=>{const b=ZH.world.buildings.find(q=>q.rot);ZH.moveBuilding(b);const rot=ZH.sel.rot;ZH.endBuildMode(true);return rot}""")
    t.ok(r == 1, 'moving a turned building keeps its direction')
    r = await pg.evaluate("()=>{ZH.unitPanel(ZH.S.sv[0]);const ib=document.getElementById('ib'),n=ib.querySelectorAll('[data-si]').length,t=ib.innerText;ZH.closeP();return {n,why:(t.match(/Why:/g)||[]).length,hunger:(t.match(/Hunger/g)||[]).length}}")
    t.ok(r['n'] >= 9 and r['why'] == 0 and r['hunger'] <= 1, f"the survivor panel shows needs and stats once, as icons, without a repeated Why line {r}")
    t.ok(not errs and not errs2, f'no page errors {(errs + errs2)[:1]}'); await ctx.close()

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
    await pg.wait_for_timeout(50)
    t.ok(await pg.evaluate("()=>ZH.alerts.has('breach4,5')"), 'an unrepaired breach is still flagged after loading')
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

async def t_hd(br, port, t):   # V2.50: HD (V8) art preview behind ?hd=1 — PixelLab farmer, HD medical tent
    ctx, pg, errs = await open_game(br, port, 'hd', init="localStorage.setItem('zhHD','1')")
    await pg.wait_for_function('window.ZHChars && ZHChars.ready && ZHChars.hdSheets.length > 0', timeout=15000)
    r = await pg.evaluate("""()=>{const S=ZH.S,a=S.sv[0];a.job='Farmer';a.look={sex:'m',skin:0,hair:0};const sh=ZHChars.sheetFor(a),D=ZHChars.dims(sh);
      const out={hd:ZHChars.hdSheets,tag:sh.zhTag,res:D.res,walk:ZHChars.count('walk',sh),idle:ZHChars.count('idle',sh),w:sh.naturalWidth,frames:Object.values(D.frames).reduce((t,f)=>t+f[1],0),wp:D.wpose.length,hands:D.hands[0].length+D.hands[1].length};
      out.portrait=(ZHChars.portrait(a)||'').slice(0,22);
      const modes=[['walk',{moving:true}],['wait',{}],['attack',{stateTicks:2}],['recover',{stateTicks:30,recDur:40}],['down',{}],['work',{}]];
      for(const [m,o] of modes){a.mode=m;Object.assign(a,o);a.eq={weapon:'pipe'};for(let k=0;k<8;k++){ZH.step(1);ZH.draw();}}
      a.mode='wait';a.moving=false;a.carriedLoot=true;ZH.draw();a.carriedLoot=false;
      const b=ZH.world.buildings.find(q=>q.type==='medic'),r=b&&ZH.spriteRect(b);out.tent=b?[r.w/r.s,Math.round(r.w/(ZH.TWs()/96))]:null;return out}""")
    t.ok(r['hd'] == ['farm_m'] and r['tag'] == 'farm_m' and r['res'] == 2, f"?hd=1 loads the HD farmer sheet {r}")
    t.ok(r['walk'] == 6 and r['idle'] == 2 and r['frames'] == 27 and r['w'] == 27 * 128 and r['wp'] == 27 and r['hands'] == 54, f"the HD sheet has its own frame table (walk 6, 27 frames) with hand points and weapon poses {r}")
    t.ok(r['portrait'].startswith('data:image/png'), f"the HD farmer has a portrait {r['portrait']}")
    t.ok(r['tent'] and r['tent'][0] == 192 and 92 <= r['tent'][1] <= 98, f"the HD medical tent covers the same footprint as the V7 one (192 HD px = ~96 V7 px) {r['tent']}")
    r = await pg.evaluate("()=>{const c=ZH.groundChunks;ZH.world.roads.add('6,6');const n=ZH.buildGround();ZH.world.roads.delete('6,6');ZH.buildGround();return {gr:ZH.GR,n:c.length,max:Math.max(...c.map(q=>q.width*q.height)),w:c.reduce((t,q,i)=>t+(i<4?q.width:0),0),part:n}}")
    t.ok(r['gr'] == 2 and r['n'] == 16 and r['max'] < 16.7e6 and r['w'] == 2 * 58 * 48 and 1 <= r['part'] <= 4, f"HD ground: 2 px per V7 px in 16 chunks (each under Safari's canvas limit); a new road only redraws the chunks around it {r}")
    t.ok(not errs, f'no page errors while the HD farmer walks, idles, fights, falls and works {errs[:1]}'); await ctx.close()
    ctx, pg, errs = await open_game(br, port, 'hd0')
    r = await pg.evaluate("()=>[ZHChars.hdSheets.length, window.ZH_HD, ZH.GR, ZH.groundChunks.length]")
    t.ok(r == [0, False, 1, 1], f"without ?hd=1 the game uses the current art and ground only {r}"); await ctx.close()

TESTS = [('boot', t_boot), ('geometry', t_geometry), ('alerts', t_alerts), ('objectives', t_objectives), ('economy', t_economy), ('living', t_living), ('combat', t_combat), ('polish', t_polish), ('input', t_input_staff), ('title', t_title), ('menu', t_menu), ('saves', t_saves), ('traits', t_traits), ('expchoices', t_expchoices), ('posts', t_posts), ('replay', t_replay), ('rotate', t_rotate), ('hd', t_hd), ('save_load', t_save_load), ('old_save', t_old_save), ('guide', t_guide), ('fire', t_fire), ('rush', t_rush), ('trader', t_trader),
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
