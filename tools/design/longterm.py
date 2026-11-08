"""Long-term run of the Haven 2.0 model: 180 real days (about 6 months at 40 min a day).
    python3 tools/design/longterm.py [N]"""
import sys, os, json, statistics as st
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import havensim as H
N = int(sys.argv[1]) if len(sys.argv) > 1 else 40
H.T['REAL_DAYS'] = 180
OUT = os.path.join(os.path.dirname(os.path.abspath(__file__)), 'out'); R = {}
def run(name, style, skill, tune=None, feats=None):
    rs = H.batch(style, skill, N, tune, feats)
    ms = {}
    for L in (3, 5, 8, 11, 13, 15):
        xs = [r['lvl_day'].get(L) for r in rs]; got = [x for x in xs if x is not None]
        ms[L] = (st.median(got) if got else None, round(len(got) / len(rs), 2))
    curve = {}
    for r in rs:
        for t in r['timeline']:
            c = curve.setdefault(t['rd'], [0, 0, 0, 0, 0]); c[0] += t['pop']; c[1] += t['lvl']; c[2] += t['dead']; c[3] += t['allies']; c[4] += 1
    cv = {rd: (round(c[0] / c[4], 1), round(c[1] / c[4], 1), round(c[2] / c[4], 1)) for rd, c in sorted(curve.items()) if rd in (1, 3, 7, 14, 30, 45, 60, 90, 120, 150, 180)}
    m = H.summ(rs); m['milestones'] = ms; m['curve'] = cv; m['collapsed'] = round(sum(1 for r in rs if r['pop'] < 4) / len(rs), 2)
    R[name] = m
    print(f"{name:26} score {m['score']:6.0f} pop {m['pop']:4.1f} lvl {m['lvl']:4.1f} dead {m['dead']:4.1f} left {m['left']:3.1f} col {m['collapsed']} | " + ' '.join(f"L{L}:{v[0]}({int(v[1]*100)}%)" for L, v in ms.items()) + ' | ' + ' '.join(f"d{k}:{v[0]}/{v[1]}" for k, v in cv.items()), flush=True)
for sk in ('smart', 'good', 'auto', 'casual', 'idle'): run(f'ladder/{sk}', 'balanced', sk)
for sk in ('smart', 'good'):
    for stl in H.STYLES: run(f'style/{stl}/{sk}', stl, sk)
for f in ('pets', 'factions', 'missions'): run(f'off/{f}/smart', 'balanced', 'smart', feats={f: False})
for dpr, lab in ((3, '20min'), (13, '90min')): run(f'session/{lab}/smart', 'balanced', 'smart', tune=dict(DAYS_PER_REAL=dpr))
json.dump(R, open(os.path.join(OUT, 'longterm.json'), 'w'), indent=1, default=str)
