"""Load a backup written by long_study.py into the headless game and run a JS probe on it.
    python3 tools/balance/load_probe.py BACKUP.json 'JS arrow function'   (AP, the bot, is installed; the clock and dice are as in long_study)"""
import asyncio, sys, os, json
sys.path.insert(0, os.path.join(os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__)))), 'tests'))
import run_tests as R
R.ROOT = os.environ.get('ZROOT', R.ROOT)
from playwright.async_api import async_playwright
AP = open(os.path.join(R.ROOT, 'tools', 'balance', 'ap.js')).read()
async def main():
    bak = json.load(open(sys.argv[1])); save = json.dumps({**bak.get('save', bak), 'sid': 'import'})
    init = "try{if(!sessionStorage.getItem('zhPut')){localStorage.setItem('zombieHavenR1'," + json.dumps(save) + ");localStorage.setItem('zhSlot','1');sessionStorage.setItem('zhPut','1');}}catch(e){}"
    srv, port = R.serve()
    async with async_playwright() as p:
        br = await p.chromium.launch(); ctx = await br.new_context(viewport={'width': 390, 'height': 844}); await ctx.add_init_script(init); pg = await ctx.new_page(); errs = []
        pg.on('pageerror', lambda e: errs.append(str(e)))
        await pg.goto(f'http://127.0.0.1:{port}/index.html?play=1&nocut=1'); await pg.wait_for_function('window.ZH && ZH.S && ZH.S.sv.length > 0', timeout=30000)
        await pg.evaluate("()=>{window.requestAnimationFrame=()=>0}")
        await pg.evaluate("""()=>{let x=7;Math.random=()=>{x=(x*1103515245+12345)%2147483648;return x/2147483648};const b0=Date.now();const t0=ZH.tick;Date.now=()=>b0+(ZH.tick-t0)*1000/60;const q=[];window.setTimeout=(fn,ms,...a)=>{q.push({t:ZH.tick+Math.ceil((ms||0)*60/1000),fn,a});return q.length;};window.__flushTimers=()=>{for(let i=0;i<q.length;i++){const e=q[i];if(e&&e.t<=ZH.tick){q[i]=null;try{e.fn(...e.a);}catch(err){}}}};}""")
        await pg.evaluate(AP); await pg.evaluate("()=>{AP.exp=true}")
        print(json.dumps(await pg.evaluate(sys.argv[2]), indent=1)[:6000]); print('errs', errs[:3]); await br.close()
asyncio.run(main())
