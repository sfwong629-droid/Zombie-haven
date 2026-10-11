#!/usr/bin/env python3
"""Building sprites from the ChatGPT dumps (tools/art/sheets/b_<key>.txt, one re-pixelated sprite each).

    python3 tools/art/build_buildings.py [keys]

Output: assets/buildings/v7/<key>.png + meta.json {key: {w, h, fp}}.
Art standard: tiles 96 x 48 art px; 1x1 buildings ~94 px wide, 2x1 ~142, 2x2 ~190 (one art pixel = one map pixel).
"""
import glob, json, os, sys
sys.path.insert(0, os.path.dirname(__file__))
from ingest import load_sheet, clean, quantize_set, tidy
from build_chars import despeckle

ROOT = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
SH = os.path.join(os.path.dirname(__file__), 'sheets'); OUT = os.path.join(ROOT, 'assets', 'buildings', 'v7')
FP = {'house': '1x1', 'water': '1x1', 'well': '1x1', 'farm': '1x1', 'medic': '1x1', 'storage': '1x1', 'gym': '1x1', 'library': '1x1', 'lounge': '1x1',
      'workshop': '2x1', 'canteen': '2x1', 'armory': '2x1', 'clinic': '2x1', 'scrapyard': '2x1', 'range': '2x1', 'track': '2x1', 'sparring': '2x1',
      'hospital': '2x2', 'field': '2x2', 'barracks': '2x2'}

def main():
    os.makedirs(OUT, exist_ok=True); mp = os.path.join(OUT, 'meta.json'); meta = json.load(open(mp)) if os.path.exists(mp) else {}
    keys = sys.argv[1:] or sorted(os.path.basename(p)[2:-4] for p in glob.glob(os.path.join(SH, 'b_*.txt')))
    for k in keys:
        try:
            _, F = load_sheet(os.path.join(SH, f'b_{k}.txt'))
            im = despeckle(clean(F[0]), 12); im = tidy(quantize_set([im], 48)[0])
            im.save(os.path.join(OUT, k + '.png')); meta[k] = {'w': im.width, 'h': im.height, 'fp': FP.get(k, '1x1')}; print('built', k, im.size)
        except Exception as e: print('FAILED', k, e)
    json.dump(meta, open(mp, 'w'), indent=1)

if __name__ == '__main__':
    main()
