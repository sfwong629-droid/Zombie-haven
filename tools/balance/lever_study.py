"""Rescue lever study (Nov 8): every death in long runs was a bleed-out. Compare levers with the in-game auto-players.
    python3 tools/balance/lever_study.py DAYS SEEDS PLAYERS LEVER[,LEVER...] LABEL
LEVER: base | hiders (hidden survivors come out to rescue when no zombie is within 3.5 tiles) | day (60% of the daytime zombies)
       | bleed (the downed hold on 50% longer) | combos joined with + (e.g. hiders+day)"""
import asyncio, sys, os, json
sys.path.insert(0, os.path.join(os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__)))), 'tests'))
import run_tests as R
from playwright.async_api import async_playwright
here = os.path.dirname(os.path.abspath(__file__))
src = open(os.path.join(here, 'skill_study.py')).read()
RUN = src.split('RUN = """', 1)[1].split('""" % json.dumps(CASUAL_OFF)')[0]
CASUAL_OFF = ['trays', 'events', 'finale', 'posts', 'exp', 'bandage', 'repair', 'jobs', 'research', 'tools', 'walls', 'territory', 'trader', 'radio', 'supply']
RUN = RUN % json.dumps(CASUAL_OFF)
AP = open(os.path.join(here, 'ap.js')).read()
KN = {'gate': {'gateWait': 1}, 'dawn': {'dawn': .8}, 'dawn5': {'dawn': .5}, 'old': {'hiders': 0, 'bleed': 1}, 'noceil': {'noCeil': 1}, 'base': {}, 'hiders': {'hiders': 1}, 'day': {'day': .6}, 'bleed': {'bleed': 1.5}}
async def one(br, port, seed, days, pl, lever):
    ctx, pg, errs = await R.open_game(br, port, 'lev%d' % seed)
    kn = {}
    for part in lever.split('+'): kn.update(KN[part])
    await pg.evaluate("(a)=>{const [sd,kn]=a;window.ZH_BAL=kn;let x=sd;Math.random=()=>{x=(x*1103515245+12345)%2147483648;return x/2147483648};const b0=Date.now();Date.now=()=>b0+ZH.tick*1000/60;}", [seed, kn])
    await pg.evaluate(AP); await pg.evaluate("()=>{AP.exp=true}")
    r = await pg.evaluate(RUN, [days, pl]); r['seed'] = seed; r['player'] = pl; r['lever'] = lever; r['errs'] = errs[:2]; await ctx.close(); return r
async def main():
    days = int(sys.argv[1]); seeds = [int(x) for x in sys.argv[2].split(',')]; pls = sys.argv[3].split(','); levers = sys.argv[4].split(','); label = sys.argv[5]
    srv, port = R.serve(); res = {}
    async with async_playwright() as p:
        br = await p.chromium.launch()
        for lv in levers:
            for pl in pls:
                k = lv + '/' + pl; res[k] = []
                for sd in seeds:
                    r = await one(br, port, sd, days, pl, lv); res[k].append(r)
                    print(f"{k:22} seed {sd}: fallen {r['fallen']} alive {r['alive']} peak {r['peakPop']} rank {r['rank']} nb {r['nb']} score {r['score']} errs {r['errs']}", flush=True)
                json.dump(res, open(os.path.join(here, f'lever_{label}.json'), 'w'))
    srv.shutdown()
asyncio.run(main())
