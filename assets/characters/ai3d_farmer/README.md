# AI-3D Farmer test (Hunyuan3D -> Blender -> pixel sprites)

- `source/farmer_front_ref.png` — front reference drawn by ChatGPT (no hat, empty hands, arms clear).
- Hunyuan3D (3d.hunyuan.tencent.com) turned it into a textured model (1.5M tris, kept out of git).
- `tools/art/b3d/ai_model.py prep` decimates to 40k tris, finds the joints from the mesh shape,
  builds the shared survivor skeleton and skins it (heat weights on a voxel proxy).
- `tools/art/b3d/ai_render.py RIG.blend OUT sprites weapon=pickaxe,club scale=1.1` renders walk + chop
  in SE/SW/NE/NW; weapons are bound to the hand.R bone so they never float.
- `tools/art/b3d/spritify.py RAW OUT` shrinks to 64px, one shared palette, 1px ink outline.
- `source/farmer_rigged.glb` — the rigged, decimated model (1024px texture).

## Two outputs from the same renders
- `smooth128/` — straight from the 3D render: anti-aliased 128px frames, thin ink outline (recommended; matches the painted town).
- `pixel64/` — 64px pixel-art version (majority-colour shrink, 32-colour shared palette).
  `python3 spritify.py RAW OUT smooth` / `python3 spritify.py RAW OUT`
Materials are toon-shaded (simplified texture x 3 hard light bands) so the look stays flat and cartoon.
