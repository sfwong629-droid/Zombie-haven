"""Group fights with the game's formulas: a Lv3 fighter (stats 5, Guard +3 damage) against
   S1: 1 walker, S2: 3 walkers arriving together, S3: 2 runners, S4: brute + 2 walkers, S5: 1 raider.
   Ranged weapons start firing at their range; melee waits for contact. 'rate' scales the recovery between attacks."""
import random, json, statistics as st, sys, math
ZT = { 'walker': (30, 4, .0125, 58), 'runner': (25, 5, .027, 38), 'brute': (105, 12, .008, 82), 'raider': (55, 7, .019, 58), 'bloated': (60, 8, .009, 58) }
SCEN = { 'S1 walker': ['walker'], 'S2 3 walkers': ['walker'] * 3, 'S3 2 runners': ['runner'] * 2, 'S4 brute+2': ['brute', 'walker', 'walker'], 'S5 raider': ['raider'] }
def fight(w, arm, acc, hat, zs, lv=3, bonus=3, n=300, seed=1):
    rnd = random.Random(seed); out = []
    S = dict(str=5, per=5, agi=5, end=5)
    for it in (w, arm, acc, hat):
        for k, v in (it or {}).get('st', {}).items():
            if k in S: S[k] += v
    hpmax = 48 + 8 * lv + 2 * S['end']; dfn = (arm or {}).get('def', 0) + (hat or {}).get('def', 0); red = min(.6, dfn * .03 + (S['end'] - 5) * .012)
    dmg = round(4 + w['atk'] * .55 + (S['per'] if w.get('ranged') else S['str']) * .6 + bonus)
    rate = w.get('rate', 1); rec = 48 * max(.6, 1 - (S['agi'] - 5) * .02) * rate; wind = 32 * rate
    for _ in range(n):
        Z = [dict(t=k, hp=ZT[k][0], d=(w.get('range', 4) if w.get('ranged') else 3) + i * .3 + rnd.random() * .3, nxt=None) for i, k in enumerate(zs)]
        hp = hpmax; t = 0; s_next = wind; taken = 0; ammo = w.get('mag', 0); reloads = 0
        while hp > 0 and any(z['hp'] > 0 for z in Z) and t < 9000:
            t += 1; live = [z for z in Z if z['hp'] > 0]
            for z in live:
                if z['d'] > .45: z['d'] -= ZT[z['t']][2]
                elif z['nxt'] is None: z['nxt'] = t + 26
                if z['nxt'] is not None and t >= z['nxt']:
                    x = (ZT[z['t']][1] + (2 if z['t'] == 'brute' else 0)) * (1 - red); h = max(1, int(x) + (1 if rnd.random() < x - int(x) else 0)); hp -= h; taken += h; z['nxt'] = t + 26 + ZT[z['t']][3] + rnd.random() * 22
            reach = w.get('range', 4) if w.get('ranged') else .5
            tg = min((z for z in live if z['d'] <= reach + .01), key=lambda z: (z['d'] > .5, z['hp']), default=None)
            if tg and t >= s_next:
                tg['hp'] -= dmg; s_next = t + rec + wind
                if w.get('mag'):
                    ammo -= 1
                    if ammo <= 0: ammo = w['mag']; s_next = t + w['reload'] * 60; reloads += 1   # out: reload before the next shot
            elif not tg and t >= s_next: s_next = t   # nothing in reach: ready the moment one is
        out.append((t / 60, taken, hp > 0, reloads))
    return dict(reloads=round(st.mean(o[3] for o in out), 1), ttk=round(st.mean(o[0] for o in out), 2), taken=round(st.mean(o[1] for o in out), 1), win=round(sum(o[2] for o in out) / n, 2), hpmax=hpmax)
def power(r):   # one number per weapon: speed of clearing x share of health kept, averaged over the scenarios
    return round(st.mean((1 / max(.3, v['ttk'])) * max(0, 1 - v['taken'] / v['hpmax']) * v['win'] for v in r.values()), 3)
if __name__ == '__main__':
    items = json.load(open(sys.argv[1])); out = {}
    for k, it in items.items():
        if it['slot'] == 'weapon': r = {s: fight(it, None, None, None, zs) for s, zs in SCEN.items()}
        elif it['slot'] == 'armor': r = {s: fight(items['bat'], it, None, None, zs) for s, zs in SCEN.items()}
        elif it['slot'] == 'head': r = {s: fight(items['bat'], None, None, it, zs) for s, zs in SCEN.items()}
        else: r = {s: fight(items['bat'] if it.get('st', {}).get('per') is None else items['pistol'], None, it, None, zs) for s, zs in SCEN.items()}
        out[k] = dict(r=r, power=power(r), cost=it['cost'], slot=it['slot'], name=it['name'])
    json.dump(out, open(sys.argv[2], 'w'), indent=1)
    for slot in ['weapon', 'armor', 'head', 'acc']:
        rows = sorted([(k, v) for k, v in out.items() if v['slot'] == slot], key=lambda x: (x[1]['cost'], x[1]['power']))
        if not rows: continue
        print(f'\n{slot.upper():8} {"cost":>4} {"power":>6} {"pow/cost-curve":>14}  ' + '  '.join(f'{s[:11]:>17}' for s in SCEN))
        for k, v in rows:
            print(f'{k:8} {v["cost"]:>4} {v["power"]:>6}                 ' + '  '.join(f"{v['r'][s]['ttk']:5.1f}s {v['r'][s]['taken']:3.0f}hp {int(v['r'][s]['win']*100):3d}%" for s in SCEN))
