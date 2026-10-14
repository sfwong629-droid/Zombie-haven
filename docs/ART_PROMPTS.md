# Approved art prompts (C64 standard, 106 grid)

Prompts that produced owner-approved art. Reuse them; change only the description of the subject.

## Characters: PixelLab (approved farmer, October 2026)

**Settings**
- Character creation, 8 directions
- Size 64px, Camera: Low Top-Down, Character type: Bipedal realistic
- Detail: Medium detail, Outline: single color black outline
- South (front) slot: `tools/art/sources/pixellab/c64/farm_m_south_ref.png` (medic-style farmer, 64 x 64)

**Description**
```
young adult farmer, lean but healthy build, slightly slimmer than
average, shoulders a little narrower than the hat brim, arms and legs
of normal thickness (not skinny), head about one third of height,
expressive face with clear eyes, eyebrows and mouth, straw hat,
blond hair, green shirt with rolled sleeves, brown overall shorts,
tan shoulder bag, brown boots, hands empty
```

**Negative description**
```
fat, chubby, stocky, broad shoulders, thick arms, round belly,
skinny, thin limbs, stick figure, chibi, weapon, tool in hand,
soft shading, blur, shadow, background, text
```

**Walks** (South-West = front, North-West = back, 6 frames each)
```
calm walk, legs alternating, one foot always on the ground, arms
swinging gently, steady height, same size every frame
```
Build: `python3 tools/art/build_hd_char.py --c64 <tag>` with the GIFs in `tools/art/sources/pixellab/c64/`.

For other survivors, keep the settings, the build words ("lean but healthy ... head about one third of height,
expressive face ...") and the negative description; change only the outfit. Make a front (south) reference first
in the same medic style.

## Buildings: ChatGPT project "2D Game Sprite Generator" (approved Medical Tent, Option 1)

Project instructions: `tools/art/templates/t106/chatgpt_project_instructions.txt`.
Project files: `scale_reference.png`, `footprint_1x1.png`, `footprint_2x1.png`, `footprint_2x2.png`
(all in `tools/art/templates/t106/`).

**Combined prompt** (one message, new chat in the project). For other sizes, change "1x1" and the size line
(2x1: 157 pixels wide, footprint_2x1.png; 2x2: 210 pixels wide, footprint_2x2.png).
```
Zombie Haven building. PIXEL ART, not painting: draw it like the
farmer in scale_reference.png, with the same style (1-pixel dark
outline, flat colours with 3 shades, no texture, no gradients).
PIXEL GRID: every pixel exactly 10x10 image pixels, all on one
perfectly even grid. No pixel smaller or bigger than the others,
no soft edges, no blur.

Building: 1x1 medical tent. Cream canvas tent with a big red cross
on the roof, dark green side panels, wooden corner posts with rope
lashing, a small white flag with a red cross on a pole at the back,
a red first-aid cooler and a blue barrel tucked against the walls,
a lantern hanging at the entrance, a cot and a small table with
medicine bottles visible inside.

Shape: true 2:1 isometric, the ground outline sits EXACTLY on the
diamond in footprint_1x1.png. The bottom edge of the left wall and
the bottom edge of the right wall must both rise exactly 1 pixel for
every 2 pixels across (26.57 degrees). Square base: the right wall
exactly as long as the left wall. The four corner posts stand exactly
on the four corners of the diamond, with the front post at the
bottom corner.

Size: the base is 106 pixels wide from the left corner post to the
right corner post. The top of the roof is about 104 pixels above the
bottom of the front post. Entrance on the front-left wall.

Inside the diamond: rope stakes, guy ropes, barrel, cooler and all
props stay inside the diamond. Nothing sticks out to the left or
right.

Background: flat solid #FF00FF magenta. NO ground, NO grass, NO dirt
patch, NO shadow, NO text. Output only the building.
```

**Into the game**: read onto the game grid at the drawn scale (about 10.3 image px per game px for the approved
tent), anchored on the front post's base, with `fix_iso.repix_anchor`. No straightening or resizing (owner rule).
Check the footprint and run an in-game screenshot test before adding it to `C64_BUILD` in js/game.js.

## Character attacks: PixelLab states (workflow from PixelLab's "Character States" video)

Make a **state** (the pose) first, then animate **from** that state with Custom animation V3, "Enhance prompt" on,
and the first frame kept (6 generated frames + the state = 7 frames). Only South-West and North-West are needed;
the game mirrors the rest. Hands stay empty: the game draws the equipped weapon in the hand.
The game uses 3 frames per attack (wind-up, hit, follow-through); 7-frame GIFs are fine, the builder picks frames.

| Game animation | State prompt | Animation prompt |
|---|---|---|
| punch (unarmed) | `fighting stance, fists raised in front of the face, weight on the back foot, hands empty` | `quick jab: punches forward with the front fist, then pulls back to the fighting stance` |
| blunt (pipe, bat, axe) | `both empty hands raised high over the right shoulder as if gripping a club, ready to swing, feet apart` | `swings both hands down hard in front of the body as if hitting with a club, then returns to the raised ready pose` |
| shoot (guns, bow) | `aiming forward at shoulder height with both empty hands together as if holding a rifle, front foot forward` | `small recoil: shoulders jolt back slightly as if firing, then settle back into the aim` |

**Blunt: use 3 states, not an animation** (tested October 2026). Animating "swing" with empty hands made PixelLab add a
stick and a white swing streak, or turn it into a punch. Three states (palette from reference ticked) work cleanly;
each state GIF holds all 8 directions in the order S, SE, E, NE, N, NW, W, SW (use frame 8 = SW, frame 6 = NW):
- up: the blunt state above
- forward: `both empty fists together, arms stretched straight out in front of the chest, body leaning forward, feet apart, no weapon, no stick, no effects`
- down: `both empty fists together low in front of the knees, arms straight down, body bent forward at the waist, feet apart, no weapon, no stick, no effects`

Sources: `tools/art/sources/pixellab/c64/farm_m_blunt_{up,fwd,down}_8dir.gif`.

Optional transitions with interpolation (start = state, end = idle): `lowers the fists and relaxes`.
Small face or hand glitches: fix in Pixelorama (copy the good face across frames) rather than regenerating.
