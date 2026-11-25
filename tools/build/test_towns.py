"""Test towns (W274, 25 Nov 2026): ready-made towns at levels 3, 5, 9, 12, 15, 17 and 20 for the title screen's Test towns.

    python3 tools/build/test_towns.py make [WORK_DIR]   play three bot towns up to level 20 and pick (about 1 to 2 hours; the 25 Nov towns: seed 5 reached level 20 on game day 233)
    python3 tools/build/test_towns.py pick WORK_DIR     only pick from towns already played into WORK_DIR

The balance bot (tools/balance/long_study.py) plays each town as an open-game player; FAST_LVL=1 skips the wait for a level once it
is started (people, buildings and Banners are still earned by playing), ASSIST_BUILD=1 starts one cheap building when the bot's
plan has run out and only "Buildings standing" is missing (it stalls at about 33 at level 12 otherwise), SAVE_LVLS keeps the town the first time it reaches each level.
For each level the town with the most people standing is kept as assets/testtowns/L<level>.json, and assets/testtowns/index.json lists
them with the build they were made with. Run `make` again when a build changes saves in a way old towns can't load (old saves are
converted on load, so most builds don't need it). The game is not changed."""
import json, os, subprocess, sys, time

ROOT = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
LEVELS = [3, 5, 9, 12, 15, 17, 20]
SEEDS = [5, 7, 13]
OUT = os.path.join(ROOT, 'assets', 'testtowns')


def build_tag():
    s = open(os.path.join(ROOT, 'src', 'game', '01-core.js')).read()
    i = s.index("BUILD_TAG = '") + len("BUILD_TAG = '")
    return s[i:s.index("'", i)]


def make(work):
    os.makedirs(work, exist_ok=True)
    env = {**os.environ, 'FAST_LVL': '1', 'ASSIST_BUILD': '1', 'SAVE_LVLS': ','.join(map(str, LEVELS))}
    procs = [subprocess.Popen([sys.executable, os.path.join(ROOT, 'tools', 'balance', 'long_study.py'), str(sd), '400', '7200', work],
                              env=env, stdout=open(os.path.join(work, 'log%d.txt' % sd), 'w'), stderr=subprocess.STDOUT) for sd in SEEDS]
    for p in procs: p.wait()


def pick(work):
    os.makedirs(OUT, exist_ok=True)
    towns = []
    for lv in LEVELS:
        best = None
        for sd in SEEDS:
            f = os.path.join(work, 's%d_L%d.json' % (sd, lv))
            if not os.path.exists(f): continue
            o = json.load(open(f)); sv = o['save']; pop = len(sv.get('sv') or [])
            if not best or pop > best[0]: best = (pop, sd, o)
        if not best: print('no town reached level', lv); continue
        pop, sd, o = best; sv = o['save']; S = sv['S']
        name = 'L%d.json' % lv
        json.dump(o, open(os.path.join(OUT, name), 'w'), separators=(',', ':'))
        towns.append({'lvl': lv, 'file': name, 'day': S.get('day', 1), 'pop': pop, 'bld': len(sv.get('buildings') or []), 'seed': sd})
        print('level', lv, 'from seed', sd, 'day', S.get('day'), 'people', pop, 'buildings', len(sv.get('buildings') or []))
    json.dump({'build': build_tag(), 'made': time.strftime('%Y-%m-%d'), 'towns': towns}, open(os.path.join(OUT, 'index.json'), 'w'), indent=1)
    print('wrote', len(towns), 'towns to', OUT)


if __name__ == '__main__':
    cmd = sys.argv[1] if len(sys.argv) > 1 else 'make'
    work = sys.argv[2] if len(sys.argv) > 2 else '/tmp/zh-testtowns'
    if cmd == 'make': make(work)
    pick(work)
