import asyncio, sys, json, os
sys.path.insert(0, os.path.join(os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__)))), 'tests')); import run_tests as R; R.ROOT = os.environ.get('ZROOT', R.ROOT)
from playwright.async_api import async_playwright
D = os.path.dirname(os.path.abspath(__file__))
PROBE = open(os.path.join(D, 'probe.js')).read()
SETUP = """(opts)=>{const S=ZH.S;S.mat=200;S.wood=200;S.stone=60;S.food=S.water=40;
  window.__answer=()=>{for(let i=0;i<8;i++){const bs=[...document.querySelectorAll('#eventModal button')];if(!bs.length)break;bs[0].click();}};
  for(const j of opts.jobs)ZH.newcomer(j,2);return S.sv.map(s=>s.name+':'+s.job).join(', ')}"""
async def main():
    name, days = sys.argv[1], float(sys.argv[2]); opts = json.loads(sys.argv[3]) if len(sys.argv) > 3 else {}
    srv, port = R.serve()
    async with async_playwright() as p:
        br = await p.chromium.launch()
        ctx = await br.new_context(viewport={'width': 390, 'height': 844})
        pg = await ctx.new_page(); errs = []; pg.on('pageerror', lambda e: errs.append(str(e)))
        await pg.goto(f'http://127.0.0.1:{port}/index.html?test=study{name}&3d=1')
        await pg.wait_for_function('window.ZH && ZH.S && ZH.S.sv.length > 0', timeout=30000)
        await pg.evaluate("()=>{window.requestAnimationFrame=()=>0}")
        if opts.get('seed'): await pg.evaluate("(sd)=>{let x=sd;Math.random=()=>{x=(x*1103515245+12345)%2147483648;return x/2147483648}}", opts['seed'])
        for k in opts.get('build', ['barrel', 'farm', 'farm', 'canteen', 'scrapyard', 'medic', 'tent', 'tent', 'tent', 'bench', 'lumber', 'bonfire', 'crates']):
            await pg.evaluate(R.PLACE, k)
        roster = await pg.evaluate(SETUP, {'jobs': opts.get('jobs', ['Engineer', 'Cook', 'Farmer', 'Scavenger'])})
        await pg.evaluate(PROBE)
        st = await pg.evaluate("([d,o])=>PR.run(d,o)", [days, opts])
        st['roster'] = roster; st['errs'] = errs[:3]
        json.dump(st, open(os.path.join(D, f'out_{name}.json'), 'w'), indent=1)
        print('done', name, 'samples', st['samples'], 'fallen', st['fallen'], 'errs', errs[:2])
        await br.close()
asyncio.run(main())
