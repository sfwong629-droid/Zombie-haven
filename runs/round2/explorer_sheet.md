SCORE: 6/10 · level reached 12 · people alive 16 · deaths 4

# Evaluation sheet — Explorer · build 3D.169 · seed 21 · days 1–20

Every claim cites a day and a number from my notes (explorer_notes.md) or the run log (explorer.jsonl, 679 commands). Session habit: 72 game h on, 20 h away. I overran the first session (stopped at D5 20 instead of D4 08); after that I kept to it (away at D5 20, D8 20, D11 20, D14 20, D17 20).

## Fun score: 6 / 10
For someone who wants every destination and every lead, the trips and the two stronghold fights were the best part of the game. The cards had real choices and the big places paid out well. What pulled the score down: expedition deaths gave no warning and the cards never said who had fallen, the same few event cards kept coming back, and after D12 there was nowhere new I could reach.

## Three moments that raised it
1. D18 07 – Blackgate Prison stronghold at power 250 against a recommended 350. It lasted 83 s over 9 slices. I used `sh med` 4 times (1 med each, one fighter back to full) and `sh focus` when the boss woke at 59 s. The boss went from 100% to 9% to dead, with 22 kills. My calls clearly decided the fight. (The reward was thin, only +26 renown and +9 scrap. See the lows.)
2. D12 11 – the first Military Checkpoint trip (power 214) brought back +63 scrap, +39 meds, +126 ammo, +25 fuel, +32 cloth, three items and a grenade. On D13 00 Marcus threw that grenade during the Gatling Boss night ("6 hit"). The Shopping Mall did the same on D9 14: +24 food, +36 scrap, +48 cloth, and it ended a food crisis (food 2.8 at D9 07). New places felt worth opening.
3. D9 08 – on a low-risk Houses trip, the treehouse card (AGI 41%) found a new lead, and the squad towed home a Pickup Truck. D10 10: the Overrun Clinic stronghold (power 268 vs 175) killed "the Butcher of Ward 3" and rescued Nurse Pat. D13 08 → D15 08: I sent Greenwater 2 meds, and two days later they sent back +12 food and +2 cloth. Leads, rescues and payoffs like these suit an explorer well.

## Three moments that lowered it
1. D19 11 – Gas Station HIGH, Marcus+Theo+June+Maya, power 324. Maya died in stage 1 (she left at 85%) and Theo died in stage 2. The next two cards just dropped them from the squad line ("Squad: Marcus 191/191 · June 19/102"). Neither card offered "turn back", so I learned about the deaths from the 18:00 report. Same pattern D11 08: Rosa died in stage 1 of Lumber Yard medium (power 116), and the 09:00 card silently listed only June/Pat/Ben. Same again D18 08: Sana was 72/72 on the 10:00 card and "did not make it" in stage 3 with no card in between. That is 4 deaths, all on trips, none of them signposted. Expeditions show no recommended power, only strongholds do.
2. D16 05 – after the Mutant boss night, 7 people were down with "14 zombies next to them". I pressed radiohelp, and the rescue team carried 6 into care. At D16 08, three hours later, "The Toll Collector attacks!" with 10 raiders, and 8 more went down by D16 13. From D14 on, every night downed 5–8 people (D18 06: 503 building damage; D20 01: 6 down). My best fighters were never above ~60–80%, so my best 4-person power sat at 269–272 on D17 (Prison needs 350).
3. Event repetition and dead ends. "A HORDE ON THE ROAD" came up on D2, D3, D4, D6, D8, D11 (about half of all trips). The Lumber Yard has the same three cards ("Stacked logs" ×4, "Sawmill" ×4, "Woodpile nest" ×4). The Lost Child event (D11 08) said "about 5 hours", took 10, and ended "found nothing" with no choice inside it. The Toll Kings' fort, the one raid I was building toward, became LOCKED on D16 20 after their leader died at my gate.

## Waiting with nothing to do
- D3 08 → D5 20: level 4 (48 h timer). The Lodge, which gates the Gas Station and the Quarry, said only "not unlocked yet" (D2 19). There was nothing new to explore for 2.5 days.
- D15 11 → D17 10: the Fort upgrade spent ~2 days "bringing materials" because wood kept dropping to 0–4 (D14 16 wood 10, D17 16 wood 0) even with a Lumber Camp.
- Level timers mostly finished while I was away. The away screen credits only 8 game hours of production every time, yet levels 6 (D8 20), 9 (D11 20) and 11 (13 h left, D14 20) completed or nearly completed during the away. Renown rushes did the rest (75, 175, 125, 150, 50, 284). I never waited on a level in play, but I also never felt I earned one.

## Over too quickly or too easy
- The first 7 destinations were all open by D12 (Houses, Lumber, Pharmacy D1–2; Quarry, Gas D6–8; Mall D9; Military, Warehouse D12–14). After that the only new targets were the Prison stronghold (D18) and the Greenwater raid (my ally, skipped). For an explorer, D12–D20 was repeat runs.
- Rewards after D12: renown 462 by D17 07 and scrap 191 at D15 07 were more than I could spend. The Armory auto-buy then spent my scrap without asking (see bugs).

## Stuck
- D2 19: `upgrade hq2` → "not unlocked yet", no hint. It unlocked silently at level 4 (D5 20).
- D8 08: `upgrade workshop` → "Workshop is 2×1: place it (turn it with ↻)". I could not place it through the tool and never got a Workshop. (Crafting still worked from the Workbench.)
- D13 12: two towed vehicles (Pickup Truck D9, Armored Van D13). `cart` and `tool axe` both returned ok:false with no reason. I never found out what the vehicles do.
- Water ran short four times (D3 00, D4 00, D10 00, D11 00 under 1 day) even with 4–6 barrels. Barrels need a Farmer, which only the radio said (D2 08). "Open staff slot: Rain Barrel" showed every day while Farmers stood "free" (D8 08 Ben, Sana, Gus free). There is no staffing command. I got out with an Electric Pump plus Water Tower at D17, and with Houses trips.

## Did the game serve your goal or get in its way?
It mostly served it. 25 expeditions over 9 places plus 2 strongholds cleared is a good amount of exploring, and the big places (Mall, Military, Warehouse +67 scrap D14) paid properly. It got in the way in four ways. First, expedition risk is hidden: there is no power guide, and deaths happen between cards with no chance to recall. Second, nightly downs keep the squad hurt. Third, the town keeps calling the squad home: 3 of my trips coincided with raids that downed 4–8 civilians (D7 05, D14 10, D16 10). Fourth, the factions I wanted to raid either vanished (Toll D16) or were friends (Greenwater).

## Bugs and confusing text
- Mid-trip cards drop dead or collapsed squad members without a word (D4 09 June, D6 10 Rosa, D11 09 Rosa dead, D13 09 Lena, D13 16 Iris, D18 10 Gus, D19 12 Maya dead, D19 14 Theo dead). During the trip, `state` listed no Lena at all (D13 09), so I believed she had died.
- D4 01: `expedition clinic high` started a stronghold fight straight away (power ~45 vs 175). Marcus was "0% DOWN" in 10 s. There was no confirm and no power warning.
- D10 10: `stronghold clinic` with 5 names silently dropped the 5th (Noah). `expedition` with 5 says "A squad is at most 4" (D12 08).
- `upgrade field` (D8 20), `upgrade water`, `upgrade cabin` (D10 14), `levelup` (D5 20, D11 20, D14 20, D18 08), `cart`, `tool axe` (D13 12): ok:false with an empty reason.
- Armory auto-buy: residents spend my scrap (72 → 48 between D10 11 and D11 08). They also swapped Maya's Sledgehammer (atk 36) for a Crowbar (D14 09) and then a Nail Bat (D15 17).
- Mall loot "+🧵 53" on D13 12 left cloth at 30. A storage cap threw it away with no message.
- Wrong warnings: "⚠ WATER: under 1 day left" at D13 00 with water 21.8 and +5.8/day; "FOOD under 1 day" at D19 00 with food 18.7 and 12.3 days left.
- Food fell from 22.3 (D12 08) to 3.8 (D13 00), while the day line said "Food +11.3 −14.0". About 16 food is unexplained.
- "✊ MILITIA: SURVIVORS BAND TOGETHER" spammed hourly (D2 08 onward) with no explanation. I only learned what it means from the `militia` reply on D14 11.
- "Ben can't reach a storage door with their load…" (D1 12, D2 12, D10 16). I had no way to act on it.
- Every early recruit said "Cannot cook, will not stop trying" (Rosa D1, Noah D2, Maya D2).
- Couples and babies arrive in the same hour: Maya+Lena couple and baby Ivy (D10 00), Rook+Gus couple and baby Finn (D13 00).
- D6 08: "Give the dog to a survivor from their Gear tab" → `equip Marcus dog` → "not in the stash".

## Problems with the test tool (separate from the game)
- A blocking move-in or favour card makes repeated `play 10` report "played 1 h" while the clock does not move (D12 22, D18 00).
- The level-up card stayed attached to the output of every following command until I played on (D7 07).
- No way to place 2×1 buildings (Workshop, Clinic placed itself on D13 18, Workshop never did), so part of the game was unreachable for me.
- Silent ok:false replies (listed above) may be tool-side or game-side. I can't tell which.

## The one change you would make
Make expedition risk visible and recoverable. Show a recommended power for each destination and risk, as strongholds already do. When someone collapses or dies mid-trip, put it on the next card ("Rosa did not make it") and always offer "Turn back" on that card. All 4 of my deaths came from trips where I would have recalled the squad if I had known.
