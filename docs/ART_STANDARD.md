# Zombie Haven — pixel art standard (V7, locked October 2026)

One rule keeps everything consistent: **one art pixel is the same size on screen for every sprite.**
The style reference is `docs/ref/survivors_style.png` (the approved 4-survivor image).

## The unit
- **One map tile = 96 × 48 art px** (standard 2:1 isometric). 1 art px = tile width ÷ 96 on screen.
- At default zoom (BASE_TW = 80 CSS px per tile) one art px is about 2.5 phone pixels.
- **People: 42 art px tall** (feet to top of hair), about 24 px wide, chibi (big head).
- Buildings fill their footprint: **1×1 ≈ 94 px wide, 2×1 ≈ 142, 2×2 ≈ 190**. A small house is about 94 × 86,
  so a person is roughly half a house tall (close to Dungeon Village 2's proportion).
- Zombies: walker / runner / spitter ~40 px, crawler ~18 px, bloated ~45 px, brute ~54 px, boss ~75 px.
- Bigger things get **more pixels**, never bigger pixels. Never scale one sprite differently to make it fit.

## Drawing rules
- True pixel art: hard edges, no anti-aliasing, no gradients. 1-px dark outline. Light from the top-left.
- Characters face down-left (front, 3/4 view) or up-left (back); right-facing views are mirrored by the game.
- About 40 colours per character sheet, 48 per building (shared palette across a sheet's frames).
- Original designs only. Dungeon Village 2 is inspiration only.

## Pipeline (tools/art)
1. ChatGPT draws a sprite sheet on flat #FF00FF in the same chat as the approved style image (so the look stays the same).
2. In the browser, `__sheet()` / `__bld()` find each sprite, measure the scale from a reference frame
   (idle height, or building width) and take the majority colour in the centre of every art-pixel cell.
   The result (a small PNG atlas) is saved by `grab.py` into `tools/art/sheets/<tag>.txt`.
3. Builders clean the magenta fringe, split frames that touched, remove stray specks, reduce to a shared
   palette and smooth sampling noise (`ingest.tidy`, keeps eyes and other high-contrast details):
   - `build_chars.py` → `assets/characters/v7/<job>_<sex>.png` + `meta.json`
   - `build_zombies.py` → `assets/zombies/v7/<type>.png` + `meta.json`
   - `build_buildings.py` → `assets/buildings/v7/<type>.png` + `meta.json`
   - `build_walls.py` → `assets/map/v7/walls.png` (+ `map.json`): one wall strip is re-sloped to exactly 1:2
     and cut into half-tile arms; one cell per type × neighbour mask × cracked, plus rubble.
   - `tools/chars/items.py` → held weapons (`assets/items/held.png`, 44-px cells) and item icons.

## Character sheets (assets/characters/v7)
- 64 × 60 cells, feet on row 56. Row 0 front (down-left), row 1 back (up-left). 23 frames:
  idle 2, walk 4, carry 4, collapse 4, punch 3, blunt 3, shoot 3.
- `meta.json`: `anims`, `frames` {name: [start, count]}, `wpose` (weapon pose per frame), `hands[tag][view][frame]`
  (where the held weapon's grip goes).
- Jobs: civ, guard, police, medic, scav, eng, cook, farm, mech, para, swat, raider (m/f each), trader (m).

## Zombie sheets (assets/zombies/v7)
- Per type: `fw`, `fh`, `foot`, `h` (head height) and `frames`. idle 2, walk 4, attack 3, death 4;
  boss: idle 2, walk 4, slam 4, roar 2, death 4.

## Rendering
- Sprites are stored at native size. The game enlarges a sheet by a whole number (nearest-neighbour), then
  resizes smoothly to the exact zoom size ("sharp bilinear"), so pixels stay square at every zoom.
- The ground is generated pixel by pixel on the 96 × 48 grid (`buildGround` in js/game.js).

## C64 character standard — chosen October 2026 (preview `?c64=1` from V2.52)
- People about 58 px tall at the V7 pixel size (the town mock-up medic measures 58–60), drawn by PixelLab on a 64 × 64
  canvas: Low Top-Down, Bipedal realistic, Medium detail, single-colour black outline. Body and style like the medic in
  tools/art/sources/pixellab/c64/style_medic_64*.png: average adult build, head about a third of the height, readable face.
- Per character: a front (south) reference in the South slot, 8 directions, then 6-frame walks for South-West (front) and
  North-West (back); other animations as available. Build with `python3 tools/art/build_hd_char.py --c64 <tag>`.
- Buildings, ground and props stay V7.

## HD standard (V8) — in preview since V2.50 (`?hd=1`), owner-approved October 2026
Same scale and roads as V7 on screen; every art pixel is half the size. Buildings and characters share one pixel size.
- Exactly 2× the V7 standard: tile 192 × 96, people 84 px tall, buildings about 188 / 284 / 380 wide (1×1 / 2×1 / 2×2),
  zombies 2× their V7 heights.
- Character cells 128 × 120, feet on row 113 (so (foot + 1) / 2 = 57 matches V7). Frame table per sheet:
  idle 2, walk 6, carry 6, collapse 4, punch 3, blunt 3, shoot 3 (27 frames per row; row 0 front, row 1 back).
- Two views (front = south-west/down-left, back = north-west/up-left); the game mirrors them for the right-facing directions.
- Characters, owner-approved pipeline:
  1. ChatGPT (project "2D Game Sprite Generator") draws one front-facing (south) base sprite: straight at the viewer,
     symmetrical, hands empty, flat #FF00FF.
  2. Clean it to 84 px on a transparent 128 × 128 canvas (tools/art/sources/pixellab/<tag>_south_base.png).
  3. PixelLab, 8 directions: upload it as South, generate the rotation, then animate (walk preset, 6 frames) for
     South-West and North-West. ChatGPT cannot draw alternating walk legs; PixelLab can.
  4. Save the GIFs as tools/art/sources/pixellab/<tag>_<anim>_sw.gif / _nw.gif and run
     `python3 tools/art/build_hd_char.py <tag>`. Missing animations fall back (see the script header).
- Buildings: ChatGPT with the footprint guides in tools/art/templates, straightened by fix_iso.py, files in assets/buildings/hd
  with ax / ay in HD px and `res: 2` (HD_BUILD in js/game.js).
- Held weapons are still V7 pixel size (assets/items/held.png) until an HD set exists.
- Memory estimate for a full HD set: about 90 MB of decoded art (was 28), plus the 120 MB pixel-cache budget.
  Target iPhone XS/XR (3 GB) and newer.
