# Changelog

## V2.11.1
- Fix: nobody could be sent on an expedition. Hunger and thirst rose ~17 and ~20 per game hour,
  so every survivor sat at 75–100 (too hungry/thirsty to go) and then lost HP from starving even
  with food and water in stock. They now rise ~3.3 and ~4 per game hour, and a fully met daily
  ration lowers both by 35 (a shortfall still raises them).
- Expedition squad buttons now say why someone can't go: hurt, fighting, rescuing, hungry,
  thirsty or busy (was always "busy/hurt").
- Tested over 4 simulated days with a rain collector and garden plot: someone was always free
  (2–6 of 8); before the fix, nobody was free in 283 of 300 checks.

## V2.11.0
- Pixel-art versions of the six starting buildings, on the shared 42-px tile grid:
  House (87×82), Rain Collector (72×76), Garden Plot (87×61), Medical Tent (86×66),
  Canteen (83×80), Armory (84×81). Generated in ChatGPT and snapped to a pixel grid.
- Canteen, House and Rain Collector were snapped at ChatGPT's own block size. Garden Plot,
  Medical Tent and Armory were drawn too wide (94–107 px), so they were snapped at a larger block
  size to fit the 84 px footprint (some fine detail merged).
- Measured fit: bases sit within about 6–16 px of the tile diamond (steps, crates, sandbags stick
  out a little); the Armory spills ~6 px past its footprint on the left.
- Not yet redrawn: Workshop, Storage, Barracks, Well, Farm, Clinic, Hospital; trees, crates, debris.

## V2.10.2
- Entrances are now inside each building's own footprint (the front-row tile by the front-left wall)
  instead of on an extra tile in front of it. Survivors walk to the tile in front, then step in.
  Placement still needs that front tile to be free.
- Survivors are hidden while inside an enclosed building (working, using it, or in care) and can't be
  tapped or targeted by zombies there. Open-air structures (rain collector, well, garden plot, farm)
  keep them visible.

## V2.10.1
- Pixel-art House (`assets/buildings/v4/house.png`, 87×82 art px) drawn on the shared 42-px tile
  grid with the same sharp-bilinear path as characters; tap hit-testing uses the new image.
- Measured fit: front corner within 1–2 px of the 2×2 footprint; side base corners 4–6 px low;
  porch step overhangs the front tile by up to ~12 px. Gameplay uses the grid, so this is visual only.
- Other buildings still use the old art.

## V2.10.0
- Map tiles are now true pixel art on a 42 × 28 art-pixel grid: grass (with clumps, tufts and the
  odd flower) and roads (curbs, edge lips, dashed centre lines) are generated pixel by pixel and
  share one pixel size with every sprite. Characters are 30/42 of a tile tall (was 0.70).
- All six zombie types redrawn as pixel art at the same pixel size: walker, crawler, runner, spitter,
  bloated and brute, each with front and back walk cycles plus an attack frame. Bigger zombies use
  more pixels, not bigger ones. Zombies now turn to face where they walk, like survivors.
- Not done yet: buildings, props (trees, crates, debris) and walls are still the old art; the
  unused boss art was not redrawn.
- Added `tools/pixel/` (browser extractor + sheet builder with per-chunk hash checks).

## V2.9.5
- Back view: survivors walking up the screen now show their back (new sheet
  `assets/characters/v4/Base_back.png`: idle + 4 walk frames, facing up-left; mirrored for up-right).
  Working, carrying and down poses still use the front view.
- ChatGPT drew the back view about 35 px tall; 2–4 near-duplicate rows were removed per frame so it
  matches the 32 px front view (no resampling, still true pixel art).

## V2.9.4
- Fix: characters changed size relative to the map when zooming (0.53–0.80 tile, measured), because
  V2.9.2 rounded their scale to whole pixels. They now scale smoothly with the zoom (0.70 tile at
  every zoom, measured from 0.5x to 1.9x), using a whole-number nearest-neighbour enlargement followed
  by a smooth final resize, so pixels stay square and sharp.

## V2.9.3
- Survivors face the way they walk: moving left on screen shows the sprite as drawn, moving right shows
  it mirrored. While chasing or attacking they face their target. Facing isn't saved (it re-derives on load).
- Zombies don't turn yet (their art is still the old style).

## V2.9.2
- Characters redrawn as chunky pixel art: about 30 art px tall instead of about 80, so each pixel is
  visible on a phone. On-screen character size is unchanged (0.70 tile).
- Pixel-art sprites are now drawn at a whole number of device pixels per art pixel and snapped to the
  device-pixel grid, so pixels stay even squares at every zoom.
- New base-body sheet `assets/characters/v4/Base.png` (idle, 4 walk, working, carrying, down).
  For now all professions use this one body; per-profession hair/skin variants come next.
- Added `docs/ART_STANDARD.md`: one art-pixel size for every sprite going forward.

## V2.9.1 and earlier
See the git history.
