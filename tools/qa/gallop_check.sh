#!/bin/bash
# gallop_check.sh : 3D.256 the Dog's and the Stag's gallop (gallopcheck.py), on the game files. The "before" model for the unchanged animations is
# the one at commit 2ff6e39 (3D.255). About a minute.
set +m; Q=$(cd "$(dirname "$0")" && pwd); R=$Q/../..; T=$(mktemp -d); ok=0
for k in dog stag; do
  (cd $R && git show 2ff6e39:assets/characters/ai3d_v2/zombie_$k.glb > $T/o_$k.glb && node tools/art/decomp.mjs $T/o_$k.glb $T/o_$k.raw.glb >/dev/null && node tools/art/decomp.mjs assets/characters/ai3d_v2/zombie_$k.glb $T/n_$k.raw.glb >/dev/null)
  python3 $R/tools/art/b3d/animdump.py $T/o_$k.raw.glb $T/o_$k.npz 26 >/dev/null 2>&1 & python3 $R/tools/art/b3d/animdump.py $T/n_$k.raw.glb $T/n_$k.npz 26 >/dev/null 2>&1 & wait
  python3 $Q/gallopcheck.py $T/n_$k.npz $T/o_$k.npz $k || ok=1
done; rm -rf $T; exit $ok
