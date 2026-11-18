#!/bin/sh
# tools/qa/swing_head_check.sh — 3D.198: in every melee swing the weapon stays out of the survivor's head (it went through it in the old hand-made swings).
# Unpacks both survivor models, plays each swing with the bat in the hand at 33 moments (Blender, tools/art/b3d/weapdump.py) and fails if the bat is ever inside the head.
set -e; cd "$(dirname "$0")/../.."; T=$(mktemp -d); bad=0
for m in m3 f3; do
  node tools/art/decomp.mjs assets/characters/ai3d_v2/survivor_$m.glb $T/$m.glb >/dev/null
  python3 tools/art/b3d/weapdump.py $T/$m.glb $T/$m.npz 33 "melee_swing_a:bat,melee_swing_b:bat,melee_swing_c:bat,melee_swing_d:bat" >/dev/null 2>&1
  python3 - "$T/$m.npz" "$m" <<'P' || bad=1
import numpy as np,sys
d=np.load(sys.argv[1],allow_pickle=True); bad=0
for k in d.files:
    if not k.startswith('M:'): continue
    M=d[k]; n=int((M[:,1]<M[:,0]).sum()); bad+=n; print(('ok   ' if not n else 'FAIL ')+sys.argv[2]+' '+k[2:]+': weapon nearest %.3f from the head centre (radius %.3f), inside the head at %d of %d moments'%(M[:,1].min(),M[:,0].mean(),n,len(M)))
sys.exit(1 if bad else 0)
P
done; rm -rf $T; [ $bad = 0 ] && echo "ALL OK" || { echo FAILED; exit 1; }
