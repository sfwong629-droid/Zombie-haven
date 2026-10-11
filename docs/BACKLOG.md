# Zombie Haven — feedback backlog

Requests from the owner, kept here so they are applied in the next graphics/feel rework.
Tick an item only after it has been implemented AND checked in the game.

## From playtest, 11 Oct 2026 (V2.31.0)

### Animation and movement
- [ ] Character movement is not smooth. Make walking smooth at both normal (1x) and 2x speed
      (interpolate positions between sim ticks; animation frame timing in real time, not sim ticks).
      3x stays as a testing-only speed.
- [ ] Attack animation must match the damage output: one swing / punch / shot per hit, timed to the
      moment damage lands. No looping attack animation while there is a gap between hits (idle/ready pose in between).
- [ ] Rescue: a survivor carrying a knocked-down person must show them carrying the PERSON
      (body over the shoulder / in arms), not the carry-crate animation used for supplies.
- [ ] Eye pixels must be consistent across all characters (same eye size and shape everywhere;
      some currently have bigger eyes than others).

### Combat
- [ ] Ranged weapons (guns, bows) need real range: attack from a distance instead of walking up to melee range.

### Zombie AI
- [ ] Zombies may wander, but should slowly drift toward the town while wandering.
- [ ] Zombies must not stand or walk on building footprints (tiles a building occupies): they currently overlap
      buildings and look like part of them. Keep them on free tiles (path around buildings; when attacking a
      building, stand at its edge), and draw them in the right depth order in front of/behind it.
- [ ] Walls: zombies path AROUND walls and head for an opening (gate left open, gap, broken section) if one exists.
      Only when the town is fully closed do they attack the wall. As soon as any wall piece breaks, EVERY zombie
      (including ones busy hitting other wall pieces) switches target and rushes in through that breach.

### World look
- [ ] Day / night lighting change (morning, day, evening, night tint).
- [ ] Show wreckage (debris, wrecked cars, rubble, broken fences) in areas that are not unlocked yet.

### Menus / UI
- [ ] Trader menu: show the item icon next to each item.
- [ ] Build menu: small icon on each category tab, like Dungeon Village 2
      (see docs/ref/dv2_build_menu_tabs.png — fence icon for Equipment, shop icon for Stores, food icon for Food/Drink).
- [ ] Brighten up the menus overall.
- [ ] Demolish gets its own button (separate from the build menu / building panel).
- [ ] Roads can be demolished too (with the same Demolish tool).

### Already known from V2.31.0
- [ ] Map props (trees, rocks, crates, barrels, tyres, rubble, cars) at the new 96x48 scale (waiting on the ChatGPT image limit).
- [ ] Medic outfits drifted from the white coat (medic_m, medic_f): regenerate.
- [ ] Brute attack frames were rescaled and look slightly chunky: regenerate.
