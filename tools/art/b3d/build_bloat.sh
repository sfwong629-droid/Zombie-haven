#!/bin/bash
# build_bloat.sh MODEL [OUTDIR] : 3D.257 the Bloater Queen's arms in the walk and her sweep and belly slam (owner, 21 Nov, W199: "the bloater queen looks
# good"); MODEL queen or bloated (3D.267, owner W200: "try b": the same moves as on the sheet, his shirt stretching under the arms, since his arms are modelled
# joined to his belly). bloated_walk and bloated_attack of the game's own model are replaced by bloatmove.py's;
# every other animation and the body are left as they are. Writes the game file in assets/; check: tools/qa/bloat_check.sh.
set -eo pipefail; k=$1; O=${2:-/tmp/sw}; D=$(cd "$(dirname "$0")" && pwd); R=$(cd $D/../../.. && pwd); cd $R; A=assets/characters/ai3d_v2/zombie_$k.glb
git show 3a1468a:$A > $O/src_$k.glb; node tools/art/decomp.mjs $O/src_$k.glb $O/cur_$k.raw.glb >/dev/null   # always from the 3D.256 file (before the arms), never from a file already built
for m in walk attack; do rm -f $O/bm_${k}_$m.json; ZH_KIND=$k python3 $D/bloatmove.py -- $O/cur_$k.raw.glb $m $O/bm_${k}_$m.json 2>&1 | grep -E "BLOAT|Error|Trace"; [ -s $O/bm_${k}_$m.json ]; done
node tools/art/inject_clips.mjs $O/cur_$k.raw.glb $O/bm_$k.raw.glb bloated_walk=$O/bm_${k}_walk.json bloated_attack=$O/bm_${k}_attack.json | tail -1
node tools/art/compress_glb.mjs $O/bm_$k.raw.glb $A | tail -1
