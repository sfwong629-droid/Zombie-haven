# Zombie Haven: the bug list

One list. A bug is fixed only when it has a scripted check that would catch it coming back. Add new bugs at the bottom of the right section with the next number.

Status: **open** · **reproduced** (Claude can make it happen on demand) · **fixed in 3D.x** · **can't reproduce**.

## A. Seen by the owner (first priority)
| # | What is seen | Status |
|---|---|---|
| A1 | **Sliding survivors.** The whole character freezes in one pose and then moves around, attacks or does anything else with no animation at all. Seen many times, over many builds. Owner, 16 Nov: the stuck pose is standing, arms down, legs straight; they don't seem to recover. | open: not yet reproduced. A check that can see it exists since 3D.175 (notes below). |

*(The owner adds more here. One line each is enough; a recording helps but isn't needed.)*

### A1 notes (Bugs chat, 16 Nov)
- **Why earlier fixes missed it:** the Animation tracker (3D.58) compared the body's speed with the clip the game *asked for*. It never looked at whether the bones move, so a survivor whose clip is chosen correctly but isn't playing showed as healthy. None of the 3D.39 to 3D.100 fixes had a check that could see this bug.
- **3D.175, the frozen-pose check (test tool only, no game change):** the tracker now watches the bones. A survivor on their feet whose bones haven't changed for 1 s while moving or fighting (3 s otherwise) is flagged `FROZEN (bones not moving)`, and the log line records what the clip was really doing (clip time, weight, enabled, paused, running, the mixer clock, which clips are live). It works when the tracker is switched on *after* the freeze. Scripted: `node tools/qa/frozen_check.js 240000 2` freezes one survivor on purpose to prove the flag fires, then soaks at 3x and fails on any FROZEN.
- **Result so far:** self-test passes. Two soaks (5 and 6 minutes, new game, 3x speed, fights included) found nobody frozen. A 200,000-step random test of clip switching on a real survivor never left the bones without a live clip. So the freeze is not in the clip-switching code itself; it needs something the short soaks don't do.
- **Ruled out by reading or test:** the clip cross-fade logic; bad numbers in the animation clock (the time step is always 0 to 0.1 s and the game speed is always a real number); the off-screen slow update (4 updates a second, choppy but not frozen); an error inside the draw loop (it would stop the whole picture, not one person).
- **Still a lead for a different symptom (unconfirmed):** a survivor's strike clip is only restarted on a frame where the sim says "not attacking" and the clip has finished; with fast weapons or 3x speed a survivor may hold the end-of-strike pose across attacks. This is not the standing pose the owner sees.
- **Not yet tried:** long sessions (hours), saves loaded from older builds, the stronghold and trips, the Gear screen (it sets game speed to 0), night skip (30x), job changes, 3D armour swaps, a phone's real graphics chip.
- **Next step:** publish 3D.175 so the owner can capture it: when someone freezes, Settings > Animation tracker > wait 5 seconds > Copy log, and paste it in the Bugs chat.

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
- 3D.174: a storage door walled off from the town is opened by the game (Gates).
- 3D.173 + f88fa57: stuck stronghold coach hint removed.
- 3D.172: sealed check; gap hints; patients stay in bed at night; stuck sites say why.
- 3D.170: downed people on unwalkable tiles; stale trip cards; false "food under 1 day".
- 3D.169: 3D memory freed after fights (crashes).
