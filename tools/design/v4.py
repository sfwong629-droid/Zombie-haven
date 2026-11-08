import sys, os, json, statistics as st
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__))); import havensim as H
N=150; R={}
def go(name, style, skill, tune=None, feats=None, days=90):
    H.T['REAL_DAYS']=days; rs=H.batch(style, skill, N, tune, feats); m=H.summ(rs)
    ms={L:(st.median([r['lvl_day'][L] for r in rs if L in r['lvl_day']]) if any(L in r['lvl_day'] for r in rs) else None, round(sum(L in r['lvl_day'] for r in rs)/len(rs),2)) for L in (5,11,15)}
    m['ms']=ms; R[name]=m
    print(f"{name:28} score {m['score']:6.0f} pop {m['pop']:4.1f} lvl {m['lvl']:4.1f} dead {m['dead']:3.1f} L5 {ms[5]} L11 {ms[11]} L15 {ms[15]}", flush=True)
for sk in ('smart','good','auto','casual'): go(f'ladder/{sk}','balanced',sk)
for stl in H.STYLES: go(f'style/{stl}/smart',stl,'smart')
for stl in H.STYLES: go(f'style/{stl}/good',stl,'good')
for b in ('radio','market','walls','gym','kennel','clinic','lounge','kitchen'): go(f'ban/{b}','balanced','smart',feats={'ban':[b]})
for f in ('pets','factions','missions'): go(f'off/{f}','balanced','smart',feats={f:False})
go('off/missions/builder','builder','smart',feats={'missions':False})
for dpr,lab in ((3,'20min'),(6,'40min'),(13,'90min')): go(f'long180/{lab}/smart','balanced','smart',tune=dict(DAYS_PER_REAL=dpr),days=180)
for sk in ('good','auto','casual'): go(f'long180/40min/{sk}','balanced',sk,days=180)
for stl in H.STYLES: go(f'long180/style/{stl}','balanced' if False else stl,'smart',days=180)
json.dump(R, open(os.path.join(os.path.dirname(os.path.abspath(__file__)),'out','study_v4.json'),'w'), indent=1, default=str)
