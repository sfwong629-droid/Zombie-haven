# The balance numbers, in one list (Balance chat, 21 Nov 2026)

Every number that moves a line of the scorecard (`docs/project/13-LONG-GAME.md`, section 9), where it lives today, and what it is now.
Change one at a time, with a check before and after (`tools/balance/check.sh`). Files are under `src/game/`; run `python3 tools/build/game.py` after an edit.

| Number | Where | Today | Scorecard lines it moves |
|---|---|---|---|
| The wait for each level | `14-missions-events.js`, `LV_HOURS` | game hours: 6, 12, 48, 60, 72, 84, 96, 108, 120, then 144 (levels 11 to 15), 168 (16 to 20) | Level 5 to 20, real day |
| What each level needs | `14-missions-events.js`, `LV_REQ` | people and buildings: 6/6 at level 1 up to 20/34 at level 12 and on | Level days; people and buildings by era |
| How fast the wait runs while away | `12-people.js`, `AWAY_MIN_PER_H` | 10 real minutes a game hour (open: 17 seconds) | Keen and open against daily |
| How much production time away pays | `12-people.js`, `AWAY_MAX_H` | 8 game hours at most | The short stock; level days (daily) |
| Renown off the wait | `14-missions-events.js`, `lvRush` | 25 renown for 12 game hours | Keen against daily; renown unspent |
| Storage limits | `11-town.js` `supplyCap`, `matCap`; `14-missions-events.js` `scrapCap` | grow with level and storage buildings | A stock at its limit; the short stock |
| What buildings make | `js/world.js`, `DEFS[...].out` | per building | The short stock; walk-outs |
| What a trip costs and brings | `16-loot-expeditions.js`, `EXP_DEFS` | per place | The short stock (water); medicine |
| How zombies grow | `10-enemies-walls.js`: `LVL_THREAT` (read through `hDay()`), `Z_ARRIVE` | by the town's level since 3D.253: one "day strength" per level, 1 at level 1 to 40 at level 20; a kind of zombie comes once that number reaches its `Z_ARRIVE` | Deaths; nights with nobody down; most standing |
| Ordinary night size | `10-enemies-walls.js`, the `desired` line in the spawner | from `hDay` and territory | Nights with nobody down |
| The big horde | `10-enemies-walls.js`, `MOB_LVL` (read through `bossMob()`), `BIG_HORDE`, `mobGap` | since 3D.261 its size is one number per level (16 at level 1, 48 at 5, 112 at 10, 230 at 15, 240 from 16); a third of the health, half the hit; 30/45/60 standing; the first group never above that; a boss that is not the level's boss night (crisis, faction, last stand) brings a third | Big horde size; most standing; deaths |
| How often a boss comes | `10-enemies-walls.js`, `bossGap()` | `bossGap()`: every 3 game days, every 5 from level 11 (3D.247) | Deaths; big hordes |
| How often raiders come | `10-enemies-walls.js`, `S.nextRaid` | from day 4, every 2 to 3.5 game days; `bossNear()` holds every raid back on a boss day and the day before (3D.245, 3D.252; the weekly crisis is not held) | Deaths in one night; town lost |
| The rescue that comes by itself | `03-stats-gear.js`, `AUTO_HELP_DAYS` in `helpTick()` | when nobody is left standing, at most once every 3 game days (3D.246, 3D.251) | Town lost; deaths in one night |
| When the boss walks in | `10-enemies-walls.js`, `BOSS_LAST` | on the level's boss night the horde comes at 21:00 and the boss when two thirds of it have arrived, or 2 game hours later at the latest (3D.269) | Big horde size; deaths |
| How hard raiders hit | `10-enemies-walls.js`, `RAIDER_HIT` | 5 + 0.2 x the weapon's attack | Deaths |
| Healing | `22-field-aid.js`: `MEND_PCT`, `TENT_PCT`, `TENT_STAYS`, `PATCH_CAP`, `FIELD_CAP`, `PATCH_CD`; `03-stats-gear.js` `facilityRules` (medic, clinic, hospital `benefit`) | since 3D.284 to 3D.287 (W130): with no zombie in town everyone mends 2% an hour; under 80% people walk to a medical building with room and stay until full (up to 12 rounds); with a zombie in town only those under 60% set out; a Medic's round patches to 75% (a field wound to 60%) for 1 cloth or 0.1 medicine, once every 3.6 game hours a person, only for those who cannot go | Nights with nobody down; deaths; cloth and medicine as the short stock |
| The rescue truck | `03-stats-gear.js`, `TRUCK` in `truckTick()` | since 3D.288, medics 3D.306 (W129): drives in at 0.05 tiles a tick, parks at least 240 ticks and until its two medics (`MEDIC`, 0.045 tiles a tick) have carried everyone in (at most 6,000), leads out at 0.022 tiles a tick and waits for the nearest follower beyond 3.5 tiles; every zombie in and near town follows it off the map | Town lost; deaths in one night; zombies standing after a lost night |
| Daytime roamers | `10-enemies-walls.js`, `ROAM`; how many by day is still the day line of `desired` in `monsterGeneration()` | since 3D.310 (the daytime threat, part 1): from day 2 and the first goal, the daytime zombies come as groups of 2 to 4 (`min`, `max`; a group waits until there is room for 2), roam 3 to 5 game hours (`hours`) between spots 4 to 9 tiles apart (`near`) up to 7 tiles outside the walls (`band`), warn the player when 9 tiles from someone outside (`warn`); chase only outside the town; never bash or march; at dusk they become ordinary night zombies |
| Weekly crisis | `17-endgame-trophies-crises.js`, `CRISIS_LVL`, `CRISIS_EVERY`, `CRISES`, `TIDE_CAP` | from level 15, every 7 game days, never with its fight on a boss night or the night before (3D.273); The Tide's waves walk in while fewer than 60 stand and grow with the level (3D.274) | Most standing; deaths at the top |
| Season length | `11-town.js`, `SEASON_DAYS` | 7 game days | The cure and seasonal strongholds (section 7) |
| Research | `11-town.js`, `RESEARCH` | 8 projects, 245 points | Research points unspent |
| Difficulty setting | `DF()` (count, z, raid) | multiplies the above | everything; the bot plays the default |

Not numbers, but they move the scorecard as much: what the bot can do (`tools/balance/ap.js`; `AP.long` for long runs). A thing the bot cannot use is not measured.
