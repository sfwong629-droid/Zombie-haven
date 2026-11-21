#!/bin/bash
# tools/qa/lasher_skin_check.sh — 3D.254: no part of the Lasher's trousers follows its hand (owner, 21 Nov: "part of the gray pant is stick to the arm").
# In the Lasher's file no skin point has 0.2 or more of its weight on a forearm, hand or fingers while lying less than half as far from a leg bone as
# from an arm bone (14 points of the left trouser leg did, and were drawn out into a spike towards the hand). tools/art/weightfix.py finds 0 to move.
cd "$(dirname "$0")/../.."; T=$(mktemp -d)
node tools/art/decomp.mjs assets/characters/ai3d_v2/zombie_lasher.glb $T/l.glb >/dev/null && L=$(python3 tools/art/weightfix.py $T/l.glb $T/o.glb); echo "$L" | sed 's/ -> .*//'; rm -rf $T
case "$L" in "weightfix: 0 points"*) echo "ALL OK";; *) echo FAILED; exit 1;; esac
