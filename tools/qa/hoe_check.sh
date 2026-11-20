#!/bin/sh
# tools/qa/hoe_check.sh — 3D.241: the hoe in Dig (owner, 20 Nov: "the sharp end should face the ground, not the shaft").
# For both models, in work_dig: at the strike the blade points down (it pointed up and away), its edge bites the ground 4 to 10 cm (it was the shaft's end
# that went in, 26 cm), the shaft's end stays above the blade's edge, and the shaft never passes through the body (one point by the hand allowed, as before).
set -e; cd "$(dirname "$0")/../.."; T=$(mktemp -d); bad=0
for m in m3 f3; do
  node tools/art/decomp.mjs assets/characters/ai3d_v2/survivor_$m.glb $T/$m.glb >/dev/null
  L=$(python3 tools/art/b3d/hoecheck.py -- $T/$m.glb 2>/dev/null | grep ^HOECHK); echo "$L" | sed "s/^HOECHK [^:]*/$m/"
  echo "$L" | python3 -c "
import sys,re; s=sys.stdin.read(); b,sh,dn=[float(x) for x in re.search(r'blade lowest (\S+), shaft lowest (\S+), blade down (\S+) ',s).groups()]; w=int(re.search(r'worst (\d+)',s).group(1))
ok=[(-.10<=b<=-.04,'the blade bites the ground 4 to 10 cm (%.3f)'%b),(sh>b,'the shaft stays above the blade edge'),(dn>=.35,'the blade points down at the strike (%.2f, at least 0.35)'%dn),(w<=1,'the shaft is not inside the body (%d points)'%w)]
for o,t in ok: print(('ok   ' if o else 'FAIL ')+'$m '+t)
sys.exit(0 if all(o for o,_ in ok) else 1)" || bad=1
done; rm -rf $T; [ $bad = 0 ] && echo "ALL OK" || { echo FAILED; exit 1; }
