# Male base template (AI 3D)

Plain shirt and trousers, no profession look. Clothing and equipment are add-ons.

- `full150/`: 150px smooth sprites, every clip, four directions, weapons none/bat/axe/rifle/ak47. `anchor.json` holds the ground point and per-frame ms.
- `armor150/`: the same clips (no rescue) in procedural steel armour (`tools/art/b3d/armor.py`), weapons none/bat/rifle.
- `male_rig.blend`: the rigged model (Hunyuan3D V3.1 from ChatGPT front/side/back drawings, `ai_model.py prep`).
- Rendered with `anims.py male_rig.blend OUT weapons=... tex=1024 [outfit=armor]`, then `spritify.py OUT/w SM/w smooth size=150`.
- The source GLB (Male_General_1.glb) is not committed because it's 37 MB.
- `realtime/male.glb` (40k triangles) and `realtime/male_lite.glb` (10k, for crowds): rig, body, weapons (`weapon_*`), armour (`armor_*`) and every clip as a glTF animation (`<clip>`, `melee_<clip>`, `gun_<clip>`, plus `zombie_walk`). Built by `tools/art/b3d/export3d.py male_rig.blend OUT.glb [decimate=0.25 tex=512]`.
- `realtime/male_mid.glb` (14k triangles, `decimate=0.35 tex=1024`) is what the town uses for survivors; `realtime/male_lite.glb` is now 6k (`decimate=0.15 tex=512`) for zombie crowds.
