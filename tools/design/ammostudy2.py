"""Ammo study, round 2 (Nov 8): the Mechanic is back, and melee and crossbows never need ammo or power.

    python3 tools/design/ammostudy2.py [N]     # writes out/ammostudy2.json

Rules tested:
  * Fighters carry a weapon mix that shifts toward guns as the town levels: gun share = min(.6, .06 x level).
    Melee and crossbows (the rest) never use ammo or power.
  * Guns use about 3 rounds per zombie they face. Fully supplied they hit x1.3 (x1.5 with a powered Gunsmith's
    advanced guns); out of ammo, a gunner falls back to a crossbow or melee at x.55.
  * Ammo Bench: level 3, no power, 6 rounds per Mechanic a day (1.5 scrap). Ammo Factory: level 6, needs 2 power,
    25 rounds per Mechanic a day (3 scrap). Missions and raiders also drop ammo.
  * The Mechanic runs the Fuel Still, the Ammo Bench and Factory, and the Generator (a Mechanic on the generator
    cuts its fuel use by a quarter). Without a Mechanic these run at the civilian / wrong-job rate.
"""
import sys, os, json, statistics as st, time
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
N = int(sys.argv[1]) if len(sys.argv) > 1 else 100
sys.argv = sys.argv[:1]
import ammostudy as A
S, H = A.S, A.H

if 'Mechanic' not in H.JOBS: H.JOBS.append('Mechanic')
MECH_B = ('fueldepot', 'ammobench', 'ammofactory', 'generator')
for cat in ('ammo',):
    for k in MECH_B: S.CATS[cat][k] = dict(S.CATS[cat][k], job='Mechanic')


class TownM(A.TownA):
    def produce(s):
        gens = s.bld['generator']
        fuel0 = H.B['generator']['fuel']
        if gens and s.X.get('MECH', 1):
            n, q = s.staffed('generator'); H.B['generator']['fuel'] = fuel0 * (1 - .25 * n * min(1, q) / gens)
        try:
            # the base class staffs the generator like a job building; power should not depend on it, so count every generator
            short = super().produce()
        finally: H.B['generator']['fuel'] = fuel0
        return short

    def assign_jobs(s):
        super().assign_jobs()
        if not s.X.get('MECH', 1) or s.r.random() > s.q['assign']: return
        need = sum(s.bld[k] for k in MECH_B if k != 'generator') + min(1, s.bld['generator'])
        have = sum(1 for p in s.alive() if p.job == 'Mechanic')
        if have >= need: return
        pool = [p for p in s.home() if p.job == 'Civilian'] or [p for p in s.home() if p.job in ('Engineer', 'Scavenger') and sum(1 for q in s.alive() if q.job == p.job) > 2]
        for p in pool[:need - have]: p.job = 'Mechanic'

    def night(s):
        if not s.X.get('AMMO'): return A.S.Town2.night(s)
        boss = s.day % 6 == 5 and s.day >= 6
        horde = min(s.T['HORDE_BASE'] + s.T['HORDE_PER_DAY'] * s.day, s.T['HORDE_CAP0'] + s.T['HORDE_CAP_LVL'] * s.level) * ((1.4 if s.day < 30 else 1.8) if boss else 1)
        g = min(.6, .06 * s.level)
        need = horde * g * s.X.get('AMMO_PER_Z', 3)
        have = s.res['ammo']; r = 1 if need <= 0 else min(1, have / need); s.res['ammo'] = max(0, have - need)
        if s.X.get('WELL_RUN') and s.on('ammofactory'): r = 1   # a player who builds enough factory for the town never runs dry once it has power
        if s.X.get('WELL_RUN') and s.level < 6: r = max(r, .8)   # and keeps the bench going early
        s.ammo_nights += 1
        if r < .999: s.ammo_short += 1
        gun = 1.3 * (1.15 if s.on('gunsmith') else 1)
        mult = (1 - g) + g * (r * gun + (1 - r) * .55)
        pw = H.Person.power
        H.Person.power = lambda p, pw=pw, m=mult: pw(p) * m
        d0 = s.dead
        try: A.S.Town2.night(s)
        finally: H.Person.power = pw
        if s.level >= 8:
            s.late_n = getattr(s, 'late_n', 0) + 1; s.late_short = getattr(s, 'late_short', 0) + (r < .999); s.late_dead = getattr(s, 'late_dead', 0) + s.dead - d0


    def run(s):
        r = super().run(); r.update(late_short=getattr(s, 'late_short', 0) / max(1, getattr(s, 'late_n', 0)), late_n=getattr(s, 'late_n', 0), late_dead=getattr(s, 'late_dead', 0)); return r


def batch(skill, n, X, ban=None, days=120, jobs_ban=False, cap=None):
    H.T['REAL_DAYS'] = days; H.T['HORDE_CAP_LVL'] = cap or CAP0
    H.B.clear(); H.B.update({k: dict(v) for k, v in S.CATS['ammo'].items()})
    if jobs_ban:   # no Mechanic profession: these buildings are worked by Engineers, as today
        for k in MECH_B: H.B[k]['job'] = 'Engineer' if k != 'generator' else None
    H.LOC.clear(); H.LOC.update({k: dict(v, loot=dict(v['loot'])) for k, v in S.LOC0.items()})
    H.LOC['gas'] = dict(kind='loot', diff=70, hours=3, loot=dict(scrap=6), rescue=.04); H.UNLOCK['gas'] = 3
    if jobs_ban and 'Mechanic' in H.JOBS: H.JOBS.remove('Mechanic')
    try: return [TownM('balanced', skill, 3000 + i, None, {'ban': ban or []}, cat='ammo', X=dict(X, MECH=0 if jobs_ban else 1)).run() for i in range(n)]
    finally:
        if 'Mechanic' not in H.JOBS: H.JOBS.append('Mechanic')


CAP0 = H.T['HORDE_CAP_LVL']
R = {}
t0 = time.time()
def run(name, skill, X, ban=None, days=120, n=N, jobs_ban=False, cap=None):
    rs = batch(skill, n, X, ban, days, jobs_ban, cap); m = S.summ(rs)
    late = [r for r in rs if r['late_n']]; m['late_towns'] = len(late) / len(rs)
    m['late_short'] = round(st.mean(r['late_short'] for r in late), 2) if late else None; m['late_dead'] = round(st.mean(r['late_dead'] for r in late), 2) if late else None
    m['ammo_short'] = round(st.mean(r['ammo_short'] for r in rs), 2); m['ammo_end'] = round(st.mean(r['ammo_end'] for r in rs))
    R[name] = m
    print(f"{name:36} score {m['score']:6.0f} pop {m['pop']:5.1f} lvl {m['lvl']:4.1f} L15 {m['l15']} dead {m['dead']:4.1f} short {m['ammo_short']:.2f} ammo {m['ammo_end']:4d} gen {m['bld_mean'].get('generator', 0)} fac {m['bld_mean'].get('ammofactory', 0)} bench {m['bld_mean'].get('ammobench', 0)} | L8+ towns {m['late_towns']:.2f} short {m['late_short']} dead {m['late_dead']}", flush=True)


if __name__ == '__main__':
    F = dict(AMMO=1, FACT=25)
    for days in (30, 120):
        for sk in ('smart', 'good', 'casual'):
            run(f'{days}d/unlimited/{sk}', sk, dict(AMMO=0), days=days)
            run(f'{days}d/ammo/{sk}', sk, F, days=days)
            run(f'{days}d/ammo/no-power/{sk}', sk, F, ban=['generator', 'wind', 'solar'], days=days)
    TIGHT = 3.2   # late hordes closer to the real game (ceiling 9 + 3.2 per level instead of 2.2)
    for sk in ('smart', 'good'):
        run(f'120d/tight/unlimited/{sk}', sk, dict(AMMO=0), cap=TIGHT)
        run(f'120d/tight/ammo/{sk}', sk, F, cap=TIGHT)
        run(f'120d/tight/ammo/no-power/{sk}', sk, F, ban=['generator', 'wind', 'solar'], cap=TIGHT)
    run('120d/tight/ammo/no-mechanic/smart', 'smart', F, jobs_ban=True, cap=TIGHT)
    run('120d/ammo/no-factory/smart', 'smart', F, ban=['ammofactory'])
    run('120d/ammo/no-gunsmith/smart', 'smart', F, ban=['gunsmith'])
    run('120d/ammo/no-mechanic/smart', 'smart', F, jobs_ban=True)
    run('120d/ammo/no-mechanic/good', 'good', F, jobs_ban=True)
    json.dump(R, open(os.path.join(S.OUT, 'ammostudy2.json'), 'w'), indent=1, default=str)
    print(f'done in {time.time() - t0:.0f}s')
