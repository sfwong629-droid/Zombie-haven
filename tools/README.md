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
| `python3 tests/run_tests.py` | The game's test suite (~12 min in the cloud). About 35 failures are old and known; compare the count with the previous commit, never expect zero. |
| `node tools/qa/ui_check.js` | 3D.159 layout check: six screen sizes, every message type at once. Fails on overlaps, anything off screen, buttons under 44 px. Screenshots `ui_<size>.png`. |
| `node tools/qa/anim_soak.js 240000` | Plays a new game for 4 min and lists every animation mismatch (sliding, walking in place, feet too fast), grouped. |
| `node tools/qa/frozen_check.js 240000 2` | 3D.175 bug A1 check: freezes one survivor on purpose to prove the tracker notices, then plays for 4 min at 3× and fails if anyone's bones stop moving while they are on their feet (FROZEN). Exit 0 ok, 1 frozen, 2 self-test failed. |
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
