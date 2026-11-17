# Zombie Haven: decisions

Every decision the owner has made, by topic, newest last inside each topic. Merged on 16 Nov 2026 from the old docs (`claude/zombie-haven-decisions.md`, `-decisions-part2.md`, `-handoff.md`, kept in the Game Development project as archive). Build-by-build history is in the git log, not here.

Add new decisions at the end of their topic with the date. If a decision replaces an older one, strike the old one through, don't delete it.

## Direction and pacing
- 11 Nov: Not a game to finish in a few sittings: a quick, rewarding start, then levels take effort and a check-in a day.
- 11 Nov: Raiding is a side activity next to building.
- 11 Nov: Endgame order: weekly crises, seasonal strongholds, legacy start, the City (levels 16–20).
- 14 Nov: Being away is never punished: away time only credits production (no hunger, no raids).
- 15 Nov: Level timers count game hours (L2 6, L3 12, L4 48, L5 60, L6 72, L7 84, L8 96, L9 108, L10 120, L11–15 144, L16–20 168). Away time counts (10 real minutes = 1 game hour). Renown speeds them up: 25 renown per 12 game hours.
- ~~16 Nov: **Freeze.** No new features or balance changes until the reset (docs, the owner's bugs, code clean-up) is done.~~ Use ChatGPT as much as possible. Full tester rounds only at milestones.
- 16 Nov (afternoon): **Unfreeze everything except full tester rounds.** New features, balance changes and new art are allowed again. No full testing for now.
- 16 Nov: New features (the daytime threat, Take command) are built only after the `game.js` split, which itself waits for a green test suite. The balance page and art do not wait.
- 16 Nov (later, W42): step 1 of the split is done (area files in `src/game/`). New features and UI building can start now; step 2 of the split (making each area stand alone) runs alongside and nothing waits for it.
- 16 Nov (vision review): The feeling to aim for: small town → build → gear up → a horde attacks → you win and it feels good; lots of small features; the town visibly grows, with more buildings and gear unlocking.
- 16 Nov: The town starts small but grows to a decent size; the owner wants to see survivors fighting a horde.
- 16 Nov: Zombies are a threat day and night, not only at night. (Not in the game yet.)
- 16 Nov: The daytime threat: small roaming groups outside the walls by day, plus a daytime horde every few days that the radio warns about hours ahead. Nights stay the biggest fights; no constant daytime attacks on the town.
- 16 Nov: Building still comes first, but some things can only be done or won by raiding or doing strongholds.
- 16 Nov: Banner routes must be balanced so the player doesn't always take the easy one.
- 16 Nov: A little gore is fine; still not a horror game, no despair spirals.
- 16 Nov: Confirmed: the player always knows why something is stuck or refused; not pay-to-wait, not an RTS, not an idle game.
- 16 Nov: Add a balance targets page, `08-BALANCE.md` (targets such as pace, danger, hordes, routes and economy; not numbers). It is the next job in the Planning chat.
- 16 Nov: The Planning chat is also the general chat. Bugs are reported in the Bugs chat.
- 16 Nov (Balance chat): `08-BALANCE.md` is written and approved ("looks good"). It holds the targets in full; the main ones follow. No number in the game was changed.
- 16 Nov (Balance chat): Pace: level 3 in the first sitting (about 30 minutes); level 15 in about 4 to 6 weeks for a daily player; a check-in takes 5 to 10 minutes; a level waits on the player's work first and the timer second; every level unlocks at least one building and one piece of gear, every era one new big thing to do.
- 16 Nov (Balance chat): Danger: a handful of deaths on the road to level 15; about 3 in 4 ordinary nights are comfortable wins for a town that keeps up; a lost night or horde is a setback of a day or two, never game over; daytime roamers are safe to deal with when prepared.
- 16 Nov (Balance chat): Hordes: one big night horde per level, arriving only while the player is playing; a big weak crowd of about 40, 100 and 200 zombies by era (today's hordes are far too small), 50 to 60 on screen at once; an ordinary night is a quarter of that and a daytime horde half; winning always pays (loot, renown, mood, a results card); Take command gives a cleaner win and is never required.
- 16 Nov (Balance chat): Banner routes: same effort, different cost; each route has its own lasting reward; all routes are open at once and the first finished wins the Banner; unused routes of earlier Banners stay open for good and still give their reward (levels are gated only by the highest Banner held).
- 16 Nov (Balance chat): Economy: always short of one thing, never of food for long; away production stops at about one day's worth; renown takes a quarter to a third off waiting; the town covers every basic need, and trips, raids and strongholds give extras and things the town cannot make.
- 17 Nov (Balance chat): Nothing unlocks at the very end of the game: an unlock needs game left to use it in. (Level 15 is not the end; the City runs to level 20.)
- 16 Nov (Balance chat): Town size by era: about 15, 30 and 50 survivors (one in three a fighter) and about 12, 25 and 40 buildings.

## Hard rules
- Must work fully offline.
- No Claude (or any AI service) for character AI.
- No chibi. No weapons on zombies (confirmed 16 Nov). The one exception: the Gatling Boss keeps the gun on his arm, no change to him (16 Nov).
- Never push to main. Never republish the direction-A artifact.
- Never paste API keys in chat. Don't delete scheduled tasks without permission.
- Report the repo link and commit links after every push.

## Names
- The era key is a **Banner** (needed for level 5→6, 10→11, 15→16).
- Factions: The Toll Kings, Greenwater Commune (friendly), The Foundry (rival town), Quarantine Command, Helix Biotech, The Hollow.

## Text and tone
- 12 Nov: Building notes: the joke first, the fact second ("leave it as it").
- 13 Nov: Everywhere else (field notes, items, guide, descriptions): facts first, the joke last. Items: numbers first, the funny line last in italics.
- 12 Nov: The radio is the tutorial; its text comes out as if someone is talking, with radio noise.
- Chat bubbles: red = a shout, white = normal talk.

## UI
- 5 Nov: Style **Glass · Sticker icons**. Icons fill 80–90% of their button, no empty boxes.
- 14 Nov: Keep the phone shape (no desktop layout). HUD scales with the phone column; buttons never under 44 px.
- 14 Nov: Menus (People, Build, Town, survivor details) pause the game; map pop-ups, news and radio don't.
- 14 Nov: Every message has one home; ONE news pill at a time.
- 14 Nov: Emergency slow-down stays OFF by default.
- 12 Nov: Popup buttons are green only when recommended. Resource icons instead of words.
- 11 Nov: No rings: a spinning arrow overhead (yellow selected, red target, orange alert).
- 16 Nov: The UI still needs a lot of work; all UI work happens in its own chat.
- 16 Nov (UI chat): The screens that bother the owner most are People & survivor details and the Town panel (crowded, hard to read, confusing or too many taps); first, UI buttons overlaying each other.
- 16 Nov (UI chat): Nothing floats over an open menu, for every menu. The radio button is hidden. The alert button sits under the menu, which covers it completely; it is never part of the menu. The "Paused" pill sits centred on the menu's top edge. (Not built yet.)
- 16 Nov (UI chat): A share of a whole is written as a percentage ("95%"), never "95/100"; real counts stay as counts. (Not built yet.)
- 16 Nov (UI chat): The "New: Raiders" note shows a raider in the Toll Kings' kit (red bandana, black vest, bat), not a plain drifter. Built in 3D.178.
- 16 Nov (Planning chat): Upgrade Town: when 12 game hours or less are left, "12 h sooner" is hidden and only "Finish now" shows (the two cost the same there). (Not built yet.)
- 16 Nov (UI chat): UI building (U13, U14, U18) waits until the `game.js` split is done. Owner-seen bugs are still fixed straight away. *(Lifted the same day, W42: step 1 of the split is done and is enough.)*
- 17 Nov (UI chat): A tip in the Needs you list can be hidden until the next day with a ✕ (not the word "Hide"). Emergencies can't be hidden. Built in 3D.186.
- 16-17 Nov (UI chat): In the town each kind of raider carries its own weapon (Thief a knife, Brute a sledgehammer; today the weapon is random), and the Raiders note shows the kind that came. The weapons upgrade as the Banners or levels go on. (Not built yet: the steps are W55.)

## Town, walls, building
- 12 Nov: Walls are repaired by a worker (no self-healing). Buildings can't be placed on walls or fences.
- 12 Nov: Banner gates left as they are.
- 12 Nov: Newcomers walk in, wave, and are guests until welcomed.
- 11 Nov: Ignore "Gym XP that lasts" and "walls that don't use building land".
- 10 Nov: Map about 40×42, at least 8 open tiles round the biggest town; the north-east highway is a working route with wrecks.
- 15 Nov: Scrap → wood through the **Pallet Yard** building.
- 15 Nov: "Sealed" means the HQ and at least 3 in 4 buildings are inside the wall.
- 15 Nov: Add a Banner route that isn't a fight (built as the Founders' Festival).
- 16 Nov: When the land grows, existing walls do **not** move out for free: the player rebuilds or moves them.
- 16 Nov (Balance chat): Building rules (in full in `08-BALANCE.md`): one clear job each; build more and upgrade, with land as the limit; a building job is done by the next check-in; people run production buildings; fighters are the stars and defences help; placement matters a little, by rules shown before placing.
- 16 Nov (Balance chat): Building looks: readable by shape plus one signature feature; every upgrade level looks different; era 1 is a scrap camp, era 2 a patched-up village, era 3 a solid fortified town.
- 16 Nov (Balance chat): Spread the existing buildings over levels 1 to 10 (today they open in three batches, at levels 1, 4 and 7). (Not built yet.)
- 16 Nov (Balance chat): Move the Stone step to era 3, from level 11 (today level 7). (Not built yet.)
- 16 Nov (Balance chat): Seven new buildings: Watchtower, Memorial Garden, Festival Ground, Landmark (the build-route reward, one per Banner), Trophy Hall, Shelter Bunker (era 3), Forge (era 3). (Not built yet; level, cost, size and look still to design.)
- 16 Nov (Balance chat): The School is for children only (they grow up faster); the Library trains adults' Intelligence. (Not built yet.)
- 17 Nov (Balance chat): **The building plan is approved** (`08-BALANCE.md`, section 10): the level each building opens at, levels 1 to 15, and the level, size, first-guess cost, job and look of the seven new buildings. (Not built yet.)
- 17 Nov (Balance chat): Seven existing buildings open in era 3 (Wind Turbine, Cold Store, Electric Fence, Greenhouse, Solar Array, Barracks, Ammo Factory), so the spread runs to level 15, not 10.
- 17 Nov (Balance chat): The build route to a Banner is that era's Landmark; it replaces "finish a Trading Post or the Radio Tower". (Not built yet.)
- 17 Nov (Balance chat): The Founders' Festival opens at level 5 (today level 8), held at the Festival Ground, so the celebrate route can earn the first Banner. (Not built yet.)
- 17 Nov (Balance chat): The Quarry opens at level 8, before the power buildings, which cost stone. (Not built yet.)

## Nights and survival
- 15 Nov: Civilians form a militia when every fighter is down.
- 15 Nov: Walkers grow more slowly after day 10, "but not too slow".

## Trips
- 15 Nov: Three cards of its own per ordinary destination; a trip check before sending (whole-trip odds, no hidden odds).
- 15 Nov: Trip losses lowered: medium 1.7% → 1.0%, high 4% → 2.5% per person per stage.
- 15 Nov: Low risk never kills.
- 15 Nov: Every trip card offers turn back.

## Strongholds and raids
- 11 Nov: More control than Fallout Shelter: select and move, stances, one ability per job, explosives, doors.
- 11 Nov: Always normal speed (no slow-motion).
- 11 Nov: Squad caps: strongholds 6, raids 8 (+ vehicle seats).
- 11–12 Nov: Raids are camp maps that look like towns. Raid carry cap: 10 per squad member.
- 12 Nov: Faction camps look like tidy communities: more buildings, straight rows, no scattered barrels and boxes.
- 16 Nov: The player should be able to steer survivors inside the town too, especially the fighters. (Not in the game yet.)
- 16 Nov: How: a **Take command** button when the town is attacked; fighters only, same controls as raids. Optional: left alone they fight on their own, civilians stay automatic, and the town must still win a fair fight without the player.

## Factions
- 12 Nov: More renown must not make you more hated: factions turn hostile only over how they are treated.
- 13 Nov: The Gatling Boss is a zombie, not a Toll King. The Toll Collector is a man in the Toll Kings' kit.
- 13 Nov: No leader is drawn bigger than his people; a leader has bodyguards instead.
- 13 Nov: Survivors can't wear faction kits; they are raider-only and never drop as loot.
- 10 Nov: Helix rifles lootable at a low rate; Hollow daggers loot only, never sold.
- 15 Nov: The Toll Kings find the town by day 5–7.

## Art and assets
- 12 Nov: Faction uniforms: draw the **gear only** and fit it to our survivor; no whole new characters.
- 12 Nov ("please don't forget that"): Tripo needs one file per view. Never hand over a turnaround sheet as one picture: separate square files, same scale, delivered as files.
- 13 Nov: Armour sheets: three views (front, right side, back). Bright magenta-pink mannequin. Armour never covers the head (helmets are separate items). Add trousers or leg pieces where they fit. Sleeved armour in a V pose.
- 13 Nov: Armour detail: low-to-medium, clean chunky shapes, flat colours, a few readable details; no dirt or texture.
- 13 Nov: Show the owner the whole sheet first; split and save only after approval.
- 13 Nov: No hair sticking out of a helmet. Full suits recolour the survivor below the neck. The survivor body stays as is for fitting.
- 13 Nov: Hold on stronghold and raid maps; enough town maps for now.
- 16 Nov (Art chat): Armour Batch 5 is Hockey Pads, Kevlar Vest, Scrap Plate, Military Armor and SWAT Armor.
- 16 Nov (Art chat): The soft armours with no model (Work Jacket, Leather Jacket, Biker Leathers, Hoodie, Raincoat) will be built in Tripo later; they are not painted on in code.
- 16 Nov (Art chat): New zombie models go in as looks first: rigged and shown on the Zombie test page with no new behaviour. What each one does is decided afterwards. (The 11 models of 16 Nov: built in 3D.182.)
- 16 Nov (Art chat): All eleven new zombie models are **new kinds of zombie** (each with its own name, strength and trick), not new looks for kinds the game already has. The tricks are decided in the Planning chat.
- 16 Nov (Art chat): The left-over files in `assets/` that nothing loads (old 2D sprite frames, test pages, mock-ups) are deleted from the branch. Done with 3D.183; list in `06-ASSETS.md`, section 9.
- 16 Nov (Art chat): The Zombie test page shows one zombie at a time, turning, and plays Stand / Walk / Run / Attack on the spot, so it can be followed. Built in 3D.183.
- 16 Nov (Art chat): On the Zombie test page a survivor stands next to the zombie for size. Built in 3D.184.
- 17 Nov (Art chat): Zombie sizes, measured against a survivor: the Walker is the same height as a survivor; the Lasher is big, with its chest where the top of a survivor's head is; the Leaper is taller than a survivor. Built in 3D.185 (these are the sizes in the real game too, not only on the test page).
- 17 Nov (Art chat): The Crawler has no legs. Built in 3D.185: the legs of both Crawler models are cut off a little below the hip.
- 17 Nov (Art chat): Models the game already has are not rigged again when the owner sends them a second time (the Gatling Boss, Butcher and Bloater Queen files of 17 Nov were the ones already in the game).

## Open questions (not decided)
- **The eleven new zombies (W48): Claude's proposal, 17 Nov, not decided.** Trick; how to beat it; strength next to a Walker; first day.
  - Stag: by day it roams outside the walls and charges in a straight line, knocking a person down; can't break walls. Beat it with walls, fences and escorts. Weak but very fast. Day 6.
  - Leaper: jumps fences and first-level walls and lands inside. Beat it with upgraded walls or a fighter inside. Weak, fast. Day 11.
  - Splitter: when killed it splits into two weak halves that keep coming. Beat it with area damage or by saving a hit for the halves. Medium. Day 13.
  - Digger: tunnels under the wall; a dirt mound shows where it will come up a few seconds before. Beat it by posting a fighter at the mound. Tough, slow. Day 14.
  - Bile Spewer: sprays a puddle that stays about 10 seconds; people standing in it are slowed and hurt. Beat it by moving out of the puddle and killing it at range. Medium. Day 16.
  - Lineman: goes for the power; the electric fence doesn't hurt it, and what it breaks stays dark until repaired. Beat it by guarding the generator. Medium. Day 18.
  - Listener: blind; ignores quiet people and runs at noise (gunfire, machines). Beat it with quiet weapons (melee, bows). Low health, hits hard. Day 20.
  - Hazmat: fire, bile, spores and rot blasts don't hurt it; traps do half. Beat it with fighters. Fairly tough. Day 22.
  - Nurse: gets a fallen zombie near her back on its feet every few seconds. Beat her by killing her first. Weak, stays at the back. Day 24. (Other option: her scratch leaves a wound that only the Infirmary cures.)
  - Soldier (male): helmet and vest: bullets and arrows do half damage (the reverse of the Riot Zombie). Beat it with melee. Tough. Day 27. No gun.
  - Soldier (female, red crosses): the squad's medic: wounded zombies near her slowly heal. Comes with male Soldiers. Beat her by killing her first. Medium. Day 27. No gun.
