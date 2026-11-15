SCORE: 4/10 · level reached 6 · people alive 16 · deaths 0 (1 missing: Rosa, never returned from a trip, no message)

# Evaluation sheet — BUILDER · build 3D.163 · seed 21 · days 1–20

Sources: my notes `/root/Zombie-haven/runs/round1c/builder_notes.md` and the run log `/root/Zombie-haven/runs/round1c/builder.jsonl`. Sessions: D1 08→D6 04, away 22; D6 04→D12 00, away 22; D12 00→D17 20, away 22; D17 20→D20 00.

## Fun score: 4 / 10
The first 3 days and the Lodge unlock felt like real building. After that, wood was always short, every level waited on a real-time timer, and most of my game time went to watching rescue news. I was managing a hospital, not growing a town.

## Three moments that raised it
1. D6 12: the Lodge (hq2, 20 wood, 5 scrap, built in about 1 h) took the build list from 12 options to 24 (Lumber Camp, Quarry, Armory, School, Library…) and a 2nd land became possible. This was the best builder moment of the run.
2. D8 10: I found out by trial that a *Scavenger* staffs the Lumber Camp. Wood then went from 13 to 25 in 5 h. Later, at D17 06, wood reached 62 and I could finally queue Quarry plus Fenced Farm together.
3. D12 16: Trading Post done → banner "civic" → L6 levelup ordered at D12 21. Getting a level from a civic building suits this profile well. The Armory (D14 22) also worked: fighters bought crowbars and riot vests themselves (D15 14 onward), which finally gave my idle scrap a use.

## Three moments that lowered it
1. Nights from D9 on: 74 collapses in total. Count of unique "collapsed!" lines per day: D10 9, D15 10, D17 11, D19 7. On D19 02 six people were down at once, including Amy, my only medic. At D18 07 Finn had been down 11 h and was 6 h from bleeding out. News said "Marcus is rescuing Lena" about 18 times in one hour (D15 04) and "Finn is rescuing Eli" about 20 times (D19 22).
2. Walls never sealed. D8 07 `walls 4` → wallTiles 16, sealed false. D11 05 → 26, then 39. D15 13 → 50, then `walls 5` placed 0 (no free tiles left) and it still said **sealed: false**. I spent about 40 wood on walls (about a week of lumber) and zombies still broke into tents, the armory and medical tents every night. Nothing says what is missing.
3. D11 11: Rosa (Guard L2, resident) left on a low-risk Lumber Yard trip with Amy and Theo and never came back. There was no report card and no news line. At D12 00 she is missing from the people list, and `power Rosa` → empty.

## Waiting with nothing to do
- **Level timers run on real time and grow fast.** Timers: L2 9 min (D2 17), L3 18 min (D3 07), L4 105 min (D4 07), L5 150 min (D6 04), L6 180 min (D12 21), L7 210 min (D17 20; 167 min still left at D20 00). In play they drop about 1 min per game hour, so every level from L4 on finished only during an `away 22` (L4 at D6 04, L5 at D12 00, L6 at D17 20). Each time, the next level's people and buildings targets were already met (D6 04 "10/9 ✓, 24/13 ✓"; D17 20 "16/12 ✓, 33/18 ✓"). So I spent 3 of 4 sessions with the next level ready and nothing I could do to speed it up. The radio said "the Haven can reach the next level" every morning while the upgrade was already running (D3 08, D4 08, D6 08 … D19 08).
- **Two builds at a time** ("two builds already running (the limit)", D2 09 and D2 12).
- **Materials delivery:** the Library was ordered D17 20 and finished D18 12 (16 h). The Rain Collector was ordered D9 05 and finished D9 21. The second Lumber Camp was ordered D10 09 and finished D10 17.
- **Wood starvation** (the main block): wood was 0 at D1 19, D4 16 (3), D6 04, D11 05, D13 10 and D15 13. Scrap sat unused at 104 (D13 07) and 122 (D15 13), and I had no way to turn scrap into wood. The trader's `trade` list was always empty.

## Over too quickly or too easy
- L1→L3 in under 3 days (L3 at D4 05). Early beds and food were easy once the farm and barrels were up.
- Research completes the moment you order it (Field Medicine D4 10, Reinforced Walls D10 09). That is fine, but research points come in very slowly (about 24 rp in the first 2 days).

## Stuck
- **Land:** land 1 at D3 07. Land 2 needed HQ2, which was "not unlocked yet" at D3 14 even though the radio told me to "upgrade the Camp to a Lodge" at D3 12. HQ2 became possible only at L4 (D6). Land 2 then needed 35 wood, and I reached that only at D13 10 (about 7 days). Land 3 says "needs the Fort (HQ tier 3); the Fort unlocks at town rank 3 (rank now 2)". Nothing else in the game explains "town rank". I did not get out of this.
- **Beds:** 4th and 5th tents (D4 13, D5 05) gave nothing; beds stayed "10/10" until L4 raised them to 10/14 (D6 04). The cap comes from the level, but `canBuild` still offers tents with no warning. Same again at the end: 16/16 from D16 to D20.
- **Workshop:** `upgrade workshop` → ok:true, but news said "The Workshop is 2×1: place it (turn it with ↻), then Build" (D7 14), and nothing started. `build workshop` also returned ok with no result. Because of this, Blades, Body Armor and Gadgets, plus all crafting ("craftNeeds: a Workshop"), stayed closed all run. (This may be a tool limit; see below.)
- **Walls:** stuck at "sealed: false" from D15 13 with no free tiles left.

## Did the game serve your goal or get in its way?
It got in the way more than it helped. The building ladder itself is appealing: 24 building types at L4, civic banners, land tiers. But:
- Wood is the only real limit, and the only steady sources are Lumber Camps, which need a specific job that is never named, and low-risk Lumber Yard trips that usually put someone down. "Stage 1: June was hurt / Stage 2: Noah collapsed" (D4 21). "Maya collapsed and is being carried" (D6 11). "Rosa was hurt / Theo was hurt" (D7 11).
- Staffing is a black box. Every daily summary listed open slots ("Open staff slot: Rain Barrel, Garden Plot, Medical Tent, Lumber Camp, Quarry", D18 00) while people showed as "free" (Ben the Farmer at D3 07 and D4 07; Maya the Engineer for days). The game never says which job fills which building. The radio finally said "Garden Plot has no Farmer" at D12 08.
- I couldn't tell what to build next once the obvious things were done. No build ever stopped the nightly break-ins, and `canBuild` gave no guidance.
- Repairs ate wood every night (wood 31 at D7 08 → 23 by D7 21, and wood fell while nothing was building, D5 10–13), so a builder can't plan ahead.

## Bugs and confusing text
- Expedition reports stopped appearing in `cardsRead` after D7. The D8 07, D11 11 and D16 06 trips came home with no report, and on D11 11 Rosa vanished without a word.
- Daily summary always reads "Food +0.0 −X · Water +0.0 −X" (D2, D3, D4 … D19), even with 4 farms and 6 barrels.
- "⚠ WATER: under 1 day left" at D9 00 and D10 00, while state showed water 14.5 / 11 and waterPerDay −0.6 / +1.4. "⚠ FOOD: under 1 day left" at D12 00, D15 00 and D18 00, with food 11.7, about 20 and 27.5. waterDaysLeft 668.1 at D17 06.
- `research salvage` → "needs 25 research points (have 25)" (D7 21): a rounding mismatch.
- News timestamp "D13 24:00" (Medical Tent fire).
- People "recovered and returned" and collapsed again 1–2 h later: Eli D10 16 → D10 18, Della D12 08 → D12 09, Maya D16 11 → D16 14, Theo at 8% "free" D16 06 → collapsed D16 11.
- "no medical bed free: slower care" (D11 04, D14 05, D17 07, D18 00) with 3–4 Medical Tents built. They were unstaffed because Amy was the only medic, but the message points at beds, not staff.
- "Haven can reach the next level" radio line repeats while the upgrade is already running (see Waiting).
- Lost child card D7 08 ("Send Lena & Marcus"). Lena collapsed at D7 09 and there was no result card. A child (Ivy) appeared later. Finn (D16 00), Nora (D17 00), Kai (D19 00) and Wren (D20 00) also appeared with no join card.
- People counts don't match: nextLevel "People living here: 14/11" at D12 21 while the people list had 12.
- `levelup` cards for L5, L6 and L7-start never showed after an away. Only L4 showed (D6 04).

## Problems with the test tool (not the game)
- `tool axe` and `cart` returned `{"ok": false}` with no `why` (D1 19). Several `buy` and `job` failures also gave no reason (`buy 5` the second time, D8 13).
- 2×1 buildings and upgrades need placement and rotation, which zh.js can't do: `upgrade workshop` and `build workshop` returned ok:true, but nothing happened (D7 14 and D7 16).
- The stray dog: "Give the dog to a survivor from their Gear tab" (D5 08), but `equip Marcus pepper` → "not in the stash".
- The wall command reports `sealed:false` with no hint about where the gap is. A player might see it on screen; the tool can't.
- "Claim the reward from the alert or the Goals screen" appeared many times (D2 15, D3 03, D4 11, …). There is no goals or claim command, so those rewards were never claimed.

## The one change you would make
Make the Haven level timer count game time, or let a met requirement start the next level right away, **and** show which job staffs each building with a one-tap "fill empty slots" button. Together those turn "wait 3 real hours and guess who goes where" into "plan, build, grow". That loop is what a builder wants, and the game already has the content (24 buildings, land tiers, civic banners) to support it.
