"""Haven 2.0 design simulator: a fast day-by-day model of the proposed systems (not the game itself).

It tests the balancing plan before anything is built: town growth, buildings, characters, factions, pets,
locations (separate maps: loot runs, strongholds, faction raids, defending an ally) and long-term pacing,
for different play styles and skill levels.

    python3 tools/design/havensim.py report        # the full study (all scenarios), prints tables, writes out/design_*.json
    python3 tools/design/havensim.py one STYLE SKILL SEED

Time: one step = one game day. A player who plays ~40 min a day at 1x gets ~6 game days per real day
(a game day is ~6.7 real minutes). Real-time gates (Haven upgrades, mission timers) are counted in real days.
"""
import random, math, json, sys, os, statistics as st
from collections import Counter, defaultdict

# ------------------------------------------------------------------ tunables (the plan's numbers)
T = dict(
    DAYS_PER_REAL=6, UPG_A=.5, UPG_B=.8, UPG_MAX=12, UPG_ACTIVE=3, ARR_CAP0=99, ARR_CAP_L=0, SOFT_H=1.5, SOFT_MULT=.4, REGROUP=60, ENDGAME=1, SAFETY=1, NEED_PER_Z=5.0, CIV_DEF=5.0, DIE_BASE=.25, ATTN=.35, FAC_SCALE=1.6, MISSION_DEATH=.04, ALLY_DEF=40, V2=2, LVL_H=8.0, RESCUE=1.0, ALLY_SEND=.25, MISSION_REST=2,            # game days per real day of play (40 min/day at 1x)
    REAL_DAYS=90,               # how long we follow a town
    # population
    ROOM_BASE=6, ROOM_PER_LVL=2,            # room = 6 + 2*level (level 1: 8, level 15: 36)
    ARRIVE_BASE=.35,                         # newcomers/day at the gate before appeal
    KID_RATE=.012,                           # per couple per day when fed and housed
    # economy (per staffed building per day, level 1; +40% per building level)
    FOOD_PER_FARM=5.5, WATER_PER_WELL=6.0, WATER_BARREL=2.5, SCRAP_PER_YARD=4.0, WOOD_PER_LUMBER=5.0, STONE_PER_QUARRY=3.5,
    EAT=1.0, DRINK=1.0, DOG_EAT=.3,
    UPKEEP_PER_BLD=.05, SCRAP_PER_KILL=.15,
    # threat
    HORDE_BASE=4.0, HORDE_PER_DAY=.30, HORDE_CAP0=9.0, HORDE_CAP_LVL=2.2,   # threat grows by the day up to a ceiling that rises with the Haven level
    RAID_BASE_CHANCE=.06,
    # combat
    POWER_PER_LVL=8, CRIT=.0,
    # missions (separate maps)
    MISSION_SCALE=40.0,
    # pets
    DOG_GUARD=10, DOG_SCOUT=12, DOG_FIND=.10, DOG_DIG=.25,
    # morale
    MORALE_WORK=.30,   # +-15% work at morale 100/0
)

JOBS = ['Civilian', 'Guard', 'Police Officer', 'Scavenger', 'Medic', 'Engineer', 'Farmer', 'Cook']
FIGHTERS = {'Guard', 'Police Officer', 'Scavenger'}

# building catalogue: cost (scrap, wood, stone), worker job, unlock level, what it gives
B = {
    'tent':      dict(cost=(4, 6, 0), job=None, lvl=1, beds=2, cat='shelter'),
    'cabin':     dict(cost=(8, 14, 0), job=None, lvl=4, beds=4, cat='shelter'),
    'stonehouse':dict(cost=(14, 8, 14), job=None, lvl=9, beds=6, cat='shelter'),
    'farm':      dict(cost=(5, 6, 0), job='Farmer', lvl=1, cat='food'),
    'barrel':    dict(cost=(3, 3, 0), job=None, lvl=1, cat='water'),
    'well':      dict(cost=(8, 4, 6), job='Farmer', lvl=3, cat='water'),
    'kitchen':   dict(cost=(8, 8, 0), job='Cook', lvl=2, cat='food'),
    'scrapyard': dict(cost=(6, 6, 0), job='Scavenger', lvl=1, cat='mat'),
    'lumber':    dict(cost=(6, 0, 0), job='Scavenger', lvl=1, cat='mat'),
    'quarry':    dict(cost=(8, 8, 0), job='Engineer', lvl=3, cat='mat'),
    'workshop':  dict(cost=(12, 10, 4), job='Engineer', lvl=3, cat='gear'),
    'armory':    dict(cost=(18, 10, 10), job='Engineer', lvl=6, cat='gear'),
    'gym':       dict(cost=(10, 10, 0), job=None, lvl=3, cat='train'),
    'range':     dict(cost=(14, 8, 8), job=None, lvl=7, cat='train'),
    'clinic':    dict(cost=(10, 8, 0), job='Medic', lvl=2, cat='care'),
    'hospital':  dict(cost=(24, 10, 16), job='Medic', lvl=9, cat='care'),
    'walls':     dict(cost=(3, 6, 0), job=None, lvl=2, cat='defense'),   # one ring section pack
    'tower':     dict(cost=(10, 10, 6), job=None, lvl=5, cat='defense'),
    'kennel':    dict(cost=(4, 6, 0), job=None, lvl=2, cat='pets'),
    'lounge':    dict(cost=(8, 8, 0), job=None, lvl=3, cat='social'),
    'market':    dict(cost=(10, 8, 2), job=None, lvl=4, cat='trade'),
    'radio':     dict(cost=(10, 6, 4), job=None, lvl=4, cat='diplo'),
    'storage':   dict(cost=(8, 10, 0), job=None, lvl=2, cat='store'),
}
LEVEL_UP_REAL_HOURS = lambda L: T['LVL_H'] * L ** 1.5   # Haven upgrade build time (real hours, finishes offline): L1 3 h ... L14 6.5 days
MAX_LVL = 15
REQ_PEOPLE = lambda L: T['ROOM_BASE'] + T['ROOM_PER_LVL'] * L - 1     # fill the town to move on
REQ_BUILD = lambda L: 6 + 3 * L
ERA_GATE = {5: 'era2', 10: 'era3'}                     # level 5 -> 6 and 10 -> 11 need an era key

# locations on the outside map. power = difficulty for a 4-person squad; loot per success
LOC = {
    'houses':   dict(kind='loot', diff=40, hours=3, loot=dict(food=8, water=8, cloth=3), rescue=.05),
    'mall':     dict(kind='loot', diff=110, hours=5, loot=dict(food=14, scrap=14, cloth=6), rescue=.12, dog=.15),
    'hospital': dict(kind='loot', diff=170, hours=6, loot=dict(meds=6, scrap=10), rescue=.15),
    'police':   dict(kind='loot', diff=230, hours=6, loot=dict(scrap=18, gear=1), rescue=.10),
    'prison':   dict(kind='stronghold', diff=200, hours=10, loot=dict(scrap=30), rescue=1.0, key='era2', reward='blueprint2'),
    'military': dict(kind='stronghold', diff=420, hours=12, loot=dict(scrap=50, gear=2), rescue=1.0, key='era3', reward='blueprint4'),
}

# factions (names follow the story plan; personalities set their behaviour)
UNLOCK = dict(houses=1, mall=3, prison=4, hospital=5, police=7, military=9)

FACTIONS = {   # from the story plan (Tollmen, Ironfield, Quarantine Command, Halcyon, the Hollow) + one new ally candidate (Riverside Co-op)
    'Tollmen':            dict(agg=.8, greed=.9, trust=.2, strength=150, grow=.6, style='raiders', act=3, att0=-20, ally=False),
    'Riverside Co-op':    dict(agg=.1, greed=.3, trust=.7, strength=90, grow=.35, style='traders', act=2, att0=15, ally=True),
    'Ironfield':          dict(agg=.35, greed=.5, trust=.5, strength=220, grow=.5, style='rival', act=5, att0=0, ally=True),
    'Quarantine Command': dict(agg=.3, greed=.3, trust=.45, strength=380, grow=.2, style='military', act=5, att0=0, ally=True),
    'Halcyon Biotech':    dict(agg=.6, greed=.4, trust=.1, strength=320, grow=.3, style='corp', act=8, att0=-40, ally=False),
    'The Hollow':         dict(agg=.9, greed=.2, trust=0., strength=460, grow=.7, style='cult', act=11, att0=-60, ally=False),
}
WARS = {'Tollmen': 'Riverside Co-op', 'The Hollow': 'Ironfield'}

def sig(x):
    x = max(-60, min(60, x)); return 1 / (1 + math.exp(x))

# ------------------------------------------------------------------ the town
class Person:
    __slots__ = ('job', 'lvl', 'xp', 'gear', 'alive', 'wounded', 'away', 'dog')
    def __init__(s, job, lvl=1):
        s.job, s.lvl, s.xp, s.gear, s.alive, s.wounded, s.away, s.dog = job, lvl, 0.0, 1, True, 0, 0, False
    def power(s):
        atk = [0, 5, 10, 16, 24, 34][s.gear]
        return T['POWER_PER_LVL'] * s.lvl + atk + (T['DOG_GUARD'] if s.dog else 0) * 0
    def gain(s, x):
        s.xp += x
        while s.xp >= 10 * s.lvl ** 1.4 and s.lvl < 20:
            s.xp -= 10 * s.lvl ** 1.4; s.lvl += 1


class Town:
    def __init__(s, style, skill, seed, tune=None, feats=None):
        s.r = random.Random(seed); s.style, s.skill = style, skill
        s.T = dict(T); s.T.update(tune or {})
        s.f = dict(pets=True, factions=True, missions=True, gearStash=True, eraKeysAlt=True, offline=True)
        s.f.update(feats or {})
        s.day = 0; s.level = 1
        s.res = dict(food=20, water=20, scrap=16, wood=12, stone=0, meds=1, cloth=2, rp=0)
        s.people = [Person(j) for j in ['Guard', 'Farmer', 'Scavenger', 'Engineer', 'Civilian', 'Medic']]
        for p in s.people[:2]: p.lvl = 2
        s.bld = Counter(dict(tent=1, farm=1, barrel=1)); s.blevel = Counter()
        s.dogs = 0; s.dogs_out = 0
        s.morale = 60.0; s.keys = set(); s.blueprint = 1; s.stash = []
        s.upgrading = 0.0        # real hours left on the Haven upgrade
        s.dead = 0; s.left = 0; s.joined = Counter(); s.kills = 0
        s.missions = Counter(); s.mwins = Counter(); s.log = []
        s.fac = {k: dict(v, att=float(v['att0']), attn=0.0, alive=True, people=int(v['strength'] / 5), atwar=WARS.get(k), allied=False, absorbed=False, met=False) for k, v in FACTIONS.items()}
        s.timeline = []; s.flog = Counter(); s.cele = []; s.seen = set()
        s.away_squad = None
        # skill profile: how well the player makes each kind of decision
        s.ban = set((feats or {}).get('ban', []))
        if skill not in ('smart', 'good') and style not in STYLES: pass
        s.q = dict(smart=dict(assign=.95, build=.92, mission=.9, diplo=.9, calls=.30, actions=1.0, collect=1.0),
                   good=dict(assign=.8, build=.75, mission=.7, diplo=.7, calls=.15, actions=.9, collect=.9),
                   auto=dict(assign=.65, build=.55, mission=.45, diplo=.45, calls=0.0, actions=.8, collect=.75),
                   casual=dict(assign=.5, build=.4, mission=.3, diplo=.25, calls=0.0, actions=.45, collect=.6),
                   idle=dict(assign=.3, build=0, mission=0, diplo=0, calls=0.0, actions=0, collect=.5))[skill]

    # ---------------- helpers
    def alive(s): return [p for p in s.people if p.alive]
    def home(s): return [p for p in s.alive() if not p.away]
    def room(s): return min(s.beds(), s.T['ROOM_BASE'] + s.T['ROOM_PER_LVL'] * s.level)
    def beds(s): return 4 + sum(B[k].get('beds', 0) * n for k, n in s.bld.items())
    def nbld(s): return sum(v for k, v in s.bld.items() if k != 'walls')   # walls stand on the town's edge: they don't use building land
    def plots(s): return 12 + 3 * s.level + (6 if s.bld['market'] else 0) * 0   # building space: the town's land grows with its level
    def fighters(s): return [p for p in s.home() if p.job in FIGHTERS and not p.wounded]
    def squad(s, n=4):
        f = sorted([p for p in s.alive() if p.job in FIGHTERS and not p.away and not p.wounded], key=lambda p: -p.power())
        return f[:n]
    def can_pay(s, c): return s.res['scrap'] >= c[0] and s.res['wood'] >= c[1] and s.res['stone'] >= c[2]
    def pay(s, c): s.res['scrap'] -= c[0]; s.res['wood'] -= c[1]; s.res['stone'] -= c[2]
    def cost(s, k):
        n = s.bld[k]; c = B[k]['cost']; m = 1 + (.1 if k == 'walls' else .25) * n     # each extra copy costs 25% more (wall packs 10%)
        return tuple(round(x * m) for x in c)

    # ---------------- daily economy
    def staffed(s, k):
        """how many of building k have a worker, and the work quality (match / civilian / wrong)"""
        job = B[k]['job']
        if not job: return s.bld[k], 1.0
        pool = [p for p in s.home() if not p.wounded]
        want = s.bld[k]
        # the game staffs buildings itself (matching job first, then a Civilian, then anyone free); share workers across buildings of the same job
        jobs_need = sum(s.bld[x] for x in B if B[x]['job'] == job)
        match = sum(1 for p in pool if p.job == job)
        good = min(want, int(match * want / max(1, jobs_need) + .5))
        rest = want - good
        civ = min(rest, sum(1 for p in pool if p.job == 'Civilian') // 2)
        wrong = 0
        q = (good * 1.5 + civ * 1.25 + wrong * .75) / max(1, want)
        return good + civ + wrong, q

    def produce(s):
        mw = 1 + s.T['MORALE_WORK'] * (s.morale - 50) / 100
        col = s.q['collect']
        out = Counter()
        for k, cat in [('farm', 'food'), ('well', 'water'), ('scrapyard', 'scrap'), ('lumber', 'wood'), ('quarry', 'stone')]:
            if not s.bld[k]: continue
            n, q = s.staffed(k); lv = 1 + .4 * s.blevel[k]
            per = dict(farm=s.T['FOOD_PER_FARM'], well=s.T['WATER_PER_WELL'], scrapyard=s.T['SCRAP_PER_YARD'], lumber=s.T['WOOD_PER_LUMBER'], quarry=s.T['STONE_PER_QUARRY'])[k]
            out[{'farm': 'food', 'well': 'water', 'scrapyard': 'scrap', 'lumber': 'wood', 'quarry': 'stone'}[k]] += n * per * q / 1.5 * lv * mw * col
        out['water'] += s.bld['barrel'] * s.T['WATER_BARREL'] * col
        if s.f['pets']: out['scrap'] += s.T['DOG_DIG'] * s.dogs; out['food'] += s.T['DOG_DIG'] * .5 * s.dogs   # dogs dig things up around town
        # free hands gather from the land around the town (wrecks, trees, rocks): the base income everyone has
        busy = sum(s.staffed(k)[0] for k in B if B[k]['job'])
        free = max(0, len(s.home()) - busy - len(s.fighters()) // 2)
        out['scrap'] += .7 * free * mw + .8; out['wood'] += .9 * free * mw + 1.0; out['stone'] += (.4 * free if s.level >= 3 else 0)
        # foraging: an empty store sends people out, but it only stretches thin supplies
        for k in ('food', 'water'):
            if s.res[k] < 2: out[k] += .25 * len(s.home())
        for k, v in out.items(): s.res[k] += v
        # eating: kitchen with a cook stretches food
        cook = .85 if s.bld['kitchen'] and any(p.job == 'Cook' for p in s.home()) else 1.0
        n = len(s.home())
        s.res['food'] -= n * s.T['EAT'] * cook + s.dogs * s.T['DOG_EAT']; s.res['water'] -= n * s.T['DRINK']
        s.res['scrap'] -= s.T['UPKEEP_PER_BLD'] * s.nbld()
        short = 0
        for k in ('food', 'water'):
            if s.res[k] < 0: short += -s.res[k] / max(1, n); s.res[k] = 0
        if s.res['scrap'] < 0: s.res['scrap'] = 0
        cap = 40 + 30 * s.bld['storage'] + 4 * s.level
        for k in ('food', 'water', 'scrap', 'wood', 'stone'): s.res[k] = min(s.res[k], cap)
        return short

    def update_morale(s, short):
        tgt = 50 + 10 * min(2, s.bld['lounge']) + (6 if s.bld['kitchen'] else 0) - .4 * max(0, len(s.alive()) - 12) + 3 * min(4, s.dogs) - 40 * min(1, short) + (5 if s.beds() >= len(s.alive()) + 2 else -10 if s.beds() < len(s.alive()) else 0)
        tgt += 3 * min(2, len([f for f in s.fac.values() if f['allied']]))
        s.morale += (tgt - s.morale) * .25
        s.morale = max(0, min(100, s.morale))
        if s.morale < 25 and len(s.alive()) > 3 and s.r.random() < .25:      # people leave a miserable town
            p = s.r.choice([p for p in s.home() if p.job not in FIGHTERS] or s.home()); p.alive = False; s.left += 1

    def town_appeal(s, supply_days, spare):
        """what makes survivors on the road choose this town: full stores, free beds, comforts, safety, standing and friends"""
        a = min(1, supply_days / 3) + min(1, spare / 3)
        a += .5 * (s.bld['kitchen'] > 0) + .5 * (s.bld['clinic'] > 0 or s.bld['hospital'] > 0) + .5 * (s.bld['lounge'] > 0) + .5 * (s.bld['market'] > 0)
        a += .5 * (s.bld['walls'] >= 3) + .5 * (s.bld['walls'] >= 6) + .5 * (s.bld['tower'] > 0)
        a += (s.morale - 50) / 50 + min(1.5, (s.level - 1) * .2) + min(1, .5 * sum(1 for f in s.fac.values() if f['allied']))
        return a

    # ---------------- growth
    def safety_net(s):
        """a comeback for a town on its knees: a lost convoy finds it (2-3 people and some supplies), at most once every 20 game days"""
        if not s.T['SAFETY'] or not s.f.get('safety', True): return
        n = len(s.alive())
        if 0 < n < 5 and s.day - getattr(s, 'last_net', -99) >= 20 and s.r.random() < .25:
            s.last_net = s.day
            for _ in range(s.r.randint(2, 3)): s.people.append(Person(s.r.choice(['Guard', 'Farmer', 'Civilian', 'Medic']), max(1, s.level - 1))); s.joined['convoy'] += 1
            s.res['food'] += 15; s.res['water'] += 15; s.res['scrap'] += 10

    def arrivals(s):
        s.safety_net()
        n = len(s.alive()); room = s.room()
        if n >= room: return
        supply_days = min(s.res['food'], s.res['water']) / max(1, n)
        s.appeal = appeal = s.town_appeal(supply_days, room - n)
        rate = s.T['ARRIVE_BASE'] * (1 + .3 * max(0, appeal)) if supply_days >= .5 else 0
        if s.bld['radio']: rate *= 1.35
        hrs_today = ((s.day - 1) % s.T['DAYS_PER_REAL']) * 6.7 / 60
        if hrs_today > s.T['SOFT_H']: rate *= s.T['SOFT_MULT']   # word of the Haven spreads at road speed: a long session doesn't bring people in faster
        rd = (s.day - 1) // s.T['DAYS_PER_REAL']
        if getattr(s, 'arr_rd', -1) != rd: s.arr_rd = rd; s.arr_n = 0
        if s.arr_n >= s.T['ARR_CAP0'] + s.T['ARR_CAP_L'] * s.level: rate = 0   # the roads only bring so many people a day, however long you play
        if s.r.random() < rate:
            s.people.append(Person(s.r.choice(JOBS), max(1, s.level // 3 + s.r.randint(0, 1)))); s.joined['gate'] += 1; s.arr_n += 1
        # families: couples have children when fed and housed (adults in ~a month of game days)
        if n >= 4 and supply_days >= 1.5 and n < room and s.r.random() < s.T['KID_RATE'] * (n // 2):
            s.people.append(Person('Civilian', 1)); s.joined['kids'] += 1

    # ---------------- nights and raids
    def night(s):
        horde = min(s.T['HORDE_BASE'] + s.T['HORDE_PER_DAY'] * s.day, s.T['HORDE_CAP0'] + s.T['HORDE_CAP_LVL'] * s.level)   # grows with the days, up to a ceiling set by the town's level
        if s.day % 6 == 5 and s.day >= 6: horde *= 1.4 if s.day < 30 else 1.8   # boss night (softer in the first month of game days)
        fd = sum(p.power() for p in s.fighters())
        walls = min(30, s.bld['walls'] * 3 + s.bld['tower'] * 5)
        dogs = s.T['DOG_GUARD'] * min(s.dogs, 4) if s.f['pets'] else 0
        allyd = s.T['ALLY_DEF'] * sum(1 for f in s.fac.values() if f['allied']) if (s.day % 6 == 5) else 0   # allies send defenders on boss nights
        defense = fd * (1 + walls / 15) + dogs + s.T['CIV_DEF'] * len(s.home()) + allyd
        need = horde * s.T['NEED_PER_Z']
        if defense <= 0: defense = 1
        ratio = need / defense
        downs_mu = max(0, (ratio - .6) * 2.5)
        downs = s.poisson(downs_mu)
        k = int(horde * min(1, 1 / ratio)); s.kills += k; s.res['scrap'] += s.T['SCRAP_PER_KILL'] * k
        for p in s.fighters(): p.gain(1.0 + horde * .08)
        s.casualties(downs, care=True)
        # raids by hostile factions or roaming raiders
        for nm, f in s.fac.items():
            if s.T['V2'] or not f['met'] or not f['alive'] or f['absorbed'] or f['att'] > -30 or not s.f['factions']: continue
            if s.r.random() < .10 * f['agg']:
                rs = f['strength'] * (.6 + .4 * s.r.random())
                ok = defense * 1.1 > rs * 1.2
                if ok: f['strength'] *= .9; s.kills += 3; f['att'] -= 3
                else:
                    for k in ('food', 'water', 'scrap'): s.res[k] *= .7
                    s.casualties(s.poisson(1.2), care=True, why='faction raid'); f['att'] -= 2
        if s.r.random() < s.T['RAID_BASE_CHANCE'] and s.day > 4:
            if defense < 30 + 2 * s.day: s.casualties(s.poisson(.8), care=True, why='raiders'); s.res['scrap'] *= .8

    def casualties(s, downs, care=True, why='night'):
        s.cause = getattr(s, 'cause', Counter()); s.cause[why] += downs
        pool = s.home()
        for _ in range(min(downs, len(pool))):
            p = s.r.choice(pool)
            medic = any(q.job == 'Medic' for q in s.home())
            pdie = s.T['DIE_BASE'] - (.12 if medic else 0) - (.08 if s.bld['clinic'] else 0) - (.05 if s.bld['hospital'] else 0) - s.q['calls'] * .25
            if s.r.random() < max(.03, pdie):
                p.alive = False; s.dead += 1; s.morale -= 6
                if s.f['gearStash'] and p.gear > 1: s.stash.append(p.gear)
            else: p.wounded = 2 if (s.bld['clinic'] or s.bld['hospital']) else 4

    def poisson(s, mu):
        if mu <= 0: return 0
        L, k, p = math.exp(-mu), 0, 1.0
        while True:
            p *= s.r.random()
            if p < L: return k
            k += 1

    # ---------------- characters
    def safety_jobs(s):
        # the game itself keeps two fighters on duty (an advisor rule every player gets), using civilians first
        fs = [p for p in s.alive() if p.job in FIGHTERS]
        if len(fs) < 2:
            c = [p for p in s.home() if p.job == 'Civilian'] or [p for p in s.home() if p.job not in FIGHTERS and p.job != 'Medic']
            if c: c[0].job = 'Guard'

    def train(s):
        s.safety_jobs()
        gym = s.bld['gym'] + 1.5 * s.bld['range']
        for p in s.home():
            base = .6 if p.job not in FIGHTERS else .3
            p.gain(base + (.8 * min(1, gym) if p.job in FIGHTERS else 0))
            if p.wounded: p.wounded -= 1
        # gear: a workshop crafts up to the blueprint tier; stash gear goes to the best fighters first
        tier = 1 + (1 if s.bld['workshop'] else 0) + (1 if s.bld['armory'] else 0)
        tier = min(tier, s.blueprint + (1 if s.bld['workshop'] else 0))
        fs = sorted([p for p in s.alive() if p.job in FIGHTERS], key=lambda p: -p.lvl)
        for p in fs:
            if s.stash and max(s.stash) > p.gear: g = max(s.stash); s.stash.remove(g); p.gear = g; continue
            if p.gear < tier and s.res['scrap'] >= 6 * p.gear + 4 and s.r.random() < .5 * s.q['actions'] + .2:
                s.res['scrap'] -= 6 * p.gear + 4; p.gear += 1

    # ---------------- the player's decisions
    def decide(s):
        if s.q['actions'] <= 0: return
        if s.r.random() > s.q['actions']: return
        s.assign_jobs(); s.build_something(); s.try_level_up()
        if s.f['missions']: s.consider_mission()
        if s.f['factions']: s.diplomacy()
        if s.f['pets']: s.pets()

    def assign_jobs(s):
        # turn civilians into the job the town lacks most (smart) or a random job (others)
        civs = [p for p in s.home() if p.job == 'Civilian' and p.lvl >= 1]
        # a good player also retrains people from jobs the town has too many of (the game lets you change profession)
        if s.r.random() < s.q['assign'] - .3:
            need0 = Counter(B[k]['job'] for k in B for _ in range(s.bld[k]) if B[k]['job'])
            have0 = Counter(p.job for p in s.alive())
            surplus = [p for p in s.home() if p.job not in FIGHTERS and p.job != 'Civilian' and have0[p.job] > need0[p.job] + (1 if p.job in ('Medic', 'Engineer') else 0)]
            civs += surplus[:2]
        if not civs: return
        need = {}
        for k in ('farm', 'well', 'scrapyard', 'lumber', 'quarry', 'kitchen', 'clinic', 'workshop', 'armory'):
            j = B[k]['job']; need[j] = need.get(j, 0) + s.bld[k]
        have = Counter(p.job for p in s.alive())
        lack = sorted(need, key=lambda j: have[j] - need[j])
        want_f = {'warlord': 5, 'builder': 3, 'diplomat': 2, 'explorer': 4}.get(s.style, 3) + s.level // 3
        hungry = min(s.res['food'], s.res['water']) / max(1, len(s.alive())) < 2
        for c in civs:
            if s.r.random() > s.q['assign']: c.job = s.r.choice(JOBS[1:]); continue
            if hungry and s.q['assign'] >= .6 and have['Farmer'] < max(2, need.get('Farmer', 0)): c.job = 'Farmer'; have['Farmer'] += 1; continue   # feed people first
            if sum(1 for p in s.alive() if p.job in FIGHTERS) < want_f: c.job = 'Guard' if s.style != 'explorer' else 'Scavenger'
            elif lack and have[lack[0]] < need[lack[0]]: c.job = lack[0]
            else: break

    def priorities(s):
        n = len(s.alive()); fd = s.res['food'] / max(1, n); wd = s.res['water'] / max(1, n)
        pr = []
        if wd < 3: pr += ['well', 'barrel']
        if fd < 3: pr += ['farm', 'kitchen']
        if s.room() - n <= 1 and s.beds() <= s.T['ROOM_BASE'] + s.T['ROOM_PER_LVL'] * s.level: pr += ['cabin', 'stonehouse', 'tent']
        if s.res['scrap'] < 10: pr += ['scrapyard']
        if s.res['wood'] < 10: pr += ['lumber']
        st0 = s.style if s.style in STYLES else s.r.choice(STYLES)
        style = dict(builder=['walls', 'storage', 'quarry', 'tower', 'lounge', 'market', 'clinic', 'farm', 'well'],
                     warlord=['workshop', 'gym', 'armory', 'range', 'clinic', 'walls', 'tower', 'kennel'],
                     diplomat=['market', 'radio', 'lounge', 'storage', 'clinic', 'farm', 'kitchen'],
                     explorer=['kennel', 'workshop', 'clinic', 'gym', 'storage', 'market'])[st0]
        if s.style == 'builder' or (s.style not in STYLES and s.skill == 'smart'):
            if s.level >= 4 and 'era2' not in s.keys: pr = ['radio', 'market', 'walls'] + pr
            if s.level >= 8 and 'era3' not in s.keys: pr = ['hospital', 'armory', 'stonehouse', 'walls'] + pr
        return pr + style + ['farm', 'well', 'tent', 'cabin', 'quarry', 'workshop', 'gym', 'clinic', 'walls', 'lounge', 'storage', 'kennel', 'hospital', 'range', 'armory']

    def build_something(s):
        for _ in range(2 if s.skill == 'smart' else 1):
            if s.nbld() >= s.plots(): s.upgrade_building(); return
            if s.r.random() < s.q['build']: order = s.priorities()
            else: order = list(B); s.r.shuffle(order)       # a weaker player builds what catches the eye
            cap = 40 + 30 * s.bld['storage'] + 4 * s.level
            for k in order:
                if B[k]['lvl'] > s.level or k in s.ban: continue
                if s.skill == 'smart' and B[k]['cat'] in ('food', 'water', 'mat') and k != 'kitchen':
                    r = dict(food='food', water='water').get(B[k]['cat']) or {'scrapyard': 'scrap', 'lumber': 'wood', 'quarry': 'stone'}.get(k)
                    if r and s.res.get(r, 0) > cap * .8: continue    # don't build more of what is already overflowing
                if k == 'storage' and s.bld[k] >= 3: continue
                if k in ('hospital', 'armory', 'radio', 'market') and s.bld[k] >= 1: continue
                if k == 'walls' and s.bld[k] >= 8: continue
                if k == 'stonehouse' and s.bld[k] >= 3 and s.room() > len(s.alive()) + 1: continue
                if k == 'kennel' and s.bld[k] >= 2: continue
                c = s.cost(k)
                if s.can_pay(c):
                    s.pay(c); s.bld[k] += 1; break

    def upgrade_building(s):
        # no land left: improve what is there (each building level +40% output)
        for k in ('farm', 'well', 'scrapyard', 'lumber', 'quarry', 'cabin'):
            if s.bld[k] and s.blevel[k] < 2 * s.bld[k]:
                c = tuple(round(x * (1.5 + .5 * s.blevel[k])) for x in B[k]['cost'])
                if s.can_pay(c): s.pay(c); s.blevel[k] += 1; return

    def civic_keys(s):
        # the builder's way through an era gate: a civic project instead of a fight or a treaty
        if s.bld['radio'] and s.bld['market'] and s.bld['walls'] >= 2 and s.res['food'] >= 35: s.keys.add('era2')
        if 'era2' in s.keys and s.bld['hospital'] and s.bld['armory'] and s.bld['stonehouse'] >= 3 and s.bld['walls'] >= 6 and s.res['food'] >= 60: s.keys.add('era3')

    def try_level_up(s):
        if s.f.get('civic', True): s.civic_keys()
        if s.upgrading > 0 or s.level >= MAX_LVL: return
        L = s.level
        if len(s.alive()) >= REQ_PEOPLE(L) and s.nbld() >= REQ_BUILD(L):
            gate = ERA_GATE.get(L)
            if gate and gate not in s.keys: return
            c = (6 + 3 * L, 6 + 3 * L, 2 * L if L >= 3 else 0)
            if s.can_pay(c): s.pay(c); s.upgrading = min(s.T['UPG_MAX'], s.T['UPG_A'] + s.T['UPG_B'] * L) if s.T['V2'] >= 2 else LEVEL_UP_REAL_HOURS(L)

    def consider_mission(s):
        if s.away_squad: return
        sq = s.squad(4 if s.style != 'builder' else 3)
        sty = s.style if s.style in STYLES else 'builder'
        if len(sq) < 2 or len(s.fighters()) - len(sq) < 1: return          # always keep a fighter home
        power = sum(p.power() for p in sq) + (s.T['DOG_SCOUT'] if s.dogs and s.f['pets'] else 0)
        cands = []
        for k, L in LOC.items():
            if L['kind'] == 'stronghold' and L['key'] in s.keys: continue
            if s.level < UNLOCK.get(k, 1): continue   # layers: places open up as the Haven grows
            p = sig((-(power - L['diff']) / s.T['MISSION_SCALE']))
            val = sum(L['loot'].values()) * (1 + L.get('rescue', 0)) * (3 if L['kind'] == 'stronghold' else 1)
            cands.append((p, val, k))
        # faction missions: raid a hostile faction or defend an ally under attack
        for nm, f in s.fac.items():
            if not f['met'] or not f['alive'] or (f['absorbed'] and not f.get('defeats')): continue
            if s.T['ENDGAME'] and f.get('defeats') and f['absorbed'] and not f.get('eradicated') and s.level >= 12 and (sty in ('warlord', 'explorer') or s.level >= 15):
                p = sig((-(power - s.fstr(f) * 1.9) / s.T['MISSION_SCALE'])); cands.append((p, 120, 'hq:' + nm))   # their last stronghold: end them for good
            if f['absorbed']: continue
            if f['att'] <= -30 and sty in ('warlord', 'explorer'):
                p = sig((-(power - s.fstr(f) * .9) / s.T['MISSION_SCALE'])); cands.append((p, 40, 'raid:' + nm))
            if f['allied'] and f.get('under_attack'):
                p = sig((-(power - f['under_attack'] * 1.6) / s.T['MISSION_SCALE'])); cands.append((p, 50, 'defend:' + nm))
        if not cands: return
        smart = s.r.random() < s.q['mission']
        bias = dict(explorer=1.6, warlord=1.3, diplomat=.7, builder=.6)[sty] if s.style in STYLES else 1.0
        if smart:
            good = [c for c in cands if c[0] >= s.T.get('READY', .65)]
            if not good or s.r.random() > .35 * bias: return
            c = max(good, key=lambda c: c[0] * c[1])
        else:
            ok = [c for c in cands if c[0] >= .35 + .35 * s.q['mission']]   # the screen shows the odds; better players take fewer long shots
            if not ok or s.r.random() > .25 * bias: return
            c = s.r.choice(ok)
        s.run_mission(c[2], sq, power)

    def run_mission(s, k, sq, power):
        s.missions[k.split(':')[0]] += 1
        if ':' in k:
            kind, nm = k.split(':'); f = s.fac[nm]
            diff = s.fstr(f) * .9 if kind == 'raid' else s.fstr(f) * 1.9 if kind == 'hq' else f['under_attack'] * 1.6
        else: L = LOC[k]; diff = L['diff']; kind = L['kind']
        p = sig((-(power - diff) / s.T['MISSION_SCALE']))
        win = s.r.random() < p
        hours = LOC[k]['hours'] if k in LOC else 6
        days = max(1, math.ceil(hours * s.T['DAYS_PER_REAL'] / 24))   # missions run on real time: a binge session doesn't fit more of them in a real day
        for q in sq: q.away = days; q.gain(6 + diff / 25)
        if win:
            s.mwins[k.split(':')[0]] += 1
            if k in LOC:
                for r, v in L['loot'].items():
                    if r == 'gear': s.stash += [min(5, s.blueprint + 1)] * v
                    else: s.res[r] = s.res.get(r, 0) + v * (1.2 if s.dogs and s.f['pets'] else 1)
                if s.r.random() < L.get('rescue', 0) * s.T['RESCUE'] and len(s.alive()) < s.room(): s.people.append(Person(s.r.choice(JOBS), max(1, s.level // 2))); s.joined['rescued'] += 1
                if s.f['pets'] and s.r.random() < L.get('dog', s.T['DOG_FIND']): s.dogs += 1; s.joined['dogs'] += 1
                if kind == 'stronghold':
                    s.keys.add(L['key']); s.blueprint = max(s.blueprint, int(L['reward'][-1]))
                    for _ in range(2): s.people.append(Person(s.r.choice(JOBS), s.level // 2 + 1)); s.joined['stronghold'] += 1
            elif kind == 'raid':
                s.res['scrap'] += 20; s.res['food'] += 10; f['strength'] *= .7; f['att'] -= 25
                if len(s.alive()) < s.room() and s.r.random() < .4: s.people.append(Person('Guard', 2)); s.joined['captured'] += 1
                for of in s.fac.values():
                    if of is not f and of['met'] and f['style'] in ('raiders', 'cult', 'corp'): of['att'] += 8      # others like seeing raiders hit
                if f['strength'] < .35 * FACTIONS[nm]['strength']:
                    f['absorbed'] = True; f['back'] = s.day + s.T['REGROUP']; f['defeats'] = f.get('defeats', 0) + 1; n = min(6, max(1, f['people'] // 4), max(0, s.room() - len(s.alive())) + 2)
                    for _ in range(n): s.people.append(Person(s.r.choice(JOBS), 2)); s.joined['conquest'] += 1
                    s.keys.add('era2' if 'era2' not in s.keys else 'era3') if s.f['eraKeysAlt'] else None
            elif kind == 'hq':
                f['eradicated'] = True; f['alive'] = False; s.res['scrap'] += 60; s.flog['eradicated'] += 1
                for _ in range(3): s.people.append(Person(s.r.choice(JOBS), 3)); s.joined['freed'] += 1
            elif kind == 'defend':
                f['att'] += 20; f['under_attack'] = 0; f['strength'] *= 1.05
        else:
            # the squad falls back: everyone comes home hurt (Wounded), a fighter is lost only rarely (the plan: losing costs time and health, not people)
            s.cause = getattr(s, 'cause', Counter()); s.cause['mission'] += 1
            for q in sq:
                q.wounded = 3 + (kind == 'stronghold')
                if s.r.random() < s.T['MISSION_DEATH']: q.alive = False; s.dead += 1; s.morale -= 6
        s.away_squad = days + s.T['MISSION_REST']

    def fstr(s, f):
        """a faction's fighting strength: its base, growing as the player's town grows past the act where they appear"""
        return f['strength'] * s.T['FAC_SCALE'] * (1 + .22 * max(0, s.level - f['act']))

    def visit(s, nm, f, good):
        """a faction's attention is full: they come. what happens depends on how they feel and what the player answers"""
        sty = s.style if s.style in STYLES else 'builder'
        defense = sum(p.power() for p in s.fighters()) * (1 + min(30, s.bld['walls'] * 3 + s.bld['tower'] * 5) / 25) + s.T['DOG_GUARD'] * min(s.dogs, 4) * (s.f['pets'])
        if f['att'] < -25:     # hostile: a demand, then a raid if refused
            ask = dict(food=round(.15 * s.res['food']), scrap=round(.15 * s.res['scrap']))
            fs_ = s.fstr(f)
            strong = defense > fs_ * 1.3
            if good: pay = not strong and sty != 'warlord'
            else: pay = s.r.random() < .5
            if pay: s.res['food'] -= ask['food']; s.res['scrap'] -= ask['scrap']; f['att'] += 3; f['attn'] = 40; s.flog['paid'] += 1
            else:
                rs = fs_ * (.6 + .9 * s.r.random()); f['attn'] = 10; s.flog['raids'] += 1
                if s.away_squad: defense *= .6          # they like to come when the squad is out
                if defense * (1.15 if good else 1) > rs:
                    f['strength'] *= .85; s.kills += 4; f['att'] -= 4; s.flog['raids_won'] += 1
                    for q in s.fighters(): q.gain(4)
                else:
                    for k in ('food', 'water', 'scrap', 'wood'): s.res[k] *= .8
                    s.casualties(s.poisson(.8), why='faction raid'); f['att'] -= 3
                    if s.nbld() > 6 and s.r.random() < .5: k = s.r.choice([b for b in s.bld if s.bld[b]]); s.bld[k] -= 1; s.flog['burnt'] += 1
                    if len(s.alive()) > 4 and s.r.random() < .35: q = s.r.choice(s.home()); q.alive = False; s.left += 1; s.flog['taken'] += 1
        elif f['att'] < 30:    # neutral: trade or a request
            if s.r.random() < .5:
                if s.res['food'] > 15 and (good or s.r.random() < .5):
                    s.res['food'] -= 6; s.res['scrap'] += 10 * (1.5 if s.bld['market'] else 1); s.res['wood'] += 4; f['att'] += 4; s.flog['trades'] += 1
            else:
                ok = s.res['food'] > 12 and s.res['scrap'] > 8
                worth = f['ally'] and (sty == 'diplomat' or f['att'] >= 20 or s.res['food'] > 40)   # help the ones worth befriending
                take = ok and (good and sty != 'warlord' and worth or (not good and s.r.random() < .4))
                if take: s.res['food'] -= 6; s.res['scrap'] -= 5; f['att'] += 10 * (1.4 if sty == 'diplomat' else 1) * (.5 + f['trust']); s.flog['helped'] += 1
                else: f['att'] -= 3
            f['attn'] = 0
        else:                  # friendly / allied: gifts, recruits, joint work
            if f['allied'] and len(s.alive()) < s.room() and s.r.random() < .6:
                s.people.append(Person(s.r.choice(['Guard', 'Farmer', 'Medic', 'Engineer']), max(2, s.level // 2))); s.joined['ally'] += 1
            else: s.res['food'] += 12; s.res['water'] += 12; s.res['scrap'] += 10
            f['att'] += 2 if good else 0; f['attn'] = 0; s.flog['gifts'] += 1

    def diplomacy(s):
        good = s.r.random() < s.q['diplo']
        if s.T['V2']:
            for nm, f in s.fac.items():
                if not f['met'] or not f['alive'] or f['absorbed']: continue
                # attention fills each day (renown, size, a full store, what they care about); a full bar means a visit
                f['attn'] = f.get('attn', 0) + s.T['ATTN'] * (2 + .25 * len(s.alive()) + .5 * s.level + (2 if (s.res['food'] + s.res['scrap']) > 80 and f['greed'] > .5 else 0))
                if f['attn'] >= 100: s.visit(nm, f, good)
                f['att'] = max(-100, min(100, f['att'] - .035 * (f['att'] - f['att0'])))
                if f['allied'] and f.get('under_attack') and not s.away_squad and s.r.random() < .3: f['att'] -= 6   # an ally left alone under attack remembers it
                f['allied'] = f['ally'] and f['att'] >= 50 and (s.bld['radio'] or s.level >= 6)
                if f['allied'] and s.f['eraKeysAlt']:
                    s.keys.add('era2')
                    if f['att'] >= 85 and s.level >= 9: s.keys.add('era3')
                    if f['allied'] and s.day % 3 == 0: s.res['scrap'] += 3   # trade route
            # the player can also reach out: a gift to a neutral or friendly faction (diplomats do this a lot)
            sty = s.style if s.style in STYLES else 'builder'
            if good and s.res['food'] > 30 and s.r.random() < (.25 if sty == 'diplomat' else .06):
                cands = [f for f in s.fac.values() if f['met'] and f['alive'] and not f['absorbed'] and f['ally'] and f['att'] > -25]
                if cands: f = max(cands, key=lambda f: f['att']); s.res['food'] -= 8; f['att'] += 5 * (.5 + f['trust'])
            return
        good = s.r.random() < s.q['diplo']
        for nm, f in s.fac.items():
            if not f['met'] or not f['alive'] or f['absorbed']: continue
            # requests and offers arrive a few times a week
            if s.r.random() < .25:
                ev = s.r.choice(['trade', 'request', 'demand' if f['att'] < 0 and f['agg'] > .3 else 'trade', 'help' if f['att'] > 20 else 'request'])
                if ev == 'trade':
                    if s.bld['market'] or s.style == 'diplomat':
                        if good or s.r.random() < .5:
                            give = 'food' if s.res['food'] > s.res['water'] else 'water'
                            if s.res[give] > 12: s.res[give] -= 6; s.res['scrap'] += 6 * (1.3 if s.bld['market'] else 1); f['att'] += 2
                elif ev == 'request':
                    ok = s.res['food'] > 15 and s.res['scrap'] > 10
                    take = (good and ok and s.style != 'warlord') or (not good and s.r.random() < .4 and ok)
                    if take: s.res['food'] -= 6; s.res['scrap'] -= 4; f['att'] += 8 * (1.5 if s.style == 'diplomat' else 1) * f['trust'] / .5
                    else: f['att'] -= 2
                elif ev == 'demand':
                    pay = (good and s.style in ('diplomat', 'builder') and s.res['scrap'] > 20) or (not good and s.r.random() < .5 and s.res['scrap'] > 10)
                    if pay: s.res['scrap'] -= 8; f['att'] += 4
                    else: f['att'] -= 8
                elif ev == 'help' and f['allied']:
                    # an ally sends a fighter or supplies
                    if s.r.random() < s.T['ALLY_SEND'] and len(s.alive()) < s.room(): s.people.append(Person('Guard', max(2, s.level // 2))); s.joined['ally'] += 1
                    else: s.res['food'] += 8; s.res['water'] += 8
            f['att'] = max(-100, min(100, f['att'] - .15 * (f['att'] - f['att0']) / 10))
            f['allied'] = f['ally'] and f['att'] >= 60 and (s.bld['radio'] or s.style == 'diplomat' or s.level >= 6)
            if f['allied'] and s.f['eraKeysAlt']:
                s.keys.add('era2')
                if f['att'] >= 85 and s.level >= 9: s.keys.add('era3')

    def pets(s):
        if not s.bld['kennel']: return
        cap = 3 * s.bld['kennel']
        if s.dogs < cap and s.res['food'] > 20 and s.r.random() < .04 * (1 + (s.style == 'explorer')): s.dogs += 1; s.joined['dogs'] += 1
        if s.dogs >= 2 and s.dogs < cap and s.res['food'] > 25 and s.r.random() < .05: s.dogs += 1; s.joined['pups'] += 1

    # ---------------- factions live their own lives
    def factions_tick(s):
        for nm, f in s.fac.items():
            if f['absorbed'] and not f.get('eradicated') and s.day >= (f.get('back') or 1e9):   # a beaten faction regroups under a new leader
                f['absorbed'] = False; f['strength'] = FACTIONS[nm]['strength'] * .6 * (1 + .1 * f['defeats']); f['att'] = min(f['att'], -40); f['back'] = None; s.flog['regrouped'] += 1
            if not f['met'] and s.level >= f['act']: f['met'] = True
            if not f['met'] or not f['alive'] or f['absorbed']: continue
            if f['style'] == 'military': f['att'] += (.3 if s.dead == 0 or s.morale > 50 else -.4)     # Quarantine watches infection: deaths and misery
            if f['style'] == 'rival' and s.level > 7 and f['att'] > -60: f['att'] -= .25 * (s.level - 7) / 3   # Ironfield resents a town that outgrows it
            if f['style'] == 'cult' and s.morale < 40 and s.r.random() < .08:
                cands = [p for p in s.home() if p.job not in FIGHTERS]
                if cands: p = s.r.choice(cands); p.alive = False; s.left += 1          # the Hollow lures away the unhappy
            f['strength'] = min(f['strength'] * (1 + .006 * f['grow']), FACTIONS[nm]['strength'] * 3); f['people'] = int(f['strength'] / 5)
            war = f.get('atwar')
            if war and s.fac[war]['alive'] and not s.fac[war]['absorbed'] and s.r.random() < .05 * f['agg']:
                tgt = s.fac[war]; tgt['under_attack'] = f['strength'] * .5
                if tgt['allied'] and s.f['missions']:
                    pass   # the player can answer with a defend mission (decide())
                if s.r.random() < .5:
                    tgt['strength'] *= .85
                    if tgt['strength'] < 12:
                        tgt['alive'] = False
                        # refugees come to a friendly player; otherwise they join the winner
                        if tgt['att'] > 20:
                            for _ in range(max(1, tgt['people'] // 2)): s.people.append(Person(s.r.choice(JOBS), 1)); s.joined['refugees'] += 1
                        else: f['strength'] += tgt['strength'] * 2
            if f.get('under_attack') and s.r.random() < .3: f['under_attack'] = 0

    # ---------------- one game day
    def celebrate(s, what):
        if what not in s.seen: s.seen.add(what); s.cele.append((s.day, what))

    def check_cele(s):
        for k, n in s.bld.items():
            if n: s.celebrate('first ' + k)
        p = len(s.alive())
        for m in range(10, 40, 5):
            if p >= m: s.celebrate(f'{m} people')
        s.celebrate(f'level {s.level}')
        if s.T.get('STEPS', 0) and s.level < MAX_LVL:   # layers: each level split into small steps, each one celebrated
            L = s.level; need_p, need_b = REQ_PEOPLE(L), REQ_BUILD(L); prev_p, prev_b = (REQ_PEOPLE(L - 1), REQ_BUILD(L - 1)) if L > 1 else (6, 6)
            prog = min(1, max(0, (p - prev_p) / max(1, need_p - prev_p))) * .5 + min(1, max(0, (s.nbld() - prev_b) / max(1, need_b - prev_b))) * .5
            for k in range(1, s.T['STEPS'] + 1):
                if prog >= k / (s.T['STEPS'] + 1): s.celebrate(f'L{L} step {k}')
            for q in s.alive():
                for m in (5, 10, 15):
                    if q.lvl >= m: s.celebrate(f'{id(q)} reached {m}')
            if s.dogs >= 2: s.celebrate('two dogs')
            for nm, f in s.fac.items():
                if f['met'] and f['att'] >= 25: s.celebrate('friends ' + nm)
            for k, n in s.blevel.items():
                for m in (1, 2, 3):
                    if n >= m: s.celebrate(f'{k} upgraded x{m}')
        for k in s.mwins: s.celebrate('won ' + k)
        if s.dogs: s.celebrate('first dog')
        for k in s.keys: s.celebrate(k)
        for nm, f in s.fac.items():
            if f['met']: s.celebrate('met ' + nm)
            if f['allied']: s.celebrate('ally ' + nm)
            if f.get('eradicated'): s.celebrate('ended ' + nm)

    def step(s):
        s.day += 1
        short = s.produce(); s.update_morale(short)
        s.arrivals()
        if s.f['factions']: s.factions_tick()
        s.decide()
        s.night(); s.train()
        for p in s.alive():
            if p.away: p.away -= 1
        if s.away_squad: s.away_squad -= 1
        if s.upgrading > 0:
            if s.T['V2'] >= 2:   # builders work 3x faster while you watch; the rest of the real day counts at 1x
                act = 6.7 / 60; s.upgrading -= act * s.T['UPG_ACTIVE'] + max(0, 24 - act * s.T['DAYS_PER_REAL']) / s.T['DAYS_PER_REAL']
            else: s.upgrading -= 24 / s.T['DAYS_PER_REAL']          # real hours per game day of play (plus offline: generous)
            if s.upgrading <= 0: s.level += 1; s.upgrading = 0; s.res['food'] += 2; s.res['water'] += 2
        s.people = [p for p in s.people if p.alive]
        s.check_cele()
        if s.day % s.T['DAYS_PER_REAL'] == 0:
            rd = s.day // s.T['DAYS_PER_REAL']
            sq = s.squad(4)
            s.timeline.append(dict(rd=rd, pop=len(s.alive()), lvl=s.level, nb=s.nbld(), power=sum(p.power() for p in sq), dogs=s.dogs, morale=round(s.morale), dead=s.dead, left=s.left,
                                   allies=sum(1 for f in s.fac.values() if f['allied']), keys=len(s.keys)))
        return len(s.alive()) > 0

    def run(s):
        for _ in range(s.T['REAL_DAYS'] * s.T['DAYS_PER_REAL']):
            if not s.step(): break
        last = s.timeline[-1] if s.timeline else dict(pop=len(s.alive()), lvl=s.level, nb=s.nbld(), power=0)
        def at(rd, k):
            for t in s.timeline:
                if t['rd'] >= rd: return t[k]
            return last.get(k, 0)
        lvl_day = {}
        for t in s.timeline:
            for L in (3, 5, 8, 11, 13, 15):
                if t['lvl'] >= L and L not in lvl_day: lvl_day[L] = t['rd']
        score = 120 * last['pop'] + 150 * last['lvl'] + 10 * last['nb'] - 80 * s.dead - 40 * s.left
        return dict(style=s.style, skill=s.skill, pop=last['pop'], lvl=last['lvl'], nb=last['nb'], dead=s.dead, left=s.left, power=last.get('power', 0), dogs=s.dogs,
                    pop7=at(7, 'pop'), pop30=at(30, 'pop'), pop60=at(60, 'pop'), lvl7=at(7, 'lvl'), lvl30=at(30, 'lvl'), lvl60=at(60, 'lvl'),
                    lvl_day=lvl_day, joined=dict(s.joined), missions=dict(s.missions), wins=dict(s.mwins), keys=sorted(s.keys), score=score,
                    allies=[k for k, f in s.fac.items() if f['allied']], gone=[k for k, f in s.fac.items() if not f['alive'] or f['absorbed']],
                    att={k: round(f['att']) for k, f in s.fac.items()}, morale=round(s.morale), flog=dict(s.flog), timeline=s.timeline, cele=s.cele, bld=dict(s.bld), blevel=dict(s.blevel),
                    eradicated=[k for k, f in s.fac.items() if f.get('eradicated')], all_hostile_gone=all(s.fac[k].get('eradicated') for k in ('Tollmen', 'Halcyon Biotech', 'The Hollow')))


STYLES = ['builder', 'warlord', 'diplomat', 'explorer']
SKILLS = ['smart', 'auto', 'casual', 'idle']


def batch(style, skill, n=60, tune=None, feats=None, seed0=1000):
    return [Town(style, skill, seed0 + i, tune, feats).run() for i in range(n)]


def summ(rs):
    g = lambda k: st.mean(r[k] for r in rs)
    ld = lambda L: [r['lvl_day'].get(L) for r in rs]
    def med(xs):
        xs = [x for x in xs if x is not None]
        return (st.median(xs), len(xs) / len(rs)) if xs else (None, 0)
    return dict(n=len(rs), pop=g('pop'), pop7=g('pop7'), pop30=g('pop30'), pop60=g('pop60'), lvl=g('lvl'), lvl30=g('lvl30'), dead=g('dead'), left=g('left'), score=g('score'),
                power=g('power'), dogs=g('dogs'), l5=med(ld(5)), l11=med(ld(11)), l15=med(ld(15)),
                joined={k: round(sum(r['joined'].get(k, 0) for r in rs) / len(rs), 1) for k in ['gate', 'kids', 'rescued', 'stronghold', 'ally', 'refugees', 'conquest', 'captured', 'convoy', 'dogs', 'pups']},
                flog={k: round(sum(r['flog'].get(k, 0) for r in rs) / len(rs), 1) for k in ['paid', 'raids', 'raids_won', 'burnt', 'taken', 'trades', 'helped', 'gifts']},
                allies=round(sum(len(r['allies']) for r in rs) / len(rs), 2), gone=round(sum(len(r['gone']) for r in rs) / len(rs), 2),
                missions=round(sum(sum(r['missions'].values()) for r in rs) / len(rs), 1),
                winrate=round(sum(sum(r['wins'].values()) for r in rs) / max(1, sum(sum(r['missions'].values()) for r in rs)), 2),
                era2=round(sum('era2' in r['keys'] for r in rs) / len(rs), 2), era3=round(sum('era3' in r['keys'] for r in rs) / len(rs), 2))


if __name__ == '__main__':
    if len(sys.argv) > 1 and sys.argv[1] == 'one':
        r = Town(sys.argv[2], sys.argv[3], int(sys.argv[4])).run()
        for t in r['timeline'][::5]: print(t)
        print({k: v for k, v in r.items() if k != 'timeline'})
