#!/usr/bin/env python3
"""copy the newest browser dump (tool-results/*javascript_tool*.txt) to tools/art/sheets/<tag>.txt and print a summary"""
import glob, os, sys, shutil, json
sys.path.insert(0, os.path.dirname(__file__))
from ingest import load_sheet
d = '/root/.claude/projects/*/*/tool-results/'
f = max(glob.glob(d + '*javascript_tool*.txt') + glob.glob(d + 'toolu_*.json') + glob.glob(d.replace('/*/tool', '/tool') + '*javascript_tool*.txt'), key=os.path.getmtime)
dst = os.path.join(os.path.dirname(__file__), 'sheets', sys.argv[1] + '.txt'); shutil.copy(f, dst)
meta, fr = load_sheet(dst)
rows = {}
for m in meta['frames']: rows.setdefault(m['r'], []).append(m['w'])
print(sys.argv[1], 'tag', meta['tag'], 's', meta['s'], 'rows', {r: len(v) for r, v in rows.items()}, 'heights', [m['h'] for m in meta['frames']])
