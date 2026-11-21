# Zombie Haven: the long game (plan, approved by the owner 21 Nov 2026)

The owner, 21 Nov, after the long-run test (`12-LONG-RUN.md`): "come up with a plan to properly balance the game to have long term play while still being fun. Feel free to add ideas outside of what I suggested. There are still systems I want to implement later. Make sure the plan has some wiggle room if I make more changes. Or make a workflow for balancing that we can just run when things change."

This page is both: **the plan** (sections 2 to 8) and **the balance routine** to run again whenever the game changes (section 9). Nothing here is built. Numbers are first guesses given as ranges on purpose.

## 1. What is wrong today, in one table
The test bot played three kinds of player, using the game's own rules for the time away:

| Player | Plays | Level 5 | Level 10 | Level 13 | Level 15 |
|---|---|---|---|---|---|
| Leaves the game open | all day | after 1.5 hours | after 5 to 7 hours | after 8 to 10 hours | **after 10 to 12 hours** (level 20 after 14 to 16) |
| Keen | 20 minutes, twice a day | real day 2 | real day 8 | real day 12 | not run that far yet |
| Daily | 10 minutes, once a day | real day 5 to 7 | real day 10 to 20 | real day 21 to 32 | **real day 26, 32 and 34** |
| **Target** | a daily player | | | | **4 to 6 weeks** (day 28 to 42) |

(Three daily towns, played for 32 to 34 real days; one keen town, played for 12. The full scorecard is in `08-BALANCE.md`, section 12.)

What this shows:
- **The daily player is close to the target already.** The level timer keeps running while the game is closed, at the slow speed, so he gets about one level a real day at most, and less once the buildings get dear. Two of the three towns lost nobody in a month; the third lost 8. His weak spots: a slow first week (level 3 on real day 2 to 5 and level 5 on day 5 to 7, waiting for people to turn up) and wood, which is at 0 almost every day because time away pays only a third of a day's production.
- **Everyone who plays more breaks the pace.** With the game open the game clock runs 36 times faster, and people, farms, buildings and the level timer all run on it. So the open player does in 12 hours what takes the daily player a month.
- **Zombies get stronger with the count of game days, not with the level.** The player who plays more minutes has seen more game days, so he meets stronger zombies at the same level: the open bot's level 13 town was on game day 75 to 90, the daily player's on game day 45. A town played for months meets hordes of 200 and more.
- **After level 20 nothing changes any more**, and scrap, renown, research points and spare Banners pile up with nothing to buy.
- **A town can still lose everyone** (settled by the owner's yes to W172, section 4).

## 2. The plan in five rules
1. **Progress runs on real days. Playing more makes the town better, not faster.**
2. **A level is a list of deeds, and the player picks which of them to do.**
3. **Danger follows the level, never the calendar.**
4. **Every stock always has something worth buying.**
5. **The top of the game is made of loops, not levels.**

**Owner, 21 Nov: yes to all five rules (W175, W176, W179), to the things to do at the top (W177) and to the end game (W180).** Each rule is its own section below. Rule 1 fixes the pace, rule 3 the deaths, rules 4 and 5 the empty top. Rule 2 is what keeps the balance from breaking each time a new system is added.

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
| Level 10 | day 10 to 14 |
| Level 15 | day 21 to 28 (3 to 4 weeks; about where today's daily player is) |
| Level 20, the main ending | day 38 to 46 (about 6 weeks, roughly 10 to 20 hours of play) |
| The extras (Shut the Line, the cure) | may take longer: see section 7 |

A keen player may be up to a third faster, through renown. Not more.

**Owner, 21 Nov (W182):** three months is too long for the main story next to games like Dungeon Village 2 (8 hours for its story, 51 for everything) and Fallout Shelter (about 87 hours for everything). "Get the main story to an appropriate length similar to other games, and then the extras can take longer." The table above is the shorter length; the first version of this page had level 15 on day 28 to 42 and level 20 on day 55 to 75.

## 3a. The first 30 minutes (approved 21 Nov, W183)
Compared with how Fallout Shelter (a lunchbox to open at once, objectives that keep completing), Clash of Clans (a guided start and a three-day shield) and Dungeon Village 2 (one clear goal) open. In four bot towns our first 30 minutes are: 4 people grow to 6 or 7, 8 to 17 buildings, level 2 or 3, four nights of 10 to 17 zombies with nobody hurt, raiders at about minute 27, the first boss night at about minute 40. Six fixes, one change per build:
1. **A reward for each of the first goals**, so something pays out every few minutes.
2. **Wood does not run out on day 1** (it is at 0 from the first day in every town): more to start with, or early trees pay more.
3. **The sixth person arrives in time for level 2** (today anywhere from game day 1 to 4).
4. **No raiders in the first sitting.**
5. **The first small boss night at about minute 20 to 25**, so the first sitting ends on a win.
6. **A guided first research project and first crafted item** (no bot town finished any research in the first 30 minutes).

## 4. Rule 3: danger follows the level
(Rule 3 before rule 2, because it is the most urgent.)

- **Night size and zombie strength are set by the town's level, and a little by how strong the town is (fighters and walls). Never by the day count.** Today the day count sets how many zombies come each night, which kinds come, how strong a boss and its crowd are, and how many raiders come; and the top limit keeps rising after day 60, for ever.
- **The limit of 60 zombies standing at once holds for every kind of attack**, the weekly crisis too. The rest wait their turn outside, as in the big horde.
- **A breather after a bad night:** after a night the town lost, the next two nights are ordinary and a little smaller. (The target already says the next attack is not stronger because the town lost.)
- **Decided 21 Nov (W172):** never a raid on a boss day or the day before; and when every survivor is down, the Greenwater truck comes by itself, at most once every few days, so a town is never lost.
- **Decided 21 Nov (W173):** a boss night every 3 game days in eras 1 and 2, every 5 from level 11.
- Already decided and waiting to be built: healing (W130), which should cut the 9 to 10 downs a day of a level 20 town.

**The danger budget** the routine checks: a handful of deaths on the road to level 15; at the top, with 40 to 50 people, at most about one death a real week; never more than 2 in one night; no town lost.

## 5. Rule 2: a level is a list of deeds, and the player picks (approved 21 Nov, W179: "call it deed")
**What the game does today.** To go from level 7 to level 8 the Upgrade Town screen asks for three things: 13 people, 21 buildings, and the wait. Every level is the same three things with bigger numbers. Three times it also asks for a Banner.

**The proposal.** The same screen shows a short list of **deeds** for the level. Two are always there (people and buildings, as today). Below them are four or five more, and the player must finish **any two** of those. Which two is the player's choice.

What the Upgrade Town screen would show for level 8, as an example:

| | Deed | |
|---|---|---|
| Always | Have 13 people | must |
| Always | Have 21 buildings | must |
| Pick any 2 | Win this level's big horde | |
| | Finish a trip to a place you have not been | |
| | Make 3 pieces of gear at the Workshop | |
| | Finish a research project | |
| | Hold a party at the Festival Ground | |

So a player who likes fighting does the horde and the trip; a player who likes building does the gear and the party. Both reach level 8.

**Why it helps the balance.** Every new system you add later (the daytime horde, Take command, the new zombies, crafting, the story) puts one more deed on these lists. The list gets longer, but the player still only needs two. So adding a system never makes levels slower or faster, and nothing has to be rebalanced because of it. Without this, each new system either does nothing for levelling or becomes one more thing everybody is forced to do.

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

## 7. Rule 5 and the end game: from level 15 to the cure
Owner, 21 Nov (W177): yes to the things to do at the top, "but also on the end game with the cure. Come up with an actual plan for that." This section is that plan. **Owner, 21 Nov (W180): yes.** The story it follows is `09-STORY.md` (approved 19 Nov); where this plan asks for a change to the story, it says so.

### 7.1 The things that repeat
**Every check-in**
- Daily goals (in the game), crafting orders, a trip.
- **The Bell.** Ring it to call a horde now, and pick its size. Bigger pays more. Full rewards once a real day, less after that. It never comes while away, and it is a good home for Take command.

**Every real week**
- **The weekly crisis as a ladder** (crises and medals are in the game; today "weekly" means every 7 game days, about 50 minutes of open play): one crisis a real week. Each win moves the town up a step, each step is harder and pays better; a loss moves down one step, nothing worse.
- The weekly review grade (in the game) pays a small reward.
- One step of the cure (7.4).

**Every season**
- A season lasts **three real weeks**, so a year in the valley is twelve real weeks. (Today a season is 7 game days: with the game open a whole year goes by in about three hours, and for the daily player a season lasts under five real days.)
- Each season has its stronghold (in the game: the Drowned Greenhouse in spring, the Burning Refinery in summer, the Harvest Fair in autumn, the Frozen Depot in winter), its trophy, a festival at the Festival Ground, and a small twist for the town (a dry summer, a hard winter).

**Without end**
- **Legend ranks.** After level 20 the level bar keeps filling, from everything the town does (crises won, projects finished, campaigns, collections). Each rank: pick one of three small rewards (a perk, a look for the town, a title). Each rank costs a little more than the last.
- **Town projects** and **caravans** (section 6), **collections** (an item book, zombie field notes, trophies, the story tapes), **veterans and generations** (a survivor at the top of a job teaches a newcomer; an old hero retires to the School; a family tree page).

### 7.2 The end game in four chapters
For a daily player. The weeks are ranges, checked with the routine.

| Chapter | When | What the player is doing | It ends with |
|---|---|---|---|
| 1. The City | levels 16 to 20, about weeks 4 to 6 | The main story in Sunnyside: one story stronghold per level or two (Helix Lab 7, the Records Office, the Dusk Radio Mast), the three proofs, the City buildings | **The Loudest Night** and the broadcast: the main ending |
| 2. Shut the Line | after level 20, about 4 to 8 weeks | Three campaigns against the Sunnyside plant: the Gate, the Line, the Tanks | **The Last Tin**: no new dead will ever rise |
| 3. The cure | opens at level 13 and runs beside chapters 1 and 2; twelve weeks | One step a week at the Brewery | **Lie Down**: the dead lie down for good |
| 4. After | for as long as the player likes | A town at peace, and the next valley | no end |

A player who stops at the main ending has had about six weeks (owner, 21 Nov, W182). The extras may take longer: a daily player who does everything is busy for about four to five months.

### 7.3 Chapter 2, Shut the Line: three campaigns
The story gives three strongholds in a row, "the hardest in the game". A stronghold alone is one evening. A **campaign** makes each one a goal of two or three weeks that uses the whole town:

- Each campaign has **three preparations, and any two will do** (the same idea as the deeds):
  1. **An ally.** Bring one faction to "friend" with caravans and favours. (The story already says who helps where: a friendly Quarantine Command opens the Gate without a fight; a friendly Foundry and the Toll Kings fight beside you on the Line.)
  2. **A siege project.** A town project built in stages over a week or two: a ram for the Gate, cutting gear for the Line, pumps for the Tanks. This is where late wood, stone, scrap, parts and Tempered Steel go.
  3. **A veteran squad.** Six Veterans in the best gear the Forge makes.
- Then the stronghold itself. A lost assault costs injuries and a few days of repairs to the siege project, never the campaign.
- **Each win makes the valley visibly safer**, so the player feels the story in the town:

| After | The town notices |
|---|---|
| The Gate | Sunnyside's guards are gone: no more raids from them, and trips to Sunnyside are low risk |
| The Line | No new tins on the road: boss nights come half as often |
| The Tanks (The Last Tin) | "Nobody new will ever get up": ordinary nights shrink, a little more each week |

  Nights getting smaller is the reward, not a loss of things to do: the Bell and the crisis ladder are there for players who want a big fight.

### 7.4 Chapter 3, the cure: one year in the valley
The story has it right already: a Brewery (level 13), twelve steps, each needs one thing brought to it ("the feed") and then about one real week of brewing, which goes on while the game is closed. What this plan adds:

- **The cure takes one year in the valley.** With three-week seasons, twelve weeks is exactly four seasons. The four season feeds (wild cucumber seed, the first Freshlock recipe, old apple stock, ice from the Frozen Depot) come from the four seasonal strongholds, one per season.
- **A change to the story's list (approved with W180; the Story chat updates `09-STORY.md`, section 7):** today the season feeds have fixed places (steps 2, 5, 8 and 11: spring, summer, autumn, winter). A player who builds the Brewery in summer would wait nine weeks for spring, and the cure could no longer be done in three months. Proposal: every third step asks for "this season's feed", whichever season it is. Then the cure takes one year whenever it is started.
- **A missed week costs nothing.** A step with no feed waits (already the rule). A season feed that was missed can be bought the next season from Greenwater, dear, by caravan, so nobody waits a whole year for one stronghold.
- **Each step pays something the town can use**, so twelve weeks never feel empty:

| Steps | The brine is | The town gets |
|---|---|---|
| 1 to 3 | stronger pickles | healing pickles heal more; a new Canteen recipe |
| 4 (scene: It Ate a Walker) | eating Freshlock | bites heal in half the time |
| 5 to 7 | a wash for blades and walls | weapons dipped in brine hit zombies a little harder; a brine trench trap |
| 8 (scene: The Crawler Lies Down) | putting single zombies down | **brine jars**: a thrown jar drops a small group of walkers |
| 9 to 11 | nearly there | Rain Collectors with brine slow zombies near the walls |
| 12 (after The Last Tin) | ready | **Lie Down**, the cure ending |

- **The other eight feeds use the rest of the game**, as the story lists them: a faction's friendship or a raid (five of them), a boss sample, a Soldier zombie sample, the plant's last tank. Each is one errand of a check-in or two.
- **The weekly rhythm of a player on the cure:** bring this week's feed (one errand), do the week's crisis, move a campaign preparation forward, ring the Bell if there is time.

### 7.5 Chapter 4, after the cure
The story ends with "nobody's coming any night", and "play goes on". What play is then:

- **The town is at peace.** No zombies come at night any more. Living raiders still try their luck now and then, by day.
- **The Bell becomes "Tell the tale".** Ringing it replays any horde or boss the town has beaten, as a story told at the fire: a full fight, full fun, nobody can die, small rewards. So the fights are not lost with the ending.
- **The town keeps growing sideways:** Legend ranks, town projects, caravans, collections, generations.
- **The next valley.** The Legacy start (decided 11 Nov) becomes the real "one more time": a new town in a valley the cure has not reached, with one heirloom from the old town, and a twist the player picks (a harder winter, more raiders, fewer newcomers). Each valley finished adds a star to the title screen.

## 8. Room for what is still to come
- **Ranges, not exact numbers.** Every target on the scorecard (section 9) is a range. A new system may move a number inside its range freely.
- **Deeds.** New systems add choices, not required steps (section 5).
- **Open-ended tops.** Legend ranks, Studies, collections and the crisis ladder have no last step, so new rewards can be added at any time.
- **Where the systems already planned plug in:**

| System | Deed it adds | Danger budget | Sink or source |
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
| Level 10 | real day 10 to 14 | daily player |
| Level 15 | real day 21 to 28 | daily player |
| Level 20 | real day 38 to 46 | daily player |
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
7. **The top and the end game** (section 7): the Bell, Legend ranks and town projects first; real-time weeks and seasons; then campaigns and the cure's rewards with the story.

Each step is measured with the routine before the next one starts.

## 11. Open questions for the owner
None on 21 Nov. Everything on this page is approved; nothing is built yet. Numbers stay first guesses until the routine has measured them.
