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
   no new clothing, no objects of any kind (the game adds weapons and carried things itself).
9. **NEVER generate a weapon or a gun.** No gun, pistol, rifle, bow, knife, sword, bat, axe, club, stick, tool or
   any other held item, in any frame, in any pose. Hands are always EMPTY. If a weapon or object appears, the clip fails:
   regenerate it.
6. **In place.** Feet stay on the same ground line; the character never travels across the frame.
7. **No motion blur** if there is any setting for it.
8. Output 960x540 is fine (no upscale needed). 24 fps. About 4–9 seconds.

## Facing and camera (read this first: most failed clips broke it)

The start images are drawn from a HIGH THREE-QUARTER (isometric) camera, and the character stands turned on a DIAGONAL:
- `front`: facing DOWN-RIGHT: toward the viewer AND toward the right edge of the picture (face and chest turned
  partly right). We call this direction "forward" in the descriptions below: forward = toward the lower right of the image.
- `back`: facing UP-RIGHT: away from the viewer AND toward the right edge of the picture (back of the head, partly
  turned right). Forward = toward the upper right of the image.

For the whole clip:
- Keep exactly that diagonal facing. NEVER turn to face the camera straight on, never turn the back straight to the
  camera, never turn to the left. The nose/hat brim keeps pointing the same way as in frame 1.
- Keep the same high three-quarter camera angle. Never show the character from directly above, from the side, or from below,
  even when lying down.
- Arms move forward/back along the facing diagonal, not out to the sides: NO T-pose, no arms spread sideways
  (unless a pose below says so).
- The body never spins, flips, cartwheels or leaves the ground except in the jump of `cheer`.

## The pose set (one clip per request)

Make ONE clip per request. Loop mode where the table says yes. Name each output `<character>_<direction>_<action>.mp4`.

**Weapons are added by the game later. NO WEAPON AND NO GUN IS EVER GENERATED.** Where a pose says "gripping",
the fist is closed as if holding a handle, but it holds NOTHING. Keep that fist clearly visible, never hidden behind
the body. "Front arm" = the arm on the side the character faces (the right side of the image).

| action | loop | what happens (forward = the facing diagonal) |
|---|---|---|
| idle | yes | Standing still and relaxed in the start pose. Gentle breathing: the shoulders rise one pixel and settle. Arms hang at the sides. Feet and facing never change. |
| walk | yes | Walking in place along the facing diagonal. Legs step one after the other, arms swing forward and back opposite the legs (not sideways), head and hat stay level. |
| carry | yes | Rescue walk: walking in place exactly like `walk`, but BOTH arms are raised straight up above the head, palms flat and open facing up, as if carrying a person overhead (do NOT draw the person or anything else). Arms stay straight up the whole clip; only the legs walk. Determined face. |
| punch | yes | Guard stance: both fists up in front of the chest, front foot slightly forward. Quick straight jab with the front fist forward along the facing diagonal, the shoulder turning into it, then snap back to the guard. Short pause, repeat. Feet stay planted. Empty fists. |
| swing_a | yes | Overhead strike. 1) Ready: front fist held forward at waist height, closed as if gripping a handle. 2) Wind-up: front fist raised high over the shoulder, body twisted back and leaning back, back foot planted. 3) Strike: whole body lunges forward and down, front fist swung down low in front, front knee bent, determined face. 4) Back to ready. Fist empty. |
| swing_b | yes | Rising backhand. 1) Ready (as swing_a). 2) Wind-up: front fist pulled low across the body to the opposite hip, body twisted the other way. 3) Strike: fist swept up and across to the front, ending forward at shoulder height, body turning forward, small hop. 4) Back to ready. Arms never spread sideways. Fist empty. |
| swing_c | yes | Lunge thrust. 1) Ready (as swing_a). 2) Wind-up: fist pulled back to the waist, body crouched low, weight on the back foot. 3) Strike: big lunge forward, front arm thrust straight forward along the facing diagonal, body stretched forward, back foot lifted, shouting mouth. 4) Pull back to ready. Fist empty. |
| fire | yes | Aim and recoil, no weapon drawn. Both fists together held straight forward at chest height along the facing diagonal, as if holding a long pole level; front foot forward; focused eyes. Then a quick jolt: shoulders and head kick back and the fists kick up slightly, then settle back to the steady aim. Pause, repeat. Arms stay together in front, never spread. Fists empty. |
| hurt | no | Hit while fighting. Starts in the ready pose (front fist held forward at waist height, closed). Struck from the front: body knocked back and leaning away, head tilted back, eyes squeezed shut like > <, mouth open; one small step back. The front fist stays closed. Then recovers, wincing with one eye closed, back to the ready pose. Feet stay on the ground: no fall, no flip, no spin. |
| collapse | no | Knocked out. Knees buckle, the body falls forward along the facing diagonal and ends lying flat FACE DOWN: chest and belly on the ground, face turned to the side, eyes closed drawn as short lines like - -, arms by the head, legs straight behind. Seen from the same high three-quarter angle (NOT from above). Stays still on the belly to the end, in the same spot. |
| cheer | yes | Happy jump. Crouch with knees bent, then jump straight up with both arms raised high above the head, big smile, happy eyes drawn as upward curves like ^ ^. Land on the same spot with knees bent, still smiling, arms still up. Repeat. Same diagonal facing the whole time, no shadow, no dust. |

(Not needed yet: profession work poses such as farming, building or healing. They come later per profession.)

Prompt template (fill in the direction and the action's description from the table):

> Animate this pixel art character from the start image. It faces {DOWN-RIGHT: toward the viewer and the right edge
> of the picture | UP-RIGHT: away from the viewer and toward the right edge of the picture}, seen from a high
> three-quarter isometric camera; keep that exact facing and camera angle for the whole clip, never turn to face the
> camera or show it from above or the side. Forward means along that diagonal. Action: {description}.
> Keep the exact same character design, outfit, colors and chunky pixel art style, flat 2D video game sprite.
> Static shot: locked camera, no camera movement, no zoom. Character stays centered and the same size, feet on the
> same spot. Plain flat grey background stays unchanged, no shadow, no dust, no effects. No weapon, no gun, no tool,
> no objects of any kind: hands are empty and hold nothing.

## Checks before handing a clip back

- Frame 1 identical to the start image.
- Character the same size in the first and last frame (no zoom creep).
- Looping clips: last frame flows into frame 1 without a jump.
- Background still flat grey in every frame.
- No weapon, gun, tool or other object anywhere in the clip; hands empty.
- Facing is the same diagonal as frame 1 in every frame (not turned to face the camera, not seen from above).
If a clip fails a check, regenerate it rather than fixing it with an upscale or filter.

## Hand-off

Hand back each clip as soon as it is made, with a short list: file name, action, direction, loop yes/no, and any
check that failed.
