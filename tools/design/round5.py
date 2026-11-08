"""Round 5: binge sessions with a soft cap, short upgrades, celebration cadence, the endgame (end every hostile faction),
comeback-convoy use by skill, and how much land a level-15 town needs.   python3 tools/design/round5.py [N]"""
import sys, os, json, statistics as st
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__))); import havensim as H
N = int(sys.argv[1]) if len(sys.argv) > 1 else 100; R = {}
FP = dict(tent=1, cabin=2, stonehouse=1, farm=1, barrel=1, well=1, kitchen=2, scrapyard=1, lumber=2, quarry=2, workshop=2, armory=2, gym=1, range=2,
          clinic=2, hospital=2, tower=1, kennel=1, lounge=1, market=1, radio=1, storage=1)   # footprint tiles from the game's DEFS
def gaps(r, dpr):
    """celebrations: minutes of active play between them, early (first week) and later"""
    ds = sorted(set(d for d, _ in r['cele'])); out = {'early': [], 'late': []}
    for a, b in zip(ds, ds[1:]):
        (out['early'] if a <= 7 * dpr else out['late']).append((b - a) * 6.7)
    return out
def go(name, style, skill, days=180, tune=None, feats=None, n=N):
    H.T['REAL_DAYS'] = days; rs = H.batch(style, skill, n, tune, feats)
    dpr = (tune or {}).get('DAYS_PER_REAL', H.T['DAYS_PER_REAL'])
    ms = {L: (st.median([r['lvl_day'][L] for r in rs if L in r['lvl_day']]) if any(L in r['lvl_day'] for r in rs) else None, round(sum(L in r['lvl_day'] for r in rs) / len(rs), 2)) for L in (3, 5, 8, 11, 15)}
    ge = [g for r in rs for g in gaps(r, dpr)['early']]; gl = [g for r in rs for g in gaps(r, dpr)['late']]
    cele_per_day = st.mean(len(r['cele']) for r in rs) / days
    fp = st.mean(sum(FP.get(k, 1) * v for k, v in r['bld'].items() if k != 'walls') + 4 for r in rs)   # + the 2x2 HQ
    nb = st.mean(sum(v for k, v in r['bld'].items() if k != 'walls') for r in rs)
    m = dict(score=st.mean(r['score'] for r in rs), pop=st.mean(r['pop'] for r in rs), lvl=st.mean(r['lvl'] for r in rs), dead=st.mean(r['dead'] for r in rs), ms=ms,
             convoy=st.mean(r['joined'].get('convoy', 0) for r in rs), convoy_any=sum(1 for r in rs if r['joined'].get('convoy')) / len(rs),
             gap_early=st.median(ge) if ge else None, gap_late=st.median(gl) if gl else None, cele_per_day=cele_per_day,
             erad=st.mean(len(r['eradicated']) for r in rs), all_gone=sum(r['all_hostile_gone'] for r in rs) / len(rs), regroup=st.mean(r['flog'].get('regrouped', 0) for r in rs),
             fp=fp, nb=nb, walls=st.mean(r['bld'].get('walls', 0) for r in rs))
    R[name] = m
    print(f"{name:30} score {m['score']:5.0f} pop {m['pop']:4.1f} lvl {m['lvl']:4.1f} dead {m['dead']:3.1f} " + ' '.join(f"L{L}:{v[0]}({int(v[1]*100)}%)" for L, v in ms.items()) +
          f" | convoy {m['convoy']:.2f} ({m['convoy_any']:.0%}) | gaps {m['gap_early']}/{m['gap_late']} min, {m['cele_per_day']:.2f}/day | ended {m['erad']:.2f} all {m['all_gone']:.0%} regroup {m['regroup']:.1f} | land {m['fp']:.0f} tiles, {m['nb']:.0f} bld", flush=True)
# A. sessions, soft cap on/off
for mins, dpr in ((20, 3), (40, 6), (90, 13), (240, 36)):
    go(f'session/{mins}/smart', 'balanced', 'smart', tune=dict(DAYS_PER_REAL=dpr))
    if mins == 240: go(f'session/{mins}/smart/no-softcap', 'balanced', 'smart', tune=dict(DAYS_PER_REAL=dpr, SOFT_MULT=1.0))
    go(f'session/{mins}/good', 'balanced', 'good', tune=dict(DAYS_PER_REAL=dpr))
# B. ladder at 40 min (convoy use, cadence)
for sk in ('smart', 'good', 'auto', 'casual'): go(f'ladder/{sk}', 'balanced', sk)
# C. endgame by style, 180 and 365 days
for stl in H.STYLES: go(f'endgame/{stl}/180', stl, 'smart')
for stl in ('warlord', 'explorer', 'builder'): go(f'endgame/{stl}/365', stl, 'smart', days=365, n=60)
go('endgame/warlord/365/good', 'warlord', 'good', days=365, n=60)
json.dump(R, open(os.path.join(os.path.dirname(os.path.abspath(__file__)), 'out', 'round5.json'), 'w'), indent=1, default=str)
