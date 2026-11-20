# build_work.sh m3|f3 : the work group (3D.242, owner W165: "they are fine keep them"): work_chop, work_hammer, work_dig, work_tinker, work_barricade,
# the old hand-made clips with the hips lifted where the feet sank (fixfist.py); hammer and barricade, which were cut off just before the end of their loop, are eased onto their first pose (ZH_LOOP). The hoe is then turned and shortened again on the lifted dig (hoefix.py,
# 3D.241), so its blade still bites the ground the same. Scratch: /tmp/sw (s239 = the raw model of 3D.239, with the hoe as it was first made).
m=$1; B=/tmp/sw/s239_$m.raw.glb; D=$(cd "$(dirname "$0")" && pwd); A=""
for c in work_chop work_hammer work_dig work_tinker work_barricade; do
  (ZH_LOOP=1 python3 $D/fixfist.py -- $B $c /tmp/sw/wg_${c}_$m.json 2>&1 | grep -E "^FIST|Trace|Error" -A3 | sed "s/^/$m /") &
  A="$A $c=/tmp/sw/wg_${c}_$m.json"
done; wait
(cd $D/../../.. && node tools/art/inject_clips.mjs $B /tmp/sw/s242a_$m.raw.glb $A | tail -1)
python3 $D/hoefix.py -- /tmp/sw/s242a_$m.raw.glb /tmp/sw/hoe2_$m.json 2>&1 | grep -E "^HOE|Trace|Error" -A3 | sed "s/^/$m /"
python3 $D/hoefix_apply.py /tmp/sw/s242a_$m.raw.glb /tmp/sw/hoe2_$m.json /tmp/sw/s242_$m.raw.glb
