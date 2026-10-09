# Pixel-art pipeline (used for V2.10 zombies)

1. **Generate** in ChatGPT: ask for the sprite at the target pixel height, upscaled with
   nearest-neighbour on a flat `#FF00FF` background (front row + back row in one image).
2. **Snap to the grid in the browser** (`extract_in_browser.js`, paste into the ChatGPT page's
   console or run via a browser tool): it finds each frame, fits the art-pixel block size
   (`__zx2(-1, lo, hi)` — give a narrow `lo..hi` block-size range to force a target height),
   takes the most common colour in the centre of each block, and drops the magenta background.
   `__zparts(i)` returns frame `i` as base64 PNG chunks plus a hash per chunk.
3. **Save the chunks** as `z_<name>.json` (`[{i, hash, parts}]`). `sheet.load_checked` verifies
   every chunk hash, so copy errors are caught instead of silently corrupting a frame.
4. **Build the sheet**: `python3 make_zombie_sheet.py <name> [targetHeight]` cleans magenta fringe,
   isolated pixels and tiny specks, optionally trims near-duplicate rows to the target height
   (never resamples), puts frames on a shared ≤24-colour palette and writes
   `assets/zombies/v4/<name>.png` (front) and `<name>_back.png` (back). It prints the
   `{ fw, fh, foot, h }` line to paste into `Z4_DEFS` in `js/game.js`.
