# build_every.sh m3|f3 : the everyday group (3D.243, owner W166): cheer, pickup, limp_walk, rescue with the hips lifted where the feet sank (4 to 10 cm);
# sit, sit_f, eat, sleep lowered onto the ground (they hung 4 cm above it, ZH_GROUND); and in the man's file sit and eat with the legs opened
# (owner: "Men sitting should be a bit manspreading. Open the leg a bit": ZH_SPREAD=18, each leg turned out 18 degrees at the hip).
# Scratch: /tmp/sw (s242 = the raw model of 3D.242).
m=$1; B=/tmp/sw/s242_$m.raw.glb; D=$(cd "$(dirname "$0")" && pwd); A=""; SP=""; [ $m = m3 ] && SP=18
for c in cheer:ZH_LOOP=1 limp_walk:ZH_LOOP=1 rescue:ZH_LOOP=1 pickup:ZH_X=1 sit:ZH_GROUND=1:$SP sit_f:ZH_GROUND=1 eat:ZH_GROUND=1:$SP sleep:ZH_GROUND=1; do
  n=$(echo $c | cut -d: -f1); e=$(echo $c | cut -d: -f2); s=$(echo $c | cut -d: -f3)
  (env $e ZH_SPREAD=${s:-0} python3 $D/fixfist.py -- $B $n /tmp/sw/eg_${n}_$m.json 2>&1 | grep -E "^FIST|Trace|Error" -A3 | sed "s/^/$m /") &
  A="$A $n=/tmp/sw/eg_${n}_$m.json"
done; wait
(cd $D/../../.. && node tools/art/inject_clips.mjs $B /tmp/sw/s243_$m.raw.glb $A | tail -1)
