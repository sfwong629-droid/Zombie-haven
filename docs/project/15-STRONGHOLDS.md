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

## 10. Rework (proposed 22 Nov, Strongholds chat; nothing built; W232 to W235)
Owner, 22 Nov: locking by story progress; "you just repeat the stronghold non stop and it will be boring"; "it also can't explain how the zombies keep coming back"; "we need to rework the plan for stronghold and faction maps... They must make sense. Like zombie. Some of these strongholds live within a faction map so maybe we need to make a huge stronghold building in the faction map?"

### 10.1 What does not make sense today
1. **Every place refills on every visit.** The story says the dead don't wander into empty buildings: they are stuck where they died ("people died at home and got up indoors", section 15) or they go where something fresh is.
2. **The dead's places and the living's places are two unconnected lists.** Lab 7, the Records Office and the plant all stand in Sunnyside but are separate trips; the Larder is the Toll Kings' but only a hut in their camp; the seasonal places belong to nobody.
3. **A faction's town plays the same for a friend and an enemy.** A friend can only raid it, which betrays them.
4. **Nothing stays changed after a win**, and the rewards repeat.

### 10.2 Three rules
- **R1. The dead are where they died, or where the fresh is. Killed is killed.** A room that was cleared stays cleared.
- **R2. Only the living rebuild.** What repeats is faction towns (they rebuild), the seasons (something fresh comes back), and calls for help (the dead follow living people).
- **R3. Every place gives one thing once, and the valley is different afterwards.**

### 10.3 Four kinds of place
**A. Sealed places (the dead; done once).** Buildings shut in the first week with everyone inside: the Overrun Clinic (hospitals fell first), Blackgate Prison (locked cells), Helix Lab 7 (the night shift). Progress is kept: cleared rooms stay cleared, opened doors stay open, so a big place takes two or three visits and a lost run is not wasted. When the last room is clear the place is **Secured** and becomes a small outpost of the town (the Clinic: a little medicine a day; the Prison: the van and a safe stop that lowers trip risk on that road). Inner parts are locked by the story (the table of the earlier proposal: the theatre with Dr. Ines, the control room with Command's keys, Lab 7's basement with Voss's plans). Size is the place's own, bigger the later in the story it comes; it does not regrow.

**B. Faction towns (the living; they repeat).** One map per faction with two parts: **the town** outside (today's camp: sneak, loot, patrols; it rebuilds, and it is bigger in each era because they have had time to build) and **the keep** inside it: one huge stronghold building in the middle of the map that the squad walks into (the room maps built in 3D.277 to 3D.283). And every living town draws the dead, so every faction has **a part it lost** and walled off.

| Faction town | The keep (story lock) | The part they lost (who is in it) | Coming as a friend | Coming as an enemy |
|---|---|---|---|---|
| Toll Kings' fort | The Larder: tins to the roof, the salt, the ledger (after C16) | The lorry park: the last Route 9 drivers, still by their cabs (Delivery Drivers) | Rook asks you to clear the lorry park; his riders come along; paid in salt | Raid the fort, then the Larder |
| Checkpoint Bravo | The command bunker: the contract (proof 1), the standing order | The field hospital: the cordon fell from the inside (Soldiers, Nurses) | Okafor asks you to retake it; her soldiers come along | Raid; the bunker last |
| Helix field lab | The lab: lab glass, the memo | The cage block: the Unlock trials (Lashers, a Splitter, Cage 1) | Voss (after C18) opens the lab; the job is the cage block | Raid; cages can be broken open on the guards (built) |
| The Hollow | Aisle Seven: the supermarket itself is the keep, their camp is the car park | Nothing: the dead are their flock | Never friends | The car park, then the aisles, with the dead beside them |
| The Foundry | The furnace hall: the brewing vat, the shift sheet | The old cannery hall (Brutes, the Bloated) | The Forgemaster hires you to retake it; paid with the vat | Raid; furnace heat (built) |
| Greenwater | The brine cellar (never a fight for a friend) | Nothing inside the brine line; their trouble is outside it (the Greenhouse, below) | They ask for help in spring | The open village (built) |
| **Sunnyside** (level 16+) | Three big buildings on one town map: Helix Lab 7 at the edge (sealed), the Records Office, and the plant (the Gate, the Line, the Tanks) | The "product issues" the clean-up crews locked in the basements | Never | The street (living staff and security), then one building per story step |

The lost part can also be used by an enemy: break its wall and the dead come out on the guards (the Helix cages, made general).

**C. Wild places (once a season; each is tied to a faction).** Why the dead are back every year:
| Place | Whose | What brings them back |
|---|---|---|
| Drowned Greenhouse (spring) | Greenwater's old seed house, outside the brine line | The new shoots: the first fresh thing of the year |
| Burning Refinery (summer) | The Freshlock Works (Helix, Sunnyside) | The Burnt smoulder all year; the summer heat flares the fires up and they get up again |
| Harvest Fair (autumn) | The Hollow's holy ground (Farmer Fresh's stage) | Windfall apples in the orchard, and the Shepherd brings his flock for the old show |
| Frozen Depot (winter) | Quarantine Command's stores (Fort Harlan's depot, if the Story chat agrees) | The herds on the highway freeze where they stand and pile up there; the Gatling Boss never stood down |
The Dusk Radio Mast stays a one-time story place (the ring came for years of noise).

**D. Calls for help (small, the everyday repeat).** DJ Moth passes on a caller trapped somewhere: a house, a shop, a cleared place someone moved into. The dead followed the living there. A 2 to 3 minute map; the goal is to get them out; the reward is renown, loot, sometimes a newcomer. About two a real week. Players who only want a fight have the Bell.

### 10.4 Balance
- **Length:** a visit is 3 to 5 minutes; one outing per check-in is enough for a daily player. Big places are finished over several visits (progress is kept).
- **Locks:** by level and by story step, shown with the reason; a recommended squad power on the card; turn back at any time; the fallen are carried out if anyone is standing (no hidden deaths).
- **Rewards:** the unique thing once (a person, a proof, a cure feed, a blueprint); after that only ordinary loot, with limits that have a reason: a town until it has rebuilt, a wild place once a season, calls about twice a week.
- **Size:** faction towns grow with the era (bigger at level 15 than at 5, as built); sealed places have their own size.
- **Deeds** (13-LONG-GAME, section 5): secure a place; do a faction's job; answer a call.
- **Measured** with the stronghold probe: an unled squad at the recommended power wins about 7 in 10; a led one nearly always.

### 10.5 What stays from 3D.277 to 3D.283, and what is new
Stays: every room map, every house rule, the camps and their growth, goals, things, bosses, allies. New, in this order, one change per build: (1) places remember (cleared rooms, opened doors, Secured, the outpost reward); (2) story locks on rooms; (3) town and keep on one map: the squad walks into the big building (the Larder first); (4) the lost part and the friend's job, one faction per build; (5) the Sunnyside town map with its three buildings; (6) the seasons' "why" and once-a-season limit; (7) calls for help. About 12 to 14 builds. The Story chat checks the new story bits (the lost parts, Fort Harlan's depot); the Balance chat measures each.

### 10.6 Questions
- **W232.** The three rules and four kinds of place: yes?
- **W233.** Town and keep on **one map**, the squad walking into the big building (Claude's pick), or the keep as its own trip that opens after the town?
- **W234.** Every faction has a part it lost, and friends give jobs there (so a friendly faction's town is playable without betraying it): yes?
- **W235.** Sealed places keep one size; only faction towns grow with the level: OK? (It changes "strongholds grow with the level" of last night.)
- W222 (review the maps) stays open. **W223 changes:** Claude now advises holding 3D.280 to 3D.283 unpublished until this is decided.

### 10.7 Decided and added, 22 Nov (evening)
- **W232: approved** ("yes approved"): the three rules and the four kinds of place.
- **Outposts** (owner's idea: "a smaller map but similar to the town... you can build different stuff around it... only for combat"; Claude's shape, owner: "Your idea is good"): an outpost is **a Secured stronghold the town holds and defends**, not a new blank map. One screen; about 6 to 10 marked spots to build on (barricades, traps, a watchtower, a floodlight, a gun nest, bunks for 2 to 4); no water, food, mood or upkeep. It fights only when the player goes there: the radio warns days ahead that a herd is on that road; holding the outpost keeps the herd from the town (the next big horde is smaller, trips on that road safer); losing it damages the outpost and the garrison falls back. One in era 2, two or three by era 3; none before the first Banner. The level's big horde still comes to the town. Built after the rework's first three steps, and better once Take command exists. Fixed spots or free placing: W236.
- **A map of the valley** (owner: "it seems like we will need to make a map for the entire game"; proposed, W237): one screen in place of the trip list: a picture of the valley, not a place to walk in. The Haven in the middle; the north-east highway to Sunnyside; the river with Greenwater and the weir; the hills with Moth's mast; the cordon with Checkpoint Bravo; each place a pin showing its state (locked with the reason, sealed, secured, outpost, a faction's town and how they feel about the Haven); herds drawn moving along the roads; calls for help as a flashing pin. Tap a pin for the place's card. The screen is UI work (UI chat, mockup first); this chat supplies the list of places and where they lie.

### 10.8 Decided 22 Nov (18:07), and the outpost's build spots (proposed, W236)
- **W233: one map**, the squad walks into the keep. **W235: yes**, sealed places keep one size. **W237: yes**, the valley map. W234 (lost parts, friends' jobs) and W236 are explained and waiting.
- **Build spots.** The outpost's map is the secured place's front (the Clinic's yard and gate). Spots are outlines on the ground, of three kinds, and each takes only what fits it:
  - **Line spots** across the ways in: barricade, then wood wall, then spiked wall; one of them can be a gate.
  - **Ground spots** in front of the lines: snare, spike pit, a car-alarm lure, later the brine trench.
  - **Post spots** behind the lines: watchtower, then gun nest; floodlight; and one **bunkhouse** (2 people, then 4) that sets the garrison.
- **Placing:** tap a spot; a small card shows the two or three things that fit, each with its cost and what it does; pick one; a supply cart leaves the Haven and it is built by the next check-in. Tap a built thing to upgrade or swap it. After a fight, one **Repair all** button with its cost.
- **How many:** about 6 spots at first, up to 10 as the outpost is upgraded with the era. Each outpost has its own ground (the Clinic one narrow gate, the Prison its walls and towers already standing). The pieces are the town's own walls, traps and towers: no new art.

### 10.9 Decided 22 Nov (18:11)
- **W234: yes.** Every faction but the Hollow has a part it lost; friends give jobs there.
- **An ally's call** (owner: "when an ally has a herd and requests help from the player"): a friendly faction radios that a herd is on its road. The squad goes to **their** town and defends it beside their guards (their map, the herd coming in waves at the gate). Help: reputation, a gift from their store, and their people come when the Haven calls (Shut the Line's allies). No help: they lose a few buildings for a while and cool a little toward the Haven; never while the player is away (the call waits). About one a real week across all friends. It is the fourth thing a faction town is for: trade, raid, a job, a defence.
- **W236: free placing for outposts** ("for now"). The outpost's ground is the secured place's front; the player places walls, gates, traps, towers and a bunkhouse tile by tile, as in the town, from a short combat-only Build list (no water, food, beds for living, or production). To keep it sound: a build ring like the town's glowing ring; a line on the card when the wall has a gap ("open on the east side"); a limit on pieces by era in place of land; one Repair all button. Fixed spots stay written above as the fallback if free placing proves fiddly on the phone.

### 10.10 The valley map: the places and where they lie (for the UI chat's mockup, W237)
North is up. The Haven sits in the middle, a little south of centre. The north-east highway runs from the Haven's north-east corner to Sunnyside in the top right. The river runs down the west side, north to south, with the weir at the bottom. The hills are the top left. The cordon runs along the east edge.
| Place | Kind | Where | Opens |
|---|---|---|---|
| The Haven | home | centre | start |
| Greenwater (and the Drowned Greenhouse just outside its fence) | faction town; wild place (spring) | west, on the river | level 3; spring |
| The Overrun Clinic | sealed, then outpost | just south-east of the Haven, on the valley road | level 3 |
| Blackgate Prison | sealed, then outpost | south | level 7 |
| The Toll Kings' fort (the Larder inside) | faction town | half way up the north-east highway | day 5 to 7; the Larder after C16 |
| The Foundry | faction town | south-west, down river | level 5 |
| The Burning Refinery | wild place (summer) | south-east | summer |
| Checkpoint Bravo | faction town | east, on the cordon | level 7 |
| The Frozen Depot | wild place (winter) | north-east, on the cordon | winter |
| The Helix field lab | faction town | north, at the foot of the hills | level 9 |
| The Hollow's supermarket (Aisle Seven) | faction town | north-west, on the old ring road | level 11 |
| The Harvest Fair | wild place (autumn) | west of the Hollow, orchards | autumn |
| The Dusk Radio Mast | story place | top left, the highest hill | level 19, three proofs |
| Sunnyside (Lab 7, the Records Office, the plant) | faction town with three keeps | top right, end of the highway | level 16 |
| The weir | story spot (the cure goes into the river, K4) | bottom left | the cure |
Pins also show: herds moving on a road with the days left, calls for help, an ally's call, trips out.

### 10.11 Built so far
- **3D.302 (22 Nov): places remember** (step 1). `S.shMem[place]` keeps the dead killed, the doors, the things worked or carried out, the locked rooms' finds, and switches thrown; a visit that ends in a win, a retreat or a wipe all save it, and so does saving the game with a squad inside. Sealed places are built at their own level (Clinic 6, Prison 9, Lab 7 17, Records Office 18, Mast 19) whatever the town's level; the practice page still shows any size. A win marks the place **Secured**: the trip list says so and nobody can be sent in. The recruit on a win is now only the Clinic's and the Prison's. Not yet: the outpost a Secured place becomes (step 9), and a card line showing how much of a place is cleared (with the valley map).
- **3D.304 (22 Nov): story locks on rooms** (step 2). A sealed place can have an inner room the story has not opened yet. A shut room's door shows 🔐 and its reason; it cannot be forced, breached or blown; what is inside is left alone on that visit. If the main goal is behind it, the goal shows 🔐, and when everything else on the route is done the squad is told "nothing more here today" (a squad nobody is leading walks out by itself). The trip card has a new line, **Inside**: how many are put down, how many are left, and what is still shut and why. A room that was open on one visit stays open for good. Practice runs have no story locks. Check: `tools/qa/sh_story_check.js`.

  | Place | Shut room | Opens when | Why (the story) | Until then |
  |---|---|---|---|---|
  | Overrun Clinic | The Operating Theatre (the Butcher) | **Dr. Ines is found.** She is in the last locked ward before the theatre and opens her own door once the corridor is quiet and someone is near. She comes home with the squad (a Medic, level 4; if there is no bed she leaves her key and goes on to the river) | She bolted the theatre herself, with the Butcher in it, and knows the staff way in | The Clinic takes two visits: the first clears the wards and brings the doctor home, the second kills the Butcher and secures it. The recruit on the win is now Nurse Pat, Callum or Ada |
  | Blackgate Prison | The Control Room (the lever that opens every cell and the gate) | Quarantine Command is met and at 20 or better (or a Safe Zone), **or** the town holds proof 1 (taken from Checkpoint Bravo's command tent) | Command sealed the prison in the first week; their keys open it | The Prison can still be won the hard way: force the cells one by one and blow the Warden's gate with a bomb |
  | Helix Lab 7 | The Basement (the build-up tables) | Helix has been met (to become "after C18, Voss's plans" when the Features chat builds the story scenes) | Only Voss's plans show which wall panel hides the stair | The ring, the labs and Containment can be cleared; the tables wait |

  Not locked, on purpose: the Records Office (its files are shredded on a clock, so a visit that cannot reach them would only lose them) and the Mast (its trip lock already waits for the three proofs). The main story's scenes are not in the game yet, so the locks read what the game does know (who was found, how a faction feels, key items); each lock is one line in `SH_STORY` (`19b-stronghold-maps.js`) for the Features chat to point at a scene later. For the Balance chat: the Clinic's fight is now split over two visits (the squad heals in between), and the autoplay's first Clinic run ends in a walk-out, not a win.
