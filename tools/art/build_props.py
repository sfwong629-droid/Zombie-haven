#!/usr/bin/env python3
"""Map prop strips from ChatGPT dumps -> assets/map/v7/<name>.png + entries in assets/map/v7/map.json.

    python3 tools/art/build_props.py wreck     # tools/art/sheets/m_wreck.txt  (wreckage for locked areas)
    python3 tools/art/build_props.py props     # tools/art/sheets/m_props.txt  (trees, rocks, crates...)

Each strip is one row of separate props; anchor (ax, ay) = bottom centre (the spot the prop stands on).
"""
import json, os, sys
sys.path.insert(0, os.path.dirname(__file__))
from ingest import load_sheet, clean, quantize_set, tidy
from build_chars import despeckle, split_wide
from PIL import Image

ROOT = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
SH = os.path.join(os.path.dirname(__file__), 'sheets'); OUT = os.path.join(ROOT, 'assets', 'map', 'v7')
NAMES = {
    'wreck': ['car', 'truck', 'shack', 'fence', 'pole', 'concrete', 'mattress', 'drums', 'barricade', 'smoulder'],
    'props': ['pine', 'pine', 'pine', 'deadtree', 'deadtree', 'bush', 'bush', 'rock', 'rock', 'crate', 'barrel', 'barrel', 'tyres', 'rubble', 'rubble', 'car'],
}

SCALE = {'props': {'car': 1.4}}   # owner: wrecked car bigger, closer to the wreckage cars

def main():
    kind = sys.argv[1] if len(sys.argv) > 1 else 'wreck'; names = NAMES[kind]
    _, F = load_sheet(os.path.join(SH, 'm_' + kind + '.txt'))
    F = split_wide([despeckle(clean(f), 8) for f in F], len(names))
    if len(F) != len(names): print(f'warning: {len(F)} props found, {len(names)} expected')
    for i, k in enumerate(names[:len(F)]):
        z = SCALE.get(kind, {}).get(k)
        if z: F[i] = F[i].resize((round(F[i].width * z), round(F[i].height * z)), Image.LANCZOS)
    F = [tidy(f) for f in quantize_set(F, 48)]
    W = sum(f.width + 2 for f in F); H = max(f.height for f in F)
    strip = Image.new('RGBA', (W, H), (0, 0, 0, 0)); x = 0; items = []
    for i, f in enumerate(F):
        strip.alpha_composite(f, (x, H - f.height))
        items.append({'k': names[i] if i < len(names) else 'extra', 'x': x, 'y': H - f.height, 'w': f.width, 'h': f.height, 'ax': f.width // 2, 'ay': f.height - 2})
        x += f.width + 2
    strip.save(os.path.join(OUT, kind + '.png'))
    mp = os.path.join(OUT, 'map.json'); meta = json.load(open(mp))
    meta[kind] = items; json.dump(meta, open(mp, 'w'))
    print(kind, strip.size, [(it['k'], it['w'], it['h']) for it in items])

if __name__ == '__main__':
    main()
