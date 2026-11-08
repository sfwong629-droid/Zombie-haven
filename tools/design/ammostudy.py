"""Ammo and power study: guns need ammo (no unlimited rounds); the best ammo and guns need power.

    python3 tools/design/ammostudy.py [N]     # writes out/ammostudy.json

Model (on top of buildstudy's full catalogue):
  * Guns carry a growing share of a town's fighting as it levels: gun share = min(.65, .05 x level).
  * Each night the guns fire ~AMMO_PER_Z rounds per zombie of their share. Short of ammo, that share fights at melee strength (x.4).
    Fully supplied, guns hit harder than today's flat model (x1.25), and powered Gunsmith guns add x1.15 on top.
  * Ammo comes from: Ammo Bench (level 3, no power, slow: 6 rounds/worker/day for 1.5 scrap),
    Ammo Factory (level 6, needs 2 power: 20 rounds/worker/day for 3 scrap), missions (police 30, military 60, prison 25, mall 8), raider drops.
  * Gunsmith (level 8, needs 2 power): advanced guns.
Scenarios: unlimited ammo (today) vs limited, and bans of the Generator, the Factory and the Gunsmith, at 30 and 120 real days.
"""
import sys, os, json, statistics as st, time
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
N = int(sys.argv[1]) if len(sys.argv) > 1 else 120
sys.argv = sys.argv[:1]
import buildstudy as S
H = S.H

AMMO_B = {
    'ammobench':   dict(cost=(6, 6, 0), job='Engineer', lvl=3, cat='gear'),
    'ammofactory': dict(cost=(18, 6, 10), job='Engineer', lvl=6, cat='gear', draw=2),
    'gunsmith':    dict(cost=(20, 8, 10), job=None, lvl=8, cat='gear', draw=2),
}
AMMO_LOOT = dict(police=30, military=60, prison=25, mall=8)
S.CATS['ammo'] = {**S.CATS['full'], **AMMO_B}


class TownA(S.Town2):
    def __init__(s, *a, **k):
        super().__init__(*a, **k)
        s.res['ammo'] = 20; s.ammo_short = 0; s.ammo_nights = 0

    def produce(s):
        short = super().produce()
        if s.X.get('AMMO') and s.cat == 'ammo':
            mw = 1 + s.T['MORALE_WORK'] * (s.morale - 50) / 100
            for k, rate, scrap in (('ammobench', 6, 1.5), ('ammofactory', 20, 3)):
                if not s.bld[k] or (k == 'ammofactory' and not s.on(k)): continue
                n, q = s.staffed(k); made = n * rate * q / 1.5 * mw; cost = made / rate * scrap
                if s.res['scrap'] < cost: made *= s.res['scrap'] / cost; cost = s.res['scrap']
                s.res['ammo'] += made; s.res['scrap'] -= cost
            s.res['ammo'] = min(s.res['ammo'], 200 + 100 * s.bld['storage'])
        return short

    def night(s):
        if not s.X.get('AMMO'): return super().night()
        boss = s.day % 6 == 5 and s.day >= 6
        horde = min(s.T['HORDE_BASE'] + s.T['HORDE_PER_DAY'] * s.day, s.T['HORDE_CAP0'] + s.T['HORDE_CAP_LVL'] * s.level) * ((1.4 if s.day < 30 else 1.8) if boss else 1)
        g = min(.65, .05 * s.level)
        need = horde * g * s.X.get('AMMO_PER_Z', 3)
        have = s.res['ammo']; r = 1 if need <= 0 else min(1, have / need); s.res['ammo'] = max(0, have - need)
        s.ammo_nights += 1
        if r < .999: s.ammo_short += 1
        gun = 1.25 * (1.15 if s.on('gunsmith') else 1)
        s._gunmult = (1 - g) + g * (r * gun + (1 - r) * .4)
        pw = H.Person.power
        H.Person.power = lambda p, pw=pw, m=s._gunmult: pw(p) * m
        try: super().night()
        finally: H.Person.power = pw

    def run_mission(s, k, sq, power):
        w0 = s.mwins[k.split(':')[0]]
        super().run_mission(k, sq, power)
        if s.X.get('AMMO') and s.mwins[k.split(':')[0]] > w0 and k in AMMO_LOOT: s.res['ammo'] += AMMO_LOOT[k]

    def priorities(s):
        pr = super().priorities()
        if s.cat != 'ammo' or not s.X.get('AMMO'): return pr
        g = min(.65, .05 * s.level); horde = min(s.T['HORDE_BASE'] + s.T['HORDE_PER_DAY'] * s.day, s.T['HORDE_CAP0'] + s.T['HORDE_CAP_LVL'] * s.level)
        nightly = horde * g * 3
        front = []
        if s.res['ammo'] < 3 * nightly and s.r.random() < s.q['build']:
            front = ['ammofactory', 'ammobench'] if s.level >= 6 else ['ammobench']
            if s.level >= 6 and not s.bld['generator'] and not s.bld['wind'] and not s.bld['solar']: front = ['generator'] + front
        add = ['gunsmith'] if s.level >= 8 else []
        n = len(pr) // 3
        return front + pr[:n] + add + pr[n:]

    def build_something(s):
        caps = dict(ammobench=2, ammofactory=2, gunsmith=1); saved = {}
        for k, c in caps.items():
            if k in H.B and s.bld[k] >= c: saved[k] = H.B[k]['lvl']; H.B[k]['lvl'] = 99
        try: super().build_something()
        finally:
            for k, v in saved.items(): H.B[k]['lvl'] = v

    def run(s):
        r = super().run(); r.update(ammo_short=s.ammo_short / max(1, s.ammo_nights), ammo_end=s.res['ammo']); return r


def batch(skill, n, X, ban=None, days=120):
    H.T['REAL_DAYS'] = days
    H.B.clear(); H.B.update({k: dict(v) for k, v in S.CATS['ammo'].items()})
    H.LOC.clear(); H.LOC.update({k: dict(v, loot=dict(v['loot'])) for k, v in S.LOC0.items()})
    H.LOC['gas'] = dict(kind='loot', diff=70, hours=3, loot=dict(scrap=6), rescue=.04); H.UNLOCK['gas'] = 3
    return [TownA('balanced', skill, 3000 + i, None, {'ban': ban or []}, cat='ammo', X=X).run() for i in range(n)]


R = {}
t0 = time.time()
def run(name, skill, X, ban=None, days=120, n=N):
    rs = batch(skill, n, X, ban, days); m = S.summ(rs)
    m['ammo_short'] = round(st.mean(r['ammo_short'] for r in rs), 2); m['ammo_end'] = round(st.mean(r['ammo_end'] for r in rs))
    R[name] = m
    print(f"{name:34} score {m['score']:6.0f} pop {m['pop']:5.1f} lvl {m['lvl']:4.1f} L15 {m['l15']} dead {m['dead']:4.1f} short-nights {m['ammo_short']:.2f} ammo-left {m['ammo_end']:4d} dark {m['blackout']:.2f} gen {m['bld_mean'].get('generator', 0)} fac {m['bld_mean'].get('ammofactory', 0)}", flush=True)


if __name__ == '__main__':
    for days in (30, 120):
        for sk in ('smart', 'good', 'casual'):
            run(f'{days}d/unlimited/{sk}', sk, dict(AMMO=0), days=days)
            run(f'{days}d/ammo/{sk}', sk, dict(AMMO=1), days=days)
            run(f'{days}d/ammo/no-generator/{sk}', sk, dict(AMMO=1), ban=['generator', 'wind', 'solar'], days=days)
        run(f'{days}d/ammo/no-factory/smart', 'smart', dict(AMMO=1), ban=['ammofactory'], days=days)
        run(f'{days}d/ammo/no-gunsmith/smart', 'smart', dict(AMMO=1), ban=['gunsmith'], days=days)
    for apz in (2, 4): run(f'120d/ammo-per-zombie{apz}/smart', 'smart', dict(AMMO=1, AMMO_PER_Z=apz))
    json.dump(R, open(os.path.join(S.OUT, 'ammostudy.json'), 'w'), indent=1, default=str)
    print(f'done in {time.time() - t0:.0f}s')
