#!/bin/bash
# bloat_check.sh : 3D.257 the Bloater Queen's arms, 3D.267 the Bloated's (owner, W200: "try b", the moves as on the sheet) (bloatcheck.py) on the game file, against the file at commit 3a1468a (3D.256). About a minute.
set +m; Q=$(cd "$(dirname "$0")" && pwd); R=$Q/../..; T=$(mktemp -d); ok=0
for k in queen bloated; do
  (cd $R && git show 3a1468a:assets/characters/ai3d_v2/zombie_$k.glb > $T/o_$k.glb && node tools/art/decomp.mjs $T/o_$k.glb $T/o_$k.raw.glb >/dev/null && node tools/art/decomp.mjs assets/characters/ai3d_v2/zombie_$k.glb $T/n_$k.raw.glb >/dev/null)
  python3 $R/tools/art/b3d/animdump.py $T/o_$k.raw.glb $T/o_$k.npz 25 >/dev/null 2>&1 & python3 $R/tools/art/b3d/animdump.py $T/n_$k.raw.glb $T/n_$k.npz 25 >/dev/null 2>&1 & wait
  python3 $Q/bloatcheck.py $T/n_$k.npz $T/o_$k.npz $k $k || ok=1   # the fourth word: queen checks her sweep too
  [ "$1" = old ] && python3 $Q/bloatcheck.py $T/o_$k.npz $T/o_$k.npz ${k}_old $k
done; rm -rf $T; exit $ok
