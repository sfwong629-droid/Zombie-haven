# Zombie Haven: play-test round 2, all 8 testers (15 Nov 2026)

Seed 21, days 1–20, build 3D.169. Each tester was a Claude agent playing one profile through `tools/playtest`. This time the full run logs are kept (`runs/round2/*.jsonl`), so every claim can be checked.

**Caveat:** Rusher started later and played with the first round-2 fixes included (names, gap text, downed people moved to open ground, tool commands for workplaces, single wall tiles and camp raids). The other seven played plain 3D.169.

## Scores

| Tester | Round 1 | Round 2 | Level | Alive | Deaths | Their one change |
|---|---|---|---|---|---|---|
| New player | 3 | 4 | 11 | 12 | 5 | A downed town always has a way back that needs no scrap or meds; the day report says when the fence is open or the policy cuts production |
| Builder | 4 | 4 | 10 | 17 | 1 | Repairs and upkeep get their own budget instead of eating build stock; show delivery progress on sites |
| Defender | 2 | 3 | 7 | 11 | 1 | Low-risk trips truly safe; the wall actually closes and says where the gap is |
| Raider | 3 | 5 | 9 | 13 | 1 | Reliable strongholds and raids; a turn-back card before a high-risk trip kills a fighter |
| Explorer | 5 | 6 | 12 | 16 | 4 (all on trips) | A recommended power for every trip; turn back when someone falls mid-trip |
| Collector | 5 | 4 | 9 | 0 (lost D17) | 15 | A strong town can always recover after its last fighter goes down |
| Caretaker | 5 | 6 | 9 | 15 | 0 | Zombies leave medical buildings with patients alone; rescues reach a bed in 1–2 h |
| Rusher | 3 | 4 | 9 | 6 | 14 | When half the town is down and unreachable, always one real way out |

Average 4.5 (round 1: 3.75). Two towns were lost or nearly lost in one night (Collector D16–17, Rusher D16–17).

## What got better
- Workplaces, the trip check, the Pallet Yard, destination cards: no tester had trouble with them. The cards are mentioned as varied (Explorer, Raider).
- No test-game crashes in 8 runs (round 1: 2 crashes).
- Strongholds were the high point again: Clinic (New player, Raider), Blackgate Prison (Raider, Explorer).
- Rushing levels with renown felt right (Rusher).
- Bonds, couples and babies (Caretaker).

## What hurt (most testers first)
1. **Nights in week 2–3 overwhelm the town (7 of 8).** Walkers per night climb from about 8 in week 1 to 15–23 by days 12–20. Most people down at once: New player 14/16 (D19), Collector 14/14 (D16, then all died), Rusher 12/15 (D16), Caretaker 8/12, Builder 7/17, Defender 6/8. Walkers stay in town in daylight. Radio help is locked after a favour, militia refuses when everyone is down, bandages need cloth, meds or scrap. **Design call for the owner** (options below).
2. **The wall never sealed (6 of 8).** Every town reported the same gap: tile 15,15, a hole in the starting camp's small fence. The tool could only build along the outer line. Fixed in the tool (`wall X Y`); see the design question below.
3. **Deaths on trips with no warning (5 of 8).** Low risk killed Lena (New player D2), Theo (Defender D3), June (Collector D7). High risk killed Maya and Theo (Explorer D19), Marcus (Raider D19). The trip check now shows these odds before sending, but testers want low risk to be truly safe and a turn-back card after a fall.
4. **"I answered, the report says no orders came" (3).** Fixed: the card was waiting behind another card and was already decided.
5. **Downed people nobody could reach for hours (4).** Lena 70 h (Defender), Zed 12–17 h (Builder). Fixed: they went down on a tile nobody can walk (inside a building that fell, on an open-air workplace) and are now moved to open ground.
6. **Wood (4).** Repairs and upkeep take wood the player was saving; deliveries to sites take 7–22 h; the Lumber Camp's Scavenger wasn't explained (tool gap, fixed: `workplaces`, `assign`, `fill`).
7. **Smaller bugs:**
   - False "FOOD: under 1 day" every midnight (4, fixed).
   - Militia line every hour (4, fixed).
   - The radio sends you to upgrade to the Lodge before level 4 (4, fixed: it says when it opens).
   - Wrong boss name at dawn (3, fixed).
   - Trip cards drop collapsed members (4, fixed).
   - A stronghold silently leaves the fifth person home (3, fixed: it says who).
   - Happiness 3/20 at full mood (2, fixed).
   - Duplicate Theo (1, fixed: the stronghold squad counts).
   - Leaving a camp unseen still ended the Greenwater alliance (1, fixed).
   - Dogs can't be given (tool gap, fixed: `pets`, `pet`).
   - Supplies over the cap thrown away without a word (2, open).
   - The Workshop upgrade has "no room" with no way to clear a tile (2, open).
   - "Houses" mentioned but never buildable (1, open).

## Questions for the owner
1. **Late nights.** Pick any:
   - (a) slow the growth of walkers after day 10;
   - (b) walkers leave at dawn like the boss;
   - (c) the militia also forms when every fighter is down (civilians at 40%+);
   - (d) radio help can't be locked by a refused or paid favour (it gets dearer instead);
   - (e) a warning in the morning card when defence falls behind the level.
2. **Low-risk trips.** No deaths at all on low risk (only collapses)? And a "turn back" card whenever someone collapses or dies mid-trip?
3. **Sealed counts too easily.** Closing the small starting fence round the HQ counts as "sealed" while most buildings are outside it. Count the town as sealed only when the wall encloses most buildings?

Sheets, notes and run logs: `runs/round2/`.
