# build_punch.sh m3|f3 : punch and shove (3D.236, owner's pick W157) for one model. Scratch paths: /home/claude/zwork, /tmp/sw.
# punch: CMU 02_05 (one hard step-in punch), frames 806-902, played 1.25 times faster, with force added (chest turn x1.35, the punching arm straightened, the hips into the blow).
# shove: CMU 81_10 (a step in and a two-handed push), frames 226-336, 1.3 times faster, both arms straightened through the push, leaning in.
# Both are one-shot and ease back to the pose they start in over the last 30%.
cd /home/claude/zwork; m=$1; B=/tmp/sw/s224_$m.raw.glb; R=/home/claude/zombie-haven/tools/art/mocap/retarget.py
ZH_ONESHOT=1 ZH_FACEHIPS=1 ZH_RETURN=.3 ZH_SPEED=1.25 ZH_LUNGE=1 ZH_REACH=1 ZH_TWIST=1.35 python3 $R -- $B mocap/cmu/data/002/02_05.bvh 806 96 punch /tmp/sw/pn_$m.npz 9 2>&1 | grep -E "Trace|Error" -A3
ZH_ONESHOT=1 ZH_FACEHIPS=1 ZH_RETURN=.3 ZH_SPEED=1.3 ZH_LUNGE=1 ZH_REACH=1 ZH_REACH2=1 ZH_LEAN=-10 python3 $R -- $B mocap/cmu/data/081/81_10.bvh 226 110 shove /tmp/sw/sh_$m.npz 9 2>&1 | grep -E "Trace|Error" -A3
(cd /home/claude/zombie-haven && node tools/art/inject_clips.mjs $B /tmp/sw/s236_$m.raw.glb punch=/tmp/sw/pn_$m.json shove=/tmp/sw/sh_$m.json | tail -1)
