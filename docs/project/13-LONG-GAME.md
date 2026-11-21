# Zombie Haven: the long game (draft plan, 21 Nov 2026; waiting for the owner)

The owner, 21 Nov, after the long-run test (`12-LONG-RUN.md`): "come up with a plan to properly balance the game to have long term play while still being fun. Feel free to add ideas outside of what I suggested. There are still systems I want to implement later. Make sure the plan has some wiggle room if I make more changes. Or make a workflow for balancing that we can just run when things change."

This page is both: **the plan** (sections 2 to 8) and **the balance routine** to run again whenever the game changes (section 9). Nothing here is built. Numbers are first guesses given as ranges on purpose.

## 1. What is wrong today, in one table
The test bot played three kinds of player, using the game's own rules for the time away:

| Player | Plays | Level 5 | Level 10 | Level 13 | Level 15 |
|---|---|---|---|---|---|
| Leaves the game open | all day | after 1.5 hours | after 5 to 7 hours | after 8 to 10 hours | **after 10 to 12 hours** (level 20 after 14 to 16) |
| Keen | 20 minutes, twice a day | real day 2 | not measured yet | | |
| Daily | 10 minutes, once a day | real day 7 | real day 14 | real day 29 | **real day 32** |
| **Target** | a daily player | | | | **4 to 6 weeks** |

(The daily player is one town so far; the keen player was only run for 4 real days. Full runs of all three are the first job of the routine, section 9.)

What this shows:
- **The daily player is close to the target already.** The level timer keeps running while the game is closed, at the slow speed, so he gets about one level a real day at most, and less once the buildings get dear. He lost nobody in 33 real days. His weak spots: a slow first week (level 3 only on real day 5, waiting for people to turn up) and wood, which is at 0 almost every day because time away pays only a third of a day's production.
- **Everyone who plays more breaks the pace.** With the game open the game clock runs 36 times faster, and people, farms, buildings and the level timer all run on it. So the open player does in 12 hours what takes the daily player a month.
- **Zombies get stronger with the count of game days, not with the level.** The player who plays more minutes has seen more game days, so he meets stronger zombies at the same level: the open bot's level 13 town was on game day 75 to 90, the daily player's on game day 45. A town played for months meets hordes of 200 and more.
- **After level 20 nothing changes any more**, and scrap, renown, research points and spare Banners pile up with nothing to buy.
- **A town can still lose everyone** (settled by the owner's yes to W172, section 4).

## 2. The plan in five rules
1. **Progress runs on real days. Playing more makes the town better, not faster.**
2. **A level is a list of deeds, and any few of them will do.**
3. **Danger follows the level, never the calendar.**
4. **Every stock always has something worth buying.**
5. **The top of the game is made of loops, not levels.**

Each rule is its own section below. Rule 1 fixes the pace, rule 3 the deaths, rules 4 and 5 the empty top. Rule 2 is what keeps the balance from breaking each time a new system is added.

## 3. Rule 1: progress runs on real days
**The peaceful half of the game keeps going while the player is away. The dangerous half waits for the player.**

- **Keeps going while away, at one real-time speed:** the level timer (already does), trips (already do), building work, crafting orders, research, production up to about one day's worth (today it stops after about a third of a day), newcomers (they wait at the gate, a few at most), children growing up.
- **Never happens while away:** zombies, raids, hunger, thirst, deaths, people walking out. (Already the rule: being away is never punished.)
- **The level timer counts real time, the same with the game open or closed.** This is what W171 asked. Today the wait for level 9 is 108 game hours: 31 minutes if the game is left open, 18 hours if it is closed. With this rule it is the same wait either way.
- **What playing more gives instead:** fights (loot, renown, trophies), trips and raids steered by hand, the Bell (section 7), collections, decorating. And renown earned by playing takes a quarter to a third off the waits, which is already the target in `08-BALANCE.md`. So an hour of play is never wasted, and nobody finishes the game in a weekend.

**The pace this aims for** (a daily player; ranges, tuned with the routine):

| Reached | Real day |
|---|---|
| Level 3 | the first sitting, about 30 minutes |
| Level 5 | day 2 to 3 |
| First Banner, level 6 | day 5 to 8 |
| Level 10 | day 16 to 22 |
| Level 15 | day 28 to 42 (the 4 to 6 weeks) |
| Level 20 | day 55 to 75 |
| The cure (story, optional) | 12 more weeks at most |

A keen player may be up to a third faster, through renown. Not more.

## 4. Rule 3: danger follows the level
(Rule 3 before rule 2, because it is the most urgent.)

- **Night size and zombie strength are set by the town's level, and a little by how strong the town is (fighters and walls). Never by the day count.** Today the day count sets how many zombies come each night, which kinds come, how strong a boss and its crowd are, and how many raiders come; and the top limit keeps rising after day 60, for ever.
- **The limit of 60 zombies standing at once holds for every kind of attack**, the weekly crisis too. The rest wait their turn outside, as in the big horde.
- **A breather after a bad night:** after a night the town lost, the next two nights are ordinary and a little smaller. (The target already says the next attack is not stronger because the town lost.)
- **Decided 21 Nov (W172):** never a raid on a boss day or the day before; and when every survivor is down, the Greenwater truck comes by itself, at most once every few days, so a town is never lost.
- **Decided 21 Nov (W173):** a boss night every 3 game days in eras 1 and 2, every 5 from level 11.
- Already decided and waiting to be built: healing (W130), which should cut the 9 to 10 downs a day of a level 20 town.

**The danger budget** the routine checks: a handful of deaths on the road to level 15; at the top, with 40 to 50 people, at most about one death a real week; never more than 2 in one night; no town lost.

## 5. Rule 2: a level is a list of deeds
Today a level asks for a number of people, a number of buildings, the timer, and at three points a Banner. That is why a new system either does nothing for the pace or has to be forced into the list.

**Proposal:** each level shows a card of deeds. Two are fixed (people, buildings). Of the others the player needs **any two or three**, their choice:

| Kind of deed | Examples |
|---|---|
| Fight | win this level's big horde; clear a stronghold; win a raid |
| Go out | finish a trip to a place not yet visited; bring back a rare part |
| Make | craft or keep in stock a set of gear; finish a research project |
| Town life | hold a party or festival; raise a child; train someone to the top of a job |
| Friends | reach the next step with a faction; finish a radio favour |
| Story | watch the story scene of this level (once the story is in) |

Why this is the wiggle room: **a new system adds deeds to the cards; it does not add a step everyone must take.** The daytime threat, Take command, the eleven new zombies, crafting, the story, and anything not thought of yet, each bring a deed or two. The pace stays where it is, because the number of deeds a level needs does not change. It also gives "something new every level" for free, and lets a builder and a fighter level up in different ways (as the Banner routes already do).

## 6. Rule 4: every stock has something worth buying
| Stock | Today | Already decided | New ideas |
|---|---|---|---|
| Scrap | at its limit from about day 30 | parts made in town (nails), Armory, the new buildings | town projects; caravans |
| Wood, stone | at their limits at the top | seven new buildings; a look per upgrade | town projects; roads and decorations |
| Food, water | fine | parties at the Festival Ground | feasts (mood and a short boost); caravans |
| Renown | 14,000 unused | takes time off the level timer | Legend ranks; ringing the Bell for a bigger horde; naming a building or a hero's statue |
| Research points | 2,000 and more unused; all done by day 40 | 19 projects spread over the eras | **Studies:** after the projects, small repeatable boosts (farms +2%, walls +2%...), each step dearer, ten steps each |
| Spare Banners | 3, they open nothing | unused routes still give their reward | **Banner honours:** fly a spare Banner over one building for a town-wide perk |
| Spare gear | 50 to 88 of one gadget | Salvage for half its parts | caravans (gifts to factions); **tempering** one item with parts |
| Medicine | at 0 for weeks | Clinic, Hospital, bandages | a Medic makes a little from herbs at the Garden, slowly, so a town is never at 0 for long |
| Pets | no limit | | room for pets comes from Kennels |

Two of the new ideas, in a little more detail:
- **Town projects.** Big shared builds paid in stages over about a real week, like the Landmark: paved roads, a park, a statue of a fallen hero, a bell tower, an aqueduct. Each gives a small town-wide perk and makes the town look grown. They are where wood, stone and scrap go at the top.
- **Caravans.** Load a cart with what the town has too much of and send it to a faction. Back come reputation and rare parts. It turns "too much food" into something, and gives each faction a use for months.

The economy target stays: always short of one thing, never of everything. The routine checks which stock is short in each era and that no stock sits at its limit for most of an era.

## 7. Rule 5: the top of the game is loops
After level 20 there is no next level, so what brings the player back must repeat without getting old. By rhythm:

**Every check-in**
- Daily goals (in the game), crafting orders, a trip.
- **The Bell** (new). Ring it to call a horde now, and pick its size. Bigger pays more. Full rewards once a real day, less after that. It is the "one more fight" button for a player with an hour to spare; it never comes while away; and it is a good home for Take command.

**Every week**
- **The weekly crisis as a ladder** (crises and medals are in the game): each win moves the town up a step, each step is harder and pays better (rare parts, a decoration); a loss moves down one step, nothing worse.
- The weekly review grade (in the game) pays a small reward.
- The cure, one step a week (story, decided).

**Every season (about four real weeks)**
- Seasonal strongholds (decided 11 Nov; the Trophy shelf already has the four season slots), each with its own trophy and decoration, and a small twist for the town (a hard winter, a dry summer).
- A season festival at the Festival Ground.

**Open-ended**
- **Legend ranks** (new). After level 20 the level bar keeps filling from deeds. Each rank: pick one of three small rewards (a perk, a look, a title). Each rank costs a little more than the last, with no end. It keeps the "level up" feeling for good without new buildings.
- **Collections** (new): an item book (every item with its picture and joke), zombie field notes, trophies, the story tapes. Each finished page pays a little. New content later simply adds pages.
- **Veterans and generations** (new, builds on children): a survivor at the top of a job becomes a Veteran and can teach a newcomer; an old hero can retire to the School; children carry a parent's trait; a family tree page.
- Town projects and caravans (section 6).
- **Legacy start** (decided 11 Nov): from a Legend rank onward, start a new town with one heirloom and a harder map.

## 8. Room for what is still to come
- **Ranges, not exact numbers.** Every target on the scorecard (section 9) is a range. A new system may move a number inside its range freely.
- **Deeds.** New systems add choices, not required steps (section 5).
- **Open-ended tops.** Legend ranks, Studies, collections and the crisis ladder have no last step, so new rewards can be added at any time.
- **Where the systems already planned plug in:**

| System | Deed | Danger budget | Sink or source |
|---|---|---|---|
| Daytime threat | "see off a daytime horde" | counts inside the era's deaths range; nights shrink a little to make room | roamers drop parts |
| Take command | "win a horde in command" | none: the town must still win alone | |
| Eleven new zombies | "beat a new kind" | arrive by level, not by day | their own parts |
| Children, School | "raise a child" | children are never in the fight | people |
| Crafting with parts | "keep a set in stock" | better gear lowers deaths: checked by the routine | the main sink for parts and scrap |
| Research by era | "finish a project" | | research points |
| Story | "watch this level's scene" | | story items |
| Seven new buildings | count as buildings | Watchtower, Shelter Bunker lower deaths | wood, stone, parts |

- **The rule for anything new:** before it is built it answers the five questions in section 9.5.

## 9. The balance routine (run it whenever something changes)

### 9.1 The scorecard
One table, the same every time. Each line has a range; a result is green inside it, amber near the edge, red outside.

| What | Range | Measured by |
|---|---|---|
| Level 3 | first sitting, 20 to 40 minutes | daily player |
| Level 5 | real day 2 to 3 | daily player |
| Level 15 | real day 28 to 42 | daily player |
| Level 20 | real day 55 to 75 | daily player |
| Keen player against daily player | at most a third faster | keen player |
| Game left open against daily player | at most a third faster | open bot |
| Deaths to level 15 | 3 to 8 | all three |
| Most deaths in one night | 2 or fewer | all three |
| Towns lost | none | all three |
| Ordinary nights won with nobody down | 65 to 85% | all three |
| Big horde, whole night | 45 to 75, 90 to 150, 180 to 300 by era | open bot |
| Most zombies standing at once | 60 or fewer | open bot |
| People at the end of each era | 12 to 18, 24 to 36, 40 to 60 | daily player |
| Buildings at the end of each era | 21 to 29, 34 to 46, 47 to 63 | daily player |
| A stock at its limit for more than half an era | none | all three |
| The short stock | one in each era, and not food | all three |
| People who walk out | 2 or fewer in an era | all three |
| Renown and research points unspent | less than two weeks' income | daily player |
| Logic checks (broken numbers, stuck people, stuck sites, errors) | none | all three |

### 9.2 Three test players
- **Daily:** 10 minutes once a real day (30 minutes on the first day).
- **Keen:** 20 minutes twice a day.
- **Open:** the game open the whole time (the bot as it was).

The tool for this exists since 21 Nov (`tools/balance/long_study.py`, with a check-in length and a time away). It uses the game's own away rules, so it measures whatever rule 1 becomes.

### 9.3 Two sizes
- **Quick check, about 30 minutes:** two towns as the daily player for 14 real days, and two towns open for 30 game days. Run after every build that touches a balance number.
- **Full check, overnight:** three towns for each of the three players, to level 20 or 75 real days. Run before a milestone, and whenever a new system lands.

### 9.4 The steps, every time
1. Name the scorecard line the change is meant to move.
2. Run the check **before** the change.
3. Change **one** number.
4. Run the check **after**.
5. Compare the two scorecards. The line moved into its range and no other line went red: keep it. Otherwise undo it or try another number.
6. Write one row in `08-BALANCE.md`, section 12: what changed, the before and after.

### 9.5 Five questions for every new system, before it is built
1. What does it give, and what does it cost? (Which stock it fills, which it empties.)
2. From which level, and which deed does it add?
3. What does it do to danger?
4. What does it do while the player is away?
5. What must the bot learn so that it uses it? (The bot is taught before the measurement. The lesson of the Clinic: a bot that cannot use a thing measures nothing about it.)

### 9.6 The numbers in one place
Today the balance numbers are spread over many files. One short list names each number, where it is, and which scorecard line it moves: level timers, what each level needs, the away rates, the big horde, how often bosses and raiders come, how hard raiders hit, how zombies grow, how fast newcomers come, storage limits, what buildings make, what trips cost, renown prices, research costs. Later the Code clean-up chat can move them into one file.

### 9.7 What the bot cannot tell
The bot measures pace, stock, deaths and sizes. It cannot say whether a night was fun. After each full check the owner plays one sitting in the era that changed and answers three questions: was there always something to do, was the fight good to watch, did anything feel unfair.

## 10. The order to do it in
1. **The routine's tools** (Balance chat; the game is not changed): the scorecard, the three players, the list of numbers. Then a first full scorecard of today's game, as the "before" for everything below.
2. **Safety** (decided): no raid on or before a boss day; the truck when everyone is down; bosses every 5 days from level 11.
3. **Rule 3:** danger by level.
4. **Rule 1**, one change per build: away production to a day's worth; newcomers at the gate; building, crafting and research in real time; then the level timers.
5. **Sinks already approved:** crafting with parts, Salvage, research by era. Then Studies and Banner honours.
6. **Rule 2:** deeds.
7. **The top**, in the order the owner picks (section 7).

Each step is measured with the routine before the next one starts.

## 11. Open questions for the owner
See `05-NOW.md`, Balance chat (W175 to W178).
