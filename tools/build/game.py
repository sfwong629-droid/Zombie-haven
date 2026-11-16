#!/usr/bin/env python3
"""js/game.js is kept as area files in src/game/ (bug C3).

  python3 tools/build/game.py            join src/game/*.js into js/game.js   (after editing an area file)
  python3 tools/build/game.py --split    cut js/game.js back into the area files (after editing js/game.js directly)
  python3 tools/build/game.py --check    exit 1 if the two differ (the test suite runs this as the 'parts' test)

The area files are plain cuts of game.js, joined in the order of src/game/parts.json with nothing added, so the
joined file is exactly the game. Each area starts at a section header line of game.js; parts.json holds that line
('starts'), which is how --split finds the cuts again. To move a cut or add an area, edit parts.json and run --split.
The areas still share one scope (game.js is a single function), so the order in parts.json matters.
"""
import json, os, sys
R = os.path.abspath(os.path.join(os.path.dirname(__file__), '..', '..'))
GAME, DIR = os.path.join(R, 'js', 'game.js'), os.path.join(R, 'src', 'game')
MAN = os.path.join(DIR, 'parts.json')

def manifest(): return json.load(open(MAN, encoding='utf-8'))
def joined(): return b''.join(open(os.path.join(DIR, p['file']), 'rb').read() for p in manifest())

def split():
    lines = open(GAME, 'rb').read().split(b'\n'); parts = manifest(); cuts = [0]
    for p in parts[1:]:
        want = p['starts'].encode('utf-8'); at = [i for i, l in enumerate(lines) if l == want]
        if len(at) != 1: sys.exit(f"--split: the first line of {p['file']} is found {len(at)} times in js/game.js (it must be there once):\n  {p['starts'][:120]}")
        cuts.append(at[0])
    if cuts != sorted(cuts): sys.exit('--split: the areas in parts.json are not in the order they have in js/game.js')
    cuts.append(len(lines))
    for p, a, b in zip(parts, cuts, cuts[1:]):
        body = b'\n'.join(lines[a:b]) + (b'\n' if b < len(lines) else b'')
        open(os.path.join(DIR, p['file']), 'wb').write(body)
    if joined() != open(GAME, 'rb').read(): sys.exit('--split: the area files do not join back into js/game.js (bug in this script)')
    print(f'split js/game.js into {len(parts)} area files in src/game/')

def check():
    if joined() == open(GAME, 'rb').read(): return True
    print('js/game.js and the area files in src/game/ differ.\n  If you edited an area file:   python3 tools/build/game.py\n  If you edited js/game.js:     python3 tools/build/game.py --split'); return False

if __name__ == '__main__':
    a = sys.argv[1:]
    if a == ['--split']: split()
    elif a == ['--check']: sys.exit(0 if check() else 1)
    elif not a:
        for p in manifest()[1:]:
            first = open(os.path.join(DIR, p['file']), 'rb').read().split(b'\n', 1)[0].decode('utf-8')
            if first != p['starts']: sys.exit(f"{p['file']} no longer starts with its header line. Put the line back, or update 'starts' in src/game/parts.json:\n  {p['starts'][:120]}")
        open(GAME, 'wb').write(joined()); print(f'joined {len(manifest())} area files into js/game.js')
    else: sys.exit(__doc__)
