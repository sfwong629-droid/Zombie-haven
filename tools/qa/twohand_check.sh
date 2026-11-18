#!/bin/sh
# tools/qa/twohand_check.sh — 3D.207: the two-handed set (owner, 18 Nov: copied from real people; "the weapons are not going through the head or body"),
# checked with each real weapon it is used with (the models in gear_weapons.glb, placed in the hand as the game places them):
#   the weapon is never inside the head or the body, never jumps (48 degrees per screen frame at most), both hands stay on it,
#   each clip starts and ends in its own stance and no arm bone jumps; (3D.210) in C and the two stances the feet stay planted; (3D.211) no leg is twisted round. Also: the game plays these clips for the five two-handed weapons.
set -e; cd "$(dirname "$0")/../.."; T=$(mktemp -d); bad=0
for w in sledge axe shovel roadsign spear; do grep -q "'$w'" js/render3d.js || { echo "FAIL $w is not in the game's two-handed list"; bad=1; }; done
grep -q "const TWO_H = new Set(\['sledge', 'axe', 'shovel', 'roadsign', 'spear'\])" js/render3d.js && echo "ok   the game's two-handed list: sledgehammer, fire axe, shovel, road sign, spear" || { echo "FAIL the two-handed list in js/render3d.js"; bad=1; }
node tools/art/decomp.mjs assets/characters/ai3d_v2/gear_weapons.glb $T/gear.glb >/dev/null
SW="melee2h_hold_idle melee2h_swing_a melee2h_swing_b melee2h_swing_c"; SP="spear_hold_idle spear_stab"
for m in m3 f3; do
  node tools/art/decomp.mjs assets/characters/ai3d_v2/survivor_$m.glb $T/$m.glb >/dev/null
  for w in sledge axe shovel roadsign spear; do
    L=""; for c in $( [ $w = spear ] && echo $SP || echo $SW ); do L="$L,$c:gear-$w"; done; L=${L#,}
    ZH_GEAR=$T/gear.glb python3 tools/art/b3d/weapdump.py $T/$m.glb $T/$m-$w.npz 60 "$L" >/dev/null 2>&1
    python3 - "$T/$m-$w.npz" "$m $w" <<'P' || bad=1
import numpy as np,sys
d=np.load(sys.argv[1],allow_pickle=True); bad=0
for k in d.files:
    if not k.startswith('M:'): continue
    M=d[k]; n=int((M[:,1]<M[:,0]).sum()); D=d['D:'+k[2:]]; F=d['F:'+k[2:]]; dt=(F[1]-F[0])/F[2]/(len(D)-1); per30=np.degrees(np.arccos(np.clip((D[1:]*D[:-1]).sum(1),-1,1))).max()/dt/30
    j=per30>48; bad+=n+int(j)
    print(('ok   ' if not n else 'FAIL ')+sys.argv[2]+' '+k[2:]+': inside the head at %d of %d moments (nearest %.3f, head radius %.3f)'%(n,len(M),M[:,1].min(),M[:,0].mean()))
    if j: print('FAIL '+sys.argv[2]+' '+k[2:]+': the weapon turns %.0f degrees in one screen frame (limit 48)'%per30)
sys.exit(1 if bad else 0)
P
    python3 tools/art/b3d/bodyhit.py $T/$m-$w.npz RL | sed "s/^\(ok   \|FAIL \)/\1$m $w /" > $T/b.txt; grep -v ^BAD $T/b.txt; grep -q "^BAD 0" $T/b.txt || bad=1
    python3 tools/art/b3d/gripcheck.py $T/$m-$w.npz | sed "s/^\(ok   \|FAIL \)/\1$m $w /" > $T/g.txt; grep -v ^BAD $T/g.txt; grep -q "^BAD 0" $T/g.txt || bad=1
  done
  python3 tools/art/b3d/armcheck.py -- $T/$m.glb melee2h_swing_a@melee2h_hold_idle,melee2h_swing_b@melee2h_hold_idle,melee2h_swing_c@melee2h_hold_idle,spear_stab@spear_hold_idle 2>/dev/null | grep -E "^(ok|FAIL|BAD)" > $T/a.txt || true
  grep -v ^BAD $T/a.txt; grep -q "^BAD 0" $T/a.txt || bad=1
  python3 tools/art/b3d/legcheck.py -- $T/$m.glb melee2h_hold_idle,melee2h_swing_c,spear_hold_idle,melee2h_swing_a:step,melee2h_swing_b:step,spear_stab 2>/dev/null | grep -E "^(ok|FAIL|BAD)" > $T/l.txt || true   # 3D.210: the feet stay planted
  grep -v ^BAD $T/l.txt; grep -q "^BAD 0" $T/l.txt || bad=1
done; rm -rf $T; [ $bad = 0 ] && echo "ALL OK" || { echo FAILED; exit 1; }
