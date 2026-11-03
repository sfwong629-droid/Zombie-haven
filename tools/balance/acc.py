"""Accessory & hat check without hit-breakpoint luck: average over zombie toughness x0.8..1.6 (danger scaling) and survivor levels 2..6."""
import json, copy, statistics as st, sim2
items = json.load(open('items.json'))
base_ZT = copy.deepcopy(sim2.ZT)
def pw(w, acc=None, hat=None, arm=None):
    vals = []
    for m in (.8, 1.0, 1.2, 1.4, 1.6):
        sim2.ZT = {k: (round(v[0] * m), v[1] * (.8 + .2 * m), v[2], v[3]) for k, v in base_ZT.items()}
        for bo in (2.2, 2.6, 3.0, 3.4, 3.8):
            r = {s: sim2.fight(w, arm, acc, hat, zs, bonus=bo, n=50) for s, zs in sim2.SCEN.items()}; vals.append(sim2.power(r))
    sim2.ZT = base_ZT; return st.mean(vals)
res = {}
for wname in ('bat', 'pistol'):
    w = items[wname]; b = pw(w); res[wname] = {}
    for k, it in items.items():
        if it['slot'] not in ('acc', 'head'): continue
        g = pw(w, acc=it if it['slot'] == 'acc' else None, hat=it if it['slot'] == 'head' else None)
        res[wname][k] = round(100 * (g / b - 1), 1)
print(f"{'item':10}{'cost':>5}{'bat %':>8}{'pistol %':>10}{'%/part':>8}")
for k, it in items.items():
    if it['slot'] in ('acc', 'head'):
        best = max(res['bat'][k], res['pistol'][k]); print(f"{k:10}{it['cost']:>5}{res['bat'][k]:>8}{res['pistol'][k]:>10}{best / it['cost']:>8.1f}")
json.dump(res, open('acc_res.json', 'w'))
