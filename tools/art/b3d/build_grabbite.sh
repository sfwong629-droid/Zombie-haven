#!/bin/bash
# build_grabbite.sh [OUTDIR] : 3D.276 the Walker's grab and bite (owner, W204: "Yes, build it"). zombie_attack of both Walker files (zombie_walker.glb,
# zombie_walker_f.glb; no other zombie uses them) is replaced by grabbite.py's; every other animation and the body are left as they are.
# Check: tools/qa/grabbite_check.sh.
set -eo pipefail; O=${1:-/tmp/sw}; D=$(cd "$(dirname "$0")" && pwd); R=$(cd $D/../../.. && pwd); cd $R
for k in walker walker_f; do A=assets/characters/ai3d_v2/zombie_$k.glb
  git show ae0fcca:$A > $O/src_$k.glb; node tools/art/decomp.mjs $O/src_$k.glb $O/cur_$k.raw.glb >/dev/null; rm -f $O/gb_$k.json   # always from the 3D.274 file, never from a file already built
  python3 $D/grabbite.py -- $O/cur_$k.raw.glb $O/gb_$k.json 2>&1 | grep -E "GRABBITE|Error|Trace"; [ -s $O/gb_$k.json ]
  node tools/art/inject_clips.mjs $O/cur_$k.raw.glb $O/gbn_$k.raw.glb zombie_attack=$O/gb_$k.json | tail -1
  node tools/art/compress_glb.mjs $O/gbn_$k.raw.glb $A | tail -1
done
