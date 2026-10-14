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
