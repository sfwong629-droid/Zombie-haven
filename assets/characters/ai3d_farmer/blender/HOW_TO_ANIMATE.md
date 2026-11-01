# Posing the Farmer in Blender

`zombie_haven_farmer_animation.blend` opens in Blender 5.2 or newer. It has:

- the rigged Farmer with the game's cartoon shading,
- the bat, axe, rifle and AK-47,
- the game camera,
- all 17 animations, already keyframed exactly as they look on the test page.

You change the poses. Claude renders them with the same camera, outline and effects.

## 1. First look (5 minutes)
1. Open the file.
2. Use the **Animation** tab at the top.
3. Put your mouse over the big 3D view and press **Numpad 0**. This is the game's camera view: what you see is what the sprite will be.
   - If your keyboard has no number pad, use View ▸ Cameras ▸ Active Camera.
4. Switch the 3D view's shading to **Material Preview**. It's the third of the four little spheres at the top right of the 3D view. The Farmer then shows his real colours.
5. Press **Space** to play and Space again to stop. The file opens on **Swing A** with the bat.

## 2. Pick an animation
1. **Select the rig first.** Click `rig` in the Outliner (top right) or click one of the thin sticks in the 3D view. The Action Editor only shows actions for the selected rig, so with nothing selected its header is empty.
2. Find the **Dope Sheet** at the bottom of the Animation tab.
3. Change its mode from *Dope Sheet* to **Action Editor**. The header now shows the current action, `swing_a`.
4. Click the small icon just left of that name to open the list of all actions, and pick the one you want. The names are:

| Action | What it is |
|---|---|
| `idle`, `walk` | Empty hands |
| `hold_idle_melee`, `hold_walk_melee` | Bat or axe in hand |
| `hold_idle_gun`, `hold_walk_gun` | Rifle or AK |
| `swing_a` | Overhead swing |
| `swing_b` | Side swing |
| `swing_c` | Diagonal swing |
| `fire` | Shooting |
| `punch`, `rescue` | Punch; push cart |
| `hurt`, `hold_hurt_melee`, `hold_hurt_gun` | Hurt with empty hands, melee weapon or gun |
| `collapse`, `cheer` | Fall down; celebrate |

**Set the playback range for each animation.** Each one ends at a different frame, so after picking one, set the timeline's End to that action's last frame. You can find it in the Action panel (press N in the Action Editor). Otherwise the playback runs past the end of the animation.

## 3. Show a different weapon
1. In the **Outliner** (top right), find the four collections `weapon bat`, `weapon axe`, `weapon rifle` and `weapon ak47`.
2. Click the eye icon to show one and hide the others.
3. **For gun animations**, also turn on the grip. Select the rig, enter Pose Mode, and select the `forearm.R` bone, then `forearm.L`. In the Bone Constraints tab (the bone icon with a link), set **gun grip** Influence to 1. The hands then lock onto the rifle like they do in the render.
   - Turn it back to 0 when you're done.
   - Guns ride on the chest, so for gun animations you mostly pose the body and legs.

## 4. Change a pose
1. Click the skeleton (the thin sticks drawn in front of the body). Press **Ctrl+Tab** to enter **Pose Mode**.
2. Go to a keyframe, one of the diamonds in the Action Editor. Each diamond is one sprite frame in the game.
3. Click a bone and press **R** to rotate it.
   - Press **R** twice for free rotation.
   - Type R X 30 Enter to turn 30° around one axis.
4. When the pose looks right through the camera, press **I** to keyframe it. Choose *Rotation*. For the pelvis, which also moves up and down, choose *Location & Rotation*.
5. **Alt+R** clears a bone's rotation if you mess one up. **Ctrl+Z** is undo.

Useful bones:

| Bones | Notes |
|---|---|
| `upperarm`, `forearm`, `hand` | Each has .L and .R. The bat and axe ride on `hand.R`. |
| `thigh`, `shin`, `foot` | Knee bend is on the shin. |
| `pelvis` | Moving it down bends both knees. |
| `chest`, `neck`, `head` | |

## 5. Timing rules
- The scene runs at **100 frames per second, so 1 frame = 10 ms**.
- **Every keyframe becomes one sprite frame.** The gap to the next keyframe is how long that sprite shows in the game. Keys at 0, 16, 29… mean the first sprite shows for 160 ms.
- You can add or delete keyframes (more keys means more sprites) and drag them closer together or further apart to change the speed.
- The action's **frame range end** closes the last sprite. Looping animations loop from there back to frame 0.
- Keep the same number of keyframes for the swings, punch, fire and hurt if you can. The swooshes, sparks and muzzle flash then land on the same frames. If you change the count they still appear, spread out by time.

## 6. Send it back
1. Save the file (**Ctrl+S**).
2. Attach it in the chat and say which animations you changed.

Claude renders those with `anims.py ... actions=zombie_haven_farmer_animation.blend` in all four directions with the weapons and effects, then updates the test page. Animations you didn't touch come out exactly as before.

## Getting stuck
Two good YouTube searches: "Blender pose mode basics" and "Blender action editor keyframes beginner". You only need posing and keyframing, not modelling or rigging.
