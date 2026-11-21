"""The balance scorecard (Balance chat, 21 Nov 2026; docs/project/13-LONG-GAME.md, section 9).
    python3 tools/balance/scorecard.py --daily DIR --keen DIR --open DIR [--md OUT.md]
Each DIR holds the s<seed>.jsonl files that tools/balance/long_study.py writes: one town each. A player can be left out.
Daily = 10 minutes once a real day, keen = 20 minutes twice a day, open = the game open all the time.
Prints one table: what, the range wanted, what each player's towns did (lowest to highest town), and a verdict:
ok (inside the range), near (outside by less than 15% of the range's width), OUT. A line nobody measured says so.
Ranges are the ones on the page; change them there and here together."""
import sys, os, json, glob, argparse

GAME_DAY_MIN = 24 * 1000 / 60 / 60   # one game day with the game open: 6.7 real minutes


def load(d):
    out = []
    for f in sorted(glob.glob(os.path.join(d, 's*.jsonl'))) if d else []:
        rows = [json.loads(l) for l in open(f) if l.strip()]
        if rows: out.append(rows)
    return out


def rday(r, kind):   # real days since the town was started
    return r['realDay'] if 'realDay' in r else r['day'] * GAME_DAY_MIN / 1440


def first(rows, lvl, kind):
    for r in rows:
        if r['lvl'] >= lvl: return rday(r, kind)
    return None


def era_of(l): return 1 if l <= 5 else 2 if l <= 10 else 3 if l <= 15 else 4


def era_rows(rows, e): return [r for r in rows if era_of(r['lvl']) == e]


def nights(rows):
    out = []
    for r in rows:
        if 'nights' in r: out += [dict(n, lvl=r['lvl']) for n in r['nights']]
        elif 'realDay' not in r: out.append({'boss': r['bossNight'], 'downs': r['downs'], 'deaths': r['deathsDay'], 'lvl': r['lvl']})   # older open runs: a line is a game day
    return out


def end_of_era(rows, e, key):
    x = era_rows(rows, e)
    done = any(era_of(r['lvl']) > e for r in rows)
    return x[-1][key] if x and done else None


CAPS = {'food': 'cap', 'water': 'cap', 'wood': 'mcap', 'stone': 'mcap', 'mat': 'scap'}
NAMES = {'food': 'food', 'water': 'water', 'wood': 'wood', 'stone': 'stone', 'mat': 'scrap'}


def full_stocks(rows):
    bad = []
    for e in (1, 2, 3, 4):
        x = [r for r in era_rows(rows, e) if r.get('cap')]
        if len(x) < 5: continue
        for k, c in CAPS.items():
            if sum(1 for r in x if r[k] >= .95 * r[c]) > len(x) / 2: bad.append('%s era %d' % (NAMES[k], e))
    return bad


def short_stock(rows):
    out = []
    for e in (1, 2, 3, 4):
        x = [r for r in era_rows(rows, e) if r.get('cap')]
        if len(x) < 5: continue
        share = {k: sum(1 for r in x if r[k] < .15 * r[c]) / len(x) for k, c in CAPS.items()}
        k = max(share, key=share.get)
        out.append('%s %d%%' % (NAMES[k], round(100 * share[k])) if share[k] >= .2 else 'none')
    return out


def fmt(v, unit=''):
    if v is None: return None
    if isinstance(v, float): v = round(v, 1) if abs(v) < 10 else round(v)
    return '%s%s' % (v, unit)


def verdict(vals, lo, hi):
    vals = [v for v in vals if v is not None]
    if not vals or (lo is None and hi is None): return ''
    w = (hi - lo) if (lo is not None and hi is not None and hi > lo) else max(1, abs(hi if hi is not None else lo))
    worst = 0
    for v in vals:
        d = (lo - v) if (lo is not None and v < lo) else (v - hi) if (hi is not None and v > hi) else 0
        worst = max(worst, d / w)
    return 'ok' if worst == 0 else 'near' if worst <= .15 else 'OUT'


def cell(towns, fn, lo, hi, unit=''):
    vals = [fn(t) for t in towns]
    got = [v for v in vals if v is not None]
    if not towns: return '', ''
    if not got: return 'not reached yet', ''
    txt = fmt(min(got), unit) if min(got) == max(got) else '%s to %s' % (fmt(min(got)), fmt(max(got), unit))
    if len(got) < len(vals): txt += ' (%d of %d towns)' % (len(got), len(vals))
    return txt, verdict(got, lo, hi)


def main():
    ap = argparse.ArgumentParser(); [ap.add_argument('--' + k, default='') for k in ('daily', 'keen', 'open', 'md')]; a = ap.parse_args()
    P = {'daily': load(a.daily), 'keen': load(a.keen), 'open': load(a.open)}
    d15 = [first(t, 15, 'daily') for t in P['daily']]; d15 = [v for v in d15 if v is not None]; base = sum(d15) / len(d15) if d15 else None
    L = []   # (what, range text, lo, hi, unit, fn, players)

    def add(what, rng, lo, hi, fn, players=('daily', 'keen', 'open'), unit=''): L.append((what, rng, lo, hi, unit, fn, players))
    add('Level 3, real day', 'day 1 (the first sitting)', 0, 1.1, lambda t: first(t, 3, 0), ('daily',))
    add('Level 5, real day', '2 to 3', 2, 3.2, lambda t: first(t, 5, 0), ('daily',))
    add('Level 10, real day', '16 to 22', 16, 22, lambda t: first(t, 10, 0), ('daily',))
    add('Level 15, real day', '28 to 42', 28, 42, lambda t: first(t, 15, 0), ('daily',))
    add('Level 20, real day', '55 to 75', 55, 75, lambda t: first(t, 20, 0), ('daily',))
    if base:
        add('Level 15 against the daily player (real day %d)' % round(base), 'at most a third faster: day %d or later' % round(base * .67), base * .67, None, lambda t: first(t, 15, 0), ('keen', 'open'))
    add('Deaths before level 15', '3 to 8', 0, 8, lambda t: sum(r['deathsDay'] for r in t if r['lvl'] < 15) if any(r['lvl'] >= 15 for r in t) else None)
    gday = lambda r: r.get('dayEnd', r['day'])
    add('Deaths in 10 game days at levels 16 to 20 (a daily player\'s week)', 'at most 1', 0, 1, lambda t: (lambda x: None if len(x) < 5 else 10 * sum(r['deathsDay'] for r in x) / max(1, gday(x[-1]) - gday(x[0])))(era_rows(t, 4)))
    add('Most deaths in one night', '2 or fewer', 0, 2, lambda t: max([n['deaths'] for n in nights(t)] or [0]))
    add('Town lost', 'never', 0, 0, lambda t: 1 if t[-1]['sv'] == 0 else 0)
    add('Ordinary nights with nobody down, %', '65 to 85', 65, 85, lambda t: (lambda n: None if len(n) < 5 else 100 * sum(1 for q in n if q['downs'] == 0) / len(n))([n for n in nights(t) if not n['boss']]))
    for e, lo, hi in ((1, 45, 75), (2, 90, 150), (3, 180, 300)):
        add('Big horde, the usual boss night, era %d' % e, '%d to %d' % (lo, hi), lo, hi, lambda t, e=e: (lambda b: None if not b else sorted(b)[len(b) // 2])([sum(r['night'].values()) for r in era_rows(t, e) if r.get('bossNight') and 'realDay' not in r]), ('open',))   # the middle boss night; zombies that came between 20:00 and 06:00
    add('Most zombies standing at once', '60 or fewer', 0, 60, lambda t: max(max(r['peak'], r['peakNight']) for r in t))
    for e, lo, hi in ((1, 12, 18), (2, 24, 36), (3, 40, 60)):
        add('People at the end of era %d' % e, '%d to %d' % (lo, hi), lo, hi, lambda t, e=e: end_of_era(t, e, 'sv'))
    for e, lo, hi in ((1, 21, 29), (2, 34, 46), (3, 47, 63)):
        add('Buildings at the end of era %d' % e, '%d to %d' % (lo, hi), lo, hi, lambda t, e=e: end_of_era(t, e, 'nb'))
    add('People who walked out, whole run', '2 or fewer an era', 0, 6, lambda t: t[-1].get('left'))
    add('Logic checks that fired', 'none', 0, 0, lambda t: sum(len(r['issues']) + len(r['errs']) + len(r['timerErrs']) + (1 if r['stepErr'] else 0) for r in t))
    rows = ['| What | Range wanted | Daily | Keen | Open | Verdict |', '|---|---|---|---|---|---|']
    for what, rng, lo, hi, unit, fn, players in L:
        cells, vs = [], []
        for k in ('daily', 'keen', 'open'):
            if k not in players: cells.append(''); continue
            txt, v = cell(P[k], fn, lo, hi, unit)
            if not P[k]: txt = 'not run'
            if k == 'open' and 'real day' in what and txt and txt[0].isdigit(): txt += ' (game open day and night)'
            cells.append(txt); vs.append(v)
        order = {'OUT': 3, 'near': 2, 'ok': 1, '': 0}; v = max(vs or [''], key=lambda q: order[q])
        rows.append('| %s | %s | %s | %s | %s | %s |' % (what, rng, cells[0], cells[1], cells[2], {'OUT': '**OUT**', 'near': 'near', 'ok': 'ok', '': 'not measured'}[v]))
    for name, fn in (('A stock at its limit for more than half an era', full_stocks), ('The short stock, era by era (share of days under 15%)', short_stock)):
        cs = []
        for k in ('daily', 'keen', 'open'):
            if not P[k]: cs.append('not run'); continue
            seen = [fn(t) for t in P[k]]
            cs.append('; '.join(sorted({x for s in seen for x in s})) if name.startswith('A stock') else ' / '.join(', '.join(s) for s in seen) or 'none')
        bad = name.startswith('A stock') and any(c not in ('', 'not run') for c in cs) or (not name.startswith('A stock') and any('food' in c for c in cs))
        rows.append('| %s | %s | %s | %s | %s | %s |' % (name, 'none' if name.startswith('A stock') else 'one in each era, never food', cs[0] or 'none', cs[1] or 'none', cs[2] or 'none', '**OUT**' if bad else 'ok'))
    rows.append('| Renown and research points unspent at the end | less than two weeks of income | %s | not judged: the bot spends neither |' % ' | '.join(('%s renown, %s points' % (max(t[-1]['ren'] for t in P[k]), max(t[-1]['rp'] for t in P[k])) if P[k] else 'not run') for k in ('daily', 'keen', 'open')))
    head = 'Towns: daily %d (longest %s real days), keen %d (longest %s real days), open %d (longest %s game days).' % (
        len(P['daily']), fmt(max([t[-1].get('realDay', 0) for t in P['daily']] or [0])), len(P['keen']), fmt(max([t[-1].get('realDay', 0) for t in P['keen']] or [0])), len(P['open']), max([t[-1]['day'] for t in P['open']] or [0]))
    text = head + '\n\n' + '\n'.join(rows) + '\n'
    print(text)
    if a.md: open(a.md, 'w').write(text)


main()
