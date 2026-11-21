#!/bin/bash
# build_gallop.sh [OUTDIR] : 3D.256, the Dog's and the Stag's run is a real gallop, one foot landing at a time (owner, 21 Nov, W193). The run
# (zombie_run) of the game's own model is replaced by doggallop.py's (the stride the game moves them per cycle: Dog .62, Stag .9, as in js/render3d.js);
# every other animation and the body are left as they are. Writes the new game files into assets/; check: tools/qa/gallop_check.sh.
set -eo pipefail; O=${1:-/tmp/sw}; D=$(cd "$(dirname "$0")" && pwd); R=$(cd $D/../../.. && pwd); cd $R
for k in dog stag; do st=.62; [ $k = stag ] && st=.9; A=assets/characters/ai3d_v2/zombie_$k.glb
  [ -f $O/cur_$k.raw.glb ] || node tools/art/decomp.mjs $A $O/cur_$k.raw.glb >/dev/null
  rm -f $O/gal_$k.json; ZH_STRIDE=$st python3 $D/doggallop.py -- $O/cur_$k.raw.glb $O/gal_$k.json 2>&1 | grep -E "GALLOP|Error|Trace"; [ -s $O/gal_$k.json ] && [ $O/gal_$k.json -nt $O/cur_$k.raw.glb ]
  node tools/art/inject_clips.mjs $O/cur_$k.raw.glb $O/gal_$k.raw.glb zombie_run=$O/gal_$k.json | tail -1
  node tools/art/compress_glb.mjs $O/gal_$k.raw.glb $A | tail -1
done
