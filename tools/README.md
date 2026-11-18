# Zombie Haven tools — how to use them (cloud session or Claude Code on your PC)

Everything here runs from the repo, so the same steps work in a claude.ai cloud session and in Claude Code on your own computer.
On a PC the browser checks are much faster: set `ZH_GPU=1` to use your graphics card (the cloud has none, so it falls back to software 3D at ~10 fps).

## One-time setup

| Need | Install | Used by |
|---|---|---|
| Node 18+ and Playwright | `npm i -g playwright` then `npx playwright install chromium` | `tools/qa/*`, `tools/art/b3d/gate_poses.js` |
| Python 3.11 + Pillow + numpy | `pip install pillow numpy` | sheets, kit, publish |
| Blender as a Python module | `pip install bpy` (Python 3.11 only) — or run the `.py` files with Blender's own `blender -b -P` | `tools/art/b3d/*` (armour fitting) |
| Model compressor deps | `cd tools/art && npm i` | `compress_glb.mjs` |

Serve the game while testing: `python3 -m http.server 8765` from the repo root (the checks look at `ZH_BASE`, default `http://localhost:8765`).

## Checks before a release

| Command | What it does |
|---|---|
| `python3 tests/run_tests.py` | The game's test suite (~2 min in the cloud), 39 tests, all passing since 16 Nov. `combat` and `expchoices` have each failed once in a full run and pass alone. |
| `python3 tools/build/game.py` | Joins the area files in `src/game/` into `js/game.js`. `--split` cuts `js/game.js` back into the area files; `--check` says whether the two match (the suite's `parts` test). See `src/game/README.md`. |
| `node tools/qa/ui_check.js` | 3D.159 layout check: six screen sizes, every message type at once. Fails on overlaps, anything off screen, buttons under 44 px. Screenshots `ui_<size>.png`. |
| `node tools/qa/anim_soak.js 240000` | Plays a new game for 4 min and lists every animation mismatch (sliding, walking in place, feet too fast), grouped. |
| `node tools/qa/frozen_check.js 240000 2` | Bug A1 check (3D.175/176): freezes one survivor on purpose to prove the tracker notices; then a survivor with a backpack and every figure rebuilt off screen must animate; then plays for 4 min at 3× and fails if anyone's bones stop moving (FROZEN). Exit 0 ok, 1 frozen, 2 self-test failed. |
| `node tools/qa/stalker_look_check.js` | 3D.179 bug A7 check: the Stalker's note picture must not be the stand-in Runner or wear its skin once the Stalker's own file has loaded. |
| `node tools/qa/sos_skip_check.js` | 3D.180 bug A2 check: a fighter who cannot get to a zombie that is bashing a building is not sent straight back at it. |
| `node tools/qa/radio_tap_check.js` | 3D.177 bug A4 check: a radio card that has closed must not take taps (it used to re-open its old message when you tapped the People list). |
| `node tools/qa/raider_note_check.js [card.png]` | 3D.178 bug A5 check: the "New: Raiders" field note must show a raider (in the Toll Kings' kit), not the zombie picture. |
| `node tools/qa/tip_hide_check.js [list.png]` | 3D.186 (W40) check: each tip in the Needs you list has a ✕ with a 44px tap area that hides it until the next day; the tip is back the next day. |
| `node tools/qa/raider_weapon_check.js [note.png]` | 3D.187 (W33, W55) check: every town raider carries the weapon of its kind and era (Thief knife → katana, Brute nail bat → fire axe, Firebug pipe → spear), each has a model of its own, and the Raiders note shows the weapon of the raider that came. |
| `node tools/qa/menu_overlap_check.js [sizes] [tag]` | 3D.195 (U13, U14) check: at six phone sizes, with Build, People, Town and a survivor's details open: the radio button is hidden, the alert button is hidden whole where the menu reaches it, the "Paused" pill sits centred on the menu's top edge clear of the mission card, and nothing covers the menu's first button. |
| `node tools/qa/zoo_show_check.js [shot.png]` | 3D.183 check: the Zombie test page shows one zombie at a time; Stand / Walk / Run / Attack play the right clip on the spot; Turn turns it; "Show all" lines everyone up. |
| `python3 tools/qa/crawler_legs_check.py` | 3D.185 check: both Crawler models end at the thigh (no legs) and still have their 35 clips. |
| `node tools/qa/new_zombies_check.js [shot.png]` | 3D.182 check: the 11 new zombie models are lined up on the Zombie test page, each file loads, and each figure wears its own model. |
| `node tools/qa/ink_check.js mattress,hawaii` | Armour close-ups with the ink outline on and off (the 3D.157 speckle check). |
| `node tools/art/b3d/gate_poses.js OUT id1,id2` + `python3 tools/art/b3d/kit/gsheet.py OUT 5 sheet.png` | The armour "gate": each armour in idle, cheer, walk, run, swing, hammer and collapse, male and female, on one sheet. Look at it before showing the owner. |

`tools/qa/lib.js` has the shared start-up (new game, intro skipped, cards closed); new checks should use it.

## Armour pipeline (Tripo model -> in-game armour)

1. **Sheet:** ChatGPT image with `tools/chatgpt/armor_sheet_prompt.md`. Show the owner the whole sheet first. Split with
   `python3 tools/art/sheets/cutloc.py sheet.png <item> OUTDIR` (or `dataurls.py` for images copied out of the browser, see `tools/chatgpt/helpers.js`).
2. **Owner makes the Tripo model** and sends `<Kit>.glb`. Put it in the kit work folder (`$ZH_KITS`, default `kits_work/`, not committed).
3. **Inspect:** `python3 tools/art/b3d/kit/insp.py <Kit>` (in the work folder) -> `<Kit>_fc.npy`.
4. **Spec:** add the item to `tools/art/b3d/fits/specs.json` (vpose, drop / keep / splitat / core / solid / rigid options; see `gear_strip_pink.py`).
5. **Fit:** `tools/art/b3d/kit/runspec.sh <id> [...]` -> `assets/characters/ai3d_v2/armor_<id>_m3.glb`. The rig it fits to is `assets/characters/ai3d_v2/rig/armor_base.blend`.
6. **Game code:** ARMOR3D loader list, SUIT3D colours and PAINT3D (painted cloth) in `js/render3d.js`; the item in `ITEMS` (`js/game.js`); its icon in `js/itemicons.js`.
7. **Gate** (above), then show the owner, then publish.

## Zombie pipeline (raw Tripo model -> in-game zombie model)

1. **Two-legged:** `tools/art/b3d/kit/zombie.sh <id> <Model>.glb` -> `assets/characters/ai3d_v2/zombie_<id>.glb` (the settings some models need are listed at the top of the script).
   **Four-legged:** `python3 tools/art/b3d/ai_stag.py <Model>.glb OUT.glb`, then `node tools/art/compress_glb.mjs OUT.glb assets/characters/ai3d_v2/zombie_<id>.glb zombie`.
   **Checking animations:** `node tools/art/decomp.mjs MODEL.glb RAW.glb` if needed, then `python3 tools/art/b3d/animdump.py RAW.glb OUT.npz 9` and `python3 tools/art/b3d/strips.py OUT.npz OUTDIR 4 [clip,clip]` draw every clip as a strip of pictures (side and front).
   **Copying a recorded movement** (3D.189): `python3 tools/art/mocap/retarget.py -- RAW.glb CLIP.bvh START LENGTH <old clip to compare> OUT.npz 9` fits a motion capture cycle (CMU library, BVH) to the survivor skeleton; it prints the stride and writes OUT.json (the clip) and OUT.npz (old and new for `strips.py`). Then `node tools/art/inject_clips.mjs RAW.glb NEW.glb walk=OUT.json jog=OTHER.json` replaces or adds clips, and `node tools/art/compress_glb.mjs NEW.glb assets/characters/ai3d_v2/survivor_m3.glb` packs it. Put the printed GROUND SPEED (ground per cycle divided by the clip's length; not the ground per cycle) in `STRIDE` in `js/render3d.js`. Check: `node tools/qa/walk_jog_check.js`. Melee swings: `sh tools/qa/swing_head_check.sh` proves the weapon never passes through the head and (3D.203) never turns more than 48 degrees in one screen frame (no teleporting; `fixswing.py` re-spreads the timing, `ZH_OMEGA` and `ZH_VHAND` set the limits). Since 3D.206 it also proves the weapon is never inside the body (`tools/art/b3d/bodyhit.py`, on the real mesh). Reference sheets of real recordings (stick figures, the weapon drawn through both hands): `python3 tools/art/mocap/bvhref.py OUT.png "TITLE|BVH|f0|f1|N|RL" ...`. **Two-handed set** (3D.207): `ZH_FACEHIPS=1 ZH_ONESHOT=1 ZH_WDIR=1 python3 tools/art/mocap/retarget.py -- RAW.glb REC.bvh START LENGTH melee_combo2h_1 OUT.npz` keeps the recorded body and the line between the hands; the stances are `ZH_TWOHAND=hold` (`ZH_HOLD=stab` for the spear) and the swings `ZH_TWOHAND=rec ZH_WDIR=OUT.json` (the stab `ZH_TWOHAND=stab`; since 3D.208 the slam `ZH_TWOHAND=slam`, a mirrored recording `ZH_MIRROR=1` in retarget.py, and `ZH_NOLBLEND=1` keeps the left hand on the handle while returning to the stance) in `tools/art/b3d/fixswing.py`, with `ZH_GEAR` (the decompressed `gear_weapons.glb`) and `ZH_GEARW=sledge,axe,shovel,roadsign` (or `spear`) so the head and body are cleared for the real weapons, `ZH_STANCE_JSON` (from `dumpstance.py`) for the start and end. Check: `sh tools/qa/twohand_check.sh` (each real weapon: never in the head or body, no jumps, both hands on it, `gripcheck.py`; each clip starts and ends in its stance). `sh tools/qa/swing_arm_check.sh` (3D.205) proves each one-handed swing starts in the melee stance, ends where it starts, never turns an arm bone more than 30 degrees (free arm) or 48 (weapon arm) in one screen frame, and that Swing 3 is a rising cut. To build them: `python3 tools/art/b3d/dumpstance.py -- GAME.glb stance.json` on the decompressed game file, then `ZH_STANCE_JSON=stance.json python3 tools/art/b3d/fixswing.py -- RAW.glb melee_swing_a OUT.json` (and `ZH_RISE=1` for `melee_swing_c`, the rising cut). To correct a hand-made swing instead of replacing it: `python3 tools/art/b3d/fixswing.py -- RAW.glb melee_swing_a OUT.json [OUT.npz]`, then `inject_clips.mjs` as above (do not pipe its output through `head`: it stops before writing the file). When a clip becomes a recording, add its name to `SVT_REAL` in `src/game/27-test-pages-title-backups.js` so the Survivor test page (`?svt=1`, check: `node tools/qa/survivor_test_check.js`) marks it REAL.
2. **Game code:** an entry in `ZMODEL` in `js/render3d.js` (walking speeds from `tools/art/stride/measure.html?m=zombie_<id>`). A model no zombie type uses yet goes on the Zombie test page through `ZOO_NEW` (`src/game/27-test-pages-title-backups.js`).
3. **Check:** `node tools/qa/new_zombies_check.js shot.png`, and look at the Zombie test page (`?zoo=1`).

To take the legs off a rigged model without touching its skeleton or clips (the Crawlers, 3D.185): `node tools/art/cut_legs.mjs IN.glb OUT.glb [how far down the thigh, 0 to 1] [u,v of a dark red texture point]`.

## Publishing the playable game (claude.ai artifact)

The game is published as https://claude.ai/artifact/PidbC3srwbxmFqhfPkqJmn — this step needs a claude.ai session (the Artifact tool).
1. Commit and push first; publish only committed code.
2. `python3 tools/publish/prep_pub.py <play folder> [new armour ids]` copies the game files, wraps new armour models, bumps `v=3d.N`.
   The play folder's `index.html` is the published page, not the repo's: change only the lines that changed.
3. Publish with the files map it prints. Before publishing a file you did not publish in this session, read the published copy and compare it with git.

## Rules that always apply
- Never push to `main`; work on `art-direction-b`. Report the repo and commit links after each push.
- Must work offline. No Claude for character AI. No weapons on zombies. No weapon or shooting words in ChatGPT prompts.
- Funny text: facts first, joke last. Project decisions are logged in the claude.ai project doc `claude/zombie-haven-decisions-part2.md`.
