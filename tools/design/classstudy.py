"""Class study (Nov 8): more professions, higher tiers, and two-profession combos ("hybrids").

    python3 tools/design/classstudy.py [N]     # N towns per scenario (default 100); writes out/classstudy.json

Model on top of havensim:
  * Every person keeps a level (1-10) in each profession they have worked (as the game does). XP per day of work:
    1 (fighters +0.5 on nights they fight). Levels 1-4 take 3 game days each, 5-9 longer (3 x (1 + .6 x (L-4))):
    level 5 after ~12 game days, level 8 after ~32, level 10 after ~54 in one job.
  * Work quality follows the worker's level in that job: levels 1-4 at 85%, 5+ at 100% (applies to every variant).
  * Tier 2, Specialist (one path per profession, e.g. Guard -> SWAT, Medic -> Surgeon, Farmer -> Agronomist):
    level 5 in the job + the Haven at TIER2_AT, costs 8 scrap + 4 cloth. Work x1.25 in that job, fighters x1.2 power.
  * Tier 3, Hybrid (a combo of two professions, e.g. Guard + Medic = Combat Medic): level 8 in two jobs (so they must
    retrain, working a new job at low level for a while) + the Haven at TIER3_AT, costs 16 scrap + 6 cloth + 2 meds.
    A hybrid counts as a worker for BOTH jobs, and the pair adds a town-wide perk (capped at 2 of each combo).
Variants: none (levels only), specialists only, specialists + hybrids, hybrids only; gating and XP speed.
"""
import sys, os, json, statistics as st, time, math
from collections import Counter
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import havensim as H

N = int(sys.argv[1]) if len(sys.argv) > 1 else 100
OUT = os.path.join(os.path.dirname(os.path.abspath(__file__)), 'out'); os.makedirs(OUT, exist_ok=True)

SPEC = {'Guard': 'SWAT', 'Police Officer': 'Marksman', 'Scavenger': 'Ranger', 'Medic': 'Surgeon', 'Engineer': 'Architect', 'Farmer': 'Agronomist', 'Cook': 'Quartermaster', 'Civilian': 'Leader'}
HYB = {   # pair -> (name, perk)
    frozenset(('Guard', 'Medic')): ('Combat Medic', 'care'),          # fights; a downed friend near them is far less likely to die
    frozenset(('Guard', 'Engineer')): ('Fortifier', 'walls'),         # walls +30%
    frozenset(('Scavenger', 'Guard')): ('Pathfinder', 'mission'),     # squads +15% power, safer trips
    frozenset(('Scavenger', 'Engineer')): ('Salvager', 'scrap'),      # scrap +20%
    frozenset(('Farmer', 'Cook')): ('Homesteader', 'food'),           # food +15%, rations stretch further
    frozenset(('Farmer', 'Medic')): ('Herbalist', 'meds'),            # a little medicine every day
    frozenset(('Police Officer', 'Scavenger')): ('Tracker', 'mission'),
    frozenset(('Medic', 'Cook')): ('Caretaker', 'morale'),            # morale +, faster recovery
}
LV_DAYS = lambda L: 3 if L < 5 else 3 * (1 + .6 * (L - 4))


class PersonC(H.Person):
    __slots__ = ('cl', 'cx', 'tier', 'pair', 'base')
    def __init__(s, job, lvl=1):
        super().__init__(job, lvl); s.cl = Counter({job: 1 + (lvl > 1)}); s.cx = Counter(); s.tier = 1; s.pair = None; s.base = None
    def power(s):
        m = 1.2 if s.tier >= 2 and (s.base or s.job) in H.FIGHTERS else 1
        if s.pair and s.pair & H.FIGHTERS: m *= 1.1
        return super().power() * m


class TownC(H.Town):
    def __init__(s, *a, V=None, **k):
        H.Person = PersonC
        super().__init__(*a, **k)
        s.V = {**dict(T2=True, T3=True, TIER2_AT=4, TIER3_AT=9, XP=1.0, T3_LV=10, HYB_CAP=3, T2_CAP=0, HYB_K=1.0), **(V or {})}
        s.promos = []

    # ---- quality follows the level in the job; specialists and hybrids
    def staffed(s, k):
        job = H.B[k]['job']
        if not job: return s.bld[k], 1.0
        pool = [p for p in s.home() if not p.wounded]
        want = s.bld[k]
        jobs_need = sum(s.bld[x] for x in H.B if H.B[x]['job'] == job)
        workers = [p for p in pool if p.job == job or (p.pair and job in p.pair)]
        good = min(want, int(len(workers) * want / max(1, jobs_need) + .5))
        rest = want - good
        civ = min(rest, sum(1 for p in pool if p.job == 'Civilian') // 2)
        if workers:
            lvq = sum((1.0 if p.cl[job] >= 5 else .85) * (1.25 if p.tier >= 2 and (p.base or p.job) == job else 1) * (.9 if p.pair and p.job != job and s.V['HYB_K'] <= 1 else 1) for p in workers) / len(workers)
        else: lvq = 1
        q = (good * 1.5 * lvq + civ * 1.25) / max(1, want)
        return good + civ, q

    def perks(s):
        c = Counter(HYB[p.pair][1] for p in s.alive() if p.pair in HYB)
        return {k: min(2, v) * s.V['HYB_K'] for k, v in c.items()}

    def produce(s):
        before = dict(s.res); short = super().produce(); pk = s.perks()
        for perk, res, f in (('scrap', 'scrap', .2), ('food', 'food', .15)):
            if pk.get(perk): s.res[res] += max(0, s.res[res] - before[res] + len(s.home()) * (s.T['EAT'] if res == 'food' else 0)) * f * pk[perk] / 2
        if pk.get('meds'): s.res['meds'] += .3 * pk['meds']
        if pk.get('morale'): s.morale = min(100, s.morale + .8 * pk['morale'])
        return short

    def casualties(s, downs, care=True, why='night'):
        pk = s.perks()
        if pk.get('care'):
            dl = s.T['DIE_BASE']; s.T['DIE_BASE'] = dl * (1 - .15 * pk['care'])
            try: return super().casualties(downs, care, why)
            finally: s.T['DIE_BASE'] = dl
        return super().casualties(downs, care, why)

    def night(s):
        pk = s.perks()
        if pk.get('walls'):
            w = s.bld['walls']; s.bld['walls'] = int(w * (1 + .15 * pk['walls']) + .5)
            try: return super().night()
            finally: s.bld['walls'] = w
        return super().night()

    def run_mission(s, k, sq, power):
        pk = s.perks()
        return super().run_mission(k, sq, power * (1 + .075 * pk.get('mission', 0)))

    # ---- class XP, promotions and retraining (the player's choices)
    def classes(s):
        for p in s.alive():
            if p.away: continue
            p.cx[p.job] += s.V['XP'] * (1.5 if p.job in H.FIGHTERS else 1)
            while p.cl[p.job] < 10 and p.cx[p.job] >= LV_DAYS(p.cl[p.job]):
                p.cx[p.job] -= LV_DAYS(p.cl[p.job]); p.cl[p.job] += 1
                if p.cl[p.job] in (5, 10): s.celebrate(f'{id(p)} {p.job} L{p.cl[p.job]}')
        if s.skill == 'idle': return
        act = s.r.random() < s.q['actions']
        for p in s.alive():
            if p.away or p.wounded: continue
            # tier 2: specialist in the job they know
            if s.V['T2'] and act and p.tier == 1 and p.job in SPEC and p.cl[p.job] >= 5 and s.level >= s.V['TIER2_AT'] and (not s.V['T2_CAP'] or sum(1 for q in s.alive() if q.tier == 2) < s.V['T2_CAP'] + s.level // 2):
                if s.res['scrap'] >= 8 + 6 and s.res['cloth'] >= 4 and s.r.random() < s.q['build']:
                    s.res['scrap'] -= 8; s.res['cloth'] -= 4; p.tier = 2; p.base = p.job; s.promos.append((s.day, 2)); s.celebrate(f'{id(p)} tier2')
            # tier 3: retrain a level-8 person into a partner job, then make them a hybrid
            if not s.V['T3'] or p.pair or s.level < s.V['TIER3_AT'] - 2: continue
            mine = p.base or p.job
            if p.job == mine and p.cl[mine] >= s.V['T3_LV'] and s.hyb_room() and (p.tier >= 2 or not s.V['T2']) and act and s.r.random() < s.q['assign'] * .5:
                partners = [next(iter(pr - {mine})) for pr in HYB if mine in pr and len(pr) == 2]
                have = Counter(HYB[q.pair][0] for q in s.alive() if q.pair)
                partners = [j for j in partners if have[HYB[frozenset((mine, j))][0]] < 2]
                if partners:
                    p.base = mine; p.job = s.r.choice(partners) if s.q['assign'] < .7 else max(partners, key=lambda j: s.need_of(j))
            elif p.base and p.job != p.base and p.cl[p.job] >= s.V['T3_LV'] and p.cl[p.base] >= s.V['T3_LV'] and s.level >= s.V['TIER3_AT'] and s.hyb_room() and sum(1 for q in s.alive() if q.pair == frozenset((p.base, p.job))) < 2:
                if s.res['scrap'] >= 16 + 6 and s.res['cloth'] >= 6 and s.res['meds'] >= 2 and s.r.random() < s.q['build']:
                    s.res['scrap'] -= 16; s.res['cloth'] -= 6; s.res['meds'] -= 2
                    p.pair = frozenset((p.base, p.job)); p.tier = 3; p.job = p.base; s.promos.append((s.day, 3)); s.celebrate(f'{id(p)} tier3')

    def hyb_room(s):   # hybrids are the town's elite: 1 per HYB_CAP Haven levels (5 at level 15 with the default 3)
        return sum(1 for q in s.alive() if q.pair) < max(1, s.level // s.V['HYB_CAP'])

    def need_of(s, job):
        need = sum(s.bld[k] for k in H.B if H.B[k]['job'] == job)
        have = sum(1 for p in s.alive() if p.job == job or (p.pair and job in p.pair))
        return need - have + (2 if job in H.FIGHTERS else 0)

    def assign_jobs(s):
        keep = {id(p): p.job for p in s.alive() if p.base or p.tier > 1}
        super().assign_jobs()
        for p in s.alive():   # the town's auto-assign leaves specialists, hybrids and retraining people alone
            if id(p) in keep: p.job = keep[id(p)]

    def step(s):
        ok = super().step(); s.classes(); return ok

    def run(s):
        r = super().run()
        dpr = s.T['DAYS_PER_REAL']
        rd = lambda d: (d - 1) // dpr + 1
        t2 = [rd(d) for d, t in s.promos if t == 2]; t3 = [rd(d) for d, t in s.promos if t == 3]
        r.update(t2_first=min(t2) if t2 else None, t3_first=min(t3) if t3 else None, t2_n=sum(1 for p in s.alive() if p.tier == 2), t3_n=sum(1 for p in s.alive() if p.tier == 3),
                 combos=Counter(HYB[p.pair][0] for p in s.alive() if p.pair in HYB),
                 promo_late=sum(1 for d, t in s.promos if 90 < rd(d) <= 180), cele_late=sum(1 for d, w in s.cele if 90 < rd(d) <= 180),
                 cele_mid=sum(1 for d, w in s.cele if 30 < rd(d) <= 90))
        H.Person = PersonC.__mro__[1]
        return r


R = {}
t0 = time.time()
def run(name, skill, V, days=180, n=N, style='balanced'):
    H.T['REAL_DAYS'] = days
    rs = [TownC(style, skill, 4000 + i, None, None, V=V).run() for i in range(n)]
    m = H.summ(rs)
    for k in ('t2_n', 't3_n', 'promo_late', 'cele_late', 'cele_mid'): m[k] = round(st.mean(r[k] for r in rs), 2)
    for k in ('t2_first', 't3_first'):
        v = [r[k] for r in rs if r[k] is not None]; m[k] = (st.median(v) if v else None, round(len(v) / len(rs), 2))
    cc = Counter()
    for r in rs: cc.update(r['combos'])
    tot = sum(cc.values()) or 1; m['combos'] = {k: round(v / tot, 2) for k, v in cc.most_common()}
    m['cele_late_per_day'] = round(m['cele_late'] / 90, 2); m['cele_mid_per_day'] = round(m['cele_mid'] / 60, 2)
    R[name] = m
    print(f"{name:30} score {m['score']:6.0f} pop {m['pop']:5.1f} lvl {m['lvl']:4.1f} dead {m['dead']:4.1f} | T2 first {m['t2_first']} n {m['t2_n']} | T3 first {m['t3_first']} n {m['t3_n']} | cele/day 31-90 {m['cele_mid_per_day']} 91-180 {m['cele_late_per_day']} | top combos {list(m['combos'].items())[:3]}", flush=True)


if __name__ == '__main__':
    base = dict(T2=False, T3=False)
    for sk in ('smart', 'good', 'casual'):
        run(f'none/{sk}', sk, base)
        run(f'spec/{sk}', sk, dict(T2=True, T3=False))
        run(f'spec+hybrid/{sk}', sk, dict(T2=True, T3=True))
        run(f'hybrid-only/{sk}', sk, dict(T2=False, T3=True))
    for cap in (2, 5): run(f'hybcap/1per{cap}levels/smart', 'smart', dict(T2=True, T3=True, HYB_CAP=cap))
    run('t3lv8/smart', 'smart', dict(T2=True, T3=True, T3_LV=8))
    for t2, t3 in ((2, 6), (6, 12)): run(f'gate/T2@L{t2}-T3@L{t3}/smart', 'smart', dict(T2=True, T3=True, TIER2_AT=t2, TIER3_AT=t3))
    for xp in (.5, 2.0): run(f'xp{xp}/spec+hybrid/smart', 'smart', dict(T2=True, T3=True, XP=xp))
    for stl in ('warlord', 'builder'): run(f'style/{stl}/spec+hybrid', 'smart', dict(T2=True, T3=True), style=stl)
    json.dump(R, open(os.path.join(OUT, 'classstudy.json'), 'w'), indent=1, default=str)
    print(f'done in {time.time() - t0:.0f}s')
