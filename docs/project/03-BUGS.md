# Zombie Haven: the bug list

One list. A bug is fixed only when it has a scripted check that would catch it coming back. Add new bugs at the bottom of the right section with the next number.

Status: **open** · **reproduced** (Claude can make it happen on demand) · **fixed in 3D.x** · **can't reproduce**.

## A. Seen by the owner (first priority)
| # | What is seen | Status |
|---|---|---|
| A1 | **Sliding survivors.** The whole character freezes in one pose and then moves around, attacks or does anything else with no animation at all. Seen many times, over many builds. | open: not yet reproduced. Still unknown: what the person was doing just before, and whether they ever recover. |

*(The owner adds more here. One line each is enough; a recording helps but isn't needed.)*

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
