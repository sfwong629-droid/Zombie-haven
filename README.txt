Zombie Haven V1.1.2
Critical fixes:
1. Fixed fatal JavaScript parse error caused by a multiline Guide string.
2. Added the missing FX overlay and resident-request container to the actual page markup.
3. Fixed the residency request code path that V1.1 had failed to replace.
4. Added construction/Renown feedback to the actual confirm-build code path.
5. Retains the COLS/ROWS pathfinding correction from V1.1.1.
6. JavaScript was validated with `node --check` before packaging.
