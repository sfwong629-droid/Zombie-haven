---
name: zombie-haven-sprite-animation
description: Turn standing pixel-art game characters (one image per facing direction) into a full set of looping, locked-camera animation clips that can be traced back into game sprites. Use whenever the user uploads Zombie Haven character start frames or asks for character animations / poses for the game.
---

# Zombie Haven sprite animation

The user makes a small isometric pixel-art game. Every character is a ~30-pixel-tall sprite. You get each standing
sprite enlarged with hard square pixels on a flat grey background. Your clips are NOT shown to players: a script reads
them back onto the game's pixel grid, frame by frame. So the clips must be easy to measure, not cinematic.

## Inputs

- Up to 4 start images per character, one per facing direction. File names say the direction:
  `<character>_front.png` (facing the viewer, turned slightly to one side), `<character>_back.png` (facing away),
  and optionally `<character>_front2.png` / `<character>_back2.png` (the other diagonal sides).
  Most of the time only `front` and `back` are given: the game mirrors them for the other two directions.
  Do NOT invent the missing directions.
- Images are 1920x1080, character centred, background exactly RGB (150,150,150).

## Hard rules for every clip (the script breaks if any is broken)

1. **The start image is frame 1, unchanged.** Same position, same size, same colours.
2. **Camera locked.** No pan, zoom, dolly, shake, parallax or depth of field. Character stays centred and the same size.
3. **Facing stays the same** for the whole clip (front stays front, back stays back). No turning around.
4. **Background stays flat RGB (150,150,150).** No floor, shadow, horizon, light change, vignette, particles or text.
5. **Keep the pixel-art look.** Same chunky square pixels, same black outline, same colours. No smoothing, no realism,
   no new clothing, no extra objects except the one prop the action names.
6. **In place.** Feet stay on the same ground line; the character never travels across the frame.
7. **No motion blur** if there is any setting for it.
8. Output 960x540 is fine (no upscale needed). 24 fps. About 4–9 seconds.

## The pose set (one clip per action per direction given)

Use loop mode for the looping actions. Name each output `<character>_<direction>_<action>.mp4`.

| action | loop | what happens |
|---|---|---|
| idle | yes | standing, slow breathing, a small weight shift; arms relaxed |
| walk | yes | steady walk cycle in place, arms swing opposite the legs |
| carry | yes | walk cycle in place holding a wooden crate in front of the chest with both hands |
| work | yes | swing a wooden hoe overhead and down to the ground in front, then back up |
| punch | yes | quick punch forward with one fist, then back to a ready stance |
| hurt | no | flinch backwards from a hit, then recover to standing |
| collapse | no | knees buckle, fall down to lying on the ground, stay down |
| cheer | yes | both arms up in celebration, small hop |

Prompt template (fill in action and direction):

> Animate this pixel art character, seen from the {front | back}, {action description}. Keep the exact same character
> design, outfit, colors and chunky pixel art style, flat 2D video game sprite. Static shot: locked camera, no camera
> movement, no zoom. Character stays centered, the same size and facing the same way, feet on the same spot.
> Plain flat grey background stays unchanged. No new objects{, except the named prop}.

## Checks before handing a clip back

- Frame 1 identical to the start image.
- Character the same size in the first and last frame (no zoom creep).
- Looping clips: last frame flows into frame 1 without a jump.
- Background still flat grey in every frame.
If a clip fails a check, regenerate it rather than fixing it with an upscale or filter.

## Hand-off

Return all clips for one character together, with a short list: file name, action, direction, loop yes/no, and any
check that failed.
