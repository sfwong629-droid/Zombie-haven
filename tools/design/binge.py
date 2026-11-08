import sys, os, statistics as st, json
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__))); import havensim as H
H.T['REAL_DAYS'] = 180; R = {}
for cap in ((99, 0), (1.0, .1), (.6, .06)):
    for mins, dpr in ((20, 3), (40, 6), (90, 13), (240, 36)):
        rs = H.batch('balanced', 'smart', 60, dict(DAYS_PER_REAL=dpr, ARR_CAP0=cap[0], ARR_CAP_L=cap[1]))
        ms = {L: (st.median([r['lvl_day'][L] for r in rs if L in r['lvl_day']]) if any(L in r['lvl_day'] for r in rs) else None, round(sum(L in r['lvl_day'] for r in rs) / len(rs), 2)) for L in (5, 8, 11, 15)}
        k = f'cap{cap[0]}+{cap[1]}L/{mins}min'; R[k] = dict(ms=ms, pop=st.mean(r['pop'] for r in rs), dead=st.mean(r['dead'] for r in rs), score=st.mean(r['score'] for r in rs))
        print(k, 'pop %.1f dead %.1f score %.0f' % (R[k]['pop'], R[k]['dead'], R[k]['score']), ms, flush=True)
json.dump(R, open(os.path.join(os.path.dirname(os.path.abspath(__file__)), 'out', 'binge.json'), 'w'), indent=1)
