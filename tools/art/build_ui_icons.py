#!/usr/bin/env python3
"""Menu icons from tools/art/sheets/ui_icons.txt -> assets/ui/icons.png (square cells) + icons.json."""
import json, os, sys
sys.path.insert(0, os.path.dirname(__file__))
from ingest import load_sheet, clean, quantize_set, tidy
from build_chars import despeckle
from PIL import Image
ROOT = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
NAMES = ['living', 'care', 'train', 'defend', 'road', 'demolish', 'events', 'trader', 'rating', 'supplies']
_, F = load_sheet(os.path.join(os.path.dirname(__file__), 'sheets', 'ui_icons.txt'))
F = [tidy(x) for x in quantize_set([despeckle(clean(f), 4) for f in F], 48)]
N = max(max(f.size) for f in F); strip = Image.new('RGBA', (N * len(F), N), (0, 0, 0, 0))
for i, f in enumerate(F): strip.alpha_composite(f, (i * N + (N - f.width) // 2, (N - f.height) // 2))
os.makedirs(os.path.join(ROOT, 'assets', 'ui'), exist_ok=True)
strip.save(os.path.join(ROOT, 'assets', 'ui', 'icons.png')); json.dump({'n': N, 'icons': NAMES}, open(os.path.join(ROOT, 'assets', 'ui', 'icons.json'), 'w'))
print('icons', N, len(F))
