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

## Step 4 (V3D.26): tools, generator, radio, rebalance
The bot now saves wood as well as scrap for the next item, researches only from spare scrap, crafts steel tools after
the Lodge, and walls up after the Lodge. With scrap at the old prices every run stalled before the Lodge (20+ wood,
0-8 scrap), so Camp and Timber buildings now cost 40% less scrap. 5 seeds x 14 days after that: the Lodge on day 2-3 in
4 of 5 runs, rank 3 in 3, 12-19 buildings. Walls from day 2 cost the bot its Lodge in most runs without fewer deaths.
The bot still loses many people; read build pacing from it, not survival.

## Food and water (3D.49)
`python3 tools/balance/foodwater.py '{"b":{"farm":1,"barrel":2}}' 5 'ZH.TUNE.eat=1.5'` places those buildings next to a fresh
camp, keeps zombies away, auto-staffs, collects the trays every 2 hours (like a player) and prints each day's food / water
income and spending by source. At `TUNE.eat` 1 a person used ~0.6 food and 0.6 water a day, so one staffed Garden Plot
(about 4-5 food a day) fed 7-8 people and stock piled up. 3D.49 sets `TUNE.eat` 1.5 (~0.95 a day each): a Garden Plot feeds
about 4-5, a Rain Barrel (about 3 water a day) about 2, and every farm drinks 2 water a day for irrigation.

## 3D.169 check (15 Nov 2026)
- `ap.js` builds a Pallet Yard after the Quarry. `sh_probe.js` strategy suffix `!` (e.g. `all!`) = a stubborn player who stays until the list is done or everyone is down.
- Trips, same 4-person squad (level 4), 2000 trips each, squad decides the cards: someone lost on Houses/low 4.5% → 5.4% (noise), Lumber Yard/medium 18% → 10%, Quarry/high 37% → 25%, Warehouse/high 36% → 24%; hurt and loot unchanged.
- Bot towns, 6 seeds × 15 days: too noisy to compare wood per day (the opening is unseeded and the bot only sends trips with food and water above 12). Bot towns keep only 19–48 scrap, so a Pallet Yard there mostly waits at its floor; tester towns had 72–480.
- Toll Kings camp: the Collector dies inside 60 s in every probe (before the first patrol at 70 s), so since 3D.169 no patrols come at all. Level 6 × 4 stubborn: 50% wipe from the starting guards alone; retreating at half strength: no wipes. Level 9 × 8: 80 loot, 0–0.3 downs. Patrol counts left as they are.

## Long runs (21 Nov 2026, Balance chat)
```
python3 tools/balance/long_study.py SEED MAX_DAYS BUDGET_SECONDS OUT_DIR    # one town; a line of JSON per game day, a backup every 10 days
python3 tools/balance/long_summary.py OUT_DIR                               # the tables
python3 tools/balance/load_probe.py BACKUP.json 'JS arrow function'         # open a backup headless and ask it something
node tools/qa/old_town_shots.js BACKUP.json OUT_DIR                         # phone screenshots of every main menu in that town
```
About 5 to 30 seconds a game day, so 250 days take about 100 minutes; two towns at once on two cores.
`long_study.py` sets `AP.long` (off everywhere else, so older numbers stay comparable): the bot places upgrades that need more ground
(the old bot could not place the Clinic, and its whole plan waited behind it: no old-bot town ever built the Fort), skips what it cannot
build yet, sends trips only from a pantry 40% full, goes to the Pharmacy when medicine is under 8, and keeps a roster (one in three a Guard,
a Farmer per three farms and water buildings, a Medic, a Cook, an Engineer). `AP_LONG=0` runs the old bot. Report: `docs/project/12-LONG-RUN.md`.
