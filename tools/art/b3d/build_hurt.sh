# build_hurt.sh m3|f3 : the hurt group (3D.239, owner: the old ones with the feet on the ground "looks fine"): hurt, melee_hold_hurt, gun_hold_hurt, grabbed,
# knockdown, collapse, corrected by fixfist.py. Scratch: /tmp/sw (s237 = the raw model of 3D.237).
m=$1; B=/tmp/sw/s237_$m.raw.glb; D=$(cd "$(dirname "$0")" && pwd); A=""
for c in hurt melee_hold_hurt gun_hold_hurt grabbed knockdown collapse; do
  G=""; case $c in knockdown|collapse) G=1;; esac
  (ZH_GROUND=$G python3 $D/fixfist.py -- $B $c /tmp/sw/hg_${c}_$m.json 2>&1 | grep -E "^FIST|Trace|Error" -A3 | sed "s/^/$m /") &
  A="$A $c=/tmp/sw/hg_${c}_$m.json"
done; wait
(cd $D/../../.. && node tools/art/inject_clips.mjs $B /tmp/sw/s239_$m.raw.glb $A | tail -1)
