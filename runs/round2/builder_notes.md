# Builder notes (round2, port 8902, seed 21, build 3D.169)
Session plan: play 140 game h, then away 22 h.

## Session 1 (starts D1 08:00)
- D1 08: start. food 14 water 14 (-4/day each, 3.5 days), wood 12 scrap 16, 4 people (Marcus guard, Amy medic, Lena scav, Ben farmer). Beds 4/8. Level 1 needs 6 people + 6 buildings.
- D1 08: ordered farm + barrel. Tent/bonfire refused: "two builds already running (the limit)". 2-build limit annoying for a builder from minute 1.
- D1 13: Lena houses low: +7 food +8 water +5 cloth, Lena hurt (39%).
- D1 14: `tool axe` -> {"ok":false} with no reason (tool problem/unclear).
- D2 08: level 1->2 started (6h). Feast (6f 6w) +15 heart all. 
- D2 13: trader offer list is raw JSON ({"k":"item","id":"footpads"...}) - tool text.
- D2 14: Level 2. Immediately ready for L3 (12h). Radio says "upgrade the Camp to a Lodge" but canUpgrade=[] and `upgrade hq2` -> "not unlocked yet". Confusing.
- D2 17-21: lumberyard low Ben+Marcus: +12 wood, but Marcus COLLAPSED stage 1 and carried home, Ben hurt. On a LOW trip. Card listed squad as "Ben" only.
- D3 05: Level 3. L4 timer 48 game h (vs 6h, 12h before) - big jump. renown 86, finish-now 100.
- D3 07: 8 people, beds 8/8, 9 buildings. food 23 (+4.2/d), water 11 (-2.5/d). Research only 18 after Workbench ~16h (Theo ♥3 unhappy).
- "X can't reach a storage door with their load" news D1 09 (Ben), D2 13 (Amy) - I never built walls; no way to see/fix layout from here.
- D3 10-12: lumberyard low Marcus+Maya: +19 wood + Running Shoes, but Maya hurt twice and COLLAPSED stage 3. 2nd collapse on a LOW trip in 2 trips.
- D3 09: adopted stray dog "Bandit" - card says give via Gear tab, but `stash` empty, dog not listed anywhere.
- D3 12: expand land (20 wood 8 scrap; renown not spent, threshold). land 1. Next land needs HQ tier 2.
- D3 23: beds 9/10. Research 23 (8 pts in 32 h). Theo (engineer at bench) ♥3 "free" all the time. `job Theo Engineer` -> {"ok":false} no reason.
- D4 00: news "Defeat 16 zombies: done! Claim the reward from ... Goals screen" - no claim command in the tool (tool gap).
- D4 07: `research salvage` -> "needs 25 research points (have 25)". Rounding bug in text.
- D4 07-09: lumberyard low Marcus+Rosa, Rosa 36/64 after stage 1; turned back at horde: +12 wood +2 Running Shoes.
- D4 10: research salvage. Rushed L4 (renown ~94->64). L4 unlocks Lodge (hq->hq2: 20 wood 5 scrap). The D2 10 radio "homework: upgrade the Camp to a Lodge" came 2 levels too early.
- D4 10: 10 people, 17 buildings. Wood is THE bottleneck: everything waits on 2-hour lumber trips that hurt people.
- D4 12-22: 4 raiders; "Everyone turns out". Amy collapsed (D4 15), Noah collapsed (D4 18); both rescued. Runner broke into a tent with Maya inside. Water fell to -5.9/d during fight (workers off posts).
- D5 00: "⚠ WATER: under 1 day left" while state said 2.9 days and day net +3.4. Same D6 00 for FOOD and WATER (state: food 18, +1.9/d). Alarm text looks wrong.
- D5 07-13: 2 lumber trips (3 people each): +12 and +17 wood. 3-person trip gave same as Lena alone. Greenwater visitors: 6 food -> 10 water.
- D5 13-16: Lodge (hq2) built. Unlocks Lumber Camp, workshop etc. Lots of new things to build = great builder moment, but wood 17.
- D5 18: Lumber Camp (10w) + barrel. 
- D6 00: couple Marcus+Lena AND baby Ivy in the same hour. Legacy "real town" 12 people +15 renown.
- D6 07: Rushed L5 (renown 150->109, said 50 to finish). L6 needs a BANNER: clear the Clinic stronghold or build Trading Post (14w 5m 2c). Research 11 total by D6 (Theo ♥5 'free' always); 2 engineers now (Cleo).
- D6 07->10: food 18 -> 8.6, water 11.4 -> 6.5 in 3 game hours with no visible cause (the radio-signal trip only cost 3+3). Unexplained drain.
- D6 08: Radio signal card, sent Lena (2 days). She showed up in town D6 23 collapsed; never saw a report of that trip.
- D6 10-12: Zed collapsed with "NO rescuer: 1 zombie next to them: nobody walks in on their own". `rescue` worked. News spammed "✊ MILITIA: SURVIVORS BAND TOGETHER" 6 times in 2 h.
- D6 12: trader: bought 15 research for 8 scrap (that's more than 4 days of my Workbench!) + 2 pipe bombs.
- D6 13: Rosa collapsed in town. 4th collapse.
- D6 19: barrel -> Rain Collector. D6 21 boss Mutant Zombie; Marcus pipe bombs; D7 03 BOSS DEFEATED, Hunting Rifle. No deaths. Felt good.
- D7 00/06: again "⚠ FOOD: under 1 day left / ⚠ WATER: under 1 day left" while food +5.1/d.
- D7 07: L5, renown 160, 14 people, 25 buildings, beds 14/14, wood 3 (Lumber Camp since D6 00 with Zed but wood never accumulates). Research 33.
- SESSION 1 END D7 07 (~143 game h). away 22.

## Session 2 (starts D7 07 after away 22: credited 8 game h: +7f +11w +2scrap +4rp +4wood)
- D7 07-09: lumber low Ben/Faye/Eli: Ben 21/64 + Eli 37/76 hurt after stage 1, turned back: +3 wood only.
- D7 18: Zed collapsed again (he works the Lumber Camp, outside?). Production policy = fighters only nearby.
- D8 00: Week 1 review GRADE A 82/120 (Pop 20, Def 11, Supplies 20, Buildings 19, Happiness 4, Research 9). +20 renown, walkie-talkie.
- D8 06: ammo 32 -> 1 overnight after Hunting Rifle on Marcus; D8 12 "Out of ammo: gunners clubbing". No warning that the rifle would burn all stock in 1 night.
- D8 08: Toll Kings toll 16 scrap, paid (no raids 4 days).
- D8 07-11: lumber low Marcus/Lena/June (all full HP): +23 wood + gloves + charm. Good trip.
- D8 11 -> D8 20: Trading Post: materials took 7 game h to be hauled (wood sat at 24 in stock, Theo/Faye "free"). Built D8 20.
- D8 22: tent->cabin (3 beds) but beds stayed 14/14.
- D9 01: Banner (civic: trading post). Rushed L6 (254->114 renown). L7 timer 84 h. Wood 5.
- D9 10: Pallet Yard (6w4m) + bench->workshop (12w5m). Pallet materials took 8 h to arrive (built D9 20), workshop D9 21. 
- D9 21: boss Stalker + runners. Night: tents/cabin/med tent broken into repeatedly, Medical Tent wrecked twice, Zed, Lena, Theo collapsed; "4 zombies next to them: nobody walks in on their own" until I ordered rescue. Morning D10: 6 buildings damaged, 439 damage, 7 hurt. No deaths.
- D10 06: "The Mutant Boss slunk back into the wasteland" - but tonight's boss was the Stalker (text mismatch).
- D10 07: "Theo reached the Lodge (no medical bed free: slower care)".
- D10 08: research Reinforced Walls. Lumber low Noah/Maya/Eli: Maya 36/72, Eli 17/86, turned back: +11 wood.
- D10 10-12: wood 11 -> 1 and scrap 9 -> 4 in 2 h: auto-repairs of the night damage eat everything (plus med tent 3w). My build stock is spent by repairs I don't control.
- D10 18: "Upkeep at midnight is 9.1 scrap and you have 5: some buildings will run at half output". Trader announced D10 09 never showed by D10 18.
- D11 00: Ivy (baby from D6) grown up -> made her Mechanic. Legacy goals 2 & 3 (+15 renown each).
- D11 morning: day summary D10 Food +13.0 -13.6 (net negative) while state showed foodPerDay +5.1. Food 17 -> 8.7 overnight. State's per-day figure is misleading.
- D11 07: rushed L7 (219->155). L8 timer 96 h. Land tier 3 needs HQ tier 3.
- D11 07-11: houses low Lena/June/Faye: +9f +10w +8 cloth + gloves; rooftop survivor only threw 1f 1w (didn't join). Supply drop (Marcus+Amy) +9 food.
- D11 10: Zed collapsed AGAIN (4th time: D6 09, D7 18, D10 01, D11 10).
- D11 13: trader: bought 15 rp + bow. Research blades. Squad power Marcus/Noah/Ben = 124.
- D11 13-17: lumber MEDIUM Marcus/Noah/Ben: raiders toll card (fought, 57%), +42 wood, BUT NOAH DIED in stage 3 ("Noah did not make it"). He was 104/104 at the 14:00 card. No warning or recall card before stage 3. First death. Amy's partner.
- D11 17: `walls 8` x3: wallTiles 12->36, ~30 wood total, "sealed": false, gaps stay "12,14: the Tent's doorway: a Gate fits there" and "15,15: an open tile". Can't fix those gaps from the tool; tents still broken into every night after.
- D11 17: Rook (Cook) joined; D12 07 canteen (materials sat 5 h before delivery, built D12 13).
- D12 00: Amy (whose partner Noah died 7 h earlier) became a couple with June; she does have "grieving for Noah (-45)".
- D12 07: HQ3 needs 20 wood 30 STONE 12 scrap 2 fuel. Built Quarry (12w) D12 11 -> done D12 21.
- D12 08: 7 raiders (toll ran out). Foundry visitors (show around). D12 11-13 Lena, Maya, Ben, Amy collapsed in town in 3 h. Tent fire D12 14.
- D12 21: boss Butcher +9. Night: Zed down D13 02 and stayed down 12 h: news cycled "Eli is rescuing Zed / Rosa / Cleo / Amy / Marcus / Theo / Lena" ~15 times, nobody reached him. `rescue` and `bandage` didn't get him in; `radiohelp` D13 12 got him to care at D13 14 (team will want "a favour" in 2 days).
- D13 06: again "The Mutant Boss slunk back" after the Butcher night.
- D13 08: supply drop Maya+Cleo: +9 scrap, Maya collapsed.
- SESSION 2 END D13 14 (overran by ~11 h because of Zed). 15 people + Rafe, L7 (L8 in ~44 h), renown ~230, wood 8, stone 6, scrap ~20. 1 death (Noah).

## Session 3 (starts D13 14 after away 22: credited 8 h: +6f +11w +2 scrap +6rp +7 wood +3 stone)
- D13 14: L8 reached while away (timer counted). Started L9 (108 h, 225 renown to finish). Bought 15 rp; research Gadgets. Upgrades farm->field, barrel->water.
- D13 16 - D14 17: CASCADE. Rafe down D13 16 for 8 h (rescuers rotate: news lists ~12 different "X is rescuing Rafe" lines), walkers 16 at D13 20, 18 at D14 04, 13 at D14 07 in DAYLIGHT. Down/hospital in that window: Rafe, Faye, Eli, Zed, Amy, Rosa, Rook, Theo, Marcus (2%). Amy down D14 03 -> picked up D14 16 (13 h). Radio help unavailable ("favour is owed"). Made Theo + Faye Guards D13 20; Faye collapsed 2 h later.
- D14 morning card: Walkers stopped 16, hurt 8 people. "no medical bed free" again (2 med tents for 16 people).
- D14 08: wandering medic "Everyone is treated" - yet 3 stayed down.
- D14 17: built guard post. Wood 5, cloth 1, scrap 9. Nothing to build. The town is treading water: every hour is rescues.
- D15 00: Week 2 review GRADE A 87/120 "Thriving Haven" (Defense 10, Happiness 3) - while the town spends the whole day on rescues. Grade feels unearned.
- D15 00: favour (rescue team) wants 15 food 10 water; food 15 -> refused: radio help locked a week.
- D15 02 - D15 19: Zed down 17 h; `play` never stopped for him again (only stops on NEW downs); I found him at "bleeds out in 4 game h" by reading state. Bandage +4h.
- D15 07: rushed L9 (333 -> 196). L10 timer 120 h.
- D16 00: Marcus, Theo, Ben, Rafe collapsed; 16 walkers at midnight. Baby Nora (Amy+June). Morning card says "Walkers stopped: 2".
- D16 08: houses low: cloth +? and photo album card (+6 ♥). D16 15-19 lumber low +15 wood. HQ3 still short (wood 19/20 after med tent).
- When a decision card is waiting, `play 2` advances 0 h and returns the same card again (fine, but easy to loop).
- D17 00: Finn grown -> Guard; collapsed 1 h later (D17 01). Night D17: Zed, Finn, Lena, Cleo, Faye, Noah, Ivy collapsed (7). Morning D17: 439 building damage. 15 walkers at D17 08 (daylight), 20 at D17 23 - D18 05.
- D17 08: Greenwater asks 2 meds for a sick child (had 0) -> "We can't spare any".
- D17 16 / D17 19: HQ3 (20w 30st 12 scrap 2 fuel): stone 34-38 ok, but wood keeps sliding 17 -> 12 -> 14 -> 13 between trips (auto repairs) and scrap 9-13. Never could start HQ3.
- D18 00: night: Lena, Finn, June, Rosa, Faye, Cleo collapsed. Morning "Walkers stopped 13, 246 damage, 8 hurt".
- D18 08: rushed L10 (291 -> 205). L10->11 needs another BANNER (Clinic stronghold or Radio Tower; Radio Tower not in my build list).
- D18 11: STRONGHOLD Overrun Clinic (rec power 175). `power Marcus,Amy,Rook,Maya,Eli` = 251, but only 4 went in (Eli silently left out). Maya DOWN within 20 s, 31 enemies left, 8 kills, boss 100%. Called `sh back` at 20 s; out at 37 s; Rook 20%, Maya 20%. Nothing gained. "Recommended power 175" felt meaningless.
- D18 17: finally wood 28 / scrap 22 / stone 42 / fuel 6 -> ordered hq2->hq3 (Fort). By D19 11 (18 h later) still "builders are bringing the materials" - stock not even deducted (wood 23).
- D18 21: Gatling Boss + 15. D19 01-05: Theo, Zed, Faye, Lena, June, Finn, Ben down (7 at once); 4 of them "NO rescuer: 6-9 zombies next to them". All reached med care by D19 10 (June to the Lodge, no bed). No deaths.
- D19 07: research Body Armor. Feast D19 08.
- SESSION 3 END D19 11. L10 (needs Banner for L11), 18 people (7 in hospital), 31 buildings, deaths 1 (Noah D11). away 22.

## Session 4 (D19 11 -> day 20)
