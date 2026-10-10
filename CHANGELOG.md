# Changelog

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
