#!/bin/sh
# tools/qa/swing_head_check.sh — 3D.198: in every melee swing the weapon stays out of the survivor's head (it went through it in the old hand-made swings).
# 3D.206 also: the weapon is never inside the body (tools/art/b3d/bodyhit.py); Swing 4 is no longer checked (the game does not play it since 3D.205).
# 3D.203 also: the weapon never jumps (it may turn at most 48 degrees in one screen frame).
# Unpacks both survivor models, plays each swing with the bat in the hand at 60 moments (Blender, tools/art/b3d/weapdump.py) and fails if the bat is ever inside the head.
set -e; cd "$(dirname "$0")/../.."; T=$(mktemp -d); bad=0
for m in m3 f3; do
  node tools/art/decomp.mjs assets/characters/ai3d_v2/survivor_$m.glb $T/$m.glb >/dev/null
  python3 tools/art/b3d/weapdump.py $T/$m.glb $T/$m.npz 60 "melee_swing_a:bat,melee_swing_b:bat,melee_swing_c:bat" >/dev/null 2>&1
  python3 - "$T/$m.npz" "$m" <<'P' || bad=1
import numpy as np,sys
d=np.load(sys.argv[1],allow_pickle=True); bad=0
for k in d.files:
    if not k.startswith('M:'): continue
    M=d[k]; n=int((M[:,1]<M[:,0]).sum()); bad+=n
    D=d['D:'+k[2:]]; F=d['F:'+k[2:]]; dt=(F[1]-F[0])/F[2]/(len(D)-1); turn=np.degrees(np.arccos(np.clip((D[1:]*D[:-1]).sum(1),-1,1))); per30=turn.max()/dt/30   # 3D.203: no teleporting: the most the weapon turns in one screen frame (1/30 s)
    j=per30>48; bad+=int(j); print(('ok   ' if not j else 'FAIL ')+sys.argv[2]+' '+k[2:]+': the weapon turns at most %.0f degrees in a thirtieth of a second (limit 48)'%per30); print(('ok   ' if not n else 'FAIL ')+sys.argv[2]+' '+k[2:]+': weapon nearest %.3f from the head centre (radius %.3f), inside the head at %d of %d moments'%(M[:,1].min(),M[:,0].mean(),n,len(M)))
sys.exit(1 if bad else 0)
P
  python3 tools/art/b3d/bodyhit.py $T/$m.npz R | sed "s/^\(ok   \|FAIL \)/\1$m /" > $T/body.txt; grep -v ^BAD $T/body.txt; grep -q "^BAD 0" $T/body.txt || bad=1   # 3D.206: and never inside the body
done; rm -rf $T; [ $bad = 0 ] && echo "ALL OK" || { echo FAILED; exit 1; }
