# src/game: the game code by area

`js/game.js` is the file the game loads and the file that gets published. It is kept here as 27 area files so that a change
only needs the area it touches. The area files are plain cuts of `game.js`: joined in order, with nothing added, they are
exactly `game.js`.

## Working with it
- Edit an area file, then join: `python3 tools/build/game.py`
- If you edited `js/game.js` directly instead, cut it back: `python3 tools/build/game.py --split`
- Check they match: `python3 tools/build/game.py --check` (the test suite runs this as the `parts` test)
- Commit the area files and `js/game.js` together.

## What this is not, yet
The areas still share one scope: `game.js` is a single function, and every area can see every other area's variables.
So the order in `parts.json` matters, and an area cannot be loaded on its own. The headings inside the files are the old
section comments, and some areas hold more than their name says. Separating the areas for real is the next step of bug C3.

To move a cut or add an area: edit `parts.json` (`starts` is the exact first line of the area, which must appear once in
`game.js`) and run `--split`.

## The areas
| File | What is in it | Size |
|---|---|---|
| `01-core.js` | File head, version and save keys, assets, state, camera, ground and roads | 11 KB |
| `02-draw.js` | The old sprite code and the main draw | 70 KB |
| `03-stats-gear.js` | Tuning numbers, survivor stats, items and equipment | 52 KB |
| `04-helpers.js` | Small shared helpers | 18 KB |
| `05-alerts.js` | News levels, alerts and the Needs you list | 23 KB |
| `06-movement-survivors.js` | Path following and the survivor basics | 13 KB |
| `07-gathering-tools-power.js` | Gathering wood, stone and scrap; tools; generators | 22 KB |
| `08-construction.js` | Building sites, hauling and upgrades | 32 KB |
| `09-posts-survivor-ai.js` | Guard posts and the survivors' minute-to-minute behaviour | 72 KB |
| `10-enemies-walls.js` | Zombies, difficulty and endings, raiders, bosses, wall breaking and repair | 60 KB |
| `11-town.js` | Supplies, upkeep, neighbour bonuses, research and crafting, economy, weekly review, incidents, pets, trader | 53 KB |
| `12-people.js` | Bonds, couples and children, skill study, time away, daily and weekly goals | 42 KB |
| `13-goals-advisor.js` | Guide goals, objectives, resource panel, town advisor | 41 KB |
| `14-missions-events.js` | Missions and story events | 90 KB |
| `15-save.js` | Save, load and old-save conversion | 19 KB |
| `16-loot-expeditions.js` | Loot, the Stash, trips and trip situations | 63 KB |
| `17-endgame-trophies-crises.js` | The City stage, legacy start, trophies, weekly crises | 17 KB |
| `18-vehicles.js` | Hand Cart and vehicles | 8 KB |
| `19-strongholds.js` | Stronghold runs (their own map) | 78 KB |
| `20-raid-camps.js` | Raids on faction camps | 30 KB |
| `21-expedition-ui.js` | The trip bar and Explore screens | 13 KB |
| `22-field-aid.js` | Medic field aid | 13 KB |
| `23-build-traps.js` | Build, move, demolish; traps | 34 KB |
| `24-panels.js` | The menus and panels | 57 KB |
| `25-field-notes.js` | Field Notes (first-time notes) and the opening cutscene | 51 KB |
| `26-input-loop-init.js` | Taps and buttons, the main loop, start-up, the test hooks | 23 KB |
| `27-test-pages-title-backups.js` | Test pages, title screen and save slots, backups | 35 KB |
