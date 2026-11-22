# Zombie Haven: strongholds and raid maps (Strongholds chat, 22 Nov 2026)

**Approved by the owner, 22 Nov 2026** (W218 to W221, below), and **built the same night: 3D.277, 3D.278 and 3D.280 to 3D.283**, pushed to `art-direction-b`. 3D.277 and 3D.278 are live (the UI chat published them with version 300); **3D.280 to 3D.283 are pushed, not published** (W223). Owner, 22 Nov: "For this only, you will run and make all the maps and rooms and props"; "when you raid a town at level 5 it will be small but when you raid a town at level 15, the town will be much bigger"; "run all, so I have something to review in the morning".

Numbers (enemy counts, health, timers) are first guesses for the Balance chat. Each map was checked to be sound at every level and finishable by a squad that can't die; it has not been balanced (section 9).

## 1. How they played before
**Strongholds** (6): one map of ten rooms (entrance, side room, hall, two wings, boss room, four locked rooms) in three floor plans; three of the six were the other three turned upside down. Doors start shut, locked rooms are a dice roll, the enemies sleep until the squad walks in, the squad walks the same route every time, and the goal was always to kill the boss.

**Faction raids** (6): one generator for all six camps: a 16 x 16 fenced square, gate south, a wide street to the hall, buildings in rows. Sneak, smash or loot buildings, patrols every half minute once the alarm goes up, the leader and three bodyguards in the hall, 10 carried a head, out by the gate. The three raid goals in the code were switched off in the camps.

**What made them the same:** one shape each; one goal; the place did nothing (water, fire and snow were colours); the same zombies with the same habit; bosses were stretched ordinary zombies; a faction was only a colour; nothing to bring home but loot.

## 2. The plan in one line
Every place has its own shape, one house rule (something about the place that changes how you fight), a goal that isn't only "kill the boss", something in the map the squad can use, and something only it gives. **Every map grows with the town's level** (W219 of the owner's answers: camps and strongholds).

## 3. The kit (built in 3D.277, used by every map)
Each stronghold is a **plan**: plain data made for the town's level (`src/game/19b-stronghold-maps.js`). The code reads the plan, not fixed rooms.

| # | Block | What it does |
|---|---|---|
| B1 | Own floor plans | Rooms and doors of any number and shape, sized by the level |
| B2 | Goals | Kill the boss; use a thing; carry things out (the carrier walks slower and can't fight, and heads for the way out by itself); push something to a place (the ram); hold a spot for a time; seal things one hold at a time. Side goals pay extra |
| B3 | Things to use | Tap a thing: the nearest selected survivor walks there and works it (Mechanics and Engineers are quicker at machines). Switches, pumps, valves, levers, a generator, a loudspeaker, lockers, crates |
| B4 | Floor hazards | Water (slows all but the Bloated), fire (burns, spreads), cold (hurts away from a burning barrel), gas, furnace heat; always drawn on the floor |
| B5 | Dark rooms | The dead in a dark room are unseen until someone is within 3 tiles |
| B6 | Waves | The dead come in from places on the map while a hold runs |
| B7 | Boss moves | A tell, then the move: a slam round him, a long gun burst, a call for his kind, or a charge |
| B8 | Friends in the fight | A friendly faction's people fight beside the squad and go home to their own people |
| B9 | Camp plans | Each faction's camp its own shape, size and house rule |

The **practice page** (Town → Defense → Stronghold practice, or `?shtest=1`) lists every map and has a **town level** row (3 to 20) that sets the map's size.

## 4. Place by place (as built)
### 4.1 The strongholds the game already had
| Place | Built | Size by level | Shape | House rule | Goal | Brings home |
|---|---|---|---|---|---|---|
| **Overrun Clinic** | 3D.277 | 2 wards a side at level 3, up to 6 | A corridor with wards off both sides, the operating theatre at the end, the pharmacy off the lobby | Patients asleep in their beds get up when someone walks past or a gun goes off near them: quiet weapons are safer. Some wards are locked (supplies, a nest, a survivor or empty) | Kill the Butcher of Ward 3 (slams); side: empty the pharmacy locker | Medicine; Dr. Ines (as before) |
| **Blackgate Prison** | 3D.278 | 3 cells a side at level 3, up to 7 | The outer yard, Cell Block C (cells both sides), the control room, the motor pool, the Warden's yard behind a heavy gate | The control room's lever opens every cell **and** the gate at once: quick, but everything in the cells comes out together. Or blow the gate with a bomb. A Riot zombie's shield faces whoever it is fighting: hit it from the side | Kill the Warden (charges); side: hot-wire the prison van | The van (as before) |
| **Drowned Greenhouse** (spring) | 3D.281 | 2 houses a side, up to 5 | The great glasshouse, flooded houses either side, the pump house, the Palm House | Deep water slows everyone but the Bloated; each pump drains one house | Carry out the wild cucumber seed; side: the Mire Mother (calls the Bloated) | The spring feed |
| **Burning Refinery** (summer) | 3D.281 | 3 to 6 tanks, longer racks | The gate yard, the pipe racks, the control room, the tank farm, the cracking tower | Fire creeps along two fuel lines until their valves are shut; a clock until the tank farm goes up | Carry out the first Freshlock recipe and be out in time; side: Cinder | The summer feed |
| **Harvest Fair** (autumn) | 3D.281 | 2 to 4 rows of stalls | The midway, the barns, the orchard store, Farmer Fresh's stage, the Haunted Ride | The stage loudspeaker plays the old show: the dead crowd the stage for 30 s. The Haunted Ride is dark | Kill the Scarecrow (charges) and carry out the old apple stock | The autumn feed; Pell's contract |
| **Frozen Depot** (winter) | 3D.281 | 2 to 5 barracks a side | The snowed yard, the depot road with barracks and motor bays, the cold store, the hangar | Cold hurts away from the burning barrels; the dead frozen in the ice can't be hurt and thaw when a blast comes near | Kill the **Gatling Boss** (spins up, then a long burst) and carry out the ice | The winter feed |

### 4.2 The story's new strongholds (main story, levels 17 to 20)
| Place | Built | Opens | Shape | House rule | Goal | Brings home |
|---|---|---|---|---|---|---|
| **Helix Lab 7** | 3D.282 | Level 17 | A security ring round sealed labs, the generator room, Containment, the basement | No power: dark everywhere but reception. The generator turns the lights on and opens every security door, and the cages with them. **If Amy is in the squad, Containment opens for her codes** | Carry out the build-up tables; side: the **Mutant** (Subject 2) | Proof 2 |
| **The Records Office** | 3D.282 | Level 18 | A tower: floors shown side by side, stairs through each floor's middle office | Penhallow has the files shredded, top floor first; a clock for each floor | Carry out 3 crates of files. **No boss** | Proof 3 |
| **The Dusk Radio Mast** | 3D.282 | Level 19, with all three proofs | A path winding up the hill through the ring of the dead, the yard, Moth's shed | The ring is blind and listens: a gunshot nearby or brushing past one wakes it. Then a **hold**: fix the line at the shed and hold the yard for a minute while the ring comes up in waves. **No boss** | Hold for a minute | Moth's Mixtape |

Until the story's scenes are built (Features chat) these open by level; the Mast waits for the three proofs. Proof 1 comes from Checkpoint Bravo's command tent (4.4).

### 4.3 Shut the Line: the Sunnyside plant (3D.283; level 20, after the Mast; one part after the other)
| Place | Shape | House rule | Goal |
|---|---|---|---|
| **The Gate** | The road up to the plant wall, a tower each side of the gate, the courtyard, Vance's post | Riflemen stay on the towers and shoot whoever comes in range. The gate is too heavy to force: push the battering ram up to it (slow, no fighting while pushing). **A friendly Quarantine Command:** Okafor opens the gate and she and a soldier fight beside the squad | Ram the gate; beat Captain Vance (gun bursts) |
| **The Line** | The factory floor with three conveyor belts, the vats, the catwalk, the foreman's office | The belts carry whoever stands on them (a lever stops them all); each vat keeps feeding the dead in until its valve is shut: valve 1, then 2, then 3. **A friendly Foundry** sends the Forgemaster and a hand; **friendly Toll Kings** send Rook and a rider | Shut the three valves; beat **the Butcher** |
| **The Tanks** | The pipe bridge, the tank hall, the last tank | Gas round each tank until its pump is started and someone holds by it for 20 s, one pump at a time. The last tank opens when every tank is sealed | Seal the tanks; beat the Head of Taste (**the Bloater Queen**, calls the Bloated); side: a sample from the last tank (the cure's step 12) |

These three keep one size (they open only at level 20). `S.plant` keeps which parts are taken. The win lines say what the town notices (13-LONG-GAME 7.3); the changes to nights themselves are not built (Balance chat).

### 4.4 The six raid camps (3D.280)
**Size:** about 17 tiles across inside the fence at level 5, 25 at level 15, 30 at level 20 (the Toll Kings' camp is long and thin: 25 x 12 at level 5, 44 x 20 at level 20). More rows of buildings (29 to 30 at level 5, 37 to 38 at 15, 45 to 54 at 20), more guards and workers, more patrols.

| Camp | Shape | House rule | Story thing (in) |
|---|---|---|---|
| **Toll Kings: the Larder** | Long and thin along the highway; a second gate in the east | Patrols arrive at the east gate **on bikes**, faster. Break the **gate winch** and that gate jams: patrols come round slower | Salt (cure step 3) and the Larder ledger (the Larder) |
| **Checkpoint Bravo** | Wider than deep, towers at the corners | The towers' **searchlights** sweep the ground (drawn) and raise the alarm on anyone in them. Break the **floodlight generator** and they go dark | The army contract (**proof 1**) and the standing order (the command tent) |
| **Helix field lab** | Square | **Cages of the dead**: break one and they go for whoever is nearest, guards included. The cage with prisoners stays (the taken survivor) | Lab glass (cure step 4) and the Probably Fine memo (the lab) |
| **The Hollow: Aisle Seven** | The old supermarket: aisles of shelves | **The dead walk among them**, calm until the squad comes close; while the **chapel bell** stands, every patrol brings the dead too | The Shepherd's tin (cure step 10) |
| **The Foundry** | Square, furnaces | **Furnace heat** hurts; break the **steam valve** to cool it (loud: it raises the alarm). Their guards' armour faces whoever they fight: hit them from the side | The steel brewing vat (cure step 7) and the shift sheet (the works office) |
| **Greenwater** | An open village, gaps in the hedge | **They don't want this fight:** once the alarm is up, stand at the meeting house for 3 s and they give up; nobody fights after that | The Old Brine (the granary) |

Story things go into `S.keyItems` and are named on the result card; the Story tab and the Brewery that use them are not built (Features chat).

## 5. Checks and pictures
- `tools/qa/sh_maps_check.js [map ...]`: every stronghold at levels 3 to 20: no overlaps, every room reachable, things inside rooms, no map smaller at a higher level; a squad that can't die, left to itself (with a player's orders for the switches), finishes each map; pictures at level 5 and 15.
- `tools/qa/sh_camps_check.js [camp ...]`: every camp at levels 3 to 20: every building reachable, nothing on the boulevard, bigger towns get bigger camps; each house rule made to happen; pictures at level 5 and 15.
- Both need no web server (`tools/qa/sh_lib.js` serves the repo from disk inside the browser). Pictures: `runs/strongholds/` in the repo.

## 6. Not done, and limits to know
- **Not balanced.** Counts and health are first guesses scaled from the old maps; no balance-bot run yet (Balance chat, `tools/balance/sh_probe.js`).
- **New kinds of zombie are stand-ins** until the Features chat builds them: the Mast's Listeners are Walkers that behave as listeners; Lab 7's night shift and the Hazmat crews are Walkers and Riot zombies; Soldiers are Riot zombies; the Delivery Driver is not on the Line yet.
- **The camps' goal pick** (stockpile, prisoners, leader) is not back; each camp holds its story things instead.
- **A carried thing is not drawn on the carrier** (only its name over them); the ram is pushed the same way.
- **The Sunnyside street map** (the scene C21) is not made: it waits for the scene player (Features chat).
- **First-visit scenes** (P1 to P6), the Story tab, the Brewery and what Shut the Line changes in the nights: Features and Balance chats.
- Allies appear only when a faction is friendly; nothing in the game sets "Okafor sided with you" or "Rook spared" yet (C16, C23), so friendship (`ally` or attitude 60+) stands in for them.

## 7. What the Art chat must make
The maps, rooms and props are drawn in code (done). The Art chat makes the **people and zombies** (Tripo models; gear only on our survivor where it is a person):
1. **Sunnyside staff kit** (crisp shirt, apron, name badge): Penhallow and her staff.
2. **Sunnyside security kit** (living guards for the Records Office and the plant): a uniform and cap, no helmet over the hair.
3. **Lab-coat zombie** (Lab 7's night shift): a Walker in a Helix lab coat.
4. **The Delivery Driver** with his trolley (for the Line). Already decided.
5. **DJ Moth's outfit** (cardigan, headphones) and **Biscuit the cat**, for the Mast.

Nice to have later: own models for the seasonal bosses that are stretched zombies (the Scarecrow, Cinder, the Mire Mother).

## 8. The owner's answers (22 Nov)
Asked in this chat as W211 to W214; those numbers were also taken by other chats the same night, so they are recorded as:
- **W218.** The plan (each place its own shape, house rule and goal, from the kit): **approved as is**.
- **W219.** Use the real boss models: **yes** (the Mutant in Lab 7, the Butcher on the Line, the Bloater Queen at the Tanks, the Gatling Boss in the Frozen Depot).
- **W220.** Some strongholds have no boss: **yes** (the Records Office, the Mast).
- **W221.** Order: **the kit and the Clinic first**. Also: camps and strongholds both grow with the level; Claude builds the maps, rooms and props; push to the branch, don't publish.

## 9. Waiting on the owner
- **W222.** Review the maps on the practice page (Town → Defense → Stronghold practice): each place at a low and a high town level. What should change? Pictures of every map at level 5 and 15 are in `runs/strongholds/`.
- **W223.** Publish 3D.280 to 3D.283 after your review? (Claude: after the review, and after the Balance chat has run its stronghold probe on them.)
