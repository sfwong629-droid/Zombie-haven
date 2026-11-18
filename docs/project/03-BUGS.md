# Zombie Haven: the bug list

One list. A bug is fixed only when it has a scripted check that would catch it coming back. Add new bugs at the bottom of the right section with the next number.

Status: **open** · **reproduced** (Claude can make it happen on demand) · **fixed in 3D.x** · **can't reproduce**.

## A. Seen by the owner (first priority)
| # | What is seen | Status |
|---|---|---|
| A1 | **Sliding survivors.** The whole character freezes in one pose (standing, arms down, legs straight) and then moves around, attacks or does anything else with no animation at all, and never recovers. Seen many times, over many builds. | **fixed in 3D.176** (16 Nov). Owner, 16 Nov: not seen since, so far. Cause and check in the notes below. |
| A2 | **The angry emoji keeps flashing.** The 😤 face appears above someone again and again (owner, 16 Nov). | **fixed in 3D.180** (16 Nov). Owner, 16 Nov: not seen since. One loop found and fixed: when a zombie is bashing a building, the game calls nearby fighters every half second; a fighter who had just found there is no way to that zombie was sent straight back at it, with the angry face each time. The call now leaves them alone, as the ordinary target picking already did (3D.124). Not proven that this is the only cause. Check: `node tools/qa/sos_skip_check.js` (fails on 3D.179, passes on 3D.180). |
| A3 | **The game suddenly froze** (owner, 16 Nov, build 3D.175, about 30 seconds into a session with the Animation tracker on). | **closed, can't reproduce** (owner, 16 Nov: it doesn't happen now). Never reproduced in the cloud; cause unknown. Reopen if it comes back. |
| A4 | **Tapping a person brings up the radio.** With the People list open, tapping a row (Marcus) opened an old radio card ("The Trader") instead of the person; after OK, tapping again opened it again (owner's video, 16 Nov). | **fixed in 3D.177** (16 Nov), confirmed by the owner. A radio card that had closed was invisible but still caught taps in the strip above the bottom bar, and re-opened its old message. Check: `node tools/qa/radio_tap_check.js` (fails on 3D.176, passes on 3D.177). |
| A5 | **The "New: Raiders" note shows a zombie.** The first-time Raiders card had a walker picture in the middle (owner's screenshot, UI chat, 16 Nov). | **fixed in 3D.178** (16 Nov), waiting for the owner to confirm. The Raiders note is stored with the zombie notes (key `z:raider`), and the card drew a zombie picture for every note in that group; "raider" is not a zombie model, so the picture fell back to the plain walker. The card now shows a raider in the Toll Kings' kit with a bat (owner's pick). Check: `node tools/qa/raider_note_check.js` (fails on 3D.177, passes on 3D.178). |
| A6 | **Ben keeps saying "Couldn't reach it — trying later".** Ben Kaur (Farmer), day 8 around 19:00, standing in the gateway by the Camp; his need was hunger ("Urgent need → the Garden Plot"). Noah was heading to the same Garden Plot (owner's video, 16 Nov, 3D.177). Owner: the Garden Plot is not inside a fence or wall; the fence around the town has three gates. | open: not reproduced. The message means the path finder found no route from where he stands to that building's door (`goFacility` in `js/game.js`); he then avoids that building for 3 game hours and tries again. Not known yet: why there is no route (he stands on a tile with no way out, or the path search giving up on a big map: it stops after 9000 steps). Needs the owner's save: the game already has one (More → event log → Backup this town → Copy text), so no new button is needed. |
| A7 | **The Stalker does not look like its model file.** The "New: Boss: Stalker" note showed the Stalker's shape covered in red, grey and cream blotches (owner's screenshot, 16 Nov). | **fixed in 3D.179** (16 Nov), confirmed by the owner in the zombie test. While the Stalker's file loads the game draws a stand-in Runner; the stand-in saved its skin under the Stalker's name, so the real Stalker then wore the Runner's skin for the rest of the session, in the note and in play. Left over: if the note appears before the file has loaded at all, it shows the stand-in Runner that one time (the picture is no longer kept, so the next one is right). Check: `node tools/qa/stalker_look_check.js` (fails on 3D.178, passes on 3D.179). |
| A8 | **Zombie test: the menu and icons show, but no map and no zombie.** Owner, 17 Nov, on the phone app, build 3D.188 (live version 229). | **closed, can't reproduce** (owner, 17 Nov: it is fine now, it looks like a connection issue). Nothing in the game was changed. Reopen if it comes back. What was checked (Art chat, 17 Nov): The live files are byte-for-byte the repo's 3D.188, and a local copy of the published game shows the map and the Walker in a desktop browser and as an iPhone 13 and a Pixel 7 (emulated; no real phone was available). The renderer already knows one way to get this picture: when a phone runs short of graphics memory or the game is put in the background, the 3D world goes black while the menus keep drawing, and a line "Graphics paused by the phone — restoring…" should appear. The world also stays empty until the first models have downloaded. |
| A9 | **Survivor test: the menu covers the whole screen on the phone and the survivor can't be seen** (owner, 18 Nov, 3D.198). | **fixed in 3D.200** (18 Nov), confirmed by the owner ("test looks good"). The panel listed all 49 animations in six rows (about 520 px tall) and was only ever checked on a tall screen (844 px); the game inside the Claude app has much less height. The panel is now 200 px (group tabs, one row of animations, one line of facts, one row of buttons), the game's own bars and buttons are hidden on that page, and the view is slid so the survivor stands in the free part, closer than before. Check: `node tools/qa/survivor_test_check.js`, now run on a 620-high screen. |

*(The owner adds more here. One line each is enough; a recording helps but isn't needed.)*

### A1 notes (Bugs chat, 16 Nov)
- **Cause:** in `js/render3d.js` each survivor's 3D figure kept its animation clock in `a.acc`, and the accessory code (3D.28) kept its list of accessory pieces under the same name. Setting the accessory replaced the clock with a list; adding time to a list makes text, not a number. With no accessory and the figure on screen it happened to repair itself on the same frame. It never repaired itself for (i) anyone wearing an accessory (School Backpack, Tool Belt, Wristwatch...) and (ii) anyone whose figure was made while they were off screen. Their animation never advanced again, so they stayed in the model's rest pose while the game moved them about.
- **How it was found:** the owner's two tracker logs from 3D.175 showed `acc: null` (not a number) and `mt: 0` (animation clock never ran) on every FROZEN line.
- **Fix (3D.176):** the accessory list is now `a.accParts`. One rename, nothing else.
- **Check:** `node tools/qa/frozen_check.js 240000 2`: self-test (freeze one survivor on purpose, the tracker must flag FROZEN), then a survivor with a backpack must animate, then every figure rebuilt off screen must animate, then a soak at 3x. On 3D.175 it fails at the backpack step; on 3D.176 it passes.
- **Why earlier fixes missed it:** the Animation tracker (3D.58) compared the body's speed with the clip the game asked for and never looked at the bones. Since 3D.175 it does (`FROZEN (bones not moving)`).
- **Left over, not this bug (unconfirmed):** a survivor's strike clip is only restarted on a frame where the sim says "not attacking" and the clip has finished; with fast weapons or 3x speed they may hold the end-of-strike pose across attacks. The logs also show many small WALK IN PLACE / SKATE / FEET TOO FAST flags; nobody has complained about those.

## B. Found by testers or ChatGPT, confirmed in the logs
| # | What | Source | Status |
|---|---|---|---|
| B1 | Walkers stay inside the town all day | rounds 2–4 | open |
| B2 | Rescue loops: "X is rescuing Y" for hours, the rescuer changing, nobody picked up (Theo 107 h in round 4) | rounds 2–4 | open (walled-in doors were one cause; fixed in 3D.174, not re-tested) |
| B3 | Guards stuck chasing walkers they can't reach ("postCombat" for a day) | round 3 Builder | open |
| B4 | The Armory swaps gear the player chose, and spends scrap | rounds 2, 4; ChatGPT judge | open |
| B5 | Weekly review grades a collapsing town S | round 2 judge, round 4 | open |
| B6 | Workshop / Clinic upgrade refused with "no room", no way to make room | rounds 2–4 | open |
| B7 | Favour "Pay" does nothing when 1 short, no message | round 3 | open |
| B8 | Supplies over the cap are thrown away silently | round 2 | open |
| B9 | Build sites stall 16–67 h with materials in stock | rounds 3–4 | open (stuck sites say why since 3D.172) |
| B10 | Repairs and upkeep drain wood and scrap with no ledger | rounds 2–4 | open (design question) |
| B11 | Tents show beds 8/8 after building | ChatGPT tester, round 3 | open |
| B12 | "Lena is now a Engineer" | ChatGPT tester | open |
| B13 | Radio help accepted with nobody down, then a favour is demanded | ChatGPT tester | open |
| B14 | A 12% health Police Officer keeps attacking under Recover & Heal | ChatGPT tester | open |
| B15 | A couple's baby is announced while one parent lies downed | round 4 | open |
| B16 | Squad power ignores current health (240 shown, squad hurt) | round 4 Raider | open |
| B17 | **A Medic freezes all day next to a fence.** The Medic goes to patch someone up who stands just across a fence or wall, stops on the wrong side about 1.5 tiles away, and stands there as "Patching up X" without moving or healing: 9 game hours in the check, and it did not end. | test suite (`profession`), Code clean-up chat, 16 Nov | **fixed in 3D.181** (Bugs chat, 16 Nov). In `fieldAidAI` the Medic aimed for a spot 0.6 tiles from the patient on the Medic's own side; with a fence between them that spot moved whenever the Medic moved, so the route kept changing and they never got within reach (0.95). They now walk the real route to the patient and stop when within reach; if there is no route they give up after 5 tries. Check: `python3 tests/run_tests.py profession` (failed on 3D.180, passes on 3D.181; full suite 38 of 38). Not related to A6 as far as the code shows: A6 is a different routine (`goFacility`). |

UI problems are listed in `04-UI.md`, not here.

## C. Code and tools
| # | What | Status |
|---|---|---|
| C1 | Test suite: 35 standing failures; `newz` flaky | **done** (16 Nov): 35 → 0 failures of 38 tests (the last one, `profession`, needed the B17 fix in 3D.181). Two tests failed once each in full runs and pass alone: `combat`, `expchoices` (flaky, not yet looked at). Notes below. |
| C2 | A late test crashes the browser in a full suite run (`sim`, `sound`); passes alone | **fixed** (16 Nov, commit cb01571). A failing test left its page open; 35 open pages used about 6 GB and the late tests could not load. Check: a full run now takes about 2 minutes (was 14) with no load timeouts. |
| C3 | Almost all game code in one file, `js/game.js` | **step 1 done** (16 Nov, commit 31b2017): the code is kept as 27 area files in `src/game/`, joined into `js/game.js` by `python3 tools/build/game.py`. The joined file is byte-for-byte the old one. Guide: `src/game/README.md`. Check: the `parts` test. **Step 2 open:** the areas still share one scope; separating them for real, one area per session. |
| C4 | Play-test tool has no map; several orders fail with no reason | open |
| C5 | `runs/*/*.jsonl` is gitignored, so run logs don't reach the repo | open |

### C1 notes (Code clean-up chat, 16 Nov)
- **Cause of 15 of the 35:** `tools/dce/prune.js` removed every test hook (`ZH.name`) that no other game file reads, and the test suite was not counted as a reader. 85 of the 89 missing hooks were still in the game; they are back on one line at the end of `js/game.js`. No behaviour change, no build number. When pruning again, pass `tests/run_tests.py` as a user file.
- **Old 2D drawing checks removed (W31, owner said yes):** `geometry` passes with its other 11 checks; `hd` is gone whole, because every check in it was the 2D HD art preview; `rotate` and `tabs` now tap the building's footprint and fail further on, so they moved to the last group below.
- **17 of the last 18 were out-of-date tests, not game bugs** (16 Nov, one commit per group). The game had changed on purpose and the tests had not followed:
  - The map moved: the tests built walls, guard posts and a road at old spots outside today's town (`alerts`, `save_load`, `walls`, `polish`, `posts`, `input`).
  - The opening cutscene (3D.102) blocks saving; tests that opened the page by hand did not skip it (`saves`, `title`, `replay`).
  - UI moved: Main menu is in More → Settings (`menu`); the Bonds tab became About (`tabs`, `traits`); alerts and advisor tips are in the Needs you list behind the alert button (`alerts`, `economy`, `input`).
  - Rules changed: "Turn back now" is a fourth trip option and the Explore panel shows real odds (`expchoices`); a second-garden goal (`guide`); four-way turning and building sites (`rotate`); the Stalker's slower combo (`newz`); repairs done by a person walking over (`walls`).
- **Two old checks were removed with the old alert panel:** "alerts shrink to one row while placing a building" and "hiding an advisor tip mutes it for the day" (the new list has no hide button: W40).
- **One real bug:** B17, found by `profession`. That test stays failing until B17 is fixed (owner, 16 Nov: fix the bugs first, no "known bug" marking).

## Fixed (last 10)
- 3D.206: the weapon no longer dips into the body (found by Claude while answering the owner, 18 Nov): Swing 1's follow-through went about 4 cm into the right thigh, Swing 3's handle end about 2 cm into its own wrist. The swing tool now keeps the weapon out of the body as well as the head. Check: `tools/qa/swing_head_check.sh` (now also `tools/art/b3d/bodyhit.py`).
- 3D.205: the free arm no longer jumps when a swing starts or repeats (owner, 18 Nov: "the left arm is the same issue"): the old swings started 46 to 61 degrees away from the stance and ended 55 to 75 degrees away from where they started. Every swing now starts and ends in the stance. Check: `tools/qa/swing_arm_check.sh`.
- 3D.203: the weapon arm no longer "teleports" in the melee swings (owner's video, 18 Nov): the bat crossed from behind the back to the front in about two screen frames. The swing's timing is re-spread so the weapon turns at most 38 degrees per screen frame. Check: `tools/qa/swing_head_check.sh` (now also: at most 48 degrees per frame).
- 3D.201: melee swings no longer pass the weapon or a hand through the survivor's head (seen by the owner, 17 Nov). Check: `tools/qa/swing_head_check.sh`.
- 3D.200: A9 the Survivor test panel no longer covers the survivor on a phone. Check: `tools/qa/survivor_test_check.js`.
- 3D.191: the new walk and jog of 3D.189 played too fast (walk 14%, jog 29%), so the feet slid a little: the pace table in `js/render3d.js` wants ground covered per second, and Claude had put in ground per cycle. Found by Claude while adding the carrying movement; the owner had not reported it. Check: `tools/qa/walk_jog_check.js` now compares the table with the recordings.
- 3D.181: B17 a Medic no longer stands all day beside a fence instead of patching someone up. Check: `tests/run_tests.py profession`.
- 3D.180: A2 the angry face no longer flashes on a fighter who can't get to a zombie that is bashing a building. Check: `tools/qa/sos_skip_check.js`.
- 3D.179: A7 the Stalker wears its own skin (it wore the stand-in Runner's). Check: `tools/qa/stalker_look_check.js`.
- 16 Nov (tools only): C2 the test runner closes every page after each test; C1: 85 test hooks put back, old 2D checks removed, 17 out-of-date tests brought up to date (35 → 1 failure).
- 3D.178: A5 the "New: Raiders" note shows a raider (Toll Kings' kit), not a walker. Check: `tools/qa/raider_note_check.js`.
- 3D.177: A4 a closed radio card no longer takes taps (it re-opened its old message when you tapped the People list). Check: `tools/qa/radio_tap_check.js`.
- 3D.176: A1 sliding survivors (the animation clock and the accessory list shared a name). Check: `tools/qa/frozen_check.js`.
- 3D.175: frozen-pose check in the Animation tracker (tool only).
- 3D.174: a storage door walled off from the town is opened by the game (Gates).
- 3D.173 + f88fa57: stuck stronghold coach hint removed.
