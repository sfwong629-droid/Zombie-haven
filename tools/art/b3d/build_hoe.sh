# build_hoe.sh m3|f3 : the hoe of work_dig (3D.241, owner W162: "the sharp end should face the ground, not the shaft"). The hoe's own points are turned about
# its shaft so the blade faces the ground, and the shaft is shortened from the hand's end so the blade's edge bites 7 cm instead of the shaft's end going 26 cm under.
# Scratch: /tmp/sw (s239 = the raw model of 3D.239).
m=$1; D=$(cd "$(dirname "$0")" && pwd)
python3 $D/hoefix.py -- /tmp/sw/s239_$m.raw.glb /tmp/sw/hoe_$m.json 2>&1 | grep -E "^HOE|Trace|Error" -A3 | sed "s/^/$m /"
python3 $D/hoefix_apply.py /tmp/sw/s239_$m.raw.glb /tmp/sw/hoe_$m.json /tmp/sw/s241_$m.raw.glb
