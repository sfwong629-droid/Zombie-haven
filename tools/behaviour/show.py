import json, sys
st = json.load(open(sys.argv[1]))
def pct(d):
    t = sum(d.values()); return {k: round(100 * v / t, 1) for k, v in sorted(d.items(), key=lambda x: -x[1])}
print('roster', st['roster'])
print('\n== by job (% of time)')
for j, d in st['byJob'].items(): print(f'{j:12}', pct(d))
print('\n== by hour (top 4)')
for h in sorted(st['byHour'], key=int): p = pct(st['byHour'][h]); print(f'{int(h):02d}h', list(p.items())[:5])
print('\n== churn (category changes per person)', st['churn'])
print('\n== quick flips A->B->A within 4s', sorted(st['flips'].items(), key=lambda x: -x[1])[:12])
print('\n== stuck (moving but not moving 20 s)', st['stuck'])
print('\n== needAtWork', st['needAtWork'], 'nightWork', st['nightWork'], 'daySleep', st['dayRough'])
print('== starving idle (first 8)', st['starvingIdle'][:8], len(st['starvingIdle']))
print('\n== chats', sorted(st['chats'].items(), key=lambda x: -x[1]))
print('== bonds', sorted(st['bonds'], key=lambda x: -x[2])[:12])
print('== sv', st['sv'])
print('\n== top reasons')
for k, v in sorted(st['why'].items(), key=lambda x: -x[1])[:45]: print(v, k)
