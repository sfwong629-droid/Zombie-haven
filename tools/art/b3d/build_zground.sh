#!/bin/bash
# build_zground.sh MODEL [OUTDIR] : one zombie model with the animations the game plays for it put on the ground (owner, 21 Nov, W168: "yes to ground them
# first"). fixfist.py lifts the hips where the feet are in the ground; walks and runs that did not end where they start are eased onto their first pose
# (ZH_LOOP); the legless Crawlers (also levelled, ZH_TILT, so the hands reach the ground) and a body lying down are lowered onto the ground (ZH_GROUND). The source is the model as it was at commit 44006a1.
set +m; k=$1; O=${2:-/tmp/sw}; D=$(cd "$(dirname "$0")" && pwd); R=$D/../../..; SRC=$O/z0_$k.raw.glb
[ -f $O/z0_$k.cmp.glb ] || (cd $R && git show 44006a1:assets/characters/ai3d_v2/zombie_$k.glb > $O/z0_$k.cmp.glb)
[ -f $SRC ] || (cd $R && node tools/art/decomp.mjs $O/z0_$k.cmp.glb $SRC >/dev/null)
case $k in
  runner|runner_f) U="zombie_walk zombie_run zombie_attack";; bloated|queen) U="bloated_walk bloated_attack zombie_walk zombie_attack";;
  brute|alpha|butcher) U="zombie_walk brute_attack zombie_attack";; sporehead) U="zombie_walk spore_combo zombie_attack";; screamer) U="zombie_walk scream zombie_attack";;
  spitter) U="zombie_walk spit zombie_attack";; lasher) U="creepy_walk naruto_run lash zombie_attack zombie_walk";; stalker) U="heavy_walk heavy_run haymaker_kick smash zombie_walk zombie_attack";;
  thrower) U="zombie_walk melee_swing_a zombie_attack";; rotbomb) U="zombie_walk zombie_attack rot_swell";; crawler|crawler_m) U="crawl crawl_attack";;
  gatling) U="walk run gun_fire zombie_walk zombie_attack";; mutant) U="zombie_walk zombie_attack smash";; dog|stag) U="zombie_walk zombie_run zombie_attack";; *) U="zombie_walk zombie_attack";;
esac
U="$U idle collapse"; A=""; n=0
for c in $U; do e="ZH_X=1"
  case $c in zombie_walk|zombie_run|bloated_walk|creepy_walk|naruto_run|heavy_walk|heavy_run|walk|run) e="ZH_LOOP=1";; crawl) e="ZH_LOOP=1 ZH_GROUND=1 ZH_TILT=14";; crawl_attack) e="ZH_GROUND=1 ZH_TILT=14";; collapse) e="ZH_GROUND=1";; esac
  ( env $e python3 $D/fixfist.py -- $SRC $c $O/zg_${k}_$c.json 2>&1 | grep -E "^FIST|Trace|Error" -A3 | sed "s/^/$k /" ) &
  A="$A $c=$O/zg_${k}_$c.json"; n=$((n+1)); [ $((n%4)) = 0 ] && wait
done; wait
(cd $R && node tools/art/inject_clips.mjs $SRC $O/zg_$k.raw.glb $A | tail -1)
