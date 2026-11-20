# build_punch.sh m3|f3 : punch and shove (3D.237) for one model: the old hand-made clips, corrected by fixfist.py (feet on the ground; the shove's arms redone).
# (3D.236 had replaced them with recordings, CMU 02_05 and 81_10; the owner turned those down the same day.) Scratch paths: /tmp/sw (s224 = the raw model with the old clips).
m=$1; B=/tmp/sw/s224_$m.raw.glb; D=$(cd "$(dirname "$0")" && pwd)
for c in punch shove; do python3 $D/fixfist.py -- $B $c /tmp/sw/ff_${c}_$m.json 2>&1 | grep -E "^FIST|Trace|Error" -A3 | sed "s/^/$m /"; done
(cd $D/../../.. && node tools/art/inject_clips.mjs $B /tmp/sw/s237_$m.raw.glb punch=/tmp/sw/ff_punch_$m.json shove=/tmp/sw/ff_shove_$m.json | tail -1)
