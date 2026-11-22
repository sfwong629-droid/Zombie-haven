# Zombie Haven: the overnight balance run (22 Nov 2026)

The owner, 22 Nov, 00:35: "you can run overnight". The Balance chat works through the list below one build at a time, on the branch **`balance-overnight`** only (never `art-direction-b` or main), so nothing goes live before the owner has looked. Build numbers on this branch are renumbered when it is merged into `art-direction-b`.

Each build: one change, a scripted check, the test suite, and a short bot run before and after where it matters.

## Morning summary
(Written when the night ends.)

**Build numbers:** the other chats keep taking numbers during the night, so this branch's builds are renumbered above theirs each time (last: the Strongholds chat reached 3D.283 at 02:00). They are renumbered again when merged.

## The list
1. [x] The last stand: the limit of 60 and a size by level (3D.284; first pushed as 3D.277, then 3D.279, 3D.280 and 3D.281; renumbered each time another chat took the number).
1b. [x] The Hollow's shepherded horde (3D.285): it adds zombies every hour from 22:00 to 02:00 with no limit (found measuring 3D.284).
2. [x] The last numbers that still follow the game day (3D.286) (the gentler first two weeks, raider kinds by day, the spawn speed).
3. [x] A breather after a lost night (3D.287).
4. Rule 1, one pace for everyone: [x] (a) time away pays up to a day's production (3D.288); [x] (b) newcomers wait at the gate (3D.289); [skipped, question Q1] (c) building, crafting and research on real time; [skipped, question Q1] (d) the level timers on real time.
5. The six first-30-minute fixes (W183): [x] (1) a gift for each of the first goals (3D.290); [x] (2) wood on day 1 (3D.291); [x] (3) the sixth person in time for level 2 (3D.292); [x] (4) no raiders in the first sitting (3D.293); [ ] (5) the first small boss night at minute 20 to 25; [ ] (6) a guided first research.

## Questions for the owner
- **Q1. Rule 1's last two steps need one number from you: what is a real hour worth?** Today the game has two clocks: with the game open, one game hour passes in 17 seconds; with it closed, in 10 real minutes (36 times slower). The level timers, building, crafting and research all count game hours, so a player who leaves the game open moves 36 times faster through every wait. Rule 1 says one speed for both, but picking that speed changes the first sitting: at the closed speed, level 2's wait (6 game hours) would take an hour and level 3's two hours, and the target is level 3 in the first 30 minutes; at the open speed, a day away would finish every wait in the game. **Claude's proposal:** (a) the level timers become real minutes, the same open or closed, set from the plan's pace table: level 2 after 3 minutes, level 3 after 10, level 4 after 1 hour, level 5 after 6 hours, then about a real day a level up to 10, a day and a half up to 15, and about two and a half days up to 20 (levels also wait on people and buildings, as now); (b) building, crafting and research keep today's quick speed in front of the player and carry on at that same speed while away (so a job queued before closing is done on return), held back by their costs, not by waiting. Yes, or change the numbers?

## Builds

### 3D.284: the last stand keeps the limit of 60 and grows with the level
- **What:** the last stand (the three convoy nights after the signal, level 16 and up) no longer drops each night's horde in one burst. The night's zombies join a queue and walk in one by one while fewer than 60 stand; what has not come by 06:00 is dropped. The night's size follows the level, not the game day (before: 40 extra zombies a night on day 120). The night's ordinary crowd makes room for it, as on boss nights.
- **Check:** `tools/qa/finale_cap_check.js`: on the last night with nobody killing, at most 60 stand (60); with a town that kills, the whole first night arrives (33 of 33); the first night is the same size on day 100 and day 400. Test suite: all passed.
- **Bot**, the level 14 to 16 town (`s7_d101`), 14 game days, before (3D.276, the branch point) and after:

| | Before | After |
|---|---|---|
| Last-stand nights, most standing | 85, 94 | 93, 61, 71 |
| Deaths in the run | 3 | 16 (6 on one day) |

- **Read with care:** the last stand's own zombies now keep the limit (the scripted check shows it), but those nights still reached 71 to 93 standing, so something else adds zombies on top. One source found: the Hollow's shepherded horde adds 8 zombies every hour from 22:00 to 02:00 at level 16 with no limit (next build, 1b). The deaths went up in this one run; one town is too few to say whether that is the build or chance (the same town gave 3, 8, 15 and 16 deaths in earlier runs of other builds).

### 3D.285: the Hollow's shepherd and alpha keep the limit of 60
- **What:** on a Hollow night the shepherd adds 3 + level/3 zombies every hour from 22:00 to 02:00 while he lives, and the alpha's night adds 8 + level; both did so whatever already stood. Now they only fill the room left under 60. With room to spare they still bring their full group. Looked at and left alone: the Screamer's call (it already stops at 60), a zombie breaking into a building and the dead rising again (one zombie each, not an attack).
- **Check:** `tools/qa/hollow_cap_check.js`: with 57 standing, the shepherd's hour and the alpha's night end at 60; with an empty town the shepherd adds his full 8 at level 16. Test suite: all passed.
- **Bot**, the same level 14 to 16 town, 14 game days, before (3D.284) and after:

| | Before | After |
|---|---|---|
| Last-stand nights, most standing | (the signal was not sent in this run) | 42, 57, 60 |
| Most standing in the whole run | 82 | 69 |
| Deaths in the run | 23 (6 on one day) | 3 (never more than 1 a day) |

- **Read with care:** one town each way, and the two runs took different paths (the town before never sent the signal). What it does show: this time the last stand stayed at 60 or under. A few nights still reach 62 to 69 standing (the night before and of a level boss night); the source is not found yet. It is small next to the 105 to 186 of before.

### 3D.286: the last danger numbers that followed the game day now follow the level
- **What:** (1) the boss's gentle start (40% less health, a 25% softer hit) was for game days 1 to 14; now levels 1 to 5 (era 1). (2) The first boss is always the Mutant up to level 2 (was day 4). (3) Raider kinds: the Firebug from level 2, the Brute from level 3 (were game days 3, 4 and 6). (4) The spawn speed's "threat" was set to day / 4 at each rank-up, so it kept the day count of that moment; now it is a quarter of the level's day strength. The Town panel shows the same number. **Left alone on purpose:** story timing (when factions are first met) and raids starting on day 4 (that one belongs to the first-30-minute fix "no raiders in the first sitting", item 5).
- **Choice to look at:** the gentle boss now ends at level 5 instead of day 14, so the boss at level 6 is about twice as tough as at level 5 (250 → 592 health in the check's town). Before, the step came on day 15, wherever the town was.
- **Check:** `tools/qa/day_free_check.js`: at levels 1, 3, 6 and 15 the boss's health and hit, the raider kinds and the threat are the same on game day 2 and day 300; level 1 meets only Thieves, level 3 all three kinds. Test suite: all passed.
- **Bot**, before (3D.285) and after: a new town for 15 game days: 0 and 0 deaths, boss nights 17 to 41 and 41 to 62 (the after town levelled faster, 4 against 6, so its boss nights are bigger; not readable as an effect). A level 9 town for 12 game days: 0 and 0 deaths, boss nights 46 and 42 to 45 standing at most.
- **Measurement problem found (not from this build):** started from the level 9 backup, two bot towns run side by side sometimes have their town clock slow to a quarter for several game days (12 day lines covered game days 41 to 45), before and after alike. A squad sitting in a stronghold slows the town to a quarter (`simTick`, `S.sh`), so the likely cause is the bot staying in a stronghold; the stronghold maps changed in today's 3D.277 and 3D.278 (Strongholds chat). Not reproduced when one town runs alone (4 tries). Worth a look by the Strongholds chat; until then, short A/B runs from that backup are less reliable.

### 3D.287: a breather after a lost night
- **What:** a night (20:00 to 06:00) counts as lost when someone dies in it, or when everyone went down and the neighbours had to come (the rescue of 3D.246). Then the next two nights are a breather: the night's crowd is a quarter smaller, the boss night and raiders wait, and the weekly crisis does not start. It reuses the game's existing "vigil" quiet (V2.24, which already did this after 2 deaths in a day) for 2 nights, with its own message: "A breather: the dead hang back, the next two nights are quieter, with no boss night and no raiders."
- **Choices to look at:** (1) one death is enough to count as a lost night (the plan says "a night the town lost"; one death is the simplest reading). (2) A quarter smaller is the vigil's existing number. (3) The last stand does not pause for a breather (the convoy is coming; that fight is chosen by the player).
- **Check:** `tools/qa/breather_check.js`: after a night with a death, and after a night when everyone went down, the breather is on and a boss night due that evening comes two evenings later; after a night with no loss there is no breather and the boss comes on time. The crisis, boss-gap and raid checks still pass. Test suite: all passed.
- **Bot**, the level 14 to 16 town, 14 game days, before (3D.286) and after: 2 and 1 deaths, so the breather started at most once; this run says nothing about its effect. It needs a town that loses people (the daily player in a full check). Also seen again: one level boss night with 82 standing in the after run (the cause of the few nights above 60 is still not found).

### 3D.288: time away pays up to a day's production
- **What:** a building's output waiting in its tray while you are away now fills up to a day's worth (24 game hours, reached after 4 real hours away); before, it stopped at 8 game hours, a third of a day. The tray also holds a day now (was 8 hours), so the waiting output is not cut at the tray. Away still has no hunger, raids or deaths.
- **Choice to look at:** the cap is reached after 4 real hours away (the game counts 10 real minutes as one game hour while away). A player who comes back after a night gets the same as one who comes back after 4 hours.
- **Check:** `tools/qa/away_day_check.js`: 1 hour away pays 6 game hours, 4 hours pays 24, a whole day pays 24, and the tray holds it all. The suite's away test now expects 18 game hours for 3 real hours away (was 8). Test suite: all passed.
- **Bot, the daily player** (10 minutes once a real day, 30 on the first day), two towns, 14 real days, before (3D.287) and after:

| | Before | After |
|---|---|---|
| Level 5, real day | 6, 3 | 5, 5 |
| Level 10, real day | not reached, 10 | 12, 12 |
| Buildings at the end | 25, 28 | 39, 36 |
| Water / scrap at the end | 36 / 237, 29 / 198 | 126 / 414, 149 / 418 |
| Wood at the end | 2, 1 | 6, 5 |
| Deaths | 0, 1 | 5, 2 |

- **Read with care:** the level pace did not change (it waits on the level timer); the towns built about 40% more and stocked far more water and scrap. **Wood is still at 0 every day** in both: a day's production does not fix the wood shortage (it is one of the first-30-minute fixes). Deaths rose from 1 to 7 over the two towns; with two towns that may be chance, but bigger towns with the same zombies is worth watching.

### 3D.289: newcomers keep coming while you are away and wait at the gate
- **What:** the gate clock (how often a newcomer turns up) only ran with the game open, so a daily player met almost nobody new between visits. Now time away (up to a day, like production) runs the gate clock too, and whoever would have come waits at the gate: at most 3, never more than the free beds. Back in the game the first one walks up at once with the usual card; the next comes after you answer. The "While you were away" note says how many are waiting. Nobody comes to a full town, or while zombies are inside.
- **Choice to look at:** at most 3 waiting (the plan says "a few at most").
- **Check:** `tools/qa/gate_away_check.js`: a day away with 4 free beds leaves 3 at the gate; an hour away leaves fewer; the first walks up at once; a full town gets nobody. Test suite: all passed.
- **Bot, the daily player**, two towns, 14 real days, before (3D.288) and after:

| | Before | After |
|---|---|---|
| People on real day 3 | 9, 8 | 11, 11 |
| People on real day 7 | 12, 12 | 16, 13 |
| Most people | 12, 14 | 17, 13 |
| Level 10, real day | 12, 12 | 10, not reached (level 9 on day 9) |
| Deaths | 4, 4 | 2, 8 |

- **Read with care:** towns grow faster in the first week (the plan's people targets were short by a third). Deaths swing a lot between runs of the same build (the build before gave 5 and 2 in its own run, 4 and 4 in this one), so two towns cannot show whether deaths changed.

### 3D.290: a gift for each of the first goals
- **What:** the first goals already paid a little scrap, wood and renown, which is easy to miss. Now each of the first six also hands over one thing you can see and use, named on the goal banner (🎁) and in a note: water secured: 6 food and 6 water; the first three walkers: a Baseball Bat; Grow Food: a Straw Hat; A Second Garden: 10 food; A Place to Rest: a Work Jacket; Scrap Economy: Lifting Gloves. Items go to the stash. Each gift comes once; towns already past these goals get nothing new.
- **Choice to look at:** the six gifts themselves (all early, cheap items; nothing that skips a step).
- **Check:** `tools/qa/first_gifts_check.js`: the third walker puts a Bat in the stash, Grow Food a Straw Hat, a gift never comes twice, every gift is a real item. Test suite: all passed.
- **Bot:** not run; the gifts barely change how the bot plays. Worth a look by hand in the first sitting.

### 3D.291: wood on day 1
- **What:** a new Roadside Camp starts with 20 wood (was 12), and up to level 3 (about the first sitting) every load of wood a survivor fells carries 2 more (a plain chop brings 5 instead of 3). From level 4 trees pay as before.
- **Choices to look at:** both numbers (20 to start, +2 a load up to level 3).
- **Check:** `tools/qa/early_wood_check.js`: the camp starts with 20 wood; the bonus is 2 at levels 1 and 3 and none at 4; in a new town's first game day the best load carried was 6. Test suite: all passed.
- **Bot**, two new towns, 6 game days (about 40 minutes of open play), before (3D.290) and after: wood is still at 0 or near it at the end of every day in both, and the after towns built no more (13 to 16 buildings against 15 to 19 by day 3 to 6; level 3 by day 4 and 6 against day 5 and never). **This cannot be read from the bot:** the bot spends every piece of wood the moment it has it, so its stock is always near 0. Whether the first sitting still stalls on wood needs a person playing it (or a bot measure of time spent waiting for wood, which does not exist yet).

### 3D.292: the sixth person in time for level 2
- **What:** until the town has 6 people, newcomers come four times as often. From the sixth person on, the old pace.
- **Choices to look at:** the number 6 (level 2 needs 6 people) and four times as often.
- **Check:** `tools/qa/first_six_check.js`: the wait between newcomers is about 1,200 game ticks with 4 people against about 8,600 with 6; a new town had 6 people after 8 game hours. Test suite: all passed.
- **Bot**, two new towns, 6 game days, before (3D.291) and after. Town 1: the same (6 to 7 people and level 2 on day 4 both times). Town 2: before, 6 people only on day 5 and level 2 on day 5; after, 7 people and level 2 on day 2, level 3 on day 3, level 4 on day 5. No deaths in any. So it helps when the town was stuck waiting for people, and changes nothing when it was not.

### 3D.293: no raiders in the first sitting
- **What:** roaming raiders now wait for level 3 (as well as game day 4, as before). Below level 3 the raid clock keeps stepping forward, so the first raid comes within a day and a half of reaching level 3, not the moment it is reached. The Town panel says "No raiders before level 3" until then. Raids the player brings on (refusing to pay a toll) are unchanged.
- **Choice to look at:** level 3 (the plan's end of the first sitting, about minute 30).
- **Check:** `tools/qa/first_raid_check.js`: hour by hour over game days 4 to 12, no raid at level 1 or 2; at level 3 the first raid came 0.7 days later. The old boss-day raid check now runs its town at level 3 (it was level 1, where raiders no longer come). The breather, boss-gap, boss-last, Tide and last-stand checks still pass. Test suite: all passed.
- **Bot**, two new towns, 6 game days, before (3D.292) and after. Before, both towns had their first raid on game day 4, when they had just reached level 3 (the bot levels fast). After, the first raid came on game day 5 in both (a day after level 3 in one, the day of level 3 in the other). No raid before level 3, no deaths in any.

