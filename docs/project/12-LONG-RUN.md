# Zombie Haven: long-run test (21 Nov 2026, build 3D.243)

The owner, 20 Nov: "Run long term balancing test. Check for UI issues, logic issues, combat issues and balancing. The game is supposed to be played for months." Done overnight in the Balance chat. **Nothing in the game was changed.** Only the test tools changed.

## 1. What was run
- The balance bot played **10 towns, about 1,800 game days in all**. The longest towns ran 240 to 260 game days (about 28 hours of open play each; one game day is about 7 minutes with the game open).
- Each game day the test wrote down level, people, buildings, every stock, zombies, downs and deaths, and ran logic checks (broken numbers, people or zombies that never move, building sites that never finish, errors).
- A level 20 town from day 254 was then opened in the real 3D game and every main menu was photographed and checked for things that stick out of the screen.
- **The bot had to be fixed first.** The old bot could not place an upgrade that needs more ground (the Clinic), so its whole build plan stopped behind the Clinic and no old-bot town ever built the Fort. It also sent trips whenever water was above 12, which kept water near 10 for 100 days. Seven towns were played with the old bot before this was found; they are kept as "a player who gets stuck". The three towns that matter most are the new bot's (section 2).
- The bot plays with the game open all the time. It does not check in once a day, so it cannot measure a daily player's real weeks. It also loses more people than a person would.
- Data: `runs/long-run-21nov/` (a line per game day per town, the screenshot sheets, and a backup of the day-254 town that the game's Import reads). Tools: `tools/balance/long_study.py`, `long_summary.py`, `load_probe.py`, `tools/qa/old_town_shots.js`; the bot's long-run habits are switched on with `AP.long` in `tools/balance/ap.js`, so older measurements stay comparable.

## 2. The three long towns (new bot)
| | Town 5 | Town 7 | Town 13 |
|---|---|---|---|
| Game days played | 246 | 261 | 171 |
| Level 5 | day 11 | day 14 | day 10 |
| Level 6 (first Banner used) | day 24 | day 26 | day 42 |
| Level 11 | day 59 | day 62 | day 78 |
| Level 15 | day 84 | day 106 | day 103 |
| **Level 20 (the last level)** | **day 119** | **day 141** | **day 138** |
| People at the end | 41 | 43 | 39 |
| Buildings at the end | 60 | 61 | 59 |
| Deaths | 26 | 35 | 39 |
| People who walked out (no food or water) | 15 | 27 | 1 |
| All 8 research projects done | day 36 | day 40 | day 38 |

Two more new-bot and old-bot towns **lost everyone** (section 3, finding 2).

## 3. Findings, worst first

### Balance
1. **The whole game is over in about 14 to 16 hours of open play.** Level 15 comes on game day 84 to 106 and level 20 on day 119 to 141. Target: level 15 in 4 to 6 weeks. The level timers count game hours, and game hours pass 36 times faster with the game open than closed (already noted in `08-BALANCE.md`, section 11), so a player who leaves the game open is never slowed. The first Banner is the only real wall (10 to 30 game days at level 5).
2. **A town can lose everyone, and that is the end of it.** 2 of 10 towns were wiped out (day 28 with 13 people and no death before; day 40 with 11). Both times: raiders by day (7 to 10 of them, in one case three days running), then a boss night the same evening with everyone already hurt. All went down, nobody was left to carry them, all bled out. The rescue convoy only comes for a town of 3 or fewer that is still standing. Target: a lost night is a setback of a day or two, never game over.
3. **After level 20 there is nothing left to do or to spend on.** For the last 100+ game days of each long town: 60 buildings and no more, wood, stone, scrap, ammo and cloth all at their caps, 13,000 to 14,000 renown unused, 2,000+ research points unused (research is finished by day 40), three spare Banners that open nothing, and 50 to 88 copies of each small gadget in the Inventory. The approved research plan and crafting with parts will take up some of this; neither reaches past level 20.
4. **Deaths late in the game are far above "a handful".** No deaths at all in era 1 in the long towns, 0 to 8 in era 2, then 24 to 39 from level 11 on: about one death every 5 to 7 game days, for ever. Downs are 9 to 10 a day in a level 20 town, and the bot radios for rescue every second day.
5. **Boss nights come every 3 days at every level, not once per level, and they are still about half the size wanted.** A long town saw 79 to 85 of them. The usual boss night (zombies that came between 20:00 and 06:00) brings 36 in era 1 (target about 60), 58 in era 2 (target 120) and 81 to 90 later (target 240); the biggest were 51, 77 and 247. *(Corrected 21 Nov: the first version of this page gave 28 to 70, 54 to 112 and 81 to 292 and called the sizes "close to the targets". Those figures also counted the zombies of the daytime before; the nights are smaller than that.)*
6. **Raiders come every 2 to 4 days from day 4, and nothing keeps a raid and a boss night apart.** 29 and 30 days in the two longest towns had both. Raiders caused 51 of 143 downs in the town that was wiped out on day 40.
7. **What runs short:** wood is at 0 to 5 for the first 70 to 95 game days (the true shortage of eras 1 and 2, which is fine), fuel after the Generator (fine), **medicine is at 0 for 24 to 68 days** (too long: the Clinic and Hospital need medicine to build, and only Pharmacy trips bring it), and **scrap has no use after about day 30** (at its cap for 80 to 166 days).
8. **Trips drink more water than the town does.** In an 18-person town trips took 15 to 20 water a day against 20 for all rations. A player who sends a trip a day is always short of water, and thirsty people walk out (15 and 27 people left two of the long towns this way).
9. **Being away pays 8 game hours of production at most**, the same after 8 hours, a day or a week away. For an 18-person town that is about 19 food, less than one day of eating. Target: about one day's worth.

### Combat
10. **Late hordes put 200 to 257 zombies in town at once** (days 114 to 230, about one night in ten: 90 to 107 walkers, 45 to 60 runners, 20 brutes). The limit for the big horde is 60. The towns held (no deaths on those nights), but a phone has to draw them: the target says 50 to 60 on screen, tested on a real phone.
11. **A raider stood on one spot for 24 game hours** in the "stealing" state (once, town 13, day 39 to 40).
12. **A survivor lay down for 72 game hours** without dying or being carried in (once, town 7, day 65).

### Logic
13. **People sleep rough while beds are free.** Day-254 town: 40 people, 49 beds, and 15 people "Sleeping rough: no free bed". Their mood falls for it.
14. **Children run out of names.** Once the list of children's names is used up they are called "Kid 3", and they keep it as adults: the day-254 town has 15 adults named like "Kid 3 Schmidt, Farmer, age 18".
15. **A survivor stays in one building, in one state, for 48 game hours** (20 times across the towns, always "using a building", mostly Farmers and Cooks). Not explained yet; it did not come back in a 60-hour replay.
16. **Left-over goals at the last level:** the mission still reads "Expand the Haven: construct 3 new buildings, 2/3" at level 20, and the weekly goal for a 40-person town is "Have 7 people living in the Haven".
17. **Pets have no limit.** The bot bought one a day: 50 pets, 11 with no owner, and a People page that lists every one of them in one paragraph. (A person would not buy 50, but nothing stops it.)
18. **No errors and no broken numbers** in 1,800 game days: no crash, no stock below zero, no building site left unfinished, and the save stays small (30 to 65 KB at day 250). A backup of a day-254 town imports and plays.

### UI (level 20 town, phone size)
19. **The Needs you list is squeezed.** Each row's text is pushed into a column about one word wide and the buttons run off the right edge ("Send defender" and "Bandage" are cut). Sheet `sheet3.jpg`, fifth screen.
20. **Lists that only ever grow:** the Memorial names every death (34 lines and counting) and the pets paragraph, both on Town → People.
21. **Inventory:** six stacks of 75 to 88 identical gadgets. It reads fine, but there is nothing to do with them (Salvage, approved in `11-CRAFTING.md`, is the answer).
22. Everything else held up with 40 people and 61 buildings: People, a survivor's four tabs, Town's four tabs, Upgrade, Build's four tabs, Inventory, Explore, the event log, Workshop, Goals and the Trophy shelf. Nothing else stuck out of the screen.

## 4. Open questions for the owner
See `05-NOW.md`, Balance chat (W171 to W174).
