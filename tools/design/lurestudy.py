"""How essential is the Noise Lure? Score with the lure at different strengths vs. no lure at all (full building set)."""
import sys, os, json
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__))); sys.argv = sys.argv[:1] + ['150']
import buildstudy as S
S.H.T['REAL_DAYS'] = 120
for sk in ('smart', 'good', 'auto'):
    S.run(f'nolure/{sk}', 'full', skill=sk, ban=['lure'], n=150)
    for lu in (.15, .08, .05): S.run(f'lure{lu}/{sk}', 'full', skill=sk, X=dict(LURE=lu), n=150)
json.dump(S.R, open(os.path.join(S.OUT, 'lurestudy.json'), 'w'), indent=1, default=str)
