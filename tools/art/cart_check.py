#!/usr/bin/env python3
"""Print the sample scale each row of a cart sheet needs so the pusher is 42 px tall.
    python3 tools/art/cart_check.py <tag>      -> 's0 s1' (0 = row already fine)"""
import json, os, sys
sys.path.insert(0, os.path.dirname(__file__))
from build_carts import row_frames, man_height, SH
tag = sys.argv[1]; p = os.path.join(SH, f'cart_{tag}.txt')
outer = json.load(open(p)); txt = outer[0]['text']
inner = json.JSONDecoder().raw_decode(txt)[0] if txt.startswith('"') else txt
s = json.loads(inner.strip())['s']; res = []
for r in (0, 1):
    hs = [man_height(f) for f in row_frames(p, r)]; h = sorted(hs)[len(hs) // 2] if hs else 42
    res.append(0 if abs(h - 42) <= 1 else round(s * h / 42, 3))
    print(f'row {r}: heights {hs} -> s {res[-1]}', file=sys.stderr)
print(*res)
