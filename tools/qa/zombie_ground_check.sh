#!/bin/bash
# tools/qa/zombie_ground_check.sh — 3D.244: every zombie is on the ground (owner, 21 Nov, W168: "yes to ground them first").
# For each of the 35 zombie models, in the animations the game plays for it: nothing is in the ground (1.5 cm; they sank 3 to 14% of the zombie's height);
# walks, runs and the crawl end in the pose they start in (the Lasher's run jumped 14%, the Dog's and the Stag's 10%); the legless Crawlers lie on the
# ground (they hung 17 to 25% of their height above it) with their hands within 12 cm of it.
set +m; cd "$(dirname "$0")/../.."; T=$(mktemp -d); n=0
for f in assets/characters/ai3d_v2/zombie_*.glb; do k=$(basename $f .glb | sed s/zombie_//)
  ( node tools/art/decomp.mjs $f $T/$k.glb >/dev/null 2>&1 && python3 tools/art/b3d/animdump.py $T/$k.glb $T/$k.npz 25 >/dev/null 2>&1 ) & n=$((n+1)); [ $((n%5)) = 0 ] && wait
done; wait
python3 - $T <<'PY'
import numpy as np, glob, os, sys
T = sys.argv[1]
use = {'runner': "zombie_walk zombie_run zombie_attack", 'runner_f': "zombie_walk zombie_run zombie_attack", 'bloated': "bloated_walk bloated_attack", 'queen': "bloated_walk bloated_attack",
       'brute': "zombie_walk brute_attack", 'alpha': "zombie_walk brute_attack", 'butcher': "zombie_walk brute_attack", 'sporehead': "zombie_walk spore_combo", 'screamer': "zombie_walk scream",
       'spitter': "zombie_walk spit zombie_attack", 'lasher': "creepy_walk naruto_run lash zombie_attack", 'stalker': "heavy_walk heavy_run haymaker_kick smash", 'thrower': "zombie_walk melee_swing_a",
       'rotbomb': "zombie_walk zombie_attack rot_swell", 'crawler': "crawl crawl_attack", 'crawler_m': "crawl crawl_attack", 'gatling': "walk run gun_fire", 'mutant': "zombie_walk zombie_attack smash",
       'dog': "zombie_walk zombie_run zombie_attack idle", 'stag': "zombie_walk zombie_run zombie_attack idle"}
LOOP = "zombie_walk zombie_run bloated_walk creepy_walk naruto_run heavy_walk heavy_run walk run crawl".split()
bad = 0; files = sorted(glob.glob(T + '/*.npz')); n = 0
for f in files:
    k = os.path.basename(f)[:-4]; d = np.load(f, allow_pickle=True); B = list(d['bones']); msg = []
    for c in use.get(k, "zombie_walk zombie_attack").split() + ([] if k.startswith('crawler') else ['collapse']):
        V = d['V:' + c]; J = d['J:' + c]; lo = V[:, :, 2].min(1); g = np.abs(J[0] - J[-1]).max(); n += 1
        if lo.min() < -.015: msg.append('%s in the ground %.3f' % (c, lo.min()))
        if c in LOOP and g > .02: msg.append('%s jumps %.3f at the repeat' % (c, g))
        if k.startswith('crawler'):
            h = np.minimum(J[:, B.index('hand.L'), 5], J[:, B.index('hand.R'), 5])
            if lo.max() > .04: msg.append('%s hangs %.3f above the ground' % (c, lo.max()))
            if h.min() > .12: msg.append('%s hands %.3f above the ground' % (c, h.min()))
    print(('FAIL ' if msg else 'ok   ') + k + (': ' + '; '.join(msg) if msg else '')); bad += bool(msg)
print('%d models, %d animations' % (len(files), n)); print('ALL OK' if not bad and len(files) == 35 else 'FAILED'); sys.exit(1 if bad or len(files) != 35 else 0)
PY
r=$?; rm -rf $T; exit $r
