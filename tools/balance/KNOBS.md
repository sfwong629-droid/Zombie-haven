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
| How zombies grow | `10-enemies-walls.js`: `hDay`, `HORDE_SLOW`, `HORDE_DAY_CAP`, `hordeCap`, `Z_ARRIVE` | by game day, slower after day 10, a limit by rank that keeps rising after day 60 | Deaths; nights with nobody down; most standing |
| Ordinary night size | `10-enemies-walls.js`, the `desired` line in the spawner | from `hDay` and territory | Nights with nobody down |
| The big horde | `10-enemies-walls.js`, `BIG_HORDE` and `bossMob` | 4 times the old mob, a third of the health, half the hit; 30/45/60 standing | Big horde size; most standing; deaths |
| How often a boss comes | `10-enemies-walls.js`, `bossGap()` | `bossGap()`: every 3 game days, every 5 from level 11 (3D.247) | Deaths; big hordes |
| How often raiders come | `10-enemies-walls.js`, `S.nextRaid` | from day 4, every 2 to 3.5 game days; `bossNear()` holds every raid back on a boss day and the day before (3D.245, 3D.252; the weekly crisis is not held) | Deaths in one night; town lost |
| The rescue that comes by itself | `03-stats-gear.js`, `AUTO_HELP_DAYS` in `helpTick()` | when nobody is left standing, at most once every 3 game days (3D.246, 3D.251) | Town lost; deaths in one night |
| How hard raiders hit | `10-enemies-walls.js`, `RAIDER_HIT` | 5 + 0.2 x the weapon's attack | Deaths |
| Weekly crisis | `17-endgame-trophies-crises.js`, `CRISIS_LVL`, `CRISIS_EVERY`, `CRISES` | from level 15, every 7 game days; The Tide grows with the game day | Most standing; deaths at the top |
| Season length | `11-town.js`, `SEASON_DAYS` | 7 game days | The cure and seasonal strongholds (section 7) |
| Research | `11-town.js`, `RESEARCH` | 8 projects, 245 points | Research points unspent |
| Difficulty setting | `DF()` (count, z, raid) | multiplies the above | everything; the bot plays the default |

Not numbers, but they move the scorecard as much: what the bot can do (`tools/balance/ap.js`; `AP.long` for long runs). A thing the bot cannot use is not measured.
