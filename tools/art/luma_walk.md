# Walk cycles from Luma video

1. Start frame: the approved sprite enlarged with nearest-neighbour (18x) on flat grey (150,150,150), 1920x1080.
2. Luma (image-to-video, loop mode): "Animate this pixel art farmer walking in place, a steady looping walk cycle. Keep the exact
   same character design ... Locked camera, no camera movement, no zoom ... Plain flat grey background stays unchanged."
3. Read back: the clip came out 960x540, so 9 video px per art px; frame 0 equals the start image, which fixes the grid phase.
   Sample the median of each cell's 5x5 core, map to the sprite's own palette, grey -> transparent.
4. One clean cycle (28 video frames at 24 fps) -> 8 frames. Clean-up: original head pasted back (crisp hat/face),
   lone-pixel despeckle on the body, black outline on every edge pixel, 1-px bob up on the two passing frames.
Result: assets/characters/t56/farmer_walk_se_luma.png (8 x 48x48, anchor 24,39, 145 ms per frame).
