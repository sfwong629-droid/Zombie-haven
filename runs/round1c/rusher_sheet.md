SCORE: 3/10 · level reached 4 · people alive 0 · deaths 12

# Evaluation sheet — RUSHER · build 3D.163 · seed 21 · days 1–13 (town lost D13 22:00)

Every claim cites a day and a number from my notes (`rusher_notes.md`) or the run log (`rusher.jsonl`).

## Haven levels reached
| Level | Reached | Upgrade timer when started |
|---|---|---|
| 2 | D2 10:00 | ~10 h (levelup D1 23) |
| 3 | D3 09:00 | 18 h (levelup D2 11) |
| 4 | D8 16:00 | 105 h (levelup D3 10) |
| 5 | never | 150 h (levelup D8 16); 45 h still left when the town died D13 22 |

## Fun score: 3 / 10
The first two days felt fast and readable, then the path to the next level became one long timer (105 h, then 150 h). The only thing I could do with that time was grow the town, and growing it (land tier 2) set off a collapse spiral that killed all 12 people on D13.

## Three moments that raised it
1. D1–D3: levels 2 and 3 came in about 49 game hours. `nextLevel` listed exactly two checks (D1: "People 4/6, Buildings 1/6"), and I met them with cheap builds plus a lumber run (+16 wood, D1 17).
2. D7 06: I cleared the Overrun Clinic stronghold with power 197 against a recommended 175. The fight lasted 67 s. June and Amy went down, I used `sh med` twice and `sh focus` when the boss was at 20%. Reward: +25 renown, +9 meds. This was the most fun part of the run.
3. D8 16: L4 unlocked the Lodge, and on D9 05 a whole tier-2 build list opened up (lumber, quarry, armory, school and more). It felt like real progress, but it came after 105 h of waiting.

## Three moments that lowered it
1. D3 10: the L3→4 upgrade took 105 h, after 10 h and 18 h for the first two. Nothing warned me that the timer would grow tenfold. Then D8 16: the L4→5 timer was 150 h.
2. D9 05 → D13 02: expanding to land tier 2 (the only progress available while I waited) brought daily "someone is down" stops: D10 13–21 Ben, both Junes, Theo, Eli, Leo, Maya, Rosa; D12 22–D13 02 all 12 people. The med tent was wrecked on D10 16 and D12 04, and the log said "no medical bed free: slower care" (D9 10, D10 06).
3. D13 03–22: all 12 were down with nobody left to carry anyone. Between D13 12 and 15 the log shows "X is bleeding out!" for each person, and at D13 21–22 all 12 "rose again as a zombie". The town was lost at L4 with 473 renown sitting unused.

## Waiting with nothing to do
- D3 10 → D8 16 (≈102 game h): waiting on the L3→4 timer. Requirements were already over target (D8 16: people 11/9, buildings 22/13). Nothing I did shortened the wait. Renown climbed from 82 (D3 10) to 297 (D8 16) with nothing to spend it on for levelling.
- D8 16 → D13 22 (≈126 game h): waiting on the L4→5 timer (150 h). It still had 45 h left when everyone died.
- Research trickled at ~0.5 points/h (D4 07: 18; D5 08: 24), so it was no help as a side activity.
- For a rusher, `nextLevel` became useless after D3. It showed only `{'upgrading': True, 'minutesLeft': N}` and the requirements for the next level were already met.

## Over too quickly or too easy
- The requirements for levels 1–4 were trivial. They were always met before the timer ended (D2 11: 7/7 people, 9/8 buildings; D3 10: 8/8, 14/10; D8 16: 11/9, 22/13). The checklist is not what holds you back. The clock is.
- Low-risk trips were not low risk: Rosa collapsed on Houses Low (D5 10) and Lena was downed on Lumber Yard Low (D12 16).

## Stuck
- Stuck on the L4→5 timer from D8 16 until the end. I tried expanding land, walls (12 → 52 tiles, D9 11–17), a second medical tent (D12 22), Fenced Farm (D11 19), a cabin (D13 01), `radiohelp` (D10 01), `defend` (D10 16) and `rescue` (D9 10, D10 16). None of it stopped the collapse spiral, and I did not get out.
- My own share of the loss: from D12 23 I chained `play 12` calls quickly. Once Amy fell at D13 02 nobody was healthy. I did not check whether `radiohelp` was ready again (last used D10 01) before the 12 h run D13 03→15 in which everyone bled out.

## Did the game serve your goal or get in its way?
It helped for 2 days, then got in the way. The path is clear (D2 11 `nextLevel`: "READY: order levelup"), but from L3 on the gate is pure time. While I waited, the one active lever (expand land) made the town much more dangerous. The game's own warning was only "More zombies will come, from more directions" (D3 08). Rushing was punished fairly at first, through risky expedition HP loss (D2 12: Marcus 103 → 30). After land tier 2 it felt unfair: three fighters were down the first night after expanding (D9 04–06), and from D10 there was a collapse every 1–3 h. With nothing to spend renown on (473 at death), I had no lever to recover with.

## Bugs and confusing text
- The daily summary always says "Food +0.0 −X · Water +0.0 −X" (D3 00, D5 00, D9 00, D13 00), even when state shows production (D3 08: foodPerDay +3.2).
- D3 06 morning card: "🩹 Hurt: nobody", but June collapsed at D3 03 and was "Wounded until treated".
- D2 12 radio: "upgrade the Camp to a Lodge", but `upgrade hq2` answered "not unlocked yet" (it unlocked at L4, D8 16).
- D4 20 onward: "Move-in request: Ben wants to make the Haven home" came from people who already lived here (Ben, Lena, Marcus, Amy, Maya, Eli, Rosa, Theo, Noah, June). It is unclear what accepting changes.
- D6 07: 5 tents but beds stuck at "10/10". The 5th tent added no bed until the Lodge.
- D12 04: Ben is a "Farmer" but sat "free" every day while the day summary said "Open staff slot: Garden Plot, Rain Barrel" (D2 00 to D13 00). `job Noah Farmer` got the Fenced Farm staffed right away, and food/day went from −1.2 to +4.3 (D12 13).
- D1 12, D11 12, D12 12: "X can't reach a storage door with their load. Check that storage and HQ entrances aren't walled off and that the fence has a gate." On D1 12 I had placed no walls. On D11/D12 this came after the wall tool placed 52 tiles that never closed the ring ("sealed": false).
- D7 09 onward: two survivors are both named June (Scavenger and Guard), so lines like "June and June are now friends" (D10 01) and "someone is down: June, June" are hard to follow.
- D8 08: state said `minutesLeft: 7`, but L4 arrived at D8 16 (8 h later).

## Problems with the test tool (separate from the game)
- `play H` stops on new collapses, but not while people stay down or are "bleeding out". On D13 03→15 it ran the full 12 h ("stopped": "time") with all 12 people down.
- `upgrade clinic` returned `ok: true` (D9 11), but the game said "The Clinic is 2×1: place it (turn it with ↻), then Build" and nothing was built. The tool cannot place multi-tile upgrades.
- Goals ("Claim the reward from the alert or the Goals screen", D2 02, D2 07, D3 13, D5 09) have no claim command.
- Rex the dog (D4 08: "Give the dog to a survivor from their Gear tab") never showed up in `stash`, so I could not equip him.
- `job Ben Farmer` returned `ok: false` with no reason (D12 04).
- From D12 16 one `play 12` took more than 120 s of real time (the server slowed down).

## The one change you would make
Cut the L3→4 and L4→5 upgrade timers (105 h / 150 h) drastically, or let renown (82 → 473 unused) speed them up. Show the next level's timer before I press levelup, and warn that land tier 2 sharply raises night pressure. Then a rusher has a lever to pull while waiting, instead of a trap that leads to the collapse spiral of D13.
