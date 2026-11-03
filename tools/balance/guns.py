"""Guns with magazines and real-ish reloads; fire speed tuned so each lands on the melee value curve."""
import json, sim2
I = json.load(open('items_new.json'))
# atk per shot, magazine, reload seconds (game time, scaled to the game's pace), from the real thing:
GUN = { 'pistol': (7, 12, 1.8), 'revolver': (16, 6, 3.0), 'shotgun': (34, 6, 4.5), 'rifle': (30, 5, 3.0), 'smg': (1, 30, 2.5), 'assault': (8, 30, 2.6), 'crossbow': (34, 1, 2.4), 'bow': (18, 0, 0) }
RANGE = { 'pistol': 3.4, 'revolver': 3.6, 'shotgun': 2.4, 'rifle': 4.8, 'smg': 3.6, 'assault': 4.4, 'crossbow': 4.6, 'bow': 4.2 }
target = lambda c: .075 + .0085 * c
def pw(it): return sim2.power({s: sim2.fight(it, None, None, None, zs, n=100) for s, zs in sim2.SCEN.items()})
for k, (atk, mag, rl) in GUN.items():
    it = I[k]; it.update(atk=atk, range=RANGE[k], ranged=True); it.pop('mag', None); it.pop('reload', None)
    if mag: it['mag'] = mag; it['reload'] = rl
    lo, hi = .3, 5
    for _ in range(12):
        it['rate'] = (lo + hi) / 2; p = pw(it)
        if p > target(it['cost']): lo = it['rate']
        else: hi = it['rate']
    it['rate'] = round((lo + hi) / 2, 2); p = pw(it)
    print(f"{k:9} cost {it['cost']:>2} atk {atk:>3} mag {mag:>2} reload {rl}s range {RANGE[k]}  shot every {it['rate'] * 80 / 60:.2f}s  power {p:.3f} (target {target(it['cost']):.3f})")
json.dump(I, open('items_new.json', 'w'), indent=1)
