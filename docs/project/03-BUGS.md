# Zombie Haven: the bug list

One list. A bug is fixed only when it has a scripted check that would catch it coming back. Add new bugs at the bottom of the right section with the next number.

Status: **open** · **reproduced** (Claude can make it happen on demand) · **fixed in 3D.x** · **can't reproduce**.

## A. Seen by the owner (first priority)
| # | What is seen | Status |
|---|---|---|
| A1 | **Sliding survivors.** The whole character freezes in one pose (standing, arms down, legs straight) and then moves around, attacks or does anything else with no animation at all, and never recovers. Seen many times, over many builds. | **fixed in 3D.176** (16 Nov), waiting for the owner to confirm in play. Cause and check in the notes below. |
| A2 | **Emoji keep flashing.** The emoji keep flashing or appearing again and again (owner, 16 Nov). | open: not yet looked at. Still unknown: which emoji (above a survivor's head, in the news pill, on a card or button) and what is happening at the time. |
| A3 | **The game suddenly froze** (owner, 16 Nov, build 3D.175, about 30 seconds into a session with the Animation tracker on). | open: not reproduced; no error in 15 minutes of cloud soaks with the tracker on. Still unknown: whether the picture stopped or the whole page, whether it also happens with the tracker off, and whether it still happens in 3D.176. |
| A4 | **Tapping a person brings up the radio.** With the People list open, tapping a row (Marcus) opened an old radio card ("The Trader") instead of the person; after OK, tapping again opened it again (owner's video, 16 Nov). | **fixed in 3D.177** (16 Nov), waiting for the owner to confirm. A radio card that had closed was invisible but still caught taps in the strip above the bottom bar, and re-opened its old message. Check: `node tools/qa/radio_tap_check.js` (fails on 3D.176, passes on 3D.177). |

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

UI problems are listed in `04-UI.md`, not here.

## C. Code and tools
| # | What | Status |
|---|---|---|
| C1 | Test suite: 35 standing failures; `newz` flaky | open |
| C2 | A late test crashes the browser in a full suite run (`sim`, `sound`); passes alone | open |
| C3 | Almost all game code in one file, `js/game.js` | open (clean-up plan) |
| C4 | Play-test tool has no map; several orders fail with no reason | open |
| C5 | `runs/*/*.jsonl` is gitignored, so run logs don't reach the repo | open |

## Fixed (last 10)
- 3D.177: A4 a closed radio card no longer takes taps (it re-opened its old message when you tapped the People list). Check: `tools/qa/radio_tap_check.js`.
- 3D.176: A1 sliding survivors (the animation clock and the accessory list shared a name). Check: `tools/qa/frozen_check.js`.
- 3D.175: frozen-pose check in the Animation tracker (tool only).
- 3D.174: a storage door walled off from the town is opened by the game (Gates).
- 3D.173 + f88fa57: stuck stronghold coach hint removed.
- 3D.172: sealed check; gap hints; patients stay in bed at night; stuck sites say why.
- 3D.170: downed people on unwalkable tiles; stale trip cards; false "food under 1 day".
- 3D.169: 3D memory freed after fights (crashes).
