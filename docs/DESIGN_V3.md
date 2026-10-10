# Zombie Haven — V3 systems design (survivor stats, gear, buildings, research, review, events)

Goal: survivors grow as people (DV2) and the town is managed by **many specialised buildings laid
out on the land** (DV2 + Fallout Shelter), not by one building upgraded forever.

## 1. Survivor stats (DV2 + Fallout SPECIAL, 6 stats, 1–20 base)
| Stat | Short | What it does |
|---|---|---|
| Strength | STR | melee damage, carry/rescue speed, **food** production (Garden/Farm) |
| Endurance | END | max HP, damage reduction, hunger/thirst rise slower |
| Agility | AGI | walk speed, attack speed |
| Perception | PER | ranged damage, spotting raiders, scavenging finds, **water** production |
| Intelligence | INT | XP gain, medical treatment, research, Workshop crafting |
| Charisma | CHA | satisfaction (move-in), Canteen meals, trader prices |

- Survivors arrive with 2–6 in each stat, shaped by their profession.
- **Level-ups grow stats** (DV2): each profession raises its two main stats on level-up, permanently.
- **Training buildings** raise one stat each (like DV2 shops/Fallout training rooms): survivors
  visit them on their own when their basic needs are met. Base stats cap at 20.
- **Gear** adds on top (can push past 20). The survivor panel shows base + bonuses.
- Every working building uses one stat: staff with a high stat produce more.

## 2. Equipment (DV2 slots)
Three slots per survivor: **Weapon, Armor, Accessory**. Items live in the town **stash**.
- Weapons: melee (STR) or ranged (PER, attack from ~2.4 tiles).
- Armor: damage reduction, some cost Agility.
- Accessories: stat boosts.
- Sources: Armory (survivors buy basic gear with parts), Workshop crafting (research unlocks
  recipes), expedition loot, the wandering trader.
- Tap a survivor → Equipment → pick from the stash for each slot.

## 3. Buildings: duplicates, not upgrades
- **No more in-place upgrades.** Well, Farm, Clinic and Hospital become their own buildings with
  their own footprints, unlocked by research; build as many of anything as the land allows.
- **Upkeep:** every building costs a little per day (mostly parts; kitchens/medical also food,
  water or medicine). Unpaid upkeep → that building runs at half output until paid.
- **Parts income** to pay for it: Scrapyard (new, staffed), kills, scavenging, expeditions, raids.
- **Neighbour bonuses (combos):** e.g. Canteen next to a Garden/Farm, Medical next to a House,
  Gym next to a Sparring Ring, two of the same production building side by side ("district").

## 4. Workshop research + crafting
- A staffed Workshop makes **research points** (INT-based) every hour.
- Research tree spends points + parts to unlock: buildings (Well, Farm, Clinic, Hospital, training
  buildings, Scrapyard upgrades), gear recipes, and town perks (wall HP, storage cap, etc.).
- Crafting at the Workshop: parts → gear from unlocked recipes.

## 5. Job levels to 10 (DV2)
Level cap 10 per profession; XP needed rises steeply after Lv.5. Skills at Lv.3 and Lv.5 as now,
plus a big **Lv.10 mastery skill** per profession.

## 6. Weekly Haven Review (DV2 town evaluation)
Every 7 days: graded on Population, Defense (kills, losses), Supplies, Buildings variety,
Satisfaction and Research → grade S/A/B/C/D with Renown, parts, an item, and a title.

## 7. Events
- **Incidents:** fire in a building (spreads if not put out; nearby survivors fight it) and a
  zombie breaking into a building (survivors inside must fight it).
- **Rush:** tap a production building → produce a few hours' worth now, with a chance of an
  incident (lower with a high-stat staff member).
- **Pets:** a dog or cat attached to a survivor (find supplies, bark at raiders, comfort).
- **Wandering trader:** visits now and then; tap to trade supplies for gear, pets or research.

## Delivery
- Phase A: stats, equipment, training buildings.
- Phase B: duplicates instead of upgrades, upkeep, Scrapyard, neighbour bonuses.
- Phase C: research, crafting, Lv.10, weekly review.
- Phase D: incidents, rush, pets, trader.

New buildings use existing old-style art as placeholders until pixel art is made.
