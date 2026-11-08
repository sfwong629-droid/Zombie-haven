"""Vehicle study (Nov 8): how vehicles fit the game. Built on buildstudy's full catalogue (generators burn fuel too, so
driving and power compete for the same fuel).

    python3 tools/design/vehiclestudy.py [N]     # writes out/vehiclestudy.json

Vehicles live in a Garage and are used for expeditions:
  Hand Cart  (level 1, no fuel)           loot x1.2
  Pickup     (level 4, FUEL fuel a trip)  loot x1.5, trips 40% shorter, +1 seat, a lost fight is safer (deaths x.5)
  Armored Van(level 8, 2xFUEL a trip)     loot x1.8, trips 40% shorter, +1 seat, squad x1.2 power, deaths x.3
Every trip wears the vehicle (10%, 30% on a lost fight); at 100% it breaks down until repaired (8 scrap, a day).
Scenarios: no vehicle, cart only, pickup, pickup + van; fuel cost per trip; vehicles that need no fuel.
"""
import sys, os, json, math, statistics as st, time
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
N = int(sys.argv[1]) if len(sys.argv) > 1 else 100
sys.argv = sys.argv[:1]
import buildstudy as S
H = S.H

VEH = {'cart': dict(lvl=1, fuel=0, loot=1.2, fast=1.0, seat=0, pow=1.0, death=1.0),
       'pickup': dict(lvl=4, fuel=1, loot=1.5, fast=.6, seat=1, pow=1.0, death=.5),
       'van': dict(lvl=8, fuel=2, loot=1.8, fast=.6, seat=1, pow=1.2, death=.3)}


class TownV(S.Town2):
    def __init__(s, *a, VX=None, **k):
        super().__init__(*a, **k)
        s.VX = {**dict(have=(), FUEL=2.0, NOFUEL=False), **(VX or {})}
        s.wear = 0.0; s.broken = 0; s.trips_v = 0; s.fuel_trips = 0.0; s.no_fuel_trip = 0

    def vehicle(s, count=False):
        best = None
        for v in ('cart', 'pickup', 'van'):
            if v in s.VX['have'] and s.level >= VEH[v]['lvl']: best = v
        if not best or s.broken: return None
        need = 0 if s.VX['NOFUEL'] else VEH[best]['fuel'] * s.VX['FUEL']
        if s.res.get('fuel', 0) < need:
            if count: s.no_fuel_trip += 1
            return 'cart' if 'cart' in s.VX['have'] else None   # no fuel: walk (or push the cart)
        return best

    def squad(s, n):
        v = s.vehicle() if s.VX['have'] else None
        return super().squad(n + (VEH[v]['seat'] if v else 0))

    def run_mission(s, k, sq, power):
        v = s.vehicle(True) if s.VX['have'] else None
        if not v: return super().run_mission(k, sq, power)
        Vd = VEH[v]; s.trips_v += 1
        fuel = 0 if s.VX['NOFUEL'] else Vd['fuel'] * s.VX['FUEL']; s.res['fuel'] -= fuel; s.fuel_trips += fuel
        before = dict(s.res); d0 = s.T['MISSION_DEATH']; s.T['MISSION_DEATH'] = d0 * Vd['death']
        w0 = sum(s.mwins.values())
        try: super().run_mission(k, sq, power * Vd['pow'])
        finally: s.T['MISSION_DEATH'] = d0
        won = sum(s.mwins.values()) > w0
        for r in ('food', 'water', 'scrap', 'wood', 'stone', 'meds', 'cloth'):   # more room to bring things home
            gain = s.res.get(r, 0) - before.get(r, 0)
            if gain > 0: s.res[r] += gain * (Vd['loot'] - 1)
        if Vd['fast'] < 1 and s.away_squad:
            back = max(1, math.ceil((s.away_squad - s.T['MISSION_REST']) * Vd['fast']))
            s.away_squad = back + s.T['MISSION_REST']
            for q in sq:
                if q.away: q.away = min(q.away, back)
        s.wear += .1 if won else .3
        if s.wear >= 1: s.broken = 1

    def step(s):
        ok = super().step()
        if s.broken and s.res['scrap'] >= 14 and s.r.random() < s.q['actions']: s.res['scrap'] -= 8; s.broken = 0; s.wear = 0   # the Mechanic patches it up
        return ok

    def run(s):
        r = super().run(); r.update(trips_v=s.trips_v, fuel_trips=s.fuel_trips, no_fuel_trip=s.no_fuel_trip); return r


R = {}
t0 = time.time()
def run(name, skill, VX, n=N, days=120):
    H.T['REAL_DAYS'] = days
    H.B.clear(); H.B.update({k: dict(v) for k, v in S.CATS['full'].items()})
    H.LOC.clear(); H.LOC.update({k: dict(v, loot=dict(v['loot'])) for k, v in S.LOC0.items()})
    H.LOC['gas'] = dict(kind='loot', diff=70, hours=3, loot=dict(scrap=6), rescue=.04); H.UNLOCK['gas'] = 3
    rs = [TownV('balanced', skill, 5000 + i, None, {'ban': []}, cat='full', VX=VX).run() for i in range(n)]
    m = S.summ(rs)
    for k in ('trips_v', 'fuel_trips', 'no_fuel_trip'): m[k] = round(st.mean(r[k] for r in rs), 1)
    m['missions_n'] = round(st.mean(sum(r['missions'].values()) if isinstance(r['missions'], dict) else 0 for r in rs), 1) if rs and 'missions' in rs[0] else None
    R[name] = m
    print(f"{name:30} score {m['score']:6.0f} pop {m['pop']:5.1f} lvl {m['lvl']:4.1f} L15 {m['l15']} dead {m['dead']:4.1f} missions {m.get('missions')} vehicle trips {m['trips_v']} fuel on trips {m['fuel_trips']} walked (no fuel) {m['no_fuel_trip']} dark {m['blackout']:.2f}", flush=True)


if __name__ == '__main__':
    for sk in ('smart', 'good', 'casual'):
        run(f'none/{sk}', sk, dict(have=()))
        run(f'cart/{sk}', sk, dict(have=('cart',)))
        run(f'pickup/{sk}', sk, dict(have=('cart', 'pickup')))
        run(f'pickup+van/{sk}', sk, dict(have=('cart', 'pickup', 'van')))
    for f in (1.0, 4.0): run(f'pickup+van/fuel{f}/smart', 'smart', dict(have=('cart', 'pickup', 'van'), FUEL=f))
    run('pickup+van/no-fuel-needed/smart', 'smart', dict(have=('cart', 'pickup', 'van'), NOFUEL=True))
    json.dump(R, open(os.path.join(S.OUT, 'vehiclestudy.json'), 'w'), indent=1, default=str)
    print(f'done in {time.time() - t0:.0f}s')
