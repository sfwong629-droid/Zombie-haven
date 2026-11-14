#!/bin/bash
# fitkit.sh KIT ID 'OPTJSON' — fit one Tripo armour kit onto the survivor rig.
#   KIT  = the kit name in the work folder (KIT.glb from Tripo, KIT_fc.npy from insp.py)
#   ID   = the game's item id; writes assets/characters/ai3d_v2/armor_ID_m3.glb and tools/art/b3d/fits/ID_tripo.json
# Work folder: $ZH_KITS (default: ./kits_work in the repo root, git-ignored). Needs Python with the bpy module, and node deps in tools/art (npm i).
R=$(cd "$(dirname "$0")/../../../.." && pwd); K=${ZH_KITS:-$R/kits_work}; B=$R/tools/art/b3d
mkdir -p "$K"; cd "$K"
python3 $B/gear_strip_pink.py $1 "${3:-{\}}" 2>&1 | grep "split faces\|pink faces\|y centres\|islands\|left\|dropped" || exit 1
(cd $B && python3 fit_armor.py $R/assets/characters/ai3d_v2/rig/armor_base.blend $K/$1_gear.glb $K/armor_$2.glb tris=16000 tex=512 joints=$K/$1.json 2>&1 | grep "^armor\|pieces\|Traceback\|Error:")
(cd $R/tools/art && node compress_glb.mjs $K/armor_$2.glb $R/assets/characters/ai3d_v2/armor_$2_m3.glb 2>&1 | tail -1)
cp $K/$1.json $B/fits/$2_tripo.json
