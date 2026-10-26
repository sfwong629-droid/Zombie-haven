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
6. **In place.** Feet stay on the same ground line; the character never travels across the frame.
7. **No motion blur** if there is any setting for it.
8. Output 960x540 is fine (no upscale needed). 24 fps. About 4–9 seconds.

## The pose set (one clip per action per direction given)

Make ONE clip per request. Use loop mode where the table says yes. Name each output `<character>_<direction>_<action>.mp4`.

**Weapons are added by the game later.** In every combat pose the hands are closed as if gripping a handle, but they
hold NOTHING: no weapon, tool or object appears. Keep the gripping hand clearly visible (not hidden behind the body).

| action | loop | what happens |
|---|---|---|
| idle | yes | Standing still, relaxed. Slow breathing: chest and shoulders rise and fall a little. Arms hang loosely at the sides. Feet never move. |
| walk | yes | Steady walk cycle in place. Legs step one after the other, arms swing opposite the legs, head and hat stay level. Feet stay on the same spot. |
| carry | yes | Rescue carry: the same walk cycle in place, but BOTH arms are raised up above the head with the hands open, palms up, as if holding something over the head. Arms stay up the whole time; only the legs walk. |
| punch | yes | Ready stance with both fists up in front of the face. Quick straight punch forward with the front fist, pull it back to the guard, short pause, repeat. Body leans slightly into the punch; feet stay planted. |
| swing_a | yes | Over-the-shoulder chop. Ready stance, both hands together gripping an invisible handle at waist height. Wind up: lift both hands up and back over the shoulder. Chop: bring both hands down hard diagonally across the front of the body to the opposite low side. Follow through, then return to the ready stance. |
| swing_b | yes | Backhand swing. Ready stance, one hand gripping an invisible handle held across the body near the opposite hip. Swing the arm outward in a wide flat arc at chest height, ending with the arm stretched out to the side. Return to the ready stance. |
| swing_c | yes | Thrust. Ready stance, both hands gripping an invisible handle at the waist. Step the front foot forward slightly and push both hands straight forward in a fast jab, arms fully extended, then pull back to the waist and step back. |
| fire | yes | Aim and recoil. Both arms raised straight forward at shoulder height, hands together as if gripping a handle, steady. Then a short sharp jolt: hands and shoulders kick back and up a little, then settle back to the steady aim. Pause, repeat. |
| hurt | no | Hit while fighting. Starts in the ready stance with the hands gripping an invisible handle in front of the body (as in swing_a). Gets struck: head and upper body jerk backward, one foot steps back, eyes squeeze shut, the grip stays closed. Then recovers back to the same ready stance. |
| collapse | no | Falls down forward. Knees buckle, the body tips forward, hands drop, and the character lands flat on the belly, face down, arms loosely out to the sides, legs straight behind. Stays lying still on the belly until the end. The character stays in the same spot (falls forward in place, does not slide out of frame). |
| cheer | yes | Celebration. Both arms shoot straight up above the head with fists closed. Bend the knees, then jump straight up with both arms still high, land softly on the same spot, bounce once, arms stay up. Repeat. Big happy expression. |

(Not needed yet: profession work poses such as farming, building or healing. They come later per profession.)

Prompt template (fill in the direction and the action's description from the table):

> Animate this pixel art character, seen from the {front | back, facing away from the camera}: {description}.
> Keep the exact same character design, outfit, colors and chunky pixel art style, flat 2D video game sprite.
> Static shot: locked camera, no camera movement, no zoom. Character stays centered, the same size and facing the same
> way, feet on the same spot. Plain flat grey background stays unchanged. No objects of any kind: hands hold nothing.

## Checks before handing a clip back

- Frame 1 identical to the start image.
- Character the same size in the first and last frame (no zoom creep).
- Looping clips: last frame flows into frame 1 without a jump.
- Background still flat grey in every frame.
If a clip fails a check, regenerate it rather than fixing it with an upscale or filter.

## Hand-off

Hand back each clip as soon as it is made, with a short list: file name, action, direction, loop yes/no, and any
check that failed.
