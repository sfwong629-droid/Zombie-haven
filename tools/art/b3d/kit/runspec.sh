#!/bin/bash
# runspec.sh id1 id2 ... — fit each armour with its options from tools/art/b3d/fits/specs.json, in parallel (a spec's "src" names the kit if it differs from the id)
D=$(cd "$(dirname "$0")" && pwd); SPEC=$D/../fits/specs.json; K=${ZH_KITS:-$(cd $D/../../../.. && pwd)/kits_work}; mkdir -p $K
for k in "$@"; do src=$(python3 -c "import json;print(json.load(open('$SPEC'))['$k'].get('src','$k'))"); $D/fitkit.sh $src $k "$(python3 -c "import json;print(json.dumps(json.load(open('$SPEC'))['$k']))")" > $K/log_$k.txt 2>&1 & done; wait
for k in "$@"; do echo "== $k"; grep -h "dropped\|islands\|pieces\|Traceback\|Error" $K/log_$k.txt | cut -c1-200; tail -qn1 $K/log_$k.txt | cut -c1-120; done
