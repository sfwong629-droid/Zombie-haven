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
