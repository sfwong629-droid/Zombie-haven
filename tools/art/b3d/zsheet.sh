#!/bin/bash
# zsheet.sh "model:clip ..." : 6 side-view frames of each, with the ground; the camera distance follows the model's size
set +m
n=0
for j in $1; do m=${j%%:*}; c=${j##*:}; S=$(grep "^$m " /tmp/sw/zH.txt | cut -d' ' -f3); H=$(grep "^$m " /tmp/sw/zH.txt | cut -d' ' -f2)
  D=$(python3 -c "print(round(2.55*max($S,0.8),3))"); Z=$(python3 -c "print(round(.45*$H,3))")
  for f in 0 .17 .33 .5 .67 .83; do
    ( GROUND=1 WEAP=none FIXED=0,-.05,$Z DIST=$D VIEWS='1,0,.1' python3 /tmp/sw/closeup.py -- /tmp/sw/${P:-z}_$m.raw.glb x $c $f /tmp/sw/${Q:-zs}_${m}_${c}_$f.png >/dev/null 2>&1 ) &
    n=$((n+1)); [ $((n%6)) = 0 ] && wait
  done
done; wait
