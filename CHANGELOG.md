# Changelog

## V2.40.0 — Title screen and save slots
- New start flow, inspired by Dungeon Village 2 with an original look.
- **Title screen:** a ZOMBIE HAVEN logo over the town map drifting slowly behind it, with **Start**, **Continue** (opens your most recent save: town name and day) and the version.
- **Save Slots:** three slots. Each shows town name, day, stars, survivors, parts and when it was saved.
  - Tap a saved slot to load it.
  - Tap an empty slot to name a new haven and start.
  - 🗑 deletes a slot; it takes two taps ("Delete?").
  - Back returns to the title.
- **Your existing town is kept as Slot 1.** Older saves (V25 and earlier) still load into Slot 1.
- Town → More: "New game…" (which erased the town after a browser confirm box) is replaced by **🏠 Title screen (saves first)**.
- **Bug prevented:** leaving the title page would have saved its background town over Slot 1. The title screen now never saves, and a test checks that the other saves are untouched.
- Tests and the balance tool open the game directly (they skip the title).
- **Tests:** new `title` group (8 checks: HUD hidden on the title, Continue shows the latest save, an existing save appears in slot 1, new game in a chosen slot with its name, other slots untouched, two-tap delete, loading a slot). All 24 groups pass.

## V2.39.0 — Phase 6: closing the master-prompt gaps
**Town Advisor** (master prompt §9)
- One line under the objective naming the most urgent strategic issue, worked out from the real simulation:
  - food or water running out within 3 days, or storage full and wasting production
  - not enough parts for tonight's upkeep
  - a production building with no worker (and who could take it)
  - the town ready to upgrade, or a town event the next star needs
  - gaps in the wall ring, survivors sleeping rough, research ready to start
- Tap it to open the right screen; ✕ hides that tip for the rest of the game day.
- Emergencies stay in the red alerts. During the opening guide goals only serious issues are shown.
- Setting: Event log → Town advisor ON/OFF. The left menu and the alerts move down to sit under the panel, whatever its height.

**Rank unlocks** (§10)
- Upgrade Town lists what the next star unlocks: buildings (with the research they still need), walls, events, the threat increase and the parts bonus.
- The rank-up pop-up lists the same.

**Touch controls** (§12)
- After a pinch-zoom, the finger left on the screen keeps panning; it used to do nothing until lifted.
- A second finger always cancels a tap.

**Tests** (§17): new `input` group (14 checks):
- drag pans without placing, pinch zooms, pan continues after a pinch, a pinch never taps, a quick tap places
- roads stay in the build zone, buildings can't sit on roads, paths follow roads
- staffing: highest-level match first, swap on profession change, released on death and refilled, released when burnt down
- the advisor names the most urgent issue, and hiding a tip mutes it for the day

Verified the pan-after-pinch check fails on V2.38. All 23 groups pass.
**Not tested:** real touch hardware or Safari (the gestures are simulated pointer events in Chromium).

## V2.38.0 — Phase 5: polish and pacing
**Progression**
- Measured: rank 5 was never reached in 30 days. Renown passed 900 by about day 17, but the Hospital it requires needs Field Surgery → Trauma Care research, and nothing on screen said so.
- The Upgrade Town "Build X" row now says what stands in the way, e.g. "Needs research Field Surgery (25 RP) → Trauma Care (50 RP), ⚙ 44 parts".
- New town event **Trade Caravan** (rank 3): 12 food + 10 water → 10 parts. A late-game use for a full pantry that pays in the scarce resource. Event cards now show what an event gives back.
- Auto-player: researches toward the next star's building and trades a full pantry. All 4 seeds now reach rank 5 on days 18–21 (none did before). Deaths: 5.5 per 30 days (3.5 in V2.37, within seed noise).

**Night atmosphere**
- Warm window light on occupied or staffed buildings, a small lantern glow around survivors outdoors, and red eye-glints on zombies so they read in the dark. The lights fade in with the night tint.
- Kept cheap after measuring: small light pools with normal blending. A quarter-resolution light layer was tried and was 4× slower, so it was dropped. Night frames cost about +0.7 ms vs V2.37 in the test scene; day frames are unchanged.
- New setting: Event log → **Night lights ON/OFF (faster)**.

**Mobile UI**
- Removing a wall or road now takes a second tap on the same tile (it turns red first). In both the Demolish tool and the wall/road tools it used to be instant, which made accidental removals easy. Buildings already worked this way.
- Touch targets: the food/water/parts counters got a larger tap area, the panel ✕ and back are 44×44, tabs are at least 42 px and buttons at least 40 px, and alert buttons are larger.
- The short message box now sits below the alert stack, so it can no longer cover an alert's button on small screens.
- Audited at 320×568, 375×667, 390×844 and 430×932; safe areas were already handled.

**Sound**
- New synthesised cues: a rescue reaching care, a town rank-up (replacing the generic reward jingle) and holding a town event. They are throttled like the rest, and all effects are tested as audible without clipping.

**Performance**
- Wreck pieces facing the other way are drawn from a pre-mirrored sheet instead of through a negative transform.

**Tests:** new `polish` group (6 checks: two-tap wall and road removal, caravan locked until rank 3 then 12+10 → 10 parts, research path shown for the Hospital, thumb-sized controls, night lights draw). All 22 groups pass.
**Not tested:** real phones or Safari; the new sounds were not judged by ear.

## V2.37.0 — Phase 4: combat and survival
**Why survivors were dying (measured in auto-player runs)**
- The only cause of death is bleeding out while down. About 28% of collapses were rescuers themselves, mostly while pushing the cart.
- In most runs the town eventually stopped fighting: the fighters were down, everyone else hid for days, and zombies stayed inside town forever. Kills stopped while deaths climbed. Hiding survivors starved, the downed bled out, and newcomers walked into it.

**Fixes**
- Zombies that see no one for about 2 hours in daylight now wander back out of the map.
- Sheltering indoors slowly heals (+1 HP every 1.5 game minutes), so hurt fighters can rejoin.
- **Rally:** when someone is down and nobody is fighting, fighters with at least half their health come out together and clear the zombies around the downed.
- **Militia:** when no able fighter is left and zombies are inside town, healthy civilians band together (3 or more) on the weakest zombie.
- **Rout:** when 3 or more survivors are down (or 2 with a boss), wounded fighters shelter instead of dying one by one.
- **Rescue:** anyone not in an emergency can be called, including survivors who are eating, resting, sleeping or walking, plus a fighter when no zombie is within reach of them. Rescues are re-checked every half second, with the most urgent bleed-out first. Non-fighters don't walk into 2 or more zombies, and fighter rescuers clear the zombie off the body first.
- The cart moves at close to walking pace (0.0158, was 0.0133, barely faster than a walker).
- Fighters fall back when 2 zombies are on them and they are under 45% health.
- Bugs fixed: only the first boss left at dawn, so a second boss stayed all day. Escaping zombies (and bosses) left a corpse behind.

**Combat readability**
- A hit spark appears on whoever takes a real hit.
- Zombies show an HP bar only once hurt or fighting someone (no permanent bars).
- A red ring sits under any survivor being hit.
- Select a fighter to see their weapon range, a line to their target, a ring on the target, and "IN RANGE" or "CLOSING IN".
- Tapping a wall says how many zombies are hitting it, and whether repairs are underway, waiting for zombies to leave, or blocked by no parts.

**Town policies** (Town → Haven tab). A settlement-wide priority that shifts the AI's weights; it never controls individuals.
- *Defend the Town:* fighters engage from 40% farther, guards patrol more, fighters hold 5% longer.
- *Prioritise Production:* second shift to 19:00, more patience before breaks, fighters engage only nearby threats.
- *Recover & Heal:* fighters fall back 15% sooner, the hurt seek care earlier, second shift ends at 16:00.
- *Balanced:* the default. The policy is saved with the town.

**Balance** (auto-player, 4 seeds × 30 days, V2.36.0 → V2.37.0)
- Deaths: 16.2 → 3.5 per run (share of downed who died: 13% → 2%).
- Average level at day 30: 4.1 → 6.5. Rank 4 by day 8–9 (was day 10–17).
- Territory: expanded twice in every run (was 2 of 4).
- Collapses went up (122 → 178 per run): fights are as dangerous, but survivors now recover instead of spiralling.
- 8 seeds × 15 days: deaths 9.0 ± 2.1 → 3.4 ± 1.1.
- An ablation (each rescue/rout/rally rule turned off in turn) showed no single rescue rule mattered much. The big gain came from breaking the stall, through zombies leaving and survivors healing in shelter.

**Still open, for Phase 5:** food and water sit at the storage cap from about day 10, and rank 5 (900 Renown plus a Hospital) is never reached in 30 days.
**Tests:** new `combat` group (9 checks: policies move shifts and retreat, policy saved, contextual HP bars, sleeper woken to rescue, every boss leaves at dawn, no unsafe civilian rescue, rally). All 21 groups pass.
**Not tested:** real phones or Safari.

## V2.36.0 — Phase 3: a living settlement
**Task commitment**
- Measured first: staffed workers were at their post only 2–8% of the day. Each shift lasted about 0.6 game hours, then survivors re-decided and nearly always went to train or run an errand first.
- Workers now keep shifts (7–12 and 13–18). They leave early only for an urgent need (hunger or thirst 75+, fatigue 96+, health below 50%), a threat, a rescue or a fire, and go straight back afterwards.
- Training, fun and errands now fill lunch, evenings, and the time of survivors without a post.
- Measured result: during shift hours, staffed workers are at or heading to work about 60–75% of the time (about 40% before).

**Sleep**
- At night a survivor with a free bed in a House sleeps until 6:00 and wakes fully rested.
- Without a bed they sleep rough wherever they are, which recovers only half their fatigue ("Sleeping rough: no free bed (build a House)"). Houses now matter.

**Survivor panel "Now" card** (updates live while open)
- A priority tag: Emergency, Defending, Shift work, Urgent need, Sleep, Recovering, Free time or Expedition.
- Where they are going (tap to open it) and why.
- Hunger, thirst and fatigue.
- Their workplace (tap to open it) and shift times, or which buildings their profession can staff.
- Weapon and armour.

**Visible work**
- Workers at outdoor posts (garden, field, water, range, track) do a working swing, only while they are actually on shift there.
- Producing buildings show a badge whose ring fills with real stored-up output toward the next unit, bright while the building is worked.
- "+1 FOOD / WATER / PARTS / RESEARCH" pops each time a building really produces a whole unit.
- Facilities show how many people are inside (💤 for sleepers). Dry farms and unpaid buildings get a marker.

**Rescue and treatment**
- The survivor panel shows the bleed-out bar and the rescue status ("X is on the way" or "X is wheeling them to the Medical Tent").
- In care, it shows a treatment progress bar, hours left, and whether a medic is on duty.
- Medical buildings list their patients with progress bars (tap a patient to open them) and show a ✚ count on the map.

**Fixed (existing bug):** saving silently failed whenever a survivor was hiding in or fighting a fire at a staffed building (a circular reference). Autosaves taken during attacks were lost.

**Tests:** new `living` group (8 checks: shift share, autosave over 2 game days, sleep at 23:00, Now card, treatment progress, patient list). All 20 groups pass.
**Balance check** (auto-player, 4 seeds × 30 days, V2.35.1 vs V2.36.0):
- Deaths by day 10: 0–2 per seed, down from 5–11.
- Deaths by day 30: 16.3 on average, down from 19.8.
- Territory: expanded in 2 of 4 seeds, against none before.
- Rank 4 was reached in 4 of 4 seeds, against 3 of 4, and average survivor level is higher.
- Still to do: food and water sit at the storage cap late in the game (Phase 4).
**Not tested:** real phones or Safari.

## V2.35.1 — Faster drawing
- Profiled a 20-survivor town at night (headless Chromium, 3× screen): about 60% of each frame went to drawing map props and wreckage, including pieces off screen, and each wreck piece saved and restored the whole canvas state.
- Now only what is on screen (plus a margin) is drawn and depth-sorted, wreck pieces are mirrored without save/restore, and the night tint is a single full-screen pass instead of two.
- Measured on the same scene: about 10 ms → 6 ms per frame. Day frames are now as fast as V2.33.2, or slightly faster (3.2–3.7 ms vs 3.6–4.2 ms), and night frames are about equal (4.7–5.3 ms vs 5.4–5.8 ms). The simulation itself was not slower (about 0.06 ms per tick).

## V2.35.0 — Phase 2: town management
**Resource panels.** Tap 🍖, 💧 or ⚙ at the top left (tabs switch between them). Each panel shows:
- In stock, storage cap and a fill bar.
- Produced per day, used per day and net per day.
- A forecast: "runs out in about N days", "storage full in N days", or "storage full: production is being wasted".
- Every producer and user, with its worker and the share of the day they are on the job. Tap one to open the building.
- Problems: no worker, unpaid upkeep, fire or burnt down, a farm short of water.
- "Last 24 h (what really happened)": an hourly ledger by source (rations, irrigation, upkeep, wall repairs, zombie drops, missions, wasted overflow…). Anything not traced to a source is listed as "Other".

The daily rates use the simulation's own formulas, with each worker's measured share of the day on the job. Over a tested 24 hours they matched the ledger within 20% (food 9.46 expected vs 9.38 actual). The Town panel and the Upgrade Town supply condition now use the same numbers. They used to assume every staffed building was worked all day.

**Building panels**
- A status line says what the building is doing right now and why: working (+X% from the worker), base output (no worker), worker away, half output (unpaid), no output (fire or burnt), or short of water.
- Expected output and inputs per day (food, water, parts, irrigation, upkeep).
- The worker shows their profession, level and share of the day on the job. Tap them to open their panel.
- Clear staffing wording replaces "No worker needs Farmer". For example: "No Farmer assigned … runs at base output", "No Farmer in town: change a survivor's profession", or "No Farmer free: Ben works at the Garden Plot".
- "Better in this family" names the next building tier and what unlocks it.

**Shortage warnings** (from the forecast)
- Critical alert when food or water will run out in about a day, with *Why?* (opens the resource panel) and *Build* buttons. It stays until supplies recover.
- A banner once a day when under 2 days are left, or when storage is full and production is being wasted.
- A warning at 18:00 when there aren't enough parts for tonight's upkeep.
- The out-of-food, out-of-water and starvation alerts gained *Why?*, *Food* and *Water* buttons.

**Tests:** new `economy` group (12 checks). All 18 groups pass in headless Chromium.
**Balance check** (auto-player, 4 seeds × 30 days, V2.34.1 vs V2.35.0): rank progress was about the same (rank 4 reached in 3 of 4 seeds vs 2 of 4). Deaths were high in both versions (17–37 per seed, with large swings between seeds), and neither version ever expanded its territory. This phase changed no rules; the death rate is recorded for Phase 4.
**Finding for Phase 3:** workers are at their post only about 12–33% of the day, so staffed buildings produce far less than the old Town panel suggested.

## V2.34.1 — Alerts stop flashing
- Fix: the red alert rows rebuilt themselves every half second (for example the bleed-out countdown), replaying their slide-in each time, so they kept flashing. Rows now update their text in place, and only a new alert slides in, once.
- The pulsing ring on the map is slower and softer, and the off-screen arrow no longer blinks.

## V2.34.0 — Phase 1: geometry, notifications, breach alerts, actionable objectives
**Geometry audit (P0)**
- Measured every building sprite against its footprint: all 20 are anchored on the south corner, within 1 art px per side of the footprint width, with 89–100% of the footprint covered by the base. No sprite was resized.
- Fixed (confirmed): a new building could be placed on another building's entrance tile, so people walked through that building. Placement now refuses it ("Blocks the … entrance"), and refuses a spot that walls another entrance in. In older towns, the building panel shows a red "Entrance blocked by …" line.
- Fixed: people leaving a building now step out through its entrance tile instead of cutting across a corner of the footprint.
- Corrected the projection notes: the game uses standard 2:1 projection (atan ½ = 26.565°); the old 3:2 / 33.69° comment was out of date.

**Notifications in three levels**
- Critical: red rows under the HUD. Tap a row to move the camera there; ✕ hides it. Used for a survivor down (with the bleed-out timer and who is rescuing them), a wall or gate breach, fire, a break-in, raiders, a boss attack, running out of food or water, and starvation. There is one row per unresolved issue, it never repeats, and it clears itself when resolved. When the emergency is off screen, an arrow points to it from the screen edge; on screen, the spot pulses on the map and nearby zombies get a red ring.
- Important: one banner at a time, queued with no overlap. Used for mission or goal complete, rank, boss warnings, burned buildings, unpaid upkeep, and a new "night in 1 hour" warning.
- Routine: stat gains, small Renown gains, friendships, gear, staffing and the daily summary go to the event log, plus floating text in the world where it has a place. Small Renown gains no longer pop a banner.
- Event log: entries are coloured by level, with an "alerts + important" filter and a "1× on emergencies" setting. The setting is on by default: the first emergency drops 2× or 3× back to 1×, at most once a minute.
- Pop-ups wait while you are placing a building, and alerts shrink to one row in build mode.

**Breach controls** (these follow the real repair rules)
- *Repair first* moves the breach to the front of the repair queue. Repairs still cost parts and wait until no zombie is within reach.
- *Send defender* sends the best free fighter at the nearest zombie.
- Alerts are re-raised after loading a save.

**Actionable objectives**
- Tap the objective line (top left) to see what to do and why, progress, the reward, and a ✔/✘ list of what is missing (parts, unlocks, staff, free space…).
- Two buttons: **Show on map**, and a shortcut such as *Build Rain Collector* (opens placement with a valid ghost on a suggested spot), *Open the Workshop* or *Place walls*.
- *Close the Gaps* marks every gap in the wall ring where zombies would walk in, and says when a road needs a Gate. Placing walls on exactly those tiles seals the town (tested).
- The objective line flashes green when it is completed.

**Tests:** new `geometry` (12 checks), `alerts` (14) and `objectives` (7), plus 1 new save/load check. All 17 test groups pass in headless Chromium. Visual check done at 320×568, 375×667, 390×844 and 430×932.
**Not tested:** real phones or Safari (headless Chromium only), the new alert sounds by ear, and the multi-seed balance run (this phase changes no balance values).

## V2.33.2 — Brute attack frames
- Brute zombie attack (wind-up, strike, follow-through) and death frames redrawn at one consistent size, no more chunky rescaled frames.

## V2.33.1 — New map props
- 16 new pixel-art map props at the 96x48 tile scale: three pines, two dead trees, bushes, rocks, crate, barrels, tyres, rubble and a wrecked car (scaled up to match the wreckage cars).
- Fix: props were cut from the top of the props strip instead of their own row, so short props could be clipped.

## V2.33.0 — Backlog: movement, combat, zombie AI, Upgrade Town, events, rescue cart
- Smooth movement: people and zombies are drawn between simulation ticks, so walking is smooth at 1x and 2x.
- Attacks match the hits: ready pose, wind-up, then the strike lands on the frame the damage is dealt; idle pose between hits.
- Guns and bows fire from range (pistol 4 tiles … rifle 6) with tracer lines instead of walking up to melee.
- Zombies wander but creep slowly toward the town (about 2 tiles per game hour); they stay off building tiles.
- Walls: zombies walk around walls to an opening. Only when the town is fully sealed do they break a wall, and once any wall breaks, every zombie nearby rushes the breach.
- Rescue: the rescuer pushes a hand cart with the injured person lying in it (24 survivor sheets: 12 jobs, male and female); the bleed-out timer rides above the cart.
- Day and night lighting: warm morning, clear day, orange dusk, blue night.
- Trader menu shows item icons; menus are brighter.
- Demolish has its own button on the left menu; roads can be demolished; buildings ask for a second tap.
- No more message for each normal zombie killed (a small "+★" floats instead); bosses and raiders still announce.
- Parts drop more often (55% for walkers, more for tougher zombies, was 25%).
- Upgrade Town screen like DV2: town ribbon with stars and a Rating Conditions list — Renown, daily supplies (food + water made per day after rations), events held, and a Build X requirement. Tap the Renown wheel or Town → Upgrade.
- Town events: Bonfire Night, Market Day, Sports Day, and a Feast from rank 2. One a day; each costs supplies and gives Renown and mood.
- Balance sim (6 seeds, 14 days): deaths average 7.3 (V2.32: 7.7); the auto-player now builds the required building and holds only the events it needs.
- tools/art: build_carts.py (cart sheets; splits frames whose carts overlap the previous pusher), cart_check.py.

## V2.32.0 — Approved samples: wreckage, medics, menu icons
- Wreckage (overturned car, burnt pickup, collapsed shack, broken fence, fallen power pole, concrete and rebar, burnt mattress, oil drums, road barricade, smouldering rubble) scattered over land that isn't unlocked yet; it clears as the territory grows.
- Both medics redrawn with white lab coats, stethoscopes and the standard eye (all animations).
- Build menu tabs get DV2-style icons (Living, Care, Train, Defend); building pictures in the menu now shrink to fit the cards.
- tools/art: build_props.py (prop and wreckage strips), build_ui_icons.py (menu icons).

## V2.31.0 — New art at the approved scale
- Locked art standard (docs/ART_STANDARD.md): 96 × 48 tiles, people 42 px tall, buildings fill their footprint (1×1 ≈ 94 px, 2×1 ≈ 142, 2×2 ≈ 190). One art pixel is the same everywhere. The camera shows tiles at 80 px (was 56), so a person is about half a house tall.
- All people redrawn in the approved style: 12 jobs, male and female (Civilian, Guard, Police, Medic, Scavenger, Engineer, Cook, Farmer, Mechanic, Paramedic, SWAT, Raider) plus the trader. Each has idle, walk, carry, collapse, punch, blunt swing and shoot, front and back.
- Zombies redrawn: walker, runner, crawler, bloated, spitter, brute (idle, walk, attack, death). New boss "The Colossus" (~75 px): idle, walk, ground-pound slam, roar, death.
- All 20 buildings redrawn with their own bright colours.
- Walls (wood, scrap metal, gate) redrawn and cut into joining pieces; cracked and rubble states.
- Held weapons redrawn larger to match the new characters.
- Pipeline: tools/art (ChatGPT sheet → true pixel grid → cleaned, palette-reduced sheets).
- Still to come: map props (trees, rocks, crates, cars) at the new scale; the old ones are shown for now.

## V2.30.0 — Map art to match
- Walls redrawn as pixel art (tools/chars/mapart.py): sharpened wooden stakes with a rope band, corrugated metal sheets with rivets and rust, a banded wooden gate; each tile is a post with arms toward its joined neighbours; cracked look below 60% HP; rubble when broken; white flash when hit.
- New props: 3 pine sizes, 2 dead trees, bushes (some with berries), mossy rocks, crates, oil barrels, a tyre stack, rubble, burnt-out cars.
- Ground: worn dirt patches with pebbles (more outside the walls), slightly brighter grass in town, flowers in two colours.
- Messages moved above the Renown wheel so they no longer overlap it.

## V2.29.0 — Distinct buildings, harder game
- Buildings: every type has its own colour identity (red house roof, blue water tank, teal well, white tent, yellow canteen awning, purple library, pink lounge, olive barracks…), brighter overall, walls muted to weathered wood so roofs read. tools/buildings/recolor.py (originals kept in assets/buildings/v5_src).
- Difficulty: an adaptive "danger" level tracks the survivors' current strength (levels + weapons) plus a slow daily creep; zombie HP and damage scale with it, so a strong town never gets comfortable and a town that just lost fighters isn't crushed.
- More zombies by day and night, tougher types arrive earlier (runners day 2, bloated/spitters day 5, brutes day 8), raids from day 2 and bigger, a stronger boss with a bigger horde, a smaller mourning break.
- Balance sim (6 seeds, 14 days, auto-player): 2–9 deaths (median ~3.5, was 0), 30–60 knockdowns, towns still reach rank 3–4.

## V2.28.0 — New characters, zombies, boss and items
- All people and monsters redrawn as detailed pixel art (style after the user's references), generated by tools/chars/*.py at the map's pixel size: survivors and walkers ~32 px, Brute ~40 px, boss ~55 px.
- Every job has its own outfit and silhouette (Guard camo + helmet, Police cap + badge, Medic coat, Scavenger hood + scarf, Engineer hard hat + hi-vis, Cook toque + apron, Farmer straw hat + overalls, Mechanic, Paramedic, SWAT); male and female versions; 4 skin tones x 8 hair colours per person.
- Animations: idle, walk, carry, collapse, punch, blunt/blade swing, shoot (guns and bows). The equipped weapon is drawn in the hand in every frame.
- Zombies (walker, runner, crawler, bloated, spitter, brute): idle, walk, attack, death (corpses fade out). Boss: idle, walk, slam, roar, death. Raiders and the trader use the new rig.
- 33 items with DV2-style icons: 10 melee weapons, 8 guns and bows, 8 armors, 7 accessories. New gear in the Armory, recipes, expeditions and the trader.

## V2.27.0 — UI redo (DV2-style, readable on a phone)
- New font: Jersey 15 (bundled, OFL) — clear digits (the old font drew 3 like an S); text roughly 30–40% larger everywhere.
- Build menu: tabs (Living / Care / Train / Defend), a 3-wide grid of big building sprites with the price; tap one for a detail page (big sprite, size, cost, upkeep, what it does, Build).
- Survivor panel: portrait card with name, job, HP bar and activity; tabs Status / Gear / Job / Bonds with far less text (stats as a 2-column grid, gear as icon rows).
- People list, Town (Haven / Defense / People / More with progress bars), building info, Explore, Guide (collapsible sections) all simplified.
- One wood-frame panel style with a title banner, back button and close button.

## V2.26.0 — DV2-style building art (all 20)
- Every building now has hand-generated, true pixel-art sprites in a darker DV2-like style (assets/buildings/v5/): gym, library, lounge, scrapyard, range, track, sparring, barracks and farm field added; house, well and farm anchors re-fitted.
- Sizes follow the small DV2 scale: 1×1, 2×1 and 2×2 footprints with the sprite anchored to the footprint's south corner.

## V2.25.0 — DV2-style layout, 2:1 map, small buildings, darker look
- **Map angle is now the standard 2:1 pixel-art isometric** (was 3:2), the angle ChatGPT/PixelLab
  draw buildings at. One tile = 42 × 21 art px; characters keep their size.
- **Small buildings like DV2:** 1×1 House, Rain Collector, Well, Garden Plot, Medical Tent,
  Storage, Gym, Library, Lounge; 2×1 Workshop, Canteen, Armory, Clinic, Scrapyard, Range, Obstacle
  Course, Sparring Ring; 2×2 Hospital, Farm, Barracks. Old saves keep their positions (buildings
  shrink in place).
- **Darker look:** muted grass, packed-dirt roads, and every building drawn in true pixel art by
  code at the new angle (placeholder until the drawn art arrives) — gable roofs, siding, lit
  windows, emblems; tents, tanks, wells, crop plots, fenced yards. Trees, dead trees, rocks,
  crates and rubble are pixel art in the same pixel size.
- **New HUD, laid out like DV2:** a wooden plaque top-left (food, water, parts, day, goal), a
  column of big buttons on the left (Build, Expedition, Survivors, Town, Guide), a Renown wheel
  bottom-right (rank, threat, progress to the next rank) and a stone bar at the bottom (Save,
  speed, sound, log, recenter). Pixel font (Pixelify Sans).
- **Status tags** above survivors ("Working", "Resting", "Fighting", "Patrol"…) instead of emoji.
- Tests: all 14 pass; 45-day simulations on 4 seeds, no errors.

## Tests (no game change)
- **`python3 tests/run_tests.py`** runs 14 end-to-end tests (70 checks) in headless Chromium at
  iPhone size in about 25 s: boot, save/load round trip, old-save upgrade, guided goals, fire and
  repair, rush, trader, rubble walls and repair, research and crafting, couple → baby → grown-up
  and grief, every story event and choice plus every mission type, every panel tab, every sound
  effect, and a 12-day auto-played town. Add words to run only some: `run_tests.py fire tabs`.
  Checked that it catches breakage (broke wall repair and couples on purpose: both tests failed).

## V2.24.0 — Comeback help
Some towns used to snowball: a boss night killed veterans, newcomers arrived at low levels, and
each following boss (scaled by Haven rank) killed more — up to 37–44 deaths in 45 days.
- **The boss scales with the survivors' average level** (and territory), not the Haven rank:
  HP 220 + 35 × average level + 60 × territory tier; horde 2 + 0.7 × average level + 2 × tier.
  A strong late town meets about the same boss as before; a town that lost its veterans meets a
  weaker one.
- **Mourning:** when 2 survivors die within a day, the horde pulls back for about 1.5 days
  (45% fewer zombies, raids wait, the boss comes a day later).
- **Recruits arrive twice as fast** while the population is below 60% of the cap.
- Simulated 45 days on 8 towns: 0–6 deaths each (was 0–44 with 1 in 4 snowballing). Without
  walls: 0–17. The game is now on the forgiving side; a harder difficulty can be added later.

## V2.23.0 — Missions and story events
- **10 mission types** (was 3), picked from what makes sense for the town and never the same twice
  in a row: Clear the Perimeter, Keep the Town Supplied, Expand the Haven, Push the Science,
  Training Regime, Bandit Hunt, Into the Wasteland, Community Spirit, Full Pantry, Close the Gaps.
  Goals and rewards grow with Haven rank.
- **Story events with choices** (about one a day, replacing the old gift popups):
  - 📻 *Radio Signal* → *The Bunker* → *A Gift from the Bunker* (a 3-part chain: new survivors or
    parts, then gear and Renown — or an ambush).
  - 🏴 *Ironfield Riders*: pay tribute (no raids for 4 days, then a trade gift) or refuse (two raids
    at once, then Renown if you stand your ground).
  - 🤒 A sick survivor, 🧒 a lost child (may join as a child), 📦 a supply drop that draws
    zombies, 🐕 a stray dog, 🩺 a wandering medic, ⛈ a storm (water, maybe lightning), 🎉 a feast
    (happiness and bonds for food and water), plus the old small gifts.
- Tested: every event with each choice, chains continuing on later days, every mission type;
  45-day simulations with random choices on 4 seeds, no errors.

## V2.22.0 — Bonds, couples and children
- **Bonds** between survivors grow with time spent together (nearby, eating/resting/training at
  the same building, fighting the same enemy, being rescued) and fade slowly if not kept up;
  Charisma speeds them up. Levels: Acquaintance (20), Friend (50), Close friend (80).
- **Friends fight 10% harder** side by side (close friends 15%); each friendship adds a little ♥
  every day. When someone dies, friends and especially a partner grieve (♥ drops).
- **Couples:** two residents who are close friends may become a couple (no genders in the game,
  so any two residents can).
- **Children:** a happy couple may have a baby when there's room. Children live in the Houses,
  eat half a ration, and grow up in 5 days into a resident Civilian with the parents' stats.
- **Population cap grows with Houses:** 8 with one House, up to 16 (6 + 2 per House). Newcomers
  leave room for couples who are waiting to start a family.
- UI: survivor panel **Bonds** tab (partner, children, bond meters with labels), 💑 in the
  survivor list, Town panel shows population/cap, children and couples.
- Tested: couple → baby → grown-up resident, grief on death, every tab; 45-day simulations on
  4 seeds: first couple day 16–23, first baby day 20–34, 2–4 births per 45 days, no errors.

## V2.21.0 — Sound effects and music
- **All sound is synthesised in the browser** (Web Audio API, `js/sound.js`): no audio files, all
  original. 17 effects: hits, getting hurt, kills, zombie groans when a zombie spots someone, a
  survivor collapsing, building, button clicks, research chime, rewards, coins (crafting, trader,
  rush), a dog's bark, wall breach, alarm (raids, fires, break-ins), the boss's roar, fire
  crackle, nightfall and dawn stingers.
- **Ambient music:** a slow minor-pentatonic pluck over a soft pad (66 bpm) that turns lower and
  darker at night.
- **🔊 button** (right column): effects + music → effects only → off; remembered per device.
- iPhone starts audio on the first tap (iOS requires one); audio pauses when the app is hidden.
- Effects are rate-limited so 3× speed battles don't turn into noise.
- Tested headless: every effect and both music moods rendered offline (no silence, no clipping,
  peaks 0.1–0.7), effects fire during a raid and a boss night, the toggle cycles and is saved.
  Not yet heard on an iPhone speaker.

## V2.20.0 — Tabbed panels
- **Building panel:** Overview (output, staff, neighbour bonuses, fire/burnt status, Rush, Move,
  Demolish) and Details (upkeep, capacity and who is using it, quality, footprint, bonuses). The
  Workshop adds Research and Craft tabs. Production text now also covers the Workshop (RP/day) and
  includes Salvage Methods on Scrapyards.
- **Survivor panel:** the short header (job, HP, what they're doing, needs, bandage) stays on top,
  with Stats, Gear & Pet, and Job & Skills tabs (profession change lives on Job & Skills).
- The last tab is remembered: researching keeps you on Research, equipping keeps you on Gear.
- Tabs stick to the top of the panel when scrolling; buttons are 36 pt tall for thumbs.
- Tested at iPhone size by tapping: every tab, researching, crafting, equipping armor, adopting a
  pet and changing profession, no errors.

## V2.19.0 — Guided goals and event log
- **Guided goals:** after "Build a Rain Collector" and "Defeat 3 Walkers", 10 goals introduce one
  system at a time — Grow Food, A Place to Rest, Make It Home (residents), Scrap Economy (upkeep),
  Gear Up, Train Up, Research, Hold the Line (walls and rubble repair), Go Out There (expeditions),
  More Land (territory). Each opens a short explainer and pays a small reward (+3–6 parts, +4–8
  Renown); then random missions take over as before. Old saves skip goals they've already met.
- **Tap the goal box** (top left) for the full goal list with the current hint.
- **Event log (📜):** the last 60 messages with day and hour, so nothing is missed when a message
  fades (Renown pop-ups are left out).
- The Guide screen no longer talks about upgrading buildings (removed in V2.15); it explains
  building more instead, neighbour bonuses and upkeep.
- Tested at iPhone size: every goal fires in order with its popup and reward, the goals panel and
  log render, an old stage-2 save resumes at the right goal; 30-day simulations show no errors
  and the same death spread as before the change.

## V2.18.1 — Performance (late-game town: 25–30 buildings, 50–100 walls, boss horde)
Profiled at iPhone size (390×844, 3× pixels) in headless Chrome, which draws on the CPU, so the
numbers there are only a guide to the hot spots, not to how an iPhone with a GPU runs:
- The build-zone outline was stroked every frame (about half of all drawing time in the profile):
  it's now baked into the cached ground image.
- Walls: each segment shape is drawn once into a small cached image (per type, joins, damage,
  ~2% zoom step) and stamped, instead of ~5 path strokes per segment per frame.
- Text and emoji (floating numbers, icons) are rasterised once and stamped; floating numbers are
  capped at 80 at a time.
- Trees, crates, debris and old-style buildings were scaled to CSS pixels and then stretched 3×
  on iPhone screens (slow and slightly blurry): they're now cached at exact device pixels.
- The sprite enlargement cache dropped everything once it held 24 sheets; a late-game town needs
  more (all zombie types, raiders, boss, trader, pets), so it could rebuild sheets every frame.
  It now drops only the oldest. The ground image is enlarged at most 3× (the 4× copy was ~63 MB,
  close to iPhone Safari's canvas limit).
- Measured: game logic 0.1–0.2 ms per tick (fine at 3× speed); saving 0.3 ms; the live loop ran
  ~57 fps in the headless browser both before and after (it's capped there), worst frame
  700 → 433 ms (that's a one-off when the zoom crosses a step and the ground image is rebuilt).
  Not yet measured on an actual iPhone.

## V2.18.0 — Balance pass (45-day auto-played games)
Tested with a new simulator (`tools/balance`) that plays the real game for 45 game days the way a
sensible player would. Before the changes, towns stalled at ~14 buildings, Haven rank either never
rose or shot to 5 by day 23, zombies piled up to 40–80, and towns lost 25–85 survivors.
- **Haven rank follows real growth:** rank 2 needs 6 buildings + 2 residents, rank 3 10 + 3,
  rank 4 15 + 5, rank 5 20 + 7 (with Renown 60/200/450/900 and supplies produced 40/160/400/800).
- **Newcomers** arrive at a level that suits the town's rank (Lv.1 at rank 1, up to Lv.5).
- **Zombies thin out by day:** surplus zombies (night spawns, boss hordes) that aren't chasing
  anyone drift away instead of staying forever.
- **Broken walls become rubble** that anyone can cross; the repair crew rebuilds it automatically.
  Repairs now cost 60% of a new segment (a full wood repair cost 5 parts, more than a new one).
  The repair crew no longer stops when a zombie stands in one gap; it works on another segment.
- **Hiding survivors** eat, drink and rest a little from the town stores and call the guards
  (non-fighters used to hide for days and collapse from thirst).
- **Fighters** react when attacked while catching their breath after a fight (they used to stand
  still), and go for treatment first if below 50% HP.
- **Fires:** accidents about every 3 days (was 2), slower growth, a fire spreads to at most one
  neighbour, a repaired building can't catch fire for a day, repair costs 25% of the build cost.
- **Research:** Workshop 12 RP/day staffed (was 10), 4 unstaffed (was 2); each Library study
  session adds 1 RP.
- Results on 8 fresh 45-day games: 3–15 deaths (median 8.5), rank 4 by day 13–21, rank 5 on day
  26–40 in 6 of 8, territory tier 1 by day 6–9, food and water healthy, no burnt buildings left,
  7–11 of 13 research projects, weekly grades mostly A/B. Without walls: 5–22 deaths.

## V2.17.0 — Phase D: incidents, rush production, pets, wandering trader
- **Incidents** (from day 2, about one every 2 days): a **fire** in a building or a **zombie
  break-in**. Fire stops the building and spreads if it reaches 100%; up to 3 nearby survivors run
  over and put it out (uses a little water, faster with high Endurance; +2 Renown). A building that
  burns down goes dark, may set touching buildings alight, and must be repaired from its panel
  (40% of its build cost). A break-in throws everyone out of the building and sounds the alarm.
- **Rush:** water, farm, scrapyard and workshop panels have a Rush button: 4 hours of output now,
  with a 30% fire risk (lower with a skilled worker on shift, +10% for each recent rush, 6 h cooldown).
- **Pets:** dogs (+2 PER, +1 END, bark when raiders sneak close, sometimes dig up parts or food)
  and cats (+2 CHA, +1 INT, +♥ daily, sometimes catch food). True pixel-art sprites that follow
  their owner. Give or take back a pet from the survivor panel; a fallen survivor's pet stays in town.
- **Wandering trader** every 3–4 days (09:00–19:00): sells 3 pieces of gear, a pet and research
  notes, and exchanges food/water/parts. Your best Charisma gives up to 30% off. Tap the trader or
  Town → Trade. (Placeholder art: the survivor body in a teal coat.)
- Toasts that pop at the same time now stack instead of overlapping; map icons draw fully opaque.
- Tested headless at iPhone size: rush success and failure, firefighting (3 survivors, out in about
  half a game hour, 2.5 water), burn-down + spread + repair, break-in, trader walk-in/buy/exchange/
  leave, pet stat bonus, save/load of the new fields and of a V2.16 save. 15-day simulations on 2
  seeds: 5–11 incidents, nothing burned down, no deaths, 4 trader visits, reviews B 60–79.

## V2.16.0 — Phase C: research, crafting, job Lv.10, weekly Haven Review
- **Workshop research:** a staffed Workshop makes 10 research points (RP) a day (2 unstaffed;
  Engineer, Mechanic or Medic). 13 projects cost RP + parts: Deep Wells, Irrigation, Field Surgery →
  Trauma Care unlock the Well, Farm, Clinic and Hospital; Fitness Program unlocks the Range, Obstacle
  Course and Sparring Ring; plus Salvage Methods, Reinforced Walls, Bigger Stockpiles, Field Medicine,
  and 4 gear recipe projects. Locked buildings are hidden from the build menu until researched.
- **Crafting** at the Workshop: researched recipes turn parts into gear (about 1.3× shop price);
  crafted items go to the stash. Tap a Workshop to research and craft.
- **Job levels to 10:** XP needed rises steeply after Lv.5; every profession gets a Lv.10 mastery
  skill (e.g. Marksman, Miracle Worker, Master Builder, Head Chef). Skills stay when changing job.
- **Weekly Haven Review** every 7 days: Population, Defense, Supplies, Buildings, Happiness and
  Research (20 pts each) → grade S/A/B/C/D with Renown, parts, an item on S/A, and a town title.
  The Town panel shows research and the last review.
- Tested headless at iPhone size: Workshop panel research (RP and parts deducted, recipe unlocked)
  and crafting (parts deducted, item in stash, HUD updates); 15-day simulations on 2 seeds:
  4 research projects done, reviews B 61 → B 74 and B 61 → B 68, no errors.

## V2.15.0 — Phase B: duplicate buildings, upkeep, Scrapyard, neighbour bonuses
- **No more in-place upgrades:** Well, Farm, Clinic and Hospital are separate buildings with their
  own footprint; build as many of anything as your land allows (existing ones stay as they are).
- **Upkeep:** every building costs 0.2–1.1 parts a day, paid at midnight (water, food and medical
  first). A building that can't be paid runs at half output (and half service) the next day.
- **Scrapyard** (new, staffed by a Scavenger or Engineer, Strength-based): about 3 parts a day.
- **Neighbour bonuses** (buildings touching or 1 tile apart): District (same production type,
  +10%/+20% output), Farm to table (Canteen + food: +20% meals, +5% food), Recovery ward (medical +
  House: patients heal 15% faster), Fitness block (two different training buildings: +15% training),
  Neighbourhood (Lounge/Canteen + House: +1 ♥), Salvage line (Scrapyard + Workshop: +15% parts),
  Arsenal (Armory + Barracks/Range: gear 1 part cheaper). The placement bar shows bonuses a spot would form.
- Balance: the Armory keeps a reserve (10 parts + 2 days of upkeep) when survivors buy gear; Rain
  Collector 4→5 water/day, Well 8→9 (water ran dry in every 8-survivor simulation).
- Simulated 7 days: upkeep always paid (2.0–2.8/day), parts hold at ~13–16, one Rain Collector
  slowly loses water, two build a surplus.

## V2.14.0 — Phase A: survivor stats, equipment, training buildings (see docs/DESIGN_V3.md)
- **6 stats** per survivor (Strength, Endurance, Agility, Perception, Intelligence, Charisma; 1–20):
  damage, HP and damage reduction, speed and attack speed, ranged damage and spotting raiders,
  XP/medical/research, satisfaction and meals. Each profession has 2 main stats that grow +1 on
  every level-up. Production uses the staff member's stat (farm STR, water PER, medical INT, canteen CHA).
- **Equipment slots (DV2-style):** Weapon, Armor, Accessory, from a town stash. 18 items: melee and
  ranged weapons (ranged attack from ~2.4 tiles), armor (damage reduction, some cost Agility),
  stat accessories. The Armory sells basic weapons/armor for parts; expeditions find better gear.
  Tap a survivor → Equipment → Change.
- **Training buildings:** Gym (STR), Library (INT), Lounge (CHA) from rank 1; Shooting Range (PER),
  Obstacle Course (AGI), Sparring Ring (END) from rank 2. Survivors train in their free time,
  favouring their job's stats; 100% training = +1 permanent point. Placeholder art (old-style copies).
- Survivor panel: stats with training bars, hit damage, damage reduction and speed; gear slots.
- Old saves: weapons move into the new slots, spare weapons into the stash, stats are rolled from
  profession and level. Max HP now includes Endurance, so it may shift by a few points.

## V2.13.0
- **Territory expansion:** the map grew from 16×20 to 28×30 tiles (east and south, so saves keep
  their layout). Town → Expand territory unlocks 3 more tiers (Renown 60/160/320 + 15/30/50 parts).
  Each tier: more land to build and wall in, +2 zombies by day and +3 at night, more siege zombies,
  and zombies start arriving from the east and south too.
- **Raiders:** from day 3, every ~2–3.5 days a group of 2–5 humans sneaks in. They steer around
  zombies and fighters, slip through the gate, steal up to 4 supplies each from a building, fight
  anyone who catches them, and run when hurt. Killing a raider recovers what they carried. Guards
  only spot a sneaking raider within 2.5 tiles. Walls with no gate keep them out.
- **Boss:** every 3rd day a Mutant Boss attacks at 21:00 with a mob (warning at 18:00). It scales
  with rank and territory, breaks walls fast, and retreats at dawn if not killed (+25 Renown,
  +15 parts when killed). Placeholder art: recoloured Brute; raiders use the survivor body in red.
- Simulated 9 days: start territory 0 deaths, 5–10 collapses, 3/3 bosses killed, 1–2 raiders
  escaped with 1–2 items; fully expanded (tier 3) 0 deaths, 29 collapses, peak 29 zombies.

## V2.12.0
- **Per-profession levels (DV2-style):** every survivor keeps a separate level in each profession.
  Lv.3 and Lv.5 in a profession teach a skill that stays for good, whatever job they do later
  (16 skills, see docs/PROFESSIONS.md). Old saves: each survivor's current level counts for their
  current job and any skills already earned are granted.
- **Change profession:** tap a survivor → Change profession. The panel also shows skills and levels.
- **XP for non-fighters:** staffed workers earn XP every hour on shift and for every survivor they
  serve; medics for every patient; everyone for rescues and expeditions.
- **New profession: Cook** — staffs the Canteen; a Cook on shift makes meals 50% more filling.
- **Survivor AI:** non-fighters hide inside the nearest building when zombies come close (hidden
  survivors are safe); fighters defend others first and focus the same zombie; hurt fighters stop
  starting fights and fall back to medical care when outnumbered; badly hurt survivors go to medical care.
- **Zombie AI:** nights (20:00–06:00) bring ~35% more zombies (max 12) that march on the town;
  days are quieter. Zombies near one that spots a survivor join the chase. Zombies give up on
  survivors who get inside.
- Simulated 5 days × 3 seeds against V2.11.1: non-fighters hurt 1.6% of the time (was 3.4%) with no
  collapses (was 4); overall injuries about the same (21.6% vs 20.8% of the time) and slightly fewer
  collapses (15 vs 16 per run) despite 7 zombies at night vs 5; fighters carry more of the fighting
  (hurt 50% vs 44%).

## V2.11.1
- Fix: nobody could be sent on an expedition. Hunger and thirst rose ~17 and ~20 per game hour,
  so every survivor sat at 75–100 (too hungry/thirsty to go) and then lost HP from starving even
  with food and water in stock. They now rise ~3.3 and ~4 per game hour, and a fully met daily
  ration lowers both by 35 (a shortfall still raises them).
- Expedition squad buttons now say why someone can't go: hurt, fighting, rescuing, hungry,
  thirsty or busy (was always "busy/hurt").
- Tested over 4 simulated days with a rain collector and garden plot: someone was always free
  (2–6 of 8); before the fix, nobody was free in 283 of 300 checks.

## V2.11.0
- Pixel-art versions of the six starting buildings, on the shared 42-px tile grid:
  House (87×82), Rain Collector (72×76), Garden Plot (87×61), Medical Tent (86×66),
  Canteen (83×80), Armory (84×81). Generated in ChatGPT and snapped to a pixel grid.
- Canteen, House and Rain Collector were snapped at ChatGPT's own block size. Garden Plot,
  Medical Tent and Armory were drawn too wide (94–107 px), so they were snapped at a larger block
  size to fit the 84 px footprint (some fine detail merged).
- Measured fit: bases sit within about 6–16 px of the tile diamond (steps, crates, sandbags stick
  out a little); the Armory spills ~6 px past its footprint on the left.
- Not yet redrawn: Workshop, Storage, Barracks, Well, Farm, Clinic, Hospital; trees, crates, debris.

## V2.10.2
- Entrances are now inside each building's own footprint (the front-row tile by the front-left wall)
  instead of on an extra tile in front of it. Survivors walk to the tile in front, then step in.
  Placement still needs that front tile to be free.
- Survivors are hidden while inside an enclosed building (working, using it, or in care) and can't be
  tapped or targeted by zombies there. Open-air structures (rain collector, well, garden plot, farm)
  keep them visible.

## V2.10.1
- Pixel-art House (`assets/buildings/v4/house.png`, 87×82 art px) drawn on the shared 42-px tile
  grid with the same sharp-bilinear path as characters; tap hit-testing uses the new image.
- Measured fit: front corner within 1–2 px of the 2×2 footprint; side base corners 4–6 px low;
  porch step overhangs the front tile by up to ~12 px. Gameplay uses the grid, so this is visual only.
- Other buildings still use the old art.

## V2.10.0
- Map tiles are now true pixel art on a 42 × 28 art-pixel grid: grass (with clumps, tufts and the
  odd flower) and roads (curbs, edge lips, dashed centre lines) are generated pixel by pixel and
  share one pixel size with every sprite. Characters are 30/42 of a tile tall (was 0.70).
- All six zombie types redrawn as pixel art at the same pixel size: walker, crawler, runner, spitter,
  bloated and brute, each with front and back walk cycles plus an attack frame. Bigger zombies use
  more pixels, not bigger ones. Zombies now turn to face where they walk, like survivors.
- Not done yet: buildings, props (trees, crates, debris) and walls are still the old art; the
  unused boss art was not redrawn.
- Added `tools/pixel/` (browser extractor + sheet builder with per-chunk hash checks).

## V2.9.5
- Back view: survivors walking up the screen now show their back (new sheet
  `assets/characters/v4/Base_back.png`: idle + 4 walk frames, facing up-left; mirrored for up-right).
  Working, carrying and down poses still use the front view.
- ChatGPT drew the back view about 35 px tall; 2–4 near-duplicate rows were removed per frame so it
  matches the 32 px front view (no resampling, still true pixel art).

## V2.9.4
- Fix: characters changed size relative to the map when zooming (0.53–0.80 tile, measured), because
  V2.9.2 rounded their scale to whole pixels. They now scale smoothly with the zoom (0.70 tile at
  every zoom, measured from 0.5x to 1.9x), using a whole-number nearest-neighbour enlargement followed
  by a smooth final resize, so pixels stay square and sharp.

## V2.9.3
- Survivors face the way they walk: moving left on screen shows the sprite as drawn, moving right shows
  it mirrored. While chasing or attacking they face their target. Facing isn't saved (it re-derives on load).
- Zombies don't turn yet (their art is still the old style).

## V2.9.2
- Characters redrawn as chunky pixel art: about 30 art px tall instead of about 80, so each pixel is
  visible on a phone. On-screen character size is unchanged (0.70 tile).
- Pixel-art sprites are now drawn at a whole number of device pixels per art pixel and snapped to the
  device-pixel grid, so pixels stay even squares at every zoom.
- New base-body sheet `assets/characters/v4/Base.png` (idle, 4 walk, working, carrying, down).
  For now all professions use this one body; per-profession hair/skin variants come next.
- Added `docs/ART_STANDARD.md`: one art-pixel size for every sprite going forward.

## V2.9.1 and earlier
See the git history.
