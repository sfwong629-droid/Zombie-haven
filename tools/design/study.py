"""Runs every scenario of the Haven 2.0 balancing plan through havensim and writes tools/design/out/study.json.

    python3 tools/design/study.py [N]      # N towns per scenario (default 40)
"""
import sys, os, json, statistics as st, time
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import havensim as H

N = int(sys.argv[1]) if len(sys.argv) > 1 else 40
OUT = os.path.join(os.path.dirname(os.path.abspath(__file__)), 'out'); os.makedirs(OUT, exist_ok=True)
R = {}
t0 = time.time()


def run(name, style, skill, tune=None, feats=None, n=N):
    rs = H.batch(style, skill, n, tune, feats)
    m = H.summ(rs)
    m['collapsed'] = round(sum(1 for r in rs if r['pop'] < 4) / len(rs), 2)
    m['score_sd'] = round(st.pstdev([r['score'] for r in rs]))
    # average curve by real day
    curve = {}
    for r in rs:
        for t in r['timeline']:
            c = curve.setdefault(t['rd'], [0, 0, 0, 0]); c[0] += t['pop']; c[1] += t['lvl']; c[2] += t['power']; c[3] += 1
    m['curve'] = {rd: (round(c[0] / c[3], 1), round(c[1] / c[3], 2), round(c[2] / c[3])) for rd, c in sorted(curve.items()) if rd % 5 == 0 or rd in (1, 2, 3, 7)}
    R[name] = m
    m['joined_'] = m['joined']; print(f"{name:34} score {m['score']:6.0f} pop {m['pop']:5.1f} p7 {m['pop7']:4.1f} p30 {m['pop30']:4.1f} lvl {m['lvl']:4.1f} L5 {m['l5']} L11 {m['l11']} dead {m['dead']:4.1f} left {m['left']:3.1f} col {m['collapsed']} allies {m['allies']} gone {m['gone']} mis {m['missions']} e2 {m['era2']} e3 {m['era3']}", flush=True)
    return m


# A. skill ladder (a player without a fixed style)
for sk in H.SKILLS[:1] + ['good'] + H.SKILLS[1:]:
    run(f'ladder/{sk}', 'balanced', sk)
# B. play styles at two skill levels
for sk in ('smart', 'good'):
    for stl in H.STYLES: run(f'style/{stl}/{sk}', stl, sk)
# C. systems: switch one off at a time (smart and good players, no fixed style)
for sk in ('smart', 'good'):
    for f in ('pets', 'factions', 'missions', 'gearStash', 'eraKeysAlt'):
        run(f'off/{f}/{sk}', 'balanced', sk, feats={f: False})
# D. buildings: ban one type at a time (smart, no fixed style)
for b in ('kitchen', 'clinic', 'walls', 'gym', 'workshop', 'kennel', 'lounge', 'market', 'radio', 'storage', 'quarry', 'well'):
    run(f'ban/{b}', 'balanced', 'smart', feats={'ban': [b]})
# E. factions: Tollmen aggression, diplomacy quality
for agg in (.5, .8, 1.0):
    H.FACTIONS['Tollmen']['agg'] = agg
    run(f'tollmen_agg/{agg}/diplomat', 'diplomat', 'smart'); run(f'tollmen_agg/{agg}/warlord', 'warlord', 'smart')
H.FACTIONS['Tollmen']['agg'] = .8
# F. pets: dog strength
for g, sc in ((0, 0), (5, 6), (10, 12), (20, 24)):
    run(f'dogs/guard{g}_scout{sc}', 'balanced', 'smart', tune=dict(DOG_GUARD=g, DOG_SCOUT=sc))
# G. strongholds: difficulty
for p_, m_ in ((150, 350), (200, 420), (260, 520)):
    H.LOC['prison']['diff'] = p_; H.LOC['military']['diff'] = m_
    run(f'stronghold/prison{p_}_military{m_}/smart', 'balanced', 'smart'); run(f'stronghold/prison{p_}_military{m_}/good', 'balanced', 'good')
H.LOC['prison']['diff'] = 200; H.LOC['military']['diff'] = 420
# H. sensitivity: arrivals, horde, upgrade time
for k, vals in (('ARRIVE_BASE', (.25, .35, .45)), ('HORDE_PER_DAY', (.2, .3, .4)), ('LVL_H', (1.5, 3, 6))):
    for v in vals:
        run(f'sens/{k}={v}/smart', 'balanced', 'smart', tune={k: v}); run(f'sens/{k}={v}/auto', 'balanced', 'auto', tune={k: v})
# I. how long people play each day (game days per real day)
for dpr, label in ((3, '20min'), (6, '40min'), (13, '90min')):
    run(f'session/{label}/smart', 'balanced', 'smart', tune=dict(DAYS_PER_REAL=dpr)); run(f'session/{label}/auto', 'balanced', 'auto', tune=dict(DAYS_PER_REAL=dpr))

json.dump(R, open(os.path.join(OUT, 'study.json'), 'w'), indent=1, default=str)
print(f'done in {time.time() - t0:.0f}s, {len(R)} scenarios x {N} towns')
