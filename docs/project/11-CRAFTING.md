# Zombie Haven: crafting with parts (draft, 20 Nov 2026; waiting for the owner)

The owner, 20 Nov: crafting should feel like Last Day on Earth, with lots of small parts (wire, leather, branches and so on) that are turned into all the different items. The player should not have to be active in the crafting: they see the loot come in and fill the inventory, and the parts are used by themselves to make the items the player asked for.

This page is the study and the proposed system. Nothing is built. It sits on top of the research plan (`08-BALANCE.md`, section 13): research still decides **which** items can be made; this page decides **what they are made of** and **how they get made**. Numbers are first guesses, tuned later with the balance bot.

## 1. The study

**Last Day on Earth.** Dozens of raw materials: logs, stone, iron ore, plant fibre, leather, cloth, rubber parts, adhesive, nails, wiring, bolts and more. Most come from gathering and from looting places on the map. Raw materials are refined at stations with a timer: logs to planks, ore or scrap metal to iron bars in a furnace, bars to plates and plates to nails at a workbench. Every item has a recipe of three to five materials (a thick jacket is thick fabric, rope and leather; a spike trap is logs, rope and scrap metal). A Recycler breaks unwanted items back into materials. Good: the pile of little parts, the feeling that everything you pick up is worth something, clear recipes. Bad for us: the player does all the clicking, the refining chains need constant attention, and the inventory is a chore.

**Fallout Shelter.** Junk found in the wasteland, sorted by rarity (common to legendary), plus a recipe, makes weapons and outfits in a workshop room staffed by dwellers; crafting takes time, and better rooms make rarer items. Unwanted items can be scrapped for junk. Good: a staffed room does the work while you watch; rarity tiers. Bad: recipes are found by luck.

**Fallout 4.** Junk items (a desk fan, a clipboard) are made of base components (steel, springs, screws, adhesive and so on). The player never breaks them down by hand: put the junk in the workshop and the bench takes the components it needs when something is built. Good: **no hand crafting of parts at all**; the bench just uses what is there.

**RimWorld.** Each workbench has a list of orders ("bills"): make it a number of times, keep making until you have so many, or make forever. Colonists walk over and do the work on their own. Good: **the player says what they want once, and the town keeps it stocked.**

**What we take.** From Last Day on Earth, the many named little parts and recipes of three or four of them. From Fallout 4, parts are used automatically. From RimWorld and Fallout Shelter, orders at a staffed building that the survivors carry out on their own, visibly. We leave out the hand refining chains and the inventory juggling.

## 2. How it fits today's game
Today (3D.239): the town keeps eight supplies (food, water, wood, stone, scrap, cloth, medicine, fuel) plus ammo. Gear crafting costs scrap only (about 1.3 times the item's value), happens instantly, and needs the research for that recipe set and a Workshop. The Armory sells basic gear for scrap. Trips, raids and strongholds bring supplies and sometimes whole items; zombies drop scrap bags. The Inventory screen has two tabs, Gear and Supplies, and Supplies already says where each supply is found.

What changes: crafting costs **parts** (and some supplies) instead of only scrap; it takes **time** at the Workshop; and the player **orders** items instead of tapping "craft" and paying.

What stays: the eight supplies, ammo, bandages, the Armory (basic gear for scrap), whole items found as loot, the research plan, and every item a town already owns.

The rules it must keep (`01-VISION.md`): the player always knows why something is stuck; the town covers every basic need without raiding; some things can only be won outside; menus pause the game; one news pill at a time; the town looks alive.

## 3. The parts (15)
Each part has a rarity, which also says roughly when it starts to matter. The Inventory gets a third tab, **Parts**, beside Gear and Supplies, in the same style: an icon, the name, the rarity colour, how many, where it is found, and what it is used in.

| Part | Rarity | Mostly from |
|---|---|---|
| Branches | Common | Chopping trees; Lumber Yard trips |
| Nails | Common | Wrecks; Lumber Yard and Warehouse trips; the Workshop makes them from scrap when short |
| Rope | Common | Clothes bins; Abandoned Houses trips; the Workshop makes it from cloth when short |
| Leather | Common | Abandoned Houses and Shopping Mall trips (old sofas, jackets, car seats) |
| Duct Tape | Common | Abandoned Houses and Pharmacy trips; zombie bags |
| Wire | Uncommon | Wrecks; Gas Station and Warehouse trips; Lineman zombies |
| Springs | Uncommon | Wrecks; Warehouse trips |
| Pipes | Uncommon | Gas Station, Warehouse and Prison trips |
| Rubber | Uncommon | Wrecks (tyres); Gas Station trips; Hazmat zombies |
| Glue | Uncommon | Pharmacy, Clinic and Shopping Mall trips |
| Electronics | Uncommon | Shopping Mall and Clinic trips; the Radio Tower's salvage; Lineman zombies |
| Steel Plate | Rare | Prison and Military Checkpoint trips; raid camps; the Frozen Depot |
| Gun Parts | Rare | Military Checkpoint and Prison trips; raid camps; Soldier zombies; guns salvaged |
| Kevlar Fibre | Rare | Military Checkpoint; raid camps; Soldier zombies; the Burning Refinery |
| Tempered Steel | Rare, made | Only at the Forge (from 2 Steel Plate and 1 fuel), by itself when an order needs it |

Common parts can always be made in town in a pinch (nails from scrap, rope from cloth, branches from trees), so a builder who never leaves is never stuck on era 1 gear. Uncommon parts come mostly from trips and wrecks. Rare parts come from dangerous trips, raids, strongholds and special zombies: this is where "some things can only be won outside" lives.

## 4. Where loot comes from, and how it is seen
Every source the game already has gets parts added, so loot keeps arriving all day and the shelf visibly fills:
- **Gatherers in town.** Woodcutters bring Branches with the wood. Scavengers stripping wrecks bring Wire, Springs, Rubber or Nails with the scrap. Clothes bins give Rope as well as cloth. Each one shows the small floating "+1 🧵 Rope" the game already uses.
- **Zombie bags.** The bags zombies drop sometimes hold a common part. Special zombies drop their own part (Lineman: Wire or Electronics; Hazmat: Rubber; Soldier: Gun Parts or Kevlar Fibre; Bile Spewer: Glue).
- **Trips.** Each destination gets two to four parts of its own (section 3), shown on the trip card before sending ("Likely: Wire, Pipes, Rubber"), so the player can send a squad for the part they are short of.
- **Raids and strongholds.** Their loot rooms hold rare parts, a fixed amount on a win.
- **Traders.** They sell a few parts each visit; the Trading Post and Market Square widen the choice.
- **Salvage.** An item the town does not need can be salvaged at the Workshop for about half its parts back.

The loot reveal cards after a trip already flip in one by one, rarest last; parts join them with their rarity colour. A news pill names a part the first time it is ever found ("New part: Springs. Used in guns and watches.").

## 5. How crafting works for the player
**Order it once.** In the Workshop (or from an item's card in the Inventory, or from a survivor's empty gear slot) the player taps an item and **Order**. Two kinds of order:
- **Make 1** (or a few): made once, then the order is done.
- **Keep in stock**: the Workshop keeps that many spare in the stash; when a survivor takes one, another is made.

**The town does the rest.** A worker at the Workshop takes the next order whose parts are all on the shelf, walks to the store, carries the parts to the bench and works on it (hammering, sparks). When it is done the item goes to the stash with a small card and a sound, and a survivor who has nothing better in that slot takes it on their own the next time they visit the Armory, as they already do today with stash gear. An Engineer works fastest; with nobody assigned, orders wait and the Workshop says why ("No one working here").

**Time.** Era 1 items take about 2 game hours, era 2 about 6, era 3 about 12, City items about a game day. A bigger Workshop works on two orders at once.

**Never stuck without knowing why.** An order whose parts are not all there waits at the bottom of the list, and says exactly what is missing and where to get it: "Hunting Rifle: waiting for 2 Pipes. Found at: Gas Station, Warehouse and Prison trips." with a **Go** button to the trip screen. When loot brings the last missing part, the order starts on its own and one news pill says so ("Pipes found: the Hunting Rifle is under way"). Parts are never taken for an order that cannot be finished, so nothing is locked up half-made.

**Priority.** Orders are made top to bottom; the player can drag one to the top. Parts go to the order at the top first.

## 6. The recipes
One recipe per craftable item (the 47 items of the research plan; the Armory's other items stay scrap-bought). The research project that opens each recipe is the one in `08-BALANCE.md`, section 13.

**Era 1 (open from the start)**
| Item | Parts |
|---|---|
| Machete | 2 scrap, 1 Leather, 1 Duct Tape |
| Nail Bat | 2 wood, 4 Nails, 1 Duct Tape |
| Biker Leathers | 3 Leather, 1 Rope, 1 cloth |
| Football Pads | 2 Leather, 2 Duct Tape, 2 cloth |
| Cookware Cuirass | 4 scrap, 2 Rope, 1 Leather |
| Football Helmet | 2 scrap, 1 Leather, 1 Duct Tape |
| Knee Pads | 1 Leather, 1 Duct Tape |
| Lifting Gloves | 1 Leather, 1 cloth |
| Back Brace | 1 Leather, 1 Rope |
| Running Shoes | 1 Leather, 1 cloth, 1 Duct Tape |
| Reading Glasses | 1 scrap, 1 Duct Tape |
| Lucky Charm | 1 Rope, 1 Branches |
| School Backpack | 2 cloth, 1 Rope |
| Tool Belt | 2 Leather, 2 Nails |

**Era 2 (after the first Banner)**
| Item | Parts |
|---|---|
| Scrap Spear | 1 Pipes, 2 scrap, 1 Duct Tape |
| Shovel | 2 wood, 2 scrap, 3 Nails |
| Fire Axe | 2 wood, 3 scrap, 3 Nails, 1 Glue |
| Road Sign | 1 Pipes, 3 scrap, 2 Nails |
| Pistol | 2 Springs, 1 Pipes, 2 scrap, 2 Nails |
| Revolver | 3 Springs, 1 Pipes, 3 scrap, 2 Nails |
| Hunting Rifle | 2 Springs, 2 Pipes, 3 wood, 2 Nails |
| Crossbow | 2 wood, 2 Wire, 2 Springs, 1 Rope |
| Riot Vest | 2 Rubber, 3 cloth, 2 Duct Tape, 1 scrap |
| Firefighter Coat | 3 cloth, 2 Rubber, 1 Glue |
| Hazmat Suit | 3 Rubber, 2 Glue, 1 Duct Tape |
| Ghillie Suit | 4 Rope, 3 Branches, 2 cloth |
| Gas Mask | 2 Rubber, 1 Glue, 1 scrap |
| Army Helmet | 3 scrap, 1 Leather, 2 Nails |
| Riot Helmet | 2 Rubber, 2 scrap, 2 Nails |
| Scope Goggles | 1 Rubber, 1 Glue, 1 Electronics |
| Walkie-Talkie | 2 Electronics, 1 Wire, 1 scrap |
| Wristwatch | 1 Springs, 1 Leather, 1 Electronics |
| Medic Pouch | 2 cloth, 1 Leather, 1 medicine |
| Hiking Backpack | 3 cloth, 2 Rope, 2 Leather |

**Era 3 (after the second Banner; Forge marked)**
| Item | Parts |
|---|---|
| Sledgehammer (Forge) | 2 wood, 2 Steel Plate, 2 Nails |
| Spiked Club (Forge) | 3 wood, 6 Nails, 1 Steel Plate, 1 Glue |
| Shotgun (Forge) | 2 Gun Parts, 2 Pipes, 2 wood, 2 Springs |
| Magnum (Forge) | 2 Gun Parts, 1 Steel Plate, 2 Springs |
| Kevlar Vest (Forge) | 3 Kevlar Fibre, 2 cloth, 1 Glue |
| Scrap Plate (Forge) | 3 Steel Plate, 2 Leather, 2 Rope |
| Tactical Vest (Forge) | 2 Kevlar Fibre, 3 cloth, 2 Duct Tape |
| SWAT Helmet (Forge) | 2 Steel Plate, 1 Kevlar Fibre, 1 Rubber, 1 Glue |
| Dog Tags | 1 Steel Plate, 1 Wire |

**The City (from level 16; Forge)**
| Item | Parts |
|---|---|
| Katana | 2 Tempered Steel, 1 Leather, 1 Glue |
| SMG | 3 Gun Parts, 2 Springs, 1 Tempered Steel, 1 Electronics |
| Military Armor | 2 Tempered Steel, 3 Kevlar Fibre, 2 cloth |
| SWAT Armor | 3 Tempered Steel, 3 Kevlar Fibre, 1 Rubber, 1 Electronics |

Every one of the 15 parts is used in at least two recipes, so nothing found is dead weight.

## 7. Balance targets this must meet
From `08-BALANCE.md`:
- **Always short of one thing.** In each era one part should be the one the town is usually waiting for: Leather in era 1, Springs or Pipes in era 2, Kevlar Fibre or Gun Parts in era 3. The rest should be on the shelf most of the time.
- **The town covers basic needs.** Era 1 gear can always be finished without leaving town, slowly (section 3).
- **Something new every level.** A level that opens no new building should still open a new recipe or a new trip with a new part.
- **Away time only adds.** Gatherers keep bringing parts while the player is away, up to the storage cap; orders keep being made.
- **A check-in of 5 to 10 minutes.** Placing orders should take seconds: the usual check-in is "collect, see what was made, order the next thing".

## 8. Building it (Features chat, one change per build, each with a scripted check)
1. **Parts exist.** The 15 parts, the Parts tab, parts in every loot source (gathering, bags, trips, raids, strongholds, traders). Nothing uses them yet, so nothing can break; the player sees the shelf fill.
2. **Orders.** The Workshop's order list with Make and Keep in stock, the worker carrying parts and working, waiting reasons with Go buttons. Recipes switch from scrap to parts. Old towns get a starter shelf of common parts so no order they could make before is suddenly impossible.
3. **The research split by era** (approved, `08-BALANCE.md`, section 13), if not built before.
4. **The Forge and Tempered Steel**, when the Forge is built (building plan).
5. **Salvage** at the Workshop.
6. **Part icons**: 15 sticker icons in the game's style (Art chat), with stand-ins until then.

Then the balance bot runs three towns to check the "short of one thing" target and that era 1 gear is always reachable.

## 9. Open questions for the owner
1. ~~**How many parts?**~~ Owner, 20 Nov: **15 is fine.** This draft has 15. Fewer (about 8) is simpler to read; more (25 or so, closer to Last Day on Earth) gives more variety but a longer shelf and more icons. Claude's recommendation: 15.
2. ~~**The orders.**~~ Owner, 20 Nov: **no Outfit fighters order**; only Make and Keep in stock. Make and Keep in stock (recommended). Should there also be an **Outfit fighters** order that keeps every fighter in the best gear the town can make, with no other input?
3. ~~**Junk.**~~ Owner, 20 Nov: **not for now.** Fallout-style funny junk (a toaster, a car battery) that the Workshop breaks into parts by itself: more flavour and jokes, more items to draw. Claude's recommendation: not now; maybe later as rare finds.
4. **Parts beyond gear.** Should the new buildings (Watchtower, Forge and so on) and tool upgrades also cost parts? Claude's recommendation: the seven new buildings and the tools yes, today's buildings no (that would change the whole economy at once).
5. **Salvage.** A Salvage button giving back half the parts (recommended), or none?
