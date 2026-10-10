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
