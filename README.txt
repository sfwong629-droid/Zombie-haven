Zombie Haven V1.1.1 HOTFIX
Fixes a V1.1 runtime crash in tile pathfinding:
- walkable() incorrectly referenced GW/GH, which do not exist.
- corrected to COLS/ROWS.
That exception happened during the first survivor AI frame, before draw(), producing a blank world while the HTML HUD remained visible.
Also adds a visible V1.1.1 HOTFIX build stamp and cache-control hints.
