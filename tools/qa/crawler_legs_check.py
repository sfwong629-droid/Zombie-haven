#!/usr/bin/env python3
"""tools/qa/crawler_legs_check.py  3D.185 owner: "Crawler should have no leg".
Reads both Crawler model files and fails if the body reaches below thigh height: with legs the lowest point is the feet
(height 0), without them it is the stumps (about 0.36). Exit 0 ok, 1 a Crawler still has legs."""
import json, struct, sys, os
R = os.path.join(os.path.dirname(os.path.abspath(__file__)), '..', '..'); bad = 0
for n in ('zombie_crawler', 'zombie_crawler_m'):
    b = open(os.path.join(R, 'assets/characters/ai3d_v2', n + '.glb'), 'rb').read(); j = json.loads(b[20:20 + struct.unpack('<I', b[12:16])[0]])
    body = next(x for x in j['nodes'] if 'mesh' in x and 'skin' in x); low = min(j['accessors'][p['attributes']['POSITION']]['min'][1] for p in j['meshes'][body['mesh']]['primitives'])
    ok = low > .3; bad += not ok; print(('ok   ' if ok else 'FAIL ') + n + ': lowest point of the body at height %.3f, %d clips' % (low, len(j['animations'])))
print('FAIL: a Crawler still has legs' if bad else 'ok: both Crawlers end at the thigh'); sys.exit(1 if bad else 0)
