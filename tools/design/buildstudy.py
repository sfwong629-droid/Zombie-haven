"""Building study: a new building catalogue with power (generators, fuel), defence structures and traps, run through havensim.

    python3 tools/design/buildstudy.py [N]     # N towns per scenario (default 120), writes out/buildstudy.json

Catalogues compared:
  current  - today's catalogue (havensim.B)
  power    - + Generator / Fuel Depot / Wind Turbine / Solar, and buildings that need power (Radio, Hospital, Pump, Floodlights, Power Tools, Cold Store)
  defence  - + Spike Strips, Barbed Wire, Noise Lure, Fire Trench, Watchtower upgrades (traps sit outside the wall: they use yard, not building land)
  full     - power + defence + Greenhouse, School, Memorial (the proposed set)
Then sensitivity runs on the full set: fuel scarcity, how many buildings need power, trap strength, and one-at-a-time bans.
"""
import sys, os, json, math, statistics as st, time
from collections import Counter
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import havensim as H

N = int(sys.argv[1]) if len(sys.argv) > 1 else 120
OUT = os.path.join(os.path.dirname(os.path.abspath(__file__)), 'out'); os.makedirs(OUT, exist_ok=True)
B0 = dict(H.B)

POWER_B = {   # power: supply in units; draw = units a building needs to work
    'generator': dict(cost=(10, 4, 10), job=None, lvl=4, cat='power', supply=4, fuel=1.5),     # burns fuel only while something draws power
    'fueldepot': dict(cost=(8, 8, 4), job='Engineer', lvl=4, cat='power'),                      # refines scrap + wood into fuel
    'wind':      dict(cost=(14, 10, 6), job=None, lvl=7, cat='power', supply=2),                 # no fuel, weaker; works most days
    'solar':     dict(cost=(20, 4, 8), job=None, lvl=10, cat='power', supply=3),                 # no fuel, the late-game upgrade
    'pump':      dict(cost=(10, 4, 8), job='Farmer', lvl=6, cat='water', draw=1),               # powered well: 1.8x water, a plain well without power
    'floodlight':dict(cost=(6, 2, 2), job=None, lvl=5, cat='defense', draw=1),                  # lights the yard: fighters see and hit more at night
    'coldstore': dict(cost=(10, 8, 4), job=None, lvl=5, cat='store', draw=1),                   # food keeps: +60 food store, fresh meals (+morale)
    'efence':    dict(cost=(16, 2, 6), job=None, lvl=9, cat='defense', draw=2),                 # walls shock what touches them
}
DRAW = dict(radio=1, hospital=2, workshop=1)   # existing buildings that need power in the power catalogue (workshop: power tools)
DEF_B = {      # traps and defences: 'yard' = they stand outside the wall ring, not on building land
    'spikes':    dict(cost=(2, 3, 0), job=None, lvl=2, cat='trap', yard=1),     # each stops ~1.2 zombies a night, 25% wear out per night (rebuild)
    'wire':      dict(cost=(3, 2, 0), job=None, lvl=3, cat='trap', yard=1),     # slows the horde: +4% defence each (up to 5)
    'lure':      dict(cost=(4, 2, 0), job=None, lvl=4, cat='trap', yard=1),     # noise lure: boss night horde -15%, used up
    'trench':    dict(cost=(6, 4, 6), job=None, lvl=7, cat='trap', yard=2),     # fire trench: burns 3 fuel on a boss night, boss horde -25%
}
CIVIC_B = {
    'greenhouse':dict(cost=(10, 10, 4), job='Farmer', lvl=6, cat='food'),       # 1.6x a farm
    'school':    dict(cost=(10, 12, 4), job=None, lvl=5, cat='social'),         # newcomers and kids learn: better job fit, kids grow up faster
    'memorial':  dict(cost=(4, 6, 6), job=None, lvl=3, cat='social'),           # halves the morale hit when someone dies
}
CATS = dict(current=B0, power={**B0, **POWER_B}, defence={**B0, **DEF_B}, full={**B0, **POWER_B, **DEF_B, **CIVIC_B})
LOC0 = {k: dict(v, loot=dict(v['loot'])) for k, v in H.LOC.items()}
FUEL_LOOT = dict(houses=1, mall=3, hospital=2, police=3, prison=4, military=8, gas=12)


class Town2(H.Town):
    def __init__(s, *a, cat='full', X=None, **k):
        super().__init__(*a, **k)
        s.cat = cat; s.X = {**dict(FUEL_DEPOT=3.0, TRAP=1.2, WEAR=.25, POWER_ALL=1), **(X or {})}
        s.res['fuel'] = 4; s.blackout = 0; s.pdays = 0; s.trapk = 0; s.yard_used = 0
        s.powered = set()

    # ---- power: supply vs draw, fuel burnt only for what is drawn
    def draws(s):
        d = {}
        for k, n in s.bld.items():
            if not n: continue
            if s.cat not in ('power', 'full') or k not in H.B: continue
            dr = H.B[k].get('draw') or (DRAW.get(k, 0) if (s.X['POWER_ALL'] or k != 'workshop') else 0)
            if dr: d[k] = dr * n
        return d

    def power_tick(s):
        s.powered = set()
        d = s.draws()
        if not d: return
        s.pdays += 1
        free = 2 * s.bld['wind'] * (1 if s.r.random() < .7 else .3) + 3 * s.bld['solar']
        gens = s.bld['generator']
        need_units = sum(d.values())
        gen_units = min(4 * gens, max(0, need_units - free))
        fuel_need = H.B['generator']['fuel'] * math.ceil(gen_units / 4) if gens else 0
        if fuel_need and s.res['fuel'] < fuel_need:
            gen_units *= s.res['fuel'] / fuel_need; fuel_need = s.res['fuel']
        s.res['fuel'] -= fuel_need
        sup = free + gen_units
        if sup + 1e-9 < need_units: s.blackout += 1
        order = ['hospital', 'radio', 'pump', 'floodlight', 'efence', 'coldstore', 'workshop']    # the game powers the most important first
        for k in order:
            if k in d and sup >= d[k] - 1e-9: s.powered.add(k); sup -= d[k]

    def on(s, k):
        """a building that needs power only works with it (in catalogues that have power)"""
        if s.cat not in ('power', 'full'): return s.bld[k] > 0
        if k in s.draws(): return k in s.powered
        return s.bld[k] > 0

    def dark(s, fn, *a):
        """run fn with unpowered buildings switched off: a dark Radio Tower sends nothing, a dark Hospital is only a Clinic"""
        hosp, radio = s.bld['hospital'], s.bld['radio']
        if hosp and not s.on('hospital'): s.bld['hospital'] = 0; s.bld['clinic'] += 1
        else: hosp = 0
        if radio and not s.on('radio'): s.bld['radio'] = 0
        else: radio = 0
        try: return fn(*a)
        finally:
            if hosp: s.bld['hospital'] = hosp; s.bld['clinic'] -= 1
            if radio: s.bld['radio'] = radio

    def produce(s):
        s.power_tick()
        short = super().produce()
        mw = 1 + s.T['MORALE_WORK'] * (s.morale - 50) / 100
        if s.bld['pump']:
            n, q = s.staffed('pump'); s.res['water'] += n * s.T['WATER_PER_WELL'] * q / 1.5 * (1.8 if s.on('pump') else 1) * mw
        if s.bld['greenhouse']:
            n, q = s.staffed('greenhouse'); s.res['food'] += n * s.T['FOOD_PER_FARM'] * 1.6 * q / 1.5 * mw
        if s.bld['fueldepot']:
            n, q = s.staffed('fueldepot')
            made = min(n * s.X['FUEL_DEPOT'] * q / 1.5 * mw, s.res['scrap'] / 1.0, s.res['wood'] / 1.0)
            s.res['fuel'] += made; s.res['scrap'] -= made * .5; s.res['wood'] -= made * .5
        cap = 40 + 30 * s.bld['storage'] + 4 * s.level + (60 if s.on('coldstore') else 0)
        s.res['fuel'] = min(s.res['fuel'], 30 + 10 * s.bld['storage'])
        s.res['food'] = min(s.res['food'] + 0, cap)
        return short

    def update_morale(s, short):
        super().update_morale(short)
        if s.on('coldstore'): s.morale = min(100, s.morale + .5)
        if s.bld['school']: s.morale = min(100, s.morale + .3)

    def casualties(s, downs, care=True, why='night'):
        m0, d0 = s.morale, s.dead
        s.dark(super().casualties, downs, care, why)
        if s.bld['memorial'] and s.dead > d0: s.morale = min(100, s.morale + 3 * (s.dead - d0))

    def arrivals(s):
        k0 = s.joined['kids']; s.dark(super().arrivals)
        if s.bld['school'] and s.joined['kids'] > k0: s.people[-1].lvl += 1

    def night(s):
        # defence buildings act on the horde before the fight
        boss = s.day % 6 == 5 and s.day >= 6
        hb, hp, c0, cl = s.T['HORDE_BASE'], s.T['HORDE_PER_DAY'], s.T['HORDE_CAP0'], s.T['HORDE_CAP_LVL']
        horde = min(hb + hp * s.day, c0 + cl * s.level) * ((1.4 if s.day < 30 else 1.8) if boss else 1)
        cut = 0.0
        if s.bld['spikes']:
            cut += s.X['TRAP'] * s.bld['spikes']; s.trapk += min(horde, s.X['TRAP'] * s.bld['spikes'])
            worn = sum(1 for _ in range(s.bld['spikes']) if s.r.random() < s.X['WEAR']); s.bld['spikes'] -= worn; s.rearm = getattr(s, 'rearm', 0) + worn
        if boss and s.bld['lure']: cut += s.X.get('LURE', .15) * horde * min(1, s.bld['lure']); s.bld['lure'] -= 1
        if boss and s.bld['trench'] and s.res['fuel'] >= 3: cut += .25 * horde; s.res['fuel'] -= 3
        mult = 1 + .04 * min(5, s.bld['wire']) + (.15 * min(3, s.bld['floodlight']) if s.on('floodlight') else 0) + (.5 * min(1, s.bld['walls'] / 6) if s.on('efence') else 0)
        if s.cat in ('power', 'full') and s.bld['generator'] and s.res['fuel'] > 0: mult += .05     # a lit camp
        horde_eff = max(horde * .25, horde - cut)
        # run the base night with the reduced horde and the defence multiplier
        s._mult = mult; s._horde = horde_eff
        f0 = s.fighters
        s.T['HORDE_BASE'], s.T['HORDE_PER_DAY'], s.T['HORDE_CAP0'], s.T['HORDE_CAP_LVL'] = horde_eff / (((1.4 if s.day < 30 else 1.8) if boss else 1)), 0, 1e9, 0
        pw = H.Person.power
        H.Person.power = lambda p, pw=pw, m=mult: pw(p) * m
        try: super().night()
        finally:
            H.Person.power = pw
            s.T['HORDE_BASE'], s.T['HORDE_PER_DAY'], s.T['HORDE_CAP0'], s.T['HORDE_CAP_LVL'] = hb, hp, c0, cl

    def train(s):
        if s.cat in ('power', 'full') and s.bld['workshop'] and not s.on('workshop'):
            q = s.q['actions']; s.q['actions'] = q * .67     # hand tools only: crafting a third slower
            super().train(); s.q['actions'] = q
        else: super().train()

    def try_level_up(s):
        rq = H.REQ_BUILD; add = s.X.get('REQ_ADD', 0)
        if add: H.REQ_BUILD = lambda L, rq=rq: rq(L) + add * L      # more building types: ask for more buildings per level
        if s.X.get('REQ_CATS') and s.level < H.MAX_LVL:
            cats = {H.B[k]['cat'] for k, v in s.bld.items() if v and k in H.B and H.B[k]['cat'] != 'trap'}
            if len(cats) < min(len({v['cat'] for v in H.B.values()}) - 1, 3 + s.level // 2): H.REQ_BUILD = rq; s.civic_keys() if s.f.get('civic', True) else None; return   # a rounded town: so many kinds of building, not just more of one
        try: s.dark(super().try_level_up)
        finally: H.REQ_BUILD = rq

    def nbld(s):
        return sum(v for k, v in s.bld.items() if k != 'walls' and not H.B.get(k, {}).get('yard'))

    def yard(s): return sum(H.B[k].get('yard', 0) * v for k, v in s.bld.items() if k in H.B)

    def priorities(s):
        pr = super().priorities()
        if s.cat == 'current': return pr
        add = []
        d = s.draws(); need_units = sum(d.values())
        supply = 4 * s.bld['generator'] + 2 * s.bld['wind'] + 3 * s.bld['solar']
        if s.cat in ('power', 'full'):
            src = ['solar', 'wind', 'generator']
            front = []
            if need_units > supply: front += src                                             # something is dark: power comes first
            elif s.level >= 4 and not supply and s.r.random() < s.q['build']: front += ['generator']   # a planner gets the power in before the Radio Tower
            if s.bld['generator'] and s.res['fuel'] < 6 and s.bld['fueldepot'] < 1 + s.bld['generator'] // 2 and s.r.random() < s.q['build']: front = ['fueldepot'] + front
            if supply - need_units >= 1: add += ['floodlight', 'pump', 'coldstore', 'efence']   # spare power: put it to work
            else: add += ['floodlight', 'pump', 'coldstore', 'efence'][:1 if s.r.random() > s.q['build'] else 0]
            pr = front + pr
        if s.cat == 'full': add += ['greenhouse', 'memorial', 'school']
        sty = s.style if s.style in H.STYLES else 'balanced'
        if sty == 'builder': add = [a for a in add if a in ('generator', 'fueldepot', 'wind', 'solar', 'pump', 'coldstore', 'greenhouse', 'school')] + [a for a in add if a not in ('generator', 'fueldepot', 'wind', 'solar', 'pump', 'coldstore', 'greenhouse', 'school')]
        if sty == 'warlord': add = [a for a in add if H.B.get(a, {}).get('cat') in ('trap', 'defense', 'power')] + [a for a in add if H.B.get(a, {}).get('cat') not in ('trap', 'defense', 'power')]
        n = len(pr) // 3
        return pr[:n] + add + pr[n:]

    def build_something(s):
        # caps for the new buildings (one-per-town ones, sensible counts)
        caps = dict(generator=3, fueldepot=2, wind=3, solar=3, pump=2, floodlight=3, coldstore=1, efence=1, wire=5, lure=2, trench=2, spikes=8, greenhouse=3, school=1, memorial=1)
        yard_cap = 6 + 2 * s.level       # space between the wall and the map edge
        saved = {}
        for k, c in caps.items():
            if k in H.B and (s.bld[k] >= c or (H.B[k].get('yard') and s.yard() + H.B[k]['yard'] > yard_cap)): saved[k] = H.B[k]['lvl']; H.B[k]['lvl'] = 99
        try: super().build_something()
        finally:
            for k, v in saved.items(): H.B[k]['lvl'] = v
        if s.cat in ('defence', 'full'): s.yard_work(yard_cap)

    def yard_work(s, yard_cap):
        """traps stand outside the wall, so they never compete for building land: rearm and add them before nights"""
        if s.r.random() > s.q['actions']: return
        boss_soon = s.day % 6 in (3, 4)
        want = dict(spikes=min(8, 2 + s.level), wire=min(5, s.level // 2), lure=2 if boss_soon else 0, trench=2 if s.level >= 7 else 0)
        if s.r.random() > s.q['build']: want = {k: s.r.randint(0, v + 1) for k, v in want.items()}   # a weaker player sets traps at random
        for k in ('lure', 'spikes', 'wire', 'trench'):
            while s.bld[k] < want[k] and H.B[k]['lvl'] <= s.level and k not in s.ban and s.yard() + H.B[k]['yard'] <= yard_cap:
                c = s.cost(k)
                if not s.can_pay(c) or s.res['scrap'] < c[0] + 8: break      # keep a little scrap for upkeep
                s.pay(c); s.bld[k] += 1

    def run_mission(s, k, sq, power):
        f0 = s.res.get('fuel', 0); w0 = s.mwins[k.split(':')[0]]
        super().run_mission(k, sq, power)
        if s.mwins[k.split(':')[0]] > w0 and k in FUEL_LOOT and s.cat in ('power', 'full'): s.res['fuel'] += FUEL_LOOT[k]

    def cost(s, k):
        if H.B[k].get('cat') == 'trap': return H.B[k]['cost']           # traps don't get dearer per copy
        return super().cost(k)

    def run(s):
        r = super().run()
        r.update(blackout=s.blackout / max(1, s.pdays), trapk=s.trapk, yard=s.yard(), types=sum(1 for k, v in s.bld.items() if v and k in H.B),
                 fp=sum(v * (2 if k in ('farm', 'lumber', 'quarry', 'workshop', 'armory', 'range', 'clinic', 'hospital', 'kitchen', 'greenhouse', 'school') else 1) for k, v in s.bld.items() if k in H.B and k != 'walls' and not H.B[k].get('yard')))
        return r


def batch(cat, style, skill, n, X=None, tune=None, ban=None):
    H.B.clear(); H.B.update({k: dict(v) for k, v in CATS[cat].items()})
    if cat in ('power', 'full'):
        H.LOC.clear(); H.LOC.update({k: dict(v, loot=dict(v['loot'])) for k, v in LOC0.items()})
        H.LOC['gas'] = dict(kind='loot', diff=70, hours=3, loot=dict(scrap=6), rescue=.04); H.UNLOCK['gas'] = 3
    else:
        H.LOC.clear(); H.LOC.update({k: dict(v, loot=dict(v['loot'])) for k, v in LOC0.items()})
    rs = [Town2(style, skill, 3000 + i, tune, {'ban': ban or []}, cat=cat, X=X).run() for i in range(n)]
    return rs


def summ(rs):
    m = H.summ(rs)
    for k in ('blackout', 'trapk', 'yard', 'types', 'fp'): m[k] = round(st.mean(r[k] for r in rs), 2)
    m['score_sd'] = round(st.pstdev([r['score'] for r in rs]))
    bc = Counter()
    for r in rs:
        for k, v in r['bld'].items():
            if v: bc[k] += 1
    m['built_share'] = {k: round(v / len(rs), 2) for k, v in bc.most_common()}
    m['bld_mean'] = {k: round(sum(r['bld'].get(k, 0) for r in rs) / len(rs), 1) for k in bc}
    return m


R = {}
t0 = time.time()
def run(name, cat, style='balanced', skill='smart', X=None, tune=None, ban=None, n=N):
    m = summ(batch(cat, style, skill, n, X, tune, ban)); R[name] = m
    print(f"{name:34} score {m['score']:6.0f} pop {m['pop']:5.1f} lvl {m['lvl']:4.1f} L15 {m['l15']} dead {m['dead']:4.1f} types {m['types']:4.1f} fp {m['fp']:5.1f} yard {m['yard']:4.1f} blackout {m['blackout']:.2f}", flush=True)
    return m


if __name__ == '__main__':
    H.T['REAL_DAYS'] = 120
    for cat in CATS:
        for sk in ('smart', 'good', 'auto', 'casual'): run(f'cat/{cat}/{sk}', cat, skill=sk)
    for stl in H.STYLES: run(f'style/full/{stl}', 'full', style=stl)
    for fd in (1.5, 3.0, 5.0): run(f'fuel/depot{fd}', 'full', X=dict(FUEL_DEPOT=fd))
    run('power/workshop needs none', 'full', X=dict(POWER_ALL=0))
    for sk in ('smart', 'good', 'casual'): run(f'req/kinds/{sk}', 'full', skill=sk, X=dict(REQ_CATS=1))
    for tr in (.6, 1.2, 2.0): run(f'trap/{tr}', 'full', X=dict(TRAP=tr))
    for b in ('generator', 'fueldepot', 'spikes', 'wire', 'lure', 'trench', 'floodlight', 'pump', 'coldstore', 'efence', 'wind', 'solar', 'greenhouse', 'school', 'memorial', 'walls', 'tower'):
        run(f'ban/{b}', 'full', ban=[b])
    json.dump(R, open(os.path.join(OUT, 'buildstudy.json'), 'w'), indent=1, default=str)
    print(f'done in {time.time() - t0:.0f}s')
