# build_fire.sh m3|f3 : the two firing clips (3D.225, gun_fire and pistol_fire) for one model, from CMU 79_96 (frames 320-372). Scratch paths: /home/claude/zwork, /tmp/sw.
cd /home/claude/zwork; m=$1; B=/tmp/sw/base/s214_$m.raw.glb
ZH_FACEAIM=1 python3 /home/claude/zombie-haven/tools/art/mocap/retarget.py -- $B mocap/cmu/data/079/79_96.bvh 320 52 gun_fire /tmp/sw/aim_$m.npz 9 > /dev/null 2>&1
(cd /home/claude/zombie-haven && node tools/art/inject_clips.mjs $B /tmp/sw/aimbase_$m.glb gun_fire=/tmp/sw/aim_$m.json pistol_fire=/tmp/sw/aim_$m.json > /dev/null)
python3 scripts/dumpstance.py -- $B /tmp/sw/st_gun_$m.json gun_hold_idle > /dev/null 2>&1
export ZH_PLANT=1 ZH_NOLBLEND=1 ZH_STANCE_JSON=/tmp/sw/st_gun_$m.json; [ $m = f3 ] && export ZH_RIFF=.07 ZH_RIFZ=.08
ZH_WOBJ=rifle ZH_TWOHAND=aimrifle python3 scripts/fixswing.py -- /tmp/sw/aimbase_$m.glb gun_fire /tmp/sw/fire_$m.json 2>&1 | grep -E "AIMERR|BODY|Trace" -A2 | sed "s/^/$m rifle /" | cut -c1-160
ZH_WOBJ=pistol ZH_TWOHAND=aimpistol python3 scripts/fixswing.py -- /tmp/sw/aimbase_$m.glb pistol_fire /tmp/sw/pfire_$m.json 2>&1 | grep -E "AIMERR|BODY|Trace" -A2 | sed "s/^/$m pistol /" | cut -c1-160
(cd /home/claude/zombie-haven && node tools/art/inject_clips.mjs $B /tmp/sw/s224_$m.raw.glb gun_fire=/tmp/sw/fire_$m.json pistol_fire=/tmp/sw/pfire_$m.json | tail -1)
