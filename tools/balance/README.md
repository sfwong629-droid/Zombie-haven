# Balance simulator

Plays the real game headless with an "auto-player" (`ap.js`) that makes a sensible player's
choices every game hour: builds by priority (economy first), walls the town north side first,
researches, expands when the land is full, keeps 2 fighters, bandages the downed, accepts
move-ins, sends expeditions (the clock is tied to game time at 1× speed) and uses the trader.

```
python3 -m http.server 8765            # from the repo root, in another terminal
python3 tools/balance/run.py SEED DAYS out.jsonl [exp|noexp] [walls|nowalls]
python3 tools/balance/summ.py 'out*.jsonl'
```
`run.py` writes one JSON line per game day (supplies, rank, territory, deaths, walls, incidents,
levels, grade…) and a final line with a parts ledger, every knockdown (what the survivor was doing,
what hit them) and every death. Needs Python Playwright with Chromium.
Note: the opening isn't seeded (the game starts before the seed is set), so runs vary; use several seeds.

## Newcomer rate (V3D.21)
`ZH_OPT='&3d=1'` runs the cozy 3D rules (the gate popup). `ZH_EVAL='ZH.ARRIVE.low=12000;ZH.ARRIVE.high=24000'`
runs extra JS after load (here: the gap between newcomers, in ticks; 1000 ticks = 1 game hour). Each day's line has
`cap` (room) and `joins` by source (`gate`, `event`, `trip`, `grown`; `other` = the starting crew).
5 seeds x 14 days, 3D: gate arrivals in 14 days: 1.1 h/2.2 h (old) 42, 6 h/12 h 24, 12 h/24 h 14, 18 h/36 h 6.
The auto-player loses many people (it no longer keeps up with the 3D economy), so trust the arrival counts more
than the deaths; with movement at 100% instead of 60% (MOVE_K) it lost 21 instead of 34 in 14 days.
Work speed (V3D.21, `ZH.TUNE.move` / `ZH.TUNE.work`), deaths in 14 days, 5 seeds, new arrival rate: move 1 / work 1: 14.3,
move .6 / work 1: 14.5, move .6 / work 1.4: 11.0, move .6 / work 1.7: 14.0. Runs that lose everyone end early, so
this is noisy; work 1.4 was kept.

## Resources step 2 (V3D.23)
Buildings are construction jobs (sites and in-place upgrades) that need wood / stone / scrap delivered; the auto-player
places tier-1 sites and upgrades families (`get(t)`), keeps 6+ wood back from walls, and caps emergency Rain Barrels /
Garden Plots. 5 seeds x 10 days: the Lodge on day 2-3 when the town survives, 13-15 buildings, scrap becomes the tight
resource (upkeep is paid in scrap). Deaths are as noisy as before (most runs lose people on days 4-6).
