# Zombie Haven: decisions

Every decision the owner has made, by topic, newest last inside each topic. Merged on 16 Nov 2026 from the old docs (`claude/zombie-haven-decisions.md`, `-decisions-part2.md`, `-handoff.md`, kept in the Game Development project as archive). Build-by-build history is in the git log, not here.

Add new decisions at the end of their topic with the date. If a decision replaces an older one, strike the old one through, don't delete it.

## Direction and pacing
- 11 Nov: Not a game to finish in a few sittings: a quick, rewarding start, then levels take effort and a check-in a day.
- 11 Nov: Raiding is a side activity next to building.
- 11 Nov: Endgame order: weekly crises, seasonal strongholds, legacy start, the City (levels 16–20).
- 14 Nov: Being away is never punished: away time only credits production (no hunger, no raids).
- 15 Nov: Level timers count game hours (L2 6, L3 12, L4 48, L5 60, L6 72, L7 84, L8 96, L9 108, L10 120, L11–15 144, L16–20 168). Away time counts (10 real minutes = 1 game hour). Renown speeds them up: 25 renown per 12 game hours.
- 16 Nov: **Freeze.** No new features or balance changes until the reset (docs, the owner's bugs, code clean-up) is done. Use ChatGPT as much as possible. Full tester rounds only at milestones.

## Hard rules
- Must work fully offline.
- No Claude (or any AI service) for character AI.
- No chibi. No weapons on zombies.
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

## Town, walls, building
- 12 Nov: Walls are repaired by a worker (no self-healing). Buildings can't be placed on walls or fences.
- 12 Nov: Banner gates left as they are.
- 12 Nov: Newcomers walk in, wave, and are guests until welcomed.
- 11 Nov: Ignore "Gym XP that lasts" and "walls that don't use building land".
- 10 Nov: Map about 40×42, at least 8 open tiles round the biggest town; the north-east highway is a working route with wrecks.
- 15 Nov: Scrap → wood through the **Pallet Yard** building.
- 15 Nov: "Sealed" means the HQ and at least 3 in 4 buildings are inside the wall.
- 15 Nov: Add a Banner route that isn't a fight (built as the Founders' Festival).

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

## Open questions (not decided)
- When the land grows, should existing walls move out to the new line for free?
- What in the current direction feels wrong (see `01-VISION.md`, last section).
