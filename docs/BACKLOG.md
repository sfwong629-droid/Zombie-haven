# Zombie Haven — feedback backlog

Requests from the owner, kept here so they are applied in the next graphics/feel rework.
Tick an item only after it has been implemented AND checked in the game.

## From playtest, 11 Oct 2026 (V2.31.0)

### Animation and movement
- [x] (V2.33) Character movement is not smooth. Make walking smooth at both normal (1x) and 2x speed
      (interpolate positions between sim ticks; animation frame timing in real time, not sim ticks).
      3x stays as a testing-only speed.
- [x] (V2.33) Attack animation must match the damage output: one swing / punch / shot per hit, timed to the
      moment damage lands. No looping attack animation while there is a gap between hits (idle/ready pose in between).
- [x] (V2.33) Rescue: a survivor carrying a knocked-down person must show them carrying the PERSON,
      not the carry-crate animation used for supplies.
      Decision: the rescuer pushes a hand cart; the game draws the real injured person lying in it (all 24 sheets).
- [ ] Eye pixels must be consistent across all characters (same eye size and shape everywhere;
      some currently have bigger eyes than others). Decision: fix each character when it is redrawn for another
      reason; every new prompt asks for eyes "exactly 1 big pixel wide and 2 tall, near-black" (works, see medics).

### Combat
- [x] (V2.33) Ranged weapons (guns, bows) need real range: attack from a distance instead of walking up to melee range.

### Zombie AI
- [x] (V2.33) Zombies may wander, but should slowly drift toward the town while wandering.
- [x] (V2.33) Zombies must not stand or walk on building footprints (tiles a building occupies): they currently overlap
      buildings and look like part of them. Keep them on free tiles (path around buildings; when attacking a
      building, stand at its edge), and draw them in the right depth order in front of/behind it.
- [x] (V2.33) Walls: zombies path AROUND walls and head for an opening (gate left open, gap, broken section) if one exists.
      Only when the town is fully closed do they attack the wall. As soon as any wall piece breaks, EVERY zombie
      (including ones busy hitting other wall pieces) switches target and rushes in through that breach.

### World look
- [x] (V2.33) Day / night lighting change (morning, day, evening, night tint).
- [x] Show wreckage (debris, wrecked cars, rubble, broken fences) in areas that are not unlocked yet. (V2.32)

### Menus / UI
- [x] (V2.33) Trader menu: show the item icon next to each item.
- [x] (V2.32) Build menu: small icon on each category tab, like Dungeon Village 2
      (see docs/ref/dv2_build_menu_tabs.png — fence icon for Equipment, shop icon for Stores, food icon for Food/Drink).
- [x] (V2.33) Brighten up the menus overall.
- [x] (V2.33) Demolish gets its own button (separate from the build menu / building panel).
- [x] (V2.33) Roads can be demolished too (with the same Demolish tool).

### Already known from V2.31.0
- [x] (V2.33.1) Map props (trees, rocks, crates, barrels, tyres, rubble, cars) at the new 96x48 scale; wrecked car scaled up.
- [x] Medic outfits drifted from the white coat (medic_m, medic_f): regenerated in V2.32.
- [x] (V2.33.2) Brute attack frames were rescaled and look slightly chunky: regenerated.

### Economy, rank and events (11 Oct 2026, later)
- [x] (V2.33) Stop the pop-up / log message for every normal zombie killed (keep messages for bosses, raids and notable events).
- [x] (V2.33) Raise the parts drop rate from zombies: there are not enough parts right now. Re-check with the balance sim.
- [x] (V2.33) Town star-up / "Upgrade Town" screen like Dungeon Village 2 (see docs/ref/dv2_upgrade_town.png):
      town name on a ribbon with its stars, then a "Rating Conditions" list for the next star; each row = icon,
      condition name, required value, current value, and a check / cross. Rows for us: Renown (like DV2's Popularity),
      daily supply flow in place of "Income" (water and ration production vs. the town's consumption),
      Events held, and a "Build X" requirement (e.g. Build a Clinic) shown as Pending / Done.
- [x] (V2.33) Town events like DV2's "Events Held": events the player can hold (cost supplies/parts, take time)
      that give Renown, mood and other bonuses, and count toward the star conditions.

