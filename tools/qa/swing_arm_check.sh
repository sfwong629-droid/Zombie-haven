#!/bin/sh
# tools/qa/swing_arm_check.sh — 3D.205: the arms in the three one-handed swings never jump (owner, 18 Nov: the free arm "teleported").
# Each swing must start in the melee stance, end where it starts, turn no free-arm bone more than 30 degrees (weapon arm 48, as the weapon) in one screen frame,
# and Swing 3 (melee_swing_c) must be a rising cut. Also: the game no longer plays Swing 4 for one-handed weapons.
set -e; cd "$(dirname "$0")/../.."; T=$(mktemp -d); bad=0
if grep -q "melee_swing_d" js/render3d.js; then echo "FAIL js/render3d.js still plays melee_swing_d"; bad=1; else echo "ok   the game no longer plays Swing 4 (melee_swing_d)"; fi
for m in m3 f3; do
  node tools/art/decomp.mjs assets/characters/ai3d_v2/survivor_$m.glb $T/$m.glb >/dev/null
  python3 tools/art/b3d/armcheck.py -- $T/$m.glb melee_swing_a,melee_swing_b,melee_swing_c 2>/dev/null | grep -E "^(ok|FAIL|BAD)" > $T/out.txt || true
  grep -v ^BAD $T/out.txt; grep -q "^BAD 0" $T/out.txt || bad=1
done; rm -rf $T; [ $bad = 0 ] && echo "ALL OK" || { echo FAILED; exit 1; }
