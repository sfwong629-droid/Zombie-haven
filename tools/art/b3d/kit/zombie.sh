#!/bin/bash
# tools/art/b3d/kit/zombie.sh <id> <Raw Tripo model.glb>      (3D.182, the 16 Nov batch of 11)
# Raw two-legged Tripo zombie -> assets/characters/ai3d_v2/zombie_<id>.glb: 1.156 tall, 20k triangles, the 19-bone zombie rig
# (with finger bones), the 35 zombie clips, meshopt-compressed. Work files go to $ZH_KITS (default kits_work/, not committed).
# Needs: pip install bpy numpy pillow; cd tools/art && npm i.
# Settings that some models need (set before calling):
#   ZH_VOXEL=.009 (or .012)  when the skinning step fails with "list indices must be integers" (Digger, Hazmat .009; Nurse .012)
#   ZH_CROTCH=.42            when a dress or long shirt hides the legs' fork (Listener)
#   ZH_HANDLO=<height>       to set the fingertip height by hand instead of measuring it
# Four-legged models use ai_stag.py (the Stag) or ai_dog.py instead.
# Look at the result before using it: the Zombie test page (?zoo) and  node tools/qa/new_zombies_check.js shot.png
set -e; ID=$1; SRC=$(realpath "$2"); R=$(cd "$(dirname "$0")/../../../.." && pwd); B=$R/tools/art/b3d; W=${ZH_KITS:-$R/kits_work}; mkdir -p "$W"; cd "$W"
export ZH_NOFACE=1 ZH_HEIGHT=1.156
if [ -z "$ZH_HANDLO" ]; then read HL XM < <(python3 "$B/kit/handlo.py" "$SRC" 1.156); export ZH_HANDLO=$HL; fi
echo "$ID: fingertips at $ZH_HANDLO"
python3 "$B/ai_model.py" prep "$SRC" "$W/z_$ID.blend" 2>&1 | grep -E "landmarks|filled|Traceback|Error|saved"
python3 "$B/add_fingers.py" "$W/z_$ID.blend" "$W/z_${ID}_f.blend" 2>&1 | grep -E "Traceback|Error" || true
python3 "$B/export3d.py" "$W/z_${ID}_f.blend" "$W/z_${ID}_raw.glb" tex=1024 decimate=0.5 2>&1 | grep -E "^saved|Traceback|Error"
(cd "$R/tools/art" && node compress_glb.mjs "$W/z_${ID}_raw.glb" "$R/assets/characters/ai3d_v2/zombie_$ID.glb" zombie | tail -1)
