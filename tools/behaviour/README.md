# Behaviour study

Runs the game headless with a mid-sized town and 10 survivors, records what everyone is doing every 0.5 s of game time,
and reports time shares by job and hour, quick back-and-forth flips, stuck walkers, starving-while-idle, chats and bonds.

    python3 tools/behaviour/study.py calm 4 '{"noZ":true,"keepFed":true,"seed":7}'   # 4 calm days
    python3 tools/behaviour/study.py war 4 '{"keepFed":true,"seed":11}'              # 4 days with normal zombie events
    python3 tools/behaviour/show.py tools/behaviour/out_calm.json

Options: noZ (no zombies), keepFed (food/water topped up), seed, build (buildings to place), jobs (recruits).
ZROOT=<folder> runs another copy of the game (for before/after comparisons).
