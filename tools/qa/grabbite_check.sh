#!/bin/bash
# grabbite_check.sh [old] : 3D.276 the Walker's grab and bite (grabbitecheck.py) on both game files, against the files at commit ae0fcca (3D.274's; built as 3D.276).
set +m; Q=$(cd "$(dirname "$0")" && pwd); R=$Q/../..; T=$(mktemp -d); ok=0
for k in walker walker_f; do
  (cd $R && git show ae0fcca:assets/characters/ai3d_v2/zombie_$k.glb > $T/o_$k.glb && node tools/art/decomp.mjs $T/o_$k.glb $T/o_$k.raw.glb >/dev/null && node tools/art/decomp.mjs assets/characters/ai3d_v2/zombie_$k.glb $T/n_$k.raw.glb >/dev/null)
  python3 $R/tools/art/b3d/animdump.py $T/o_$k.raw.glb $T/o_$k.npz 25 >/dev/null 2>&1 & python3 $R/tools/art/b3d/animdump.py $T/n_$k.raw.glb $T/n_$k.npz 25 >/dev/null 2>&1 & wait
  python3 $Q/grabbitecheck.py $T/n_$k.npz $T/o_$k.npz $k || ok=1
  [ "$1" = old ] && python3 $Q/grabbitecheck.py $T/o_$k.npz $T/o_$k.npz ${k}_old
done; rm -rf $T; exit $ok
