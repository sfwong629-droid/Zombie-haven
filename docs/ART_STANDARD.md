# Zombie Haven — pixel art standard

One rule keeps everything consistent: **one art pixel is the same size on screen for every sprite.**

## The unit
- Survivor characters are drawn **about 30–32 art px tall** (feet to top of hair), about 13 px wide.
- In game a character is 0.70 tile-widths tall, so 1 art px = 0.70 × tile width ÷ 30.
- Every sprite (survivors, zombies, gear, props) uses that same art-px size. Bigger things get **more pixels**, never bigger pixels:
  - normal zombies ~30–32 px, crawler shorter, bloated/brute ~36–40 px, boss larger.
  - gear layers (helmet, vest, apron, coat, weapons) are drawn on the 30 px base body's grid.
- Never scale one sprite differently from another to make it "fit". Change the drawing instead.

## Drawing rules
- True pixel art: hard edges, no anti-aliasing, no blur, no gradients, no noisy dithering.
- 1 px dark outline around the silhouette. Aim for about 16 colours per sprite (a full sheet may use up to ~24). Light from top-left.
- Facing down-left (south-west), 3/4 isometric view. Slightly chibi: head about 1/3 of height.
- Original designs only. Dungeon Village 2 is inspiration only.

## Generating with ChatGPT
- Ask for the art at the target pixel height, upscaled with nearest-neighbour onto a flat #FF00FF background.
- ChatGPT often draws more pixels than asked (the first base body came out 53 px). Always measure.
- Snap to a true grid: measure the block size from colour edges, take the most common colour in the
  centre of each block, drop the #FF00FF background and magenta fringe, and crop. Then check the figure
  height in art px. Reject anything outside 29–33 px for a survivor.
- (V2.9.2's base body was snapped with this method inside the browser; a standalone script for the
  repo is still to do.)

## Rendering
- Sprites are stored at native size (1 art px = 1 image px).
- The game enlarges a sheet by a whole number with nearest-neighbour, then resizes it smoothly to the
  exact size for the current zoom ("sharp bilinear"). Sprites keep their size relative to the map at
  every zoom, and pixels stay square with at most a soft 1-device-pixel edge.
- Don't round the sprite scale to whole pixels: that makes characters jump in size as you zoom.

## Sheet layout (assets/characters/v4)
- 10 frames, each 32×36 px, feet on row 34: 0 idle, 1–4 walk (also attack), 5 idle, 6 working,
  7 carrying, 8 down, 9 idle.
